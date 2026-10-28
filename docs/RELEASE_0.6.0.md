# Mealie Atelier v0.6.0 — Kitchen Intelligence

**Stand: 28. Oktober 2026 | Entwickler-Beta, NICHT veröffentlicht.**

## Ausgelieferter Funktionsumfang

1. Premium-Frontend aus v0.4: Rezeptgalerie, Details, mobil optimiert, editoriale Formulare und großer Kochmodus.
2. A4 Print Studio aus v0.3: Rezept, Einkauf, Wochenplan (Querformat), optional gespeicherte Nährwerte; dazu neu ein **Kochbuch-Studio** mit Cover, Inhaltsverzeichnis und mehreren Rezeptseiten.
3. Atelier Nutrition aus v0.5: USDA-gestützte Makros, Portionen, Quellennachweis, optionale KI-Namenszuordnung, abgesicherte explizite Speicherung in Mealie.
4. Intelligente Empfehlung: Zeitbudget, Vorrat, Ablaufdaten, persönlicher Geschmack, Favoriten und Kochhistorie. Deterministische Heuristik, keine automatische KI-Allergenprüfung.
5. Siebentägiger Wochenplan mit bestehende Termine erhaltender Vorschau, Resteverwertung und Zutatenüberschneidung; nur nach Freigabe wird in Mealie geschrieben.
6. Vorrats-Light: veränderbare Mengen, Basiseinkäufe, Ablaufdaten, Einkaufsliste aus geplanten Gerichten mit Mengenabzug und freiwilligem Mealie-Transfer.
7. Rezept-Erinnerung: persistierte Bewertung, Lieblingsgericht und persönliche Notizen. Im HA-Bridge-Modus pro HA-Konto, im Standalone-Haushalt geteilt.
8. Gemeinsames Kochen: persistente HA-/Web-Kochsession, Fortschritts-Synchronisierung, gemeinsame Timer, Familienmitglieder und genehmigte Helferaufgaben.
9. Qualitätskontrolle: lokale Strukturprüfung; optionale KI-Prüfung sowie Zutatenersatz-Vorschläge auf ausdrücklichen Klick.
10. Cooking Cockpit: unabhängige Küchen-Timer, Browser-TTS, Browser-Spracheingabe und freiwillige HA-Szene/Lautstärke/TTS-Serviceaktionen.
11. Wandtablet: konfigurierbares Kiosk-Layout (innerhalb der Card), Tageszeiten-Ansprache, responsive Zehn-Cards-Auswahl, grafischer Lovelace-Editor.
12. Technischer Schutz: Read-only serverseitig, Revision/Konflikterkennung, atomare persistente JSON-Speicherung im Web-Companion, HA Store, Mealie-API-Tokens nur backendseitig.

## Testnachweise

- Node 22: Frontend-Vertrag und Planungslogik; Web-HTTP-Mock inkl. Datenspeicherung über Serverneustart und Test von Konflikten/Read-only; Backend-Nährwerte mit externen Endpunkten simuliert.
- Python: Bridge- und Studio-Logik inkl. genehmigter Helferaufgaben, Nährwerte und Fehlerbehandlung (ohne reale HA-Instanz).
- Playwright/Chromium: Desktop 1510px, Smartphone 390px, neue Navigation und Formulare, Wochenplanung, Vorräte, Familienmodus und Kochbuchauswahl. Weitere Tests: Favoriten, Szene/Volume/TTS nur auf Benutzerklick, Kiosk-Layout.
- Browser-PDF: Acht Rezepte ergeben 10 A4-Seiten (Cover + Verzeichnis + 8 Rezepte) mit Demodaten; Seiten gerendert und visuell geprüft.

## Grenzen und nicht abgeschlossen

- **Mealie/HA sind bislang nur mit Mock-APIs geprüft**, nicht mit deinen produktiven Servern. Mealie 3.x kann bei Import, Einkaufslisten und Nutrient PATCH abweichen; keine Produktivfreigabe.
- Externe USDA-FoodData-Central- und OpenAI-Requests sind im Test gefälscht; API-Schlüssel werden ausschließlich serverseitig konfiguriert. KI gibt Vorschläge, keine garantierten Nährwerte.
- KI-Gesprächssteuerung ist nicht permanent, sondern Browser-Spracherkennung, sofern verfügbar; keine vollständige frei formulierte Konversation.
- Zutatenmengen/Einheiten mit Mealie-Lebensmittelverknüpfungen sind weiterhin vor Schreibänderungen geschützt. Keine vollständige native strukturierte Zutatenbearbeitung oder Foto-Uploads.
- Kind-Ansicht ist eine UI-Hilfe, keine echte Login-Sicherheitszone. HA muss die Zugriffsrechte verantworten.
- Countdown-Alarme laufen zuverlässig nur bei geöffnetem Browser; keine Push-/HA-Hintergrundjobs. Für volle Offline-Einkaufslisten-Synchronisierung fehlt eine Conflict-Resolution-/Queue-Lösung.
- Tageszeiten-Ansichten sind zeitabhängige Präsentation, keine eigenständig geplante Benachrichtigungsautomation. Home Assistant Serviceaktionen brauchen passende konfigurierte Entitäten.
- Keine iPhone-/Safari-/Fully-Kiosk-Gerätetests. Keine öffentliche GitHub/HACS-/Marketplace-Einreichung, kein Ranking.

## Installation

Siehe `docs/START_HIER.md`. Zum Test nicht das Original-Mealie mit Rezeptänderungen gefährden. Die separate offizielle Home-Assistant-Mealie-Integration kann bestehen bleiben.
