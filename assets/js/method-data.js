/* 방법 선택 도우미가 보여 주는 방법별 안내. 기준값과 표본 크기 지침에는 출처를 단다. */
window.METHODS = {
  indt: {
    name: '독립표본 t검정 (Welch)', level: '기초',
    q: '서로 다른 두 집단의 평균이 다른가?',
    data: ['결과변수: 연속형(점수, 척도 평균), 두 집단은 서로 다른 사람', '표본 크기: 검정력 분석으로 정합니다. 중간 효과(d = 0.5), α = .05, 검정력 .80이면 집단별 64명입니다(Cohen, 1992).'],
    prog: 'SPSS, jamovi, R(t.test)',
    report: ['집단별 M, SD, n', 't(df), 정확한 p', 'Cohen\'s d와 95% 신뢰구간'],
    mistakes: ['등분산 검정 결과를 보고 검정을 고르는 절차보다, 처음부터 Welch 검정을 쓰는 편이 오류율이 안정적입니다.', '셋 이상의 집단을 t검정으로 여러 번 비교하면 1종 오류가 늘어납니다.', '척도 점수로 집단을 비교하면서 집단 간 측정동일성을 생각하지 않는 것(잠재변수 모형이라면 확인 가능)'],
    tools: ['apa-results', 'effect-size', 'sample-size', 'normality'], guides: ['t-test-report', 'effect-size-interpretation']
  },
  mwu: {
    name: 'Mann-Whitney U 검정', level: '기초',
    q: '두 독립 집단 중 한쪽 값이 더 큰 경향이 있는가? (순위 비교)',
    data: ['결과변수: 순서형이거나 심하게 치우친 연속형', '표본 크기: 집단이 아주 작으면 가장 극단적인 결과도 유의수준에 닿지 못합니다. 3명 대 3명이면 정확 양측 p의 최솟값이 .10입니다.'],
    prog: 'SPSS(비모수 검정), jamovi, R(wilcox.test)',
    report: ['집단별 중앙값과 사분위범위', 'U, z, p', '효과크기 r = z / √N'],
    mistakes: ['두 분포의 모양이 비슷하지 않은데 "중앙값이 다르다"고 해석하는 것', '표본이 작다는 이유만으로 고르는 것. 작은 표본의 문제는 검정력이며 순위 검정이 이를 해결하지는 않습니다.'],
    tools: ['apa-results'], guides: ['small-sample-analysis', 'normality-skew-kurtosis']
  },
  pairedt: {
    name: '대응표본 t검정', level: '기초',
    q: '같은 사람을 두 번 잰 평균이 달라졌는가?',
    data: ['같은 사람의 사전·사후처럼 짝지은 두 측정', '표본 크기: 차이 점수 기준 효과크기 dz = 0.5, α = .05, 검정력 .80이면 34쌍입니다(이 사이트의 표본 크기 계산기, G*Power와 같은 방식).'],
    prog: 'SPSS, jamovi, R(t.test, paired = TRUE)',
    report: ['시점별 M, SD', 't(df), 정확한 p', 'dz (차이 점수 기준임을 밝힘)'],
    mistakes: ['짝지은 자료에 독립표본 t검정을 쓰는 것', 'dz를 독립집단의 d 기준(0.2, 0.5, 0.8)으로 해석하는 것'],
    tools: ['apa-results', 'effect-size', 'sample-size'], guides: ['t-test-report']
  },
  wilcoxon: {
    name: 'Wilcoxon 부호순위 검정', level: '기초',
    q: '같은 사람의 두 측정 사이에 체계적인 변화가 있는가? (순위 비교)',
    data: ['짝지은 두 측정, 순서형이거나 차이 점수가 심하게 치우친 경우'],
    prog: 'SPSS(비모수 검정), jamovi, R(wilcox.test, paired = TRUE)',
    report: ['시점별 중앙값', 'z(또는 V), p', '효과크기 r'],
    mistakes: ['차이가 0인 사례 처리 방식을 밝히지 않는 것'],
    tools: ['apa-results'], guides: ['small-sample-analysis']
  },
  anova: {
    name: '일원분산분석 (one-way ANOVA)', level: '기초',
    q: '셋 이상의 독립 집단 평균이 모두 같은가?',
    data: ['결과변수: 연속형, 집단은 서로 다른 사람', '표본 크기: 효과크기 f = 0.25, 3집단, α = .05, 검정력 .80이면 집단별 53명(전체 159명)입니다(G*Power와 같은 방식). Cohen(1992)의 표에는 52명으로 나옵니다.'],
    prog: 'SPSS, jamovi, R(aov, oneway.test)',
    report: ['집단별 M, SD, n', 'F(df1, df2), p, η²', '사후검정(Tukey HSD, 등분산이 아니면 Games-Howell)'],
    mistakes: ['유의한 F만 보고하고 어느 집단 사이에 차이가 있는지 사후검정을 빠뜨리는 것', '등분산이 크게 깨졌는데 일반 F를 쓰는 것(Welch의 분산분석을 고려)'],
    tools: ['apa-results', 'effect-size', 'sample-size', 'normality', 'p-adjust'], guides: ['effect-size-interpretation', 'multiple-comparisons']
  },
  kw: {
    name: 'Kruskal-Wallis 검정', level: '기초',
    q: '셋 이상의 독립 집단에서 순위 분포가 다른가?',
    data: ['결과변수: 순서형이거나 심하게 치우친 연속형'],
    prog: 'SPSS(비모수 검정), jamovi, R(kruskal.test)',
    report: ['집단별 중앙값', 'H(df), p', '다중비교를 보정한 사후검정(예: Dunn 검정)'],
    mistakes: ['사후검정에서 다중비교 보정을 하지 않는 것'],
    tools: ['apa-results', 'p-adjust'], guides: ['small-sample-analysis']
  },
  rmanova: {
    name: '반복측정 분산분석', level: '기초',
    q: '같은 사람을 세 번 이상 잰 평균이 시점마다 다른가?',
    data: ['같은 사람의 세 시점 이상 측정, 결과변수 연속형', '결측이 많거나 시점 간격이 다르면 혼합모형(다층모형)을 검토합니다.'],
    prog: 'SPSS(일반선형모형 반복측정), jamovi, R(afex, ez)',
    report: ['시점별 M, SD', 'F, p, η²p', '구형성 보정 방식(Greenhouse-Geisser 등)'],
    mistakes: ['Mauchly 검정 결과에 따라 보정 여부를 바꾸는 것. 구형성이 깨지는 경우가 많아 보정값을 함께 보고하는 방식이 무난합니다.'],
    tools: ['apa-results', 'effect-size', 'p-adjust'], guides: []
  },
  friedman: {
    name: 'Friedman 검정', level: '기초',
    q: '같은 사람을 세 번 이상 잰 값의 순위가 시점마다 다른가?',
    data: ['세 시점 이상, 순서형이거나 심하게 치우친 연속형'],
    prog: 'SPSS(비모수 검정), jamovi, R(friedman.test)',
    report: ['시점별 중앙값', 'χ²(df), p, Kendall의 W', '사후검정(Wilcoxon 검정에 다중비교 보정)'],
    mistakes: ['사후검정 보정 누락'],
    tools: ['apa-results'], guides: ['small-sample-analysis']
  },
  chisq: {
    name: '카이제곱(χ²) 독립성 검정', level: '기초',
    q: '두 범주형 변수가 서로 관련되어 있는가? (집단에 따라 비율이 다른가?)',
    data: ['두 변수 모두 범주형, 서로 다른 사람', '기대빈도가 5 미만인 칸이 20%를 넘거나 1 미만인 칸이 있으면 정확검정을 씁니다(Cochran, 1954). 2×2 표는 Fisher의 정확검정, 더 큰 표는 Fisher-Freeman-Halton 검정입니다.'],
    prog: 'SPSS(교차분석), jamovi, R(chisq.test, fisher.test)',
    report: ['교차표(빈도와 백분율, 어느 쪽 백분율인지)', 'χ²(df, N), p', 'Cramér\'s V'],
    mistakes: ['같은 사람을 두 번 잰 자료에 쓰는 것(McNemar 검정이 맞음)'],
    tools: ['apa-results', 'chi-square'], guides: ['small-sample-analysis', 'chi-square-expected-counts']
  },
  mcnemar: {
    name: 'McNemar 검정', level: '기초',
    q: '같은 사람의 두 시점에서 예/아니오 비율이 달라졌는가?',
    data: ['같은 사람의 두 측정, 결과는 두 범주', '사례가 적으면 정확검정(이항검정)을 씁니다.'],
    prog: 'SPSS(교차분석, McNemar), jamovi, R(mcnemar.test)',
    report: ['2×2 교차표', 'χ² 또는 정확 p'],
    mistakes: ['일반 χ² 독립성 검정을 쓰는 것'],
    tools: ['apa-results'], guides: []
  },
  cochranq: {
    name: 'Cochran의 Q 검정', level: '기초',
    q: '같은 사람을 세 번 이상 잰 이분 결과의 비율이 같은가?',
    data: ['같은 사람의 세 시점 이상, 결과는 두 범주'],
    prog: 'SPSS(비모수 검정), R(DescTools 등)',
    report: ['시점별 비율', 'Q(df), p', '사후 비교(McNemar 검정에 다중비교 보정)'],
    mistakes: ['공변량을 함께 다뤄야 하는데 Q 검정만 쓰는 것(일반화추정방정식이나 혼합 로지스틱 모형 검토)'],
    tools: [], guides: []
  },
  bowker: {
    name: 'Stuart-Maxwell 주변동질성 검정', level: '기초',
    q: '같은 사람의 두 시점에서 세 범주 이상 결과의 분포(각 범주의 비율)가 달라졌는가?',
    data: ['두 시점, 같은 범주 체계(정사각 교차표)', '두 시점의 범주 분포가 같은지는 Stuart-Maxwell 검정으로, 칸 단위로 대칭인지는 McNemar-Bowker 검정으로 봅니다. Bowker 검정이 유의하다고 해서 분포가 달라졌다고 할 수는 없습니다.'],
    prog: 'R(DescTools::StuartMaxwellTest), SPSS(대응 2표본 비모수 검정의 주변 동질성 검정, 순서형 범주)',
    report: ['시점 간 교차표', 'χ²(df), p'],
    mistakes: ['대칭성 검정(Bowker) 결과를 분포 변화로 해석하는 것', '범주를 둘로 묶을 수 있는데도 칸이 너무 성긴 표를 그대로 쓰는 것(묶으면 McNemar 검정)'],
    tools: [], guides: []
  },
  gee: {
    name: '일반화추정방정식(GEE) 또는 혼합 로지스틱 모형', level: '고급',
    q: '같은 사람을 세 번 이상 잰 범주형 결과가 시점에 따라 달라지는가?',
    data: ['같은 사람의 세 시점 이상, 결과는 범주형(세 범주 이상이면 다항 또는 순서형 모형)', '같은 사람의 반복 측정 사이 상관을 모형에 반영합니다.'],
    prog: 'SPSS(일반화 추정 방정식, 일반화 선형 혼합 모형), R(geepack, ordinal::clmm, lme4)',
    report: ['시점의 효과(계수, 승산비와 95% 신뢰구간)', '작업 상관 구조(GEE) 또는 무선효과(혼합모형)'],
    mistakes: ['시점 쌍마다 따로 검정을 반복해 1종 오류를 키우는 것'],
    tools: [], guides: []
  },
  pearson: {
    name: 'Pearson 상관분석', level: '기초',
    q: '두 연속형 변수가 직선적으로 함께 변하는가?',
    data: ['두 변수 모두 연속형, 관계가 대체로 직선', '표본 크기: r = .30, α = .05, 검정력 .80이면 84명(G*Power 정확 계산), 근사식으로는 85명입니다(Cohen, 1992).'],
    prog: 'SPSS, jamovi, R(cor.test)',
    report: ['변수별 M, SD', 'r(df), p (변수가 여럿이면 상관표)', '목록별·쌍별 제외 여부와 N'],
    mistakes: ['산점도를 보지 않아 곡선 관계나 이상값을 놓치는 것', '상관을 인과로 해석하는 것'],
    tools: ['correlation-table', 'apa-results', 'sample-size', 'normality'], guides: ['correlation-table-apa']
  },
  spearman: {
    name: 'Spearman 순위상관', level: '기초',
    q: '두 변수의 순위가 함께 움직이는가?',
    data: ['한쪽이라도 순서형이거나, 이상값이 많고 심하게 치우친 연속형'],
    prog: 'SPSS, jamovi, R(cor.test, method = "spearman")',
    report: ['rs(df), p'],
    mistakes: ['Pearson과 Spearman 중 유의한 쪽을 골라 보고하는 것'],
    tools: ['apa-results'], guides: ['normality-skew-kurtosis']
  },
  groupcmp: {
    name: '집단 차이 검정 (t검정 또는 분산분석)', level: '기초',
    q: '한쪽이 범주형이면 "관계"는 곧 집단 간 평균 차이입니다.',
    data: ['범주가 둘이면 독립표본 t검정, 셋 이상이면 일원분산분석', '첫 질문에서 "집단 차이"를 고르면 더 자세히 안내합니다.'],
    prog: 'SPSS, jamovi, R',
    report: ['집단별 M, SD, 검정통계량, p, 효과크기'],
    mistakes: ['세 범주 이상인 명목변수를 숫자 코드(1, 2, 3) 그대로 상관분석에 넣는 것. 두 범주라면 점이연 상관은 t검정과 같은 정보라 문제가 없습니다.'],
    tools: ['apa-results', 'effect-size'], guides: ['t-test-report']
  },
  rankgroups: {
    name: 'Mann-Whitney U 검정 또는 Kruskal-Wallis 검정', level: '기초',
    q: '범주(집단)에 따라 순서형 결과의 순위가 다른가?',
    data: ['범주가 둘이면 Mann-Whitney U, 셋 이상이면 Kruskal-Wallis'],
    prog: 'SPSS(비모수 검정), jamovi, R',
    report: ['집단별 중앙값, 검정통계량, p'],
    mistakes: ['순서형 결과를 범주형으로 보고 χ² 검정을 해서 순서 정보를 버리는 것'],
    tools: ['apa-results'], guides: ['small-sample-analysis']
  },
  regression: {
    name: '다중회귀분석', level: '기초',
    q: '여러 예측변수가 연속형 결과를 얼마나 설명하고, 다른 변수를 통제했을 때 각 변수의 고유한 기여가 있는가?',
    data: ['결과변수 연속형, 예측변수는 연속형 또는 더미 코딩한 범주형', '표본 크기: f² = .15, 예측변수 5개, α = .05, 검정력 .80이면 92명입니다(G*Power와 같은 방식). 경험칙으로는 전체 R² 검정에 N ≥ 50 + 8m, 개별 계수 검정에 N ≥ 104 + m(m은 예측변수 수)이 쓰입니다(Green, 1991).'],
    prog: 'SPSS, jamovi, R(lm)',
    report: ['B, SE, β, t, p', 'R², 수정된 R², F(df1, df2)', '위계적 회귀라면 단계별 ΔR²와 ΔF', '다중공선성(VIF)'],
    mistakes: ['횡단 자료의 계수를 "영향"이라는 인과 표현으로 쓰는 것', '표준화 계수 β만 보고 비표준화 계수 B와 표준오차를 빠뜨리는 것'],
    tools: ['apa-results', 'sample-size', 'correlation-table', 'normality'], guides: ['regression-table-report', 'sample-size-justification', 'multicollinearity', 'dummy-variables', 'hierarchical-regression-controls']
  },
  logit: {
    name: '이항 로지스틱 회귀분석', level: '기초',
    q: '여러 예측변수가 예/아니오 같은 두 범주 결과가 일어날 확률을 설명하는가?',
    data: ['결과변수 두 범주', '표본 크기: 예측변수 하나당 사건(적은 쪽 범주) 10개 이상이라는 경험칙이 널리 쓰이지만(Peduzzi et al., 1996), 상황에 따라 이 기준을 완화할 수 있다는 연구도 있습니다(Vittinghoff & McCulloch, 2007).'],
    prog: 'SPSS(이분형 로지스틱), jamovi, R(glm, family = binomial)',
    report: ['B, SE, Wald χ², p', '승산비(OR)와 95% 신뢰구간', '모형 적합(−2LL, 모형 χ², 의사 R² 등)'],
    mistakes: ['승산비를 확률의 배수로 해석하는 것', '두 범주 결과에 일반 회귀를 쓰는 것'],
    tools: ['sample-size'], guides: []
  },
  ologit: {
    name: '순서형 로지스틱 회귀분석', level: '기초',
    q: '순서가 있는 범주 결과(낮음·보통·높음)를 여러 예측변수로 설명하는가?',
    data: ['결과변수 순서형 범주', '비례 승산 가정(평행선 검정)을 확인합니다.'],
    prog: 'SPSS(순서형 회귀), jamovi, R(MASS::polr, ordinal)',
    report: ['계수와 승산비, 95% 신뢰구간', '평행선 검정 결과'],
    mistakes: ['비례 승산 가정을 확인하지 않는 것'],
    tools: [], guides: []
  },
  mlogit: {
    name: '다항 로지스틱 회귀분석', level: '기초',
    q: '세 범주 이상(순서 없음)의 결과를 기준 범주와 비교하며 설명하는가?',
    data: ['결과변수 세 범주 이상, 기준 범주를 정함'],
    prog: 'SPSS(다항 로지스틱), jamovi, R(nnet::multinom)',
    report: ['기준 범주', '범주별 계수와 승산비, 95% 신뢰구간'],
    mistakes: ['기준 범주를 밝히지 않아 승산비 해석이 불분명한 것'],
    tools: [], guides: []
  },
  mlm: {
    name: '다층모형 (위계적 선형모형)', level: '고급',
    q: '학생이 학급에, 직원이 조직에 속한 자료에서 개인 수준과 집단 수준 변수의 효과는 무엇이고, 결과의 차이 중 집단 간 차이가 얼마인가?',
    data: ['위계 구조: 하위 단위(학생)가 상위 단위(학급, 학교)에 속함', '표본 크기: 상위 단위 수가 중요합니다. 상위 단위가 50개 이하로 적으면 2수준 분산 성분의 표준오차가 과소추정되고, 고정효과 회귀계수는 비교적 정확하게 추정됩니다(Maas & Hox, 2005).'],
    prog: 'R(lme4, nlme), HLM, Mplus, SPSS(혼합 모형), jamovi(GAMLj)',
    report: ['급내상관(ICC)', '고정효과(계수, SE, p)', '무선효과 분산', '모형 비교(편차 통계량, AIC 등)', '예측변수 중심화 방식'],
    mistakes: ['위계를 무시하고 일반 회귀를 써서 표준오차를 과소추정하는 것', '집단평균 중심화와 전체평균 중심화 가운데 무엇을 썼는지 밝히지 않는 것(Enders & Tofighi, 2007)'],
    tools: [], guides: [], premium: true
  },
  efa: {
    name: '탐색적 요인분석 (EFA)', level: '고급',
    q: '문항들이 몇 개의 요인으로 묶이고, 각 요인은 어떤 문항으로 이루어지는가?',
    data: ['새 척도를 만들거나 번안해 요인 구조를 모를 때', '표본 크기: 필요한 수는 문항의 공통성과 요인당 문항 수에 따라 달라서, 공통성이 높으면 100명 안팎도 가능하지만 낮으면 훨씬 많이 필요합니다(MacCallum et al., 1999). 흔히 인용되는 Comrey와 Lee(1992)의 기준은 100명 나쁨, 200명 보통, 300명 좋음, 500명 매우 좋음입니다.', '요인마다 최소 3문항'],
    prog: 'SPSS(차원 축소), jamovi, R(psych::fa, fa.parallel), Mplus',
    report: ['요인 추출 방법(주축요인, 최대우도)과 회전 방법(사각 회전)', '요인 수 결정 근거(평행분석 등)', 'KMO, Bartlett 검정', '요인부하량 표(패턴 행렬)와 공통성'],
    mistakes: ['주성분분석을 하고 고유값 1 기준만으로 요인 수를 정하는 것(Fabrigar et al., 1999)', '같은 표본으로 EFA를 하고 바로 CFA로 "확인"하는 것'],
    tools: ['cronbach-alpha'], guides: ['cronbach-alpha-60s'], premium: true
  },
  cfa: {
    name: '확인적 요인분석 (CFA)', level: '고급',
    q: '이론이나 원척도에서 정한 요인 구조가 내 자료에 맞는가?',
    data: ['문항과 요인의 관계가 미리 정해져 있을 때', '표본 크기: 정해진 최솟값은 없습니다. 모의실험에서 필요한 표본은 모형에 따라 30명에서 460명까지 달랐고, 부하량이 낮고 요인당 문항이 적을수록 커졌습니다(예: 2요인, 요인당 3문항, 부하량 .50에서 460명; Wolf et al., 2013).', '내 표본(예: 250명)으로 충분한지는 그 모형으로 모의실험을 해서 확인할 수 있습니다(Muthén & Muthén, 2002).'],
    prog: 'Mplus, R(lavaan), AMOS, jamovi, JASP',
    report: ['χ²(df), CFI, TLI, RMSEA(90% CI), SRMR', '표준화 요인부하량', '신뢰도(ω 등)'],
    mistakes: ['수정지수만 보고 이론적 근거 없이 오차 공분산을 추가하는 것', 'Hu와 Bentler(1999)의 기준을 절대 규칙처럼 적용하는 것(Marsh et al., 2004)'],
    tools: ['cronbach-alpha', 'ave-cr', 'sem-fit'], guides: ['sem-fit-indices', 'ave-cr-validity', 'common-method-bias'], premium: true
  },
  invariance: {
    name: '다집단 확인적 요인분석과 측정동일성', level: '고급',
    q: '남녀, 학년처럼 집단이 달라도 척도가 같은 의미로 측정되는가? 집단 간 평균이나 경로를 비교해도 되는가?',
    data: ['비교할 집단마다 확인적 요인분석이 가능한 크기', '형태, 측정(부하량), 절편 동일성 순서로 제약을 더해 비교합니다(Vandenberg & Lance, 2000; Putnick & Bornstein, 2016).'],
    prog: 'Mplus, R(lavaan, semTools), AMOS',
    report: ['단계별 적합도와 변화량(ΔCFI, ΔRMSEA, ΔSRMR)', '판단 기준: CFI 감소폭 .01 이하면 동일성 유지(Cheung & Rensvold, 2002). Chen(2007)은 전체 N이 300을 넘고 집단 크기가 비슷할 때 CFI가 .010 이상 줄면서 RMSEA가 .015 이상 또는 SRMR이 .030 이상(절편 단계는 .010 이상) 늘면 비동일로 보았고, 표본이 작거나 집단 크기가 다르면 더 엄격한 값(.005, .010, .025)을 권했습니다.', '부분 동일성이면 풀어 준 모수(요인마다 동일한 문항이 적어도 둘)'],
    mistakes: ['측정동일성 확인 없이 집단 평균을 비교하는 것. 척도 평균 점수로 t검정이나 분산분석을 할 때도 절편 동일성이 전제됩니다.', '표본이 클 때 민감한 χ² 차이 검정만으로 판단하는 것'],
    tools: ['sem-fit'], guides: ['measurement-invariance', 'sem-fit-indices'], premium: true
  },
  sem: {
    name: '구조방정식모형 (측정모형과 구조모형)', level: '고급',
    q: '여러 문항으로 잰 잠재변수들 사이의 경로(매개 포함)가 이론대로 성립하는가?',
    data: ['주요 변수가 여러 문항으로 측정된 잠재변수', '측정모형을 먼저 확인하고 구조모형을 추정하는 2단계 접근(Anderson & Gerbing, 1988)', '표본 크기: 모형에 따라 크게 다르며(Wolf et al., 2013), 계획한 모형으로 모의실험을 하면 내 표본으로 충분한지 확인할 수 있습니다(Muthén & Muthén, 2002).'],
    prog: 'Mplus, R(lavaan), AMOS, jamovi(SEMLj)',
    report: ['측정모형과 구조모형의 적합도(χ², CFI, TLI, RMSEA, SRMR)', '표준화 경로계수와 R²', '간접효과와 부트스트랩 95% 신뢰구간'],
    mistakes: ['횡단 자료의 경로를 인과로 단정하는 것', '측정모형을 확인하지 않고 바로 구조모형을 보고하는 것'],
    tools: ['mediation-sobel', 'sem-fit', 'ave-cr'], guides: ['sem-fit-indices', 'mediation-bootstrap-vs-sobel', 'ave-cr-validity', 'common-method-bias'], premium: true
  },
  medobs: {
    name: '매개분석 (회귀 기반, 부트스트랩)', level: '고급',
    q: 'X가 M을 거쳐 Y에 이르는 간접효과가 있는가?',
    data: ['X, M, Y가 척도 평균 같은 관측 점수', '간접효과는 부트스트랩 신뢰구간으로 검정합니다(Preacher & Hayes, 2008; 보통 5,000회 이상).', '표본 크기: 두 경로가 작을수록 수백 명이 필요할 수 있습니다(Fritz & MacKinnon, 2007).'],
    prog: 'SPSS·SAS PROCESS macro(model 4), R(lavaan, mediation), jamovi(jAMM)',
    report: ['경로 a, b, 직접효과 c\'', '간접효과 ab와 부트스트랩 95% 신뢰구간, 반복 횟수'],
    mistakes: ['Baron과 Kenny(1986)의 단계 검정이나 Sobel 검정만으로 판단하는 것', '횡단 자료로 인과적 매개를 단정하는 것'],
    tools: ['mediation-sobel'], guides: ['mediation-bootstrap-vs-sobel', 'mediation-no-total-effect'], premium: true
  },
  modobs: {
    name: '조절분석 (상호작용 회귀)', level: '고급',
    q: 'X의 효과가 W의 수준에 따라 달라지는가?',
    data: ['X, W, Y가 관측 점수(W는 범주형도 가능)', '상호작용 효과는 주효과보다 탐지하기 어려워 더 큰 표본이 필요한 경우가 많습니다(McClelland & Judd, 1993).'],
    prog: 'SPSS·SAS PROCESS macro(model 1), jamovi, R(lm)',
    report: ['상호작용항의 B, SE, p와 ΔR²', '단순기울기(조절변수 수준별 X의 효과, Aiken & West, 1991)', '필요하면 Johnson-Neyman 구간'],
    mistakes: ['평균중심화가 상호작용 검정 결과를 바꾼다고 오해하는 것(해석만 쉬워짐)', '조절변수로 집단을 나눠 상관을 따로 비교하는 것'],
    tools: ['simple-slopes'], guides: ['simple-slopes-interpretation'], premium: true
  },
  modmed: {
    name: '조절된 매개분석', level: '고급',
    q: '간접효과(X → M → Y)의 크기가 조절변수에 따라 달라지는가?',
    data: ['매개와 조절이 함께 있는 모형', '조절된 매개 지수(index of moderated mediation)와 부트스트랩 신뢰구간으로 판단합니다(Hayes, 2015).'],
    prog: 'SPSS·SAS PROCESS macro(model 7, 8, 14 등), R(lavaan), Mplus',
    report: ['조절된 매개 지수와 95% 신뢰구간', '조절변수 수준별 조건부 간접효과'],
    mistakes: ['a 경로나 b 경로의 상호작용이 유의한지만 보고 간접효과의 조절을 단정하는 것'],
    tools: [], guides: ['mediation-bootstrap-vs-sobel'], premium: true
  },
  latmod: {
    name: '다집단 구조방정식 또는 잠재 상호작용 모형', level: '고급',
    q: '잠재변수 모형의 경로가 조절변수에 따라 달라지는가?',
    data: ['조절변수가 범주형(성별 등)이면 다집단 구조방정식으로 경로를 비교하고, 그 전에 측정동일성을 확인합니다.', '조절변수가 연속형 잠재변수면 잠재 상호작용 모형(LMS, Klein & Moosbrugger, 2000)을 씁니다.'],
    prog: 'Mplus(XWITH: LMS), R(modsem: LMS·QML, semTools: 곱 지표 방식, lavaan: 다집단), AMOS(다집단)',
    report: ['집단별 경로와 동일성 제약 비교(Δχ²) 또는 잠재 상호작용 계수'],
    mistakes: ['측정동일성 확인 없이 집단 간 경로를 비교하는 것'],
    tools: ['sem-fit'], guides: ['measurement-invariance'], premium: true
  },
  lpa: {
    name: '잠재프로파일분석 (LPA)', level: '고급',
    q: '연속형 지표들의 응답 패턴으로 사람들을 몇 개의 유형으로 나눌 수 있는가? (사람 중심 접근)',
    data: ['유형을 나눌 연속형 지표 여러 개(척도 점수 등)', '표본 크기: 정해진 최솟값은 없고, 유형 간 차이가 뚜렷하고 지표가 많을수록 작은 표본으로도 구분이 됩니다(Nylund-Gibson & Choi, 2018). 예상하는 유형 구조로 모의실험을 해 볼 수도 있습니다.'],
    prog: 'Mplus, R(tidyLPA, mclust), Latent GOLD',
    report: ['유형 수별 AIC, BIC, SABIC, 엔트로피, LMR, BLRT, 가장 작은 유형의 비율', '유형 수 결정 근거: 모의실험(N = 200~1,000)에서 BLRT가 가장 일관되게, 정보지수 가운데서는 BIC가 가장 잘 유형 수를 찾았습니다(Nylund et al., 2007). 해석 가능성과 이론도 함께 봅니다.', '유형별 지표 평균(프로파일 그림)'],
    mistakes: ['엔트로피로 유형 수를 정하는 것(엔트로피는 분류의 확실성 지표)', '분류된 유형을 관측변수처럼 다음 분석에 넣는 것. 3단계 접근(Asparouhov & Muthén, 2014)이나 BCH 방법(Bakk & Vermunt, 2016)을 쓰며, 연속형 결과변수는 BCH가 더 안정적입니다.'],
    tools: [], guides: ['lpa-number-of-classes', 'cluster-vs-lpa'], premium: true
  },
  lca: {
    name: '잠재계층분석 (LCA)', level: '고급',
    q: '범주형 지표(예/아니오, 경험 유무)의 응답 패턴으로 사람들을 몇 개의 유형으로 나눌 수 있는가?',
    data: ['유형을 나눌 범주형 지표 여러 개', '표본 크기: LPA와 마찬가지로 유형의 분리 정도와 지표 수에 달려 있습니다(Nylund-Gibson & Choi, 2018).'],
    prog: 'Mplus, R(poLCA), Latent GOLD',
    report: ['유형 수별 AIC, BIC, SABIC, 엔트로피, LMR, BLRT', '유형별 문항 응답 확률'],
    mistakes: ['엔트로피로 유형 수를 정하는 것', '유형 배정 결과를 관측변수처럼 쓰는 것(Asparouhov & Muthén, 2014)'],
    tools: [], guides: ['lpa-number-of-classes'], premium: true
  },
  lta: {
    name: '잠재전이분석 (LTA)', level: '고급',
    q: '시점 사이에 사람들이 어느 유형에서 어느 유형으로 옮겨 가는가?',
    data: ['같은 지표를 두 시점 이상 측정', '시점별로 유형 구조가 같은지 먼저 확인합니다(Collins & Lanza, 2010).'],
    prog: 'Mplus, Latent GOLD',
    report: ['시점별 유형 수와 비율', '전이확률표', '적합도와 유형 구조의 시점 간 동일성'],
    mistakes: ['시점마다 따로 LPA를 하고 유형 이름만 맞춰 교차표를 만드는 것(분류 오차가 무시됨)'],
    tools: [], guides: ['lpa-number-of-classes'], premium: true
  },
  lgm: {
    name: '잠재성장모형 (LGM)', level: '고급',
    q: '시간에 따른 평균 변화(초기값, 변화율)는 어떠하고, 사람마다 변화가 얼마나 다르며, 무엇이 그 차이를 설명하는가?',
    data: ['같은 변수를 최소 3시점 측정(직선 변화). 곡선 변화를 보려면 시점이 더 필요합니다(Curran et al., 2010).', '같은 모형을 다층모형(시점이 개인에 속한 구조)으로도 추정할 수 있습니다.'],
    prog: 'Mplus, R(lavaan::growth, lme4), AMOS',
    report: ['적합도', '절편과 기울기의 평균, 분산, 공분산', '시간 변수 코딩(측정 간격 반영)'],
    mistakes: ['측정 간격이 다른데 시점을 0, 1, 2로 같은 간격으로 코딩하는 것', '두 시점 자료로 성장모형을 추정하는 것'],
    tools: [], guides: ['sem-fit-indices'], premium: true
  },
  gmm: {
    name: '성장혼합모형 (GMM)', level: '고급',
    q: '변화 궤적의 모양이 서로 다른 잠재 하위집단이 있는가?',
    data: ['같은 변수를 여러 시점 측정(3시점은 최소, 많을수록 유리), 비교적 큰 표본', '집단 안의 개인차를 0으로 두는 잠재계층성장분석(LCGA)은 더 단순한 대안입니다(Jung & Wickrama, 2008; Ram & Grimm, 2009).'],
    prog: 'Mplus, R(lcmm), Latent GOLD',
    report: ['궤적 유형 수별 적합도(BIC, BLRT, LMR, 엔트로피)', '유형별 궤적 그림과 비율'],
    mistakes: ['무작위 시작값이 적어 국소해에 머무는 것', '해석하기 어려운 작은 유형까지 과하게 뽑는 것'],
    tools: [], guides: ['lpa-number-of-classes'], premium: true
  },
  clpm: {
    name: '교차지연 패널모형 (CLPM, RI-CLPM)', level: '고급',
    q: '앞 시점의 X가 다음 시점의 Y를 예측하는가, 그 반대인가? (두 변수의 시간적 선후)',
    data: ['두 변수를 같은 사람에게 2시점 이상 측정', '전통적 교차지연 모형은 사람 사이의 안정적 차이와 개인 내 변화를 섞습니다. 무선절편 교차지연 모형(RI-CLPM)이 이를 분리하며 3시점 이상이 필요합니다(Hamaker et al., 2015).'],
    prog: 'Mplus, R(lavaan)',
    report: ['자기회귀 계수와 교차지연 계수(표준화)', '적합도', '시점 간 동일성 제약 여부'],
    mistakes: ['교차지연 계수를 개인 안의 인과 효과로 해석하는 것'],
    tools: [], guides: ['sem-fit-indices'], premium: true
  }
};

