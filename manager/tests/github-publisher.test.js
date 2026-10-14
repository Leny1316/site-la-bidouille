"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  gitBlobSha,
  normalizeBranch,
  normalizeRelativeFolder,
  normalizeRepository,
  publishSite,
  walkFiles
} = require("../github-publisher");

test("normalise les dépôts GitHub autorisés", () => {
  assert.deepEqual(normalizeRepository("Leny/La-Bidouille"), {
    owner: "Leny",
    repo: "La-Bidouille",
    fullName: "Leny/La-Bidouille"
  });
  assert.equal(normalizeRepository("https://github.com/Leny/La-Bidouille.git").fullName, "Leny/La-Bidouille");
  assert.throws(() => normalizeRepository("https://example.com/Leny/La-Bidouille"), /dépôt/i);
  assert.throws(() => normalizeRepository("Leny/../secret"), /dépôt/i);
});

test("refuse les branches et dossiers dangereux", () => {
  assert.equal(normalizeBranch("pages/site"), "pages/site");
  assert.throws(() => normalizeBranch("../main"), /branche/i);
  assert.throws(() => normalizeBranch("main lock"), /branche/i);
  assert.equal(normalizeRelativeFolder("/docs/site/", "Destination", true), "docs/site");
  assert.equal(normalizeRelativeFolder(".", "Destination", true), "");
  assert.throws(() => normalizeRelativeFolder("../ailleurs", "Destination", true), /Destination/i);
});

test("calcule le SHA Git d'un blob", () => {
  assert.equal(gitBlobSha("hello"), "b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0");
});

test("énumère le site sans suivre les fichiers de travail", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "la-bidouille-test-"));
  try {
    await fs.mkdir(path.join(temporary, "assets"));
    await fs.mkdir(path.join(temporary, "node_modules"));
    await fs.writeFile(path.join(temporary, "index.html"), "ok");
    await fs.writeFile(path.join(temporary, ".nojekyll"), "");
    await fs.writeFile(path.join(temporary, "assets", "style.css"), "body{}");
    await fs.writeFile(path.join(temporary, "node_modules", "ignore.js"), "ignore");
    const files = await walkFiles(temporary);
    assert.deepEqual(files.map((file) => file.relativePath).sort(), [".nojekyll", "assets/style.css", "index.html"]);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

function jsonResponse(status, value) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => value === null ? "" : JSON.stringify(value)
  };
}

test("n'ajoute pas de commit lorsque le site distant est déjà identique", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "la-bidouille-publish-"));
  const originalFetch = global.fetch;
  try {
    const content = Buffer.from("<!doctype html><title>La Bidouille</title>");
    const manifest = Buffer.from(`${JSON.stringify({ version: 1, files: ["index.html"] }, null, 2)}\n`);
    await fs.writeFile(path.join(temporary, "index.html"), content);
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url, method: options.method });
      if (url.includes("/git/ref/heads/main")) return jsonResponse(200, { object: { sha: "commit-a" } });
      if (url.includes("/git/commits/commit-a")) return jsonResponse(200, { tree: { sha: "tree-a" } });
      if (url.includes("/git/trees/tree-a")) {
        return jsonResponse(200, { truncated: false, tree: [
          { path: "index.html", type: "blob", sha: gitBlobSha(content) },
          { path: ".la-bidouille-publish.json", type: "blob", sha: gitBlobSha(manifest) }
        ] });
      }
      if (url.includes(`/git/blobs/${gitBlobSha(manifest)}`)) {
        return jsonResponse(200, { encoding: "base64", content: manifest.toString("base64") });
      }
      throw new Error(`Appel inattendu : ${url}`);
    };

    const result = await publishSite({
      token: "github_pat_test_token_long_enough",
      repository: "leny/site",
      branch: "main",
      sourceDirectory: temporary,
      targetFolder: "",
      commitMessage: "Test"
    });
    assert.equal(result.status, "unchanged");
    assert.equal(calls.length, 4);
  } finally {
    global.fetch = originalFetch;
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test("crée un blob, un arbre, un commit puis avance la branche", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "la-bidouille-publish-"));
  const originalFetch = global.fetch;
  try {
    await fs.writeFile(path.join(temporary, "index.html"), "nouvelle version");
    const methods = [];
    let createdTree = null;
    global.fetch = async (url, options) => {
      methods.push(`${options.method} ${new URL(url).pathname}`);
      if (url.includes("/git/ref/heads/main")) return jsonResponse(200, { object: { sha: "commit-a" } });
      if (url.includes("/git/commits/commit-a")) return jsonResponse(200, { tree: { sha: "tree-a" } });
      if (url.includes("/git/trees/tree-a?recursive=1")) return jsonResponse(200, { truncated: false, tree: [
        { path: "README.md", type: "blob", sha: "readme-sha" },
        { path: "CNAME", type: "blob", sha: "cname-sha" },
        { path: ".github/workflows/pages.yml", type: "blob", sha: "workflow-sha" }
      ] });
      if (options.method === "POST" && url.endsWith("/git/blobs")) return jsonResponse(201, { sha: "blob-b" });
      if (options.method === "POST" && url.endsWith("/git/trees")) {
        createdTree = JSON.parse(options.body);
        return jsonResponse(201, { sha: "tree-b" });
      }
      if (options.method === "POST" && url.endsWith("/git/commits")) return jsonResponse(201, { sha: "commit-b" });
      if (options.method === "PATCH" && url.endsWith("/git/refs/heads/main")) return jsonResponse(200, { object: { sha: "commit-b" } });
      throw new Error(`Appel inattendu : ${url}`);
    };

    const result = await publishSite({
      token: "github_pat_test_token_long_enough",
      repository: "leny/site",
      branch: "main",
      sourceDirectory: temporary,
      targetFolder: "",
      commitMessage: "Test de publication"
    });
    assert.equal(result.status, "published");
    assert.equal(result.commitSha, "commit-b");
    assert.equal(result.removed, 0);
    assert.ok(createdTree.tree.every((entry) => entry.sha !== null), "les fichiers non gérés doivent être conservés");
    assert.deepEqual(methods.slice(-4).map((item) => item.split(" ")[0]), ["POST", "POST", "POST", "PATCH"]);
  } finally {
    global.fetch = originalFetch;
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
