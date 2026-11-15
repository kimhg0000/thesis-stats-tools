(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = $(id).value; return v === '' ? NaN : Number(v); };

  var HINTS = {
    ind: ['효과크기 <i>d</i>', 'Cohen(1988)의 관례적 기준: <i>d</i> 0.2 작음, 0.5 중간, 0.8 큼.', 0.5],
    paired: ['효과크기 <i>d<sub>z</sub></i>', '<i>d<sub>z</sub></i> = 차이 점수의 평균 / 차이 점수의 표준편차. 사전·사후 상관이 높을수록 커집니다.', 0.5],
    corr: ['예상 상관 <i>r</i>', 'Cohen(1988)의 관례적 기준: <i>r</i> .10 작음, .30 중간, .50 큼.', 0.3],
    anova: ['효과크기 <i>f</i>', 'Cohen(1988)의 관례적 기준: <i>f</i> 0.10 작음, 0.25 중간, 0.40 큼. η²를 알면 <i>f</i> = √(η²/(1 − η²)).', 0.25],
    reg: ['효과크기 <i>f</i>²', 'Cohen(1988)의 관례적 기준: <i>f</i>² 0.02 작음, 0.15 중간, 0.35 큼. <i>R</i>² 검정이면 <i>f</i>² = <i>R</i>²/(1 − <i>R</i>²), 일부 변수의 <i>R</i>² 증가량 검정이면 <i>f</i>² = Δ<i>R</i>²/(1 − 전체 모형의 <i>R</i>²).', 0.15]
  };

  function powerAt(design, n, es, alpha, k, p, q) {
    var df1, df2, lam;
    if (design === 'ind') { df1 = 1; df2 = 2 * n - 2; lam = es * es * n / 2; }
    else if (design === 'paired') { df1 = 1; df2 = n - 1; lam = es * es * n; }
    else if (design === 'anova') { var N = n * k; df1 = k - 1; df2 = N - k; lam = es * es * N; }
    else { df1 = q; df2 = n - p - 1; lam = es * n; }
    if (df2 < 1) return 0;
    var crit = S.fInvSf(alpha, df1, df2);
    return S.ncfSf(crit, df1, df2, lam);
  }
  function minN(design, es, alpha, target, k, p, q) {
    var lo = design === 'reg' ? p + 2 : 2;
    if (powerAt(design, lo, es, alpha, k, p, q) >= target) return lo;
    var hi = lo * 2;
    while (powerAt(design, hi, es, alpha, k, p, q) < target) { lo = hi; hi *= 2; if (hi > 2e7) return NaN; }
    while (hi - lo > 1) { var mid = Math.floor((lo + hi) / 2); if (powerAt(design, mid, es, alpha, k, p, q) >= target) hi = mid; else lo = mid; }
    return hi;
  }

  function setDesign() {
    var d = $('design').value, h = HINTS[d];
    $('esLabel').innerHTML = h[0]; $('esHint').innerHTML = h[1]; $('es').value = h[2];
    $('kWrap').hidden = d !== 'anova'; $('pWrap').hidden = d !== 'reg'; $('qWrap').hidden = d !== 'reg';
  }

  function run() {
    $('err').textContent = '';
    var fail = function (m) { $('err').textContent = m; S.show(false); };
    S.show(true);
    var design = $('design').value, es = val('es'), alpha = val('alpha'), target = val('power');
    var k = val('k'), p = val('p'), q = val('q'), drop = val('drop') || 0;
    if (!isFinite(es) || es === 0) return fail('효과크기를 0이 아닌 값으로 넣으세요.');
    if (!(alpha > 0 && alpha < 0.5)) return fail('유의수준은 0과 .5 사이여야 합니다.');
    if (!(target > alpha && target < 1)) return fail('검정력은 유의수준보다 크고 1보다 작아야 합니다.');
    if (drop < 0 || drop >= 90) return fail('탈락률은 0~90% 사이로 넣으세요.');
    es = Math.abs(es);
    var nTot, nGrp = NaN, ach, sent, note = '', esText;
    var aText = S.fmt0(alpha, alpha < 0.01 ? 3 : 2), pwText = S.fmt0(target, 2);
    var plan = $('tense').value === 'plan';
    var pw = '검정력 ' + S.josa(pwText, '으로', '로', true);
    if (design === 'corr') {
      if (es >= 1) return fail('상관은 1보다 작아야 합니다.');
      var C = 0.5 * Math.log((1 + es) / (1 - es));
      var za = S.normInv(1 - alpha / 2), zb = S.normInv(target);
      nTot = Math.ceil(Math.pow((za + zb) / C, 2) + 3);
      ach = S.normCdf(C * Math.sqrt(nTot - 3) - za);
      esText = '<i>r</i> = ' + S.fmt0(es, 2);
      note = 'Fisher z 근사식입니다. G*Power의 정확 계산과 1~2명 차이가 날 수 있으므로, 논문에 G*Power를 인용한다면 G*Power에서도 같은 조건으로 확인하세요.';
      sent = 'Pearson 상관계수의 유의성 검정(양측, α = ' + aText + ')에서 ' + esText + '의 상관을 ' + pw + ' 탐지하는 데 필요한 표본 수는 ' + nTot + (plan ? '명이다.' : '명이었다.');
    } else {
      if (design === 'anova' && !(k >= 2 && Math.round(k) === k)) return fail('집단 수는 2 이상의 정수여야 합니다.');
      if (design === 'reg') {
        if (!(p >= 1 && q >= 1 && q <= p && Math.round(p) === p && Math.round(q) === q)) return fail('예측변수 수를 확인하세요. 검정할 예측변수 수는 전체 수보다 클 수 없습니다.');
      }
      var n = minN(design, es, alpha, target, k, p, q);
      if (!isFinite(n)) return fail('효과크기가 너무 작아 계산 범위를 넘었습니다.');
      ach = powerAt(design, n, es, alpha, k, p, q);
      if (design === 'ind') { nGrp = n; nTot = 2 * n; esText = '<i>d</i> = ' + S.fmt(es, 2);
        sent = '독립표본 <i>t</i>검정(양측, α = ' + aText + ')에서 ' + esText + '의 효과크기를 ' + pw + ' 탐지하려면 집단별 ' + n + '명, 전체 ' + nTot + (plan ? '명이 필요하다.' : '명이 필요하였다.'); }
      else if (design === 'paired') { nTot = n; esText = '<i>d<sub>z</sub></i> = ' + S.fmt(es, 2);
        sent = '대응표본 <i>t</i>검정(양측, α = ' + aText + ')에서 ' + esText + '의 효과크기를 ' + pw + ' 탐지하려면 ' + n + (plan ? '쌍이 필요하다.' : '쌍이 필요하였다.'); }
      else if (design === 'anova') { nGrp = n; nTot = n * k; esText = '<i>f</i> = ' + S.fmt(es, 2);
        sent = k + '개 집단의 일원분산분석(α = ' + aText + ')에서 ' + esText + '의 효과크기를 ' + pw + ' 탐지하려면 집단별 ' + n + '명, 전체 ' + nTot + (plan ? '명이 필요하다.' : '명이 필요하였다.'); }
      else { nTot = n; esText = '<i>f</i>² = ' + S.fmt(es, 2);
        sent = '예측변수 ' + p + '개' + (q < p ? '(그중 ' + q + '개의 추가 설명력 검정)' : '') + '의 다중회귀분석(α = ' + aText + ')에서 ' + esText + '의 효과크기를 ' + pw + ' 탐지하려면 ' + n + (plan ? '명이 필요하다.' : '명이 필요하였다.'); }
      note = '비중심 F분포로 계산한 값입니다. G*Power 3.1의 같은 분석 메뉴와 같은 방식입니다.';
    }
    sent += plan ? ' 효과크기는 [선행연구 근거를 적으세요]를 근거로 정하였다.' : ' 효과크기는 [선행연구 근거를 적으세요]를 근거로 정하였다.';
    $('nTotal').textContent = nTot + '명'; $('nTotal').setAttribute('data-value', nTot);
    $('nGroup').setAttribute('data-value', isFinite(nGrp) ? nGrp : '');
    $('nGroup').textContent = isFinite(nGrp) ? '(집단별 ' + nGrp + '명)' : (design === 'paired' ? '(쌍)' : '');
    $('achieved').textContent = S.fmt(ach, 4); $('achieved').setAttribute('data-value', ach);
    if (drop > 0) {
      var inflate = isFinite(nGrp) ? Math.ceil(nGrp / (1 - drop / 100)) : Math.ceil(nTot / (1 - drop / 100));
      var tot2 = isFinite(nGrp) ? inflate * (design === 'anova' ? k : 2) : inflate;
      $('dropOut').innerHTML = '탈락률 ' + drop + '%를 고려하면 ' + (isFinite(nGrp) ? '집단별 ' + inflate + '명, ' : '') + '전체 ' + tot2 + '명을 모집해야 합니다.';
      sent += ' 탈락률 ' + drop + '%를 고려하여 ' + tot2 + (plan ? '명을 모집할 계획이다.' : '명을 모집하였다.');
    } else $('dropOut').textContent = '';
    $('sentence').innerHTML = sent;
    $('approxNote').textContent = note;
    $('dropOut').hidden = !$('dropOut').textContent;
    S.live('필요한 표본 수 ' + nTot + '명');
  }

  $('design').addEventListener('change', function () { setDesign(); run(); });
  $('run').addEventListener('click', run);
  S.auto('form', function () { run(); }, 350);
  $('reset').addEventListener('click', function () { S.resetForm('form'); setDesign(); run(); });
  run();
  S.bindCopy();
})();
