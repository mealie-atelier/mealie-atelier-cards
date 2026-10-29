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
  theme: "dark",
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
const LABELS = {"de":{"dashboard":"Übersicht","today":"Heute","discover":"Kochinspo","pantry":"Vorräte","family":"Gemeinsam kochen","cookbook":"Kochbuch","recipes":"Rezepte","mealplan":"Wochenplan","shopping":"Einkaufsliste","manage":"Verwalten","greeting":"Gutes Essen. Jeden Tag.","greetingSub":"Deine Küche, neu gedacht.","eyebrow":"DEIN PERSÖNLICHES KÜCHENSTUDIO","tonight":"Heute auf dem Teller","viewRecipe":"Rezept öffnen","nothing":"Noch nichts geplant","planNow":"Gericht einplanen","collections":"Deine Rezeptsammlung","all":"Alle Rezepte","search":"Rezept suchen …","noRecipes":"Noch keine Rezepte gefunden.","noPlan":"Noch nichts geplant","week":"Die Woche im Blick","list":"Alles für den Einkauf","add":"Hinzufügen","addItem":"Artikel hinzufügen","noShopping":"Deine Einkaufsliste ist leer.","progress":"erledigt","items":"Artikel","cooking":"Kochmodus","edit":"Bearbeiten","addToPlan":"Einplanen","servings":"Portionen","ingredients":"Zutaten","instructions":"Zubereitung","next":"Weiter","back":"Zurück","done":"Fertig","cookStart":"Kochen starten","create":"Neues Rezept","import":"Von URL importieren","name":"Rezeptname","description":"Beschreibung","save":"Speichern","url":"Rezept-URL","more":"Mehr anzeigen","settings":"Design Studio","language":"Sprache","languageAuto":"Automatisch","languageName":"Deutsch","studioConnectionFailed":"Verbindung zum Atelier fehlgeschlagen","studioSaveFailed":"Speichern fehlgeschlagen","studioAnalysisFailed":"Rezeptanalyse fehlgeschlagen","studioDetailsLoading":"Rezeptdetails werden für die Planung geladen …","studioCatalogLoading":"Rezeptsammlung wird geladen: {loaded} von {total} Rezepten …","studioCatalogLoadingCount":"Rezeptsammlung wird geladen: {loaded} Rezepte …","studioCatalogDetails":"Rezeptdetails: {loaded} von {total} geladen …","studioCatalogLimit":"Für die Analyse werden maximal 600 Rezepte geladen.","studioCatalogTotal":"Die Sammlung enthält {total}.","studioDialogLabel":"MEALIE ATELIER / KÜCHENSTUDIO","studioDialogPromptLabel":"Zutat eingeben","studioDialogPromptPlaceholder":"z. B. Sahne","studioConfirm":"Bestätigen","studioCancel":"Abbrechen","studioClose":"Schließen","studioDiagnosticsKicker":"ATELIER / SYSTEMCHECK","studioDiagnosticsTitle":"Alles im grünen Bereich?","studioDiagnosticsDescription":"Prüft die tatsächliche Verbindung, Leserechte und Einstellungen. Es werden keine Daten verändert oder Zugangsschlüssel angezeigt.","studioDiagnosticsRunning":"Prüfung läuft …","studioDiagnosticsCheck":"Verbindung prüfen","studioDiagnosticsExport":"Atelier-Daten als JSON sichern","studioDiagnosticsEmpty":"Noch nicht geprüft. Starte den Systemcheck, um Fehlermeldungen frühzeitig zu erkennen.","studioDiagnosticsAdmin":"Admin","studioDiagnosticsEdit":"Bearbeitung erlaubt","studioDiagnosticsReadOnly":"Nur lesen","studioDiagnosticsBackup":"Backup enthält private Haushaltsdaten und Rezeptnotizen.","studioDiagnosticsReachable":"Erreichbar","studioBridge":"Atelier Bridge","studioStorage":"Atelier-Speicher","version":"Version","studioDiagnosticsNoData":"Keine Daten","studioDiagnosticsError":"Fehler","studioDiagnosticsPassed":"Alle fünf Verbindungstests bestanden.","studioDiagnosticsFailed.one":"1 Verbindungstest fehlgeschlagen.","studioDiagnosticsFailed.other":"{count} Verbindungstests fehlgeschlagen.","studioExportNote":"Enthält private Haushaltsdaten. Kein vollständiges Mealie-Backup.","studioExportDownloaded":"Atelier-Profil heruntergeladen. Bitte sicher aufbewahren.","studioExportFailed":"Export fehlgeschlagen: {error}","studioDailyMorning":"Guten Morgen. Was steht heute an?","studioDailyEvening":"Guten Abend. Zeit für etwas Gutes.","studioDailyAnytime":"Deine Küche für den Rest des Tages.","studioDailyEyebrow":"DEIN KÜCHENASSISTENT","studioDailyMorningLabel":"MORGENS","studioDailyEveningLabel":"ABENDS","studioDailyOverviewLabel":"TAGESÜBERBLICK","studioDailyExpiring":"{count} Vorräte sollten bald verbraucht werden.","studioDailyDiscover":"Entdecke Rezepte und plane ganz entspannt.","studioDailyPantry":"Vorräte & Einkauf","studioDailyPlan":"Was kochen wir heute?","studioConfirmAvailable":"Home-Assistant-Aktion ausgelöst.","studioConfirmUnavailable":"Nur in Home Assistant verfügbar.","studioNoStep":"Kein Kochschritt zum Vorlesen.","studioDeviceInvalid":"Gerät/Entity ist nicht korrekt eingerichtet.","studioActionFailed":"Home-Assistant-Aktion fehlgeschlagen: {error}","studioReadUnsupported":"Vorlesen wird in diesem Browser nicht unterstützt.","studioVoiceUnsupported":"Sprachkommandos werden von diesem Browser nicht unterstützt.","studioMicrophoneError":"Mikrofon nicht verfügbar oder Berechtigung verweigert.","studioVoiceUnknown":"Kommando nicht erkannt: {command}","studioSpeakNoMatch":"Dazu finde ich keine eindeutige Zutat im Rezept.","studioJournalSaved":"Persönliche Notiz gespeichert.","studioSaved":"Im Atelier gespeichert.","studioChildApproval":"Kinderaufgaben müssen ausdrücklich von Erwachsenen freigegeben werden.","studioSpeechDe":"de-DE","studioSpeechEn":"en-US","studioDiscoverTitle":"Was kochen wir heute?","studioDiscoverLead":"Ein paar Klicks. Dann finden wir etwas Gutes aus euren Rezepten.","studioDiscoverStep0":"Was schmeckt euch?","studioDiscoverStep1":"Aus welchem Kochbuch?","studioDiscoverStep2":"Wer isst mit?","studioDiscoverStep3":"Was ist heute drin?","studioDiscoverQuestion0":"Worauf habt ihr Appetit?","studioDiscoverQuestion1":"Wähle deine Lieblingssammlungen oder lass alles offen.","studioDiscoverQuestion2":"Für wie viele und mit welchem Zeitfenster?","studioDiscoverQuestion3":"Wir richten uns nach eurem Alltag.","studioDiscoverCompass":"DEIN KÜCHENKOMPASS","studioDiscoverDiet":"Ernährungsstil","studioDiscoverAny":"Alles offen","studioDiscoverVegetarian":"Vegetarisch","studioDiscoverVegan":"Vegan","studioDiscoverMeat":"Fleisch","studioDiscoverFish":"Fisch","studioDiscoverDietHint":"Wir wählen Rezepte nach Tags und erkennbaren Zutaten aus. Bitte Rezeptangaben immer selbst prüfen.","studioDiscoverCookbooks":"Deine Kochbücher","studioDiscoverCookbooksHint":"Mehrere möglich. Ohne Auswahl suchen wir in allen Rezepten.","studioDiscoverCookbooksAria":"Mealie-Kochbücher","studioDiscoverAllRecipes":"Alle Rezepte","studioDiscoverNoCookbooks":"Kochbücher werden eingeblendet, sobald Mealie-Metadaten verfügbar sind.","studioDiscoverPeople":"Personen","studioDiscoverPeopleHint":"Wer sitzt mit am Tisch?","studioDiscoverOneLess":"Eine Person weniger","studioDiscoverOneMore":"Eine Person mehr","studioDiscoverKidFriendly":"Kinderfreundlich","studioDiscoverMild":"Milde Gerichte werden bevorzugt","studioDiscoverAnyPreference":"Egal","studioDiscoverWithKids":"Mit Kindern","studioDiscoverTime":"Verfügbare Zeit","studioDiscoverRelaxed":"Ganz entspannt","studioDiscoverPantry":"Vorräte berücksichtigen","studioDiscoverUsePantry":"Vorräte zuerst","studioDiscoverNoPreference":"Ganz egal","studioDiscoverExclude":"Heute lieber ohne …","studioDiscoverOptional":"Optional auswählen","studioDiscoverIngredientHint":"Vorratsmengen und Zutaten können unvollständig sein. Bitte vor dem Kochen prüfen.","studioDiscoverBack":"Zurück","studioDiscoverNext":"Weiter","studioDiscoverFind":"Ideen finden","studioDiscoverResult":"DEIN KOCHIMPULS","studioDiscoverResultTitle":"Das könnte heute passen.","studioDiscoverEdit":"Auswahl ändern","studioDiscoverTimeOpen":"Zeit offen","studioDiscoverPerson":"Person","studioDiscoverPeoplePlural":"Personen","studioDiscoverFromCookbooks":"AUS DEINEN KOCHBÜCHERN","studioDiscoverFromRecipes":"AUS EUREN REZEPTEN","studioDiscoverRecipeBase":"Rezeptbasis {servings} Portionen","studioDiscoverForPeople":"Für {people} Personen","studioDiscoverGoodIdea":"Eine gute Idee aus eurem Kochbuch.","studioDiscoverOpenRecipe":"Rezept ansehen","studioDiscoverAnother":"Andere Idee","studioDiscoverAlsoGood":"AUCH LECKER","studioDiscoverMoreIdeas.one":"1 weitere Idee","studioDiscoverMoreIdeas.other":"{count} weitere Ideen","studioDiscoverEmptyTitle":"Heute ist noch alles offen.","studioDiscoverEmpty":"Mit den aktuellen Angaben haben wir keine passende Rezeptidee gefunden. Ändere eine Auswahl oder lade eure Rezepte neu.","studioDiscoverAdjust":"Auswahl anpassen","studioDiscoverReload":"Rezepte neu laden","studioPlanKicker":"03 / INTELLIGENTE WOCHENPLANUNG","studioPlanTitle":"Sieben Tage, weniger Verschwendung","studioPlanDescription":"Die Vorschau bevorzugt ähnliche Zutaten und lässt bestehende Abendessen stehen. Restegerichte werden nur bei genügend Portionen ergänzt.","studioPlanPreview":"Wochenplan vorschlagen","studioPlanCommit":"Vorschlag nach Mealie übertragen","studioLunch":"Mittag","studioDinner":"Abend","studioPlanOnlyMissing":"Es werden nur fehlende Einträge ergänzt. Bei Fehlern bleiben erfolgreiche Einträge bestehen.","studioPlanCreatePreview":"Erst eine Vorschau erstellen. In Mealie wird nichts ohne Bestätigung geändert.","studioPantryTitle":"Vorräte & Einkauf","studioPantryLead":"Ein einfacher, manueller Vorrat reicht. Atelier gleicht ihn mit dem geplanten Essen ab.","studioPantryKicker":"01 / DEIN VORRAT","studioPantryQuestion":"Was ist noch da?","studioIngredient":"Zutat","studioAmount":"Menge","studioUnit":"Einheit","studioGrams":"Gramm","studioMilliliters":"Milliliter","studioPieces":"Stück","studioPieceUnit":"Stück","studioBestBefore":"Mindestens haltbar bis","studioStaple":"Als regelmäßig vorhandenen Basisvorrat behandeln","studioAdd":"Hinzufügen","studioStapleLabel":"Basisvorrat","studioUntil":"bis {date}","studioRemove":"Entfernen","studioPantryEmpty":"Noch kein Vorrat erfasst. Das ist optional.","studioGroceryKicker":"02 / EINKAUFSASSISTENT","studioGroceryTitle":"Was fehlt wirklich?","studioGroceryDescription":"Aus den aktuell geplanten Gerichten. Vorratsmengen werden nur bei eindeutig gleichen Einheiten abgezogen.","studioGroceryCalculate":"Einkauf berechnen","studioGrocerySend":"In Mealie-Liste übernehmen","studioQuantityCheck":"Menge prüfen","studioGroceryPreview":"Eine Einkaufsvorschau wird nach Klick auf „Einkauf berechnen“ angezeigt.","studioUnclearUnits":"Unklare EL-/TL-Mengen und unterschiedliche Einheiten werden nicht automatisch verrechnet.","theme":"Erscheinungsbild","dark":"Dunkel","light":"Hell","density":"Abstände","compact":"Kompakt","comfortable":"Komfortabel","accent":"Akzentfarbe","radius":"Ecken","columns":"Spalten","nutrition":"Nährwerte","nutriTitle":"Atelier Nutrition","nutriAnalyze":"Zutaten abgleichen","nutriAi":"KI-Suchbegriffe vorschlagen","nutriEstimate":"Nährwerte berechnen","nutriSave":"In Mealie speichern","nutriSearch":"In USDA suchen","nutriNoSource":"Lebensmittel auswählen","nutriGrams":"Menge in Gramm","nutriSource":"Datenquelle","nutriResult":"Pro Portion","journal":"Meine Kochnotizen","journalSave":"Notiz speichern","journalNote":"Wie war es beim letzten Mal?","timer":"Küchen-Timer","timerStart":"Timer starten","timerRemove":"Entfernen","apply":"Übernehmen","close":"Schließen","configured":"Dein Design wird auf diesem Gerät gespeichert.","backend":"Verbindung nicht eingerichtet","backendHint":"Bitte zuerst „Mealie Atelier Bridge“ in Home Assistant konfigurieren.","refresh":"Aktualisieren","loading":"Deine Küche wird vorbereitet …","error":"Das hat nicht geklappt.","retry":"Erneut versuchen","selectRecipe":"Rezept auswählen","selectList":"Liste auswählen","saved":"Gespeichert","created":"Rezept wurde angelegt","planned":"Gericht eingeplant","toMealie":"In Mealie öffnen","mealType":"Mahlzeit","dinner":"Abendessen","lunch":"Mittagessen","breakfast":"Frühstück","saveNote":"Basisdaten bearbeiten","admin":"Rezeptverwaltung","recipeTip":"Neue Rezepte anlegen und bestehende bearbeiten.","featured":"AUS DEINER KÜCHE","headline":"Mach es dir lecker.","count":"Rezepte","open":"Offen","todayDate":"Heute","nextMeal":"Geplant","day":"Tag","label":"Liste","change":"Ändern","importTip":"Gib die URL eines Rezeptes ein, das Mealie importieren soll.","expand":"Weiterlesen","adminOnly":"Rezeptänderungen benötigen Home-Assistant-Adminrechte.","emptyTip":"Nutze die Suche oder lege direkt ein neues Rezept an.","markComplete":"Erledigt markieren","addListFirst":"Lege deine erste Einkaufsliste an.","offline":"Die Daten konnten nicht geladen werden.","createList":"Neue Liste","listName":"Name der Einkaufsliste","shoppingFromRecipe":"Zutaten einkaufen","shoppingAddRecipe":"Zutaten übernehmen","shoppingAdded":"Zutaten auf der Liste","editSteps":"Zubereitungsschritte bearbeiten","editIngredients":"Zutaten ersetzen","editStepsHint":"Ein Schritt pro Absatz. Leere Zeile trennt zwei Schritte.","editIngredientsHint":"Eine Zutat pro Zeile. Achtung: Beim Ersetzen gehen strukturierte Lebensmittel- und Einheitenverknüpfungen verloren.","servingsNumber":"Portionen (Anzahl)","applySteps":"Schritte ersetzen","applyIngredients":"Zutaten ersetzen","resetDesign":"Design zurücksetzen","pictures":"Rezeptbilder anzeigen","todayIntro":"Deine Küche heute.","todaySub":"Auf einen Blick: Was gibt es zu essen und was fehlt noch?","toShopping":"Zur Einkaufsliste","plannedForToday":"Heute geplant","noSteps":"Noch keine Zubereitungsschritte vorhanden.","allMeals":"Alle Gerichte","successList":"Liste erstellt","addFromRecipeTip":"Mealie fügt die Rezeptzutaten deiner gewählten Liste hinzu.","ingredientExperimental":"Experimentelle Zutatenbearbeitung ist standardmäßig deaktiviert. Aktiviere sie nur nach einem Mealie-Backup in den Bridge-Einstellungen.","readOnly":"Nur-Lesen-Modus","readOnlyHint":"Bearbeitungen sind für dieses Küchen-Dashboard deaktiviert.","adminOnlyHint":"Die Rezeptverwaltung benötigt Adminrechte.","studioDiscoverStepProgress":"Schritt {step} von 4","ingredientMushrooms":"Pilze","ingredientOlives":"Oliven","ingredientCilantro":"Koriander","ingredientBellPepper":"Paprika","ingredientHeat":"Schärfe","ingredientTomatoes":"Tomaten","familyTitle":"Gemeinsam kochen","familyLead":"Ein gemeinsamer Kochfortschritt mit freiwilligen Helferaufgaben und Freigabe durch Erwachsene.","familyAdultMode":"Erwachsenenansicht","familyHelperMode":"Einfache Helferansicht","familySync":"Live-Status aktualisieren","familyTeam":"01 / TEAM","familyWhoHelps":"Wer hilft mit?","familyName":"Name","familyChild":"Kind (nur freigegebene Aufgaben)","familyAddMember":"Person anlegen","familyHelper":"Helfermodus","familyRemoveMember":"Person entfernen","familyNoMembers":"Noch keine Familienmitglieder angelegt.","familySession":"02 / GEMEINSAME KOCHSESSION","familyNoSession":"Noch keine Session aktiv","familyStep":"Gemeinsamer Schritt {step} · gestartet {date}","familyBack":"Zurück","familyNext":"Nächster Schritt","familyEnd":"Beenden","familyOpenCook":"Kochmodus öffnen","familyTimers":"Gemeinsame Timer","familyNoTimers":"Noch kein gemeinsamer Timer","familyTimerName":"Bezeichnung","familyMinutes":"Minuten","familySetTimer":"Timer setzen","familyTasks":"Helferaufgaben","familyMarkOpen":"Als offen markieren: {task}","familyMarkDone":"Als erledigt markieren: {task}","familyNoTasks":"Noch keine Aufgaben verteilt.","familyTask":"Aufgabe","familyTaskPlaceholder":"z. B. Gemüse waschen","familyAssign":"Zuweisen","familyApproval":"Ich habe die Aufgabe geprüft und freigegeben","familyAssignTask":"Aufgabe verteilen","familySafety":"Die Kinderansicht vereinfacht die Oberfläche, sperrt aber keine Funktionen. Erwachsene bleiben für Aufsicht und sichere Gerätenutzung verantwortlich.","familyStartHint":"Öffne ein Rezept und starte den Kochmodus. Eine gemeinsame Session wird angelegt, wenn Bearbeitung erlaubt ist.","familyBrowse":"Rezepte ansehen","cookbookTitle":"Dein eigenes Kochbuch","cookbookLead":"Wähle Lieblingsrezepte. Atelier gestaltet Cover, Inhaltsverzeichnis und A4-Rezeptseiten für eine gemeinsame Druckansicht.","cookbookSelectKicker":"01 / REZEPTE AUSWÄHLEN","cookbookCollection":"Deine Sammlung","cookbookLoad":"Rezeptdetails laden","cookbookSelectAll":"Alle sichtbaren wählen","cookbookClear":"Auswahl löschen","cookbookEmpty":"Noch keine Rezepte geladen","cookbookLoadHint":"Lade die Rezeptdetails, um dein eigenes Kochbuch zusammenzustellen.","cookbookBookKicker":"02 / DEIN BUCH","cookbookSelected.one":"1 Rezept ausgewählt","cookbookSelected.other":"{count} Rezepte ausgewählt","cookbookTitleLabel":"Buchtitel","cookbookTitleDefault":"Unsere Lieblingsrezepte","cookbookSubtitleLabel":"Untertitel","cookbookSubtitleDefault":"Gute Küche. Jeden Tag.","cookbookPhotos":"Rezeptfotos drucken","cookbookPrint":"Kochbuch als PDF / Druckvorschau","cookbookPrintHint":"Nutze im Browser „Als PDF speichern“. Jedes Rezept beginnt auf einer neuen A4-Seite; sehr lange Rezepte können über mehrere Seiten laufen.","printPreparing":"Dein Kochbuch wird gesetzt …","printDocumentTitle":"Mealie Atelier · Kochbuch","printSavePdf":"Als PDF speichern / Drucken","printCollection":"REZEPTSAMMLUNG","printMadeWithLove":"MIT LIEBE ZUSAMMENGESTELLT","creditMadeWith":"Mit","creditBy":"von","printContents":"INHALTSVERZEICHNIS","printRecipes":"Die Rezepte.","printRecipe":"REZEPT {number} / {total}","printIngredients":"ZUTATEN","printPreparation":"ZUBEREITUNG","printServings.one":"1 Portion","printServings.other":"{count} Portionen","studioMinutesShort":"Min.","studioOven":"Ofen","studioReadStepLabel":"Schritt vorlesen","studioVoiceCommandLabel":"Sprachkommando","studioReplacementLabel":"Alternative Zutat","studioCookingLight":"Kochlicht","studioLowerMusic":"Musik leiser","studioSpeakerLabel":"Auf Lautsprecher","studioSharedFamily":"Mit Familie synchronisiert","studioSharedTimer":"gemeinsam","studioRecipeAuditTitle":"Rezept-Check: {score}/100","studioRecipeAuditNone":"Keine offensichtlichen Strukturprobleme gefunden.","studioRecipeAuditAll":"Alle Hinweise","studioAICheck":"KI prüfen","studioAiSuggestionTitle":"KI-Vorschläge (nur prüfen)","studioLocalAlternativeNone":"Keine geprüfte lokale Alternative gefunden.","studioAiOptional":"KI ist optional und benötigt einen API-Key.","studioReplaceTitle":"Zutat ersetzen","studioReplaceBody":"Welche Zutat möchtest du austauschen? Die Vorschläge sind keine geprüften 1:1-Ersatzprodukte.","studioShowAlternatives":"Alternativen zeigen","studioAiAuditTitle":"KI-Rezeptprüfung starten?","studioAiAuditBody":"Die Zutaten, Mengen und Kochschritte dieses Rezepts werden an den von dir konfigurierten KI-Anbieter übertragen. Es erfolgt keine automatische Änderung.","studioAiConsent":"Daten senden & prüfen","studioAiStarting":"KI-Rezeptprüfung wird gestartet …","studioAiUnavailable":"KI-Prüfung nicht verfügbar: {error}","studioAuditTitle":"Rezept-Qualitätscheck · {score}/100","studioAuditNone":"Keine offensichtlichen Strukturprobleme.","studioAuditDisclaimer":"Die Prüfung erkennt grundlegende Strukturprobleme, keine fachlichen Kochfehler.","studioSessionReplaceTitle":"Gemeinsame Kochsession ersetzen?","studioSessionReplaceBody":"Aktuell läuft „{name}“. Beim Ersetzen gehen die gemeinsamen Timer und Aufgaben verloren. Abbrechen startet das neue Rezept nur lokal.","studioSessionReplaceConfirm":"Session ersetzen","studioOnlyHomeAssistant":"Nur in Home Assistant verfügbar.","studioSpeechStartFailed":"Spracherkennung konnte nicht gestartet werden.","studioIngredientNoMatch":"Dazu finde ich keine eindeutige Zutat im Rezept.","studioSubstituteError":"Keine geprüfte lokale Alternative gefunden. KI ist optional und benötigt einen API-Key. {error}","studioRecipeAuditDisclaimer":"Grundlegende Strukturprüfung · keine fachliche Kochprüfung","studioDeletePantryTitle":"Vorrat entfernen?","studioDeletePantryBody":"Der Eintrag wird aus deinem Atelier-Vorrat gelöscht.","familyRemoveConfirmTitle":"Person entfernen?","familyRemoveConfirmBody":"Die Person wird aus dem Familienmodus entfernt. Bestehende Helferaufgaben müssen zuvor erledigt oder gelöscht werden.","familyEndConfirmTitle":"Gemeinsames Kochen beenden?","familyEndConfirmBody":"Timer und Helferaufgaben dieser Session werden beendet. Persönliche Rezeptnotizen bleiben erhalten.","studioWeekConfirmTitle":"Wochenplan übernehmen?","studioWeekConfirmBody.one":"1 Mahlzeit wird hinzugefügt. Bestehende Termine bleiben erhalten.","studioWeekConfirmBody.other":"{count} Mahlzeiten werden hinzugefügt. Bestehende Termine bleiben erhalten.","studioWeekConfirmAction":"In Mealie übertragen","studioWeekSuccess.one":"1 Mahlzeit übernommen.","studioWeekSuccess.other":"{count} Mahlzeiten übernommen.","studioWeekFailure":"Fehler: {errors}","studioShoppingTransferTitle":"Einkäufe übertragen?","studioShoppingTransferBody.one":"1 Eintrag wird in deine Mealie-Einkaufsliste übernommen.","studioShoppingTransferBody.other":"{count} Einträge werden in deine Mealie-Einkaufsliste übernommen.","studioShoppingTransferConfirm":"Einkaufsliste ergänzen","studioShoppingUncertain":"Menge prüfen","studioShoppingSuccess.one":"1 Eintrag übernommen.","studioShoppingSuccess.other":"{count} Einträge übernommen.","studioShoppingFailure":"Fehlgeschlagen: {items}","studioPopupBlocked":"Erlaube Popups für die Druckvorschau.","studioAdultApprovalRequired":"Kinderaufgaben müssen ausdrücklich von Erwachsenen freigegeben werden.","cookbookTitleDefaultPrint":"Unsere Rezepte","studioJournalSavedToast":"Persönliche Notiz gespeichert.","providerTitle":"Rezeptstudio ohne Zusatz-Integration","providerDescription":"Die Home-Assistant-Mealie-Verbindung unterstützt hier Rezeptsuche und Kochansicht. Für Wochenplan, Einkauf, Kochbücher, Bilder und Bearbeitung kannst du jederzeit die optionale Mealie Atelier Bridge ergänzen.","providerBrowse":"Rezepte durchsuchen","studioJournalLocal":"Nur auf diesem Gerät gespeichert, nicht mit Mealie synchronisiert.","studioJournalShared":"Im Atelier-Profil gespeichert und auf verbundenen Geräten verfügbar.","editorConnectKitchen":"Küche verbinden","editorChooseYourStart":"Startansicht wählen","editorSetTheMood":"Erscheinungsbild","editorSetupProgress":"Einrichtungsfortschritt","editorCheckingHomeAssistantConnections":"Home-Assistant-Verbindungen werden geprüft …","editorCouldNotCheckYourConnections":"Verbindungen konnten nicht geprüft werden","editorCheckThatMealieAtelierBridgeIsInstalledAndHomeAssistantIsOnline":"Prüfe, ob die Mealie Atelier Bridge installiert und Home Assistant erreichbar ist.","editorTryAgain":"Erneut prüfen","editorOpenHomeAssistantIntegrations":"Home-Assistant-Integrationen öffnen","editorHomeAssistantMealieFound":"Home-Assistant-Mealie gefunden","editorDirectConnectionReadOnlyRecipes":"Direkte Verbindung · Rezepte nur lesen","editorREADY":"BEREIT","editorRecipeSearchAndCookingWorkWithoutAtelierBridgeProtectedPhotosEditingShoppingAndPlanningStayOptionalBridgeFeatures":"Rezeptsuche und Kochansicht funktionieren ohne Atelier Bridge. Geschützte Bilder, Bearbeitung, Einkauf und Planung sind optionale Bridge-Funktionen.","editorMealieInstance":"Mealie-Instanz","editorYourMealieConnection":"Deine Mealie-Verbindung","editorChooseAConnectedKitchen":"Verbundene Küche auswählen …","editorYourAPITokenStaysSafelyInsideTheHomeAssistantIntegration":"Dein API-Token bleibt sicher in der Home-Assistant-Integration.","editorConnectMealieOnceInHomeAssistant":"Verbinde Mealie einmal in Home Assistant","editorAddMealieAtelierBridgeForTheFullStudioOrUseHomeAssistantSBuiltInMealieIntegrationForAReadOnlyRecipeCardCredentialsAreEnteredSecurelyInHomeAssistantNeverInThisCard":"Füge die Mealie Atelier Bridge für das volle Studio hinzu oder nutze Home Assistants Mealie-Integration für eine reine Rezeptkarte. Zugangsdaten bleiben in Home Assistant und gehören niemals in die Karte.","editorIConnectedMealieCheckAgain":"Mealie ist verbunden: erneut prüfen","editorConnectedSecurely":"Sicher verbunden","editorNoCredentialsInDashboardCards":"Keine Zugangsdaten in Dashboard-Karten","editorYourCredentialsBelongInTheSecureIntegrationNeverInThisCard":"Deine Zugangsdaten gehören in die sichere Integration, niemals in diese Karte.","editorACompleteKitchenOverview":"Der komplette Küchenüberblick","editorTodaySMealsAndKitchenTasks":"Heutige Gerichte und Küchenaufgaben","editorPersonalRecipeInspiration":"Persönliche Rezeptideen","editorYourCompleteRecipeCollection":"Deine gesamte Rezeptsammlung","editorTheWeeklyMealPlan":"Der Wochenplan","editorIngredientsYouAlreadyHave":"Deine vorhandenen Vorräte","editorYourShoppingList":"Deine Einkaufsliste","editorCookingTogetherAsAFamily":"Gemeinsam mit der Familie kochen","editorYourSavedCookbooks":"Deine gespeicherten Kochbücher","editorRecipeAndKitchenTools":"Rezept- und Küchenwerkzeuge","editorSTEP1CONNECTION":"SCHRITT 1 · VERBINDUNG","editorBringYourKitchenTogether":"Verbinde deine Küche.","editorAtelierReadsRecipesFromTheMealieConnectionAlreadyConfiguredInHomeAssistant":"Atelier nutzt die Mealie-Verbindung, die du bereits in Home Assistant eingerichtet hast.","editorSTEP2YOURKITCHEN":"SCHRITT 2 · DEINE KÜCHE","editorWhatShouldOpenFirst":"Was möchtest du zuerst sehen?","editorPickAStartingPointEveryOtherViewStaysOneTapAway":"Wähle deinen Startpunkt. Alle anderen Bereiche bleiben mit einem Klick erreichbar.","editorStartIn":"Starten mit","editorYOURATELIEROPENSTO":"DEIN ATELIER STARTET MIT","editorSTEP3THEFEEL":"SCHRITT 3 · DIE STIMMUNG","editorMakeItFeelLikeYourKitchen":"Lass es sich nach deiner Küche anfühlen.","editorChooseALookNowYouCanFineTuneEveryDetailLater":"Wähle jetzt eine Stimmung. Jedes Detail kannst du später anpassen.","editorChooseAnAppearance":"Erscheinungsbild auswählen","editorEveningStudio":"Abendstudio","editorDeepGreenWarmLightEditorial":"Tiefgrün · Stein hell · großzügig","editorDaylightKitchen":"Tageslichtküche","editorFreshSurfacesOpenAndBright":"Helle Flächen · offen und freundlich","editorYourRecipesAndMealieDataAreNeverChangedByTheseChoices":"Deine Rezepte und Mealie-Daten werden durch diese Auswahl nicht verändert.","editorAKitchenThatFeelsLikeYours":"Dein Küchenstudio. Ganz deins.","editorThreeSmallChoicesYourKitchenReady":"Drei kleine Entscheidungen. Dann ist deine Küche startklar.","editorSetUpLater":"Später einrichten","editorSetupNavigation":"Einrichtung navigieren","editorBack":"Zurück","editorContinue":"Weiter","editorCreateMyKitchen":"Küche einrichten","editorACalmStartTheAdvancedSettingsAreHereWheneverYouNeedThem":"Ein guter Anfang. Alle erweiterten Einstellungen findest du jederzeit hier.","editorConfigureYourCardVisuallySettingsAreSavedWithYourHomeAssistantDashboard":"Gestalte deine Karten ohne YAML. Die Einstellungen speichert dein Home-Assistant-Dashboard.","editorRunSetupWizard":"Einrichtungs-Wizard starten","editorYourKitchenIsReady":"Deine Küche ist startklar.","editorBasics":"Grundlagen","editorChooseContentAndTheConnectedMealieInstance":"Ansicht, Konto und Sprache festlegen.","editorMode":"Ansicht","editorMealieAccount":"Mealie-Verbindung","editorFirstConnectedAccount":"Erste verbundene Instanz","editorDataConnection":"Datenverbindung","editorAutomaticAtelierFirst":"Automatisch · Atelier zuerst","editorAtelierBridgeFullFeatures":"Atelier Bridge · voller Umfang","editorHomeAssistantMealieReadOnly":"Home-Assistant-Mealie · nur Lesen","editorTheBuiltInOptionNeedsNoAtelierServerOrCardTokenRecipeSearchAndCookingAreReadOnlyTheBridgeAddsImagesAndKitchenTools":"Die eingebaute Option braucht keinen Atelier-Server und kein Kartentoken. Suche und Kochen sind schreibgeschützt; die Bridge ergänzt Bilder und Küchenfunktionen.","editorBuiltInMealieInstance":"Eingebaute Mealie-Instanz","editorLanguage":"Sprache","editorAutomatic":"Automatisch","editorLookFeel":"Erscheinungsbild","editorTypographyMotionAndTheVisualRhythmOfYourCards":"Farben, Animationen und Layout der Karten.","editorTheme":"Darstellung","editorDark":"Dunkel","editorLight":"Hell","editorDensity":"Abstände","editorComfortable":"Großzügig","editorCompact":"Kompakt","editorMotionTransitions":"Animation & Übergänge","editorExpressive":"Lebendig","editorSubtle":"Dezent","editorOff":"Aus","editorYourReducedMotionSystemPreferenceAlwaysTakesPriority":"Die Systemeinstellung „Bewegung reduzieren“ hat immer Vorrang.","editorColumns":"Spalten","editorAccent":"Akzentfarbe","editorCornerStyle":"Ecken","editorRounded":"Rund","editorSoft":"Sanft","editorSquareEckig":"Eckig","editorFoodPhotographyCrop":"Rezeptbild-Format","editorPortraitEditorial":"Hochformat","editorSquareQuadrat":"Quadrat","editorWide":"Querformat","editorShowRecipeImages":"Rezeptbilder anzeigen","editorOptionalPrintAndKitchenSettings":"Optionale Druck- und Kücheneinstellungen","editorPrintStudio":"Druckstudio","editorPremiumA4LayoutsForRecipesAndLists":"Hochwertige A4-Vorlagen für Rezepte und Listen.","editorPrintTemplate":"Druckvorlage","editorInkSaver":"Tintensparend","editorPrintRecipePhotosWhenAvailable":"Rezeptbilder mitdrucken","editorPrintCheckboxes":"Abhakfelder drucken","editorPrintCompletedItems":"Erledigte Einträge mitdrucken","editorPrintStoredNutritionValues":"Nährwerte mitdrucken","editorPrintHandwritingSpace":"Platz für Notizen drucken","editorKitchenTablet":"Küche & Tablet","editorOptionalHomeAssistantActionsNothingTriggersAutomatically":"Optionale Home-Assistant-Aktionen, niemals ungefragt.","editorUseEnlargedTabletLayout":"Großes Tablet-Layout verwenden","editorOptionalKitchenSceneHA":"Optionale Lichtszene (HA)","editorOnlyTriggeredWhenYouTapTheCookingCockpitButton":"Wird nur durch einen bewussten Klick im Kochmodus ausgelöst.","editorOptionalMediaPlayerHA":"Optionaler Mediaplayer (HA)","editorCookingVolume":"Koch-Lautstärke","editorOptionalTTSEngineHA":"Optionale Sprachausgabe (HA)","editorUseAHomeAssistantEntityAllOptionalDeviceActionsAreDisabledByDefault":"Verwende eine Home-Assistant-Entität. Alle Geräteaktionen sind standardmäßig deaktiviert.","editorDashboardModeContainsTheCompleteKitchenDeviceSpecificChangesAreAvailableHereInTheDesignStudio":"Die Ansicht „Übersicht“ enthält die komplette Küche. Gerätespezifische Anpassungen findest du hier im Design Studio.","uiFindYourNextFavorite":"Finde dein nächstes Lieblingsgericht","uiSearchRecipesIngredientsOrViews":"Rezepte, Zutaten oder Ansichten suchen …","uiSearchRecipesIngredientsAndQuickActions":"Rezepte, Zutaten und Schnellzugriffe durchsuchen","uiSearchYourRecipesIncludingByIngredient":"Durchsuche deine Rezepte, auch nach Zutaten.","uiYOURKITCHEN":"DEINE KÜCHE","uiNavigation":"Navigation","uiNoMatchingViewsOrActions":"Keine passenden Ansichten oder Aktionen.","uiSelect":"Auswählen","uiOpen":"Öffnen","uiClose":"Schließen","uiPrintPDF":"Drucken / PDF","uiProtein":"Eiweiß","uiCarbs":"Kohlenhydrate","uiFat":"Fett","uiStep":"Schritt","uiKitchenTimers":"Küchentimer","uiATELIERKITCHENTIMER":"ATELIER · KÜCHENTIMER","uiKeepEverythingInRhythm":"Alles im richtigen Takt","uiactive":"aktiv","uitimeRemaining":"verbleibende Zeit","uiminutes":"Minuten","uiActiveTimer":"Aktiver Timer","uiREADY":"FERTIG","uiRUNNING":"LÄUFT","uiNoTimerRunningYetSetOneToKeepEverythingInRhythm":"Noch kein Timer läuft. Richte dir einen ein, dann bleibt alles im Takt.","uiQuickTimerPresets":"Schnelle Timer","uimin":"Min.","uiMinutes":"Minuten","uiTimerDurationInMinutes":"Timerdauer in Minuten","uiLabelOptional":"Bezeichnung · optional","uieGOven":"z. B. Ofen","uiStartTimer":"Timer starten","uiOneStepAtATimeYouCanAlwaysReturnToTheFullRecipe":"Ganz in Ruhe, ein Schritt nach dem anderen. Du kannst jederzeit zum Rezept zurückkehren.","uiPlanMealsQuicklyWithoutClutter":"Plane deine Mahlzeit mit wenigen Handgriffen. Klar und ohne unnötigen Ballast.","uiStartWithARecipeTitleAddDetailsAfterCreating":"Ein guter Rezepttitel ist der Anfang. Nach dem Anlegen ergänzt du Beschreibung, Portionen, Kochschritte und Zutaten.","uieGLemonPastaWithSpinach":"Zum Beispiel: Zitronenpasta mit Spinat","uiPasteARecipeLinkMealieHandlesImportingIt":"Rezept-Link einfügen. Mealie übernimmt den Import, und du kannst das Ergebnis anschließend im Atelier verfeinern.","uiEditRecipe":"Rezept bearbeiten","uiDetailsIngredientsAndInstructionsInOneClearWorkflow":"Details, Zutaten und Zubereitung übersichtlich an einem Ort.","uiYourRecipeTitleSummaryAndServingSize":"So erscheint dein Rezept in der Sammlung und auf dem Ausdruck.","uiWhatMakesThisSpecial":"Was macht dieses Gericht besonders?","uiShownInRecipesAndPrint":"Wird im Rezept und Druck angezeigt.","uiLinkedFoodsAndUnitsStayProtectedTheIngredientsCanBePrinted":"Strukturierte Lebensmittel und Mengen bleiben geschützt. Die Zutaten sind hier sichtbar und lassen sich sauber ausdrucken.","uiEditAddAndReorderStepsReplacementMustBeExplicitlyEnabled":"Kochschritte separat bearbeiten, ergänzen und sortieren. Nur aktivierte Änderungen werden gespeichert.","uiReplaceCookingInstructions":"Bearbeitete Kochschritte übernehmen","uiAddAStep":"Kochschritt hinzufügen","uiStepsAreReplacedOnSaveIfTheCheckboxIsSelected":"Die Schrittfolge wird beim Speichern vollständig übernommen, wenn du das Kontrollkästchen aktivierst.","uiChangesAreSentToMealieOnlyWhenYouSave":"Deine Änderungen werden erst beim Speichern an Mealie übertragen.","uiGiveYourShoppingListAName":"Ob Wochenmarkt oder Wocheneinkauf: Gib deiner Liste einen Namen.","uieGWeeklyGroceries":"Zum Beispiel: Wocheneinkauf","uiMotionTransitions":"Bewegung & Übergänge","uiThoughtfulMotionThatHelpsNavigationYourReducedMotionDeviceSettingAlwaysTakesPriority":"Feine Animationen, die beim Navigieren Orientierung geben. Die Systemeinstellung „Bewegung reduzieren“ hat immer Vorrang.","uiExpressive":"Lebendig","uiSubtle":"Dezent","uiOff":"Aus","uiPhotoCrop":"Bildformat","uiTall":"Hoch","uiSquare":"Quadrat","uiWide":"Breit","uiCornerStyle":"Ecken","uiRound":"Rund","uiSoft":"Sanft","uiSquareEckig":"Eckig","uiSeparateA4LayoutsForRecipesShoppingAndYourWeeklyPlan":"Rezept, Einkauf und Wochenplan bekommen eigene A4-Drucklayouts.","uiOpenPrintSettings":"Druckoptionen öffnen","uiEnjoyingTheAtelier":"Gefällt dir das Atelier?","uiIfItMakesYourKitchenRoutineBetterYouCanOptionallySupportItsDevelopmentOnKoFi":"Wenn es deinen Küchenalltag schöner macht, kannst du die Weiterentwicklung freiwillig auf Ko-fi unterstützen.","uiSayThanksOnKoFi":"Auf Ko-fi Danke sagen","uiQuickActions":"Schnellzugriff","uiPrintStudioSettings":"Print Studio · Druckeinstellungen","uiUpTo500MatchesThroughHomeAssistantPhotosAndAtelierWriteFeaturesStayDisabledForSecurity":"Bis zu 500 Treffer über Home Assistant. Bilder und Atelier-Schreibfunktionen bleiben aus Sicherheitsgründen deaktiviert.","uiMarkComplete":"Als erledigt markieren: ","uiPrint":"Drucken","uiSwipeToBrowseAllSevenDays":"Seitlich wischen, um alle sieben Tage anzusehen.","uiAllowPopupsToOpenThePrintPreview":"Pop-up blockiert. Erlaube ein Druckfenster für diese Seite.","uiCalories":"Kalorien","uiCarbohydrates":"Kohlenhydrate","uiNutrientValuesComeFromFoodDataNotAIGuessesReviewAllWeightsAndMatches":"Zutaten von echten Lebensmitteldaten trennen wir bewusst von KI-Vorschlägen. Du entscheidest über Mengen und Zuordnungen.","uiFoodsMatched":"Lebensmittel geprüft","uiUSDAAPIKeyNotConfiguredAddItInIntegrationSettingsOrEnv":"USDA API-Key fehlt. Bitte in den Integrationseinstellungen bzw. der .env hinterlegen.","uiThisRecipeAlreadyHasNutritionDataExplicitApprovalIsRequiredToReplaceIt":"Dieses Rezept besitzt bereits Nährwerte. Wir überschreiben sie nur mit deiner ausdrücklichen Zustimmung.","uiSendsIngredientTextToAIProviderNoInventedMacros":"Sendet Zutatennamen an den KI-Anbieter (OpenAI oder Anthropic); keine Nährwertschätzungen.","uiOptionalConfigureAIAPIKey":"Optional: KI-API-Key (OpenAI oder Anthropic) hinterlegen","uiREVIEWINGREDIENTS":"ZUTATEN PRÜFEN","uiNotMatched":"Zuordnung offen","uiFoodSearchQuery":"Lebensmittelname / Suche","uiFindFood":"Lebensmittel suchen","uiNoCompleteNutritionEntriesFoundTryAnotherQuery":"Keine vollständigen Daten gefunden. Anderen Begriff versuchen.","uiBasedOnSelectedUSDAEntriesPer100gCookingYieldsAndMissingNutrientsAffectAccuracyValuesAreEstimates":"Grundlage: ausgewählte USDA-Datensätze je 100 g. Garverluste, Abtropfgewicht, Roh-/Gargewicht und nicht erfasste Zutaten können das Ergebnis verändern. Fehlende Werte werden nicht erfunden.","uiSourcesCoverage":"Quellen & Abdeckung","uiExplicitlyReplaceExistingNutritionValues":"Vorhandene Nährwerte ausdrücklich ersetzen","uiYourPersonalCookingNotesStoredOnlyOnThisDeviceNotSyncedToMealie":"Deine persönlichen Koch-Erfahrungen. Nur auf diesem Gerät gespeichert, nicht mit Mealie synchronisiert.","uiHowDidItTurnOut":"Wie gut hat es geschmeckt?","uiNotRated":"Nicht bewertet","uiNextTimeReduceTheSalt":"Nächstes Mal etwas weniger Salz …","editorPreviewDashboard":"Deine Küche für den Tag","editorPreviewToday":"Heute auf dem Teller","editorPreviewDiscover":"Kochinspo für euch","editorPreviewRecipes":"Lieblingsrezepte","editorPreviewMealplan":"Was diese Woche auf den Tisch kommt","editorPreviewPantry":"Das ist schon da","editorPreviewShopping":"Auf dem Einkaufszettel","editorPreviewFamily":"Gemeinsam schmeckt’s","editorPreviewCookbook":"Deine Kochbücher","editorPreviewManage":"Dein Küchenstudio","uiRememberAsFavoriteRecipe":"Als Lieblingsrezept merken","uiScaleServingsNote":"Mengen für {target} Portionen angepasst. Rezeptbasis: {base} Portionen. Eindeutige Mengen sind skaliert; Freitext bitte prüfen.","uiRecipeStepImageAlt":"Bild zu Schritt {step}","uiMarkShoppingOpen":"Als offen markieren: {item}","uiMarkShoppingComplete":"Als erledigt markieren: {item}","uiServing.one":"Portion","uiServing.other":"Portionen","uiThisFeatureRequiresMealieAtelierBridge":"Diese Funktion benötigt die Mealie Atelier Bridge.","uiHomeAssistantSMealieIntegrationWithRecipeSearchIsUnavailable":"Die Home-Assistant-Mealie-Integration mit Rezeptsuche ist nicht verfügbar.","uiChooseAValidMealieInstance":"Bitte wähle eine gültige Mealie-Instanz.","uiHomeAssistantReturnedNoRecipe":"Home Assistant hat kein Rezept zurückgegeben.","uiEveryDay":"Jeden Tag","uiDescribeThisStep":"Beschreibe diesen Kochschritt …","uiMoveUp":"Nach oben","uiMoveDown":"Nach unten","uiRemoveStep":"Schritt entfernen","uiRemove":"Entfernen","uiMealieReadOnly":"Mealie · nur Lesen","uiRecipesCookingPhotosAndEditsNeedAtelierBridge":"Rezepte & Kochen · Bilder und Änderungen mit Atelier Bridge","uiKitchenTimer":"Küchentimer","uiAISuggestedSearchTermsReviewEveryDatabaseMatchYourself":"KI-Suchbegriffe vorgeschlagen. Bitte jeden Datenbanktreffer selbst prüfen.","uiNutritionSavedToMealie":"Nährwerte in Mealie gespeichert","uiCalculatedReviewBeforeSaving":"Berechnung abgeschlossen. Prüfe die Daten vor dem Speichern.","uiBonAppetitEnjoyYourMeal":"Guten Appetit! Schön, dass du mit Atelier gekocht hast.","uiTypeAtLeastOneMoreCharacter":"Gib noch mindestens einen Buchstaben ein.","uiSearchingYourRecipes":"Ich durchsuche eure Rezepte …","uiNoRecipeFoundYet":"Noch kein Rezept dazu","uiTryAnotherRecipeNameOrIngredient":"Versuch es mit einem anderen Rezeptnamen oder einer Zutat.","uiSearchIsUnavailableRightNow":"Suche gerade nicht erreichbar","uiIngredient":"Zutat","uiRecipeName":"Rezeptname","uiNameIngredient":"Name & Zutat","uiRecipeMatch":"Rezepttreffer","uiMATCHINGRECIPES":"PASSENDE REZEPTE","uiresults":"Treffer","uiRecipeResults":"Rezepttreffer","uiNoteSavedOnThisDevice":"Kochnotiz auf diesem Gerät gespeichert","uiOpenQuickActions":"Schnellzugriff öffnen ({shortcut})","uiSeeAllResults":"Alle {count} Treffer ansehen","uiConversion":"Küchen-Umrechnung","uiConversionNeedsDensity":"Masse und Volumen brauchen eine zutatenbezogene Dichte. Atelier rät hier nicht.","uiConversionExactFactors":"Mit Standard-Umrechnungsfaktoren berechnet. Rezeptmengen bleiben unverändert.","uiSearchConversionExample":"Zum Beispiel: 250 g in oz","uiPrintHeroTitle":"Auch auf Papier. Richtig schön.","uiPrintHeroDescription":"Ein eigenes, sorgfältig gesetztes Drucklayout. Dein Browser kann es direkt als PDF speichern.","uiPrintStyle":"LAYOUT WÄHLEN","uiPrintEditorial":"Editorial","uiPrintEditorialDescription":"Elegant, großzügig und hochwertig","uiPrintCompact":"Kompakt","uiPrintCompactDescription":"Mehr Inhalt auf weniger Seiten","uiPrintInkSaver":"Tintensparend","uiPrintInkSaverDescription":"Ohne Fotos und mit wenig Farbeinsatz","uiPrintDetails":"DETAILS ANPASSEN","uiPrintIncludePhoto":"Rezeptfoto verwenden (falls vorhanden)","uiPrintIncludeNutrition":"Nährwerte aus Mealie mitdrucken (falls vorhanden)","uiPrintIncludeCompleted":"Bereits erledigte Artikel mitdrucken","uiPrintIncludeCheckboxes":"Abhakfelder anzeigen","uiPrintIncludeNotes":"Platz für handschriftliche Notizen","uiPrintOpenPreview":"Druck- / PDF-Vorschau öffnen","uiPrintGuide":"Im Druckdialog A4 und 100 % wählen. Der Wochenplan wird automatisch im Querformat vorbereitet. Die tatsächliche Vorschau öffnet sich in einem neuen Fenster.","uiPrintPaperPreview":"PAPIERVORSCHAU","uiYourRecipe":"Dein Rezept","uiPrintPreviewDescription":"Klar gesetzt. Gut lesbar. Schön zum Abheften.","uiPrintIngredientsItems":"ZUTATEN / EINTRÄGE","uiPrintPreparationNotes":"ZUBEREITUNG / NOTIZEN","uiPrintDesignedForPaper":"FÜR PAPIER GESTALTET","offlinePanelLabel":"Offline-Synchronisierung und Küchenalarme","offlineSyncTimers":"Synchronisierung & Küchentimer","offlineLoading":"Status wird geladen","offlineShopping":"Offline-Einkauf","offlineStorageNote":"Änderungen bleiben auf diesem Gerät, bis sie sicher mit Mealie abgeglichen wurden.","offlineEnable":"Offline aktivieren","offlineSyncNow":"Jetzt abgleichen","offlineReviewConflicts":"Konflikte prüfen","offlineBackgroundTimers":"Hintergrund-Timer","offlineCheckingDelivery":"Zustellkanal wird geprüft","offlineAllowPush":"Push erlauben","offlineRefreshTimers":"Timer aktualisieren","offlineConflictToggle":"Abhak-Konflikt","offlineConflictList":"Einkaufslisten-Konflikt","offlineReviewCurrentList":"Bitte die aktuelle Mealie-Liste prüfen.","offlineDiscardChange":"Änderung verwerfen","offlinePlanned":"Geplant: {time}","offlineStopTimer":"Timer stoppen","offlineDisabled":"Offline-Einkauf ist ausgeschaltet","offlineStatus":"{connection} · {pending} ausstehend{conflicts}{syncing}","offlineConflictCount":" · {count} Konflikt(e)","offlineSyncing":" · Synchronisiere","offlineClearLocal":"Lokale Daten löschen","offlineHomeAssistantActive":"Home Assistant aktiv","offlinePushConfigured":"Web Push konfiguriert (Berechtigung erforderlich)","offlineNoAlarmChannel":"Kein Alarmkanal konfiguriert","offlinePushReady":"Push eingerichtet","offlineEnableConfirmTitle":"Offline-Einkauf aktivieren?","offlineEnableConfirmBody":"Einkaufslisten und ausstehende Änderungen werden auf diesem Gerät gespeichert. Nicht auf öffentlichen Geräten aktivieren.","offlineDeleteConfirmTitle":"Offline-Daten löschen?","offlineDeleteConfirmBody":"Lokale Einkaufslisten und noch nicht synchronisierte Änderungen werden unwiderruflich gelöscht.","offlineDeleteConfirmAction":"Daten löschen","offlineEnableConfirmAction":"Offline aktivieren","offlinePushSetup":"Push-Benachrichtigungen einrichten","offlineEnableHelp":"Offline-Einkauf aktivieren","offlineAlarmError":"Fehler bei der Küchen-Timer-Benachrichtigung","uiBackgroundTimerEnabled":"Hintergrundtimer aktiviert","uiLocalTimerEnabled":"Nur lokaler Timer aktiviert","uiBackgroundTimerError":"Hintergrundtimer nicht aktiviert: {error}","uiTimerStopError":"Timer konnte nicht gestoppt werden: {error}","dialogWeeklyMenu":"WOCHENPLAN","dialogYourMenu":"DEIN MENÜ","dialogPlanned":"GEPLANT","dialogNewRecipe":"NEUES REZEPT","dialogRecipeTitle":"REZEPTTITEL","dialogSource":"QUELLE","dialogRecipeStudio":"REZEPTSTUDIO","dialogBasics":"GRUNDLAGEN","dialogStepByStep":"SCHRITT FÜR SCHRITT","offlineNoSnapshot":"Noch keine Offline-Kopie. Öffne die Einkaufsliste einmal online.","offlineNotEnabled":"Aktiviere zuerst den Offline-Einkauf über die Statusleiste.","offlineListNeedsRefresh":"Lade die Einkaufsliste zuerst bei bestehender Verbindung.","offlineRequiresConnection":"Für diese Aktion ist eine Internetverbindung erforderlich.","offlineItemNotEditable":"Dieser Eintrag kann offline nicht bearbeitet werden.","offlineInvalidItem":"Der Eintrag oder die Einkaufsliste ist ungültig.","offlinePushKeysMissing":"Für Web Push fehlen die Server-Schlüssel.","offlinePushRequiresHttps":"Web Push benötigt HTTPS und einen unterstützten Browser.","offlinePushPermissionDenied":"Benachrichtigungen wurden nicht erlaubt.","offlineAlarmRequiresServer":"Ohne Serververbindung kann kein Hintergrundalarm aktiviert werden.","offlineUnexpectedError":"Die Offline-Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen.","printDocRecipe":"REZEPT","printDocShoppingList":"EINKAUFSLISTE","printDocWeeklyPlan":"WOCHENPLAN","printDocTotalTime":"Gesamtzeit","printDocMinAbbr":"Min.","printDocCloseWindow":"Fenster schließen","printDocFromYourKitchen":"Für deine Küche","printDocNoItems":"Keine Einträge vorhanden","printDocYourWeeklyPlan":"Dein Wochenplan","printDocMeals":"Gerichte","printDocListed":"Eingekauft","printDocNutritionCaution":"Angaben pro Portion nur, wenn so hinterlegt; Portionsgröße prüfen","printDocYield":"Ergibt","printDocSide":"Beilage","printDocDessert":"Dessert","printDocDrink":"Getränk","printDocSnack":"Snack","printDocCalories":"Kalorien","printDocProtein":"Eiweiß","printDocCarbs":"Kohlenhydrate","printDocFat":"Fett","printDocFiber":"Ballaststoffe","printDocSugar":"Zucker","studioReasonPantryCovered":"{covered}/{total} Zutaten mengenmäßig gedeckt","studioReasonPantryUnchecked":"Vorrat noch nicht geprüft","studioReasonAmountsUnclear.one":"1 Menge unklar","studioReasonAmountsUnclear.other":"{count} Mengen unklar","studioReasonFamilyFriendly":"Familienfreundlich markiert","studioReasonServingsBase":"Rezeptbasis: {servings} Portionen","studioReasonServingsOpen":"Portionen offen","studioReasonWithinBudget":"{minutes} Min. im Zeitbudget","studioReasonOverBudget":"{minutes} Min. · etwas über dem Zeitbudget","studioReasonSharedIngredients":"gemeinsame Zutaten","studioReasonTwoMeals":"Portionen für zwei Mahlzeiten","studioLeftoversName":"Reste: {name}","studioAisleChilled":"Kühlregal","studioAislePantry":"Vorrat & Getreide","studioAisleSpices":"Gewürze & Öle","studioAisleProtein":"Proteine","studioAisleProduce":"Obst & Gemüse / Sonstiges","studioAuditNoIngredients":"Keine Zutaten hinterlegt","studioAuditNoSteps":"Keine Zubereitungsschritte hinterlegt","studioAuditAmountUnclear":"Menge unklar: {item}","studioAuditAmountLarge":"Ungewöhnlich große Menge: {item}","studioAuditServingsInvalid":"Portionen fehlen oder sind ungültig","studioAuditTimeMissing":"Gesamtzeit fehlt","studioAuditDuplicate":"Möglicher doppelter Eintrag: {item}","studioSwapCream":"Hafercuisine / Kochcreme","studioSwapButter":"Pflanzenmargarine oder Olivenöl","studioSwapEgg":"Leinsamen-Ei (bei einigen Teigen)","studioSwapMilk":"Haferdrink","studioSwapMushroom":"Zucchini oder Aubergine","studioSwapQuark":"pflanzliche Quarkalternative","studioSwapParmesan":"Hefeflocken oder vegane Hartkäsealternative","studioSwapFlour":"anderes geeignetes Mehl, Konsistenz prüfen","studioSwapSugar":"Ahornsirup (Flüssigkeit anpassen)","studioSwapWarning":"Textvorschlag, kein geprüfter 1:1-Ersatz. Allergene und Konsistenz selbst prüfen.","studioNoPlannedIngredients":"Keine geplanten Gerichte mit abrufbaren Zutaten vorhanden.","studioCreateShoppingListFirst":"Bitte erst in Mealie eine Einkaufsliste anlegen.","uiMealieRecipeFallback":"Mealie-Rezept","itemFallback":"Eintrag","recipeFallback":"Rezept","navKitchenLabel":"Küchennavigation","uiHomeAssistantNotReady":"Die Verbindung zu Home Assistant ist noch nicht bereit","uiAiSuggestionCountMismatch":"Unerwartete Anzahl an KI-Vorschlägen","uiExperimentalBadge":"EXPERIMENTELL","nutriGramsPlaceholder":"z. B. 200","studioRecipeFetchFailed.one":"1 Rezept konnte nicht geladen werden und wurde übersprungen: {names}","studioRecipeFetchFailed.other":"{count} Rezepte konnten nicht geladen werden und wurden übersprungen: {names}","uiProviderResultsTruncated":"Es werden die ersten {limit} Treffer angezeigt. Die Ergebnisse sind möglicherweise unvollständig. Mit der Mealie Atelier Bridge durchsuchst du deine gesamte Bibliothek.","uiKeepScreenAwake":"Bildschirm beim Kochen anlassen","uiMutationFailed":"Speichern fehlgeschlagen: {error} Deine Änderung wurde rückgängig gemacht.","uiSaving":"Wird gespeichert…","uiNoWriteGrant":"Dein Home-Assistant-Nutzer darf diese Küche ansehen, aber nicht ändern. Ein Administrator kann den Zugriff in den Mealie-Atelier-Optionen freigeben.","uiNoWriteGrantWeb":"Du bist mit Lesezugriff angemeldet. Ein Administrator kann deinem Konto die Schreibrolle geben.","errNotConfigured":"Mealie Atelier ist noch nicht eingerichtet.","errInvalidRequest":"Die Anfrage war ungültig. Prüfe deine Eingabe und versuche es erneut.","errMealieAuth":"Mealie hat den API-Token abgelehnt. Prüfe den Token in den Einstellungen.","errMealieError":"Mealie ist nicht erreichbar oder hat unerwartet geantwortet. Versuche es gleich noch einmal.","errAiError":"Der KI-Anbieter hat nicht geantwortet oder eine unbrauchbare Antwort geliefert. Prüfe den API-Key und versuche es erneut.","errReadOnly":"Diese Küche ist schreibgeschützt, daher lässt sich nichts ändern.","errUnauthorized":"Diese Aktion erfordert Administratorrechte.","errWriteNotPermitted":"Du darfst in dieser Küche keine Daten ändern.","errConflict":"Jemand hat das inzwischen geändert. Lade neu und versuche es erneut.","errRecipeChanged":"Das Rezept wurde anderswo geändert. Lade es vor dem Speichern neu.","errDisabled":"Diese Funktion ist in den Einstellungen abgeschaltet.","errUseStructuredEditor":"Bearbeite Zutaten mit dem strukturierten Zutaten-Editor.","errWriteUnverified":"Mealie hat die Änderung angenommen, aber das gespeicherte Rezept sieht anders aus. Prüfe das Rezept, bevor du es erneut versuchst.","errBackupFailed":"Das Backup konnte nicht gespeichert werden, daher wurde nichts geändert.","errBackupNotFound":"Dieses Backup gibt es nicht mehr.","errUploadInvalid":"Das Foto wurde abgelehnt. Nutze ein JPEG-, PNG- oder WebP-Bild innerhalb der Größenbeschränkung.","errUploadExpired":"Der Upload ist abgelaufen. Starte ihn erneut.","errUploadBusy":"Es sind zu viele Uploads offen. Warte einen Moment und versuche es erneut.","errStepNotFound":"Dieser Schritt existiert nicht mehr. Lade das Rezept neu.","errSyncRuleNotFound":"Diese Sync-Regel gibt es nicht mehr. Lade den Status neu und versuche es erneut.","errSyncDestinationUnsupported":"Diese Liste kann nicht als Ziel dienen. Wähle eine To-do-Liste, die das Hinzufügen von Artikeln unterstützt und keine Mealie-Liste ist.","errSyncSourceTaken":"Eine andere Regel nutzt diese Quellliste bereits. Bearbeite stattdessen die vorhandene Regel.","errSyncTooManyRules":"Du kannst höchstens 5 Sync-Regeln haben. Lösche zuerst eine.","errSyncNotActivated":"Diese Regel hat ihren ersten Stapel noch nicht gesendet. Bestätige den ersten Stapel zuerst in der Einrichtung.","errSyncNotSupported":"Der Einkaufs-Sync braucht Home Assistant mit der Mealie Atelier Bridge.","editorIngredientsLocked":"Die strukturierte Zutatenbearbeitung ist ausgeschaltet. Bitte eine Administratorin oder einen Administrator, sie zu aktivieren.","editorQuantity":"Menge","editorUnit":"Einheit","editorFood":"Lebensmittel","editorNote":"Notiz","editorOriginal":"Originaltext","editorAddIngredient":"Zutat hinzufügen","editorMoveUp":"Zutat {row} nach oben","editorMoveDown":"Zutat {row} nach unten","editorRemoveRow":"Zutat {row} entfernen","editorCreateOption":"„{text}“ anlegen","editorCreatedExisting":"Gab es schon, verknüpft","editorQuantityInvalid":"Gib eine Zahl wie 1,5, 1 1/2 oder ½ ein.","editorServingsPreview.one":"Vorschau für 1 Portion","editorServingsPreview.other":"Vorschau für {count} Portionen","editorServingsReset":"Vorschau zurücksetzen","editorServingsNote":"Nur eine Vorschau. Es wird nichts gespeichert.","editorScaled":"Umgerechnet","editorSaveSummary":"{changed} geändert, {added} neu, {removed} entfernt","editorSaveIngredients":"Zutaten prüfen und speichern","editorConfirmSave":"Zutaten speichern","editorNoChanges":"Noch nichts geändert.","editorCancel":"Abbrechen","editorLoading":"Zutaten werden geladen…","editorRow":"Zutat {row}","editorComboSearching":"Suche läuft…","editorComboEmpty":"Keine Treffer","editorReloadChanged":"Dieses Rezept wurde woanders geändert. Lade es neu und trage deine Änderungen erneut ein. Beim Neuladen geht dein Entwurf verloren.","editorReload":"Entwurf verwerfen und neu laden","editorSavedWithBackup":"Gespeichert. Backup von {time} verfügbar","editorRestoredWithBackup":"Version wiederhergestellt. Backup von {time} verfügbar","editorHistory":"Versionsverlauf","editorHistoryHide":"Versionsverlauf ausblenden","editorHistoryLoading":"Versionen werden geladen…","editorHistoryEmpty":"Noch keine Backups. Vor jeder Änderung wird eines angelegt.","editorRestore":"Wiederherstellen","editorRestoreConfirm":"Die Version von {time} wiederherstellen? Der aktuelle Stand wird vorher gesichert. Ungespeicherte Änderungen in diesem Dialog gehen verloren.","editorRestoreNow":"Diese Version wiederherstellen","editorUndo":"Letzte Änderung rückgängig machen","editorKindIngredients":"Zutaten","editorKindBasics":"Grunddaten","editorKindInstructions":"Schritte","editorKindImage":"Titelfoto","editorKindStepImage":"Schrittfoto","editorKindRestore":"Wiederherstellung","editorPhoto":"Foto","editorPhotoNone":"Dieses Rezept hat noch kein Foto.","editorPhotoHint":"JPEG, PNG oder WebP, bis zu {size} MB.","editorPhotoReplace":"Foto ersetzen","editorPhotoRemove":"Foto entfernen","editorPhotoRemoveConfirm":"Das Titelfoto entfernen? Vorher wird ein Backup angelegt.","editorPhotoRemoveNow":"Foto jetzt entfernen","editorStepPhotoAdd":"Foto hinzufügen","editorStepPhotoReplace":"Ersetzen","editorStepPhotoRemove":"Entfernen","editorStepPhotoAlt":"Foto zu Schritt {step}","editorStepPhotoKeptInMealie":"Das Foto wird von diesem Schritt entfernt. Mealie behält die Datei auf seinem Speicher.","editorStepPhotoSaveFirst":"Speichere den Schritt zuerst, um ein Foto hinzuzufügen.","editorUploadTooLarge":"Diese Datei ist größer als {size} MB.","editorUploadWrongType":"Nur JPEG-, PNG- und WebP-Bilder funktionieren.","editorUploadProgress":"Hochladen {percent} %","editorUploadCancel":"Hochladen abbrechen","editorUploadCancelled":"Hochladen abgebrochen.","editorRowNeedsText":"Gib für diese Zutat ein Lebensmittel oder eine Notiz an.","editorUploadNeedsSecure":"Das Hochladen von Fotos braucht eine sichere Verbindung (HTTPS).","syncTitle":"Einkaufs-Sync","syncOpen":"Einkaufs-Sync","syncFixNumbers":"Korrigiere die markierten Zahlen vor dem Speichern.","syncBadgeIssues":"{count} zu prüfen","syncSetup":"Einkaufs-Sync einrichten","syncAddRule":"Sync-Regel hinzufügen","syncEditRule":"Sync-Regel bearbeiten","syncNoRules":"Noch keine Sync-Regel. Eine Regel sendet offene Artikel einer Mealie-Liste an eine To-do-Liste in Home Assistant, zum Beispiel Bring.","syncRuleName":"Name der Regel","syncSource":"Quellliste in Mealie","syncDestination":"Zielliste in Home Assistant","syncDestinationOption":"{name} · {platform}","syncNoDestinations":"Keine passende To-do-Liste gefunden. Das Ziel muss das Hinzufügen von Artikeln unterstützen und darf keine Mealie-Liste sein.","syncSupportsNotes":"Unterstützt Notizen: {answer}","syncYes":"ja","syncNo":"nein","syncStepMode":"Modus","syncStepWhen":"Wann synchronisiert wird","syncStepConfirm":"Bestätigen","syncModeCopy":"Kopieren","syncModeCopyHint":"Mealie bleibt unverändert","syncModeMove":"Verschieben","syncModeMoveHint":"Artikel werden in Mealie abgehakt, sobald die Zielliste sie bestätigt hat","syncTriggerAfterAdd":"Nachdem Atelier Rezeptzutaten hinzugefügt hat","syncTriggerWatch":"Auf Änderungen an anderer Stelle achten","syncTriggerWatchHint.one":"Mealie Atelier prüft die Quellliste regelmäßig. Änderungen an anderer Stelle erscheinen nach bis zu 1 Minute.","syncTriggerWatchHint.other":"Mealie Atelier prüft die Quellliste regelmäßig. Änderungen an anderer Stelle erscheinen nach bis zu {interval} Minuten.","syncDebounce":"Wartezeit vor dem Senden (Sekunden)","syncPollMinutes":"Prüfen alle (Minuten)","syncDuplicates":"Duplikate","syncDuplicateSkipExact":"Identische Artikel überspringen","syncDuplicateMerge":"Identische Artikel überspringen und gleiche Einheiten zusammenfassen","syncDuplicateNone":"Alles senden","syncPreview":"Vorschau","syncPreviewRun":"Vorschau anzeigen","syncPreviewEmpty":"Im Moment gibt es nichts zu senden. Offene Artikel der Quellliste werden gesendet, sobald sie auftauchen.","syncPreviewSample":"Beispielzeile: {title}","syncPreviewTotal.one":"1 offener Artikel in der Quellliste. Gezeigt wird der erste Stapel mit {shown}.","syncPreviewTotal.other":"{total} offene Artikel in der Quellliste. Gezeigt wird der erste Stapel mit {shown}.","syncActionSend":"Senden","syncActionSkipDuplicate":"Überspringen, schon vorhanden","syncActionMerge":"Mit anderer Zeile zusammenfassen","syncActionSkipEmpty":"Überspringen, kein Text","syncConfirmSend.one":"Speichern und 1 Artikel aus {source} an {destination} senden","syncConfirmSend.other":"Speichern und {count} Artikel aus {source} an {destination} senden","syncSaveOnly":"Speichern ohne zu senden","syncSaveChanges":"Änderungen speichern","syncResetConfirm":"Mir ist klar, dass eine Änderung von Quelle oder Ziel die Regel neu startet und ihren Verlauf vergisst. Die Zielliste bleibt unberührt.","syncStateActive":"Aktiv","syncStatePaused":"Pausiert","syncStateNotActivated":"Noch nicht aktiviert. Automatisch wird nichts gesendet, bis du den ersten Stapel bestätigst.","syncPending.one":"1 wartet","syncPending.other":"{count} warten","syncRunNow":"Jetzt ausführen","syncFirstBatch":"Ersten Stapel prüfen und senden","syncPause":"Pausieren","syncResume":"Fortsetzen","syncRetryFailed":"Fehlgeschlagene erneut versuchen","syncReview":"Prüfen","syncReviewTitle":"Artikel zum Prüfen","syncReviewEmpty":"Nichts braucht deine Aufmerksamkeit.","syncReviewClose":"Zurück zum Status","syncDismiss":"Verwerfen","syncResend":"Erneut senden","syncDelete":"Regel löschen","syncDeleteConfirm":"Diese Regel löschen? Die Zielliste bleibt unberührt und der Sync-Verlauf dieser Regel wird entfernt.","syncLastRun":"Letzter Lauf {time}: {result}","syncNeverRun":"Noch kein Lauf","syncRunQueued":"Ein Lauf ist schon aktiv. Direkt danach folgt ein weiterer Durchgang.","syncRunResult":"{result}. Gesendet {sent}, übersprungen {skipped}, fehlgeschlagen {failed}, noch offen {left}.","syncOutcomeSent":"Gesendet","syncOutcomePartial":"Teilweise gesendet, einige Artikel brauchen Aufmerksamkeit","syncOutcomeFailed":"Nicht gesendet","syncOutcomeDestinationUnavailable":"Zielliste nicht erreichbar","syncOutcomeSourceUnavailable":"Mealie nicht erreichbar","syncOutcomeNothing":"Nichts zu senden","syncOutcomeReconciled":"Mit der Zielliste abgeglichen","syncOutcomeUnknown":"Unbekanntes Ergebnis","syncRecordState_pending":"Wartet","syncRecordState_sending":"Wird gesendet","syncRecordState_sent":"Gesendet","syncRecordState_source_completed":"In Mealie abgehakt","syncRecordState_failed":"Fehlgeschlagen","syncRecordState_needs_reconciliation":"Unklar, ob angekommen","syncRecordState_changed_after_send":"Nach dem Senden geändert","syncRecordState_removed_after_send":"Nach dem Senden entfernt","syncErrorDestinationUnavailable.one":"{destination} ist nicht erreichbar. 1 Artikel bleibt in Mealie offen.","syncErrorDestinationUnavailable.other":"{destination} ist nicht erreichbar. {count} Artikel bleiben in Mealie offen.","syncErrorSourceUnavailable":"Mealie ist nicht erreichbar. Es wurde nichts gesendet.","syncReconcileHint.one":"Bei 1 Artikel ist unklar, ob er angekommen ist. Er wird beim nächsten Lauf mit der Zielliste abgeglichen.","syncReconcileHint.other":"Bei {count} Artikeln ist unklar, ob sie angekommen sind. Sie werden beim nächsten Lauf mit der Zielliste abgeglichen.","syncNeedsWrite":"Dein Home-Assistant-Nutzer darf den Sync ansehen, aber nicht ändern.","syncStandaloneExplain":"Der Live-Sync zu Bring und anderen Listen braucht Home Assistant mit der Mealie Atelier Bridge. Die eigenständige App sendet keine Einkaufsdaten an Dritte.","syncLoadFailed":"Der Sync-Status konnte nicht geladen werden.","syncCancel":"Abbrechen","syncInvalidNumber":"Gib eine ganze Zahl zwischen {min} und {max} ein.","syncAuditTitle":"Letzte Läufe","syncAuditEntry.one":"{time}: {result}, 1 Artikel","syncAuditEntry.other":"{time}: {result}, {count} Artikel","syncOutboxTitle":"Wartet auf das Senden","syncLastError_destination_rejected":"Die Zielliste hat den Artikel abgelehnt.","syncLastError_destination_timeout":"Die Zielliste hat nicht rechtzeitig geantwortet.","syncLastError_destination_unavailable":"Die Zielliste war nicht erreichbar.","syncLastError_source_complete_failed":"Der Artikel konnte in Mealie nicht abgehakt werden.","syncLastError_ambiguous":"Mehrere Artikel in der Zielliste passen. Entscheide, ob du ihn erneut sendest.","pickerLabel":"Rezept","pickerPlaceholder":"Rezepte suchen …","pickerCount":"{shown} von {total} Rezepten","pickerLoadMore":"Mehr laden","pickerLoading":"Rezepte werden geladen …","pickerEmpty":"Kein Rezept passt zu „{query}“.","pickerNoneFound":"Keine Rezepte gefunden.","pickerClearFilters":"Filter zurücksetzen","pickerError":"Rezepte konnten nicht geladen werden: {error}","pickerRetry":"Erneut versuchen","pickerEnd":"Ende der Liste","pickerCategory":"Kategorie","pickerTag":"Tag","pickerFavorites":"Nur Favoriten","pickerFavoritesHint":"Favoriten des verbundenen Mealie-Kontos","pickerSort":"Sortierung","pickerSortName":"Name","pickerSortRecent":"Zuletzt geändert","offlineWaiting":"Wartet auf Verbindung","offlineQueued.one":"1 Änderung wartet","offlineQueued.other":"{count} Änderungen warten","offlineSendNow":"Jetzt senden","offlineDiscard":"Verwerfen","offlineSaved":"Keine Verbindung. Deine Änderung ist auf diesem Gerät gespeichert und wird später gesendet.","offlineDropped":"Eine vorgemerkte Änderung wurde verworfen, weil dein Konto diese Küche nicht mehr ändern darf.","offlineConflictItem":"{item}: {error}","errOfflineOpReused":"Diese vorgemerkte Änderung kollidiert mit einer früheren. Verwirf sie und mache die Änderung neu.","errOfflineConflict":"Dieser Eintrag wurde zwischenzeitlich anderswo geändert. Verwirf deine Änderung und prüfe die Liste.","errOfflineAddUncertain":"Dieser Eintrag steht womöglich schon auf der Liste. Prüfe die Liste und verwirf dann diesen Eintrag.","cookSwipeHint":"← wischen →","studioKicker":"ATELIER / KÜCHENSTUDIO","studioDailyExpiringOne":"1 Vorrat sollte bald verbraucht werden.","openItemsLabel":"Offene Artikel","recipesSub":"Alle Rezepte aus deinem Mealie an einem Ort.","mealplanSub":"Plane die Woche und sieh auf einen Blick, was wann auf den Tisch kommt.","shoppingSub":"Hake ab, was im Wagen liegt. Die Liste bleibt mit Mealie abgeglichen.","manageSub":"Rezepte anlegen, importieren und Basisdaten pflegen.","journalKicker":"KOCHJOURNAL","nutritionKicker":"NÄHRWERTLABOR","openItems.one":"1 offener Artikel","openItems.other":"{count} offene Artikel","importKicker":"IMPORT","shoppingKicker":"EINKAUF","editorCustomValue":"{value} (benutzerdefiniert, keine Vorgabe)","editorNoBuiltInMealieIntegrationFound":"Nicht verfügbar: In Home Assistant ist keine Mealie-Integration eingerichtet.","editorColorSage":"Salbeigrün","editorColorApricot":"Aprikose","editorColorPeriwinkle":"Lavendelblau","editorColorLilac":"Flieder","editorColorHoney":"Honiggelb","stubTitle.today":"Mealie Atelier · Heute","stubTitle.recipes":"Mealie Atelier · Rezepte","stubTitle.mealplan":"Mealie Atelier · Wochenplan","stubTitle.shopping":"Mealie Atelier · Einkauf","stubTitle.discover":"Mealie Atelier · Kochinspo","stubTitle.pantry":"Mealie Atelier · Vorräte","stubTitle.family":"Mealie Atelier · Gemeinsam kochen","stubTitle.cookbook":"Mealie Atelier · Kochbuch","stubTitle.manage":"Mealie Atelier · Verwalten"},"en":{"dashboard":"Overview","today":"Today","discover":"Cook ideas","pantry":"Pantry","family":"Family cooking","cookbook":"Cookbook","recipes":"Recipes","mealplan":"Meal planner","shopping":"Shopping","manage":"Manage","greeting":"Good food. Every day.","greetingSub":"Your kitchen, reimagined.","eyebrow":"YOUR PERSONAL KITCHEN STUDIO","tonight":"Tonight on the table","viewRecipe":"Open recipe","nothing":"Nothing planned yet","planNow":"Plan a dish","collections":"Your recipe collection","all":"All recipes","search":"Search recipes …","noRecipes":"No recipes found.","noPlan":"Nothing planned","week":"Your week at a glance","list":"Everything for the market","add":"Add","addItem":"Add an item","noShopping":"Your shopping list is empty.","progress":"done","items":"items","cooking":"Cooking mode","edit":"Edit","addToPlan":"Plan meal","servings":"Servings","ingredients":"Ingredients","instructions":"Instructions","next":"Next","back":"Back","done":"Done","cookStart":"Start cooking","create":"New recipe","import":"Import from URL","name":"Recipe name","description":"Description","save":"Save","url":"Recipe URL","more":"Show more","settings":"Design Studio","language":"Language","languageAuto":"Automatic","languageName":"English","studioConnectionFailed":"Atelier connection failed","studioSaveFailed":"Could not save","studioAnalysisFailed":"Recipe analysis failed","studioDetailsLoading":"Loading recipe details for planning …","studioCatalogLoading":"Loading recipe collection: {loaded} of {total} recipes …","studioCatalogLoadingCount":"Loading recipe collection: {loaded} recipes …","studioCatalogDetails":"Recipe details: {loaded} of {total} loaded …","studioCatalogLimit":"The analysis loads up to 600 recipes.","studioCatalogTotal":"The collection contains {total}.","studioDialogLabel":"MEALIE ATELIER / KITCHEN STUDIO","studioDialogPromptLabel":"Enter an ingredient","studioDialogPromptPlaceholder":"e.g. cream","studioConfirm":"Confirm","studioCancel":"Cancel","studioClose":"Close","studioDiagnosticsKicker":"ATELIER / SYSTEM CHECK","studioDiagnosticsTitle":"Is everything working?","studioDiagnosticsDescription":"Checks the actual connection, read access, and settings. No data is changed and no access keys are shown.","studioDiagnosticsRunning":"Checking …","studioDiagnosticsCheck":"Check connection","studioDiagnosticsExport":"Export Atelier data as JSON","studioDiagnosticsEmpty":"Not checked yet. Run the system check to catch connection issues early.","studioDiagnosticsAdmin":"Admin","studioDiagnosticsEdit":"Editing allowed","studioDiagnosticsReadOnly":"Read-only","studioDiagnosticsBackup":"The backup contains private household data and recipe notes.","studioDiagnosticsReachable":"Reachable","studioBridge":"Atelier Bridge","studioStorage":"Atelier storage","version":"Version","studioDiagnosticsNoData":"No data","studioDiagnosticsError":"Error","studioDiagnosticsPassed":"All five connection checks passed.","studioDiagnosticsFailed.one":"1 connection check failed.","studioDiagnosticsFailed.other":"{count} connection checks failed.","studioExportNote":"Contains private household data. Not a full Mealie backup.","studioExportDownloaded":"Atelier profile downloaded. Store it securely.","studioExportFailed":"Export failed: {error}","studioDailyMorning":"Good morning. What is on the menu today?","studioDailyEvening":"Good evening. Time for something good.","studioDailyAnytime":"Your kitchen for the rest of the day.","studioDailyEyebrow":"YOUR KITCHEN ASSISTANT","studioDailyMorningLabel":"MORNING","studioDailyEveningLabel":"EVENING","studioDailyOverviewLabel":"TODAY AT A GLANCE","studioDailyExpiring":"{count} pantry items should be used soon.","studioDailyDiscover":"Explore recipes and plan at your own pace.","studioDailyPantry":"Pantry & shopping","studioDailyPlan":"What should we cook today?","studioConfirmAvailable":"Home Assistant action triggered.","studioConfirmUnavailable":"Available in Home Assistant only.","studioNoStep":"There is no cooking step to read aloud.","studioDeviceInvalid":"The device or entity is not configured correctly.","studioActionFailed":"Home Assistant action failed: {error}","studioReadUnsupported":"Text-to-speech is not supported in this browser.","studioVoiceUnsupported":"Voice commands are not supported in this browser.","studioMicrophoneError":"Microphone unavailable or permission denied.","studioVoiceUnknown":"Command not recognized: {command}","studioSpeakNoMatch":"No clear matching ingredient was found in the recipe.","studioJournalSaved":"Personal note saved.","studioSaved":"Saved in Atelier.","studioChildApproval":"An adult must explicitly approve tasks assigned to children.","studioSpeechDe":"de-DE","studioSpeechEn":"en-US","studioDiscoverTitle":"What should we cook today?","studioDiscoverLead":"A few quick choices, then we’ll find something good in your recipes.","studioDiscoverStep0":"What sounds good?","studioDiscoverStep1":"Which cookbook?","studioDiscoverStep2":"Who is joining?","studioDiscoverStep3":"What is on hand today?","studioDiscoverQuestion0":"What are you in the mood for?","studioDiscoverQuestion1":"Choose your favorite collections, or leave them all open.","studioDiscoverQuestion2":"How many people, and how much time do you have?","studioDiscoverQuestion3":"We’ll work around your day.","studioDiscoverCompass":"YOUR KITCHEN COMPASS","studioDiscoverDiet":"Eating style","studioDiscoverAny":"Anything goes","studioDiscoverVegetarian":"Vegetarian","studioDiscoverVegan":"Vegan","studioDiscoverMeat":"Meat","studioDiscoverFish":"Fish","studioDiscoverDietHint":"We match recipes by tags and recognizable ingredients. Always check recipe details yourself.","studioDiscoverCookbooks":"Your cookbooks","studioDiscoverCookbooksHint":"Choose one or more. Leave all unselected to search every recipe.","studioDiscoverCookbooksAria":"Mealie cookbooks","studioDiscoverAllRecipes":"All recipes","studioDiscoverNoCookbooks":"Cookbooks appear here when Mealie metadata is available.","studioDiscoverPeople":"People","studioDiscoverPeopleHint":"Who is joining you at the table?","studioDiscoverOneLess":"One fewer person","studioDiscoverOneMore":"One more person","studioDiscoverKidFriendly":"Kid-friendly","studioDiscoverMild":"Prefer milder dishes","studioDiscoverAnyPreference":"No preference","studioDiscoverWithKids":"With kids","studioDiscoverTime":"Time available","studioDiscoverRelaxed":"No rush","studioDiscoverPantry":"Use pantry items","studioDiscoverUsePantry":"Pantry first","studioDiscoverNoPreference":"No preference","studioDiscoverExclude":"Leave out today …","studioDiscoverOptional":"Choose anything to avoid","studioDiscoverIngredientHint":"Pantry quantities and ingredient data may be incomplete. Check them before cooking.","studioDiscoverBack":"Back","studioDiscoverNext":"Next","studioDiscoverFind":"Find ideas","studioDiscoverResult":"TONIGHT’S INSPIRATION","studioDiscoverResultTitle":"This could be just right today.","studioDiscoverEdit":"Change choices","studioDiscoverTimeOpen":"Time flexible","studioDiscoverPerson":"person","studioDiscoverPeoplePlural":"people","studioDiscoverFromCookbooks":"FROM YOUR COOKBOOKS","studioDiscoverFromRecipes":"FROM YOUR RECIPES","studioDiscoverRecipeBase":"Recipe base: {servings} servings","studioDiscoverForPeople":"For {people} people","studioDiscoverGoodIdea":"A great idea from your cookbook.","studioDiscoverOpenRecipe":"View recipe","studioDiscoverAnother":"Another idea","studioDiscoverAlsoGood":"ALSO DELICIOUS","studioDiscoverMoreIdeas.one":"1 more idea","studioDiscoverMoreIdeas.other":"{count} more ideas","studioDiscoverEmptyTitle":"The day is still wide open.","studioDiscoverEmpty":"We couldn’t find a recipe that fits these choices. Change a preference or reload your recipes.","studioDiscoverAdjust":"Adjust choices","studioDiscoverReload":"Reload recipes","studioPlanKicker":"03 / SMART WEEKLY PLANNING","studioPlanTitle":"Seven days, less waste","studioPlanDescription":"The preview favors overlapping ingredients and keeps existing dinners. Leftover meals are added only when there are enough servings.","studioPlanPreview":"Suggest a weekly plan","studioPlanCommit":"Add suggestion to Mealie","studioLunch":"Lunch","studioDinner":"Dinner","studioPlanOnlyMissing":"Only missing meals are added. Successful entries remain if another one fails.","studioPlanCreatePreview":"Create a preview first. Nothing changes in Mealie without confirmation.","studioPantryTitle":"Pantry & shopping","studioPantryLead":"A simple, manual pantry is enough. Atelier compares it with your planned meals.","studioPantryKicker":"01 / YOUR PANTRY","studioPantryQuestion":"What do you have?","studioIngredient":"Ingredient","studioAmount":"Amount","studioUnit":"Unit","studioGrams":"Grams","studioMilliliters":"Milliliters","studioPieces":"Pieces","studioPieceUnit":"pcs","studioBestBefore":"Best before","studioStaple":"Keep as a regular pantry staple","studioAdd":"Add","studioStapleLabel":"Pantry staple","studioUntil":"until {date}","studioRemove":"Remove","studioPantryEmpty":"No pantry items yet. Adding them is optional.","studioGroceryKicker":"02 / SHOPPING ASSISTANT","studioGroceryTitle":"What do you really need?","studioGroceryDescription":"Based on your planned meals. Pantry quantities are deducted only when the units clearly match.","studioGroceryCalculate":"Calculate shopping list","studioGrocerySend":"Add to Mealie list","studioQuantityCheck":"Check amount","studioGroceryPreview":"Click “Calculate shopping list” to see a preview.","studioUnclearUnits":"Unclear tablespoon/teaspoon quantities and different units are never converted automatically.","theme":"Appearance","dark":"Dark","light":"Light","density":"Spacing","compact":"Compact","comfortable":"Comfortable","accent":"Accent color","radius":"Corners","columns":"Columns","nutrition":"Nutrition","nutriTitle":"Atelier Nutrition","nutriAnalyze":"Match ingredients","nutriAi":"Suggest food search terms with AI","nutriEstimate":"Calculate nutrients","nutriSave":"Save to Mealie","nutriSearch":"Search USDA","nutriNoSource":"Select a food","nutriGrams":"Quantity in grams","nutriSource":"Data source","nutriResult":"Per serving","journal":"My cooking notes","journalSave":"Save note","journalNote":"How was it last time?","timer":"Kitchen timer","timerStart":"Start timer","timerRemove":"Remove","apply":"Apply","close":"Close","configured":"Your design is saved on this device.","backend":"Connection not configured","backendHint":"Set up Mealie Atelier Bridge in Home Assistant first.","refresh":"Refresh","loading":"Preparing your kitchen …","error":"Something went wrong.","retry":"Try again","selectRecipe":"Choose a recipe","selectList":"Choose list","saved":"Saved","created":"Recipe created","planned":"Meal planned","toMealie":"Open in Mealie","mealType":"Meal","dinner":"Dinner","lunch":"Lunch","breakfast":"Breakfast","saveNote":"Edit basic details","admin":"Manage recipes","recipeTip":"Create recipes and edit existing ones.","featured":"FROM YOUR KITCHEN","headline":"Make something delicious.","count":"Recipes","open":"Open","todayDate":"Today","nextMeal":"Planned","day":"Day","label":"List","change":"Change","importTip":"Paste the URL of a recipe for Mealie to import.","expand":"Read more","adminOnly":"Changing recipes requires a Home Assistant admin account.","emptyTip":"Use search or create a new recipe.","markComplete":"Mark completed","addListFirst":"Create your first shopping list.","offline":"Could not load data.","createList":"New list","listName":"Shopping list name","shoppingFromRecipe":"Get ingredients","shoppingAddRecipe":"Add ingredients","shoppingAdded":"Ingredients added to list","editSteps":"Edit cooking instructions","editIngredients":"Replace ingredients","editStepsHint":"One step per paragraph, separated by a blank line.","editIngredientsHint":"One ingredient per line. Warning: replacing ingredients removes linked foods and units.","servingsNumber":"Servings (number)","applySteps":"Replace steps","applyIngredients":"Replace ingredients","resetDesign":"Reset design","pictures":"Show recipe images","todayIntro":"Your kitchen today.","todaySub":"Today’s meals and everything you still need.","toShopping":"View shopping list","plannedForToday":"Planned today","noSteps":"No cooking instructions added yet.","allMeals":"All dishes","successList":"List created","addFromRecipeTip":"Mealie adds all recipe ingredients to your chosen shopping list.","ingredientExperimental":"Ingredient replacement is disabled by default. Enable it in Bridge settings only after backing up Mealie.","readOnly":"Read-only mode","readOnlyHint":"Editing is disabled for this kitchen dashboard.","adminOnlyHint":"Recipe management requires administrator access.","studioDiscoverStepProgress":"Step {step} of 4","ingredientMushrooms":"Mushrooms","ingredientOlives":"Olives","ingredientCilantro":"Cilantro","ingredientBellPepper":"Bell pepper","ingredientHeat":"Spicy food","ingredientTomatoes":"Tomatoes","familyTitle":"Cook together","familyLead":"Shared cooking progress with optional helper tasks and approval from an adult.","familyAdultMode":"Adult view","familyHelperMode":"Simple helper view","familySync":"Refresh live status","familyTeam":"01 / THE TEAM","familyWhoHelps":"Who is helping?","familyName":"Name","familyChild":"Child (approved tasks only)","familyAddMember":"Add person","familyHelper":"Helper mode","familyRemoveMember":"Remove person","familyNoMembers":"No family members yet.","familySession":"02 / SHARED COOKING SESSION","familyNoSession":"No active session","familyStep":"Shared step {step} · started {date}","familyBack":"Back","familyNext":"Next step","familyEnd":"End session","familyOpenCook":"Open cooking mode","familyTimers":"Shared timers","familyNoTimers":"No shared timers yet","familyTimerName":"Label","familyMinutes":"Minutes","familySetTimer":"Set timer","familyTasks":"Helper tasks","familyMarkOpen":"Mark as open: {task}","familyMarkDone":"Mark as done: {task}","familyNoTasks":"No tasks assigned yet.","familyTask":"Task","familyTaskPlaceholder":"e.g. wash the vegetables","familyAssign":"Assign to","familyApproval":"I reviewed and approved this task","familyAssignTask":"Assign task","familySafety":"The child view simplifies the interface but does not restrict access. Adults remain responsible for supervision and safe device use.","familyStartHint":"Open a recipe and start cooking mode. A shared session starts when editing is allowed.","familyBrowse":"Browse recipes","cookbookTitle":"Your own cookbook","cookbookLead":"Choose favorite recipes. Atelier lays out a cover, contents, and A4 recipe pages in one print-ready view.","cookbookSelectKicker":"01 / CHOOSE RECIPES","cookbookCollection":"Your collection","cookbookLoad":"Load recipe details","cookbookSelectAll":"Select all visible","cookbookClear":"Clear selection","cookbookEmpty":"No recipes loaded yet","cookbookLoadHint":"Load recipe details to build your own cookbook.","cookbookBookKicker":"02 / YOUR BOOK","cookbookSelected.one":"1 recipe selected","cookbookSelected.other":"{count} recipes selected","cookbookTitleLabel":"Book title","cookbookTitleDefault":"Our favorite recipes","cookbookSubtitleLabel":"Subtitle","cookbookSubtitleDefault":"Good food. Every day.","cookbookPhotos":"Print recipe photos","cookbookPrint":"Cookbook PDF / print preview","cookbookPrintHint":"Use “Save as PDF” in your browser. Each recipe starts on a new A4 page; very long recipes may flow onto extra pages.","printPreparing":"Laying out your cookbook …","printDocumentTitle":"Mealie Atelier · Cookbook","printSavePdf":"Save as PDF / Print","printCollection":"RECIPE COLLECTION","printMadeWithLove":"MADE WITH LOVE","creditMadeWith":"Made with","creditBy":"by","printContents":"CONTENTS","printRecipes":"The recipes.","printRecipe":"RECIPE {number} / {total}","printIngredients":"INGREDIENTS","printPreparation":"METHOD","printServings.one":"1 serving","printServings.other":"{count} servings","studioMinutesShort":"min","studioOven":"Oven","studioReadStepLabel":"Read step aloud","studioVoiceCommandLabel":"Voice command","studioReplacementLabel":"Ingredient alternatives","studioCookingLight":"Cooking light","studioLowerMusic":"Lower music","studioSpeakerLabel":"Play on speaker","studioSharedFamily":"Synced with family","studioSharedTimer":"shared","studioRecipeAuditTitle":"Recipe check: {score}/100","studioRecipeAuditNone":"No obvious structure issues found.","studioRecipeAuditAll":"All notes","studioAICheck":"Review with AI","studioAiSuggestionTitle":"AI suggestions (review only)","studioLocalAlternativeNone":"No verified local alternative found.","studioAiOptional":"AI is optional and requires an API key.","studioReplaceTitle":"Replace an ingredient","studioReplaceBody":"Which ingredient would you like to replace? Suggestions are not verified one-to-one substitutes.","studioShowAlternatives":"Show alternatives","studioAiAuditTitle":"Start AI recipe review?","studioAiAuditBody":"This recipe’s ingredients, amounts, and steps will be sent to your configured AI provider. Nothing will be changed automatically.","studioAiConsent":"Send data and review","studioAiStarting":"Starting AI recipe review …","studioAiUnavailable":"AI review unavailable: {error}","studioAuditTitle":"Recipe quality check · {score}/100","studioAuditNone":"No obvious structure issues.","studioAuditDisclaimer":"This check flags basic structure issues, not culinary mistakes.","studioSessionReplaceTitle":"Replace the shared cooking session?","studioSessionReplaceBody":"“{name}” is currently active. Replacing it will end its shared timers and tasks. Cancel to start the new recipe locally only.","studioSessionReplaceConfirm":"Replace session","studioOnlyHomeAssistant":"Available in Home Assistant only.","studioSpeechStartFailed":"Speech recognition could not start.","studioIngredientNoMatch":"I could not find a clear matching ingredient in this recipe.","studioSubstituteError":"No verified local alternative found. AI is optional and requires an API key. {error}","studioRecipeAuditDisclaimer":"Basic structure check · not a culinary review","studioDeletePantryTitle":"Remove pantry item?","studioDeletePantryBody":"This item will be removed from your Atelier pantry.","familyRemoveConfirmTitle":"Remove person?","familyRemoveConfirmBody":"This person will be removed from family cooking. Complete or remove their existing helper tasks first.","familyEndConfirmTitle":"End shared cooking?","familyEndConfirmBody":"This ends the session timers and helper tasks. Personal recipe notes remain.","studioWeekConfirmTitle":"Add weekly plan?","studioWeekConfirmBody.one":"1 meal will be added. Existing entries will stay unchanged.","studioWeekConfirmBody.other":"{count} meals will be added. Existing entries will stay unchanged.","studioWeekConfirmAction":"Add to Mealie","studioWeekSuccess.one":"1 meal added.","studioWeekSuccess.other":"{count} meals added.","studioWeekFailure":"Errors: {errors}","studioShoppingTransferTitle":"Transfer shopping items?","studioShoppingTransferBody.one":"1 item will be added to your Mealie shopping list.","studioShoppingTransferBody.other":"{count} items will be added to your Mealie shopping list.","studioShoppingTransferConfirm":"Add to shopping list","studioShoppingUncertain":"Check amount","studioShoppingSuccess.one":"1 item added.","studioShoppingSuccess.other":"{count} items added.","studioShoppingFailure":"Failed: {items}","studioPopupBlocked":"Allow pop-ups to open the print preview.","studioAdultApprovalRequired":"An adult must explicitly approve tasks assigned to children.","cookbookTitleDefaultPrint":"Our recipes","studioJournalSavedToast":"Personal note saved.","providerTitle":"Recipe studio without the Atelier Bridge","providerDescription":"Home Assistant’s built-in Mealie integration supports recipe search and cooking here. Add the optional Atelier Bridge for planning, shopping, cookbooks, photos, and editing.","providerBrowse":"Browse recipes","studioJournalLocal":"Stored only on this device, not synced to Mealie.","studioJournalShared":"Saved in your Atelier profile for your connected devices.","editorConnectKitchen":"Connect kitchen","editorChooseYourStart":"Choose your start","editorSetTheMood":"Set the mood","editorSetupProgress":"Setup progress","editorCheckingHomeAssistantConnections":"Checking Home Assistant connections…","editorCouldNotCheckYourConnections":"Could not check your connections","editorCheckThatMealieAtelierBridgeIsInstalledAndHomeAssistantIsOnline":"Check that Mealie Atelier Bridge is installed and Home Assistant is online.","editorTryAgain":"Try again","editorOpenHomeAssistantIntegrations":"Open Home Assistant integrations","editorHomeAssistantMealieFound":"Home Assistant Mealie found","editorDirectConnectionReadOnlyRecipes":"Direct connection · read-only recipes","editorREADY":"READY","editorRecipeSearchAndCookingWorkWithoutAtelierBridgeProtectedPhotosEditingShoppingAndPlanningStayOptionalBridgeFeatures":"Recipe search and cooking work without Atelier Bridge. Protected photos, editing, shopping and planning stay optional Bridge features.","editorMealieInstance":"Mealie instance","editorYourMealieConnection":"Your Mealie connection","editorChooseAConnectedKitchen":"Choose a connected kitchen…","editorYourAPITokenStaysSafelyInsideTheHomeAssistantIntegration":"Your API token stays safely inside the Home Assistant integration.","editorConnectMealieOnceInHomeAssistant":"Connect Mealie once in Home Assistant","editorAddMealieAtelierBridgeForTheFullStudioOrUseHomeAssistantSBuiltInMealieIntegrationForAReadOnlyRecipeCardCredentialsAreEnteredSecurelyInHomeAssistantNeverInThisCard":"Add Mealie Atelier Bridge for the full studio, or use Home Assistant’s built-in Mealie integration for a read-only recipe card. Credentials are entered securely in Home Assistant, never in this card.","editorIConnectedMealieCheckAgain":"I connected Mealie: check again","editorConnectedSecurely":"Connected securely","editorNoCredentialsInDashboardCards":"No credentials in dashboard cards","editorYourCredentialsBelongInTheSecureIntegrationNeverInThisCard":"Your credentials belong in the secure integration, never in this card.","editorACompleteKitchenOverview":"A complete kitchen overview","editorTodaySMealsAndKitchenTasks":"Today’s meals and kitchen tasks","editorPersonalRecipeInspiration":"Personal recipe inspiration","editorYourCompleteRecipeCollection":"Your complete recipe collection","editorTheWeeklyMealPlan":"The weekly meal plan","editorIngredientsYouAlreadyHave":"Ingredients you already have","editorYourShoppingList":"Your shopping list","editorCookingTogetherAsAFamily":"Cooking together as a family","editorYourSavedCookbooks":"Your saved cookbooks","editorRecipeAndKitchenTools":"Recipe and kitchen tools","editorSTEP1CONNECTION":"STEP 1 · CONNECTION","editorBringYourKitchenTogether":"Bring your kitchen together.","editorAtelierReadsRecipesFromTheMealieConnectionAlreadyConfiguredInHomeAssistant":"Atelier reads recipes from the Mealie connection already configured in Home Assistant.","editorSTEP2YOURKITCHEN":"STEP 2 · YOUR KITCHEN","editorWhatShouldOpenFirst":"What should open first?","editorPickAStartingPointEveryOtherViewStaysOneTapAway":"Pick a starting point. Every other view stays one tap away.","editorStartIn":"Start in","editorYOURATELIEROPENSTO":"YOUR ATELIER OPENS TO","editorSTEP3THEFEEL":"STEP 3 · THE FEEL","editorMakeItFeelLikeYourKitchen":"Make it feel like your kitchen.","editorChooseALookNowYouCanFineTuneEveryDetailLater":"Choose a look now. You can fine-tune every detail later.","editorChooseAnAppearance":"Choose an appearance","editorEveningStudio":"Evening studio","editorDeepGreenWarmLightEditorial":"Deep green · stone light · editorial","editorDaylightKitchen":"Daylight kitchen","editorFreshSurfacesOpenAndBright":"Fresh surfaces · open and bright","editorYourRecipesAndMealieDataAreNeverChangedByTheseChoices":"Your recipes and Mealie data are never changed by these choices.","editorAKitchenThatFeelsLikeYours":"A kitchen that feels like yours.","editorThreeSmallChoicesYourKitchenReady":"Three small choices. Your kitchen, ready.","editorSetUpLater":"Set up later","editorSetupNavigation":"Setup navigation","editorBack":"Back","editorContinue":"Continue","editorCreateMyKitchen":"Create my kitchen","editorACalmStartTheAdvancedSettingsAreHereWheneverYouNeedThem":"A calm start. The advanced settings are here whenever you need them.","editorConfigureYourCardVisuallySettingsAreSavedWithYourHomeAssistantDashboard":"Configure your card visually. Settings are saved with your Home Assistant dashboard.","editorRunSetupWizard":"Run setup wizard","editorYourKitchenIsReady":"Your kitchen is ready.","editorBasics":"Basics","editorChooseContentAndTheConnectedMealieInstance":"Choose content and the connected Mealie instance.","editorMode":"Mode","editorMealieAccount":"Mealie account","editorFirstConnectedAccount":"First connected account","editorDataConnection":"Data connection","editorAutomaticAtelierFirst":"Automatic · Atelier first","editorAtelierBridgeFullFeatures":"Atelier Bridge · full features","editorHomeAssistantMealieReadOnly":"Home Assistant Mealie · read-only","editorTheBuiltInOptionNeedsNoAtelierServerOrCardTokenRecipeSearchAndCookingAreReadOnlyTheBridgeAddsImagesAndKitchenTools":"The built-in option needs no Atelier server or card token. Recipe search and cooking are read-only; the Bridge adds images and kitchen tools.","editorBuiltInMealieInstance":"Built-in Mealie instance","editorLanguage":"Language","editorAutomatic":"Automatic","editorLookFeel":"Look & feel","editorTypographyMotionAndTheVisualRhythmOfYourCards":"Typography, motion and the visual rhythm of your cards.","editorTheme":"Theme","editorDark":"Dark","editorLight":"Light","editorDensity":"Density","editorComfortable":"Comfortable","editorCompact":"Compact","editorMotionTransitions":"Motion & transitions","editorExpressive":"Expressive","editorSubtle":"Subtle","editorOff":"Off","editorYourReducedMotionSystemPreferenceAlwaysTakesPriority":"Your reduced-motion system preference always takes priority.","editorColumns":"Columns","editorAccent":"Accent","editorCornerStyle":"Corner style","editorRounded":"Rounded","editorSoft":"Soft","editorSquareEckig":"Square","editorFoodPhotographyCrop":"Food photography crop","editorPortraitEditorial":"Portrait · editorial","editorSquareQuadrat":"Square","editorWide":"Wide","editorShowRecipeImages":"Show recipe images","editorOptionalPrintAndKitchenSettings":"Optional print and kitchen settings","editorPrintStudio":"Print studio","editorPremiumA4LayoutsForRecipesAndLists":"Premium A4 layouts for recipes and lists.","editorPrintTemplate":"Print template","editorInkSaver":"Ink saver","editorPrintRecipePhotosWhenAvailable":"Print recipe photos when available","editorPrintCheckboxes":"Print checkboxes","editorPrintCompletedItems":"Print completed items","editorPrintStoredNutritionValues":"Print stored nutrition values","editorPrintHandwritingSpace":"Print handwriting space","editorKitchenTablet":"Kitchen & tablet","editorOptionalHomeAssistantActionsNothingTriggersAutomatically":"Optional Home Assistant actions. Nothing triggers automatically.","editorUseEnlargedTabletLayout":"Use enlarged tablet layout","editorOptionalKitchenSceneHA":"Optional kitchen scene (HA)","editorOnlyTriggeredWhenYouTapTheCookingCockpitButton":"Only triggered when you tap the Cooking Cockpit button.","editorOptionalMediaPlayerHA":"Optional media player (HA)","editorCookingVolume":"Cooking volume","editorOptionalTTSEngineHA":"Optional TTS engine (HA)","editorUseAHomeAssistantEntityAllOptionalDeviceActionsAreDisabledByDefault":"Use a Home Assistant entity. All optional device actions are disabled by default.","editorDashboardModeContainsTheCompleteKitchenDeviceSpecificChangesAreAvailableHereInTheDesignStudio":"Dashboard mode contains the complete kitchen. Device-specific changes are available here in the Design Studio.","uiFindYourNextFavorite":"Find your next favorite","uiSearchRecipesIngredientsOrViews":"Search recipes, ingredients, or views …","uiSearchRecipesIngredientsAndQuickActions":"Search recipes, ingredients and quick actions","uiSearchYourRecipesIncludingByIngredient":"Search your recipes, including by ingredient.","uiYOURKITCHEN":"YOUR KITCHEN","uiNavigation":"Navigation","uiNoMatchingViewsOrActions":"No matching views or actions.","uiSelect":"Select","uiOpen":"Open","uiClose":"Close","uiPrintPDF":"Print / PDF","uiProtein":"Protein","uiCarbs":"Carbs","uiFat":"Fat","uiStep":"Step","uiKitchenTimers":"Kitchen timers","uiATELIERKITCHENTIMER":"ATELIER · KITCHEN TIMER","uiKeepEverythingInRhythm":"Keep everything in rhythm","uiactive":"active","uitimeRemaining":"time remaining","uiminutes":"minutes","uiActiveTimer":"Active timer","uiREADY":"READY","uiRUNNING":"RUNNING","uiNoTimerRunningYetSetOneToKeepEverythingInRhythm":"No timer running yet. Set one to keep everything in rhythm.","uiQuickTimerPresets":"Quick timer presets","uimin":"min","uiMinutes":"Minutes","uiTimerDurationInMinutes":"Timer duration in minutes","uiLabelOptional":"Label · optional","uieGOven":"e.g. Oven","uiStartTimer":"Start timer","uiOneStepAtATimeYouCanAlwaysReturnToTheFullRecipe":"One step at a time. You can always return to the full recipe.","uiPlanMealsQuicklyWithoutClutter":"Plan meals quickly, without clutter.","uiStartWithARecipeTitleAddDetailsAfterCreating":"Start with a recipe title. Add details after creating.","uieGLemonPastaWithSpinach":"e.g. Lemon pasta with spinach","uiPasteARecipeLinkMealieHandlesImportingIt":"Paste a recipe link. Mealie handles importing it.","uiEditRecipe":"Edit recipe","uiDetailsIngredientsAndInstructionsInOneClearWorkflow":"Details, ingredients and instructions in one clear workflow.","uiYourRecipeTitleSummaryAndServingSize":"Your recipe title, summary and serving size.","uiWhatMakesThisSpecial":"What makes this special?","uiShownInRecipesAndPrint":"Shown in recipes and print.","uiLinkedFoodsAndUnitsStayProtectedTheIngredientsCanBePrinted":"Linked foods and units stay protected; the ingredients can be printed.","uiEditAddAndReorderStepsReplacementMustBeExplicitlyEnabled":"Edit, add and reorder steps. Replacement must be explicitly enabled.","uiReplaceCookingInstructions":"Replace cooking instructions","uiAddAStep":"Add a step","uiStepsAreReplacedOnSaveIfTheCheckboxIsSelected":"Steps are replaced on save if the checkbox is selected.","uiChangesAreSentToMealieOnlyWhenYouSave":"Changes are sent to Mealie only when you save.","uiGiveYourShoppingListAName":"Give your shopping list a name.","uieGWeeklyGroceries":"e.g. Weekly groceries","uiMotionTransitions":"Motion & transitions","uiThoughtfulMotionThatHelpsNavigationYourReducedMotionDeviceSettingAlwaysTakesPriority":"Thoughtful motion that helps navigation. Your reduced-motion device setting always takes priority.","uiExpressive":"Expressive","uiSubtle":"Subtle","uiOff":"Off","uiPhotoCrop":"Photo crop","uiTall":"Tall","uiSquare":"Square","uiWide":"Wide","uiCornerStyle":"Corner style","uiRound":"Round","uiSoft":"Soft","uiSquareEckig":"Square","uiSeparateA4LayoutsForRecipesShoppingAndYourWeeklyPlan":"Separate A4 layouts for recipes, shopping and your weekly plan.","uiOpenPrintSettings":"Open print settings","uiEnjoyingTheAtelier":"Enjoying the Atelier?","uiIfItMakesYourKitchenRoutineBetterYouCanOptionallySupportItsDevelopmentOnKoFi":"If it makes your kitchen routine better, you can optionally support its development on Ko-fi.","uiSayThanksOnKoFi":"Say thanks on Ko-fi","uiQuickActions":"Quick actions","uiPrintStudioSettings":"Print Studio · Settings","uiUpTo500MatchesThroughHomeAssistantPhotosAndAtelierWriteFeaturesStayDisabledForSecurity":"Up to 500 matches through Home Assistant. Photos and Atelier write features stay disabled for security.","uiMarkComplete":"Mark complete: ","uiPrint":"Print","uiSwipeToBrowseAllSevenDays":"Swipe to browse all seven days.","uiAllowPopupsToOpenThePrintPreview":"Allow popups to open the print preview.","uiCalories":"Calories","uiCarbohydrates":"Carbohydrates","uiNutrientValuesComeFromFoodDataNotAIGuessesReviewAllWeightsAndMatches":"Nutrient values come from food data, not AI guesses. Review all weights and matches.","uiFoodsMatched":"Foods matched","uiUSDAAPIKeyNotConfiguredAddItInIntegrationSettingsOrEnv":"USDA API key not configured. Add it in integration settings or .env.","uiThisRecipeAlreadyHasNutritionDataExplicitApprovalIsRequiredToReplaceIt":"This recipe already has nutrition data. Explicit approval is required to replace it.","uiSendsIngredientTextToAIProviderNoInventedMacros":"Sends ingredient text to the AI provider (OpenAI or Anthropic); no invented macros.","uiOptionalConfigureAIAPIKey":"Optional: configure an AI API key (OpenAI or Anthropic)","uiREVIEWINGREDIENTS":"REVIEW INGREDIENTS","uiNotMatched":"Not matched","uiFoodSearchQuery":"Food search query","uiFindFood":"Find food","uiNoCompleteNutritionEntriesFoundTryAnotherQuery":"No complete nutrition entries found. Try another query.","uiBasedOnSelectedUSDAEntriesPer100gCookingYieldsAndMissingNutrientsAffectAccuracyValuesAreEstimates":"Based on selected USDA entries per 100g; cooking yields and missing nutrients affect accuracy. Values are estimates.","uiSourcesCoverage":"Sources & coverage","uiExplicitlyReplaceExistingNutritionValues":"Explicitly replace existing nutrition values","uiYourPersonalCookingNotesStoredOnlyOnThisDeviceNotSyncedToMealie":"Your personal cooking notes. Stored only on this device, not synced to Mealie.","uiHowDidItTurnOut":"How did it turn out?","uiNotRated":"Not rated","uiNextTimeReduceTheSalt":"Next time, reduce the salt …","editorPreviewDashboard":"Your kitchen at a glance","editorPreviewToday":"Tonight on the table","editorPreviewDiscover":"Fresh ideas for dinner","editorPreviewRecipes":"Recipes you love","editorPreviewMealplan":"This week’s menu","editorPreviewPantry":"What is already in","editorPreviewShopping":"On your shopping list","editorPreviewFamily":"Better together","editorPreviewCookbook":"Your cookbooks","editorPreviewManage":"Your kitchen studio","uiRememberAsFavoriteRecipe":"Remember as a favorite recipe","uiScaleServingsNote":"Amounts adjusted for {target} servings. Recipe base: {base} servings. Clear quantities are scaled; please check free-text amounts.","uiRecipeStepImageAlt":"Image for step {step}","uiMarkShoppingOpen":"Mark as open: {item}","uiMarkShoppingComplete":"Mark complete: {item}","uiServing.one":"serving","uiServing.other":"servings","uiThisFeatureRequiresMealieAtelierBridge":"This feature requires Mealie Atelier Bridge.","uiHomeAssistantSMealieIntegrationWithRecipeSearchIsUnavailable":"Home Assistant’s Mealie integration with recipe search is unavailable.","uiChooseAValidMealieInstance":"Choose a valid Mealie instance.","uiHomeAssistantReturnedNoRecipe":"Home Assistant returned no recipe.","uiEveryDay":"Every day","uiDescribeThisStep":"Describe this step …","uiMoveUp":"Move up","uiMoveDown":"Move down","uiRemoveStep":"Remove step","uiRemove":"Remove","uiMealieReadOnly":"Mealie · read-only","uiRecipesCookingPhotosAndEditsNeedAtelierBridge":"Recipes & cooking · Photos and edits need Atelier Bridge","uiKitchenTimer":"Kitchen timer","uiAISuggestedSearchTermsReviewEveryDatabaseMatchYourself":"AI suggested search terms. Review every database match yourself.","uiNutritionSavedToMealie":"Nutrition saved to Mealie","uiCalculatedReviewBeforeSaving":"Calculated. Review before saving.","uiBonAppetitEnjoyYourMeal":"Bon appétit! Enjoy your meal.","uiTypeAtLeastOneMoreCharacter":"Type at least one more character.","uiSearchingYourRecipes":"Searching your recipes …","uiNoRecipeFoundYet":"No recipe found yet","uiTryAnotherRecipeNameOrIngredient":"Try another recipe name or ingredient.","uiSearchIsUnavailableRightNow":"Search is unavailable right now","uiIngredient":"Ingredient","uiRecipeName":"Recipe name","uiNameIngredient":"Name & ingredient","uiRecipeMatch":"Recipe match","uiMATCHINGRECIPES":"MATCHING RECIPES","uiresults":"results","uiRecipeResults":"Recipe results","uiNoteSavedOnThisDevice":"Note saved on this device","uiOpenQuickActions":"Open quick actions ({shortcut})","uiSeeAllResults":"See all {count} results","uiConversion":"Kitchen conversion","uiConversionNeedsDensity":"Mass and volume need an ingredient-specific density. Atelier will not guess it.","uiConversionExactFactors":"Converted with standard unit factors. Recipe amounts are not changed.","uiSearchConversionExample":"Try: 250 g to oz","uiPrintHeroTitle":"Make it beautiful on paper.","uiPrintHeroDescription":"A dedicated, carefully typeset print layout. Your browser can save it as a PDF.","uiPrintStyle":"STYLE","uiPrintEditorial":"Editorial","uiPrintEditorialDescription":"Elegant, spacious typography","uiPrintCompact":"Compact","uiPrintCompactDescription":"Save room without sacrificing legibility","uiPrintInkSaver":"Ink saver","uiPrintInkSaverDescription":"Black ink and no photos","uiPrintDetails":"CUSTOMIZE DETAILS","uiPrintIncludePhoto":"Include recipe photo (if available)","uiPrintIncludeNutrition":"Include nutrition from Mealie (if present)","uiPrintIncludeCompleted":"Also print completed items","uiPrintIncludeCheckboxes":"Include checkboxes","uiPrintIncludeNotes":"Include room for notes","uiPrintOpenPreview":"Open print / PDF preview","uiPrintGuide":"Choose A4 and 100% scale in the browser. For the weekly plan, A4 landscape is selected automatically.","uiPrintPaperPreview":"PAPER PREVIEW","uiYourRecipe":"Your recipe","uiPrintPreviewDescription":"Thoughtfully laid out. Ready to print.","uiPrintIngredientsItems":"INGREDIENTS / ITEMS","uiPrintPreparationNotes":"PREPARATION / NOTES","uiPrintDesignedForPaper":"DESIGNED FOR PAPER","offlinePanelLabel":"Offline sync and kitchen timers","offlineSyncTimers":"Sync & kitchen timers","offlineLoading":"Loading status","offlineShopping":"Offline shopping","offlineStorageNote":"Changes stay on this device until they are safely synced with Mealie.","offlineEnable":"Enable offline mode","offlineSyncNow":"Sync now","offlineReviewConflicts":"Review conflicts","offlineBackgroundTimers":"Background timers","offlineCheckingDelivery":"Checking delivery channel","offlineAllowPush":"Allow push","offlineRefreshTimers":"Refresh timers","offlineConflictToggle":"Checklist conflict","offlineConflictList":"Shopping-list conflict","offlineReviewCurrentList":"Check the current Mealie list.","offlineDiscardChange":"Discard change","offlinePlanned":"Scheduled: {time}","offlineStopTimer":"Stop timer","offlineDisabled":"Offline shopping is off","offlineStatus":"{connection} · {pending} pending{conflicts}{syncing}","offlineConflictCount":" · {count} conflict(s)","offlineSyncing":" · Syncing","offlineClearLocal":"Clear local data","offlineHomeAssistantActive":"Home Assistant active","offlinePushConfigured":"Web Push configured (permission required)","offlineNoAlarmChannel":"No alarm channel configured","offlinePushReady":"Push enabled","offlineEnableConfirmTitle":"Enable offline shopping?","offlineEnableConfirmBody":"Shopping lists and pending changes will be stored on this device. Avoid enabling this on public devices.","offlineDeleteConfirmTitle":"Delete offline data?","offlineDeleteConfirmBody":"Local shopping lists and unsynced changes will be permanently deleted.","offlineDeleteConfirmAction":"Delete data","offlineEnableConfirmAction":"Enable offline mode","offlinePushSetup":"Set up push notifications","offlineEnableHelp":"Enable offline shopping","offlineAlarmError":"Kitchen timer notification error","uiBackgroundTimerEnabled":"Background timer enabled","uiLocalTimerEnabled":"Local timer enabled only","uiBackgroundTimerError":"Background timer was not enabled: {error}","uiTimerStopError":"Could not stop the timer: {error}","dialogWeeklyMenu":"WEEKLY MENU","dialogYourMenu":"YOUR MENU","dialogPlanned":"PLANNED","dialogNewRecipe":"NEW RECIPE","dialogRecipeTitle":"RECIPE TITLE","dialogSource":"SOURCE","dialogRecipeStudio":"RECIPE STUDIO","dialogBasics":"BASICS","dialogStepByStep":"STEP BY STEP","offlineNoSnapshot":"No offline copy yet. Open the shopping list once while online.","offlineNotEnabled":"Enable offline shopping from the status bar first.","offlineListNeedsRefresh":"Load the shopping list while connected first.","offlineRequiresConnection":"This action requires an internet connection.","offlineItemNotEditable":"This item cannot be edited offline.","offlineInvalidItem":"The item or shopping list is invalid.","offlinePushKeysMissing":"Web Push server keys are missing.","offlinePushRequiresHttps":"Web Push requires HTTPS and a supported browser.","offlinePushPermissionDenied":"Notifications were not allowed.","offlineAlarmRequiresServer":"A background alarm cannot be enabled without a server connection.","offlineUnexpectedError":"The offline action could not be completed. Please try again.","printDocRecipe":"RECIPE","printDocShoppingList":"SHOPPING LIST","printDocWeeklyPlan":"WEEKLY PLAN","printDocTotalTime":"Total time","printDocMinAbbr":"min","printDocCloseWindow":"Close window","printDocFromYourKitchen":"From your kitchen","printDocNoItems":"No entries yet","printDocYourWeeklyPlan":"Your weekly menu","printDocMeals":"Meals","printDocListed":"Completed","printDocNutritionCaution":"Per serving only when recorded that way; verify portion size","printDocYield":"Yield","printDocSide":"Side","printDocDessert":"Dessert","printDocDrink":"Drink","printDocSnack":"Snack","printDocCalories":"Calories","printDocProtein":"Protein","printDocCarbs":"Carbs","printDocFat":"Fat","printDocFiber":"Fiber","printDocSugar":"Sugar","studioReasonPantryCovered":"{covered}/{total} ingredients covered by quantity","studioReasonPantryUnchecked":"Pantry not checked yet","studioReasonAmountsUnclear.one":"1 amount unclear","studioReasonAmountsUnclear.other":"{count} amounts unclear","studioReasonFamilyFriendly":"Marked family friendly","studioReasonServingsBase":"Recipe base: {servings} servings","studioReasonServingsOpen":"Servings not set","studioReasonWithinBudget":"{minutes} min within the time budget","studioReasonOverBudget":"{minutes} min, slightly over the time budget","studioReasonSharedIngredients":"shared ingredients","studioReasonTwoMeals":"Servings for two meals","studioLeftoversName":"Leftovers: {name}","studioAisleChilled":"Chilled","studioAislePantry":"Pantry and grains","studioAisleSpices":"Spices and oils","studioAisleProtein":"Protein","studioAisleProduce":"Produce and other","studioAuditNoIngredients":"No ingredients on file","studioAuditNoSteps":"No preparation steps on file","studioAuditAmountUnclear":"Amount unclear: {item}","studioAuditAmountLarge":"Unusually large amount: {item}","studioAuditServingsInvalid":"Servings missing or invalid","studioAuditTimeMissing":"Total time missing","studioAuditDuplicate":"Possible duplicate entry: {item}","studioSwapCream":"Oat cooking cream","studioSwapButter":"Plant margarine or olive oil","studioSwapEgg":"Flax egg (works in some doughs)","studioSwapMilk":"Oat drink","studioSwapMushroom":"Zucchini or eggplant","studioSwapQuark":"Plant-based quark alternative","studioSwapParmesan":"Nutritional yeast or a vegan hard cheese alternative","studioSwapFlour":"Another suitable flour, check the texture","studioSwapSugar":"Maple syrup (adjust the liquid)","studioSwapWarning":"Text suggestion, not a tested 1:1 replacement. Check allergens and texture yourself.","studioNoPlannedIngredients":"No planned dishes with retrievable ingredients.","studioCreateShoppingListFirst":"Please create a shopping list in Mealie first.","uiMealieRecipeFallback":"Mealie recipe","itemFallback":"Item","recipeFallback":"Recipe","navKitchenLabel":"Kitchen navigation","uiHomeAssistantNotReady":"Home Assistant connection is not ready","uiAiSuggestionCountMismatch":"Unexpected AI suggestion count","uiExperimentalBadge":"EXPERIMENTAL","nutriGramsPlaceholder":"e.g. 200","studioRecipeFetchFailed.one":"1 recipe could not be loaded and was skipped: {names}","studioRecipeFetchFailed.other":"{count} recipes could not be loaded and were skipped: {names}","uiProviderResultsTruncated":"Showing the first {limit} matches. Results may be incomplete. Use the Mealie Atelier Bridge to browse your full library.","uiKeepScreenAwake":"Keep screen awake while cooking","uiMutationFailed":"Could not save: {error} Your change was undone.","uiSaving":"Saving…","uiNoWriteGrant":"Your Home Assistant user may view this kitchen but not change it. An administrator can grant access in the Mealie Atelier options.","uiNoWriteGrantWeb":"You are signed in with read access. An administrator can give your account the writer role.","errNotConfigured":"Mealie Atelier is not set up yet.","errInvalidRequest":"That request was not valid. Check your input and try again.","errMealieAuth":"Mealie refused the access token. Check the token in the settings.","errMealieError":"Mealie is unreachable or answered unexpectedly. Try again in a moment.","errAiError":"The AI provider did not answer or sent an unusable answer. Check the API key and try again.","errReadOnly":"This kitchen is in read-only mode, so nothing can be changed.","errUnauthorized":"This action needs administrator access.","errWriteNotPermitted":"You do not have permission to change data in this kitchen.","errConflict":"Someone else changed this meanwhile. Reload and try again.","errRecipeChanged":"The recipe changed elsewhere. Reload it before saving.","errDisabled":"This feature is switched off in the settings.","errUseStructuredEditor":"Edit ingredients with the structured ingredient editor.","errWriteUnverified":"Mealie accepted the change but the saved recipe looks different. Check the recipe before retrying.","errBackupFailed":"The backup could not be written, so nothing was changed.","errBackupNotFound":"That backup no longer exists.","errUploadInvalid":"The photo was rejected. Use a JPEG, PNG or WebP image within the size limit.","errUploadExpired":"The upload expired. Start it again.","errUploadBusy":"Too many uploads are open. Wait a moment and try again.","errStepNotFound":"That step no longer exists. Reload the recipe.","errSyncRuleNotFound":"This sync rule no longer exists. Reload the status and try again.","errSyncDestinationUnsupported":"This list cannot be used as a destination. Choose a to-do list that supports adding items and is not a Mealie list.","errSyncSourceTaken":"Another rule already uses this source list. Edit that rule instead.","errSyncTooManyRules":"You can have at most 5 sync rules. Delete one first.","errSyncNotActivated":"This rule has not sent its first batch yet. Confirm the first batch in the setup first.","errSyncNotSupported":"Shopping sync needs Home Assistant with the Mealie Atelier Bridge.","editorIngredientsLocked":"Structured ingredient editing is switched off. Ask an administrator to enable it.","editorQuantity":"Quantity","editorUnit":"Unit","editorFood":"Food","editorNote":"Note","editorOriginal":"Original text","editorAddIngredient":"Add ingredient","editorMoveUp":"Move ingredient {row} up","editorMoveDown":"Move ingredient {row} down","editorRemoveRow":"Remove ingredient {row}","editorCreateOption":"Create “{text}”","editorCreatedExisting":"Already existed, linked","editorQuantityInvalid":"Use a number such as 1,5, 1 1/2 or ½.","editorServingsPreview.one":"Preview for 1 serving","editorServingsPreview.other":"Preview for {count} servings","editorServingsReset":"Reset preview","editorServingsNote":"Preview only. Nothing is saved.","editorScaled":"Scaled","editorSaveSummary":"{changed} changed, {added} added, {removed} removed","editorSaveIngredients":"Review and save ingredients","editorConfirmSave":"Save ingredients","editorNoChanges":"Nothing has changed yet.","editorCancel":"Cancel","editorLoading":"Loading ingredients…","editorRow":"Ingredient {row}","editorComboSearching":"Searching…","editorComboEmpty":"No matches","editorReloadChanged":"This recipe changed elsewhere. Reload and reapply your changes. Reloading discards your draft.","editorReload":"Discard draft and reload","editorSavedWithBackup":"Saved. Backup from {time} available","editorRestoredWithBackup":"Version restored. Backup from {time} available","editorHistory":"Version history","editorHistoryHide":"Hide version history","editorHistoryLoading":"Loading versions…","editorHistoryEmpty":"No backups yet. One is saved before every change.","editorRestore":"Restore","editorRestoreConfirm":"Restore the version from {time}? Your current state is saved as a backup first. Unsaved edits in this dialog are discarded.","editorRestoreNow":"Restore this version","editorUndo":"Undo last change","editorKindIngredients":"Ingredients","editorKindBasics":"Basics","editorKindInstructions":"Steps","editorKindImage":"Cover photo","editorKindStepImage":"Step photo","editorKindRestore":"Restore","editorPhoto":"Photo","editorPhotoNone":"This recipe has no photo yet.","editorPhotoHint":"JPEG, PNG or WebP, up to {size} MB.","editorPhotoReplace":"Replace photo","editorPhotoRemove":"Remove photo","editorPhotoRemoveConfirm":"Remove the cover photo? A backup copy is saved first.","editorPhotoRemoveNow":"Remove photo","editorStepPhotoAdd":"Add photo","editorStepPhotoReplace":"Replace","editorStepPhotoRemove":"Remove","editorStepPhotoAlt":"Photo of step {step}","editorStepPhotoKeptInMealie":"The photo is removed from this step. Mealie keeps the file on its disk.","editorStepPhotoSaveFirst":"Save this step first to add a photo.","editorUploadTooLarge":"This file is larger than {size} MB.","editorUploadWrongType":"Only JPEG, PNG and WebP images work.","editorUploadProgress":"Uploading {percent}%","editorUploadCancel":"Cancel upload","editorUploadCancelled":"Upload cancelled.","editorRowNeedsText":"Add a food or a note for this ingredient.","editorUploadNeedsSecure":"Photo upload needs a secure (HTTPS) connection.","syncTitle":"Shopping sync","syncOpen":"Shopping sync","syncFixNumbers":"Fix the highlighted numbers before saving.","syncBadgeIssues":"{count} to review","syncSetup":"Set up shopping sync","syncAddRule":"Add a sync rule","syncEditRule":"Edit sync rule","syncNoRules":"No sync rule yet. A rule sends open items of one Mealie list to a to-do list in Home Assistant, for example Bring.","syncRuleName":"Rule name","syncSource":"Source list in Mealie","syncDestination":"Destination list in Home Assistant","syncDestinationOption":"{name} · {platform}","syncNoDestinations":"No suitable to-do list found. The destination must support adding items and must not be a Mealie list.","syncSupportsNotes":"Supports notes: {answer}","syncYes":"yes","syncNo":"no","syncStepMode":"Mode","syncStepWhen":"When to sync","syncStepConfirm":"Confirm","syncModeCopy":"Copy","syncModeCopyHint":"Mealie stays unchanged","syncModeMove":"Move","syncModeMoveHint":"Items are checked off in Mealie after the destination confirmed them","syncTriggerAfterAdd":"After Atelier adds recipe ingredients","syncTriggerWatch":"Watch for changes elsewhere","syncTriggerWatchHint.one":"Mealie Atelier checks the source list regularly. Changes made elsewhere appear after up to 1 minute.","syncTriggerWatchHint.other":"Mealie Atelier checks the source list regularly. Changes made elsewhere appear after up to {interval} minutes.","syncDebounce":"Wait before sending (seconds)","syncPollMinutes":"Check every (minutes)","syncDuplicates":"Duplicates","syncDuplicateSkipExact":"Skip identical items","syncDuplicateMerge":"Skip identical items and combine the same unit","syncDuplicateNone":"Send everything","syncPreview":"Preview","syncPreviewRun":"Show preview","syncPreviewEmpty":"Nothing to send right now. Open items in the source list will be sent once they appear.","syncPreviewSample":"Example line: {title}","syncPreviewTotal.one":"1 open item in the source list. Showing the first batch of {shown}.","syncPreviewTotal.other":"{total} open items in the source list. Showing the first batch of {shown}.","syncActionSend":"Send","syncActionSkipDuplicate":"Skip, already there","syncActionMerge":"Combine with another line","syncActionSkipEmpty":"Skip, no text","syncConfirmSend.one":"Save and send 1 item from {source} to {destination}","syncConfirmSend.other":"Save and send {count} items from {source} to {destination}","syncSaveOnly":"Save without sending","syncSaveChanges":"Save changes","syncResetConfirm":"I understand that changing the source or destination restarts this rule and forgets its history. The destination list stays untouched.","syncStateActive":"Active","syncStatePaused":"Paused","syncStateNotActivated":"Not activated yet. Nothing is sent automatically until you confirm the first batch.","syncPending.one":"1 waiting","syncPending.other":"{count} waiting","syncRunNow":"Run now","syncFirstBatch":"Review and send first batch","syncPause":"Pause","syncResume":"Resume","syncRetryFailed":"Retry failed items","syncReview":"Review","syncReviewTitle":"Items to review","syncReviewEmpty":"No items need your attention.","syncReviewClose":"Back to status","syncDismiss":"Dismiss","syncResend":"Send again","syncDelete":"Delete rule","syncDeleteConfirm":"Delete this rule? The destination list stays untouched and the sync history of this rule is removed.","syncLastRun":"Last run {time}: {result}","syncNeverRun":"No run yet","syncRunQueued":"A run is already in progress. Another pass follows right after it.","syncRunResult":"{result}. Sent {sent}, skipped {skipped}, failed {failed}, still waiting {left}.","syncOutcomeSent":"Sent","syncOutcomePartial":"Partly sent, some items need attention","syncOutcomeFailed":"Not sent","syncOutcomeDestinationUnavailable":"Destination unavailable","syncOutcomeSourceUnavailable":"Mealie unavailable","syncOutcomeNothing":"Nothing to send","syncOutcomeReconciled":"Checked against the destination","syncOutcomeUnknown":"Unknown result","syncRecordState_pending":"Waiting","syncRecordState_sending":"Sending","syncRecordState_sent":"Sent","syncRecordState_source_completed":"Checked off in Mealie","syncRecordState_failed":"Failed","syncRecordState_needs_reconciliation":"Unclear whether it arrived","syncRecordState_changed_after_send":"Changed after sending","syncRecordState_removed_after_send":"Removed after sending","syncErrorDestinationUnavailable.one":"{destination} is unavailable. 1 item remains open in Mealie.","syncErrorDestinationUnavailable.other":"{destination} is unavailable. {count} items remain open in Mealie.","syncErrorSourceUnavailable":"Mealie could not be reached. Nothing was sent.","syncReconcileHint.one":"1 item may or may not have arrived. It is compared with the destination on the next run.","syncReconcileHint.other":"{count} items may or may not have arrived. They are compared with the destination on the next run.","syncNeedsWrite":"Your Home Assistant user may view the sync but not change it.","syncStandaloneExplain":"Live sync to Bring and other lists needs Home Assistant with the Mealie Atelier Bridge. The standalone app does not send shopping data to third parties.","syncLoadFailed":"The sync status could not be loaded.","syncCancel":"Cancel","syncInvalidNumber":"Enter a whole number between {min} and {max}.","syncAuditTitle":"Recent runs","syncAuditEntry.one":"{time}: {result}, 1 item","syncAuditEntry.other":"{time}: {result}, {count} items","syncOutboxTitle":"Waiting to be sent","syncLastError_destination_rejected":"The destination refused the item.","syncLastError_destination_timeout":"The destination did not answer in time.","syncLastError_destination_unavailable":"The destination was unavailable.","syncLastError_source_complete_failed":"The item could not be checked off in Mealie.","syncLastError_ambiguous":"Several destination items match. Decide whether to send it again.","pickerLabel":"Recipe","pickerPlaceholder":"Search recipes …","pickerCount":"{shown} of {total} recipes","pickerLoadMore":"Load more","pickerLoading":"Loading recipes …","pickerEmpty":"No recipe matches “{query}”.","pickerNoneFound":"No recipes found.","pickerClearFilters":"Clear filters","pickerError":"Recipes could not be loaded: {error}","pickerRetry":"Retry","pickerEnd":"End of list","pickerCategory":"Category","pickerTag":"Tag","pickerFavorites":"Favourites only","pickerFavoritesHint":"Favourites of the connected Mealie account","pickerSort":"Sort","pickerSortName":"Name","pickerSortRecent":"Recently changed","offlineWaiting":"Waiting for connection","offlineQueued.one":"1 change waiting","offlineQueued.other":"{count} changes waiting","offlineSendNow":"Send now","offlineDiscard":"Discard","offlineSaved":"No connection. Your change is saved on this device and will be sent later.","offlineDropped":"A queued change was dropped because your user may no longer change this kitchen.","offlineConflictItem":"{item}: {error}","errOfflineOpReused":"This queued change clashes with an earlier one. Discard it and make the change again.","errOfflineConflict":"This item was changed elsewhere in the meantime. Discard your change and check the list.","errOfflineAddUncertain":"This item may already be on the list. Check the list, then discard this entry.","cookSwipeHint":"← swipe →","studioKicker":"ATELIER / KITCHEN STUDIO","studioDailyExpiringOne":"1 pantry item should be used soon.","openItemsLabel":"Open items","recipesSub":"Every recipe from your Mealie in one place.","mealplanSub":"Plan the week and see at a glance what is cooking when.","shoppingSub":"Tick off what is in the cart. The list stays in sync with Mealie.","manageSub":"Create and import recipes and keep base data tidy.","journalKicker":"COOKING JOURNAL","nutritionKicker":"NUTRITION LAB","openItems.one":"1 open item","openItems.other":"{count} open items","importKicker":"IMPORT","shoppingKicker":"SHOPPING","editorCustomValue":"{value} (custom, not a preset)","editorNoBuiltInMealieIntegrationFound":"Not available: no Mealie integration found in Home Assistant.","editorColorSage":"Sage green","editorColorApricot":"Apricot","editorColorPeriwinkle":"Periwinkle blue","editorColorLilac":"Lilac","editorColorHoney":"Honey yellow","stubTitle.today":"Mealie Atelier · Today","stubTitle.recipes":"Mealie Atelier · Recipes","stubTitle.mealplan":"Mealie Atelier · Planner","stubTitle.shopping":"Mealie Atelier · Shopping","stubTitle.discover":"Mealie Atelier · Discover","stubTitle.pantry":"Mealie Atelier · Pantry","stubTitle.family":"Mealie Atelier · Family","stubTitle.cookbook":"Mealie Atelier · Cookbook","stubTitle.manage":"Mealie Atelier · Manager"}};
function matchLocaleTag(value) {
  const tag = String(value || "")
    .trim()
    .replaceAll("_", "-")
    .toLowerCase();
  if (!tag) return "";
  const locales = Object.keys(LABELS);
  return (
    locales.find((locale) => locale.toLowerCase() === tag) ||
    locales.find((locale) => locale.toLowerCase() === tag.split("-", 1)[0]) ||
    ""
  );
}

function resolveLanguage(preference, hassLanguage, browserLanguage) {
  if (preference && preference !== "auto") return matchLocaleTag(preference) || "en";
  return matchLocaleTag(hassLanguage) || matchLocaleTag(browserLanguage) || "en";
}

function translateLabel(locale, key, values = {}) {
  let message = LABELS[locale]?.[key] ?? LABELS.en?.[key] ?? key;
  if (typeof message !== "string") return key;
  return message.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (token, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : token,
  );
}

function translatePluralLabel(locale, key, count, values = {}) {
  const language = matchLocaleTag(locale) || "en";
  const category = new Intl.PluralRules(language).select(Number(count));
  const pluralKey = `${key}.${category}`;
  return translateLabel(
    language,
    LABELS[language]?.[pluralKey] !== undefined ? pluralKey : `${key}.other`,
    { ...values, count },
  );
}

const STYLE = `<style>
:host {
  display: block;
  --at-surface: #111a1d;
  --at-ink: #eaf0eb;
  --at-sub: #96a5a3;
  --at-panel: #1c2728;
  --at-panel2: #222d2d;
  --at-line: rgba(235, 247, 238, 0.1);
  --at-shadow: 0 22px 70px rgba(4, 12, 17, 0.28);
  --at-radius: 23px;
  --at-accent: #9dcbb2;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  color: var(--at-ink);
}
:host * {
  box-sizing: border-box;
}
:host button,
:host input,
:host textarea,
:host select {
  font: inherit;
}
:host button {
  cursor: pointer;
}
:host button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
:host button:focus-visible,
:host input:focus-visible,
:host select:focus-visible,
:host textarea:focus-visible {
  outline: 3px solid var(--at-accent);
  outline-offset: 3px;
}
ha-card {
  display: block !important;
  background: transparent !important;
  box-shadow: none !important;
  border: 0 !important;
  overflow: visible !important;
  color: inherit !important;
}
.atelier {
  background: var(--at-surface);
  color: var(--at-ink);
  border: 1px solid var(--at-line);
  border-radius: calc(var(--at-radius) + 9px);
  min-height: 430px;
  overflow: hidden;
  isolation: isolate;
  position: relative;
  box-shadow: var(--at-shadow);
  line-height: 1.4;
}
/* A panel view gives the card the whole view: no frame, no floating corners. */
.atelier.panel {
  border: 0;
  border-radius: 0;
  box-shadow: none;
  min-height: calc(100vh - var(--header-height, 56px));
}
.atelier.panel > .shell {
  min-height: inherit;
}
.atelier.compact {
  --at-gap: 13px;
  --at-pad: 20px;
}
.atelier.comfortable {
  --at-gap: 19px;
  --at-pad: 30px;
}
.atelier .shell {
  display: grid;
  grid-template-columns: 214px minmax(0, 1fr);
}
.atelier .shell.single {
  grid-template-columns: minmax(0, 1fr);
}
.atelier .sidebar {
  background: rgba(6, 12, 15, 0.23);
  border-right: 1px solid var(--at-line);
  padding: 27px 16px;
  display: flex;
  flex-direction: column;
  min-height: 780px;
}
.atelier.light .sidebar {
  background: color-mix(in srgb, var(--at-panel) 42%, transparent);
}
.atelier .identity {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 11px 33px;
  min-width: 0;
}
.atelier .logo {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: var(--at-accent);
  color: var(--ds-brand-foreground);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  box-shadow: 0 8px 23px color-mix(in srgb, var(--at-accent) 23%, transparent);
}
.atelier .identity strong {
  font-size: 14px;
  letter-spacing: -0.5px;
  display: block;
  line-height: 1.1;
}
.atelier .identity span {
  display: block;
  font-size: 10px;
  color: var(--at-sub);
  letter-spacing: 1.7px;
  margin-top: 4px;
  text-transform: uppercase;
}
.atelier .nav-label {
  font-size: 10px;
  letter-spacing: 1.8px;
  color: var(--at-sub);
  padding: 0 15px 10px;
  font-weight: 800;
}
.atelier .nav {
  display: grid;
  gap: 5px;
}
.atelier .nav button {
  border: 0;
  background: none;
  color: var(--at-sub);
  border-radius: 13px;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 14px;
  font-size: 13px;
  text-align: left;
  font-weight: 650;
  transition:
    background var(--ds-motion-fast),
    color var(--ds-motion-fast);
}
/* Touch screens keep :hover on whatever sits under the last tap, which painted a stale tab. */
@media (hover: hover) {
  .atelier .nav button:hover {
    color: var(--at-ink);
    background: var(--at-panel2);
  }
}
.atelier .nav button.active {
  color: var(--ds-brand);
  background: color-mix(in srgb, var(--at-accent) 13%, transparent);
}
.atelier .nav button.active:before {
  content: "";
  position: absolute;
  left: 0;
  width: 3px;
  height: 23px;
  border-radius: 5px;
  background: var(--at-accent);
}
.atelier .sidebar-footer {
  margin-top: auto;
  padding: 23px 9px 0;
  color: var(--at-sub);
  font-size: 11px;
}
.atelier .sidebar-footer .tiny-leaf {
  width: 27px;
  height: 27px;
  display: grid;
  place-items: center;
  border: 1px solid var(--at-line);
  border-radius: 9px;
  margin-bottom: 10px;
  color: var(--ds-brand);
}
.atelier .main {
  min-width: 0;
  padding: var(--at-pad);
}
.atelier .topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 46px;
  margin-bottom: 26px;
}
.atelier .breadcrumb {
  color: var(--at-sub);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.atelier .breadcrumb strong {
  color: var(--at-ink);
  font-weight: 650;
}
.atelier .toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}
.atelier .icon-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--at-line);
  display: inline-grid;
  place-items: center;
  color: var(--at-ink);
  background: var(--at-panel);
  border-radius: 13px;
  transition:
    background var(--ds-motion-base),
    transform var(--ds-motion-base);
}
.atelier .icon-btn:hover {
  background: var(--at-panel2);
  transform: translateY(-1px);
}
.atelier h1,
.atelier h2,
.atelier h3,
.atelier p {
  margin: 0;
}
.atelier h1 {
  font-size: clamp(29px, 3vw, 49px);
  font-weight: 760;
  letter-spacing: -2.2px;
  line-height: 1.08;
}
.atelier h1 em {
  font-weight: 550;
  font-style: normal;
  color: var(--ds-brand);
}
.atelier h2 {
  font-size: 21px;
  letter-spacing: -0.7px;
  font-weight: 720;
}
.atelier h3 {
  font-size: 16px;
  letter-spacing: -0.4px;
}
.atelier .muted {
  color: var(--at-sub);
}
.atelier .eyebrow {
  font-size: 10px;
  letter-spacing: 2.2px;
  font-weight: 850;
  color: var(--ds-brand);
}
.atelier .heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 14px;
  margin: 0 0 16px;
}
.atelier .heading p {
  color: var(--at-sub);
  font-size: 12px;
  margin-top: 5px;
}
.atelier .intro {
  margin: 11px 0 27px;
}
.atelier .intro .muted {
  font-size: 14px;
  margin-top: 10px;
}
.atelier .btn {
  border: 1px solid var(--at-line);
  color: var(--at-ink);
  background: var(--at-panel);
  border-radius: 13px;
  padding: 11px 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-weight: 720;
  font-size: 12px;
  line-height: 1.2;
  min-height: 40px;
  transition:
    filter var(--ds-motion-fast),
    transform var(--ds-motion-fast);
}
.atelier .btn:hover {
  filter: brightness(1.13);
  transform: translateY(-1px);
}
.atelier .btn.primary {
  background: var(--at-accent);
  border-color: var(--ds-brand);
  color: var(--ds-brand-foreground);
}
.atelier .btn.ghost {
  background: transparent;
}
.atelier .btn.tiny {
  min-height: 32px;
  padding: 7px 11px;
  font-size: 11px;
}
.atelier .btn.plain {
  background: transparent;
  border: 0;
  padding: 4px 0;
  min-height: 0;
  color: var(--ds-brand);
}
.atelier .hero {
  border-radius: var(--at-radius);
  background:
    radial-gradient(
      circle at 82% 24%,
      color-mix(in srgb, var(--at-accent) 27%, transparent),
      transparent 38%
    ),
    linear-gradient(123deg, #243a34, #172927 66%, #12231e);
  padding: 27px 28px;
  min-height: 228px;
  display: flex;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #edf5ee;
}
.atelier .hero .hero-copy {
  position: relative;
  z-index: 2;
  max-width: 58%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 11px;
}
.atelier .hero .eyebrow {
  color: #b2d9c0;
}
.atelier .hero h2 {
  font-size: clamp(22px, 2.7vw, 35px);
  max-width: 420px;
  letter-spacing: -1.25px;
  line-height: 1.12;
}
.atelier .hero p {
  color: #bccfc7;
  font-size: 12px;
  line-height: 1.5;
}
.atelier .hero .hero-art {
  position: absolute;
  right: -34px;
  top: -30px;
  width: 47%;
  height: calc(100% + 60px);
  display: grid;
  place-items: center;
  opacity: 0.95;
}
.atelier .hero .plate {
  position: relative;
  border-radius: 50%;
  width: min(230px, 94%);
  aspect-ratio: 1;
  background: radial-gradient(
    circle at 34% 32%,
    #f3f1df,
    #d9ddc8 68%,
    #acc0b0 70%,
    #e1e3cf 73%,
    #8b9d8c 76%,
    transparent 77%
  );
  box-shadow:
    20px 25px 30px #08120d5c,
    inset 0 4px 8px #fff8;
  transform: rotate(-21deg);
}
.atelier .hero .plate:after {
  content: "✿";
  position: absolute;
  inset: 24%;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 72px;
  color: #658d66;
  background: radial-gradient(
    circle,
    #cb9d63 0 16%,
    #92a970 17% 38%,
    #d2bf79 39% 45%,
    #64845b 46% 52%,
    transparent 53%
  );
  text-shadow: 1px 3px #ffffff26;
}
.atelier .hero .hero-food {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.62;
  mask-image: linear-gradient(90deg, transparent 1%, #000 42%);
}
.atelier .hero:has(.hero-food) .hero-art {
  display: none;
}
.atelier .statline {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--at-gap);
  margin: 17px 0 31px;
}
.atelier .stat {
  background: var(--at-panel);
  border: 1px solid var(--at-line);
  border-radius: 18px;
  min-height: 86px;
  padding: 15px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.atelier .stat-icon {
  height: 42px;
  width: 42px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--at-accent) 14%, transparent);
  color: var(--ds-brand);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.atelier .stat strong {
  font-size: 23px;
  font-weight: 760;
  display: block;
  letter-spacing: -1px;
  line-height: 1;
}
.atelier .stat span {
  font-size: 11px;
  color: var(--at-sub);
  display: block;
  margin-top: 6px;
}
.atelier .section {
  margin-top: 25px;
}
.atelier .recipe-tools {
  display: flex;
  gap: 9px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin: 15px 0 16px;
}
.atelier .search {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--at-panel);
  border: 1px solid var(--at-line);
  border-radius: 13px;
  padding: 0 13px;
  min-width: 180px;
  flex: 1;
  max-width: 350px;
  color: var(--at-sub);
}
.atelier input,
.atelier textarea,
.atelier select {
  background: var(--at-panel);
  color: var(--at-ink);
  border: 1px solid var(--at-line);
  border-radius: 12px;
  padding: 12px 13px;
  min-width: 0;
  width: 100%;
  font-size: 13px;
}
.atelier input[type="date"] {
  color-scheme: dark;
}
.atelier.light input[type="date"] {
  color-scheme: light;
}
.atelier .search input {
  border: 0;
  background: none;
  outline: 0;
  width: 100%;
  padding: 12px 0;
}
.atelier .search input:focus-visible {
  outline: 0;
}
.atelier .recipe-grid {
  display: grid;
  grid-template-columns: repeat(var(--at-cols), minmax(0, 1fr));
  gap: var(--at-gap);
}
.atelier .recipe-tile {
  position: relative;
  background: var(--at-panel);
  border: 1px solid var(--at-line);
  border-radius: 18px;
  overflow: hidden;
  min-width: 0;
  transition:
    transform var(--ds-motion-fast),
    border-color var(--ds-motion-fast);
  text-align: left;
  color: var(--at-ink);
  display: flex;
  flex-direction: column;
  padding: 0;
  width: 100%;
}
.atelier .recipe-tile:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--at-accent) 45%, transparent);
}
.atelier .tile-image {
  height: 150px;
  display: grid;
  place-items: center;
  overflow: hidden;
  position: relative;
  background: linear-gradient(120deg, #415b50, #6e7b59);
}
.atelier .tile-image.tint1 {
  background: linear-gradient(115deg, #7b625d, #b2806c);
}
.atelier .tile-image.tint2 {
  background: linear-gradient(115deg, #556273, #86939c);
}
.atelier .tile-image.tint3 {
  background: linear-gradient(115deg, #5b6f54, #b0aa76);
}
.atelier .tile-image img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition: transform var(--ds-motion-image);
  position: absolute;
  inset: 0;
}
.atelier .recipe-tile:hover .tile-image img {
  transform: scale(1.08);
}
.atelier .tile-image .placeholder {
  font-size: 56px;
  color: #fff8;
  filter: drop-shadow(0 10px 20px #0002);
}
.atelier .tile-body {
  padding: 13px 15px 16px;
  flex: 1;
}
.atelier .tile-body small {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 850;
  color: var(--ds-brand);
  display: block;
  margin-bottom: 7px;
}
.atelier .tile-body h3 {
  font-size: 13px;
  font-weight: 710;
  line-height: 1.3;
  min-height: 34px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.atelier .tile-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--at-sub);
  font-size: 10px;
  margin-top: 9px;
}
.atelier .pill {
  font-size: 10px;
  font-weight: 760;
  color: var(--ds-brand);
  background: color-mix(in srgb, var(--at-accent) 13%, transparent);
  padding: 7px 11px;
  border-radius: 99px;
  white-space: nowrap;
}
.atelier .float-pill {
  position: absolute;
  left: 10px;
  top: 10px;
  background: #112019cc;
  color: #d8ecd9;
  backdrop-filter: blur(8px);
}
.atelier .week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  overflow: auto;
}
.atelier .day {
  background: var(--at-panel);
  border: 1px solid var(--at-line);
  border-radius: 15px;
  padding: 12px 10px;
  min-height: 142px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  min-width: 0;
}
.atelier .day.today {
  border-color: color-mix(in srgb, var(--at-accent) 58%, transparent);
}
.atelier .day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.atelier .day-head span {
  font-size: 10px;
  color: var(--at-sub);
  font-weight: 700;
}
.atelier .day-head b {
  font-size: 14px;
}
.atelier .day.today .day-head b {
  color: var(--ds-brand);
}
.atelier .day-meal {
  display: block;
  text-align: left;
  width: 100%;
  color: var(--at-ink);
  background: var(--at-panel2);
  border: 0;
  padding: 8px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 11px;
  line-height: 1.25;
  min-height: 49px;
}
.atelier .day-meal small {
  display: block;
  font-size: 9px;
  color: var(--ds-brand);
  margin-bottom: 4px;
}
.atelier .day-empty {
  color: var(--at-sub);
  font-size: 10px;
  line-height: 1.35;
}
.atelier .day-add {
  margin-top: auto;
  border: 1px dashed var(--at-line);
  border-radius: 9px;
  color: var(--at-sub);
  background: none;
  display: grid;
  place-items: center;
  width: 100%;
  height: 30px;
}
.atelier .shopping-card,
.atelier .manage-card {
  background: var(--at-panel);
  border: 1px solid var(--at-line);
  border-radius: 19px;
  padding: 20px;
}
.atelier .shopping-list {
  display: grid;
  margin-top: 8px;
}
.atelier .shopping-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 2px;
  border-bottom: 1px solid var(--at-line);
}
.atelier .shopping-row:last-child {
  border-bottom: 0;
}
.atelier .shopping-row.checked .shopping-name {
  text-decoration: line-through;
  opacity: 0.55;
}
.atelier .shopping-name {
  font-size: 13px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}
.atelier .shopping-qty {
  font-size: 11px;
  color: var(--at-sub);
}
.atelier .shopping-form {
  display: flex;
  gap: 8px;
  margin-top: 17px;
}
.atelier .shopping-form input {
  flex: 1;
}
.atelier .manage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--at-gap);
}
.atelier .manage-card {
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
}
.atelier .manage-card p {
  font-size: 12px;
  color: var(--at-sub);
  max-width: 330px;
}
.atelier .pager {
  display: flex;
  gap: 9px;
  justify-content: center;
  align-items: center;
  margin: 20px 0 0;
  font-size: 11px;
  color: var(--at-sub);
}
.atelier .notice {
  padding: 15px 19px;
  border: 1px solid var(--at-line);
  border-radius: 16px;
  background: var(--at-panel);
  color: var(--at-sub);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.atelier .notice.error {
  color: #f6b6a4;
  border-color: #e7a79466;
}
.atelier .toast {
  position: sticky;
  bottom: 20px;
  width: fit-content;
  margin: 10px auto;
  z-index: 8;
  background: var(--at-accent);
  color: var(--ds-brand-foreground);
  border-radius: 11px;
  padding: 11px 16px;
  font-size: 12px;
  font-weight: 770;
  box-shadow: var(--at-shadow);
}
.atelier .modal-backdrop {
  position: fixed;
  inset: 0;
  background: #080d0cbd;
  z-index: 80;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 17px;
  backdrop-filter: blur(9px);
}
/* Undo the browser's popover box so the raised backdrop still covers the whole viewport. */
.atelier .modal-backdrop[popover] {
  margin: 0;
  border: 0;
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  overflow: visible;
  color: inherit;
}
.atelier .modal {
  background: var(--at-surface);
  color: var(--at-ink);
  border: 1px solid var(--at-line);
  border-radius: 24px;
  width: min(720px, 100%);
  max-height: min(90vh, 940px);
  overflow-y: auto;
  box-shadow: 0 32px 110px #0009;
  position: relative;
}
.atelier .modal.large {
  width: min(890px, 100%);
}
.atelier .modal-content {
  padding: 25px;
}
.atelier .modal-close {
  position: absolute;
  right: 18px;
  top: 18px;
  z-index: 2;
}
.atelier .modal-hero {
  height: 230px;
  background: linear-gradient(120deg, #304d40, #788f66);
  display: grid;
  place-items: center;
  font-size: 82px;
  color: #fff7;
}
.atelier .modal-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.atelier .modal h2 {
  font-size: 27px;
  line-height: 1.1;
  letter-spacing: -1.1px;
}
.atelier .modal .description {
  font-size: 13px;
  color: var(--at-sub);
  line-height: 1.65;
  margin: 11px 0 18px;
}
.atelier .detail-cols {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 25px;
  margin: 23px 0;
}
.atelier .detail-cols h3 {
  font-size: 14px;
  margin-bottom: 13px;
}
.atelier .ingredient {
  display: flex;
  align-items: start;
  gap: 9px;
  font-size: 12px;
  border-bottom: 1px solid var(--at-line);
  padding: 11px 0;
  line-height: 1.45;
}
.atelier .step {
  display: flex;
  gap: 12px;
  border: 1px solid var(--at-line);
  padding: 13px;
  border-radius: 12px;
  margin-bottom: 9px;
  font-size: 12px;
  line-height: 1.65;
  cursor: pointer;
}
.atelier .step.active {
  border-color: var(--ds-brand);
  background: color-mix(in srgb, var(--at-accent) 8%, transparent);
}
.atelier .step-number {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--at-panel2);
  color: var(--ds-brand);
  font-weight: 750;
  flex-shrink: 0;
}
.atelier .cook-stage {
  display: grid;
  place-items: center;
  text-align: center;
  min-height: 290px;
  padding: 25px;
}
.atelier .cook-stage .step-count {
  font-size: 11px;
  letter-spacing: 2px;
  color: var(--ds-brand);
}
.atelier .cook-stage h2 {
  font-size: clamp(24px, 3.5vw, 37px);
  line-height: 1.32;
  max-width: 590px;
}
.atelier .cook-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 19px 0;
}
.atelier .field {
  display: grid;
  gap: 7px;
  font-size: 12px;
  font-weight: 720;
  margin: 0 0 15px;
}
.atelier .field span {
  color: var(--at-sub);
}
.atelier .form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 15px;
}
.atelier .form-error {
  color: #f6b6a4;
  margin-bottom: 10px;
  font-size: 12px;
}
.atelier .range {
  display: flex;
  gap: 8px;
  align-items: center;
}
.atelier .range button {
  flex: 1;
}
.atelier .swatches {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.atelier .swatch {
  width: 33px;
  height: 33px;
  border-radius: 11px;
  border: 2px solid transparent;
  box-shadow: inset 0 0 0 1px #fff4;
}
.atelier .swatch.chosen {
  outline: 2px solid var(--at-ink);
  outline-offset: 3px;
}
.atelier .settings-group {
  padding: 17px 0;
  border-bottom: 1px solid var(--at-line);
}
.atelier .settings-group h3 {
  font-size: 13px;
  margin-bottom: 9px;
}
.atelier .settings-hint {
  color: var(--at-sub);
  font-size: 11px;
  margin-top: 17px;
  line-height: 1.55;
}
.atelier .skeleton {
  min-height: 200px;
  display: grid;
  place-items: center;
  color: var(--at-sub);
  font-size: 13px;
}
.atelier .today-board {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: var(--at-gap);
}
.atelier .today-panel {
  background: var(--at-panel);
  border: 1px solid var(--at-line);
  border-radius: 20px;
  padding: 21px;
  min-width: 0;
}
.atelier .today-panel h3 {
  margin: 4px 0 14px;
  font-size: 17px;
  letter-spacing: -0.4px;
}
.atelier .today-meal {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--at-line);
}
.atelier .today-meal:last-of-type {
  border-bottom: 0;
}
.atelier .today-meal .meal-badge {
  color: var(--ds-brand);
  background: var(--at-panel2);
  padding: 9px;
  border-radius: 11px;
  flex-shrink: 0;
}
.atelier .today-meal .meal-details {
  flex: 1;
  min-width: 0;
}
.atelier .today-meal .meal-details small {
  display: block;
  color: var(--at-sub);
  font-size: 10px;
  margin-bottom: 4px;
}
.atelier .today-meal .meal-details strong {
  font-size: 13px;
  line-height: 1.35;
  display: block;
}
.atelier .mini-shopping {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--at-line);
  padding: 10px 0;
  font-size: 12px;
  gap: 10px;
}
.atelier .mini-shopping:last-child {
  border: 0;
}
.atelier .mini-shopping button {
  border: 0;
  background: none;
  color: var(--at-ink);
  text-align: left;
  padding: 5px 0;
  flex: 1;
}
.atelier .mini-shopping button:hover {
  color: var(--ds-brand);
}
.atelier .editing-hint {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.6;
  color: var(--at-sub);
  background: var(--at-panel2);
  border: 1px solid var(--at-line);
  border-radius: 10px;
  padding: 10px 12px;
}
.atelier .subform {
  display: grid;
  gap: 8px;
  background: var(--at-panel2);
  padding: 13px;
  border-radius: 13px;
  margin: 14px 0;
}
.atelier .subform .field {
  margin: 0;
}
.atelier .field input[type="checkbox"] {
  width: 17px;
  height: 17px;
  accent-color: var(--ds-brand);
}
.atelier .modal textarea {
  width: 100%;
  resize: vertical;
  min-height: 95px;
}
.atelier button:focus-visible,
.atelier input:focus-visible,
.atelier select:focus-visible,
.atelier textarea:focus-visible {
  outline: 2px solid var(--at-accent);
  outline-offset: 2px;
}
.atelier .modal .btn.primary {
  color: var(--ds-brand-foreground);
}
@media (max-width: 780px) {
  .atelier .today-board {
    grid-template-columns: 1fr;
  }
}
:host([hidden]) {
  display: none;
}
@media (min-width: 1500px) {
  .atelier .main {
    max-width: 1550px;
    margin-inline: auto;
  }
  .atelier .recipe-tile .tile-image {
    height: 180px;
  }
}
@media (max-width: 1080px) {
  .atelier .shell {
    grid-template-columns: 170px minmax(0, 1fr);
  }
  .atelier .sidebar {
    padding: 24px 10px;
  }
  .atelier .identity {
    padding: 0 5px 25px;
  }
  .atelier .stat {
    gap: 9px;
    padding: 12px;
  }
  .atelier .week-grid {
    grid-template-columns: repeat(7, minmax(93px, 1fr));
  }
  .atelier .recipe-grid {
    grid-template-columns: repeat(min(var(--at-cols), 3), minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .atelier .shell {
    display: block;
  }
  .atelier .sidebar {
    min-height: 0;
    border-right: 0;
    border-bottom: 1px solid var(--at-line);
    padding: 10px 12px;
  }
  .atelier .sidebar .identity,
  .atelier .sidebar .nav-label,
  .atelier .sidebar-footer {
    display: none;
  }
  .atelier .nav {
    display: flex;
    overflow: auto;
    gap: 5px;
  }
  .atelier .nav button {
    padding: 10px 10px;
    white-space: nowrap;
    gap: 6px;
    font-size: 11px;
  }
  .atelier .nav button.active:before {
    display: none;
  }
  .atelier .main {
    padding: 20px;
  }
  .atelier .topbar {
    margin-bottom: 18px;
  }
  .atelier .hero {
    padding: 21px;
    min-height: 220px;
  }
  .atelier .hero .hero-copy {
    max-width: 70%;
  }
  .atelier .statline {
    gap: 7px;
  }
  .atelier .stat {
    min-height: 70px;
    padding: 11px;
  }
  .atelier .stat-icon {
    width: 30px;
    height: 30px;
  }
  .atelier .stat strong {
    font-size: 18px;
  }
  .atelier .stat span {
    font-size: 9px;
  }
  .atelier .recipe-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atelier .tile-image {
    height: 142px;
  }
  .atelier .detail-cols {
    grid-template-columns: 1fr;
  }
  .atelier .week-grid {
    grid-template-columns: repeat(7, 110px);
  }
  .atelier .manage-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 420px) {
  .atelier .main {
    padding: 15px;
  }
  .atelier .stat-icon {
    display: none;
  }
  .atelier .hero {
    min-height: 195px;
  }
  .atelier .hero-art {
    right: -70px;
  }
  .atelier .hero h2 {
    font-size: 25px;
  }
  .atelier .hero .hero-copy {
    max-width: 95%;
    position: relative;
    z-index: 2;
  }
  .atelier .hero .hero-art {
    right: -95px;
    opacity: 0.2;
  }
  .atelier .hero h2 {
    font-size: 24px;
  }
  .atelier .tile-image {
    height: 113px;
  }
  .atelier .recipe-tile h3 {
    font-size: 12px;
  }
  .atelier .modal-content {
    padding: 18px;
  }
  .atelier .modal-hero {
    height: 175px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .atelier * {
    transition: none !important;
    animation: none !important;
  }
}

/* Atelier 0.3: grounded editorial forms, not a generic settings dialog. */
.atelier .editor-lead {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 18px;
  margin: 0 0 24px;
  padding-right: 64px;
}
.atelier .editor-lead h2 {
  font-size: clamp(26px, 3vw, 35px);
  letter-spacing: -1.3px;
  line-height: 1.15;
  margin: 8px 0;
}
.atelier .editor-lead p {
  font-size: 13px;
  color: var(--at-sub);
  line-height: 1.65;
  max-width: 550px;
}
.atelier .editor-stamp {
  width: 58px;
  height: 58px;
  border: 1px solid var(--at-line);
  border-radius: 18px;
  background: var(--at-panel2);
  display: grid;
  place-items: center;
  color: var(--ds-brand);
  flex-shrink: 0;
}
.atelier .editor-form {
  display: grid;
  gap: 15px;
}
.atelier .editor-card {
  border-radius: 20px;
  border: 1px solid var(--at-line);
  background: var(--at-panel);
  padding: 23px;
}
.atelier .editor-card .eyebrow {
  margin: 0 0 11px;
}
.atelier .editor-card h3 {
  font-size: 19px;
  letter-spacing: -0.65px;
  margin-bottom: 6px;
}
.atelier .editor-card .editor-sub {
  color: var(--at-sub);
  font-size: 12px;
  line-height: 1.65;
  margin: 0 0 17px;
}
.atelier .editor-columns {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 15px;
}
.atelier .editor-card .field {
  margin-bottom: 14px;
}
.atelier .editor-card .field span {
  font-size: 11px;
  letter-spacing: 0.35px;
}
.atelier .editor-card input,
.atelier .editor-card textarea {
  background: var(--at-surface);
  border: 1px solid var(--at-line);
  border-radius: 13px;
  font-size: 14px;
  padding: 13px 14px;
}
.atelier .editor-card input:focus,
.atelier .editor-card textarea:focus {
  border-color: var(--ds-brand);
}
.atelier .editor-card textarea {
  min-height: 102px;
  line-height: 1.65;
  resize: vertical;
}
.atelier .editor-check {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  font-weight: 650;
  color: var(--at-ink);
  padding: 13px 14px;
  background: var(--at-panel2);
  border-radius: 11px;
  margin-bottom: 12px;
}

.atelier .editor-steps {
  display: grid;
  gap: 11px;
}
.atelier .editor-step {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
  padding: 12px;
  border: 1px solid var(--at-line);
  border-radius: 14px;
  background: var(--at-surface);
}
.atelier .editor-step .step-count {
  font-size: 14px;
  font-weight: 800;
  color: var(--ds-brand);
  padding-top: 13px;
  text-align: center;
}
.atelier .editor-step textarea {
  min-height: 78px;
  border: 0;
  background: transparent;
  resize: vertical;
  padding: 8px 4px;
}
.atelier .editor-step .step-buttons {
  display: flex;
  gap: 3px;
  flex-direction: column;
}
.atelier .editor-step .step-buttons button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--at-line);
  border-radius: 9px;
  color: var(--at-sub);
  background: var(--at-panel2);
  font-size: 15px;
  cursor: pointer;
}
.atelier .editor-step .step-buttons button:hover {
  color: var(--at-ink);
  border-color: var(--ds-brand);
}
.atelier .editor-add-step {
  width: 100%;
  margin-top: 12px;
  border: 1px dashed var(--at-line);
  border-radius: 13px;
  padding: 13px;
  background: var(--at-panel2);
  color: var(--ds-brand);
  font-weight: 700;
  text-align: center;
}
.atelier .editor-readonly {
  padding: 12px 15px;
  border: 1px solid var(--at-line);
  border-radius: 12px;
  background: var(--at-surface);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 12px;
  margin-bottom: 15px;
}
.atelier .editor-readonly span {
  color: var(--at-sub);
  font-size: 12px;
  line-height: 1.5;
}
.atelier .editor-footer {
  position: sticky;
  bottom: -24px;
  z-index: 2;
  margin: 0 -23px -23px;
  padding: 16px 23px;
  background: var(--at-panel);
  border-top: 1px solid var(--at-line);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  border-radius: 0 0 20px 20px;
}
.atelier .editor-footer small {
  font-size: 11px;
  color: var(--at-sub);
  line-height: 1.45;
}
.atelier .print-setup {
  display: grid;
  grid-template-columns: 1.06fr 0.94fr;
  gap: 20px;
  align-items: start;
}
.atelier .print-option {
  width: 100%;
  display: flex;
  gap: 12px;
  align-items: center;
  text-align: left;
  background: var(--at-panel);
  color: var(--at-ink);
  border: 1px solid var(--at-line);
  border-radius: 14px;
  padding: 13px 14px;
  margin-bottom: 9px;
  cursor: pointer;
}
.atelier .print-option.active {
  border-color: var(--ds-brand);
  background: color-mix(in srgb, var(--at-accent) 13%, var(--at-panel));
}
.atelier .print-option strong {
  display: block;
  font-size: 12px;
}
.atelier .print-option span {
  display: block;
  font-size: 11px;
  color: var(--at-sub);
  margin-top: 3px;
}
.atelier .print-option .print-symbol {
  border-radius: 9px;
  background: var(--at-panel2);
  padding: 10px;
  font-size: 20px;
}
.atelier .print-paper {
  background: #fffefb;
  box-shadow: 0 12px 30px #0004;
  border-radius: 3px;
  aspect-ratio: 210/297;
  padding: 23px 21px;
  color: #23392c;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
  position: relative;
}
.atelier .print-paper.landscape {
  aspect-ratio: 297/210;
}
.atelier .print-paper .paper-kicker {
  color: #789785;
  letter-spacing: 2px;
  font-weight: 850;
  font-size: 8px;
}
.atelier .print-paper h3 {
  font-family: Georgia, serif;
  font-size: 22px;
  color: #23392c;
  line-height: 1.2;
  letter-spacing: -0.5px;
}
.atelier .print-paper p {
  color: #53685c;
  font-size: 8px;
  line-height: 1.8;
}
.atelier .print-paper .paper-line {
  height: 1px;
  background: #d2dacc;
}
.atelier .print-paper .paper-cols {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 10px;
  flex: 1;
}
.atelier .print-paper .paper-col {
  display: grid;
  align-content: start;
  gap: 10px;
}
.atelier .print-paper .paper-col span {
  background: #edf2eb;
  border-radius: 3px;
  height: 6px;
  width: 100%;
}
.atelier .print-paper .paper-col span:nth-child(2n) {
  width: 72%;
}
.atelier .print-paper .paper-label {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #648071;
}
.atelier .print-paper .paper-foot {
  margin-top: auto;
  border-top: 1px solid #d2dacc;
  padding-top: 8px;
  color: #8b9a8b;
  font-size: 7px;
  letter-spacing: 1.4px;
}
.atelier .print-guide {
  font-size: 11px;
  line-height: 1.7;
  color: var(--at-sub);
  margin-top: 8px;
}
@media (max-width: 760px) {
  .atelier .editor-columns {
    grid-template-columns: 1fr;
  }
  .atelier .editor-card {
    padding: 18px;
  }
  .atelier .editor-footer {
    margin: 0 -18px -18px;
    bottom: -18px;
    padding: 15px 18px;
  }
  .atelier .editor-step {
    grid-template-columns: 23px minmax(0, 1fr) 30px;
    gap: 7px;
  }
  .atelier .editor-readonly {
    grid-template-columns: 1fr;
  }
  .atelier .print-setup {
    grid-template-columns: 1fr;
  }
  .atelier .print-paper {
    max-width: 310px;
    margin: auto;
    width: 100%;
  }
}

/* Mealie Atelier 0.4: food-first editorial design. Built into dist/mealie-atelier-cards.js. */
:host {
  --at-serif: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
}
.atelier {
  line-height: 1.52;
  border-radius: 28px;
  background: var(--at-surface);
}
.atelier .shell {
  grid-template-columns: 212px minmax(0, 1fr);
}
.atelier .sidebar {
  background: linear-gradient(180deg, #131c17, #111815 55%, #101612);
  padding: 35px 19px;
  min-height: 900px;
}
.atelier.light .sidebar {
  background: linear-gradient(180deg, var(--ds-sidebar-start), var(--ds-sidebar-end));
}
.atelier .identity {
  gap: 12px;
  padding-bottom: 52px;
}
.atelier .logo {
  width: 43px;
  height: 43px;
  border-radius: 50%;
  box-shadow: none;
}
.atelier .identity strong {
  font-weight: 750;
  line-height: 1.13;
  letter-spacing: 0.8px;
  font-size: 12px;
}
.atelier .identity span {
  font-size: 8px;
  letter-spacing: 2.25px;
  margin-top: 7px;
}
.atelier .nav-label {
  font-size: 9px;
  letter-spacing: 2.4px;
  padding-left: 13px;
  margin-bottom: 7px;
}
.atelier .nav {
  gap: 6px;
}
.atelier .nav button {
  font-size: 12px;
  font-weight: 640;
  padding: 13px 13px;
  border-radius: 11px;
}
.atelier .nav button.active {
  color: var(--at-ink);
  background: color-mix(in srgb, var(--at-accent) 18%, transparent);
}
.atelier .nav button.active:before {
  display: none;
}
.atelier .sidebar-footer {
  font-size: 10px;
  letter-spacing: 0.2px;
}
.atelier .main {
  padding: clamp(25px, 3.7vw, 54px);
}
.atelier .topbar {
  border-bottom: 1px solid var(--at-line);
  padding-bottom: 14px;
  margin-bottom: 33px;
  min-height: 42px;
}
.atelier .breadcrumb {
  font-size: 11px;
  letter-spacing: 0.4px;
}
.atelier .icon-btn {
  border-radius: 50%;
  width: 39px;
  height: 39px;
  background: transparent;
}
.atelier .eyebrow {
  font-size: 9px;
  letter-spacing: 2.65px;
  font-weight: 760;
}
.atelier .intro {
  margin: 8px 0 29px;
}
.atelier .intro h1 {
  font-family: var(--at-serif);
  font-size: clamp(39px, 4.4vw, 64px);
  font-weight: 400;
  line-height: 1.02;
  letter-spacing: -2.6px;
}
.atelier .intro h1 em {
  font-weight: 400;
  font-style: italic;
}
.atelier .intro .muted {
  font-size: 13px;
  margin-top: 12px;
  letter-spacing: 0.08px;
}
.atelier .hero {
  height: 345px;
  min-height: 345px;
  padding: 40px 47px;
  background: #28332b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  isolation: isolate;
}
.atelier .hero .hero-food {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 52%;
  opacity: 1;
  mask-image: none;
}
.atelier .hero:after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(13, 23, 17, 0.97) 0%,
    rgba(16, 27, 20, 0.93) 35%,
    rgba(13, 24, 18, 0.54) 60%,
    rgba(11, 20, 15, 0.06) 100%
  );
}
.atelier .hero .hero-copy {
  max-width: 64%;
  z-index: 2;
  gap: 14px;
  align-items: start;
}
.atelier .hero h2 {
  font-family: var(--at-serif);
  font-size: clamp(36px, 3.7vw, 57px);
  font-weight: 400;
  letter-spacing: -1.9px;
  line-height: 1.03;
  max-width: 535px;
  text-wrap: balance;
}
.atelier .hero p {
  font-size: 12px;
  color: #d4dacb;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
.atelier .hero .btn.primary {
  margin-top: 12px;
}
.atelier .hero .hero-art {
  right: 3%;
  top: 0;
  opacity: 0.42;
}
.atelier .hero .plate {
  width: min(280px, 94%);
  box-shadow: 25px 32px 45px #0309066c;
}
.atelier .btn {
  border-radius: 999px;
  font-size: 12px;
  font-weight: 720;
  min-height: 42px;
  padding: 11px 18px;
}
.atelier .btn.primary {
  box-shadow: 0 7px 23px color-mix(in srgb, var(--at-accent) 13%, transparent);
}
.atelier .btn.tiny {
  padding: 9px 14px;
  min-height: 35px;
}
.atelier .statline {
  margin: 19px 0 47px;
  padding: 10px 0;
  background: transparent;
  border-bottom: 1px solid var(--at-line);
  border-top: 1px solid var(--at-line);
  gap: 0;
}
.atelier .stat {
  border: 0;
  border-radius: 0;
  background: transparent;
  min-height: 65px;
  padding: 8px 22px;
  position: relative;
}
.atelier .stat:not(:first-child):before {
  content: "";
  position: absolute;
  left: 0;
  top: 22%;
  height: 56%;
  width: 1px;
  background: var(--at-line);
}
.atelier .stat-icon {
  border-radius: 50%;
  height: 39px;
  width: 39px;
}
.atelier .stat strong {
  font-family: var(--at-serif);
  font-size: 24px;
  font-weight: 400;
}
.atelier .stat span {
  font-size: 10px;
  letter-spacing: 0.3px;
}
.atelier .section {
  margin-top: 44px;
}
.atelier .heading {
  margin-bottom: 20px;
  align-items: center;
}
.atelier .heading h2 {
  font-family: var(--at-serif);
  font-size: clamp(25px, 2.6vw, 35px);
  font-weight: 400;
  letter-spacing: -0.9px;
  line-height: 1.12;
}
.atelier .heading p {
  font-size: 12px;
  margin-top: 10px;
}
.atelier .btn.plain {
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-weight: 760;
}
.atelier .recipe-grid {
  gap: 22px;
}
.atelier .recipe-tile {
  border: 0;
  background: transparent;
  border-radius: 15px;
  overflow: visible;
  transition: transform var(--ds-motion-base);
  box-shadow: none;
}
.atelier .recipe-tile:hover {
  border-color: transparent;
  transform: translateY(-5px);
}
.atelier .tile-image,
.atelier .recipe-tile .tile-image {
  height: auto;
  aspect-ratio: var(--at-tile-ratio, 4/5);
  border-radius: 14px;
  overflow: hidden;
  background: var(--ds-photo-fallback, linear-gradient(145deg, #304237, #67775b));
}
.atelier .tile-image img {
  object-fit: cover;
  object-position: center center;
  filter: saturate(0.93);
  transition:
    transform var(--ds-motion-image) var(--ds-motion-ease),
    filter var(--ds-motion-image) var(--ds-motion-ease);
}
.atelier .recipe-tile:hover .tile-image img {
  transform: scale(1.045);
  filter: saturate(1.1);
}
.atelier .tile-image:before {
  content: "";
  position: absolute;
  z-index: 1;
  inset: 40% 0 0;
  background: linear-gradient(180deg, transparent, rgba(12, 21, 16, 0.45));
  pointer-events: none;
}
.atelier .tile-image:has(img) .placeholder {
  display: none;
}
.atelier .tile-image .placeholder {
  display: grid;
  place-items: center;
  text-align: center;
  padding: 35px;
  min-height: 130px;
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  font-family: var(--at-serif);
  font-size: clamp(20px, 2vw, 30px);
  color: #f0e9d2;
  filter: none;
  font-style: italic;
  line-height: 1.13;
}
.atelier.light .tile-image .placeholder {
  color: #fffdfa;
  text-shadow: 0 2px 14px rgba(45, 34, 42, 0.35);
}
.atelier .photo-index {
  position: absolute;
  z-index: 2;
  left: 15px;
  top: 14px;
  color: #fffce9;
  font-size: 10px;
  letter-spacing: 1.7px;
  font-weight: 700;
  text-shadow: 0 1px 8px #0009;
}
.atelier .tile-body {
  position: relative;
  padding: 19px 3px 12px;
  display: flex;
  flex-direction: column;
}
.atelier .tile-body small {
  color: var(--ds-brand);
  font-size: 9px;
  letter-spacing: 2.15px;
  font-weight: 730;
  margin-bottom: 9px;
}
.atelier .tile-body h3 {
  font-family: var(--at-serif);
  font-size: clamp(17px, 1.65vw, 23px);
  font-weight: 400;
  letter-spacing: -0.6px;
  line-height: 1.19;
  min-height: 55px;
  max-width: 90%;
  text-wrap: balance;
}
.atelier .tile-meta {
  font-size: 11px;
  margin-top: 12px;
  opacity: 0.95;
}
.atelier .tile-open {
  position: absolute;
  right: 6px;
  bottom: 12px;
  color: var(--ds-brand);
  width: 27px;
  height: 27px;
  border: 1px solid var(--at-line);
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.atelier .recipe-tools {
  margin: 20px 0 28px;
}
.atelier .search {
  border-radius: 999px;
  background: var(--at-panel2);
  max-width: 470px;
}
.atelier .search input {
  padding: 15px 0;
  font-size: 13px;
}
.atelier .week-grid {
  gap: 11px;
  scrollbar-width: thin;
}
.atelier .day {
  min-height: 170px;
  border-radius: 15px;
  padding: 15px 12px;
  background: var(--at-panel);
}
.atelier .day-head span {
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 1px;
}
.atelier .day-head b {
  font-family: var(--at-serif);
  font-size: 20px;
  font-weight: 400;
}
.atelier .day-meal {
  font-size: 11px;
  background: var(--at-panel2);
  border-radius: 9px;
  padding: 11px 10px;
}
.atelier .shopping-card,
.atelier .today-panel,
.atelier .manage-card {
  border-radius: 19px;
  padding: 27px;
  background: var(--at-panel);
}
.atelier .shopping-row {
  padding: 14px 1px;
}
.atelier .shopping-name {
  font-size: 13px;
}
.atelier .today-panel h3,
.atelier .manage-card h3 {
  font-family: var(--at-serif);
  font-size: 25px;
  font-weight: 400;
}
.atelier .today-board {
  gap: 18px;
}
.atelier .modal-backdrop {
  background: rgba(2, 7, 4, 0.82);
  backdrop-filter: blur(13px);
}
.atelier .modal {
  border-radius: 23px;
  max-height: min(94dvh, 1050px);
  width: min(750px, 100%);
  box-shadow: 0 50px 140px rgba(0, 0, 0, 0.62);
}
.atelier .modal.large {
  width: min(1050px, 100%);
}
.atelier .modal-content {
  padding: 34px 41px 38px;
}
.atelier .modal .modal-close {
  z-index: 5;
  right: 20px;
  top: 20px;
  background: rgba(23, 29, 23, 0.8);
  color: #fbfaf2;
  border: 1px solid #ffffff3b;
  backdrop-filter: blur(8px);
}
.atelier .modal-hero {
  height: 315px;
  display: block;
  position: relative;
  border-radius: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #324236, #8a8863);
  color: #d2dac8;
}
.atelier .modal-hero img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center 50%;
}
.atelier .modal-hero:after {
  content: "";
  position: absolute;
  inset: 65% 0 0;
  background: linear-gradient(transparent, rgba(9, 19, 14, 0.5));
  pointer-events: none;
}
.atelier .modal .modal-content > h2 {
  font-family: var(--at-serif);
  font-weight: 400;
  font-size: clamp(33px, 3.6vw, 52px);
  line-height: 1.06;
  letter-spacing: -1.6px;
  margin-top: 13px;
  max-width: 740px;
}
.atelier .modal .description {
  font-size: 14px;
  line-height: 1.75;
  max-width: 720px;
  margin: 14px 0 23px;
}
.atelier .pill {
  border-radius: 999px;
  padding: 8px 13px;
  font-size: 10px;
}
.atelier .detail-cols {
  grid-template-columns: 0.82fr 1.2fr;
  gap: 48px;
  margin-top: 40px;
  border-top: 1px solid var(--at-line);
  padding-top: 30px;
}
.atelier .detail-cols h3 {
  font-family: var(--at-serif);
  font-size: 26px;
  font-weight: 400;
  margin: 0 0 16px;
}
.atelier .ingredient {
  padding: 14px 0;
  font-size: 13px;
  line-height: 1.55;
  gap: 13px;
}

.atelier .step {
  border: 0;
  border-bottom: 1px solid var(--at-line);
  border-radius: 0;
  margin: 0;
  padding: 16px 0;
  font-size: 14px;
  line-height: 1.65;
  gap: 17px;
}
.atelier .step.active {
  border-color: var(--ds-brand);
  background: none;
}
.atelier .step-number {
  border-radius: 50%;
  height: 30px;
  width: 30px;
  font-family: var(--at-serif);
  font-size: 14px;
}
.atelier .cook-layout {
  display: grid;
  grid-template-columns: 43% minmax(0, 1fr);
  min-height: 590px;
}
.atelier .cook-visual {
  position: relative;
  min-height: 590px;
  overflow: hidden;
  background: radial-gradient(circle at 30% 40%, #485a40, #152018);
}
.atelier .cook-visual img {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
  object-fit: cover;
}
.atelier .cook-visual .cook-brand {
  position: absolute;
  bottom: 30px;
  left: 27px;
  color: white;
  font-family: var(--at-serif);
  font-size: 28px;
  line-height: 1.1;
  text-shadow: 0 2px 12px #000c;
  max-width: 75%;
}
.atelier .cook-visual:after {
  content: "";
  position: absolute;
  inset: 35% 0 0;
  background: linear-gradient(transparent, rgba(10, 19, 13, 0.7));
  pointer-events: none;
}
.atelier .cook-visual .cook-brand {
  z-index: 2;
}
.atelier .cook-content {
  min-width: 0;
  padding: 67px 42px 35px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  justify-content: center;
}
.atelier .cook-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--ds-brand);
  text-transform: uppercase;
  font-weight: 760;
}
.atelier .cook-track {
  height: 3px;
  background: var(--at-panel2);
  border-radius: 999px;
  overflow: hidden;
}
.atelier .cook-fill {
  height: 100%;
  background: var(--at-accent);
  transition: width var(--ds-motion-enter) var(--ds-motion-ease);
}
.atelier .cook-stage {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: start;
  text-align: left;
  padding: 0;
  min-height: 245px;
  gap: 16px;
}
.atelier .cook-stage .step-count {
  font-family: var(--at-serif);
  font-style: italic;
  font-size: 17px;
  letter-spacing: 0;
  text-transform: none;
}
.atelier .cook-stage h2 {
  font-family: var(--at-serif);
  font-size: clamp(28px, 2.9vw, 42px);
  line-height: 1.19;
  font-weight: 400;
  letter-spacing: -0.9px;
  margin: 0;
  text-wrap: pretty;
}
.atelier .cook-stage .muted {
  font-size: 12px;
}
.atelier .cook-actions {
  justify-content: start;
  flex-wrap: wrap;
  margin: 0;
}
.atelier .cook-actions .btn {
  min-width: 137px;
  min-height: 48px;
}
.atelier .cook-footnote {
  font-size: 11px;
  line-height: 1.7;
  color: var(--at-sub);
}
.atelier .editor-lead {
  margin-bottom: 23px;
}
.atelier .editor-lead h2 {
  font-family: var(--at-serif);
  font-size: clamp(32px, 3vw, 43px);
  font-weight: 400;
  letter-spacing: -1.2px;
  max-width: 660px;
  line-height: 1.1;
}
.atelier .editor-lead p {
  font-size: 13px;
}
.atelier .editor-stamp {
  border-radius: 50%;
  height: 55px;
  width: 55px;
}
.atelier .editor-card {
  border-radius: 18px;
  padding: 27px 29px;
  background: var(--at-panel);
}
.atelier .editor-card h3 {
  font-family: var(--at-serif);
  font-size: 26px;
  font-weight: 400;
  margin-bottom: 9px;
}
.atelier .editor-card .eyebrow {
  margin-bottom: 12px;
}
.atelier .editor-card .editor-sub {
  font-size: 12px;
  line-height: 1.75;
}
.atelier .editor-card .field span {
  font-size: 10px;
  letter-spacing: 1.1px;
  font-weight: 780;
  text-transform: uppercase;
}
.atelier .editor-card input:not([type="checkbox"]),
.atelier .editor-card select,
.atelier .editor-card textarea {
  font-size: 14px;
  border-radius: 11px;
  padding: 14px 15px;
}
.atelier .editor-step {
  border-radius: 14px;
}
.atelier .editor-footer {
  background: var(--at-panel);
  border-radius: 0 0 18px 18px;
}
.atelier .print-setup {
  gap: 30px;
}
.atelier .print-paper {
  box-shadow: 0 20px 55px #0005;
  transform: rotate(1deg);
}
.atelier .print-option {
  border-radius: 13px;
  padding: 17px;
}
.atelier .print-option.active {
  box-shadow: inset 3px 0 var(--at-accent);
}
.atelier .settings-group h3 {
  font-family: var(--at-serif);
  font-size: 21px;
  font-weight: 400;
}
.atelier .page-head {
  margin-bottom: 22px;
}
@media (max-width: 1080px) {
  .atelier .shell {
    grid-template-columns: 178px minmax(0, 1fr);
  }
  .atelier .main {
    padding: 28px;
  }
  .atelier .hero {
    height: 290px;
    min-height: 290px;
    padding: 32px;
  }
  .atelier .hero h2 {
    font-size: 39px;
  }
  .atelier .recipe-grid {
    gap: 15px;
  }
  .atelier .tile-body h3 {
    font-size: 20px;
  }
}
@media (max-width: 760px) {
  .atelier {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    min-height: 100vh;
  }
  .atelier .shell {
    display: flex;
    flex-direction: column;
  }
  .atelier .sidebar {
    order: 0;
    min-height: 0;
    padding: 12px 12px 11px;
    background: var(--at-surface);
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid var(--at-line);
  }
  .atelier .nav {
    gap: 4px;
    justify-content: space-between;
  }
  .atelier .nav button {
    padding: 9px 8px;
    font-size: 10px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 61px;
    gap: 5px;
    border-radius: 10px;
  }
  .atelier .nav button svg {
    width: 17px;
    height: 17px;
  }
  .atelier .nav button.active {
    background: var(--at-panel2);
  }
  .atelier .main {
    order: 1;
    padding: 24px 19px 52px;
  }
  .atelier .topbar {
    margin-bottom: 28px;
  }
  .atelier .intro {
    margin: 3px 0 25px;
  }
  .atelier .intro h1 {
    font-size: clamp(37px, 10.5vw, 56px);
    letter-spacing: -1.7px;
  }
  .atelier .intro .muted {
    font-size: 12px;
  }
  .atelier .hero {
    height: 310px;
    min-height: 310px;
    padding: 25px 24px;
    border-radius: 17px;
  }
  .atelier .hero:after {
    background: linear-gradient(
      0deg,
      rgba(10, 20, 14, 0.95) 0%,
      rgba(10, 20, 14, 0.53) 60%,
      rgba(10, 20, 14, 0.11) 100%
    );
  }
  .atelier .hero .hero-food {
    object-position: center 45%;
  }
  .atelier .hero .hero-copy {
    max-width: 100%;
    align-self: end;
    justify-content: end;
    gap: 9px;
  }
  .atelier .hero h2 {
    font-size: clamp(29px, 7.5vw, 42px);
    max-width: 310px;
  }
  .atelier .hero p {
    font-size: 10px;
  }
  .atelier .hero .btn.primary {
    margin-top: 3px;
  }
  .atelier .statline {
    margin: 15px 0 36px;
  }
  .atelier .stat {
    padding: 8px;
    justify-content: center;
    gap: 8px;
    min-height: 60px;
  }
  .atelier .stat strong {
    font-size: 21px;
  }
  .atelier .stat-icon {
    display: none;
  }
  .atelier .stat span {
    font-size: 9px;
  }
  .atelier .heading h2 {
    font-size: 30px;
  }
  .atelier .section {
    margin-top: 37px;
  }
  .atelier .recipe-grid.is-featured {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    padding-bottom: 14px;
    gap: 16px;
    margin-right: -19px;
    padding-right: 19px;
  }
  .atelier .recipe-grid.is-featured::-webkit-scrollbar {
    display: none;
  }
  .atelier .recipe-grid.is-featured .recipe-tile {
    flex: 0 0 min(70vw, 265px);
    scroll-snap-align: start;
  }
  .atelier .recipe-grid.is-featured .tile-image {
    height: auto;
    aspect-ratio: 4/5;
  }
  .atelier .recipe-grid:not(.is-featured) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 13px;
  }
  .atelier .recipe-grid:not(.is-featured) .tile-image {
    height: auto;
    aspect-ratio: var(--at-tile-ratio, 4/5);
  }
  .atelier .tile-body {
    padding: 14px 2px 10px;
  }
  .atelier .tile-body h3 {
    font-size: 19px;
    min-height: 48px;
  }
  .atelier .tile-body small {
    font-size: 8px;
    letter-spacing: 1.25px;
  }
  .atelier .week-grid {
    grid-template-columns: repeat(7, 155px);
    gap: 11px;
  }
  .atelier .day {
    min-height: 177px;
  }
  .atelier .shopping-card,
  .atelier .today-panel {
    padding: 18px;
  }
  .atelier .modal {
    width: 100%;
    max-height: 95dvh;
    border-radius: 20px;
  }
  .atelier .modal.large {
    width: 100%;
  }
  .atelier .modal-content {
    padding: 27px 23px;
  }
  .atelier .modal-hero {
    height: 260px;
  }
  .atelier .detail-cols {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .atelier .modal .modal-content > h2 {
    font-size: 36px;
  }
  .atelier .cook-layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }
  .atelier .cook-visual {
    min-height: 210px;
    height: 210px;
  }
  .atelier .cook-visual .cook-brand {
    font-size: 20px;
    left: 20px;
    bottom: 14px;
  }
  .atelier .cook-content {
    padding: 30px 24px 33px;
    gap: 20px;
  }
  .atelier .cook-stage {
    min-height: 190px;
  }
  .atelier .cook-stage h2 {
    font-size: 30px;
  }
  .atelier .cook-actions .btn {
    min-width: 110px;
  }
  .atelier .editor-card {
    padding: 20px;
  }
  .atelier .editor-card h3 {
    font-size: 24px;
  }
  .atelier .editor-footer {
    margin: 0 -20px -20px;
    padding: 15px 20px;
  }
  .atelier .print-paper {
    transform: none;
  }
}
@media (max-width: 390px) {
  .atelier .nav button {
    min-width: 52px;
    font-size: 9px;
  }
  .atelier .main {
    padding: 20px 15px 45px;
  }
  .atelier .recipe-grid.is-featured {
    margin-right: -15px;
    padding-right: 15px;
  }
  .atelier .hero {
    height: 294px;
    min-height: 294px;
  }
  .atelier .hero h2 {
    font-size: 29px;
  }
  .atelier .stat strong {
    font-size: 19px;
  }
  .atelier .tile-body h3 {
    font-size: 18px;
  }
}

.atelier .print-paper .paper-preview-row {
  height: auto;
  min-height: 0;
  width: auto;
  background: transparent;
  border-radius: 0;
  color: #263f30;
  font-size: 9px;
  line-height: 1.45;
  border-bottom: 1px solid #e5e9e2;
  padding: 4px 0;
  overflow-wrap: anywhere;
}
.atelier .print-paper .paper-preview-row b {
  font-family: Georgia, serif;
  color: #70947d;
}
.atelier .cook-actions .btn[data-action="cook-back"] svg {
  transform: rotate(180deg);
}

/* Recipe instructions use Mealie's section and step-summary fields when present. */
.atelier .detail-instructions {
  min-width: 0;
}
.atelier .detail-instructions > h3 {
  margin-bottom: 13px;
}
.atelier .recipe-steps {
  display: grid;
  gap: 13px;
}
.atelier .recipe-step-row {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.atelier .step-section {
  padding: 8px 0 1px;
  font: italic 19px/1.25 var(--at-serif);
  font-weight: 400;
  color: var(--ds-brand);
}
.atelier .detail-cols .step {
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  min-height: 0;
  padding: 15px;
  border: 1px solid var(--at-line);
  border-radius: 14px;
  background: var(--at-panel);
  text-align: left;
  transition:
    background var(--at-fast),
    border-color var(--at-fast),
    transform var(--at-fast);
}
.atelier .detail-cols .step:hover,
.atelier .detail-cols .step:focus-visible {
  border-color: color-mix(in srgb, var(--at-accent) 42%, var(--at-line));
  background: var(--at-panel2);
}
.atelier .detail-cols .step:hover {
  transform: translateY(-1px);
}
.atelier .detail-cols .step:focus-visible {
  outline: 2px solid var(--at-accent);
  outline-offset: 3px;
}
.atelier .detail-cols .step:active {
  transform: scale(0.995);
}
.atelier .detail-cols .step-number {
  flex: 0 0 35px;
  width: 35px;
  height: 35px;
  border: 1px solid var(--at-line);
  background: var(--at-panel2);
  font-size: 13px;
}
.atelier .step-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding-top: 1px;
}
.atelier .step-summary {
  font-family: var(--at-serif);
  font-size: 17px;
  line-height: 1.3;
  font-weight: 500;
  color: var(--at-ink);
}
.atelier .step-text {
  display: block;
  white-space: pre-line;
  overflow-wrap: anywhere;
  color: var(--at-sub);
  font-size: 13px;
  line-height: 1.65;
}
.atelier .step-photos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 8px;
  width: 100%;
  margin-top: 11px;
}
.atelier .step-photo {
  display: block;
  width: 100%;
  height: auto;
  max-height: 230px;
  aspect-ratio: 1.65;
  object-fit: cover;
  border: 1px solid var(--at-line);
  border-radius: 10px;
  background: var(--at-panel2);
}
.atelier .detail-cols .step.active {
  border-color: color-mix(in srgb, var(--at-accent) 54%, var(--at-line));
  background: color-mix(in srgb, var(--at-accent) 8%, var(--at-panel));
}
.atelier .detail-cols .step.active .step-text {
  color: var(--at-ink);
}
.atelier .cook-step-section {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--ds-brand);
  font-weight: 760;
}
.atelier .cook-stage .cook-step-detail {
  max-width: 620px;
  color: var(--at-sub);
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.atelier .cook-step-figure {
  width: min(100%, 680px);
  margin: 6px 0 0;
  overflow: hidden;
  border: 1px solid var(--at-line);
  border-radius: 17px;
  background: var(--at-panel2);
  box-shadow: 0 13px 32px rgba(0, 0, 0, 0.12);
}
.atelier .cook-step-photo {
  display: block;
  width: 100%;
  height: clamp(170px, 38vw, 300px);
  max-height: 300px;
  aspect-ratio: 3/2;
  object-fit: cover;
  object-position: center 45%;
}
@media (max-width: 760px) {
  .atelier .recipe-steps {
    gap: 11px;
  }
  .atelier .detail-cols .step {
    gap: 11px;
    padding: 13px;
  }
  .atelier .detail-cols .step-number {
    flex-basis: 32px;
    width: 32px;
    height: 32px;
  }
  .atelier .step-summary {
    font-size: 16px;
  }
  .atelier .step-text {
    font-size: 14px;
  }
  .atelier .step-photos {
    grid-template-columns: 1fr;
    gap: 7px;
    margin-top: 9px;
  }
  .atelier .step-photo {
    max-height: 220px;
    aspect-ratio: 1.7;
  }
  .atelier .cook-stage .cook-step-detail {
    font-size: 14px;
  }
  .atelier .cook-step-figure {
    border-radius: 13px;
  }
  .atelier .cook-step-photo {
    height: clamp(170px, 48vw, 240px);
    max-height: 240px;
  }
}

/* v0.5 — Atelier Nutrition & the kitchen companion. */
.atelier .nutrition-studio .editor-lead h2,
.atelier .journal-studio h2 {
  font-family: var(--at-serif);
  font-size: clamp(31px, 3.4vw, 49px);
  letter-spacing: -1.7px;
  font-weight: 500;
}
.atelier .nutri-header {
  background: linear-gradient(120deg, rgba(157, 203, 178, 0.2), rgba(157, 203, 178, 0.035));
  border: 1px solid var(--at-line);
  padding: 22px 25px;
  border-radius: 22px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 18px;
  margin: 8px 0 19px;
}
.atelier .nutri-header .nutri-eyebrow {
  font-family: var(--at-serif);
  font-size: 24px;
  grid-row: span 2;
  max-width: 520px;
}
.atelier .nutri-header strong {
  font-family: var(--at-serif);
  font-size: 30px;
  color: var(--ds-brand);
  text-align: right;
  font-weight: 400;
}
.atelier .nutri-header span {
  font-size: 11px;
  color: var(--at-sub);
  text-align: right;
}
.atelier .nutri-alert {
  padding: 12px 16px;
  border: 1px solid rgba(235, 181, 111, 0.4);
  background: rgba(235, 181, 111, 0.07);
  color: var(--at-ink);
  font-size: 12px;
  line-height: 1.6;
  border-radius: 13px;
  margin-bottom: 12px;
}
.atelier .nutri-tools {
  display: flex;
  gap: 13px;
  align-items: center;
  flex-wrap: wrap;
  padding: 4px 0 21px;
}
.atelier .nutri-tools span {
  font-size: 11px;
  color: var(--at-sub);
  max-width: 330px;
  line-height: 1.5;
}
.atelier .nutri-table {
  display: grid;
  gap: 10px;
}
.atelier .nutri-table > .eyebrow {
  margin: 5px 0 10px;
}
.atelier .nutri-row {
  background: var(--at-panel);
  border: 1px solid var(--at-line);
  border-radius: 18px;
  padding: 17px 19px;
  display: grid;
  gap: 13px;
}
.atelier .nutri-row-head {
  display: flex;
  gap: 12px;
  align-items: center;
}
.atelier .nutri-number {
  font-family: var(--at-serif);
  font-size: 19px;
  color: var(--ds-brand);
}
.atelier .nutri-row-head > strong {
  font-size: 13px;
  line-height: 1.4;
  font-weight: 650;
  flex: 1;
}
.atelier .nutri-state {
  border: 1px solid var(--at-line);
  color: var(--at-sub);
  padding: 5px 9px;
  font-size: 10px;
  border-radius: 100px;
  white-space: nowrap;
}
.atelier .nutri-state.matched {
  border-color: rgba(157, 203, 178, 0.45);
  background: rgba(157, 203, 178, 0.1);
  color: var(--ds-brand);
}
.atelier .nutri-row-fields {
  display: grid;
  grid-template-columns: 118px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
}
.atelier .nutri-row-fields label {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.atelier .nutri-row-fields label span {
  font-size: 10px;
  color: var(--at-sub);
  font-weight: 650;
  letter-spacing: 0.2px;
}
.atelier .nutri-row-fields input {
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--at-line);
  background: var(--at-surface);
  border-radius: 10px;
  color: var(--at-ink);
  font-size: 12px;
  min-height: 40px;
}
.atelier .nutri-row-fields .btn {
  min-height: 40px;
  white-space: nowrap;
}
.atelier .nutri-source {
  border-radius: 10px;
  padding: 10px 13px;
  color: var(--at-ink);
  font-size: 11px;
  background: rgba(157, 203, 178, 0.08);
}
.atelier .nutri-source small {
  display: block;
  color: var(--at-sub);
  padding: 3px 0 0 16px;
}
.atelier .nutri-choices {
  display: grid;
  gap: 6px;
  padding: 3px 0;
}
.atelier .nutri-choices button {
  background: var(--at-panel2);
  border: 1px solid var(--at-line);
  color: var(--at-ink);
  text-align: left;
  border-radius: 11px;
  padding: 12px 13px;
  cursor: pointer;
}
.atelier .nutri-choices button:hover {
  border-color: var(--ds-brand);
}
.atelier .nutri-choices strong {
  display: block;
  font-size: 12px;
  font-weight: 650;
}
.atelier .nutri-choices small {
  display: block;
  font-size: 11px;
  color: var(--at-sub);
  padding-top: 3px;
}
.atelier .nutri-result {
  margin: 23px 0;
  padding: 24px;
  background: var(--at-panel2);
  border-radius: 21px;
}
.atelier .nutri-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}
.atelier .nutri-stat {
  background: var(--at-panel);
  border: 1px solid var(--at-line);
  border-radius: 13px;
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  min-height: 100px;
  gap: 4px;
}
.atelier .nutri-stat span {
  color: var(--at-sub);
  font-size: 10px;
}
.atelier .nutri-stat strong {
  color: var(--at-ink);
  font-family: var(--at-serif);
  font-size: 30px;
  font-weight: 400;
  line-height: 1.1;
}
.atelier .nutri-stat small {
  font-size: 11px;
  color: var(--at-sub);
}
.atelier .nutri-subnote {
  font-size: 11px;
  line-height: 1.6;
  color: var(--at-sub);
  margin-top: 15px;
}
.atelier .nutri-provenance {
  font-size: 11px;
  line-height: 1.9;
  color: var(--at-sub);
  margin: 11px 0 18px;
}
.atelier .nutri-provenance strong {
  color: var(--at-ink);
}
.atelier .nutri-provenance a {
  color: var(--ds-brand);
  margin-left: 8px;
}
.atelier .nutri-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  padding: 6px 0 12px;
}
.atelier .nutri-current,
.atelier .journal-hint {
  margin: 16px 0 12px;
  border: 1px solid var(--at-line);
  border-radius: 12px;
  padding: 12px 16px;
  background: var(--at-panel2);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
}
.atelier .nutri-current span,
.atelier .journal-hint span {
  color: var(--ds-brand);
  font-size: 11px;
  font-weight: 750;
}
.atelier .nutri-current strong,
.atelier .journal-hint strong {
  color: var(--at-ink);
  font-size: 12px;
  font-weight: 600;
}
.atelier .cook-note {
  border-left: 2px solid var(--at-accent);
  padding: 10px 12px;
  margin-top: 13px;
  font-size: 11px;
  color: var(--at-ink);
  display: flex;
  gap: 8px;
  line-height: 1.5;
}
.atelier .journal-studio .editor-card {
  margin-top: 22px;
}
@media (max-width: 700px) {
  .atelier .nutri-row-fields {
    grid-template-columns: 112px 1fr;
  }
  .atelier .nutri-row-fields .btn {
    grid-column: 1/-1;
    justify-content: center;
  }
  .atelier .nutri-header {
    padding: 16px;
    grid-template-columns: 1fr auto;
  }
  .atelier .nutri-header .nutri-eyebrow {
    font-size: 19px;
  }
  .atelier .nutri-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atelier .nutri-result {
    padding: 16px;
  }
  .atelier .nutri-row {
    padding: 13px;
  }
  .atelier .nutri-row-head {
    gap: 8px;
  }
  .atelier .nutri-actions > * {
    flex: 1;
    min-width: 112px;
  }
  .atelier .cook-utility {
    padding: 13px;
  }
}

/* Atelier 0.6 · Kitchen Intelligence — premium, responsive and reduced-motion friendly. */
.atelier .studio-daily {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 23px 26px;
  margin: 0 0 26px;
  background: linear-gradient(
    115deg,
    color-mix(in srgb, var(--at-panel) 83%, var(--at-accent)),
    var(--at-panel2)
  );
  border: 1px solid var(--at-line);
  border-radius: var(--at-radius);
}
.atelier .studio-daily h2 {
  font-family: Georgia, serif;
  font-size: clamp(22px, 2.6vw, 30px);
  line-height: 1.1;
  font-weight: 400;
  margin: 12px 0 8px;
  letter-spacing: -0.5px;
}
.atelier .studio-daily p,
.atelier .studio-top p {
  color: var(--at-sub);
  font-size: 13px;
  line-height: 1.65;
  max-width: 670px;
  margin: 0;
}
.atelier .studio-daily-actions,
.atelier .studio-actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  align-items: center;
}
.atelier .studio-top {
  padding: 12px 0 32px;
}
.atelier .studio-top h1 {
  font:
    normal clamp(34px, 4.7vw, 62px) / 1.03 Georgia,
    serif;
  letter-spacing: -2px;
  margin: 13px 0 14px;
  max-width: 940px;
}
.atelier .studio-top .eyebrow {
  letter-spacing: 2.3px;
}
.atelier .studio-grid {
  display: grid;
  gap: 20px;
  margin-bottom: 20px;
}
.atelier .studio-grid-main {
  grid-template-columns: 1fr 1.2fr;
}
.atelier .studio-panel {
  background: var(--at-panel);
  border: 1px solid var(--at-line);
  border-radius: 22px;
  padding: 24px 27px;
  min-width: 0;
  margin-bottom: 18px;
}
.atelier .studio-grid > .studio-panel {
  margin-bottom: 0;
}
.atelier .studio-panel h2,
.atelier .studio-panel h3 {
  font-weight: 500;
  letter-spacing: -0.7px;
  line-height: 1.15;
}
.atelier .studio-panel h2 {
  font-family: Georgia, serif;
  font-size: clamp(23px, 2vw, 30px);
  margin: 9px 0 13px;
}
.atelier .studio-panel h3 {
  font-size: 14px;
  margin: 22px 0 12px;
  font-weight: 750;
  letter-spacing: -0.3px;
}
.atelier .studio-panel p {
  font-size: 12px;
  line-height: 1.7;
  color: var(--at-sub);
}
.atelier .studio-head {
  margin-bottom: 19px;
}
.atelier .studio-head .eyebrow {
  letter-spacing: 1.5px;
}
.atelier .studio-form {
  display: grid;
  gap: 13px;
  margin: 14px 0;
}
.atelier .studio-form > label,
.atelier .studio-formline > label {
  min-width: 0;
  display: grid;
  gap: 7px;
  color: var(--at-sub);
  font-size: 11px;
  font-weight: 650;
}
.atelier .studio-formline {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: end;
}
.atelier .studio-form input:not([type="checkbox"]),
.atelier .studio-form select {
  width: 100%;
  min-width: 0;
  height: 43px;
  padding: 10px 12px;
  border-radius: 11px;
  border: 1px solid var(--at-line);
  background: var(--at-surface);
  color: var(--at-ink);
  font-size: 13px;
  outline-offset: 3px;
  box-sizing: border-box;
}
.atelier .studio-form .studio-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.5;
}
.atelier .studio-muted {
  font-size: 11px !important;
  color: var(--at-sub);
  line-height: 1.65;
}
.atelier .studio-warning {
  padding: 12px 15px;
  background: color-mix(in srgb, #d59b6d 12%, var(--at-panel));
  border: 1px solid color-mix(in srgb, #d59b6d 40%, var(--at-line));
  border-radius: 12px;
  margin-bottom: 15px;
  font-size: 12px;
}
.atelier .studio-suggestion {
  display: grid;
  grid-template-columns: 79px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--at-line);
}
.atelier .studio-suggestion-photo {
  height: 79px;
  overflow: hidden;
  border-radius: 12px;
  background: var(--at-panel2);
}
.atelier .studio-suggestion-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.atelier .studio-suggestion-copy {
  min-width: 0;
}
.atelier .studio-suggestion-copy small {
  color: var(--ds-brand);
  font-size: 10px;
  display: block;
  margin-bottom: 7px;
}
.atelier .studio-suggestion-copy strong {
  font:
    normal 19px/1.24 Georgia,
    serif;
  display: block;
}
.atelier .studio-suggestion-copy p {
  font-size: 10px;
  line-height: 1.5;
  margin: 7px 0 0;
}
.atelier .studio-plan-list {
  margin-top: 20px;
  border-top: 1px solid var(--at-line);
}
.atelier .studio-plan-row {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 15px;
  padding: 13px 0;
  border-bottom: 1px solid var(--at-line);
}
.atelier .studio-plan-row > span strong {
  display: block;
  font-size: 13px;
}
.atelier .studio-plan-row > span small {
  font-size: 10px;
  color: var(--at-sub);
}
.atelier .studio-plan-row b {
  font-weight: 700;
  font-size: 13px;
}
.atelier .studio-plan-row p {
  margin: 5px 0;
  font-size: 10px;
}
.atelier .studio-pantry-list {
  max-height: 340px;
  overflow: auto;
  margin-top: 12px;
}
.atelier .studio-pantry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--at-line);
  padding: 10px 0;
}
.atelier .studio-pantry-row strong,
.atelier .studio-pantry-row small {
  display: block;
}
.atelier .studio-pantry-row strong {
  font-size: 12px;
}
.atelier .studio-pantry-row small {
  font-size: 10px;
  color: var(--at-sub);
  margin-top: 3px;
}
.atelier .studio-pantry-row > div:last-child {
  display: flex;
  align-items: center;
  gap: 6px;
}
.atelier .studio-group {
  margin: 16px 0;
}
.atelier .studio-group h3 {
  color: var(--ds-brand);
  font-size: 11px;
  letter-spacing: 1px;
  border-bottom: 1px solid var(--at-line);
  padding-bottom: 9px;
}
.atelier .studio-grocery-line {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 9px 0;
  font-size: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--at-line) 75%, transparent);
}
.atelier .studio-grocery-line strong {
  white-space: nowrap;
}
.atelier .studio-member,
.atelier .studio-timer-row,
.atelier .studio-task {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--at-line);
  padding: 11px 0;
  font-size: 12px;
}
.atelier .studio-member > span {
  display: flex;
  align-items: center;
  gap: 9px;
}
.atelier .studio-member small {
  color: var(--ds-brand);
  font-size: 10px;
}
.atelier .studio-task > span {
  flex: 1;
  line-height: 1.4;
}
.atelier .studio-task small {
  color: var(--at-sub);
}

.atelier .studio-step-badge {
  display: inline-block;
  background: var(--at-panel2);
  border-radius: 25px;
  padding: 10px 16px;
}
.atelier .studio-book-list {
  max-height: 470px;
  overflow: auto;
  margin: 15px 0;
}
.atelier .studio-book-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--at-line);
  font-size: 12px;
}
.atelier .studio-audit {
  margin: 16px 0;
  padding: 13px;
  border-radius: 13px;
  border: 1px solid var(--at-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  background: var(--at-panel2);
  font-size: 11px;
}
.atelier .studio-audit span {
  flex: 1;
  min-width: 170px;
  color: var(--at-sub);
}
.atelier .studio-audit strong {
  color: var(--ds-brand);
}
.atelier .studio-cook-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 14px;
  align-items: center;
}
.atelier .studio-cook-tools .btn {
  font-size: 11px;
}
.atelier .studio-shared-note {
  font-size: 10px;
  color: var(--ds-brand);
  letter-spacing: 0.5px;
}
.atelier .studio-swap {
  margin: 9px 0;
  padding: 12px;
  border-radius: 11px;
  border: 1px solid var(--at-line);
  font-size: 12px;
  line-height: 1.65;
  color: var(--at-ink);
}
.atelier .studio-form button,
.atelier .studio-actions button {
  min-height: 40px;
}
@media (max-width: 1100px) {
  .atelier .studio-grid-main {
    grid-template-columns: 1fr 1fr;
  }
  .atelier .studio-panel {
    padding: 19px;
  }
}
@media (max-width: 800px) {
  .atelier .studio-grid-main {
    grid-template-columns: 1fr;
  }
  .atelier .studio-panel {
    padding: 21px;
  }
  .atelier .studio-top h1 {
    font-size: 38px;
  }
  .atelier .studio-daily {
    padding: 17px;
  }
  .atelier .studio-daily-actions {
    width: 100%;
  }
}
@media (max-width: 420px) {
  .atelier .studio-top h1 {
    font-size: 34px;
  }
  .atelier .studio-suggestion {
    grid-template-columns: 64px 1fr auto;
    gap: 9px;
  }
  .atelier .studio-suggestion-photo {
    height: 64px;
  }
  .atelier .studio-suggestion-copy strong {
    font-size: 16px;
  }
  .atelier .studio-formline {
    grid-template-columns: 1fr;
  }
  .atelier .studio-plan-row {
    grid-template-columns: 65px 1fr;
  }
  .atelier .studio-panel {
    padding: 17px;
  }
}

.atelier .studio-audit-details {
  margin: 10px 0 22px;
  border: 1px solid var(--at-line);
  border-radius: 13px;
  padding: 16px;
  background: var(--at-panel2);
}
.atelier .studio-audit-details strong {
  color: var(--ds-brand);
}
.atelier .studio-audit-details p {
  font-size: 12px;
  color: var(--at-ink);
  line-height: 1.6;
}
.atelier .studio-audit-details small {
  color: var(--at-sub);
}

/* Kiosk mode affects this card only. Hiding HA chrome is the kiosk browser's job. */
.atelier.kiosk {
  border: 0;
  border-radius: 0;
  box-shadow: none;
  min-height: 95vh;
}
.atelier.kiosk .shell {
  display: flex;
  flex-direction: column;
}
.atelier.kiosk .sidebar {
  min-height: 0;
  border-right: 0;
  border-bottom: 1px solid var(--at-line);
  padding: 12px 18px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  overflow: hidden;
}
.atelier.kiosk .identity {
  padding: 0;
  flex-shrink: 0;
}
.atelier.kiosk .nav-label,
.atelier.kiosk .sidebar .sidebar-footer {
  display: none;
}
.atelier.kiosk .nav {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: thin;
  scroll-snap-type: x proximity;
}
.atelier.kiosk .nav button {
  flex-shrink: 0;
  scroll-snap-align: start;
  min-height: 49px;
  font-size: 14px;
  padding: 12px 17px;
}
.atelier.kiosk .main {
  width: 100%;
  max-width: 1900px;
  margin: auto;
}
.atelier.kiosk .cook-step-text {
  font-size: clamp(23px, 3vw, 37px);
}
.atelier.kiosk .cook-action,
.atelier.kiosk .studio-cook-tools .btn {
  min-height: 48px;
}
@media (max-width: 780px) {
  .atelier.kiosk .sidebar {
    flex-wrap: wrap;
    gap: 6px;
  }
  .atelier.kiosk .identity {
    width: 100%;
  }
  .atelier.kiosk .nav {
    width: 100%;
  }
  .atelier.kiosk .nav button {
    font-size: 12px;
  }
  .atelier.kiosk .studio-daily {
    padding: 15px;
  }
}

/* Atelier 0.7 — a purposeful motion language, premium surfaces, responsive interaction.
   Animations use opacity/transform; no infinite page animation and no motion when reduced. */
:host {
  color-scheme: dark;
  --at-ease: var(--ds-motion-ease);
  --at-spring: var(--ds-motion-spring);
  --at-fast: var(--ds-motion-fast);
  --at-medium: var(--ds-motion-enter);
  --at-slow: var(--ds-motion-slow);
}
.atelier.light {
  --at-focus: color-mix(in srgb, var(--at-accent) 76%, #2b2028);
}
.atelier {
  --at-focus: color-mix(in srgb, var(--at-accent) 65%, white);
  font-size: 14px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  background-image:
    radial-gradient(
      ellipse 75% 28% at 76% 0%,
      color-mix(in srgb, var(--at-accent) 4%, transparent),
      transparent
    ),
    linear-gradient(180deg, var(--at-surface), var(--at-surface));
}
.atelier .main {
  position: relative;
}
.atelier .view-stage {
  min-width: 0;
  min-height: 240px;
  position: relative;
  isolation: isolate;
}
.atelier .view-stage.is-entering {
  animation: at-view-enter var(--ds-motion-slow) var(--at-ease) backwards;
}
.atelier .view-stage.is-theme-entering {
  animation: at-theme-enter var(--ds-motion-enter) var(--at-ease) backwards;
}
@keyframes at-theme-enter {
  from {
    opacity: 0.35;
    filter: blur(1px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}
/* Fill "backwards" only: a held end frame (blur 0, translate3d) keeps a composited layer and softens text in Safari. */
@keyframes at-view-enter {
  from {
    opacity: 0.35;
    transform: translate3d(0, 15px, 0);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    filter: blur(0);
  }
}
@keyframes at-dialog-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 24px, 0) scale(0.973);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
@keyframes at-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes at-toast-in {
  from {
    opacity: 0;
    transform: translate3d(0, 15px, 0) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
@keyframes at-check-pop {
  0% {
    transform: scale(0.65);
  }
  65% {
    transform: scale(1.13);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes at-shimmer {
  from {
    background-position: 130% 0;
  }
  to {
    background-position: -130% 0;
  }
}
@keyframes at-celebrate {
  0% {
    transform: translateY(9px) scale(0.92);
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  100% {
    transform: translateY(-20px) scale(1.12);
    opacity: 0;
  }
}
/* Native-feeling control interaction and tactile focus states. */
.atelier button {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.atelier button,
.atelier a,
.atelier input,
.atelier textarea,
.atelier select {
  transition-duration: var(--at-fast);
  transition-timing-function: var(--at-ease);
}
.atelier button:active:not(:disabled) {
  transform: translateY(1px) scale(0.985);
}
.atelier button:focus-visible,
.atelier a:focus-visible,
.atelier input:focus-visible,
.atelier select:focus-visible,
.atelier textarea:focus-visible {
  outline: 2px solid var(--at-focus);
  outline-offset: 3px;
}
.atelier .btn {
  position: relative;
  overflow: hidden;
  transition:
    transform var(--at-fast) var(--at-ease),
    background var(--at-fast),
    border-color var(--at-fast),
    box-shadow var(--at-medium),
    color var(--at-fast);
  font-size: 13px;
  letter-spacing: 0.05px;
}
.atelier .btn.primary {
  box-shadow: 0 7px 24px color-mix(in srgb, var(--at-accent) 15%, transparent);
}
.atelier .btn.primary:hover:not(:disabled) {
  box-shadow: 0 11px 28px color-mix(in srgb, var(--at-accent) 27%, transparent);
  filter: brightness(1.055);
  transform: translateY(-2px);
}
.atelier .btn.ghost:hover:not(:disabled),
.atelier .btn:not(.primary):hover:not(:disabled) {
  box-shadow: 0 7px 25px rgba(0, 0, 0, 0.11);
}
.atelier .icon-btn {
  transition:
    background var(--at-fast),
    transform var(--at-fast),
    border-color var(--at-fast),
    color var(--at-fast);
}
.atelier .icon-btn:hover {
  color: var(--ds-brand);
  border-color: color-mix(in srgb, var(--at-accent) 42%, var(--at-line));
}
.atelier .icon-btn:active {
  transform: scale(0.92);
}
.atelier .nav button {
  position: relative;
  transition:
    color var(--at-fast),
    background var(--at-fast),
    transform var(--at-medium) var(--at-ease),
    box-shadow var(--at-medium);
}
.atelier .nav button.active {
  background: linear-gradient(
    100deg,
    color-mix(in srgb, var(--at-accent) 22%, transparent),
    color-mix(in srgb, var(--at-accent) 8%, transparent)
  );
  box-shadow:
    inset 2px 0 0 var(--at-accent),
    0 8px 20px rgba(1, 14, 9, 0.12);
}
.atelier .nav button.active svg {
  color: var(--ds-brand);
}
.atelier .nav button:hover:not(.active) {
  transform: translateX(3px);
}
.atelier .sidebar {
  background-image:
    radial-gradient(ellipse 120% 32% at 45% -3%, rgba(150, 200, 167, 0.095), transparent),
    linear-gradient(180deg, #131c17, #101715 72%, #0d1512);
}
.atelier.light .sidebar {
  background-image: linear-gradient(180deg, var(--ds-sidebar-start), var(--ds-sidebar-end));
}
.atelier .identity .logo {
  position: relative;
  isolation: isolate;
}
.atelier .identity .logo:after {
  content: "";
  position: absolute;
  inset: -5px;
  border: 1px solid color-mix(in srgb, var(--at-accent) 26%, transparent);
  border-radius: inherit;
  pointer-events: none;
}
.atelier .topbar {
  position: relative;
  z-index: 2;
}
.atelier .command-launch {
  width: auto;
  min-width: 122px;
  height: 38px;
  border: 1px solid var(--at-line);
  border-radius: 999px;
  background: var(--at-panel);
  color: var(--at-sub);
  font-size: 11px;
  font-weight: 650;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 11px 0 14px;
  transition: all var(--at-fast);
}
.atelier .command-launch:hover {
  color: var(--at-ink);
  border-color: color-mix(in srgb, var(--at-accent) 32%, var(--at-line));
  background: var(--at-panel2);
}
.atelier .shortcut {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.3px;
  padding: 3px 6px;
  background: var(--at-panel2);
  border: 1px solid var(--at-line);
  border-radius: 6px;
  white-space: nowrap;
  color: var(--at-sub);
}
.atelier .intro h1,
.atelier .studio-top h1 {
  max-width: 940px;
  text-wrap: balance;
}
.atelier .studio-top {
  position: relative;
  isolation: isolate;
}
.atelier .studio-top:before {
  content: "";
  position: absolute;
  left: -30px;
  top: -28px;
  width: 270px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse,
    color-mix(in srgb, var(--at-accent) 9%, transparent),
    transparent 71%
  );
  z-index: -1;
  pointer-events: none;
}
.atelier .studio-top p {
  font-size: 14px;
  line-height: 1.7;
  max-width: 750px;
}
.atelier .studio-daily {
  position: relative;
  overflow: hidden;
  box-shadow: 0 14px 35px rgba(0, 0, 0, 0.055);
}
.atelier .studio-daily:after {
  content: "";
  position: absolute;
  inset: -60% -25% auto auto;
  width: 320px;
  height: 300px;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--at-accent) 14%, transparent),
    transparent 65%
  );
  pointer-events: none;
}
.atelier .studio-daily h2 {
  font-size: clamp(26px, 3.2vw, 38px);
}
.atelier .studio-panel,
.atelier .today-panel,
.atelier .shopping-card,
.atelier .editor-card,
.atelier .nutri-row,
.atelier .manage-card {
  position: relative;
  transition:
    border-color var(--at-medium),
    background var(--at-medium),
    box-shadow var(--at-medium),
    transform var(--at-medium) var(--at-ease);
  border-color: color-mix(in srgb, var(--at-line) 90%, transparent);
}
.atelier .studio-panel {
  background: linear-gradient(
    155deg,
    color-mix(in srgb, var(--at-panel) 96%, var(--at-accent)),
    var(--at-panel) 70%
  );
  box-shadow: 0 15px 32px rgba(0, 0, 0, 0.047);
  border-radius: 25px;
}
.atelier .studio-panel:before {
  content: "";
  position: absolute;
  inset: 0 18px auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--at-accent) 14%, transparent),
    transparent
  );
  pointer-events: none;
}
.atelier .studio-suggestion {
  transition:
    background var(--at-fast),
    padding var(--at-fast),
    border-radius var(--at-fast);
  border-radius: 12px;
}
.atelier .studio-suggestion:hover {
  background: color-mix(in srgb, var(--at-accent) 6%, transparent);
  padding-inline: 8px;
}
.atelier .studio-suggestion-photo {
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.13);
}
.atelier .studio-suggestion-photo img {
  transition:
    transform var(--at-slow) var(--at-ease),
    filter var(--at-slow);
}
.atelier .studio-suggestion:hover img {
  transform: scale(1.07);
  filter: saturate(1.1);
}
.atelier .studio-suggestion-copy small {
  font-size: 11px;
  line-height: 1.45;
}
.atelier .studio-suggestion-copy p {
  font-size: 11px;
  line-height: 1.55;
}
.atelier .studio-suggestion-copy strong {
  font-size: clamp(19px, 1.65vw, 23px);
}
.atelier .studio-panel p,
.atelier .studio-muted {
  font-size: 13px;
  line-height: 1.68;
}
.atelier .studio-form > label,
.atelier .studio-formline > label,
.atelier .field > span {
  font-size: 12px;
  line-height: 1.35;
}
.atelier input:not([type="checkbox"]),
.atelier select,
.atelier textarea {
  border-color: color-mix(in srgb, var(--at-line) 90%, transparent);
  transition:
    border-color var(--at-fast),
    background var(--at-fast),
    box-shadow var(--at-fast),
    transform var(--at-fast);
}
.atelier input:not([type="checkbox"]):hover,
.atelier select:hover,
.atelier textarea:hover {
  border-color: color-mix(in srgb, var(--at-accent) 35%, var(--at-line));
}
.atelier input:not([type="checkbox"]):focus,
.atelier select:focus,
.atelier textarea:focus {
  border-color: color-mix(in srgb, var(--at-accent) 65%, var(--at-line));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--at-accent) 12%, transparent);
}
.atelier input::placeholder,
.atelier textarea::placeholder {
  color: color-mix(in srgb, var(--at-sub) 85%, transparent);
}
.atelier .hero {
  transition: box-shadow var(--at-medium);
  box-shadow: 0 16px 48px rgba(3, 12, 8, 0.22);
}
.atelier .hero:focus-within,
.atelier .hero:hover {
  box-shadow: 0 24px 65px rgba(3, 12, 8, 0.3);
}
.atelier .hero .hero-food {
  transition:
    transform var(--ds-motion-image-long) var(--at-ease),
    filter var(--at-slow);
}
.atelier .hero:hover .hero-food {
  transform: scale(1.035);
  filter: saturate(1.06);
}
.atelier .hero .hero-copy > * {
  position: relative;
}
.atelier .recipe-tile {
  transition:
    transform var(--at-medium) var(--at-ease),
    filter var(--at-medium),
    box-shadow var(--at-medium);
}
.atelier .recipe-tile:hover {
  transform: translateY(-6px);
}
.atelier .recipe-tile:hover .tile-image {
  box-shadow: 0 15px 37px rgba(0, 0, 0, 0.24);
}
.atelier .tile-image {
  transition: box-shadow var(--at-medium);
  background: #26382e;
}
.atelier .tile-image:after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 55%, rgba(7, 16, 13, 0.23));
}
.atelier .tile-image img {
  transition:
    transform var(--ds-motion-image) var(--at-ease),
    filter var(--ds-motion-image) var(--at-ease);
}
.atelier .recipe-tile:hover .tile-image img {
  transform: scale(1.075);
  filter: saturate(1.11);
}
.atelier .tile-body h3 {
  line-height: 1.19;
}
.atelier .tile-open {
  transition:
    transform var(--at-medium) var(--at-ease),
    background var(--at-fast);
}
.atelier .recipe-tile:hover .tile-open {
  transform: translateX(3px);
}
.atelier .week-grid {
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
}
.atelier .week-grid > .day {
  scroll-snap-align: start;
  transition:
    transform var(--at-medium),
    border-color var(--at-medium),
    background var(--at-medium);
}
.atelier .week-grid > .day:hover {
  border-color: color-mix(in srgb, var(--at-accent) 33%, var(--at-line));
  transform: translateY(-2px);
}
.atelier .day-meal {
  transition:
    background var(--at-fast),
    transform var(--at-fast);
}
.atelier .day-meal:hover {
  background: color-mix(in srgb, var(--at-accent) 12%, var(--at-panel));
}
.atelier .shopping-row {
  transition:
    background var(--at-fast),
    opacity var(--at-fast);
}
.atelier .shopping-row:hover {
  background: color-mix(in srgb, var(--at-accent) 6%, transparent);
}
.atelier .shopping-row.checked {
  opacity: 0.68;
}
.atelier .shopping-row.checked .shopping-name {
  text-decoration: line-through;
  text-decoration-color: var(--at-sub);
  text-decoration-thickness: 1px;
}
.atelier .modal-backdrop {
  background: rgba(5, 13, 10, 0.74);
  backdrop-filter: blur(12px) saturate(0.78);
  animation: at-backdrop-in var(--ds-motion-base) var(--at-ease) both;
}
.atelier .modal {
  animation: at-dialog-enter var(--ds-motion-enter) var(--at-spring) both;
  box-shadow: var(--ds-shadow-dialog);
}
.atelier .modal-close {
  z-index: 5;
}
.atelier .modal .cook-layout {
  min-height: min(780px, 82vh);
}
.atelier .cook-stage h2 {
  animation: at-view-enter var(--ds-motion-enter) var(--at-ease) backwards;
  text-wrap: pretty;
}
.atelier .cook-fill {
  transition: width var(--ds-motion-slow) var(--at-ease);
  box-shadow: 0 0 16px color-mix(in srgb, var(--at-accent) 35%, transparent);
}
.atelier .cook-visual img {
  transition: transform var(--ds-motion-image-long) var(--at-ease);
}
.atelier .cook-visual:hover img {
  transform: scale(1.04);
}
.atelier .nutri-row:hover,
.atelier .editor-card:focus-within {
  border-color: color-mix(in srgb, var(--at-accent) 30%, var(--at-line));
}
.atelier .nutri-row .nutri-state.matched {
  animation: at-check-pop var(--ds-motion-enter) var(--at-spring);
}
.atelier .toast {
  animation: at-toast-in var(--ds-motion-enter) var(--at-spring) both;
  border: 1px solid color-mix(in srgb, var(--at-accent) 40%, var(--at-line));
  box-shadow: 0 13px 35px rgba(0, 0, 0, 0.22);
  max-width: min(440px, calc(100% - 28px));
  line-height: 1.5;
}
.atelier .toast.at-toast-exit {
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity var(--ds-motion-base),
    transform var(--ds-motion-base);
}
.atelier .notice.error {
  border-color: color-mix(in srgb, #e5a77d 35%, var(--at-line));
}
.atelier .skeleton {
  min-height: 100px;
  display: grid;
  gap: 14px;
  align-content: start;
}
.atelier .skeleton-hero,
.atelier .skeleton-tile {
  border-radius: 20px;
  background: linear-gradient(
    110deg,
    var(--at-panel) 8%,
    color-mix(in srgb, var(--at-panel) 72%, var(--at-panel2)) 22%,
    var(--at-panel) 38%
  );
  background-size: 200% 100%;
  animation: at-shimmer var(--ds-motion-loading) var(--ds-motion-linear) infinite;
}
.atelier .skeleton-hero {
  height: 210px;
}
.atelier .skeleton-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.atelier .skeleton-tile {
  height: 145px;
}
/* Command palette: truly keyboard usable, with categories rather than another settings screen. */
.atelier .modal.command {
  width: min(620px, calc(100vw - 38px));
  max-height: min(80vh, 760px);
  border-radius: 23px;
  padding: 0;
  overflow: hidden;
}
.atelier .command-content {
  padding: 22px;
}
.atelier .command-heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 0 56px 15px 0;
  gap: 6px;
  font:
    normal 25px/1.2 Georgia,
    serif;
}
.atelier .command-search {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--at-panel2);
  border: 1px solid var(--at-line);
  border-radius: 14px;
  padding: 8px 13px;
  transition: border-color var(--at-fast);
}
.atelier .command-search:focus-within {
  border-color: var(--ds-brand);
}
.atelier .command-search input {
  padding: 9px 0;
  outline: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  width: 100%;
  min-height: 30px;
  font-size: 16px;
}
.atelier .command-search input:focus {
  outline: 0;
  box-shadow: none;
  border: 0;
}
.atelier .command-hint {
  margin: 9px 3px 0;
  color: var(--at-sub);
  font-size: 12px;
  line-height: 1.45;
}
.atelier .command-example {
  display: inline-block;
  margin-left: 5px;
  color: var(--ds-brand);
  font-weight: 700;
}
.atelier .command-conversion {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  padding: 18px 20px;
  border: 1px solid color-mix(in srgb, var(--ds-brand) 30%, var(--at-line));
  border-radius: 18px;
  background: color-mix(in srgb, var(--ds-brand) 6%, var(--at-panel));
  animation: at-view-enter var(--ds-motion-enter) var(--ds-motion-ease) backwards;
}
.atelier .command-conversion-label {
  color: var(--ds-brand);
  font-size: 11px;
  font-weight: 760;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.atelier .command-conversion strong {
  font-size: clamp(22px, 4vw, 30px);
  font-weight: 620;
  letter-spacing: -0.035em;
  line-height: 1.2;
}
.atelier .command-conversion p {
  margin: 0;
  color: var(--at-sub);
  font-size: 12px;
  line-height: 1.5;
}
.atelier .command-shortcuts[hidden],
.atelier .command-hint[hidden] {
  display: none !important;
}
.atelier .command-section {
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--ds-brand);
  margin: 22px 8px 8px;
  font-weight: 800;
}
.atelier .command-list {
  max-height: min(50vh, 440px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.atelier .command-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  border-radius: 11px;
  text-align: left;
  padding: 11px 12px;
  color: var(--at-ink);
  background: transparent;
  min-height: 47px;
  font-size: 13px;
  transition:
    background var(--at-fast),
    transform var(--at-fast);
}
.atelier .command-item:hover,
.atelier .command-item:focus-visible {
  background: color-mix(in srgb, var(--at-accent) 13%, var(--at-panel));
  transform: translateX(3px);
}
.atelier .command-item svg {
  color: var(--ds-brand);
}
.atelier .command-item .command-arrow {
  margin-left: auto;
  color: var(--at-sub);
}
.atelier .command-item[hidden] {
  display: none !important;
}
.atelier .command-footer {
  display: flex;
  gap: 15px;
  justify-content: space-between;
  flex-wrap: wrap;
  font-size: 11px;
  border-top: 1px solid var(--at-line);
  padding-top: 13px;
  margin-top: 12px;
  color: var(--at-sub);
}
.atelier .command-empty {
  display: none;
  padding: 24px 10px;
  color: var(--at-sub);
  text-align: center;
  font-size: 13px;
}
.atelier .command-empty.visible {
  display: block;
}
.atelier .command-live {
  max-height: min(58vh, 500px);
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.atelier .command-results-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 21px 8px 8px;
  color: var(--at-sub);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
}
.atelier .command-results-heading span + span {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
}
.atelier .command-results-list {
  display: grid;
  gap: 5px;
}
.atelier .command-item.command-recipe {
  gap: 11px;
  min-height: 66px;
  padding: 7px 9px;
  border: 1px solid transparent;
  transform: none;
}
.atelier .command-item.command-recipe:hover,
.atelier .command-item.command-recipe:focus-visible {
  border-color: color-mix(in srgb, var(--at-accent) 26%, var(--at-line));
  transform: translateY(-1px);
}
.atelier .command-recipe-image {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--at-accent) 20%, var(--at-panel2)),
    var(--at-panel2)
  );
  color: var(--ds-brand);
}
.atelier .command-recipe-image:empty::before {
  content: "✦";
  font-size: 18px;
}
.atelier .command-recipe-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.atelier .command-recipe-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
  flex: 1;
}
.atelier .command-recipe-copy strong {
  overflow: hidden;
  color: var(--at-ink);
  font-size: 13px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.atelier .command-recipe-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--at-sub);
  font-size: 11px;
}
.atelier .command-recipe-meta svg {
  flex: none;
  color: var(--ds-brand);
}
.atelier .command-match {
  flex: none;
  padding: 5px 8px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--at-accent) 11%, var(--at-panel));
  color: var(--at-sub);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.atelier .command-match-ingredient,
.atelier .command-match-mixed {
  background: color-mix(in srgb, var(--at-accent) 18%, var(--at-panel));
  color: var(--ds-brand);
}
.atelier .command-all-results {
  margin-top: 7px;
  border-top: 1px solid var(--at-line);
  border-radius: 0;
  padding-top: 13px;
  color: var(--ds-brand);
}
.atelier .command-state,
.atelier .command-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 76px;
  margin: 7px 0 0;
  color: var(--at-sub);
  font-size: 13px;
  text-align: center;
}
.atelier .command-loading {
  justify-content: flex-start;
  padding: 0 12px;
}
.atelier .command-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid color-mix(in srgb, var(--at-accent) 25%, transparent);
  border-top-color: var(--ds-brand);
  border-radius: 50%;
  animation: command-spin var(--ds-motion-fast) var(--ds-motion-linear) infinite;
}
.atelier .command-no-results {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 26px 12px 21px;
  color: var(--at-sub);
  font-size: 12px;
  text-align: center;
}
.atelier .command-no-results strong {
  color: var(--at-ink);
  font-size: 14px;
}
.atelier .command-no-results-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  margin-bottom: 3px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--at-accent) 12%, var(--at-panel));
  color: var(--ds-brand);
}
@keyframes command-spin {
  to {
    transform: rotate(360deg);
  }
}
.atelier.motion-off * {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}
.atelier.motion-balanced .view-stage.is-entering {
  animation-duration: var(--ds-motion-enter);
}
.atelier.motion-balanced .modal {
  animation-duration: var(--ds-motion-enter);
}
@media (prefers-reduced-motion: reduce) {
  .atelier .atelier-credit-heart {
    animation: none !important;
  }
  .atelier .view-stage.is-entering {
    animation: none !important;
  }
}
@media (max-width: 1080px) {
  .atelier .command-launch {
    min-width: 0;
    width: 39px;
    justify-content: center;
    padding: 0;
  }
  .atelier .command-launch .command-caption,
  .atelier .command-launch .shortcut {
    display: none;
  }
}
@media (max-width: 760px) {
  .atelier .sidebar {
    position: sticky;
    top: 0;
    z-index: 40;
    border-bottom: 1px solid var(--at-line);
    background: color-mix(in srgb, var(--at-surface) 94%, transparent) !important;
    backdrop-filter: blur(16px);
    padding: 9px 12px;
  }
  .atelier .sidebar .nav {
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }
  .atelier .sidebar .nav::-webkit-scrollbar {
    display: none;
  }
  .atelier .nav button {
    scroll-snap-align: center;
    min-height: 44px;
    font-size: 12px;
  }
  .atelier .nav button:hover:not(.active) {
    transform: none;
  }
  .atelier .nav button.active {
    box-shadow: inset 0 -2px 0 var(--at-accent);
  }
  /* Square bottom corners keep the accent line straight under a rounded tab. */
  .atelier .sidebar .nav > button.active {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  .atelier .main {
    padding: 20px 20px 56px;
  }
  .atelier .topbar {
    padding-bottom: 13px;
    margin-bottom: 24px;
  }
  .atelier .studio-panel {
    padding: 23px 20px;
  }
  .atelier .studio-form input:not([type="checkbox"]),
  .atelier .studio-form select {
    min-height: 46px;
    font-size: 14px;
  }
  .atelier .studio-suggestion-copy strong {
    font-size: 18px;
  }
  .atelier .studio-daily {
    padding: 21px;
  }
  .atelier .studio-top h1 {
    font-size: clamp(36px, 8vw, 48px);
  }
  .atelier .recipe-tile:hover {
    transform: none;
  }
  .atelier .recipe-grid.is-featured {
    scroll-snap-type: x mandatory;
  }
  .atelier .recipe-grid.is-featured > .recipe-tile {
    scroll-snap-align: start;
  }
  .atelier .modal.command {
    width: calc(100vw - 18px);
    max-height: 86dvh;
  }
  .atelier .modal.command .command-content {
    padding: 19px 16px;
  }
  .atelier .command-launch {
    min-width: 40px;
    height: 40px;
  }
  .atelier .skeleton-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atelier .skeleton-row > .skeleton-tile:last-child {
    display: none;
  }
}
@media (max-width: 520px) {
  .atelier .modal.command {
    width: min(100vw - 20px, 620px);
    max-height: min(86vh, 760px);
    border-radius: 19px;
  }
  .atelier .command-content {
    padding: 17px 14px;
  }
  .atelier .command-heading {
    font-size: 21px;
    margin-right: 56px;
  }
  .atelier .command-item.command-recipe {
    gap: 8px;
    padding-inline: 5px;
  }
  .atelier .command-recipe-image {
    width: 42px;
    height: 42px;
    border-radius: 10px;
  }
  .atelier .command-match {
    padding: 4px 6px;
    font-size: 9px;
  }
  .atelier .command-recipe-copy strong {
    font-size: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .atelier .command-spinner {
    animation: none !important;
    border-top-color: var(--ds-brand);
  }
}
@media (max-width: 420px) {
  .atelier .main {
    padding: 19px 15px 45px;
  }
  .atelier .hero h2 {
    font-size: clamp(30px, 8.2vw, 39px);
  }
  .atelier .studio-formline {
    grid-template-columns: 1fr;
  }
  .atelier .studio-daily h2 {
    font-size: 29px;
  }
  .atelier .studio-panel {
    padding: 19px 17px;
  }
  .atelier .studio-panel h2 {
    font-size: 25px;
  }
  .atelier .command-footer {
    font-size: 10px;
  }
}
@media (hover: none) {
  .atelier .recipe-tile:hover,
  .atelier .week-grid > .day:hover,
  .atelier .nav button:hover,
  .atelier .btn:hover {
    transform: none !important;
  }
  .atelier .studio-suggestion:hover {
    padding-inline: 0;
    background: none;
  }
  .atelier .hero:hover .hero-food,
  .atelier .cook-visual:hover img {
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .atelier *,
  .atelier *::before,
  .atelier *::after {
    animation-duration: var(--ds-motion-reduced) !important;
    animation-iteration-count: 1 !important;
    transition-duration: var(--ds-motion-reduced) !important;
    scroll-behavior: auto !important;
    filter: none !important;
  }
  .atelier .view-stage.is-entering {
    animation: none !important;
  }
}
@media (prefers-contrast: more) {
  .atelier {
    --at-line: color-mix(in srgb, var(--at-ink) 38%, transparent);
  }
  .atelier .btn,
  .atelier input,
  .atelier select,
  .atelier textarea {
    border-width: 2px;
  }
  .atelier .muted,
  .atelier .studio-muted {
    color: var(--at-ink);
  }
}

.atelier .modal.modal-stable {
  animation: none !important;
}
/* The navigation rail must never compress labels on narrow viewports. */
@media (max-width: 760px) {
  .atelier .sidebar .nav {
    display: flex !important;
    flex-flow: row nowrap !important;
    width: 100%;
    max-width: 100%;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    align-items: center;
    gap: 7px;
    scroll-padding-inline: 10px;
    overscroll-behavior-x: contain;
  }
  .atelier .sidebar .nav > button {
    flex: 0 0 auto !important;
    display: inline-flex !important;
    white-space: nowrap !important;
    min-width: max-content !important;
    width: auto !important;
    min-height: 44px;
    gap: 7px;
    padding: 10px 13px !important;
    font-size: 11px !important;
    line-height: 1.25 !important;
  }
  .atelier .sidebar .nav > button span {
    display: inline !important;
    white-space: nowrap !important;
    flex: 0 0 auto !important;
    overflow: visible !important;
    max-width: none !important;
  }
  .atelier .sidebar .nav > button svg {
    flex: 0 0 auto !important;
  }
}

.atelier .detail-cols .step {
  display: flex;
  width: 100%;
  text-align: left;
  color: var(--at-ink);
  font: inherit;
  cursor: pointer;
  appearance: none;
  min-height: 60px;
  transition:
    background-color var(--ds-motion-base) var(--at-ease),
    border-color var(--ds-motion-base) var(--at-ease),
    box-shadow var(--ds-motion-base) var(--at-ease),
    transform var(--ds-motion-fast) var(--at-spring);
}
.atelier .detail-cols .step:active {
  transform: scale(0.992);
}
.atelier .detail-cols .step:hover {
  border-color: color-mix(in srgb, var(--at-accent) 43%, var(--at-line));
  background: color-mix(in srgb, var(--at-accent) 9%, var(--at-panel));
}
.atelier .detail-cols .step.active {
  background: color-mix(in srgb, var(--at-accent) 14%, var(--at-panel));
  border-color: var(--ds-brand);
  animation: at-step-select var(--ds-motion-enter) var(--at-spring) both;
}
@keyframes at-step-select {
  from {
    opacity: 0.78;
    transform: translateY(4px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.atelier .cook-stage {
  touch-action: pan-y;
}
.atelier .cook-stage:after {
  content: attr(data-swipe-hint);
  font:
    500 10px/1.2 ui-sans-serif,
    system-ui,
    sans-serif;
  letter-spacing: 1px;
  color: var(--at-sub);
  margin-top: 12px;
  opacity: 0.7;
}
@media (hover: hover) {
  .atelier .cook-stage:after {
    display: none;
  }
}
/* Mobile-friendly planning and one-handed cooking. The next step is more
   important than supplementary timers, so controls appear before utilities. */
.atelier .week-swipe-hint {
  display: none;
}
@media (max-width: 760px) {
  .atelier .view-stage[data-view="mealplan"] .heading {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .atelier .view-stage[data-view="mealplan"] .heading h2 {
    font-size: clamp(29px, 7vw, 38px);
    line-height: 1.05;
  }
  .atelier .view-stage[data-view="mealplan"] .heading .toolbar {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    width: 100%;
    max-width: 100%;
    gap: 8px;
    scrollbar-width: none;
    padding: 3px 0 7px;
  }
  .atelier .view-stage[data-view="mealplan"] .heading .toolbar::-webkit-scrollbar {
    display: none;
  }
  .atelier .view-stage[data-view="mealplan"] .heading .toolbar .btn {
    flex: 0 0 auto;
    min-height: 42px;
    white-space: nowrap;
  }
  .atelier .week-swipe-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--at-sub);
    margin: 9px 0 14px;
    letter-spacing: 0.2px;
  }
  .atelier .week-swipe-hint:before {
    content: "↔";
    color: var(--ds-brand);
    font-size: 21px;
    line-height: 1;
  }
  .atelier .cook-visual {
    min-height: 170px;
    height: 170px;
  }
  .atelier .cook-content {
    padding: 24px 24px 32px;
    gap: 15px;
    justify-content: start;
  }
  .atelier .cook-topline {
    order: 0;
  }
  .atelier .cook-track {
    order: 1;
  }
  .atelier .cook-stage {
    order: 2;
    min-height: 0;
    padding: 20px 0 6px;
    gap: 11px;
  }
  .atelier .cook-stage h2 {
    font-size: clamp(27px, 6.9vw, 32px);
  }
  .atelier .cook-actions {
    order: 3;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 5px 0 13px;
  }
  .atelier .cook-actions .btn {
    width: 100%;
    min-width: 0;
    min-height: 48px;
    justify-content: center;
  }
  .atelier .cook-utility {
    order: 4;
  }
  .atelier .cook-footnote {
    order: 5;
  }
}
/* Use composited opacity/position on low-power tablets instead of full-surface blur. */
@keyframes at-view-enter-mobile {
  from {
    opacity: 0.5;
    transform: translate3d(0, 9px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
@media (max-width: 760px) {
  .atelier .view-stage.is-entering {
    animation-name: at-view-enter-mobile;
    animation-duration: var(--ds-motion-enter);
  }
}

/* System checks reuse the shared dialog motion without implying success before verification. */
.atelier .studio-diagnostics {
  margin-top: 25px;
}
.atelier .studio-diagnostic-grid {
  display: grid;
  gap: 9px;
  margin-top: 18px;
}
.atelier .studio-diagnostic-row {
  display: grid;
  grid-template-columns: minmax(95px, 1fr) auto;
  align-items: center;
  column-gap: 14px;
  row-gap: 2px;
  border: 1px solid var(--at-line);
  border-radius: 13px;
  background: var(--at-panel2);
  padding: 13px 15px;
  font-size: 13px;
}
.atelier .studio-diagnostic-row > span:first-child {
  font-weight: 680;
}
.atelier .studio-diagnostic-row small {
  grid-column: 1 / -1;
  color: var(--at-sub);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.atelier .studio-diagnostic-status {
  font-size: 11px;
  font-weight: 800;
  border-radius: 50px;
  padding: 5px 10px;
}
.atelier .studio-diagnostic-status.ok {
  background: color-mix(in srgb, var(--at-accent) 17%, transparent);
  color: var(--ds-brand);
}
.atelier .studio-diagnostic-status.fail {
  background: color-mix(in srgb, #e5a77d 22%, transparent);
  color: #d5a27d;
}
@media (max-width: 760px) {
  .atelier .studio-diagnostics .studio-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
  .atelier .studio-diagnostics .studio-actions .btn {
    min-height: 47px;
    justify-content: center;
  }
}

/* A first-class, accessible replacement for browser alerts, prompts and confirms. */
.at-premium-dialog {
  border: 1px solid var(--at-line, #4c6254);
  border-radius: 23px;
  color: var(--at-ink, #f5f2ea);
  background: var(--at-surface, #121c17);
  box-shadow: 0 30px 110px rgba(0, 0, 0, 0.48);
  width: min(490px, calc(100vw - 30px));
  max-height: min(85dvh, 680px);
  padding: 0;
  overflow: auto;
  animation: at-dialog-enter var(--ds-motion-enter) var(--ds-motion-spring) both;
}
.at-premium-dialog::backdrop {
  background: rgba(3, 10, 7, 0.7);
  backdrop-filter: blur(5px);
}
.at-premium-dialog .at-dialog-panel {
  padding: 28px;
  display: grid;
  gap: 13px;
}
.at-premium-dialog .eyebrow {
  color: var(--at-accent, #a2cdb3);
  font-size: 10px;
  letter-spacing: 2px;
}
.at-premium-dialog h2 {
  font:
    normal clamp(25px, 5vw, 34px) / 1.15 Georgia,
    serif;
  margin: 0;
}
.at-premium-dialog p {
  color: var(--at-sub, #b5c6bd);
  line-height: 1.6;
  margin: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  font-size: 14px;
}
.at-premium-dialog .at-prompt-label {
  display: grid;
  gap: 8px;
  color: var(--at-ink, #f5f2ea);
  font-size: 12px;
  font-weight: 650;
  margin-top: 8px;
}
.at-premium-dialog .at-prompt-input {
  border: 1px solid var(--at-line, #4c6254);
  border-radius: 12px;
  min-height: 48px;
  width: 100%;
  background: var(--at-panel, #20332a);
  color: inherit;
  padding: 11px 13px;
  font-size: 16px;
}
.at-premium-dialog .at-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 17px;
  flex-wrap: wrap;
}
.at-premium-dialog button {
  min-height: 46px;
}
.at-premium-dialog button:focus-visible,
.at-premium-dialog input:focus-visible {
  outline: 3px solid var(--at-accent, #a2cdb3);
  outline-offset: 3px;
}
@media (max-width: 500px) {
  .at-premium-dialog .at-dialog-panel {
    padding: 23px 19px;
  }
  .at-premium-dialog .at-dialog-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .at-premium-dialog .at-dialog-actions .btn {
    min-width: 0;
    justify-content: center;
  }
}
@media (prefers-reduced-motion: reduce) {
  .at-premium-dialog {
    animation: none !important;
  }
  .at-premium-dialog::backdrop {
    backdrop-filter: none !important;
  }
}

.at-premium-dialog {
  font-family:
    ui-sans-serif,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}
.at-premium-dialog .btn {
  appearance: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 750;
  min-height: 46px;
  border: 1px solid var(--at-line, #385849);
  background: var(--at-panel, #24382e);
  border-radius: 30px;
  color: var(--at-ink, #f5f2ea);
  padding: 12px 19px;
  cursor: pointer;
  transition:
    transform var(--ds-motion-base) var(--ds-motion-ease),
    background var(--ds-motion-base) var(--ds-motion-ease);
}
.at-premium-dialog .btn.primary {
  background: var(--at-accent, #a2cdb3);
  border-color: var(--at-accent, #a2cdb3);
  color: var(--at-accent-ink, #101c15);
}
.at-premium-dialog .btn:hover {
  transform: translateY(-1px);
}
.at-premium-dialog .btn:active {
  transform: scale(0.98);
}
@media (hover: none) {
  .at-premium-dialog .btn:hover {
    transform: none;
  }
}

@container atelier-card (max-width: 780px) {
  .atelier .today-board {
    grid-template-columns: 1fr;
  }
}
@container atelier-card (max-width: 1080px) {
  .atelier .shell {
    grid-template-columns: 170px minmax(0, 1fr);
  }
  .atelier .sidebar {
    padding: 24px 10px;
  }
  .atelier .identity {
    padding: 0 5px 25px;
  }
  .atelier .stat {
    gap: 9px;
    padding: 12px;
  }
  .atelier .week-grid {
    grid-template-columns: repeat(7, minmax(93px, 1fr));
  }
  .atelier .recipe-grid {
    grid-template-columns: repeat(min(var(--at-cols), 3), minmax(0, 1fr));
  }
}
@container atelier-card (max-width: 760px) {
  .atelier .shell {
    display: block;
  }
  .atelier .sidebar {
    min-height: 0;
    border-right: 0;
    border-bottom: 1px solid var(--at-line);
    padding: 10px 12px;
  }
  .atelier .sidebar .identity,
  .atelier .sidebar .nav-label,
  .atelier .sidebar-footer {
    display: none;
  }
  .atelier .nav {
    display: flex;
    overflow: auto;
    gap: 5px;
  }
  .atelier .nav button {
    padding: 10px 10px;
    white-space: nowrap;
    gap: 6px;
    font-size: 11px;
  }
  .atelier .nav button.active:before {
    display: none;
  }
  .atelier .main {
    padding: 20px;
  }
  .atelier .topbar {
    margin-bottom: 18px;
  }
  .atelier .hero {
    padding: 21px;
    min-height: 220px;
  }
  .atelier .hero .hero-copy {
    max-width: 70%;
  }
  .atelier .statline {
    gap: 7px;
  }
  .atelier .stat {
    min-height: 70px;
    padding: 11px;
  }
  .atelier .stat-icon {
    width: 30px;
    height: 30px;
  }
  .atelier .stat strong {
    font-size: 18px;
  }
  .atelier .stat span {
    font-size: 9px;
  }
  .atelier .recipe-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atelier .tile-image {
    height: 142px;
  }
  .atelier .detail-cols {
    grid-template-columns: 1fr;
  }
  .atelier .week-grid {
    grid-template-columns: repeat(7, 110px);
  }
  .atelier .manage-grid {
    grid-template-columns: 1fr;
  }
}
@container atelier-card (max-width: 420px) {
  .atelier .main {
    padding: 15px;
  }
  .atelier .stat-icon {
    display: none;
  }
  .atelier .hero {
    min-height: 195px;
  }
  .atelier .hero-art {
    right: -70px;
  }
  .atelier .hero h2 {
    font-size: 25px;
  }
  .atelier .hero .hero-copy {
    max-width: 95%;
    position: relative;
    z-index: 2;
  }
  .atelier .hero .hero-art {
    right: -95px;
    opacity: 0.2;
  }
  .atelier .hero h2 {
    font-size: 24px;
  }
  .atelier .tile-image {
    height: 113px;
  }
  .atelier .recipe-tile h3 {
    font-size: 12px;
  }
  .atelier .modal-content {
    padding: 18px;
  }
  .atelier .modal-hero {
    height: 175px;
  }
}
@container atelier-card (max-width: 760px) {
  .atelier .editor-columns {
    grid-template-columns: 1fr;
  }
  .atelier .editor-card {
    padding: 18px;
  }
  .atelier .editor-footer {
    margin: 0 -18px -18px;
    bottom: -18px;
    padding: 15px 18px;
  }
  .atelier .editor-step {
    grid-template-columns: 23px minmax(0, 1fr) 30px;
    gap: 7px;
  }
  .atelier .editor-readonly {
    grid-template-columns: 1fr;
  }
  .atelier .print-setup {
    grid-template-columns: 1fr;
  }
  .atelier .print-paper {
    max-width: 310px;
    margin: auto;
    width: 100%;
  }
}
@container atelier-card (max-width: 1080px) {
  .atelier .shell {
    grid-template-columns: 178px minmax(0, 1fr);
  }
  .atelier .main {
    padding: 28px;
  }
  .atelier .hero {
    height: 290px;
    min-height: 290px;
    padding: 32px;
  }
  .atelier .hero h2 {
    font-size: 39px;
  }
  .atelier .recipe-grid {
    gap: 15px;
  }
  .atelier .tile-body h3 {
    font-size: 20px;
  }
}
@container atelier-card (max-width: 760px) {
  .atelier {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    min-height: 100vh;
  }
  .atelier .shell {
    display: flex;
    flex-direction: column;
  }
  .atelier .sidebar {
    order: 0;
    min-height: 0;
    padding: 12px 12px 11px;
    background: var(--at-surface);
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid var(--at-line);
  }
  .atelier .nav {
    gap: 4px;
    justify-content: space-between;
  }
  .atelier .nav button {
    padding: 9px 8px;
    font-size: 10px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 61px;
    gap: 5px;
    border-radius: 10px;
  }
  .atelier .nav button svg {
    width: 17px;
    height: 17px;
  }
  .atelier .nav button.active {
    background: var(--at-panel2);
  }
  .atelier .main {
    order: 1;
    padding: 24px 19px 52px;
  }
  .atelier .topbar {
    margin-bottom: 28px;
  }
  .atelier .intro {
    margin: 3px 0 25px;
  }
  .atelier .intro h1 {
    font-size: clamp(37px, 10.5vw, 56px);
    letter-spacing: -1.7px;
  }
  .atelier .intro .muted {
    font-size: 12px;
  }
  .atelier .hero {
    height: 310px;
    min-height: 310px;
    padding: 25px 24px;
    border-radius: 17px;
  }
  .atelier .hero:after {
    background: linear-gradient(
      0deg,
      rgba(10, 20, 14, 0.95) 0%,
      rgba(10, 20, 14, 0.53) 60%,
      rgba(10, 20, 14, 0.11) 100%
    );
  }
  .atelier .hero .hero-food {
    object-position: center 45%;
  }
  .atelier .hero .hero-copy {
    max-width: 100%;
    align-self: end;
    justify-content: end;
    gap: 9px;
  }
  .atelier .hero h2 {
    font-size: clamp(29px, 7.5vw, 42px);
    max-width: 310px;
  }
  .atelier .hero p {
    font-size: 10px;
  }
  .atelier .hero .btn.primary {
    margin-top: 3px;
  }
  .atelier .statline {
    margin: 15px 0 36px;
  }
  .atelier .stat {
    padding: 8px;
    justify-content: center;
    gap: 8px;
    min-height: 60px;
  }
  .atelier .stat strong {
    font-size: 21px;
  }
  .atelier .stat-icon {
    display: none;
  }
  .atelier .stat span {
    font-size: 9px;
  }
  .atelier .heading h2 {
    font-size: 30px;
  }
  .atelier .section {
    margin-top: 37px;
  }
  .atelier .recipe-grid.is-featured {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    padding-bottom: 14px;
    gap: 16px;
    margin-right: -19px;
    padding-right: 19px;
  }
  .atelier .recipe-grid.is-featured::-webkit-scrollbar {
    display: none;
  }
  .atelier .recipe-grid.is-featured .recipe-tile {
    flex: 0 0 min(70vw, 265px);
    scroll-snap-align: start;
  }
  .atelier .recipe-grid.is-featured .tile-image {
    height: auto;
    aspect-ratio: 4/5;
  }
  .atelier .recipe-grid:not(.is-featured) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 13px;
  }
  .atelier .recipe-grid:not(.is-featured) .tile-image {
    height: auto;
    aspect-ratio: var(--at-tile-ratio, 4/5);
  }
  .atelier .tile-body {
    padding: 14px 2px 10px;
  }
  .atelier .tile-body h3 {
    font-size: 19px;
    min-height: 48px;
  }
  .atelier .tile-body small {
    font-size: 8px;
    letter-spacing: 1.25px;
  }
  .atelier .week-grid {
    grid-template-columns: repeat(7, 155px);
    gap: 11px;
  }
  .atelier .day {
    min-height: 177px;
  }
  .atelier .shopping-card,
  .atelier .today-panel {
    padding: 18px;
  }
  .atelier .modal {
    width: 100%;
    max-height: 95dvh;
    border-radius: 20px;
  }
  .atelier .modal.large {
    width: 100%;
  }
  .atelier .modal-content {
    padding: 27px 23px;
  }
  .atelier .modal-hero {
    height: 260px;
  }
  .atelier .detail-cols {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .atelier .modal .modal-content > h2 {
    font-size: 36px;
  }
  .atelier .cook-layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }
  .atelier .cook-visual {
    min-height: 210px;
    height: 210px;
  }
  .atelier .cook-visual .cook-brand {
    font-size: 20px;
    left: 20px;
    bottom: 14px;
  }
  .atelier .cook-content {
    padding: 30px 24px 33px;
    gap: 20px;
  }
  .atelier .cook-stage {
    min-height: 190px;
  }
  .atelier .cook-stage h2 {
    font-size: 30px;
  }
  .atelier .cook-actions .btn {
    min-width: 110px;
  }
  .atelier .editor-card {
    padding: 20px;
  }
  .atelier .editor-card h3 {
    font-size: 24px;
  }
  .atelier .editor-footer {
    margin: 0 -20px -20px;
    padding: 15px 20px;
  }
  .atelier .print-paper {
    transform: none;
  }
}
@container atelier-card (max-width: 390px) {
  .atelier .nav button {
    min-width: 52px;
    font-size: 9px;
  }
  .atelier .main {
    padding: 20px 15px 45px;
  }
  .atelier .recipe-grid.is-featured {
    margin-right: -15px;
    padding-right: 15px;
  }
  .atelier .hero {
    height: 294px;
    min-height: 294px;
  }
  .atelier .hero h2 {
    font-size: 29px;
  }
  .atelier .stat strong {
    font-size: 19px;
  }
  .atelier .tile-body h3 {
    font-size: 18px;
  }
}
@container atelier-card (max-width: 700px) {
  .atelier .nutri-row-fields {
    grid-template-columns: 112px 1fr;
  }
  .atelier .nutri-row-fields .btn {
    grid-column: 1/-1;
    justify-content: center;
  }
  .atelier .nutri-header {
    padding: 16px;
    grid-template-columns: 1fr auto;
  }
  .atelier .nutri-header .nutri-eyebrow {
    font-size: 19px;
  }
  .atelier .nutri-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atelier .nutri-result {
    padding: 16px;
  }
  .atelier .nutri-row {
    padding: 13px;
  }
  .atelier .nutri-row-head {
    gap: 8px;
  }
  .atelier .nutri-actions > * {
    flex: 1;
    min-width: 112px;
  }
  .atelier .cook-utility {
    padding: 13px;
  }
}
@container atelier-card (max-width: 1100px) {
  .atelier .studio-grid-main {
    grid-template-columns: 1fr 1fr;
  }
  .atelier .studio-panel {
    padding: 19px;
  }
}
@container atelier-card (max-width: 800px) {
  .atelier .studio-grid-main {
    grid-template-columns: 1fr;
  }
  .atelier .studio-panel {
    padding: 21px;
  }
  .atelier .studio-top h1 {
    font-size: 38px;
  }
  .atelier .studio-daily {
    padding: 17px;
  }
  .atelier .studio-daily-actions {
    width: 100%;
  }
}
@container atelier-card (max-width: 420px) {
  .atelier .studio-top h1 {
    font-size: 34px;
  }
  .atelier .studio-suggestion {
    grid-template-columns: 64px 1fr auto;
    gap: 9px;
  }
  .atelier .studio-suggestion-photo {
    height: 64px;
  }
  .atelier .studio-suggestion-copy strong {
    font-size: 16px;
  }
  .atelier .studio-formline {
    grid-template-columns: 1fr;
  }
  .atelier .studio-plan-row {
    grid-template-columns: 65px 1fr;
  }
  .atelier .studio-panel {
    padding: 17px;
  }
}
@container atelier-card (max-width: 780px) {
  .atelier.kiosk .sidebar {
    flex-wrap: wrap;
    gap: 6px;
  }
  .atelier.kiosk .identity {
    width: 100%;
  }
  .atelier.kiosk .nav {
    width: 100%;
  }
  .atelier.kiosk .nav button {
    font-size: 12px;
  }
  .atelier.kiosk .studio-daily {
    padding: 15px;
  }
}
@container atelier-card (max-width: 1080px) {
  .atelier .command-launch {
    min-width: 0;
    width: 39px;
    justify-content: center;
    padding: 0;
  }
  .atelier .command-launch .command-caption,
  .atelier .command-launch .shortcut {
    display: none;
  }
}
@container atelier-card (max-width: 760px) {
  .atelier .sidebar {
    position: sticky;
    top: 0;
    z-index: 40;
    border-bottom: 1px solid var(--at-line);
    background: color-mix(in srgb, var(--at-surface) 94%, transparent) !important;
    backdrop-filter: blur(16px);
    padding: 9px 12px;
  }
  .atelier .sidebar .nav {
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }
  .atelier .sidebar .nav::-webkit-scrollbar {
    display: none;
  }
  .atelier .nav button {
    scroll-snap-align: center;
    min-height: 44px;
    font-size: 12px;
  }
  .atelier .nav button:hover:not(.active) {
    transform: none;
  }
  .atelier .nav button.active {
    box-shadow: inset 0 -2px 0 var(--at-accent);
  }
  /* Square bottom corners keep the accent line straight under a rounded tab. */
  .atelier .sidebar .nav > button.active {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  .atelier .main {
    padding: 20px 20px 56px;
  }
  .atelier .topbar {
    padding-bottom: 13px;
    margin-bottom: 24px;
  }
  .atelier .studio-panel {
    padding: 23px 20px;
  }
  .atelier .studio-form input:not([type="checkbox"]),
  .atelier .studio-form select {
    min-height: 46px;
    font-size: 14px;
  }
  .atelier .studio-suggestion-copy strong {
    font-size: 18px;
  }
  .atelier .studio-daily {
    padding: 21px;
  }
  .atelier .studio-top h1 {
    font-size: clamp(36px, 8vw, 48px);
  }
  .atelier .recipe-tile:hover {
    transform: none;
  }
  .atelier .recipe-grid.is-featured {
    scroll-snap-type: x mandatory;
  }
  .atelier .recipe-grid.is-featured > .recipe-tile {
    scroll-snap-align: start;
  }
  .atelier .modal.command {
    width: calc(100vw - 18px);
    max-height: 86dvh;
  }
  .atelier .modal.command .command-content {
    padding: 19px 16px;
  }
  .atelier .command-launch {
    min-width: 40px;
    height: 40px;
  }
  .atelier .skeleton-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atelier .skeleton-row > .skeleton-tile:last-child {
    display: none;
  }
}
@container atelier-card (max-width: 420px) {
  .atelier .main {
    padding: 19px 15px 45px;
  }
  .atelier .hero h2 {
    font-size: clamp(30px, 8.2vw, 39px);
  }
  .atelier .studio-formline {
    grid-template-columns: 1fr;
  }
  .atelier .studio-daily h2 {
    font-size: 29px;
  }
  .atelier .studio-panel {
    padding: 19px 17px;
  }
  .atelier .studio-panel h2 {
    font-size: 25px;
  }
  .atelier .command-footer {
    font-size: 10px;
  }
}
@container atelier-card (max-width: 760px) {
  .atelier .sidebar .nav {
    display: flex !important;
    flex-flow: row nowrap !important;
    width: 100%;
    max-width: 100%;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    align-items: center;
    gap: 7px;
    scroll-padding-inline: 10px;
    overscroll-behavior-x: contain;
  }
  .atelier .sidebar .nav > button {
    flex: 0 0 auto !important;
    display: inline-flex !important;
    white-space: nowrap !important;
    min-width: max-content !important;
    width: auto !important;
    min-height: 44px;
    gap: 7px;
    padding: 10px 13px !important;
    font-size: 11px !important;
    line-height: 1.25 !important;
  }
  .atelier .sidebar .nav > button span {
    display: inline !important;
    white-space: nowrap !important;
    flex: 0 0 auto !important;
    overflow: visible !important;
    max-width: none !important;
  }
  .atelier .sidebar .nav > button svg {
    flex: 0 0 auto !important;
  }
}
@container atelier-card (max-width: 760px) {
  .atelier .view-stage[data-view="mealplan"] .heading {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .atelier .view-stage[data-view="mealplan"] .heading h2 {
    font-size: clamp(29px, 7vw, 38px);
    line-height: 1.05;
  }
  .atelier .view-stage[data-view="mealplan"] .heading .toolbar {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    width: 100%;
    max-width: 100%;
    gap: 8px;
    scrollbar-width: none;
    padding: 3px 0 7px;
  }
  .atelier .view-stage[data-view="mealplan"] .heading .toolbar::-webkit-scrollbar {
    display: none;
  }
  .atelier .view-stage[data-view="mealplan"] .heading .toolbar .btn {
    flex: 0 0 auto;
    min-height: 42px;
    white-space: nowrap;
  }
  .atelier .week-swipe-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--at-sub);
    margin: 9px 0 14px;
    letter-spacing: 0.2px;
  }
  .atelier .week-swipe-hint:before {
    content: "↔";
    color: var(--ds-brand);
    font-size: 21px;
    line-height: 1;
  }
  .atelier .cook-visual {
    min-height: 170px;
    height: 170px;
  }
  .atelier .cook-content {
    padding: 24px 24px 32px;
    gap: 15px;
    justify-content: start;
  }
  .atelier .cook-topline {
    order: 0;
  }
  .atelier .cook-track {
    order: 1;
  }
  .atelier .cook-stage {
    order: 2;
    min-height: 0;
    padding: 20px 0 6px;
    gap: 11px;
  }
  .atelier .cook-controls {
    order: 3;
  }
  .atelier .cook-stage h2 {
    font-size: clamp(27px, 6.9vw, 32px);
  }
  .atelier .cook-actions {
    order: 3;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 5px 0 13px;
  }
  .atelier .cook-actions .btn {
    width: 100%;
    min-width: 0;
    min-height: 48px;
    justify-content: center;
  }
  .atelier .cook-utility {
    order: 4;
  }
  .atelier .cook-footnote {
    order: 5;
  }
}
@container atelier-card (max-width: 760px) {
  .atelier .view-stage.is-entering {
    animation-name: at-view-enter-mobile;
    animation-duration: var(--ds-motion-enter);
  }
}
@container atelier-card (max-width: 760px) {
  .atelier .studio-diagnostics .studio-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
  .atelier .studio-diagnostics .studio-actions .btn {
    min-height: 47px;
    justify-content: center;
  }
}
@container atelier-card (max-width: 500px) {
  .at-premium-dialog .at-dialog-panel {
    padding: 23px 19px;
  }
  .at-premium-dialog .at-dialog-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .at-premium-dialog .at-dialog-actions .btn {
    min-width: 0;
    justify-content: center;
  }
}
.atelier.provider-home-assistant .recipe-grid:not(.is-featured) {
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.atelier.provider-home-assistant .recipe-tile {
  display: grid;
  grid-template-columns: minmax(78px, 30%) minmax(0, 1fr);
  align-items: stretch;
  flex-direction: row;
  min-height: 124px;
  border-radius: 17px;
}
.atelier.provider-home-assistant .tile-image {
  height: auto;
  min-height: 124px;
  aspect-ratio: auto;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--at-accent) 30%, var(--at-panel)),
    color-mix(in srgb, var(--at-accent) 12%, var(--at-panel2))
  );
}
.atelier.provider-home-assistant .tile-image.tint1,
.atelier.provider-home-assistant .tile-image.tint2,
.atelier.provider-home-assistant .tile-image.tint3 {
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--at-accent) 30%, var(--at-panel)),
    color-mix(in srgb, var(--at-accent) 12%, var(--at-panel2))
  );
}
.atelier.provider-home-assistant .tile-image:after {
  content: "✳";
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid color-mix(in srgb, var(--at-accent) 44%, transparent);
  border-radius: 50%;
  color: var(--ds-brand);
  font-size: 20px;
  background: color-mix(in srgb, var(--at-panel) 70%, transparent);
}
.atelier.provider-home-assistant .tile-image .placeholder,
.atelier.provider-home-assistant .tile-image .photo-index {
  display: none;
}
.atelier.provider-home-assistant .tile-body {
  display: grid;
  align-content: center;
  min-width: 0;
  padding: 15px 16px;
}
.atelier.provider-home-assistant .tile-body small {
  margin: 0 0 6px;
}
.atelier.provider-home-assistant .tile-body h3 {
  min-height: 0;
  font-size: clamp(16px, 2.8cqi, 20px);
  line-height: 1.25;
}
.atelier.provider-home-assistant .tile-meta {
  margin-top: 8px;
}
.atelier.provider-home-assistant .tile-open {
  right: 12px;
  bottom: 12px;
}
.atelier.provider-home-assistant .provider-note {
  padding: 10px 12px;
  font-size: 11px;
}

/* Mealie Atelier Design System / v1.0 foundations.
   All screens and cards inherit the same semantic tokens. No device-specific pixels in components. */
:host {
  container: atelier-card / inline-size;
  --ds-space-0: 0;
  --ds-space-1: 4px;
  --ds-space-2: 8px;
  --ds-space-3: 12px;
  --ds-space-4: 16px;
  --ds-space-5: 20px;
  --ds-space-6: 24px;
  --ds-space-7: 28px;
  --ds-space-8: 32px;
  --ds-space-10: 40px;
  --ds-space-12: 48px;
  --ds-space-16: 64px;
  --ds-radius-sm: 10px;
  --ds-radius-md: 14px;
  --ds-radius-lg: 20px;
  --ds-radius-xl: 26px;
  --ds-radius-pill: 999px;
  --ds-control-height: 48px;
  --ds-touch-height: 48px;
  --ds-control-radius: 12px;
  --ds-control-padding-x: 17px;
  --ds-control-padding-y: 10px;
  --ds-field-padding-x: 15px;
  --ds-field-padding-y: 11px;
  --ds-control-gap: 10px;
  --ds-control-icon: 18px;
  --ds-select-arrow-size: 18px;
  --ds-select-arrow-inset: 14px;
  --ds-select-clearance: 43px;
  --ds-field-gap: 8px;
  --ds-action-gap: 12px;
  --ds-font-xs: 12px;
  --ds-font-sm: 13px;
  --ds-font-md: 14px;
  --ds-font-lg: 17px;
  --ds-line-tight: 1.17;
  --ds-line-body: 1.62;
  --ds-sidebar-width: 216px;
  --ds-content-max: 1220px;
  --ds-page-gutter: clamp(24px, 3.1cqi, 48px);
  --ds-grid-gap: var(--ds-space-6);
  --ds-panel-padding: clamp(18px, 2.2cqi, 28px);
  --ds-shadow-panel: 0 14px 40px rgba(0, 0, 0, 0.075);
  --ds-shadow-dialog: 0 35px 90px rgba(0, 0, 0, 0.4);
  --ds-motion-fast: 140ms;
  --ds-motion-base: 220ms;
  --ds-motion-enter: 300ms;
  --ds-motion-slow: 480ms;
  --ds-motion-image: 680ms;
  --ds-motion-image-long: 960ms;
  --ds-motion-loading: 1800ms;
  --ds-motion-reduced: 0.01ms;
  --ds-motion-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ds-motion-spring: cubic-bezier(0.18, 1.12, 0.32, 1);
  --ds-motion-linear: linear;
  --ds-page-stack-gap: var(--ds-space-7);
  --ds-transition: var(--ds-motion-base) var(--ds-motion-ease);
}
.atelier {
  --at-surface: #111613;
  --at-ink: #f3f0e8;
  --at-sub: #a5aca3;
  --at-panel: #1b241e;
  --at-panel2: #263027;
  --at-line: rgba(230, 237, 220, 0.12);
  --at-shadow: 0 30px 85px rgba(2, 9, 5, 0.3);
  --ds-sidebar-start: #131c17;
  --ds-sidebar-end: #101612;
  --ds-shell-elevation: 0 12px 30px rgba(2, 10, 7, 0.1);
  --ds-background: var(--at-surface);
  --ds-surface: var(--at-panel);
  --ds-surface-raised: var(--at-panel2);
  --ds-text: var(--at-ink);
  --ds-muted: var(--at-sub);
  --ds-border: var(--at-line);
  --ds-brand: var(--at-accent);
  --ds-brand-foreground: var(--at-accent-ink, #12221b);
  --ds-ring: color-mix(in srgb, var(--at-accent) 55%, white);
  --ds-photo-fallback: linear-gradient(145deg, #304237, #67775b);
  --at-gap: var(--ds-grid-gap);
  --at-pad: var(--ds-page-gutter);
  font-size: var(--ds-font-md);
  line-height: var(--ds-line-body);
  transition:
    background-color var(--ds-motion-slow) var(--ds-motion-ease),
    color var(--ds-motion-slow) var(--ds-motion-ease),
    border-color var(--ds-motion-slow) var(--ds-motion-ease),
    box-shadow var(--ds-motion-slow) var(--ds-motion-ease);
}
.atelier.compact {
  --ds-grid-gap: var(--ds-space-4);
  --ds-panel-padding: var(--ds-space-4);
  --ds-page-stack-gap: var(--ds-space-5);
}
.atelier.comfortable {
  --ds-grid-gap: var(--ds-space-6);
}
.atelier.motion-balanced {
  --ds-motion-fast: 110ms;
  --ds-motion-base: 160ms;
  --ds-motion-enter: 200ms;
  --ds-motion-slow: 260ms;
  --ds-motion-image: 400ms;
  --ds-motion-image-long: 600ms;
  --ds-motion-loading: 1500ms;
  --ds-motion-spring: var(--ds-motion-ease);
}
.atelier.motion-off {
  --ds-motion-fast: 0ms;
  --ds-motion-base: 0ms;
  --ds-motion-enter: 0ms;
  --ds-motion-slow: 0ms;
  --ds-motion-image: 0ms;
  --ds-motion-image-long: 0ms;
  --ds-motion-loading: 0ms;
}
.atelier.light {
  color-scheme: light;
  --ds-brand: color-mix(in srgb, var(--at-accent) 88%, #281b22);
  --ds-brand-foreground: var(--at-accent-ink, #fffdfa);
  --ds-ring: color-mix(in srgb, var(--at-accent) 82%, #241921);
  --ds-photo-fallback: linear-gradient(145deg, #b8a7a2, #806877);
  --at-surface: #f4f1eb;
  --at-ink: #29252a;
  --at-sub: #665e65;
  --at-panel: #fffdfa;
  --at-panel2: #eee9e3;
  --at-line: rgba(57, 45, 54, 0.15);
  --at-shadow: 0 18px 48px rgba(49, 37, 43, 0.085);
  --ds-sidebar-start: #eee9e3;
  --ds-sidebar-end: #e9e3dd;
  --ds-shell-elevation: 0 12px 32px rgba(49, 37, 43, 0.065);
  --ds-shadow-panel: 0 15px 40px rgba(49, 37, 43, 0.055);
}

/* Layout primitives use container width, not the browser viewport. */
.atelier .shell {
  grid-template-columns: var(--ds-sidebar-width) minmax(0, 1fr);
  min-width: 0;
}
.atelier .shell.single {
  grid-template-columns: minmax(0, 1fr);
}
.atelier .sidebar {
  min-width: 0;
}
.atelier .main {
  min-width: 0;
  width: 100%;
  padding: var(--ds-page-gutter);
}
.atelier .topbar,
.atelier .view-stage {
  width: 100%;
  max-width: var(--ds-content-max);
  margin-inline: auto;
  min-width: 0;
}
.atelier .view-stage > * {
  min-width: 0;
}
.atelier .view-stage.ds-page {
  display: grid;
  gap: var(--ds-page-stack-gap);
  align-content: start;
}
.atelier .view-stage.ds-page > * {
  margin-block: 0;
}
.atelier .main > .atelier-credit-footer {
  display: none;
}
.atelier .shell.single .main > .atelier-credit-footer {
  display: flex;
}
.atelier.kiosk .main > .atelier-credit-footer {
  display: flex;
}
.atelier .atelier-credit-footer {
  justify-content: center;
  padding: var(--ds-space-4) var(--ds-space-2) var(--ds-space-1);
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
  line-height: 1.4;
}
.atelier-credit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.atelier-credit a {
  color: inherit;
  text-decoration-color: color-mix(in srgb, var(--ds-brand) 60%, transparent);
  text-underline-offset: 3px;
  transition:
    color var(--ds-motion-fast) var(--ds-motion-ease),
    text-decoration-color var(--ds-motion-fast) var(--ds-motion-ease);
}
.atelier-credit a:hover,
.atelier-credit a:focus-visible {
  color: var(--ds-brand);
}
.atelier-credit-heart {
  display: inline-block;
  color: var(--ds-brand);
  transform-origin: center;
}
.atelier-credit:hover .atelier-credit-heart,
.atelier-credit:focus-within .atelier-credit-heart {
  animation: at-heart-tap var(--ds-motion-enter) var(--ds-motion-spring) both;
}
@keyframes at-heart-tap {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.28);
  }
  100% {
    transform: scale(1);
  }
}
.atelier .sidebar-footer .atelier-credit {
  display: flex;
  flex-wrap: wrap;
}
.atelier .sidebar-footer .atelier-version {
  display: block;
  margin-top: var(--ds-space-1);
}
.atelier .notice.is-spaced {
  margin-block-end: var(--ds-space-4);
}
.atelier .ds-page {
  display: grid;
  gap: var(--ds-space-6);
  min-width: 0;
}
.atelier .ds-page-header {
  display: grid;
  align-content: start;
  gap: var(--ds-space-3);
  margin-block: var(--ds-space-2) var(--ds-space-4);
  min-width: 0;
}
.atelier .ds-page-header h1 {
  font-family: var(--at-serif, Georgia, serif);
  font-weight: 400;
  line-height: 1.05;
  font-size: clamp(34px, 3.2cqi, 60px);
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}
.atelier .ds-page-header > p {
  color: var(--ds-muted);
  max-width: 68ch;
  font-size: var(--ds-font-md);
  line-height: var(--ds-line-body);
}
.atelier .ds-stack {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
  min-width: 0;
}
.atelier .ds-cluster {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-3);
  min-width: 0;
}
.atelier .ds-cluster[data-align="between"] {
  justify-content: space-between;
}
.atelier .ds-grid {
  display: grid;
  grid-template-columns: repeat(var(--ds-columns, 2), minmax(0, 1fr));
  gap: var(--ds-grid-gap);
  min-width: 0;
  align-items: start;
}
.atelier .ds-grid > * {
  min-width: 0;
}
.atelier .ds-grid--split {
  --ds-columns: 2;
}
.atelier .ds-grid--three {
  --ds-columns: 3;
}
.atelier .ds-grid--auto {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
}
.atelier .studio-grid-main {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ds-grid-gap);
}
.atelier .studio-grid-main > * {
  min-width: 0;
}
.atelier .studio-top,
.atelier .intro {
  margin: 0 0 var(--ds-space-8);
  padding: 0;
}
.atelier .studio-top h1,
.atelier .intro h1 {
  font-size: clamp(34px, 3.2cqi, 60px);
  line-height: 1.05;
}
.atelier .studio-top p,
.atelier .intro .muted {
  max-width: 68ch;
  line-height: var(--ds-line-body);
}
.atelier .studio-top {
  display: grid;
  gap: var(--ds-space-3);
  padding-top: var(--ds-space-2);
}
.atelier .studio-top h1,
.atelier .studio-top p {
  margin: 0;
}
.atelier .studio-actions {
  gap: var(--ds-space-3);
  margin-block: var(--ds-space-4);
}
.atelier .studio-formline {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ds-space-3);
}
.atelier .studio-formline > label,
.atelier .studio-form > label {
  min-width: 0;
}
.atelier .studio-suggestion {
  grid-template-columns: minmax(70px, 88px) minmax(0, 1fr) auto;
}
.atelier .studio-suggestion-copy {
  min-width: 0;
  overflow-wrap: anywhere;
}
.atelier .studio-grocery-line > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.atelier .studio-grocery-line > strong {
  text-align: right;
  white-space: normal;
}
.atelier .studio-diagnostic-row {
  min-width: 0;
}
.atelier .recipe-grid {
  gap: var(--ds-grid-gap);
}
.atelier .recipe-tile {
  min-width: 0;
}
.atelier .editor-columns,
.atelier .print-setup,
.atelier .detail-cols {
  min-width: 0;
}
.atelier .modal,
.atelier .modal-content {
  min-width: 0;
}
@container atelier-card (max-width: 1180px) {
  .atelier .ds-grid--split {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atelier .studio-grid-main.ds-grid--split {
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .ds-grid--three {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atelier .sidebar {
    padding-inline: var(--ds-space-3);
  }
}
@container atelier-card (max-width: 860px) {
  .atelier .studio-grid-main,
  .atelier .ds-grid--split,
  .atelier .ds-grid--three {
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .studio-grid {
    gap: var(--ds-space-4);
  }
  .atelier .studio-grid > .studio-panel {
    margin: 0;
  }
  .atelier .ds-page-header h1,
  .atelier .studio-top h1 {
    font-size: clamp(32px, 5cqi, 44px);
  }
  .atelier .detail-cols,
  .atelier .editor-columns,
  .atelier .print-setup {
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .studio-suggestion {
    grid-template-columns: 72px minmax(0, 1fr);
  }
  .atelier .studio-suggestion > :last-child:is(button) {
    grid-column: 2;
    justify-self: start;
  }
}
@container atelier-card (max-width: 760px) {
  .atelier {
    --ds-page-gutter: var(--ds-space-5);
    --ds-grid-gap: var(--ds-space-4);
    --ds-panel-padding: var(--ds-space-5);
  }
  .atelier .shell {
    display: flex;
    flex-direction: column;
  }
  .atelier .sidebar {
    min-height: 0;
    padding: var(--ds-space-3);
    position: sticky;
    top: 0;
    z-index: 20;
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid var(--ds-border);
  }
  .atelier .main {
    padding: var(--ds-page-gutter);
  }
  .atelier .identity,
  .atelier .nav-label,
  .atelier .sidebar-footer {
    display: none;
  }
  .atelier .nav {
    display: flex;
    width: 100%;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    gap: var(--ds-space-2);
    padding-bottom: var(--ds-space-1);
  }
  .atelier .nav::-webkit-scrollbar {
    display: none;
  }
  .atelier .nav button {
    flex: 0 0 auto;
    min-width: 80px;
    min-height: 60px;
    padding: var(--ds-space-2) var(--ds-space-3);
    display: grid;
    justify-items: center;
    gap: var(--ds-space-1);
    text-align: center;
    scroll-snap-align: center;
  }
  .atelier .nav button span {
    max-width: 130px;
    overflow-wrap: normal;
    white-space: normal;
    font-size: 11px;
    line-height: 1.2;
  }
  .atelier .nav button:hover:not(.active) {
    transform: none;
  }
  .atelier .topbar {
    gap: var(--ds-space-2);
    margin-bottom: var(--ds-space-6);
  }
  .atelier .topbar .toolbar {
    gap: var(--ds-space-1);
  }
  .atelier .topbar .toolbar .icon-btn {
    width: var(--ds-touch-height);
    height: var(--ds-touch-height);
  }
  .atelier .studio-formline {
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .studio-actions {
    display: flex;
    flex-wrap: wrap;
  }
  .atelier .studio-suggestion {
    grid-template-columns: 65px minmax(0, 1fr);
  }
  .atelier .studio-suggestion-photo {
    width: 65px;
    height: 65px;
  }
  .atelier .studio-book-list {
    max-height: 310px;
  }
  .atelier .statline {
    gap: 0;
  }
  .atelier .stat {
    min-width: 0;
    padding-inline: var(--ds-space-2);
  }
  .atelier .hero {
    max-width: 100%;
  }
  .atelier .view-stage {
    min-height: 0;
  }
  .atelier .main > .atelier-credit-footer {
    display: flex;
  }
  .atelier .sidebar-footer {
    display: none;
  }
}
@container atelier-card (max-width: 430px) {
  .atelier {
    --ds-page-gutter: var(--ds-space-4);
    --ds-panel-padding: var(--ds-space-4);
  }
  .atelier .studio-panel,
  .atelier .editor-card,
  .atelier .manage-card,
  .atelier .shopping-card,
  .atelier .today-panel {
    padding: var(--ds-panel-padding);
  }
  .atelier .ds-page-header h1,
  .atelier .studio-top h1 {
    font-size: clamp(30px, 9cqi, 38px);
  }
  .atelier .studio-top {
    padding-top: var(--ds-space-3);
  }
  .atelier .studio-daily {
    padding: var(--ds-space-5);
  }
  .atelier .command-caption {
    display: none;
  }
  .atelier .command-launch {
    min-width: var(--ds-touch-height);
    width: var(--ds-touch-height);
    height: var(--ds-touch-height);
    border-radius: 50%;
    padding: 0;
    justify-content: center;
  }
  .atelier .command-launch .shortcut {
    display: none;
  }
  .atelier .studio-panel h2 {
    font-size: clamp(22px, 7cqi, 28px);
  }
  .atelier .recipe-grid:not(.is-featured) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--ds-space-3);
  }
  .atelier .tile-body h3 {
    min-height: 0;
    font-size: clamp(16px, 4.8cqi, 20px);
  }
  .atelier .studio-grocery-line {
    align-items: flex-start;
  }
}

.atelier .ds-page-header h1 em {
  color: var(--ds-brand);
  font-weight: 400;
  font-style: italic;
}
/* Responsive content carousels: one readable day with a visible next-day peek. */
.atelier .week-grid {
  scroll-padding-inline: var(--ds-space-1);
  overscroll-behavior-inline: contain;
}
@container atelier-card (max-width: 760px) {
  .atelier .week-grid {
    grid-template-columns: repeat(7, minmax(210px, min(46cqi, 310px)));
    gap: var(--ds-space-3);
    /* Swiped one day at a time, so each day keeps its own height instead of the tallest one. */
    align-items: start;
  }
  .atelier .week-grid > .day {
    min-height: 205px;
    padding: var(--ds-space-4);
  }
}
@container atelier-card (max-width: 430px) {
  .atelier .week-grid {
    grid-template-columns: repeat(7, min(77cqi, 300px));
  }
  .atelier .week-grid > .day {
    min-height: 214px;
  }
}

/* Semantic shopping toolbar, shared across themes and card widths. */
.atelier .shopping-toolbar {
  justify-content: flex-end;
  margin-block: 0 var(--ds-space-4);
}
.atelier .shopping-form {
  align-items: stretch;
  gap: var(--ds-space-3);
}
.atelier .shopping-form > input {
  flex: 1 1 200px;
}
.atelier .shopping-form > button {
  flex: 0 0 auto;
}
@container atelier-card (max-width: 430px) {
  .atelier .shopping-form > button {
    flex: 1 1 100%;
  }
}

/* Shared control, surface, field and feedback contract. */
.atelier .ds-surface,
.atelier .studio-panel,
.atelier .editor-card,
.atelier .manage-card,
.atelier .shopping-card,
.atelier .today-panel {
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  padding: var(--ds-panel-padding);
  min-width: 0;
  box-shadow: var(--ds-shadow-panel);
}
.atelier .ds-surface[data-elevation="flat"] {
  box-shadow: none;
}
.atelier .ds-surface[data-tone="subtle"] {
  background: var(--ds-surface-raised);
}
.atelier .ds-surface-header,
.atelier .studio-head {
  display: grid;
  gap: var(--ds-space-2);
  margin-bottom: var(--ds-space-5);
  min-width: 0;
}
.atelier .ds-surface-header h2,
.atelier .studio-head h2 {
  margin: 0;
  font-family: var(--at-serif, Georgia, serif);
  font-weight: 400;
  font-size: clamp(23px, 2.1cqi, 31px);
  line-height: var(--ds-line-tight);
}
.atelier .ds-surface-header p,
.atelier .studio-head p {
  margin: 0;
  color: var(--ds-muted);
  font-size: var(--ds-font-md);
  line-height: var(--ds-line-body);
}
.atelier .ds-empty {
  display: grid;
  justify-items: start;
  align-content: center;
  gap: var(--ds-space-3);
  min-height: 160px;
  padding: var(--ds-space-6);
  background: var(--ds-surface-raised);
  border: 1px dashed var(--ds-border);
  border-radius: var(--ds-radius-md);
}
.atelier .ds-empty strong {
  font-size: var(--ds-font-lg);
}
.atelier .ds-empty p {
  color: var(--ds-muted);
  max-width: 56ch;
  line-height: var(--ds-line-body);
}
.atelier .ds-field,
.atelier .studio-form > label,
.atelier .studio-formline > label,
.atelier .field {
  display: grid;
  gap: var(--ds-space-2);
  min-width: 0;
  font-size: var(--ds-font-sm);
  font-weight: 650;
  color: var(--ds-text);
}
.atelier .ds-field-hint {
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
  line-height: 1.5;
  font-weight: 400;
}
.atelier .ds-field > span:first-child {
  line-height: 1.4;
}
.atelier .ds-field[data-invalid="true"] input {
  border-color: #dc9b83;
}
.atelier input:not([type="checkbox"]):not([type="radio"]),
.atelier textarea,
.atelier select {
  min-height: var(--ds-control-height);
  width: 100%;
  min-width: 0;
  padding: var(--ds-space-3) var(--ds-space-4);
  border: 1px solid var(--ds-border);
  background: var(--ds-background);
  color: var(--ds-text);
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-font-md);
  line-height: 1.45;
}
.atelier .search input:not([type="checkbox"]) {
  background: transparent;
  min-height: 0;
  border: 0;
}
.atelier textarea {
  resize: vertical;
  min-height: 100px;
}
.atelier button,
.atelier .btn {
  min-height: var(--ds-control-height);
}
.atelier button:not(.icon-btn):not(.studio-check):not(.nav button) {
  max-width: 100%;
}
.atelier .btn {
  padding: var(--ds-space-3) var(--ds-space-5);
  border-radius: var(--ds-radius-pill);
  font-size: var(--ds-font-sm);
  line-height: 1.28;
  white-space: normal;
  text-align: center;
}
.atelier .btn.tiny {
  min-height: 38px;
}
.atelier button:focus-visible,
.atelier a:focus-visible,
.atelier [tabindex]:focus-visible,
.atelier input:focus-visible,
.atelier select:focus-visible,
.atelier textarea:focus-visible {
  outline: 3px solid var(--ds-ring);
  outline-offset: 3px;
}
.atelier .studio-warning,
.atelier .notice {
  border-radius: var(--ds-radius-md);
  padding: var(--ds-space-4) var(--ds-space-5);
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.atelier .recipe-title {
  margin-block-start: var(--ds-space-3);
}
.atelier .recipe-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
  margin-block-end: var(--ds-space-5);
}
.atelier .recipe-actions {
  flex-wrap: wrap;
}
.atelier .editing-hint {
  margin-block-start: var(--ds-space-3);
}
.atelier .editor-card--steps {
  padding: var(--ds-space-6);
}
.atelier .print-detail-heading {
  margin-block: var(--ds-space-6) var(--ds-space-3);
}
.atelier .btn.print-submit {
  width: 100%;
  margin-block-start: var(--ds-space-5);
}
.atelier .settings-title {
  margin: var(--ds-space-2) 0 var(--ds-space-6);
}
.atelier .studio-muted {
  font-size: var(--ds-font-xs) !important;
  line-height: 1.55;
}
.atelier .studio-form {
  gap: var(--ds-space-4);
}
.atelier .studio-form .studio-inline {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  font-size: var(--ds-font-sm);
}
.atelier .studio-member,
.atelier .studio-timer-row,
.atelier .studio-task,
.atelier .shopping-row {
  min-height: var(--ds-touch-height);
  gap: var(--ds-space-3);
}
.atelier .studio-member > span,
.atelier .studio-task > span,
.atelier .studio-timer-row > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.atelier .studio-diagnostic-row {
  border-radius: var(--ds-radius-md);
  padding: var(--ds-space-4);
}
.atelier .at-premium-dialog,
.at-premium-dialog {
  border-radius: var(--ds-radius-lg, 20px);
  box-shadow: var(--ds-shadow-dialog, 0 35px 90px #0006);
}
@container atelier-card (max-width: 760px) {
  .atelier .studio-actions .btn,
  .atelier .ds-cluster .btn {
    min-height: var(--ds-touch-height);
  }
  .atelier .studio-form button[type="submit"] {
    min-height: var(--ds-touch-height);
  }
  .atelier .studio-plan-row {
    grid-template-columns: 80px minmax(0, 1fr);
  }
}
@container atelier-card (max-width: 430px) {
  .atelier .studio-actions > .btn {
    flex: 1 1 145px;
  }
  .atelier .studio-actions > .btn:only-child {
    flex-grow: 0;
  }
  .atelier .studio-form .studio-inline {
    align-items: flex-start;
  }
  .atelier .studio-plan-row {
    grid-template-columns: 65px minmax(0, 1fr);
  }
}
@media (prefers-reduced-motion: reduce) {
  .atelier .ds-surface,
  .atelier .ds-grid *,
  .atelier .ds-page * {
    scroll-behavior: auto !important;
    animation-duration: var(--ds-motion-reduced) !important;
    transition-duration: var(--ds-motion-reduced) !important;
  }
}

.atelier .studio-panel p:not(.studio-muted) {
  font-size: var(--ds-font-sm);
  line-height: var(--ds-line-body);
}
.atelier .studio-suggestion-copy p {
  font-size: var(--ds-font-xs);
  line-height: 1.55;
}
.atelier .studio-suggestion-copy strong {
  font-size: clamp(19px, 1.7cqi, 24px);
  line-height: 1.18;
}
.atelier .studio-book-list {
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--ds-muted) transparent;
}
.atelier .icon-btn {
  min-inline-size: var(--ds-control-height);
  min-block-size: var(--ds-control-height);
}
.atelier :is(button, [role="button"], a) {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.atelier
  :is(.studio-panel, .editor-card, .manage-card, .shopping-card, .today-panel)
  :is(h1, h2, h3, p) {
  overflow-wrap: break-word;
}
.atelier .studio-grocery-line,
.atelier .studio-task,
.atelier .studio-member {
  min-width: 0;
}
.atelier [aria-busy="true"] {
  cursor: progress;
}
.atelier button:disabled,
.atelier .btn[disabled] {
  cursor: not-allowed;
}
.atelier .cook-utility {
  display: grid;
  gap: var(--ds-space-3);
  min-width: 0;
  margin: 0;
  padding: var(--ds-space-4);
  border: 1px solid color-mix(in srgb, var(--ds-brand) 18%, var(--ds-border));
  border-radius: var(--ds-radius-lg);
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--ds-surface-raised) 88%, var(--ds-brand) 12%),
    var(--ds-surface-raised)
  );
}
.atelier .cook-controls {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  min-width: 0;
}
.atelier .cook-timer-header {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  min-width: 0;
}
.atelier .cook-timer-mark {
  display: grid;
  place-items: center;
  flex: 0 0 42px;
  inline-size: 42px;
  block-size: 42px;
  border: 1px solid color-mix(in srgb, var(--ds-brand) 26%, var(--ds-border));
  border-radius: var(--ds-radius-md);
  background: color-mix(in srgb, var(--ds-brand) 12%, var(--ds-surface));
  color: var(--ds-brand);
}
.atelier .cook-timer-header > div {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.atelier .cook-timer-kicker {
  color: var(--ds-brand);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.13em;
  line-height: 1.4;
}
.atelier .cook-timer-header strong {
  color: var(--ds-text);
  font-family: var(--at-serif, Georgia, serif);
  font-size: clamp(15px, 1.4cqi, 18px);
  font-weight: 400;
  line-height: 1.2;
}
.atelier .cook-timer-count {
  flex: 0 0 auto;
  margin-inline-start: auto;
  padding: 5px 9px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-pill);
  color: var(--ds-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.atelier .cook-timers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: var(--ds-space-2);
  min-width: 0;
}
.atelier .cook-timer-card {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) 44px;
  align-items: center;
  gap: var(--ds-space-3);
  min-width: 0;
  padding: var(--ds-space-2) var(--ds-space-3);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: color-mix(in srgb, var(--ds-surface) 92%, var(--ds-brand) 8%);
}
.atelier .cook-timer-dial {
  display: grid;
  place-items: center;
  inline-size: 60px;
  block-size: 60px;
  padding: 4px;
  border-radius: 50%;
  background: conic-gradient(
    var(--ds-brand) var(--timer-progress, 0%),
    color-mix(in srgb, var(--ds-brand) 13%, var(--ds-border)) 0
  );
  transition: background var(--ds-motion-base) linear;
}
.atelier .cook-timer-dial > span {
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: 100%;
  border: 1px solid var(--ds-border);
  border-radius: 50%;
  background: var(--ds-surface);
}
.atelier .cook-timer-dial time {
  color: var(--ds-text);
  font-size: 12px;
  font-weight: 760;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.035em;
}
.atelier .cook-timer-card.is-progress-unknown .cook-timer-dial {
  background: color-mix(in srgb, var(--ds-brand) 15%, var(--ds-border));
}
.atelier .cook-timer-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.atelier .cook-timer-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ds-muted);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.11em;
  line-height: 1.4;
}
.atelier .cook-timer-status::before {
  content: "";
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--ds-brand);
  animation: at-timer-live var(--ds-motion-loading) ease-in-out infinite;
}
.atelier .cook-timer-card.is-done .cook-timer-status {
  color: var(--ds-brand);
}
.atelier .cook-timer-card.is-done .cook-timer-status::before {
  animation: none;
}
.atelier .cook-timer-copy strong {
  color: var(--ds-text);
  font-size: var(--ds-font-md);
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.atelier .cook-timer-copy small {
  color: var(--ds-muted);
  font-size: 10px;
  line-height: 1.4;
}
.atelier .cook-timer-card .icon-btn {
  display: grid;
  place-items: center;
  min-inline-size: 44px;
  inline-size: 44px;
  min-block-size: 44px;
  block-size: 44px;
  border-radius: var(--ds-radius-pill);
  color: var(--ds-muted);
}
.atelier .cook-timer-card .icon-btn:hover {
  background: color-mix(in srgb, var(--ds-brand) 12%, transparent);
  color: var(--ds-text);
}
.atelier .cook-timers-empty {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  min-height: 38px;
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
  line-height: 1.5;
}
.atelier .cook-timers-empty > span:first-child {
  display: grid;
  place-items: center;
  flex: 0 0 30px;
  inline-size: 30px;
  block-size: 30px;
  border-radius: 50%;
  color: var(--ds-brand);
  background: color-mix(in srgb, var(--ds-brand) 11%, var(--ds-surface));
}
.atelier .cook-timer-compose {
  display: grid;
  gap: var(--ds-space-2);
  min-width: 0;
  padding-block-start: var(--ds-space-3);
  border-block-start: 1px solid var(--ds-border);
}
.atelier .cook-timer-presets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
}
.atelier .cook-timer-presets button {
  min-height: 44px;
  padding: var(--ds-space-2) var(--ds-space-3);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-pill);
  background: var(--ds-surface);
  color: var(--ds-text);
  font-size: var(--ds-font-xs);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  transition:
    transform var(--ds-motion-fast) var(--ds-motion-ease),
    border-color var(--ds-motion-fast) var(--ds-motion-ease),
    background var(--ds-motion-fast) var(--ds-motion-ease);
}
.atelier .cook-timer-presets button:hover {
  transform: translateY(-1px);
  border-color: var(--ds-brand);
  background: color-mix(in srgb, var(--ds-brand) 9%, var(--ds-surface));
}
.atelier .cook-timer-fields {
  display: grid;
  grid-template-columns: minmax(76px, 0.52fr) minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--ds-space-2);
  min-width: 0;
}
.atelier .cook-timer-fields label {
  display: grid;
  gap: 5px;
  min-width: 0;
  color: var(--ds-muted);
  font-size: 10px;
  font-weight: 650;
}
.atelier .cook-timer-fields label > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.atelier .cook-timer-fields input {
  min-height: 44px !important;
  padding: var(--ds-space-2) var(--ds-space-3) !important;
  border-radius: var(--ds-radius-sm) !important;
  font-size: var(--ds-font-xs) !important;
}
.atelier .cook-timer-fields input[data-timer-minutes] {
  font-variant-numeric: tabular-nums;
}
.atelier .cook-timer-start {
  min-height: 44px;
  padding-inline: var(--ds-space-4);
  white-space: nowrap;
}
.atelier .cook-timer-start svg {
  flex: 0 0 auto;
}
@keyframes at-timer-live {
  50% {
    opacity: 0.42;
    transform: scale(0.82);
  }
}
@container atelier-card (max-width:430px) {
  .atelier .cook-utility {
    padding: var(--ds-space-3);
  }
  .atelier .cook-timer-fields {
    grid-template-columns: minmax(72px, 0.45fr) minmax(0, 1fr);
  }
  .atelier .cook-timer-start {
    grid-column: 1/-1;
    width: 100%;
    justify-content: center;
  }
  .atelier .cook-timer-card {
    grid-template-columns: 56px minmax(0, 1fr) 44px;
    gap: var(--ds-space-2);
    padding: var(--ds-space-2);
  }
  .atelier .cook-timer-dial {
    inline-size: 56px;
    block-size: 56px;
  }
  .atelier .cook-timer-header strong {
    font-size: 15px;
  }
}
@container atelier-card (max-width:760px) {
  .atelier .cook-controls {
    gap: var(--ds-space-3);
  }
  .atelier .cook-actions {
    order: 3;
  }
  .atelier .cook-utility {
    order: 4;
  }
  .atelier .cook-note {
    order: 5;
  }
  .atelier .cook-footnote {
    order: 6;
  }
}
@media (orientation: landscape) and (max-height: 520px) {
  .atelier .cook-actions {
    order: 3;
  }
  .atelier .cook-utility {
    order: 4;
  }
  .atelier .cook-note {
    order: 5;
  }
  .atelier .cook-footnote {
    order: 6;
  }
}
@container atelier-card (max-width: 430px) {
  .atelier .studio-book-list {
    max-block-size: clamp(230px, 45cqh, 320px);
  }
  .atelier .studio-book-row {
    min-block-size: 52px;
  }
  .atelier .studio-actions {
    gap: var(--ds-space-2);
  }
  .atelier .studio-actions > .btn {
    flex: 1 1 min(100%, 145px);
  }
  .atelier .studio-actions > .btn:only-child {
    flex: 1 1 auto;
  }
}
.atelier .provider-note {
  margin: 14px 0 0;
  padding: 12px 14px;
  border: 1px solid var(--at-line);
  border-radius: 12px;
  color: var(--at-sub);
  background: var(--at-panel);
  font-size: 12px;
  line-height: 1.55;
}
.atelier .provider-note:before {
  content: "↳";
  margin-inline-end: 8px;
  color: var(--ds-brand);
  font-weight: 800;
}

/* Control primitives v0.9.1: one visual contract for all interactive states. */
:host {
  --ds-check-size: 22px;
  --ds-check-target: 44px;
  --ds-check-ink: #12251b;
}
.atelier {
  --ds-check-ink: var(--ds-brand-foreground);
  --ds-control-strong: color-mix(in srgb, var(--ds-muted) 76%, var(--ds-border));
  --ds-control-hover: color-mix(in srgb, var(--ds-brand) 75%, var(--ds-border));
  --ds-control-focus: color-mix(in srgb, var(--ds-brand) 17%, transparent);
  --ds-negative: #e1a18d;
  color-scheme: dark;
}
.atelier.light {
  color-scheme: light;
}

/* Never allow legacy generic input selectors to size a checkbox as a text field. */
.atelier input[type="checkbox"],
.atelier input[type="radio"] {
  -webkit-appearance: none;
  appearance: none;
  box-sizing: border-box;
  inline-size: var(--ds-check-size);
  block-size: var(--ds-check-size);
  min-inline-size: var(--ds-check-size);
  min-block-size: var(--ds-check-size);
  width: var(--ds-check-size);
  height: var(--ds-check-size);
  min-height: var(--ds-check-size);
  max-height: var(--ds-check-size);
  margin: 0;
  padding: 0;
  flex: 0 0 var(--ds-check-size);
  display: inline-grid;
  place-content: center;
  border: 1.5px solid var(--ds-control-strong);
  border-radius: 6px;
  background: var(--ds-background);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.13);
  color: var(--ds-check-ink);
  cursor: pointer;
  vertical-align: middle;
  transition:
    background-color var(--ds-motion-fast) var(--ds-motion-ease),
    border-color var(--ds-motion-fast) var(--ds-motion-ease),
    box-shadow var(--ds-motion-fast) var(--ds-motion-ease),
    transform var(--ds-motion-fast) var(--ds-motion-ease);
}
.atelier input[type="checkbox"]::after {
  content: "";
  box-sizing: border-box;
  width: 11px;
  height: 7px;
  border: solid var(--ds-check-ink);
  border-width: 0 0 2.5px 2.5px;
  transform: translateY(-1px) rotate(-45deg) scale(0);
  opacity: 0;
  transition:
    transform var(--ds-motion-fast) var(--ds-motion-spring),
    opacity var(--ds-motion-fast) var(--ds-motion-ease);
}
.atelier input[type="checkbox"]:checked {
  background: var(--ds-brand);
  border-color: var(--ds-brand);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--ds-brand) 16%, transparent);
}
.atelier input[type="checkbox"]:checked::after {
  transform: translateY(-1px) rotate(-45deg) scale(1);
  opacity: 1;
}
.atelier input[type="checkbox"]:indeterminate {
  background: var(--ds-brand);
  border-color: var(--ds-brand);
}
.atelier input[type="checkbox"]:indeterminate::after {
  width: 11px;
  height: 0;
  border-width: 0 0 2.5px;
  transform: none;
  opacity: 1;
}
.atelier input[type="radio"] {
  border-radius: 50%;
}
.atelier input[type="radio"]::after {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--ds-check-ink);
  transform: scale(0);
  transition: transform var(--ds-motion-fast) var(--ds-motion-ease);
}
.atelier input[type="radio"]:checked {
  background: var(--ds-brand);
  border-color: var(--ds-brand);
}
.atelier input[type="radio"]:checked::after {
  transform: scale(1);
}
.atelier input:is([type="checkbox"], [type="radio"]):hover:not(:disabled) {
  border-color: var(--ds-control-hover);
}
.atelier input:is([type="checkbox"], [type="radio"]):focus-visible {
  outline: 2px solid var(--ds-brand);
  outline-offset: 4px;
  box-shadow: 0 0 0 4px var(--ds-control-focus);
}
.atelier input:is([type="checkbox"], [type="radio"]):disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Text-wrapped label rows are the click target, not a tiny input alone. */
.atelier :is(.studio-book-row, .studio-inline, .editor-check, .ingredient, .ds-check-row) {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--ds-space-3);
  min-block-size: var(--ds-check-target);
  min-inline-size: 0;
  cursor: pointer;
  color: var(--ds-text);
  font-size: var(--ds-font-md);
  font-weight: 550;
  line-height: 1.5;
}
.atelier
  :is(.studio-book-row, .studio-inline, .editor-check, .ingredient, .ds-check-row)
  > input:is([type="checkbox"], [type="radio"]) {
  align-self: center;
}
.atelier :is(.studio-book-row, .studio-inline, .editor-check, .ingredient, .ds-check-row) > span {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}
.atelier .studio-book-row {
  padding: var(--ds-space-3) var(--ds-space-2);
  border-bottom: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
}
.atelier .studio-book-row:hover,
.atelier .ingredient:hover {
  background: color-mix(in srgb, var(--ds-brand) 5%, transparent);
}
.atelier .studio-book-row:has(input:checked),
.atelier .ingredient:has(input:checked) {
  background: color-mix(in srgb, var(--ds-brand) 9%, transparent);
}
.atelier .studio-book-row:focus-within {
  outline: none;
}
.atelier .studio-book-row:has(input:focus-visible),
.atelier .ingredient:has(input:focus-visible),
.atelier .editor-check:has(input:focus-visible) {
  outline: 2px solid var(--ds-ring);
  outline-offset: 2px;
}
.atelier .editor-check {
  padding: var(--ds-space-3) var(--ds-space-4);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-raised);
}
.atelier .studio-form > label.studio-inline,
.atelier .studio-formline > label.studio-inline {
  display: flex;
  font-size: var(--ds-font-md);
  font-weight: 550;
  color: var(--ds-text);
}
.atelier .ingredient {
  align-items: start;
  padding: var(--ds-space-3) var(--ds-space-2);
}
.atelier .ingredient > input[type="checkbox"] {
  margin: 1px 0 0;
}
.atelier .ingredient:has(input:checked) > span {
  text-decoration: line-through;
  text-decoration-color: var(--ds-muted);
  color: var(--ds-muted);
}
.atelier .field > span:has(> input[type="checkbox"]) {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  min-block-size: var(--ds-check-target);
  font-size: var(--ds-font-md);
  font-weight: 600;
  letter-spacing: normal;
  text-transform: none;
  cursor: pointer;
}

/* Shopping and family task checkboxes are buttons with explicit checkbox semantics. */
.atelier button:is(.check-ui, .studio-check) {
  position: relative;
  box-sizing: border-box;
  width: var(--ds-check-target);
  height: var(--ds-check-target);
  min-width: var(--ds-check-target);
  min-height: var(--ds-check-target);
  flex: 0 0 var(--ds-check-target);
  padding: 0;
  margin: 0;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: transparent;
  color: transparent;
  box-shadow: none;
  cursor: pointer;
  transition:
    background-color var(--ds-motion-fast) var(--ds-motion-ease),
    transform var(--ds-motion-fast) var(--ds-motion-ease);
}
.atelier button:is(.check-ui, .studio-check)::before {
  content: "";
  position: absolute;
  box-sizing: border-box;
  width: var(--ds-check-size);
  height: var(--ds-check-size);
  border-radius: 6px;
  border: 1.5px solid var(--ds-control-strong);
  background: var(--ds-background);
  transition:
    background-color var(--ds-motion-fast) var(--ds-motion-ease),
    border-color var(--ds-motion-fast) var(--ds-motion-ease);
}
.atelier button:is(.check-ui, .studio-check) svg {
  position: relative;
  z-index: 1;
  width: 14px;
  height: 14px;
  color: var(--ds-check-ink);
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity var(--ds-motion-fast) var(--ds-motion-ease),
    transform var(--ds-motion-fast) var(--ds-motion-ease);
}
.atelier button:is(.check-ui, .studio-check):is([aria-checked="true"], .done),
.atelier .shopping-row.checked button.check-ui {
  background: transparent;
  border: 0;
  color: transparent;
}
.atelier button:is(.check-ui, .studio-check):is([aria-checked="true"], .done)::before,
.atelier .shopping-row.checked button.check-ui::before {
  background: var(--ds-brand);
  border-color: var(--ds-brand);
}
.atelier button:is(.check-ui, .studio-check):is([aria-checked="true"], .done) svg,
.atelier .shopping-row.checked button.check-ui svg {
  opacity: 1;
  transform: scale(1);
}
.atelier button:is(.check-ui, .studio-check):hover:not(:disabled) {
  background: var(--ds-control-focus);
}
.atelier button:is(.check-ui, .studio-check):focus-visible {
  outline: 2px solid var(--ds-ring);
  outline-offset: 2px;
}
.atelier button:is(.check-ui, .studio-check):disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.atelier .studio-task {
  justify-content: flex-start;
}
.atelier .studio-task > span {
  flex: 1;
}

/* Inputs and pickers: consistent height, text, focus and field validation. */
.atelier :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea) {
  box-sizing: border-box;
  font-family: inherit;
  font-size: 16px;
  color: var(--ds-text);
}
.atelier select {
  padding-right: 38px;
  cursor: pointer;
}
.atelier :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea):disabled {
  opacity: 0.58;
  cursor: not-allowed;
  background: var(--ds-surface-raised);
}
.atelier
  :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea)[aria-invalid="true"] {
  border-color: var(--ds-negative);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-negative) 14%, transparent);
}
.atelier .ds-field:has([aria-invalid="true"]) > span:first-child {
  color: var(--ds-negative);
}
.atelier :is(.btn, button):focus-visible {
  outline: 2px solid var(--ds-brand);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .atelier input:is([type="checkbox"], [type="radio"]),
  .atelier input:is([type="checkbox"], [type="radio"])::after,
  .atelier button:is(.check-ui, .studio-check),
  .atelier button:is(.check-ui, .studio-check) svg {
    transition: none;
    animation: none;
  }
}
@media (forced-colors: active) {
  .atelier input:is([type="checkbox"], [type="radio"]):checked,
  .atelier button:is(.check-ui, .studio-check)[aria-checked="true"]::before {
    background: Highlight;
    border-color: Highlight;
  }
  .atelier input:is([type="checkbox"], [type="radio"]):checked::after,
  .atelier button:is(.check-ui, .studio-check)[aria-checked="true"] svg {
    filter: invert(1);
  }
}
/* Selection controls are consistent with checkboxes and usable on touch. */
.atelier .swatches {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.atelier button.swatch {
  position: relative;
  box-sizing: border-box;
  width: 46px;
  height: 46px;
  min-width: 46px;
  min-height: 46px;
  border: 2px solid var(--ds-surface);
  border-radius: 14px;
  outline: none;
  box-shadow:
    0 0 0 1px var(--ds-border),
    inset 0 0 0 1px #ffffff55;
  transition:
    transform var(--ds-motion-fast) var(--ds-motion-ease),
    box-shadow var(--ds-motion-fast) var(--ds-motion-ease);
}
.atelier button.swatch[aria-pressed="true"] {
  outline: 2px solid var(--ds-text);
  outline-offset: 3px;
  box-shadow:
    0 0 0 1px var(--ds-surface),
    inset 0 0 0 1px #ffffff66;
}
.atelier button.swatch[aria-pressed="true"]::after {
  content: "";
  display: block;
  position: absolute;
  top: 13px;
  left: 16px;
  width: 11px;
  height: 7px;
  border: solid #15281e;
  border-width: 0 0 2.5px 2.5px;
  transform: rotate(-45deg);
}
.atelier button.swatch:hover:not(:disabled) {
  transform: translateY(-2px);
}
.atelier button.swatch:focus-visible {
  outline: 3px solid var(--ds-ring);
  outline-offset: 4px;
}
/* Exclusive design choices read as a typographic register, not a row of pills. */
.atelier .range {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--ds-space-5);
  min-width: 0;
}
.atelier .range button.range-option {
  flex: 0 1 auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  min-height: 44px;
  padding: 0 1px;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: none;
  color: var(--ds-muted);
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
  transition:
    color var(--ds-motion-fast) var(--ds-motion-ease),
    border-color var(--ds-motion-fast) var(--ds-motion-ease);
}
.atelier .range button.range-option:hover {
  color: var(--ds-text);
}
.atelier .range button.range-option[aria-pressed="true"] {
  border-bottom-color: var(--ds-brand);
  color: var(--ds-text);
}
.atelier .range button.range-option:focus-visible {
  outline: 3px solid var(--ds-ring);
  outline-offset: 2px;
}
.atelier button.print-option {
  min-height: 65px;
  padding: 12px 15px;
  gap: 14px;
}
.atelier button.print-option[aria-pressed="true"] {
  border-color: var(--ds-brand);
  background: color-mix(in srgb, var(--ds-brand) 14%, var(--ds-surface));
}
.atelier button.print-option[aria-pressed="true"]::after {
  content: "";
  height: 9px;
  width: 9px;
  border-radius: 50%;
  background: var(--ds-brand);
  margin-left: auto;
  flex: none;
}
.atelier button.print-option > div:nth-child(2) {
  min-width: 0;
  overflow-wrap: anywhere;
}
.atelier button.print-option:focus-visible {
  outline: 2px solid var(--ds-ring);
  outline-offset: 3px;
}
.atelier button:disabled,
.atelier .btn:disabled {
  opacity: 1;
  background: color-mix(in srgb, var(--ds-surface-raised) 75%, var(--ds-surface));
  border-color: var(--ds-border);
  color: var(--ds-muted);
  filter: none;
  transform: none;
  box-shadow: none;
  cursor: not-allowed;
}
/* Disabled check buttons intentionally keep their own distinct checked state. */
.atelier button:is(.check-ui, .studio-check):disabled {
  background: transparent;
  opacity: 0.5;
}
/* Do not scale the actual touch target during the satisfying check animation. */
.atelier .shopping-row.checked button.check-ui,
.atelier button.studio-check.done {
  animation: none;
}
.atelier .shopping-row.checked button.check-ui::before,
.atelier button.studio-check.done::before {
  animation: at-check-pop var(--ds-motion-enter) var(--ds-motion-ease) both;
}
/* Even compact inline actions remain tappable at home-assistant card widths. */
.atelier button.btn.tiny,
.atelier .today-panel button,
.atelier .shopping-card button,
.atelier .mealplan button,
.atelier .studio-panel button,
.atelier .studio-pantry-row button,
.atelier .day button {
  min-block-size: 44px;
}
.atelier .btn.plain {
  padding-block: 9px;
}
@container atelier-card (max-width: 760px) {
  .atelier button:not(.check-ui):not(.studio-check) {
    min-block-size: 44px;
  }
  .atelier .studio-actions .btn {
    min-block-size: 48px;
  }
}
/* One clear focus indication per interactive row, no nested double rings. */
.atelier :is(.studio-book-row, .ingredient) > input[type="checkbox"]:focus-visible {
  outline: none;
  box-shadow: none;
}
.atelier :is(.studio-book-row, .ingredient):has(> input[type="checkbox"]:focus-visible) {
  outline: 2px solid var(--ds-ring);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .atelier button.swatch,
  .atelier button.print-option,
  .atelier .shopping-row.checked button.check-ui::before,
  .atelier button.studio-check.done::before {
    animation: none !important;
    transition: none !important;
  }
}
/* Hit areas do not shrink for secondary or icon-only actions. */
.atelier button:is(.btn.plain, .btn.tiny, .command-launch),
.atelier .heading .toolbar button.btn,
.atelier .studio-family-actions button.btn {
  min-height: var(--ds-touch-height);
}
.atelier .command-launch {
  min-height: 46px;
}
/* Native validation after the user interacts, not alarming red on first render. */
.atelier :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea):user-invalid {
  border-color: var(--ds-negative);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-negative) 14%, transparent);
}
.atelier :is(input, textarea, select):read-only:not(:disabled) {
  cursor: default;
}
.atelier :is(.btn, button)[aria-busy="true"] {
  cursor: progress;
  pointer-events: none;
}

/* Mealie Atelier / Interface polish 0.9.2
   One final presentation layer, driven by semantic tokens and actual card width.
   Do not add one-off viewport hacks to individual legacy stylesheets. */
:host {
  --ds-text-xs: 12px;
  --ds-text-sm: 14px;
  --ds-text-body: 15px;
  --ds-text-lead: 17px;
  --ds-ink-soft: #bdc9bf;
  --ds-control-radius: 13px;
  --ds-hover-time: var(--ds-motion-base);
  --ds-dialog-edge: clamp(18px, 3cqi, 40px);
  --ds-card-safe: clamp(16px, 2.9cqi, 42px);
}
.atelier {
  --ds-font-xs: var(--ds-text-xs);
  --ds-font-sm: var(--ds-text-sm);
  --ds-font-md: var(--ds-text-body);
  --ds-font-lg: var(--ds-text-lead);
  --ds-page-gutter: var(--ds-card-safe);
  --ds-grid-gap: clamp(16px, 1.9cqi, 24px);
  --ds-panel-padding: clamp(20px, 2.5cqi, 30px);
  --ds-negative: #f0a58e;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  overflow-wrap: normal;
}
.atelier .shell {
  grid-template-columns: 206px minmax(0, 1fr);
  min-width: 0;
}
.atelier .sidebar {
  padding: 32px 15px 24px;
  min-width: 0;
}
.atelier .main {
  padding: var(--ds-page-gutter);
  min-width: 0;
}
.atelier .topbar,
.atelier .view-stage {
  max-width: 1216px;
  margin-inline: auto;
}
.atelier .topbar {
  margin-bottom: clamp(22px, 2.6cqi, 34px);
}
.atelier .breadcrumb {
  font-size: 13px;
  letter-spacing: 0.01em;
  min-width: 0;
}
.atelier .breadcrumb strong {
  font-weight: 670;
}
.atelier .eyebrow {
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.16em;
  line-height: 1.45;
}
.atelier .ds-page-header {
  margin: 0 0 var(--ds-space-7, 28px);
  gap: 10px;
}
.atelier .ds-page-header h1,
.atelier .studio-top h1 {
  font-size: clamp(35px, 4.4cqi, 59px);
  line-height: 1.075;
  letter-spacing: -0.038em;
  max-width: 18ch;
  text-wrap: balance;
}
.atelier .ds-page-header > p,
.atelier .studio-top p {
  font-size: 14px;
  line-height: 1.65;
  max-width: 66ch;
}
.atelier .studio-top {
  margin-bottom: 27px;
  gap: 11px;
}
.atelier .section {
  margin-top: clamp(30px, 4cqi, 48px);
}
.atelier .heading {
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 19px;
}
.atelier .heading h2 {
  font-size: clamp(25px, 2.4cqi, 33px);
  line-height: 1.2;
  font-family: var(--at-serif);
  font-weight: 400;
  letter-spacing: -0.03em;
}
.atelier .heading p {
  font-size: 13px;
  line-height: 1.55;
}
.atelier .heading .toolbar {
  flex-wrap: wrap;
}
.atelier .studio-panel,
.atelier .ds-surface,
.atelier .today-panel,
.atelier .shopping-card,
.atelier .manage-card,
.atelier .editor-card {
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  padding: var(--ds-panel-padding);
  background: var(--ds-surface);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.02),
    0 14px 45px rgba(0, 0, 0, 0.075);
  min-width: 0;
}
.atelier.light
  :is(.studio-panel, .ds-surface, .today-panel, .shopping-card, .manage-card, .editor-card) {
  box-shadow: 0 12px 42px rgba(49, 37, 43, 0.045);
}
.atelier .studio-grid,
.atelier .studio-grid-main {
  gap: var(--ds-grid-gap);
}
.atelier .studio-grid > .studio-panel {
  margin: 0;
}
.atelier .studio-head,
.atelier .ds-surface-header {
  gap: 8px;
  margin-bottom: 20px;
}
.atelier .studio-head h2,
.atelier .ds-surface-header h2 {
  font-size: clamp(24px, 2.7cqi, 32px);
  font-weight: 400;
  letter-spacing: -0.025em;
  margin: 0;
}
.atelier .studio-panel p,
.atelier .studio-head p,
.atelier .studio-panel .studio-muted,
.atelier .studio-muted {
  font-size: 13px !important;
  line-height: 1.62;
  color: var(--ds-muted);
}
.atelier .studio-panel h3 {
  font-size: 15px;
  line-height: 1.4;
  font-weight: 720;
  letter-spacing: 0;
}
.atelier .studio-form {
  gap: var(--ds-space-4);
  margin: var(--ds-space-4) 0;
}
.atelier .studio-form > label,
.atelier .studio-formline > label,
.atelier .field,
.atelier .ds-field {
  font-size: 13px;
  color: var(--ds-text);
  font-weight: 640;
  gap: var(--ds-field-gap);
  line-height: 1.45;
  margin-block: 0;
}
.atelier .studio-formline {
  gap: var(--ds-action-gap);
  align-items: end;
}
.atelier input:not([type="checkbox"]):not([type="radio"]),
.atelier select,
.atelier textarea {
  border-radius: var(--ds-control-radius);
  min-height: var(--ds-control-height);
  font-size: 16px;
  font-weight: 450;
  border: 1px solid var(--ds-border);
  padding: 12px var(--ds-control-padding-x);
  line-height: 1.45;
  background: var(--ds-background);
  transition:
    border-color var(--ds-hover-time),
    box-shadow var(--ds-hover-time),
    background var(--ds-hover-time);
}
.atelier input::placeholder,
.atelier textarea::placeholder {
  color: color-mix(in srgb, var(--ds-muted) 79%, transparent);
  opacity: 1;
}
.atelier
  :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea):hover:not(:disabled):not(
    :focus
  ) {
  border-color: color-mix(in srgb, var(--ds-brand) 43%, var(--ds-border));
}
.atelier :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea):focus-visible {
  outline: 2px solid var(--ds-brand);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ds-brand) 11%, transparent);
}
.atelier textarea {
  line-height: 1.6;
  min-height: 108px;
}
/* Native selects vary dramatically across operating systems. The arrow and text inset are component-owned. */
.atelier select {
  -webkit-appearance: none;
  appearance: none;
  padding-inline: var(--ds-control-padding-x) 46px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23a7b7ad' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 15px center;
  background-size: 18px;
  text-overflow: ellipsis;
  line-height: 1.4;
  cursor: pointer;
}
.atelier.light select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%234c6256' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
}
.atelier select:disabled {
  background-color: var(--ds-surface-raised);
}
.atelier :is(.editor-form, .studio-form, .modal form) .field:last-child {
  margin-block-end: 0;
}
.atelier
  :is(.field, .ds-field, .studio-form > label, .studio-formline > label)
  > :is(input, textarea, select) {
  margin: 0;
}

.atelier :is(button, .btn) {
  font-family: inherit;
}
.atelier .btn {
  box-sizing: border-box;
  display: inline-flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: center;
  min-height: var(--ds-control-height);
  padding: 11px var(--ds-control-padding-x);
  border-radius: var(--ds-radius-pill);
  font-size: 13px;
  font-weight: 710;
  line-height: 1.4;
  letter-spacing: 0;
  gap: var(--ds-control-gap);
  white-space: normal;
  text-wrap: pretty;
  text-align: center;
  vertical-align: middle;
  transition:
    background-color var(--ds-hover-time),
    border-color var(--ds-hover-time),
    box-shadow var(--ds-transition),
    transform var(--ds-transition),
    color var(--ds-hover-time);
}
.atelier .btn > svg,
.atelier .icon-btn > svg,
.atelier .command-launch > svg,
.atelier .nav button > svg,
.atelier .step-buttons button > svg {
  display: block;
  width: var(--ds-control-icon);
  height: var(--ds-control-icon);
  flex: 0 0 var(--ds-control-icon);
  align-self: center;
  vertical-align: middle;
}
.atelier .btn.tiny {
  min-height: 44px;
  padding: 10px 15px;
  font-size: 12px;
}
.atelier .btn.plain {
  min-height: 44px;
  padding: 10px 7px;
  font-size: 13px;
}
.atelier .btn.icon-only {
  padding: 0;
  min-width: 48px;
  width: 48px;
  min-height: 48px;
  height: 48px;
  flex: 0 0 48px;
}
.atelier .btn.icon-only > svg {
  margin: auto;
}
/* Icon/text spacing is identical across every button family. */
.atelier :is(.form-actions, .studio-actions, .cook-actions, .nutri-actions, .ds-cluster, .toolbar) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: var(--ds-action-gap);
  row-gap: var(--ds-space-2);
  min-width: 0;
}
.atelier .form-actions {
  justify-content: flex-end;
  margin-block: var(--ds-space-5) 0;
}
.atelier .studio-actions {
  margin-block: var(--ds-space-4);
}
.atelier .toolbar {
  column-gap: var(--ds-space-2);
  row-gap: var(--ds-space-2);
}
.atelier .step-buttons {
  gap: var(--ds-space-2);
}
.atelier .step-buttons button {
  display: inline-grid;
  place-items: center;
  min-width: 44px;
  width: 44px;
  min-height: 44px;
  height: 44px;
  padding: 0;
}
.atelier .shopping-list-filter {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--ds-action-gap);
  margin-bottom: var(--ds-space-4);
  min-width: 0;
}
.atelier .shopping-list-filter select {
  width: 100%;
  max-width: 320px;
}
.atelier .shopping-list-filter .pill {
  justify-self: end;
  white-space: nowrap;
}
@container atelier-card (max-width: 430px) {
  .atelier .shopping-list-filter {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--ds-space-2);
  }
  .atelier .shopping-list-filter select {
    max-width: none;
  }
  .atelier .form-actions {
    justify-content: stretch;
  }
  .atelier .form-actions .btn {
    flex: 1 1 140px;
  }
  .atelier .step-buttons button {
    min-width: 44px;
    min-height: 44px;
  }
}
.atelier .btn.primary {
  color: var(--ds-brand-foreground, #12221b);
  font-weight: 770;
  box-shadow: 0 8px 21px color-mix(in srgb, var(--ds-brand) 13%, transparent);
}
.atelier .btn.primary:disabled {
  color: var(--ds-muted);
  box-shadow: none;
}
.atelier .btn:not(.primary):hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-brand) 12%, var(--ds-surface));
  border-color: color-mix(in srgb, var(--ds-brand) 29%, var(--ds-border));
}
.atelier .btn:active:not(:disabled),
.atelier .icon-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.985);
}
.atelier .btn:disabled,
.atelier button:disabled {
  opacity: 0.56;
  filter: saturate(0.6);
}
.atelier .toolbar {
  flex-wrap: wrap;
  gap: var(--ds-space-2);
  min-width: 0;
}
.atelier .icon-btn,
.atelier .command-launch {
  min-height: 48px;
  min-width: 48px;
}
/* The search launcher shares the toolbar buttons' shape at every width. */
.atelier .topbar .command-launch {
  border-radius: 14px;
}
.atelier .icon-btn {
  display: inline-grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  flex: 0 0 48px;
  border-radius: 14px;
  background: var(--ds-surface);
}
.atelier .icon-btn:hover:not(:disabled) {
  background: var(--ds-surface-raised);
  border-color: color-mix(in srgb, var(--ds-brand) 33%, var(--ds-border));
}
.atelier .command-launch {
  border-radius: var(--ds-radius-pill);
  font-size: 13px;
}
.atelier .nav button {
  position: relative;
  min-height: 44px;
  font-size: 13px;
  line-height: 1.4;
  gap: 12px;
  padding: 12px 13px;
}
.atelier .nav button.active {
  box-shadow: inset 2px 0 0 var(--ds-brand);
}
.atelier .nav button.active svg {
  color: var(--ds-brand);
}
.atelier .identity {
  padding-bottom: 35px;
}
.atelier .identity span {
  font-size: 10px;
  letter-spacing: 0.16em;
}
.atelier .nav-label {
  font-size: 11px;
  letter-spacing: 0.16em;
}
.atelier .statline {
  gap: 12px;
  margin: 18px 0 28px;
}
.atelier .stat {
  padding: 16px;
  min-height: 82px;
  border-radius: 17px;
  background: var(--ds-surface);
}
.atelier .stat strong {
  font-size: clamp(23px, 2.4cqi, 31px);
  letter-spacing: -0.045em;
  font-weight: 680;
}
.atelier .stat span {
  font-size: 12px;
  line-height: 1.35;
  margin-top: 6px;
}
.atelier .stat-icon {
  width: 43px;
  height: 43px;
}
.atelier .hero {
  border-radius: var(--ds-radius-xl);
  height: clamp(290px, 30cqi, 390px);
  min-height: 270px;
  padding: clamp(26px, 4cqi, 49px);
}
.atelier.light .hero {
  background-color: #594652;
  border-color: color-mix(in srgb, var(--ds-brand) 24%, transparent);
}
.atelier.light .hero:after {
  background: linear-gradient(
    90deg,
    rgb(42 31 39 / 94%) 0%,
    rgb(57 39 50 / 86%) 38%,
    rgb(75 48 62 / 48%) 66%,
    rgb(45 31 39 / 5%) 100%
  );
}
.atelier.light .hero p {
  color: #f2e8ec;
}
/* The light theme paints eyebrows in the brand plum, which vanishes on the dark hero. */
.atelier.light .hero .eyebrow {
  color: #f3c9da;
}
.atelier .hero h2 {
  font-size: clamp(33px, 4.1cqi, 53px);
  line-height: 1.07;
  letter-spacing: -0.042em;
  text-wrap: balance;
}
.atelier .hero .hero-copy {
  gap: 12px;
  max-width: 62%;
}
.atelier .hero p {
  font-size: 14px;
  line-height: 1.6;
}
.atelier .hero .btn {
  margin-top: 4px;
}
.atelier .recipe-grid {
  gap: var(--ds-grid-gap);
}
.atelier .recipe-grid.is-featured {
  max-width: 100%;
  min-width: 0;
}
.atelier .recipe-tile {
  border: 1px solid transparent;
  background: transparent;
  border-radius: 18px;
  min-height: 0;
  transition:
    transform var(--ds-motion-enter) var(--ds-motion-spring),
    border-color var(--ds-motion-base);
}
.atelier .recipe-tile:hover:not(:disabled) {
  transform: translateY(-3px);
}
.atelier .tile-image {
  border-radius: 18px;
  aspect-ratio: var(--at-tile-ratio, 4/5);
  height: auto;
  overflow: hidden;
}
.atelier .tile-image img {
  display: block;
  object-fit: cover;
}
.atelier .tile-body {
  padding: 14px 4px 17px;
  gap: 5px;
}
.atelier .tile-body small {
  font-size: 10px;
  letter-spacing: 0.13em;
  line-height: 1.4;
  margin: 0;
}
.atelier .tile-body h3 {
  font-size: clamp(19px, 2cqi, 24px);
  min-height: 0;
  max-width: calc(100% - 26px);
  line-height: 1.2;
  letter-spacing: -0.026em;
}
.atelier .tile-meta {
  font-size: 12px;
  line-height: 1.45;
  margin-top: auto;
  padding-top: 8px;
}
.atelier .tile-open {
  width: 32px;
  height: 32px;
  bottom: 13px;
  border-color: var(--ds-border);
}
.atelier .recipe-tools {
  gap: 10px;
  margin: 20px 0 25px;
}
.atelier .search {
  max-width: 580px;
  border-radius: var(--ds-radius-pill);
  min-height: 48px;
}
.atelier .search input:not([type="checkbox"]) {
  background: transparent;
  border: 0;
  padding: 12px 0;
  font-size: 15px;
  min-height: 44px;
  box-shadow: none;
  outline: 0;
}
.atelier .search:focus-within {
  border-color: var(--ds-brand);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-brand) 12%, transparent);
}
.atelier .day {
  padding: 16px 14px;
  gap: 11px;
  min-height: 176px;
  border-radius: 15px;
}
.atelier .day-head span {
  font-size: 11px;
}
.atelier .day-head b {
  font-size: 25px;
}
.atelier .day-meal {
  font-size: 13px;
  line-height: 1.45;
  padding: 12px;
  border: 1px solid var(--ds-border);
}
.atelier .day-empty {
  font-size: 12px;
}
.atelier .day-add {
  min-height: 44px;
  min-width: 44px;
}
.atelier .week-swipe-hint {
  font-size: 12px;
}
.atelier .shopping-card .toolbar {
  justify-content: flex-end;
}
.atelier .shopping-row {
  min-height: 62px;
  padding: 9px 0;
  gap: 10px;
}
.atelier .shopping-name {
  font-size: 15px;
  line-height: 1.5;
  flex: 1;
  min-width: 0;
}
.atelier .shopping-qty {
  font-size: 13px;
}
.atelier .shopping-row.checked .shopping-name {
  color: var(--ds-muted);
}
.atelier .shopping-form {
  gap: 10px;
  flex-wrap: wrap;
}
.atelier .today-panel h3,
.atelier .manage-card h3 {
  font-size: clamp(25px, 2.4cqi, 31px);
}
.atelier .today-meal {
  min-height: 68px;
  gap: 12px;
}
.atelier .today-meal strong {
  font-size: 14px;
}
.atelier .mini-shopping {
  min-height: 48px;
}
.atelier .mini-shopping button {
  font-size: 14px;
  line-height: 1.5;
  text-align: left;
}
.atelier .manage-card {
  min-height: 198px;
  gap: 16px;
}
.atelier .manage-card p {
  font-size: 14px;
  line-height: 1.6;
}
.atelier .studio-daily {
  padding: var(--ds-panel-padding);
  margin-bottom: clamp(28px, 3cqi, 36px);
  border-radius: var(--ds-radius-lg);
}
.atelier .studio-daily h2 {
  font-size: clamp(25px, 2.7cqi, 34px);
  line-height: 1.18;
}
.atelier .studio-daily p {
  font-size: 14px;
}
.atelier .studio-suggestion {
  gap: 16px;
  padding: 16px 0;
}
.atelier .studio-suggestion-copy small {
  font-size: 12px;
  line-height: 1.4;
}
.atelier .studio-suggestion-copy strong {
  font-size: clamp(20px, 2cqi, 25px);
}
.atelier .studio-suggestion-copy p {
  font-size: 13px;
  line-height: 1.5;
}
.atelier .studio-pantry-row {
  padding: 13px 0;
  gap: 12px;
  min-width: 0;
}
.atelier .studio-pantry-row strong {
  font-size: 14px;
}
.atelier .studio-pantry-row small {
  font-size: 12px;
  line-height: 1.45;
}
.atelier .studio-pantry-row > div:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
.atelier .studio-pantry-row > div:last-child {
  flex: 0 0 auto;
  gap: 5px;
}
.atelier .studio-grocery-line {
  font-size: 14px;
  line-height: 1.45;
}
.atelier .studio-member,
.atelier .studio-task,
.atelier .studio-timer-row {
  min-height: 55px;
}
.atelier .studio-member > span,
.atelier .studio-task > span {
  font-size: 14px;
  line-height: 1.5;
}
.atelier .studio-book-list {
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  padding: 2px 10px;
}
.atelier .studio-book-row {
  font-size: 14px;
  line-height: 1.5;
  min-height: 50px;
  padding: 11px 5px;
}
.atelier .studio-book-row:last-child {
  border-bottom: 0;
}
.atelier .studio-actions {
  gap: 10px;
}
.atelier .studio-actions .btn {
  min-height: 44px;
}
.atelier .studio-diagnostic-row {
  gap: 8px;
  line-height: 1.45;
}
.atelier .studio-diagnostic-row small {
  font-size: 12px;
}
.atelier .modal-backdrop {
  padding: clamp(10px, 2.5cqi, 24px);
}
.atelier .modal {
  border-radius: var(--ds-radius-xl);
  max-width: 100%;
  max-height: min(92dvh, 1040px);
  overscroll-behavior-y: contain;
  scrollbar-width: thin;
}
.atelier .modal-content {
  padding: clamp(24px, 3.1cqi, 45px);
}
.atelier .modal .modal-content > h2 {
  font-size: clamp(32px, 3.3cqi, 51px);
  line-height: 1.1;
}
.atelier .modal .description {
  font-size: 15px;
  line-height: 1.7;
}
.atelier .modal-hero {
  height: clamp(190px, 25cqi, 315px);
}
.atelier .detail-cols {
  gap: clamp(24px, 3.5cqi, 48px);
  margin-top: 30px;
  padding-top: 25px;
}
.atelier .detail-cols h3 {
  font-size: 26px;
}
.atelier .ingredient {
  font-size: 14px;
  line-height: 1.55;
  min-height: 50px;
}
.atelier .step {
  font-size: 15px;
  line-height: 1.65;
  min-height: 64px;
}
.atelier .step-number {
  flex: 0 0 34px;
  display: grid;
  place-items: center;
}
.atelier .editor-card .field span {
  font-size: 12px;
  letter-spacing: 0.02em;
  text-transform: none;
}
.atelier .editor-card h3 {
  font-size: 26px;
}
.atelier .editor-card .editor-sub {
  font-size: 13px;
}
.atelier .editor-step {
  gap: 10px;
}
.atelier .editor-step textarea {
  min-height: 96px;
}
.atelier .step-buttons button {
  min-height: 44px;
  min-width: 44px;
}
.atelier .print-option {
  padding: 14px;
}
.atelier .print-paper {
  transform: rotate(0.2deg);
}
.atelier .settings-group {
  padding-block: 15px;
}
.atelier .settings-group h3 {
  font-size: 22px;
}
.atelier .settings-hint {
  font-size: 13px;
  line-height: 1.65;
}
.atelier .support-group {
  margin-top: var(--ds-space-2);
  padding: var(--ds-space-4);
  border: 1px solid color-mix(in srgb, var(--at-accent) 24%, var(--at-line));
  border-radius: var(--ds-radius-md);
  background: color-mix(in srgb, var(--at-accent) 7%, var(--at-panel));
}
.atelier .support-group h3 {
  margin: 0 0 6px;
  font-size: 16px;
}
.atelier .support-group .settings-hint {
  margin: 0 0 12px;
  color: var(--at-sub);
  font-size: 12px;
}
.atelier .support-link {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  text-decoration: none;
}
.atelier .support-link:focus-visible {
  outline: 2px solid var(--at-accent);
  outline-offset: 3px;
}
.atelier .support-link span {
  font-size: 16px;
  line-height: 1;
}
.atelier .toast {
  font-size: 14px;
  line-height: 1.5;
  padding: 14px 18px;
}
.atelier :is(.notice, .studio-warning, .ds-empty) {
  font-size: 14px;
  line-height: 1.55;
}
.atelier .notice.is-provider-notice {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  column-gap: 10px;
  row-gap: 2px;
  align-items: center;
  padding: 12px 14px;
}
.atelier .notice.is-provider-notice > svg {
  grid-column: 1;
  grid-row: 1 / span 2;
}
.atelier .notice.is-provider-notice > strong {
  grid-column: 2;
  display: block;
  line-height: 1.25;
}
.atelier .notice.is-provider-notice > .provider-copy {
  grid-column: 2;
  font-size: 12px;
  line-height: 1.35;
}
.atelier .ds-empty p {
  font-size: 14px;
}
/* Side navigation switches based on card width, independent of viewport. */
@container atelier-card (max-width: 920px) {
  .atelier {
    --ds-page-gutter: clamp(18px, 2.3cqi, 27px);
  }
  .atelier .shell {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .atelier .sidebar {
    position: sticky;
    top: 0;
    z-index: 40;
    min-height: 0;
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid var(--ds-border);
    padding: 9px 12px;
    background: color-mix(in srgb, var(--at-surface) 94%, transparent);
    backdrop-filter: blur(14px);
  }
  .atelier .identity,
  .atelier .nav-label,
  .atelier .sidebar-footer {
    display: none;
  }
  .atelier .sidebar .nav {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    scroll-snap-type: x proximity;
  }
  .atelier .sidebar .nav {
    -webkit-mask-image: linear-gradient(
      90deg,
      transparent 0,
      #000 32px,
      #000 calc(100% - 32px),
      transparent 100%
    );
    mask-image: linear-gradient(
      90deg,
      transparent 0,
      #000 32px,
      #000 calc(100% - 32px),
      transparent 100%
    );
  }
  .atelier .sidebar .nav::-webkit-scrollbar {
    display: none;
  }
  .atelier .sidebar .nav > button {
    flex: 0 0 auto;
    display: inline-flex;
    gap: 8px;
    align-items: center;
    min-width: max-content;
    min-height: 44px;
    width: auto;
    padding: 10px 13px;
    border-radius: 12px;
    font-size: 12px;
    white-space: nowrap;
    scroll-snap-align: center;
  }
  .atelier .sidebar .nav > button span {
    display: inline;
    max-width: none;
    white-space: nowrap;
    font-size: 12px;
  }
  .atelier .sidebar .nav > button.active {
    box-shadow: inset 0 -2px 0 var(--ds-brand);
  }
  .atelier .main {
    width: 100%;
    padding: var(--ds-page-gutter);
  }
  .atelier .topbar {
    margin-bottom: 22px;
  }
  .atelier .recipe-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atelier .studio-grid-main,
  .atelier .ds-grid--split,
  .atelier .today-board {
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .studio-panel {
    margin-bottom: 0;
  }
}
@container atelier-card (max-width: 640px) {
  .atelier {
    --ds-page-gutter: 18px;
    --ds-grid-gap: 17px;
    --ds-panel-padding: 20px;
  }
  .atelier .topbar {
    margin-bottom: 21px;
    gap: 7px;
  }
  .atelier .breadcrumb {
    font-size: 12px;
  }
  .atelier .topbar .toolbar {
    gap: 6px;
  }
  .atelier .topbar .toolbar .icon-btn,
  .atelier .command-launch {
    min-width: 48px;
    width: 48px;
    height: 48px;
  }
  .atelier .ds-page-header h1,
  .atelier .studio-top h1 {
    font-size: clamp(33px, 8.2cqi, 43px);
    max-width: 100%;
  }
  .atelier .ds-page-header > p {
    font-size: 14px;
  }
  .atelier .eyebrow {
    font-size: 10.5px;
    letter-spacing: 0.12em;
  }
  .atelier .hero {
    height: clamp(260px, 78cqi, 340px);
    min-height: 260px;
    padding: 23px;
  }
  .atelier .hero .hero-copy {
    max-width: 100%;
    align-self: flex-end;
    gap: 9px;
  }
  .atelier .hero h2 {
    font-size: clamp(31px, 8.2cqi, 42px);
    max-width: 10ch;
  }
  .atelier .hero p {
    font-size: 13px;
  }
  .atelier .statline {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .atelier .stat {
    padding: 12px 9px;
    min-height: 81px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 3px;
  }
  .atelier .stat-icon {
    display: none;
  }
  .atelier .stat strong {
    font-size: 25px;
  }
  .atelier .stat span {
    font-size: 11px;
    line-height: 1.35;
    margin-top: 5px;
  }
  .atelier .recipe-grid.is-featured {
    width: 100%;
    margin-inline: 0;
    padding-inline: 0;
    overflow-x: auto;
    scroll-padding-inline: 2px;
  }
  .atelier .recipe-grid.is-featured .recipe-tile {
    flex: 0 0 min(72cqi, 268px);
  }
  .atelier .recipe-grid:not(.is-featured) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .atelier .tile-body h3 {
    font-size: clamp(17px, 4.8cqi, 21px);
  }
  .atelier .tile-body small {
    font-size: 10px;
    letter-spacing: 0.08em;
  }
  .atelier .tile-meta {
    font-size: 11px;
  }
  .atelier .heading h2 {
    font-size: 27px;
  }
  .atelier .heading .toolbar {
    width: 100%;
  }
  .atelier .recipe-tools {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }
  .atelier .recipe-tools .search {
    min-width: 0;
    max-width: none;
  }
  .atelier .studio-top {
    padding: 0 0 8px;
  }
  .atelier .studio-daily-actions,
  .atelier .studio-actions {
    gap: 8px;
  }
  .atelier .studio-daily-actions .btn {
    flex: 1 1 130px;
  }
  .atelier .studio-suggestion {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 12px;
  }
  .atelier .studio-suggestion .btn {
    grid-column: 2;
    justify-self: start;
  }
  .atelier .studio-suggestion-photo {
    width: 72px;
    height: 82px;
  }
  .atelier .studio-suggestion-copy strong {
    font-size: 19px;
  }
  .atelier .studio-pantry-row {
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .atelier .studio-pantry-row > div:last-child {
    margin-left: auto;
  }
  .atelier .studio-formline {
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .studio-book-list {
    max-height: 320px;
  }
  .atelier .form-actions {
    flex-wrap: wrap;
    gap: 9px;
  }
  .atelier .form-actions .btn {
    flex: 1 1 135px;
  }
  .atelier .modal {
    border-radius: 19px;
    max-height: calc(100dvh - 22px);
  }
  .atelier .modal-content {
    padding: 24px 20px;
  }
  .atelier .modal-hero {
    height: 190px;
  }
  .atelier .modal .modal-content > h2 {
    font-size: 34px;
  }
  .atelier .detail-cols {
    grid-template-columns: minmax(0, 1fr);
    gap: 23px;
  }
  .atelier .cook-content {
    padding: 23px 20px 26px;
  }
  .atelier .cook-actions .btn {
    min-height: 49px;
  }
  .atelier .studio-plan-row {
    grid-template-columns: 69px minmax(0, 1fr);
  }
  .atelier .week-grid {
    scroll-padding-inline: 0;
  }
  .atelier .week-grid > .day {
    min-height: 210px;
  }
}
@container atelier-card (max-width: 390px) {
  .atelier {
    --ds-page-gutter: 15px;
    --ds-panel-padding: 17px;
  }
  .atelier .recipe-tools {
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .recipe-tools .btn {
    justify-self: start;
  }
  .atelier .studio-actions > .btn {
    flex: 1 1 100%;
  }
  .atelier .studio-pantry-row > div:last-child {
    width: 100%;
    justify-content: flex-start;
  }
  .atelier .hero h2 {
    font-size: 32px;
  }
  .atelier .statline {
    gap: 6px;
  }
}
@media (hover: none) {
  .atelier :is(.recipe-tile, .btn, .icon-btn):hover {
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .atelier *,
  .atelier *::before,
  .atelier *::after {
    animation-duration: var(--ds-motion-reduced) !important;
    transition-duration: var(--ds-motion-reduced) !important;
    scroll-behavior: auto !important;
  }
}

/* Final editorial and form refinements (also in the light palette). */
.atelier .editor-context {
  font-family: var(--at-serif);
  font-size: clamp(18px, 2.1cqi, 24px);
  font-weight: 400;
  color: var(--ds-brand);
  line-height: 1.25;
  margin: 9px 0 10px;
  text-wrap: balance;
}
.atelier .editor-lead {
  gap: 18px;
  align-items: start;
}
.atelier .editor-lead h2 {
  font-size: clamp(31px, 3.1cqi, 45px);
  max-width: 100%;
}
.atelier .editor-lead p:not(.editor-context) {
  max-width: 60ch;
  line-height: 1.65;
}
.atelier.light .eyebrow,
.atelier.light .tile-body small,
.atelier.light .studio-suggestion-copy small,
.atelier.light .studio-group h3,
.atelier.light .ds-page-header h1 em,
.atelier.light .editor-context {
  color: var(--ds-brand);
}
.atelier.light .nav button.active svg {
  color: var(--ds-brand);
}
.atelier.light .studio-warning {
  color: #653b2f;
}
.atelier .modal .editor-readonly {
  line-height: 1.65;
}
.atelier .studio-formline label:focus-within,
.atelier .field:focus-within {
  color: var(--ds-text);
}
.atelier .studio-pantry-row:focus-within,
.atelier .shopping-row:focus-within,
.atelier .studio-book-row:focus-within {
  background: color-mix(in srgb, var(--ds-brand) 7%, transparent);
  border-radius: var(--ds-radius-sm);
}
@container atelier-card (min-width:740px) and (max-width:920px) {
  .atelier .studio-grid-main.ds-grid--split {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atelier .today-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atelier .recipe-grid:not(.is-featured) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .atelier .recipe-grid.is-featured {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@container atelier-card (max-width:460px) {
  .atelier .editor-stamp {
    display: none;
  }
  .atelier .editor-lead {
    margin-bottom: 22px;
  }
  .atelier .editor-lead h2 {
    font-size: 34px;
  }
  .atelier .modal-content.atelier-editor {
    padding: 23px 19px;
  }
  .atelier .editor-step {
    grid-template-columns: 23px minmax(0, 1fr) 44px;
  }
  .atelier .editor-footer {
    flex-direction: column;
    align-items: stretch;
  }
  .atelier .editor-footer .btn {
    width: 100%;
    flex: 0 0 auto;
  }
  .atelier .nutri-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .nutri-actions > .btn {
    width: 100%;
    min-width: 0;
    white-space: normal;
  }
}

/* iPhone Duo poses are expressed as available-space layouts, not device detection. */
@container atelier-card (min-width:600px) and (max-width:760px) {
  .atelier .modal .detail-cols {
    grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
    gap: 20px;
  }
  .atelier .modal .detail-cols h3 {
    font-size: 22px;
  }
  .atelier .modal .step-photo {
    max-height: 190px;
    object-fit: cover;
  }
}

@media (orientation: portrait) and (max-width: 520px) {
  .atelier .modal .cook-visual {
    height: 154px;
    min-height: 154px;
  }
  .atelier .modal .cook-content {
    padding: 22px 20px 25px;
    gap: 15px;
  }
  .atelier .modal .cook-stage {
    min-height: 0;
    gap: 10px;
  }
  .atelier .modal .cook-step-figure img {
    width: 100%;
    height: clamp(170px, 48vw, 240px);
    max-height: 240px;
    object-fit: cover;
    object-position: center 45%;
  }
}

@media (orientation: landscape) and (max-height: 520px) {
  .atelier .modal-backdrop {
    padding: 8px;
  }
  .atelier .modal {
    max-height: calc(100dvh - 16px);
  }
  .atelier .modal.large:has(> .modal-hero) {
    display: grid;
    grid-template-columns: minmax(170px, 0.76fr) minmax(0, 1.24fr);
    width: min(100%, 900px);
    height: calc(100dvh - 16px);
    overflow: hidden;
  }
  .atelier .modal.large:has(> .modal-hero) > .modal-hero {
    grid-column: 1;
    grid-row: 1;
    height: 100%;
    min-height: 0;
  }
  .atelier .modal.large:has(> .modal-hero) > .modal-content {
    grid-column: 2;
    grid-row: 1;
    max-height: 100%;
    overflow-y: auto;
    padding: 18px 17px 22px;
  }
  .atelier .modal.large:has(> .modal-hero) .modal-content > h2 {
    font-size: clamp(23px, 3.5vw, 31px);
  }
  .atelier .modal.large:has(> .modal-hero) .detail-cols {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    margin-top: 18px;
    padding-top: 16px;
  }
  .atelier .modal.large:has(> .modal-hero) .detail-cols h3 {
    font-size: 20px;
  }
  .atelier .modal.large:has(.cook-layout) {
    width: min(100%, 1050px);
    max-height: calc(100dvh - 16px);
    overflow-y: auto;
    overscroll-behavior-y: contain;
  }
  .atelier .cook-layout {
    grid-template-columns: minmax(190px, 0.82fr) minmax(0, 1.18fr);
    min-height: 0;
  }
  .atelier .cook-visual {
    height: auto;
    min-height: 390px;
  }
  .atelier .cook-content {
    min-height: 0;
    padding: 16px 19px 10px;
    gap: 10px;
  }
  .atelier .cook-stage {
    min-height: 0;
    gap: 9px;
  }
  .atelier .cook-stage h2 {
    font-size: clamp(23px, 3.8vw, 31px);
    line-height: 1.16;
  }
  .atelier .cook-stage .cook-step-detail {
    font-size: 13px;
    line-height: 1.45;
  }
  .atelier .cook-step-figure img {
    max-height: 132px;
    object-fit: cover;
  }
  .atelier .cook-utility {
    padding: 11px;
  }
  .atelier .cook-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 0;
  }
  .atelier .cook-actions .btn {
    min-width: 0;
    min-height: 44px;
    width: 100%;
  }
}

@media (orientation: landscape) and (min-height: 521px) and (max-height: 700px) {
  .atelier .modal-backdrop {
    padding: 12px;
  }
  .atelier .modal {
    max-height: calc(100dvh - 24px);
  }
  .atelier .modal.large:has(> .modal-hero) {
    display: grid;
    grid-template-columns: minmax(260px, 0.82fr) minmax(0, 1.18fr);
    width: min(100%, 1050px);
    height: min(82dvh, 680px);
    overflow: hidden;
  }
  .atelier .modal.large:has(> .modal-hero) > .modal-hero {
    grid-column: 1;
    grid-row: 1;
    height: 100%;
    min-height: 0;
  }
  .atelier .modal.large:has(> .modal-hero) > .modal-content {
    grid-column: 2;
    grid-row: 1;
    max-height: 100%;
    overflow-y: auto;
    padding: 28px 27px 32px;
  }
  .atelier .modal.large:has(> .modal-hero) .detail-cols {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
    margin-top: 24px;
    padding-top: 20px;
  }
  .atelier .modal.large:has(> .modal-hero) .detail-cols h3 {
    font-size: 23px;
  }
  .atelier .modal.large:has(.cook-layout) {
    display: block;
    width: min(100%, 1050px);
    height: auto;
    overflow-y: auto;
  }
  .atelier .cook-layout {
    grid-template-columns: minmax(260px, 0.82fr) minmax(0, 1.18fr);
    min-height: 0;
  }
  .atelier .cook-visual {
    height: auto;
    min-height: 520px;
  }
  .atelier .cook-content {
    padding: 25px 27px 23px;
    gap: 15px;
  }
  .atelier .cook-stage {
    min-height: 0;
    gap: 10px;
  }
  .atelier .cook-stage h2 {
    font-size: clamp(25px, 3.2vw, 34px);
  }
  .atelier .cook-step-figure img {
    max-height: 175px;
    object-fit: cover;
  }
}

/* The counter keeps clear of the floating close button. */
.atelier .modal:has(.cook-layout) .cook-topline {
  padding-inline-end: 56px;
}

@media (orientation: landscape) and (max-height: 700px) {
  .atelier .modal:has(.cook-layout) .cook-controls {
    display: contents;
  }
  .atelier .modal:has(.cook-layout) .cook-actions {
    order: 3;
    position: sticky;
    bottom: 0;
    z-index: 6;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding: 8px 0 max(8px, env(safe-area-inset-bottom));
    margin: 0;
    background: linear-gradient(180deg, transparent, var(--at-surface) 24%);
  }
  .atelier .modal:has(.cook-layout) .cook-actions .btn {
    width: 100%;
    min-width: 0;
    min-height: 44px;
  }
  .atelier .modal:has(.cook-layout) .cook-utility,
  .atelier .modal:has(.cook-layout) .cook-note {
    order: 4;
  }
  .atelier .modal:has(.cook-layout) .cook-footnote {
    order: 5;
  }
}

@media (orientation: portrait) and (max-height: 680px) {
  .atelier .modal:has(.cook-layout) {
    max-height: calc(100dvh - 16px);
  }
  .atelier .modal:has(.cook-layout) .cook-visual {
    min-height: 128px;
    height: 128px;
  }
  .atelier .modal:has(.cook-layout) .cook-content {
    gap: 9px;
    padding: 14px 18px 10px;
  }
  .atelier .modal:has(.cook-layout) .cook-controls {
    display: contents;
  }
  .atelier .modal:has(.cook-layout) .cook-stage {
    gap: 8px;
    padding-top: 8px;
  }
  .atelier .modal:has(.cook-layout) .cook-stage h2 {
    font-size: clamp(23px, 6vw, 28px);
    line-height: 1.15;
  }
  .atelier .modal:has(.cook-layout) .cook-step-photo {
    height: clamp(136px, 30vw, 160px);
    max-height: 160px;
  }
  .atelier .modal:has(.cook-layout) .cook-actions {
    order: 3;
    position: sticky;
    bottom: 0;
    z-index: 6;
    padding: 8px 0 max(10px, env(safe-area-inset-bottom));
    border-top: 1px solid color-mix(in srgb, var(--at-line) 68%, transparent);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--at-surface) 0%, transparent),
      var(--at-surface) 28%
    );
  }
  .atelier .modal:has(.cook-layout) .cook-utility,
  .atelier .modal:has(.cook-layout) .cook-note {
    order: 4;
  }
  .atelier .modal:has(.cook-layout) .cook-footnote {
    order: 5;
  }
}

/* Duo outer-display controls run down the trailing edge; labels stay available to assistive tech. */
@container atelier-card (min-width:431px) and (max-width:520px) {
  .atelier .shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 58px;
  }
  .atelier .sidebar {
    grid-column: 2;
    grid-row: 1;
    width: 58px;
    min-height: 0;
    padding: 12px 5px;
    padding-block-start: max(12px, env(safe-area-inset-top));
    padding-block-end: max(12px, env(safe-area-inset-bottom));
    border: 0;
    border-left: 1px solid var(--at-line);
    position: sticky;
    top: 0;
    align-self: start;
  }
  .atelier .main {
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
    padding: var(--ds-space-4);
  }
  .atelier .identity,
  .atelier .nav-label,
  .atelier .sidebar-footer {
    display: none;
  }
  .atelier .nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ds-space-2);
    max-height: 100dvh;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior-y: contain;
  }
  .atelier .nav button {
    position: relative;
    display: grid;
    place-items: center;
    flex: 0 0 48px;
    width: 48px;
    min-width: 48px;
    min-height: 48px;
    padding: 0;
  }
  .atelier .nav button span {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  .atelier .nav button.active:before {
    left: auto;
    right: 0;
    width: 3px;
    height: 22px;
  }
  .atelier .sidebar .nav {
    flex-flow: column nowrap !important;
    width: 48px;
    max-width: 48px;
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }
  .atelier .sidebar .nav > button {
    flex: 0 0 48px !important;
    display: grid !important;
    width: 48px !important;
    min-width: 48px !important;
    max-width: 48px;
    min-height: 48px !important;
    height: 48px;
    padding: 0 !important;
  }
  .atelier .sidebar .nav > button span {
    position: absolute !important;
    display: block !important;
    width: 1px !important;
    height: 1px !important;
    min-width: 0 !important;
    max-width: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip-path: inset(50%);
    white-space: nowrap !important;
  }
  .atelier .sidebar .nav > button:focus-visible {
    outline-offset: -3px;
  }
}

@media (orientation: landscape) {
  @container atelier-card (min-width:521px) and (max-width:760px) {
    .atelier .shell {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 58px;
    }
    .atelier .sidebar {
      grid-column: 2;
      grid-row: 1;
      width: 58px;
      min-height: 0;
      padding: 12px 5px;
      padding-block-start: max(12px, env(safe-area-inset-top));
      padding-block-end: max(12px, env(safe-area-inset-bottom));
      border: 0;
      border-left: 1px solid var(--at-line);
      position: sticky;
      top: 0;
      align-self: start;
    }
    .atelier .main {
      grid-column: 1;
      grid-row: 1;
      min-width: 0;
      padding: var(--ds-space-4);
    }
    .atelier .identity,
    .atelier .nav-label,
    .atelier .sidebar-footer {
      display: none;
    }
    .atelier .nav {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ds-space-2);
      max-height: 100dvh;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior-y: contain;
    }
    .atelier .nav button {
      position: relative;
      display: grid;
      place-items: center;
      flex: 0 0 48px;
      width: 48px;
      min-width: 48px;
      min-height: 48px;
      padding: 0;
    }
    .atelier .nav button span {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }
    .atelier .nav button.active:before {
      left: auto;
      right: 0;
      width: 3px;
      height: 22px;
    }
    .atelier .sidebar .nav {
      flex-flow: column nowrap !important;
      width: 48px;
      max-width: 48px;
      overflow-x: hidden !important;
      overflow-y: auto !important;
    }
    .atelier .sidebar .nav > button {
      flex: 0 0 48px !important;
      display: grid !important;
      width: 48px !important;
      min-width: 48px !important;
      max-width: 48px;
      min-height: 48px !important;
      height: 48px;
      padding: 0 !important;
    }
    .atelier .sidebar .nav > button span {
      position: absolute !important;
      display: block !important;
      width: 1px !important;
      height: 1px !important;
      min-width: 0 !important;
      max-width: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip-path: inset(50%);
      white-space: nowrap !important;
    }
    .atelier .sidebar .nav > button:focus-visible {
      outline-offset: -3px;
    }
  }
}

/* Icon-only actions retain a proper touch and keyboard target. */
.atelier .btn.icon-only {
  min-width: 48px;
  width: 48px;
  height: 48px;
  min-height: 48px;
  padding: 0;
  display: inline-grid;
  place-items: center;
  flex: 0 0 48px;
}
.atelier .btn.icon-only svg {
  flex: none;
}

/* Kochinspo uses shared design tokens for every step, choice, and recipe card. */
.atelier .studio-discover-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--ds-grid-gap);
  align-items: start;
}
.atelier .studio-discover-layout.has-results {
  grid-template-columns: minmax(0, 1fr);
}
.atelier .studio-discover-layout > .studio-panel {
  min-width: 0;
  padding: clamp(var(--ds-space-5), 3cqi, var(--ds-space-8));
}
.atelier .studio-discover-top,
.atelier .studio-discover-result-head,
.atelier .studio-discover-alt-heading,
.atelier .studio-discover-counter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ds-space-3);
}
.atelier .studio-discover-stepcount {
  color: var(--ds-muted);
  font: 650 var(--ds-font-xs) / 1 var(--ds-font-ui);
  letter-spacing: 0.08em;
}
.atelier .studio-discover-stepcount i {
  color: var(--ds-brand);
  font-style: normal;
  padding-inline: var(--ds-space-1);
}
.atelier .studio-discover-progress {
  height: 3px;
  margin-block: var(--ds-space-4) var(--ds-space-7);
  overflow: hidden;
  border-radius: var(--ds-radius-pill);
  background: color-mix(in srgb, var(--ds-brand) 15%, var(--ds-surface-raised));
}
.atelier .studio-discover-progress span {
  display: block;
  width: var(--discover-progress);
  height: 100%;
  border-radius: inherit;
  background: var(--ds-brand);
  transition: width var(--ds-motion-enter) var(--ds-motion-spring);
}
.atelier .studio-discover-prompt {
  margin-block-end: var(--ds-space-5);
}
.atelier .studio-discover-prompt h2,
.atelier .studio-discover-result-head h2 {
  margin: 0;
  font: 500 clamp(26px, 3cqi, 36px) / 1.12 var(--ds-font-display);
  letter-spacing: -0.025em;
}
.atelier .studio-discover-prompt p {
  margin: var(--ds-space-2) 0 0;
  color: var(--ds-muted);
  font-size: var(--ds-font-sm);
  line-height: var(--ds-line-body);
}
/* Kochinspo choices are a typographic register: muted words, the chosen ones in full ink with an
   accent rule. No filled chips. */
.atelier .studio-choice-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-1) var(--ds-space-6);
}
.atelier .studio-choice {
  min-height: 44px;
  padding: 0 1px;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: none;
  color: var(--ds-muted);
  font: 500 clamp(18px, 2.2cqi, 22px) / 1.2 var(--ds-font-display);
  letter-spacing: -0.01em;
  text-align: start;
  cursor: pointer;
  transition:
    color var(--ds-motion-fast),
    border-color var(--ds-motion-fast);
}
.atelier .studio-choice:hover {
  color: var(--ds-text);
}
.atelier .studio-choice:focus-visible {
  outline: 2px solid var(--ds-ring);
  outline-offset: 3px;
}
.atelier .studio-choice.is-selected {
  border-bottom-color: var(--ds-brand);
  color: var(--ds-text);
}
.atelier .studio-choice-grid--compact {
  gap: var(--ds-space-1) var(--ds-space-5);
}
.atelier .studio-choice-grid--compact .studio-choice {
  font: 650 var(--ds-font-sm) / 1.2 var(--ds-font-ui);
  letter-spacing: 0;
}
.atelier .studio-cookbook-choices .studio-choice {
  min-width: 0;
  white-space: normal;
}
.atelier .studio-discover-note {
  margin-block: var(--ds-space-5) 0;
}
.atelier .studio-discover-household {
  display: grid;
  gap: var(--ds-space-4);
}
.atelier .studio-discover-counter {
  padding-block: var(--ds-space-4);
  border-bottom: 1px solid var(--ds-border);
}
.atelier .studio-discover-label,
.atelier .studio-discover-label-block > span {
  display: block;
  color: var(--ds-text);
  font-weight: 700;
  font-size: var(--ds-font-sm);
}
.atelier .studio-discover-counter small,
.atelier .studio-discover-label-block small {
  display: block;
  margin-block-start: var(--ds-space-1);
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
}
.atelier .studio-counter {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
}
.atelier .studio-counter button {
  width: 44px;
  height: 44px;
  border: 1px solid var(--ds-border);
  border-radius: 50%;
  color: var(--ds-text);
  background: var(--ds-surface);
  font-size: 22px;
  cursor: pointer;
}
.atelier .studio-counter output {
  min-width: 2ch;
  text-align: center;
  font: 600 22px/1 var(--ds-font-display);
  font-variant-numeric: tabular-nums;
}
.atelier .studio-time-choices {
  margin-block-start: var(--ds-space-5);
}
.atelier .studio-discover-preferences {
  display: grid;
  gap: var(--ds-space-5);
}
.atelier .studio-discover-label-block {
  margin-block-start: var(--ds-space-3);
}
.atelier .studio-discover-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ds-space-2);
  margin-block-start: var(--ds-space-7);
}
.atelier .studio-discover-actions > .btn {
  min-height: var(--ds-touch-height);
}
.atelier .studio-discover-actions > .btn.primary {
  min-width: 155px;
}
.atelier .studio-discover-result-head {
  margin-block-end: var(--ds-space-5);
}
.atelier .studio-discover-result-head .btn {
  flex: 0 0 auto;
}
.atelier .studio-discover-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(260px, 0.95fr);
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-xl);
  background: var(--ds-surface);
  box-shadow: var(--ds-shadow-card, 0 14px 40px #00000012);
  animation: studio-discover-reveal var(--ds-motion-enter) var(--ds-motion-ease) both;
}
.atelier .studio-discover-hero-photo {
  position: relative;
  min-height: 300px;
  overflow: hidden;
  background: var(--ds-surface-raised);
}
.atelier .studio-discover-hero-photo > img,
.atelier .studio-discover-hero-photo > picture,
.atelier .studio-discover-hero-photo .placeholder {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 300px;
  object-fit: cover;
}
.atelier .studio-discover-photo-label {
  position: absolute;
  inset: auto auto var(--ds-space-4) var(--ds-space-4);
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2) var(--ds-space-3);
  border: 1px solid #ffffff4d;
  border-radius: var(--ds-radius-pill);
  color: white;
  background: #14201dcc;
  backdrop-filter: blur(12px);
  font-size: var(--ds-font-xs);
  font-weight: 700;
}
.atelier .studio-discover-photo-label i {
  opacity: 0.65;
  font-style: normal;
}
.atelier .studio-discover-hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
  padding: clamp(var(--ds-space-5), 4cqi, var(--ds-space-8));
}
.atelier .studio-discover-match {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  color: var(--ds-brand);
  font: 750 10px/1.3 var(--ds-font-ui);
  letter-spacing: 0.12em;
}
.atelier .studio-discover-hero-copy h3 {
  margin: var(--ds-space-4) 0;
  font: 500 clamp(27px, 3cqi, 40px) / 1.08 var(--ds-font-display);
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}
.atelier .studio-discover-book-match {
  margin: -var(--ds-space-2) 0 var(--ds-space-3);
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
}
.atelier .studio-discover-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2) var(--ds-space-4);
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
}
.atelier .studio-discover-meta span {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
}
.atelier .studio-discover-meta svg {
  color: var(--ds-brand);
}
.atelier .studio-discover-hero-copy > p {
  margin-block: var(--ds-space-4);
  color: var(--ds-muted);
  font-size: var(--ds-font-sm);
  line-height: 1.6;
}
.atelier .studio-discover-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
  margin-block-start: var(--ds-space-2);
}
.atelier .studio-discover-hero-actions .btn {
  min-height: var(--ds-touch-height);
}
.atelier .studio-discover-alternatives {
  margin-block-start: var(--ds-space-7);
}
.atelier .studio-discover-alt-heading {
  margin-block-end: var(--ds-space-3);
}
.atelier .studio-discover-alt-heading small {
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
}
.atelier .studio-discover-alt-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--ds-space-3);
}
.atelier .studio-discover-alt {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) 16px;
  align-items: center;
  gap: var(--ds-space-3);
  min-width: 0;
  min-height: 80px;
  padding: var(--ds-space-2);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-surface);
  color: var(--ds-text);
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--ds-motion-fast),
    transform var(--ds-motion-fast),
    background var(--ds-motion-fast);
}
.atelier .studio-discover-alt:hover {
  border-color: var(--ds-brand);
  background: var(--ds-surface-raised);
  transform: translateY(-2px);
}
.atelier .studio-discover-alt:focus-visible {
  outline: 2px solid var(--ds-ring);
  outline-offset: 3px;
}
.atelier .studio-discover-alt-photo {
  width: 68px;
  height: 64px;
  overflow: hidden;
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-raised);
}
.atelier .studio-discover-alt-photo img,
.atelier .studio-discover-alt-photo .placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.atelier .studio-discover-alt-copy {
  display: grid;
  gap: var(--ds-space-1);
  min-width: 0;
}
.atelier .studio-discover-alt-copy strong {
  font: 500 16px/1.2 var(--ds-font-display);
  overflow-wrap: anywhere;
}
.atelier .studio-discover-alt-copy small {
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
}
.atelier .studio-discover-empty {
  display: grid;
  justify-items: start;
  gap: var(--ds-space-3);
  padding: var(--ds-space-7);
  border: 1px dashed var(--ds-border);
  border-radius: var(--ds-radius-lg);
}
.atelier .studio-discover-empty > span {
  color: var(--ds-brand);
  font-size: 26px;
}
.atelier .studio-discover-empty h3,
.atelier .studio-discover-empty p {
  margin: 0;
}
.atelier .studio-serving-note {
  margin-block: var(--ds-space-2) var(--ds-space-3);
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
  line-height: 1.5;
}
@keyframes studio-discover-reveal {
  from {
    opacity: 0;
    transform: translateY(var(--ds-space-2));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@container atelier-card (max-width: 860px) {
  .atelier .studio-discover-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .studio-discover-hero {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  }
  .atelier .studio-discover-hero-photo,
  .atelier .studio-discover-hero-photo > img,
  .atelier .studio-discover-hero-photo > picture,
  .atelier .studio-discover-hero-photo .placeholder {
    min-height: 250px;
  }
  .atelier .studio-discover-alt-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@container atelier-card (max-width: 560px) {
  .atelier .studio-discover-layout > .studio-panel {
    padding: var(--ds-space-4);
  }
  .atelier .studio-discover-hero {
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .studio-discover-hero-photo,
  .atelier .studio-discover-hero-photo > img,
  .atelier .studio-discover-hero-photo > picture,
  .atelier .studio-discover-hero-photo .placeholder {
    min-height: 220px;
    max-height: 290px;
  }
  .atelier .studio-discover-hero-copy {
    padding: var(--ds-space-5);
  }
  .atelier .studio-discover-result-head {
    align-items: flex-start;
    flex-direction: column;
  }
  .atelier .studio-discover-result-head h2 {
    max-width: 100%;
    font-size: 25px;
  }
  .atelier .studio-discover-result-head .btn {
    align-self: flex-start;
    white-space: nowrap;
    padding-inline: var(--ds-space-3);
  }
  .atelier .studio-discover-alt-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .studio-discover-alt {
    grid-template-columns: 64px minmax(0, 1fr) 16px;
  }
  .atelier .studio-discover-alt-photo {
    width: 64px;
    height: 58px;
  }
  .atelier .studio-discover-actions {
    justify-content: stretch;
  }
  .atelier .studio-discover-actions > .btn {
    flex: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .atelier .studio-discover-hero {
    animation: none;
  }
}
.atelier .toast.toast-error {
  background: #3a1d17;
  color: #ffd9cd;
  border: 1px solid #e7a79466;
}
.atelier .cook-wake {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--at-muted, inherit);
  cursor: pointer;
}

/* Recipe photos wherever a planned or listed recipe has one; without a photo the plain layout stays. */
.atelier .day-meal.has-photo {
  padding: 10px;
}
.atelier .day-meal-photo {
  display: block;
  aspect-ratio: 4 / 3;
  margin: -4px -4px 9px;
  border-radius: 7px;
  overflow: hidden;
  background: var(--at-panel);
}
.atelier .day-meal-photo img,
.atelier .meal-photo img,
.atelier .studio-book-photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.atelier .today-meal .meal-photo {
  width: 96px;
  aspect-ratio: 4 / 3;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--at-panel2);
}
.atelier .studio-book-row .studio-book-photo {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 9px;
}
.atelier button.stat {
  appearance: none;
  font: inherit;
  color: inherit;
  text-align: left;
  width: 100%;
  cursor: pointer;
  transition:
    background var(--at-fast),
    border-color var(--at-fast);
}
.atelier button.stat:hover {
  background: color-mix(in srgb, var(--at-accent) 8%, var(--ds-surface, var(--at-panel)));
}
.atelier button.stat:focus-visible {
  outline: 3px solid var(--at-accent);
  outline-offset: -3px;
}
.atelier .day-meal {
  min-width: 0;
  overflow: hidden;
}
.atelier .day-meal-name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  overflow-wrap: anywhere;
  hyphens: auto;
}

/* Atelier Control Refinement 0.9.5: single geometric contract.
   Loaded last, scoped to Atelier, preserving colors, surfaces and typography. */
:host {
  --ds-control-height: 48px;
  --ds-button-padding-x: var(--ds-control-padding-x);
  --ds-button-padding-y: var(--ds-control-padding-y);
  --ds-action-row-gap: var(--ds-action-gap);
}
.atelier :is(.btn, .icon-btn, .command-launch) {
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
}
.atelier .btn:not(.icon-only) {
  display: inline-flex;
  min-height: var(--ds-control-height);
  padding: var(--ds-button-padding-y) var(--ds-button-padding-x);
  gap: var(--ds-control-gap);
  line-height: 1.35;
  text-align: center;
  white-space: normal;
  min-width: 0;
}
.atelier .btn:is(.tiny, .plain) {
  min-height: 44px;
}
.atelier .btn.icon-only,
.atelier .icon-btn {
  box-sizing: border-box;
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  flex: 0 0 48px;
  padding: 0;
  display: inline-grid;
  place-items: center;
  line-height: 1;
}
.atelier :is(.btn, .icon-btn, .command-launch) > svg {
  width: var(--ds-control-icon);
  height: var(--ds-control-icon);
  flex: 0 0 var(--ds-control-icon);
  display: block;
  margin: 0;
  align-self: center;
}
.atelier :is(.btn, .icon-btn, .command-launch):focus-visible {
  outline: 2px solid var(--ds-brand);
  outline-offset: 3px;
}
/* Normalize toolbars without shrinking primary calls to action. */
.atelier :is(.toolbar, .form-actions, .studio-actions, .studio-daily-actions, .cook-actions) {
  align-items: center;
  column-gap: var(--ds-action-row-gap);
  row-gap: var(--ds-space-2);
  min-width: 0;
}
.atelier :is(.toolbar, .form-actions, .studio-actions, .studio-daily-actions, .cook-actions) > * {
  max-width: 100%;
}
/* Daily shortcuts keep their labels on one line and wrap as whole buttons instead. */
.atelier .studio-daily-actions > .btn {
  flex: 1 1 auto;
  white-space: nowrap;
}
/* Native form controls and select arrows share geometry across all views. */
.atelier :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea) {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  min-height: var(--ds-control-height);
  padding: var(--ds-field-padding-y) var(--ds-field-padding-x);
  line-height: 1.45;
  font-size: 16px;
}
.atelier :is(select:not([multiple]):not([size])) {
  appearance: none;
  -webkit-appearance: none;
  padding-inline-end: var(--ds-select-clearance);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='m5 7 5 5 5-5' stroke='%2399afa3' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-size: var(--ds-select-arrow-size) var(--ds-select-arrow-size);
  background-position: right var(--ds-select-arrow-inset) center;
  cursor: pointer;
}
.atelier.light :is(select:not([multiple]):not([size])) {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='m5 7 5 5 5-5' stroke='%234c6256' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
.atelier select:disabled {
  cursor: not-allowed;
}
.atelier :is(.field, .ds-field, .studio-form > label, .studio-formline > label) {
  min-width: 0;
  row-gap: var(--ds-space-2);
  line-height: 1.4;
}
.atelier :is(.field, .ds-field) > :is(input, select, textarea),
.atelier :is(.studio-form > label, .studio-formline > label) > :is(input, select, textarea) {
  max-width: 100%;
}
.atelier textarea {
  min-height: 112px;
  resize: vertical;
}
/* Keep true checkboxes/radios away from text-field sizing and select appearance. */
.atelier input:is([type="checkbox"], [type="radio"]) {
  width: var(--ds-check-size);
  min-width: var(--ds-check-size);
  min-height: var(--ds-check-size);
  padding: 0;
}
@container atelier-card (max-width: 420px) {
  .atelier :is(.form-actions, .studio-actions, .cook-actions) {
    column-gap: var(--ds-space-2);
  }
  .atelier .btn:not(.icon-only) {
    padding-inline: 14px;
  }
  .atelier .btn.icon-only,
  .atelier .icon-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    flex-basis: 44px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .atelier :is(.btn, .icon-btn, select) {
    transition-duration: var(--ds-motion-reduced);
  }
}
/* Consistent vertical rhythm and icon alignment for grouped actions. */
.atelier
  :is(.toolbar, .form-actions, .studio-actions, .studio-daily-actions, .cook-actions)
  > :is(.btn, .icon-btn) {
  margin-block: 0;
  align-self: center;
}
.atelier :is(.btn, .icon-btn) :is(svg, img) {
  position: relative;
  inset: auto;
  vertical-align: middle;
}
.atelier :is(.field, .ds-field) > :is(label, .field-label) {
  display: block;
  margin: 0;
  line-height: 1.4;
}
.atelier select:focus-visible,
.atelier :is(input, textarea):focus-visible {
  outline: 2px solid var(--ds-brand);
  outline-offset: 2px;
}
.atelier :is(input, select, textarea):disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
@container atelier-card (max-width: 420px) {
  .atelier :is(.toolbar, .form-actions, .studio-actions, .studio-daily-actions, .cook-actions) {
    row-gap: 10px;
  }
}

/* Structured recipe editor (feature B): ingredient rows, comboboxes, history and photo uploads.
   Time values come from the motion tokens; touch targets are at least 44px. */
.atelier .ed-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
  margin-top: var(--ds-space-3);
}
.atelier .ed-card .btn,
.atelier .ed-step-photos .btn,
.atelier .ed-confirm .btn {
  min-height: 44px;
  min-width: 44px;
}
.atelier .ed-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--ds-space-3);
  margin-bottom: var(--ds-space-4);
}
.atelier .ed-servings {
  display: grid;
  gap: var(--ds-space-1);
  font-size: var(--ds-font-sm);
  font-weight: 650;
}
.atelier .ed-servings input {
  width: 120px;
}
.atelier .ed-rows {
  display: grid;
  gap: var(--ds-space-3);
}
.atelier .ed-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: var(--ds-space-2) var(--ds-space-3);
  align-items: start;
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-raised);
}
.atelier .ed-num {
  display: grid;
  place-items: center;
  min-height: var(--ds-control-height);
  color: var(--ds-muted);
  font-weight: 700;
  font-size: var(--ds-font-sm);
}
.atelier .ed-fields {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1.2fr);
  gap: var(--ds-space-2);
  min-width: 0;
}
.atelier .ed-cell {
  position: relative;
  display: grid;
  gap: var(--ds-space-1);
  min-width: 0;
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
  font-weight: 650;
}
.atelier .ed-original,
.atelier .ed-scaled,
.atelier .ed-error {
  grid-column: 2 / -1;
  margin: 0;
  font-size: var(--ds-font-xs);
  line-height: 1.5;
}
.atelier .ed-original,
.atelier .ed-scaled span {
  color: var(--ds-muted);
}
.atelier .ed-error {
  color: #f6b6a4;
  font-weight: 650;
}
.atelier .ed-error[hidden],
.atelier .ed-scaled[hidden] {
  display: none;
}
.atelier .ed-row-actions {
  display: flex;
  gap: var(--ds-space-1);
}
.atelier .ed-icon {
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  font-size: var(--ds-font-lg);
}
.atelier .ed-list {
  position: absolute;
  z-index: 5;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 240px;
  margin: var(--ds-space-1) 0 0;
  padding: var(--ds-space-1);
  overflow: auto;
  list-style: none;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface);
  box-shadow: var(--ds-shadow-panel);
}
.atelier .ed-list[hidden] {
  display: none;
}
.atelier .ed-option {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 var(--ds-space-3);
  border-radius: var(--ds-radius-sm);
  color: var(--ds-text);
  font-size: var(--ds-font-md);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--ds-motion-fast) var(--ds-motion-ease);
}
.atelier .ed-option:hover,
.atelier .ed-option.is-active {
  background: var(--ds-surface-raised);
  box-shadow: inset 3px 0 0 var(--ds-brand);
}
.atelier .ed-option:focus-visible {
  outline: 2px solid var(--ds-brand);
  outline-offset: -2px;
}
.atelier .ed-option-note {
  padding: var(--ds-space-3);
  color: var(--ds-muted);
  font-size: var(--ds-font-sm);
}
.atelier .ed-confirm {
  margin-top: var(--ds-space-3);
  padding: var(--ds-space-3) var(--ds-space-4);
  border: 1px solid var(--ds-brand);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-raised);
}
.atelier .ed-confirm p {
  margin: 0;
}
.atelier .ed-live {
  min-height: 1.4em;
  margin: var(--ds-space-2) 0 0;
  color: var(--ds-muted);
  font-size: var(--ds-font-sm);
}
.atelier .ed-cover-frame {
  width: min(100%, 360px);
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-raised);
}
.atelier .ed-cover {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.atelier .ed-thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--ds-space-3);
  margin-top: var(--ds-space-2);
}
.atelier .ed-thumb {
  display: grid;
  gap: var(--ds-space-2);
  margin: 0;
}
.atelier .ed-thumb img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--ds-radius-sm);
}
.atelier .editor-step .ed-step-photos {
  grid-column: 2 / -1;
}
.atelier .ed-progress {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  margin-top: var(--ds-space-3);
}
.atelier .ed-progress-track {
  flex: 1;
  height: 10px;
  overflow: hidden;
  border-radius: var(--ds-radius-pill);
  background: var(--ds-surface-raised);
}
.atelier .ed-progress-bar {
  display: block;
  width: var(--ed-progress, 0%);
  height: 100%;
  background: var(--ds-brand);
  transition: width var(--ds-motion-base) var(--ds-motion-ease);
}
.atelier .ed-progress-text {
  min-width: 3.5ch;
  font-size: var(--ds-font-sm);
  font-variant-numeric: tabular-nums;
}
.atelier .ed-history {
  display: grid;
  gap: var(--ds-space-2);
  margin: var(--ds-space-3) 0 0;
  padding: 0;
  list-style: none;
}
.atelier .ed-history-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2) var(--ds-space-3);
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
}
.atelier .ed-history-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
  font-size: var(--ds-font-sm);
}
.atelier .ed-history-copy span,
.atelier .ed-history-copy small {
  color: var(--ds-muted);
}
.atelier .ed-history-item .ed-confirm {
  flex-basis: 100%;
}
@container atelier-card (max-width: 760px) {
  .atelier .ed-row {
    grid-template-columns: 24px minmax(0, 1fr);
  }
  .atelier .ed-fields {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .atelier .ed-row-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
@container atelier-card (max-width: 460px) {
  .atelier .ed-fields {
    grid-template-columns: minmax(0, 1fr);
  }
  .atelier .ed-actions > .btn {
    flex: 1 1 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .atelier .ed-progress-bar,
  .atelier .ed-option {
    transition-duration: var(--ds-motion-reduced);
  }
}

/* Smart Shopping Sync: status panel, setup wizard and review list. No motion of its own. */
.atelier .sync-open {
  gap: var(--ds-space-2);
}
.atelier .sync-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  margin-inline-start: var(--ds-space-2);
  padding: 2px var(--ds-space-2);
  border: 1px solid currentColor;
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-font-xs);
  font-weight: 700;
}
.atelier .sync-panel .editor-card > h3 {
  margin: 0 0 var(--ds-space-2);
}
.atelier .sync-panel p {
  margin: var(--ds-space-1) 0;
}
.atelier .sync-state,
.atelier .sync-last,
.atelier .sync-issues,
.atelier .sync-result,
.atelier .sync-capability,
.atelier .sync-explain {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}
.atelier .sync-state {
  flex-wrap: wrap;
}
.atelier .sync-count {
  white-space: nowrap;
}
.atelier .sync-muted {
  color: var(--ds-muted);
}
.atelier .sync-live:empty {
  display: none;
}
.atelier .sync-actions {
  flex-wrap: wrap;
}
.atelier .sync-actions button[aria-disabled="true"],
.atelier .sync-record-actions button[aria-disabled="true"] {
  opacity: 0.6;
  cursor: not-allowed;
}
.atelier .sync-list {
  display: grid;
  gap: var(--ds-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.atelier .sync-record {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2);
}
.atelier .sync-record-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
}
.atelier .sync-record-state {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  font-size: var(--ds-font-sm);
}
.atelier .sync-fieldset {
  display: grid;
  gap: var(--ds-space-3);
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.atelier .sync-fieldset > legend {
  padding: 0;
  margin-block-end: var(--ds-space-2);
  font-weight: 650;
}
.atelier .sync-radio-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: var(--ds-space-3);
  min-block-size: 44px;
  padding: var(--ds-space-3) var(--ds-space-4);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-raised);
  cursor: pointer;
}
.atelier .sync-radio-card:has(input:checked) {
  border-color: var(--ds-ring);
  border-width: 2px;
}
.atelier .sync-radio-card:has(input:focus-visible) {
  outline: 2px solid var(--ds-ring);
  outline-offset: 2px;
}
.atelier .sync-radio-card input {
  inline-size: 24px;
  block-size: 24px;
  margin: 0;
}
.atelier .sync-radio-card small {
  display: block;
  color: var(--ds-muted);
  font-weight: 400;
}
.atelier .sync-field-error {
  font-weight: 650;
}

/* Searchable recipe picker (combobox) used by the meal plan dialog. */
.atelier .picker-vh {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.atelier .picker {
  display: grid;
  gap: var(--ds-space-3);
}
.atelier .picker-filters {
  display: grid;
  gap: var(--ds-space-2);
}
.atelier .picker-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
  align-items: flex-start;
}
.atelier .picker-filter {
  display: grid;
  gap: var(--ds-space-2);
  min-width: 0;
}
.atelier .picker-disclosure {
  min-height: 44px;
  justify-content: space-between;
  gap: var(--ds-space-2);
}
.atelier .picker-options {
  display: grid;
  gap: var(--ds-space-1);
  max-height: 180px;
  overflow: auto;
  padding: var(--ds-space-2);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface);
}
.atelier .picker-options[hidden],
.atelier .picker-panel[hidden] {
  display: none;
}
.atelier .picker-options label {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  min-height: 44px;
}
.atelier .picker-hint {
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
  line-height: 1.5;
}
.atelier .picker-panel {
  min-height: 156px;
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface);
}
.atelier .picker-list {
  display: grid;
  margin: 0;
  padding: var(--ds-space-1);
  list-style: none;
}
.atelier .picker-option {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--ds-space-3);
  min-height: 52px;
  padding: var(--ds-space-1) var(--ds-space-2);
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
}
.atelier .picker-option:hover {
  background: color-mix(in srgb, var(--ds-brand) 8%, transparent);
}
.atelier .picker-option[data-active] {
  background: color-mix(in srgb, var(--ds-brand) 14%, transparent);
  outline: 2px solid var(--ds-ring);
  outline-offset: -2px;
}
.atelier .picker-option[data-chosen] .picker-name {
  font-weight: 750;
}
.atelier .picker-thumb {
  width: 44px;
  height: 44px;
  overflow: hidden;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-photo-fallback);
}
.atelier .picker-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.atelier .picker-name {
  min-width: 0;
  overflow-wrap: anywhere;
}
.atelier .picker-time {
  color: var(--ds-muted);
  font-size: var(--ds-font-xs);
  white-space: nowrap;
}
.atelier .picker-skeleton {
  min-height: 52px;
  margin: var(--ds-space-1) var(--ds-space-2);
  border-radius: var(--ds-radius-sm);
  background: color-mix(in srgb, var(--ds-muted) 16%, transparent);
  animation: picker-pulse var(--ds-motion-loading) ease-in-out infinite alternate;
}
.atelier .picker-sentinel {
  height: 1px;
}
.atelier .picker-state {
  display: grid;
  justify-items: start;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2) var(--ds-space-3);
}
.atelier .picker-state:empty {
  display: none;
}
.atelier .picker-note {
  margin: 0;
  color: var(--ds-muted);
  font-size: var(--ds-font-sm);
}
.atelier .picker-note.is-error {
  color: var(--ds-text);
}
@keyframes picker-pulse {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .atelier .picker-skeleton {
    animation: none;
  }
}

/* Corner style: every main surface derives its radius from --at-radius (6px square, 12px small,
   23px large). The ratios keep the default look (23px) identical to the previous fixed values. */
.atelier {
  --at-r-hero: calc(var(--at-radius) * 26 / 23);
  --at-r-panel: calc(var(--at-radius) * 20 / 23);
  --at-r-tile: calc(var(--at-radius) * 18 / 23);
  --at-r-stat: calc(var(--at-radius) * 17 / 23);
  --at-r-day: calc(var(--at-radius) * 15 / 23);
  --at-r-field: calc(var(--at-radius) * 13 / 23);
  --at-r-inner: calc(var(--at-radius) * 14 / 23);
  --at-r-item: calc(var(--at-radius) * 9 / 23);
  --ds-radius-sm: calc(var(--at-radius) * 10 / 23);
  --ds-radius-md: calc(var(--at-radius) * 14 / 23);
  --ds-radius-lg: calc(var(--at-radius) * 20 / 23);
  --ds-radius-xl: calc(var(--at-radius) * 26 / 23);
  --ds-control-radius: calc(var(--at-radius) * 12 / 23);
}
.atelier .hero {
  border-radius: var(--at-r-hero);
}
.atelier .shopping-card,
.atelier .today-panel,
.atelier .manage-card,
.atelier .studio-panel {
  border-radius: var(--at-r-panel);
}
.atelier .modal {
  border-radius: var(--at-radius);
}
.atelier .recipe-tile {
  border-radius: var(--at-r-tile);
}
.atelier.provider-home-assistant .recipe-tile {
  border-radius: var(--at-r-stat);
}
.atelier .recipe-tile .tile-image {
  border-radius: var(--at-r-inner);
}
.atelier .stat {
  border-radius: var(--at-r-stat);
}
.atelier .day {
  border-radius: var(--at-r-day);
}
.atelier .day-meal {
  border-radius: var(--at-r-item);
}
.atelier input:not([type="checkbox"]):not([type="radio"]),
.atelier textarea,
.atelier select {
  border-radius: var(--at-r-field);
}
@container atelier-card (max-width: 760px) {
  .atelier .modal {
    border-radius: var(--at-r-panel);
  }
}
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
// Build a standalone print document and escape every Mealie field before rendering it.
function buildPrintDocument(
  kind,
  { recipe, shopping, mealplan, activeList, weekStart, locale, settings, translate },
) {
  const t = (key, values) => (typeof translate === "function" ? translate(key, values) : key);
  const words = {
    recipe: t("printDocRecipe"),
    shopping: t("printDocShoppingList"),
    week: t("printDocWeeklyPlan"),
    ingredients: t("ingredients"),
    method: t("instructions"),
    servings: t("servings"),
    time: t("printDocTotalTime"),
    notes: t("journalNote"),
    items: t("items"),
    checked: t("done"),
    print: t("printSavePdf"),
    close: t("printDocCloseWindow"),
    created: t("printDocFromYourKitchen"),
    empty: t("printDocNoItems"),
    made: t("printMadeWithLove"),
    page: t("printDocYourWeeklyPlan"),
    dishes: t("printDocMeals"),
    noPlan: t("noPlan"),
    shop: t("shopping"),
    listed: t("printDocListed"),
    nutrition: t("nutrition"),
    nutritionCaution: t("printDocNutritionCaution"),
  };
  const style = ["editorial", "compact", "minimal"].includes(settings?.print_style)
    ? settings.print_style
    : "editorial";
  const notes = settings?.print_notes !== false;
  const checkboxes = settings?.print_checkboxes !== false;
  const includeCompleted = settings?.print_completed === true;
  const includeNutrition = settings?.print_nutrition === true;
  const time = (value) =>
    value === undefined || value === null || value === "" ? "" : String(value);
  const duration = (value) => {
    if (typeof value === "number") return `${value} ${t("printDocMinAbbr")}`;
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(String(value || ""));
    return m
      ? [m[1] ? `${m[1]} h` : "", m[2] ? `${m[2]} min` : ""].filter(Boolean).join(" ")
      : time(value);
  };
  const mealType = (value) =>
    ({
      breakfast: t("breakfast"),
      lunch: t("lunch"),
      dinner: t("dinner"),
      side: t("printDocSide"),
      dessert: t("printDocDessert"),
      drink: t("printDocDrink"),
      snack: t("printDocSnack"),
    })[value] || value;
  const meta = (label, value) =>
    value !== ""
      ? `<div class="meta-box"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`
      : "";
  const tick = () => (checkboxes ? '<span class="tick" aria-hidden="true"></span>' : "");
  const textRow = (value) =>
    `<div class="ingredient-row">${tick()}<span>${esc(value)}</span></div>`;
  const data = Array.isArray(recipe?.recipeIngredient) ? recipe.recipeIngredient : [];
  const instructions = Array.isArray(recipe?.recipeInstructions) ? recipe.recipeInstructions : [];
  const description = String(recipe?.description || "").trim();
  const longFlow =
    instructions.length > 10 ||
    data.length > 18 ||
    instructions.some((x) => instructionText(x).length > 450);
  const printMacro = (label, value) => {
    const clean = String(value ?? "").trim();
    return clean
      ? `<div class="nutrition-macro"><strong>${esc(clean)}</strong><span>${esc(label)}</span></div>`
      : "";
  };
  const nutritionData = recipe?.nutrition;
  const nutrition =
    kind === "recipe" && includeNutrition && nutritionData && typeof nutritionData === "object"
      ? `<section class="nutrition-print"><h2>${esc(words.nutrition)}</h2><div class="nutrition-macros">${[
          printMacro(t("printDocCalories"), nutritionData.calories),
          printMacro(t("printDocProtein"), nutritionData.proteinContent),
          printMacro(t("printDocCarbs"), nutritionData.carbohydrateContent),
          printMacro(t("printDocFat"), nutritionData.fatContent),
          printMacro(t("printDocFiber"), nutritionData.fiberContent),
          printMacro(t("printDocSugar"), nutritionData.sugarContent),
        ].join("")}</div><p class="nutrition-footnote">${esc(words.nutritionCaution)}</p></section>`
      : "";
  const photo =
    kind === "recipe" &&
    style !== "minimal" &&
    settings?.print_image === true &&
    imageOk(recipe?.imageUrl)
      ? `<div class="recipe-photo"><img src="${esc(imageOk(recipe.imageUrl))}" alt="" /></div>`
      : "";
  const noteLines =
    notes && !(kind === "recipe" && instructions.length > 18)
      ? `<section class="note-section"><h2>${esc(words.notes)}</h2><div class="write-line"></div><div class="write-line"></div></section>`
      : "";
  let heading = "",
    body = "",
    landscape = kind === "mealplan";
  if (kind === "recipe") {
    const servings = AtelierStudio.recipeServings(recipe);
    const yieldLabel =
      recipe?.recipeYieldQuantity && recipe?.recipeYield
        ? `${recipe.recipeYieldQuantity} ${recipe.recipeYield}`
        : time(recipe?.recipeYield);
    heading = `<div class="eyebrow">${esc(words.recipe)} · ${esc(words.created)}</div><h1>${esc(recipe?.name || words.recipe)}</h1>${description ? `<p class="dek">${esc(description)}</p>` : ""}
       <div class="meta-grid">${meta(servings ? words.servings : t("printDocYield"), servings ? `${servings} ${words.servings}` : yieldLabel)}${meta(words.time, duration(recipe?.totalTime))}</div>`;
    const list = data.length
      ? data.map((row) => textRow(ingredientName(row))).join("")
      : `<p class="quiet">${esc(words.empty)}</p>`;
    const process = instructions.length
      ? instructions
          .map(
            (row, i) =>
              `<div class="method-row"><span class="method-index">${String(i + 1).padStart(2, "0")}</span><p>${esc(instructionText(row))}</p></div>`,
          )
          .join("")
      : `<p class="quiet">${esc(words.empty)}</p>`;
    body = `${photo}${nutrition}<div class="recipe-columns ${longFlow ? "long-flow" : ""}"><section class="ingredients"><h2>${esc(words.ingredients)} <span class="count">${data.length}</span></h2>${list}</section>
    <section class="method"><h2>${esc(words.method)}</h2>${process}</section></div>${noteLines}`;
  } else if (kind === "shopping") {
    const lists = asArray(shopping?.lists);
    const selected = lists.find((x) => String(x.id) === String(activeList)) || lists[0];
    const id = selected?.id;
    const items = asArray(shopping?.items).filter(
      (x) => String(x.shoppingListId) === String(id) && (includeCompleted || !x.checked),
    );
    heading = `<div class="eyebrow">${esc(words.shopping)} · ${esc(words.created)}</div><h1>${esc(selected?.name || words.shop)}</h1>
      <p class="dek">${items.length} ${esc(words.items)} · ${esc(new Intl.DateTimeFormat(locale || "de-DE", { day: "numeric", month: "long", year: "numeric" }).format(new Date()))}</p>`;
    body = `<section class="shopping-print"><h2>${esc(words.shop)}</h2><div class="shopping-items ${items.length > 12 ? "two-columns" : ""}">
      ${items.length ? items.map((item) => `<div class="shopping-print-row">${tick()}<span>${esc(item.display || item.note || item.food?.name || "")}</span><b>${item.quantity && item.quantity !== 1 ? esc(item.quantity) : ""}</b></div>`).join("") : `<p class="quiet">${esc(words.empty)}</p>`}
      </div></section>${noteLines}`;
  } else if (kind === "mealplan") {
    const mondayDate =
      weekStart instanceof Date && !Number.isNaN(weekStart.getTime())
        ? weekStart
        : monday(new Date());
    const lastDate = addDays(mondayDate, 6);
    const period = `${dayString(locale || "de-DE", mondayDate, { day: "numeric", month: "short" })} — ${dayString(locale || "de-DE", lastDate, { day: "numeric", month: "short", year: "numeric" })}`;
    heading = `<div class="eyebrow">${esc(words.week)} · ${esc(words.created)}</div><h1>${esc(words.page)}</h1><p class="dek">${esc(period)}</p>`;
    const all = asArray(mealplan);
    body = `<section class="week-print">${Array.from({ length: 7 }, (_, i) => {
      const d = addDays(mondayDate, i),
        ymd = dateYmd(d),
        meals = all.filter((x) => x.date === ymd);
      return `<div class="week-day"><div class="weekday">${esc(dayString(locale || "de-DE", d, { weekday: "long" }))}<strong>${esc(dayString(locale || "de-DE", d, { day: "numeric", month: "short" }))}</strong></div>
        ${meals.length ? meals.map((meal) => `<div class="week-meal"><small>${esc(mealType(meal.entryType || ""))}</small><b>${esc(mealName(meal))}</b></div>`).join("") : `<p>${esc(words.noPlan)}</p>`}</div>`;
    }).join("")}</section>${noteLines}`;
  } else {
    throw Error("Unsupported print document");
  }
  const pageName =
    kind === "recipe" ? recipe?.name : kind === "shopping" ? words.shopping : words.week;
  const css = `
  :root{--paper:#fffefb;--ink:#22352d;--soft:#627568;--sage:#8a9e8d;--rule:#d7ded5;--pale:#f1f4ef}
  *{box-sizing:border-box} html,body{margin:0} body{background:#e8ede8;color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
  .print-toolbar{position:sticky;top:0;z-index:10;background:#1b2c25;padding:14px 20px;display:flex;gap:10px;justify-content:center;align-items:center;box-shadow:0 9px 30px #0002}
  .print-toolbar button{border:1px solid #ffffff55;background:transparent;color:white;border-radius:10px;padding:11px 16px;font:650 13px inherit;cursor:pointer}
  .print-toolbar .primary{background:#a8c5ac;color:#15291c;border:0;font-weight:750}
  .sheet{width:210mm;min-height:297mm;margin:26px auto 40px;background:var(--paper);padding:17mm 17mm 14mm;box-shadow:0 22px 60px #1831222e}
  .sheet.landscape{width:297mm;min-height:210mm;padding:15mm 17mm}
  .masthead{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--rule);padding-bottom:12px;margin-bottom:30px;color:var(--soft);font-size:9px;font-weight:800;letter-spacing:2px}
  .masthead .atelier-credit{font-size:8px;font-weight:600;letter-spacing:.35px;text-transform:none;white-space:nowrap;color:var(--soft)}.masthead .atelier-credit a{text-decoration:none}.atelier-credit-heart{color:#b66d67}
  .logo{font-size:12px;color:var(--ink);letter-spacing:1.7px}.logo b{color:#7c9c87}
  .eyebrow{color:#779583;font-weight:800;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px}
  h1{font-family:Georgia,"Times New Roman",serif;font-size:38px;font-weight:400;line-height:1.12;letter-spacing:-1.15px;max-width:700px;margin:0 0 12px}
  .dek{font-size:11px;line-height:1.6;color:var(--soft);max-width:600px;margin:0 0 21px}
  .meta-grid{display:flex;gap:28px;flex-wrap:wrap;margin:24px 0 31px}
  .meta-box span{display:block;color:var(--soft);font-size:9px;text-transform:uppercase;letter-spacing:1.7px;margin-bottom:5px}
  .meta-box strong{font-size:13px;font-weight:700}
  h2{font-size:11px;letter-spacing:2.4px;font-weight:850;color:var(--ink);text-transform:uppercase;display:flex;align-items:center;gap:9px;margin:0 0 21px;padding-bottom:12px;border-bottom:1px solid var(--rule)}
  .count{color:var(--sage);font-weight:600;letter-spacing:0}
  .recipe-photo{height:48mm;overflow:hidden;margin:-4mm 0 11mm;border-radius:3px;break-inside:avoid}
  .recipe-photo img{display:block;width:100%;height:100%;object-fit:cover}
  .nutrition-print{margin:0 0 10mm;break-inside:avoid;page-break-inside:avoid}.nutrition-print h2{margin-bottom:10px}
  .nutrition-macros{display:flex;flex-wrap:wrap;gap:11px}.nutrition-macro{display:flex;flex-direction:column;gap:4px;min-width:20mm;padding:4px 8px 6px 0}
  .nutrition-macro strong{font-size:14px;font-weight:650;color:var(--ink)}.nutrition-macro span{font-size:9px;color:var(--soft)}
  .nutrition-footnote{font-size:8px;color:var(--soft);margin:5px 0 0;line-height:1.4}
  .recipe-columns{display:grid;grid-template-columns:61mm 1fr;gap:16mm;align-items:start}
  .recipe-columns.long-flow{display:block}.recipe-columns.long-flow .ingredients{margin-bottom:28px}.recipe-columns.long-flow .ingredients .ingredient-row{display:inline-flex;min-width:45%;max-width:100%;padding-right:12px;vertical-align:top}
  .ingredient-row{min-height:31px;display:flex;align-items:start;gap:11px;padding:9px 0;border-bottom:1px solid #edf0eb;font-size:11px;line-height:1.55;break-inside:avoid;page-break-inside:avoid}
  .tick{display:inline-block;flex-shrink:0;border:1.35px solid #93a99a;border-radius:2px;width:13px;height:13px;margin-top:2px}
  .method-row{display:grid;grid-template-columns:28px 1fr;align-items:start;gap:12px;margin:0 0 19px;break-inside:avoid;page-break-inside:avoid}
  .method-index{font-family:Georgia,serif;font-size:21px;line-height:1;color:#779583}
  .method-row p{margin:0;font-size:11px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}
  .quiet{font-size:11px;color:var(--soft)}
  .note-section{margin-top:24px;break-inside:avoid}.note-section h2{margin-bottom:13px}.write-line{border-bottom:1px solid var(--rule);height:19px}
  .shopping-items{max-width:100%}.shopping-items.two-columns{columns:2;column-gap:17mm}
  .shopping-print-row{display:flex;gap:13px;padding:10px 0;border-bottom:1px solid var(--rule);font-size:11px;line-height:1.5;break-inside:avoid}
  .shopping-print-row span:not(.tick){flex:1;overflow-wrap:anywhere}.shopping-print-row b{font-weight:500;color:var(--soft)}
  .week-print{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5mm;align-items:start}
  .week-day{border-top:3px solid #8dab98;padding-top:12px;break-inside:avoid;min-width:0}
  .weekday{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;line-height:1.6;margin-bottom:18px}
  .weekday strong{font-weight:500;font-size:10px;color:var(--soft);display:block;letter-spacing:0;text-transform:none}
  .week-day p{font-size:10px;color:var(--soft)}
  .week-meal{border-bottom:1px solid var(--rule);padding:12px 0;break-inside:avoid}.week-meal small{font-size:9px;letter-spacing:1px;color:var(--soft);display:block;margin-bottom:7px}.week-meal b{font-family:Georgia,serif;font-size:14px;line-height:1.36;font-weight:400;overflow-wrap:anywhere}
  .footer{display:flex;justify-content:space-between;gap:15px;margin-top:30px;padding-top:11px;border-top:1px solid var(--rule);color:var(--soft);font-size:8px;letter-spacing:1.5px;break-inside:avoid}
  .minimal .masthead,.minimal .footer{color:#65716c}.minimal .eyebrow{color:#4f5c56}.minimal .tick{border-color:#67716b}
  .minimal .week-day{border-color:#4f5c56}
  .compact h1{font-size:30px}.compact .masthead{margin-bottom:18px}.compact .meta-grid{margin:12px 0 19px}.compact .ingredient-row{padding:6px 0;min-height:25px}.compact .method-row{margin-bottom:12px}.compact .method-row p{line-height:1.55}.compact .method-index{font-size:18px}.compact h2{margin-bottom:12px}.compact .note-section{margin-top:16px}
  @page{size:${landscape ? "A4 landscape" : "A4 portrait"};margin:${landscape ? "12mm 14mm" : "13mm 15mm"}}
  @media print{
   html,body{background:white!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}
   .print-toolbar{display:none!important}
   .sheet,.sheet.landscape{width:auto!important;min-height:0!important;margin:0!important;padding:0!important;box-shadow:none!important;background:white}
   .masthead{margin-top:0}.footer{margin-top:22px}
   /* Photo recipe: balance a meaningful hero image with a useful, single-sheet note area. */
   .sheet.has-photo .recipe-photo{height:33mm;margin-bottom:6mm}
   .sheet.has-photo .meta-grid{margin:14px 0 19px}
   .sheet.has-photo .note-section{margin-top:13px}
   .sheet.has-photo .footer{margin-top:15px}
   h1,h2,.masthead,.recipe-photo,.meta-grid,.week-day{break-after:avoid;page-break-after:avoid}
   .recipe-columns{break-inside:auto}.recipe-columns.long-flow{display:block}
  }
  @media(max-width:920px){.sheet{transform-origin:top center;max-width:100%;width:auto;min-height:70vh;margin:12px;padding:25px}.sheet.landscape{width:auto;min-height:55vh;padding:25px}.recipe-columns{grid-template-columns:1fr;gap:20px}.week-print{grid-template-columns:repeat(7,minmax(0,1fr))}}
  @media(max-width:590px){.sheet{padding:23px 18px}.print-toolbar{flex-wrap:wrap}.masthead{flex-wrap:wrap}.masthead .atelier-credit{width:100%;justify-content:flex-end}.week-print{grid-template-columns:repeat(2,minmax(0,1fr))}.shopping-items.two-columns{columns:1}h1{font-size:30px}}
  `;
  return `<!DOCTYPE html><html lang="${esc(locale || "en")}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(pageName || "Mealie Atelier")}</title><style>${css}</style></head>
   <body><nav class="print-toolbar"><button type="button" class="primary" id="print-now">${esc(words.print)}</button><button type="button" id="close-print">${esc(words.close)}</button></nav>
   <article class="sheet ${landscape ? "landscape" : ""} ${photo ? "has-photo" : ""} ${esc(style)}"><header class="masthead"><span class="logo">MEALIE <b>ATELIER</b></span><span>KITCHEN STUDIO · PRINT EDITION</span>${AtelierUI.attribution({ lead: t("creditMadeWith"), by: t("creditBy") })}</header>
   <section class="document-heading">${heading}</section>${body}${kind === "recipe" && instructions.length > 18 ? "" : `<footer class="footer"><span>${esc(words.made)}</span><span>${esc(words.created)}</span></footer>`}</article></body></html>`;
}

/** Stub card title in the Home Assistant UI language (English fallback). */
function stubTitle(hass, mode) {
  const locale = resolveLanguage("auto", hass?.locale?.language || hass?.language, "");
  return translateLabel(locale, `stubTitle.${mode}`);
}

class MealieAtelierCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("mealie-atelier-card-editor");
  }
  static getStubConfig() {
    return {
      mode: "dashboard",
      title: "Mealie Atelier",
      theme: "dark",
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
    this._hass = value;
    if (this.isConnected && !this._didLoad) {
      this._didLoad = true;
      this._refresh();
    }
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
        let failures = [];
        result.forEach((r, i) => {
          if (r.status === "fulfilled") {
            if (keys[i] === "status") this._status = r.value;
            else this._data[keys[i]] = r.value;
          } else {
            failures.push(
              r.reason?.code ? this._errorText(r.reason) : r.reason?.message || String(r.reason),
            );
          }
        });
        if (failures.length) this._error = failures[0];
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
        if (
          failures.length &&
          result.every((r) => r.status === "rejected") &&
          this._providerActive !== "home_assistant"
        )
          throw new Error(failures[0]);
        if (!this._activeList)
          this._activeList = String(asArray(this._data.shopping?.lists)[0]?.id || "");
      }
    } catch (err) {
      this._error = err?.code ? this._errorText(err) : err?.message || this.t("offline");
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
      <div class="identity"><div class="logo">${icon("leaf", 22)}</div><div><strong>MEALIE<br>ATELIER</strong><span>KITCHEN STUDIO</span></div></div>
      <div class="nav-label">MENU</div><nav class="nav" aria-label="${esc(this.t("navKitchenLabel"))}">
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
  _persistTimers() {
    try {
      localStorage.setItem("mealie-atelier:timers", JSON.stringify(this._timers));
    } catch {}
  }
  _tickTimers() {
    const now = Date.now();
    let finished = false;
    for (const timer of this._timers) {
      if (!timer.done && timer.deadline <= now) {
        timer.done = true;
        finished = true;
      }
    }
    if (finished) {
      this._persistTimers();
      this._render();
    }
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
      theme = d.theme === "light" ? "light" : "dark";
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
      ${this._error ? `<div class="notice error is-spaced" role="alert">${icon("bolt", 17)}<span>${esc(this._error)}</span><button class="btn tiny" data-action="refresh">${esc(this.t("retry"))}</button></div>` : ""}
      ${this._status && this._providerActive !== "home_assistant" && this._noWriteGrant ? `<div class="notice is-spaced" role="status">${icon("leaf", 16)} <strong>${esc(this._noWriteGrantText)}</strong></div>` : this._status && !this._permissions.can_write ? `<div class="notice is-spaced ${this._providerActive === "home_assistant" ? "is-provider-notice" : ""}" role="status">${icon("leaf", 16)} <strong>${esc(this._providerActive === "home_assistant" ? this.t("uiMealieReadOnly") : this.t("readOnly"))}</strong>${this._providerActive === "home_assistant" ? `<span class="provider-copy">${esc(this.t("uiRecipesCookingPhotosAndEditsNeedAtelierBridge"))}</span>` : ` ${esc(this.t("readOnlyHint"))}`}</div>` : ""}
      <div class="view-stage ds-page ${viewChanged ? "is-entering" : themeChanged ? "is-theme-entering" : ""}" data-view="${esc(this._view)}" role="region" aria-label="${esc(this.t(this._view))}">${this._body()}</div>
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
    if (viewChanged) {
      this._revealActiveNav();
      if (typeof requestAnimationFrame === "function")
        requestAnimationFrame(() => this._revealActiveNav());
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
    if (event.key === "Escape" && this._modal) {
      event.preventDefault();
      if (this._modal === "command") {
        clearTimeout(this._commandSearchTimer);
        this._commandSearchSeq++;
      }
      this._modal = null;
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
  async _mutate(action, payload, refresh = "all", optimistic = null) {
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
      this._modal = null;
      this._flash(action.startsWith("recipe") ? this.t("saved") : this.t("saved"));
      return true;
    } catch (err) {
      if (rollback) rollback();
      // BEGIN feature H: offline queue keeps connectivity failures
      if (this._offlineHandleFailure(action, payload, err)) return true;
      // END feature H
      this._error = "";
      this._flash(this.t("uiMutationFailed", { error: this._errorText(err) }), "error");
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
    if (field === "theme" && !["light", "dark"].includes(value)) return;
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
      const minutes = Number(input?.value);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return;
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
        if (this._hass?.callWS) {
          await this._ws("alarm_create", {
            timer: { id, label, deadline: timer.deadline, locale: this._language },
          });
          timer.serverArmed = true;
        }
        this._timers.push(timer);
        this._persistTimers();
        this._render();
        this._flash(this.t(timer.serverArmed ? "uiBackgroundTimerEnabled" : "uiLocalTimerEnabled"));
      } catch (error) {
        this._flash(this.t("uiBackgroundTimerError", { error: error.message || String(error) }));
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
          this._flash(this.t("uiTimerStopError", { error: error.message || String(error) }));
          return;
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
    if (action === "close-modal" || action === "backdrop") {
      if (this._modal === "command") {
        clearTimeout(this._commandSearchTimer);
        this._commandSearchSeq++;
      }
      this._modal = null;
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
        this._planDay = dateYmd(new Date());
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
    if (action === "remove-meal") {
      el.disabled = true;
      await this._mutate("mealplan_delete", { entry_id: v }, "mealplan", () =>
        this._optimisticRemoveMeal(v),
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
      this.shadowRoot.querySelector(".command-shortcuts")?.toggleAttribute("hidden", active);
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
        ) => `<button class="command-item command-recipe ${index === 0 ? "is-featured" : ""}" type="button" data-action="open-recipe" data-value="${esc(recipe.slug)}" aria-label="${esc(recipe.name)} öffnen">
      <span class="command-recipe-image">${recipeImage(recipe)}</span><span class="command-recipe-copy"><strong>${esc(recipe.name)}</strong><span class="command-recipe-meta">${recipe.totalTime ? `${icon("clock", 12)} ${esc(AtelierStudio.formatTime(recipe.totalTime, this._language))}` : `${icon("book", 12)} ${esc(recipe.recipeCategory?.[0]?.name || this.t("featured"))}`}</span></span>
      <span class="command-match command-match-${match}">${esc(label[match] || label.match)}</span><span class="command-arrow">${icon("arrow", 15)}</span></button>`,
      )
      .join("");
    const more = `<button class="command-item command-all-results" type="button" data-action="command-all-results">${icon("search", 16)}<span>${this.t("uiSeeAllResults", { count: this._commandTotal })}</span><span class="command-arrow">${icon("arrow", 15)}</span></button>`;
    return `<div class="command-results-heading"><span>${this.t("uiMATCHINGRECIPES")}</span><span>${this._commandTotal} ${this.t("uiresults")}</span></div><div class="command-results-list" role="group" aria-label="${this.t("uiRecipeResults")}">${results}</div>${more}`;
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

/** Render the primary card views from normalized provider state. */
const viewMethods = {
  _hero() {
    const today = dateYmd(new Date());
    const entry =
      asArray(this._data.mealplan).find((e) => e.date === today && e.entryType === "dinner") ||
      asArray(this._data.mealplan).find((e) => e.date === today);
    const title = entry ? mealName(entry) : this.t("headline");
    const name = entry?.recipe?.name;
    const img = recipeImage(entry?.recipe || {}, "hero-food");
    return `<section class="hero">${img}<div class="hero-copy"><div class="eyebrow">${esc(this.t("tonight"))}</div><h2>${esc(title)}</h2><p>${esc(entry ? this.t("featured") : this.t("greetingSub"))}</p>
      <button class="btn primary" data-action="${name ? "open-recipe" : "nav"}" data-value="${name ? esc(entry.recipe.slug) : "mealplan"}">${icon(name ? "book" : "plus", 15)} ${esc(this.t(name ? "viewRecipe" : "planNow"))} ${icon("arrow", 14)}</button></div>
      ${img ? "" : `<div class="hero-art" aria-hidden="true"><div class="plate"></div></div>`}</section>`;
  },
  _stats() {
    const total = this._data.recipes?.total ?? asArray(this._data.recipes?.items).length;
    const items = asArray(this._data.shopping?.items);
    const active = this._activeList
      ? items.filter((i) => String(i.shoppingListId) === this._activeList)
      : items;
    const open = active.filter((i) => !i.checked).length;
    const scheduled = asArray(this._data.mealplan).length;
    return `<div class="statline">${this._stat(total ?? "—", this.t("count"), "book", "recipes")}${this._stat(scheduled, this.t("nextMeal"), "calendar", "mealplan")}${this._stat(open, this.t("openItemsLabel"), "cart", "shopping")}</div>`;
  },
  _recipeTools() {
    return `<div class="recipe-tools"><label class="search">${icon("search", 17)}<input type="search" data-input="search" aria-label="${esc(this.t("search"))}" autocomplete="off" placeholder="${esc(this.t("search"))}" value="${esc(this._query)}"></label>${this._permissions.can_manage ? `<button class="btn tiny" data-action="create-form">${icon("plus", 14)} ${esc(this.t("create"))}</button>` : ""}</div>`;
  },
  _recipes(limit = 24) {
    const recipes = asArray(this._data.recipes?.items);
    const localPage = this._providerActive === "home_assistant" && limit === 24;
    const list = localPage
      ? recipes.slice((this._page - 1) * limit, this._page * limit)
      : recipes.slice(0, limit);
    const ratio =
      { portrait: "4/5", square: "1/1", landscape: "4/3" }[this._design.photo_ratio] || "4/5";
    return `<div class="recipe-grid ${limit < 24 ? "is-featured" : ""}" style="--at-cols:${Math.min(4, Math.max(1, Number(this._design.columns) || 3))};--at-tile-ratio:${ratio}">${list
      .map((recipe, idx) => {
        const category =
          recipe.recipeCategory?.[0]?.name || recipe.recipeCategory?.[0] || this.t("featured");
        const image = this._design.show_images !== false;
        const timeLabel =
          AtelierStudio.formatTime(recipe.totalTime, this._language) ||
          this.t("uiMealieRecipeFallback");
        return `<button class="recipe-tile" data-action="open-recipe" data-value="${esc(recipe.slug)}" aria-label="${esc(recipe.name)}"><div class="tile-image tint${idx % 4}">${image ? recipeImage(recipe) : ""}<div class="photo-index">ATELIER / ${String(idx + 1).padStart(2, "0")}</div><div class="placeholder">${esc(recipe.name)}</div></div><div class="tile-body"><small>${esc(category)}</small><h3>${esc(recipe.name)}</h3><div class="tile-meta">${icon("clock", 13)}${esc(timeLabel)}</div><span class="tile-open">${icon("arrow", 13)}</span></div></button>`;
      })
      .join(
        "",
      )}</div>${this._providerActive === "home_assistant" ? `<p class="provider-note" role="status">${this.t("uiUpTo500MatchesThroughHomeAssistantPhotosAndAtelierWriteFeaturesStayDisabledForSecurity")}</p>${this._providerTruncated ? `<p class="provider-note" role="status">${esc(this.t("uiProviderResultsTruncated", { limit: NATIVE_RESULT_LIMIT }))}</p>` : ""}` : ""}${!list.length ? `<div class="notice">${icon("book")} ${esc(this.t("noRecipes"))}</div>` : ""}`;
  },
  _pagination() {
    const page = this._data.recipes || {};
    const p = Number(page.page || this._page);
    const total = Number(page.total || 0);
    const size = Number(page.per_page || page.perPage || 24);
    const last = Math.max(1, Math.ceil(total / Math.max(size, 1)));
    if (last <= 1) return "";
    return `<div class="pager"><button class="btn tiny" data-action="page" data-value="${p - 1}" ${p <= 1 ? "disabled" : ""}>${esc(this.t("back"))}</button><span>${p} / ${last}</span><button class="btn tiny" data-action="page" data-value="${p + 1}" ${p >= last ? "disabled" : ""}>${esc(this.t("next"))}</button></div>`;
  },
  _week() {
    const all = asArray(this._data.mealplan);
    const today = dateYmd(new Date());
    return `<div class="week-grid">${Array.from({ length: 7 }, (_, i) => {
      const day = addDays(this._weekStart, i),
        ymd = dateYmd(day),
        todays = all.filter((m) => m.date === ymd);
      return `<div class="day ${ymd === today ? "today" : ""}"><div class="day-head"><span>${esc(dayString(this._locale, day, { weekday: "short" }))}</span><b>${day.getDate()}</b></div>
      ${todays
        .slice(0, 3)
        .map((meal) => {
          const photo = recipeImage(meal.recipe || {});
          return `<button class="day-meal${photo ? " has-photo" : ""}" data-action="day-meal" data-value="${esc(meal.recipe?.slug || "")}" title="${esc(mealName(meal))}">${photo ? `<span class="day-meal-photo">${photo}</span>` : ""}<small>${esc(this.t(meal.entryType) || meal.entryType || "")}</small><span class="day-meal-name">${esc(mealName(meal))}</span></button>`;
        })
        .join("")}
      ${todays.length === 0 ? `<div class="day-empty">${esc(this.t("noPlan"))}</div>` : ""}${this._permissions.can_write ? `<button class="day-add" data-action="plan-form" data-value="${ymd}" aria-label="${esc(this.t("planNow"))}">${icon("plus", 16)}</button>` : ""}</div>`;
    }).join("")}</div>`;
  },
  _shopping() {
    const lists = asArray(this._data.shopping?.lists);
    const all = this._offlineItems(asArray(this._data.shopping?.items));
    const selected = this._activeList || String(lists[0]?.id || "");
    const filtered = all.filter((i) => String(i.shoppingListId) === selected);
    const done = filtered.filter((i) => i.checked).length;
    return `<div class="shopping-card"><div class="toolbar shopping-toolbar"><button class="btn tiny" data-action="print-list">${icon("print", 14)} ${this.t("uiPrintPDF")}</button>${this._syncEntryButton()}${this._permissions.can_write ? `<button class="btn tiny" data-action="create-list-form">${icon("plus", 14)} ${esc(this.t("createList"))}</button>` : ""}</div>${lists.length ? `<div class="shopping-list-filter"><select data-input="shopping-list" aria-label="${esc(this.t("label"))}">${lists.map((l) => `<option value="${esc(l.id)}" ${String(l.id) === selected ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select><span class="pill">${done}/${filtered.length} ${esc(this.t("progress"))}</span></div>` : ""}
      ${this._offlineBar()}<div class="shopping-list">${filtered.map((item) => `<div class="shopping-row ${item.checked ? "checked" : ""}"><button class="check-ui" data-action="shopping-toggle" data-id="${esc(item.id)}" data-checked="${item.checked ? "true" : "false"}" role="checkbox" aria-checked="${item.checked ? "true" : "false"}" ${!this._permissions.can_write || /^(pending|local)-/.test(String(item.id)) ? 'disabled aria-disabled="true"' : ""} aria-label="${esc(String(item.id).startsWith("local-") ? this.t("offlineWaiting") : String(item.id).startsWith("pending-") ? this.t("uiSaving") : this.t(item.checked ? "uiMarkShoppingOpen" : "uiMarkShoppingComplete", { item: item.display || item.note || item.food?.name || this.t("itemFallback") }))}">${icon("check", 14)}</button><span class="shopping-name">${esc(item.display || item.note || item.food?.name || this.t("itemFallback"))}</span><span class="shopping-qty">${esc(item.offlineWaiting ? this.t("offlineWaiting") : item.quantity && item.quantity !== 1 ? item.quantity : "")}</span></div>`).join("")}
      ${!filtered.length ? `<div class="notice">${icon("cart")} ${esc(lists.length ? this.t("noShopping") : this.t("addListFirst"))}</div>` : ""}</div>
      ${lists.length && this._permissions.can_write ? `<form class="shopping-form" data-form="shopping-add"><input name="note" required maxlength="250" placeholder="${esc(this.t("addItem"))}" aria-label="${esc(this.t("addItem"))}"><button class="btn primary" type="submit">${icon("plus", 14)} ${esc(this.t("add"))}</button></form>` : ""}</div>`;
  },
  _today() {
    const today = dateYmd(new Date());
    const meals = asArray(this._data.mealplan).filter((m) => m.date === today);
    const lists = asArray(this._data.shopping?.lists);
    const selected = this._activeList || String(lists[0]?.id || "");
    const open = this._offlineItems(asArray(this._data.shopping?.items)).filter(
      (x) => String(x.shoppingListId) === selected && !x.checked,
    );
    return `${this._intro(this.t("todayIntro"), this.t("todaySub"), esc(dayString(this._locale, new Date(), { weekday: "long", day: "numeric", month: "long" })).toUpperCase())}
    <div class="today-board"><div class="today-panel"><div class="eyebrow">${esc(this.t("plannedForToday"))}</div><h3>${esc(this.t("tonight"))}</h3>
    ${meals.length ? meals.map((meal) => `<div class="today-meal">${recipeImage(meal.recipe || {}) ? `<div class="meal-photo">${recipeImage(meal.recipe || {})}</div>` : `<div class="meal-badge">${icon("utensils", 22)}</div>`}<div class="meal-details"><small>${esc(this.t(meal.entryType) || meal.entryType)}</small><strong>${esc(mealName(meal))}</strong></div>${meal.recipe?.slug ? `<button class="btn tiny icon-only" data-action="open-recipe" data-value="${esc(meal.recipe.slug)}" aria-label="${esc(this.t("viewRecipe") + ": " + mealName(meal))}">${icon("arrow", 14)}</button>` : ""}</div>`).join("") : `<div class="notice">${icon("spark", 16)} ${esc(this.t("noPlan"))}</div>`}
    <div class="form-actions">${this._permissions.can_write ? `<button class="btn primary" data-action="plan-form" data-value="${today}">${icon("plus", 14)} ${esc(this.t("planNow"))}</button>` : ""}</div></div>
    <div class="today-panel"><div class="eyebrow">${esc(lists.find((l) => String(l.id) === selected)?.name || this.t("shopping"))}</div><h3>${esc(this.tp("openItems", open.length))}</h3>
    ${
      open.length
        ? open
            .slice(0, 6)
            .map(
              (x) =>
                `<div class="mini-shopping"><span>${icon("cart", 15)}</span><button data-action="shopping-toggle" data-id="${esc(x.id)}" data-checked="false" aria-label="${esc(String(x.id).startsWith("local-") ? this.t("offlineWaiting") : String(x.id).startsWith("pending-") ? this.t("uiSaving") : this.t("uiMarkComplete") + (x.display || x.note || x.food?.name || this.t("itemFallback")))}" ${!this._permissions.can_write || /^(pending|local)-/.test(String(x.id)) ? 'disabled aria-disabled="true"' : ""}>${esc(x.display || x.note || x.food?.name || "")}</button></div>`,
            )
            .join("")
        : `<div class="notice">${icon("check", 16)} ${esc(this.t("noShopping"))}</div>`
    }
    <div class="form-actions"><button class="btn" data-action="nav" data-value="shopping">${esc(this.t("toShopping"))} ${icon("arrow", 14)}</button></div></div></div>`;
  },
  _manage() {
    if (!this._permissions.can_manage)
      return this._permissions.can_write
        ? `<div class="notice">${esc(this.t("adminOnlyHint"))}</div>`
        : ""; // the global read-only banner already explains the missing write access
    return `<div class="manage-grid"><div class="manage-card"><div class="stat-icon">${icon("plus", 21)}</div><h3>${esc(this.t("create"))}</h3><p>${esc(this.t("recipeTip"))}</p><button class="btn primary" data-action="create-form">${icon("plus", 14)} ${esc(this.t("create"))}</button></div>
    <div class="manage-card"><div class="stat-icon">${icon("external", 21)}</div><h3>${esc(this.t("import"))}</h3><p>${esc(this.t("importTip"))}</p><button class="btn" data-action="import-form">${icon("arrow", 14)} ${esc(this.t("import"))}</button></div></div>
    <div class="section"><div class="heading"><div><h2>${esc(this.t("saveNote"))}</h2><p>${esc(this.t("adminOnly"))}</p></div></div>${this._recipes(12)}</div>`;
  },
  _body() {
    if (this._busy && !this._data.recipes)
      return `<div class="skeleton" role="status" aria-label="${esc(this.t("loading"))}"><div class="eyebrow">${esc(this.t("loading"))}</div><div class="skeleton-hero"></div><div class="skeleton-row"><div class="skeleton-tile"></div><div class="skeleton-tile"></div><div class="skeleton-tile"></div></div></div>`;
    const view = this._view;
    if (view === "dashboard")
      return `${this._intro(this.t("greeting"), this.t("greetingSub"), this.t("eyebrow"))}${this._hero()}${this._stats()}
      <section class="section"><div class="heading"><div><h2>${esc(this.t("collections"))}</h2><p>${esc(this.t("recipesSub"))}</p></div><button class="btn plain" data-action="nav" data-value="recipes">${esc(this.t("all"))} ${icon("arrow", 14)}</button></div>${this._recipes(6)}</section>
      <section class="section"><div class="heading"><div><h2>${esc(this.t("week"))}</h2></div><button class="btn plain" data-action="nav" data-value="mealplan">${esc(this.t("mealplan"))} ${icon("arrow", 14)}</button></div>${this._week()}</section>
      <section class="section"><div class="heading"><h2>${esc(this.t("list"))}</h2><button class="btn plain icon-only" data-action="nav" data-value="shopping" aria-label="${esc(this.t("toShopping"))}" title="${esc(this.t("toShopping"))}">${icon("arrow", 14)}</button></div>${this._shopping()}</section>`;
    if (view === "today") return this._today();
    if (view === "recipes")
      return `${this._intro(this.t("collections"), this.t("recipesSub"), this.t("eyebrow"))}${this._recipeTools()}${this._recipes()}${this._pagination()}`;
    if (view === "mealplan")
      return `${this._intro(this.t("week"), this.t("mealplanSub"), this.t("eyebrow"))}<div class="heading"><div><h2>${esc(dayString(this._locale, this._weekStart, { month: "long", year: "numeric" }))}</h2><p>${esc(dayString(this._locale, this._weekStart, { day: "numeric", month: "short" }))} – ${esc(dayString(this._locale, addDays(this._weekStart, 6), { day: "numeric", month: "short" }))}</p></div><div class="toolbar"><button class="btn tiny" data-action="print-week">${icon("print", 13)} ${this.t("uiPrint")}</button><button class="btn tiny" data-action="week-prev">${esc(this.t("back"))}</button><button class="btn tiny" data-action="week-today">${esc(this.t("today"))}</button><button class="btn tiny" data-action="week-next">${esc(this.t("next"))}</button></div></div><p class="week-swipe-hint">${this.t("uiSwipeToBrowseAllSevenDays")}</p>${this._week()}`;
    if (view === "shopping")
      return `${this._intro(this.t("list"), this.t("shoppingSub"), this.t("eyebrow"))}${this._shopping()}`;
    return `${this._intro(this.t("admin"), this.t("manageSub"), this.t("eyebrow"))}${this._manage()}`;
  },
}

/** Manage print settings and open user-configured print output. */
const printActionMethods = {
  _openPrint(kind) {
    this._printKind = kind;
    this._modal = "print";
    this._render();
  },
  _print() {
    const kind = this._printKind;
    if (kind === "recipe" && !this._detail) return;
    const all = asArray(this._data.shopping?.lists);
    if (kind === "shopping" && !all.length) {
      this._error = this.t("addListFirst");
      this._render();
      return;
    }
    const popup = window.open("", "_blank");
    if (!popup) {
      this._error = this.t("uiAllowPopupsToOpenThePrintPreview");
      this._render();
      return;
    }
    const html = buildPrintDocument(kind, {
      recipe: this._detail,
      shopping: this._data.shopping,
      mealplan: this._data.mealplan,
      activeList: this._activeList || String(all[0]?.id || ""),
      weekStart: this._weekStart,
      locale: this._locale,
      settings: this._design,
      translate: (key, values) => this.t(key, values),
    });
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.document.getElementById("print-now")?.addEventListener("click", () => popup.print());
    popup.document.getElementById("close-print")?.addEventListener("click", () => popup.close());
    popup.focus();
  },
}

/** Render nutrition matching, calculation review, and device-local cooking notes. */
const nutritionJournalMethods = {
  _nutritionEntries() {
    return this._nutrition.rows.map((row) => ({
      index: row.index,
      grams: Number(row.grams),
      fdc_id: Number(row.selected?.id),
    }));
  },
  _nutritionMarkup() {
    const n = this._nutrition;
    if (!n) return "";
    const matched = n.rows.filter((x) => x.selected && Number(x.grams) > 0).length;
    const nutrients = [
      ["calories", this.t("uiCalories"), "kcal"],
      ["protein", this.t("uiProtein"), "g"],
      ["carbohydrate", this.t("uiCarbohydrates"), "g"],
      ["fat", this.t("uiFat"), "g"],
    ];
    const existing = Boolean(
      n.preview.existing && Object.values(n.preview.existing).some((v) => v !== null && v !== ""),
    );
    const report = n.report;
    return `<div class="modal-content nutrition-studio"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("nutritionKicker"))}</div><h2>${esc(this.t("nutriTitle"))}</h2><p>${this.t("uiNutrientValuesComeFromFoodDataNotAIGuessesReviewAllWeightsAndMatches")}</p></div><div class="editor-stamp">${icon("leaf", 27)}</div></div>
      <div class="nutri-header"><div class="nutri-eyebrow">${esc(n.preview.name || "")}</div><strong>${matched} / ${n.rows.length}</strong><span>${this.t("uiFoodsMatched")} · ${esc(n.preview.servings || "—")} ${esc(this.t("servings"))}</span></div>
      ${!n.preview.fdc_enabled ? `<div class="nutri-alert">${this.t("uiUSDAAPIKeyNotConfiguredAddItInIntegrationSettingsOrEnv")}</div>` : ""}
      ${existing ? `<div class="nutri-alert">${this.t("uiThisRecipeAlreadyHasNutritionDataExplicitApprovalIsRequiredToReplaceIt")}</div>` : ""}
      <div class="nutri-tools"><button class="btn" data-action="nutri-ai" ${!n.preview.ai_enabled || n.busy ? "disabled" : ""}>${icon("spark", 16)} ${esc(this.t("nutriAi"))}</button><span>${n.preview.ai_enabled ? this.t("uiSendsIngredientTextToAIProviderNoInventedMacros") : this.t("uiOptionalConfigureAIAPIKey")}</span></div>
      <div class="nutri-table"><div class="eyebrow">01 / ${this.t("uiREVIEWINGREDIENTS")}</div>
      ${n.rows
        .map(
          (
            row,
            i,
          ) => `<div class="nutri-row"><div class="nutri-row-head"><span class="nutri-number">${String(i + 1).padStart(2, "0")}</span><strong>${esc(row.text)}</strong><span class="nutri-state ${row.selected ? "matched" : ""}">${row.selected ? "✓ USDA" : this.t("uiNotMatched")}</span></div>
        <div class="nutri-row-fields"><label><span>${esc(this.t("nutriGrams"))}</span><input type="number" min="0.01" max="50000" step="0.1" data-nutri-grams="${i}" value="${row.grams ?? ""}" placeholder="${esc(this.t("nutriGramsPlaceholder"))}" aria-label="${esc(this.t("nutriGrams"))} ${i + 1}"></label>
        <label class="nutri-query"><span>${this.t("uiFoodSearchQuery")}</span><input data-nutri-query="${i}" maxlength="100" value="${esc(row.query)}" aria-label="${this.t("uiFindFood")} ${i + 1}"></label>
        <button class="btn tiny" data-action="nutri-search" data-index="${i}" ${!n.preview.fdc_enabled || n.busy ? "disabled" : ""}>${icon("search", 14)} ${esc(this.t("nutriSearch"))}</button></div>
        ${row.selected ? `<div class="nutri-source">✓ ${esc(row.selected.name)} <small>USDA FDC #${esc(row.selected.id)} · ${esc(row.selected.data_type || "")}</small></div>` : ""}
        ${n.active === i ? `<div class="nutri-choices">${n.choices.length ? n.choices.map((choice) => `<button data-action="nutri-select" data-index="${i}" data-value="${esc(choice.id)}"><strong>${esc(choice.name)}</strong><small>${esc(choice.data_type || "")} · ${Number(choice.per_100g.calories).toFixed(0)} kcal/100 g</small></button>`).join("") : `<p>${this.t("uiNoCompleteNutritionEntriesFoundTryAnotherQuery")}</p>`}</div>` : ""}</div>`,
        )
        .join("")}</div>
      <div class="nutri-result"><div class="eyebrow">02 / ${esc(this.t("nutriResult")).toUpperCase()}</div><div class="nutri-stats">${nutrients.map(([key, label, unit]) => `<div class="nutri-stat"><span>${esc(label)}</span><strong>${report && report.per_portion[key] != null ? esc(report.per_portion[key]) : "—"}</strong><small>${esc(unit)}</small></div>`).join("")}</div>
      <p class="nutri-subnote">${this.t("uiBasedOnSelectedUSDAEntriesPer100gCookingYieldsAndMissingNutrientsAffectAccuracyValuesAreEstimates")}</p>
      ${
        report
          ? `<div class="nutri-provenance"><strong>${this.t("uiSourcesCoverage")}</strong> ${Object.entries(
              report.coverage || {},
            )
              .slice(0, 4)
              .map(([k, v]) => `${esc(k)} ${esc(v)}`)
              .join(
                " · ",
              )} ${report.ingredients.map((row) => `<a href="${esc(row.source_url)}" target="_blank" rel="noopener noreferrer">FDC ${esc(row.fdc_id)}</a>`).join(" ")}</div>`
          : ""
      }
      ${existing ? `<label class="editor-check"><input type="checkbox" data-nutri-replace ${n.replaceExisting ? "checked" : ""}> ${this.t("uiExplicitlyReplaceExistingNutritionValues")}</label>` : ""}
      ${n.notice ? `<div class="nutri-alert" role="status">${esc(n.notice)}</div>` : ""}
      <div class="nutri-actions"><button class="btn" data-action="nutri-back">${esc(this.t("back"))}</button><button class="btn" data-action="nutri-calc" ${matched !== n.rows.length || !n.rows.length || !n.preview.fdc_enabled || n.busy ? "disabled" : ""}>${icon("refresh", 15)} ${esc(this.t("nutriEstimate"))}</button>${this._permissions.can_manage ? `<button class="btn primary" data-action="nutri-save" ${!report || n.busy || (existing && !n.replaceExisting) ? "disabled" : ""}>${icon("check", 15)} ${esc(this.t("nutriSave"))}</button>` : ""}</div></div></div>`;
  },
  _journalMarkup() {
    const slug = this._detail?.slug,
      note = this._journal[slug] || {};
    return `<div class="modal-content journal-studio"><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("journalKicker"))}</div><h2>${esc(this.t("journal"))}</h2><p class="muted">${this.t("uiYourPersonalCookingNotesStoredOnlyOnThisDeviceNotSyncedToMealie")}</p>
    <form data-form="journal" class="editor-form"><section class="editor-card"><label class="field"><span>${this.t("uiHowDidItTurnOut")}</span><select name="rating">${[0, 1, 2, 3, 4, 5].map((i) => `<option value="${i}" ${Number(note.rating || 0) === i ? "selected" : ""}>${i ? `${"★".repeat(i)} ${i}/5` : this.t("uiNotRated")}</option>`).join("")}</select></label><label class="field"><span>${esc(this.t("journalNote"))}</span><textarea name="note" maxlength="800" rows="5" placeholder="${this.t("uiNextTimeReduceTheSalt")}">${esc(note.note || "")}</textarea></label><label class="editor-check"><input type="checkbox" name="favorite" ${note.favorite === true ? "checked" : ""}> ${esc(this.t("uiRememberAsFavoriteRecipe"))}</label><div class="form-actions"><button type="button" class="btn" data-action="close-modal">${esc(this.t("back"))}</button><button class="btn primary" type="submit">${esc(this.t("journalSave"))}</button></div></section></form></div>`;
  },
}

/** Render modal workflows and their accessible dialog content. */
const dialogMethods = {
  _modalHtml() {
    if (!this._modal) return "";
    const closing = `<button class="icon-btn modal-close" data-action="close-modal" title="${esc(this.t("close"))}" aria-label="${esc(this.t("close"))}">${icon("close")}</button>`;
    let content = "",
      size = "";
    if (this._modal === "command") {
      size = "command";
      const permitted = MODES.filter((m) =>
        this._providerActive === "home_assistant"
          ? m === "recipes"
          : m !== "manage" || this._permissions.can_manage,
      );
      const navIcons = {
        dashboard: "home",
        today: "sun",
        discover: "spark",
        recipes: "book",
        mealplan: "calendar",
        pantry: "leaf",
        shopping: "cart",
        family: "utensils",
        cookbook: "print",
        manage: "gear",
      };
      content = `<div class="command-content"><div class="command-heading"><span class="eyebrow">ATELIER</span>${this.t("uiFindYourNextFavorite")}</div>
      <label class="command-search">${icon("search", 19)}<input data-input="command-search" type="search" placeholder="${this.t("uiSearchRecipesIngredientsOrViews")}" autocomplete="off" aria-label="${this.t("uiSearchRecipesIngredientsAndQuickActions")}"></label>
      <div class="command-hint" data-command-hint>${this.t("uiSearchYourRecipesIncludingByIngredient")} <span class="command-example">${this.t("uiSearchConversionExample")}</span></div>
      <div class="command-shortcuts"><div class="command-section">${this.t("uiYOURKITCHEN")}</div><div class="command-list" role="group" aria-label="${this.t("uiNavigation")}">
      ${permitted.map((m) => `<button class="command-item" type="button" data-action="nav" data-value="${m}">${icon(navIcons[m], 18)}<span>${esc(this.t(m))}</span><span class="command-arrow">${icon("arrow", 15)}</span></button>`).join("")}
      ${this._permissions.can_manage ? `<button class="command-item" type="button" data-action="create-form">${icon("plus", 18)}<span>${esc(this.t("create"))}</span><span class="command-arrow">${icon("arrow", 15)}</span></button>` : ""}
      <button class="command-item" type="button" data-action="refresh">${icon("refresh", 18)}<span>${esc(this.t("refresh"))}</span><span class="command-arrow">${icon("arrow", 15)}</span></button></div>
      <div class="command-empty">${this.t("uiNoMatchingViewsOrActions")}</div></div>
      <div class="command-live" data-command-live aria-live="polite" aria-busy="false"></div>
      <div class="command-footer"><span>↑ ↓ ${this.t("uiSelect")} · ↵ ${this.t("uiOpen")}</span><span>Esc ${this.t("uiClose")}</span></div></div>`;
    }
    if (this._modal === "nutrition" && this._nutrition) {
      size = "large";
      content = this._nutritionMarkup();
    }
    if (this._modal === "journal" && this._detail) {
      size = "large";
      content = this._journalMarkup();
    }
    if (this._modal === "loading")
      content = `<div class="modal-content skeleton">${esc(this.t("loading"))}</div>`;
    if (this._modal === "recipe" && this._detail) {
      const recipe = this._detail,
        ingredients = asArray(recipe.recipeIngredient),
        steps = asArray(recipe.recipeInstructions);
      const discoverTarget =
        this._discoverResults && this._discoverSelected === recipe.slug
          ? Number(this._discoverDraft?.people) || 0
          : 0;
      const servingBase = AtelierStudio.recipeServings(recipe);
      const servingWord = this.tp("uiServing", discoverTarget);
      const yieldText =
        recipe.recipeYieldQuantity && recipe.recipeYield
          ? `${recipe.recipeYieldQuantity} ${recipe.recipeYield}`
          : recipe.recipeYield;
      const baseYield =
        Number(recipe.recipeServings) > 0
          ? `${recipe.recipeServings} ${this.tp("uiServing", Number(recipe.recipeServings))}`
          : yieldText;
      const scaledYield =
        discoverTarget && servingBase ? `${discoverTarget} ${servingWord}` : baseYield || "—";
      const scaleNote =
        discoverTarget && servingBase && discoverTarget !== servingBase
          ? `<p class="studio-serving-note">${this.t("uiScaleServingsNote", { target: discoverTarget, base: servingBase })}</p>`
          : "";
      const img = recipeImage(recipe);
      const stepRows = steps
        .map((step, i) => {
          const section = typeof step === "object" && step ? String(step.title || "") : "";
          const summary = typeof step === "object" && step ? String(step.summary || "") : "";
          const previous = steps[i - 1],
            previousSection =
              typeof previous === "object" && previous ? String(previous.title || "") : "";
          const sectionHeading =
            section && section !== previousSection
              ? `<h4 class="step-section">${esc(section)}</h4>`
              : "";
          const photos = instructionImages(step)
            .map(
              (src) =>
                `<img class="step-photo" src="${esc(src)}" alt="${this.t("uiRecipeStepImageAlt", { step: i + 1 })}" loading="lazy" decoding="async">`,
            )
            .join("");
          return `<div class="recipe-step-row" role="listitem">${sectionHeading}<button class="step ${this._checkedSteps.has(i) ? "active" : ""}" type="button" data-action="step-check" data-value="${i}" aria-pressed="${this._checkedSteps.has(i)}"><span class="step-number">${String(i + 1).padStart(2, "0")}</span><span class="step-copy">${summary ? `<strong class="step-summary">${esc(summary)}</strong>` : ""}<span class="step-text">${esc(instructionText(step))}</span>${photos ? `<span class="step-photos">${photos}</span>` : ""}</span></button></div>`;
        })
        .join("");
      size = "large";
      content = `<div class="modal-hero">${img || icon("utensils", 78)}</div><div class="modal-content"><div class="eyebrow">${esc(this.t("featured"))}</div><h2 class="recipe-title">${esc(recipe.name)}</h2><p class="description">${esc(recipe.description)}</p>
        <div class="recipe-meta"><span class="pill">${icon("clock", 12)} ${esc(AtelierStudio.formatTime(recipe.totalTime, this._language) || "—")}</span><span class="pill">${icon("utensils", 12)} ${esc(scaledYield)}</span></div>
        <div class="toolbar recipe-actions"><button class="btn primary" data-action="cook-start" ${!steps.length ? "disabled" : ""}>${icon("utensils", 16)} ${esc(this.t("cookStart"))}</button>${this._providerActive === "home_assistant" ? "" : `<button class="btn" data-action="nutrition-open">${icon("leaf", 16)} ${esc(this.t("nutrition"))}</button>`}<button class="btn" data-action="journal-open">${icon("book", 16)} ${esc(this.t("journal"))}</button><button class="btn" data-action="print-recipe">${icon("print", 16)} ${this.t("uiPrintPDF")}</button>${this._permissions.can_write ? `<button class="btn" data-action="plan-form" data-value="${dateYmd(new Date())}">${icon("calendar", 16)} ${esc(this.t("addToPlan"))}</button><button class="btn" data-action="recipe-to-list-form">${icon("cart", 16)} ${esc(this.t("shoppingFromRecipe"))}</button>` : ""}${this._permissions.can_manage ? `<button class="btn" data-action="edit-form">${icon("edit", 16)} ${esc(this.t("edit"))}</button>` : ""}</div>
        ${this._journal[recipe.slug]?.note ? `<div class="journal-hint"><span>${esc(this.t("journalNote"))}</span><strong>${esc(this._journal[recipe.slug].note)}</strong></div>` : ""}
        ${
          recipe.nutrition && Object.values(recipe.nutrition).some(Boolean)
            ? `<div class="nutri-current"><span>${esc(this.t("nutrition"))} · Mealie</span>${[
                ["calories", "kcal"],
                ["proteinContent", this.t("uiProtein")],
                ["carbohydrateContent", this.t("uiCarbs")],
                ["fatContent", this.t("uiFat")],
              ]
                .filter(([k]) => recipe.nutrition[k])
                .map(([k, label]) => `<strong>${esc(label)} ${esc(recipe.nutrition[k])}</strong>`)
                .join("")}</div>`
            : ""
        }
        <div class="detail-cols"><div><h3>${esc(this.t("ingredients"))}</h3>${scaleNote}${ingredients.length ? ingredients.map((ing, i) => `<label class="ingredient"><input type="checkbox" data-input="ingredient" data-index="${i}" ${this._checkedIngredients.has(i) ? "checked" : ""}><span>${esc(discoverTarget && servingBase ? AtelierStudio.scaleIngredient(ing, discoverTarget, servingBase) : ingredientName(ing))}</span></label>`).join("") : "—"}</div>
        <div class="detail-instructions"><h3>${esc(this.t("instructions"))}</h3>${steps.length ? `<div class="recipe-steps" role="list">${stepRows}</div>` : "—"}</div></div></div>`;
    }
    if (this._modal === "cook" && this._detail) {
      const steps = asArray(this._detail.recipeInstructions),
        n = steps.length,
        idx = Math.min(this._cookIndex, Math.max(n - 1, 0));
      const current = steps[idx] || {},
        stepTitle = typeof current === "object" && current ? String(current.title || "") : "";
      const stepSummary =
        typeof current === "object" && current ? String(current.summary || "") : "";
      const stepBody = instructionText(current || this.t("done"));
      const stepPhoto = instructionImages(current)[0];
      const cookServings = AtelierStudio.recipeServings(this._detail);
      const cookYield =
        Number(this._detail.recipeServings) > 0
          ? `${cookServings} ${this.tp("uiServing", cookServings)}`
          : this._detail.recipeYieldQuantity && this._detail.recipeYield
            ? `${this._detail.recipeYieldQuantity} ${this._detail.recipeYield}`
            : this._detail.recipeYield || "";
      size = "large";
      content = `<div class="cook-layout"><div class="cook-visual">${recipeImage(this._detail, "cook-visual-image")}<div class="cook-brand">${esc(this._detail.name)}</div></div>
        <div class="cook-content"><div class="cook-topline"><span>${esc(this.t("cooking"))}</span><span>${String(idx + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}</span></div>
        <div class="cook-track" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${idx + 1}"><div class="cook-fill" style="width:${((idx + 1) / Math.max(1, n)) * 100}%"></div></div>
        ${AtelierWakeLock.supported() ? `<label class="cook-wake"><input type="checkbox" data-input="keep-awake" ${this._design.keep_awake !== false ? "checked" : ""}> ${esc(this.t("uiKeepScreenAwake"))}</label>` : ""}
        <div class="cook-stage" data-swipe-hint="${esc(this.t("cookSwipeHint"))}">${stepTitle ? `<p class="cook-step-section">${esc(stepTitle)}</p>` : ""}<h2>${esc(stepSummary || stepBody)}</h2>${stepSummary ? `<p class="cook-step-detail">${esc(stepBody)}</p>` : ""}${stepPhoto ? `<figure class="cook-step-figure"><img class="cook-step-photo" src="${esc(stepPhoto)}" alt="${esc(`${this._detail.name} · ${this.t("uiStep")} ${idx + 1}`)}" decoding="async"></figure>` : ""}<p class="muted">${esc(cookYield)}</p></div>
        <div class="cook-controls"><section class="cook-utility" aria-label="${this.t("uiKitchenTimers")}">
          <header class="cook-timer-header"><span class="cook-timer-mark" aria-hidden="true">${icon("clock", 16)}</span><div><span class="cook-timer-kicker">${this.t("uiATELIERKITCHENTIMER")}</span><strong>${this.t("uiKeepEverythingInRhythm")}</strong></div><span class="cook-timer-count">${this._timers.filter((timer) => !timer.done).length} ${this.t("uiactive")}</span></header>
          <div class="cook-timers" aria-live="off">${
            this._timers.length
              ? this._timers
                  .map((timer) => {
                    const now = Date.now(),
                      remaining = timer.done
                        ? 0
                        : Math.max(0, Math.ceil((timer.deadline - now) / 1000));
                    const duration = Number(timer.durationMs) || 0,
                      progress =
                        timer.startedAt && duration
                          ? Math.min(100, Math.max(0, ((now - timer.startedAt) / duration) * 100))
                          : null;
                    const remainingText = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
                    const context = timer.stepIndex ? `${this.t("uiStep")} ${timer.stepIndex}` : "";
                    const timeLabel = `${timer.label} · ${this.t("uitimeRemaining")}`;
                    const durationLabel = duration
                      ? `${Math.round(duration / 60000)} ${this.t("uiminutes")}`
                      : this.t("uiActiveTimer");
                    return `<article class="cook-timer-card ${timer.done ? "is-done" : ""} ${progress === null ? "is-progress-unknown" : ""}" data-cook-timer="${esc(timer.id)}"><span class="cook-timer-dial" data-timer-ring style="--timer-progress:${progress === null ? 0 : progress.toFixed(2)}%"><span><time role="timer" data-timer-remaining="${esc(timer.id)}" aria-label="${esc(timeLabel)}">${remainingText}</time></span></span><span class="cook-timer-copy"><span class="cook-timer-status">${timer.done ? this.t("uiREADY") : this.t("uiRUNNING")}</span><strong>${esc(timer.label)}</strong><small>${durationLabel}${context ? ` · ${esc(context)}` : ""}</small></span><button class="icon-btn" data-action="timer-remove" data-value="${esc(timer.id)}" aria-label="${esc(this.t("timerRemove"))}">${icon("close", 16)}</button></article>`;
                  })
                  .join("")
              : `<div class="cook-timers-empty"><span aria-hidden="true">${icon("spark", 15)}</span><span>${this.t("uiNoTimerRunningYetSetOneToKeepEverythingInRhythm")}</span></div>`
          }</div>
          <div class="cook-timer-compose"><div class="cook-timer-presets" role="group" aria-label="${this.t("uiQuickTimerPresets")}">${[5, 10, 15].map((minutes) => `<button type="button" data-action="timer-preset" data-value="${minutes}">${minutes} ${this.t("uimin")}</button>`).join("")}</div><div class="cook-timer-fields"><label><span>${this.t("uiMinutes")}</span><input type="number" data-timer-minutes min="1" max="180" value="10" inputmode="numeric" aria-label="${this.t("uiTimerDurationInMinutes")}"></label><label><span>${this.t("uiLabelOptional")}</span><input type="text" data-timer-label maxlength="40" placeholder="${this.t("uieGOven")}"></label><button class="btn primary cook-timer-start" data-action="timer-start">${icon("clock", 16)} ${this.t("uiStartTimer")}</button></div></div>
        </section>
        ${this._journal[this._detail.slug]?.note ? `<div class="cook-note">${icon("book", 14)} ${esc(this._journal[this._detail.slug].note)}</div>` : ""}
        <div class="cook-actions"><button class="btn" data-action="cook-back" ${idx <= 0 ? "disabled" : ""}>${icon("chevron", 15)} ${esc(this.t("back"))}</button><button class="btn primary" data-action="${idx >= n - 1 ? "cook-finish" : "cook-next"}">${esc(this.t(idx >= n - 1 ? "done" : "next"))} ${icon("arrow", 15)}</button></div>
        <p class="cook-footnote">${this.t("uiOneStepAtATimeYouCanAlwaysReturnToTheFullRecipe")}</p></div>
        </div></div>`;
    }
    if (this._modal === "plan") {
      const d = this._planDay || dateYmd(new Date());
      const all = asArray(this._data.mealplan).filter((m) => m.date === d);
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${this.t("dialogWeeklyMenu")}</div><h2>${esc(this.t("planNow"))}</h2><p>${this.t("uiPlanMealsQuicklyWithoutClutter")}</p></div><div class="editor-stamp">${icon("calendar", 26)}</div></div>
        <section class="editor-card"><div class="eyebrow">01 / ${this.t("dialogYourMenu")}</div><form class="editor-form" data-form="plan">
          <div class="editor-columns"><label class="field"><span>${esc(this.t("day"))}</span><input type="date" name="date" value="${esc(d)}" required></label>
          <label class="field"><span>${esc(this.t("mealType"))}</span><select name="meal_type"><option value="dinner">${esc(this.t("dinner"))}</option><option value="lunch">${esc(this.t("lunch"))}</option><option value="breakfast">${esc(this.t("breakfast"))}</option></select></label></div>
          ${this._pickerMarkup()}
          <div class="form-actions"><button class="btn primary" type="submit" data-picker="submit" ${!this._picker?.selected ? "disabled" : ""}>${icon("plus", 14)} ${esc(this.t("addToPlan"))}</button></div>
        </form></section>
        ${all.length ? `<section class="editor-card"><div class="eyebrow">02 / ${this.t("dialogPlanned")}</div><h3>${esc(this.t("nextMeal"))}</h3>${all.map((e) => `<div class="shopping-row"><div class="shopping-name">${esc(mealName(e))}</div><button class="btn tiny" data-action="remove-meal" data-value="${esc(e.id)}" ${String(e.id).startsWith("pending-") ? 'disabled aria-disabled="true"' : ""} aria-label="${esc(String(e.id).startsWith("pending-") ? this.t("uiSaving") : this.t("close"))}">${icon("close", 14)}</button></div>`).join("")}</section>` : ""}</div>`;
    }
    if (this._modal === "create")
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${this.t("dialogNewRecipe")}</div><h2>${esc(this.t("create"))}</h2><p>${this.t("uiStartWithARecipeTitleAddDetailsAfterCreating")}</p></div><div class="editor-stamp">${icon("plus", 27)}</div></div>
      <section class="editor-card"><div class="eyebrow">01 / ${this.t("dialogRecipeTitle")}</div><form class="editor-form" data-form="create"><label class="field"><span>${esc(this.t("name"))} *</span><input name="name" required maxlength="120" data-autofocus placeholder="${this.t("uieGLemonPastaWithSpinach")}"></label><div class="form-actions"><button type="submit" class="btn primary">${icon("plus", 14)} ${esc(this.t("create"))}</button></div></form></section></div>`;
    if (this._modal === "import")
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("importKicker"))}</div><h2>${esc(this.t("import"))}</h2><p>${this.t("uiPasteARecipeLinkMealieHandlesImportingIt")}</p></div><div class="editor-stamp">${icon("external", 27)}</div></div>
      <section class="editor-card"><div class="eyebrow">01 / ${this.t("dialogSource")}</div><form class="editor-form" data-form="import"><label class="field"><span>${esc(this.t("url"))}</span><input type="url" name="url" required maxlength="2000" placeholder="https://…"></label><p class="editor-sub">${esc(this.t("importTip"))}</p><div class="form-actions"><button type="submit" class="btn primary">${icon("arrow", 14)} ${esc(this.t("import"))}</button></div></form></section></div>`;
    if (this._modal === "edit" && this._detail) {
      const rec = this._detail;
      const instructions = asArray(rec.recipeInstructions);
      size = "large";
      content = `<div class="modal-content atelier-editor">
        <div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${this.t("dialogRecipeStudio")}</div><h2>${this.t("uiEditRecipe")}</h2><p class="editor-context">${esc(rec.name)}</p>
        <p>${this.t("uiDetailsIngredientsAndInstructionsInOneClearWorkflow")}</p></div>
        <div class="editor-stamp">${icon("edit", 28)}</div></div>
        <form data-form="edit" class="editor-form">
        ${this._editorPhotoSection()}
        <section class="editor-card"><div class="eyebrow">01 / ${this.t("dialogBasics")}</div><h3>${esc(this.t("name"))} & ${esc(this.t("description"))}</h3><p class="editor-sub">${this.t("uiYourRecipeTitleSummaryAndServingSize")}</p>
          <label class="field"><span>${esc(this.t("name"))} *</span><input name="name" required maxlength="120" value="${esc(rec.name)}" placeholder="${esc(this.t("name"))}"></label>
          <div class="editor-columns"><label class="field"><span>${esc(this.t("description"))}</span><textarea name="description" rows="3" maxlength="2000" placeholder="${this.t("uiWhatMakesThisSpecial")}">${esc(rec.description)}</textarea></label>
          <label class="field"><span>${esc(this.t("servingsNumber"))}</span><input type="number" min="1" max="100" step="1" name="servings" value="${Math.max(1, Number(rec.recipeServings) || 2)}" required><span>${this.t("uiShownInRecipesAndPrint")}</span></label></div></section>
        ${this._editorIngredientsSection()}
        <section class="editor-card"><div class="eyebrow">03 / ${this.t("dialogStepByStep")}</div><h3>${esc(this.t("instructions"))}</h3>
          <p class="editor-sub">${this.t("uiEditAddAndReorderStepsReplacementMustBeExplicitlyEnabled")}</p>
          <label class="editor-check"><input type="checkbox" name="replace_instructions"> ${this.t("uiReplaceCookingInstructions")}</label>
          <div class="editor-steps" data-steps-editor>${(instructions.length ? instructions : [{ text: "" }]).map((step, i) => this._stepEditRow(instructionText(step), i, step?.id || "")).join("")}</div>
          <button type="button" class="editor-add-step" data-action="step-add">+ ${this.t("uiAddAStep")}</button>
          <p class="editing-hint">${this.t("uiStepsAreReplacedOnSaveIfTheCheckboxIsSelected")}</p></section>
        ${this._editorHistorySection()}
        <section class="editor-card editor-card--steps"><div class="editor-footer"><small>${this.t("uiChangesAreSentToMealieOnlyWhenYouSave")}</small>
          <button type="submit" class="btn primary">${icon("check", 14)} ${esc(this.t("save"))}</button></div></section>
        </form></div>`;
    }
    if (this._modal === "create-list")
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("shoppingKicker"))}</div><h2>${esc(this.t("createList"))}</h2><p>${this.t("uiGiveYourShoppingListAName")}</p></div><div class="editor-stamp">${icon("cart", 27)}</div></div>
      <section class="editor-card"><div class="eyebrow">01 / ${esc(this.t("listName"))}</div><form class="editor-form" data-form="create-list"><label class="field"><span>${esc(this.t("listName"))} *</span><input name="name" maxlength="100" required data-autofocus placeholder="${this.t("uieGWeeklyGroceries")}"></label><div class="form-actions"><button type="submit" class="btn primary">${icon("plus", 14)} ${esc(this.t("createList"))}</button></div></form></section></div>`;
    if (this._modal === "recipe-to-list" && this._detail) {
      const lists = asArray(this._data.shopping?.lists);
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("shoppingKicker"))}</div><h2>${esc(this.t("shoppingFromRecipe"))}</h2><p>${esc(this.t("addFromRecipeTip"))}</p></div><div class="editor-stamp">${icon("cart", 27)}</div></div>
      <section class="editor-card"><div class="eyebrow">01 / ${this.t("shopping")}</div><form class="editor-form" data-form="recipe-to-list">
      ${lists.length ? `<label class="field"><span>${esc(this.t("selectList"))}</span><select name="list_id" required>${lists.map((l) => `<option value="${esc(l.id)}" ${String(l.id) === this._activeList ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></label>` : `<p class="notice">${esc(this.t("addListFirst"))}</p>`}
      <div class="form-actions"><button type="button" class="btn" data-action="create-list-form">${icon("plus", 14)} ${esc(this.t("createList"))}</button>${lists.length ? `<button type="submit" class="btn primary">${icon("cart", 14)} ${esc(this.t("shoppingAddRecipe"))}</button>` : ""}</div></form></section></div>`;
    }
    if (this._modal === "print") {
      const d = this._design;
      const name =
        this._printKind === "recipe"
          ? this._detail?.name
          : this._printKind === "shopping"
            ? this.t("shopping")
            : this.t("mealplan");
      const paperIngredients =
        this._printKind === "recipe"
          ? asArray(this._detail?.recipeIngredient).map(ingredientName)
          : this._printKind === "shopping"
            ? asArray(this._data.shopping?.items)
                .filter((x) => String(x.shoppingListId) === String(this._activeList))
                .map((x) => x.display || x.note || x.food?.name || "")
            : Array.from({ length: 7 }, (_, i) =>
                dayString(this._locale, addDays(this._weekStart, i), {
                  weekday: "short",
                  day: "numeric",
                }),
              );
      const paperMethod =
        this._printKind === "recipe"
          ? asArray(this._detail?.recipeInstructions).map(instructionText)
          : this._printKind === "shopping"
            ? ["", ""]
            : asArray(this._data.mealplan).map(mealName);
      size = "large";
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / PRINT STUDIO</div>
      <h2>${esc(this.t("uiPrintHeroTitle"))}</h2><p>${esc(this.t("uiPrintHeroDescription"))}</p></div><div class="editor-stamp">${icon("print", 27)}</div></div>
      <div class="print-setup"><div><div class="eyebrow">01 / ${esc(this.t("uiPrintStyle"))}</div>
      ${[
        ["editorial", this.t("uiPrintEditorial"), this.t("uiPrintEditorialDescription")],
        ["compact", this.t("uiPrintCompact"), this.t("uiPrintCompactDescription")],
        ["minimal", this.t("uiPrintInkSaver"), this.t("uiPrintInkSaverDescription")],
      ]
        .map(
          ([v, title, description]) =>
            `<button type="button" data-action="print-style" data-value="${v}" aria-pressed="${d.print_style === v ? "true" : "false"}" class="print-option ${d.print_style === v ? "active" : ""}"><div class="print-symbol">${v === "editorial" ? "Aa" : v === "compact" ? "≡" : "○"}</div><div><strong>${esc(title)}</strong><span>${esc(description)}</span></div></button>`,
        )
        .join("")}
      <div class="eyebrow print-detail-heading">02 / ${esc(this.t("uiPrintDetails"))}</div>
      ${this._printKind === "recipe" ? `<label class="editor-check"><input type="checkbox" data-input="print-image" ${d.print_image ? "checked" : ""}> ${esc(this.t("uiPrintIncludePhoto"))}</label>` : ""}
      ${this._printKind === "recipe" ? `<label class="editor-check"><input type="checkbox" data-input="print-nutrition" ${d.print_nutrition === true ? "checked" : ""}> ${esc(this.t("uiPrintIncludeNutrition"))}</label>` : ""}
      ${this._printKind === "shopping" ? `<label class="editor-check"><input type="checkbox" data-input="print-completed" ${d.print_completed ? "checked" : ""}> ${esc(this.t("uiPrintIncludeCompleted"))}</label>` : ""}
      ${this._printKind !== "mealplan" ? `<label class="editor-check"><input type="checkbox" data-input="print-checkboxes" ${d.print_checkboxes !== false ? "checked" : ""}> ${esc(this.t("uiPrintIncludeCheckboxes"))}</label>` : ""}
      <label class="editor-check"><input type="checkbox" data-input="print-notes" ${d.print_notes !== false ? "checked" : ""}> ${esc(this.t("uiPrintIncludeNotes"))}</label>
      <button class="btn primary print-submit" type="button" data-action="print-now">${icon("print", 17)} ${esc(this.t("uiPrintOpenPreview"))}</button>
      <p class="print-guide">${esc(this.t("uiPrintGuide"))}</p></div>
      <div><div class="eyebrow">${esc(this.t("uiPrintPaperPreview"))}</div><div class="print-paper ${this._printKind === "mealplan" ? "landscape" : ""}"><div class="paper-kicker">MEALIE / ATELIER</div>
        <h3>${esc(name || this.t("uiYourRecipe"))}</h3><p>${esc(this.t("uiPrintPreviewDescription"))}</p><div class="paper-line"></div><div class="paper-cols">
          <div class="paper-col"><div class="paper-label">${esc(this.t("uiPrintIngredientsItems"))}</div>${
            paperIngredients
              .slice(0, 7)
              .map((x) => `<div class="paper-preview-row">${esc(x)}</div>`)
              .join("") || '<div class="paper-preview-row">–</div>'
          }</div>
          <div class="paper-col"><div class="paper-label">${esc(this.t("uiPrintPreparationNotes"))}</div>${
            paperMethod
              .slice(0, 5)
              .map(
                (x, i) =>
                  `<div class="paper-preview-row"><b>${i + 1}.</b> ${esc(String(x).slice(0, 110))}</div>`,
              )
              .join("") || '<div class="paper-preview-row">–</div>'
          }</div></div>
          <div class="paper-foot">${esc(this.t("uiPrintDesignedForPaper"))}</div></div></div></div></div>`;
    }
    if (this._modal === "settings") {
      const d = this._design;
      const theme = d.theme === "light" ? "light" : "dark";
      content = `<div class="modal-content"><div class="eyebrow">ATELIER DESIGN SYSTEM</div><h2 class="settings-title">${esc(this.t("settings"))}</h2>
        <div class="settings-group"><h3>${esc(this.t("theme"))}</h3><div class="range"><button class="range-option" data-action="design" data-field="theme" data-value="dark" aria-pressed="${theme === "dark" ? "true" : "false"}">${icon("moon", 14)} ${esc(this.t("dark"))}</button><button class="range-option" data-action="design" data-field="theme" data-value="light" aria-pressed="${theme === "light" ? "true" : "false"}">${icon("sun", 14)} ${esc(this.t("light"))}</button></div></div>
        <div class="settings-group"><h3>${esc(this.t("accent"))}</h3><div class="swatches">${COLORS.map((color) => `<button class="swatch ${d.accent === color ? "chosen" : ""}" style="background:${color}" data-action="design" data-field="accent" data-value="${color}" title="${esc(this.t(COLOR_NAMES[color]))}" aria-label="${esc(`${this.t("accent")}: ${this.t(COLOR_NAMES[color])}`)}" aria-pressed="${d.accent === color ? "true" : "false"}"></button>`).join("")}</div></div>
        <div class="settings-group"><h3>${esc(this.t("density"))}</h3><div class="range"><button class="range-option" data-action="design" data-field="density" data-value="compact" aria-pressed="${d.density === "compact" ? "true" : "false"}">${esc(this.t("compact"))}</button><button class="range-option" data-action="design" data-field="density" data-value="comfortable" aria-pressed="${d.density === "comfortable" ? "true" : "false"}">${esc(this.t("comfortable"))}</button></div></div>
        <div class="settings-group"><label class="field"><span>${esc(this.t("columns"))}</span><select data-input="columns"><option value="2" ${Number(d.columns) === 2 ? "selected" : ""}>2</option><option value="3" ${Number(d.columns) === 3 ? "selected" : ""}>3</option><option value="4" ${Number(d.columns) === 4 ? "selected" : ""}>4</option></select></label></div>
        <div class="settings-group"><label class="field"><span>${esc(this.t("language"))}</span><select data-input="language" aria-label="${esc(this.t("language"))}"><option value="auto" ${(d.language || "auto") === "auto" ? "selected" : ""}>${esc(this.t("languageAuto"))}</option>${Object.keys(
          LABELS,
        )
          .map(
            (locale) =>
              `<option value="${esc(locale)}" ${d.language === locale ? "selected" : ""}>${esc(LABELS[locale].languageName || locale)}</option>`,
          )
          .join("")}</select></label></div>
        <div class="settings-group"><h3>${this.t("uiMotionTransitions")}</h3><p class="settings-hint">${this.t("uiThoughtfulMotionThatHelpsNavigationYourReducedMotionDeviceSettingAlwaysTakesPriority")}</p><div class="range">${[
          ["expressive", this.t("uiExpressive")],
          ["balanced", this.t("uiSubtle")],
          ["off", this.t("uiOff")],
        ]
          .map(
            ([v, label]) =>
              `<button class="range-option" data-action="design" data-field="motion" data-value="${v}" aria-pressed="${d.motion === v ? "true" : "false"}">${label}</button>`,
          )
          .join("")}</div></div>
        <div class="settings-group"><h3>${this.t("uiPhotoCrop")}</h3><div class="range">${[
          ["portrait", this.t("uiTall")],
          ["square", this.t("uiSquare")],
          ["landscape", this.t("uiWide")],
        ]
          .map(
            ([v, label]) =>
              `<button class="range-option" data-action="design" data-field="photo_ratio" data-value="${v}" aria-pressed="${d.photo_ratio === v ? "true" : "false"}">${label}</button>`,
          )
          .join("")}</div></div>
        <div class="settings-group"><h3>${this.t("uiCornerStyle")}</h3><div class="range">${[
          ["large", this.t("uiRound")],
          ["small", this.t("uiSoft")],
          ["square", this.t("uiSquareEckig")],
        ]
          .map(
            ([v, label]) =>
              `<button class="range-option" data-action="design" data-field="radius" data-value="${v}" aria-pressed="${(d.radius || "large") === v ? "true" : "false"}">${label}</button>`,
          )
          .join("")}</div></div>
        <div class="settings-group"><label class="field"><span><input type="checkbox" data-input="show-images" ${d.show_images !== false ? "checked" : ""}> ${esc(this.t("pictures"))}</span></label></div>
        <div class="settings-group"><h3>${esc(this.t("editorPrintStudio"))}</h3><p class="settings-hint">${this.t("uiSeparateA4LayoutsForRecipesShoppingAndYourWeeklyPlan")}</p><button class="btn" data-action="print-settings">${icon("print", 14)} ${this.t("uiOpenPrintSettings")}</button></div>
        <div class="settings-group support-group"><h3>${this.t("uiEnjoyingTheAtelier")}</h3><p class="settings-hint">${this.t("uiIfItMakesYourKitchenRoutineBetterYouCanOptionallySupportItsDevelopmentOnKoFi")}</p><a class="btn support-link" href="https://ko-fi.com/allesautomatisch" target="_blank" rel="noopener noreferrer">${icon("spark", 14)} ${this.t("uiSayThanksOnKoFi")} <span aria-hidden="true">↗</span></a></div>
        <p class="settings-hint">${esc(this.t("configured"))}</p><div class="form-actions"><button class="btn" data-action="reset-design">${esc(this.t("resetDesign"))}</button></div><div class="form-actions"><button class="btn primary" data-action="close-modal">${esc(this.t("done"))}</button></div></div>`;
    }
    const dialogTitles = {
      command: this.t("uiQuickActions"),
      nutrition: this.t("nutrition"),
      journal: this.t("journal"),
      recipe: this._detail?.name || this.t("recipes"),
      cook: this.t("cooking"),
      plan: this.t("mealplan"),
      create: this.t("create"),
      import: this.t("import"),
      edit: this.t("edit"),
      "create-list": this.t("createList"),
      "recipe-to-list": this.t("shoppingFromRecipe"),
      print: this.t("uiPrintStudioSettings"),
      settings: this.t("settings"),
    };
    return `<div class="modal-backdrop" data-action="backdrop"><div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(dialogTitles[this._modal] || this.t("settings"))}">${closing}${content}</div></div>`;
  },
}

/**
 * Structured recipe editor: ingredient rows with food and unit search, servings preview, version history
 * with restore, and cover and step photo uploads. Every section repaints only its own container so
 * unsaved edits in the rest of the dialog (name, description, steps) survive.
 */
const EDITOR_FRACTIONS = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};
const EDITOR_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const EDITOR_KIND_KEYS = {
  ingredients: "editorKindIngredients",
  basics: "editorKindBasics",
  instructions: "editorKindInstructions",
  image: "editorKindImage",
  step_image: "editorKindStepImage",
  restore: "editorKindRestore",
};
const EDITOR_UPLOAD_MAX = 10 * 1024 * 1024;
const EDITOR_UPLOAD_CHUNK = 256 * 1024;

const recipeEditorMethods = {
  /* ---------- pure helpers ---------- */
  /** Parse "1,5", "1.5", "1 1/2", "½", "1½". Empty input is a valid "no quantity". */
  _editorParseQuantity(input) {
    let text = String(input ?? "")
      .trim()
      .replace(/\s+/g, " ");
    if (!text) return { ok: true, value: null };
    text = text.replace(
      /(\d)?\s?([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g,
      (match, digit, glyph) => `${digit ? `${digit} ` : ""}${EDITOR_FRACTIONS[glyph]}`,
    );
    let value = NaN;
    let m;
    if (/^\d+(?:[.,]\d+)?$/.test(text)) value = Number(text.replace(",", "."));
    else if ((m = text.match(/^(\d+) (\d+)\/(\d+)$/)) && Number(m[3]) > 0)
      value = Number(m[1]) + Number(m[2]) / Number(m[3]);
    else if ((m = text.match(/^(\d+)\/(\d+)$/)) && Number(m[2]) > 0)
      value = Number(m[1]) / Number(m[2]);
    if (!Number.isFinite(value) || value < 0 || value > 1000000) return { ok: false, value: null };
    return { ok: true, value: Math.round(value * 1000000) / 1000000 };
  },
  _editorFormatQuantity(value) {
    if (value === null || value === undefined) return "";
    const text = String(Math.round(Number(value) * 10000) / 10000);
    return this._language === "de" ? text.replace(".", ",") : text;
  },
  _editorSniff(head) {
    if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
    if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => head[i] === byte))
      return "image/png";
    const tag = (from, to) => String.fromCharCode(...Array.from(head.slice(from, to)));
    if (head.length >= 12 && tag(0, 4) === "RIFF" && tag(8, 12) === "WEBP") return "image/webp";
    return "";
  },
  _editorBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  },
  _editorFileName(url) {
    const last = String(url || "")
      .split("?")[0]
      .split("/")
      .pop();
    try {
      const name = decodeURIComponent(last);
      return EDITOR_FILE_NAME.test(name) ? name : "";
    } catch {
      return "";
    }
  },
  _editorTime(iso, short = false) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(
      this._locale,
      short ? { hour: "2-digit", minute: "2-digit" } : { dateStyle: "medium", timeStyle: "short" },
    ).format(date);
  },
  _editorCoded(code, message = "") {
    return Object.assign(new Error(message || code), { code });
  },

  /* ---------- state ---------- */
  _editorBlank(slug) {
    return {
      slug,
      loading: false,
      loadError: "",
      error: "",
      notice: "",
      recipeId: "",
      hash: "",
      servings: 1,
      preview: 1,
      rows: [],
      base: [],
      counter: 0,
      summaryOpen: false,
      saving: false,
      conflict: false,
      combo: null,
      comboSeq: 0,
      comboTimer: null,
      history: { open: false, loading: false, items: null, error: "", confirm: "" },
      lastBackup: null,
      photoConfirm: false,
      stepConfirm: null,
      upload: null,
      pick: null,
    };
  },
  _editorOpen() {
    clearTimeout(this._ed?.comboTimer);
    this._ed = this._editorBlank(this._detail?.slug || "");
    if (this._permissions.can_edit_ingredients) this._editorLoad();
  },
  _editorRowFromServer(row) {
    return {
      key: this._ed.counter++,
      reference_id: row.reference_id || null,
      quantityText: this._editorFormatQuantity(row.quantity),
      quantityError: false,
      textError: false,
      unit: row.unit || null,
      unitText: row.unit?.name || "",
      food: row.food || null,
      foodText: row.food?.name || "",
      note: row.note || "",
      original_text: row.original_text || "",
      title: row.title || "",
    };
  },
  _editorSignature(row) {
    return JSON.stringify([
      this._editorParseQuantity(row.quantityText).value,
      row.unit?.id || null,
      row.food?.id || null,
      row.note,
    ]);
  },
  async _editorLoad() {
    const state = this._ed;
    if (!state) return;
    state.loading = true;
    state.loadError = "";
    this._editorPaintIngredients();
    try {
      const preview = await this._ws("ingredients_get", { slug: state.slug });
      if (this._ed !== state) return;
      state.recipeId = preview.recipe_id || "";
      state.hash = preview.expected_hash;
      state.servings = Number(preview.servings) >= 1 ? Number(preview.servings) : 1;
      state.preview = state.servings;
      state.rows = asArray(preview.rows).map((row) => this._editorRowFromServer(row));
      state.base = state.rows.map((row) => ({
        id: row.reference_id,
        signature: this._editorSignature(row),
      }));
      state.summaryOpen = false;
      state.conflict = false;
      state.combo = null;
    } catch (error) {
      if (this._ed !== state) return;
      state.loadError = this._errorText(error);
    }
    state.loading = false;
    this._editorPaintIngredients();
  },
  /** Rows in the shape of the `ingredients_save` request, or the index of the first invalid row. */
  _editorRequestRows() {
    const rows = [];
    let invalid = -1;
    this._ed.rows.forEach((row, index) => {
      const quantity = this._editorParseQuantity(row.quantityText);
      row.quantityError = !quantity.ok;
      row.textError = !row.food && !row.note.trim() && !row.original_text.trim();
      if ((row.quantityError || row.textError) && invalid < 0) invalid = index;
      rows.push({
        reference_id: row.reference_id || null,
        quantity: quantity.value,
        unit_id: row.unit?.id || null,
        food_id: row.food?.id || null,
        note: row.note,
        original_text: row.original_text,
        ...(row.title ? { title: row.title } : {}),
      });
    });
    return { rows, invalid };
  },
  /** Counts of changed, added and removed rows against what the server sent. */
  _editorDiff() {
    const state = this._ed;
    const known = new Map(state.base.map((entry, rank) => [entry.id, { ...entry, rank }]));
    let changed = 0;
    let added = 0;
    let kept = 0;
    const seen = new Set();
    for (const row of state.rows) {
      const old = row.reference_id ? known.get(row.reference_id) : null;
      if (!old) {
        added++;
        continue;
      }
      seen.add(row.reference_id);
      if (old.signature !== this._editorSignature(row)) changed++;
      kept++;
    }
    const order = state.rows.filter((row) => seen.has(row.reference_id));
    const ranks = order.map((row) => known.get(row.reference_id).rank);
    const moved = ranks.some((rank, i) => i > 0 && rank < ranks[i - 1]);
    if (moved && changed === 0) changed = kept ? 1 : 0;
    return { changed, added, removed: state.base.length - seen.size };
  },
  /** Scaled quantity text for the read-only servings preview; never part of the request. */
  _editorScaled(row) {
    const state = this._ed;
    const value = this._editorParseQuantity(row.quantityText).value;
    if (value === null || !(state.servings >= 1) || state.preview === state.servings) return "";
    return AtelierStudio.scaleIngredient(`${value} x`, state.preview, state.servings).replace(
      /\s+x$/,
      "",
    );
  },

  /* ---------- markup ---------- */
  _editorPhotoSection() {
    return `<section class="editor-card ed-card"><div class="eyebrow">00 / ${esc(this.t("editorPhoto"))}</div><h3>${esc(this.t("editorPhoto"))}</h3>
      <div data-editor-photo>${this._editorPhotoHtml()}</div>
      <input type="file" hidden tabindex="-1" data-ed-file accept="image/jpeg,image/png,image/webp"></section>`;
  },
  _editorPhotoHtml() {
    const state = this._ed;
    const image = recipeImage(this._detail, "ed-cover");
    const busy = Boolean(state?.upload);
    const limit = Math.round(
      (this._permissions.limits.upload_max_bytes || EDITOR_UPLOAD_MAX) / 1048576,
    );
    return `<div class="ed-photo">${image ? `<div class="ed-cover-frame">${image}</div>` : `<p class="editing-hint">${esc(this.t("editorPhotoNone"))}</p>`}
      <div class="ed-actions"><button type="button" class="btn" data-action="ed-photo-pick" ${busy ? "disabled" : ""}>${icon("edit", 15)} ${esc(this.t("editorPhotoReplace"))}</button>${
        image
          ? `<button type="button" class="btn" data-action="ed-photo-remove-ask" ${busy ? "disabled" : ""}>${icon("close", 15)} ${esc(this.t("editorPhotoRemove"))}</button>`
          : ""
      }</div>
      <p class="editor-sub">${esc(this.t("editorPhotoHint", { size: limit }))}</p>
      ${
        state?.photoConfirm
          ? `<div class="ed-confirm" role="alertdialog" aria-label="${esc(this.t("editorPhotoRemove"))}"><p>${esc(this.t("editorPhotoRemoveConfirm"))}</p><div class="ed-actions"><button type="button" class="btn primary" data-action="ed-photo-remove-do">${esc(this.t("editorPhotoRemoveNow"))}</button><button type="button" class="btn" data-action="ed-photo-remove-cancel">${esc(this.t("editorCancel"))}</button></div></div>`
          : ""
      }
      ${state?.upload?.target === "cover" ? this._editorProgressHtml() : ""}</div>`;
  },
  _editorProgressHtml() {
    const percent = this._ed?.upload?.percent || 0;
    return `<div class="ed-progress" data-ed-progress><div class="ed-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${esc(this.t("editorUploadProgress", { percent }))}"><span class="ed-progress-bar"></span></div><span class="ed-progress-text" aria-hidden="true">${percent}%</span><button type="button" class="btn tiny" data-action="ed-upload-cancel">${esc(this.t("editorUploadCancel"))}</button></div>`;
  },
  _editorIngredientsSection() {
    const readonly = asArray(this._detail?.recipeIngredient).map(ingredientName);
    return `<section class="editor-card ed-card"><div class="eyebrow">02 / ${esc(this.t("ingredients"))}</div><h3>${esc(this.t("ingredients"))}</h3>
      <div data-editor-ingredients>${
        this._permissions.can_edit_ingredients
          ? this._editorIngredientsHtml()
          : `<div class="editor-readonly">${readonly.length ? readonly.map((x) => `<span>• ${esc(x)}</span>`).join("") : "<span>—</span>"}</div><p class="editing-hint">${esc(this.t("editorIngredientsLocked"))}</p>`
      }</div></section>`;
  },
  _editorIngredientsHtml() {
    const state = this._ed;
    if (!state || state.loading)
      return `<p class="editor-sub" role="status">${esc(this.t("editorLoading"))}</p>`;
    if (state.loadError)
      return `<div class="notice error" role="alert"><span>${esc(state.loadError)}</span><button type="button" class="btn tiny" data-action="ed-retry">${esc(this.t("retry"))}</button></div>`;
    const diff = this._editorDiff();
    return `<div class="ed-toolbar"><label class="ed-servings"><span data-ed-servings-label>${esc(this.tp("editorServingsPreview", state.preview))}</span>
        <input type="number" inputmode="numeric" min="1" max="100" step="1" value="${state.preview}" data-ed-input="servings" aria-label="${esc(this.tp("editorServingsPreview", state.preview))}"></label>
        <button type="button" class="btn tiny" data-action="ed-servings-reset">${esc(this.t("editorServingsReset"))}</button>
        <span class="editor-sub" data-ed-servings-note ${state.preview === state.servings ? "hidden" : ""}>${esc(this.t("editorServingsNote"))}</span></div>
      <div class="ed-rows" role="list">${state.rows.map((row, i) => this._editorRowHtml(row, i)).join("")}</div>
      <button type="button" class="editor-add-step" data-action="ed-add">+ ${esc(this.t("editorAddIngredient"))}</button>
      <p class="ed-live" role="status" aria-live="polite" data-ed-live>${esc(state.notice)}</p>
      ${state.error ? `<div class="notice error" role="alert"><span>${esc(state.error)}</span></div>` : ""}
      ${
        state.conflict
          ? `<div class="ed-confirm" role="alertdialog" aria-label="${esc(this.t("editorReload"))}"><p>${esc(this.t("editorReloadChanged"))}</p><div class="ed-actions"><button type="button" class="btn primary" data-action="ed-reload">${esc(this.t("editorReload"))}</button></div></div>`
          : ""
      }
      ${
        state.summaryOpen
          ? `<div class="ed-confirm" role="group" aria-label="${esc(this.t("editorConfirmSave"))}"><p>${esc(this.t("editorSaveSummary", diff))}</p><div class="ed-actions"><button type="button" class="btn primary" data-action="ed-save" ${state.saving ? "disabled" : ""}>${icon("check", 14)} ${esc(this.t("editorConfirmSave"))}</button><button type="button" class="btn" data-action="ed-review-cancel">${esc(this.t("editorCancel"))}</button></div></div>`
          : `<div class="ed-actions"><button type="button" class="btn primary" data-action="ed-review">${icon("check", 14)} ${esc(this.t("editorSaveIngredients"))}</button></div>`
      }`;
  },
  _editorRowHtml(row, i) {
    const n = i + 1;
    const label = (key) => esc(`${this.t(key)} · ${this.t("editorRow", { row: n })}`);
    const last = this._ed.rows.length - 1;
    const scaled = this._editorScaled(row);
    const invalid = row.quantityError || row.textError;
    return `<div class="ed-row" role="listitem" data-ed-row="${i}">
      <span class="ed-num" aria-hidden="true">${n}</span>
      <div class="ed-fields">
        <label class="ed-cell ed-qty"><span>${esc(this.t("editorQuantity"))}</span>
          <input data-ed-input="quantity" data-ed-row="${i}" inputmode="decimal" autocomplete="off" maxlength="14" value="${esc(row.quantityText)}" aria-label="${label("editorQuantity")}" aria-invalid="${row.quantityError}" aria-describedby="ed-error-${i}"></label>
        ${this._editorComboHtml("unit", row, i, label("editorUnit"))}
        ${this._editorComboHtml("food", row, i, label("editorFood"))}
        <label class="ed-cell ed-note"><span>${esc(this.t("editorNote"))}</span>
          <input data-ed-input="note" data-ed-row="${i}" maxlength="300" autocomplete="off" value="${esc(row.note)}" aria-label="${label("editorNote")}"></label>
      </div>
      ${row.original_text ? `<p class="ed-original"><span>${esc(this.t("editorOriginal"))}:</span> ${esc(row.original_text)}</p>` : ""}
      <p class="ed-scaled" data-ed-scaled="${i}" ${scaled ? "" : "hidden"}><span>${esc(this.t("editorScaled"))}:</span> <strong>${esc(scaled)}</strong></p>
      <div class="ed-row-actions">
        <button type="button" class="btn tiny ed-icon" data-action="ed-up" data-ed-row="${i}" aria-label="${esc(this.t("editorMoveUp", { row: n }))}" title="${esc(this.t("editorMoveUp", { row: n }))}" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="btn tiny ed-icon" data-action="ed-down" data-ed-row="${i}" aria-label="${esc(this.t("editorMoveDown", { row: n }))}" title="${esc(this.t("editorMoveDown", { row: n }))}" ${i === last ? "disabled" : ""}>↓</button>
        <button type="button" class="btn tiny ed-icon" data-action="ed-remove" data-ed-row="${i}" aria-label="${esc(this.t("editorRemoveRow", { row: n }))}" title="${esc(this.t("editorRemoveRow", { row: n }))}" ${this._ed.rows.length <= 1 ? "disabled" : ""}>×</button>
      </div>
      <p class="ed-error" id="ed-error-${i}" data-ed-error="${i}" role="alert" ${invalid ? "" : "hidden"}>${esc(row.quantityError ? this.t("editorQuantityInvalid") : row.textError ? this.t("editorRowNeedsText") : "")}</p>
    </div>`;
  },
  _editorComboHtml(field, row, i, label) {
    return `<div class="ed-cell ed-combo" data-ed-combo="${field}" data-ed-row="${i}"><span>${esc(this.t(field === "unit" ? "editorUnit" : "editorFood"))}</span>
      ${this._editorComboMarkup({
        id: `ed-${field}-${i}`,
        label,
        value: row[`${field}Text`],
        attrs: `data-ed-input="${field}" data-ed-row="${i}"`,
        listClass: "ed-list",
        listId: `ed-list-${field}-${i}`,
      })}</div>`;
  },
  _editorComboOptions() {
    const combo = this._ed?.combo;
    if (!combo) return [];
    const options = combo.items.map((item) => ({ type: "item", item }));
    if (combo.canCreate) options.push({ type: "create" });
    return options;
  },
  _editorOptionsHtml() {
    const combo = this._ed.combo;
    const options = this._editorComboOptions();
    const rows = options.map((option, j) => {
      const active = j === combo.active;
      const text =
        option.type === "create"
          ? this.t("editorCreateOption", { text: combo.text })
          : `${option.item.name}${combo.field === "unit" && option.item.abbreviation ? ` (${option.item.abbreviation})` : ""}`;
      return `<li role="option" tabindex="-1" class="ed-option${active ? " is-active" : ""}" id="ed-opt-${combo.field}-${combo.row}-${j}" aria-selected="${active}" data-action="ed-pick" data-value="${j}">${esc(text)}</li>`;
    });
    if (combo.loading)
      rows.push(
        `<li role="presentation" class="ed-option-note">${esc(this.t("editorComboSearching"))}</li>`,
      );
    else if (!options.length)
      rows.push(
        `<li role="presentation" class="ed-option-note">${esc(this.t("editorComboEmpty"))}</li>`,
      );
    return rows.join("");
  },
  _editorHistorySection() {
    return `<section class="editor-card ed-card"><div class="eyebrow">04 / ${esc(this.t("editorHistory"))}</div><h3>${esc(this.t("editorHistory"))}</h3>
      <div data-editor-history>${this._editorHistoryHtml()}</div></section>`;
  },
  _editorHistoryHtml() {
    const history = this._ed?.history;
    if (!history) return "";
    const undo = this._ed.lastBackup
      ? `<button type="button" class="btn" data-action="ed-undo">${icon("refresh", 15)} ${esc(this.t("editorUndo"))}</button>`
      : "";
    const toggle = `<button type="button" class="btn" data-action="ed-history" aria-expanded="${history.open}">${icon("book", 15)} ${esc(this.t(history.open ? "editorHistoryHide" : "editorHistory"))}</button>`;
    let list = "";
    if (history.open) {
      if (history.loading)
        list = `<p class="editor-sub" role="status">${esc(this.t("editorHistoryLoading"))}</p>`;
      else if (history.error)
        list = `<div class="notice error" role="alert"><span>${esc(history.error)}</span></div>`;
      else if (!asArray(history.items).length)
        list = `<p class="editor-sub">${esc(this.t("editorHistoryEmpty"))}</p>`;
      else
        list = `<ul class="ed-history">${history.items
          .map((item) => {
            const time = this._editorTime(item.created_at);
            const confirm =
              history.confirm === item.backup_id
                ? `<div class="ed-confirm" role="alertdialog" aria-label="${esc(this.t("editorRestoreNow"))}"><p>${esc(this.t("editorRestoreConfirm", { time }))}</p><div class="ed-actions"><button type="button" class="btn primary" data-action="ed-restore-do" data-value="${esc(item.backup_id)}">${esc(this.t("editorRestoreNow"))}</button><button type="button" class="btn" data-action="ed-restore-cancel">${esc(this.t("editorCancel"))}</button></div></div>`
                : "";
            return `<li class="ed-history-item"><div class="ed-history-copy"><strong>${esc(time)}</strong><span>${esc(item.user_name || "")} · ${esc(this.t(EDITOR_KIND_KEYS[item.kind] || "editorKindBasics"))}</span><small>${esc(item.summary || "")}</small></div><button type="button" class="btn tiny" data-action="ed-restore-ask" data-value="${esc(item.backup_id)}" aria-label="${esc(`${this.t("editorRestore")} · ${time}`)}">${esc(this.t("editorRestore"))}</button>${confirm}</li>`;
          })
          .join("")}</ul>`;
    }
    return `<div class="ed-actions">${toggle}${undo}</div>${list}`;
  },
  /** Photo controls inside one step row of the steps editor. */
  _editorStepPhotos(id) {
    if (!this._permissions.can_admin) return "";
    return `<div class="ed-step-photos" data-ed-step-photos="${esc(id)}">${this._editorStepPhotosInner(id)}</div>`;
  },
  _editorStepPhotosInner(id) {
    if (!id) return `<p class="editor-sub">${esc(this.t("editorStepPhotoSaveFirst"))}</p>`;
    const steps = asArray(this._detail?.recipeInstructions);
    const index = steps.findIndex((step) => step?.id === id);
    const n = index + 1;
    const state = this._ed;
    const busy = Boolean(state?.upload);
    const photos = instructionImages(steps[index])
      .map((src) => ({ src, file: this._editorFileName(src) }))
      .filter((photo) => photo.file);
    const thumbs = photos
      .map((photo) => {
        const asking = state?.stepConfirm?.id === id && state.stepConfirm.file === photo.file;
        const actions = asking
          ? `<div class="ed-confirm" role="alertdialog" aria-label="${esc(this.t("editorStepPhotoRemove"))}"><p>${esc(this.t("editorStepPhotoKeptInMealie"))}</p><div class="ed-actions"><button type="button" class="btn tiny primary" data-action="ed-step-remove-do" data-value="${esc(id)}" data-ed-file-name="${esc(photo.file)}">${esc(this.t("editorStepPhotoRemove"))}</button><button type="button" class="btn tiny" data-action="ed-step-remove-cancel">${esc(this.t("editorCancel"))}</button></div></div>`
          : `<div class="ed-actions"><button type="button" class="btn tiny" data-action="ed-step-pick" data-value="${esc(id)}" data-ed-file-name="${esc(photo.file)}" aria-label="${esc(`${this.t("editorStepPhotoReplace")} · ${this.t("editorStepPhotoAlt", { step: n })}`)}" ${busy ? "disabled" : ""}>${esc(this.t("editorStepPhotoReplace"))}</button><button type="button" class="btn tiny" data-action="ed-step-remove-ask" data-value="${esc(id)}" data-ed-file-name="${esc(photo.file)}" aria-label="${esc(`${this.t("editorStepPhotoRemove")} · ${this.t("editorStepPhotoAlt", { step: n })}`)}" ${busy ? "disabled" : ""}>${esc(this.t("editorStepPhotoRemove"))}</button></div>`;
        return `<figure class="ed-thumb"><img src="${esc(photo.src)}" alt="${esc(this.t("editorStepPhotoAlt", { step: n }))}" loading="lazy" decoding="async"><figcaption>${actions}</figcaption></figure>`;
      })
      .join("");
    return `${thumbs ? `<div class="ed-thumbs">${thumbs}</div>` : ""}<div class="ed-actions"><button type="button" class="btn tiny" data-action="ed-step-pick" data-value="${esc(id)}" aria-label="${esc(`${this.t("editorStepPhotoAdd")} · ${this.t("editorStepPhotoAlt", { step: n })}`)}" ${busy ? "disabled" : ""}>+ ${esc(this.t("editorStepPhotoAdd"))}</button></div>${state?.upload?.target === id ? this._editorProgressHtml() : ""}`;
  },

  /* ---------- painting ---------- */
  _editorPaint(selector, html, focusSelector = "") {
    const target = this.shadowRoot.querySelector(selector);
    if (!target) return false;
    target.innerHTML = html;
    if (focusSelector) this.shadowRoot.querySelector(focusSelector)?.focus?.();
    return true;
  },
  _editorPaintIngredients(focusSelector = "") {
    if (this._modal !== "edit") return;
    this._editorPaint("[data-editor-ingredients]", this._editorIngredientsHtml(), focusSelector);
  },
  _editorPaintPhoto() {
    this._editorPaint("[data-editor-photo]", this._editorPhotoHtml());
  },
  _editorPaintHistory(focusSelector = "") {
    this._editorPaint("[data-editor-history]", this._editorHistoryHtml(), focusSelector);
  },
  _editorPaintSteps() {
    for (const box of this.shadowRoot.querySelectorAll("[data-ed-step-photos]")) {
      const id = box.dataset.edStepPhotos;
      if (id) box.innerHTML = this._editorStepPhotosInner(id);
    }
  },
  _editorPaintCombo() {
    const combo = this._ed?.combo;
    for (const box of this.shadowRoot.querySelectorAll("[data-ed-combo]")) {
      const open = Boolean(
        combo && combo.field === box.dataset.edCombo && String(combo.row) === box.dataset.edRow,
      );
      this._editorComboPaint({
        root: box,
        open,
        html: open ? this._editorOptionsHtml() : "",
        active: open ? combo.active : -1,
        optionPrefix: open ? `ed-opt-${combo.field}-${combo.row}-` : "",
      });
    }
  },
  _editorPaintProgress() {
    const upload = this._ed?.upload;
    const bar = this.shadowRoot.querySelector("[data-ed-progress]");
    if (!upload) return;
    if (!bar) {
      if (upload.target === "cover") this._editorPaintPhoto();
      else this._editorPaintSteps();
    }
    const fresh = this.shadowRoot.querySelector("[data-ed-progress]");
    if (!fresh) return;
    const track = fresh.querySelector("[role=progressbar]");
    track.setAttribute("aria-valuenow", String(upload.percent));
    track.setAttribute("aria-label", this.t("editorUploadProgress", { percent: upload.percent }));
    track
      .querySelector(".ed-progress-bar")
      .style.setProperty("--ed-progress", `${upload.percent}%`);
    fresh.querySelector(".ed-progress-text").textContent = `${upload.percent}%`;
  },
  _editorAnnounce(text) {
    if (this._ed) this._ed.notice = text;
    const live = this.shadowRoot.querySelector("[data-ed-live]");
    if (live) live.textContent = text;
  },
  /** Toast without a full render, so unsaved edits in the dialog stay untouched. */
  _editorToast(text, kind = "status") {
    this._toast = String(text || "").slice(0, 500);
    this._toastKind = kind;
    const root = this.shadowRoot.querySelector(".atelier");
    if (root) {
      root.querySelector(".toast")?.remove();
      const template = document.createElement("template");
      template.innerHTML = `<div class="toast${kind === "error" ? " toast-error" : ""}" role="${kind === "error" ? "alert" : "status"}" aria-live="${kind === "error" ? "assertive" : "polite"}">${icon(kind === "error" ? "bolt" : "check", 15)} ${esc(this._toast)}</div>`;
      root.appendChild(template.content.firstElementChild);
    }
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(
      () => {
        this._toast = "";
        this.shadowRoot.querySelector(".toast")?.remove();
      },
      kind === "error" ? 6500 : 3800,
    );
  },

  /* ---------- events ---------- */
  /** Returns true when the key press belonged to the editor. */
  _editorKeyDown(event) {
    const field = event.target?.dataset?.edInput;
    if (!field || !this._ed) return false;
    if (event.key === "Enter") {
      event.preventDefault();
      if (this._ed.combo && this._ed.combo.active >= 0) this._editorChoose(this._ed.combo.active);
      return true;
    }
    if (field !== "unit" && field !== "food") return false;
    const combo = this._ed.combo;
    const row = Number(event.target.dataset.edRow);
    const mine = Boolean(combo && combo.field === field && combo.row === row);
    if (!mine) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return false;
      event.preventDefault();
      this._editorComboOpen(field, row, event.target.value);
      return true;
    }
    const nav = {
      id: `ed-${field}-${row}`,
      open: true,
      active: combo.active,
      items: this._editorComboOptions(),
      hasMore: false,
      loading: combo.loading,
    };
    const handled = this._comboboxKeydown(event, nav);
    if (nav.open) combo.active = nav.active;
    else this._ed.combo = null;
    this._editorPaintCombo();
    return handled;
  },
  _editorInput(event) {
    const el = event.target;
    const field = el?.dataset?.edInput;
    const state = this._ed;
    if (!field || !state) return false;
    const i = Number(el.dataset.edRow);
    const row = state.rows[i];
    if (field === "servings") {
      state.preview = Math.max(1, Math.min(100, Math.round(Number(el.value)) || state.servings));
      this._editorUpdateScaled();
      return true;
    }
    if (!row) return true;
    if (field === "quantity") {
      row.quantityText = el.value;
      row.quantityError = !this._editorParseQuantity(el.value).ok;
      const error = this.shadowRoot.querySelector(`[data-ed-error="${i}"]`);
      el.setAttribute("aria-invalid", String(row.quantityError));
      if (error) {
        error.hidden = !row.quantityError && !row.textError;
        error.textContent = row.quantityError ? this.t("editorQuantityInvalid") : "";
      }
      this._editorUpdateScaled();
    } else if (field === "note") {
      row.note = el.value;
    } else if (field === "unit" || field === "food") {
      row[`${field}Text`] = el.value;
      if (!el.value.trim()) row[field] = null;
      clearTimeout(state.comboTimer);
      state.comboTimer = setTimeout(() => this._editorComboOpen(field, i, el.value), 250);
    }
    return true;
  },
  _editorUpdateScaled() {
    const state = this._ed;
    state.rows.forEach((row, i) => {
      const box = this.shadowRoot.querySelector(`[data-ed-scaled="${i}"]`);
      if (!box) return;
      const scaled = this._editorScaled(row);
      box.hidden = !scaled;
      const strong = box.querySelector("strong");
      if (strong) strong.textContent = scaled;
    });
    const note = this.shadowRoot.querySelector("[data-ed-servings-note]");
    if (note) note.hidden = state.preview === state.servings;
    const label = this.tp("editorServingsPreview", state.preview);
    const text = this.shadowRoot.querySelector("[data-ed-servings-label]");
    if (text) text.textContent = label;
    this.shadowRoot.querySelector('[data-ed-input="servings"]')?.setAttribute("aria-label", label);
  },
  /** Fired for `change` and `focusout`: reconcile combobox text and close lists that lost focus. */
  _editorFocusEvent(event) {
    const state = this._ed;
    const el = event.target;
    if (!state || this._modal !== "edit") return;
    if (event.type === "change" && el?.matches?.("[data-ed-file]")) {
      const file = el.files?.[0];
      el.value = "";
      if (file) this._editorUploadFlow(file);
      return;
    }
    if (
      event.type === "change" &&
      el?.dataset?.edInput &&
      ["unit", "food"].includes(el.dataset.edInput)
    ) {
      const field = el.dataset.edInput;
      const row = state.rows[Number(el.dataset.edRow)];
      if (row && el.value !== (row[field]?.name || "")) {
        row[`${field}Text`] = row[field]?.name || "";
        el.value = row[`${field}Text`];
      }
      return;
    }
    if (event.type === "focusout" && state.combo) {
      const box = el?.closest?.("[data-ed-combo]");
      const next = event.relatedTarget;
      if (box && !box.contains?.(next)) {
        clearTimeout(state.comboTimer);
        state.combo = null;
        this._editorPaintCombo();
      }
    }
  },
  async _editorClick(el) {
    const action = el.dataset.action;
    const state = this._ed;
    if (!state) return;
    const i = Number(el.dataset.edRow);
    const rows = state.rows;
    const focusRow = (selector) => this._editorPaintIngredients(selector);
    if (action !== "ed-pick" && state.combo) {
      state.combo = null;
      this._editorPaintCombo();
    }
    switch (action) {
      case "ed-retry":
        await this._editorLoad();
        break;
      case "ed-add":
        if (rows.length >= 100) break;
        rows.push(
          this._editorRowFromServer({ reference_id: null, quantity: null, unit: null, food: null }),
        );
        state.summaryOpen = false;
        focusRow(`[data-ed-input="quantity"][data-ed-row="${rows.length - 1}"]`);
        break;
      case "ed-up":
      case "ed-down": {
        const to = action === "ed-up" ? i - 1 : i + 1;
        if (!rows[i] || !rows[to]) break;
        [rows[i], rows[to]] = [rows[to], rows[i]];
        state.summaryOpen = false;
        // Keep the focus on the same direction unless that button is now disabled at the edge.
        const edge = action === "ed-up" ? to === 0 : to === rows.length - 1;
        const keep = edge ? (action === "ed-up" ? "ed-down" : "ed-up") : action;
        focusRow(`[data-action="${keep}"][data-ed-row="${to}"]`);
        break;
      }
      case "ed-remove":
        if (rows.length <= 1 || !rows[i]) break;
        rows.splice(i, 1);
        state.summaryOpen = false;
        focusRow(`[data-action="ed-remove"][data-ed-row="${Math.min(i, rows.length - 1)}"]`);
        break;
      case "ed-pick":
        await this._editorChoose(Number(el.dataset.value));
        break;
      case "ed-servings-reset":
        state.preview = state.servings;
        focusRow('[data-ed-input="servings"]');
        break;
      case "ed-review": {
        const { invalid } = this._editorRequestRows();
        state.error = "";
        if (invalid >= 0) {
          focusRow(
            `[data-ed-input="${rows[invalid].quantityError ? "quantity" : "note"}"][data-ed-row="${invalid}"]`,
          );
          break;
        }
        const diff = this._editorDiff();
        if (!diff.changed && !diff.added && !diff.removed) {
          this._editorAnnounce(this.t("editorNoChanges"));
          break;
        }
        state.summaryOpen = true;
        focusRow('[data-action="ed-save"]');
        break;
      }
      case "ed-review-cancel":
        state.summaryOpen = false;
        focusRow('[data-action="ed-review"]');
        break;
      case "ed-save":
        await this._editorSave();
        break;
      case "ed-reload":
        await this._editorReloadFresh();
        break;
      case "ed-history":
        await this._editorToggleHistory();
        break;
      case "ed-undo":
        await this._editorUndoAsk();
        break;
      case "ed-restore-ask":
        state.history.confirm = el.dataset.value || "";
        this._editorPaintHistory('[data-action="ed-restore-do"]');
        break;
      case "ed-restore-cancel":
        state.history.confirm = "";
        this._editorPaintHistory('[data-action="ed-history"]');
        break;
      case "ed-restore-do":
        await this._editorRestore(el.dataset.value || "");
        break;
      case "ed-photo-pick":
      case "ed-step-pick":
        this._editorPick(
          action === "ed-photo-pick"
            ? { target: "cover" }
            : { target: el.dataset.value, replace: el.dataset.edFileName || "" },
        );
        break;
      case "ed-photo-remove-ask":
        state.photoConfirm = true;
        this._editorPaint(
          "[data-editor-photo]",
          this._editorPhotoHtml(),
          '[data-action="ed-photo-remove-do"]',
        );
        break;
      case "ed-photo-remove-cancel":
        state.photoConfirm = false;
        this._editorPaint(
          "[data-editor-photo]",
          this._editorPhotoHtml(),
          '[data-action="ed-photo-remove-ask"]',
        );
        break;
      case "ed-photo-remove-do":
        await this._editorCoverRemove();
        break;
      case "ed-step-remove-ask":
        state.stepConfirm = { id: el.dataset.value || "", file: el.dataset.edFileName || "" };
        this._editorPaintSteps();
        this.shadowRoot.querySelector('[data-action="ed-step-remove-do"]')?.focus?.();
        break;
      case "ed-step-remove-cancel":
        state.stepConfirm = null;
        this._editorPaintSteps();
        break;
      case "ed-step-remove-do":
        await this._editorStepRemove(el.dataset.value || "", el.dataset.edFileName || "");
        break;
      case "ed-upload-cancel":
        if (state.upload) state.upload.cancelled = true;
        break;
    }
  },

  /* ---------- comboboxes ---------- */
  _editorComboOpen(field, row, text) {
    const state = this._ed;
    if (!state || this._modal !== "edit") return;
    const query = String(text || "").trim();
    state.combo = {
      field,
      row,
      text: query,
      items: [],
      active: -1,
      loading: true,
      canCreate: false,
    };
    const seq = ++state.comboSeq;
    this._editorPaintCombo();
    this._ws(field === "unit" ? "units" : "foods", { search: query, per_page: 8 })
      .then((result) => {
        const combo = state.combo;
        if (this._ed !== state || seq !== state.comboSeq || !combo) return;
        combo.items = asArray(result?.items);
        combo.loading = false;
        const exact = combo.items.some(
          (item) => String(item.name).toLowerCase() === query.toLowerCase(),
        );
        combo.canCreate = Boolean(query) && !exact && this._permissions.can_admin;
        this._editorPaintCombo();
      })
      .catch((error) => {
        if (this._ed !== state || seq !== state.comboSeq) return;
        state.combo = null;
        state.error = this._errorText(error);
        this._editorPaintCombo();
        this._editorPaintIngredients();
      });
  },
  async _editorChoose(index) {
    const state = this._ed;
    const combo = state?.combo;
    const option = this._editorComboOptions()[index];
    const row = combo ? state.rows[combo.row] : null;
    if (!option || !row) return;
    const { field } = combo;
    let item = option.item;
    let existing = false;
    if (option.type === "create") {
      try {
        const made = await this._ws(field === "unit" ? "unit_create" : "food_create", {
          name: combo.text,
        });
        item = { id: made.id, name: made.name, abbreviation: made.abbreviation || "" };
        existing = made.existing === true;
      } catch (error) {
        state.combo = null;
        state.error = this._errorText(error);
        this._editorPaintCombo();
        this._editorPaintIngredients();
        return;
      }
    }
    row[field] =
      field === "unit"
        ? { id: item.id, name: item.name, abbreviation: item.abbreviation || "" }
        : { id: item.id, name: item.name };
    row[`${field}Text`] = item.name;
    row.textError = false;
    state.combo = null;
    state.error = "";
    const input = this.shadowRoot.querySelector(
      `[data-ed-input="${field}"][data-ed-row="${state.rows.indexOf(row)}"]`,
    );
    if (input) {
      input.value = item.name;
      input.focus?.();
    }
    this._editorPaintCombo();
    if (existing) this._editorAnnounce(this.t("editorCreatedExisting"));
  },

  /* ---------- ingredient save ---------- */
  async _editorSave() {
    const state = this._ed;
    if (!state || state.saving) return;
    const { rows, invalid } = this._editorRequestRows();
    if (invalid >= 0) {
      state.summaryOpen = false;
      this._editorPaintIngredients();
      return;
    }
    state.saving = true;
    state.error = "";
    this._editorPaintIngredients();
    try {
      const result = await this._ws("ingredients_save", {
        slug: state.slug,
        expected_hash: state.hash,
        rows,
      });
      if (result?.recipe) this._detail = result.recipe;
      this._data.recipes = null;
      state.lastBackup = { id: result?.backup_id || "" };
      state.saving = false;
      await this._editorLoad();
      this._editorRefreshHistory();
      this._editorToast(
        this.t("editorSavedWithBackup", { time: this._editorTime(new Date().toISOString(), true) }),
      );
    } catch (error) {
      state.saving = false;
      state.summaryOpen = false;
      if (error?.code === "recipe_changed") state.conflict = true;
      else state.error = this._errorText(error);
      this._editorPaintIngredients();
    }
  },
  async _editorReloadFresh() {
    const state = this._ed;
    try {
      this._detail = await this._ws("recipe", { slug: state.slug });
    } catch {}
    await this._editorLoad();
    this._editorPaintPhoto();
    this._editorPaintSteps();
  },

  /* ---------- history and restore ---------- */
  async _editorToggleHistory() {
    const history = this._ed.history;
    history.open = !history.open;
    history.confirm = "";
    if (history.open) await this._editorLoadHistory();
    else this._editorPaintHistory('[data-action="ed-history"]');
  },
  async _editorLoadHistory() {
    const state = this._ed;
    const history = state.history;
    history.loading = true;
    history.error = "";
    this._editorPaintHistory();
    try {
      history.items = asArray((await this._ws("recipe_backups", { slug: state.slug }))?.backups);
    } catch (error) {
      history.error = this._errorText(error);
    }
    history.loading = false;
    this._editorPaintHistory();
  },
  /** A change just created a backup: reload the list when it is open, otherwise drop the stale copy. */
  _editorRefreshHistory() {
    const history = this._ed.history;
    history.confirm = "";
    if (history.open) this._editorLoadHistory();
    else {
      history.items = null;
      this._editorPaintHistory();
    }
  },
  async _editorUndoAsk() {
    const state = this._ed;
    const history = state.history;
    history.open = true;
    await this._editorLoadHistory();
    const id = state.lastBackup?.id;
    if (id && asArray(history.items).some((item) => item.backup_id === id)) {
      history.confirm = id;
      this._editorPaintHistory('[data-action="ed-restore-do"]');
    }
  },
  async _editorRestore(backupId) {
    const state = this._ed;
    if (!backupId || state.history.busy) return;
    state.history.busy = true;
    try {
      const result = await this._ws("recipe_restore", { slug: state.slug, backup_id: backupId });
      const slug = state.slug;
      if (result?.recipe) this._detail = result.recipe;
      this._data.recipes = null;
      this._editorOpen();
      this._ed.slug = slug;
      this._ed.lastBackup = { id: result?.backup_id || "" };
      this._render();
      this._editorToast(
        this.t("editorRestoredWithBackup", {
          time: this._editorTime(new Date().toISOString(), true),
        }),
      );
    } catch (error) {
      state.history.busy = false;
      state.history.confirm = "";
      state.history.error = this._errorText(error);
      this._editorPaintHistory();
    }
  },

  /* ---------- photos ---------- */
  _editorPick(target) {
    const state = this._ed;
    if (!state || state.upload) return;
    state.pick = target;
    const input = this.shadowRoot.querySelector("[data-ed-file]");
    input?.click?.();
  },
  _editorUploadMessage(error) {
    const limits = this._permissions.limits;
    const size = Math.round((limits.upload_max_bytes || EDITOR_UPLOAD_MAX) / 1048576);
    switch (error?.code) {
      case "client_too_large":
        return this.t("editorUploadTooLarge", { size });
      case "client_wrong_type":
        return this.t("editorUploadWrongType");
      case "client_cancelled":
        return this.t("editorUploadCancelled");
      case "client_insecure":
        return this.t("editorUploadNeedsSecure");
      default:
        return this._errorText(error);
    }
  },
  /** Check the file, hash it and send it in sequential chunks. Resolves with the upload id. */
  async _editorSendFile(file, purpose) {
    const state = this._ed;
    const limits = this._permissions.limits;
    const max = Number(limits.upload_max_bytes) || EDITOR_UPLOAD_MAX;
    if (!(file.size <= max)) throw this._editorCoded("client_too_large");
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const mime = this._editorSniff(head);
    if (!mime || file.size < 100) throw this._editorCoded("client_wrong_type");
    if (!globalThis.crypto?.subtle) throw this._editorCoded("client_insecure");
    const data = await file.arrayBuffer();
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", data));
    const sha256 = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const begun = await this._ws("upload_begin", {
      slug: state.slug,
      purpose,
      size: file.size,
      mime,
      sha256,
    });
    const step = Math.max(
      1,
      Math.min(
        Number(begun.chunk_bytes) || EDITOR_UPLOAD_CHUNK,
        Number(limits.upload_chunk_bytes) || EDITOR_UPLOAD_CHUNK,
      ),
    );
    const count = Math.ceil(file.size / step);
    for (let index = 0; index < count; index++) {
      if (state.upload?.cancelled) throw this._editorCoded("client_cancelled");
      const payload = {
        upload_id: begun.upload_id,
        index,
        data: this._editorBase64(new Uint8Array(data.slice(index * step, (index + 1) * step))),
      };
      try {
        await this._ws("upload_chunk", payload);
      } catch (error) {
        if (error?.code === "upload_expired" || state.upload?.cancelled) throw error;
        await this._ws("upload_chunk", payload); // one retry per chunk
      }
      if (state.upload) {
        state.upload.percent = Math.round(((index + 1) / count) * 100);
        this._editorPaintProgress();
      }
    }
    // A cancel that arrives while the last chunk is in flight must stop before the target command.
    if (state.upload?.cancelled) throw this._editorCoded("client_cancelled");
    return begun.upload_id;
  },
  /** Upload, then run `command(uploadId)`. An expired session restarts from the beginning once. */
  async _editorWithUpload(file, purpose, command) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await command(await this._editorSendFile(file, purpose));
      } catch (error) {
        if (error?.code !== "upload_expired" || attempt > 0 || this._ed?.upload?.cancelled)
          throw error;
        if (this._ed.upload) this._ed.upload.percent = 0;
      }
    }
  },
  async _editorUploadFlow(file) {
    const state = this._ed;
    const pick = state?.pick;
    if (!state || !pick || state.upload) return;
    state.pick = null;
    const cover = pick.target === "cover";
    const steps = asArray(this._detail?.recipeInstructions);
    const index = cover ? -1 : steps.findIndex((step) => step?.id === pick.target);
    if (!cover && index < 0) return;
    state.upload = { target: cover ? "cover" : pick.target, percent: 0, cancelled: false };
    if (cover) this._editorPaintPhoto();
    else this._editorPaintSteps();
    this._editorPaintProgress();
    try {
      const result = await this._editorWithUpload(file, cover ? "cover" : "step", (uploadId) =>
        cover
          ? this._ws("recipe_image_set", {
              slug: state.slug,
              upload_id: uploadId,
              expected_image: String(this._detail?.image ?? ""),
            })
          : this._ws("step_image_add", {
              slug: state.slug,
              step_index: index,
              step_id: steps[index].id,
              upload_id: uploadId,
              ...(pick.replace ? { replace_file_name: pick.replace } : {}),
            }),
      );
      this._editorAfterPhoto(result, state);
    } catch (error) {
      state.upload = null;
      this._editorPaintPhoto();
      this._editorPaintSteps();
      this._editorToast(
        this._editorUploadMessage(error),
        error?.code === "client_cancelled" ? "status" : "error",
      );
      if (error?.code === "recipe_changed") await this._editorReloadFresh();
    }
  },
  _editorAfterPhoto(result, state) {
    if (result?.recipe) this._detail = result.recipe;
    this._data.recipes = null;
    state.upload = null;
    state.photoConfirm = false;
    state.stepConfirm = null;
    state.lastBackup = { id: result?.backup_id || "" };
    this._editorPaintPhoto();
    this._editorPaintSteps();
    this._editorRefreshHistory();
    this._editorToast(
      this.t("editorSavedWithBackup", { time: this._editorTime(new Date().toISOString(), true) }),
    );
  },
  async _editorCoverRemove() {
    const state = this._ed;
    try {
      const result = await this._ws("recipe_image_delete", {
        slug: state.slug,
        expected_image: String(this._detail?.image ?? ""),
      });
      this._editorAfterPhoto(result, state);
    } catch (error) {
      state.photoConfirm = false;
      this._editorPaintPhoto();
      this._editorToast(this._errorText(error), "error");
      if (error?.code === "recipe_changed") await this._editorReloadFresh();
    }
  },
  async _editorStepRemove(id, file) {
    const state = this._ed;
    const steps = asArray(this._detail?.recipeInstructions);
    const index = steps.findIndex((step) => step?.id === id);
    if (index < 0 || !file) return;
    try {
      const result = await this._ws("step_image_remove", {
        slug: state.slug,
        step_index: index,
        step_id: id,
        file_name: file,
      });
      this._editorAfterPhoto(result, state);
    } catch (error) {
      state.stepConfirm = null;
      this._editorPaintSteps();
      this._editorToast(this._errorText(error), "error");
      if (error?.code === "step_not_found") await this._editorReloadFresh();
    }
  },

  // Editor rows render their options on demand inside the grid, so markup and painting are the
  // editor's own; the keyboard model is the shared one from the recipe picker (contract D.2).
  /** Combobox input plus its listbox. `attrs` is appended to the input, ids derive from `id`. */
  _editorComboMarkup({
    id,
    label,
    value = "",
    placeholder = "",
    attrs = "",
    listClass = "",
    listId,
  }) {
    const list = listId || `${id}-list`;
    return `<input role="combobox" id="${esc(id)}" aria-autocomplete="list" aria-expanded="false" aria-haspopup="listbox" aria-controls="${esc(list)}" ${attrs} autocomplete="off" maxlength="120" value="${esc(value)}" ${placeholder ? `placeholder="${esc(placeholder)}"` : ""} aria-label="${esc(label)}">
      <ul${listClass ? ` class="${esc(listClass)}"` : ""} role="listbox" id="${esc(list)}" hidden aria-label="${esc(label)}"></ul>`;
  },
  /** Paints one combobox: `state = {root, open, html, active, optionPrefix}`. */
  _editorComboPaint(state) {
    const input = state.root.querySelector("input");
    const list = state.root.querySelector("ul");
    list.hidden = !state.open;
    list.innerHTML = state.open ? state.html : "";
    input.setAttribute("aria-expanded", String(state.open));
    if (state.open && state.active >= 0) {
      input.setAttribute("aria-activedescendant", `${state.optionPrefix}${state.active}`);
      list.querySelector(".is-active")?.scrollIntoView?.({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  },
}

/** Smart Shopping Sync: status panel, setup wizard and review list for the Mealie Atelier Bridge. */
const shoppingSyncMethods = {
  // Sync state lives on one object so closing the modals can drop it in a single place.
  _syncData() {
    if (!this._sync)
      this._sync = {
        state: null,
        raw: "",
        requested: false,
        loading: false,
        loadFailed: false,
        view: "status",
        busy: false,
        error: "",
        result: "",
        confirmDelete: "",
        review: null,
        setup: null,
      };
    return this._sync;
  },
  _syncEntry() {
    const entries = asArray(this._status?.entries);
    return entries.find((x) => x.entry_id === this._config.entry_id) || entries[0] || {};
  },
  _syncCaps() {
    const entry = this._syncEntry();
    const grants = entry.permissions || {};
    const native = this._providerActive === "home_assistant";
    return {
      supported: !native && entry.features?.shopping_sync === true,
      standalone: !native && entry.features?.shopping_sync === false,
      write: (grants.can_write ?? entry.can_write) === true,
      admin: (grants.can_admin ?? entry.can_manage) === true,
    };
  },
  _syncRules() {
    return asArray(this._syncData().state?.rules);
  },
  _syncIssues(rule) {
    const c = rule?.counts || {};
    return (
      (c.failed || 0) +
      (c.needs_reconciliation || 0) +
      (c.changed_after_send || 0) +
      (c.removed_after_send || 0)
    );
  },
  _syncIssueCount() {
    return this._syncRules().reduce((sum, rule) => sum + this._syncIssues(rule), 0);
  },
  _syncWaiting(rule) {
    const c = rule?.counts || {};
    return (c.pending || 0) + (c.sending || 0);
  },
  _syncEntryButton() {
    const caps = this._syncCaps();
    if (!caps.supported && !caps.standalone) return "";
    const issues = caps.supported ? this._syncIssueCount() : 0;
    const badge = issues
      ? `<span class="sync-badge">${icon("bolt", 12)} ${esc(this.t("syncBadgeIssues", { count: issues }))}</span>`
      : "";
    return `<button class="btn tiny sync-open" data-action="sync-open" aria-haspopup="dialog">${icon("cart", 14)} ${esc(this.t("syncOpen"))}${badge}</button>`;
  },
  _syncRelative(iso) {
    const at = Date.parse(iso);
    if (!Number.isFinite(at)) return "";
    const seconds = Math.round((at - Date.now()) / 1000);
    const format = new Intl.RelativeTimeFormat(this._locale, { numeric: "auto" });
    for (const [unit, size] of [
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
    ])
      if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
    return format.format(seconds, "second");
  },
  // Partial, failed and unclear results must never read as a success.
  _syncOutcomeText(outcome, counts = {}) {
    const keys = {
      sent: "syncOutcomeSent",
      partial: "syncOutcomePartial",
      failed: "syncOutcomeFailed",
      destination_unavailable: "syncOutcomeDestinationUnavailable",
      source_unavailable: "syncOutcomeSourceUnavailable",
      nothing_to_send: "syncOutcomeNothing",
      reconciled: "syncOutcomeReconciled",
    };
    if (outcome === "sent" && (counts.needs_reconciliation || 0) > 0)
      return this.t("syncOutcomePartial");
    return this.t(keys[outcome] || "syncOutcomeUnknown");
  },
  _syncOutcomeIcon(outcome, counts = {}) {
    const good = ["sent", "nothing_to_send", "reconciled"].includes(outcome);
    return good && !(counts.needs_reconciliation > 0) ? icon("check", 15) : icon("bolt", 15);
  },
  _syncResultText(result) {
    if (result?.queued) return this.t("syncRunQueued");
    return this.t("syncRunResult", {
      result: this._syncOutcomeText(result?.outcome, {
        needs_reconciliation: result?.needs_reconciliation,
      }),
      sent: result?.sent ?? 0,
      skipped: (result?.skipped_duplicates ?? 0) + (result?.merged ?? 0),
      failed: (result?.failed ?? 0) + (result?.needs_reconciliation ?? 0),
      left: result?.pending_left ?? 0,
    });
  },

  async _syncLoad({ quiet = false } = {}) {
    const sync = this._syncData();
    if (sync.loading) return;
    sync.loading = true;
    sync.requested = true;
    try {
      const state = await this._ws("sync_state");
      const raw = JSON.stringify(state || {});
      const changed = raw !== sync.raw || sync.loadFailed;
      sync.loading = false;
      sync.loadFailed = false;
      if (changed) {
        sync.raw = raw;
        sync.state = state;
        this._render();
      }
    } catch (err) {
      const repeated = sync.loadFailed;
      sync.loading = false;
      sync.loadFailed = true;
      if (!quiet) sync.error = this._errorText(err);
      if (!quiet || !repeated) this._render();
    }
  },

  // One timer at most: 10 s while the status modal is open, 60 s on the visible Shopping view.
  _syncPollInterval() {
    const caps = this._syncCaps();
    if (!caps.supported || !this.isConnected) return 0;
    if (this._modal === "sync") return 10000;
    if (!this._modal && this._view === "shopping" && this._syncRules().length) return 60000;
    return 0;
  },
  _syncPollSchedule() {
    const wanted = this._syncPollInterval();
    if (wanted === (this._syncPollMs || 0)) return;
    this._syncPollStop();
    if (!wanted) return;
    this._syncPollMs = wanted;
    this._syncTimer = setInterval(() => this._syncPollTick(), wanted);
  },
  _syncPollStop() {
    if (this._syncTimer) clearInterval(this._syncTimer);
    this._syncTimer = null;
    this._syncPollMs = 0;
  },
  async _syncPollTick() {
    if (document.visibilityState !== "visible" || !this._syncPollMs) return;
    await this._syncLoad({ quiet: true });
  },
  // Runs after every render: loads the status lazily, keeps the timer in line and resets closed views.
  _syncAfterRender() {
    const sync = this._syncData();
    if (!["sync", "sync-setup"].includes(this._modal)) {
      sync.view = "status";
      sync.review = null;
      sync.confirmDelete = "";
    }
    if (this._modal !== "sync-setup") sync.setup = null;
    if (
      this._syncCaps().supported &&
      !sync.requested &&
      ["shopping", "dashboard"].includes(this._view)
    )
      this._syncLoad({ quiet: true });
    this._syncPollSchedule();
  },

  _syncModalHtml() {
    if (!["sync", "sync-setup", "sync-info"].includes(this._modal)) return "";
    const closing = `<button class="icon-btn modal-close" data-action="close-modal" title="${esc(this.t("close"))}" aria-label="${esc(this.t("close"))}">${icon("close")}</button>`;
    let content,
      size = "";
    if (this._modal === "sync-info") content = this._syncInfoHtml();
    else if (this._modal === "sync-setup") {
      size = "large";
      content = this._syncSetupHtml();
    } else content = this._syncSyncHtml();
    return `<div class="modal-backdrop" data-action="backdrop"><div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="sync-title">${closing}${content}</div></div>`;
  },
  _syncLead(title, text) {
    return `<div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("shopping").toUpperCase())}</div><h2 id="sync-title">${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ""}</div><div class="editor-stamp">${icon("cart", 26)}</div></div>`;
  },
  _syncInfoHtml() {
    return `<div class="modal-content sync-panel">${this._syncLead(this.t("syncTitle"))}<section class="editor-card"><p class="sync-explain" role="status">${icon("leaf", 16)} ${esc(this.t("syncStandaloneExplain"))}</p></section></div>`;
  },

  _syncSyncHtml() {
    const sync = this._syncData();
    const caps = this._syncCaps();
    if (sync.view === "review") return this._syncReviewHtml();
    const rules = this._syncRules();
    const audit = asArray(sync.state?.audit).slice(0, 20);
    const live = sync.result
      ? `<p class="sync-result">${icon("clock", 15)} ${esc(sync.result)}</p>`
      : "";
    const body = rules.length
      ? rules.map((rule) => this._syncRuleHtml(rule, caps)).join("")
      : `<section class="editor-card"><div class="notice">${icon("cart")} ${esc(sync.loadFailed ? this.t("syncLoadFailed") : sync.state ? this.t("syncNoRules") : this.t("loading"))}</div></section>`;
    return `<div class="modal-content sync-panel">${this._syncLead(this.t("syncTitle"))}
      ${sync.error ? `<div class="notice error" role="alert">${icon("bolt", 16)} <span>${esc(sync.error)}</span></div>` : ""}
      <div class="sync-live" role="status" aria-live="polite">${live}</div>
      ${!caps.write ? `<p class="notice sync-needs-write" role="note">${icon("leaf", 16)} ${esc(this.t("syncNeedsWrite"))}</p>` : ""}
      ${body}
      ${caps.admin && rules.length < 5 ? `<div class="form-actions"><button class="btn primary" data-action="sync-setup-open" data-value="">${icon("plus", 14)} ${esc(this.t("syncAddRule"))}</button></div>` : ""}
      ${audit.length ? `<section class="editor-card sync-audit"><h3>${esc(this.t("syncAuditTitle"))}</h3><ul class="sync-list">${audit.map((a) => `<li>${this._syncOutcomeIcon(a.outcome)} ${esc(this.tp("syncAuditEntry", a.count ?? 0, { time: this._syncRelative(a.at), result: this._syncOutcomeText(a.outcome) }))}</li>`).join("")}</ul></section>` : ""}</div>`;
  },
  _syncRuleHtml(rule, caps) {
    const sync = this._syncData();
    const counts = rule.counts || {};
    const issues = this._syncIssues(rule);
    const destination = rule.destination || {};
    const destName = destination.name || rule.destination_entity_id;
    const mode = rule.mode === "move" ? "Move" : "Copy";
    const state = !rule.activated ? "NotActivated" : rule.paused ? "Paused" : "Active";
    const stateIcon = state === "Active" ? icon("check", 15) : icon("clock", 15);
    const last = rule.last_run;
    const open =
      this._syncWaiting(rule) + (counts.failed || 0) + (counts.needs_reconciliation || 0);
    const id = esc(rule.id);
    const write = (action, label, extra = "") =>
      `<button class="btn tiny ${extra}" data-action="${action}" data-value="${id}"${caps.write ? "" : ' aria-disabled="true"'}>${label}</button>`;
    const problems = [
      destination.available === false
        ? this.tp("syncErrorDestinationUnavailable", open, { destination: destName })
        : "",
      last?.outcome === "source_unavailable" ? this.t("syncErrorSourceUnavailable") : "",
    ].filter(Boolean);
    const actions = [
      !rule.activated && caps.admin
        ? `<button class="btn tiny primary" data-action="sync-setup-open" data-value="${id}">${icon("arrow", 14)} ${esc(this.t("syncFirstBatch"))}</button>`
        : "",
      rule.activated
        ? write("sync-run", `${icon("refresh", 14)} ${esc(this.t("syncRunNow"))}`)
        : "",
      rule.activated
        ? write(
            rule.paused ? "sync-resume" : "sync-pause",
            esc(this.t(rule.paused ? "syncResume" : "syncPause")),
          )
        : "",
      counts.failed > 0
        ? write("sync-retry", `${icon("refresh", 14)} ${esc(this.t("syncRetryFailed"))}`)
        : "",
      issues > 0 || this._syncWaiting(rule) > 0
        ? `<button class="btn tiny" data-action="sync-review" data-value="${id}">${esc(this.t("syncReview"))}</button>`
        : "",
      caps.admin
        ? `<button class="btn tiny" data-action="sync-setup-open" data-value="${id}">${icon("edit", 14)} ${esc(this.t("edit"))}</button>`
        : "",
      caps.admin
        ? `<button class="btn tiny" data-action="sync-delete" data-value="${id}">${esc(this.t("syncDelete"))}</button>`
        : "",
    ].join("");
    const confirm =
      sync.confirmDelete === rule.id
        ? `<div class="notice error" role="alert"><span>${esc(this.t("syncDeleteConfirm"))}</span><div class="form-actions"><button class="btn tiny" data-action="sync-delete-confirm" data-value="${id}">${esc(this.t("syncDelete"))}</button><button class="btn tiny" data-action="sync-delete-cancel">${esc(this.t("syncCancel"))}</button></div></div>`
        : "";
    return `<section class="editor-card sync-rule" aria-labelledby="sync-rule-${id}">
      <h3 id="sync-rule-${id}">${esc(rule.name)}</h3>
      <p class="sync-route">${esc(rule.source_list_name)} → ${esc(destName)}${destination.platform ? ` (${esc(destination.platform)})` : ""}</p>
      <p class="sync-mode">${esc(this.t(`syncMode${mode}`))}: ${esc(this.t(`syncMode${mode}Hint`))}</p>
      <p class="sync-state">${stateIcon} <strong>${esc(this.t(`syncState${state}`))}</strong> <span class="sync-count sync-muted">${esc(this.tp("syncPending", this._syncWaiting(rule)))}</span></p>
      <p class="sync-last">${last ? `${this._syncOutcomeIcon(last.outcome, counts)} ${esc(this.t("syncLastRun", { time: this._syncRelative(last.at), result: this._syncOutcomeText(last.outcome, counts) }))}` : esc(this.t("syncNeverRun"))}</p>
      ${problems.map((p) => `<p class="notice error" role="alert">${icon("bolt", 16)} <span>${esc(p)}</span></p>`).join("")}
      ${counts.needs_reconciliation > 0 ? `<p class="notice" role="status">${icon("clock", 16)} <span>${esc(this.tp("syncReconcileHint", counts.needs_reconciliation))}</span></p>` : ""}
      ${issues > 0 ? `<p class="sync-issues">${icon("bolt", 15)} ${esc(this.t("syncBadgeIssues", { count: issues }))}</p>` : ""}
      ${confirm}
      <div class="form-actions sync-actions">${actions}</div></section>`;
  },

  _syncReviewHtml() {
    const sync = this._syncData();
    const caps = this._syncCaps();
    const review = sync.review || { records: [], loading: true };
    const problem = ["failed", "needs_reconciliation", "changed_after_send", "removed_after_send"];
    const waiting = ["pending", "sending"];
    const records = asArray(review.records);
    const group = (title, states) => {
      const rows = records.filter((r) => states.includes(r.state));
      if (!rows.length) return "";
      return `<section class="editor-card"><h3>${esc(title)}</h3><ul class="sync-list">${rows.map((r) => this._syncRecordHtml(r, review.ruleId, caps)).join("")}</ul></section>`;
    };
    const parts = [
      group(this.t("syncReviewTitle"), problem),
      group(this.t("syncOutboxTitle"), waiting),
    ].join("");
    return `<div class="modal-content sync-panel">${this._syncLead(this.t("syncReviewTitle"))}
      ${sync.error ? `<div class="notice error" role="alert">${icon("bolt", 16)} <span>${esc(sync.error)}</span></div>` : ""}
      ${!caps.write ? `<p class="notice sync-needs-write" role="note">${icon("leaf", 16)} ${esc(this.t("syncNeedsWrite"))}</p>` : ""}
      <div class="sync-live" role="status" aria-live="polite" aria-busy="${review.loading ? "true" : "false"}">${review.loading ? esc(this.t("loading")) : ""}</div>
      ${parts || (review.loading ? "" : `<section class="editor-card"><div class="notice">${icon("check", 16)} ${esc(this.t("syncReviewEmpty"))}</div></section>`)}
      <div class="form-actions"><button class="btn" data-action="sync-review-close">${icon("chevron", 14)} ${esc(this.t("syncReviewClose"))}</button></div></div>`;
  },
  _syncRecordHtml(record, ruleId, caps) {
    const resolvable = [
      "changed_after_send",
      "removed_after_send",
      "needs_reconciliation",
    ].includes(record.state);
    const key = esc(record.key);
    const error = record.last_error
      ? this.t(`syncLastError_${record.last_error}`) === `syncLastError_${record.last_error}`
        ? ""
        : this.t(`syncLastError_${record.last_error}`)
      : "";
    const button = (action, label) =>
      `<button class="btn tiny" data-action="${action}" data-value="${key}" data-rule="${esc(ruleId)}"${caps.write ? "" : ' aria-disabled="true"'}>${esc(label)}</button>`;
    return `<li class="sync-record"><div><strong>${esc(record.title)}</strong>${record.description ? ` <span class="sync-muted">${esc(record.description)}</span>` : ""}<br><span class="sync-record-state">${icon(["pending", "sending", "needs_reconciliation"].includes(record.state) ? "clock" : "bolt", 14)} ${esc(this.t(`syncRecordState_${record.state}`))}</span>${error ? ` <span class="sync-muted">${esc(error)}</span>` : ""}</div>${resolvable ? `<div class="sync-record-actions">${button("sync-dismiss", this.t("syncDismiss"))}${button("sync-resend", this.t("syncResend"))}</div>` : ""}</li>`;
  },

  _syncDraftRequest(draft) {
    const lists = asArray(this._data.shopping?.lists);
    const source = lists.find((l) => String(l.id) === draft.source_list_id);
    const destination = draft.destinations.find((e) => e.entity_id === draft.destination_entity_id);
    const name = String(draft.name || "").trim();
    return {
      name: (name || `${source?.name || ""} → ${destination?.name || ""}`).slice(0, 60),
      source_list_id: draft.source_list_id,
      destination_entity_id: draft.destination_entity_id,
      mode: draft.mode,
      triggers: { after_atelier_add: draft.after_atelier_add, watch: draft.watch },
      debounce_seconds: Number(draft.debounce_seconds),
      poll_interval_seconds: Number(draft.poll_minutes) * 60,
      duplicate_policy: draft.duplicate_policy,
    };
  },
  _syncDraftErrors(draft) {
    const errors = {};
    const whole = (value, min, max) =>
      /^\d+$/.test(String(value).trim()) && Number(value) >= min && Number(value) <= max;
    if (!whole(draft.debounce_seconds, 5, 600)) errors.debounce = { min: 5, max: 600 };
    if (!whole(draft.poll_minutes, 1, 60)) errors.poll = { min: 1, max: 60 };
    return errors;
  },
  async _syncSetupOpen(ruleId) {
    const sync = this._syncData();
    const rule = this._syncRules().find((r) => r.id === ruleId);
    const lists = asArray(this._data.shopping?.lists);
    const used = this._syncRules()
      .filter((r) => r.id !== ruleId)
      .map((r) => r.source_list_id);
    const free = lists.filter((l) => !used.includes(String(l.id)));
    sync.setup = {
      rule_id: rule?.id || "",
      expected_revision: rule?.revision,
      activated: rule?.activated === true,
      name: rule?.name || "",
      source_list_id: rule?.source_list_id || String(free[0]?.id || ""),
      destination_entity_id: rule?.destination_entity_id || "",
      mode: rule?.mode || "copy",
      after_atelier_add: rule ? rule.triggers?.after_atelier_add === true : true,
      watch: rule ? rule.triggers?.watch === true : false,
      debounce_seconds: rule?.debounce_seconds ?? 30,
      poll_minutes: Math.round((rule?.poll_interval_seconds ?? 120) / 60),
      duplicate_policy: rule?.duplicate_policy || "skip_exact",
      original: rule
        ? { source: rule.source_list_id, destination: rule.destination_entity_id }
        : null,
      resetConfirmed: false,
      free,
      destinations: [],
      destinationsLoaded: false,
      preview: null,
      previewBusy: false,
      previewSeq: 0,
      saving: false,
      error: "",
    };
    sync.error = "";
    this._modal = "sync-setup";
    this._render();
    try {
      const result = await this._ws("sync_destinations");
      if (sync.setup) sync.setup.destinations = asArray(result?.entities);
    } catch (err) {
      if (sync.setup) sync.setup.error = this._errorText(err);
    }
    if (sync.setup) sync.setup.destinationsLoaded = true;
    this._render();
  },
  _syncSetupHtml() {
    const d = this._syncData().setup;
    if (!d) return "";
    const lists = asArray(this._data.shopping?.lists);
    const sourceName = lists.find((l) => String(l.id) === d.source_list_id)?.name || "";
    const destination = d.destinations.find((e) => e.entity_id === d.destination_entity_id);
    const errors = this._syncDraftErrors(d);
    const changed =
      d.original &&
      (d.original.source !== d.source_list_id ||
        d.original.destination !== d.destination_entity_id);
    const ready = d.source_list_id && d.destination_entity_id && !Object.keys(errors).length;
    const blocked = !ready || (changed && !d.resetConfirmed) || d.saving;
    const lines = asArray(d.preview?.lines);
    const sendCount = lines.filter((l) => ["send", "merge"].includes(l.action)).length;
    const actionLabel = {
      send: "syncActionSend",
      skip_duplicate: "syncActionSkipDuplicate",
      merge: "syncActionMerge",
      skip_empty: "syncActionSkipEmpty",
    };
    const radio = (group, field, value, label, hint) =>
      `<label class="sync-radio-card"><input type="radio" name="sync-${group}" value="${value}" data-input="sync-${group}-${value}" ${d[field] === value ? "checked" : ""}><span><strong>${esc(label)}</strong>${hint ? `<small>${esc(hint)}</small>` : ""}</span></label>`;
    const number = (field, key, labelKey, errorKey) =>
      `<label class="field"><span>${esc(this.t(labelKey))}</span><input type="text" inputmode="numeric" data-input="sync-${key}" value="${esc(d[field])}" ${errors[errorKey] ? `aria-invalid="true" aria-describedby="sync-${key}-error"` : ""}>${errors[errorKey] ? `<span id="sync-${key}-error" class="sync-field-error" role="alert">${esc(this.t("syncInvalidNumber", errors[errorKey]))}</span>` : ""}</label>`;
    const sourceOptions = d.free
      .map(
        (l) =>
          `<option value="${esc(l.id)}" ${String(l.id) === d.source_list_id ? "selected" : ""}>${esc(l.name)}</option>`,
      )
      .join("");
    const destinationOptions = d.destinations
      .map(
        (e) =>
          `<option value="${esc(e.entity_id)}" ${e.entity_id === d.destination_entity_id ? "selected" : ""}>${esc(this.t("syncDestinationOption", { name: e.name, platform: e.platform }))}</option>`,
      )
      .join("");
    const previewMarkup = d.previewBusy
      ? `<p>${esc(this.t("loading"))}</p>`
      : d.preview
        ? `${d.preview.sample?.title ? `<p class="sync-sample">${esc(this.t("syncPreviewSample", { title: d.preview.sample.title }))}</p>` : ""}${
            lines.length
              ? `<p>${esc(this.tp("syncPreviewTotal", d.preview.total_candidates ?? lines.length, { total: d.preview.total_candidates ?? lines.length, shown: lines.length }))}</p><ul class="sync-list">${lines.map((l) => `<li><strong>${esc(l.title)}</strong>${l.description ? ` <span class="sync-muted">${esc(l.description)}</span>` : ""}<br><span class="sync-record-state">${icon(l.action === "send" ? "arrow" : "clock", 14)} ${esc(this.t(actionLabel[l.action] || "syncActionSend"))}</span></li>`).join("")}</ul>`
              : `<div class="notice">${icon("check", 16)} ${esc(this.t("syncPreviewEmpty"))}</div>`
          }`
        : "";
    const confirmLabel = this.tp("syncConfirmSend", sendCount, {
      source: sourceName,
      destination: destination?.name || "",
    });
    return `<div class="modal-content sync-panel atelier-editor">${this._syncLead(this.t(d.rule_id ? "syncEditRule" : "syncSetup"))}
      ${d.error ? `<div class="notice error" role="alert">${icon("bolt", 16)} <span>${esc(d.error)}</span></div>` : ""}
      <section class="editor-card"><div class="eyebrow">01 / ${esc(this.t("syncSource").toUpperCase())}</div>
        ${
          d.free.length
            ? `<label class="field"><span>${esc(this.t("syncSource"))}</span><select data-input="sync-source" data-autofocus>${sourceOptions}</select></label>`
            : `<p class="notice" role="status">${icon("cart", 16)} ${esc(this.t(lists.length ? "errSyncSourceTaken" : "addListFirst"))}</p>`
        }
        <label class="field"><span>${esc(this.t("syncRuleName"))}</span><input data-input="sync-name" maxlength="60" value="${esc(d.name)}" placeholder="${esc(this._syncDraftRequest(d).name)}"></label></section>
      <section class="editor-card"><div class="eyebrow">02 / ${esc(this.t("syncDestination").toUpperCase())}</div>
        ${
          d.destinationsLoaded && !d.destinations.length
            ? `<p class="notice" role="status">${icon("leaf", 16)} ${esc(this.t("syncNoDestinations"))}</p>`
            : `<label class="field"><span>${esc(this.t("syncDestination"))}</span><select data-input="sync-destination" ${d.destinationsLoaded ? "" : 'aria-busy="true"'}><option value="">${esc(this.t("selectList"))}</option>${destinationOptions}</select></label>`
        }
        <p class="sync-capability" role="status" aria-live="polite">${destination ? `${icon(destination.supports?.description ? "check" : "clock", 15)} ${esc(this.t("syncSupportsNotes", { answer: this.t(destination.supports?.description ? "syncYes" : "syncNo") }))}` : ""}</p></section>
      <section class="editor-card"><div class="eyebrow">03 / ${esc(this.t("syncStepMode").toUpperCase())}</div>
        <fieldset class="sync-fieldset"><legend>${esc(this.t("syncStepMode"))}</legend>${radio("mode", "mode", "copy", this.t("syncModeCopy"), this.t("syncModeCopyHint"))}${radio("mode", "mode", "move", this.t("syncModeMove"), this.t("syncModeMoveHint"))}</fieldset></section>
      <section class="editor-card"><div class="eyebrow">04 / ${esc(this.t("syncStepWhen").toUpperCase())}</div>
        <fieldset class="sync-fieldset"><legend>${esc(this.t("syncStepWhen"))}</legend>
        <label class="editor-check"><input type="checkbox" data-input="sync-after-add" ${d.after_atelier_add ? "checked" : ""}> ${esc(this.t("syncTriggerAfterAdd"))}</label>
        <label class="editor-check"><input type="checkbox" data-input="sync-watch" ${d.watch ? "checked" : ""}> ${esc(this.t("syncTriggerWatch"))}</label>
        <p class="editor-sub">${esc(this.tp("syncTriggerWatchHint", Number(d.poll_minutes) || 2, { interval: Number(d.poll_minutes) || 2 }))}</p></fieldset>
        <div class="editor-columns">${number("debounce_seconds", "debounce", "syncDebounce", "debounce")}${number("poll_minutes", "poll", "syncPollMinutes", "poll")}</div></section>
      <section class="editor-card"><div class="eyebrow">05 / ${esc(this.t("syncDuplicates").toUpperCase())}</div>
        <fieldset class="sync-fieldset"><legend>${esc(this.t("syncDuplicates"))}</legend>${radio("duplicates", "duplicate_policy", "skip_exact", this.t("syncDuplicateSkipExact"))}${radio("duplicates", "duplicate_policy", "skip_exact_merge_same_unit", this.t("syncDuplicateMerge"))}${radio("duplicates", "duplicate_policy", "none", this.t("syncDuplicateNone"))}</fieldset></section>
      <section class="editor-card"><div class="eyebrow">06 / ${esc(this.t("syncPreview").toUpperCase())}</div>
        <div class="form-actions"><button class="btn" data-action="sync-preview"${ready ? "" : " disabled"}>${icon("search", 14)} ${esc(this.t("syncPreviewRun"))}</button></div>
        <div class="sync-preview" role="status" aria-live="polite" aria-busy="${d.previewBusy ? "true" : "false"}">${previewMarkup}</div></section>
      <section class="editor-card"><div class="eyebrow">07 / ${esc(this.t("syncStepConfirm").toUpperCase())}</div>
        ${changed ? `<label class="editor-check"><input type="checkbox" data-input="sync-reset" ${d.resetConfirmed ? "checked" : ""}> ${esc(this.t("syncResetConfirm"))}</label>` : ""}
        <div class="form-actions">${
          d.activated
            ? `<button class="btn primary" data-action="sync-save" data-value="changes"${blocked ? " disabled" : ""}>${icon("check", 14)} ${esc(this.t("syncSaveChanges"))}</button>`
            : `<button class="btn primary" data-action="sync-save" data-value="send"${blocked || !d.preview ? " disabled" : ""}>${icon("arrow", 14)} ${esc(confirmLabel)}</button><button class="btn" data-action="sync-save" data-value="only"${blocked ? " disabled" : ""}>${esc(this.t("syncSaveOnly"))}</button>`
        }<button class="btn plain" data-action="sync-setup-cancel">${esc(this.t("syncCancel"))}</button></div></section></div>`;
  },

  // Returns true when the click belonged to the sync workflow.
  async _syncHandleClick(el) {
    const action = el.dataset.action;
    const value = el.dataset.value || "";
    const sync = this._syncData();
    const caps = this._syncCaps();
    if (action === "sync-open") {
      if (!caps.supported && !caps.standalone) return true;
      sync.error = "";
      sync.result = "";
      this._modal = caps.supported ? "sync" : "sync-info";
      this._render();
      if (caps.supported) await this._syncLoad();
      return true;
    }
    if (action === "sync-setup-open") {
      if (caps.supported && caps.admin) await this._syncSetupOpen(value);
      return true;
    }
    if (action === "sync-setup-cancel") {
      sync.setup = null;
      this._modal = "sync";
      this._render();
      return true;
    }
    if (action === "sync-preview") {
      await this._syncPreview();
      return true;
    }
    if (action === "sync-save") {
      if (caps.admin) await this._syncSave(value);
      return true;
    }
    if (action === "sync-review-close") {
      sync.view = "status";
      sync.review = null;
      this._render();
      return true;
    }
    if (action === "sync-delete") {
      if (caps.admin) {
        sync.confirmDelete = value;
        this._render();
      }
      return true;
    }
    if (action === "sync-delete-cancel") {
      sync.confirmDelete = "";
      this._render();
      return true;
    }
    if (action === "sync-delete-confirm") {
      sync.confirmDelete = "";
      if (caps.admin)
        await this._syncCommand("sync_rule_delete", { rule_id: value }, { reload: true });
      return true;
    }
    if (action === "sync-review") {
      await this._syncReviewOpen(value);
      return true;
    }
    if (["sync-dismiss", "sync-resend"].includes(action)) {
      if (!caps.write) return true;
      await this._syncResolve(
        el.dataset.rule || "",
        value,
        action === "sync-dismiss" ? "dismiss" : "resend",
      );
      return true;
    }
    if (["sync-run", "sync-pause", "sync-resume", "sync-retry"].includes(action)) {
      if (!caps.write) return true;
      const command = action.replace("sync-", "sync_");
      await this._syncCommand(
        command,
        { rule_id: value },
        { reload: true, show: action === "sync-run" || action === "sync-retry" },
      );
      return true;
    }
    return false;
  },
  // One guarded Bridge call; failures surface as an alert, never as a success text.
  async _syncCommand(type, payload, { reload = false, show = false } = {}) {
    const sync = this._syncData();
    if (sync.busy) return null;
    sync.busy = true;
    sync.error = "";
    let result = null;
    try {
      result = await this._ws(type, payload);
      if (show) sync.result = this._syncResultText(result);
      else sync.result = "";
    } catch (err) {
      sync.error = this._errorText(err);
      sync.result = "";
      this._syncRefetchStatus(err);
    }
    sync.busy = false;
    if (reload) {
      sync.loading = false;
      try {
        sync.state = await this._ws("sync_state");
        sync.raw = JSON.stringify(sync.state || {});
      } catch (err) {
        sync.error = sync.error || this._errorText(err);
      }
    }
    this._render();
    return result;
  },
  // After a permission error the cached grants are stale: ask for the status once.
  _syncRefetchStatus(err) {
    if (!["write_not_permitted", "unauthorized"].includes(err?.code)) return;
    this._ws("status")
      .then((status) => {
        this._status = status;
        this._render();
      })
      .catch(() => {});
  },
  async _syncReviewOpen(ruleId) {
    const sync = this._syncData();
    sync.view = "review";
    sync.error = "";
    sync.review = { ruleId, records: [], loading: true };
    this._render();
    try {
      const result = await this._ws("sync_records", {
        rule_id: ruleId,
        states: [
          "failed",
          "needs_reconciliation",
          "changed_after_send",
          "removed_after_send",
          "pending",
          "sending",
        ],
        limit: 200,
      });
      if (sync.review?.ruleId === ruleId)
        sync.review = { ruleId, records: asArray(result?.records), loading: false };
    } catch (err) {
      sync.error = this._errorText(err);
      if (sync.review) sync.review.loading = false;
    }
    this._render();
  },
  async _syncResolve(ruleId, recordKey, action) {
    const sync = this._syncData();
    if (!ruleId || sync.busy) return;
    sync.busy = true;
    sync.error = "";
    try {
      await this._ws("sync_resolve", { rule_id: ruleId, record_key: recordKey, action });
    } catch (err) {
      sync.error = this._errorText(err);
      this._syncRefetchStatus(err);
    }
    sync.busy = false;
    await this._syncReviewOpen(ruleId);
    try {
      sync.state = await this._ws("sync_state");
      sync.raw = JSON.stringify(sync.state || {});
      this._render();
    } catch {
      /* The review list is already fresh; the next poll refreshes the status. */
    }
  },
  async _syncPreview() {
    const d = this._syncData().setup;
    if (!d || d.previewBusy) return;
    if (Object.keys(this._syncDraftErrors(d)).length) {
      this._render();
      return;
    }
    d.previewBusy = true;
    d.error = "";
    const seq = ++d.previewSeq;
    this._render();
    try {
      const preview = await this._ws("sync_preview", { rule: this._syncDraftRequest(d) });
      if (seq === d.previewSeq) d.preview = preview;
    } catch (err) {
      if (seq === d.previewSeq) d.error = this._errorText(err);
    }
    if (seq === d.previewSeq) d.previewBusy = false;
    this._render();
  },
  // Save the rule first; only the explicit "send" path asks the Bridge to send the first batch.
  async _syncSave(kind) {
    const sync = this._syncData();
    const d = sync.setup;
    if (!d || d.saving) return;
    const changed =
      d.original &&
      (d.original.source !== d.source_list_id ||
        d.original.destination !== d.destination_entity_id);
    if (Object.keys(this._syncDraftErrors(d)).length) {
      d.error = this.t("syncFixNumbers");
      this._render();
      return;
    }
    if (
      !d.source_list_id ||
      !d.destination_entity_id ||
      (changed && !d.resetConfirmed) ||
      (kind === "send" && !d.preview)
    )
      return;
    d.saving = true;
    d.error = "";
    this._render();
    let rule;
    try {
      const saved = await this._ws("sync_rule_save", {
        rule: this._syncDraftRequest(d),
        ...(d.rule_id ? { rule_id: d.rule_id, expected_revision: d.expected_revision } : {}),
        ...(changed ? { reset_records: true } : {}),
      });
      rule = saved?.rule;
    } catch (err) {
      d.saving = false;
      d.error = this._errorText(err);
      this._syncRefetchStatus(err);
      this._render();
      return;
    }
    sync.setup = null;
    sync.error = "";
    sync.result = "";
    if (this._modal === "sync-setup") this._modal = "sync";
    if (kind === "send" && rule?.id) {
      try {
        const result = await this._ws("sync_run", { rule_id: rule.id, confirm_first_batch: true });
        sync.result = this._syncResultText(result);
      } catch (err) {
        sync.error = this._errorText(err);
        this._syncRefetchStatus(err);
      }
    }
    try {
      sync.state = await this._ws("sync_state");
      sync.raw = JSON.stringify(sync.state || {});
    } catch (err) {
      sync.error = sync.error || this._errorText(err);
    }
    this._render();
  },
  // Re-render so inline errors and disabled buttons follow the typing, then put the caret back.
  _syncRenderKeepFocus(el) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    this._render();
    const field = this.shadowRoot?.querySelector?.(`[data-input="${el.dataset?.input}"]`);
    if (field && typeof start === "number" && field.setSelectionRange) {
      try {
        field.setSelectionRange(start, end);
      } catch {
        /* Not a text-like field; focus alone is enough. */
      }
    }
  },
  // Returns true when the input belonged to the sync setup form.
  _syncHandleInput(el) {
    const type = el.dataset?.input || "";
    const d = this._syncData().setup;
    if (!type.startsWith("sync-") || !d) return false;
    const staleAndRender = () => {
      d.preview = null;
      d.previewSeq++;
      d.previewBusy = false;
      this._render();
    };
    if (type === "sync-source") {
      d.source_list_id = String(el.value);
      staleAndRender();
    } else if (type === "sync-destination") {
      d.destination_entity_id = String(el.value);
      staleAndRender();
    } else if (type.startsWith("sync-mode-")) {
      d.mode = el.value === "move" ? "move" : "copy";
      this._render();
    } else if (type.startsWith("sync-duplicates-")) {
      d.duplicate_policy = String(el.value);
      staleAndRender();
    } else if (type === "sync-after-add") {
      d.after_atelier_add = Boolean(el.checked);
    } else if (type === "sync-watch") {
      d.watch = Boolean(el.checked);
    } else if (type === "sync-reset") {
      d.resetConfirmed = Boolean(el.checked);
      this._render();
    } else if (type === "sync-name") {
      d.name = String(el.value).slice(0, 60);
    } else if (type === "sync-debounce") {
      d.debounce_seconds = String(el.value).trim();
      this._syncRenderKeepFocus(el);
    } else if (type === "sync-poll") {
      d.poll_minutes = String(el.value).trim();
      this._syncRenderKeepFocus(el);
    }
    return true;
  },
}

/** Searchable, paginated recipe picker (ARIA combobox) for the meal plan dialog. */
const PICKER_ID = "recipe-picker";
const PICKER_PAGE_SIZE = 20;
const PICKER_DEBOUNCE_MS = 250;
const PICKER_JUMP = 10;
const PICKER_MAX_FILTERS = 10;

const recipePickerMethods = {
  /** Generic combobox markup (input, listbox panel, live region); reusable by other dialogs. */
  _comboboxMarkup({
    id,
    label,
    value = "",
    placeholder = "",
    inputKey = id,
    open = false,
    activeId = "",
    list = "",
    status = "",
    live = "",
    busy = false,
    action = "",
    autofocus = false,
  }) {
    return `<div class="combobox" data-combobox-root="${esc(id)}">
      <label class="field"><span id="${esc(id)}-label">${esc(label)}</span>
      <input type="text" class="combobox-input" role="combobox" aria-autocomplete="list" aria-expanded="${open}" aria-controls="${esc(id)}-list" ${activeId ? `aria-activedescendant="${esc(activeId)}"` : ""} autocomplete="off" spellcheck="false" maxlength="100" ${autofocus ? "data-autofocus" : ""} ${action ? `data-action="${esc(action)}"` : ""} data-input="${esc(inputKey)}" data-combobox="${esc(id)}" placeholder="${esc(placeholder)}" value="${esc(value)}"></label>
      <div class="picker-panel" data-combobox-panel="${esc(id)}" ${open ? "" : "hidden"}>
        <ul class="picker-list" role="listbox" id="${esc(id)}-list" aria-labelledby="${esc(id)}-label" aria-busy="${busy}" data-combobox-list="${esc(id)}">${list}</ul>
        <div class="picker-state" data-combobox-state="${esc(id)}">${status}</div>
      </div>
      <div class="picker-vh" aria-live="polite" data-combobox-live="${esc(id)}">${esc(live)}</div>
    </div>`;
  },
  /** Sync aria state and option highlighting from `state` ({id, open, active, items}). */
  _comboboxPaint(state) {
    const root = this.shadowRoot;
    const input = root.querySelector(`[data-combobox="${state.id}"]`);
    const panel = root.querySelector(`[data-combobox-panel="${state.id}"]`);
    const list = root.querySelector(`[data-combobox-list="${state.id}"]`);
    const valid = state.open && state.active >= 0 && state.active < state.items.length;
    input?.setAttribute("aria-expanded", String(Boolean(state.open)));
    if (valid) input?.setAttribute("aria-activedescendant", `${state.id}-opt-${state.active}`);
    else input?.removeAttribute("aria-activedescendant");
    panel?.toggleAttribute("hidden", !state.open);
    if (!list) return;
    [...list.querySelectorAll('[role="option"]')].forEach((option, i) => {
      const on = valid && i === state.active;
      option.setAttribute("aria-selected", String(on));
      option.toggleAttribute("data-active", on);
      if (on) option.scrollIntoView?.({ block: "nearest" });
    });
  },
  /**
   * Keyboard model of the combobox. `state` carries {id, open, active, items, hasMore, loading}
   * plus callbacks {onSelect(index), onMore()}. Returns true when the event was consumed.
   */
  _comboboxKeydown(event, state) {
    const last = state.items.length - 1;
    const go = (index) => {
      if (last < 0) return false;
      state.open = true;
      state.active = Math.max(0, Math.min(last, index));
      event.preventDefault();
      this._comboboxPaint(state);
      return true;
    };
    const more = () => {
      if (state.hasMore && !state.loading) state.onMore?.();
    };
    switch (event.key) {
      case "ArrowDown":
        if (!state.open) {
          state.open = true;
          return go(Math.max(0, state.active));
        }
        if (state.active >= last) {
          event.preventDefault();
          more();
          return true;
        }
        return go(state.active + 1);
      case "ArrowUp":
        return go(state.open ? state.active - 1 : Math.max(0, state.active));
      case "Home":
        return state.open && last >= 0 ? go(0) : false;
      case "End":
        return state.open && last >= 0 ? go(last) : false;
      case "PageDown":
        if (!state.open || last < 0) return false;
        if (state.active >= last) {
          event.preventDefault();
          more();
          return true;
        }
        return go(state.active + PICKER_JUMP);
      case "PageUp":
        return state.open && last >= 0 ? go(state.active - PICKER_JUMP) : false;
      case "Enter":
        if (!state.open) return false;
        event.preventDefault();
        if (state.active >= 0 && state.active <= last) state.onSelect?.(state.active);
        return true;
      case "Escape":
        if (!state.open) return false;
        event.preventDefault();
        state.open = false;
        this._comboboxPaint(state);
        return true;
      case "Tab":
        if (state.open) {
          state.open = false;
          this._comboboxPaint(state);
        }
        return false;
      default:
        return false;
    }
  },

  _pickerFiltersActive(s = this._picker) {
    return Boolean(
      s && (s.filters.categories.length || s.filters.tags.length || s.filters.favorites),
    );
  },
  _pickerSync() {
    if (this._modal === "plan") this._pickerStart();
    else if (this._picker) this._pickerStop();
  },
  _pickerStart() {
    this._pickerStop();
    const detail = this._detail;
    const pinned = detail?.id
      ? {
          id: String(detail.id),
          name: detail.name || "",
          slug: detail.slug || "",
          totalTime: detail.totalTime || "",
          imageUrl: detail.imageUrl || "",
        }
      : null;
    const s = {
      id: PICKER_ID,
      native: this._providerActive === "home_assistant",
      open: true,
      active: -1,
      items: [],
      page: 0,
      totalPages: 0,
      total: 0,
      hasMore: false,
      loading: true,
      error: "",
      retryReset: true,
      advance: false,
      seq: 0,
      timer: null,
      observer: null,
      query: "",
      pinned,
      selected: pinned ? { id: pinned.id, name: pinned.name } : null,
      filters: { categories: [], tags: [], favorites: false, order: "name" },
      panels: { category: false, tag: false },
      meta: null,
      nativeAll: null,
      onSelect: (index) => this._pickerSelect(index),
      onMore: () => {
        this._picker.advance = true;
        this._pickerLoad(false);
      },
    };
    this._picker = s;
    this._pickerLoad(true);
    if (!s.native)
      this._ws("metadata")
        .then((meta) => {
          if (this._picker !== s) return;
          s.meta = { categories: asArray(meta?.categories), tags: asArray(meta?.tags) };
          const region = this.shadowRoot.querySelector('[data-picker="filters"]');
          if (region) region.innerHTML = this._pickerFiltersMarkup(s);
        })
        .catch(() => {});
  },
  _pickerStop() {
    const s = this._picker;
    if (!s) return;
    clearTimeout(s.timer);
    s.observer?.disconnect();
    s.seq++;
    this._picker = null;
  },
  /** Recipe chosen most recently, so the optimistic meal plan row can show its name. */
  _pickerChosen(id) {
    const item = this._pickerLastChosen;
    return item && String(item.id) === String(id) ? item : undefined;
  },

  async _pickerFetch(s, page) {
    if (s.native) {
      if (page === 1 || !s.nativeAll) {
        const data = await this._ws("recipes", { search: s.query });
        s.nativeAll = asArray(data?.items);
      }
      const start = (page - 1) * PICKER_PAGE_SIZE;
      return {
        items: s.nativeAll.slice(start, start + PICKER_PAGE_SIZE),
        page,
        per_page: PICKER_PAGE_SIZE,
        total: s.nativeAll.length,
        total_pages: Math.max(1, Math.ceil(s.nativeAll.length / PICKER_PAGE_SIZE)),
      };
    }
    const payload = { page, per_page: PICKER_PAGE_SIZE, search: s.query };
    if (s.filters.categories.length) payload.categories = [...s.filters.categories];
    if (s.filters.tags.length) payload.tags = [...s.filters.tags];
    if (s.filters.favorites) payload.favorites_only = true;
    if (s.filters.order !== "name") payload.order = s.filters.order;
    return this._ws("recipes", payload);
  },
  async _pickerLoad(reset) {
    const s = this._picker;
    if (!s) return;
    if (!reset && (s.loading || !s.hasMore)) return;
    clearTimeout(s.timer);
    const seq = ++s.seq;
    const before = s.items.length;
    s.loading = true;
    s.error = "";
    s.retryReset = reset;
    if (reset) {
      s.items = [];
      s.active = -1;
      s.page = 0;
      s.hasMore = false;
    }
    this._pickerPaint();
    try {
      const page = reset ? 1 : s.page + 1;
      const data = await this._pickerFetch(s, page);
      if (this._picker !== s || seq !== s.seq) return;
      const incoming = asArray(data?.items);
      const known = new Set(reset ? [] : s.items.map((x) => String(x.id)));
      const fresh = incoming.filter((x) => !known.has(String(x.id)));
      let items = reset ? fresh : s.items.concat(fresh);
      if (reset && s.pinned && !s.query && !this._pickerFiltersActive(s))
        items = [s.pinned, ...items.filter((x) => String(x.id) !== s.pinned.id)];
      s.items = items;
      s.total = Number(data?.total) >= 0 ? Number(data.total) : items.length;
      s.page = Number(data?.page) || page;
      const perPage = Number(data?.per_page) || PICKER_PAGE_SIZE;
      const pages = Number(data?.total_pages) || Math.ceil(s.total / perPage) || 1;
      s.hasMore = s.page < pages && incoming.length > 0;
      if (reset && s.selected) s.active = items.findIndex((x) => String(x.id) === s.selected.id);
      if (!reset && s.advance && items.length > before) s.active = before;
    } catch (err) {
      if (this._picker !== s || seq !== s.seq) return;
      s.error = this._errorText(err);
    }
    s.advance = false;
    s.loading = false;
    this._pickerPaint();
  },

  _pickerRowsMarkup(s) {
    const rows = s.items.map((r, i) => {
      const chosen = s.selected && String(r.id) === s.selected.id;
      const on = s.open && i === s.active;
      return `<li role="option" class="picker-option" id="${s.id}-opt-${i}" aria-selected="${on}" data-action="picker-pick" data-value="${i}" ${on ? "data-active" : ""} ${chosen ? "data-chosen" : ""}><span class="picker-thumb" aria-hidden="true">${recipeImage(r)}</span><span class="picker-name">${esc(r.name)}</span><span class="picker-time">${esc(r.totalTime || "")}</span></li>`;
    });
    if (s.loading) {
      const skeletons = s.items.length ? 1 : 3;
      for (let i = 0; i < skeletons; i++)
        rows.push('<li role="presentation" class="picker-skeleton" aria-hidden="true"></li>');
    }
    if (s.hasMore && !s.error)
      rows.push('<li role="presentation" class="picker-sentinel" data-picker="sentinel"></li>');
    return rows.join("");
  },
  _pickerStateMarkup(s) {
    if (s.error)
      return `<p class="picker-note is-error" role="alert">${esc(this.t("pickerError", { error: s.error }))}</p><button class="btn tiny" type="button" data-action="picker-retry">${esc(this.t("pickerRetry"))}</button>`;
    if (s.loading) return `<p class="picker-note">${esc(this.t("pickerLoading"))}</p>`;
    if (!s.items.length) {
      const active = this._pickerFiltersActive(s);
      const text = s.query ? this.t("pickerEmpty", { query: s.query }) : this.t("pickerNoneFound");
      return `<p class="picker-note" role="status">${esc(text)}</p>${active ? `<button class="btn tiny" type="button" data-action="picker-clear">${esc(this.t("pickerClearFilters"))}</button>` : ""}`;
    }
    if (s.hasMore)
      return `<button class="btn tiny" type="button" data-action="picker-more">${esc(this.t("pickerLoadMore"))}</button>`;
    return `<p class="picker-note" role="note">${esc(this.t("pickerEnd"))}</p>`;
  },
  _pickerLiveText(s) {
    if (s.error) return this.t("pickerError", { error: s.error });
    if (s.loading) return this.t("pickerLoading");
    if (!s.items.length)
      return s.query ? this.t("pickerEmpty", { query: s.query }) : this.t("pickerNoneFound");
    return this.t("pickerCount", {
      shown: s.items.length,
      total: Math.max(s.total, s.items.length),
    });
  },
  /** Repaint list, state area and live region without touching the focused input. */
  _pickerPaint() {
    const s = this._picker;
    if (!s) return;
    const root = this.shadowRoot;
    const list = root.querySelector(`[data-combobox-list="${s.id}"]`);
    if (list) {
      list.innerHTML = this._pickerRowsMarkup(s);
      list.setAttribute("aria-busy", String(s.loading));
    }
    const state = root.querySelector(`[data-combobox-state="${s.id}"]`);
    if (state) state.innerHTML = this._pickerStateMarkup(s);
    const live = root.querySelector(`[data-combobox-live="${s.id}"]`);
    if (live) live.textContent = this._pickerLiveText(s);
    const submit = root.querySelector('[data-picker="submit"]');
    if (submit) submit.disabled = !s.selected;
    this._comboboxPaint(s);
    this._pickerObserve(s);
  },
  _pickerObserve(s) {
    s.observer?.disconnect();
    s.observer = null;
    if (typeof IntersectionObserver === "undefined" || !s.hasMore || s.loading || s.error) return;
    const sentinel = this.shadowRoot.querySelector('[data-picker="sentinel"]');
    if (!sentinel) return;
    const panel = this.shadowRoot.querySelector(`[data-combobox-panel="${s.id}"]`);
    s.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this._pickerLoad(false);
      },
      { root: panel || null },
    );
    s.observer.observe(sentinel);
  },
  _pickerSelect(index) {
    const s = this._picker;
    const item = s?.items[index];
    if (!item) return;
    s.selected = { id: String(item.id), name: item.name || "" };
    this._pickerLastChosen = item;
    s.open = false;
    s.active = index;
    const root = this.shadowRoot;
    const input = root.querySelector(`[data-combobox="${s.id}"]`);
    if (input) input.value = s.selected.name;
    const hidden = root.querySelector('[data-picker="value"]');
    if (hidden) hidden.value = s.selected.id;
    this._pickerPaint();
    input?.focus?.({ preventScroll: true });
  },

  _pickerFilterGroup(s, key, label, entries) {
    const picked = key === "category" ? s.filters.categories : s.filters.tags;
    const panelId = `${s.id}-${key}-panel`;
    const open = s.panels[key];
    return `<div class="picker-filter"><button class="btn tiny picker-disclosure" type="button" data-action="picker-toggle" data-value="${key}" aria-expanded="${open}" aria-controls="${panelId}"><span>${esc(label)}</span><span data-picker-count="${key}">${picked.length ? `(${picked.length})` : ""}</span></button>
      <div class="picker-options" id="${panelId}" role="group" aria-label="${esc(label)}" ${open ? "" : "hidden"}>${entries.map((e) => `<label><input type="checkbox" data-input="picker-${key}" value="${esc(e.slug)}" ${picked.includes(e.slug) ? "checked" : ""}> <span>${esc(e.name || e.slug)}</span></label>`).join("")}</div></div>`;
  },
  _pickerFiltersMarkup(s) {
    if (s.native) return "";
    const usable = (list) => asArray(list).filter((e) => e?.slug);
    const groups = [];
    if (usable(s.meta?.categories).length)
      groups.push(
        this._pickerFilterGroup(s, "category", this.t("pickerCategory"), usable(s.meta.categories)),
      );
    if (usable(s.meta?.tags).length)
      groups.push(this._pickerFilterGroup(s, "tag", this.t("pickerTag"), usable(s.meta.tags)));
    return `<div class="picker-filter-row">${groups.join("")}
      <label class="field"><span>${esc(this.t("pickerSort"))}</span><select data-input="picker-order"><option value="name" ${s.filters.order === "name" ? "selected" : ""}>${esc(this.t("pickerSortName"))}</option><option value="recent" ${s.filters.order === "recent" ? "selected" : ""}>${esc(this.t("pickerSortRecent"))}</option></select></label></div>
      <label class="editor-check"><input type="checkbox" data-input="picker-favorites" aria-describedby="${s.id}-fav-hint" ${s.filters.favorites ? "checked" : ""}> ${esc(this.t("pickerFavorites"))}</label><small class="picker-hint" id="${s.id}-fav-hint">${esc(this.t("pickerFavoritesHint"))}</small>`;
  },
  /** Markup of the whole picker; called from the plan dialog. */
  _pickerMarkup() {
    const s = this._picker;
    if (!s) return "";
    return `<div class="picker" data-picker="root">
      <div class="picker-filters" data-picker="filters">${this._pickerFiltersMarkup(s)}</div>
      ${this._comboboxMarkup({ id: s.id, label: this.t("pickerLabel"), value: s.selected?.name || s.query || "", action: "picker-open", autofocus: true, placeholder: this.t("pickerPlaceholder"), inputKey: "picker-search", open: s.open, activeId: s.open && s.active >= 0 && s.active < s.items.length ? `${s.id}-opt-${s.active}` : "", list: this._pickerRowsMarkup(s), status: this._pickerStateMarkup(s), live: this._pickerLiveText(s), busy: s.loading })}
      <input type="hidden" name="recipe_id" data-picker="value" value="${esc(s.selected?.id || "")}">
    </div>`;
  },

  /** Hook for the card keydown handler; true when the picker consumed the key. */
  _pickerKeydown(event) {
    const s = this._picker;
    if (this._modal !== "plan" || !s) return false;
    if (event.target?.dataset?.input !== "picker-search") return false;
    return this._comboboxKeydown(event, s);
  },
  _pickerClick(action, value) {
    const s = this._picker;
    if (!s) return;
    const input = this.shadowRoot.querySelector(`[data-combobox="${s.id}"]`);
    switch (action) {
      case "picker-open":
        if (!s.open) {
          s.open = true;
          this._comboboxPaint(s);
        }
        break;
      case "picker-pick":
        this._pickerSelect(Number(value));
        break;
      case "picker-more":
        s.advance = true;
        this._pickerLoad(false);
        input?.focus?.({ preventScroll: true });
        break;
      case "picker-retry":
        this._pickerLoad(s.retryReset);
        input?.focus?.({ preventScroll: true });
        break;
      case "picker-clear": {
        s.filters = { categories: [], tags: [], favorites: false, order: "name" };
        const region = this.shadowRoot.querySelector('[data-picker="filters"]');
        if (region) region.innerHTML = this._pickerFiltersMarkup(s);
        this._pickerLoad(true);
        break;
      }
      case "picker-toggle": {
        if (!(value in s.panels)) break;
        s.panels[value] = !s.panels[value];
        const root = this.shadowRoot;
        root
          .querySelector(`[data-action="picker-toggle"][data-value="${value}"]`)
          ?.setAttribute("aria-expanded", String(s.panels[value]));
        root.querySelector(`#${s.id}-${value}-panel`)?.toggleAttribute("hidden", !s.panels[value]);
        break;
      }
    }
  },
  _pickerInput(el, type) {
    const s = this._picker;
    if (!s) return;
    if (type === "picker-search") {
      s.query = String(el.value || "")
        .slice(0, 100)
        .trim();
      s.selected = null;
      const hidden = this.shadowRoot.querySelector('[data-picker="value"]');
      if (hidden) hidden.value = "";
      s.open = true;
      s.seq++;
      clearTimeout(s.timer);
      s.items = [];
      s.active = -1;
      s.hasMore = false;
      s.loading = true;
      s.error = "";
      this._pickerPaint();
      s.timer = setTimeout(() => this._pickerLoad(true), PICKER_DEBOUNCE_MS);
      return;
    }
    if (type === "picker-category" || type === "picker-tag") {
      const list = type === "picker-category" ? s.filters.categories : s.filters.tags;
      const slug = String(el.value || "");
      const at = list.indexOf(slug);
      if (el.checked && at < 0) {
        if (list.length >= PICKER_MAX_FILTERS) {
          el.checked = false;
          return;
        }
        list.push(slug);
      } else if (!el.checked && at >= 0) list.splice(at, 1);
      const key = type === "picker-category" ? "category" : "tag";
      const count = this.shadowRoot.querySelector(`[data-picker-count="${key}"]`);
      if (count) count.textContent = list.length ? `(${list.length})` : "";
    } else if (type === "picker-favorites") s.filters.favorites = Boolean(el.checked);
    else if (type === "picker-order") s.filters.order = el.value === "recent" ? "recent" : "name";
    else return;
    this._pickerLoad(true);
  },
}

/** Offline queue for shopping edits (ticks and added notes) in the Home Assistant card. */
const OFFLINE_CAP = 100;
const OFFLINE_ACTIONS = ["shopping_toggle", "shopping_add"];
const OFFLINE_CONFLICT_CODES = ["offline_conflict", "offline_add_uncertain", "offline_op_reused"];

/** Index of the last waiting tick on an item (no `findLastIndex`: older wall tablets lack it). */
function lastToggleIndex(ops, itemId) {
  for (let index = ops.length - 1; index >= 0; index--) {
    const op = ops[index];
    if (op.state !== "conflict" && op.action === "shopping_toggle" && op.payload.item_id === itemId)
      return index;
  }
  return -1;
}

const offlineQueueMethods = {
  /** Active only when no host owns a queue, the Bridge can replay and the user may write. */
  _offlineActive() {
    return (
      this._providerActive !== "home_assistant" &&
      this._hass?.atelierOfflineHost !== true &&
      this._permissions.features.offline_queue === true &&
      this._permissions.can_write === true
    );
  },
  _offlineKey() {
    const user = String(this._hass?.user?.id || "anonymous");
    const entry = String(this._config.entry_id || this._statusEntry?.entry_id || "default");
    return `mealie-atelier-offline-v1:${user}:${entry}`;
  },
  /** Stored operations; any storage or parse failure reads as an empty queue. */
  _offlineLoad() {
    try {
      const raw = localStorage.getItem(this._offlineKey());
      const list = raw ? JSON.parse(raw) : [];
      return (Array.isArray(list) ? list : [])
        .filter(
          (op) =>
            op &&
            typeof op.id === "string" &&
            OFFLINE_ACTIONS.includes(op.action) &&
            op.payload &&
            typeof op.payload === "object",
        )
        .slice(0, OFFLINE_CAP);
    } catch {
      return [];
    }
  },
  _offlineSave(ops) {
    try {
      localStorage.setItem(this._offlineKey(), JSON.stringify(ops.slice(0, OFFLINE_CAP)));
      return true;
    } catch {
      return false;
    }
  },
  _offlineQueue() {
    return this._offlineActive() ? this._offlineLoad() : [];
  },
  _offlineIsConnectivityError(err) {
    if (this._hass?.connected === false) return true;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
    if (err?.code === 3 || err?.code === "connection_lost") return true;
    return /connection lost|not connected/i.test(String(err?.message || ""));
  },
  /**
   * A tick on an item with a waiting tick takes that tick back. A tick never sent is dropped
   * locally; one that may have reached Mealie gets its reverse queued behind it, so order holds.
   */
  _offlineCollapse(action, payload) {
    if (action !== "shopping_toggle" || !this._offlineActive()) return false;
    const ops = this._offlineLoad();
    const index = lastToggleIndex(ops, payload.item_id);
    const waiting = ops[index];
    if (!waiting || waiting.payload.expected_checked !== payload.checked) return false;
    if (!waiting.attempted && waiting.state !== "failed") ops.splice(index, 1);
    else if (
      !this._offlinePush(
        ops,
        action,
        { ...waiting.payload, checked: payload.checked, expected_checked: waiting.payload.checked },
        waiting.label,
      )
    )
      return false;
    if (!this._offlineSave(ops)) return false;
    this._render();
    if (index < ops.length) this._offlineReplayLater();
    return true;
  },
  /** Append one operation with a fresh ID; false when the queue is full or IDs are unavailable. */
  _offlinePush(ops, action, payload, label) {
    if (
      ops.length >= OFFLINE_CAP ||
      typeof crypto === "undefined" ||
      typeof crypto.randomUUID !== "function"
    )
      return false;
    ops.push({
      id: crypto.randomUUID(),
      action,
      payload,
      label,
      state: "pending",
      created_at: Date.now(),
    });
    return true;
  },
  /** Called with a failed write (after its optimistic change was undone). True when it was queued. */
  _offlineHandleFailure(action, payload, err) {
    if (!OFFLINE_ACTIONS.includes(action) || !this._offlineActive()) return false;
    if (!this._offlineIsConnectivityError(err)) return false;
    const ops = this._offlineLoad();
    const item = asArray(this._data.shopping?.items).find(
      (x) => String(x.id) === String(payload.item_id),
    );
    // The state the user saw: a waiting tick on the same item wins over the last loaded state.
    const before = ops[lastToggleIndex(ops, String(payload.item_id))];
    const seen = before ? before.payload.checked : item?.checked;
    const entry =
      action === "shopping_toggle"
        ? {
            item_id: String(payload.item_id),
            checked: payload.checked === true,
            expected_checked: typeof seen === "boolean" ? seen : !payload.checked,
          }
        : { list_id: String(payload.list_id), note: String(payload.note) };
    const label = action === "shopping_add" ? entry.note : this._offlineItemName(item);
    if (!this._offlinePush(ops, action, entry, label)) return false;
    if (!this._offlineSave(ops)) return false;
    this._error = "";
    this._flash(this.t("offlineSaved"));
    return true;
  },
  _offlineItemName(item) {
    return String(item?.display || item?.note || item?.food?.name || this.t("itemFallback"));
  },
  /** Shopping items as the user expects them: waiting ticks applied, waiting adds appended. */
  _offlineItems(items) {
    const ops = this._offlineQueue().filter((op) => op.state !== "conflict");
    if (!ops.length) return items;
    const ticks = new Map(
      ops.filter((op) => op.action === "shopping_toggle").map((op) => [op.payload.item_id, op]),
    );
    const view = items.map((item) =>
      ticks.has(String(item.id))
        ? { ...item, checked: ticks.get(String(item.id)).payload.checked }
        : item,
    );
    for (const op of ops)
      if (op.action === "shopping_add")
        view.push({
          id: `local-${op.id}`,
          shoppingListId: op.payload.list_id,
          note: op.payload.note,
          checked: false,
          offlineWaiting: true,
        });
    return view;
  },
  /** Status line and conflict list for the shopping view. */
  _offlineBar() {
    const ops = this._offlineQueue();
    if (!ops.length) return "";
    const waiting = ops.filter((op) => op.state !== "conflict" && op.state !== "failed");
    // Conflicts wait for the user; failed sends are retried but can always be discarded.
    const conflicts = ops.filter((op) => op.state === "conflict" || op.state === "failed");
    const line = waiting.length
      ? `<div class="notice is-spaced offline-queue" role="status">${icon("cart", 16)} <strong>${esc(this.tp("offlineQueued", waiting.length))}</strong> <button class="btn tiny" data-action="offline-send">${esc(this.t("offlineSendNow"))}</button></div>`
      : conflicts.some((op) => op.state === "failed")
        ? `<div class="notice is-spaced offline-queue"><button class="btn tiny" data-action="offline-send">${esc(this.t("offlineSendNow"))}</button></div>`
        : "";
    const rows = conflicts
      .map(
        (op) =>
          `<div class="notice is-spaced offline-conflict" role="status">${icon("leaf", 16)} <span>${esc(this.t("offlineConflictItem", { item: op.label || this.t("itemFallback"), error: this._errorText({ code: op.reason, message: op.message }) }))}</span> <button class="btn tiny" data-action="offline-discard" data-value="${esc(op.id)}">${esc(this.t("offlineDiscard"))}</button></div>`,
      )
      .join("");
    return line + rows;
  },
  _offlineDiscard(id) {
    this._offlineSave(this._offlineLoad().filter((op) => op.id !== id));
    this._render();
  },
  async _offlineClick(action, value) {
    if (action === "offline-send") await this._offlineReplay();
    else this._offlineDiscard(value);
  },
  /**
   * Send waiting operations in order, one at a time; stop at the first connectivity failure.
   * Any other failure marks that operation and moves on, so one bad entry never blocks the rest.
   */
  async _offlineReplay() {
    if (this._offlineBusy || !this._offlineActive()) return;
    if (
      this._hass?.connected === false ||
      (typeof navigator !== "undefined" && navigator.onLine === false)
    )
      return;
    this._offlineBusy = true;
    let sent = 0;
    let dropped = 0;
    // Items with a failed tick in this run: later ticks on them wait, so their order holds.
    const blocked = new Set();
    try {
      for (const { id } of this._offlineLoad()) {
        // Re-read each entry: the user may have taken it back or discarded it meanwhile.
        const op = this._offlineLoad().find((x) => x.id === id);
        if (!op || op.state === "conflict") continue;
        if (op.action === "shopping_toggle" && blocked.has(op.payload.item_id)) continue;
        // Once sent, an operation may have reached Mealie: it is never dropped silently again.
        this._offlineSave(
          this._offlineLoad().map((x) => (x.id === op.id ? { ...x, attempted: true } : x)),
        );
        try {
          await this._ws("offline_replay", {
            operation: { id: op.id, action: op.action, payload: op.payload },
          });
          this._offlineSave(this._offlineLoad().filter((x) => x.id !== op.id));
          sent++;
        } catch (err) {
          if (this._offlineIsConnectivityError(err)) break;
          if (err?.code === "write_not_permitted") {
            // Nothing in this queue may be written any more, including entries behind this one.
            dropped = this._offlineLoad().length;
            this._offlineSave([]);
            await this._recoverPermissions(err);
            break;
          }
          if (OFFLINE_CONFLICT_CODES.includes(err?.code)) {
            this._offlineSave(
              this._offlineLoad().map((x) =>
                x.id === op.id ? { ...x, state: "conflict", reason: err.code } : x,
              ),
            );
            continue;
          }
          if (op.action === "shopping_toggle") blocked.add(op.payload.item_id);
          this._offlineSave(
            this._offlineLoad().map((x) =>
              x.id === op.id
                ? {
                    ...x,
                    state: "failed",
                    reason: String(err?.code || ""),
                    message: String(err?.message || "").slice(0, 200),
                  }
                : x,
            ),
          );
        }
      }
    } finally {
      this._offlineBusy = false;
    }
    if (sent) await this._loadShopping();
    else this._render();
    if (dropped) this._flash(this.t("offlineDropped"), "error");
  },
  /** `hass.connected` going from false to true replays the queue. */
  _offlineOnHass(next) {
    const was = this._hass?.connected;
    if (was === false && next?.connected !== false) this._offlineReplayLater();
  },
  _offlineReplayLater() {
    Promise.resolve().then(() => this._offlineReplay());
  },
  _offlineAttach() {
    this._boundOffline ||= () => this._offlineReplayLater();
    if (typeof window !== "undefined") window.addEventListener?.("online", this._boundOffline);
    this._offlineReplayLater();
  },
  _offlineDetach() {
    if (typeof window !== "undefined" && this._boundOffline)
      window.removeEventListener?.("online", this._boundOffline);
  },
}

Object.assign(MealieAtelierCard.prototype, viewMethods, printActionMethods, nutritionJournalMethods, dialogMethods, recipeEditorMethods, shoppingSyncMethods, recipePickerMethods, offlineQueueMethods);

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

/* ATELIER STUDIO EXTENSION START */
/* Shared semantic UI constructors. User content is escaped at this boundary.
   The views supply data and interactions; the design system supplies structure. */
const AtelierUI = Object.freeze({
  attribution({ lead = "Made with", by = "by" } = {}) {
    return `<span class="atelier-credit">${esc(lead)} <span class="atelier-credit-heart" aria-hidden="true">♥</span> ${esc(by)} <a href="https://alles-automatisch.de/" target="_blank" rel="noopener noreferrer">Daniel</a></span>`;
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
  metric({ value = "", label = "", graphic = "spark", target = "" } = {}) {
    const supported = Object.hasOwn(ICONS, graphic) ? graphic : "spark";
    const body = `<div class="stat-icon">${icon(supported, 20)}</div>
      <div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
    // A metric with a target is a real button that opens that view.
    if (/^[a-z][a-z0-9-]*$/i.test(target))
      return `<button type="button" class="stat ds-metric is-link" data-action="nav" data-value="${target}" aria-label="${esc(`${label}: ${value}`)}">${body}</button>`;
    return `<div class="stat ds-metric">${body}</div>`;
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
/* Shared, deterministic Kitchen Intelligence. No AI claims, no external calls. */
const AtelierStudio = (() => {
  const clean = (x) =>
    String(x ?? "")
      .toLocaleLowerCase("de")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9äöüß ]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  const stop = new Set(
    "der die das den dem ein eine einer und mit für frisch frische gehackt nach geschmack etwas bei in auf oder von ganze kleinen große kleine paar samt zum zur g kg ml l el tl stueck stück prise".split(
      " ",
    ),
  );
  function words(x) {
    return clean(x)
      .split(" ")
      .filter((w) => w.length > 2 && !stop.has(w))
      .map((w) => w.replace(/(en|ern|e|n|s)$/, ""))
      .filter(Boolean);
  }
  function similarity(a, b) {
    const aa = words(a),
      bb = words(b);
    if (!aa.length || !bb.length) return false;
    return aa.some((x) =>
      bb.some(
        (y) => x === y || (x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x))),
      ),
    );
  }
  function ingredient(row) {
    return String(
      row?.display ||
        row?.originalText ||
        [row?.quantity || "", row?.unit?.name || "", row?.food?.name || "", row?.note || ""]
          .filter(Boolean)
          .join(" "),
    ).trim();
  }
  // The Kochinspo time choices; a saved limit between them (the default 40) selects the next one up.
  const DISCOVER_MINUTES = [20, 35, 50, 80];
  function discoverMinutes(value) {
    const minutes = Number(value) || 40;
    return DISCOVER_MINUTES.find((option) => option >= minutes) || DISCOVER_MINUTES.at(-1);
  }
  function durationMinutes(value) {
    if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
    const source = String(value ?? "")
      .toLocaleLowerCase("de")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!source.trim()) return null;
    if (/^\d+(?:[.,]\d+)?$/.test(source.trim()))
      return Number(source.trim().replace(",", ".")) || null;
    const unitFactor = (unit) => (/^(h|hr|hrs|hour|hours|stunde|stunden|std)$/.test(unit) ? 60 : 1);
    const token =
      /([0-9]+(?:[.,][0-9]+)?)\s*(stunden?|std|hours?|hrs?|h|minuten?|minutes?|mins?|min)\b/g;
    const tokens = (text) =>
      [...text.matchAll(token)]
        .map((match) => ({ value: Number(match[1].replace(",", ".")), unit: match[2] }))
        .filter((part) => Number.isFinite(part.value));
    const ready = source.match(/(?:fertig|ready)\s+in\s+(.+)$/);
    if (ready) {
      const parts = tokens(ready[1]);
      if (parts.length)
        return parts.reduce((sum, part) => sum + part.value * unitFactor(part.unit), 0);
    }
    const range = source.match(
      /([0-9]+(?:[.,][0-9]+)?)\s*(?:-|–|—|bis|to)\s*([0-9]+(?:[.,][0-9]+)?)\s*(stunden?|std|hours?|hrs?|h|minuten?|minutes?|mins?|min)\b/,
    );
    if (range) return Number(range[2].replace(",", ".")) * unitFactor(range[3]);
    const parts = tokens(source);
    if (!parts.length) return null;
    return parts.reduce((sum, part) => sum + part.value * unitFactor(part.unit), 0);
  }
  function formatTime(value, locale = "de") {
    if (typeof value === "number")
      return Number.isFinite(value) && value > 0
        ? `${value} ${locale === "de" ? "Min." : "min"}`
        : "";
    const text = String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");
    return /^\d+(?:[.,]\d+)?$/.test(text) ? `${text} ${locale === "de" ? "Min." : "min"}` : text;
  }
  function recipeServings(recipe) {
    const known = Number(recipe?.recipeServings);
    if (Number.isFinite(known) && known > 0) return known;
    const unit = clean(recipe?.recipeYield || ""),
      count = Number(recipe?.recipeYieldQuantity);
    return Number.isFinite(count) &&
      count > 0 &&
      /\b(person|personen|portion|portionen|serving|servings)\b/.test(unit)
      ? count
      : null;
  }
  function scaleIngredient(row, targetServings, baseServings) {
    const raw = typeof row === "string" ? row : ingredient(row),
      target = Number(targetServings),
      base = Number(baseServings);
    if (
      !raw ||
      !Number.isFinite(target) ||
      !Number.isFinite(base) ||
      target < 1 ||
      base < 1 ||
      target === base
    )
      return raw;
    const match = raw.match(/^(\s*)(\d+(?:[.,]\d+)?)(\s+.*)$/);
    if (!match) return raw;
    const amount = (Number(match[2].replace(",", ".")) * target) / base;
    const scaled = Number(amount.toFixed(2)).toLocaleString("de-DE", { maximumFractionDigits: 2 });
    return `${match[1]}${scaled}${match[3]}`;
  }
  // Treat a pantry match as a verified quantity claim, not just a shared word.
  // Mealie has both structured foods/units and legacy display-only ingredients.
  const unitInfo = (raw) => {
    const s = clean(raw).replace(/\s+/g, "");
    if (["g", "gram", "grams", "gramm"].includes(s)) return { unit: "g", factor: 1 };
    if (["kg", "kilogram", "kilograms", "kilogramm"].includes(s))
      return { unit: "g", factor: 1000 };
    if (["ml", "milliliter", "milliliters", "millilitre"].includes(s))
      return { unit: "ml", factor: 1 };
    if (["l", "liter", "litre", "liters"].includes(s)) return { unit: "ml", factor: 1000 };
    if (["stück", "stueck", "stk", "piece", "pieces"].includes(s))
      return { unit: "stück", factor: 1 };
    return { unit: s, factor: 1 };
  };
  function parseIngredient(row) {
    const raw = typeof row === "string" ? row : ingredient(row);
    const m = raw
      .trim()
      .match(
        /^(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(kg|g|gramm|ml|l|stück|stueck|stk|el|tl)?(?:\s+|$)/i,
      );
    const structured =
      typeof row === "object" &&
      row !== null &&
      row.food?.name &&
      typeof row.quantity === "number" &&
      Number.isFinite(row.quantity) &&
      row.quantity > 0;
    const source = structured ? unitInfo(row.unit?.name || "") : unitInfo(m?.[3] || "");
    const quantity = structured
      ? Math.round(row.quantity * source.factor * 1000) / 1000
      : m
        ? Math.round(Number((m[2] || m[1]).replace(",", ".")) * source.factor * 1000) / 1000
        : null;
    const label = structured
      ? String(row.food.name).trim()
      : raw
          .slice(m ? m[0].length : 0)
          .replace(/^[,;\s]+/, "")
          .trim() || raw;
    // Missing units, spoons and unknown units are never silently converted to g/ml.
    // Quantity without a unit means pieces, but is explicitly marked estimated.
    const unit = !structured && !source.unit && quantity !== null ? "stück" : source.unit;
    return {
      label,
      raw,
      quantity,
      unit,
      estimated:
        !quantity ||
        !["g", "ml", "stück"].includes(unit) ||
        (unit === "stück" && !structured && !m?.[3]) ||
        ["el", "tl"].includes(unit),
    };
  }
  const prepWords = new Set(
    "frisch frische frischer frischen fein gehackt gerieben gewurfelt geschnitten geschalt geschält reif reife roh bio klein kleine mittel groß grosse großen".split(
      " ",
    ),
  );
  const identity = (name) =>
    words(name)
      .filter((w) => !prepWords.has(w))
      .sort()
      .join("|");
  const sameFood = (a, b) => !!identity(a) && identity(a) === identity(b);
  const goodStock = (row, today) =>
    row &&
    (!row.expires || row.expires >= today) &&
    Number.isFinite(Number(row.amount)) &&
    Number(row.amount) >= 0;
  function pantryCoverage(ingredientRows, pantry = []) {
    const today = new Date().toISOString().slice(0, 10),
      ledger = new Map();
    for (const p of pantry) {
      if (!goodStock(p, today)) continue;
      const unit = unitInfo(p.unit);
      if (!["g", "ml", "stück"].includes(unit.unit)) continue;
      const key = identity(p.name) + "/" + unit.unit;
      if (!identity(p.name)) continue;
      const old = ledger.get(key) || { quantity: 0, staple: false, expires: [] };
      old.quantity += Number(p.amount) * unit.factor;
      old.staple ||= p.staple === true;
      if (p.expires) old.expires.push(p.expires);
      ledger.set(key, old);
    }
    return ingredientRows.map((row) => {
      const item = parseIngredient(row),
        key = identity(item.label) + "/" + item.unit,
        stock = ledger.get(key);
      if (item.quantity === null || !["g", "ml", "stück"].includes(item.unit))
        return { ...item, covered: false, available: 0, unknown: true, expiring: false };
      if (!stock) return { ...item, covered: false, available: 0, unknown: false, expiring: false };
      const available = stock.staple ? Infinity : Math.max(0, stock.quantity);
      const covered = available >= item.quantity;
      if (!stock.staple) stock.quantity = Math.max(0, stock.quantity - item.quantity);
      const expiring =
        covered &&
        stock.expires.some(
          (d) => d >= today && Date.parse(d + "T12:00:00Z") - Date.now() <= 4 * 86400000,
        );
      return { ...item, covered, available, unknown: false, expiring };
    });
  }
  function recipeTags(recipe) {
    return [...(recipe.tags || []), ...(recipe.recipeCategory || [])].map((x) =>
      clean(x?.name || x),
    );
  }
  function cookbookRule(book) {
    const parts = book?.queryFilter?.parts;
    if (!Array.isArray(parts) || parts.length !== 1) return null;
    const part = parts[0];
    if (
      !["tags.id", "recipe_category.id"].includes(part?.attributeName) ||
      part?.relationalOperator !== "IN" ||
      !Array.isArray(part.value) ||
      !part.value.length
    )
      return null;
    return {
      field: part.attributeName === "tags.id" ? "tags" : "recipeCategory",
      ids: new Set(part.value.map(String)),
    };
  }
  function supportedCookbooks(cookbooks = []) {
    return cookbooks
      .filter((book) => book?.slug && book?.name && cookbookRule(book))
      .sort(
        (a, b) =>
          (Number(a.position) || 0) - (Number(b.position) || 0) ||
          String(a.name).localeCompare(String(b.name), "de"),
      );
  }
  function matchesCookbook(recipe, book) {
    const rule = cookbookRule(book);
    if (!rule) return false;
    return (Array.isArray(recipe?.[rule.field]) ? recipe[rule.field] : []).some((item) =>
      rule.ids.has(String(item?.id || "")),
    );
  }
  function searchMatch(recipe, query) {
    const q = clean(query);
    if (!q) return "match";
    const terms = q.split(" ").filter(Boolean);
    const recipeText = [recipe?.name];
    const ingredientText = (recipe?.recipeIngredient || []).map(ingredient);
    const hasTerm = (value, term) => {
      const text = clean(value);
      return (
        text.includes(term) ||
        text
          .split(" ")
          .some(
            (token) =>
              token === term ||
              (term.length >= 4 && token.startsWith(term)) ||
              (token.length >= 4 && term.startsWith(token)),
          )
      );
    };
    const hasQuery = (values) => {
      const text = clean(values.join(" "));
      return text.includes(q) || (terms.length > 1 && terms.every((term) => hasTerm(text, term)));
    };
    const recipeMatch = hasQuery(recipeText),
      ingredientMatch = hasQuery(ingredientText);
    if (recipeMatch && ingredientMatch) return "mixed";
    if (
      terms.length > 1 &&
      recipeText.some((value) => terms.some((term) => hasTerm(value, term))) &&
      ingredientText.some((value) => terms.some((term) => hasTerm(value, term))) &&
      terms.every((term) => recipeText.concat(ingredientText).some((value) => hasTerm(value, term)))
    )
      return "mixed";
    return ingredientMatch ? "ingredient" : recipeMatch ? "recipe" : "match";
  }
  function convertMeasurementQuery(query) {
    const match = String(query || "")
      .trim()
      .match(
        /^([+-]?(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?))\s*(fl[ -]?oz|[\p{L}°-]+)\s*(?:to|in|into|nach|→)\s*(fl[ -]?oz|[\p{L}°-]+)$/iu,
      );
    if (!match) return null;
    const parseAmount = (value) => {
      const mixed = value.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/);
      if (mixed) {
        const whole = Number(mixed[1]);
        const numerator = Number(mixed[2]);
        const denominator = Number(mixed[3]);
        return denominator ? whole + Math.sign(whole || 1) * (numerator / denominator) : NaN;
      }
      const fraction = value.match(/^(\d+)\/(\d+)$/);
      if (fraction) return Number(fraction[2]) ? Number(fraction[1]) / Number(fraction[2]) : NaN;
      return Number(value.replace(",", "."));
    };
    const sourceUnit = match[2].toLowerCase().replace(/\s+/g, "-");
    const targetUnit = match[3].toLowerCase().replace(/\s+/g, "-");
    const units = {
      g: { family: "mass", factor: 1, label: "g" },
      gram: { family: "mass", factor: 1, label: "g" },
      grams: { family: "mass", factor: 1, label: "g" },
      gramm: { family: "mass", factor: 1, label: "g" },
      kg: { family: "mass", factor: 1000, label: "kg" },
      kilogram: { family: "mass", factor: 1000, label: "kg" },
      mg: { family: "mass", factor: 0.001, label: "mg" },
      oz: { family: "mass", factor: 28.349523125, label: "oz" },
      ounce: { family: "mass", factor: 28.349523125, label: "oz" },
      ounces: { family: "mass", factor: 28.349523125, label: "oz" },
      lb: { family: "mass", factor: 453.59237, label: "lb" },
      lbs: { family: "mass", factor: 453.59237, label: "lb" },
      pound: { family: "mass", factor: 453.59237, label: "lb" },
      pounds: { family: "mass", factor: 453.59237, label: "lb" },
      ml: { family: "volume", factor: 1, label: "ml" },
      milliliter: { family: "volume", factor: 1, label: "ml" },
      milliliters: { family: "volume", factor: 1, label: "ml" },
      millilitre: { family: "volume", factor: 1, label: "ml" },
      millilitres: { family: "volume", factor: 1, label: "ml" },
      l: { family: "volume", factor: 1000, label: "l" },
      liter: { family: "volume", factor: 1000, label: "l" },
      litre: { family: "volume", factor: 1000, label: "l" },
      tsp: { family: "volume", factor: 4.92892159375, label: "tsp" },
      teaspoon: { family: "volume", factor: 4.92892159375, label: "tsp" },
      teaspoons: { family: "volume", factor: 4.92892159375, label: "tsp" },
      tl: { family: "volume", factor: 5, label: "tsp" },
      tbsp: { family: "volume", factor: 14.78676478125, label: "tbsp" },
      tablespoon: { family: "volume", factor: 14.78676478125, label: "tbsp" },
      tablespoons: { family: "volume", factor: 14.78676478125, label: "tbsp" },
      el: { family: "volume", factor: 15, label: "tbsp" },
      cup: { family: "volume", factor: 236.5882365, label: "cup" },
      cups: { family: "volume", factor: 236.5882365, label: "cups" },
      "fl-oz": { family: "volume", factor: 29.5735295625, label: "fl oz" },
      floz: { family: "volume", factor: 29.5735295625, label: "fl oz" },
      c: { family: "temperature", label: "°C" },
      "°c": { family: "temperature", label: "°C" },
      celsius: { family: "temperature", label: "°C" },
      f: { family: "temperature", label: "°F" },
      "°f": { family: "temperature", label: "°F" },
      fahrenheit: { family: "temperature", label: "°F" },
    };
    const source = units[sourceUnit],
      target = units[targetUnit];
    if (!source || !target) return null;
    const amount = parseAmount(match[1]);
    if (source.family !== target.family) {
      if (
        [source.family, target.family].includes("mass") &&
        [source.family, target.family].includes("volume")
      )
        return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000
          ? {
              amount,
              sourceUnit: source.label,
              targetUnit: target.label,
              unsupported: "density-required",
            }
          : null;
      return null;
    }
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return null;
    let converted;
    if (source.family === "temperature") {
      const sourceIsCelsius = source.label === "°C";
      const targetIsCelsius = target.label === "°C";
      converted =
        sourceIsCelsius === targetIsCelsius
          ? amount
          : sourceIsCelsius
            ? amount * (9 / 5) + 32
            : (amount - 32) * (5 / 9);
    } else {
      converted = (amount * source.factor) / target.factor;
    }
    return {
      amount,
      sourceUnit: source.label,
      converted: Number(converted.toFixed(4)),
      targetUnit: target.label,
      family: source.family,
    };
  }
  function dietSafe(recipe, profile = {}) {
    const tags = recipeTags(recipe),
      rows = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [];
    let style = profile.mealStyle || "";
    if (!style && profile.diets?.length)
      style = profile.diets.includes("vegan")
        ? "vegan"
        : profile.diets.includes("vegetarian")
          ? "vegetarian"
          : "";
    const names = rows.map(ingredient).filter(Boolean).map(clean),
      all = names.join(" ");
    const tagged = (...terms) => tags.some((tag) => terms.some((term) => tag.includes(term)));
    const has = (pattern) => pattern.test(all);
    // German puts the animal anywhere in a compound (Hähnchenbrust, Miesmuscheln, Seelachs), so most
    // meat and fish stems match inside words, across every option of a line ("Gemüse- oder
    // Hühnerbrühe"). A plant marker only counts when it describes the product as written, not an
    // alternative after "oder" or "vegan:". "Vegetarisch" or "Protein" on cheese does not make it vegan. Look-alikes (Kürbisfleisch, Hühnereier,
    // Parmesanrinde, Steakpfeffer, Hirschhornsalz) are removed first.
    const main = rows
      .map(ingredient)
      .filter(Boolean)
      .map((text) =>
        clean(
          text.replace(
            /\s*[(,;]?\s*(?:\b(?:oder|or|alternativ\w*|ersatzweise|statt|instead)\b|\b(?:vegan|vegetarisch|vegetarian)\s*:).*$/i,
            "",
          ),
        ),
      );
    const plant =
      /\b(?:vegan\w*|vegetari\w*|veggie\w*|pflanzlich\w*|plant based|fleischfrei\w*|fleischlos\w*|fleischersatz|meatless|beyond|tofu\w*|seitan|tempeh|\w*protein)\b|\bsoja(?!\s?(?:sauce|sose|soße|sosse))\w*/;
    const veganMark =
      /\b(?:vegan\w*|pflanzlich\w*|plant based|beyond|tofu\w*|seitan|tempeh)\b|\bsoja(?!\s?(?:sauce|sose|soße|sosse))\w*/;
    const plantDairy =
      /\b(?:hafer|soja|mandel|kokos|kokosnuss|reis|cashew|erbsen|dinkel|pflanzen|hasel|haselnuss|hanf|lupinen|nuss|oat|almond|soy|coconut|rice|peanut|cocoa|nut)\s?(?:koch|schlag)?(?:milch|sahne|rahm|drink|joghurt|butter|cuisine|creme|cream|milk|yogurt)\b|\b(?:cashew|nuss|mandel)kase\b/g;
    const lookalike =
      /\w*(?:frucht|kurbis|mango|kokos|melonen?|avocado|papaya|ananas)fleisch\w*|\bfleischtomate\w*|\bkokos\w*|\w*(?:huhner|enten|wachtel|ganse)\s?ei(?:er)?\b|\w*rinden?\b|\brinds? of\b|\b(?:lemon|lime|orange|citrus|zitronen|orangen|limetten|parmesan|cheese|melon|watermelon)\s+rinds?\b|\bauster\w*\s?(?:pilz|seitling)\w*|\boyster mushrooms?\b|\bmuschelnudel\w*|\bbeefsteak tomato\w*|\w*gewu(?:e)?rz(?:mischung|salz)?\b|\w+\s+gewu(?:e)?rz(?:mischung)?\b|\b(?:chicken|poultry|steak|beef)\s+(?:seasoning|spice|rub)\b|\bsteak(?:pfeffer|salz|sauce|sose|soße)\b|\bhirschhorn\w*|\blamb\s?s\s+lettuce\b|(?<=\b(?:cauliflower|celeriac|mushroom|portobello|cabbage|tofu|tuna|salmon|swordfish|sellerie|blumenkohl|kohl|kohlrabi|rotkohl|weisskohl|weißkohl|auberginen?|pilz|kurbis|thunfisch|lachs|in)\s)steaks?\b/g;
    const flesh = names
      .filter((name, index) => !plant.test(main[index]))
      .map((name) => name.replace(lookalike, " "));
    const dairy = names
      .filter((name, index) => !veganMark.test(main[index]))
      .map((name) => name.replace(plantDairy, " "));
    const eats = (pattern) => flesh.some((name) => pattern.test(name));
    const meat =
      /fleisch|wurst|schinken|speck|salami|chorizo|salsiccia|schwein|huhn|hahnchen|haehnchen|geflugel|gefluegel|truthahn|hirsch|kaninchen|kasseler|kotelett|gyros|wachtel|wildente|brisket|ground chuck|(?:nacken|minuten|filet|huft|rump)steak|\bhasen?\b|(?<!g|tama)rind|(?<!ge)hack(?!t|en\b|er\b)|(?<![fc])lamm|gans(?:e\w*)?\b|\b(?:kalb|pute|(?:barbarie|flug|peking)?ente|mett|leber|schnitzel|frikadelle|bacon|pancetta|guanciale|prosciutto|beef|pork|chicken|turkey|veal|duck|lamb(?!rusco)|venison|rabbit|goose(?!berr)|mutton|sausage|rumpsteak|huftsteak|roastbeef)|(?<!(?:crab|lobster|coconut)\s?)\bmeat|\b(?:ham|mince|steaks?)\b|\bgehacktes(?:$|\s+(?:halb|gemischt|vom|aus|rind|schwein))|\bwild(?:schwein|gulasch|ragout|ragu|braten|keule|fond)|\bwild(?:$|\s+(?:vom|aus|gewurfelt|oder|tiefgekuhlt))|\breh(?:\b|rucken|keule|gulasch|ragout|braten|medaillon)/;
    const seafood =
      /fisch|(?<!f)lachs(?!schinken)|forelle|kabeljau|garnele|shrimp|krabbe|muschel|sardine|sardelle|anchovi|anchov|matjes|hering|herring|calamar|oktopus|octopus|dorade|zander|scholle|hummer|languste|auster|scampi|meeresfrucht|makrele|karpfen|barsch|heilbutt|seezunge|krebs|pangasius|tilapia|worcester|fish|\b(?:kaviar|salmon|tuna|prawn|crab|lobster|mussel|clam|oyster|squid|scallop|mackerel|trout|halibut|haddock|pollock|seafood)|\b(?:raucher)?aal\b|\bcod\b/;
    const animal =
      /\w*(?:kase|kaese|milch|sahne|rahm|joghurt)\b|\b(feta|gouda|ricotta|mascarpone|pecorino|cheddar|emmentaler|gruyere|brie|camembert|halloumi|burrata|schmand|creme fraiche|ghee|butterschmalz|skyr|milch|joghurt|quark|sahne|rahm|butter|ei|eier|eigelb|honig|gelatine|molke|parmesan|mozzarella|cream|cheese|yogurt|milk|egg|eggs|honey)\b|(?:huhner|enten|wachtel|ganse)\s?ei(?:er)?\b|\beiernudel\w*|\beiwei(?:ss|ß)/;
    if (
      style === "vegan" &&
      (eats(meat) ||
        eats(seafood) ||
        dairy.some((name) => animal.test(name)) ||
        (!tagged("vegan") && (!rows.length || names.length !== rows.length)))
    )
      return false;
    if (
      style === "vegetarian" &&
      (eats(meat) ||
        eats(seafood) ||
        /\b(gelatine|gelatin)\b/.test(all) ||
        (!tagged("vegetarian", "vegetarisch") && (!rows.length || names.length !== rows.length)))
    )
      return false;
    if (style === "meat" && !tagged("fleisch", "meat") && !eats(meat)) return false;
    if (style === "fish" && !tagged("fisch", "fish", "seafood") && !eats(seafood)) return false;
    if (
      profile.kidFriendly === true &&
      has(/\b(chili|chilli|scharf|sriracha|jalapeno|cayenne|hot sauce|habanero)\b/) &&
      !tagged("mild", "kind", "kinderfreundlich")
    )
      return false;
    const diets = profile.diets || [];
    if (
      !profile.mealStyle &&
      diets.length &&
      !diets.every((d) => tags.some((x) => x.includes(clean(d))))
    )
      return false;
    const excluded = profile.exclude || [];
    if (
      excluded.length &&
      Array.isArray(recipe.recipeIngredient) &&
      recipe.recipeIngredient.some((i) =>
        excluded.some((x) =>
          clean(x) === "scharfe"
            ? /\b(chili|chilli|scharf|sriracha|jalapeno|cayenne|hot sauce|habanero)\b/.test(
                clean(ingredient(i)),
              )
            : similarity(ingredient(i), x),
        ),
      )
    )
      return false;
    return true;
  }
  function recommendation(recipe, profile = {}, pantry = [], journal = {}) {
    if (!dietSafe(recipe, profile)) return null;
    const rows = recipe.recipeIngredient || [];
    const coverage = pantryCoverage(rows, pantry);
    const available = coverage.filter((x) => x.covered),
      expiring = coverage.filter((x) => x.expiring);
    const unknown = coverage.filter((x) => x.unknown).length;
    const timeSource = recipe.totalTime || recipe.prepTime || recipe.performTime;
    const prep = durationMinutes(timeSource);
    if (profile.maxMinutes && prep && prep > profile.maxMinutes) return null;
    const feedback = journal[recipe.slug] || {};
    const age = feedback.lastCooked
      ? Math.max(0, (Date.now() - Date.parse(feedback.lastCooked)) / 86400000)
      : 999;
    const timeBonus = prep
      ? prep <= Number(profile.maxMinutes || 40)
        ? 20
        : -Math.min(30, prep - Number(profile.maxMinutes || 40))
      : 0;
    const pantryBoost =
      profile.usePantry === false
        ? 0
        : (rows.length ? (available.length / rows.length) * 32 : 0) + expiring.length * 8;
    const kidTags = recipeTags(recipe).some((x) => /\b(kind|kinder|family|familie|mild)\b/.test(x));
    const mildBonus = profile.kidFriendly === true && kidTags ? 8 : 0;
    const serves = recipeServings(recipe) || 0,
      people = Math.max(1, Number(profile.people) || 2);
    const portionBonus = serves ? Math.max(0, 8 - Math.min(8, Math.abs(serves - people) * 2)) : 0;
    const score =
      30 +
      pantryBoost +
      timeBonus +
      mildBonus +
      portionBonus +
      (Number(feedback.rating) || 0) * 6 +
      (feedback.favorite === true ? 14 : 0) +
      (age < 3 ? -35 : age < 10 ? -15 : 6);
    // Reasons are translation keys with values; the UI resolves them in the active locale.
    const reasons = [
      profile.usePantry === false
        ? null
        : available.length
          ? {
              key: "studioReasonPantryCovered",
              values: { covered: available.length, total: rows.length },
            }
          : { key: "studioReasonPantryUnchecked" },
      unknown
        ? { key: "studioReasonAmountsUnclear", values: { count: unknown }, plural: true }
        : null,
      profile.kidFriendly && kidTags ? { key: "studioReasonFamilyFriendly" } : null,
      serves
        ? { key: "studioReasonServingsBase", values: { servings: serves } }
        : { key: "studioReasonServingsOpen" },
      prep && prep <= Number(profile.maxMinutes || 40)
        ? { key: "studioReasonWithinBudget", values: { minutes: prep } }
        : prep
          ? { key: "studioReasonOverBudget", values: { minutes: prep } }
          : null,
    ].filter(Boolean);
    return {
      slug: recipe.slug,
      id: recipe.id,
      name: recipe.name,
      totalTime: prep,
      timeLabel: formatTime(timeSource),
      servings: serves || null,
      people,
      score: Math.round(score),
      available: available.length,
      total: rows.length,
      missing: Math.max(0, rows.length - available.length - unknown),
      unknown,
      expiring: profile.usePantry === false ? 0 : expiring.length,
      rating: Number(feedback.rating) || 0,
      reasons,
      recipe,
    };
  }
  function suggest(recipes, profile = {}, pantry = [], journal = {}, cookbooks = []) {
    const selected = new Set(Array.isArray(profile.cookbooks) ? profile.cookbooks : []),
      available = supportedCookbooks(cookbooks),
      selectedBooks = available.filter((book) => selected.has(book.slug));
    const candidates = selected.size
      ? recipes.filter((recipe) => selectedBooks.some((book) => matchesCookbook(recipe, book)))
      : recipes;
    return candidates
      .map((r) => recommendation(r, profile, pantry, journal))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name), "de"));
  }
  function planWeek(
    recipes,
    profile = {},
    pantry = [],
    journal = {},
    existing = [],
    start = new Date(),
  ) {
    const ranked = suggest(recipes, profile, pantry, journal);
    const bySlug = new Map(recipes.map((x) => [x.slug, x]));
    const used = new Map(),
      result = [];
    let previousIngredients = [];
    const day0 = new Date(start);
    day0.setHours(12, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(day0);
      d.setDate(day0.getDate() + i);
      const date = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");
      if (existing.some((e) => e.date === date && e.entryType === "dinner")) continue;
      const candidates = ranked
        .map((x) => {
          const names = (bySlug.get(x.slug)?.recipeIngredient || []).map(ingredient);
          const overlap = previousIngredients.filter((name) =>
            names.some((other) => similarity(name, other)),
          ).length;
          const timesUsed = used.get(x.slug) || 0;
          return { ...x, planScore: x.score + Math.min(18, overlap * 5) - timesUsed * 90, overlap };
        })
        .sort((a, b) => b.planScore - a.planScore);
      const chosen = candidates[0];
      if (!chosen || (!chosen.id && !chosen.slug)) continue;
      used.set(chosen.slug, (used.get(chosen.slug) || 0) + 1);
      previousIngredients = (bySlug.get(chosen.slug)?.recipeIngredient || []).map(ingredient);
      result.push({
        date,
        meal_type: "dinner",
        recipe_id: chosen.id,
        slug: chosen.slug,
        name: chosen.name,
        reasons: chosen.overlap
          ? [...chosen.reasons, { key: "studioReasonSharedIngredients" }]
          : chosen.reasons,
        score: chosen.planScore,
      });
      // Optional leftover lunch: only if recipe explicitly makes >= 2x household size.
      if (
        (recipeServings(bySlug.get(chosen.slug)) || 0) >=
          Math.max(1, Number(profile.people) || 2) * 2 &&
        i < 6
      ) {
        const n = new Date(d);
        n.setDate(n.getDate() + 1);
        const next = [
          n.getFullYear(),
          String(n.getMonth() + 1).padStart(2, "0"),
          String(n.getDate()).padStart(2, "0"),
        ].join("-");
        if (
          !existing.some((e) => e.date === next && e.entryType === "lunch") &&
          !result.some((e) => e.date === next && e.meal_type === "lunch")
        )
          result.push({
            date: next,
            meal_type: "lunch",
            recipe_id: chosen.id,
            slug: chosen.slug,
            name: chosen.name,
            reasons: [{ key: "studioReasonTwoMeals" }],
            leftovers: true,
          });
      }
    }
    return result.sort(
      (a, b) => a.date.localeCompare(b.date) || a.meal_type.localeCompare(b.meal_type),
    );
  }
  // Aisle ids; the UI maps them to localized headings (studioAisle*).
  const category = (name) => {
    const s = clean(name);
    if (/milch|kaese|käse|joghurt|quark|sahne|butter/.test(s)) return "chilled";
    if (/brot|mehl|nudel|reis|hafer|linsen|bohnen|kichererbse/.test(s)) return "pantry";
    if (/gewurz|salz|pfeffer|ol|öl|essig|zucker/.test(s)) return "spices";
    if (/fleisch|wurst|fisch|tofu|tempeh/.test(s)) return "protein";
    return "produce";
  };
  function shoppingNeeds(recipes, pantry = [], profile = {}) {
    const combined = [];
    for (const recipe of recipes) {
      const factor = Math.max(
        0.1,
        Math.min(
          12,
          Number(profile.people || 2) /
            Math.max(1, recipeServings(recipe) || Number(profile.people) || 2),
        ),
      );
      for (const row of recipe?.recipeIngredient || []) {
        const ing = parseIngredient(row);
        if (!ing.label) continue;
        if (ing.quantity !== null) ing.quantity = Math.round(ing.quantity * factor * 100) / 100;
        const found = combined.find(
          (x) =>
            sameFood(x.name, ing.label) &&
            x.unit === ing.unit &&
            x.quantity !== null &&
            ing.quantity !== null,
        );
        if (found) {
          found.quantity += ing.quantity;
          found.recipeNames.push(recipe.name);
        } else
          combined.push({
            name: ing.label,
            quantity: ing.quantity,
            unit: ing.unit,
            category: category(ing.label),
            recipeNames: [recipe.name],
            uncertain: ing.estimated,
          });
      }
    }
    // Allocate stock exactly once across repeated ingredients and recipes.
    // Unknown/volume-incompatible measures stay on the list as uncertain.
    const today = new Date().toISOString().slice(0, 10),
      stock = new Map();
    for (const row of pantry) {
      if (!goodStock(row, today)) continue;
      const unit = unitInfo(row.unit);
      if (!["g", "ml", "stück"].includes(unit.unit)) continue;
      const key = identity(row.name) + "/" + unit.unit;
      if (!identity(row.name)) continue;
      const old = stock.get(key) || { amount: 0, staple: false };
      old.amount += Number(row.amount) * unit.factor;
      old.staple ||= row.staple === true;
      stock.set(key, old);
    }
    return combined
      .map((item) => {
        const s = stock.get(identity(item.name) + "/" + item.unit);
        const supported = ["g", "ml", "stück"].includes(item.unit);
        const have = s && supported ? (s.staple ? Infinity : s.amount) : 0;
        const needed =
          item.quantity === null || !supported
            ? null
            : Math.max(0, Math.round((item.quantity - have) * 100) / 100);
        if (s && !s.staple && needed !== null) s.amount = Math.max(0, s.amount - item.quantity);
        return {
          ...item,
          have,
          needed,
          inStock: needed === 0 && item.quantity !== null,
          uncertain: item.uncertain || item.quantity === null || !supported,
        };
      })
      .filter((x) => !x.inStock)
      .sort(
        (a, b) => a.category.localeCompare(b.category, "de") || a.name.localeCompare(b.name, "de"),
      );
  }
  function audit(recipe) {
    const problems = [];
    const ingredients = recipe.recipeIngredient || [],
      steps = recipe.recipeInstructions || [];
    if (!ingredients.length)
      problems.push({
        severity: "error",
        field: "ingredients",
        key: "studioAuditNoIngredients",
      });
    if (!steps.length)
      problems.push({
        severity: "error",
        field: "steps",
        key: "studioAuditNoSteps",
      });
    for (let i = 0; i < ingredients.length; i++) {
      const p = parseIngredient(ingredients[i]);
      if (p.quantity === null)
        problems.push({
          severity: "warning",
          field: "ingredients",
          index: i,
          key: "studioAuditAmountUnclear",
          values: { item: p.raw },
        });
      if (p.quantity > 10000 && p.unit === "g")
        problems.push({
          severity: "warning",
          field: "ingredients",
          index: i,
          key: "studioAuditAmountLarge",
          values: { item: p.raw },
        });
    }
    if (!recipeServings(recipe))
      problems.push({
        severity: "warning",
        field: "servings",
        key: "studioAuditServingsInvalid",
      });
    if (!recipe.totalTime && !recipe.prepTime)
      problems.push({ severity: "info", field: "time", key: "studioAuditTimeMissing" });
    const seen = new Set();
    for (let i = 0; i < ingredients.length; i++) {
      const p = parseIngredient(ingredients[i]);
      const key = clean(p.label);
      if (seen.has(key) && key.length > 2)
        problems.push({
          severity: "warning",
          field: "ingredients",
          index: i,
          key: "studioAuditDuplicate",
          values: { item: p.label },
        });
      seen.add(key);
    }
    return {
      name: recipe.name,
      problems,
      score: Math.max(
        0,
        100 -
          problems.reduce(
            (v, x) => v + (x.severity === "error" ? 30 : x.severity === "warning" ? 9 : 3),
            0,
          ),
      ),
    };
  }
  // Swap texts and the warning are translation keys; the UI resolves them per locale.
  const swaps = [
    ["sahne", "studioSwapCream"],
    ["butter", "studioSwapButter"],
    ["ei", "studioSwapEgg"],
    ["milch", "studioSwapMilk"],
    ["champignon", "studioSwapMushroom"],
    ["quark", "studioSwapQuark"],
    ["parmesan", "studioSwapParmesan"],
    ["mehl", "studioSwapFlour"],
    ["zucker", "studioSwapSugar"],
  ];
  function substitutions(ingredientName) {
    const v = clean(ingredientName);
    return swaps
      .filter(([k]) => v.includes(k))
      .map(([from, to]) => ({
        from,
        to,
        warning: "studioSwapWarning",
      }));
  }
  function safeHelperTasks(recipe) {
    const steps = recipe.recipeInstructions || [];
    const safe = /wasch|spul|spül|auf den tisch|servier|garnier|rühr|misch|sortier|dekorier/i,
      unsafe =
        /mess|schneid|hack|heiß|heiss|ofen|backofen|pfanne|koch|frittier|messer|flamme|topf|elektrisch|mixgerät/i;
    return steps
      .map((row, i) => ({ step: i, text: String(row.text || row) }))
      .filter((x) => safe.test(x.text) && !unsafe.test(x.text))
      .slice(0, 6)
      .map((x) => ({ ...x, requiresAdultApproval: true }));
  }
  return {
    clean,
    similarity,
    ingredient,
    scaleIngredient,
    parseIngredient,
    pantryCoverage,
    durationMinutes,
    formatTime,
    recipeServings,
    recommendation,
    suggest,
    planWeek,
    shoppingNeeds,
    audit,
    substitutions,
    safeHelperTasks,
    cookbookRule,
    supportedCookbooks,
    matchesCookbook,
    searchMatch,
    convertMeasurementQuery,
    DISCOVER_MINUTES,
    discoverMinutes,
  };
})();
/* Add kitchen workflows to the card while routing remote calls through the shared bridge client. */
const _atOriginalBody = MealieAtelierCard.prototype._body;
const _atOriginalRefresh = MealieAtelierCard.prototype._refresh;
const _atOriginalClick = MealieAtelierCard.prototype._handleClick;
const _atOriginalSubmit = MealieAtelierCard.prototype._handleSubmit;
const _atOriginalModal = MealieAtelierCard.prototype._modalHtml;
const _atOriginalOpenRecipe = MealieAtelierCard.prototype._openRecipe;
const _atOriginalTick = MealieAtelierCard.prototype._tickTimers;
const _atOriginalConnected = MealieAtelierCard.prototype.connectedCallback;
const _atOriginalDisconnected = MealieAtelierCard.prototype.disconnectedCallback;
const atDate = (d, locale = "en-US") => {
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? ""
    : x.toLocaleDateString(locale, { day: "2-digit", month: "short" });
};
const atQty = (n, locale = "en-US") =>
  n == null ? "?" : Number(n).toLocaleString(locale, { maximumFractionDigits: 1 });
const atInitially = () => ({
  revision: 0,
  profile: { people: 2, maxMinutes: 40, diets: [], exclude: [], quietHours: false },
  pantry: [],
  journal: {},
  family: { members: [], session: null },
});
// Core results carry translation keys; resolve them in the active locale.
const atMessage = (t, item) => t(item.key, item.values);
const atAisleKeys = {
  chilled: "studioAisleChilled",
  pantry: "studioAislePantry",
  spices: "studioAisleSpices",
  protein: "studioAisleProtein",
  produce: "studioAisleProduce",
};
function atGroup(rows) {
  return [...new Set(rows.map((x) => x.category))].map((k) => ({
    category: k,
    rows: rows.filter((x) => x.category === k),
  }));
}
Object.assign(MealieAtelierCard.prototype, {
  async _studioRefresh({ silent = false } = {}) {
    try {
      const v = await this._ws("studio_state");
      if (v && Number.isInteger(v.revision)) {
        const prev = this._studio?.revision;
        this._studio = v;
        this._journal = v.journal || {};
        if (
          this._modal === "cook" &&
          this._detail &&
          v.family?.session?.slug === this._detail.slug
        ) {
          const steps = asArray(this._detail.recipeInstructions);
          this._cookIndex = Math.min(
            Math.max(0, Number(v.family.session.step) || 0),
            Math.max(0, steps.length - 1),
          );
        }
        if (
          !silent ||
          (prev !== v.revision &&
            !this.shadowRoot.activeElement?.matches?.("input,textarea,select"))
        )
          this._render();
      }
    } catch (error) {
      this._studioError = error?.message || this.t("studioConnectionFailed");
      if (!silent) this._render();
    }
  },
  async _studioWrite(action, payload) {
    // The personal journal needs no write grant; only a read-only kitchen blocks it.
    const allowed = action === "journal_set" ? this._canJournal : this._permissions.can_write;
    if (!allowed) {
      this._error = this._noWriteGrant ? this._noWriteGrantText : this.t("readOnlyHint");
      this._render();
      return false;
    }
    try {
      const next = await this._ws("studio_update", {
        action,
        payload,
        expected_revision: this._studio?.revision ?? 0,
      });
      this._studio = next;
      this._journal = next.journal || {};
      this._studioError = next.alarmWarnings?.join("; ") || "";
      this._render();
      return true;
    } catch (error) {
      this._studioError = error?.code
        ? this._errorText(error)
        : error?.message || this.t("studioSaveFailed");
      await this._studioRefresh();
      await this._recoverPermissions(error);
      return false;
    }
  },
  async _studioCatalog() {
    if (this._fullCatalog?.length) return this._fullCatalog;
    if (this._catalogLoading) return [];
    this._catalogLoading = true;
    this._catalogProgress = { loaded: 0, total: null };
    this._catalogLimited = false;
    this._render();
    try {
      const metadataRequest = this._ws("metadata").catch(() => null);
      const all = [];
      const pageSize = 60;
      const maxRecipes = 600;
      for (let page = 1; page <= Math.ceil(maxRecipes / pageSize); page++) {
        const data = await this._ws("recipes", { page, per_page: 60, search: "" });
        const items = asArray(data?.items);
        const total = Number(data?.total);
        if (Number.isFinite(total) && total >= 0) {
          this._catalogProgress.total = total;
          this._catalogTotal = total;
        }
        all.push(...items);
        this._catalogProgress.loaded = all.length;
        this._render();
        if (
          items.length < pageSize ||
          all.length >= maxRecipes ||
          (Number.isFinite(total) && all.length >= total)
        )
          break;
      }
      const metadata = await metadataRequest;
      this._studioCookbooks = AtelierStudio.supportedCookbooks(asArray(metadata?.cookbooks));
      const next = Array.from(new Map(all.map((x) => [x.slug, x])).values()).filter((x) => x.slug);
      const full = [];
      const batchSize = 8;
      for (let i = 0; i < next.length; i += batchSize) {
        const resolved = await Promise.allSettled(
          next.slice(i, i + batchSize).map((r) => this._ws("recipe", { slug: r.slug })),
        );
        resolved.forEach((v, j) => {
          if (v.status === "fulfilled") full.push(v.value);
          else full.push(next[i + j]);
        });
        this._catalogProgress.details = full.length;
        this._render();
      }
      this._fullCatalog = full;
      this._catalogLimited =
        this._catalogProgress.total !== null
          ? this._catalogProgress.total > all.length
          : all.length >= maxRecipes;
      this._studioError = "";
    } catch (error) {
      this._studioError = error?.message || this.t("studioAnalysisFailed");
    } finally {
      this._catalogLoading = false;
      this._catalogProgress = null;
      this._render();
    }
    return this._fullCatalog || [];
  },
  /** Bring the Kochinspo wizard back into view only when its top has scrolled out above. */
  _revealDiscover() {
    requestAnimationFrame(() => {
      const layout = this.shadowRoot.querySelector(".studio-discover-layout");
      // A wizard top that is still on screen is left where it is: nudging by a few pixels reads as a jump.
      if (layout && layout.getBoundingClientRect().top < 0)
        layout.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  },
  /** Scroll to the pantry form only when it is entirely off screen; a visible form keeps the page still. */
  _revealPantryForm(form) {
    const box = form.getBoundingClientRect();
    if (box.bottom > 0 && box.top < window.innerHeight) return;
    form.scrollIntoView({ block: "nearest", behavior: "smooth" });
  },
  _studioSuggestions() {
    return AtelierStudio.suggest(
      this._fullCatalog || asArray(this._data.recipes?.items),
      this._studio.profile,
      this._studio.pantry,
      this._studio.journal,
      this._studioCookbooks || [],
    );
  },
  // Units are stored as "g", "ml" and "stück"; only the piece unit needs a translated label.
  _studioUnit(unit) {
    return unit === "stück" ? this.t("studioPieceUnit") : unit || "";
  },
  _studioShell(title, lead, content, kicker = this.t("studioKicker")) {
    const progress = this._catalogProgress;
    const progressText = progress
      ? progress.details
        ? this.t("studioCatalogDetails", { loaded: progress.details, total: progress.loaded })
        : progress.total
          ? this.t("studioCatalogLoading", { loaded: progress.loaded, total: progress.total })
          : this.t("studioCatalogLoadingCount", { loaded: progress.loaded })
      : "";
    const limitCopy = `${this.t("studioCatalogLimit")}${this._catalogTotal ? ` ${this.t("studioCatalogTotal", { total: this._catalogTotal })}` : ""}`;
    return `${AtelierUI.pageHeader({ title, description: lead, kicker })}${this._studioError ? `<div class="studio-warning" role="status">${esc(this._studioError)}</div>` : ""}${this._catalogLoading ? `<div class="studio-warning" role="status" aria-live="polite">${esc(progressText || this.t("studioDetailsLoading"))}</div>` : ""}${this._catalogLimited ? `<p class="studio-muted">${esc(limitCopy)}</p>` : ""}${content}`;
  },
  _atelierDialog({
    title,
    body = "",
    kind = "confirm",
    confirmLabel = "",
    initialValue = "",
  } = {}) {
    return new Promise((resolve) => {
      const dlg = document.createElement("dialog");
      dlg.className = "at-premium-dialog";
      dlg.setAttribute("aria-labelledby", "at-dialog-title");
      dlg.setAttribute("aria-describedby", "at-dialog-description");
      const copy = String(body).slice(0, 2400);
      const input =
        kind === "prompt"
          ? `<label class="at-prompt-label">${esc(this.t("studioDialogPromptLabel"))}<input type="text" class="at-prompt-input" maxlength="160" value="${esc(initialValue)}" placeholder="${esc(this.t("studioDialogPromptPlaceholder"))}" required></label>`
          : "";
      dlg.innerHTML = `<form method="dialog" class="at-dialog-panel"><span class="eyebrow">${esc(this.t("studioDialogLabel"))}</span><h2 id="at-dialog-title">${esc(title || this.t("studioConfirm"))}</h2><p id="at-dialog-description">${esc(copy).replace(/\n/g, "<br>")}</p>${input}<div class="at-dialog-actions">${kind === "info" ? "" : `<button class="btn" type="submit" value="cancel" formnovalidate>${esc(this.t("studioCancel"))}</button>`}<button class="btn primary" type="submit" value="confirm">${esc(kind === "info" ? this.t("studioClose") : confirmLabel || this.t("studioConfirm"))}</button></div></form>`;
      const previous = this.shadowRoot.activeElement;
      const surface = this.shadowRoot.querySelector(".atelier");
      if (surface) {
        const current = getComputedStyle(surface);
        for (const token of [
          "--at-ink",
          "--at-sub",
          "--at-accent",
          "--at-accent-ink",
          "--at-line",
          "--at-surface",
          "--at-panel",
          "--at-panel2",
        ]) {
          const value = current.getPropertyValue(token);
          if (value) dlg.style.setProperty(token, value);
        }
      }
      this.shadowRoot.appendChild(dlg);
      dlg.addEventListener(
        "close",
        () => {
          const result = dlg.returnValue === "confirm";
          const value =
            kind === "prompt" && result ? dlg.querySelector("input")?.value.trim() || "" : result;
          dlg.remove();
          if (previous?.isConnected) previous.focus?.({ preventScroll: true });
          resolve(value);
        },
        { once: true },
      );
      try {
        dlg.showModal();
        if (input) dlg.querySelector("input")?.focus();
        else dlg.querySelector(".btn.primary")?.focus();
      } catch {
        dlg.remove();
        resolve(kind === "prompt" ? "" : false);
      }
    });
  },
  _studioDiagnosticsPanel() {
    const p = this._permissions || {},
      records = this._diagnostics || [];
    const display = records
      .map(
        (r) =>
          `<div class="studio-diagnostic-row"><span>${esc(r.name)}</span><span class="studio-diagnostic-status ${r.ok ? "ok" : "fail"}">${r.ok ? this.t("studioDiagnosticsReachable") : this.t("studioDiagnosticsCheck")}</span><small>${esc(r.detail || "")}</small></div>`,
      )
      .join("");
    return `<section class="studio-panel studio-diagnostics" aria-labelledby="atelier-system-title">
      ${AtelierUI.sectionHeading({ id: "atelier-system-title", kicker: this.t("studioDiagnosticsKicker"), title: this.t("studioDiagnosticsTitle"), description: this.t("studioDiagnosticsDescription") })}
      <div class="studio-actions"><button class="btn primary" data-action="studio-check-health" ${this._diagnosticsBusy ? "disabled" : ""}>${icon("refresh", 14)} ${this._diagnosticsBusy ? this.t("studioDiagnosticsRunning") : this.t("studioDiagnosticsCheck")}</button><button class="btn" data-action="studio-export">${icon("book", 14)} ${this.t("studioDiagnosticsExport")}</button></div>
      <div class="studio-diagnostic-grid" role="status" aria-live="polite">${display || `<p class="studio-muted">${esc(this.t("studioDiagnosticsEmpty"))}</p>`}</div>
      <p class="studio-muted">Status: ${p.can_manage ? this.t("studioDiagnosticsAdmin") : p.can_write ? this.t("studioDiagnosticsEdit") : this.t("studioDiagnosticsReadOnly")} · ${this.t("version")} ${esc(this._status?.version || "—")} · ${this.t("studioDiagnosticsBackup")}</p>
    </section>`;
  },
  async _studioDiagnostics() {
    if (this._diagnosticsBusy) return;
    this._diagnosticsBusy = true;
    this._diagnostics = [];
    this._render();
    const checks = [
      [this.t("studioBridge"), "status", {}],
      [this.t("recipes"), "recipes", { page: 1, per_page: 1, search: "" }],
      [this.t("shopping"), "shopping", {}],
      [
        this.t("mealplan"),
        "mealplan",
        { start: dateYmd(new Date()), end: dateYmd(addDays(new Date(), 6)) },
      ],
      [this.t("studioStorage"), "studio_state", {}],
    ];
    const results = [];
    for (const [name, type, args] of checks) {
      try {
        const result = await this._ws(type, args);
        const valid = result !== undefined && result !== null;
        results.push({
          name,
          ok: valid,
          detail: valid ? this.t("studioDiagnosticsReachable") : this.t("studioDiagnosticsNoData"),
        });
      } catch (error) {
        results.push({
          name,
          ok: false,
          detail: String(error?.message || error || this.t("studioDiagnosticsError")).slice(0, 140),
        });
      }
    }
    this._diagnostics = results;
    this._diagnosticsBusy = false;
    this._render();
    this._flash(
      results.every((x) => x.ok)
        ? this.t("studioDiagnosticsPassed")
        : this.tp("studioDiagnosticsFailed", results.filter((x) => !x.ok).length),
    );
  },
  _studioExport() {
    try {
      const state = structuredClone(this._studio || {});
      const snapshot = {
        format: "mealie-atelier-studio-snapshot",
        schema: 1,
        exported_at: new Date().toISOString(),
        note: this.t("studioExportNote"),
        state,
      };
      const data = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const address = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = address;
      link.download = `mealie-atelier-profil-${dateYmd(new Date())}.json`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(address), 1000);
      this._flash(this.t("studioExportDownloaded"));
    } catch (error) {
      this._flash(this.t("studioExportFailed", { error: String(error?.message || error) }));
    }
  },
  _studioOverview() {
    const h = new Date().getHours();
    const morning = h < 11,
      evening = h >= 17;
    const greeting = morning
      ? this.t("studioDailyMorning")
      : evening
        ? this.t("studioDailyEvening")
        : this.t("studioDailyAnytime");
    const soon = this._studio.pantry.filter(
      (p) => p.expires && (Date.parse(p.expires + "T12:00:00Z") - Date.now()) / 86400000 < 4,
    ).length;
    return `<section class="studio-daily ds-surface"><div><span class="eyebrow">${this.t("studioDailyEyebrow")} · ${morning ? this.t("studioDailyMorningLabel") : evening ? this.t("studioDailyEveningLabel") : this.t("studioDailyOverviewLabel")}</span><h2>${esc(greeting)}</h2><p>${soon ? this.t(soon === 1 ? "studioDailyExpiringOne" : "studioDailyExpiring", { count: soon }) : this.t("studioDailyDiscover")}</p></div><div class="studio-daily-actions"><button class="btn primary" data-action="nav" data-value="discover">${icon("spark", 15)} ${this.t("discover")}</button><button class="btn" data-action="nav" data-value="pantry">${icon("cart", 15)} ${this.t("studioDailyPantry")}</button></div></section>`;
  },
  _studioDiscover() {
    const p = this._studio.profile || {};
    const d =
      this._discoverDraft ||
      (this._discoverDraft = {
        step: 0,
        mealStyle:
          p.mealStyle ||
          (p.diets?.includes("vegan")
            ? "vegan"
            : p.diets?.includes("vegetarian")
              ? "vegetarian"
              : "any"),
        cookbooks: [...(p.cookbooks || [])],
        kidFriendly: p.kidFriendly === true,
        people: Number(p.people) || 2,
        maxMinutes: AtelierStudio.discoverMinutes(p.maxMinutes),
        usePantry: p.usePantry !== false,
        exclude: [...(p.exclude || [])],
      });
    const choices = [
      ["any", this.t("studioDiscoverAny")],
      ["vegetarian", this.t("studioDiscoverVegetarian")],
      ["vegan", this.t("studioDiscoverVegan")],
      ["meat", this.t("studioDiscoverMeat")],
      ["fish", this.t("studioDiscoverFish")],
    ];
    const cookbooks = this._studioCookbooks || [];
    const ingredients = [
      ["Pilze", this.t("ingredientMushrooms")],
      ["Oliven", this.t("ingredientOlives")],
      ["Koriander", this.t("ingredientCilantro")],
      ["Paprika", this.t("ingredientBellPepper")],
      ["Schärfe", this.t("ingredientHeat")],
    ];
    const selected = this._discoverResults
      ? this._discoverCandidates ||
        AtelierStudio.suggest(
          this._fullCatalog || [],
          { ...d, diets: [] },
          this._studio.pantry,
          this._studio.journal,
        )
      : [];
    const hero = selected.find((x) => x.slug === this._discoverSelected) || selected[0];
    const heroBooks = hero
      ? cookbooks
          .filter(
            (book) =>
              d.cookbooks.includes(book.slug) && AtelierStudio.matchesCookbook(hero.recipe, book),
          )
          .map((book) => book.name)
      : [];
    const alternatives = selected.filter((x) => x.slug !== hero?.slug).slice(0, 3);
    const upcoming = this._weekProposal || [];
    const step = Math.max(0, Math.min(3, Number(d.step) || 0));
    const stepName = [
      this.t("studioDiscoverStep0"),
      this.t("studioDiscoverStep1"),
      this.t("studioDiscoverStep2"),
      this.t("studioDiscoverStep3"),
    ][step];
    const isSelected = (key, value) =>
      key === "cookbooks" && value === "all"
        ? !d.cookbooks.length
        : Array.isArray(d[key])
          ? d[key].includes(value)
          : d[key] === value;
    const selectedClass = (key, value) => (isSelected(key, value) ? " is-selected" : "");
    const chip = (key, value, label) =>
      `<button class="studio-choice${selectedClass(key, value)}" type="button" data-action="studio-discover-choice" data-key="${key}" data-value="${value}" aria-pressed="${isSelected(key, value)}">${label}</button>`;
    const lead = this.t("studioDiscoverLead");
    const flow = `<div class="studio-discover-layout ${this._discoverResults ? "has-results" : ""}">
      ${
        !this._discoverResults
          ? `${AtelierUI.surfaceStart()}<div class="studio-discover-top"><span class="eyebrow">${this.t("studioDiscoverCompass")}</span><span class="studio-discover-stepcount">0${step + 1} <i>/</i> 04</span></div><div class="studio-discover-progress" role="progressbar" aria-label="${this.t("studioDiscoverStepProgress", { step: step + 1 })}" aria-valuemin="1" aria-valuemax="4" aria-valuenow="${step + 1}"><span style="--discover-progress:${((step + 1) / 4) * 100}%"></span></div>
      <div class="studio-discover-prompt"><h2>${stepName}</h2><p>${[this.t("studioDiscoverQuestion0"), this.t("studioDiscoverQuestion1"), this.t("studioDiscoverQuestion2"), this.t("studioDiscoverQuestion3")][step]}</p></div>
      ${step === 0 ? `<div class="studio-choice-grid" role="group" aria-label="${this.t("studioDiscoverDiet")}">${choices.map(([value, label]) => chip("mealStyle", value, label)).join("")}</div><p class="studio-muted studio-discover-note">${this.t("studioDiscoverDietHint")}</p>` : ""}
      ${step === 1 ? `<div class="studio-discover-label-block"><span class="studio-discover-label">${this.t("studioDiscoverCookbooks")}</span><small>${this.t("studioDiscoverCookbooksHint")}</small></div><div class="studio-choice-grid studio-cookbook-choices" role="group" aria-label="${this.t("studioDiscoverCookbooksAria")}">${chip("cookbooks", "all", this.t("studioDiscoverAllRecipes"))}${cookbooks.map((book) => chip("cookbooks", book.slug, esc(book.name))).join("")}</div>${!cookbooks.length ? `<p class="studio-muted studio-discover-note">${this.t("studioDiscoverNoCookbooks")}</p>` : ""}` : ""}
      ${
        step === 2
          ? `<div class="studio-discover-household"><div class="studio-discover-counter"><div><span class="studio-discover-label">${this.t("studioDiscoverPeople")}</span><small>${this.t("studioDiscoverPeopleHint")}</small></div><div class="studio-counter"><button type="button" data-action="studio-discover-choice" data-key="people" data-value="-1" aria-label="${this.t("studioDiscoverOneLess")}">−</button><output aria-live="polite">${d.people}</output><button type="button" data-action="studio-discover-choice" data-key="people" data-value="1" aria-label="${this.t("studioDiscoverOneMore")}">+</button></div></div><div class="studio-discover-counter"><div><span class="studio-discover-label">${this.t("studioDiscoverKidFriendly")}</span><small>${this.t("studioDiscoverMild")}</small></div><div class="studio-choice-grid studio-choice-grid--compact">${chip("kidFriendly", false, this.t("studioDiscoverAnyPreference"))}${chip("kidFriendly", true, this.t("studioDiscoverWithKids"))}</div></div></div><div class="studio-choice-grid studio-time-choices" role="group" aria-label="${this.t("studioDiscoverTime")}">${AtelierStudio.DISCOVER_MINUTES.map(
              (value, index, all) =>
                chip(
                  "maxMinutes",
                  value,
                  index === all.length - 1 ? this.t("studioDiscoverRelaxed") : `${value} min`,
                ),
            ).join("")}</div>`
          : ""
      }
      ${step === 3 ? `<div class="studio-discover-preferences"><div class="studio-choice-grid studio-choice-grid--compact" role="group" aria-label="${this.t("studioDiscoverPantry")}">${chip("usePantry", true, this.t("studioDiscoverUsePantry"))}${chip("usePantry", false, this.t("studioDiscoverNoPreference"))}</div><div class="studio-discover-label-block"><span class="studio-discover-label">${this.t("studioDiscoverExclude")}</span><small>${this.t("studioDiscoverOptional")}</small></div><div class="studio-choice-grid studio-choice-grid--compact studio-exclude-choices">${ingredients.map(([value, label]) => chip("exclude", value, value === "Schärfe" ? "🌶️ " + label : label)).join("")}</div></div><p class="studio-muted studio-discover-note">${this.t("studioDiscoverIngredientHint")}</p>` : ""}
      <div class="studio-discover-actions">${step > 0 ? `<button class="btn" data-action="studio-discover-back">${this.t("studioDiscoverBack")}</button>` : ""}<button class="btn primary" data-action="studio-discover-next" ${this._catalogLoading ? "disabled" : ""}>${step < 3 ? this.t("studioDiscoverNext") : this.t("studioDiscoverFind")} ${icon(step < 3 ? "arrow" : "spark", 15)}</button></div></section>`
          : `${AtelierUI.surfaceStart()}<div class="studio-discover-result-head"><div><span class="eyebrow">${this.t("studioDiscoverResult")}</span><h2>${this.t("studioDiscoverResultTitle")}</h2></div><button class="btn tiny" data-action="studio-discover-edit">${icon("edit", 14)} ${this.t("studioDiscoverEdit")}</button></div>
      ${
        hero
          ? `<article class="studio-discover-hero"><div class="studio-discover-hero-photo">${recipeImage(hero.recipe)}<span class="studio-discover-photo-label">${hero.timeLabel || this.t("studioDiscoverTimeOpen")} <i>·</i> ${hero.people} ${hero.people === 1 ? this.t("studioDiscoverPerson") : this.t("studioDiscoverPeoplePlural")}</span></div><div class="studio-discover-hero-copy"><span class="studio-discover-match">${icon("spark", 13)} ${heroBooks.length ? this.t("studioDiscoverFromCookbooks") : this.t("studioDiscoverFromRecipes")}</span><h3>${esc(hero.name)}</h3>${heroBooks.length ? `<p class="studio-discover-book-match">${heroBooks.map(esc).join(" · ")}</p>` : ""}<div class="studio-discover-meta"><span>${icon("clock", 14)} ${esc(hero.timeLabel || this.t("studioDiscoverTimeOpen"))}</span><span>${icon("utensils", 14)} ${hero.servings ? this.t("studioDiscoverRecipeBase", { servings: hero.servings }) : this.t("studioDiscoverForPeople", { people: hero.people })}</span></div><p>${esc(
              hero.reasons
                .slice(0, 3)
                .map((r) =>
                  r.plural ? this.tp(r.key, r.values.count, r.values) : this.t(r.key, r.values),
                )
                .join(" · ") || this.t("studioDiscoverGoodIdea"),
            )}</p><div class="studio-discover-hero-actions"><button class="btn primary" data-action="open-recipe" data-value="${esc(hero.slug)}">${this.t("studioDiscoverOpenRecipe")} ${icon("arrow", 15)}</button>${selected.length > 1 ? `<button class="btn" data-action="studio-discover-next-idea">${this.t("studioDiscoverAnother")} ${icon("refresh", 14)}</button>` : ""}</div></div></article>
      ${alternatives.length ? `<div class="studio-discover-alternatives"><div class="studio-discover-alt-heading"><span class="eyebrow">${this.t("studioDiscoverAlsoGood")}</span><small>${this.tp("studioDiscoverMoreIdeas", alternatives.length)}</small></div><div class="studio-discover-alt-grid">${alternatives.map((x) => `<button class="studio-discover-alt" data-action="studio-discover-pick" data-value="${esc(x.slug)}"><span class="studio-discover-alt-photo">${recipeImage(x.recipe)}</span><span class="studio-discover-alt-copy"><strong>${esc(x.name)}</strong><small>${esc(x.timeLabel || this.t("studioDiscoverTimeOpen"))}${x.servings ? ` · ${x.servings} ${this.t("servings")}` : ""}</small></span>${icon("chevron", 15)}</button>`).join("")}</div></div>` : ""}</article>`
          : `<div class="studio-discover-empty"><span>✦</span><h3>${this.t("studioDiscoverEmptyTitle")}</h3><p>${this.t("studioDiscoverEmpty")}</p><button class="btn" data-action="studio-discover-edit">${this.t("studioDiscoverAdjust")}</button><button class="btn" data-action="studio-analyze" ${this._catalogLoading ? "disabled" : ""}>${icon("refresh", 14)} ${this.t("studioDiscoverReload")}</button></div>`
      }</section>`
      }
      </div>`;
    const planner = this._discoverResults
      ? `${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("studioPlanKicker")}</span><h2>${this.t("studioPlanTitle")}</h2><p>${this.t("studioPlanDescription")}</p></div>
      <div class="studio-actions"><button class="btn primary" data-action="studio-plan-preview" ${this._catalogLoading ? "disabled" : ""}>${icon("spark", 15)} ${this.t("studioPlanPreview")}</button>${upcoming.length && this._permissions.can_write ? `<button class="btn" data-action="studio-plan-commit">${icon("check", 15)} ${this.t("studioPlanCommit")}</button>` : ""}</div>
      ${upcoming.length ? `<div class="studio-plan-list">${upcoming.map((x) => `<div class="studio-plan-row"><span><strong>${esc(atDate(x.date, this._locale))}</strong> <small>${x.meal_type === "lunch" ? this.t("studioLunch") : this.t("studioDinner")}</small></span><div><b>${esc(x.leftovers ? this.t("studioLeftoversName", { name: x.name }) : x.name)}</b><p>${esc(x.reasons.map((r) => (r.plural ? this.tp(r.key, r.values.count, r.values) : this.t(r.key, r.values))).join(" · "))}</p></div></div>`).join("")}</div><p class="studio-muted">${this.t("studioPlanOnlyMissing")}</p>` : `<p class="studio-muted">${this.t("studioPlanCreatePreview")}</p>`}</section>`
      : "";
    return this._studioShell(this.t("studioDiscoverTitle"), lead, `${flow}${planner}`);
  },
  _studioPantry() {
    const p = this._studio.pantry || [],
      needs = this._grocery || [];
    return this._studioShell(
      this.t("studioPantryTitle"),
      this.t("studioPantryLead"),
      `
      <div class="studio-grid studio-grid-main ds-grid ds-grid--split">${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("studioPantryKicker")}</span><h2>${this.t("studioPantryQuestion")}</h2></div>
      ${
        !this._permissions.can_write
          ? ""
          : `<form class="studio-form" data-form="studio-pantry"><div class="studio-formline"><label>${this.t("studioIngredient")}<input name="name" required maxlength="120" placeholder="${this.t("ingredientTomatoes")}"></label><label>${this.t("studioAmount")}<input type="number" name="amount" min="0" max="100000" step="0.1" required></label></div>
      <div class="studio-formline"><label>${this.t("studioUnit")}<select name="unit"><option value="g">${this.t("studioGrams")}</option><option value="ml">${this.t("studioMilliliters")}</option><option value="stück">${this.t("studioPieces")}</option></select></label><label>${this.t("studioBestBefore")}<input type="date" name="expires"></label></div>
      <label class="studio-inline"><input type="checkbox" name="staple"><span>${this.t("studioStaple")}</span></label>
      <button class="btn primary" type="submit">${icon("plus", 15)} ${this.t("studioAdd")}</button></form>`
      }
      <div class="studio-pantry-list">${p.map((x) => `<div class="studio-pantry-row"><div><strong>${esc(x.name)}</strong><small>${esc(atQty(x.amount, this._locale))} ${esc(this._studioUnit(x.unit))} ${x.staple ? "· " + this.t("studioStapleLabel") : ""} ${x.expires ? "· " + this.t("studioUntil", { date: atDate(x.expires, this._locale) }) : ""}</small></div>${this._permissions.can_write ? `<div><button class="btn tiny" data-action="studio-pantry-edit" data-id="${esc(x.id)}">${this.t("edit")}</button><button class="icon-btn" data-action="studio-pantry-delete" data-id="${esc(x.id)}" aria-label="${this.t("studioRemove")}">${icon("close", 14)}</button></div>` : ""}</div>`).join("") || `<p class="studio-muted">${this.t("studioPantryEmpty")}</p>`}</div></section>
      ${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("studioGroceryKicker")}</span><h2>${this.t("studioGroceryTitle")}</h2><p>${this.t("studioGroceryDescription")}</p></div>
      <div class="studio-actions"><button class="btn primary" data-action="studio-grocery-build">${icon("refresh", 14)} ${this.t("studioGroceryCalculate")}</button>${needs.length && this._permissions.can_write ? `<button class="btn" data-action="studio-grocery-send">${icon("cart", 14)} ${this.t("studioGrocerySend")}</button>` : ""}</div>
      ${
        needs.length
          ? atGroup(needs)
              .map(
                (g) =>
                  `<div class="studio-group"><h3>${esc(this.t(atAisleKeys[g.category] || "studioAisleProduce"))}</h3>${g.rows.map((x) => `<div class="studio-grocery-line"><span>${esc(x.name)}</span><strong>${x.needed == null ? this.t("studioQuantityCheck") : esc(atQty(x.needed, this._locale)) + " " + esc(this._studioUnit(x.unit))}${x.uncertain ? " ⚠" : ""}</strong></div>`).join("")}</div>`,
              )
              .join("")
          : `<p class="studio-muted">${this.t("studioGroceryPreview")}</p>`
      }
      <p class="studio-muted">${this.t("studioUnclearUnits")}</p></section></div>`,
    );
  },
  _studioFamily() {
    const family = this._studio.family || { members: [], session: null },
      session = family.session;
    const people = family.members || [];
    const kid = Boolean(this._kidView);
    return this._studioShell(
      this.t("familyTitle"),
      this.t("familyLead"),
      `
     <div class="studio-actions"><button class="btn ${kid ? "primary" : ""}" data-action="studio-kid-toggle">${kid ? this.t("familyAdultMode") : this.t("familyHelperMode")}</button><button class="btn" data-action="studio-sync">${icon("refresh", 14)} ${this.t("familySync")}</button></div>
     <div class="studio-grid studio-grid-main ds-grid ds-grid--split">${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("familyTeam")}</span><h2>${this.t("familyWhoHelps")}</h2></div>
     ${!kid && this._permissions.can_manage ? `<form data-form="studio-member" class="studio-form"><label>${this.t("familyName")}<input name="name" required maxlength="60" placeholder="${this.t("familyName")}"></label><label class="studio-inline"><input type="checkbox" name="child"><span>${this.t("familyChild")}</span></label><button class="btn" type="submit">${icon("plus", 14)} ${this.t("familyAddMember")}</button></form>` : ""}
     <div class="studio-member-list">${people.map((x) => `<div class="studio-member"><span>${icon("utensils", 17)} ${esc(x.name)} ${x.child ? `<small>${this.t("familyHelper")}</small>` : ""}</span>${!kid && this._permissions.can_manage ? `<button class="icon-btn" data-action="studio-member-remove" data-id="${esc(x.id)}" aria-label="${this.t("familyRemoveMember")}">${icon("close", 14)}</button>` : ""}</div>`).join("") || `<p class="studio-muted">${this.t("familyNoMembers")}</p>`}</div></section>
     ${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("familySession")}</span><h2>${esc(session?.name || this.t("familyNoSession"))}</h2></div>
     ${
       session
         ? `<p class="studio-step-badge">${this.t("familyStep", { step: session.step + 1, date: atDate(session.started, this._locale) })}</p><div class="studio-actions">${!kid && this._permissions.can_write ? `<button class="btn" data-action="studio-session-prev" ${session.step <= 0 ? "disabled" : ""}>${this.t("familyBack")}</button><button class="btn primary" data-action="studio-session-next">${this.t("familyNext")}</button><button class="btn" data-action="studio-session-end">${this.t("familyEnd")}</button>` : ""}<button class="btn" data-action="studio-session-open">${this.t("familyOpenCook")}</button></div>
     <h3>${this.t("familyTimers")}</h3><div>${session.timers.map((x) => `<div class="studio-timer-row"><span>${esc(x.name)}</span><b data-shared-timer="${esc(x.id)}">${esc(Math.max(0, Math.ceil((x.deadline - Date.now()) / 60000)))} ${this.t("studioMinutesShort")}</b>${!kid && this._permissions.can_write ? `<button class="icon-btn" data-action="studio-timer-remove" data-id="${esc(x.id)}" aria-label="${this.t("studioRemove")}">${icon("close", 14)}</button>` : ""}</div>`).join("") || `<p class="studio-muted">${this.t("familyNoTimers")}</p>`}</div>
     ${!kid && this._permissions.can_write ? `<form class="studio-form studio-formline" data-form="studio-timer"><label>${this.t("familyTimerName")}<input name="name" value="${this.t("studioOven")}" maxlength="70" required></label><label>${this.t("familyMinutes")}<input type="number" name="minutes" value="10" min="1" max="240" required></label><button class="btn" type="submit">${this.t("familySetTimer")}</button></form>` : ""}
     <h3>${this.t("familyTasks")}</h3>${session.tasks.map((t) => `<div class="studio-task"><button type="button" class="studio-check ${t.done ? "done" : ""}" role="checkbox" aria-checked="${t.done ? "true" : "false"}" aria-label="${esc(this.t(t.done ? "familyMarkOpen" : "familyMarkDone", { task: t.text }))}" data-action="studio-task-done" data-id="${esc(t.id)}" ${this._permissions.can_write ? "" : 'disabled aria-disabled="true"'}>${icon("check", 16)}</button><span>${esc(t.text)}</span><small>${esc(people.find((x) => x.id === t.memberId)?.name || "")}</small></div>`).join("") || `<p class="studio-muted">${this.t("familyNoTasks")}</p>`}
     ${!kid && this._permissions.can_manage && people.length ? `<form class="studio-form" data-form="studio-task"><label>${this.t("familyTask")}<input name="text" maxlength="300" required placeholder="${this.t("familyTaskPlaceholder")}"></label><label>${this.t("familyAssign")}<select name="memberId">${people.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select></label><label class="studio-inline"><input type="checkbox" name="adultApproved"><span>${this.t("familyApproval")}</span></label><button class="btn" type="submit">${this.t("familyAssignTask")}</button></form>` : ""}
     <p class="studio-muted">${this.t("familySafety")}</p>`
         : `<p class="studio-muted">${this.t("familyStartHint")}</p><button class="btn primary" data-action="nav" data-value="recipes">${this.t("familyBrowse")}</button>`
     }</section></div>`,
    );
  },
  _studioCookbook() {
    const candidates = this._fullCatalog || asArray(this._data.recipes?.items),
      selected = this._bookSelected || new Set();
    return this._studioShell(
      this.t("cookbookTitle"),
      this.t("cookbookLead"),
      `
      <div class="studio-grid studio-grid-main ds-grid ds-grid--split">${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("cookbookSelectKicker")}</span><h2>${this.t("cookbookCollection")}</h2></div>
      <div class="studio-actions"><button class="btn" data-action="studio-analyze">${icon("refresh", 14)} ${this.t("cookbookLoad")}</button><button class="btn" data-action="studio-book-all">${this.t("cookbookSelectAll")}</button><button class="btn" data-action="studio-book-clear">${this.t("cookbookClear")}</button></div>
      <div class="studio-book-list">${
        candidates
          .slice(0, 120)
          .map(
            (r) =>
              `<label class="studio-book-row"><input type="checkbox" data-book="${esc(r.slug)}" ${selected.has(r.slug) ? "checked" : ""}>${recipeImage(r, "studio-book-photo")}<span>${esc(r.name)}</span></label>`,
          )
          .join("") ||
        AtelierUI.empty({ title: this.t("cookbookEmpty"), description: this.t("cookbookLoadHint") })
      }</div></section>
      ${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("cookbookBookKicker")}</span><h2>${this.tp("cookbookSelected", selected.size)}</h2></div>
      <form class="studio-form" data-form="studio-book"><label>${this.t("cookbookTitleLabel")}<input name="title" maxlength="100" value="${this.t("cookbookTitleDefault")}" required></label><label>${this.t("cookbookSubtitleLabel")}<input name="subtitle" maxlength="160" value="${this.t("cookbookSubtitleDefault")}"></label>
      <label class="studio-inline"><input type="checkbox" name="photos"> ${this.t("cookbookPhotos")}</label>
      <button class="btn primary" type="submit" ${!selected.size ? "disabled" : ""}>${icon("print", 15)} ${this.t("cookbookPrint")}</button></form>
      <p class="studio-muted">${this.t("cookbookPrintHint")}</p></section></div>`,
    );
  },
  async _studioGenerateShopping() {
    if (!this._fullCatalog?.length) await this._studioCatalog();
    const bySlug = new Map((this._fullCatalog || []).map((x) => [x.slug, x]));
    const dates = asArray(this._data.mealplan);
    const recipes = [];
    const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
    for (const e of sorted) {
      const r = bySlug.get(e.recipe?.slug) || e.recipe;
      if (!r?.recipeIngredient?.length) continue;
      // A matching next-day lunch with >=2 household portions may be leftovers.
      // Do not double-purchase ingredients for that likely leftover serving.
      const prev = new Date(e.date + "T12:00:00");
      prev.setDate(prev.getDate() - 1);
      const prevDate = dateYmd(prev);
      const likelyLeftover =
        e.entryType === "lunch" &&
        Number(r.recipeServings) >= Number(this._studio.profile.people || 2) * 2 &&
        sorted.some(
          (x) => x.date === prevDate && x.entryType === "dinner" && x.recipe?.slug === r.slug,
        );
      if (!likelyLeftover) recipes.push(r);
    }
    this._grocery = AtelierStudio.shoppingNeeds(recipes, this._studio.pantry, this._studio.profile);
    this._view = "pantry";
    this._render();
    if (!recipes.length) this._flash(this.t("studioNoPlannedIngredients"));
  },
  async _studioCommitWeek() {
    if (!this._weekProposal?.length || !this._permissions.can_write) return;
    if (
      !(await this._atelierDialog({
        title: this.t("studioWeekConfirmTitle"),
        body: this.tp("studioWeekConfirmBody", this._weekProposal.length),
        confirmLabel: this.t("studioWeekConfirmAction"),
      }))
    )
      return;
    const proposed = this._weekProposal.slice();
    let success = 0,
      refused = null,
      failed = [];
    for (const entry of proposed) {
      try {
        await this._ws("mutate", {
          action: "mealplan_add",
          payload: { date: entry.date, meal_type: entry.meal_type, recipe_id: entry.recipe_id },
        });
        success++;
      } catch (error) {
        failed.push(`${entry.date}: ${this._errorText(error)}`);
        refused ||= error;
      }
    }
    await this._recoverPermissions(refused);
    this._weekProposal = failed.length
      ? proposed.filter((x) => failed.some((f) => f.startsWith(x.date + ":")))
      : [];
    await this._loadMealplan();
    this._flash(
      `${this.tp("studioWeekSuccess", success)}${failed.length ? " " + this.t("studioWeekFailure", { errors: failed.join("; ") }) : ""}`,
    );
  },
  async _studioSendGroceries() {
    const items = this._grocery || [];
    if (!items.length) return;
    const list = this._activeList || String(this._data.shopping?.lists?.[0]?.id || "");
    if (!list) {
      this._flash(this.t("studioCreateShoppingListFirst"));
      return;
    }
    if (
      !(await this._atelierDialog({
        title: this.t("studioShoppingTransferTitle"),
        body: this.tp("studioShoppingTransferBody", items.length),
        confirmLabel: this.t("studioShoppingTransferConfirm"),
      }))
    )
      return;
    let count = 0,
      refused = null;
    const errors = [];
    for (const item of items) {
      const note =
        `${item.needed ?? "?"} ${this._studioUnit(item.unit)} ${item.name}${item.uncertain ? " (" + this.t("studioShoppingUncertain") + ")" : ""}`
          .trim()
          .slice(0, 250);
      try {
        await this._ws("mutate", { action: "shopping_add", payload: { list_id: list, note } });
        count++;
      } catch (err) {
        errors.push(item.name);
        refused ||= err;
      }
    }
    await this._recoverPermissions(refused);
    await this._loadShopping();
    this._flash(
      `${this.tp("studioShoppingSuccess", count)}${errors.length ? " " + this.t("studioShoppingFailure", { items: errors.join(", ") }) : ""}`,
    );
  },
  async _studioPrintBook({ title, subtitle, photos }) {
    const popup = window.open("", "_blank");
    if (!popup) {
      this._flash(this.t("studioPopupBlocked"));
      return;
    }
    popup.document.write(
      `<!doctype html><title>${esc(this.t("printDocumentTitle"))}</title><p>${esc(this.t("printPreparing"))}</p>`,
    );
    const chosen = [...(this._bookSelected || [])];
    const from = this._fullCatalog || [];
    const results = [],
      skipped = [];
    for (const slug of chosen.slice(0, 120)) {
      let recipe = from.find((x) => x.slug === slug);
      if (!recipe?.recipeInstructions) {
        try {
          recipe = await this._ws("recipe", { slug });
        } catch {
          // Keep processing the remaining recipes and report the skipped ones afterwards.
          skipped.push(recipe?.name || slug);
          recipe = null;
        }
      }
      if (recipe) results.push(recipe);
    }
    if (skipped.length)
      this._flash(
        this.tp("studioRecipeFetchFailed", skipped.length, { names: skipped.join(", ") }),
        "error",
      );
    const toc = results
      .map((r, i) => `<li><span>${esc(r.name)}</span><b>${i + 1}</b></li>`)
      .join("");
    const chapters = results
      .map(
        (r, i) =>
          `<article class="chapter"><span class="eyebrow">${esc(this.t("printRecipe", { number: String(i + 1).padStart(2, "0"), total: results.length }))}</span><h2>${esc(r.name)}</h2>${photos && imageOk(r.imageUrl) ? `<img class="chapter-image" src="${esc(imageOk(r.imageUrl))}" alt="">` : ""}<div class="meta">${r.recipe?.totalTime ? esc(AtelierStudio.formatTime(r.recipe.totalTime, this._language)) + " · " : ""}${esc(AtelierStudio.recipeServings(r) ? this.tp("printServings", AtelierStudio.recipeServings(r)) : r.recipeYieldQuantity && r.recipeYield ? `${r.recipeYieldQuantity} ${r.recipeYield}` : "—")}</div><div class="cols"><section><h3>${this.t("printIngredients")}</h3>${asArray(
            r.recipeIngredient,
          )
            .map(
              (x) => `<div class="ingredient">□ &nbsp; ${esc(AtelierStudio.ingredient(x))}</div>`,
            )
            .join("")}</section><section><h3>${this.t("printPreparation")}</h3>${asArray(
            r.recipeInstructions,
          )
            .map(
              (x, j) =>
                `<p class="method"><b>${String(j + 1).padStart(2, "0")}</b>${esc(instructionText(x))}</p>`,
            )
            .join("")}</section></div></article>`,
      )
      .join("");
    const html = `<!doctype html><html lang="${esc(this._locale || "en")}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      *{box-sizing:border-box}body{margin:0;background:#e9ece9;color:#26382f;font:12px/1.7 Arial,sans-serif}.toolbar{position:sticky;top:0;background:#1b3025;padding:14px;text-align:center;color:#fff}.toolbar button{padding:12px 23px;border:0;border-radius:9px;background:#adcfb7;font-weight:700;cursor:pointer}.page,.chapter{width:210mm;min-height:297mm;background:#fff;margin:20px auto;padding:19mm 18mm;box-shadow:0 7px 30px #0002}.cover{display:flex;flex-direction:column;justify-content:space-between;background:#203c2c;color:#fff}.cover .kicker{letter-spacing:4px;color:#b0d0b6;font-size:12px}.cover h1{font:normal 68px/1.05 Georgia,serif;max-width:130mm}.cover .subtitle{font-size:17px;color:#d3e2d3}.toc h2,.chapter h2{font:normal 38px/1.15 Georgia,serif;margin:15px 0 28px}.toc li{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #d8e2d9;gap:10px}.toc ul{padding:0;list-style:none}.eyebrow,h3{letter-spacing:2px;font-size:10px;font-weight:800;color:#618772}.chapter-image{width:100%;max-height:80mm;object-fit:cover;display:block;margin:10mm 0}.meta{color:#758578;margin-bottom:26px}.cols{display:grid;grid-template-columns:37% 1fr;gap:28px}.ingredient{padding:7px 0;border-bottom:1px solid #e2e9e3;break-inside:avoid}.method{display:grid;grid-template-columns:23px 1fr;gap:10px;break-inside:avoid;margin:0 0 18px}.method b{font:normal 22px Georgia,serif;color:#7da48a}@page{size:A4 portrait;margin:0}@media print{body{background:#fff}.toolbar{display:none}.page,.chapter{box-shadow:none;margin:0;break-after:page;page-break-after:always;width:auto;min-height:297mm}.chapter:last-child{break-after:auto}.cover{background:#fff!important;color:#203c2c!important;border:1mm solid #203c2c}.cover .kicker{color:#486d55!important}.cover .subtitle,.cover small{color:#304339!important}}
      </style></head><body><nav class="toolbar"><button onclick="window.print()">${this.t("printSavePdf")}</button></nav><section class="page cover"><div class="kicker">MEALIE ATELIER · ${this.t("printCollection")}</div><div><h1>${esc(title)}</h1><p class="subtitle">${esc(subtitle)}</p></div><small>${this.t("printMadeWithLove")}</small></section><section class="page toc"><div class="eyebrow">${this.t("printContents")}</div><h2>${this.t("printRecipes")}</h2><ul>${toc}</ul></section>${chapters}</body></html>`;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  },
});
MealieAtelierCard.prototype._refresh = async function () {
  await _atOriginalRefresh.call(this);
  await this._studioRefresh();
  try {
    const payload = await this._ws("alarms");
    const remote = (payload?.alarms || []).filter((x) =>
      ["scheduled", "retry", "sending"].includes(x.status),
    );
    const local = this._timers.filter((x) => !x.serverArmed);
    const previous = new Map(this._timers.map((timer) => [String(timer.id), timer]));
    this._timers = [
      ...local,
      ...remote.map((x) => ({
        ...previous.get(String(x.id)),
        id: x.id,
        label: x.label,
        deadline: x.deadline,
        done: false,
        serverArmed: true,
      })),
    ];
    this._persistTimers();
  } catch {} // Older companion/HA versions keep local timers; never pretend they are server-armed.
};
MealieAtelierCard.prototype._body = function () {
  if (this._providerActive === "home_assistant" && this._view !== "recipes")
    return `<section class="ds-surface"><span class="eyebrow">HOME ASSISTANT MEALIE</span><h2>${this.t("providerTitle")}</h2><p>${this.t("providerDescription")}</p><button class="btn primary" type="button" data-action="nav" data-value="recipes">${this.t("providerBrowse")}</button></section>`;
  if (!this._studio) this._studio = atInitially();
  if (this._view === "discover") return this._studioDiscover();
  if (this._view === "pantry") return this._studioPantry();
  if (this._view === "family") return this._studioFamily();
  if (this._view === "cookbook") return this._studioCookbook();
  const base = _atOriginalBody.call(this);
  return this._view === "dashboard"
    ? this._studioOverview() + base
    : this._view === "manage"
      ? base + this._studioDiagnosticsPanel()
      : base;
};
MealieAtelierCard.prototype._openRecipe = async function (slug) {
  this._aiAudit = null;
  this._aiSwap = null;
  await _atOriginalOpenRecipe.call(this, slug);
  if (this._detail?.slug) {
    this._catalogDetail = this._detail;
  }
};
MealieAtelierCard.prototype._modalHtml = function () {
  let html = _atOriginalModal.call(this);
  if (this._modal === "cook" && this._detail) {
    const session = this._studio?.family?.session;
    const connected = session?.slug === this._detail.slug;
    const voice = `<div class="studio-cook-tools"><button class="btn" data-action="studio-read-step">${icon("book", 14)} ${this.t("studioReadStepLabel")}</button><button class="btn" data-action="studio-voice-command">${icon("spark", 14)} ${this.t("studioVoiceCommandLabel")}</button><button class="btn" data-action="studio-replacement">${this.t("studioReplacementLabel")}</button>${this._hass?.callService && /^scene\.[a-z0-9_]+$/i.test(this._config.cooking_scene || "") ? `<button class="btn" data-action="studio-ha-scene">${icon("sun", 14)} ${this.t("studioCookingLight")}</button>` : ""}${this._hass?.callService && /^media_player\.[a-z0-9_]+$/i.test(this._config.cooking_media_player || "") ? `<button class="btn" data-action="studio-ha-quiet">${icon("volume", 14)} ${this.t("studioLowerMusic")}</button>` : ""}${this._hass?.callService && /^tts\.[a-z0-9_]+$/i.test(this._config.cooking_tts_engine || "") && /^media_player\.[a-z0-9_]+$/i.test(this._config.cooking_media_player || "") ? `<button class="btn" data-action="studio-ha-tts">${icon("volume", 14)} ${this.t("studioSpeakerLabel")}</button>` : ""}${connected ? `<span class="studio-shared-note">● ${this.t("studioSharedFamily")}</span>` : ""}</div>${this._aiSwap ? `<div class="studio-swap">${esc(this._aiSwap)}</div>` : ""}`;
    html = html.replace('<div class="cook-utility">', '<div class="cook-utility">' + voice);
    if (connected && session.timers.length) {
      html = html.replace(
        '<div class="cook-timers">',
        `<div class="cook-timers">${session.timers.map((x) => `<div class="cook-timer"><span>${esc(x.name)} · ${this.t("studioSharedTimer")}</span><strong data-shared-timer="${esc(x.id)}">${Math.max(0, Math.ceil((x.deadline - Date.now()) / 60000))} ${this.t("studioMinutesShort")}</strong></div>`).join("")}`,
      );
    }
  }
  if (this._modal === "journal" && this._detail)
    html = html.replace(this.t("studioJournalLocal"), this.t("studioJournalShared"));
  if (this._modal === "recipe" && this._detail) {
    const audit = AtelierStudio.audit(this._detail);
    html = html.replace(
      '<div class="detail-cols">',
      `<div class="studio-audit"><strong>${this.t("studioRecipeAuditTitle", { score: audit.score })}</strong><span>${
        audit.problems.length
          ? audit.problems
              .map((x) => esc(atMessage(this.t.bind(this), x)))
              .slice(0, 3)
              .join(" · ")
          : this.t("studioRecipeAuditNone")
      }</span><button class="btn tiny" data-action="studio-recipe-audit">${this.t("studioRecipeAuditAll")}</button>${this._providerActive === "home_assistant" ? "" : `<button class="btn tiny" data-action="studio-ai-audit">${icon("spark", 13)} ${this.t("studioAICheck")}</button>`}</div>${this._aiAudit ? `<div class="studio-audit-details"><strong>${this.t("studioAiSuggestionTitle")}</strong>${this._aiAudit.issues.map((x) => `<p><b>${esc(x.issue)}</b> – ${esc(x.suggestion)}</p>`).join("")}<small>${esc(this._aiAudit.disclaimer)}</small></div>` : ""}<div class="detail-cols">`,
    );
  }
  return html;
};
MealieAtelierCard.prototype._tickTimers = function () {
  _atOriginalTick.call(this);
  for (const span of this.shadowRoot.querySelectorAll("[data-shared-timer]")) {
    const timer = this._studio?.family?.session?.timers.find(
      (x) => x.id === span.dataset.sharedTimer,
    );
    if (timer) {
      const sec = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000));
      span.textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    }
  }
};
MealieAtelierCard.prototype.connectedCallback = function () {
  _atOriginalConnected.call(this);
  this._studioPoll = setInterval(() => {
    if (["family", "discover", "pantry"].includes(this._view) || this._modal === "cook")
      this._studioRefresh({ silent: true });
  }, 12000);
};
MealieAtelierCard.prototype.disconnectedCallback = function () {
  _atOriginalDisconnected.call(this);
  if (this._studioPoll) clearInterval(this._studioPoll);
};
MealieAtelierCard.prototype._handleClick = async function (event) {
  const el = event.target?.closest?.("[data-action]");
  const action = el?.dataset?.action;
  if (action?.startsWith("studio-")) {
    event.preventDefault();
    const value = el.dataset.value || "",
      session = this._studio?.family?.session;
    if (action === "studio-discover-choice") {
      const draft = this._discoverDraft;
      if (!draft) return;
      const key = el.dataset.key;
      if (key === "people")
        draft.people = Math.max(1, Math.min(20, Number(draft.people || 2) + Number(value)));
      else if (key === "maxMinutes") draft.maxMinutes = Number(value);
      else if (key === "kidFriendly" || key === "usePantry") draft[key] = value === "true";
      else if (key === "exclude") {
        draft.exclude = draft.exclude.includes(value)
          ? draft.exclude.filter((x) => x !== value)
          : [...draft.exclude, value];
      } else if (key === "cookbooks")
        draft.cookbooks =
          value === "all"
            ? []
            : draft.cookbooks.includes(value)
              ? draft.cookbooks.filter((x) => x !== value)
              : [...draft.cookbooks, value];
      else if (key === "mealStyle") draft.mealStyle = value;
      this._render();
      return;
    }
    if (action === "studio-discover-back") {
      this._discoverDraft.step = Math.max(0, this._discoverDraft.step - 1);
      this._render();
      this._revealDiscover();
      return;
    }
    if (action === "studio-discover-edit") {
      this._discoverResults = false;
      this._discoverDraft.step = 0;
      this._render();
      this._revealDiscover();
      return;
    }
    if (action === "studio-discover-next") {
      if (this._discoverDraft.step < 3) {
        this._discoverDraft.step++;
        this._render();
        this._revealDiscover();
        return;
      }
      const d = this._discoverDraft,
        style = d.mealStyle || "any";
      const profile = {
        people: d.people,
        maxMinutes: d.maxMinutes,
        mealStyle: style,
        kidFriendly: d.kidFriendly,
        usePantry: d.usePantry,
        diets: style === "vegan" ? ["vegan"] : style === "vegetarian" ? ["vegetarian"] : [],
        exclude: d.exclude,
        cookbooks: d.cookbooks,
      };
      if (!this._fullCatalog?.length) await this._studioCatalog();
      if (this._permissions.can_write) await this._studioWrite("profile_set", profile);
      this._discoverCandidates = AtelierStudio.suggest(
        this._fullCatalog || asArray(this._data.recipes?.items),
        profile,
        this._studio.pantry,
        this._studio.journal,
        this._studioCookbooks || [],
      );
      this._discoverSelected = this._discoverCandidates[0]?.slug || "";
      this._discoverResults = true;
      this._render();
      this._revealDiscover();
      return;
    }
    if (action === "studio-discover-pick") {
      this._discoverSelected = value;
      this._render();
      return;
    }
    if (action === "studio-discover-next-idea") {
      const rows = this._discoverCandidates || [],
        index = rows.findIndex((x) => x.slug === this._discoverSelected);
      if (rows.length) this._discoverSelected = rows[(index + 1) % rows.length].slug;
      this._render();
      return;
    }
    if (action === "studio-check-health") {
      await this._studioDiagnostics();
      return;
    }
    if (action === "studio-export") {
      this._studioExport();
      return;
    }
    if (action === "studio-analyze") {
      this._fullCatalog = null;
      await this._studioCatalog();
      return;
    }
    if (action === "studio-plan-preview") {
      if (!this._fullCatalog?.length) await this._studioCatalog();
      this._weekProposal = AtelierStudio.planWeek(
        this._fullCatalog || [],
        this._studio.profile,
        this._studio.pantry,
        this._studio.journal,
        this._data.mealplan || [],
        this._weekStart,
      );
      this._render();
      return;
    }
    if (action === "studio-plan-commit") {
      await this._studioCommitWeek();
      return;
    }
    if (action === "studio-grocery-build") {
      await this._studioGenerateShopping();
      return;
    }
    if (action === "studio-grocery-send") {
      await this._studioSendGroceries();
      return;
    }
    if (action === "studio-sync") {
      await this._studioRefresh();
      return;
    }
    if (action === "studio-kid-toggle") {
      this._kidView = !this._kidView;
      this._render();
      return;
    }
    if (action === "studio-pantry-delete") {
      if (
        await this._atelierDialog({
          title: this.t("studioDeletePantryTitle"),
          body: this.t("studioDeletePantryBody"),
          confirmLabel: this.t("studioRemove"),
        })
      )
        await this._studioWrite("pantry_delete", { id: el.dataset.id });
      return;
    }
    if (action === "studio-pantry-edit") {
      const v = this._studio.pantry.find((x) => x.id === el.dataset.id);
      if (!v) return;
      const form = this.shadowRoot.querySelector('[data-form="studio-pantry"]');
      if (form) {
        form.elements.name.value = v.name;
        form.elements.amount.value = v.amount;
        form.elements.unit.value = v.unit;
        form.elements.expires.value = v.expires || "";
        form.elements.staple.checked = v.staple === true;
        form.dataset.rowId = v.id;
        this._revealPantryForm(form);
      }
      return;
    }
    if (action === "studio-member-remove") {
      if (
        await this._atelierDialog({
          title: this.t("familyRemoveConfirmTitle"),
          body: this.t("familyRemoveConfirmBody"),
          confirmLabel: this.t("familyRemoveMember"),
        })
      )
        await this._studioWrite("family_member", { id: el.dataset.id, remove: true });
      return;
    }
    if (action === "studio-session-prev" || action === "studio-session-next") {
      if (session)
        await this._studioWrite("session_step", {
          session_id: session.id,
          step: Math.max(0, session.step + (action.endsWith("next") ? 1 : -1)),
        });
      return;
    }
    if (action === "studio-session-end") {
      if (
        session &&
        (await this._atelierDialog({
          title: this.t("familyEndConfirmTitle"),
          body: this.t("familyEndConfirmBody"),
          confirmLabel: this.t("familyEnd"),
        }))
      )
        await this._studioWrite("session_end", { session_id: session.id });
      return;
    }
    if (action === "studio-session-open") {
      if (session) {
        await this._openRecipe(session.slug);
        this._cookIndex = session.step;
        this._modal = "cook";
        this._render();
      }
      return;
    }
    if (action === "studio-timer-remove") {
      if (session)
        await this._studioWrite("session_timer", {
          session_id: session.id,
          id: el.dataset.id,
          remove: true,
        });
      return;
    }
    if (action === "studio-task-done") {
      const task = session?.tasks?.find((x) => x.id === el.dataset.id);
      if (task)
        await this._studioWrite("session_task", {
          session_id: session.id,
          id: task.id,
          done: !task.done,
        });
      return;
    }
    if (action === "studio-book-all") {
      this._bookSelected = new Set(
        (this._fullCatalog || asArray(this._data.recipes?.items)).slice(0, 120).map((x) => x.slug),
      );
      this._render();
      return;
    }
    if (action === "studio-book-clear") {
      this._bookSelected = new Set();
      this._render();
      return;
    }
    if (["studio-ha-scene", "studio-ha-quiet", "studio-ha-tts"].includes(action)) {
      if (!this._hass?.callService) {
        this._flash(this.t("studioOnlyHomeAssistant"));
        return;
      }
      const config = this._config || {};
      const scene = String(config.cooking_scene || ""),
        player = String(config.cooking_media_player || ""),
        engine = String(config.cooking_tts_engine || "");
      const valid = (entity, domain) =>
        new RegExp("^" + domain + "\\.[a-z0-9_]+$", "i").test(entity);
      try {
        if (action === "studio-ha-scene" && valid(scene, "scene"))
          await this._hass.callService("scene", "turn_on", { entity_id: scene });
        else if (action === "studio-ha-quiet" && valid(player, "media_player"))
          await this._hass.callService("media_player", "volume_set", {
            entity_id: player,
            volume_level: Math.max(0, Math.min(1, Number(config.cooking_volume) || 0.18)),
          });
        else if (
          action === "studio-ha-tts" &&
          valid(engine, "tts") &&
          valid(player, "media_player")
        ) {
          const step = instructionText(asArray(this._detail?.recipeInstructions)[this._cookIndex]);
          if (!step) throw Error(this.t("studioNoStep"));
          await this._hass.callService("tts", "speak", {
            entity_id: engine,
            media_player_entity_id: player,
            message: step.slice(0, 1200),
            cache: false,
          });
        } else throw Error(this.t("studioDeviceInvalid"));
        this._flash(this.t("studioConfirmAvailable"));
      } catch (error) {
        this._flash(
          this.t("studioActionFailed", {
            error: error?.message || this.t("studioDiagnosticsError"),
          }),
        );
      }
      return;
    }
    if (action === "studio-read-step") {
      if (!this._detail) return;
      const step = instructionText(asArray(this._detail.recipeInstructions)[this._cookIndex]);
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(step);
        utterance.lang = this.t(this._locale === "de" ? "studioSpeechDe" : "studioSpeechEn");
        utterance.rate = 0.91;
        speechSynthesis.speak(utterance);
      } else this._flash(this.t("studioReadUnsupported"));
      return;
    }
    if (action === "studio-voice-command") {
      const API = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!API) {
        this._flash(this.t("studioVoiceUnsupported"));
        return;
      }
      const isGerman = this._locale === "de";
      const recognizer = new API();
      recognizer.lang = this.t(isGerman ? "studioSpeechDe" : "studioSpeechEn");
      recognizer.interimResults = false;
      recognizer.maxAlternatives = 1;
      recognizer.onresult = (e) => {
        const speech = String(e.results?.[0]?.[0]?.transcript || "").toLocaleLowerCase(
          this._locale || "en",
        );
        if (isGerman ? /weiter|nächster/.test(speech) : /next|forward|continue/.test(speech))
          this._cookIndex = Math.min(
            asArray(this._detail?.recipeInstructions).length - 1,
            this._cookIndex + 1,
          );
        else if (isGerman ? /zurück/.test(speech) : /back|previous/.test(speech))
          this._cookIndex = Math.max(0, this._cookIndex - 1);
        else if (isGerman ? /vorlesen|lesen/.test(speech) : /read|read aloud/.test(speech)) {
          const b = this.shadowRoot.querySelector('[data-action="studio-read-step"]');
          b?.click();
        } else if (/wie viel|wieviel|wie viele|how much|how many/.test(speech)) {
          const rows = asArray(this._detail?.recipeIngredient);
          const ask = AtelierStudio.clean(
            speech.replace(
              /wie viel|wieviel|wie viele|brauche ich|ist|an|how much|how many|do i need|need/g,
              "",
            ),
          );
          const matched = rows.find((row) =>
            AtelierStudio.similarity(AtelierStudio.ingredient(row), ask),
          );
          const answer = matched
            ? AtelierStudio.ingredient(matched)
            : this.t("studioIngredientNoMatch");
          this._flash(answer);
          if ("speechSynthesis" in window) {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(answer);
            u.lang = this.t(isGerman ? "studioSpeechDe" : "studioSpeechEn");
            speechSynthesis.speak(u);
          }
        } else this._flash(this.t("studioVoiceUnknown", { command: speech }));
        this._render();
      };
      recognizer.onerror = () => this._flash(this.t("studioMicrophoneError"));
      try {
        recognizer.start();
      } catch {
        this._flash(this.t("studioSpeechStartFailed"));
      }
      return;
    }
    if (action === "studio-replacement") {
      if (!this._detail) return;
      const raw = await this._atelierDialog({
        title: this.t("studioReplaceTitle"),
        body: this.t("studioReplaceBody"),
        kind: "prompt",
        confirmLabel: this.t("studioShowAlternatives"),
      });
      if (!raw) return;
      const found = AtelierStudio.substitutions(raw);
      let output = found
        .map((x) => `${x.from}: ${this.t(x.to)} (${this.t(x.warning)})`)
        .join(" · ");
      if (!output) {
        try {
          const answer = await this._ws("studio_substitute", {
            ingredient: raw.slice(0, 160),
            recipe: this._detail.name.slice(0, 200),
          });
          output =
            answer.alternatives.map((x) => `${x.name}: ${x.adjustment}`).join(" · ") +
            " · " +
            answer.warning;
        } catch (error) {
          output = this.t("studioSubstituteError", {
            error: error?.code === "ai_error" ? this.t("errAiError") : error?.message || "",
          });
        }
      }
      this._aiSwap = output;
      this._render();
      return;
    }
    if (action === "studio-ai-audit") {
      if (!this._detail) return;
      if (
        !(await this._atelierDialog({
          title: this.t("studioAiAuditTitle"),
          body: this.t("studioAiAuditBody"),
          confirmLabel: this.t("studioAiConsent"),
        }))
      )
        return;
      this._flash(this.t("studioAiStarting"));
      try {
        const result = await this._ws("studio_ai_audit", { slug: this._detail.slug });
        this._aiAudit = result;
        this._render();
      } catch (error) {
        this._flash(
          this.t("studioAiUnavailable", {
            error: error?.code === "ai_error" ? this.t("errAiError") : error?.message || "",
          }),
        );
      }
      return;
    }
    if (action === "studio-recipe-audit") {
      if (!this._detail) return;
      const r = AtelierStudio.audit(this._detail);
      await this._atelierDialog({
        kind: "info",
        title: this.t("studioAuditTitle", { score: r.score }),
        body:
          (r.problems.map((x) => "• " + atMessage(this.t.bind(this), x)).join("\n") ||
            this.t("studioAuditNone")) +
          "\n\n" +
          this.t("studioAuditDisclaimer"),
      });
      return;
    }
    return;
  }
  if (action === "cook-start" && this._detail) {
    const slug = this._detail.slug,
      name = this._detail.name;
    const active = this._studio?.family?.session;
    const existed = active?.slug === slug;
    // Starting a different recipe must never destroy shared tasks/timers silently.
    const replace = Boolean(
      active &&
        !existed &&
        this._permissions.can_write &&
        (await this._atelierDialog({
          title: this.t("studioSessionReplaceTitle"),
          body: this.t("studioSessionReplaceBody", { name: active.name }),
          confirmLabel: this.t("studioSessionReplaceConfirm"),
        })),
    );
    // The dialog awaited above, so the original event no longer targets the button.
    await _atOriginalClick.call(this, { target: el });
    if (this._permissions.can_write && !existed && (!active || replace))
      await this._studioWrite("session_start", { slug, name, replace_existing: replace });
    return;
  }
  if ((action === "cook-next" || action === "cook-back") && this._detail) {
    const session = this._studio?.family?.session,
      slug = this._detail.slug,
      steps = this._detail.recipeInstructions || [];
    await _atOriginalClick.call(this, event);
    if (session?.slug === slug && this._permissions.can_write)
      await this._studioWrite("session_step", {
        session_id: session.id,
        step: Math.max(0, Math.min(steps.length - 1, this._cookIndex)),
      });
    return;
  }
  if (action === "cook-finish" && this._detail) {
    const slug = this._detail.slug,
      previous = this._studio?.journal?.[slug] || {};
    await _atOriginalClick.call(this, event);
    if (this._canJournal)
      await this._studioWrite("journal_set", {
        slug,
        note: previous.note || "",
        rating: previous.rating || 0,
        favorite: previous.favorite || false,
        cooked: true,
      });
    return;
  }
  return _atOriginalClick.call(this, event);
};
MealieAtelierCard.prototype._handleSubmit = async function (event) {
  const form = event.target?.closest?.("[data-form]");
  const type = form?.dataset?.form;
  if (type?.startsWith("studio-")) {
    event.preventDefault();
    if (!this._studio) return;
    const values = Object.fromEntries(new FormData(form).entries());
    let ok = false;
    if (type === "studio-profile")
      ok = await this._studioWrite("profile_set", {
        people: Number(values.people),
        maxMinutes: Number(values.maxMinutes),
        diets: values.diet ? [values.diet] : [],
        exclude: String(values.exclude || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 30),
      });
    if (type === "studio-pantry")
      ok = await this._studioWrite("pantry_put", {
        id: form.dataset.rowId || undefined,
        name: values.name,
        amount: Number(values.amount),
        unit: values.unit,
        expires: values.expires || "",
        staple: values.staple === "on",
      });
    if (type === "studio-member")
      ok = await this._studioWrite("family_member", {
        name: values.name,
        child: values.child === "on",
      });
    if (type === "studio-task") {
      const member = this._studio.family.members.find((x) => x.id === values.memberId);
      if (member?.child && !values.adultApproved) {
        this._flash(this.t("studioAdultApprovalRequired"));
        return;
      }
      ok = await this._studioWrite("session_task", {
        session_id: this._studio.family.session?.id,
        text: values.text,
        memberId: values.memberId,
        adultApproved: values.adultApproved === "on",
      });
    }
    if (type === "studio-timer")
      ok = await this._studioWrite("session_timer", {
        session_id: this._studio.family.session?.id,
        name: values.name,
        minutes: Number(values.minutes),
      });
    if (type === "studio-book") {
      await this._studioPrintBook({
        title: String(values.title || this.t("cookbookTitleDefaultPrint")).slice(0, 100),
        subtitle: String(values.subtitle || "").slice(0, 160),
        photos: values.photos === "on",
      });
      return;
    }
    if (ok) {
      this._flash(this.t("studioSaved"));
    }
    return;
  }
  if (type === "journal" && this._detail) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const previous = this._studio?.journal?.[this._detail.slug] || {};
    const ok = await this._studioWrite("journal_set", {
      slug: this._detail.slug,
      rating: Number(values.rating) || 0,
      note: String(values.note || "").slice(0, 1200),
      favorite: values.favorite === "on",
      cooked: false,
    });
    if (ok) {
      this._modal = "recipe";
      this._flash(this.t("studioJournalSavedToast"));
    }
    return;
  }
  return _atOriginalSubmit.call(this, event);
};
const _atOriginalInput = MealieAtelierCard.prototype._handleInput;
MealieAtelierCard.prototype._handleInput = function (event) {
  if (event.target?.hasAttribute("data-book")) {
    if (!this._bookSelected) this._bookSelected = new Set();
    if (event.target.checked) this._bookSelected.add(event.target.dataset.book);
    else this._bookSelected.delete(event.target.dataset.book);
    const count = this.shadowRoot.querySelector("[data-book-selected-count]");
    if (this._view === "cookbook" && count) count.textContent = String(this._bookSelected.size);
    const submit = this.shadowRoot.querySelector('[data-form="studio-book"] button[type="submit"]');
    if (submit) submit.disabled = !this._bookSelected.size;
    return;
  }
  return _atOriginalInput.call(this, event);
};
/* ATELIER STUDIO EXTENSION END */

class AtelierTodayCard extends MealieAtelierCard {
  static getStubConfig(hass) {
    return { mode: "today", title: stubTitle(hass, "today") };
  }
}
class AtelierRecipeCard extends MealieAtelierCard {
  static getStubConfig(hass) {
    return { mode: "recipes", title: stubTitle(hass, "recipes") };
  }
}
class AtelierMealplanCard extends MealieAtelierCard {
  static getStubConfig(hass) {
    return { mode: "mealplan", title: stubTitle(hass, "mealplan") };
  }
}
class AtelierShoppingCard extends MealieAtelierCard {
  static getStubConfig(hass) {
    return { mode: "shopping", title: stubTitle(hass, "shopping") };
  }
}
class AtelierDiscoverCard extends MealieAtelierCard {
  static getStubConfig(hass) {
    return { mode: "discover", title: stubTitle(hass, "discover") };
  }
}
class AtelierPantryCard extends MealieAtelierCard {
  static getStubConfig(hass) {
    return { mode: "pantry", title: stubTitle(hass, "pantry") };
  }
}
class AtelierFamilyCard extends MealieAtelierCard {
  static getStubConfig(hass) {
    return { mode: "family", title: stubTitle(hass, "family") };
  }
}
class AtelierCookbookCard extends MealieAtelierCard {
  static getStubConfig(hass) {
    return { mode: "cookbook", title: stubTitle(hass, "cookbook") };
  }
}
class AtelierManageCard extends MealieAtelierCard {
  static getStubConfig(hass) {
    return { mode: "manage", title: stubTitle(hass, "manage") };
  }
}

// Native Home Assistant visual card editor (no YAML editing required).
const EDITOR_STYLE = "/* Home Assistant visual card editor; inherits the same control geometry as Atelier. */\n:host {\n  --ds-motion-fast: 140ms;\n  --ds-motion-base: 220ms;\n  --ds-motion-enter: 300ms;\n  --ds-motion-slow: 480ms;\n  --ds-motion-image: 680ms;\n  --ds-motion-image-long: 960ms;\n  --ds-motion-loading: 1800ms;\n  --ds-motion-reduced: 0.01ms;\n  --ds-motion-ease: cubic-bezier(0.2, 0.8, 0.2, 1);\n  --ds-motion-spring: cubic-bezier(0.18, 1.12, 0.32, 1);\n  --ds-motion-linear: linear;\n  --ed-text: var(--primary-text-color, #eaf0eb);\n  --ed-muted: var(--secondary-text-color, #a4b0aa);\n  --ed-surface: var(--card-background-color, #1b2722);\n  --ed-border: var(--divider-color, #74847a65);\n  --ed-accent: var(--primary-color, #9dcbb2);\n  display: block;\n  font-family: Inter, ui-sans-serif, system-ui, sans-serif;\n  color: var(--ed-text);\n}\n*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n.editor {\n  display: grid;\n  gap: 12px;\n  padding: 16px 4px 20px;\n}\n.title {\n  font:\n    600 21px/1.2 Georgia,\n    serif;\n  letter-spacing: -0.025em;\n  margin-bottom: 4px;\n}\n.hint {\n  font-size: 12px;\n  line-height: 1.6;\n  color: var(--ed-muted);\n  margin: 0 0 3px;\n  overflow-wrap: anywhere;\n}\n.group {\n  display: grid;\n  gap: 7px;\n  min-width: 0;\n  padding: 4px 0;\n}\n.group > label {\n  font-size: 13px;\n  line-height: 1.4;\n  font-weight: 650;\n}\n:where(select, input:not([type=\"checkbox\"])) {\n  box-sizing: border-box;\n  min-height: 48px;\n  min-width: 0;\n  width: 100%;\n  border: 1px solid var(--ed-border);\n  border-radius: 12px;\n  background: var(--ed-surface);\n  color: var(--ed-text);\n  padding: 12px 14px;\n  font: inherit;\n  font-size: 14px;\n  line-height: 1.4;\n  transition:\n    border-color var(--ds-motion-fast) var(--ds-motion-ease),\n    box-shadow var(--ds-motion-fast) var(--ds-motion-ease);\n}\n:where(select, input:not([type=\"checkbox\"])):hover {\n  border-color: var(--ed-accent);\n}\n:where(select, input:not([type=\"checkbox\"])):focus-visible {\n  outline: 2px solid var(--ed-accent);\n  outline-offset: 2px;\n}\nselect {\n  cursor: pointer;\n  -webkit-appearance: none;\n  appearance: none;\n  padding-inline-end: 46px !important;\n  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23a7b7ad' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\");\n  background-repeat: no-repeat;\n  background-position: right 15px center;\n  background-size: 18px;\n}\n.group :where(select, input:not([type=\"checkbox\"])) {\n  margin: 0;\n}\n.group {\n  gap: 9px;\n  padding-block: 6px;\n}\n.group > label {\n  margin: 0;\n  line-height: 1.5;\n}\n.line {\n  min-height: 52px;\n  gap: 14px;\n  padding: 12px 15px;\n}\n\ninput[type=\"checkbox\"] {\n  -webkit-appearance: none;\n  appearance: none;\n  margin: 0;\n  padding: 0;\n  min-width: 22px;\n  width: 22px;\n  min-height: 22px;\n  height: 22px;\n  flex: 0 0 22px;\n  display: grid;\n  place-content: center;\n  border: 1.5px solid var(--ed-muted);\n  border-radius: 6px;\n  background: var(--ed-surface);\n  cursor: pointer;\n  transition:\n    border-color var(--ds-motion-fast) var(--ds-motion-ease),\n    background var(--ds-motion-fast) var(--ds-motion-ease);\n}\ninput[type=\"checkbox\"]::before {\n  content: \"\";\n  width: 11px;\n  height: 7px;\n  border: solid #13291d;\n  border-width: 0 0 2.5px 2.5px;\n  transform: translateY(-1px) rotate(-45deg) scale(0);\n  opacity: 0;\n  transition:\n    opacity var(--ds-motion-fast) var(--ds-motion-ease),\n    transform var(--ds-motion-fast) var(--ds-motion-ease);\n}\ninput[type=\"checkbox\"]:checked {\n  background: var(--ed-accent);\n  border-color: var(--ed-accent);\n}\ninput[type=\"checkbox\"]:checked::before {\n  transform: translateY(-1px) rotate(-45deg) scale(1);\n  opacity: 1;\n}\ninput[type=\"checkbox\"]:focus-visible {\n  outline: 2px solid var(--ed-accent);\n  outline-offset: 3px;\n}\n.line {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  min-height: 48px;\n  padding: 11px 12px;\n  border: 1px solid var(--ed-border);\n  border-radius: 12px;\n  cursor: pointer;\n  background: color-mix(in srgb, var(--ed-surface) 94%, var(--ed-accent));\n  font-size: 13px;\n  font-weight: 550;\n  line-height: 1.45;\n}\n.line:hover {\n  border-color: color-mix(in srgb, var(--ed-accent) 50%, var(--ed-border));\n}\n.line:has(input:checked) {\n  border-color: color-mix(in srgb, var(--ed-accent) 40%, var(--ed-border));\n}\n.line:has(input:focus-visible) {\n  outline: 2px solid var(--ed-accent);\n  outline-offset: 2px;\n}\n@media (prefers-reduced-motion: reduce) {\n  input,\n  select {\n    transition: none !important;\n  }\n}\n@media (forced-colors: active) {\n  input[type=\"checkbox\"]:checked {\n    background: Highlight;\n    border-color: Highlight;\n  }\n}\n/* The editor shares the same editorial hierarchy as the cards. */\n.title {\n  font-size: 23px;\n  margin: 0 0 4px;\n}\n.title-accent {\n  color: var(--ed-accent);\n  font-style: italic;\n  font-weight: 500;\n}\n.section-head {\n  display: grid;\n  grid-template-columns: 34px minmax(0, 1fr);\n  align-items: start;\n  gap: 12px;\n  margin: 18px 0 2px;\n  padding: 17px 4px 10px;\n  border-top: 1px solid var(--ed-border);\n}\n.section-head > span {\n  color: var(--ed-accent);\n  font-size: 11px;\n  letter-spacing: 0.07em;\n  font-weight: 800;\n  padding-top: 3px;\n}\n.section-head strong {\n  font:\n    500 21px/1.2 Georgia,\n    serif;\n  letter-spacing: -0.03em;\n}\n.section-head p {\n  margin: 4px 0 0;\n  color: var(--ed-muted);\n  font-size: 12px;\n  line-height: 1.5;\n}\n.editor-footer {\n  border-top: 1px solid var(--ed-border);\n  padding-top: 18px;\n  margin-top: 14px;\n}\n:where(select, input:not([type=\"checkbox\"])):user-invalid {\n  border-color: #d99c82;\n  box-shadow: 0 0 0 3px #d99c8222;\n}\n:where(select, input:not([type=\"checkbox\"])):disabled {\n  opacity: 0.52;\n  cursor: not-allowed;\n}\ninput[type=\"checkbox\"]:disabled {\n  opacity: 0.48;\n  cursor: not-allowed;\n}\n\n.editor.setup-editor {\n  width: min(100%, 780px);\n  margin-inline: auto;\n  gap: 20px;\n  padding: 18px 4px 24px;\n}\n.setup-header,\n.settings-top {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 22px;\n}\n.setup-brand {\n  font-size: 10px;\n  font-weight: 800;\n  letter-spacing: 0.16em;\n  color: var(--ed-muted);\n}\n.setup-brand span {\n  color: var(--ed-accent);\n}\n.setup-header h1 {\n  max-width: 560px;\n  margin: 10px 0 7px;\n  font:\n    500 clamp(29px, 5vw, 40px) / 1.08 Georgia,\n    serif;\n  letter-spacing: -0.035em;\n}\n.setup-header p,\n.setup-description {\n  max-width: 570px;\n  margin: 0;\n  color: var(--ed-muted);\n  font-size: 13px;\n  line-height: 1.65;\n}\n.setup-skip,\n.editor-link-button {\n  border: 0;\n  padding: 8px 0;\n  background: transparent;\n  color: var(--ed-muted);\n  font-family: inherit;\n  font-size: 12px;\n  font-weight: 600;\n  line-height: 1.4;\n  white-space: nowrap;\n  text-decoration: underline;\n  text-decoration-color: color-mix(in srgb, var(--ed-muted) 42%, transparent);\n  text-underline-offset: 4px;\n  cursor: pointer;\n}\n.setup-skip:hover,\n.editor-link-button:hover {\n  color: var(--ed-text);\n}\n.setup-skip:focus-visible,\n.editor-link-button:focus-visible,\n.setup-link:focus-visible {\n  outline: 2px solid var(--ed-accent);\n  outline-offset: 4px;\n  border-radius: 4px;\n}\n.setup-progress {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 0;\n  margin: 4px 0 0;\n  padding: 0;\n  list-style: none;\n}\n.setup-progress li {\n  position: relative;\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);\n  align-content: start;\n  gap: 7px;\n  min-width: 0;\n  padding: 0 10px 0 0;\n  color: var(--ed-muted);\n}\n.setup-progress li:before {\n  content: \"\";\n  position: absolute;\n  z-index: 0;\n  top: 15px;\n  left: 16px;\n  right: -16px;\n  height: 1px;\n  background: var(--ed-border);\n}\n.setup-progress li:last-child:before {\n  display: none;\n}\n.setup-progress li > span {\n  z-index: 1;\n  display: grid;\n  place-items: center;\n  width: 31px;\n  height: 31px;\n  border: 1px solid var(--ed-border);\n  border-radius: 50%;\n  background: var(--ed-surface);\n  font:\n    700 10px/1 ui-monospace,\n    monospace;\n  color: var(--ed-muted);\n}\n.setup-progress li small {\n  overflow: hidden;\n  font-size: 11px;\n  line-height: 1.35;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.setup-progress li.current {\n  color: var(--ed-text);\n}\n.setup-progress li.current > span,\n.setup-progress li.complete > span {\n  border-color: var(--ed-accent);\n  background: var(--ed-accent);\n  color: #13251b;\n}\n.setup-progress li.complete:before {\n  background: var(--ed-accent);\n}\n.setup-panel {\n  display: grid;\n  gap: 13px;\n  min-height: 310px;\n  padding: clamp(20px, 4vw, 32px);\n  border: 1px solid var(--ed-border);\n  border-radius: 20px;\n  background: color-mix(in srgb, var(--ed-surface) 91%, var(--ed-accent));\n  animation: setup-panel-in var(--ds-motion-enter) var(--ds-motion-ease) both;\n}\n.setup-kicker {\n  margin: 0 0 1px;\n  color: var(--ed-accent);\n  font-size: 10px;\n  font-weight: 800;\n  letter-spacing: 0.13em;\n}\n.setup-step-title {\n  margin: 0;\n  font:\n    500 clamp(25px, 4vw, 32px) / 1.16 Georgia,\n    serif;\n  letter-spacing: -0.025em;\n  outline: 0;\n}\n.setup-step-title:focus-visible {\n  border-radius: 3px;\n  outline: 2px solid var(--ed-accent);\n  outline-offset: 5px;\n}\n.setup-description {\n  margin-top: -4px;\n}\n.setup-state {\n  display: flex;\n  align-items: center;\n  gap: 11px;\n  min-height: 104px;\n  padding: 17px;\n  border: 1px solid var(--ed-border);\n  border-radius: 14px;\n  color: var(--ed-muted);\n  font-size: 13px;\n}\n.setup-spinner {\n  width: 17px;\n  height: 17px;\n  flex: none;\n  border: 2px solid color-mix(in srgb, var(--ed-accent) 28%, transparent);\n  border-top-color: var(--ed-accent);\n  border-radius: 50%;\n  animation: setup-spin var(--ds-motion-slow) var(--ds-motion-linear) infinite;\n}\n.setup-callout {\n  display: grid;\n  gap: 8px;\n  padding: 18px;\n  border: 1px solid color-mix(in srgb, var(--ed-accent) 24%, var(--ed-border));\n  border-radius: 14px;\n  background: color-mix(in srgb, var(--ed-surface) 84%, var(--ed-accent));\n}\n.setup-callout strong {\n  font:\n    500 18px/1.25 Georgia,\n    serif;\n  color: var(--ed-text);\n}\n.setup-callout > span {\n  max-width: 610px;\n  color: var(--ed-muted);\n  font-size: 12px;\n  line-height: 1.65;\n}\n.setup-callout-actions {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 14px;\n  margin-top: 3px;\n}\n.setup-link {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  width: max-content;\n  max-width: 100%;\n  margin-top: 4px;\n  padding: 10px 13px;\n  border: 1px solid var(--ed-border);\n  border-radius: 10px;\n  color: var(--ed-text);\n  background: var(--ed-surface);\n  font-size: 12px;\n  font-weight: 700;\n  text-decoration: none;\n}\n.setup-link:hover {\n  border-color: var(--ed-accent);\n  color: var(--ed-text);\n}\n.setup-assurance {\n  padding-top: 5px;\n  color: var(--ed-muted);\n  font-size: 11px;\n}\n.setup-assurance span {\n  padding-inline: 5px;\n  color: var(--ed-accent);\n}\n.provider-card {\n  display: grid;\n  gap: 12px;\n  padding: 16px;\n  border: 1px solid color-mix(in srgb, var(--ed-accent) 34%, var(--ed-border));\n  border-radius: 16px;\n  background: color-mix(in srgb, var(--ed-surface) 90%, var(--ed-accent));\n  animation: setup-panel-in var(--ds-motion-enter) var(--ds-motion-ease) both;\n}\n.provider-card p {\n  max-width: 620px;\n  margin: 0;\n  color: var(--ed-muted);\n  font-size: 12px;\n  line-height: 1.65;\n}\n.provider-card-head {\n  display: grid;\n  grid-template-columns: 38px minmax(0, 1fr) auto;\n  align-items: center;\n  gap: 11px;\n}\n.provider-mark {\n  display: grid;\n  place-items: center;\n  width: 38px;\n  height: 38px;\n  border: 1px solid color-mix(in srgb, var(--ed-accent) 40%, var(--ed-border));\n  border-radius: 12px;\n  background: var(--ed-surface);\n  color: var(--ed-accent);\n  font:\n    600 19px Georgia,\n    serif;\n}\n.provider-card-head > div {\n  display: grid;\n  gap: 3px;\n  min-width: 0;\n}\n.provider-card-head strong {\n  font-size: 13px;\n}\n.provider-card-head small {\n  color: var(--ed-muted);\n  font-size: 11px;\n}\n.provider-badge {\n  padding: 5px 8px;\n  border: 1px solid color-mix(in srgb, var(--ed-accent) 42%, var(--ed-border));\n  border-radius: var(--ds-radius-pill, 999px);\n  color: var(--ed-accent);\n  font-size: 9px;\n  font-weight: 800;\n  letter-spacing: 0.08em;\n}\n.setup-live-preview {\n  display: grid;\n  grid-template-columns: 120px minmax(0, 1fr);\n  align-items: center;\n  gap: 18px;\n  margin-top: 5px;\n  padding: 15px;\n  border: 1px solid var(--ed-border);\n  border-radius: 15px;\n  background: var(--ed-surface);\n}\n.setup-preview-art {\n  position: relative;\n  height: 82px;\n  overflow: hidden;\n  border-radius: 10px;\n  background: linear-gradient(\n    135deg,\n    color-mix(in srgb, var(--ed-accent) 40%, var(--ed-surface)),\n    var(--ed-surface)\n  );\n}\n.setup-preview-art:before {\n  content: \"\";\n  position: absolute;\n  inset: 15px 17px 20px;\n  border: 1px solid color-mix(in srgb, var(--ed-accent) 48%, var(--ed-border));\n  border-radius: 7px;\n  background: color-mix(in srgb, var(--ed-surface) 74%, var(--ed-accent));\n}\n.setup-preview-art span,\n.setup-preview-art i,\n.setup-preview-art b {\n  position: absolute;\n  bottom: 9px;\n  width: 25px;\n  height: 20px;\n  border: 1px solid color-mix(in srgb, var(--ed-accent) 35%, var(--ed-border));\n  border-radius: 4px;\n  background: var(--ed-surface);\n}\n.setup-preview-art span {\n  left: 13px;\n}\n.setup-preview-art i {\n  left: 47px;\n}\n.setup-preview-art b {\n  left: 81px;\n}\n.setup-live-preview > div:last-child {\n  display: grid;\n  gap: 5px;\n  min-width: 0;\n}\n.setup-live-preview small {\n  color: var(--ed-accent);\n  font-size: 9px;\n  font-weight: 800;\n  letter-spacing: 0.12em;\n}\n.setup-live-preview strong {\n  font:\n    500 18px/1.25 Georgia,\n    serif;\n}\n.setup-live-preview > div:last-child > span {\n  color: var(--ed-muted);\n  font-size: 11px;\n  line-height: 1.5;\n}\n.setup-presets {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 13px;\n  margin-top: 5px;\n}\n.setup-preset {\n  display: grid;\n  gap: 7px;\n  min-width: 0;\n  padding: 9px 9px 13px;\n  border: 1px solid var(--ed-border);\n  border-radius: 14px;\n  background: var(--ed-surface);\n  color: var(--ed-text);\n  text-align: left;\n  cursor: pointer;\n  transition:\n    border-color var(--ds-motion-fast) var(--ds-motion-ease),\n    transform var(--ds-motion-fast) var(--ds-motion-ease);\n}\n.setup-preset:hover {\n  transform: translateY(-2px);\n  border-color: color-mix(in srgb, var(--ed-accent) 60%, var(--ed-border));\n}\n.setup-preset:focus-visible {\n  outline: 2px solid var(--ed-accent);\n  outline-offset: 3px;\n}\n.setup-preset.selected {\n  border-color: var(--ed-accent);\n  box-shadow: inset 0 0 0 1px var(--ed-accent);\n}\n.preset-art {\n  position: relative;\n  display: block;\n  height: 96px;\n  overflow: hidden;\n  border-radius: 9px;\n  background: #17231d;\n}\n.preset-art:before {\n  content: \"\";\n  position: absolute;\n  inset: 11px 12px 13px 48%;\n  border: 1px solid #ffffff22;\n  border-radius: 6px;\n  background: #22372c;\n}\n.preset-art i,\n.preset-art b,\n.preset-art em {\n  position: absolute;\n  display: block;\n  border-radius: 4px;\n}\n.preset-art i {\n  top: 17px;\n  left: 13px;\n  width: 27%;\n  height: 26px;\n  background: #789b7d;\n}\n.preset-art b {\n  top: 50px;\n  left: 13px;\n  width: 27%;\n  height: 31px;\n  background: #526e5a;\n}\n.preset-art em {\n  top: 19px;\n  left: 54%;\n  right: 10px;\n  height: 5px;\n  background: #bdd4c2;\n  box-shadow:\n    0 11px 0 #8da895,\n    0 23px 0 #48634f;\n}\n.preset-light {\n  background: #edf1eb;\n}\n.preset-light:before {\n  border-color: #25352c24;\n  background: #fff;\n}\n.preset-light i {\n  background: #dfaa83;\n}\n.preset-light b {\n  background: #cfddc5;\n}\n.preset-light em {\n  background: #536c5b;\n  box-shadow:\n    0 11px 0 #87958a,\n    0 23px 0 #d6ded8;\n}\n.setup-preset strong {\n  padding: 2px 4px 0;\n  font-size: 13px;\n}\n.setup-preset small {\n  padding: 0 4px;\n  color: var(--ed-muted);\n  font-size: 10px;\n  line-height: 1.45;\n}\n.setup-reassure {\n  margin: 0;\n  color: var(--ed-muted);\n  font-size: 11px;\n  line-height: 1.5;\n}\n.setup-actions {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  margin-top: auto;\n  padding-top: 18px;\n  border-top: 1px solid var(--ed-border);\n}\n.editor-primary,\n.editor-secondary {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 10px;\n  min-height: 46px;\n  padding: 11px 17px;\n  border: 1px solid var(--ed-border);\n  border-radius: 999px;\n  background: var(--ed-surface);\n  color: var(--ed-text);\n  font-family: inherit;\n  font-size: 12px;\n  font-weight: 650;\n  line-height: 1.2;\n  cursor: pointer;\n  transition:\n    transform var(--ds-motion-fast) var(--ds-motion-ease),\n    background var(--ds-motion-fast) var(--ds-motion-ease),\n    border-color var(--ds-motion-fast) var(--ds-motion-ease);\n}\n.editor-primary {\n  border-color: var(--ed-accent);\n  background: var(--ed-accent);\n  color: #14251b;\n}\n.editor-primary:hover,\n.editor-secondary:hover {\n  transform: translateY(-1px);\n}\n.editor-primary:focus-visible,\n.editor-secondary:focus-visible {\n  outline: 2px solid var(--ed-accent);\n  outline-offset: 3px;\n}\n.editor-primary:active,\n.editor-secondary:active {\n  transform: scale(0.98);\n}\n.setup-footer {\n  margin: -5px 0 0;\n  color: var(--ed-muted);\n  font-size: 11px;\n  line-height: 1.55;\n  text-align: center;\n}\n.settings-top {\n  align-items: center;\n}\n.setup-success {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 13px 15px;\n  border: 1px solid color-mix(in srgb, var(--ed-accent) 38%, var(--ed-border));\n  border-radius: 13px;\n  background: color-mix(in srgb, var(--ed-surface) 85%, var(--ed-accent));\n}\n.setup-success > span {\n  display: grid;\n  place-items: center;\n  flex: none;\n  width: 27px;\n  height: 27px;\n  border-radius: 50%;\n  background: var(--ed-accent);\n  color: #13251b;\n  font-weight: 800;\n}\n.setup-success > div {\n  display: grid;\n  gap: 3px;\n}\n.setup-success strong {\n  font-size: 12px;\n}\n.setup-success small {\n  color: var(--ed-muted);\n  font-size: 11px;\n}\n.editor-advanced {\n  margin-top: 15px;\n  border-top: 1px solid var(--ed-border);\n  border-bottom: 1px solid var(--ed-border);\n}\n.editor-advanced > summary {\n  padding: 16px 3px;\n  color: var(--ed-text);\n  font-size: 13px;\n  font-weight: 700;\n  cursor: pointer;\n}\n.editor-advanced[open] {\n  padding-bottom: 12px;\n}\n@keyframes setup-panel-in {\n  from {\n    opacity: 0.65;\n    transform: translateY(5px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n@keyframes setup-spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n@media (max-width: 600px) {\n  .editor.setup-editor {\n    gap: 15px;\n    padding: 13px 2px 18px;\n  }\n  .setup-header {\n    gap: 10px;\n  }\n  .setup-header h1 {\n    font-size: 30px;\n  }\n  .setup-skip {\n    font-size: 11px;\n  }\n  .setup-progress li {\n    grid-template-columns: minmax(0, 1fr);\n    gap: 6px;\n    padding-right: 4px;\n  }\n  .setup-progress li > span {\n    width: 27px;\n    height: 27px;\n  }\n  .setup-progress li:before {\n    top: 13px;\n    left: 14px;\n    right: -14px;\n  }\n  .setup-progress li small {\n    font-size: 9px;\n    white-space: normal;\n  }\n  .setup-panel {\n    min-height: 330px;\n    padding: 19px 16px;\n    border-radius: 16px;\n  }\n  .setup-live-preview {\n    grid-template-columns: 86px minmax(0, 1fr);\n    gap: 11px;\n    padding: 11px;\n  }\n  .setup-preview-art {\n    height: 70px;\n  }\n  .setup-preview-art i {\n    left: 37px;\n  }\n  .setup-preview-art b {\n    left: 62px;\n  }\n  .setup-live-preview strong {\n    font-size: 16px;\n  }\n  .preset-art {\n    height: 72px;\n  }\n  .preset-art i {\n    top: 12px;\n    left: 9px;\n    height: 21px;\n  }\n  .preset-art b {\n    top: 39px;\n    left: 9px;\n    height: 22px;\n  }\n  .preset-art em {\n    top: 14px;\n    left: 54%;\n    right: 7px;\n  }\n  .setup-preset {\n    padding: 7px 7px 10px;\n  }\n  .setup-preset small {\n    font-size: 9px;\n  }\n  .editor-primary,\n  .editor-secondary {\n    min-height: 44px;\n    padding: 10px 14px;\n  }\n  .settings-top {\n    align-items: flex-start;\n    flex-direction: column;\n  }\n}\n@media (max-width: 360px) {\n  .setup-header h1 {\n    font-size: 26px;\n  }\n  .setup-skip {\n    white-space: normal;\n    text-align: right;\n  }\n  .setup-progress li small {\n    font-size: 8px;\n  }\n  .setup-live-preview {\n    grid-template-columns: 70px minmax(0, 1fr);\n  }\n  .setup-preview-art span {\n    left: 7px;\n  }\n  .setup-preview-art i {\n    left: 29px;\n  }\n  .setup-preview-art b {\n    left: 51px;\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  .setup-panel,\n  .setup-spinner {\n    animation: none !important;\n  }\n  .setup-preset,\n  .editor-primary,\n  .editor-secondary {\n    transition: none !important;\n  }\n}\n\n.accent-pick {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n}\n.accent-pick select {\n  flex: 1;\n}\n.accent-dot {\n  flex: none;\n  width: 22px;\n  height: 22px;\n  border-radius: 50%;\n  box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.45);\n}";

const COLOR_NAMES = {
  "#9dcbb2": "editorColorSage",
  "#e5ad92": "editorColorApricot",
  "#a8bdef": "editorColorPeriwinkle",
  "#d3adcd": "editorColorLilac",
  "#d6c07d": "editorColorHoney",
};
// Home Assistant visual card editor; the first-run path stays short and skippable.
class MealieAtelierEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = { ...DEFAULTS };
    this._entries = [];
    this._nativeEntries = [];
    this._entriesState = "loading";
    this._requested = false;
    this._step = 0;
    this._wizardMode = true;
    this._boundChange = this._handleChange.bind(this);
    this._boundClick = this._handleClick.bind(this);
  }
  setConfig(config) {
    // A focused card type without mode starts in its own view, as the card does.
    const tag = String(config?.type || "").replace(/^custom:/, "");
    const mode = customElements.get(tag)?.getStubConfig?.().mode;
    this._config = { ...DEFAULTS, ...(mode ? { mode } : {}), ...config };
    if (this._config._setup_complete === true) this._wizardMode = false;
    this._render();
  }
  set hass(hass) {
    if (this._hass === hass) return;
    const priorLanguage = this._hass?.language;
    this._hass = hass;
    if (this._requested) {
      if (priorLanguage !== hass?.language) this._render();
      return;
    }
    this._requested = true;
    this._entriesState = "loading";
    hass
      .callWS({ type: "mealie_atelier/status" })
      .then((result) => {
        this._entries = asArray(result?.entries);
        this._entriesState = "ready";
        if (this._entries.length === 1 && !this._config.entry_id) {
          this._config = { ...this._config, entry_id: this._entries[0].entry_id };
          this._emitConfig();
        }
        this._detectNativeEntries();
        if (!this._entries.length && this._nativeEntries.length) this._entriesState = "native";
        this._render();
      })
      .catch(() => {
        this._entries = [];
        this._detectNativeEntries();
        this._entriesState = this._nativeEntries.length ? "native" : "error";
        this._render();
      });
  }
  connectedCallback() {
    this._render();
    this.shadowRoot.addEventListener("change", this._boundChange);
    this.shadowRoot.addEventListener("click", this._boundClick);
  }
  disconnectedCallback() {
    this.shadowRoot.removeEventListener("change", this._boundChange);
    this.shadowRoot.removeEventListener("click", this._boundClick);
  }
  _locale() {
    return resolveLanguage("auto", this._hass?.language, navigator.language);
  }
  _tr(key) {
    return translateLabel(this._locale(), key);
  }
  _detectNativeEntries() {
    const entities = Object.values(this._hass?.entities || {}).filter(
      (entity) => entity?.platform === "mealie" && entity.config_entry_id,
    );
    const ids = [...new Set(entities.map((entity) => entity.config_entry_id))];
    this._nativeEntries = ids.map((id, index) => ({
      entry_id: id,
      name: entities.find((entity) => entity.config_entry_id === id)?.name || `Mealie ${index + 1}`,
    }));
    if (ids.length === 1 && !this._config.mealie_entry_id)
      this._config = { ...this._config, mealie_entry_id: ids[0] };
    if (ids.length && !this._entries.length && this._config.provider === "auto")
      this._config = {
        ...this._config,
        provider: "home_assistant",
        mode: this._config.mode === "dashboard" ? "recipes" : this._config.mode,
      };
  }
  _choose(key, options) {
    const c = this._config;
    const stored = c[key];
    // A stored value outside the presets stays selected (and saved) as an extra, labelled option.
    const unknown =
      stored !== undefined &&
      stored !== null &&
      stored !== "" &&
      !options.some(([value]) => String(value) === String(stored));
    const all = unknown
      ? [
          [stored, translateLabel(this._locale(), "editorCustomValue", { value: stored })],
          ...options,
        ]
      : options;
    return `<select id="atelier-${key}" data-key="${key}">${all.map(([value, label, disabled]) => `<option value="${esc(value)}" ${String(c[key]) === String(value) ? "selected" : ""} ${disabled ? "disabled" : ""}>${esc(label)}</option>`).join("")}</select>`;
  }
  _emitConfig() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: { ...this._config } },
        bubbles: true,
        composed: true,
      }),
    );
  }
  _handleChange(event) {
    const key = event.target.dataset.key;
    if (!key) return;
    let value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    if (key === "columns") value = Number(value) || 3;
    this._config = { ...this._config, [key]: value };
    this._emitConfig();
    if (key === "mode" || key === "provider") {
      this._render();
      this.shadowRoot.querySelector(`#atelier-${key}`)?.focus({ preventScroll: true });
    }
  }
  _handleClick(event) {
    const action = event.target.closest?.("[data-editor-action]")?.dataset.editorAction;
    if (!action) return;
    event.preventDefault();
    if (action === "step-next") {
      this._step = Math.min(2, this._step + 1);
      this._render();
      this.shadowRoot.querySelector(".setup-step-title")?.focus({ preventScroll: true });
      return;
    }
    if (action === "step-back") {
      this._step = Math.max(0, this._step - 1);
      this._render();
      this.shadowRoot.querySelector(".setup-step-title")?.focus({ preventScroll: true });
      return;
    }
    if (action === "preset") {
      const preset = event.target.closest("[data-preset]")?.dataset.preset;
      if (!preset) return;
      this._config = {
        ...this._config,
        ...(preset === "light"
          ? { theme: "light", accent: "#e5ad92", density: "comfortable", motion: "balanced" }
          : { theme: "dark", accent: "#9dcbb2", density: "comfortable", motion: "balanced" }),
      };
      this._emitConfig();
      this._render();
      return;
    }
    if (action === "finish" || action === "skip") {
      this._config = { ...this._config, _setup_complete: true };
      this._wizardMode = false;
      this._emitConfig();
      this._render();
      return;
    }
    if (action === "restart") {
      this._step = 0;
      this._config = { ...this._config, _setup_complete: false };
      this._wizardMode = true;
      this._emitConfig();
      this._render();
      return;
    }
    if (action === "retry") {
      if (!this._hass) return;
      this._entriesState = "loading";
      this._render();
      this._hass
        .callWS({ type: "mealie_atelier/status" })
        .then((result) => {
          this._entries = asArray(result?.entries);
          this._entriesState = "ready";
          if (this._entries.length === 1 && !this._config.entry_id) {
            this._config = { ...this._config, entry_id: this._entries[0].entry_id };
            this._emitConfig();
          }
          this._detectNativeEntries();
          if (!this._entries.length && this._nativeEntries.length) this._entriesState = "native";
          this._render();
        })
        .catch(() => {
          this._entries = [];
          this._detectNativeEntries();
          this._entriesState = this._nativeEntries.length ? "native" : "error";
          this._render();
        });
    }
  }
  _wizardMarkup() {
    const c = this._config,
      tr = (key) => this._tr(key),
      choose = (key, options) => this._choose(key, options);
    const steps = [tr("editorConnectKitchen"), tr("editorChooseYourStart"), tr("editorSetTheMood")];
    const progress = `<ol class="setup-progress" aria-label="${tr("editorSetupProgress")}">${steps.map((label, index) => `<li class="${index === this._step ? "current" : index < this._step ? "complete" : ""}" ${index === this._step ? 'aria-current="step"' : ""}><span>${index < this._step ? "✓" : `0${index + 1}`}</span><small>${label}</small></li>`).join("")}</ol>`;
    const account =
      this._entriesState === "loading"
        ? `<div class="setup-state"><span class="setup-spinner" aria-hidden="true"></span><span>${tr("editorCheckingHomeAssistantConnections")}</span></div>`
        : this._entriesState === "error"
          ? `<div class="setup-callout"><strong>${tr("editorCouldNotCheckYourConnections")}</strong><span>${tr("editorCheckThatMealieAtelierBridgeIsInstalledAndHomeAssistantIsOnline")}</span><div class="setup-callout-actions"><button class="editor-link-button" data-editor-action="retry">${tr("editorTryAgain")}</button><a class="setup-link" href="/config/integrations">${tr("editorOpenHomeAssistantIntegrations")} <span aria-hidden="true">↗</span></a></div></div>`
          : this._entriesState === "native"
            ? `<div class="provider-card"><div class="provider-card-head"><span class="provider-mark" aria-hidden="true">M</span><div><strong>${tr("editorHomeAssistantMealieFound")}</strong><small>${tr("editorDirectConnectionReadOnlyRecipes")}</small></div><span class="provider-badge">${tr("editorREADY")}</span></div><p>${tr("editorRecipeSearchAndCookingWorkWithoutAtelierBridgeProtectedPhotosEditingShoppingAndPlanningStayOptionalBridgeFeatures")}</p><div class="group"><label for="atelier-mealie_entry_id">${tr("editorMealieInstance")}</label>${choose(
                "mealie_entry_id",
                this._nativeEntries.map((entry) => [entry.entry_id, entry.name || entry.entry_id]),
              )}</div></div>`
            : this._entries.length
              ? `<div class="group"><label for="atelier-entry_id">${tr("editorYourMealieConnection")}</label>${choose("entry_id", [["", tr("editorChooseAConnectedKitchen")], ...this._entries.map((entry) => [entry.entry_id, entry.name || entry.title || entry.entry_id])])}<p class="hint">${tr("editorYourAPITokenStaysSafelyInsideTheHomeAssistantIntegration")}</p></div>`
              : `<div class="setup-callout"><strong>${tr("editorConnectMealieOnceInHomeAssistant")}</strong><span>${tr("editorAddMealieAtelierBridgeForTheFullStudioOrUseHomeAssistantSBuiltInMealieIntegrationForAReadOnlyRecipeCardCredentialsAreEnteredSecurelyInHomeAssistantNeverInThisCard")}</span><div class="setup-callout-actions"><a class="setup-link" href="/config/integrations">${tr("editorOpenHomeAssistantIntegrations")} <span aria-hidden="true">↗</span></a><button class="editor-link-button" data-editor-action="retry">${tr("editorIConnectedMealieCheckAgain")}</button></div></div>`;
    const assurance = this._entries.length
      ? `${tr("editorConnectedSecurely")} <span>·</span> ${tr("editorNoCredentialsInDashboardCards")}`
      : tr("editorYourCredentialsBelongInTheSecureIntegrationNeverInThisCard");
    const startLabels = {
      dashboard: tr("editorACompleteKitchenOverview"),
      today: tr("editorTodaySMealsAndKitchenTasks"),
      discover: tr("editorPersonalRecipeInspiration"),
      recipes: tr("editorYourCompleteRecipeCollection"),
      mealplan: tr("editorTheWeeklyMealPlan"),
      pantry: tr("editorIngredientsYouAlreadyHave"),
      shopping: tr("editorYourShoppingList"),
      family: tr("editorCookingTogetherAsAFamily"),
      cookbook: tr("editorYourSavedCookbooks"),
      manage: tr("editorRecipeAndKitchenTools"),
    };
    const activeTitle = tr(
      {
        dashboard: "editorPreviewDashboard",
        today: "editorPreviewToday",
        discover: "editorPreviewDiscover",
        recipes: "editorPreviewRecipes",
        mealplan: "editorPreviewMealplan",
        pantry: "editorPreviewPantry",
        shopping: "editorPreviewShopping",
        family: "editorPreviewFamily",
        cookbook: "editorPreviewCookbook",
        manage: "editorPreviewManage",
      }[c.mode] || "editorPreviewDashboard",
    );
    let panel = "";
    if (this._step === 0)
      panel = `<div class="setup-kicker">${tr("editorSTEP1CONNECTION")}</div><h2 class="setup-step-title" tabindex="-1">${tr("editorBringYourKitchenTogether")}</h2><p class="setup-description">${tr("editorAtelierReadsRecipesFromTheMealieConnectionAlreadyConfiguredInHomeAssistant")}</p>${account}<div class="setup-assurance">${assurance}</div>`;
    if (this._step === 1)
      panel = `<div class="setup-kicker">${tr("editorSTEP2YOURKITCHEN")}</div><h2 class="setup-step-title" tabindex="-1">${tr("editorWhatShouldOpenFirst")}</h2><p class="setup-description">${tr("editorPickAStartingPointEveryOtherViewStaysOneTapAway")}</p><div class="group"><label for="atelier-mode">${tr("editorStartIn")}</label>${choose(
        "mode",
        MODES.map((mode) => [mode, this._tr(mode)]),
      )}</div><div class="setup-live-preview"><div class="setup-preview-art" aria-hidden="true"><span></span><i></i><b></b></div><div><small>${tr("editorYOURATELIEROPENSTO")}</small><strong>${esc(activeTitle)}</strong><span>${esc(startLabels[c.mode] || startLabels.dashboard)}</span></div></div>`;
    if (this._step === 2)
      panel = `<div class="setup-kicker">${tr("editorSTEP3THEFEEL")}</div><h2 class="setup-step-title" tabindex="-1">${tr("editorMakeItFeelLikeYourKitchen")}</h2><p class="setup-description">${tr("editorChooseALookNowYouCanFineTuneEveryDetailLater")}</p><div class="setup-presets" role="group" aria-label="${tr("editorChooseAnAppearance")}">
      <button class="setup-preset ${c.theme === "dark" ? "selected" : ""}" type="button" data-editor-action="preset" data-preset="dark" aria-pressed="${c.theme === "dark"}"><span class="preset-art preset-dark"><i></i><b></b><em></em></span><strong>${tr("editorEveningStudio")}</strong><small>${tr("editorDeepGreenWarmLightEditorial")}</small></button>
      <button class="setup-preset ${c.theme === "light" ? "selected" : ""}" type="button" data-editor-action="preset" data-preset="light" aria-pressed="${c.theme === "light"}"><span class="preset-art preset-light"><i></i><b></b><em></em></span><strong>${tr("editorDaylightKitchen")}</strong><small>${tr("editorFreshSurfacesOpenAndBright")}</small></button>
      </div><p class="setup-reassure">${tr("editorYourRecipesAndMealieDataAreNeverChangedByTheseChoices")}</p>`;
    return `<div class="editor setup-editor"><header class="setup-header"><div><div class="setup-brand">MEALIE ATELIER <span>STUDIO</span></div><h1>${tr("editorAKitchenThatFeelsLikeYours")}</h1><p>${tr("editorThreeSmallChoicesYourKitchenReady")}</p></div><button class="setup-skip" type="button" data-editor-action="skip">${tr("editorSetUpLater")}</button></header>${progress}<section class="setup-panel" aria-live="polite">${panel}<nav class="setup-actions" aria-label="${tr("editorSetupNavigation")}">${this._step > 0 ? `<button class="editor-secondary" type="button" data-editor-action="step-back">${tr("editorBack")}</button>` : "<span></span>"}${this._step < 2 ? `<button class="editor-primary" type="button" data-editor-action="step-next">${tr("editorContinue")} <span aria-hidden="true">→</span></button>` : `<button class="editor-primary" type="button" data-editor-action="finish">${tr("editorCreateMyKitchen")} <span aria-hidden="true">→</span></button>`}</nav></section><p class="setup-footer">${tr("editorACalmStartTheAdvancedSettingsAreHereWheneverYouNeedThem")}</p></div>`;
  }
  _settingsMarkup() {
    const c = this._config,
      tr = (key) => this._tr(key),
      choose = (key, options) => this._choose(key, options);
    return `<div class="editor"><div class="settings-top"><div><div class="title">Mealie Atelier <span class="title-accent">Studio</span></div><p class="hint">${tr("editorConfigureYourCardVisuallySettingsAreSavedWithYourHomeAssistantDashboard")}</p></div><button class="editor-secondary" type="button" data-editor-action="restart">${tr("editorRunSetupWizard")}</button></div><div class="setup-success"><span aria-hidden="true">✓</span><div><strong>${tr("editorYourKitchenIsReady")}</strong><small>${esc(this._tr(c.mode))} · ${tr(c.theme === "light" ? "editorDaylightKitchen" : "editorEveningStudio")}</small></div></div>
    <div class="section-head"><span>01</span><div><strong>${tr("editorBasics")}</strong><p>${tr("editorChooseContentAndTheConnectedMealieInstance")}</p></div></div>
    <div class="group"><label for="atelier-mode">${tr("editorMode")}</label>${choose(
      "mode",
      MODES.map((value) => [value, this._tr(value)]),
    )}</div>
    <div class="group"><label for="atelier-entry_id">${tr("editorMealieAccount")}</label>${choose("entry_id", [["", tr("editorFirstConnectedAccount")], ...this._entries.map((entry) => [entry.entry_id, entry.name || entry.title || entry.entry_id])])}</div>
    <div class="group"><label for="atelier-provider">${tr("editorDataConnection")}</label>${choose(
      "provider",
      [
        ["auto", tr("editorAutomaticAtelierFirst")],
        ["atelier", tr("editorAtelierBridgeFullFeatures")],
        ["home_assistant", tr("editorHomeAssistantMealieReadOnly"), !this._nativeEntries.length],
      ],
    )}<p class="hint">${tr("editorTheBuiltInOptionNeedsNoAtelierServerOrCardTokenRecipeSearchAndCookingAreReadOnlyTheBridgeAddsImagesAndKitchenTools")}</p>${this._nativeEntries.length ? "" : `<p class="hint" id="atelier-provider-native-hint">${tr("editorNoBuiltInMealieIntegrationFound")}</p>`}</div>
    ${
      this._nativeEntries.length
        ? `<div class="group"><label for="atelier-mealie_entry_id">${tr("editorBuiltInMealieInstance")}</label>${choose(
            "mealie_entry_id",
            this._nativeEntries.map((entry) => [entry.entry_id, entry.name || entry.entry_id]),
          )}</div>`
        : ""
    }
    <div class="group"><label for="atelier-language">${tr("editorLanguage")}</label>${choose("language", [["auto", tr("editorAutomatic")], ...Object.keys(LABELS).map((locale) => [locale, LABELS[locale].languageName || locale])])}</div>
    <div class="section-head"><span>02</span><div><strong>${tr("editorLookFeel")}</strong><p>${tr("editorTypographyMotionAndTheVisualRhythmOfYourCards")}</p></div></div><div class="group"><label for="atelier-theme">${tr("editorTheme")}</label>${choose(
      "theme",
      [
        ["dark", tr("editorDark")],
        ["light", tr("editorLight")],
      ],
    )}</div>
    <div class="group"><label for="atelier-density">${tr("editorDensity")}</label>${choose(
      "density",
      [
        ["comfortable", tr("editorComfortable")],
        ["compact", tr("editorCompact")],
      ],
    )}</div>
    <div class="group"><label for="atelier-motion">${tr("editorMotionTransitions")}</label>${choose(
      "motion",
      [
        ["expressive", tr("editorExpressive")],
        ["balanced", tr("editorSubtle")],
        ["off", tr("editorOff")],
      ],
    )}<p class="hint">${tr("editorYourReducedMotionSystemPreferenceAlwaysTakesPriority")}</p></div>
    <div class="group"><label for="atelier-columns">${tr("editorColumns")}</label>${choose(
      "columns",
      [
        [2, "2"],
        [3, "3"],
        [4, "4"],
      ],
    )}</div><div class="group"><label for="atelier-accent">${tr("editorAccent")}</label><div class="accent-pick"><span class="accent-dot" aria-hidden="true" style="background:${esc(c.accent)}"></span>${choose(
      "accent",
      COLORS.map((value) => [value, tr(COLOR_NAMES[value])]),
    )}</div></div>
    <div class="group"><label for="atelier-radius">${tr("editorCornerStyle")}</label>${choose(
      "radius",
      [
        ["large", tr("editorRounded")],
        ["small", tr("editorSoft")],
        ["square", tr("editorSquareEckig")],
      ],
    )}</div><div class="group"><label for="atelier-photo_ratio">${tr("editorFoodPhotographyCrop")}</label>${choose(
      "photo_ratio",
      [
        ["portrait", tr("editorPortraitEditorial")],
        ["square", tr("editorSquareQuadrat")],
        ["landscape", tr("editorWide")],
      ],
    )}</div>
    <label class="line"><input type="checkbox" data-key="show_images" ${c.show_images !== false ? "checked" : ""}> ${tr("editorShowRecipeImages")}</label>
    <details class="editor-advanced"><summary>${tr("editorOptionalPrintAndKitchenSettings")}</summary><div class="section-head"><span>03</span><div><strong>${tr("editorPrintStudio")}</strong><p>${tr("editorPremiumA4LayoutsForRecipesAndLists")}</p></div></div><div class="group"><label for="atelier-print_style">${tr("editorPrintTemplate")}</label>${choose(
      "print_style",
      [
        ["editorial", "Editorial"],
        ["compact", tr("editorCompact")],
        ["minimal", tr("editorInkSaver")],
      ],
    )}</div>
    <label class="line"><input type="checkbox" data-key="print_image" ${c.print_image === true ? "checked" : ""}> ${tr("editorPrintRecipePhotosWhenAvailable")}</label><label class="line"><input type="checkbox" data-key="print_checkboxes" ${c.print_checkboxes !== false ? "checked" : ""}> ${tr("editorPrintCheckboxes")}</label><label class="line"><input type="checkbox" data-key="print_completed" ${c.print_completed === true ? "checked" : ""}> ${tr("editorPrintCompletedItems")}</label><label class="line"><input type="checkbox" data-key="print_nutrition" ${c.print_nutrition === true ? "checked" : ""}> ${tr("editorPrintStoredNutritionValues")}</label><label class="line"><input type="checkbox" data-key="print_notes" ${c.print_notes !== false ? "checked" : ""}> ${tr("editorPrintHandwritingSpace")}</label>
    <div class="section-head"><span>04</span><div><strong>${tr("editorKitchenTablet")}</strong><p>${tr("editorOptionalHomeAssistantActionsNothingTriggersAutomatically")}</p></div></div><label class="line"><input type="checkbox" data-key="kiosk_mode" ${c.kiosk_mode === true ? "checked" : ""}> ${tr("editorUseEnlargedTabletLayout")}</label>
    <div class="group"><label for="atelier-cooking_scene">${tr("editorOptionalKitchenSceneHA")}</label><input id="atelier-cooking_scene" data-key="cooking_scene" value="${esc(c.cooking_scene || "")}" placeholder="scene.kueche_kochen"><p class="hint">${tr("editorOnlyTriggeredWhenYouTapTheCookingCockpitButton")}</p></div><div class="group"><label for="atelier-cooking_media_player">${tr("editorOptionalMediaPlayerHA")}</label><input id="atelier-cooking_media_player" data-key="cooking_media_player" value="${esc(c.cooking_media_player || "")}" placeholder="media_player.kueche"></div>
    <div class="group"><label for="atelier-cooking_volume">${tr("editorCookingVolume")}</label>${choose(
      "cooking_volume",
      [
        [0.1, "10 %"],
        [0.18, "18 %"],
        [0.3, "30 %"],
        [0.5, "50 %"],
      ],
    )}</div><div class="group"><label for="atelier-cooking_tts_engine">${tr("editorOptionalTTSEngineHA")}</label><input id="atelier-cooking_tts_engine" data-key="cooking_tts_engine" value="${esc(c.cooking_tts_engine || "")}" placeholder="tts.piper"><p class="hint">${tr("editorUseAHomeAssistantEntityAllOptionalDeviceActionsAreDisabledByDefault")}</p></div></details>
    <p class="hint editor-footer">${tr("editorDashboardModeContainsTheCompleteKitchenDeviceSpecificChangesAreAvailableHereInTheDesignStudio")}</p></div>`;
  }
  _render() {
    if (!this.isConnected) return;
    this.shadowRoot.innerHTML = `<style>${EDITOR_STYLE}</style>${this._wizardMode ? this._wizardMarkup() : this._settingsMarkup()}`;
  }
}

const CARD_TYPES = [
  [
    "mealie-atelier-card",
    MealieAtelierCard,
    "Mealie Atelier · Complete Kitchen",
    "Recipe library, weekly planner, shopping and management in one beautiful kitchen",
  ],
  [
    "mealie-atelier-today",
    AtelierTodayCard,
    "Mealie Atelier · Today",
    "A beautiful today card: meals, shopping, and next action",
  ],
  [
    "mealie-atelier-recipes",
    AtelierRecipeCard,
    "Mealie Atelier · Recipes",
    "Recipe gallery with search, details and cooking mode",
  ],
  [
    "mealie-atelier-mealplan",
    AtelierMealplanCard,
    "Mealie Atelier · Planner",
    "Manage meals visually with a seven-day planner",
  ],
  [
    "mealie-atelier-shopping",
    AtelierShoppingCard,
    "Mealie Atelier · Shopping",
    "An interactive Mealie shopping list",
  ],
  [
    "mealie-atelier-discover",
    AtelierDiscoverCard,
    "Mealie Atelier · Discover",
    "Personalized meal suggestions and previewable week optimization",
  ],
  [
    "mealie-atelier-pantry",
    AtelierPantryCard,
    "Mealie Atelier · Pantry",
    "Pantry stock and smart grocery previews",
  ],
  [
    "mealie-atelier-family",
    AtelierFamilyCard,
    "Mealie Atelier · Family",
    "Shared cooking sessions and helper tasks",
  ],
  [
    "mealie-atelier-cookbook",
    AtelierCookbookCard,
    "Mealie Atelier · Cookbook",
    "A4 print-ready cookbook studio",
  ],
  [
    "mealie-atelier-manage",
    AtelierManageCard,
    "Mealie Atelier · Manage",
    "Create, import and edit recipe basics",
  ],
];
// German names for Home Assistant's card picker; the picker has no i18n hook of its own.
const CARD_TYPES_DE = {
  "mealie-atelier-card": [
    "Mealie Atelier · Komplette Küche",
    "Rezepte, Wochenplan, Einkauf und Verwaltung in einer Küche",
  ],
  "mealie-atelier-today": [
    "Mealie Atelier · Heute",
    "Was heute auf dem Teller ist und was im Einkauf fehlt",
  ],
  "mealie-atelier-recipes": [
    "Mealie Atelier · Rezepte",
    "Rezeptgalerie mit Suche, Details und Kochmodus",
  ],
  "mealie-atelier-mealplan": ["Mealie Atelier · Wochenplan", "Mahlzeiten für sieben Tage planen"],
  "mealie-atelier-shopping": [
    "Mealie Atelier · Einkauf",
    "Einkaufslisten zum Abhaken, auch offline",
  ],
  "mealie-atelier-discover": [
    "Mealie Atelier · Kochinspo",
    "Kochideen und ein Vorschlag für die Woche",
  ],
  "mealie-atelier-pantry": [
    "Mealie Atelier · Vorräte",
    "Vorrat erfassen und den Einkauf vorausplanen",
  ],
  "mealie-atelier-family": [
    "Mealie Atelier · Gemeinsam kochen",
    "Gemeinsame Kochsessions mit Helferaufgaben",
  ],
  "mealie-atelier-cookbook": ["Mealie Atelier · Kochbuch", "Ein druckfertiges Kochbuch in A4"],
  "mealie-atelier-manage": [
    "Mealie Atelier · Verwalten",
    "Rezepte anlegen, importieren und bearbeiten",
  ],
};
const pickerGerman = /^de\b/i.test(
  globalThis.document?.documentElement?.lang || globalThis.navigator?.language || "",
);
customElements.define("mealie-atelier-card-editor", MealieAtelierEditor);
for (const [tag, ctor, englishName, englishDescription] of CARD_TYPES) {
  const [name, description] = (pickerGerman && CARD_TYPES_DE[tag]) || [
    englishName,
    englishDescription,
  ];
  if (!customElements.get(tag)) customElements.define(tag, ctor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === tag))
    window.customCards.push({
      type: tag,
      name,
      description,
      preview: false,
      documentationURL: "https://alles-automatisch.de/lernen/mealie-atelier",
    });
}
console.info(
  `%cMEALIE ATELIER ${VERSION}`,
  "background:#192b24;color:#9dcbb2;padding:5px 9px;border-radius:6px;",
);
