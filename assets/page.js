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
      if (b.dataset.age === 'yes') { try { localStorage.setItem('tb_age', '1'); } catch (e2) {} (window.dataLayer = window.dataLayer || []).push({ event: 'age_gate_pass' }); root.classList.remove('needs-age'); return; }
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

  /* ---------- tasting request ticket (Tasting Rooms): the stub keeps count; sent by assets/forms.js (email fallback) ---------- */
  const book = $('#bookForm');
  if (book) {
    const d = book.querySelector('[name=date]'); d.min = new Date().toISOString().slice(0, 10);
    const g = book.querySelector('[name=guests]');
    const stub = () => { const n = Math.max(1, Math.min(20, parseInt(g.value, 10) || 1)); $('#tkN').textContent = n; $('#tkTotal').textContent = '$' + n * 30; const r = book.querySelector('[name=room]:checked'), go = book.querySelector('.ticket__go'); $('#tkRoom').textContent = r ? r.value : 'Pick a room'; if (go) { go.disabled = !r; book.classList.toggle('has-room', !!r); } const nt = book.querySelector('.ticket__note'); if (nt && !nt.dataset.sent) nt.textContent = r ? 'Sends your request straight to our team.' : 'Pick a tasting room to request your tasting.'; };
    $$('.ticket__step button', book).forEach((b) => b.addEventListener('click', () => { g.value = Math.max(1, Math.min(20, (parseInt(g.value, 10) || 1) + +b.dataset.d)); stub(); }));
    /* v102: hours from Henry Garcia (Tiburón VP of Sales, 2026-11-19); Caye Caulker is the only room closed a day (Mondays) */
    const OPEN = { 'Caye Caulker': [[0, 2, 3, 4, 5, 6], 'Tuesday to Sunday (closed Mondays)'] };
    const dayCheck = () => { const r = book.querySelector('[name=room]:checked'), o = r && OPEN[r.value]; let m = '';
      if (o && d.value) { const wd = new Date(d.value + 'T12:00').getDay(); if (o[0].indexOf(wd) < 0) m = `${r.value} is open ${o[1]}. Please pick another day.`; }
      d.setCustomValidity(m); const nt = book.querySelector('.ticket__note'); if (m && nt) { nt.textContent = m; nt.classList.add('is-warn'); } else if (nt) nt.classList.remove('is-warn'); return !m; };
    book.addEventListener('input', () => { stub(); dayCheck(); }); book.addEventListener('change', () => { stub(); dayCheck(); }); stub();
    $$('[data-room]').forEach((a) => a.addEventListener('click', () => { const r = book.querySelector(`[name=room][value="${a.dataset.room}"]`); if (r) { r.checked = true; stub(); } }));
    book.addEventListener('submit', (e) => {
      e.preventDefault();
      dayCheck(); if (!book.checkValidity()) { book.reportValidity(); return; }
      const f = new FormData(book), room = f.get('room');
      const when = new Date(f.get('date') + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const body = `Hi Tiburon team,\n\nI'd like to book a rum tasting.\n\nRoom: ${room}\nDate: ${when}\nGuests: ${f.get('guests')}\nName: ${f.get('name')}\nEmail: ${f.get('email')}\n\nThank you!`;
      const subj = `Tasting request, ${room}, ${when}`, nt = book.querySelector('.ticket__note'), go = book.querySelector('.ticket__go');
      nt.dataset.sent = '1'; nt.textContent = 'Sending your request…'; if (go) go.disabled = true;
      tbSend('Tasting request', subj, { Room: room, Date: when, Guests: f.get('guests'), Name: f.get('name'), Email: f.get('email') }).then((ok) => {
        if (go) go.disabled = false;
        if (ok) { nt.textContent = 'Request sent. We’ll email you to confirm your tasting.'; return; }
        tbMailto(subj, body); nt.innerHTML = 'Your email app should open with the request ready to send. If nothing opened, email <a href="mailto:basil@sharkbaitco.com">basil@sharkbaitco.com</a>.';
      });
    });
  }

  /* ---------- shipping checker (Where to Buy): the ten states on their Buy Now page are the only ones excluded ---------- */
  const sel = $('#stateSel');
  if (sel) {
    const ALL = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
    const NO = ['Alabama','Alaska','Hawaii','Idaho','Massachusetts','Michigan','Mississippi','Montana','Oklahoma','Utah'];
    ALL.forEach((s) => { const o = document.createElement('option'); o.value = o.textContent = s; sel.appendChild(o); });
    const out = $('#stateOut');
    sel.addEventListener('change', () => {
      const s = sel.value; out.className = 'ship__out';
      if (!s) { out.textContent = ''; return; }
      if (NO.includes(s)) { out.classList.add('is-no'); out.innerHTML = `Sorry, our partners can't ship to ${s} right now. You can still taste Tiburón at our <a href="../tasting-rooms/">tasting rooms in Belize</a>, or ${document.querySelector('a[href*="find-tiburon/"]') ? '<a href="../find-tiburon/">find a store or bar near you</a>' : '<a href="../distributors/#map">see where it\'s poured</a>'}.`; }
      else { out.classList.add('is-yes'); out.innerHTML = `Good news: ${s} is on our partners' shipping list. <a href="#top" onclick="window.scrollTo({top:0,behavior:\x27smooth\x27})">Shop the bottles</a>${document.querySelector('a[href*="find-tiburon/"]') ? ' or <a href="../find-tiburon/">find one near you</a>' : ''}`; }
    });
  }

  /* ---------- wholesale + contact forms: honeypot and a minimum fill time keep bots out; sent by assets/forms.js (email fallback) ---------- */
  $$('form[data-kind]').forEach((f) => {
    const t0 = Date.now();
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = f.querySelector('.wform__note');
      if (f.website && f.website.value) return;                 // a bot filled the hidden field
      if (Date.now() - t0 < 2500) { note.textContent = 'One moment, then try again.'; return; }
      if (!f.checkValidity()) { f.reportValidity(); return; }
      const d = new FormData(f); d.delete('website');
      const lines = [...d.entries()].map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${v}`).join('\n');
      const subj = `${f.dataset.kind}${d.get('business') ? ', ' + d.get('business') : ''}`;
      const fields = {}; d.forEach((v, k) => { fields[k[0].toUpperCase() + k.slice(1)] = v; });
      note.textContent = 'Sending…';
      tbSend(f.dataset.kind, subj, fields).then((ok) => {
        if (ok) { note.textContent = 'Thanks. Your message is with our team and we’ll reply by email.'; f.reset(); return; }
        tbMailto(subj, `Hi Tiburon team,\n\n${lines}\n`); note.innerHTML = 'Your email app should open with the message ready to send. If nothing opened, email <a href="mailto:basil@sharkbaitco.com">basil@sharkbaitco.com</a>.';
      });
    });
  });

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

  $$('video[data-d]:not([data-once]):not([data-own])').forEach((v) => {
    if (RM) return;
    const src = () => (mobile.matches ? v.dataset.m : v.dataset.d);
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { if (!v.getAttribute('src')) { v.src = src(); v.preload = 'auto'; } v.play().catch(() => {}); } else v.pause();
    }), { rootMargin: '200px 0px' });
    io.observe(v);
  });
})();

/* v85: the footer's top fade must fall on empty space, never on the last section's words.
   The last section gets extra bottom room the height of the fade. */
(function () {
  if (document.body.classList.contains('pg--home')) return;
  var foot = document.querySelector('.foot'), main = document.querySelector('main');
  if (!foot || !main) return;
  var last = main.lastElementChild; while (last && (last.offsetHeight === 0 || /^(SCRIPT|TEMPLATE)$/.test(last.tagName))) last = last.previousElementSibling;
  if (!last) return;
  var base = null;
  function fit() {
    var h = (parseFloat(getComputedStyle(foot, '::before').height) || 0) + Math.max(0, -(parseFloat(getComputedStyle(foot).marginTop) || 0));
    last.style.removeProperty('padding-bottom'); base = parseFloat(getComputedStyle(last).paddingBottom) || 0;
    last.style.setProperty('padding-bottom', (base + h) + 'px', 'important');
  }
  fit(); addEventListener('resize', fit);
})();
