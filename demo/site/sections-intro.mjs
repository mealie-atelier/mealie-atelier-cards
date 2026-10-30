// Landing page, first half: hero, facts, food, before/after and the opening of the live demo.
import { escapeHtml, icon, sectionIds, translator } from "./chrome.mjs";
import { browser, host, phone, photo, shot, shotSources } from "./media.mjs";

export const bySlug = (ctx, slug) => {
  const recipe = ctx.recipes.find((row) => row.slug === slug);
  if (!recipe) throw new Error(`Unknown demo recipe ${slug}`);
  return recipe;
};
export const SIZES = {
  wide: "(max-width: 980px) 94vw, 720px",
  half: "(max-width: 980px) 94vw, 600px",
  phone: "(max-width: 640px) 46vw, 240px",
  tablet: "(max-width: 980px) 94vw, 640px",
};

function hero(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  return `<section class="hero" aria-labelledby="hero-title"><div class="wrap hero-grid"><div class="hero-copy"><p class="kicker rv"><span class="dot"></span><span class="nw">${t("Für dein Mealie ·", "For your Mealie ·")}</span> <span class="nw">${t("mit oder ohne Home\u00a0Assistant", "with or without Home\u00a0Assistant")}</span></p><h1 id="hero-title" class="rv d1">${t("Gutes Essen.<br><em>Jeden Tag.</em>", "Good food.<br><em>Every day.</em>")}</h1><p class="lead rv d2">${t(
    "Mealie Atelier macht aus deinem selbst gehosteten Mealie eine ruhige, schöne Küche. Woche planen, einkaufen, Schritt für Schritt kochen: auf dem Handy, am Küchentablet und am großen Bildschirm.",
    "Mealie Atelier turns your self-hosted Mealie into a calm, beautiful kitchen. Plan the week, shop, cook step by step: on your phone, on the kitchen tablet and on the big screen.",
  )}</p><div class="btn-row rv d3"><a class="btn btn-primary" href="#${id.demo}">${icon("play")}${t("Live-Demo ausprobieren", "Try the live demo")}</a><a class="btn btn-ghost" href="#${id.install}">${icon("download")}${t("Kostenlos installieren", "Install for free")}</a></div><ul class="hero-meta rv d3"><li>${icon("check")}${t("Open Source, MIT-Lizenz", "Open source, MIT license")}</li><li>${icon("check")}${t("Deutsch und Englisch", "English and German")}</li><li>${icon("check")}${t("Deine Daten bleiben bei dir", "Your data stays with you")}</li></ul></div><div class="stack rv d2">${browser(
    host(ctx),
    shot(
      ctx,
      "app-desktop-dashboard",
      t(
        "Übersicht im Browser: Begrüßung des Küchenassistenten, darunter das Gericht des Tages Pfannen-Eier mit Tomaten und Basilikum und links die Seitenleiste mit allen Bereichen",
        "Overview in the browser: the kitchen assistant's greeting, today's dish Skillet eggs with tomatoes and basil and the sidebar with every view",
      ),
      SIZES.wide,
      { eager: true, priority: true },
    ),
    "",
  )}${phone(
    shot(
      ctx,
      "app-phone-today",
      t(
        "Heute-Ansicht auf dem Smartphone mit dem geplanten Gericht und den offenen Einkäufen",
        "Today view on a phone with the planned dish and the open shopping items",
      ),
      SIZES.phone,
      { eager: true },
    ),
    ' data-speed="0.12"',
  )}<div class="toast" data-speed="0.09" role="img" aria-label="${t("Beispiel einer Timer-Anzeige: Tomatensauce köcheln, noch etwa acht Minuten", "Example of a timer: simmer the tomato sauce, about eight minutes left")}"><span class="ic">${icon("timer")}</span><span><b>${t("Tomatensauce köcheln", "Simmer the tomato sauce")}</b>${t("Timer läuft", "Timer running")} · <time data-countdown="480">08:00</time></span></div></div></div></section>`;
}

function facts(ctx) {
  const t = translator(ctx.locale);
  const fact = (value, text, delay, suffix = "") =>
    `<div class="fact rv${delay}"><b><span data-count="${value}">${value}</span>${suffix}</b><span>${text}</span></div>`;
  return `<section class="facts" aria-label="${t("Mealie Atelier in Zahlen", "Mealie Atelier in numbers")}"><div class="wrap facts-row">${fact(10, t("Ansichten in einer Karte, von Heute bis Kochbuch", "views in one card, from Today to Cookbook"), "")}${fact(2, t("Wege: Home Assistant oder eigene Web-App", "routes: Home Assistant or a web app of its own"), " d1")}${fact(3, t("Rollen pro Person in der Web-App: admin, writer, reader", "roles per person in the web app: admin, writer, reader"), " d2")}${fact(2, t("Sprachen: komplett auf Deutsch und Englisch", "languages: fully in English and German"), " d3")}${fact(0, t("Kostenlos, ohne Abo, ohne Cloud", "Free, no subscription, no cloud"), " d3", "<small>€</small>")}</div></section>`;
}

