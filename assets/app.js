/* Tiburon Rum homepage */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const root = document.documentElement;
  const mq = window.matchMedia('(max-width:900px),(orientation:portrait) and (max-width:1180px)');
  let mobile = mq.matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let vw = innerWidth, vh = innerHeight;

  /* ---------------- intro ---------------- */
  (function intro() {
    const el = $('#intro');
    if (!el || root.classList.contains('no-intro')) return;
    const short = root.classList.contains('intro-short');
    const t0 = performance.now(), minT = short ? 950 : 2500, maxT = short ? 1700 : 3800;
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

  /* ---------------- the dive: one pre-rendered film on a native loop ----------------
     The whole journey (hero, wave, Dark 8 + pelicans, under the sandbar, White Tip + reef shark, the Blue
     Hole, FIN + whale shark, back up to the hero) is a single 60fps file with the labels baked in, so there is
     nothing to hand off between and nothing can freeze. The page only reads its clock: which card is up, the
     chapter progress, the depth gauge. It pauses when off screen. */
  const dive = $('.dive'), vid = $('#diveVid'), stageEl = $('.dive__stage');
  const copies = $$('.dc'), depthVal = $('#depthVal'), depthBar = $('#depthBar');
  const navBtns = $$('.film-nav [data-k]'), pauseBtn = $('.film-pause');
  let SEGS = { hero: 0, wave: 2.68, dark: 6.65, sink: 12.73, white: 21.80, reef: 21.80, fin: 33.93, rise: 40.80 }, DUR = 51.10;
  vid.loop = true; vid.muted = true; vid.playsInline = true;
  vid.src = mobile ? 'assets/video/film-m.mp4?v=1794368365' : 'assets/video/film.mp4?v=1794368365';
  vid.poster = mobile ? 'assets/seq/k4-m.webp' : 'assets/img/hero-sandbar.webp';
  fetch('assets/video/film.json?v=1794368365').then(r => r.json()).then(j => { j.segments.forEach(x => { SEGS[x.name] = x.start; }); SEGS.white = j.white_at || SEGS.reef; DUR = j.duration; }).catch(() => {});
  // card windows on the film clock: [stage, from, to]
  const windows = () => [
    ['hero', -1, SEGS.wave + .5], ['hero', DUR - 1.9, DUR + 1],
    ['0', SEGS.wave + 3.6, SEGS.sink + .5],
    ['1', SEGS.white - 2.6, SEGS.white + 2.8],
    ['2', SEGS.fin - .9, SEGS.rise + .9],
  ];
  const chapterAt = { 1: () => SEGS.dark - .2, 2: () => SEGS.white - 2.4, 3: () => SEGS.fin - .3 };
  const depthAt = t => {
    if (t < SEGS.sink) return 0;
    if (t < SEGS.white - 1.5) return 3 * ease(clamp((t - SEGS.sink) / (SEGS.white - 1.5 - SEGS.sink)));
    if (t < SEGS.white + 1.5) return 3;
    if (t < SEGS.fin) return 3 + 15 * ease(clamp((t - SEGS.white - 1.5) / (SEGS.fin - SEGS.white - 1.5)));
    if (t < SEGS.rise) return 18;
    return 18 * (1 - ease(clamp((t - SEGS.rise) / (DUR - SEGS.rise))));
  };
  let visible = true, userPaused = !!reduce, shown;
  const sync = () => { const go = visible && !userPaused && !document.hidden && !root.classList.contains('intro-pending'); if (go) vid.play().catch(() => {}); else vid.pause(); };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].intersectionRatio > .35; sync(); }, { threshold: [0, .35, .6] }).observe(stageEl);
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
  navBtns.forEach(b => b.addEventListener('click', () => {
    userPaused = false; stageEl.classList.remove('is-paused'); pauseBtn.setAttribute('aria-pressed', 'false');
    vid.classList.add('is-fading');
    setTimeout(() => { vid.currentTime = chapterAt[b.dataset.k](); vid.addEventListener('seeked', () => { vid.classList.remove('is-fading'); sync(); }, { once: true }); }, 160);
  }));
  pauseBtn.addEventListener('click', () => {
    userPaused = !userPaused; pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.setAttribute('aria-label', userPaused ? 'Play the film' : 'Pause the film'); stageEl.classList.toggle('is-paused', userPaused); sync();
  });
  if (userPaused) { stageEl.classList.add('is-paused'); pauseBtn.setAttribute('aria-pressed', 'true'); }
  vid.addEventListener('loadeddata', sync, { once: true });

  function chapterFrame() {
    const t = vid.currentTime || 0;
    let st = null, f = 0;
    for (const [name, a0, a1] of windows()) if (t >= a0 && t <= a1) { st = name; f = clamp((t - a0) / (a1 - a0)); }
    if (st !== shown) { shown = st; copies.forEach(c => c.classList.toggle('is-on', c.dataset.s === st)); stageEl.classList.toggle('at-hero', st === 'hero'); }
    navBtns.forEach(b => { const on = STAGE_OF[b.dataset.k] === st; b.classList.toggle('is-on', on); b.style.setProperty('--f', on ? f.toFixed(3) : '0'); });
    const hA = st === 'hero' ? 1 : 0;
    if (stageEl._hA !== hA) { stageEl._hA = hA; stageEl.style.setProperty('--heroA', hA); }
    const d = depthAt(t);
    depthVal.textContent = d.toFixed(1);
    depthBar.style.setProperty('--d', (d / 18).toFixed(3));
  }
  const STAGE_OF = { 1: '0', 2: '1', 3: '2' };

  /* ---------------- pick your pour: reveal once ---------------- */
  const pours = $$('.pour');
  if ('IntersectionObserver' in window) {
    const po = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); po.unobserve(e.target); } }), { threshold: .22 });
    pours.forEach(el => po.observe(el));
  } else pours.forEach(el => el.classList.add('is-in'));

  /* ---------------- ocean: the blue hole opens ---------------- */
  const ocPin = $('.ocean__pin'), hole = $('.ocean__hole img');
  function oceanFrame() {
    if (!ocPin || !hole) return;           // v32: the blue-hole pin was replaced by the reef film (sections.js)
    const r = ocPin.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const e = ease(clamp(-r.top / Math.max(1, r.height - vh) * 1.2));
    hole.style.setProperty('--r', lerp(mobile ? 20 : 15, mobile ? 46 : 44, e).toFixed(2) + '%');
    hole.style.setProperty('--hz', lerp(1.3, 1, e).toFixed(4));
  }

  /* ---------------- brand marks: story draw-in, footer bookend, the fin across the waterline ---------------- */
  (function brand() {
    const story = $('.story'), foot = $('.foot__mark'), pass = $('.finpass'), fin = $('.finpass__fin');
    if ('IntersectionObserver' in window) {
      const bo = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add(e.target === story ? 'is-drawn' : 'is-in'); bo.unobserve(e.target); } }), { threshold: .3 });
      story && bo.observe(story); foot && bo.observe(foot);
    } else { story && story.classList.add('is-drawn'); foot && foot.classList.add('is-in'); }
    if (!pass || !fin || reduce) return;
    let raf = 0;
    const move = () => {
      raf = 0;
      const r = pass.getBoundingClientRect(), vh = innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));     // 0 as it enters at the bottom, 1 as it leaves the top
      const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      fin.style.setProperty('--fx', (-12 + e * 124).toFixed(2));
      fin.style.setProperty('--fy', (Math.sin(p * Math.PI * 3) * 2).toFixed(2));
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(move); }, { passive: true });
    move();
  })();

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
    chapterFrame(performance.now());
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
    { n: 'Red Apple Cinnamon', img: 'inf-apple', i: ['1/2 bottle Tiburon White Tip', '1 red apple, sliced with the skin on', '2 cinnamon sticks'] },
    { n: 'Guava Pear', img: 'inf-pear', i: ['1/2 bottle Tiburon White Tip', '1 guava', '1 pear', '1/2 cup pink pear juice'] },
    { n: 'Berry Basil', img: 'inf-cucumber', i: ['1/2 bottle Tiburon White Tip', '5 to 10 fresh blueberries', '5 fresh basil leaves', '1/2 cup pineapple juice'] },
    { n: 'Spicy Cucumber Basil', img: 'inf-cucumber', i: ['1/2 bottle Tiburon White Tip', '1 small cucumber, sliced with the skin on', '5 basil leaves, or to taste', '1 jalapeño, seeds removed', 'Fresh lime juice'] },
    { n: 'Limoncello', img: 'inf-pineapple', i: ['3/4 bottle Tiburon White Tip', '5 lemons', '2 cups water', '1 cup white sugar'] }
  ];
  if ($('#infList')) {   // v33: the infusions section was folded into How it's made; kept in case it returns
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
  }

  /* ---------------- awards rail: drag to scroll (v32: replaced by the medal wall; kept if a rail returns) ---------------- */
  const rail = $('#rail');
  if (rail) {
    let down = false, sx = 0, sl = 0;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('is-drag'); });
    addEventListener('pointerup', () => { down = false; rail.classList.remove('is-drag'); });
    rail.addEventListener('pointermove', e => { if (down) rail.scrollLeft = sl - (e.clientX - sx); });
  }
})();
