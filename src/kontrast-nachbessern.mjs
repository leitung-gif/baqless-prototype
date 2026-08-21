/**
 * Behebt die drei Kontrastbefunde, die die neue Prüfung gefunden hat.
 *
 *   node src/kontrast-nachbessern.mjs
 *
 * 1. .legal a färbte auch Knöpfe. Die Regel ist für Verweise im Fliesstext gedacht,
 *    hat aber Spezifität 0,2,0 und schlägt damit .btn-coral mit 0,1,0. Ergebnis:
 *    Coral Deep auf Coral, 1.99 zu 1, praktisch unlesbar, auf elf Knöpfen über fünf
 *    Rechtsseiten. Das Handbuch verbietet in 03.4 ausdrücklich Coral als Schrift.
 *    Die Regel ist alt, die Knöpfe sind neu, darum fiel es erst jetzt auf.
 *
 * 2. .mech-kind nahm --grey-deep als Schriftfarbe. Das ist eine Rahmenfarbe: sie
 *    liegt bei 3.51 zu 1, und ein Rahmen braucht nur 3.0. Für Text bei 10.5px gilt
 *    4.5. Wird zu --ink-soft, 5.40 zu 1.
 *
 * 3. Die Schrittziffern 01 bis 04 standen in --warmgrey, 1.96 zu 1. Bei 28px gilt die
 *    Schwelle für grosse Schrift, also 3.0. --grey-deep erreicht dort 3.73 und ist
 *    genau hier richtig, wo es bei 10.5px falsch war.
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

ersetze('styles.css',
  '.legal a{color:var(--coral-deep); font-weight:500}',
  '/* Nur Verweise im Fliesstext, nicht Knoepfe. Ohne :not(.btn) schlaegt diese Regel\n'
  + '   mit ihrer hoeheren Spezifitaet die Farbe jedes Knopfs auf den Rechtsseiten,\n'
  + '   bis hin zu Coral Deep auf Coral mit 1.99 zu 1. */\n'
  + '.legal a:not(.btn){color:var(--coral-deep); font-weight:500}',
  '.legal a faerbt keine Knoepfe mehr');

ersetze('pages/index.html',
  '.mech-kind{font-size:10.5px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:var(--grey-deep)}',
  '/* --grey-deep ist eine Rahmenfarbe, 3.51 zu 1. Text bei 10.5px braucht 4.5. */\n'
  + '.mech-kind{font-size:10.5px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:var(--ink-soft)}',
  '.mech-kind auf --ink-soft, 5.40 zu 1');

ersetze('pages/produkt.html',
  '.nk-schritt em{display:block; font-style:normal; font-family:var(--serif); font-size:28px;\n  color:var(--warmgrey); line-height:1; margin-bottom:12px; font-variant-numeric:tabular-nums}',
  '/* Die Ziffer traegt die Reihenfolge, sie ist nicht bloss Schmuck. Bei 28px gilt die\n'
  + '   Schwelle fuer grosse Schrift, 3.0 zu 1. --warmgrey lag bei 1.96. */\n'
  + '.nk-schritt em{display:block; font-style:normal; font-family:var(--serif); font-size:28px;\n'
  + '  color:var(--grey-deep); line-height:1; margin-bottom:12px; font-variant-numeric:tabular-nums}',
  'Schrittziffern auf --grey-deep, 3.73 zu 1');

if (fehler) process.exit(1);
console.log('\nDrei Kontrastbefunde behoben.');
