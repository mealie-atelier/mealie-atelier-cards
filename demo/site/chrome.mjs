// Shared page chrome of the demo site: helpers, icon sprite, header and footer.
// Used by the landing pages and the recipe pages so the whole site reads as one piece.

export const links = {
  cards: "https://github.com/mealie-atelier/mealie-atelier-cards",
  bridge: "https://github.com/mealie-atelier/mealie-atelier-bridge",
  webApp: "https://github.com/mealie-atelier/mealie-atelier-cards/tree/main/web#readme",
  changelog: "https://github.com/mealie-atelier/mealie-atelier-cards/blob/main/CHANGELOG.md",
  discussions: "https://github.com/orgs/mealie-atelier/discussions",
  guide: "https://alles-automatisch.de/lernen/mealie-atelier",
  setup: "https://alles-automatisch.de/lernen/mealie-atelier-einrichten",
  setupWeb:
    "https://alles-automatisch.de/lernen/mealie-atelier-einrichten#variante-b-mealie-atelier-ohne-home-assistant",
  troubleshooting: "https://alles-automatisch.de/lernen/mealie-atelier-fehlerbehebung",
  youtube: "https://www.youtube.com/@alles-automatisch/join",
  kofi: "https://ko-fi.com/allesautomatisch",
  author: "https://alles-automatisch.de/",
};

// Section anchors per locale. Tests read this list, so a renamed section fails loudly.
export const sectionIds = {
  de: {
    compare: "vergleich",
    demo: "live-demo",
    everyday: "alltag",
    features: "funktionen",
    devices: "geraete",
    homeAssistant: "home-assistant",
    webApp: "ohne-home-assistant",
    ai: "ki",
    recipes: "rezepte",
    openSource: "open-source",
    install: "installieren",
  },
  en: {
    compare: "compare",
    demo: "live-demo",
    everyday: "everyday",
    features: "features",
    devices: "devices",
    homeAssistant: "home-assistant",
    webApp: "without-home-assistant",
    ai: "ai",
    recipes: "recipes",
    openSource: "open-source",
    install: "install",
  },
};

export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
  );
}

export const translator = (locale) => (de, en) => (locale === "de" ? de : en);

