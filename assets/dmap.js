/* v97 distributor map: pick a region, see every place that carries Tiburón, with directions. Leaflet + CARTO tiles. */
(function () {
  var box = document.getElementById('dmap'), list = document.getElementById('dmapList'), chips = document.getElementById('dmapChips');
  if (!box || !window.L || !window.TB_LOCATIONS) return;
  var D = window.TB_LOCATIONS, root = box.getAttribute('data-root') || '';
  var map = L.map(box, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
  /* OpenStreetMap tiles, tinted dark in CSS (.dmap .leaflet-tile-pane). For heavy traffic at launch, swap in a keyed provider. */
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
  var icon = function (k) { return L.divIcon({ className: 'dpin dpin--' + (k === 'Distributor' ? 'd' : k === 'Retail' ? 'r' : 't'), html: '<span></span>', iconSize: [30, 38], iconAnchor: [15, 36], popupAnchor: [0, -32] }); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var dir = function (p) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.q || (p.name + ', ' + p.addr)); };
  var card = function (p) {
    return '<span class="dloc__k">' + esc(p.kind) + '</span><b class="dloc__n">' + esc(p.name) + '</b><span class="dloc__a">' + esc(p.addr) + '</span>' +
      '<span class="dloc__l">' + (p.tel ? '<a href="tel:' + p.tel + '">' + esc(p.phone) + '</a>' : '') + '<a href="' + dir(p) + '" target="_blank" rel="noopener">Directions</a>' +
      (p.page ? '<a href="' + root + p.page + '">Book a tasting</a>' : p.web ? '<a href="' + p.web + '" target="_blank" rel="noopener">Website</a>' : '') + '</span>';
  };
  var marks = D.map(function (p) { var m = L.marker([p.lat, p.lng], { icon: icon(p.kind), title: p.name }).bindPopup('<div class="dloc dloc--pop">' + card(p) + '</div>'); m.addTo(map); return m; });
  var regions = ['All'].concat(D.map(function (p) { return p.region; }).filter(function (r, i, a) { return a.indexOf(r) === i; }));
  chips.innerHTML = regions.map(function (r) { var n = r === 'All' ? D.length : D.filter(function (p) { return p.region === r; }).length;
    return '<button type="button" class="dchip" data-r="' + esc(r) + '" aria-pressed="false">' + esc(r) + ' <i>' + n + '</i></button>'; }).join('');
  function show(r) {
    [].forEach.call(chips.children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-r') === r); });
    var idx = D.map(function (p, i) { return (r === 'All' || p.region === r) ? i : -1; }).filter(function (i) { return i >= 0; });
    list.innerHTML = idx.map(function (i) { return '<li class="dloc" data-i="' + i + '" tabindex="0">' + card(D[i]) + '</li>'; }).join('');
    var b = L.latLngBounds(idx.map(function (i) { return [D[i].lat, D[i].lng]; }));
    map.flyToBounds(b, { padding: [50, 50], maxZoom: idx.length === 1 ? 13 : 9, duration: .8 });
  }
  chips.addEventListener('click', function (e) { var b = e.target.closest('.dchip'); if (b) show(b.getAttribute('data-r')); });
  function pick(li) { var i = +li.getAttribute('data-i'); map.flyTo([D[i].lat, D[i].lng], 13, { duration: .8 }); marks[i].openPopup();
    [].forEach.call(list.children, function (x) { x.classList.toggle('is-on', x === li); }); }
  list.addEventListener('click', function (e) { if (e.target.closest('a')) return; var li = e.target.closest('.dloc'); if (li) pick(li); });
  list.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.dloc')) { e.preventDefault(); pick(e.target); } });
  map.fitBounds(L.latLngBounds(D.map(function (p) { return [p.lat, p.lng]; })), { padding: [50, 50] });
  show('All');
  addEventListener('resize', function () { map.invalidateSize(); });
})();
