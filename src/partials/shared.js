const PRODUCTS = {{PRODUCTS_JSON}};

// ---------- Sprache ----------
// Das Woerterbuch kommt aus src/i18n/<sprache>.json und wird beim Bau eingesetzt.
// txt() heisst nicht t(), weil t innerhalb einiger Funktionen schon eine lokale
// Variable ist und dort das Woerterbuch verdecken wuerde.
const I18N = {{I18N_JSON}};
function txt(schluessel, werte){
  let s = I18N.t[schluessel];
  if (s === undefined){ console.warn('i18n fehlt:', schluessel); return '[[' + schluessel + ']]'; }
  if (werte) for (const k in werte) s = s.split('{' + k + '}').join(werte[k]);
  return s;
}
// Ein oder mehr: nimmt <schluessel>.eins oder <schluessel>.viele und setzt {n} ein.
// Franzoesisch stellt auch die Null in den Singular, «0 paire», Deutsch und Englisch nicht.
function txtN(schluessel, n){
  const einzahl = I18N.lang === 'fr' ? Math.abs(n) < 2 : n === 1;
  return txt(schluessel + (einzahl ? '.eins' : '.viele'), { n });
}

// Die Fassung liegt im Pfad, genau wie bei Shopify: / fuer Deutsch, /en/ und /fr/ daneben.
// Der Wechsel behaelt Seite, Abfrage und Sprungmarke, damit niemand auf der Startseite landet.
function sprachUrl(code){
  const ziel = I18N.sprachen.find(x => x.code === code);
  if (!ziel) return location.href;
  const teile = location.pathname.split('/');
  const datei = teile.pop() || 'index.html';
  if (I18N.sprachen.some(x => x.ordner && x.ordner === teile[teile.length - 1])) teile.pop();
  return teile.join('/') + '/' + (ziel.ordner ? ziel.ordner + '/' : '') + datei
    + location.search + location.hash;
}

// ---------- Tracking-Blaupause ----------
// Die Ereignisse tragen die GA4-E-Commerce-Namen (add_to_cart, view_item, begin_checkout ...),
// damit die Namensgebung spaeter uebereinstimmt. ACHTUNG fuer den Shopify-Build: eine
// Eins-zu-eins-Uebernahme gibt es nicht. Shopify liefert Checkout-Ereignisse ueber Customer
// Events in der eigenen Sandbox, die Ereignisse vor dem Checkout kommen aus dem Theme.
// Der dataLayer hier ist die Blaupause fuer die Namen und die Nutzlast, nicht die Verdrahtung.
window.dataLayer = window.dataLayer || [];
function track(event, params){
  window.dataLayer.push(Object.assign({ event }, params || {}));
}

// ---------- Mini Pop-Sound (WebAudio, nur nach User-Geste) ----------
let audioCtx;
function pop(freq = 600){
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * .4, audioCtx.currentTime + .09);
    g.gain.setValueAtTime(.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + .12);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + .13);
  }catch(e){}
}

// ---------- Statische Hintergrund-Bubbles (alle Sektionen, 20% Deckkraft) ----------
(function scatterBubbles(){
  const palette = ['#FF7A6A','#37B369','#7D6FD6','#D9C1A0'];
  // deterministischer Pseudo-Zufall, damit das Layout bei jedem Laden gleich aussieht
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  document.querySelectorAll('.section, .plp-wrap, .xsell, .seen').forEach(sec => {
    // absolute Bubbles brauchen einen positionierten Container, sonst landen sie im Viewport
    if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
    const n = 5 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++){
      const b = document.createElement('span');
      b.className = 'bg-bubble';
      const size = 14 + rnd() * 90;
      const color = palette[Math.floor(rnd() * palette.length)];
      b.style.width = b.style.height = size + 'px';
      b.style.left = (rnd() * 96) + '%';
      b.style.top = (rnd() * 88) + '%';
      // Mix aus gefüllten und Ring-Bubbles
      if (rnd() > .45) b.style.background = color;
      else b.style.border = `1.5px solid ${color}`;
      sec.appendChild(b);
    }
  });
})();

