(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var get = function (name) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; };
  var Q = function (name) { return document.querySelector('[data-q="' + name + '"]'); };
  var T = '../'; // 도구 경로 기준

  function visible() {
    var goal = get('goal'), dv = get('dv');
    var show = { dv: !!goal, groups: false, design: false, xtype: false, normal: false };
    if (goal === 'diff') { show.groups = !!dv; show.design = !!dv; show.normal = dv === 'cont'; }
    if (goal === 'rel') { show.xtype = !!dv; show.normal = dv === 'cont' && get('xtype') === 'cont'; }
    var dvLabel = document.getElementById('dvLabel');
    if (dvLabel) dvLabel.textContent = goal === 'rel' ? '두 변수 중 한쪽(결과로 보는 쪽)은 어떤 값인가요?' : '결과(종속)변수는 어떤 값인가요?';
    Object.keys(show).forEach(function (k) { Q(k).hidden = !show[k]; });
    return show;
  }

  function decide() {
    var goal = get('goal'), dv = get('dv'), g = get('groups'), des = get('design'), x = get('xtype'), nonnorm = get('normal') === 'yes';
    var r = null;
    if (goal === 'diff') {
      if (!dv || !g || !des || (dv === 'cont' && !get('normal'))) return null;
      var rank = dv === 'ord' || nonnorm;
      if (dv === 'cont' || dv === 'ord') {
        if (g === '2' && des === 'ind') r = rank
          ? ['Mann-Whitney U 검정', '두 독립집단의 값을 순위로 바꿔, 한 집단의 값이 다른 집단보다 큰 경향이 있는지 검정합니다. 정규성을 가정하지 않습니다. 두 분포의 모양이 비슷할 때에만 중앙값 차이로 해석할 수 있습니다.', '분포 문제가 심하지 않고 집단별 사례가 충분하면 독립표본 t검정도 결과가 크게 다르지 않습니다. 두 결과를 함께 보고하는 연구도 있습니다.', '중앙값과 사분위범위, <i>U</i>, <i>z</i>, <i>p</i>, 효과크기 <i>r</i> = <i>z</i>/√<i>N</i>을 씁니다.']
          : ['독립표본 t검정', '서로 다른 두 집단의 평균을 비교합니다. 두 집단의 분산이 다를 수 있으면 등분산을 가정하지 않는 Welch의 t검정을 기본으로 쓰는 편이 안전합니다(Welch, 1947).', '정규성이 크게 깨지면 Mann-Whitney U 검정을 씁니다.', '집단별 <i>M</i>, <i>SD</i>, <i>t</i>(<i>df</i>), <i>p</i>, Cohen\'s <i>d</i>를 씁니다.', 'apa-results', 'effect-size'];
        if (g === '2' && des === 'rep') r = rank
          ? ['Wilcoxon 부호순위 검정', '같은 사람의 두 측정값 차이를 순위로 검정합니다. 차이 점수의 정규성을 가정하지 않습니다.', '차이 점수가 대체로 대칭이면 대응표본 t검정도 쓸 수 있습니다.', '중앙값, <i>z</i>, <i>p</i>, 효과크기 <i>r</i>을 씁니다.']
          : ['대응표본 t검정', '같은 사람의 사전·사후처럼 짝지은 두 측정값의 평균 차이를 검정합니다. 가정은 차이 점수의 정규성입니다.', '차이 점수가 심하게 치우치면 Wilcoxon 부호순위 검정을 씁니다.', '시점별 <i>M</i>, <i>SD</i>, <i>t</i>(<i>df</i>), <i>p</i>, <i>d<sub>z</sub></i>를 씁니다.', 'apa-results', 'effect-size'];
        if (g === '3' && des === 'ind') r = rank
          ? ['Kruskal-Wallis 검정', '셋 이상의 독립집단을 순위로 비교합니다. 유의하면 Dunn 검정처럼 다중비교를 보정한 사후검정을 합니다.', '분포 문제가 심하지 않으면 일원분산분석(등분산이 아니면 Welch의 분산분석)을 씁니다.', '집단별 중앙값, <i>H</i>(<i>df</i>), <i>p</i>, 사후검정 결과를 씁니다.']
          : ['일원분산분석 (one-way ANOVA)', '셋 이상의 독립집단 평균을 한 번에 비교합니다. t검정을 여러 번 하면 1종 오류가 늘어나기 때문입니다. 유의하면 Tukey HSD(등분산이 아니면 Games-Howell) 같은 사후검정으로 어느 집단 사이에 차이가 있는지 봅니다.', '정규성이 크게 깨지면 Kruskal-Wallis 검정, 등분산이 깨지면 Welch의 분산분석을 씁니다.', '집단별 <i>M</i>, <i>SD</i>, <i>F</i>(<i>df</i>₁, <i>df</i>₂), <i>p</i>, η², 사후검정 결과를 씁니다.', 'apa-results', 'effect-size'];
        if (g === '3' && des === 'rep') r = rank
          ? ['Friedman 검정', '같은 사람을 세 번 이상 측정한 값을 순위로 비교합니다.', '분포 문제가 심하지 않으면 반복측정 분산분석을 씁니다.', 'χ²(<i>df</i>), <i>p</i>, Kendall의 <i>W</i>, 사후검정(Wilcoxon 검정에 다중비교 보정)을 씁니다.']
          : ['반복측정 분산분석', '같은 사람을 세 번 이상 측정한 평균을 비교합니다. 구형성 가정이 깨지는 경우가 많아, Mauchly 검정 결과와 상관없이 Greenhouse-Geisser 보정값을 함께 보고하는 방식이 무난합니다.', '정규성이 크게 깨지면 Friedman 검정을 씁니다. 결측이 많으면 혼합모형도 검토합니다.', '시점별 <i>M</i>, <i>SD</i>, <i>F</i>, <i>p</i>, η²<sub><i>p</i></sub>, 구형성 보정 여부를 씁니다.', 'apa-results', 'effect-size'];
      } else {
        if (des === 'ind') r = ['카이제곱(χ²) 독립성 검정', '집단(범주)에 따라 범주형 결과의 비율이 다른지 교차표로 검정합니다.', '기대빈도가 5 미만인 칸이 20%를 넘거나 1 미만인 칸이 있으면(Cochran, 1954) 정확검정(2×2 표는 Fisher의 정확검정, 더 큰 표는 Fisher-Freeman-Halton 검정)을 씁니다.', '교차표(빈도와 백분율), χ²(<i>df</i>, <i>N</i>), <i>p</i>, Cramér\'s <i>V</i>를 씁니다.', 'apa-results'];
        else if (dv === 'bin' && g === '2') r = ['McNemar 검정', '같은 사람의 두 시점(또는 짝지은 두 측정)에서 예/아니오 비율이 달라졌는지 검정합니다. 일반 χ² 검정은 독립 표본을 가정하므로 쓰지 않습니다.', '사례가 적으면 McNemar 정확검정(이항검정)을 씁니다.', '2×2 교차표, χ² 또는 정확 <i>p</i>를 씁니다.'];
        else if (dv === 'bin') r = ['Cochran의 Q 검정', '같은 사람을 세 번 이상 측정한 이분 결과의 비율이 같은지 검정합니다.', '공변량을 함께 다루려면 일반화추정방정식(GEE)이나 혼합 로지스틱 모형을 검토합니다.', '시점별 비율, <i>Q</i>(<i>df</i>), <i>p</i>를 씁니다.'];
        else r = ['McNemar-Bowker 검정 또는 모형 기반 분석', '같은 사람의 두 시점에서 세 범주 이상 결과의 분포가 달라졌는지는 McNemar-Bowker 대칭성 검정으로 봅니다. 세 시점 이상이면 일반화추정방정식(GEE) 같은 모형이 필요합니다.', '범주를 둘로 묶을 수 있다면 McNemar 검정을 쓸 수 있습니다.', '시점별 교차표와 검정 결과를 씁니다.'];
      }
    }
    if (goal === 'rel') {
      if (!dv || !x || (dv === 'cont' && x === 'cont' && !get('normal'))) return null;
      if ((dv === 'cont' || dv === 'ord') && (x === 'cont' || x === 'ord')) r = (dv === 'ord' || x === 'ord' || nonnorm)
        ? ['Spearman 순위상관', '두 변수의 순위가 함께 움직이는지 봅니다. 순서형 변수나 이상값이 많은 자료에 맞습니다.', '두 변수가 연속형이고 분포가 크게 치우치지 않으면 Pearson 상관을 씁니다.', '<i>r<sub>s</sub></i>(<i>df</i>), <i>p</i>를 씁니다.']
        : ['Pearson 상관분석', '두 연속형 변수의 선형 관계의 방향과 크기를 봅니다. 산점도로 관계가 직선에 가까운지, 이상값이 결과를 끌고 가지 않는지 먼저 확인합니다.', '관계가 곡선이거나 이상값이 많으면 Spearman 순위상관을 씁니다.', '변수가 여럿이면 <i>M</i>, <i>SD</i>와 상관계수를 한 표에 담습니다.', 'correlation-table', 'apa-results'];
      else if (dv === 'ord' && x === 'cat') r = ['Mann-Whitney U 검정 또는 Kruskal-Wallis 검정', '한쪽이 범주형이면 "관계"는 곧 집단 간 차이입니다. 결과가 순서형이므로 범주가 둘이면 Mann-Whitney U 검정, 셋 이상이면 Kruskal-Wallis 검정으로 순위를 비교합니다.', '범주형 결과로 묶어도 된다면 카이제곱 검정을 쓸 수 있지만 순서 정보가 사라집니다.', '집단별 중앙값과 검정통계량, <i>p</i>를 씁니다.'];
      else if (dv === 'cont' && x === 'cat') r = ['집단 차이 검정 (t검정 또는 분산분석)', '한쪽이 범주형이면 "관계"는 곧 집단 간 차이입니다. 범주가 둘이면 독립표본 t검정, 셋 이상이면 일원분산분석을 씁니다. 1번 질문에서 "차이"를 골라 다시 확인해 보세요.', '두 범주와 연속형 변수의 관계를 상관으로 나타내려면 점이연 상관을 씁니다. 값은 독립표본 t검정과 같은 정보를 줍니다.', '', 'apa-results'];
      else if ((dv === 'bin' || dv === 'cat') && x === 'cat') r = ['카이제곱(χ²) 독립성 검정', '두 범주형 변수가 서로 관련되어 있는지 교차표로 검정합니다.', '기대빈도가 5 미만인 칸이 20%를 넘거나 1 미만인 칸이 있으면(Cochran, 1954) 정확검정(2×2 표는 Fisher의 정확검정, 더 큰 표는 Fisher-Freeman-Halton 검정)을 씁니다.', '교차표, χ²(<i>df</i>, <i>N</i>), <i>p</i>, Cramér\'s <i>V</i>를 씁니다.', 'apa-results'];
      else r = [dv === 'bin' ? '로지스틱 회귀분석 (또는 점이연 상관)' : '다항 로지스틱 회귀분석', '결과가 범주형이고 설명하는 변수가 연속형·순서형이면, 그 변수 값에 따라 각 범주에 속할 확률이 어떻게 달라지는지를 로지스틱 회귀로 봅니다.', dv === 'bin' ? '단순히 관련의 크기만 보려면 점이연 상관을 쓸 수도 있습니다.' : '범주를 둘로 묶을 수 있으면 이항 로지스틱 회귀를 씁니다.', '승산비(<i>OR</i>)와 95% 신뢰구간, <i>p</i>를 씁니다.'];
    }
    if (goal === 'pred') {
      if (!dv) return null;
      if (dv === 'cont') r = ['다중회귀분석', '여러 예측변수가 연속형 결과 변수를 얼마나 설명하는지(<i>R</i>²), 다른 변수를 통제했을 때 각 변수의 고유한 기여(<i>B</i>, β)가 있는지 봅니다. 예측변수가 하나면 단순회귀입니다. 범주형 예측변수는 더미변수로 바꿔 넣습니다.', '잔차가 크게 치우치거나 이상값이 많으면 변환이나 강건 회귀를 검토합니다. 예측변수끼리 상관이 높으면 VIF로 다중공선성을 확인합니다.', '<i>B</i>, <i>SE</i>, β, <i>t</i>, <i>p</i>와 <i>R</i>², 수정된 <i>R</i>², <i>F</i>를 표로 씁니다.', 'apa-results', 'sample-size'];
      if (dv === 'ord') r = ['순서형 로지스틱 회귀분석', '결과가 순서가 있는 범주(예: 낮음·보통·높음)일 때 씁니다. 비례 승산 가정을 확인합니다.', '범주가 5개 이상이고 간격이 비슷하다고 볼 수 있으면 다중회귀를 쓰는 연구도 있으나, 그 근거를 밝혀야 합니다.', '승산비(<i>OR</i>)와 95% 신뢰구간을 씁니다.'];
      if (dv === 'bin') r = ['이항 로지스틱 회귀분석', '예/아니오 같은 두 범주 결과가 일어날 확률을 여러 예측변수로 설명합니다. 일반 회귀분석은 예측값이 0과 1 범위를 벗어날 수 있어 맞지 않습니다.', '사건 수가 적으면 예측변수 수를 줄이거나 Firth 보정 로지스틱 회귀를 검토합니다.', '<i>B</i>, <i>SE</i>, Wald χ², <i>p</i>, 승산비(<i>OR</i>)와 95% 신뢰구간, 모형 적합도를 씁니다.', 'sample-size'];
      if (dv === 'cat') r = ['다항 로지스틱 회귀분석', '세 범주 이상의 결과(순서 없음)를 기준 범주와 비교하며 예측변수의 효과를 봅니다.', '범주를 둘로 묶을 수 있으면 이항 로지스틱 회귀가 해석이 쉽습니다.', '기준 범주를 밝히고, 범주별 승산비와 95% 신뢰구간을 씁니다.'];
    }
    return r;
  }

  var NAMES = { 'apa-results': 'APA 결과 문장 생성기', 'effect-size': '효과크기 계산기', 'correlation-table': '상관행렬 APA 표 만들기', 'sample-size': '표본 크기·검정력 계산기' };

  function update() {
    visible();
    var r = decide();
    $('result').hidden = !r;
    if (!r) return;
    $('method').textContent = r[0];
    $('why').innerHTML = r[1];
    $('alt').innerHTML = '대안: ' + r[2];
    $('report').innerHTML = r[3] ? '보고할 값: ' + r[3] : '';
    var links = r.slice(4).filter(Boolean).map(function (k) { return '<a href="' + T + k + '/">' + NAMES[k] + '</a>'; });
    $('links').innerHTML = links.length ? '이어서 쓸 도구: ' + links.join(', ') : '';
  }

  document.querySelectorAll('#form input[type=radio]').forEach(function (el) { el.addEventListener('change', update); });
  update();
})();
