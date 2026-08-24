/**
 * Bringt die Zollzusage auf der Rechtsseite auf denselben Stand wie die FAQ.
 *
 *   node src/zollzusage-entschaerfen.mjs
 *
 * BEFUND. Auf widerruf.html stand, in DE, EN und FR:
 *
 *   «Die Einfuhrabgaben sind in der Versandgebuehr enthalten. An der Tuer kommt
 *    nichts dazu, und du bekommst keine Nachforderung vom Zoll.»
 *   [Fuer welche Laender das gilt, wird vor dem Livegang festgelegt.]
 *
 * Eine unbedingte Zusage, unmittelbar ueber ihrem eigenen Vorbehalt. In der FAQ
 * ist derselbe Satz laengst zu «soll die Versandgebuehr die Einfuhrabgaben
 * bereits enthalten» entschaerft. Die Korrektur wurde gemacht und die
 * Rechtsseite dabei vergessen, ausgerechnet die, auf die sich ein Kunde beruft.
 *
 * Rechnerisch traegt der Einwand ebenfalls: CHF 7 Versand gegen rund CHF 21
 * deutsche Einfuhrumsatzsteuer auf CHF 110, plus Verzollungsgebuehr.
 *
 * Der neue Wortlaut wird nicht neu erfunden, sondern aus der FAQ uebernommen,
 * damit nicht eine dritte Fassung entsteht.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const SCHLUESSEL = 'recht.widerruf.zoll.text';

const NEU = {
  de: 'Bei Lieferungen ins Ausland soll die Versandgebühr die Einfuhrabgaben bereits enthalten, '
    + 'damit an der Tür nichts dazukommt und keine Nachforderung vom Zoll folgt.',
  en: 'On deliveries abroad the shipping fee is meant to cover the import charges, so that nothing '
    + 'is added at the door and customs does not come back to you with a further demand.',
  fr: 'Pour les livraisons à l’étranger, les frais de port doivent déjà couvrir les taxes à '
    + 'l’importation, afin que rien ne s’ajoute à la remise du colis et que la douane ne vous '
    + 'adresse aucune facture complémentaire.',
};
// Das Kennwort, an dem die Pruefung erkennt, dass der Satz nicht mehr unbedingt ist.
const WEICH = { de: /\bsoll\b/, en: /is meant to/, fr: /doivent/ };

let fehler = 0;
for (const sp of ['de', 'en', 'fr']) {
  const pfad = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(pfad, 'utf8'));
  const alt = w[SCHLUESSEL];
  if (!alt) { console.error(`   FEHLT: ${SCHLUESSEL} in ${sp}`); fehler++; continue; }
  if (WEICH[sp].test(alt)) { console.log(`   schon entschaerft: ${sp}`); continue; }
  if (!WEICH[sp].test(NEU[sp])) { console.error(`   FEHLER: neuer ${sp}-Satz traegt kein Kennwort`); fehler++; continue; }

  // Der Apostroph muss derselbe sein wie im uebrigen Woerterbuch, sonst steht
  // eine Seite mit zwei Sorten da.
  if (sp === 'fr') {
    const werte = Object.values(w).filter(v => typeof v === 'string');
    const gerade = werte.filter(v => v.includes("'")).length;
    const rund = werte.filter(v => v.includes('’')).length;
    const soll = gerade >= rund ? "'" : '’';
    NEU.fr = NEU.fr.replace(/[’']/g, soll);
    console.log(`   fr: Apostroph ${soll === "'" ? 'gerade' : 'typografisch'} (${gerade} zu ${rund} im Bestand)`);
  }
  w[SCHLUESSEL] = NEU[sp];
  writeFileSync(pfad, JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]])), null, 1) + '\n', 'utf8');
  console.log(`   ok  ${sp}: entschaerft`);
}
if (fehler) process.exit(1);
console.log('');
console.log('Rechtsseite und FAQ sagen dasselbe. Der Vorbehalt darunter passt jetzt dazu.');
