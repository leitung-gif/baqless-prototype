/**
 * Prueft die Bruchstuecke in src/i18n/neu/ gegen das, was die Seiten wirklich anfordern.
 *
 *   node src/i18n-neu-pruefen.mjs
 *
 * Die Wahrheit steht nicht in den Bruchstuecken, sondern in den Vorlagen: jeder Schluessel,
 * der als {{t:...}} in einer Seite oder einem Teilstueck steht, oder der zur Laufzeit ueber
 * txt() und txtN() geholt wird, muss danach im Woerterbuch sein. Alles andere ist tot.
 *
 * Ausgabe, ohne etwas zu aendern:
 *   - angefordert, aber nirgends vorhanden          -> die Seite bliebe leer
 *   - vorhanden, aber nie angefordert               -> toter Text
 *   - in zwei Bruchstuecken verschieden definiert   -> Konflikt, muss entschieden werden
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const lies = p => JSON.parse(readFileSync(p, 'utf8'));

// ---------- 1. Was die Vorlagen anfordern ----------
const angefordert = new Map();          // schluessel -> Set(datei)
const merken = (k, wo) => {
  if (!angefordert.has(k)) angefordert.set(k, new Set());
  angefordert.get(k).add(wo);
};

const vorlagen = [];
for (const ordner of ['pages', 'partials']) {
  const p = join(root, ordner);
  if (!existsSync(p)) continue;
  for (const f of readdirSync(p)) {
    if (f.endsWith('.html') || f.endsWith('.js')) vorlagen.push([join(p, f), `${ordner}/${f}`]);
  }
}

for (const [pfad, name] of vorlagen) {
  const s = readFileSync(pfad, 'utf8');
  for (const m of s.matchAll(/\{\{t:([A-Za-z0-9_.\-]+)\}\}/g)) merken(m[1], name);
  // Laufzeitaufrufe: txt('x'), txtN("y", n), txt(`z`)
  for (const m of s.matchAll(/\btxtN?\(\s*['"`]([A-Za-z0-9_.\-]+)['"`]/g)) merken(m[1], name);
}

// txtN braucht Mehrzahlpaare
const mehrzahl = new Set();
for (const [pfad] of vorlagen) {
  const s = readFileSync(pfad, 'utf8');
  for (const m of s.matchAll(/\btxtN\(\s*['"`]([A-Za-z0-9_.\-]+)['"`]/g)) mehrzahl.add(m[1]);
}

// ---------- 2. Was vorhanden ist ----------
const de = lies(join(root, 'i18n', 'de.json'));
const neuOrdner = join(root, 'i18n', 'neu');
const bruch = {};
const konflikt = new Map();             // schluessel -> [[datei, wert], ...]

for (const f of readdirSync(neuOrdner).filter(x => x.endsWith('.json')).sort()) {
  const d = lies(join(neuOrdner, f));
  for (const [k, v] of Object.entries(d)) {
    if (k in bruch) {
      const alt = JSON.stringify(bruch[k].wert);
      if (alt !== JSON.stringify(v)) {
        if (!konflikt.has(k)) konflikt.set(k, [[bruch[k].datei, bruch[k].wert]]);
        konflikt.get(k).push([f, v]);
      }
    }
    bruch[k] = { datei: f, wert: v };
  }
}

// Praefix quer. aufloesen: quer.X meint den Schluessel X
const aufgeloest = {};
for (const [k, e] of Object.entries(bruch)) {
  const echt = k.startsWith('quer.') ? k.slice(5) : k;
  aufgeloest[echt] = e;
}

const vorhandenNachher = new Set([...Object.keys(de), ...Object.keys(aufgeloest)]);

// ---------- 3. Bericht ----------
const fehlt = [...angefordert.keys()].filter(k => !vorhandenNachher.has(k)).sort();
const tot = [...Object.keys(aufgeloest)].filter(k => !angefordert.has(k)).sort();
const ueberschrieben = [...Object.keys(aufgeloest)].filter(k => k in de).sort();
const neu = [...Object.keys(aufgeloest)].filter(k => !(k in de)).sort();

console.log(`Vorlagen gelesen: ${vorlagen.length}`);
console.log(`Angeforderte Schluessel: ${angefordert.size}`);
console.log(`Im Woerterbuch heute: ${Object.keys(de).length}`);
console.log(`In den Bruchstuecken: ${Object.keys(aufgeloest).length}  (${neu.length} neu, ${ueberschrieben.length} ersetzen bestehende)`);
console.log('');

if (konflikt.size) {
  console.log(`KONFLIKT: ${konflikt.size} Schluessel in mehreren Bruchstuecken verschieden definiert`);
  for (const [k, liste] of konflikt) {
    console.log(`  ${k}`);
    for (const [f, v] of liste) console.log(`     ${f.padEnd(26)} ${JSON.stringify(v.de ?? v).slice(0, 96)}`);
  }
  console.log('');
}

if (fehlt.length) {
  console.log(`FEHLT: ${fehlt.length} angeforderte Schluessel gibt es nirgends`);
  for (const k of fehlt) console.log(`  ${k.padEnd(44)} verlangt von ${[...angefordert.get(k)].join(', ')}`);
  console.log('');
}

if (tot.length) {
  console.log(`TOT: ${tot.length} Schluessel in den Bruchstuecken, die keine Vorlage anfordert`);
  for (const k of tot) console.log(`  ${k.padEnd(44)} aus ${aufgeloest[k].datei}`);
  console.log('');
}

if (ueberschrieben.length) {
  console.log(`ERSETZT ${ueberschrieben.length} bestehende Schluessel:`);
  for (const k of ueberschrieben) console.log(`  ${k.padEnd(44)} aus ${aufgeloest[k].datei}`);
  console.log('');
}

// Mehrzahlpaare
const ohnePaar = [...mehrzahl].filter(k => {
  const q = aufgeloest[k]?.wert ?? de[k];
  if (!q) return false;
  const d = q.de ?? q;
  return !(d && typeof d === 'object' && 'eins' in d && 'viele' in d);
}).sort();
if (ohnePaar.length) {
  console.log(`MEHRZAHL: ${ohnePaar.length} mit txtN geholte Schluessel ohne eins/viele-Paar`);
  for (const k of ohnePaar) console.log(`  ${k}`);
  console.log('');
}

// Sprachvollstaendigkeit
const unvollstaendig = Object.entries(aufgeloest)
  .filter(([, e]) => !(e.wert && e.wert.de !== undefined && e.wert.en !== undefined && e.wert.fr !== undefined))
  .map(([k, e]) => `${k} (${e.datei})`).sort();
if (unvollstaendig.length) {
  console.log(`UNVOLLSTAENDIG: ${unvollstaendig.length} Schluessel ohne alle drei Sprachen`);
  for (const k of unvollstaendig.slice(0, 40)) console.log(`  ${k}`);
  console.log('');
}

const schlimm = konflikt.size + fehlt.length + unvollstaendig.length + ohnePaar.length;
console.log(schlimm ? `Zu entscheiden: ${schlimm}` : 'Nichts zu entscheiden, kann zusammengefuehrt werden.');
process.exit(schlimm ? 1 : 0);