// ---------- Warenkorb (v3: Persistenz, Stepper, Gratisversand) ----------
const FREE_SHIP = 99;
let cart = [];
try {
  cart = JSON.parse(localStorage.getItem('baqless_cart') || '[]');
  // Ein beschaedigter Wert darf nicht die ganze Seite mitreissen: Form pruefen, nicht nur parsen
  if (!Array.isArray(cart)) cart = [];
  cart = cart.filter(x => x && typeof x === 'object' && x.id && typeof x.price === 'number' && x.qty > 0);
  // Warenkoerbe aus der einsprachigen Fassung trugen den Zustand nur im deutschen Text
  cart.forEach(x => { if (x.einzel === undefined)
    x.einzel = String(x.key || '').endsWith('|einzel') || /Einzelohr/.test(x.variant || ''); });
} catch(e) { cart = []; }
const cartCount = document.getElementById('cartCount');
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
// Schweizer Zahlenformat mit Hochkomma als Tausendertrennung
// Schweizer Tausendertrennung mit typografischem Apostroph. Die Locale liefert je
// nach Browser ein gerades Apostroph oder ein schmales Leerzeichen, darum vereinheitlichen.
const fmtCHF = n => 'CHF ' + Number(n).toLocaleString('de-CH').replace(/['\u00A0\u202F]/g, '\u2019');
// Bilder kommen aus den Produktdaten, nie aus dem Warenkorb-Speicher
const bildVon = item => (PRODUCTS.find(x => x.id === item.id) || {}).thumb || '';
// Beim Einzelohr ist ein Stueck ein Ohr, das muss dastehen.
// Der Zustand haengt am Wahrheitswert der Zeile, nie am Variantentext: der ist uebersetzt.
const istEinzel = item => item.einzel === true || String(item.key || '').endsWith('|einzel');
const einheitVon = item => txt(istEinzel(item) ? 'einheit.pro_ohr' : 'einheit.pro_paar');
const stueckVon = (item, n) => txtN(istEinzel(item) ? 'stueck.ohr' : 'stueck.paar', n);
function saveCart(){ try { localStorage.setItem('baqless_cart', JSON.stringify(cart)); } catch(e) {} }
function renderCart(){
  const body = document.getElementById('drawerBody');
  if (!cart.length){
    body.innerHTML = `<div class="drawer-empty"><em>${txt('js.korb.leer_titel')}</em>${txt('js.korb.leer_text')}</div>`;
  } else {
    body.innerHTML = cart.map(item => `
      <div class="drawer-item" data-line="${item.key || item.id}">
        <img src="${bildVon(item)}" alt="">
        <div>
          <h4>${item.name}</h4><span>${item.variant}</span>
          <div class="qty-ctrl">
            <button data-qminus="${item.key || item.id}" aria-label="${txt('js.korb.menge_minus')}">−</button>
            <span class="qv">${item.qty}</span>
            <button data-qplus="${item.key || item.id}" aria-label="${txt('js.korb.menge_plus')}">+</button>
          </div>
        </div>
        <span class="price">${fmtCHF(item.price * item.qty)}</span>
        <button class="line-remove" data-remove="${item.key || item.id}" aria-label="${txt('js.korb.entfernen')}">×</button>
      </div>`).join('');
  }
  const sub = cart.reduce((s,i) => s + i.price*i.qty, 0);
  document.getElementById('drawerTotal').textContent = fmtCHF(sub);
  const n = cart.reduce((s,i) => s + i.qty, 0);
  cartCount.textContent = n;
  cartCount.classList.toggle('on', n > 0);
  const fill = document.getElementById('shipFill'), versandTxt = document.getElementById('shipText');
  if (fill && versandTxt){
    fill.style.width = Math.min(sub / FREE_SHIP * 100, 100) + '%';
    fill.classList.toggle('done', sub >= FREE_SHIP);
    if (!cart.length){ versandTxt.innerHTML = txt('js.versand.gratis_ab', {betrag: FREE_SHIP}); versandTxt.classList.remove('done'); }
    else if (sub >= FREE_SHIP){ versandTxt.textContent = '✓ ' + txt('js.versand.gesichert'); versandTxt.classList.add('done'); }
    else { versandTxt.innerHTML = txt('js.versand.rest', {betrag: FREE_SHIP - sub}); versandTxt.classList.remove('done'); }
  }
  saveCart();
}
renderCart();
let toastTimer;
function toast(html){
  const t = document.getElementById('toast');
  t.innerHTML = html;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function addToCart(id, qty, einzelohr){
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  if (p.lager === 'ausverkauft'){
    toast(`<span class="tick">i</span><span><b>${txt('js.lager.aus_titel')}</b> ${txt('js.lager.aus_text', {name: p.name})}</span>`);
    return;
  }
  // Paar oder Einzelohr sind in Shopify zwei Varianten desselben Produkts.
  // Der Einzelpreis folgt dem Verhaeltnis, das der japanische Shop fuehrt.
  const einzel = !!einzelohr && p.halb;
  const key = einzel ? p.id + '|einzel' : p.id;
  const preis = einzel ? p.preisHalb : p.price;
  const bez = einzel ? p.variant + ' \u00b7 ' + txt('variante.einzelohr') : p.variant;
  const line = cart.find(x => (x.key || x.id) === key);
  line ? line.qty += qty : cart.push({key, id:p.id, name:p.name, variant:bez, price:preis, qty, einzel});
  renderCart(); pop(720);
  track('add_to_cart', { currency: 'CHF', value: preis * qty,
    items: [{ item_id: einzel ? p.sku + '-H' : p.sku, item_name: `${p.name} ${bez}`, price: preis, quantity: qty }] });
  cartCount.classList.remove('bump'); void cartCount.offsetWidth; cartCount.classList.add('bump');
  toast(`<span class="tick">✓</span><span><b>${txt('js.korb.titel')}</b> ${txt('js.korb.text', {name: p.name + ' ' + bez})}</span>`);
}
document.addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  if (add){
    // Die Variante haengt am Knopf selbst. Nie an einem Seitenzustand, sonst
    // erben fremde Karten (Cross-Sell, zuletzt angesehen) den Einzelohr-Preis.
    addToCart(add.dataset.add, +(add.dataset.qty || (add.dataset.usesQty === '1'
      ? document.getElementById('qtyVal')?.textContent : null) || 1),
      add.dataset.einzel === '1');
    // Mikrobestaetigung direkt am Knopf: der Klick hat sichtbar gewirkt
    // Nur bei Kartenknoepfen mit fester Beschriftung. Der Hauptknopf traegt einen
    // Preis, der sich beim Umschalten aendert, dort waere das Zuruecksetzen falsch.
    if (!add.dataset.busy && add.classList.contains('add-btn')){
      const zurueck = add.textContent;
      add.dataset.busy = '1';
      add.textContent = '\u2713 ' + txt('js.knopf.im_warenkorb');
      add.classList.add('added');
      setTimeout(() => { add.textContent = zurueck; add.classList.remove('added'); delete add.dataset.busy; }, 1600);
    }
    return;
  }
  const plus = e.target.closest('[data-qplus]');
  if (plus){
    const l = cart.find(x => (x.key || x.id) === plus.dataset.qplus);
    const pr = l && PRODUCTS.find(x => x.id === l.id);
    if (l && pr && pr.lager === 'ausverkauft'){
      toast(`<span class="tick">i</span><span><b>${txt('js.lager.aus_titel')}</b> ${txt('js.lager.nicht_verfuegbar', {name: pr.name})}</span>`);
      return;
    }
    if (l && l.qty >= 9){
      toast(`<span class="tick">i</span><span><b>${txt('js.korb.max_titel')}</b> ${txt('js.korb.max_text', {link: `<a href="kontakt.html">${txt('js.korb.max_link')}</a>`})}</span>`);
      return;
    }
    if (l){ l.qty++; renderCart(); }
    return;
  }
  const minus = e.target.closest('[data-qminus]');
  if (minus){ const l = cart.find(x => (x.key || x.id) === minus.dataset.qminus); if (l){ l.qty--; if (l.qty < 1) cart = cart.filter(x => x !== l); renderCart(); } return; }
  const rem = e.target.closest('[data-remove]');
  if (rem){ const l = cart.find(x => (x.key || x.id) === rem.dataset.remove);
    if (l) track('remove_from_cart', { currency: 'CHF', value: l.price * l.qty, items: [{ item_id: l.id, quantity: l.qty }] });
    cart = cart.filter(x => (x.key || x.id) !== rem.dataset.remove); renderCart(); return; }
});
// ---------- Kollektions-Menue im Kopf: Stueckzahlen aus den Produktdaten ----------
document.querySelectorAll('[data-navcount]').forEach(el => {
  const n = PRODUCTS.filter(p => p.collection === el.dataset.navcount).length;
  el.textContent = txtN('stueck.paar', n);
});

// ---------- Ausverkauft-Zustand auf allen Karten, egal wann sie gerendert werden ----------
// Im echten Shop enden ausverkaufte Artikel als Sackgasse. Hier kriegen sie einen
// klaren Zustand plus Benachrichtigung. In Shopify liefert das der Variantenbestand.
function markSoldOut(){
  document.querySelectorAll('.card[data-id]').forEach(card => {
    const p = PRODUCTS.find(x => x.id === card.dataset.id);
    if (!p || p.lager !== 'ausverkauft' || card.classList.contains('soldout')) return;
    card.classList.add('soldout');
    const box = card.querySelector('.card-img');
    if (box && !box.querySelector('.out-flag')){
      const flag = document.createElement('span');
      flag.className = 'out-flag';
      flag.textContent = txt('js.lager.flagge');
      box.appendChild(flag);
    }
    const btn = card.querySelector('[data-add]');
    if (btn){ btn.textContent = txt('js.knopf.benachrichtigen'); btn.dataset.notify = p.id; btn.removeAttribute('data-add'); }
  });
}
let soRaf;
new MutationObserver(() => { cancelAnimationFrame(soRaf); soRaf = requestAnimationFrame(markSoldOut); })
  .observe(document.body, { childList: true, subtree: true });
markSoldOut();

document.addEventListener('click', e => {
  const n = e.target.closest('[data-notify]');
  if (!n) return;
  // Ohne Adresse koennen wir nichts melden. Auf der Produktseite steht das Feld,
  // von einer Karte aus fuehren wir dorthin, statt etwas zu versprechen.
  const feld = document.getElementById('notifyForm');
  if (feld){
    feld.hidden = false;
    feld.querySelector('input')?.focus();
    return;
  }
  location.href = 'produkt.html?p=' + n.dataset.notify;
});

// ---------- Merkliste ----------
function merkAnzahl(){ return merkliste.length; }
function syncMerkZaehler(){
  document.querySelectorAll('[data-merkcount]').forEach(el => {
    el.textContent = merkliste.length;
    el.classList.toggle('on', merkliste.length > 0);
  });
}

// ---------- Fokusfuehrung fuer Overlays ----------
// Ein geoeffnetes Overlay ist ein Dialog: der Fokus geht hinein, bleibt drin,
// und kehrt beim Schliessen an die ausloesende Stelle zurueck.
const fokusFalle = new Map();
// Zaehler statt Schalter: das Schliessen eines Overlays darf nicht entsperren,
// solange ein anderes noch offen ist.
let offeneOverlays = 0;
function scrollSperre(an){
  offeneOverlays = Math.max(0, offeneOverlays + (an ? 1 : -1));
  document.body.style.overflow = offeneOverlays > 0 ? 'hidden' : '';
}
function fokusFuehren(el, open, ersterKandidat){
  if (!el) return;
  if (open){
    fokusFalle.set(el, document.activeElement);
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('role', 'dialog');
    const ziel = ersterKandidat || el.querySelector('button, [href], input, select, textarea');
    setTimeout(() => ziel && ziel.focus(), 60);
  } else {
    el.removeAttribute('aria-modal');
    const zurueck = fokusFalle.get(el);
    fokusFalle.delete(el);
    if (zurueck && document.contains(zurueck)) zurueck.focus();
  }
}
addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const offen = document.querySelector('#drawer.open, .mnav.open, #searchOverlay.open');
  if (!offen) return;
  const fokussierbar = [...offen.querySelectorAll('button, [href], input, select, textarea')]
    .filter(x => !x.disabled && x.offsetParent !== null);
  if (!fokussierbar.length) return;
  const erster = fokussierbar[0], letzter = fokussierbar[fokussierbar.length - 1];
  if (e.shiftKey && document.activeElement === erster){ e.preventDefault(); letzter.focus(); }
  else if (!e.shiftKey && document.activeElement === letzter){ e.preventDefault(); erster.focus(); }
});

