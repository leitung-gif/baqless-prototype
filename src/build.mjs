import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, '..');

// --- Fonts: lokal inline (rekonstruiert), sonst Google-Fetch aus fonts.css ---
const inlinePath = join(root, 'fonts', 'fonts-inline.css');
let fontCss = '';
if (existsSync(inlinePath)) {
  fontCss = readFileSync(inlinePath, 'utf8');
  console.log(`fonts: inline css (${(fontCss.length / 1024).toFixed(0)} KB)`);
} else {
  const css = readFileSync(join(root, 'fonts', 'fonts.css'), 'utf8');
  const blocks = css.split('@font-face').slice(1).map(b => '@font-face' + b.slice(0, b.indexOf('}') + 1));
  const latin = blocks.filter(b => b.includes('U+0000-00FF'));
  for (const b of latin) {
    const m = b.match(/url\((https:[^)]+)\)/);
    const res = await fetch(m[1]);
    const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
    fontCss += b.replace(m[1], `data:font/woff2;base64,${b64}`).replace(/\s*unicode-range:[^;]+;/, '') + '\n';
  }
  console.log(`fonts: ${latin.length} latin blocks (fetched)`);
}

// --- Assets ---
const imgs = {};
for (const f of readdirSync(join(root, 'img'))) {
  const key = f.replace(/\.(jpg|png|mp4)$/, '');
  const mime = f.endsWith('.png') ? 'image/png' : f.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
  imgs[key] = `data:${mime};base64,${readFileSync(join(root, 'img', f)).toString('base64')}`;
}
console.log(`images: ${Object.keys(imgs).length}`);

// --- Bausteine ---
const css = readFileSync(join(root, 'styles.css'), 'utf8');
const partial = n => readFileSync(join(root, 'partials', n), 'utf8');
const header = partial('header.html');
const footer = partial('footer.html');
const drawer = partial('drawer.html');
const sharedJs = partial('shared.js');
const productsJson = readFileSync(join(root, 'data', 'products.json'), 'utf8');

// --- Seiten bauen ---
for (const page of readdirSync(join(root, 'pages'))) {
  let html = readFileSync(join(root, 'pages', page), 'utf8');
  // Struktur-Tokens zuerst (Reihenfolge wichtig: SHARED_JS enthält PRODUCTS_JSON-Token)
  html = html
    .replace('{{CSS}}', css)
    .replace('{{HEADER}}', header)
    .replace('{{FOOTER}}', footer)
    .replace('{{DRAWER}}', drawer)
    .replace('{{SHARED_JS}}', sharedJs)
    .replace('{{PRODUCTS_JSON}}', productsJson);
  // Fonts in die eingesetzte CSS
  html = html.replace('/*{{FONTS}}*/', fontCss);
  // Bild-/Video-Tokens
  const missing = [];
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!imgs[k]) { missing.push(k); return ''; }
    return imgs[k];
  });
  if (missing.length) console.warn(`  ${page} — MISSING TOKENS:`, [...new Set(missing)].join(', '));
  const out = join(repoRoot, page);
  writeFileSync(out, html);
  console.log(`wrote ${page} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
}
