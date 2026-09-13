"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const project = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(project, relativePath), "utf8");
}

function assertUniqueIds(html, filename) {
  const ids = Array.from(html.matchAll(/\sid=["']([^"']+)["']/gi), (match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${filename} contient un identifiant HTML en double`);
}

function localAssets(html) {
  return Array.from(html.matchAll(/<(?:link|script)[^>]+(?:href|src)=["']([^"']+)["']/gi), (match) => match[1])
    .filter((value) => !/^(?:https?:|data:|#)/i.test(value));
}

test("le site principal charge toutes ses ressources locales", () => {
  for (const root of ["", "website"]) {
    const indexPath = path.posix.join(root, "index.html");
    const html = read(indexPath);
    assert.match(html, /id="lb-boot"/);
    assert.match(html, /LA BIDOUILLE/);
    assertUniqueIds(html, indexPath);
    for (const asset of localAssets(html)) {
      assert.ok(fs.existsSync(path.join(project, root, asset)), `${indexPath} référence un fichier absent : ${asset}`);
    }
  }
});

test("la copie GitHub Pages reste synchronisée avec le site source", () => {
  for (const filename of ["index.html", "app.js", "contenu.js", "styles.css", "retro.css", "retro.js"]) {
    assert.equal(read(filename), read(path.posix.join("website", filename)), `${filename} n'est pas synchronisé`);
  }
});

test("l'interface du gestionnaire respecte sa politique de sécurité", () => {
  const html = read("manager/index.html");
  assertUniqueIds(html, "manager/index.html");
  assert.match(html, /Content-Security-Policy/);
  assert.doesNotMatch(html, /<script(?![^>]+src=)[^>]*>/i, "aucun script en ligne ne doit contourner la CSP");
  for (const asset of localAssets(html)) {
    assert.ok(fs.existsSync(path.join(project, "manager", asset)), `ressource du gestionnaire absente : ${asset}`);
  }
});

test("le gestionnaire intègre l’éditeur de vidéos, d’images et d’icônes", () => {
  const html = read("manager/index.html");
  const renderer = read("manager/renderer.js");
  const preload = read("manager/preload.js");
  const main = read("manager/main.js");
  for (const id of ["content-section", "content-editor", "add-content-item", "save-content"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  for (const section of ["tutoriels", "reparations", "mods", "downloads", "gallery", "games", "consoles"]) {
    assert.match(renderer, new RegExp(`${section}:`));
  }
  assert.match(renderer, /desktopApps/);
  assert.match(preload, /content:import-asset/);
  assert.match(main, /safeAssetName/);
  assert.match(main, /\.la-bidouille-backups/);
});

test("aucun jeton ou secret GitHub n'est présent dans les sources", () => {
  const files = [
    "package.json",
    "manager/main.js",
    "manager/preload.js",
    "manager/renderer.js",
    "manager/github-publisher.js"
  ];
  const corpus = files.map(read).join("\n");
  assert.doesNotMatch(corpus, /github_pat_[A-Za-z0-9_]{20,}/);
  assert.doesNotMatch(corpus, /ghp_[A-Za-z0-9]{20,}/);
});