/* 결과 화면에 나온 용어만 골라 풀어 준다 */
window.GLOSSARY = [
  ['관측변수', '척도 평균이나 합계처럼 점수 하나로 쓰는 변수입니다.'],
  ['잠재변수', '직접 잴 수 없어 여러 문항의 공통 부분으로 추정하는 구성개념입니다. 측정오차를 모형에서 따로 다룹니다.'],
  ['AIC', '모형의 적합과 복잡성을 함께 반영한 정보지수입니다. 작을수록 낫다고 봅니다(BIC, SABIC도 같음).'],
  ['BIC', '정보지수의 하나로, AIC보다 복잡한 모형에 벌점을 더 줍니다. 작을수록 낫다고 봅니다.'],
  ['SABIC', '표본 크기를 보정한 BIC입니다.'],
  ['LMR', 'Lo-Mendell-Rubin 검정. 유형이 k개인 모형과 k − 1개인 모형을 비교해 p < .05면 k개가 낫다고 봅니다.'],
  ['BLRT', '같은 비교를 부트스트랩으로 하는 우도비 검정입니다.'],
  ['엔트로피', '사람들을 유형에 얼마나 확실하게 배정했는지 나타내는 0~1 사이의 값입니다.'],
  ['BCH', '유형 배정의 불확실성을 반영해 유형과 다른 변수의 관계를 추정하는 방법입니다.'],
  ['3단계', '유형을 먼저 정한 뒤 분류 오차를 보정하며 다른 변수와의 관계를 추정하는 방법입니다.'],
  ['ICC', '급내상관. 결과 점수의 전체 차이 가운데 집단(학급, 학교) 사이 차이가 차지하는 비율입니다.'],
  ['무선효과', '집단마다 다르게 둔 절편이나 기울기와 그 분산입니다.'],
  ['중심화', '예측변수에서 평균을 빼는 것. 다층모형에서는 집단평균과 전체평균 중 무엇을 뺐는지에 따라 해석이 달라집니다.'],
  ['GEE', '일반화추정방정식. 같은 사람의 반복 측정 사이 상관을 반영하는 회귀입니다.'],
  ['CFI', '아무 관계도 없다고 본 모형보다 얼마나 나아졌는지 나타내는 지수로 1에 가까울수록 좋습니다(TLI도 같은 성격).'],
  ['RMSEA', '모형이 자료와 어긋나는 정도를 자유도로 나눠 본 지수로, 작을수록 좋습니다.'],
  ['SRMR', '자료의 상관과 모형이 재현한 상관의 차이를 평균한 값으로, 작을수록 좋습니다.'],
  ['부트스트랩', '자료에서 복원추출을 수천 번 반복해 추정치의 분포와 신뢰구간을 만드는 방법입니다.'],
  ['승산비', '어떤 일이 일어날 승산(확률 ÷ 일어나지 않을 확률)이 몇 배가 되는지입니다. 확률의 배수가 아닙니다.'],
  ['dz', '차이 점수의 평균을 차이 점수의 표준편차로 나눈 대응표본 효과크기입니다.'],
  ['점이연', '두 범주 변수(0/1)와 연속형 변수의 상관입니다.'],
  ['측정동일성', '집단이나 시점이 달라도 문항이 같은 의미와 같은 척도로 측정되는지입니다.'],
  ['부분 동일성', '일부 문항의 모수만 집단마다 다르게 풀어 준 상태의 동일성입니다.'],
  ['수정지수', '고정해 둔 모수 하나를 풀면 χ²가 얼마나 줄어드는지 추정한 값입니다.'],
  ['사후검정', '전체 검정이 유의할 때 어느 집단 사이에 차이가 있는지 보는 비교로, 다중비교를 보정합니다.'],
  ['단순기울기', '조절변수의 특정 수준(예: 평균 ± 1SD)에서 X가 Y에 미치는 효과입니다.'],
  ['Johnson-Neyman', 'X의 효과가 유의해지는 조절변수 값의 범위를 찾는 방법입니다.'],
  ['구형성', '반복측정 분산분석에서 시점 쌍마다 차이 점수의 분산이 같다는 가정입니다.'],
  ['모의실험', '가정한 모형에서 자료를 여러 번 만들어 분석해 보는 방법으로, 필요한 표본 수나 검정력을 확인할 때 씁니다.']
];
