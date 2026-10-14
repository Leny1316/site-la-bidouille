"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require("electron");
const {
  PublishError,
  getRepositoryInfo,
  normalizeBranch,
  normalizeRelativeFolder,
  normalizeRepository,
  publishSite,
  validateToken
} = require("./github-publisher");
const {
  ContentError,
  parseContentSource,
  serializeContent
} = require("./content-manager");

let mainWindow = null;
let previewWindow = null;
let publishing = false;

function settingsPath() {
  return path.join(app.getPath("userData"), "configuration.json");
}

function tokenPath() {
  return path.join(app.getPath("userData"), "github-token.bin");
}

function defaultSettings() {
  return {
    projectDirectory: app.isPackaged ? process.resourcesPath : path.resolve(__dirname, ".."),
    sourceFolder: app.isPackaged ? "site" : "website",
    repository: "",
    branch: "main",
    targetFolder: "",
    commitMessage: "Publication de La Bidouille OS"
  };
}

function publicError(error) {
  const known = error instanceof PublishError || error instanceof ContentError;
  return {
    message: known ? error.message : "Une erreur inattendue est survenue dans le gestionnaire.",
    code: known ? error.code : "UNEXPECTED_ERROR",
    details: known ? error.details : ""
  };
}

function sanitizeSettings(candidate, requireRepository) {
  const defaults = defaultSettings();
  const value = { ...defaults, ...(candidate || {}) };
  const projectDirectory = path.resolve(String(value.projectDirectory || defaults.projectDirectory));
  const sourceFolder = normalizeRelativeFolder(value.sourceFolder, "Le dossier source", true);
  const targetFolder = normalizeRelativeFolder(value.targetFolder, "Le dossier de destination", true);
  const branch = normalizeBranch(value.branch);
  let repository = String(value.repository || "").trim();

  if (repository || requireRepository) repository = normalizeRepository(repository).fullName;

  return {
    projectDirectory,
    sourceFolder,
    repository,
    branch,
    targetFolder,
    commitMessage: String(value.commitMessage || defaults.commitMessage).trim().slice(0, 200)
  };
}

function resolveSourceDirectory(settings) {
  const project = path.resolve(settings.projectDirectory);
  const source = path.resolve(project, settings.sourceFolder || ".");
  const relative = path.relative(project, source);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new PublishError("Le dossier source doit rester dans le dossier du projet.", "SOURCE_OUTSIDE_PROJECT");
  }
  return source;
}

function contentFilePaths(settings) {
  const sourceDirectory = resolveSourceDirectory(settings);
  const primary = path.join(sourceDirectory, "contenu.js");
  const rootCopy = path.join(path.resolve(settings.projectDirectory), "contenu.js");
  return { primary, rootCopy, sourceDirectory };
}

function safeAssetName(filename) {
  const parsed = path.parse(filename);
  const extension = parsed.ext.toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extension)) {
    throw new ContentError("Choisissez une image PNG, JPG, WebP ou GIF.", "ASSET_FORMAT_INVALID");
  }
  const basename = parsed.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "image";
  return `${Date.now()}-${basename}${extension}`;
}

async function readManagedContent(candidate) {
  const settings = sanitizeSettings(candidate, false);
  const { primary } = contentFilePaths(settings);
  let source;
  try {
    source = await fsp.readFile(primary, "utf8");
  } catch (error) {
    throw new ContentError("Le fichier contenu.js est introuvable dans le dossier du site.", "CONTENT_FILE_NOT_FOUND");
  }
  return { content: parseContentSource(source), file: primary };
}

