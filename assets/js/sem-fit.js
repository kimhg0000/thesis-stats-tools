(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
  var has = function (id) { return $(id).value.trim() !== ''; };

  // 비중심 χ² 누적확률: 포아송 가중합 Σ Pois(j; λ/2) P(χ²_{df+2j} ≤ x)
  function ncx2Cdf(x, df, lam) {
    if (x <= 0) return 0;
    if (lam <= 0) return S.gammaPQ(df / 2, x / 2)[0];
    var mu = lam / 2, sd = Math.sqrt(mu);
    var j0 = Math.max(0, Math.floor(mu - 12 * sd - 20)), j1 = Math.ceil(mu + 12 * sd + 40), sum = 0;
    for (var j = j0; j <= j1; j++) {
      var w = Math.exp(-mu + j * Math.log(mu) - S.lgamma(j + 1));
      if (w > 0) sum += w * S.gammaPQ(df / 2 + j, x / 2)[0];
    }
    return Math.min(1, Math.max(0, sum));
  }
  // ncx2Cdf(x, df, λ) = target 인 λ (λ가 커질수록 누적확률은 줄어든다). 0에서 이미 target 이하면 0
  function solveLambda(x, df, target) {
    if (ncx2Cdf(x, df, 0) <= target) return 0;
    var lo = 0, hi = Math.max(10, x);
    while (ncx2Cdf(x, df, hi) > target) { lo = hi; hi *= 2; }
    for (var i = 0; i < 100; i++) {
      var mid = (lo + hi) / 2;
      if (ncx2Cdf(x, df, mid) > target) lo = mid; else hi = mid;
      if (hi - lo <= 1e-10 * Math.max(1, hi)) break;
    }
    return (lo + hi) / 2;
  }
  var rmseaOf = function (chi, df, n) { return Math.sqrt(Math.max(chi - df, 0) / (df * n)); };
  var f3 = function (x) { return S.minus(S.fmt0(x, 3)); };

  var LAST = { CFI: '는', TLI: '는', RMSEA: '는', SRMR: '은' }; // 마지막 글자 소리(아이, 에이, 알)에 맞춘 조사
  function listJosa(names) { return names.join(', ') + LAST[names[names.length - 1]]; }

  function run(auto) {
    $('err').textContent = ''; S.clearErrors($('form'));
    var chi = val('chi'), df = val('df'), N = val('n');
    if (!isFinite(chi) || !isFinite(df) || !isFinite(N)) {
      if (auto !== true) { var first = S.markEmpty(['chi', 'df', 'n']); $('err').textContent = 'χ², 자유도, 표본 수를 모두 넣으세요.'; if (first) first.focus(); }
      S.show(false); return;
    }
    if (chi < 0) { S.fieldError('chi', 'χ²는 0 이상입니다.'); S.show(false); return; }
    if (df < 1 || Math.floor(df) !== df) { S.fieldError('df', '자유도는 1 이상의 정수입니다. 자유도가 0인 모형(포화모형)은 적합도를 평가할 수 없습니다.'); S.show(false); return; }
    if (N < 2 || Math.floor(N) !== N) { S.fieldError('n', '표본 수는 2 이상의 정수입니다.'); S.show(false); return; }
    var bad = false;
    [['cfi', 0, 1.5], ['tli', -1, 1.5], ['rmsea', 0, 1], ['srmr', 0, 1], ['rlo', 0, 1], ['rhi', 0, 1]].forEach(function (r) {
      var v = val(r[0]);
      if (has(r[0]) && !(v >= r[1] && v <= r[2])) { S.fieldError(r[0], '값을 확인하세요. 소수(예: .95)로 넣습니다.'); bad = true; }
    });
    var bchi = val('bchi'), bdf = val('bdf'), useB = isFinite(bchi) && isFinite(bdf);
    if (useB && (bdf < 1 || bchi < 0)) { S.fieldError('bdf', '기저모형 자유도는 1 이상입니다.'); bad = true; }
    if (bad) { S.show(false); return; }
    S.show(true);

    var conv = $('conv').value, nUse = conv === 'n' ? N : N - 1;
    var p = S.chi2Sf(chi, df);
    $('p').textContent = 'p ' + S.fmtP(p); $('p').setAttribute('data-value', p);
    $('p').innerHTML = '<i>p</i> ' + S.fmtP(p);
    $('ratio').textContent = 'χ²/df = ' + S.fmt(chi / df, 2); $('ratio').setAttribute('data-value', chi / df);
    var rc = rmseaOf(chi, df, nUse);
    var lo = Math.sqrt(solveLambda(chi, df, 0.95) / (df * nUse)), hi = Math.sqrt(solveLambda(chi, df, 0.05) / (df * nUse));
    $('rmseaCalc').textContent = f3(rc); $('rmseaCalc').setAttribute('data-value', rc);
    $('rci').textContent = '90% CI [' + f3(lo) + ', ' + f3(hi) + '], 분모 ' + (conv === 'n' ? 'N' : 'N − 1');
    $('rci').setAttribute('data-lo', lo); $('rci').setAttribute('data-hi', hi);

    var cfiC = NaN, tliC = NaN, warns = [];
    if (useB && bchi <= bdf) {
      warns.push('기저모형 χ²(' + S.fmt(bchi, 2) + ')가 자유도(' + bdf + ')보다 크지 않아 CFI와 TLI를 계산할 수 없습니다. 문항끼리 거의 상관이 없다는 뜻이므로 기저모형 값을 옮겨 적다 틀리지 않았는지 확인하세요.');
      useB = false;
    }
    if (useB) {
      var a = Math.max(chi - df, 0), b = Math.max(bchi - bdf, chi - df, 0);
      cfiC = b > 0 ? 1 - a / b : 1;
      tliC = (bchi / bdf - chi / df) / (bchi / bdf - 1);
      $('cfiCalc').textContent = 'CFI = ' + f3(cfiC); $('cfiCalc').setAttribute('data-value', cfiC);
      $('tliCalc').textContent = 'TLI = ' + f3(tliC); $('tliCalc').setAttribute('data-value', tliC);
    }
    $('incStat').hidden = !useB;

    // 판정에 쓰는 값: 출력에서 옮긴 값이 있으면 그 값, 없으면 다시 계산한 값
    var cfi = has('cfi') ? val('cfi') : cfiC, tli = has('tli') ? val('tli') : tliC;
    var rm = has('rmsea') ? val('rmsea') : rc, srmr = val('srmr');
    var rlo = has('rlo') && has('rhi') ? val('rlo') : lo, rhi = has('rlo') && has('rhi') ? val('rhi') : hi;
    if (has('rmsea')) {
      var r1 = rmseaOf(chi, df, N - 1), r2 = rmseaOf(chi, df, N);
      var d1 = Math.abs(rm - r1), d2 = Math.abs(rm - r2);
      if (Math.min(d1, d2) > 0.0015) warns.push('입력한 RMSEA(' + f3(rm) + ')가 χ², 자유도, 표본 수로 다시 계산한 값(분모 N − 1: ' + f3(r1) + ', 분모 N: ' + f3(r2) + ')과 다릅니다. 보정된(robust) χ²를 쓰는 추정(MLR, WLSMV 등)이거나 값을 옮겨 적다 틀렸을 수 있습니다. 판정은 입력한 값으로 했습니다.');
      else if (d1 > 0.0006 && d2 <= 0.0006 && conv === 'n1') warns.push('입력한 RMSEA는 분모를 N으로 쓴 값과 맞습니다. 위의 분모 선택을 N으로 바꾸면 신뢰구간도 같은 방식으로 계산됩니다.');
      else if (d2 > 0.0006 && d1 <= 0.0006 && conv === 'n') warns.push('입력한 RMSEA는 분모를 N − 1로 쓴 값과 맞습니다. 위의 분모 선택을 N − 1로 바꾸면 신뢰구간도 같은 방식으로 계산됩니다.');
    }
    if (useB) {
      if (has('cfi') && Math.abs(val('cfi') - cfiC) > 0.0015) warns.push('입력한 CFI(' + f3(val('cfi')) + ')가 기저모형 값으로 계산한 CFI(' + f3(cfiC) + ')와 다릅니다. 기저모형 χ²와 자유도를 다시 확인하세요.');
      if (has('tli') && Math.abs(val('tli') - tliC) > 0.0015) warns.push('입력한 TLI(' + f3(val('tli')) + ')가 기저모형 값으로 계산한 TLI(' + f3(tliC) + ')와 다릅니다.');
    }
    if (has('rlo') !== has('rhi')) warns.push('RMSEA 신뢰구간은 하한과 상한을 함께 넣어야 씁니다. 지금은 다시 계산한 구간을 썼습니다.');
    else if (has('rlo') && (rm < rlo - 0.0005 || rm > rhi + 0.0005)) warns.push('RMSEA가 입력한 90% 신뢰구간 밖에 있습니다. 옮겨 적은 값을 확인하세요.');
    if (chi < df) warns.push('χ²가 자유도보다 작아 RMSEA는 0이고 CFI는 1입니다. TLI는 1을 넘을 수 있으며, 넘으면 그대로 보고합니다.');
    if (rhi > 0.08 && rm <= 0.08) warns.push('RMSEA 점추정치는 .08 이하지만 90% 신뢰구간 상한(' + f3(rhi) + ')이 .08을 넘습니다. 표본이 작거나 자유도가 작으면 RMSEA의 불확실성이 큽니다.');

    // 판정표: 고른 기준 묶음. 기준에서 .005 안쪽으로 못 미치면 "근접"
    var set = $('critset').value, conv2 = set === 'conv';
    var rows = [], met = [], near = [], unmet = [];
    var LBL = { met: '<span class="ok">기준 충족</span>', near: '<span class="near">기준에 근접</span>', unmet: '<span class="no">기준 미충족</span>' };
    rows.push(['χ²', S.fmt(chi, 2) + '<br><i>p</i> ' + S.fmtP(p), '<i>p</i> ≥ .05이면 자료와 모형의 차이가 유의하지 않음', p >= 0.05 ? '유의하지 않음' : '유의함', 'chi']);
    rows.push(['χ²/<i>df</i>', S.fmt(chi / df, 2), '문헌마다 2, 3, 5로 다름', '판정하지 않음', 'ratio']);
    var judge = function (name, v, cut, high, crit, src) {
      if (!isFinite(v)) return;
      var gap = high ? cut - v : v - cut, st = gap <= 1e-12 ? 'met' : gap <= 0.005 + 1e-12 ? 'near' : 'unmet';
      rows.push([name, f3(v), crit + '<br>(' + src + ')', LBL[st], name]);
      ({ met: met, near: near, unmet: unmet })[st].push(name);
    };
    var HB = 'Hu &amp; Bentler, 1999';
    if (!conv2) {
      judge('CFI', cfi, 0.95, true, '.95 근처 이상', HB);
      judge('TLI', tli, 0.95, true, '.95 근처 이상', HB);
      judge('RMSEA', rm, 0.06, false, '.06 근처 이하', HB);
    } else {
      judge('CFI', cfi, 0.90, true, '.90 이상 (관례)', 'Bentler &amp; Bonett, 1980');
      judge('TLI', tli, 0.90, true, '.90 이상 (관례)', 'Bentler &amp; Bonett, 1980');
      judge('RMSEA', rm, 0.08, false, '.08 이하 괜찮은 적합', 'Browne &amp; Cudeck, 1993');
    }
    var bc = rm <= 0.05 + 1e-12 ? 'good' : rm <= 0.08 + 1e-12 ? 'fair' : 'out';
    if (!conv2) rows.push(['RMSEA', f3(rm) + '<br>[' + f3(rlo) + ', ' + f3(rhi) + ']', '.05 이하 좋은 적합, .08 이하 괜찮은 적합<br>(Browne &amp; Cudeck, 1993)', bc === 'good' ? '<span class="ok">좋은 적합</span>' : bc === 'fair' ? '<span class="ok">괜찮은 적합</span>' : '<span class="no">.08 초과</span>', 'RMSEA-bc']);
    judge('SRMR', srmr, 0.08, false, '.08 근처 이하', HB);
    $('crit').querySelector('tbody').innerHTML = rows.map(function (r) { return '<tr data-index="' + r[4] + '"><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td class="judge">' + r[3] + '</td></tr>'; }).join('');

    // 문장
    var parts = ['χ<sup>2</sup>(' + df + ', <i>N</i> = ' + N + ') = ' + S.fmt(chi, 2) + ', <i>p</i> ' + S.fmtP(p)];
    if (isFinite(cfi)) parts.push('CFI = ' + f3(cfi));
    if (isFinite(tli)) parts.push('TLI = ' + f3(tli));
    parts.push('RMSEA = ' + f3(rm) + ', 90% CI [' + f3(rlo) + ', ' + f3(rhi) + ']');
    if (isFinite(srmr)) parts.push('SRMR = ' + f3(srmr));
    var label = $('label').value;
    var inc = isFinite(cfi) || isFinite(tli) ? (isFinite(cfi) && isFinite(tli) ? 'CFI·TLI' : isFinite(cfi) ? 'CFI' : 'TLI') : '';
    var body = parts.join(', '), digits = body.replace(/<[^>]+>/g, '').match(/\d(?=\D*$)/);
    var s = label + '의 적합도는 ' + body + (S.josa(digits ? digits[0] : '0', '이었다', '였다').slice(1)) + '. ';
    var crit = [];
    if (!conv2) {
      if (inc) crit.push(inc + ' .95 이상');
      crit.push('RMSEA .06 이하');
      if (isFinite(srmr)) crit.push('SRMR .08 이하');
      s += 'Hu와 Bentler(1999)가 권고한 기준(' + crit.join(', ') + ')에 비추어 ';
    } else {
      if (inc) crit.push(inc + ' .90 이상(Bentler &amp; Bonett, 1980)');
      crit.push('RMSEA .08 이하(Browne &amp; Cudeck, 1993)');
      if (isFinite(srmr)) crit.push('SRMR .08 이하(Hu &amp; Bentler, 1999)');
      s += '관례적으로 쓰이는 기준(' + crit.join(', ') + ')에 비추어 ';
    }
    var total = met.length + near.length + unmet.length;
    var subj = function (arr) { return arr.length === 1 ? arr[0] + LAST[arr[0]] : listJosa(arr); };
    if (met.length === total) s += (total > 1 ? '모든 지수가' : met[0] + (LAST[met[0]] === '은' ? '이' : '가')) + ' 기준을 충족하였다. ';
    else if (unmet.length === total) s += subj(unmet) + (total > 1 ? ' 모두' : '') + ' 기준에 미치지 못하였다. ';
    else if (near.length === total) s += subj(near) + (total > 1 ? ' 모두' : '') + ' 기준에 근접하였다. ';
    else {
      var cl = [];
      if (met.length) cl.push(subj(met) + ' 기준을 충족하');
      if (near.length) cl.push(subj(near) + ' 기준에 근접하');
      if (unmet.length) cl.push(subj(unmet) + ' 기준에 미치지 못하');
      s += cl.join('였고 ') + '였다. ';
    }
    if (!conv2) s += 'RMSEA는 Browne과 Cudeck(1993)의 기준으로 ' + (bc === 'good' ? '좋은 적합(.05 이하)에 해당하였다.' : bc === 'fair' ? '괜찮은 적합(.08 이하)에 해당하였다.' : '괜찮은 적합의 기준(.08 이하)을 넘었다.');
    if (p < 0.05) s += ' χ<sup>2</sup> 검정은 유의하여 모형이 자료를 정확히 재현한다는 가설은 기각되었다.';
    s = s.replace(/\s+$/, '');
    $('sentence').innerHTML = s;
    $('sentence').setAttribute('data-met', met.join(',')); $('sentence').setAttribute('data-near', near.join(',')); $('sentence').setAttribute('data-unmet', unmet.join(','));
    $('warns').innerHTML = warns.map(function (w) { return '<p>' + w + '</p>'; }).join('');
    S.live('적합도 판정표를 만들었습니다.');
    if (auto !== true) S.reveal();
  }

  $('run').addEventListener('click', function () { run(false); });
  S.auto('form', function () { run(true); }, 500);
  $('reset').addEventListener('click', function () { S.resetForm('form'); $('err').textContent = ''; S.show(false); });
  $('example').addEventListener('click', function () {
    S.resetForm('form');
    var ex = { chi: 168.52, df: 84, n: 300, cfi: 0.953, tli: 0.941, rmsea: 0.058, rlo: 0.045, rhi: 0.071, srmr: 0.047 };
    Object.keys(ex).forEach(function (k) { $(k).value = ex[k]; });
    run();
  });
  S.bindCopy();
})();
