/**
 * Stellt neben die freiwillige Garantie den Hinweis auf die gesetzlichen Rechte.
 *
 *   node src/garantie-hinweis.mjs
 *
 * BEFUND. An drei Stellen steht «ein Jahr Garantie auf Produktionsfehler», auf
 * der Startseite und zweimal in der FAQ. In den AGB steht daneben «Es gilt die
 * gesetzliche Gewaehrleistung». Die gesetzliche Frist betraegt in jedem unserer
 * EU-Maerkte zwei Jahre.
 *
 * Eine freiwillige Garantie darf laenger oder besser sein als das Gesetz, aber
 * sie darf die gesetzlichen Rechte nicht verdecken. Wer «ein Jahr» liest und
 * sonst nichts, haelt sein Recht nach dreizehn Monaten fuer erloschen. Genau das
 * ist der Punkt, an dem eine sonst grosszuegige Zusage zum Nachteil wird.
 *
 * Die Zusage selbst bleibt unveraendert. Nur der Satz danach kommt dazu.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const SCHLUESSEL = ['faq.a.garantie', 'faq.garantie.antwort', 'start.fragen.drei_antwort'];
const ZUSATZ = {
  de: ' Deine gesetzlichen Rechte bei Mängeln bleiben davon unberührt.',
  en: ' Your statutory rights in the event of defects remain unaffected.',
  fr: ' Vos droits légaux en cas de défaut ne sont pas affectés.',
};

let n = 0, fehler = 0;
for (const sp of ['de', 'en', 'fr']) {
  const pfad = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(pfad, 'utf8'));
  for (const k of SCHLUESSEL) {
    if (!(k in w)) { console.error(`   FEHLT: ${k} in ${sp}`); fehler++; continue; }
    if (w[k].includes(ZUSATZ[sp].trim())) { console.log(`   schon da: ${sp} ${k}`); continue; }
    w[k] = w[k].trimEnd() + ZUSATZ[sp];
    n++;
  }
  writeFileSync(pfad, JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]])), null, 1) + '\n', 'utf8');
  console.log(`   ok  ${sp}: ${SCHLUESSEL.length} Stellen geprüft`);
}

// Gegenprobe: nirgends steht eine Jahresgarantie ohne den Hinweis.
const JAHR = { de: /\bein Jahr\b/, en: /one[- ]year|one year from purchase/, fr: /\bun an\b/ };
let offen = 0;
for (const sp of ['de', 'en', 'fr']) {
  const w = JSON.parse(readFileSync(join(root, 'i18n', `${sp}.json`), 'utf8'));
  for (const [k, v] of Object.entries(w)) {
    if (typeof v !== 'string') continue;
    if (JAHR[sp].test(v) && /[Gg]arantie|warranty|couvert/.test(v) && !v.includes(ZUSATZ[sp].trim())) {
      console.error(`   OFFEN: ${sp} ${k}`); offen++;
    }
  }
}
console.log('');
console.log(`${n} Stellen ergänzt, ${offen} ohne Hinweis übrig.`);
if (fehler || offen) process.exit(1);
