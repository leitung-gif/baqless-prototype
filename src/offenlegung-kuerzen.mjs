/**
 * Kuerzt den Offenlegungs-Abschnitt der Journalseite auf eine Quellenzeile.
 *
 *   node src/offenlegung-kuerzen.mjs
 *
 * Der Abschnitt hiess «Damit klar ist, woher diese Seite kommt» und stand als eigener
 * Block mit Ueberschrift und zwei Spalten am Fuss der Seite. Darin: wer uebersetzt hat,
 * dass die Freigabe der Portraetierten noch aussteht, dass drei weitere Portraets in der
 * Ablage liegen, und wann Schweizer Stationen die japanischen ersetzen.
 *
 * Das ist eine Notiz an uns selbst auf einer Kundenseite. Sie nennt unsere Agentur, sie
 * erklaert Arbeitsablaeufe, die niemanden betreffen, und der Satz ueber die ausstehende
 * Freigabe sagt der Leserin nebenbei, dass hier gerade Portraets ohne Freigabe stehen.
 *
 * Was bleibt und bleiben muss: woher die Texte stammen und dass genau eine Zeile
 * woertlich zitiert ist. Wer fremden Text zusammenfasst, nennt die Quelle. Das ist
 * Redlichkeit gegenueber der Leserin, keine Buchhaltung, und es passt in eine Zeile.
 *
 * Die Sprungmarke bleibt, damit kein Verweis ins Leere geht. Der Eintrag im
 * Seitenverzeichnis faellt weg: eine Zeile ist kein Abschnitt.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const seite = join(root, 'pages', 'journal.html');
let s = readFileSync(seite, 'utf8');
let fehler = 0;

// ---------- 1. Der Block wird eine Zeile ----------
const block = /  <div class="kolo" id="offenlegung">[\s\S]*?\n  <\/div>\n/;
if (!block.test(s)) { console.error('ABBRUCH: Block nicht gefunden'); fehler++; }
else {
  s = s.replace(block, '  <p class="jquelle" id="offenlegung">{{t:journal.quelle.zeile}}</p>\n');
  console.log('   ok  Block auf eine Quellenzeile gekuerzt');
}

// ---------- 2. Eintrag im Seitenverzeichnis ----------
const eintrag = /\s*<a href="#offenlegung" data-n="\d+">\{\{t:journal\.index\.offenlegung\}\}<\/a>/;
if (eintrag.test(s)) {
  s = s.replace(eintrag, '');
  console.log('   ok  Eintrag im Seitenverzeichnis entfernt');
} else {
  console.log('   Eintrag im Seitenverzeichnis nicht gefunden');
}

// ---------- 3. Stil fuer die Zeile ----------
if (!s.includes('.jquelle{')) {
  const i = s.indexOf('</style>');
  if (i < 0) { console.error('ABBRUCH: kein style-Block'); fehler++; }
  else {
    s = s.slice(0, i) + `
/* Die Quellenangabe steht als Zeile am Fuss, nicht als Abschnitt mit Ueberschrift.
   Woher ein Text stammt, gehoert auf die Seite. Wie er entstanden ist, nicht. */
.jquelle{max-width:1180px; margin:0 auto;
  padding:0 var(--pad) clamp(48px,6vw,76px);
  font-size:13px; line-height:1.7; color:var(--ink-soft); max-width:78ch}
` + s.slice(i);
    console.log('   ok  Stil fuer die Quellenzeile');
  }
}

if (fehler) process.exit(1);
writeFileSync(seite, s, 'utf8');

// ---------- 4. Die Texte ----------
const NEU = {
  de: 'Die Porträts erschienen im japanischen Baqless-Journal, Text von Soichi Toyama, '
    + 'Fotografie von Akane Watanabe. Wörtlich zitiert ist einzig die hervorgehobene Zeile '
    + 'von Taeko Wako, alles andere ist zusammengefasst. Die Stationen oben sind in Japan.',
  en: 'The portraits appeared in the Japanese Baqless journal, text by Soichi Toyama, '
    + 'photography by Akane Watanabe. The only literal quotation is the highlighted line '
    + 'from Taeko Wako, everything else is summarised. The stops above are in Japan.',
  fr: 'Les portraits ont paru dans le journal Baqless japonais, texte de Soichi Toyama, '
    + 'photographie d’Akane Watanabe. La seule citation littérale est la ligne mise en '
    + 'évidence de Taeko Wako, tout le reste est résumé. Les étapes ci-dessus se situent au Japon.',
};
const WEG = ['journal.kolophon.kick', 'journal.kolophon.titel', 'journal.index.offenlegung',
             'journal.hinweis.herkunft.titel', 'journal.hinweis.herkunft.text',
             'journal.hinweis.schweiz.titel', 'journal.hinweis.schweiz.text'];

for (const [sp, zeile] of Object.entries(NEU)) {
  const p = join(root, 'i18n', `${sp}.json`);
  const w = JSON.parse(readFileSync(p, 'utf8'));
  w['journal.quelle.zeile'] = zeile;
  let weg = 0;
  for (const k of WEG) if (k in w) { delete w[k]; weg++; }
  writeFileSync(p, JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k => [k, w[k]])), null, 1) + '\n', 'utf8');
  console.log(`   ok  ${sp}.json: Quellenzeile gesetzt, ${weg} Schluessel entfernt`);
}

console.log('');
console.log('Aus einem Abschnitt ueber uns wurde eine Zeile ueber die Quelle.');
