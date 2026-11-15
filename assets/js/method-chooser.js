(function () {
  'use strict';
  var M = window.METHODS;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var Q = [
    { id: 'goal', short: '알고 싶은 것', text: '무엇을 알고 싶나요?', opts: [
      ['diff', '집단이나 시점 사이의 차이', '예: 실험집단과 통제집단의 점수 차이, 학년별 비율 차이'],
      ['rel', '두 변수가 함께 변하는지(관계)', '예: 자기효능감과 학업성취의 상관'],
      ['pred', '여러 변수로 결과를 설명·예측', '예: 사회적 지지, 스트레스로 삶의 만족을 설명'],
      ['mech', '효과가 왜(매개), 언제(조절) 나타나는지', '예: 스트레스가 소진을 거쳐 이탈 의도에 이르는가'],
      ['measure', '척도(문항)의 요인 구조', '예: 번안한 척도가 원척도와 같은 요인으로 묶이는가'],
      ['people', '응답자를 비슷한 유형으로 나누기', '사람 중심 접근. 예: 학습동기 수준과 모양이 다른 학생 유형'],
      ['change', '같은 사람의 시간에 따른 변화', '종단 자료. 예: 1학년부터 3학년까지 매년 잰 점수']] },
    { id: 'dv', short: '결과변수', text: '결과(종속)변수는 어떤 값인가요?', relText: '두 변수 중 한쪽(결과로 보는 쪽)은 어떤 값인가요?', opts: [
      ['cont', '연속형, 분포가 크게 치우치지 않음', '점수, 척도 평균 등'],
      ['skew', '연속형, 심하게 치우치거나 이상값이 많음', ''],
      ['ord', '순서형', '순위, 3~4단계 등급'],
      ['bin', '두 범주', '예/아니오, 합격/불합격'],
      ['cat', '세 범주 이상(순서 없음)', '전공 계열, 선택한 진로']] },
    { id: 'gd', short: '비교 설계', text: '무엇을 비교하나요?', opts: [
      ['2ind', '서로 다른 두 집단', ''], ['2rep', '같은 사람의 두 시점(사전·사후)', ''],
      ['3ind', '서로 다른 세 집단 이상', ''], ['3rep', '같은 사람의 세 시점 이상', '']] },
    { id: 'xtype', short: '다른 쪽 변수', text: '다른 쪽 변수는 어떤 값인가요?', opts: [
      ['cont', '연속형', ''], ['ord', '순서형', ''], ['cat', '범주형', '']] },
    { id: 'lat', short: '변수 측정', text: '주요 변수를 어떻게 다루나요?', hint: '잘 모르겠다면: 척도 평균으로 분석하는 연구(회귀, PROCESS)가 흔하고 설명하기 쉽습니다. 측정오차를 모형에 반영하려면 잠재변수(구조방정식)를 쓰는데, 대체로 표본이 더 필요하고 측정모형과 적합도를 함께 보고해야 합니다.', opts: [
      ['obs', '척도 평균이나 합계 같은 점수 하나(관측변수)', ''],
      ['lat', '여러 문항으로 재는 구성개념 그대로(잠재변수)', '측정오차를 모형에 반영']] },
    { id: 'nest', short: '자료 구조', text: '응답자가 더 큰 단위에 묶여 있나요?', opts: [
      ['flat', '아니요, 각자 따로 모은 응답', ''],
      ['nested', '예, 학생이 학급·학교에, 직원이 조직에 속함', '같은 단위 사람끼리 닮을 수 있음']] },
    { id: 'mtype', short: '모형', text: '어떤 모형인가요?', opts: [
      ['med', '매개: X가 M을 거쳐 Y에 영향', ''], ['mod', '조절: X의 효과가 W에 따라 달라짐', ''],
      ['modmed', '조절된 매개: 간접효과가 W에 따라 달라짐', '']] },
    { id: 'mpurpose', short: '목적', text: '척도 분석의 목적은 무엇인가요?', opts: [
      ['explore', '구조를 모름: 몇 개 요인으로 묶이는지 찾기', '새로 만든 척도, 처음 번안한 척도'],
      ['confirm', '정해진 구조가 맞는지 확인', '원척도의 요인 구조가 있음'],
      ['compare', '집단 간에 같은 의미로 재는지 확인', '집단 평균이나 경로를 비교하기 전']] },
    { id: 'ind', short: '유형 지표', text: '유형을 나눌 지표는 어떤 값인가요?', opts: [
      ['cont', '연속형(척도 점수 등)', ''], ['cat', '범주형(예/아니오, 경험 유무)', '']] },
    { id: 'ptime', short: '자료 시점', text: '자료가 한 시점인가요, 여러 시점인가요?', opts: [
      ['cross', '한 시점(횡단)', ''], ['long', '같은 사람을 여러 시점(종단)', '유형 사이의 이동을 봄']] },
    { id: 'waves', short: '시점 수', text: '같은 사람을 몇 번 쟀나요?', opts: [
      ['2', '2번', ''], ['3', '3번', ''], ['4', '4번 이상', '']] },
    { id: 'cgoal', short: '종단 질문', text: '변화에 대해 무엇을 알고 싶나요?', opts: [
      ['avg', '평균적인 변화와 사람마다의 차이', '초기값과 변화율'],
      ['sub', '변화 모양이 다른 하위집단', '꾸준히 오름, 떨어짐 같은 궤적 유형'],
      ['cross', '두 변수 중 무엇이 먼저인지', '앞 시점 X가 다음 시점 Y를 예측하는지'],
      ['types', '유형 사이의 이동', '시점마다 유형을 나누고 옮겨 감을 봄']] }
  ];
  var QBY = {}; Q.forEach(function (q) { QBY[q.id] = q; });

  function visible(s) {
    var v = ['goal'];
    var g = s.goal;
    if (g === 'diff') { v.push('dv'); if (s.dv) v.push('gd'); if (s.dv && (s.gd === '2ind' || s.gd === '3ind')) v.push('nest'); }
    if (g === 'rel') { v.push('dv'); if (s.dv) v.push('xtype'); }
    if (g === 'pred') { v.push('dv'); if (s.dv === 'cont' || s.dv === 'skew') v.push('lat'); if (s.dv) v.push('nest'); }
    if (g === 'mech') v.push('mtype', 'lat');
    if (g === 'measure') v.push('mpurpose');
    if (g === 'people') v.push('ind', 'ptime');
    if (g === 'change') v.push('waves', 'cgoal');
    return v;
  }

  // 반환: { key, note } 또는 null(답이 덜 됨)
  function decide(s) {
    var need = visible(s);
    for (var i = 0; i < need.length; i++) if (!s[need[i]]) return null;
    var g = s.goal, dv = s.dv, r = function (key, note) { return { key: key, note: note || '' }; };
    if (g === 'diff') {
      var ind = s.gd === '2ind' || s.gd === '3ind', two = s.gd === '2ind' || s.gd === '2rep';
      if (s.nest === 'nested' && (dv === 'bin' || dv === 'ord' || dv === 'cat')) return r('mlm', '결과가 ' + (dv === 'bin' ? '두 범주' : dv === 'ord' ? '순서형' : '세 범주 이상의 명목형') + '이고 응답자가 학급처럼 묶여 있으면, 일반 카이제곱이나 순위 검정은 같은 학급 학생끼리 닮은 정도를 무시해 표준오차를 작게 잡습니다. 집단 변수를 넣은 다층 로지스틱 모형(일반화 선형 혼합모형' + (dv === 'ord' ? ', 누적 로짓' : dv === 'cat' ? ', 다항 로짓' : '') + ')을 씁니다.');
      if (s.nest === 'nested') return r('mlm', '응답자가 학급처럼 묶여 있으면, 처치나 집단이 학급 단위든 개인 단위든 같은 학급 학생끼리 닮아 있어 일반 t검정이나 분산분석은 표준오차를 작게 잡습니다. 집단 변수를 다층모형의 예측변수로 넣어 검정합니다.');
      if (dv === 'cont') return r(s.gd === '2ind' ? 'indt' : s.gd === '2rep' ? 'pairedt' : s.gd === '3ind' ? 'anova' : 'rmanova', ind ? '사전 점수가 있는 실험·통제 설계라면 사후 점수만 비교하지 말고, 사전 점수를 공변량으로 넣은 공분산분석(ANCOVA)이나 집단 × 시점 혼합설계 분산분석을 씁니다. 이 도우미는 그 설계를 자세히 다루지 않습니다.' : '');
      if (dv === 'skew' || dv === 'ord') return r(s.gd === '2ind' ? 'mwu' : s.gd === '2rep' ? 'wilcoxon' : s.gd === '3ind' ? 'kw' : 'friedman');
      if (ind) return r('chisq');
      if (dv === 'bin') return r(two ? 'mcnemar' : 'cochranq');
      return r(two ? 'bowker' : 'gee');
    }
    if (g === 'rel') {
      var x = s.xtype;
      if ((dv === 'cont' || dv === 'skew' || dv === 'ord') && x !== 'cat') return r(dv === 'cont' && x === 'cont' ? 'pearson' : 'spearman');
      if (dv === 'cont' && x === 'cat') return r('groupcmp');
      if ((dv === 'skew' || dv === 'ord') && x === 'cat') return r('rankgroups');
      if (x === 'cat') return r('chisq');
      return r(dv === 'bin' ? 'logit' : 'mlogit');
    }
    if (g === 'pred') {
      if (dv === 'cont' || dv === 'skew') {
        if (s.nest === 'nested') return r('mlm', s.lat === 'lat' ? '잠재변수와 위계 구조를 함께 다루려면 다층 구조방정식(Mplus 등)이 필요합니다.' : '');
        if (s.lat === 'lat') return r('sem');
        return r('regression', dv === 'skew' ? '잔차가 크게 치우치면 변환이나 강건 표준오차를 검토합니다.' : '');
      }
      if (dv === 'bin') return r(s.nest === 'nested' ? 'mlm' : 'logit', s.nest === 'nested' ? '결과가 두 범주이므로 다층 로지스틱 회귀(일반화 선형 혼합모형)를 씁니다.' : '');
      if (s.nest === 'nested') return r('mlm', '결과가 ' + (dv === 'ord' ? '순서형' : '세 범주 이상의 명목형') + '이고 응답자가 학급·조직에 묶여 있으면 다층 ' + (dv === 'ord' ? '순서형(누적 로짓)' : '다항 로짓') + ' 모형(일반화 선형 혼합모형)을 씁니다. 일반 ' + (dv === 'ord' ? '순서형' : '다항') + ' 로지스틱 회귀는 표준오차를 작게 잡습니다.');
      return r(dv === 'ord' ? 'ologit' : 'mlogit');
    }
    if (g === 'mech') {
      if (s.mtype === 'med') return r(s.lat === 'lat' ? 'sem' : 'medobs');
      if (s.mtype === 'mod') return r(s.lat === 'lat' ? 'latmod' : 'modobs');
      return r('modmed', s.lat === 'lat' ? '잠재변수를 쓰면 구조방정식 안에서 조절된 매개를 추정합니다(Mplus, lavaan).' : '');
    }
    if (g === 'measure') return r(s.mpurpose === 'explore' ? 'efa' : s.mpurpose === 'confirm' ? 'cfa' : 'invariance');
    if (g === 'people') {
      if (s.ptime === 'long') return r('lta', s.ind === 'cont' ? '지표가 연속형이면 잠재프로파일 전이분석(LPTA)이라고도 부릅니다.' : '');
      return r(s.ind === 'cont' ? 'lpa' : 'lca', s.ind === 'cont' ? '거리 기반 군집분석(K-평균, Ward)과의 차이는 아래 "군집분석과 잠재프로파일분석" 글에 정리했습니다.' : '');
    }
    if (g === 'change') {
      var w = s.waves;
      if (s.cgoal === 'avg') return w === '2' ? r('pairedt', '평균 변화는 대응표본 t검정으로 봅니다. 두 시점으로는 잠재성장모형을 쓸 수 없지만, 변화의 개인차와 그 예측 요인은 사후 점수를 사전 점수로 통제한 회귀나 잠재변화점수 모형으로 볼 수 있습니다. 3시점 이상이면 잠재성장모형을 씁니다.') : r('lgm', w === '3' ? '3시점이면 직선 변화만 추정할 수 있습니다.' : '');
      if (s.cgoal === 'sub') return w === '2' ? r('lta', '두 시점으로는 궤적 유형을 추정하는 성장혼합모형을 쓸 수 없습니다. 시점마다 유형을 나누고 이동을 보는 잠재전이분석이 대안입니다.') : r('gmm', w === '3' ? '3시점은 최소 조건이라 수렴과 해석이 어려울 수 있습니다.' : '');
      if (s.cgoal === 'cross') return r('clpm', w === '2' ? '두 시점이면 전통적 교차지연 모형만 가능하고, 사람 사이 차이를 분리하는 RI-CLPM은 3시점 이상이 필요합니다.' : '');
      return r('lta');
    }
    return null;
  }

  // 상태: 주소의 검색어(?goal=...)에 담아, 뒤로 가기로 돌아와도 선택이 남게 한다
  function readState() {
    var p = new URLSearchParams(location.search), s = {};
    Q.forEach(function (q) { var v = p.get(q.id); if (v && q.opts.some(function (o) { return o[0] === v; })) s[q.id] = v; });
    return s;
  }
  function clean(s) { // 보이지 않는 질문의 답은 버린다
    var v = visible(s), out = {};
    v.forEach(function (k) { if (s[k]) out[k] = s[k]; });
    // 새로 보이게 된 질문이 생길 수 있어 한 번 더
    visible(out).forEach(function (k) { if (s[k]) out[k] = s[k]; });
    return out;
  }
  function query(s) { var p = new URLSearchParams(); Q.forEach(function (q) { if (s[q.id]) p.set(q.id, s[q.id]); }); var t = p.toString(); return t ? '?' + t : location.pathname; }

  var state = clean(readState());

  function renderForm() {
    var html = '';
    var vis = visible(state);
    vis.forEach(function (id, n) {
      var q = QBY[id];
      var text = id === 'dv' && state.goal === 'rel' ? q.relText : q.text;
      html += '<fieldset class="q" data-q="' + id + '"><legend><span class="qn">' + (n + 1) + '.</span> ' + esc(text) + '</legend>' + (q.hint ? '<p class="hint" style="margin:-4px 0 8px">' + esc(q.hint) + '</p>' : '') + '<div class="opts">';
      q.opts.forEach(function (o) {
        html += '<label class="opt"><input type="radio" name="' + id + '" value="' + o[0] + '"' + (state[id] === o[0] ? ' checked' : '') + '><span>' + esc(o[1]) + (o[2] ? '<small>' + esc(o[2]) + '</small>' : '') + '</span></label>';
      });
      html += '</div></fieldset>';
    });
    $('qs').innerHTML = html;
  }

  function list(arr) { return '<ul>' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  var TOOLS = { 'apa-results': 'APA 결과 문장 생성기', 'effect-size': '효과크기 계산기', 'correlation-table': '상관행렬 APA 표', 'sample-size': '표본 크기 계산기', 'cronbach-alpha': '크론바흐 알파 계산기', 'mediation-sobel': '매개효과 간접효과 검정', 'reverse-scoring': '역채점 계산기', 'normality': '정규성 판단', 'chi-square': '카이제곱 검정', 'p-adjust': '다중비교 p값 보정', 'simple-slopes': '단순기울기 계산기', 'sem-fit': '구조방정식 적합도 판정표', 'ave-cr': 'AVE·CR 계산기' };
  var GUIDES = window.GUIDE_TITLES || {};

  function renderResult() {
    var d = decide(state);
    $('mempty').hidden = !!d; $('result').hidden = !d;
    if (!d) {
      $('jump').hidden = true;
      $('help').innerHTML = ''; $('help').hidden = true;
      return;
    }
    var m = M[d.key];
    $('method').textContent = m.name;
    $('method').setAttribute('data-key', d.key);
    $('kind').textContent = m.level === '고급' ? '고급 분석' : '기초 분석';
    $('mq').textContent = m.q;
    $('mnote').textContent = d.note; $('mnote').hidden = !d.note;
    $('mdata').innerHTML = list(m.data);
    $('mprog').textContent = m.prog;
    $('mreport').innerHTML = list(m.report);
    $('mmist').innerHTML = list(m.mistakes);
    var btns = (m.tools || []).map(function (t) { return '<a class="btn" href="../' + t + '/">' + esc(TOOLS[t] || t) + ' 열기</a>'; });
    $('mtools').innerHTML = btns.join('');
    $('mtoolsWrap').hidden = !btns.length;
    var gl = (m.guides || []).filter(function (g) { return GUIDES[g]; }).map(function (g) { return '<li><a href="../../guides/' + g + '/">' + esc(GUIDES[g]) + '</a></li>'; });
    $('mguides').innerHTML = gl.join(''); $('mguidesWrap').hidden = !gl.length;
    // 이 화면에 나온 용어 풀이
    var blob = [m.name, m.q, d.note].concat(m.data, m.report, m.mistakes).join(' ');
    var terms = (window.GLOSSARY || []).filter(function (g) { return blob.indexOf(g[0]) >= 0; });
    $('mgloss').innerHTML = terms.map(function (g) { return '<dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd>'; }).join('');
    $('mglossWrap').hidden = !terms.length;
    // 선택을 바꾸면
    var ch = [];
    visible(state).forEach(function (id) {
      var q = QBY[id];
      q.opts.forEach(function (o) {
        if (o[0] === state[id]) return;
        var s2 = {}; Object.keys(state).forEach(function (k) { s2[k] = state[k]; }); s2[id] = o[0];
        s2 = clean(s2);
        var d2 = decide(s2);
        var suf = window.Stats.josa(o[1], '이면', '면').slice(o[1].length);
        var label = q.short + ': \'' + o[1] + '\'' + suf;
        if (!d2 || d2.key === d.key) return;
        ch.push('<li>' + esc(label) + ': <a href="' + query(s2) + '" data-state="' + esc(JSON.stringify(s2)) + '">' + esc(M[d2.key].name) + '</a></li>');
      });
    });
    $('changes').innerHTML = ch.join('') || '<li>다른 답을 골라도 같은 방법이 나옵니다. 연구 질문 자체를 바꾸려면 1번을 다시 고르세요.</li>';
    $('jump').hidden = false;
    $('help').hidden = false;
    // 크몽 안내 한 줄: 고급 분석이면 그 분석 이름으로
    $('help').innerHTML = m.premium
      ? '이 분석을 직접 하기 어렵다면 <a href="https://kmong.com/gig/430238" rel="noopener" target="_blank">크몽에서 도와드립니다</a>.'
      : $('help').getAttribute('data-default');
  }

  function update(push) {
    state = clean(state);
    var url = query(state);
    try { history.replaceState(state, '', url); } catch (e) { /* 파일로 열었을 때 */ }
    renderForm(); renderResult();
    if (push) { var r = decide(state); if (r) { var el = $('live'); el.textContent = ''; setTimeout(function () { el.textContent = '추천 분석: ' + M[r.key].name; }, 30); } }
  }

  $('qs').addEventListener('change', function (e) {
    var t = e.target; if (t.type !== 'radio') return;
    var focusName = t.name, focusVal = t.value;
    state[t.name] = t.value;
    update(true);
    var again = document.querySelector('input[name="' + focusName + '"][value="' + focusVal + '"]');
    if (again) again.focus();
  });
  $('changes').addEventListener('click', function (e) {
    var a = e.target.closest('a[data-state]'); if (!a) return;
    e.preventDefault(); state = JSON.parse(a.getAttribute('data-state')); update(true);
    $('result').scrollIntoView({ block: 'start' });
  });
  $('restart').addEventListener('click', function () { state = {}; update(false); var f = document.querySelector('input[name="goal"]'); if (f) f.focus(); });
  window.addEventListener('pageshow', function () { var s = clean(readState()); if (JSON.stringify(s) !== JSON.stringify(state)) { state = s; update(false); } });
  // 시험용: 결정 함수를 밖에서 확인할 수 있게
  window.__chooser = { decide: decide, visible: visible };
  update(false);
})();
