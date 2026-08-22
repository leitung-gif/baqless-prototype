/**
 * Setzt die Gratisversand-Schwelle von CHF 99 auf CHF 120.
 *
 *   node src/versandschwelle-120.mjs
 *
 * WARUM: Das unterzeichnete Angebot nennt an drei Stellen CHF 120, der
 * Implementierungsplan fuehrt sie ausdruecklich als zu testende Schwelle. Der Shop
 * rechnete mit 99, in fuenfzehn Stellen, darunter die AGB. Ein Prototyp, der dem
 * unterschriebenen Angebot in seinen eigenen Geschaeftsbedingungen widerspricht,
 * ist an dieser Stelle falsch, egal wie gut die Begruendung war.
 *
 * Die Begruendung war: zwei Einzelohren zu 59 ergaben 118 und verfehlten 120 knapp.
 * Bei den heutigen Preisen traegt sie nicht mehr, und 99 hat eine eigene, schlimmere
 * Falle:
 *
 *   teuerstes Paar 95, Schwelle 99            -> vier Franken daneben
 *   Schwelle 120: 81 Prozent aller Zweikaeufe raeumen sie
 *   Schwelle  99: 100 Prozent, aber kein einziges Einzelstueck
 *
 * Wer das teuerste Stueck kauft, verfehlt bei 99 den Gratisversand um vier Franken.
 * Das ist die schlechteste denkbare Platzierung. Vertrag und Gestaltung zeigen hier
 * in dieselbe Richtung.
 *
 * Die Zahl bleibt ein Platzhalter, bis Baqless sie bestaetigt.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const ALT = 99, NEU = 120;
let fehler = 0;

// ---------- 1. Die Rechenkonstante ----------
const shared = join(root, 'partials', 'shared.js');
let s = readFileSync(shared, 'utf8');
const konst = `const FREE_SHIP = ${ALT};`;
if (s.includes(konst)) {
  s = s.replace(konst, `const FREE_SHIP = ${NEU};`);
  writeFileSync(shared, s, 'utf8');
  console.log(`   ok  shared.js: FREE_SHIP ${ALT} -> ${NEU}`);
} else if (s.includes(`const FREE_SHIP = ${NEU};`)) {
  console.log('   schon gesetzt: shared.js');
} else { console.error('ABBRUCH: FREE_SHIP nicht gefunden'); fehler++; }

// ---------- 2. Die strukturierten Daten ----------
const pdp = join(root, 'pages', 'produkt.html');
let p = readFileSync(pdp, 'utf8');
const schema = `freeShippingThreshold: {'@type': 'MonetaryAmount', value: ${ALT}, currency: 'CHF'}`;
if (p.includes(schema)) {
  p = p.replace(schema, schema.replace(`value: ${ALT}`, `value: ${NEU}`));
  writeFileSync(pdp, p, 'utf8');
  console.log(`   ok  produkt.html: strukturierte Daten ${ALT} -> ${NEU}`);
} else { console.log('   schon gesetzt oder nicht gefunden: produkt.html'); }

// ---------- 3. Die Woerterbuecher ----------
// Nur die 99, die als Betrag neben CHF steht. Keine Prozentzahl, kein Jahr, keine SKU.
const ZAHL = /(CHF\s*)99\b/g;
const ZAHL_NACH = /\b99(\s*(?:CHF|Fr\.))/g;
for (const sp of ['de', 'en', 'fr']) {
  const pfad = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(pfad, 'utf8'));
  let n = 0, offen = [];
  for (const [k, v] of Object.entries(w)) {
    if (typeof v !== 'string') continue;
    const neu = v.replace(ZAHL, `$1${NEU}`).replace(ZAHL_NACH, `${NEU}$1`);
    if (neu !== v) { w[k] = neu; n++; }
    else if (/(?<![0-9])99(?![0-9])/.test(v)) offen.push(k);
  }
  writeFileSync(pfad, JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]])), null, 1) + '\n', 'utf8');
  console.log(`   ok  ${sp}.json: ${n} Schluessel${offen.length ? `, ${offen.length} mit 99 ohne Waehrung: ${offen.join(', ')}` : ''}`);
}

if (fehler) process.exit(1);
console.log('');
console.log('Schwelle steht auf CHF 120, wie im Angebot. Bleibt Platzhalter bis zur Bestaetigung.');
