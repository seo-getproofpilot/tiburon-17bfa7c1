/* Tiburon Rum homepage */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const root = document.documentElement;
  const mq = window.matchMedia('(max-width:900px)');
  let mobile = mq.matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let vw = innerWidth, vh = innerHeight;

  /* ---------------- intro ---------------- */
  (function intro() {
    const el = $('#intro');
    if (!el || root.classList.contains('no-intro')) return;
    const short = root.classList.contains('intro-short');
    const t0 = performance.now(), minT = short ? 750 : 2050, maxT = short ? 1600 : 3400;
    root.style.overflow = 'hidden';
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      el.classList.add('is-out'); root.style.overflow = ''; root.classList.remove('intro-pending');
      try { sessionStorage.setItem('tb_intro', '1'); } catch (e) {}
      setTimeout(() => el.classList.add('is-gone'), 1150);
    };
    const ready = () => setTimeout(finish, Math.max(0, minT - (performance.now() - t0)));
    // wait for the three bottles and fonts, never longer than maxT
    const imgs = ['b-dark', 'b-white', 'b-fin'].map(n => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = `assets/img/${n}.webp`; }));
    Promise.all([...imgs, document.fonts ? document.fonts.ready : Promise.resolve()]).then(ready);
    setTimeout(finish, maxT);
  })();

  /* ---------------- nav ---------------- */
  const nav = $('#nav'), menu = $('.nav__menu'), drawer = $('#drawer');
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', open); drawer.hidden = !open; nav.classList.add('is-solid');
  });
  drawer.addEventListener('click', e => { if (e.target.closest('a')) { menu.setAttribute('aria-expanded', 'false'); drawer.hidden = true; } });

  /* ---------------- the dive: scroll-driven video at a governed speed ---------------- */
  const dive = $('.dive'), vid = $('#diveVid'), still = $('#diveStill'), stageEl = $('.dive__stage');
  const copies = $$('.dc'), depthVal = $('#depthVal'), depthBar = $('#depthBar');
  const heroVid = $('#heroVid'), heroCard = $('.dc--hero');
  const STAGES = ['hero', '0', '1', '2', 'end'], DEPTH = [0, 0, 3, 18, 0];
  let TIMES = [0, 6, 14, 22, 30];                // replaced from the master's real stops below
  const STILL = ['k4', 'k1', 'k2', 'k3', 'k4'];
  const VH_PER_SEC = .55, HOLD_VH = 1.4;          // scroll per second of footage; scroll spent paused at a stop
  const MAX_RATE = 2.2, CATCH = 3.2;              // playback never faster than 2.2x; how eagerly it closes the gap
  const src = () => (mobile ? vid.dataset.m : vid.dataset.d);
  vid.src = src(); vid.preload = 'auto'; vid.load();
  fetch('assets/video/dive.json').then(r => r.json()).then(j => { TIMES = j.stops; layout(); }).catch(() => {});
  // scroll layout: hold, move, hold, move ... hold (in viewport heights)
  let SEG = [];
  function layout() {
    SEG = []; let u = 0;
    for (let k = 0; k < 5; k++) {
      SEG.push({ hold: k, a: u, b: u += HOLD_VH });
      if (k < 4) SEG.push({ move: k, a: u, b: u += (TIMES[k + 1] - TIMES[k]) * VH_PER_SEC });
    }
    dive.style.height = `calc(100vh + ${u.toFixed(3)} * 100vh)`;
    const anchor = $('#bottles'); if (anchor) anchor.style.top = Math.round(SEG[2].a * innerHeight) + 'px';
  }
  layout();
  function targetTime() {
    const y = -dive.getBoundingClientRect().top / innerHeight;
    for (const x of SEG) if (y <= x.b) {
      if ('hold' in x) return { T: TIMES[x.hold], hold: x.hold };
      return { T: TIMES[x.move] + (TIMES[x.move + 1] - TIMES[x.move]) * clamp((y - x.a) / (x.b - x.a)), hold: -1 };
    }
    return { T: TIMES[4], hold: 4 };
  }
  // living moments at some stops; labels pinned on top
  const moment = $('#diveMoment'), label = $('#diveLabel');
  const MOMENTS = { 1: 'pel', 3: 'whale' };
  let momentAt = -1;
  function startMoment(k) {
    const name = MOMENTS[k]; if (!name || reduce || momentAt === k) return;
    momentAt = k;
    label.src = `assets/img/lab-k${k}-${mobile ? 'm' : 'd'}.webp`;
    const want = `assets/video/m-${name}${mobile ? '-m' : ''}.mp4`;
    if (!moment.src.endsWith(want)) { moment.src = want; moment.load(); }
    const go = () => { if (momentAt !== k) return; moment.currentTime = 0; label.classList.add('is-on'); moment.classList.add('is-on'); moment.play().catch(() => {}); };
    if (moment.readyState >= 3) setTimeout(go, 600); else moment.addEventListener('canplaythrough', () => setTimeout(go, 400), { once: true });
  }
  function stopMoment() { if (momentAt < 0) return; momentAt = -1; moment.classList.remove('is-on'); label.classList.remove('is-on'); setTimeout(() => { if (momentAt < 0) moment.pause(); }, 400); }
  let restAt = -2, shownCard;
  function rest(k) {
    if (k === restAt) return; restAt = k;
    if (k >= 0) { const url = `assets/seq/${STILL[k]}-${mobile ? 'm' : 'd'}.webp`; if (!still.src.endsWith(url)) still.src = url; still.classList.add('is-on'); startMoment(k);
      if (k === 0 && heroVid && heroVid.src && !reduce) heroVid.play().catch(() => {}); }
    else { still.classList.remove('is-on'); stopMoment(); if (heroVid && !heroVid.paused) heroVid.pause(); }
  }
  rest(0);
  let lastNow = 0;
  function chapterFrame(now) {
    const dt = Math.min(.05, (now - (lastNow || now)) / 1000); lastNow = now;
    const { T, hold } = targetTime();
    const t = vid.currentTime || 0, gap = T - t;
    if (vid.readyState >= 2) {
      if (reduce) { if (Math.abs(gap) > .01 && !vid.seeking) vid.currentTime = T; }
      else if (gap > .015) {                                   // forward: native playback, speed from the gap
        const r = clamp(gap * CATCH, .35, MAX_RATE);
        if (Math.abs(vid.playbackRate - r) > .05) vid.playbackRate = r;
        if (vid.paused) vid.play().catch(() => {});
      } else if (gap < -.015) {                                // backward: step by seeking, same speed cap
        if (!vid.paused) vid.pause();
        if (!vid.seeking) vid.currentTime = Math.max(T, t - clamp(-gap * CATCH, .35, MAX_RATE) * Math.max(dt, 1 / 30) * 2);
      } else if (!vid.paused) { vid.pause(); }
    }
    const t2 = vid.currentTime || 0;
    rest(hold >= 0 && Math.abs(t2 - TIMES[hold]) < .06 ? hold : -1);
    // cards: shown while the footage is near a stop (so a continuous scroll still reads them) or you are parked there
    let near = -1; for (let k = 0; k < 5; k++) if (Math.abs(t2 - TIMES[k]) < (k === 0 ? .5 : .9)) near = k;
    if (near < 0 && hold >= 0 && Math.abs(t2 - TIMES[hold]) < 1.2) near = hold;
    const st = near >= 0 ? STAGES[near] : null;
    if (st !== shownCard) { shownCard = st; copies.forEach(c => c.classList.toggle('is-on', c.dataset.s === st)); }
    // hero layer fades with the clock; depth follows the clock
    const hA = clamp(1 - (t2 - TIMES[0]) / 1.4);
    if (stageEl._hA !== hA.toFixed(2)) { stageEl._hA = hA.toFixed(2); stageEl.style.setProperty('--heroA', stageEl._hA); }
    let d = 0;
    for (let k = 0; k < 4; k++) if (t2 >= TIMES[k] && t2 <= TIMES[k + 1]) { const e = ease(clamp((t2 - TIMES[k]) / (TIMES[k + 1] - TIMES[k]))); d = lerp(DEPTH[k], DEPTH[k + 1], e); }
    depthVal.textContent = d.toFixed(1);
    depthBar.style.setProperty('--d', (d / 18).toFixed(3));
  }

  /* hero loop video (desktop); 'The bottles' anchor sits at chapter 1 */
  if (heroVid && innerWidth >= 900 && !reduce) { heroVid.src = heroVid.dataset.src; heroVid.play().catch(() => {}); }
  addEventListener('resize', layout);

  /* ---------------- pick your pour: reveal once ---------------- */
  const pours = $$('.pour');
  if ('IntersectionObserver' in window) {
    const po = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); po.unobserve(e.target); } }), { threshold: .22 });
    pours.forEach(el => po.observe(el));
  } else pours.forEach(el => el.classList.add('is-in'));

  /* ---------------- ocean: the blue hole opens ---------------- */
  const ocPin = $('.ocean__pin'), hole = $('.ocean__hole img');
  function oceanFrame() {
    const r = ocPin.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const e = ease(clamp(-r.top / Math.max(1, r.height - vh) * 1.2));
    hole.style.setProperty('--r', lerp(mobile ? 20 : 15, mobile ? 46 : 44, e).toFixed(2) + '%');
    hole.style.setProperty('--hz', lerp(1.3, 1, e).toFixed(4));
  }

  /* ---------------- generic reveals ---------------- */
  const revealEls = $$('.story__text>*, .story__facts div, .infuse__head>*, .infuse__foot>*, .ob__text, .ocean__boat figure, .rooms__head>*, .room, .awards__head>*, .foot__buy>*');
  revealEls.forEach((el, i) => { el.classList.add('reveal'); el.style.transitionDelay = (i % 3) * 90 + 'ms'; });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    revealEls.forEach(el => io.observe(el));
  } else revealEls.forEach(el => el.classList.add('is-in'));

  /* ---------------- frame loop ---------------- */
  let lastY = -1;
  function frame() {
    requestAnimationFrame(frame);
    const sy = scrollY;
    const dr = dive.getBoundingClientRect();
    if (dr.bottom > 0 && dr.top < vh) chapterFrame(performance.now());
    if (sy !== lastY) { oceanFrame(); nav.classList.toggle('is-solid', sy > vh * .6 || !drawer.hidden); lastY = sy; }
  }
  requestAnimationFrame(frame);
  addEventListener('resize', () => { vw = innerWidth; vh = innerHeight; const m = mq.matches; if (m !== mobile) { mobile = m; const t = vid.currentTime; vid.src = src(); vid.addEventListener('loadeddata', () => { vid.currentTime = t; }, { once: true }); } }, { passive: true });

  /* ---------------- infusions ---------------- */
  const REC = [
    { n: 'Pineapple Cinnamon', img: 'inf-pineapple', i: ['1/2 bottle Tiburon White Tip', '1/4 fresh pineapple, diced', '2 cinnamon sticks'] },
    { n: 'Pineapple Ginger', img: 'inf-pineapple', i: ['1/2 bottle Tiburon White Tip', '1/4 fresh pineapple, diced', 'Fresh ginger, peeled and diced'] },
    { n: 'Spicy Pineapple', img: 'inf-mango', i: ['1/2 bottle Tiburon White Tip', '1/4 fresh pineapple, diced', '1 jalapeño, seeds removed and washed'] },
    { n: 'Spicy Mango', img: 'inf-mango', i: ['1/2 bottle Tiburon White Tip', '1/4 fresh mango, diced', '1 jalapeño, seeds removed and washed'] },
    { n: 'Chocolate & Coffee', img: 'inf-coffee', i: ['1/2 bottle Tiburon White Tip', '10 single cocoa beans, rest 3 days at room temperature', '1 tsp flavoured ground coffee (vanilla or caramel), rest 1 day', 'Strain out the beans and coffee'] },
    { n: 'Red Apple Cinnamon', img: 'inf-apple', i: ['1/2 bottle Tiburon White Tip', '1 red apple, sliced with the skin on', '2 cinnamon sticks'] },
    { n: 'Guava Pear', img: 'inf-pear', i: ['1/2 bottle Tiburon White Tip', '1 guava', '1 pear', '1/2 cup pink pear juice'] },
    { n: 'Berry Basil', img: 'inf-cucumber', i: ['1/2 bottle Tiburon White Tip', '5 to 10 fresh blueberries', '5 fresh basil leaves', '1/2 cup pineapple juice'] },
    { n: 'Spicy Cucumber Basil', img: 'inf-cucumber', i: ['1/2 bottle Tiburon White Tip', '1 small cucumber, sliced with the skin on', '5 basil leaves, or to taste', '1 jalapeño, seeds removed', 'Fresh lime juice'] },
    { n: 'Limoncello', img: 'inf-pineapple', i: ['3/4 bottle Tiburon White Tip', '5 lemons', '2 cups water', '1 cup white sugar'] }
  ];
  REC[9].img = 'inf-cucumber';
  const list = $('#infList'), recImg = $('#recImg'), recName = $('#recName'), recIng = $('#recIng'), recNote = $('#recNote'), fig = $('.recipe__img');
  REC.forEach((r, k) => {
    const li = document.createElement('li');
    li.innerHTML = `<button role="tab" id="inf-${k}" aria-selected="${k === 0}" aria-controls="recipe">${r.n}</button>`;
    list.appendChild(li);
  });
  function show(k) {
    const r = REC[k];
    $$('button', list).forEach((b, j) => b.setAttribute('aria-selected', j === k));
    recName.textContent = r.n;
    recIng.innerHTML = r.i.map(x => `<li>${x}</li>`).join('');
    recNote.textContent = k === 4 ? 'Finish with the house syrup below.' : 'Seal it, let it sit a few days, then sweeten with the house syrup to taste.';
    const src = `assets/img/${r.img}.webp`;
    if (!recImg.src.endsWith(src)) {
      fig.classList.add('is-swap');
      const pre = new Image(); pre.onload = () => { recImg.src = src; requestAnimationFrame(() => fig.classList.remove('is-swap')); }; pre.src = src;
    }
    recImg.alt = `Serving suggestion for a ${r.n} infusion`;
  }
  list.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(+b.id.split('-')[1]); });
  list.addEventListener('keydown', e => {
    if (!/Arrow(Up|Down|Left|Right)/.test(e.key)) return; e.preventDefault();
    const cur = $$('button', list).findIndex(b => b.getAttribute('aria-selected') === 'true');
    const n = (cur + (/Down|Right/.test(e.key) ? 1 : -1) + REC.length) % REC.length; show(n); $('#inf-' + n).focus();
  });
  show(0);

  /* ---------------- awards rail: drag to scroll ---------------- */
  const rail = $('#rail');
  let down = false, sx = 0, sl = 0;
  rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('is-drag'); });
  addEventListener('pointerup', () => { down = false; rail.classList.remove('is-drag'); });
  rail.addEventListener('pointermove', e => { if (down) rail.scrollLeft = sl - (e.clientX - sx); });
})();
