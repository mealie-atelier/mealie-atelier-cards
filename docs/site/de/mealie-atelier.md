# Mealie Atelier: Rezepte, Kochmodus und Küche in Home Assistant

**Entwicklervorschau 0.9.5:** Mealie Atelier ergänzt Mealie um responsive Home-Assistant-Karten und eine optionale eigenständige Web-App. Die Vorschau ist noch nicht für eine produktive Installation freigegeben. Bitte zuerst Backups erstellen und mit einem Testkonto prüfen.

## Was ist enthalten?

- Zehn Lovelace-Karten für Rezepte, Kochmodus, Wochenplan, Einkauf, Vorrat, Familie, Entdecken und Kochbücher.
- Ein optionaler Home-Assistant-Bridge-Zusatz für geschützte Mealie-Verbindungen, Bilder, Planer, Einkauf und weitere Funktionen.
- Eine optionale Web-App für Küchen, die kein Home Assistant verwenden.
- Ein visueller Einrichtungs- und Design-Dialog, responsives Layout und ein fokussierter Kochmodus.

Mealie Atelier ist ein unabhängiges Community-Projekt und wird nicht von Mealie oder Home Assistant herausgegeben.

## Welche Variante passt?

| Variante                             | Voraussetzungen                       | Umfang                                                                                |
| ------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------- |
| Karten mit Mealie aus Home Assistant | Home-Assistant-Mealie-Integration     | Rezeptsuche, Rezeptdetails und Kochen; schreibgeschützt, begrenzte Ergebniszahl       |
| Karten mit Atelier Bridge            | Home Assistant, Bridge und Mealie     | Voller Kartenumfang, Bilder und je nach Berechtigungen Planer, Einkauf und Verwaltung |
| Eigenständige Web-App                | Mealie und privater Node-/Docker-Host | Atelier ohne Home Assistant; eigener Proxy und passwortgeschützter Zugriff            |

## Sicherheit vor dem Einrichten

Erstelle Backups von Home Assistant und Mealie. Verwende ein Mealie-Konto mit nur den benötigten Rechten. API-Tokens gehören ausschließlich in den geschützten Bridge- oder Web-Server-Dialog, niemals in YAML, URLs, Screenshots oder Browser-Lesezeichen. Für einen ersten Test kannst du den schreibgeschützten Modus aktivieren.

Die Web-App darf nicht direkt öffentlich ins Internet gestellt werden. Nutze ein privates Netzwerk oder einen HTTPS-Reverse-Proxy mit starker Anmeldung. Optionale USDA- oder KI-Suchen senden die jeweils angezeigten Suchtexte an den gewählten Anbieter, wenn du diese Aktion ausdrücklich auslöst.

## Einrichtung mit Home Assistant

Die vollständige [Einrichtungsanleitung](../../INSTALLATION_0.9.5.md) führt ohne YAML durch beide Varianten. Für reine Rezeptsuche und Kochschritte genügen die eingebaute Mealie-Integration und Atelier-Karten. Für Bilder, Einkauf, Wochenplan und weitere Küchenfunktionen kommt die Bridge dazu.

1. Home Assistant und Mealie sichern; für die Bridge die direkte Mealie-Adresse aus Sicht des HA-Hosts und ein Mealie-API-Token bereithalten.
2. Die Bridge über **Einstellungen → Geräte & Dienste → Integration hinzufügen** verbinden. URL und Token werden dort geprüft und sicher gespeichert.
3. Die Atelier-Karten installieren. Bei UI-verwalteten HACS-/Marketplace-Ressourcen wird das JavaScript-Modul automatisch registriert. Die Archivvorschau ist noch nicht veröffentlicht und benötigt vorübergehend die manuelle Installation aus der Einrichtungsanleitung.
4. Im Dashboard **Karte hinzufügen → Mealie Atelier → Complete Kitchen** wählen. Der visuelle Editor erkennt eine einzelne vorhandene Mealie-Verbindung und führt durch Ansicht und Erscheinungsbild.

