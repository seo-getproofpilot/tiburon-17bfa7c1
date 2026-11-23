/* The on-site cart. Bottles are added here on our pages; at checkout the cart is created in Tiburon's Big Thirst store
   (their licensed retail partner, the same Shopify store their current Buy Now buttons use) and the shopper finishes there.
   Free shipping on 3+ bottles is Tiburon's current limited-time offer (Basil, Nov 2026); the partner's checkout applies it. */
(function () {
  var SHOP = 'https://shop.bigthirst.com', TOKEN = '69c683813165f7171fb5daa955056bb4', API = SHOP + '/api/2024-10/graphql.json';
  var P = {
    dark:  { name: 'Dark 8 Year Reserve Blend', short: 'Dark 8', rest: '8 Year Reserve Blend rum', price: 37.99, v: '43685670322412', img: 'b-dark-s.webp', url: SHOP + '/products/tiburon-rum-8' },
    white: { name: 'White Tip Overproof Rum', short: 'White Tip', rest: 'Overproof white rum', price: 27.99, v: '43685670813932', img: 'b-white-s.webp', url: SHOP + '/products/white-tip' },
    fin:   { name: 'FIN Tequila Blanco', short: 'FIN', rest: 'Tequila blanco', price: 54.99, v: '47080982937836', img: 'b-fin-s.webp', url: SHOP + '/products/tiburons-fin-tequila' }
  };
  var FREE = 3, KEY = 'tb_cart';
  var root = (document.querySelector('script[src*="cart.js"]').getAttribute('src') || '').replace(/assets\/cart\.js.*$/, '');
  var cart = {}; try { cart = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} };
  var count = function () { return Object.keys(cart).reduce(function (n, k) { return n + (cart[k] || 0); }, 0); };
  var money = function (n) { return '$' + n.toFixed(2); };
  /* the bottle name in its own label lettering; FIN is its logo */
  var nm = function (k) { return k === 'fin' ? '<span class="finmark" aria-hidden="true"></span><span class="sr">FIN</span>' : '<span class="nm nm--' + k + '">' + P[k].short + '</span>'; };

  /* drawer markup */
  var d = document.createElement('div');
  d.className = 'cartd'; d.id = 'cartd'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'cartdH');
  d.innerHTML = '<div class="cartd__shade" data-close></div><aside class="cartd__panel">' +
    '<header class="cartd__head"><h2 id="cartdH">Your bottles</h2><button type="button" class="cartd__x" data-close aria-label="Close cart">&times;</button></header>' +
    '<div class="cartd__ship" aria-live="polite"><p class="cartd__shipT"></p><span class="cartd__bar"><i></i></span></div>' +
    '<ul class="cartd__list"></ul>' +
    '<div class="cartd__add"></div>' +
    '<footer class="cartd__foot"><p class="cartd__sub"><span>Subtotal</span><b></b></p>' +
    '<button type="button" class="btn btn--primary cartd__go" data-track="checkout">Check out securely</button>' +
    '<p class="cartd__fine">Checkout, age verification and delivery are handled by our licensed retail partner. Ships to most U.S. states and D.C.; your address is checked at checkout.</p></footer></aside>';
  document.body.appendChild(d);
  var list = d.querySelector('.cartd__list'), shipT = d.querySelector('.cartd__shipT'), bar = d.querySelector('.cartd__bar i'),
      sub = d.querySelector('.cartd__sub b'), go = d.querySelector('.cartd__go'), addRow = d.querySelector('.cartd__add');

  function render() {
    var n = count(), total = 0;
    list.innerHTML = Object.keys(P).filter(function (k) { return cart[k]; }).map(function (k) {
      var p = P[k], q = cart[k]; total += p.price * q;
      return '<li class="cartd__item"><img src="' + root + 'assets/img/' + p.img + '" alt=""><div><b>' + nm(k) + '</b><em class="cartd__kind">' + p.rest + '</em><span>' + money(p.price) + '</span></div>' +
        '<span class="cartd__qty"><button type="button" data-q="' + k + '" data-d="-1" aria-label="One fewer ' + p.short + '">&minus;</button><output>' + q + '</output>' +
        '<button type="button" data-q="' + k + '" data-d="1" aria-label="One more ' + p.short + '">+</button></span></li>';
    }).join('') || '<li class="cartd__empty">Your cart is empty. Pick a bottle to start.</li>';
    sub.textContent = money(total);
    var left = Math.max(0, FREE - n);
    shipT.innerHTML = n === 0 ? 'Free shipping on <b>3 or more bottles</b>, for a limited time.' :
      left ? 'Add <b>' + left + ' more bottle' + (left > 1 ? 's' : '') + '</b> for free shipping.' : '<b>You&rsquo;ve unlocked free shipping.</b>';
    bar.style.width = Math.min(1, n / FREE) * 100 + '%';
    var ups = Object.keys(P).filter(function (k) { return !cart[k]; });
    addRow.innerHTML = ups.length ? '<p class="cartd__uph">' + (n ? 'Add to your order' : 'Our bottles') + '</p><div class="cartd__ups">' + ups.map(function (k) {
      return '<div class="cartd__up"><img src="' + root + 'assets/img/up-' + k + '.webp" alt="" width="90" height="120" loading="lazy">' +
        '<div class="cartd__upt"><b>' + nm(k) + '</b><span>' + money(P[k].price) + '</span>' +
        '<button type="button" class="cartd__upadd" data-add="' + k + '" aria-label="Add ' + P[k].short + ' to your order">+ Add</button></div></div>';
    }).join('') + '</div>' : '';
    go.disabled = n === 0;
    document.querySelectorAll('.cartbtn__n').forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
    document.querySelectorAll('.offer__left').forEach(function (el) { el.textContent = n >= FREE ? 'Free shipping unlocked' : n ? 'Add ' + (FREE - n) + ' more for free shipping' : ''; });
  }
  var last = null;
  function open() { last = document.activeElement; d.hidden = false; document.documentElement.classList.add('cart-open'); render(); requestAnimationFrame(function () { d.classList.add('is-open'); d.querySelector('.cartd__x').focus(); }); }
  function close() { d.classList.remove('is-open'); document.documentElement.classList.remove('cart-open'); setTimeout(function () { d.hidden = true; }, 300); if (last) last.focus(); }
  function add(k, q) {
    (k === 'all' ? Object.keys(P) : [k]).forEach(function (x) { if (P[x]) cart[x] = Math.min(24, (cart[x] || 0) + (q || 1)); });
    save(); render(); open();
    if (window.gtag) gtag('event', 'add_to_cart', { bottle: k, quantity: q || 1 });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-add]');
    if (a) { e.preventDefault(); add(a.getAttribute('data-add'), +(a.getAttribute('data-q') || 1)); return; }
    var st = e.target.closest('.qty [data-step]');
    if (st) {
      var box = st.closest('.qty'), out = box.querySelector('output'), n = Math.max(1, Math.min(24, (+out.textContent || 1) + (+st.getAttribute('data-step'))));
      out.textContent = n; var item = box.closest('.shop__item,.cel__item'), btn = item && item.querySelector('[data-add]');
      if (btn) { btn.setAttribute('data-q', n); btn.textContent = n > 1 ? 'Add ' + n + ' to cart' : 'Add to cart'; }
      return;
    }
    if (e.target.closest('[data-cart]')) { e.preventDefault(); open(); return; }
    if (e.target.closest('#cartd [data-close]')) { close(); return; }
    var q = e.target.closest('#cartd [data-q]');
    if (q) { var k = q.getAttribute('data-q'); cart[k] = Math.max(0, (cart[k] || 0) + (+q.getAttribute('data-d'))); if (!cart[k]) delete cart[k]; save(); render(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !d.hidden) close(); });

  /* checkout: create the cart in the partner store, then hand over to its checkout */
  go.addEventListener('click', function () {
    var lines = Object.keys(cart).filter(function (k) { return cart[k] && P[k]; }).map(function (k) { return { merchandiseId: 'gid://shopify/ProductVariant/' + P[k].v, quantity: cart[k] }; });
    if (!lines.length) return;
    if (window.gtag) gtag('event', 'begin_checkout', { bottles: count(), value: lines.reduce(function (t, l) { var k = Object.keys(P).filter(function (x) { return 'gid://shopify/ProductVariant/' + P[x].v === l.merchandiseId; })[0]; return t + P[k].price * l.quantity; }, 0), currency: 'USD' });
    go.disabled = true; go.textContent = 'Opening secure checkout';
    var permalink = SHOP + '/cart/' + Object.keys(cart).filter(function (k) { return cart[k]; }).map(function (k) { return P[k].v + ':' + cart[k]; }).join(',');
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': TOKEN },
      body: JSON.stringify({ query: 'mutation($l:[CartLineInput!]!){cartCreate(input:{lines:$l}){cart{checkoutUrl} userErrors{message}}}', variables: { l: lines } }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { var u = j && j.data && j.data.cartCreate && j.data.cartCreate.cart && j.data.cartCreate.cart.checkoutUrl; location.href = u || permalink; })
      .catch(function () { location.href = permalink; });
  });

  /* nav cart button */
  document.querySelectorAll('.nav, .drawer').forEach(function (n) {
    var b = n.querySelector('.btn--buy'); if (!b || n.querySelector('.cartbtn')) return;
    var c = document.createElement('button'); c.type = 'button'; c.className = 'cartbtn'; c.setAttribute('data-cart', ''); c.setAttribute('aria-label', 'Open cart');
    c.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1.2 12.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/></svg><span class="cartbtn__n" hidden>0</span>';
    b.parentNode.insertBefore(c, b.nextSibling);
  });
  render();
})();
