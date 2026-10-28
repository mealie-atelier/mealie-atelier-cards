/** Build the shared card bundle from styles, locale resources, and focused source modules. */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const folder = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(folder, "src/card-core.template.js");
const destination = resolve(folder, "dist/mealie-atelier-cards.js");
const web = resolve(folder, "web/public/mealie-atelier-cards.js");
const cssFiles = [
  "src/design-system/foundation.css",
  "src/design-system/editorial.css",
  "src/design-system/kitchen.css",
  "src/design-system/motion.css",
  "src/design-system/adaptive.css",
  "src/design-system/tokens.css",
  "src/design-system/layout.css",
  "src/design-system/components.css",
  "src/design-system/controls.css",
  "src/design-system/polish.css",
  "src/design-system/control-refinement.css",
  "src/design-system/recipe-editor.css", // feature B
  "src/design-system/shopping-sync.css",
  "src/design-system/recipe-picker.css", // feature D
];
const content = cssFiles.map((file) => readFileSync(resolve(folder, file), "utf8").trim());
const styleBegin = "const STYLE = `<style>\n";
const styleEnd = "</style>`;";
const startMarker = "/* ATELIER STUDIO EXTENSION START */";
const endMarker = "/* ATELIER STUDIO EXTENSION END */";
let text = readFileSync(source, "utf8");
const localeFiles = readdirSync(resolve(folder, "src/i18n"))
  .filter((file) => /^[a-z]{2}(?:-[A-Z]{2})?\.json$/.test(file))
  .map((file) => file.replace(/\.json$/, ""))
  .sort();
if (!localeFiles.includes("en"))
  throw Error("English locale is required as the canonical fallback");
const localeResources = Object.fromEntries(
  localeFiles.map((locale) => [
    locale,
    JSON.parse(readFileSync(resolve(folder, `src/i18n/${locale}.json`), "utf8")),
  ]),
);
const i18nSlot = "/* ATELIER_I18N */";
if (!text.includes(i18nSlot)) throw Error("Missing localization slot");
text = text.replace(
  i18nSlot,
  () =>
    `const LABELS = ${JSON.stringify(localeResources)};\n` +
    readFileSync(resolve(folder, "src/i18n/resolver.js"), "utf8").trim(),
);
const a = text.indexOf(styleBegin),
  b = text.indexOf(styleEnd, a);
if (a < 0 || b < a) throw Error("Cannot locate theme block");
// Explicit responsive adapters are source-controlled, not rewritten at build time.
const css = content.join("\n\n");
if (css.includes("</style") || css.includes("`")) throw Error("Unsafe CSS text");
text = text.slice(0, a) + styleBegin + css + "\n" + text.slice(b);
const i = text.indexOf(startMarker),
  j = text.indexOf(endMarker);
if (i >= 0 && j > i) text = text.slice(0, i) + text.slice(j + endMarker.length);
const anchor = "class AtelierTodayCard extends MealieAtelierCard";
if (!text.includes(anchor)) throw Error("Cannot locate studio insertion anchor");
const editorCssSource = readFileSync(
  resolve(folder, "src/design-system/editor.css"),
  "utf8",
).trim();
const tokenSource = readFileSync(resolve(folder, "src/design-system/tokens.css"), "utf8");
const hostTokenBlock = tokenSource.match(/:host\s*\{([^}]*)\}/)?.[1];
if (!hostTokenBlock) throw Error("Cannot locate central design tokens");
const editorMotionTokens = [...hostTokenBlock.matchAll(/^\s*(--ds-motion-[\w-]+:\s*[^;]+;)/gm)]
  .map((match) => match[1].trim())
  .join("\n  ");
if (!editorMotionTokens) throw Error("Cannot locate central motion tokens");
const editorCss = editorCssSource.replace(":host {", `:host {\n  ${editorMotionTokens}`);
// Assemble the HA editor as a standalone, shared component rather than keeping it in the monolith.
if (!text.includes("/* ATELIER_HA_EDITOR */")) throw Error("Missing HA editor slot");
text = text.replace(
  "/* ATELIER_HA_EDITOR */",
  () =>
    `const EDITOR_STYLE = ${JSON.stringify(editorCss)};\n\n` +
    readFileSync(resolve(folder, "src/components/editor.js"), "utf8").trim(),
);
const primitives = readFileSync(resolve(folder, "src/design-system/primitives.js"), "utf8").trim();
const studioCore = readFileSync(resolve(folder, "src/studio-core.js"), "utf8").trim();
const studioUi = readFileSync(resolve(folder, "src/studio-ui.js"), "utf8").trim();
text = text.replace(
  anchor,
  () => `${startMarker}\n${primitives}\n${studioCore}\n${studioUi}\n${endMarker}\n\n${anchor}`,
);
const printDocumentSlot = "/* ATELIER_PRINT_DOCUMENT */";
if (!text.includes(printDocumentSlot)) throw Error("Missing print document slot");
text = text.replace(printDocumentSlot, () =>
  readFileSync(resolve(folder, "src/components/print-document.js"), "utf8").trim(),
);

const componentMethodModules = [
  ["viewMethods", "src/components/views.js"],
  ["printActionMethods", "src/components/print-actions.js"],
  ["nutritionJournalMethods", "src/components/nutrition-journal.js"],
  ["dialogMethods", "src/components/dialogs.js"],
  ["recipeEditorMethods", "src/components/recipe-editor.js"], // feature B
  ["shoppingSyncMethods", "src/components/shopping-sync.js"],
  ["recipePickerMethods", "src/components/recipe-picker.js"], // feature D
];
const methodDeclarations = componentMethodModules.map(([name, file]) => {
  const moduleSource = readFileSync(resolve(folder, file), "utf8").trim();
  const exportDeclaration = `export const ${name} = `;
  const exportIndex = moduleSource.indexOf(exportDeclaration);
  if (exportIndex < 0) throw Error(`Cannot locate ${name} export in ${file}`);
  return `${moduleSource.slice(0, exportIndex)}const ${name} = ${moduleSource
    .slice(exportIndex + exportDeclaration.length)
    .replace(/;\s*$/, "")}`;
});
const methodSlot = "/* ATELIER_COMPONENT_METHODS */";
if (!text.includes(methodSlot)) throw Error("Missing component method slot");
text = text.replace(
  methodSlot,
  () =>
    `${methodDeclarations.join("\n\n")}\n\nObject.assign(MealieAtelierCard.prototype, ${componentMethodModules.map(([name]) => name).join(", ")});`,
);
writeFileSync(destination, text);
writeFileSync(web, text);
console.log(`Built ${cssFiles.length} style modules and shared UI primitives.`);
