/* 태양광 3D 장면 라이브러리
   - 빌드 때 build/render3d/render.mjs 가 이 파일로 정지 이미지를 렌더해 site/3d/*.webp 로 저장한다.
   - 실행 중에는 홈 화면의 인터랙티브 3D 장면이 같은 코드를 쓴다.
   사용: const s = SOLAR3D.create(THREE, { shot: "hero" }) → { scene, camera, fit(aspect), setSun(hour), hotspots, dispose }
   단위: m, Y 위쪽, +Z 가 남쪽(카메라 쪽). */
(function () {
  "use strict";

  function create(THREE, opt) {
    opt = opt || {};
    const disposables = [];
    const keep = (x) => { disposables.push(x); return x; };
    const live = !!opt.live;

    /* ------------------------------------------------------------------
       텍스처 (캔버스로 생성)
       ------------------------------------------------------------------ */
    function canvasTex(w, h, draw, color = true, repeat) {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"); draw(g, w, h);
      const t = keep(new THREE.CanvasTexture(c));
      if (color) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
      return t;
    }
    const rnd = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

    // 모듈 셀 (세로형 2:1, 하프컷 144셀)
    const cellTex = canvasTex(512, 1024, (g, w, h) => {
      g.fillStyle = "#c9ced6"; g.fillRect(0, 0, w, h); // 프레임 색 (테두리)
      const m = 14; g.fillStyle = "#0d1830"; g.fillRect(m, m, w - 2 * m, h - 2 * m);
      const cols = 6, rows = 24, gx = 3, cw = (w - 2 * m - gx * (cols + 1)) / cols, ch = (h - 2 * m - gx * (rows + 1)) / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = m + gx + c * (cw + gx), y = m + gx + r * (ch + gx) + (r >= rows / 2 ? 4 : 0);
        const gr = g.createLinearGradient(x, y, x + cw, y + ch);
        gr.addColorStop(0, "#1b2d52"); gr.addColorStop(0.5, "#14244a"); gr.addColorStop(1, "#1d3159");
        g.fillStyle = gr; g.fillRect(x, y, cw, ch);
        g.strokeStyle = "rgba(180,195,220,.22)"; g.lineWidth = 1;
        for (let k = 1; k <= 9; k++) { g.beginPath(); g.moveTo(x + (cw * k) / 10, y); g.lineTo(x + (cw * k) / 10, y + ch); g.stroke(); }
      }
      g.fillStyle = "rgba(210,220,235,.55)"; g.fillRect(m, h / 2 - 1, w - 2 * m, 3);
    });
    // 골강판 지붕 노멀맵 (가로 방향 골)
    const ribNormal = canvasTex(256, 16, (g, w) => {
      for (let x = 0; x < w; x++) {
        const p = (x % 64) / 64; let nx = 0;
        if (p < 0.12) nx = 0.9; else if (p < 0.22) nx = 0; else if (p < 0.34) nx = -0.9; else nx = 0;
        const r = Math.round((nx * 0.5 + 0.5) * 255); g.fillStyle = `rgb(${r},128,255)`; g.fillRect(x, 0, 1, 16);
      }
    }, false);
    ribNormal.wrapS = ribNormal.wrapT = THREE.RepeatWrapping;
    // 샌드위치 패널 벽 (가로 줄눈)
    const wallTex = canvasTex(64, 256, (g, w, h) => {
      g.fillStyle = "#eef1f5"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 64) { g.fillStyle = "#cfd6e0"; g.fillRect(0, y, w, 2); g.fillStyle = "#ffffff"; g.fillRect(0, y + 2, w, 1); }
    });
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    const noiseTex = (base, spread, size = 256) => canvasTex(size, size, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < w * h * 0.25; i++) { const v = (rnd() - 0.5) * spread; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(rnd() * w, rnd() * h, 1.4, 1.4); }
    });
    const rustTex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#8b5a3c"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${90 + rnd() * 70},${40 + rnd() * 30},${20 + rnd() * 20},${0.25 + rnd() * 0.4})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 14, 1 + rnd() * 5, 0, 0, 7); g.fill(); }
    });
    rustTex.wrapS = rustTex.wrapT = THREE.RepeatWrapping;
    const grassTex = noiseTex("#6e9f4f", 0.22); grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(0.12, 0.12);
    const asphaltTex = noiseTex("#5b6270", 0.18); asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping; asphaltTex.repeat.set(0.15, 0.15);
    const concreteTex = noiseTex("#c8ccd2", 0.12); concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;

    /* ------------------------------------------------------------------
       재질
       ------------------------------------------------------------------ */
    const std = (o) => keep(new THREE.MeshStandardMaterial(o));
    const phys = (o) => keep(new THREE.MeshPhysicalMaterial(o));
    const M = {
      cells: phys({ map: cellTex, roughness: 0.3, metalness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.06, envMapIntensity: 0.65 }),
      alu: std({ color: 0xc7ccd4, roughness: 0.32, metalness: 0.9 }),
      aluDark: std({ color: 0x8d949e, roughness: 0.4, metalness: 0.85 }),
      steel: std({ color: 0x9aa3ad, roughness: 0.45, metalness: 0.7 }),
      roofNew: std({ color: 0x3f63a8, roughness: 0.38, metalness: 0.55, normalMap: ribNormal, normalScale: new THREE.Vector2(1.2, 1.2) }),
      roofOld: std({ color: 0xffffff, map: rustTex, roughness: 0.85, metalness: 0.25, normalMap: ribNormal, normalScale: new THREE.Vector2(1, 1) }),
      roofGrey: std({ color: 0xa9b2be, roughness: 0.36, metalness: 0.7, normalMap: ribNormal, normalScale: new THREE.Vector2(1.6, 1.6) }),
      wall: std({ map: wallTex, roughness: 0.6, metalness: 0.05 }),
      wallBand: std({ color: 0x1f3a6e, roughness: 0.5, metalness: 0.3 }),
      glass: phys({ color: 0x223a5c, roughness: 0.05, metalness: 0.2, clearcoat: 1, envMapIntensity: 1.6 }),
      glassBlue: phys({ color: 0x5f8fd0, roughness: 0.04, metalness: 0.3, clearcoat: 1, envMapIntensity: 1.8 }),
      shutter: std({ color: 0xd9dee6, roughness: 0.45, metalness: 0.4, normalMap: ribNormal, normalScale: new THREE.Vector2(0.6, 0.6) }),
      white: std({ color: 0xf3f5f8, roughness: 0.42, metalness: 0.05 }),
      offWhite: std({ color: 0xe4e8ee, roughness: 0.5, metalness: 0.05 }),
      cabinet: std({ color: 0xd5dae1, roughness: 0.42, metalness: 0.25 }),
      cabinetDark: std({ color: 0x5d6878, roughness: 0.45, metalness: 0.3 }),
      black: std({ color: 0x1b1f27, roughness: 0.5, metalness: 0.2 }),
      rubber: std({ color: 0x15171c, roughness: 0.9, metalness: 0 }),
      screen: std({ color: 0x0a1222, roughness: 0.15, metalness: 0.1, emissive: 0x0a1222 }),
      yellow: std({ color: 0xf5b301, roughness: 0.45, metalness: 0.2 }),
      orange: std({ color: 0xff7a1a, roughness: 0.55, metalness: 0 }),
      vest: std({ color: 0xd8ff3a, roughness: 0.6, metalness: 0, emissive: 0x3a4a00, emissiveIntensity: 0.25 }),
      navyCloth: std({ color: 0x2b3a55, roughness: 0.85, metalness: 0 }),
      skin: std({ color: 0xe8b894, roughness: 0.7, metalness: 0 }),
      helmet: std({ color: 0xffffff, roughness: 0.3, metalness: 0.05 }),
      grass: std({ map: grassTex, roughness: 0.95, metalness: 0 }),
      soil: std({ color: 0x8a6e52, roughness: 0.95, metalness: 0 }),
      asphalt: std({ map: asphaltTex, roughness: 0.9, metalness: 0 }),
      concrete: std({ map: concreteTex, roughness: 0.85, metalness: 0 }),
      line: std({ color: 0xffffff, roughness: 0.7, metalness: 0 }),
      leaf: std({ color: 0x4f8f45, roughness: 0.9, metalness: 0 }),
      leaf2: std({ color: 0x67a554, roughness: 0.9, metalness: 0 }),
      bark: std({ color: 0x6b4f3a, roughness: 0.95, metalness: 0 }),
      cableBlack: std({ color: 0x20232a, roughness: 0.55, metalness: 0.1 }),
      cableRed: std({ color: 0xc83a32, roughness: 0.55, metalness: 0.1 }),
      gold: std({ color: 0xe8b64a, roughness: 0.28, metalness: 1 }),
      green: std({ color: 0x14a86e, roughness: 0.4, metalness: 0.1, emissive: 0x0b5c3c, emissiveIntensity: 0.4 }),
      red: std({ color: 0xe0453c, roughness: 0.45, metalness: 0.1 }),
      redLed: std({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 2 }),
      greenLed: std({ color: 0x34e07a, emissive: 0x34e07a, emissiveIntensity: 2 }),
      amberLed: std({ color: 0xffb020, emissive: 0xffb020, emissiveIntensity: 2 }),
      paper: std({ color: 0xfbfbf9, roughness: 0.9, metalness: 0 }),
      wood: std({ color: 0xb08860, roughness: 0.8, metalness: 0 }),
      porcelain: std({ color: 0xf2efe8, roughness: 0.25, metalness: 0 }),
      polyGrey: std({ color: 0x9aa1aa, roughness: 0.5, metalness: 0.2 }),
    };

    /* ------------------------------------------------------------------
       도형 도우미
       ------------------------------------------------------------------ */
    const geoCache = {};
    const G = (key, mk) => geoCache[key] || (geoCache[key] = keep(mk()));
    function mesh(geo, mat, parent, x = 0, y = 0, z = 0, cast = true) {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true;
      if (parent) parent.add(m); return m;
    }
    const box = (w, h, d, mat, parent, x, y, z, cast) => mesh(G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), mat, parent, x, y, z, cast);
    const cyl = (rt, rb, h, mat, parent, x, y, z, seg = 24) => mesh(G(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat, parent, x, y, z);
    const sph = (r, mat, parent, x, y, z) => mesh(G(`s${r}`, () => new THREE.SphereGeometry(r, 24, 16)), mat, parent, x, y, z);
    function rrShape(w, h, r) {
      const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
    }
    // 둥근 모서리 상자 (w × h × d, 가운데 기준)
    function rbox(w, h, d, r, mat, parent, x = 0, y = 0, z = 0) {
      const geo = G(`rb${w},${h},${d},${r}`, () => {
        const b = Math.min(r, d / 2 - 0.001);
        const g = new THREE.ExtrudeGeometry(rrShape(w - 2 * b, h - 2 * b, Math.max(0.001, r - b * 0.5)), { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 6 });
        g.translate(0, 0, -(d - 2 * b) / 2); g.computeVertexNormals(); return g;
      });
      return mesh(geo, mat, parent, x, y, z);
    }
    function tube(points, r, mat, parent, seg = 48) {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
      return mesh(keep(new THREE.TubeGeometry(curve, seg, r, 10, false)), mat, parent);
    }
    // 처진 전선 (현수선)
    function wire(a, b, sag, r, mat, parent) {
      const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]); }
      return tube(pts, r, mat, parent, 32);
    }
    const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; };

    /* ------------------------------------------------------------------
       구성 요소
       ------------------------------------------------------------------ */
    let moduleCount = 0, focus = null;
    let WS = 1; // 작업자 크기 (넓은 장면에서는 잘 보이게 키운다)
    const MOD = { w: 1.134, l: 2.384, t: 0.035 };
    const modGeo = G("module", () => new THREE.BoxGeometry(MOD.w, MOD.t, MOD.l));
    const modMats = [M.alu, M.alu, M.cells, M.aluDark, M.alu, M.alu];
    function module(parent, x, y, z) { return mesh(modGeo, modMats, parent, x, y, z); }
    // 여러 장은 인스턴스로
    function moduleArray(parent, list) {
      if (!list.length) return null;
      const im = new THREE.InstancedMesh(modGeo, modMats, list.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
      list.forEach((p, i) => { q.setFromEuler(new THREE.Euler(p[3] || 0, p[4] || 0, 0)); m4.compose(new THREE.Vector3(p[0], p[1], p[2]), q, s); im.setMatrixAt(i, m4); });
      im.castShadow = true; im.receiveShadow = true; parent.add(im); return im;
    }

    function worker(parent, x, z, opts = {}) {
      const g = group(parent, x, opts.y || 0, z); g.rotation.y = opts.ry || 0;
      const sc = opts.scale || WS; g.scale.setScalar(sc);
      const legs = M.navyCloth;
      const lean = opts.kneel ? 0.5 : 0;
      for (const s of [-1, 1]) {
        const leg = cyl(0.075, 0.065, 0.82, legs, g, s * 0.1, 0.41 - lean * 0.3, opts.kneel && s > 0 ? 0.25 : 0, 12);
        if (opts.kneel && s > 0) { leg.rotation.x = Math.PI / 2; leg.position.set(s * 0.1, 0.12, 0.3); }
        box(0.13, 0.08, 0.26, M.black, g, s * 0.1, 0.04 + (opts.kneel && s > 0 ? 0 : 0), opts.kneel && s > 0 ? 0.62 : 0.04);
      }
      const body = mesh(G("torso", () => new THREE.CapsuleGeometry(0.2, 0.42, 6, 14)), opts.shirt || M.navyCloth, g, 0, 1.15 - lean * 0.3, 0);
      body.scale.set(1, 1, 0.75);
      const vest = mesh(G("vest", () => new THREE.CapsuleGeometry(0.212, 0.3, 6, 14)), opts.vest || M.vest, g, 0, 1.2 - lean * 0.3, 0);
      vest.scale.set(1, 1, 0.78);
      const arm = (s, rx) => { const a = group(g, s * 0.25, 1.45 - lean * 0.3, 0); a.rotation.x = rx; a.rotation.z = s * 0.12; mesh(G("arm", () => new THREE.CapsuleGeometry(0.06, 0.48, 4, 10)), opts.shirt || M.navyCloth, a, 0, -0.3, 0); sph(0.06, M.skin, a, 0, -0.6, 0); return a; };
      arm(-1, opts.armL != null ? opts.armL : 0.1); arm(1, opts.armR != null ? opts.armR : -0.5);
      sph(0.13, M.skin, g, 0, 1.73 - lean * 0.3, 0);
      const hat = mesh(G("hat", () => new THREE.SphereGeometry(0.155, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), opts.hat || M.helmet, g, 0, 1.78 - lean * 0.3, 0);
      mesh(G("brim", () => new THREE.CylinderGeometry(0.18, 0.18, 0.015, 20)), opts.hat || M.helmet, g, 0, 1.785 - lean * 0.3, 0.02);
      return g;
    }

    function tree(parent, x, z, s = 1, kind = 0) {
      const g = group(parent, x, 0, z); g.scale.setScalar(s);
      cyl(0.12, 0.18, 1.6, M.bark, g, 0, 0.8, 0, 10);
      if (kind === 1) { // 침엽수
        for (let i = 0; i < 3; i++) { const c = mesh(G(`cone${i}`, () => new THREE.ConeGeometry(1.25 - i * 0.3, 1.7, 14)), i % 2 ? M.leaf : M.leaf2, g, 0, 1.9 + i * 0.85, 0); c.rotation.y = i; }
      } else {
        const blobs = [[0, 2.6, 0, 1.25], [0.7, 2.2, 0.3, 0.9], [-0.6, 2.3, -0.2, 0.95], [0.1, 3.3, 0.1, 0.85], [-0.2, 2.1, 0.7, 0.8]];
        blobs.forEach(([bx, by, bz, r], i) => { const m = mesh(G(`ico${r}`, () => new THREE.IcosahedronGeometry(r, 2)), i % 2 ? M.leaf2 : M.leaf, g, bx, by, bz); m.rotation.set(i, i * 2, 0); });
      }
      return g;
    }

    function car(parent, x, z, ry, color = 0xf2f4f7) {
      const g = group(parent, x, 0, z); g.rotation.y = ry;
      const paint = phys({ color, roughness: 0.25, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.05 });
      rbox(1.8, 0.62, 4.3, 0.18, paint, g, 0, 0.62, 0);
      rbox(1.6, 0.55, 2.3, 0.2, M.glass, g, 0, 1.15, -0.2);
      for (const sx of [-0.82, 0.82]) for (const sz of [-1.35, 1.35]) { const w = cyl(0.34, 0.34, 0.24, M.rubber, g, sx, 0.34, sz, 18); w.rotation.z = Math.PI / 2; }
      return g;
    }

    // 기본 공장 건물 + 지붕 + (옵션) 태양광
    function factory(parent, o = {}) {
      const L = o.L || 36, W = o.W || 20, H = o.H || 7.5, R = o.R || 1.6, ov = 0.5;
      const g = group(parent, o.x || 0, 0, o.z || 0);
      // 긴 벽 (남 · 북)
      const wt = wallTex.clone(); wt.needsUpdate = true; wt.repeat.set(L / 2, H / 2.2); keep(wt);
      const wmat = std({ map: wt, roughness: 0.6, metalness: 0.05 });
      for (const s of [-1, 1]) box(L, H, 0.25, wmat, g, 0, H / 2, s * W / 2);
      // 박공 벽 (동 · 서)
      const gs = new THREE.Shape(); gs.moveTo(-W / 2, 0); gs.lineTo(W / 2, 0); gs.lineTo(W / 2, H); gs.lineTo(0, H + R); gs.lineTo(-W / 2, H); gs.lineTo(-W / 2, 0);
      const gt = wallTex.clone(); gt.needsUpdate = true; gt.repeat.set(1 / 2, 1 / 2.2); keep(gt);
      const gmat = std({ map: gt, roughness: 0.6, metalness: 0.05 });
      const gGeo = keep(new THREE.ExtrudeGeometry(gs, { depth: 0.25, bevelEnabled: false }));
      for (const s of [-1, 1]) { const m = mesh(gGeo, gmat, g, s * L / 2 - 0.125, 0, 0); m.rotation.y = Math.PI / 2; }
      // 띠 · 창 · 셔터
      box(L + 0.02, 0.35, 0.3, M.wallBand, g, 0, H - 0.25, W / 2);
      const nWin = Math.floor(L / 3.2);
      for (let i = 0; i < nWin; i++) { const x = -L / 2 + 1.8 + i * (L - 3.6) / (nWin - 1); if (Math.abs(x - L * 0.18) < 2.6 || Math.abs(x + L * 0.25) < 2.4) continue; box(1.9, 1.0, 0.08, M.glass, g, x, H - 1.6, W / 2 + 0.13); box(1.9, 0.06, 0.12, M.alu, g, x, H - 2.12, W / 2 + 0.14); }
      for (const [dx, dw] of [[L * 0.18, 4.4], [-L * 0.25, 4]]) { box(dw, 4.6, 0.12, M.shutter, g, dx, 2.3, W / 2 + 0.15).material = M.shutter; box(dw + 0.3, 0.45, 0.4, M.cabinet, g, dx, 4.75, W / 2 + 0.25); }
      box(1, 2.1, 0.1, M.cabinetDark, g, L * 0.38, 1.05, W / 2 + 0.15);
      // 기초 띠
      box(L + 0.3, 0.35, W + 0.3, M.concrete, g, 0, 0.17, 0, false);
      // 지붕
      const slope = Math.hypot(W / 2 + ov, R + ov * R / (W / 2)), ang = Math.atan2(R, W / 2);
      const roofS = group(g, 0, H + R + 0.12, 0); roofS.rotation.x = ang;
      const roofN = group(g, 0, H + R + 0.12, 0); roofN.rotation.order = "YXZ"; roofN.rotation.set(ang, Math.PI, 0);
      const rt = 0.12;
      const roofMatFor = (k) => (k === "old" ? M.roofOld : k === "grey" ? M.roofGrey : M.roofNew);
      const roofPiece = (grp, x0, x1, kind) => {
        const len = x1 - x0, mat = roofMatFor(kind).clone(); keep(mat);
        if (mat.normalMap) { mat.normalMap = ribNormal.clone(); mat.normalMap.needsUpdate = true; keep(mat.normalMap); mat.normalMap.repeat.set(len / 1.0, 1); }
        if (mat.map) { mat.map = mat.map.clone(); mat.map.needsUpdate = true; keep(mat.map); mat.map.repeat.set(len / 6, slope / 6); }
        box(len, rt, slope, mat, grp, (x0 + x1) / 2, 0, slope / 2);
      };
      const split = o.roofSplit == null ? null : o.roofSplit; // 0~1: 왼쪽부터 새 지붕 비율
      for (const grp of [roofS, roofN]) {
        if (split == null) roofPiece(grp, -L / 2 - ov, L / 2 + ov, o.roofKind || "new");
        else { const xs = -L / 2 - ov + (L + 2 * ov) * split; if (split > 0) roofPiece(grp, -L / 2 - ov, xs, "new"); if (split < 1) roofPiece(grp, xs, L / 2 + ov, "old"); }
      }
      // 용마루 · 처마 홈통
      const ridge = box(L + 2 * ov, 0.16, 0.7, M.cabinet, g, 0, H + R + 0.2, 0); ridge.rotation.x = 0;
      for (const s of [-1, 1]) { const gut = box(L + 2 * ov, 0.22, 0.22, M.cabinet, g, 0, H - ov * R / (W / 2) + 0.02, s * (W / 2 + ov - 0.05)); gut.castShadow = false; }
      for (const s of [-1, 1]) for (const x of [-L / 2 + 0.4, L / 2 - 0.4]) cyl(0.07, 0.07, H - 0.3, M.cabinet, g, x, (H - 0.3) / 2, s * (W / 2 + 0.25), 10);
      // 벤추레이터
      if (o.vents !== false) for (let i = 0; i < 4; i++) { const v = group(g, -L / 2 + 5 + i * (L - 10) / 3, H + R + 0.25, 0); cyl(0.28, 0.32, 0.5, M.alu, v, 0, 0.25, 0, 16); sph(0.32, M.alu, v, 0, 0.55, 0).scale.y = 0.6; }

      // 태양광: 남쪽 지붕(+북쪽은 o.both)
      const placeArray = (grp, frac, rails) => {
        const cols = Math.floor((L - 1.6) / (MOD.w + 0.02)), rows = Math.floor((slope - 1.4) / (MOD.l + 0.03));
        const x0 = -((cols - 1) * (MOD.w + 0.02)) / 2, z0 = 0.9 + MOD.l / 2;
        const list = []; const total = cols * rows, n = Math.round(total * frac);
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const idx = r * cols + c; if ((c * rows + r) < n || frac >= 1) list.push([x0 + c * (MOD.w + 0.02), rt / 2 + 0.16, z0 + r * (MOD.l + 0.03)]); }
        if (rails) for (let r = 0; r < rows; r++) for (const k of [-0.32, 0.32]) {
          const len = cols * (MOD.w + 0.02) * Math.min(1, rails);
          box(len, 0.05, 0.05, M.aluDark, grp, x0 - MOD.w / 2 + len / 2, rt / 2 + 0.11, z0 + r * (MOD.l + 0.03) + k * MOD.l);
          for (let x = 0; x < len; x += 1.6) box(0.06, 0.08, 0.1, M.steel, grp, x0 - MOD.w / 2 + x + 0.3, rt / 2 + 0.06, z0 + r * (MOD.l + 0.03) + k * MOD.l);
        }
        const used = list.slice(0, frac >= 1 ? list.length : n); moduleCount += used.length;
        moduleArray(grp, used);
        return { cols, rows, x0, z0 };
      };
      let arr = null;
      if (o.modules != null || o.rails) {
        arr = placeArray(roofS, o.modules || 0, o.rails);
        if (o.both) placeArray(roofN, o.modules || 0, o.rails);
      }
      // 안전시설: 노란 안전난간 + 고정 사다리 (동쪽 박공)
      if (o.safety) {
        const eaveY = H - ov * R / (W / 2) + 0.05, ez = W / 2 + ov - 0.15;
        for (let x = -L / 2 - ov + 0.2; x <= L / 2 + ov; x += 1.8) box(0.05, 1.05, 0.05, M.yellow, g, x, eaveY + 0.52, ez);
        box(L + 2 * ov, 0.05, 0.05, M.yellow, g, 0, eaveY + 1.05, ez); box(L + 2 * ov, 0.04, 0.04, M.yellow, g, 0, eaveY + 0.55, ez);
        const lx = L / 2 + 0.45, lz = W / 2 - 2.5; const lad = group(g, lx, 0, lz);
        for (const s of [-0.25, 0.25]) box(0.06, H + 1.1, 0.06, M.yellow, lad, 0, (H + 1.1) / 2, s);
        for (let y = 0.4; y < H + 1; y += 0.32) box(0.04, 0.04, 0.5, M.steel, lad, 0, y, 0);
        for (let y = 2.4; y < H + 0.8; y += 0.9) { const hoop = mesh(G("hoop", () => new THREE.TorusGeometry(0.36, 0.022, 6, 24, Math.PI)), M.yellow, lad, 0.05, y, 0); hoop.rotation.set(Math.PI / 2, 0, Math.PI / 2); }
      }
      // 전기: 인버터 · 접속반 · 케이블 트레이 (동쪽 박공 벽)
      const eq = {};
      if (o.electrical) {
        const ex = L / 2 + 0.2;
        const invs = group(g, ex, 0, -1.2);
        for (let i = 0; i < 3; i++) { const iv = inverterUnit(invs, 0.08, 1.65, -2 + i * 1.25, 1.0); iv.rotation.y = Math.PI / 2; }
        rbox(0.25, 0.8, 0.6, 0.04, M.cabinet, invs, 0.13, 3.1, 1.6);
        // 트레이: 처마에서 벽을 타고 인버터 위까지
        box(0.22, H - 3.1, 0.3, M.steel, invs, 0.2, 3.25 + (H - 3.1) / 2 - 0.2, 0.9);
        box(0.22, 0.2, 3.6, M.steel, invs, 0.2, 3.35, -0.85);
        tube([[0.2, H + 0.4, 0.9], [0.4, H + 0.6, 0.9], [0.6, H + 0.9, 0.3], [0.2, H + 1.0, -1]], 0.05, M.cableBlack, invs, 24);
        eq.inverter = new THREE.Vector3(L / 2 + 0.6, 1.8, -1.2);
        // 수배전반 (외부 큐비클) + 역전력계전기
        const sw = group(g, L / 2 + 3.2, 0, W / 2 - 3);
        switchboard(sw, 3, 0.9); sw.rotation.y = 0;
        eq.board = new THREE.Vector3(L / 2 + 3.2, 1.4, W / 2 - 3);
      }
      if (o.monitor) {
        const mo = group(g, L / 2 + 0.2, 0, -5.6); const scr = rbox(0.08, 0.75, 1.15, 0.03, M.black, mo, 0.06, 1.7, 0); scr.rotation.y = 0;
        const sc = mesh(G("scrn", () => new THREE.PlaneGeometry(1.06, 0.66)), screenMat(), mo, 0.11, 1.7, 0); sc.rotation.y = Math.PI / 2;
      }
      g.userData = { L, W, H, R, roofS, arr, eq, slope, ang };
      if (arr) g.userData.moduleCenter = new THREE.Vector3(0, H + R * 0.4 + 0.5, W / 4 + 0.6);
      return g;
    }

    function inverterUnit(parent, x, y, z, s = 1) {
      const g = group(parent, x, y, z); g.scale.setScalar(s);
      rbox(0.7, 0.95, 0.28, 0.06, M.white, g, 0, 0, 0);
      rbox(0.6, 0.62, 0.04, 0.04, M.offWhite, g, 0, 0.08, 0.15);
      box(0.24, 0.1, 0.02, M.screen, g, -0.12, 0.27, 0.172);
      for (const [k, mm] of [[0, M.greenLed], [1, M.greenLed], [2, M.amberLed]]) sph(0.012, mm, g, 0.12 + k * 0.045, 0.27, 0.17);
      for (let i = -3; i <= 3; i++) box(0.012, 0.8, 0.06, M.alu, g, i * 0.09, -0.02, -0.17);
      for (let i = 0; i < 6; i++) cyl(0.022, 0.022, 0.05, M.black, g, -0.22 + i * 0.088, -0.5, 0.02, 10);
      box(0.6, 0.03, 0.03, M.steel, g, 0, 0.5, -0.14);
      return g;
    }
    function screenMat() {
      const t = canvasTex(512, 320, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0f1d3a"); gr.addColorStop(1, "#0a142a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = "#1c2c50"; g.fillRect(16, 16, w - 32, 34); g.fillStyle = "#9fb4dc"; g.font = "bold 18px sans-serif"; g.fillText("PV MONITORING", 28, 40);
        g.fillStyle = "#34e07a"; g.beginPath(); g.arc(w - 36, 33, 7, 0, 7); g.fill();
        const kp = [["kW", "98.4"], ["kWh", "412"], ["PR", "84%"]];
        kp.forEach(([k, v], i) => { const x = 16 + i * ((w - 32) / 3); g.fillStyle = "#14244a"; g.fillRect(x + 4, 62, (w - 32) / 3 - 8, 70); g.fillStyle = "#7f93bd"; g.font = "15px sans-serif"; g.fillText(k, x + 16, 86); g.fillStyle = "#ffffff"; g.font = "bold 32px sans-serif"; g.fillText(v, x + 16, 122); });
        g.strokeStyle = "#f5b23c"; g.lineWidth = 4; g.beginPath();
        for (let i = 0; i <= 40; i++) { const x = 24 + i * (w - 48) / 40, y = h - 30 - Math.max(0, Math.sin((i / 40) * Math.PI)) * 120 * (0.85 + 0.15 * Math.sin(i * 1.7)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke(); g.lineTo(w - 24, h - 30); g.lineTo(24, h - 30); g.fillStyle = "rgba(245,178,60,.18)"; g.fill();
        g.fillStyle = "#3b6fe0"; for (let i = 0; i < 12; i++) { const bh = 20 + 60 * Math.abs(Math.sin(i * 0.8)); g.globalAlpha = 0.35; g.fillRect(28 + i * 38, h - 30 - bh, 22, bh); } g.globalAlpha = 1;
      });
      return std({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.9, roughness: 0.2 });
    }
    function switchboard(parent, bays = 3, s = 1) {
      const g = group(parent, 0, 0, 0); g.scale.setScalar(s);
      const W = bays * 0.9;
      box(W + 0.2, 0.12, 1.1, M.concrete, g, 0, 0.06, 0, false);
      rbox(W, 2.3, 1, 0.05, M.cabinet, g, 0, 1.27, 0);
      box(W + 0.12, 0.08, 1.12, M.cabinetDark, g, 0, 2.45, 0);
      for (let i = 0; i < bays; i++) {
        const x = -W / 2 + 0.45 + i * 0.9;
        box(0.82, 2.15, 0.02, M.offWhite, g, x, 1.27, 0.51);
        for (let k = 0; k < 6; k++) box(0.4, 0.025, 0.02, M.cabinetDark, g, x, 0.35 + k * 0.06, 0.525);
        box(0.025, 0.18, 0.04, M.black, g, x + 0.33, 1.2, 0.53);
        box(0.3, 0.08, 0.01, M.wallBand, g, x, 2.15, 0.525);
        if (i === bays - 1) { // 역전력계전기 · 계기
          rbox(0.26, 0.2, 0.06, 0.02, M.black, g, x, 1.6, 0.54); box(0.16, 0.06, 0.01, std({ color: 0x173a2a, emissive: 0x3cff9a, emissiveIntensity: 0.6 }), g, x, 1.62, 0.575);
          sph(0.012, M.redLed, g, x - 0.08, 1.54, 0.57); sph(0.012, M.greenLed, g, x - 0.04, 1.54, 0.57);
        } else { const mtr = cyl(0.08, 0.08, 0.04, M.white, g, x - 0.15, 1.65, 0.54, 20); mtr.rotation.x = Math.PI / 2; const m2 = cyl(0.08, 0.08, 0.04, M.white, g, x + 0.12, 1.65, 0.54, 20); m2.rotation.x = Math.PI / 2; }
        // 측면 루버
      }
      for (let k = 0; k < 5; k++) box(0.02, 0.03, 0.6, M.cabinetDark, g, W / 2 + 0.005, 0.6 + k * 0.08, 0);
      return g;
    }
    function pole(parent, x, z, o = {}) {
      const g = group(parent, x, 0, z);
      cyl(0.13, 0.2, 12, M.concrete, g, 0, 6, 0, 18);
      for (const y of [11.2, 10.4]) { box(2.4, 0.12, 0.12, M.steel, g, 0, y, 0); for (const k of [-1, 0, 1]) { const ins = group(g, k * 1.0, y + 0.12, 0); cyl(0.05, 0.07, 0.2, M.porcelain, ins, 0, 0.1, 0, 12); for (let d = 0; d < 3; d++) cyl(0.09, 0.09, 0.02, M.porcelain, ins, 0, 0.04 + d * 0.06, 0, 14); } }
      if (o.trans !== false) { const tr = group(g, 0, 7.6, 0.45); cyl(0.36, 0.36, 1.1, M.polyGrey, tr, 0, 0, 0, 24); cyl(0.38, 0.38, 0.06, M.polyGrey, tr, 0, 0.56, 0, 24); for (let i = 0; i < 3; i++) cyl(0.04, 0.05, 0.25, M.porcelain, tr, -0.18 + i * 0.18, 0.7, 0, 10); for (let i = 0; i < 12; i++) { const f = box(0.02, 0.8, 0.12, M.polyGrey, tr, Math.cos(i / 12 * Math.PI * 2) * 0.38, 0, Math.sin(i / 12 * Math.PI * 2) * 0.38); f.rotation.y = -i / 12 * Math.PI * 2; } box(0.5, 0.08, 0.6, M.steel, g, 0, 7, 0.35); }
      g.userData.top = (k, y = 11.32) => new THREE.Vector3(x + k * 1.0, y, z);
      return g;
    }
    // 둥근 섬 모양 지형 (디오라마)
    function island(parent, w, d, o = {}) {
      const g = group(parent, 0, 0, 0);
      const r = Math.min(w, d) * 0.12, th = o.th || 1.2;
      const geo = keep(new THREE.ExtrudeGeometry(rrShape(w, d, r), { depth: th, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 3, curveSegments: 16 }));
      geo.rotateX(Math.PI / 2); geo.translate(0, 0, 0);
      const base = mesh(geo, [M.grass, M.soil], g, 0, -0.17, 0); base.castShadow = true;
      if (o.yard) { const yg = keep(new THREE.ShapeGeometry(rrShape(o.yard[0], o.yard[1], 0.6), 8)); yg.rotateX(-Math.PI / 2); const y = mesh(yg, M.asphalt, g, o.yard[2] || 0, 0.035, o.yard[3] || 0, false); y.receiveShadow = true;
        if (o.lines) for (let i = 0; i < o.lines; i++) box(0.12, 0.01, 2.4, M.line, g, (o.yard[2] || 0) - o.yard[0] / 2 + 3 + i * 2.8, 0.045, (o.yard[3] || 0) + o.yard[1] / 2 - 1.8, false);
      }
      return g;
    }
    // 바닥 그림자 받이 (투명 배경)
    function catcher(parent, size, y = 0, op = 0.28) {
      const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(size, size)), keep(new THREE.ShadowMaterial({ opacity: op }))); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; parent.add(m); return m;
    }
    // 골강판 지붕 조각 (근접 장면용)
    function roofSlab(parent, w, d, tilt, kind = "grey") {
      const g = group(parent, 0, 0, 0); g.rotation.x = tilt;
      const mat = (kind === "old" ? M.roofOld : kind === "new" ? M.roofNew : M.roofGrey).clone(); keep(mat);
      mat.normalMap = ribNormal.clone(); mat.normalMap.needsUpdate = true; mat.normalMap.repeat.set(w / 1.0, 1); keep(mat.normalMap);
      box(w, 0.1, d, mat, g, 0, 0, 0);
      return g;
    }
    function docTex(title, stamp) {
      return canvasTex(768, 1086, (g, w, h) => {
        g.fillStyle = "#fbfbf8"; g.fillRect(0, 0, w, h);
        const F = (wt, px) => `${wt} ${px}px Pretendard, "Noto Sans KR", sans-serif`;
        g.fillStyle = "#0f1b33"; g.fillRect(0, 0, w, 14);
        g.fillStyle = "#7a849a"; g.font = F(600, 22); g.fillText("YUHOST SOLAR · 2026", 64, 86);
        g.fillStyle = "#0f1b33"; g.font = F(800, 50); g.fillText(title || "사업 서류", 64, 160);
        g.fillStyle = "#e7eefc"; g.fillRect(64, 196, w - 128, 4);
        for (let i = 0; i < 4; i++) { g.fillStyle = "#eef1f6"; g.fillRect(64, 240 + i * 66, 170, 46); g.fillStyle = "#c9d2df"; g.fillRect(250, 258 + i * 66, w - 320 - (i % 2) * 120, 12); }
        for (let i = 0; i < 9; i++) { g.fillStyle = "#d9dfe8"; g.fillRect(64, 540 + i * 34, w - 128 - ((i * 37) % 140), 10); }
        g.strokeStyle = "#c9d2df"; g.lineWidth = 2; g.strokeRect(64, 870, w - 128, 120);
        if (stamp) { g.save(); g.translate(w - 170, 930); g.rotate(-0.22); g.strokeStyle = "#d8332a"; g.lineWidth = 7; g.beginPath(); g.arc(0, 0, 70, 0, 7); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 58, 0, 7); g.stroke(); g.fillStyle = "#d8332a"; g.font = F(900, 40); g.textAlign = "center"; g.fillText(stamp, 0, 14); g.restore(); }
      });
    }

    /* ------------------------------------------------------------------
       장면 구성
       ------------------------------------------------------------------ */
    const scene = new THREE.Scene();
    const root = group(scene);
    const hotspots = [];
    let shadowSize = 40, view = { az: 32, el: 28, fov: 30, margin: 1.06 };
    const S = opt.shot || "hero";

    function factorySite(step, extra = {}) {
      WS = 1.7;
      const isl = island(root, 66, 46, { yard: [30, 13, 6, 15], lines: 7 });
      const st = step == null ? 99 : step;
      const f = factory(root, {
        z: -4, roofSplit: st === 0 ? 0.55 : null, roofKind: st < 0 ? "old" : "new",
        safety: st >= 1, rails: st >= 2 ? (st === 2 ? 0.7 : 1) : 0, modules: st >= 3 ? (st === 3 ? 0.55 : 1) : (st >= 2 ? 0 : null),
        electrical: st >= 4, monitor: st >= 5, both: extra.both,
      });
      if (st >= 2 || st < 0) {} // no-op
      const P = pole(root, 26, 8, {});
      if (st >= 4) {
        // 인입선: 전주 → 수배전반
        const L = f.userData.L, W = f.userData.W;
        const bx = L / 2 + 3.2, bz = -4 + W / 2 - 3;
        wire([26 + 1, 11.32, 8], [bx + 0.2, 2.6, bz], 1.2, 0.03, M.cableBlack, root);
        wire([26 - 1, 11.32, 8], [bx - 0.2, 2.6, bz], 1.2, 0.03, M.cableBlack, root);
      }
      [[-29, -16, 1.1, 1], [-30, -6, 1.0, 0], [-27, 14, 1.2, 0], [-22, 18, 0.9, 1], [29, -16, 1.2, 1], [30, -6, 1, 0], [-12, 19, 0.8, 0], [24, 19, 1, 1]].forEach(([x, z, s, k]) => tree(root, x, z, s, k));
      car(root, -1, 15, 0, 0xf2f4f7); car(root, 2.0, 15.2, 0, 0x2b3a55); car(root, 8, 15, 0, 0xc8102e);
      // 공정별 소품
      const fu = f.userData, eaveY = fu.H - 0.5 * fu.R / (fu.W / 2);
      if (st === 0) { // 지붕 보강: 강판 묶음 · 작업자
        const sl = fu.roofS; for (let i = 0; i < 3; i++) box(6, 0.18, 1.0, M.roofNew, sl, 2 + i * 0.3, 0.2 + i * 0.18, 3.5);
        worker(sl, -2, 4, { y: 0.06, ry: 0.4 }); worker(sl, 4.5, 6.5, { y: 0.06, ry: -0.8, kneel: true }); worker(sl, 8, 3, { y: 0.06, ry: 2.6 });
        crane(root, 2, 9, 0.2);
      }
      if (st === 1) { worker(fu.roofS, -10, 6.5, { y: 0.06, ry: 0.3 }); worker(root, 19.2, -1, { ry: -1.2 }); }
      if (st === 2) { crane(root, -6, 9.5, -0.15, true); worker(fu.roofS, 6, 3, { y: 0.06, ry: 0.4, kneel: true }); worker(fu.roofS, 9, 5, { y: 0.06, ry: -0.6 }); worker(fu.roofS, -3, 7, { y: 0.06, ry: 2.4 }); }
      if (st === 3) { const sl = fu.roofS; const p = group(sl, 9, 0.12, 4.5); for (let i = 0; i < 6; i++) module(p, 0, 0.1 + i * 0.045, 0); box(1.2, 0.12, 2.5, M.wood, p, 0, 0.0, 0); worker(sl, 6.5, 3.2, { y: 0.06, ry: 0.5, armR: -1.3, armL: -1.3 }); worker(sl, 7.8, 6.5, { y: 0.06, ry: -0.4, kneel: true }); crane(root, 6, 9.5, 0.05, true, true); }
      if (st === 4) { worker(root, 19.4, -2.8, { ry: -1.57, armR: -1.2 }); worker(root, 21.5, 4.5, { ry: -0.6 }); }
      if (st === 5) { worker(root, 19.5, -6, { ry: -1.57, armR: -1.1, armL: -0.9, vest: M.orange }); }
      if (/^step/.test(S)) { focus = new THREE.Box3().setFromObject(f); root.children.forEach((c) => { if (c.userData.crane) focus.union(new THREE.Box3().setFromObject(c)); }); focus.expandByVector(new THREE.Vector3(3, 0, 3)); }
      if (st === 6) { worker(root, 22, 5.5, { ry: -0.9, vest: std({ color: 0x3266ff, roughness: 0.6 }), armR: -0.9 }); worker(root, 23.5, 6.2, { ry: -1.8 }); }
      // 핫스팟
      if (f.userData.moduleCenter) hotspots.push({ key: "module", pos: f.userData.moduleCenter.clone().add(new THREE.Vector3(0, 0, -4)) });
      if (fu.eq.inverter) hotspots.push({ key: "inverter", pos: fu.eq.inverter.clone().add(new THREE.Vector3(0, 0, -4)) });
      if (fu.eq.board) hotspots.push({ key: "board", pos: fu.eq.board.clone().add(new THREE.Vector3(0, 1.2, -4)) });
      hotspots.push({ key: "grid", pos: new THREE.Vector3(26, 9, 8) });
      hotspots.push({ key: "factory", pos: new THREE.Vector3(-10, 3, 6.2) });
      return f;
    }
    function crane(parent, x, z, ry, lifting, mods) {
      const g = group(parent, x, 0, z); g.rotation.y = ry; g.userData.crane = true;
      const body = phys({ color: 0xf5a524, roughness: 0.35, metalness: 0.3, clearcoat: 0.6 });
      rbox(7.5, 1.0, 2.3, 0.15, body, g, 0, 1.2, 0); rbox(1.9, 1.9, 2.3, 0.3, body, g, 3.2, 2.2, 0); box(0.05, 0.8, 1.9, M.glass, g, 4.16, 2.5, 0);
      for (const sx of [-2.6, -1.4, 2.8]) for (const sz of [-1.05, 1.05]) { const w = cyl(0.5, 0.5, 0.4, M.rubber, g, sx, 0.5, sz, 20); w.rotation.x = Math.PI / 2; }
      const boom = group(g, -1.5, 1.9, 0); boom.rotation.z = -0.95; boom.rotation.y = 0.6;
      cyl(0.6, 0.6, 0.7, body, g, -1.5, 1.95, 0, 20);
      const arm = box(0.5, 13, 0.5, body, boom, 0, 6.5, 0); arm.rotation.z = 0;
      box(0.38, 9, 0.38, M.steel, boom, 0, 13 + 3, 0);
      if (lifting) {
        const tip = new THREE.Vector3(0, 19.5, 0); boom.updateMatrixWorld(true);
        const hook = group(boom, 0, 19.5, 0); hook.rotation.z = 0.95;
        const line = cyl(0.02, 0.02, 4, M.black, hook, 0, -2, 0, 6);
        const pal = group(hook, 0, -4.3, 0);
        if (mods) for (let i = 0; i < 5; i++) module(pal, 0, 0.1 + i * 0.045, 0); else for (let i = 0; i < 6; i++) box(4, 0.06, 0.06, M.aluDark, pal, 0, 0.1 + (i % 3) * 0.07, -0.3 + Math.floor(i / 3) * 0.6);
        box(1.3, 0.12, 2.5, M.wood, pal, 0, 0, 0);
      }
      return g;
    }

    function studio(size) { catcher(scene, size * 3, 0, 0.3); }

    switch (S) {
      case "hero": case "site": {
        factorySite(99, { both: false });
        view = { az: 28, el: 26, fov: 28, margin: 1.0 }; shadowSize = 60;
        break;
      }
      case "survey": { factorySite(-1); view = { az: 30, el: 30, fov: 28, margin: 1.0 }; shadowSize = 60; worker(root, 12, 9, { ry: 0.2, armR: -1.2 }); worker(root, 13, 9.4, { ry: -0.6 }); break; }
      case "step0": case "step1": case "step2": case "step3": case "step4": case "step5": case "step6": {
        const k = +S.slice(4); factorySite(k);
        view = { az: 30, el: 30, fov: 28, margin: 1.0 }; shadowSize = 60;
        break;
      }
      case "module": {
        const sl = roofSlab(root, 6.4, 5.6, -0.18, "grey"); sl.position.y = 0.6;
        for (let c = 0; c < 4; c++) for (let r = 0; r < 2; r++) { if (c === 3 && r === 0) continue; module(sl, -1.73 + c * 1.15, 0.22, -1.2 + r * 2.42); }
        for (const k of [-0.75, 0.75]) for (const r of [0, 1]) box(5.0, 0.05, 0.05, M.aluDark, sl, 0, 0.16, -1.2 + r * 2.42 + k);
        for (let i = 0; i < 4; i++) box(0.06, 0.07, 0.1, M.steel, sl, -2 + i * 1.3, 0.1, -1.95);
        // 올리는 중인 모듈
        const up = module(sl, 1.72, 0.75, -1.25); up.rotation.set(0.25, 0, -0.18);
        studio(14); view = { az: 32, el: 34, fov: 26, margin: 1.06 }; shadowSize = 10; break;
      }
      case "inverter": {
        const wall = box(4.2, 3.2, 0.2, M.wall, root, 0, 1.6, -0.1); wall.material = M.wall;
        box(4.4, 0.12, 0.9, M.concrete, root, 0, 0.06, 0.25, false);
        for (let i = 0; i < 3; i++) inverterUnit(root, -1.3 + i * 1.3, 1.55, 0.2, 1.15);
        box(3.8, 0.12, 0.16, M.steel, root, 0, 2.55, 0.08);
        for (let i = 0; i < 3; i++) { cyl(0.04, 0.04, 0.95, M.cabinetDark, root, -1.3 + i * 1.3, 2.1, 0.12, 10); tube([[-1.3 + i * 1.3 - 0.2, 0.98, 0.24], [-1.3 + i * 1.3 - 0.2, 0.5, 0.28], [-1.3 + i * 1.3 + 0.1, 0.2, 0.4], [1.9, 0.18, 0.45]], 0.035, M.cableBlack, root, 24); }
        studio(10); view = { az: 24, el: 14, fov: 26, margin: 1.08 }; shadowSize = 8; break;
      }
      case "board": { const sb = switchboard(root, 3, 1); sb.rotation.y = 0; studio(10); view = { az: 30, el: 14, fov: 26, margin: 1.1 }; shadowSize = 8; break; }
      case "rpr": {
        const g = group(root, 0, 0, 0);
        rbox(1.6, 1.9, 0.12, 0.04, M.cabinet, g, 0, 1.1, 0);
        const dev = group(g, 0, 1.35, 0.08);
        rbox(0.62, 0.52, 0.16, 0.04, M.black, dev, 0, 0, 0.06);
        const lcd = canvasTex(256, 96, (c, w, h) => { c.fillStyle = "#103a28"; c.fillRect(0, 0, w, h); c.fillStyle = "#6dffb4"; c.font = "bold 42px monospace"; c.fillText("RPR 179W", 14, 58); c.font = "18px monospace"; c.fillText("NORMAL", 16, 86); });
        const sc = mesh(G("lcdp", () => new THREE.PlaneGeometry(0.4, 0.15)), std({ map: lcd, emissive: 0xffffff, emissiveMap: lcd, emissiveIntensity: 0.8 }), dev, 0, 0.1, 0.145);
        for (let i = 0; i < 4; i++) { const b = cyl(0.025, 0.025, 0.03, M.cabinetDark, dev, -0.18 + i * 0.12, -0.12, 0.15, 14); b.rotation.x = Math.PI / 2; }
        sph(0.015, M.greenLed, dev, -0.24, 0.21, 0.14); sph(0.015, M.redLed, dev, -0.19, 0.21, 0.14);
        for (const [x, y] of [[-0.45, 0.55], [0.45, 0.55]]) { const m = cyl(0.13, 0.13, 0.05, M.white, g, x, 1.35 + y - 0.55 + 0.4, 0.08, 24); m.rotation.x = Math.PI / 2; const n = box(0.01, 0.1, 0.01, M.red, g, x, 1.35 + y - 0.55 + 0.42, 0.11); n.rotation.z = 0.6; }
        const sw = group(g, 0, 0.6, 0.1); rbox(0.5, 0.26, 0.1, 0.03, M.black, sw, 0, 0, 0); box(0.08, 0.18, 0.08, M.red, sw, 0, 0.02, 0.08);
        studio(8); view = { az: 18, el: 10, fov: 24, margin: 1.12 }; shadowSize = 5; break;
      }
      case "grid": {
        island(root, 9, 7, { th: 0.8 });
        pole(root, 0, 0, {});
        wire([-1, 11.32, 0], [-6, 11.0, -3], 0.4, 0.025, M.cableBlack, root); wire([1, 11.32, 0], [6, 11.2, -3], 0.4, 0.025, M.cableBlack, root); wire([0, 11.32, 0], [0, 11.1, -5], 0.3, 0.025, M.cableBlack, root);
        wire([0.3, 7.2, 0.6], [3.4, 2.2, 3.0], 0.6, 0.025, M.cableBlack, root);
        const sb = group(root, 3.2, 0, 2.6); switchboard(sb, 1, 0.8); sb.rotation.y = -0.6;
        tree(root, -3, 2, 0.8, 1);
        view = { az: 28, el: 14, fov: 26, margin: 1.06 }; shadowSize = 16; break;
      }
      case "structure": {
        const sl = roofSlab(root, 6.4, 5.6, -0.18, "new"); sl.position.y = 0.6;
        for (const k of [-0.75, 0.75]) for (const r of [0, 1]) box(4.8, 0.05, 0.05, M.aluDark, sl, 0, 0.16, -1.2 + r * 2.42 + k);
        for (const r of [0, 1]) for (const k of [-0.75, 0.75]) for (let i = 0; i < 4; i++) { const x = -2.0 + i * 1.33; box(0.08, 0.1, 0.12, M.steel, sl, x, 0.1, -1.2 + r * 2.42 + k); cyl(0.02, 0.02, 0.04, M.black, sl, x, 0.17, -1.2 + r * 2.42 + k, 8); }
        module(sl, -1.73, 0.22, 1.22); module(sl, -0.58, 0.22, 1.22);
        worker(sl, 1.2, 0.0, { y: 0.06, ry: -2.6, kneel: true, armR: -1.2 });
        const bag = group(sl, 2.4, 0.06, 1.6); for (let i = 0; i < 4; i++) box(2.4, 0.05, 0.05, M.aluDark, bag, 0, 0.05 + i * 0.05, -0.1 + (i % 2) * 0.1);
        studio(14); view = { az: 30, el: 32, fov: 26, margin: 1.06 }; shadowSize = 10; break;
      }
      case "combiner": {
        box(2.6, 2.6, 0.2, M.wall, root, 0, 1.3, -0.1);
        const cb = group(root, 0, 1.5, 0.1); rbox(0.9, 1.1, 0.3, 0.05, M.cabinet, cb, 0, 0, 0.1);
        box(0.8, 1.0, 0.02, M.offWhite, cb, 0, 0, 0.26); box(0.03, 0.2, 0.04, M.black, cb, 0.33, 0, 0.28);
        const tri = canvasTex(64, 64, (g) => { g.fillStyle = "#f5b301"; g.beginPath(); g.moveTo(32, 4); g.lineTo(60, 58); g.lineTo(4, 58); g.fill(); g.fillStyle = "#111"; g.font = "bold 36px sans-serif"; g.fillText("⚡", 16, 52); });
        const lab = mesh(G("tri", () => new THREE.PlaneGeometry(0.16, 0.16)), std({ map: tri, transparent: true }), cb, 0, 0.3, 0.275); lab.castShadow = false;
        for (let i = 0; i < 6; i++) { cyl(0.025, 0.025, 0.06, M.black, cb, -0.3 + i * 0.12, -0.58, 0.1, 10); tube([[-0.3 + i * 0.12, -0.6, 0.1], [-0.3 + i * 0.12, -1.0, 0.14], [-0.3 + i * 0.12 + 0.1, -1.4, 0.3]], 0.02, i % 2 ? M.cableRed : M.cableBlack, cb, 16); }
        studio(8); view = { az: 24, el: 12, fov: 24, margin: 1.12 }; shadowSize = 5; break;
      }
      case "cable": {
        const sl = roofSlab(root, 7, 4, -0.12, "grey"); sl.position.y = 0.4;
        const tray = group(sl, 0, 0.1, 0.4);
        box(6.4, 0.03, 0.3, M.steel, tray, 0, 0.0, 0); for (const s of [-1, 1]) box(6.4, 0.1, 0.02, M.steel, tray, 0, 0.05, s * 0.15);
        for (let i = 0; i < 16; i++) box(0.03, 0.06, 0.3, M.alu, tray, -3.1 + i * 0.41, -0.03, 0);
        for (let k = 0; k < 4; k++) tube([[-3.3, 0.04 + (k % 2) * 0.04, -0.08 + k * 0.05], [0, 0.05 + (k % 2) * 0.04, -0.08 + k * 0.05], [3.0, 0.05, -0.08 + k * 0.05], [3.4, 0.25, -0.5 - k * 0.05], [3.3, 0.4, -1.2]], 0.022, k % 2 ? M.cableRed : M.cableBlack, tray, 40);
        for (let c = 0; c < 3; c++) module(sl, -2.3 + c * 1.15, 0.22, -1.1);
        studio(12); view = { az: 34, el: 30, fov: 26, margin: 1.06 }; shadowSize = 9; break;
      }
      case "monitor": {
        const desk = group(root, 0, 0, 0);
        rbox(2.4, 0.06, 1.1, 0.02, M.wood, desk, 0, 0.75, 0); for (const sx of [-1.1, 1.1]) for (const sz of [-0.45, 0.45]) cyl(0.025, 0.025, 0.72, M.cabinetDark, desk, sx, 0.37, sz, 10);
        const mon = group(desk, 0, 0.78, -0.25);
        cyl(0.03, 0.03, 0.32, M.alu, mon, 0, 0.16, 0, 12); rbox(0.3, 0.02, 0.2, 0.01, M.alu, mon, 0, 0.01, 0);
        rbox(1.1, 0.68, 0.04, 0.02, M.black, mon, 0, 0.62, 0.02);
        const sc = mesh(G("scrn2", () => new THREE.PlaneGeometry(1.04, 0.62)), screenMat(), mon, 0, 0.62, 0.042);
        rbox(0.62, 0.02, 0.2, 0.01, M.offWhite, desk, -0.05, 0.79, 0.2); rbox(0.08, 0.025, 0.12, 0.03, M.offWhite, desk, 0.45, 0.79, 0.22);
        const cup = cyl(0.045, 0.04, 0.11, M.white, desk, 0.85, 0.84, 0.1, 18);
        studio(8); view = { az: 20, el: 16, fov: 24, margin: 1.1 }; shadowSize = 5; break;
      }
      case "safety": {
        const H = 3.2;
        box(5, H, 3.2, M.wall, root, 0, H / 2, 0);
        const sl = roofSlab(root, 5.6, 3.6, -0.12, "new"); sl.position.set(0, H + 0.2, 0.1);
        for (let x = -2.6; x <= 2.7; x += 0.9) box(0.05, 1.05, 0.05, M.yellow, root, x, H + 0.3 + 0.52, 1.75);
        box(5.4, 0.05, 0.05, M.yellow, root, 0, H + 0.3 + 1.05, 1.75); box(5.4, 0.04, 0.04, M.yellow, root, 0, H + 0.3 + 0.55, 1.75);
        const lad = group(root, 2.6, 0, 0.6);
        for (const s of [-0.25, 0.25]) box(0.06, H + 1.3, 0.06, M.yellow, lad, 0.1, (H + 1.3) / 2, s);
        for (let y = 0.35; y < H + 1.2; y += 0.3) box(0.04, 0.04, 0.5, M.steel, lad, 0.1, y, 0);
        for (let y = 2.0; y < H + 1.1; y += 0.6) { const hoop = mesh(G("hoop2", () => new THREE.TorusGeometry(0.36, 0.02, 6, 24, Math.PI)), M.yellow, lad, 0.15, y, 0); hoop.rotation.set(Math.PI / 2, 0, Math.PI / 2); }
        worker(root, -0.6, 0.6, { y: H + 0.27, ry: 0.4 });
        studio(12); view = { az: 30, el: 18, fov: 26, margin: 1.08 }; shadowSize = 10; break;
      }
      case "money": {
        const coinTop = canvasTex(256, 256, (g, w) => { g.fillStyle = "#e8b64a"; g.fillRect(0, 0, w, w); g.strokeStyle = "#b8862a"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.stroke(); g.fillStyle = "#a87a22"; g.font = "bold 120px sans-serif"; g.textAlign = "center"; g.fillText("₩", 128, 170); });
        const cMat = [M.gold, std({ map: coinTop, roughness: 0.3, metalness: 1 }), M.gold];
        const coinGeo = G("coin", () => new THREE.CylinderGeometry(0.4, 0.4, 0.09, 40));
        [[-0.9, 3, 0], [0, 6, 0.1], [0.9, 11, -0.1]].forEach(([x, n, z]) => { for (let i = 0; i < n; i++) { const c = mesh(coinGeo, cMat, root, x + Math.sin(i * 2.1) * 0.02, 0.045 + i * 0.092, z + Math.cos(i * 1.7) * 0.02); c.rotation.y = i; } });
        const c2 = mesh(coinGeo, cMat, root, -1.5, 0.35, 0.9); c2.rotation.set(1.1, 0, 0.5);
        const ar = group(root, 2.3, 0, -0.9); ar.rotation.y = -0.35; ar.scale.setScalar(0.62); module(ar, 0, 0.9, 0).rotation.set(0.75, 0, 0); box(0.06, 1.2, 0.06, M.aluDark, ar, 0, 0.6, -0.55);
        [[-0.9, 3], [0, 6], [0.9, 10]].forEach(() => {});
        studio(8); view = { az: 26, el: 18, fov: 24, margin: 1.12 }; shadowSize = 5; break;
      }
      case "office": case "tower": {
        island(root, 14, 12, { th: 0.8, yard: [8, 3, 0, 4.2] });
        const accent = S === "tower" ? phys({ color: 0xd8332a, roughness: 0.3, metalness: 0.3, clearcoat: 0.6 }) : M.wallBand;
        const b = group(root, 0, 0, -1);
        const floors = S === "tower" ? 9 : 7, fh = 1.3;
        box(7, 0.4, 6, M.concrete, b, 0, 0.2, 0);
        for (let i = 0; i < floors; i++) { box(6.6, fh - 0.15, 5.6, M.glassBlue, b, 0, 0.4 + i * fh + (fh - 0.15) / 2, 0); box(6.8, 0.15, 5.8, M.white, b, 0, 0.4 + (i + 1) * fh - 0.07, 0); }
        for (let k = 0; k < 7; k++) box(0.08, floors * fh, 0.08, M.white, b, -3.3 + k * 1.1, 0.4 + floors * fh / 2, 2.82);
        box(7, 0.5, 6, accent, b, 0, 0.4 + floors * fh + 0.25, 0);
        if (S === "tower") { cyl(0.05, 0.08, 3, M.steel, b, 1.8, 0.4 + floors * fh + 2, -1, 10); for (let i = 0; i < 3; i++) { const d = mesh(G("dish", () => new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3)), M.white, b, -1.5 + i, 0.4 + floors * fh + 0.7, -1.6); d.rotation.x = -1.2; } }
        else { const pv = group(b, 0, 0.4 + floors * fh + 0.5, 0); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const m = module(pv, -2.1 + i * 1.4, 0.3, -1.6 + j * 2.6); m.rotation.x = -0.25; } }
        tree(root, -5.2, 3.5, 0.6, 0); tree(root, 5.2, 3.3, 0.7, 1); tree(root, -5.5, -4, 0.6, 1);
        view = { az: 30, el: 18, fov: 26, margin: 1.06 }; shadowSize = 20; break;
      }
      case "bapv": {
        island(root, 13, 9, { th: 0.8, yard: [8, 2.4, 0, 3.3] });
        const b = group(root, 0, 0, -1);
        box(9, 7, 5, M.wall, b, 0, 3.5, 0); box(9.2, 0.4, 5.2, M.wallBand, b, 0, 7.1, 0);
        for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { const m = module(b, -3.5 + c * 1.4, 4.4 + r * 2.0, 2.62); m.rotation.x = Math.PI / 2 - 0.12; }
        for (let c = 0; c < 4; c++) box(1.6, 1.1, 0.08, M.glass, b, -3 + c * 2, 1.7, 2.52);
        box(1.2, 2.2, 0.1, M.cabinetDark, b, 3.4, 1.1, 2.53);
        tree(root, -5.2, 2.6, 0.55, 1); tree(root, 5.3, 2.8, 0.6, 0);
        view = { az: 30, el: 14, fov: 26, margin: 1.08 }; shadowSize = 18; break;
      }
      case "flatroof": {
        island(root, 44, 34, { yard: [40, 9, 0, 11.5], lines: 12 });
        const b = group(root, 0, 0, -3.5);
        const BW = 28, BD = 18, BH = 10.5;
        const wt = wallTex.clone(); wt.needsUpdate = true; wt.repeat.set(1, 3); keep(wt);
        box(BW, BH, BD, std({ map: wt, roughness: 0.6 }), b, 0, BH / 2, 0);
        for (let f = 0; f < 3; f++) { box(BW - 2, 1.3, 0.1, M.glass, b, 0, 1.9 + f * 3.2, BD / 2 + 0.06); box(BW - 1.6, 0.18, 0.3, M.wallBand, b, 0, 1.15 + f * 3.2, BD / 2 + 0.12); box(0.1, 1.3, BD - 2, M.glass, b, BW / 2 + 0.06, 1.9 + f * 3.2, 0); }
        box(4, 2.6, 0.12, M.cabinetDark, b, -BW / 2 + 4, 1.3, BD / 2 + 0.08);
        box(BW - 0.6, 0.12, BD - 0.6, M.concrete, b, 0, BH + 0.06, 0, false);
        for (const [w, d, x, z] of [[BW, 0.3, 0, BD / 2 - 0.15], [BW, 0.3, 0, -BD / 2 + 0.15], [0.3, BD, BW / 2 - 0.15, 0], [0.3, BD, -BW / 2 + 0.15, 0]]) box(w, 0.9, d, M.cabinet, b, x, BH + 0.45, z);
        // 경사 거치대 + 무게 블록 (무타공)
        const tilt = 0.26, rows = 4, list = [];
        for (let r = 0; r < rows; r++) {
          const z = -BD / 2 + 2.6 + r * 3.6;
          for (let c = 0; c < 20; c++) { const x = -BW / 2 + 2.6 + c * 1.16; if (x > BW / 2 - 6.5 && r < 2) continue; list.push([x, BH + 0.62, z, tilt, 0]); }
          for (let x = -BW / 2 + 2.4; x < BW / 2 - 2; x += 2.3) { if (x > BW / 2 - 6.5 && r < 2) continue; box(0.5, 0.18, 0.5, M.concrete, b, x, BH + 0.21, z - 0.95); box(0.5, 0.18, 0.5, M.concrete, b, x, BH + 0.21, z + 0.95); box(0.05, 0.75, 0.05, M.aluDark, b, x, BH + 0.62, z - 0.95); box(0.05, 0.3, 0.05, M.aluDark, b, x, BH + 0.42, z + 0.95); }
        }
        moduleArray(b, list); moduleCount += list.length;
        // 실외기 · 물탱크
        for (let i = 0; i < 3; i++) { const u = group(b, BW / 2 - 4.6 + (i % 2) * 2.2, BH + 0.12, -BD / 2 + 2.4 + Math.floor(i / 2) * 2.4); rbox(1.8, 1.1, 1.2, 0.08, M.white, u, 0, 0.55, 0); const fan = cyl(0.42, 0.42, 0.06, M.black, u, 0, 1.12, 0, 24); }
        cyl(1.1, 1.1, 2.2, M.cabinet, b, BW / 2 - 3.5, BH + 1.2, BD / 2 - 3, 28);
        tree(root, -19, 3, 0.9, 0); tree(root, 18.5, -12, 1, 1); tree(root, -18, -13, 1, 1);
        car(root, -12, 11.5, 0, 0x2b3a55); car(root, -6.4, 11.5, 0, 0xf2f4f7); car(root, 3, 11.5, 0, 0x8a96a8); car(root, 9, 11.5, 0, 0xc8102e);
        hotspots.push({ key: "module", pos: new THREE.Vector3(-4, BH + 1.2, -3.5) });
        view = { az: 30, el: 30, fov: 28, margin: 1.0 }; shadowSize = 36; break;
      }
      case "carport": {
        island(root, 46, 32, { yard: [42, 28, 0, 0] });
        const colors = [0xf2f4f7, 0x2b3a55, 0xc8102e, 0x8a96a8, 0x1b1f27, 0xe7e9ee, 0x3a6ad1, 0xf2f4f7, 0x5d6878];
        let ci = 0; const list = [];
        for (const zc of [-6.5, 6.5]) {
          // 주차선
          for (let i = 0; i <= 14; i++) box(0.12, 0.01, 5, M.line, root, -17.5 + i * 2.5, 0.05, zc + (zc < 0 ? -0.2 : 0.2), false);
          // 캐노피: 기둥 · 보 · 모듈 (남쪽으로 약 7도)
          const cg = group(root, 0, 0, zc);
          for (let x = -15; x <= 15; x += 7.5) { box(0.32, 3.1, 0.32, M.cabinetDark, cg, x, 1.55, -0.6); box(0.6, 0.15, 0.6, M.concrete, cg, x, 0.08, -0.6, false); box(0.22, 0.32, 6.2, M.cabinetDark, cg, x, 3.2, 0.1).rotation.x = 0.12; }
          for (const z of [-2.3, 0, 2.3]) box(32, 0.12, 0.12, M.steel, cg, 0, 3.32 - z * 0.12, z);
          for (let c = 0; c < 27; c++) for (let r = 0; r < 2; r++) list.push([-15.1 + c * 1.16, 3.5 - (r - 0.5) * 2.4 * 0.12, zc + (r - 0.5) * 2.42, 0.12, 0]);
          for (let i = 0; i < 14; i++) { if ((i + (zc > 0 ? 1 : 0)) % 4 === 3) continue; car(root, -16.25 + i * 2.5, zc + (zc < 0 ? -0.3 : 0.3), zc < 0 ? Math.PI / 2 * 0 : Math.PI, colors[ci++ % colors.length]).scale.setScalar(0.92); }
        }
        moduleArray(root, list); moduleCount += list.length;
        // 전기차 충전기
        const ev = group(root, 17.8, 0, -3.2); rbox(0.5, 1.5, 0.3, 0.08, M.white, ev, 0, 0.75, 0); box(0.3, 0.2, 0.02, M.screen, ev, 0, 1.15, 0.16); sph(0.03, M.greenLed, ev, 0, 1.38, 0.15);
        tree(root, -21, 12, 0.8, 1); tree(root, 21, 12, 0.9, 0); tree(root, -21, -12.5, 0.9, 0); tree(root, 21, -12.5, 0.8, 1);
        hotspots.push({ key: "module", pos: new THREE.Vector3(0, 4.2, 6.5) });
        view = { az: 32, el: 30, fov: 28, margin: 1.0 }; shadowSize = 34; break;
      }
      case "ground": {
        island(root, 60, 42);
        const gravel = noiseTex("#b9b3a6", 0.2); gravel.wrapS = gravel.wrapT = THREE.RepeatWrapping; gravel.repeat.set(0.2, 0.2);
        const gm = std({ map: gravel, roughness: 0.95 });
        const rg = keep(new THREE.ShapeGeometry(rrShape(4, 38, 0.5), 4)); rg.rotateX(-Math.PI / 2); mesh(rg, gm, root, 27.5, 0.04, 0, false);
        const list = [], tilt = 0.44;
        for (let r = 0; r < 6; r++) {
          const z = -15 + r * 5.6;
          for (let c = 0; c < 36; c++) for (let k = 0; k < 2; k++) list.push([-21 + c * 1.16, 1.25 + (k - 0.5) * -2.42 * Math.sin(tilt) + 0.0, z + (k - 0.5) * 2.42 * Math.cos(tilt), tilt, 0]);
          for (let x = -21; x <= 20; x += 3.5) { cyl(0.05, 0.05, 1.0, M.steel, root, x, 0.5, z + 2.1, 10); cyl(0.05, 0.05, 2.2, M.steel, root, x, 1.1, z - 2.1, 10); }
        }
        moduleArray(root, list); moduleCount += list.length;
        // 펜스
        const fenceMat = std({ color: 0x3f6f52, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.45 });
        const FX = 25, FZ = 19;
        for (let x = -FX; x <= FX; x += 3.125) for (const z of [-FZ, FZ]) cyl(0.04, 0.04, 1.9, M.steel, root, x, 0.95, z, 8);
        for (let z = -FZ; z <= FZ; z += 3.17) for (const x of [-FX, FX]) cyl(0.04, 0.04, 1.9, M.steel, root, x, 0.95, z, 8);
        box(2 * FX, 1.7, 0.02, fenceMat, root, 0, 0.95, FZ, false); box(2 * FX, 1.7, 0.02, fenceMat, root, 0, 0.95, -FZ, false); box(0.02, 1.7, 2 * FZ, fenceMat, root, -FX, 0.95, 0, false); box(0.02, 1.7, 2 * FZ - 5, fenceMat, root, FX, 0.95, -2.5, false);
        // 인버터 · 변압기 스키드
        const sk = group(root, 27.2, 0, -12); rbox(2.4, 2.6, 6, 0.1, M.white, sk, 0, 1.4, 0); box(2.5, 0.15, 6.1, M.wallBand, sk, 0, 2.75, 0); for (let i = 0; i < 4; i++) box(0.02, 1.8, 1.1, M.offWhite, sk, -1.22, 1.3, -2.1 + i * 1.4);
        const tr = group(root, 27.2, 0, -5.5); rbox(1.8, 2.0, 2.2, 0.1, M.polyGrey, tr, 0, 1.0, 0); for (let i = 0; i < 6; i++) box(0.04, 1.6, 2.0, M.steel, tr, -0.95, 1.0, -0.8 + i * 0.32).rotation.y = 0;
        pole(root, 27.5, 14, {});
        [[-28, -17, 1.1, 1], [-28.5, -6, 1, 0], [-28, 8, 1.2, 1], [-27, 17, 1, 0], [-10, 20.2, 0.8, 0], [10, -20.2, 0.9, 1]].forEach(([x, z, s, k]) => tree(root, x, z, s, k));
        hotspots.push({ key: "module", pos: new THREE.Vector3(-2, 2.6, 0) }, { key: "inverter", pos: new THREE.Vector3(27.2, 3.2, -12) }, { key: "grid", pos: new THREE.Vector3(27.5, 9, 14) });
        view = { az: 32, el: 32, fov: 28, margin: 1.0 }; shadowSize = 42; break;
      }
      case "agri": {
        island(root, 50, 36);
        const field = std({ color: 0x8a6a4c, roughness: 0.95 });
        const fg = keep(new THREE.ShapeGeometry(rrShape(42, 28, 1), 4)); fg.rotateX(-Math.PI / 2); mesh(fg, field, root, 0, 0.03, 0, false);
        const crop = std({ color: 0x5ea042, roughness: 0.85 }), crop2 = std({ color: 0x7cba4f, roughness: 0.85 });
        for (let i = 0; i < 18; i++) { const r = box(40, 0.45, 0.7, i % 2 ? crop : crop2, root, 0, 0.25, -12.8 + i * 1.5); }
        // 높은 구조물 + 띄엄띄엄 모듈 (빛이 작물에 닿도록)
        const list = [], tilt = 0.44, H = 3.6;
        for (let r = 0; r < 5; r++) {
          const z = -11 + r * 5.5;
          for (let c = 0; c < 30; c++) list.push([-17.4 + c * 1.2, H + 0.4, z, tilt, 0]);
          for (let x = -17.5; x <= 17.5; x += 5) { box(0.14, H + 0.3, 0.14, M.steel, root, x, (H + 0.3) / 2, z); box(0.5, 0.1, 0.5, M.concrete, root, x, 0.05, z, false); }
          box(36, 0.12, 0.12, M.steel, root, 0, H, z);
        }
        moduleArray(root, list); moduleCount += list.length;
        for (let x = -17.5; x <= 17.5; x += 5) box(0.1, 0.1, 22, M.steel, root, x, H - 0.1, 0);
        // 트랙터
        const t = group(root, -4, 0, 5.2); t.rotation.y = Math.PI / 2;
        const tp = phys({ color: 0x1f8a4c, roughness: 0.35, metalness: 0.3, clearcoat: 0.6 });
        rbox(1.4, 0.9, 2.6, 0.12, tp, t, 0, 1.0, 0); rbox(1.2, 1.1, 1.2, 0.1, M.glass, t, 0, 1.95, -0.4);
        for (const [z, r, w] of [[-0.8, 0.75, 0.4], [1.0, 0.45, 0.3]]) for (const s of [-1, 1]) { const wh = cyl(r, r, w, M.rubber, t, s * 0.85, r, z, 20); wh.rotation.z = Math.PI / 2; }
        worker(root, 8, 7.8, { ry: 0.6, vest: std({ color: 0x3a6ad1, roughness: 0.7 }), hat: std({ color: 0xf5d37a, roughness: 0.7 }) });
        tree(root, -23, -14, 1, 0); tree(root, 23, 14, 1, 1); tree(root, 23, -14, 0.9, 0);
        hotspots.push({ key: "module", pos: new THREE.Vector3(0, H + 1, 0) });
        view = { az: 32, el: 26, fov: 28, margin: 1.0 }; shadowSize = 34; break;
      }
      case "floating": {
        island(root, 54, 40);
        const water = phys({ color: 0x2f74a8, roughness: 0.06, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.4 });
        const wg = keep(new THREE.ShapeGeometry(rrShape(46, 32, 6), 24)); wg.rotateX(-Math.PI / 2); mesh(wg, water, root, -1, 0.05, 0, false).receiveShadow = true;
        const bank = keep(new THREE.ShapeGeometry(rrShape(47.4, 33.4, 6.5), 24)); bank.rotateX(-Math.PI / 2); mesh(bank, std({ color: 0xa69479, roughness: 0.95 }), root, -1, 0.035, 0, false);
        const list = [], tilt = 0.21;
        const blocks = [[-9, -3, 16, 6], [9.5, -3, 14, 6], [0, 7.5, 22, 3]];
        for (const [bx, bz, cols, rows] of blocks) {
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const x = bx + (c - (cols - 1) / 2) * 1.2, z = bz + (r - (rows - 1) / 2) * 2.75;
            list.push([x, 0.55, z, tilt, 0]);
            box(1.1, 0.28, 2.0, M.white, root, x, 0.2, z + 0.1);
          }
          for (let r = 0; r <= rows; r++) box(cols * 1.2, 0.18, 0.45, M.offWhite, root, bx, 0.15, bz + (r - rows / 2) * 2.75 - 0.25);
        }
        moduleArray(root, list); moduleCount += list.length;
        for (const [a, b] of [[[-18, 0.2, -12], [-23, 0.4, -16]], [[19, 0.2, -12], [23, 0.4, -16]], [[-18, 0.2, 6], [-23, 0.4, 12]], [[19, 0.2, 6], [23, 0.4, 12]]]) { wire(a, b, -0.05, 0.03, M.yellow, root); cyl(0.12, 0.12, 1.2, M.wood, root, b[0], 0.6, b[2], 10); }
        const hut = group(root, 24.5, 0, 0); rbox(3, 2.6, 4, 0.1, M.white, hut, 0, 1.3, 0); box(3.2, 0.2, 4.2, M.wallBand, hut, 0, 2.7, 0);
        wire([12.5, 0.5, 0.5], [23, 1.2, 0], 0.2, 0.04, M.cableBlack, root);
        [[-25, -17, 1, 1], [-25.5, 15, 1.1, 0], [10, -18.6, 0.9, 0], [-8, 18.6, 1, 1], [25, 15, 1, 0]].forEach(([x, z, s, k]) => tree(root, x, z, s, k));
        const boat = group(root, -14, 0.12, 11.5); rbox(1.2, 0.35, 3, 0.15, phys({ color: 0xff7a1a, roughness: 0.4, clearcoat: 0.5 }), boat, 0, 0.1, 0); boat.rotation.y = 0.5;
        hotspots.push({ key: "module", pos: new THREE.Vector3(-9, 1.2, -3) });
        view = { az: 30, el: 30, fov: 28, margin: 1.0 }; shadowSize = 36; break;
      }
      case "wall": {
        island(root, 26, 20, { th: 0.9, yard: [22, 5, 0, 6.5], lines: 7 });
        const b = group(root, 0, 0, -2);
        const W = 18, D = 10, H = 12;
        const wt = wallTex.clone(); wt.needsUpdate = true; wt.repeat.set(1, 3.5); keep(wt);
        box(W, H, D, std({ map: wt, roughness: 0.6 }), b, 0, H / 2, 0);
        box(W + 0.3, 0.5, D + 0.3, M.wallBand, b, 0, H + 0.25, 0);
        const list = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 13; c++) list.push([-7 + c * 1.16, 5.0 + r * 2.5, D / 2 + 0.35, Math.PI / 2 - 0.15, 0]);
        moduleArray(b, list); moduleCount += list.length;
        for (let r = 0; r < 3; r++) box(W - 2.4, 0.08, 0.3, M.aluDark, b, 0, 4.0 + r * 2.5, D / 2 + 0.15);
        for (let c = 0; c < 5; c++) box(2.2, 1.5, 0.08, M.glass, b, -6.6 + c * 3.3, 1.9, D / 2 + 0.05);
        box(1.6, 2.4, 0.1, M.cabinetDark, b, 7.4, 1.2, D / 2 + 0.06);
        for (let c = 0; c < 2; c++) box(0.08, 1.5, 2.6, M.glass, b, W / 2 + 0.05, 2 + c * 4, -1);
        tree(root, -11, 4, 0.7, 1); tree(root, 11.2, 4, 0.75, 0); tree(root, -11, -7, 0.8, 0);
        car(root, -6, 6.5, 0, 0xf2f4f7); car(root, 3, 6.5, 0, 0x2b3a55);
        hotspots.push({ key: "module", pos: new THREE.Vector3(0, 7.5, 3.6) });
        view = { az: 26, el: 16, fov: 28, margin: 1.0 }; shadowSize = 22; break;
      }
      default: {
        if (S.startsWith("doc")) {
          const [title, stamp] = (opt.doc || ["사업 서류", ""]);
          const stack = group(root, 0, 0, 0); stack.rotation.y = -0.25;
          for (let i = 0; i < 4; i++) { const p = box(2.1, 0.012, 2.97, M.paper, stack, (i % 2) * 0.05 - 0.03, 0.01 + i * 0.014, -(i % 3) * 0.03); p.rotation.y = (i - 1.5) * 0.04; }
          const top = mesh(G("paperTop", () => new THREE.PlaneGeometry(2.1, 2.97)), std({ map: docTex(title, stamp), roughness: 0.85 }), stack, 0, 0.072, 0); top.rotation.x = -Math.PI / 2; top.castShadow = false;
          const pen = group(root, 1.3, 0.05, 0.4); pen.rotation.y = 0.7; const pb = cyl(0.04, 0.04, 1.4, std({ color: 0x0f1b33, roughness: 0.3, metalness: 0.5 }), pen, 0, 0, 0, 16); pb.rotation.z = Math.PI / 2; const tip = mesh(G("pentip", () => new THREE.ConeGeometry(0.04, 0.12, 16)), M.gold, pen, -0.76, 0, 0); tip.rotation.z = Math.PI / 2;
          if (stamp) { const sg = group(root, -1.5, 0, 1.0); cyl(0.22, 0.22, 0.12, M.red, sg, 0, 0.06, 0, 24); cyl(0.08, 0.1, 0.4, M.wood, sg, 0, 0.32, 0, 16); sph(0.14, M.wood, sg, 0, 0.58, 0); }
          studio(8); view = { az: 0, el: 52, fov: 24, margin: 1.06 }; shadowSize = 6;
        }
      }
    }

    /* ------------------------------------------------------------------
       조명 · 환경
       ------------------------------------------------------------------ */
    const hemi = new THREE.HemisphereLight(0xdbe8ff, 0x8a8170, 0.6); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1dc, 3.2); sun.castShadow = true;
    const sm = opt.shadowMap || (live ? 2048 : 4096); sun.shadow.mapSize.set(sm, sm);
    const sc2 = sun.shadow.camera; sc2.left = -shadowSize; sc2.right = shadowSize; sc2.top = shadowSize; sc2.bottom = -shadowSize; sc2.near = 1; sc2.far = shadowSize * 6;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = shadowSize > 20 ? 0.06 : 0.02; sun.shadow.radius = 4;
    scene.add(sun); scene.add(sun.target);
    const fill = new THREE.DirectionalLight(0xc8dcff, 0.6); fill.position.set(-30, 20, 40); scene.add(fill);

    // 하늘 환경맵 (반사용)
    function envScene() {
      const es = new THREE.Scene();
      const sky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        uniforms: { top: { value: new THREE.Color(0x5b8fe0) }, mid: { value: new THREE.Color(0xdfeaf8) }, bot: { value: new THREE.Color(0x77736b) } },
        vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h=vP.y; vec3 c = h>0.0 ? mix(mid, top, pow(h,0.55)) : mix(mid, bot, pow(-h,0.35)); gl_FragColor=vec4(c*1.15,1.0); }",
      }));
      es.add(sky);
      const sunD = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.85).multiplyScalar(30) }));
      sunD.position.set(40, 55, 50); es.add(sunD);
      const box1 = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3.2), side: THREE.DoubleSide })); box1.position.set(-60, 40, 20); box1.lookAt(0, 0, 0); es.add(box1);
      return es;
    }
    let envRT = null;
    function setupEnv(renderer) {
      const pm = new THREE.PMREMGenerator(renderer); const es = envScene();
      envRT = pm.fromScene(es, 0.03); scene.environment = envRT.texture; pm.dispose();
      es.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }

    // 주제 경계 · 카메라
    const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.1, 2000);
    const bbox = focus || new THREE.Box3().setFromObject(root);
    const center = bbox.getCenter(new THREE.Vector3()), sizeV = bbox.getSize(new THREE.Vector3());
    const radius = sizeV.length() / 2;
    function setSun(hour) {
      // hour 6~19 → 방위 · 고도 (남쪽 = +Z)
      const t = Math.max(0, Math.min(1, (hour - 6) / 13));
      const az = (-80 + 160 * t) * Math.PI / 180, el = Math.max(4, Math.sin(t * Math.PI) * 58) * Math.PI / 180;
      const d = radius * 2.2;
      sun.position.set(center.x + Math.sin(az) * Math.cos(el) * d, center.y + Math.sin(el) * d, center.z + Math.cos(az) * Math.cos(el) * d);
      sun.target.position.copy(center); sun.target.updateMatrixWorld();
      const warm = 1 - Math.sin(t * Math.PI);
      sun.color.setRGB(1, 0.93 - warm * 0.25, 0.84 - warm * 0.45);
      sun.intensity = 0.6 + 2.8 * Math.sin(t * Math.PI);
      hemi.intensity = 0.3 + 0.35 * Math.sin(t * Math.PI);
      sc2.updateProjectionMatrix();
      return Math.max(0, Math.sin(el)) * Math.max(0, Math.sin(t * Math.PI));
    }
    setSun(opt.hour != null ? opt.hour : 9.4);
    function orbit(az, el, aspect, dist) {
      camera.aspect = aspect || 1; camera.fov = view.fov;
      const a = az * Math.PI / 180, e = el * Math.PI / 180;
      const vfov = view.fov * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
      const dir = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
      const place = (d) => { camera.position.copy(center).addScaledVector(dir, d); camera.lookAt(center); camera.near = Math.max(0.05, d - radius * 2); camera.far = d + radius * 4; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); };
      let d = dist;
      if (!d) {
        const pts = []; for (const x of [bbox.min.x, bbox.max.x]) for (const y of [bbox.min.y, bbox.max.y]) for (const z of [bbox.min.z, bbox.max.z]) pts.push(new THREE.Vector3(x, y, z));
        let lo = radius * 0.3, hi = radius * 8;
        for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; place(mid); const ok = pts.every((p) => { const q = p.clone().project(camera); return Math.abs(q.x) <= 1 / view.margin && Math.abs(q.y) <= 1 / view.margin && q.z < 1; }); if (ok) hi = mid; else lo = mid; }
        d = hi;
      }
      place(d);
      return d;
    }
    function fit(aspect) { return orbit(view.az, view.el, aspect); }

    function dispose() {
      disposables.forEach((x) => x.dispose && x.dispose());
      if (envRT) envRT.dispose();
      scene.traverse((o) => { if (o.isInstancedMesh) o.dispose && o.dispose(); });
    }
    return { scene, camera, fit, orbit, view, center, radius, setSun, setupEnv, hotspots, dispose, modules: moduleCount };
  }

  window.SOLAR3D = { create };
})();
