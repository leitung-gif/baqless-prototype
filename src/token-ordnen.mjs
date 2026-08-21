/**
 * Ordnet den Tokenblock, ohne einen Wert zu ändern.
 *
 *   node src/token-ordnen.mjs
 *
 * Der Block war gewachsen: acht neue Token hingen unten dran, zwei Werte standen
 * klein geschrieben, die Gruppen waren durcheinander. Kapitel 04.1 des Handbuchs
 * heisst «Die Bausteine. Kopierbare Werte» und zeigt genau diesen Block. Was man
 * kopieren soll, muss lesbar sein.
 *
 * Prüft am Schluss, dass sich kein einziger Wert geändert hat.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pfad = join(root, 'styles.css');
const s = readFileSync(pfad, 'utf8');

const anf = s.indexOf(':root{');
const end = s.indexOf('}', anf) + 1;
const alt = s.slice(anf, end);

const werte = {};
for (const m of alt.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) werte[m[1]] = m[2].trim();

const GRUPPEN = [
  ['Die Markenfarbe', [
    ['coral', 'Fläche, nie Schrift auf hellem Grund'],
    ['coral-deep', 'Coral als Schrift. 4.75 zu 1 auf Ground'],
    ['coral-hover', 'nur die Fläche des Coral-Knopfs unter dem Zeiger'],
    ['coral-tint', 'getönte Fläche'],
  ]],
  ['Die zweite Hauptfarbe', [
    ['navy', 'dunkle Flächen, Schrift auf Coral, Fokusring'],
    ['navy-2', 'Eingabefeld im dunklen Fuss, Navy-Knopf unter dem Zeiger'],
  ]],
  ['Bestätigung', [
    ['sage', 'Fläche und Zeichen'],
    ['sage-deep', 'Schrift auf hellem Grund. 4.59 zu 1'],
    ['sage-ink', 'Schrift auf salbeigetönter Fläche. 5.61 zu 1'],
    ['sage-tint', 'getönte Fläche'],
  ]],
  ['Hinweis', [
    ['lavender', 'Fläche und Zeichen'],
    ['lav-deep', 'Schrift auf hellem Grund. 5.42 zu 1'],
    ['lav-ink', 'Schrift auf lavendelgetönter Fläche. 9.00 zu 1'],
    ['lav-tint', 'getönte Fläche'],
  ]],
  ['Gold', [
    ['gold', 'nur auf Navy und Schwarz'],
    ['gold-tint', 'getönte Fläche'],
  ]],
  ['Die Textleiter, von dunkel nach hell', [
    ['charcoal', 'Überschriften und starker Text. 14.89 zu 1'],
    ['ink-strong', 'betonter Fliesstext. 8.88 zu 1'],
    ['ink', 'Fliesstext und Vorspann. 6.91 zu 1'],
    ['ink-soft', 'Beschriftungen, Hinweise, Masse. Der hellste erlaubte Textton. 5.40 zu 1'],
  ]],
  ['Flächen und Linien', [
    ['ground', 'der Grundton aller Seiten'],
    ['paper', 'Karten und Eingabefelder'],
    ['line', 'jede Trennlinie und jeder Rahmen an Karten und Feldern'],
    ['sand', 'gedeckte Fläche, wärmer als Line'],
    ['warmgrey', 'Rahmen an Bedienelementen, gestrichelte Linien, Punkte im Ruhezustand'],
    ['grey-deep', 'Rahmen mit mehr Halt, und grosse Ziffern ab 24px. 3.73 zu 1'],
    ['black', 'Filmflächen und die schwarze Fassung der Wortmarke'],
  ]],
  ['Schrift und Mass', [
    ['serif', 'Überschriften und Zahlen'],
    ['sans', 'alles Übrige'],
    ['pad', 'seitlicher Rand, wächst mit dem Fenster'],
  ]],
];

const zeilen = [':root{'];
for (const [titel, eintraege] of GRUPPEN) {
  zeilen.push(`  /* ${titel} */`);
  for (const [name, zweck] of eintraege) {
    if (!(name in werte)) { console.error(`ABBRUCH: --${name} gibt es nicht`); process.exit(1); }
    zeilen.push(`  --${name}:${werte[name]};`.padEnd(46) + `/* ${zweck} */`);
  }
}
// Was die Gruppen nicht kennen, kommt am Schluss, damit nichts verschwindet
const bekannt = new Set(GRUPPEN.flatMap(([, e]) => e.map(([n]) => n)));
const rest = Object.keys(werte).filter(n => !bekannt.has(n));
if (rest.length) {
  zeilen.push('  /* Noch nicht eingeordnet */');
  for (const n of rest) zeilen.push(`  --${n}:${werte[n]};`);
}
zeilen.push('}');

const neu = zeilen.join('\n');
writeFileSync(pfad, s.slice(0, anf) + neu + s.slice(end), 'utf8');

// ---------- Gegenprobe ----------
const nachher = {};
for (const m of neu.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) nachher[m[1]] = m[2].trim();
const fehlt = Object.keys(werte).filter(n => !(n in nachher));
const anders = Object.keys(werte).filter(n => nachher[n] && nachher[n] !== werte[n]);
console.log(`Token vorher ${Object.keys(werte).length}, nachher ${Object.keys(nachher).length}`);
if (fehlt.length) { console.error('ABBRUCH, verloren:', fehlt.join(', ')); process.exit(1); }
if (anders.length) { console.error('ABBRUCH, Wert geaendert:', anders.join(', ')); process.exit(1); }
if (rest.length) console.log('Nicht eingeordnet:', rest.join(', '));
console.log('Kein Wert geaendert.');
