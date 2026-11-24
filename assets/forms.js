/* Form delivery. Posts to the WordPress handler (theme: /wp-json/tiburon/v1/form), which emails the team
   and keeps a copy in WP admin (Form entries). Where there is no WordPress (the static preview) it falls
   back to opening a pre-written email, as before. */
(function () {
  const TO = 'basil@sharkbaitco.com';
  window.tbSend = function (kind, subject, fields) {
    return fetch('/wp-json/tiburon/v1/form', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: kind, subject: subject, fields: fields, page: location.pathname })
    }).then((r) => r.ok ? r.json().then((j) => !!j.ok) : false).catch(() => false);
  };
  window.tbMailto = function (subject, body) {
    location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  };

  /* footer list signup */
  document.querySelectorAll('form.fz__list').forEach((f) => {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      const email = f.email.value.trim(), btn = f.querySelector('button');
      btn.disabled = true;
      tbSend('List signup', 'Add me to the Tiburón list', { Email: email }).then((ok) => {
        btn.disabled = false;
        if (!ok) { tbMailto('Add me to the Tiburón list', 'Please add ' + email + ' to the Tiburón list.'); return; }
        const p = f.querySelector('p'); if (p) p.textContent = 'You’re on the list. Thanks for joining.';
        f.reset();
        if (window.tbTrack) tbTrack('sign_up', { method: 'footer_list' });
      });
    });
  });
})();
