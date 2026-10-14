"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeContent, parseContentSource, serializeContent } = require("../content-manager");

test("lit et réécrit le format contenu.js sans exécuter de code", () => {
  const source = 'window.LB_CONTENT = {"version":"3.1","site":{"authorName":"Leny"},"videos":{"tutoriels":[]}};';
  const content = parseContentSource(source);
  assert.equal(content.site.authorName, "Leny");
  assert.deepEqual(content.videos.reparations, []);
  assert.match(serializeContent(content), /^window\.LB_CONTENT = \{/);
});

test("refuse un fichier JavaScript qui ne contient pas uniquement les données attendues", () => {
  assert.throws(() => parseContentSource("alert('intrus')"), /format/i);
  assert.throws(() => parseContentSource("window.LB_CONTENT = {invalide};"), /JSON/i);
});

test("complète les collections absentes pour l’éditeur", () => {
  const content = normalizeContent({ version: "3.1", site: {}, videos: {} });
  assert.deepEqual(content.videos.mods, []);
  assert.deepEqual(content.downloads, []);
  assert.deepEqual(content.gallery, []);
  assert.deepEqual(content.games, []);
  assert.deepEqual(content.consoles, []);
  assert.deepEqual(content.site.desktopIcons, {});
});

test("refuse les clés dangereuses dans les données importées", () => {
  const source = 'window.LB_CONTENT = {"site":{"__proto__":{"admin":true}}};';
  assert.throws(() => parseContentSource(source), /clé interdite/i);
});
