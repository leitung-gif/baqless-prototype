/**
 * Benennt kontakt.danach.eins/zwei/drei in .s1/.s2/.s3 um.
 *
 *   node src/kontakt-schritte-umbenennen.mjs
 *
 * Die Endung .eins ist im Sprachwerk fuer Mehrzahlformen reserviert, zusammen mit .viele.
 * Hier meinte sie aber «erster Schritt». Der Wortpruefer hat das zu Recht als Fehler
 * gemeldet: sechs andere Schluessel auf .eins sind echte Mehrzahlpaare, dieser eine war
 * es nicht. Statt den Pruefer zu lockern, bekommt der Schluessel einen Namen, der nicht
 * mit einer reservierten Endung kollidiert.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const UM = [
  ['kontakt.danach.eins', 'kontakt.danach.s1'],
  ['kontakt.danach.zwei', 'kontakt.danach.s2'],
  ['kontakt.danach.drei', 'kontakt.danach.s3'],
];

for (const sp of ['de', 'en', 'fr']) {
  const p = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(p, 'utf8'));
  for (const [alt, neu] of UM) {
    if (!(alt in w)) { console.error(`ABBRUCH: ${sp}: ${alt} fehlt`); process.exit(1); }
    if (neu in w) { console.error(`ABBRUCH: ${sp}: ${neu} gibt es schon`); process.exit(1); }
    w[neu] = w[alt];
    delete w[alt];
  }
  const sortiert = Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]]));
  writeFileSync(p, JSON.stringify(sortiert, null, 1) + '\n', 'utf8');
  console.log(`${sp}.json: 3 Schluessel umbenannt, ${Object.keys(sortiert).length} gesamt`);
}

const seite = join(root, 'pages', 'kontakt.html');
let s = readFileSync(seite, 'utf8');
for (const [alt, neu] of UM) {
  const marke = `{{t:${alt}}}`;
  const n = s.split(marke).length - 1;
  if (n !== 1) { console.error(`ABBRUCH: ${marke} kommt ${n} mal vor`); process.exit(1); }
  s = s.replace(marke, `{{t:${neu}}}`);
}
writeFileSync(seite, s, 'utf8');
console.log('pages/kontakt.html: 3 Verweise nachgezogen');

// Auch das Bruchstueck nachziehen, damit ein zweiter Lauf nichts zurueckdreht
const bruch = join(root, 'i18n', 'neu', 'service.json');
let b = readFileSync(bruch, 'utf8');
let getroffen = 0;
for (const [alt, neu] of UM) {
  const vor = b;
  b = b.split(`"${alt}"`).join(`"${neu}"`);
  if (b !== vor) getroffen++;
}
if (getroffen) {
  writeFileSync(bruch, b, 'utf8');
  console.log(`i18n/neu/service.json: ${getroffen} Schluessel nachgezogen`);
}
