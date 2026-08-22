import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, '..');

// --- Sprachen: Deutsch liegt im Wurzelverzeichnis, die anderen in Unterordnern ---
// Genau so bedient Shopify Sprachfassungen: gleicher Dateiname, Praefix im Pfad.
const SPRACHEN = [
  { code: 'de', ordner: '', basis: '', hreflang: 'de', locale: 'de-CH', name: 'Deutsch', xdefault: true },
  { code: 'en', ordner: 'en', basis: '../', hreflang: 'en', locale: 'en-GB', name: 'English' },
  { code: 'fr', ordner: 'fr', basis: '../', hreflang: 'fr', locale: 'fr-CH', name: 'Français' },
];
const HOST = 'https://baqless.com';

// ---------- Link-Vorschau und Indexierung ----------
// PROTOTYP: Solange der Auftritt auf GitHub Pages liegt, zeigt die Vorschau auf diese
// Adresse und die Seite traegt noindex. Beim Livegang faellt PROTO_HOST weg, dann
// greifen Kanonik und Vorschau auf der echten Domain. Ohne dieses Paar erscheint der
// Link als graue Flaeche und der Prototyp steht im Suchindex.
const PROTO_HOST = 'https://leitung-gif.github.io/baqless-prototype';

function vorschau(s, page, wb) {
  const ist_start = page === 'index.html';
  const titel = (wb['seite.' + page.replace('.html', '') + '.titel'] || wb['seite.index.titel'] || 'Baqless');
  const text = (wb['seite.' + page.replace('.html', '') + '.beschreibung'] || wb['seite.index.beschreibung'] || '');
  const adresse = `${PROTO_HOST}/${s.ordner ? s.ordner + '/' : ''}${page}`;
  const bild = `${PROTO_HOST}/vorschau-${s.code}.png`;
  return [
    '<meta name="robots" content="noindex,nofollow">',
    `<meta property="og:type" content="${ist_start ? 'website' : 'article'}">`,
    '<meta property="og:site_name" content="Baqless">',
    `<meta property="og:locale" content="${s.locale.replace('-', '_')}">`,
    `<meta property="og:title" content="${titel.replace(/"/g, '&quot;')}">`,
    `<meta property="og:description" content="${text.replace(/"/g, '&quot;')}">`,
    `<meta property="og:url" content="${adresse}">`,
    `<meta property="og:image" content="${bild}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${titel.replace(/"/g, '&quot;')}">`,
    `<meta name="twitter:description" content="${text.replace(/"/g, '&quot;')}">`,
    `<meta name="twitter:image" content="${bild}">`,
  ].join('\n');
}

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

// --- Woerterbuecher ---
const i18nPfad = join(root, 'i18n');
const woerter = {};
for (const s of SPRACHEN) {
  const p = join(i18nPfad, `${s.code}.json`);
  woerter[s.code] = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
}
const basisSprache = 'de';
console.log(`i18n: ${SPRACHEN.map(s => `${s.code} ${Object.keys(woerter[s.code]).length}`).join(', ')} Schluessel`);

// --- Produktdaten: mehrsprachige Felder je Sprache flach ziehen ---
const produkteRoh = JSON.parse(readFileSync(join(root, 'data', 'products.json'), 'utf8'));
const stimmenRoh = JSON.parse(readFileSync(join(root, 'data', 'stimmen.json'), 'utf8'));

/** Ein Feld kann ein String sein oder ein Objekt mit Sprachcodes. */
function feldFuer(wert, code, fehlend, wo) {
  if (wert === null || typeof wert !== 'object' || Array.isArray(wert)) return wert;
  const codes = Object.keys(wert);
  const istSprachfeld = codes.length > 0 && codes.every(k => SPRACHEN.some(s => s.code === k));
  if (!istSprachfeld) {
    const kopie = Array.isArray(wert) ? [] : {};
    for (const k of codes) kopie[k] = feldFuer(wert[k], code, fehlend, `${wo}.${k}`);
    return kopie;
  }
  if (wert[code] !== undefined && wert[code] !== '') return wert[code];
  fehlend.push(`${wo} (${code})`);
  return wert[basisSprache];
}

function datenFuer(daten, code, fehlend, wo) {
  if (Array.isArray(daten)) return daten.map((d, i) => datenFuer(d, code, fehlend, `${wo}[${i}]`));
  if (daten && typeof daten === 'object') {
    const codes = Object.keys(daten);
    const istSprachfeld = codes.length > 0 && codes.every(k => SPRACHEN.some(s => s.code === k));
    if (istSprachfeld) return feldFuer(daten, code, fehlend, wo);
    const kopie = {};
    for (const k of codes) kopie[k] = datenFuer(daten[k], code, fehlend, `${wo}.${k}`);
    return kopie;
  }
  return daten;
}

// --- Seiten bauen, je Sprache ---
const seiten = readdirSync(join(root, 'pages')).filter(p => p.endsWith('.html'));
const fehlendeSchluessel = {};
const fehlendeDaten = {};

