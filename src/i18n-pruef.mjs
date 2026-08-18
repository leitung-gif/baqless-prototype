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
]);

const VERBOTEN = [
  [/hypoallergen/i, 'Vertraeglichkeitsaussage'],
  [/hypoallerg[eé]nique/i, 'Vertraeglichkeitsaussage'],
  [/nickel[\s-]?(free|frei)|sans nickel/i, 'Nickelaussage'],
  [/sensitive ears|oreilles sensibles/i, 'Vertraeglichkeitsaussage'],
  [/patent(ed|iert|é)?\b/i, 'Patentaussage'],
  [/waterproof|étanche/i, 'zu starke Wasseraussage'],
  [/swiss\s?made|made in switzerland|fabriqué en suisse/i, 'unzulaessige Herkunftsaussage'],
  [/never lose|guarantee[ds]?\b|garanti\b/i, 'unzulaessige Zusicherung'],
  [/surgical steel(?!.{0,40}post)|acier chirurgical(?!.{0,40}tige)/i, 'Stahl als Material des Schmucks'],
];

const ZEICHEN = [
  [/—/, 'Geviertstrich'],
  [/–/, 'Halbgeviertstrich'],
  [/ß/, 'Eszett'],
];

const lies = p => JSON.parse(readFileSync(p, 'utf8'));
const platzhalter = s => (s.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) || []).sort();
const entitaeten = s => (s.match(/&[a-zA-Z]+;|&#\d+;/g) || []).sort();
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

    for (const [muster, was] of VERBOTEN)
      if (muster.test(t)) melde(true, sp, k, `${was}: ${t.slice(0, 70)}`);
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
