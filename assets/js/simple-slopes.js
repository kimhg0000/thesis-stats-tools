(function () {
  'use strict';
  var S = window.Stats;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = $(id).value; return v === '' ? NaN : Number(v); };

  // t 분포 양측 임계값: tP2(t, df) = alpha 인 t (이분법)
  function tCrit(alpha, df) {
    var lo = 0, hi = 1e4;
    for (var i = 0; i < 300; i++) { var mid = (lo + hi) / 2; if (S.tP2(mid, df) > alpha) lo = mid; else hi = mid; if (hi - lo < 1e-13 * Math.max(1, mid)) break; }
    return (lo + hi) / 2;
  }
  var f2 = function (x) { return S.minus(S.fmt(x, 2)); };
  // 영문자로 끝나는 이름(X, Y, Z, GPA 등)은 알파벳 이름의 한글 읽기로 받침을 정한다(0 없음, 1 있음, 2 ㄹ받침)
  var LATIN = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0, i: 0, j: 0, k: 0, l: 2, m: 1, n: 1, o: 0, p: 0, q: 0, r: 2, s: 0, t: 0, u: 0, v: 0, w: 0, x: 0, y: 0, z: 0 };
  function J(word, withB, withoutB, rieul) {
    word = String(word); var ch = word.charAt(word.length - 1).toLowerCase();
    if (!LATIN.hasOwnProperty(ch)) return S.josa(word, withB, withoutB, rieul);
    var k = LATIN[ch]; if (k === 2 && rieul) k = 0;
    return word + (k ? withB : withoutB);
  }

  function jn(b1, b3, v1, v3, c, tc) {
    var A = b3 * b3 - tc * tc * v3, B = 2 * (b1 * b3 - tc * tc * c), C = b1 * b1 - tc * tc * v1;
    var eps = 1e-14 * Math.max(Math.abs(b3 * b3), Math.abs(tc * tc * v3), 1e-300);
    if (Math.abs(A) <= eps) { // 일차식: B z + C > 0
      if (B === 0) return { type: C > 0 ? 'all' : 'none', roots: [] };
      return { type: B > 0 ? 'above' : 'below', roots: [-C / B] };
    }
    var disc = B * B - 4 * A * C;
    if (disc <= 0) return { type: A > 0 ? 'all' : 'none', roots: [] };
    var q = -0.5 * (B + (B >= 0 ? 1 : -1) * Math.sqrt(disc)), r1 = q / A, r2 = C / q, rs = [r1, r2].sort(function (a, b) { return a - b; });
    return { type: A > 0 ? 'outside' : 'between', roots: rs };
  }

  function draw(levels, mx, sx, names) {
    var W = Math.round(Math.min(560, Math.max(320, $('plot').clientWidth || 560))), H = 340, L = 64, R = 20, T = 20, B = 56;
    var ys = []; levels.forEach(function (l) { ys.push(l.yLo, l.yHi); });
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
    if (ymax - ymin < 1e-9) { ymin -= 1; ymax += 1; }
    var span = ymax - ymin, step = Math.pow(10, Math.floor(Math.log10(span / 4))), err = span / 4 / step;
    step *= err >= 5 ? 5 : err >= 2 ? 2 : 1;
    var y0 = Math.floor((ymin - span * 0.08) / step) * step, y1 = Math.ceil((ymax + span * 0.08) / step) * step;
    var px = function (i) { return L + (W - L - R) * (0.12 + 0.76 * i); };
    var py = function (y) { return T + (H - T - B) * (1 - (y - y0) / (y1 - y0)); };
    var dec = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step)));
    var g = '';
    for (var y = y0; y <= y1 + step / 2; y += step) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + py(y).toFixed(1) + '" y2="' + py(y).toFixed(1) + '" style="stroke:var(--line)"/>' +
        '<text x="' + (L - 8) + '" y="' + (py(y) + 5).toFixed(1) + '" text-anchor="end" style="fill:var(--ink-2)" font-size="14">' + S.minus(S.fmt(y, dec)) + '</text>';
    }
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" style="stroke:var(--ink-2)"/>';
    [['낮음', 'M − 1SD'], ['높음', 'M + 1SD']].forEach(function (t, i) {
      var tx = i ? W - R : L, an = i ? 'end' : 'start';
      g += '<line x1="' + px(i).toFixed(1) + '" x2="' + px(i).toFixed(1) + '" y1="' + (H - B) + '" y2="' + (H - B + 6) + '" style="stroke:var(--ink-2)"/>' +
        '<text x="' + tx + '" y="' + (H - B + 24) + '" text-anchor="' + an + '" style="fill:var(--ink)" font-size="14"><tspan x="' + tx + '">' + S.esc(names.x) + ' ' + t[0] + '</tspan><tspan x="' + tx + '" dy="18" style="fill:var(--ink-2)">(' + t[1] + ')</tspan></text>';
    });
    g += '<text transform="translate(16 ' + ((H - B + T) / 2) + ') rotate(-90)" text-anchor="middle" style="fill:var(--ink)" font-size="14">' + S.esc(names.y) + '</text>';
    levels.forEach(function (l) {
      var a = [px(0), py(l.yLo)], b = [px(1), py(l.yHi)];
      g += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" style="stroke:' + l.color + '" stroke-width="3" stroke-dasharray="' + l.dash + '" stroke-linecap="round"/>';
      [a, b].forEach(function (p) { g += l.marker(p[0], p[1]); });
    });
    var label = names.z + ' 수준별 ' + J(names.x, '과', '와') + ' ' + names.y + '의 관계. ' + levels.map(function (l) { return names.z + ' ' + l.short + '에서 ' + J(names.x, '이', '가') + ' 낮을 때 ' + S.fmt(l.yLo, 2) + ', 높을 때 ' + S.fmt(l.yHi, 2); }).join('; ');
    $('plot').innerHTML = '<svg class="ss-plot" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + S.esc(label) + '">' + g + '</svg>';
  }

  function run(e) {
    var byClick = !!(e && e.type === 'click');
    $('err').textContent = ''; S.clearErrors($('form'));
    var need = ['b0', 'b1', 'b2', 'b3', 'mx', 'sx', 'mz', 'sz'];
    var v = {}; need.concat(['se1', 'se3', 'c13', 'df', 'zc', 'zmin', 'zmax']).forEach(function (k) { v[k] = val(k); });
    if (!need.every(function (k) { return isFinite(v[k]); })) {
      if (byClick) { var first = S.markEmpty(need); $('err').textContent = '계수 네 개와 X, Z의 평균·표준편차를 모두 넣으세요.'; if (first) first.focus(); }
      S.show(false); return;
    }
    if (isFinite(v.zmin) && isFinite(v.zmax) && v.zmin >= v.zmax) { $('err').textContent = 'Z 최솟값은 최댓값보다 작아야 합니다.'; S.show(false); return; }
    if (v.sx <= 0 || v.sz <= 0) { $('err').textContent = '표준편차는 0보다 커야 합니다.'; S.show(false); return; }
    var optKeys = ['se1', 'se3', 'c13', 'df'], nOpt = optKeys.filter(function (k) { return isFinite(v[k]); }).length;
    var tests = nOpt === 4, warns = [];
    if (nOpt > 0 && nOpt < 4) warns.push('검정을 하려면 b1, b3의 표준오차, 둘의 공분산, 잔차 자유도를 모두 넣어야 합니다. 지금은 기울기와 그래프만 계산했습니다.');
    if (tests && (v.se1 <= 0 || v.se3 <= 0 || v.df < 1 || Math.floor(v.df) !== v.df)) { $('err').textContent = '표준오차는 0보다 크고, 잔차 자유도는 1 이상의 정수여야 합니다.'; S.show(false); return; }
    var v1 = v.se1 * v.se1, v3 = v.se3 * v.se3, c = v.c13;
    if (tests && c * c > v1 * v3 * (1 + 1e-9)) { $('err').textContent = '공분산이 두 표준오차의 곱보다 큽니다. 공분산 칸에 상관계수를 넣지 않았는지 확인하세요.'; S.show(false); return; }
    var names = { x: $('nx').value.trim() || 'X', z: $('nz').value.trim() || 'Z', y: $('ny').value.trim() || 'Y' };
    var tc = tests ? tCrit(0.05, v.df) : NaN;

    var levels = [
      { key: 'lo', label: '낮을 때(M − 1SD)', short: 'M − 1SD', z: v.mz - v.sz, color: 'var(--ink-2)', dash: '7 6', marker: function (x, y) { return '<rect x="' + (x - 5) + '" y="' + (y - 5) + '" width="10" height="10" style="fill:var(--surface);stroke:var(--ink-2)" stroke-width="2"/>'; } },
      { key: 'mid', label: '평균일 때', short: 'M', z: v.mz, color: 'var(--ink)', dash: '2 5', marker: function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="5" style="fill:var(--ink)"/>'; } },
      { key: 'hi', label: '높을 때(M + 1SD)', short: 'M + 1SD', z: v.mz + v.sz, color: 'var(--blue)', dash: 'none', marker: function (x, y) { return '<path d="M' + x + ' ' + (y - 6) + 'L' + (x + 6) + ' ' + (y + 5) + 'L' + (x - 6) + ' ' + (y + 5) + 'Z" style="fill:var(--blue)"/>'; } }
    ];
    var rows = levels.slice();
    if (isFinite(v.zc)) rows.push({ key: 'custom', label: S.fmt(v.zc, 2) + '일 때', short: '지정한 값', z: v.zc });
    rows.forEach(function (l) {
      l.b = v.b1 + v.b3 * l.z;
      if (tests) {
        var va = v1 + 2 * l.z * c + l.z * l.z * v3;
        l.se = va > 0 ? Math.sqrt(va) : NaN; l.t = l.b / l.se; l.p = S.tP2(l.t, v.df); l.lo = l.b - tc * l.se; l.hi = l.b + tc * l.se;
      }
    });
    levels.forEach(function (l) {
      var xl = v.mx - v.sx, xh = v.mx + v.sx;
      l.yLo = v.b0 + v.b1 * xl + v.b2 * l.z + v.b3 * xl * l.z;
      l.yHi = v.b0 + v.b1 * xh + v.b2 * l.z + v.b3 * xh * l.z;
    });

    S.show(true);
    var dv = function (cls, x, txt) { return '<td class="' + cls + '" data-value="' + x + '">' + txt + '</td>'; };
    $('slopes').tBodies[0].innerHTML = rows.map(function (l) {
      return '<tr data-level="' + l.key + '"><td>' + S.esc(l.short) + '</td>' + dv('z', l.z, f2(l.z)) + dv('b', l.b, S.minus(S.fmt(l.b, 3))) +
        (tests ? dv('se', l.se, S.fmt(l.se, 3)) + dv('t', l.t, f2(l.t)) + dv('p', l.p, S.fmtP(l.p).replace('= ', '')) +
          '<td class="ci" data-lo="' + l.lo + '" data-hi="' + l.hi + '">[' + S.minus(S.fmt(l.lo, 3)) + ', ' + S.minus(S.fmt(l.hi, 3)) + ']</td>'
          : '<td>–</td><td>–</td><td>–</td><td>–</td>') + '</tr>';
    }).join('');
    $('coords').tBodies[0].innerHTML = levels.map(function (l) {
      return '<tr data-level="' + l.key + '"><td>' + S.esc(names.z) + ' ' + S.esc(l.short) + ' (' + f2(l.z) + ')</td>' + dv('ylo', l.yLo, S.minus(S.fmt(l.yLo, 3))) + dv('yhi', l.yHi, S.minus(S.fmt(l.yHi, 3))) + '</tr>';
    }).join('');
    $('legend').innerHTML = levels.map(function (l) {
      return '<li><svg viewBox="0 0 44 14" aria-hidden="true" focusable="false"><line x1="2" y1="7" x2="42" y2="7" style="stroke:' + l.color + '" stroke-width="3" stroke-dasharray="' + l.dash + '" stroke-linecap="round"/>' + l.marker(22, 7) + '</svg>' + S.esc(names.z) + ' ' + S.esc(l.short) + '</li>';
    }).join('');
    draw(levels, v.mx, v.sx, names);

    var zj = J(names.z, '이', '가'), xs = S.esc(names.x), zs = S.esc(zj), ys = S.esc(names.y);
    var s;
    if (tests) {
      s = '조절효과의 양상을 확인하기 위해 ' + S.esc(names.z) + '의 평균과 평균 ± 1표준편차에서 ' + xs + '의 단순기울기를 검정하였다(Aiken &amp; West, 1991). ';
      s += levels.map(function (l) {
        return zs + ' ' + l.label + ' ' + xs + S.esc(J(names.x, '이', '가').slice(names.x.length)) + ' ' + ys + '에 미치는 효과는 ' + (l.p < 0.05 ? '유의하였다' : '유의하지 않았다') +
          '(<i>B</i> = ' + f2(l.b) + ', <i>SE</i> = ' + S.fmt(l.se, 2) + ', <i>t</i>(' + v.df + ') = ' + f2(l.t) + ', <i>p</i> ' + S.fmtP(l.p) + ').';
      }).join(' ');
      var j = jn(v.b1, v.b3, v1, v3, c, tc), rt = j.roots.map(f2);
      $('jn').setAttribute('data-type', j.type); $('jn').setAttribute('data-bounds', j.roots.join(','));
      var jt = { all: '모든 ' + S.esc(names.z) + ' 값에서 ' + xs + '의 효과가 유의하였다', none: '어떤 ' + S.esc(names.z) + ' 값에서도 ' + xs + '의 효과가 유의하지 않았다',
        outside: zs + ' ' + rt[0] + '보다 작거나 ' + rt[1] + '보다 클 때 ' + xs + '의 효과가 유의하였다', between: zs + ' ' + S.josa(rt[0], '과', '와') + ' ' + rt[1] + ' 사이일 때 ' + xs + '의 효과가 유의하였다',
        above: zs + ' ' + rt[0] + '보다 클 때 ' + xs + '의 효과가 유의하였다', below: zs + ' ' + rt[0] + '보다 작을 때 ' + xs + '의 효과가 유의하였다' }[j.type];
      var js = ' Johnson-Neyman 방법으로 유의성 영역을 구한 결과(Bauer &amp; Curran, 2005), ';
      if (isFinite(v.zmin) && isFinite(v.zmax)) {
        // 유의한 구간을 관측 범위 [zmin, zmax]로 잘라서만 문장에 쓴다
        var r = j.roots, INF = Infinity, iv = { all: [[-INF, INF]], none: [], outside: [[-INF, r[0]], [r[1], INF]], between: [[r[0], r[1]]], above: [[r[0], INF]], below: [[-INF, r[0]]] }[j.type];
        var cut = iv.map(function (x) { return [Math.max(x[0], v.zmin), Math.min(x[1], v.zmax)]; }).filter(function (x) { return x[1] > x[0]; });
        var rng = S.esc(names.z) + '의 관측 범위(' + f2(v.zmin) + '~' + f2(v.zmax) + ')';
        var outB = r.filter(function (b) { return b < v.zmin || b > v.zmax; }).map(f2);
        var tail = '(α = .05' + (outB.length ? '; 관측 범위 밖의 경계값 ' + S.josa(outB.join(', '), '은', '는') + ' 해석에서 제외' : '') + ').';
        if (!cut.length) js += rng + ' 안에서는 ' + xs + '의 효과가 유의한 구간이 없었다' + tail;
        else if (cut.length === 1 && cut[0][0] === v.zmin && cut[0][1] === v.zmax) js += rng + ' 전체에서 ' + xs + '의 효과가 유의하였다' + tail;
        else js += rng + ' 안에서는 ' + zs + ' ' + cut.map(function (x) {
          return x[0] === v.zmin ? f2(x[1]) + '보다 작을 때' : x[1] === v.zmax ? f2(x[0]) + '보다 클 때' : S.josa(f2(x[0]), '과', '와') + ' ' + f2(x[1]) + ' 사이일 때';
        }).join('와 ') + ' ' + xs + '의 효과가 유의하였다' + tail;
        $('jn').setAttribute('data-sig', JSON.stringify(cut));
      } else {
        js += jt + '(α = .05).';
        $('jn').setAttribute('data-sig', '');
        if (j.roots.length) warns.push('Z의 최솟값과 최댓값을 넣으세요. 경계값이 실제 자료 범위(예: 5점 척도면 1~5) 밖에 있으면 그 구간에 대한 해석은 자료로 뒷받침되지 않으며, 문장도 관측 범위 안으로 제한해 다시 만들어집니다.');
      }
      $('jn').innerHTML = 'Johnson-Neyman 경계값: ' + (j.roots.length ? rt.join(', ') : '없음') + '. ' + (j.roots.length ? '경계값으로 나뉜 구간 가운데 실제 자료 범위 밖의 구간은 해석하지 않습니다.' : jt + '.');
      s += js;
      var p3 = S.tP2(v.b3 / v.se3, v.df);
      if (p3 >= 0.05) warns.push('상호작용항(b3)이 유의하지 않습니다(p ' + S.fmtP(p3) + '). 이때는 단순기울기 결과로 조절효과를 주장하지 않습니다.');
    } else {
      $('jn').innerHTML = '공분산과 자유도를 넣으면 단순기울기의 유의성과 Johnson-Neyman 경계값을 계산합니다.';
      $('jn').setAttribute('data-type', ''); $('jn').setAttribute('data-bounds', '');
      s = S.esc(names.z) + '의 수준별 ' + xs + '의 단순기울기는 ' + levels.map(function (l, i) { return l.short + '에서 ' + (i === 2 ? S.josa(f2(l.b), '이었다', '였다') : f2(l.b)); }).join(', ') + '(Aiken &amp; West, 1991).';
    }
    $('sentence').innerHTML = s;
    $('warns').innerHTML = warns.map(function (w) { return '<p style="margin:0 0 6px">' + S.esc(w) + '</p>'; }).join('');
    S.live('단순기울기와 그래프를 계산했습니다.');
    if (byClick) S.reveal();
  }

  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (!$('result').hidden) run(); }, 250); });
  $('run').addEventListener('click', run);
  S.auto('form', function () { run(); }, 450);
  window.addEventListener('pageshow', function () { if ($('b1').value !== '') run(); });
  $('reset').addEventListener('click', function () { S.resetForm('form'); $('err').textContent = ''; S.show(false); });
  $('example').addEventListener('click', function () {
    var ex = { nx: '학업스트레스', nz: '사회적지지', ny: '우울', b0: 1.12, b1: 0.98, b2: -0.21, b3: -0.17, mx: 3.02, sx: 0.71, mz: 3.45, sz: 0.64, se1: 0.2, se3: 0.055, c13: -0.0105, df: 246, zmin: 1.4, zmax: 5 };
    Object.keys(ex).forEach(function (k) { $(k).value = ex[k]; }); $('zc').value = '';
    run({ type: 'click' });
  });
  S.bindCopy();
})();
