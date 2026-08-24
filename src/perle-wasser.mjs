/**
 * Nimmt die flache Wasserzusage vom Perlenmodell.
 *
 *   node src/perle-wasser.mjs
 *
 * BEFUND. Auf der Produktseite von Amity Luna steht im Materialfeld «Wasserfest.»
 * und im Pflegefeld derselben Seite «Zum Duschen und Schwimmen nimmst du sie
 * besser heraus». In allen drei Sprachen. Von zwei Angaben auf einer Kaufseite
 * ist die kaufentscheidende die falsche.
 *
 * Der Rest des Auftritts ist an dieser Stelle sauber: die FAQ nennt die Ausnahme,
 * und der Block «Was Leute vor dem Kauf fragen» nennt sie ebenfalls. Nur die
 * Produktdaten selbst behaupten das Gegenteil.
 *
 * Statt eines Verweises auf einen anderen Abschnitt steht jetzt die Sache selbst
 * dort: wer das Materialfeld liest, soll nicht erst weiterblaettern muessen.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pfad = join(root, 'data', 'products.json');
const roh = JSON.parse(readFileSync(pfad, 'utf8'));
const liste = Array.isArray(roh) ? roh : (roh.products || roh.produkte);

const ALT = { de: ' Wasserfest.', en: ' Water-resistant.', fr: ' Résistant à l’eau.' };
const NEU = {
  de: ' Die Perle nimmst du zum Duschen und Schwimmen heraus.',
  en: ' Take the pearl out for showering and swimming.',
  fr: ' Retirez la perle pour la douche et la baignade.',
};

const p = liste.find(x => (x.slug || x.id) === 'lunapearl');
if (!p) { console.error('ABBRUCH: lunapearl nicht gefunden'); process.exit(1); }

let n = 0;
for (const sp of ['de', 'en', 'fr']) {
  const mat = p.materials[sp];
  // Der Apostroph im Franzoesischen muss zum Bestand passen.
  const alt = sp === 'fr' && !mat.includes(ALT.fr) ? ALT.fr.replace('’', "'") : ALT[sp];
  if (!mat.includes(alt)) {
    if (mat.includes(NEU[sp].trim())) { console.log(`   schon behoben: ${sp}`); continue; }
    console.error(`   ABBRUCH ${sp}: «${alt.trim()}» nicht gefunden in «${mat}»`); process.exit(1);
  }
  p.materials[sp] = mat.replace(alt, NEU[sp]);
  console.log(`   ok  ${sp}: ${p.materials[sp]}`);
  n++;
}
writeFileSync(pfad, JSON.stringify(roh, null, 1) + '\n', 'utf8');

// Gegenprobe ueber alle Modelle: nirgends darf Material und Pflege einander widersprechen.
const WF = { de: /[Ww]asserfest/, en: /[Ww]ater.?resistant|[Ww]aterproof/, fr: /[Rr]ésistant[e]? à l.eau/ };
const RAUS = { de: /nimmst du sie|heraus/, en: /take (them|this pair) out|remove/, fr: /retirez|enlevez/i };
let rest = 0;
for (const x of liste) for (const sp of ['de', 'en', 'fr']) {
  if (WF[sp].test(x.materials?.[sp] || '') && RAUS[sp].test(x.care?.[sp] || '')) {
    console.error(`   REST: ${x.slug || x.id} [${sp}] sagt wasserfest und herausnehmen`); rest++;
  }
}
console.log('');
console.log(`${n} Angaben berichtigt, ${rest} Widersprueche uebrig.`);
if (rest) process.exit(1);
