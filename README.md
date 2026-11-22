# Photo Metadata (Grav-Plugin)

Bildmetadaten direkt im Admin bearbeiten und die Anzeige von EXIF- und GPS-Daten steuern.

## Status

Version für Grav 2 mit Admin2. Der klassische Admin wird nicht unterstützt.

## Voraussetzungen

- Grav `>= 2.0.0`
- API-Plugin `>= 1.0.0`
- Admin2 `>= 1.0.0`

## Admin2-Seite „Foto-Metadaten“

Im Admin2 gibt es in der Sidebar den Punkt **Foto-Metadaten**. Er zeigt den Seitenbaum wie das Admin2 selbst: Die Seiten kommen aus der API-Route `/pages`, Unterordner werden beim Öffnen nachgeladen. Nach Auswahl einer Seite siehst du ihre Bilder und kannst die Sidecar-YAML jedes Bildes bearbeiten.

- Die YAML liegt als `<bild>.<ext>.meta.yaml` neben dem Bild. Beim Speichern prüft der Server, dass es gültiges YAML mit Schlüsseln ist.
- Ein leeres Dokument löscht die Sidecar-Datei.
- Geschrieben wird nur für Bilder, die zur gewählten Seite gehören.
- Die Plugin-API hat drei Endpunkte unter `/photo-metadata/…`: `images` (GET) sowie `meta` (GET und PUT). Die Seitenliste kommt von der API-Route `/pages`. Rechte: `api.media.read` zum Lesen, `api.media.write` zum Schreiben.
- Seiten ohne Bilder erscheinen im Baum ebenfalls. Auf ihnen steht dann „Keine Bilder auf dieser Seite.“

## Geplante Funktionen

- Eigene Eingabefelder für EXIF-Werte. Bisher bearbeitest du alles im YAML-Editor, die Bilddatei bleibt unverändert.

## Einstellungen

| Schlüssel | Standard | Bedeutung |
|---|---|---|
| `enabled` | `true` | Plugin aktiv |
| `show_exif` | `true` | EXIF-Daten auf Fotoseiten anzeigen |
| `show_gps` | `false` | GPS-Position anzeigen (mit OpenStreetMap-Karte) |

## Pro Seite überschreiben

Im Header einer Seite (Fotoseite) lassen sich beide Schalter überschreiben. Fehlende Schlüssel bleiben auf dem globalen Standard.

```yaml
---
title: Mein Foto
photo_metadata:
  show_exif: true
  show_gps: true
---
```

## Verwendung im Theme

Das Plugin setzt die Variable `photo_metadata` für alle Templates. Die Werte sind bereits mit der Seiten-Übersteuerung zusammengeführt:

```twig
{% if photo_metadata.show_exif %}
  {# EXIF-Liste anzeigen #}
{% endif %}

{% if photo_metadata.show_gps %}
  {# GPS-Position und Karte anzeigen #}
{% endif %}
```

## Installation

Über den Admin oder manuell: Den Ordner `photo-metadata` nach `user/plugins/` kopieren.

## Lizenz

AGPL-3.0, siehe `LICENSE`.
