# UI-Qualitatsabnahme v0.9.2

Stand: 28. Oktober 2026. Alle Tests lokal, in Chromium und mit Fixture-/Mockdaten.

| Prufung                                  | Ergebnis        | Details                                        |
| ---------------------------------------- | --------------- | ---------------------------------------------- |
| Card-Unit-Tests                          | 25/25           | npm test                                       |
| Web-Backend-Tests                        | 16/16           | node --test                                    |
| HA-Bridge-Tests                          | 17/17           | pytest                                         |
| Ansichten 360px                          | 10/10           | Kein horizontaler Uberlauf, Navigation/Buttons |
| Ansichten 390px                          | 10/10           | Kein horizontaler Uberlauf, Navigation/Buttons |
| Ansichten 820px                          | 10/10           | Kein horizontaler Uberlauf, Navigation/Buttons |
| Ansichten 1440px                         | 10/10           | Kein horizontaler Uberlauf, Navigation/Buttons |
| Embedded HA-Card 380px im 1440px-Fenster | 10/10           | Container Queries, keine uberlaufenden Panels  |
| Rezept-/Einkaufsauswahl                  | 5/5 Zielbreiten | Zustand nach Klick aktualisiert                |
| Dialoge, Editor, Kochmodus, Licht-Theme  | 5/5             | Keine JS-Fehler in kontrollierten Ablaufen     |
| Aktive Elemente unter 35px               | 0               | 360/390/820/1440px nach zwei Icon-Fixes        |
| Sichtbare unbeschriftete Controls        | 0               | Zehn Demo-Ansichten                            |
| Offline-Demo                             | Bestanden       | Bilder, Schnellzugriff, Escape, Navigation     |
| Kochbuch-PDF                             | 10 A4-Seiten    | Mit Chromium erzeugt und als PNG kontrolliert  |

**Testgrenzen:** Die Prufungen beweisen keine vollstandige Barrierefreiheit nach WCAG, keine Eignung fur alle Browser und keine Live-Kompatibilitat mit Mealie, Home Assistant, externen KI/USDA-Diensten oder Fully Kiosk. Manuelle Nutzer- und Hardwaretests stehen aus.
