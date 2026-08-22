/**
 * Baut die drei Vorschaubilder, 1200 mal 630, eines je Sprache.
 *
 *   node src/vorschaubilder-bauen.mjs
 *
 * Das Bild, das in WhatsApp, Mail und Slack unter dem Link erscheint. Es traegt
 * nichts als die Marke, den Anspruch und den Hinweis, dass dies ein Prototyp ist.
 * Farben und Schriften kommen aus dem Handbuch, die Wortmarke aus der freigegebenen
 * Datei. Gold nur auf Navy, wie 03.4 es verlangt.
 *
 * Beim Livegang werden die Bilder ersetzt: dann faellt der Prototyp-Vermerk weg und
 * an seine Stelle gehoert eine Aufnahme des Produkts.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const wurzel = join(root, '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const SPRACHEN = {
  de: { claim: 'Ein Klick. Kein Zurück.', unter: 'Ohrringe ohne Rückteil',
        marke: 'Prototyp', fuss: 'Zur Begutachtung · nichts bestellbar' },
  en: { claim: 'One click. No going back.', unter: 'Earrings without a back',
        marke: 'Prototype', fuss: 'For review · nothing can be ordered' },
  fr: { claim: 'Un clic. Sans retour.', unter: 'Boucles sans poussoir',
        marke: 'Prototype', fuss: 'Pour relecture · rien n’est commandable' },
};

const fonts = readFileSync(join(root, 'fonts', 'fonts-inline.css'), 'utf8');
const logo = readFileSync(join(root, 'img', 'logo_white.png')).toString('base64');

// Der Anspruch besteht immer aus zwei Saetzen. Eine Zeile je Satz, der zweite kursiv
// in Gold, und keine Zeile bricht um: bei 82px reisst jeder Umbruch das Bild.
const zweizeilig = (claim) => {
  const teile = claim.match(/[^.]+\./g) || [claim];
  return teile
    .map((t, i) => (i === teile.length - 1
      ? `<span><em>${t.trim()}</em></span>`
      : `<span>${t.trim()}</span>`))
    .join('');
};

const seite = (t) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${fonts}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#0B1D3F; color:#FAF7F2; font-family:'Inter',sans-serif;
  display:flex; flex-direction:column; justify-content:space-between;
  padding:64px 72px; position:relative}
.ring{position:absolute; border-radius:50%; pointer-events:none}
.r1{width:520px;height:520px;border:2px solid rgba(217,193,160,.22); right:-150px; top:-170px}
.r2{width:240px;height:240px;background:rgba(255,122,106,.16); right:120px; bottom:-90px}
.r3{width:90px;height:90px;border:2px solid rgba(125,111,214,.35); left:58%; top:78px}
.kopf{display:flex; align-items:center; justify-content:space-between; position:relative; z-index:2}
.wm{height:44px; width:auto; display:block}
.marke{font-size:15px; font-weight:600; letter-spacing:.18em; text-transform:uppercase;
  color:#0B1D3F; background:#D9C1A0; padding:8px 18px; border-radius:3px}
.mitte{position:relative; z-index:2}
.claim{font-family:'Cormorant Garamond',Georgia,serif; font-weight:300;
  font-size:82px; line-height:1.08; letter-spacing:-.01em}
.claim span{display:block; white-space:nowrap}
.claim em{font-style:italic; color:#D9C1A0}
.unter{margin-top:26px; font-size:24px; line-height:1.4;
  color:rgba(250,247,242,.72); white-space:nowrap}
.fuss{position:relative; z-index:2; display:flex; align-items:center; gap:14px;
  font-size:17px; color:rgba(250,247,242,.55)}
.punkt{width:9px;height:9px;border-radius:50%;background:#FF7A6A;flex:none}
</style></head><body>
  <div class="ring r1"></div><div class="ring r2"></div><div class="ring r3"></div>
  <div class="kopf">
    <img class="wm" src="data:image/png;base64,${logo}" alt="Baqless">
    <span class="marke">${t.marke}</span>
  </div>
  <div class="mitte">
    <div class="claim">${zweizeilig(t.claim)}</div>
    <div class="unter">${t.unter}</div>
  </div>
  <div class="fuss"><span class="punkt"></span>${t.fuss}</div>
</body></html>`;

for (const [code, t] of Object.entries(SPRACHEN)) {
  const tmp = join(wurzel, `_vorschau_${code}.html`);
  const ziel = join(wurzel, `vorschau-${code}.png`);
  writeFileSync(tmp, seite(t), 'utf8');
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--window-size=1200,630', `--screenshot=${ziel}`, `file:///${tmp.replace(/\\/g, '/')}`],
    { stdio: 'ignore' });
  unlinkSync(tmp);
  const kb = existsSync(ziel) ? Math.round(readFileSync(ziel).length / 1024) : 0;
  console.log(`   ok  vorschau-${code}.png  ${kb} KB`);
}
console.log('');
console.log('Drei Vorschaubilder gebaut. Beim Livegang durch eine Produktaufnahme ersetzen.');
