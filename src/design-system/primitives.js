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
