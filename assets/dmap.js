/* v99 distributor map, app layout: a sidebar of every place (search, Show me, Region), a dark street map with the
   shark-mark pins and a name chip under each, and a detail card for the place you pick.
   MapLibre GL + OpenFreeMap vector tiles (no key). Data: assets/locations.js */
(function () {
  var box = document.getElementById('dmap'), list = document.getElementById('dmapList');
  if (!box || !window.maplibregl || !window.TB_LOCATIONS) return;
  var D = window.TB_LOCATIONS, root = box.getAttribute('data-root') || '';
  var q = document.getElementById('dmxQ'), fk = document.getElementById('dmxKind'), fr = document.getElementById('dmxRegion'), cnt = document.getElementById('dmxCount');
  var MARK = (document.querySelector('.dmx__logo svg, .fz__mk') || {}).innerHTML || '';
  var wide = matchMedia('(min-width:901px)');
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var dir = function (p) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.q || (p.name + ', ' + p.addr)); };
  var kc = function (k) { return k === 'Distributor' ? 'd' : (k === 'Retail' || k === 'Bar & restaurant') ? 'r' : 't'; };
  var disc = function (p, cls) { return '<span class="' + cls + ' ' + cls + '--' + kc(p.kind) + '" aria-hidden="true"><svg viewBox="53.5 6 422.8 499.8">' + MARK + '</svg></span>'; };
  var sub = function (p) { return '<span class="dmx__sub">' + (me ? '<b class="dmx__mi">' + miTxt(p) + '</b>' : '') + '<i>' + esc(p.city) + '</i><em class="dmx__tag--' + kc(p.kind) + '">' + esc(p.kind === 'Tasting room' ? p.short : p.kind + ', ' + p.region) + '</em></span>'; };
  /* v107 near me (Find Tiburón page): "Use my location" sorts the list by distance, shows miles, and frames the closest places */
  var nearBtn = document.getElementById('dmxNear'), nearMsg = document.getElementById('dmxNearMsg'), ask = box.getAttribute('data-ask') || '#inquire', me = null;
  var miles = function (p) { if (!me) return 0; var r = Math.PI / 180, a = Math.sin((p.lat - me.lat) * r / 2), b = Math.sin((p.lng - me.lng) * r / 2);
    var h = a * a + Math.cos(me.lat * r) * Math.cos(p.lat * r) * b * b; return 7917.5 * Math.asin(Math.min(1, Math.sqrt(h))); };
  var byNear = function (idx) { return me ? idx.slice().sort(function (x, y) { return miles(D[x]) - miles(D[y]); }) : idx; };
  var miTxt = function (p) { var m = miles(p); return m < 10 ? m.toFixed(1) + ' mi' : Math.round(m).toLocaleString('en-US') + ' mi'; };
  function nearSay(html) { if (!nearMsg) return; nearMsg.innerHTML = html; nearMsg.hidden = !html; }
  /* find the visitor, then hand back the indexes of every place, closest first */
  function locate(done) {
    if (!navigator.geolocation) { nearSay('Your browser can&rsquo;t share a location. Search your city instead.'); return; }
    nearBtn.disabled = true; nearBtn.setAttribute('aria-busy', 'true'); nearSay('Finding you&hellip;');
    navigator.geolocation.getCurrentPosition(function (pos) {
      nearBtn.disabled = false; nearBtn.removeAttribute('aria-busy'); nearBtn.classList.add('is-on');
      me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      q.value = ''; fk.value = ''; fr.value = '';
      /* distributors sell to shops, not to the public, so the closest-place pick skips them (they stay in the list) */
      var order = byNear(D.map(function (_, i) { return i; })).filter(function (i) { return D[i].kind !== 'Distributor'; }), p = D[order[0]], far = miles(p) > 150;
      nearSay(far ? 'Nothing within 150 miles of you yet. Most states can <a href="' + root + 'where-to-buy/">order online</a>.'
        : 'Closest to you: <b>' + esc(p.name) + '</b>, ' + miTxt(p) + ' away.');
      done(order, far);
    }, function (err) {
      nearBtn.disabled = false; nearBtn.removeAttribute('aria-busy');
      nearSay(err && err.code === 1 ? 'Location is off for this site. Search your city instead.' : 'We couldn&rsquo;t find your location. Search your city instead.');
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  }
  var ico = { clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0113 0c0 5.2-6.5 11-6.5 11z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    tel: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    go: '<svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' };
  function cardHTML(p) {
    var chips = [p.hours ? ['clock', p.hours] : ['pin', p.region], p.tel ? ['tel', '<a href="tel:' + p.tel + '">' + esc(p.phone) + '</a>'] : null].filter(Boolean)
      .map(function (c) { return '<span class="dmx__chip">' + ico[c[0]] + (c[0] === 'tel' ? c[1] : esc(c[1])) + '</span>'; }).join('');
    var second = p.page ? '<a class="dmx__btn dmx__btn--fill" href="' + root + p.page + '">Book a tasting</a>' : p.web ? '<a class="dmx__btn dmx__btn--fill" href="' + p.web + '" target="_blank" rel="noopener">Website</a>' : '';
    return '<div class="dmx__card">' +
      '<div class="dmx__cardtop">' + disc(p, 'dmx__disc') + '<div><b class="dmx__name">' + esc(p.name) + '</b>' + sub(p) + '</div></div>' +
      '<div class="dmx__chips">' + chips + '</div>' +
      '<h4 class="dmx__line">' + esc(p.line) + '</h4>' +
      '<p class="dmx__about">' + esc(p.about) + '</p><p class="dmx__addr">' + esc(p.addr) + '</p>' +
      '<div class="dmx__btns"><a class="dmx__btn" href="' + dir(p) + '" target="_blank" rel="noopener">Directions</a>' + second + '</div></div>';
  }
  /* region filter options from the data */
  D.map(function (p) { return p.region; }).filter(function (r, i, a) { return a.indexOf(r) === i; }).forEach(function (r) { var o = document.createElement('option'); o.value = o.textContent = r; fr.appendChild(o); });

  /* v104: no WebGL (hardware acceleration off, some in-app browsers) means no map; the list and cards still work */
  function nomap() {
    var dmx = box.closest('.dmx'); dmx.classList.add('dmx--nomap'); box.closest('.dmx__map').hidden = true;
    var sheet = document.createElement('div'); sheet.className = 'dmx__sheet'; sheet.hidden = true; sheet.setAttribute('aria-live', 'polite');
    dmx.insertBefore(sheet, dmx.querySelector('.dmx__side'));
    var cur = -1;
    function render() {
      var term = (q.value || '').trim().toLowerCase(), k = fk.value, r = fr.value;
      var shown = D.map(function (p, i) { return i; }).filter(function (i) { var p = D[i];
        return (!k || p.kind === k) && (!r || p.region === r) && (!term || (p.name + ' ' + p.city + ' ' + p.addr + ' ' + p.region).toLowerCase().indexOf(term) >= 0); });
      shown = byNear(shown);
      cnt.textContent = shown.length + (shown.length === 1 ? ' place' : ' places');
      list.innerHTML = shown.length ? shown.map(function (i) { var p = D[i];
        return '<li class="dmx__row' + (i === cur ? ' is-on' : '') + '" data-i="' + i + '" tabindex="0">' + disc(p, 'dmx__disc') +
          '<div class="dmx__txt"><b class="dmx__name">' + esc(p.name) + '</b>' + sub(p) + '</div>' +
          '<a class="dmx__go" href="' + dir(p) + '" target="_blank" rel="noopener" aria-label="Directions to ' + esc(p.name) + '">' + ico.go + '</a></li>'; }).join('')
        : '<li class="dmx__none">Nothing matches yet. Try another city, or <a href="' + ask + '">ask us</a>.</li>';
    }
    function pick(i) {
      cur = i; [].forEach.call(list.children, function (x) { x.classList.toggle('is-on', +x.getAttribute('data-i') === i); });
      sheet.innerHTML = cardHTML(D[i]) + '<button type="button" class="dmx__x" aria-label="Close">&times;</button>'; sheet.hidden = false;
      var t = sheet.getBoundingClientRect().top; if (t < 70 || t > innerHeight * .7) scrollTo({ top: scrollY + t - 90, behavior: 'smooth' });
    }
    sheet.addEventListener('click', function (e) { if (e.target.closest('.dmx__x')) { sheet.hidden = true; cur = -1; render(); } });
    [q, fk, fr].forEach(function (c) { c.addEventListener(c === q ? 'input' : 'change', function () { sheet.hidden = true; render(); }); });
    list.addEventListener('click', function (e) { if (e.target.closest('a')) return; var li = e.target.closest('.dmx__row'); if (li) pick(+li.getAttribute('data-i')); });
    list.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.dmx__row')) { e.preventDefault(); pick(+e.target.getAttribute('data-i')); } });
    [].forEach.call(document.querySelectorAll('[data-near]'), function (b) { b.addEventListener('click', function () { nearBtn && nearBtn.click(); }); });
    if (nearBtn) nearBtn.addEventListener('click', function () { locate(function () { sheet.hidden = true; render(); list.scrollTop = 0; }); });
    render();
  }
  var gl = (function () { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  if (!gl) return nomap();

  var all = new maplibregl.LngLatBounds(); D.forEach(function (p) { all.extend([p.lng, p.lat]); });
  var pad = function () { return wide.matches ? { top: 90, bottom: 110, left: 110, right: 110 } : { top: 84, bottom: 80, left: 80, right: 80 }; };
  var map;
  try { map = new maplibregl.Map({ container: box, style: 'https://tiles.openfreemap.org/styles/dark', bounds: all, fitBoundsOptions: { padding: pad() },
    attributionControl: { compact: true }, cooperativeGestures: wide.matches, dragRotate: false, pitchWithRotate: false, touchPitch: false, minZoom: 1.6 }); }
  catch (e) { return nomap(); }
  /* v100: page scroll still scrolls the page; pinch (trackpad or two fingers) and Cmd/Ctrl + scroll zoom the map */
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation && map.keyboard.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  map.on('styleimagemissing', function (e) { if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) }); });
  /* graphite street map, tinted toward the abyss teal; roads and labels quiet so the pins lead */
  map.on('style.load', function () {
    var set = function (id, prop, v) { if (map.getLayer(id)) try { map.setPaintProperty(id, prop, v); } catch (e) {} };
    map.getStyle().layers.forEach(function (l) {
      var id = l.id;
      if (l.type === 'background') set(id, 'background-color', '#1a2124');
      else if (id === 'water') set(id, 'fill-color', '#0e1518');
      else if (id === 'waterway') set(id, 'line-color', '#0e1518');
      else if (/landcover|landuse|park/.test(id) && l.type === 'fill') set(id, 'fill-color', 'rgba(255,255,255,.02)');
      else if (id === 'building') set(id, 'fill-color', '#222b2f');
      else if (/highway|road|railway|aeroway/.test(id) && l.type === 'line') {
        set(id, 'line-color', /motorway/.test(id) ? '#46545a' : /major/.test(id) ? '#3a474c' : '#2c373b');
        map.setLayerZoomRange(id, /motorway/.test(id) ? 4 : /major/.test(id) ? 6 : 9, 24);
      }
      else if (id === 'boundary_state') { set(id, 'line-color', 'rgba(200,214,214,.18)'); set(id, 'line-dasharray', [2, 2]); }
      else if (/boundary_country/.test(id)) set(id, 'line-color', 'rgba(200,214,214,.35)');
      else if (l.type === 'symbol') {
        if (/road_oneway/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); return; }
        if (/place_(other|suburb|village)/.test(id)) map.setLayerZoomRange(id, 10, 24);
        if (/place_town/.test(id)) map.setLayerZoomRange(id, 7, 24);
        set(id, 'text-color', /highway/.test(id) ? '#5d6b70' : id === 'water_name' ? '#4f6a70' : /country/.test(id) ? '#a9b8b8' : '#8a9a9c');
        set(id, 'text-halo-color', '#14191b'); set(id, 'text-halo-width', 1.2);
      }
    });
  });
  /* pins: the shark disc and a name chip under it */
  var popup = new maplibregl.Popup({ offset: [0, -34], closeButton: true, focusAfterOpen: false, maxWidth: wide.matches ? '340px' : Math.min(320, innerWidth - 60) + 'px', className: 'dpop dpop--x' });
  var marks = D.map(function (p, i) {
    var el = document.createElement('button');
    el.type = 'button'; el.className = 'dpin3 dpin3--' + kc(p.kind);
    el.innerHTML = '<span class="dpin2__ring"></span>' + disc(p, 'dpin3__disc') + '<span class="dpin3__chip">' + esc(p.name) + '</span>';
    var m = new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, -24] }).setLngLat([p.lng, p.lat]).addTo(map);
    el.setAttribute('aria-label', p.name + ', ' + p.kind);
    el.addEventListener('click', function (e) { e.stopPropagation(); pick(i, true); });
    return m;
  });
  /* zoomed out, a region whose pins would pile up shows one numbered pin; click it to open that region */
  var groups = {}; D.forEach(function (p, i) { (groups[p.region] = groups[p.region] || []).push(i); });
  var clusters = Object.keys(groups).filter(function (r) { return groups[r].length > 1; }).map(function (r) {
    var b = new maplibregl.LngLatBounds(); groups[r].forEach(function (i) { b.extend([D[i].lng, D[i].lat]); });
    var p0 = D[groups[r][0]], el = document.createElement('button'); el.type = 'button'; el.className = 'dpin3 dpin3--' + kc(p0.kind) + ' dpin3--group';
    el.innerHTML = '<span class="dpin2__ring"></span><span class="dpin3__disc"><b>' + groups[r].length + '</b></span><span class="dpin3__chip">' + esc(r) + '</span>';
    el.setAttribute('aria-label', r + ', ' + groups[r].length + ' places');
    el.addEventListener('click', function (e) { e.stopPropagation(); fr.value = r; render(); popup.remove(); frame(); });
    return { r: r, b: b, m: new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, -24] }).setLngLat(b.getCenter()).addTo(map) };
  });
  function grouping() {
    clusters.forEach(function (c) {
      var a = map.project(c.b.getSouthWest()), z = map.project(c.b.getNorthEast()), tight = Math.hypot(a.x - z.x, a.y - z.y) < 140;
      c.m.getElement().style.display = tight ? '' : 'none';
      groups[c.r].forEach(function (i) { marks[i].getElement().style.display = tight ? 'none' : ''; });
    });
  }
  /* pins closer than their own size slide apart along the line between them, so every name stays readable and tappable */
  function declutter() {
    var vis = marks.filter(function (m) { return m.getElement().style.display !== 'none'; });
    /* v104: with many pins in view (the Georgia stores), keep every pin on its real address and hide the name chips;
       the spreading below is for a handful of neighbours and would push a crowd far from where they are */
    var dense = vis.filter(function (m) { var q = map.project(m.getLngLat()); return q.x > -40 && q.y > -40 && q.x < box.clientWidth + 40 && q.y < box.clientHeight + 40; }).length > 14;
    box.classList.toggle('is-dense', dense);
    if (dense) { marks.forEach(function (m) { m.setOffset([0, -24]); }); return; }
    var pos = vis.map(function (m) { var e = m.getElement(); return { m: m, p: map.project(m.getLngLat()), w: e.offsetWidth + 10, h: e.offsetHeight + 6, o: [0, 0] }; });
    for (var a = 0; a < pos.length; a++) for (var b = a + 1; b < pos.length; b++) {
      var A = pos[a], B = pos[b], dx = B.p.x - A.p.x, dy = B.p.y - A.p.y, d = Math.hypot(dx, dy) || 0.01, ux = dx / d, uy = dy / d;
      if (d < 0.5) { ux = 1; uy = 0; }
      var W = (A.w + B.w) / 2, H = (A.h + B.h) / 2;
      if (Math.abs(dx) >= W || Math.abs(dy) >= H) continue;
      var need = Math.min(Math.abs(ux) > .01 ? W / Math.abs(ux) : 1e9, Math.abs(uy) > .01 ? H / Math.abs(uy) : 1e9), x = (need - d) / 2;
      A.o[0] -= ux * x; A.o[1] -= uy * x; B.o[0] += ux * x; B.o[1] += uy * x;
    }
    pos.forEach(function (q) { q.m.setOffset([Math.round(q.o[0]), Math.round(q.o[1]) - 24]); });
    marks.forEach(function (m) { if (m.getElement().style.display === 'none') m.setOffset([0, -24]); });
  }
  map.on('zoom', function () { grouping(); declutter(); }); map.on('moveend', declutter); map.on('load', function () { grouping(); declutter(); });
  /* phones: the card sits directly under the map, like a bottom sheet */
  var sheet = document.createElement('div'); sheet.className = 'dmx__sheet'; sheet.hidden = true; sheet.setAttribute('aria-live', 'polite');
  box.closest('.dmx').insertBefore(sheet, box.closest('.dmx').querySelector('.dmx__side'));
  sheet.addEventListener('click', function (e) { if (e.target.closest('.dmx__x')) { sheet.hidden = true; cur = -1; back(); marks.forEach(function (m) { m.getElement().classList.remove('is-on'); }); [].forEach.call(list.children, function (x) { x.classList.remove('is-on'); }); } });
  var shown = D.map(function (_, i) { return i; }), cur = -1;
  function nav() { var n = document.getElementById('nav'); return n ? Math.max(n.getBoundingClientRect().bottom, 0) : 0; }
  function inView() { var r = box.getBoundingClientRect(), t = nav(); if (r.top < t + 8 || r.top > innerHeight * .6) scrollTo({ top: scrollY + r.top - t - 16, behavior: 'smooth' }); }
  function render() {
    var term = (q.value || '').trim().toLowerCase(), k = fk.value, r = fr.value;
    shown = D.map(function (p, i) { return i; }).filter(function (i) { var p = D[i];
      return (!k || p.kind === k) && (!r || p.region === r) && (!term || (p.name + ' ' + p.city + ' ' + p.addr + ' ' + p.region).toLowerCase().indexOf(term) >= 0); });
    shown = byNear(shown);
    cnt.textContent = shown.length + (shown.length === 1 ? ' place' : ' places');
    list.innerHTML = shown.length ? shown.map(function (i) { var p = D[i];
      return '<li class="dmx__row' + (i === cur ? ' is-on' : '') + '" data-i="' + i + '" tabindex="0">' + disc(p, 'dmx__disc') +
        '<div class="dmx__txt"><b class="dmx__name">' + esc(p.name) + '</b>' + sub(p) + '</div>' +
        '<a class="dmx__go" href="' + dir(p) + '" target="_blank" rel="noopener" aria-label="Directions to ' + esc(p.name) + '">' + ico.go + '</a></li>'; }).join('')
      : '<li class="dmx__none">Nothing matches yet. Try another city, or <a href="' + ask + '">ask us</a>.</li>';
    marks.forEach(function (m, i) { m.getElement().classList.toggle('is-dim', shown.indexOf(i) < 0); });
  }
  function frame() {
    if (!shown.length) return;
    var b = new maplibregl.LngLatBounds(); shown.forEach(function (i) { b.extend([D[i].lng, D[i].lat]); });
    map.fitBounds(b, { padding: pad(), maxZoom: shown.length === 1 ? 12.5 : 9.5, duration: 1300, essential: true });
  }
  /* v105: closing a place's card (the X) flies back out to the places in the list (everything, if one or none) */
  function back() {
    var idx = shown.length > 1 ? shown : D.map(function (_, i) { return i; });
    var b = new maplibregl.LngLatBounds(); idx.forEach(function (i) { b.extend([D[i].lng, D[i].lat]); });
    map.fitBounds(b, { padding: pad(), maxZoom: 9.5, duration: 1300, essential: true });
  }
  box.addEventListener('click', function (e) { if (e.target.closest('.maplibregl-popup-close-button')) back(); });
  function pick(i, fromPin) {
    /* a pin outside the current search or filter clears them, so every pin can always be opened */
    if (shown.indexOf(i) < 0) { q.value = ''; fk.value = ''; fr.value = ''; render(); }
    cur = i; var p = D[i];
    [].forEach.call(list.children, function (x) { x.classList.toggle('is-on', +x.getAttribute('data-i') === i); });
    marks.forEach(function (m, j) { m.getElement().classList.toggle('is-on', j === i); });
    var on = list.querySelector('.is-on'); if (on && wide.matches) on.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    popup.remove();
    map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 12.5), offset: wide.matches ? [0, 150] : [0, 0], duration: fromPin ? 900 : 1500, essential: true });
    if (!wide.matches) { sheet.innerHTML = cardHTML(p) + '<button type="button" class="dmx__x" aria-label="Close">&times;</button>'; sheet.hidden = false; return; }
    map.once('moveend', function () { if (cur === i) popup.setLngLat([p.lng, p.lat]).setHTML(cardHTML(p)).addTo(map); });
  }
  popup.on('close', function () { cur = -1; marks.forEach(function (m) { m.getElement().classList.remove('is-on'); }); [].forEach.call(list.children, function (x) { x.classList.remove('is-on'); }); });
  [q, fk, fr].forEach(function (c) { c.addEventListener(c === q ? 'input' : 'change', function () { render(); popup.remove(); sheet.hidden = true; if (c !== q || shown.length) frame(); }); });
  list.addEventListener('click', function (e) { if (e.target.closest('a')) return; var li = e.target.closest('.dmx__row'); if (li) { inView(); pick(+li.getAttribute('data-i'), false); } });
  list.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.dmx__row')) { e.preventDefault(); pick(+e.target.getAttribute('data-i'), false); } });
  map.on('load', function () { var a = box.querySelector('.maplibregl-ctrl-attrib'); if (a) a.classList.remove('maplibregl-compact-show'); });
  var youM = null;
  [].forEach.call(document.querySelectorAll('[data-near]'), function (b) { b.addEventListener('click', function () { nearBtn && nearBtn.click(); }); });
  if (nearBtn) nearBtn.addEventListener('click', function () {
    locate(function (order, far) {
      popup.remove(); sheet.hidden = true; cur = -1; render(); list.scrollTop = 0;
      marks.forEach(function (m) { m.getElement().classList.remove('is-on'); });
      if (!youM) { var el = document.createElement('span'); el.className = 'dme'; el.setAttribute('aria-label', 'You are here'); el.innerHTML = '<i></i>';
        youM = new maplibregl.Marker({ element: el }).setLngLat([me.lng, me.lat]).addTo(map); } else youM.setLngLat([me.lng, me.lat]);
      var b = new maplibregl.LngLatBounds([me.lng, me.lat], [me.lng, me.lat]);
      if (far) { map.flyTo({ center: [me.lng, me.lat], zoom: 6, duration: 1500, essential: true }); inView(); return; }
      order.slice(0, 3).forEach(function (i) { b.extend([D[i].lng, D[i].lat]); });
      inView(); map.fitBounds(b, { padding: pad(), maxZoom: 12.5, duration: 1500, essential: true });
    });
  });
  render(); grouping(); declutter(); box.__map = map;
})();
