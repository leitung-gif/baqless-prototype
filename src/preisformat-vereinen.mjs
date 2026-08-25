/**
 * Fuehrt alle Preisausgaben auf den einen Formatierer zurueck.
 *
 *   node src/preisformat-vereinen.mjs
 *
 * BEFUND. Das Handbuch schreibt in 02.x «Waehrung CHF 81.00» und «Tausender und
 * Dezimal CHF 1'250.00», in 07.x ausdruecklich «CHF 69.00, pro Paar». Der Shop
 * zeigte «CHF 59».
 *
 * Beim Nachbessern zeigte sich, dass das nicht an einer Stelle haengt: es gibt
 * zwoelf Stellen in sechs Dateien, die den Preis von Hand zusammensetzen, und nur
 * der Warenkorb und die Schublade benutzen fmtCHF. Ein Format, das an einer Stelle
 * definiert und an elf Stellen ignoriert wird, ist kein Format.
 *
 * Alle gehen jetzt durch fmtCHF. Damit gilt eine Aenderung am Format sofort
 * ueberall, auch die Tausendertrennung mit typografischem Hochkomma.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const DATEIEN = [
  ['partials/shared.js', [['CHF ${p.price}', '${fmtCHF(p.price)}']]],
  ['pages/index.html', [['CHF ${p.price}', '${fmtCHF(p.price)}'],
                        ["'CHF ' + p.price", 'fmtCHF(p.price)']]],
  ['pages/kollektion.html', [['CHF ${p.price}', '${fmtCHF(p.price)}']]],
  ['pages/neuheiten.html', [['CHF ${p.price}', '${fmtCHF(p.price)}']]],
  ['pages/produkt.html', [['CHF ${P.price}', '${fmtCHF(P.price)}'],
                          ['CHF ${P.preisHalb}', '${fmtCHF(P.preisHalb)}'],
                          ['CHF ${p.price}', '${fmtCHF(p.price)}'],
                          ["'CHF ' + preis", 'fmtCHF(preis)'],
                          ["'CHF ' + P.price", 'fmtCHF(P.price)']]],
];

let gesamt = 0;
for (const [datei, paare] of DATEIEN) {
  const p = join(root, datei);
  let s = readFileSync(p, 'utf8');
  let n = 0;
  for (const [a, b] of paare) {
    const t = s.split(a).length - 1;
    if (!t) continue;
    s = s.split(a).join(b);
    n += t;
  }
  if (n) { writeFileSync(p, s, 'utf8'); console.log(`   ok  ${datei}: ${n} Stellen`); gesamt += n; }
  else console.log(`   nichts zu tun: ${datei}`);
}

// Gegenprobe: baut noch irgendwo jemand den Preis von Hand?
const rest = [];
for (const datei of ['partials/shared.js', 'pages/index.html', 'pages/kollektion.html',
                     'pages/neuheiten.html', 'pages/produkt.html', 'pages/warenkorb.html',
                     'pages/kasse.html', 'pages/bestellung.html']) {
  const s = readFileSync(join(root, datei), 'utf8');
  for (const m of s.matchAll(/CHF \$\{|'CHF ' *\+|"CHF " *\+/g)) rest.push(`${datei}: ${m[0]}`);
}
console.log('');
console.log(`${gesamt} Stellen vereint, ${rest.length} von Hand gebaute Preise uebrig.`);
for (const x of rest) console.log(`   ${x}`);
if (rest.length) process.exit(1);
