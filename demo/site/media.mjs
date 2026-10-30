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

// Credits stay quiet: a muted caption under the hero photo of a recipe page and one complete
// list on the credits page. Never an overlay on a tile, card or screenshot.
function creditLinks(ctx, recipe) {
  const t = translator(ctx.locale);
  return `${t("Foto", "Photo")}: ${ext(recipe.image.photographerUrl, escapeHtml(recipe.image.photographer))} ${t("auf", "on")} ${ext(recipe.image.sourceUrl, "Unsplash")}`;
}

export function photoCaption(ctx, recipe) {
  return `<p class="photo-caption">${creditLinks(ctx, recipe)}</p>`;
}

export function creditRow(ctx, recipe, url) {
  return `<li>${photo(ctx, recipe, "64px", { className: "credit-thumb" })}<p class="credit-title"><a href="${escapeHtml(url)}">${escapeHtml(recipe.title[ctx.locale])}</a></p><p class="credit-by">${creditLinks(ctx, recipe)}</p></li>`;
}

export const browser = (label, inner, extra = "") =>
  `<div class="browser"${extra}><div class="bar" aria-hidden="true"><i></i><i></i><i></i><span>${label}</span></div>${inner}</div>`;
export const tablet = (inner, extra = "") => `<div class="tablet"${extra}>${inner}</div>`;
export const phone = (inner, extra = "") => `<div class="phone"${extra}>${inner}</div>`;

// Hero devices: CSS frames around real captures, nothing here is interactive. The status time
// matches the frozen clock of scripts/capture-hero.py.
const statusIcons =
  '<span class="icons"><svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg viewBox="0 0 16 12"><path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.3-1.3A10.6 10.6 0 0 0 8 .3 10.6 10.6 0 0 0 .5 3.4l1.3 1.3A8.7 8.7 0 0 1 8 2.2Zm0 3.8c1.4 0 2.6.5 3.6 1.4l1.3-1.3A7 7 0 0 0 8 4.1a7 7 0 0 0-4.9 2l1.3 1.3C5.4 6.5 6.6 6 8 6Zm0 3.7a1.8 1.8 0 0 0-1.3.5L8 11.6l1.3-1.4A1.8 1.8 0 0 0 8 9.7Z"/></svg><svg viewBox="0 0 27 12"><rect x="0.5" y="0.5" width="23" height="11" rx="3.2" fill="none" stroke="currentColor" stroke-opacity=".4"/><rect x="2" y="2" width="16" height="8" rx="2"/><path d="M25 4v4c.8-.3 1.3-1.1 1.3-2S25.8 4.3 25 4Z" fill-opacity=".45"/></svg></span>';

export const heroTablet = (img) =>
  `<figure class="device device-tablet"><span class="cam" aria-hidden="true"></span><div class="screen">${img}</div></figure>`;

export const heroPhone = (ctx, img) =>
  `<figure class="device device-phone"><div class="screen"><div class="status" aria-hidden="true"><span>${ctx.locale === "de" ? "18:52" : "6:52"}</span><span class="island"></span>${statusIcons}</div>${img}<span class="home-bar" aria-hidden="true"></span></div></figure>`;

// Seven arcs of the Week Dial, today in paprika. Shown behind the phone on small screens only.
export const weekDialRing = () =>
  '<svg class="dial" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path class="today" d="M80.96 15.98A46 46 0 0 1 96.00 49.78"/><path d="M95.90 52.99A46 46 0 0 1 78.85 85.83"/><path d="M76.28 87.75A46 46 0 0 1 39.98 94.89"/><path d="M36.87 94.09A46 46 0 0 1 8.65 70.15"/><path d="M7.35 67.22A46 46 0 0 1 8.46 30.24"/><path d="M9.94 27.39A46 46 0 0 1 39.55 5.20"/><path d="M42.70 4.58A46 46 0 0 1 78.51 13.90"/></svg>';

export const host = (ctx) => (ctx.locale === "de" ? "küche.example" : "kitchen.example");
