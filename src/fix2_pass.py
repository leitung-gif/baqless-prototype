# -*- coding: utf-8 -*-
# Audit-Befunde Teil 2: Kasse rechnet nach, Fokus auf dunklem Grund, keine
# unsichtbaren Tabstopps, Zoll-Widerspruch, Vertraeglichkeitsaussage im Journal.
import io

def load(p):
    with io.open(p, encoding='utf-8') as f: return f.read()

def save(p, s):
    with io.open(p, 'w', encoding='utf-8', newline='\n') as f: f.write(s)

def rep(s, old, new, path, n=1):
    c = s.count(old)
    assert c == n, f"ANKER {c}x statt {n}x in {path}: {old[:70]!r}"
    return s.replace(old, new)

# ============ styles.css ============
p = 'styles.css'
s = load(p)

# Fokusrahmen war Navy auf Navy und damit auf jedem dunklen Grund unsichtbar
s = rep(s, ':focus-visible{outline:2px solid var(--navy); outline-offset:2px}',
''':root{--focus-ring:#0B1D3F}
:focus-visible{outline:2px solid var(--focus-ring); outline-offset:2px}
/* Auf dunklem Grund braucht der Fokus die helle Fassung, sonst sieht man ihn nicht */
.hero, footer, .mnav, .wa, .cl-band, .plp-hero, .jhead, .befunde, .story-stats, .col-card{--focus-ring:#FAF7F2}''', p)

# Geschlossene Overlays waren weiterhin mit der Tabulatortaste erreichbar
s = rep(s, '  transform:translateX(102%); transition:transform .24s cubic-bezier(.22,1,.36,1);',
        '  transform:translateX(102%); visibility:hidden;\n  transition:transform .24s cubic-bezier(.22,1,.36,1), visibility 0s .24s;', p)
s = rep(s, '.mnav.open{transform:none}',
        '.mnav.open{transform:none; visibility:visible; transition:transform .24s cubic-bezier(.22,1,.36,1), visibility 0s}', p)
s = rep(s, '  transform:translateX(105%); transition:transform .24s cubic-bezier(.19,1,.22,1);',
        '  transform:translateX(105%); visibility:hidden;\n  transition:transform .24s cubic-bezier(.19,1,.22,1), visibility 0s .24s;', p)
s = rep(s, '#drawer.open{transform:none}',
        '#drawer.open{transform:none; visibility:visible; transition:transform .24s cubic-bezier(.19,1,.22,1), visibility 0s}', p)

# Platzhalter brachen am Handy nicht um und schoben die Rechtsseiten seitwaerts
s = rep(s, '.legal .ph{background:var(--lav-tint); border-radius:4px; padding:1px 6px; font-size:13px; white-space:nowrap}', '.legal .ph{background:var(--lav-tint); border-radius:4px; padding:1px 6px; font-size:13px}', p)

# Hinweisblock fuer ausverkaufte Produkte
s = rep(s, '.drawer-cart-link{', '''.ausverkauft-hinweis{
  margin:16px 0 2px; padding:14px 16px; border-radius:4px; border:1px solid rgba(11,29,63,.16);
  background:rgba(11,29,63,.04); font-size:14.5px; line-height:1.55; color:#4a453e;
}
.ausverkauft-hinweis b{font-weight:600; color:var(--charcoal)}
.drawer-cart-link{''', p)
save(p, s)
print('OK', p)

# ============ kasse.html ============
p = 'pages/kasse.html'
s = load(p)

# Die Zusammenfassung muss jeder Warenkorbaenderung folgen, sonst zeigt der
# Knopf einen Betrag und verbucht einen anderen.
s = rep(s, '''if (!cart.length){
  location.replace('warenkorb.html');
} else {
  renderSum();''',
'''if (!cart.length){
  location.replace('warenkorb.html');
} else {
  // Der Drawer kann den Warenkorb auch hier aendern. Die Zusammenfassung haengt
  // sich deshalb an denselben Render-Aufruf, statt einmalig zu rechnen.
  const drawerRender = renderCart;
  renderCart = function(){
    drawerRender();
    if (!cart.length){ location.replace('warenkorb.html'); return; }
    renderSum();
  };
  renderSum();''', p)

