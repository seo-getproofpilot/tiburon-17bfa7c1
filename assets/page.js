/* Inner pages: age gate, nav, reveals, the lazy background loops. The homepage runs app.js instead. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const mobile = matchMedia('(max-width:900px),(orientation:portrait) and (max-width:1180px)');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- legal-age gate: same answer as the homepage (localStorage tb_age) ---------- */
  const gate = $('#agegate');
  if (gate && root.classList.contains('needs-age')) {
    const yes = gate.querySelector('[data-age=yes]'); yes.focus({ preventScroll: true });
    gate.addEventListener('click', (e) => {
      const b = e.target.closest('[data-age]'); if (!b) return;
      if (b.dataset.age === 'yes') { try { localStorage.setItem('tb_age', '1'); } catch (e2) {} root.classList.remove('needs-age'); return; }
      gate.querySelector('.gate__q').textContent = 'Then we’ll see you when you are.';
      gate.querySelector('.gate__btns').innerHTML = '<a class="btn btn--glass" href="https://oceana.org/">Meet the reef we protect</a>';
      gate.querySelector('.gate__note').textContent = 'This site is for adults of legal drinking age.';
    });
  }

  /* ---------- nav ---------- */
  const nav = $('#nav'), menu = $('.nav__menu'), drawer = $('#drawer');
  if (menu && drawer) {
    menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', open); drawer.hidden = !open; solid(); });
    drawer.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.setAttribute('aria-expanded', 'false'); drawer.hidden = true; solid(); } });
  }
  const solid = () => nav && nav.classList.toggle('is-solid', scrollY > 60 || (drawer && !drawer.hidden));
  addEventListener('scroll', solid, { passive: true }); solid();

  /* ---------- reveals ---------- */
  const rv = $$('.rv, .foot__mark');
  if ('IntersectionObserver' in window && !RM) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rv.forEach((el, i) => { el.style.transitionDelay = (i % 3) * 80 + 'ms'; io.observe(el); });
  } else rv.forEach((el) => el.classList.add('is-in'));

  /* ---------- recipe filters (White Tip infusions) ---------- */
  const chips = $$('[data-filter]'), cards = $$('[data-tags]');
  chips.forEach((c) => c.addEventListener('click', () => {
    const f = c.dataset.filter;
    chips.forEach((x) => { const on = x === c; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
    cards.forEach((k) => { k.hidden = f !== 'all' && !k.dataset.tags.split(' ').includes(f); });
  }));

  /* ---------- background loops: load near the viewport, play only while visible ---------- */
  /* ---------- a film that plays once and holds on its last frame (FIN hero) ---------- */
  $$('video[data-once]').forEach((v) => {
    const m = mobile.matches;
    v.poster = m ? v.dataset.pm : v.dataset.pd;
    if (RM) { v.poster = (m ? v.dataset.pm : v.dataset.pd).replace('-0m.', '-m.').replace('-0.', '.'); return; }
    v.src = m ? v.dataset.m : v.dataset.d;
    let played = false;
    const go = () => { if (played || root.classList.contains('needs-age')) return; played = true; v.play().catch(() => { played = false; }); };
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setTimeout(go, 500); }), { threshold: .4 });
    io.observe(v);
    if (gate) gate.addEventListener('click', (e) => { if (e.target.closest('[data-age=yes]')) setTimeout(go, 600); });
  });

  $$('video[data-d]:not([data-once])').forEach((v) => {
    if (RM) return;
    const src = () => (mobile.matches ? v.dataset.m : v.dataset.d);
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { if (!v.getAttribute('src')) { v.src = src(); v.preload = 'auto'; } v.play().catch(() => {}); } else v.pause();
    }), { rootMargin: '200px 0px' });
    io.observe(v);
  });
})();
