"use strict";

const MAX_CONTENT_BYTES = 5 * 1024 * 1024;
const MAX_COLLECTION_ITEMS = 1500;
const VIDEO_GROUPS = ["tutoriels", "reparations", "mods"];

class ContentError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ContentError";
    this.code = code || "CONTENT_ERROR";
  }
}

function assertSafeData(value, path, depth) {
  if (depth > 12) throw new ContentError(`Le contenu est trop imbriqué près de ${path}.`, "CONTENT_TOO_DEEP");
  if (value === null || ["string", "boolean"].includes(typeof value)) return;
  if (typeof value === "number" && Number.isFinite(value)) return;

  if (Array.isArray(value)) {
    if (value.length > MAX_COLLECTION_ITEMS) {
      throw new ContentError(`${path} contient trop d’éléments.`, "CONTENT_TOO_MANY_ITEMS");
    }
    value.forEach((item, index) => assertSafeData(item, `${path}[${index}]`, depth + 1));
    return;
  }

  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ContentError(`${path} contient une valeur non prise en charge.`, "CONTENT_INVALID_VALUE");
  }

  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) {
      throw new ContentError(`${path} contient une clé interdite.`, "CONTENT_INVALID_KEY");
    }
    if (key.length > 100) throw new ContentError(`${path} contient une clé trop longue.`, "CONTENT_INVALID_KEY");
    assertSafeData(child, `${path}.${key}`, depth + 1);
  }
}

function normalizeContent(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new ContentError("Le contenu doit être un objet JSON.", "CONTENT_INVALID_ROOT");
  }

  const cloned = JSON.parse(JSON.stringify(candidate));
  assertSafeData(cloned, "contenu", 0);
  cloned.version = String(cloned.version || "3.1");
  cloned.site = cloned.site && typeof cloned.site === "object" && !Array.isArray(cloned.site) ? cloned.site : {};
  cloned.videos = cloned.videos && typeof cloned.videos === "object" && !Array.isArray(cloned.videos) ? cloned.videos : {};
  VIDEO_GROUPS.forEach((group) => {
    if (!Array.isArray(cloned.videos[group])) cloned.videos[group] = [];
  });
  ["downloads", "gallery", "games", "consoles"].forEach((collection) => {
    if (!Array.isArray(cloned[collection])) cloned[collection] = [];
  });
  if (!cloned.site.desktopIcons || typeof cloned.site.desktopIcons !== "object" || Array.isArray(cloned.site.desktopIcons)) {
    cloned.site.desktopIcons = {};
  }

  const serialized = JSON.stringify(cloned);
  if (Buffer.byteLength(serialized, "utf8") > MAX_CONTENT_BYTES) {
    throw new ContentError("Le fichier de contenu dépasse la limite de 5 Mio.", "CONTENT_TOO_LARGE");
  }
  return cloned;
}

function parseContentSource(source) {
  const raw = String(source || "").replace(/^\uFEFF/, "").trim();
  const match = raw.match(/^window\.LB_CONTENT\s*=\s*/);
  if (!match) {
    throw new ContentError("Le fichier contenu.js n’utilise pas le format La Bidouille attendu.", "CONTENT_FORMAT_INVALID");
  }
  const jsonText = raw.slice(match[0].length).replace(/;\s*$/, "");
  try {
    return normalizeContent(JSON.parse(jsonText));
  } catch (error) {
    if (error instanceof ContentError) throw error;
    throw new ContentError(`Le JSON de contenu.js est invalide : ${error.message}`, "CONTENT_JSON_INVALID");
  }
}

function serializeContent(candidate) {
  const content = normalizeContent(candidate);
  return `window.LB_CONTENT = ${JSON.stringify(content, null, 2)};\n`;
}

module.exports = {
  ContentError,
  VIDEO_GROUPS,
  normalizeContent,
  parseContentSource,
  serializeContent
};