# Zweiter Klick auf Kaufen schrieb eine leere Bestellung ueber die erste
s = rep(s, "  form.addEventListener('submit', e => {\n    e.preventDefault();",
        "  let laeuft = false;\n  form.addEventListener('submit', e => {\n    e.preventDefault();\n    if (laeuft) return;", p)
s = rep(s, "    cart.length = 0;\n    saveCart();\n    location.href = 'bestellung.html';",
        "    laeuft = true;\n    document.querySelector('button[form=\"koForm\"]').disabled = true;\n    cart.length = 0;\n    saveCart();\n    location.href = 'bestellung.html';", p)

# Pflichtangaben vor dem Kauf: Rechtliches und Mehrwertsteuer
s = rep(s, '''      <a class="ko-back" href="warenkorb.html">Zurück zum Warenkorb</a>''',
'''      <p class="ko-recht">Alle Preise in Schweizer Franken inklusive Mehrwertsteuer. Mit dem Kauf bestätigst du unsere <a href="agb.html">AGB</a> und die <a href="datenschutz.html">Datenschutzerklärung</a>. Dein <a href="widerruf.html#widerruf">Widerrufsrecht</a> bleibt davon unberührt.</p>
      <a class="ko-back" href="warenkorb.html">Zurück zum Warenkorb</a>''', p)
s = rep(s, '.ko-back{display:block;',
        '.ko-recht{margin-top:22px; font-size:13px; line-height:1.6; color:var(--ink-soft)}\n.ko-recht a{color:var(--coral-deep); font-weight:600}\n.ko-back{display:block;', p)
save(p, s)
print('OK', p)

# ============ Zoll-Widerspruch aufloesen ============
# Vier Seiten sagen «Zoll inklusive», die Rechtsseite sagte das Gegenteil.
p = 'pages/widerruf.html'
s = load(p)
s = rep(s, '<p>Bei Lieferungen aus Japan können je nach Land Einfuhrabgaben anfallen. Was auf dich zukommt, zeigen wir dir transparent im Checkout, bevor du bestellst.</p>',
        '<p>Die Einfuhrabgaben sind in der Versandgebühr enthalten. An der Tür kommt nichts dazu, und du bekommst keine Nachforderung vom Zoll. <span class="ph">[Für welche Länder das gilt, wird vor dem Livegang festgelegt.]</span></p>', p)
save(p, s)
print('OK', p)

# ============ Journal: Vertraeglichkeitsaussage raus ============
p = 'pages/journal.html'
s = load(p)
s = rep(s, '        <div class="bfind"><span class="n">3<i>/6</i></span><div><h3>Getragen trotz Metallallergie</h3><p>Drei berichten aus eigener Erfahrung. Unsere Materialprüfung steht aus, darum keine Zusage von uns.</p></div></div>\n', '', p)
s = rep(s, '<span class="kick">Sieben Befunde</span>', '<span class="kick">Sechs Befunde</span>', p)
s = rep(s, 'sechs Personen, die unabhängig voneinander dieselben sieben Dinge sagen.',
        'sechs Personen, die unabhängig voneinander dasselbe erzählen.', p)
save(p, s)
print('OK', p)

# ============ Herkunftsaussage auf die freigegebene Fassung ============
p = 'pages/index.html'
s = load(p)
s = rep(s, '<p>Entwickelt in der Schweiz, von Hand gefertigt in Thailand. Weniger Teile, mehr Freiheit.</p>',
        '<p>Entwickelt in der Schweiz, von Hand gefertigt. Weniger Teile, mehr Freiheit.</p>', p)
s = rep(s, '<p>Swiss Design, Thai Craftsmanship. Jedes Paar geht durch echte Hände.</p>',
        '<p>Entwickelt in der Schweiz, von Hand gefertigt.</p>', p)
save(p, s)
print('OK', p)
print('FIX2 OK')
