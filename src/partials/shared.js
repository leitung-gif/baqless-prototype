const PRODUCTS = {{PRODUCTS_JSON}};

// ---------- Tracking-Blaupause ----------
// Events tragen exakt die GA4-E-Commerce-Namen (add_to_cart, view_item, begin_checkout ...).
// Im Shopify-Build laufen sie 1:1 ueber Customer Events bzw. die GA4-/Meta-Integrationen
// (add_to_cart -> AddToCart usw.). Im Prototyp landen sie in window.dataLayer (Konsole).
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
try { cart = JSON.parse(localStorage.getItem('baqless_cart') || '[]'); } catch(e) {}
const cartCount = document.getElementById('cartCount');
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
// Schweizer Zahlenformat mit Hochkomma als Tausendertrennung
// Schweizer Tausendertrennung mit typografischem Apostroph. Die Locale liefert je
// nach Browser ein gerades Apostroph oder ein schmales Leerzeichen, darum vereinheitlichen.
const fmtCHF = n => 'CHF ' + Number(n).toLocaleString('de-CH').replace(/['\u00A0\u202F]/g, '\u2019');
// Bilder kommen aus den Produktdaten, nie aus dem Warenkorb-Speicher
const bildVon = item => (PRODUCTS.find(x => x.id === item.id) || {}).thumb || '';
function saveCart(){ try { localStorage.setItem('baqless_cart', JSON.stringify(cart)); } catch(e) {} }
function renderCart(){
  const body = document.getElementById('drawerBody');
  if (!cart.length){
    body.innerHTML = `<div class="drawer-empty"><em>Noch nichts drin.</em>Finde deins.</div>`;
  } else {
    body.innerHTML = cart.map(item => `
      <div class="drawer-item" data-line="${item.key || item.id}">
        <img src="${bildVon(item)}" alt="">
        <div>
          <h4>${item.name}</h4><span>${item.variant}</span>
          <div class="qty-ctrl">
            <button data-qminus="${item.key || item.id}" aria-label="Menge verringern">−</button>
            <span class="qv">${item.qty}</span>
            <button data-qplus="${item.key || item.id}" aria-label="Menge erhöhen">+</button>
          </div>
        </div>
        <span class="price">${fmtCHF(item.price * item.qty)}</span>
        <button class="line-remove" data-remove="${item.key || item.id}" aria-label="Entfernen">×</button>
      </div>`).join('');
  }
  const sub = cart.reduce((s,i) => s + i.price*i.qty, 0);
  document.getElementById('drawerTotal').textContent = fmtCHF(sub);
  const n = cart.reduce((s,i) => s + i.qty, 0);
  cartCount.textContent = n;
  cartCount.classList.toggle('on', n > 0);
  const fill = document.getElementById('shipFill'), txt = document.getElementById('shipText');
  if (fill && txt){
    fill.style.width = Math.min(sub / FREE_SHIP * 100, 100) + '%';
    fill.classList.toggle('done', sub >= FREE_SHIP);
    if (!cart.length){ txt.innerHTML = `Gratisversand ab <b>CHF ${FREE_SHIP}</b>`; txt.classList.remove('done'); }
    else if (sub >= FREE_SHIP){ txt.textContent = '✓ Gratisversand gesichert.'; txt.classList.add('done'); }
    else { txt.innerHTML = `Noch <b>CHF ${FREE_SHIP - sub}</b> bis zum Gratisversand`; txt.classList.remove('done'); }
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
    toast(`<span class="tick">i</span><span><b>Gerade aus.</b> Lass dich benachrichtigen, sobald ${p.name} zurück ist.</span>`);
    return;
  }
  // Paar oder Einzelohr sind in Shopify zwei Varianten desselben Produkts.
  // Der Einzelpreis folgt dem Verhaeltnis, das der japanische Shop fuehrt.
  const einzel = !!einzelohr && p.halb;
  const key = einzel ? p.id + '|einzel' : p.id;
  const preis = einzel ? p.preisHalb : p.price;
  const bez = einzel ? p.variant + ' · Einzelohr' : p.variant;
  const line = cart.find(x => (x.key || x.id) === key);
  line ? line.qty += qty : cart.push({key, id:p.id, name:p.name, variant:bez, price:preis, qty});
  renderCart(); pop(720);
  track('add_to_cart', { currency: 'CHF', value: preis * qty,
    items: [{ item_id: einzel ? p.sku + '-H' : p.sku, item_name: `${p.name} ${bez}`, price: preis, quantity: qty }] });
  cartCount.classList.remove('bump'); void cartCount.offsetWidth; cartCount.classList.add('bump');
  toast(`<span class="tick">✓</span><span><b>Sitzt.</b> ${p.name} ${bez} ist im Warenkorb.</span>`);
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
    if (!add.dataset.busy){
      const zurueck = add.textContent;
      add.dataset.busy = '1';
      add.textContent = '\u2713 Im Warenkorb';
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
      toast(`<span class="tick">i</span><span><b>Gerade aus.</b> ${pr.name} ist nicht mehr verfügbar.</span>`);
      return;
    }
    if (l && l.qty >= 9){
      toast(`<span class="tick">i</span><span><b>Neun sind das Maximum.</b> Brauchst du mehr, <a href="kontakt.html">schreib uns</a>.</span>`);
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
  el.textContent = n + (n === 1 ? ' Paar' : ' Paare');
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
      flag.textContent = 'Ausverkauft';
      box.appendChild(flag);
    }
    const btn = card.querySelector('[data-add]');
    if (btn){ btn.textContent = 'Benachrichtigen'; btn.dataset.notify = p.id; btn.removeAttribute('data-add'); }
  });
}
let soRaf;
new MutationObserver(() => { cancelAnimationFrame(soRaf); soRaf = requestAnimationFrame(markSoldOut); })
  .observe(document.body, { childList: true, subtree: true });