## Eigenständige Web-App auf dem Startbildschirm

Die Web-App funktioniert ohne Home Assistant. Öffne sie über deine geschützte HTTPS-Adresse und wähle **App installieren** am Ende der Seite. Auf Chromium-Browsern öffnet die Schaltfläche den nativen Installationsdialog, sobald der Browser die Installation anbietet. Auf iPhone und iPad zeigt sie die Schritte für Safari: **Teilen → Zum Home-Bildschirm → Als Web-App öffnen → Hinzufügen**. Andere iOS-Browser können stattdessen auf Safari verweisen.

Die Installation setzt ein App-Symbol und öffnet denselben privaten Web-Server in einem eigenen Fenster. Sie erstellt kein zweites Mealie-Konto und speichert keine privaten Rezeptdaten für die Offline-Nutzung. Für HTTPS und private Verbindungen gelten dieselben Sicherheitsregeln wie für den Browserzugriff. Details zum Plattformverhalten: [Apple Web Apps](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) und [web.dev PWA-Installation](https://web.dev/learn/pwa/installation).

## Kochansicht, Rezepte und Bilder

Die Bridge lädt Rezept- und Schrittbilder über authentifizierte Routen. Der schreibgeschützte Home-Assistant-Core-Provider blendet Bilder aus, wenn sie nicht über einen vertrauenswürdigen, authentifizierten Proxy kommen. Die eingebaute Mealie-Aktion kann paginierte Ergebnisse liefern; Atelier fordert bis zu 500 Treffer in einer Antwort an und lädt keine Folgeseiten. Bei mehr als 500 passenden Rezepten kann die Liste unvollständig sein.

Vorschläge und Zutatenabgleiche sind praktische Orientierungshilfen, keine Allergie- oder Gesundheitsberatung. Prüfe Rezept, Produktverpackung und mögliche Kreuzkontamination selbst.

## Fehlerbehebung

- **Keine Verbindung:** Prüfe, ob die Mealie-URL vom Home-Assistant-Host erreichbar ist und HTTPS/Zertifikate stimmen.
- **Leere oder kurze Rezeptliste:** Prüfe die Mealie-Integration und die Ergebnisgrenze des gewählten Providers.
- **Karten zeigen eine alte Version:** Browser-Cache aktualisieren und Versionsparameter der Ressourcen-URL erhöhen.
- **Bilder fehlen:** Der Core-Provider zeigt nicht vertrauenswürdige Bild-URLs absichtlich nicht an; nutze die Bridge für authentifizierte Bilder.
- **Schreibaktion fehlt:** Provider, Mealie-Berechtigung und Bridge-Schreibschutz prüfen.

Teile bei Supportanfragen keine API-Tokens, privaten Rezepte, IP-Adressen oder ungeschwärzten Logs.

## Status, Updates und Unterstützung

Version 0.9.5 ist eine Entwicklervorschau, noch keine stabile Veröffentlichung. Lokale Cards-, Web-, Bridge- und Demo-Prüfungen sind im Repository dokumentiert. HACS-/Hassfest-CI, Live-Abnahme mit Home Assistant und Mealie, physische iPhone-Duo- und Druckertests sowie das Deployment der öffentlichen Doku stehen noch aus. Die deutschen, englischen und neutralen Light-Screenshots sind Browser-Simulationen; sie ersetzen keine Hardware-Abnahme. Die Repositories sind öffentlich, stabile Pakete aber noch nicht veröffentlicht.

Mit Liebe gebaut von [Daniel](https://alles-automatisch.de/). Wenn dir das Projekt hilft, kannst du es freiwillig über die [Projekt-Unterstützung](https://alles-automatisch.de/unterstuetzen) oder [Ko-fi](https://ko-fi.com/allesautomatisch) unterstützen.
