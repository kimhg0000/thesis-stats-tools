(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };
  var table = null;

  function num(x) { // 엑셀에 붙일 숫자: 소수 넷째 자리까지, 뒤의 0은 지움
    if (!isFinite(x)) return '';
    return String(Math.round(x * 10000) / 10000);
  }

  var lastSig = '';
  function load() {
    table = S.parseTable($('data').value);
    var tb = $('colTable').tBodies[0];
    // 같은 열 구성을 다시 불러오면 사용자가 고른 체크 상태를 유지한다
    var sig = table.header.join('\t') + '|' + $('min').value + '|' + $('max').value;
    if (sig === lastSig && tb.rows.length === table.header.length) { $('cols').hidden = !table.rows.length; return; }
    lastSig = sig;
    tb.innerHTML = '';
    $('err').textContent = '';
    if (!table.rows.length) { $('cols').hidden = true; S.show(false); return; }
    table.header.forEach(function (h, j) {
      var allNum = table.rows.every(function (r, i) { return isFinite(r[j]) || table.raw[i][j] === ''; });
      var lo = Number($('min').value), hi = Number($('max').value);
      var vals = table.rows.map(function (r) { return r[j]; }).filter(isFinite);
      var outShare = vals.length ? vals.filter(function (v) { return v < lo || v > hi; }).length / vals.length : 1;
      var idLike = /^(id|no\.?|case|번호|순번|연번|학번|응답자|응답자번호|일련번호|성별|학년|나이|연령|gender|sex|age)$/i.test(h.trim()) || !allNum || outShare > 0.5;
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + S.esc(h) + '</td><td><input type="checkbox" id="rev-' + j + '" aria-label="' + S.esc(h) + ' 역채점"></td>' +
        '<td><input type="checkbox" id="inc-' + j + '" aria-label="' + S.esc(h) + ' 척도에 포함"' + (idLike ? '' : ' checked') + '></td>';
      tb.appendChild(tr);
    });
    $('cols').hidden = false;
  }

  function run() {
    if (!table) load();
    if (!table.rows.length) { S.show(false); return; }
    $('err').textContent = '';
    var fail = function (m) { $('err').textContent = m; S.show(false); };
    var lo = Number($('min').value), hi = Number($('max').value);
    if (!isFinite(lo) || !isFinite(hi) || hi <= lo) return fail('응답 최솟값과 최댓값을 확인하세요.');
    var rev = [], inc = [];
    table.header.forEach(function (_, j) { if ($('rev-' + j).checked) rev.push(j); if ($('inc-' + j).checked) inc.push(j); });
    if (!inc.length) return fail('척도에 포함할 열을 하나 이상 고르세요.');
    var warns = [], outRange = [], badNum = [];
    rev.forEach(function (j) { if (inc.indexOf(j) < 0) warns.push(table.header[j] + ' 열은 역채점했지만 척도에는 넣지 않았습니다.'); });
    var bigOut = inc.filter(function (j) {
      var v = table.rows.map(function (r) { return r[j]; }).filter(isFinite);
      return v.length && v.filter(function (x) { return x < lo || x > hi; }).length / v.length > 0.5;
    });
    if (bigOut.length) return fail(bigOut.map(function (j) { return table.header[j]; }).join(', ') + ' 열은 값 대부분이 ' + lo + '~' + hi + ' 범위 밖입니다. 학번이나 나이 같은 열이라면 "척도에 포함"을 해제하고, 응답 범위가 다르면 최솟값·최댓값을 고치세요.');
    var prorate = $('prorate').checked, minShare = Number($('minShare').value) / 100;
    var name = $('scaleName').value.trim() || '[구성개념]';
    var head = table.header.map(function (h, j) { return rev.indexOf(j) >= 0 ? h + '_R' : h; });
    head.push(name + '_합계', name + '_평균');
    var lines = [head.join('\t')], means = [], missingRows = 0;
    table.rows.forEach(function (r, i) {
      var vals = [];
      var cells = table.raw[i].map(function (c, j) {
        var v = r[j];
        if (inc.indexOf(j) >= 0 || rev.indexOf(j) >= 0) {
          if (isFinite(v) && (v < lo || v > hi)) outRange.push((i + 1) + '행 ' + table.header[j] + '=' + v);
          if (isFinite(v) && Math.round(v) !== v) badNum.push((i + 1) + '행 ' + table.header[j] + '=' + v);
        }
        if (rev.indexOf(j) >= 0 && isFinite(v)) v = lo + hi - v;
        if (inc.indexOf(j) >= 0) vals.push(v);
        return rev.indexOf(j) >= 0 ? (isFinite(v) ? num(v) : c) : c;
      });
      var answered = vals.filter(function (v) { return isFinite(v); });
      var complete = answered.length === vals.length;
      if (!complete) missingRows++;
      var sum = complete ? answered.reduce(function (a, b) { return a + b; }, 0) : NaN;
      var mean = complete ? sum / vals.length : (prorate && answered.length && answered.length / vals.length >= minShare - 1e-12 ? answered.reduce(function (a, b) { return a + b; }, 0) / answered.length : NaN);
      if (isFinite(mean)) means.push(mean);
      cells.push(num(sum), num(mean));
      lines.push(cells.join('\t'));
    });
    if (outRange.length) warns.push('응답 범위를 벗어난 값이 있습니다: ' + outRange.slice(0, 6).join(', ') + (outRange.length > 6 ? ' 외 ' + (outRange.length - 6) + '건' : '') + '. 이 값도 역채점 식을 그대로 적용했으니 원자료를 확인하세요.');
    if (badNum.length) warns.push('정수가 아닌 응답이 있습니다: ' + badNum.slice(0, 6).join(', ') + '.');
    if (missingRows) warns.push('척도 문항에 빈 칸이 있는 응답자가 ' + missingRows + '명입니다. ' + (prorate ? '이들 중 문항의 ' + Math.round(minShare * 100) + '% 이상에 응답한 사람의 평균은 응답한 문항만으로 계산했고, 합계는 모두 비웠습니다.' : '이들의 합계와 평균은 비웠습니다.'));
    $('warns').innerHTML = warns.map(function (w) { return '<p style="margin:0 0 6px">' + S.esc(w) + '</p>'; }).join('');
    S.show(true);
    S.live('역채점과 척도 점수를 계산했습니다.');
    $('out').value = lines.join('\n');
    $('mm').textContent = means.length ? S.fmt(S.mean(means), 2) : '–';
    $('msd').textContent = means.length > 1 ? S.fmt(S.sd(means), 2) : '–';
    $('mn').textContent = means.length;
    var revNames = rev.filter(function (j) { return inc.indexOf(j) >= 0; }).map(function (j) { return table.header[j]; });
    var s = name + ' 점수는 ' + inc.length + '문항';
    s += revNames.length ? '(' + revNames.join(', ') + ' 문항은 역채점)' : '';
    s += '에 대한 응답의 평균으로 산출하였으며, 점수가 높을수록 ' + name + ' 수준이 높음을 의미한다.';
    if (prorate && missingRows) s += ' 응답하지 않은 문항이 있는 경우 전체 문항의 ' + Math.round(minShare * 100) + '% 이상에 응답한 사람에 한해 응답한 문항의 평균을 썼다.';
    $('sentence').textContent = s;
  }

  function example() {
    $('data').value = 'ID\tQ1\tQ2\tQ3\tQ4\tQ5\n1\t4\t2\t5\t4\t1\n2\t3\t3\t3\t4\t2\n3\t5\t1\t4\t5\t1\n4\t2\t4\t2\t\t4\n5\t4\t2\t4\t3\t2';
    load();
    $('rev-2').checked = true; $('rev-5').checked = true;
    run();
  }

  $('load').addEventListener('click', load);
  $('run').addEventListener('click', run);
  $('example').addEventListener('click', example);
  var tm;
  $('data').addEventListener('input', function () { table = null; clearTimeout(tm); tm = setTimeout(function () { load(); if (table && table.rows.length) run(); }, 450); });
  ['min', 'max'].forEach(function (id) { $(id).addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { if ($('data').value.trim()) { load(); run(); } }, 450); }); });
  $('form').addEventListener('change', function (e) { if (e.target.closest('#cols')) run(); });
  $('scaleName').addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(run, 400); });
  $('reset').addEventListener('click', function () { S.resetForm('form'); table = null; lastSig = ''; $('cols').hidden = true; $('err').textContent = ''; S.show(false); $('data').focus(); });
  S.bindCopy();
})();
