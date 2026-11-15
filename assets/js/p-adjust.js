(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };
  var isNum = function (c) { return c !== '' && !isNaN(Number(c)); };

  // 한 줄에서 이름과 p값을 읽는다. 숫자만 여러 개 있으면 각각을 p값으로 본다.
  function parse(text) {
    var items = [], errs = [], lines2 = [], numbered = false;
    String(text || '').replace(/\r/g, '').split('\n').forEach(function (line, li) {
      var l = line.trim();
      if (!l) return;
      if (/[<>≤≥]\s*\.?\d/.test(l)) { errs.push((li + 1) + '번째 줄 "' + l + '": 부등호가 아닌 정확한 p값이 필요합니다. SPSS 출력 표를 두 번 눌러 편집 상태로 연 뒤 그 칸을 다시 두 번 누르면 더 많은 자리가 보입니다(R, jamovi는 소수 자릿수 설정을 늘리세요)'); return; }
      var parts = l.indexOf('\t') >= 0 ? l.split('\t') : l.indexOf(',') >= 0 ? l.split(',') : l.split(/\s+/);
      parts = parts.map(function (x) { return x.trim(); }).filter(function (x) { return x !== ''; });
      if (parts.every(isNum)) { lines2.push(parts.length); parts.forEach(function (x) { items.push({ label: '', p: Number(x) }); }); return; }
      lines2.push(-1);
      var last = parts[parts.length - 1];
      if (!isNum(last)) { errs.push((li + 1) + '번째 줄 "' + l + '": 끝에 p값이 없습니다'); return; }
      items.push({ label: parts.slice(0, -1).join(' '), p: Number(last) });
    });
    // 첫 열이 문항 번호(1, 2, 3 …)인 경우: 줄마다 숫자 두 개이고 첫 숫자가 서로 다른 정수이며 1보다 큰 것이 있으면 번호를 이름으로 쓴다
    var nums = items.length && items.length % 2 === 0 && lines2.length === items.length / 2 && lines2.every(function (n) { return n === 2; });
    if (nums) {
      var firsts = items.filter(function (_, i) { return i % 2 === 0; }).map(function (x) { return x.p; });
      var distinct = firsts.filter(function (v, i) { return firsts.indexOf(v) === i; }).length === firsts.length;
      if (firsts.every(function (v) { return Number.isInteger(v); }) && distinct && firsts.some(function (v) { return v > 1; })) {
        items = firsts.map(function (v, i) { return { label: String(v) + '번', p: items[2 * i + 1].p }; });
        numbered = true;
      }
    }
    return { items: items, errs: errs, numbered: numbered };
  }

  // statsmodels.stats.multitest.multipletests 와 같은 정의
  function adjust(p, alpha) {
    var m = p.length, idx = p.map(function (_, i) { return i; }).sort(function (a, b) { return p[a] - p[b] || a - b; });
    var ps = idx.map(function (i) { return p[i]; });
    var out = { bonf: [], holm: [], bh: [], bonfR: [], holmR: [], bhR: [] };
    p.forEach(function (v, i) { out.bonf[i] = Math.min(1, v * m); out.bonfR[i] = v <= alpha / m; });
    // Holm: 단계적 하향
    var run = 0, stop = false;
    ps.forEach(function (v, k) {
      run = Math.max(run, v * (m - k));
      out.holm[idx[k]] = Math.min(1, run);
      if (!stop && v > alpha / (m - k)) stop = true;
      out.holmR[idx[k]] = !stop;
    });
    // BH: 단계적 상향
    var raw = ps.map(function (v, k) { return v / ((k + 1) / m); }), cur = Infinity, maxRej = -1;
    for (var k = m - 1; k >= 0; k--) { cur = Math.min(cur, raw[k]); out.bh[idx[k]] = Math.min(1, cur); }
    ps.forEach(function (v, k) { if (v <= ((k + 1) / m) * alpha) maxRej = k; });
    ps.forEach(function (_, k) { out.bhR[idx[k]] = k <= maxRej; });
    return out;
  }

  var fmtAdj = function (p) { return p >= 1 ? '1.000' : p < 0.001 ? '< .001' : S.fmt0(p, 3); };
  var fmtA = function (a) { return String(a).replace(/^0\./, '.'); };
  var NAMES = {
    holm: function () { return 'Holm(1979)의 방법으로 보정한 결과'; },
    bonf: function () { return 'Bonferroni 방법(Dunn, 1961)으로 보정한 결과'; },
    bh: function (a) { return 'Benjamini와 Hochberg(1995)의 방법으로 거짓발견률(FDR)을 ' + fmtA(a) + ' 수준에서 통제한 결과'; },
  };

  function run(e) {
    var byClick = !!(e && e.type === 'click');
    $('err').textContent = ''; $('data').removeAttribute('aria-invalid'); S.fieldError('alpha', '');
    var fail = function (m, id) { if (id) S.fieldError(id, m); else { $('err').textContent = m; $('data').setAttribute('aria-invalid', 'true'); } S.show(false); };
    if (!$('data').value.trim()) { if (byClick) fail('p값을 한 줄에 하나씩 넣으세요. "예시 값으로 채우기"로 먼저 해 볼 수 있습니다.'); else S.show(false); return; }
    var t = parse($('data').value);
    if (t.errs.length) return fail(t.errs.slice(0, 3).join('. ') + '.');
    var out = t.items.filter(function (x) { return x.p < 0 || x.p > 1; });
    if (out.length) return fail('p값은 0에서 1 사이여야 합니다: ' + out.slice(0, 4).map(function (x) { return (x.label ? x.label + ' ' : '') + x.p; }).join(', ') + '. 퍼센트나 다른 통계량, 또는 문항 번호 열이 들어가지 않았는지 확인하세요.');
    var alpha = Number($('alpha').value);
    if ($('alpha').value === '' || !(alpha > 0 && alpha < 1)) return fail('유의수준은 0과 1 사이의 값이어야 합니다(보통 .05).', 'alpha');
    var items = t.items.map(function (x, i) { return { label: x.label || '검정 ' + (i + 1), p: x.p }; });
    var p = items.map(function (x) { return x.p; }), m = p.length;
    var r = adjust(p, alpha);
    var warns = [];
    if (t.numbered) warns.push('첫 열을 문항 번호로 보고 이름으로 썼습니다. 번호가 아니라 p값이라면 한 줄에 하나씩 다시 넣으세요.');
    if (m === 1) warns.push('검정이 하나뿐이라 보정한 값이 원래 p와 같습니다. 같은 질문으로 한 검정을 모두 넣었는지 확인하세요.');
    if (p.some(function (v) { return v === 0; })) warns.push('0인 p값이 있습니다. SPSS의 ".000"은 0이 아니라 .0005보다 작다는 뜻이므로, 정확한 값을 넣지 않으면 보정 결과도 정확하지 않습니다.');

    var tb = $('ptab').tBodies[0]; tb.innerHTML = '';
    items.forEach(function (x, i) {
      var tr = document.createElement('tr');
      tr.setAttribute('data-i', i);
      var cell = function (key) { return '<td class="' + key + '" data-value="' + r[key][i] + '" data-rej="' + r[key + 'R'][i] + '">' + fmtAdj(r[key][i]) + (r[key + 'R'][i] ? ' ●' : '') + '</td>'; };
      tr.innerHTML = '<td>' + S.esc(x.label) + '</td><td>' + fmtAdj(x.p) + '</td>' + cell('bonf') + cell('holm') + cell('bh');
      tb.appendChild(tr);
    });
    var cnt = function (key) { return r[key + 'R'].filter(Boolean).length; };
    S.show(true);
    $('m').textContent = m; $('m').setAttribute('data-value', m);
    $('mSub').textContent = '유의수준 α = ' + fmtA(alpha);
    $('nsig').textContent = cnt('bonf') + ' / ' + cnt('holm') + ' / ' + cnt('bh');

    var key = $('method').value, k = cnt(key);
    var sig = items.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return r[key + 'R'][o.i]; });
    var adjP = function (v) { return v >= 1 ? '= 1.000' : S.fmtP(v); };
    var list = sig.map(function (o) { return S.esc(o.x.label) + ', 보정 <i>p</i> ' + adjP(r[key][o.i]); }).join('; ');
    var s = m + '개 검정의 <i>p</i>값을 ' + NAMES[key](alpha) + (key === 'bh' ? '' : '(α = ' + fmtA(alpha) + ')') + ', ';
    if (k === 0) s += '유의한 결과는 없었다.';
    else if (k === m) s += (m === 1 ? '결과는 유의하였다(' : '모두 유의하였다(') + list + ').';
    else s += m + '개 중 ' + k + '개가 유의하였다(' + list + ').';
    $('sentence').innerHTML = s;
    $('warns').innerHTML = warns.map(function (w) { return '<p style="margin:0 0 6px">' + S.esc(w) + '</p>'; }).join('');
    S.live('보정했습니다. 유의한 검정 수 ' + $('nsig').textContent);
    if (byClick) S.reveal();
  }

  $('run').addEventListener('click', run);
  S.auto('form', function () { if ($('data').value.trim()) run(); else { S.show(false); $('err').textContent = ''; } }, 400);
  $('reset').addEventListener('click', function () { S.resetForm('form'); $('err').textContent = ''; $('data').removeAttribute('aria-invalid'); S.show(false); $('data').focus(); });
  $('example').addEventListener('click', function () {
    $('data').value = '자기효능감\t.004\n학업스트레스\t.012\n학업만족\t.030\n진로결정\t.041\n대인관계\t.220\n수면시간\t.620';
    run(); S.reveal();
  });
  window.addEventListener('pageshow', function () { if ($('data').value.trim()) run(); });
  S.bindCopy();
})();
