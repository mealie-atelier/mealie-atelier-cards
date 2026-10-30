// Landing page, middle: a week in the kitchen (scroll stage), features and devices.
import { icon, sectionIds, translator } from "./chrome.mjs";
import { browser, host, phone, shot, shotSources, tablet } from "./media.mjs";
import { SIZES } from "./sections-intro.mjs";

const checks = (items) =>
  `<ul class="checks">${items.map((item) => `<li>${icon("check")}${item}</li>`).join("")}</ul>`;

// A scene is one device: a phone, or the tablet for cooking mode. The stage copy is decorative
// (the stage is aria-hidden); the inline copy carries the alt text.
function scene(ctx, kind, name, alt) {
  if (kind === "tablet")
    return {
      kind,
      inline: tablet(shot(ctx, name, alt, SIZES.tablet)),
      stage: tablet(shot(ctx, name, "", "(max-width: 1240px) 52vw, 680px")),
    };
  return {
    kind,
    inline: phone(shot(ctx, name, alt, "(max-width: 640px) 72vw, 320px")),
    stage: phone(shot(ctx, name, "", "340px")),
  };
}

function everyday(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  // Each step: number, title, text, bullets and one device. Small screens show the device inline,
  // wide screens in the sticky stage. One large device per scene keeps the app UI readable.
  const alt = {
    mealplan: t(
      "Wochenplan auf dem Smartphone: Montag Gnocchi alla Sorrentina mit Foto, daneben der nächste Tag",
      "Meal plan on a phone: Monday Gnocchi alla Sorrentina with a photo, the next day beside it",
    ),
    discover: t(
      "Kochinspo schlägt Pfannen-Eier mit Tomaten und Basilikum vor: 17 Minuten, für 2 Personen, aus deinen Rezepten",
      "Discover suggests skillet eggs with tomatoes and basil: 17 minutes, for 2 people, from your recipes",
    ),
    shopping: t(
      "Einkaufsliste Wocheneinkauf auf dem Smartphone mit einem abgehakten Artikel",
      "Weekly shop list on a phone with one item ticked off",
    ),
    cook: t(
      "Kochmodus auf dem Tablet mit Kochschritt, Foto und Küchentimer",
      "Cooking mode on a tablet with step, photo and kitchen timer",
    ),
    family: t(
      "Gemeinsam kochen in der einfachen Helferansicht: Alex und ein Küchenhelfer im Helfermodus",
      "Family in the simple helper view: Alex and a little helper in helper mode",
    ),
    pantry: t(
      "Einkaufsassistent: was für die geplanten Gerichte wirklich fehlt, sortiert nach Kühlregal, Vorrat und Gemüse",
      "Shopping assistant: what the planned meals really need, sorted into chilled, pantry and produce",
    ),
    cookbook: t(
      "Dein eigenes Kochbuch auf dem Smartphone: Rezepte mit Fotos für das Buch auswählen",
      "Your own cookbook on a phone: pick recipes with photos for the book",
    ),
  };
  const steps = [
    {
      num: t("01 · Sonntag, 18 Uhr", "01 · Sunday, 6 pm"),
      title: t("Sonntag die Woche planen.", "Plan the week on Sunday."),
      text: t(
        "Plane Rezepte für jeden Tag ein und sieh auf einen Blick, was wann auf den Tisch kommt. Die Zutaten schickst du mit einem Tipp auf die Einkaufsliste.",
        "Put a recipe on every day and see at a glance what is for dinner when. One tap sends the ingredients to the shopping list.",
      ),
      list: [
        t(
          "Wochenplan mit durchsuchbarer Rezeptauswahl",
          "Meal plan with a searchable recipe picker",
        ),
        t("Zutaten direkt auf die Einkaufsliste", "Ingredients straight to the shopping list"),
        t("Wochenplan als A4 für den Kühlschrank drucken", "Print the week as A4 for the fridge"),
      ],
      visual: scene(ctx, "phone", "app-phone-mealplan", alt.mealplan),
    },
    {
      num: t("02 · Montag, 17 Uhr", "02 · Monday, 5 pm"),
      title: t("„Was kochen wir heute?“ beantwortet.", "“What are we cooking?” answered."),
      text: t(
        "Kochinspo fragt kurz nach Appetit, Ernährung, Zeit und dem, was noch da ist. Dann schlägt Atelier passende Rezepte aus deiner Sammlung vor, auf Wunsch gleich ein Menü für sieben Tage.",
        "Discover briefly asks about appetite, diet, time and what is still in the house. Then Atelier suggests matching recipes from your own collection, or a menu for seven days if you like.",
      ),
      list: [
        t("Vegetarisch, vegan, mit Fleisch oder Fisch", "Vegetarian, vegan, with meat or fish"),
        t("Nach Zeit und Vorrat gefiltert", "Filtered by time and pantry"),
      ],
      visual: scene(ctx, "phone", "app-phone-discover-results", alt.discover),
    },
    {
      num: t("03 · Dienstag im Supermarkt", "03 · Tuesday at the supermarket"),
      title: t(
        "Im Laden abhaken, zu Hause ist die Liste aktuell.",
        "Tick it off in the shop, the list at home is current.",
      ),
      text: t(
        "Hake ab, was im Wagen liegt. Kein Netz zwischen den Regalen? Atelier merkt sich jeden Haken auf dem Gerät und schickt ihn in der richtigen Reihenfolge nach, genau einmal. Mit Home Assistant geht die Liste per Einkaufs-Sync auf Wunsch weiter an Bring.",
        "Tick off what is in the trolley. No signal between the shelves? Atelier keeps every tick on the device and sends it in the right order later, exactly once. With Home Assistant, the shopping sync can pass the list on to Bring.",
      ),
      list: [
        t("Offline abhaken, später sauber abgeglichen", "Tick off offline, cleanly synced later"),
        t(
          "Einkaufs-Sync zu Bring und anderen To-do-Listen",
          "Shopping sync to Bring and other to-do lists",
        ),
        t(
          "Vorschau, bevor der erste Stapel gesendet wird",
          "A preview before the first batch is sent",
        ),
      ],
      visual: scene(ctx, "phone", "app-phone-shopping", alt.shopping),
    },
    {
      num: t("04 · Mittwoch am Herd", "04 · Wednesday at the stove"),
      title: t("Ein Schritt. Ein Timer. Volle Ruhe.", "One step. One timer. Total calm."),
      text: t(
        "Der Kochmodus zeigt immer nur den nächsten Schritt, groß genug für den Blick vom Herd. Timer startest du direkt am Schritt, mehrere laufen gleichzeitig. Der Bildschirm bleibt dabei an.",
        "Cooking mode only shows the next step, big enough to read from the stove. Start timers right at the step, several can run at once. The screen stays on.",
      ),
      list: [
        t(
          "Wischen oder Pfeiltasten, Schrittfotos inklusive",
          "Swipe or arrow keys, step photos included",
        ),
        t("Mehrere benannte Timer gleichzeitig", "Several named timers at once"),
        t("Notizen für das nächste Mal", "Notes for next time"),
      ],
      visual: scene(ctx, "tablet", "app-tablet-cook", alt.cook),
    },
    {
      num: t("05 · Freitag mit den Kindern", "05 · Friday with the kids"),
      title: t("Gemeinsam kochen.", "Cook together."),
      text: t(
        "Gemeinsam kochen verteilt Helferaufgaben. Kinder sehen in einer einfachen Ansicht nur die Aufgaben, die Erwachsene freigegeben haben. Alle verfolgen denselben Kochfortschritt.",
        "Family hands out helper tasks. Children see only the tasks an adult approved, in a simple view, and everyone follows the same cooking progress.",
      ),
      list: [
        t("Einfache Helferansicht für Kinder", "A simple helper view for children"),
        t("Gemeinsame Timer und Aufgaben", "Shared timers and tasks"),
      ],
      visual: scene(ctx, "phone", "app-phone-family-helper", alt.family),
    },
    {
      num: t("06 · Samstag, Speisekammer", "06 · Saturday, the pantry"),
      title: t("Wissen, was noch da ist.", "Know what is still there."),
      text: t(
        "Trag Vorräte mit Mindesthaltbarkeit ein. Die Übersicht zeigt, was bald verbraucht werden sollte. Die Einkaufsvorschau zieht Vorräte mit gleicher Einheit ab.",
        "Add pantry items with a best-before date. The overview shows what should be used soon, and the shopping preview subtracts stock in matching units.",
      ),
      list: [
        t("Mindesthaltbarkeit im Blick", "Best-before dates at a glance"),
        t("Basisvorrat wie Salz und Öl einmal festlegen", "Set staples like salt and oil once"),
      ],
      visual: scene(ctx, "phone", "app-phone-pantry-assist", alt.pantry),
    },
    {
      num: t("07 · Für immer", "07 · For ever"),
      title: t("Dein eigenes Kochbuch.", "Your own cookbook."),
      text: t(
        "Wähle Lieblingsrezepte. Atelier gestaltet Cover, Inhaltsverzeichnis und A4-Rezeptseiten, als PDF fürs Familienarchiv oder gedruckt als Geschenk.",
        "Pick your favourite recipes. Atelier designs the cover, contents and A4 recipe pages, as a PDF for the family archive or printed as a gift.",
      ),
      list: [
        t(
          "Druckstudio für Rezepte, Listen und Wochenplan",
          "Print studio for recipes, lists and the meal plan",
        ),
        t("Editorial, Kompakt oder tintensparend", "Editorial, compact or ink saver"),
      ],
      visual: scene(ctx, "phone", "app-phone-cookbook", alt.cookbook),
    },
  ];
  const articles = steps
    .map(
      (step, index) =>
        `<article class="step" data-step="${index}"><span class="num">${step.num}</span><h3>${step.title}</h3><p>${step.text}</p>${checks(step.list)}<div class="inline">${step.visual.inline}</div></article>`,
    )
    .join("");
  const shots = steps
    .map(
      (step, index) =>
        `<div class="shot shot-${step.visual.kind}${index ? "" : " active"}" data-shot="${index}">${step.visual.stage}</div>`,
    )
    .join("");
  const dots = steps.map((_, index) => `<i${index ? "" : ' class="on"'}></i>`).join("");
  return `<section class="sec" id="${id.everyday}" aria-labelledby="everyday-title"><div class="wrap"><div class="sec-head"><p class="kicker rv">${t("Was du damit machst", "What you do with it")}</p><h2 id="everyday-title" class="rv d1">${t("Eine Woche in deiner <em>Küche</em>.", "A week in your <em>kitchen</em>.")}</h2><p class="lead rv d2">${t("Keine Funktionsliste, sondern dein Alltag: vom Plan am Sonntag bis zum Kochbuch, das du der Familie schenkst.", "Not a feature list but your everyday life: from Sunday's plan to the cookbook you give to your family.")}</p></div><div class="story"><div class="steps">${articles}</div><div class="stage" aria-hidden="true"><div class="stage-inner">${shots}<div class="stage-dots">${dots}</div></div></div></div></div></section>`;
}

