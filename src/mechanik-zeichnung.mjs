/**
 * Setzt die neue Mechanik-Zeichnung auf die Startseite.
 *
 *   node src/mechanik-zeichnung.mjs
 *
 * WARUM: Die bisherigen zwei Bilder zeigten einen Ohrring von schraeg vorn und
 * erklaerten damit genau das nicht, worum es geht: was HINTEN am Ohr passiert.
 * Die neue Zeichnung ist ein Schnitt durchs Laeppchen in drei Schritten je Seite.
 *
 * Drei Dinge sind dabei bewusst entschieden:
 *
 * 1 DIE SCHRITTTEXTE STEHEN ALS HTML UNTER DEM BILD, nicht als SVG-Text darin.
 *   SVG-Text bricht nicht um. Deutsch «Rueckteil aufstecken» passt in eine Zeile,
 *   franzoesisch «on ajoute le poussoir» nicht. Als HTML umbricht jede Sprache
 *   selbst, der Text ist markierbar, und er waechst nicht mit dem viewBox mit.
 *
 * 2 KEINE NEUE FARBE. Die Zeichnung nimmt nur Tokens, die styles.css schon fuehrt.
 *
 * 3 --ink-soft STATT --warmgrey fuer Beschriftungen. Warmgrey auf Weiss ergibt
 *   1.94:1 und faellt im Kontrasttest durch, zu Recht.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const QUELLE = 'C:/Users/sinan/AppData/Local/Temp/claude/C--Users-sinan-Desktop/' +
               '99b3e374-be7f-4845-b964-e2eabdc4ec14/scratchpad/mechanik/ablauf.html';

const hart = (bed, text) => { if (!bed) { console.error('ABBRUCH: ' + text); process.exit(1); } };

// ---------- 1. Die zwei Zeichnungen aus der Quelle holen ----------
const quelle = readFileSync(QUELLE, 'utf8');
const roh = quelle.match(/<svg viewBox="0 0 324 190"[\s\S]*?<\/svg>/g) || [];
hart(roh.length === 2, `${roh.length} Zeichnungen in der Quelle gefunden, erwartet 2`);

const umbauen = (s, seite) => {
  let t = s;
  const w = (bed, was) => hart(bed, `${seite}: ${was}`);

  // Die Schritttexte wandern nach draussen. Sie sassen auf y 168 und y 180.
  const vorher = (t.match(/<text x="54" y="(?:168|180)"[\s\S]*?<\/text>\s*/g) || []).length;
  w(vorher === (seite === 'vorher' ? 4 : 3), `${vorher} Schritttexte gefunden`);
  t = t.replace(/<text x="54" y="(?:168|180)"[\s\S]*?<\/text>\s*/g, '');

  // Ohne die Beschriftung endet die Zeichnung bei 158 statt 190.
  w(t.includes('viewBox="0 0 324 190"'), 'viewBox nicht gefunden');
  t = t.replace('viewBox="0 0 324 190"', 'viewBox="0 0 324 158"');

  // Die getoente Flaeche von Schritt 3 reicht neu bis an die Unterkante.
  w(t.includes('height="158" rx="9"'), 'getoente Flaeche nicht gefunden');
  t = t.replace('height="158" rx="9"', 'height="162" rx="9"');

  // Die einzige Beschriftung, die im Bild bleiben muss: sie gehoert an den Massstrich.
  w(t.includes('>rund 4 mm<'), 'Massangabe nicht gefunden');
  t = t.replace('>rund 4 mm<', '>{{t:start.mechanik.mm}}<');

  // Die Beschreibung fuer Vorlesegeraete kommt aus dem Woerterbuch.
  t = t.replace(/role="img" aria-label="[^"]*"/,
                `role="img" aria-label="{{t:start.mechanik.${seite}_bild}}"`);
  w(t.includes(`${seite}_bild`), 'aria-label nicht gesetzt');

  // Praefix auf allen Bewegungsklassen, damit sie im Shop nichts anderes treffen.
  for (const k of ['nudge-l', 'nudge', 'fall', 'klick', 'turn']) {
    t = t.replace(new RegExp(`class="${k}"`, 'g'), `class="mech-${k}"`);
  }
  w(!/class="(nudge|fall|klick|turn)/.test(t), 'ungepraefixte Klasse uebrig');
  w(!/#[0-9A-Fa-f]{3,6}\b/.test(t), 'harte Farbe in der Zeichnung');

  return t.split('\n').map(z => z.replace(/^ {4}/, '          ')).join('\n');
};

const zeichnung = { vorher: umbauen(roh[0], 'vorher'), nachher: umbauen(roh[1], 'nachher') };
console.log('   ok  zwei Zeichnungen umgebaut, keine harte Farbe');

// ---------- 2. In die Startseite setzen ----------
const pfad = join(root, 'pages', 'index.html');
let s = readFileSync(pfad, 'utf8');

for (const seite of ['vorher', 'nachher']) {
  // Literal statt new RegExp: im Zeichenkettenpfad wurde aus \s ein s, und der
  // Ausdruck suchte nach «mech-figs*». Ein Literal kann so nicht verunglueckt werden.
  const alt = /<div class="mech-fig">\s*<svg viewBox="40 22 194 132"[\s\S]*?<\/svg>\s*<\/div>/;
  const treffer = s.match(alt);
  hart(treffer, `${seite}: alte Zeichnung nicht gefunden`);
  const schritte = seite === 'vorher'
    ? ['s1', 'vorher_s2', 'vorher_s3'] : ['s1', 'nachher_s2', 'nachher_s3'];
  const neu =
`<div class="mech-fig">
        <div class="mech-buehne">
${zeichnung[seite]}
          <ol class="mech-schritte">
            <li><b>1</b>{{t:start.mechanik.${schritte[0]}}}</li>
            <li><b>2</b>{{t:start.mechanik.${schritte[1]}}}</li>
            <li class="letzt"><b>3</b>{{t:start.mechanik.${schritte[2]}}}</li>
          </ol>
        </div>
        <p class="mech-schnitt">{{t:start.mechanik.schnitt}}</p>
      </div>`;
  s = s.replace(alt, neu);
  console.log(`   ok  ${seite}: Zeichnung getauscht`);
}
hart(!s.includes('viewBox="40 22 194 132"'), 'eine alte Zeichnung steht noch da');

// ---------- 3. Das Kleid dazu ----------
const anker = '.mech-fig svg{display:block; width:100%; max-width:400px; height:auto; margin:0 auto}';
hart(s.includes(anker), 'Ankerstelle im Stil nicht gefunden');
s = s.replace(anker, `.mech-buehne{max-width:400px; margin:0 auto}
.mech-fig svg{display:block; width:100%; height:auto}
/* Drei Spalten wie die drei Felder der Zeichnung: die Beschriftung steht unter
   ihrem Bild. Als HTML umbricht sie in jeder Sprache selbst, SVG-Text nicht. */
.mech-schritte{
  list-style:none; margin:3px 0 0; padding:0; display:grid;
  grid-template-columns:repeat(3,1fr); text-align:center;
  font-size:11.5px; line-height:1.35; color:var(--ink-soft);
}
.mech-schritte li{padding:0 5px}
.mech-schritte b{color:var(--ink); margin-right:5px}
.mech-card.vorher .mech-schritte .letzt, .mech-card.vorher .mech-schritte .letzt b{color:var(--coral-deep)}
.mech-card.nachher .mech-schritte .letzt, .mech-card.nachher .mech-schritte .letzt b{color:var(--sage-deep)}
/* Warmgrey ergaebe hier 1.94:1 auf Weiss. Ink-soft ergibt 5.5:1. */
.mech-schnitt{margin:7px 0 0; text-align:center; font-size:10.5px; color:var(--ink-soft)}
@media(prefers-reduced-motion:no-preference){
  .mech-nudge{animation:mechNudge 3s ease-in-out infinite}
  @keyframes mechNudge{0%,62%,100%{transform:translateX(0)}30%{transform:translateX(5px)}}
  .mech-nudge-l{animation:mechNudgeL 3s ease-in-out infinite}
  @keyframes mechNudgeL{0%,62%,100%{transform:translateX(0)}30%{transform:translateX(-5px)}}
  /* Ruhezustand ist der Endzustand: ohne Bewegung fehlt keine Aussage. */
  .mech-fall{animation:mechFall 4s ease-in infinite}
  @keyframes mechFall{0%,32%{transform:translate(0,0);opacity:1}
    44%,52%{transform:translate(-12px,-30px);opacity:0}
    72%,100%{transform:translate(0,0);opacity:1}}
  .mech-klick{animation:mechKlick 4s ease-out infinite}
  @keyframes mechKlick{0%,100%{opacity:1}30%{opacity:.15}44%{opacity:1}}
  .mech-turn{animation:mechTurn 3s ease-in-out infinite}
  @keyframes mechTurn{0%,72%,100%{opacity:.5}34%{opacity:1}}
}`);

writeFileSync(pfad, s, 'utf8');
console.log('   ok  Stil ergaenzt');
console.log('');
console.log('Zeichnung gesetzt. Woerterbuecher folgen im naechsten Schritt.');
