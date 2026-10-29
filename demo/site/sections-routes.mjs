// Landing page, second half: Home Assistant, the standalone web app, AI helpers, open source,
// install routes and the closing call to action. Facts follow README.md, web/README.md and the
// Bridge README: the hacs/default listing is submitted, not merged; today HACS installs it as a
// custom repository.
import { escapeHtml, ext, icon, links, sectionIds, translator } from "./chrome.mjs";
import { browser, phone, photo, shot, tablet } from "./media.mjs";
import { bySlug } from "./sections-intro.mjs";

const checks = (items) =>
  `<ul class="badge-row">${items.map((item) => `<li>${icon("check")}${item}</li>`).join("")}</ul>`;

function homeAssistant(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  // The Bridge sends its timer notification in German only (alarms.py), so both pages show that
  // exact text; the English page says so below the mockup.
  const notification = (title, body, when) =>
    `<div class="notif"><span class="notif-ic">${icon("timer")}</span><span><b>${title}</b>${body}<small>${when}</small></span></div>`;
  const timerTitle = "Mealie Atelier · Küchentimer";
  return `<section class="sec ha" id="${id.homeAssistant}" aria-labelledby="ha-title"><div class="wrap"><div class="ha-hero"><div class="copy"><p class="kicker rv"><span class="dot"></span>${t("Für Home Assistant", "For Home Assistant")}</p><h2 id="ha-title" class="rv d1">${t("Deine Küche, <em>mitten im Smart Home</em>.", "Your kitchen, <em>right in your smart home</em>.")}</h2><p class="lead rv d2">${t(
    "Mealie Atelier Cards bringen die ganze Küche als Karte in deine Dashboards. Die Bridge verbindet Home Assistant sicher mit Mealie: Der Mealie-Token bleibt auf dem Server und jede Änderung prüft die Rechte deines Home-Assistant-Kontos.",
    "Mealie Atelier Cards put the whole kitchen into your dashboards as a card. The Bridge connects Home Assistant to Mealie safely: the Mealie token stays on the server and every change checks the rights of your Home Assistant account.",
  )}</p><div class="rv d3">${checks([t("Dashboard-Karten mit visuellem Editor", "Dashboard cards with a visual editor"), t("Bridge-Integration", "Bridge integration"), t("Ab Home Assistant 2026.10", "Home Assistant 2026.10 or newer")])}</div></div><div class="ha-visual rv d1">${browser("Home Assistant", shot(ctx, "ha-desktop-dashboard", t("Home-Assistant-Dashboard mit der Mealie-Atelier-Karte: Übersicht mit Begrüßung und dem Gericht des Tages", "Home Assistant dashboard with the Mealie Atelier card: overview with greeting and today's dish"), "(max-width: 1000px) 90vw, 640px"), ' data-speed="-0.03"')}${phone(shot(ctx, "ha-phone-dashboard", t("Dieselbe Karte in Home Assistant auf dem Smartphone", "The same card in Home Assistant on a phone"), "(max-width: 1000px) 26vw, 190px"), ' data-speed="0.08"')}</div></div><div class="ha-grid"><article class="card c-sync rv"><p class="kicker">${t("Einkaufs-Sync", "Shopping sync")}</p><h3>${t("Mealie-Liste rein, Bring-Liste raus.", "Mealie list in, Bring list out.")}</h3><p>${t(
    "Der Sync läuft in Home Assistant, auch wenn kein Dashboard offen ist. Ziel ist jede To-do-Liste, zum Beispiel Bring über die eigene Integration. Die Bridge fragt nie nach Bring-Zugangsdaten.",
    "The sync runs in Home Assistant, even with no dashboard open. The target is any to-do list, for example Bring through its own integration. The Bridge never asks for Bring credentials.",
  )}</p><ol class="timeline"><li><b>${t("Quelle wählen", "Pick the source")}</b><span>${t("Die Einkaufsliste in Mealie, zum Beispiel „Wocheneinkauf“.", "The shopping list in Mealie, for example “Weekly shop”.")}</span></li><li><b>${t("Ziel und Modus festlegen", "Set target and mode")}</b><span>${t("Kopieren lässt Mealie unverändert, Verschieben hakt erst ab, wenn das Ziel bestätigt hat.", "Copy leaves Mealie unchanged, Move only ticks off once the target has confirmed.")}</span></li><li><b>${t("Vorschau prüfen, ersten Stapel senden", "Check the preview, send the first batch")}</b><span>${t("Vorher wird nichts automatisch gesendet. Konflikte warten auf deine Entscheidung.", "Nothing is sent on its own before that. Conflicts wait for your decision.")}</span></li></ol>${browser("Home Assistant", shot(ctx, "ha-sync-setup", t("Sync-Regel bearbeiten: Quellliste Wocheneinkauf, Zielliste in Home Assistant und Modus Kopieren", "Edit sync rule: source list Weekly shop, target list in Home Assistant and mode Copy"), "(max-width: 1000px) 90vw, 680px", { className: "crop-top" }))}</article><article class="card c-timer rv d1"><p class="kicker">${t("Timer-Benachrichtigung", "Timer notification")}</p><h3>${t("Der Timer klingelt auch in der Hosentasche.", "The timer rings in your pocket too.")}</h3><p>${t(
    "Wenn ein Küchentimer abläuft, schickt Home Assistant eine Nachricht über deinen Benachrichtigungsdienst, zum Beispiel an die Home-Assistant-App auf dem Handy. Auch wenn der Browser längst zu ist.",
    "When a kitchen timer ends, Home Assistant sends a message through your notify service, for example to the Home Assistant app on your phone. Even when the browser has long been closed.",
  )}</p>${t("", '<p class="notif-note">The Bridge sends this notification in German for now.</p>')}<div class="notif-phone" lang="de" aria-hidden="true"><div class="clock">18:42</div><div class="date">${t("Mittwoch, 28. Oktober", "Wednesday, 28 October")}</div>${notification(timerTitle, "Tomatensauce ist fertig!", t("jetzt", "now"))}${notification(timerTitle, "Gnocchi ist fertig!", t("vor 6 Min.", "6 min ago"))}${notification(timerTitle, "Ofen ist fertig!", t("vor 25 Min.", "25 min ago"))}</div></article><article class="card c-install rv"><p class="kicker">${t("Installation", "Installation")}</p><h3>${t("Installieren wie jede andere Erweiterung.", "Install it straight from HACS.")}</h3><p>${t(
    "Cards und Bridge sind für den Standardkatalog eingereicht, aus dem der Home Assistant Marketplace (ab Home Assistant 2026.11) und HACS lesen. Bis der Eintrag freigeschaltet ist, installierst du beide über HACS als benutzerdefiniertes Repository, mit einem Klick.",
    "Cards and Bridge are submitted to the default catalog that the Home Assistant Marketplace (Home Assistant 2026.11 and newer) and HACS both read. Until the listing is merged, you install both through HACS as a custom repository, in one click.",
  )}</p>${browser("Home Assistant", shot(ctx, "ha-integration", t("Integrationsseite der Mealie Atelier Bridge in Home Assistant mit einem verbundenen Dienst", "Integration page of the Mealie Atelier Bridge in Home Assistant with one connected service"), "(max-width: 1000px) 90vw, 480px", { className: "crop-top" }))}</article><article class="card c-rights rv d1"><p class="kicker">${t("Rechte pro Person", "Rights per person")}</p><h3>${t("Alle sehen die Küche. Ändern darf, wer soll.", "Everyone sees the kitchen. Only the right people change it.")}</h3><p>${t(
    "Die Bridge prüft jede Änderung auf dem Server, nicht nur in der Oberfläche. Ausgeblendete Knöpfe sind hier Komfort, keine Sicherheit.",
    "The Bridge checks every change on the server, not just in the interface. Hidden buttons are a convenience here, not the security.",
  )}</p><div class="rights"><div><span class="who" aria-hidden="true"><i>A</i></span><b>${t("Verwalten", "Manage")}</b><span>${t("Administratoren dürfen alles. Rezepte bearbeiten bleibt ihnen vorbehalten.", "Administrators can do everything. Editing recipes stays theirs alone.")}</span></div><div><span class="who" aria-hidden="true"><i>M</i><i>T</i></span><b>${t("Mitplanen", "Plan along")}</b><span>${t("Ausgewählte Personen ändern Einkaufsliste und Wochenplan.", "Chosen people change the shopping list and the week plan.")}</span></div><div><span class="who" aria-hidden="true"><i>K</i></span><b>${t("Nur lesen", "Read only")}</b><span>${t("Der Nur-Lese-Modus sperrt Änderungen für alle.", "Read-only mode blocks changes for everyone.")}</span></div></div><p class="rights-note">${icon("shield")}<span><b>${t("Der Mealie-Token bleibt in Home Assistant.", "The Mealie token stays in Home Assistant.")}</b> ${t("Die Karte im Browser bekommt ihn nie zu sehen, sie spricht nur mit der Bridge.", "The card in the browser never sees it, it only talks to the Bridge.")}</span></p></article></div></div></section>`;
}

