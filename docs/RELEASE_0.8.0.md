# Mealie Atelier v0.8.0 - Qualitaets-Release

**Status:** Entwickler-Beta. Kein Marketplace-Release, keine Freigabe fuer eine Produktivinstanz.

Das Ziel dieser Version ist zuverlaessige Bedienung und Datenintegritaet, nicht ein weiteres isoliertes Mockup. Das fotografische Design und das Motion-System aus v0.7 sind erhalten.

## Was sich gegenueber v0.7 tatsaechlich verbessert hat

### 1. Zuverlaessigerer Zutaten- und Vorratsabgleich

- Die Rechenlogik nimmt strukturierte Zutatenmengen aus Mealie, soweit sie vorhanden sind, und normalisiert g/kg sowie ml/l. Zutaten ohne sicher auswertbare Einheit werden als unklar gekennzeichnet; es werden keine erfundenen Grammwerte verwendet.
- Mehrere Gerichte und mehrere gleiche Zutaten eines Gerichts verbrauchen denselben Vorrat nur **einmal**. Eine bekannte Menge darf nicht gleichzeitig mehrere Positionen vollstaendig decken.
- Abgelaufene Vorratspositionen werden nicht als verfuegbarer Bestand betrachtet.
- Der Skalierungsfaktor fuer Haushaltsportionen funktioniert nach oben und nach unten. Zuvor wurden kleinere Portionenzahlen teilweise nicht beruecksichtigt.
- Lebensmittelbezeichnungen werden konservativer abgeglichen. Aehnliche Begriffe bedeuten nicht automatisch denselben Artikel.
- Ergebnis bleibt eine nachvollziehbare Einkaufsempfehlung; vorhandene Vorraete koennen im Alltag veralten und sind kein offizielles Lager- oder Allergensystem.

### 2. Schutz gemeinsamer Kochsessions

- Ein neuer gemeinsamer Kochstart ersetzt keine noch laufende Session ohne bewusste Freigabe. Auch der Server weist einen unbeabsichtigten Ersatz ab.
- Familienmitglieder mit noch zugewiesenen Aufgaben koennen nicht stillschweigend entfernt werden.
- Bestehende Revisionspruefungen schuetzen weiterhin vor konkurrierenden Aenderungen.
- Gleiche Regeln sind in der standalone Web-App und in der Home-Assistant-Bridge vorhanden; der echte HA-Core muss noch geprueft werden.

### 3. Hochwertigere und sicherere Interaktionen

- Bei Loeschen, Session-Wechsel, externer KI-Freigabe, Rezeptqualitaet und Einkaufsaktionen ersetzen native, gestylte `<dialog>`-Dialoge die bisherigen Browser-`confirm`, `prompt` und `alert`-Fenster.
- Sichtbarer Fokus, bedienbare Buttons, Escape und Abbrechen ohne Datenveraenderung.
- Responsives Design, kontrastreiche Bedienelemente und Unterstuetzung fuer `prefers-reduced-motion` bleiben erhalten.

### 4. Systemcheck und Atelier-Datenexport

- **Verwalten -> Verbindung pruefen** zeigt Status fuer Atelier-Bridge, Rezepte, Einkaufslisten, Wochenplan und Atelier-Speicher. Alle fuenf Pruefungen sind reine Lesezugriffe.
- **Atelier-Daten als JSON sichern** exportiert die Atelier-eigenen Haushaltsinformationen, Vorratsliste, Bewertungen und gemeinsamen Sessions. Der Export ist privat aufzubewahren und **kein** Mealie-Datenbank-Backup. Ein Import-/Restore-Werkzeug ist noch nicht verfuegbar.

### 5. Drucken ohne dunkle Tintenflaechen

- Das Kochbuch-Cover ist in der Druckausgabe auf weissem Papier mit gut lesbaren dunkelgruenen Texten ausgelegt, auch wenn der Browser _Hintergrundgrafiken drucken_ deaktiviert hat.
- Die Bildschirmvorschau behaelt die dunkle Premium-Covergestaltung. Die bisherige Rezept-, Einkaufslisten- und Wochenplan-Druckgestaltung bleibt erhalten.

## Welche Tests wurden durchgefuehrt?

| Bereich                                                     | Ergebnis                                                           | Grenzen                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| HA-Bridge Python-Tests                                      | 14/14 bestanden                                                    | isolierte Mock-Tests, kein Home Assistant Core |
| Standalone-Backend Node-Tests                               | 11/11 bestanden                                                    | simulierte Mealie-API                          |
| Cards/Domain-Logik Node-Tests                               | 18/18 bestanden                                                    | keine reale Mealie-Datenbank                   |
| Dialoge, Systemcheck, Export, responsives Layout            | Chromium 390, 820, 1510 px bestanden                               | synthetische Beispieldaten                     |
| Einkaufs-, Vorrats-, Familien-, Koch- und Planungsablauf    | Chromium 390 und 1510 px bestanden                                 | simulierte Dienste                             |
| Gedrucktes Kochbuch mit ausgeschalteten Hintergrundgrafiken | 10 A4-Seiten als PDF erzeugt, Cover gerendert und visuell geprueft | keine physische Druckerprobe                   |
| Offline-HTML-Demo                                           | Bilder und App-Funktionen im Chromium-Smoke-Test                   | nur lokale Beispieldaten                       |

**Gesamt: 43/43 automatisierte Python- und Node-Tests bestanden.** Die genannten Browserchecks kommen hinzu. Die Tests belegen den geprueften Codepfad und sind kein Beweis fuer Fehlerfreiheit in jeder Konfiguration.

## Was bewusst noch nicht als fertig gilt

- **Echte Integration:** Keine Abnahme mit deiner konkreten Mealie-Version, deinem HA-Core, realen USDA-/OpenAI-Responses und berechtigten Schreibzugriffen.
- **Zutateneditor:** Strukturierte Mealie-Zutaten mit Lebensmitteln, Einheiten und Mengen lassen sich noch nicht vollstaendig risikolos bearbeiten. Experimentelle Schreibwege sind bewusst begrenzt.
- **Bilder:** Der direkte Upload eines Original-Rezeptfotos ist noch nicht gegen eine Live-API abgesichert.
- **Offline und Benachrichtigungen:** Keine vollstaendige konfliktaufloesende Multi-Device-Offline-Queue, keine verlaesslichen Timer-/Pushalarme bei geschlossenem Browser.
- **Hardware und Barrierefreiheit:** Noch keine echte iOS/Safari-, Screenreader-, Drucker- oder Fully-Kiosk-Hardwareabnahme.
- **Marketplace:** Nicht eingereicht, nicht freigegeben, kein Ranking versprochen.

## Installation und Abnahme

Die Anleitung steht in `docs/START_HIER.md`. Zuerst Backup und isolierte Testinstanz. In Home Assistant Bridge installieren, Core neu starten, Card-Modul als Ressource registrieren. Im Kartenbereich `Verwalten` zuerst den neuen Systemcheck starten. Schreibaktionen nur mit Dummy-Rezepten und einer Test-Einkaufsliste pruefen. Vorher keine echte Ernahrungs- oder Haushaltsdatenbank verknuepfen.
