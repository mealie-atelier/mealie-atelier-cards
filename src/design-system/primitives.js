/* Shared semantic UI constructors. User content is escaped at this boundary.
   The views supply data and interactions; the design system supplies structure. */
const AtelierUI = Object.freeze({
  attribution() {
    return `<span class="atelier-credit">Made with <span class="atelier-credit-heart" aria-hidden="true">♥</span> by <a href="https://alles-automatisch.de/" target="_blank" rel="noopener noreferrer">Daniel</a></span>`;
  },
  pageHeader({ title = "", description = "", kicker = "", highlight = "", compact = false } = {}) {
    const titleText = String(title);
    const match = highlight ? titleText.indexOf(highlight) : -1;
    const titleHtml =
      match < 0
        ? esc(titleText)
        : esc(titleText.slice(0, match)) +
          "<em>" +
          esc(highlight) +
          "</em>" +
          esc(titleText.slice(match + highlight.length));
    return `<header class="ds-page-header ${compact ? "ds-page-header--compact" : ""}">
      ${kicker ? `<span class="eyebrow">${esc(kicker)}</span>` : ""}
      <h1>${titleHtml}</h1>
      ${description ? `<p>${esc(description)}</p>` : ""}
    </header>`;
  },
  sectionHeading({ title = "", description = "", kicker = "", id = "" } = {}) {
    const identity = id && /^[a-z][a-z0-9_-]*$/i.test(id) ? ` id="${id}"` : "";
    return `<div class="studio-head ds-surface-header">
      ${kicker ? `<span class="eyebrow">${esc(kicker)}</span>` : ""}
      <h2${identity}>${esc(title)}</h2>
      ${description ? `<p>${esc(description)}</p>` : ""}
    </div>`;
  },
  surfaceStart({ className = "", labelledBy = "", tone = "" } = {}) {
    const classes = String(className)
      .split(" ")
      .filter((x) => /^[a-z][a-z0-9-]*$/i.test(x))
      .join(" ");
    const labelled = /^[a-z][a-z0-9_-]*$/i.test(labelledBy)
      ? ` aria-labelledby="${labelledBy}"`
      : "";
    const accent = ["subtle", "flat"].includes(tone) ? ` data-tone="${tone}"` : "";
    return `<section class="studio-panel ds-surface ${classes}"${labelled}${accent}>`;
  },
  metric({ value = "", label = "", graphic = "spark" } = {}) {
    const supported = Object.hasOwn(ICONS, graphic) ? graphic : "spark";
    return `<div class="stat ds-metric"><div class="stat-icon">${icon(supported, 20)}</div>
      <div><strong>${esc(value)}</strong><span>${esc(label)}</span></div></div>`;
  },
  empty({ title = "", description = "", iconName = "book" } = {}) {
    const graphic = Object.hasOwn(ICONS, iconName) ? iconName : "book";
    return `<div class="ds-empty" role="status">${icon(graphic, 24)}<strong>${esc(title)}</strong>${description ? `<p>${esc(description)}</p>` : ""}</div>`;
  },
  field({
    label = "",
    name = "",
    value = "",
    type = "text",
    required = false,
    hint = "",
    placeholder = "",
  } = {}) {
    if (!/^[a-z][a-z0-9_-]*$/i.test(name)) throw Error("Unsafe field name");
    if (!["text", "number", "date", "url", "email"].includes(type))
      throw Error("Unsupported field type");
    return `<label class="ds-field"><span>${esc(label)}${required ? " *" : ""}</span>
      <input name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? "required" : ""}>
      ${hint ? `<small class="ds-field-hint">${esc(hint)}</small>` : ""}</label>`;
  },
});

/* Keeps the screen awake with the Screen Wake Lock API. Every call is a no-op where the API is
   missing or refuses (battery saver, insecure context), so callers never need to guard. */
const AtelierWakeLock = Object.freeze({
  supported(nav = typeof navigator === "undefined" ? undefined : navigator) {
    return typeof nav?.wakeLock?.request === "function";
  },
  create(nav = typeof navigator === "undefined" ? undefined : navigator) {
    let sentinel = null,
      wanted = false,
      pending = false;
    const drop = () => {
      const held = sentinel;
      sentinel = null;
      try {
        Promise.resolve(held?.release?.()).catch(() => {});
      } catch {}
    };
    const acquire = async () => {
      if (!wanted || sentinel || pending || !AtelierWakeLock.supported(nav)) return;
      pending = true;
      try {
        const lock = await nav.wakeLock.request("screen");
        if (!wanted) {
          sentinel = lock;
          drop();
          return;
        }
        sentinel = lock;
        // The browser releases the lock on its own when the tab is hidden.
        lock.addEventListener?.("release", () => {
          if (sentinel === lock) sentinel = null;
        });
      } catch {
        sentinel = null;
      } finally {
        pending = false;
      }
    };
    return {
      /** Request (true) or release (false) the lock; safe to call on every render. */
      async set(want) {
        wanted = Boolean(want);
        if (wanted) await acquire();
        else drop();
      },
      /** Re-acquire after the page becomes visible again, if the lock is still wanted. */
      async resume() {
        await acquire();
      },
      get active() {
        return Boolean(sentinel);
      },
    };
  },
});
