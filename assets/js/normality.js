(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };

  // Shapiro-Wilk W와 p (Royston, 1995, 알고리즘 AS R94; scipy.stats.shapiro와 같은 방식)
  function poly(cc, x) { var r = cc[0]; if (cc.length === 1) return r; var p = x * cc[cc.length - 1]; for (var j = cc.length - 2; j >= 1; j--) p = (p + cc[j]) * x; return r + p; }
  var C1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056], C2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
  var C3 = [0.544, -0.39978, 0.025054, -6.714e-4], C4 = [1.3822, -0.77857, 0.062767, -0.0020322];
  var C5 = [-1.5861, -0.31082, -0.083751, 0.0038915], C6 = [-0.4803, -0.082676, 0.0030302], G = [-2.273, 0.459];
  function shapiro(xs) {
    var x = xs.slice().sort(function (a, b) { return a - b; }), n = x.length, i;
    if (n < 3 || n > 5000 || x[n - 1] - x[0] === 0) return null;
    var n2 = Math.floor(n / 2), a = new Array(n2);
    if (n === 3) a[0] = Math.SQRT1_2;
    else {
      var m = new Array(n2), summ2 = 0;
      for (i = 0; i < n2; i++) { m[i] = S.normInv((i + 1 - 0.375) / (n + 0.25)); summ2 += m[i] * m[i]; }
      summ2 *= 2;
      var ss = Math.sqrt(summ2), rsn = 1 / Math.sqrt(n), a1 = poly(C1, rsn) - m[0] / ss, fac, i1;
      if (n > 5) {
        i1 = 2;
        var a2 = -m[1] / ss + poly(C2, rsn);
        fac = Math.sqrt((summ2 - 2 * m[0] * m[0] - 2 * m[1] * m[1]) / (1 - 2 * a1 * a1 - 2 * a2 * a2));
        a[1] = a2;
      } else { i1 = 1; fac = Math.sqrt((summ2 - 2 * m[0] * m[0]) / (1 - 2 * a1 * a1)); }
      a[0] = a1;
      for (i = i1; i < n2; i++) a[i] = -m[i] / fac;
    }
    var mean = S.mean(x), ssx = 0, num = 0;
    for (i = 0; i < n; i++) ssx += (x[i] - mean) * (x[i] - mean);
    for (i = 0; i < n2; i++) num += a[i] * (x[n - 1 - i] - x[i]);
    var w = Math.min(1, num * num / ssx), pw;
    if (n === 3) { pw = 1.909859 * (Math.asin(Math.sqrt(w)) - 1.047198); return { w: w, p: Math.min(1, Math.max(0, pw)) }; }
    var y = Math.log(1 - w), mm, s;
    if (n <= 11) {
      var gamma = poly(G, n);
      if (y >= gamma) return { w: w, p: 1e-99 };
      y = -Math.log(gamma - y); mm = poly(C3, n); s = Math.exp(poly(C4, n));
    } else { var lx = Math.log(n); mm = poly(C5, lx); s = Math.exp(poly(C6, lx)); }
    return { w: w, p: S.normSf((y - mm) / s) };
  }

  function describe(x) {
    var n = x.length, m = S.mean(x), m2 = 0, m3 = 0, m4 = 0;
    x.forEach(function (v) { var d = v - m, d2 = d * d; m2 += d2; m3 += d2 * d; m4 += d2 * d2; });
    m2 /= n; m3 /= n; m4 /= n;
    var o = { n: n, mean: m, sd: n > 1 ? S.sd(x) : NaN, skew: NaN, kurt: NaN, ses: NaN, sek: NaN };
    if (n >= 3 && m2 > 0) {
      o.skew = Math.sqrt(n * (n - 1)) / (n - 2) * m3 / Math.pow(m2, 1.5);
      o.ses = Math.sqrt(6 * n * (n - 1) / ((n - 2) * (n + 1) * (n + 3)));
    }
    if (n >= 4 && m2 > 0) {
      o.kurt = (n - 1) / ((n - 2) * (n - 3)) * ((n + 1) * (m4 / (m2 * m2) - 3) + 6);
      o.sek = 2 * o.ses * Math.sqrt((n * n - 1) / ((n - 3) * (n + 5)));
    }
    o.zs = o.skew / o.ses; o.zk = o.kurt / o.sek;
    o.sw = m2 > 0 ? shapiro(x) : null;
    return o;
  }

  // 기준별 판정: ok = true(기준 안), false(기준 밖). level: ok(심각한 위반 아님), check(확인 필요), severe(심각한 위반 가능)
  var LABEL = { ok: '심각한 위반 아님', check: '확인 필요', severe: '심각한 위반 가능' };
  function judge(o) {
    var as = Math.abs(o.skew), ak = Math.abs(o.kurt), g = function (v) { return S.fmt(v, 2); };
    var mk = function (level, detail) { return { ok: level === 'ok', level: level, text: LABEL[level] + ' (' + detail + ')' }; };
    // Kline(2016): 왜도 지수 절댓값 3 초과는 심하게 치우침, 첨도 지수 10 초과는 문제 가능, 20 초과는 더 심각
    var kl = as > 3 || ak > 20 ? 'severe' : ak > 10 ? 'check' : 'ok';
    var kline = mk(kl, '|왜도| ' + g(as) + (as > 3 ? ' > ' : ' ≤ ') + '3, |첨도| ' + g(ak) + (ak > 20 ? ' > 20' : ak > 10 ? ' > 10' : ' ≤ 10'));
    // West 등(1995): 왜도 2, 첨도 7 이상이면 상당한 비정규
    var west = mk(as < 2 && ak < 7 ? 'ok' : 'severe', '|왜도| ' + g(as) + (as < 2 ? ' < ' : ' ≥ ') + '2, |첨도| ' + g(ak) + (ak < 7 ? ' < ' : ' ≥ ') + '7');
    var kim, zs = Math.abs(o.zs), zk = Math.abs(o.zk);
    if (o.n < 300) {
      // z 기준은 유의성 검정이라 기준을 넘으면 크기를 따로 확인해야 한다
      var lim = o.n < 50 ? 1.96 : 3.29;
      kim = mk(zs < lim && zk < lim ? 'ok' : 'check', '왜도 |z| = ' + g(zs) + (zs < lim ? ' < ' : ' ≥ ') + lim + ', 첨도 |z| = ' + g(zk) + (zk < lim ? ' < ' : ' ≥ ') + lim);
    } else {
      kim = mk(as < 2 && ak < 7 ? 'ok' : 'severe', '300명 이상: |왜도| ' + g(as) + (as < 2 ? ' < ' : ' ≥ ') + '2, |첨도| ' + g(ak) + (ak < 7 ? ' < ' : ' ≥ ') + '7');
    }
    return { west: west, kline: kline, kim: kim };
  }

  var CRIT = {
    kline: { cite: 'Kline(2016)이 제시한 기준(왜도 절댓값 3, 첨도 절댓값 10)', abs: true },
    west: { cite: 'West 등(1995)이 제시한 기준(왜도 절댓값 2, 첨도 절댓값 7)', abs: true },
    kim: { cite: 'Kim(2013)이 표본 크기에 따라 제안한 기준', abs: false }
  };

  function run(e) {
    var byClick = !!(e && e.type === 'click');
    $('err').textContent = ''; $('data').removeAttribute('aria-invalid');
    var fail = function (m) { $('err').textContent = m; $('data').setAttribute('aria-invalid', 'true'); S.show(false); };
    var t = S.parseTable($('data').value);
    if (!t.rows.length) { if (byClick) fail('변수 점수를 붙여 넣으세요. "예시 자료로 채우기"로 먼저 해 볼 수 있습니다.'); else S.show(false); return; }
    var warns = [];
    if (t.noHeader) warns.push('첫 줄에 글자로 된 변수 이름이 없어 첫 줄도 점수로 읽었습니다.');
    if (t.bad && t.bad.length) warns.push('숫자가 아닌 값은 빈 칸으로 처리했습니다: ' + t.bad.slice(0, 5).join(', ') + (t.bad.length > 5 ? ' 외 ' + (t.bad.length - 5) + '건' : ''));
    var res = [];
    t.header.forEach(function (name, j) {
      var x = t.rows.map(function (r) { return r[j]; }).filter(function (v) { return isFinite(v); });
      if (x.length < 4) { warns.push(name + ': 값이 ' + x.length + '개뿐이라 첨도를 계산할 수 없어 뺐습니다(4개 이상 필요).'); return; }
      var o = describe(x); o.name = name;
      if (!(o.sd > 0)) { warns.push(name + ': 모든 값이 같아 왜도·첨도를 계산할 수 없어 뺐습니다.'); return; }
      if (x.length > 5000) warns.push(name + ': 5,000명을 넘어 Shapiro-Wilk 검정은 계산하지 않았습니다.');
      o.j = judge(o); res.push(o);
    });
    if (!res.length) return fail('계산할 수 있는 변수가 없습니다. 변수마다 값이 4개 이상이고 모두 같지 않아야 합니다.');
    if (res.some(function (o) { return o.n >= 300 && o.sw && o.sw.p < 0.05; })) warns.push('300명 이상인 변수에서 Shapiro-Wilk 검정이 유의합니다. 표본이 크면 작은 이탈도 유의해지므로 왜도·첨도의 크기와 Q-Q 도표로 판단하세요.');

    S.show(true);
    var f = function (v, d) { return isFinite(v) ? S.minus(S.fmt(v, d)) : '–'; };
    var cell = function (cls, v, d) { return '<td class="' + cls + '" data-value="' + v + '">' + f(v, d) + '</td>'; };
    $('desc').tBodies[0].innerHTML = res.map(function (o) {
      var swp = o.sw ? (o.sw.p < 0.001 ? '< .001' : S.fmt0(o.sw.p, 3)) : '–';
      return '<tr data-var="' + S.esc(o.name) + '"><td>' + S.esc(o.name) + '</td><td class="n">' + o.n + '</td>' + cell('m', o.mean, 2) + cell('sd', o.sd, 2) +
        cell('skew', o.skew, 2) + cell('ses', o.ses, 3) + cell('zs', o.zs, 2) + cell('kurt', o.kurt, 2) + cell('sek', o.sek, 3) + cell('zk', o.zk, 2) +
        '<td class="w" data-value="' + (o.sw ? o.sw.w : '') + '">' + (o.sw ? S.fmt0(o.sw.w, 3) : '–') + '</td><td class="swp" data-value="' + (o.sw ? o.sw.p : '') + '">' + swp + '</td></tr>';
    }).join('');
    $('judge').tBodies[0].innerHTML = res.map(function (o) {
      return '<tr data-var="' + S.esc(o.name) + '"><td>' + S.esc(o.name) + '</td><td class="kline" data-ok="' + o.j.kline.ok + '" data-level="' + o.j.kline.level + '">' + o.j.kline.text + '</td><td class="west" data-ok="' + o.j.west.ok + '" data-level="' + o.j.west.level + '">' + o.j.west.text + '</td><td class="kim" data-ok="' + o.j.kim.ok + '" data-level="' + o.j.kim.level + '">' + o.j.kim.text + '</td></tr>';
    }).join('');

    var crit = $('crit').value, bad = res.filter(function (o) { return !o.j[crit].ok; });
    var range = function (k) {
      var v = res.map(function (o) { return o[k]; }), lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
      return res.length === 1 ? f(lo, 2) : f(lo, 2) + '~' + f(hi, 2);
    };
    var subj = res.length === 1 ? S.esc(res[0].name) + '의' : '주요 변수의';
    var kr = range('kurt'), C = CRIT[crit], what = C.abs ? '왜도와 첨도의 절댓값이 ' : '왜도와 첨도가 ';
    var s = subj + ' 왜도는 ' + range('skew') + ', 첨도는 ' + S.josa(kr, '으로', '로', true) + ', ';
    var badList = function () { return bad.map(function (o) { return S.esc(o.name) + ' 왜도 ' + f(o.skew, 2) + ', 첨도 ' + f(o.kurt, 2); }).join('; '); };
    if (!bad.length) s += (res.length === 1 ? '' : '모든 변수에서 ') + what + C.cite + '을 넘지 않아 정규성 가정을 심각하게 위반하지는 않는 것으로 판단하였다.';
    else if (bad.length === res.length) s += (res.length === 1 ? '' : '모든 변수에서 ') + what + C.cite + '을 넘어 정규성 가정을 위반했을 가능성이 있다' + (res.length === 1 ? '.' : '(' + badList() + ').');
    else {
      var last = bad[bad.length - 1].name;
      s += bad.map(function (o) { return S.esc(o.name); }).join(', ') + S.esc(S.josa(last, '을', '를').slice(last.length)) + ' 제외한 변수는 ' + what + C.cite + '을 넘지 않아 정규성 가정을 심각하게 위반하지는 않는 것으로 판단하였다. ' +
        bad.map(function (o) { return S.esc(o.name); }).join(', ') + S.esc(S.josa(last, '은', '는').slice(last.length)) + ' 기준을 넘어 정규성 가정을 위반했을 가능성이 있다(' + badList() + ').';
    }
    // Shapiro-Wilk가 유의한 변수: 덧붙일 문장을 따로 제안한다
    var swSig = res.filter(function (o) { return o.sw && o.sw.p < 0.05; });
    var swTxt = function (o) { return S.esc(o.name) + '(<i>W</i> = ' + S.fmt0(o.sw.w, 3) + ', <i>p</i> ' + S.fmtP(o.sw.p) + ')'; };
    var big = swSig.filter(function (o) { return o.n >= 300; }), small = swSig.filter(function (o) { return o.n < 300; }), s2 = [];
    if (big.length) s2.push('다만 Shapiro-Wilk 검정에서 ' + big.map(swTxt).join(', ') + '의 분포가 정규분포와 유의하게 달랐는데, 표본이 커서 작은 이탈에도 검정이 민감하게 반응했을 가능성이 있어 Q-Q 도표를 함께 확인하였다[확인한 결과를 적으세요].');
    if (small.length) s2.push((big.length ? '또한' : '다만') + ' Shapiro-Wilk 검정에서 ' + small.map(swTxt).join(', ') + '의 분포가 정규분포와 유의하게 달라, Q-Q 도표와 극단값을 함께 확인하였다[확인한 결과와 대처를 적으세요].');
    $('sentence2').innerHTML = s2.join(' ');
    $('sw-box').hidden = !s2.length;
    var tiny = res.filter(function (o) { return o.n < 50; });
    if (tiny.length) warns.push('50명 미만인 변수가 있습니다(' + tiny.map(function (o) { return o.name + ' ' + o.n + '명'; }).join(', ') + '). 표본이 작으면 왜도·첨도 추정이 불안정하고 Shapiro-Wilk 검정의 검정력도 낮습니다. 절댓값 기준만 쓰기보다 z값 기준(Kim, 2013)을 함께 보고, 기준 안에 있어도 정규성이 확인되었다고 쓰지는 마세요.');
    $('sentence').innerHTML = s;
    if (crit === 'kim') warns.push('Kim(2013) 기준은 변수마다 표본 크기에 따라 쓰는 규칙이 다릅니다(기준별 판정 표의 괄호). 문장에 규칙을 구체적으로 적으세요.');
    $('warns').innerHTML = warns.map(function (w) { return '<p style="margin:0 0 6px">' + S.esc(w) + '</p>'; }).join('');
    S.live('계산했습니다. 변수 ' + res.length + '개');
    if (byClick) S.reveal();
  }

  function example() {
    var rows = ['학습몰입\t학업스트레스\t수업만족'];
    var a = [3.4, 3.8, 4.1, 2.9, 3.6, 3.2, 4.4, 3.9, 3.1, 3.7, 2.6, 4.0, 3.5, 3.3, 4.2, 3.8, 3.0, 3.6, 4.6, 3.4, 2.8, 3.9, 3.5, 3.7, 4.1];
    var b = [2.1, 1.8, 2.4, 3.9, 2.0, 2.6, 1.7, 2.2, 4.6, 2.3, 1.9, 2.0, 2.8, 2.1, 1.6, 2.5, 3.4, 2.2, 1.8, 4.9, 2.4, 2.0, 2.7, 1.9, 3.1];
    var c = [4, 5, 4, 3, 4, 4, 5, 5, 3, 4, 2, 5, 4, 4, 5, 4, 3, 4, 5, 4, 3, 5, 4, 4, 5];
    for (var i = 0; i < a.length; i++) rows.push(a[i] + '\t' + b[i] + '\t' + c[i]);
    $('data').value = rows.join('\n'); run();
  }

  $('run').addEventListener('click', run);
  window.addEventListener('pageshow', function () { if ($('data').value.trim()) run(); });
  S.auto('form', function () { if ($('data').value.trim()) run(); else { S.show(false); $('err').textContent = ''; } }, 400);
  $('reset').addEventListener('click', function () { S.resetForm('form'); $('err').textContent = ''; $('data').removeAttribute('aria-invalid'); S.show(false); $('data').focus(); });
  $('example').addEventListener('click', function () { example(); S.reveal(); });
  S.bindCopy();
})();
