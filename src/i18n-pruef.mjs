/**
 * Prueft die Sprachfassungen gegen das deutsche Original.
 *
 *   node src/i18n-pruef.mjs
 *
 * Was ein Uebersetzer nicht sehen kann, faellt hier auf: fehlende Schluessel, verlorene
 * Platzhalter, zerbrochene Auszeichnung, verschluckte Entitaeten, verbotene Aussagen,
 * falsche Anfuehrungszeichen, zu lange Seitentitel. Der Ausgang ist ungleich null, wenn
 * etwas gefunden wurde, damit das im Bau auffaellt und nicht im Shop.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const i18n = join(root, 'i18n');
const SPRACHEN = ['en', 'fr'];

/** Werte, die in einer anderen Sprache zu Recht gleich lauten wie auf Deutsch. */
const DARF_GLEICH_SEIN = new Set([
  'Baqless', 'Click-Lock', 'Honesty', 'Amity', 'Embrace', 'WA', 'FAQ', 'Journal',
  'Instagram', 'TikTok', 'Pinterest', 'TWINT', 'VISA', 'Mastercard', 'Amex', 'PayPal',
  'Apple Pay', 'Google Pay', 'Gold', 'Sea', 'Black', 'White', 'Pearl', 'Duo',
  'Hamon', 'Kumo', 'Hishimon', 'Nagare', 'Ten', 'Waku', 'Shirube', 'Sumiiri',
  'Story', 'Film', 'Shop', 'Newsletter', 'Standard', 'Express', 'Total', 'Material',
  'Liechtenstein', 'Breadcrumb', 'Scroll', 'Loop', 'Garantie', 'Sport',
]);

const VERBOTEN = [
  [/hypoallergen/i, 'Vertraeglichkeitsaussage'],
  [/hypoallerg[eé]nique/i, 'Vertraeglichkeitsaussage'],
  [/nickel[\s-]?(free|frei)|sans nickel/i, 'Nickelaussage'],
  // Jede Regel kennt auch die deutsche Entsprechung. Sonst kann das Original eine
  // Aussage nie ausloesen, und eine im Deutschen freigegebene Stelle gilt in der
  // Uebersetzung faelschlich als neuer Verstoss.
  [/sensitive ears|oreilles sensibles|empfindliche ohren/i, 'Vertraeglichkeitsaussage'],
  [/patent(ed|iert|é|e)?[^a-zäöü]/i, 'Patentaussage'],
  [/waterproof|étanche|wasserdicht/i, 'zu starke Wasseraussage'],
  [/swiss\s?made|made in switzerland|fabriqué en suisse/i, 'unzulaessige Herkunftsaussage'],
  [/never lose|nie verlieren|guaranteed|garantie de perte/i, 'unzulaessige Zusicherung'],
  // Stahl ist nur dann falsch, wenn im selben Wert nirgends vom Stift die Rede ist.
  // Die Wortstellung unterscheidet sich je Sprache, darum kein Blick nach vorn oder hinten.
  [t => /surgical steel|acier chirurgical|chirurgische[mr]? edelstahl/i.test(t)
      && !/post|tige|stift|pièce|piece|partie|part|teil/i.test(t),
    'Stahl als Material des Schmucks'],
];

const ZEICHEN = [
  [/—/, 'Geviertstrich'],
  [/–/, 'Halbgeviertstrich'],
  [/ß/, 'Eszett'],
];

