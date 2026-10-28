import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("native checkboxes and task checkbuttons have one authoritative design-system module", () => {
  const shared = source("src/design-system/controls.css");
  assert.match(shared, /input\[type="checkbox"\]/);
  assert.match(shared, /--ds-check-target:\s*44px/);
  assert.match(shared, /\.studio-check/);
  assert.match(shared, /:focus-visible/);
  assert.match(shared, /prefers-reduced-motion/);
  assert.match(shared, /forced-colors/);
  for (const filename of [
    "design-system/foundation.css",
    "design-system/editorial.css",
    "design-system/kitchen.css",
    "design-system/motion.css",
    "design-system/components.css",
  ]) {
    const css = source(`src/${filename}`);
    assert.doesNotMatch(css, /\.atelier \.studio-inline input\s*\{/);
    assert.doesNotMatch(css, /\.atelier \.studio-book-row input\s*\{/);
    assert.doesNotMatch(css, /\.atelier \.studio-check\.done\s*\{/);
    assert.doesNotMatch(css, /\.atelier \.check-ui\s*\{/);
    assert.doesNotMatch(css, /\.atelier \.ingredient input\s*\{/);
  }
});

test("shopping and cooking helper checkbuttons expose accessible checkbox state", () => {
  const template = source("src/components/views.js");
  const studio = source("src/studio-ui.js");
  assert.match(template, /class="check-ui"[^`]+role="checkbox" aria-checked=/);
  assert.match(studio, /role="checkbox" aria-checked=/);
});

test("cookbook selection counter is linked to the selected state", () => {
  const studio = source("src/studio-ui.js");
  assert.match(studio, /data-book-selected-count/);
  assert.match(studio, /\[data-book-selected-count\]/);
});

test("cooking timers use labelled countdown cards, duration presets, and accessible controls", () => {
  const dialog = source("src/components/dialogs.js");
  const core = source("src/card-core.template.js");
  const compactCore = core.replace(/\s+/g, "");
  const studio = source("src/studio-ui.js");
  const design = source("src/design-system/components.css");
  assert.match(dialog, /cook-timer-card/);
  assert.match(dialog, /cook-controls/);
  assert.match(dialog, /data-timer-ring/);
  assert.match(dialog, /role="timer"/);
  assert.match(dialog, /data-action="timer-preset"/);
  assert.match(dialog, /data-timer-label/);
  assert.match(core, /durationMs:\s*minutes\s*\*\s*60000/);
  assert.match(core, /uiKitchenTimer/);
  assert.match(core, /locale:\s*this\._language/);
  assert.match(core, /uiBackgroundTimerEnabled/);
  assert.match(core, /uiBackgroundTimerError/);
  assert.match(core, /action\s*===\s*["']timer-preset["']/);
  assert.match(core, /ring\.style\.setProperty\(["']--timer-progress["']/);
  assert.match(studio, /previous\.get\(String\(x\.id\)\)/);
  assert.match(design, /\.cook-timer-card/);
  assert.match(design, /\.cook-actions\s*\{\s*order:\s*3;/);
  assert.match(design, /\.cook-utility\s*\{\s*order:\s*4;/);
  assert.match(design, /orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)/);
  assert.match(design, /prefers-reduced-motion/);
});

test("visual HA card editor uses the same geometry and associated labels", () => {
  const template = source("src/components/editor.js");
  const editor = source("src/design-system/editor.css");
  assert.match(template, /for="atelier-theme"/);
  assert.match(template, /data-key="print_image"/);
  assert.match(template, /class="section-head"/);
  assert.match(editor, /min-height:\s*48px/);
  assert.match(editor, /min-width:\s*22px/);
});

test("first-run card setup is a skippable three-step wizard with secure integration handoff", () => {
  const template = source("src/components/editor.js");
  const design = source("src/design-system/editor.css");
  for (const value of [
    "editorConnectKitchen",
    "editorChooseYourStart",
    "editorSetTheMood",
    "setup-progress",
    "setup_complete",
    "step-next",
    "step-back",
    "editorSetUpLater",
    "/config/integrations",
    "_setup_complete",
    "editorRunSetupWizard",
    "editor-advanced",
  ])
    assert.ok(template.includes(value), value);
  assert.doesNotMatch(template, /data-key="api_token"|data-key="mealie_url"/);
  assert.match(design, /.setup-progress/);
  assert.match(design, /.setup-preset:focus-visible/);
  assert.match(design, /prefers-reduced-motion:\s*reduce/);
});

test("Home Assistant Mealie fallback is read-only, credential-safe, and visibly capability-limited", () => {
  const core = source("src/card-core.template.js");
  const compactCore = core.replace(/\s+/g, "");
  const editor = source("src/components/editor.js");
  const views = source("src/components/views.js");
  const compactViews = views.replace(/\s+/g, "");
  const studio = source("src/studio-ui.js");
  const compactStudio = studio.replace(/\s+/g, "");
  const dialogs = source("src/components/dialogs.js");
  const compactDialogs = dialogs.replace(/\s+/g, "");
  const architecture = source("docs/ARCHITECTURE.md");
  assert.match(core, /provider:\s*["']auto["']/);
  assert.ok(
    core
      .replace(/\s+/g, "")
      .includes('callService("mealie",action,{config_entry_id,...data},undefined,false,true,)'),
    "Native service calls must use the configured Mealie entry and disable response handling",
  );
  assert.match(core, /result_limit:\s*500/);
  assert.match(compactCore, /constpayload=response\?\.recipes\?\?response/);
  assert.match(compactCore, /payload\?\.items\|\|payload\?\.data/);
  assert.match(
    compactCore,
    /per_page:24,total_pages:Math\.max\(1,Math\.ceil\(items\.length\/24\)\)/,
  );
  assert.match(compactCore, /upstream:\{page:/);
  assert.match(
    compactCore,
    /if\(this\._providerActive===["']home_assistant["']\)\{this\._data\.recipes=awaitthis\._nativeRecipes\(this\._query\)/,
  );
  assert.match(
    compactViews,
    /constlocalPage=this\._providerActive===["']home_assistant["']&&limit===24/,
  );
  assert.match(compactViews, /recipes\.slice\(\(this\._page-1\)\*limit,this\._page\*limit\)/);
  assert.match(compactCore, /if\(this\._providerActive===["']home_assistant["']\)/);
  assert.match(compactCore, /imageUrl:["']["']/);
  assert.match(
    compactCore,
    /this\._config\.provider===["']auto["']&&result\[0\]\.status===["']rejected["']&&this\._hasNativeMealie/,
  );
  assert.ok(
    compactCore.indexOf('if(this._config.provider==="auto"&&result[0].status==="rejected"') <
      compactCore.indexOf('if(failures.length&&result.every((r)=>r.status==="rejected")'),
  );
  assert.match(editor, /editorHomeAssistantMealieFound/);
  assert.match(editor, /atelier-mealie_entry_id/);
  assert.match(
    views,
    /uiUpTo500MatchesThroughHomeAssistantPhotosAndAtelierWriteFeaturesStayDisabledForSecurity/,
  );
  assert.match(
    compactStudio,
    /this\._providerActive===["']home_assistant["']&&this\._view!==["']recipes["']/,
  );
  assert.match(
    compactStudio,
    /this\._providerActive===["']home_assistant["']\?"":`<buttonclass="btntiny"data-action="studio-ai-audit"/,
  );
  assert.match(
    compactDialogs,
    /this\._providerActive===["']home_assistant["']\?"":`<buttonclass="btn"data-action="nutrition-open"/,
  );
  assert.match(
    compactDialogs,
    /this\._providerActive===["']home_assistant["']\?m===["']recipes["']/,
  );
  assert.match(architecture, /never call Mealie directly from the browser/);
});

test("all shared button groups use the same spacing and icon alignment", () => {
  const tokens = source("src/design-system/tokens.css");
  const polish = source("src/design-system/polish.css");
  for (const token of [
    "--ds-control-padding-x",
    "--ds-control-gap",
    "--ds-control-icon",
    "--ds-action-gap",
  ])
    assert.ok(tokens.includes(token), token);
  assert.match(polish, /\.atelier \.btn > svg/);
  assert.match(polish, /\.atelier \.form-actions/);
  assert.match(polish, /\.atelier \.shopping-list-filter/);
  assert.match(polish, /\.atelier select \{/);
  assert.match(polish, /appearance:\s*none/);
  assert.match(polish, /background-position:\s*right 15px center/);
  assert.match(polish, /\.atelier \.btn\.icon-only\s*\{\s*min-width:\s*48px/);
  const views = source("src/components/views.js");
  assert.match(views, /class="shopping-toolbar"|class="toolbar shopping-toolbar"/);
  assert.match(views, /class="shopping-list-filter"/);
  assert.doesNotMatch(views, /max-width:250px/);
});
test("visual editor custom selects use the shared offset and a stable focus target", () => {
  const editor = source("src/design-system/editor.css");
  assert.match(editor, /background-position:\s*right 15px center/);
  assert.match(editor, /padding-inline-end:\s*46px/);
  assert.match(editor, /input\[type="checkbox"\]:focus-visible/);
});

test("final control tokens outrank legacy select rules and preserve decorative icon geometry", () => {
  const tokens = source("src/design-system/tokens.css");
  const refinement = source("src/design-system/control-refinement.css");
  const controls = source("src/design-system/controls.css");
  const editor = source("src/design-system/editor.css");
  const shell = source("web/public/shell.css");
  assert.match(tokens, /--ds-control-height:\s*48px/);
  assert.match(tokens, /--ds-select-clearance:\s*43px/);
  assert.match(refinement, /\.atelier :is\(select:not\(\[multiple\]\):not\(\[size\]\)\)/);
  assert.match(refinement, /padding-inline-end:\s*var\(--ds-select-clearance\)/);
  assert.match(refinement, /\.atelier\.light :is\(select:not\(\[multiple\]\):not\(\[size\]\)\)/);
  assert.doesNotMatch(controls, /\.atelier \.tile-open\s*\{[^}]*min-block-size/);
  assert.match(editor, /min-height:\s*48px/);
  assert.match(shell, /--shell-control:\s*48px/);
});
