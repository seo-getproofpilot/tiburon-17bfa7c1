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
     Five scroll segments: a hold on each keyframe (where the copy card shows) and a scrub between them.
     Frames load lowest-resolution-first in a coarse-to-fine order, so the dive is usable after a few
     dozen frames and sharpens as the rest arrive. At each hold the exact keyframe still is drawn on top,
     so every label is pixel-true while the card is up. */
  const dive = $('#dive'), canvas = $('#diveSeq'), ctx = canvas.getContext('2d');
  const copies = $$('.dc'), depthVal = $('#depthVal'), depthBar = $('#depthBar');
  const STAGES = ['intro', '0', '1', '2', 'end'];
  const DEPTH = [0, 0, 3, 18, 0];
  const HOLD = [.13, .14, .14, .14, .16], MOVE = [.07, .09, .07, .06];  // fractions of the dive's scroll
  let SEQ = null, frames = [], stills = [], cur = 0, want = 0, lastStage;
  const dir = () => (mobile ? 'm' : 'd');
  function segs() {
    const out = []; let u = 0;
    for (let k = 0; k < 5; k++) { out.push({ hold: k, a: u, b: u += HOLD[k] }); if (k < 4) out.push({ move: k, a: u, b: u += MOVE[k] }); }
    out.forEach(x => { x.a /= u; x.b /= u; }); return out;
  }
  const SEG = segs();
  function loadSeq() {
    fetch('assets/seq/seq.json').then(r => r.json()).then(j => {
      SEQ = j; frames = new Array(j.n);
      stills = ['k0', 'k1', 'k2', 'k3', 'k4'].map(n => { const i = new Image(); i.decoding = 'async'; i.src = `assets/seq/${n}-${dir()}.webp`; return i; });
      const order = []; const seen = new Set();
      for (let step = 32; step >= 1; step = Math.floor(step / 2)) for (let i = 0; i < j.n; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
      let next = 0, live = 0;
      const pump = () => { while (live < 6 && next < order.length) { const i = order[next++]; live++;
        const im = new Image(); im.decoding = 'async';
        im.onload = im.onerror = () => { live--; frames[i] = im.complete && im.naturalWidth ? im : null; pump(); };
        im.src = `assets/seq/${dir()}/${String(i).padStart(4, '0')}.webp`; } };
      pump();
    });
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); loadSeq(); } }, { rootMargin: '150% 0px' });
    io.observe(dive);
  } else loadSeq();
  function nearest(i) {
    for (let d = 0; d < 40; d++) { if (frames[i - d]) return frames[i - d]; if (frames[i + d]) return frames[i + d]; }
    return null;
  }
  function cover(img, alpha) {
    const cw = canvas.width, ch = canvas.height, ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    let w = cw, h = ch, y;
    if (mobile && cr < ir) { w = cw * 1.06; h = w / ir; y = Math.min((ch - h) / 2, 52 * (devicePixelRatio || 1)); } // phones: fit width, sit high
    else { if (cr > ir) h = cw / ir; else w = ch * ir; y = (ch - h) / 2; }
    ctx.globalAlpha = alpha; ctx.drawImage(img, (cw - w) / 2, y, w, h); ctx.globalAlpha = 1; return y + h;
  }
  function diveFrame(p) {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const seg = SEG.find(x => p <= x.b) || SEG[SEG.length - 1];
    const t = clamp((p - seg.a) / (seg.b - seg.a));
    let hold = -1, holdA = 0, d;
    if (SEQ) {
      const K = SEQ.keys;
      if ('hold' in seg) { want = K[seg.hold]; hold = seg.hold; holdA = 1; d = DEPTH[seg.hold]; }
      else { const k = seg.move, e = ease(t); want = K[k] + (K[k + 1] - K[k]) * e; d = lerp(DEPTH[k], DEPTH[k + 1], e);
        if (t < .12) { hold = k; holdA = 1 - t / .12; } else if (t > .88) { hold = k + 1; holdA = (t - .88) / .12; } }
      cur += (want - cur) * (reduce ? 1 : .22);
      const img = nearest(Math.round(cur));
      if (img) cover(img, 1);
      const st = stills[hold];
      if (st && st.complete && st.naturalWidth && holdA > 0 && Math.abs(cur - want) < 3) {
        const bottom = cover(st, holdA);
        if (bottom < canvas.height) { const g = ctx.createLinearGradient(0, bottom - 70, 0, bottom + 2); g.addColorStop(0, 'rgba(4,18,26,0)'); g.addColorStop(1, 'rgba(4,18,26,1)');
          ctx.globalAlpha = holdA; ctx.fillStyle = g; ctx.fillRect(0, bottom - 60, canvas.width, canvas.height); ctx.globalAlpha = 1; }
      }
    } else d = 0;
    const stage = 'hold' in seg && t > .04 ? STAGES[seg.hold] : null;
    if (stage !== lastStage) { copies.forEach(c => c.classList.toggle('is-on', c.dataset.s === stage)); lastStage = stage; }
    depthVal.textContent = (d || 0).toFixed(1);
    depthBar.style.setProperty('--d', ((d || 0) / 18).toFixed(3));
  }

  /* ---------------- worlds ---------------- */
  function plateY(rect, imgW, imgH, v, zoom) {
    const ra = rect.width / rect.height, ia = imgW / imgH;
    const scy = (ra > ia ? ia / ra : 1) / zoom;
    const top = clamp(.5, scy / 2, 1 - scy / 2) - scy / 2;
    return (v - top) / scy * rect.height;
  }
  const W = {};
  function setupWorld(id, src, imgW, imgH, band, glint, amp) {
    const sec = $('#' + id); if (!sec) return;
    const w = W[id] = { sec, z: 1.1, zT: 1.1, bottle: $('.world__bottle', sec), bg: $('.world__bg', sec), still: $('.plate__still', sec), imgW, imgH,
      bar: parseFloat($('.world__bottle', sec).dataset.bar), tilt: $('.wb__tilt', sec), parts: $$('.dk__copy,.dk__notes .note,.dk__notes .medal,.fn__copy,.fn__notes .note,.fn__notes .medal', sec) };
    w.parts.forEach((el, i) => { el.classList.add('reveal'); el.style.transitionDelay = (i % 4) * 90 + 'ms'; });
    w.gl = window.TiburonWater && TiburonWater.plate($('.plate', sec), src, { band, amp, glint, focus: () => [.5, .5], zoom: () => w.z, scale: mobile ? .7 : .85 });
  }
  setupWorld('dark8', 'assets/img/rum-beach.webp', 1376, 768, [.452, .47, .6, .64], .55, 1);
  setupWorld('fin', 'assets/img/fin-beach.webp', 1376, 768, [.43, .46, .78, .795], .18, 1.15);
  const finWord = $('.fn__word');
  const hero = $('.hero'), heroBottles = $('.hero__bottles'), heroStill = $('.hero .plate__still');
  const heroW = { z: 1.06 };
  const heroVid = $('#heroVid');
  if (heroVid) {
    heroVid.src = innerWidth < 900 ? heroVid.dataset.m : heroVid.dataset.d;
    const play = () => { const q = heroVid.play(); if (q && q.catch) q.catch(() => {}); };
    if (reduce) heroVid.removeAttribute('autoplay'); else { play(); document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); }); }
  }
  function heroPlateFrame() {
    const r = hero.getBoundingClientRect(); if (r.bottom < 0) return;
    const p = clamp(-r.top / r.height);
    heroW.z = 1.06 + p * .06;
    heroStill.style.setProperty('--z', heroW.z.toFixed(4));
    if (innerWidth > 1100) heroBottles.style.setProperty('--barY', plateY(r, 1376, 768, .86, heroW.z).toFixed(1) + 'px');
    else heroBottles.style.removeProperty('--barY');
  }

  function worldFrame(id, time) {
    const w = W[id]; if (!w) return;
    const r = w.sec.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const total = Math.max(1, r.height - vh), p = clamp(-r.top / total);
    const vis = mobile ? clamp(1 - r.top / vh) : p;
    w.zT = mobile ? 1 : lerp(1.12, 1.0, ease(p)); w.z += (w.zT - w.z) * .12;
    w.still.style.setProperty('--z', w.z.toFixed(4));
    const br = w.bg.getBoundingClientRect(), pr = w.sec.firstElementChild.getBoundingClientRect();
    const yb = br.top - pr.top + plateY(br, w.imgW, w.imgH, w.bar, w.z);
    w.bottle.style.top = yb.toFixed(1) + 'px';
    const ent = ease(clamp(mobile ? vis * 1.4 : p * 4));
    const ry = lerp(-16, 12, mobile ? vis : p) + (reduce ? 0 : Math.sin(time * .4) * 2.5);
    w.tilt.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    w.tilt.style.setProperty('--rise', ((1 - ent) * 60).toFixed(1) + 'px');
    w.tilt.style.setProperty('--bo', (.2 + ent * .8).toFixed(3));
    w.tilt.style.setProperty('--sx', (50 + ry * 3.5).toFixed(1) + '%');
    const on = mobile ? true : p > .05;
    w.parts.forEach((el, i) => el.classList.toggle('is-in', mobile ? el.getBoundingClientRect().top < vh * .92 : on && p > .05 + Math.floor(i / 4) * .12 * 0 + (i > 0 ? .1 : 0)));
    if (id === 'fin' && finWord) finWord.style.transform = `translateX(calc(-50% + ${((p - .5) * -6).toFixed(2)}vw))`;
  }

  /* White Tip: the shallows */
  const wt = $('#whitetip');
  const shallow = window.TiburonWater && TiburonWater.shallows($('#shallowGL'), mobile);
  const wtTilt = $('.wt__bottle .wb__tilt'), wtGhost = $('.wt__ghost'), wtParts = $$('.wt__head,.wt__note,.wt__foot');
  wtParts.forEach((el, i) => { el.classList.add('reveal'); el.style.transitionDelay = i * 80 + 'ms'; });
  function whiteFrame(time) {
    const r = wt.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    const ry = lerp(-14, 14, p) + ptrX * 6;
    wtTilt.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    wtTilt.style.setProperty('--sx', (50 + ry * 3.5).toFixed(1) + '%');
    wtGhost.style.transform = `translate(-50%,calc(-52% + ${((p - .5) * -60).toFixed(1)}px))`;
    wtParts.forEach((el, i) => el.classList.toggle('is-in', mobile ? el.getBoundingClientRect().top < vh * .92 : p > (i === 0 ? .02 : .08 + i * .05)));
  }

  /* ---------------- ocean: the blue hole opens ---------------- */
  const ocPin = $('.ocean__pin'), hole = $('.ocean__hole img');
  function oceanFrame() {
    const r = ocPin.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const p = clamp(-r.top / Math.max(1, r.height - vh) * 1.0 + .0);
    const e = ease(clamp(p * 1.2));
    hole.style.setProperty('--r', lerp(mobile ? 20 : 15, mobile ? 46 : 44, e).toFixed(2) + '%');
    hole.style.setProperty('--hz', lerp(1.3, 1, e).toFixed(4));
  }

  /* ---------------- generic reveals ---------------- */
  const revealEls = $$('.story__text>*, .story__facts div, .story__photo, .origin__text, .origin figure, .infuse__head>*, .infuse__foot>*, .ob__text, .ocean__boat figure, .rooms__head>*, .room, .awards__head>*, .foot__buy>*');
  revealEls.forEach((el, i) => { el.classList.add('reveal'); el.style.transitionDelay = (i % 3) * 90 + 'ms'; });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    revealEls.forEach(el => io.observe(el));
  } else revealEls.forEach(el => el.classList.add('is-in'));

  /* ---------------- frame loop ---------------- */
  let lastY = -1;
  function frame(now) {
    requestAnimationFrame(frame);
    const time = now / 1000;
    const sy = scrollY;
    const dr = dive.getBoundingClientRect();
    if (dr.bottom > 0 && dr.top < vh) diveFrame(clamp(-dr.top / Math.max(1, dr.height - vh)));
    heroPlateFrame(); worldFrame('dark8', time); worldFrame('fin', time); whiteFrame(time); oceanFrame();
    if (sy !== lastY) { nav.classList.toggle('is-solid', sy > vh * .6 || !drawer.hidden); lastY = sy; }
  }
  requestAnimationFrame(frame);
  addEventListener('resize', () => { vw = innerWidth; vh = innerHeight; mobile = mq.matches; }, { passive: true });

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
