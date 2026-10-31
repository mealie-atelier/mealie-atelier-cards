import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readText = (path) => readFileSync(new URL(path, root), "utf8");
const pkg = JSON.parse(readText("package.json"));
const manifest = JSON.parse(readText("demo/showcase/manifest.json"));

// The showcase images that show a version string: the sidebar footer of the web app ("Mealie Atelier 0.12.1") and
// the Bridge version on the Home Assistant integration page ("Version 0.12.1"). `version` is the version the image
// was captured with. A release bumps package.json, which fails this test until each image is recaptured (see the
// capture scripts named in `script`) and its recorded version is updated here.
const VERSIONED = {
  "app-desktop-mealplan": { version: "0.12.1", script: "capture-app-showcase.py" },
  "app-desktop-shopping": { version: "0.12.1", script: "capture-app-showcase.py" },
  "ha-integration": { version: "0.12.1", script: "capture-ha-showcase.py" },
};

test("every showcase image with a visible version was captured with the current package version", () => {
  for (const [name, { version }] of Object.entries(VERSIONED)) {
    assert.equal(
      version,
      pkg.version,
      `${name} shows ${version} but package.json says ${pkg.version}: recapture it and update test/showcase-versions.test.mjs`,
    );
  }
});

test("versioned showcase images exist in both languages and sizes and are listed in the manifest", () => {
  for (const [name] of Object.entries(VERSIONED)) {
    for (const locale of ["de", "en"]) {
      const entry = manifest[locale]?.[name];
      assert.ok(entry, `${locale}/${name} is missing in demo/showcase/manifest.json`);
      for (const width of entry.widths) {
        assert.ok(
          existsSync(new URL(`demo/showcase/${locale}/${name}-${width}.webp`, root)),
          `${locale}/${name}-${width}.webp`,
        );
        assert.ok(
          existsSync(new URL(`demo/public-site/showcase/${locale}/${name}-${width}.webp`, root)) ||
            !existsSync(new URL("demo/public-site/", root)),
          `${locale}/${name}-${width}.webp is missing in the generated demo/public-site (run npm run build:demo)`,
        );
      }
    }
  }
});

test("every versioned showcase image has a capture script that writes it", () => {
  for (const [name, { script }] of Object.entries(VERSIONED)) {
    const source = readText(`scripts/${script}`);
    assert.ok(source.includes(`"${name}"`), `${script} does not capture ${name}`);
  }
});

test("the integration shot gate compares the page version with package.json", () => {
  const source = readText("scripts/capture-ha-showcase.py");
  assert.match(source, /\/config\/integrations\/integration\/mealie_atelier/);
  assert.match(source, /versions == \[VERSION\]/);
  assert.match(source, /restore_integration_rig\(saved\)/);
});
