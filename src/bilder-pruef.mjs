/**
 * Haelt fest, was in den Bildern steht, und meldet jede Aenderung daran.
 *
 *   node src/bilder-pruef.mjs
 *
 * WARUM ES DIESE DATEI GIBT. Auf der Startseite standen «HYPOALLERGENIC
 * EARRINGS» und «SWISS-BORN» — nicht im Text, sondern eingebrannt in zwei
 * Fotos. Die Regel gegen Vertraeglichkeits- und Herkunftsaussagen gab es
 * laengst, in i18n-pruef.mjs. Sie liest Woerterbuecher. Ein Rasterbild liest
 * sie nicht, und genau dort stand die Aussage, drei Bildschirme unter dem Titel.
 *
 * WAS DIESE PRUEFUNG KANN UND WAS NICHT. Sie liest keine Bilder. Sie fuehrt ein
 * Verzeichnis: je Datei eine Pruefsumme und eine Zeile, welcher Text darin zu
 * sehen ist. Der Text wurde von Hand eingetragen, nachdem jedes Bild angesehen
 * wurde. Auf diese Zeile werden dieselben Regeln angewandt wie auf jeden anderen
 * Text der Seite.
 *
 * Aendert sich eine Datei, stimmt die Pruefsumme nicht mehr und die Pruefung
 * schlaegt an, bis jemand hingesehen und den Eintrag nachgefuehrt hat. Kommt
 * eine Datei dazu, fehlt ihr Eintrag und die Pruefung schlaegt an. Das ist der
 * ganze Trick: sie behauptet nicht, Bilder zu verstehen, sie erzwingt nur, dass
 * jemand hingesehen hat.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const img = join(root, 'img');
const vzPfad = join(root, 'img', 'GESICHTET.json');

// Dieselben Regeln wie in i18n-pruef.mjs, auf den Bildtext angewandt.
const VERBOTEN = [
  [/hypoallerg/i, 'Vertraeglichkeitsaussage'],
  [/nickel[\s-]?(free|frei)|sans nickel/i, 'Nickelaussage'],
  [/sensitive ears|oreilles sensibles|empfindliche ohren/i, 'Vertraeglichkeitsaussage'],
  [/swiss[\s-]?(made|born)|made in switzerland|fabriqu[ée] en suisse/i, 'Herkunftsaussage'],
  [/waterproof|étanche|wasserdicht|rust[\s-]?proof/i, 'zu starke Materialaussage'],
  [/never lose|nie verlieren|guaranteed|always secure/i, 'unbedingte Zusicherung'],
  [/patent[^.]{0,60}(nr\.|nummer|n°|no\.|\d{4,}|schweiz|switzerland|suisse|japan|deutschland)/i,
    'Patenthinweis mit Nummer oder Land'],
];

if (!existsSync(vzPfad)) { console.error('ABBRUCH: GESICHTET.json fehlt'); process.exit(1); }
const vz = JSON.parse(readFileSync(vzPfad, 'utf8'));
const dateien = readdirSync(img).filter(f => /\.(jpg|jpeg|png|mp4)$/i.test(f)).sort();

// Welche Bilder verweist eine Seite ueberhaupt an?
// Nicht nur die Seiten: Produktbilder stehen als {{marke}} in src/data/products.json.
// Ohne diese Zeile gilt jedes Produktbild als «nicht angezeigt» und eine Aussage
// darin waere zur blossen Warnung abgestuft worden.
const sammle = (ordner, endung) => {
  const p = join(root, ordner);
  if (!existsSync(p)) return '';
  return readdirSync(p).filter(f => f.endsWith(endung))
    .map(f => readFileSync(join(p, f), 'utf8')).join('');
};
const seiten = sammle('pages', '.html') + sammle('partials', '') + sammle('data', '.json');

let fehler = 0, gewarnt = 0, ungenutzt = 0;
for (const f of dateien) {
  const schluessel = f.replace(/\.[^.]+$/, '');
  const summe = createHash('md5').update(readFileSync(join(img, f))).digest('hex').slice(0, 12);
  const e = vz[f];
  const benutzt = seiten.includes(`{{${schluessel}}}`);
  if (!benutzt) ungenutzt++;

  if (!e) { console.error(`   FEHLT im Verzeichnis: ${f}${benutzt ? ' (und die Seite zeigt es an)' : ''}`); fehler++; continue; }
  if (e.summe !== summe) {
    console.error(`   GEAENDERT seit dem Ansehen: ${f} (${e.summe} -> ${summe}). Ansehen und Eintrag nachfuehren.`);
    fehler++; continue;
  }
  const text = e.text || '';
  for (const [m, was] of VERBOTEN) {
    if (m.test(text)) {
      if (benutzt) { console.error(`   ${was} im Bild ${f}: «${text.slice(0, 70)}»`); fehler++; }
      else { console.log(`   nur abgelegt, nicht angezeigt: ${f} (${was})`); gewarnt++; }
    }
  }
}
for (const f of Object.keys(vz)) if (!dateien.includes(f)) { console.error(`   Eintrag ohne Datei: ${f}`); fehler++; }

console.log('');
console.log(`${dateien.length} Bilder, ${Object.keys(vz).length} Eintraege, ${ungenutzt} nicht angezeigt.`);
console.log(`${fehler} Fehler, ${gewarnt} abgelegte Altlasten.`);
if (fehler) process.exit(1);
