(function () {
  "use strict";

  const lbRoot = document.getElementById("lb-os");

  if (!lbRoot || lbRoot.dataset.lbReady === "true") {
    return;
  }

  lbRoot.dataset.lbReady = "true";

  const lbContent = window.LB_CONTENT || {
    site: {},
    videos: { tutoriels: [], reparations: [], mods: [] },
    downloads: [],
    gallery: [],
    games: [],
    consoles: []
  };

  const LB_CONFIG = Object.freeze({
    wallpaperUrl: lbContent.site?.wallpaper || "assets/fond-atelier.jpg",
    mobileBreakpoint: 700,
    openingDuration: 170,
    closingDuration: 150
  });

  const lbDesktop = document.getElementById("lb-desktop");
  const lbDesktopIcons = document.getElementById("lb-desktop-icons");
  const lbWindowLayer = document.getElementById("lb-window-layer");
  const lbTaskButtons = document.getElementById("lb-task-buttons");
  const lbStartButton = document.getElementById("lb-start-button");
  const lbStartMenu = document.getElementById("lb-start-menu");
  const lbVolumeButton = document.getElementById("lb-volume-button");
  const lbClock = document.getElementById("lb-clock");
  const lbContextLayer = document.getElementById("lb-context-layer");
  const lbAnnouncer = document.getElementById("lb-announcer");

  const lbState = {
    windows: new Map(),
    activeWindowId: null,
    zIndex: 100,
    cascadeIndex: 0,
    selectedIconId: null,
    startMenuOpen: false,
    dialog: null,
    dialogCounter: 0,
    notificationTimer: null,
    currentVideo: null,
    currentConsole: null,
    currentGame: null,
    settings: {
      crtMode: "pixels",
      reducedMotion: false,
      muted: false
    }
  };

  const lbApps = [
    {
      id: "poste-de-travail",
      title: "Poste de travail",
      icon: "computer",
      width: 760,
      height: 520,
      desktop: true,
      address: "La Bidouille OS \\ Poste de travail",
      status: "6 objets",
      view: "explorer",
      intro: "Les principaux espaces de La Bidouille OS.",
      entries: [
        { title: "Atelier (C:)", icon: "drive", meta: "Vidéos de réparation", open: "reparations" },
        { title: "Archives (D:)", icon: "folder", meta: "Tutoriels, logiciels et fichiers", open: "archives" },
        { title: "Consoles (E:)", icon: "console", meta: "Catalogue technique", open: "consoles" },
        { title: "Jeux (F:)", icon: "controller", meta: "Mini-jeux HTML", open: "jeux" },
        { title: "Galerie (G:)", icon: "gallery", meta: "Photos de l'atelier", open: "galerie" },
        { title: "Corbeille", icon: "trash", meta: "0 objet", open: "corbeille" }
      ]
    },
    {
      id: "tutoriels",
      title: "Tutoriels",
      icon: "book",
      width: 860,
      height: 590,
      desktop: true,
      address: "La Bidouille OS \\ Tutoriels",
      status: `${lbContent.videos?.tutoriels?.length || 0} vidéo(s)`,
      view: "videos",
      videoGroup: "tutoriels",
      intro: "Les tutoriels vidéo de Leny. Chaque vignette peut lire YouTube directement dans La Bidouille OS."
    },
    {
      id: "emulation",
      title: "Émulation",
      icon: "emulation",
      width: 820,
      height: 560,
      desktop: true,
      address: "La Bidouille OS \\ Émulation",
      status: "Liens et fichiers d'émulation",
      view: "downloads",
      downloadCategory: "Émulation",
      intro: "Tes liens, outils et fichiers liés à l'émulation."
    },
    {
      id: "telechargements",
      title: "Téléchargements",
      icon: "download",
      width: 780,
      height: 520,
      desktop: true,
      address: "La Bidouille OS \\ Téléchargements",
      status: `${lbContent.downloads?.length || 0} fichier(s) et lien(s)`,
      view: "downloads",
      intro: "Clique sur Télécharger pour récupérer un fichier local ou ouvrir sa page d'hébergement."
    },
    {
      id: "reparations",
      title: "Réparations",
      icon: "tools",
      width: 860,
      height: 590,
      desktop: true,
      address: "La Bidouille OS \\ Réparations",
      status: `${lbContent.videos?.reparations?.length || 0} vidéo(s) d'atelier`,
      view: "videos",
      videoGroup: "reparations",
      intro: "Les réparations et restaurations filmées par Leny, étape par étape."
    },
    {
      id: "informatique",
      title: "Informatique",
      icon: "chip",
      width: 800,
      height: 540,
      desktop: true,
      address: "La Bidouille OS \\ Informatique",
      status: "5 familles de machines",
      view: "explorer",
      intro: "Micro-ordinateurs, composants et systèmes qui ont marqué l'histoire de l'informatique personnelle.",
      entries: [
        { title: "Micro-ordinateurs familiaux", icon: "computer", meta: "Années 1980", detail: "Machines 8 et 16 bits, leurs extensions, leurs supports et les bonnes pratiques pour les remettre en service sans les endommager." },
        { title: "Compatibles PC", icon: "computer", meta: "286 à Pentium", detail: "Cartes mères, bus ISA et PCI, disques IDE, cartes son et configurations DOS ou Windows adaptées à chaque génération." },
        { title: "Macintosh classiques", icon: "monitor", meta: "Systèmes anciens", detail: "Repères pour identifier les modèles, créer des supports de démarrage et surveiller les composants sensibles au vieillissement." },
        { title: "Stockage rétro", icon: "drive", meta: "Disquettes et disques", detail: "Nettoyage des lecteurs, sauvegarde des supports et choix d'interfaces modernes réversibles pour préserver les machines." },
        { title: "Réseaux d'autrefois", icon: "network", meta: "Modems et Ethernet", detail: "Des modems acoustiques aux premières cartes Ethernet : connectique, protocoles et moyens sûrs de relier aujourd'hui une vieille machine." }
      ]
    },
    {
      id: "consoles",
      title: "Consoles",
      icon: "console",
      width: 820,
      height: 550,
      desktop: true,
      address: "La Bidouille OS \\ Consoles",
      status: `${lbContent.consoles?.length || 0} console(s) dans le catalogue`,
      view: "consoles",
      intro: "Un vrai catalogue de machines : photo, date, caractéristiques techniques et consoles contemporaines."
    },
    {
      id: "logiciels",
      title: "Logiciels",
      icon: "disc",
      width: 800,
      height: 540,
      desktop: true,
      address: "La Bidouille OS \\ Logiciels",
      status: "Logiciels et applications",
      view: "downloads",
      downloadCategory: "Logiciels",
      intro: "Tes logiciels, applications et créations à télécharger ou à ouvrir sur leur page officielle."
    },
    {
      id: "archives",
      title: "Archives",
      icon: "folder",
      width: 760,
      height: 520,
      desktop: true,
      address: "La Bidouille OS \\ Archives (D:)",
      status: "4 sous-dossiers",
      view: "explorer",
      intro: "Les archives sont maintenant rangées dans de vrais sous-dossiers.",
      entries: [
        { title: "Tutoriels", icon: "book", meta: "Vidéos YouTube", open: "tutoriels" },
        { title: "Logiciels", icon: "disc", meta: "Applications et outils", open: "logiciels" },
        { title: "Émulation", icon: "emulation", meta: "Fichiers et liens", open: "emulation" },
        { title: "Téléchargements", icon: "download", meta: "Toutes les archives", open: "telechargements" }
      ]
    },
    {
      id: "mods",
      title: "Mods",
      icon: "tools",
      width: 860,
      height: 590,
      desktop: true,
      address: "La Bidouille OS \\ Mods",
      status: `${lbContent.videos?.mods?.length || 0} vidéo(s) de mod`,
      view: "videos",
      videoGroup: "mods",
      intro: "Des vidéos pour modifier un jeu, une NES ou une autre machine, avec les précautions utiles."
    },
    {
      id: "jeux",
      title: "Jeux",
      icon: "controller",
      width: 840,
      height: 570,
      desktop: true,
      address: "La Bidouille OS \\ Jeux",
      status: `${lbContent.games?.length || 0} emplacement(s) de jeu`,
      view: "games",
      intro: "Les mini-jeux HTML s'ouvrent directement dans une fenêtre du bureau."
    },
    {
      id: "galerie",
      title: "Galerie",
      icon: "gallery",
      width: 860,
      height: 590,
      desktop: true,
      address: "La Bidouille OS \\ Galerie",
      status: `${lbContent.gallery?.length || 0} photo(s)`,
      view: "gallery",
      intro: "Les machines, les réparations et les coulisses de l'atelier.",
      entries: lbContent.gallery || []
    },
    {
      id: "contact",
      title: "Contact",
      icon: "mail",
      width: 720,
      height: 560,
      desktop: true,
      address: "La Bidouille OS \\ Contact",
      status: "Prêt à écrire",
      view: "contact"
    },
    {
      id: "a-propos",
      title: "À propos",
      icon: "info",
      iconUrl: lbContent.site?.profileImage || lbContent.site?.logo || "",
      width: 700,
      height: 520,
      desktop: true,
      address: "La Bidouille OS \\ À propos",
      status: "Version 2.0",
      view: "about"
    },
    {
      id: "corbeille",
      title: "Corbeille",
      icon: "trash",
      width: 650,
      height: 440,
      desktop: true,
      address: "La Bidouille OS \\ Corbeille",
      status: "0 objet",
      view: "recycle",
      entries: []
    },
    {
      id: "parametres",
      title: "Paramètres",
      icon: "settings",
      width: 660,
      height: 490,
      desktop: false,
      address: "La Bidouille OS \\ Paramètres",
      status: "Préférences locales",
      view: "settings"
    },
    {
      id: "lecteur-video",
      title: "Lecteur vidéo",
      icon: "monitor",
      width: 900,
      height: 650,
      desktop: false,
      address: "La Bidouille OS \\ Lecteur YouTube",
      status: "Lecteur intégré",
      view: "youtube"
    },
    {
      id: "fiche-console",
      title: "Fiche console",
      icon: "console",
      width: 900,
      height: 650,
      desktop: false,
      address: "La Bidouille OS \\ Consoles \\ Fiche technique",
      status: "Caractéristiques techniques",
      view: "console-detail"
    },
    {
      id: "lecteur-jeu",
      title: "Mini-jeu",
      icon: "controller",
      width: 920,
      height: 680,
      desktop: false,
      address: "La Bidouille OS \\ Jeux \\ Lecteur",
      status: "Jeu HTML intégré",
      view: "game-player"
    }
  ];

  const lbAppMap = new Map(lbApps.map((app) => [app.id, app]));

  const lbStartItems = [
    {
      label: "Programmes",
      icon: "programs",
      submenu: [
        { label: "Consoles", icon: "console", open: "consoles" },
        { label: "Informatique", icon: "chip", open: "informatique" },
        { label: "Logiciels", icon: "disc", open: "logiciels" },
        { label: "Jeux", icon: "controller", open: "jeux" },
        { label: "Mods", icon: "tools", open: "mods" }
      ]
    },
    { label: "Tutoriels", icon: "book", open: "tutoriels" },
    { label: "Réparations", icon: "tools", open: "reparations" },
    { label: "Mods", icon: "tools", open: "mods" },
    { label: "Jeux", icon: "controller", open: "jeux" },
    { label: "Émulation", icon: "emulation", open: "emulation" },
    { label: "Consoles", icon: "console", open: "consoles" },
    { label: "Informatique", icon: "chip", open: "informatique" },
    { label: "Logiciels", icon: "disc", open: "logiciels" },
    { label: "Téléchargements", icon: "download", open: "telechargements" },
    { label: "Archives", icon: "folder", open: "archives" },
    { label: "Galerie", icon: "gallery", open: "galerie" },
    {
      label: "Documents",
      icon: "folder",
      separatorBefore: true,
      submenu: [
        { label: "Téléchargements", icon: "download", open: "telechargements" },
        { label: "Galerie", icon: "gallery", open: "galerie" },
        { label: "Contact", icon: "mail", open: "contact" }
      ]
    },
    { label: "Paramètres", icon: "settings", open: "parametres" },
    { label: "Rechercher", icon: "search", command: "search" },
    { label: "Aide", icon: "help", command: "help" },
    { label: "Exécuter...", icon: "run", command: "run" },
    { label: "À propos", icon: "info", open: "a-propos", separatorBefore: true },
    { label: "Arrêter...", icon: "shutdown", command: "shutdown" }
  ];

  function lbEscapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function lbNormalizeText(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function lbSafeUrl(value, options = {}) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (options.image && /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(raw)) {
      return raw;
    }

    try {
      const parsed = new URL(raw, window.location.href);
      if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "file:") {
        return raw;
      }
    } catch (error) {
      return "";
    }

    return "";
  }

  function lbIsLocalUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return false;
    try {
      return new URL(raw, window.location.href).origin === window.location.origin;
    } catch (error) {
      return false;
    }
  }

  function lbGetYouTubeId(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const directId = raw.match(/^[a-zA-Z0-9_-]{11}$/)?.[0];
    if (directId) return directId;

    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "");
      if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
      if (host.endsWith("youtube.com")) {
        const fromQuery = url.searchParams.get("v");
        if (fromQuery) return fromQuery;
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || "";
      }
    } catch (error) {
      return "";
    }

    return "";
  }

  function lbGetStoredBoolean(key, fallback) {
    try {
      const value = window.localStorage.getItem(`lb-os-${key}`);
      return value === null ? fallback : value === "true";
    } catch (error) {
      return fallback;
    }
  }

  function lbStoreBoolean(key, value) {
    try {
      window.localStorage.setItem(`lb-os-${key}`, String(value));
    } catch (error) {
      /* Les préférences restent actives pour cette visite. */
    }
  }

  function lbGetStoredString(key, fallback) {
    try {
      return window.localStorage.getItem(`lb-os-${key}`) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function lbStoreString(key, value) {
    try {
      window.localStorage.setItem(`lb-os-${key}`, String(value));
    } catch (error) {
      /* Le réglage reste actif pour cette visite. */
    }
  }

  function lbIsMobileLayout() {
    return window.innerWidth <= LB_CONFIG.mobileBreakpoint;
  }

  function lbAnnounce(message) {
    lbAnnouncer.textContent = "";
    window.setTimeout(() => {
      lbAnnouncer.textContent = message;
    }, 20);
  }

  function lbIconSvg(name) {
    const common = 'viewBox="0 0 32 32" aria-hidden="true" focusable="false"';
    const icons = {
      computer: `<svg ${common}><path fill="#000" d="M2 3h25v19H2zM7 25h16v3H7zM4 29h23v2H4z"/><path fill="#c0c0c0" d="M4 5h21v15H4z"/><path fill="#000080" d="M6 7h17v11H6z"/><path fill="#00a0a0" d="M7 8h15v9H7z"/><path fill="#fff" d="M5 21h19v1H5z"/></svg>`,
      monitor: `<svg ${common}><path fill="#000" d="M3 4h26v20H3zM11 25h10v3H11zM7 29h18v2H7z"/><path fill="#dfdfdf" d="M5 6h22v16H5z"/><path fill="#000080" d="M7 8h18v12H7z"/><path fill="#00a0a0" d="M8 9h16v10H8z"/></svg>`,
      folder: `<svg ${common}><path fill="#000" d="M2 7h11l3 3h14v18H2z"/><path fill="#fff080" d="M3 8h9l3 3h13v3H3z"/><path fill="#e0b020" d="M4 13h25l-3 13H3z"/><path fill="#ffff80" d="M5 14h22l-2 10H4z"/></svg>`,
      book: `<svg ${common}><path fill="#000" d="M3 4h12l2 2 2-2h10v24H19l-2 2-3-2H3z"/><path fill="#000080" d="M5 6h9l2 2v18l-2-1H5z"/><path fill="#3040d0" d="M19 7l2-1h6v19h-7l-1 1z"/><path fill="#fff" d="M7 9h6v2H7zm0 4h6v1H7zm14-4h5v2h-5zm0 4h5v1h-5z"/></svg>`,
      document: `<svg ${common}><path fill="#000" d="M6 2h14l7 7v21H6z"/><path fill="#fff" d="M8 4h11v7h6v17H8z"/><path fill="#c0c0c0" d="M20 4l5 5h-5z"/><path fill="#000080" d="M11 15h11v2H11zm0 4h11v2H11zm0 4h8v2h-8z"/></svg>`,
      disk: `<svg ${common}><path fill="#000" d="M3 3h25v26H3z"/><path fill="#3040b0" d="M5 5h21v22H5z"/><path fill="#fff" d="M8 5h15v9H8zm1 14h14v8H9z"/><path fill="#000" d="M18 6h4v6h-4zm-7 15h10v1H11zm0 3h8v1h-8z"/></svg>`,
      disc: `<svg ${common}><path fill="#000" d="M16 2a14 14 0 1 1 0 28 14 14 0 0 1 0-28z"/><path fill="#e8e8e8" d="M16 4a12 12 0 1 1 0 24 12 12 0 0 1 0-24z"/><path fill="#40c0c0" d="M16 5a11 11 0 0 1 7 3l-6 6z"/><path fill="#d060c0" d="M27 16a11 11 0 0 1-3 7l-7-6z"/><path fill="#fff060" d="M15 17l-6 7a11 11 0 0 1-4-8z"/><path fill="#000" d="M12 12h8v8h-8z"/><path fill="#fff" d="M14 14h4v4h-4z"/></svg>`,
      download: `<svg ${common}><path fill="#000" d="M4 3h23v26H4z"/><path fill="#c0c0c0" d="M6 5h19v22H6z"/><path fill="#fff" d="M8 6h14v7H8z"/><path fill="#000080" d="M13 9h6v8h5l-8 9-8-9h5z"/><path fill="#00a0a0" d="M15 10h2v10l3-1-4 5-4-5 3 1z"/></svg>`,
      tools: `<svg ${common}><path fill="#000" d="M21 2l4 4-5 5 10 10-8 8-10-10-5 5-4-4 8-8 3 3 3-3-3-3z"/><path fill="#c0c0c0" d="M21 5l1 1-5 6 11 10-5 5-10-11-6 5-1-1 8-8 3 3 3-3-3-3z"/><path fill="#f0b020" d="M6 18l8-8 2 2-8 8z"/></svg>`,
      chip: `<svg ${common}><path fill="#000" d="M6 6h20v20H6zM2 9h4v3H2zm0 6h4v3H2zm0 6h4v3H2zm24-12h4v3h-4zm0 6h4v3h-4zm0 6h4v3h-4zM9 2h3v4H9zm6 0h3v4h-3zm6 0h3v4h-3zM9 26h3v4H9zm6 0h3v4h-3zm6 0h3v4h-3z"/><path fill="#208040" d="M8 8h16v16H8z"/><path fill="#80d080" d="M11 11h10v10H11z"/><path fill="#ffff80" d="M13 13h6v6h-6z"/></svg>`,
      console: `<svg ${common}><path fill="#000" d="M4 10h24l4 15-4 4-8-6h-8l-8 6-4-4z"/><path fill="#c0c0c0" d="M6 12h20l3 12-2 2-7-6h-9l-6 6-2-2z"/><path fill="#808080" d="M8 15h4v3h3v4h-3v3H8v-3H5v-4h3z"/><path fill="#000" d="M9 16h2v3h3v2h-3v3H9v-3H6v-2h3zm12 2h3v3h-3zm4 4h3v3h-3z"/><path fill="#d02020" d="M22 19h1v1h-1zm4 4h1v1h-1z"/></svg>`,
      controller: `<svg ${common}><path fill="#000" d="M4 9h24l3 15-5 5-7-7h-6l-7 7-5-5z"/><path fill="#d0d0d0" d="M6 11h20l2 12-2 3-6-6h-8l-6 6-2-3z"/><path fill="#000080" d="M8 15h3v3h3v3h-3v3H8v-3H5v-3h3zm13 2h3v3h-3zm4 4h3v3h-3z"/></svg>`,
      handheld: `<svg ${common}><path fill="#000" d="M7 2h19v28H7z"/><path fill="#c0c0c0" d="M9 4h15v24H9z"/><path fill="#000" d="M11 6h11v10H11z"/><path fill="#70b080" d="M12 7h9v8h-9z"/><path fill="#000080" d="M12 19h3v2h2v3h-2v2h-3v-2h-2v-3h2zm7 1h2v2h-2zm2 3h2v2h-2z"/></svg>`,
      emulation: `<svg ${common}><path fill="#000" d="M2 4h22v17H2zM7 24h12v3H7zM25 10h5v18H17v-5h8z"/><path fill="#c0c0c0" d="M4 6h18v13H4z"/><path fill="#000080" d="M6 8h14v9H6z"/><path fill="#00a0a0" d="M7 9h12v7H7z"/><path fill="#ffff00" d="M20 20h8v6h-8z"/><path fill="#000" d="M22 21h4v1h-4zm0 2h4v1h-4z"/></svg>`,
      gallery: `<svg ${common}><path fill="#000" d="M3 5h26v23H3z"/><path fill="#fff" d="M5 7h22v19H5z"/><path fill="#80c0e0" d="M7 9h18v15H7z"/><path fill="#ffff40" d="M20 10h4v4h-4z"/><path fill="#208040" d="M7 22l6-7 4 5 3-3 5 5v2H7z"/><path fill="#406020" d="M7 23l6-5 4 4 3-2 5 3v1H7z"/></svg>`,
      mail: `<svg ${common}><path fill="#000" d="M2 6h28v21H2z"/><path fill="#fff" d="M4 8h24v17H4z"/><path fill="#c0c0c0" d="M4 9l12 10L28 9v4L16 23 4 13z"/><path fill="#000080" d="M5 8h22L16 17z"/></svg>`,
      info: `<svg ${common}><path fill="#000" d="M16 2a14 14 0 1 1 0 28 14 14 0 0 1 0-28z"/><path fill="#000080" d="M16 4a12 12 0 1 1 0 24 12 12 0 0 1 0-24z"/><path fill="#fff" d="M14 8h4v4h-4zm-2 7h6v9h3v2h-9v-2h2v-7h-2z"/></svg>`,
      trash: `<svg ${common}><path fill="#000" d="M8 7h18l-2 23H9zM6 4h7V2h8v2h7v3H6z"/><path fill="#c0c0c0" d="M10 9h14l-2 19H11z"/><path fill="#fff" d="M12 11h2v14h-2zm5 0h2v14h-2z"/><path fill="#808080" d="M21 11h2l-1 14h-2z"/></svg>`,
      drive: `<svg ${common}><path fill="#000" d="M2 8h28v20H2z"/><path fill="#c0c0c0" d="M4 10h24v16H4z"/><path fill="#fff" d="M6 12h20v7H6z"/><path fill="#808080" d="M6 21h20v3H6z"/><path fill="#00a000" d="M23 22h2v1h-2z"/></svg>`,
      terminal: `<svg ${common}><path fill="#000" d="M2 4h28v24H2z"/><path fill="#202020" d="M4 6h24v20H4z"/><path fill="#fff" d="M7 10l5 4-5 4v-3l2-1-2-1zm6 8h8v2h-8z"/></svg>`,
      settings: `<svg ${common}><path fill="#000" d="M13 2h6l1 5 4 2 4-3 4 6-4 3v4l4 3-4 6-5-3-3 2-1 5h-6l-1-5-4-2-4 3-4-6 4-3v-4l-4-3 4-6 5 3 3-2z"/><path fill="#808080" d="M15 5h2l1 4 6 3 3-2 2 3-4 2v6l4 2-2 3-4-3-6 3-1 3h-2l-1-4-6-3-3 2-2-3 4-2v-6l-4-2 2-3 4 3 6-3z"/><path fill="#fff" d="M16 11a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"/><path fill="#000080" d="M16 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>`,
      search: `<svg ${common}><path fill="#000" d="M13 2a11 11 0 1 1-7 19L0 28l4 4 7-7a11 11 0 0 1 2-23z"/><path fill="#fff" d="M13 5a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"/><path fill="#80c0e0" d="M13 7a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/><path fill="#fff" d="M9 8h5v2H9z"/></svg>`,
      help: `<svg ${common}><path fill="#000" d="M16 2a14 14 0 1 1 0 28 14 14 0 0 1 0-28z"/><path fill="#000080" d="M16 4a12 12 0 1 1 0 24 12 12 0 0 1 0-24z"/><path fill="#fff" d="M10 10c1-4 11-5 12 1 1 5-5 5-5 9h-4c0-6 5-6 5-9 0-2-4-2-5 1zm3 12h4v4h-4z"/></svg>`,
      run: `<svg ${common}><path fill="#000" d="M2 5h28v22H2z"/><path fill="#c0c0c0" d="M4 7h24v18H4z"/><path fill="#fff" d="M6 9h20v12H6z"/><path fill="#000080" d="M9 12h12v2H9zm0 4h8v2H9z"/><path fill="#00a000" d="M20 16l6 3-6 3z"/></svg>`,
      shutdown: `<svg ${common}><path fill="#000" d="M14 1h5v15h-5zM8 5l3 4a8 8 0 1 0 11 0l3-4a13 13 0 1 1-17 0z"/><path fill="#d02020" d="M15 3h3v12h-3zM8 8l2 2a9 9 0 1 0 13 0l2-2a12 12 0 1 1-17 0z"/></svg>`,
      programs: `<svg ${common}><path fill="#000" d="M2 3h13v12H2zm15 0h13v12H17zM2 17h13v13H2zm15 0h13v13H17z"/><path fill="#d02020" d="M4 5h9v8H4z"/><path fill="#208040" d="M19 5h9v8h-9z"/><path fill="#3040d0" d="M4 19h9v9H4z"/><path fill="#e0b020" d="M19 19h9v9h-9z"/></svg>`,
      network: `<svg ${common}><path fill="#000" d="M3 3h12v10H3zm14 16h12v10H17zM2 20h12v10H2zm10-11h6v2h-2v11h-2V11h-2zm3 11h4v2h-4z"/><path fill="#c0c0c0" d="M5 5h8v6H5zm14 16h8v6h-8zM4 22h8v6H4z"/><path fill="#000080" d="M6 6h6v4H6zm14 16h6v4h-6zM5 23h6v4H5z"/></svg>`,
      power: `<svg ${common}><path fill="#000" d="M14 1h5v15h-5zM8 5l3 4a8 8 0 1 0 11 0l3-4a13 13 0 1 1-17 0z"/><path fill="#ffff00" d="M15 3h3v12h-3zM9 8l2 2a8 8 0 1 0 11 0l2-2a11 11 0 1 1-15 0z"/></svg>`,
      cartridge: `<svg ${common}><path fill="#000" d="M5 3h22v26H5z"/><path fill="#808080" d="M7 5h18v22H7z"/><path fill="#c0c0c0" d="M9 7h14v13H9z"/><path fill="#000080" d="M11 9h10v7H11z"/><path fill="#e0b020" d="M9 23h14v3H9z"/></svg>`
    };

    return icons[name] || icons.document;
  }

  function lbIconMarkup(name, className = "lb-icon-graphic", imageUrl = "") {
    if (imageUrl) {
      return `<span class="${className}" aria-hidden="true"><img src="${lbEscapeHtml(imageUrl)}" alt=""></span>`;
    }

    return `<span class="${className}" aria-hidden="true">${lbIconSvg(name)}</span>`;
  }

  function lbRenderMediaImage(source, alt, fallbackLabel) {
    const safeSource = lbSafeUrl(source, { image: true });
    if (!safeSource) {
      return `<span class="lb-media-fallback" aria-hidden="true">${lbEscapeHtml(fallbackLabel || "IMAGE")}</span>`;
    }

    return `
      <span class="lb-media-frame">
        <img class="lb-media-image" src="${lbEscapeHtml(safeSource)}" alt="${lbEscapeHtml(alt)}" loading="lazy" data-lb-media-image>
        <span class="lb-media-fallback" aria-hidden="true">${lbEscapeHtml(fallbackLabel || "IMAGE")}</span>
      </span>`;
  }

  function lbRenderManagedEmpty(title, explanation) {
    return `
      <div class="lb-managed-empty">
        ${lbIconMarkup("folder", "lb-empty-icon")}
        <h2>${lbEscapeHtml(title)}</h2>
        <p>${lbEscapeHtml(explanation)}</p>
      </div>`;
  }

  function lbRenderVideos(app) {
    const group = app.videoGroup || "tutoriels";
    const videos = lbContent.videos?.[group] || [];
    if (!videos.length) {
      return `
        <div class="lb-details-view">
          <h1>${lbEscapeHtml(app.title)} vidéo</h1>
          <p>${lbEscapeHtml(app.intro || "")}</p>
          ${lbRenderManagedEmpty(
            "Aucune vidéo pour le moment",
            "Leny prépare de nouvelles vidéos. Elles apparaîtront bientôt dans cette rubrique."
          )}
        </div>`;
    }

    return `
      <div class="lb-details-view">
        <h1>${lbEscapeHtml(app.title)} vidéo</h1>
        <p>${lbEscapeHtml(app.intro || "")}</p>
        <div class="lb-video-grid">
          ${videos.map((video, index) => {
            const youtubeId = lbGetYouTubeId(video.youtubeUrl);
            const thumbnail = video.image || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : "");
            return `
              <article class="lb-media-card">
                <button class="lb-media-open" type="button" data-lb-video-group="${lbEscapeHtml(group)}" data-lb-video-index="${index}" aria-label="Lire ${lbEscapeHtml(video.title || "la vidéo")}">
                  ${lbRenderMediaImage(thumbnail, `Miniature de ${video.title || "la vidéo"}`, "VIDÉO")}
                  <span class="lb-play-badge" aria-hidden="true">▶</span>
                </button>
                <div class="lb-media-card-body">
                  <h2>${lbEscapeHtml(video.title || "Vidéo sans titre")}</h2>
                  ${video.description ? `<p>${lbEscapeHtml(video.description)}</p>` : ""}
                  <p class="lb-card-meta">${lbEscapeHtml([video.duration, video.published].filter(Boolean).join(" · ") || "Vidéo YouTube")}</p>
                  <div class="lb-card-actions">
                    <button class="lb-classic-button" type="button" data-lb-video-group="${lbEscapeHtml(group)}" data-lb-video-index="${index}">Lire ici</button>
                    ${lbSafeUrl(video.youtubeUrl) ? `<a class="lb-classic-button lb-link-button" href="${lbEscapeHtml(video.youtubeUrl)}" target="_blank" rel="noopener noreferrer">YouTube ↗</a>` : ""}
                  </div>
                </div>
              </article>`;
          }).join("")}
        </div>
      </div>`;
  }

  function lbRenderYouTubePlayer() {
    const video = lbState.currentVideo;
    if (!video) {
      return `<div class="lb-details-view">${lbRenderManagedEmpty("Aucune vidéo sélectionnée", "Ouvre d'abord Tutoriels, Réparations ou Mods.")}</div>`;
    }

    const youtubeId = lbGetYouTubeId(video.youtubeUrl);
    const externalUrl = lbSafeUrl(video.youtubeUrl);
    return `
      <div class="lb-player-view">
        <div class="lb-player-heading">
          <div>
            <h1>${lbEscapeHtml(video.title || "Lecteur vidéo")}</h1>
            ${video.description ? `<p>${lbEscapeHtml(video.description)}</p>` : ""}
          </div>
          ${externalUrl ? `<a class="lb-classic-button lb-link-button" href="${lbEscapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer">Ouvrir sur YouTube ↗</a>` : ""}
        </div>
        ${youtubeId
          ? `<div class="lb-iframe-frame lb-video-player"><iframe src="https://www.youtube-nocookie.com/embed/${lbEscapeHtml(youtubeId)}?rel=0" title="${lbEscapeHtml(video.title || "Vidéo YouTube")}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`
          : `<div class="lb-info-panel">Cette vidéo ne peut pas être lue dans la fenêtre. Utilise le bouton d'ouverture externe.</div>`}
      </div>`;
  }

  function lbFilteredDownloads(app) {
    const allDownloads = lbContent.downloads || [];
    if (!app.downloadCategory) return allDownloads;
    const wanted = lbNormalizeText(app.downloadCategory);
    return allDownloads.filter((item) => lbNormalizeText(item.category) === wanted);
  }

  function lbRenderDownloads(app) {
    const downloads = lbFilteredDownloads(app);
    if (!downloads.length) {
      return `
        <div class="lb-details-view">
          <h1>${lbEscapeHtml(app.title)}</h1>
          <p>${lbEscapeHtml(app.intro || "")}</p>
          ${lbRenderManagedEmpty(
            "Aucun fichier dans ce dossier",
            `Aucun fichier de la catégorie ${app.downloadCategory || "souhaitée"} n'est encore disponible.`
          )}
        </div>`;
    }

    return `
      <div class="lb-details-view">
        <h1>${lbEscapeHtml(app.title)}</h1>
        <p>${lbEscapeHtml(app.intro || "")}</p>
        <div class="lb-download-list">
          ${downloads.map((item) => {
            const url = lbSafeUrl(item.fileUrl);
            const downloadAttr = url && lbIsLocalUrl(url) ? " download" : "";
            return `
              <article class="lb-download-row">
                ${item.image ? lbRenderMediaImage(item.image, `Illustration de ${item.title}`, "FICHIER") : lbIconMarkup("download", "lb-download-icon")}
                <div class="lb-download-copy">
                  <h2>${lbEscapeHtml(item.title || "Fichier sans titre")}</h2>
                  <p>${lbEscapeHtml(item.description || "Aucune description.")}</p>
                  <span class="lb-tag">${lbEscapeHtml(item.category || "Divers")}</span>
                  ${item.version ? `<span class="lb-tag">Version ${lbEscapeHtml(item.version)}</span>` : ""}
                  ${item.size ? `<span class="lb-tag">${lbEscapeHtml(item.size)}</span>` : ""}
                </div>
                <div class="lb-download-action">
                  ${url
                    ? `<a class="lb-classic-button lb-link-button" href="${lbEscapeHtml(url)}"${downloadAttr} target="_blank" rel="noopener noreferrer">Télécharger</a>`
                    : `<button class="lb-classic-button" type="button" disabled>Lien à ajouter</button>`}
                </div>
              </article>`;
          }).join("")}
        </div>
      </div>`;
  }

  function lbRenderConsoles(app) {
    const consoles = lbContent.consoles || [];
    if (!consoles.length) {
      return `<div class="lb-details-view">${lbRenderManagedEmpty("Catalogue vide", "Le catalogue de consoles est en cours de préparation.")}</div>`;
    }

    const generations = [...new Set(consoles.map((item) => item.generation).filter(Boolean))];
    return `
      <div class="lb-details-view">
        <h1>Catalogue des consoles</h1>
        <p>${lbEscapeHtml(app.intro || "")}</p>
        <div class="lb-catalog-tools">
          <label>Rechercher
            <input class="lb-classic-input" type="search" data-lb-console-search placeholder="Exemple : Nintendo, 1994, portable">
          </label>
          <label>Génération
            <select class="lb-classic-select" data-lb-console-generation>
              <option value="">Toutes</option>
              ${generations.map((generation) => `<option value="${lbEscapeHtml(lbNormalizeText(generation))}">${lbEscapeHtml(generation)}</option>`).join("")}
            </select>
          </label>
        </div>
        <p class="lb-catalog-count" data-lb-console-count>${consoles.length} console(s) affichée(s)</p>
        <div class="lb-console-grid">
          ${consoles.map((item, index) => `
            <article class="lb-console-card" data-lb-console-card data-lb-console-searchable="${lbEscapeHtml(lbNormalizeText(Object.values(item).join(" ")))}" data-lb-console-generation-value="${lbEscapeHtml(lbNormalizeText(item.generation || ""))}">
              <button class="lb-console-open" type="button" data-lb-console-index="${index}" aria-label="Ouvrir la fiche de ${lbEscapeHtml(item.name)}">
                ${lbRenderMediaImage(item.image, `Photo de ${item.name}`, "CONSOLE")}
                <span class="lb-console-card-copy">
                  <strong>${lbEscapeHtml(item.name || "Console sans nom")}</strong>
                  <small>${lbEscapeHtml([item.manufacturer, item.release].filter(Boolean).join(" · "))}</small>
                  <span>${lbEscapeHtml(item.generation || "Génération non renseignée")}</span>
                </span>
              </button>
            </article>`).join("")}
        </div>
      </div>`;
  }

  function lbRenderConsoleDetail() {
    const item = lbState.currentConsole;
    if (!item) {
      return `<div class="lb-details-view">${lbRenderManagedEmpty("Aucune console sélectionnée", "Ouvre le catalogue puis choisis une machine.")}</div>`;
    }

    const specs = [
      ["Constructeur", item.manufacturer],
      ["Sortie", item.release],
      ["Région", item.region],
      ["Génération", item.generation],
      ["Type", item.type],
      ["Processeur", item.cpu],
      ["Graphismes", item.graphics],
      ["Mémoire", item.memory],
      ["Support", item.media],
      ["Affichage", item.display],
      ["Son", item.sound]
    ].filter(([, value]) => value);
    const imageSource = lbSafeUrl(item.imageSource);

    return `
      <div class="lb-details-view lb-console-detail">
        <div class="lb-console-hero">
          <div>
            ${lbRenderMediaImage(item.image, `Photo de ${item.name}`, "CONSOLE")}
            ${imageSource ? `<a class="lb-image-credit" href="${lbEscapeHtml(imageSource)}" target="_blank" rel="noopener noreferrer">Source de l'image ↗</a>` : ""}
          </div>
          <div>
            <h1>${lbEscapeHtml(item.name || "Fiche console")}</h1>
            <p>${lbEscapeHtml(item.summary || "Description à compléter.")}</p>
            ${item.contemporaries ? `<div class="lb-info-panel"><strong>À la même époque :</strong><br>${lbEscapeHtml(item.contemporaries)}</div>` : ""}
          </div>
        </div>
        <table class="lb-spec-table">
          <tbody>${specs.map(([label, value]) => `<tr><th scope="row">${lbEscapeHtml(label)}</th><td>${lbEscapeHtml(value)}</td></tr>`).join("")}</tbody>
        </table>
      </div>`;
  }

  function lbRenderGames(app) {
    const games = lbContent.games || [];
    if (!games.length) {
      return `<div class="lb-details-view">${lbRenderManagedEmpty("Aucun jeu installé", "Un mini-jeu rejoindra bientôt l'atelier.")}</div>`;
    }

    return `
      <div class="lb-details-view">
        <h1>Jeux de La Bidouille</h1>
        <p>${lbEscapeHtml(app.intro || "")}</p>
        <div class="lb-game-grid">
          ${games.map((game, index) => `
            <article class="lb-media-card">
              ${lbRenderMediaImage(game.image, `Illustration de ${game.title}`, "JEU")}
              <div class="lb-media-card-body">
                <h2>${lbEscapeHtml(game.title || "Mini-jeu")}</h2>
                <p>${lbEscapeHtml(game.description || "Jeu HTML")}</p>
                <p class="lb-card-meta">${game.ready ? "Prêt à jouer" : "Emplacement préparé — jeu à fournir"}</p>
                <button class="lb-classic-button" type="button" data-lb-game-index="${index}" ${game.ready && lbSafeUrl(game.url) ? "" : "disabled"}>${game.ready ? "Jouer" : "Jeu à installer"}</button>
              </div>
            </article>`).join("")}
        </div>
      </div>`;
  }

  function lbRenderGamePlayer() {
    const game = lbState.currentGame;
    const url = lbSafeUrl(game?.url);
    if (!game || !game.ready || !url) {
      return `<div class="lb-details-view">${lbRenderManagedEmpty("Jeu non installé", "Ce jeu n'est pas encore disponible sur le site.")}</div>`;
    }

    if (game.mode === "external") {
      return `
        <div class="lb-details-view">
          <h1>${lbEscapeHtml(game.title)}</h1>
          <p>${lbEscapeHtml(game.description || "")}</p>
          <div class="lb-info-panel">Ce jeu est hébergé par son éditeur et s'ouvre sur son site officiel dans un nouvel onglet.</div>
          <a class="lb-classic-button lb-link-button" href="${lbEscapeHtml(url)}" target="_blank" rel="noopener noreferrer">Lancer le jeu ↗</a>
        </div>`;
    }

    return `
      <div class="lb-game-player">
        <div class="lb-game-toolbar">
          <strong>${lbEscapeHtml(game.title)}</strong>
          <a class="lb-classic-button lb-link-button" href="${lbEscapeHtml(url)}" target="_blank" rel="noopener noreferrer">Plein écran ↗</a>
        </div>
        <div class="lb-iframe-frame"><iframe src="${lbEscapeHtml(url)}" title="Jeu : ${lbEscapeHtml(game.title)}" allow="autoplay; fullscreen; gamepad" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"></iframe></div>
      </div>`;
  }

  function lbRenderExplorer(app) {
    const entries = app.entries || [];

    if (!entries.length) {
      return `
        <div class="lb-details-view">
          <h1>${lbEscapeHtml(app.title)}</h1>
          <div class="lb-info-panel">
            Ce dossier est vide. Aucun fichier ne s'est perdu dans les câbles de l'atelier.
          </div>
        </div>`;
    }

    return `
      <div class="lb-explorer-grid" role="list" aria-label="Contenu de ${lbEscapeHtml(app.title)}">
        ${entries.map((entry, index) => `
          <button
            class="lb-file-item"
            type="button"
            role="listitem"
            data-lb-app-id="${lbEscapeHtml(app.id)}"
            data-lb-entry-index="${index}"
            aria-label="Ouvrir ${lbEscapeHtml(entry.title)}"
          >
            ${lbIconMarkup(entry.icon || "document")}
            <span class="lb-file-name">${lbEscapeHtml(entry.title)}</span>
            ${entry.meta ? `<span class="lb-file-meta">${lbEscapeHtml(entry.meta)}</span>` : ""}
          </button>`).join("")}
      </div>`;
  }

  function lbRenderGallery(app) {
    const entries = app.entries || [];
    if (!entries.length) {
      return `<div class="lb-details-view">${lbRenderManagedEmpty("Galerie vide", "Les premières photos de l'atelier seront bientôt publiées.")}</div>`;
    }

    return `
      <div class="lb-details-view">
        <h1>Galerie de l'atelier</h1>
        <p>${lbEscapeHtml(app.intro)}</p>
        <div class="lb-gallery-grid">
          ${entries.map((entry, index) => `
            <button
              type="button"
              class="lb-retro-card"
              data-lb-app-id="${lbEscapeHtml(app.id)}"
              data-lb-entry-index="${index}"
            >
              ${lbRenderMediaImage(entry.image, `Photo : ${entry.title}`, `PHOTO ${String(index + 1).padStart(2, "0")}`)}
              <strong>${lbEscapeHtml(entry.title)}</strong><br>
              <small>${lbEscapeHtml(entry.album || entry.caption || "Galerie")}</small>
            </button>`).join("")}
        </div>
      </div>`;
  }

  function lbRenderContact() {
    const contactEmail = String(lbContent.site?.contactEmail || "").trim();
    const emailConfigured = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
    return `
      <div class="lb-details-view">
        <h1>Contacter La Bidouille</h1>
        <p>Une question sur une réparation, une vieille machine ou un projet DIY ? Écris à Leny depuis ce formulaire.</p>
        <div class="lb-info-panel">
          ${emailConfigured
            ? `Adresse de destination : <strong>${lbEscapeHtml(contactEmail)}</strong><br>Le bouton prépare un message dans le logiciel de messagerie du visiteur. Aucune donnée n'est enregistrée par le site.`
            : `<strong>Adresse de contact en cours de configuration.</strong><br>Le formulaire sera activé dès que Leny aura renseigné son adresse de destination.`}
        </div>
        <form class="lb-contact-form" id="lb-contact-form">
          <label>
            Ton nom
            <input class="lb-classic-input" name="name" autocomplete="name" required maxlength="80">
          </label>
          <label>
            Ton adresse électronique
            <input class="lb-classic-input" type="email" name="email" autocomplete="email" required maxlength="120">
          </label>
          <label>
            Sujet
            <select class="lb-classic-select" name="subject">
              <option>Question technique</option>
              <option>Réparation</option>
              <option>Partage d'un projet</option>
              <option>Autre demande</option>
            </select>
          </label>
          <label>
            Message
            <textarea class="lb-classic-textarea" name="message" required maxlength="2500"></textarea>
          </label>
          <div class="lb-button-row">
            <button class="lb-classic-button" type="reset">Effacer</button>
            <button class="lb-classic-button" type="submit" ${emailConfigured ? "" : "disabled"}>Préparer le message</button>
          </div>
        </form>
      </div>`;
  }

  function lbRenderAbout() {
    const author = lbContent.site?.authorName || "Leny";
    const profileImage = lbContent.site?.profileImage || lbContent.site?.logo || "";
    return `
      <div class="lb-details-view lb-about-view">
        <div class="lb-about-hero">
          ${lbRenderMediaImage(profileImage, `Logo de La Bidouille par ${author}`, "LA BIDOUILLE")}
          <div>
            <h1>LA BIDOUILLE OS</h1>
            <p><strong>Version 2.0 — Édition Atelier de ${lbEscapeHtml(author)}</strong></p>
            <p>${lbEscapeHtml(lbContent.site?.bio || `Moi, c'est ${author}, fan de rétro-informatique et de bidouille.`)}</p>
          </div>
        </div>
        <div class="lb-info-panel">
          ${lbEscapeHtml(lbContent.site?.about || "Un atelier numérique consacré au rétro, aux réparations, aux mods, à l'émulation et aux projets DIY.")}
        </div>
        <div class="lb-card-list">
          <article class="lb-retro-card">
            <h3>Ma passion</h3>
            <p>Comprendre les anciennes machines, préserver leur histoire et partager ce que j'apprends au fil des réparations.</p>
          </article>
          <article class="lb-retro-card">
            <h3>Ma méthode</h3>
            <p>Observer, mesurer, documenter et réparer avec le moins de modifications irréversibles possible.</p>
          </article>
          <article class="lb-retro-card">
            <h3>Mes terrains de jeu</h3>
            <p>
              <span class="lb-tag">Ordinateurs</span>
              <span class="lb-tag">Consoles</span>
              <span class="lb-tag">Logiciels</span>
              <span class="lb-tag">Électronique</span>
              <span class="lb-tag">DIY</span>
            </p>
          </article>
        </div>
        <h2>À propos de cette interface</h2>
        <p>Les fenêtres peuvent être déplacées, réduites, agrandies et restaurées depuis la barre des tâches. Un même raccourci ne crée jamais deux fois la même fenêtre.</p>
      </div>`;
  }

  function lbRenderSettings() {
    return `
      <div class="lb-details-view">
        <h1>Paramètres du bureau</h1>
        <p>Ces choix sont conservés uniquement dans ce navigateur.</p>
        <div class="lb-settings-list">
          <fieldset class="lb-crt-options">
            <legend>Effet écran cathodique</legend>
            <label class="lb-check-row"><input type="radio" name="lb-crt-mode" value="pixels" data-lb-crt-mode ${lbState.settings.crtMode === "pixels" ? "checked" : ""}><span><strong>Pixels lisibles</strong><br>Gros masque RVB, scanlines discrètes et texte net.</span></label>
            <label class="lb-check-row"><input type="radio" name="lb-crt-mode" value="soft" data-lb-crt-mode ${lbState.settings.crtMode === "soft" ? "checked" : ""}><span><strong>Effet léger</strong><br>Scanlines fines et vignette très douce.</span></label>
            <label class="lb-check-row"><input type="radio" name="lb-crt-mode" value="off" data-lb-crt-mode ${lbState.settings.crtMode === "off" ? "checked" : ""}><span><strong>Désactivé</strong><br>Image totalement neutre.</span></label>
          </fieldset>
          <label class="lb-check-row">
            <input type="checkbox" data-lb-setting="reducedMotion" ${lbState.settings.reducedMotion ? "checked" : ""}>
            <span><strong>Réduire les animations</strong><br>Raccourcit les effets d'ouverture, de fermeture et de clignotement.</span>
          </label>
          <label class="lb-check-row">
            <input type="checkbox" data-lb-setting="muted" ${lbState.settings.muted ? "checked" : ""}>
            <span><strong>Couper les sons</strong><br>Prépare le réglage pour les futurs sons de démarrage et d'interface.</span>
          </label>
        </div>
        <div class="lb-info-panel">
          Le contenu public est administré hors ligne par Leny. Aucun outil d'administration n'est accessible depuis le site.
        </div>
      </div>`;
  }

  function lbRenderAppContent(app) {
    let content = "";

    if (app.view === "videos") {
      content = lbRenderVideos(app);
    } else if (app.view === "youtube") {
      content = lbRenderYouTubePlayer();
    } else if (app.view === "downloads") {
      content = lbRenderDownloads(app);
    } else if (app.view === "consoles") {
      content = lbRenderConsoles(app);
    } else if (app.view === "console-detail") {
      content = lbRenderConsoleDetail();
    } else if (app.view === "games") {
      content = lbRenderGames(app);
    } else if (app.view === "game-player") {
      content = lbRenderGamePlayer();
    } else if (app.view === "gallery") {
      content = lbRenderGallery(app);
    } else if (app.view === "contact") {
      content = lbRenderContact();
    } else if (app.view === "about") {
      content = lbRenderAbout();
    } else if (app.view === "settings") {
      content = lbRenderSettings();
    } else if (app.view === "recycle") {
      content = lbRenderExplorer(app);
    } else {
      content = lbRenderExplorer(app);
    }

    return `
      <div class="lb-app-shell">
        <div class="lb-menubar" aria-hidden="true">
          <span>Fichier</span><span>Édition</span><span>Affichage</span><span>Aide</span>
        </div>
        <div class="lb-toolbar">
          <button class="lb-toolbar-button lb-classic-button" type="button" disabled>← Précédent</button>
          <button class="lb-toolbar-button lb-classic-button" type="button" data-lb-command="up" data-lb-current-app="${lbEscapeHtml(app.id)}">↑ Niveau supérieur</button>
          <button class="lb-toolbar-button lb-classic-button" type="button" data-lb-command="search">⌕ Rechercher</button>
        </div>
        <div class="lb-address-row">
          <span class="lb-address-label">Adresse :</span>
          <div class="lb-address-field">${lbEscapeHtml(app.address || app.title)}</div>
        </div>
        <div class="lb-content-pane">${content}</div>
        <div class="lb-statusbar">
          <span class="lb-status-field">${lbEscapeHtml(app.status || "Prêt")}</span>
          <span class="lb-status-field">La Bidouille OS</span>
        </div>
      </div>`;
  }

  function lbCreateDesktopIcons() {
    lbDesktopIcons.innerHTML = lbApps
      .filter((app) => app.desktop)
      .map((app) => `
        <button
          class="lb-icon"
          type="button"
          data-lb-desktop-app="${lbEscapeHtml(app.id)}"
          aria-label="Ouvrir ${lbEscapeHtml(app.title)}"
          aria-pressed="false"
        >
          ${lbIconMarkup(app.icon, "lb-icon-graphic", app.iconUrl || "")}
          <span class="lb-icon-label">${lbEscapeHtml(app.title)}</span>
        </button>`)
      .join("");
  }

  function lbRenderStartItem(item, nested = false) {
    const attrs = item.open
      ? `data-lb-start-open="${lbEscapeHtml(item.open)}"`
      : item.command
        ? `data-lb-start-command="${lbEscapeHtml(item.command)}"`
        : item.submenu
          ? "data-lb-submenu-toggle=\"true\" aria-haspopup=\"menu\" aria-expanded=\"false\""
          : "";

    const submenu = item.submenu
      ? `<ul class="lb-submenu" role="menu">
          ${item.submenu.map((child) => `<li>${lbRenderStartItem(child, true)}</li>`).join("")}
        </ul>`
      : "";

    const button = `
      <button class="lb-start-item" type="button" role="menuitem" ${attrs}>
        ${lbIconMarkup(item.icon, "lb-menu-icon")}
        <span class="lb-start-item-text">${lbEscapeHtml(item.label)}</span>
        ${item.submenu ? '<span class="lb-submenu-arrow" aria-hidden="true"></span>' : ""}
      </button>`;

    if (nested) {
      return button;
    }

    return `
      ${item.separatorBefore ? '<li class="lb-start-separator" role="separator"></li>' : ""}
      <li class="lb-start-item-wrap">
        ${button}
        ${submenu}
      </li>`;
  }

  function lbCreateStartMenu() {
    lbStartMenu.innerHTML = `
      <div class="lb-start-brand" aria-hidden="true">LA BIDOUILLE <span>OS</span></div>
      <ul class="lb-start-items" role="menu" aria-label="Menu Démarrer">
        ${lbStartItems.map((item) => lbRenderStartItem(item)).join("")}
      </ul>`;
  }

  function lbWindowMarkup(app) {
    const titleId = `lb-window-title-${app.id}`;
    return `
      <div class="lb-window-titlebar" data-lb-drag-handle="true">
        ${lbIconMarkup(app.icon, "lb-title-icon", app.iconUrl || "")}
        <span class="lb-title-text" id="${titleId}">${lbEscapeHtml(app.title)}</span>
        <div class="lb-window-controls">
          <button class="lb-window-control lb-control-minimize" type="button" data-lb-window-action="minimize" aria-label="Réduire ${lbEscapeHtml(app.title)}" title="Réduire"></button>
          <button class="lb-window-control lb-control-maximize" type="button" data-lb-window-action="maximize" aria-label="Agrandir ${lbEscapeHtml(app.title)}" title="Agrandir"></button>
          <button class="lb-window-control lb-control-close" type="button" data-lb-window-action="close" aria-label="Fermer ${lbEscapeHtml(app.title)}" title="Fermer"></button>
        </div>
      </div>
      <div class="lb-window-body">${lbRenderAppContent(app)}</div>`;
  }

  function lbCreateTaskButton(app) {
    const taskButton = document.createElement("button");
    taskButton.type = "button";
    taskButton.className = "lb-task-button lb-bevel-raised";
    taskButton.dataset.lbTaskApp = app.id;
    taskButton.setAttribute("aria-label", `Afficher ${app.title}`);
    taskButton.setAttribute("aria-pressed", "false");
    taskButton.innerHTML = `
      ${lbIconMarkup(app.icon, "lb-task-icon", app.iconUrl || "")}
      <span class="lb-task-label">${lbEscapeHtml(app.title)}</span>`;
    lbTaskButtons.appendChild(taskButton);
    return taskButton;
  }

  function lbGetInitialGeometry(app) {
    const layerWidth = Math.max(300, lbWindowLayer.clientWidth);
    const layerHeight = Math.max(220, lbWindowLayer.clientHeight);
    const mobile = lbIsMobileLayout();
    const width = mobile ? layerWidth - 8 : Math.min(app.width || 760, layerWidth - 20);
    const height = mobile ? layerHeight - 8 : Math.min(app.height || 520, layerHeight - 20);
    const cascade = lbState.cascadeIndex % 8;
    lbState.cascadeIndex += 1;

    return {
      width: Math.max(mobile ? 260 : 300, width),
      height: Math.max(mobile ? 200 : 220, height),
      left: mobile ? 4 : Math.max(8, Math.min(64 + cascade * 28, layerWidth - width - 8)),
      top: mobile ? 4 : Math.max(8, Math.min(38 + cascade * 24, layerHeight - height - 8))
    };
  }

  function lbApplyGeometry(element, geometry) {
    element.style.left = `${Math.round(geometry.left)}px`;
    element.style.top = `${Math.round(geometry.top)}px`;
    element.style.width = `${Math.round(geometry.width)}px`;
    element.style.height = `${Math.round(geometry.height)}px`;
  }

  function lbOpenWindow(appId) {
    const app = lbAppMap.get(appId);
    if (!app) {
      lbShowDialog({
        title: "Erreur",
        type: "erreur",
        message: "Cette application est introuvable dans La Bidouille OS.",
        buttons: [{ label: "Fermer", value: "close", primary: true }]
      });
      return null;
    }

    const existing = lbState.windows.get(appId);
    if (existing) {
      if (existing.closing) {
        window.clearTimeout(existing.closeTimer);
        existing.closing = false;
        existing.element.classList.remove("lb-is-closing");
        existing.taskButton.disabled = false;
      }
      if (existing.minimized) {
        lbRestoreWindow(appId);
      } else {
        lbFocusWindow(appId);
      }
      return existing.element;
    }

    const windowElement = document.createElement("section");
    const geometry = lbGetInitialGeometry(app);
    windowElement.className = "lb-window lb-is-opening";
    windowElement.dataset.lbWindowId = app.id;
    windowElement.setAttribute("role", "region");
    windowElement.setAttribute("aria-labelledby", `lb-window-title-${app.id}`);
    windowElement.innerHTML = lbWindowMarkup(app);
    lbApplyGeometry(windowElement, geometry);

    const taskButton = lbCreateTaskButton(app);
    const windowRecord = {
      app,
      element: windowElement,
      taskButton,
      minimized: false,
      maximized: false,
      closing: false,
      savedGeometry: null,
      closeTimer: null
    };

    lbState.windows.set(app.id, windowRecord);
    lbWindowLayer.appendChild(windowElement);
    lbBindWindowDragging(windowRecord);
    lbFocusWindow(app.id);

    window.setTimeout(() => {
      windowElement.classList.remove("lb-is-opening");
    }, LB_CONFIG.openingDuration);

    lbAnnounce(`${app.title} est ouvert.`);
    return windowElement;
  }

  function lbRefreshWindow(appId, displayTitle = "") {
    const record = lbState.windows.get(appId);
    if (!record) return;

    const body = record.element.querySelector(".lb-window-body");
    if (body) body.innerHTML = lbRenderAppContent(record.app);

    const title = displayTitle || record.app.title;
    const titleText = record.element.querySelector(".lb-title-text");
    const taskLabel = record.taskButton.querySelector(".lb-task-label");
    if (titleText) titleText.textContent = title;
    if (taskLabel) taskLabel.textContent = title;
    record.taskButton.setAttribute("aria-label", `Afficher ${title}`);
  }

  function lbOpenRuntimeWindow(appId, displayTitle) {
    lbOpenWindow(appId);
    lbRefreshWindow(appId, displayTitle);
    lbFocusWindow(appId);
  }

  function lbFocusWindow(appId) {
    const record = lbState.windows.get(appId);
    if (!record || record.minimized || record.closing) {
      return;
    }

    lbState.zIndex += 1;
    record.element.style.zIndex = String(lbState.zIndex);
    lbState.activeWindowId = appId;

    lbState.windows.forEach((item, id) => {
      const active = id === appId && !item.minimized;
      item.element.classList.toggle("lb-is-active", active);
      item.taskButton.classList.toggle("lb-is-active", active);
      item.taskButton.setAttribute("aria-pressed", String(active));
    });
  }

  function lbFocusTopVisibleWindow() {
    const visible = [...lbState.windows.entries()]
      .filter(([, record]) => !record.minimized && !record.closing)
      .sort((a, b) => Number(b[1].element.style.zIndex || 0) - Number(a[1].element.style.zIndex || 0));

    if (visible.length) {
      lbFocusWindow(visible[0][0]);
    } else {
      lbState.activeWindowId = null;
      lbState.windows.forEach((record) => {
        record.element.classList.remove("lb-is-active");
        record.taskButton.classList.remove("lb-is-active");
        record.taskButton.setAttribute("aria-pressed", "false");
      });
    }
  }

  function lbCloseWindow(appId) {
    const record = lbState.windows.get(appId);
    if (!record || record.closing) {
      return;
    }

    record.closing = true;
    record.element.hidden = false;
    record.element.classList.remove("lb-is-minimizing", "lb-is-opening");
    record.element.classList.add("lb-is-closing");
    record.taskButton.disabled = true;

    record.closeTimer = window.setTimeout(() => {
      record.element.remove();
      record.taskButton.remove();
      lbState.windows.delete(appId);
      if (lbState.activeWindowId === appId) {
        lbState.activeWindowId = null;
      }
      lbFocusTopVisibleWindow();
      lbAnnounce(`${record.app.title} est fermé.`);
    }, LB_CONFIG.closingDuration);
  }

  function lbMinimizeWindow(appId) {
    const record = lbState.windows.get(appId);
    if (!record || record.minimized || record.closing) {
      return;
    }

    record.minimized = true;
    record.element.classList.remove("lb-is-active", "lb-is-opening");
    record.element.classList.add("lb-is-minimizing");
    record.taskButton.classList.remove("lb-is-active");
    record.taskButton.setAttribute("aria-pressed", "false");

    window.setTimeout(() => {
      if (!record.minimized || record.closing) {
        return;
      }
      record.element.hidden = true;
      record.element.classList.remove("lb-is-minimizing");
    }, 135);

    if (lbState.activeWindowId === appId) {
      lbState.activeWindowId = null;
      lbFocusTopVisibleWindow();
    }
    lbAnnounce(`${record.app.title} est réduit.`);
  }

  function lbRestoreWindow(appId) {
    const record = lbState.windows.get(appId);
    if (!record || record.closing) {
      return;
    }

    record.minimized = false;
    record.element.hidden = false;
    record.element.classList.remove("lb-is-minimizing", "lb-is-closing");
    record.element.classList.add("lb-is-opening");
    window.setTimeout(() => record.element.classList.remove("lb-is-opening"), LB_CONFIG.openingDuration);
    lbFocusWindow(appId);
    lbAnnounce(`${record.app.title} est restauré.`);
  }

  function lbSetMaximizeButton(record) {
    const button = record.element.querySelector('[data-lb-window-action="maximize"]');
    if (!button) {
      return;
    }

    button.classList.toggle("lb-is-restore", record.maximized);
    button.setAttribute("aria-label", `${record.maximized ? "Restaurer" : "Agrandir"} ${record.app.title}`);
    button.title = record.maximized ? "Restaurer" : "Agrandir";
  }

  function lbToggleMaximizeWindow(appId) {
    const record = lbState.windows.get(appId);
    if (!record || record.closing) {
      return;
    }

    if (record.minimized) {
      lbRestoreWindow(appId);
    }

    if (record.maximized) {
      record.maximized = false;
      record.element.classList.remove("lb-is-maximized");
      if (record.savedGeometry) {
        lbApplyGeometry(record.element, record.savedGeometry);
      }
      record.savedGeometry = null;
      lbAnnounce(`${record.app.title} retrouve sa taille précédente.`);
    } else {
      record.savedGeometry = {
        left: record.element.offsetLeft,
        top: record.element.offsetTop,
        width: record.element.offsetWidth,
        height: record.element.offsetHeight
      };
      record.maximized = true;
      record.element.classList.add("lb-is-maximized");
      lbApplyGeometry(record.element, {
        left: 0,
        top: 0,
        width: lbWindowLayer.clientWidth,
        height: lbWindowLayer.clientHeight
      });
      lbAnnounce(`${record.app.title} est agrandi.`);
    }

    lbSetMaximizeButton(record);
    lbFocusWindow(appId);
  }

  function lbClampWindow(record) {
    if (record.maximized) {
      lbApplyGeometry(record.element, {
        left: 0,
        top: 0,
        width: lbWindowLayer.clientWidth,
        height: lbWindowLayer.clientHeight
      });
      return;
    }

    if (lbIsMobileLayout()) {
      return;
    }

    const width = Math.min(record.element.offsetWidth, Math.max(300, lbWindowLayer.clientWidth - 8));
    const height = Math.min(record.element.offsetHeight, Math.max(220, lbWindowLayer.clientHeight - 8));
    const titleVisible = Math.min(130, width);
    const minLeft = -width + titleVisible;
    const maxLeft = lbWindowLayer.clientWidth - titleVisible;
    const maxTop = Math.max(0, lbWindowLayer.clientHeight - 25);
    const left = Math.min(Math.max(record.element.offsetLeft, minLeft), maxLeft);
    const top = Math.min(Math.max(record.element.offsetTop, 0), maxTop);

    lbApplyGeometry(record.element, { left, top, width, height });
  }

  function lbBindWindowDragging(record) {
    const titlebar = record.element.querySelector(".lb-window-titlebar");
    if (!titlebar) {
      return;
    }

    let drag = null;

    titlebar.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || record.maximized || lbIsMobileLayout() || event.target.closest(".lb-window-controls")) {
        return;
      }

      lbFocusWindow(record.app.id);
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: record.element.offsetLeft,
        startTop: record.element.offsetTop
      };
      titlebar.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    titlebar.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      const width = record.element.offsetWidth;
      const titleVisible = Math.min(130, width);
      const minLeft = -width + titleVisible;
      const maxLeft = lbWindowLayer.clientWidth - titleVisible;
      const maxTop = Math.max(0, lbWindowLayer.clientHeight - 25);
      const left = Math.min(Math.max(drag.startLeft + event.clientX - drag.startX, minLeft), maxLeft);
      const top = Math.min(Math.max(drag.startTop + event.clientY - drag.startY, 0), maxTop);

      record.element.style.left = `${Math.round(left)}px`;
      record.element.style.top = `${Math.round(top)}px`;
      event.preventDefault();
    });

    const stopDragging = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }
      if (titlebar.hasPointerCapture(event.pointerId)) {
        titlebar.releasePointerCapture(event.pointerId);
      }
      drag = null;
    };

    titlebar.addEventListener("pointerup", stopDragging);
    titlebar.addEventListener("pointercancel", stopDragging);
    titlebar.addEventListener("dblclick", (event) => {
      if (!event.target.closest(".lb-window-controls") && !lbIsMobileLayout()) {
        lbToggleMaximizeWindow(record.app.id);
      }
    });
  }

  function lbCenterDialog(dialogElement) {
    const width = dialogElement.offsetWidth;
    const height = dialogElement.offsetHeight;
    dialogElement.style.left = `${Math.max(4, Math.round((lbWindowLayer.clientWidth - width) / 2))}px`;
    dialogElement.style.top = `${Math.max(4, Math.round((lbWindowLayer.clientHeight - height) / 2))}px`;
  }

  function lbBindDialogDragging(dialogElement) {
    const titlebar = dialogElement.querySelector(".lb-window-titlebar");
    let drag = null;

    if (!titlebar) {
      return;
    }

    titlebar.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || lbIsMobileLayout() || event.target.closest(".lb-window-controls")) {
        return;
      }

      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: dialogElement.offsetLeft,
        startTop: dialogElement.offsetTop
      };
      titlebar.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    titlebar.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }
      const width = dialogElement.offsetWidth;
      const height = dialogElement.offsetHeight;
      const left = Math.min(Math.max(drag.startLeft + event.clientX - drag.startX, -width + 120), lbWindowLayer.clientWidth - 120);
      const top = Math.min(Math.max(drag.startTop + event.clientY - drag.startY, 0), lbWindowLayer.clientHeight - Math.min(25, height));
      dialogElement.style.left = `${Math.round(left)}px`;
      dialogElement.style.top = `${Math.round(top)}px`;
      event.preventDefault();
    });

    const stop = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }
      if (titlebar.hasPointerCapture(event.pointerId)) {
        titlebar.releasePointerCapture(event.pointerId);
      }
      drag = null;
    };

    titlebar.addEventListener("pointerup", stop);
    titlebar.addEventListener("pointercancel", stop);
  }

  function lbShowDialog(options = {}) {
    if (lbState.dialog) {
      lbCloseDialog("replace", true);
    }

    lbToggleStartMenu(false);
    lbState.dialogCounter += 1;

    const dialogId = `lb-dialog-${lbState.dialogCounter}`;
    const title = options.title || "Information";
    const type = options.type || "information";
    const symbol = type === "erreur" ? "×" : type === "attention" ? "!" : type === "confirmation" ? "?" : "i";
    const buttons = options.buttons?.length
      ? options.buttons
      : [{ label: "OK", value: "ok", primary: true }];
    const shade = document.createElement("div");
    const dialog = document.createElement("section");

    shade.className = "lb-modal-shade";
    shade.dataset.lbDialogShade = dialogId;
    dialog.className = "lb-dialog-window lb-is-active lb-is-opening";
    dialog.dataset.lbDialogId = dialogId;
    dialog.setAttribute("role", type === "erreur" || type === "attention" ? "alertdialog" : "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", `${dialogId}-title`);
    dialog.setAttribute("aria-describedby", `${dialogId}-message`);
    dialog.innerHTML = `
      <div class="lb-window-titlebar" data-lb-drag-handle="true">
        ${lbIconMarkup(type === "erreur" ? "shutdown" : type === "attention" ? "help" : "info", "lb-title-icon")}
        <span class="lb-title-text" id="${dialogId}-title">${lbEscapeHtml(title)}</span>
        <div class="lb-window-controls">
          <button class="lb-window-control lb-control-close" type="button" data-lb-dialog-action="cancel" aria-label="Fermer" title="Fermer"></button>
        </div>
      </div>
      <div class="lb-dialog-content">
        <span class="lb-dialog-symbol" data-type="${lbEscapeHtml(type)}" aria-hidden="true">${symbol}</span>
        <div class="lb-dialog-message" id="${dialogId}-message">
          ${options.html || `<p>${lbEscapeHtml(options.message || "")}</p>`}
        </div>
      </div>
      <div class="lb-dialog-actions">
        ${buttons.map((button) => `
          <button
            class="lb-classic-button"
            type="button"
            data-lb-dialog-action="${lbEscapeHtml(button.value)}"
            ${button.primary ? 'data-lb-primary="true"' : ""}
          >${lbEscapeHtml(button.label)}</button>`).join("")}
      </div>`;

    lbWindowLayer.append(shade, dialog);
    lbState.zIndex += 2;
    shade.style.zIndex = String(lbState.zIndex);
    dialog.style.zIndex = String(lbState.zIndex + 1);

    lbState.dialog = {
      id: dialogId,
      element: dialog,
      shade,
      options,
      resolve: null,
      closing: false
    };

    lbBindDialogDragging(dialog);
    lbCenterDialog(dialog);
    window.setTimeout(() => dialog.classList.remove("lb-is-opening"), LB_CONFIG.openingDuration);

    window.requestAnimationFrame(() => {
      const focusTarget = dialog.querySelector("input, textarea, select, [data-lb-primary='true'], .lb-dialog-actions button");
      focusTarget?.focus();
    });

    return new Promise((resolve) => {
      if (lbState.dialog?.id === dialogId) {
        lbState.dialog.resolve = resolve;
      } else {
        resolve("replace");
      }
    });
  }

  function lbCloseDialog(value = "cancel", immediate = false) {
    const current = lbState.dialog;
    if (!current || current.closing) {
      return;
    }

    current.closing = true;
    const finish = () => {
      current.element.remove();
      current.shade.remove();
      if (lbState.dialog?.id === current.id) {
        lbState.dialog = null;
      }
      current.resolve?.(value);
    };

    if (immediate) {
      finish();
      return;
    }

    current.element.classList.add("lb-is-closing");
    window.setTimeout(finish, LB_CONFIG.closingDuration);
  }

  function lbHandleDialogAction(action) {
    const current = lbState.dialog;
    if (!current) {
      return;
    }

    if (typeof current.options.onAction === "function") {
      const shouldClose = current.options.onAction(action, current.element);
      if (shouldClose === false) {
        return;
      }
    }

    lbCloseDialog(action);
  }

  function lbOpenSearchDialog() {
    lbShowDialog({
      title: "Rechercher",
      type: "information",
      html: `
        <p>Recherche une rubrique de La Bidouille OS :</p>
        <label class="lb-visually-hidden" for="lb-search-input">Texte à rechercher</label>
        <input id="lb-search-input" class="lb-classic-input" type="search" autocomplete="off" placeholder="Exemple : réparation">
        <div id="lb-search-results" style="margin-top:8px;max-height:160px;overflow:auto"></div>`,
      buttons: [
        { label: "Rechercher", value: "search", primary: true },
        { label: "Annuler", value: "cancel" }
      ],
      onAction(action, dialog) {
        if (action !== "search") {
          return true;
        }

        const input = dialog.querySelector("#lb-search-input");
        const results = dialog.querySelector("#lb-search-results");
        const query = lbNormalizeText(input?.value || "");
        const matches = query
          ? lbApps.filter((app) => {
              if (["lecteur-video", "fiche-console", "lecteur-jeu"].includes(app.id)) return false;
              let managedCorpus = "";
              if (app.videoGroup) managedCorpus = JSON.stringify(lbContent.videos?.[app.videoGroup] || []);
              if (app.view === "downloads") managedCorpus = JSON.stringify(lbFilteredDownloads(app));
              if (app.view === "gallery") managedCorpus = JSON.stringify(lbContent.gallery || []);
              if (app.view === "games") managedCorpus = JSON.stringify(lbContent.games || []);
              if (app.view === "consoles") managedCorpus = JSON.stringify(lbContent.consoles || []);
              const appCorpus = `${app.title} ${app.intro || ""} ${(app.entries || []).map((entry) => `${entry.title} ${entry.detail || ""}`).join(" ")} ${managedCorpus}`;
              return lbNormalizeText(appCorpus).includes(query);
            })
          : [];

        results.innerHTML = matches.length
          ? matches.map((app) => `
              <button type="button" class="lb-classic-button" style="width:100%;margin:2px 0;text-align:left" data-lb-dialog-open="${lbEscapeHtml(app.id)}">
                ${lbEscapeHtml(app.title)}
              </button>`).join("")
          : `<p>${query ? "Aucun résultat." : "Saisis un mot à rechercher."}</p>`;
        return false;
      }
    });
  }

  function lbOpenRunDialog() {
    lbShowDialog({
      title: "Exécuter",
      type: "information",
      html: `
        <p>Tape le nom d'une rubrique, puis clique sur <strong>OK</strong>.</p>
        <label for="lb-run-input">Ouvrir :</label>
        <input id="lb-run-input" class="lb-classic-input" autocomplete="off" placeholder="tutoriels">
        <p class="lb-run-error" role="status" style="min-height:16px;color:#800000"></p>`,
      buttons: [
        { label: "OK", value: "run", primary: true },
        { label: "Annuler", value: "cancel" }
      ],
      onAction(action, dialog) {
        if (action !== "run") {
          return true;
        }

        const input = dialog.querySelector("#lb-run-input");
        const error = dialog.querySelector(".lb-run-error");
        const query = lbNormalizeText(input?.value || "");
        const app = lbApps.find((item) => lbNormalizeText(item.id) === query || lbNormalizeText(item.title) === query);
        if (!app) {
          error.textContent = "Programme introuvable. Exemple : tutoriels";
          input?.focus();
          return false;
        }

        window.setTimeout(() => lbOpenWindow(app.id), LB_CONFIG.closingDuration + 10);
        return true;
      }
    });
  }

  function lbOpenHelpDialog() {
    lbShowDialog({
      title: "Aide de La Bidouille OS",
      type: "information",
      html: `
        <p><strong>Souris :</strong> un clic sélectionne une icône, un double-clic l'ouvre.</p>
        <p><strong>Tactile :</strong> un toucher ouvre directement l'icône.</p>
        <p><strong>Fenêtres :</strong> utilise la barre de titre pour déplacer, et les trois boutons pour réduire, agrandir ou fermer.</p>
        <p><strong>Clavier :</strong> Entrée ouvre un raccourci, Échap ferme un menu ou une boîte de dialogue, Alt + F4 ferme la fenêtre active.</p>`,
      buttons: [{ label: "OK", value: "ok", primary: true }]
    });
  }

  function lbOpenShutdownDialog() {
    lbShowDialog({
      title: "Arrêter La Bidouille OS",
      type: "confirmation",
      message: "Voulez-vous vraiment arrêter La Bidouille OS ?",
      buttons: [
        { label: "Oui", value: "yes", primary: true },
        { label: "Non", value: "no" }
      ]
    }).then((answer) => {
      if (answer !== "yes") {
        return;
      }
      lbShowDialog({
        title: "La Bidouille OS",
        type: "information",
        message: "Vous pouvez maintenant fermer cet onglet en toute sécurité.",
        buttons: [{ label: "Redémarrer", value: "restart", primary: true }]
      });
    });
  }

  function lbOpenEntry(appId, index) {
    const app = lbAppMap.get(appId);
    const entry = app?.entries?.[Number(index)];
    if (!app || !entry) {
      return;
    }

    if (entry.open) {
      lbOpenWindow(entry.open);
      return;
    }

    if (app.view === "gallery" && entry.image) {
      lbShowDialog({
        title: entry.title || "Photo de la galerie",
        type: "information",
        html: `
          <figure class="lb-gallery-dialog">
            ${lbRenderMediaImage(entry.image, entry.title || "Photo de la galerie", "PHOTO")}
            <figcaption>${lbEscapeHtml(entry.caption || entry.album || "Galerie de l'atelier")}</figcaption>
          </figure>`,
        buttons: [{ label: "Fermer", value: "close", primary: true }]
      });
      return;
    }

    const message = entry.detail || `${entry.title} — ${entry.meta || "Élément de la galerie"}.`;
    lbShowDialog({
      title: entry.title,
      type: "information",
      message,
      buttons: [{ label: "Fermer", value: "close", primary: true }]
    });
  }

  function lbFilterConsoleCards(control) {
    const contentPane = control.closest(".lb-content-pane");
    if (!contentPane) return;
    const query = lbNormalizeText(contentPane.querySelector("[data-lb-console-search]")?.value || "");
    const generation = contentPane.querySelector("[data-lb-console-generation]")?.value || "";
    let visible = 0;

    contentPane.querySelectorAll("[data-lb-console-card]").forEach((card) => {
      const matchesText = !query || card.dataset.lbConsoleSearchable.includes(query);
      const matchesGeneration = !generation || card.dataset.lbConsoleGenerationValue === generation;
      const show = matchesText && matchesGeneration;
      card.hidden = !show;
      if (show) visible += 1;
    });

    const count = contentPane.querySelector("[data-lb-console-count]");
    if (count) count.textContent = `${visible} console(s) affichée(s)`;
  }

  function lbSelectDesktopIcon(appId) {
    lbState.selectedIconId = appId;
    lbDesktopIcons.querySelectorAll("[data-lb-desktop-app]").forEach((icon) => {
      const selected = icon.dataset.lbDesktopApp === appId;
      icon.classList.toggle("lb-is-selected", selected);
      icon.setAttribute("aria-pressed", String(selected));
    });
  }

  function lbClearDesktopSelection() {
    lbState.selectedIconId = null;
    lbDesktopIcons.querySelectorAll("[data-lb-desktop-app]").forEach((icon) => {
      icon.classList.remove("lb-is-selected");
      icon.setAttribute("aria-pressed", "false");
    });
  }

  function lbToggleStartMenu(force, focusFirstItem = false) {
    const shouldOpen = typeof force === "boolean" ? force : !lbState.startMenuOpen;
    lbState.startMenuOpen = shouldOpen;
    lbStartMenu.hidden = !shouldOpen;
    lbStartButton.classList.toggle("lb-is-pressed", shouldOpen);
    lbStartButton.setAttribute("aria-expanded", String(shouldOpen));

    if (shouldOpen) {
      lbState.windows.forEach((record) => record.element.classList.remove("lb-is-active"));
      if (focusFirstItem) {
        window.requestAnimationFrame(() => {
          lbStartMenu.querySelector(".lb-start-item")?.focus();
        });
      }
    } else {
      lbStartMenu.querySelectorAll(".lb-has-open-submenu").forEach((item) => item.classList.remove("lb-has-open-submenu"));
      lbStartMenu.querySelectorAll("[data-lb-submenu-toggle]").forEach((button) => {
        button.classList.remove("lb-submenu-open");
        button.setAttribute("aria-expanded", "false");
      });
      if (lbState.activeWindowId) {
        lbState.windows.get(lbState.activeWindowId)?.element.classList.add("lb-is-active");
      }
    }
  }

  function lbHandleStartCommand(command) {
    lbToggleStartMenu(false);
    if (command === "search") {
      lbOpenSearchDialog();
    } else if (command === "help") {
      lbOpenHelpDialog();
    } else if (command === "run") {
      lbOpenRunDialog();
    } else if (command === "shutdown") {
      lbOpenShutdownDialog();
    }
  }

  function lbShowNotification(message) {
    window.clearTimeout(lbState.notificationTimer);
    lbContextLayer.querySelector(".lb-tray-notification")?.remove();
    const notification = document.createElement("div");
    notification.className = "lb-tray-notification";
    notification.textContent = message;
    lbContextLayer.appendChild(notification);
    lbAnnounce(message);
    lbState.notificationTimer = window.setTimeout(() => notification.remove(), 1900);
  }

  function lbApplySettings() {
    lbRoot.classList.toggle("lb-crt-disabled", lbState.settings.crtMode === "off");
    lbRoot.classList.toggle("lb-crt-soft", lbState.settings.crtMode === "soft");
    lbRoot.classList.toggle("lb-crt-pixels", lbState.settings.crtMode === "pixels");
    lbRoot.classList.toggle("lb-reduced-motion", lbState.settings.reducedMotion);
    lbVolumeButton.setAttribute("aria-pressed", String(lbState.settings.muted));
    lbVolumeButton.setAttribute("aria-label", lbState.settings.muted ? "Rétablir le son" : "Couper le son");
    lbVolumeButton.title = lbState.settings.muted ? "Son coupé" : "Volume";

    lbState.windows.get("parametres")?.element.querySelectorAll("[data-lb-setting]").forEach((input) => {
      input.checked = Boolean(lbState.settings[input.dataset.lbSetting]);
    });
    lbState.windows.get("parametres")?.element.querySelectorAll("[data-lb-crt-mode]").forEach((input) => {
      input.checked = input.value === lbState.settings.crtMode;
    });
  }

  function lbUpdateClock() {
    const now = new Date();
    const time = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(now);
    const date = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(now);

    lbClock.textContent = time;
    lbClock.dateTime = now.toISOString();
    lbClock.title = date;
    lbClock.setAttribute("aria-label", `${date}, ${time}`);
  }

  function lbHandleContactSubmit(form) {
    if (!form.reportValidity()) {
      return;
    }

    const data = new FormData(form);
    const name = String(data.get("name") || "");
    const email = String(data.get("email") || "");
    const subject = String(data.get("subject") || "Question depuis La Bidouille OS");
    const message = String(data.get("message") || "");
    const body = `Bonjour La Bidouille,\n\n${message}\n\n— ${name}\n${email}`;
    const contactEmail = String(lbContent.site?.contactEmail || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      lbShowDialog({
        title: "Adresse non configurée",
        type: "attention",
        message: "L'adresse de contact n'est pas encore disponible. Réessaie un peu plus tard.",
        buttons: [{ label: "Fermer", value: "close", primary: true }]
      });
      return;
    }
    const mailto = `mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
    lbShowNotification("Le message a été préparé dans votre messagerie.");
  }

  function lbHandleRootClick(event) {
    const windowControl = event.target.closest("[data-lb-window-action]");
    if (windowControl) {
      const windowElement = windowControl.closest("[data-lb-window-id]");
      const appId = windowElement?.dataset.lbWindowId;
      const action = windowControl.dataset.lbWindowAction;
      if (appId && action === "close") lbCloseWindow(appId);
      if (appId && action === "minimize") lbMinimizeWindow(appId);
      if (appId && action === "maximize") lbToggleMaximizeWindow(appId);
      return;
    }

    const dialogAction = event.target.closest("[data-lb-dialog-action]");
    if (dialogAction) {
      lbHandleDialogAction(dialogAction.dataset.lbDialogAction);
      return;
    }

    const dialogOpen = event.target.closest("[data-lb-dialog-open]");
    if (dialogOpen) {
      const appId = dialogOpen.dataset.lbDialogOpen;
      lbCloseDialog("open");
      window.setTimeout(() => lbOpenWindow(appId), LB_CONFIG.closingDuration + 10);
      return;
    }

    const taskButton = event.target.closest("[data-lb-task-app]");
    if (taskButton) {
      const appId = taskButton.dataset.lbTaskApp;
      const record = lbState.windows.get(appId);
      if (!record) return;
      if (record.minimized) lbRestoreWindow(appId);
      else if (lbState.activeWindowId === appId) lbMinimizeWindow(appId);
      else lbFocusWindow(appId);
      return;
    }

    const desktopIcon = event.target.closest("[data-lb-desktop-app]");
    if (desktopIcon) {
      const appId = desktopIcon.dataset.lbDesktopApp;
      lbSelectDesktopIcon(appId);
      const keyboardClick = event.detail === 0;
      const touchLayout = lbIsMobileLayout() || window.matchMedia("(hover: none), (pointer: coarse)").matches;
      if (keyboardClick || touchLayout) {
        lbOpenWindow(appId);
      }
      return;
    }

    const videoButton = event.target.closest("[data-lb-video-index]");
    if (videoButton) {
      const group = videoButton.dataset.lbVideoGroup;
      const video = lbContent.videos?.[group]?.[Number(videoButton.dataset.lbVideoIndex)];
      if (!video) return;
      lbState.currentVideo = video;
      lbOpenRuntimeWindow("lecteur-video", video.title || "Lecteur vidéo");
      return;
    }

    const consoleButton = event.target.closest("[data-lb-console-index]");
    if (consoleButton) {
      const consoleItem = lbContent.consoles?.[Number(consoleButton.dataset.lbConsoleIndex)];
      if (!consoleItem) return;
      lbState.currentConsole = consoleItem;
      lbOpenRuntimeWindow("fiche-console", consoleItem.name || "Fiche console");
      return;
    }

    const gameButton = event.target.closest("[data-lb-game-index]");
    if (gameButton && !gameButton.disabled) {
      const game = lbContent.games?.[Number(gameButton.dataset.lbGameIndex)];
      if (!game) return;
      lbState.currentGame = game;
      lbOpenRuntimeWindow("lecteur-jeu", game.title || "Mini-jeu");
      return;
    }

    const entry = event.target.closest("[data-lb-entry-index]");
    if (entry) {
      lbOpenEntry(entry.dataset.lbAppId, entry.dataset.lbEntryIndex);
      return;
    }

    const startOpen = event.target.closest("[data-lb-start-open]");
    if (startOpen) {
      const appId = startOpen.dataset.lbStartOpen;
      lbToggleStartMenu(false);
      lbOpenWindow(appId);
      return;
    }

    const startCommand = event.target.closest("[data-lb-start-command]");
    if (startCommand) {
      lbHandleStartCommand(startCommand.dataset.lbStartCommand);
      return;
    }

    const submenuToggle = event.target.closest("[data-lb-submenu-toggle]");
    if (submenuToggle) {
      const wrapper = submenuToggle.closest(".lb-start-item-wrap");
      const open = !wrapper.classList.contains("lb-has-open-submenu");
      lbStartMenu.querySelectorAll(".lb-has-open-submenu").forEach((item) => {
        if (item !== wrapper) item.classList.remove("lb-has-open-submenu");
      });
      wrapper.classList.toggle("lb-has-open-submenu", open);
      submenuToggle.classList.toggle("lb-submenu-open", open);
      submenuToggle.setAttribute("aria-expanded", String(open));
      return;
    }

    const command = event.target.closest("[data-lb-command]");
    if (command) {
      if (command.dataset.lbCommand === "search") {
        lbOpenSearchDialog();
      } else if (command.dataset.lbCommand === "up") {
        const current = command.dataset.lbCurrentApp;
        if (current !== "poste-de-travail") {
          lbOpenWindow("poste-de-travail");
        } else {
          lbShowNotification("Vous êtes déjà au niveau le plus élevé.");
        }
      }
    }
  }

  function lbHandleDocumentPointerDown(event) {
    if (lbState.startMenuOpen && !event.target.closest("#lb-start-menu") && !event.target.closest("#lb-start-button")) {
      lbToggleStartMenu(false);
    }

    const windowElement = event.target.closest("[data-lb-window-id]");
    if (windowElement) {
      lbFocusWindow(windowElement.dataset.lbWindowId);
      return;
    }

    if (event.target === lbDesktop || event.target === lbDesktopIcons || event.target === lbWindowLayer) {
      lbClearDesktopSelection();
    }
  }

  function lbHandleKeyDown(event) {
    if (event.key === "Escape") {
      if (lbState.dialog) {
        lbCloseDialog("cancel");
        return;
      }
      if (lbState.startMenuOpen) {
        lbToggleStartMenu(false);
        lbStartButton.focus();
        return;
      }
      lbClearDesktopSelection();
    }

    if (event.altKey && event.key === "F4" && lbState.activeWindowId && !lbState.dialog) {
      event.preventDefault();
      lbCloseWindow(lbState.activeWindowId);
    }

    if (event.key === "Enter" && lbState.dialog) {
      const active = document.activeElement;
      if (active?.matches("input") && active.id === "lb-search-input") {
        event.preventDefault();
        lbState.dialog.element.querySelector('[data-lb-dialog-action="search"]')?.click();
      } else if (active?.matches("input") && active.id === "lb-run-input") {
        event.preventDefault();
        lbState.dialog.element.querySelector('[data-lb-dialog-action="run"]')?.click();
      }
    }
  }

  function lbHandleResize() {
    lbState.windows.forEach(lbClampWindow);
    if (lbState.dialog) {
      lbCenterDialog(lbState.dialog.element);
    }
  }

  function lbInitialize() {
    if (LB_CONFIG.wallpaperUrl) {
      lbDesktop.style.setProperty("--lb-wallpaper-image", `url(${JSON.stringify(LB_CONFIG.wallpaperUrl)})`);
    }

    lbState.settings.crtMode = lbGetStoredString("crt-mode", lbGetStoredBoolean("crt", true) ? "pixels" : "off");
    if (!["pixels", "soft", "off"].includes(lbState.settings.crtMode)) lbState.settings.crtMode = "pixels";
    lbState.settings.reducedMotion = lbGetStoredBoolean("reduced-motion", false);
    lbState.settings.muted = lbGetStoredBoolean("muted", false);

    lbCreateDesktopIcons();
    lbCreateStartMenu();
    lbApplySettings();
    lbUpdateClock();

    lbStartButton.addEventListener("click", (event) => {
      event.stopPropagation();
      lbToggleStartMenu(undefined, event.detail === 0);
    });

    lbVolumeButton.addEventListener("click", () => {
      lbState.settings.muted = !lbState.settings.muted;
      lbStoreBoolean("muted", lbState.settings.muted);
      lbApplySettings();
      lbShowNotification(lbState.settings.muted ? "Son coupé" : "Son rétabli");
    });

    lbDesktopIcons.addEventListener("dblclick", (event) => {
      const icon = event.target.closest("[data-lb-desktop-app]");
      if (icon && !lbIsMobileLayout() && !window.matchMedia("(hover: none), (pointer: coarse)").matches) {
        lbOpenWindow(icon.dataset.lbDesktopApp);
      }
    });

    lbRoot.addEventListener("click", lbHandleRootClick);
    lbRoot.addEventListener("change", (event) => {
      const crtMode = event.target.closest("[data-lb-crt-mode]");
      if (crtMode) {
        lbState.settings.crtMode = crtMode.value;
        lbStoreString("crt-mode", crtMode.value);
        lbApplySettings();
        lbShowNotification("Effet CRT mis à jour");
        return;
      }

      const consoleFilter = event.target.closest("[data-lb-console-generation]");
      if (consoleFilter) {
        lbFilterConsoleCards(consoleFilter);
        return;
      }

      const setting = event.target.closest("[data-lb-setting]");
      if (!setting) return;
      const key = setting.dataset.lbSetting;
      if (!(key in lbState.settings)) return;
      lbState.settings[key] = setting.checked;
      const storageKey = key === "reducedMotion" ? "reduced-motion" : key;
      lbStoreBoolean(storageKey, setting.checked);
      lbApplySettings();
      lbShowNotification("Paramètre enregistré");
    });
    lbRoot.addEventListener("input", (event) => {
      const consoleSearch = event.target.closest("[data-lb-console-search]");
      if (consoleSearch) lbFilterConsoleCards(consoleSearch);
    });
    lbRoot.addEventListener("error", (event) => {
      if (event.target.matches?.("[data-lb-media-image]")) {
        event.target.hidden = true;
        event.target.closest(".lb-media-frame")?.classList.add("lb-media-load-error");
      }
    }, true);
    lbRoot.addEventListener("submit", (event) => {
      if (event.target.id === "lb-contact-form") {
        event.preventDefault();
        lbHandleContactSubmit(event.target);
      }
    });

    document.addEventListener("pointerdown", lbHandleDocumentPointerDown, true);
    document.addEventListener("keydown", lbHandleKeyDown);
    window.addEventListener("resize", lbHandleResize, { passive: true });
    window.setInterval(lbUpdateClock, 1000);

    window.LABidouilleOS = Object.freeze({
      openWindow: lbOpenWindow,
      closeWindow: lbCloseWindow,
      minimizeWindow: lbMinimizeWindow,
      maximizeWindow: lbToggleMaximizeWindow,
      restoreWindow: lbRestoreWindow,
      focusWindow: lbFocusWindow,
      showDialog: lbShowDialog,
      apps: lbApps.map((app) => ({ id: app.id, title: app.title }))
    });
  }

  lbInitialize();
})();
