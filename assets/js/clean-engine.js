/* 설문 자료 정리 엔진 (브라우저와 Node 시험에서 같은 코드를 쓴다)
   원자료는 이 함수들 안에서만 다루며, 어떤 네트워크 호출도 하지 않는다.
   규칙 형식: survey-clean-rules/1 (DESIGN.md 부록 A) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CleanEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SCHEMA = 'survey-clean-rules/1';
  const VERSION = '0.2.0';

  // ---------------------------------------------------------------- 사전
  // 같은 글자라도 척도 길이에 따라 점수가 다르다(4점의 "그렇다"=3, 5점=4, 7점=6). 사전은 열 하나가 아니라
  // 같은 문항 묶음 전체에서 나온 보기와 숫자 응답의 범위를 함께 보고 고른다(chooseDict).
  const DICTS = {
    agree4: { label: '동의 4점 (전혀 그렇지 않다 ~ 매우 그렇다, 보통 없음)', min: 1, max: 4, map: { '전혀그렇지않다': 1, '그렇지않다': 2, '그렇다': 3, '매우그렇다': 4, '전혀아니다': 1, '아니다': 2 } },
    agree5: { label: '동의 5점 (전혀 그렇지 않다 ~ 매우 그렇다)', min: 1, max: 5, map: { '전혀그렇지않다': 1, '그렇지않다': 2, '보통이다': 3, '그렇다': 4, '매우그렇다': 5, '전혀아니다': 1, '아니다': 2, '보통': 3, '대체로그렇다': 4 } },
    agree6: { label: '동의 6점 (전혀 그렇지 않다 ~ 매우 그렇다, 보통 없음)', min: 1, max: 6, map: { '전혀그렇지않다': 1, '그렇지않다': 2, '약간그렇지않다': 3, '조금그렇지않다': 3, '약간그렇다': 4, '조금그렇다': 4, '그렇다': 5, '매우그렇다': 6 } },
    agree7: { label: '동의 7점 (전혀 그렇지 않다 ~ 매우 그렇다)', min: 1, max: 7, map: { '전혀그렇지않다': 1, '그렇지않다': 2, '약간그렇지않다': 3, '조금그렇지않다': 3, '보통이다': 4, '약간그렇다': 5, '조금그렇다': 5, '그렇다': 6, '매우그렇다': 7 } },
    freq5: { label: '빈도 5점 (전혀 없다 ~ 항상 있다)', min: 1, max: 5, map: { '전혀없다': 1, '거의없다': 2, '가끔있다': 3, '자주있다': 4, '항상있다': 5 } },
    sat5: { label: '만족 5점 (매우 불만족 ~ 매우 만족)', min: 1, max: 5, map: { '매우불만족': 1, '불만족': 2, '보통': 3, '보통이다': 3, '만족': 4, '매우만족': 5 } },
    imp5: { label: '중요도 5점 (전혀 중요하지 않다 ~ 매우 중요하다)', min: 1, max: 5, map: { '전혀중요하지않다': 1, '중요하지않다': 2, '보통이다': 3, '보통': 3, '중요하다': 4, '매우중요하다': 5 } },
    en4: { label: 'Agreement 4 (Strongly disagree ~ Strongly agree, no midpoint)', min: 1, max: 4, map: { 'stronglydisagree': 1, 'disagree': 2, 'agree': 3, 'stronglyagree': 4 } },
    en5: { label: 'Agreement 5 (Strongly disagree, Disagree, Neither, Agree, Strongly agree)', min: 1, max: 5, map: { 'stronglydisagree': 1, 'disagree': 2, 'neitheragreenordisagree': 3, 'neutral': 3, 'agree': 4, 'stronglyagree': 5 } },
    en5s: { label: 'Agreement 5 (Strongly disagree, Somewhat disagree, Neither, Somewhat agree, Strongly agree)', min: 1, max: 5, map: { 'stronglydisagree': 1, 'somewhatdisagree': 2, 'neitheragreenordisagree': 3, 'neutral': 3, 'somewhatagree': 4, 'stronglyagree': 5 } },
    en7: { label: 'Agreement 7 (Strongly disagree ~ Strongly agree)', min: 1, max: 7, map: { 'stronglydisagree': 1, 'disagree': 2, 'somewhatdisagree': 3, 'neitheragreenordisagree': 4, 'neutral': 4, 'somewhatagree': 5, 'agree': 6, 'stronglyagree': 7 } },
  };
  // 숫자 바로 뒤에 한 번만 붙어도 숫자로 읽는 단위. 앞에는 "약", "만"만 허용한다.
  const UNIT_WORDS = ['점', '시간', '분', '초', '세', '살', '명', '회', '번', '개월', '년', '개', '일', '주'];
  const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩';
  const FULLWIDTH = (s) => s.replace(/[０-９．－]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  const RESERVED = ['ALL', 'AND', 'BY', 'EQ', 'GE', 'GT', 'LE', 'LT', 'NE', 'NOT', 'OR', 'TO', 'WITH'];
  const ROLES = ['item', 'attention', 'category', 'number', 'timestamp', 'start', 'end', 'duration', 'id', 'text', 'multi', 'drop'];
  const ROLE_KO = { item: '척도 문항', attention: '주의확인 문항', category: '범주(인구통계 등)', number: '숫자', timestamp: '제출 시각', start: '시작 시각', end: '종료 시각', duration: '응답 소요 시간(초)', id: '식별값', text: '서술형', multi: '복수 선택', drop: '내보내지 않음' };

  const norm = (s) => String(s).normalize('NFC').replace(/\s+/g, '').toLowerCase();
  const isBlank = (v) => v === null || v === undefined || (typeof v === 'number' && isNaN(v)) || (typeof v === 'string' && v.trim() === '');
  const NUM_RE = /^[-+]?(\d+(\.\d*)?|\.\d+)$/;

  // ---------------------------------------------------------------- 읽기
  // 탭 또는 쉼표로 나뉜 글(엑셀 복사, CSV). 따옴표 안의 줄바꿈과 구분자를 지킨다.
  function detectDelim(text) { const first = String(text).replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] || ''; return (first.match(/\t/g) || []).length >= (first.match(/,/g) || []).length && first.includes('\t') ? '\t' : ','; }
  function parseDelimited(text, delim) {
    text = String(text).replace(/^\uFEFF/, '');
    if (!delim) delim = detectDelim(text);
    const rows = []; let row = []; let cell = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
      } else if (c === '"' && cell === '') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.map((r) => r.map((x) => (x === '' ? null : x)));
  }

  function detectEncoding(u8) { try { new TextDecoder('utf-8', { fatal: true }).decode(u8); return 'utf-8'; } catch (e) { return 'euc-kr'; } }
  function decodeBytes(u8) { return new TextDecoder(detectEncoding(u8)).decode(u8); }

  // 시트(2차원 배열) -> 표. 설문 도구별 머리글 모양을 알아본다.
  function buildTable(aoa, fileName, typed) {
    aoa = (aoa || []).map((r) => (Array.isArray(r) ? r.slice() : []));
    while (aoa.length && aoa[aoa.length - 1].every(isBlank)) aoa.pop();
    if (!aoa.length) throw new Error('자료가 비어 있습니다.');
    const width = Math.max(...aoa.map((r) => r.length));
    aoa.forEach((r) => { while (r.length < width) r.push(null); });
    const h1 = aoa[0].map((x) => (isBlank(x) ? '' : String(x).trim()));
    let platform = 'generic', headerRows = 1, labels = null, headers = h1.slice();
    const has = (arr, re) => arr.some((x) => re.test(x));
    if (has(h1, /^StartDate$/) && has(h1, /^(ResponseId|ResponseID)$/)) {
      platform = 'qualtrics';
      labels = aoa[1] ? aoa[1].map((x) => (isBlank(x) ? '' : String(x))) : null;
      headerRows = aoa[2] && aoa[2].some((x) => /ImportId/.test(String(x || ''))) ? 3 : 2;
    } else if (has(h1, /^(Respondent ID|응답자 ID)$/) && aoa[1]) {
      platform = 'surveymonkey'; headerRows = 2;
      const h2 = aoa[1].map((x) => (isBlank(x) ? '' : String(x).trim()));
      let last = '';
      headers = h1.map((q, j) => {
        if (q) last = q;
        const sub = h2[j];
        const base = q || (sub ? last : '');
        if (!sub || /^(Response|Open-Ended Response|응답|주관식 응답)$/i.test(sub)) return base || ('열' + (j + 1));
        return base ? base + ' - ' + sub : sub;
      });
    } else if (has(h1, /^(타임스탬프|Timestamp)$/i)) platform = 'google';
    else if (has(h1, /응답\s*일시|응답\s*시간|제출\s*일시/)) platform = 'naver-or-other';
    // 빈 머리글과 겹치는 머리글 정리
    const seen = {};
    headers = headers.map((h, j) => {
      let x = h || ('열' + (j + 1));
      if (seen[x]) { let k = 2; while (seen[x + ' (' + k + ')']) k++; x = x + ' (' + k + ')'; }
      seen[x] = 1; return x;
    });
    const rows = []; const rowNo = []; let blankSkipped = 0;
    for (let i = headerRows; i < aoa.length; i++) {
      if (aoa[i].every(isBlank)) { blankSkipped++; continue; }
      rows.push(aoa[i]); rowNo.push(i + 1);
    }
    return { fileName: fileName || '', typed: !!typed, platform, headerRows, headers, labels, rows, rowNo, blankSkipped };
  }

  // ---------------------------------------------------------------- 값 읽기
  function dateFrom(v) {
    if (v instanceof Date) return isNaN(v) ? null : v;
    if (typeof v === 'number') { if (v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5) + new Date().getTimezoneOffset() * 6e4); return null; }
    if (typeof v !== 'string') return null;
    const s = v.trim();
    let m = s.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*(오전|오후)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (m) { let h = +m[5]; if (m[4] === '오후' && h < 12) h += 12; if (m[4] === '오전' && h === 12) h = 0; return new Date(+m[1], +m[2] - 1, +m[3], h, +m[6], +(m[7] || 0)); }
    m = s.match(/^(\d{4})[-/.]\s*(\d{1,2})[-/.]\s*(\d{1,2})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|오전|오후)?(?:\s*(GMT|UTC)[+-]?\d*)?$/i);
    if (m) { let h = +m[4]; const ap = (m[7] || '').toUpperCase(); if ((ap === 'PM' || ap === '오후') && h < 12) h += 12; if ((ap === 'AM' || ap === '오전') && h === 12) h = 0; return new Date(+m[1], +m[2] - 1, +m[3], h, +m[5], +(m[6] || 0)); }
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (m) { let h = +m[4]; const ap = (m[7] || '').toUpperCase(); if (ap === 'PM' && h < 12) h += 12; if (ap === 'AM' && h === 12) h = 0; return new Date(+m[3], +m[1] - 1, +m[2], h, +m[5], +(m[6] || 0)); }
    return null;
  }
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (d) => d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : null;

  // 셀 -> {v: 숫자 또는 null, st: ok|blank|map|dict|text_num|bad, unit, approx, why}
  // typed: 엑셀처럼 칸에 자료형이 있는 원자료. 이때 글자 칸에 든 숫자("12.5")는 "글자로 저장된 숫자"로 기록한다.
  const LEAD_NUM_RE = /^([-+]?\d+)\s*[=:)\].]\s*[가-힣A-Za-z]/;
  const UNIT_RE = new RegExp('^(약|만)?\\s*([-+]?\\d+(?:\\.\\d+)?)\\s*(' + UNIT_WORDS.slice().sort((a, b) => b.length - a.length).join('|') + ')?$');
  function readNumber(raw, col, typed) {
    if (isBlank(raw)) return { v: null, st: 'blank' };
    if (col && col._map && (typeof raw === 'number' || typeof raw === 'string')) { const k0 = norm(String(raw)); if (Object.prototype.hasOwnProperty.call(col._map, k0)) return { v: col._map[k0], st: 'map' }; }
    if (typeof raw === 'number') return isFinite(raw) ? { v: raw, st: 'ok' } : { v: null, st: 'bad' };
    if (typeof raw === 'boolean' || raw instanceof Date) return { v: null, st: 'bad' };
    const s0 = String(raw);
    if (NUM_RE.test(s0)) return { v: parseFloat(s0), st: typed ? 'text_num' : 'ok', why: typed ? 'stored' : '' };
    const s = FULLWIDTH(s0.trim());
    if (NUM_RE.test(s)) return { v: parseFloat(s), st: 'text_num', why: s0.trim() === s ? 'space' : 'fullwidth' };
    const n = norm(s);
    if (col && col._map && Object.prototype.hasOwnProperty.call(col._map, n)) return { v: col._map[n], st: 'map' };
    if (col && col._dict && Object.prototype.hasOwnProperty.call(col._dict, n)) return { v: col._dict[n], st: 'dict' };
    const ci = CIRCLED.indexOf(s[0]);
    if (ci >= 0 && (s.length === 1 || /^\s|^[^\d]/.test(s.slice(1)))) return { v: ci + 1, st: 'text_num', why: 'circled' };
    let m = s.match(LEAD_NUM_RE);
    if (m && !UNIT_RE.test(s)) return { v: parseFloat(m[1]), st: 'text_num', why: 'labelled' };
    m = s.match(UNIT_RE);
    if (m) return { v: parseFloat(m[2]), st: 'text_num', unit: m[3] === '살' ? '세' : (m[3] || ''), approx: m[1] === '약', why: 'unit' };
    return { v: null, st: 'bad' };
  }

  // ---------------------------------------------------------------- 진단
  const PII_RE = /(이름|성명|성함|연락처|전화|휴대폰|핸드폰|이메일|e-?mail|메일\s*주소|주소|ip\s*address|ipaddress|locationlatitude|locationlongitude|위도|경도|recipient(email|firstname|lastname)|first name|last name|학번|사번|주민|생년월일|계좌)/i;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}$/;
  // 주의확인 문항: "주의"로 시작한다는 것만으로는 판정하지 않는다("주의집중" 척도와 구분).
  // "이 문항에는 ~을 고르세요", "주의 확인", "attention check" 꼴만 본다. 그리드 지시문("~면 5점으로 표시해 주세요 [문항]")은 제외(같은 지시문을 여러 열이 나눠 가지면 판정하지 않음).
  const ATT_RE = /(주의\s*확인|주의\s*문항|attention\s*check|paying\s+attention|성실(한|히)?\s*응답[^]{0,10}?확인|확인용|(이|본)\s*문항(에는|은|에서는|에서)\s*[^]{0,40}?(고르|선택|체크|표시|응답해)|for\s+this\s+(item|question)[^]{0,30}?select|select\s+["“'‘][^"”'’]+["”'’]\s+for\s+this)/i;
  // 하나뿐인 숫자 열을 척도 문항으로 보지 않게 하는 머리글 낱말
  const NUM_HINT = /(나이|연령|연수|경력|년수|근속|개월|횟수|일수|개수|시간|기간|학년|자녀|형제|자매|가구원|인원|명수|점수|소득|금액|월급|용돈|키\b|몸무게|체중|신장|\s수$|^\S+\s*수$|age|years|hours|income|number of|count)/i;
  const TEXT_HINT = /(의견|하고\s*싶은|자유|이유|서술|기타\s*의견|건의|comment|feedback|why|explain)/i;
  const RANGES = [[1, 4], [1, 5], [0, 4], [0, 5], [1, 6], [1, 7], [0, 6], [1, 10], [0, 10]];
  const GENDER = { '남': '남', '남자': '남', '남성': '남', 'male': '남', 'm': '남', 'man': '남', '여': '여', '여자': '여', '여성': '여', 'female': '여', 'f': '여', 'woman': '여' };
  const GENDER_COL = /(성별|gender|sex)/i;
  // 같은 뜻으로 볼 표기 열쇠: 띄어쓰기·기호 차이, 그리고 성별 열에서만 성별 표기. 뜻이 바뀔 수 있는 말("미만", "이하")은 건드리지 않는다.
  const variantKey = (v, gender) => { const k = norm(v).replace(/[/·.,\-_()[\]]/g, ''); return gender && GENDER[k] ? GENDER[k] : k; };

  // 흔한 척도 범위 가운데 응답을 90% 이상 덮는 것. 가장 많이 덮는 범위와 3%p 안쪽이면 더 좁은 범위를 고른다
  // (1~5 척도에 결측 코드 9가 조금 섞였다고 1~10으로 보지 않게, 그러나 5가 20% 있으면 1~4로 자르지 않게).
  function guessRange(nums) {
    if (!nums.length) return null;
    const cands = [];
    for (const [lo, hi] of RANGES) {
      const inside = nums.filter((x) => Number.isInteger(x) && x >= lo && x <= hi);
      const cov = inside.length / nums.length;
      if (cov < 0.9 || !inside.length) continue;
      const obsLo = Math.min(...inside), obsHi = Math.max(...inside);
      if (obsHi - obsLo < Math.min(2, hi - lo)) continue;
      cands.push({ r: [lo, hi], cov });
    }
    if (!cands.length) return null;
    const bestCov = Math.max(...cands.map((c) => c.cov));
    cands.sort((a, b) => (a.r[1] - a.r[0]) - (b.r[1] - b.r[0]) || b.r[0] - a.r[0]);
    // 바로 위 값이 입력 실수 한두 칸이 아니라 응답으로 볼 만큼 있을 때만(2개 이상, 응답의 0.3% 이상)
    const cnt = new Map(); nums.forEach((x) => cnt.set(x, (cnt.get(x) || 0) + 1));
    const has = { has: (x) => (cnt.get(x) || 0) >= Math.max(2, 0.003 * nums.length) };
    // 꼭대기 점수가 드물어도(예: 5점 척도의 5가 1%) 1~4로 자르지 않도록, 바로 이웃한 값이 있으면 그 값을 덮는 범위로 넓힌다
    const fits = cands.filter((c) => c.cov >= bestCov - 0.03 || cands.some((w) => w === c));
    let pick = cands.find((c) => c.cov >= bestCov - 0.03);
    // 아래쪽(0)은 넓히지 않는다: 1~5 척도의 0은 입력 실수인 경우가 많고, 0~4 척도처럼 아래가 드문 경우는 확인 필요로 넘어간다
    while (pick && has.has(pick.r[1] + 1)) {
      const wider = fits.find((c) => c.r[0] === pick.r[0] && c.r[1] >= pick.r[1] + 1);
      if (!wider) break; pick = wider;
    }
    return pick.r;
  }



  // 관찰한 보기 글자(정규화)와 숫자 응답으로 척도 길이(범위)와 사전을 정한다.
  // 자료만으로 척도 길이를 확신할 수 없는 경우가 많다(5점인데 아무도 "보통이다"를 안 고르면 4점처럼 보임).
  // 그래서 확신할 때만 sure=true. 아니면 추정값을 주되 연구자가 확인해야 정리가 실행된다.
  // 확신 조건: 고른 척도의 모든 단계가 실제로 관찰되었고, 응답이 30개 이상이며, 사전이 모든 보기를 읽음.
  function decideScale(nums, labels, respondents) {
    const L = [...new Set(labels)];
    const ints = nums.filter((x) => Number.isInteger(x) && x >= 0 && x <= 10);
    const numRange = guessRange(nums);
    const total = labels.length + ints.length;
    if (!L.length) {
      if (!numRange) return null;
      const seen = new Set(ints.filter((x) => x >= numRange[0] && x <= numRange[1]));
      const len = numRange[1] - numRange[0] + 1;
      const allSeen = seen.size === len;
      const enough = (respondents === undefined ? total : respondents) >= 30;
      const common = (len === 5 || len === 7) && numRange[0] === 1;
      return { range: numRange, dict: null, sure: allSeen && enough && common, why: !allSeen ? `${numRange[0]}~${numRange[1]} 가운데 관찰되지 않은 값이 있음` : !enough ? '응답자가 30명보다 적음' : len > 7 ? `${len}단계라 척도인지 숫자인지 알 수 없음` : `숫자 응답만으로는 ${len}점 척도인지 더 긴 척도에서 끝 점수를 아무도 안 고른 것인지 알 수 없음` };
    }
    const ent = Object.entries(DICTS).map(([k, d]) => ({ k, d, hit: L.filter((x) => Object.prototype.hasOwnProperty.call(d.map, x)).length }));
    const best = Math.max(...ent.map((e) => e.hit));
    if (!best) return null;
    const full = best === L.length;
    let cand = ent.filter((e) => e.hit === best);
    const inR = numRange ? ints.filter((x) => x >= numRange[0] && x <= numRange[1]) : ints;
    const obsMax = inR.length ? Math.max(...inR) : null, obsMin = inR.length ? Math.min(...inR) : null;
    if (obsMax !== null) { const c2 = cand.filter((e) => e.d.max >= obsMax && e.d.min <= obsMin); if (c2.length) cand = c2; }
    cand.sort((a, b) => (a.d.max - a.d.min) - (b.d.max - b.d.min));
    const d = cand[0].d;
    const levels = [...new Set(Object.values(d.map))];
    const seenLv = new Set(L.filter((x) => d.map[x] !== undefined).map((x) => d.map[x]).concat(inR));
    const unseen = levels.filter((x) => !seenLv.has(x)).sort();
    const evenAlt = ['agree4', 'agree6', 'en4'].includes(cand[0].k) && cand.some((e) => (e.d.max - e.d.min) === (d.max - d.min) + 1);
    const sure = full && !unseen.length && !evenAlt && (respondents === undefined ? total : respondents) >= 30;
    const why = !full ? '사전에 없는 보기가 있음' : unseen.length ? `${unseen.join(', ')}점 보기가 원자료에 없음` : evenAlt ? '중간점(보통이다) 보기가 없어, 중간점 없는 척도인지 아무도 중간점을 고르지 않은 것인지 알 수 없음' : '응답자가 30명보다 적음';
    return { range: [d.min, d.max], dict: cand[0].k, sure, why, unseen, unmatched: L.filter((x) => d.map[x] === undefined) };
  }
  // 예전 이름(시험용)
  function chooseDict(labels, numRange) { const r = decideScale(numRange ? [numRange[0], numRange[1]] : [], labels); return r && r.dict ? { key: r.dict, unseenLevels: r.unseen || [], unmatched: r.unmatched || [] } : null; }

  function suggestName(h, j) {
    let s = String(h).trim();
    const br = s.match(/\[([^\]]+)\]\s*$/); // 구글폼 객관식 그리드: "질문 [행]"
    if (br) s = br[1];
    s = s.replace(/^\s*(Q|문항|문)?\s*\d+\s*[.)\-]\s*/i, '').replace(/\([^)]*\)\s*$/, '').trim();
    s = s.replace(/\s*(을|를|은|는)?\s*(선택|입력|기입|체크|표시|골라|적어|써)\s*(해|하여)?\s*주(십시오|세요|시기 바랍니다)\.?\s*$/, '').replace(/[?？]\s*$/, '').trim();
    const m = s.match(/^([A-Za-z가-힣][A-Za-z가-힣0-9]*?)[\s_\-.]+0*(\d+)$/) || s.match(/^([A-Za-z가-힣]+)0*(\d+)$/);
    if (m) return { prefix: m[1], num: +m[2], sep: /[\s_\-.]0*\d+$/.test(s) };
    let t = s.replace(/[^A-Za-z0-9가-힣_]/g, '');
    if (/^\d/.test(t)) t = 'V' + t;
    if (!t || t.length > 8) t = 'Q' + (j + 1);
    if (RESERVED.includes(t.toUpperCase())) t = t + '_1';
    return { name: t };
  }
  // 같은 문항 묶음(척도 후보) 열쇠: "질문 [행]", "질문 - 항목", "접두어+번호"
  function groupKey(h, sugg) {
    const s = String(h).trim();
    let m = s.match(/^(.*\S)\s*\[[^\]]+\]\s*$/); if (m) return 'g:' + m[1];
    m = s.match(/^(.*\S)\s+-\s+.+$/); if (m) return 'm:' + m[1];
    if (sugg.prefix && (sugg.prefix.length >= 2 || sugg.sep)) return 'p:' + sugg.prefix; // "Q1, Q2"처럼 한 글자+번호는 묶지 않음(Qualtrics 기본 이름)
    return null;
  }
  function attentionPass(text, dictKey, range) {
    const t = String(text || '');
    let m = t.match(/(\d+)\s*(번|점)\s*(을|를|으로|로|에)\s*(고르|선택|체크|표시)/); if (m) return +m[1];
    m = t.match(/\((\d+)\)\s*(을|를|으로|로)?\s*(고르|선택|체크|표시)/); if (m) return +m[1];
    m = t.match(/["“'‘]([^"”'’]+)["”'’]\s*(을|를|으로|로|에)?\s*(고르|선택|체크|표시)/) || t.match(/select\s+["“'‘]([^"”'’]+)["”'’]/i);
    if (m) {
      const k = norm(m[1]);
      const keys = dictKey ? [dictKey] : Object.keys(DICTS).filter((x) => range && DICTS[x].min === range[0] && DICTS[x].max === range[1]);
      const vals = [...new Set(keys.map((x) => DICTS[x].map[k]).filter((v) => v !== undefined))];
      if (vals.length === 1) return vals[0];
    }
    return null;
  }

  function diagnose(table) {
    const { headers, rows } = table;
    const n = rows.length;
    const sugg = headers.map((h, j) => suggestName(h, j));
    const gkeys = headers.map((h, j) => groupKey(h, sugg[j]));
    const gsize = {}; gkeys.forEach((g) => { if (g) gsize[g] = (gsize[g] || 0) + 1; });
    // 1차: 열마다 값 모양
    const cols = headers.map((h, j) => {
      const vals = rows.map((r) => r[j]);
      const nb = vals.filter((v) => !isBlank(v));
      const counts = new Map();
      nb.forEach((v) => { const k = v instanceof Date ? fmtDate(v) : String(v); counts.set(k, (counts.get(k) || 0) + 1); });
      const distinct = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      const reads = nb.map((v) => readNumber(v, null));
      const strs = nb.filter((v) => typeof v === 'string' && readNumber(v, null).st === 'bad').map((v) => norm(v));
      const anyDictHit = strs.filter((x) => Object.values(DICTS).some((d) => d.map[x] !== undefined)).length;
      const label = table.labels ? table.labels[j] : '';
      const c = { index: j, source: h, label, n: nb.length, missing: n - nb.length, distinct: distinct.slice(0, 30), distinctCount: distinct.length, issues: [], group: gsize[gkeys[j]] >= 2 ? gkeys[j] : null };
      c._strs = strs; c._nums = reads.filter((r) => r.v !== null).map((r) => r.v);
      const hn = norm(h);
      const dates = nb.filter((v) => dateFrom(v)).length;
      const emails = nb.filter((v) => EMAIL_RE.test(String(v).trim())).length, phones = nb.filter((v) => PHONE_RE.test(String(v).trim())).length;
      c.pii = PII_RE.test(h) || (nb.length && (emails + phones) / nb.length > 0.5);
      c.attention = ATT_RE.test(h + ' ' + label);
      const numericish = nb.length && (reads.filter((r) => r.v !== null).length + anyDictHit) / nb.length >= 0.9;
      if (/^(타임스탬프|timestamp|recordeddate|enddate|종료|제출일시|응답일시)/i.test(hn) && dates / Math.max(1, nb.length) > 0.8) c.kind = /^(enddate|종료)/i.test(hn) ? 'end' : 'timestamp';
      else if (/^(startdate|시작)/i.test(hn) && dates / Math.max(1, nb.length) > 0.8) c.kind = 'start';
      else if (/(duration|소요시간|응답시간\(초\))/i.test(hn) && reads.filter((r) => r.st === 'ok').length / Math.max(1, nb.length) > 0.9) c.kind = 'duration';
      else if (c.pii) c.kind = 'pii';
      else if (/^(responseid|respondentid|collectorid|응답자id|id|번호|no)$/i.test(hn)) c.kind = 'id';
      else if (numericish) c.kind = 'numeric?';
      else if (TEXT_HINT.test(h + ' ' + label)) c.kind = 'text';
      else {
        const withComma = nb.filter((v) => typeof v === 'string' && /,/.test(v)).length;
        const parts = new Map();
        nb.forEach((v) => String(v).split(/\s*,\s*/).forEach((p) => { p = p.trim(); if (p) parts.set(p, (parts.get(p) || 0) + 1); }));
        const recurring = [...parts.entries()].filter(([, x]) => x >= 2);
        const multiHint = /모두|복수|중복\s*선택|all that apply|select all|check all/i.test(h + ' ' + label);
        if (withComma / Math.max(1, nb.length) >= 0.1 && parts.size <= 40 && (recurring.length >= 3 || (multiHint && recurring.length >= 2))) {
          c.kind = 'multi'; c.options = recurring.sort((a, b) => b[1] - a[1]).map((x) => x[0]);
          const rare = [...parts.entries()].filter(([, x]) => x < 2).length;
          if (rare) c.issues.push({ k: 'variant', n: rare, msg: `한 명만 고른 보기 ${rare}가지("기타" 응답일 수 있음)는 보기 목록에서 뺐습니다. 정리할 때 "_기타" 열로 옮깁니다` });
        } else if ((distinct.length <= 12 && nb.length >= 2 * distinct.length) || distinct.length <= 0.2 * nb.length) c.kind = 'category';
        else c.kind = 'text';
      }
      return c;
    });
    // 2차: 척도 길이. 묶음 전체로 판단하되, 열마다 확신한 길이가 서로 다르면(5점과 7점이 한 묶음) 열마다 따른다.
    // 확신이 없는 열은 rangeUnsure 로 표시해 3단계에서 연구자가 확인하게 한다.
    // 그리드 지시문을 여러 열이 나눠 가지면 그 지시문은 주의확인 문항 판정에 쓰지 않는다.
    cols.forEach((c) => { if (c.attention && c.group && ATT_RE.test(String(c.group).slice(2))) c.attention = false; });
    const groups = new Map();
    cols.forEach((c) => { if (c.kind === 'numeric?') { const single = !c.group || NUM_HINT.test(c.source + ' ' + c.label); const g = single ? 'one:' + c.index : c.group; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(c); } });
    const setScale = (c, dec, item) => {
      c.kind = item ? 'item' : 'number';
      c.range = item ? dec.range.slice() : null; c.dict = item ? dec.dict : null;
      const ns = c._nums; c.min = ns.length ? Math.min(...ns) : null; c.max = ns.length ? Math.max(...ns) : null;
      if (item && !dec.sure) { c.rangeUnsure = true; c.issues.push({ k: 'dict', n: 0, msg: `${dec.range[0]}~${dec.range[1]}점${dec.dict ? `(${DICTS[dec.dict].label.split(' (')[0]})` : ''}으로 추정했지만 확실하지 않습니다(${dec.why}). 3단계에서 몇 점 척도인지 확인해야 정리됩니다` }); }
    };
    groups.forEach((cs, g) => {
      const single = g.startsWith('one:');
      const own = cs.map((c) => decideScale(c._nums, c._strs, c.n));
      if (single) {
        const c = cs[0]; const dec = own[0];
        const hint = NUM_HINT.test(c.source + ' ' + c.label);
        const item = !!dec && (!!dec.dict || c.attention || (!hint && dec.range[0] <= 1 && dec.range[1] - dec.range[0] + 1 <= 7));
        if (dec && item) { setScale(c, dec, true); if (!c.dict) c.issues.push({ k: 'dict', n: 0, msg: '혼자 있는 문항이라 척도 문항으로 볼지 숫자 열로 볼지 3단계에서 확인하세요' }); }
        else setScale(c, dec || { range: [0, 0] }, false);
        return;
      }
      const grp = decideScale(cs.flatMap((c) => c._nums), cs.flatMap((c) => c._strs), Math.max(...cs.map((c) => c.n)));
      const sureOwn = own.filter((d) => d && d.sure);
      const conflict = grp && sureOwn.some((d) => d.range.join() !== grp.range.join());
      cs.forEach((c, k) => {
        if (conflict) {
          const dec = own[k];
          // 같은 묶음 안에서 열마다 범위가 다르다(예: 1~4와 1~5). 길이가 다른 척도가 섞였을 수도, 어떤 문항에서 아무도 끝 점수를 안 골랐을 수도 있어 자료만으로는 가릴 수 없다.
          const wide = [Math.min(...own.filter(Boolean).map((d) => d.range[0])), Math.max(...own.filter(Boolean).map((d) => d.range[1]))];
          const wdict = grp && grp.range.join() === wide.join() ? grp.dict : null;
          if (dec) { setScale(c, { range: wide, dict: wdict, sure: false, why: `같은 머리글 묶음 안에서 열마다 응답 범위가 다름(${[...new Set(own.filter(Boolean).map((d) => d.range.join('~')))].join(', ')}). 길이가 다른 척도가 섞였다면 척도를 나누고 범위를 고치세요` }, true); }
          else setScale(c, { range: [0, 0] }, false);
        } else if (grp) setScale(c, grp, true);
        else setScale(c, { range: [0, 0] }, false);
      });
    });
    // 3차: 칸 단위 문제
    const common = mostCommonRange(cols);
    cols.forEach((c) => {
      if (c.attention && common && (c._nums.length || c._strs.length)) {
        const wide = widestRange(cols) || common; c.kind = 'item'; c.range = wide.slice(); delete c.rangeUnsure; c.issues = c.issues.filter((x) => x.k !== 'dict');
        const dd = decideScale(wide, c._strs); c.dict = dd && dd.dict && DICTS[dd.dict].max === wide[1] ? dd.dict : null;
        c.pass = attentionPass(c.source + ' ' + c.label, c.dict, wide);
        if (c.pass !== null && c.pass > c.range[1]) c.range[1] = c.pass;
      }
      if (c.kind === 'item' || c.kind === 'number') {
        const col = { _dict: c.dict ? DICTS[c.dict].map : null };
        c.cells = { text: [], bad: [], out: [], frac: [] };
        const units = new Set();
        rows.forEach((r, i) => {
          const rd = readNumber(r[c.index], col, table.typed);
          if (rd.unit) units.add(rd.unit);
          if (rd.st === 'text_num' || rd.st === 'dict') c.cells.text.push(i);
          if (rd.st === 'bad') c.cells.bad.push(i);
          if (rd.v !== null && c.range && (rd.v < c.range[0] || rd.v > c.range[1])) c.cells.out.push(i);
          else if (rd.v !== null && c.kind === 'item' && !Number.isInteger(rd.v)) c.cells.frac.push(i);
        });
        if (units.size > 1) c.issues.push({ k: 'bad', n: units.size, msg: `단위가 섞여 있습니다(${[...units].join(', ')}). 단위가 붙은 값은 숫자로 바꾸지 않고 확인 대상으로 둡니다` });
        if (c.cells.text.length) c.issues.push({ k: 'text', n: c.cells.text.length, msg: `글자로 적힌 응답 ${c.cells.text.length}칸을 숫자로 바꿀 수 있습니다` });
        if (c.cells.bad.length) c.issues.push({ k: 'bad', n: c.cells.bad.length, msg: `숫자로 읽을 수 없는 값 ${c.cells.bad.length}칸` });
        if (c.cells.out.length) c.issues.push({ k: 'out', n: c.cells.out.length, msg: `범위(${c.range[0]}~${c.range[1]}) 밖 값 ${c.cells.out.length}칸` });
        if (c.cells.frac.length) c.issues.push({ k: 'out', n: c.cells.frac.length, msg: `정수가 아닌 응답 ${c.cells.frac.length}칸` });
        if (c.kind === 'number' && c._nums.length >= 5) {
          const s = c._nums.slice().sort((a, b) => a - b); const q = (p) => s[Math.floor(p * (s.length - 1))];
          const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
          const codes = [9, 99, 999, 9999, -1, -9, -99, -999].filter((x) => s.includes(x) && (x < 0 ? x < q1 : x > q3 + 3 * Math.max(iqr, 1)));
          if (codes.length) c.issues.push({ k: 'out', n: codes.length, msg: `결측 코드로 보이는 값(${codes.join(', ')})이 있습니다. 결측 코드라면 3단계에서 지정하세요` });
          const ext = s.filter((x) => !codes.includes(x) && (x > q3 + 3 * iqr || x < q1 - 3 * iqr)).length;
          if (iqr > 0 && ext) c.issues.push({ k: 'out', n: ext, msg: `다른 응답과 크게 떨어진 값 ${ext}칸(사분위 범위의 3배 밖). 값은 바꾸지 않으니 확인하세요` });
        }
      }
      if (c.kind === 'category' && c.distinctCount > 1) {
        const g = new Map(); const gen = GENDER_COL.test(c.source + ' ' + c.label); c.distinct.forEach(([v]) => { const k = variantKey(v, gen); g.set(k, (g.get(k) || []).concat([v])); });
        const vs = [...g.values()].filter((x) => x.length > 1);
        if (vs.length) c.issues.push({ k: 'variant', n: vs.length, msg: `같은 뜻으로 보이는 표기 ${vs.length}묶음(${vs.slice(0, 2).map((x) => x.join('/')).join(', ')}). 규칙 초안에서 같은 코드로 묶었습니다` });
      }
      if (c.attention) { if (c.pass === undefined) c.pass = attentionPass(c.source + ' ' + c.label, c.dict, c.range); if (c.pass === null) c.issues.push({ k: 'pii', n: 0, msg: '주의확인 문항으로 보이지만 정답을 머리글에서 찾지 못했습니다. 3단계에서 정답을 적으세요' }); }
      if (c.pii) c.issues.push({ k: 'pii', n: 0, msg: '개인정보로 보이는 열입니다. 정리본에서 빼는 것을 권합니다' });
      if (c.missing) c.issues.push({ k: 'missing', n: c.missing, msg: `빈 칸 ${c.missing}` });
      delete c._strs; delete c._nums;
    });
    // 이름 제안: 접두어+번호 묶음이면 두 자리 번호
    const groupSize = {};
    sugg.forEach((s) => { if (s.prefix) groupSize[s.prefix] = (groupSize[s.prefix] || 0) + 1; });
    const used = new Set();
    cols.forEach((c, j) => {
      const s = sugg[j];
      let name = s.prefix ? (groupSize[s.prefix] >= 2 ? `${s.prefix}_${String(s.num).padStart(groupSize[s.prefix] >= 10 || s.num >= 10 ? 2 : 1, '0')}` : s.prefix + s.num) : s.name;
      if (c.kind === 'timestamp') name = '응답시각';
      if (c.attention) name = '주의확인';
      let base = name, k = 2; while (used.has(name)) name = base + '_' + (k++);
      used.add(name); c.name = name;
    });
    // 행 단위
    const itemColsC = cols.filter((c) => c.kind === 'item' && !c.attention);
    const itemCols = itemColsC.map((c) => c.index);
    const rowsInfo = { duplicates: [], straight: [], speed: null };
    const sigCols = cols.filter((c) => !['timestamp', 'start', 'end', 'duration', 'id', 'pii'].includes(c.kind)).map((c) => c.index);
    const lsMin = defaultLongstring(itemCols.length);
    const seen = new Map();
    rows.forEach((r, i) => {
      const sig = sigCols.map((j) => (isBlank(r[j]) ? '' : norm(r[j]))).join('\u0001');
      const base = itemCols.length ? itemCols : sigCols;
      const answered = base.filter((j) => !isBlank(r[j]));
      const uniq = new Set(answered.map((j) => norm(r[j]))).size;
      if (seen.has(sig) && answered.length >= Math.max(1, Math.ceil(base.length * 2 / 3)) && uniq > 1) rowsInfo.duplicates.push([i, seen.get(sig)]); else if (!seen.has(sig)) seen.set(sig, i);
      let best = 0, cur = 0, prev = null, prevR = null;
      itemColsC.forEach((c) => { const rk = String(c.range); if (rk !== prevR) { cur = 0; prev = null; } prevR = rk; const x = isBlank(r[c.index]) ? null : norm(r[c.index]); if (x !== null && x === prev) cur++; else if (x !== null) cur = 1; else cur = 0; prev = x; best = Math.max(best, cur); });
      if (itemCols.length >= LONGSTRING_MIN_ITEMS && best >= lsMin) rowsInfo.straight.push([i, best]);
    });
    rowsInfo.straightMin = lsMin;
    const idCols = cols.filter((c) => c.kind === 'id' || (c.pii && /학번|사번|이메일|e-?mail|전화|휴대폰|핸드폰|연락처/i.test(c.source)));
    rowsInfo.idDup = idCols.map((c) => {
      const m = new Map(); const d = [];
      rows.forEach((r, i) => { if (isBlank(r[c.index])) return; const k = norm(r[c.index]); if (m.has(k)) d.push([i, m.get(k)]); else m.set(k, i); });
      return { index: c.index, source: c.source, dups: d };
    });
    const st = cols.find((c) => c.kind === 'start'), en = cols.find((c) => c.kind === 'end'), du = cols.find((c) => c.kind === 'duration');
    if (du || (st && en)) {
      const secs = rows.map((r) => du ? readNumber(r[du.index]).v : (() => { const a = dateFrom(r[st.index]), b = dateFrom(r[en.index]); return a && b ? (b - a) / 1000 : null; })());
      const ok = secs.filter((x) => x !== null).sort((a, b) => a - b);
      const med = ok.length ? ok[Math.floor(ok.length / 2)] : null;
      const per = Math.max(1, itemCols.length) * 2;
      rowsInfo.speed = { from: du ? du.source : `${st.source} ~ ${en.source}`, median: med, threshold: per, fast: secs.map((s, i) => [i, s]).filter(([, s]) => s !== null && s < per) };
    } else rowsInfo.speed = { from: null, reason: cols.some((c) => c.kind === 'timestamp') ? '제출 시각만 있고 시작 시각이 없어 응답 시간을 계산할 수 없습니다(구글폼은 시작 시각을 기록하지 않습니다).' : '시작·종료 시각이나 소요 시간 열이 없습니다.' };
    return { n, platform: table.platform, cols, rows: rowsInfo, itemCount: itemCols.length };
  }
  // 일자 응답 기본 기준: 척도 문항이 10개 이하이면 모든 문항, 그보다 많으면 절반(최소 10)
  function defaultLongstring(k) { return k <= 10 ? Math.max(2, k) : Math.max(10, Math.ceil(k / 2)); }
  const LONGSTRING_MIN_ITEMS = 6; // 척도 문항이 이보다 적으면 일자 응답 규칙을 기본으로 끈다(성실 응답자도 많이 걸림)

  // 주의확인 문항의 범위: 척도 문항 가운데 가장 넓은 범위(정답 외 값을 범위 밖으로 잘못 지우지 않도록)
  function widestRange(cols) { let w = null; cols.filter((c) => c.kind === 'item' && !c.attention && c.range).forEach((c) => { if (!w || c.range[1] - c.range[0] > w[1] - w[0]) w = c.range; }); return w; }
  function mostCommonRange(cols) {
    const cnt = {}; cols.filter((c) => c.kind === 'item' && !c.attention && c.range).forEach((c) => { const k = c.range.join(','); cnt[k] = (cnt[k] || 0) + 1; });
    const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0].split(',').map(Number) : null;
  }
  // 범주 열의 대응표 초안. 모든 표기에 숫자가 하나씩 있으면 그 숫자, 아니면 같은 뜻 표기를 묶어 많이 나온 순서로 번호.
  function draftCategory(c) {
    const vals = c.distinct.map((x) => x[0]);
    const nums = vals.map((v) => { const m = String(v).match(/\d+/g); return m && m.length === 1 ? +m[0] : null; });
    const map = {}, labels = {};
    let byFreq = false;
    if (vals.length && nums.every((x) => x !== null)) {
      vals.forEach((v, i) => { map[v] = nums[i]; if (!labels[nums[i]] || (/\D/.test(v) && !/\D/.test(labels[nums[i]]))) labels[nums[i]] = v; });
    } else {
      byFreq = true;
      const gen = GENDER_COL.test(c.source + ' ' + (c.label || ''));
      const groups = []; vals.forEach((v) => { const g = variantKey(v, gen); let gi = groups.findIndex((x) => x.k === g); if (gi < 0) { groups.push({ k: g, v }); gi = groups.length - 1; } map[v] = gi + 1; });
      groups.forEach((g, i) => { labels[i + 1] = g.v; });
    }
    return { valueMap: map, valueLabels: labels, byFreq };
  }
  // ---------------------------------------------------------------- 규칙 초안 (AI 없이)
  function draftRules(table, dg) {
    const columns = dg.cols.map((c) => {
      const role = c.attention && c.kind === 'item' ? 'attention' : c.kind === 'pii' ? 'drop' : c.kind;
      const o = { source: c.source, name: c.name, role };
      if (c.label) o.label = c.label;
      if (role === 'item' || role === 'attention') { o.range = c.range ? c.range.slice() : [1, 5]; if (c.dict) o.dictionary = c.dict; if (c.rangeUnsure && role === 'item') o.confirm = true; }
      if (role === 'number') o.outOfRange = 'flag';
      if (role === 'attention') o.pass = c.pass === undefined ? null : c.pass;
      if (role === 'category') { const d = draftCategory(c); o.valueMap = d.valueMap; o.valueLabels = d.valueLabels; if (d.byFreq) o.codeOrder = 'frequency'; }
      if (role === 'multi') o.options = c.options.slice();
      return o;
    });
    const items = columns.filter((c) => c.role === 'item');
    const byGroup = new Map();
    items.forEach((c) => { const d = dg.cols.find((x) => x.source === c.source); if (!d || !d.group) return; const m = c.name.match(/^(.*?)_?\d+$/); const key = d.group + '|' + c.range.join(','); if (!byGroup.has(key)) byGroup.set(key, { name: m ? m[1] : c.name, cs: [] }); byGroup.get(key).cs.push(c); });
    const scaleNames = new Set();
    const scales = [...byGroup.values()].filter((g) => g.cs.length >= 2).map((g, i) => {
      let nm = /^[A-Za-z가-힣]/.test(g.name) && g.name.length <= 12 ? g.name : '척도' + (i + 1);
      while (scaleNames.has(nm) || columns.some((c) => c.name === nm + '_합' || c.name === nm + '_평균')) nm += '_';
      scaleNames.add(nm);
      return { name: nm, items: g.cs.map((c) => c.name), reverse: [], min: g.cs[0].range[0], max: g.cs[0].range[1], sum: true, mean: true, meanMinRatio: 0.8 };
    });
    const att = columns.find((c) => c.role === 'attention');
    const nItems = items.length;
    return {
      schema: SCHEMA, title: table.fileName ? table.fileName.replace(/\.[^.]+$/, '') : '설문 자료', columns, scales,
      flags: {
        longstring: { on: nItems >= LONGSTRING_MIN_ITEMS, min: defaultLongstring(nItems) },
        attention: { on: !!(att && att.pass !== null) },
        missingItems: { on: true, minRatio: 0.2, countAsCareless: false },
        duplicateAll: { on: true, minAnswered: Math.max(1, Math.ceil(nItems * 2 / 3)) },
        duplicateId: { on: false, column: null },
        speed: { on: !!(dg.rows.speed && dg.rows.speed.from), minSeconds: dg.rows.speed && dg.rows.speed.threshold ? dg.rows.speed.threshold : 60 },
      },
    };
  }

  // ---------------------------------------------------------------- 규칙 검사
  function byteLen(s) { return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s).length : Buffer.byteLength(s); }
  function validName(n) {
    if (typeof n !== 'string' || !n) return '비어 있습니다';
    if (!/^[A-Za-z가-힣@#$][A-Za-z0-9가-힣_.@#$]*$/.test(n) || /^[#$@]/.test(n)) return '글자(한글·영문)로 시작하고 글자, 숫자, 밑줄(_)만 쓸 수 있습니다';
    if (/\.$/.test(n)) return '마침표로 끝날 수 없습니다';
    if (RESERVED.includes(n.toUpperCase())) return 'SPSS 예약어라 쓸 수 없습니다';
    if (byteLen(n) > 64) return '너무 깁니다(SPSS 한도 64바이트, 한글 약 21자)';
    return null;
  }

  // AI 답이나 저장 파일을 규칙으로 읽는다. 오류는 위치(경로)와 함께 돌려준다.
  function parseRulesText(text) {
    let t = String(text || '').trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) t = fence[1].trim();
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0 || b < a) return { rules: null, errors: [{ path: '(전체)', msg: 'JSON 객체({ ... })를 찾지 못했습니다. AI 답에서 중괄호로 시작하는 부분을 통째로 붙여 넣으세요.' }] };
    t = t.slice(a, b + 1);
    try { return { rules: JSON.parse(t), errors: [] }; } catch (e) {
      const pm = String(e.message).match(/position (\d+)/);
      let where = '';
      if (pm) { const pos = +pm[1]; const before = t.slice(0, pos); const line = before.split('\n').length; const col = pos - before.lastIndexOf('\n'); where = ` (${line}번째 줄 ${col}번째 글자 근처: "${t.slice(Math.max(0, pos - 15), pos + 15).replace(/\s+/g, ' ')}")`; }
      if (!where) {
        // 브라우저마다 오류 문구가 달라 위치가 없을 때가 있다. 흔한 실수를 직접 찾아 위치를 알려 준다.
        const probes = [[/,\s*[}\]]/, '닫는 괄호 앞의 쉼표'], [/'[^'\n]*'\s*:/, '작은따옴표'], [/\/\/[^\n]*/, '// 주석'], [/[{,]\s*[A-Za-z가-힣_]+\s*:/, '따옴표 없는 키']];
        for (const [re, what] of probes) { const mm = re.exec(t); if (mm) { const pos = mm.index; const before = t.slice(0, pos); where = ` (${before.split('\n').length}번째 줄 ${pos - before.lastIndexOf('\n')}번째 글자 근처, ${what}: "${t.slice(Math.max(0, pos - 12), pos + 18).replace(/\s+/g, ' ')}")`; break; } }
      }
      const hint = /,\s*[}\]]/.test(t) ? ' 닫는 괄호 앞의 쉼표를 지워 보세요.' : /'[^']*'\s*:/.test(t) ? ' 작은따옴표 대신 큰따옴표를 써야 합니다.' : /\/\//.test(t) ? ' JSON에는 // 주석을 쓸 수 없습니다.' : '';
      return { rules: null, errors: [{ path: '(문법)', msg: 'JSON 문법 오류' + where + '.' + hint }] };
    }
  }

  function validateRules(rules, headers, opt) {
    opt = opt || {};
    const E = [], W = [];
    const err = (p, m) => E.push({ path: p, msg: m }); const warn = (p, m) => W.push({ path: p, msg: m });
    if (!rules || typeof rules !== 'object' || Array.isArray(rules)) { err('(전체)', '규칙은 { } 로 둘러싼 객체여야 합니다.'); return { errors: E, warnings: W, rules: null }; }
    const r = JSON.parse(JSON.stringify(rules));
    if (r.schema !== SCHEMA) { if (r.schema) warn('schema', `"${r.schema}" 대신 "${SCHEMA}"로 읽었습니다.`); r.schema = SCHEMA; }
    if (!Array.isArray(r.columns)) { err('columns', 'columns 배열이 없습니다.'); return { errors: E, warnings: W, rules: null }; }
    const hdr = headers || [];
    const hnorm = new Map(hdr.map((h) => [norm(h), h]));
    const names = new Map(); const sources = new Set();
    r.columns.forEach((c, i) => {
      const p = `columns[${i}]`;
      if (!c || typeof c !== 'object') { err(p, '객체가 아닙니다.'); return; }
      if (typeof c.source !== 'string') err(p + '.source', '원자료 머리글(source)이 없습니다.');
      else if (hdr.length && !hdr.includes(c.source)) {
        const fix = hnorm.get(norm(c.source));
        if (fix) { warn(p + '.source', `"${c.source}"를 띄어쓰기만 다른 머리글 "${fix}"로 맞췄습니다.`); c.source = fix; }
        else err(p + '.source', `원자료에 "${c.source}" 머리글이 없습니다.`);
      }
      if (sources.has(c.source)) err(p + '.source', `"${c.source}"가 두 번 나옵니다.`); sources.add(c.source);
      if (!ROLES.includes(c.role)) err(p + '.role', `역할 "${c.role}"을 모릅니다. 쓸 수 있는 값: ${ROLES.join(', ')}`);
      if (c.role !== 'drop') {
        const bad = validName(c.name);
        if (bad) err(p + '.name', `변수명 "${c.name ?? ''}": ${bad}`);
        else if (names.has(c.name)) err(p + '.name', `변수명 "${c.name}"이 ${names.get(c.name)}와 겹칩니다.`);
        else names.set(c.name, p);
      }
      if (c.range !== undefined && c.range !== null) {
        if (!Array.isArray(c.range) || c.range.length !== 2 || !c.range.every((x) => typeof x === 'number' && isFinite(x))) err(p + '.range', 'range는 [최솟값, 최댓값] 숫자 두 개여야 합니다.');
        else if (c.range[0] >= c.range[1]) err(p + '.range', `최솟값(${c.range[0]})이 최댓값(${c.range[1]})보다 작아야 합니다.`);
      } else if (c.role === 'item' || c.role === 'attention') err(p + '.range', '척도 문항에는 응답 범위(range)가 필요합니다.');
      if (c.confirm && (c.role === 'item' || c.role === 'attention')) err(p + '.confirm', `"${c.name}"이 몇 점 척도인지 자료만으로 확실하지 않습니다(추정 ${Array.isArray(c.range) ? c.range.join('~') : '?'}). 범위나 사전을 확인한 뒤 "범위 확인"에 표시하세요.`);
      if (c.outOfRange !== undefined && !['missing', 'flag'].includes(c.outOfRange)) err(p + '.outOfRange', 'outOfRange는 "missing"(결측 처리) 또는 "flag"(표시만)입니다.');
      if (c.dictionary !== undefined && c.dictionary !== null && !DICTS[c.dictionary]) err(p + '.dictionary', `사전 "${c.dictionary}"이 없습니다. 쓸 수 있는 값: ${Object.keys(DICTS).join(', ')}`);
      else if (c.dictionary && DICTS[c.dictionary] && Array.isArray(c.range) && c.range.length === 2 && (DICTS[c.dictionary].min !== c.range[0] || DICTS[c.dictionary].max !== c.range[1]) && ['item', 'attention'].includes(c.role)) err(p + '.dictionary', `사전 "${c.dictionary}"(${DICTS[c.dictionary].min}~${DICTS[c.dictionary].max}점)이 응답 범위 ${c.range.join('~')}와 맞지 않습니다. 같은 길이의 사전을 고르세요.`);
      if (c.valueMap !== undefined && c.valueMap !== null) {
        if (typeof c.valueMap !== 'object' || Array.isArray(c.valueMap)) err(p + '.valueMap', 'valueMap은 {"글자": 숫자} 모양이어야 합니다.');
        else Object.entries(c.valueMap).forEach(([k, v]) => { if (typeof v !== 'number' || !isFinite(v)) { if (typeof v === 'string' && NUM_RE.test(v.trim())) { c.valueMap[k] = +v; warn(`${p}.valueMap["${k}"]`, `글자 "${v}"를 숫자로 읽었습니다.`); } else err(`${p}.valueMap["${k}"]`, `값이 숫자가 아닙니다(${JSON.stringify(v)}).`); } });
      }
      if (c.valueLabels !== undefined && c.valueLabels !== null && (typeof c.valueLabels !== 'object' || Array.isArray(c.valueLabels))) err(p + '.valueLabels', 'valueLabels는 {"1": "라벨"} 모양이어야 합니다.');
      if (c.missingCodes !== undefined && c.missingCodes !== null && (!Array.isArray(c.missingCodes) || !c.missingCodes.every((x) => typeof x === 'number'))) err(p + '.missingCodes', 'missingCodes는 숫자 배열이어야 합니다(예: [99, -9]).');
      if (c.role === 'multi' && c.options !== undefined && (!Array.isArray(c.options) || !c.options.every((x) => typeof x === 'string'))) err(p + '.options', 'options는 보기 글자의 배열이어야 합니다.');
      if (c.role === 'attention' && c.pass !== undefined && c.pass !== null && typeof c.pass !== 'number' && !(Array.isArray(c.pass) && c.pass.every((x) => typeof x === 'number'))) err(p + '.pass', '주의확인 정답(pass)은 숫자 또는 숫자 배열이어야 합니다.');
    });
    if (hdr.length) {
      const missingCols = hdr.filter((h) => !sources.has(h));
      if (missingCols.length) { missingCols.forEach((h) => r.columns.push({ source: h, name: null, role: 'drop' })); warn('columns', `규칙에 없는 열 ${missingCols.length}개는 내보내지 않음(drop)으로 두었습니다: ${missingCols.slice(0, 5).join(', ')}${missingCols.length > 5 ? ' 외' : ''}`); }
      r.columns.sort((a, b) => hdr.indexOf(a.source) - hdr.indexOf(b.source));
    }
    const colByName = new Map(r.columns.filter((c) => c.role !== 'drop').map((c) => [c.name, c]));
    const colBySource = new Map(r.columns.map((c) => [c.source, c]));
    if (!Array.isArray(r.scales)) { if (r.scales !== undefined) err('scales', 'scales는 배열이어야 합니다.'); r.scales = []; }
    const scaleNames = new Set();
    const revRange = new Map();
    r.scales.forEach((s, i) => {
      const p = `scales[${i}]`;
      if (!s || typeof s !== 'object') { err(p, '객체가 아닙니다.'); return; }
      const bad = validName(s.name); if (bad) err(p + '.name', `척도 이름 "${s.name ?? ''}": ${bad}`);
      if (scaleNames.has(s.name)) err(p + '.name', `척도 이름 "${s.name}"이 겹칩니다.`); scaleNames.add(s.name);
      if (!Array.isArray(s.items) || s.items.length < 2) { err(p + '.items', '문항이 두 개 이상 있어야 합니다.'); return; }
      s.items = s.items.map((it, k) => {
        if (colByName.has(it)) return it;
        if (colBySource.has(it) && colBySource.get(it).role !== 'drop') { warn(`${p}.items[${k}]`, `원자료 머리글 "${it}"를 변수명 "${colBySource.get(it).name}"로 바꿔 읽었습니다.`); return colBySource.get(it).name; }
        err(`${p}.items[${k}]`, `문항 "${it}"이 columns에 없습니다.`); return it;
      });
      s.items.forEach((it, k) => { const c = colByName.get(it); if (c && !['item', 'attention'].includes(c.role)) err(`${p}.items[${k}]`, `"${it}"의 역할이 "${c.role}"입니다. 척도 문항(item)만 묶을 수 있습니다.`); });
      if (new Set(s.items).size !== s.items.length) err(p + '.items', '같은 문항이 두 번 들어 있습니다.');
      if (!Array.isArray(s.reverse)) { if (s.reverse !== undefined) err(p + '.reverse', 'reverse는 배열이어야 합니다.'); s.reverse = []; }
      s.reverse = s.reverse.map((it, k) => {
        let nm = it;
        if (!colByName.has(it) && colBySource.has(it)) { nm = colBySource.get(it).name; warn(`${p}.reverse[${k}]`, `머리글 "${it}"를 변수명 "${nm}"로 바꿔 읽었습니다.`); }
        if (!s.items.includes(nm)) err(`${p}.reverse[${k}]`, `역문항 "${it}"이 이 척도의 items에 없습니다.`);
        return nm;
      });
      const first = colByName.get(s.items[0]);
      if (s.min === undefined && first && first.range) s.min = first.range[0];
      if (s.max === undefined && first && first.range) s.max = first.range[1];
      if (typeof s.min !== 'number' || typeof s.max !== 'number' || s.min >= s.max) err(p + '.min/max', '척도 최솟값과 최댓값이 필요합니다(역채점에 씁니다).');
      s.items.forEach((it, k) => { const c = colByName.get(it); if (c && c.range && (c.range[0] !== s.min || c.range[1] !== s.max)) err(`${p}.items[${k}]`, `"${it}"의 응답 범위(${c.range.join('~')})가 척도 범위(${s.min}~${s.max})와 다릅니다. 역채점이 틀어지므로 둘을 맞추세요.`); });
      s.reverse.forEach((it) => { const key = `${s.min}~${s.max}`; if (revRange.has(it) && revRange.get(it) !== key) err(p + '.reverse', `"${it}"이 다른 척도에서 다른 범위(${revRange.get(it)})로 역채점됩니다.`); revRange.set(it, key); });
      if (s.sum === undefined) s.sum = true; if (s.mean === undefined) s.mean = true;
      if (s.meanMinRatio === undefined) s.meanMinRatio = 0.8;
      if (typeof s.meanMinRatio !== 'number' || s.meanMinRatio <= 0 || s.meanMinRatio > 1) err(p + '.meanMinRatio', 'meanMinRatio는 0보다 크고 1 이하인 비율입니다(예: 0.8).');
      if (colByName.has(s.name + '_합') || colByName.has(s.name + '_평균')) err(p + '.name', `점수 변수 "${s.name}_합/평균"이 기존 변수명과 겹칩니다.`);
    });
    // 역채점 변수 이름(…R)이 기존 변수와 겹치는지
    revRange.forEach((_, it) => { if (colByName.has(it + 'R')) err('scales', `역채점 변수 "${it}R"이 기존 변수명과 겹칩니다.`); });
    const f = r.flags = Object.assign({}, r.flags || {});
    const def = { longstring: { on: false, min: 10 }, attention: { on: false }, missingItems: { on: false, minRatio: 0.2, countAsCareless: false }, duplicateAll: { on: false, minAnswered: 1 }, duplicateId: { on: false, column: null }, speed: { on: false, minSeconds: 60 } };
    Object.keys(f).forEach((k) => { if (!def[k]) warn('flags.' + k, `알 수 없는 표시 규칙 "${k}"은 무시합니다.`); });
    Object.keys(def).forEach((k) => { f[k] = Object.assign({}, def[k], f[k] || {}); if (typeof f[k].on !== 'boolean') { err(`flags.${k}.on`, 'on은 true 또는 false입니다.'); f[k].on = false; } });
    if (f.longstring.on && !(f.longstring.min >= 2)) err('flags.longstring.min', '연속 같은 응답 기준은 2 이상인 정수입니다.');
    if (f.missingItems.on && !(f.missingItems.minRatio > 0 && f.missingItems.minRatio <= 1)) err('flags.missingItems.minRatio', '결측 비율 기준은 0~1 사이 비율입니다(예: 0.2).');
    if (typeof f.missingItems.countAsCareless !== 'boolean') f.missingItems.countAsCareless = false;
    const nItemsV = r.columns.filter((c) => c.role === 'item').length;
    if (f.longstring.on && nItemsV && f.longstring.min > nItemsV) warn('flags.longstring.min', `기준(${f.longstring.min}문항)이 척도 문항 수(${nItemsV}개)보다 커서 아무도 표시되지 않습니다.`);
    if (f.speed.on && !(f.speed.minSeconds > 0)) err('flags.speed.minSeconds', '최소 응답 시간(초)은 0보다 커야 합니다.');
    if (f.duplicateId.on) {
      const c = colBySource.get(f.duplicateId.column) || r.columns.find((x) => x.name === f.duplicateId.column);
      if (!c) err('flags.duplicateId.column', `식별값 열 "${f.duplicateId.column}"을 찾지 못했습니다.`); else f.duplicateId.column = c.source;
    }
    const atts = r.columns.filter((c) => c.role === 'attention');
    if (f.attention.on && !atts.length) err('flags.attention', '주의확인 문항(role: "attention")이 없습니다.');
    atts.forEach((c) => { if (c.pass === undefined || c.pass === null) { if (f.attention.pass !== undefined && f.attention.pass !== null) c.pass = f.attention.pass; else if (f.attention.on) err(`columns[${r.columns.indexOf(c)}].pass`, `주의확인 문항 "${c.name}"의 정답(pass)이 없습니다.`); } });
    if (f.speed.on && !r.columns.some((c) => c.role === 'duration') && !(r.columns.some((c) => c.role === 'start') && r.columns.some((c) => c.role === 'end'))) err('flags.speed', '응답 시간을 재려면 소요 시간(duration) 열이나 시작(start)·종료(end) 시각 열이 필요합니다.');
    return { errors: E, warnings: W, rules: E.length ? null : r };
  }

  // AI가 자료를 보지 못해 비워 둔 것을 진단 결과로 채운다(브라우저 안에서). 채운 곳은 경고로 알린다.
  function fillFromDiagnosis(rules, dg) {
    const W = [];
    (rules.columns || []).forEach((c, i) => {
      const d = dg.cols.find((x) => x.source === c.source); if (!d) return;
      if (c.role === 'item' || c.role === 'attention') {
        const labs = d.distinct.map(([v]) => v).filter((v) => readNumber(v, null).st === 'bad').map(norm);
        const rr = Array.isArray(c.range) && c.range.length === 2 ? c.range : null;
        if (!c.dictionary && labs.length) {
          // 규칙의 범위와 같은 길이이면서 원자료 보기를 가장 많이 읽는 사전
          const fam = d.dict && /^en/.test(d.dict) ? 'en' : 'ko';
          const pool = Object.entries(DICTS).filter(([k, x]) => (!rr || (x.min === rr[0] && x.max === rr[1])));
          const scored = pool.map(([k, x]) => [k, labs.filter((l) => x.map[l] !== undefined).length, (/^en/.test(k) ? 'en' : 'ko') === fam]).filter((e) => e[1] > 0).sort((a, b) => b[1] - a[1] || (b[2] - a[2]));
          if (scored.length) { c.dictionary = scored[0][0]; W.push({ path: `columns[${i}].dictionary`, msg: `응답이 글자 보기로 저장되어 있어 규칙의 범위(${rr ? rr.join('~') : '?'})에 맞는 사전(${DICTS[c.dictionary].label})을 넣었습니다.` }); }
        }
        if (d.rangeUnsure && (!rr || (d.range && rr.join() === d.range.join()))) { c.confirm = true; W.push({ path: `columns[${i}].confirm`, msg: `자료만으로는 몇 점 척도인지 확실하지 않은 열인데 규칙의 범위가 진단의 추정(${d.range ? d.range.join('~') : '?'})과 같습니다. 설문지와 대조해 확인하세요.` }); }
        else if (c.dictionary && DICTS[c.dictionary] && labs.length) {
          const miss = labs.filter((x) => DICTS[c.dictionary].map[x] === undefined);
          if (miss.length && d.dict && d.dict !== c.dictionary) { W.push({ path: `columns[${i}].dictionary`, msg: `"${c.dictionary}" 사전으로는 원자료 보기 ${miss.length}가지를 읽지 못해, 진단에서 찾은 "${d.dict}"로 바꿨습니다.` }); c.dictionary = d.dict; }
          else if (d.dict && d.dict !== c.dictionary && DICTS[d.dict].max !== DICTS[c.dictionary].max) W.push({ path: `columns[${i}].dictionary`, msg: `규칙의 사전은 ${DICTS[c.dictionary].max - DICTS[c.dictionary].min + 1}점, 원자료 보기로 본 척도는 ${DICTS[d.dict].max - DICTS[d.dict].min + 1}점입니다. 척도 길이를 확인하세요.` });
        }
      }
      if (c.role === 'attention' && (c.pass === undefined || c.pass === null) && d.pass !== undefined && d.pass !== null) { c.pass = d.pass; W.push({ path: `columns[${i}].pass`, msg: `머리글의 지시문에서 정답 ${d.pass}를 읽었습니다.` }); }
      if (c.role === 'category' && !c.valueMap && d.kind === 'category') { const t = draftCategory(d); c.valueMap = t.valueMap; if (!c.valueLabels) c.valueLabels = t.valueLabels; W.push({ path: `columns[${i}].valueMap`, msg: '대응표가 없어 진단에서 찾은 표기로 초안을 만들었습니다. 코드와 순서가 맞는지 보세요.' }); }
      if (c.role === 'category' && c.valueMap && Object.keys(c.valueMap).length) {
        // 대응표에 없는 원자료 표기를 같은 코드로 잇는 경우는 세 가지뿐이다:
        // (1) 띄어쓰기·기호만 다름("인문/사회"), (2) 성별 표기("남자", "여성"), (3) "1", "1 학년", "1학년 재학"처럼 "숫자+같은 단위"인 코드 표기와 숫자가 같음.
        // "대졸 미만", "1년 미만"처럼 뜻이 바뀔 수 있는 표기는 잇지 않고 결측으로 남겨 확인하게 한다.
        const keys = Object.keys(c.valueMap);
        const added = [];
        d.distinct.forEach(([v]) => {
          if (keys.some((k) => norm(k) === norm(v))) return;
          const gen = GENDER_COL.test(c.source + ' ' + (c.label || ''));
          if (NUM_RE.test(String(v).trim())) { const mk = keys.filter((k) => /^\d+[가-힣]{0,2}$/.test(norm(k)) && +norm(k).match(/^\d+/)[0] === +v); if (mk.length && new Set(mk.map((k) => c.valueMap[k])).size === 1) { c.valueMap[v] = c.valueMap[mk[0]]; added.push(`"${v}"→${c.valueMap[mk[0]]}`); } return; }
          let code = null;
          const vk = variantKey(v, gen); const m1 = keys.filter((k) => variantKey(k, gen) === vk);
          if (m1.length && new Set(m1.map((k) => c.valueMap[k])).size === 1) code = c.valueMap[m1[0]];
          if (code === null) {
            const mv = norm(v).match(/^(\d+)([가-힣]{0,2})(재학|재학중)?$/);
            if (mv) { const m2 = keys.filter((k) => { const mk = norm(k).match(/^(\d+)([가-힣]{0,2})$/); return mk && +mk[1] === +mv[1] && (!mv[2] || mv[2] === mk[2]); }); if (m2.length && new Set(m2.map((k) => c.valueMap[k])).size === 1) code = c.valueMap[m2[0]]; }
          }
          if (code !== null) { c.valueMap[v] = code; added.push(`"${v}"→${code}`); }
        });
        if (added.length) W.push({ path: `columns[${i}].valueMap`, msg: `원자료에서 대응표에 없는 표기 ${added.length}가지를 같은 뜻의 코드로 이었습니다: ${added.join(', ')}. 맞는지 보세요.` });
      }
      if (c.role === 'multi' && (!c.options || !c.options.length) && d.options) { c.options = d.options.slice(); W.push({ path: `columns[${i}].options`, msg: '보기 목록이 없어 진단에서 찾은 보기를 넣었습니다.' }); }
    });
    return W;
  }
  // ---------------------------------------------------------------- 실행
  function cronbach(mat) {
    const k = mat[0] ? mat[0].length : 0; const n = mat.length;
    if (k < 2 || n < 3) return null;
    const v = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1); };
    let s = 0; for (let j = 0; j < k; j++) s += v(mat.map((r) => r[j]));
    const tv = v(mat.map((r) => r.reduce((x, y) => x + y, 0)));
    return tv > 0 ? (k / (k - 1)) * (1 - s / tv) : null;
  }
  const r6 = (x) => Math.round(x * 1e6) / 1e6;

  function run(table, rulesIn) {
    const vr = validateRules(rulesIn, table.headers);
    if (!vr.rules) { const e = new Error('규칙에 오류가 있습니다.'); e.errors = vr.errors; throw e; }
    const rules = vr.rules;
    const n = table.rows.length;
    const idx = new Map(table.headers.map((h, j) => [h, j]));
    const cols = rules.columns.map((c) => {
      const o = Object.assign({}, c, { j: idx.get(c.source) });
      o._map = c.valueMap && ['category', 'item', 'attention'].includes(c.role) ? Object.fromEntries(Object.entries(c.valueMap).map(([k, v]) => [norm(k), v])) : null;
      o._dict = c.dictionary ? DICTS[c.dictionary].map : null;
      o._miss = new Set(c.missingCodes || []);
      if (!o.outOfRange) o.outOfRange = ['item', 'attention'].includes(c.role) ? 'missing' : 'flag';
      return o;
    });
    const ids = Array.from({ length: n }, (_, i) => 'R' + String(i + 1).padStart(Math.max(3, String(n).length), '0'));
    const out = { 응답ID: ids, 원자료_행: table.rowNo.slice() };
    const order = ['응답ID', '원자료_행'];
    const meta = {}; // 변수명 -> 코드북 정보
    meta['응답ID'] = { label: '응답 식별 번호(원자료 행 순서대로 부여)', type: '문자', src: '(새로 만듦)' };
    meta['원자료_행'] = { label: '원자료 파일에서 이 응답이 있던 행 번호', type: '숫자', src: '(새로 만듦)' };
    const changes = []; const recode = new Map(); const marks = []; // marks: [i, 변수, 종류]
    const log = (kind, i, v, orig, now, why) => changes.push({ 종류: kind, 응답ID: ids[i], 원자료_행: table.rowNo[i], 변수: v, 원래값: orig === null || orig === undefined ? '' : (orig instanceof Date ? fmtDate(orig) : String(orig)), 처리후: now === null || now === undefined ? '' : now, 설명: why });
    const oorCount = new Array(n).fill(0); const rangeFlag = new Array(n).fill(0);
    for (const c of cols) {
      if (c.role === 'drop') continue;
      const raw = table.rows.map((r) => r[c.j]);
      if (c.role === 'timestamp' || c.role === 'start' || c.role === 'end') {
        out[c.name] = raw.map((v) => { const d = dateFrom(v); return d ? fmtDate(d) : (isBlank(v) ? null : String(v)); });
        out['_d_' + c.name] = raw.map((v) => dateFrom(v));
        order.push(c.name); meta[c.name] = { label: c.label || ROLE_KO[c.role], type: '날짜시간', src: c.source, role: c.role };
        continue;
      }
      if (c.role === 'text' || c.role === 'id') {
        out[c.name] = raw.map((v) => (isBlank(v) ? null : (v instanceof Date ? fmtDate(v) : String(v))));
        order.push(c.name); meta[c.name] = { label: c.label || ROLE_KO[c.role], type: '문자', src: c.source, role: c.role };
        continue;
      }
      if (c.role === 'multi') {
        const opts = (c.options && c.options.length ? c.options : []).slice();
        const cm = (x) => String(x).trim().replace(/\s*,\s*/g, ', ');
        const sorted = opts.map((o, k) => [cm(o), k]).sort((a, b) => b[0].length - a[0].length);
        const cols2 = opts.map((o, k) => c.name + '_' + (k + 1));
        const etc = []; const vals = opts.map(() => []);
        raw.forEach((v, i) => {
          if (isBlank(v)) { vals.forEach((a) => a.push(null)); etc.push(null); return; }
          let s = ', ' + cm(v) + ', '; const hit = new Set();
          for (const [o, k] of sorted) { const key = ', ' + o + ', '; if (s.includes(key)) { hit.add(k); s = s.replace(key, ', '); } }
          vals.forEach((a, k) => a.push(hit.has(k) ? 1 : 0));
          const rest = s.replace(/^[,\s]+|[,\s]+$/g, '');
          etc.push(rest || null);
          if (rest) log('복수 선택: 보기 밖 응답', i, c.name + '_기타', v, rest, '보기 목록에 없는 글자는 _기타 열에 그대로 옮김');
        });
        cols2.forEach((nm, k) => { out[nm] = vals[k]; order.push(nm); meta[nm] = { label: `${c.label || c.source}: ${opts[k]}`, type: '숫자', vlabels: { 0: '선택 안 함', 1: '선택' }, level: '명목', src: c.source, role: 'multi' }; });
        if (etc.some((x) => x)) { out[c.name + '_기타'] = etc; order.push(c.name + '_기타'); meta[c.name + '_기타'] = { label: `${c.label || c.source}: 보기 밖 응답`, type: '문자', src: c.source, role: 'multi' }; }
        continue;
      }
      // 숫자로 읽는 열: item, attention, category, number, duration
      // 한 열에 단위가 둘 이상 섞였으면(예: 년, 개월) 단위 붙은 값은 바꾸지 않는다
      const unitSet = new Set(raw.map((v) => readNumber(v, c, table.typed).unit).filter(Boolean));
      const mixed = unitSet.size > 1;
      const WHY = { space: '앞뒤 공백을 지우고 숫자로 읽음', stored: '글자 칸에 저장된 숫자를 숫자로 읽음', fullwidth: '전각 숫자를 숫자로 읽음', circled: '원 번호(①)를 숫자로 읽음', labelled: '"숫자 = 보기" 꼴에서 앞의 숫자를 읽음', unit: '숫자 바로 뒤의 단위를 떼고 숫자만 읽음' };
      const vals = raw.map((v, i) => {
        let rd = readNumber(v, c, table.typed);
        if (mixed && rd.unit) { rd = { v: null, st: 'bad', mixed: true }; }
        if (c.role === 'category' && c._map && (rd.st === 'ok' || rd.st === 'text_num') && (Object.keys(c._map).some((k) => !NUM_RE.test(k)) || !Object.values(c._map).includes(rd.v))) rd = { v: null, st: 'bad', notcode: true };
        if (c.role === 'category' && rd.st === 'bad' && c._map === null && !isBlank(v)) rd = { v: null, st: 'bad' };
        let x = rd.v;
        if (rd.st === 'map' && c.role === 'category') {
          const k = c.name + '\u0001' + String(v) + '\u0001' + x; recode.set(k, (recode.get(k) || 0) + 1);
        } else if (rd.st === 'map' || rd.st === 'dict' || rd.st === 'text_num') {
          log('글자 -> 숫자', i, c.name, v, x, rd.st === 'text_num' ? (WHY[rd.why] || '숫자만 읽음') + (rd.approx ? '. "약"이 붙은 어림값이므로 확인 필요' : '') : `응답 보기 글자를 숫자로 바꿈(${rd.st === 'dict' ? DICTS[c.dictionary].label : '사용자 지정 대응표'})`);
          marks.push([i, c.name, 'text']);
        } else if (rd.st === 'bad') {
          log('읽을 수 없음 -> 결측', i, c.name, v, null, rd.notcode ? '대응표의 코드에 없는 숫자라 결측으로 둠(확인 필요)' : rd.mixed ? `한 열에 단위가 섞여 있어(${[...unitSet].join(', ')}) 숫자로 바꾸지 않고 결측으로 둠(확인 필요)` : c.role === 'category' ? '대응표에 없는 표기라 결측으로 둠(확인 필요)' : '숫자로 읽을 수 없어 결측으로 둠');
          marks.push([i, c.name, 'out']);
        }
        if (x !== null && c._miss.has(x)) { log('결측 코드 -> 결측', i, c.name, v, null, `결측 코드(${[...c._miss].join(', ')})로 지정된 값`); marks.push([i, c.name, 'blank']); return null; }
        if (x !== null && c.range && (x < c.range[0] || x > c.range[1] || (['item', 'attention'].includes(c.role) && !Number.isInteger(x)))) {
          if (c.outOfRange === 'missing') {
            const frac = x >= c.range[0] && x <= c.range[1];
            log('범위 밖 -> 결측', i, c.name, v, null, frac ? '정수가 아닌 응답이라 결측 처리. 원래 값은 이 표와 원자료에 남음' : `허용 범위 ${c.range[0]}~${c.range[1]} 밖이라 결측 처리. 원래 값은 이 표와 원자료에 남음`);
            marks.push([i, c.name, 'out']); oorCount[i]++; return null;
          }
          log('범위 점검(표시만)', i, c.name, v, x, `범위 ${c.range[0]}~${c.range[1]} 밖. 값은 바꾸지 않고 표시만 함`);
          marks.push([i, c.name, 'out']); rangeFlag[i] = 1;
        }
        if (x === null && rd.st === 'blank') marks.push([i, c.name, 'blank']);
        return x;
      });
      out[c.name] = vals; order.push(c.name);
      meta[c.name] = { label: c.label || (c.source.length > 60 ? c.source.slice(0, 60) + '…' : c.source), type: '숫자', src: c.source, role: c.role, range: c.range, level: c.role === 'category' ? '명목' : c.role === 'number' || c.role === 'duration' ? '척도' : '순서', vlabels: c.valueLabels || (c.dictionary ? Object.fromEntries(dictLabels(c.dictionary)) : null), miss: [...c._miss] };
    }
    // 역채점
    const revOf = new Map(); const revVars = [];
    for (const s of rules.scales) for (const it of s.reverse) if (!revOf.has(it)) { revOf.set(it, it + 'R'); revVars.push([it, s]); }
    for (const [it, s] of revVars) {
      out[it + 'R'] = out[it].map((x) => (x === null ? null : (s.min + s.max) - x));
      order.push(it + 'R');
      meta[it + 'R'] = { label: `${it} 역채점(${s.min + s.max} - 원 응답)`, type: '숫자', src: '(새로 만듦)', level: '순서', range: [s.min, s.max], role: 'reversed', vlabels: meta[it].vlabels };
    }
    const use = (v) => revOf.get(v) || v;
    // 척도 점수
    const scoreVars = []; const alpha = []; const proratedBy = {};
    for (const s of rules.scales) {
      const k = s.items.length; const need = Math.ceil(s.meanMinRatio * k - 1e-9);
      const sums = [], means = []; let prorated = 0;
      for (let i = 0; i < n; i++) {
        const v = s.items.map((it) => out[use(it)][i]).filter((x) => x !== null);
        if (v.length < k && v.length >= need && v.length) prorated++;
        sums.push(v.length === k ? v.reduce((a, b) => a + b, 0) : null);
        means.push(v.length >= need && v.length ? r6(v.reduce((a, b) => a + b, 0) / v.length) : null);
      }
      proratedBy[s.name] = prorated;
      if (s.sum) { out[s.name + '_합'] = sums; order.push(s.name + '_합'); scoreVars.push(s.name + '_합'); meta[s.name + '_합'] = { label: `${s.label || s.name} 합계`, type: '숫자', src: '(새로 만듦)', level: '척도', note: `${k}문항 모두 응답해야 계산, 아니면 결측. 역문항은 R 변수 사용`, role: 'score' }; }
      if (s.mean) { out[s.name + '_평균'] = means; order.push(s.name + '_평균'); scoreVars.push(s.name + '_평균'); meta[s.name + '_평균'] = { label: `${s.label || s.name} 평균`, type: '숫자', src: '(새로 만듦)', level: '척도', note: `${need}문항 이상 응답 시 응답한 문항의 평균(${Math.round(s.meanMinRatio * 100)}% 규칙), 아니면 결측. 역문항은 R 변수 사용`, role: 'score' }; }
    }
    // 표시
    const f = rules.flags;
    const itemVars = cols.filter((c) => c.role === 'item').map((c) => c.name);
    const itemRange = cols.filter((c) => c.role === 'item').map((c) => String(c.range));
    const missPct = Math.round(f.missingItems.minRatio * 1000) / 10; // 기준(%)을 소수 한 자리로 고정해 JS·R·SPSS가 같은 값을 쓰게 함
    const attCols = cols.filter((c) => c.role === 'attention' && c.pass !== undefined && c.pass !== null && !(Array.isArray(c.pass) && !c.pass.length));
    const missN = [], missR = [], missFlag = [], longest = [], attFail = [], dup = [], dupOf = [], idDup = [], idDupOf = [], secs = [], fast = [], careless = [], reason = [];
    const seen = new Map(); const seenId = new Map();
    const sigVars = order.filter((v) => !['응답ID', '원자료_행'].includes(v) && meta[v] && !['timestamp', 'start', 'end', 'duration', 'id', 'reversed', 'score'].includes(meta[v].role));
    const durCol = cols.find((c) => c.role === 'duration'), stCol = cols.find((c) => c.role === 'start'), enCol = cols.find((c) => c.role === 'end');
    const idCol = f.duplicateId.on ? cols.find((c) => c.source === f.duplicateId.column) : null;
    for (let i = 0; i < n; i++) {
      const vals = itemVars.map((v) => out[v][i]);
      const mc = vals.filter((x) => x === null).length;
      missN.push(mc); missR.push(itemVars.length ? Math.round(1000 * mc / itemVars.length) / 10 : 0);
      // 응답 범위가 다른 척도(예: 5점과 7점)가 이어지는 곳에서는 새로 센다
      let best = 0, cur = 0, prev = null;
      vals.forEach((x, k) => { if (k > 0 && itemRange[k] !== itemRange[k - 1]) { cur = 0; prev = null; } if (x !== null && x === prev) cur++; else if (x !== null) cur = 1; else cur = 0; prev = x; if (cur > best) best = cur; });
      longest.push(best);
      const af = attCols.some((c) => { const a = out[c.name][i]; const pass = Array.isArray(c.pass) ? c.pass : [c.pass]; return a !== null && !pass.includes(a); }) ? 1 : 0;
      attFail.push(af);
      const sig = JSON.stringify(sigVars.map((v) => out[v][i]));
      // 모든 문항을 한 값으로 답한 응답끼리 같은 것은 중복 제출로 보지 않는다(서로 다른 사람의 일자 응답일 수 있음, 일자 응답 규칙이 따로 잡음)
      const nonNull = itemVars.length ? vals.filter((x) => x !== null) : sigVars.map((v) => out[v][i]).filter((x) => x !== null);
      const needAns = itemVars.length ? f.duplicateAll.minAnswered : Math.max(1, Math.ceil(sigVars.length * 2 / 3));
      if (f.duplicateAll.on && nonNull.length >= needAns && new Set(nonNull.map(String)).size > 1 && seen.has(sig)) { dup.push(1); dupOf.push(ids[seen.get(sig)]); }
      else { dup.push(0); dupOf.push(null); if (!seen.has(sig)) seen.set(sig, i); }
      if (idCol) {
        const v = table.rows[i][idCol.j];
        if (!isBlank(v)) { const k = norm(v); if (seenId.has(k)) { idDup.push(1); idDupOf.push(ids[seenId.get(k)]); } else { seenId.set(k, i); idDup.push(0); idDupOf.push(null); } }
        else { idDup.push(0); idDupOf.push(null); }
      }
      let sec = null;
      if (durCol) sec = out[durCol.name][i];
      else if (stCol && enCol) { const a = out['_d_' + stCol.name][i], b = out['_d_' + enCol.name][i]; sec = a && b ? Math.round((b - a) / 1000) : null; }
      secs.push(sec); fast.push(f.speed.on && sec !== null && sec < f.speed.minSeconds ? 1 : 0);
      const rs = [];
      if (f.longstring.on && best >= f.longstring.min) rs.push(`연속 동일 응답 ${best}문항`);
      if (f.attention.on && af) rs.push('주의확인 문항 불일치');
      const mf = f.missingItems.on && missR[i] >= missPct ? 1 : 0; missFlag.push(mf);
      if (mf && f.missingItems.countAsCareless) rs.push(`문항 결측 ${Math.round(missR[i])}%`);
      if (fast[i]) rs.push(`응답 시간 ${sec}초(기준 ${f.speed.minSeconds}초 미만)`);
      careless.push(rs.length ? 1 : 0); reason.push(rs.join('; ') || null);
    }
    const addFlag = (nm, arr, m) => { out[nm] = arr; order.push(nm); meta[nm] = Object.assign({ type: '숫자', src: '(새로 만듦)', role: 'flag' }, m); };
    addFlag('결측문항수', missN, { label: `척도 문항 ${itemVars.length}개 중 비어 있거나 결측 처리된 문항 수`, level: '척도' });
    addFlag('결측비율', missR, { label: '문항 결측 비율(%)', level: '척도' });
    if (f.missingItems.on) addFlag('결측과다', missFlag, { label: `척도 문항의 ${missPct}% 이상이 결측`, vlabels: { 0: '아님', 1: '결측 많음' }, level: '명목' });
    addFlag('범위밖값수', oorCount, { label: '범위 밖이라 결측 처리한 칸 수', level: '척도' });
    if (rangeFlag.some((x) => x)) addFlag('범위점검', rangeFlag, { label: '범위를 넘었지만 값을 유지한 칸이 있음(표시만)', vlabels: { 0: '없음', 1: '있음' }, level: '명목' });
    addFlag('연속동일응답', longest, { label: '문항 순서대로 같은 값이 이어진 가장 긴 길이', level: '척도' });
    if (attCols.length) addFlag('주의확인불합격', attFail, { label: '주의확인 문항에 정답이 아닌 값을 고른 경우', vlabels: { 0: '통과 또는 미응답', 1: '불합격' }, level: '명목' });
    if (f.duplicateAll.on) { addFlag('중복의심', dup, { label: '앞선 응답과 모든 답이 같은 응답', vlabels: { 0: '아님', 1: '중복 의심' }, level: '명목' }); addFlag('중복원본ID', dupOf, { label: '같은 답을 가진 앞선 응답ID', type: '문자' }); }
    if (idCol) { addFlag('식별값중복', idDup, { label: `같은 ${idCol.name || idCol.source} 값이 앞에 이미 있음`, vlabels: { 0: '아님', 1: '중복' }, level: '명목' }); addFlag('식별값중복원본ID', idDupOf, { label: '같은 식별값을 가진 앞선 응답ID', type: '문자' }); }
    if (durCol || (stCol && enCol)) { addFlag('응답소요초', secs, { label: '응답에 걸린 시간(초)', level: '척도' }); if (f.speed.on) addFlag('빠른응답', fast, { label: `응답 시간이 ${f.speed.minSeconds}초 미만`, vlabels: { 0: '아님', 1: '빠름' }, level: '명목' }); }
    addFlag('불성실의심', careless, { label: `불성실 응답 의심 규칙에 하나라도 해당(${[f.longstring.on ? '일자 응답' : '', f.attention.on && attCols.length ? '주의확인' : '', f.missingItems.on && f.missingItems.countAsCareless ? '결측' : '', f.speed.on && (durCol || (stCol && enCol)) ? '빠른 응답' : ''].filter(Boolean).join(', ')})`, vlabels: { 0: '해당 없음', 1: '의심' }, level: '명목' });
    addFlag('불성실사유', reason, { label: '해당한 규칙', type: '문자' });
    addFlag('제외결정', new Array(n).fill(null), { label: '연구자가 분석 제외 여부를 직접 적는 칸(비워서 드림)', type: '문자' });
    // 신뢰도
    const flagged = Array.from({ length: n }, (_, i) => careless[i] === 1 || dup[i] === 1 || (idDup[i] === 1));
    for (const s of rules.scales) {
      const uv = s.items.map(use);
      const full = []; for (let i = 0; i < n; i++) if (uv.every((v) => out[v][i] !== null)) full.push(i);
      const keep = full.filter((i) => !flagged[i]);
      const a1 = cronbach(full.map((i) => uv.map((v) => out[v][i]))), a2 = cronbach(keep.map((i) => uv.map((v) => out[v][i])));
      alpha.push({ 척도: s.label || s.name, 문항수: s.items.length, 사례수_전체: full.length, 알파_전체: a1 === null ? null : Math.round(a1 * 1e4) / 1e4, 사례수_표시제외: keep.length, 알파_표시제외: a2 === null ? null : Math.round(a2 * 1e4) / 1e4 });
    }
    const flaggedRows = [];
    for (let i = 0; i < n; i++) if (careless[i] || dup[i] || idDup[i] || oorCount[i] || rangeFlag[i] || missFlag[i]) flaggedRows.push({ 응답ID: ids[i], 원자료_행: table.rowNo[i], 불성실의심: careless[i], 불성실사유: reason[i] || '', 결측과다: missFlag[i] || 0, 중복의심: dup[i] || 0, 중복원본ID: dupOf[i] || '', 식별값중복: idDup[i] || 0, 범위밖값수: oorCount[i], 범위점검: rangeFlag[i], 결측문항수: missN[i] });
    const recodeRows = [...recode.entries()].map(([k, cnt]) => { const [v, o, x] = k.split('\u0001'); return { 변수: v, 원래표기: o, 코드: +x, 건수: cnt }; });
    const codebook = order.map((v) => {
      const m = meta[v] || {};
      const lab = m.vlabels ? Object.entries(m.vlabels).map(([k, l]) => `${k}=${l}`).join('; ') : '';
      const scale = rules.scales.filter((s) => s.items.includes(v) || s.items.includes(v.replace(/R$/, ''))).map((s) => s.name).join(', ');
      return { 변수명: v, '변수 설명': m.label || '', 유형: m.type || '', '값 라벨': lab, '측정 수준': m.level || '', '값 범위': m.range ? `${m.range[0]}~${m.range[1]}` : '', 역채점: revOf.has(v) ? '예(역문항)' : m.role === 'reversed' ? '(역채점 결과)' : '', '소속 척도': scale, '결측 처리': m.miss && m.miss.length ? `결측 코드 ${m.miss.join(', ')}` : (['item', 'attention'].includes(m.role) ? '비어 있거나 범위 밖이면 결측(값을 채우지 않음)' : ''), 비고: m.note || '', '원자료 열 이름': m.src || '' };
    });
    const dropped = cols.filter((c) => c.role === 'drop').map((c) => c.source);
    const summary = {
      n, variables: order.length, platform: table.platform, dropped,
      textConverted: changes.filter((e) => e.종류 === '글자 -> 숫자').length,
      outOfRange: changes.filter((e) => e.종류 === '범위 밖 -> 결측').length,
      rangeChecked: changes.filter((e) => e.종류 === '범위 점검(표시만)').length,
      unreadable: changes.filter((e) => e.종류 === '읽을 수 없음 -> 결측').length,
      missingCode: changes.filter((e) => e.종류 === '결측 코드 -> 결측').length,
      categoryUnmapped: changes.filter((e) => e.종류 === '읽을 수 없음 -> 결측' && meta[e.변수] && meta[e.변수].role === 'category').reduce((m, e) => { m[e.변수] = (m[e.변수] || 0) + 1; return m; }, {}),
      itemCount: itemVars.length, dupBasis: itemVars.length || sigVars.length,
      recoded: recodeRows.reduce((a, b) => a + b.건수, 0),
      careless: careless.reduce((a, b) => a + b, 0), duplicates: dup.reduce((a, b) => a + b, 0), idDuplicates: idDup.reduce((a, b) => a + b, 0),
      attentionFail: attFail.reduce((a, b) => a + b, 0), fast: fast.reduce((a, b) => a + b, 0),
      longstringRule: f.longstring.on ? longest.filter((x) => x >= f.longstring.min).length : null,
      missingRule: f.missingItems.on ? missFlag.reduce((a, b) => a + b, 0) : null, missingCountsAsCareless: !!f.missingItems.countAsCareless,
      anyFlag: flagged.filter((x, i) => x || missFlag[i]).length,
      blankItemCells: cols.filter((c) => c.role === 'item').reduce((a, c) => a + table.rows.filter((r) => isBlank(r[c.j])).length, 0),
      blankSkipped: table.blankSkipped || 0, prorated: proratedBy,
    };
    Object.keys(out).filter((k) => k.startsWith('_d_')).forEach((k) => { delete out[k]; });
    changes.sort((a, b) => a.원자료_행 - b.원자료_행 || (a.변수 < b.변수 ? -1 : 1));
    return { rules, warnings: vr.warnings, order, data: out, codebook, changes, recode: recodeRows, flagged: flaggedRows, alpha, marks, summary, meta, itemVars, revVars: revVars.map(([it]) => it), scoreVars };
  }
  function dictLabels(key) {
    const d = DICTS[key]; if (!d) return [];
    const best = {}; Object.entries(d.map).forEach(([k, v]) => { if (!best[v]) best[v] = k; });
    return Object.entries(best).map(([v, k]) => [v, prettyLabel(k)]);
  }
  function prettyLabel(k) {
    const known = { '전혀그렇지않다': '전혀 그렇지 않다', '그렇지않다': '그렇지 않다', '보통이다': '보통이다', '그렇다': '그렇다', '매우그렇다': '매우 그렇다', '약간그렇지않다': '약간 그렇지 않다', '약간그렇다': '약간 그렇다', '전혀없다': '전혀 없다', '거의없다': '거의 없다', '가끔있다': '가끔 있다', '자주있다': '자주 있다', '항상있다': '항상 있다', stronglydisagree: 'Strongly disagree', disagree: 'Disagree', somewhatdisagree: 'Somewhat disagree', neitheragreenordisagree: 'Neither agree nor disagree', somewhatagree: 'Somewhat agree', agree: 'Agree', stronglyagree: 'Strongly agree' };
    return known[k] || k;
  }

  // ---------------------------------------------------------------- 문법 생성
  const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  const rq = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const bt = (s) => '`' + String(s).replace(/`/g, '') + '`';

  // 바이트 한도에 맞춰 자르기(SPSS 라벨 256바이트)
  function cutBytes(s, max) { let o = ''; for (const ch of String(s)) { if (byteLen(o + ch) > max) return o + '…'; o += ch; } return o; }
  // 척도 문항을 응답 범위가 같은 연속 구간으로 나눈다(일자 응답을 구간마다 센다)
  function itemSegments(res) {
    const segs = []; let cur = null;
    res.itemVars.forEach((v) => { const r = String(res.meta[v].range); if (!cur || cur.r !== r) { cur = { r, vars: [] }; segs.push(cur); } cur.vars.push(v); });
    return segs.map((x) => x.vars);
  }

  function toSPSS(res, opts) {
    opts = opts || {};
    const R = res.rules; const L = [];
    const items = res.itemVars;
    L.push(`* 설문 자료 정리: SPSS 문법 (${R.title || '설문 자료'}). 논문 통계 도구 자료 정리 ${VERSION}에서 만듦 ${opts.date || ''}.`);
    L.push('* 하는 일: 도구가 내려 준 정리본을 열고, 역채점·척도 점수·표시 변수를 SPSS 안에서 이름 뒤에 _SPSS 를 붙여 따로 계산한 뒤');
    L.push('*   도구의 값과 하나하나 대조한다(마지막 빈도표의 "다름"이 0이면 같다). 이어서 변수 설명, 값 라벨, 측정 수준을 붙인다.');
    L.push('* 글자 응답을 숫자로 바꾸는 단계와 범위 밖 값 처리는 정리본에 이미 들어 있다(값_변경내역 시트). 원자료부터 전부 다시 하려면 R 코드를 쓴다.');
    L.push('* 중복 응답 판정은 도구가 만든 열을 그대로 쓴다.');
    L.push('* 필요: SPSS 25 이상 권장(한글 변수명을 쓰려면 유니코드 모드: 편집 > 옵션 > 언어 > 유니코드). 이 문법은 SPSS가 없는 곳에서 만들어 실행해 보지 못했다.');
    L.push('* 아래 FILE 경로를 정리본 파일이 있는 곳으로 바꾼다(예: C:\\논문\\자료\\...xlsx).');
    L.push('');
    L.push(`GET DATA /TYPE=XLSX /FILE='${opts.xlsxName || '정리된자료.xlsx'}' /SHEET=name '정리된자료' /CELLRANGE=FULL /READNAMES=ON.`);
    L.push('DATASET NAME 정리본 WINDOW=FRONT.');
    L.push('');
    const wrap = (arr, sep) => { sep = sep === undefined ? ', ' : sep; const out = []; let line = ''; arr.forEach((x, i) => { const t = x + (i < arr.length - 1 ? sep : ''); if ((line + t).length > 90) { out.push(line.trimEnd()); line = '  '; } line += t; }); out.push(line); return out.join('\n'); };
    const cmp = [];
    const S = (v) => v + '_SPSS';
    const useS = (v) => (res.revVars.includes(v) ? S(v + 'R') : v);
    if (res.revVars.length) {
      L.push('* 1. 역채점(원 문항은 그대로 두고 새 변수로).');
      const done = new Set();
      for (const s of R.scales) for (const it of s.reverse) if (!done.has(it)) { done.add(it); L.push(`COMPUTE ${S(it + 'R')} = ${s.min + s.max} - ${it}.`); cmp.push([it + 'R', S(it + 'R')]); }
      L.push('EXECUTE.', '');
    }
    if (R.scales.length) {
      L.push('* 2. 척도 점수. 합계는 모든 문항에 응답해야 계산(SUM.n), 평균은 정한 비율 이상 응답 시 응답한 문항의 평균(MEAN.n).');
      for (const s of R.scales) {
        const k = s.items.length; const need = Math.ceil(s.meanMinRatio * k - 1e-9); const list = s.items.map(useS);
        if (s.sum) { L.push(`COMPUTE ${S(s.name + '_합')} = SUM.${k}(${wrap(list)}).`); cmp.push([s.name + '_합', S(s.name + '_합')]); }
        if (s.mean) { L.push(`COMPUTE ${S(s.name + '_평균')} = MEAN.${need}(${wrap(list)}).`); cmp.push([s.name + '_평균', S(s.name + '_평균')]); }
      }
      L.push('EXECUTE.', '');
    }
    if (items.length) {
      const f = R.flags; const missPct = Math.round(f.missingItems.minRatio * 1000) / 10;
      L.push('* 3. 표시 변수(삭제하지 않고 표시만 한다).');
      L.push(`COUNT ${S('결측문항수')} = ${wrap(items, ' ')} (SYSMIS).`);
      L.push(`COMPUTE ${S('결측비율')} = RND(1000 * ${S('결측문항수')} / ${items.length}) / 10.`);
      cmp.push(['결측문항수', S('결측문항수')], ['결측비율', S('결측비율')]);
      L.push(`COMPUTE ${S('연속동일응답')} = 0.`);
      itemSegments(res).forEach((seg, g) => {
        const V = `#v${g + 1}`;
        L.push(`* 일자 응답 구간 ${g + 1}: 응답 범위가 같은 문항 ${seg.length}개.`);
        L.push(`VECTOR ${V}(${seg.length}).`);
        L.push(`DO REPEAT x = ${wrap(seg, ' ')}`, `  /k = 1 TO ${seg.length}.`, `COMPUTE ${V}(k) = x.`, 'END REPEAT.');
        L.push('COMPUTE #cur = 0.');
        L.push(`LOOP #k = 1 TO ${seg.length}.`,
          `  DO IF MISSING(${V}(#k)).`, '    COMPUTE #cur = 0.',
          '  ELSE IF #k = 1.', '    COMPUTE #cur = 1.',
          `  ELSE IF MISSING(${V}(#k - 1)).`, '    COMPUTE #cur = 1.',
          `  ELSE IF ${V}(#k) = ${V}(#k - 1).`, '    COMPUTE #cur = #cur + 1.',
          '  ELSE.', '    COMPUTE #cur = 1.', '  END IF.',
          `  COMPUTE ${S('연속동일응답')} = MAX(${S('연속동일응답')}, #cur).`, 'END LOOP.');
      });
      cmp.push(['연속동일응답', S('연속동일응답')]);
      const atts = R.columns.filter((c) => c.role === 'attention' && c.pass !== undefined && c.pass !== null && !(Array.isArray(c.pass) && !c.pass.length));
      if (atts.length) {
        L.push(`COMPUTE ${S('주의확인불합격')} = 0.`);
        atts.forEach((c) => { const pass = Array.isArray(c.pass) ? c.pass : [c.pass]; L.push(`IF (NOT MISSING(${c.name}) AND ${pass.map((p) => `${c.name} NE ${p}`).join(' AND ')}) ${S('주의확인불합격')} = 1.`); });
        cmp.push(['주의확인불합격', S('주의확인불합격')]);
      }
      if (f.missingItems.on) { L.push(`COMPUTE ${S('결측과다')} = (${S('결측비율')} >= ${missPct}).`); cmp.push(['결측과다', S('결측과다')]); }
      const conds = [];
      if (f.longstring.on) conds.push(`${S('연속동일응답')} >= ${f.longstring.min}`);
      if (f.attention.on && atts.length) conds.push(`${S('주의확인불합격')} = 1`);
      if (f.missingItems.on && f.missingItems.countAsCareless) conds.push(`${S('결측과다')} = 1`);
      if (f.speed.on && res.order.includes('응답소요초')) conds.push(`(NOT MISSING(응답소요초) AND 응답소요초 < ${f.speed.minSeconds})`);
      L.push(`COMPUTE ${S('불성실의심')} = ${conds.length ? `(${conds.join(' OR ')})` : '0'}.`);
      cmp.push(['불성실의심', S('불성실의심')]);
      L.push('EXECUTE.', '');
    }
    if (cmp.length) {
      L.push('* 4. 도구 결과와 대조: 두 값이 다르거나 한쪽만 결측이면 1을 더한다. 빈도표에서 "다름"이 0이면 모두 같다.');
      L.push('COMPUTE 대조_다른칸 = 0.');
      cmp.forEach(([a, b]) => { L.push(`IF (MISSING(${a}) NE MISSING(${b})) 대조_다른칸 = 대조_다른칸 + 1.`); L.push(`IF (NOT MISSING(${a}) AND NOT MISSING(${b})) 대조_다른칸 = 대조_다른칸 + (ABS(${a} - ${b}) > 0.000001).`); });
      L.push('COMPUTE 대조_결과 = (대조_다른칸 > 0).');
      L.push("VALUE LABELS 대조_결과 0 '같음' 1 '다름'.");
      L.push('FREQUENCIES VARIABLES=대조_결과.', '');
    }
    L.push('* 5. 결측 코드, 변수 설명, 값 라벨, 측정 수준.');
    const missCols = R.columns.filter((c) => c.role !== 'drop' && c.missingCodes && c.missingCodes.length);
    missCols.forEach((c) => { const mc = c.missingCodes.slice().sort((a, b) => a - b); L.push(mc.length <= 3 ? `MISSING VALUES ${c.name} (${mc.join(', ')}).` : `* ${c.name} 의 결측 코드 ${mc.join(', ')} 는 정리본에서 이미 빈 칸으로 바뀌었다(SPSS 는 결측 값을 3개까지만 지정할 수 있다).`); });
    const vl = []; const val = [];
    res.order.forEach((v) => { const m = res.meta[v]; if (m && m.label) vl.push(`  ${v} ${q(cutBytes(m.label, 250))}`); if (m && m.vlabels && Object.keys(m.vlabels).length && m.type === '숫자') val.push(`  /${v} ${Object.entries(m.vlabels).map(([k, l]) => `${k} ${q(cutBytes(l, 120))}`).join(' ')}`); });
    if (vl.length) L.push('VARIABLE LABELS', vl.join('\n') + '.');
    if (val.length) L.push('VALUE LABELS', val.join('\n').replace(/^  \//, '  ') + '.');
    const lv = { 명목: [], 순서: [], 척도: [] };
    res.order.forEach((v) => { const m = res.meta[v]; if (m && m.type === '숫자' && lv[m.level]) lv[m.level].push(v); });
    const lvMap = { 명목: 'NOMINAL', 순서: 'ORDINAL', 척도: 'SCALE' };
    Object.entries(lv).forEach(([k, vs]) => { if (vs.length) L.push(`VARIABLE LEVEL ${wrap(vs, ' ')} (${lvMap[k]}).`); });
    L.push('');
    if (R.scales.length) {
      L.push('* 6. 신뢰도(크론바흐 알파). 논문에 보고할 알파는 제외할 응답을 정한 뒤 최종 분석 표본에서 계산한다.');
      L.push('* 제외하기로 정한 응답이 있으면 정리본의 제외결정 칸에 "제외"라고 적고 아래 두 줄의 * 를 지운 뒤 실행한다.');
      L.push("* COMPUTE 분석포함 = (제외결정 NE '제외').", '* FILTER BY 분석포함.');
      R.scales.forEach((s) => L.push(`RELIABILITY /VARIABLES=${wrap(s.items.map((v) => (res.revVars.includes(v) ? v + 'R' : v)), ' ')}`, `  /SCALE(${q(s.name)}) ALL /MODEL=ALPHA /SUMMARY=TOTAL.`));
      L.push('* FILTER OFF.');
    }
    return L.join('\n') + '\n';
  }

  function toR(res, table, opts) {
    opts = opts || {};
    const R = res.rules; const L = [];
    const enc = table.encoding === 'euc-kr' ? 'CP949' : 'UTF-8-BOM';
    L.push(`# 설문 자료 정리: R 코드 (${R.title || '설문 자료'}). 논문 통계 도구 자료 정리 ${VERSION}에서 만듦 ${opts.date || ''}`);
    L.push('# 원자료 파일을 읽어 도구와 같은 규칙으로 정리한다. 원자료 파일은 읽기만 하고 바꾸지 않는다.');
    L.push('# 필요: R 4.2 이상(윈도에서 한글 변수명), 엑셀 파일이면 readxl 패키지: install.packages("readxl")');
    L.push('# 사용: RAW_FILE 을 원자료 파일 경로로 바꾸고 전체 실행. 결과는 정리된자료_R.csv(엑셀에서 한글이 보이도록 BOM 포함)로 저장된다.');
    L.push('');
    L.push('if (!isTRUE(l10n_info()$`UTF-8`) && .Platform$OS.type != "windows") invisible(Sys.setlocale("LC_CTYPE", "en_US.UTF-8"))');
    L.push(`RAW_FILE <- ${rq(/\.(xlsx|xls|csv|tsv|txt)$/i.test(table.fileName || '') ? table.fileName : '붙여넣은자료.tsv')}${/\.(xlsx|xls|csv|tsv|txt)$/i.test(table.fileName || '') ? '' : '   # 붙여 넣은 자료: 같은 표를 탭 구분 파일(붙여넣은자료.tsv)로 저장해 쓰세요'}`);
    L.push(`HEADER_ROWS <- ${table.headerRows}   # 머리글 줄 수(${table.platform === 'qualtrics' ? 'Qualtrics: 변수명, 문항, ImportId 줄' : table.platform === 'surveymonkey' ? 'SurveyMonkey: 문항, 보기 두 줄' : '첫 줄'})`);
    L.push(`CSV_ENCODING <- ${rq(enc)}   # CSV 원자료의 글자 인코딩(도구가 읽은 대로)`);
    L.push(`CSV_SEP <- ${rq(table.delimiter === '\t' ? '\t' : ',')}   # 구분자(도구가 읽은 대로)`);
    L.push('');
    L.push('read_raw <- function(path) {');
    L.push('  if (grepl("\\\\.(csv|txt|tsv)$", path, ignore.case = TRUE)) {');
    L.push('    x <- read.csv(path, header = FALSE, colClasses = "character", check.names = FALSE, na.strings = character(0), fileEncoding = CSV_ENCODING, sep = CSV_SEP)');
    L.push('  } else {');
    L.push('    x <- as.data.frame(readxl::read_excel(path, col_names = FALSE, col_types = "text", .name_repair = "minimal"))');
    L.push('  }');
    L.push('  x[] <- lapply(x, function(v) { v[!is.na(v) & trimws(v) == ""] <- NA; v })');
    L.push('  x');
    L.push('}');
    L.push('all_rows <- read_raw(RAW_FILE)');
    L.push('body <- all_rows[-seq_len(HEADER_ROWS), , drop = FALSE]');
    L.push('row_no <- seq_len(nrow(body)) + HEADER_ROWS');
    L.push('keep <- rowSums(!is.na(body)) > 0                 # 완전히 빈 줄은 건너뜀');
    L.push('body <- body[keep, , drop = FALSE]; row_no <- row_no[keep]');
    L.push('n <- nrow(body)');
    L.push(`stopifnot(ncol(body) >= ${table.headers.length})`);
    L.push('');
    L.push('nz <- function(s) tolower(gsub("[[:space:]]", "", enc2utf8(s)))');
    L.push(`UNIT_RE <- ${rq('^(약|만)?[[:space:]]*([-+]?[0-9]+(\\.[0-9]+)?)[[:space:]]*(' + UNIT_WORDS.slice().sort((a, b) => b.length - a.length).join('|') + ')?$')}`);
    L.push('CIRCLED <- c("①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩")');
    L.push('# 글자 -> 숫자: 숫자 그대로, 대응표·사전, 원 번호, "숫자 = 보기", 숫자+단위 순서로 읽는다. 한 열에 단위가 섞이면 단위 붙은 값은 읽지 않는다.');
    L.push('to_num <- function(v, map = NULL) {');
    L.push('  out <- rep(NA_real_, length(v)); unit <- rep("", length(v))');
    L.push('  for (i in seq_along(v)) {');
    L.push('    s0 <- v[i]; if (is.na(s0)) next');
    L.push('    s <- chartr("０１２３４５６７８９．－", "0123456789.-", trimws(s0))');
    L.push('    k <- nz(s)');
    L.push('    if (!is.null(map) && k %in% names(map)) { out[i] <- map[[k]]; next }');
    L.push('    if (grepl("^[-+]?([0-9]+(\\\\.[0-9]*)?|\\\\.[0-9]+)$", s)) { out[i] <- as.numeric(s); next }');
    L.push('    ch <- substr(s, 1, 1)');
    L.push('    if (ch %in% CIRCLED && (nchar(s) == 1 || !grepl("^[0-9]", substr(s, 2, 2)))) { out[i] <- match(ch, CIRCLED); next }');
    L.push('    if (grepl("^[-+]?[0-9]+[[:space:]]*[]=:).][[:space:]]*[가-힣A-Za-z]", s) && !grepl(UNIT_RE, s)) { out[i] <- as.numeric(regmatches(s, regexpr("^[-+]?[0-9]+", s))); next }');
    L.push('    m <- regmatches(s, regexec(UNIT_RE, s))[[1]]');
    L.push('    if (length(m)) { out[i] <- as.numeric(m[3]); unit[i] <- m[5] }');
    L.push('  }');
    L.push('  unit[unit == "살"] <- "세"');
    L.push('  if (length(unique(unit[unit != ""])) > 1) out[unit != ""] <- NA');
    L.push('  out');
    L.push('}');
    L.push('in_range <- function(x, lo, hi, int = TRUE) { bad <- !is.na(x) & (x < lo | x > hi | (int & x != floor(x))); x[bad] <- NA; x }');
    L.push('parse_time <- function(s) {');
    L.push('  s <- trimws(s); out <- as.POSIXct(rep(NA_real_, length(s)), origin = "1970-01-01")');
    L.push('  m <- regmatches(s, regexec("^([0-9]{4})\\\\.\\\\s*([0-9]{1,2})\\\\.\\\\s*([0-9]{1,2})\\\\.?\\\\s*(오전|오후)\\\\s*([0-9]{1,2}):([0-9]{2}):?([0-9]{2})?$", s))');
    L.push('  for (i in seq_along(s)) { x <- m[[i]]; if (length(x) == 8) { h <- as.integer(x[6]); if (x[5] == "오후" && h < 12) h <- h + 12; if (x[5] == "오전" && h == 12) h <- 0');
    L.push('    out[i] <- as.POSIXct(sprintf("%s-%s-%s %02d:%s:%s", x[2], x[3], x[4], h, x[7], ifelse(x[8] == "", "00", x[8])), format = "%Y-%m-%d %H:%M:%S") }');
    L.push('    else if (!is.na(s[i])) { t <- suppressWarnings(as.POSIXct(gsub("/", "-", s[i]), format = "%Y-%m-%d %H:%M:%S")); if (is.na(t) && grepl("^[0-9.]+$", s[i])) t <- as.POSIXct(round((as.numeric(s[i]) - 25569) * 86400), origin = "1970-01-01", tz = "UTC"); out[i] <- t } }');
    L.push('  out');
    L.push('}');
    L.push('');
    L.push('d <- data.frame(응답ID = sprintf(paste0("R%0", max(3, nchar(n)), "d"), seq_len(n)), 원자료_행 = row_no, stringsAsFactors = FALSE, check.names = FALSE)');
    L.push('범위밖값수 <- integer(n); 범위점검 <- integer(n)');
    for (const c of R.columns) {
      const j = table.headers.indexOf(c.source) + 1;
      if (c.role === 'drop') { L.push(`# ${j}번째 열 ${JSON.stringify(c.source).slice(0, 60)}: 내보내지 않음`); continue; }
      L.push(`# ${j}번째 열 ${JSON.stringify(c.source).slice(0, 70)} -> ${c.name} (${ROLE_KO[c.role]})`);
      const col = `body[[${j}]]`;
      if (['timestamp', 'start', 'end'].includes(c.role)) { L.push(`t_${j} <- parse_time(${col})`, `d[[${rq(c.name)}]] <- ifelse(is.na(t_${j}), ${col}, format(t_${j}, "%Y-%m-%d %H:%M:%S"))`); continue; }
      if (c.role === 'text' || c.role === 'id') { L.push(`d[[${rq(c.name)}]] <- ${col}`); continue; }
      if (c.role === 'multi') {
        const opts = c.options || [];
        L.push(`opts <- c(${opts.map((o) => rq(String(o).trim().replace(/\s*,\s*/g, ', '))).join(', ')})`);
        L.push(`s <- ifelse(is.na(${col}), NA, paste0(", ", gsub("[[:space:]]*,[[:space:]]*", ", ", trimws(${col})), ", "))`);
        L.push('ord <- order(-nchar(opts)); hit <- matrix(0L, n, length(opts))');
        L.push('for (k in ord) { key <- paste0(", ", opts[k], ", "); h <- !is.na(s) & grepl(key, s, fixed = TRUE); hit[h, k] <- 1L; s[h] <- sub(key, ", ", s[h], fixed = TRUE) }');
        L.push(`for (k in seq_along(opts)) d[[paste0(${rq(c.name + '_')}, k)]] <- ifelse(is.na(${col}), NA, hit[, k])`);
        L.push('rest <- gsub("^[, ]+|[, ]+$", "", s); rest[!is.na(rest) & rest == ""] <- NA');
        L.push(`if (any(!is.na(rest))) d[[${rq(c.name + '_기타')}]] <- rest`);
        continue;
      }
      const useMap = ['category', 'item', 'attention'].includes(c.role);
      const map = Object.assign({}, c.dictionary ? DICTS[c.dictionary].map : {}, useMap ? Object.fromEntries(Object.entries(c.valueMap || {}).map(([k, v]) => [norm(k), v])) : {});
      const mapStr = Object.keys(map).length ? `c(${Object.entries(map).map(([k, v]) => `${rq(k)} = ${v}`).join(', ')})` : 'NULL';
      L.push(`x <- to_num(${col}, ${mapStr})`);
      if (c.role === 'category' && Object.keys(c.valueMap || {}).length) {
        const textKeys = Object.keys(c.valueMap).some((k) => !NUM_RE.test(norm(k)));
        if (textKeys) L.push(`x[!is.na(x) & !(nz(${col}) %in% c(${Object.keys(c.valueMap).map((k) => rq(norm(k))).join(', ')}))] <- NA   # 대응표에 없는 표기(숫자 포함)는 결측`);
        else L.push(`x[!is.na(x) & !(x %in% c(${[...new Set(Object.values(c.valueMap))].join(', ')}))] <- NA   # 대응표 코드가 아닌 숫자는 결측`);
      }
      if (c.missingCodes && c.missingCodes.length) L.push(`x[x %in% c(${c.missingCodes.join(', ')})] <- NA   # 결측 코드`);
      if (c.range) {
        const oor = c.outOfRange || (['item', 'attention'].includes(c.role) ? 'missing' : 'flag');
        const int = ['item', 'attention'].includes(c.role) ? 'TRUE' : 'FALSE';
        if (oor === 'missing') L.push(`y <- in_range(x, ${c.range[0]}, ${c.range[1]}, ${int}); 범위밖값수 <- 범위밖값수 + as.integer(!is.na(x) & is.na(y)); x <- y`);
        else L.push(`범위점검 <- pmax(범위점검, as.integer(!is.na(x) & (x < ${c.range[0]} | x > ${c.range[1]})))   # 값은 유지, 표시만`);
      }
      L.push(`d[[${rq(c.name)}]] <- x`);
    }
    L.push('');
    if (res.revVars.length) {
      L.push('# 역채점: 원 문항은 그대로 두고 R 변수를 추가');
      const done = new Set();
      for (const s of R.scales) for (const it of s.reverse) if (!done.has(it)) { done.add(it); L.push(`d[[${rq(it + 'R')}]] <- ${s.min + s.max} - d[[${rq(it)}]]`); }
      L.push('');
    }
    const use = (v) => (res.revVars.includes(v) ? v + 'R' : v);
    if (R.scales.length) {
      L.push('# 척도 점수: 합계는 모든 문항 응답 시, 평균은 정한 비율 이상 응답 시 응답한 문항의 평균');
      L.push('score <- function(vars, ratio) { m <- as.matrix(d[, vars, drop = FALSE]); k <- length(vars); cnt <- rowSums(!is.na(m)); need <- ceiling(ratio * k - 1e-9)');
      L.push('  list(sum = ifelse(cnt == k, rowSums(m, na.rm = TRUE), NA), mean = ifelse(cnt >= need & cnt > 0, round(rowSums(m, na.rm = TRUE) / cnt, 6), NA)) }');
      for (const s of R.scales) {
        L.push(`sc <- score(c(${s.items.map((v) => rq(use(v))).join(', ')}), ${s.meanMinRatio})`);
        if (s.sum) L.push(`d[[${rq(s.name + '_합')}]] <- sc$sum`);
        if (s.mean) L.push(`d[[${rq(s.name + '_평균')}]] <- sc$mean`);
      }
      L.push('');
    }
    const f = R.flags; const missPct = Math.round(f.missingItems.minRatio * 1000) / 10;
    const items = res.itemVars;
    L.push('# 표시(삭제하지 않음)');
    L.push(`ITEMS <- c(${items.map(rq).join(', ')})`);
    L.push(`SEG <- c(${itemSegments(res).flatMap((seg, g) => seg.map(() => g + 1)).join(', ')})   # 응답 범위가 같은 문항 구간(일자 응답을 구간마다 셈)`);
    L.push('M <- as.matrix(d[, ITEMS, drop = FALSE])');
    L.push('if (!length(ITEMS)) M <- matrix(NA_real_, n, 0)');
    L.push('d$결측문항수 <- rowSums(is.na(M)); d$결측비율 <- if (length(ITEMS)) floor(1000 * d$결측문항수 / length(ITEMS) + 0.5) / 10 else 0   # 반올림을 도구와 같게(0.5는 올림)');
    if (f.missingItems.on) L.push(`d$결측과다 <- as.integer(d$결측비율 >= ${missPct})`);
    L.push('d$범위밖값수 <- 범위밖값수');
    if (res.order.includes('범위점검')) L.push('d$범위점검 <- 범위점검');
    L.push('longest <- function(x) { b <- 0; for (g in unique(SEG)) { cur <- 0; prev <- NA; for (v in x[SEG == g]) { if (is.na(v)) cur <- 0 else cur <- if (!is.na(prev) && v == prev) cur + 1 else 1; prev <- v; b <- max(b, cur) } }; b }');
    L.push('d$연속동일응답 <- if (length(ITEMS)) apply(M, 1, longest) else 0');
    const atts = R.columns.filter((c) => c.role === 'attention' && c.pass !== undefined && c.pass !== null && !(Array.isArray(c.pass) && !c.pass.length));
    if (atts.length) L.push(`d$주의확인불합격 <- as.integer(${atts.map((c) => { const p = Array.isArray(c.pass) ? c.pass : [c.pass]; return `(!is.na(d[[${rq(c.name)}]]) & !(d[[${rq(c.name)}]] %in% c(${p.join(', ')})))`; }).join(' | ')})`);
    if (f.duplicateAll.on) {
      const sigVars = res.order.filter((v) => !['응답ID', '원자료_행'].includes(v) && res.meta[v] && !['timestamp', 'start', 'end', 'duration', 'id', 'reversed', 'score', 'flag'].includes(res.meta[v].role));
      L.push(`SIG <- c(${sigVars.map(rq).join(', ')})`);
      L.push('sig <- apply(d[, SIG, drop = FALSE], 1, function(r) paste(ifelse(is.na(r), "<NA>", trimws(r)), collapse = "|"))');
      if (items.length) {
        L.push(`answered <- rowSums(!is.na(M)) >= ${f.duplicateAll.minAnswered}`);
        L.push('varied <- apply(M, 1, function(x) length(unique(x[!is.na(x)])) > 1)   # 모든 문항을 한 값으로 답한 응답끼리는 중복으로 보지 않음');
      } else {
        L.push('S <- d[, SIG, drop = FALSE]; answered <- rowSums(!is.na(S)) >= ceiling(length(SIG) * 2 / 3)   # 척도 문항이 없으면 모든 열로');
        L.push('varied <- apply(S, 1, function(x) length(unique(as.character(x[!is.na(x)]))) > 1)');
      }
      L.push('first <- match(sig, sig)');
      L.push('d$중복의심 <- as.integer(answered & varied & first < seq_len(n))');
      L.push('d$중복원본ID <- ifelse(d$중복의심 == 1, d$응답ID[first], NA)');
    }
    if (f.duplicateId.on) {
      const j = table.headers.indexOf(f.duplicateId.column) + 1;
      L.push(`idv <- nz(body[[${j}]]); idv[is.na(body[[${j}]])] <- NA; fid <- match(idv, idv)`);
      L.push('d$식별값중복 <- as.integer(!is.na(idv) & fid < seq_len(n)); d$식별값중복원본ID <- ifelse(d$식별값중복 == 1, d$응답ID[fid], NA)');
    }
    const dur = R.columns.find((c) => c.role === 'duration'), st = R.columns.find((c) => c.role === 'start'), en = R.columns.find((c) => c.role === 'end');
    if (dur) L.push(`d$응답소요초 <- d[[${rq(dur.name)}]]`);
    else if (st && en) L.push(`d$응답소요초 <- round(as.numeric(difftime(as.POSIXct(d[[${rq(en.name)}]], format = "%Y-%m-%d %H:%M:%S"), as.POSIXct(d[[${rq(st.name)}]], format = "%Y-%m-%d %H:%M:%S"), units = "secs")))`);
    if ((dur || (st && en)) && f.speed.on) L.push(`d$빠른응답 <- as.integer(!is.na(d$응답소요초) & d$응답소요초 < ${f.speed.minSeconds})`);
    const conds = [];
    if (f.longstring.on) conds.push(`d$연속동일응답 >= ${f.longstring.min}`);
    if (f.attention.on && atts.length) conds.push('d$주의확인불합격 == 1');
    if (f.missingItems.on && f.missingItems.countAsCareless) conds.push('d$결측과다 == 1');
    if (f.speed.on && (dur || (st && en))) conds.push('d$빠른응답 == 1');
    L.push(`d$불성실의심 <- as.integer(${conds.length ? conds.join(' | ') : 'rep(FALSE, n)'})`);
    L.push('d$제외결정 <- NA_character_');
    L.push('');
    if (R.scales.length) {
      L.push('# 신뢰도(크론바흐 알파): 해당 문항에 모두 응답한 사례. 논문에 보고할 값은 제외할 응답을 정한 뒤 최종 표본에서 다시 계산한다.');
      L.push('cronbach <- function(m) { m <- as.matrix(m); k <- ncol(m); if (nrow(m) < 3) return(NA); (k / (k - 1)) * (1 - sum(apply(m, 2, var)) / var(rowSums(m))) }');
      L.push('alpha <- do.call(rbind, lapply(list(' + R.scales.map((s) => `${bt(s.name)} = c(${s.items.map((v) => rq(use(v))).join(', ')})`).join(', ') + '), function(v) {');
      L.push('  m <- d[, v, drop = FALSE]; ok <- complete.cases(m)');
      L.push('  data.frame(문항수 = length(v), 완전응답_사례수 = sum(ok), 알파_완전응답 = round(cronbach(m[ok, , drop = FALSE]), 4)) }))');
      L.push('print(alpha)');
    }
    L.push('con <- file("정리된자료_R.csv", open = "w", encoding = "UTF-8"); writeChar("\\ufeff", con, eos = NULL)');
    L.push('write.csv(d, con, row.names = FALSE, na = ""); close(con)');
    L.push(`cat(sprintf("처리 완료: %d행, 불성실 의심 %d${f.duplicateAll.on ? ', 중복 의심 %d' : ''}\\n", n, sum(d$불성실의심)${f.duplicateAll.on ? ', sum(d$중복의심)' : ''}))`);
    return L.join('\n') + '\n';
  }

  // ---------------------------------------------------------------- 2단계: AI에 넣을 프롬프트 (원자료 값은 넣지 않는다)
  // 열마다 "어떤 모양으로 저장되어 있는지"만 말로 바꾼다. 개별 응답 값은 넣지 않는다.
  function storageNote(c) {
    if (!c) return '';
    if (c.n === 0) return '비어 있음';
    if (['timestamp', 'start', 'end'].includes(c.kind)) return '날짜·시각';
    if (c.kind === 'pii') return '개인정보로 보임';
    if (c.kind === 'item' || c.kind === 'number') {
      if (c.dict) return `글자 보기(${DICTS[c.dict].label} 사전과 맞음${c.rangeUnsure ? ', 척도 길이는 자료만으로 확실하지 않음' : ''})`;
      if (c.attention) return '숫자(주의확인 문항으로 보임, 응답 범위는 설문지로 확인)';
      return '숫자' + (c.kind === 'item' && c.range ? `(대부분 ${c.range[0]}~${c.range[1]} 정수${c.rangeUnsure ? ', 척도 길이는 설문지로 확인' : ''})` : '');
    }
    if (c.kind === 'multi') return '글자, 여러 보기가 쉼표로 이어짐';
    if (c.kind === 'category') return `글자, 서로 다른 값 ${c.distinctCount}가지`;
    if (c.kind === 'text') return '자유 서술 글';
    if (c.kind === 'duration') return '숫자(초)';
    if (c.kind === 'id') return '식별값';
    return '';
  }
  function buildPrompt(table, doc, desc, opt) {
    opt = opt || {};
    const dg = opt.diag || null;
    const cols = table.headers.map((h, j) => {
      const lab = table.labels && table.labels[j] && table.labels[j] !== h ? ` | 문항 글: ${String(table.labels[j]).replace(/\s+/g, ' ').slice(0, 200)}` : '';
      const st = dg ? storageNote(dg.cols[j]) : '';
      return `${j + 1}\t${h}${lab}${st ? ` | 저장 형태: ${st}` : ''}`;
    }).join('\n');
    const optLines = opt.optionLists ? Object.entries(opt.optionLists).map(([h, vs]) => `- ${h}: ${vs.join(' / ')}`).join('\n') : '';
    return `당신은 설문 자료 정리 규칙을 만드는 조수입니다. 아래 정보만으로 정리 규칙을 JSON 하나로 작성하세요.
응답자 개개인의 응답 값은 받지 않았고, 받을 수도 없습니다. 변수 목록과 설문지·코드북 글, 연구자의 설명만 보고 판단하세요.

## 출력 형식 (반드시 지킬 것)
- JSON 객체 하나만 출력합니다. 앞뒤 설명, 주석(//), 마크다운 표는 쓰지 않습니다. 코드 블록(\`\`\`json)으로 감싸는 것은 괜찮습니다.
- 최상위 키: "schema"(값은 "${SCHEMA}"), "title", "columns", "scales", "flags", "notes".
- "columns": 아래 변수 목록의 열마다 하나씩, 같은 순서로. 각 항목의 키:
  - "source": 변수 목록의 머리글을 글자 하나 바꾸지 않고 그대로(번호와 탭은 빼고). 띄어쓰기와 끝 공백도 그대로.
  - "name": 새 변수명. 한글이나 영문으로 시작하고 글자·숫자·밑줄(_)만, 64바이트(한글 약 21자) 이하. 같은 척도 문항은 "척도이름_01"처럼 두 자리 번호. SPSS 예약어(ALL AND BY EQ GE GT LE LT NE NOT OR TO WITH) 금지. 이름이 겹치면 안 됩니다.
  - "label": 변수 설명(문항 내용 요약, 60자 이내).
  - "role": 다음 중 하나 ${ROLES.map((r) => `"${r}"(${ROLE_KO[r]})`).join(', ')}.
    이름·연락처·이메일·학번·주소·IP 같은 개인정보 열은 "drop". 응답 시각은 "timestamp", 시작·종료 시각이 따로 있으면 "start"/"end", 소요 시간(초) 열은 "duration".
  - "range": 척도 문항(item, attention)은 응답 범위 [최솟값, 최댓값]이 꼭 필요합니다. 나이·시간 같은 숫자(number)는 상식적인 허용 범위를 넣을 수 있습니다.
  - "outOfRange": "missing"(범위 밖이면 결측) 또는 "flag"(값은 두고 표시만). 척도 문항은 "missing", 숫자 열은 "flag"를 권합니다.
  - "dictionary": 변수 목록의 "저장 형태"가 글자 보기인 리커트 문항이면 다음 중 하나(저장 형태가 숫자면 넣지 않음): ${Object.entries(DICTS).map(([k, d]) => `"${k}"(${d.label})`).join(', ')}. 해당 없으면 넣지 않습니다.
  - "valueMap": 범주 열(category)의 응답 글자 -> 숫자 코드. 예 {"남": 1, "여": 2}. 설문지에 보기가 있을 때만 쓰고, 보기를 지어내지 않습니다.
  - "valueLabels": 숫자 코드 -> 라벨. 예 {"1": "남", "2": "여"}.
  - "missingCodes": 설문지·코드북이나 연구자 설명에 결측 코드(예: 9, 99, -9)가 나온 경우에만 숫자 배열로.
  - "options": 복수 선택(multi) 문항의 보기 글자 목록(설문지에 있는 그대로).
  - "pass": 주의확인(attention) 문항의 정답 숫자.
- "scales": 척도나 하위요인마다 {"name", "label", "items"(columns의 name 목록), "reverse"(역문항의 name 목록, items 안에 있어야 함), "min", "max", "sum": true, "mean": true, "meanMinRatio": 0.8}. 하위요인 점수와 척도 전체 점수가 모두 필요하면 각각 따로 만듭니다(전체 점수 이름은 "척도이름_전체"). 역문항은 설문지·코드북·설명에 근거가 있을 때만 넣습니다.
- "flags": {"longstring": {"on": true, "min": 정수}, "attention": {"on": true/false}, "missingItems": {"on": true, "minRatio": 0.2, "countAsCareless": false}, "duplicateAll": {"on": true, "minAnswered": 정수}, "duplicateId": {"on": false, "column": null}, "speed": {"on": false, "minSeconds": 정수}}. 연구자 설명에 기준이 있으면 따르고, 없으면 longstring.min은 척도 문항(item)이 10개 이하이면 그 문항 수, 10개보다 많으면 문항 수의 절반을 올림한 값(최소 10), minAnswered는 척도 문항 수의 2/3을 올림한 값, speed.minSeconds는 척도 문항 수 × 2초로 합니다. missingItems.countAsCareless는 연구자가 결측 많은 응답도 불성실 의심에 넣으라고 한 경우에만 true(기본 false, 결측과다는 따로 표시됨). speed는 duration 열이나 start·end 열이 있을 때만 on. 꺼 둔 규칙도 키는 남깁니다.
  - duplicateId.column에는 원자료 머리글(source)을 그대로 씁니다. 이메일·학번처럼 role이 "drop"인 열도 쓸 수 있습니다(정리본에서는 빠지고 중복 확인에만 쓰임).
- "notes": 확실하지 않아서 연구자가 확인해야 할 점을 짧은 문장 배열로(예: "문서에 소진 4번이 역문항인지 나오지 않음"). 근거 없는 추측으로 규칙을 채우지 말고 여기에 적습니다.

## 변수 목록 (번호, 탭, 원자료 머리글${table.labels ? ' | 문항 글' : ''}${dg ? ' | 저장 형태' : ''})
저장 형태는 도구가 연구자의 컴퓨터 안에서 원자료를 보고 요약한 것입니다(값 자체는 아님).
원자료 형식: ${({ google: '구글 폼', qualtrics: 'Qualtrics', surveymonkey: 'SurveyMonkey', 'naver-or-other': '네이버 폼 또는 기타', generic: '알 수 없음' })[table.platform] || table.platform}${table.platform === 'google' ? ' (체크박스 문항은 고른 보기가 ", "로 이어져 한 칸에 들어 있음)' : ''}
${cols}
${optLines ? `\n## 응답 보기 목록 (연구자가 넣기로 고른 열만, 여러 명이 고른 보기만)\n${optLines}\n` : ''}
## 연구자의 설명
${desc && desc.trim() ? desc.trim() : '(없음)'}

## 설문지·코드북 문서에서 뽑은 글
${doc && doc.trim() ? doc.trim().slice(0, opt.maxDoc || 30000) : '(없음)'}
`;
  }

  return { SCHEMA, VERSION, detectEncoding, detectDelim, decideScale, DICTS, ROLES, ROLE_KO, UNIT_WORDS, norm, isBlank, parseDelimited, decodeBytes, buildTable, readNumber, dateFrom, fmtDate, diagnose, draftRules, parseRulesText, validateRules, validName, run, cronbach, toSPSS, toR, buildPrompt, dictLabels, fillFromDiagnosis, storageNote, chooseDict, defaultLongstring, variantKey };
});