function features(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  const tile = (iconName, title, text, delay = "", extra = "") =>
    `<article class="tile rv${delay}${extra}"><span class="ico">${icon(iconName)}</span><h3>${title}</h3><p>${text}</p></article>`;
  // Tablet-width captures on wide screens, the phone capture on small ones: the app text stays readable.
  const imageTile = (iconName, title, text, label, names, alt, delay = "") => {
    const phoneSource = shotSources(ctx, names.phone);
    const picture = `<picture><source media="(max-width: 620px)" srcset="${phoneSource.srcset}" sizes="270px" width="${phoneSource.entry.width}" height="${phoneSource.entry.height}">${shot(ctx, names.wide, alt, "(max-width: 1000px) 94vw, 580px")}</picture>`;
    return `<article class="tile wide img rv${delay}"><span class="ico">${icon(iconName)}</span><h3>${title}</h3><p>${text}</p>${browser(label, picture)}</article>`;
  };
  return `<section class="sec" id="${id.features}" aria-labelledby="features-title"><div class="wrap"><div class="sec-head"><p class="kicker rv">${t("Alles in einer Karte", "All in one card")}</p><h2 id="features-title" class="rv d1">${t("Alles, was deine Küche <em>braucht</em>.", "Everything your kitchen <em>needs</em>.")}</h2><p class="lead rv d2">${t("Zehn Ansichten, ein Gefühl. Jede ist für einen Moment im Küchenalltag gebaut.", "Ten views, one feel. Each one is built for a moment in your kitchen day.")}</p></div><div class="bento">${imageTile(
    "cal",
    t("Wochenplan", "Meal plan"),
    t(
      "Sieben Tage auf einen Blick, Gerichte per Suche einplanen, als A4 für den Kühlschrank drucken.",
      "Seven days at a glance, plan dishes by search, print as A4 for the fridge.",
    ),
    t("Wochenplan", "Meal plan"),
    { wide: "feature-mealplan", phone: "app-phone-mealplan" },
    t(
      "Wochenplan auf dem Smartphone: Montag Gnocchi alla Sorrentina mit Foto, daneben der nächste Tag",
      "Meal plan on a phone: Monday Gnocchi alla Sorrentina with a photo, the next day beside it",
    ),
  )}${imageTile(
    "cart",
    t("Einkaufsliste mit Sync", "Shopping list with sync"),
    t(
      "Offline abhaken, später sauber abgeglichen. Mit Home Assistant auf Wunsch weiter an Bring und andere To-do-Listen.",
      "Tick off offline, synced cleanly later. With Home Assistant, on to Bring and other to-do lists if you like.",
    ),
    t("Einkaufsliste", "Shopping list"),
    { wide: "feature-shopping", phone: "app-phone-shopping" },
    t(
      "Einkaufsliste Alles für den Einkauf mit abhakbaren Artikeln",
      "Shopping list with items to tick off",
    ),
    " d1",
  )}${tile("timer", t("Kochmodus", "Cooking mode"), t("Ein Schritt pro Bildschirm, Timer direkt am Schritt, der Bildschirm bleibt an.", "One step per screen, timers right at the step, the screen stays on."))}${tile("spark", t("Kochinspo", "Discover"), t("Vorschläge nach Ernährung, Zeit und Vorrat. Aus deiner eigenen Sammlung.", "Suggestions by diet, time and pantry. From your own collection."), " d1")}${tile("jar", t("Vorräte", "Pantry"), t("Mit Mindesthaltbarkeit. Die Einkaufsvorschau zieht ab, was noch da ist.", "With best-before dates. The shopping preview subtracts what you still have."), " d2")}${tile("kids", t("Gemeinsam kochen", "Family"), t("Helferaufgaben für Kinder in einer einfachen Ansicht, ein Fortschritt für alle.", "Helper tasks for children in a simple view, one progress for everyone."))}${tile("print", t("Kochbuch und Druck", "Cookbook and print"), t("Cover, Inhaltsverzeichnis, A4-Rezeptseiten. Als PDF oder gedruckt als Geschenk.", "Cover, contents, A4 recipe pages. As a PDF or printed as a gift."), " d1")}${tile("leaf", t("Nährwerte", "Nutrition"), t("Pro Portion berechnet aus USDA FoodData Central, mit einem kostenlosen Schlüssel.", "Per serving from USDA FoodData Central, with a free key."), " d2")}${tile("edit", t("Rezepteditor", "Recipe editor"), t("Rezepte anlegen, importieren und bearbeiten. Vor jeder Änderung wird gesichert.", "Create, import and edit recipes. Every change is backed up first."))}${tile("book", t("Rezeptsammlung", "Recipe collection"), t("Große Fotos, Suche, Kategorien. Deine Sammlung, endlich zum Stöbern.", "Big photos, search, categories. Your collection, finally fun to browse."), " d1")}${tile("globe", t("Deutsch und Englisch", "English and German"), t("Komplett übersetzt. In Home Assistant folgt die Karte deiner Sprache.", "Fully translated. In Home Assistant the card follows your language."), " d2", " full-m")}</div></div></section>`;
}

