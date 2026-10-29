// Image markup for the demo site. Every image carries width, height and alt; below the fold it
// loads lazily. Product shots come from demo/showcase (see manifest.json), recipe photos from
// demo/photos with resized variants in demo/showcase/photos.
import { escapeHtml, ext, translator } from "./chrome.mjs";

function attributes({ alt, eager = false, priority = false }) {
  return `alt="${escapeHtml(alt)}"${eager ? "" : ' loading="lazy"'} decoding="async"${priority ? ' fetchpriority="high"' : ""}`;
}

// ctx: { locale, root, manifest }
export function shotSources(ctx, name) {
  const entry = ctx.manifest[ctx.locale]?.[name];
  if (!entry) throw new Error(`Demo showcase image missing from manifest: ${ctx.locale}/${name}`);
  const url = (width) => `${ctx.root}showcase/${ctx.locale}/${name}-${width}.webp`;
  return {
    entry,
    src: url(entry.widths.at(-1)),
    srcset: entry.widths.map((width) => `${url(width)} ${width}w`).join(", "),
  };
}

export function shot(ctx, name, alt, sizes, options = {}) {
  const { entry, src, srcset } = shotSources(ctx, name);
  const className = options.className ? ` class="${options.className}"` : "";
  return `<img${className} src="${src}" srcset="${srcset}" sizes="${sizes}" width="${entry.width}" height="${entry.height}" ${attributes({ alt, ...options })}>`;
}

export function photoName(recipe) {
  return recipe.image.file
    .split("/")
    .at(-1)
    .replace(/\.webp$/, "");
}

export function photo(ctx, recipe, sizes, options = {}) {
  const name = photoName(recipe);
  const entry = ctx.manifest.photos[name];
  if (!entry) throw new Error(`Demo photo variants missing for ${name}`);
  const url = (width) => `${ctx.root}showcase/photos/${name}-${width}.webp`;
  const srcset = [
    ...entry.widths.map((width) => `${url(width)} ${width}w`),
    `${ctx.root}photos/${name}.webp ${entry.width}w`,
  ].join(", ");
  const alt = options.alt ?? recipe.image.alt[ctx.locale];
  const className = options.className ? ` class="${options.className}"` : "";
  return `<img${className} src="${url(entry.widths.at(-1))}" srcset="${srcset}" sizes="${sizes}" width="${entry.width}" height="${entry.height}" ${attributes({ ...options, alt })}>`;
}

// The credit sits at the photo, never in the footer.
export function credit(ctx, recipe, className = "credit") {
  const t = translator(ctx.locale);
  return `<p class="${className}">${t("Foto", "Photo")}: ${ext(recipe.image.photographerUrl, escapeHtml(recipe.image.photographer))} · ${ext(recipe.image.sourceUrl, "Unsplash")}</p>`;
}

export const browser = (label, inner, extra = "") =>
  `<div class="browser"${extra}><div class="bar" aria-hidden="true"><i></i><i></i><i></i><span>${label}</span></div>${inner}</div>`;
export const tablet = (inner, extra = "") => `<div class="tablet"${extra}>${inner}</div>`;
export const phone = (inner, extra = "") => `<div class="phone"${extra}>${inner}</div>`;

export const host = (ctx) => (ctx.locale === "de" ? "küche.example" : "kitchen.example");