function webApp(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  const point = (iconName, title, text, delay = "", extra = "") =>
    `<article class="rv${delay}${extra}"><span class="ico">${icon(iconName)}</span><div><h3>${title}</h3>${text}</div></article>`;
  const terminal = `<div class="term rv d3" role="img" aria-label="${t("Beispiel: Repository holen, drei Einstellungen in die .env schreiben, danach docker compose up -d --build", "Example: get the repository, write three settings into .env, then docker compose up -d --build")}"><div class="bar" aria-hidden="true"><i></i><i></i><i></i><span>web/.env</span></div><pre><span class="p">$</span> cp .env.example .env
<span class="c"># .env</span>
MEALIE_URL=https://mealie.example.com
MEALIE_API_TOKEN=<span class="c">${t("dein-mealie-token", "your-mealie-token")}</span>
ATELIER_PASSWORD=<span class="c">${t("mindestens-12-zeichen", "at-least-12-characters")}</span>

<span class="p">$</span> docker compose up -d --build</pre></div>`;
  return `<section class="sec solo" id="${id.webApp}" aria-labelledby="solo-title"><div class="wrap"><div class="solo-grid"><div class="sec-head"><p class="kicker rv"><span class="dot"></span>${t("Ohne Home Assistant", "Without Home Assistant")}</p><h2 id="solo-title" class="rv d1">${t("Kein Smart Home? <em>Kein Problem.</em>", "No smart home? <em>No problem.</em>")}</h2><p class="lead rv d2">${t(
    "Die Web-App bringt dieselbe Küche als eigenen kleinen Server neben dein Mealie: ein Docker-Container, ein gemeinsames Passwort oder eigene Konten pro Person, fertig.",
    "The web app brings the same kitchen as a small server of its own next to your Mealie: one Docker container, a shared password or an account per person, done.",
  )}</p>${terminal}</div><div class="solo-visual rv d1">${tablet(shot(ctx, "app-tablet-mealplan", t("Wochenplan in der Web-App auf dem Tablet", "Week plan in the web app on a tablet"), "(max-width: 980px) 86vw, 560px"), ' data-speed="-0.03"')}${phone(shot(ctx, "app-phone-mealplan", t("Wochenplan in der Web-App auf dem Smartphone", "Week plan in the web app on a phone"), "(max-width: 980px) 26vw, 170px"), ' data-speed="0.07"')}</div></div><div class="solo-points">${point(
    "lock",
    t("Ein Passwort oder Konten pro Person", "One password or an account per person"),
    `<p>${t("Ein gemeinsames Passwort (ATELIER_PASSWORD, mindestens 12 Zeichen) reicht für den Anfang. Wer mehr will, gibt jeder Person ein eigenes Konto mit einer Rolle (ATELIER_USERS).", "A shared password (ATELIER_PASSWORD, at least 12 characters) is enough to start. If you want more, give everyone their own account with a role (ATELIER_USERS).")}</p><table class="roles"><thead><tr><th scope="col">${t("Rolle", "Role")}</th><th scope="col">${t("Darf", "May")}</th></tr></thead><tbody><tr><td>admin</td><td>${t("alles, auch Rezepte anlegen, importieren und bearbeiten", "everything, including creating, importing and editing recipes")}</td></tr><tr><td>writer</td><td>${t("Einkaufslisten, Wochenplan und Küchenstand", "shopping lists, meal plans and kitchen state")}</td></tr><tr><td>reader</td><td>${t("nur ansehen, eigene Küchentimer laufen trotzdem", "view only, personal kitchen timers still work")}</td></tr></tbody></table>`,
    "",
    " span3",
  )}${point("tablet", t("Kiosk-Modus fürs Küchentablet", "Kiosk mode for the kitchen tablet"), `<p>${t("Mit ATELIER_READ_ONLY=true wird der Server schreibgeschützt. Er lehnt dann jede Änderung ab, statt nur Knöpfe zu verstecken.", "With ATELIER_READ_ONLY=true the server turns read-only. It then rejects every change instead of just hiding buttons.")}</p>`, " d1")}${point("download", t("Als App installieren", "Install as an app"), `<p>${t("Auf iPhone, iPad und Android zum Homescreen hinzufügen. Startet im Vollbild, mit eigenem Symbol.", "Add it to the home screen on iPhone, iPad and Android. It starts full screen, with its own icon.")}</p>`)}${point("bell", t("Timer per Push", "Timers by push"), `<p>${t("Abgelaufene Küchentimer melden sich per Web Push auf dem Handy, auch wenn die Seite gerade nicht offen ist.", "Finished kitchen timers arrive by Web Push on your phone, even when the page is not open.")}</p>`, " d1")}${point("shield", t("Der Token bleibt auf dem Server", "The token stays on the server"), `<p>${t("Der Browser spricht nur mit deiner Web-App, der Mealie-Token verlässt den Server nie. Passwörter pro Person liegen nur als scrypt-Hash vor.", "The browser only talks to your web app, the Mealie token never leaves the server. Per-person passwords are stored as scrypt hashes only.")}</p>`)}${point("server", t("Läuft neben deinem Mealie", "Runs next to your Mealie"), `<p>${t("Kleiner Container mit eigenem Datenverzeichnis für Vorräte, Journal und Kochsitzungen. Einfach mitsichern.", "A small container with its own data folder for pantry, journal and cooking sessions. Just back it up too.")}</p>`, " d1")}</div></div></section>`;
}

