/* 통계 분포 함수와 공통 도우미. 모든 계산은 브라우저 안에서만 이루어집니다. */
(function (global) {
  'use strict';
  var S = {};

  // 로그 감마 (Lanczos 근사, g = 7)
  var LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  S.lgamma = function (x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - S.lgamma(1 - x);
    x -= 1;
    var a = LG[0], t = x + 7.5;
    for (var i = 1; i < 9; i++) a += LG[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  };

  // 정규화 불완전 베타 함수의 연분수 (Numerical Recipes betacf)
  function betacf(a, b, x) {
    var FPMIN = 1e-300, EPS = 1e-16;
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= 20000; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  // [I_x(a,b), 1 - I_x(a,b)] 를 상쇄 오차 없이 함께 돌려준다
  S.ibetaPair = function (x, a, b) {
    if (x <= 0) return [0, 1];
    if (x >= 1) return [1, 0];
    var lbt = S.lgamma(a + b) - S.lgamma(a) - S.lgamma(b) + a * Math.log(x) + b * Math.log(1 - x);
    if (x < (a + 1) / (a + b + 2)) {
      var lo = Math.exp(lbt) * betacf(a, b, x) / a;
      return [lo, 1 - lo];
    }
    var up = Math.exp(lbt) * betacf(b, a, 1 - x) / b;
    return [1 - up, up];
  };
  S.ibeta = function (x, a, b) { return S.ibetaPair(x, a, b)[0]; };

  // 정규화 불완전 감마 함수 P(a,x), Q(a,x)
  S.gammaPQ = function (a, x) {
    if (x <= 0) return [0, 1];
    var gln = S.lgamma(a), sum, del, ap, n;
    if (x < a + 1) {
      ap = a; sum = 1 / a; del = sum;
      for (n = 0; n < 100000; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; }
      var p = sum * Math.exp(-x + a * Math.log(x) - gln);
      return [p, 1 - p];
    }
    var FPMIN = 1e-300, b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (n = 1; n < 100000; n++) {
      var an = -n * (n - a); b += 2;
      d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    var q = Math.exp(-x + a * Math.log(x) - gln) * h;
    return [1 - q, q];
  };

  // 정규분포
  S.normSf = function (z) { // P(Z > z)
    if (z >= 0) return 0.5 * S.gammaPQ(0.5, z * z / 2)[1];
    return 1 - 0.5 * S.gammaPQ(0.5, z * z / 2)[1];
  };
  S.normCdf = function (z) { return S.normSf(-z); };
  S.normPdf = function (z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); };
  // 정규분포 분위수 (Acklam 근사 + Halley 보정 1회)
  S.normInv = function (p) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var q, r, x, pl = 0.02425;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p <= 1 - pl) { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    else { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    var e = S.normCdf(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    return x - u / (1 + x * u / 2);
  };

  // t 분포: 양측 p
  S.tP2 = function (t, df) {
    t = Math.abs(t);
    return S.ibetaPair(df / (df + t * t), df / 2, 0.5)[0];
  };
  // F 분포: 오른쪽 꼬리 p
  S.fSf = function (f, df1, df2) {
    if (f <= 0) return 1;
    return S.ibetaPair(df2 / (df2 + df1 * f), df2 / 2, df1 / 2)[0];
  };
  // F 분포 분위수: P(F > f) = alpha 인 f
  S.fInvSf = function (alpha, df1, df2) {
    // x = df1 f / (df1 f + df2) 에 대해 1 - I_x(df1/2, df2/2) = alpha 를 이분법으로 푼다
    var lo = 0, hi = 1;
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2;
      var up = S.ibetaPair(mid, df1 / 2, df2 / 2)[1];
      if (up > alpha) lo = mid; else hi = mid;
      if (hi - lo < 1e-16) break;
    }
    var x = (lo + hi) / 2;
    return df2 * x / (df1 * (1 - x));
  };
  // 카이제곱 오른쪽 꼬리 p
  S.chi2Sf = function (x, df) { return S.gammaPQ(df / 2, x / 2)[1]; };

  // 비중심 F 분포의 오른쪽 꼬리 확률 (Poisson 가중합)
  S.ncfSf = function (f, df1, df2, lambda) {
    var x = df1 * f / (df1 * f + df2);
    var mu = lambda / 2;
    if (mu === 0) return S.ibetaPair(x, df1 / 2, df2 / 2)[1];
    var jmax = Math.ceil(mu + 15 * Math.sqrt(mu) + 40);
    var sum = 0;
    for (var j = 0; j <= jmax; j++) {
      var lw = -mu + j * Math.log(mu) - S.lgamma(j + 1);
      var w = Math.exp(lw);
      if (w === 0 && j > mu) break;
      sum += w * S.ibetaPair(x, df1 / 2 + j, df2 / 2)[1];
    }
    return Math.min(1, sum);
  };

  // 기술통계
  S.mean = function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; };
  S.variance = function (a) {
    var m = S.mean(a), s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
    return s / (a.length - 1);
  };
  S.sd = function (a) { return Math.sqrt(S.variance(a)); };
  S.pearson = function (x, y) {
    var mx = S.mean(x), my = S.mean(y), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < x.length; i++) {
      var dx = x[i] - mx, dy = y[i] - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }
    return sxy / Math.sqrt(sxx * syy);
  };
  S.corrP = function (r, n) {
    var df = n - 2;
    if (Math.abs(r) >= 1) return 0;
    var t = r * Math.sqrt(df / (1 - r * r));
    return S.tP2(t, df);
  };

  // 숫자 표기
  S.fmt = function (x, d) {
    if (!isFinite(x)) return '–';
    var s = x.toFixed(d);
    if (/^-0\.?0*$/.test(s)) s = s.slice(1);
    return s;
  };
  // 1을 넘을 수 없는 값(p, r, α 등): 앞자리 0 생략
  S.fmt0 = function (x, d) {
    return S.fmt(x, d).replace(/^(-?)0\./, '$1.');
  };
  // p 값 표기: "= .017", "< .001". 셋째 자리 반올림이 .05/.01 경계에 닿으면(예: .0496 → .050)
  // 경계보다 작게 보일 때까지 자릿수를 늘린다. 이 처리는 이 사이트의 표기 방식이다.
  S.fmtP = function (p) {
    if (!isFinite(p)) return '= –';
    if (p < 0.001) return '< .001';
    var cuts = [0.05, 0.01];
    for (var d = 3; d <= 6; d++) {
      var r = parseFloat(p.toFixed(d)), crossed = false;
      for (var i = 0; i < cuts.length; i++) if (p < cuts[i] && r >= cuts[i]) crossed = true;
      if (!crossed) { if (r >= 1) return '> .999'; return '= ' + S.fmt0(p, d); }
    }
    return p < 0.01 ? '< .01' : '< .05';
  };
  // 표에 쓰는 음수 기호: 붙임표 대신 빼기 기호(−)
  S.minus = function (s) { return String(s).replace(/^-/, '−'); };

  // 받침에 따라 조사 고르기. 한글이 아니면 숫자 읽기로, 그것도 아니면 "와(과)" 꼴로 쓴다.
  // rieul: '으로/로'처럼 ㄹ 받침 뒤에 받침 없는 형태를 쓰는 조사
  var DIGIT_B = { '0': 1, '1': 2, '2': 0, '3': 1, '4': 0, '5': 0, '6': 1, '7': 2, '8': 2, '9': 0 }; // 0 받침 없음, 1 받침, 2 ㄹ받침
  S.josa = function (word, withB, withoutB, rieul) {
    word = String(word);
    var ch = word.charAt(word.length - 1), c = ch.charCodeAt(0), kind = -1;
    if (c >= 0xAC00 && c <= 0xD7A3) { var jong = (c - 0xAC00) % 28; kind = jong === 0 ? 0 : (jong === 8 ? 2 : 1); }
    else if (DIGIT_B.hasOwnProperty(ch)) kind = DIGIT_B[ch];
    if (kind < 0) return word + withoutB + '(' + withB + ')';
    if (kind === 2 && rieul) kind = 0;
    return word + (kind ? withB : withoutB);
  };

  // 결과 문장 복사용 HTML/일반 텍스트
  S.plain = function (el) { return el.innerText.replace(/\s+\n/g, '\n').trim(); };

  // 붙여 넣은 표 해석: 탭(엑셀), 쉼표, 공백 구분. 첫 줄에 숫자가 아닌 칸이 있으면 머리글로 본다.
  S.parseTable = function (text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) return { header: [], rows: [] };
    var sep;
    if (lines[0].indexOf('\t') >= 0) sep = '\t';
    else if (lines[0].indexOf(',') >= 0 && !/^\s*-?\d+,\d+\s*$/.test(lines[0])) sep = ',';
    else sep = /\s+/;
    var cells = lines.map(function (l) {
      var parts = sep === '\t' || sep === ',' ? l.split(sep) : l.trim().split(sep);
      return parts.map(function (c) { return c.trim(); });
    });
    var isNum = function (c) { return c !== '' && !isNaN(Number(c)); };
    var header = null;
    if (cells[0].some(function (c) { return c !== '' && !isNum(c); })) header = cells.shift();
    var width = 0;
    cells.forEach(function (r) { width = Math.max(width, r.length); });
    if (header) width = Math.max(width, header.length);
    var hadHeader = !!header;
    if (!header) { header = []; for (var i = 0; i < width; i++) header.push('문항' + (i + 1)); }
    while (header.length < width) header.push('열' + (header.length + 1));
    var bad = [];
    var rows = cells.map(function (r, ri) {
      var out = [];
      for (var j = 0; j < width; j++) {
        var c = r[j] === undefined ? '' : r[j];
        if (c === '' || c === '.' || c.toUpperCase() === 'NA') out.push(NaN);
        else if (isNum(c)) out.push(Number(c));
        else { out.push(NaN); bad.push((ri + 1) + '행 ' + header[j] + ' "' + c + '"'); }
      }
      return out;
    });
    var raw = cells.map(function (r) { var o = []; for (var j = 0; j < width; j++) o.push(r[j] === undefined ? '' : r[j]); return o; });
    return { header: header, rows: rows, bad: bad, raw: raw, noHeader: !hadHeader };
  };

  S.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };

  // 복사 버튼: data-copy-target 의 텍스트(또는 표의 HTML)를 클립보드로
  S.copyText = function (text, html, btn) {
    var done = function () {
      if (!btn) return;
      var orig = btn.getAttribute('data-orig') || btn.innerHTML;
      btn.setAttribute('data-orig', orig);
      btn.classList.add('copied');
      btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>복사됨';
      S.live('클립보드에 복사했습니다.');
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.classList.remove('copied'); btn.innerHTML = orig; }, 1800);
    };
    try {
      if (html && global.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]).then(done, function () { fallback(); });
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, function () { fallback(); }); return; }
    } catch (e) { /* 아래 방식으로 */ }
    fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* 무시 */ }
      document.body.removeChild(ta);
    }
  };

  // 화면 도우미: 빈 상태와 결과 전환, 화면 낭독기 알림, 입력 즉시 계산, 칸 옆 오류
  S.live = function (msg) {
    var el = document.getElementById('live');
    if (!el) return;
    el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 30);
  };
  S.show = function (on, emptyId, resultId) {
    var e = document.getElementById(emptyId || 'empty'), r = document.getElementById(resultId || 'result');
    if (e) e.hidden = !!on; if (r) r.hidden = !on;
  };
  S.fieldError = function (id, msg) {
    var input = document.getElementById(id);
    if (!input) return;
    var box = document.getElementById(id + '-msg');
    if (!box) {
      box = document.createElement('p'); box.className = 'field-error'; box.id = id + '-msg'; box.setAttribute('role', 'alert');
      var host = input.closest('.field') || input.parentNode;
      host.appendChild(box);
      var d = input.getAttribute('aria-describedby') || '';
      if (d.indexOf(box.id) < 0) input.setAttribute('aria-describedby', (d + ' ' + box.id).trim());
    }
    box.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  };
  S.clearErrors = function (root) {
    (root || document).querySelectorAll('[aria-invalid="true"]').forEach(function (el) { S.fieldError(el.id, ''); });
  };
  S.auto = function (root, fn, delay) {
    var t;
    var h = function () { clearTimeout(t); t = setTimeout(fn, delay || 350); };
    (typeof root === 'string' ? document.getElementById(root) : root).querySelectorAll('input, select, textarea').forEach(function (el) {
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio' ? 'change' : 'input', h);
    });
  };
  S.resetForm = function (root, after) {
    var r = typeof root === 'string' ? document.getElementById(root) : root;
    r.querySelectorAll('input, textarea, select').forEach(function (el) {
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = el.defaultChecked;
      else if (el.tagName === 'SELECT') el.selectedIndex = Array.prototype.findIndex.call(el.options, function (o) { return o.defaultSelected; }) < 0 ? 0 : Array.prototype.findIndex.call(el.options, function (o) { return o.defaultSelected; });
      else el.value = el.defaultValue;
    });
    S.clearErrors(r);
    if (after) after();
  };

  S.bindCopy = function (root) {
    (root || document).querySelectorAll('[data-copy]').forEach(function (btn) {
      if (btn._bound) return; btn._bound = true;
      btn.addEventListener('click', function () {
        var el = document.getElementById(btn.getAttribute('data-copy'));
        if (!el) return;
        if (el.tagName === 'TEXTAREA') return S.copyText(el.value, null, btn);
        var isTable = el.tagName === 'TABLE';
        var extra = btn.getAttribute('data-copy-with');
        var html = isTable ? S.tableHtml(el) : '<p>' + el.innerHTML + '</p>';
        var text = isTable ? S.tableToTsv(el) : el.innerText;
        if (extra) extra.split(',').forEach(function (id, i) {
          var x = document.getElementById(id); if (!x) return;
          if (i === 0) { html = '<p>' + x.innerHTML + '</p>' + html; text = x.innerText + '\n' + text; }
          else { html += '<p>' + x.innerHTML + '</p>'; text += '\n' + x.innerText; }
        });
        S.copyText(text, html, btn);
      });
    });
  };
  // 한글·워드에 붙였을 때도 APA 가로선이 남도록 인라인 테두리를 넣은 표 HTML
  S.tableHtml = function (table) {
    var t = table.cloneNode(true);
    t.setAttribute('style', 'border-collapse:collapse;border-top:1.5pt solid #000;border-bottom:1.5pt solid #000');
    Array.prototype.forEach.call(t.querySelectorAll('th,td'), function (c) { c.setAttribute('style', 'padding:2pt 6pt;text-align:' + (c.cellIndex === 0 ? 'left' : 'center')); });
    Array.prototype.forEach.call(t.querySelectorAll('thead th'), function (c) { c.style.borderBottom = '0.75pt solid #000'; });
    return t.outerHTML;
  };
  S.tableToTsv = function (table) {
    return Array.prototype.map.call(table.rows, function (tr) {
      return Array.prototype.map.call(tr.cells, function (td) { return td.innerText.trim(); }).join('\t');
    }).join('\n');
  };

  global.Stats = S;
})(window);
