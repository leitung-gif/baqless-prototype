/**
 * Zaehlt, was nach der Umstellung noch als Zahl im Code steht, und wofuer.
 *
 *   node src/farben-restbestand.mjs
 *
 * Das Handbuch nennt in Kapitel 04.1 eine gemessene Zahl. Damit sie stimmt, muss sie
 * nachgerechnet werden, und zwar getrennt nach dem, was legitim ausserhalb des
 * Token-Systems steht, und dem, was noch aufzuraeumen ist.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dateien = [];
for (const [ordner, filter] of [['', f => f.endsWith('.css')],
                                ['pages', f => f.endsWith('.html')],
                                ['partials', f => f.endsWith('.html') || f.endsWith('.js')]]) {
  const p = ordner ? join(root, ordner) : root;
  for (const f of readdirSync(p)) if (filter(f)) dateien.push(join(p, f));
}

const gruppen = { illustration: new Map(), verlauf: new Map(), variante: new Map(),
                  druckansicht: new Map(), rest: new Map() };
const merk = (g, hex, wo) => {
  if (!gruppen[g].has(hex)) gruppen[g].set(hex, new Set());
  gruppen[g].get(hex).add(wo);
};

for (const pfad of dateien) {
  const wo = relative(root, pfad);
  let s = readFileSync(pfad, 'utf8');

  // Reihenfolge zaehlt: erst herausschneiden, was eine eigene Kategorie ist
  s = s.replace(/<svg[\s\S]*?<\/svg>/g, m => {
    for (const h of m.match(/#[0-9A-Fa-f]{3,6}\b/g) || []) merk('illustration', h.toUpperCase(), wo);
    return ' ';
  });
  s = s.replace(/@media\s+print\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, m => {
    for (const h of m.match(/#[0-9A-Fa-f]{3,6}\b/g) || []) merk('druckansicht', h.toUpperCase(), wo);
    return ' ';
  });
  s = s.replace(/pillDots\s*=\s*\{[^}]*\}/g, m => {
    for (const h of m.match(/#[0-9A-Fa-f]{3,6}\b/g) || []) merk('variante', h.toUpperCase(), wo);
    return ' ';
  });
  s = s.replace(/(linear|radial)-gradient\([^()]*(?:\([^()]*\)[^()]*)*\)/g, m => {
    for (const h of m.match(/#[0-9A-Fa-f]{3,6}\b/g) || []) merk('verlauf', h.toUpperCase(), wo);
    return ' ';
  });
  s = s.replace(/--[a-zA-Z0-9_-]+\s*:\s*#[0-9A-Fa-f]{3,8}/g, ' ');   // die Token selbst
  s = s.replace(/style="--t[12]:[^"]*"/g, m => {                      // Kollektionsverlauf, inline
    for (const h of m.match(/#[0-9A-Fa-f]{3,6}\b/g) || []) merk('verlauf', h.toUpperCase(), wo);
    return ' ';
  });

  for (const h of s.match(/(?<![-\w])#[0-9A-Fa-f]{3,6}\b/g) || []) merk('rest', h.toUpperCase(), wo);
}

const ERKLAERUNG = {
  illustration: 'Zeichnungen. Eine Illustration braucht Zwischentoene, die kein Bedienelement je braucht.',
  verlauf: 'Verlaufsstufen. Ein Verlauf besteht aus Zwischenwerten, die keine eigene Aufgabe haben.',
  variante: 'Produktfarben an den Variantenpunkten. Sie zeigen das Stueck, nicht die Marke.',
  druckansicht: 'Druckansicht. Auf Papier gilt Schwarz auf Weiss, nicht der Bildschirmgrund.',
  rest: 'Noch aufzuraeumen. Diese gehoeren entweder auf ein Token oder ins Handbuch.',
};

let gesamt = 0;
for (const [name, karte] of Object.entries(gruppen)) {
  console.log(`${name.toUpperCase()}  ${karte.size} verschiedene`);
  console.log(`   ${ERKLAERUNG[name]}`);
  if (name === 'rest' || karte.size <= 12) {
    for (const [h, wos] of [...karte].sort()) console.log(`   ${h}  ${[...wos].join(', ').slice(0, 66)}`);
  }
  console.log('');
  gesamt += karte.size;
}
console.log(`Zusammen ${gesamt} verschiedene Hexwerte ausserhalb der Token.`);
console.log(`Davon noch aufzuraeumen: ${gruppen.rest.size}`);
