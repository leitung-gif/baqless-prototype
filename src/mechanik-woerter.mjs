/**
 * Traegt die sieben neuen Schluessel der Mechanik-Zeichnung ein.
 *
 *   node src/mechanik-woerter.mjs
 *
 * Der Wortschatz ist nicht neu erfunden, sondern aus den vorhandenen Schluesseln
 * uebernommen: Rueckteil/back/poussoir, Stift/post/tige, Vierteldrehung/quarter
 * turn/quart de tour, Ohrlaeppchen/earlobe/lobe.
 *
 * Schritt 1 und 2 sind Handlungen, Schritt 3 ist das Ergebnis. Dieser Bruch ist
 * gewollt und in allen drei Sprachen derselbe.
 *
 * Die franzoesischen Werte kommen ohne Apostroph aus. Das Woerterbuch fuehrt an
 * 579 Stellen den geraden und an 10 den typografischen; diese Uneinheitlichkeit
 * gehoert bereinigt, aber nicht nebenbei und nicht von mir allein.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const NEU = {
  'start.mechanik.schnitt':    ['Schnitt durchs Ohrläppchen', 'Cross-section through the earlobe', 'Coupe à travers le lobe'],
  'start.mechanik.mm':         ['rund 4 mm', 'about 4 mm', 'environ 4 mm'],
  'start.mechanik.s1':         ['durchstecken', 'push it through', 'insérer'],
  'start.mechanik.vorher_s2':  ['Rückteil aufstecken', 'add the back', 'ajouter le poussoir'],
  'start.mechanik.vorher_s3':  ['es löst sich', 'it works loose', 'il se détache'],
  'start.mechanik.nachher_s2': ['Vierteldrehung', 'quarter turn', 'quart de tour'],
  'start.mechanik.nachher_s3': ['klick, es sitzt', 'click, it holds', 'clic, ça tient'],
};

// Was der Pruefer ohnehin bemaengeln wuerde, faellt hier schon auf.
const VERBOTEN = [[/[—–]/, 'Gedankenstrich'], [/ß/, 'Eszett'], [/"/, 'gerades Anfuehrungszeichen']];
let fehler = 0;
for (const [k, werte] of Object.entries(NEU)) {
  const [de, en, fr] = werte;
  for (const [i, t] of werte.entries()) {
    for (const [m, was] of VERBOTEN)
      if (m.test(t)) { console.error(`   FEHLER ${k} [${'de en fr'.split(' ')[i]}]: ${was}`); fehler++; }
  }
  if (en === de || fr === de) { console.error(`   FEHLER ${k}: Uebersetzung gleich dem Deutschen`); fehler++; }
}
if (fehler) process.exit(1);

for (const [i, sp] of ['de', 'en', 'fr'].entries()) {
  const pfad = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(pfad, 'utf8'));
  let neu = 0, schon = 0;
  for (const [k, werte] of Object.entries(NEU)) {
    if (k in w) { schon++; continue; }
    w[k] = werte[i]; neu++;
  }
  const sortiert = Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]]));
  writeFileSync(pfad, JSON.stringify(sortiert, null, 1) + '\n', 'utf8');
  console.log(`   ok  ${sp}.json: ${neu} neu${schon ? `, ${schon} standen schon` : ''}, ${Object.keys(w).length} gesamt`);
}
console.log('');
console.log('Sieben Schluessel in drei Sprachen.');
