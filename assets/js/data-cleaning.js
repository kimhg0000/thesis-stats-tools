/* 설문 자료 정리 화면. 계산은 clean-engine.js(CleanEngine), 파일 읽기·쓰기는 SheetJS(XLSX).
   이 파일에는 fetch, XMLHttpRequest, sendBeacon, WebSocket 같은 전송 코드가 없다.
   예외 두 가지는 이 사이트의 정적 파일을 읽는 것뿐이다: 견본 자료(사용자가 누를 때), PDF 읽기 프로그램(PDF를 올릴 때). */
(function () {
  'use strict';
  const E = window.CleanEngine;
  const SCRIPT = document.currentScript ? document.currentScript.src : location.href;
  const asset = (p) => new URL('../' + p, SCRIPT).href;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (x) => (x === null || x === undefined ? '' : typeof x === 'number' ? (Number.isInteger(x) ? String(x) : String(Math.round(x * 1000) / 1000)) : String(x));
  const live = (m) => { $('#live').textContent = m; };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const PLATFORM = { google: '구글 폼', qualtrics: 'Qualtrics', surveymonkey: 'SurveyMonkey', 'naver-or-other': '네이버 폼 또는 기타 설문 도구', generic: '일반 표' };
  const KIND = { item: '척도 문항', number: '숫자', category: '범주', text: '서술형', multi: '복수 선택', timestamp: '제출 시각', start: '시작 시각', end: '종료 시각', duration: '소요 시간', id: '식별값', pii: '개인정보' };
  const S = { wb: null, name: '', typed: false, table: null, diag: null, rules: null, res: null, maxStep: 1, doc: '', docName: '' };

  // ------------------------------------------------------------ 단계 이동
  function go(n) {
    $$('.cl-panel').forEach((p) => { p.hidden = p.id !== 's' + n; });
    $$('.cl-steps button').forEach((b) => {
      const k = +b.dataset.step;
      b.disabled = k > S.maxStep;
      if (k === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('done', k < n);
    });
    const h = $('#s' + n + ' h2');
    if (n === 2 && S.diag) drawMap();
    if (n > 1 && h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); $('#s' + n).scrollIntoView({ block: 'start' }); }
  }
  $$('.cl-steps button').forEach((b) => b.addEventListener('click', () => go(+b.dataset.step)));

  // ------------------------------------------------------------ 1. 읽기
  const err1 = (m) => { $('#err1').textContent = m || ''; };
  async function readFile(file) {
    err1('');
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const buf = new Uint8Array(await file.arrayBuffer());
    if (['xlsx', 'xls', 'xlsm', 'ods'].includes(ext)) {
      let wb;
      try { wb = XLSX.read(buf, { type: 'array', cellDates: true, dense: false }); } catch (e) { return err1('엑셀 파일을 읽지 못했습니다. 암호가 걸려 있거나 손상된 파일인지 확인하세요.'); }
      S.wb = wb; S.name = file.name; S.typed = true;
      const sizes = wb.SheetNames.map((n) => { const r = wb.Sheets[n]['!ref']; return r ? XLSX.utils.decode_range(r).e.r : 0; });
      const sel = $('#sheet');
      sel.innerHTML = wb.SheetNames.map((n, i) => `<option value="${esc(n)}">${esc(n)} (${sizes[i]}행)</option>`).join('');
      const best = sizes.indexOf(Math.max(...sizes));
      sel.selectedIndex = best;
      $('#sheetBox').hidden = wb.SheetNames.length < 2;
      loadSheet(wb.SheetNames[best]);
    } else if (['csv', 'tsv', 'txt'].includes(ext)) {
      S.wb = null; $('#sheetBox').hidden = true;
      const text = E.decodeBytes(buf);
      const delim = ext === 'tsv' ? '\t' : E.detectDelim(text);
      loadAoa(E.parseDelimited(text, delim), file.name, false, null, E.detectEncoding(buf), delim);
    } else err1('xlsx, xls, csv 파일만 읽습니다. 다른 형식이면 엑셀에서 "다른 이름으로 저장"으로 xlsx나 csv로 바꿔 올리세요.');
  }
  function loadSheet(name) {
    const aoa = XLSX.utils.sheet_to_json(S.wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: true });
    loadAoa(aoa, S.name, true, name);
  }
  function loadAoa(aoa, name, typed, sheet, encoding, delim) {
    try { S.table = E.buildTable(aoa, name, typed); } catch (e) { return err1(e.message); }
    S.table.encoding = encoding || 'utf-8'; S.table.delimiter = delim || ',';
    if (S.table.rows.length < 2) return err1('응답이 두 줄 이상 있어야 진단할 수 있습니다. 첫 줄이 머리글인지 확인하세요.');
    S.diag = E.diagnose(S.table);
    S.rules = E.draftRules(S.table, S.diag);
    S.res = null; S.maxStep = 2;
    const t = S.table;
    $('#loadedLine').innerHTML = `<strong>${esc(name || '붙여 넣은 자료')}</strong>${sheet ? ` (${esc(sheet)} 시트)` : ''}: ${PLATFORM[t.platform]} 형식으로 읽었습니다. 응답 ${t.rows.length}행, 열 ${t.headers.length}개${t.headerRows > 1 ? `, 머리글 ${t.headerRows}줄` : ''}${t.blankSkipped ? `, 빈 줄 ${t.blankSkipped}개 건너뜀` : ''}${S.table.encoding === 'euc-kr' ? ', 한글 인코딩 CP949(EUC-KR)' : ''}.`;
    $('#loaded').hidden = false;
    renderDiag(); renderRules();
    go(1);
    live('자료를 읽었습니다. 진단 보기 단추를 누르세요.');
    $('#to2').focus();
  }
  $('#file').addEventListener('change', (e) => { if (e.target.files[0]) { S.isSample = false; readFile(e.target.files[0]); } });
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) readFile(f); });
  $('#sheet').addEventListener('change', (e) => loadSheet(e.target.value));
  $('#pasteGo').addEventListener('click', () => { err1(''); const t = $('#paste').value; if (!t.trim()) return err1('붙여 넣은 자료가 없습니다.'); S.wb = null; const dl = t.includes('\t') ? '\t' : E.detectDelim(t); loadAoa(E.parseDelimited(t, dl), '붙여 넣은 자료', false, null, 'utf-8', dl); });
  $('#example').addEventListener('click', async () => {
    err1('');
    try {
      const r = await fetch(asset('examples/sample-raw-google.xlsx'));
      const f = new File([await r.arrayBuffer()], '견본_원자료_구글폼.xlsx');
      await readFile(f);
      S.isSample = true;
      $('#desc').value = '견본(모의 데이터): 대학생 학업소진 15문항(지침 1~5번, 냉담 6~10번, 효능저하 11~15번, 역문항 4·9·14번)과 학업 자기효능감 15문항(역문항 3·7·11번). 모두 5점 척도(1 전혀 그렇지 않다 ~ 5 매우 그렇다). 주의 문항 정답은 4. 주당 학습 시간은 0~80시간을 넘으면 표시만. 같은 값 15문항 이상 연속, 문항 결측 20% 이상을 불성실 의심으로.';
    } catch (e) { err1('견본 자료를 불러오지 못했습니다.'); }
  });
  $('#to2').addEventListener('click', () => go(2));

  // ------------------------------------------------------------ 2. 진단
  function renderDiag() {
    const d = S.diag, t = S.table;
    const cnt = { text: 0, out: 0, blank: 0 };
    d.cols.forEach((c) => { if (c.cells) { cnt.text += c.cells.text.length; cnt.out += c.cells.out.length + c.cells.bad.length + c.cells.frac.length; } if (c.kind === 'item') cnt.blank += c.missing; });
    const idDup = (d.rows.idDup || []).reduce((a, b) => a + b.dups.length, 0);
    const stats = [
      ['응답', t.rows.length + '행', `열 ${t.headers.length}개, 척도 문항으로 보이는 열 ${d.itemCount}개`],
      ['글자로 적힌 응답', cnt.text + '칸', '숫자로 바꿀 후보'],
      ['범위 밖·읽을 수 없는 값', cnt.out + '칸', '척도 문항은 결측 처리 후보'],
      ['척도 문항 빈 칸', cnt.blank + '칸', '채우지 않고 결측으로 둠'],
      ['모든 답이 같은 응답', d.rows.duplicates.length + '행', idDup ? `식별값 중복 ${idDup}행 별도` : '앞선 응답과 모든 답이 같음'],
      ['일자 응답 의심', d.itemCount >= 6 ? d.rows.straight.length + '행' : '점검 안 함', d.itemCount >= 6 ? `같은 값이 ${d.rows.straightMin}문항 이상 이어짐` : '척도 문항 6개 미만'],
    ];
    if (d.rows.speed && d.rows.speed.from) stats.push(['빠른 응답', d.rows.speed.fast.length + '행', `문항당 2초 기준 ${d.rows.speed.threshold}초 미만`]);
    $('#diagStats').innerHTML = stats.map(([k, v, s]) => `<div class="stat"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span><span class="s">${esc(s)}</span></div>`).join('');
    $('#diagLead').textContent = `${PLATFORM[t.platform]} 형식, 응답 ${t.rows.length}행을 열마다 살펴봤습니다. 아직 아무것도 바꾸지 않았습니다. 다음 단계에서 규칙을 확인한 뒤 정리합니다.`;
    drawMap();
    const pii = d.cols.filter((c) => c.pii);
    $('#piiWarn').innerHTML = pii.length ? `<p><strong>개인정보로 보이는 열 ${pii.length}개:</strong> ${pii.map((c) => esc(c.source)).join(', ')}. 정리본에서 빼도록(내보내지 않음) 정해 두었습니다. 중복 응답을 찾는 데는 쓸 수 있습니다.</p>` : '';
    $('#diagTable tbody').innerHTML = d.cols.map((c) => {
      const kind = c.attention ? '주의확인 문항' : (KIND[c.kind] || c.kind) + (c.range && c.kind === 'item' ? ` ${c.range[0]}~${c.range[1]}` : '') + (c.dict ? ', 글자 보기' : '');
      const top = c.distinct.slice(0, 4).map(([v, k]) => `<span class="val">${esc(String(v).length > 18 ? String(v).slice(0, 18) + '…' : v)}<span class="k">${k}</span></span>`).join('') + (c.distinctCount > 4 ? `<span class="more">외 ${c.distinctCount - 4}가지</span>` : '');
      const iss = c.issues.filter((x) => x.k !== 'missing' || c.kind === 'item').map((x) => `<li class="is-${x.k}">${esc(x.msg)}</li>`).join('');
      return `<tr><th scope="row"><span class="src" title="${esc(c.source)}">${esc(c.source)}</span>${c.label ? `<span class="lab">${esc(c.label)}</span>` : ''}</th><td data-l="추정">${esc(kind)}</td><td data-l="응답">${c.n}${c.missing ? `<span class="sub">빈 칸 ${c.missing}</span>` : ''}</td><td data-l="많이 나온 값" class="vals">${top}</td><td data-l="발견한 것">${iss ? `<ul class="issues">${iss}</ul>` : '<span class="okmark">특이점 없음</span>'}</td></tr>`;
    }).join('');
    const rowNo = (i) => t.rowNo[i];
    const parts = [];
    const lst = (arr, f) => arr.slice(0, 8).map(f).join(', ') + (arr.length > 8 ? ` 외 ${arr.length - 8}건` : '');
    parts.push(`<h3>행마다 본 것</h3><p class="note">행 번호는 원자료 파일의 줄 번호입니다.</p><ul class="row-issues">`);
    parts.push(`<li><strong>모든 답이 앞선 응답과 같음 ${d.rows.duplicates.length}행.</strong> ${d.rows.duplicates.length ? lst(d.rows.duplicates, ([i, j]) => `${rowNo(i)}행(${rowNo(j)}행과 같음)`) : '없습니다.'}</li>`);
    (d.rows.idDup || []).forEach((x) => parts.push(`<li><strong>${esc(x.source)} 값 중복 ${x.dups.length}행.</strong> ${x.dups.length ? lst(x.dups, ([i, j]) => `${rowNo(i)}행(${rowNo(j)}행과 같은 값)`) : '없습니다.'}</li>`));
    parts.push(`<li><strong>일자 응답 의심 ${d.rows.straight.length}행.</strong> ${d.rows.straight.length ? lst(d.rows.straight, ([i, b]) => `${rowNo(i)}행(${b}문항 연속)`) : '없습니다.'} ${d.itemCount >= 6 ? `진단 기준은 ${d.rows.straightMin}문항이며, 다음 단계에서 바꿀 수 있습니다.` : '척도 문항이 6개보다 적으면 같은 값으로만 답하는 것이 정상 응답일 수 있어 기본으로 점검하지 않습니다.'}</li>`);
    if (d.rows.speed.from) parts.push(`<li><strong>응답 시간.</strong> ${esc(d.rows.speed.from)}로 계산했습니다. 중앙값 ${fmt(d.rows.speed.median)}초, ${d.rows.speed.threshold}초 미만 ${d.rows.speed.fast.length}행.</li>`);
    else parts.push(`<li><strong>응답 시간.</strong> ${esc(d.rows.speed.reason)}</li>`);
    parts.push('</ul>');
    $('#rowIssues').innerHTML = parts.join('');
  }

  function drawMap() {
    const d = S.diag, t = S.table, cv = $('#map');
    const nc = t.headers.length, nr = t.rows.length;
    const wrapW = Math.max(240, Math.min(cv.parentElement.clientWidth || 600, 1100));
    const cw = Math.max(2, Math.min(14, Math.floor(wrapW / nc)));
    const maxH = 320; const rh = Math.max(1, Math.min(6, Math.floor(maxH / nr))) || 1;
    const per = nr * rh > maxH ? Math.ceil(nr / maxH) : 1; // 행이 많으면 여러 행을 한 줄로
    const lines = Math.ceil(nr / per);
    const dpr = window.devicePixelRatio || 1;
    cv.width = nc * cw * dpr; cv.height = lines * rh * dpr; cv.style.width = nc * cw + 'px'; cv.style.height = lines * rh + 'px';
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const flagRows = new Set([...d.rows.duplicates.map((x) => x[0]), ...d.rows.straight.map((x) => x[0])]);
    const status = d.cols.map((c) => { const m = new Map(); if (c.cells) { c.cells.text.forEach((i) => m.set(i, 2)); c.cells.out.concat(c.cells.bad, c.cells.frac).forEach((i) => m.set(i, 4)); } return m; });
    const color = ['#e1e7ef', '#f2c46d', '#2445a6', '#7d8895', '#a8261b'];
    for (let L = 0; L < lines; L++) {
      for (let j = 0; j < nc; j++) {
        let s = 0;
        for (let i = L * per; i < Math.min(nr, (L + 1) * per); i++) {
          let x = status[j].get(i) || 0;
          if (!x && E.isBlank(t.rows[i][j]) && d.cols[j].kind === 'item') x = 3;
          if (!x && flagRows.has(i)) x = 1;
          if (x > s) s = x;
        }
        g.fillStyle = color[s];
        g.fillRect(j * cw, L * rh, Math.max(1, cw - (cw > 4 ? 1 : 0)), rh);
      }
    }
    $('#mapNote').textContent = `가로 열 ${nc}개, 세로 응답 ${nr}행${per > 1 ? `(한 줄에 ${per}행씩)` : ''}`;
    const cnt = [0, 0, 0, 0, 0]; status.forEach((m) => m.forEach((v) => cnt[v]++));
    $('#mapDesc').textContent = `자료 지도: 열 ${nc}개와 응답 ${nr}행을 칸으로 그린 그림. 글자로 적힌 응답 ${cnt[2]}칸, 범위 밖이나 읽을 수 없는 값 ${cnt[4]}칸, 중복·일자 응답 의심 ${flagRows.size}행.`;
  }
  let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (S.diag && !$('#s2').hidden) drawMap(); }, 150); });
  $('#to3').addEventListener('click', () => { S.maxStep = Math.max(S.maxStep, 3); $('#sampleTip').hidden = !S.isSample; go(3); });
  $('#loadSampleRules').addEventListener('click', async () => { try { const t = await (await fetch(asset('examples/sample-rules.json'))).text(); await loadRulesText(t, $('#sampleMsg'), '견본 정리 규칙'); } catch (e) { $('#sampleMsg').textContent = '견본 규칙을 불러오지 못했습니다.'; } });

  // ------------------------------------------------------------ 3. 규칙
  const ROLE_OPTS = E.ROLES.map((r) => `<option value="${r}">${esc(E.ROLE_KO[r])}</option>`).join('');
  const DICT_OPTS = '<option value="">사용 안 함</option>' + Object.entries(E.DICTS).map(([k, d]) => `<option value="${k}">${esc(d.label)}</option>`).join('');
  const colDiag = (src) => S.diag.cols.find((c) => c.source === src);
  const distinctAll = (src) => { const j = S.table.headers.indexOf(src); const m = new Map(); S.table.rows.forEach((r) => { const v = r[j]; if (!E.isBlank(v)) { const k = String(v); m.set(k, (m.get(k) || 0) + 1); } }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const labelsText = (o) => Object.entries(o || {}).map(([k, v]) => `${k}=${v}`).join('; ');
  const parseLabels = (s) => { const o = {}; String(s).split(/[;\n]/).forEach((p) => { const m = p.match(/^\s*(-?\d+(?:\.\d+)?)\s*=\s*(.+?)\s*$/); if (m) o[m[1]] = m[2]; }); return o; };
  const parseNums = (s) => String(s).split(/[,\s]+/).filter(Boolean).map(Number).filter((x) => !isNaN(x));

  function renderRules() {
    const R = S.rules;
    const tb = $('#rulesTable tbody');
    tb.innerHTML = R.columns.map((c, i) => {
      const id = 'c' + i;
      const isNum = ['item', 'attention', 'number', 'duration'].includes(c.role);
      const range = isNum ? `<span class="rng"><label class="sr-only" for="${id}lo">${esc(c.source)} 최솟값</label><input type="number" id="${id}lo" data-i="${i}" data-k="lo" value="${c.range ? c.range[0] : ''}" step="any"><span aria-hidden="true">~</span><label class="sr-only" for="${id}hi">${esc(c.source)} 최댓값</label><input type="number" id="${id}hi" data-i="${i}" data-k="hi" value="${c.range ? c.range[1] : ''}" step="any"></span>${c.role === 'number' ? `<label class="check sm"><input type="checkbox" data-i="${i}" data-k="oorflag"${c.outOfRange !== 'missing' ? ' checked' : ''}> 넘어도 값 유지</label>` : ''}${c.role === 'attention' ? `<span class="pass"><label for="${id}pass">정답</label><input type="number" id="${id}pass" data-i="${i}" data-k="pass" value="${c.pass ?? ''}"></span>` : ''}` : '<span class="na">해당 없음</span>';
      let conv = '<span class="na">해당 없음</span>';
      if (c.role === 'item' || c.role === 'attention') conv = `<label class="sr-only" for="${id}dict">${esc(c.source)} 글자 응답 사전</label><select id="${id}dict" data-i="${i}" data-k="dict">${DICT_OPTS}</select>`;
      if (c.role === 'category') conv = `<button type="button" class="btn ghost sm" data-i="${i}" data-k="openmap" aria-expanded="false" aria-controls="${id}sub">대응표 ${Object.keys(c.valueMap || {}).length}개</button>`;
      if (c.role === 'multi') conv = `<button type="button" class="btn ghost sm" data-i="${i}" data-k="openmap" aria-expanded="false" aria-controls="${id}sub">보기 ${(c.options || []).length}개</button>`;
      const miss = ['item', 'attention', 'number', 'category'].includes(c.role) ? `<label class="sr-only" for="${id}miss">${esc(c.source)} 결측 코드</label><input type="text" id="${id}miss" data-i="${i}" data-k="miss" value="${esc((c.missingCodes || []).join(', '))}" placeholder="예: 99" inputmode="numeric">` : '<span class="na">해당 없음</span>';
      const dg = colDiag(c.source) || {};
      return `<tr data-row="${i}" class="role-${c.role}"><th scope="row" data-l="원자료 머리글"><span class="src" title="${esc(c.source)}">${esc(c.source)}</span><span class="lab">${esc(KIND[dg.kind] || '')}${dg.n !== undefined ? `, 응답 ${dg.n}` : ''}</span></th>
<td data-l="변수명"><label class="sr-only" for="${id}name">${esc(c.source)} 변수명</label><input type="text" id="${id}name" data-i="${i}" data-k="name" value="${esc(c.name || '')}"${c.role === 'drop' ? ' disabled' : ''} autocomplete="off" spellcheck="false"></td>
<td data-l="역할"><label class="sr-only" for="${id}role">${esc(c.source)} 역할</label><select id="${id}role" data-i="${i}" data-k="role">${ROLE_OPTS}</select></td>
<td data-l="응답 범위">${range}${c.confirm && ['item', 'attention'].includes(c.role) ? `<label class="check sm confirm"><input type="checkbox" data-i="${i}" data-k="confirm"> 범위 확인함</label>` : ''}</td><td data-l="글자를 숫자로">${conv}</td><td data-l="결측 코드">${miss}</td></tr>
<tr class="sub" id="${id}sub" hidden><td colspan="6"></td></tr>`;
    }).join('');
    R.columns.forEach((c, i) => { $(`#c${i}role`).value = c.role; const d = $(`#c${i}dict`); if (d) d.value = c.dictionary || ''; });
    renderScales(); renderFlags();
  }
  function subEditor(i) {
    const c = S.rules.columns[i]; const td = $(`#c${i}sub td`);
    if (c.role === 'category') {
      const vals = distinctAll(c.source); const map = c.valueMap || {};
      td.innerHTML = `<div class="map-ed"><p class="hint">원자료의 표기마다 숫자 코드를 적으세요. 띄어쓰기만 다른 표기는 같은 것으로 읽습니다. 비워 둔 표기는 결측이 됩니다. 값 라벨은 코드에 맞춰 저절로 바뀝니다.</p>${c.codeOrder === 'frequency' ? '<p class="warn">코드는 많이 나온 순서로 붙여 두었습니다. 학력, 소득, 학년처럼 순서가 있는 범주라면 낮은 단계부터 1, 2, 3 순서로 고치세요.</p>' : ''}<div class="table-scroll"><table class="plain"><thead><tr><th scope="col">원자료 표기</th><th scope="col">건수</th><th scope="col">코드</th></tr></thead><tbody>${vals.map(([v, k], q) => { const key = Object.keys(map).find((x) => E.norm(x) === E.norm(v)); return `<tr><td>${esc(v)}</td><td>${k}</td><td><label class="sr-only" for="m${i}_${q}">${esc(v)} 코드</label><input type="number" id="m${i}_${q}" data-map="${i}" data-v="${esc(v)}" value="${key !== undefined ? map[key] : ''}" step="any"></td></tr>`; }).join('')}</tbody></table></div><div class="field"><label for="vl${i}">값 라벨 <span class="note">(코드=라벨; 코드=라벨)</span></label><input type="text" id="vl${i}" data-vl="${i}" value="${esc(labelsText(c.valueLabels))}"></div></div>`;
    } else if (c.role === 'multi') {
      td.innerHTML = `<div class="map-ed"><p class="hint">보기를 한 줄에 하나씩 적으세요. 보기 글자 안에 쉼표가 있어도 여기 적은 대로 찾습니다. 보기마다 0/1 열을 만들고, 목록에 없는 글자는 "_기타" 열에 옮깁니다.</p><label for="op${i}" class="label">보기 목록</label><textarea id="op${i}" data-op="${i}" class="prose short">${esc((c.options || []).join('\n'))}</textarea></div>`;
    }
  }
  $('#rulesTable').addEventListener('click', (e) => {
    const b = e.target.closest('[data-k="openmap"]'); if (!b) return;
    const i = +b.dataset.i; const sub = $(`#c${i}sub`);
    const open = sub.hidden; sub.hidden = !open; b.setAttribute('aria-expanded', String(open));
    if (open) subEditor(i);
  });
  $('#rulesTable').addEventListener('change', (e) => {
    const el = e.target; const R = S.rules;
    if (el.dataset.map !== undefined) {
      const i = +el.dataset.map; const c = R.columns[i]; c.valueMap = c.valueMap || {};
      Object.keys(c.valueMap).filter((x) => E.norm(x) === E.norm(el.dataset.v)).forEach((x) => delete c.valueMap[x]);
      if (el.value !== '') c.valueMap[el.dataset.v] = +el.value;
      delete c.codeOrder;
      // 값 라벨을 코드에 맞춰 다시 만든다: 코드마다 그 코드로 묶인 표기 가운데 가장 많이 나온 것
      if (!c._labelsEdited) {
        const cnt = new Map(distinctAll(c.source).map(([v, k]) => [E.norm(v), k]));
        const best = {};
        Object.entries(c.valueMap).forEach(([v, code]) => { const k = cnt.get(E.norm(v)) || 0; if (!best[code] || k > best[code][1]) best[code] = [v, k]; });
        c.valueLabels = Object.fromEntries(Object.entries(best).sort((a, b) => a[0] - b[0]).map(([code, [v]]) => [code, v]));
        const vl = $(`#vl${i}`); if (vl) vl.value = labelsText(c.valueLabels);
      }
      updateMapBtn(i); return;
    }
    if (el.dataset.vl !== undefined) { const c = R.columns[+el.dataset.vl]; c.valueLabels = parseLabels(el.value); c._labelsEdited = true; return; }
    if (el.dataset.op !== undefined) { R.columns[+el.dataset.op].options = el.value.split('\n').map((x) => x.trim()).filter(Boolean); updateMapBtn(+el.dataset.op); return; }
    const i = +el.dataset.i; const c = R.columns[i]; if (!c) return;
    const k = el.dataset.k;
    if (k === 'name') { const old = c.name; c.name = el.value.trim(); renameInScales(old, c.name); renderScales(); }
    if (k === 'role') { changeRole(c, el.value); renderRules(); $(`#c${i}role`).focus(); }
    if (k === 'lo' || k === 'hi') { const lo = parseFloat($(`#c${i}lo`).value), hi = parseFloat($(`#c${i}hi`).value); c.range = isNaN(lo) && isNaN(hi) ? undefined : [lo, hi]; if (c.confirm) { delete c.confirm; const cb = $(`[data-i="${i}"][data-k="confirm"]`); if (cb) cb.closest('label').remove(); } }
    if (k === 'confirm' && el.checked) { delete c.confirm; el.closest('label').remove(); live(`${c.name}의 응답 범위를 확인했습니다.`); renderScales(); }
    if (k === 'oorflag') c.outOfRange = el.checked ? 'flag' : 'missing';
    if (k === 'pass') c.pass = el.value === '' ? null : +el.value;
    if (k === 'dict') { c.dictionary = el.value || undefined; if (c.dictionary && E.DICTS[c.dictionary]) { c.range = [E.DICTS[c.dictionary].min, E.DICTS[c.dictionary].max]; $(`#c${i}lo`).value = c.range[0]; $(`#c${i}hi`).value = c.range[1]; } if (c.confirm) { delete c.confirm; const cb = $(`[data-i="${i}"][data-k="confirm"]`); if (cb) cb.closest('label').remove(); } }
    if (k === 'miss') c.missingCodes = parseNums(el.value);
  });
  function updateMapBtn(i) { const c = S.rules.columns[i]; const b = $(`[data-i="${i}"][data-k="openmap"]`); if (b) b.textContent = c.role === 'multi' ? `보기 ${(c.options || []).length}개` : `대응표 ${Object.keys(c.valueMap || {}).length}개`; }
  function changeRole(c, role) {
    const old = c.role; c.role = role;
    if (old === 'category' && role !== 'category') { delete c.valueMap; delete c.valueLabels; delete c.codeOrder; }
    if ((old === 'item' || old === 'attention') && !['item', 'attention'].includes(role)) delete c.dictionary;
    const dg = colDiag(c.source) || {};
    if (role === 'drop') { renameInScales(c.name, null); }
    if (old === 'drop' && !c.name) c.name = dg.name || 'V' + (S.table.headers.indexOf(c.source) + 1);
    if ((role === 'item' || role === 'attention') && !c.range) c.range = dg.range ? dg.range.slice() : [1, 5];
    if (role === 'number' && !c.outOfRange) c.outOfRange = 'flag';
    if (role === 'item' || role === 'attention') c.outOfRange = 'missing';
    if (role === 'category' && !c.valueMap) { const tmp = E.draftRules(S.table, { cols: [Object.assign({}, dg, { kind: 'category', attention: false, pii: false })], rows: S.diag.rows }).columns[0]; c.valueMap = tmp.valueMap; c.valueLabels = tmp.valueLabels; if (tmp.codeOrder) c.codeOrder = tmp.codeOrder; }
    if (role === 'attention' && (c.pass === undefined || c.pass === null) && dg.pass !== undefined) c.pass = dg.pass;
    if (role === 'multi' && !c.options) c.options = dg.options || [];
    if (old === 'item' && role !== 'item' && role !== 'attention') renameInScales(c.name, null);
  }
  function renameInScales(old, now) {
    S.rules.scales.forEach((s) => {
      s.items = s.items.map((x) => (x === old ? now : x)).filter(Boolean);
      s.reverse = s.reverse.map((x) => (x === old ? now : x)).filter(Boolean);
    });
  }

  function renderScales() {
    const R = S.rules;
    const items = R.columns.filter((c) => c.role === 'item' && c.name).map((c) => c.name);
    $('#scales').innerHTML = R.scales.length ? R.scales.map((s, i) => {
      const id = 's' + i;
      const chk = (arr, kind, list) => list.map((v) => `<label class="chip"><input type="checkbox" data-s="${i}" data-kind="${kind}" value="${esc(v)}"${arr.includes(v) ? ' checked' : ''}><span>${esc(v)}</span></label>`).join('');
      return `<fieldset class="scale" data-s="${i}"><legend>${esc(s.label || s.name || '새 척도')}</legend>
<div class="scale-grid"><div><label for="${id}n">척도 이름(변수명 앞부분)</label><input type="text" id="${id}n" data-s="${i}" data-sk="name" value="${esc(s.name || '')}" spellcheck="false"></div>
<div><label for="${id}l">설명</label><input type="text" id="${id}l" data-s="${i}" data-sk="label" value="${esc(s.label || '')}"></div>
<div class="mm"><label for="${id}min">응답 범위</label><span class="rng"><input type="number" id="${id}min" data-s="${i}" data-sk="min" value="${s.min ?? ''}" aria-label="척도 최솟값"><span aria-hidden="true">~</span><input type="number" id="${id}max" data-s="${i}" data-sk="max" value="${s.max ?? ''}" aria-label="척도 최댓값"></span></div>
<div><label for="${id}r">평균을 낼 최소 응답</label><select id="${id}r" data-s="${i}" data-sk="ratio">${[[0.5, '문항의 50% 이상'], [2 / 3, '문항의 2/3 이상'], [0.8, '문항의 80% 이상'], [1, '모든 문항']].map(([v, t]) => `<option value="${v}"${Math.abs((s.meanMinRatio ?? 0.8) - v) < 1e-6 ? ' selected' : ''}>${t}</option>`).join('')}</select></div></div>
<fieldset class="chips"><legend>문항 <span class="note">${s.items.length}개</span></legend>${chk(s.items, 'item', items) || '<p class="note">"척도 문항" 역할인 열이 없습니다.</p>'}</fieldset>
<fieldset class="chips rev"><legend>역문항 <span class="note">${s.reverse.length}개, 고른 문항 가운데서</span></legend>${s.items.length ? `<div class="revnum"><label for="${id}rn">문항 번호로 고르기</label><input type="text" id="${id}rn" data-s="${i}" data-sk="revnum" placeholder="예: 4, 9, 14" inputmode="numeric" autocomplete="off"></div>` : ''}${chk(s.reverse, 'rev', s.items) || '<p class="note">먼저 문항을 고르세요.</p>'}</fieldset>
${s.items.some((it) => (S.rules.columns.find((c) => c.name === it) || {}).confirm) ? `<div class="warn scale-confirm"><p>이 척도 문항 가운데 몇 점 척도인지 자료만으로 확실하지 않은 것이 있습니다. 위 "응답 범위"가 설문지와 같은지 보고 확인하세요. 진단에서 열마다 범위가 달랐다면 길이가 다른 척도가 섞였을 수 있으니, 그때는 척도를 나누세요.</p><label class="check"><input type="checkbox" data-s="${i}" data-sk="confirm"> 응답 범위 ${s.min ?? '?'}~${s.max ?? '?'}가 맞습니다(문항 전체에 적용)</label></div>` : ''}
${s.confirm ? `<div class="warn scale-confirm"><p>같은 지시문(그리드) 아래에 있다는 것만으로 묶은 척도입니다. 한 그리드에 하위요인이 여럿 들어 있으면 합계·평균·알파가 틀립니다. 설문지와 대조해 서로 다른 하위요인이면 위 "문항"에서 빼고 척도를 추가해 나누세요.</p><label class="check"><input type="checkbox" data-s="${i}" data-sk="group"> 이 문항 ${s.items.length}개는 한 척도가 맞습니다 <span class="hint">(눌러야 정리가 실행됩니다. 하위요인이 섞이면 합계·평균·알파가 틀려서 확인을 요구합니다)</span></label></div>` : ''}
<div class="scale-foot"><label class="check"><input type="checkbox" data-s="${i}" data-sk="sum"${s.sum !== false ? ' checked' : ''}> 합계 만들기</label><label class="check"><input type="checkbox" data-s="${i}" data-sk="mean"${s.mean !== false ? ' checked' : ''}> 평균 만들기</label><button type="button" class="btn quiet sm" data-del="${i}">이 척도 지우기</button></div></fieldset>`;
    }).join('') : '<p class="note">척도가 없습니다. 척도 문항을 묶으려면 척도를 추가하세요.</p>';
    $$('#scales [data-del]').forEach((b) => { b.innerHTML = ICON_TRASH + '이 척도 지우기'; });
  }
  const ICON_TRASH = '<svg class="icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
  $('#scales').addEventListener('change', (e) => {
    const el = e.target; const s = S.rules.scales[+el.dataset.s]; if (!s) return;
    if (el.dataset.kind === 'item') { if (el.checked) { if (!s.items.includes(el.value)) s.items.push(el.value); const order = S.rules.columns.map((c) => c.name); s.items.sort((a, b) => order.indexOf(a) - order.indexOf(b)); } else { s.items = s.items.filter((x) => x !== el.value); s.reverse = s.reverse.filter((x) => x !== el.value); } const f = document.activeElement && document.activeElement.value; renderScales(); refocus(el.dataset.s, 'item', f); return; }
    if (el.dataset.kind === 'rev') { if (el.checked) s.reverse.push(el.value); else s.reverse = s.reverse.filter((x) => x !== el.value); $(`fieldset.scale[data-s="${el.dataset.s}"] .rev .note`).textContent = `${s.reverse.length}개, 고른 문항 가운데서`; return; }
    const k = el.dataset.sk;
    if (k === 'revnum') {
      const nums = new Set(parseNums(el.value).map(Math.round));
      s.reverse = s.items.filter((it) => { const m = it.match(/(\d+)$/); return m && nums.has(+m[1]); });
      const miss = [...nums].filter((n) => !s.items.some((it) => (it.match(/(\d+)$/) || [])[1] && +it.match(/(\d+)$/)[1] === n));
      renderScales(); const box = $(`#s${el.dataset.s}rn`); box.value = el.value; box.focus();
      live(`역문항 ${s.reverse.length}개를 골랐습니다${miss.length ? `. 번호 ${miss.join(', ')}에 맞는 문항이 이 척도에 없습니다` : ''}.`);
      return;
    }
    if (k === 'confirm' && el.checked) {
      // 척도 범위를 문항 전체에 적용하고 확인 표시를 지운다. 사전은 같은 길이의 것으로 맞춘다
      s.items.forEach((it) => { const c = S.rules.columns.find((x) => x.name === it); if (!c) return; c.range = [s.min, s.max]; delete c.confirm; if (c.dictionary && E.DICTS[c.dictionary] && (E.DICTS[c.dictionary].min !== s.min || E.DICTS[c.dictionary].max !== s.max)) { const lang = /^en/.test(c.dictionary) ? 'en' : 'agree'; const alt = Object.keys(E.DICTS).find((k2) => k2.startsWith(lang) && E.DICTS[k2].min === s.min && E.DICTS[k2].max === s.max); c.dictionary = alt; } });
      renderRules(); live('척도 문항의 응답 범위를 확인했습니다.'); return;
    }
    if (k === 'group' && el.checked) { delete s.confirm; renderScales(); live('척도 묶음을 확인했습니다.'); return; }
    if (k === 'name') s.name = el.value.trim(); if (k === 'label') { s.label = el.value; el.closest('fieldset.scale').querySelector('legend').textContent = s.label || s.name; }
    if (k === 'min' || k === 'max') s[k] = el.value === '' ? undefined : +el.value;
    if (k === 'ratio') s.meanMinRatio = +el.value; if (k === 'sum') s.sum = el.checked; if (k === 'mean') s.mean = el.checked;
  });
  function refocus(si, kind, val) { const x = $(`#scales input[data-s="${si}"][data-kind="${kind}"][value="${CSS.escape(val || '')}"]`); if (x) x.focus(); }
  $('#scales').addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (!b) return; S.rules.scales.splice(+b.dataset.del, 1); renderScales(); live('척도를 지웠습니다.'); $('#addScale').focus(); });
  $('#addScale').addEventListener('click', () => {
    const it = S.rules.columns.find((c) => c.role === 'item');
    S.rules.scales.push({ name: '척도' + (S.rules.scales.length + 1), label: '', items: [], reverse: [], min: it && it.range ? it.range[0] : 1, max: it && it.range ? it.range[1] : 5, sum: true, mean: true, meanMinRatio: 0.8 });
    renderScales(); const k = S.rules.scales.length - 1; $(`#s${k}n`).focus();
  });

  function renderFlags() {
    const f = S.rules.flags; const R = S.rules;
    const hasTime = R.columns.some((c) => c.role === 'duration') || (R.columns.some((c) => c.role === 'start') && R.columns.some((c) => c.role === 'end'));
    const nItems = R.columns.filter((c) => c.role === 'item').length;
    const att = R.columns.filter((c) => c.role === 'attention');
    const idOpts = R.columns.filter((c) => ['id', 'drop', 'text', 'category'].includes(c.role)).map((c) => `<option value="${esc(c.source)}"${f.duplicateId.column === c.source ? ' selected' : ''}>${esc(c.source)}</option>`).join('');
    const row = (k, title, body, why, dis) => `<div class="flag${dis ? ' off' : ''}"><label class="check"><input type="checkbox" data-f="${k}"${f[k].on && !dis ? ' checked' : ''}${dis ? ' disabled' : ''}> <strong>${title}</strong></label><div class="flag-body">${body}<p class="hint">${why}</p></div></div>`;
    $('#flags').innerHTML = [
      row('longstring', '같은 값이 길게 이어짐(일자 응답)', `<label for="fl1">같은 값이 연속</label> <input type="number" id="fl1" data-fv="longstring.min" value="${f.longstring.min}" min="2" step="1" class="w5"> 문항 이상`, `척도 문항 ${nItems}개를 열 순서대로 봅니다(주의확인 문항 제외, 응답 범위가 다른 척도가 이어지는 곳에서는 새로 셈). 기본값은 문항이 10개 이하면 모든 문항, 그보다 많으면 절반(최소 10)이고, 6개보다 적으면 성실한 응답자도 같은 값으로만 답하는 일이 흔해 기본으로 끕니다. 정해진 기준은 없으니 연구방법에 쓴 값을 밝히세요.`),
      row('attention', '주의확인 문항 오답', att.length ? `정답: ${att.map((c) => `${esc(c.name)} = ${c.pass ?? '(정답을 위 표에 적으세요)'}`).join(', ')}` : '', att.length ? '정답이 아닌 값을 고르면 표시합니다. 빈 칸은 오답으로 보지 않습니다.' : '역할이 "주의확인 문항"인 열이 없습니다.', !att.length),
      row('missingItems', '결측이 많은 응답', `<label for="fl3">척도 문항의</label> <input type="number" id="fl3" data-fv="missingItems.minRatio" value="${Math.round(f.missingItems.minRatio * 100)}" min="1" max="100" step="1" class="w5"> % 이상이 빔<br><label class="check sm"><input type="checkbox" data-fv="missingItems.countAsCareless"${f.missingItems.countAsCareless ? ' checked' : ''}> 불성실 의심에도 넣기</label>`, '중간에 그만둔 응답을 "결측과다"로 따로 표시합니다. 무응답은 불성실 응답과 다른 현상이라 기본으로는 불성실 의심에 넣지 않습니다. 범위 밖이라 결측 처리한 칸도 셉니다.'),
      row('duplicateAll', '같은 응답 전체(중복 제출)', `척도 문항을 <input type="number" id="fl4" data-fv="duplicateAll.minAnswered" value="${f.duplicateAll.minAnswered}" min="1" step="1" class="w5" aria-label="중복 판정에 필요한 최소 응답 문항 수"> 개 이상 답했고, 앞선 응답과 모든 답이 같음`, '시각과 식별값 열은 비교하지 않습니다. 첫 응답은 그대로 두고 뒤의 응답을 표시합니다.'),
      row('duplicateId', '같은 식별값 다시 나옴', idOpts ? `<label for="fl5">식별값 열</label> <select id="fl5" data-fv="duplicateId.column"><option value="">고르기</option>${idOpts}</select>` : '', idOpts ? '학번, 이메일처럼 한 사람에 하나인 값이 다시 나오면 표시합니다. 개인정보 열은 정리본에서 빠져도 여기에는 쓸 수 있습니다.' : '식별값으로 쓸 열이 없습니다.', !idOpts),
      row('speed', '너무 빠른 응답', `<label for="fl6">응답 시간</label> <input type="number" id="fl6" data-fv="speed.minSeconds" value="${f.speed.minSeconds}" min="1" step="1" class="w5"> 초 미만`, hasTime ? `문항당 2초 기준이면 ${Math.max(1, nItems) * 2}초입니다(Huang 등, 2012).` : (S.diag.rows.speed.reason || '응답 시간 열이 없습니다.'), !hasTime),
    ].join('');
  }
  $('#flags').addEventListener('change', (e) => {
    const el = e.target; const f = S.rules.flags;
    if (el.dataset.f) { f[el.dataset.f].on = el.checked; return; }
    if (el.dataset.fv) { const [a, b] = el.dataset.fv.split('.'); f[a][b] = b === 'countAsCareless' ? el.checked : b === 'column' ? (el.value || null) : b === 'minRatio' ? (+el.value) / 100 : +el.value; if (a === 'duplicateId' && el.value) { f.duplicateId.on = true; $('[data-f="duplicateId"]').checked = true; } }
  });

  // 오류 위치를 사람이 읽는 말로
  function where(path, rules) {
    const R = rules || S.rules || {};
    let m = path.match(/^columns\[(\d+)\]\.?(\w*)/);
    if (m) { const c = (R.columns || [])[+m[1]]; const f = { name: '변수명', role: '역할', range: '응답 범위', confirm: '응답 범위 확인', source: '원자료 머리글', valueMap: '대응표', pass: '주의확인 정답', dictionary: '사전', missingCodes: '결측 코드', options: '보기 목록', outOfRange: '범위 밖 처리' }[m[2]] || m[2]; return `${+m[1] + 1}번째 열${c && c.source ? `(${c.source})` : ''}${f ? '의 ' + f : ''}`; }
    m = path.match(/^scales\[(\d+)\]\.?([\w/]*)(?:\[(\d+)\])?/);
    if (m) { const s = (R.scales || [])[+m[1]]; const f = { name: '이름', items: '문항', reverse: '역문항', 'min/max': '범위', meanMinRatio: '평균 최소 응답', confirm: '묶음 확인' }[m[2]] || m[2]; return `${+m[1] + 1}번째 척도${s && s.name ? `(${s.name})` : ''}${f ? '의 ' + f : ''}`; }
    m = path.match(/^flags\.(\w+)/);
    if (m) return '불성실 응답 표시 규칙(' + m[1] + ')';
    return path;
  }
  function markInvalid(errors) {
    $$('#s3 [aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    errors.forEach((e) => {
      let m = e.path.match(/^columns\[(\d+)\]\.(name|range|pass)/);
      if (m) { const el = m[2] === 'name' ? $(`#c${m[1]}name`) : m[2] === 'pass' ? $(`#c${m[1]}pass`) : $(`#c${m[1]}lo`); if (el) el.setAttribute('aria-invalid', 'true'); }
      m = e.path.match(/^scales\[(\d+)\]\.name/); if (m) { const el = $(`#s${m[1]}n`); if (el) el.setAttribute('aria-invalid', 'true'); }
    });
  }
  const errList = (errs, title, rules) => `<div class="err-box" role="alert"><p><strong>${esc(title)}</strong></p><ul>${errs.slice(0, 30).map((e) => `<li><span class="path">${esc(where(e.path, rules))}</span> ${esc(e.msg)}</li>`).join('')}${errs.length > 30 ? `<li>외 ${errs.length - 30}건</li>` : ''}</ul></div>`;

  $('#run').addEventListener('click', () => {
    const v = E.validateRules(S.rules, S.table.headers);
    markInvalid(v.errors);
    if (v.errors.length) { const box = $('#err3'); box.innerHTML = errList(v.errors, `규칙에 고칠 곳이 ${v.errors.length}군데 있습니다.`); box.scrollIntoView({ block: 'center' }); const first = $('#s3 [aria-invalid="true"]'); if (first) first.focus(); return; }
    $('#err3').innerHTML = '';
    try { S.res = E.run(S.table, S.rules); } catch (e) { $('#err3').innerHTML = errList(e.errors || [{ path: '', msg: e.message }], '정리하지 못했습니다.'); return; }
    S.maxStep = 4; renderResult(); go(4); live('정리를 마쳤습니다.');
  });

  // ------------------------------------------------------------ 규칙 파일
  const download = (name, data, type) => { const b = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
  const baseName = () => (S.table && S.table.fileName ? S.table.fileName.replace(/\.[^.]+$/, '') : '설문자료');
  $('#saveRules').addEventListener('click', () => download(baseName() + '_정리규칙.json', JSON.stringify(cleanRules(S.rules), null, 2), 'application/json'));
  const cleanRules = (r) => JSON.parse(JSON.stringify(r, (k, v) => (k.startsWith('_') ? undefined : v)));
  async function loadRulesText(text, msgEl, origin) {
    const p = E.parseRulesText(text);
    if (!p.rules) { msgEl.innerHTML = errList(p.errors, `${origin}을 JSON으로 읽지 못했습니다.`); return false; }
    const filled = E.fillFromDiagnosis(p.rules, S.diag);
    const v = E.validateRules(p.rules, S.table.headers);
    v.warnings = filled.concat(v.warnings);
    if (v.errors.length) { S.lastBad = p.rules; msgEl.innerHTML = errList(v.errors, `${origin}에 규칙 형식과 맞지 않는 곳이 ${v.errors.length}군데 있습니다. 화면의 규칙은 그대로 두었습니다.`, p.rules) + `<p class="hint">AI에게 위 목록을 그대로 붙여 넣고 "이 오류를 고친 JSON 전체를 다시 달라"고 하면 대개 한 번에 고쳐집니다. <button type="button" class="copy" id="copyErr">오류 목록 복사</button></p>`; const ce = $('#copyErr'); if (ce) ce.addEventListener('click', () => copyText(v.errors.map((e) => `- ${e.path}: ${e.msg}`).join('\n'), ce)); return false; }
    const before = S.rules;
    S.rules = v.rules;
    const renamed = S.rules.columns.filter((c) => { const b = before.columns.find((x) => x.source === c.source); return b && b.name !== c.name; }).length;
    const checks = dataChecks(S.rules);
    const notes = Array.isArray(p.rules.notes) ? p.rules.notes : [];
    renderRules();
    msgEl.innerHTML = `<div class="ok-box"><p><strong>${esc(origin)}을 규칙으로 불러왔습니다.</strong> 변수명 ${renamed}개가 바뀌었고, 척도 ${S.rules.scales.length}개(역문항 ${new Set(S.rules.scales.flatMap((s) => s.reverse)).size}개)를 읽었습니다. 아래 표에서 확인한 뒤 정리하세요.</p>${v.warnings.length ? `<p>알아서 맞춘 곳:</p><ul>${v.warnings.slice(0, 12).map((w) => `<li>${esc(where(w.path, S.rules))}: ${esc(w.msg)}</li>`).join('')}</ul>` : ''}${checks.length ? `<p>실제 자료와 대 보니 확인할 곳(이 대조는 브라우저 안에서만 했습니다):</p><ul>${checks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${notes.length ? `<p>AI가 남긴 확인할 점:</p><ul>${notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`;
    return true;
  }
  // AI가 자료 값을 보지 못하고 만든 규칙을 실제 값과 대조한다(브라우저 안에서)
  function dataChecks(R) {
    const out = [];
    R.columns.forEach((c) => {
      const j = S.table.headers.indexOf(c.source); if (j < 0) return;
      const vals = S.table.rows.map((r) => r[j]).filter((v) => !E.isBlank(v));
      if (!vals.length) return;
      if ((c.role === 'item' || c.role === 'attention') && c.range) {
        const col = { _dict: c.dictionary ? E.DICTS[c.dictionary].map : null, _map: c.valueMap ? Object.fromEntries(Object.entries(c.valueMap).map(([k, v]) => [E.norm(k), v])) : null };
        const rd = vals.map((v) => E.readNumber(v, col));
        const bad = rd.filter((x) => x.st === 'bad').length; const out_ = rd.filter((x) => x.v !== null && (x.v < c.range[0] || x.v > c.range[1])).length;
        if (out_ / vals.length > 0.05) out.push(`${c.name}: 응답의 ${Math.round(100 * out_ / vals.length)}%가 정한 범위 ${c.range[0]}~${c.range[1]} 밖입니다. 범위가 맞는지 보세요.`);
        if (bad / vals.length > 0.05) out.push(`${c.name}: 응답의 ${Math.round(100 * bad / vals.length)}%를 숫자로 읽지 못합니다. 글자 응답 사전을 고르세요.`);
      }
      if (c.role === 'category' && c.valueMap) {
        const keys = new Set(Object.keys(c.valueMap).map(E.norm));
        const miss = [...new Set(vals.map((v) => String(v)))].filter((v) => !keys.has(E.norm(v)) && !(typeof v === 'number' || /^\d+$/.test(v)));
        if (miss.length) out.push(`${c.name}: 대응표에 없는 표기 ${miss.length}가지(결측이 됩니다). "대응표"를 열어 코드를 채우세요.`);
      }
    });
    return out.slice(0, 12);
  }
  $('#rulesFile').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; await loadRulesText(await f.text(), $('#jsonMsg'), '규칙 파일'); e.target.value = ''; });
  $('#loadAI').addEventListener('click', async () => { const t = $('#aiAnswer').value; if (!t.trim()) { $('#aiMsg').innerHTML = errList([{ path: '(전체)', msg: 'AI의 답을 붙여 넣으세요.' }], '붙여 넣은 답이 없습니다.'); return; } await loadRulesText(t, $('#aiMsg'), 'AI의 답'); });

  // ------------------------------------------------------------ AI 프롬프트 (2단계, 서버 없음)
  async function extractDoc(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const u8 = new Uint8Array(await file.arrayBuffer());
    if (ext === 'txt' || ext === 'md') return E.decodeBytes(u8);
    if (ext === 'docx') {
      const z = XLSX.CFB.read(u8, { type: 'array' });
      const ent = XLSX.CFB.find(z, 'word/document.xml') || XLSX.CFB.find(z, '/word/document.xml');
      if (!ent) throw new Error('docx 안에서 본문을 찾지 못했습니다.');
      const xml = new TextDecoder('utf-8').decode(ent.content);
      return xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<w:br\/>/g, '\n').replace(/<\/w:tc>/g, '\t').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
    }
    if (ext === 'pdf') {
      const pdfjs = await import(asset('vendor/pdfjs/pdf.min.mjs'));
      pdfjs.GlobalWorkerOptions.workerSrc = asset('vendor/pdfjs/pdf.worker.min.mjs');
      const doc = await pdfjs.getDocument({ data: u8, cMapUrl: asset('vendor/pdfjs/cmaps/'), cMapPacked: true, isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise;
      const pages = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const tc = await (await doc.getPage(p)).getTextContent();
        // 글 조각 사이에 빈틈이 있으면 띄어쓰기를 넣는다(PDF는 띄어쓰기를 글자로 넣지 않고 위치로만 두는 경우가 많다)
        let line = '', lastY = null, lastEnd = null; const ls = [];
        tc.items.forEach((it) => {
          if (!it.str && !it.hasEOL) return;
          const x = it.transform ? it.transform[4] : 0; const y = it.transform ? Math.round(it.transform[5]) : 0; const fs = it.transform ? Math.abs(it.transform[0]) || 10 : 10;
          if (lastY !== null && Math.abs(y - lastY) > 2) { ls.push(line); line = ''; lastEnd = null; }
          if (lastEnd !== null && x - lastEnd > fs * 0.15 && !/\s$/.test(line) && !/^\s/.test(it.str)) line += ' ';
          line += it.str; lastY = y; lastEnd = x + (it.width || 0);
          if (it.hasEOL) { ls.push(line); line = ''; lastY = null; lastEnd = null; }
        });
        if (line) ls.push(line);
        pages.push(ls.join('\n'));
      }
      return pages.join('\n\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    if (ext === 'hwp' || ext === 'hwpx') throw new Error('한글 파일은 직접 읽지 못합니다. 한글에서 PDF로 저장해 올리세요.');
    throw new Error('txt, docx, pdf 파일만 읽습니다.');
  }
  $('#docFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    $('#docName').textContent = f.name;
    $('#docInfo').textContent = '글을 뽑는 중입니다.';
    try {
      // 일부 PDF는 띄어쓰기를 제어 문자(U+0001 등)로 내보낸다. 제어 문자는 띄어쓰기로 바꾼다.
      S.doc = (await extractDoc(f)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').replace(/ {2,}/g, ' '); S.docName = f.name;
      $('#docInfo').textContent = S.doc.length ? `${f.name}에서 글 ${S.doc.length.toLocaleString()}자를 뽑았습니다. 프롬프트에 그대로 들어가니, 만든 뒤 내용을 한 번 훑어보세요.` : `${f.name}에서 글을 뽑지 못했습니다(스캔한 이미지 PDF일 수 있습니다). 설명 칸에 척도 구성을 직접 적어 주세요.`;
    } catch (err) { S.doc = ''; $('#docInfo').textContent = err.message; }
  });
  $('#mkPrompt').addEventListener('click', () => {
    let optionLists = null;
    if ($('#incOpts').checked) {
      optionLists = {};
      S.diag.cols.filter((c) => c.kind === 'category' && !c.pii && c.distinctCount <= 12 && c.distinct.every(([, k]) => k >= 3)).forEach((c) => { optionLists[c.source] = c.distinct.map(([v]) => String(v)); });
    }
    const p = E.buildPrompt(S.table, S.doc, $('#desc').value, { optionLists, diag: S.diag });
    $('#prompt').value = p; $('#prompt').scrollTop = 0;
    $('#promptInfo').textContent = `프롬프트 ${p.length.toLocaleString()}자. 들어간 것: 열 머리글 ${S.table.headers.length}개${S.doc ? `, ${S.docName}의 글` : ''}${$('#desc').value.trim() ? ', 적어 주신 설명' : ''}${optionLists && Object.keys(optionLists).length ? `, 범주 열 ${Object.keys(optionLists).length}개의 보기 목록` : ''}. 응답 값은 들어 있지 않습니다.`;
    $('#prompt').focus();
  });

  // ------------------------------------------------------------ 4. 결과
  function renderResult() {
    const r = S.res, s = r.summary;
    $('#resLead').textContent = `응답 ${s.n}행을 하나도 지우지 않고 정리했습니다. 원자료 파일은 바뀌지 않았습니다. 의심되는 응답은 표시만 했으니, 분석에서 뺄지는 "제외결정" 칸에 직접 적으세요.`;
    const st = [
      ['글자를 숫자로', s.textConverted + s.recoded + '칸', `응답 보기·단위 ${s.textConverted}칸, 범주 코드 ${s.recoded}칸`],
      ['결측으로 바꿈', s.outOfRange + s.unreadable + s.missingCode + '칸', `범위 밖 ${s.outOfRange}, 읽을 수 없음 ${s.unreadable}, 결측 코드 ${s.missingCode}`],
      ['불성실 의심', s.careless + '행', [s.longstringRule !== null ? `일자 ${s.longstringRule}` : '', s.attentionFail ? `주의확인 ${s.attentionFail}` : '', s.missingCountsAsCareless ? `결측 ${s.missingRule}` : '', s.fast ? `빠름 ${s.fast}` : ''].filter(Boolean).join(', ') || '규칙에 해당 없음'],
      ...(s.missingRule !== null && !s.missingCountsAsCareless ? [['결측 많은 응답', s.missingRule + '행', '불성실 의심과 따로 표시']] : []),
      ['중복 의심', s.duplicates + s.idDuplicates + '행', s.idDuplicates ? `모든 답이 같음 ${s.duplicates}, 같은 식별값 ${s.idDuplicates}` : '앞선 응답과 모든 답이 같음'],
      ['변수', s.variables + '개', `역채점 ${r.revVars.length}, 척도 점수 ${r.scoreVars.length}${s.dropped.length ? `, 뺀 열 ${s.dropped.length}` : ''}`],
    ];
    $('#resStats').innerHTML = st.map(([k, v, x]) => `<div class="stat"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span><span class="s">${esc(x)}</span></div>`).join('');
    const items = [
      ['xlsx', '정리된자료.xlsx', '정리본, 코드북, 변수명 대응, 바꾼 칸, 표시된 응답, 신뢰도, 정리 규칙을 시트로 묶음', 'file-spreadsheet'],
      ['csv', '정리된자료.csv', 'SPSS·R·jamovi에서 바로 여는 정리본(UTF-8)', 'file-spreadsheet'],
      ['codebook', '코드북.xlsx', '변수명, 설명, 값 라벨, 역채점, 소속 척도, 결측 처리', 'book-open-text'],
      ['report', '처리내역보고서.html', '무엇을 몇 칸 바꿨고 누구를 왜 표시했는지. 브라우저에서 열어 PDF로 인쇄할 수 있음', 'file-text'],
      ['sps', '정리문법.sps', 'SPSS: 정리본을 열고 점수·표시를 다시 계산해 대조, 변수 설명과 값 라벨 붙이기', 'file-code'],
      ['r', '정리코드.R', 'R: 원자료 파일에서 시작해 같은 정리를 처음부터 다시 함', 'file-code'],
      ['json', '정리규칙.json', '이 규칙을 저장해 두었다가 다시 불러오기', 'file-json'],
    ];
    $('#dlList').innerHTML = items.map(([k, n, d]) => `<li><button type="button" class="btn ghost" data-dl="${k}">${ICON_DL}${esc(n)}</button><span>${esc(d)}</span></li>`).join('');
    // 문장(빈칸은 연구자가 채운다). 숫자는 모두 이번 정리 결과에서 가져온다.
    const f = r.rules.flags; const crit = [];
    if (f.longstring.on && s.itemCount) crit.push(`${f.longstring.min}문항 이상 같은 값으로 연속 응답`);
    if (f.attention.on && r.order.includes('주의확인불합격')) crit.push('주의확인 문항 오답');
    if (f.missingItems.on && f.missingItems.countAsCareless) crit.push(`척도 문항의 ${Math.round(f.missingItems.minRatio * 1000) / 10}% 이상 결측`);
    if (f.speed.on && r.order.includes('빠른응답')) crit.push(`응답 시간 ${f.speed.minSeconds}초 미만`);
    const parts = [];
    if (crit.length) parts.push(`불성실 응답 판정 기준(${crit.join(', ')}) 가운데 하나 이상에 해당한 응답이 ${s.careless}부`);
    if (f.missingItems.on && !f.missingItems.countAsCareless) parts.push(`척도 문항의 ${Math.round(f.missingItems.minRatio * 1000) / 10}% 이상이 결측인 응답이 ${s.missingRule}부`);
    if (f.duplicateAll.on) parts.push(`모든 응답이 앞선 응답과 동일한 응답이 ${s.duplicates}부`);
    if (f.duplicateId.on) parts.push(`같은 식별값으로 다시 제출된 응답이 ${s.idDuplicates}부`);
    const revTxt = r.rules.scales.filter((x) => x.reverse.length).map((x) => `${x.label || x.name} ${x.reverse.length}문항`);
    const ratios = [...new Set(r.rules.scales.map((x) => Math.round(x.meanMinRatio * 100)))];
    const totalProrated = Object.values(s.prorated || {}).reduce((a, b) => a + b, 0);
    const catBad = Object.values(s.categoryUnmapped || {}).reduce((a, b) => a + b, 0);
    const bad = s.outOfRange + (s.unreadable - catBad) + s.missingCode;
    $('#sentence').textContent = `수집된 ${s.n}부의 응답을 정리하였다. ${parts.length ? parts.join(', ') + `였다(하나 이상에 해당한 응답은 모두 ${s.anyFlag}부). ` : ''}이 가운데 ___부를 분석에서 제외하여 최종 ___부를 분석에 사용하였다. ${revTxt.length ? `역문항(${revTxt.join(', ')})은 역채점하였다. ` : ''}${r.rules.scales.length ? `척도 점수는 문항의 ${ratios.join('% 또는 ')}% 이상 응답한 경우 응답한 문항의 평균으로 계산하였고(일부 문항 결측으로 이렇게 환산한 경우 ${totalProrated}건), 합계는 모든 문항에 응답한 경우에만 계산하였다. ` : ''}${bad ? `응답 범위를 벗어나거나 숫자로 읽을 수 없는 값${s.missingCode ? '과 결측 코드' : ''} ${bad}개는 결측으로 처리하였다. ` : ''}${catBad ? `범주 문항에서 정한 보기에 없는 표기 ${catBad}개도 결측으로 처리하였다.` : ''}`;
    // 확인할 점: 규칙 검사 경고와 흔한 실수
    const warns = (r.warnings || []).map((w) => w.msg);
    if (r.rules.scales.length && !r.rules.scales.some((x) => x.reverse.length)) warns.push('역문항이 하나도 없습니다. 설문지에 역문항이 정말 없는지 확인하세요(있다면 3단계의 "척도와 역문항"에서 고릅니다).');
    if (r.rules.columns.some((c) => c.role === 'category' && c.codeOrder === 'frequency')) warns.push('범주 코드 가운데 많이 나온 순서로 붙인 것이 있습니다. 순서가 있는 범주(학력, 소득 등)라면 3단계의 대응표에서 순서를 고치세요.');
    Object.entries(s.categoryUnmapped || {}).forEach(([v, k]) => warns.push(`${v}: 대응표에 없는 표기 ${k}칸을 결측으로 두었습니다. 3단계 대응표에서 코드를 채우면 살릴 수 있습니다.`));
    if (r.rules.flags.duplicateAll.on && s.dupBasis && s.dupBasis < 10) warns.push(`중복 판정에 쓴 문항이 ${s.dupBasis}개뿐이라 서로 다른 사람이 우연히 같게 답했을 수 있습니다. "모든 답이 같은 응답"은 제출 시각 등을 함께 보고 판단하세요.`);
    if (!s.itemCount) warns.push('척도 문항으로 정한 열이 없어 결측 비율, 일자 응답, 척도 점수를 계산하지 않았습니다. 리커트 문항이 있다면 3단계에서 역할을 "척도 문항"으로 바꾸세요.');
    if (s.blankSkipped) warns.push(`원자료의 완전히 빈 줄 ${s.blankSkipped}개는 응답이 아니라서 건너뛰었습니다.`);
    $('#resWarn').innerHTML = warns.length ? `<p><strong>확인할 점</strong></p><ul>${warns.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
    // 표
    // 원래 값의 앞뒤 공백이 보이도록 따옴표로 감싸 보여 준다("4 " → 4)
    const show = (c, v) => (c === '원래값' && typeof v === 'string' && v !== v.trim() ? `"${v}"` : fmt(v));
    const tbl = (sel, rows, cols, max, heads) => { const tr = rows.slice(0, max); $(sel).innerHTML = `<thead><tr>${cols.map((c, k) => `<th scope="col">${esc(heads ? heads[k] : c)}</th>`).join('')}</tr></thead><tbody>${tr.map((x) => `<tr>${cols.map((c) => `<td>${esc(show(c, x[c]))}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}">없음</td></tr>`}</tbody>`; };
    tbl('#flagTable', r.flagged, ['응답ID', '원자료_행', '불성실사유', '결측과다', '중복원본ID', '범위밖값수', '결측문항수'], 200);
    $('#flagNote').textContent = `${r.flagged.length}행${r.flagged.length > 200 ? ', 처음 200행만 보임' : ''}`;
    tbl('#chgTable', r.changes, ['원자료_행', '변수', '종류', '원래값', '처리후'], 100);
    $('#chgNote').textContent = `${r.changes.length}칸${r.changes.length > 100 ? ', 처음 100칸만 보임. 전체는 내려받은 파일에' : ''}${r.recode.length ? `. 범주 코드 바꾸기 ${s.recoded}칸은 파일의 "범주_코드" 시트에` : ''}`;
    $('#alphaCard').hidden = !r.alpha.length;
    tbl('#alphaTable', r.alpha, ['척도', '문항수', '사례수_전체', '알파_전체'], 50, ['척도', '문항 수', '완전응답 사례 수', '알파(완전응답)']);
  }
  const ICON_DL = '<svg class="icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>';

  const dataAoa = (r) => [r.order].concat(r.data[r.order[0]].map((_, i) => r.order.map((v) => r.data[v][i])));
  const objAoa = (rows, cols) => [cols].concat(rows.map((x) => cols.map((c) => x[c] === undefined ? null : x[c])));
  function sheet(aoa, widths) { const ws = XLSX.utils.aoa_to_sheet(aoa); if (widths) ws['!cols'] = widths.map((w) => ({ wch: w })); return ws; }
  function nameMap(r) { return S.rules.columns.map((c) => ({ '원자료 열 이름': c.source, '새 변수명': c.role === 'drop' ? '(내보내지 않음)' : c.role === 'multi' ? `${c.name}_1 ~ ${c.name}_${(c.options || []).length}` : c.name, 역할: E.ROLE_KO[c.role] })); }
  const CB_COLS = ['변수명', '변수 설명', '유형', '값 라벨', '측정 수준', '값 범위', '역채점', '소속 척도', '결측 처리', '비고', '원자료 열 이름'];
  function makeXlsx() {
    const r = S.res; const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet(dataAoa(r)), '정리된자료');
    XLSX.utils.book_append_sheet(wb, sheet(objAoa(r.codebook, CB_COLS), [16, 44, 8, 40, 8, 10, 12, 14, 30, 36, 30]), '코드북');
    XLSX.utils.book_append_sheet(wb, sheet(objAoa(nameMap(r), ['원자료 열 이름', '새 변수명', '역할']), [50, 20, 16]), '변수명_대응');
    XLSX.utils.book_append_sheet(wb, sheet(objAoa(r.changes, ['종류', '응답ID', '원자료_행', '변수', '원래값', '처리후', '설명']), [18, 8, 8, 14, 14, 8, 60]), '값_변경내역');
    if (r.recode.length) XLSX.utils.book_append_sheet(wb, sheet(objAoa(r.recode, ['변수', '원래표기', '코드', '건수']), [14, 24, 8, 8]), '범주_코드');
    XLSX.utils.book_append_sheet(wb, sheet(objAoa(r.flagged.map((x) => Object.assign({}, x, { '제외결정(연구자 기입)': null })), ['응답ID', '원자료_행', '불성실의심', '불성실사유', '결측과다', '중복의심', '중복원본ID', '식별값중복', '범위밖값수', '범위점검', '결측문항수', '제외결정(연구자 기입)']), [8, 8, 8, 44, 8, 10, 8, 8, 8, 8, 18]), '표시된응답');
    if (r.alpha.length) XLSX.utils.book_append_sheet(wb, sheet(objAoa(r.alpha.map((a) => ({ 척도: a.척도, '문항 수': a.문항수, '완전응답 사례 수': a.사례수_전체, '알파(완전응답)': a.알파_전체, 비고: '제외 결정 전 값. 보고할 알파는 최종 표본에서 다시 계산' })), ['척도', '문항 수', '완전응답 사례 수', '알파(완전응답)', '비고']), [30, 8, 14, 14, 44]), '신뢰도');
    XLSX.utils.book_append_sheet(wb, sheet([['이 시트의 글을 복사해 .json 파일로 저장하거나 도구에 붙여 넣으면 같은 규칙을 다시 불러옵니다.'], [JSON.stringify(cleanRules(r.rules))]]), '정리규칙');
    return wb;
  }
  $('#dlList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dl]'); if (!b) return; const r = S.res; const k = b.dataset.dl;
    if (k === 'xlsx') XLSX.writeFile(makeXlsx(), baseName() + '_정리된자료.xlsx', { compression: true });
    if (k === 'csv') download(baseName() + '_정리된자료.csv', '﻿' + XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(dataAoa(r))), 'text/csv;charset=utf-8');
    if (k === 'codebook') { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, sheet(objAoa(r.codebook, CB_COLS), [16, 44, 8, 40, 8, 10, 12, 14, 30, 36, 30]), '코드북'); XLSX.utils.book_append_sheet(wb, sheet(objAoa(nameMap(r), ['원자료 열 이름', '새 변수명', '역할']), [50, 20, 16]), '변수명_대응'); XLSX.writeFile(wb, baseName() + '_코드북.xlsx'); }
    if (k === 'report') download(baseName() + '_처리내역보고서.html', reportHtml(), 'text/html;charset=utf-8');
    if (k === 'sps') download(baseName() + '_정리문법.sps', '﻿' + E.toSPSS(r, { date: today(), xlsxName: baseName() + '_정리된자료.xlsx' }));
    if (k === 'r') download(baseName() + '_정리코드.R', E.toR(r, S.table, { date: today() }));
    if (k === 'json') download(baseName() + '_정리규칙.json', JSON.stringify(cleanRules(r.rules), null, 2), 'application/json');
    live(b.textContent.trim() + ' 파일을 만들었습니다.');
  });
  function reportHtml() {
    const r = S.res, s = r.summary, t = S.table;
    const tb = (rows, cols) => `<table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((x) => `<tr>${cols.map((c) => `<td>${esc(fmt(x[c]))}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}">없음</td></tr>`}</tbody></table>`;
    const f = r.rules.flags;
    const rulesTxt = [
      f.longstring.on ? `같은 값 ${f.longstring.min}문항 이상 연속(응답 범위가 다른 척도 경계에서는 새로 셈)` : null, f.attention.on ? '주의확인 문항 오답(빈 칸은 오답으로 보지 않음)' : null, f.missingItems.on && f.missingItems.countAsCareless ? `척도 문항 ${Math.round(f.missingItems.minRatio * 1000) / 10}% 이상 결측` : null, f.speed.on ? `응답 시간 ${f.speed.minSeconds}초 미만` : null,
    ].filter(Boolean);
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>처리 내역 보고서: ${esc(r.rules.title || baseName())}</title>
<style>body{font-family:"Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#17202b;max-width:980px;margin:32px auto;padding:0 20px;line-height:1.6;word-break:keep-all}h1{font-size:1.6rem}h2{font-size:1.15rem;margin-top:2rem;border-bottom:1px solid #d6dde6;padding-bottom:4px}table{border-collapse:collapse;font-size:.85rem;margin:8px 0;font-variant-numeric:tabular-nums}th,td{border-bottom:1px solid #d6dde6;padding:4px 8px;text-align:left;vertical-align:top}th{background:#f3f5f8}.meta{color:#4a5666;font-size:.9rem}code{font-size:.8rem;white-space:pre-wrap;word-break:break-all}@media print{body{margin:0}h2{break-after:avoid}}</style></head><body>
<h1>설문 자료 처리 내역 보고서</h1>
<p class="meta">${esc(r.rules.title || '')} · 원자료 ${esc(t.fileName || '붙여 넣은 자료')} (${esc(PLATFORM[t.platform])} 형식, 머리글 ${t.headerRows}줄) · 만든 날 ${today()} · 논문 통계 도구 자료 정리 ${E.VERSION}</p>
<h2>요약</h2>
<ul><li>응답 ${s.n}행. 삭제한 행 없음${s.blankSkipped ? `(원자료의 완전히 빈 줄 ${s.blankSkipped}개는 응답이 아니라 건너뜀)` : ''}. 원자료 파일은 바꾸지 않음.</li>
<li>글자로 적힌 응답을 숫자로 바꾼 칸 ${s.textConverted}, 범주 표기를 코드로 바꾼 칸 ${s.recoded}.</li>
<li>범위 밖이라 결측으로 바꾼 칸 ${s.outOfRange}, 읽을 수 없어 결측으로 둔 칸 ${s.unreadable}, 결측 코드 ${s.missingCode}. 범위를 넘었지만 값을 유지하고 표시만 한 칸 ${s.rangeChecked}.</li>
<li>원래 비어 있던 척도 문항 칸 ${s.blankItemCells}: 채우지 않음.</li>
${s.missingRule !== null ? `<li>척도 문항의 ${Math.round(f.missingItems.minRatio * 1000) / 10}% 이상이 결측인 응답 ${s.missingRule}행(결측과다)${s.missingCountsAsCareless ? ', 불성실 의심에 포함' : ', 불성실 의심과 따로 표시'}.</li>` : ''}
${Object.keys(s.prorated || {}).length ? `<li>척도 평균을 응답한 문항만으로 환산(proration)한 경우: ${Object.entries(s.prorated).map(([k, v]) => `${esc(k)} ${v}건`).join(', ')}.</li>` : ''}
<li>불성실 의심 ${s.careless}행(기준: ${esc(rulesTxt.join(', ') || '사용 안 함')}), 중복 의심 ${s.duplicates}행${s.idDuplicates ? `, 같은 식별값 ${s.idDuplicates}행` : ''}. 표시만 했고 제외는 연구자가 정함.</li>
${s.dropped.length ? `<li>정리본에서 뺀 열(개인정보 등) ${s.dropped.length}개: ${esc(s.dropped.join(', '))}</li>` : ''}</ul>
<h2>척도와 역채점</h2>${tb(r.rules.scales.map((x) => ({ 척도: x.name, 설명: x.label || '', 문항: x.items.join(', '), 역문항: x.reverse.join(', ') || '없음', 범위: `${x.min}~${x.max}`, '평균 계산': `문항의 ${Math.round(x.meanMinRatio * 100)}% 이상 응답` })), ['척도', '설명', '문항', '역문항', '범위', '평균 계산'])}
${r.alpha.length ? `<h2>신뢰도(크론바흐 알파, 완전응답 사례)</h2>${tb(r.alpha.map((a) => ({ 척도: a.척도, '문항 수': a.문항수, '완전응답 사례 수': a.사례수_전체, '알파': a.알파_전체 })), ['척도', '문항 수', '완전응답 사례 수', '알파'])}<p class="meta">제외 결정 전의 값이다. 논문에 보고할 알파는 제외할 응답을 정한 뒤 최종 분석 표본에서 다시 계산한다.</p>` : ''}
<h2>표시된 응답 (${r.flagged.length}행)</h2>${tb(r.flagged, ['응답ID', '원자료_행', '불성실사유', '결측과다', '중복의심', '중복원본ID', '식별값중복', '범위밖값수', '결측문항수'])}
<h2>바꾼 칸 (${r.changes.length}칸)</h2>${tb(r.changes, ['원자료_행', '응답ID', '변수', '종류', '원래값', '처리후', '설명'])}
${r.recode.length ? `<h2>범주 표기를 코드로 바꾼 내역</h2>${tb(r.recode, ['변수', '원래표기', '코드', '건수'])}` : ''}
<h2>변수명 대응</h2>${tb(nameMap(r), ['원자료 열 이름', '새 변수명', '역할'])}
<h2>코드북</h2>${tb(r.codebook, CB_COLS)}
<h2>정리 규칙(JSON)</h2><p class="meta">이 규칙을 도구에 다시 불러오면 같은 정리를 재현합니다.</p><code>${esc(JSON.stringify(cleanRules(r.rules)))}</code>
</body></html>`;
  }
  $('#back3').addEventListener('click', () => go(3));

  // ------------------------------------------------------------ 복사
  function copyText(text, btn) {
    const done = () => { if (!btn) return; const o = btn.innerHTML; btn.classList.add('copied'); btn.textContent = '복사했습니다'; setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = o; }, 1600); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* 무시 */ } ta.remove(); done(); }
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (!b) return; const el = document.getElementById(b.dataset.copy); if (el) copyText(el.value !== undefined && el.tagName === 'TEXTAREA' ? el.value : el.textContent, b); });

  // 화면의 고정 글(숨은 단계 포함)에 쓰는 글꼴 조각을 미리 받아 둔다. 자료를 올린 뒤에는 글꼴 요청도 생기지 않게 하려는 것.
  if (document.fonts && document.fonts.load) { const txt = ($('main') || document.body).textContent; ['400', '600', '700'].forEach((w) => document.fonts.load(`${w} 16px "Pretendard Variable"`, txt).catch(() => {})); }
  window.__clean = S; // 시험용
})();
