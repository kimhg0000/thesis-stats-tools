/* 파일 올리기: xlsx, xls, csv 를 브라우저 안에서만 읽어 붙여 넣기 칸에 표로 넣고, 붙여 넣었을 때와 같은 계산을 실행한다.
   엑셀 읽기: SheetJS Community Edition 0.20.3 (Apache-2.0), 이 사이트 안의 assets/vendor/sheetjs 에서 처음 쓸 때만 불러온다. */
(function () {
  'use strict';
  var ID_RE = /^(학번|이름|성명|성함|번호|연번|순번|아이디|응답자|응답자\s*번호|ID|No\.?|name|student\s*id|case)$/i;
  var libPromise = null;
  function loadLib(src) {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!libPromise) libPromise = new Promise(function (ok, bad) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { window.XLSX ? ok(window.XLSX) : bad(new Error('lib')); };
      s.onerror = function () { libPromise = null; bad(new Error('lib')); };
      document.head.appendChild(s);
    });
    return libPromise;
  }
  // CSV: 한국어 엑셀은 CP949(EUC-KR)로 저장하는 일이 많아 UTF-8로 읽히지 않으면 EUC-KR로 다시 읽는다
  function decodeCsv(buf) {
    var bytes = new Uint8Array(buf);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, ''); }
    catch (e) { return new TextDecoder('euc-kr').decode(bytes); }
  }
  function cellText(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return isFinite(v) ? String(v) : '';
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (v instanceof Date) return '';
    return String(v).replace(/[\t\r\n]+/g, ' ').trim();
  }
  var isNum = function (c) { return c !== '' && !isNaN(Number(c)); };

  function setup(ta) {
    var id = ta.id, $ = function (s) { return document.getElementById(id + '-' + s); };
    var tabs = [$('tab-paste'), $('tab-file')], panels = [$('paste'), $('file')];
    var opts = { run: ta.getAttribute('data-upload'), header: ta.getAttribute('data-upload-header') || 'keep', ids: ta.getAttribute('data-upload-id') || 'drop' };
    var lib = ta.getAttribute('data-upload-lib');
    var book = null, rows = [];
    function select(i, focus) {
      tabs.forEach(function (t, j) { t.setAttribute('aria-selected', i === j ? 'true' : 'false'); t.tabIndex = i === j ? 0 : -1; panels[j].hidden = i !== j; });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(1 - i, true); }
        else if (e.key === 'Home') { e.preventDefault(); select(0, true); } else if (e.key === 'End') { e.preventDefault(); select(1, true); }
      });
    });
    var input = $('input'), msg = $('msg'), box = $('opts'), sheetSel = $('sheet'), sheetWrap = $('sheet-wrap'), head = $('head'), cols = $('cols'), go = $('go'), name = $('name');
    function say(t, isErr) { msg.textContent = t; msg.className = isErr ? 'error' : 'note'; }
    function readSheet() {
      var ws = book.Sheets[sheetSel.value];
      var aoa = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false });
      rows = aoa.map(function (r) { return r.map(cellText); }).filter(function (r) { return r.some(function (c) { return c !== ''; }); });
      var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
      rows = rows.map(function (r) { while (r.length < width) r.push(''); return r; });
      if (!rows.length) { box.hidden = true; say('이 시트에 값이 없습니다. 다른 시트를 고르세요.', true); return; }
      head.checked = rows[0].some(function (c) { return c !== '' && !isNum(c); });
      drawCols();
      box.hidden = false;
      say(rows.length + '줄, ' + width + '열을 읽었습니다. 쓸 열을 고른 뒤 "이 자료로 계산하기"를 누르세요.');
    }
    function drawCols() {
      var width = rows[0].length;
      var html = '';
      for (var j = 0; j < width; j++) {
        var label = head.checked ? (rows[0][j] || '열' + (j + 1)) : '열' + (j + 1);
        var on = !(opts.ids === 'drop' && head.checked && ID_RE.test(String(rows[0][j]).trim()));
        html += '<label class="check"><input type="checkbox" data-col="' + j + '"' + (on ? ' checked' : '') + '> ' + window.Stats.esc(label) + '</label>';
      }
      cols.innerHTML = html;
    }
    head.addEventListener('change', function () { if (rows.length) drawCols(); });
    sheetSel.addEventListener('change', readSheet);
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      box.hidden = true; book = null; rows = [];
      if (!f) return;
      name.textContent = f.name;
      if (!/\.(xlsx|xlsm|xls|csv)$/i.test(f.name)) { say('xlsx, xls, csv 파일만 읽을 수 있습니다.', true); return; }
      say('읽는 중입니다…');
      var isCsv = /\.csv$/i.test(f.name);
      Promise.all([loadLib(lib), f.arrayBuffer()]).then(function (r) {
        var X = r[0], buf = r[1];
        book = isCsv ? X.read(decodeCsv(buf), { type: 'string', raw: true }) : X.read(new Uint8Array(buf), { type: 'array' });
        sheetSel.innerHTML = book.SheetNames.map(function (n) { return '<option>' + window.Stats.esc(n) + '</option>'; }).join('');
        sheetWrap.hidden = book.SheetNames.length < 2;
        readSheet();
      }).catch(function () { say('파일을 읽지 못했습니다. 암호가 걸려 있거나 손상된 파일인지 확인하고, 안 되면 엑셀에서 범위를 복사해 붙여 넣기 탭을 쓰세요.', true); });
    });
    go.addEventListener('click', function () {
      var pick = Array.prototype.filter.call(cols.querySelectorAll('input'), function (c) { return c.checked; }).map(function (c) { return Number(c.getAttribute('data-col')); });
      if (!pick.length) { say('계산에 쓸 열을 하나 이상 고르세요.', true); return; }
      var body = head.checked ? rows.slice(1) : rows;
      var lines = [];
      if (opts.header === 'keep') lines.push(pick.map(function (j) { return head.checked ? rows[0][j] : '열' + (j + 1); }).join('\t'));
      body.forEach(function (r) { lines.push(pick.map(function (j) { return r[j]; }).join('\t')); });
      ta.value = lines.join('\n');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      say(body.length + '줄을 붙여 넣기 칸에 옮겨 계산했습니다. 붙여 넣기 탭에서 옮긴 값을 확인할 수 있습니다.');
      var btn = document.getElementById(opts.run);
      if (btn) btn.click();
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('textarea[data-upload]'), setup);
})();
