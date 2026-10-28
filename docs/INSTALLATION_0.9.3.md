# Archived: Mealie Atelier 0.9.3 — Installation und technical acceptance

This document is a historical snapshot. Its referenced ZIPs and scripts may not exist in this archive. For current instructions, use [Installation 0.9.5](INSTALLATION_0.9.5.md) and [Release readiness 0.9.5](RELEASE_READINESS_0.9.5.md).

**Entwickler-Beta, keine Produktivfreigabe.** Nutze für den Test eine isolierte Home-Assistant-Instanz und eine gesicherte Kopie von Mealie. Nicht mit echten Geräten koppeln. Die bisherige Mealie-Integration bitte nicht entfernen.

## Ohne Installation ansehen

Öffne `Mealie-Atelier-Interaktive-Demo-v0.9.3.html` lokal im Browser. Diese Demo enthält ausschließlich synthetische Daten und überträgt keine Änderungen an Mealie. Das neue Modulsystem soll optisch **identisch** zur v0.9.2 aussehen.

## Home Assistant: manuelles Testpaket

1. Test-Backup von Home Assistant und separater Mealie-Testinstanz anlegen und Wiederherstellbarkeit prüfen.
2. Aus `Mealie-Atelier-Home-Assistant-Manuell-v0.9.3.zip` `custom_components/mealie_atelier/` und `www/mealie-atelier-cards.js` unter `/config/` installieren.
3. Home Assistant neu starten; unter Geräte & Dienste die **Mealie Atelier Bridge** konfigurieren. Ein Token verwenden, der möglichst nur der Testinstanz gilt.
4. Die Ressource `/local/mealie-atelier-cards.js?v=0.9.3` als JavaScript-Modul in einem separaten Testdashboard eintragen.
5. Eine Atelier-Card mit dem grafischen Editor anlegen. **Zunächst nur lesen**, keine experimentellen strukturierten Zutaten-Änderungen aktivieren.
6. Bei Fehlern den internen Diagnosebereich, Home-Assistant-Protokolle und Browser-Konsole prüfen. Niemals Tokens oder private Rezeptdaten in öffentliche Bugreports kopieren.

Die verfügbaren Menüpunkte können je nach Home-Assistant-Version abweichen. Die Integration ist noch nicht im offiziellen Marketplace installiert oder dort freigegeben.

## Companion-Web-App

Eine `.env` aus `.env.example` anlegen und `MEALIE_URL`, `MEALIE_API_TOKEN`, `ATELIER_PASSWORD` setzen; Container oder Node.js 22+ laut Companion-README starten. Nicht mit ungesichertem HTTP im Internet verfügbar machen. Originalbilder und Zutatenänderungen werden mit speziellen Sicherheitsvorgaben behandelt; **vor Live-Schreibtests eine Datenbankkopie verwenden**.

## Lokale komplette Testreihe

Im Projektwurzelverzeichnis:

```bash
sh scripts/verify-v093.sh
```

Dabei werden Node-/Python-Tests, Browserprüfungen (Playwright/Chromium) und die v0.9.2→v0.9.3-Pixel-Regression ausgeführt. Die reale Mealie-Instanz wird nicht kontaktiert.

## Read-only-Kompatibilitätstest gegen Mealie

Im Companion-Verzeichnis kann der GET-only-Test auf die konkrete Mealie-Testinstanz zeigen:

```bash
MEALIE_ATELIER_TEST_READONLY=1 MEALIE_URL='https://mealie.test.example' MEALIE_API_TOKEN='lokal_setzen' node test/live-readonly-smoke.mjs
```

Dieser Test prüft bekannte API-Pfade und Feldformen, aber keine Modifikation, HACS oder den gesamten Mealie-Vertrag. Test-URL und Token niemals in Versionskontrolle speichern.

## Verbindlicher Abnahmekatalog vor 1.0

- Mealie: echte Versionsnummer dokumentieren; Datenbank-Backup und Restore; GET- und kontrollierte Schreibtests mit Rezept-Zutaten, Mengen, Einheiten, Nährwerten und Originalbildern.
- HA: vollständige Installation, mehrere Benutzerrollen, Read-only, WebSocket-Reconnect, HACS-Update und Deinstallation.
- Netz: Timeout, temporäre Offline-Situation, gleichzeitige Änderungen, Konflikte; Einkaufslisten-Queue und Wiederabgleich.
- Geräte: iPhone, Desktop, echtes Wandtablet/Fully Kiosk; Hintergrund-Timer/Push und Stromsparmodus.
- Design: Dark und Light, alle zehn Views, Formulare/Checkboxen/Modalzustände, 380px HA-Card, Motion reduziert, Tastatur.
- Druck: A4 Rezept/Kochbuch/Wochenplan, mehrseitig, reale Drucker und PDF-Vorschau.

Bis dahin keine Veröffentlichung als stabile Version.
