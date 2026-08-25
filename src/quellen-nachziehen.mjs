/**
 * Zieht die Uebersetzungsquellen auf den Stand der ausgelieferten Woerterbuecher.
 *
 *   node src/quellen-nachziehen.mjs
 *
 * BEFUND. src/i18n/en.json und fr.json entstehen laut i18n-zusammenfuegen.mjs und
 * README aus src/i18n/uebersetzung/<sprache>/*.json. Alle Korrekturen der letzten
 * Wochen wurden aber in den fertigen Dateien gemacht, nicht in den Quellen. Ein
 * regulaerer Merge wuerde 25 englische und 30 franzoesische Werte zurueckdrehen,
 * darunter:
 *
 *   die Gratisversand-Schwelle CHF 120 zurueck auf CHF 99
 *   die entschaerfte Zollzusage zurueck auf die unbedingte Fassung
 *   den Hinweis auf die gesetzlichen Rechte neben der Jahresgarantie
 *   die Beschreibung der Kassenseite mit «duties included»
 *
 * NICHT ALLES IST EINSEITIG. Bei foot.support.versand hat die Quelle recht
 * («Livraison et retours»), die fertige Datei traegt faelschlich «&amp;». Das
 * Franzoesische schreibt «et», so steht es auch im Kopf von i18n-pruef.mjs.
 * Darum wird nicht pauschal ueberschrieben.
 *
 * Uebernommen wird nur, was nachweislich neuer ist: die Schluessel, die seit
 * f63526d in den fertigen Dateien geaendert wurden, und jeder Quellwert, der
 * noch die alte Schwelle CHF 99 nennt. Alles andere bleibt stehen und wird
 * gemeldet, damit jemand hinsieht.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const MEINE = [
  'faq.a.garantie', 'faq.garantie.antwort', 'js.kasse.ausverkauft_titel',
  'kaufweg.best.liefer.hinweis', 'recht.agb.kern.vertrag.text', 'recht.agb.vertrag.text',
  'recht.agb.zahlung.text', 'recht.datenschutz.cookies.text', 'recht.datenschutz.cookies.titel',
  'recht.widerruf.zoll.text', 'start.fragen.drei_antwort', 'start.mechanik.mm',
  'start.mechanik.nachher_s2', 'start.mechanik.nachher_s3', 'start.mechanik.s1',
  'start.mechanik.schnitt', 'start.mechanik.vorher_s2', 'start.mechanik.vorher_s3',
];

let gesamt = 0, offen = [];
for (const sp of ['en', 'fr']) {
  const fertig = JSON.parse(readFileSync(join(root, 'i18n', `${sp}.json`), 'utf8'));
  const ordner = join(root, 'i18n', 'uebersetzung', sp);
  for (const datei of readdirSync(ordner).filter(f => f.endsWith('.json'))) {
    const pfad = join(ordner, datei);
    let roh;
    try { roh = JSON.parse(readFileSync(pfad, 'utf8')); } catch { continue; }
    if (Array.isArray(roh) || typeof roh !== 'object') continue;
    let n = 0;
    for (const k of Object.keys(roh)) {
      if (!(k in fertig) || typeof roh[k] !== 'string' || roh[k] === fertig[k]) continue;
      const meiner = MEINE.includes(k);
      const alteSchwelle = /CHF\s*99\b/.test(roh[k]);
      if (meiner || alteSchwelle) { roh[k] = fertig[k]; n++; }
      else offen.push(`${sp}/${datei}: ${k}`);
    }
    if (n) {
      writeFileSync(pfad, JSON.stringify(roh, null, 1) + '\n', 'utf8');
      console.log(`   ok  ${sp}/${datei}: ${n} Werte nachgezogen`);
      gesamt += n;
    }
  }
}

// Das verbindliche Glossar nennt dieselbe alte Schwelle.
const gPfad = join(root, 'i18n', 'GLOSSAR.md');
let g = readFileSync(gPfad, 'utf8');
if (g.includes('CHF 99')) {
  g = g.replace(/CHF 99/g, 'CHF 120');
  writeFileSync(gPfad, g, 'utf8');
  console.log('   ok  GLOSSAR.md: CHF 99 -> CHF 120');
}

console.log('');
console.log(`${gesamt} Quellwerte nachgezogen.`);
if (offen.length) {
  console.log(`${offen.length} weitere Abweichungen NICHT angetastet, bitte ansehen:`);
  for (const x of offen.slice(0, 12)) console.log(`   ${x}`);
}
