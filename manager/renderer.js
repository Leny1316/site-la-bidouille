(function () {
  "use strict";

  const api = window.bidouilleManager;
  const controls = {
    projectDirectory: document.getElementById("project-directory"),
    sourceFolder: document.getElementById("source-folder"),
    targetFolder: document.getElementById("target-folder"),
    repository: document.getElementById("repository"),
    branch: document.getElementById("branch"),
    commitMessage: document.getElementById("commit-message")
  };
  const message = document.getElementById("message");
  const log = document.getElementById("activity-log");
  const globalState = document.getElementById("global-state");
  const githubAccount = document.getElementById("github-account");
  const accountAvatar = document.getElementById("account-avatar");
  const accountTitle = document.getElementById("account-title");
  const accountDetail = document.getElementById("account-detail");
  const tokenConnect = document.getElementById("token-connect");
  const connectedActions = document.getElementById("connected-actions");
  const repoSummary = document.getElementById("repo-summary");
  const contentSection = document.getElementById("content-section");
  const contentEditor = document.getElementById("content-editor");
  const contentSummary = document.getElementById("content-summary");
  const addContentItem = document.getElementById("add-content-item");
  const saveContentButton = document.getElementById("save-content");
  let connected = false;
  let busy = false;
  let managedContent = null;
  let contentDirty = false;

  const desktopApps = [
    ["poste-de-travail", "Poste de travail"],
    ["tutoriels", "Tutoriels"],
    ["reparations", "Réparations"],
    ["mods", "Mods"],
    ["consoles", "Consoles"],
    ["informatique", "Informatique"],
    ["emulation", "Émulation"],
    ["telechargements", "Téléchargements"],
    ["logiciels", "Logiciels"],
    ["archives", "Archives"],
    ["jeux", "Jeux"],
    ["galerie", "Galerie"],
    ["contact", "Contact"],
    ["a-propos", "À propos"],
    ["corbeille", "Corbeille"]
  ];

  const schemas = {
    tutoriels: {
      label: "vidéo",
      collection: (content) => content.videos.tutoriels,
      fields: [
        ["title", "Titre"], ["description", "Description", "textarea"],
        ["youtubeUrl", "Lien YouTube"], ["image", "Miniature", "asset"],
        ["duration", "Durée (facultatif)"], ["published", "Date de publication (facultatif)"]
      ]
    },
    reparations: {
      label: "vidéo",
      collection: (content) => content.videos.reparations,
      fields: [
        ["title", "Titre"], ["description", "Description", "textarea"],
        ["youtubeUrl", "Lien YouTube"], ["image", "Miniature", "asset"],
        ["duration", "Durée (facultatif)"], ["published", "Date de publication (facultatif)"]
      ]
    },
    mods: {
      label: "vidéo",
      collection: (content) => content.videos.mods,
      fields: [
        ["title", "Titre"], ["description", "Description", "textarea"],
        ["youtubeUrl", "Lien YouTube"], ["image", "Miniature", "asset"],
        ["duration", "Durée (facultatif)"], ["published", "Date de publication (facultatif)"]
      ]
    },
    downloads: {
      label: "téléchargement",
      collection: (content) => content.downloads,
      fields: [
        ["title", "Titre"], ["category", "Catégorie"],
        ["description", "Description", "textarea"], ["fileUrl", "Lien du fichier"],
        ["image", "Illustration", "asset"], ["version", "Version"], ["size", "Taille"]
      ]
    },
    gallery: {
      label: "image",
      collection: (content) => content.gallery,
      fields: [
        ["title", "Titre"], ["caption", "Légende", "textarea"],
        ["album", "Album"], ["image", "Image", "asset"]
      ]
    },
    games: {
      label: "jeu",
      collection: (content) => content.games,
      fields: [
        ["title", "Titre"], ["description", "Description", "textarea"],
        ["url", "Lien ou chemin du jeu"], ["image", "Illustration", "asset"],
        ["mode", "Ouverture", "select", [["embed", "Dans La Bidouille OS"], ["external", "Site externe"]]],
        ["ready", "Visible et prêt", "checkbox"]
      ]
    },
    consoles: {
      label: "console",
      collection: (content) => content.consoles,
      fields: [
        ["name", "Nom"], ["manufacturer", "Fabricant"], ["release", "Sortie"],
        ["region", "Région"], ["generation", "Génération"], ["type", "Type"],
        ["image", "Image", "asset"], ["imageSource", "Source de l’image"],
        ["summary", "Résumé", "textarea"], ["cpu", "Processeur"],
        ["graphics", "Graphismes"], ["memory", "Mémoire"], ["media", "Support"],
        ["display", "Affichage"], ["sound", "Son"], ["contemporaries", "Consoles contemporaines"]
      ]
    }
  };

  function unwrap(result) {
    if (result?.ok) return result.value;
    const error = new Error(result?.error?.message || "Le gestionnaire n'a pas pu terminer l’opération.");
    error.code = result?.error?.code || "UNKNOWN";
    error.details = result?.error?.details || "";
    throw error;
  }

  function readSettings() {
    return Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value.trim()]));
  }

  function writeSettings(settings) {
    Object.entries(controls).forEach(([key, control]) => {
      control.value = settings?.[key] ?? "";
    });
  }

  function addLog(text) {
    const item = document.createElement("li");
    const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
    item.textContent = `[${time}] ${text}`;
    log.append(item);
    log.scrollTop = log.scrollHeight;
  }

  function setMessage(text, kind) {
    message.textContent = text;
    message.dataset.kind = kind || "info";
  }

  function updateContentButtons() {
    saveContentButton.disabled = busy || !managedContent || !contentDirty;
    addContentItem.disabled = busy || !managedContent;
  }

  function setBusy(value, label) {
    busy = value;
    document.querySelectorAll("button").forEach((button) => {
      if (button.matches("#open-token-page")) return;
      if (value) {
        button.dataset.disabledBeforeBusy = String(button.disabled);
        button.disabled = true;
      } else if (button.dataset.disabledBeforeBusy !== undefined) {
        button.disabled = button.dataset.disabledBeforeBusy === "true";
        delete button.dataset.disabledBeforeBusy;
      }
    });
    globalState.dataset.state = value ? "busy" : "idle";
    globalState.lastChild.textContent = value ? ` ${label || "Travail en cours"}` : " Prêt";
    if (!value) updateContentButtons();
  }

  function showError(error, context) {
    const hints = {
      GITHUB_401: "Reconnectez GitHub avec un nouveau jeton.",
      GITHUB_403: "Vérifiez l’accès au dépôt et l’autorisation Contents: Read and write.",
      GITHUB_404: "Vérifiez le nom du dépôt et celui de la branche.",
      INDEX_NOT_FOUND: "Le dossier source doit contenir index.html.",
      TOKEN_DECRYPTION_FAILED: "Déconnectez puis reconnectez GitHub pour renouveler l’accès.",
      CONTENT_FILE_NOT_FOUND: "Vérifiez le dossier du projet et le dossier source du site.",
      ASSET_TOO_LARGE: "Choisissez une image de moins de 15 Mio."
    };
    const hint = hints[error.code] ? ` ${hints[error.code]}` : "";
    const text = `${context ? `${context} : ` : ""}${error.message}${hint}`;
    setMessage(text, "error");
    globalState.dataset.state = "error";
    globalState.lastChild.textContent = " Erreur";
    addLog(text);
  }

  function renderConnection(account) {
    connected = Boolean(account);
    githubAccount.dataset.connected = String(connected);
    tokenConnect.hidden = connected;
    connectedActions.hidden = !connected;
    accountAvatar.replaceChildren();

    if (connected) {
      if (account.avatarUrl) {
        const image = document.createElement("img");
        image.src = account.avatarUrl;
        image.alt = "";
        accountAvatar.append(image);
      } else {
        accountAvatar.textContent = account.login.slice(0, 1).toUpperCase();
      }
      accountTitle.textContent = `Connecté : ${account.name}`;
      accountDetail.textContent = `Compte @${account.login}. Accès prêt pour la publication.`;
    } else {
      accountAvatar.textContent = "?";
      accountTitle.textContent = "Non connecté";
      accountDetail.textContent = "Ajoutez un jeton limité au dépôt pour activer Publier.";
    }
  }

  async function run(label, action) {
    if (busy) return null;
    setBusy(true, label);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function markContentDirty() {
    contentDirty = true;
    updateContentButtons();
    updateContentSummary();
  }

  function countContent() {
    if (!managedContent) return 0;
    return Object.values(managedContent.videos).reduce((total, list) => total + list.length, 0)
      + managedContent.downloads.length + managedContent.gallery.length
      + managedContent.games.length + managedContent.consoles.length;
  }

  function updateContentSummary() {
    if (!managedContent) {
      contentSummary.textContent = "Chargez le fichier contenu.js du projet pour commencer.";
      return;
    }
    const suffix = contentDirty ? " · modifications non enregistrées" : " · tout est enregistré";
    contentSummary.textContent = `${countContent()} élément(s) géré(s) · version ${managedContent.version || "3.1"}${suffix}`;
  }

  function makeField(labelText, initialValue, onChange, type, choices) {
    const group = createElement("div", `field-group${type === "textarea" ? " wide" : ""}`);
    const label = createElement("label", "", labelText);
    group.append(label);

    if (type === "checkbox") {
      const row = createElement("label", "desktop-visible");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(initialValue);
      input.addEventListener("change", () => onChange(input.checked));
      row.append(input, document.createTextNode(labelText));
      label.remove();
      group.append(row);
      return group;
    }

    if (type === "select") {
      const select = document.createElement("select");
      choices.forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        option.selected = value === String(initialValue || "");
        select.append(option);
      });
      select.addEventListener("change", () => onChange(select.value));
      group.append(select);
      return group;
    }

    const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    input.value = initialValue ?? "";
    if (type === "textarea") input.rows = 3;
    input.addEventListener("input", () => onChange(input.value));

    if (type === "asset") {
      const row = createElement("div", "asset-control");
      const button = createElement("button", "retro-button", "Choisir une image…");
      button.type = "button";
      button.addEventListener("click", () => run("Importation de l’image", async () => {
        try {
          const result = unwrap(await api.importAsset(readSettings()));
          if (!result) return;
          input.value = result.path;
          onChange(result.path);
          setMessage(`Image importée : ${result.filename}`, "success");
          addLog(`Image ${result.filename} copiée dans le site.`);
        } catch (error) {
          showError(error, "Importation de l’image");
        }
      }));
      row.append(input, button);
      group.append(row);
      const preview = createElement("div", "asset-preview", initialValue ? `Fichier ou URL : ${initialValue}` : "Aucune image sélectionnée");
      input.addEventListener("input", () => {
        preview.textContent = input.value ? `Fichier ou URL : ${input.value}` : "Aucune image sélectionnée";
      });
      group.append(preview);
    } else {
      group.append(input);
    }
    return group;
  }

  function renderIdentity() {
    const form = createElement("div", "content-form-grid");
    const site = managedContent.site;
    const fields = [
      ["authorName", "Nom affiché"], ["contactEmail", "Adresse de contact"],
      ["logo", "Logo", "asset"], ["profileImage", "Photo / avatar", "asset"],
      ["wallpaper", "Fond du bureau", "asset"],
      ["bio", "Biographie", "textarea"], ["about", "Présentation de La Bidouille", "textarea"]
    ];
    fields.forEach(([key, label, type]) => {
      form.append(makeField(label, site[key], (value) => {
        site[key] = value;
        markContentDirty();
      }, type));
    });
    contentEditor.replaceChildren(form);
  }

  function renderDesktop() {
    const grid = createElement("div", "desktop-icon-grid");
    const overrides = managedContent.site.desktopIcons;
    desktopApps.forEach(([id, defaultTitle]) => {
      const current = overrides[id] && typeof overrides[id] === "object"
        ? overrides[id]
        : { title: defaultTitle, iconUrl: "", visible: true };
      if (current.visible === undefined) current.visible = true;
      const card = createElement("article", "desktop-icon-card");
      card.append(createElement("h3", "", defaultTitle));
      card.append(makeField("Nom sur le bureau", current.title || defaultTitle, (value) => {
        overrides[id] = current;
        current.title = value;
        markContentDirty();
      }));
      card.append(makeField("Icône personnalisée", current.iconUrl || "", (value) => {
        overrides[id] = current;
        current.iconUrl = value;
        markContentDirty();
      }, "asset"));
      card.append(makeField("Visible sur le bureau", current.visible, (value) => {
        overrides[id] = current;
        current.visible = value;
        markContentDirty();
      }, "checkbox"));
      grid.append(card);
    });
    contentEditor.replaceChildren(grid);
  }

  function itemTitle(item, schema, index) {
    return String(item.title || item.name || `${schema.label} ${index + 1}`);
  }

  function renderCollection(section) {
    const schema = schemas[section];
    const collection = schema.collection(managedContent);
    const list = createElement("div", "content-list");
    if (!collection.length) {
      const empty = createElement("div", "content-empty");
      empty.append(createElement("strong", "", `Aucun ${schema.label}`));
      empty.append(createElement("p", "", "Cliquez sur « + Ajouter » pour créer le premier élément."));
      list.append(empty);
    }

    collection.forEach((item, index) => {
      const card = createElement("article", "content-card");
      const header = createElement("div", "content-card-header");
      const title = createElement("strong", "", itemTitle(item, schema, index));
      const up = createElement("button", "mini-button", "↑");
      const down = createElement("button", "mini-button", "↓");
      const remove = createElement("button", "mini-button remove", "×");
      [up, down, remove].forEach((button) => { button.type = "button"; });
      up.title = "Monter";
      down.title = "Descendre";
      remove.title = "Supprimer";
      up.disabled = index === 0;
      down.disabled = index === collection.length - 1;
      up.addEventListener("click", () => {
        [collection[index - 1], collection[index]] = [collection[index], collection[index - 1]];
        markContentDirty();
        renderContentSection();
      });
      down.addEventListener("click", () => {
        [collection[index], collection[index + 1]] = [collection[index + 1], collection[index]];
        markContentDirty();
        renderContentSection();
      });
      remove.addEventListener("click", () => {
        if (!window.confirm(`Supprimer « ${itemTitle(item, schema, index)} » ?`)) return;
        collection.splice(index, 1);
        markContentDirty();
        renderContentSection();
      });
      header.append(title, up, down, remove);

      const body = createElement("div", "content-card-body content-form-grid");
      schema.fields.forEach(([key, label, type, choices]) => {
        body.append(makeField(label, item[key], (value) => {
          item[key] = value;
          title.textContent = itemTitle(item, schema, index);
          markContentDirty();
        }, type, choices));
      });
      card.append(header, body);
      list.append(card);
    });
    contentEditor.replaceChildren(list);
  }

  function renderContentSection() {
    if (!managedContent) return;
    const section = contentSection.value;
    addContentItem.hidden = !schemas[section];
    if (section === "identity") renderIdentity();
    else if (section === "desktop") renderDesktop();
    else renderCollection(section);
    updateContentButtons();
  }

  function newContentItem(section) {
    const defaults = {
      tutoriels: { title: "Nouvelle vidéo", description: "", youtubeUrl: "", image: "", duration: "", published: "" },
      reparations: { title: "Nouvelle vidéo", description: "", youtubeUrl: "", image: "", duration: "", published: "" },
      mods: { title: "Nouvelle vidéo", description: "", youtubeUrl: "", image: "", duration: "", published: "" },
      downloads: { title: "Nouveau fichier", category: "Divers", description: "", fileUrl: "", image: "", version: "", size: "" },
      gallery: { title: "Nouvelle image", caption: "", album: "Divers", image: "" },
      games: { title: "Nouveau jeu", description: "", url: "", image: "", mode: "external", ready: true },
      consoles: { name: "Nouvelle console", manufacturer: "", release: "", region: "", generation: "", type: "Salon", image: "", imageSource: "", summary: "", cpu: "", graphics: "", memory: "", media: "", display: "", sound: "", contemporaries: "" }
    };
    return defaults[section];
  }

  async function loadContent(silent) {
    try {
      const result = unwrap(await api.readContent(readSettings()));
      managedContent = result.content;
      contentDirty = false;
      renderContentSection();
      updateContentSummary();
      if (!silent) {
        setMessage("Contenu du site chargé.", "success");
        addLog("Le contenu du site a été rechargé.");
      }
    } catch (error) {
      managedContent = null;
      contentDirty = false;
      addContentItem.hidden = true;
      contentEditor.replaceChildren(createElement("div", "content-empty", "Impossible de charger le contenu."));
      updateContentSummary();
      showError(error, "Contenu du site");
    }
    updateContentButtons();
  }

  async function refreshGitHub(silent) {
    try {
      const status = unwrap(await api.githubStatus());
      renderConnection(status.connected ? status.account : null);
      if (!silent) {
        setMessage(status.connected ? "Connexion GitHub vérifiée." : "Aucune connexion GitHub enregistrée.", status.connected ? "success" : "info");
        addLog(status.connected ? `Connexion GitHub vérifiée pour @${status.account.login}.` : "Aucune connexion GitHub enregistrée.");
      }
    } catch (error) {
      renderConnection(null);
      showError(error, "Connexion GitHub");
    }
  }

  document.getElementById("choose-project").addEventListener("click", async () => {
    try {
      const selected = unwrap(await api.chooseProject());
      if (selected) {
        controls.projectDirectory.value = selected;
        setMessage("Dossier du projet sélectionné. Enregistrez puis chargez son contenu.", "info");
      }
    } catch (error) {
      showError(error, "Sélection du dossier");
    }
  });

  document.getElementById("open-project").addEventListener("click", async () => {
    try {
      unwrap(await api.openProject(controls.projectDirectory.value));
    } catch (error) {
      showError(error, "Ouverture du dossier");
    }
  });

  document.getElementById("save-settings").addEventListener("click", () => run("Enregistrement", async () => {
    try {
      const saved = unwrap(await api.saveSettings(readSettings()));
      writeSettings(saved);
      setMessage("Configuration enregistrée.", "success");
      addLog("Configuration locale enregistrée.");
    } catch (error) {
      showError(error, "Configuration");
    }
  }));

  document.getElementById("open-preview").addEventListener("click", () => run("Ouverture de l’aperçu", async () => {
    try {
      if (contentDirty) throw new Error("Enregistrez d’abord les modifications du contenu.");
      unwrap(await api.openPreview(readSettings()));
      setMessage("Aperçu ouvert dans une fenêtre séparée.", "success");
      addLog("Aperçu local du site ouvert.");
    } catch (error) {
      showError(error, "Aperçu");
    }
  }));

  contentSection.addEventListener("change", renderContentSection);

  document.getElementById("reload-content").addEventListener("click", () => run("Chargement du contenu", async () => {
    if (contentDirty && !window.confirm("Annuler les modifications non enregistrées et recharger le fichier ?")) return;
    await loadContent(false);
  }));

  addContentItem.addEventListener("click", () => {
    const section = contentSection.value;
    const schema = schemas[section];
    if (!managedContent || !schema) return;
    schema.collection(managedContent).push(newContentItem(section));
    markContentDirty();
    renderContentSection();
    contentEditor.scrollTop = contentEditor.scrollHeight;
  });

  saveContentButton.addEventListener("click", () => run("Enregistrement du contenu", async () => {
    try {
      const result = unwrap(await api.saveContent(readSettings(), managedContent));
      managedContent = result.content;
      contentDirty = false;
      renderContentSection();
      updateContentSummary();
      setMessage("Contenu enregistré. Une sauvegarde de sécurité a été créée.", "success");
      addLog(`Contenu enregistré dans ${result.targets.length} fichier(s).`);
    } catch (error) {
      showError(error, "Enregistrement du contenu");
    }
  }));

  document.getElementById("open-token-page").addEventListener("click", async () => {
    try {
      unwrap(await api.openTokenPage());
      setMessage("GitHub est ouvert. Limitez le jeton au dépôt du site et accordez Contents: Read and write.", "info");
    } catch (error) {
      showError(error, "Ouverture de GitHub");
    }
  });

  document.getElementById("connect-github").addEventListener("click", () => run("Vérification GitHub", async () => {
    const tokenInput = document.getElementById("github-token");
    try {
      const account = unwrap(await api.connectGitHub(tokenInput.value));
      tokenInput.value = "";
      renderConnection(account);
      setMessage(`Connexion sécurisée établie pour @${account.login}.`, "success");
      addLog(`Jeton vérifié et chiffré pour @${account.login}.`);
    } catch (error) {
      tokenInput.value = "";
      showError(error, "Connexion GitHub");
    }
  }));

  document.getElementById("refresh-github").addEventListener("click", () => run("Vérification GitHub", () => refreshGitHub(false)));

  document.getElementById("disconnect-github").addEventListener("click", async () => {
    if (!window.confirm("Supprimer la connexion GitHub enregistrée sur cet ordinateur ?")) return;
    try {
      unwrap(await api.disconnectGitHub());
      renderConnection(null);
      setMessage("Connexion GitHub supprimée de cet ordinateur.", "success");
      addLog("Identifiant GitHub chiffré supprimé.");
    } catch (error) {
      showError(error, "Déconnexion GitHub");
    }
  });

  document.getElementById("check-repository").addEventListener("click", () => run("Vérification du dépôt", async () => {
    try {
      if (!connected) throw Object.assign(new Error("Connectez d’abord GitHub."), { code: "NO_TOKEN" });
      const info = unwrap(await api.inspectRepository(readSettings()));
      repoSummary.hidden = false;
      repoSummary.textContent = `${info.fullName} · branche par défaut : ${info.defaultBranch} · dépôt ${info.private ? "privé" : "public"}`;
      setMessage("Le dépôt est accessible avec la connexion actuelle.", "success");
      addLog(`Dépôt ${info.fullName} vérifié.`);
    } catch (error) {
      repoSummary.hidden = true;
      showError(error, "Dépôt GitHub");
    }
  }));

  document.getElementById("publish").addEventListener("click", () => run("Publication en cours", async () => {
    try {
      if (contentDirty) throw new Error("Enregistrez d’abord les modifications du contenu.");
      if (!connected) throw Object.assign(new Error("Connectez d’abord GitHub."), { code: "NO_TOKEN" });
      setMessage("Préparation de la publication…", "busy");
      addLog("Début de la publication.");
      const result = unwrap(await api.publish(readSettings()));
      if (result.status === "unchanged") {
        setMessage("Le site en ligne est déjà à jour. Aucun commit n’a été créé.", "success");
        addLog(`Aucun changement détecté sur ${result.repository}/${result.branch}.`);
      } else {
        const shortSha = result.commitSha.slice(0, 7);
        setMessage(`Publication réussie : commit ${shortSha}. GitHub Pages peut prendre quelques instants pour se mettre à jour.`, "success");
        addLog(`${result.changed} fichier(s) envoyé(s), ${result.removed} supprimé(s), commit ${shortSha}.`);
      }
    } catch (error) {
      showError(error, "Publication");
    }
  }));

  api.onPublishProgress((text) => {
    setMessage(text, "busy");
    addLog(text);
  });

  window.addEventListener("beforeunload", (event) => {
    if (!contentDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  async function initialize() {
    try {
      const state = unwrap(await api.getState());
      writeSettings(state.settings);
      document.getElementById("version").textContent = `Version ${state.version}`;
      const badge = document.getElementById("encryption-badge");
      badge.textContent = state.encryptionAvailable ? "Protégé par le chiffrement Windows" : "Chiffrement Windows indisponible";
      if (state.tokenStored) await refreshGitHub(true);
      else renderConnection(null);
      await loadContent(true);
      if (managedContent) setMessage("Le gestionnaire et l’éditeur de contenu sont prêts.", "info");
    } catch (error) {
      showError(error, "Démarrage");
    }
  }

  initialize();
})();
