# Mealie Atelier 0.2.0 — Release Notes

**Status:** Developer Preview / Beta. Kein produktionsreifer Marketplace-Release.

## Neu in 0.2.0

1. **Today-Karte** als sechster Lovelace-Kartentyp: Tagesgerichte und noch offene Einkaufsartikel.
2. **Einkaufslisten erstellen** direkt in der Oberfläche.
3. **Rezeptzutaten übernehmen** in eine ausgewählte Einkaufsliste über die Mealie-API.
4. **Erweiterter Rezepteditor:** Name, Beschreibung, Portionenzahl, optionale Zubereitungsschritte. Freitext-Zutatenänderungen sind standardmäßig deaktiviert und benötigen ein Backup + explizite experimentelle Freigabe. Strukturierte Zutaten werden geschützt.
5. **Nur-Lesen-Modus**: Home-Assistant-Option (neu konfigurierbar) oder `ATELIER_READ_ONLY=true` in der Web-App. Schreiboperationen werden backendseitig verweigert; die UI blendet Bearbeitungsaktionen aus.
6. **Mealie-Wochenplan-API korrigiert:** Parameter `start_date` und `end_date` statt ungültiger Schreibweise.
7. **Bessere Sicherheits- und Fehlersignale:** enger kontrollierte Eingaben, keine Weitergabe ungefilterter Mealie-Fehlermeldungen, zusätzliche Sicherheitsheader im Web-Companion.
8. **Automatisierte Tests erweitert:** aiohttp-Backend-Fixtures, Node-HTTP-Tests, Desktop-/Mobile-Browser-Smoketests inklusive Read-only-Szenario.
9. **Marketplace-Vorbereitung:** Dokumentation, versionskonsistente Pakete, Demo-Screenshots, Validierungs-Workflows.

## Geprüft

- Python-/aiohttp-Client: Endpoint-Pfade, Authentifizierung, Datumsauswahl, Schreibaktionen, Datenvalidierung und Fehlermeldungen mit lokalem HTTP-Fixture.
- Node-Web-App: Auth, URL-Schutz, Rezept- und Einkaufsaktionen, Read-only-Blockade, Bildauslieferung und Datumsparameter mit lokalem Mealie-Mock.
- Browser: Chromium-Smoketests auf Desktop/Smartphone (Demo-Daten), Navigation, Kochmodus, Modalformen, Listenaktionen, Read-only-Bedienelemente und horizontales Überlaufen.

## Vor echtem Einsatz offen

- Tests **mit echtem Mealie 3.x** inklusive API-Schema für Zutaten und Import, speziell dem upstream als veraltet markierten Rezept-zu-Liste-Endpunkt.
- Installation und Funktionsprüfung mit einer tatsächlichen Home-Assistant-Version 2026.10+.
- Gegenprobe auf iPhone/Safari und Fully Kiosk / Wandtablet, Barrierefreiheit (Tastatur-/Fokusmanagement) und produktive Fotodarstellung.
- Neues GitHub-Repository pro HACS-Kategorie, reale Owner-Metadaten, HACS/hassfest erfolgreich durchlaufen lassen, GitHub Release veröffentlichen und im Katalog einreichen.
- Editieren strukturierter Lebensmittellinks, Mengen/Einheiten und Bilder; Mealie-API-Änderungsmanagement, Login-/Reauth-Verbesserungen und sichere Zugriffsbeschränkungen pro Benutzer.

Die offizielle Mealie-Integration in Home Assistant bleibt weiterhin unabhängig erhalten und sollte nicht durch die Bridge ersetzt werden.