function food(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  const dishes = [
    ["pfannen-eier-mit-tomaten-und-basilikum", "f1", "(max-width: 820px) 94vw, 520px"],
    ["gnocchi-alla-sorrentina", "f2", "(max-width: 560px) 94vw, (max-width: 820px) 46vw, 320px"],
    ["wan-tan-suppe-mit-pak-choi", "f3", "(max-width: 560px) 94vw, (max-width: 820px) 46vw, 420px"],
    [
      "buttermilch-pancakes-mit-beeren",
      "f4",
      "(max-width: 560px) 94vw, (max-width: 820px) 46vw, 420px",
    ],
    [
      "kokos-curry-mit-kartoffeln-und-karotten",
      "f5",
      "(max-width: 560px) 94vw, (max-width: 820px) 46vw, 320px",
    ],
  ];
  const figures = dishes
    .map(([slug, slot, sizes], index) => {
      const recipe = bySlug(ctx, slug);
      return `<figure class="dish ${slot} rv${index ? ` d${Math.min(index, 3)}` : ""}">${photo(ctx, recipe, sizes, { className: "dish-img" })}<figcaption class="name"><a href="${escapeHtml(ctx.recipeUrl(recipe))}">${escapeHtml(recipe.title[ctx.locale])}</a></figcaption></figure>`;
    })
    .join("");
  return `<section class="sec" aria-labelledby="food-title"><div class="wrap"><div class="sec-head"><p class="kicker rv">${t("Deine Rezepte, endlich schön", "Your recipes, finally beautiful")}</p><h2 id="food-title" class="rv d1">${t("Rezepte, die Lust aufs <em>Kochen</em> machen.", "Recipes that make you want to <em>cook</em>.")}</h2><p class="lead rv d2">${t(
    "Mealie verwaltet deine Rezepte. Atelier inszeniert sie: große Fotos, ruhige Typografie und alles, was du am Herd brauchst, genau dann, wenn du es brauchst.",
    "Mealie keeps your recipes. Atelier stages them: big photos, calm typography and everything you need at the stove, right when you need it.",
  )}</p></div><div class="food-grid">${figures}<div class="food-quote rv d3"><p>${t("„Was kochen wir heute?“ Eine Frage, ein paar Klicks, ein Abendessen.", "“What are we cooking tonight?” One question, a few taps, dinner.")}</p><a class="textlink" href="#${id.everyday}">${t("So sieht deine Woche aus", "See what your week looks like")}${icon("arrow")}</a></div></div></div></section>`;
}

