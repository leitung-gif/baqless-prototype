/**
 * Kennzeichnet die vier erzeugten Bilder auf der Story-Seite.
 *
 *   node src/platzhalterbilder-kennzeichnen.mjs
 *
 * Die vier story_*.jpg sind erzeugt, nicht fotografiert. Nachweis: sie tragen im
 * Dateikopf die Signatur Lavc62.28.100, also libavcodec, waehrend jedes echte
 * Produktfoto ein ICC-Profil mit lcms traegt.
 *
 * Das Handbuch verbietet das ausdruecklich, in zwei Teilen:
 *   05  «Personen, Ohren, Haende und Schmuckstuecke werden fotografiert, nicht erzeugt.»
 *   09  «Erzeugte Bilder von Menschen sind ausgeschlossen.»
 *
 * story_hands zeigt Haende und ein Schmuckstueck, also genau das. Eine Kennzeichnung
 * heilt die Regel nicht, sie macht den Bruch nur sichtbar. Fuer einen Prototyp, der
 * eine Richtung zeigen soll, ist das vertretbar und ehrlich. Fuer den Livegang nicht:
 * dort muessen echte Aufnahmen aus der Manufaktur her, sonst faellt der Abschnitt weg.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const seite = join(root, 'pages', 'story.html');
let s = readFileSync(seite, 'utf8');

const BILDER = ['story_sketch', 'story_polish', 'story_atelier', 'story_hands'];

// ---------- 1. Jedes Bild in eine Figur mit Fussnote setzen ----------
let gesetzt = 0;
for (const name of BILDER) {
  const alt = new RegExp(`<img src="\\{\\{${name}\\}\\}"([^>]*)>`);
  const m = s.match(alt);
  if (!m) { console.error(`ABBRUCH: ${name} nicht gefunden`); process.exit(1); }
  if (s.includes(`data-platzhalter="${name}"`)) { console.log(`   schon gekennzeichnet: ${name}`); continue; }
  const neu = `<figure class="ph-bild" data-platzhalter="${name}">\n`
    + `        <img src="{{${name}}}"${m[1]}>\n`
    + `        <figcaption>{{t:story.platzhalter.bild}}</figcaption>\n`
    + `      </figure>`;
  s = s.replace(alt, neu);
  gesetzt++;
  console.log(`   ok  ${name}`);
}

// ---------- 2. Der Stil dazu, in die Seite selbst ----------
const STIL = `
/* Die vier Bilder dieser Seite sind erzeugt, nicht fotografiert. Das Handbuch
   verbietet das in Teil 05 und Teil 09. Sie bleiben im Prototyp, weil er eine
   Richtung zeigen soll, aber sie sagen es selbst, unuebersehbar und auf dem Bild,
   damit niemand sie fuer eine Aufnahme aus der Manufaktur haelt. Vor dem Livegang
   werden sie ersetzt oder der Abschnitt entfaellt. */
.ph-bild{position:relative; margin:0; width:100%; height:100%}
.ph-bild img{width:100%; height:100%; object-fit:cover; display:block}
.ph-bild::before{
  content:""; position:absolute; inset:0; z-index:1; pointer-events:none;
  border:2px dashed rgba(250,247,242,.72); border-radius:inherit;
}
.ph-bild figcaption{
  position:absolute; left:0; right:0; bottom:0; z-index:2;
  background:rgba(11,29,63,.88); color:var(--ground);
  font-size:11.5px; font-weight:600; letter-spacing:.09em; text-transform:uppercase;
  line-height:1.45; padding:9px 12px; text-align:center;
}
@media(max-width:560px){.ph-bild figcaption{font-size:10.5px; letter-spacing:.06em}}
`;

if (!s.includes('.ph-bild{')) {
  const i = s.indexOf('</style>');
  if (i < 0) { console.error('ABBRUCH: kein style-Block in story.html'); process.exit(1); }
  s = s.slice(0, i) + STIL + s.slice(i);
  console.log('   ok  Stil ergaenzt');
}

writeFileSync(seite, s, 'utf8');

// ---------- 3. Der Text, in drei Sprachen ----------
const i18n = join(root, 'i18n');
const TEXTE = {
  de: 'Platzhalter. Erzeugtes Bild, keine Aufnahme aus der Manufaktur. Wird vor dem Livegang ersetzt.',
  en: 'Placeholder. A generated image, not a photograph from the workshop. Replaced before launch.',
  fr: 'Image de substitution. Générée, pas une photographie de l’atelier. Remplacée avant la mise en ligne.',
};
for (const [sp, text] of Object.entries(TEXTE)) {
  const p = join(i18n, `${sp}.json`);
  const w = JSON.parse(readFileSync(p, 'utf8'));
  w['story.platzhalter.bild'] = text;
  const sortiert = Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]]));
  writeFileSync(p, JSON.stringify(sortiert, null, 1) + '\n', 'utf8');
  console.log(`   ok  ${sp}.json: story.platzhalter.bild`);
}

console.log('');
console.log(`${gesetzt} Bilder gekennzeichnet.`);
