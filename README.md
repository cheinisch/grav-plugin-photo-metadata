# Photo Metadata (Grav-Plugin)

Bildmetadaten direkt im Admin bearbeiten und die Anzeige von EXIF- und GPS-Daten steuern.

## Status

Frühe Version 0.1.1. Das Plugin stellt die Einstellungen bereit, auch pro Seite überschreibbar. Die Bearbeitung der Metadaten ist geplant.

## Geplante Funktionen

- Eigene Admin-Seite mit einer Liste der Bilder eines Albums oder Portfolios und einem Formular pro Bild.
- Bearbeitung aller Felder der `meta.yaml` neben dem Bild, also Titel, Beschreibung, Schlagwörter, Autor und die EXIF-Felder.

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
