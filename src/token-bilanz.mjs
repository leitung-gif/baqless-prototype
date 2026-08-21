/**
 * Zählt, wie oft jedes Token wirklich benutzt wird.
 *
 *   node src/token-bilanz.mjs
 *
 * Ein Token, das niemand benutzt, ist kein Baustein, sondern ein Vorrat. Es gehört
 * entweder eingesetzt oder gestrichen, damit die Liste im Handbuch das beschreibt,
 * was tatsächlich gilt.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(root, 'styles.css'), 'utf8');

const block = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')));
const namen = [...block.matchAll(/--([a-zA-Z0-9_-]+)\s*:/g)].map(m => m[1]);

let quelle = '';
for (const [ordner, filter] of [['', f => f.endsWith('.css')],
                                ['pages', f => f.endsWith('.html')],
                                ['partials', f => f.endsWith('.html') || f.endsWith('.js')]]) {
  const p = ordner ? join(root, ordner) : root;
  for (const f of readdirSync(p)) if (filter(f)) quelle += readFileSync(join(p, f), 'utf8');
}

const tot = [];
console.log('Token            Wert        Verwendungen');
for (const n of [...new Set(namen)]) {
  const wert = (block.match(new RegExp(`--${n}\\s*:\\s*([^;]+)`)) || [, '?'])[1].trim().slice(0, 26);
  const v = (quelle.match(new RegExp(`var\\(--${n}[,)]`, 'g')) || []).length;
  console.log(`  --${n.padEnd(13)} ${wert.padEnd(28)} ${String(v).padStart(3)}${v === 0 ? '   UNGENUTZT' : ''}`);
  if (v === 0) tot.push(n);
}
console.log('');
console.log(`${[...new Set(namen)].length} Token, davon ungenutzt: ${tot.length ? tot.join(', ') : 'keines'}`);
