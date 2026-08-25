/**
 * Nimmt die Technologiebehauptung aus den Pflegetexten.
 *
 *   node src/pvd-ohne-technik.mjs
 *
 * BEFUND. Sieben von fuenfzehn Modellen sagen unter «Pflege» eine
 * PVD-Beschichtung an, waehrend das Feld «Material & Masse» derselben Seite eine
 * andere Oberflaeche nennt:
 *
 *   slice, minelta, bandgold   Material: 18 Karat Vergoldung
 *   leafblack                  Material: schwarze Beschichtung
 *   wasumiiri, wahamon, wakumo Material: rhodiniert
 *
 * Eine Rhodinierung ist keine PVD-Beschichtung, eine Vergoldung ebenfalls nicht.
 * Auf einer Kaufseite stehen damit zwei verschiedene Oberflaechen uebereinander,
 * in allen drei Sprachen.
 *
 * WAS HIER NICHT PASSIERT. Es wird nicht entschieden, welche Oberflaeche stimmt.
 * Das weiss nur Baqless, und die Frage geht als offener Punkt in die Uebergabe.
 *
 * WAS PASSIERT. Der Pflegesatz nennt keine Technologie mehr, die das Materialfeld
 * nicht traegt. Die Pflegeaussage selbst bleibt unveraendert: die Oberflaeche
 * haelt Duschen, Sport und Meer aus. Das ist dieselbe Zusage, nur ohne eine
 * Behauptung darueber, wie sie zustande kommt.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pfad = join(root, 'data', 'products.json');
const roh = JSON.parse(readFileSync(pfad, 'utf8'));
const liste = Array.isArray(roh) ? roh : (roh.products || roh.produkte);

const PAARE = {
  de: [['Die PVD-Beschichtung hält', 'Die Oberfläche hält'],
       ['Die schwarze PVD-Beschichtung ist', 'Die schwarze Oberfläche ist']],
  en: [['The PVD coating handles', 'The surface handles'],
       ['The black PVD coating is', 'The black surface is']],
  fr: [['Le revêtement PVD supporte', 'La surface supporte'],
       ['Le revêtement PVD noir est', 'La surface noire est']],
};

let n = 0;
for (const p of liste) {
  for (const sp of ['de', 'en', 'fr']) {
    const c = p.care?.[sp];
    if (!c || !/PVD/.test(c)) continue;
    let neu = c;
    for (const [a, b] of PAARE[sp]) neu = neu.replace(a, b);
    if (/PVD/.test(neu)) { console.error(`   ABBRUCH ${p.slug || p.id} [${sp}]: PVD bleibt stehen: «${neu.slice(0, 90)}»`); process.exit(1); }
    p.care[sp] = neu;
    n++;
  }
}
writeFileSync(pfad, JSON.stringify(roh, null, 1) + '\n', 'utf8');

// Gegenprobe ueber alle Modelle und Sprachen
const rest = liste.filter(p => ['de', 'en', 'fr'].some(sp => /PVD/.test(p.care?.[sp] || '')));
console.log(`   ${n} Pflegetexte berichtigt, ${rest.length} mit PVD uebrig.`);
console.log('');
console.log('Welche Oberflaeche es wirklich ist, entscheidet Baqless. Steht in der Uebergabe.');
if (rest.length) process.exit(1);
