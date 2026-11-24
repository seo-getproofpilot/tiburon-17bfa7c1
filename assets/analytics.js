/* Google Analytics 4 + the SOW's conversion events. Fires through GTM (dataLayer events) when the container is on the page; direct gtag only if GA_ID is set and GTM is absent. Never on staging.
   Events: buy_click (any Buy button, with the bottle), generate_lead (tasting, wholesale, contact forms that pass validation),
   phone_click, email_click, directions_click, state_check. */
(function () {
  var GA_ID = '';                       // only for a no-GTM fallback; with GTM, GA4 loads from the container
  if (/github\.io$|localhost|127\.0\.0\.1|^staging\./.test(location.hostname)) return;
  window.dataLayer = window.dataLayer || [];
  var hasGTM = dataLayer.some(function (e) { return e && e.event === 'gtm.js'; });
  /* every event goes to dataLayer as {event, ...params}; GTM tags read it. Without GTM, direct gtag sends it. */
  var direct = !hasGTM && GA_ID;
  if (direct) {
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', GA_ID);
  }
  if (!hasGTM && !GA_ID) return;
  function gtag(type, name, params) {
    if (direct) return window.gtag(type, name, params);
    var o = { event: name }; for (var k in params) o[k] = params[k]; dataLayer.push(o);
  }
  window.tbTrack = function (name, params) { gtag('event', name, params || {}); };

  var page = location.pathname.replace(/^\/|\/$/g, '') || 'home';
  var bottleOf = function (el) {
    var t = (el.getAttribute('data-track') || el.textContent || '').toLowerCase();
    return /dark/.test(t) ? 'Dark 8' : /white/.test(t) ? 'White Tip' : /fin/.test(t) ? 'FIN' : 'any';
  };

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/buy-now|bigthirst|shop\./.test(h) || /^buy-/.test(a.getAttribute('data-track') || '')) gtag('event', 'buy_click', { bottle: bottleOf(a), page: page });
    else if (/^tel:/.test(h)) gtag('event', 'phone_click', { page: page });
    else if (/^mailto:/.test(h)) gtag('event', 'email_click', { page: page });
    else if (/google\.com\/maps/.test(h)) gtag('event', 'directions_click', { page: page, room: /placencia/i.test(h) ? 'Placencia' : 'San Pedro' });
  }, true);

  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.checkValidity || !f.checkValidity()) return;
    if (f.website && f.website.value) return;                 // honeypot: a bot
    var name = f.id === 'bookForm' ? 'tasting_request' : (f.getAttribute('data-kind') || f.id || 'form');
    var room = f.querySelector('[name=room]:checked');
    gtag('event', 'generate_lead', { form: name, room: room ? room.value : undefined, page: page });
  }, true);

  var sel = document.getElementById('stateSel');
  if (sel) sel.addEventListener('change', function () { if (sel.value) gtag('event', 'state_check', { state: sel.value }); });
})();
