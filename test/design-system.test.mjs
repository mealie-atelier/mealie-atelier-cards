import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const root = new URL("../", import.meta.url);
const file = (x) => readFileSync(new URL(x, root), "utf8");
const compiled = file("dist/mealie-atelier-cards.js");
const compact = (value) => value.replace(/\s+/g, "");
const compactCss = (value) => value.replace(/\s+/g, " ").replace(/\s*([{}:;,>])\s*/g, "$1");
test("tokens and reusable layouts are sourced separately and built into web and HACS", () => {
  for (const name of ["tokens.css", "layout.css", "components.css", "primitives.js"])
    assert.ok(file("src/design-system/" + name).length > 500);
  for (const name of [
    "--ds-space-4",
    "--ds-page-gutter",
    "--ds-control-height",
    "--ds-radius-lg",
    "--ds-content-max",
    "@container atelier-card",
    "ds-grid ds-grid--split",
    "AtelierUI.pageHeader",
    "AtelierUI.metric",
  ])
    assert.ok(compiled.includes(name), name);
  assert.equal(compiled, file("web/public/mealie-atelier-cards.js"));
});
test("shared UI constructors escape all user-supplied fields", () => {
  const text = file("src/design-system/primitives.js");
  for (const pattern of [
    "esc(title)",
    "esc(description)",
    "esc(label)",
    "esc(value)",
    "esc(placeholder)",
  ])
    assert.ok(text.includes(pattern));
  assert.ok(text.includes("Unsafe field name"));
});
test("the shared page, motion and author contracts are built into every surface", () => {
  const tokens = file("src/design-system/tokens.css");
  const layout = file("src/design-system/layout.css");
  const motion = file("src/design-system/motion.css");
  const primitives = file("src/design-system/primitives.js");
  const template = file("src/card-core.template.js");
  const print = file("src/components/print-document.js");
  for (const token of [
    "--ds-space-7",
    "--ds-page-stack-gap",
    "--ds-motion-fast",
    "--ds-motion-base",
    "--ds-motion-enter",
    "--ds-motion-slow",
    "--ds-motion-image",
    "--ds-motion-image-long",
    "--ds-motion-loading",
    "--ds-motion-reduced",
    "--ds-motion-ease",
    "--ds-motion-spring",
    "--ds-motion-linear",
  ])
    assert.ok(tokens.includes(token), token);
  assert.ok(layout.includes(".view-stage.ds-page"));
  assert.ok(layout.includes("atelier-credit-footer"));
  assert.ok(primitives.includes("https://alles-automatisch.de/"));
  assert.ok(primitives.includes('rel="noopener noreferrer"'));
  assert.ok(template.includes("view-stage ds-page"));
  assert.ok(compact(motion).includes("--at-fast:var(--ds-motion-fast)"));
  assert.ok(print.includes("AtelierUI.attribution()"));
  const editorStyle = compiled.match(/const EDITOR_STYLE = ("(?:[^"\\]|\\.)*");/);
  assert.ok(editorStyle);
  assert.ok(JSON.parse(editorStyle[1]).includes("--ds-motion-fast: 140ms;"));
});
test("dark and neutral stone-light palettes share central tokens and theme transitions", () => {
  const tokens = file("src/design-system/tokens.css");
  const motion = file("src/design-system/motion.css");
  const template = file("src/card-core.template.js");
  const standalone = file("web/public/index.html");
  assert.match(tokens, /\.atelier\.light\s*\{[^}]*--at-surface:\s*#f4f1eb/s);
  assert.match(tokens, /\.atelier\.light\s*\{[^}]*--at-panel:\s*#fffdfa/s);
  assert.match(tokens, /\.atelier\.light\s*\{[^}]*--ds-brand-foreground:\s*#fffdfa/s);
  assert.match(tokens, /\.atelier\.light\s*\{[^}]*--ds-photo-fallback:\s*linear-gradient\(145deg, #b8a7a2, #806877\)/s);
  assert.match(file("src/design-system/editorial.css"), /background:\s*var\(--ds-photo-fallback/);
  assert.match(template, /configuredAccent\.toLowerCase\(\) === DEFAULTS\.accent[\s\S]*?\? "#75465d"/);
  assert.match(file("src/design-system/polish.css"), /\.atelier\.light \.hero:after[\s\S]*rgb\(42 31 39 \/ 94%\)/);
  assert.match(tokens, /\.atelier\.light\s*\{[^}]*color-scheme:\s*light/s);
  assert.match(motion, /\.view-stage\.is-theme-entering/);
  assert.match(template, /mealie-atelier-theme-change/);
  assert.match(template, /mealie-atelier-motion-change/);
  assert.match(standalone, /syncShellTheme\(card\._design\.theme\)/);
  assert.match(standalone, /card\._design\.motion \|\| "expressive"/);
  assert.match(standalone, /normalizedTheme === "light" \? "#f4f1eb"/);
});
test("Ko-fi support is voluntary, discoverable in Design Studio, and styled with shared tokens", () => {
  const dialogs = file("src/components/dialogs.js");
  const styles = file("src/design-system/polish.css");
  const architecture = file("docs/ARCHITECTURE.md");
  assert.ok(dialogs.includes("https://ko-fi.com/allesautomatisch"));
  assert.ok(dialogs.includes('class="settings-group support-group"'));
  assert.ok(dialogs.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(styles.includes(".atelier .support-link:focus-visible"));
  assert.ok(styles.includes("var(--ds-space-4)"));
  assert.ok(
    architecture.includes(
      "never use timed prompts, blocking dialogs, repeated banners, or donation gating",
    ),
  );
  const funding = file(".github/FUNDING.yml");
  assert.ok(funding.includes("ko_fi: allesautomatisch"));
});
test("motion values are tokenized across all shared stylesheets", () => {
  const styles = [
    "foundation.css",
    "editorial.css",
    "kitchen.css",
    "motion.css",
    "adaptive.css",
    "layout.css",
    "components.css",
    "controls.css",
    "polish.css",
    "control-refinement.css",
    "editor.css",
  ]
    .map((name) => file("src/design-system/" + name))
    .join("\n");
  assert.doesNotMatch(styles, /(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)\b|cubic-bezier\(/);
  const shell = file("web/public/shell.css");
  const shellRules = shell.replace(/:root\s*\{[^}]*\}/, "");
  assert.doesNotMatch(shellRules, /(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)\b|cubic-bezier\(/);
  for (const name of [
    "--ds-motion-fast",
    "--ds-motion-base",
    "--ds-motion-enter",
    "--ds-motion-slow",
    "--ds-motion-ease",
    "--ds-motion-reduced",
  ]) {
    const value = (css) =>
      css.match(new RegExp(name.replaceAll("-", "\\-") + ":\\s*([^;]+);"))?.[1].trim();
    assert.equal(value(shell), value(file("src/design-system/tokens.css")), name + " shell parity");
  }
});
test("inline styles are reserved for validated instance values", () => {
  const sources = [
    "src/card-core.template.js",
    "src/components/views.js",
    "src/components/dialogs.js",
  ];
  const styles = sources.flatMap((path) =>
    [...file(path).matchAll(/style="([^"]*)"/g)].map((match) => match[1]),
  );
  assert.ok(styles.length > 0);
  for (const value of styles)
    assert.match(
      compact(value),
      /^(?:--at-accent:|--at-cols:|width:\$\{\(\(idx\+1\)|background:\$\{color\}|--timer-progress:\$\{progress===null\?0:progress\.toFixed\(2\)\}%)/,
      value,
    );
});
test("container queries handle HA dashboard card width instead of only viewport", () => {
  const text = file("src/design-system/layout.css");
  for (const q of ["max-width: 1180px", "max-width: 860px", "max-width: 760px", "max-width: 430px"])
    assert.ok(text.includes(q), q);
  assert.ok(!text.includes("grid-template-columns:1fr 1.2fr"));
  assert.match(compiled, /scroll-snap-align:\s*center/);
});

test("narrow dialogs keep nutrition actions and recipe-step controls readable", () => {
  const text = file("src/design-system/polish.css");
  assert.ok(compactCss(text).includes("@container atelier-card (max-width:460px)"));
  assert.ok(
    compactCss(text).includes(
      ".atelier .editor-step{grid-template-columns:23px minmax(0,1fr) 44px;}",
    ),
  );
  assert.ok(
    compactCss(text).includes(
      ".atelier .nutri-actions{display:grid;grid-template-columns:minmax(0,1fr);}",
    ),
  );
  assert.ok(
    compactCss(text).includes(
      ".atelier .nutri-actions>.btn{width:100%;min-width:0;white-space:normal;}",
    ),
  );
});

test("iPhone Duo outer and inner display poses have dedicated responsive layouts", () => {
  const text = file("src/design-system/polish.css");
  for (const pose of [
    "@container atelier-card (min-width:600px) and (max-width:760px)",
    "@media (orientation:portrait) and (max-width:520px)",
    "@media (orientation:landscape) and (max-height:520px)",
    "@media (orientation:landscape) and (min-height:521px) and (max-height:700px)",
    "@container atelier-card (min-width:431px) and (max-width:520px)",
    "@container atelier-card (min-width:521px) and (max-width:760px)",
    ".atelier .modal.large:has(> .modal-hero)",
    ".atelier .modal.large:has(> .modal-hero) > .modal-content{grid-column:2;grid-row:1;max-height:100%;overflow-y:auto;padding:18px 17px 22px;}",
    "env(safe-area-inset-top)",
    "env(safe-area-inset-bottom)",
    ".atelier .sidebar .nav>button:focus-visible{outline-offset:-3px;}",
    ".atelier .cook-layout{grid-template-columns:minmax(260px,0.82fr) minmax(0,1.18fr);min-height:0;}",
  ]) {
    const normalized = pose.replace(/\s+/g, " ").replace(/\s*([{}:;,>])\s*/g, "$1");
    assert.ok(compactCss(text).includes(normalized) || compact(text).includes(compact(pose)), pose);
  }
});

test("historical stylesheets and views are migrated into source-owned components", () => {
  for (const legacy of [
    "legacy-base.css",
    "premium-v04.css",
    "studio-v06.css",
    "atelier-motion-v08.css",
  ])
    assert.equal(
      existsSync(new URL("src/" + legacy, root)),
      false,
      "Legacy CSS must not return: " + legacy,
    );
  for (const modern of [
    "foundation.css",
    "editorial.css",
    "kitchen.css",
    "motion.css",
    "adaptive.css",
    "tokens.css",
    "layout.css",
    "components.css",
    "controls.css",
    "polish.css",
  ])
    assert.ok(file("src/design-system/" + modern).length > 400, modern);
  for (const part of [
    "print-document.js",
    "views.js",
    "print-actions.js",
    "nutrition-journal.js",
    "dialogs.js",
    "editor.js",
  ])
    assert.ok(file("src/components/" + part).length > 700, part);
  for (const [part, exportName] of [
    ["views.js", "viewMethods"],
    ["print-actions.js", "printActionMethods"],
    ["nutrition-journal.js", "nutritionJournalMethods"],
    ["dialogs.js", "dialogMethods"],
  ]) {
    const moduleSource = file("src/components/" + part);
    assert.match(moduleSource, new RegExp(`export const ${exportName} = \\{`), part);
    assert.match(compiled, new RegExp(`const ${exportName} = \\{`), part);
  }
  for (const part of ["ATELIER_PRINT_DOCUMENT", "ATELIER_COMPONENT_METHODS", "ATELIER_HA_EDITOR"])
    assert.equal(
      compiled.includes("/* " + part + " */"),
      false,
      "Unresolved build placeholder " + part,
    );
  assert.ok(!file("scripts/build-design-system.mjs").includes("cloneLegacyMedia"));
  assert.equal(compiled, file("web/public/mealie-atelier-cards.js"));
});

test("recipe steps render structured headings and safe proxied photos without inline Mealie HTML", () => {
  const dialogs = file("src/components/dialogs.js");
  const template = file("src/card-core.template.js");
  const css = file("src/design-system/editorial.css");
  assert.ok(dialogs.includes("instructionImages(step)"));
  assert.ok(dialogs.includes('class="step-photo"'));
  assert.ok(dialogs.includes('class="cook-step-figure"'));
  assert.ok(
    dialogs.includes("this._detail.recipeYieldQuantity"),
    "Cooking mode must retain the visible count when Mealie supplies a yield unit",
  );
  assert.ok(dialogs.includes('class="step-section"'));
  assert.ok(compact(template).includes('data-step-id="${esc(id)}"'));
  assert.ok(template.includes("recipe-asset"));
  assert.ok(css.includes(".atelier .cook-step-photo"));
  assert.ok(css.includes(".atelier .step-photos"));
  assert.ok(
    compactCss(file("src/design-system/adaptive.css")).includes(
      ".atelier .cook-controls{order:3;}",
    ),
    "Mobile cooking content must stay ahead of timer utilities",
  );
});
