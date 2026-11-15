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
// 위쪽 도구 메뉴: 묶음 단추를 누르면 그 묶음의 도구 목록을 펼친다
(function () {
  'use strict';
  var btns = Array.prototype.slice.call(document.querySelectorAll('.tm-btn'));
  if (!btns.length) return;
  function panel(b) { return document.getElementById(b.getAttribute('aria-controls')); }
  function close(except) { btns.forEach(function (b) { if (b !== except) { b.setAttribute('aria-expanded', 'false'); panel(b).hidden = true; } }); }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      close(b); b.setAttribute('aria-expanded', open ? 'true' : 'false'); panel(b).hidden = !open;
    });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' && b.getAttribute('aria-expanded') !== 'true') { e.preventDefault(); b.click(); var a = panel(b).querySelector('a'); if (a) a.focus(); }
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.tm-g')) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openBtn = btns.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
    if (openBtn) { close(); openBtn.focus(); }
  });
  document.addEventListener('focusin', function (e) { if (!e.target.closest('.tm-g')) close(); });
})();
