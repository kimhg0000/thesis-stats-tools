(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = $(id).value; return v === '' ? NaN : Number(v); };

  function label(x, cuts) { // cuts: [작음, 중간, 큼]
    var a = Math.abs(x);
    if (a < cuts[0]) return '작은 효과 기준(' + cuts[0] + ')에 못 미치는';
    if (a < cuts[1]) return '작은';
    if (a < cuts[2]) return '중간';
    return '큰';
  }
  function interp(x, cuts, shown) {
    return S.josa(shown, '은', '는') + ' Cohen(1988)의 관례적 기준으로 ' + label(x, cuts) + (Math.abs(x) < cuts[0] ? ' 크기입니다.' : ' 크기의 효과에 해당합니다.') + ' 같은 분야 선행연구의 값과 비교해 해석하는 편이 더 정확합니다.';
  }
  var AUTO = false;
  function show(res, err, ok, msg) {
    ['resA', 'resB', 'resC', 'resD'].forEach(function (r) { $(r).hidden = true; });
    if (msg) { $(err).textContent = (AUTO && /채우세요|넣으세요/.test(msg)) ? '' : msg; $('empty').hidden = false; return; }
    $(err).textContent = ''; $('empty').hidden = true; $(res).hidden = false; $(ok).hidden = false;
    S.live('효과크기를 계산했습니다.');
  }
  function set(id, x, text) { $(id).setAttribute('data-value', x); $(id).textContent = text; }

  function runA() {
    var m1 = val('m1'), s1 = val('s1'), n1 = val('n1'), m2 = val('m2'), s2 = val('s2'), n2 = val('n2');
    if ([m1, s1, n1, m2, s2, n2].some(function (x) { return !isFinite(x); })) return show('resA', 'errA', 'okA', '여섯 칸을 모두 채우세요.');
    if (n1 < 2 || n2 < 2 || s1 < 0 || s2 < 0) return show('resA', 'errA', 'okA', '사례 수는 2 이상, 표준편차는 0 이상이어야 합니다.');
    var df = n1 + n2 - 2;
    var sp = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / df);
    if (!(sp > 0)) return show('resA', 'errA', 'okA', '두 집단의 표준편차가 모두 0이면 계산할 수 없습니다.');
    show('resA', 'errA', 'okA');
    var d = (m1 - m2) / sp;
    var g = d * (1 - 3 / (4 * (n1 + n2) - 9));
    var se = Math.sqrt((n1 + n2) / (n1 * n2) + d * d / (2 * (n1 + n2)));
    var crit = Math.sqrt(S.fInvSf(0.05, 1, df));
    var lo = d - crit * se, hi = d + crit * se;
    var N = n1 + n2, r = d / Math.sqrt(d * d + (N * N - 2 * N) / (n1 * n2));
    set('dA', d, S.fmt(d, 2) + ' (' + S.fmt(d, 3) + ')');
    $('ciA').setAttribute('data-lo', lo); $('ciA').setAttribute('data-hi', hi);
    $('ciA').textContent = '[' + S.fmt(lo, 2) + ', ' + S.fmt(hi, 2) + ']';
    set('gA', g, S.fmt(g, 2) + ' (' + S.fmt(g, 3) + ')');
    set('rA', r, S.fmt0(r, 2));
    $('spA').textContent = S.fmt(sp, 3);
    $('interpA').textContent = interp(d, [0.2, 0.5, 0.8], 'd = ' + S.fmt(d, 2));
    $('sentA').innerHTML = '두 집단의 평균 차이에 대한 효과크기는 <i>d</i> = ' + S.josa(S.fmt(d, 2), '이었다', '였다') + '(95% CI [' + S.fmt(lo, 2) + ', ' + S.fmt(hi, 2) + ']).';
  }

  function runB() {
    var design = $('tDesign').value, t = val('tVal'), n1 = val('tN1'), n2 = val('tN2');
    if (!isFinite(t) || !isFinite(n1) || (design === 'ind' && !isFinite(n2))) return show('resB', 'errB', 'okB', 't값과 사례 수를 채우세요.');
    if (n1 < 2 || (design === 'ind' && n2 < 2)) return show('resB', 'errB', 'okB', '사례 수는 2 이상이어야 합니다.');
    show('resB', 'errB', 'okB');
    var d, df;
    if (design === 'ind') { d = t * Math.sqrt(1 / n1 + 1 / n2); df = n1 + n2 - 2; $('dBlabel').innerHTML = "Cohen's <i>d</i> = <i>t</i>√(1/<i>n</i>₁ + 1/<i>n</i>₂)"; $('noteB').textContent = ''; }
    else { d = t / Math.sqrt(n1); df = n1 - 1; $('dBlabel').innerHTML = '<i>d<sub>z</sub></i> = <i>t</i> / √<i>n</i>'; $('noteB').innerHTML = '<i>d<sub>z</sub></i>는 차이 점수의 표준편차로 나눈 값이라 독립집단의 <i>d</i>보다 크게 나오는 경우가 많습니다. 보고할 때 어떤 <i>d</i>인지 밝히세요.'; }
    var r = Math.sqrt(t * t / (t * t + df)) * (t < 0 ? -1 : 1);
    set('dB', d, S.fmt(d, 2) + ' (' + S.fmt(d, 3) + ')');
    set('rB', r, S.fmt0(r, 2));
    $('interpB').textContent = design === 'ind' ? interp(d, [0.2, 0.5, 0.8], 'd = ' + S.fmt(d, 2)) : 'Cohen의 d 기준(0.2, 0.5, 0.8)은 독립집단의 d를 위한 것이어서 dz에 그대로 대지 않습니다. dz는 사전·사후 상관이 높을수록 커지기 때문입니다.';
  }

  function runC() {
    var F = val('fVal'), a = val('df1'), b = val('df2');
    if (![F, a, b].every(isFinite) || F < 0 || a < 1 || b < 1) return show('resC', 'errC', 'okC', 'F는 0 이상, 자유도는 1 이상이어야 합니다.');
    show('resC', 'errC', 'okC');
    var eta = F * a / (F * a + b), f = Math.sqrt(eta / (1 - eta));
    set('etaC', eta, S.fmt0(eta, 3));
    set('fC', f, S.fmt(f, 3));
    $('interpC').textContent = interp(eta, [0.01, 0.06, 0.14], 'η²p = ' + S.fmt0(eta, 2)) + ' 다만 이 기준(.01, .06, .14)은 일원분산분석의 η²를 위한 것입니다. 요인이 둘 이상인 설계의 부분 η²에 대면 효과를 크게 읽게 됩니다.';
  }

  function runD() {
    var from = $('convFrom').value, x = val('convVal');
    $('outD').textContent = '';
    if (!isFinite(x)) return show('resD', 'errD', 'resD', '값을 넣으세요.');
    show('resD', 'errD', 'resD');
    if (from === 'd') {
      var r = x / Math.sqrt(x * x + 4);
      $('outD').setAttribute('data-value', r);
      $('outD').innerHTML = '<i>d</i> = ' + S.josa(S.fmt(x, 2), '은', '는') + ' <i>r</i> = ' + S.fmt0(r, 3) + '에 해당합니다.';
    } else {
      if (Math.abs(x) >= 1) return show('resD', 'errD', 'resD', 'r은 −1과 1 사이여야 합니다.');
      var d = 2 * x / Math.sqrt(1 - x * x);
      $('outD').setAttribute('data-value', d);
      $('outD').innerHTML = '<i>r</i> = ' + S.josa(S.fmt0(x, 2), '은', '는') + ' <i>d</i> = ' + S.fmt(d, 3) + '에 해당합니다.';
    }
  }

  $('tDesign').addEventListener('change', function () { $('tN2wrap').hidden = $('tDesign').value !== 'ind'; });
  // 탭
  var tabs = ['A', 'B', 'C', 'D'], RUN = { A: runA, B: runB, C: runC, D: runD };
  function select(k, focus) {
    tabs.forEach(function (x) {
      var on = x === k;
      $('tab-' + x).setAttribute('aria-selected', on ? 'true' : 'false');
      $('tab-' + x).tabIndex = on ? 0 : -1;
      $('tab-' + x).classList.toggle('on', on);
      $('panel-' + x).hidden = !on;
    });
    if (focus) $('tab-' + k).focus();
    AUTO = true; RUN[k](); AUTO = false;
  }
  tabs.forEach(function (k, i) {
    $('tab-' + k).addEventListener('click', function () { select(k); });
    $('tab-' + k).addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
    var t;
    $('panel-' + k).querySelectorAll('input, select').forEach(function (el) {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () { clearTimeout(t); t = setTimeout(function () { AUTO = true; RUN[k](); AUTO = false; }, 400); });
    });
  });
  $('exA').addEventListener('click', function () { var ex = { m1: 3.62, s1: 0.71, n1: 30, m2: 3.18, s2: 0.68, n2: 30 }; Object.keys(ex).forEach(function (k) { $(k).value = ex[k]; }); runA(); });
  $('reset').addEventListener('click', function () { S.resetForm('form'); ['errA', 'errB', 'errC', 'errD'].forEach(function (e) { $(e).textContent = ''; }); ['resA', 'resB', 'resC', 'resD'].forEach(function (r) { $(r).hidden = true; }); $('empty').hidden = false; $('tN2wrap').hidden = false; });
  $('runA').addEventListener('click', runA);
  $('runB').addEventListener('click', runB);
  $('runC').addEventListener('click', runC);
  $('runD').addEventListener('click', runD);
  S.bindCopy();
})();
