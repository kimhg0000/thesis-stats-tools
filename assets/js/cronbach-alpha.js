(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };

  function alpha(cols) { // cols: 문항별 값 배열
    var k = cols.length, n = cols[0].length;
    var sumVar = 0, total = new Array(n).fill(0);
    cols.forEach(function (c) { sumVar += S.variance(c); for (var i = 0; i < n; i++) total[i] += c[i]; });
    var vt = S.variance(total);
    return k / (k - 1) * (1 - sumVar / vt);
  }

  function run(e) {
    var byClick = !!(e && e.type === 'click');
    $('err').textContent = ''; $('data').removeAttribute('aria-invalid');
    var t = S.parseTable($('data').value);
    var fail = function (m) { $('err').textContent = m; $('data').setAttribute('aria-invalid', 'true'); S.show(false); };
    if (!t.rows.length) { if (byClick) fail('문항 응답을 붙여 넣으세요. "예시 자료로 채우기"로 먼저 해 볼 수 있습니다.'); else S.show(false); return; }
    var k = t.header.length;
    if (k < 2) return fail('문항이 두 개 이상이어야 알파를 계산할 수 있습니다.');
    var rows = t.rows.filter(function (r) { return r.every(function (v) { return isFinite(v); }); });
    var dropped = t.rows.length - rows.length;
    if (t.bad && t.bad.length > rows.length) return fail('숫자가 아닌 응답이 있습니다(예: ' + t.bad.slice(0, 3).join(', ') + '). 구글 설문처럼 "그렇다"가 글자로 들어 있으면 엑셀에서 1~5 같은 숫자로 바꾼 뒤 붙여 넣으세요.');
    if (rows.length < 3) return fail('빈 칸 없이 응답한 사람이 세 명 이상이어야 합니다.' + (t.bad && t.bad.length ? ' 숫자가 아닌 값: ' + t.bad.slice(0, 3).join(', ') : ''));
    var cols = t.header.map(function (_, j) { return rows.map(function (r) { return r[j]; }); });
    var warns = [];
    if (t.noHeader) warns.push('첫 줄에 글자로 된 문항 이름이 없어 첫 줄도 응답으로 읽었습니다. 첫 줄이 문항 번호(1, 2, 3…)라면 지우고 다시 붙여 넣으세요.');
    if (t.bad && t.bad.length) warns.push('숫자가 아닌 값은 빈 칸으로 처리했습니다: ' + t.bad.slice(0, 5).join(', ') + (t.bad.length > 5 ? ' 외 ' + (t.bad.length - 5) + '건' : ''));
    var zeroVar = t.header.filter(function (_, j) { return S.variance(cols[j]) === 0; });
    if (zeroVar.length) warns.push('모든 응답자가 같은 값을 고른 문항이 있습니다: ' + zeroVar.join(', ') + '. 이 문항은 상관을 계산할 수 없습니다.');

    var a = alpha(cols);
    var tb = $('items').tBodies[0]; tb.innerHTML = '';
    var negItems = [];
    t.header.forEach(function (name, j) {
      var rest = rows.map(function (r) { var s = 0; for (var q = 0; q < k; q++) if (q !== j) s += r[q]; return s; });
      var rit = S.pearson(cols[j], rest);
      var aDel = k > 2 ? alpha(cols.filter(function (_, q) { return q !== j; })) : NaN;
      if (rit < 0) negItems.push(name);
      var tr = document.createElement('tr');
      tr.setAttribute('data-item', name);
      tr.innerHTML = '<td>' + S.esc(name) + '</td><td>' + S.fmt(S.mean(cols[j]), 2) + '</td><td>' + S.fmt(S.sd(cols[j]), 2) +
        '</td><td class="rit" data-value="' + rit + '">' + S.fmt0(rit, 3) + '</td><td class="adel" data-value="' + aDel + '">' + (k > 2 ? S.fmt0(aDel, 3) : '–') + '</td>';
      tb.appendChild(tr);
    });
    if (negItems.length) warns.push('수정된 문항-총점 상관이 음수인 문항이 있습니다: ' + negItems.join(', ') + '. 역문항을 역채점하지 않았는지 먼저 확인하세요.');
    if (a < 0) warns.push('α가 음수입니다. 문항 간 공분산의 평균이 음수라는 뜻으로, 대부분 역문항 처리 누락이나 잘못 고른 열 때문입니다.');
    if (k <= 3) warns.push('문항이 ' + k + '개뿐입니다. α는 문항 수가 적으면 낮게 나오기 쉬우므로 문항 간 평균 상관을 함께 보고하는 방법도 있습니다.');

    S.show(true);
    $('alpha').textContent = S.fmt0(a, 2);
    $('alpha3').textContent = '셋째 자리까지 ' + S.fmt0(a, 3) + ', ';
    $('alpha').setAttribute('data-value', a);
    $('n').textContent = rows.length; $('k').textContent = k;
    S.live('계산했습니다. 크론바흐 알파 ' + S.fmt0(a, 2));
    if (byClick) S.reveal();
    $('dropped').textContent = dropped ? '빈 칸이 있는 응답자 ' + dropped + '명은 제외했습니다.' : '';
    $('warns').innerHTML = warns.map(function (w) { return '<p style="margin:0 0 6px">' + S.esc(w) + '</p>'; }).join('');
    var scale = $('scale').value.trim();
    var name = scale ? scale + ' 척도(' + k + '문항)' : '이 척도(' + k + '문항)';
    if (a <= 0 || negItems.length) {
      $('sentence').textContent = '문항-총점 상관이 음수인 문항이 있거나 α가 0 이하라서 문장을 만들지 않았습니다. 역채점 여부와 붙여 넣은 열을 먼저 확인하세요.';
      document.querySelector('[data-copy="sentence"]').hidden = true;
    } else {
      document.querySelector('[data-copy="sentence"]').hidden = false;
      $('sentence').innerHTML = '본 연구에서 ' + S.esc(name) + '의 내적 일관성 신뢰도는 Cronbach\'s α = ' + S.josa(S.fmt0(a, 2), '으로', '로', true) + ' 나타났다.';
    }
  }

  function example() {
    var d = '문항1\t문항2\t문항3\t문항4\t문항5\n4\t4\t5\t3\t4\n3\t3\t3\t2\t3\n5\t4\t5\t4\t5\n2\t3\t2\t2\t1\n4\t5\t4\t4\t4\n3\t2\t3\t3\t3\n5\t5\t4\t5\t4\n2\t2\t1\t3\t2\n4\t3\t4\t4\t5\n3\t4\t3\t2\t3';
    $('data').value = d; run();
  }

  $('run').addEventListener('click', run);
  // 역채점 도구로 넘어갈 때 붙여 넣은 자료를 이 브라우저 탭 안에서만 넘긴다(sessionStorage)
  document.querySelectorAll('a[href$="reverse-scoring/"]').forEach(function (a) { a.addEventListener('click', function () { try { sessionStorage.setItem('statsite-data', $('data').value); } catch (err) { /* 저장 불가 */ } }); });
  window.addEventListener('pageshow', function () { if ($('data').value.trim()) run(); });
  S.auto('form', function () { if ($('data').value.trim()) run(); else { S.show(false); $('err').textContent = ''; } }, 400);
  $('reset').addEventListener('click', function () { S.resetForm('form'); $('err').textContent = ''; $('data').removeAttribute('aria-invalid'); S.show(false); $('data').focus(); });
  $('example').addEventListener('click', function () { example(); S.reveal(); });
  S.bindCopy();
})();