for (const s of SPRACHEN) {
  const zielOrdner = s.ordner ? join(repoRoot, s.ordner) : repoRoot;
  if (s.ordner && !existsSync(zielOrdner)) mkdirSync(zielOrdner, { recursive: true });

  const fehlendD = [];
  const produkte = datenFuer(produkteRoh, s.code, fehlendD, 'products');
  const stimmen = datenFuer(stimmenRoh, s.code, fehlendD, 'stimmen');
  if (fehlendD.length) fehlendeDaten[s.code] = fehlendD;

  const wb = woerter[s.code];
  const wbBasis = woerter[basisSprache];
  const fehlendK = new Set();
  const uebersetze = (_, key) => {
    if (wb[key] !== undefined) return wb[key];
    fehlendK.add(key);
    return wbBasis[key] !== undefined ? wbBasis[key] : `[[${key}]]`;
  };

  let gesamtGroesse = 0;
  for (const page of seiten) {
    let html = readFileSync(join(root, 'pages', page), 'utf8');

    // 1. Strukturtokens (Reihenfolge wichtig: SHARED_JS enthaelt PRODUCTS_JSON-Token)
    html = html
      .replace('{{CSS}}', css)
      .replace('{{HEADER}}', header)
      .replace('{{FOOTER}}', footer)
      .replace('{{DRAWER}}', drawer)
      .replace('{{SHARED_JS}}', sharedJs)
      .replace('{{PRODUCTS_JSON}}', JSON.stringify(produkte))
      .replace('{{STIMMEN_JSON}}', JSON.stringify(stimmen));

    // Schriften in die eingesetzte CSS
    html = html.replace('/*{{FONTS}}*/', fontCss);

    // 2. Sprachtokens, vor dem Bildpass, weil sie sonst als fehlende Bilder gelten
    const andere = SPRACHEN.filter(x => x.code !== s.code);
    const hreflang = [...SPRACHEN.map(x =>
      `<link rel="alternate" hreflang="${x.hreflang}" href="${HOST}/${x.ordner ? x.ordner + '/' : ''}${page}">`),
      `<link rel="alternate" hreflang="x-default" href="${HOST}/${page}">`].join('\n');

    html = html
      .replace(/\{\{LANG\}\}/g, s.code)
      .replace(/\{\{LOCALE\}\}/g, s.locale)
      .replace(/\{\{LANGNAME\}\}/g, s.name)
      .replace(/\{\{LANGCODE_OBEN\}\}/g, s.code.toUpperCase())
      .replace(/\{\{BASE\}\}/g, s.basis)
      .replace(/\{\{CANONICAL\}\}/g, `${HOST}/${s.ordner ? s.ordner + '/' : ''}${page}`)
      .replace(/\{\{HREFLANG\}\}/g, hreflang)
      .replace(/\{\{VORSCHAU\}\}/g, vorschau(s, page, wb))
      .replace(/\{\{I18N_JSON\}\}/g, JSON.stringify({
        lang: s.code, locale: s.locale, basis: s.basis,
        sprachen: SPRACHEN.map(x => ({ code: x.code, name: x.name, ordner: x.ordner })),
        t: wb,
      }));

    // 3. Uebersetzungstokens
    html = html.replace(/\{\{t:([A-Za-z0-9_.-]+)\}\}/g, uebersetze);

    // 4. Bild- und Videotokens
    const missing = [];
    html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      if (!imgs[k]) { missing.push(k); return ''; }
      return imgs[k];
    });
    if (missing.length) console.warn(`  ${s.code}/${page} — MISSING TOKENS:`, [...new Set(missing)].join(', '));

    writeFileSync(join(zielOrdner, page), html);
    gesamtGroesse += html.length;
  }
  if (fehlendK.size) fehlendeSchluessel[s.code] = [...fehlendK];
  console.log(`${s.code}: ${seiten.length} Seiten, ${(gesamtGroesse / 1024 / 1024).toFixed(1)} MB -> ${s.ordner || '.'}/`);
}

// --- Sitemap ueber alle Sprachfassungen ---
const eintraege = [];
for (const s of SPRACHEN) {
  for (const page of seiten) {
    const url = `${HOST}/${s.ordner ? s.ordner + '/' : ''}${page}`;
    const alt = SPRACHEN.map(x =>
      `    <xhtml:link rel="alternate" hreflang="${x.hreflang}" href="${HOST}/${x.ordner ? x.ordner + '/' : ''}${page}"/>`).join('\n');
    eintraege.push(`  <url>\n    <loc>${url}</loc>\n${alt}\n  </url>`);
  }
}
writeFileSync(join(repoRoot, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${eintraege.join('\n')}\n</urlset>\n`);
console.log(`sitemap: ${eintraege.length} URLs`);

// --- Warnungen zum Schluss, damit sie nicht im Log untergehen ---
for (const [code, liste] of Object.entries(fehlendeSchluessel)) {
  console.warn(`  WARNUNG ${code}: ${liste.length} fehlende Schluessel, Deutsch eingesetzt`);
  console.warn(`    ${liste.slice(0, 12).join(', ')}${liste.length > 12 ? ' …' : ''}`);
}
for (const [code, liste] of Object.entries(fehlendeDaten)) {
  const einmalig = [...new Set(liste)];
  console.warn(`  WARNUNG ${code}: ${einmalig.length} fehlende Datenfelder, Deutsch eingesetzt`);
  console.warn(`    ${einmalig.slice(0, 8).join(', ')}${einmalig.length > 8 ? ' …' : ''}`);
}
