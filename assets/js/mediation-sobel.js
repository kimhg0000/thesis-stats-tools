(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = $(id).value; return v === '' ? NaN : Number(v); };

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function quantile(sorted, q) { // numpy 기본(선형 보간)과 같은 방식
    var pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function mcCI(a, sa, b, sb, reps) {
    var rnd = mulberry32(hash([a, sa, b, sb].join('|')));
    var out = new Float64Array(reps), i = 0;
    while (i < reps) { // Box-Muller로 정규난수 두 개
      var u1 = rnd(), u2 = rnd();
      if (u1 <= 1e-300) continue;
      var r = Math.sqrt(-2 * Math.log(u1));
      var z1 = r * Math.cos(2 * Math.PI * u2), z2 = r * Math.sin(2 * Math.PI * u2);
      out[i++] = (a + sa * z1) * (b + sb * z2);
    }
    out.sort();
    return [quantile(out, 0.025), quantile(out, 0.975)];
  }
  function row(key, se, ab) {
    var z = ab / se, p = 2 * S.normSf(Math.abs(z));
    $('se' + key).textContent = isFinite(se) ? S.fmt(se, 4) : '계산 불가';
    $('z' + key).textContent = isFinite(z) ? S.fmt(z, 2) : '–'; $('z' + key).setAttribute('data-value', z);
    $('p' + key).textContent = isFinite(p) ? S.fmtP(p).replace('= ', '') : '–'; $('p' + key).setAttribute('data-value', p);
    return { z: z, p: p };
  }

  function run(auto) {
    $('err').textContent = '';
    var a = val('a'), sa = val('sa'), b = val('b'), sb = val('sb');
    if (![a, sa, b, sb].every(isFinite)) { if (auto !== true) $('err').textContent = '네 칸을 모두 채우세요.'; S.show(false); return; }
    if (sa <= 0 || sb <= 0) { $('err').textContent = '표준오차는 0보다 커야 합니다.'; S.show(false); return; }
    S.show(true);
    var ab = a * b;
    var base = b * b * sa * sa + a * a * sb * sb, cross = sa * sa * sb * sb;
    $('ab').textContent = S.fmt(ab, 4); $('ab').setAttribute('data-value', ab);
    var sob = row('S', Math.sqrt(base), ab);
    row('A', Math.sqrt(base + cross), ab);
    row('G', base - cross > 0 ? Math.sqrt(base - cross) : NaN, ab);
    var ci = mcCI(a, sa, b, sb, 1000000);
    $('mc').textContent = '[' + S.fmt(ci[0], 4) + ', ' + S.fmt(ci[1], 4) + ']';
    $('mc').setAttribute('data-lo', ci[0]); $('mc').setAttribute('data-hi', ci[1]);
    var sig = ci[0] > 0 || ci[1] < 0;
    S.live('간접효과와 신뢰구간을 계산했습니다.');
    $('sentence').innerHTML = '간접효과의 유의성을 몬테카를로 방법(반복 1,000,000회; Preacher &amp; Selig, 2012)으로 검증한 결과, 간접효과(<i>ab</i> = ' + S.fmt(ab, 3) +
      ')의 95% 신뢰구간 [' + S.fmt(ci[0], 3) + ', ' + S.fmt(ci[1], 3) + ']이 0을 ' + (sig ? '포함하지 않아 매개효과가 통계적으로 유의하였다' : '포함하여 매개효과가 통계적으로 유의하지 않았다') +
      '. 참고로 Sobel 검정 결과는 ' + (sob.p < 0.05 ? '유의하였다' : '유의하지 않았다') + '(<i>z</i> = ' + S.fmt(sob.z, 2) + ', <i>p</i> ' + S.fmtP(sob.p) + ').';
  }

  $('run').addEventListener('click', function () { run(false); });
  S.auto('form', function () { run(true); }, 500);
  $('reset').addEventListener('click', function () { S.resetForm('form'); $('err').textContent = ''; S.show(false); });
  $('example').addEventListener('click', function () { $('a').value = 0.42; $('sa').value = 0.11; $('b').value = 0.35; $('sb').value = 0.09; run(); });
  S.bindCopy();
})();
