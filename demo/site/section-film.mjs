// Trailer section of the landing page: a custom cover over a native video, chapters and an end card.
// The media files are not part of the repository; the generator copies them from ATELIER_FILM_DIR.
import { escapeHtml, icon, sectionIds, translator } from "./chrome.mjs";
import { weekDialRing } from "./media.mjs";

export const FILM_SECONDS = 145;
export const FILM_LABEL = "2:25";

// Start second and label (German, English) of every chapter.
export const CHAPTERS = [
  [0, "Die Frage", "The question"],
  [10, "Auftritt", "Entrance"],
  [17, "Rezepte", "Recipes"],
  [26, "Planen", "Planning"],
  [40, "Einkaufen", "Shopping"],
  [50, "Kochen", "Cooking"],
  [66, "Gemeinsam", "Together"],
  [74, "Extras", "Extras"],
  [90, "Zwei Wege", "Two ways"],
  [115, "Live-Demo", "Live demo"],
];

export const filmLead = (locale) =>
  translator(locale)(
    "Vom Wochenplan über den Einkauf bis zum Kochmodus: So fühlt sich Mealie Atelier im Alltag an. Mit Ton, mit Untertiteln.",
    "From the meal plan to the shop to cooking mode: this is what Mealie Atelier feels like day to day. With sound, with captions.",
  );

export const filmName = (locale) =>
  translator(locale)("Mealie Atelier · Der Film", "Mealie Atelier · The film");

export const filmFile = (locale, suffix) => `trailer-${locale}${suffix}`;

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// Structured data needs absolute URLs, so it exists only when a deployment base URL is known.
export function filmJsonLd(locale, base) {
  if (!base) return null;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: filmName(locale),
    description: filmLead(locale),
    thumbnailUrl: `${base}film/${filmFile(locale, "-poster.jpg")}`,
    uploadDate: "2026-11-01",
    duration: "PT2M25S",
    contentUrl: `${base}film/${filmFile(locale, "-h264.mp4")}`,
    inLanguage: locale,
  };
}

export function renderFilm(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  const dir = `${ctx.root}film/`;
  const file = (suffix) => `${dir}${filmFile(ctx.locale, suffix)}`;
  const playLabel = t(`Film ab · ${FILM_LABEL}`, `Play the film · ${FILM_LABEL}`);
  const replayLabel = t("Nochmal ansehen", "Watch again");
  const chapters = CHAPTERS.map(([start, de, en], index) => {
    const end = CHAPTERS[index + 1]?.[0] ?? FILM_SECONDS;
    return `<li><button type="button" data-film-chapter data-start="${start}" data-end="${end}"><span class="film-time">${clock(start)}</span><span class="film-name">${t(de, en)}</span></button></li>`;
  }).join("");
  return `<section class="sec film" id="film" aria-labelledby="film-title"><div class="wrap"><div class="sec-head center"><p class="kicker rv">${t("Der Film", "The film")} · ${FILM_LABEL}</p><h2 id="film-title" class="rv d1">${t("Zweieinhalb Minuten. <em>Eine ganze Küche.</em>", "Two and a half minutes. <em>A whole kitchen.</em>")}</h2><p class="lead rv d2">${filmLead(ctx.locale)}</p></div><div class="film-stage rv" data-film data-play-label="${escapeHtml(playLabel)}" data-replay-label="${escapeHtml(replayLabel)}"><div class="film-frame"><video preload="none" playsinline controls poster="${file("-poster.jpg")}"><source src="${file("-av1.mp4")}" type='video/mp4; codecs="av01.0.08M.10"'><source src="${file("-hevc.mp4")}" type='video/mp4; codecs="hvc1"'><source src="${file("-h264.mp4")}" type='video/mp4; codecs="avc1.640028"'><track kind="captions" srclang="${ctx.locale}" label="${t("Deutsch", "English")}" src="${file(".vtt")}"></video><button class="film-cover" type="button" aria-label="${escapeHtml(t(`Film abspielen, ${FILM_LABEL} Minuten`, `Play the film, ${FILM_LABEL} minutes`))}"><span class="film-play">${weekDialRing()}<span class="film-disc">${icon("play")}</span></span><span class="film-cap">${playLabel}</span></button></div><div class="film-end" inert><div class="film-end-row"><a class="btn btn-primary" href="#${id.demo}">${icon("play")}${t("Live-Demo ausprobieren", "Try the live demo")}</a><a class="btn btn-ghost" href="#${id.install}">${icon("download")}${t("Kostenlos installieren", "Install for free")}</a></div></div><ol class="film-chapters" aria-label="${t("Kapitel", "Chapters")}">${chapters}</ol></div></div></section>`;
}
