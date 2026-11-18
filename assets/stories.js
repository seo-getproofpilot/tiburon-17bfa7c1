/* Story pages: rope that draws down the process page, the ecosystem circle, cocktail pour glasses. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = (els, cls = 'is-in', margin = '0px 0px -12% 0px') => {
    if (!('IntersectionObserver' in window) || RM) { els.forEach((e) => e.classList.add(cls)); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add(cls); io.unobserve(e.target); } }), { rootMargin: margin, threshold: .15 });
    els.forEach((e) => io.observe(e));
  };

  /* ---- rope: its drawn length follows how far you have read, and it ends on the anchor ring ---- */
  const proc = $('.proc'), ropeBox = $('.proc__rope'), rope = $('.proc__rope i'), anchor = $('.anchor__plain') || $('.anchor img'), end = $('.proc__end');
  if (proc && rope) {
    let ticking = false, len = 0;
    let dots = [];
    const phone = matchMedia('(max-width:760px)');
    const measure = () => {   // rope runs from the top of the steps to the top edge of the anchor drawing, where the knotted rope takes over
      const top = proc.getBoundingClientRect().top + scrollY;
      if (anchor) { const r = anchor.getBoundingClientRect(); len = r.top + scrollY + r.height * .006 - top; }
      else len = proc.offsetHeight - 120;
      ropeBox.style.setProperty('--len', Math.max(0, len) + 'px');
      // each step's knot on the rope: how far down the rope it sits, so it fills only once the rope has reached it
      dots = $$('.step').map((st) => { const b = st.getBoundingClientRect(); return [st, b.top + scrollY - top + (phone.matches ? 51 : b.height / 2)]; });
    };
    const set = () => {
      ticking = false;
      const r = proc.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * .62 - r.top) / (len || 1)));
      rope.style.setProperty('--p', RM ? 1 : p.toFixed(4));
      const reach = (RM ? 1 : p) * len;
      const pt = r.top;
      dots.forEach(([st]) => { const b = st.getBoundingClientRect(); st.classList.toggle('is-roped', reach >= b.top - pt + (phone.matches ? 51 : b.height / 2) - 2); });
      if (end) end.classList.toggle('is-tied', RM || p >= .995);
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(set); } }, { passive: true });
    addEventListener('resize', () => { measure(); set(); });
    if (anchor && !anchor.complete) anchor.addEventListener('load', () => { measure(); set(); });
    addEventListener('load', () => { measure(); set(); });
    measure(); set();
    seen($$('.step'));
    // a Tiburon shark cruises down the steps beside the rope, drifting side to side as you read (swimmer)
    const swim = $('.swim', proc);
    if (swim && !RM) {
      const move = () => {
        const r = proc.getBoundingClientRect(), H = Math.max(1, r.height - innerHeight);
        const t = Math.min(1, Math.max(0, -r.top / H));
        const x = Math.sin(t * Math.PI * 5) * 34, dx = Math.cos(t * Math.PI * 5);
        swim.style.transform = `translate3d(${(50 + x).toFixed(2)}vw, ${(-r.top + innerHeight * .42).toFixed(0)}px, 0) rotate(${(dx * 18 + 90).toFixed(1)}deg)`;
      };
      addEventListener('scroll', () => requestAnimationFrame(move), { passive: true }); move();
    }
  }

  /* ---- ecosystem circle: six stops, arrow keys move between them ---- */
  const wheel = $('.wheel');
  if (wheel) {
    const nodes = $$('.wnode', wheel), panels = $$('.wpanel');
    const n = nodes.length;
    nodes.forEach((b, i) => {   // place on the ring, first stop at 12 o'clock
      const a = -Math.PI / 2 + i * 2 * Math.PI / n;
      b.style.left = 50 + 41 * Math.cos(a) + '%'; b.style.top = 50 + 41 * Math.sin(a) + '%';
    });
    const go = (i, focus) => {
      i = (i + n) % n;
      nodes.forEach((b, j) => { b.setAttribute('aria-selected', j === i); b.tabIndex = j === i ? 0 : -1; });
      panels.forEach((p, j) => { p.classList.toggle('is-on', j === i); p.hidden = j !== i; });
      if (focus) nodes[i].focus();
    };
    nodes.forEach((b, i) => {
      b.addEventListener('click', () => go(i));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(i + 1, true); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(i - 1, true); }
      });
    });
    $$('.wnext').forEach((b, i) => b.addEventListener('click', () => go(i + 1)));
    go(0);
  }

  /* ---- cocktails: pour glass drawn from the recipe, bands fill on scroll ---- */
  const COL = { dark: '#9a5a24', white: '#e9eef0', fin: '#dfe9f3', lime: '#b9d36a', syrup: '#e6c27a', orgeat: '#efe3c8', blue: '#2f8fd0', orange: '#f0a04b', cola: '#3a1f12', ginger: '#e8c77a', soda: '#d8eef2', pine: '#f2d66b', grape: '#f2a7a0', coconut: '#f6f1e4', bitters: '#7a2a1a', infused: '#f1df9a' };
  $$('.ck').forEach((card) => {
    const svg = $('.ck__glass', card); if (!svg) return;
    const parts = $$('li[data-oz]', card).map((li) => ({ oz: parseFloat(li.dataset.oz), c: COL[li.dataset.c] || '#ccc' })).filter((p) => p.oz > 0);
    $$('li[data-c] i', card).forEach((i) => { i.style.background = COL[i.parentNode.dataset.c] || '#ccc'; });
    const total = parts.reduce((s, p) => s + p.oz, 0) || 1;
    const H = 120, top = 18, inner = H - top - 8; let y = H - 8, out = '';
    parts.forEach((p, k) => {
      const h = inner * p.oz / total; y -= h;
      out += `<rect class="band" x="9" y="${y.toFixed(1)}" width="46" height="${(h + .6).toFixed(1)}" fill="${p.c}" style="transition-delay:${k * 140}ms"/>`;
    });
    svg.innerHTML = `<defs><clipPath id="g${Math.random().toString(36).slice(2, 7)}"><path d="M8 10 L56 10 L52 112 Q32 118 12 112 Z"/></clipPath></defs>`;
    const id = $('clipPath', svg).id;
    svg.innerHTML += `<g clip-path="url(#${id})">${out}</g><path d="M8 10 L56 10 L52 112 Q32 118 12 112 Z" fill="none" stroke="#22302e" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 22 L16 100" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round"/>`;
  });
  seen($$('.ck'));

  /* sticky bottle bar highlights the section you are in */
  const bar = $$('.ckbar a');
  if (bar.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) bar.forEach((a) => a.classList.toggle('is-on', a.hash === '#' + e.target.id));
    }), { rootMargin: '-40% 0px -55% 0px' });
    $$('.cks').forEach((s) => io.observe(s));
  }
})();

/* Our Story: a dive line runs down the chapters; each year tag lights up when the line reaches it */
(function () {
  var box = document.querySelector('.ostl'); if (!box) return;
  var line = box.querySelector('.ostl__line i'), tags = [].slice.call(box.querySelectorAll('.ostl__tag'));
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches, tick = false;
  function set() {
    tick = false;
    var r = box.getBoundingClientRect(), reach = innerHeight * .55 - r.top;
    var p = RM ? 1 : Math.min(1, Math.max(0, reach / r.height));
    line.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    tags.forEach(function (t) { var tr = t.getBoundingClientRect(); t.classList.toggle('is-on', RM || tr.top + tr.height / 2 - r.top <= reach); });
  }
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(set); } }, { passive: true });
  addEventListener('resize', set); set();
})();


/* medal lines outside the homepage: drop in once they are on screen */
(function () {
  var m = [].slice.call(document.querySelectorAll('.osm3 .medals')); if (!m.length) return;
  if (!('IntersectionObserver' in window)) { m.forEach(function (x) { x.classList.add('is-in'); }); return; }
  var o = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); o.unobserve(e.target); } }); }, { threshold: .2 });
  m.forEach(function (x) { o.observe(x); });
})();