function ai(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  const recipe = bySlug(ctx, "haehnchensalat-mit-parmesan-und-croutons");
  const helper = (iconName, title, text, delay = "") =>
    `<article class="rv${delay}"><span class="ico">${icon(iconName)}</span><div><h3>${title}</h3><p>${text}</p></div></article>`;
  return `<section class="sec ai" id="${id.ai}" aria-labelledby="ai-title"><div class="wrap ai-grid"><div><div class="sec-head"><p class="kicker rv">${t("Optional: KI-Helfer", "Optional: AI helpers")}</p><h2 id="ai-title" class="rv d1">${t("Ein Küchenhelfer, <em>wenn du ihn willst</em>.", "A kitchen helper, <em>if you want one</em>.")}</h2><p class="lead rv d2">${t(
    "Atelier funktioniert vollständig ohne KI. Wer möchte, hinterlegt in der Bridge oder der Web-App einen eigenen Schlüssel von OpenAI oder Anthropic und bekommt drei Helfer dazu.",
    "Atelier works fully without AI. If you like, add your own OpenAI or Anthropic key to the Bridge or the web app and get three helpers on top.",
  )}</p></div><div class="ai-list">${helper("sync", t("Zutatenersatz", "Ingredient substitutes"), t("Keine passende Zutat im Haus? Zuerst sucht Atelier lokale Alternativen ohne KI, erst danach fragt es auf Wunsch den KI-Anbieter.", "Missing an ingredient? Atelier first looks for local alternatives without AI, and only then asks the AI provider if you want."))}${helper("check", t("Rezept-Check", "Recipe check"), t("Die eingebaute Strukturprüfung findet fehlende Mengen und Schritte. Mit „KI prüfen“ schaut zusätzlich ein Sprachmodell drüber. Geändert wird dabei nichts automatisch.", "The built-in structure check finds missing amounts and steps. With “AI check” a language model looks it over too. Nothing is changed automatically."), " d1")}${helper("leaf", t("Suchbegriffe für Nährwerte", "Search terms for nutrition"), t("KI schlägt passende englische Suchbegriffe für USDA FoodData Central vor. Die Nährwerte selbst kommen immer aus der Datenbank, nie aus dem Sprachmodell.", "AI suggests matching search terms for USDA FoodData Central. The nutrition values always come from the database, never from the language model."), " d2")}</div><ul class="providers rv"><li>${icon("check")}${t("OpenAI oder Anthropic Claude", "OpenAI or Anthropic Claude")}</li><li>${icon("check")}${t("Nur nach deinem Klick", "Only after your click")}</li><li>${icon("check")}${t("Schlüssel bleibt auf dem Server", "The key stays on the server")}</li></ul></div><figure class="ai-demo rv d1"><div class="ph">${photo(ctx, recipe, "(max-width: 980px) 94vw, 560px")}</div><figcaption class="body"><div class="q"><b>${t("Ersatz für Parmesan", "Substitute for Parmesan")}</b><small>${t("Beispiel, gestaltete Ansicht", "Example, designed view")}</small></div><ul class="subs"><li><b>${t("Hefeflocken", "Nutritional yeast")}</b><span>${t("aus den lokalen Alternativen", "from the local alternatives")}</span><em>${t("lokal", "local")}</em></li><li><b>${t("Vegane Hartkäsealternative", "Vegan hard cheese alternative")}</b><span>${t("aus den lokalen Alternativen", "from the local alternatives")}</span><em>${t("lokal", "local")}</em></li><li class="ai-src"><b>${t("Geröstete Pinienkerne, fein gehackt", "Toasted pine nuts, finely chopped")}</b><span>${t("nur auf Wunsch, mit eigenem Schlüssel", "only on request, with your own key")}</span><em>${t("KI-Vorschlag", "AI suggestion")}</em></li></ul><p class="ai-note">${icon("shield")}${t("Textvorschlag, kein geprüfter 1:1-Ersatz. Allergene und Konsistenz selbst prüfen. Ohne Schlüssel bleiben alle KI-Funktionen aus.", "Text suggestion, not a tested 1:1 replacement. Check allergens and texture yourself. Without a key every AI feature stays off.")}</p></figcaption></figure></div></section>`;
}

