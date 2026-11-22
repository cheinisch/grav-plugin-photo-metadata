# Agenten-Hinweise

Dieses Dokument richtet sich an KI-Agenten, die an dem Grav-Plugin „Photo Metadata“ arbeiten.

## Grundregeln

- Antworte und schreibe Dokumentation auf Deutsch.
- Ändere nur, was die Aufgabe verlangt.
- Lösche keine Dateien und keine Branches ohne ausdrückliche Anweisung.
- Tags, Releases, Commits und Pushes nur auf ausdrückliche Anweisung.

## Vorgehen

1. Vor einer Änderung die `README.md` lesen.
2. Die Plugin-Datei heißt wie der Slug (`photo-metadata.php`). Die Klasse heißt `PhotoMetadataPlugin`.
3. Änderungen mit einer kurzen, beschreibenden Commit-Nachricht festhalten.

## Technische Regeln

- Metadaten liegen in der `meta.yaml` neben dem Bild, nicht in der Seite.
- Die Version steht in `blueprints.yaml`.
