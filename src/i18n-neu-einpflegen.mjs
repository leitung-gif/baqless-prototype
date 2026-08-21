/**
 * Pflegt die Bruchstuecke aus src/i18n/neu/ in die drei Woerterbuecher ein.
 *
 *   node src/i18n-neu-einpflegen.mjs
 *
 * Erwartetes Format je Datei:  { "schluessel": { "de": …, "en": …, "fr": … } }
 * Der Wert je Sprache ist entweder eine Zeichenkette oder ein Mehrzahlpaar
 * { "eins": …, "viele": … }.
 *
 * Der eine bekannte Konflikt wird hier ausdruecklich entschieden, nicht der
 * Dateireihenfolge ueberlassen. Jeder weitere Konflikt bricht ab.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const i18n = join(root, 'i18n');
const SPRACHEN = ['de', 'en', 'fr'];

const lies = p => JSON.parse(readFileSync(p, 'utf8'));
const schreib = (p, o) => writeFileSync(p, JSON.stringify(o, null, 1) + '\n', 'utf8');
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- Entschiedene Konflikte ----------
// start.nachkauf.zwei_text stand in quer.json und in start.json verschieden.
// Der deutsche Satzbau aus start.json ist natuerlicher («in die Schweiz, nach
// Deutschland» statt «die Schweiz beliefern wir»), die zweite Haelfte aus quer.json
// ist deutlicher («ist der Versand gratis» statt eines ausgelassenen Verbs).
// Genommen wird von jeder Fassung die bessere Haelfte.
const ENTSCHIEDEN = {
  'start.nachkauf.zwei_text': {
    de: 'Wir liefern aus zwei Lagern. In die Schweiz, nach Deutschland, Österreich, '
      + 'Liechtenstein, Frankreich und Italien geht es aus der Schweiz, in alle übrigen '
      + 'Länder aus Japan. Ab CHF 99 Bestellwert ist der Versand gratis, darunter gilt '
      + 'eine Pauschale, die du im Warenkorb siehst. Jede Bestellung kommt in der '
      + 'Baqless Verpackung.',
    en: 'We ship from two warehouses. Switzerland, Germany, Austria, Liechtenstein, '
      + 'France and Italy are served from Switzerland, all other countries from Japan. '
      + 'Shipping is free from an order value of CHF 99, below that a flat rate applies, '
      + 'which you see in your cart. Every order arrives in the Baqless packaging.',
    fr: 'Nous expédions depuis deux entrepôts. La Suisse, l’Allemagne, l’Autriche, '
      + 'le Liechtenstein, la France et l’Italie sont livrés depuis la Suisse, tous les '
      + 'autres pays depuis le Japon. La livraison est offerte dès CHF 99 de commande, '
      + 'en dessous un forfait s’applique, visible dans le panier. Chaque commande '
      + 'arrive dans l’emballage Baqless.',
  },
};

// ---------- Bruchstuecke einlesen ----------
const neuOrdner = join(i18n, 'neu');
const gesammelt = {};
const herkunft = {};
const konflikte = [];
let dateien = 0;

for (const f of readdirSync(neuOrdner).filter(x => x.endsWith('.json')).sort()) {
  const d = lies(join(neuOrdner, f));
  dateien++;
  for (const [k, v] of Object.entries(d)) {
    if (k in gesammelt && !gleich(gesammelt[k], v) && !(k in ENTSCHIEDEN)) {
      konflikte.push([k, herkunft[k], f]);
    }
    gesammelt[k] = v;
    herkunft[k] = f;
  }
}
Object.assign(gesammelt, ENTSCHIEDEN);
for (const k of Object.keys(ENTSCHIEDEN)) herkunft[k] = 'entschieden';

if (konflikte.length) {
  console.error(`ABBRUCH: ${konflikte.length} unentschiedene Konflikte`);
  for (const [k, a, b] of konflikte) console.error(`   ${k}  (${a} gegen ${b})`);
  process.exit(1);
}

// ---------- Vollstaendigkeit je Sprache ----------
const luecken = [];
for (const [k, v] of Object.entries(gesammelt)) {
  for (const sp of SPRACHEN) {
    if (v[sp] === undefined || v[sp] === null || v[sp] === '') luecken.push(`${k} [${sp}]`);
  }
}
if (luecken.length) {
  console.error(`ABBRUCH: ${luecken.length} Luecken`);
  for (const l of luecken.slice(0, 30)) console.error('   ' + l);
  process.exit(1);
}

// ---------- Einpflegen ----------
const zahlen = {};
for (const sp of SPRACHEN) {
  const pfad = join(i18n, `${sp}.json`);
  const w = lies(pfad);
  const vorher = Object.keys(w).length;
  let neu = 0, ersetzt = 0;
  for (const [k, v] of Object.entries(gesammelt)) {
    if (k in w) { if (!gleich(w[k], v[sp])) ersetzt++; } else neu++;
    w[k] = v[sp];
  }
  const sortiert = Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]]));
  schreib(pfad, sortiert);
  zahlen[sp] = { vorher, neu, ersetzt, nachher: Object.keys(sortiert).length };
}

console.log(`Bruchstuecke: ${dateien} Dateien, ${Object.keys(gesammelt).length} Schluessel`);
for (const sp of SPRACHEN) {
  const z = zahlen[sp];
  console.log(`  ${sp}.json  ${z.vorher} -> ${z.nachher}   (${z.neu} neu, ${z.ersetzt} ersetzt)`);
}

// ---------- Gegenprobe: gleiche Schluesselmenge ----------
const mengen = SPRACHEN.map(sp => new Set(Object.keys(lies(join(i18n, `${sp}.json`)))));
const [a, b, c] = mengen;
const abw = [...a].filter(k => !b.has(k) || !c.has(k))
  .concat([...b].filter(k => !a.has(k)))
  .concat([...c].filter(k => !a.has(k)));
if (abw.length) {
  console.error(`\nABBRUCH: ${abw.length} Schluessel nicht in allen drei Sprachen`);
  for (const k of [...new Set(abw)].slice(0, 30)) console.error('   ' + k);
  process.exit(1);
}
console.log(`\nAlle drei Woerterbuecher: ${a.size} Schluessel, gleiche Menge.`);