function openDrawer(open){
  drawer.classList.toggle('open', open);
  overlay.classList.toggle('on', open);
  drawer.toggleAttribute('inert', !open);
  scrollSperre(open);
  document.getElementById('cartBtn')?.setAttribute('aria-expanded', open);
  fokusFuehren(drawer, open, document.getElementById('drawerClose'));
}
document.getElementById('cartBtn').addEventListener('click', () => {
  openDrawer(true);
  track('view_cart', { currency: 'CHF', value: cart.reduce((t, i) => t + i.price * i.qty, 0) });
});
document.getElementById('drawerClose').addEventListener('click', () => openDrawer(false));
overlay.addEventListener('click', () => openDrawer(false));
document.getElementById('checkoutBtn').addEventListener('click', () => {
  if (!cart.length){
    toast(`<span class="tick">i</span><span><b>${txt('js.kasse.leer_titel')}</b> ${txt('js.kasse.leer_text')}</span>`);
    return;
  }
  location.href = 'kasse.html';
});

// ---------- Merken: bleibt erhalten, statt nur kurz aufzublinken ----------
let merkliste = [];
try {
  merkliste = JSON.parse(localStorage.getItem('baqless_merk') || '[]');
  if (!Array.isArray(merkliste)) merkliste = [];
  merkliste = merkliste.filter(x => typeof x === 'string');
} catch(e) { merkliste = []; }
function merkeUm(id){
  const drin = merkliste.includes(id);
  merkliste = drin ? merkliste.filter(x => x !== id) : merkliste.concat(id);
  try { localStorage.setItem('baqless_merk', JSON.stringify(merkliste)); } catch(e) {}
  syncMerkZaehler();
  return !drin;
}
addEventListener('DOMContentLoaded', syncMerkZaehler);
syncMerkZaehler();