markSoldOut();

document.addEventListener('click', e => {
  const n = e.target.closest('[data-notify]');
  if (!n) return;
  const p = PRODUCTS.find(x => x.id === n.dataset.notify);
  track('generate_lead', { method: 'back_in_stock', item_id: p ? p.sku : n.dataset.notify });
  toast(`<span class="tick">✓</span><span><b>Notiert.</b> Wir melden uns, sobald ${p ? p.name : 'das Paar'} zurück ist.</span>`);
});

function openDrawer(open){
  drawer.classList.toggle('open', open);
  overlay.classList.toggle('on', open);
}
document.getElementById('cartBtn').addEventListener('click', () => {
  openDrawer(true);
  track('view_cart', { currency: 'CHF', value: cart.reduce((t, i) => t + i.price * i.qty, 0) });
});
document.getElementById('drawerClose').addEventListener('click', () => openDrawer(false));
overlay.addEventListener('click', () => openDrawer(false));
document.getElementById('checkoutBtn').addEventListener('click', () => {
  if (!cart.length){
    toast(`<span class="tick">i</span><span><b>Noch leer.</b> Leg zuerst ein Paar in den Warenkorb.</span>`);
    return;
  }
  location.href = 'kasse.html';
});

// ---------- Merken: bleibt erhalten, statt nur kurz aufzublinken ----------
let merkliste = [];
try { merkliste = JSON.parse(localStorage.getItem('baqless_merk') || '[]'); } catch(e) {}
function merkeUm(id){
  const drin = merkliste.includes(id);
  merkliste = drin ? merkliste.filter(x => x !== id) : merkliste.concat(id);
  try { localStorage.setItem('baqless_merk', JSON.stringify(merkliste)); } catch(e) {}
  return !drin;
}

// ---------- Burger / Mobilmenü ----------
const mnav = document.getElementById('mnav');
const burgerBtn = document.getElementById('burgerBtn');
if (mnav && burgerBtn){
  const setMnav = open => {
    mnav.classList.toggle('open', open);
    burgerBtn.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
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
setupDd('langDd', 'langBtn', b => {
  const l = b.dataset.lang;
  document.getElementById('langLabel').textContent = l;
  if (l !== 'DE') toast(`<span class="tick">✓</span><span><b>${l === 'EN' ? 'English' : 'Français'}</b> folgt bald. Wir arbeiten dran.</span>`);
});
setupDd('marketDd', 'marketBtn', b => {
  document.getElementById('marketLabel').textContent = b.dataset.market;
  toast(`<span class="tick">✓</span><span><b>${b.dataset.market}.</b> Dein Markt ist gemerkt.</span>`);
});
// ---------- Suche (Live-Overlay, Taste "/") ----------
const so = document.getElementById('searchOverlay');
const soInput = document.getElementById('soInput');
const soResults = document.getElementById('soResults');
function openSearch(open){
  so.classList.toggle('open', open);
  if (open){ soInput.value = ''; soSearch(''); setTimeout(() => soInput.focus(), 60); }
}
function soSearch(q){
  q = q.trim().toLowerCase();
  const hits = !q ? PRODUCTS : PRODUCTS.filter(p =>
    (p.name + ' ' + p.variant + ' ' + p.collection + ' ' + (p.tag || '')).toLowerCase().includes(q));
  document.getElementById('soHint').style.display = q ? 'none' : '';
  soResults.innerHTML = hits.length ? hits.map(p => `
    <a class="so-item" href="produkt.html?p=${p.id}">
      <img src="${p.thumb}" alt="">
      <div class="si-meta"><h4>${p.name} · ${p.variant}</h4><span>${p.collection} Kollektion · Click-Lock</span></div>
      <span class="si-price">CHF ${p.price}</span>
    </a>`).join('')
    : `<div class="so-empty"><b>Nichts gefunden.</b>Versuch es mit «Gold», «Polaris» oder «Honesty».</div>`;
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
  toast(`<span class="tick">\u2713</span><span><b>Angemeldet.</b> Neue Drops landen zuerst bei dir.</span>`);
  e.target.reset();
}));
