/**
 * Gibt allen 45 Seiten eine Link-Vorschau und haelt den Prototyp aus dem Index.
 *
 *   node src/vorschau-und-noindex.mjs
 *
 * ZWEI BEFUNDE, beide betreffen genau den Link, der diese Woche verschickt wird:
 *
 * 1. NULL og-Angaben. In WhatsApp, Mail und Slack erscheint der Link als graue
 *    Flaeche ohne Bild, Titel und Text. Vier Leute sollen den Auftritt begutachten
 *    und bekommen als Erstes einen leeren Kasten.
 *
 * 2. robots.txt sagt «Allow: /», und jede Seite traegt eine kanonische Adresse auf
 *    baqless.com, wo es sie nicht gibt. Eine Suchmaschine darf den Prototyp also
 *    indexieren und findet einen Verweis auf eine leere Adresse der echten Domain.
 *    Der Verweis selbst ist richtig, er ist die Blaupause fuer den spaeteren Shop.
 *    Falsch ist nur, dass der Prototyp gefunden werden darf.
 *
 * Beides wird zusammen geloest: der Prototyp traegt noindex und seine Vorschau
 * zeigt auf seine eigene Adresse, nicht auf baqless.com. Beim Livegang faellt der
 * Block PROTOTYP weg, dann greifen wieder Kanonik und Vorschau auf der echten Domain.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
let fehler = 0;

// ---------- 1. Bau: Tokens fuer Vorschau und Indexierung ----------
const bau = join(root, 'build.mjs');
let b = readFileSync(bau, 'utf8');

if (!b.includes('{{VORSCHAU}}')) {
  const marke = "      .replace(/\\{\\{HREFLANG\\}\\}/g, hreflang)";
  if (!b.includes(marke)) { console.error('ABBRUCH: Ankerstelle in build.mjs nicht gefunden'); process.exit(1); }
  const neu = marke + `
      .replace(/\\{\\{VORSCHAU\\}\\}/g, vorschau(s, page, wb))`;
  b = b.replace(marke, neu);

  // Die Funktion selbst, vor den Bau gestellt
  const funk = `
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
  const adresse = \`\${PROTO_HOST}/\${s.ordner ? s.ordner + '/' : ''}\${page}\`;
  const bild = \`\${PROTO_HOST}/vorschau-\${s.code}.png\`;
  return [
    '<meta name="robots" content="noindex,nofollow">',
    \`<meta property="og:type" content="\${ist_start ? 'website' : 'article'}">\`,
    '<meta property="og:site_name" content="Baqless">',
    \`<meta property="og:locale" content="\${s.locale.replace('-', '_')}">\`,
    \`<meta property="og:title" content="\${titel.replace(/"/g, '&quot;')}">\`,
    \`<meta property="og:description" content="\${text.replace(/"/g, '&quot;')}">\`,
    \`<meta property="og:url" content="\${adresse}">\`,
    \`<meta property="og:image" content="\${bild}">\`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">',
    \`<meta name="twitter:title" content="\${titel.replace(/"/g, '&quot;')}">\`,
    \`<meta name="twitter:description" content="\${text.replace(/"/g, '&quot;')}">\`,
    \`<meta name="twitter:image" content="\${bild}">\`,
  ].join('\\n');
}
`;
  const anker = 'const HOST = ';
  const i = b.indexOf(anker);
  const zeilenende = b.indexOf('\n', i) + 1;
  b = b.slice(0, zeilenende) + funk + b.slice(zeilenende);
  writeFileSync(bau, b, 'utf8');
  console.log('   ok  build.mjs: Vorschau und noindex');
} else {
  console.log('   schon da: build.mjs');
}

// ---------- 2. Das Token in jede Quellseite ----------
const seiten = join(root, 'pages');
let gesetzt = 0;
for (const f of readdirSync(seiten).filter(x => x.endsWith('.html'))) {
  const p = join(seiten, f);
  let s = readFileSync(p, 'utf8');
  if (s.includes('{{VORSCHAU}}')) continue;
  const marke = '{{HREFLANG}}';
  if (!s.includes(marke)) { console.error(`   FEHLT: ${f} hat kein {{HREFLANG}}`); fehler++; continue; }
  s = s.replace(marke, marke + '\n{{VORSCHAU}}');
  writeFileSync(p, s, 'utf8');
  gesetzt++;
}
console.log(`   ok  ${gesetzt} Quellseiten mit {{VORSCHAU}}`);

// ---------- 3. robots.txt ----------
const rob = join(root, '..', 'robots.txt');
const inhalt = `# PROTOTYP. Dieser Auftritt liegt zur Begutachtung auf GitHub Pages und gehoert
# nicht in den Suchindex: seine kanonischen Adressen zeigen auf baqless.com, wo es
# diese Seiten noch nicht gibt. Beim Livegang wird diese Datei ersetzt, dann gilt
# wieder Allow mit den Ausnahmen fuer Kasse, Bestellung und die Pruefdateien.
User-agent: *
Disallow: /
`;
writeFileSync(rob, inhalt, 'utf8');
console.log('   ok  robots.txt: Prototyp gesperrt');

if (fehler) process.exit(1);
console.log('');
console.log('Vorschau und Indexierungssperre gesetzt. Beides faellt beim Livegang weg.');