async function saveManagedContent(candidate, content) {
  const settings = sanitizeSettings(candidate, false);
  const { primary, rootCopy } = contentFilePaths(settings);
  const serialized = serializeContent(content);
  const backupDirectory = path.join(settings.projectDirectory, ".la-bidouille-backups");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDirectory, `contenu-${stamp}.js`);

  const current = await fsp.readFile(primary).catch(() => null);
  if (!current) {
    throw new ContentError("Le fichier contenu.js est introuvable dans le dossier du site.", "CONTENT_FILE_NOT_FOUND");
  }
  await fsp.mkdir(backupDirectory, { recursive: true });
  await fsp.writeFile(backupPath, current);
  await fsp.writeFile(primary, serialized, "utf8");

  const targets = [primary];
  if (path.resolve(rootCopy) !== path.resolve(primary)) {
    const rootExists = await fsp.stat(rootCopy).then((stat) => stat.isFile()).catch(() => false);
    if (rootExists) {
      await fsp.writeFile(rootCopy, serialized, "utf8");
      targets.push(rootCopy);
    }
  }
  return { content: parseContentSource(serialized), backup: backupPath, targets };
}

async function importManagedAsset(candidate) {
  const settings = sanitizeSettings(candidate, false);
  const { sourceDirectory } = contentFilePaths(settings);
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choisir une image pour La Bidouille OS",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;

  const selected = result.filePaths[0];
  const stat = await fsp.stat(selected);
  if (!stat.isFile() || stat.size > 15 * 1024 * 1024) {
    throw new ContentError("L’image doit peser moins de 15 Mio.", "ASSET_TOO_LARGE");
  }
  const filename = safeAssetName(selected);
  const sourceAssets = path.join(sourceDirectory, "assets");
  await fsp.mkdir(sourceAssets, { recursive: true });
  await fsp.copyFile(selected, path.join(sourceAssets, filename));

  const rootAssets = path.join(settings.projectDirectory, "assets");
  if (path.resolve(rootAssets) !== path.resolve(sourceAssets)) {
    await fsp.mkdir(rootAssets, { recursive: true });
    await fsp.copyFile(selected, path.join(rootAssets, filename));
  }
  return { path: `assets/${filename}`, filename };
}

async function readSettings() {
  try {
    const raw = await fsp.readFile(settingsPath(), "utf8");
    return sanitizeSettings(JSON.parse(raw), false);
  } catch (error) {
    return defaultSettings();
  }
}

