/* 유호스트 태양광 백서 웹 — 개요 · 백서 · 사례집 · 원가 분석
   데이터: window.__DATA__ = { wp: 백서, cost: 원가 툴, reports: 시공완료보고서 } (build/build_site.py가 주입) */
(() => {
  "use strict";
  const D = window.__DATA__ || {};
  let WP = D.wp || { meta: {}, parts: [] };
  let COST = D.cost || null;
  let REP = D.reports || [];
  const VAULT = D.vault || null;
  let unlocked = !VAULT;
  const BUILT = D.built || "";
  const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 유틸 ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const plain = (h) => String(h ?? "").replace(/<\/(p|li)>/g, " ").replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
  const fmt = (n, d = 0) => (n == null || !isFinite(n)) ? "–" : Number(n).toLocaleString("ko-KR", { maximumFractionDigits: d, minimumFractionDigits: d });
  const man = (n) => (n == null || !isFinite(n)) ? "–" : fmt(Math.round(n / 1e4)) + "만";
  const eok = (n) => (n / 1e8).toFixed(2) + "억";
  const pct = (r, d = 0) => (r == null || !isFinite(r)) ? "–" : (r * 100).toFixed(d) + "%";
  const norm = (s) => String(s || "").replace(/[㈜()（）\s]|\(주\)|\(유\)|주식회사|유한회사/g, "").replace(/^(주|유)/, "");
  const store = {
    get(k, d) { try { const v = localStorage.getItem("yh-solar:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("yh-solar:" + k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } },
  };
  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }
  // 텍스트 표기 규칙 강조: 〔입력〕, 【사례】, ★, [확인 필요]
  const deco = (h) => String(h ?? "")
    .replace(/〔([^〕]*)〕/g, '<span class="ph-in">$1</span>')
    .replace(/【사례】/g, '<span class="tag-case">사례</span>')
    .replace(/\[확인 필요\]/g, '<span class="tag-verify">확인 필요</span>')
    .replace(/\[추정\]/g, '<span class="tag-verify">추정</span>')
    .replace(/★/g, '<span class="tag-check">★</span>');

  /* ---------- 백서 색인 ---------- */
  let CH = [];
  let secToCh = {};
  function indexWP() {
    CH = []; secToCh = {};
    WP.parts.forEach((p, pi) => p.chapters.forEach((c) => {
      CH.push({ p, pi, c });
      (c.sections || []).forEach((s) => { secToCh[s.id] = c.id; });
    }));
  }
  indexWP();
  const pcolor = (pi) => `var(--p${Math.min(pi, 5)})`;
  // 장 번호 → 아이콘 (선 아이콘, 24px 그리드)
  const IC = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    flow: '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.5 6h9M6.5 8l4 8M17.5 8l-4 8"/>',
    steps: '<path d="M3 20h5v-5h5v-5h5V5h3"/>',
    roof: '<path d="M2 12l10-7 10 7"/><path d="M5 10v10h14V10"/><path d="M8 13l3-2 3 2 3-2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    pin: '<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    scale: '<path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7h6zM18 7l-3 7h6z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    hand: '<path d="M3 12l4-4 4 3 3-3 7 6-4 4-3-2-2 2-3-3-2 2z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    pencil: '<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    tool: '<path d="M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9z"/>',
    hard: '<path d="M3 18h18M5 18v-3a7 7 0 0 1 14 0v3M10 8V5h4v3"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    flag: '<path d="M5 22V3M5 3h12l-2 4 2 4H5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9a3 3 0 0 0-3-1.5c-2 0-3 1-3 2.2 0 3 6 1.6 6 4.5 0 1.3-1.2 2.3-3 2.3a3.5 3.5 0 0 1-3-1.5M12 6v12"/>',
    contract: '<path d="M6 2h12v20H6z"/><path d="M9 7h6M9 11h6M9 15l2 2 4-4"/>',
    people: '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="9" r="3"/><path d="M2 20c.6-3 3-5 6-5s5.4 2 6 5M12 20c.6-3 2.4-5 5-5s4.4 2 5 5"/>',
    shield: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>',
    fire: '<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 9 0 4 3 7 7 7z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
    leaf: '<path d="M4 20c0-9 6-15 16-16-1 10-7 16-16 16z"/><path d="M4 20l9-9"/>',
    folder: '<path d="M3 6h7l2 2h9v12H3z"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/>',
    star: '<path d="M12 2l3 6.6 7 .7-5.3 4.8 1.6 7L12 17.5 5.7 21l1.6-7L2 9.3l7-.7z"/>',
    ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
    shade: '<circle cx="9" cy="9" r="4"/><path d="M14 14h7v7h-7z"/><path d="M3 21l8-8"/>',
  };
  const CH_IC = { 1: "sun", 2: "flow", 3: "steps", 4: "roof", 5: "user", 6: "map", 7: "pin", 8: "scale", 9: "grid", 10: "alert", 11: "hand", 12: "search", 13: "pencil", 14: "doc", 15: "box", 16: "tool", 17: "hard", 18: "check", 19: "flag", 20: "gear", 21: "coin", 22: "contract", 23: "people", 24: "shield", 25: "fire", 26: "chart", 27: "leaf", 28: "folder", 29: "trophy", 30: "star", 31: "ruler", 32: "shade" };
  const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[name] || IC.doc}</svg>`;
  const chById = (id) => CH.find((x) => x.c.id === id);
  const chByNum = (n) => (CH.find((x) => x.c.num === n) || {}).c;
  const tablesOf = (ch) => (ch ? ch.blocks.filter((b) => b.t === "table") : []);
  const cellsText = (row) => row.map((c) => plain(c.html));
  function findTable(ch, first, second) {
    return tablesOf(ch).find((t) => {
      const h = t.rows[0] ? cellsText(t.rows[0]) : [];
      return h[0] && h[0].startsWith(first) && (!second || (h[1] || "").startsWith(second));
    });
  }
  const bodyRows = (t) => (t ? t.rows.slice(t.head || 1).map(cellsText) : []);
  function sectionBlocks(ch, pred) {
    if (!ch) return null;
    const out = []; let on = false, head = null;
    for (const b of ch.blocks) {
      if (b.t === "h3") { if (on) break; if (pred(b.text)) { on = true; head = b; continue; } }
      if (on) out.push(b);
    }
    return head ? { head, blocks: out } : null;
  }
  // h4 소제목 단위로 나누기
  function byH4(blocks) {
    const out = []; let cur = null;
    for (const b of blocks) {
      if (b.t === "h4") { cur = { title: b.text, blocks: [] }; out.push(cur); } else if (cur) cur.blocks.push(b);
    }
    return out;
  }

  /* ---------- 블록 렌더러 ---------- */
  function calloutKind(b) {
    const t = b.title || "";
    if (b.tone === "secret" || t.includes("대외비")) return "secret";
    if (t.includes("이 장의 핵심")) return "key";
    if (t.includes("교훈") || t.includes("다음 사업 표준") || t.includes("공정 기준")) return "lesson";
    if (b.tone === "check" || t.includes("★") || t.includes("체크")) return "check";
    if (b.tone === "warn" || t.includes("주의")) return "warn";
    return "info";
  }
  const ICON = {
    key: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/><circle cx="12" cy="12" r="3.5"/></svg>',
    lesson: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
    check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.6 7 .7-5.3 4.8 1.6 7L12 17.5 5.7 21l1.6-7L2 9.3l7-.7z"/></svg>',
    warn: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
    secret: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  };
  function renderCellBlocks(blocks) {
    let html = "", lis = [];
    const flush = () => { if (lis.length) { html += "<ul>" + lis.map((x) => `<li>${deco(x)}</li>`).join("") + "</ul>"; lis = []; } };
    for (const b of blocks) {
      if (b.t === "li") { lis.push(b.html); continue; }
      flush();
      if (b.t === "p") html += `<p>${deco(b.html)}</p>`;
      else if (b.t === "img") html += `<figure class="fig"><img src="${b.src}" width="${b.w}" height="${b.h}" loading="lazy" alt="" data-lb="${b.src}"></figure>`;
      else if (b.t === "table") html += renderBlock(b);
    }
    flush();
    return html;
  }
  function renderTable(b) {
    const head = b.head || 0;
    let h = '<div class="tbl"><table>';
    if (head) {
      h += "<thead>" + b.rows.slice(0, head).map((r) => "<tr>" + r.map((c) =>
        `<th${c.cs > 1 ? ` colspan="${c.cs}"` : ""}${c.rs > 1 ? ` rowspan="${c.rs}"` : ""}>${c.html}</th>`).join("") + "</tr>").join("") + "</thead>";
    }
    h += "<tbody>" + b.rows.slice(head).map((r) => "<tr>" + r.map((c) =>
      `<td${c.cs > 1 ? ` colspan="${c.cs}"` : ""}${c.rs > 1 ? ` rowspan="${c.rs}"` : ""}${c.k ? ` class="${c.k}"` : ""}>${deco(c.html)}</td>`).join("") + "</tr>").join("") + "</tbody>";
    return h + "</table></div>";
  }
  function renderGallery(items, group) {
    return `<div class="gallery" data-lbgroup="${esc(group || "g")}">` + items.map((it) =>
      `<figure><button type="button" data-lb="${it.src}" data-cap="${esc(it.cap || "")}" aria-label="사진 크게 보기"><img src="${it.src}" loading="lazy" alt="${esc(it.cap || "")}" width="${it.w}" height="${it.h}"></button>${it.cap ? `<figcaption>${esc(it.cap)}</figcaption>` : ""}</figure>`).join("") + "</div>";
  }
  function renderBlock(b) {
    switch (b.t) {
      case "h3": {
        const m = b.text.match(/^(\d+\.\d+)\s+(.*)$/);
        return `<h3 id="${b.id}">${m ? `<span class="sn">${m[1]}</span>${esc(m[2])}` : esc(b.text)}</h3>`;
      }
      case "h4": return `<h4>${deco(esc(b.text))}</h4>`;
      case "p": return `<p>${deco(b.html)}</p>`;
      case "ul": return "<ul>" + b.items.map((x) => `<li>${deco(x)}</li>`).join("") + "</ul>";
      case "guide": return `<div class="guide">${deco(b.html)}</div>`;
      case "note": return `<div class="note">${deco(b.html)}</div>`;
      case "caption": return `<div class="caption">${esc(b.text)}</div>`;
      case "fig": return `<figure class="fig"><img src="${b.src}" width="${b.w}" height="${b.h}" loading="lazy" alt="${esc(b.cap)}" data-lb="${b.src}" data-cap="${esc(b.cap)}">${b.cap ? `<figcaption>${esc(b.cap)}</figcaption>` : ""}</figure>`;
      case "locked": return lockedBox(b.what);
      case "callout": {
        const k = calloutKind(b);
        if (k === "key" && b.c.every((x) => x.t === "li")) {
          return `<div class="keycards-title">${icon("star", 15)} 이 장의 핵심</div><div class="keycards">${b.c.map((x, i) => `<div class="keycard"><span class="kn">${i + 1}</span>${deco(x.html)}</div>`).join("")}</div>`;
        }
        return `<div class="callout ${k}">${b.title ? `<div class="ct">${ICON[k]}${deco(esc(b.title.replace(/^★\s*/, "")))}</div>` : ""}${renderCellBlocks(b.c)}</div>`;
      }
      case "table": return renderTable(b);
      case "gallery": return renderGallery(b.items);
      default: return "";
    }
  }
  const renderBlocks = (blocks) => blocks.map(renderBlock).join("");
  function lockedBox(what) {
    const label = { chapter: "이 장은 대외비입니다", section: "이 절은 대외비입니다", callout: "대외비 박스", cost: "원가 분석은 대외비입니다" }[what] || "대외비 내용";
    return `<div class="locked-box"><span class="li">${LOCK_SVG}</span><b>${label}</b><p>사내 인원은 열람 암호를 입력하면 바로 볼 수 있습니다.</p><button type="button" class="btn primary" data-unlock>암호 입력</button></div>`;
  }
  const LOCK_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';

  /* ---------- 공통: 등장 모션 · 카운터 · 라이트박스 ---------- */
  let io = null;
  function observe(root) {
    const els = $$(".reveal, [data-count]", root);
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    if (io) io.disconnect();
    io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        if (el.classList.contains("reveal")) el.classList.add("in");
        if (el.dataset.count) countUp(el);
        io.unobserve(el);
      });
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
  }
  function countUp(el) {
    const end = parseFloat(el.dataset.count); const dec = +(el.dataset.dec || 0);
    if (!isFinite(end)) return;
    const t0 = performance.now(), dur = 1100;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(end * e, dec);
      if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(end, dec);
    };
    requestAnimationFrame(step);
  }
  function openLightbox(trigger) {
    const group = trigger.closest("[data-lbgroup]") || trigger.closest(".doc") || document.body;
    const list = $$("[data-lb]", group);
    let i = Math.max(0, list.indexOf(trigger));
    const box = document.createElement("div");
    box.className = "lb"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.innerHTML = '<div style="max-width:100%;text-align:center"><img alt=""><div class="cap"></div></div><button class="x" aria-label="닫기">×</button>' +
      (list.length > 1 ? '<button class="pv" aria-label="이전">‹</button><button class="nx" aria-label="다음">›</button>' : "");
    const show = () => { const t = list[i]; $("img", box).src = t.dataset.lb; $(".cap", box).textContent = t.dataset.cap || t.alt || ""; };
    const close = () => { box.remove(); document.removeEventListener("keydown", key); trigger.focus && trigger.focus(); };
    const key = (e) => { if (e.key === "Escape") close(); if (e.key === "ArrowRight") { i = (i + 1) % list.length; show(); } if (e.key === "ArrowLeft") { i = (i - 1 + list.length) % list.length; show(); } };
    box.addEventListener("click", (e) => {
      if (e.target === box || e.target.classList.contains("x")) close();
      else if (e.target.classList.contains("nx")) { i = (i + 1) % list.length; show(); }
      else if (e.target.classList.contains("pv")) { i = (i - 1 + list.length) % list.length; show(); }
    });
    document.addEventListener("keydown", key);
    document.body.appendChild(box); show(); $(".x", box).focus();
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-lb]");
    if (t) { e.preventDefault(); openLightbox(t); }
  });

  /* ---------- SVG 도우미 ---------- */
  function motionDots(path, cls, n = 3, dur = 2.4) {
    if (reduceMotion) return "";
    let s = "";
    for (let i = 0; i < n; i++) s += `<circle r="3.6" class="${cls}"><animateMotion dur="${dur}s" begin="${(-dur * i / n).toFixed(2)}s" repeatCount="indefinite" path="${path}"/></circle>`;
    return s;
  }
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function quadPoint(A, B, C, Dp, u, v) { return lerp(lerp(A, B, u), lerp(Dp, C, u), v); }

  /* ======================================================================
     홈 (개요)
     ====================================================================== */
  function heroArt() {
    const A = [150, 128], B = [455, 96], C = [500, 176], Dp = [196, 214];
    const cols = 11, rows = 4; let panels = "";
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const g = 0.012;
      const u0 = c / cols + g, u1 = (c + 1) / cols - g, v0 = r / rows + g * 2, v1 = (r + 1) / rows - g * 2;
      const pts = [quadPoint(A, B, C, Dp, u0, v0), quadPoint(A, B, C, Dp, u1, v0), quadPoint(A, B, C, Dp, u1, v1), quadPoint(A, B, C, Dp, u0, v1)];
      panels += `<polygon class="panel pcell" style="animation-delay:${(c * 0.12 + r * 0.05).toFixed(2)}s" points="${pts.map((p) => p.map((x) => x.toFixed(1)).join(",")).join(" ")}"/>`;
    }
    const wire = "M500 186 L520 190 L520 262 L470 262";
    return `<svg class="hero-art dg" viewBox="0 0 560 360" role="img" aria-label="공장 지붕 위 태양광 어레이와 전기 흐름">
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sun)" stop-opacity=".16"/><stop offset="1" stop-color="var(--sun)" stop-opacity="0"/></linearGradient></defs>
      <style>.pcell{animation:cellglow 4.2s ease-in-out infinite}@keyframes cellglow{0%,100%{fill:var(--cell)}45%{fill:color-mix(in srgb,var(--cell) 55%,#fff)}}</style>
      
      <g transform="translate(78 64)"><g class="rays">${Array.from({ length: 12 }, (_, i) => `<line class="sun-ray" x1="0" y1="-38" x2="0" y2="-50" transform="rotate(${i * 30})"/>`).join("")}</g><circle class="sun-core" r="28"/></g>
      ${[0, 1, 2].map((i) => `<line x1="${104 + i * 6}" y1="${86 + i * 8}" x2="${250 + i * 90}" y2="${132 + i * 6}" class="flow dc" style="opacity:.55;animation-delay:${i * .3}s"/>`).join("")}
      <polygon class="wall" points="${A} 150,236 196,322 196,214"/>
      <polygon class="wall" points="196,214 500,176 500,292 196,322"/>
      ${[0, 1, 2, 3, 4].map((i) => { const x = 225 + i * 54, y = 214 - (i * 54 + 29) * 38 / 304; return `<rect x="${x}" y="${(y + 30).toFixed(0)}" width="28" height="22" rx="2" fill="var(--paper)" stroke="var(--line-2)"/>`; }).join("")}
      <rect x="436" y="${(176 + 64).toFixed(0)}" width="40" height="52" fill="var(--navy)" opacity=".85"/>
      <polygon class="roof" points="${A} ${B} ${C} ${Dp}"/>
      ${panels}
      <path d="${wire}" class="wire"/>
      <path d="${wire}" class="flow dc"/>
      ${motionDots(wire, "dot-dc", 3, 2.2)}
      <rect x="506" y="214" width="28" height="34" rx="4" class="box-navy"/><text x="520" y="235" text-anchor="middle" class="txt-inv" style="font-size:9px;font-weight:700">INV</text>
      <text x="530" y="200" class="lbl-dc">DC</text><text x="486" y="278" class="lbl-ac">AC</text>
      <line x1="40" y1="324" x2="540" y2="324" stroke="var(--line-2)" stroke-width="2"/>
      <text x="196" y="346" class="t-sub mono">645W 양면형 모듈 · 경사 고정형 · 공장 지붕</text>
    </svg>`;
  }

  function flowDiagram() {
    // 노드: 모듈 → 접속반 → 인버터 → 수배전반 → 공장 / 한전
    const N = {
      module: [20, 30, 128, 64, "태양광 모듈", "직류(DC) 생산"],
      combiner: [190, 30, 110, 64, "접속반", "스트링 모음"],
      inverter: [350, 30, 110, 64, "인버터", "DC → AC 변환"],
      board: [510, 30, 120, 64, "수배전반", "차단기 · 계량"],
      factory: [660, 0, 100, 54, "공장 설비", "자가소비"],
      grid: [660, 92, 100, 54, "한전 계통", "부족분 수전"],
      monitor: [350, 168, 110, 50, "모니터링", "발전량 원격 확인"],
      rpr: [510, 168, 120, 50, "역전력계전기", "역송 차단"],
      structure: [20, 168, 128, 50, "구조물 · 접지", "지붕 고정 · 감전 방지"],
    };
    const box = (k) => {
      const [x, y, w, h, t, s] = N[k];
      const navy = k === "inverter";
      return `<g data-node="${k}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="${navy ? "box-navy" : "box"} nd"/>
        <text x="${x + w / 2}" y="${y + h / 2 - 3}" text-anchor="middle" class="lbl ${navy ? "txt-inv" : ""}">${t}</text>
        <text x="${x + w / 2}" y="${y + h / 2 + 13}" text-anchor="middle" class="t-sub" ${navy ? 'style="fill:var(--paper);opacity:.8"' : ""}>${s}</text></g>`;
    };
    const P = {
      dc1: "M148 62 L190 62", dc2: "M300 62 L350 62", ac1: "M460 62 L510 62",
      ac2: "M630 52 L660 27", ac3: "M660 119 L630 72",
      mon: "M405 94 L405 168", rpr: "M570 94 L570 168", st: "M84 94 L84 168",
    };
    return `<svg class="dg chart" viewBox="0 0 770 230" style="min-width:600px" role="img" aria-label="태양광 설비 구성과 전기 흐름">
      <defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink-3)"/></marker></defs>
      ${Object.values(P).map((d) => `<path d="${d}" class="wire" data-wire/>`).join("")}
      <path d="${P.dc1}" class="flow dc"/><path d="${P.dc2}" class="flow dc"/><path d="${P.ac1}" class="flow ac"/><path d="${P.ac2}" class="flow ac"/><path d="${P.ac3}" class="flow ac"/>
      <path d="${P.mon}" class="flow ac" style="stroke-dasharray:3 6;opacity:.6"/><path d="${P.rpr}" stroke="var(--bad)" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
      <path d="${P.st}" stroke="var(--line-2)" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
      ${motionDots(P.dc1, "dot-dc", 2, 1.2)}${motionDots(P.dc2, "dot-dc", 2, 1.2)}${motionDots(P.ac1, "dot-ac", 2, 1.2)}${motionDots(P.ac2, "dot-ac", 2, 1.2)}
      ${Object.keys(N).map(box).join("")}
      <text x="169" y="54" text-anchor="middle" class="lbl-dc">DC</text><text x="325" y="54" text-anchor="middle" class="lbl-dc">DC</text><text x="485" y="54" text-anchor="middle" class="lbl-ac">AC</text>
      <text x="640" y="186" class="t-sub">태양광 전기가 한전 쪽으로</text><text x="640" y="200" class="t-sub">거꾸로 흐르지 않게 차단</text>
    </svg>`;
  }
  const NODE_OF = { "태양광 모듈": "module", "구조물": "structure", "접속반": "combiner", "인버터": "inverter", "수배전반": "board", "역전력계전기": "rpr", "케이블": "wire", "모니터링": "monitor", "안전시설": "structure" };

  const TYPE_DIAG = {
    "자가소비 (갑)": { nodes: { pv: [40, 60, "지붕 태양광", "수용가 소유"], f: [300, 60, "공장", "자체 소비"], k: [300, 170, "한전", "부족분 공급"] },
      edges: [["pv", "f", "e", "생산 전력"], ["k", "f", "e", "부족분"], ["f", "k", "m", "전기요금"]], block: ["pv", "k", "역송 차단 (역전력계전기)"] },
    "자가소비 + 상계거래": { nodes: { pv: [40, 60, "지붕 태양광", "수용가 소유"], f: [300, 60, "공장", "자체 소비"], k: [300, 170, "한전", "상계 계량"] },
      edges: [["pv", "f", "e", "생산 전력"], ["pv", "k", "e", "잉여 → 상계"], ["k", "f", "e", "부족분"], ["f", "k", "m", "상계 후 요금"]] },
    "직접PPA": { nodes: { pv: [30, 50, "SPC 설비", "지붕 20년 임차"], f: [310, 50, "수용가", "전력 구매"], kt: [170, 170, "KT", "전력 판매 중개"] },
      edges: [["pv", "f", "e", "PPA 전력 (KPX 계량)"], ["f", "kt", "m", "전력 대금"], ["kt", "pv", "m", "판매 대금 − 수수료"]] },
    "BAPV · BIPV": { nodes: { pv: [40, 60, "벽면 · 지붕 부착", "건물형 태양광"], f: [300, 60, "공장", "자체 소비"], k: [300, 170, "한전", "부족분 공급"] },
      edges: [["pv", "f", "e", "생산 전력"], ["k", "f", "e", "부족분"]] },
  };
  function typeDiagram(name) {
    const spec = TYPE_DIAG[name] || TYPE_DIAG["자가소비 (갑)"];
    const W = 120, H = 54;
    const c = (k) => { const n = spec.nodes[k]; return [n[0] + W / 2, n[1] + H / 2]; };
    let edges = "", k = 0;
    for (const [a, b, kind, lab] of spec.edges) {
      const [x1, y1] = c(a), [x2, y2] = c(b);
      const twin = spec.edges.some((e) => e[0] === b && e[1] === a);
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const off = twin ? 11 : 0, nx = -uy * off, ny = ux * off;
      const t = Math.min(ux ? W / 2 / Math.abs(ux) : 1e9, uy ? H / 2 / Math.abs(uy) : 1e9);
      const sx = x1 + ux * (t + 2) + nx, sy = y1 + uy * (t + 2) + ny, ex = x2 - ux * (t + 8) + nx, ey = y2 - uy * (t + 8) + ny;
      const d = `M${sx.toFixed(1)} ${sy.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}`;
      const cls = kind === "e" ? "dc" : "money";
      edges += `<path d="${d}" class="wire" style="stroke-width:2"/><path d="${d}" class="flow ${cls}" marker-end="url(#am-${cls})"/>${motionDots(d, kind === "e" ? "dot-dc" : "dot-money", 2, 2)}`;
      const mx = (sx + ex) / 2, my = (sy + ey) / 2;
      const vertical = Math.abs(uy) > Math.abs(ux);
      const side = vertical ? (nx >= 0 ? 1 : -1) : (ny > 0 ? 1 : -1);
      const tx = vertical ? mx + side * 10 : mx, ty = vertical ? my + 4 : my + (side > 0 && twin ? 16 : -8);
      edges += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${vertical ? (side > 0 ? "start" : "end") : "middle"}" class="${kind === "e" ? "lbl-dc" : "lbl-m"}">${lab}</text>`;
      k++;
    }
    let block = "";
    if (spec.block) {
      const [x1, y1] = c(spec.block[0]), [x2, y2] = c(spec.block[1]);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 20;
      block = `<path d="M${x1} ${y1 + H / 2} Q ${x1} ${y2} ${x2 - W / 2 - 4} ${y2}" fill="none" stroke="var(--bad)" stroke-width="2" stroke-dasharray="4 5"/>
        <g transform="translate(${x1 + 40} ${y2 - 6})"><circle r="10" fill="var(--bad-soft)" stroke="var(--bad)"/><path d="M-4 -4L4 4M4 -4L-4 4" stroke="var(--bad)" stroke-width="2"/></g>
        <text x="${x1 - 50}" y="${y2 + 30}" class="t-sub" style="fill:var(--bad)">${spec.block[2]}</text>`;
    }
    const nodes = Object.entries(spec.nodes).map(([key, n]) => `<g><rect x="${n[0]}" y="${n[1]}" width="${W}" height="${H}" rx="9" class="${key === "pv" ? "box-navy" : "box"}"/>
      <text x="${n[0] + W / 2}" y="${n[1] + 23}" text-anchor="middle" class="lbl ${key === "pv" ? "txt-inv" : ""}">${n[2]}</text>
      <text x="${n[0] + W / 2}" y="${n[1] + 40}" text-anchor="middle" class="t-sub" ${key === "pv" ? 'style="fill:var(--paper);opacity:.75"' : ""}>${n[3]}</text></g>`).join("");
    return `<svg class="dg chart" viewBox="0 0 460 250" style="min-width:360px" role="img" aria-label="${esc(name)} 전기와 돈의 흐름">
      <defs><marker id="am-dc" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--sun)"/></marker>
      <marker id="am-money" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--leaf)"/></marker></defs>
      ${edges}${block}${nodes}</svg>`;
  }

  // 시공 공정 단면도 레이어
  function buildArt() {
    const roof = (x) => 150 - (x - 60) * 40 / 400; // 지붕선 y
    const zig = Array.from({ length: 41 }, (_, i) => { const x = 60 + i * 10; return `${i ? "L" : "M"}${x} ${(roof(x) - (i % 2 ? 5 : 0)).toFixed(1)}`; }).join(" ");
    const posts = Array.from({ length: 9 }, (_, i) => { const x = 90 + i * 42; return `<line x1="${x}" y1="${roof(x) - 3}" x2="${x}" y2="${roof(x) - 18}" stroke="var(--ink-2)" stroke-width="3"/>`; }).join("");
    const rail = `<line x1="80" y1="${roof(80) - 18}" x2="440" y2="${roof(440) - 18}" stroke="var(--ink-2)" stroke-width="3"/>`;
    const pnl = Array.from({ length: 8 }, (_, i) => {
      const x0 = 84 + i * 44, x1 = x0 + 40, y0 = roof(x0) - 20, y1 = roof(x1) - 20;
      return `<polygon points="${x0},${y0} ${x1},${y1} ${x1 + 3},${y1 - 13} ${x0 + 3},${y0 - 13}" class="panel"/>`;
    }).join("");
    const tray = "M440 " + (roof(440) - 14) + " L478 " + (roof(440) - 14) + " L478 200 L478 214";
    const ac = "M478 236 L478 250 L410 250 L410 238";
    return `<svg class="dg chart" viewBox="0 0 540 300" role="img" aria-label="지붕 태양광 시공 순서 단면도">
      <rect x="60" y="${roof(460)}" width="400" height="0" />
      <polygon points="60,150 460,110 460,262 60,262" class="wall"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${100 + i * 85}" y="196" width="46" height="34" rx="3" fill="var(--paper)" stroke="var(--line-2)"/>`).join("")}
      <path d="M60 150 L460 110" stroke="#a46a3c" stroke-width="5" stroke-dasharray="9 5" opacity=".75"/>
      <text x="64" y="282" class="t-sub">기존 노후 지붕</text>
      <line x1="20" y1="262" x2="520" y2="262" stroke="var(--line-2)" stroke-width="2"/>
      <g class="layer" data-l="1"><path d="${zig}" fill="none" stroke="var(--cell)" stroke-width="3" stroke-linejoin="round"/><text x="250" y="${roof(250) + 22}" class="lbl" style="fill:var(--cell)">새 칼라강판</text></g>
      <g class="layer" data-l="2">
        ${[62, 456].map((x) => `<line x1="${x}" y1="${roof(x) - 2}" x2="${x}" y2="${roof(x) - 34}" stroke="var(--warn)" stroke-width="3"/><line x1="${x - 8}" y1="${roof(x) - 30}" x2="${x + 8}" y2="${roof(x) - 31}" stroke="var(--warn)" stroke-width="3"/>`).join("")}
        <g stroke="var(--warn)" stroke-width="2.5"><line x1="30" y1="262" x2="30" y2="${roof(60) - 6}"/><line x1="46" y1="262" x2="46" y2="${roof(60) - 6}"/>${Array.from({ length: 8 }, (_, i) => `<line x1="30" y1="${250 - i * 14}" x2="46" y2="${250 - i * 14}"/>`).join("")}</g>
        <text x="8" y="140" class="lbl" style="fill:var(--warn)">사다리</text></g>
      <g class="layer" data-l="3">${posts}${rail}</g>
      <g class="layer" data-l="4">${pnl}</g>
      <g class="layer" data-l="5"><path d="${tray}" fill="none" stroke="var(--sun)" stroke-width="4"/><rect x="466" y="200" width="26" height="36" rx="3" class="box-navy"/><text x="479" y="222" text-anchor="middle" class="txt-inv" style="font-size:8px;font-weight:700">INV</text>
        <path d="${ac}" fill="none" stroke="var(--cell)" stroke-width="4"/><rect x="392" y="214" width="36" height="26" rx="3" fill="var(--paper)" stroke="var(--navy)" stroke-width="2"/><text x="410" y="231" text-anchor="middle" style="font-size:8px;font-weight:700">수배전</text></g>
      <g class="layer" data-l="6"><rect x="300" y="18" width="70" height="44" rx="5" fill="var(--paper)" stroke="var(--navy)" stroke-width="2"/>
        <polyline points="308,52 322,40 334,46 348,30 362,34" fill="none" stroke="var(--leaf)" stroke-width="2.5"/><text x="335" y="76" text-anchor="middle" class="t-sub">절연 · 접지 · 모니터링</text></g>
      <g class="layer" data-l="7"><g transform="translate(150 44)"><circle r="26" fill="none" stroke="var(--leaf)" stroke-width="3"/><text y="5" text-anchor="middle" style="fill:var(--leaf);font-weight:700;font-size:13px">합격</text></g>
        <line x1="505" y1="262" x2="505" y2="150" stroke="var(--ink-2)" stroke-width="4"/><line x1="490" y1="160" x2="520" y2="160" stroke="var(--ink-2)" stroke-width="3"/>
        <path d="M492 250 L505 250" class="flow ac"/><text x="512" y="146" class="t-sub">한전</text></g>
    </svg>`;
  }

  function renderHome(root) {
    const m = WP.meta || {};
    const issuesT = findTable(chByNum(10), "No", "일자");
    const nIssues = bodyRows(issuesT).filter((r) => /^\d+$/.test(r[0]) && r[4]).length;
    const totalKwp = REP.reduce((s, r) => s + (r.kwp || 0), 0);
    const nCh = CH.filter((x) => typeof x.c.num === "number").length;
    const sites7 = (chByNum(7) || { sections: [] }).sections.length;
    const lastRev = (m.revisions || []).slice().sort((a, b) => (b[1] || "").localeCompare(a[1] || "") || (b[0] || "").localeCompare(a[0] || ""))[0];

    // 1장 표들
    const ch1 = chByNum(1);
    const partsT = findTable(ch1, "장비");
    const numsT = findTable(ch1, "항목", "값");
    const typesT = findTable(chByNum(2), "구분", "자가소비");
    const stepsT = findTable(chByNum(3), "단계");
    const ch4 = chByNum(4);
    const proc = ch4 ? byH4(ch4.blocks).filter((x) => /^[①-⑨]/.test(x.title)) : [];
    const sumT = findTable(chByNum(10), "분류", "건수");
    const kwT = findTable(chByNum(21), "규모", "기준");
    const usage = chById("front-1");
    const howTo = usage ? (usage.c.blocks.find((b) => b.t === "ul") || { items: [] }).items : [];

    root.innerHTML = `
    <section class="hero"><div class="wrap">
      <div class="reveal">
        <div class="eyebrow">${esc(m.project || "")} · ${esc(m.org || "")}</div>
        <h1>태양광 <em>사업관리</em><br>백서</h1>
        <p class="lead">${esc(m.subtitle || "")}. 현장 단톡방 기록과 시공완료보고서, 원가 검토 결과를 한곳에서 보고 이해할 수 있게 정리했습니다.</p>
        <div class="hero-cta"><a class="btn primary" href="#ch1">처음부터 읽기</a><a class="btn" href="#cases">사례집 보기</a><a class="btn" href="#cost">원가 분석</a></div>
        <div class="stats">
          <div class="stat"><span class="ic">${icon("doc", 17)}</span><div class="v"><span data-count="${nCh}">${nCh}</span><small>장</small></div><div class="k">백서 본문</div></div>
          <div class="stat"><span class="ic">${icon("pin", 17)}</span><div class="v"><span data-count="${sites7}">${sites7}</span><small>곳</small></div><div class="k">현장별 분석</div></div>
          <div class="stat"><span class="ic">${icon("sun", 17)}</span><div class="v"><span data-count="${Math.round(totalKwp)}">${fmt(totalKwp)}</span><small>kWp</small></div><div class="k">준공 ${REP.length}곳 합계</div></div>
          <div class="stat"><span class="ic">${icon("alert", 17)}</span><div class="v"><span data-count="${nIssues}">${nIssues}</span><small>건</small></div><div class="k">이슈 · 교훈</div></div>
        </div>
        <div class="meta"><span>버전 <b class="mono">${esc(m.version || "")}</b></span>${lastRev ? `<span>최근 개정 <b class="mono">${esc(lastRev[1])}</b></span>` : ""}<span>문서번호 <b class="mono">${esc(m.docno || "")}</b></span><span>${esc(m.org || "")}</span></div>
      </div>
      <div class="reveal hero-glow">${heroArt()}</div>
    </div><svg class="wave" viewBox="0 0 1440 46" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C 240 0 480 46 720 24 S 1200 8 1440 26 V46 H0z"/></svg></section>

    <div class="wrap"><section class="sec reveal" style="margin-top:36px">
      <div class="sec-head"><div><div class="eyebrow">백서 지도</div><h2>5개 파트, ${nCh}개 장</h2><p>처음이라면 PART 1부터, 현장 분석은 PART 2, 실무 체크리스트는 PART 3을 펼치세요.</p></div><a class="from" href="#wp">표지 · 개정 이력 →</a></div>
      <div class="map">${WP.parts.map((p, pi) => pi === 0 ? "" : `<a class="map-card" href="#${p.chapters[0].id}" style="--pc:${pcolor(pi)}"><span class="pn">${pi}</span><span class="pl">${esc(p.label)}</span><h3>${esc(p.title)}</h3>
        <ul>${p.chapters.slice(0, 6).map((c) => `<li class="${c.locked ? "lk" : ""}"><b>${typeof c.num === "number" ? c.num : "A"}</b><span>${esc(c.title.replace(/ — .*/, ""))}${c.locked ? " 🔒" : ""}</span></li>`).join("")}${p.chapters.length > 6 ? `<li><b>+</b><span>외 ${p.chapters.length - 6}개 장</span></li>` : ""}</ul></a>`).join("")}</div>
    </section></div>

    <div class="wrap">
    ${partsT ? `<section class="sec reveal" id="flow">
      <div class="sec-head"><div><div class="eyebrow">1장 · 태양광 발전 한눈에 보기</div><h2>전기는 이렇게 흐릅니다</h2>
      <p>모듈이 만든 직류(DC)를 인버터가 교류(AC)로 바꾸고, 수배전반을 거쳐 공장 설비로 갑니다. 장비를 누르면 하는 일과 현장 확인 포인트가 보입니다.</p></div>
      <a class="from" href="#s1-2">백서 1.2 구성 장비 →</a></div>
      <div class="flow-grid">
        <div class="card flow-card"><div style="overflow-x:auto">${flowDiagram()}</div>
          <div class="legend"><span><i style="background:var(--sun)"></i>직류 DC</span><span><i style="background:var(--cell)"></i>교류 AC</span><span><i style="background:var(--bad)"></i>역송 차단 신호</span></div>
          <div id="part-info" class="note" style="margin-top:12px"></div></div>
        <div class="parts-list" id="parts">${bodyRows(partsT).map((r, i) => `<button type="button" class="part-item" data-i="${i}" data-node="${NODE_OF[r[0]] || ""}"><span class="n">${String(i + 1).padStart(2, "0")}</span><span><b>${esc(r[0])}</b><span>${esc(r[1])}</span></span></button>`).join("")}</div>
      </div></section>` : ""}

    ${typesT ? `<section class="sec reveal" id="types">
      <div class="sec-head"><div><div class="eyebrow">2장 · 사업 유형</div><h2>누가 소유하고, 누가 쓰고, 누구에게 내는가</h2>
      <p>사업 유형은 세 질문으로 갈립니다. 유형을 고르면 전기(주황)와 돈(초록)의 흐름이 바뀝니다.</p></div><a class="from" href="#s2-1">백서 2.1 사업 유형 비교 →</a></div>
      <div class="types">
        <div class="type-tabs" id="type-tabs">${typesT.rows[0].slice(1).map((c, i) => { const name = plain(c.html); const site = (bodyRows(typesT).find((r) => r[0].includes("2026")) || [])[i + 1] || ""; return `<button type="button" class="type-tab" data-i="${i}" aria-pressed="${i === 0}"><b>${esc(name)}</b><small>${esc(site)}</small></button>`; }).join("")}</div>
        <div class="card type-detail" id="type-detail"></div>
      </div></section>` : ""}

    ${stepsT ? `<section class="sec reveal" id="steps">
      <div class="sec-head"><div><div class="eyebrow">3장 · 사업 전체 흐름</div><h2>영업부터 사후관리까지 ${bodyRows(stepsT).length - 1}단계</h2>
      <p>각 단계의 '다음 단계 진행 조건'을 채워야 넘어갑니다. 자가소비형은 약 4개월, 직접PPA는 약 7~8개월 걸립니다.</p></div>
      <div style="display:flex;gap:8px;align-items:center"><button class="btn" id="step-play" type="button">▶ 자동 재생</button><a class="from" href="#ch3">백서 3장 →</a></div></div>
      <div class="steps" id="step-bar"><div class="bar"></div>${bodyRows(stepsT).map((r, i) => `<button type="button" class="step" data-i="${i}" aria-pressed="${i === 0}"><span class="dot">${i}</span><span class="slb">${esc(r[0].replace(/^\d+\.\s*/, ""))}</span></button>`).join("")}</div>
      <div class="step-detail" id="step-detail"></div></section>` : ""}

    ${proc.length ? `<section class="sec reveal" id="build">
      <div class="sec-head"><div><div class="eyebrow">4장 · 시공 공정 따라가기</div><h2>지붕 위에서 일어나는 일, 순서대로</h2>
      <p>덮이면 다시 볼 수 없는 부분(관통부 방수, 접지선, 결선)은 반드시 사진으로 남깁니다.</p></div><a class="from" href="#ch4">백서 4장 →</a></div>
      <div class="build">
        <div class="card build-stage">${buildArt()}
          <div class="build-ctrl"><button class="btn" type="button" id="b-prev" aria-label="이전 공정">‹</button><button class="btn" type="button" id="b-play">❚❚ 일시정지</button><button class="btn" type="button" id="b-next" aria-label="다음 공정">›</button><div class="prog"><i id="b-prog"></i></div><span class="mono" id="b-count" style="font-size:12px;color:var(--ink-3)"></span></div></div>
        <div class="card build-info" id="build-info"></div>
      </div></section>` : ""}

    ${numsT ? `<section class="sec reveal" id="calc">
      <div class="sec-head"><div><div class="eyebrow">1.4 숫자로 감 잡기</div><h2>용량을 넣으면 규모가 보입니다</h2>
      <p>645W 모듈, 일평균 발전 3.5시간(예시 가정), 1kW당 약 4.7m² 기준입니다. 실제 현장 값은 26장(발전량 예측)에서 관리합니다.</p></div><a class="from" href="#s1-4">백서 1.4 →</a></div>
      <div class="card calc">
        <div><label for="kw">설비 용량 (kWp)</label><div class="big"><span id="kw-v">100</span><small> kWp</small></div>
          <input type="range" id="kw" min="10" max="1000" step="0.01" value="100" aria-label="설비 용량">
          <div class="seg" style="margin-top:10px" id="kw-presets"><button type="button" data-v="100">100kW</button>${REP.map((r) => `<button type="button" data-v="${r.kwp}">${esc(norm(r.site).replace(/공장$/, ""))}</button>`).join("")}</div></div>
        <div><div class="calc-out" id="calc-out"></div><div class="mini-array" id="mini-array" aria-hidden="true"></div><div class="from" id="calc-note" style="margin-top:6px"></div></div>
      </div></section>` : ""}

    <section class="sec reveal">
      <div class="sec-head"><div><div class="eyebrow">2026 군산 현장</div><h2>준공된 현장 ${REP.length}곳</h2><p>시공완료보고서 기준 수치입니다. 카드를 누르면 사례집에서 공정 · 사진 · 기대효과를 볼 수 있습니다.</p></div><a class="from" href="#cases">사례집 전체 →</a></div>
      <div class="grid-3">${REP.map((r, i) => siteCard(r, i)).join("")}</div>
    </section>

    <section class="sec reveal grid-2">
      ${sumT ? `<div class="card panel"><h3>이슈 ${nIssues}건, 어디서 나왔나 <a class="from" href="#cases-issues">레지스터 보기 →</a></h3>
        ${(() => { const rs = bodyRows(sumT).filter((r) => /\d/.test(r[1])); const mx = Math.max(...rs.map((r) => +r[1])); return rs.map((r) => `<div class="hbar" title="${esc(r[2])}"><span>${esc(r[0])}</span><span class="track"><span class="fill" style="width:${(+r[1] / mx * 100).toFixed(1)}%;display:block"></span></span><span class="n">${r[1]}</span></div>`).join("") + `<p class="from" style="margin-top:10px">${esc(rs.sort((a, b) => b[1] - a[1])[0][2])}</p>`; })()}</div>` : ""}
      <div class="card panel"><h3>처음 투입되는 분께</h3>
        <ol class="path-list">${howTo.slice(0, 6).map((x) => `<li><span>${linkify(x)}</span></li>`).join("")}</ol></div>
    </section>
    </div>`;

    // 장비 선택
    if (partsT) {
      const rows = bodyRows(partsT);
      const info = $("#part-info", root);
      const pick = (i) => {
        $$(".part-item", root).forEach((b) => b.classList.toggle("on", +b.dataset.i === i));
        const node = NODE_OF[rows[i][0]];
        $$("[data-node] .nd", root).forEach((r) => r.classList.toggle("hot", r.parentNode.dataset.node === node));
        $$("[data-wire]", root).forEach((w) => w.classList.toggle("hot", node === "wire"));
        info.innerHTML = `<b>${esc(rows[i][0])}</b> — ${esc(rows[i][1])}<br><span style="color:var(--ink-3)">현장에서 확인할 것:</span> ${esc(rows[i][2])}`;
      };
      $("#parts", root).addEventListener("click", (e) => { const b = e.target.closest(".part-item"); if (b) pick(+b.dataset.i); });
      pick(0);
    }
    // 사업 유형
    if (typesT) {
      const names = typesT.rows[0].slice(1).map((c) => plain(c.html));
      const rows = bodyRows(typesT);
      const det = $("#type-detail", root);
      const pick = (i) => {
        $$(".type-tab", root).forEach((b) => b.setAttribute("aria-pressed", +b.dataset.i === i));
        det.innerHTML = `<div style="overflow-x:auto">${typeDiagram(names[i])}</div>
          <div class="legend"><span><i style="background:var(--sun)"></i>전기</span><span><i style="background:var(--leaf)"></i>돈</span></div>
          <dl class="kv">${rows.map((r) => `<dt>${esc(r[0])}</dt><dd>${esc(r[i + 1])}</dd>`).join("")}</dl>`;
      };
      $("#type-tabs", root).addEventListener("click", (e) => { const b = e.target.closest(".type-tab"); if (b) pick(+b.dataset.i); });
      pick(0);
    }
    // 10단계
    if (stepsT) {
      const rows = bodyRows(stepsT); const H = cellsText(stepsT.rows[0]);
      const det = $("#step-detail", root); const bar = $("#step-bar .bar", root);
      let cur = 0, timer = null;
      const pick = (i) => {
        cur = i;
        $$(".step", root).forEach((b) => { const k = +b.dataset.i; b.setAttribute("aria-pressed", k === i); b.classList.toggle("done", k < i); });
        bar.style.width = (i / (rows.length - 1) * 91) + "%";
        const r = rows[i];
        det.innerHTML = `<div><div class="k">${esc(H[1])}</div>${esc(r[1])}</div><div><div class="k">${esc(H[2])}</div>${esc(r[2])}</div><div><div class="k">${esc(H[3])}</div>${esc(r[3])}</div><div class="gate"><div class="k">${esc(H[4])}</div><b>${esc(r[4])}</b></div>`;
      };
      $("#step-bar", root).addEventListener("click", (e) => { const b = e.target.closest(".step"); if (b) { stop(); pick(+b.dataset.i); } });
      const btn = $("#step-play", root);
      const stop = () => { clearInterval(timer); timer = null; btn.textContent = "▶ 자동 재생"; };
      btn.addEventListener("click", () => {
        if (timer) return stop();
        btn.textContent = "❚❚ 멈춤"; if (cur >= rows.length - 1) pick(0);
        timer = setInterval(() => { if (cur >= rows.length - 1) stop(); else pick(cur + 1); }, 1800);
      });
      pick(0);
      cleanup.push(stop);
    }
    // 시공 공정
    if (proc.length) {
      const info = $("#build-info", root);
      const layers = $$(".layer", root);
      let cur = 0, timer = null;
      const show = (i) => {
        cur = (i + proc.length) % proc.length;
        layers.forEach((l) => { const n = +l.dataset.l; l.classList.toggle("off", n > cur + 1); l.classList.toggle("now", n === cur + 1 || (cur === proc.length - 1 && n >= cur + 1)); });
        const p = proc[cur]; const t = p.blocks.find((b) => b.t === "table");
        const kv = t ? t.rows.map(cellsText) : [];
        info.innerHTML = `<div class="eyebrow">공정 ${cur + 1} / ${proc.length}</div><h3>${esc(p.title)}</h3><dl class="kv">${kv.map((r) => `<dt>${esc(r[0])}</dt><dd>${r[0].includes("사례") ? `<span class="tag-case">사례</span> ` : ""}${esc(r[1])}</dd>`).join("")}</dl>`;
        $("#b-prog", root).style.width = ((cur + 1) / proc.length * 100) + "%";
        $("#b-count", root).textContent = `${cur + 1}/${proc.length}`;
      };
      const playBtn = $("#b-play", root);
      const play = () => { timer = setInterval(() => show(cur + 1), 3400); playBtn.textContent = "❚❚ 일시정지"; };
      const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = "▶ 재생"; };
      playBtn.addEventListener("click", () => (timer ? stop() : play()));
      $("#b-prev", root).addEventListener("click", () => { stop(); show(cur - 1); });
      $("#b-next", root).addEventListener("click", () => { stop(); show(cur + 1); });
      show(reduceMotion ? proc.length - 1 : 0);
      if (!reduceMotion) play(); else playBtn.textContent = "▶ 재생";
      cleanup.push(stop);
    }
    // 계산기
    if (numsT) {
      const rows = bodyRows(numsT);
      const val = (key, re, d) => { const r = rows.find((x) => x[0].includes(key)); const m = r && r[1].match(re); return m ? parseFloat(m[1].replace(/,/g, "")) : d; };
      const W = val("출력", /([\d.]+)\s*W/, 645), AREA = val("면적", /([\d.]+)\s*m/, 4.7);
      const HRS = 3.5;
      const kwRows = bodyRows(kwT).map((r) => [parseFloat(r[0]), parseFloat(r[1].replace(/,/g, ""))]).filter((x) => isFinite(x[0]) && isFinite(x[1])).sort((a, b) => a[0] - b[0]);
      const unitCost = (kw) => {
        if (!kwRows.length) return null;
        if (kw <= kwRows[0][0]) return kwRows[0][1];
        for (let i = 1; i < kwRows.length; i++) if (kw <= kwRows[i][0]) { const [a, ca] = kwRows[i - 1], [b, cb] = kwRows[i]; return ca + (cb - ca) * (kw - a) / (b - a); }
        return kwRows[kwRows.length - 1][1];
      };
      const input = $("#kw", root), out = $("#calc-out", root), arr = $("#mini-array", root);
      const upd = () => {
        const kw = +input.value; $("#kw-v", root).textContent = fmt(kw, 2);
        const mods = Math.ceil(kw * 1000 / W), day = kw * HRS, yr = day * 365, uc = unitCost(kw);
        out.innerHTML = [
          [fmt(mods), "모듈 (장, " + W + "W)"], [fmt(kw * AREA), "모듈 면적 (m², 통로 별도)"], [fmt(day), "하루 발전량 (kWh)"],
          [fmt(yr / 1000, 1), "연간 발전량 (MWh)"], [fmt(yr * 0.4173 / 1000, 1), "온실가스 감축 (tCO₂eq/년)"],
          [uc ? (kw * uc / 1e8).toFixed(2) + "억" : "–", "시장 총공사비 (21.5 기준)"],
        ].map(([v, k]) => `<div><div class="v">${v}</div><div class="k">${k}</div></div>`).join("");
        const per = mods > 400 ? Math.ceil(mods / 400) : 1;
        arr.innerHTML = Array.from({ length: Math.ceil(mods / per) }, (_, i) => `<i style="animation-delay:${Math.min(i * 3, 600)}ms"></i>`).join("");
        $("#calc-note", root).textContent = per > 1 ? `■ 1칸 = 모듈 ${per}장` : "■ 1칸 = 모듈 1장";
      };
      input.addEventListener("input", upd);
      $("#kw-presets", root).addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { input.value = b.dataset.v; upd(); } });
      upd();
    }
  }
  function linkify(h) {
    // "PART 1(1~5장)", "7장", "12장, 13장" → 링크
    return deco(h).replace(/(\d{1,2})장/g, (m, n) => chByNum(+n) ? `<a href="#ch${n}">${m}</a>` : m);
  }
  function siteCard(r, i) {
    const e = r.effect || {};
    const img = r.location_img && r.location_img.src && i > 0 ? r.location_img : (r.photos.find((p) => /구조물|모듈/.test(p.cap)) || r.hero_img || {});
    return `<a class="card site-card" href="#case-${i + 1}">
      <div class="ph">${img.src ? `<img src="${img.src}" alt="${esc(r.site)} 현장" loading="lazy">` : ""}</div>
      <div class="bd"><div class="row"><span class="chip good">준공</span><span class="chip">${esc((r.inspection || "").slice(0, 13))} 사용전검사</span></div>
      <h3>${esc(r.site)}</h3>
      <div class="mini-kpi"><div><div class="v">${fmt(r.kwp, 2)}</div><div class="k">kWp</div></div><div><div class="v">${esc((e.gen || {}).value || "–").replace(" kWh", "")}</div><div class="k">예상 발전 kWh/년</div></div><div><div class="v">${esc((e.payback || {}).value || "–").replace("약 ", "")}</div><div class="k">자부담 회수</div></div></div></div></a>`;
  }

  /* ======================================================================
     백서 리더
     ====================================================================== */
  let searchQ = "";
  const prefs = { guide: store.get("guide", false), secret: store.get("secret", true) };
  function renderToc(curId) {
    return `<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input type="search" id="wp-q" placeholder="백서 전체 검색 (예: 역전력, 공작물)" value="${esc(searchQ)}" aria-label="백서 검색"></div>
      <a href="#wp" style="display:block;padding:6px 8px;font-weight:600;text-decoration:none;color:var(--ink)">표지 · 개정 이력</a>
      ${WP.parts.map((p, pi) => {
        const open = p.chapters.some((c) => c.id === curId) || (!curId && pi === 1);
        return `<details style="--pc:${pcolor(pi)}" ${open ? "open" : ""}><summary><span class="pl">${esc(p.label || "문서")}</span><span>${esc(p.title)}</span></summary><ol>${p.chapters.map((c) =>
          `<li><a href="#${c.id}" ${c.id === curId ? 'aria-current="true"' : ""}><span class="cn">${typeof c.num === "number" ? c.num : (c.num ? "A" : "·")}</span><span>${esc(c.title)}${c.locked ? ' <span class="lk-ic">🔒</span>' : ""}</span></a></li>`).join("")}</ol></details>`;
      }).join("")}
      <div class="opts"><label><input type="checkbox" id="opt-guide" ${prefs.guide ? "checked" : ""}> 작성가이드(✎) 표시</label>
      <label><input type="checkbox" id="opt-secret" ${prefs.secret ? "checked" : ""}> 대외비 박스 표시</label></div>`;
  }
  function searchIndex() {
    if (searchIndex.cache) return searchIndex.cache;
    const idx = [];
    for (const { p, c } of CH) {
      let sec = null;
      for (const b of c.blocks) {
        if (b.t === "h3") sec = b;
        let txt = "";
        if (b.t === "p" || b.t === "guide" || b.t === "note") txt = plain(b.html);
        else if (b.t === "ul") txt = b.items.map(plain).join(" ");
        else if (b.t === "h3" || b.t === "h4") txt = b.text;
        else if (b.t === "callout") txt = (b.title || "") + " " + b.c.map((x) => plain(x.html || "")).join(" ");
        else if (b.t === "table") txt = b.rows.map((r) => cellsText(r).join(" · ")).join(" / ");
        else if (b.t === "gallery") txt = b.items.map((x) => x.cap).join(" ");
        else if (b.t === "fig") txt = b.cap;
        if (txt) idx.push({ ch: c, part: p, sec, txt });
      }
    }
    return (searchIndex.cache = idx);
  }
  function doSearch(q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    const hits = searchIndex().filter((x) => { const t = x.txt.toLowerCase(); return terms.every((w) => t.includes(w)); });
    return hits.slice(0, 80).map((x) => {
      const t = x.txt; const i = t.toLowerCase().indexOf(terms[0]);
      const snip = (i > 40 ? "…" : "") + t.slice(Math.max(0, i - 40), i + 110) + (t.length > i + 110 ? "…" : "");
      let h = esc(snip); terms.forEach((w) => { h = h.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (m) => `<mark class="hit">${m}</mark>`); });
      return { href: x.sec ? x.sec.id : x.ch.id, where: `${typeof x.ch.num === "number" ? x.ch.num + "장 " : ""}${x.ch.title}${x.sec ? " › " + x.sec.text : ""}`, h };
    });
  }
  function renderWP(root, chId, secId) {
    const cur = chId ? chById(chId) : null;
    root.innerHTML = `<div class="wrap view"><button class="btn toc-toggle" type="button" id="toc-btn">☰ 목차 · 검색</button>
      <div class="reader ${prefs.guide ? "" : "hide-guide"} ${prefs.secret ? "" : "hide-secret"}" id="reader">
        <nav class="toc" id="toc" aria-label="백서 목차">${renderToc(chId)}</nav>
        <article class="doc" id="doc"></article>
        <aside class="subtoc" id="subtoc"></aside>
      </div></div><div class="progress" id="rprog"></div>`;
    const doc = $("#doc", root), sub = $("#subtoc", root);
    const paint = () => {
      if (searchQ.trim()) {
        const res = doSearch(searchQ.trim());
        doc.innerHTML = `<div class="ch-head"><div class="part">검색</div><h1>“${esc(searchQ)}” 검색 결과 ${res.length}건</h1></div>
          <div class="results">${res.map((r) => `<a href="#${r.href}" data-q="${esc(searchQ)}"><small>${esc(r.where)}</small><p>${r.h}</p></a>`).join("") || "<p>일치하는 내용이 없습니다. 다른 낱말로 찾아보세요.</p>"}</div>`;
        sub.innerHTML = "";
        return;
      }
      if (!cur) { doc.innerHTML = renderCover(); sub.innerHTML = ""; observe(doc); return; }
      const { p, c } = cur;
      const i = CH.indexOf(cur), prev = CH[i - 1], next = CH[i + 1];
      doc.style.setProperty("--pc", pcolor(cur.pi));
      const nTbl = c.blocks.filter((b) => b.t === "table").length, nImg = c.blocks.reduce((a, b) => a + (b.t === "fig" ? 1 : b.t === "gallery" ? b.items.length : 0), 0);
      doc.innerHTML = `<header class="ch-banner" style="--pc:${pcolor(cur.pi)}"><div class="part">${esc(p.label || "문서")} · ${esc(p.title)}</div>${typeof c.num === "number" ? `<div class="bignum" aria-hidden="true">${String(c.num).padStart(2, "0")}</div><span class="ic">${icon(CH_IC[c.num], 24)}</span>` : ""}<h1>${esc(c.title)}</h1>
        <div class="meta">${(c.sections || []).length ? `<span>절 ${c.sections.length}개</span>` : ""}${nTbl ? `<span>표 ${nTbl}개</span>` : ""}${nImg ? `<span>그림 · 사진 ${nImg}장</span>` : ""}${c.locked ? "<span>🔒 대외비</span>" : ""}</div></header>
        ${renderBlocks(c.blocks)}
        <nav class="pager">${prev ? `<a href="#${prev.c.id}"><small>← 이전</small>${esc(chLabel(prev.c))}</a>` : "<span></span>"}${next ? `<a class="next" href="#${next.c.id}"><small>다음 →</small>${esc(chLabel(next.c))}</a>` : "<span></span>"}</nav>`;
      sub.innerHTML = (c.sections || []).length ? `<div class="eyebrow">이 장의 절</div>` + c.sections.map((s) => `<a href="#${s.id}" data-sec="${s.id}">${esc(s.text)}</a>`).join("") : "";
    };
    paint();
    const qIn = $("#wp-q", root);
    let deb;
    qIn.addEventListener("input", () => { clearTimeout(deb); deb = setTimeout(() => { searchQ = qIn.value; paint(); }, 180); });
    $("#toc", root).addEventListener("click", (e) => { if (e.target.closest("a")) { searchQ = ""; $("#toc", root).classList.remove("open"); } });
    $("#toc-btn", root).addEventListener("click", () => $("#toc", root).classList.toggle("open"));
    $("#opt-guide", root).addEventListener("change", (e) => { prefs.guide = e.target.checked; store.set("guide", prefs.guide); $("#reader", root).classList.toggle("hide-guide", !prefs.guide); });
    $("#opt-secret", root).addEventListener("change", (e) => { prefs.secret = e.target.checked; store.set("secret", prefs.secret); $("#reader", root).classList.toggle("hide-secret", !prefs.secret); });
    doc.addEventListener("click", (e) => { const a = e.target.closest("a[data-q]"); if (a) { pendingHighlight = a.dataset.q; searchQ = ""; } });
    // 스크롤 위치 → 절 목차 · 진행바
    const onScroll = () => {
      const h = document.documentElement; const max = h.scrollHeight - h.clientHeight;
      $("#rprog", root).style.width = (max > 0 ? h.scrollTop / max * 100 : 0) + "%";
      let on = null; $$("h3[id]", doc).forEach((el) => { if (el.getBoundingClientRect().top < 140) on = el.id; });
      $$("[data-sec]", sub).forEach((a) => a.classList.toggle("on", a.dataset.sec === on));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    cleanup.push(() => window.removeEventListener("scroll", onScroll));
    // 이동
    requestAnimationFrame(() => {
      const target = secId ? document.getElementById(secId) : null;
      if (target) { target.scrollIntoView({ block: "start" }); target.classList.add("flash"); } else window.scrollTo(0, 0);
      if (pendingHighlight) { highlight(doc, pendingHighlight, target); pendingHighlight = null; }
      onScroll();
    });
  }
  let pendingHighlight = null;
  function highlight(doc, q, near) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean); if (!terms.length) return;
    const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
    let first = null; const nodes = [];
    while (walker.nextNode()) { const n = walker.currentNode; if (n.nodeValue.toLowerCase().includes(terms[0])) nodes.push(n); }
    nodes.forEach((n) => {
      const i = n.nodeValue.toLowerCase().indexOf(terms[0]); const r = document.createRange();
      r.setStart(n, i); r.setEnd(n, i + terms[0].length); const m = document.createElement("mark"); m.className = "hit"; r.surroundContents(m);
      if (!first && (!near || near.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING)) first = m;
    });
    if (first) first.scrollIntoView({ block: "center" });
  }
  const chLabel = (c) => (typeof c.num === "number" ? c.num + "장 " : "") + c.title;
  function renderCover() {
    const m = WP.meta;
    const revs = (m.revisions || []).slice().sort((a, b) => (b[1] || "").localeCompare(a[1] || "") || (b[0] || "").localeCompare(a[0] || ""));
    return `<div class="card cover reveal" style="background:linear-gradient(var(--grid) 1px,transparent 1px) 0 0/24px 24px,linear-gradient(90deg,var(--grid) 1px,transparent 1px) 0 0/24px 24px,var(--paper)">
      <div class="eyebrow">${esc(m.badge || "")} · ${esc(m.docno || "")}</div><h1 style="margin:10px 0 6px">${esc(m.title)}</h1><p class="lead">${esc(m.subtitle)}</p>
      <p style="font-size:13px;color:var(--ink-3)">${esc(m.project || "")} · ${esc(m.org || "")} · 작성 ${esc(m.author || "")} · 버전 <b class="mono">${esc(m.version)}</b></p></div>
      ${WP.parts.slice(1).map((p) => `<div class="card panel reveal" style="margin-bottom:12px"><h3><span><span class="mono" style="color:var(--sun);font-size:12px">${esc(p.label)}</span> ${esc(p.title)}</span></h3>
        <p style="margin:-6px 0 10px;color:var(--ink-2);font-size:13.5px">${esc(p.subtitle || "")}</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${p.chapters.map((c) => `<a class="chip info" style="text-decoration:none" href="#${c.id}">${esc(chLabel(c))}</a>`).join("")}</div></div>`).join("")}
      <h3 style="margin:28px 0 10px">개정 이력</h3>
      <div class="tbl rev"><table><thead><tr><th>버전</th><th>일자</th><th>주요 변경 내용</th></tr></thead><tbody>${revs.map((r) => `<tr><td class="key mono">${esc(r[0])}</td><td class="mono">${esc(r[1])}</td><td>${esc(r[3])}</td></tr>`).join("")}</tbody></table></div>`;
  }

  /* ======================================================================
     사례집
     ====================================================================== */
  function issuesList() {
    const t = findTable(chByNum(10), "No", "일자");
    return bodyRows(t).filter((r) => /^\d+$/.test(r[0]) && r[4]).map((r) => ({ no: +r[0], date: r[1], site: r[2], cat: r[3], issue: r[4], cause: r[5], fix: r[6] }));
  }
  function siteSections() {
    const ch7 = chByNum(7); if (!ch7) return [];
    return ch7.sections.map((s) => {
      const sb = sectionBlocks(ch7, (t) => t === s.text);
      const name = s.text.replace(/^\d+\.\d+\s+/, "");
      const parts = byH4(sb ? sb.blocks : []);
      const prog = parts.find((x) => x.title.includes("진행 경과"));
      const firstUl = prog && prog.blocks.find((b) => b.t === "ul" || b.t === "table" || b.t === "p");
      let summary = "";
      if (firstUl) summary = firstUl.t === "ul" ? plain(firstUl.items[firstUl.items.length - 1]) : firstUl.t === "table" ? cellsText(firstUl.rows[firstUl.rows.length - 1]).join(" ") : plain(firstUl.html);
      return { id: s.id, title: s.text, name, key: norm(name.replace(/\(.+\)/, "")), blocks: sb ? sb.blocks : [], summary };
    });
  }
  const rkey = (r) => norm(r.site);
  const shortKey = (k) => k.replace(/(\d)?공장$/, "").slice(0, 2);
  function daysBetween(a, b) {
    const p = (s) => { const m = String(s || "").match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const x = p(a), y = p(b); return x && y ? Math.round((y - x) / 864e5) : null;
  }
  function renderCases(root, which) {
    const sites = siteSections();
    const issues = issuesList();
    const sel = Math.min(Math.max(1, which || store.get("case", 1)), REP.length || 1) - 1;
    const metrics = REP.map((r) => {
      const e = r.effect || {}; const num = (v) => parseFloat(String(v || "").replace(/[^\d.]/g, ""));
      return {
        kwp: r.kwp, amount: r.contract_amount, perkw: r.contract_amount / r.kwp,
        days: daysBetween(r.start_date, (r.inspection || "").slice(0, 12)),
        gen: num((e.gen || {}).value), selfRate: num(((e.self || {}).note || "").replace(/.*?([\d.]+)%.*/, "$1")),
        saving: num((e.saving || {}).value), re100: num((e.re100 || {}).value), payback: num((e.payback || {}).value),
      };
    });
    const rowsDef = [
      ["설비 용량", "kwp", (v) => fmt(v, 2) + " kWp"], ["계약 금액", "amount", (v) => eok(v)], ["kW당 사업비", "perkw", (v) => man(v) + "원"],
      ["착공 → 사용전검사", "days", (v) => v + "일", true], ["예상 발전량", "gen", (v) => fmt(v) + " kWh"], ["자가소비율", "selfRate", (v) => v + "%"],
      ["연간 절감액", "saving", (v) => man(v) + "원"], ["RE100 달성률", "re100", (v) => v + "%"], ["자부담 회수기간", "payback", (v) => v + "년", true],
    ];
    const cats = {}; issues.forEach((x) => { cats[x.cat] = (cats[x.cat] || 0) + 1; });
    root.innerHTML = `<div class="wrap view">
      <div class="page-banner reveal" style="--bgimg:url('${((REP[1] || REP[0] || {}).location_img || {}).src || ""}')"><div class="eyebrow">PART 2 · 2026 군산 사업 분석</div><h1>현장 사례집</h1>
        <p>준공 현장 ${REP.length}곳의 시공완료보고서와 백서 7장 현장별 분석, 10장 이슈 레지스터를 현장 단위로 묶었습니다.</p>
        <div class="chips">${REP.map((r) => `<span>${esc(r.site)} <b>${fmt(r.kwp, 2)}kWp</b></span>`).join("")}<span>이슈 <b>${issues.length}</b>건</span></div></div>

      ${REP.length ? `<section class="card panel reveal"><h3>준공 현장 비교 <span class="from">시공완료보고서 기준 · 막대는 세 현장 중 최댓값 대비</span></h3>
      <div class="compare"><div class="compare-row h"><span>항목</span>${REP.map((r) => `<span>${esc(r.site)}</span>`).join("")}</div>
      ${rowsDef.map(([lab, k, f, low]) => { const vals = metrics.map((m) => m[k]); const mx = Math.max(...vals.filter(isFinite)); return `<div class="compare-row"><span>${lab}${low ? ' <small style="color:var(--ink-3)">(짧을수록 좋음)</small>' : ""}</span>${vals.map((v) => `<span class="cv"><b>${isFinite(v) ? f(v) : "–"}</b><i style="width:${isFinite(v) ? (v / mx * 100).toFixed(1) : 0}%;${low ? "background:var(--sun)" : ""}"></i></span>`).join("")}</div>`; }).join("")}</div></section>` : ""}

      ${REP.some((r) => r.pdf) ? `<section class="card panel reveal" style="margin-top:16px"><h3>시공완료보고서 내려받기 <span class="from">${REP[0].pdf && REP[0].pdf.enc ? "대외비 · 열람 암호 입력 후 내려받을 수 있습니다" : "원문 PDF"}</span></h3>
        <div class="dl-list">${REP.map((r, i) => r.pdf ? `<div class="dl-item"><span class="dl-ic">PDF</span><div><b>${esc(r.site)}</b><small>${esc(r.pdf.name)} · ${(r.pdf.size / 1048576).toFixed(1)}MB · ${esc(r.submitted || "")} 제출</small></div>${dlBtn(r, i, "btn")}</div>` : "").join("")}</div></section>` : ""}

      <section class="sec" id="case-detail-top">
        <div class="seg case-pick" id="case-pick" role="group" aria-label="현장 선택">${REP.map((r, i) => `<button type="button" data-i="${i + 1}" aria-pressed="${i === sel}">${esc(r.site)}</button>`).join("")}</div>
        <div id="case-detail"></div>
      </section>

      <section class="sec reveal"><div class="sec-head"><div><h2>진행 중 · 기타 현장</h2><p>백서 7장에 기록된 현장입니다. 누르면 해당 절로 이동합니다.</p></div><a class="from" href="#ch7">백서 7장 →</a></div>
        <div class="other-sites">${sites.filter((s) => !REP.some((r) => rkey(r) === s.key)).map((s) => `<a class="card" href="#${s.id}"><b>${esc(s.name)}</b><p>${esc(s.summary)}</p><span class="from">${esc(s.title.split(" ")[0])} 현장별 분석 →</span></a>`).join("")}</div></section>

      <section class="sec reveal" id="cases-issues"><div class="sec-head"><div><h2>이슈 · 교훈 레지스터</h2><p>${issues.length}건의 이슈를 원인과 재발 방지 대책으로 정리했습니다. 분류를 누르거나 검색해 걸러 보세요.</p></div><a class="from" href="#ch10">백서 10장 →</a></div>
        <div class="cat-bars" id="cat-bars"><button type="button" data-c="" aria-pressed="true"><b>${issues.length}</b><span>전체</span></button>${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<button type="button" data-c="${esc(c)}" aria-pressed="false"><b>${n}</b><span>${esc(c)}</span></button>`).join("")}</div>
        <div class="issues-tools"><input class="field" type="search" id="iss-q" placeholder="이슈 · 원인 · 대책 검색" aria-label="이슈 검색"><select class="field" id="iss-site" style="max-width:200px" aria-label="현장 필터"><option value="">모든 현장</option>${[...new Set(issues.flatMap((x) => x.site.split(/[·,→]/).map((s) => s.trim())))].filter(Boolean).map((s) => `<option>${esc(s)}</option>`).join("")}</select><span class="from" id="iss-n"></span></div>
        <div class="card" id="iss-list"></div></section>
    </div>`;

    const paintDetail = (i) => {
      const r = REP[i]; if (!r) return;
      store.set("case", i + 1);
      $$("#case-pick button", root).forEach((b) => b.setAttribute("aria-pressed", +b.dataset.i === i + 1));
      const sec = sites.find((s) => s.key === rkey(r));
      const sk = shortKey(rkey(r));
      const related = issues.filter((x) => x.site.includes(sk) || x.site.includes("전 현장"));
      const e = r.effect || {};
      const pics = [r.hero_img, r.location_img, ...r.photos.filter((p) => /구조물|모듈/.test(p.cap)).slice(0, 1)].filter((x) => x && x.src);
      const photoCaps = [...new Set(r.photos.map((p) => p.cap))];
      const kpi = (cls, k, v, s) => `<div class="kpi ${cls}"><div class="k">${esc(k)}</div><div class="v">${esc(shortWon(v))}</div>${s ? `<div class="s">${esc(s)}</div>` : ""}</div>`;
      $("#case-detail", root).innerHTML = `
        <div class="case-head reveal">
          <div class="case-photos" data-lbgroup="hero">${pics.map((p, k) => `<button type="button" data-lb="${p.src}" data-cap="${esc(r.site)} ${k === 0 ? "전경" : k === 1 ? "설치 위치" : "시공"}"><img src="${p.src}" alt="" loading="lazy"></button>`).join("")}</div>
          <div class="card case-facts"><div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip good">준공</span><span class="chip info">자가소비 (갑)</span><span class="chip">${esc(r.submitted || "")} 보고서 제출</span></div>
            <h2 style="margin-top:10px">${esc(r.site)}</h2><p style="margin:0;color:var(--ink-2);font-size:13.5px">${esc(r.address || "")}</p>
            <dl class="kv"><dt>설비</dt><dd>${esc(r.capacity_text || "")}</dd>${r.contract_amount ? `<dt>계약 금액</dt><dd><span class="mono">${fmt(r.contract_amount)}</span>원 (VAT 별도)</dd>
              <dt>재원</dt><dd>정부지원 <span class="mono">${man((r.funding || {})["정부지원금"])}</span> · 자부담 <span class="mono">${man((r.funding || {})["자기부담금"])}</span></dd>` : `<dt>계약 · 재원</dt><dd><span class="lockph">대외비 — 암호를 입력하면 보입니다</span></dd>`}
              <dt>공사 기간</dt><dd>${esc(r.build_period || "")}</dd><dt>사용전검사</dt><dd>${esc(r.inspection || "")}</dd><dt>하자 보증</dt><dd>${esc(r.warranty || "")}</dd></dl>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px">${dlBtn(r, i)}<span class="from">${esc(r.submitted || "")} 제출본 원문</span></div></div>
        </div>
        <div class="kpis reveal">
          ${kpi("sun", "예상 발전량", (e.gen || {}).value || "–", (e.gen || {}).note)}${kpi("cell", "자가소비량", (e.self || {}).value || "–", (e.self || {}).note)}
          ${kpi("leaf", "연간 전기요금 절감", (e.saving || {}).value || "–", (e.saving_rate ? "절감률 " + e.saving_rate.value : ""))}${kpi("navy", "RE100 달성률", (e.re100 || {}).value || "–", (e.re100 || {}).note)}
          ${kpi("leaf", "온실가스 감축", (e.ghg || {}).value || "–", "연간")}${kpi("sun", "자부담 회수기간", (e.payback || {}).value || "–", e.extra ? "요금제 변경 시 추가 절감 " + e.extra.value : "")}
        </div>
        <div class="grid-2 sec" style="margin-top:20px">
          <div class="card panel reveal"><h3>공정 경과 <span class="from">보고서 5.2</span></h3><ol class="tl">${(r.timeline || []).map((t, k) => `<li class="${/계약|검사|허가|착공/.test(t.text) ? "major" : ""}" style="animation-delay:${k * 60}ms"><span class="d">${esc(t.date)}</span><span>${esc(t.text)}</span></li>`).join("")}</ol></div>
          <div style="display:grid;gap:16px;align-content:start">
            <div class="card panel reveal"><h3>공종별 사업비 <span class="from">보고서 3.3 · VAT 별도</span></h3>${r.cost_breakdown ? donut(r.cost_breakdown) : lockedBox("block")}</div>
            <div class="card panel reveal"><h3>사용전검사 항목 <span class="from">${esc(r.inspection_when || "")}</span></h3><div class="checks">${(r.checks || []).map((c) => `<div><span class="ok">${c.ok ? "✓" : "✕"}</span><span>${esc(c.item)}</span><small>${esc(c.result)}</small></div>`).join("")}</div></div>
          </div>
        </div>
        ${r.monthly && r.monthly.length ? `<div class="card panel reveal sec" style="margin-top:16px"><h3>월별 공장 사용량과 태양광 발전 <span class="from">보고서 8.2 예상치 · kWh</span></h3>${monthlyChart(r.monthly)}
          <div class="legend"><span><i style="background:var(--line-2);height:10px"></i>공장 사용량</span><span><i style="background:var(--sun);height:10px"></i>예상 발전량</span><span><i style="background:var(--cell);height:10px"></i>자가소비량</span></div></div>` : ""}
        <div class="card panel reveal" style="margin-top:16px"><h3>현장 사진 <span class="from">보고서 9장 사진대지 · 공정별 ${r.photos.length}장</span></h3>
          <div class="seg" id="ph-tabs" role="group" aria-label="공정 선택">${photoCaps.map((c, k) => `<button type="button" data-c="${esc(c)}" aria-pressed="${k === 0}">${esc(c)}</button>`).join("")}</div>
          <div id="ph-grid"></div></div>
        ${sec ? `<div class="card panel reveal" style="margin-top:16px"><h3>백서 현장별 분석 · ${esc(sec.title)} <a class="from" href="#${sec.id}">백서에서 보기 →</a></h3><div class="doc ${prefs.guide ? "" : "hide-guide"} ${prefs.secret ? "" : "hide-secret"}" style="max-width:none">${renderBlocks(sec.blocks.filter((b) => b.t !== "gallery"))}</div></div>` : ""}
        ${related.length ? `<div class="card reveal" style="margin-top:16px"><div class="panel" style="padding-bottom:0"><h3>이 현장 관련 이슈 ${related.length}건</h3></div>${related.map(issueRow).join("")}</div>` : ""}`;
      const grid = $("#ph-grid", root);
      const showCap = (cap) => {
        $$("#ph-tabs button", root).forEach((b) => b.setAttribute("aria-pressed", b.dataset.c === cap));
        grid.innerHTML = renderGallery(r.photos.filter((p) => p.cap === cap).map((p) => ({ ...p, cap: "" })), "site");
        $$("#ph-grid [data-lb]", root).forEach((b) => { b.dataset.cap = `${r.site} · ${cap}`; });
      };
      $("#ph-tabs", root).addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) showCap(b.dataset.c); });
      if (photoCaps.length) showCap(photoCaps[0]);
      observe($("#case-detail", root));
    };
    $("#case-pick", root).addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) paintDetail(+b.dataset.i - 1); });
    paintDetail(sel);

    // 이슈 필터
    let cat = "";
    const paintIssues = () => {
      const q = $("#iss-q", root).value.trim().toLowerCase(); const st = $("#iss-site", root).value;
      const list = issues.filter((x) => (!cat || x.cat === cat) && (!st || x.site.includes(st)) && (!q || [x.issue, x.cause, x.fix, x.site].join(" ").toLowerCase().includes(q)));
      $("#iss-list", root).innerHTML = list.map(issueRow).join("") || '<p style="padding:14px">조건에 맞는 이슈가 없습니다.</p>';
      $("#iss-n", root).textContent = `${list.length}건 표시`;
    };
    $("#cat-bars", root).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; cat = b.dataset.c; $$("#cat-bars button", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); paintIssues(); });
    $("#iss-q", root).addEventListener("input", paintIssues);
    $("#iss-site", root).addEventListener("change", paintIssues);
    paintIssues();
    if (which) requestAnimationFrame(() => $("#case-detail-top", root).scrollIntoView({ block: "start" }));
  }
  // "약 25,295,320원" → "약 2,530만원"
  const shortWon = (v) => String(v || "").replace(/([\d,]{9,})원/, (m, n) => fmt(Math.round(+n.replace(/,/g, "") / 1e4)) + "만원");
  const CAT_CHIP = { "설계": "info", "인허가": "sun", "품질": "warn", "안전": "bad", "자재": "", "공정": "", "문서": "", "사업구조": "info" };
  function issueRow(x) {
    return `<div class="issue"><span class="no">#${x.no}</span><span class="dt">${esc(x.date)}</span><div><div class="meta"><span class="chip ${CAT_CHIP[x.cat] || ""}">${esc(x.cat)}</span><span class="chip">${esc(x.site)}</span></div>
      <b>${deco(esc(x.issue))}</b>${x.cause ? `<div class="cause">원인: ${esc(x.cause)}</div>` : ""}${x.fix ? `<div class="fix">${esc(x.fix)}</div>` : ""}</div></div>`;
  }
  const PALETTE = ["var(--navy)", "var(--sun)", "var(--cell)", "var(--leaf)", "var(--ink-3)", "var(--warn)"];
  function donut(items) {
    const total = items.reduce((s, x) => s + x.amount, 0) || 1; const R = 60, C = 2 * Math.PI * R; let off = 0;
    const segs = items.map((x, i) => { const L = x.amount / total * C; const s = `<circle class="donut-seg" r="${R}" cx="80" cy="80" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="26" stroke-dasharray="${L.toFixed(2)} ${(C - L).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 80)" style="animation-delay:${i * 120}ms"/>`; off += L; return s; }).join("");
    return `<div class="donut-wrap"><svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="공종별 사업비 구성">${segs}<text x="80" y="76" text-anchor="middle" style="font-size:11px;fill:var(--ink-3)">합계</text><text x="80" y="94" text-anchor="middle" class="mono" style="font-size:15px;font-weight:600;fill:var(--ink)">${eok(total)}</text></svg>
      <ul>${items.map((x, i) => `<li><i style="background:${PALETTE[i % PALETTE.length]}"></i><span>${esc(x.name)}</span><span>${man(x.amount)} · ${x.pct}%</span></li>`).join("")}</ul></div>`;
  }
  function monthlyChart(ms) {
    const W = 720, H = 240, L = 50, B = 26, T = 14, mx = Math.max(...ms.map((m) => Math.max(m.use, m.gen)));
    const step = niceStep(mx / 4), top = Math.ceil(mx / step) * step;
    const y = (v) => T + (H - T - B) * (1 - v / top); const bw = (W - L - 10) / ms.length;
    let g = ""; for (let v = 0; v <= top; v += step) g += `<line class="gl" x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v / 1000)}k</text>`;
    const bars = ms.map((m, i) => { const x = L + i * bw + 6; const w = (bw - 12) / 2;
      return `<rect class="bar-in" x="${x}" y="${y(m.use)}" width="${w}" height="${y(0) - y(m.use)}" fill="var(--line-2)" rx="2" style="animation-delay:${i * 40}ms"><title>${m.m}월 공장 사용량 ${fmt(m.use)} kWh</title></rect>
        <rect class="bar-in" x="${x + w + 2}" y="${y(m.gen)}" width="${w}" height="${y(0) - y(m.gen)}" fill="var(--sun)" rx="2" style="animation-delay:${i * 40 + 20}ms"><title>${m.m}월 예상 발전 ${fmt(m.gen)} kWh</title></rect>
        <rect class="bar-in" x="${x + w + 2}" y="${y(m.self)}" width="${w}" height="${y(0) - y(m.self)}" fill="var(--cell)" opacity=".85" rx="2" style="animation-delay:${i * 40 + 20}ms"><title>${m.m}월 자가소비 ${fmt(m.self)} kWh</title></rect>
        <text x="${x + w}" y="${H - 8}" text-anchor="middle">${m.m}월</text>`; }).join("");
    return `<div style="overflow-x:auto"><svg class="chart" viewBox="0 0 ${W} ${H}" style="min-width:520px" role="img" aria-label="월별 공장 사용량과 예상 발전량">${g}<line class="axis" x1="${L}" x2="${W - 6}" y1="${y(0)}" y2="${y(0)}"/>${bars}</svg></div>`;
  }
  function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }

  /* ======================================================================
     원가 분석 — 원가관리 툴(xlsx)의 계산을 그대로 재현
     ====================================================================== */
  const MARKET_ITEMS = [
    { key: "모듈", std: ["모듈"], basis: "모듈", qty: "W", unit: "원/W" },
    { key: "인버터", std: ["인버터"], basis: "인버터", qty: "invkW", unit: "원/kW" },
    { key: "구조물 자재 (제작)", std: ["구조물 자재"], basis: "구조물 자재 (제작)", qty: "kW", unit: "원/kW" },
    { key: "전기 자재", std: ["전기 자재"], basis: "전기 자재", qty: "kW", unit: "원/kW" },
    { key: "시공 노무 (구조·모듈 설치 + 전기)", std: ["구조·모듈 설치 노무", "전기 노무"], basis: null, qty: "kW", unit: "원/kW" },
    { key: "모니터링", std: ["모니터링"], basis: "모니터링", qty: "one", unit: "원/식" },
    { key: "장비 · 운반 · 현장경비", std: ["장비·운반·경비"], basis: "장비 · 운반 · 현장경비", qty: "kW", unit: "원/kW" },
    { key: "안전시설", std: ["안전시설"], basis: "안전시설 (난간 · 사다리)", qty: "kW", unit: "원/kW" },
  ];
  const SERVICE_STD = ["설계", "감리", "사용전검사", "구조검토", "인허가"];
  function basisMap(over) {
    const B = {}; (COST.basis || []).forEach((b) => { B[b.name] = b.value; });
    Object.assign(B, over || {}); return B;
  }
  function computeLabor(B, log) {
    const per = {}; // site → work → agg
    const rows = log.map((r) => {
      const tr = (COST.trades || {})[r.work] || {};
      const leadRate = B["노임 — " + tr.lead_trade] || 0, wRate = B["노임 — " + tr.worker_trade] || 0;
      const h = Math.max(0, (r.end - r.start) - (r.rest || 0));
      const g = h <= B["반일 판정 기준 (실작업시간)"] ? 0.5 : 1 + Math.max(0, h - 8) * (1 + B["연장근로 가산율"]) / 8;
      const persons = (r.lead || 0) + (r.workers || 0);
      const direct = g * ((r.lead || 0) * leadRate + (r.workers || 0) * wRate);
      const o = { ...r, h, g, persons, manday: persons * g, hours: persons * h, direct };
      const s = (per[r.site] = per[r.site] || {}); const a = (s[r.work] = s[r.work] || { persons: 0, manday: 0, hours: 0, direct: 0 });
      a.persons += persons; a.manday += o.manday; a.hours += o.hours; a.direct += direct;
      return o;
    });
    const k = 1 + B["간접노무비율"] + B["사회보험 사업주 부담률 (산재 제외)"] + B["공구손료율"];
    Object.values(per).forEach((s) => Object.values(s).forEach((a) => { a.fair = a.direct * k; a.cap = a.fair * (1 + B["시공사 마진 허용치"]); }));
    return { rows, per, k };
  }
  function verdict(rate, B) {
    if (!isFinite(rate)) return "–";
    if (rate > B["'과다' 판정 경계"]) return "과다";
    if (rate > B["시공사 마진 허용치"]) return "상회";
    if (rate < B["'하회' 판정 경계"]) return "하회";
    return "적정";
  }
  function computeCost(over, logOver) {
    const B = basisMap(over);
    const log = (COST.log || []).map((r, i) => ({ ...r, ...((logOver || {})[i] || {}) }));
    const labor = computeLabor(B, log);
    const margin = B["시공사 마진 허용치"];
    const sites = COST.sites.map((name) => {
      const info = COST.site_info[name] || {};
      const kW = info["설비용량 (kW)"], W = (info["모듈 수량 (장)"] || 0) * (info["모듈 정격 (W)"] || 0), invkW = info["인버터 용량 (kW)"];
      const short = name.slice(0, 2);
      const items = COST.quotes.filter((q) => name.startsWith(q.site) || q.site === short);
      const sum = (stds) => items.filter((q) => stds.includes(q.std)).reduce((s, q) => s + (q.amount || 0), 0);
      const lab = labor.per[name] || {};
      const fairLabor = ((lab["구조물"] || {}).fair || 0) + ((lab["전기"] || {}).fair || 0);
      const rows = MARKET_ITEMS.map((it) => {
        const quote = sum(it.std);
        const qty = it.qty === "W" ? W : it.qty === "invkW" ? invkW : it.qty === "one" ? 1 : kW;
        const unitBasis = it.basis ? B[it.basis] : fairLabor / kW;
        const market = it.basis ? unitBasis * qty : fairLabor;
        const excess = quote - market, rate = market ? quote / market - 1 : NaN, after = Math.max(0, quote - market * (1 + margin));
        return { ...it, quote, qty, unitQuote: quote / qty, unitBasis, market, excess, rate, after, v: verdict(rate, B) };
      });
      const tot = rows.reduce((a, r) => ({ quote: a.quote + r.quote, market: a.market + r.market, after: a.after + r.after }), { quote: 0, market: 0, after: 0 });
      tot.excess = tot.quote - tot.market; tot.rate = tot.quote / tot.market - 1; tot.v = verdict(tot.rate, B);
      const total = items.reduce((s, q) => s + (q.amount || 0), 0);
      const byStd = {}; items.forEach((q) => { byStd[q.std] = (byStd[q.std] || 0) + (q.amount || 0); });
      const indirect = (byStd["일반관리비"] || 0) + (byStd["보험료"] || 0) + (byStd["안전관리비"] || 0) + (byStd["단수정리"] || 0);
      const laborQ = (byStd["구조·모듈 설치 노무"] || 0) + (byStd["전기 노무"] || 0);
      const matl = ["모듈", "인버터", "배전반·보호계전", "모니터링", "구조물 자재", "강판·방수", "전기 자재"].reduce((s, k) => s + (byStd[k] || 0), 0);
      return {
        name, info, kW, W, invkW, items, rows, tot, total, perkW: total / kW, byStd, lab, fairLabor,
        ratios: {
          "일반관리비율": (byStd["일반관리비"] || 0) / (total - indirect),
          "보험료율 (노무비 대비)": (byStd["보험료"] || 0) / laborQ,
          "안전관리비율 (재료+노무 대비)": (byStd["안전관리비"] || 0) / (matl + laborQ),
        },
        services: SERVICE_STD.reduce((s, k) => s + (byStd[k] || 0), 0),
      };
    });
    // 3개 현장 합계
    const all = MARKET_ITEMS.map((it, i) => {
      const quote = sites.reduce((s, x) => s + x.rows[i].quote, 0), market = sites.reduce((s, x) => s + x.rows[i].market, 0), qty = sites.reduce((s, x) => s + x.rows[i].qty, 0);
      const after = sites.reduce((s, x) => s + x.rows[i].after, 0), rate = quote / market - 1;
      return { ...it, quote, market, qty, unitQuote: quote / qty, unitBasis: market / qty, excess: quote - market, rate, after, v: verdict(rate, B) };
    });
    const allTot = all.reduce((a, r) => ({ quote: a.quote + r.quote, market: a.market + r.market, after: a.after + r.after }), { quote: 0, market: 0, after: 0 });
    allTot.excess = allTot.quote - allTot.market; allTot.rate = allTot.quote / allTot.market - 1; allTot.v = verdict(allTot.rate, B);
    return { B, labor, sites, all, allTot, grand: sites.reduce((s, x) => s + x.total, 0) };
  }

  let costOver = store.get("basis", {});
  let logOver = store.get("log", {});
  function renderCost(root) {
    if (!COST) {
      root.innerHTML = `<div class="wrap view"><div class="page-banner"><div class="eyebrow">21장 원가 관리 · 원가관리 툴 연동</div><h1>원가 분석</h1><p>시공 견적의 항목별 시장 기준 대비 판정, 노무비 실투입 분석, 기준단가 편집과 새 견적 빠른 검토를 제공합니다.</p></div>${VAULT ? lockedBox("cost") : "<p>원가 데이터가 없습니다.</p>"}</div>`;
      return;
    }
    let scope = "all";
    const ch21 = chByNum(21);
    const structT = findTable(ch21, "구분", "항목");
    root.innerHTML = `<div class="wrap view">
      <div class="page-banner"><div class="eyebrow">21장 원가 관리 · 원가관리 툴 연동 · 대외비</div><h1>원가 분석</h1><p>${esc(COST.title)}</p></div>
      <div class="sec-head"><div>
      <p class="lead"> 원가관리 툴의 견적원본 · 기준단가 · 투입 인원 일지로 엑셀과 같은 계산을 이 화면에서 다시 합니다. 노란 칸(기준단가 · 인원 일지)을 바꾸면 모든 표가 바로 다시 계산됩니다.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="#s21-5">기준단가 근거 (21.5)</a><a class="btn" href="#s21-7">견적 검토 절차 (21.7)</a></div></div>
      <div class="stats" id="c-kpi" style="margin-top:6px"></div>
      <section class="sec reveal"><div class="sec-head"><div><h2>검토 결과</h2><p>원가관리 툴 '원가 검토 요약' 시트의 결론입니다 (${esc((COST.subtitle.match(/\d{4}-\d{2}-\d{2}[^|]*/) || [""])[0].trim())}).</p></div></div>
        <div class="findings">${COST.findings.map((f) => `<p>${esc(f)}</p>`).join("")}</div></section>

      <section class="sec reveal"><div class="sec-head"><div><h2>항목별 시장 기준 대비</h2><p>시장 비교 가능 항목 = 모듈 · 인버터 · 구조물 · 전기 자재 · 시공 노무 · 모니터링 · 장비 · 안전시설 (견적 총액의 약 80%). 시공 노무의 시장 기준은 실투입 공수 × 시중노임 + 부대비입니다.</p></div>
        <div class="seg" id="c-scope" role="group" aria-label="현장 선택"><button type="button" data-s="all" aria-pressed="true">3개 현장 합계</button>${COST.sites.map((s, i) => `<button type="button" data-s="${i}" aria-pressed="false">${esc(s)}</button>`).join("")}</div></div>
        <div id="c-items"></div>
        <div class="legend"><span><span class="verdict v-과다">과다</span> 기준 대비 ${pct(basisMap(costOver)["'과다' 판정 경계"])} 초과</span><span><span class="verdict v-상회">상회</span> 마진 허용치 초과</span><span><span class="verdict v-적정">적정</span></span><span><span class="verdict v-하회">하회</span> 10% 이상 낮음</span><span>막대: 가운데 선 = 시장 기준, 오른쪽 끝 = +200%</span></div></section>

      <section class="sec reveal"><div class="sec-head"><div><h2>노무비 — 견적 vs 실투입</h2><p>사진대지 일자별 업무일지의 인원 · 시간으로 적정 노무비를 계산했습니다. 점선은 시공사 마진을 더한 상한입니다.</p></div></div>
        <div class="grid-2"><div class="card panel" id="c-labor"></div><div class="card panel" id="c-prod"></div></div>
        <div class="findings" style="margin-top:12px">${(COST.labor_findings || []).map((f) => `<p>${esc(f)}</p>`).join("")}</div>
        <details class="card" style="margin-top:12px"><summary class="panel" style="cursor:pointer;font-weight:600">투입 인원 일지 ${COST.log.length}줄 — 인원 · 시간 고치기 (노란 칸)</summary>
          <div style="padding:0 18px 18px"><div class="tbl editable" id="c-log"></div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" type="button" id="c-log-reset">일지 원래 값으로</button><span class="from">${COST.log_notes.map(esc).join("<br>")}</span></div></div></details></section>

      <section class="sec reveal"><div class="sec-head"><div><h2>기준단가</h2><p>원가관리 툴 '기준단가' 시트의 노란 칸입니다. 값을 바꾸면 이 기기에서만 저장됩니다. 근거 등급: A 공식 · 실적 / B 언론 · 공개자료 / C 내부 산출 / D 추정.</p></div>
        <button class="btn" type="button" id="c-reset">기준단가 원래 값으로</button></div>
        <div class="basis-grid" id="c-basis"></div></section>

      <section class="sec reveal"><div class="sec-head"><div><h2>현장 간 kW당 단가</h2><p>같은 항목을 kW당 금액으로 바꿔 비교합니다. 굵은 값이 세 현장 중 최고 단가입니다.</p></div></div><div id="c-perkw"></div>
        <div class="grid-2" style="margin-top:16px"><div class="card panel" id="c-ratio"></div><div class="card panel" id="c-market"></div></div></section>

      <section class="sec reveal"><div class="sec-head"><div><h2>새 견적 빠른 검토</h2><p>새로 받은 견적의 항목 금액을 넣으면 같은 기준으로 판정합니다. 시공 노무 기준은 세 현장 실투입 평균(원/kW)을 씁니다. 처음 값은 <b>예시</b>(<span id="q-src"></span> 견적을 100kW로 환산)입니다.</p></div></div>
        <div class="card quick"><div class="fields" id="q-fields"></div><div id="q-out" style="min-width:0"></div></div></section>

      ${structT ? `<section class="sec reveal"><div class="sec-head"><div><h2>원가 구조 — 100kW 지붕형 예시</h2><p>백서 21.6의 기준단가 계산 예시입니다. 모듈 · 인버터 · 구조물이 직접원가의 약 절반을 차지합니다.</p></div><a class="from" href="#s21-6">백서 21.6 →</a></div><div class="card panel" id="c-struct"></div></section>` : ""}

      <section class="sec reveal"><div class="sec-head"><div><h2>출처</h2><p>조회일 ${esc((COST.source_date || "").replace("조회일", "").trim())}</p></div></div>
        <div class="tbl"><table><thead><tr><th>자료</th><th>쓴 곳</th><th>위치</th></tr></thead><tbody>${COST.sources.map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.used)}</td><td>${/^https?:/.test(s.where) ? `<a href="${esc(s.where)}" target="_blank" rel="noopener">${esc(s.where.replace(/^https?:\/\//, "").slice(0, 48))}…</a>` : esc(s.where)}</td></tr>`).join("")}</tbody></table></div></section>
    </div>`;

    const paint = () => {
      const R = computeCost(costOver, logOver); const B = R.B;
      const lab3 = R.sites.reduce((a, s) => ({ q: a.q + s.rows[4].quote, f: a.f + s.rows[4].market }), { q: 0, f: 0 });
      $("#c-kpi", root).innerHTML = [
        [eok(R.grand), "견적 총액 합계 (VAT 별도)"], [man(R.allTot.excess) + "원", `비교 항목 기준 초과 (${pct(R.allTot.rate)})`],
        [man(R.allTot.after) + "원", `마진 ${pct(B["시공사 마진 허용치"])} 반영 후 초과 (현장별 합산)`], [(lab3.q / lab3.f).toFixed(1) + "배", "시공 노무 견적 ÷ 적정"],
      ].map(([v, k]) => `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join("");
      // 항목 표
      const rows = scope === "all" ? R.all : R.sites[+scope].rows; const tot = scope === "all" ? R.allTot : R.sites[+scope].tot;
      const bar = (rate) => { const w = Math.min(Math.abs(rate) / 2, 1) * 66.7; return `<div class="diverge">${rate >= 0 ? `<i class="pos" style="width:${w.toFixed(1)}%"></i>` : `<i class="neg" style="width:${(Math.min(Math.abs(rate), .5) * 66.7).toFixed(1)}%"></i>`}</div>`; };
      $("#c-items", root).innerHTML = `<div class="tbl cost-table"><table><thead><tr><th>항목</th><th class="n">견적 단가</th><th class="n">기준 단가</th><th class="n">견적 금액</th><th class="n">시장 기준</th><th class="n">초과액</th><th>초과율</th><th class="n">마진 반영 후</th><th>판정</th></tr></thead><tbody>
        ${rows.slice().sort((a, b) => scope === "all" ? b.excess - a.excess : 0).map((r) => `<tr><td><b>${esc(r.key)}</b></td><td class="n">${fmt(r.unitQuote, r.unit === "원/W" ? 1 : 0)}<span class="sub">${r.unit}</span></td><td class="n">${fmt(r.unitBasis, r.unit === "원/W" ? 1 : 0)}</td>
          <td class="n">${man(r.quote)}</td><td class="n">${man(r.market)}</td><td class="n" style="color:${r.excess > 0 ? "var(--bad)" : "var(--cell)"}">${r.excess > 0 ? "+" : ""}${man(r.excess)}</td>
          <td><div style="display:flex;gap:8px;align-items:center"><span class="mono" style="width:52px;text-align:right">${r.rate > 0 ? "+" : ""}${pct(r.rate)}</span>${bar(r.rate)}</div></td><td class="n">${man(r.after)}</td><td><span class="verdict v-${r.v}">${r.v}</span></td></tr>`).join("")}
        <tr><td class="key">합계 (비교 가능 항목)</td><td></td><td></td><td class="n"><b>${man(tot.quote)}</b></td><td class="n"><b>${man(tot.market)}</b></td><td class="n" style="color:var(--bad)"><b>+${man(tot.excess)}</b></td><td><span class="mono">+${pct(tot.rate)}</span></td><td class="n"><b>${man(tot.after)}</b></td><td><span class="verdict v-${tot.v}">${tot.v}</span></td></tr>
        </tbody></table></div><p class="from">금액 단위 만원 · 견적 단가는 ${scope === "all" ? "3개 현장 가중 평균" : "해당 현장 견적서 기준"}</p>`;
      // 노무 막대
      const labRows = R.sites.flatMap((s) => [["구조물", s], ["전기", s]].map(([w, s2]) => {
        const a = (s2.lab[w] || {}); const q = (s2.byStd[w === "구조물" ? "구조·모듈 설치 노무" : "전기 노무"] || 0);
        return { site: s2.name, work: w, q, f: a.fair || 0, c: a.cap || 0, md: a.manday || 0 };
      }));
      const mxq = Math.max(...labRows.map((x) => x.q));
      $("#c-labor", root).innerHTML = `<h3>현장 · 공종별 노무비 <span class="from">빨강 = 견적, 초록 = 적정</span></h3><div class="labor-bars">${labRows.map((x) => `<div class="lbar"><span>${esc(x.site)}<br><small style="color:var(--ink-3)">${x.work} · ${fmt(x.md, 1)}공수</small></span>
        <span class="tr" title="견적 ${man(x.q)} · 적정 ${man(x.f)} · 상한 ${man(x.c)}"><i class="q" style="width:${(x.q / mxq * 100).toFixed(1)}%"></i><i class="f" style="width:${(x.f / mxq * 100).toFixed(1)}%"></i><i class="c" style="width:${(x.c / mxq * 100).toFixed(1)}%"></i></span>
        <span class="x" style="color:${x.q / x.f > 1 + B["시공사 마진 허용치"] ? "var(--bad)" : "var(--leaf)"}">${x.f ? (x.q / x.f).toFixed(1) + "×" : "–"}</span></div>`).join("")}</div>`;
      $("#c-prod", root).innerHTML = `<h3>생산성 지표 <span class="from">구조물 + 전기</span></h3><div class="tbl cost-table" style="margin:0"><table><thead><tr><th>현장</th><th class="n">kW</th><th class="n">인·일/kW</th><th class="n">적정 원/kW</th><th class="n">견적 원/kW</th><th class="n">배수</th></tr></thead><tbody>
        ${R.sites.map((s) => { const md = ((s.lab["구조물"] || {}).persons || 0) + ((s.lab["전기"] || {}).persons || 0); const q = s.rows[4].quote; return `<tr><td>${esc(s.name)}</td><td class="n">${fmt(s.kW, 1)}</td><td class="n">${(md / s.kW).toFixed(3)}</td><td class="n">${fmt(s.fairLabor / s.kW)}</td><td class="n">${fmt(q / s.kW)}</td><td class="n"><b>${(q / s.fairLabor).toFixed(1)}</b></td></tr>`; }).join("")}
        </tbody></table></div><p class="from" style="margin-top:8px">적정 노무비 = 직접노무비 × ${R.labor.k.toFixed(2)} (간접 ${pct(B["간접노무비율"])} + 사회보험 ${pct(B["사회보험 사업주 부담률 (산재 제외)"])} + 공구손료 ${pct(B["공구손료율"])})</p>`;
      // 일지
      $("#c-log", root).innerHTML = `<table><thead><tr><th>현장</th><th>일자</th><th>공종</th><th>작업 내용</th><th>반장</th><th>작업자</th><th>시작</th><th>종료</th><th>휴게</th><th class="n">공수</th><th class="n">직접노무비</th></tr></thead><tbody>
        ${R.labor.rows.map((r, i) => `<tr><td>${esc(r.site)}</td><td class="mono">${esc(r.date)}</td><td>${esc(r.work)}</td><td style="min-width:220px">${esc(r.desc)}<span class="sub" style="display:block;color:var(--ink-3);font-size:11.5px">${esc(r.basis || "")}</span></td>
          <td><input data-i="${i}" data-k="lead" type="number" min="0" step="1" value="${r.lead}" aria-label="반장 수"></td><td><input data-i="${i}" data-k="workers" type="number" min="0" step="1" value="${r.workers}" aria-label="작업자 수"></td>
          <td><input data-i="${i}" data-k="start" type="text" value="${hhmm(r.start)}" aria-label="시작 시각"></td><td><input data-i="${i}" data-k="end" type="text" value="${hhmm(r.end)}" aria-label="종료 시각"></td><td><input data-i="${i}" data-k="rest" type="number" min="0" step="0.5" value="${r.rest}" aria-label="휴게 시간"></td>
          <td class="n">${fmt(r.manday, 2)}</td><td class="n">${fmt(r.direct)}</td></tr>`).join("")}</tbody></table>`;
      // 기준단가
      const orig = basisMap({});
      $("#c-basis", root).innerHTML = COST.basis.map((b) => { const isPct = b.unit === "%"; const v = B[b.name]; const changed = costOver[b.name] != null && costOver[b.name] !== orig[b.name];
        return `<label class="${changed ? "changed" : ""}"><span><b>${esc(b.name)}</b> <span class="unit">${esc(isPct ? "%" : b.unit)}</span> ${b.grade ? `<span class="chip" style="font-size:10.5px">${esc(b.grade)}</span>` : ""}</span>
          <input type="number" data-b="${esc(b.name)}" data-pct="${isPct ? 1 : 0}" value="${isPct ? +(v * 100).toFixed(4) : v}" step="any">
          <small>${b.range ? "범위 " + esc(b.range) + " · " : ""}${esc(b.basis || "")}</small></label>`; }).join("");
      // kW당 비교
      const stdList = ["설계", "감리", "사용전검사", "구조검토", "인허가"];
      const groups = [["설계 · 인허가 · 감리 용역", stdList], ["모듈", ["모듈"]], ["인버터", ["인버터"]], ["배전반 · 보호계전", ["배전반·보호계전"]], ["모니터링", ["모니터링"]], ["구조물 자재 (제작)", ["구조물 자재"]], ["강판 · 방수", ["강판·방수"]], ["전기 자재", ["전기 자재"]], ["구조 · 모듈 설치 노무", ["구조·모듈 설치 노무"]], ["전기 노무", ["전기 노무"]], ["장비 · 운반 · 현장경비", ["장비·운반·경비"]], ["안전시설", ["안전시설"]], ["상계거래 시공", ["상계거래 시공"]], ["일반관리비", ["일반관리비"]], ["보험료", ["보험료"]], ["안전관리비", ["안전관리비"]]];
      $("#c-perkw", root).innerHTML = `<div class="tbl cost-table"><table><thead><tr><th>항목 (원/kW)</th>${R.sites.map((s) => `<th class="n">${esc(s.name)}</th>`).join("")}<th class="n">최고 − 최저</th></tr></thead><tbody>
        ${groups.map(([lab, stds]) => { const v = R.sites.map((s) => stds.reduce((a, k) => a + (s.byStd[k] || 0), 0) / s.kW); const mx = Math.max(...v), mn = Math.min(...v);
          return `<tr><td>${esc(lab)}</td>${v.map((x) => `<td class="n" style="${x === mx && mx > mn ? "font-weight:700;color:var(--bad)" : ""}">${fmt(x)}</td>`).join("")}<td class="n">${fmt(mx - mn)}</td></tr>`; }).join("")}
        <tr><td class="key">합계 (원/kW)</td>${R.sites.map((s) => `<td class="n"><b>${fmt(s.perkW)}</b></td>`).join("")}<td class="n">${fmt(Math.max(...R.sites.map((s) => s.perkW)) - Math.min(...R.sites.map((s) => s.perkW)))}</td></tr></tbody></table></div>`;
      const rk = Object.keys(R.sites[0].ratios);
      const refs = { "일반관리비율": B["일반관리비율 상한"], "보험료율 (노무비 대비)": B["보험료율 (산재+고용, 노무비 대비)"], "안전관리비율 (재료+노무 대비)": B["산업안전보건관리비율 (재료+노무 대비)"] };
      $("#c-ratio", root).innerHTML = `<h3>간접비 · 법정경비 계상 비율</h3><div class="tbl cost-table" style="margin:0"><table><thead><tr><th>항목</th>${R.sites.map((s) => `<th class="n">${esc(s.name.slice(0, 2))}</th>`).join("")}<th class="n">기준</th></tr></thead><tbody>
        ${rk.map((k) => `<tr><td>${esc(k)}</td>${R.sites.map((s) => `<td class="n">${pct(s.ratios[k], 2)}</td>`).join("")}<td class="n">${pct(refs[k], 2)}</td></tr>`).join("")}</tbody></table></div>
        <p class="from" style="margin-top:8px">${R.sites.filter((x) => !x.byStd["안전관리비"]).map((x) => esc(x.name)).join(", ") || "–"}: 안전관리비가 별도 항목 없이 다른 항목에 합산 기재되어 0%로 보입니다. 금액보다 증빙 기반 정산 방식이 핵심입니다.</p>`;
      const mk = COST.market || []; const mvals = mk.flatMap((x) => x.values); const mmx = Math.max(...mvals), mmn = Math.min(...mvals) * 0.97;
      $("#c-market", root).innerHTML = `<h3>총액 기준 시장 비교 <span class="from">kW당, 원</span></h3>${R.sites.map((s, i) => `<div style="margin-bottom:10px"><b style="font-size:13px">${esc(s.name)}</b>${mk.map((x, j) => `<div class="hbar"><span style="font-size:12px">${esc(x.name.replace(/\s*\(.*\)/, ""))}</span><span class="track"><span class="fill" style="display:block;width:${((x.values[i] - mmn) / (mmx - mmn) * 100).toFixed(1)}%;background:${j === 0 ? "var(--sun)" : "var(--navy)"}"></span></span><span class="n" style="font-size:11.5px">${fmt(x.values[i] / 1e4, 1)}만</span></div>`).join("")}</div>`).join("")}
        <p class="from">${mk.slice(1).map((x) => esc(x.source)).join(" · ")} · 막대는 ${fmt(mmn / 1e4)}만원/kW부터</p>`;
      paintQuick(R);
      observe(root);
    };
    // 빠른 검토
    let quick = null;
    const paintQuick = (R) => {
      const avgLabor = R.sites.reduce((s, x) => s + x.fairLabor, 0) / R.sites.reduce((s, x) => s + x.kW, 0);
      if (!quick) {
        const h = R.sites.reduce((a, b) => (b.kW > a.kW ? b : a)); const f = 100 / h.kW; $("#q-src", root).textContent = h.name;
        quick = { kW: 100, W: 100000, invkW: 100 };
        MARKET_ITEMS.forEach((it, i) => { quick[it.key] = Math.round(h.rows[i].quote * (it.qty === "one" ? 1 : f) / 1e4) * 1e4; });
        $("#q-fields", root).innerHTML = `<label>설비 용량 (kW)<input id="q-kW" type="number" value="100" step="any"></label><label>인버터 용량 (kW)<input id="q-invkW" type="number" value="100" step="any"></label>` +
          MARKET_ITEMS.map((it) => `<label>${esc(it.key)} 견적 금액 (원)<input type="number" data-q="${esc(it.key)}" value="${quick[it.key]}" step="10000"></label>`).join("");
        $("#q-fields", root).addEventListener("input", (e) => {
          const t = e.target; if (t.id === "q-kW") { quick.kW = +t.value; quick.W = quick.kW * 1000; } else if (t.id === "q-invkW") quick.invkW = +t.value; else if (t.dataset.q) quick[t.dataset.q] = +t.value;
          paintQuick(computeCost(costOver, logOver));
        });
      }
      const B = R.B; let tq = 0, tm = 0;
      const rows = MARKET_ITEMS.map((it) => {
        const qty = it.qty === "W" ? quick.W : it.qty === "invkW" ? quick.invkW : it.qty === "one" ? 1 : quick.kW;
        const market = (it.basis ? B[it.basis] : avgLabor) * qty; const q = quick[it.key] || 0; tq += q; tm += market;
        const rate = q / market - 1; return { it, q, market, rate, v: verdict(rate, B) };
      });
      const trate = tq / tm - 1;
      $("#q-out", root).innerHTML = `<div class="tbl cost-table" style="margin-top:0"><table><thead><tr><th>항목</th><th class="n">견적</th><th class="n">시장 기준</th><th class="n">차이</th><th>판정</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${esc(r.it.key)}</td><td class="n">${man(r.q)}</td><td class="n">${man(r.market)}</td><td class="n">${r.rate > 0 ? "+" : ""}${pct(r.rate)}</td><td><span class="verdict v-${r.v}">${r.v}</span></td></tr>`).join("")}
        <tr><td class="key">합계</td><td class="n"><b>${man(tq)}</b></td><td class="n"><b>${man(tm)}</b></td><td class="n"><b>${trate > 0 ? "+" : ""}${pct(trate)}</b></td><td><span class="verdict v-${verdict(trate, B)}">${verdict(trate, B)}</span></td></tr></tbody></table></div>
        <p class="from">금액 단위 만원 · 비교 항목 kW당 ${fmt(tq / quick.kW)}원 · 시공 노무 기준 ${fmt(avgLabor)}원/kW (3개 현장 실투입 평균). 과다 · 상회 항목은 21.9 양식으로 내역을 다시 요청합니다.</p>`;
    };
    $("#c-scope", root).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; scope = b.dataset.s; $$("#c-scope button", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); paint(); });
    $("#c-basis", root).addEventListener("change", (e) => {
      const t = e.target; if (!t.dataset.b) return; let v = parseFloat(t.value); if (!isFinite(v)) return; if (t.dataset.pct === "1") v = v / 100;
      costOver = { ...costOver, [t.dataset.b]: v }; store.set("basis", costOver); paint(); toast("기준단가를 바꿨습니다. 모든 표를 다시 계산했습니다.");
    });
    $("#c-reset", root).addEventListener("click", () => { costOver = {}; store.set("basis", costOver); paint(); toast("기준단가를 원래 값으로 돌렸습니다."); });
    $("#c-log", root).addEventListener("change", (e) => {
      const t = e.target; if (!t.dataset.k) return; const i = +t.dataset.i; let v = t.value;
      v = (t.dataset.k === "start" || t.dataset.k === "end") ? parseHM(v) : parseFloat(v); if (v == null || !isFinite(v)) return;
      logOver = { ...logOver, [i]: { ...(logOver[i] || {}), [t.dataset.k]: v } }; store.set("log", logOver); paint();
    });
    $("#c-log-reset", root).addEventListener("click", () => { logOver = {}; store.set("log", logOver); paint(); toast("투입 인원 일지를 원래 값으로 돌렸습니다."); });
    paint();
    if (structT) {
      const rows = bodyRows(structT).filter((r) => /^\d[\d,]*$/.test((r[3] || "").replace(/\s/g, "")) && r[0] !== "소계" && r[0] !== "비교" && r[0] !== "선택");
      const tot = rows.reduce((s, r) => s + parseFloat(r[3].replace(/,/g, "")), 0);
      const col = (g) => ({ "자재": "var(--cell)", "장비": "var(--ink-3)", "노무": "var(--sun)", "안전": "var(--warn)", "간접": "var(--leaf)" }[g] || "var(--navy)");
      const shade = (i) => 100 - (i % 4) * 14;
      $("#c-struct", root).innerHTML = `<div class="stack">${rows.map((r, i) => `<span title="${esc(r[1])} ${r[3]}만원" style="flex-grow:${parseFloat(r[3].replace(/,/g, ""))};background:color-mix(in srgb, ${col(r[0])} ${shade(i)}%, var(--paper))"></span>`).join("")}</div>
        <div class="stack-legend">${rows.map((r, i) => `<div><i style="background:color-mix(in srgb, ${col(r[0])} ${shade(i)}%, var(--paper))"></i><span>${esc(r[0])} · ${esc(r[1])}</span><b>${r[3]}만</b></div>`).join("")}</div>
        <p class="from" style="margin-top:10px">직접원가 합계 ${fmt(tot)}만원 (약 ${fmt(tot / 100)}만원/kW, 지붕 보강 제외) · 시장 총공사비 100kW급 142만원/kW와의 차이에는 일반관리비 · 이윤 · 보험 · 하자 담보가 들어 있습니다.</p>`;
    }
  }
  const hhmm = (h) => { if (!isFinite(h)) return ""; const H = Math.floor(h), M = Math.round((h - H) * 60); return String(H).padStart(2, "0") + ":" + String(M).padStart(2, "0"); };
  const parseHM = (s) => { const m = String(s).trim().match(/^(\d{1,2})(?::(\d{2}))?$/); return m ? +m[1] + (+(m[2] || 0)) / 60 : null; };

  /* ---------- 대외비 잠금 해제 ---------- */
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  let vaultKey = null;
  const PUBLIC_URL = "https://yuhost-solar-whitepaper.netlify.app";
  async function downloadReport(i, btn) {
    const r = REP[i], pdf = r && r.pdf; if (!pdf) return;
    if (!pdf.enc) {
      const a = document.createElement("a"); a.href = pdf.src; a.download = pdf.name; document.body.appendChild(a); a.click(); a.remove();
      if (/claude\.ai|claudeusercontent/.test(location.hostname)) toast("이 화면에서 내려받기가 막히면 공개 사이트에서 받으세요: " + PUBLIC_URL);
      return;
    }
    if (!vaultKey) { askPassword(); toast("시공완료보고서는 대외비입니다. 암호를 입력한 뒤 다시 누르세요."); return; }
    const old = btn ? btn.innerHTML : "";
    try {
      if (btn) { btn.disabled = true; btn.textContent = "내려받는 중…"; }
      const buf = await (await fetch(pdf.src)).arrayBuffer();
      const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(pdf.iv) }, vaultKey, buf);
      const url = URL.createObjectURL(new Blob([plainBuf], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = pdf.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast(pdf.name + " 을(를) 내려받았습니다.");
    } catch (e) { toast("내려받지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요."); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = old; } }
  }
  const dlBtn = (r, i, cls = "btn primary") => r.pdf ? `<button type="button" class="${cls}" data-dl="${i}">${r.pdf.enc && !unlocked ? "🔒 " : "⬇ "}시공완료보고서 PDF <small class="mono" style="opacity:.75">${(r.pdf.size / 1048576).toFixed(1)}MB</small></button>` : "";
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-dl]"); if (b) { e.preventDefault(); downloadReport(+b.dataset.dl, b); } });
  async function decryptVault(pw) {
    const v = VAULT;
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(v.salt), iterations: v.iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const gz = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(v.iv) }, key, b64(v.ct));
    vaultKey = key;
    const txt = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    return JSON.parse(txt);
  }
  async function unlock(pw) {
    const full = await decryptVault(pw);
    WP = full.wp; COST = full.cost; REP = full.reports || REP; unlocked = true;
    indexWP(); searchIndex.cache = null;
    try { sessionStorage.setItem("yh-solar:pw", pw); } catch (e) { /* 저장 불가 */ }
    paintLockBtn(); route();
  }
  function paintLockBtn() {
    const b = $("#unlock"); if (!b) return;
    if (!VAULT) { b.hidden = true; return; }
    b.classList.toggle("on", unlocked);
    b.innerHTML = unlocked ? '🔓<span class="t"> 대외비 열림</span>' : '🔒<span class="t"> 대외비 열기</span>';
  }
  function askPassword() {
    if (unlocked) { toast("대외비 내용이 이미 열려 있습니다."); return; }
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<form><h2>🔒 대외비 열람</h2><p>원가 분석, 시공사 비교 · 협력사 평가, 거래 단가 같은 대외비 내용은 사내 인원만 볼 수 있습니다. 열람 암호를 입력하세요.</p>
      <input type="password" id="pw" autocomplete="current-password" placeholder="열람 암호" aria-label="열람 암호"><div class="err" id="pw-err"></div>
      <div class="row"><button type="button" class="btn" data-x>취소</button><button type="submit" class="btn primary">열기</button></div></form>`;
    const close = () => m.remove();
    m.addEventListener("click", (e) => { if (e.target === m || e.target.dataset.x !== undefined) close(); });
    m.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, pw = $("#pw", m).value;
      $("#pw-err", m).textContent = "확인 중…";
      try { await unlock(pw); close(); toast("대외비 내용을 열었습니다. 이 탭을 닫으면 다시 잠깁니다."); }
      catch (err) { $("#pw-err", m).textContent = "암호가 맞지 않습니다. 다시 입력하세요."; f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); }
    });
    document.body.appendChild(m); $("#pw", m).focus();
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-unlock], .lockph, #unlock")) { e.preventDefault(); askPassword(); }
  });

  /* ---------- 라우터 ---------- */
  let cleanup = [];
  function route() {
    cleanup.forEach((f) => f()); cleanup = [];
    const h = decodeURIComponent(location.hash.slice(1)) || "home";
    const main = $("#app");
    let tab = "home";
    if (h === "home") { renderHome(main); }
    else if (h === "cases" || h === "cases-issues") { tab = "cases"; renderCases(main, 0); if (h === "cases-issues") requestAnimationFrame(() => { const el = $("#cases-issues"); el && el.scrollIntoView(); }); }
    else if (/^case-\d+$/.test(h)) { tab = "cases"; renderCases(main, +h.split("-")[1]); }
    else if (h === "cost") { tab = "cost"; renderCost(main); }
    else if (h === "wp") { tab = "wp"; renderWP(main, null); }
    else if (chById(h)) { tab = "wp"; renderWP(main, h); }
    else if (secToCh[h]) { tab = "wp"; renderWP(main, secToCh[h], h); }
    else { renderHome(main); }
    $$(".tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false"));
    if (tab !== "wp" && !/^case-\d+$/.test(h) && h !== "cases-issues") window.scrollTo(0, 0);
    observe(main);
    document.title = { home: "태양광 사업관리 백서", wp: "백서 · 태양광 사업관리", cases: "사례집 · 태양광 사업관리", cost: "원가 분석 · 태양광 사업관리" }[tab];
  }
  window.addEventListener("hashchange", route);

  // 바닥글
  const m = WP.meta || {};
  $("#foot").innerHTML = `<div class="wrap"><span>${esc(m.title || "")} ${esc(m.version || "")} · ${esc(m.docno || "")} · ${esc(m.org || "")}</span><span>${esc(m.badge || "")} · 외부 공유 금지${BUILT ? " · 갱신 " + esc(BUILT) : ""}</span></div>`;
  $("#ver").textContent = m.version || "";
  paintLockBtn();
  route();
  let saved = null; try { saved = sessionStorage.getItem("yh-solar:pw"); } catch (e) { /* 없음 */ }
  if (VAULT && saved) unlock(saved).catch(() => { try { sessionStorage.removeItem("yh-solar:pw"); } catch (e) { /* 없음 */ } });
})();
