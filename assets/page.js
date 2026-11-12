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

  /* ---------- tasting request ticket (Tasting Rooms): the stub keeps count; submit opens an email (no backend yet) ---------- */
  const book = $('#bookForm');
  if (book) {
    const d = book.querySelector('[name=date]'); d.min = new Date().toISOString().slice(0, 10);
    const g = book.querySelector('[name=guests]');
    const stub = () => { const n = Math.max(1, Math.min(20, parseInt(g.value, 10) || 1)); $('#tkN').textContent = n; $('#tkTotal').textContent = '$' + n * 25; $('#tkRoom').textContent = book.querySelector('[name=room]:checked').value; };
    $$('.ticket__step button', book).forEach((b) => b.addEventListener('click', () => { g.value = Math.max(1, Math.min(20, (parseInt(g.value, 10) || 1) + +b.dataset.d)); stub(); }));
    book.addEventListener('input', stub); book.addEventListener('change', stub); stub();
    $$('[data-room]').forEach((a) => a.addEventListener('click', () => { const r = book.querySelector(`[name=room][value="${a.dataset.room}"]`); if (r) { r.checked = true; stub(); } }));
    book.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!book.checkValidity()) { book.reportValidity(); return; }
      const f = new FormData(book), room = f.get('room');
      const when = new Date(f.get('date') + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const body = `Hi Tiburon team,\n\nI'd like to book a rum tasting.\n\nRoom: ${room}\nDate: ${when}\nGuests: ${f.get('guests')}\nName: ${f.get('name')}\nEmail: ${f.get('email')}\n\nThank you!`;
      location.href = 'mailto:basil@sharkbaitco.com?subject=' + encodeURIComponent(`Tasting request, ${room}, ${when}`) + '&body=' + encodeURIComponent(body);
      book.querySelector('.ticket__note').textContent = 'Your email app should open with the request ready to send.';
    });
  }

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
