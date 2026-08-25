/**
 * Vier kleinere Befunde aus dem Schlussaudit.
 *
 *   node src/kleine-befunde.mjs
 *
 * 1 SKU MIT FALSCHER VARIANTE
 * Bei allen fuenfzehn Modellen kodiert das letzte SKU-Segment die Variante:
 * -G Gold, -S Silver, -B Black, -W White, -P Pearl, -D Duo, -NP Neon Pink.
 * Embrace Zirkonia fuehrt BQ-EMB-ZRK-S bei Variante «Gold». Die SKU steht
 * sichtbar auf der Produktseite und geht als item_id ins Tracking.
 *
 * 2 NEWSLETTER OHNE DATENSCHUTZHINWEIS
 * Beide Newsletter-Formulare erheben eine E-Mail-Adresse, ohne zu sagen, wo das
 * nachzulesen ist. Das Kontaktformular macht es zwei Seiten weiter richtig, mit
 * Satz und Link. Dieselben Schluessel werden hier wiederverwendet, damit nicht
 * eine zweite Formulierung entsteht.
 *
 * 3 FADENKREUZ UEBER DER GANZEN BUEHNE
 * #bubbles liegt ueber der gesamten Hero-Flaeche und setzt cursor:crosshair.
 * Das Zeichen bedeutet «hier laesst sich etwas auswaehlen oder setzen». Zu tun
 * ist dort nichts ausser Blasen zerplatzen, was nirgends steht.
 *
 * 4 EIN TOTER KNOPF OHNE GRUND
 * «Zieh dran» ist von Anfang an ausgegraut, und der Erklaertext nennt nur den
 * anderen Knopf. Ein ausgegrauter Knopf ohne Grund liest sich als Fehler.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const hart = (b, t) => { if (!b) { console.error('ABBRUCH: ' + t); process.exit(1); } };

// ---------- 1 SKU ----------
const pPfad = join(root, 'data', 'products.json');
const roh = JSON.parse(readFileSync(pPfad, 'utf8'));
const liste = Array.isArray(roh) ? roh : (roh.products || roh.produkte);
const z = liste.find(p => (p.slug || p.id) === 'zirkonia');
hart(z, 'zirkonia nicht gefunden');
if (z.sku === 'BQ-EMB-ZRK-S') {
  z.sku = 'BQ-EMB-ZRK-G';
  writeFileSync(pPfad, JSON.stringify(roh, null, 1) + '\n', 'utf8');
  console.log('   ok  SKU BQ-EMB-ZRK-S -> BQ-EMB-ZRK-G (Variante Gold)');
} else console.log(`   schon richtig: SKU ${z.sku}`);

// ---------- 2 Newsletter ----------
for (const [datei, anker] of [
  ['pages/index.html', '<form class="nl-form" id="nlForm" data-nlform>'],
  ['partials/footer.html', '<form class="nl-form" data-nlform>'],
]) {
  const p = join(root, datei);
  let s = readFileSync(p, 'utf8');
  if (s.includes('nl-datenschutz')) { console.log(`   schon gesetzt: ${datei}`); continue; }
  hart(s.split(anker).length - 1 === 1, `${datei}: Formular nicht genau einmal`);
  const ende = s.indexOf('</form>', s.indexOf(anker));
  hart(ende > 0, `${datei}: </form> nicht gefunden`);
  const zeile = '      <p class="nl-datenschutz">{{t:kontakt.formular.datenschutz_vor}} '
              + '<a href="datenschutz.html">{{t:kontakt.formular.datenschutz_link}}</a>.</p>\n    ';
  s = s.slice(0, ende) + zeile + s.slice(ende);
  writeFileSync(p, s, 'utf8');
  console.log(`   ok  ${datei}: Datenschutzhinweis mit Link`);
}

// ---------- 3 und 4 auf der Startseite ----------
const iPfad = join(root, 'pages', 'index.html');
let idx = readFileSync(iPfad, 'utf8');

const cur = '#bubbles{position:absolute; inset:0; z-index:1; cursor:crosshair}';
if (idx.includes(cur)) {
  idx = idx.replace(cur,
    '/* Fadenkreuz hiess «hier laesst sich etwas setzen». Zu tun ist nichts ausser\n'
    + '   Blasen zerplatzen, und das steht nirgends. Der gewoehnliche Zeiger sagt die\n'
    + '   Wahrheit. */\n'
    + '#bubbles{position:absolute; inset:0; z-index:1}');
  console.log('   ok  Fadenkreuz entfernt');
}

const knopf = '<button class="btn btn-ghost" id="tugBtn" disabled style="opacity:.4">{{t:start.clicklock.knopf_ziehen}}</button>';
if (idx.includes(knopf)) {
  idx = idx.replace(knopf, knopf
    + '\n          <span class="cl-warum">{{t:start.clicklock.knopf_ziehen_warum}}</span>');
  console.log('   ok  toter Knopf bekommt einen Grund');
}
writeFileSync(iPfad, idx, 'utf8');

// ---------- Der Satz dazu ----------
const TEXTE = {
  de: 'Erst nach dem Klick',
  en: 'Only after the click',
  fr: 'Seulement après le clic',
};
for (const sp of ['de', 'en', 'fr']) {
  const p = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(p, 'utf8'));
  if (w['start.clicklock.knopf_ziehen_warum']) continue;
  w['start.clicklock.knopf_ziehen_warum'] = TEXTE[sp];
  writeFileSync(p, JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]])), null, 1) + '\n', 'utf8');
  console.log(`   ok  ${sp}: Grund fuer den toten Knopf`);
}
console.log('');
console.log('Vier Befunde behoben.');
