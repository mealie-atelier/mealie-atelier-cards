# Mealie Atelier 0.9.0 – Design System & Responsive Quality

**Release-Typ:** Entwickler-Beta mit Architekturverbesserungen, keine Marketplace- oder Produktivfreigabe. Stand: 28. Oktober 2026.

## Tatsächlich umgesetzt

1. Das neue modulare Designsystem unter `src/design-system/` mit semantischen Tokens, Layout-Primitiven, gemeinsamen Card-/Formular-/Button-Zuständen und einer JS-UI-Konstruktorschicht.
2. Die Build-Pipeline erzeugt HACS-Bundle und Standalone-Web-Bundle reproduzierbar aus `src/card-core.template.js` plus den eigenständigen CSS-/UI-Quellen. Zweimal hintereinander bauen liefert bit-identische Ergebnisse.
3. Die **Breite der Home-Assistant-Card** und nicht nur die Fensterbreite steuert responsive Grids. Ein echter Konflikt zwischen `studio-grid-main` und `ds-grid--split` bei 900–1180px ist korrigiert. Damit wird die Studio-Hauptansicht nicht mehr in zwei 329px schmale Panels gezwungen.
4. Mobile Wochen-Tageskarten nutzen lesbare breitere Scroll-Snap-Karten mit sichtbarem Anschnitt; Formulare und Buchauswahl besitzen besser erreichbare Touchflächen. Einheitliche Seitenüberschriften, Kennzahlen, Statuspanels, Leerräume und Form-Control-Größen.
5. Ein HTML-Title-Escaping-Fehler nach der UI-Refaktorierung ist beseitigt. Freier HTML-Code wird nicht als Titel übernommen.
6. Neue Pure-Unit-Tests für strukturiertes Mealie-Zutaten-Merging, Versionskonflikte, Dateisignaturen und Uploadgrößen. Das Companion-Statusflag wirbt nicht mehr mit einer Schreibfunktion, wenn die zusätzlichen Sicherheits-Flags fehlen; die HA-Bridge meldet Zutatenänderung bewusst nicht als vorhanden, solange der zugehörige Befehl fehlt.

## Nachweisbare Checks

- Node Custom Cards: 21 Tests grün; Companion-Web: 16 Tests grün; HA Python: 17 Tests grün. **Gesamt: 54** Pure-/Mock-Tests (verschiedene Suites, keine realen API-Tests).
- Browser: 40 Kombinationen (10 Views × 4 Breiten) ohne JS-Ausnahme, plus 8 spezielle Card-/Browser-Breitenkombinationen. Kein Überlaufen des äußeren Card-Hosts; seitliches Scrollen ist nur in benannten Carousels und Navigation beabsichtigt.
- Visual QA: Screenshots der einzelnen Ansichten; ergänzend Fokus auf den zuvor beschädigten 960px-Gridfall, mobilen Wochenplan und das Rezept-/Kochlayout.

## Bewusste Grenzen

- Historische CSS-Schichten bleiben derzeit als Kompatibilitätsbasis enthalten. Die Aufräumarbeit ist begonnen, nicht abgeschlossen.
- Photo-Upload- und strukturierte Zutaten-API besitzen Backend-Validierung bzw. separate experimentelle Serverpfade, **aber keine durchgehend fertig getestete Benutzeroberfläche und keine freigegebene HA-Schreibroutine**. Daher nicht als fertige Funktion anbieten.
- Kein echter bidirektionaler Offline-Einkaufslistenabgleich und keine garantierten Timeralarme bei geschlossenem Browser. Für letztere ist ein separater Benachrichtigungs-/HA-Scheduler erforderlich.
- Kein Zugriff auf die Mealie- und HA-Installation des Nutzers; API- und Berechtigungstests laufen gegen Fixtures oder reine Funktionen.
- Keine GitHub-Veröffentlichung, keine HACS-/Marketplace-Abnahme. Ein Rating oder Marketplace-Ranking ist nicht zugesichert.

## Empfohlene Abnahme vor v1.0

1. Visuelles Review der zehn Views gegen die Screenshots; kleine Kontrast-/Abstandsprobleme als Issues erfassen.
2. Echte gesicherte Mealie-Testinstanz verbinden, Version dokumentieren und alle read/write API-Flows mit zwei Rollen testen.
3. Foto-Upload und Zutatenbearbeitung zuerst in dieser Instanz freigeben. Mit Testkopien von Rezepten, Backup vor jeder Änderung.
4. Offline-Queue und HA-Timer-Service erst nach Konfliktszenarien, Neustarts und Gerätetests freigeben.
5. Erst nach diesen Gates installierbare öffentliche Beta und Marketplace-Einreichung.
