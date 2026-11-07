// Shared by the email-link landing pages (confirmed.html, reset.html).
var TickleAuth = (function () {
  // Language: ?lang= from the app's redirect link, else the browser's language.
  var q = new URLSearchParams(location.search).get('lang');
  var lang = q === 'th' || q === 'en' ? q : /^th\b/i.test(navigator.language || '') ? 'th' : 'en';
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-en]').forEach(function (el) {
    el.textContent = el.getAttribute('data-' + lang) || el.getAttribute('data-en');
  });
  document.title = (document.querySelector('#state-ok h1') || {}).textContent + ' · Tickle';

  var isIPhone = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  document.documentElement.classList.add(isIPhone ? 'is-iphone' : 'is-desktop');

  return {
    lang: lang,
    fragment: function () {
      return Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
    },
    show: function (id) {
      document.querySelectorAll('main > div').forEach(function (el) { el.hidden = el.id !== id; });
      document.title = document.querySelector('#' + id + ' h1').textContent + ' · Tickle';
    },
  };
})();
