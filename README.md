# Baqless, Website-Prototyp

**Live:** https://leitung-gif.github.io/baqless-prototype/

Interaktiver Prototyp für den Baqless-Relaunch im DACH-Raum, dreisprachig.
Jede Seite ist eine eigenständige HTML-Datei: Bilder, Videos und Schriften sind
als Data-URI eingebettet, es braucht keinen Server und keine Abhängigkeiten.

Verbindlich ist das Handbuch der Marke, Fassung 3.0, unter
`02 Kunden\Baqless\Baqless-CI-Handbuch.pdf`.

## Sprachfassungen

| Sprache | Pfad | Märkte |
|---|---|---|
| Deutsch | `/` | Schweiz, Deutschland, Österreich, Liechtenstein |
| Englisch | `/en/` | alle übrigen Märkte |
| Französisch | `/fr/` | Frankreich, Westschweiz |

Das ist genau die Mechanik, mit der Shopify Sprachfassungen bedient: gleicher
Dateiname, Präfix im Pfad. Jede Seite trägt `canonical`, `hreflang` für alle drei
Sprachen und `x-default`. Die Sitemap führt alle 45 URLs.

Es gibt **keine automatische Weiterleitung** nach Browsersprache. Sie verwirrt
Besucherinnen, die bewusst eine Fassung gewählt haben, und behindert Suchmaschinen.
Der Umschalter im Kopf wechselt und behält dabei Seite, Filter und Sprungmarke.

## Bauen

```
node src/build.mjs            baut alle drei Fassungen und die Sitemap
node src/i18n-pruef.mjs       prüft die Wörterbücher gegen das deutsche Original
node src/i18n-zusammenfuegen.mjs   führt übersetzte Bruchstücke zusammen
```

Fehlt ein Schlüssel in `en` oder `fr`, setzt der Bau den deutschen Text ein und
nennt den Schlüssel beim Namen. Es wird nie eine Lücke ausgeliefert.

## Struktur

```
src/pages/        die 15 Seiten mit {{t:schluessel}}
src/partials/     Kopf, Fuss, Warenkorbschublade, shared.js
src/i18n/         de.json, en.json, fr.json und GLOSSAR.md
src/data/         products.json, stimmen.json, mehrsprachige Felder als {de,en,fr}
src/build.mjs     Bau: Bausteine, Sprache, Assets, Sitemap
```

`src/i18n/GLOSSAR.md` ist verbindlich: Begriffe, nachgedichtete Claims, verbotene
Aussagen, Zeichensetzung je Sprache. Wer übersetzt, liest zuerst dort.

## Texte ändern

Nie in den gebauten Dateien im Wurzelverzeichnis, die werden überschrieben.
Ein sichtbarer Text steht in `src/i18n/<sprache>.json`. Im JavaScript holt ihn
`txt('schluessel')`, Mehrzahl über `txtN('schluessel', n)` mit den Formen
`.eins` und `.viele`. Französisch stellt auch die Null in den Singular, das
entscheidet die Laufzeit selbst.

## Tests

```
python -m http.server 8123
```

- `test-smoke.html`, 200 Prüfungen: Kaufweg, Varianten, Warenkorb, Kasse, Zugänglichkeit
- `test-i18n.html`, 85 Prüfungen: alle drei Fassungen, Glossar-Begriffe, hreflang,
  fehlende Schlüssel, Mehrzahl, Sprachwechsel, verbotene Aussagen

Beide laufen auch ohne Fenster:

```
chrome --headless=new --virtual-time-budget=400000 --dump-dom http://localhost:8123/test-smoke.html
```

## Was Platzhalter ist

Preise, die Gratisversand-Schwelle, Versandtarife, Impressum-Daten und die
Rechtstexte. Die Rechtsseiten sind übersetzt, aber **nicht juristisch freigegeben**:
in Frankreich gilt das EU-Widerrufsrecht mit vierzehn Tagen, in der Schweiz gibt es
im Fernabsatz kein gesetzliches Widerrufsrecht. Dieselbe Seite kann darum nicht
dasselbe behaupten. Vor dem Livegang braucht es eine Prüfung je Markt.

Der Warenkorb und die Kasse arbeiten vollständig, aber ohne Anbindung. Es wird
nichts bestellt und nichts bezahlt.

© 2026 Baqless · Prototyp: Lorien Group, Aarau