export function ext(href, inner, className = "") {
  const attribute = className ? ` class="${className}"` : "";
  return `<a${attribute} href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
}

export const icon = (name, className = "") =>
  `<svg class="i${className ? ` ${className}` : ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const stroke =
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const symbols = {
  arrow: `<path d="M5 12h14M13 6l6 6-6 6"/>`,
  ext: `<path d="M7 17 17 7M9 7h8v8"/>`,
  check: `<path d="m5 12.5 4.5 4.5L19 7.5"/>`,
  play: `<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" stroke="none"/>`,
  timer: `<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>`,
  cart: `<path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 8H6.2"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>`,
  cal: `<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>`,
  spark: `<path d="M12 3.5 13.8 9l5.7 1.9-5.7 1.9L12 18.5l-1.8-5.7L4.5 11l5.7-1.9Z"/><path d="M19 3v3M17.5 4.5h3"/>`,
  jar: `<path d="M8 3h8v3H8z"/><path d="M7 6h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><path d="M5 11h14"/>`,
  book: `<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>`,
  kids: `<circle cx="8" cy="6.5" r="2.8"/><circle cx="17" cy="9" r="2.2"/><path d="M3 20c0-3.6 2.2-6 5-6s5 2.4 5 6M13.5 20c.2-2.8 1.6-4.6 3.5-4.6S20.3 17.2 20.5 20"/>`,
  ha: `<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><circle cx="12" cy="13.5" r="2"/><path d="M12 15.5V20M9 17.5l3-2 3 2"/>`,
  server: `<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><path d="M7.5 7.5h.01M7.5 16.5h.01"/>`,
  lock: `<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>`,
  shield: `<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/>`,
  phone: `<rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.5 18.5h3"/>`,
  tablet: `<rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="M18.5 12h.01"/>`,
  monitor: `<rect x="2.5" y="4" width="19" height="13" rx="2.5"/><path d="M8.5 21h7M12 17v4"/>`,
  globe: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>`,
  github: `<path fill="currentColor" stroke="none" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>`,
  heart: `<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"/>`,
  coffee: `<path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6Z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5c0 1 .8 1.5.8 2.5M12 3.5c0 1 .8 1.5.8 2.5"/>`,
  yt: `<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor"/>`,
  print: `<path d="M6.5 9V3.5h11V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M6.5 14.5h11v6h-11z"/>`,
  drag: `<path d="M9 7 4 12l5 5M15 7l5 5-5 5"/>`,
  bell: `<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>`,
  edit: `<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>`,
  leaf: `<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-6.5 9.5-8"/>`,
  download: `<path d="M12 4v11M7 10.5l5 5 5-5M4.5 20h15"/>`,
  sync: `<path d="M20 11a8 8 0 0 0-14.3-4.3L4 9M4 4v5h5M4 13a8 8 0 0 0 14.3 4.3L20 15M20 20v-5h-5"/>`,
  menu: `<path d="M4 7h16M4 12h16M4 17h16"/>`,
  close: `<path d="M6 6l12 12M18 6 6 18"/>`,
  offline: `<path d="M2 8.5a15 15 0 0 1 4.2-2.6M9.5 5.1A15 15 0 0 1 22 8.5M5 12a10 10 0 0 1 3-1.9M13.4 10.2A10 10 0 0 1 19 12M8.5 15.5a5 5 0 0 1 7 0M12 19.5h.01M3 3l18 18"/>`,
};

export function iconSprite() {
  const body = Object.entries(symbols)
    .map(([name, path]) => `<symbol id="i-${name}" viewBox="0 0 24 24" ${stroke}>${path}</symbol>`)
    .join("");
  return `<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>${body}</defs></svg>`;
}

// The Week Dial mark (cream plate, week rim, paprika today segment, herb leaf). The artwork is
// the CSS background of .brand-mark, so the markup needs no arguments.
export const brandMark = () => `<span class="brand-mark" aria-hidden="true"></span>`;

// Favicon (SVG with an ICO fallback) and touch icon, all from the Week Dial masters.
export const iconLinks = (prefix) =>
  `<link rel="icon" href="${prefix}favicon.ico" sizes="32x32"><link rel="icon" type="image/svg+xml" href="${prefix}favicon.svg"><link rel="apple-touch-icon" href="${prefix}apple-touch-icon.png"><link rel="manifest" href="${prefix}site.webmanifest">`;

// ctx: { locale, home: { de, en }, alternate: { de, en }, creditsUrl, onLanding }
function anchor(ctx, key) {
  const id = sectionIds[ctx.locale][key];
  return ctx.onLanding ? `#${id}` : `${ctx.home[ctx.locale]}#${id}`;
}

// The three switches carry distinct names so a landmark list never shows two identical entries.
function languageSwitch(ctx, className, place) {
  const names = {
    de: { top: "Sprache", drawer: "Sprache im Menü", foot: "Sprache im Fußbereich" },
    en: { top: "Language", drawer: "Language in the menu", foot: "Language in the footer" },
  };
  const label = names[ctx.locale][place];
  const item = (code, name) =>
    `<a href="${escapeHtml(ctx.alternate[code])}" hreflang="${code}" lang="${code}"${code === ctx.locale ? ' aria-current="page"' : ""}><span aria-hidden="true">${code.toUpperCase()}</span><span class="sr">${name}</span></a>`;
  return `<nav class="${className}" aria-label="${label}">${item("de", "Deutsch")}${item("en", "English")}</nav>`;
}

export function renderSiteHeader(ctx) {
  const t = translator(ctx.locale);
  const nav = [
    ["compare", t("Vergleich", "Compare")],
    ["demo", t("Live-Demo", "Live demo")],
    ["features", t("Funktionen", "Features")],
    ["homeAssistant", "Home Assistant"],
    ["webApp", t("Web-App", "Web app")],
    ["recipes", t("Rezepte", "Recipes")],
  ];
  const drawer = [
    ["compare", t("Vorher und nachher", "Before and after")],
    ["demo", t("Live-Demo", "Live demo")],
    ["everyday", t("Eine Woche in der Küche", "A week in your kitchen")],
    ["features", t("Funktionen", "Features")],
    ["devices", t("Geräte", "Devices")],
    ["homeAssistant", "Home Assistant"],
    ["webApp", t("Ohne Home Assistant", "Without Home Assistant")],
    ["ai", t("KI-Helfer", "AI helpers")],
    ["recipes", t("Rezepte", "Recipes")],
  ];
  const link = ([key, label]) => `<a href="${anchor(ctx, key)}">${label}</a>`;
  const homeLabel = t("Mealie Atelier, zur Startseite", "Mealie Atelier, home");
  return `${iconSprite()}<a class="skip" href="#main">${t("Zum Inhalt springen", "Skip to content")}</a><div class="progress" aria-hidden="true"></div><header class="top" id="top"><div class="wrap top-row"><a class="brand" href="${escapeHtml(ctx.home[ctx.locale])}" aria-label="${homeLabel}">${brandMark()}<b>Mealie Atelier</b></a><nav class="nav" aria-label="${t("Hauptnavigation", "Main navigation")}">${nav.map(link).join("")}</nav>${languageSwitch(ctx, "lang-switch top-lang", "top")}<a class="btn btn-primary top-cta" href="${anchor(ctx, "install")}">${t("Installieren", "Install")}</a><button class="menu-btn" type="button" aria-expanded="false" aria-controls="drawer" data-open-label="${t("Menü öffnen", "Open menu")}" data-close-label="${t("Menü schließen", "Close menu")}" aria-label="${t("Menü öffnen", "Open menu")}">${icon("menu")}</button></div><div class="drawer" id="drawer" hidden>${drawer.map(link).join("")}${languageSwitch(ctx, "lang-switch drawer-lang", "drawer")}<a class="btn btn-primary" href="${anchor(ctx, "install")}">${t("Kostenlos installieren", "Install for free")}</a></div></header>`;
}

export function renderSiteFooter(ctx) {
  const t = translator(ctx.locale);
  const local = (key, label) => `<li><a href="${anchor(ctx, key)}">${label}</a></li>`;
  // The arrow is glued to the last word, so a wrapping label never leaves it alone on a line.
  const trailing = (label) =>
    label.replace(/(\S+)$/, `<span class="nowrap">$1${icon("ext", "trail")}</span>`);
  const remote = (href, label, iconName = "ext") =>
    `<li>${ext(href, iconName === "ext" ? trailing(label) : `${icon(iconName)}${label}`)}</li>`;
  const column = (title, rows) =>
    `<div class="foot-col"><h2>${title}</h2><ul>${rows.join("")}</ul></div>`;
  const heart = `<span class="heart" role="img" aria-label="${t("Liebe", "love")}">♥</span>`;
  // Every page shows the same two support tiles here, the landing page included.
  const support = `<div class="foot-support">${ext(links.youtube, `${icon("yt")}<span><b>${t("Kanalmitglied werden", "Become a channel member")}</b><small>${t("Alles Automatisch auf YouTube", "Alles Automatisch on YouTube")}</small></span>`, "support-link")}${ext(links.kofi, `${icon("coffee")}<span><b>${t("Einen Kaffee ausgeben", "Buy me a coffee")}</b><small>${t("Unterstützen über Ko-fi", "Support on Ko-fi")}</small></span>`, "support-link")}</div>`;
  return `<footer class="site-footer"><div class="foot-glow" aria-hidden="true"></div><div class="wrap foot-top"><div class="foot-brand"><a class="brand" href="${escapeHtml(ctx.home[ctx.locale])}">${brandMark()}<b>Mealie Atelier</b></a><p class="promise">${t("Eine ruhige Küche für dein Mealie. Jeden Tag.", "A calm kitchen for your Mealie. Every day.")}</p><p class="foot-sub">${t("Kostenlos, Open Source und selbst gehostet. Für Home Assistant oder als eigene Web-App.", "Free, open source and self-hosted. For Home Assistant or as a web app of its own.")}</p>${support}</div><div class="foot-cols">${column(
    t("Produkt", "Product"),
    [
      local("demo", t("Live-Demo", "Live demo")),
      local("features", t("Funktionen", "Features")),
      local("homeAssistant", t("Mit Home Assistant", "With Home Assistant")),
      local("webApp", t("Ohne Home Assistant", "Without Home Assistant")),
      local("recipes", t("Rezepte", "Recipes")),
    ],
  )}${column(t("Anleitungen", 'Guides <span class="col-note">in German</span>'), [
    remote(links.guide, t("Überblick", "Overview")),
    remote(links.setup, t("Mit Home Assistant einrichten", "Set up with Home Assistant")),
    remote(links.setupWeb, t("Web-App einrichten", "Set up the web app")),
    remote(links.troubleshooting, t("Fehlerbehebung", "Troubleshooting")),
  ])}${column("Open Source", [
    remote(links.cards, "Cards", "github"),
    remote(links.bridge, "Bridge", "github"),
    remote(links.discussions, t("Fragen und Ideen", "Questions and ideas")),
    remote(links.changelog, t("Änderungen", "Changelog")),
  ])}</div></div><p class="wordmark" aria-hidden="true">Atelier</p><div class="wrap foot-base"><div class="legal"><p>© 2026 Mealie Atelier · ${t("MIT-Lizenz", "MIT license")} · <a class="foot-credits" href="${escapeHtml(ctx.creditsUrl)}">${t("Bildnachweise", "Photo credits")}</a></p><p class="disclaimer">${t("Inoffizielle Ergänzung, nicht mit Mealie oder Home Assistant verbunden.", "Unofficial companion, not affiliated with Mealie or Home Assistant.")}</p></div>${languageSwitch(ctx, "lang-switch foot-lang", "foot")}<p class="made">${t(`Mit ${heart} gemacht von`, `Made with ${heart} by`)} ${ext(links.author, "Daniel")}</p></div></footer>`;
}
