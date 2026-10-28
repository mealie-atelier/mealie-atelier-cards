# Mealie Atelier v0.8.0 - Funktionsstatus

**Begriffe:** _Umgesetzt + Mock getestet_ bedeutet nur die gelaufenen lokalen Tests; _Experimentell_ bedeutet nicht durch echte Mealie-/HA-API abgenommen; _Offen_ ist bewusst noch nicht als funktionsfaehig behauptet.

| Bereich                                                 | Status                       | Pruefung / Einschraenkung                                         |
| ------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| Premium-Oberflaeche aller zehn Views                    | Umgesetzt + Mock getestet    | Chromium Desktop, Tablet, Handy; Motion und Tastatur              |
| Rezepte finden, lesen, bearbeiten (Text/Schritte)       | Umgesetzt + Mock getestet    | Strukturierte Zutatenoperationen gesperrt bzw. experimentell      |
| Premium-Formulare und QR-/Link-Import                   | Experimentell                | echte API-Abnahme fehlt                                           |
| Rezeptdruck A4, Einkaufslisten, Wochenplan              | Umgesetzt + PDF getestet     | Standardfaelle in Chromium; echte Drucker fehlen                  |
| Kochbuch mit Cover, Inhaltsverzeichnis, Rezepten        | Umgesetzt + PDF getestet     | zehn A4-Seiten; tintensparendes Cover geprueft                    |
| Nutrition mit USDA, KI-Zutatensuche und Quellennachweis | Experimentell                | echte externe API und Mealie-Synchronisation fehlen               |
| Empfohlenes Tagesrezept und intelligente Woche          | Umgesetzt + Mock getestet    | heuristisch, keine medizinische oder Allergenkontrolle            |
| Vorrats-Light, Ablaufdatum, Mengenabgleich              | Umgesetzt + Tests erweitert  | Shared-stock-ledger, Portionsskalierung und Einheitensicherheit   |
| Einkaufslistenvorschau und Mealie-Uebernahme            | Experimentell                | echte Mealie-Version und Offline-Zugriff nicht geprueft           |
| Rezeptfavoriten, Bewertungen, Notizen                   | Umgesetzt + Mock getestet    | Backend-Persistenz im simulierten Test, Web ein Haushaltsprofil   |
| Gemeinsame Kochsessions, Timer, Helferaufgaben          | Umgesetzt + Tests erweitert  | kein sicherer Kinderrollen-Schutz, Browser-Timer nicht pushfaehig |
| Session-Verlust- und Familien-Aufgabenschutz            | Umgesetzt + Tests erweitert  | Clientbestaetigung und serverseitige Sperre                       |
| Kochmodus, Browser-Vorlesen, Sprachbefehle              | Umgesetzt / browserabhaengig | kein Always-on-Voice, keine physische Hardwareabnahme             |
| Optionale HA-Szene, Musiklautstaerke, TTS               | Experimentell                | Servicenamen simuliert; keine echten Aktoren geschaltet           |
| Qualitaetscheck und KI-Rezeptvorschlaege                | Experimentell                | AI opt-in, keine automatischen Schreibvorgaenge                   |
| Print Studio und Design Studio                          | Umgesetzt + Mock getestet    | Custom-Cards-Editor, Presets, Motion-Opt-out                      |
| Native eigene Bestaetigungsdialoge                      | Umgesetzt + Mock getestet    | Escape/Abbrechen/Tastatur getestet                                |
| Verwalten-Systemcheck (5 Dienste)                       | Umgesetzt + Mock getestet    | read only; echte HA-Verbindung noch zu pruefen                    |
| Atelier-Datenexport als JSON                            | Umgesetzt + Mock getestet    | **kein** kompletter Mealie-Backup/Restore                         |
| Echtzeit-Offline-Mehrgeraete-Synchronisation            | Offen                        | Konfliktfaehige Offline-Queue fehlt                               |
| Pushalarme bei geschlossenem Browser                    | Offen                        | serverseitige Scheduler/Push fehlen                               |
| Native sichere Editierung strukturierter Mealie-Zutaten | Offen                        | Datenverlust vermeiden                                            |
| Original-Rezeptfoto-Upload                              | Offen                        | Medien-Endpunkt auf Live-Version pruefen                          |
| Oeffentliche HACS/Marketplace-Freigabe                  | Offen                        | zwei Repositories und externe Abnahme erforderlich                |

## Abnahmekriterien fuer eine stabile 1.0

1. Echte Mealie-Instanz mit reprasentativen Zutaten, verschiedenen Einheiten, Duplikaten und Schreibrechten; fehlerfreie Round-Trips der vorgesehenen Operationen.
2. Home Assistant Test-Core mit HACS-Ressource, grafischem Card-Editor, Berechtigungen und echten Fehlerfaellen.
3. Erlaubte Uploads und Zutaten-Aenderungen mit Backups, Versions-/Fingerprint-Pruefungen und Rueckrollmoeglichkeit.
4. Gemessene Renderleistung auf echten mobilen Browsern und Fully-Kiosk-Tablet, mit reduzierter Bewegung und Screenreader-Pruefung.
5. Netzwerkunterbrechung, parallele Benutzer, session conflicts, API-Fehler und Datenwiederherstellung.
6. A4-Druckqualitaet auf mindestens einem physischen Drucker und in Safari.
7. HACS/hassfest/CI Checks und formal akzeptierte Katalog-Listungen; keine Rankingzusage.

**Bis dahin bleibt v0.8.0 eine lokal getestete Entwickler-Beta.**