async function writeSettings(settings) {
  const sanitized = sanitizeSettings(settings, false);
  await fsp.mkdir(app.getPath("userData"), { recursive: true });
  await fsp.writeFile(settingsPath(), `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");
  return sanitized;
}

async function hasStoredToken() {
  return fsp.access(tokenPath(), fs.constants.R_OK).then(() => true).catch(() => false);
}

async function readToken() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new PublishError(
      "Le chiffrement sécurisé de Windows n'est pas disponible dans cette session.",
      "ENCRYPTION_UNAVAILABLE"
    );
  }
  let encrypted;
  try {
    encrypted = await fsp.readFile(tokenPath());
  } catch (error) {
    throw new PublishError("Aucune connexion GitHub n'est enregistrée.", "NO_TOKEN");
  }

  try {
    return safeStorage.decryptString(encrypted);
  } catch (error) {
    throw new PublishError(
      "La connexion enregistrée ne peut plus être déchiffrée. Reconnectez GitHub.",
      "TOKEN_DECRYPTION_FAILED"
    );
  }
}

async function storeToken(token) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new PublishError(
      "Le chiffrement sécurisé de Windows n'est pas disponible. Le jeton n'a pas été enregistré.",
      "ENCRYPTION_UNAVAILABLE"
    );
  }
  const encrypted = safeStorage.encryptString(token);
  await fsp.mkdir(app.getPath("userData"), { recursive: true });
  await fsp.writeFile(tokenPath(), encrypted);
}

function guard(handler) {
  return async (_event, ...args) => {
    try {
      return { ok: true, value: await handler(...args) };
    } catch (error) {
      return { ok: false, error: publicError(error) };
    }
  };
}

function sendProgress(message) {
  if (!mainWindow?.isDestroyed()) mainWindow.webContents.send("publish:progress", String(message));
}

function createPreviewWindow(indexPath) {
  if (previewWindow && !previewWindow.isDestroyed()) previewWindow.close();
  previewWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 700,
    minHeight: 520,
    title: "Aperçu — La Bidouille OS",
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  previewWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  previewWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file:")) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  previewWindow.loadFile(indexPath);
}

function registerIpc() {
  ipcMain.handle("state:get", guard(async () => ({
    settings: await readSettings(),
    tokenStored: await hasStoredToken(),
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    version: app.getVersion()
  })));

  ipcMain.handle("settings:save", guard(async (settings) => writeSettings(settings)));

  ipcMain.handle("project:choose", guard(async () => {
    const current = await readSettings();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choisir le dossier du projet La Bidouille OS",
      defaultPath: current.projectDirectory,
      properties: ["openDirectory", "createDirectory"]
    });
    return result.canceled ? null : result.filePaths[0];
  }));

  ipcMain.handle("project:open", guard(async (directory) => {
    const resolved = path.resolve(String(directory || ""));
    const result = await shell.openPath(resolved);
    if (result) throw new PublishError(`Impossible d'ouvrir le dossier : ${result}`, "OPEN_FOLDER_FAILED");
    return true;
  }));

  ipcMain.handle("preview:open", guard(async (candidate) => {
    const settings = sanitizeSettings(candidate, false);
    const source = resolveSourceDirectory(settings);
    const indexPath = path.join(source, "index.html");
    const stat = await fsp.stat(indexPath).catch(() => null);
    if (!stat?.isFile()) {
      throw new PublishError("Aucun index.html n'a été trouvé dans le dossier source.", "INDEX_NOT_FOUND");
    }
    createPreviewWindow(indexPath);
    return true;
  }));

  ipcMain.handle("content:read", guard(async (candidate) => readManagedContent(candidate)));

  ipcMain.handle("content:save", guard(async (candidate, content) => saveManagedContent(candidate, content)));

  ipcMain.handle("content:import-asset", guard(async (candidate) => importManagedAsset(candidate)));

  ipcMain.handle("github:open-token-page", guard(async () => {
    await shell.openExternal("https://github.com/settings/personal-access-tokens/new");
    return true;
  }));

  ipcMain.handle("github:connect", guard(async (rawToken) => {
    const token = String(rawToken || "").trim();
    if (token.length < 20 || token.length > 500) {
      throw new PublishError("Le jeton GitHub fourni ne semble pas valide.", "INVALID_TOKEN");
    }
    const account = await validateToken(token);
    await storeToken(token);
    return account;
  }));

  ipcMain.handle("github:status", guard(async () => {
    if (!(await hasStoredToken())) return { connected: false };
    const token = await readToken();
    const account = await validateToken(token);
    return { connected: true, account };
  }));

  ipcMain.handle("github:disconnect", guard(async () => {
    await fsp.rm(tokenPath(), { force: true });
    return true;
  }));

  ipcMain.handle("github:repository", guard(async (candidate) => {
    const settings = sanitizeSettings(candidate, true);
    const token = await readToken();
    return getRepositoryInfo(token, settings.repository);
  }));

  ipcMain.handle("publish:start", guard(async (candidate) => {
    if (publishing) throw new PublishError("Une publication est déjà en cours.", "ALREADY_PUBLISHING");
    publishing = true;
    try {
      const settings = sanitizeSettings(candidate, true);
      await writeSettings(settings);
      const token = await readToken();
      const sourceDirectory = resolveSourceDirectory(settings);
      return await publishSite({
        token,
        repository: settings.repository,
        branch: settings.branch,
        sourceDirectory,
        targetFolder: settings.targetFolder,
        commitMessage: settings.commitMessage,
        onProgress: sendProgress
      });
    } finally {
      publishing = false;
    }
  }));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 800,
    minWidth: 880,
    minHeight: 650,
    show: false,
    title: "Gestionnaire La Bidouille",
    autoHideMenuBar: true,
    backgroundColor: "#071124",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  registerIpc();
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