function compare(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  const source = (name) => {
    const { entry, srcset } = shotSources(ctx, name);
    return `<source media="(max-width: 700px)" srcset="${srcset}" sizes="94vw" width="${entry.width}" height="${entry.height}">`;
  };
  const after = `<picture>${source("compare-phone-atelier")}${shot(ctx, "compare-desktop-atelier", t("Nachher: dieselben Rezepte in Mealie Atelier, als Sammlung mit großen Fotos, Suche und Seitenleiste; auf dem Handy das Rezept Gnocchi alla Sorrentina mit Aktionen wie Kochen starten", "After: the same recipes in Mealie Atelier, a collection with big photos, search and sidebar; on a phone the recipe Gnocchi alla Sorrentina with actions such as Start cooking"), "(max-width: 700px) 94vw, 1180px", { className: "after" })}</picture>`;
  const before = `<picture>${source("compare-phone-mealie")}${shot(ctx, "compare-desktop-mealie", t("Vorher: dieselben Rezepte in der Standardoberfläche von Mealie", "Before: the same recipes in Mealie's standard interface"), "(max-width: 700px) 94vw, 1180px", { className: "before" })}</picture>`;
  return `<section class="sec compare" id="${id.compare}" aria-labelledby="ba-title"><div class="wrap"><div class="sec-head center"><p class="kicker rv">${t("Vorher und nachher", "Before and after")}</p><h2 id="ba-title" class="rv d1">${t("Dieselben Rezepte. <em>Eine ganz andere Küche.</em>", "The same recipes. <em>A whole new kitchen.</em>")}</h2><p class="lead rv d2">${t(
    "Links Mealies eigene Oberfläche, rechts dieselben Rezepte aus demselben Mealie in Atelier. Zieh den Regler und sieh selbst.",
    "On the left Mealie's own interface, on the right the same recipes from the same Mealie in Atelier. Drag the handle and see for yourself.",
  )}</p></div><div class="ba-labels rv"><button class="tag l" type="button" data-ba-show="before" aria-pressed="false">${t("Vorher · Mealie", "Before · Mealie")}</button><button class="tag r" type="button" data-ba-show="after" aria-pressed="false">${t("Nachher · Atelier", "After · Atelier")}</button></div><div class="ba rv" data-ba data-label-before="${t("Mealie", "Mealie")}" data-label-after="Mealie Atelier" data-valuetext="${t("{a} Prozent Mealie, {b} Prozent Mealie Atelier", "{a} percent Mealie, {b} percent Mealie Atelier")}">${after}${before}<input type="range" min="0" max="100" value="46" step="1" aria-label="${t("Vergleich verschieben: links Mealie, rechts Mealie Atelier", "Move the comparison: Mealie on the left, Mealie Atelier on the right")}" aria-valuetext="${t("46 Prozent Mealie, 54 Prozent Mealie Atelier", "46 percent Mealie, 54 percent Mealie Atelier")}"><div class="handle" aria-hidden="true"><span class="knob">${icon("drag")}</span></div></div><p class="hint">${icon("drag")}<span class="hint-wide">${t("Ziehen, tippen oder mit den Pfeiltasten verschieben", "Drag, tap or use the arrow keys")}</span><span class="hint-phone">${t("Wischen oder oben zwischen Mealie und Atelier wechseln", "Swipe, or switch between Mealie and Atelier above")}</span></p><div class="ba-notes"><div class="rv"><b>${t("Mealie bleibt, wie es ist", "Mealie stays as it is")}</b>${t("Atelier ist eine neue Oberfläche für dein bestehendes Mealie. Rezepte, Pläne und Listen bleiben dort, wo sie sind.", "Atelier is a new interface for the Mealie you already run. Recipes, plans and lists stay where they are.")}</div><div class="rv d1"><b>${t("Gemacht für die Küche", "Made for the kitchen")}</b>${t("Große Ziele für nasse Finger, ein Schritt pro Bildschirm, Timer direkt am Kochschritt.", "Big targets for wet fingers, one step per screen, timers right at the cooking step.")}</div><div class="rv d2"><b>${t("Gleiche Daten, überall", "Same data everywhere")}</b>${t("Was du am Handy abhakst, steht gleich darauf am Küchentablet und in Mealie selbst.", "What you tick off on your phone shows up on the kitchen tablet and in Mealie itself right after.")}</div></div></div></section>`;
}

// Opens the live demo section; the template places <mealie-atelier-card> right after it.
function demoOpen(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  return `<section class="sec live" id="${id.demo}" aria-labelledby="live-title"><div class="wrap"><div class="live-head"><div class="sec-head"><p class="kicker rv"><span class="dot pulse"></span>${t("Live-Demo", "Live demo")}</p><h2 id="live-title" class="rv d1">${t("Keine Bilder. <em>Die echte Karte.</em>", "No pictures. <em>The real card.</em>")}</h2><p class="lead rv d2">${t(
    "Hier läuft genau die Karte, die du installierst, mit zehn erfundenen Rezepten. Plane die Woche, hake ab, starte den Kochmodus mit Timer.",
    "This is exactly the card you install, running on ten fictional recipes. Plan the week, tick items off, start cooking mode with a timer.",
  )}</p></div><ul class="live-tips rv d2"><li>${icon("cal")}${t("Wochenplan öffnen und ein Gericht einplanen", "Open the meal plan and add a dish")}</li><li>${icon("timer")}${t("Ein Rezept öffnen und „Kochen starten“", "Open a recipe and press “Start cooking”")}</li><li>${icon("spark")}${t("Kochinspo nach Ideen fragen", "Ask Discover for suggestions")}</li></ul></div><p class="live-note">${icon("shield")}<span>${t(
    "Demo-Modus: Suche, Haken, Planung und Timer verwenden Beispieldaten nur im Arbeitsspeicher dieses Tabs. Nichts wird an Mealie oder Home Assistant gesendet.",
    "Demo mode: search, ticks, planning and timers use sample data in this tab's memory only. Nothing is sent to Mealie or Home Assistant.",
  )}</span></p><div class="live-frame"><div class="live-bar" aria-hidden="true"><i></i><i></i><i></i><span>${t("Live · läuft in deinem Browser", "Live · running in your browser")}</span></div>`;
}

export const demoClose = () => `</div></div></section>`;

export function renderIntro(ctx) {
  return hero(ctx) + facts(ctx) + food(ctx) + compare(ctx) + demoOpen(ctx);
}
