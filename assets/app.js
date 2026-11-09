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

  /* ---------------- the dive: scroll-scrubbed footage ----------------
     The scroll position is eased (so wheel steps glide instead of jumping), and the two frames either side
     of the wanted position are cross-blended, so 12fps footage plays back as continuous motion. Frames are
     decoded off the main thread (img.decode) before use, and at each hold the exact keyframe still is
     drawn on top so every label is pixel-true while its card is up. */
  const dive = $('#dive'), canvas = $('#diveSeq'), ctx = canvas.getContext('2d', { alpha: false });
  const copies = $$('.dc'), depthVal = $('#depthVal'), depthBar = $('#depthBar');
  const STAGES = ['intro', '0', '1', '2', 'end'];
  const DEPTH = [0, 0, 3, 18, 0];
  const HOLD = [.11, .16, .16, .16, .14], MOVE = [.07, .08, .07, .05];
  let SEQ = null, frames = [], stills = [], cur = 0, pS = 0, lastStage, lastDraw = '';
  const dir = () => (mobile ? 'm' : 'd');
  const SEG = (() => { const out = []; let u = 0;
    for (let k = 0; k < 5; k++) { out.push({ hold: k, a: u, b: u += HOLD[k] }); if (k < 4) out.push({ move: k, a: u, b: u += MOVE[k] }); }
    out.forEach(x => { x.a /= u; x.b /= u; }); return out; })();
  function loadSeq() {
    fetch('assets/seq/seq.json').then(r => r.json()).then(j => {
      SEQ = j; frames = new Array(j.n);
      stills = ['k0', 'k1', 'k2', 'k3', 'k4'].map(n => { const i = new Image(); i.src = `assets/seq/${n}-${dir()}.webp`; i.decode && i.decode().catch(() => {}); return i; });
      const order = [], seen = new Set();
      for (let step = 32; step >= 1; step = Math.floor(step / 2)) for (let i = 0; i < j.n; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
      let next = 0, live = 0;
      const pump = () => { while (live < 6 && next < order.length) { const i = order[next++]; live++;
        const im = new Image(); im.src = `assets/seq/${dir()}/${String(i).padStart(4, '0')}.webp`;
        (im.decode ? im.decode() : new Promise((ok, no) => { im.onload = ok; im.onerror = no; }))
          .then(() => { frames[i] = im; }, () => {}).finally(() => { live--; pump(); }); } };
      pump();
    });
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); loadSeq(); } }, { rootMargin: '150% 0px' });
    io.observe(dive);
  } else loadSeq();
  const near = (i, dirn) => { for (let d = 0; d < 48; d++) { const k = i + d * dirn; if (frames[k]) return frames[k]; } return null; };
  function cover(img, alpha) {
    const cw = canvas.width, ch = canvas.height, ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    let w = cw, h = ch, y;
    if (mobile && cr < ir) { w = cw * 1.06; h = w / ir; y = Math.min((ch - h) / 2, 52 * Math.min(devicePixelRatio || 1, 1.5)); }
    else { if (cr > ir) h = cw / ir; else w = ch * ir; y = (ch - h) / 2; }
    ctx.globalAlpha = alpha; ctx.drawImage(img, (cw - w) / 2, y, w, h); ctx.globalAlpha = 1; return y + h;
  }
  function diveFrame(p) {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; lastDraw = ''; }
    pS += (p - pS) * (reduce ? 1 : .14);
    if (Math.abs(p - pS) < .00005) pS = p;
    const q = pS;
    const seg = SEG.find(x => q <= x.b) || SEG[SEG.length - 1];
    const t = clamp((q - seg.a) / (seg.b - seg.a));
    let hold = -1, holdA = 0, d = 0;
    if (SEQ) {
      const K = SEQ.keys; let want;
      if ('hold' in seg) { want = K[seg.hold]; hold = seg.hold; holdA = 1; d = DEPTH[seg.hold]; }
      else { const k = seg.move, e = ease(t); want = K[k] + (K[k + 1] - K[k]) * e; d = lerp(DEPTH[k], DEPTH[k + 1], e);
        if (t < .1) { hold = k; holdA = 1 - t / .1; } else if (t > .9) { hold = k + 1; holdA = (t - .9) / .1; } }
      cur = want;
      const f0 = Math.floor(cur), fr = cur - f0;
      const key = `${cur.toFixed(3)}|${holdA.toFixed(3)}|${W}`;
      if (key !== lastDraw) {
        const A = near(f0, -1), B = near(f0 + 1, 1);
        if (A) cover(A, 1);
        if (B && fr > .02 && B !== A) cover(B, fr);
        const st = stills[hold];
        if (st && st.complete && st.naturalWidth && holdA > 0) {
          const bottom = cover(st, holdA);
          if (bottom < canvas.height) { const g = ctx.createLinearGradient(0, bottom - 70, 0, bottom + 2); g.addColorStop(0, 'rgba(4,18,26,0)'); g.addColorStop(1, 'rgba(4,18,26,1)');
            ctx.globalAlpha = holdA; ctx.fillStyle = g; ctx.fillRect(0, bottom - 70, canvas.width, canvas.height); ctx.globalAlpha = 1; }
        }
        if (A) lastDraw = key;
      }
    }
    const stage = 'hold' in seg && t > .04 ? STAGES[seg.hold] : null;
    if (stage !== lastStage) { copies.forEach(c => c.classList.toggle('is-on', c.dataset.s === stage)); lastStage = stage; }
    depthVal.textContent = d.toFixed(1);
    depthBar.style.setProperty('--d', (d / 18).toFixed(3));
  }

  /* ---------------- hero: sandbar loop, labels pinned on top ---------------- */
  const hero = $('.hero'), heroBg = $('.hero__bg'), heroVid = $('#heroVid');
  if (heroVid && innerWidth >= 900 && !reduce) {
    heroVid.src = heroVid.dataset.src;
    const play = () => { const q = heroVid.play(); if (q && q.catch) q.catch(() => {}); };
    play(); document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); });
  }
  function heroFrame() {
    if (mobile) return;
    const r = hero.getBoundingClientRect(); if (r.bottom < 0) return;
    heroBg.style.setProperty('--z', (1 + clamp(-r.top / r.height) * .05).toFixed(4));
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
    if (dr.bottom > 0 && dr.top < vh) diveFrame(clamp(-dr.top / Math.max(1, dr.height - vh)));
    if (sy !== lastY) { heroFrame(); oceanFrame(); nav.classList.toggle('is-solid', sy > vh * .6 || !drawer.hidden); lastY = sy; }
  }
  requestAnimationFrame(frame);
  addEventListener('resize', () => { vw = innerWidth; vh = innerHeight; mobile = mq.matches; lastDraw = ''; }, { passive: true });

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
