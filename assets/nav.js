// 휴대폰 메뉴 열고 닫기
(function () {
  'use strict';
  var btn = document.getElementById('menu-btn'), menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  function set(open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.setAttribute('data-open', open ? 'true' : 'false');
    btn.querySelector('.lbl').textContent = open ? '닫기' : '메뉴';
  }
  btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
  set(false);
})();
