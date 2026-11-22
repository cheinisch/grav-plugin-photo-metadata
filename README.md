# Photo Metadata (Grav-Plugin)

Bildmetadaten direkt im Admin bearbeiten und die Anzeige von EXIF- und GPS-Daten steuern.

## Status

Version für Grav 2 mit Admin2. Der klassische Admin wird nicht unterstützt.

## Voraussetzungen

- Grav `>= 2.0.0`
- API-Plugin `>= 1.0.0`
- Admin2 `>= 1.0.0`

## Geplante Funktionen

- EXIF-Werte im Admin2 bearbeiten. Die Werte werden als Überschreibung in der `.meta.yaml` neben dem Bild gespeichert, die Bilddatei bleibt unverändert.

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
