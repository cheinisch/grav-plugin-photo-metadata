# Photo Metadata (Grav-Plugin)

Bildmetadaten direkt im Admin bearbeiten und die Anzeige von EXIF- und GPS-Daten steuern.

## Status

Frühe Version 0.1.1. Das Plugin stellt die Einstellungen bereit, auch pro Seite überschreibbar. Der Batch-Editor im Admin bearbeitet Titel, Beschreibung, Alt-Text, Schlagwörter und Autor. Der Editor ist noch nicht im Browser getestet.

## Foto-Metadaten im Admin

Im Admin gibt es den Menüpunkt „Foto-Metadaten“. Dort gibst du die Route einer Seite an (z. B. `/fotos/album-1`). Es werden alle Bilder dieser Seite mit einem Formular pro Bild angezeigt. Beim Speichern entstehen die Sidecars:

- Dateiname: `<bild>.<ext>.meta.yaml` neben dem Bild, z. B. `foto.jpg.meta.yaml`. Grav liest diese Dateien automatisch.
- Geschrieben werden nur die Felder `title`, `description`, `alt`, `keywords` und `author`. Andere Schlüssel in der Datei bleiben erhalten.
- Ein leeres Feld entfernt den Schlüssel. Ist danach nichts mehr übrig, wird die Datei gelöscht.

## Geplante Funktionen

- Bearbeitung weiterer `meta.yaml`-Felder und der EXIF-Felder.

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
