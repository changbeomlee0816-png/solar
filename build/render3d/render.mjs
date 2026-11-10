// 3D 장면 정지 이미지 렌더 → site/3d/<이름>.webp (배경 투명)
// 사용: node build/render3d/render.mjs [이름 ...]   (처음 한 번: cd build/render3d && npm install)
// 결과 이미지는 일반 장면(회사 자료 없음)이라 저장소에 함께 넣는다. 빌드는 이 이미지를 그대로 쓴다.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)("playwright"); // 전역 설치본 (NODE_PATH)
const ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, "site/3d");
const FONT = path.join(ROOT, "build/.cache/docxfonts/Pretendard-Bold.ttf");

// [이름, 가로, 세로, 옵션]
const SHOTS = [
  ["hero", 1800, 1100, { pad: 0.02 }],
  ["survey", 1200, 800], ...[0, 1, 2, 3, 4, 5, 6].map((k) => [`step${k}`, 1200, 800]),
  ["flatroof", 1200, 800], ["carport", 1200, 800], ["ground", 1200, 800], ["agri", 1200, 800], ["floating", 1200, 800], ["wall", 1200, 800],
  ["module", 960, 720], ["inverter", 960, 720], ["board", 960, 720], ["rpr", 960, 720], ["grid", 960, 720],
  ["structure", 960, 720], ["combiner", 960, 720], ["cable", 960, 720], ["monitor", 960, 720], ["safety", 960, 720],
  ["money", 960, 720], ["office", 960, 720], ["tower", 960, 720], ["bapv", 960, 720],
  ["doc", 960, 720, { doc: ["사업 서류", ""] }],
  ["doc-design", 960, 720, { doc: ["설계도 · 구조검토", "검토"] }],
  ["doc-permit", 960, 720, { doc: ["개발행위허가 · 신고", "허가"] }],
  ["doc-biz", 960, 720, { doc: ["발전사업 허가증", "허가"] }],
  ["doc-contract", 960, 720, { doc: ["전력 공급 계약서", "계약"] }],
];
const only = process.argv.slice(2);
const SS = 1.5; // 슈퍼샘플링 배율

const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0000">
<script type="importmap">{"imports":{"three":"http://r3d.local/three/build/three.module.js"}}</script>
<script src="http://r3d.local/scene3d.js"></script>
<script type="module">
import * as THREE from "three";
const ff = new FontFace("Pretendard", "url(http://r3d.local/font.ttf)", { weight: "100 900" });
try { await ff.load(); document.fonts.add(ff); } catch (e) { console.log("font fail", e); }
window.renderShot = async (name, w, h, ss, extra) => {
  const shot = name.startsWith("doc") ? "doc" : name;
  const W = Math.round(w * ss), H = Math.round(h * ss);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.setClearColor(0x000000, 0);
  const s = window.SOLAR3D.create(THREE, { shot, accum: true, ...(extra || {}) });
  s.setupEnv(renderer); s.fit(W / H);
  // 해 · 하늘빛 방향을 바꿔 가며 N번 그려 평균 (부드러운 그림자 + 틈새 음영)
  const N = window.SAMPLES || 20, acc = new Float32Array(W * H * 4);
  const src = document.createElement("canvas"); src.width = W; src.height = H; const sg = src.getContext("2d", { willReadFrequently: true });
  const gl = renderer.getContext(), d = new Uint8Array(W * H * 4);
  for (let k = 0; k < N; k++) {
    s.sample(k, N); renderer.render(s.scene, s.camera);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, d); // 미리 곱한 알파 값 그대로
    for (let i = 0; i < d.length; i++) acc[i] += d[i];
  }
  const fin = sg.createImageData(W, H), px = fin.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const si = ((H - 1 - y) * W + x) * 4, i = (y * W + x) * 4, a = acc[si + 3] / N; if (a < 2) continue; const k = 255 / acc[si + 3]; px[i] = acc[si] * k; px[i + 1] = acc[si + 1] * k; px[i + 2] = acc[si + 2] * k; px[i + 3] = a; }
  sg.putImageData(fin, 0, 0);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (px[(y * W + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = (extra && extra.pad) || 0.05;
  let cw = (x1 - x0) * (1 + pad * 2), ch = (y1 - y0) * (1 + pad * 2);
  if (cw / ch > w / h) ch = cw * h / w; else cw = ch * w / h;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const out = document.createElement("canvas"); out.width = w; out.height = h;
  const g = out.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(src, cx - cw / 2, cy - ch / 2, cw, ch, 0, 0, w, h);
  const url = out.toDataURL("image/webp", 0.88);
  s.dispose(); renderer.dispose(); renderer.forceContextLoss();
  return url;
};
window.ready = true;
</script>`;

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error" || m.text().includes("fail")) console.log("[page]", m.text()); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.route("http://r3d.local/**", async (route) => {
  const u = new URL(route.request().url());
  let file, type = "text/javascript";
  if (u.pathname === "/") { return route.fulfill({ body: PAGE, contentType: "text/html" }); }
  if (u.pathname === "/scene3d.js") file = path.join(ROOT, "site/scene3d.js");
  else if (u.pathname === "/font.ttf") { file = FONT; type = "font/ttf"; }
  else if (u.pathname.startsWith("/three/")) file = path.join(HERE, "node_modules", u.pathname.slice(1));
  if (!file || !fs.existsSync(file)) return route.fulfill({ status: 404, body: "" });
  return route.fulfill({ body: fs.readFileSync(file), contentType: type });
});
await page.goto("http://r3d.local/");
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
if (process.env.SAMPLES) await page.evaluate((n) => { window.SAMPLES = n; }, +process.env.SAMPLES);
fs.mkdirSync(OUT, { recursive: true });
for (const [name, w, h, extra] of SHOTS) {
  if (only.length && !only.includes(name)) continue;
  const t0 = Date.now();
  const url = await page.evaluate(([n, w, h, ss, ex]) => window.renderShot(n, w, h, ss, ex), [name, w, h, SS, extra || null]);
  const buf = Buffer.from(url.split(",")[1], "base64");
  fs.writeFileSync(path.join(OUT, `${name}.webp`), buf);
  console.log(`${name}.webp ${w}×${h} ${(buf.length / 1024).toFixed(0)}KB ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await browser.close();
