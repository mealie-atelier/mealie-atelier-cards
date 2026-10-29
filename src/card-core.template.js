/* Mealie Atelier: zero-dependency web components for Home Assistant (version in VERSION). */
const VERSION = "0.10.0";
const MODES = [
  "dashboard",
  "today",
  "discover",
  "recipes",
  "mealplan",
  "pantry",
  "shopping",
  "family",
  "cookbook",
  "manage",
];
const COLORS = ["#9dcbb2", "#e5ad92", "#a8bdef", "#d3adcd", "#d6c07d"];
// Result cap of the official Home Assistant provider; hitting it means the list may be cut off.
const NATIVE_RESULT_LIMIT = 500;
const DEFAULTS = {
  mode: "dashboard",
  title: "Mealie Atelier",
  theme: "auto",
  accent: "#9dcbb2",
  density: "comfortable",
  columns: 3,
  show_images: true,
  keep_awake: true,
  photo_ratio: "portrait",
  print_style: "editorial",
  print_image: false,
  print_checkboxes: true,
  print_notes: true,
  print_completed: false,
  print_nutrition: false,
  entry_id: "",
  provider: "auto",
  mealie_entry_id: "",
  language: "auto",
  motion: "expressive",
  kiosk_mode: false,
  cooking_scene: "",
  cooking_media_player: "",
  cooking_volume: 0.18,
  cooking_tts_engine: "",
};
const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1Z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2 13h14l2-9H6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .3 1.82l.06.06-2.88 2.88-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.5V21h-4v-.1a1.65 1.65 0 0 0-1-1.5 1.65 1.65 0 0 0-1.82.3l-.06.06-2.88-2.88.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.5-1H3v-4h.1a1.65 1.65 0 0 0 1.5-1 1.65 1.65 0 0 0-.3-1.82l-.06-.06L7.12 4.24l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.5V3h4v.1a1.65 1.65 0 0 0 1 1.5 1.65 1.65 0 0 0 1.82-.3l.06-.06 2.88 2.88-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.5 1h.1v4h-.1a1.65 1.65 0 0 0-1.5 1Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.8-4M4 4v5h5M4 13a8 8 0 0 0 14.8 4M20 20v-5h-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 4 13C4 5 15 3 21 3c0 6-2 17-10 17Z"/><path d="M5 21c0-7 7-13 13-15"/>',
  spark:
    '<path d="m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7ZM19 18l.6 1.4L21 20l-1.4.6L19 22l-.6-1.4L17 20l1.4-.6Z"/>',
  utensils: '<path d="M4 3v7a4 4 0 0 0 8 0V3M8 3v18M19 3c-2 0-3 4-3 9h4V3h-1Zm1 9v9"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  external:
    '<path d="M13 5h6v6M19 5l-9 9"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  edit: '<path d="M12 20h9M4 16l12-12 4 4-12 12H4v-4Z"/>',
  trash:
    '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l0-8Z"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  moon: '<path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/>',
  print:
    '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6zM18 12h.01"/>',
};
const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.spark}</svg>`;
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const colorOk = (v) => /^#[0-9a-fA-F]{6}$/.test(v || "");
// Text on accent fills: whichever of the two inks has the higher WCAG contrast against the accent.
const accentInk = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.0632 ? "#fffdfa" : "#12221b";
};
const imageOk = (v) =>
  typeof v === "string" &&
  (v.startsWith("/api/mealie_atelier/image/") ||
    v.startsWith("/api/mealie_atelier/recipe_asset/") ||
    v.startsWith("/api/image/") ||
    /^\/api\/recipe-asset\/[A-Za-z0-9_-]{1,150}\/[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(v) ||
    /^\.\.?\/(food|photos)\/[a-z0-9-]+\.webp$/.test(v))
    ? v
    : "";
const asArray = (v) => (Array.isArray(v) ? v : []);
/** Nearest scrolling ancestor across shadow roots; the document scroller when none is set. */
function scrollParent(node) {
  for (let el = node.parentNode || node.host; el; el = el.parentNode || el.host) {
    if (!(el instanceof Element)) continue;
    const { overflowY } = getComputedStyle(el);
    if (/(auto|scroll)/.test(overflowY) && el.scrollHeight > el.clientHeight) return el;
  }
  return document.scrollingElement;
}
const dateYmd = (d) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
const addDays = (d, n) => {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return a;
};
const monday = (day) => addDays(day, -(day.getDay() + 6) % 7);
const tidy = (s, len = 250) =>
  String(s || "")
    .trim()
    .slice(0, len);
/* ATELIER_I18N */

const STYLE = `<style>
/* CSS COMPILED FROM src/ BY BUILD */
</style>`;
// Every fetch signs image URLs anew (a 2 h signature). Reusing the first one per recipe photo keeps
// re-renders on the browser cache instead of reloading every photo; a new photo changes `image`.
const IMAGE_SRC_TTL = 90 * 60 * 1000;
const imageSrcCache = new Map();
function stableImageSrc(recipe) {
  const src = imageOk(recipe?.imageUrl);
  if (!src || !recipe?.image) return src;
  // The signed path names the entry and the recipe; the photo hash changes with a new photo.
  const key = `${src.split("?")[0]}:${recipe.image}`;
  const now = Date.now();
  const hit = imageSrcCache.get(key);
  if (hit && now - hit.at < IMAGE_SRC_TTL) return hit.src;
  if (imageSrcCache.size > 2000) imageSrcCache.clear();
  imageSrcCache.set(key, { src, at: now });
  return src;
}
function recipeImage(recipe, cls = "") {
  const src = stableImageSrc(recipe);
  return src ? `<img class="${cls}" src="${esc(src)}" loading="lazy" alt="">` : "";
}
function mealName(entry) {
  return entry?.recipe?.name || entry?.title || entry?.text || "";
}
function ingredientName(row) {
  return (
    row?.display ||
    row?.originalText ||
    [row?.quantity || "", row?.unit?.name || "", row?.food?.name || "", row?.note || ""]
      .filter(Boolean)
      .join(" ")
      .trim()
  );
}
/** Escapes text and turns plain http(s) URLs into safe external links (matched on the raw text). */
function linkify(text) {
  const raw = String(text ?? "");
  let out = "",
    last = 0;
  for (const match of raw.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    const url = match[0].replace(/[.,;:!?)\]]+$/, "");
    out += `${esc(raw.slice(last, match.index))}<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;
    last = match.index + url.length;
  }
  return out + esc(raw.slice(last));
}
function instructionText(row) {
  return typeof row === "string" ? row : row?.text || "";
}
function instructionImages(row) {
  return asArray(row?.imageUrls).map(imageOk).filter(Boolean);
}
function dayString(locale, day, opts) {
  return new Intl.DateTimeFormat(locale, opts).format(day);
}

/** Dedicated print documents. No token/credentials or arbitrary HTML from Mealie is interpolated. */
/* ATELIER_PRINT_DOCUMENT */

class MealieAtelierCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("mealie-atelier-card-editor");
  }
  static getStubConfig() {
    return {
      mode: "dashboard",
      theme: "auto",
      accent: DEFAULTS.accent,
      columns: 3,
    };
  }
  static getGridOptions() {
    return { columns: 12, rows: 10, min_columns: 4, min_rows: 3 };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = { ...DEFAULTS };
    this._hass = null;
    this._didLoad = false;
    this._view = "dashboard";
    this._data = { recipes: null, mealplan: null, shopping: null, metadata: null };
    this._query = "";
    this._page = 1;
    this._activeList = "";
    this._weekStart = monday(new Date());
    this._modal = null;
    this._detail = null;
    this._cookIndex = 0;
    this._checkedSteps = new Set();
    this._checkedIngredients = new Set();
    this._busy = false;
    this._error = "";
    this._toast = "";
    this._toastKind = "status";
    this._providerTruncated = false;
    this._wakeLock = AtelierWakeLock.create();
    this._boundVisibility = () => {
      if (document.visibilityState === "visible") this._wakeLock.resume();
    };
    this._settings = false;
    this._local = {};
    this._status = null;
    this._searchTimer = null;
    this._focusSearch = false;
    this._nutrition = null;
    this._timerHandle = null;
    this._timers = [];
    this._journal = {};
    this._boundClick = this._handleClick.bind(this);
    this._boundSubmit = this._handleSubmit.bind(this);
    this._boundInput = this._handleInput.bind(this);
    // BEGIN feature B: recipe editor state and events
    this._ed = null;
    this._boundEditorFocus = (event) => this._editorFocusEvent(event);
    // END feature B
    this._boundImageError = (event) => {
      if (event.target?.tagName === "IMG") event.target.remove();
    };
    this._boundKeyDown = this._handleKeyDown.bind(this);
    // Make the shortcuts work before anything in the card has focus. In Home Assistant this only
    // applies while nothing at all has focus (target is the body), so its own shortcuts and
    // every other focused element keep working.
    this._boundPageKeyDown = (event) => {
      if (!this.isConnected || event.defaultPrevented || typeof event.key !== "string") return;
      if (event.composedPath().includes(this)) return; // shadowRoot handler already handled it
      const target = event.target;
      const bare = !target || target === document.body || target === document.documentElement;
      const inHass = Boolean(this._hass?.callService);
      if (inHass) {
        if (!bare || !this.getClientRects().length) return;
      } else {
        if (document.querySelector("mealie-atelier-card") !== this) return;
        if (target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      }
      const shortcut =
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") || event.key === "/";
      // With a dialog open and focus lost to the body, keep Esc, arrows and Tab working.
      const dialogKey =
        Boolean(this._modal) &&
        bare &&
        ["Escape", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab"].includes(event.key);
      if (shortcut || dialogKey) this._handleKeyDown(event);
    };
    this._boundPointerDown = this._handlePointerDown.bind(this);
    this._boundPointerUp = this._handlePointerUp.bind(this);
    this._cookGesture = null;
    this._lastRenderedView = null;
    this._lastRenderedModal = null;
    this._toastTimer = null;
    this._commandQuery = "";
    this._commandResults = [];
    this._commandTotal = 0;
    this._commandSearchTimer = null;
    this._commandSearchSeq = 0;
    try {
      this._local = JSON.parse(localStorage.getItem("mealie-atelier:design") || "{}") || {};
    } catch {
      this._local = {};
    }
    try {
      this._timers = JSON.parse(localStorage.getItem("mealie-atelier:timers") || "[]").filter(
        (x) => x?.deadline > Date.now() - 3600000,
      );
      this._timerIds = new Set(this._timers.map((x) => String(x.id)));
      this._timerWatchSince = Date.now() - 15000;
    } catch {
      this._timers = [];
    }
    try {
      this._journal = JSON.parse(localStorage.getItem("mealie-atelier:journal") || "{}") || {};
    } catch {
      this._journal = {};
    }
  }
  setConfig(config) {
    if (!config || typeof config !== "object") throw Error("Invalid card configuration");
    // Focused card types open their own view when the YAML names only the type.
    const { mode } = this.constructor.getStubConfig();
    this._config = { ...DEFAULTS, mode, ...config };
    this._view = MODES.includes(this._config.mode) ? this._config.mode : "dashboard";
    if (this.isConnected) this._render();
  }
  // Home Assistant sets layout "panel" when the card fills a whole view; the card then drops its
  // frame and runs edge to edge.
  set layout(value) {
    const changed = this._layout !== value;
    this._layout = value;
    if (changed && this._config && this.isConnected) this._render();
  }
  get layout() {
    return this._layout;
  }
  set hass(value) {
    // BEGIN feature H: offline queue reconnect
    this._offlineOnHass(value);
    // END feature H
    const darkBefore = this._hass?.themes?.darkMode;
    this._hass = value;
    if (this.isConnected && !this._didLoad) {
      this._didLoad = true;
      this._refresh();
    } else if (
      this.isConnected &&
      this._design.theme === "auto" &&
      darkBefore !== value?.themes?.darkMode
    )
      this._render();
  }
  /** Resolves the configured theme ("auto" follows the Home Assistant light or dark mode). */
  _resolvedTheme(theme) {
    if (theme === "light" || theme === "dark") return theme;
    const darkMode = this._hass?.themes?.darkMode;
    if (typeof darkMode === "boolean") return darkMode ? "dark" : "light";
    // Outside Home Assistant (standalone web app) follow the system colour scheme.
    const query =
      typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: light)") : null;
    return query?.matches ? "light" : "dark";
  }
  connectedCallback() {
    this.shadowRoot.addEventListener("click", this._boundClick);
    this.shadowRoot.addEventListener("submit", this._boundSubmit);
    this.shadowRoot.addEventListener("input", this._boundInput);
    // BEGIN feature B: recipe editor events
    this.shadowRoot.addEventListener("change", this._boundEditorFocus);
    this.shadowRoot.addEventListener("focusout", this._boundEditorFocus);
    // END feature B
    this.shadowRoot.addEventListener("keydown", this._boundKeyDown);
    document.addEventListener("keydown", this._boundPageKeyDown);
    document.addEventListener("visibilitychange", this._boundVisibility);
    this.shadowRoot.addEventListener("pointerdown", this._boundPointerDown, { passive: true });
    this.shadowRoot.addEventListener("pointerup", this._boundPointerUp, { passive: true });
    this.shadowRoot.addEventListener("error", this._boundImageError, true);
    this._render();
    this._timerHandle = setInterval(() => this._tickTimers(), 1000);
    // BEGIN feature H: offline queue replay on connect
    this._offlineAttach();
    // END feature H
    if (this._hass && !this._didLoad) {
      this._didLoad = true;
      this._refresh();
    }
  }
  disconnectedCallback() {
    // BEGIN feature H: offline queue listener
    this._offlineDetach();
    // END feature H
    this.shadowRoot.removeEventListener("click", this._boundClick);
    this.shadowRoot.removeEventListener("submit", this._boundSubmit);
    this.shadowRoot.removeEventListener("input", this._boundInput);
    // BEGIN feature B: recipe editor events
    this.shadowRoot.removeEventListener("change", this._boundEditorFocus);
    this.shadowRoot.removeEventListener("focusout", this._boundEditorFocus);
    clearTimeout(this._ed?.comboTimer);
    // END feature B
    this.shadowRoot.removeEventListener("keydown", this._boundKeyDown);
    document.removeEventListener("keydown", this._boundPageKeyDown);
    document.removeEventListener("visibilitychange", this._boundVisibility);
    this._wakeLock.set(false);
    this.shadowRoot.removeEventListener("pointerdown", this._boundPointerDown);
    this.shadowRoot.removeEventListener("pointerup", this._boundPointerUp);
    this.shadowRoot.removeEventListener("error", this._boundImageError, true);
    if (this._searchTimer) clearTimeout(this._searchTimer);
    if (this._commandSearchTimer) clearTimeout(this._commandSearchTimer);
    this._commandSearchSeq++;
    if (this._timerHandle) {
      clearInterval(this._timerHandle);
      this._timerHandle = null;
    }
    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
      this._toastTimer = null;
    }
  }
  getCardSize() {
    return this._view === "dashboard" ? 11 : 5;
  }
  get _language() {
    const preferred = this._local?.language || this._config.language || "auto";
    return resolveLanguage(preferred, this._hass?.language, navigator.language);
  }
  get _isApplePlatform() {
    const platform =
      navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || "";
    return /mac|iphone|ipad|ipod/i.test(platform);
  }
  get _shortcutLabel() {
    return this._isApplePlatform ? "⌘K" : "Ctrl+K";
  }
  get _locale() {
    return this._language === "de" ? "de-DE" : this._language === "en" ? "en-US" : this._language;
  }
  t(key, values) {
    return translateLabel(this._language, key, values);
  }
  tp(key, count, values) {
    return translatePluralLabel(this._language, key, count, values);
  }
  get _design() {
    return { ...this._config, ...this._local };
  }
  get _statusEntry() {
    const entries = asArray(this._status?.entries);
    return entries.find((x) => x.entry_id === this._config.entry_id) || entries[0];
  }
  get _permissions() {
    const chosen = this._statusEntry;
    // Prefer the structured permissions; an older Bridge only sends the legacy mirrors.
    const granted = chosen?.permissions && typeof chosen.permissions === "object";
    const can_admin = granted ? chosen.permissions.can_admin === true : chosen?.can_manage === true;
    return {
      can_read: granted ? chosen.permissions.can_read === true : Boolean(chosen),
      can_write: granted ? chosen.permissions.can_write === true : chosen?.can_write === true,
      can_admin,
      can_manage: can_admin,
      can_edit_ingredients:
        chosen?.can_edit_ingredients === true ||
        (can_admin && chosen?.features?.structured_ingredients === true),
      features: chosen?.features && typeof chosen.features === "object" ? chosen.features : {},
      limits: chosen?.limits && typeof chosen.limits === "object" ? chosen.limits : {},
    };
  }
  /** True inside the standalone web app, whose shell hands the card a hass shim with this flag. */
  get _isWebApp() {
    return this._hass?.atelierOfflineHost === true;
  }
  /** Notice for a reader: the grant lives in the HA options or in the web app's account role. */
  get _noWriteGrantText() {
    return this.t(this._isWebApp ? "uiNoWriteGrantWeb" : "uiNoWriteGrant");
  }
  /** The user may view the kitchen but holds no write grant (the kitchen itself is not read-only). */
  get _noWriteGrant() {
    const p = this._permissions;
    return (
      Boolean(this._statusEntry?.permissions) &&
      p.can_read &&
      !p.can_write &&
      this._statusEntry.read_only !== true
    );
  }
  /** Personal journal notes need a loaded status that is not read-only; a shared journal needs write access. */
  get _canJournal() {
    const status = this._statusEntry;
    if (!status || status.read_only === true) return false;
    return status.features?.shared_journal !== true || this._permissions.can_write;
  }
  /** Maps a WebSocket or bridge error to its translated `err*` text (contract 0.1). */
  _errorText(err) {
    const code = typeof err?.code === "string" ? err.code : "";
    if (/^[a-z][a-z0-9_]*$/.test(code)) {
      const key = "err" + code.replace(/(?:^|_)([a-z0-9])/g, (_, c) => c.toUpperCase());
      const text = this.t(key);
      if (text && text !== key) return text;
    }
    return err?.message || this.t("error");
  }
  /** An error text that always ends like a sentence, for templates that append more text. */
  _errorSentence(err) {
    const text = String(this._errorText(err)).trim();
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }
  /** True for a failed network request (fetch TypeError or a browser that is offline). */
  _isNetworkFailure(err) {
    return (
      (typeof navigator !== "undefined" && navigator.onLine === false) ||
      /failed to fetch|networkerror|load failed/i.test(String(err?.message || ""))
    );
  }
  /** True when the bridge or built-in Mealie integration is missing altogether. */
  get _setupMissing() {
    return this._errorCode === "not_configured";
  }
  /** After a refused write the grant may have changed: re-read the status once and re-render. */
  async _recoverPermissions(err) {
    if (!["write_not_permitted", "unauthorized"].includes(err?.code) || this._recovering) return;
    this._recovering = true;
    try {
      this._status = await this._ws("status");
    } catch {
      // Keep the previous status; the error text already told the user what happened.
    } finally {
      this._recovering = false;
    }
    this._render();
  }
  async _ws(type, opts = {}) {
    if (this._providerActive === "home_assistant") {
      if (type === "recipes") return this._nativeRecipes(opts.search || "");
      if (type === "recipe") return this._nativeRecipe(opts.slug || opts.recipe_id || "");
      throw new Error(this.t("uiThisFeatureRequiresMealieAtelierBridge"));
    }
    if (!this._hass || typeof this._hass.callWS !== "function")
      throw new Error(this.t("uiHomeAssistantNotReady"));
    // Status covers every Bridge entry, so it never carries an entry_id.
    const entry_id = type === "status" ? undefined : this._config.entry_id || undefined;
    return this._hass.callWS({
      type: `mealie_atelier/${type}`,
      ...(entry_id ? { entry_id } : {}),
      ...opts,
    });
  }
  get _nativeMealieEntryIds() {
    const entities = Object.values(this._hass?.entities || {});
    return [
      ...new Set(
        entities
          .filter((entity) => entity?.platform === "mealie" && entity.config_entry_id)
          .map((entity) => entity.config_entry_id),
      ),
    ];
  }
  get _hasNativeMealie() {
    return Boolean(
      this._hass?.services?.mealie?.get_recipes &&
        this._hass?.services?.mealie?.get_recipe &&
        this._nativeMealieEntryIds.length,
    );
  }
  async _nativeAction(action, data = {}) {
    if (!this._hasNativeMealie)
      throw new Error(this.t("uiHomeAssistantSMealieIntegrationWithRecipeSearchIsUnavailable"));
    const config_entry_id = this._config.mealie_entry_id || this._nativeMealieEntryIds[0];
    if (!this._nativeMealieEntryIds.includes(config_entry_id))
      throw new Error(this.t("uiChooseAValidMealieInstance"));
    return this._hass.callService(
      "mealie",
      action,
      { config_entry_id, ...data },
      undefined,
      false,
      true,
    );
  }
  _nativePayload(response, action) {
    let value = response?.service_response || response?.response || response?.result || response;
    if (value && typeof value === "object" && !Array.isArray(value))
      value = value[`mealie.${action}`] ?? value[action] ?? value;
    return value;
  }
  _nativeRecipeShape(value) {
    const recipe = value?.recipe || value;
    if (!recipe || typeof recipe !== "object")
      throw new Error(this.t("uiHomeAssistantReturnedNoRecipe"));
    const slug = String(recipe.slug || recipe.id || recipe.recipeId || "").trim();
    return {
      ...recipe,
      id: recipe.id || slug,
      slug,
      name: recipe.name || recipe.recipeName || this.t("recipeFallback"),
      description: recipe.description || "",
      recipeInstructions: asArray(recipe.recipeInstructions || recipe.instructions),
      recipeIngredient: asArray(recipe.recipeIngredient || recipe.ingredients),
      totalTime: recipe.totalTime || "",
      recipeYieldQuantity: recipe.recipeYieldQuantity || recipe.recipeServings || 0,
      recipeYield: recipe.recipeYield || "",
      imageUrl: "",
    };
  }
  async _nativeRecipes(search = "") {
    const response = this._nativePayload(
      await this._nativeAction("get_recipes", {
        search_terms: String(search || "").slice(0, 160),
        result_limit: NATIVE_RESULT_LIMIT,
      }),
      "get_recipes",
    );
    const payload = response?.recipes ?? response;
    const rows = Array.isArray(payload) ? payload : asArray(payload?.items || payload?.data);
    const items = rows.map((row) => this._nativeRecipeShape(row)).filter((row) => row.slug);
    const total = Number(payload?.total);
    const upstreamPage = Number(payload?.page);
    const upstreamPerPage = Number(payload?.per_page ?? payload?.perPage);
    const upstreamTotalPages = Number(payload?.total_pages ?? payload?.totalPages);
    const totalCount = Number.isFinite(total) ? total : items.length;
    this._providerTruncated = rows.length >= NATIVE_RESULT_LIMIT || totalCount > items.length;
    return {
      items,
      total: totalCount,
      page: this._page || 1,
      per_page: 24,
      total_pages: Math.max(1, Math.ceil(items.length / 24)),
      provider: "home_assistant",
      upstream: {
        page: Number.isFinite(upstreamPage) ? upstreamPage : 1,
        per_page: Number.isFinite(upstreamPerPage) ? upstreamPerPage : items.length,
        total_pages: Number.isFinite(upstreamTotalPages) ? upstreamTotalPages : 1,
      },
      partial:
        totalCount > items.length ||
        (Number.isFinite(upstreamTotalPages) && upstreamTotalPages > 1) ||
        items.length >= NATIVE_RESULT_LIMIT,
    };
  }
  async _nativeRecipe(slug) {
    const response = this._nativePayload(
      await this._nativeAction("get_recipe", { recipe_id: String(slug || "").slice(0, 180) }),
      "get_recipe",
    );
    return this._nativeRecipeShape(response);
  }
  async _refreshNative() {
    this._providerActive = "home_assistant";
    this._status = { entries: [], provider: "home_assistant", read_only: true };
    this._data.mealplan = null;
    this._data.shopping = null;
    this._data.metadata = null;
    this._data.recipes = await this._nativeRecipes(this._query);
    this._error = "";
  }
  async _refresh() {
    if (this._busy) return;
    this._busy = true;
    this._error = "";
    this._errorCode = "";
    this._loadFailed = false;
    this._render();
    try {
      if (this._config.provider === "home_assistant") {
        await this._refreshNative();
      } else {
        this._providerActive = "atelier";
        const calls = [
          this._ws("recipes", { page: this._page, per_page: 24, search: this._query }),
          this._ws("mealplan", {
            start: dateYmd(this._weekStart),
            end: dateYmd(addDays(this._weekStart, 6)),
          }),
          this._ws("shopping"),
          this._ws("status"),
        ];
        const result = await Promise.allSettled(calls);
        const keys = ["recipes", "mealplan", "shopping", "status"];
        const failures = [];
        const failedErrors = [];
        result.forEach((r, i) => {
          if (r.status === "fulfilled") {
            if (keys[i] === "status") this._status = r.value;
            else this._data[keys[i]] = r.value;
          } else {
            failedErrors.push(r.reason);
            failures.push(
              r.reason?.code
                ? this._errorText(r.reason)
                : this._isNetworkFailure(r.reason)
                  ? this.t("offline")
                  : r.reason?.message || String(r.reason),
            );
          }
        });
        if (failures.length) {
          this._error = failures[0];
          this._errorCode = failedErrors.find((e) => typeof e?.code === "string")?.code || "";
        }
        if (
          this._config.provider === "auto" &&
          result[0].status === "rejected" &&
          this._hasNativeMealie
        ) {
          await this._refreshNative();
          if (
            this._config.mealie_entry_id !== this._nativeMealieEntryIds[0] &&
            this._nativeMealieEntryIds.length === 1
          ) {
            this._config = { ...this._config, mealie_entry_id: this._nativeMealieEntryIds[0] };
            this._emitConfig();
          }
        }
        if (failures.length && this._providerActive !== "home_assistant") {
          // Any failed call means the page may be incomplete: never present it as an empty library.
          this._loadFailed = true;
          if (result.every((r) => r.status === "rejected")) throw failedErrors[0];
        }
        if (!this._activeList)
          this._activeList = String(asArray(this._data.shopping?.lists)[0]?.id || "");
      }
    } catch (err) {
      this._errorCode = typeof err?.code === "string" ? err.code : "";
      this._loadFailed = true;
      this._error = err?.code
        ? this._errorText(err)
        : this._isNetworkFailure(err)
          ? this.t("offline")
          : err?.message || this.t("offline");
    } finally {
      this._busy = false;
      this._render();
      // BEGIN feature H: offline queue replay after status is known
      this._offlineReplayLater();
      // END feature H
    }
  }
  async _searchRecipes() {
    try {
      if (this._providerActive === "home_assistant") {
        this._data.recipes = await this._nativeRecipes(this._query);
      } else {
        this._data.recipes = await this._ws("recipes", {
          page: this._page,
          per_page: 24,
          search: this._query,
        });
      }
      this._error = "";
    } catch (err) {
      this._error = this._errorText(err);
    }
    this._render();
    if (this._focusSearch) {
      const input = this.shadowRoot.querySelector('[data-input="search"]');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
      this._focusSearch = false;
    }
  }
  async _loadShopping() {
    try {
      this._data.shopping = await this._ws("shopping");
      this._error = "";
    } catch (err) {
      this._error = this._errorText(err);
    }
    this._render();
  }
  async _loadMealplan() {
    try {
      this._data.mealplan = await this._ws("mealplan", {
        start: dateYmd(this._weekStart),
        end: dateYmd(addDays(this._weekStart, 6)),
      });
      this._error = "";
    } catch (err) {
      this._error = this._errorText(err);
    }
    this._render();
  }
  _flash(text, kind = "status") {
    this._toast = String(text || "").slice(0, 500);
    this._toastKind = kind;
    this._render();
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toast = "";
      const toast = this.shadowRoot.querySelector(".toast");
      if (toast) {
        toast.classList.add("at-toast-exit");
        setTimeout(() => toast.remove(), 230);
      }
    }, 3800);
  }
  _nav() {
    return `<aside class="sidebar">
      <div class="identity"><div class="logo">${icon("leaf", 22)}</div><div><strong>MEALIE<br>ATELIER</strong><span>${esc(this.t("navStudioTagline"))}</span></div></div>
      <div class="nav-label">${esc(this.t("navMenu"))}</div><nav class="nav" aria-label="${esc(this.t("navKitchenLabel"))}">
      ${MODES.filter((mode) =>
        this._providerActive === "home_assistant"
          ? mode === "recipes"
          : mode !== "manage" || this._permissions.can_manage,
      )
        .map(
          (mode) =>
            `<button class="${this._view === mode ? "active" : ""}" ${this._view === mode ? 'aria-current="page"' : ""} data-action="nav" data-value="${mode}">${icon({ dashboard: "home", today: "sun", discover: "spark", recipes: "book", mealplan: "calendar", pantry: "leaf", shopping: "cart", family: "utensils", cookbook: "print", manage: "gear" }[mode])}<span>${this.t(mode)}</span></button>`,
        )
        .join("")}
      </nav><div class="sidebar-footer"><div class="tiny-leaf">${icon("spark", 17)}</div>${AtelierUI.attribution({ lead: this.t("creditMadeWith"), by: this.t("creditBy") })}<span class="atelier-version">Mealie Atelier ${VERSION}</span></div>
    </aside>`;
  }
  _revealActiveNav() {
    const rail = this.shadowRoot?.querySelector(".sidebar .nav");
    const selected = rail?.querySelector('[data-action="nav"].active');
    if (!rail || !selected) return;
    const r = rail.getBoundingClientRect(),
      a = selected.getBoundingClientRect();
    if (a.left >= r.left + 10 && a.right <= r.right - 10) return;
    rail.scrollLeft += a.left - r.left - (r.width - a.width) / 2;
  }
  _topbar() {
    return `<div class="topbar"><div class="breadcrumb">${icon("home", 14)}<span>/</span><strong>${esc(this.t(this._view))}</strong></div><div class="toolbar"><button class="command-launch" data-action="command-open" title="${this.t("uiOpenQuickActions", { shortcut: this._shortcutLabel })}" aria-label="${this.t("uiOpenQuickActions", { shortcut: this._shortcutLabel })}">${icon("search", 15)}<span class="command-caption">${this.t("uiQuickActions")}</span><span class="shortcut">${this._shortcutLabel}</span></button><button class="icon-btn" title="${esc(this.t("refresh"))}" data-action="refresh" aria-label="${esc(this.t("refresh"))}">${icon("refresh")}</button>${["shopping", "mealplan"].includes(this._view) ? `<button class="icon-btn" title="${this.t("uiPrintPDF")}" data-action="print-${this._view === "shopping" ? "list" : "week"}" aria-label="${this.t("uiPrintPDF")}">${icon("print")}</button>` : ""}<button class="icon-btn" title="${esc(this.t("settings"))}" data-action="settings" aria-label="${esc(this.t("settings"))}">${icon("gear")}</button></div></div>`;
  }
  _intro(title, sub, eyebrow) {
    return AtelierUI.pageHeader({
      title,
      description: sub,
      kicker: eyebrow,
      highlight: this._view === "dashboard" ? this.t("uiEveryDay") : "",
    });
  }
  _stat(number, label, ico, target = "") {
    return AtelierUI.metric({ value: number, label, graphic: ico, target });
  }
  _stepEditRow(value = "", index = 0, id = "") {
    const row = `<div class="editor-step" data-editor-step data-step-id="${esc(id)}"><span class="step-count">${index + 1}</span>
      <textarea data-step-text maxlength="2000" rows="2" aria-label="${this.t("uiStep")} ${index + 1}" placeholder="${this.t("uiDescribeThisStep")}">${esc(value)}</textarea>
      <div class="step-buttons"><button type="button" data-action="step-up" aria-label="${this.t("uiMoveUp")}" title="${this.t("uiMoveUp")}">↑</button><button type="button" data-action="step-down" aria-label="${this.t("uiMoveDown")}" title="${this.t("uiMoveDown")}">↓</button><button type="button" data-action="step-remove" aria-label="${this.t("uiRemoveStep")}" title="${this.t("uiRemove")}">×</button></div></div>`;
    // BEGIN feature B: step photo thumbnails inside the step row
    return row.replace(/<\/div>$/, `${this._editorStepPhotos(id)}</div>`);
    // END feature B
  }
  _renumberSteps() {
    this.shadowRoot.querySelectorAll("[data-editor-step]").forEach((element, index) => {
      const count = element.querySelector(".step-count");
      const textarea = element.querySelector("textarea");
      if (count) count.textContent = String(index + 1);
      if (textarea) textarea.setAttribute("aria-label", `${this.t("uiStep")} ${index + 1}`);
    });
  }
  _persistJournal() {
    try {
      localStorage.setItem("mealie-atelier:journal", JSON.stringify(this._journal));
    } catch {}
  }
  /** Reads the shared timer list, or null when nothing was stored yet or it is unreadable. */
  _storedTimers() {
    try {
      const raw = localStorage.getItem("mealie-atelier:timers");
      if (raw === null) return null;
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list.filter((x) => x && x.id !== undefined) : null;
    } catch {
      return null;
    }
  }
  /** Cards share one storage key: drop timers another card removed and pick up its alert marks. */
  _syncTimersFromStorage() {
    const stored = this._storedTimers();
    if (!stored) return false;
    const known = (this._timerIds ||= new Set());
    const byId = new Map(stored.map((x) => [String(x.id), x]));
    const before = this._timers.length;
    this._timers = this._timers.filter((x) => !known.has(String(x.id)) || byId.has(String(x.id)));
    for (const timer of this._timers) if (byId.get(String(timer.id))?.alerted) timer.alerted = true;
    return this._timers.length !== before;
  }
  _persistTimers() {
    try {
      // Keep timers (local and server-armed) that another card wrote and this one never held.
      const known = (this._timerIds ||= new Set());
      this._syncTimersFromStorage();
      const mine = new Set(this._timers.map((x) => String(x.id)));
      const foreign = (this._storedTimers() || []).filter(
        (x) =>
          x.deadline > Date.now() - 3600000 && !mine.has(String(x.id)) && !known.has(String(x.id)),
      );
      for (const id of mine) known.add(id);
      localStorage.setItem("mealie-atelier:timers", JSON.stringify([...foreign, ...this._timers]));
    } catch {}
  }
  /** Creates and resumes the audio context; call it inside a user gesture so iOS Safari allows the beep. */
  _prepareAudio() {
    try {
      const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Ctx) return;
      this._audio ||= new Ctx();
      this._audio.resume?.();
    } catch {}
  }
  /** True once per timer across all cards on the page (the first card to ask marks it in storage). */
  _claimTimerAlert(timer) {
    if (timer.alerted) return false;
    timer.alerted = true;
    const stored = this._storedTimers();
    const entry = stored?.find((x) => String(x.id) === String(timer.id));
    if (entry?.alerted) return false;
    if (entry) {
      entry.alerted = true;
      try {
        localStorage.setItem("mealie-atelier:timers", JSON.stringify(stored));
      } catch {}
    }
    return true;
  }
  /** Toast, short beep and vibration for a timer that just finished, visible outside cooking mode. */
  _alertTimerDone(timer) {
    this._flash(this.t("uiTimerDone", { label: timer.label }), "error");
    try {
      globalThis.navigator?.vibrate?.([200, 100, 200]);
    } catch {}
    try {
      this._prepareAudio();
      const ctx = this._audio;
      if (!ctx) return;
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }
  _tickTimers() {
    const now = Date.now();
    let finished = this._syncTimersFromStorage();
    const alerts = [];
    for (const timer of this._timers) {
      if (!timer.done && timer.deadline <= now) {
        timer.done = true;
        finished = true;
        // Alert for timers that ran out while this card was alive (even if a throttled tab ticked late),
        // not for ones that expired while the page was closed.
        if (timer.deadline >= (this._timerWatchSince ?? 0)) alerts.push(timer);
      }
    }
    if (finished) {
      this._persistTimers();
      this._render();
    }
    for (const timer of alerts) if (this._claimTimerAlert(timer)) this._alertTimerDone(timer);
    for (const span of this.shadowRoot.querySelectorAll("[data-timer-remaining]")) {
      const timer = this._timers.find((x) => String(x.id) === span.dataset.timerRemaining);
      if (timer) {
        const sec = Math.max(0, Math.ceil((timer.deadline - now) / 1000));
        span.textContent = timer.done
          ? "00:00"
          : `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
        const ring = span.closest(".cook-timer-card")?.querySelector("[data-timer-ring]");
        if (ring && timer.startedAt && timer.durationMs) {
          const progress = Math.min(
            100,
            Math.max(0, ((now - timer.startedAt) / timer.durationMs) * 100),
          );
          ring.style.setProperty("--timer-progress", `${progress.toFixed(2)}%`);
        }
      }
    }
  }
  async _openNutrition() {
    if (!this._detail) return;
    this._modal = "loading";
    this._render();
    try {
      const preview = await this._ws("nutrition_prepare", { slug: this._detail.slug });
      this._nutrition = {
        preview,
        rows: preview.ingredients.map((row) => ({ ...row, selected: null })),
        choices: [],
        active: -1,
        report: null,
        replaceExisting: false,
        notice: "",
        busy: false,
      };
      this._modal = "nutrition";
      this._error = "";
    } catch (error) {
      this._modal = "recipe";
      this._error = this._errorText(error);
    }
    this._render();
  }

  _render() {
    if (!this.isConnected) return;
    // Hold the wake lock only while cook mode is open and the user keeps the toggle on.
    this._wakeLock.set(this._modal === "cook" && this._design.keep_awake !== false);
    const d = this._design,
      theme = this._resolvedTheme(d.theme);
    const configuredAccent = colorOk(d.accent) ? d.accent : DEFAULTS.accent;
    const accent =
      theme === "light" && configuredAccent.toLowerCase() === DEFAULTS.accent
        ? "#75465d"
        : configuredAccent;
    const rounded = d.radius === "small" ? "12px" : d.radius === "square" ? "6px" : "23px";
    const viewChanged = this._lastRenderedView !== this._view;
    const themeChanged = this._lastRenderedTheme && this._lastRenderedTheme !== theme;
    const modalChanged = this._lastRenderedModal !== this._modal;
    const active = this.shadowRoot.activeElement;
    if (modalChanged && this._modal && !this._lastRenderedModal && active?.dataset?.action) {
      this._modalReturn = { action: active.dataset.action, value: active.dataset.value || "" };
    }
    let restoreSelector = "";
    let restoreIndex = 0;
    if (active && active !== this.shadowRoot.host) {
      const attr = [
        "data-action",
        "data-input",
        "name",
        "data-nutri-grams",
        "data-nutri-query",
      ].find((k) => active.hasAttribute?.(k));
      if (attr) {
        const v = active.getAttribute(attr);
        if (v && /^[a-z0-9_-]+$/i.test(v)) {
          restoreSelector = `[${attr}="${v}"]`;
          restoreIndex = Math.max(
            0,
            [...this.shadowRoot.querySelectorAll(restoreSelector)].indexOf(active),
          );
        }
      }
    }
    const scrollClasses = [
      ".nav",
      ".week-grid",
      ".studio-pantry-list",
      ".studio-book-list",
      ".command-list",
      ".modal",
    ];
    // The grid can appear without a view change (skeleton to data, or the "today" button).
    const gridBefore = Boolean(this.shadowRoot.querySelector(".week-grid"));
    const scrolls = viewChanged
      ? []
      : scrollClasses.map((selector) => {
          const el = this.shadowRoot.querySelector(selector);
          return { selector, top: el?.scrollTop || 0, left: el?.scrollLeft || 0 };
        });
    const motion = ["off", "balanced", "expressive"].includes(d.motion) ? d.motion : "expressive";
    if (!this._styleReady) {
      this.shadowRoot.innerHTML = STYLE;
      this._styleReady = true;
    }
    // BEGIN feature D: recipe picker lifecycle
    if (modalChanged) this._pickerSync();
    // END feature D
    const modalMarkup = this._modalHtml();
    const displayedModal = modalChanged
      ? modalMarkup
      : modalMarkup.replace('class="modal ', 'class="modal modal-stable ');
    const markup = `<ha-card><div lang="${esc(this._locale)}" class="atelier ${theme} ${d.density === "compact" ? "compact" : "comfortable"} motion-${motion} provider-${this._providerActive === "home_assistant" ? "home-assistant" : "atelier"} ${d.kiosk_mode === true ? "kiosk" : ""} ${this._layout === "panel" ? "panel" : ""}" style="--at-accent:${accent};--at-accent-ink:${accentInk(accent)};--at-radius:${rounded}"><div class="shell ${this._config.mode === "dashboard" ? "" : "single"}">
      ${this._config.mode === "dashboard" ? this._nav() : ""}<main class="main">${this._topbar()}
      ${this._error ? `<div class="notice error is-spaced" role="alert">${icon("bolt", 17)}<span>${esc(this._error)}</span>${this._setupMissing ? `<span class="setup-hint">${esc(this.t("uiSetupMissingHint"))} <a href="/config/integrations">${esc(this.t("uiOpenIntegrations"))}</a></span>` : ""}<button class="btn tiny" data-action="refresh">${esc(this.t(this._setupMissing ? "uiCheckAgain" : "retry"))}</button></div>` : ""}
      ${this._status && this._providerActive !== "home_assistant" && this._noWriteGrant ? `<div class="notice is-spaced" role="status">${icon("leaf", 16)} <strong>${esc(this._noWriteGrantText)}</strong></div>` : this._status && !this._permissions.can_write ? `<div class="notice is-spaced ${this._providerActive === "home_assistant" ? "is-provider-notice" : ""}" role="status">${icon("leaf", 16)} <strong>${esc(this._providerActive === "home_assistant" ? this.t("uiMealieReadOnly") : this.t("readOnly"))}</strong>${this._providerActive === "home_assistant" ? `<span class="provider-copy">${esc(this.t("uiRecipesCookingPhotosAndEditsNeedAtelierBridge"))}</span>` : ` ${esc(this.t("readOnlyHint"))}`}</div>` : ""}
      <div class="view-stage ds-page ${viewChanged ? "is-entering" : themeChanged ? "is-theme-entering" : ""}" data-view="${esc(this._view)}" role="region" aria-label="${esc(this.t(this._view))}">${this._setupMissing ? "" : this._body()}</div>
      <footer class="atelier-credit-footer">${AtelierUI.attribution({ lead: this.t("creditMadeWith"), by: this.t("creditBy") })}</footer></main></div>${displayedModal}${this._toast ? `<div class="toast${this._toastKind === "error" ? " toast-error" : ""}" role="${this._toastKind === "error" ? "alert" : "status"}" aria-live="${this._toastKind === "error" ? "assertive" : "polite"}">${icon(this._toastKind === "error" ? "bolt" : "check", 15)} ${esc(this._toast)}</div>` : ""}</div></ha-card>`;
    const card = this.shadowRoot.querySelector("ha-card");
    const template = document.createElement("template");
    template.innerHTML = markup;
    // WebKit loses its scroll anchor when the card subtree is swapped and jumps the page by
    // the card's height. Nothing above the card changes here, so any drift is undone.
    const topBefore = card ? this.getBoundingClientRect().top : null;
    if (card) card.replaceWith(template.content.firstElementChild);
    else this.shadowRoot.appendChild(template.content.firstElementChild);
    if (topBefore !== null) {
      const drift = this.getBoundingClientRect().top - topBefore;
      if (Math.abs(drift) > 1) scrollParent(this)?.scrollBy(0, drift);
    }
    // Every action button must be inert in forms unless explicitly declared a submit.
    // This fixes accidental form submissions from ingredient controls and dialog actions.
    for (const button of this.shadowRoot.querySelectorAll("button:not([type])"))
      button.type = "button";
    for (const backdrop of this.shadowRoot.querySelectorAll(".modal-backdrop"))
      this._raiseModal(backdrop);
    this._lastRenderedView = this._view;
    this._lastRenderedTheme = theme;
    this._lastRenderedModal = this._modal;
    if (!viewChanged)
      for (const snap of scrolls) {
        const el = this.shadowRoot.querySelector(snap.selector);
        if (el) {
          el.scrollTop = snap.top;
          el.scrollLeft = snap.left;
        }
      }
    // On phones the navigation is swipeable: keep the active destination in sight.
    // When re-rendering a checkbox, form or timer, do not reset the user's rail position.
    // Layout can still settle after the swap (container queries, fonts), so it runs again next frame.
    const revealNow = this._revealTodayNext;
    this._revealTodayNext = false;
    const gridAppeared =
      !viewChanged && !gridBefore && Boolean(this.shadowRoot.querySelector(".week-grid"));
    if (viewChanged) {
      this._revealActiveNav();
      this._revealToday();
      if (typeof requestAnimationFrame === "function")
        requestAnimationFrame(() => {
          this._revealActiveNav();
          this._revealToday();
        });
    } else if (revealNow || gridAppeared) {
      this._revealToday();
      if (typeof requestAnimationFrame === "function")
        requestAnimationFrame(() => this._revealToday());
    }
    const dialog = this.shadowRoot.querySelector('[role="dialog"]');
    const closeButton = () =>
      this.shadowRoot.querySelector('[role="dialog"] [data-action="close-modal"]');
    if (modalChanged && dialog) {
      this._focusAfterRender(
        () =>
          this.shadowRoot.querySelector(
            '[role="dialog"] [data-input="command-search"], [role="dialog"] [data-autofocus]',
          ) || closeButton(),
      );
    } else if (modalChanged && !dialog && this._modalReturn) {
      const { action, value } = this._modalReturn;
      this._modalReturn = null;
      this._focusAfterRender(() =>
        [...this.shadowRoot.querySelectorAll("[data-action]")].find(
          (el) => el.dataset.action === action && (!value || el.dataset.value === value),
        ),
      );
    } else if (!modalChanged && restoreSelector) {
      // Preserve keyboard position after re-rendering a setting, week or checked item. The same
      // nth match is restored. When the used control is gone or disabled (Next turned into Done,
      // Back disabled on step one), focus moves to the enabled primary step button (never the
      // timer button, which comes first in the markup) and only then to the close button, so a
      // repeated Enter neither closes cooking mode nor starts timers by accident.
      this._focusAfterRender(() => {
        const el = this.shadowRoot.querySelectorAll(restoreSelector)[restoreIndex];
        if (el && !el.disabled) return el;
        if (!this._modal) return null;
        return (
          this.shadowRoot.querySelector(
            '[role="dialog"] .cook-actions .btn.primary:not([disabled])',
          ) || closeButton()
        );
      });
    }
  }
  /**
   * Focus an element after the subtree was swapped. Home Assistant's own ha-card renders its
   * slot asynchronously, so the new content is not focusable (no layout box) during the render
   * call itself and a single focus() silently does nothing. Retry on the next frames until the
   * element really holds focus; a newer render cancels older attempts.
   */
  _focusAfterRender(find) {
    const token = (this._focusToken = (this._focusToken || 0) + 1);
    const attempt = (n) => {
      if (token !== this._focusToken || !this.isConnected) return;
      const el = find();
      if (!el) return;
      el.focus?.({ preventScroll: true });
      if (this.shadowRoot.activeElement === el || n >= 10) return;
      requestAnimationFrame(() => attempt(n + 1));
    };
    attempt(0);
  }
  _handlePointerDown(event) {
    if (
      this._modal !== "cook" ||
      event.pointerType !== "touch" ||
      !event.target.closest?.(".cook-stage")
    )
      return;
    this._cookGesture = { x: event.clientX, y: event.clientY };
  }
  _handlePointerUp(event) {
    if (this._modal !== "cook" || event.pointerType !== "touch" || !this._cookGesture) return;
    const dx = event.clientX - this._cookGesture.x,
      dy = event.clientY - this._cookGesture.y;
    this._cookGesture = null;
    if (Math.abs(dx) < 65 || Math.abs(dy) > 65) return;
    const count = asArray(this._detail?.recipeInstructions).length;
    this._cookIndex = Math.max(
      0,
      Math.min(Math.max(0, count - 1), this._cookIndex + (dx < 0 ? 1 : -1)),
    );
    this._render();
  }
  _handleKeyDown(event) {
    // BEGIN feature B: recipe editor keyboard
    if (this._editorKeyDown(event)) return;
    // END feature B
    const target = event.target;
    const editing = target?.matches?.('input,textarea,select,[contenteditable="true"]');
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (this._modal === "command") {
        this._modal = null;
        this._commandSearchSeq++;
        clearTimeout(this._commandSearchTimer);
      } else {
        this._resetCommandSearch();
        this._modal = "command";
      }
      this._render();
      return;
    }
    if (event.key === "/" && !editing && !this._modal) {
      event.preventDefault();
      this._resetCommandSearch();
      this._modal = "command";
      this._render();
      return;
    }
    // BEGIN feature D: recipe picker keyboard
    if (this._pickerKeydown(event)) return;
    // END feature D
    // A nested Atelier dialog closes itself on Esc; the card dialog underneath must stay open.
    if (
      event.key === "Escape" &&
      this.shadowRoot?.querySelector?.("dialog.at-premium-dialog[open]")
    )
      return;
    if (event.key === "Escape" && this._modal) {
      event.preventDefault();
      if (this._modal === "command") {
        clearTimeout(this._commandSearchTimer);
        this._commandSearchSeq++;
      }
      this._modal = this._modal === "cook" && this._detail ? "recipe" : null;
      this._render();
      return;
    }
    if (this._modal === "command" && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      const buttons = [...this.shadowRoot.querySelectorAll(".command-item:not([hidden])")];
      if (!buttons.length) return;
      if (event.key === "Enter" && target?.matches?.('[data-input="command-search"]')) {
        event.preventDefault();
        const first =
          buttons.find((button) => button.dataset.action === "open-recipe") || buttons[0];
        first?.click();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const index = buttons.indexOf(target);
        const next =
          event.key === "ArrowDown"
            ? (index + 1) % buttons.length
            : index < 0
              ? buttons.length - 1
              : (index - 1 + buttons.length) % buttons.length;
        buttons[next].focus({ preventScroll: true });
        buttons[next].scrollIntoView({ block: "nearest" });
        return;
      }
    }
    if (
      this._modal === "cook" &&
      !editing &&
      (event.key === "ArrowRight" || event.key === "ArrowLeft")
    ) {
      event.preventDefault();
      const n = asArray(this._detail?.recipeInstructions).length;
      this._cookIndex = Math.max(
        0,
        Math.min(n - 1, this._cookIndex + (event.key === "ArrowRight" ? 1 : -1)),
      );
      this._render();
      return;
    }
    if (event.key === "Tab" && this._modal) {
      const dialog = this.shadowRoot.querySelector('[role="dialog"]');
      const nodes = [
        ...(dialog?.querySelectorAll(
          "button:not([disabled]):not([hidden]),input:not([disabled]):not([hidden]),select:not([disabled]),textarea:not([disabled]),a[href]",
        ) || []),
      ].filter((el) => el.getClientRects().length);
      if (!nodes.length) return;
      if (!target || !dialog.contains(target)) {
        // Focus escaped the dialog (or was never inside): pull it back in.
        event.preventDefault();
        (event.shiftKey ? nodes.at(-1) : nodes[0]).focus();
      } else if (event.shiftKey && target === nodes[0]) {
        event.preventDefault();
        nodes.at(-1).focus();
      } else if (!event.shiftKey && target === nodes.at(-1)) {
        event.preventDefault();
        nodes[0].focus();
      }
    }
  }
  /**
   * Open dialogs in the top layer (Popover API), above Home Assistant's sidebar and header.
   * Without the API the backdrop stays fixed inside the dashboard as before.
   */
  _raiseModal(backdrop) {
    if (typeof backdrop.showPopover !== "function") return;
    try {
      backdrop.setAttribute("popover", "manual");
      if (!backdrop.matches(":popover-open")) backdrop.showPopover();
    } catch {
      // A detached or already raised element keeps the fixed layout.
    }
  }
  async _openRecipe(slug) {
    if (!slug) return;
    this._modal = "loading";
    this._toast = "";
    this._render();
    try {
      this._detail = await this._ws("recipe", { slug });
      this._modal = "recipe";
      this._checkedSteps.clear();
      this._checkedIngredients.clear();
      this._cookIndex = 0;
      this._error = "";
    } catch (err) {
      this._modal = null;
      this._error = this._errorText(err);
    }
    this._render();
  }
  /**
   * Run a write. `optimistic` applies the change to local state right away and returns a
   * function that restores the previous state; it runs when the write fails.
   */
  async _mutate(action, payload, refresh = "all", optimistic = null, options = {}) {
    this._toast = "";
    if (
      !this._permissions.can_write ||
      (action.startsWith("recipe") && !this._permissions.can_manage)
    ) {
      this._error = this._noWriteGrant ? this._noWriteGrantText : this.t("readOnlyHint");
      this._render();
      return false;
    }
    // BEGIN feature H: offline queue takes back a waiting tick
    if (this._offlineCollapse(action, payload)) return true;
    // END feature H
    const rollback = optimistic ? optimistic() : null;
    if (rollback) this._render();
    try {
      await this._ws("mutate", { action, payload });
      if (refresh === "shopping") await this._loadShopping();
      if (refresh === "mealplan") await this._loadMealplan();
      if (refresh === "all") {
        this._data.recipes = null;
        await this._refresh();
      }
      if (!options.keepModal) this._modal = null;
      this._flash(action.startsWith("recipe") ? this.t("saved") : this.t("saved"));
      return true;
    } catch (err) {
      if (rollback) rollback();
      // BEGIN feature H: offline queue keeps connectivity failures
      if (this._offlineHandleFailure(action, payload, err)) return true;
      // END feature H
      this._error = "";
      // An import has nothing to undo and does not "save"; a bad URL gets its own hint.
      const failure =
        action === "recipe_import"
          ? this.t(
              err?.code === "invalid_request" || !err?.code
                ? "uiImportFailedUrl"
                : "uiImportFailed",
              { error: this._errorSentence(err) },
            )
          : this.t(rollback ? "uiMutationFailed" : "uiSaveFailed", {
              error: this._errorSentence(err),
            });
      this._flash(failure, "error");
      await this._recoverPermissions(err);
      // Resync with the server: overlapping writes may have changed the collection meanwhile.
      try {
        if (refresh === "shopping") await this._loadShopping();
        if (refresh === "mealplan") await this._loadMealplan();
      } catch {}
      return false;
    }
  }
  // Optimistic local edits for _mutate; each returns its rollback.
  // Every rollback undoes only its own change against the CURRENT data, so an overlapping
  // write that succeeded in the meantime is never overwritten with an older snapshot.
  _optimisticToggle(item_id, checked) {
    const find = () =>
      asArray(this._data.shopping?.items).find((x) => String(x.id) === String(item_id));
    const item = find();
    if (!item) return null;
    const before = item.checked;
    item.checked = checked;
    return () => {
      const current = find();
      if (current) current.checked = before;
    };
  }
  _optimisticDelete(item_id) {
    const before = asArray(this._data.shopping?.items);
    const index = before.findIndex((x) => String(x.id) === String(item_id));
    const removed = index >= 0 ? before[index] : null;
    if (!removed) return null;
    this._data.shopping = {
      ...this._data.shopping,
      items: before.filter((x) => String(x.id) !== String(item_id)),
    };
    return () => {
      const current = asArray(this._data.shopping?.items);
      if (current.some((x) => String(x.id) === String(item_id))) return;
      const next = [...current];
      next.splice(Math.min(index, next.length), 0, removed);
      this._data.shopping = { ...this._data.shopping, items: next };
    };
  }
  _optimisticUpdate(item_id, changes) {
    const item = asArray(this._data.shopping?.items).find((x) => String(x.id) === String(item_id));
    if (!item) return null;
    const before = Object.fromEntries(Object.keys(changes).map((key) => [key, item[key]]));
    Object.assign(item, changes);
    return () => {
      const current = asArray(this._data.shopping?.items).find(
        (x) => String(x.id) === String(item_id),
      );
      if (!current) return;
      // Only fields still holding this edit are restored, so a newer edit is never undone.
      for (const key of Object.keys(before))
        if (current[key] === changes[key]) current[key] = before[key];
    };
  }
  _optimisticClearChecked(list_id) {
    const before = asArray(this._data.shopping?.items);
    const removed = before
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) => item.checked === true && String(item.shoppingListId) === String(list_id),
      );
    if (!removed.length) return null;
    const gone = new Set(removed.map(({ item }) => String(item.id)));
    this._data.shopping = {
      ...this._data.shopping,
      items: before.filter((x) => !gone.has(String(x.id))),
    };
    return () => {
      const next = [...asArray(this._data.shopping?.items)];
      const present = new Set(next.map((x) => String(x.id)));
      for (const { item, index } of removed)
        if (!present.has(String(item.id))) next.splice(Math.min(index, next.length), 0, item);
      this._data.shopping = { ...this._data.shopping, items: next };
    };
  }
  _optimisticAdd(key, row) {
    const before = this._data[key];
    const rows = asArray(key === "shopping" ? before?.items : before);
    const next = [...rows, row];
    this._data[key] = key === "shopping" ? { ...before, items: next } : next;
    return () => {
      const data = this._data[key];
      const current = asArray(key === "shopping" ? data?.items : data);
      const kept = current.filter((x) => String(x.id) !== String(row.id));
      this._data[key] = key === "shopping" ? { ...data, items: kept } : kept;
    };
  }
  _optimisticRemoveMeal(entry_id) {
    const before = asArray(this._data.mealplan);
    const index = before.findIndex((x) => String(x.id) === String(entry_id));
    const removed = index >= 0 ? before[index] : null;
    this._data.mealplan = before.filter((x) => String(x.id) !== String(entry_id));
    return () => {
      if (!removed) return;
      const current = asArray(this._data.mealplan);
      if (current.some((x) => String(x.id) === String(entry_id))) return;
      const next = [...current];
      next.splice(Math.min(index, next.length), 0, removed);
      this._data.mealplan = next;
    };
  }
  _setDesign(field, value) {
    if (
      ![
        "theme",
        "accent",
        "density",
        "motion",
        "columns",
        "radius",
        "show_images",
        "keep_awake",
        "photo_ratio",
        "print_style",
        "print_image",
        "print_checkboxes",
        "print_notes",
        "print_completed",
        "print_nutrition",
        "language",
      ].includes(field)
    )
      return;
    if (field === "accent" && !colorOk(value)) return;
    if (field === "columns") value = Math.max(2, Math.min(4, Number(value) || 3));
    if (field === "theme" && !["auto", "light", "dark"].includes(value)) return;
    if (field === "language" && value !== "auto" && !Object.hasOwn(LABELS, value)) return;
    if (field === "density" && !["compact", "comfortable"].includes(value)) return;
    if (field === "motion" && !["expressive", "balanced", "off"].includes(value)) return;
    if (field === "radius" && !["large", "small", "square"].includes(value)) return;
    if ((field === "show_images" || field === "keep_awake") && typeof value !== "boolean") return;
    if (field === "photo_ratio" && !["portrait", "square", "landscape"].includes(value)) return;
    if (field === "print_style" && !["editorial", "compact", "minimal"].includes(value)) return;
    if (
      [
        "print_image",
        "print_checkboxes",
        "print_notes",
        "print_completed",
        "print_nutrition",
      ].includes(field) &&
      typeof value !== "boolean"
    )
      return;
    this._local[field] = value;
    try {
      localStorage.setItem("mealie-atelier:design", JSON.stringify(this._local));
    } catch {}
    this._render();
    if (field === "theme") {
      this.dispatchEvent(
        new CustomEvent("mealie-atelier-theme-change", {
          bubbles: true,
          composed: true,
          detail: { theme: value },
        }),
      );
    }
    if (field === "motion") {
      this.dispatchEvent(
        new CustomEvent("mealie-atelier-motion-change", {
          bubbles: true,
          composed: true,
          detail: { motion: value },
        }),
      );
    }
    if (field === "language") {
      this.dispatchEvent(
        new CustomEvent("mealie-atelier-language-change", {
          bubbles: true,
          composed: true,
          detail: { language: this._language },
        }),
      );
    }
  }
  async _handleClick(event) {
    const el = event.target?.closest?.("[data-action]");
    if (!el) return;
    const action = el.dataset.action,
      v = el.dataset.value || "";
    if (action === "backdrop" && event.target !== el) return;
    this._toast = "";
    // BEGIN feature B: recipe editor actions
    if (action.startsWith("ed-")) {
      await this._editorClick(el);
      return;
    }
    // END feature B
    // BEGIN feature D: recipe picker actions
    if (action.startsWith("picker-")) return this._pickerClick(action, v);
    // END feature D
    // BEGIN feature H: offline queue actions
    if (action.startsWith("offline-")) return this._offlineClick(action, v);
    // END feature H
    if (action === "nav" && MODES.includes(v)) {
      if (this._modal === "command") {
        clearTimeout(this._commandSearchTimer);
        this._commandSearchSeq++;
      }
      this._view = v;
      this._modal = null;
      this._render();
      return;
    }
    if (action === "command-open") {
      if (this._modal === "command") {
        this._modal = null;
        clearTimeout(this._commandSearchTimer);
        this._commandSearchSeq++;
      } else {
        this._resetCommandSearch();
        this._modal = "command";
      }
      this._render();
      return;
    }
    if (action === "command-all-results") {
      this._query = this._commandQuery;
      this._page = 1;
      this._focusSearch = true;
      this._view = "recipes";
      this._modal = null;
      clearTimeout(this._commandSearchTimer);
      this._commandSearchSeq++;
      await this._searchRecipes();
      return;
    }
    if (action === "refresh") {
      await this._refresh();
      return;
    }
    if (action === "settings") {
      this._modal = "settings";
      this._render();
      return;
    }
    if (action === "print-settings") {
      this._openPrint(
        this._view === "shopping"
          ? "shopping"
          : this._view === "mealplan"
            ? "mealplan"
            : this._detail
              ? "recipe"
              : "mealplan",
      );
      return;
    }
    if (action === "print-recipe") {
      this._openPrint("recipe");
      return;
    }
    if (action === "print-list") {
      this._openPrint("shopping");
      return;
    }
    if (action === "print-week") {
      this._openPrint("mealplan");
      return;
    }
    if (action === "print-style") {
      this._setDesign("print_style", v);
      return;
    }
    if (action === "print-now") {
      this._print();
      return;
    }
    if (action === "nutrition-open") {
      await this._openNutrition();
      return;
    }
    if (action === "nutri-back") {
      this._modal = "recipe";
      this._render();
      return;
    }
    if (action === "journal-open") {
      this._modal = "journal";
      this._render();
      return;
    }
    if (action === "timer-start") {
      const input = this.shadowRoot.querySelector("[data-timer-minutes]");
      const rawMinutes = input?.value;
      const minutes = Number(rawMinutes);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
        const rawLabel = this.shadowRoot.querySelector("[data-timer-label]")?.value;
        this._flash(this.t("uiTimerMinutesRange"), "error");
        // The flash re-renders the card: mark and focus the new input and keep what was typed.
        const fresh = this.shadowRoot.querySelector("[data-timer-minutes]");
        if (fresh) {
          if (rawMinutes !== undefined) fresh.value = rawMinutes;
          fresh.setAttribute?.("aria-invalid", "true");
          fresh.focus?.({ preventScroll: true });
        }
        const freshLabel = this.shadowRoot.querySelector("[data-timer-label]");
        if (freshLabel && rawLabel !== undefined) freshLabel.value = rawLabel;
        return;
      }
      // Create the audio context inside this click so iOS Safari lets the alert beep later.
      this._prepareAudio();
      const now = Date.now(),
        label =
          this.shadowRoot.querySelector("[data-timer-label]")?.value.trim() ||
          this.t("uiKitchenTimer");
      const id = crypto.randomUUID();
      const timer = {
        id,
        label,
        deadline: now + minutes * 60000,
        done: false,
        startedAt: now,
        durationMs: minutes * 60000,
        stepIndex: this._cookIndex + 1,
      };
      try {
        // Native HA cards use the HA-owned scheduler; standalone uses its companion handler.
        let armError = null;
        if (this._hass?.callWS) {
          try {
            await this._ws("alarm_create", {
              timer: { id, label, deadline: timer.deadline, locale: this._language },
            });
            timer.serverArmed = true;
          } catch (error) {
            armError = error;
          }
        }
        // The timer always runs locally; background delivery is best effort.
        this._timers.push(timer);
        this._persistTimers();
        this._render();
        if (armError) {
          // A refusal without a known code (default web app, read-only) is raw English: show the local notice.
          const translated = this._errorText(armError) !== armError?.message;
          this._flash(
            translated
              ? this.t("uiBackgroundTimerError", { error: this._errorSentence(armError) })
              : this.t("uiLocalTimerEnabled"),
          );
        } else {
          this._flash(
            this.t(timer.serverArmed ? "uiBackgroundTimerEnabled" : "uiLocalTimerEnabled"),
          );
        }
      } catch (error) {
        this._flash(
          this.t("uiBackgroundTimerError", { error: this._errorSentence(error) }),
          "error",
        );
      }
      return;
    }
    if (action === "timer-preset") {
      const input = this.shadowRoot.querySelector("[data-timer-minutes]"),
        minutes = Number(v);
      if (input && [5, 10, 15].includes(minutes)) {
        input.value = String(minutes);
        input.focus({ preventScroll: true });
      }
      return;
    }
    if (action === "timer-remove") {
      const timer = this._timers.find((x) => String(x.id) === v);
      if (timer?.serverArmed) {
        try {
          await this._ws("alarm_cancel", { timer_id: timer.id });
        } catch (error) {
          // Gone or already dispatched (or due within clock skew): nothing is left to cancel.
          const settled =
            /already been dispatched|timer not found/i.test(String(error?.message || "")) ||
            timer.deadline <= Date.now() + 60000;
          if (!settled) {
            this._flash(this.t("uiTimerStopError", { error: this._errorSentence(error) }), "error");
            return;
          }
        }
      }
      this._timers = this._timers.filter((timer) => String(timer.id) !== v);
      this._persistTimers();
      this._render();
      return;
    }
    if (action === "nutri-search") {
      const n = this._nutrition,
        i = Number(el.dataset.index);
      if (!n?.rows[i] || n.busy) return;
      const query = String(
        this.shadowRoot.querySelector(`[data-nutri-query="${i}"]`)?.value || "",
      ).trim();
      n.rows[i].query = query;
      n.busy = true;
      n.notice = "";
      n.active = i;
      this._render();
      try {
        n.choices = await this._ws("nutrition_search", { query });
      } catch (error) {
        n.choices = [];
        n.notice = this._errorText(error);
        await this._recoverPermissions(error);
      } finally {
        n.busy = false;
        this._render();
      }
      return;
    }
    if (action === "nutri-select") {
      const n = this._nutrition,
        i = Number(el.dataset.index);
      if (!n) return;
      const selected = n.choices.find((x) => String(x.id) === v);
      if (!selected) return;
      n.rows[i].selected = selected;
      n.report = null;
      n.choices = [];
      n.active = -1;
      n.notice = "";
      this._render();
      return;
    }
    if (action === "nutri-ai") {
      const n = this._nutrition;
      if (!n || n.busy || !n.preview.ai_enabled) return;
      n.busy = true;
      n.notice = "";
      this._render();
      try {
        const suggestions = await this._ws("nutrition_ai", {
          slug: n.preview.slug,
          expected_hash: n.preview.hash,
        });
        if (!Array.isArray(suggestions) || suggestions.length !== n.rows.length)
          throw Error(this.t("uiAiSuggestionCountMismatch"));
        suggestions.forEach((x, i) => {
          n.rows[i].query = String(x.query || "").slice(0, 100);
          n.rows[i].ai_note = x.note;
        });
        n.notice = this.t("uiAISuggestedSearchTermsReviewEveryDatabaseMatchYourself");
      } catch (error) {
        n.notice =
          error?.code === "ai_error" ? this.t("errAiError") : error?.message || this.t("error");
      } finally {
        n.busy = false;
        this._render();
      }
      return;
    }
    if (action === "nutri-calc" || action === "nutri-save") {
      const n = this._nutrition;
      if (!n || n.busy) return;
      n.rows.forEach((row, i) => {
        const input = this.shadowRoot.querySelector(`[data-nutri-grams="${i}"]`);
        if (input) row.grams = Number(input.value);
      });
      n.busy = true;
      n.notice = "";
      this._render();
      try {
        const opts = {
          slug: n.preview.slug,
          expected_hash: n.preview.hash,
          entries: this._nutritionEntries(),
        };
        if (action === "nutri-save") {
          if (!this._permissions.can_manage) throw Error(this.t("adminOnlyHint"));
          const result = await this._ws("nutrition_save", {
            ...opts,
            overwrite_existing: n.replaceExisting,
          });
          n.report = result.report;
          this._detail = await this._ws("recipe", { slug: n.preview.slug });
          this._modal = "recipe";
          this._flash(this.t("uiNutritionSavedToMealie"));
        } else {
          n.report = await this._ws("nutrition_calculate", opts);
          n.notice = this.t("uiCalculatedReviewBeforeSaving");
        }
      } catch (error) {
        n.notice = error?.message || this.t("error");
      } finally {
        n.busy = false;
        this._render();
      }
      return;
    }

    if (["step-add", "step-up", "step-down", "step-remove"].includes(action)) {
      const wrap = this.shadowRoot.querySelector("[data-steps-editor]");
      if (!wrap) return;
      const row = el.closest("[data-editor-step]");
      if (action === "step-add" && wrap.children.length < 60)
        wrap.insertAdjacentHTML("beforeend", this._stepEditRow("", wrap.children.length));
      if (action === "step-remove" && row && wrap.children.length > 1) row.remove();
      if (action === "step-up" && row && row.previousElementSibling)
        wrap.insertBefore(row, row.previousElementSibling);
      if (action === "step-down" && row && row.nextElementSibling)
        wrap.insertBefore(row.nextElementSibling, row);
      this._renumberSteps();
      return;
    }
    if (action === "cook-to-recipe") {
      this._modal = this._detail ? "recipe" : null;
      this._render();
      return;
    }
    if (action === "close-modal" || action === "backdrop") {
      if (this._modal === "command") {
        clearTimeout(this._commandSearchTimer);
        this._commandSearchSeq++;
      }
      this._modal = this._modal === "cook" && this._detail ? "recipe" : null;
      this._render();
      return;
    }
    if (action === "design") {
      this._setDesign(el.dataset.field, v);
      return;
    }
    if (action === "open-recipe") {
      await this._openRecipe(v);
      return;
    }
    if (action === "day-meal") {
      if (v) await this._openRecipe(v);
      else {
        this._planDay = el.dataset?.date || dateYmd(new Date());
        this._modal = "plan";
        this._render();
      }
      return;
    }
    if (
      ["create-form", "import-form", "edit-form"].includes(action) &&
      !this._permissions.can_manage
    )
      return;
    if (
      [
        "plan-form",
        "create-list-form",
        "recipe-to-list-form",
        "shopping-toggle",
        "shopping-edit-form",
        "shopping-delete",
        "shopping-clear-form",
        "shopping-clear-confirm",
        "remove-meal",
      ].includes(action) &&
      !this._permissions.can_write
    )
      return;
    if (action === "create-form") {
      this._modal = "create";
      this._render();
      return;
    }
    if (action === "import-form") {
      this._modal = "import";
      this._render();
      return;
    }
    if (action === "create-list-form") {
      this._modal = "create-list";
      this._render();
      return;
    }
    if (action === "recipe-to-list-form") {
      this._modal = "recipe-to-list";
      this._render();
      return;
    }
    if (action === "reset-design") {
      this._local = {};
      try {
        localStorage.removeItem("mealie-atelier:design");
      } catch {}
      this._render();
      return;
    }
    if (action === "edit-form") {
      if (this._detail) {
        this._modal = "edit";
        // BEGIN feature B: load structured ingredients and history
        this._editorOpen();
        // END feature B
        this._render();
      }
      return;
    }
    if (action === "plan-form") {
      this._planDay = v || dateYmd(new Date());
      this._modal = "plan";
      this._render();
      return;
    }
    if (action === "cook-start") {
      this._modal = "cook";
      this._cookIndex = 0;
      this._render();
      return;
    }
    if (action === "cook-next") {
      this._cookIndex++;
      this._render();
      return;
    }
    if (action === "cook-back") {
      this._cookIndex = Math.max(0, this._cookIndex - 1);
      this._render();
      return;
    }
    if (action === "cook-finish") {
      this._modal = "recipe";
      this._flash(this.t("uiBonAppetitEnjoyYourMeal"));
      return;
    }
    if (action === "step-check") {
      const n = Number(v);
      if (this._checkedSteps.has(n)) this._checkedSteps.delete(n);
      else this._checkedSteps.add(n);
      this._render();
      return;
    }
    if (action === "page") {
      const page = Math.max(1, Number(v) || 1);
      if (page === this._page) return;
      this._page = page;
      await this._searchRecipes();
      return;
    }
    if (action === "week-prev" || action === "week-next" || action === "week-today") {
      this._weekStart =
        action === "week-today"
          ? monday(new Date())
          : addDays(this._weekStart, action === "week-next" ? 7 : -7);
      this._revealTodayNext = action === "week-today";
      await this._loadMealplan();
      return;
    }
    if (action === "shopping-toggle") {
      el.disabled = true;
      const item_id = el.dataset.id;
      const checked = el.dataset.checked !== "true";
      await this._mutate("shopping_toggle", { item_id, checked }, "shopping", () =>
        this._optimisticToggle(item_id, checked),
      );
      return;
    }
    if (action === "shopping-edit-form") {
      const item = this._offlineItems(asArray(this._data.shopping?.items)).find(
        (x) => String(x.id) === String(el.dataset.id),
      );
      if (!item) return;
      this._shoppingEditId = String(item.id);
      this._modal = "shopping-edit";
      this._render();
      return;
    }
    if (action === "shopping-delete") {
      el.disabled = true;
      const item_id = el.dataset.id;
      await this._mutate("shopping_delete", { item_id }, "shopping", () =>
        this._optimisticDelete(item_id),
      );
      return;
    }
    if (action === "shopping-clear-form") {
      if (!this._activeList) return;
      this._modal = "shopping-clear";
      this._render();
      return;
    }
    if (action === "shopping-clear-confirm") {
      el.disabled = true;
      const list_id = this._activeList;
      if (list_id)
        await this._mutate("shopping_clear_checked", { list_id }, "shopping", () =>
          this._optimisticClearChecked(list_id),
        );
      return;
    }
    if (action === "remove-meal") {
      el.disabled = true;
      // Keep the plan dialog open while other entries of that day remain.
      const others = asArray(this._data.mealplan).filter(
        (x) => x.date === this._planDay && String(x.id) !== String(v),
      );
      await this._mutate(
        "mealplan_delete",
        { entry_id: v },
        "mealplan",
        () => this._optimisticRemoveMeal(v),
        { keepModal: this._modal === "plan" && others.length > 0 },
      );
      return;
    }
  }
  _handleInput(event) {
    // BEGIN feature B: recipe editor inputs
    if (this._editorInput(event)) return;
    // END feature B
    const el = event.target;
    const type = el?.dataset?.input;
    // BEGIN feature D: recipe picker inputs
    if (type?.startsWith("picker-")) return this._pickerInput(el, type);
    // END feature D
    if (el?.hasAttribute("data-nutri-replace") && this._nutrition) {
      this._nutrition.replaceExisting = el.checked;
      this._nutrition.report = null;
      this._render();
      return;
    }
    if (el?.hasAttribute("data-nutri-grams") && this._nutrition) {
      const i = Number(el.dataset.nutriGrams);
      this._nutrition.rows[i].grams = el.value === "" ? null : Number(el.value);
      this._nutrition.report = null;
      return;
    }
    if (el?.hasAttribute("data-nutri-query") && this._nutrition) {
      const i = Number(el.dataset.nutriQuery);
      this._nutrition.rows[i].query = el.value;
      this._nutrition.rows[i].selected = null;
      this._nutrition.report = null;
      return;
    }
    if (type === "command-search") {
      this._commandQuery = String(el.value || "")
        .slice(0, 100)
        .trim();
      const active = Boolean(this._commandQuery);
      this._commandFilterViews(this._commandQuery);
      this.shadowRoot.querySelector("[data-command-hint]")?.toggleAttribute("hidden", active);
      clearTimeout(this._commandSearchTimer);
      this._commandSearchSeq++;
      this._commandResults = [];
      this._commandTotal = 0;
      if (!active) {
        this._commandPaint("");
        return;
      }
      if (this._commandQuery.length < 2) {
        this._commandPaint(
          `<p class="command-state">${this.t("uiTypeAtLeastOneMoreCharacter")}</p>`,
        );
        return;
      }
      const conversion = AtelierStudio.convertMeasurementQuery(this._commandQuery);
      if (conversion) {
        this._commandPaint(this._commandConversionMarkup(conversion));
        return;
      }
      this._commandPaint(
        `<div class="command-loading"><span class="command-spinner" aria-hidden="true"></span><span>${this.t("uiSearchingYourRecipes")}</span></div>`,
        true,
      );
      const query = this._commandQuery;
      this._commandSearchTimer = setTimeout(() => this._searchCommandRecipes(query), 220);
      return;
    }
    if (type === "ingredient") {
      const n = Number(el.dataset.index);
      if (el.checked) this._checkedIngredients.add(n);
      else this._checkedIngredients.delete(n);
      return;
    }
    if (type === "shopping-list") {
      this._activeList = el.value;
      this._render();
      return;
    }
    if (type === "columns") {
      this._setDesign("columns", el.value);
      return;
    }
    if (type === "language") {
      this._setDesign("language", el.value);
      return;
    }
    if (type === "keep-awake") {
      this._setDesign("keep_awake", Boolean(el.checked));
      return;
    }
    if (type === "show-images") {
      this._setDesign("show_images", Boolean(el.checked));
      return;
    }
    const printFields = {
      "print-image": "print_image",
      "print-checkboxes": "print_checkboxes",
      "print-notes": "print_notes",
      "print-completed": "print_completed",
      "print-nutrition": "print_nutrition",
    };
    if (printFields[type]) {
      this._setDesign(printFields[type], Boolean(el.checked));
      return;
    }
    if (type === "search") {
      this._query = el.value.slice(0, 100);
      this._page = 1;
      this._focusSearch = true;
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => this._searchRecipes(), 340);
    }
  }
  _resetCommandSearch() {
    clearTimeout(this._commandSearchTimer);
    this._commandSearchSeq++;
    this._commandQuery = "";
    this._commandResults = [];
    this._commandTotal = 0;
  }
  _commandPaint(markup = "", busy = false) {
    const live = this.shadowRoot.querySelector("[data-command-live]");
    if (!live) return;
    live.setAttribute("aria-busy", String(Boolean(busy)));
    live.innerHTML = markup;
  }
  async _searchCommandRecipes(query) {
    const seq = this._commandSearchSeq;
    try {
      const page = await this._ws("recipes", { page: 1, per_page: 8, search: query });
      if (
        seq !== this._commandSearchSeq ||
        this._modal !== "command" ||
        query !== this._commandQuery
      )
        return;
      const items = asArray(page?.items),
        total = Number(page?.total) || items.length;
      if (!items.length) {
        this._commandTotal = 0;
        this._commandPaint(
          `<div class="command-no-results"><span class="command-no-results-icon">${icon("search", 20)}</span><strong>${this.t("uiNoRecipeFoundYet")}</strong><span>${this.t("uiTryAnotherRecipeNameOrIngredient")}</span></div>`,
        );
        return;
      }
      const details = await Promise.allSettled(
        items.slice(0, 6).map((recipe) => this._ws("recipe", { slug: recipe.slug })),
      );
      if (
        seq !== this._commandSearchSeq ||
        this._modal !== "command" ||
        query !== this._commandQuery
      )
        return;
      this._commandTotal = total;
      this._commandResults = items.slice(0, 6).map((recipe, index) => {
        const detail = details[index]?.status === "fulfilled" ? details[index].value : recipe;
        return { recipe, match: AtelierStudio.searchMatch(detail, query) };
      });
      this._commandPaint(this._commandResultsMarkup());
    } catch (error) {
      if (seq !== this._commandSearchSeq || this._modal !== "command") return;
      this._commandPaint(
        `<div class="command-no-results"><strong>${this.t("uiSearchIsUnavailableRightNow")}</strong><span>${esc(error?.message || this.t("error"))}</span></div>`,
      );
    }
  }
  /** Filters the view and action shortcuts by label; hides the whole block when none match. */
  _commandFilterViews(query) {
    const needle = String(query || "")
      .trim()
      .toLowerCase();
    const items = [
      ...(this.shadowRoot?.querySelectorAll?.(".command-shortcuts .command-item") || []),
    ];
    let matches = 0;
    for (const item of items) {
      const hit =
        !needle ||
        String(item.textContent || "")
          .toLowerCase()
          .includes(needle);
      item.toggleAttribute("hidden", !hit);
      if (hit) matches++;
    }
    this.shadowRoot?.querySelector?.(".command-shortcuts")?.toggleAttribute("hidden", !matches);
    return matches;
  }
  _commandConversionMarkup(conversion) {
    const number = (value) =>
      new Intl.NumberFormat(this._language, { maximumFractionDigits: 3 }).format(value);
    const from = `${number(conversion.amount)} ${esc(conversion.sourceUnit)}`;
    const to = `${number(conversion.converted)} ${esc(conversion.targetUnit)}`;
    return `<section class="command-conversion" aria-label="${esc(this.t("uiConversion"))}"><span class="command-conversion-label">${esc(this.t("uiConversion"))}</span>${conversion.unsupported ? `<strong>${from} → ${esc(conversion.targetUnit)}</strong><p>${esc(this.t("uiConversionNeedsDensity"))}</p>` : `<strong>${from} <span aria-hidden="true">=</span> ${to}</strong><p>${esc(this.t("uiConversionExactFactors"))}</p>`}</section>`;
  }
  _commandResultsMarkup() {
    const label = {
      ingredient: this.t("uiIngredient"),
      recipe: this.t("uiRecipeName"),
      mixed: this.t("uiNameIngredient"),
      match: this.t("uiRecipeMatch"),
    };
    const results = this._commandResults
      .map(
        (
          { recipe, match },
          index,
        ) => `<button class="command-item command-recipe ${index === 0 ? "is-featured" : ""}" type="button" data-action="open-recipe" data-value="${esc(recipe.slug)}" aria-label="${esc(this.t("uiOpenRecipe", { name: recipe.name }))}">
      <span class="command-recipe-image">${recipeImage(recipe)}</span><span class="command-recipe-copy"><strong>${esc(recipe.name)}</strong><span class="command-recipe-meta">${recipe.totalTime ? `${icon("clock", 12)} ${esc(AtelierStudio.formatTime(recipe.totalTime, this._language))}` : `${icon("book", 12)} ${esc(recipe.recipeCategory?.[0]?.name || this.t("featured"))}`}</span></span>
      <span class="command-match command-match-${match}">${esc(label[match] || label.match)}</span><span class="command-arrow">${icon("arrow", 15)}</span></button>`,
      )
      .join("");
    const more = `<button class="command-item command-all-results" type="button" data-action="command-all-results">${icon("search", 16)}<span>${this._commandTotal === 1 ? this.t("uiSeeOneResult") : this.t("uiSeeAllResults", { count: this._commandTotal })}</span><span class="command-arrow">${icon("arrow", 15)}</span></button>`;
    return `<div class="command-results-heading"><span>${this.t("uiMATCHINGRECIPES")}</span><span>${this._commandTotal} ${this.t(this._commandTotal === 1 ? "uiResultOne" : "uiresults")}</span></div><div class="command-results-list" role="group" aria-label="${this.t("uiRecipeResults")}">${results}</div>${more}`;
  }
  async _handleSubmit(event) {
    const form = event.target.closest?.("[data-form]");
    if (!form) return;
    event.preventDefault();
    if (this._busy) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    let ok = false;
    switch (form.dataset.form) {
      case "journal": {
        if (this._detail) {
          this._journal[this._detail.slug] = {
            rating: Math.max(0, Math.min(5, Number(values.rating) || 0)),
            note: tidy(values.note, 800),
            updated: new Date().toISOString(),
          };
          this._persistJournal();
          this._modal = "recipe";
          this._flash(this.t("uiNoteSavedOnThisDevice"));
          ok = true;
        }
        break;
      }

      case "create-list": {
        const name = tidy(values.name, 100);
        if (name) {
          const result = await this._mutate("shopping_list_create", { name }, "shopping");
          ok = result;
          if (ok) {
            const list = asArray(this._data.shopping?.lists).find((x) => x.name === name);
            if (list) this._activeList = String(list.id);
            this._render();
          }
        }
        break;
      }
      case "shopping-edit": {
        const item = this._offlineItems(asArray(this._data.shopping?.items)).find(
          (x) => String(x.id) === String(this._shoppingEditId),
        );
        if (!item) {
          this._modal = null;
          this._render();
          break;
        }
        const changes = this._shoppingEditChanges(item, values);
        if (!changes) {
          this._modal = null;
          this._render();
          break;
        }
        ok = await this._mutate(
          "shopping_update",
          { item_id: String(item.id), ...changes },
          "shopping",
          () => this._optimisticUpdate(item.id, this._shoppingEditLocal(item, changes)),
        );
        break;
      }
      case "recipe-to-list":
        if (this._detail?.id && values.list_id)
          ok = await this._mutate(
            "shopping_from_recipe",
            { list_id: values.list_id, recipe_id: this._detail.id },
            "shopping",
          );
        break;
      case "shopping-add":
        if (this._activeList && tidy(values.note))
          ok = await this._mutate(
            "shopping_add",
            { list_id: this._activeList, note: tidy(values.note) },
            "shopping",
            () =>
              this._optimisticAdd("shopping", {
                id: `pending-${Date.now()}-${(this._pendingSeq = (this._pendingSeq || 0) + 1)}`,
                shoppingListId: this._activeList,
                note: tidy(values.note),
                checked: false,
              }),
          );
        break;
      case "plan":
        if (values.recipe_id)
          ok = await this._mutate(
            "mealplan_add",
            { date: values.date, meal_type: values.meal_type, recipe_id: values.recipe_id },
            "mealplan",
            () =>
              this._optimisticAdd("mealplan", {
                id: `pending-${Date.now()}-${(this._pendingSeq = (this._pendingSeq || 0) + 1)}`,
                date: values.date,
                entryType: values.meal_type,
                recipe:
                  this._pickerChosen(values.recipe_id) ||
                  asArray(this._data.recipes?.items).find(
                    (x) => String(x.id) === String(values.recipe_id),
                  ),
              }),
          );
        break;
      case "create":
        if (tidy(values.name))
          ok = await this._mutate("recipe_create", { name: tidy(values.name, 120) }, "all");
        break;
      case "import":
        if (tidy(values.url))
          ok = await this._mutate("recipe_import", { url: tidy(values.url, 2000) }, "all");
        break;
      case "edit":
        if (this._detail && tidy(values.name)) {
          const payload = {
            slug: this._detail.slug,
            name: tidy(values.name, 120),
            description: values.description || "",
            servings: Number(values.servings),
          };
          if (values.replace_instructions)
            payload.instructions = Array.from(form.querySelectorAll("[data-step-text]"), (el) => ({
              id: el.closest("[data-editor-step]")?.dataset.stepId || "",
              text: el.value.trim(),
            })).filter((step) => step.text);
          // BEGIN feature B: plain-text ingredients are no longer sent, the structured editor owns them
          // END feature B
          ok = await this._mutate("recipe_update", payload, "all");
        }
        break;
    }
    if (!ok && btn) btn.disabled = false;
  }
}

/* ATELIER_COMPONENT_METHODS */

/* BEGIN shopping sync routing: modal, click, input and lifecycle hooks for shoppingSyncMethods */
const _syncBaseModalHtml = MealieAtelierCard.prototype._modalHtml;
const _syncBaseClick = MealieAtelierCard.prototype._handleClick;
const _syncBaseInput = MealieAtelierCard.prototype._handleInput;
const _syncBaseRender = MealieAtelierCard.prototype._render;
const _syncBaseDisconnected = MealieAtelierCard.prototype.disconnectedCallback;
MealieAtelierCard.prototype._modalHtml = function () {
  return this._syncModalHtml() || _syncBaseModalHtml.call(this);
};
MealieAtelierCard.prototype._handleClick = async function (event) {
  const el = event.target?.closest?.("[data-action]");
  if (el?.dataset?.action?.startsWith("sync-")) {
    this._toast = "";
    if (await this._syncHandleClick(el)) return;
  }
  return _syncBaseClick.call(this, event);
};
MealieAtelierCard.prototype._handleInput = function (event) {
  if (this._syncHandleInput(event.target || {})) return;
  return _syncBaseInput.call(this, event);
};
MealieAtelierCard.prototype._render = function () {
  _syncBaseRender.call(this);
  this._syncAfterRender();
};
MealieAtelierCard.prototype.disconnectedCallback = function () {
  this._syncPollStop();
  return _syncBaseDisconnected.call(this);
};
/* END shopping sync routing */

class AtelierTodayCard extends MealieAtelierCard {
  static getStubConfig() {
    return { mode: "today" };
  }
}
class AtelierRecipeCard extends MealieAtelierCard {
  static getStubConfig() {
    return { mode: "recipes" };
  }
}
class AtelierMealplanCard extends MealieAtelierCard {
  static getStubConfig() {
    return { mode: "mealplan" };
  }
}
class AtelierShoppingCard extends MealieAtelierCard {
  static getStubConfig() {
    return { mode: "shopping" };
  }
}
class AtelierDiscoverCard extends MealieAtelierCard {
  static getStubConfig() {
    return { mode: "discover" };
  }
}
class AtelierPantryCard extends MealieAtelierCard {
  static getStubConfig() {
    return { mode: "pantry" };
  }
}
class AtelierFamilyCard extends MealieAtelierCard {
  static getStubConfig() {
    return { mode: "family" };
  }
}
class AtelierCookbookCard extends MealieAtelierCard {
  static getStubConfig() {
    return { mode: "cookbook" };
  }
}
class AtelierManageCard extends MealieAtelierCard {
  static getStubConfig() {
    return { mode: "manage" };
  }
}

// Native Home Assistant visual card editor (no YAML editing required).
/* ATELIER_HA_EDITOR */

const CARD_TYPES = [
  [
    "mealie-atelier-card",
    MealieAtelierCard,
    "Mealie Atelier · Complete kitchen",
    "Recipes, meal plan, shopping and management in one card",
  ],
  [
    "mealie-atelier-today",
    AtelierTodayCard,
    "Mealie Atelier · Today",
    "Today's meals and open groceries on one screen",
  ],
  [
    "mealie-atelier-recipes",
    AtelierRecipeCard,
    "Mealie Atelier · Recipes",
    "Recipe collection, search, details and cooking mode",
  ],
  [
    "mealie-atelier-mealplan",
    AtelierMealplanCard,
    "Mealie Atelier · Meal plan",
    "Weekly planner with a searchable recipe picker",
  ],
  [
    "mealie-atelier-shopping",
    AtelierShoppingCard,
    "Mealie Atelier · Shopping",
    "Shopping lists with tick, add and offline queue",
  ],
  [
    "mealie-atelier-discover",
    AtelierDiscoverCard,
    "Mealie Atelier · Discover",
    "Discover recipes and a proposed seven-day menu",
  ],
  [
    "mealie-atelier-pantry",
    AtelierPantryCard,
    "Mealie Atelier · Pantry",
    "Pantry and staples for grocery planning",
  ],
  [
    "mealie-atelier-family",
    AtelierFamilyCard,
    "Mealie Atelier · Family",
    "Shared cooking sessions with helper tasks",
  ],
  [
    "mealie-atelier-cookbook",
    AtelierCookbookCard,
    "Mealie Atelier · Cookbook",
    "A print-ready A4 cookbook",
  ],
  [
    "mealie-atelier-manage",
    AtelierManageCard,
    "Mealie Atelier · Manage",
    "Create, import and edit recipes with a structured editor",
  ],
];
// German names for Home Assistant's card picker; the picker has no i18n hook of its own.
const CARD_TYPES_DE = {
  "mealie-atelier-card": [
    "Mealie Atelier · Komplette Küche",
    "Rezepte, Wochenplan, Einkauf und Verwaltung in einer Karte",
  ],
  "mealie-atelier-today": [
    "Mealie Atelier · Heute",
    "Heutige Mahlzeiten und offene Einkäufe auf einem Bildschirm",
  ],
  "mealie-atelier-recipes": [
    "Mealie Atelier · Rezepte",
    "Rezeptgalerie mit Suche, Details und Kochmodus",
  ],
  "mealie-atelier-mealplan": [
    "Mealie Atelier · Wochenplan",
    "Wochenplan mit durchsuchbarer Rezeptauswahl",
  ],
  "mealie-atelier-shopping": [
    "Mealie Atelier · Einkaufsliste",
    "Einkaufslisten zum Abhaken und Ergänzen, auch offline",
  ],
  "mealie-atelier-discover": [
    "Mealie Atelier · Kochinspo",
    "Rezeptideen und ein vorgeschlagenes Wochenmenü",
  ],
  "mealie-atelier-pantry": [
    "Mealie Atelier · Vorräte",
    "Vorräte und Basiszutaten für die Einkaufsplanung",
  ],
  "mealie-atelier-family": [
    "Mealie Atelier · Gemeinsam kochen",
    "Gemeinsame Kochsessions mit Helferaufgaben",
  ],
  "mealie-atelier-cookbook": ["Mealie Atelier · Kochbuch", "Ein druckfertiges Kochbuch in A4"],
  "mealie-atelier-manage": [
    "Mealie Atelier · Verwalten",
    "Rezepte anlegen, importieren und mit einem strukturierten Editor bearbeiten",
  ],
};
// Read per access so an in-session language switch is reflected the next time the picker opens.
const pickerGerman = () =>
  /^de\b/i.test(globalThis.document?.documentElement?.lang || globalThis.navigator?.language || "");
customElements.define("mealie-atelier-card-editor", MealieAtelierEditor);
for (const [tag, ctor, englishName, englishDescription] of CARD_TYPES) {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === tag))
    window.customCards.push({
      type: tag,
      get name() {
        return (pickerGerman() && CARD_TYPES_DE[tag]?.[0]) || englishName;
      },
      get description() {
        return (pickerGerman() && CARD_TYPES_DE[tag]?.[1]) || englishDescription;
      },
      preview: false,
      documentationURL: "https://alles-automatisch.de/lernen/mealie-atelier",
    });
}
console.info(
  `%cMEALIE ATELIER ${VERSION}`,
  "background:#192b24;color:#9dcbb2;padding:5px 9px;border-radius:6px;",
);
