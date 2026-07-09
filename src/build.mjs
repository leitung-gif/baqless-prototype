import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const imgDir = join(root, 'img');

// --- Fonts: keep only latin-subset @font-face blocks, inline woff2 as data URIs ---
const css = readFileSync(join(root, 'fonts', 'fonts.css'), 'utf8');
const blocks = css.split('@font-face').slice(1).map(b => '@font-face' + b.slice(0, b.indexOf('}') + 1));
const latin = blocks.filter(b => b.includes('U+0000-00FF'));
const urlCache = new Map();
async function fetchB64(url) {
  if (urlCache.has(url)) return urlCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font fetch ${res.status}: ${url}`);
  const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  const uri = `data:font/woff2;base64,${b64}`;
  urlCache.set(url, uri);
  return uri;
}
let fontCss = '';
for (const b of latin) {
  const m = b.match(/url\((https:[^)]+)\)/);
  const uri = await fetchB64(m[1]);
  fontCss += b.replace(m[1], uri).replace(/\s*unicode-range:[^;]+;/, '') + '\n';
}
console.log(`fonts: ${latin.length} latin blocks, ${urlCache.size} unique files`);

// --- Images + videos as data URIs ---
const imgs = {};
for (const f of readdirSync(imgDir)) {
  const key = f.replace(/\.(jpg|png|mp4)$/, '');
  const mime = f.endsWith('.png') ? 'image/png' : f.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
  imgs[key] = `data:${mime};base64,${readFileSync(join(imgDir, f)).toString('base64')}`;
}
console.log(`images: ${Object.keys(imgs).length}`);

// --- Assemble ---
let html = readFileSync(join(root, 'site.html'), 'utf8');
html = html.replace('/*{{FONTS}}*/', fontCss);
const missing = [];
html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
  if (!imgs[k]) { missing.push(k); return ''; }
  return imgs[k];
});
if (missing.length) console.warn('MISSING TOKENS:', missing.join(', '));
const out = join(root, 'baqless-prototype.html');
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
