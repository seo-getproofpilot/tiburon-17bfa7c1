/* v109 tasting booking (the ticket form on Home, Tasting Rooms, Our Story).
   Room -> date -> time (only times inside that room's hours) -> guests -> name, email -> "Book my tasting".
   Times come from the hours below; live seats left come from WordPress (/wp-json/tiburon/v1/slots), which
   also re-checks every booking and puts it on the room's calendar link (wordpress/tiburon-theme/inc/tastings.php holds the same hours and is the
   one that counts). Guests pay at the room. Where there is no WordPress (the static preview) booking falls
   back to the old request email. */
(function () {
  var book = document.getElementById('bookForm');
  if (!book) return;
  /* hours from Henry Garcia (Tiburón VP of Sales, 2026-11-19). weekday 0 = Sunday. [open, close] or null */
  var WK = { 0: ['10:00', '17:00'], 1: ['09:00', '20:00'], 2: ['09:00', '20:00'], 3: ['09:00', '20:00'], 4: ['09:00', '20:00'], 5: ['09:00', '20:00'], 6: ['09:00', '20:00'] };
  var TEN = { 0: ['10:00', '17:00'], 1: ['10:00', '20:00'], 2: ['10:00', '20:00'], 3: ['10:00', '20:00'], 4: ['10:00', '20:00'], 5: ['10:00', '20:00'], 6: ['10:00', '20:00'] };
  var CC = Object.assign({}, TEN, { 1: null });
  var ROOMS = { 'San Pedro': WK, 'Placencia Village': WK, 'Caye Caulker': CC, 'San Ignacio': TEN };
  var SLOT = 30, LAST = 60, CAP = 12, LEAD = 120, MAXDAYS = 120, PRICE = 30;
  var API = '/wp-json/tiburon/v1/';
  var $ = function (s) { return book.querySelector(s); };
  var d = $('[name=date]'), g = $('[name=guests]'), box = document.getElementById('tkSlots'), go = $('.ticket__go'), nt = $('.ticket__note');
  var DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

  /* Belize is UTC-6 all year (no daylight saving) */
  var bz = function () { var n = new Date(Date.now() - 6 * 3600e3); return { ymd: n.toISOString().slice(0, 10), min: n.getUTCHours() * 60 + n.getUTCMinutes() }; };
  var toMin = function (hm) { var p = hm.split(':'); return +p[0] * 60 + +p[1]; };
  var hm = function (m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); };
  var nice = function (t) { var m = toMin(t), h = Math.floor(m / 60), mm = m % 60; return ((h + 11) % 12 + 1) + (mm ? ':' + ('0' + mm).slice(-2) : '') + (h < 12 ? 'am' : 'pm'); };
  var wday = function (ymd) { return new Date(ymd + 'T12:00:00Z').getUTCDay(); };
  var longDate = function (ymd) { return new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }); };
  var shortDate = function (ymd) { return new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }); };
  var guests = function () { return Math.max(1, Math.min(CAP, parseInt(g.value, 10) || 1)); };
  var room = function () { var r = $('[name=room]:checked'); return r ? r.value : ''; };
  var time = function () { var t = $('[name=time]:checked'); return t ? t.value : ''; };

  var today = bz().ymd;
  d.min = today;
  d.max = new Date(Date.parse(today + 'T12:00:00Z') + MAXDAYS * 864e5).toISOString().slice(0, 10);

  /* the times a room offers on a day, from its hours; null when closed */
  function local(r, ymd) {
    var h = ROOMS[r] && ROOMS[r][wday(ymd)];
    if (!h) return null;
    var out = [], now = bz(), cut = ymd === now.ymd ? now.min + LEAD : -1;
    for (var m = toMin(h[0]); m <= toMin(h[1]) - LAST; m += SLOT) out.push({ time: hm(m), left: CAP, ok: m >= cut });
    return out;
  }
  var live = true, seq = 0, slots = [];
  function draw(list, r, ymd) {
    slots = list || [];
    var keep = time();
    if (!list) { box.innerHTML = '<p class="ticket__hint is-warn">' + r + ' is closed on ' + DAYS[wday(ymd)] + '. Please pick another day.</p>'; return; }
    var n = guests(), any = false;
    box.innerHTML = list.map(function (s) {
      var ok = s.ok && s.left >= n; any = any || ok;
      var why = !s.ok && s.left > 0 ? 'Too soon to book' : s.left < n ? (s.left ? 'Only ' + s.left + ' seats left' : 'Full') : '';
      return '<label class="tslot' + (ok ? '' : ' is-off') + '"' + (why ? ' title="' + why + '"' : '') + '><input type="radio" name="time" value="' + s.time + '"' + (ok ? '' : ' disabled') + (ok && keep === s.time ? ' checked' : '') + '><span>' + nice(s.time) + (why && s.left < n && s.left > 0 ? '<i>' + s.left + ' left</i>' : '') + '</span></label>';
    }).join('') || '';
    if (!any) box.insertAdjacentHTML('beforeend', '<p class="ticket__hint is-warn">No times left that day for ' + n + (n === 1 ? ' guest' : ' guests') + '. Please try another day.</p>');
  }
  function load() {
    var r = room(), ymd = d.value;
    if (!r || !ymd) { box.innerHTML = '<p class="ticket__hint">Pick a room and a date to see open times.</p>'; slots = []; stub(); return; }
    if (ymd < today || ymd > d.max) { box.innerHTML = '<p class="ticket__hint is-warn">Please pick a date from today up to ' + MAXDAYS + ' days ahead.</p>'; slots = []; stub(); return; }
    draw(local(r, ymd), r, ymd); stub();
    if (!live || !local(r, ymd)) return;
    var my = ++seq;
    fetch(API + 'slots?room=' + encodeURIComponent(r) + '&date=' + ymd + '&_=' + Date.now(), { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw 0; return res.json(); })
      .then(function (j) { if (my !== seq || !j || !j.ok) return; draw(j.open ? j.slots : null, r, ymd); stub(); })
      .catch(function () { live = false; });
  }
  function stub() {
    var n = guests(), r = room(), t = time();
    document.getElementById('tkN').textContent = n;
    document.getElementById('tkTotal').textContent = '$' + n * PRICE;
    document.getElementById('tkRoom').textContent = r || 'Pick a room';
    document.getElementById('tkWhen').textContent = d.value && t ? shortDate(d.value) + ', ' + nice(t) : '';
    var ready = r && d.value && t;
    go.disabled = !ready;
    if (!nt.dataset.sent) nt.textContent = ready ? 'Ready to book: ' + r + ', ' + longDate(d.value) + ' at ' + nice(t) + '. You pay at the room.' : 'Pick a room, a date and a time to book. You pay at the tasting room.';
  }

  var regs = function () { if (room() && d.value) draw(local(room(), d.value) ? slots : null, room(), d.value); stub(); };
  book.querySelectorAll('.ticket__step button').forEach(function (b) { b.addEventListener('click', function () { g.value = Math.max(1, Math.min(CAP, guests() + +b.dataset.d)); regs(); }); });
  book.addEventListener('change', function (e) {
    delete nt.dataset.sent; nt.classList.remove('is-warn', 'is-ok');
    if (e.target.name === 'room' || e.target.name === 'date') load();
    else if (e.target.name === 'guests') { g.value = guests(); regs(); }
    else stub();
  });
  g.addEventListener('input', regs);
  /* "Book at San Pedro" style links elsewhere on the page pick the room */
  document.querySelectorAll('[data-room]').forEach(function (a) { a.addEventListener('click', function () { var r = book.querySelector('[name=room][value="' + a.dataset.room + '"]'); if (r) { r.checked = true; load(); } }); });
  stub();

  book.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!book.checkValidity() || !time()) { book.reportValidity(); if (!time()) { nt.textContent = 'Please pick a time.'; nt.classList.add('is-warn'); } return; }
    var f = new FormData(book), r = f.get('room'), ymd = f.get('date'), t = f.get('time');
    var data = { room: r, date: ymd, time: t, guests: guests(), name: f.get('name'), email: f.get('email'), phone: f.get('phone') || '', website: f.get('website') || '' };
    nt.dataset.sent = '1'; nt.classList.remove('is-warn', 'is-ok'); nt.textContent = 'Booking your tasting…'; go.disabled = true;
    var when = longDate(ymd) + ' at ' + nice(t);
    var fallback = function () {
      var subj = 'Tasting booking, ' + r + ', ' + when;
      var fields = { Room: r, Date: longDate(ymd), Time: nice(t) + ' (Belize time)', Guests: data.guests, Name: data.name, Email: data.email, Phone: data.phone };
      return (window.tbSend ? tbSend('Tasting booking', subj, fields) : Promise.resolve(false)).then(function (ok) {
        go.disabled = false;
        if (ok) { done(); return; }
        var body = 'Hi Tiburon team,\n\nI\'d like to book a rum tasting.\n\n' + Object.keys(fields).map(function (k) { return k + ': ' + fields[k]; }).join('\n') + '\n\nThank you!';
        if (window.tbMailto) tbMailto(subj, body);
        nt.innerHTML = 'Your email app should open with the booking ready to send. If nothing opened, email <a href="mailto:basil@sharkbaitco.com">basil@sharkbaitco.com</a>.';
      });
    };
    var done = function () {
      book.classList.add('is-booked');
      nt.classList.add('is-ok');
      nt.innerHTML = '<b>You&rsquo;re booked in:</b> ' + r + ', ' + when + ', ' + data.guests + (data.guests === 1 ? ' guest' : ' guests') + '. The ' + r + ' team will confirm by ' + (data.phone ? 'WhatsApp, text or email' : 'email') + ' shortly. You pay at the room.';
      go.textContent = 'Booked';
    };
    fetch(API + 'book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (res) {
        if (res.status === 404 || res.status === 405) throw 'nowp';
        return res.json().then(function (j) { return { s: res.status, j: j }; });
      })
      .then(function (x) {
        if (x.j && x.j.ok) { done(); return; }
        go.disabled = false; nt.classList.add('is-warn');
        nt.textContent = (x.j && x.j.message) || 'Something went wrong. Please try again.';
        if (x.s === 409) load();
      })
      .catch(function () { fallback(); });
  });
})();
