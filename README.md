# J6 Assistant

A mobile-first static web app for browsing Roland J-6 chord sets.

The app loads `data/roland_j6_chord_sets.csv`, shows each preset set with all 12 chords, displays the exact voiced notes from the source data, and plays each chord when tapped.

## Local Use

Serve the folder with any static file server:

```bash
python3 -m http.server 8008
```

Then open `http://localhost:8008`.

## Publishing

This repo is designed to publish from the repository root on GitHub Pages.

## Git Hook

The repository uses a tracked pre-commit hook in `.githooks/pre-commit`. Enable it locally with:

```bash
git config core.hooksPath .githooks
```