function openSource(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  const item = (title, text, delay = "") =>
    `<article class="rv${delay}"><h3>${title}</h3><p>${text}</p></article>`;
  const repo = (href, name, text) =>
    ext(
      href,
      `${icon("github")}<span><b>${name}</b><small>${text}</small></span>${icon("ext", "trail")}`,
    );
  return `<section class="sec" id="${id.openSource}" aria-labelledby="os-title"><div class="wrap"><div class="trust-head"><div class="sec-head"><p class="kicker rv">${t("Open Source, kostenlos, unabhängig", "Open source, free, independent")}</p><h2 id="os-title" class="rv d1">${t("Deine Küche gehört <em>dir</em>.", "Your kitchen belongs to <em>you</em>.")}</h2><p class="lead rv d2">${t("Kein Abo, keine Cloud, kein Konto bei uns. Der komplette Code liegt offen auf GitHub, unter MIT-Lizenz.", "No subscription, no cloud, no account with us. All of the code is open on GitHub, under the MIT license.")}</p></div><div class="repo-cards rv d2">${repo(links.cards, "mealie-atelier-cards", t("Karten und eigenständige Web-App", "Cards and the standalone web app"))}${repo(links.bridge, "mealie-atelier-bridge", t("Integration für Home Assistant", "Integration for Home Assistant"))}</div></div><div class="trust-grid">${item(t("Kostenlos für immer", "Free for good"), t("MIT-Lizenz, ohne Bezahlschranke, ohne Premium-Stufe. Unterstützen ist freiwillig.", "MIT license, no paywall, no premium tier. Support is voluntary."))}${item(t("Daten bleiben zu Hause", "Data stays at home"), t("Rezepte, Pläne und Listen bleiben in deinem Mealie. Atelier lädt keine Rezepte oder Fotos von fremden Servern.", "Recipes, plans and lists stay in your Mealie. Atelier loads no recipes or photos from third-party servers."), " d1")}${item(t("Token sicher verwahrt", "Token kept safe"), t("Der Mealie-Token wird nur von Server zu Server genutzt und erreicht nie den Browser.", "The Mealie token is only used server to server and never reaches the browser."), " d2")}${item(t("Sicherung vor jeder Änderung", "A backup before every change"), t("Jede Rezeptänderung wird vorher gesichert und lässt sich im Editor wiederherstellen.", "Every recipe change is backed up first and can be restored in the editor."))}${item(t("Getestet wie im echten Leben", "Tested like real life"), t("Automatische Tests gegen echte Mealie- und Home-Assistant-Container, mit erfundenen Daten.", "Automated tests against real Mealie and Home Assistant containers, with fictional data."), " d1")}${item(t("Unabhängig", "Independent"), t("Eine inoffizielle Ergänzung, nicht mit Mealie oder Home Assistant verbunden. Gemacht aus Liebe zum Kochen.", "An unofficial companion, not affiliated with Mealie or Home Assistant. Made out of love for cooking."), " d2")}</div></div></section>`;
}

