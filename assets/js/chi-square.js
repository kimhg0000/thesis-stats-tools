(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };
  var isNum = function (c) { return c !== '' && !isNaN(Number(c)); };
  var lfact = function (n) { return S.lgamma(n + 1); };
  var lchoose = function (n, k) { return lfact(n) - lfact(k) - lfact(n - k); };

  // 교차표 해석: 첫 줄에 글자가 있으면 열 이름, 첫 열에 글자가 있으면 행 이름으로 본다
  function parse(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) return { empty: true };
    var tab = lines.some(function (l) { return l.indexOf('\t') >= 0; });
    var comma = !tab && lines.some(function (l) { return l.indexOf(',') >= 0; });
    var cells = lines.map(function (l) {
      var parts = tab ? l.split('\t') : comma ? l.split(',') : l.trim().split(/\s+/);
      return parts.map(function (c) { return c.trim(); });
    });
    // SPSS 교차표를 통째로 복사한 경우: "빈도/Count" 표시가 있는 줄만 남기고 백분율 줄, 전체 줄·열은 뺀다
    var notice = '';
    var CNT = /^(빈도|관측빈도|count)$/i, TOT = /^(합계|전체|총계|total)$/i;
    var k = -1;
    cells.some(function (r) { return r.some(function (c, j) { if (CNT.test(c)) { k = j; return true; } return false; }); });
    if (k >= 0) {
      var first = -1, keep = [], labs = [];
      cells.forEach(function (r, i) {
        if (!CNT.test(r[k] || '')) return;
        if (first < 0) first = i;
        var lab = ''; for (var q = k - 1; q >= 0; q--) if (r[q] !== '') { lab = r[q]; break; }
        if (TOT.test(lab)) return;
        labs.push(lab); keep.push(r.slice(k + 1));
      });
      var heads = cells.slice(0, Math.max(first, 0));
      var w = Math.max.apply(null, keep.map(function (r) { while (r.length && r[r.length - 1] === '') r.pop(); return r.length; }));
      var dropTot = heads.some(function (h) { return TOT.test(h[k + w] || ''); });
      if (dropTot) { w -= 1; keep = keep.map(function (r) { return r.slice(0, w); }); }
      var ch = heads.length ? heads[heads.length - 1].slice(k + 1, k + 1 + w) : [];
      if (ch.length !== w || ch.some(function (c) { return c === '' || isNum(c); })) { ch = []; for (var q2 = 0; q2 < w; q2++) ch.push(String(q2 + 1)); }
      cells = [[''].concat(ch)].concat(keep.map(function (r, i) { return [labs[i] || String(i + 1)].concat(r); }));
      notice = 'SPSS 교차표를 통째로 붙여 넣은 것으로 보고 "빈도" 줄만 골라 계산했습니다. 백분율 줄과 전체(합계) 줄·열은 뺐습니다. 아래 교차표가 SPSS 출력과 같은지 확인하세요.';
    }
    var header = null;
    if (cells[0].some(function (c) { return c !== '' && !isNum(c); })) header = cells.shift();
    if (!cells.length) return { error: '빈도가 들어 있는 줄이 없습니다.' };
    var rowLab = cells.some(function (r) { return r[0] === '' || !isNum(r[0]); });
    var labels = [], counts = [];
    cells.forEach(function (r) {
      if (rowLab) { labels.push(r[0]); counts.push(r.slice(1)); } else counts.push(r.slice());
    });
    // 행마다 끝의 빈 칸은 지운다(엑셀에서 복사할 때 생김)
    counts = counts.map(function (r) { while (r.length && r[r.length - 1] === '') r.pop(); return r; });
    var width = Math.max.apply(null, counts.map(function (r) { return r.length; }));
    if (header) {
      while (header.length && header[header.length - 1] === '') header.pop();
      if (header.length === width + 1) header = header.slice(1);
      else if (header.length !== width) return { error: '첫 줄의 열 이름 수(' + header.length + '개)와 빈도 열 수(' + width + '개)가 맞지 않습니다.' };
    }
    var bad = [], O = counts.map(function (r, i) {
      var out = [];
      for (var j = 0; j < width; j++) {
        var c = r[j] === undefined ? '' : r[j];
        if (!isNum(c)) bad.push((i + 1) + '행 ' + (j + 1) + '열' + (c === '' ? ' (빈 칸)' : ' "' + c + '"'));
        out.push(Number(c));
      }
      return out;
    });
    if (bad.some(function (b) { return /%/.test(b); })) return { error: '백분율(%) 값이 들어 있습니다: ' + bad.filter(function (b) { return /%/.test(b); }).slice(0, 3).join(', ') + '. SPSS 교차표에서는 관측빈도 칸만 골라 복사하세요(백분율 줄과 합계 줄·열 제외).' };
    if (bad.length) return { error: '빈도 자리에 숫자가 아닌 값이나 빈 칸이 있습니다: ' + bad.slice(0, 4).join(', ') + (bad.length > 4 ? ' 외 ' + (bad.length - 4) + '곳' : '') + '.' };
    var rowNamed = rowLab && labels.every(function (l) { return l !== '' && !/^\d+$/.test(l); });
    var colNamed = !!header && header.every(function (l) { return l !== '' && !/^\d+$/.test(l); });
    if (!rowLab) for (var i = 0; i < O.length; i++) labels.push(String(i + 1));
    if (!header) { header = []; for (var j = 0; j < width; j++) header.push(String(j + 1)); }
    return { O: O, rowLabels: labels, colLabels: header, named: rowNamed && colNamed, notice: notice };
  }

  // 2×2 Fisher 정확검정 양측 p: 관측한 표보다 확률이 크지 않은 표의 확률을 모두 더한다
  function fisher2x2(a, b, c, d) {
    var r1 = a + b, r2 = c + d, c1 = a + c, n = r1 + r2;
    var lo = Math.max(0, c1 - r2), hi = Math.min(r1, c1);
    var lp = function (x) { return lchoose(r1, x) + lchoose(r2, c1 - x) - lchoose(n, c1); };
    var obs = lp(a), cut = obs + Math.log1p(1e-7), p = 0;
    for (var x = lo; x <= hi; x++) { var v = lp(x); if (v <= cut) p += Math.exp(v); }
    return Math.min(1, p);
  }

  function cohenLabel(V, dfs) {
    var k = Math.sqrt(dfs), s = 0.1 / k, m = 0.3 / k, l = 0.5 / k;
    return { s: s, m: m, l: l, label: V >= l ? '큰 효과' : V >= m ? '중간 효과' : V >= s ? '작은 효과' : '작은 효과 기준 미만' };
  }
  var pPlain = function (p) { return S.fmtP(p).replace('= ', ''); };
  var pct = function (x) { return S.fmt(x, 1) + '%'; };

  function run(e) {
    var byClick = !!(e && e.type === 'click');
    $('err').textContent = ''; $('data').removeAttribute('aria-invalid');
    var fail = function (m) { $('err').textContent = m; $('data').setAttribute('aria-invalid', 'true'); S.show(false); };
    var t = parse($('data').value);
    if (t.empty) { if (byClick) fail('교차표 빈도를 붙여 넣으세요. "예시 표로 채우기"로 먼저 해 볼 수 있습니다.'); else S.show(false); return; }
    if (t.error) return fail(t.error);
    var O = t.O, r = O.length, c = O[0].length;
    if (r < 2 || c < 2) return fail('행과 열이 각각 두 개 이상인 교차표가 필요합니다. 지금은 ' + r + '행 ' + c + '열입니다.');
    var neg = false, frac = false;
    O.forEach(function (row) { row.forEach(function (v) { if (v < 0) neg = true; if (Math.abs(v - Math.round(v)) > 1e-9) frac = true; }); });
    if (neg) return fail('빈도에 음수가 있습니다. 칸마다 사람 수(0 이상)를 넣으세요.');
    var totRe = /^(합계|전체|총계|계|total|sum)$/i;
    if (totRe.test(t.rowLabels[r - 1]) || totRe.test(t.colLabels[c - 1])) return fail('합계 행이나 합계 열이 들어 있는 것 같습니다("' + (totRe.test(t.rowLabels[r - 1]) ? t.rowLabels[r - 1] : t.colLabels[c - 1]) + '"). 합계는 빼고 칸의 빈도만 붙여 넣으세요.');
    var R = O.map(function (row) { return row.reduce(function (a, b) { return a + b; }, 0); });
    var C = O[0].map(function (_, j) { return O.reduce(function (a, row) { return a + row[j]; }, 0); });
    var N = R.reduce(function (a, b) { return a + b; }, 0);
    var zr = t.rowLabels.filter(function (_, i) { return R[i] === 0; }), zc = t.colLabels.filter(function (_, j) { return C[j] === 0; });
    if (zr.length || zc.length) return fail('합계가 0인 ' + (zr.length ? '행(' + zr.join(', ') + ')' : '') + (zr.length && zc.length ? '과 ' : '') + (zc.length ? '열(' + zc.join(', ') + ')' : '') + '이 있습니다. 응답이 없는 범주는 빼고 다시 붙여 넣으세요.');

    var E = O.map(function (row, i) { return row.map(function (_, j) { return R[i] * C[j] / N; }); });
    var chi = 0, df = (r - 1) * (c - 1), nLt5 = 0, minE = Infinity;
    O.forEach(function (row, i) { row.forEach(function (o, j) { var ex = E[i][j]; chi += (o - ex) * (o - ex) / ex; if (ex < 5) nLt5++; minE = Math.min(minE, ex); }); });
    var p = S.chi2Sf(chi, df), dfs = Math.min(r - 1, c - 1), V = Math.sqrt(chi / (N * dfs));
    var share = nLt5 / (r * c) * 100, cochranBad = share > 20 || minE < 1;
    var eff = cohenLabel(V, dfs);
    var warns = [];
    if (t.notice) warns.push(t.notice);
    if (frac) warns.push('정수가 아닌 빈도가 있습니다. 가중치를 준 빈도라면 SPSS 출력과 비교해 보세요.');

    S.show(true);
    $('chi').textContent = S.fmt(chi, 2); $('chi').setAttribute('data-value', chi);
    $('chiSub').textContent = '자유도 ' + df + ', N = ' + (frac ? S.fmt(N, 2) : N);
    $('p').textContent = pPlain(p); $('p').setAttribute('data-value', p);
    $('v').textContent = S.fmt0(V, 2); $('v').setAttribute('data-value', V);
    $('vSub').textContent = eff.label + '. Cohen 기준 작음 ' + S.fmt0(eff.s, 2) + ', 중간 ' + S.fmt0(eff.m, 2) + ', 큼 ' + S.fmt0(eff.l, 2) + ' (df* = ' + dfs + ': 행과 열 중 범주 수가 적은 쪽 − 1)';
    var pn = S.pNote(p); if (pn) warns.push(pn);

    // 2×2
    var is22 = r === 2 && c === 2, fp = NaN, phi = NaN;
    $('twoByTwo').hidden = !is22;
    if (is22) {
      var a = O[0][0], b = O[0][1], cc = O[1][0], d = O[1][1];
      var y = 0;
      O.forEach(function (row, i) { row.forEach(function (o, j) { var dd = Math.max(0, Math.abs(o - E[i][j]) - 0.5); y += dd * dd / E[i][j]; }); });
      var py = S.chi2Sf(y, 1);
      fp = frac ? NaN : fisher2x2(a, b, cc, d);
      phi = (a * d - b * cc) / Math.sqrt(R[0] * R[1] * C[0] * C[1]);
      $('chi2b').textContent = S.fmt(chi, 2); $('p2b').textContent = pPlain(p);
      $('yates').textContent = S.fmt(y, 2); $('yates').setAttribute('data-value', y);
      $('pYates').textContent = pPlain(py); $('pYates').setAttribute('data-value', py);
      $('pFisher').textContent = isFinite(fp) ? pPlain(fp) : '정수 빈도에서만 계산'; $('pFisher').setAttribute('data-value', fp);
      $('phi').textContent = S.minus(S.fmt0(phi, 2)); $('phi').setAttribute('data-value', phi);
    }
    if (is22 && minE < 5 && isFinite(fp)) warns.push('기대빈도가 5 미만인 칸이 있습니다(최소 ' + S.fmt(minE, 2) + '). 2×2 표에서는 이때 Fisher의 정확검정 결과를 보고하는 것이 흔한 관례라서, 아래 문장도 Fisher의 정확검정으로 만들었습니다.');
    else if (is22 && minE < 5) warns.push('기대빈도가 5 미만인 칸이 있습니다(최소 ' + S.fmt(minE, 2) + '). Fisher의 정확검정은 정수 빈도에서만 계산되므로, 가중한 빈도라면 원자료로 통계 프로그램에서 정확검정을 하세요. 아래 문장은 Pearson χ²로 만들었습니다.');
    else if (!is22 && cochranBad) warns.push('기대빈도가 5 미만인 칸이 ' + nLt5 + '개(' + S.fmt(share, 1) + '%)이고 최소 기대빈도는 ' + S.fmt(minE, 2) + '입니다. Cochran(1954)이 2×2보다 큰 표에 권고한 기준(5 미만 칸 20% 이하, 1 미만 칸 없음)을 넘어 χ² 근사를 믿기 어렵습니다. 의미가 비슷한 범주를 합치거나 정확검정(Fisher-Freeman-Halton)을 고려하세요.');
    if (is22 && isFinite(fp)) {
      var sg = [p < 0.05, py < 0.05, fp < 0.05], P = function (v) { return 'p ' + S.fmtP(v); };
      if (sg.some(function (x) { return x !== sg[0]; })) warns.push('사례 수가 적어 방법에 따라 유의성이 달라집니다(Pearson χ² ' + P(p) + ', Yates 교정 ' + P(py) + ', Fisher 정확검정 ' + P(fp) + '). 연구방법에 미리 정한 기준을 따르고, 고른 방법을 밝히세요.');
    }

    // 교차표(빈도와 백분율)
    var basis = $('pct').value;
    var rn = $('rowName').value.trim(), cn = $('colName').value.trim();
    $('ctCap').textContent = '교차표 (빈도와 ' + ({ row: '행', col: '열', all: '전체' }[basis]) + ' 백분율)';
    var share_ = function (v, i, j) { return basis === 'row' ? v / R[i] * 100 : basis === 'col' ? v / C[j] * 100 : v / N * 100; };
    var h = '<thead><tr><th>' + S.esc(rn) + '</th>' + t.colLabels.map(function (l) { return '<th>' + S.esc(l) + '</th>'; }).join('') + '<th>전체</th></tr></thead><tbody>';
    O.forEach(function (row, i) {
      h += '<tr><td>' + S.esc(t.rowLabels[i]) + '</td>' + row.map(function (v, j) { return '<td>' + v + ' (' + pct(share_(v, i, j)) + ')</td>'; }).join('') +
        '<td>' + R[i] + ' (' + pct(basis === 'row' ? 100 : R[i] / N * 100) + ')</td></tr>';
    });
    h += '<tr><td>전체</td>' + C.map(function (v) { return '<td>' + v + ' (' + pct(basis === 'col' ? 100 : v / N * 100) + ')</td>'; }).join('') + '<td>' + N + ' (100.0%)</td></tr></tbody>';
    $('ctab').innerHTML = h;

    // 기대빈도
    var eh = '<thead><tr><th></th>' + t.colLabels.map(function (l) { return '<th>' + S.esc(l) + '</th>'; }).join('') + '</tr></thead><tbody>';
    E.forEach(function (row, i) { eh += '<tr><td>' + S.esc(t.rowLabels[i]) + '</td>' + row.map(function (v, j) { return '<td data-cell="' + i + '-' + j + '" data-value="' + v + '">' + S.fmt(v, 2) + (v < 5 ? ' †' : '') + '</td>'; }).join('') + '</tr>'; });
    $('etab').innerHTML = eh + '</tbody>';
    $('eSummary').innerHTML = '† 5 미만 <span id="nLt5" data-value="' + share + '">' + nLt5 + '칸(' + S.fmt(share, 1) + '%)</span>, 최소 <span id="minE" data-value="' + minE + '">' + S.fmt(minE, 2) + '</span>';

    // 조정된 잔차
    var cells = r * c, zcrit = S.normInv(1 - 0.05 / (2 * cells)), hits = [];
    var rh = '<thead><tr><th></th>' + t.colLabels.map(function (l) { return '<th>' + S.esc(l) + '</th>'; }).join('') + '</tr></thead><tbody>';
    O.forEach(function (row, i) {
      rh += '<tr><td>' + S.esc(t.rowLabels[i]) + '</td>' + row.map(function (o, j) {
        var z = (o - E[i][j]) / Math.sqrt(E[i][j] * (1 - R[i] / N) * (1 - C[j] / N));
        if (Math.abs(z) > zcrit) hits.push({ i: i, j: j, z: z });
        var mark = Math.abs(z) > 1.96 ? (z > 0 ? ' ▲' : ' ▼') : '';
        return '<td data-cell="' + i + '-' + j + '" data-value="' + z + '">' + S.minus(S.fmt(z, 2)) + mark + (Math.abs(z) > zcrit ? ' †' : '') + '</td>';
      }).join('') + '</tr>';
    });
    $('rtab').innerHTML = rh + '</tbody>';
    $('rtab').setAttribute('data-zcrit', zcrit);
    $('zcritNote').innerHTML = ' † 칸 ' + cells + '개로 Bonferroni 보정한 기준(|<i>z</i>| &gt; ' + S.fmt(zcrit, 2) + ')을 넘는 칸.';

    // 문장
    var I = function (x) { return '<i>' + x + '</i>'; };
    var Ntxt = frac ? S.fmt(N, 2) : String(N);
    var stat = I('χ') + '²(' + df + ', ' + I('N') + ' = ' + Ntxt + ') = ' + S.fmt(chi, 2) + ', ' + I('p') + ' ' + S.fmtP(p) + ', Cramér\'s ' + I('V') + ' = ' + S.fmt0(V, 2);
    var both = rn && cn;
    var lead = both ? S.esc(rn) + '에 따라 ' + S.esc(S.josa(cn, '이', '가')) + ' 다른지 알아보기 위해' : '두 변수의 관련성을 알아보기 위해';
    var pair = both ? S.esc(S.josa(rn, '과', '와')) + ' ' + S.esc(S.josa(cn, '은', '는')) : '두 변수는';
    var s;
    if (is22 && minE < 5 && isFinite(fp)) {
      s = lead + ' 교차분석을 실시하였다. 기대빈도가 5 미만인 칸이 있어 Fisher의 정확검정을 적용한 결과, ' + pair + ' 통계적으로 ' + (fp < 0.05 ? '유의한 관련이 있었다' : '유의한 관련이 없었다') +
        '(Fisher의 정확검정 ' + I('p') + ' ' + S.fmtP(fp) + ', ' + I('φ') + ' = ' + S.minus(S.fmt0(phi, 2)) + ').';
    } else {
      s = lead + ' 카이제곱 검정을 실시한 결과, ' + pair + ' 통계적으로 ' + (p < 0.05 ? '유의한 관련이 있었다' : '유의한 관련이 없었다') + '(' + stat + ').';
      if (p < 0.05) {
        hits.sort(function (x, y) { return Math.abs(y.z) - Math.abs(x.z); });
        // 2×c 표는 두 행의 잔차가 부호만 반대이므로 한 행만, r×2 표는 한 열만 적는다
        if (r === 2) hits = hits.filter(function (h) { return h.i === 0; }); else if (c === 2) hits = hits.filter(function (h) { return h.j === 0; });
        var top = hits.slice(0, 3);
        var cellName = function (h) { return t.named ? S.esc(t.rowLabels[h.i]) + '의 \'' + S.esc(t.colLabels[h.j]) + '\' 응답은' : (h.i + 1) + '행·' + (h.j + 1) + '열 칸은'; };
        var parts = top.map(function (h, k) { return cellName(h) + ' 기대보다 ' + (h.z > 0 ? '많았' : '적었') + (k < top.length - 1 ? '고' : '다') + '(' + I('z') + ' = ' + S.minus(S.fmt(h.z, 2)) + ')'; });
        if (top.length) s += ' 조정된 잔차를 칸 수로 Bonferroni 보정한 기준(|' + I('z') + '| &gt; ' + S.fmt(zcrit, 2) + ')으로 보면 ' + parts.join(', ') + '.';
      }
    }
    $('sentence').innerHTML = s;
    $('sentence').setAttribute('data-stat', 'χ2(' + df + ', N = ' + Ntxt + ') = ' + S.fmt(chi, 2) + ', p ' + S.fmtP(p) + ', Cramér\'s V = ' + S.fmt0(V, 2));
    $('warns').innerHTML = warns.map(function (w) { return '<p style="margin:0 0 6px">' + S.esc(w) + '</p>'; }).join('');
    S.live('검정했습니다. 카이제곱 ' + S.fmt(chi, 2) + ', p ' + S.fmtP(p));
    if (byClick) S.reveal();
  }

  function example() {
    $('data').value = '\t미결정\t탐색\t결정\n1학년\t22\t18\t10\n2학년\t15\t20\t15\n3학년\t8\t17\t25';
    $('rowName').value = '학년'; $('colName').value = '진로 준비 단계';
    run();
  }
  $('run').addEventListener('click', run);
  S.auto('form', function () { if ($('data').value.trim()) run(); else { S.show(false); $('err').textContent = ''; } }, 400);
  $('reset').addEventListener('click', function () { S.resetForm('form'); $('err').textContent = ''; $('data').removeAttribute('aria-invalid'); S.show(false); $('data').focus(); });
  $('example').addEventListener('click', function () { example(); S.reveal(); });
  window.addEventListener('pageshow', function () { if ($('data').value.trim()) run(); });
  S.bindCopy();
})();
