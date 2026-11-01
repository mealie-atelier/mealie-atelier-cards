import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const rule = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `rule ${selector} exists`);
  return css.slice(at, css.indexOf("}", at));
};

test("print style tiles share one fixed square size", () => {
  const body = rule(
    read("../src/design-system/foundation.css"),
    ".atelier .print-option .print-symbol",
  );
  assert.match(body, /inline-size: 44px/);
  assert.match(body, /block-size: 44px/);
  assert.match(body, /flex: none/);
  assert.match(body, /box-sizing: border-box/);
  assert.match(body, /place-items: center/);
});

test("the editor check row keeps a gap to the first step card", () => {
  const body = rule(
    read("../src/design-system/mobile-forms.css"),
    ".atelier .editor-card .editor-check + .editor-steps",
  );
  assert.match(body, /margin-top: var\(--ds-space-3\)/);
  assert.match(read("../src/components/dialogs.js"), /editor-check[^]{0,400}editor-steps/);
});

test("a finished shared timer row is styled like a finished cook timer", () => {
  const css = read("../src/design-system/components.css");
  assert.match(
    css,
    /\.studio-timer-row\.is-done \.cook-timer-status \{\s*color: var\(--ds-brand-text\)/,
  );
  assert.match(css, /\.studio-timer-row\.is-done \.cook-timer-status::before \{\s*animation: none/);
  assert.match(css, /\.studio-timer-row\.is-done b \{[^}]*font-weight: 800/);
});

test("long unbroken names wrap in the sync dialog", () => {
  const css = read("../src/design-system/shopping-sync.css");
  const body = rule(css, ".atelier .sync-list > li,\n.atelier .sync-record,\n.atelier .sync-audit");
  assert.match(body, /min-width: 0/);
  assert.match(body, /overflow-wrap: anywhere/);
  assert.match(
    css,
    /\.modal \.editor-lead p,\n\.atelier \.sync-record strong \{\s*overflow-wrap: anywhere/,
  );
});

test("the changelog dates 0.12.1 on 2026-11-01", () => {
  assert.match(read("../CHANGELOG.md"), /^## \[0\.12\.1\] - 2026-11-01$/m);
});

const src = read("../src/studio-ui.js");
const start = src.indexOf("const atDiscoverDraft");
const draftFn = runInNewContext(
  `const AtelierStudio = { discoverMinutes: (m) => Math.round((Number(m) || 30) / 10) * 10 };
${src.slice(start, src.indexOf("\n};\n", start) + 4)}
atDiscoverDraft`,
  { Number, Math },
);

test("discover draft is rebuilt from the first real state when untouched", () => {
  const placeholder = { revision: 0, profile: { people: 2 } };
  const real = { revision: 7, profile: { people: 6, maxMinutes: 40 } };
  const first = draftFn(placeholder, null);
  assert.equal(first.people, 2);
  assert.equal(first.placeholder, true);
  const rebuilt = draftFn(real, first);
  assert.equal(rebuilt.people, 6);
  assert.equal(rebuilt.placeholder, false);
  assert.equal(draftFn(real, rebuilt), rebuilt);
});

test("a touched placeholder draft is kept and the step survives a rebuild", () => {
  const first = draftFn({ revision: 0, profile: {} }, null);
  first.touched = true;
  assert.equal(draftFn({ revision: 3, profile: { people: 6 } }, first), first);
  const moved = draftFn({ revision: 0, profile: {} }, null);
  moved.step = 2;
  assert.equal(draftFn({ revision: 3, profile: { people: 6 } }, moved).step, 2);
});

test("placeholder values never go through profile_set", () => {
  assert.match(src, /can_write && !\(d\.placeholder && !d\.touched\)/);
  assert.match(src, /draft\.touched = true/);
});