function install(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  const route = (iconName, tag, title, steps, primary, secondary, delay = "") =>
    `<article class="route rv${delay}"><span class="ico">${icon(iconName)}</span><p class="tag">${tag}</p><h3>${title}</h3><ol>${steps.map((step) => `<li>${step}</li>`).join("")}</ol><div class="btn-row">${primary}${secondary}</div></article>`;
  return `<section class="sec install" id="${id.install}" aria-labelledby="install-title"><div class="wrap"><div class="sec-head center"><p class="kicker rv">${t("Loslegen", "Get started")}</p><h2 id="install-title" class="rv d1">${t("Zwei Wege in <em>dieselbe Küche</em>.", "Two routes into <em>the same kitchen</em>.")}</h2><p class="lead rv d2">${t("Du brauchst nur ein laufendes Mealie. Den Rest erklären die Schritt-für-Schritt-Anleitungen.", "All you need is a running Mealie. The step-by-step guides explain the rest.")}</p></div><div class="routes">${route(
    "ha",
    t("Mit Home Assistant", "With Home Assistant"),
    t("Karten und Bridge", "Cards and Bridge"),
    [
      t(
        "<b>Bridge installieren</b> über HACS als benutzerdefiniertes Repository und mit Mealie-Adresse und API-Token verbinden.",
        "<b>Install the Bridge</b> through HACS as a custom repository and connect it with your Mealie address and API token.",
      ),
      t(
        "<b>Cards installieren</b> auf demselben Weg. Sobald der Katalogeintrag freigeschaltet ist, auch direkt im Marketplace.",
        "<b>Install the Cards</b> the same way. Once the catalog listing is merged, straight from the Marketplace too.",
      ),
      t(
        "<b>Karte hinzufügen.</b> Der visuelle Editor findet die Bridge von selbst.",
        "<b>Add the card.</b> The visual editor finds the Bridge by itself.",
      ),
    ],
    ext(links.setup, `${t("Zur Anleitung", "Open the guide")}${icon("arrow")}`, "btn btn-primary"),
    ext(
      links.bridge,
      `${icon("github")}${t("Bridge auf GitHub", "Bridge on GitHub")}`,
      "btn btn-ghost",
    ),
  )}${route(
    "server",
    t("Ohne Home Assistant", "Without Home Assistant"),
    t("Eigenständige Web-App", "Standalone web app"),
    [
      t(
        "<b>Konfiguration anlegen</b> mit Mealie-Adresse, Token und Passwort.",
        "<b>Create the configuration</b> with Mealie address, token and password.",
      ),
      t(
        "<b>Container starten</b> mit Docker Compose oder direkt mit Node.js&nbsp;22.",
        "<b>Start the container</b> with Docker Compose or directly with Node.js&nbsp;22.",
      ),
      t(
        "<b>Als App installieren</b> auf Handy und Küchentablet.",
        "<b>Install it as an app</b> on your phone and kitchen tablet.",
      ),
    ],
    ext(
      links.setupWeb,
      `${t("Zur Anleitung", "Open the guide")}${icon("arrow")}`,
      "btn btn-primary",
    ),
    ext(
      links.webApp,
      `${icon("github")}${t("Web-App auf GitHub", "Web app on GitHub")}`,
      "btn btn-ghost",
    ),
    " d1",
  )}</div>${t("", '<p class="guide-note rv">Both guides are written in German for now. The setup steps above work the same either way.</p>')}</div></section>`;
}

