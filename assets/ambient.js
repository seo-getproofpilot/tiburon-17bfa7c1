/* Section sound: a quiet bed of sound for the part of the page you are looking at.
   Muted until the visitor taps the button. Nothing ever plays on its own, and nothing is remembered between visits.
   Mark a section with data-amb="name" and the page with <body data-amb-src="path/amb-">; each name loads amb-<name>.m4a.
   data-amb-vol on a section sets its level (0..1). Sound fades as sections change, and stops when the tab is hidden. */
(function () {
  var secs = [].slice.call(document.querySelectorAll('[data-amb]'));
  var base = document.body.getAttribute('data-amb-src');
  if (!secs.length || !base) return;
  var names = [], tracks = {}, on = false, ctx = null, cur = null, timer = null, lastIdx = -1;
  secs.forEach(function (s) { var n = s.getAttribute('data-amb'); if (names.indexOf(n) < 0) names.push(n); });

  var b = document.createElement('button');
  b.type = 'button'; b.className = 'dive__sound amb__btn'; b.setAttribute('aria-pressed', 'false');
  b.innerHTML = '<svg class="ds__off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>' +
    '<svg class="ds__on" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 010 7M18.6 6a8.6 8.6 0 010 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>' +
    '<span class="ds__lbl"></span>';
  var label = document.body.getAttribute('data-amb-label') || 'Tap for sound';
  document.body.appendChild(b);

  function paint() {
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', on ? 'Turn off the background sound' : 'Turn on the background sound');
    b.querySelector('.ds__lbl').textContent = on ? 'Sound on' : label;
    b.classList.toggle('is-on', on);
  }
  paint();

  function track(n) {
    if (tracks[n]) return tracks[n];
    var a = new Audio(); a.loop = true; a.preload = 'auto'; a.src = base + n + '.m4a'; a.crossOrigin = 'anonymous';
    var t = { a: a, g: null, v: 0, sync: null, rate: 1 };
    /* data-amb-sync="<video selector>" on the section: this sound is a soundtrack for that film, locked to its clock.
       data-amb-rate is the speed the film plays at, so film time / rate = soundtrack time. */
    var owner = secs.filter(function (s) { return s.getAttribute('data-amb') === n && s.getAttribute('data-amb-sync'); })[0];
    if (owner) { t.sync = document.querySelector(owner.getAttribute('data-amb-sync')); t.rate = parseFloat(owner.getAttribute('data-amb-rate') || '1'); }
    if (ctx) { try { var src = ctx.createMediaElementSource(a); t.g = ctx.createGain(); t.g.gain.value = 0; src.connect(t.g).connect(ctx.destination); } catch (e) { t.g = null; } }
    if (!t.g) a.volume = 0;
    return (tracks[n] = t);
  }
  function setVol(t, v) { t.v = v; if (t.g) t.g.gain.value = v; else try { t.a.volume = v; } catch (e) {} }

  /* which section owns the middle of the screen */
  function pick() {
    var mid = innerHeight / 2, best = null;
    secs.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid) best = s; });
    return best;
  }
  function tick() {
    var s = on && !document.hidden ? pick() : null, want = s ? s.getAttribute('data-amb') : null;
    var level = s ? parseFloat(s.getAttribute('data-amb-vol') || '.5') : 0, done = true;
    if (want) { var t = track(want); if (t.a.paused) { var p = t.a.play(); if (p && p.catch) p.catch(function () {}); } }
    Object.keys(tracks).forEach(function (n) {
      var t = tracks[n], goal = n === want ? level : 0;
      if (t.sync) {
        if (t.sync.paused || !t.sync.currentSrc) goal = 0;
        else if (!t.a.paused && t.a.duration) { var tt = (t.sync.currentTime / t.rate) % t.a.duration, off = t.a.currentTime - tt;
          if (off > t.a.duration / 2) off -= t.a.duration; if (off < -t.a.duration / 2) off += t.a.duration;
          if (Math.abs(off) > .12) try { t.a.currentTime = tt; } catch (e) {} }
      }
      var v = t.v + (goal - t.v) * (on ? .12 : .3);
      if (Math.abs(goal - v) < .004) v = goal; else done = false;
      setVol(t, v);
      if (v === 0 && !t.a.paused) t.a.pause();
    });
    /* going under: a one-shot (data-amb-enter) when you scroll down into a section from the one above it */
    var idx = s ? secs.indexOf(s) : -1;
    if (on && s && idx > lastIdx && lastIdx >= 0 && want !== cur && s.getAttribute('data-amb-enter')) {
      var fx = new Audio(base + s.getAttribute('data-amb-enter') + '.m4a'); fx.volume = Math.min(1, level * 1.3); var q = fx.play(); if (q && q.catch) q.catch(function () {});
    }
    if (idx >= 0) lastIdx = idx;
    cur = want;
    if (done && !on) { clearInterval(timer); timer = null; }
  }
  function run() { if (!timer) timer = setInterval(tick, 60); }

  b.addEventListener('click', function () {
    on = !on; paint();
    if (on && !ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) try { ctx = new AC(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (on) { var s = pick() || secs[0]; var t = track(s.getAttribute('data-amb')); var p = t.a.play(); if (p && p.catch) p.catch(function () {}); }
    run();
  });
  /* past the last sound section (or above the first): no sound, and the button steps away */
  function where() {
    var any = secs.some(function (s) { var r = s.getBoundingClientRect(); return r.bottom > innerHeight * .25 && r.top < innerHeight * .75; });
    b.classList.toggle('is-away', !any);
  }
  addEventListener('scroll', function () { where(); if (on) run(); }, { passive: true }); where();
  /* leaving the page never carries sound with it */
  addEventListener('pagehide', function () { Object.keys(tracks).forEach(function (n) { tracks[n].a.pause(); setVol(tracks[n], 0); }); });
  addEventListener('pageshow', function (e) { if (e.persisted && on) run(); });
  document.addEventListener('visibilitychange', function () { run(); });
})();
