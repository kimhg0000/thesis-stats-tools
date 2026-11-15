(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };

  function stars(p, three) {
    if (three && p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
  }

  function run() {
    $('result').hidden = false; $('err').textContent = ''; $('ok').hidden = false;
    var fail = function (m) { $('err').textContent = m; $('ok').hidden = true; };
    var t = S.parseTable($('data').value);
    if (!t.rows.length) return fail('붙여 넣은 자료가 없습니다.');
    var v = t.header.length;
    if (v < 2) return fail('변수가 두 개 이상이어야 합니다.');
    var three = $('three').checked, pairwise = $('pairwise').checked;
    var rows = pairwise ? t.rows : t.rows.filter(function (r) { return r.every(isFinite); });
    if (rows.length < 3) return fail('빈 칸 없이 응답한 사람이 세 명 이상이어야 합니다.');
    var col = function (j) { return rows.map(function (r) { return r[j]; }); };
    var warns = [];
    if (t.bad && t.bad.length) warns.push('숫자가 아닌 값은 빈 칸으로 처리했습니다: ' + t.bad.slice(0, 5).join(', '));
    // 기술통계
    var desc = t.header.map(function (_, j) { var c = col(j).filter(isFinite); return { m: S.mean(c), sd: S.sd(c), n: c.length }; });
    // 상관
    var R = [], P = [], N = [], ns = {};
    for (var i = 0; i < v; i++) { R.push([]); P.push([]); N.push([]); }
    for (i = 0; i < v; i++) for (var j = 0; j < i; j++) {
      var x = [], y = [];
      rows.forEach(function (r) { if (isFinite(r[i]) && isFinite(r[j])) { x.push(r[i]); y.push(r[j]); } });
      var r = x.length > 2 ? S.pearson(x, y) : NaN;
      var p = isFinite(r) ? S.corrP(r, x.length) : NaN;
      R[i][j] = r; P[i][j] = p; N[i][j] = x.length; ns[x.length] = 1;
      if (!isFinite(r)) warns.push(S.josa(t.header[i], '과', '와') + ' ' + t.header[j] + '의 상관을 계산할 수 없습니다(분산이 0이거나 사례가 부족).');
    }
    // 표
    var html = '<thead><tr><th>변수</th><th><i>M</i></th><th><i>SD</i></th>';
    for (j = 0; j < v - 1; j++) html += '<th>' + (j + 1) + '</th>';
    html += '</tr></thead><tbody>';
    for (i = 0; i < v; i++) {
      html += '<tr><td>' + (i + 1) + '. ' + S.esc(t.header[i]) + '</td><td>' + S.fmt(desc[i].m, 2) + '</td><td>' + S.fmt(desc[i].sd, 2) + '</td>';
      for (j = 0; j < v - 1; j++) {
        if (j < i) html += '<td data-r="' + R[i][j] + '" data-p="' + P[i][j] + '" data-cell="' + i + '-' + j + '">' + S.minus(S.fmt0(R[i][j], 2)) + stars(P[i][j], three) + '</td>';
        else if (j === i) html += '<td>—</td>';
        else html += '<td></td>';
      }
      html += '</tr>';
    }
    html += '</tbody>';
    $('ctable').innerHTML = html;
    var nList = Object.keys(ns).map(Number).sort(function (a, b) { return a - b; });
    var nText = nList.length === 1 ? '<i>N</i> = ' + nList[0] : '<i>n</i> = ' + nList[0] + '~' + nList[nList.length - 1] + '(쌍별 제외)';
    $('caption').innerHTML = '표 1<br><i>주요 변수의 평균, 표준편차 및 상관계수</i>';
    $('tnote').innerHTML = '<i>주.</i> ' + nText + '. ' + (three ? '*<i>p</i> &lt; .05. **<i>p</i> &lt; .01. ***<i>p</i> &lt; .001.' : '*<i>p</i> &lt; .05. **<i>p</i> &lt; .01.');
    // 쌍 목록과 문장
    var tb = $('pairs').tBodies[0]; tb.innerHTML = '';
    var sig = [];
    for (i = 1; i < v; i++) for (j = 0; j < i; j++) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + S.esc(t.header[j]) + ', ' + S.esc(t.header[i]) + '</td><td>' + S.fmt0(R[i][j], 3) + '</td><td>' + S.fmtP(P[i][j]).replace('= ', '') + '</td><td>' + N[i][j] + '</td>';
      tb.appendChild(tr);
      if (P[i][j] < 0.05) sig.push({ a: t.header[j], b: t.header[i], r: R[i][j], p: P[i][j], n: N[i][j] });
    }
    sig.sort(function (a, b) { return Math.abs(b.r) - Math.abs(a.r); });
    var sent;
    if (!sig.length) sent = '변수 간 상관은 모두 통계적으로 유의하지 않았다.';
    else sent = sig.slice(0, 4).map(function (s) {
      return S.josa(S.esc(s.a), '과', '와') + ' ' + S.josa(S.esc(s.b), '은', '는') + ' 유의한 ' + (s.r > 0 ? '정적' : '부적') + ' 상관을 보였다(<i>r</i>(' + (s.n - 2) + ') = ' + S.minus(S.fmt0(s.r, 2)) + ', <i>p</i> ' + S.fmtP(s.p) + ').';
    }).join(' ');
    $('sentence').innerHTML = sent;
    $('warns').innerHTML = warns.map(function (w) { return '<p style="margin:0 0 6px">' + S.esc(w) + '</p>'; }).join('');
  }

  function example() {
    $('data').value = '자기효능감\t학업스트레스\t학업만족\t수업참여\n3.8\t2.4\t3.6\t3.9\n3.2\t3.4\t3.3\t2.8\n4.4\t2.6\t4.1\t4.0\n2.6\t3.1\t2.9\t3.3\n3.9\t2.2\t3.2\t3.5\n3.0\t3.6\t3.4\t2.6\n4.1\t3.0\t4.4\t3.7\n2.9\t2.7\t2.8\t3.4\n3.5\t3.3\t3.9\t2.9\n3.7\t2.5\t3.0\t3.8\n2.8\t3.9\t3.1\t2.7\n4.0\t2.9\t3.7\t4.2\n3.3\t3.2\t2.7\t3.0\n3.6\t2.8\t3.8\t3.1\n2.7\t3.5\t3.0\t2.5';
    run();
  }

  $('run').addEventListener('click', run);
  $('example').addEventListener('click', example);
  S.bindCopy();
})();