function devices(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  return `<section class="sec devices" id="${id.devices}" aria-labelledby="devices-title"><div class="wrap"><div class="sec-head center"><p class="kicker rv">${t("Ein Atelier, jeder Bildschirm", "One Atelier, every screen")}</p><h2 id="devices-title" class="rv d1">${t("In der Hand, an der Wand, <em>am Schreibtisch</em>.", "In your hand, on the wall, <em>at your desk</em>.")}</h2><p class="lead rv d2">${t("Dieselbe Küche passt sich an: Daumenbedienung am Handy, große Tippflächen am Küchentablet, Überblick am großen Bildschirm.", "The same kitchen adapts: thumb reach on the phone, big targets on the kitchen tablet, the full picture on a large screen.")}</p></div><div class="dev-stage"><figure class="rv">${phone(shot(ctx, "app-phone-shopping", t("Einkaufsliste auf dem Smartphone mit abhakbaren Artikeln", "Shopping list on a phone with items to tick off"), "(max-width: 820px) 40vw, 220px"))}<figcaption>Smartphone</figcaption></figure><figure class="tablet-fig rv d1"><div class="tablet"><span class="kiosk-tag">${icon("lock")}${t("Kiosk an der Küchenwand", "Kiosk on the kitchen wall")}</span>${shot(ctx, "app-tablet-today", t("Heute-Ansicht auf dem Küchentablet mit dem geplanten Gericht und den offenen Artikeln", "Today view on the kitchen tablet with the planned dish and open items"), "(max-width: 820px) 94vw, 460px")}</div><figcaption>${t("Küchentablet", "Kitchen tablet")}</figcaption></figure><figure class="rv d2">${browser(host(ctx), shot(ctx, "app-desktop-cook", t("Kochmodus am Computer: großes Foto der Gnocchi neben dem Kochschritt mit Küchentimer", "Cooking mode on a computer: a big photo of the gnocchi next to the step with a kitchen timer"), "(max-width: 820px) 54vw, 560px"))}<figcaption>${t("Computer", "Computer")}</figcaption></figure></div><div class="dev-cols"><article class="rv"><span class="lbl">${icon("phone")}Smartphone</span><h3>${t("Im Laden und unterwegs.", "In the shop and on the go.")}</h3><p>${t("Navigation für den Daumen und Abhaken auch ohne Netz. Die Web-App lässt sich auf den Homescreen legen.", "Navigation for your thumb and ticking off without signal. The web app can go on your home screen.")}</p></article><article class="rv d1"><span class="lbl">${icon("tablet")}${t("Küchentablet", "Kitchen tablet")}</span><h3>${t("Die Küche als Kiosk.", "The kitchen as a kiosk.")}</h3><p>${t("Nur-Lese-Modus für das Wandtablet, der Bildschirm bleibt beim Kochen an, Timer sind aus jedem Winkel lesbar.", "Read-only mode for the wall tablet, the screen stays on while cooking, timers are readable from any angle.")}</p></article><article class="rv d2"><span class="lbl">${icon("monitor")}${t("Computer", "Computer")}</span><h3>${t("Großes Bild, voller Überblick.", "Big picture, full overview.")}</h3><p>${t("Seitenleiste und Schnellzugriff per Tastatur. Hier planst du die Woche, bearbeitest Rezepte und gestaltest das Kochbuch.", "Sidebar and a keyboard quick launcher. This is where you plan the week, edit recipes and design the cookbook.")}</p></article></div></div></section>`;
}

export function renderStory(ctx) {
  return everyday(ctx) + features(ctx) + devices(ctx);
}
