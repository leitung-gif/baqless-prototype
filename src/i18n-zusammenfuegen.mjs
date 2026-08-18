/**
 * Fuegt die uebersetzten Bruchstuecke zu den Woerterbuechern zusammen und macht die
 * Produktdaten mehrsprachig.
 *
 *   node src/i18n-zusammenfuegen.mjs
 *
 * Aus src/i18n/uebersetzung/<sprache>/*.json entstehen src/i18n/en.json und fr.json.
 * In products.json und stimmen.json werden die uebersetzbaren Felder zu Objekten
 * {de, en, fr}. Ein Feld, das schon ein solches Objekt ist, wird ergaenzt, nie ueberschrieben,
 * damit ein zweiter Lauf nichts kaputt macht.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const i18n = join(root, 'i18n');
const SPRACHEN = ['en', 'fr'];
const DATENDATEIEN = new Set(['products.json', 'stimmen.json']);

const lies = p => JSON.parse(readFileSync(p, 'utf8'));
const schreib = (p, o) => writeFileSync(p, JSON.stringify(o, null, 1) + '\n', 'utf8');

// ---------- Woerterbuecher ----------
const de = lies(join(i18n, 'de.json'));
for (const sp of SPRACHEN) {
  const ordner = join(i18n, 'uebersetzung', sp);
  if (!existsSync(ordner)) { console.log(`${sp}: kein Ordner uebersetzung/${sp}, uebersprungen`); continue; }
  const zusammen = {};
  let dateien = 0;
  for (const f of readdirSync(ordner)) {
    if (!f.endsWith('.json') || DATENDATEIEN.has(f)) continue;
    Object.assign(zusammen, lies(join(ordner, f)));
    dateien++;
  }
  const fehlend = Object.keys(de).filter(k => !(k in zusammen));
  const fremd = Object.keys(zusammen).filter(k => !(k in de));
  for (const k of fremd) delete zusammen[k];
  schreib(join(i18n, `${sp}.json`), Object.fromEntries(Object.keys(zusammen).sort().map(k => [k, zusammen[k]])));
  console.log(`${sp}.json: ${Object.keys(zusammen).length} Schluessel aus ${dateien} Dateien`
    + (fehlend.length ? `, ${fehlend.length} fehlen noch` : '')
    + (fremd.length ? `, ${fremd.length} unbekannte entfernt` : ''));
  if (fehlend.length) console.log(`   fehlend: ${fehlend.slice(0, 10).join(', ')}${fehlend.length > 10 ? ' …' : ''}`);
}

// ---------- Produktdaten ----------
/** Macht aus einem Wert ein Sprachobjekt, ohne vorhandene Sprachen zu verlieren. */
function mehrsprachig(vorhanden, sprache, wert) {
  const ist = (vorhanden && typeof vorhanden === 'object' && !Array.isArray(vorhanden))
    ? { ...vorhanden } : { de: vorhanden };
  if (wert !== undefined && wert !== null && wert !== '') ist[sprache] = wert;
  return ist;
}

const produktFelder = ['desc', 'materials', 'care', 'variant', 'tag', 'masse'];
const stimmFelder = ['rolle', 'kontext', 'text'];

const pPfad = join(root, 'data', 'products.json');
const produkte = lies(pPfad);
const liste = Array.isArray(produkte) ? produkte : produkte.produkte;
let pZahl = 0;
for (const sp of SPRACHEN) {
  const f = join(i18n, 'uebersetzung', sp, 'products.json');
  if (!existsSync(f)) { console.log(`products ${sp}: keine Datei`); continue; }
  const u = lies(f);
  for (const p of liste) {
    const eintrag = u[p.id];
    if (!eintrag) continue;
    for (const feld of produktFelder) {
      if (eintrag[feld] === undefined) continue;
      p[feld] = mehrsprachig(p[feld], sp, eintrag[feld]);
      pZahl++;
    }
  }
}
schreib(pPfad, produkte);
console.log(`products.json: ${pZahl} Feldwerte eingesetzt`);

const sPfad = join(root, 'data', 'stimmen.json');
const stimmenRoh = lies(sPfad);
const stimmen = Array.isArray(stimmenRoh) ? stimmenRoh : stimmenRoh.stimmen;
let sZahl = 0;
for (const sp of SPRACHEN) {
  const f = join(i18n, 'uebersetzung', sp, 'stimmen.json');
  if (!existsSync(f)) { console.log(`stimmen ${sp}: keine Datei`); continue; }
  const u = lies(f);
  stimmen.forEach((s, i) => {
    const eintrag = Array.isArray(u) ? u[i] : u[s.name];
    if (!eintrag) return;
    for (const feld of stimmFelder) {
      if (eintrag[feld] === undefined) continue;
      s[feld] = mehrsprachig(s[feld], sp, eintrag[feld]);
      sZahl++;
    }
  });
}
schreib(sPfad, stimmenRoh);
console.log(`stimmen.json: ${sZahl} Feldwerte eingesetzt`);
