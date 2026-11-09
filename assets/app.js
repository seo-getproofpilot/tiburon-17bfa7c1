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

  /* ---------------- the dive: a self-playing film on a seamless loop ----------------
     hero (loop) > wave > Dark 8 (pelicans) > under the sandbar > White Tip (reef shark) > the Blue Hole >
     FIN (whale shark) > back up to the sandbar, which is the hero frame, so it loops without a seam.
     Every stop holds while its living moment plays and its card shows. Everything plays natively, so it
     looks the same every time. It pauses off screen; the chapter buttons jump to a bottle. */
  const dive = $('.dive'), vid = $('#diveVid'), still = $('#diveStill'), stageEl = $('.dive__stage');
  const copies = $$('.dc'), depthVal = $('#depthVal'), depthBar = $('#depthBar');
  const heroVid = $('#heroVid'), heroLabels = $('.dive__hero .hero__labels');
  const navBtns = $$('.film-nav [data-k]'), pauseBtn = $('.film-pause');
  const STAGES = ['hero', '0', '1', '2'], DEPTH = [0, 0, 3, 18, 0];
  let TIMES = [0, 5.95, 13.9, 21.85, 29.8];
  const STILL = ['k4', 'k1', 'k2', 'k3'];
  const HOLD = [6.5, 7.2, 6.2, 8.2];              // seconds at each stop (moments are ~6-8s)
  const MOMENT = { 1: 'pel', 2: 'shark', 3: 'whale' };
  const RATE = 1.1;                               // the moves play slightly faster than real time
  const dev = () => (mobile ? 'm' : 'd');
  vid.src = mobile ? vid.dataset.m : vid.dataset.d; vid.preload = 'auto'; vid.load();
  if (heroVid) { heroVid.src = mobile ? 'assets/video/hero-m.mp4' : heroVid.dataset.src; heroVid.loop = true; }
  if (heroLabels) heroLabels.src = mobile ? 'assets/img/lab-k4-m.webp' : 'assets/img/hero-labels.webp';
  fetch('assets/video/dive.json').then(r => r.json()).then(j => { TIMES = j.stops; }).catch(() => {});
  const moment = $('#diveMoment'), label = $('#diveLabel');
  // warm the moment clips in the background
  setTimeout(() => ['pel', 'shark', 'whale'].forEach(n => { const l = document.createElement('link'); l.rel = 'preload'; l.as = 'video'; l.href = `assets/video/m-${n}${mobile ? '-m' : ''}.mp4`; document.head.appendChild(l); }), 2500);

  // state: phase 'hold' at stop k, or 'move' from k to k+1
  let phase = 'hold', k = 0, held = 0, running = true, visible = true, userPaused = false, lastNow = 0, firstHero = true;
  function showCard(i) { const st = i == null ? null : STAGES[i]; copies.forEach(c => c.classList.toggle('is-on', c.dataset.s === st)); }
  function setStill(i) {
    if (i == null) { still.classList.remove('is-on'); return; }
    const url = `assets/seq/${STILL[i]}-${dev()}.webp`; if (!still.src.endsWith(url)) still.src = url; still.classList.add('is-on');
  }
  function startMoment(i) {
    const name = MOMENT[i]; if (!name || reduce) return;
    label.src = `assets/img/lab-k${i}-${dev()}.webp`;
    const want = `assets/video/m-${name}${mobile ? '-m' : ''}.mp4`;
    if (!moment.src.endsWith(want)) { moment.src = want; moment.load(); }
    const go = () => { if (phase !== 'hold' || k !== i) return; moment.currentTime = 0; label.classList.add('is-on'); moment.classList.add('is-on'); if (running) moment.play().catch(() => {}); };
    if (moment.readyState >= 3) setTimeout(go, 250); else moment.addEventListener('canplaythrough', go, { once: true });
  }
  function stopMoment() { moment.classList.remove('is-on'); label.classList.remove('is-on'); setTimeout(() => { if (!moment.classList.contains('is-on')) moment.pause(); }, 400); }
  function enterHold(i) {
    phase = 'hold'; k = i; held = 0;
    vid.pause();
    setStill(i); showCard(i);
    stageEl.classList.toggle('at-hero', i === 0);
    if (i === 0) { if (heroVid && !reduce) { heroVid.currentTime = 0; if (running) heroVid.play().catch(() => {}); } }
    else startMoment(i);
    navBtns.forEach(b => b.classList.toggle('is-on', +b.dataset.k === i));
  }
  function enterMove(i) {
    if (i === 0) firstHero = false;
    phase = 'move'; k = i;
    showCard(null); setStill(null); stopMoment();
    stageEl.classList.remove('at-hero');
    if (heroVid) setTimeout(() => heroVid.pause(), 900);
    if (Math.abs(vid.currentTime - TIMES[i]) > .05) vid.currentTime = TIMES[i];
    vid.playbackRate = RATE;
    if (running) vid.play().catch(() => {});
  }
  function jumpTo(i) {
    stopMoment(); showCard(null);
    vid.classList.add('is-fading');
    setTimeout(() => { vid.currentTime = TIMES[i]; vid.addEventListener('seeked', () => { vid.classList.remove('is-fading'); enterHold(i); }, { once: true }); }, 180);
  }
  function setRunning(on) {
    running = on;
    if (!on) { vid.pause(); moment.pause(); heroVid && heroVid.pause(); }
    else if (phase === 'move') vid.play().catch(() => {});
    else if (k === 0) heroVid && !reduce && heroVid.play().catch(() => {});
    else if (moment.classList.contains('is-on')) moment.play().catch(() => {});
  }
  const sync = () => setRunning(visible && !userPaused && !document.hidden);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].intersectionRatio > .35; sync(); }, { threshold: [0, .35, .6] }).observe(stageEl);
  document.addEventListener('visibilitychange', sync);
  navBtns.forEach(b => b.addEventListener('click', () => { userPaused = false; pauseBtn.setAttribute('aria-pressed', 'false'); stageEl.classList.remove('is-paused'); sync(); jumpTo(+b.dataset.k); }));
  pauseBtn.addEventListener('click', () => {
    userPaused = !userPaused; pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.setAttribute('aria-label', userPaused ? 'Play the film' : 'Pause the film'); stageEl.classList.toggle('is-paused', userPaused); sync();
  });
  if (reduce) { userPaused = true; stageEl.classList.add('is-paused'); pauseBtn.setAttribute('aria-pressed', 'true'); }
  enterHold(0);

  function chapterFrame(now) {
    const dt = Math.min(.1, (now - (lastNow || now)) / 1000); lastNow = now;
    if (running && vid.readyState >= 2) {
      if (phase === 'hold') {
        if (!(k === 0 && root.classList.contains('intro-pending'))) held += dt;   // the hero waits for the logo intro
        const dur = k === 0 && firstHero ? 8.5 : (HOLD[k] || 6);
        if (held >= dur) {
          if (k < 3) enterMove(k);
          else enterMove(3);                       // FIN > rise to the sandbar
        }
      } else if (vid.currentTime >= TIMES[k + 1] - .02) {
        if (k + 1 >= 4) { vid.pause(); vid.currentTime = 0; enterHold(0); }   // the sandbar again = the hero
        else enterHold(k + 1);
      }
    }
    // chapter progress, hero fade and depth from the film clock
    const t = vid.currentTime || 0;
    navBtns.forEach(b => {
      const i = +b.dataset.k; let f = 0;
      if (phase === 'hold' && k === i) f = Math.min(1, held / HOLD[i]);
      else if (phase === 'move' && k === i - 1) f = 0;
      b.style.setProperty('--f', f.toFixed(3));
    });
    const hA = phase === 'hold' && k === 0 ? 1 : clamp(1 - (t - TIMES[0]) / 1.2);
    if (stageEl._hA !== hA.toFixed(2)) { stageEl._hA = hA.toFixed(2); stageEl.style.setProperty('--heroA', stageEl._hA); }
    let d = 0;
    for (let i = 0; i < 4; i++) if (t >= TIMES[i] && t <= TIMES[i + 1]) { const e = ease(clamp((t - TIMES[i]) / (TIMES[i + 1] - TIMES[i]))); d = lerp(DEPTH[i], DEPTH[i + 1], e); }
    if (phase === 'hold') d = DEPTH[k];
    depthVal.textContent = d.toFixed(1);
    depthBar.style.setProperty('--d', (d / 18).toFixed(3));
  }


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
