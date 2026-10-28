# Mealie Atelier 0.9 – Testinstallation

**Bitte nur in einer gesicherten Testumgebung verwenden.** Der aktuelle Stand ist eine Entwickler-Beta, nicht die HACS-/Marketplace-Freigabe. Die ZIPs sind Installations- und Quellcodepakete, keine bereits veröffentlichten GitHub-Releases.

## Offline-Demo

`Mealie-Atelier-Interaktive-Demo-v0.9.0.html` herunterladen und in einem Desktop-Browser öffnen. Die Demo enthält ausschließlich Beispieldaten; darin vorgenommene Änderungen gehen nicht an Mealie. In Browsern, die lokale HTML-Dateien restriktiv behandeln, kann ein lokaler statischer Server verwendet werden.

## Home Assistant – manuell, nur auf Testsystem

1. Vorher ein Home-Assistant-Backup anlegen und sicherstellen, dass deine Testumgebung keine echten Geräte schalten kann.
2. Aus dem Paket `Mealie-Atelier-Home-Assistant-Manuell-v0.9.0.zip` den Ordner `custom_components/mealie_atelier` in das Home-Assistant-Konfigurationsverzeichnis kopieren.
3. Die Datei `www/mealie-atelier-cards.js` in `config/www/` kopieren.
4. Home Assistant neu starten. Unter **Einstellungen → Geräte & Dienste** die Integration „Mealie Atelier Bridge“ konfigurieren; mit einer separat abgesicherten Mealie-Testinstanz verbinden.
5. Unter **Einstellungen → Dashboards → Ressourcen** die JS-Ressource `/local/mealie-atelier-cards.js?v=0.9.0` mit Typ `JavaScript-Modul` hinzufügen.
6. Einen **neuen Test-Dashboard-View** erstellen und die Mealie-Atelier-Card über den grafischen Editor anlegen.
7. Die Integration bis zur echten API-Abnahme vorzugsweise im **Nur-Lesen-Modus** betreiben. Experimentelle Zutatenänderungen sind in HA nicht verfügbar; für sie gibt es noch keinen freigegebenen WS-Write-Pfad.

**Nicht** die offizielle Mealie-Integration entfernen; Atelier ist eine zusätzliche Oberfläche. Die aktualisierte Dokumentation für deine HA-Version ist im Live-System maßgeblich, denn Menüpunkte können sich ändern.

## Standalone-Web-App

Im Verzeichnis `mealie-atelier-web` die `.env.example` als `.env` kopieren, dann `MEALIE_URL`, `MEALIE_API_TOKEN` und ein starkes `ATELIER_PASSWORD` setzen. Optional die `docker-compose.yml` des Pakets nutzen, sonst mit Node.js 22+ starten. Nie API-Token in den Browsercode oder die Demo schreiben. Nicht ohne HTTPS und weitere Zugangsbeschränkungen öffentlich erreichbar machen.

`ATELIER_STRUCTURED_EDITS` und `ATELIER_EXPERIMENTAL_INGREDIENTS` **nicht** auf deiner Produktivinstanz aktivieren. Die Backend-Preview und Sicherheitsfunktionen für Zutaten sind experimentell und benötigen einen Testlauf gegen eine genaue Mealie-Version mit verifizierten Backups.

## Testen

```bash
cd mealie-atelier-cards
npm run build && npm run check && npm test

cd ../mealie-atelier-web
node --test test/*.test.mjs

cd ../mealie-atelier-bridge
python -m pytest -q tests
```

Für Container-Layout-Regressionen `python qa/quality_gate.py` aus der Projektwurzel aufrufen. Dazu sind Python Playwright und Chromium erforderlich; der Test lädt nur lokale Demodaten.

## Sicherer Abnahmekatalog

Vor einem öffentlichen Release müssen mit einer **Kopie** der Mealie-Datenbank mindestens Rezeptänderungen, strukturierte Zutaten und Verknüpfungen, Foto-Backup und Upload, Nährwert-PATCH, mehrere gleichzeitig angemeldete Nutzer, ausgefallene Netzwerkverbindung, Offline-Reconciliation, Timer bei gesperrtem/geschlossenem Browser, Print-PDF, Fully Kiosk auf physischer Hardware und Deinstallation getestet werden. Bis dahin ist das Projekt ausdrücklich eine Beta.
