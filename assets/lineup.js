/* v27: the bottle displays. Each stage plays once when it scrolls into view, then idles gently; rAF only runs while
   the stage is on screen. Reduced motion: drawn straight at the end state. */
(function () {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FORCE = parseFloat(new URLSearchParams(location.search).get('lu'));   // QC: draw every stage at this time (s)
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ramp = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

  function stage(el, init) {
    const cv = el.querySelector('canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, t0 = null, raf = 0, on = false, state = null;
    const api = init(el);
    function size() {
      const r = el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      state = api.layout ? api.layout(W, H, dpr) : null;
      if (!on) frame(performance.now());
    }
    function frame(now) {
      if (t0 === null && on) t0 = now;
      const t = !isNaN(FORCE) ? FORCE : RM ? 99 : t0 === null ? 0 : (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      api.draw(ctx, t, W, H, state, dpr);
      if (on && !RM) raf = requestAnimationFrame(frame);
    }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.3) {
          if (!on) { on = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
        } else if (on && !e.isIntersecting) { on = false; cancelAnimationFrame(raf); }
      });
    }, { threshold: [0, 0.3, 0.6] });
    const go = () => { size(); io.observe(el); };
    const imgs = [...el.querySelectorAll('img')];
    Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); })))).then(go);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 120); });
    if (imgs.length) imgs.forEach((i) => { if (!i.complete) i.loading = 'eager'; });
  }

  /* ---------- Dark 8: an old-fashioned glass, one sphere of ice, the rum poured in ---------- */
  function pour() {
    return {
      layout(W, H) {
        const gh = Math.min(H * 0.34, W * 0.36);
        return { cx: W * 0.7, base: H * 0.92, gh, tw: gh * 1.12, bw: gh * 0.96, thick: gh * 0.17, wall: Math.max(5, gh * 0.03) };
      },
      draw(c, t, W, H, s) {
        const { cx, base, gh, tw, bw, thick, wall } = s;
        const top = base - gh, floor = base - thick;
        const halfAt = (y) => { const u = (base - y) / gh; return (bw + (tw - bw) * u) / 2; };
        const inHalf = (y) => halfAt(y) - wall;
        // pour timeline
        const P0 = 0.6, P1 = 3.6, TAIL = 0.45;
        const fill = ease(ramp(t, P0 + 0.15, P1 + 0.3));
        const level = floor - fill * (floor - top) * 0.56;
        const pouring = t > P0 && t < P1 + TAIL;
        // shadow
        c.save(); c.fillStyle = 'rgba(0,0,0,.45)'; c.filter = 'blur(10px)';
        c.beginPath(); c.ellipse(cx + 8, base + 4, bw * 0.62, gh * 0.06, 0, 0, Math.PI * 2); c.fill(); c.restore();
        c.filter = 'none';
        // warm glow cast on the bar by the rum
        if (fill > 0) {
          const g = c.createRadialGradient(cx, base, 0, cx, base, bw);
          g.addColorStop(0, `rgba(224,151,74,${0.22 * fill})`); g.addColorStop(1, 'rgba(224,151,74,0)');
          c.fillStyle = g; c.beginPath(); c.ellipse(cx, base + 2, bw, gh * 0.09, 0, 0, Math.PI * 2); c.fill();
        }
        // back rim
        c.strokeStyle = 'rgba(255,240,220,.22)'; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(cx, top, tw / 2, tw * 0.07, 0, Math.PI, Math.PI * 2); c.stroke();
        // glass body tint
        c.save();
        c.beginPath(); c.moveTo(cx - tw / 2, top); c.lineTo(cx + tw / 2, top); c.lineTo(cx + bw / 2, base); c.lineTo(cx - bw / 2, base); c.closePath();
        const gb = c.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
        gb.addColorStop(0, 'rgba(255,245,230,.10)'); gb.addColorStop(0.18, 'rgba(255,245,230,.03)'); gb.addColorStop(0.82, 'rgba(255,245,230,.03)'); gb.addColorStop(1, 'rgba(255,245,230,.12)');
        c.fillStyle = gb; c.fill(); c.restore();
        // the rum
        const waveA = (pouring ? 2.2 : 2.2 * Math.exp(-(t - P1 - TAIL) * 1.6)) * fill;
        if (fill > 0.002) {
          c.save();
          c.beginPath();
          c.moveTo(cx - inHalf(floor), floor);
          c.lineTo(cx - inHalf(level), level);
          const n = 24, rx = inHalf(level), ry = rx * 0.11;
          for (let i = 0; i <= n; i++) { const a = Math.PI - (i / n) * Math.PI; c.lineTo(cx + Math.cos(a) * rx, level + Math.sin(a) * ry * 0.0 + Math.sin(i * 0.9 + t * 9) * waveA * 0.4); }
          c.lineTo(cx + inHalf(floor), floor);
          c.ellipse(cx, floor, inHalf(floor), inHalf(floor) * 0.11, 0, 0, Math.PI);
          c.closePath();
          const lg = c.createLinearGradient(0, level, 0, floor);
          lg.addColorStop(0, 'rgba(158,68,14,.9)'); lg.addColorStop(0.45, 'rgba(104,40,8,.94)'); lg.addColorStop(1, 'rgba(50,16,3,.97)');
          c.fillStyle = lg; c.fill();
          // side glow through the rum
          const sg = c.createLinearGradient(cx - rx, 0, cx + rx, 0);
          sg.addColorStop(0, 'rgba(255,170,70,.20)'); sg.addColorStop(0.25, 'rgba(255,170,70,0)'); sg.addColorStop(0.7, 'rgba(255,150,50,0)'); sg.addColorStop(1, 'rgba(255,190,100,.45)');
          c.fillStyle = sg; c.fill();
          c.restore();
          // surface
          c.save();
          c.beginPath(); c.ellipse(cx, level, inHalf(level), inHalf(level) * 0.11, 0, 0, Math.PI * 2);
          const su = c.createLinearGradient(0, level - 8, 0, level + 8);
          su.addColorStop(0, 'rgba(214,132,52,.85)'); su.addColorStop(1, 'rgba(130,56,14,.9)');
          c.fillStyle = su; c.fill();
          c.clip();
          c.strokeStyle = 'rgba(255,220,170,.35)'; c.lineWidth = 1;
          for (let k = 1; k <= 3; k++) {
            const rr = ((t * 0.9 + k / 3) % 1) * inHalf(level);
            c.globalAlpha = (1 - rr / inHalf(level)) * Math.min(1, waveA);
            c.beginPath(); c.ellipse(cx - inHalf(level) * 0.3, level, rr, rr * 0.11, 0, 0, Math.PI * 2); c.stroke();
          }
          c.restore();
        }
        // the ice sphere: resting on the floor, then floating once the rum lifts it
        const r = inHalf(floor) * 0.66;
        const rest = floor - r, float = level + r * 0.55;
        const lift = Math.min(rest, float);
        const bob = t > P1 ? Math.sin((t - P1) * 1.4) * 1.2 * Math.exp(-(t - P1) * 0.25) + Math.sin(t * 0.8) * 0.6 : 0;
        const sy = lift + (lift < rest ? bob : 0), sx = cx + inHalf(floor) * 0.06;
        c.save();
        // clear ice: a dark refractive band inside the rim, a cloudy core, bright edges
        const ig = c.createRadialGradient(sx, sy, r * 0.1, sx, sy, r);
        ig.addColorStop(0, 'rgba(240,246,250,.30)'); ig.addColorStop(0.45, 'rgba(225,236,244,.10)'); ig.addColorStop(0.78, 'rgba(40,30,25,.22)'); ig.addColorStop(0.93, 'rgba(255,255,255,.28)'); ig.addColorStop(1, 'rgba(255,255,255,.65)');
        c.fillStyle = ig; c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.fill();
        const core = c.createRadialGradient(sx + r * 0.05, sy + r * 0.05, 0, sx, sy, r * 0.42);
        core.addColorStop(0, 'rgba(255,255,255,.38)'); core.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = core; c.beginPath(); c.arc(sx, sy, r * 0.45, 0, Math.PI * 2); c.fill();
        // seen through the rum below the surface: lighter than the rum around it (the ice lenses the light)
        if (fill > 0.002) {
          c.save(); c.beginPath(); c.rect(sx - r - 2, level, r * 2 + 4, r * 2 + 4); c.clip();
          const sub = c.createRadialGradient(sx + r * 0.25, sy + r * 0.2, 0, sx, sy, r);
          sub.addColorStop(0, 'rgba(240,160,70,.45)'); sub.addColorStop(0.6, 'rgba(170,80,22,.45)'); sub.addColorStop(0.85, 'rgba(70,26,6,.45)'); sub.addColorStop(1, 'rgba(255,200,130,.6)');
          c.fillStyle = sub; c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.fill();
          c.restore();
        }
        c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.3; c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.ellipse(sx - r * 0.4, sy - r * 0.5, r * 0.2, r * 0.07, -0.6, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(sx + r * 0.5, sy - r * 0.25, r * 0.05, r * 0.12, 0.4, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,230,190,.45)'; c.lineWidth = 2.2; c.beginPath(); c.arc(sx, sy, r * 0.86, 0.15 * Math.PI, 0.62 * Math.PI); c.stroke();
        c.restore();
        // the pour
        if (pouring) {
          const sxp = cx - inHalf(level) * 0.38;
          const headY = t < P1 ? 0 : (level) * ease((t - P1) / TAIL);
          const wN = 6 * (t < P0 + 0.12 ? (t - P0) / 0.12 : 1);
          c.save();
          const sgd = c.createLinearGradient(0, 0, 0, level);
          sgd.addColorStop(0, 'rgba(214,128,50,.85)'); sgd.addColorStop(1, 'rgba(186,96,30,.95)');
          c.fillStyle = sgd;
          c.beginPath();
          const steps = 30;
          for (let i = 0; i <= steps; i++) { const y = headY + (level - headY) * (i / steps); const w = wN * (0.75 + 0.25 * (1 - i / steps)); c.lineTo(sxp - w / 2 + Math.sin(y * 0.06 + t * 18) * 0.9, y); }
          for (let i = steps; i >= 0; i--) { const y = headY + (level - headY) * (i / steps); const w = wN * (0.75 + 0.25 * (1 - i / steps)); c.lineTo(sxp + w / 2 + Math.sin(y * 0.06 + t * 18) * 0.9, y); }
          c.closePath(); c.fill();
          c.fillStyle = 'rgba(255,225,180,.55)'; c.fillRect(sxp - wN * 0.18, headY, wN * 0.16, level - headY);
          // bubbles where it lands
          for (let k = 0; k < 7; k++) {
            const ph = (t * 2.2 + k * 0.37) % 1;
            c.fillStyle = `rgba(255,220,170,${0.5 * (1 - ph)})`;
            c.beginPath(); c.arc(sxp + Math.sin(k * 2.1) * 14 * ph, level - 2 - ph * 8, 1.2 + k % 3, 0, Math.PI * 2); c.fill();
          }
          c.restore();
        }
        // glass walls, base and rim, in front
        c.save();
        c.lineCap = 'round';
        const wallG = c.createLinearGradient(0, top, 0, base);
        wallG.addColorStop(0, 'rgba(255,248,236,.55)'); wallG.addColorStop(1, 'rgba(255,248,236,.25)');
        c.strokeStyle = wallG; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(cx - tw / 2, top); c.lineTo(cx - bw / 2, base); c.moveTo(cx + tw / 2, top); c.lineTo(cx + bw / 2, base); c.stroke();
        c.strokeStyle = 'rgba(255,248,236,.16)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(cx - tw / 2 + wall, top + 2); c.lineTo(cx - bw / 2 + wall, floor); c.moveTo(cx + tw / 2 - wall, top + 2); c.lineTo(cx + bw / 2 - wall, floor); c.stroke();
        // thick base
        const bg = c.createLinearGradient(0, floor, 0, base);
        bg.addColorStop(0, 'rgba(255,240,220,.20)'); bg.addColorStop(0.5, 'rgba(255,240,220,.07)'); bg.addColorStop(1, 'rgba(255,240,220,.22)');
        c.fillStyle = bg; c.beginPath(); c.moveTo(cx - inHalf(floor) - wall, floor); c.lineTo(cx + inHalf(floor) + wall, floor); c.lineTo(cx + bw / 2, base); c.lineTo(cx - bw / 2, base); c.closePath(); c.fill();
        if (fill > 0) { c.fillStyle = `rgba(214,120,40,${0.28 * fill})`; c.fill(); }
        c.strokeStyle = 'rgba(255,248,236,.5)'; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(cx, base, bw / 2, bw * 0.06, 0, 0, Math.PI); c.stroke();
        c.strokeStyle = 'rgba(255,248,236,.28)';
        c.beginPath(); c.ellipse(cx, floor, inHalf(floor), inHalf(floor) * 0.11, 0, 0, Math.PI); c.stroke();
        // front rim
        c.strokeStyle = 'rgba(255,250,240,.7)'; c.lineWidth = 1.6;
        c.beginPath(); c.ellipse(cx, top, tw / 2, tw * 0.07, 0, 0, Math.PI); c.stroke();
        // highlight streaks
        const hs = c.createLinearGradient(0, top, 0, base);
        hs.addColorStop(0, 'rgba(255,255,255,0)'); hs.addColorStop(0.3, 'rgba(255,255,255,.32)'); hs.addColorStop(0.8, 'rgba(255,255,255,.1)'); hs.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = hs;
        c.beginPath(); c.moveTo(cx - tw / 2 + tw * 0.07, top + 6); c.lineTo(cx - tw / 2 + tw * 0.12, top + 6); c.lineTo(cx - bw / 2 + bw * 0.12, base - 8); c.lineTo(cx - bw / 2 + bw * 0.08, base - 8); c.closePath(); c.fill();
        // a slow glint across the glass
        const gp = ((t - 4.5) % 7) / 1.6;
        if (t > 4.5 && gp < 1) {
          c.beginPath(); c.moveTo(cx - tw / 2, top); c.lineTo(cx + tw / 2, top); c.lineTo(cx + bw / 2, base); c.lineTo(cx - bw / 2, base); c.closePath(); c.clip();
          const gx = cx - tw + gp * tw * 2;
          const gl = c.createLinearGradient(gx - 40, 0, gx + 40, 0);
          gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,.16)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = gl; c.fillRect(cx - tw, top, tw * 2, gh);
        }
        c.restore();
      },
    };
  }

  /* shared: a bottle drawn into the stage, plus an offscreen copy for masking */
  function bottleBox(img, W, H, hFrac, cxFrac, bottomFrac) {
    const h = H * hFrac, w = h * img.naturalWidth / img.naturalHeight;
    const x = W * cxFrac - w / 2, y = H * (1 - bottomFrac) - h;
    return { x, y, w, h };
  }
  function layer(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  /* ---------- Coffee & Cacao: beans fall, the clear White Tip steeps dark ---------- */
  function steep(el) {
    const img = el.querySelector('img');
    const steps = [...document.querySelectorAll('.lu__steep li')];
    const dayEl = el.querySelector('.lu__day b');
    let beans = [], pile = null, seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    function bean(c, x, y, rot, s, cacao) {
      c.save(); c.translate(x, y); c.rotate(rot);
      const rx = (cacao ? 13 : 8.5) * s, ry = (cacao ? 7.5 : 6) * s;
      const g = c.createRadialGradient(-rx * 0.3, -ry * 0.4, 1, 0, 0, rx);
      if (cacao) { g.addColorStop(0, '#9a6447'); g.addColorStop(0.6, '#5e3624'); g.addColorStop(1, '#2e1910'); }
      else { g.addColorStop(0, '#8a5130'); g.addColorStop(0.6, '#4e2814'); g.addColorStop(1, '#241108'); }
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
      if (cacao) {
        c.strokeStyle = 'rgba(30,14,8,.45)'; c.lineWidth = 0.8 * s;
        c.beginPath(); c.moveTo(-rx * 0.8, -ry * 0.2); c.quadraticCurveTo(0, -ry * 0.45, rx * 0.8, -ry * 0.15); c.moveTo(-rx * 0.75, ry * 0.3); c.quadraticCurveTo(0, ry * 0.1, rx * 0.75, ry * 0.35); c.stroke();
      } else {
        c.strokeStyle = 'rgba(20,8,3,.85)'; c.lineWidth = 1.3 * s;
        c.beginPath(); c.moveTo(-rx * 0.82, 0); c.bezierCurveTo(-rx * 0.3, -ry * 0.45, rx * 0.3, ry * 0.45, rx * 0.82, 0); c.stroke();
        c.fillStyle = 'rgba(255,220,180,.18)'; c.beginPath(); c.ellipse(-rx * 0.25, -ry * 0.45, rx * 0.35, ry * 0.18, -0.2, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
    return {
      layout(W, H, dpr) {
        const b = bottleBox(img, W, H, 0.82, 0.42, 0.1);
        const base = layer(b.w * dpr, b.h * dpr), bc = base.getContext('2d');
        bc.drawImage(img, 0, 0, base.width, base.height);
        // the fully steeped bottle: multiply the liquid (shoulder down) by roasted mahogany, keep the bottle's alpha
        const tint = layer(base.width, base.height), tc = tint.getContext('2d');
        tc.drawImage(base, 0, 0);
        tc.globalCompositeOperation = 'multiply';
        const fillTop = base.height * 0.255;
        const tg = tc.createLinearGradient(0, fillTop, 0, base.height);
        tg.addColorStop(0, '#7a3a17'); tg.addColorStop(0.25, '#5e2a10'); tg.addColorStop(1, '#3e1a09');
        tc.fillStyle = tg; tc.fillRect(0, fillTop, tint.width, tint.height - fillTop);
        tc.globalCompositeOperation = 'destination-in'; tc.drawImage(base, 0, 0);
        // pile floor and bean plan
        seed = 7; beans = [];
        const floorY = b.y + b.h * 0.985, span = [W * 0.08, W * 0.92];
        const nB = clamp(W / 700, 0.45, 1);
        for (let i = 0; i < Math.round(26 * nB); i++) beans.push({ cacao: true, t0: 0.2 + i * 0.085 / nB + rnd() * 0.05, x: span[0] + rnd() * (span[1] - span[0]), rot: rnd() * 6.28, vr: (rnd() - 0.5) * 6, s: 0.9 + rnd() * 0.35 });
        for (let i = 0; i < Math.round(70 * nB); i++) beans.push({ cacao: false, t0: 2.6 + i * 0.03 / nB + rnd() * 0.05, x: span[0] + rnd() * (span[1] - span[0]), rot: rnd() * 6.28, vr: (rnd() - 0.5) * 9, s: 0.85 + rnd() * 0.35 });
        pile = { c: layer(W * dpr, H * dpr), heights: new Float32Array(Math.ceil(W / 8) + 2), done: new Uint8Array(beans.length), floorY };
        return { b, base, tint, W, H, dpr };
      },
      draw(c, t, W, H, s, dpr) {
        const { b, base, tint } = s;
        const k = ease(ramp(t, 0.8, 7.8));
        c.drawImage(base, b.x, b.y, b.w, b.h);
        c.globalAlpha = k; c.drawImage(tint, b.x, b.y, b.w, b.h); c.globalAlpha = 1;
        // warm light through the steeped rum onto the table
        if (k > 0) {
          const R = Math.min(b.w * 1.4, W / 2 - 4, b.x + b.w / 2 - 4, (H - pile.floorY - 2) / 0.38);
          c.save(); c.translate(b.x + b.w / 2, pile.floorY); c.scale(1, 0.38);
          const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
          g.addColorStop(0, `rgba(190,96,40,${0.24 * k})`); g.addColorStop(1, 'rgba(190,96,40,0)');
          c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill(); c.restore();
        }
        // beans: falling ones are live, landed ones are baked into the pile layer
        const pc = pile.c.getContext('2d'); pc.setTransform(dpr, 0, 0, dpr, 0, 0);
        const g = 2400;
        beans.forEach((bn, i) => {
          const dt = t - bn.t0;
          if (dt <= 0 || pile.done[i]) return;
          const bin = clamp(Math.round(bn.x / 8), 0, pile.heights.length - 1);
          const land = pile.floorY - pile.heights[bin] - 4 * bn.s;
          const y = -30 + 0.5 * g * dt * dt;
          if (y >= land) {
            bean(pc, bn.x, land, bn.rot + bn.vr * Math.sqrt((land + 30) * 2 / g), bn.s * 1.05, bn.cacao);
            pile.done[i] = 1;
            for (let d = -2; d <= 2; d++) { const j = bin + d; if (j >= 0 && j < pile.heights.length) pile.heights[j] += (bn.cacao ? 4.2 : 3) * bn.s * (1 - Math.abs(d) * 0.3); }
          } else bean(c, bn.x, y, bn.rot + bn.vr * dt, bn.s * 1.05, bn.cacao);
        });
        c.drawImage(pile.c, 0, 0, W, H);
        // day counter and steps
        const day = k < 0.02 ? 1 : k < 0.25 ? 2 : k < 0.5 ? 3 : k < 0.8 ? 4 : 5;
        if (dayEl && dayEl.textContent !== String(day)) dayEl.textContent = String(day);
        const step = day <= 3 ? 0 : day === 4 ? 1 : 2;
        steps.forEach((li, i) => li.classList.toggle('is-on', i <= step));
      },
    };
  }

  /* ---------- FIN: the bottle fills with tequila ---------- */
  function fillAnim(el) {
    const img = el.querySelector('img');
    return {
      layout(W, H, dpr) {
        const b = bottleBox(img, W, H, 0.84, 0.5, 0.07);
        const base = layer(b.w * dpr, b.h * dpr), bc = base.getContext('2d');
        bc.drawImage(img, 0, 0, base.width, base.height);
        // interior span per row (inset from the glass edge)
        const d = bc.getImageData(0, 0, base.width, base.height).data, rows = [];
        for (let y = 0; y < base.height; y++) {
          let l = -1, r = -1;
          for (let x = 0; x < base.width; x++) if (d[(y * base.width + x) * 4 + 3] > 200) { if (l < 0) l = x; r = x; }
          const ins = (r - l) * 0.07;
          rows.push(l < 0 ? null : [(l + ins) / dpr, (r - ins) / dpr]);
        }
        const fx = layer(base.width, base.height);
        return { b, base, rows, fx, dpr };
      },
      draw(c, t, W, H, s) {
        const { b, base, rows, fx, dpr } = s;
        c.drawImage(base, b.x, b.y, b.w, b.h);
        const F0 = 0.5, F1 = 4.2;
        const u = ease(ramp(t, F0, F1));
        const yBot = b.h * 0.955, yTop = b.h * 0.135;
        const lvl = yBot - (yBot - yTop) * u;            // in bottle-local px
        const f = fx.getContext('2d');
        f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, fx.width, fx.height); f.setTransform(dpr, 0, 0, dpr, 0, 0);
        // the empty part above the line reads darker and hollow
        f.fillStyle = 'rgba(2,8,20,.42)';
        f.beginPath();
        for (let y = Math.floor(b.h * 0.04); y < lvl; y += 2) { const r = rows[Math.round(y * dpr)]; if (r) f.rect(r[0], y, r[1] - r[0], 2); }
        f.fill();
        // the tequila below: a cool sheen and slow light
        if (u > 0) {
          f.save(); f.beginPath();
          for (let y = Math.floor(lvl); y < yBot; y += 2) { const r = rows[Math.round(y * dpr)]; if (r) f.rect(r[0], y, r[1] - r[0], 2); }
          f.clip();
          const lg = f.createLinearGradient(0, lvl, 0, yBot);
          lg.addColorStop(0, 'rgba(170,215,250,.22)'); lg.addColorStop(1, 'rgba(120,180,240,.06)');
          f.fillStyle = lg; f.fillRect(0, lvl, b.w, yBot - lvl);
          for (let k = 0; k < 3; k++) {
            const sx = ((t * 0.12 + k * 0.33) % 1) * b.w * 1.4 - b.w * 0.2;
            const sg = f.createLinearGradient(sx - 30, 0, sx + 30, 0);
            sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(200,235,255,.10)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
            f.fillStyle = sg; f.fillRect(sx - 30, lvl, 60, yBot - lvl);
          }
          // bubbles while it fills and just after
          const bA = clamp(1 - (t - F1) / 1.8, 0, 1);
          for (let k = 0; k < 26; k++) {
            const ph = (t * (0.5 + (k % 5) * 0.12) + k * 0.137) % 1;
            const y = yBot - ph * (yBot - lvl);
            const r = rows[Math.round(y * dpr)]; if (!r) continue;
            const x = r[0] + (r[1] - r[0]) * (0.15 + ((k * 0.618) % 1) * 0.7) + Math.sin(t * 3 + k) * 2;
            f.fillStyle = `rgba(220,240,255,${0.55 * bA * (1 - ph * 0.6)})`;
            f.beginPath(); f.arc(x, y, 0.8 + (k % 3) * 0.6, 0, Math.PI * 2); f.fill();
          }
          f.restore();
          // the meniscus
          const r = rows[Math.round(lvl * dpr)];
          if (r && u < 0.999) {
            const mg = f.createLinearGradient(0, lvl - 3, 0, lvl + 4);
            mg.addColorStop(0, 'rgba(230,245,255,0)'); mg.addColorStop(0.45, 'rgba(230,245,255,.85)'); mg.addColorStop(1, 'rgba(230,245,255,0)');
            f.fillStyle = mg; f.beginPath();
            f.moveTo(r[0], lvl - 3); f.quadraticCurveTo((r[0] + r[1]) / 2, lvl + 2, r[1], lvl - 3); f.lineTo(r[1], lvl + 4); f.quadraticCurveTo((r[0] + r[1]) / 2, lvl + 7, r[0], lvl + 4); f.closePath(); f.fill();
          } else if (r) {
            f.fillStyle = 'rgba(230,245,255,.45)'; f.fillRect(r[0], lvl - 0.5, r[1] - r[0], 1.2);
          }
        }
        // keep everything inside the glass
        f.setTransform(1, 0, 0, 1, 0, 0);
        f.globalCompositeOperation = 'destination-in'; f.drawImage(base, 0, 0); f.globalCompositeOperation = 'source-over';
        c.drawImage(fx, b.x, b.y, b.w, b.h);
      },
    };
  }

  const MAP = { pour, steep, fill: fillAnim };
  document.querySelectorAll('.lu__stage[data-anim]').forEach((el) => { const f = MAP[el.dataset.anim]; if (f) stage(el, f); });
})();
