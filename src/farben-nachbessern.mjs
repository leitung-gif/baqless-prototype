/**
 * Bessert drei Stellen nach, an denen die Farbumstellung zu weit ging.
 *
 *   node src/farben-nachbessern.mjs
 *
 * 1. Die Punkte an den Variantennamen zeigen die Farbe des Schmuckstuecks, nicht eine
 *    Farbe der Marke. White und Pearl wurden zur Trennlinie eingezogen, damit saehen
 *    zwei verschiedene Varianten gleich aus. Sie bekommen ihre Werte zurueck.
 *
 * 2. Auf einer Zeichenflaeche loest var(--coral) nicht auf. canvas kennt keine
 *    CSS-Variablen, fillStyle haette stillschweigend nichts gesetzt und die Blasen
 *    waeren verschwunden. Statt auf feste Zahlen zurueckzugehen, werden die Werte
 *    beim Laden aus den Token gelesen. Damit bleibt das Token die einzige Quelle,
 *    und die Zeichenflaeche stimmt automatisch mit, wenn sich eine Farbe aendert.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
let fehler = 0;

const ersetze = (pfad, alt, neu, was) => {
  const p = join(root, pfad);
  const s = readFileSync(p, 'utf8');
  const n = s.split(alt).length - 1;
  if (n !== 1) { console.error(`ABBRUCH: ${was}: ${n} Treffer statt 1`); fehler++; return; }
  writeFileSync(p, s.replace(alt, neu), 'utf8');
  console.log(`  ok  ${was}`);
};

// ---------- 1. Variantenpunkte ----------
ersetze('pages/produkt.html',
  "const pillDots = {Gold:'#D9B14C', Silver:'#C9CDD4', Sea:'#4C8FD9', Black:'#222', White:'var(--line)', Pearl:'var(--line)', Duo:'#D9B14C', 'Neon Pink':'#FF3F8E'};",
  "// Diese Werte sind Produktfarben, nicht Markenfarben. Sie zeigen, wie das Stueck\n"
  + "// aussieht, und gehoeren darum bewusst nicht ins Token-System.\n"
  + "const pillDots = {Gold:'#D9B14C', Silver:'#C9CDD4', Sea:'#4C8FD9', Black:'#222222', White:'#F1EEE8', Pearl:'#EDE6DA', Duo:'#D9B14C', 'Neon Pink':'#FF3F8E'};",
  'Variantenpunkte: White und Pearl zurueckgeholt');

// ---------- 2. Zeichenflaeche ----------
ersetze('pages/index.html',
  "const COLORS = ['var(--coral)','var(--sage)','var(--lavender)','var(--gold)'];",
  "// canvas loest keine CSS-Variablen auf, darum werden die Token einmal ausgelesen.\n"
  + "const tokenWert = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();\n"
  + "const COLORS = ['--coral','--sage','--lavender','--gold'].map(tokenWert);\n"
  + "const GRUND = tokenWert('--ground');",
  'Blasenfarben werden aus den Token gelesen');

ersetze('pages/index.html',
  "ctx.fillStyle = 'var(--ground)';",
  'ctx.fillStyle = GRUND;',
  'Glanzpunkt der Blase nutzt den ausgelesenen Grundton');

if (fehler) process.exit(1);
console.log('');
console.log('Drei Stellen nachgebessert.');