// ---------- Burger / Mobilmenü ----------
const mnav = document.getElementById('mnav');
const burgerBtn = document.getElementById('burgerBtn');
if (mnav && burgerBtn){
  const setMnav = open => {
    mnav.classList.toggle('open', open);
    burgerBtn.setAttribute('aria-expanded', open);
    mnav.toggleAttribute('inert', !open);
    scrollSperre(open);
    fokusFuehren(mnav, open, document.getElementById('mnavClose'));
  };
  addEventListener('keydown', e => { if (e.key === 'Escape' && mnav.classList.contains('open')) setMnav(false); });
  burgerBtn.addEventListener('click', () => setMnav(true));
  document.getElementById('mnavClose').addEventListener('click', () => setMnav(false));
  mnav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMnav(false)));
}

// ---------- Scroll: Nav + Dotnav + Reveals + Counter ----------
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), {passive:true});
const io = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
}, {threshold:.15});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
// Dotnav Scrollspy
const dotLinks = [...document.querySelectorAll('.dotnav a')];
const spy = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    dotLinks.forEach(a => a.classList.toggle('active', a.dataset.sec === en.target.id));
  });
}, {rootMargin:'-45% 0px -45% 0px'});
dotLinks.forEach(a => { const t = document.getElementById(a.dataset.sec); if (t) spy.observe(t); });
// Counter
const cio = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    cio.unobserve(en.target);
    const el = en.target, target = +el.dataset.count;
    if (!target){ el.textContent = '0'; return; }
    const t0 = performance.now(), dur = 1200;
    (function tick(now){
      const k = Math.min((now - t0) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  });
}, {threshold:.6});
document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

