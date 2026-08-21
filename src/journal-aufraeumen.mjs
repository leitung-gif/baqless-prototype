/**
 * Nimmt die Zaehlerei und die Quellenzeile aus der Journalseite.
 *
 *   node src/journal-aufraeumen.mjs
 *
 * 1. DIE QUELLENZEILE AM FUSS. Sie behandelte das japanische Baqless-Journal wie eine
 *    fremde Quelle, die man zitiert und deren Uebernahme man rechtfertigt. Es ist aber
 *    unser eigenes Journal: baqless.jp gehoert zur selben Marke und wird derselbe Shop.
 *    Ausserdem war sie doppelt, denn jede Portraetkarte traegt ihre Quelle bereits
 *    selbst, mit Datum: «Baqless Journal Japan, 7. Januar 2025».
 *
 * 2. DIE BRUECHE NEBEN DEN AUSSAGEN. Je Befund standen ein Bruch, eine Punktreihe und
 *    eine Fussnote, die erklaerte, dass die Punkte dasselbe zeigen wie der Bruch. Drei
 *    Darstellungen derselben Zahl. Und die Zahl selbst sagt nichts: «vier von sechs»
 *    ist eine Auszaehlung, keine Aussage. Was die Frauen gesagt haben, stand die ganze
 *    Zeit daneben. Ab jetzt steht nur das da.
 *
 * Der Zahlenblock 6 Portraets, 4 Jahrgaenge, 1 Zitat, 0 Sterne bleibt unangetastet.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const seite = join(root, 'pages', 'journal.html');
let s = readFileSync(seite, 'utf8');
let fehler = 0;

// ---------- 1. Quellenzeile am Fuss ----------
const zeile = /\s*<p class="jquelle" id="offenlegung">\{\{t:journal\.quelle\.zeile\}\}<\/p>/;
if (zeile.test(s)) {
  s = s.replace(zeile, '');
  console.log('   ok  Quellenzeile am Fuss entfernt');
} else {
  console.error('ABBRUCH: Quellenzeile nicht gefunden');
  fehler++;
}

// ---------- 2. Brueche und Punktreihen ----------
// Nur die Spalten IM Befundblock: sie tragen alle das Muster Ziffer<i>/6</i>
const vorher = (s.match(/<span class="n">\d<i>\/6<\/i><\/span>/g) || []).length;
s = s.replace(
  /\s*<div><span class="n">\d<i>\/6<\/i><\/span><span class="dots"[^>]*>(?:<i[^>]*><\/i>)+<\/span><\/div>/g,
  '');
const nachher = (s.match(/<span class="n">\d<i>\/6<\/i><\/span>/g) || []).length;
if (vorher !== 6 || nachher !== 0) {
  console.error(`ABBRUCH: ${vorher} Brueche gefunden, ${nachher} uebrig, erwartet 6 und 0`);
  fehler++;
} else {
  console.log('   ok  sechs Brueche mit ihren Punktreihen entfernt');
}

// Die Fussnote, die nur die Punkte erklaerte
const fuss = /\s*<p class="bfuss">\{\{t:journal\.befunde\.fuss\}\}<\/p>/;
if (fuss.test(s)) {
  s = s.replace(fuss, '');
  console.log('   ok  Fussnote zu den Punkten entfernt');
}

if (fehler) process.exit(1);
writeFileSync(seite, s, 'utf8');

// ---------- 3. Die Texte ----------
// Der Vorspann und der Schlusssatz rechneten mit den Bruechen. Sie sagen jetzt dasselbe
// ohne Auszaehlung: die Zahl war nie das Argument, die Uebereinstimmung ist es.
const TEXTE = {
  de: {
    'journal.befunde.sub': 'Keine Umfrage und keine Kampagne: sechs Porträts, entstanden zwischen 2022 und 2025, jedes einzeln geführt. Das hier steht darin.',
    'journal.befunde.schluss.text': 'Dass man die Ohrringe vergisst, und dass nichts mehr verloren geht, sagen sie unabhängig voneinander. Beides hängt an derselben Sache. Es gibt kein Rückteil, das sich lösen könnte.',
  },
  en: {
    'journal.befunde.sub': 'No survey and no campaign: six portraits, made between 2022 and 2025, each conducted separately. This is what they say.',
    'journal.befunde.schluss.text': 'That you forget the earrings, and that nothing goes missing any more, they say independently of each other. Both hang on the same thing. There is no back that could come loose.',
  },
  fr: {
    'journal.befunde.sub': 'Ni sondage ni campagne : six portraits réalisés entre 2022 et 2025, chacun mené séparément. Voici ce qu’ils disent.',
    'journal.befunde.schluss.text': 'Qu’on oublie les boucles, et que plus rien ne se perde, elles le disent indépendamment les unes des autres. Les deux tiennent à la même chose. Il n’y a pas de poussoir qui puisse se détacher.',
  },
};
const WEG = ['journal.quelle.zeile', 'journal.befunde.fuss'];

for (const [sp, paare] of Object.entries(TEXTE)) {
  const p = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(p, 'utf8'));
  for (const [k, v] of Object.entries(paare)) w[k] = v;
  let weg = 0;
  for (const k of WEG) if (k in w) { delete w[k]; weg++; }
  writeFileSync(p, JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]])), null, 1) + '\n', 'utf8');
  console.log(`   ok  ${sp}.json: ${Object.keys(paare).length} gesetzt, ${weg} entfernt`);
}

console.log('');
console.log('Die Seite sagt jetzt, was sie sagen, statt es zu zaehlen.');
