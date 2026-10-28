# Mealie Atelier v0.9.2 - Frontend Polish & Responsive Quality

**Status: Entwickler-Beta, 28. Oktober 2026.** Keine Produktiv- oder Marketplace-Freigabe. Diese Version baut direkt auf v0.9.1 auf und konzentriert sich auf die gemeinsame UI-Basis aller zehn Ansichten, Home-Assistant-Cards und Web-App.

## Tatsachlich geandert

- Neues zentrales `src/design-system/polish.css` mit konsistenten Abstands-, Typografie-, Oberflachen-, Kontrast- und Komponentenvorgaben. Als neuntes, reproduzierbar gebautes Stylesheet in den gemeinsamen Bundle-Build eingebunden.
- Mobile Uberlaufe in Dashboard und Verwaltung durch Korrektur der Rezeptgalerie-Rail behoben. Ein- und mehrspaltige Panels passen sich jetzt der **Containerbreite** an, nicht nur der Fensterbreite.
- Lesbarere Seitenuberschriften, kontrollierte Bildzuschnitte, konsistente Buttons, Eingabefelder, Selects, Panels, Listen, Badges und Hinweise; vereinheitlichte Abstands- und Gridregeln auf 360-1440 px.
- Tablet-Layouts und schmale Home-Assistant-Card-Spalten (380 px auf 1440 px Desktop) explizit getestet; 740-920 px erhalten einen sinnvollen zweispaltigen Mittelweg statt kollidierender Panels.
- Rezept-Bearbeitungsdialog: kurze, scanbare Uberschrift und separater Rezeptkontext; einheitliche Formabstande. Detail-, Koch-, Design- und Print-Dialoge profitieren vom gemeinsamen Layout.
- Formularbuttons: Alle Buttons ohne expliziten Typ erhalten `type="button"`; echte `type="submit"` bleiben unverandert. So losen optionale Aktionen kein unbeabsichtigtes Absenden aus.
- Modal-Dialoge erhalten korrekte, sprachabhangige `aria-label` und die aktive Ansicht eine beschriftete Region.
- Rezeptsuche hat `type="search"`; der Wochenplan-Wischhinweis ist deutsch/englisch lokalisiert.
- Reine Icon-Buttons fur Einkauf und Tagesrezepte haben jetzt zugangliche Namen und eine 44x44-px-Bedienflache statt 22px Breite.
- Helles Theme mit verbesserter Akzent-Lesbarkeit, reduzierter Bewegung fur entsprechende Betriebssystemeinstellungen, stabile Fokus- und Touchzustande.
- Erzeugung einer **selbststandigen Offline-Demo** mit acht eingebetteten, als Demo gekennzeichneten Food-Motiven. Diese Demo arbeitet nur mit simulierten Rezept- und Einkaufsdaten.

## Nachgewiesene Qualitat

- **25 Card-/Logiktests, 16 Web-Tests, 17 Bridge-/Python-Tests** erfolgreich (58 automatisierte Tests).
- Browser-Regression: zehn Ansichten bei 360, 390, 820 und 1440 px sowie eine 380-px-Card im breiten Desktop: Navigation, kein horizontaler Uberlauf, Checkbox-/Einkaufszustand, Rezepteditor, Kochmodus, Design-Dialog, Hellmodus und keine JS-Laufzeitfehler.
- Komponenten-Audit: keine aktiven sichtbaren Buttons/Formfelder unter 35 px, keine unbeschrifteten sichtbaren Buttons/Felder in den zehn Ansichten der Demo. Ziel-Touchflache fur reine Icon-Buttons: 44x44 px.
- Offline-Demo-Smoke: Bilder eingebettet, globaler Schnellzugriff via Strg+K, Escape, Wochenplan und keine Laufzeitfehler.
- Beispiel-Kochbuch erneut als zehnseitiges A4-PDF gedruckt und gerendert; keine Layoutzerstorung durch UI-Uberarbeitung festgestellt.
- Layout und Interaktionen wurden in Chromium mit **lokalen Beispiel- und Mock-API-Daten** getestet. Nicht getestet sind Safari, Firefox und reale Drucker.

## Bestehende funktionale Grenzen, nicht als fertig ausgeben

Strukturierte Zutaten-Updates, Originalfoto-Uploads, sichere Offline-Mehrgerate-Synchronisierung und Alarme bei geschlossenem Browser sind weiterhin nicht umfassend als End-to-End-Anwendung fertiggestellt. Ferner fehlen Live-Mealie-/Live-Home-Assistant-Abnahme, echte externe KI/USDA-Dienste und Hardwaretests auf Fully Kiosk. Schreiberlaubnisse auf einem echten Mealie-Server sollten erst nach Backup und Testversion freigeschaltet werden.

## Tests ausfuhren

```bash
cd mealie-atelier-cards
npm run build && npm run check && npm test
cd ../mealie-atelier-web
node --test test/*.test.mjs
cd ../mealie-atelier-bridge
python -m pytest -q tests
cd ..
python tests/frontend-polish-regression.py 390
python tests/frontend-polish-regression.py 1440 380
python tests/controls-geometry-audit.py
python tests/accessibility-label-audit.py
python tests/offline-demo-v07.py
```

Die Browser-Tests benotigen Python Playwright und einen lokal installierten Chromium unter `/usr/bin/chromium`. Die Demo-Fotos sind generierte Beispieldateien, nicht deine privaten Mealie-Bilder.
