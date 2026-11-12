/* Google Analytics 4 + the SOW's conversion events. Off until GA_ID is set at launch (the preview sends nothing).
   Events: buy_click (any Buy button, with the bottle), generate_lead (tasting, wholesale, contact forms that pass validation),
   phone_click, email_click, directions_click, state_check. */
(function () {
  var GA_ID = '';                       // e.g. 'G-XXXXXXXXXX', set at launch
  if (!GA_ID || /github\.io$|localhost|127\.0\.0\.1/.test(location.hostname)) return;

  var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date()); gtag('config', GA_ID, { anonymize_ip: true });

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
