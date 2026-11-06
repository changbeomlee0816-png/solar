/* 아이소메트릭 일러스트 — 태양광 장비 · 공장 · 시공 장면을 벡터로 그린다.
   좌표: x(오른쪽 아래) · y(왼쪽 아래) · z(위). 면 변환(faceX/faceY/faceTop)으로 면 위에 2D 디테일을 그린다.
   window.ILL.<이름>() 은 <svg> 문자열을 돌려준다. */
(() => {
  "use strict";
  let UID = 0;
  const C30 = 0.8660254;
  const f1 = (n) => (Math.round(n * 10) / 10).toString();

  function shade(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = a < 0 ? 0 : 255, p = Math.abs(a);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function Iso(ox, oy, k) {
    const p = (x, y, z) => [ox + (x - y) * C30 * k, oy + ((x + y) * 0.5 - z) * k];
    const pts = (arr) => arr.map((q) => p(q[0], q[1], q[2]).map(f1).join(",")).join(" ");
    const poly = (arr, fill, extra = "") => `<polygon points="${pts(arr)}" fill="${fill}" ${extra}/>`;
    const line = (a, b, stroke, w = 1, extra = "") => { const [x1, y1] = p(...a), [x2, y2] = p(...b); return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`; };
    const path = (arr, stroke, w = 1, extra = "") => `<polyline points="${pts(arr)}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
    // 상자: 윗면 · 앞(+y) · 오른쪽(+x)
    const box = (x, y, z, w, d, h, c, o = {}) => {
      const top = o.top || shade(c, 0.22), front = o.front || c, right = o.right || shade(c, -0.16);
      const st = o.stroke === false ? "" : `stroke="${o.stroke || shade(c, -0.32)}" stroke-width="${o.sw || 0.5}" stroke-linejoin="round"`;
      return poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], front, st)
        + poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], right, st)
        + poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top, st);
    };
    // 면 위 2D 그리기용 변환 (u 오른쪽, v 아래)
    const faceY = (x0, yc, ztop) => { const [X, Y] = p(x0, yc, ztop); return `matrix(${f1(C30 * k * 1000) / 1000} ${0.5 * k} 0 ${k} ${f1(X)} ${f1(Y)})`; };
    const faceX = (xc, yleft, ztop) => { const [X, Y] = p(xc, yleft, ztop); return `matrix(${f1(C30 * k * 1000) / 1000} ${-0.5 * k} 0 ${k} ${f1(X)} ${f1(Y)})`; };
    const faceTop = (x0, y0, zc) => { const [X, Y] = p(x0, y0, zc); return `matrix(${f1(C30 * k * 1000) / 1000} ${0.5 * k} ${-f1(C30 * k * 1000) / 1000} ${0.5 * k} ${f1(X)} ${f1(Y)})`; };
    // 바닥 그림자
    const shadow = (x, y, w, d, id) => `<polygon points="${pts([[x - 3, y - 1, 0], [x + w + 8, y - 1, 0], [x + w + 8, y + d + 6, 0], [x - 3, y + d + 6, 0]])}" fill="rgba(15,23,42,.16)" filter="url(#${id}-blur)"/>`;
    return { p, pts, poly, line, path, box, faceY, faceX, faceTop, shadow, k };
  }

  const defs = (id) => `<defs>
    <filter id="${id}-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter>
    <filter id="${id}-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="${id}-pv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c4f9e"/><stop offset=".55" stop-color="#14295a"/><stop offset="1" stop-color="#0b1838"/></linearGradient>
    <linearGradient id="${id}-glare" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".32"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe0f7"/><stop offset="1" stop-color="#7f9fcd"/></linearGradient>
    <linearGradient id="${id}-steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f9aa8"/><stop offset=".5" stop-color="#e3e8ee"/><stop offset="1" stop-color="#8f9aa8"/></linearGradient>
    <linearGradient id="${id}-pole" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa2ad"/><stop offset=".45" stop-color="#e2e6eb"/><stop offset="1" stop-color="#8a929d"/></linearGradient>
    <radialGradient id="${id}-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d6"/><stop offset=".35" stop-color="#ffd25a"/><stop offset=".7" stop-color="#ffa21f" stop-opacity=".55"/><stop offset="1" stop-color="#ffa21f" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8f1ff"/><stop offset="1" stop-color="#f7faff"/></linearGradient>
  </defs>`;
  const wrap = (id, vb, body, label, bg = true) => `<svg class="ill" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${defs(id)}${bg ? `<rect width="100%" height="100%" fill="url(#${id}-sky)"/>` : ""}${body}</svg>`;
  const sun = (id, cx, cy, r = 26) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}-sun)"/><circle cx="${cx}" cy="${cy}" r="${r * 0.36}" fill="#fff3c4"/>`;

  /* ---------- 부품 ---------- */
  // 태양광 패널 하나 (평면 위 네 점) + 셀 무늬 + 반사광
  function panelQuad(I, A, B, C, D, id, cols = 6, rows = 3, raise = 0) {
    const L = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t, P[2] + (Q[2] - P[2]) * t + 0];
    const up = (P) => [P[0], P[1], P[2] + raise];
    const a = up(A), b = up(B), c = up(C), d = up(D);
    let s = I.poly([a, b, c, d], "#c9d2de") ; // 알루미늄 프레임
    const ia = L(L(a, b, 0.03), L(d, c, 0.03), 0.06), ib = L(L(a, b, 0.97), L(d, c, 0.97), 0.06), ic = L(L(a, b, 0.97), L(d, c, 0.97), 0.94), idd = L(L(a, b, 0.03), L(d, c, 0.03), 0.94);
    s += I.poly([ia, ib, ic, idd], `url(#${id}-pv)`);
    for (let i = 1; i < cols; i++) s += I.line(L(ia, ib, i / cols), L(idd, ic, i / cols), "rgba(160,190,240,.35)", 0.5);
    for (let j = 1; j < rows; j++) s += I.line(L(ia, idd, j / rows), L(ib, ic, j / rows), "rgba(160,190,240,.35)", 0.5);
    s += I.poly([L(ia, ib, 0.15), L(ia, ib, 0.42), L(idd, ic, 0.3), L(idd, ic, 0.03)], `url(#${id}-glare)`);
    return s;
  }
  // 사람 (안전모 · 조끼)
  function worker(I, x, y, z, vest = "#ff8a00", hat = "#ffffff", extra = "") {
    const [X, Y] = I.p(x, y, z); const k = I.k;
    return `<g transform="translate(${f1(X)} ${f1(Y)}) scale(${k})">
      <ellipse cx="0" cy="1" rx="6" ry="2.6" fill="rgba(15,23,42,.18)"/>
      <rect x="-3.4" y="-11" width="2.9" height="11" rx="1.4" fill="#2b3446"/><rect x=".5" y="-11" width="2.9" height="11" rx="1.4" fill="#222a3a"/>
      <path d="M-5 -22 q5 -3 10 0 v11 h-10z" fill="${vest}"/><path d="M-5 -17 h10 M-5 -14 h10" stroke="#e8f0ff" stroke-width="1"/>
      <circle cx="0" cy="-26" r="3.6" fill="#f2c9a5"/><path d="M-4.6 -26.5 a4.6 4.6 0 0 1 9.2 0z" fill="${hat}" stroke="#c9d2de" stroke-width=".5"/>
      ${extra}</g>`;
  }

  /* ---------- 공장 장면 (시공 단계별) ---------- */
  // step: -1 기존 공장(노후 지붕) · 0 지붕 보강 · 1 안전시설 · 2 구조물 · 3 모듈 · 4 전기 · 5 시험 · 6 검사 · 연계 · 'done' 완성(흐름)
  function factory(opts = {}) {
    const id = "f" + (++UID);
    const st = opts.step == null ? 99 : opts.step;
    const W = 120, D = 70, H = 32, R = 13;
    const I = Iso(104, 66, opts.k || 1.1);
    const wall = "#e6ebf2", roofNew = "#3a6ad1", roofOld = "#a65f3a";
    const roof = st >= 0 ? roofNew : roofOld;
    const glow = (n, s) => (st === n && opts.highlight !== false ? `<g filter="url(#${id}-glow)" class="ill-new">${s}</g>` : s);
    let s = "";
    s += sun(id, 34, 30, 30);
    // 땅
    s += I.poly([[-30, -20, 0], [W + 50, -20, 0], [W + 50, D + 40, 0], [-30, D + 40, 0]], "#eef2f7");
    s += I.shadow(0, 0, W, D, id);
    // 벽
    s += I.box(0, 0, 0, W, D, H, wall, { top: wall, stroke: "#c3ccd8" });
    // 앞벽 디테일: 띠 · 창 · 출입문
    s += `<g transform="${I.faceY(0, D, H)}">
      <rect x="0" y="5" width="${W}" height="3" fill="#24407a"/>
      ${Array.from({ length: 7 }, (_, i) => `<rect x="${8 + i * 15}" y="12" width="10" height="7" rx="1" fill="url(#${id}-glass)" stroke="#9fb0c7" stroke-width=".5"/><line x1="${13 + i * 15}" y1="12" x2="${13 + i * 15}" y2="19" stroke="#9fb0c7" stroke-width=".4"/>`).join("")}
      <rect x="84" y="${H - 15}" width="14" height="15" fill="#b9c3d1"/>${Array.from({ length: 7 }, (_, i) => `<line x1="84" y1="${H - 15 + i * 2.1}" x2="98" y2="${H - 15 + i * 2.1}" stroke="#9aa6b6" stroke-width=".5"/>`).join("")}
      <rect x="6" y="${H - 11}" width="7" height="11" fill="#5a6b86"/>
    </g>`;
    // 박공(오른쪽 면) 삼각형 + 셔터
    s += I.poly([[W, 0, H], [W, D, H], [W, D / 2, H + R]], shade(wall, -0.12), `stroke="#c3ccd8" stroke-width=".5"`);
    s += `<g transform="${I.faceX(W, D, H)}"><rect x="20" y="${H - 22}" width="26" height="22" fill="#c4ccd8"/>${Array.from({ length: 10 }, (_, i) => `<line x1="20" y1="${H - 22 + i * 2.2}" x2="46" y2="${H - 22 + i * 2.2}" stroke="#a4afbf" stroke-width=".5"/>`).join("")}<rect x="4" y="5" width="${D - 8}" height="2.4" fill="#24407a"/></g>`;
    // 지붕: 뒷면 · 앞면 (골 무늬)
    const back = [[0, 0, H], [W, 0, H], [W, D / 2, H + R], [0, D / 2, H + R]];
    const front = [[0, D / 2, H + R], [W, D / 2, H + R], [W, D + 2, H - 1], [0, D + 2, H - 1]];
    s += I.poly(back, shade(roof, -0.25), `stroke="${shade(roof, -0.4)}" stroke-width=".5"`);
    let roofFront = I.poly(front, roof, `stroke="${shade(roof, -0.35)}" stroke-width=".5"`);
    for (let x = 3; x < W; x += 3.2) roofFront += I.line([x, D / 2, H + R], [x, D + 2, H - 1], shade(roof, x % 6.4 < 3.2 ? -0.12 : 0.1), 0.6);
    if (st < 0) for (let i = 0; i < 9; i++) { const x = 8 + i * 13; roofFront += I.line([x, D / 2 + 6, H + R - 2.2], [x + 4, D - 4, H + 1.4], "rgba(80,30,10,.35)", 1.4); }
    s += st === 0 ? glow(0, roofFront) : roofFront;
    s += I.line([0, D / 2, H + R], [W, D / 2, H + R], "#d9e1ec", 1.6); // 용마루
    // 1 안전시설: 노란 안전난간 + 사다리
    if (st >= 1) {
      let g = "";
      for (let x = 2; x <= W; x += 10) g += I.line([x, D + 2, H - 1], [x, D + 2, H + 6], "#f5b400", 1.1);
      g += I.line([0, D + 2, H + 6], [W, D + 2, H + 6], "#f5b400", 1.2) + I.line([0, D + 2, H + 3], [W, D + 2, H + 3], "#f5b400", 0.8);
      for (let y = 2; y <= D; y += 10) g += I.line([W, y, H + (y < D / 2 ? (y / (D / 2)) * R : (1 - (y - D / 2) / (D / 2)) * R)], [W, y, H + 6 + (y < D / 2 ? (y / (D / 2)) * R : (1 - (y - D / 2) / (D / 2)) * R)], "#f5b400", 0.9);
      // 사다리 (오른쪽 벽 앞쪽)
      const ly = D - 7;
      g += I.line([W + 1, ly, 0], [W + 1, ly, H + 7], "#9aa5b5", 1.1) + I.line([W + 1, ly - 4, 0], [W + 1, ly - 4, H + 7], "#9aa5b5", 1.1);
      for (let z = 3; z < H + 6; z += 3) g += I.line([W + 1, ly, z], [W + 1, ly - 4, z], "#9aa5b5", 0.7);
      for (let z = 12; z < H + 6; z += 5) g += I.path([[W + 1, ly, z], [W + 5, ly - 0.5, z], [W + 5, ly - 3.5, z], [W + 1, ly - 4, z]], "#b9c3d1", 0.6);
      s += glow(1, g);
    }
    // 2 구조물: 레일 (지붕 앞면)
    const S = (u, v, raise = 0) => [u * W, D / 2 + v * (D / 2 + 2), H + R - v * (R + 1) + raise];
    if (st >= 2) {
      let g = "";
      for (const v of [0.18, 0.46, 0.58, 0.86]) { g += I.line(S(0.05, v, 1.2), S(0.95, v, 1.2), "#dfe5ec", 1.3) + I.line(S(0.05, v, 0.6), S(0.95, v, 0.6), "#8f9aa8", 0.5); }
      s += glow(2, g);
      if (false) { // 크레인 (사용 안 함)
        let c = I.box(W + 18, D - 6, 0, 26, 12, 9, "#ffb020") + I.box(W + 36, D - 5, 9, 7, 10, 7, "#ffcf55");
        c += I.line([W + 26, D, 9], [W - 10, D / 2, H + R + 26], "#e09000", 2.2) + I.line([W - 10, D / 2, H + R + 26], [W - 10, D / 2, H + R + 8], "#4a5568", 0.6);
        c += I.box(W - 22, D / 2 - 4, H + R + 2, 22, 8, 1.5, st === 0 ? roofNew : "#dfe5ec");
        s += c;
      }
    }
    // 3 모듈
    if (st >= 3) {
      let g = "";
      const cols = 8;
      for (const [v0, v1] of [[0.12, 0.5], [0.52, 0.9]]) for (let i = 0; i < cols; i++) {
        const u0 = 0.05 + i * (0.9 / cols) + 0.004, u1 = u0 + 0.9 / cols - 0.008;
        g += panelQuad(I, S(u0, v0, 2.2), S(u1, v0, 2.2), S(u1, v1, 2.2), S(u0, v1, 2.2), id, 3, 6);
      }
      s += glow(3, g);
    }
    // 4 전기: 인버터 · 트레이 · 수배전반
    if (st >= 4) {
      let g = "";
      g += I.box(W, 40, 9, 2.4, 13, 15, "#f4f6f9", { stroke: "#b7c1ce" }); // 벽걸이 인버터 (오른쪽 벽)
      g += `<g transform="${I.faceX(W + 2.4, 53, 24)}"><rect x="3" y="2" width="7" height="4" rx=".6" fill="#0f1b33"/><rect x="4" y="3" width="3" height="1.2" fill="#38e08c"/><rect x="2" y="9" width="9" height="1" fill="#3266ff"/><circle cx="3" cy="13" r=".6" fill="#38e08c"/></g>`;
      g += I.path([[W + 1.4, 48, H - 1], [W + 1.4, 48, 24]], "#4b5568", 2.2) + I.path([[W + 1.4, 46.5, H - 1], [W + 1.4, 46.5, 24]], "#ff8a00", 0.9);
      g += I.box(W + 12, 30, 0, 9, 14, 20, "#d3d9e1"); // 수배전반
      g += `<g transform="${I.faceX(W + 21, 44, 20)}"><rect x="1.5" y="2" width="5.4" height="15" fill="#c3cad4" stroke="#a7b1be" stroke-width=".4"/><rect x="7.6" y="2" width="5.4" height="15" fill="#c3cad4" stroke="#a7b1be" stroke-width=".4"/><circle cx="4.2" cy="6" r="1.5" fill="#fff" stroke="#59657a" stroke-width=".4"/><circle cx="10.3" cy="6" r="1.5" fill="#fff" stroke="#59657a" stroke-width=".4"/><path d="M6 12 l1 -2 1 2z" fill="#f5b400"/></g>`;
      g += I.path([[W + 1, 45, 9], [W + 1, 45, 2], [W + 12, 40, 2]], "#2b3446", 1.6);
      s += glow(4, g);
    }
    // 5 시험 · 모니터링: 휴대폰 화면 말풍선
    if (st >= 5 && opts.monitor !== false) {
      const g = `<g transform="translate(238 14)"><rect width="52" height="36" rx="6" fill="#0f1b33"/><rect x="4" y="4" width="44" height="24" rx="3" fill="#13254d"/>
        <polyline points="7,24 15,19 22,21 30,12 38,14 45,7" fill="none" stroke="#38e08c" stroke-width="1.6" stroke-linejoin="round"/>${[0, 1, 2, 3, 4].map((i) => `<rect x="${8 + i * 8}" y="${26 - (4 + i * 2.6)}" width="4" height="${4 + i * 2.6}" fill="#3266ff" opacity=".55"/>`).join("")}
        <text x="26" y="33.5" text-anchor="middle" font-size="4.6" font-weight="700" fill="#cfe0ff" font-family="Pretendard, sans-serif">발전량 모니터링</text>
        <path d="M14 36 l-6 8 12 -8z" fill="#0f1b33"/></g>`;
      s += st === 5 ? `<g filter="url(#${id}-glow)" class="ill-new">${g}</g>` : g;
    }
    // 6 검사 · 연계: 전신주 · 검사원 · 합격
    if (st >= 6 || opts.grid) {
      let g = poleAt(I, id, W + 30, -10, 58);
      if (st >= 6 && opts.inspector !== false) g += worker(I, W + 14, D + 14, 0, "#3266ff", "#ffffff", `<rect x="4" y="-21" width="6" height="8" rx=".8" fill="#fff" stroke="#9aa5b5" stroke-width=".4" transform="rotate(12 7 -17)"/>`)
        + worker(I, W + 4, D + 22, 0, "#ff8a00");
      if (st === 6 && opts.badge !== false) g += `<g transform="translate(266 150)"><circle r="17" fill="#12a36b"/><circle r="13.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1" stroke-dasharray="2 2"/><text y="-1" text-anchor="middle" font-size="8.5" font-weight="800" fill="#fff" font-family="Pretendard, sans-serif">합격</text><text y="8" text-anchor="middle" font-size="4.6" font-weight="700" fill="#d9fbe9" font-family="Pretendard, sans-serif">사용전검사</text></g>`;
      s += st === 6 ? `<g class="ill-new">${g}</g>` : g;
    }
    // 작업자 (공사 중 단계)
    if (st >= 0 && st <= 3) s += worker(I, 60, D / 2 + 20, H + R - 13 * 0.55, "#ff8a00") + worker(I, 84, D / 2 + 12, H + R - 13 * 0.35 + 1, "#ff8a00", "#ffd84a");
    // 흐름 (완성 장면)
    if (opts.flow) {
      const a = I.p(...S(0.7, 0.9, 3)), b = I.p(W + 1.4, 47, 24), c = I.p(W + 16, 37, 20);
      s += `<path d="M${f1(a[0])} ${f1(a[1])} L${f1(b[0])} ${f1(b[1])}" stroke="#ff9a1f" stroke-width="2.6" stroke-dasharray="2 6" stroke-linecap="round" class="ill-flow"/>`;
      s += `<path d="M${f1(b[0])} ${f1(b[1])} L${f1(c[0])} ${f1(c[1])}" stroke="#3266ff" stroke-width="2.6" stroke-dasharray="2 6" stroke-linecap="round" class="ill-flow"/>`;
    }
    return wrap(id, "0 0 300 200", s, opts.label || "공장 지붕 태양광");
  }
  function poleAt(I, id, x, y, h = 70) {
    const [bx, by] = I.p(x, y, 0), [tx, ty] = I.p(x, y, h), k = I.k;
    let s = `<ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="${5 * k}" ry="${2.2 * k}" fill="rgba(15,23,42,.2)"/>`;
    s += `<rect x="${f1(tx - 2.1 * k)}" y="${f1(ty)}" width="${f1(4.2 * k)}" height="${f1(by - ty)}" fill="url(#${id}-pole)"/>`;
    s += I.box(x - 14, y - 1, h - 8, 28, 2, 2, "#7d8794");
    for (const dx of [-12, -4, 4, 12]) { const [ix, iy] = I.p(x + dx, y, h - 5.5); s += `<rect x="${f1(ix - 1)}" y="${f1(iy - 3 * k)}" width="${f1(2 * k)}" height="${f1(3 * k)}" rx=".8" fill="#e9eef4" stroke="#9aa5b5" stroke-width=".4"/>`; }
    // 변압기
    const [mx, my] = I.p(x - 3, y + 3, h - 22);
    s += `<rect x="${f1(mx - 4.5 * k)}" y="${f1(my - 9 * k)}" width="${f1(9 * k)}" height="${f1(12 * k)}" rx="${2 * k}" fill="#aeb7c3"/><ellipse cx="${f1(mx)}" cy="${f1(my - 9 * k)}" rx="${f1(4.5 * k)}" ry="${f1(1.6 * k)}" fill="#d3d9e1"/>`;
    // 전선
    for (const dx of [-12, 12]) { const [a1, a2] = I.p(x + dx, y, h - 5.5); s += `<path d="M${f1(a1)} ${f1(a2)} q 30 10 70 -6" fill="none" stroke="#3d4659" stroke-width=".7"/><path d="M${f1(a1)} ${f1(a2)} q -30 12 -70 -2" fill="none" stroke="#3d4659" stroke-width=".7"/>`; }
    return s;
  }

  /* ---------- 장비 클로즈업 ---------- */
  function module() {
    const id = "m" + (++UID), I = Iso(118, 120, 1.55);
    let s = sun(id, 40, 34, 34);
    s += I.poly([[-40, -30, 0], [110, -30, 0], [110, 60, 0], [-40, 60, 0]], "#e9eef5");
    // 지붕 강판
    s += I.poly([[-30, -10, 0], [100, -10, 0], [100, 50, 0], [-30, 50, 0]], "#3a6ad1");
    for (let x = -28; x < 100; x += 4) s += I.line([x, -10, 0], [x, 50, 0], x % 8 === 0 ? "#2f58b0" : "#5582e0", 0.8);
    // 레일 · 다리
    for (const y of [4, 34]) { s += I.box(-14, y, 2, 92, 3, 2.2, "#d3d9e1"); s += I.box(-10, y, 0, 3, 3, 2, "#9aa5b5") + I.box(66, y, 0, 3, 3, 2, "#9aa5b5"); }
    // 기울어진 패널 2장
    for (const [x0, x1] of [[-16, 30], [32, 78]]) s += I.box(x0, 46, 4.2, x1 - x0, 1, 3, "#aeb8c5") + panelQuad(I, [x0, -8, 18], [x1, -8, 18], [x1, 48, 5], [x0, 48, 5], id, 6, 10, 1.2);
    // 햇빛
    s += `<g class="ill-flow-sun">${[0, 1, 2].map((i) => `<line x1="${54 + i * 6}" y1="${48 + i * 4}" x2="${118 + i * 22}" y2="${92 + i * 10}" stroke="#ffc94a" stroke-width="1.6" stroke-dasharray="3 5" opacity=".8"/>`).join("")}</g>`;
    return wrap(id, "0 0 260 195", s, "태양광 모듈");
  }
  function inverter() {
    const id = "i" + (++UID), I = Iso(74, 118, 1.3);
    let s = "";
    s += I.poly([[-20, 26, 0], [90, 26, 0], [90, 60, 0], [-20, 60, 0]], "#e9eef5");
    s += I.box(-12, 0, 0, 100, 4, 78, "#d5dce6", { stroke: "#bcc6d3" }); // 벽
    s += `<g transform="${I.faceY(-12, 4, 78)}">${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 5 + 2}" y1="0" x2="${i * 5 + 2}" y2="78" stroke="#c4ccd8" stroke-width=".8"/>`).join("")}</g>`;
    s += I.shadow(10, 4, 50, 14, id);
    s += I.box(12, 4, 22, 48, 14, 44, "#f6f8fb", { stroke: "#b9c3d0", right: "#cfd6e0" }); // 함체
    for (let i = 0; i < 9; i++) s += I.box(60, 6 + i * 1.3, 24, 3.2, 0.5, 40, "#c2cad6", { stroke: false }); // 방열판
    s += `<g transform="${I.faceY(12, 18, 66)}">
      <rect x="4" y="5" width="40" height="3" rx="1" fill="#0f1b33"/><text x="6" y="7.4" font-size="2.6" font-weight="800" fill="#fff" font-family="Pretendard, sans-serif">INVERTER 150kW</text>
      <rect x="28" y="13" width="15" height="9" rx="1.2" fill="#0f1b33"/><rect x="29.5" y="14.5" width="12" height="6" rx=".6" fill="#13254d"/><text x="35.5" y="18.9" text-anchor="middle" font-size="3.4" font-weight="800" fill="#38e08c" font-family="Pretendard, sans-serif">113 kW</text>
      ${[0, 1, 2].map((i) => `<circle cx="${31 + i * 4.5}" cy="25.5" r=".9" fill="${["#38e08c", "#38e08c", "#ff8a00"][i]}"/>`).join("")}
      <rect x="4" y="13" width="18" height="1.4" rx=".7" fill="#3266ff"/><rect x="4" y="16" width="12" height="1" rx=".5" fill="#c9d2de"/>
      ${Array.from({ length: 8 }, (_, i) => `<circle cx="${7 + i * 5}" cy="41" r="1.5" fill="#3d4659"/>`).join("")}
    </g>`;
    // 케이블 (DC 주황 · AC 파랑)
    for (let i = 0; i < 4; i++) { const [a, b] = I.p(16 + i * 5, 18, 22); s += `<path d="M${f1(a)} ${f1(b)} q 0 16 ${-14 - i * 3} 26" fill="none" stroke="${i < 2 ? "#ff8a00" : "#1f2937"}" stroke-width="2.2" stroke-linecap="round"/>`; }
    for (let i = 0; i < 2; i++) { const [a, b] = I.p(48 + i * 5, 18, 22); s += `<path d="M${f1(a)} ${f1(b)} q 0 16 ${18 + i * 4} 24" fill="none" stroke="#3266ff" stroke-width="2.4" stroke-linecap="round"/>`; }
    s += `<g transform="translate(18 26)"><rect width="38" height="15" rx="7.5" fill="#ff8a00"/><text x="19" y="10.2" text-anchor="middle" font-size="7.6" font-weight="800" fill="#fff" font-family="Pretendard, sans-serif">DC → AC</text></g>`;
    return wrap(id, "0 0 260 195", s, "인버터");
  }
  function board(o = {}) {
    const id = "b" + (++UID), I = Iso(92, 126, 1.12);
    let s = "";
    s += I.poly([[-30, -10, 0], [100, -10, 0], [100, 60, 0], [-30, 60, 0]], "#e9eef5");
    s += I.shadow(0, 0, 70, 24, id);
    s += I.box(0, 0, 0, 70, 24, 86, "#d8dee6", { stroke: "#b0bac7" });
    s += I.box(-1, -1, 86, 72, 26, 2.5, "#c5cdd8");
    s += `<g transform="${I.faceY(0, 24, 86)}">
      <rect x="2" y="3" width="32.5" height="80" fill="#cfd6df" stroke="#aab4c2" stroke-width=".6"/><rect x="35.5" y="3" width="32.5" height="80" fill="#cfd6df" stroke="#aab4c2" stroke-width=".6"/>
      <rect x="6" y="8" width="24" height="26" rx="1" fill="#2a3346"/>${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${8 + c * 5.4}" y="${10.5 + r * 8}" width="4" height="6" rx=".6" fill="${r === 0 && c === 3 ? "#ff8a00" : "#e8edf3"}"/><rect x="${9.2 + c * 5.4}" y="${11.6 + r * 8}" width="1.6" height="2" fill="#2a3346"/>`).join("")).join("")}
      <circle cx="${46}" cy="16" r="5.5" fill="#fff" stroke="#59657a" stroke-width=".8"/><path d="M46 16 l3 -3" stroke="#c43b3b" stroke-width=".8"/><circle cx="60" cy="16" r="5.5" fill="#fff" stroke="#59657a" stroke-width=".8"/><path d="M60 16 l-2 -3.6" stroke="#c43b3b" stroke-width=".8"/>
      <rect x="40" y="26" width="24" height="8" rx="1" fill="#0f1b33"/><text x="52" y="31.6" text-anchor="middle" font-size="4" font-weight="800" fill="#38e08c" font-family="Pretendard, sans-serif">380V 60Hz</text>
      <rect x="31" y="44" width="1.6" height="10" rx=".8" fill="#7d8794"/><rect x="38.4" y="44" width="1.6" height="10" rx=".8" fill="#7d8794"/>
      <path d="M12 60 l6 -10 6 10z" fill="#f5b400" stroke="#2a3346" stroke-width=".6"/><text x="18" y="58.6" text-anchor="middle" font-size="5.6" font-weight="900" fill="#2a3346">!</text>
      <rect x="40" y="62" width="24" height="5" rx="1" fill="#fff"/><text x="52" y="65.8" text-anchor="middle" font-size="3.2" font-weight="800" fill="#24407a" font-family="Pretendard, sans-serif">태양광 연계반</text>
    </g>`;
    for (const [c, dx] of [["#3266ff", 0], ["#3266ff", 5], ["#1f2937", 10]]) { const [a, b] = I.p(70, 6 + dx, 70); s += `<path d="M${f1(a)} ${f1(b)} q 22 -6 40 -26" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`; }
    return wrap(id, "0 0 260 195", s, "수배전반");
  }
  function relay() {
    const id = "r" + (++UID), I = Iso(78, 106, 1.32);
    let s = I.poly([[-30, -10, 0], [100, -10, 0], [100, 60, 0], [-30, 60, 0]], "#f3e4e4");
    s += I.shadow(4, 0, 64, 16, id);
    s += I.box(4, 0, 0, 64, 16, 70, "#dde2e9", { stroke: "#b0bac7" });
    s += `<g transform="${I.faceY(4, 16, 70)}">
      <rect x="8" y="8" width="48" height="28" rx="2" fill="#2a3346"/><rect x="11" y="11" width="42" height="14" rx="1.2" fill="#13254d"/>
      <text x="32" y="20.4" text-anchor="middle" font-size="7" font-weight="800" fill="#ff5a5a" font-family="Pretendard, sans-serif">-0.18 kW</text>
      <rect x="12" y="28" width="12" height="5" rx="1" fill="#c43b3b"/><text x="18" y="31.6" text-anchor="middle" font-size="3.2" font-weight="800" fill="#fff" font-family="Pretendard, sans-serif">TRIP</text>
      <circle cx="30" cy="30.5" r="1.6" fill="#ff5a5a"/><circle cx="35" cy="30.5" r="1.6" fill="#38e08c" opacity=".35"/>
      <text x="32" y="46" text-anchor="middle" font-size="4.6" font-weight="800" fill="#2a3346" font-family="Pretendard, sans-serif">역전력계전기 RPR</text>
      <rect x="20" y="52" width="24" height="10" rx="2" fill="#c3cad4"/><rect x="29" y="49" width="6" height="16" rx="1.4" fill="#7d8794" transform="rotate(-35 32 57)"/>
    </g>`;
    s += `<g transform="translate(186 40)"><circle r="20" fill="#c43b3b"/><path d="M-8 -8 L8 8 M8 -8 L-8 8" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g><text x="186" y="76" text-anchor="middle" font-size="9" font-weight="800" fill="#c43b3b" font-family="Pretendard, sans-serif">한전 쪽 역송 차단</text>`;
    return wrap(id, "0 0 260 195", s, "역전력계전기", false);
  }
  function pole() {
    const id = "p" + (++UID), I = Iso(120, 128, 1.05);
    let s = I.poly([[-60, -40, 0], [80, -40, 0], [80, 60, 0], [-60, 60, 0]], "#e9eef5");
    s += poleAt(I, id, 10, 6, 84);
    s += `<g transform="translate(26 150)"><rect width="66" height="18" rx="9" fill="#3266ff"/><text x="33" y="12.4" text-anchor="middle" font-size="8" font-weight="800" fill="#fff" font-family="Pretendard, sans-serif">한전 22.9kV</text></g>`;
    return wrap(id, "0 0 260 195", s, "한전 전신주");
  }
  function plant(o = {}) { return factory({ step: 99, flow: true, monitor: false, inspector: false, badge: false, grid: o.grid, label: "태양광 공장", k: o.k }); }
  function structure() {
    const id = "s" + (++UID), I = Iso(118, 100, 1.7);
    let s = I.poly([[-40, -30, 0], [100, -30, 0], [100, 60, 0], [-40, 60, 0]], "#e9eef5");
    s += I.poly([[-30, -14, 0], [80, -14, 0], [80, 40, 0], [-30, 40, 0]], "#3a6ad1");
    for (let x = -28; x < 80; x += 4) s += I.box(x, -14, 0, 1.6, 54, 1.6, "#4b7be0", { stroke: false });
    for (const y of [0, 24]) { s += I.box(-20, y, 3, 88, 4, 3, "#e4e9ef", { stroke: "#9aa5b5" }); for (const x of [-12, 20, 52]) s += I.box(x, y - 1, 0, 5, 6, 3, "#9aa5b5") + I.box(x + 1, y - 0.5, 6, 3, 5, 1.4, "#7d8794"); }
    return wrap(id, "0 0 260 195", s, "구조물 레일");
  }
  function combiner() {
    const id = "c" + (++UID), I = Iso(84, 112, 1.32);
    let s = I.box(-10, 0, 0, 80, 3, 70, "#d5dce6", { stroke: false });
    s += I.box(6, 3, 12, 50, 12, 44, "#e4e8ee", { stroke: "#a9b3c0" });
    s += `<g transform="${I.faceY(6, 15, 56)}"><rect x="4" y="4" width="42" height="34" rx="2" fill="rgba(200,220,245,.55)" stroke="#9fb0c7" stroke-width=".6"/>
      ${Array.from({ length: 6 }, (_, i) => `<rect x="${8 + i * 6}" y="9" width="4" height="12" rx=".8" fill="#f2f4f7" stroke="#59657a" stroke-width=".4"/><rect x="${8.8 + i * 6}" y="13" width="2.4" height="4" fill="${i < 3 ? "#ff8a00" : "#1f2937"}"/>`).join("")}
      <rect x="8" y="26" width="34" height="3" fill="#c43b3b"/><rect x="8" y="31" width="34" height="3" fill="#1f2937"/></g>`;
    for (let i = 0; i < 4; i++) { const [a, b] = I.p(12 + i * 8, 15, 12); s += `<path d="M${f1(a)} ${f1(b)} q 0 14 ${-6 + i * 4} 24" fill="none" stroke="${i % 2 ? "#1f2937" : "#ff8a00"}" stroke-width="2.4" stroke-linecap="round"/>`; }
    return wrap(id, "0 0 260 195", s, "접속반");
  }
  function cable() {
    const id = "k" + (++UID), I = Iso(60, 92, 1.5);
    let s = I.poly([[-30, -20, 0], [120, -20, 0], [120, 60, 0], [-30, 60, 0]], "#e9eef5");
    // 케이블 트레이
    s += I.box(-10, 10, 10, 110, 14, 1.2, "#c9d1dc") + I.box(-10, 10, 11.2, 110, 1, 5, "#b7c1ce") + I.box(-10, 23, 11.2, 110, 1, 5, "#dfe5ec");
    for (let x = -6; x < 100; x += 12) s += I.box(x, 8, 0, 2, 2, 10, "#9aa5b5");
    const cs = [["#1f2937", 13], ["#c43b3b", 16], ["#3266ff", 19], ["#ff8a00", 21.5]];
    for (const [c, y] of cs) s += I.path([[-12, y, 12.6], [100, y, 12.6], [116, y + 6, 22]], c, 2.6);
    s += `<g transform="translate(150 36)"><rect width="70" height="18" rx="9" fill="#0f1b33"/><text x="35" y="12.2" text-anchor="middle" font-size="7.4" font-weight="800" fill="#fff" font-family="Pretendard, sans-serif">6SQ · 70SQ</text></g>`;
    return wrap(id, "0 0 260 195", s, "케이블");
  }
  function monitor() {
    const id = "n" + (++UID), I = Iso(70, 112, 1.5);
    let s = I.poly([[-30, -20, 0], [100, -20, 0], [100, 50, 0], [-30, 50, 0]], "#eef2f7");
    s += I.shadow(0, 0, 70, 40, id);
    s += I.box(0, 0, 0, 70, 44, 2.2, "#c9d1dc"); // 노트북 바닥
    s += `<g transform="${I.faceTop(4, 6, 2.2)}">${Array.from({ length: 6 }, (_, r) => Array.from({ length: 12 }, (_, c) => `<rect x="${c * 5.2}" y="${r * 4.2}" width="4.4" height="3.4" rx=".5" fill="#aeb8c5"/>`).join("")).join("")}</g>`;
    s += I.box(0, -2, 2.2, 70, 2, 46, "#2a3346");
    s += `<g transform="${I.faceY(2, 0, 46.5)}"><rect x="0" y="1" width="66" height="42" rx="1.5" fill="#f7f9fc"/>
      <text x="4" y="7" font-size="3.6" font-weight="800" fill="#0b1220" font-family="Pretendard, sans-serif">FEMS · 태양광 발전</text>
      <text x="4" y="15" font-size="7" font-weight="900" fill="#0b1220" font-family="Pretendard, sans-serif">612 kWh</text><text x="36" y="15" font-size="3.2" fill="#12a36b" font-weight="800" font-family="Pretendard, sans-serif">▲ 오늘 발전량</text>
      ${Array.from({ length: 12 }, (_, i) => { const h = [6, 9, 14, 19, 23, 25, 24, 21, 16, 11, 7, 4][i]; return `<rect x="${5 + i * 5}" y="${39 - h}" width="3.2" height="${h}" rx=".6" fill="${i === 5 ? "#ff8a00" : "#3266ff"}"/>`; }).join("")}
    </g>`;
    return wrap(id, "0 0 260 195", s, "모니터링 화면");
  }
  function safety() {
    const id = "y" + (++UID), I = Iso(110, 122, 1.4);
    let s = I.poly([[-40, -30, 0], [110, -30, 0], [110, 60, 0], [-40, 60, 0]], "#eef2f7");
    s += I.box(0, 0, 0, 60, 40, 46, "#e6ebf2", { stroke: "#c3ccd8" });
    s += I.poly([[0, 0, 46], [60, 0, 46], [60, 40, 46], [0, 40, 46]], "#3a6ad1");
    for (let x = 4; x <= 60; x += 8) s += I.line([x, 40, 46], [x, 40, 56], "#f5b400", 1.4);
    for (let y = 4; y <= 40; y += 8) s += I.line([60, y, 46], [60, y, 56], "#f5b400", 1.4);
    s += I.path([[0, 40, 56], [60, 40, 56], [60, 0, 56]], "#f5b400", 1.6) + I.path([[0, 40, 51], [60, 40, 51], [60, 0, 51]], "#f5b400", 1);
    const ly = 30;
    s += I.line([61, ly, 0], [61, ly, 60], "#8f9aa8", 1.6) + I.line([61, ly - 6, 0], [61, ly - 6, 60], "#8f9aa8", 1.6);
    for (let z = 4; z < 60; z += 4) s += I.line([61, ly, z], [61, ly - 6, z], "#8f9aa8", 1);
    for (let z = 22; z < 60; z += 6) s += I.path([[61, ly, z], [67, ly - 0.5, z], [67, ly - 5.5, z], [61, ly - 6, z]], "#aeb8c5", 0.9);
    s += worker(I, 30, 34, 46, "#ff8a00");
    return wrap(id, "0 0 260 195", s, "안전시설");
  }
  // 아이콘형 그림 (사업 유형 이야기용)
  function coin() {
    const id = "o" + (++UID); let s = "";
    for (let i = 4; i >= 0; i--) s += `<ellipse cx="80" cy="${120 - i * 10}" rx="34" ry="12" fill="#e0a21a"/><rect x="46" y="${108 - i * 10}" width="68" height="12" fill="#e9b53a"/><ellipse cx="80" cy="${108 - i * 10}" rx="34" ry="12" fill="#ffd25a" stroke="#d29214" stroke-width="1"/>`;
    s += `<text x="80" y="72" text-anchor="middle" font-size="16" font-weight="900" fill="#b97c0a" font-family="Pretendard, sans-serif">₩</text>`;
    s += `<g transform="translate(150 70)"><rect x="-6" y="-30" width="12" height="40" rx="3" fill="#12a36b"/><path d="M-18 8 L0 30 18 8z" fill="#12a36b"/></g>`;
    return wrap(id, "0 0 260 195", s, "전기요금 절감");
  }
  function office(color = "#3266ff", label = "SPC", antenna = false) {
    const id = "e" + (++UID), I = Iso(100, 132, 1.35);
    let s = I.poly([[-40, -30, 0], [110, -30, 0], [110, 70, 0], [-40, 70, 0]], "#eef2f7");
    s += I.shadow(0, 0, 50, 40, id);
    s += I.box(0, 0, 0, 50, 40, 74, shade(color, 0.55), { stroke: shade(color, 0.2) });
    s += `<g transform="${I.faceY(0, 40, 74)}">${Array.from({ length: 8 }, (_, r) => Array.from({ length: 5 }, (_, c) => `<rect x="${4 + c * 9}" y="${6 + r * 8}" width="7" height="5.6" rx=".6" fill="${shade(color, 0.25)}" opacity=".85"/>`).join("")).join("")}</g>`;
    s += `<g transform="${I.faceX(50, 40, 74)}">${Array.from({ length: 8 }, (_, r) => Array.from({ length: 4 }, (_, c) => `<rect x="${4 + c * 9}" y="${6 + r * 8}" width="7" height="5.6" rx=".6" fill="${shade(color, 0.05)}" opacity=".8"/>`).join("")).join("")}</g>`;
    if (antenna) { const [a, b] = I.p(25, 20, 74); s += `<line x1="${f1(a)}" y1="${f1(b)}" x2="${f1(a)}" y2="${f1(b - 46)}" stroke="#59657a" stroke-width="2"/>${[0, 1, 2].map((i) => `<path d="M${f1(a - 8 - i * 6)} ${f1(b - 40 - i * 3)} a ${10 + i * 6} ${10 + i * 6} 0 0 1 ${16 + i * 12} 0" fill="none" stroke="${color}" stroke-width="2" opacity="${1 - i * 0.25}"/>`).join("")}`; }
    if (label) s += `<g transform="translate(170 40)"><rect width="64" height="22" rx="11" fill="${color}"/><text x="32" y="15" text-anchor="middle" font-size="10" font-weight="900" fill="#fff" font-family="Pretendard, sans-serif">${label}</text></g>`;
    return wrap(id, "40 30 190 160", s, label || "건물");
  }
  function documentPaper() {
    const id = "d" + (++UID), I = Iso(60, 84, 1.6);
    let s = I.poly([[-30, -30, 0], [110, -30, 0], [110, 70, 0], [-30, 70, 0]], "#eef2f7");
    s += I.shadow(4, 4, 60, 76, id);
    s += I.box(0, 0, 0, 62, 80, 1.4, "#ffffff", { stroke: "#c9d2de" });
    s += `<g transform="${I.faceTop(0, 0, 1.4)}"><text x="8" y="12" font-size="6.6" font-weight="900" fill="#0b1220" font-family="Pretendard, sans-serif">발전사업 허가증</text>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="8" y="${20 + i * 7}" width="${44 - (i % 3) * 8}" height="2.4" rx="1.2" fill="#c9d2de"/>`).join("")}
      <circle cx="46" cy="66" r="8" fill="none" stroke="#c43b3b" stroke-width="1.6"/><text x="46" y="68" text-anchor="middle" font-size="5" font-weight="900" fill="#c43b3b" font-family="Pretendard, sans-serif">승인</text></g>`;
    return wrap(id, "0 0 260 195", s, "허가 서류");
  }
  function bapv() {
    const id = "v" + (++UID), I = Iso(96, 132, 1.3);
    let s = sun(id, 40, 30, 28);
    s += I.poly([[-40, -30, 0], [110, -30, 0], [110, 70, 0], [-40, 70, 0]], "#eef2f7");
    s += I.shadow(0, 0, 70, 40, id);
    s += I.box(0, 0, 0, 70, 40, 60, "#e6ebf2", { stroke: "#c3ccd8" });
    // 벽면 모듈 (앞면)
    for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) s += panelQuad(I, [6 + c * 12.4, 40.6, 54 - r * 15], [17 + c * 12.4, 40.6, 54 - r * 15], [17 + c * 12.4, 40.6, 41 - r * 15], [6 + c * 12.4, 40.6, 41 - r * 15], id, 3, 4);
    s += I.poly([[0, 0, 60], [70, 0, 60], [70, 40, 60], [0, 40, 60]], "#3a6ad1");
    return wrap(id, "0 0 260 195", s, "건물 벽면 태양광");
  }

  window.ILL = { factory, plant, module, inverter, board, relay, pole, structure, combiner, cable, monitor, safety, coin, office, documentPaper, bapv };
})();
