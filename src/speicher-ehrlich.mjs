/**
 * Beschreibt, was der Shop wirklich speichert.
 *
 *   node src/speicher-ehrlich.mjs
 *
 * BEFUND. Ziffer 4 der Datenschutzerklaerung heisst «Cookies und Statistik» und
 * sagt: «Der Shop nutzt technisch notwendige Cookies, zum Beispiel fuer deinen
 * Warenkorb.» Beides trifft nicht zu.
 *
 * Erstens: document.cookie kommt im ganzen Shop null Mal vor. Es gibt keine
 * Cookies. Zweitens speichert der Shop mehr als den Warenkorb, naemlich sechs
 * Dinge im lokalen Speicher des Browsers:
 *
 *   baqless_cart        der Warenkorb
 *   baqless_merk        die Merkliste
 *   baqless_seen        zuletzt angesehene Modelle
 *   baqless_lang        die gewaehlte Sprache
 *   baqless_markt       der gewaehlte Markt
 *   baqless_bestellung  die letzte Bestellung fuer die Bestaetigungsseite
 *
 * Eine Liste zuletzt angesehener Artikel ist keine technische Notwendigkeit fuer
 * einen Warenkorb, sie ist eine Nutzungsspur. Wer die Seite nach dem
 * beschriebenen Cookie durchsucht, findet nichts, und wer den lokalen Speicher
 * oeffnet, findet mehr als beschrieben. Beides ist der falsche Weg herum.
 *
 * Der Text nennt jetzt die Technik beim Namen und zaehlt auf, was drin steht.
 * Die Ueberschrift heisst nicht mehr «Cookies», weil es keine gibt.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const NEU = {
  de: {
    titel: '4. Was dein Browser speichert',
    text: 'Der Shop setzt keine Cookies. Er legt im lokalen Speicher deines Browsers ab: '
        + 'den Warenkorb, deine Merkliste, zuletzt angesehene Modelle, die gewählte Sprache, '
        + 'den gewählten Markt und deine letzte Bestellung für die Bestätigungsseite. Das bleibt '
        + 'auf deinem Gerät. Du wirst es los, indem du die Websitedaten in deinem Browser löschst. '
        + 'Setzen wir später Analyse- oder Marketing-Werkzeuge ein, steht das hier, und wir fragen dich vorher.',
  },
  en: {
    titel: '4. What your browser stores',
    text: 'The shop sets no cookies. It keeps the following in your browser’s local storage: '
        + 'your cart, your saved items, models you recently viewed, the language you chose, the market '
        + 'you chose and your last order for the confirmation page. That stays on your device. You get '
        + 'rid of it by clearing the site data in your browser. If we later use analytics or marketing '
        + 'tools, it will say so here, and we will ask you first.',
  },
  fr: {
    titel: '4. Ce que votre navigateur enregistre',
    text: 'La boutique ne pose aucun cookie. Elle conserve dans le stockage local de votre navigateur : '
        + 'le panier, vos favoris, les modèles consultés récemment, la langue choisie, le marché choisi '
        + 'et votre dernière commande pour la page de confirmation. Cela reste sur votre appareil. Vous '
        + 'l’effacez en supprimant les données du site dans votre navigateur. Si nous utilisons plus tard '
        + 'des outils d’analyse ou de marketing, ce sera indiqué ici et nous vous le demanderons avant.',
  },
};

let n = 0;
for (const sp of ['de', 'en', 'fr']) {
  const pfad = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(pfad, 'utf8'));
  if (!/[Cc]ookie/.test(w['recht.datenschutz.cookies.text'] || '')) { console.log(`   schon berichtigt: ${sp}`); continue; }

  let t = NEU[sp].text;
  if (sp === 'fr') {
    const werte = Object.values(w).filter(v => typeof v === 'string');
    const gerade = werte.filter(v => v.includes("'")).length;
    const rund = werte.filter(v => v.includes('’')).length;
    t = t.replace(/[’']/g, gerade >= rund ? "'" : '’');
  }
  if (sp === 'en') t = t.replace(/’/g, "'");
  w['recht.datenschutz.cookies.text'] = t;
  w['recht.datenschutz.cookies.titel'] = NEU[sp].titel;
  writeFileSync(pfad, JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]])), null, 1) + '\n', 'utf8');
  console.log(`   ok  ${sp}: nennt die Technik und zaehlt auf, was gespeichert wird`);
  n++;
}
console.log('');
console.log(`${n} Sprachen berichtigt. document.cookie kommt im Shop null Mal vor.`);
