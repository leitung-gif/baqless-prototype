/**
 * Bringt die Beschriftung des Lieferfensters auf das, was wirklich gerechnet wird.
 *
 *   node src/lieferfenster-ehrlich.mjs
 *
 * BEFUND. Die Bestaetigungsseite zeigt «Voraussichtlich bei dir, zwischen 26. und
 * 28. August» und darunter «Gerechnet in Werktagen ab Versand». Die Rechnung in
 * bestellung.html lautet aber:
 *
 *     const d = new Date(best.datum);            // das BESTELLdatum
 *     const vonD = werktageSpaeter(d, 2);
 *     const bisD = werktageSpaeter(d, 4);
 *
 * Gerechnet wird ab Bestellung, beschriftet ist es mit «ab Versand». Bestellt am
 * Montag ergibt das Mittwoch bis Freitag, und im selben Bild steht Schritt 2,
 * «Wir pruefen den Bestand und packen», noch offen. Das Paket ist also noch nicht
 * einmal unterwegs, waehrend die Seite ein Ankunftsdatum nennt.
 *
 * WAS HIER NICHT PASSIERT. Der Versandtag wird nicht erfunden. Niemand weiss
 * heute, wie lange die Lagerpruefung dauert; die Tarife und Laufzeiten je Land
 * stehen an vier anderen Stellen ausdruecklich als offen. Eine Zahl dazu waere
 * geraten.
 *
 * WAS PASSIERT. Die Beschriftung sagt, was die Rechnung tut, und der offene Punkt
 * wird als offener Punkt sichtbar, in derselben eckigen Klammer wie ueberall sonst.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const SCHLUESSEL = 'kaufweg.best.liefer.hinweis';

const NEU = {
  de: 'Gerechnet in Werktagen ab Bestellung, mit {art}. [Der Versandtag wird vor dem Livegang ergänzt.]',
  en: 'Counted in working days from the order, with {art}. [The dispatch day will be added before the site goes live.]',
  fr: 'Calculé en jours ouvrables dès la commande, avec {art}. [Le jour d’expédition sera précisé avant la mise en ligne.]',
};
// Woran die Pruefung erkennt, dass die Beschriftung nicht mehr vom Versand ausgeht.
const FALSCH = { de: /ab Versand/, en: /from dispatch/, fr: /dès l.expédition/ };

let fehler = 0;
for (const sp of ['de', 'en', 'fr']) {
  const pfad = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(pfad, 'utf8'));
  const alt = w[SCHLUESSEL];
  if (!alt) { console.error(`   FEHLT: ${SCHLUESSEL} in ${sp}`); fehler++; continue; }
  if (!FALSCH[sp].test(alt)) { console.log(`   schon richtig: ${sp}`); continue; }
  if (!alt.includes('{art}') || !NEU[sp].includes('{art}')) { console.error(`   FEHLER ${sp}: Platzhalter {art} verloren`); fehler++; continue; }

  if (sp === 'fr') {
    const werte = Object.values(w).filter(v => typeof v === 'string');
    const gerade = werte.filter(v => v.includes("'")).length;
    const rund = werte.filter(v => v.includes('’')).length;
    NEU.fr = NEU.fr.replace(/[’']/g, gerade >= rund ? "'" : '’');
  }
  w[SCHLUESSEL] = NEU[sp];
  writeFileSync(pfad, JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]])), null, 1) + '\n', 'utf8');
  console.log(`   ok  ${sp}: «ab Bestellung» statt «ab Versand», Versandtag als offener Punkt`);
}
if (fehler) process.exit(1);
console.log('');
console.log('Die Beschriftung sagt jetzt, was die Rechnung tut.');
