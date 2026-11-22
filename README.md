# Photo Metadata (Grav-Plugin)

Bildmetadaten direkt im Admin bearbeiten und die Anzeige von EXIF- und GPS-Daten steuern.

## Status

Frühe Version 0.1.0. Bisher stellt das Plugin nur die Einstellungen bereit. Die Bearbeitung der Metadaten ist geplant.

## Geplante Funktionen

- Eigene Admin-Seite mit einer Liste der Bilder eines Albums oder Portfolios und einem Formular pro Bild.
- Bearbeitung aller Felder der `meta.yaml` neben dem Bild, also Titel, Beschreibung, Schlagwörter, Autor und die EXIF-Felder.
- Schalter für EXIF und GPS, global in der Plugin-Konfiguration und pro Seite überschreibbar.

## Einstellungen

| Schlüssel | Standard | Bedeutung |
|---|---|---|
| `enabled` | `true` | Plugin aktiv |
| `show_exif` | `true` | EXIF-Daten auf Fotoseiten anzeigen |
| `show_gps` | `false` | GPS-Position anzeigen (mit OpenStreetMap-Karte) |

## Verwendung im Theme

Das Plugin setzt die Variable `photo_metadata` für alle Templates:

```twig
{% if photo_metadata.show_exif %}
  {# EXIF-Liste anzeigen #}
{% endif %}
```

## Installation

Über den Admin oder manuell: Den Ordner `photo-metadata` nach `user/plugins/` kopieren.

## Lizenz

AGPL-3.0, siehe `LICENSE`.