function closing(ctx) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  const recipe = bySlug(ctx, "zitronen-focaccia-mit-rosmarin");
  return `<section class="closing" aria-labelledby="close-title">${photo(ctx, recipe, "100vw", { alt: "", className: "closing-img" })}<div class="wrap"><div class="inner"><p class="kicker rv">${t("Probier es aus", "Try it")}</p><h2 id="close-title" class="rv d1">${t("Heute Abend kochst du <em>schöner</em>.", "Tonight you cook <em>more beautifully</em>.")}</h2><p class="lead rv d2">${t("Die Live-Demo oben zeigt die ganze Küche mit Beispielrezepten, ohne Installation. Wenn sie dir gefällt, kannst du das Projekt unten unterstützen.", "The live demo above shows the whole kitchen with sample recipes, no installation needed. If you like it, you can support the project below.")}</p><div class="btn-row rv d3"><a class="btn btn-primary" href="#${id.demo}">${icon("play")}${t("Zur Live-Demo", "Go to the live demo")}</a><a class="btn btn-ghost" href="#${id.install}">${icon("download")}${t("Installieren", "Install")}</a></div></div></div></section>`;
}

export function renderRoutes(ctx) {
  return homeAssistant(ctx) + webApp(ctx) + ai(ctx);
}

// The recipe directory sits between the routes and these closing sections.
export function renderDirectory(ctx, list) {
  const t = translator(ctx.locale);
  const id = sectionIds[ctx.locale];
  return `<section class="sec directory" id="${id.recipes}" aria-labelledby="directory-title"><div class="wrap"><div class="sec-head"><p class="kicker rv">${t("Die Rezepte der Demo", "The demo recipes")}</p><h2 id="directory-title" class="rv d1">${t("Zehn Rezepte zum <em>Entdecken</em>.", "Ten recipes to <em>explore</em>.")}</h2><p class="lead rv d2">${t(
    "Jedes Rezept enthält Mengen, Portionen, Zeitangaben und verständliche Kochschritte. Klapp einen Eintrag auf oder öffne die eigene Rezeptseite.",
    "Every recipe has quantities, servings, timings and clear cooking steps. Unfold an entry or open its own recipe page.",
  )}</p></div><div class="recipe-list">${list}</div></div></section>`;
}

export function renderClosing(ctx) {
  return openSource(ctx) + install(ctx) + closing(ctx);
}

export { escapeHtml };
