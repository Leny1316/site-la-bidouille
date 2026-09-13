"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bidouilleManager", Object.freeze({
  getState: () => ipcRenderer.invoke("state:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  chooseProject: () => ipcRenderer.invoke("project:choose"),
  openProject: (directory) => ipcRenderer.invoke("project:open", directory),
  openPreview: (settings) => ipcRenderer.invoke("preview:open", settings),
  readContent: (settings) => ipcRenderer.invoke("content:read", settings),
  saveContent: (settings, content) => ipcRenderer.invoke("content:save", settings, content),
  importAsset: (settings) => ipcRenderer.invoke("content:import-asset", settings),
  openTokenPage: () => ipcRenderer.invoke("github:open-token-page"),
  connectGitHub: (token) => ipcRenderer.invoke("github:connect", token),
  githubStatus: () => ipcRenderer.invoke("github:status"),
  disconnectGitHub: () => ipcRenderer.invoke("github:disconnect"),
  inspectRepository: (settings) => ipcRenderer.invoke("github:repository", settings),
  publish: (settings) => ipcRenderer.invoke("publish:start", settings),
  onPublishProgress: (listener) => {
    const wrapped = (_event, message) => listener(message);
    ipcRenderer.on("publish:progress", wrapped);
    return () => ipcRenderer.removeListener("publish:progress", wrapped);
  }
}));
