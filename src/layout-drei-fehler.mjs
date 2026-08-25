/**
 * Behebt drei sichtbare Layoutfehler aus dem Schlussaudit.
 *
 *   node src/layout-drei-fehler.mjs
 *
 * 1 JEDES <nav> WURDE ZUR KOPFZEILE
 * styles.css setzt `nav{position:fixed; inset:0 0 auto 0; z-index:100}` ohne
 * Einschraenkung. Der Shop hat zehn nav-Elemente, eines davon ist die Kopfzeile.
 * Gemessen: die Kapitelliste der FAQ klebt fixiert bei top 34 und ist 1265 mal 242
 * gross, sie liegt damit ueber Wortmarke, Krume und Titel. Die Kapitelleiste der
 * Story schwebt fixiert bei top 492 mitten im Fliesstext, 1180 mal 80.
 *
 * Die Regel wird auf #nav eingegrenzt. Die Zustandsregel wandert mit auf
 * #nav.scrolled, damit die Kaskade erhalten bleibt: (1,1,0) schlaegt weiter (1,0,0).
 *
 * 2 DER TEXT DER ZUSAGEN-KACHELN LIEF IN EINER 10-PX-SPALTE
 * `.k-zusagen li` ist ein Raster aus 10px und 1fr. Das ::before belegt Spalte 1,
 * das <b> Spalte 2, und das <span> fliesst automatisch in Zeile 2 Spalte 1 weiter,
 * also in die 10 Pixel. Gemessen: span-Breite 10px, Hoehe 292px. Auf dem Bildschirm
 * steht ein Wort je Zeile. In faq.html und kontakt.html gleich.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const hart = (b, t) => { if (!b) { console.error('ABBRUCH: ' + t); process.exit(1); } };

// ---------- 1 nav eingrenzen ----------
const cssPfad = join(root, 'styles.css');
let css = readFileSync(cssPfad, 'utf8');
const paare = [
  ['\nnav{\n  position:fixed;', '\n/* Nur die Kopfzeile. Ohne die Eingrenzung wurde jedes <nav> im Shop fixiert:\n'
    + '   die Kapitelliste der FAQ lag ueber Wortmarke und Titel, die Kapitelleiste\n'
    + '   der Story schwebte mitten im Fliesstext. */\n#nav{\n  position:fixed;'],
  ['\nnav.scrolled{', '\n#nav.scrolled{'],
  ['\nnav.scrolled .wordmark .wm-hell{', '\n#nav.scrolled .wordmark .wm-hell{'],
  ['\nnav.scrolled .wordmark .wm-dunkel{', '\n#nav.scrolled .wordmark .wm-dunkel{'],
  ['\nnav{top:var(--proto-h)}', '\n#nav{top:var(--proto-h)}'],
];
for (const [a, b] of paare) {
  hart(css.split(a).length - 1 === 1, `«${a.trim().slice(0, 30)}» kommt nicht genau einmal vor`);
  css = css.replace(a, b);
}
writeFileSync(cssPfad, css, 'utf8');
console.log('   ok  styles.css: nav-Regeln auf #nav eingegrenzt, Kaskade erhalten');

// ---------- 2 die Zusagen-Kacheln ----------
const ALT = '.k-zusagen li::before{content:\'\'; width:9px; height:9px; border-radius:2px; margin-top:7px}';
const NEU = ALT + '\n'
  + '/* Das <span> floss automatisch in Zeile 2 Spalte 1 weiter, und die ist 10px breit:\n'
  + '   gemessen 10px Breite bei 292px Hoehe, also ein Wort je Zeile. Es gehoert unter\n'
  + '   das <b> in Spalte 2. */\n'
  + '.k-zusagen li span{grid-column:2}';
for (const datei of ['faq.html', 'kontakt.html']) {
  const p = join(root, 'pages', datei);
  let s = readFileSync(p, 'utf8');
  if (s.includes('.k-zusagen li span{grid-column:2}')) { console.log(`   schon gesetzt: ${datei}`); continue; }
  hart(s.split(ALT).length - 1 === 1, `${datei}: Ankerstelle nicht genau einmal`);
  writeFileSync(p, s.replace(ALT, NEU), 'utf8');
  console.log(`   ok  ${datei}: Text steht wieder in Spalte 2`);
}
console.log('');
console.log('Drei sichtbare Fehler weg. Jetzt messen, nicht glauben.');
