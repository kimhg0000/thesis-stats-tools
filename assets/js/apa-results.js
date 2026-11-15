(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = $(id).value; return v === '' ? NaN : Number(v); };
  var txt = function (id, dflt) { var v = $(id).value.trim(); return v || dflt; };
  var I = function (s) { return '<i>' + s + '</i>'; };

  // 받침 유무로 조사 고르기 (한글이 아니면 앞 형태를 괄호로 함께 씀)
  function josa(word, withB, withoutB) {
    var c = word.charCodeAt(word.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) return word + ((c - 0xAC00) % 28 ? withB : withoutB);
    return word + withoutB + '(' + withB + ')';
  }
  function dfText(df) { return Math.round(df) === df ? String(df) : S.fmt(df, 2); }
  function sigWord(p) { return p < 0.05 ? '통계적으로 유의하였다' : '통계적으로 유의하지 않았다'; }

  function showType() {
    var t = $('type').value;
    document.querySelectorAll('[data-for]').forEach(function (el) { el.hidden = el.getAttribute('data-for') !== t; });
  }

  function run(auto) {
    $('err').textContent = '';
    var box = document.querySelector('[data-for="' + $('type').value + '"]');
    var anyFilled = Array.prototype.some.call(box.querySelectorAll('input[type=number]'), function (el) { return el.value !== ''; });
    var fail = function (m) { S.show(false); $('err').textContent = (auto === true && /채우세요/.test(m)) ? '' : m; };
    if (auto === true && !anyFilled) { S.show(false); return; }
    var type = $('type').value, p, apa, sent, head = '', note = '', warns = [];
    var E = S.esc;

    if (type === 't') {
      var t = val('t_t'), df = val('t_df'), d = val('t_d');
      if (!isFinite(t) || !isFinite(df) || df <= 0) return fail('t와 자유도를 채우세요.');
      p = S.tP2(t, df);
      var paired = $('t_kind').value === 'paired';
      var dSym = paired ? '<i>d<sub>z</sub></i>' : I('d');
      apa = I('t') + '(' + dfText(df) + ') = ' + S.fmt(t, 2) + ', ' + I('p') + ' ' + S.fmtP(p) + (isFinite(d) ? ', ' + dSym + ' = ' + S.fmt(d, 2) : '');
      var g1 = txt('t_g1', ''), g2 = txt('t_g2', ''), dv = txt('t_dv', '');
      var m1 = val('t_m1'), s1 = val('t_s1'), m2 = val('t_m2'), s2 = val('t_s2');
      var hasG = g1 && g2 && [m1, s1, m2, s2].every(isFinite);
      if (hasG) {
        sent = (dv ? E(dv) + '에서 ' : '') + E(g1) + '(' + I('M') + ' = ' + S.fmt(m1, 2) + ', ' + I('SD') + ' = ' + S.fmt(s1, 2) + ')' +
          josa(E(g1), '과', '와').slice(E(g1).length) + ' ' + E(g2) + '(' + I('M') + ' = ' + S.fmt(m2, 2) + ', ' + I('SD') + ' = ' + S.fmt(s2, 2) + ')의 차이는 ' + sigWord(p) + '(' + apa + ').';
        if (p < 0.05) sent += ' ' + E(m1 > m2 ? g1 : g2) + '의 평균이 더 높았다.';
        if ((m1 - m2) * t < 0) warns.push('t의 부호와 두 평균의 차이 방향이 서로 맞지 않습니다. 집단 1과 2를 바꿔 넣었거나 출력의 다른 줄을 옮겼는지 확인하세요.');
      } else {
        sent = (dv ? '두 집단 간 ' + E(dv) + '의 차이는 ' : '두 평균의 차이는 ') + sigWord(p) + '(' + apa + ').';
      }
      if (!isFinite(d)) warns.push('APA 7판은 효과크기 보고를 권합니다. 효과크기 계산기에서 d를 구해 넣을 수 있습니다.');
      if (Math.round(df) !== df) note = '소수 자유도는 Welch 검정 결과로 보고, 연구방법이나 표 주석에 "등분산을 가정하지 않은 Welch의 t검정"이라고 밝힙니다.';
      head = '<thead><tr><th>집단</th><th>' + I('n') + '</th><th>' + I('M') + '</th><th>' + I('SD') + '</th><th>' + I('t') + '(' + dfText(df) + ')</th><th>' + I('p') + '</th><th>' + dSym + '</th></tr></thead>' +
        '<tbody><tr><td>' + (hasG ? E(g1) : '집단 1') + '</td><td>' + (isFinite(val('t_n1')) ? val('t_n1') : '') + '</td><td>' + (hasG ? S.fmt(m1, 2) : '') + '</td><td>' + (hasG ? S.fmt(s1, 2) : '') + '</td><td>' + S.fmt(t, 2) + '</td><td>' + S.fmtP(p).replace('= ', '') + '</td><td>' + (isFinite(d) ? S.fmt(d, 2) : '') + '</td></tr>' +
        '<tr><td>' + (hasG ? E(g2) : '집단 2') + '</td><td>' + (isFinite(val('t_n2')) ? val('t_n2') : '') + '</td><td>' + (hasG ? S.fmt(m2, 2) : '') + '</td><td>' + (hasG ? S.fmt(s2, 2) : '') + '</td><td></td><td></td><td></td></tr></tbody>';
    }

    if (type === 'F') {
      var F = val('F_F'), a = val('F_df1'), b = val('F_df2'), eta = val('F_eta');
      if (![F, a, b].every(isFinite) || F < 0 || a <= 0 || b <= 0) return fail('F와 두 자유도를 채우세요.');
      p = S.fSf(F, a, b);
      if (!isFinite(eta)) eta = F * a / (F * a + b);
      apa = I('F') + '(' + dfText(a) + ', ' + dfText(b) + ') = ' + S.fmt(F, 2) + ', ' + I('p') + ' ' + S.fmtP(p) + ', η²<sub>' + I('p') + '</sub> = ' + S.fmt0(eta, 2);
      var iv = txt('F_iv', ''), fdv = txt('F_dv', '');
      sent = (iv ? E(iv) + '에 따른 ' : '집단 간 ') + (fdv ? E(fdv) + '의 ' : '평균의 ') + '차이는 ' + sigWord(p) + '(' + apa + ').';
      if (p < 0.05 && a > 1) warns.push('일원분산분석에서 집단이 셋 이상이면 어느 집단 사이에 차이가 있는지 사후검정(Tukey HSD, 등분산이 아니면 Games-Howell 등) 결과를 함께 씁니다.');
      head = '<thead><tr><th>집단</th><th>' + I('n') + '</th><th>' + I('M') + '</th><th>' + I('SD') + '</th><th>' + I('F') + '(' + dfText(a) + ', ' + dfText(b) + ')</th><th>' + I('p') + '</th><th>η²<sub>' + I('p') + '</sub></th><th>사후검정</th></tr></thead>' +
        '<tbody><tr><td>집단 1</td><td></td><td></td><td></td><td>' + S.fmt(F, 2) + '</td><td>' + S.fmtP(p).replace('= ', '') + '</td><td>' + S.fmt0(eta, 2) + '</td><td></td></tr></tbody>';
    }

    if (type === 'r') {
      var r = val('r_r'), n = val('r_n');
      if (!isFinite(r) || !isFinite(n) || Math.abs(r) > 1 || n < 3) return fail('r은 −1과 1 사이, N은 3 이상이어야 합니다.');
      p = S.corrP(r, n);
      apa = I('r') + '(' + (n - 2) + ') = ' + S.fmt0(r, 2) + ', ' + I('p') + ' ' + S.fmtP(p);
      var va = txt('r_a', '변수 1'), vb = txt('r_b', '변수 2');
      sent = josa(E(va), '과', '와') + ' ' + josa(E(vb), '은', '는') + ' ' + (p < 0.05 ? '통계적으로 유의한 ' + (r > 0 ? '정적' : '부적') + ' 상관을 보였다' : '통계적으로 유의한 상관을 보이지 않았다') + '(' + apa + ').';
      note = '여러 변수의 상관은 문장보다 상관표로 보여 주는 편이 읽기 쉽습니다. 상관행렬 APA 표 만들기 도구를 쓰세요.';
      head = '<thead><tr><th>변수</th><th>' + I('M') + '</th><th>' + I('SD') + '</th><th>1</th></tr></thead><tbody><tr><td>1. ' + E(va) + '</td><td></td><td></td><td>–</td></tr><tr><td>2. ' + E(vb) + '</td><td></td><td></td><td>' + S.fmt0(r, 2) + (p < 0.01 ? '**' : p < 0.05 ? '*' : '') + '</td></tr></tbody>';
    }

    if (type === 'chi') {
      var x = val('c_x'), cdf = val('c_df'), N = val('c_n'), k = val('c_k');
      if (![x, cdf, N].every(isFinite) || x < 0 || cdf < 1 || N < 1) return fail('χ², 자유도, N을 채우세요.');
      p = S.chi2Sf(x, cdf);
      var V = isFinite(k) && k >= 2 ? Math.sqrt(x / (N * (k - 1))) : NaN;
      apa = 'χ²(' + cdf + ', ' + I('N') + ' = ' + N + ') = ' + S.fmt(x, 2) + ', ' + I('p') + ' ' + S.fmtP(p) + (isFinite(V) ? ', Cramér\'s ' + I('V') + ' = ' + S.fmt0(V, 2) : '');
      var ca = txt('c_a', '두 변수'), cb = txt('c_b', '');
      sent = (cb ? josa(E(ca), '과', '와') + ' ' + E(cb) + '의 관련성은 ' : '두 범주형 변수의 관련성은 ') + sigWord(p) + '(' + apa + ').';
      warns.push('기대빈도가 5 미만인 칸이 전체의 20%를 넘거나 1 미만인 칸이 있으면 χ² 근사가 부정확해집니다(Cochran, 1954). 이때는 정확검정(2×2 표는 Fisher의 정확검정, 그보다 큰 표는 Fisher-Freeman-Halton 검정)을 고려하세요.');
      head = '<thead><tr><th>' + E(ca) + '</th><th>범주 A</th><th>범주 B</th><th>전체</th></tr></thead><tbody><tr><td>범주 1</td><td><i>n</i> (%)</td><td><i>n</i> (%)</td><td></td></tr><tr><td>범주 2</td><td></td><td></td><td></td></tr></tbody>';
      note = '교차표 각 칸에는 빈도와 행(또는 열) 백분율을 함께 적고, 어느 쪽 백분율인지 표 주석에 밝힙니다.';
    }

    if (type === 'reg') {
      var B = val('g_B'), SE = val('g_SE'), beta = val('g_beta'), gdf = val('g_df');
      if (![B, SE, gdf].every(isFinite) || SE <= 0 || gdf < 1) return fail('B, SE, 잔차 자유도를 채우세요.');
      var tv = B / SE;
      p = S.tP2(tv, gdf);
      apa = I('B') + ' = ' + S.fmt(B, 2) + ', ' + I('SE') + ' = ' + S.fmt(SE, 2) + (isFinite(beta) ? ', β = ' + S.fmt0(beta, 2) : '') + ', ' + I('t') + '(' + gdf + ') = ' + S.fmt(tv, 2) + ', ' + I('p') + ' ' + S.fmtP(p);
      var gx = txt('g_x', '예측변수'), gy = txt('g_y', '종속변수');
      sent = josa(E(gx), '은', '는') + ' ' + (p < 0.05 ? josa(E(gy), '을', '를') + ' 통계적으로 유의하게 ' + (B > 0 ? '정적으로' : '부적으로') + ' 예측하였다' : E(gy) + '에 대해 통계적으로 유의한 예측변수가 아니었다') + '(' + apa + ').';
      warns.push('t = B / SE 로 다시 계산했습니다. 출력의 t와 소수 둘째 자리에서 다르면 B와 SE의 반올림 때문일 수 있습니다.');
      head = '<thead><tr><th>변수</th><th>' + I('B') + '</th><th>' + I('SE') + '</th><th>β</th><th>' + I('t') + '</th><th>' + I('p') + '</th></tr></thead><tbody><tr><td>(상수)</td><td></td><td></td><td></td><td></td><td></td></tr><tr><td>' + E(gx) + '</td><td>' + S.fmt(B, 2) + '</td><td>' + S.fmt(SE, 2) + '</td><td>' + (isFinite(beta) ? S.fmt0(beta, 2) : '') + '</td><td>' + S.fmt(tv, 2) + '</td><td>' + S.fmtP(p).replace('= ', '') + '</td></tr></tbody>';
      note = '표 아래에 <i>R</i>², 수정된 <i>R</i>², <i>F</i>(<i>df</i>₁, <i>df</i>₂)를 함께 적습니다.';
    }

    S.show(true);
    $('apa').innerHTML = apa;
    S.live('결과 문장을 만들었습니다.');
    $('apa').setAttribute('data-p', p);
    $('sentence').innerHTML = sent;
    $('thead').innerHTML = head;
    $('tnote').innerHTML = note;
    $('warns').innerHTML = warns.map(function (w) { return '<p style="margin:0 0 6px">' + S.esc(w) + '</p>'; }).join('');
  }

  $('type').addEventListener('change', function () { showType(); run(true); });
  $('run').addEventListener('click', function () { run(false); });
  var t;
  $('form').querySelectorAll('input').forEach(function (el) { el.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { run(true); }, 450); }); });
  $('t_kind').addEventListener('change', function () { run(true); });
  $('example').addEventListener('click', function () {
    $('type').value = 't'; showType(); $('t_kind').value = 'ind';
    var ex = { t_t: 2.45, t_df: 58, t_d: 0.63, t_g1: '프로그램 참여 집단', t_m1: 3.62, t_s1: 0.71, t_n1: 30, t_g2: '비참여 집단', t_m2: 3.18, t_s2: 0.68, t_n2: 30, t_dv: '학습몰입' };
    Object.keys(ex).forEach(function (k) { $(k).value = ex[k]; });
    run(false);
  });
  $('reset').addEventListener('click', function () { S.resetForm('form'); showType(); $('err').textContent = ''; S.show(false); });
  showType();
  S.bindCopy();
})();
