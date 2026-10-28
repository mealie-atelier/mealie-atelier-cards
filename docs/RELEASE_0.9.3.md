# Mealie Atelier v0.9.3 — Komponenten-Migration und Integrationssicherheit

**Stand: 28.10.2026 · Entwickler-Beta, nicht für Produktion oder Marketplace freigegeben.**

## Ziel

Die bestehenden zehn Premium-Ansichten aus v0.9.2 bleiben bewusst erhalten. Die Änderungen liegen unter der Oberfläche: weniger historisch gewachsene Build-Abhängigkeiten, saubere Modulgrenzen, echte HTTP-Vertragstests und Home-Assistant-Berechtigungsprüfungen. Keine erneute optische Neuinterpretation.

## Migration ohne Design-Rückschritt

- Die vier separaten Alt-CSS-Quellen sind aus dem Build entfernt und in `src/design-system/foundation.css`, `editorial.css`, `kitchen.css` und `motion.css` aufgegangen. Ihre CSS-Regeln und Reihenfolge bleiben erhalten.
- Die zuvor zur Build-Zeit erzeugten responsiven Kopien stehen jetzt explizit in `design-system/adaptive.css`. Diese Regeln berücksichtigen weiterhin die *Card-Breite*, nicht allein die Browserbreite.
- Hauptansichten, Dialoge, Nutrition-/Journal-Anzeigen, Druckrenderer und grafischer Home-Assistant-Editor wurden in `src/components/` ausgelagert. Der verbleibende Card-Kern übernimmt die Web-Component-Integration und das Routing.
- `scripts/build-design-system.mjs` fügt die Source-Module deterministisch zusammen. Es baut ein und dasselbe Bundle nach `dist/` und `web/public/`.
- Die Design-Tokens, vorhandenen Komponenten und die Premium-Art-Direction sind unverändert; die Migration ersetzt keine bewährten Elemente durch generische Widgets.

**Visueller Nachweis:** 10 Ansichten × 4 Viewport-/Card-Konfigurationen = **40 Pixel-Vergleiche gegen die unveränderte v0.9.2-JavaScript-Basis. Alle 40 Bilder zeigen 0 geänderte Pixel** (Chromium, gleiche Demo-Daten, identischer Renderzustand, Animationen deaktiviert). Das belegt das Ausbleiben sichtbarer Regressionen in genau diesen Testzuständen, nicht die Perfektion aller Zustände und Browser.

## Neu: Integrationstests durch echte HTTP-Grenzen

- Ein gestarteter Node-Companion spricht über TCP/HTTP mit einem separat gestarteten, lokalen Mealie-kompatiblen HTTP-Testserver. Keine reine Stub-Funktionssimulation innerhalb des Companions.
- Zutaten-Workflow: Vorschau, strukturiertes Update, Bestätigung, optimistic locking, Abbruch bei zwischenzeitlichen Änderungen, Erhalt der bestehenden `food`-/`unit`-Verknüpfungen und lokales Original-Backup.
- Rezeptbilder: tatsächlicher Multipart-Upload via HTTP, vorherige Bildsicherung, Dateisignatur-Prüfung, Revisionskonflikt, Schreibschutz und Fehlerfall bei fehlender Originaldatei.
- Schreibgrenzen: Nur-Lesen-Modus, Pfadvalidierung und Blockieren ungeeigneter Eingaben.
- Browser-Kette: Chromium steuert zehn Ansichten mit einem *realen* Companion-Server und lokalem Mealie-Testserver. Rezeptdetail und Einkaufslistenänderung gehen über HTTP bis ins Test-Backend. Prüfung bei 390 und 1440 Pixeln ohne JS-Fehler oder horizontale Seitenüberläufe.
- Home Assistant: Die echten WebSocket-Handler werden unter einem minimalen HA-API-Testadapter aufgerufen. 16 Handlerregistrierungen, Rollenrechte, Nur-Lesen-Modus, freigegebene Rezeptbilder, geschützte Studio-Revisionen und Trennung persönlicher Notizen sind geprüft. **Dies ist kein gestarteter Home-Assistant-Core.**

## Gemessener Teststand

| Testgruppe | Ergebnis |
|---|---:|
| Cards/Designsystem (Node) | 26/26 |
| Web-Backend und HTTP-Vertragstests (Node) | 19/19 |
| Home-Assistant-Bridge und WebSocket-Verträge (Python) | 22/22 |
| Gesamt automatisiert | **67/67** |
| Chromium-Browser mit realem lokalen HTTP-Companion | 2/2 Bildschirmbreiten; 10/10 Ansichten je Breite |
| Visuelle Regression gegen v0.9.2 | **40/40 ohne Pixelabweichung** |

Die lokalen HTTP-Tests verwenden ein strukturell Mealie-kompatibles Test-Backend mit künstlichen Rezepten. Sie sind **keine Abnahme auf einem echten Mealie-Server**.

## Nachweis selbst wiederholen

```bash
cd Mealie-Atelier-v0.9.3
sh scripts/verify-v093.sh
```

Die Playwright-/Chromium-Tests benötigen eine installierte Python-Playwright-Umgebung. Für ein erneutes Offline-HTML-Showcase: `python mealie-atelier-cards/scripts/build-standalone-demo.py`.

## Sicherer API-Check auf einer echten Mealie-Instanz (nur Lesen)

```bash
cd mealie-atelier-web
MEALIE_ATELIER_TEST_READONLY=1 MEALIE_URL='https://mealie.example.org' MEALIE_API_TOKEN='TOKEN_NUR_LOKAL_SETZEN' node test/live-readonly-smoke.mjs
```

Der Befehl führt ausschließlich GET-Anfragen aus, druckt keine Rezeptinhalte und keine Token. Für die Home-Assistant-Abnahme außerdem die separate Testumgebung nutzen. Die URL/Token sind Beispiele; Zugangsdaten niemals ins Git-Repository aufnehmen.

## Noch nicht durch diese Tests nachgewiesen

- Echte Mealie-Versionen und Versionsmigrationen sowie Live-Uploads/Schreiboperationen auf einer gesicherten Datenbankkopie.
- Ein tatsächlich gestartetes Home Assistant mit HACS-Installationsweg und zwei Browsern/Nutzern.
- Offline-Einkaufslisten mit zuverlässiger konfliktfester Mehrgeräte-Queue.
- Alarmierung bei vollständig geschlossenem Browser über HA/Push oder einen zusätzlichen Dienst.
- Externe USDA-/KI-Anbieter, Safari/Firefox, echte Mobilhardware/Fully Kiosk und Drucker.

**Freigabeentscheidung:** Technisch verbesserte Entwickler-Beta. Vor einer produktiven Nutzung sind echte Mealie-/HA-Abnahmetests einschließlich Backup und Wiederherstellung zwingend erforderlich.
