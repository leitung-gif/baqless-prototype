# Baqless — Website-Prototyp

**Live:** https://leitung-gif.github.io/baqless-prototype/

Interaktiver Prototyp für den Baqless-Relaunch gemäss Brand Identity v1.0 (Juni 2026).
Eine einzige selbständige HTML-Datei — alle Bilder, Videos und Fonts sind eingebettet.

## Highlights
- Interaktive Click-Lock-Demo (Herzstück: der patentierte Verschluss als Animation)
- Bubble-Animation im Hero (klickbar), statische Brand-Bubbles im Hintergrund
- Zwei KI-generierte Produkt-Loops (Higgsfield, aus Original-Fotos)
- Produkt-Rail mit Hover-Detailansicht, Warenkorb-Demo, WA-Luxury-Kapitel

## Struktur
- `index.html` — gebauter Prototyp (self-contained, ~2.7 MB)
- `src/site.html` — Quelltext mit `{{token}}`-Platzhaltern
- `src/build.mjs` — Build-Script (bettet Bilder/Videos/Fonts als Data-URIs ein)

## Hinweise
- Preise sind Platzhalter («Ab CHF 49» gemäss Identity)
- Warenkorb & Checkout sind Demo-Funktionen ohne Backend

© 2026 Baqless · Prototyp: Lorien Group Güzelsahin
