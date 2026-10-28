# Mealie Atelier 0.9.1 – Feature-Status

| Bereich | Status | Nachweis oder Einschränkung |
|---|---|---|
| Premium-UI, 10 Ansichten | Browser-Beta | 10 × 4 Card-Breiten mit Demodaten geprüft |
| Controls, Checkboxen, Auswahl, Formulare | Verbessert, Chromium-getestet | Zentrale CSS-Module und Interaktionstests auf mehreren Breiten; Live-System offen |
| Design-Tokens, Grid und gemeinsame Komponenten | Umgesetzt | Unter `src/design-system`; Alt-CSS noch kompatibel eingebunden |
| Responsive HACS-Card-Layout | Umgesetzt | Container Queries, 380px Card im 1510px-Browser getestet |
| Animationssystem / reduzierte Bewegung | Browser-Beta | Motion-Presets vorhanden, echte Geräte folgen |
| Rezeptgalerie, Rezeptdetails, Formulare | Demo-/API-Beta | Echte Mealie-Version noch nicht abgenommen |
| Rezept-, Einkaufs- und Wochenplan-Druck | PDF-Beta | A4-Muster aus der Vorversion, reale Drucker noch nicht abgenommen |
| Cooking Cockpit, lokale Timer, Notizen | Browser-Beta | Web-/HA-Backend-Kopplung abhängig von Umgebung |
| Vorratsabgleich, Discover, Wochenplanung | Pure-/Mock-getestet | Mengen-/Konflikttests vorhanden, keine vollständige Live-Abnahme |
| Familie, gemeinsame Kochsessions | Pure-/Mock-getestet | Datenschutz, Mehrbenutzerrechte und echte Geräte offen |
| Atelier Nutrition / optionale KI | Mock-getestet | USDA/OpenAI-Calls und Mealie-PATCH real noch nicht abgenommen |
| **Strukturierte Zutatenbearbeitung** | **Experimentelle Backend-Vorbereitung** | Fingerprint, Backup und Validierung; in HA deaktiviert, UI noch nicht durchgehend |
| **Originalfoto-Upload** | **Experimentelle Web-Server-API** | Signatur, Größenlimit, Backup, Konfliktprüfung; UI und HA-Upload fehlen |
| **Offline-Einkaufssynchronisierung** | **Nicht fertig** | Verlässliche Schreibqueue/Mehrgeräte-Konfliktauflösung fehlt |
| **Timeralarm bei geschlossenem Browser** | **Nicht fertig** | Browser allein garantiert keine Alarmzustellung; HA Scheduler/Push fehlt |
| Live-Mealie- und Live-HA-Abnahme | Nicht durchgeführt | Echte Testinstanz mit sicheren Testrezepten benötigt |
| Marketplace-Reife | Nicht erreicht | Repo-Veröffentlichung, reale Tests, Security Review, Installations-UX fehlen |

Alle Angaben beziehen sich auf den ausgelieferten Code. Eine hübsche Demo ist kein Nachweis echter Backendkompatibilität.
