/**
 * Findet Farben, die im Quellcode als Zahl stehen, statt als Token.
 *
 *   node src/farben-pruef.mjs
 *
 * Das Handbuch sagt in Kapitel 04.1: «Wer den Wert als Zahl einsetzt, statt den Namen
 * zu benutzen, baut die nächste Abweichung ein.» Dieser Prüfer misst, wie oft das
 * passiert, und schlägt für jede Fundstelle das nächstliegende Token vor.
 *
 * Illustrationen in SVG sind ausgenommen: eine Zeichnung braucht Zwischentöne, die kein
 * Bedienelement je braucht. Alles ausserhalb von <svg> gehört ins Token-System.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

// ---------- Die Token aus styles.css ----------
const css = readFileSync(join(root, 'styles.css'), 'utf8');
const TOKEN = {};
for (const m of css.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})\s*;/g)) {
  TOKEN[m[1]] = m[2].toUpperCase();
}

// ---------- Farbrechnung ----------
const zuRgb = h => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
};
const kanal = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const leuchte = h => { const [r, g, b] = zuRgb(h); return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b); };
const kontrast = (a, b) => {
  const l1 = leuchte(a), l2 = leuchte(b);
  return ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
};
// Abstand im Lab-Raum, grob, reicht fuer «welches Token ist am naechsten»
const zuLab = h => {
  let [r, g, b] = zuRgb(h).map(v => v / 255);
  [r, g, b] = [r, g, b].map(v => v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722);
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};
const abstand = (a, b) => {
  const [l1, a1, b1] = zuLab(a), [l2, a2, b2] = zuLab(b);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
};

// ---------- Fundstellen ----------
const dateien = [];
for (const [ordner, filter] of [['', f => f === 'styles.css'],
                                ['pages', f => f.endsWith('.html')],
                                ['partials', f => f.endsWith('.html') || f.endsWith('.js')]]) {
  const p = ordner ? join(root, ordner) : root;
  for (const f of readdirSync(p)) if (filter(f)) dateien.push(join(p, f));
}

const fund = new Map();          // HEX -> {n, dateien:Set, zwecke:Set}
for (const pfad of dateien) {
  let s = readFileSync(pfad, 'utf8');
  s = s.replace(/<svg[\s\S]*?<\/svg>/g, ' ');     // Illustrationen raus
  s = s.replace(/--[a-z0-9-]+\s*:\s*#[0-9A-Fa-f]{3,8}/g, ' '); // Tokendefinition selbst raus
  for (const m of s.matchAll(/(^|[^-\w])(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})\b/g)) {
    const hex = m[2].toUpperCase();
    if (!fund.has(hex)) fund.set(hex, { n: 0, dateien: new Set(), zwecke: new Set() });
    const e = fund.get(hex);
    e.n++;
    e.dateien.add(relative(root, pfad));
    const vor = s.slice(Math.max(0, m.index - 44), m.index).match(/([a-z-]+)\s*:\s*$/);
    if (vor) e.zwecke.add(vor[1]);
  }
}

// ---------- Bericht ----------
const GRUND = '#FAF7F2', PAPIER = '#FFFFFF';
const eintraege = [...fund.entries()].sort((a, b) => b[1].n - a[1].n);
let inToken = 0, hart = 0;

console.log(`Token in styles.css: ${Object.keys(TOKEN).length}`);
console.log(`Verschiedene Hexwerte ausserhalb von SVG: ${eintraege.length}`);
console.log('');
console.log('Wert      Anz  Zweck                Naechstes Token          dE   auf Ground');
console.log('-'.repeat(88));

for (const [hex, e] of eintraege) {
  const istToken = Object.entries(TOKEN).find(([, v]) => v === hex);
  if (istToken) { inToken += e.n; continue; }
  hart += e.n;
  let bestName = '', bestD = 1e9;
  for (const [name, v] of Object.entries(TOKEN)) {
    const d = abstand(hex, v);
    if (d < bestD) { bestD = d; bestName = name; }
  }
  const k = kontrast(hex, GRUND);
  console.log(`${hex}  ${String(e.n).padStart(3)}  ${[...e.zwecke].join(',').slice(0, 19).padEnd(19)}  --${bestName.padEnd(18)} ${bestD.toFixed(1).padStart(5)}  ${k.toFixed(2)}:1`);
}

console.log('');
console.log(`Farbnennungen ueber ein Token: ${inToken}`);
console.log(`Farbnennungen als harte Zahl : ${hart}`);
console.log('');
console.log('Faustregel: dE unter 3 ist mit blossem Auge kaum zu unterscheiden, unter 6 aehnlich.');
console.log('Was unter 3 liegt, gehoert ersetzt. Was darueber liegt, ist eine eigene Farbe und');
console.log('muss entweder ins Handbuch oder weg.');