const lies = p => JSON.parse(readFileSync(p, 'utf8'));
const platzhalter = s => (s.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) || []).sort();
// &amp; ist ein gewoehnliches Und-Zeichen: das Franzoesische schreibt dafuer «et».
// Bedeutungstragend sind nur die uebrigen Entitaeten, etwa der geschuetzte Bindestrich.
const entitaeten = s => (s.match(/&[a-zA-Z]+;|&#\d+;/g) || []).filter(e => e !== '&amp;').sort();
const tags = s => (s.match(/<\/?[a-zA-Z]+>/g) || []).sort();
const gleich = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const de = lies(join(i18n, 'de.json'));
let fehler = 0, warnung = 0;
const melde = (schwer, sprache, schluessel, text) => {
  console.log(`  ${schwer ? 'FEHLER ' : 'WARNUNG'} ${sprache} ${schluessel}: ${text}`);
  schwer ? fehler++ : warnung++;
};

for (const sp of SPRACHEN) {
  const pfad = join(i18n, `${sp}.json`);
  if (!existsSync(pfad)) { console.log(`${sp}: keine Datei, uebersprungen`); continue; }
  const ziel = lies(pfad);
  console.log(`\n=== ${sp}: ${Object.keys(ziel).length} von ${Object.keys(de).length} Schluesseln ===`);

  for (const k of Object.keys(de)) if (!(k in ziel)) melde(true, sp, k, 'Schluessel fehlt');
  for (const k of Object.keys(ziel)) if (!(k in de)) melde(true, sp, k, 'Schluessel gibt es auf Deutsch nicht');

  for (const [k, dtext] of Object.entries(de)) {
    const t = ziel[k];
    if (typeof t !== 'string') continue;
    if (!t.trim()) { melde(true, sp, k, 'leerer Wert'); continue; }

    if (!gleich(platzhalter(dtext), platzhalter(t)))
      melde(true, sp, k, `Platzhalter weichen ab: ${platzhalter(dtext).join(' ') || 'keine'} gegen ${platzhalter(t).join(' ') || 'keine'}`);
    if (!gleich(entitaeten(dtext), entitaeten(t)))
      melde(true, sp, k, `Entitaeten weichen ab: ${entitaeten(dtext).join(' ') || 'keine'} gegen ${entitaeten(t).join(' ') || 'keine'}`);
    if (!gleich(tags(dtext), tags(t)))
      melde(true, sp, k, `Auszeichnung weicht ab: ${tags(dtext).join(' ') || 'keine'} gegen ${tags(t).join(' ') || 'keine'}`);

    // Eine Aussage, die schon im deutschen Original steht, ist dort freigegeben worden.
    // Gemeldet wird nur, was die Uebersetzung neu hineinbringt.
    const trifft = (regel, text) => typeof regel === 'function' ? regel(text) : regel.test(text);
    for (const [regel, was] of VERBOTEN)
      if (trifft(regel, t) && !trifft(regel, dtext)) melde(true, sp, k, `${was}: ${t.slice(0, 70)}`);
    for (const [muster, was] of ZEICHEN)
      if (muster.test(t)) melde(true, sp, k, `${was} im Text`);

    if (t === dtext && !DARF_GLEICH_SEIN.has(t.trim()) && /[a-zA-ZäöüÄÖÜ]{4,}/.test(t))
      melde(false, sp, k, `unveraendert deutsch: ${t.slice(0, 60)}`);

    if (sp === 'en' && /"/.test(t)) melde(false, sp, k, 'gerade Anfuehrungszeichen statt typografischer');
    if (sp === 'fr' && /«[^   ]/.test(t)) melde(false, sp, k, 'Guillemet ohne geschuetztes Leerzeichen');

    if (/^seite\..*\.titel$/.test(k) && t.length > 60) melde(false, sp, k, `Seitentitel ${t.length} Zeichen, mehr als 60`);
    if (/^seite\..*\.beschreibung$/.test(k) && t.length > 155) melde(false, sp, k, `Beschreibung ${t.length} Zeichen, mehr als 155`);

    if (/\.eins$/.test(k)) {
      const viele = k.replace(/\.eins$/, '.viele');
      if (!(viele in ziel)) melde(true, sp, k, 'Mehrzahlform fehlt');
      else if (!/\{n\}/.test(t) || !/\{n\}/.test(ziel[viele])) melde(true, sp, k, 'Mehrzahlpaar ohne Platzhalter {n}');
    }
  }
}

console.log(`\n${fehler} Fehler, ${warnung} Warnungen`);
process.exit(fehler ? 1 : 0);
