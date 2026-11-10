/* v32: the lower page. Timeline progress, the process picker, tasting booking, the reef fly-down, the medal wall. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width:900px)').matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ss = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };

  /* ---------- timeline: the spine fills as you read; each chapter arrives once ---------- */
  const tl = $('#timeline');
  if (tl) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -18% 0px', threshold: .12 });
    $$('.tl__ch', tl).forEach((li) => io.observe(li));
    const spine = () => { const r = tl.getBoundingClientRect(); tl.style.setProperty('--p', clamp((innerHeight * .55 - r.top) / r.height).toFixed(4)); };
    addEventListener('scroll', spine, { passive: true }); spine();
  }

  /* ---------- process: tabs (arrow keys move between them) ---------- */
  const tabs = $$('.process__tabs [role=tab]');
  const pick = (t, focus) => {
    tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; const p = $('#' + x.getAttribute('aria-controls')); p.hidden = !on; p.classList.toggle('is-on', on); });
    $('.process').dataset.k = t.dataset.k; if (focus) t.focus();
  };
  $$('[data-tab]').forEach((a) => a.addEventListener('click', () => { const t = tabs.find((x) => x.dataset.k === a.dataset.tab); if (t) pick(t); }));
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(t));
    t.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); pick(tabs[(i + d + tabs.length) % tabs.length], true); } });
  });

  /* ---------- booking: a ticket; the stub keeps count; submitting opens an email to the team (no backend) ---------- */
  const book = $('#bookForm');
  if (book) {
    const d = book.querySelector('[name=date]'); d.min = new Date().toISOString().slice(0, 10);
    const g = book.querySelector('[name=guests]');
    const stub = () => { const n = Math.max(1, Math.min(20, parseInt(g.value, 10) || 1)); $('#tkN').textContent = n; $('#tkTotal').textContent = '$' + n * 25; $('#tkRoom').textContent = book.querySelector('[name=room]:checked').value; };
    $$('.ticket__step button', book).forEach((b) => b.addEventListener('click', () => { g.value = Math.max(1, Math.min(20, (parseInt(g.value, 10) || 1) + +b.dataset.d)); stub(); }));
    book.addEventListener('input', stub); book.addEventListener('change', stub); stub();
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

  /* ---------- reef: scroll flies the camera down from the air, through the surface, onto the reef ---------- */
  const reef = $('.reef'), pin = $('.reef__pin'), vid = $('.reef__vid'), caps = $$('.rc'), depth = $('.reef__depth'), endP = $('.reef__end'), stage = $('.reef__stage');
  if (reef && pin && vid) {
    let target = 0, shown = 0, dur = 10, ready = false, raf = 0, loaded = false;
    const load = () => {
      if (loaded) return; loaded = true;
      vid.src = mobile ? vid.dataset.m : vid.dataset.d; vid.preload = 'auto';
      vid.addEventListener('loadedmetadata', () => { dur = vid.duration || 10; ready = true; vid.currentTime = 0.001; }, { once: true });
      vid.addEventListener('seeked', () => vid.classList.add('is-on'), { once: true });
    };
    const near = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { load(); near.disconnect(); } }), { rootMargin: '150% 0px' });
    near.observe(reef);
    const prog = () => { const r = pin.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
    const paint = (p) => {
      caps.forEach((c) => {
        const a = +c.dataset.a, b = +c.dataset.b, w = .06;
        const o = Math.min(ss((p - a) / w + (a === 0 ? 1 : 0)), ss((b - p) / w + (b > 1 ? 1 : 0)));
        c.style.opacity = o.toFixed(3); c.style.transform = `translateY(${((1 - o) * 18).toFixed(1)}px)`;
        c.classList.toggle('is-on', o > .5);
      });
      if (depth) depth.style.setProperty('--d', Math.min(1, p / .86).toFixed(4));
      const e = ss((p - .86) / .08);                         // the film is done: everything left fades up in the middle
      if (stage) stage.style.setProperty('--end', e.toFixed(3));
      if (endP) endP.classList.toggle('is-on', e > .5);
    };
    const tick = () => {
      raf = 0;
      shown += (target - shown) * (RM ? 1 : .085);
      if (Math.abs(target - shown) < .0005) shown = target;
      if (ready && !vid.seeking) { const t = Math.min(dur - .05, Math.min(1, shown / .86) * dur); if (Math.abs(vid.currentTime - t) > .015) vid.currentTime = t; }
      paint(shown);
      if (shown !== target) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => { const r = reef.getBoundingClientRect(); if (r.bottom < -100 || r.top > innerHeight + 100) return; target = prog(); if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll(); paint(0);
  }

  /* ---------- awards: the full record, year by year ---------- */
  const rec = $('#awRecord');
  if (rec) {
    const M = [
      [2025, 'gold', 'Gold', 'Asia World Spirits Competition, FIN Tequila Blanco'],
      [2022, 'gold', 'Gold', 'San Francisco World Spirits Competition, White Tip'],
      [2021, 'gold', 'Gold', 'San Francisco World Spirits Competition'],
      [2019, 'gold', 'Gold', 'San Francisco World Spirits Competition, Dark 8'],
      [2017, 'best', 'Best in Class', 'Miami Rum Festival, Rum XP'], [2017, 'silver', 'Silver', 'San Francisco World Spirits Competition'],
      [2016, 'best', 'Best in Class', 'WSWA Show'], [2016, 'double', 'Double Gold', 'WSA Show'], [2016, 'gold', 'Gold', 'Miami Rum Festival'], [2016, 'gold', 'Gold', 'Bar Biz Magazine Spirit Competition'],
      [2015, 'double', 'Double Gold, Best in Class', 'WSWA Competition'], [2015, 'gold', 'Gold', 'The Fifty Best, aged rum'], [2015, 'gold', 'Gold', 'SIP Awards'], [2015, 'gold', 'Gold, packaging', 'SIP Awards'],
      [2015, 'gold', 'Gold', 'Craft International Competition'], [2015, 'silver', 'Silver', 'IWSC, London'], [2015, 'silver', 'Silver', 'Los Angeles International Spirits Competition'],
      [2014, 'platinum', 'Platinum', 'SIP Awards'], [2014, 'gold', 'Gold', 'The Fifty Best, aged rum'], [2014, 'gold', 'Gold', 'International Craft Spirit Competition'], [2014, 'gold', 'Gold', 'Spirits of the Americas Competition'],
      [2014, 'silver', 'Silver', 'SIP Awards'], [2014, 'silver', 'Silver', 'San Diego International'], [2014, 'silver', 'Silver', 'IWSC, London'], [2014, 'silver', 'Silver', 'New York World Wine & Spirits'],
      [2014, 'bronze', 'Bronze', 'San Francisco World Spirits Competition'],
    ];
    const years = [...new Set(M.map((m) => m[0]))].sort((a, b) => b - a);
    const c = $('#awCount'); if (c) c.textContent = M.length;
    rec.innerHTML = years.map((y) => `<div class="rec__yr"><b>${y}</b><ul>${M.filter((m) => m[0] === y).map((m) =>
      `<li><span class="pill pill--${m[1]}">${m[2]}</span>${m[3]}</li>`).join('')}</ul></div>`).join('');
  }

  /* ---------- small reveals for the new blocks ---------- */
  const rv = $$('.story__head>*, .process__head>*, .process__tabs, .rx__text>*, .rx__pics figure, .visit2__head, .strip li, .ticket, .aw__photo, .aw__intro>*, .plinth, .rec__yr');
  rv.forEach((el, i) => { el.classList.add('rv'); el.style.transitionDelay = (i % 4) * 70 + 'ms'; });
  const ro = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .08 });
  rv.forEach((el) => ro.observe(el));
})();
