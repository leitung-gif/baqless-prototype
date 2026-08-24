/**
 * Nimmt die eingebrannten Werbeaussagen aus der Story-Collage.
 *
 *   node src/bilder-ohne-aussagen.mjs
 *
 * BEFUND. Zwei der drei Collage-Bilder auf der Startseite tragen Text im Bild:
 *
 *   life3.jpg  «HYPOALLERGENIC EARRINGS», dazu «Made of medical grade surgical
 *              stainless steel, They are less likely to cause allergic reactions.»
 *   life2.jpg  «SWISS-BORN LOYAL EARRINGS», dazu drei Haken:
 *              Hypoallergenic, Always secure, Rust-proof.
 *
 * Das verletzt vier Festlegungen auf einmal: die Vertraeglichkeitsaussage ohne
 * den Nickel-Pruefbericht, die Herkunftsaussage (erlaubt ist nur «Entwickelt in
 * der Schweiz, von Hand gefertigt», ungeteilt), «Always secure» als unbedingte
 * Zusicherung, und die Materialangabe: die Bilder sagen, der Schmuck sei aus
 * Edelstahl, die Produktseiten sagen Sterling Silber 925 mit Stift aus Edelstahl.
 *
 * Die Pruefung auf «hypoallergen» gibt es laengst, in i18n-pruef.mjs. Sie liest
 * Woerterbuecher, keine Rasterbilder. Die Wache stand und hatte genau dort ihr
 * Loch. Darum kommt mit dieser Aenderung ein Verzeichnis dazu, siehe bilder-pruef.mjs.
 *
 * WAS HIER PASSIERT. Nicht loeschen, sondern beschneiden: die Aufnahmen selbst
 * sind gut und gehoeren dem Kunden. Geschnitten wird oberhalb der Textbaender,
 * quadratisch, weil .collage .sq mit aspect-ratio 1 und object-fit cover sonst
 * ein zweites Mal beschneidet. Die Originale bleiben unangetastet liegen.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const hart = (b, t) => { if (!b) { console.error('ABBRUCH: ' + t); process.exit(1); } };

// ---------- 1. Die Schnitte ----------
// Kante grosszuegig oberhalb des ersten Textbandes: lieber etwas Produkt
// verlieren als eine Aussage stehen lassen. Beide Ergebnisse wurden angesehen.
const PLAN = { life2: [150, 0, 810, 660], life3: [200, 0, 730, 530] };
const py = `
from PIL import Image
import json, sys
plan = json.loads(sys.argv[1]); ordner = sys.argv[2]
for n, (l, o, r, u) in plan.items():
    im = Image.open('%s/%s.jpg' % (ordner, n)).convert('RGB')
    aus = im.crop((l, o, r, u))
    assert aus.width == aus.height, n + ' ist nicht quadratisch'
    aus.save('%s/%sb.jpg' % (ordner, n), quality=92)
    print('   ok  %sb.jpg  %dx%d aus %dx%d' % (n, aus.width, aus.height, im.width, im.height))
`;
const img = join(root, 'img');
writeFileSync(join(root, '_schnitt.py'), py, 'utf8');
console.log(execFileSync('python', ['-X', 'utf8', join(root, '_schnitt.py'), JSON.stringify(PLAN), img],
  { encoding: 'utf8' }).trim());
for (const n of Object.keys(PLAN)) hart(existsSync(join(img, `${n}b.jpg`)), `${n}b.jpg nicht entstanden`);

// ---------- 2. Die Startseite zeigt auf die geschnittenen Fassungen ----------
const pfad = join(root, 'pages', 'index.html');
let s = readFileSync(pfad, 'utf8');
for (const n of Object.keys(PLAN)) {
  const alt = `src="{{${n}}}"`;
  hart(s.split(alt).length - 1 === 1, `${alt} kommt nicht genau einmal vor`);
  s = s.replace(alt, `src="{{${n}b}}"`);
  console.log(`   ok  Collage zeigt auf {{${n}b}}`);
}
// Die Originale bleiben liegen, aber niemand verweist mehr auf sie.
for (const n of Object.keys(PLAN))
  hart(!s.includes(`{{${n}}}`), `{{${n}}} steht noch in der Startseite`);
writeFileSync(pfad, s, 'utf8');

console.log('');
console.log('Die Aufnahmen bleiben, die Aussagen sind weg. Originale unangetastet in src/img/.');
