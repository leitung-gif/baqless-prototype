/**
 * Nimmt den Zahlenblock aus dem Journal.
 *
 *   node src/journal-zahlen-raus.mjs
 *
 * «6 Portraets · 4 Jahrgaenge · 1 woertliches Zitat · 0 Sterne, Punkte, Noten».
 * Dieselbe Auszaehlung, die auf der Startseite schon raus ist. Sie rechnet
 * Portraets in Kennzahlen um, und genau das sollen sie nicht sein.
 *
 * Der Kasten darunter bleibt: «Warum hier keine Gesichter stehen» erklaert, dass
 * die Portraetfotos noch nicht freigegeben sind. Das ist eine Auskunft, keine
 * Auszaehlung, und die vier Empfaenger sollen sie lesen.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pfad = join(root, 'pages', 'journal.html');
let s = readFileSync(pfad, 'utf8');

const anf = s.indexOf('<div class="jzahlen">');
const gridAnf = s.indexOf('<div class="jz-grid">', anf);
const fussAnf = s.indexOf('<div class="jz-fuss">', anf);
if (anf < 0 || gridAnf < 0 || fussAnf < 0) { console.error('ABBRUCH: Block nicht gefunden'); process.exit(1); }

// Der Kasten bleibt, der Rahmen darum faellt weg.
const ende = s.indexOf('</div>', s.indexOf('</div>', fussAnf) + 6) + 6;
const fuss = s.slice(fussAnf, s.indexOf('\n  </div>', fussAnf) + 1).trimEnd();
if (!fuss.startsWith('<div class="jz-fuss">')) { console.error('ABBRUCH: Kasten nicht sauber abgegrenzt'); process.exit(1); }

const bis = s.indexOf('</div>', s.indexOf('</div>', fussAnf + fuss.length)) ;
const blockEnde = s.indexOf('\n\n', fussAnf + fuss.length);
s = s.slice(0, anf) + '  ' + fuss.trim() + s.slice(blockEnde);
writeFileSync(pfad, s, 'utf8');
console.log('   ok  vier Zahlen raus, der Kasten bleibt');

// Die Schluessel, die dadurch niemand mehr braucht
const tot = ['journal.zahlen.portraets.label', 'journal.zahlen.portraets.text',
             'journal.zahlen.jahre.label', 'journal.zahlen.jahre.text',
             'journal.zahlen.zitat.label', 'journal.zahlen.zitat.text',
             'journal.zahlen.sterne.label', 'journal.zahlen.sterne.text'];
for (const sp of ['de', 'en', 'fr']) {
  const p = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(p, 'utf8'));
  let n = 0;
  for (const k of tot) if (k in w) { delete w[k]; n++; }
  writeFileSync(p, JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]])), null, 1) + '\n', 'utf8');
  console.log(`   ok  ${sp}.json: ${n} Schlüssel entfernt`);
}
