"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const API_ROOT = "https://api.github.com";
const MAX_FILES = 1500;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MANIFEST_NAME = ".la-bidouille-publish.json";

class PublishError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = "PublishError";
    this.code = code || "PUBLISH_ERROR";
    this.details = details || "";
  }
}

function normalizeRepository(value) {
  const raw = String(value || "").trim();
  let match = raw.match(/^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]+)$/);

  if (!match) {
    match = raw.match(/^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/i);
  }

  if (!match || match[2].startsWith(".") || match[2].endsWith(".")) {
    throw new PublishError(
      "Le dépôt doit être indiqué sous la forme propriétaire/depot ou avec son URL GitHub HTTPS.",
      "INVALID_REPOSITORY"
    );
  }

  return { owner: match[1], repo: match[2], fullName: `${match[1]}/${match[2]}` };
}

function normalizeBranch(value) {
  const branch = String(value || "main").trim();
  const invalid = !branch
    || branch.length > 200
    || !/^[A-Za-z0-9._/-]+$/.test(branch)
    || branch.startsWith("/")
    || branch.endsWith("/")
    || branch.startsWith(".")
    || branch.endsWith(".")
    || branch.includes("..")
    || branch.includes("//")
    || branch.includes("@{")
    || branch.endsWith(".lock");

  if (invalid) {
    throw new PublishError("Le nom de branche n'est pas valide.", "INVALID_BRANCH");
  }
  return branch;
}

function normalizeRelativeFolder(value, label, allowRoot) {
  const raw = String(value ?? "").trim().replaceAll("\\", "/");
  if ((raw === "" || raw === "." || raw === "/") && allowRoot) return "";
  const normalized = raw.replace(/^\/+|\/+$/g, "");
  const parts = normalized.split("/");
  if (!normalized || parts.some((part) => !part || part === "." || part === ".." || /[<>:"|?*\0]/.test(part))) {
    throw new PublishError(`${label} n'est pas valide.`, "INVALID_FOLDER");
  }
  return parts.join("/");
}

function gitBlobSha(content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto.createHash("sha1").update(header).update(buffer).digest("hex");
}

async function walkFiles(rootDirectory) {
  const result = [];
  const root = path.resolve(rootDirectory);

  async function visit(currentDirectory, relativeDirectory) {
    const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, "fr"));

    for (const entry of entries) {
      if ([".git", ".github", ".la-bidouille-backups", "node_modules", "dist", "Thumbs.db", ".DS_Store"].includes(entry.name)) continue;
      const absolutePath = path.join(currentDirectory, entry.name);
      const relativePath = path.posix.join(relativeDirectory, entry.name);

      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
        continue;
      }
      if (!entry.isFile()) continue;

      const stat = await fs.stat(absolutePath);
      if (stat.size > MAX_FILE_BYTES) {
        throw new PublishError(
          `Le fichier ${relativePath} dépasse la limite de 25 Mio du gestionnaire.`,
          "FILE_TOO_LARGE"
        );
      }
      result.push({ absolutePath, relativePath, size: stat.size });
      if (result.length > MAX_FILES) {
        throw new PublishError(`Le site dépasse la limite de ${MAX_FILES} fichiers.`, "TOO_MANY_FILES");
      }
    }
  }

  await visit(root, "");
  return result;
}

function encodePathPart(value) {
  return encodeURIComponent(value).replaceAll("%2F", "/");
}