// ---------- V2: Sprache / Markt / Suche ----------
function setupDd(ddId, btnId, onPick) {
  const dd = document.getElementById(ddId), btn = document.getElementById(btnId);
  btn.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.v2-dd.open').forEach(o => { if (o !== dd) o.classList.remove('open'); });
    dd.classList.toggle('open');
    btn.setAttribute('aria-expanded', dd.classList.contains('open'));
  });
  dd.querySelectorAll('.v2-menu button').forEach(b => b.addEventListener('click', () => {
    dd.querySelectorAll('.v2-menu button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    dd.classList.remove('open');
    onPick(b);
  }));
}
document.addEventListener('click', () => document.querySelectorAll('.v2-dd.open').forEach(o => o.classList.remove('open')));
// Aktuelle Fassung im Menue markieren, der Kopf ist fuer alle Sprachen dieselbe Datei
(function markiereSprache(){
  const oben = I18N.lang.toUpperCase();
  const label = document.getElementById('langLabel');
  if (label) label.textContent = oben;
  document.querySelectorAll('#langDd .v2-menu button').forEach(b => {
    b.classList.toggle('active', (b.dataset.lang || '').toUpperCase() === oben);
  });
})();
setupDd('langDd', 'langBtn', b => {
  const code = (b.dataset.lang || '').toLowerCase();
  if (!code || code === I18N.lang) return;
  try { localStorage.setItem('baqless_lang', code); } catch(e) {}
  location.href = sprachUrl(code);
});
setupDd('marketDd', 'marketBtn', b => {
  document.getElementById('marketLabel').textContent = b.dataset.market;
  toast(`<span class="tick">✓</span><span><b>${b.dataset.market}.</b> ${txt('js.markt.gemerkt')}</span>`);
});
// ---------- Suche (Live-Overlay, Taste "/") ----------
const so = document.getElementById('searchOverlay');
const soInput = document.getElementById('soInput');
const soResults = document.getElementById('soResults');
function openSearch(open){
  so.classList.toggle('open', open);
  so.toggleAttribute('inert', !open);
  scrollSperre(open);
  so.setAttribute('aria-modal', open ? 'true' : 'false');
  document.getElementById('searchBtn')?.setAttribute('aria-expanded', open);
  if (open){ soInput.value = ''; soSearch(''); }
  fokusFuehren(so, open, soInput);
}
// Geschlossene Overlays sind von Anfang an aus der Tabreihenfolge genommen.
// inert haengt nicht an einer Animation und ist damit verlaesslicher als Sichtbarkeit allein.
[drawer, document.getElementById('mnav'), so].forEach(el => el && el.setAttribute('inert', ''));
function soSearch(q){
  q = q.trim().toLowerCase();
  const hits = !q ? PRODUCTS : PRODUCTS.filter(p =>
    (p.name + ' ' + p.variant + ' ' + p.collection + ' ' + (p.tag || '')).toLowerCase().includes(q));
  document.getElementById('soHint').style.display = q ? 'none' : '';
  soResults.innerHTML = hits.length ? hits.map(p => `
    <a class="so-item" href="produkt.html?p=${p.id}">
      <img src="${p.thumb}" alt="">
      <div class="si-meta"><h4>${p.name} · ${p.variant}</h4><span>${txt('js.suche.kollektion_meta', {name: p.collection})} · Click-Lock</span></div>
      <span class="si-price">CHF ${p.price}</span>
    </a>`).join('')
    : `<div class="so-empty"><b>${txt('js.suche.leer_titel')}</b>${txt('js.suche.leer_text')}</div>`;
}
document.getElementById('searchBtn')?.addEventListener('click', () => openSearch(true));
document.getElementById('soClose').addEventListener('click', () => openSearch(false));
so.addEventListener('click', e => { if (e.target === so) openSearch(false); });
soInput.addEventListener('input', () => soSearch(soInput.value));
document.getElementById('soHint').addEventListener('click', e => {
  const b = e.target.closest('button[data-q]');
  if (b){ soInput.value = b.dataset.q; soSearch(b.dataset.q); soInput.focus(); }
});
addEventListener('keydown', e => {
  if (e.key === 'Escape') openSearch(false);
  if (e.key === '/' && !so.classList.contains('open') && !/input|textarea/i.test(document.activeElement.tagName)){ e.preventDefault(); openSearch(true); }
});

addEventListener('keydown', e => { if (e.key === 'Escape') openDrawer(false); });


// ---------- Newsletter (alle Formulare mit data-nlform) ----------
document.querySelectorAll('[data-nlform]').forEach(form => form.addEventListener('submit', e => {
  e.preventDefault();
  track('generate_lead', { method: 'newsletter' });
  toast(`<span class="tick">\u2713</span><span><b>${txt('js.newsletter.ok_titel')}</b> ${txt('js.newsletter.ok_text')}</span>`);
  e.target.reset();
}));
