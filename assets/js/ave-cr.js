(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };
  var NUM = /^-?(\d+\.?\d*|\.\d+)$/;
  var clean = function (t) { return t.replace(/[−–]/g, '-').replace(/,$/, ''); };

  // 부하량 붙여 넣기 해석: "이름: .7 .8" / "이름 .7 .8" (가로) 또는 "요인 [문항] 부하량" (세로)
  function parseLoads(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; });
    var rows = [];
    lines.forEach(function (l, li) {
      var name = '', rest = l, fixed = false;
      var arrow = l.split(/<-{1,3}/), lv = l.split('=~');
      if (arrow.length === 2) { rest = arrow[1]; fixed = true; } // AMOS: 문항 <--- 요인 부하량
      else if (lv.length === 2) { name = lv[0].trim(); rest = lv[1].replace(/^\s*\S+/, ''); fixed = true; } // lavaan: 요인 =~ 문항 부하량
      else { var ci = l.indexOf(':'); if (ci >= 0) { name = l.slice(0, ci).trim(); rest = l.slice(ci + 1); } }
      var toks = rest.split(/[\t,;]+|\s+/).map(function (t) { return clean(t.trim()); }).filter(Boolean);
      var nums = [], words = [];
      toks.forEach(function (t) { if (NUM.test(t)) nums.push(Number(t)); else words.push(t); });
      if (!nums.length) return; // 머리글 줄
      if (fixed && !name) name = words.join(' ');
      if (fixed) nums = nums.slice(0, 1); // 표준화 추정치 다음의 표준오차, z, p 등은 쓰지 않음
      rows.push({ line: li + 1, name: name, words: words, nums: nums, fixed: fixed });
    });
    if (!rows.length) return { error: '부하량을 찾지 못했습니다. 숫자(예: .72)를 넣으세요.' };
    var factors = [], by = {};
    var add = function (nm, vals) { if (!by[nm]) { by[nm] = { name: nm, loads: [] }; factors.push(by[nm]); } by[nm].loads = by[nm].loads.concat(vals); };
    var long = rows.every(function (r) { return r.nums.length === 1 && (!r.name || r.fixed); });
    if (long) rows.forEach(function (r) { add(r.fixed ? (r.name || '요인1') : (r.words.length ? r.words[0] : '요인1'), r.nums); });
    else rows.forEach(function (r, i) { add(r.name || (r.words.length ? r.words.join(' ') : '요인' + (i + 1)), r.nums); });
    return { factors: factors };
  }
  // 아래 삼각(대각선 포함/제외) 또는 전체 행렬
  function parseCorr(text, K) {
    var lines = String(text || '').replace(/\r/g, '').split('\n').map(function (l) {
      return l.split(/[\t,;]+|\s+/).map(function (t) { return clean(t.trim()); }).filter(function (t) { return NUM.test(t); }).map(Number);
    }).filter(function (r) { return r.length; });
    if (!lines.length) return null;
    var R = [], i, j;
    for (i = 0; i < K; i++) { R.push([]); for (j = 0; j < K; j++) R[i].push(i === j ? 1 : NaN); }
    var noDiag = lines.length === K - 1 && lines.every(function (r, k) { return r.length === k + 1; });
    if (noDiag) { for (i = 1; i < K; i++) for (j = 0; j < i; j++) R[i][j] = R[j][i] = lines[i - 1][j]; }
    else {
      if (lines.length !== K) return { error: '상관 행렬의 줄 수(' + lines.length + ')가 요인 수(' + K + ')와 다릅니다. 요인마다 한 줄씩 넣으세요.' };
      for (i = 0; i < K; i++) {
        if (lines[i].length < i) return { error: (i + 1) + '번째 줄의 값이 모자랍니다. 아래 삼각 행렬이면 ' + (i + 1) + '번째 줄에 값이 ' + i + '개(대각선 포함이면 ' + (i + 1) + '개) 있어야 합니다.' };
        for (j = 0; j < i; j++) R[i][j] = R[j][i] = lines[i][j];
      }
    }
    for (i = 0; i < K; i++) for (j = 0; j < i; j++) if (!(Math.abs(R[i][j]) < 1)) return { error: '요인 간 상관은 −1과 1 사이여야 합니다(' + (i + 1) + '행 ' + (j + 1) + '열).' };
    return { R: R };
  }

  var f3 = function (x) { return S.minus(S.fmt0(x, 3)); };
  var f2 = function (x) { return S.minus(S.fmt0(x, 2)); };
  var range = function (a, f) { var lo = Math.min.apply(null, a), hi = Math.max.apply(null, a); return lo === hi ? f(lo) : f(lo) + '–' + f(hi); };
  var E = S.esc;

  function run(auto) {
    $('err').textContent = ''; S.clearErrors($('form'));
    var text = $('loads').value;
    if (!text.trim()) { if (auto !== true) { $('err').textContent = '표준화 요인부하량을 넣으세요.'; $('loads').focus(); } S.show(false); return; }
    var P = parseLoads(text);
    if (P.error) { $('err').textContent = P.error; S.show(false); return; }
    var fs = P.factors, errs = [], warns = [];
    fs.forEach(function (f) {
      if (f.loads.length < 2) errs.push(f.name + ': 문항이 하나인 요인은 AVE와 CR을 계산할 수 없습니다.');
      var badHi = f.loads.filter(function (l) { return Math.abs(l) >= 1; }), badLo = f.loads.filter(function (l) { return l <= 0 && Math.abs(l) < 1; });
      if (badHi.length) errs.push(f.name + ': 표준화 부하량이 1 이상(' + badHi.join(', ') + ')입니다. 오차분산이 음수인 부적절한 해(Heywood case)이거나 비표준화 추정치를 넣은 것입니다.' + (badHi.every(function (l) { return Math.floor(l) === l; }) ? ' 정수만 있다면 문항 번호가 부하량 사이에 섞여 들어갔는지 확인하세요.' : ''));
      if (badLo.length) errs.push(f.name + ': 0 이하인 부하량(' + badLo.join(', ') + ')이 있습니다. 역문항을 역채점하지 않았는지 확인하세요.');
    });
    if (errs.length) { $('err').innerHTML = errs.map(E).join('<br>'); S.show(false); return; }
    var K = fs.length, i, j;
    fs.forEach(function (f) {
      var s = 0, s2 = 0, e = 0;
      f.loads.forEach(function (l) { s += l; s2 += l * l; e += 1 - l * l; });
      f.ave = s2 / f.loads.length; f.cr = s * s / (s * s + e); f.sq = Math.sqrt(f.ave);
      var low = f.loads.filter(function (l) { return l < 0.5; });
      if (low.length) warns.push(E(f.name) + ': 부하량이 .50보다 낮은 문항이 ' + low.length + '개 있습니다(' + low.map(f2).join(', ') + '). Hair 등(2019)은 표준화 부하량이 .50 이상, 가능하면 .70 이상이기를 권합니다.');
      if (f.loads.length === 2) warns.push(E(f.name) + ': 문항이 2개인 요인은 그 요인만으로는 식별되지 않아 다른 요인과의 상관에 기대어 추정됩니다. 해석에 주의하세요.');
    });
    S.show(true);
    $('ftable').querySelector('tbody').innerHTML = fs.map(function (f) {
      return '<tr data-factor="' + E(f.name) + '"><td>' + E(f.name) + '</td><td class="k" data-value="' + f.loads.length + '">' + f.loads.length + '</td><td>' + range(f.loads, f2) + '</td><td class="ave" data-value="' + f.ave + '">' + f3(f.ave) + '</td><td class="cr" data-value="' + f.cr + '">' + f3(f.cr) + '</td></tr>';
    }).join('');
    var J = function (ok) { return ok ? '<span class="ok">충족</span>' : '<span class="no">미충족</span>'; };
    $('judge').querySelector('tbody').innerHTML = fs.map(function (f) {
      return '<tr><td>' + E(f.name) + '</td><td class="judge">' + f3(f.ave) + ' ' + J(f.ave >= 0.5) + '</td><td class="judge">' + f3(f.cr) + ' ' + J(f.cr >= 0.7) + '</td><td class="judge">' + J(f.cr >= 0.6) + '</td></tr>';
    }).join('');

    // 수렴타당도 문장
    var all = [].concat.apply([], fs.map(function (f) { return f.loads; }));
    var aves = fs.map(function (f) { return f.ave; }), crs = fs.map(function (f) { return f.cr; });
    var lowAve = fs.filter(function (f) { return f.ave < 0.5; }), lowCr = fs.filter(function (f) { return f.cr < 0.7; });
    var names = function (arr) { return arr.map(function (f) { return f.name; }).join(', '); };
    var s = '확인적 요인분석에서 표준화 요인부하량은 ' + S.josa(range(all, f2), '이었다', '였다') + '. ';
    s += (K > 1 ? '각 요인의 ' : '') + '평균분산추출(AVE)은 ' + range(aves, f3) + ', 개념신뢰도(CR)는 ' + S.josa(range(crs, f3), '이었다', '였다') + '. ';
    if (!lowAve.length) s += 'AVE는 ' + (K > 1 ? '모두 ' : '') + 'Fornell과 Larcker(1981)가 제시한 기준 .50 이상이었고';
    else if (lowAve.length === K) s += 'AVE는 ' + (K > 1 ? '모두 ' : '') + 'Fornell과 Larcker(1981)가 제시한 기준 .50에 미치지 못하였고';
    else s += 'AVE는 ' + E(names(lowAve)) + '에서 Fornell과 Larcker(1981)가 제시한 기준 .50에 미치지 못하였고';
    if (!lowCr.length) s += ', CR은 ' + (K > 1 ? '모두 ' : '') + '.70 이상(Hair et al., 2019)이었다.';
    else if (lowCr.length === K) s += ', CR은 ' + (K > 1 ? '모두 ' : '') + '.70에 미치지 못하였다(Hair et al., 2019).';
    else s += ', CR은 ' + E(names(lowCr)) + '에서 .70에 미치지 못하였다(Hair et al., 2019).';
    if (!lowAve.length && !lowCr.length) s += ' 따라서 측정모형의 수렴타당도와 개념신뢰도는 기준을 충족하였다.';
    $('sentence').innerHTML = s;

    // 판별타당도
    var cr = $('corr').value.trim() ? parseCorr($('corr').value, K) : null;
    $('flWrap').hidden = true;
    if (cr && cr.error) warns.unshift(cr.error + ' 판별타당도 표는 만들지 않았습니다.');
    else if (cr && K < 2) warns.unshift('요인이 하나라 판별타당도는 따질 수 없습니다.');
    else if (cr) {
      var R = cr.R, viol = [], maxR = 0;
      var head = '<thead><tr><th>요인</th>' + fs.map(function (f, k) { return '<th>' + (k + 1) + '</th>'; }).join('') + '</tr></thead>';
      var body = fs.map(function (f, a) {
        var cells = '';
        for (var b = 0; b < K; b++) {
          if (b > a) { cells += '<td></td>'; continue; }
          if (b === a) { cells += '<td class="diag" data-cell="' + a + '-' + a + '" data-value="' + f.sq + '"><b>' + f3(f.sq) + '</b></td>'; continue; }
          var r = R[a][b], v = Math.abs(r) >= Math.min(f.sq, fs[b].sq);
          maxR = Math.max(maxR, Math.abs(r));
          if (v) viol.push([fs[b], f, r]);
          cells += '<td data-cell="' + a + '-' + b + '" data-r="' + r + '" data-viol="' + (v ? 1 : 0) + '"' + (v ? ' class="viol"' : '') + '>' + f3(r) + '</td>';
        }
        return '<tr><td>' + (a + 1) + '. ' + E(f.name) + '</td>' + cells + '</tr>';
      }).join('');
      $('fl').innerHTML = head + '<tbody>' + body + '</tbody>';
      $('flnote').textContent = '주. 대각선의 굵은 값은 AVE의 제곱근, 그 아래는 요인 간 상관계수이다.' + (viol.length ? ' 칠한 칸은 상관계수의 절댓값이 두 요인 중 한쪽의 AVE 제곱근 이상인 경우이다.' : '');
      var s2 = '각 요인의 AVE 제곱근(' + range(fs.map(function (f) { return f.sq; }), f3) + ')';
      if (!viol.length) s2 += '이 해당 요인과 다른 요인 사이 상관계수의 절댓값(최대 ' + f3(maxR) + ')보다 커 Fornell과 Larcker(1981)의 판별타당도 기준을 충족하였다.';
      else {
        s2 = s2 + '을 요인 간 상관계수와 비교한 결과, ' + viol.map(function (v) {
          var lo = v[0].sq <= v[1].sq ? v[0] : v[1];
          return E(S.josa(v[0].name, '과', '와')) + ' ' + E(v[1].name) + (v[2] < 0 ? ' 사이 상관의 절댓값(' + f3(-v[2]) + ')이 ' : ' 사이의 상관(' + f3(v[2]) + ')이 ') + E(lo.name) + '의 AVE 제곱근(' + f3(lo.sq) + ') 이상이었다';
        }).join(', ') + '. 따라서 ' + (viol.length === 1 ? '이 두 요인은' : '해당 요인 쌍은') + ' Fornell과 Larcker(1981)의 판별타당도 기준을 충족하지 못하였다.';
      }
      $('sentence2').innerHTML = s2; $('sentence2').setAttribute('data-ok', viol.length ? '0' : '1');
      $('flWrap').hidden = false;
    }
    $('warns').innerHTML = warns.map(function (w) { return '<p>' + w + '</p>'; }).join('');
    S.live('AVE와 CR을 계산했습니다.');
    if (auto !== true) S.reveal();
  }

  $('run').addEventListener('click', function () { run(false); });
  S.auto('form', function () { run(true); }, 500);
  $('reset').addEventListener('click', function () { S.resetForm('form'); $('err').textContent = ''; S.show(false); });
  $('example').addEventListener('click', function () {
    $('loads').value = '자기효능감: .72 .81 .69 .77\n학업몰입: .66 .74 .70 .58\n학업만족: .81 .79 .85';
    $('corr').value = '1\n.48\t1\n.35\t.52\t1';
    run();
  });
  S.bindCopy();
})();