async function githubRequest(token, method, endpoint, body) {
  let response;
  try {
    response = await fetch(`${API_ROOT}${endpoint}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "La-Bidouille-Gestionnaire",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    throw new PublishError(
      "Impossible de joindre GitHub. Vérifiez votre connexion Internet.",
      "NETWORK_ERROR",
      error.message
    );
  }

  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (error) {
      data = { message: raw.slice(0, 300) };
    }
  }

  if (!response.ok) {
    const apiMessage = data?.message ? ` GitHub indique : ${data.message}` : "";
    const permissionHint = response.status === 401 || response.status === 403
      ? " Vérifiez que le jeton est encore valide et possède l'autorisation « Contents: Read and write » sur ce dépôt."
      : "";
    throw new PublishError(
      `La requête GitHub a échoué (${response.status}).${apiMessage}${permissionHint}`,
      `GITHUB_${response.status}`
    );
  }

  return data;
}

async function validateToken(token) {
  const user = await githubRequest(token, "GET", "/user");
  return {
    login: user.login,
    name: user.name || user.login,
    avatarUrl: user.avatar_url || ""
  };
}

async function getRepositoryInfo(token, repository) {
  const repo = normalizeRepository(repository);
  const data = await githubRequest(
    token,
    "GET",
    `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`
  );
  return {
    fullName: data.full_name,
    defaultBranch: data.default_branch,
    private: Boolean(data.private),
    htmlUrl: data.html_url
  };
}

async function runLimited(items, limit, task) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await task(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function isProtectedRepositoryPath(remotePath, targetFolder) {
  const relative = targetFolder ? remotePath.slice(targetFolder.length + 1) : remotePath;
  const upper = relative.toUpperCase();
  return relative === MANIFEST_NAME
    || relative.startsWith(".github/")
    || upper === "CNAME"
    || upper.startsWith("README")
    || upper.startsWith("LICENSE");
}

async function readPreviousManagedPaths(token, base, treeItems, targetFolder) {
  const manifestPath = targetFolder ? `${targetFolder}/${MANIFEST_NAME}` : MANIFEST_NAME;
  const entry = treeItems.find((item) => item.type === "blob" && item.path === manifestPath);
  if (!entry) return [];

  const blob = await githubRequest(token, "GET", `${base}/git/blobs/${entry.sha}`);
  if (blob.encoding !== "base64" || typeof blob.content !== "string") return [];

  try {
    const manifest = JSON.parse(Buffer.from(blob.content.replace(/\s/g, ""), "base64").toString("utf8"));
    if (manifest.version !== 1 || !Array.isArray(manifest.files)) return [];
    return manifest.files
      .filter((item) => typeof item === "string")
      .map((item) => normalizeRelativeFolder(item, "Le manifeste de publication", false))
      .map((item) => targetFolder ? `${targetFolder}/${item}` : item)
      .filter((item) => !isProtectedRepositoryPath(item, targetFolder));
  } catch (error) {
    return [];
  }
}

async function publishSite(options) {
  const token = String(options.token || "").trim();
  if (!token) throw new PublishError("Aucune connexion GitHub n'est enregistrée.", "NO_TOKEN");

  const repository = normalizeRepository(options.repository);
  const branch = normalizeBranch(options.branch);
  const sourceFolder = path.resolve(options.sourceDirectory);
  const targetFolder = normalizeRelativeFolder(options.targetFolder, "Le dossier de destination", true);
  const commitMessage = String(options.commitMessage || "Publication de La Bidouille OS").trim().slice(0, 200);
  const progress = typeof options.onProgress === "function" ? options.onProgress : () => {};

  const sourceStat = await fs.stat(sourceFolder).catch(() => null);
  if (!sourceStat?.isDirectory()) {
    throw new PublishError("Le dossier du site est introuvable.", "SOURCE_NOT_FOUND");
  }
  const indexStat = await fs.stat(path.join(sourceFolder, "index.html")).catch(() => null);
  if (!indexStat?.isFile()) {
    throw new PublishError("Le dossier du site ne contient pas de fichier index.html.", "INDEX_NOT_FOUND");
  }

  progress("Lecture des fichiers du site…");
  const localFiles = (await walkFiles(sourceFolder)).filter((file) => file.relativePath !== MANIFEST_NAME);
  const preparedFiles = await runLimited(localFiles, 6, async (file) => {
    const content = await fs.readFile(file.absolutePath);
    const remotePath = targetFolder ? `${targetFolder}/${file.relativePath}` : file.relativePath;
    return { ...file, content, remotePath, sha: gitBlobSha(content) };
  });
  const manifestPath = targetFolder ? `${targetFolder}/${MANIFEST_NAME}` : MANIFEST_NAME;
  const manifestContent = Buffer.from(`${JSON.stringify({
    version: 1,
    files: preparedFiles.map((file) => file.relativePath).sort()
  }, null, 2)}\n`);
  const manifestFile = {
    relativePath: MANIFEST_NAME,
    remotePath: manifestPath,
    content: manifestContent,
    size: manifestContent.length,
    sha: gitBlobSha(manifestContent)
  };
  const filesToPublish = [...preparedFiles, manifestFile];

  progress(`Connexion au dépôt ${repository.fullName}…`);
  const base = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
  const ref = await githubRequest(token, "GET", `${base}/git/ref/heads/${encodePathPart(branch)}`);
  const baseCommitSha = ref.object.sha;
  const commit = await githubRequest(token, "GET", `${base}/git/commits/${baseCommitSha}`);
  const baseTreeSha = commit.tree.sha;
  const tree = await githubRequest(token, "GET", `${base}/git/trees/${baseTreeSha}?recursive=1`);

  if (tree.truncated) {
    throw new PublishError(
      "Le dépôt est trop volumineux pour une synchronisation sûre en un clic.",
      "TREE_TRUNCATED"
    );
  }

  const treeItems = tree.tree || [];
  const existing = new Map(
    treeItems
      .filter((item) => item.type === "blob")
      .map((item) => [item.path, item.sha])
  );
  const previousManagedPaths = await readPreviousManagedPaths(token, base, treeItems, targetFolder);
  const localPaths = new Set(filesToPublish.map((file) => file.remotePath));
  const removedPaths = previousManagedPaths.filter((remotePath) => existing.has(remotePath) && !localPaths.has(remotePath));
  const changedFiles = filesToPublish.filter((file) => existing.get(file.remotePath) !== file.sha);
  const changedContentCount = changedFiles.filter((file) => file.remotePath !== manifestPath).length;

  if (changedFiles.length === 0 && removedPaths.length === 0) {
    progress("Le site publié est déjà à jour.");
    return {
      status: "unchanged",
      files: preparedFiles.length,
      commitSha: baseCommitSha,
      repository: repository.fullName,
      branch
    };
  }

  progress(`Envoi de ${changedContentCount} fichier(s) modifié(s)…`);
  const uploaded = await runLimited(changedFiles, 4, async (file) => {
    const blob = await githubRequest(token, "POST", `${base}/git/blobs`, {
      content: file.content.toString("base64"),
      encoding: "base64"
    });
    return { path: file.remotePath, mode: "100644", type: "blob", sha: blob.sha };
  });

  const deletions = removedPaths.map((remotePath) => ({
    path: remotePath,
    mode: "100644",
    type: "blob",
    sha: null
  }));

  progress("Création de l'instantané Git…");
  const newTree = await githubRequest(token, "POST", `${base}/git/trees`, {
    base_tree: baseTreeSha,
    tree: [...uploaded, ...deletions]
  });
  const newCommit = await githubRequest(token, "POST", `${base}/git/commits`, {
    message: commitMessage || "Publication de La Bidouille OS",
    tree: newTree.sha,
    parents: [baseCommitSha]
  });

  progress(`Mise à jour de la branche ${branch}…`);
  await githubRequest(token, "PATCH", `${base}/git/refs/heads/${encodePathPart(branch)}`, {
    sha: newCommit.sha,
    force: false
  });

  progress("Publication terminée.");
  return {
    status: "published",
    files: preparedFiles.length,
    changed: changedContentCount,
    removed: removedPaths.length,
    commitSha: newCommit.sha,
    repository: repository.fullName,
    branch
  };
}

module.exports = {
  PublishError,
  getRepositoryInfo,
  gitBlobSha,
  normalizeBranch,
  normalizeRelativeFolder,
  normalizeRepository,
  publishSite,
  validateToken,
  walkFiles
};
