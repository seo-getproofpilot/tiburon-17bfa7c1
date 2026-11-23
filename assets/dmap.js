/* v98 distributor map: MapLibre GL + OpenFreeMap vector tiles (no key), recoloured to the Tiburón palette.
   Pick a region, see every place that carries Tiburón; click a place to fly to it. Data: assets/locations.js */
(function () {
  var box = document.getElementById('dmap'), list = document.getElementById('dmapList'), chips = document.getElementById('dmapChips');
  if (!box || !window.maplibregl || !window.TB_LOCATIONS) return;
  var D = window.TB_LOCATIONS, root = box.getAttribute('data-root') || '';
  var wide = matchMedia('(min-width:901px)');
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var dir = function (p) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.q || (p.name + ', ' + p.addr)); };
  var kindCls = function (k) { return k === 'Distributor' ? 'd' : k === 'Retail' ? 'r' : 't'; };
  var card = function (p) {
    return '<span class="dloc__k dloc__k--' + kindCls(p.kind) + '">' + esc(p.kind) + '</span><b class="dloc__n">' + esc(p.name) + '</b><span class="dloc__a">' + esc(p.addr) + '</span>' +
      '<span class="dloc__l">' + (p.tel ? '<a href="tel:' + p.tel + '">' + esc(p.phone) + '</a>' : '') + '<a href="' + dir(p) + '" target="_blank" rel="noopener">Directions</a>' +
      (p.page ? '<a href="' + root + p.page + '">Book a tasting</a>' : p.web ? '<a href="' + p.web + '" target="_blank" rel="noopener">Website</a>' : '') + '</span>';
  };
  var all = new maplibregl.LngLatBounds(); D.forEach(function (p) { all.extend([p.lng, p.lat]); });
  var pad = function () { return wide.matches ? { top: 90, bottom: 80, left: 440, right: 90 } : { top: 70, bottom: 60, left: 44, right: 44 }; };
  /* the nav is fixed over the page: bring the whole map below it before it moves, so no pin sits under the logo link */
  var stage = box.closest('.dmap__stage') || box;
  function inView() { var n = document.getElementById('nav'), nav = n ? Math.max(n.getBoundingClientRect().bottom, 0) : 0, r = box.getBoundingClientRect();
    if (r.top < nav + 8 || r.bottom > innerHeight) scrollTo({ top: scrollY + r.top - nav - 16, behavior: 'smooth' }); }
  var map = new maplibregl.Map({ container: box, style: 'https://tiles.openfreemap.org/styles/dark', bounds: all, fitBoundsOptions: { padding: pad() },
    attributionControl: { compact: true }, cooperativeGestures: !wide.matches, dragRotate: false, pitchWithRotate: false });
  map.scrollZoom.disable();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  map.on('styleimagemissing', function (e) { if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) }); });
  /* the palette: abyss land, teal sea, champagne borders and labels */
  map.on('style.load', function () {
    var set = function (id, prop, v) { if (map.getLayer(id)) try { map.setPaintProperty(id, prop, v); } catch (e) {} };
    /* the ground is real: Sentinel-2 cloudless satellite imagery (EOX, 2016 layer, CC BY 4.0), graded down into the palette;
       borders, labels and the pins draw on top of it */
    map.addSource('s2', { type: 'raster', tileSize: 256, maxzoom: 15,
      tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'],
      attribution: '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless by EOX</a> (Copernicus Sentinel data 2016)' });
    var firstAbove = (map.getStyle().layers.filter(function (l) { return l.type !== 'background'; })[0] || {}).id;
    map.addLayer({ id: 's2', type: 'raster', source: 's2', paint: { 'raster-brightness-max': .78, 'raster-saturation': -.12, 'raster-contrast': .08, 'raster-fade-duration': 250 } }, firstAbove);
    map.getStyle().layers.forEach(function (l) {
      var id = l.id;
      if (l.type === 'background') set(id, 'background-color', '#0c1d23');
      else if (l.type === 'fill' || id === 'waterway') map.setLayoutProperty(id, 'visibility', 'none');
      else if (/highway|road|railway|aeroway/.test(id) && l.type === 'line') { map.setLayerZoomRange(id, /motorway/.test(id) ? 5 : 8, 24); set(id, 'line-color', /motorway|major/.test(id) ? 'rgba(232,211,166,.32)' : 'rgba(232,211,166,.14)'); }
      else if (id === 'boundary_state') { set(id, 'line-color', 'rgba(232,211,166,.22)'); set(id, 'line-dasharray', [2, 2]); }
      else if (/boundary_country/.test(id)) set(id, 'line-color', 'rgba(232,211,166,.45)');
      else if (l.type === 'symbol') {
        if (/road|highway/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); return; }
        if (/place_(other|suburb|village)/.test(id)) map.setLayerZoomRange(id, 9, 24);
        if (/place_town/.test(id)) map.setLayerZoomRange(id, 7, 24);
        if (/place_city$/.test(id)) map.setLayerZoomRange(id, 5, 24);
        set(id, 'text-color', id === 'water_name' ? '#8fd0cf' : /country/.test(id) ? '#f1dfb8' : '#e6ece9');
        set(id, 'text-halo-color', 'rgba(4,18,26,.85)'); set(id, 'text-halo-width', 1.6); set(id, 'text-halo-blur', .6);
      }
    });
  });
  /* markers: the shark mark on a disc in the place's colour, with a slow sonar ring */
  var MARK = (document.querySelector('.fz__mk') || {}).innerHTML || '';
  var marks = D.map(function (p, i) {
    var el = document.createElement('button');
    el.type = 'button'; el.className = 'dpin2 dpin2--' + kindCls(p.kind); el.setAttribute('aria-label', p.name);
    el.innerHTML = '<span class="dpin2__ring"></span><span class="dpin2__disc"><svg viewBox="53.5 6 422.8 499.8" aria-hidden="true">' + MARK + '</svg></span>';
    var pop = new maplibregl.Popup({ offset: 26, closeButton: true, maxWidth: wide.matches ? '300px' : Math.min(280, innerWidth - 90) + 'px', className: 'dpop' }).setHTML('<div class="dloc dloc--pop">' + card(p) + '</div>');
    var m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([p.lng, p.lat]).setPopup(pop).addTo(map);
    el.addEventListener('click', function () { select(i, false); if (!wide.matches) map.easeTo({ center: [p.lng, p.lat], offset: [0, 90], duration: 500 }); });
    return m;
  });
  /* zoomed out, a region with several places shows one numbered marker; click it to open that region */
  var groups = {};
  D.forEach(function (p, i) { (groups[p.region] = groups[p.region] || []).push(i); });
  var clusters = Object.keys(groups).filter(function (r) { return groups[r].length > 1; }).map(function (r) {
    var c = new maplibregl.LngLatBounds(); groups[r].forEach(function (i) { c.extend([D[i].lng, D[i].lat]); });
    var el = document.createElement('button'); el.type = 'button'; el.className = 'dpin2 dpin2--' + kindCls(D[groups[r][0]].kind) + ' dpin2--group';
    el.setAttribute('aria-label', r + ': ' + groups[r].length + ' places');
    el.innerHTML = '<span class="dpin2__ring"></span><span class="dpin2__disc"><b>' + groups[r].length + '</b></span><span class="dpin2__lbl">' + esc(r) + '</span>';
    el.addEventListener('click', function () { inView(); show(r); });
    return { r: r, m: new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(c.getCenter()).addTo(map) };
  });
  function grouping() {
    var z = map.getZoom();
    clusters.forEach(function (c) {
      var spread = new maplibregl.LngLatBounds(); groups[c.r].forEach(function (i) { spread.extend([D[i].lng, D[i].lat]); });
      var a = map.project(spread.getSouthWest()), b = map.project(spread.getNorthEast()), tight = Math.hypot(a.x - b.x, a.y - b.y) < 90;
      c.m.getElement().style.display = tight ? '' : 'none';
      groups[c.r].forEach(function (i) { marks[i].getElement().style.display = tight ? 'none' : ''; });
    });
  }
  map.on('zoom', grouping); map.on('load', grouping);
  var regions = ['All'].concat(D.map(function (p) { return p.region; }).filter(function (r, i, a) { return a.indexOf(r) === i; }));
  chips.innerHTML = regions.map(function (r) { var n = r === 'All' ? D.length : D.filter(function (p) { return p.region === r; }).length;
    return '<button type="button" class="dchip" data-r="' + esc(r) + '" aria-pressed="false">' + esc(r) + '<i>' + n + '</i></button>'; }).join('');
  var cur = 'All';
  function show(r) {
    cur = r;
    [].forEach.call(chips.children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-r') === r); });
    var idx = D.map(function (p, i) { return (r === 'All' || p.region === r) ? i : -1; }).filter(function (i) { return i >= 0; });
    list.innerHTML = idx.map(function (i) { return '<li class="dloc" data-i="' + i + '" tabindex="0">' + card(D[i]) + '</li>'; }).join('');
    marks.forEach(function (m, i) { m.getElement().classList.toggle('is-dim', idx.indexOf(i) < 0); m.getPopup().remove(); });
    var b = new maplibregl.LngLatBounds(); idx.forEach(function (i) { b.extend([D[i].lng, D[i].lat]); });
    map.fitBounds(b, { padding: pad(), maxZoom: idx.length === 1 ? 12 : 9.5, duration: 1400, essential: true });
  }
  function select(i, fly) {
    [].forEach.call(list.children, function (x) { x.classList.toggle('is-on', +x.getAttribute('data-i') === i); });
    marks.forEach(function (m, j) { m.getElement().classList.toggle('is-on', j === i); if (j !== i) m.getPopup().remove(); });
    if (fly) { map.flyTo({ center: [D[i].lng, D[i].lat], zoom: Math.max(map.getZoom(), 12.5), offset: wide.matches ? [180, 40] : [0, 90], duration: 1600, essential: true });
      map.once('moveend', function () { if (!marks[i].getPopup().isOpen()) marks[i].togglePopup(); }); }
  }
  chips.addEventListener('click', function (e) { var b = e.target.closest('.dchip'); if (b) { inView(); show(b.getAttribute('data-r')); } });
  list.addEventListener('click', function (e) { if (e.target.closest('a')) return; var li = e.target.closest('.dloc'); if (li) { inView(); select(+li.getAttribute('data-i'), true); } });
  list.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.dloc')) { e.preventDefault(); select(+e.target.getAttribute('data-i'), true); } });
  map.on('load', function () { var a = box.querySelector('.maplibregl-ctrl-attrib'); if (a && !wide.matches) a.classList.remove('maplibregl-compact-show'); });
  show('All'); grouping();
})();
