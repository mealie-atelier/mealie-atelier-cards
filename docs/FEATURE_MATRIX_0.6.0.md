# Mealie Atelier — Funktionsmatrix v0.6.0

**Leseschlüssel:** Umgesetzt = im Code und Mock-Browser testbar; Experimentell = bedienbare Funktion aber reale Daten/API nicht abgenommen; Offen = zur Wahrung der Datenintegrität bewusst nicht als fertig behauptet.

| Geplante Funktion | Stand in v0.6 | Prüfhinweis |
|---|---|---|
| Premium-Galerie, Rezeptdetails, Edit-/Import-Formulare | Umgesetzt | Chromium Mock; native Mealie-Zutatenobjekte weiterhin nicht vollständig editierbar |
| A4-Rezept-, Einkaufs- und Wochenplan-Druck | Umgesetzt | Chromium PDFs mit Beispieldaten |
| Kochbuch mit Cover, Verzeichnis, optional Fotos | Umgesetzt | 8 Rezepte/10 A4-Seiten, PDF visuell geprüft |
| USDA-Nährwerte pro Portion, Quelle, sichere Freigabe | Experimentell | Berechnung/Mocks getestet; echte USDA/Mealie PATCH fehlen |
| KI-Zutatenerkennung | Experimentell | Optionale OpenAI-Anbindung, Mocks getestet |
| Intelligente heutige Empfehlung | Umgesetzt | Heuristik, keine wissenschaftlich geprüfte Diät-/Allergenkontrolle |
| Optimierter Wochenplan und Resteverwertung | Experimentell | Vorschau + Mealie-Schreibaktion gegen Mock, echte Mealie API noch offen |
| Vorräte, Basiseinkäufe, Ablaufdaten und Einkaufsabgleich | Umgesetzt | Persistenz im Web, HA Store; Mengen-Näherung |
| Einkaufsliste gruppieren/zu Mealie übertragen | Experimentell | Mock; keine Offline-Queue, externe API ungetestet |
| Persönliche Rezeptnotizen, Bewertungen und Favoriten | Umgesetzt | Persistiert im Backend; HA pro User, Web pro Instanz |
| Gemeinsame Kochsessions, Timer, Kinderaufgaben | Umgesetzt | Backend-Persistenz/Browser Mock; UI-Kindermodus ist kein Role Lock |
| Qualitätscheck, KI-Audit, Ersatz-Zutaten | Experimentell | Lokaler Check getestet, externe KI ungetestet |
| Cooking Cockpit, Browser Vorlesen/Sprache | Umgesetzt/abhängig vom Browser | Sprach-API kann in Browsern fehlen |
| Opt-in Szene/Lautstärke/TTS in HA | Umgesetzt/experimentell | Service-Namen über Mock validiert, keine Geräteprüfung |
| Kiosk-/Tablet-Look und Tageszeit-Ansicht | Umgesetzt | Chrome Simulation, nicht auf Fully Kiosk Hardware |
| Native komplette strukturierte Zutaten-, Food- und Einheitenbearbeitung | Offen | Datensicherheit vor unbestätigtem PATCH |
| Originalbild-Upload im Rezepteditor | Offen | Mealie-Medien-API real verifizieren |
| Offline-Einkauf mit reibungsloser Mehrgeräte-Sync | Offen | keine Konflikt-Queue implementiert |
| Push-Alarm bei geschlossenem Browser | Offen | Hintergrundjob/HA Automation notwendig |
| Marketplace-Freigabe, Ranking und HACS-Katalog | Offen, bewusst verschoben | Erst echte Instanz und HACS/hassfest Tests |

*Alle Funktionen sollten zunächst mit anonymisierten Testrezepten ausprobiert werden.*
