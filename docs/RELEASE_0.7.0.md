# Mealie Atelier v0.7.0 — Premium Experience Pass

**28. Oktober 2026 · Entwickler-Beta · noch nicht für den produktiven Home-Assistant-Marketplace freigegeben.**

## Ziel dieser Version

Alle zehn Ansichten und die wiederkehrenden Dialoge, Formulare und Kochwerkzeuge sollen sich **wie ein zusammenhängendes Premium-Produkt** verhalten: klar, ruhig, lebendig, reaktionsschnell, auch mit Touch und Tastatur. Visuelle Effekte dürfen Interaktionen nicht blockieren. **Neue Animationen sind keine Zusage, dass jede Mealie-Version und jedes Gerät bereits unterstützt wird.**

## Neu in v0.7.0

### Design, Übergänge, Feedback

- Gemeinsame Motion-Sprache für das komplette Dashboard: sanfte Seitenwechsel, subtiler Tiefeneffekt der Rezeptkarten, Fokus-/Hover-/Touch-Reaktionen, weiche Dialogöffnung und animiertes Erfolgsfeedback.
- Visualisierte Ladezustände und besser erkennbare Schaltflächen-/Auswahlzustände.
- Pro Gerät drei Einstellungen im Design Studio: **Lebendig, Dezent, Aus**; mit `prefers-reduced-motion` kompatibel (Betriebssystem gewinnt immer).
- Höherer Kontrast für Tastatur-Fokusringe, Rückkehr des Tastaturfokus nach geschlossenen Dialogen, semantische Zustände für Kochschritte und Einkaufsartikel.
- Dialoge öffnen nur beim tatsächlichen Wechsel animiert; bei internen Re-Renders springt das Dialogfenster nicht immer neu ein.

### Bedienung und Navigation

- Neuer **Schnellzugriff** per **Strg/⌘ + K** (oder `/` außerhalb von Eingabefeldern), Suchfilter, Pfeiltasten, Enter und Escape. In der eigenständigen Web-/Offline-App sind Kürzel global aktiv; in Home Assistant nur bei Fokus innerhalb der Card, damit die HA-Tastaturkürzel nicht überschrieben werden.
- Auf kleinen Bildschirmen die Hauptnavigation als horizontal wischbare Leiste, ohne abgeschnittene Menüpunkte; bei Navigation wird der aktive Punkt automatisch sichtbar gemacht. Die Wischposition bleibt bei einer bloßen Aktualisierung erhalten.
- Der Wochenplan hat auf dem Smartphone sortierte, horizontal scrollbare Bedienelemente und einen sichtbaren Hinweis auf weitere Tage.
- Im **Cooking Cockpit** sind die wichtigsten Zurück-/Weiter-Aktionen auf dem Smartphone **vor** den Timer-/Sprach-Zusatzfunktionen angeordnet; Kochschritte lassen sich dort mit horizontalen Wischgesten wechseln, am Computer mit Pfeiltasten.
- Bearbeitung und Abhaken besitzen klareres Zustandsfeedback; Touch-Flächen sind größer und lassen sich auch mit der Tastatur bedienen.

### Fortbestehende Funktionalität

Alle zehn Views bleiben erhalten: Übersicht, Heute, Entdecken, Rezepte, Wochenplan, Vorräte, Einkaufsliste, Gemeinsam kochen, Kochbuch und Verwalten. Dazu gehören Atelier Nutrition, Print Studio, Kochbuch-Druck, Rezeptnotizen, Einkaufsvorschauen, Koch-Timer, optionale Browser-Spracheingabe und bewusste Home-Assistant-Aktionen. Die Version ändert **nicht** eigenmächtig Mealie-Daten und führt **keine** automatischen KI-Schreiboperationen ein.

## Teststand

| Prüfung                         | Ergebnis                          | Was sie beweist                                                                                                                                |
| ------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Python/Bridge-Unit-Tests        | 12 von 12 bestanden               | Request-Validierung, Nährwertlogik und Studio-Datenmodelle isoliert                                                                            |
| Node/Web-Tests                  | 9 von 9 bestanden                 | HTTP-/Persistenzlogik mit simulierten Mealie-Diensten                                                                                          |
| Node/Card- und Logiktests       | 12 von 12 bestanden               | Zehn Custom Cards, UI-Verträge und Planungslogik                                                                                               |
| Chromium UI-Rundgang            | 1510 px, 820 px, 390 px bestanden | Zehn Ansichten, Schnellzugriff, Motion-Modi, reduzierte Animationen, keine unbehandelten JS-Exceptions                                         |
| Chromium Interaktionstest       | 1510 px und 390 px bestanden      | Einkauf ändern, Vorrat anlegen, Familie erweitern, Wochenplan vorschlagen, Journal speichern, Timer, Wischen/Pfeiltasten, Druck-/Motion-Dialog |
| Bewegte Vorschau                | Echte Browserframes als GIF       | Tatsächliche Seiten-/Dialogübergänge mit anonymisierten Beispieldaten                                                                          |
| Eigenständige Offline-HTML-Demo | Playwright bestanden              | Eingebettete Bilder, globaler Schnellzugriff, Escape und Wochenplan ohne Netzverbindung                                                        |

**Nicht geprüft:** ein echter Home-Assistant-Core, die produktive Mealie-API inkl. Schreibzugriff, externe USDA-/OpenAI-Calls, iOS/Safari, physische Tablet-Kiosk-Hardware sowie tatsächliche Drucker dieser Version. Alte A4-PDF-Tests aus v0.6 bleiben erhalten; das Drucklayout wurde in v0.7 nicht funktional verändert.

## Bewusst noch offen

- Vollständig sichere strukturierte **Mealie-Zutaten-/Einheiten-/Mengenbearbeitung** und Original-Rezeptfoto-Upload.
- Multi-Device-**Offline-Schreibqueue** mit Konfliktbehandlung, robuste Server-/HA-Timeralarme wenn alle Browser geschlossen sind.
- Verifikation und eventuelle Adapter für reale Mealie-Versionen, USDA/OpenAI-Zugriff, tatsächliche Berechtigungen und HA-Services.
- Echter iOS-/Safari- und Fully-Kiosk-Test, vollständiger Accessibility-Audit mit Screenreader, öffentliche Repositories, HACS/Marketplace-Katalogfreigabe.

**Vorgehen vor produktivem Einsatz:** Mealie-Daten sichern, in einem von realen Aktoren getrennten Testsystem installieren, lesende Ansichten testen, dann gezielt Schreibabläufe nur mit Testrezepten und Dummy-Einkaufslisten. Keine öffentliche Stable-Veröffentlichung vor diesem Abnahmetest.

## Dateien

- `dist/mealie-atelier-cards.js`: HACS-Kartenbundle mit Premium-Motion.
- `src/atelier-motion-v07.css`: quellnahe UX-/Motion-Regeln.
- `demo/standalone-preview.html`: offlinefähiges HTML-Showroom ohne Zugangsdaten.
- `tests/visual-motion-v07.py`, `tests/interaction-v07.py`, `tests/motion-demo-v07.py`: wiederholbare visuelle und funktionale Mock-Browserchecks.
- `docs/START_HIER.md`: Einrichtung, `docs/FEATURE_MATRIX_0.7.0.md`: ehrlich geprüfte Funktionsabdeckung.
