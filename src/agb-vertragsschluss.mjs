/**
 * Sagt, welche der drei Mails den Vertrag schliesst.
 *
 *   node src/agb-vertragsschluss.mjs
 *
 * BEFUND. Die AGB sagen «Der Vertrag kommt zustande, sobald wir deine Bestellung
 * per E-Mail bestaetigen». Der eigene Bestellablauf nennt aber drei Mails: den
 * Eingang, die Annahme nach der Lagerpruefung und den Versand. Die erste
 * bestaetigt nur, dass die Bestellung angekommen ist. Welche den Vertrag
 * schliesst, laesst der Satz offen, und das ist genau die Frage, an der ein
 * Streit haengt.
 *
 * Dazu: «Die Belastung erfolgt bei Abschluss der Bestellung», waehrend der
 * Vertrag erst mit der Annahme zustande kommt. Ob der Betrag belastet oder nur
 * reserviert wird, entscheidet sich mit dem Zahlungsanbieter, und den gibt es im
 * Prototyp nicht. Diese Zahl wird nicht erfunden, sie wird als offener Punkt
 * sichtbar, in derselben eckigen Klammer wie ueberall sonst.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const ALT_V = {
  de: 'Der Vertrag kommt zustande, sobald wir deine Bestellung per E-Mail bestätigen.',
  en: 'The contract comes into being as soon as we confirm your order by email.',
  fr: 'Le contrat est conclu dès que nous confirmons votre commande par e-mail.',
};
const NEU_V = {
  de: 'Der Vertrag kommt zustande, sobald wir die Bestellung annehmen. Das ist die zweite Mail, '
    + 'die Annahme nach der Lagerprüfung; die erste bestätigt nur den Eingang.',
  en: 'The contract comes into being as soon as we accept the order. That is the second email, '
    + 'the acceptance after the stock check; the first only confirms receipt.',
  fr: 'Le contrat est conclu dès que nous acceptons la commande. Il s’agit du deuxième e-mail, '
    + 'l’acceptation après la vérification du stock ; le premier ne fait que confirmer la réception.',
};
const ZUSATZ_Z = {
  de: ' [Ob der Betrag bei der Bestellung belastet oder nur reserviert wird, legt Baqless mit dem Zahlungsanbieter fest.]',
  en: ' [Whether the amount is charged at the order or only reserved will be settled by Baqless with the payment provider.]',
  fr: ' [Baqless précisera avec le prestataire de paiement si le montant est débité à la commande ou seulement réservé.]',
};

let fehler = 0;
for (const sp of ['de', 'en', 'fr']) {
  const pfad = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(pfad, 'utf8'));

  if (sp === 'fr') {
    const werte = Object.values(w).filter(v => typeof v === 'string');
    const soll = werte.filter(v => v.includes("'")).length >= werte.filter(v => v.includes('’')).length ? "'" : '’';
    NEU_V.fr = NEU_V.fr.replace(/[’']/g, soll);
  }

  const v = w['recht.agb.vertrag.text'];
  if (v.includes(ALT_V[sp])) { w['recht.agb.vertrag.text'] = v.replace(ALT_V[sp], NEU_V[sp]); console.log(`   ok  ${sp}: Annahme benannt`); }
  else if (v.includes(NEU_V[sp].slice(0, 40))) console.log(`   schon benannt: ${sp}`);
  else { console.error(`   ABBRUCH ${sp}: Vertragssatz nicht gefunden`); fehler++; }

  const z = w['recht.agb.zahlung.text'];
  if (!z.includes('[')) { w['recht.agb.zahlung.text'] = z.trimEnd() + ZUSATZ_Z[sp]; console.log(`   ok  ${sp}: Belastung als offener Punkt`); }
  else console.log(`   schon markiert: ${sp}`);

  writeFileSync(pfad, JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]])), null, 1) + '\n', 'utf8');
}
if (fehler) process.exit(1);
console.log('');
console.log('Die AGB sagen jetzt, welche Mail den Vertrag schliesst.');
