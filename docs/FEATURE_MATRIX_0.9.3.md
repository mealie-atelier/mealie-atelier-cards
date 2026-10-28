# Archived: Mealie Atelier 0.9.3 feature and release status

This is a historical snapshot. See the [current 0.9.5 feature matrix](FEATURE_MATRIX_0.9.5.md) and [release readiness checklist](RELEASE_READINESS_0.9.5.md).

| Bereich                                                     | Lokaler Nachweis                                                             | Was noch fehlt                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Design-Tokens, Grid, 10 Views, Motion                       | Quellmodule vereinheitlicht; **40/40** Pixelvergleiche ohne Abweichung       | Physische Geräte, andere Browser, alle dynamischen Dialogzustände          |
| Dashboard, Heute, Discover, Rezepte                         | Browser gegen lokales Companion-/HTTP-Backend                                | Eigene Mealie-Daten und Versionen                                          |
| Wochenplan, Vorräte, Einkauf, Familie, Kochbuch, Verwaltung | Lokale Backend-, Browser- und Component-Tests                                | Geräteübergreifende/langfristige Live-Nutzung                              |
| Checkboxen, Formulare, Home-Assistant-Editor                | Gemeinsames Control-System aus v0.9.2 übernommen; Tests grün                 | Realer HA-Lovelace-Editor auf Zielversion                                  |
| Print Studio, Rezept-PDF, A4-Kochbuch                       | Vorhandene v0.9.2-Ausgabe bewahrt                                            | Drucker, Safari/Firefox, lange echte Rezeptsammlungen                      |
| Ernährung/USDA/optionale KI                                 | Lokale Validierung/Simulation                                                | Externe echte API-Calls und Datenqualität                                  |
| Strukturierte Zutaten (Web)                                 | Echte HTTP-PATCHes gegen Testserver; Backup, Locking, `food`/`unit` erhalten | Test gegen konkrete Mealie-Version; HA-Schreibworkflow experimentell       |
| Originalfoto ersetzen (Web)                                 | HTTP-Multipart, Backup, Signatur, Konflikte, Read-only geprüft               | Mealie-Live-Upload und vollständige Upload-UI-/HA-Abnahme                  |
| Companion-API-Berechtigungen                                | 19 Webtests inkl. lokaler HTTP-Gegenstelle                                   | Sicherheitsprüfung in realem Deployment und HTTPS-Setup                    |
| HA-Bridge/WebSocket                                         | 22 Python-Tests auf echtem Handlercode mit HA-Adapter                        | **Kein echter HA-Core gestartet**; Installation/Live-Verhalten             |
| Browser-End-to-End                                          | 10 Views und Einkaufsschreibweg mit Companion+Fake-Mealie, 390/1440px        | Produktiv-Mealie, Auth/Netzwerkbedingungen im Nutzersystem                 |
| Offline-Einkauf über mehrere Geräte                         | Nicht vollständig                                                            | Persistente Offline-Queue, Retry, Konfliktauflösung und Multi-Device-Tests |
| Timeralarme bei geschlossenem Browser                       | Nicht vollständig                                                            | Server-/HA-/Push-Alarmkette und Geräte-Abnahme                             |
| Marketplace und HACS                                        | Manifest/Ordnerstruktur vorhanden                                            | Öffentliche Repositories, Versionstest, Review, Distribution               |

**Status:** Entwickler-Beta; kein Versprechen, dass alle Funktionen produktionsreif sind. Die Tests verwenden ausschließlich lokale Testserver und Demodaten. Aktive Schreib-Funktionen nur auf gesicherter Testkopie einschalten.
