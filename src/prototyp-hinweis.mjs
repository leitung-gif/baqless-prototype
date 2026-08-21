/**
 * Setzt auf jede Seite einen Hinweis, dass dies ein Prototyp ist.
 *
 *   node src/prototyp-hinweis.mjs
 *
 * Der Auftritt geht an vier Leute, die keine Weboberflaechen bauen und die ein Gefuehl
 * bekommen sollen, ohne etwas fuer bare Muenze zu nehmen. Vier gekennzeichnete Bilder
 * reichen dafuer nicht: Platzhalter sind auch die Preise, die Versandtarife, die
 * Rechtstexte und der Name des Verschlusses.
 *
 * Darum ein Band, das oben steht und nicht weggeht. Es sagt drei Dinge und nicht mehr:
 * es ist ein Prototyp, Preise und Teile der Bilder sind Platzhalter, bestellen kann man
 * nichts. Alles Weitere steht in der Mail.
 *
 * Technisch: das Band liegt fest oben, die Navigation rueckt um seine Hoehe nach unten,
 * und der Seiteninhalt bekommt denselben Abstand. Das ist der einzige Eingriff. Die
 * Navigation bleibt fest, alle Anker und Sprungmarken behalten ihr Ziel.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

// ---------- 1. Der Text, in drei Sprachen ----------
const TEXTE = {
  de: {
    'huelle.proto.marke': 'Prototyp',
    'huelle.proto.text': 'Preise, Versandtarife, Rechtstexte und ein Teil der Bilder sind Platzhalter. Bestellen lässt sich nichts.',
  },
  en: {
    'huelle.proto.marke': 'Prototype',
    'huelle.proto.text': 'Prices, shipping rates, legal texts and some of the images are placeholders. Nothing can be ordered.',
  },
  fr: {
    'huelle.proto.marke': 'Prototype',
    'huelle.proto.text': 'Les prix, les tarifs de livraison, les mentions légales et une partie des images sont provisoires. Rien ne peut être commandé.',
  },
};
for (const [sp, paare] of Object.entries(TEXTE)) {
  const p = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(p, 'utf8'));
  for (const [k, v] of Object.entries(paare)) w[k] = v;
  writeFileSync(p, JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]])), null, 1) + '\n', 'utf8');
}
console.log('   ok  Text in drei Sprachen');

// ---------- 2. Das Band ins Kopf-Teilstueck ----------
const kopf = join(root, 'partials', 'header.html');
let h = readFileSync(kopf, 'utf8');
const BAND = `<!-- Prototyp-Band. Liegt vor der Navigation, damit es zuerst gelesen wird.
     Vor dem Livegang faellt es ersatzlos weg, zusammen mit .proto-band in styles.css
     und dem Abstand auf body. -->
<div class="proto-band" role="note">
  <b>{{t:huelle.proto.marke}}</b>
  <span>{{t:huelle.proto.text}}</span>
</div>

`;
if (!h.includes('proto-band')) {
  h = BAND + h;
  writeFileSync(kopf, h, 'utf8');
  console.log('   ok  Band im Kopf-Teilstueck');
} else {
  console.log('   schon da: Band');
}

// ---------- 3. Der Stil, samt Abstand fuer Navigation und Inhalt ----------
const cssPfad = join(root, 'styles.css');
let css = readFileSync(cssPfad, 'utf8');
const STIL = `

/* ---------- Prototyp-Band ----------
   Der Auftritt wird begutachtet, bevor er gebaut wird. Das Band sagt das auf jeder
   Seite, damit niemand einen Platzhalterpreis fuer einen Preis haelt. Es traegt die
   Hoehe --proto-h; Navigation und Inhalt ruecken um genau diesen Betrag nach unten.
   Vor dem Livegang faellt dieser ganze Block weg, dazu das Band in header.html. */
:root{--proto-h:34px}
@media(max-width:640px){:root{--proto-h:52px}}

.proto-band{
  position:fixed; inset:0 0 auto 0; z-index:120; height:var(--proto-h);
  display:flex; align-items:center; justify-content:center; gap:10px;
  padding:0 14px; background:var(--navy); color:var(--ground);
  font-size:12.5px; line-height:1.35; text-align:center;
  border-bottom:1px solid rgba(217,193,160,.35);
}
.proto-band b{
  flex:none; color:var(--navy); background:var(--gold);
  font-size:10.5px; font-weight:600; letter-spacing:.16em; text-transform:uppercase;
  padding:3px 9px; border-radius:2px;
}
.proto-band span{opacity:.88}
@media(max-width:640px){
  .proto-band{flex-direction:column; gap:3px; justify-content:center; padding:5px 12px; font-size:11.5px}
}
@media print{.proto-band{display:none}}

nav{top:var(--proto-h)}
body{padding-top:var(--proto-h)}
.skip-link{top:calc(var(--proto-h) + 8px)}
html{scroll-padding-top:calc(92px + var(--proto-h))}
`;
if (!css.includes('.proto-band')) {
  css += STIL;
  writeFileSync(cssPfad, css, 'utf8');
  console.log('   ok  Stil und Abstand');
} else {
  console.log('   schon da: Stil');
}

console.log('');
console.log('Prototyp-Band gesetzt. Es faellt vor dem Livegang ersatzlos weg.');
