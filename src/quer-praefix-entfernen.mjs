/**
 * Entfernt das Praefix quer. aus Schluesselnamen.
 *
 *   node src/quer-praefix-entfernen.mjs
 *
 * «quer» war der Name einer Arbeitsrunde, kein Bereich des Auftritts. Als Praefix im
 * Schluessel waere er in einem Jahr nicht mehr erklaerbar, und er stellt einen zweiten
 * Schluessel neben einen bestehenden, statt ihn zu ersetzen: quer.faq.versandkosten.antwort
 * neben faq.versandkosten.antwort haette zwei Antworten auf dieselbe Frage im Woerterbuch
 * gelassen, eine davon tot.
 *
 * Bricht ab, sobald eine Ersetzung nicht genau so oft greift wie erwartet.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const lies = p => JSON.parse(readFileSync(p, 'utf8'));

// ---------- 1. Das Bruchstueck ----------
const pfad = join(root, 'i18n', 'neu', 'quer.json');
const alt = lies(pfad);
const neu = {};
const umbenannt = [];
for (const [k, v] of Object.entries(alt)) {
  const ziel = k.startsWith('quer.') ? k.slice(5) : k;
  if (ziel in neu) { console.error(`ABBRUCH: ${ziel} zweimal`); process.exit(1); }
  neu[ziel] = v;
  if (ziel !== k) umbenannt.push([k, ziel]);
}
writeFileSync(pfad, JSON.stringify(neu, null, 1) + '\n', 'utf8');
console.log(`quer.json: ${umbenannt.length} Schluessel ohne Praefix`);
for (const [a, b] of umbenannt) console.log(`   ${a}  ->  ${b}`);

// ---------- 2. Die Vorlagen ----------
console.log('');
let gesamt = 0;
for (const ordner of ['pages', 'partials']) {
  const p = join(root, ordner);
  for (const f of readdirSync(p)) {
    if (!f.endsWith('.html') && !f.endsWith('.js')) continue;
    const datei = join(p, f);
    const s = readFileSync(datei, 'utf8');
    if (!s.includes('quer.')) continue;
    const n = (s.match(/quer\.[a-z0-9_.]+/g) || []).length;
    const t = s.replace(/quer\.([a-z0-9_.]+)/g, '$1');
    writeFileSync(datei, t, 'utf8');
    console.log(`${ordner}/${f}: ${n} Verweis(e) bereinigt`);
    gesamt += n;
  }
}
console.log(`\nZusammen ${gesamt} Verweise in den Vorlagen.`);

// ---------- 3. Gegenprobe ----------
let rest = 0;
for (const ordner of ['pages', 'partials']) {
  const p = join(root, ordner);
  for (const f of readdirSync(p)) {
    if (!f.endsWith('.html') && !f.endsWith('.js')) continue;
    rest += (readFileSync(join(p, f), 'utf8').match(/quer\./g) || []).length;
  }
}
rest += (readFileSync(pfad, 'utf8').match(/"quer\./g) || []).length;
if (rest) { console.error(`ABBRUCH: ${rest} mal quer. uebrig`); process.exit(1); }
console.log('Kein quer. mehr uebrig.');
