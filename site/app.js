/* 유호스트 태양광 백서 웹 — 개요 · 백서 · 사례집 · 원가 분석
   데이터: window.__DATA__ = { wp: 백서, cost: 원가 툴, reports: 시공완료보고서 } (build/build_site.py가 주입) */
(() => {
  "use strict";
  const D = window.__DATA__ || {};
  let WP = D.wp || { meta: {}, parts: [] };
  let COST = D.cost || null;
  let REP = D.reports || [];
  const VAULT = D.vault || null;
  const FORMS = D.forms || null;
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
    pointer: '<path d="M9 11V5a2 2 0 0 1 4 0v5m0 0V8a2 2 0 0 1 4 0v4m0-1a2 2 0 0 1 4 0v3a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L4.5 14a2 2 0 0 1 3.2-2.4L9 13"/>',
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


  /* ---------- 실제 현장 사진으로 그린 그림 ---------- */
  // 시공완료보고서 사진대지에서 장비별로 고른 사진 (없으면 그림 아이콘)
  const EQ = {
    module: { src: "rep/r1-21-000.jpg", t: "태양광 모듈", s: "지붕 위 패널이 햇빛으로 전기를 만듭니다", tag: "직류 DC" },
    inverter: { src: "rep/r3-26-001.jpg", t: "인버터", s: "직류를 공장에서 쓰는 교류로 바꿉니다", tag: "DC → AC" },
    board: { src: "rep/r2-24-003.jpg", t: "수배전반", s: "공장 전기의 입구. 차단기로 태양광을 연결합니다", tag: "교류 AC" },
    factory: { src: "rep/r1-05-000.jpg", t: "공장 설비", s: "만든 전기를 공장이 먼저 씁니다", tag: "자가소비" },
    grid: { src: "rep/r2-05-000.jpg", t: "한전 전기", s: "모자라는 만큼만 한전에서 받습니다", tag: "부족분" },
    rpr: { src: "rep/r2-26-002.jpg", t: "역전력계전기", s: "남는 전기가 한전 쪽으로 거꾸로 가면 끊습니다", tag: "역송 차단" },
    structure: { src: "rep/r1-20-000.jpg", t: "구조물", s: "모듈을 지붕에 고정하는 레일" },
    combiner: { src: "rep/r1-22-002.jpg", t: "접속반 · 분전함", s: "여러 줄의 전선을 모읍니다" },
    cable: { src: "rep/r1-25-000.jpg", t: "케이블", s: "모듈 → 인버터 → 수배전반을 잇습니다" },
    monitor: { src: "rep/r3-27-002.jpg", t: "모니터링", s: "발전량을 화면 · 원격으로 확인" },
    safety: { src: "rep/r1-21-003.jpg", t: "안전시설", s: "안전난간 · 고정 사다리" },
    roof: { src: "rep/r2-04-000.jpg", t: "지붕 태양광", s: "" },
    roof2: { src: "rep/r3-04-000.jpg", t: "지붕 태양광", s: "" },
  };
  const SVGI = {
    money: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#12a36b"/><circle cx="24" cy="24" r="15.5" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"/><path d="M14 17l4 14 6-12 6 12 4-14M12 23h24M12 27h24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tower: '<svg viewBox="0 0 48 48"><rect x="6" y="6" width="36" height="36" rx="10" fill="#e8504f"/><path d="M24 14v22M18 36l6-22 6 22M20 28h8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 15a12 12 0 0 0 0 12M33 15a12 12 0 0 1 0 12" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
    office: '<svg viewBox="0 0 48 48"><rect x="6" y="6" width="36" height="36" rx="10" fill="#3266ff"/><path d="M16 36V14h16v22M12 36h24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 19h2M26 19h2M20 24h2M26 24h2M20 29h2M26 29h2" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>',
    block: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#c43b3b"/><path d="M16 16l16 16M32 16L16 32" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>',
    doc: '<svg viewBox="0 0 48 48"><rect x="6" y="6" width="36" height="36" rx="10" fill="#0f1b33"/><path d="M17 13h10l5 5v17H17z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M21 24h8M21 29h6" stroke="#ffc94a" stroke-width="2.4" stroke-linecap="round"/></svg>',
  };
  // 장비 그림: 3D 렌더 (site/3d)
  // 3D 렌더 이미지 (site/3d, build/render3d/render.mjs 로 생성)
  const R3 = (k, alt = "") => `<img class="r3d" src="3d/${k}.webp" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  const ILLMAP = {
    module: () => R3("module", "태양광 모듈"), inverter: () => R3("inverter", "인버터"), board: () => R3("board", "수배전반"), factory: () => R3("hero", "공장"), grid: () => R3("grid", "한전 전주"), rpr: () => R3("rpr", "역전력계전기"),
    structure: () => R3("structure", "구조물"), combiner: () => R3("combiner", "접속반"), cable: () => R3("cable", "케이블"), monitor: () => R3("monitor", "모니터링"), safety: () => R3("safety", "안전시설"),
    roof: () => R3("module"), roof2: () => R3("hero"), money: () => R3("money"), tower: () => R3("tower"), office: () => R3("office"),
    doc: () => R3("doc"), bapv: () => R3("bapv"),
  };
  const eqImg = (k) => ILLMAP[k] ? ILLMAP[k]() : (EQ[k] ? `<img src="${EQ[k].src}" alt="${esc(EQ[k].t)}" loading="lazy">` : "");
  function photoFlow() {
    const card = (k, n) => `<figure class="pf-card" data-node="${k}"><div class="pf-img">${eqImg(k)}<span class="pf-n">${n}</span><span class="pf-tag ${k === "module" || k === "inverter" ? "dc" : "ac"}">${EQ[k].tag}</span></div>
      <figcaption><b>${EQ[k].t}</b><span>${EQ[k].s}</span></figcaption></figure>`;
    const link = (cls, lab) => `<div class="pf-link ${cls}" aria-hidden="true"><i></i><em>${lab}</em></div>`;
    return `<div class="pflow">
      <div class="pf-chain">${card("module", 1)}${link("dc", "직류")}${card("inverter", 2)}${link("ac", "교류")}${card("board", 3)}${link("ac", "교류")}${card("factory", 4)}</div>
      <div class="pf-grid">
        <div class="pf-side" data-node="grid"><div class="pf-thumb">${eqImg("grid")}</div><div><b>한전 전기가 들어오는 길</b><span>공장이 쓰는 만큼 태양광이 모자라면 한전 전기가 수배전반으로 함께 들어옵니다. 요금은 받은 만큼만 냅니다.</span></div><div class="pf-arrow in" aria-hidden="true">한전 → 공장</div></div>
        <div class="pf-side bad" data-node="rpr"><div class="pf-thumb">${eqImg("rpr")}</div><div><b>남는 전기는 막아요</b><span>휴일처럼 공장이 덜 쓸 때 남는 전기가 한전 쪽으로 거꾸로 가면 역전력계전기가 태양광 차단기를 끊습니다.</span></div><div class="pf-arrow out" aria-hidden="true">공장 → 한전 ✕</div></div>
      </div>
      <div class="pf-minis">${["structure", "combiner", "cable", "monitor", "safety"].map((k) => `<div class="pf-mini" data-node="${k}"><div class="pf-thumb">${eqImg(k)}</div><b>${EQ[k].t}</b><span>${EQ[k].s}</span></div>`).join("")}</div>
    </div>`;
  }
  // 사업 유형: 사진과 그림으로 보는 단계별 이야기
  const STORIES = {
    "자가소비 (갑)": [
      ["e", "roof", "지붕 태양광이 전기를 만든다", "설비는 공장(수용가) 소유"],
      ["e", "factory", "공장이 먼저 쓴다", "만든 전기는 공장 설비로 바로 들어갑니다"],
      ["e", "grid", "모자라면 한전에서 받는다", "흐린 날 · 밤에는 평소처럼 한전 전기"],
      ["x", "rpr", "남는 전기는 한전으로 못 간다", "역전력계전기가 거꾸로 가는 전기를 차단"],
      ["m", "money", "전기요금이 줄어든다", "한전에는 받은 만큼만 요금을 냅니다"],
    ],
    "자가소비 + 상계거래": [
      ["e", "roof", "지붕 태양광이 전기를 만든다", "설비는 공장(수용가) 소유"],
      ["e", "factory", "공장이 먼저 쓴다", "만든 전기는 공장 설비로 바로 들어갑니다"],
      ["e", "grid", "남는 전기는 한전으로 보낸다", "양방향 계량기로 보낸 양을 잽니다"],
      ["m", "money", "보낸 만큼 요금에서 뺀다 (상계)", "모자랄 때 받은 전기와 맞바꿔 계산"],
      ["d", "doc", "고압 수전이면 설비가 더 필요", "MOF · VCB · 역전력계전기 등 약 8,000만원 (하임 사례) — 영업 전 관할 한전 확인"],
    ],
    "직접PPA": [
      ["e", "roof2", "SPC가 지붕을 빌려 설비를 짓는다", "20년 임차, 설비는 SPC(발전사업자) 소유"],
      ["e", "factory", "공장이 그 전기를 산다", "KPX 계량기로 쓴 양을 잽니다"],
      ["m", "tower", "KT가 판매를 중개한다", "공장은 KT에 전기 요금을 냅니다"],
      ["m", "office", "SPC가 판매 대금을 받는다", "KT 수수료를 뺀 금액"],
      ["d", "doc", "발전사업이라 허가가 필요", "발전사업허가(SPC 명의) — 약 60영업일, 서류 준비가 일정을 좌우"],
    ],
    "BAPV · BIPV": [
      ["e", "bapv", "건물 벽면 · 지붕에 붙인다", "BAPV는 부착형, BIPV는 건물 자재 일체형"],
      ["e", "board", "공장이 쓴다", "소용량 인버터를 따로 설계"],
      ["e", "grid", "모자라면 한전에서 받는다", "자가소비와 같은 방식"],
      ["d", "doc", "수용가 요구로 설계가 바뀌기 쉽다", "요구사항을 서면으로 확정 (협동조합 사례)"],
    ],
  };

  /* ---------- 사업 유형별 진행 가이드 (일반 절차) ----------
     참고: 한전 EN:TER 전력거래계약 안내, 한국에너지공단 신재생 클라우드 사업 절차, 직접PPA 고시 해설(2022.9 시행) 등.
     세부 서류 · 기준은 관할 한전 · 지자체 · 전기안전공사에 확인한다. */
  const AG = { 사업자: "#0f1b33", 설계사: "#5a6b86", 지자체: "#12a36b", 한전: "#e8504f", 전기안전공사: "#f08400", 시공사: "#3266ff", 전력거래소: "#8a4fd6", 정부: "#0e9aa7" };
  const GD = (k) => ({ survey: "survey", design: "doc-design", permit: "doc-permit", biz: "doc-biz", contract: "doc-contract", kepco: "grid", meter: "board", rpr: "rpr", build: "step3", inspect: "step6", run: "monitor", money: "money", market: "tower", wall: "bapv", module: "module" }[k] ? R3({ survey: "survey", design: "doc-design", permit: "doc-permit", biz: "doc-biz", contract: "doc-contract", kepco: "grid", meter: "board", rpr: "rpr", build: "step3", inspect: "step6", run: "monitor", money: "money", market: "tower", wall: "bapv", module: "module" }[k]) : "");
  const TYPES = [
    { name: "자가소비", sub: "만든 전기를 건물에서 바로 쓴다", tag: "가장 일반적",
      own: "건물주(공장)", use: "생산한 전기를 공장이 먼저 사용, 모자라면 한전 전기", pay: "한전 전기요금이 줄어듦 (남는 전기는 보내지 않음)",
      time: "약 3 ~ 5개월", fit: "낮에 전기를 많이 쓰는 공장", watch: "휴일 · 점심처럼 사용량이 적을 때 남는 전기가 한전으로 가지 않도록 역전력계전기를 단다",
      steps: [
        ["survey", "사업자", "사전 검토", "지붕 면적 · 구조 · 방향과 최근 1년 전기 사용량(고지서)을 보고 설비 용량을 정한다. 수전 방식(저압 · 고압)도 확인"],
        ["design", "설계사", "설계 · 구조검토", "모듈 배치도, 단선결선도를 그리고 지붕이 무게와 바람을 견디는지 구조안전을 확인"],
        ["permit", "지자체", "인허가 · 신고", "지자체에 따라 개발행위허가, 공작물 축조신고 등을 받는다. 규모에 따라 전기공사계획 신고"],
        ["kepco", "한전", "한전 병렬 협의", "한전 선로와 함께 쓰는(병렬) 설비로 협의. 남는 전기를 보내지 않는 구조인지 확인"],
        ["build", "시공사", "시공", "지붕 보강 → 안전시설 → 구조물 → 모듈 → 전기 순으로 공사, 감리가 확인"],
        ["inspect", "전기안전공사", "사용전검사", "검사에 합격해야 발전을 시작할 수 있다. 전기안전관리자를 선임"],
        ["run", "사업자", "운영 · 절감 확인", "모니터링으로 발전량을 보고, 매월 고지서로 요금 절감을 확인. 정기 점검"],
      ] },
    { name: "자가소비 + 상계거래", sub: "남는 전기를 한전에 보내고 요금에서 뺀다", tag: "남는 전기가 많을 때",
      own: "건물주(공장)", use: "먼저 공장이 쓰고, 남는 전기는 한전으로 보냄", pay: "보낸 전력량만큼 한전 전기요금에서 차감(상계)",
      time: "약 4 ~ 6개월 (한전 협의 포함)", fit: "주말 · 휴일이 많거나 사용량보다 설비가 큰 건물 (태양광 자가용 1,000kW 이하)",
      watch: "고압으로 전기를 받는 건물은 양방향 계량기 교체, 차단 설비 신설 등 추가 비용이 클 수 있어 영업 전에 관할 한전에 먼저 확인",
      steps: [
        ["survey", "사업자", "사전 검토", "전기 사용 패턴으로 남는 전기 양을 추정하고, 수전 방식에 따른 추가 설비를 확인"],
        ["design", "설계사", "설계 · 구조검토", "양방향 계량을 포함한 단선결선도와 구조안전 검토"],
        ["permit", "지자체", "인허가 · 신고", "개발행위허가 등 지자체 인허가, 필요 시 전기공사계획 신고"],
        ["kepco", "한전", "상계거래 신청", "요금상계거래 신청서, 단선결선도, 모듈 · 인버터 인증서 등을 내고 한전 기술검토를 받는다"],
        ["meter", "한전", "양방향 계량기 설치", "보낸 전기와 받은 전기를 따로 재는 계량기(MOF 등)로 바꾸고, 필요한 비용(불입금)을 낸다"],
        ["inspect", "전기안전공사", "사용전검사", "합격 후 발전 시작, 전기안전관리자 선임"],
        ["money", "한전", "매월 상계 정산", "고지서에서 보낸 전력량만큼 요금이 빠진다. 상계 후 남는 전력의 처리는 한전 기준에 따른다"],
      ] },
    { name: "직접PPA", sub: "발전사업자가 짓고, 기업이 전기를 산다", tag: "투자 없이 재생에너지 사용",
      own: "발전사업자 (지붕을 빌려 설비 투자)", use: "기업(전기사용자)이 계약한 재생에너지 전기를 공급받음", pay: "기업이 발전사업자에게 전력요금, 한전에 망 이용료를 냄",
      time: "약 6개월 이상 (허가 · 계약 기간이 김)", fit: "RE100 등 재생에너지 사용 실적이 필요하지만 직접 투자하기 어려운 기업",
      watch: "직접PPA로 공급한 전기는 REC가 나오지 않는다. 망 이용료 · 부가 정산금 등 비용 구조와 10 ~ 20년 계약 조건을 꼼꼼히 비교",
      steps: [
        ["contract", "사업자", "계약 구조 협의", "기업과 발전사업자가 공급 기간 · 단가 · 물량, 지붕 임대 조건을 정한다"],
        ["biz", "지자체", "발전사업허가", "전기를 파는 사업이므로 발전사업자 명의로 발전사업허가를 받는다 (규모에 따라 시 · 도 또는 정부)"],
        ["contract", "정부", "직접 전력거래 계약 신고", "재생에너지 전기공급사업 등록 · 직접PPA 계약 신고 등 고시 절차를 밟는다"],
        ["kepco", "한전", "계통연계 · 망 이용 신청", "한전 선로로 전기를 보내므로 연계 여유용량을 확인하고 망 이용을 신청"],
        ["build", "시공사", "인허가 · 시공", "개발행위허가, 공사계획신고 후 시공. 계량 · 통신 설비 포함"],
        ["inspect", "전기안전공사", "사용전검사", "합격 후 발전 시작"],
        ["market", "전력거래소", "공급 개시 · 정산", "계량값으로 매월 정산. 기업은 발전사업자 요금과 한전 망 이용료를 낸다"],
      ] },
    { name: "BAPV · BIPV", sub: "건물 벽 · 지붕에 붙이거나 건물 자재로 쓴다", tag: "지붕이 부족할 때",
      own: "건물주 (자가소비와 같음)", use: "생산한 전기를 건물에서 사용", pay: "한전 전기요금이 줄어듦",
      time: "BAPV 약 3 ~ 5개월 · BIPV는 건축 일정에 따름", fit: "지붕이 좁거나 약한 건물, 신축 · 리모델링 건물 (BIPV)",
      watch: "벽면은 지붕보다 발전량이 적다. 외장재가 바뀌는 경우 건축 인허가 · 방화 기준을 지자체에 먼저 확인",
      steps: [
        ["wall", "사업자", "건물 조건 검토", "벽면 방향 · 그늘 · 외장 구조를 본다. BAPV는 기존 건물에 덧붙이고, BIPV는 모듈이 외장재 역할"],
        ["design", "설계사", "건축 · 전기 설계", "BIPV는 건축 설계 단계부터 함께 설계. 소용량 인버터 구성"],
        ["permit", "지자체", "건축 · 외장 검토", "구조 · 방화 · 외장 기준과 건축 인허가 변경 필요 여부 확인"],
        ["kepco", "한전", "한전 병렬 협의", "자가소비와 같은 방식으로 협의"],
        ["build", "시공사", "시공", "외장 공사와 연계해 설치, 고소 작업 안전관리"],
        ["inspect", "전기안전공사", "사용전검사", "합격 후 발전 시작"],
        ["run", "사업자", "운영", "외장 청소 · 점검, 발전량 확인"],
      ] },
  ];
  function typeGuide(i) {
    const t = TYPES[i];
    const ags = [...new Set(t.steps.map((s) => s[1]))];
    return `<div class="tg">
      <div class="tg-sum">
        <div><span>설비는 누가</span><b>${esc(t.own)}</b></div>
        <div><span>전기는 누가</span><b>${esc(t.use)}</b></div>
        <div><span>돈은 어떻게</span><b>${esc(t.pay)}</b></div>
      </div>
      <h4 class="tg-h">사업은 이렇게 진행됩니다 <small>보통 ${esc(t.time)}</small></h4>
      <ol class="tg-steps">${t.steps.map(([ill, ag, title, desc], k) => `<li style="--ag:${AG[ag]}"><span class="tg-pic">${GD(ill)}<em>${k + 1}</em></span>
        <div class="tg-b"><div class="tg-t"><b>${esc(title)}</b><span class="tg-ag">${esc(ag)}</span></div><p>${esc(desc)}</p></div></li>`).join("")}</ol>
      <div class="tg-foot"><div class="tg-fit"><b>이럴 때 맞아요</b><p>${esc(t.fit)}</p></div><div class="tg-watch"><b>꼭 확인할 점</b><p>${esc(t.watch)}</p></div></div>
      <div class="tg-legend">${ags.map((a) => `<span><i style="background:${AG[a]}"></i>${esc(a)}</span>`).join("")}</div>
    </div>`;
  }
  function typeStory(name) {
    const st = STORIES[name] || STORIES["자가소비 (갑)"];
    const KIND = { e: ["전기", "e"], m: ["돈", "m"], x: ["차단", "x"], d: ["확인", "d"] };
    return `<ol class="story">${st.map(([k, img, t, s], i) => {
      const pic = ILLMAP[img] || EQ[img] ? `<span class="st-pic">${eqImg(img)}</span>` : `<span class="st-pic ic">${SVGI[img] || SVGI.doc}</span>`;
      return `<li class="st ${KIND[k][1]}" style="animation-delay:${i * 90}ms">${pic}<div class="st-b"><span class="st-k">${KIND[k][0]}</span><b>${t}</b><span>${s}</span></div></li>`;
    }).join("")}</ol>`;
  }
  function heroPanel() {
    const num = (v) => parseFloat(String(v || "").replace(/[^\d.]/g, "")) || 0;
    const kwp = REP.reduce((s, r) => s + (r.kwp || 0), 0);
    const gen = REP.reduce((s, r) => s + num(((r.effect || {}).gen || {}).value), 0);
    const ghg = REP.reduce((s, r) => s + num(((r.effect || {}).ghg || {}).value), 0);
    const mx = Math.max(...REP.map((r) => num(((r.effect || {}).gen || {}).value)), 1);
    if (!REP.length) return "";
    return `<div class="glass"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="k">2026 군산 · 준공 ${REP.length}곳 설비 용량</span><span class="live">사용전검사 합격</span></div>
        <div class="v" style="font-size:46px"><span data-count="${kwp.toFixed(2)}" data-dec="2">${fmt(kwp, 2)}</span><small>kWp</small></div>
        <div class="bars">${REP.map((r) => { const g = num(((r.effect || {}).gen || {}).value); return `<div class="bar"><span>${esc(norm(r.site))}</span><span class="t"><i style="width:${(g / mx * 100).toFixed(1)}%"></i></span><b>${fmt(g / 1000, 1)}MWh</b></div>`; }).join("")}</div></div>
      <div class="glass-row"><div class="glass"><span class="k">예상 발전량 / 년</span><div class="v"><span data-count="${(gen / 1000).toFixed(0)}">${fmt(gen / 1000)}</span><small>MWh</small></div></div>
        <div class="glass"><span class="k">온실가스 감축 / 년</span><div class="v"><span data-count="${ghg.toFixed(0)}">${fmt(ghg)}</span><small>tCO₂</small></div></div></div>`;
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
  const NODE_OF = { "태양광 모듈": "module", "구조물": "structure", "접속반": "combiner", "인버터": "inverter", "수배전반": "board", "역전력계전기": "rpr", "케이블": "cable", "모니터링": "monitor", "안전시설": "safety" };

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
    <section class="hero hero3d"><div class="wrap">
      <div class="reveal">
        <div class="eyebrow">${esc(m.project || "")} · ${esc(m.org || "")}</div>
        <h1>태양광 <em>사업관리</em><br>백서</h1>
        <p class="lead">${esc(m.subtitle || "")}. 현장 단톡방 기록과 시공완료보고서, 원가 검토 결과를 한곳에서 보고 이해할 수 있게 정리했습니다.</p>
        <div class="hero-cta"><a class="btn primary" href="#ch1">처음부터 읽기</a><a class="btn" href="#cases">사례집 보기</a><a class="btn" href="#cost">원가 분석</a></div>
        <div class="stats">
          <div class="stat"><span class="ic">${icon("doc", 17)}</span><div class="v"><span data-count="${nCh}">${nCh}</span><small>장</small></div><div class="k">백서 본문</div></div>
          <div class="stat"><span class="ic">${icon("pin", 17)}</span><div class="v"><span data-count="${sites7}">${sites7}</span><small>곳</small></div><div class="k">현장별 분석</div></div>
          <div class="stat"><span class="ic">${icon("check", 17)}</span><div class="v"><span data-count="${REP.length}">${REP.length}</span><small>곳</small></div><div class="k">준공 · 사용전검사</div></div>
          <div class="stat"><span class="ic">${icon("alert", 17)}</span><div class="v"><span data-count="${nIssues}">${nIssues}</span><small>건</small></div><div class="k">이슈 · 교훈</div></div>
        </div>
        <div class="meta"><span>버전 <b class="mono">${esc(m.version || "")}</b></span>${lastRev ? `<span>최근 개정 <b class="mono">${esc(lastRev[1])}</b></span>` : ""}<span>문서번호 <b class="mono">${esc(m.docno || "")}</b></span><span>${esc(m.org || "")}</span></div>
      </div>
      <div class="h3-col">
        <div class="h3" id="h3" aria-label="공장 지붕 태양광 3D 모델">
          <img class="h3-poster" src="3d/hero.webp" alt="공장 지붕 태양광 3D 모델" decoding="async">
        </div>
        <div class="h3-sw" id="h3-sw" role="group" aria-label="설치 방식 3D 보기">${[["hero", "hero", "공장 지붕"], ["flatroof", "flatroof", "옥상"], ["carport", "carport", "주차장"], ["ground", "ground", "지상"], ["agri", "agri", "영농형"], ["floating", "floating", "수상"], ["wall", "wall", "벽면"]].map(([s, im, n], i) => `<button type="button" data-shot="${s}" data-img="${im}" aria-pressed="${i === 0}">${n}</button>`).join("")}</div>
        <div class="h3-sun glass" id="h3-sun">
          <div class="h3-sun-h"><span class="k">해의 위치</span><b id="h3-time">오전 10:30</b><span class="h3-out" id="h3-out"></span></div>
          <input type="range" id="h3-hr" min="6" max="19" step="0.05" value="10.5" aria-label="시각">
          <div class="h3-sun-s"><span>06시</span><span>정오</span><span>19시</span></div>
        </div>
        <div class="reveal hero-panel">${heroPanel()}</div>
      </div>
    </div><span class="scroll-hint" aria-hidden="true"></span><svg class="wave" viewBox="0 0 1440 46" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C 240 0 480 46 720 24 S 1200 8 1440 26 V46 H0z"/></svg></section>

    <div class="wrap"><section class="sec reveal" style="margin-top:36px">
      <div class="sec-head"><div><div class="eyebrow">백서 지도</div><h2>5개 파트, ${nCh}개 장</h2><p>처음이라면 PART 1부터, 현장 분석은 PART 2, 실무 체크리스트는 PART 3을 펼치세요.</p></div><a class="from" href="#wp">표지 · 개정 이력 →</a></div>
      <div class="map">${WP.parts.map((p, pi) => pi === 0 ? "" : `<a class="map-card" href="#${p.chapters[0].id}" style="--pc:${pcolor(pi)}">${PART_ART[pi] ? `<span class="mc-art">${R3(PART_ART[pi])}</span>` : ""}<span class="pn">${pi}</span><span class="pl">${esc(p.label)}</span><h3>${esc(p.title)}</h3>
        <ul>${p.chapters.slice(0, 6).map((c) => `<li class="${c.locked ? "lk" : ""}"><b>${typeof c.num === "number" ? c.num : "A"}</b><span>${esc(c.title.replace(/ — .*/, ""))}${c.locked ? " 🔒" : ""}</span></li>`).join("")}${p.chapters.length > 6 ? `<li><b>+</b><span>외 ${p.chapters.length - 6}개 장</span></li>` : ""}</ul></a>`).join("")}</div>
    </section></div>

    <div class="wrap">
    ${partsT ? `<section class="sec reveal" id="flow">
      <div class="sec-head"><div><div class="eyebrow">1장 · 태양광 발전 한눈에 보기</div><h2>전기는 이렇게 흐릅니다</h2>
      <p>지붕의 모듈이 만든 전기가 인버터와 수배전반을 지나 공장 설비로 갑니다. 장비 그림을 누르면 하는 일과 현장 확인 포인트가 보입니다.</p></div>
      <a class="from" href="#s1-2">백서 1.2 구성 장비 →</a></div>
      <div class="flow-stack">
        <div class="card flow-card">${photoFlow()}
          <div id="part-info" class="note part-info"></div></div>
        <div class="parts-list parts-row" id="parts">${bodyRows(partsT).map((r, i) => `<button type="button" class="part-item" data-i="${i}" data-node="${NODE_OF[r[0]] || ""}"><span class="n">${String(i + 1).padStart(2, "0")}</span><span><b>${esc(r[0])}</b><span>${esc(r[1])}</span></span></button>`).join("")}</div>
      </div></section>` : ""}

    <section class="sec reveal" id="types">
      <div class="sec-head"><div><div class="eyebrow">사업 유형 · 진행 절차</div><h2>태양광 사업, 이렇게 진행합니다</h2>
      <p>건물 태양광은 크게 네 가지 방식이 있습니다. 방식을 고르면 설비 · 전기 · 돈이 어떻게 오가는지와, 사전 검토부터 운영까지 단계별로 누가 무엇을 하는지 보여줍니다.</p></div><a class="from" href="#s2-1">백서 2장 사업 유형 →</a></div>
      <div class="types">
        <div class="type-tabs" id="type-tabs">${TYPES.map((t, i) => `<button type="button" class="type-tab" data-i="${i}" aria-pressed="${i === 0}"><span class="tt-tag">${esc(t.tag)}</span><b>${esc(t.name)}</b><small>${esc(t.sub)}</small></button>`).join("")}
          <p class="from tg-src">참고: <a href="https://en-ter.co.kr/ft/ppa/contract/infa/info1.do" target="_blank" rel="noopener">한전 EN:TER 전력거래계약</a> · <a href="https://recloud.energy.or.kr/process/sub1_3_2.do" target="_blank" rel="noopener">한국에너지공단 신재생 사업 절차</a> · <a href="https://shinkim.com/eng/media/newsletter/1637" target="_blank" rel="noopener">직접PPA 제도 해설</a>. 세부 서류와 기준은 관할 한전 · 지자체 · 전기안전공사에 확인하세요.</p></div>
        <div class="card type-detail" id="type-detail"></div>
      </div></section>


    <section class="sec reveal" id="methods">
      <div class="sec-head"><div><div class="eyebrow">설치 방식 · 어디에 짓나요</div><h2>지붕만 있는 게 아닙니다</h2>
      <p>같은 태양광이라도 어디에 짓느냐에 따라 공사비 · 발전량 · 인허가 · 확인할 것이 달라집니다. 방식을 고르면 3D 모델과 함께 차이를 보여줍니다.</p></div></div>
      <div class="md-tabs" id="md-tabs" role="tablist">${METHODS.map((m, i) => `<button type="button" role="tab" class="md-tab" data-i="${i}" aria-selected="${i === 0}"><span class="md-th"><img src="3d/${m.img}.webp" alt="" loading="lazy"></span><b>${esc(m.short)}</b><small>${m.cost[0]}~${m.cost[1]}만/kW</small></button>`).join("")}</div>
      <div class="card md" id="md"><div class="md-pic" id="md-pic"><img class="r3d" id="md-img" src="3d/${METHODS[0].img}.webp" alt="${esc(METHODS[0].name)} 3D 모델" decoding="async"><div class="h3 md3" id="md3"></div><button type="button" class="btn md-3d" id="md-3d">${icon("pointer", 15)} 3D로 돌려 보기 · 확대</button><div class="md-badges" id="md-badges">${methodBadges(0)}</div></div><div class="md-body" id="md-body">${methodBody(0)}</div></div>
      <div class="card md-cmp"><h3>한눈에 비교</h3>${methodCompare()}</div>
    </section>
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
        <div class="card build-stage"><div class="build-photo" id="b-photo"><span class="no" id="b-no"></span><span class="cap" id="b-cap"></span></div><div class="b-strip" id="b-strip"></div>
          <div class="build-ctrl"><button class="btn" type="button" id="b-prev" aria-label="이전 공정">‹</button><button class="btn" type="button" id="b-play">❚❚ 일시정지</button><button class="btn" type="button" id="b-next" aria-label="다음 공정">›</button><div class="prog"><i id="b-prog"></i></div><span class="mono" id="b-count" style="font-size:12px;color:var(--ink-3)"></span></div></div>
        <div class="card build-info" id="build-info"></div>
      </div></section>` : ""}

    <section class="sec reveal" id="calc">
      <div class="sec-head"><div><div class="eyebrow">수익 시뮬레이터</div><h2>우리 공장에 달면 얼마나 아낄까</h2>
      <p>용량 · 발전시간 · 자가소비율 · 전기요금을 넣으면 연간 절감액, 회수기간, 20년 누적 현금흐름을 계산합니다. 자부담 100%와 정부지원(자부담 30%)을 나란히 비교합니다.</p></div><a class="from" href="#s1-4">백서 1.4 · 26 · 27장 →</a></div>
      <div class="sim card">
        <div class="sim-in">
          <div class="sim-f"><span>설치 방식</span><div class="seg sim-meth" id="s-meth">${METHODS.map((m, i) => `<button type="button" data-m="${i}" aria-pressed="${i === 0}">${esc(m.short)}</button>`).join("")}</div></div>
          <label class="sim-f"><span>설비 용량 <b class="sim-v" id="sv-kw">143</b> kWp</span><input type="range" id="s-kw" min="10" max="1000" step="1" value="143" aria-label="설비 용량"></label>
          <div class="seg" id="s-pre"><button type="button" data-v="100">100kW</button>${REP.map((r) => `<button type="button" data-v="${r.kwp}">${esc(norm(r.site).replace(/공장$/, ""))}</button>`).join("")}<button type="button" data-v="500">500kW</button></div>
          <label class="sim-f"><span>하루 평균 발전시간 <b class="sim-v" id="sv-h">3.5</b> 시간</span><input type="range" id="s-h" min="2.8" max="4.2" step="0.1" value="3.5" aria-label="발전시간"></label>
          <label class="sim-f"><span>자가소비율 <b class="sim-v" id="sv-sc">85</b> %</span><input type="range" id="s-sc" min="50" max="100" step="1" value="85" aria-label="자가소비율"></label>
          <label class="sim-f"><span>전기요금 단가 <b class="sim-v" id="sv-p">135</b> 원/kWh</span><input type="range" id="s-p" min="100" max="200" step="1" value="135" aria-label="전기요금 단가"></label>
          <details class="sim-more"><summary>가정 바꾸기</summary>
            <label class="sim-n">kW당 공사비 (원)<input type="number" id="s-c" step="10000"></label>
            <label class="sim-n">전기요금 상승률 (%/년)<input type="number" id="s-esc" value="2" step="0.5"></label>
            <label class="sim-n">모듈 출력 저하 (%/년)<input type="number" id="s-deg" value="0.4" step="0.1"></label>
            <label class="sim-n">유지관리비 (공사비 대비 %/년)<input type="number" id="s-om" value="1" step="0.1"></label>
          </details>
        </div>
        <div class="sim-out">
          <div class="sim-kpi" id="s-kpi"></div>
          <div class="sim-chart" id="s-chart"></div>
          <div class="sim-bench" id="s-bench"></div>
          <p class="from sim-note" id="s-note"></p>
        </div>
      </div></section>


    <section class="sec reveal">
      ${FORMS ? `<div class="sec-head"><div><div class="eyebrow">현장 양식 · Word</div><h2>현장에서 바로 쓰는 양식 ${FORMS.forms.length}종</h2><p>백서 부록 양식을 Pretendard로 디자인한 Word 파일로 만들었습니다. 체크 항목 · 기준 · 준공 현장 정보까지 채워 두었습니다.</p></div><a class="from" href="#forms">양식 전체 →</a></div>
        <div class="form-strip">${FORMS.forms.slice(0, 5).map((f) => `<a class="form-mini" href="#forms">${f.thumb ? `<img src="${f.thumb}" alt="" loading="lazy">` : ""}<span><b>${esc(f.code)}</b> ${esc(f.title)}</span></a>`).join("")}</div></section>
    <section class="sec reveal">` : ""}
      <div class="sec-head"><div><div class="eyebrow">2026 군산 현장</div><h2>준공된 현장 ${REP.length}곳</h2><p>시공완료보고서 기준 수치입니다. 카드를 누르면 사례집에서 공정 · 사진 · 기대효과를 볼 수 있습니다.</p></div><a class="from" href="#cases">사례집 전체 →</a></div>
      <div class="grid-3">${REP.map((r, i) => siteCard(r, i)).join("")}</div>
    </section>

    <section class="sec reveal grid-2">
      ${sumT ? `<div class="card panel"><h3>이슈 ${nIssues}건, 어디서 나왔나 <a class="from" href="#cases-issues">레지스터 보기 →</a></h3>
        ${(() => { const rs = bodyRows(sumT).filter((r) => /\d/.test(r[1])); const mx = Math.max(...rs.map((r) => +r[1])); return rs.map((r) => `<div class="hbar" title="${esc(r[2])}"><span>${esc(r[0])}</span><span class="track"><span class="fill" style="width:${(+r[1] / mx * 100).toFixed(1)}%;display:block"></span></span><span class="n">${r[1]}</span></div>`).join("") + `<p class="from" style="margin-top:10px">${esc(rs.sort((a, b) => b[1] - a[1])[0][2])}</p>`; })()}</div>` : ""}
      <div class="card panel"><h3>처음 투입되는 분께</h3>
        <ol class="path-list">${howTo.slice(0, 6).map((x) => `<li><span>${linkify(x)}</span></li>`).join("")}</ol></div>
    </section>
    <section class="sec reveal" id="faq">
      <div class="sec-head"><div><div class="eyebrow">자주 묻는 질문</div><h2>현장과 고객이 가장 많이 묻는 것</h2><p>수용가 설명 · 신규 투입자 교육 때 바로 쓰는 답변입니다. 근거가 되는 백서 장을 함께 달았습니다.</p></div></div>
      <div class="faq">${FAQ.map(([q, a, link], i) => `<details class="faq-i" ${i === 0 ? "open" : ""}><summary><span class="faq-q">Q</span><b>${esc(q)}</b><span class="faq-x" aria-hidden="true"></span></summary><div class="faq-a"><p>${esc(a)}</p>${link ? `<a class="from" href="#${link[0]}">${esc(link[1])} →</a>` : ""}</div></details>`).join("")}</div>
    </section>

    </div>`;

    // 장비 선택
    if (partsT) {
      const rows = bodyRows(partsT);
      const info = $("#part-info", root);
      const pick = (i) => {
        $$(".part-item", root).forEach((b) => b.classList.toggle("on", +b.dataset.i === i));
        const node = NODE_OF[rows[i][0]];
        $$(".pflow [data-node]", root).forEach((r) => r.classList.toggle("hot", r.dataset.node === node));
        $$(".pf-link", root).forEach((w) => w.classList.toggle("hot", node === "cable"));
        info.innerHTML = `<b>${esc(rows[i][0])}</b> — ${esc(rows[i][1])}<br><span style="color:var(--ink-3)">현장에서 확인할 것:</span> ${esc(rows[i][2])}`;
      };
      $("#parts", root).addEventListener("click", (e) => { const b = e.target.closest(".part-item"); if (b) pick(+b.dataset.i); });
      $(".pflow", root).addEventListener("click", (e) => {
        const c = e.target.closest("[data-node]"); if (!c) return;
        const k = c.dataset.node, i = rows.findIndex((r) => NODE_OF[r[0]] === k || (k === "combiner" && r[0] === "접속반"));
        if (i >= 0) { pick(i); return; }
        $$(".pflow [data-node]", root).forEach((r) => r.classList.toggle("hot", r === c));
        info.innerHTML = `<b>${esc(EQ[k].t)}</b> — ${esc(EQ[k].s)}`;
      });
      pick(0);
    }
    // 사업 유형
    {
      const det = $("#type-detail", root);
      const pick = (i) => {
        $$(".type-tab", root).forEach((b) => b.setAttribute("aria-pressed", +b.dataset.i === i));
        det.innerHTML = typeGuide(i);
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
      let cur = 0, timer = null;
      // 공정별 실제 현장 사진 (시공완료보고서 사진대지)
      const KEYS = [["지붕", "강판"], ["안전"], ["구조물"], ["구조물", "모듈"], ["전기"], ["계통", "전기"], ["계통", "연계", "전기"]];
      const used = new Set();
      const PICK = ["rep/r2-20-002.jpg", "rep/r1-21-003.jpg", "rep/r1-20-000.jpg", "rep/r3-22-002.jpg", "rep/r3-26-000.jpg", "rep/r2-27-001.jpg", "rep/r3-27-000.jpg"];
      const findPh = (src) => { for (const r of REP) { const ph = (r.photos || []).find((x) => x.src === src); if (ph) return { ...ph, site: r.site }; } return null; };
      const stepPh = proc.map((p, k) => {
        const fixed = PICK[k] && findPh(PICK[k]);
        if (fixed) { used.add(fixed.src); return fixed; }
        const keys = KEYS[Math.min(k, KEYS.length - 1)];
        const pool = REP.flatMap((r) => (r.photos || []).filter((ph) => keys.some((x) => ph.cap.includes(x))).map((ph) => ({ ...ph, site: r.site })));
        const ph = pool.find((x, j) => j >= (k * 3) % Math.max(pool.length, 1) && !used.has(x.src)) || pool.find((x) => !used.has(x.src)) || pool[0];
        if (ph) used.add(ph.src);
        return ph;
      });
      const strip = $("#b-strip", root);
      const scene = (k) => R3(`step${Math.min(k, 6)}`, proc[k].title);
      if (strip) strip.innerHTML = proc.map((p, k) => `<button type="button" data-k="${k}" aria-label="${esc(p.title)}"><span class="b-mini">${scene(k, { highlight: false })}</span><span><b>${k + 1}</b>${esc(p.title.replace(/^[①-⑨\s]+/, "").replace(/\s*\(.*\)/, "").replace(/ · ⑧.*/, ""))}</span></button>`).join("");
      if (strip) strip.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { stop(); show(+b.dataset.k); } });
      const show = (i) => {
        cur = (i + proc.length) % proc.length;
        $$("#b-strip button", root).forEach((b) => { const on = +b.dataset.k === cur; b.classList.toggle("on", on); if (on && b.parentNode.scrollWidth > b.parentNode.clientWidth) b.parentNode.scrollTo({ left: b.offsetLeft - 16, behavior: "smooth" }); });
        const p = proc[cur]; const t = p.blocks.find((b) => b.t === "table");
        const kv = t ? t.rows.map(cellsText) : [];
        info.innerHTML = `<div class="eyebrow">공정 ${cur + 1} / ${proc.length}</div><h3>${esc(p.title)}</h3><dl class="kv">${kv.map((r) => `<dt>${esc(r[0])}</dt><dd>${r[0].includes("사례") ? `<span class="tag-case">사례</span> ` : ""}${esc(r[1])}</dd>`).join("")}</dl>`;
        $("#b-prog", root).style.width = ((cur + 1) / proc.length * 100) + "%";
        // 공정에 맞는 실제 현장 사진 (시공완료보고서 사진대지)
        const box = $("#b-photo", root);
        if (box) {
          const holder = document.createElement("div"); holder.className = "b-scene"; holder.innerHTML = scene(cur);
          box.insertBefore(holder, $("#b-no", root));
          requestAnimationFrame(() => holder.classList.add("in"));
          $$(".b-scene", box).forEach((o) => { if (o !== holder) setTimeout(() => o.remove(), 500); });
          $("#b-cap", root).textContent = proc[cur].title.replace(/^[①-⑨\s]+/, "");
          $("#b-no", root).textContent = `STEP ${cur + 1}`;
        }
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

    // 설치 방식
    {
      const tabs = $("#md-tabs", root), det = $("#md", root), body = $("#md-body", root), pic = $("#md-pic", root), b3 = $("#md-3d", root);
      let cur = 0, mv = null;
      const pick = (i) => { cur = i; const m = METHODS[i]; $$(".md-tab", tabs).forEach((b) => b.setAttribute("aria-selected", +b.dataset.i === i));
        const im = $("#md-img", root); im.src = `3d/${m.img}.webp`; im.alt = `${m.name} 3D 모델`; $("#md-badges", root).innerHTML = methodBadges(i); body.innerHTML = methodBody(i);
        body.classList.remove("swap"); void body.offsetWidth; body.classList.add("swap"); if (mv) mv.load(m.img); };
      tabs.addEventListener("click", (e) => { const b = e.target.closest(".md-tab"); if (b) pick(+b.dataset.i); });
      $(".md-cmp", root).addEventListener("click", (e) => { const r = e.target.closest(".mc-row"); if (r) { pick(+r.dataset.i); $("#methods", root).scrollIntoView({ behavior: "smooth", block: "start" }); } });
      det.addEventListener("click", (e) => { const b = e.target.closest(".md-go"); if (b) { const sb = $(`#s-meth button[data-m="${b.dataset.m}"]`, root); if (sb) sb.click(); $("#calc", root).scrollIntoView({ behavior: "smooth", block: "start" }); } });
      b3.addEventListener("click", async () => { b3.disabled = true; b3.textContent = "3D 불러오는 중…"; mv = await viewer3d({ stage: $("#md3", root), shot: METHODS[cur].img }); if (mv) { pic.classList.add("is3d"); if (METHODS[cur].img !== "hero") mv.load(METHODS[cur].img); } else { b3.textContent = "3D를 불러오지 못했습니다"; } });
    }
    hero3d(root);
    // 수익 시뮬레이터
    {
      const rowsN = numsT ? bodyRows(numsT) : [];
      const val = (key, re, d) => { const r = rowsN.find((x) => x[0].includes(key)); const m = r && r[1].match(re); return m ? parseFloat(m[1].replace(/,/g, "")) : d; };
      const W = val("출력", /([\d.]+)\s*W/, 645), AREA = val("면적", /([\d.]+)\s*m/, 4.7);
      // kW당 시장 총공사비: 백서 21.5 표(대외비 해제 시) 또는 업체 공개가(30kW 164만 · 100kW 142만 · 210kW 130만원)
      let kwRows = kwT ? bodyRows(kwT).map((r) => [parseFloat(r[0]), parseFloat(r[1].replace(/,/g, ""))]).filter((x) => isFinite(x[0]) && isFinite(x[1])) : [];
      if (!kwRows.length) kwRows = [[30, 1640000], [100, 1420000], [200, 1300000]];
      kwRows.sort((a, b) => a[0] - b[0]);
      const unitCost = (kw) => { if (kw <= kwRows[0][0]) return kwRows[0][1]; for (let i = 1; i < kwRows.length; i++) if (kw <= kwRows[i][0]) { const [a, ca] = kwRows[i - 1], [b, cb] = kwRows[i]; return ca + (cb - ca) * (kw - a) / (b - a); } return kwRows[kwRows.length - 1][1]; };
      const $i = (id) => $("#" + id, root);
      let costTouched = false, meth = 0;
      $i("s-c").addEventListener("input", () => { costTouched = true; });
      const mCost = (kw) => unitCost(kw) * METHODS[meth].rep / METHODS[0].rep, mGen = () => METHODS[meth].gen / METHODS[0].gen;
      const num = (v) => parseFloat(String(v || "").replace(/[^\d.]/g, "")) || 0;
      const run = () => {
        const kw = +$i("s-kw").value, H = +$i("s-h").value, sc = +$i("s-sc").value / 100, price = +$i("s-p").value;
        $i("sv-kw").textContent = fmt(kw); $i("sv-h").textContent = H.toFixed(1); $i("sv-sc").textContent = Math.round(sc * 100); $i("sv-p").textContent = price;
        if (!costTouched) $i("s-c").value = Math.round(mCost(kw) / 10000) * 10000;
        const uc = +$i("s-c").value || mCost(kw), esc2 = (+$i("s-esc").value || 0) / 100, deg = (+$i("s-deg").value || 0) / 100, om = (+$i("s-om").value || 0) / 100;
        const cost = kw * uc, gen1 = kw * H * mGen() * 365, save1 = gen1 * sc * price;
        const plans = [{ k: "자부담 100%", inv: cost, c: "var(--navy)" }, { k: "정부지원 70%", inv: cost * 0.3, c: "#12a36b" }];
        const Y = 20;
        for (const p of plans) {
          let cum = -p.inv; p.series = [cum]; p.payback = null;
          for (let y = 1; y <= Y; y++) {
            const s = gen1 * Math.pow(1 - deg, y - 1) * sc * price * Math.pow(1 + esc2, y - 1) - cost * om;
            const prev = cum; cum += s; p.series.push(cum);
            if (p.payback == null && cum >= 0) p.payback = y - 1 + (-prev) / (cum - prev);
          }
          p.total = cum;
        }
        const co2 = gen1 * 0.4173 / 1000, trees = co2 * 1000 / 6.6;
        $i("s-kpi").innerHTML = [
          ["연간 발전량", fmt(gen1 / 1000, 1), "MWh", `모듈 ${fmt(Math.ceil(kw * 1000 / W))}장 · ${meth ? esc(METHODS[meth].area) : `지붕 약 ${fmt(kw * AREA)}m²`}`],
          ["1년차 전기요금 절감", man(save1), "원", `자가소비 ${fmt(gen1 * sc / 1000, 1)}MWh × ${price}원`],
          ["회수기간", plans[1].payback != null ? plans[1].payback.toFixed(1) : "20+", "년", `정부지원 70% 기준 · 자부담 100%면 ${plans[0].payback != null ? plans[0].payback.toFixed(1) + "년" : "20년 이상"}`],
          ["20년 누적 순이익", eok(plans[1].total), "", `자부담 100%면 ${eok(plans[0].total)}`],
          ["온실가스 감축", fmt(co2, 1), "tCO₂/년", `소나무 약 ${fmt(Math.round(trees / 10) * 10)}그루가 1년간 흡수하는 양`],
        ].map(([k, v, u, s], i) => `<div class="sk ${i === 2 ? "hl" : ""}"><span>${k}</span><b>${v}<small>${u}</small></b><em>${s}</em></div>`).join("");
        // 20년 누적 현금흐름 차트
        const Wc = Math.max(320, Math.min(640, ($i("s-chart").clientWidth || 640) - 26)), Hc = Wc < 480 ? 220 : 230, L = 54, R = 14, T = 16, B = 28;
        const all = plans.flatMap((p) => p.series), mn = Math.min(0, ...all), mx = Math.max(0, ...all);
        const step = niceStep((mx - mn) / 4); const lo = Math.floor(mn / step) * step, hi = Math.ceil(mx / step) * step;
        const x = (y) => L + (Wc - L - R) * y / Y, yv = (v) => T + (Hc - T - B) * (1 - (v - lo) / (hi - lo || 1));
        let g = "";
        for (let v = lo; v <= hi + 1; v += step) g += `<line class="gl" x1="${L}" x2="${Wc - R}" y1="${yv(v)}" y2="${yv(v)}"/><text x="${L - 6}" y="${yv(v) + 4}" text-anchor="end">${(v / 1e8).toFixed(1)}억</text>`;
        for (let y = 0; y <= Y; y += 5) g += `<text x="${x(y)}" y="${Hc - 8}" text-anchor="middle">${y}년</text>`;
        g += `<line x1="${L}" x2="${Wc - R}" y1="${yv(0)}" y2="${yv(0)}" stroke="var(--ink-3)" stroke-width="1.2"/>`;
        plans.forEach((p, k) => {
          const pts = p.series.map((v, y) => `${x(y).toFixed(1)},${yv(v).toFixed(1)}`).join(" ");
          if (k === 1) g += `<polygon points="${x(0)},${yv(0)} ${pts} ${x(Y)},${yv(0)}" fill="#12a36b" opacity=".10"/>`;
          g += `<polyline class="sim-line" points="${pts}" fill="none" stroke="${p.c}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
          if (p.payback != null) g += `<circle cx="${x(p.payback)}" cy="${yv(0)}" r="5.5" fill="var(--paper)" stroke="${p.c}" stroke-width="3"/><text x="${x(p.payback)}" y="${yv(0) - 12 - k * 14}" text-anchor="middle" class="val" style="fill:${p.c};font-weight:800">${p.payback.toFixed(1)}년 회수</text>`;
        });
        $i("s-chart").innerHTML = `<div class="sim-legend">${plans.map((p) => `<span><i style="background:${p.c}"></i>${p.k} · 투자 ${eok(p.inv)}</span>`).join("")}</div>
          <svg class="chart" viewBox="0 0 ${Wc} ${Hc}" role="img" aria-label="20년 누적 현금흐름">${g}</svg>`;
        const bench = REP.filter((r) => r.effect && r.effect.payback).map((r) => `<span><b>${esc(norm(r.site))}</b> ${esc(r.effect.payback.value.replace("약 ", ""))} · 절감 ${esc((r.effect.saving || {}).value ? man(num(r.effect.saving.value)) + "원/년" : "–")}</span>`).join("");
        $i("s-bench").innerHTML = bench ? `<div class="sim-bench-h">실제 준공 현장 (시공완료보고서, 정부지원 70% 기준)</div><div class="sim-bench-l">${bench}</div>` : "";
        $i("s-note").textContent = `가정: ${METHODS[meth].name} · kW당 공사비 ${fmt(uc)}원(${meth ? "공장 지붕 공개가에 방식별 대표값 비율을 곱함, 부지비 제외" : "업체 공개가 기준, 지붕 보강 포함 여부에 따라 달라짐"}) · 발전 지수 ${METHODS[meth].gen}${meth ? " · 정부지원 70%는 건물 태양광 기준이라 이 방식은 지원 조건을 따로 확인" : ""} · 요금 상승 ${(esc2 * 100).toFixed(1)}%/년 · 출력 저하 ${(deg * 100).toFixed(1)}%/년(모듈 출력보증 30년 87.4% 수준) · 유지관리비 ${(om * 100).toFixed(1)}%/년 · 배출계수 0.4173tCO₂/MWh · 소나무 1그루 연 6.6kg 흡수(국립산림과학원). 세금 · 금융비용 · 요금제 변경 효과는 넣지 않았습니다.`;
      };
      ["s-kw", "s-h", "s-sc", "s-p", "s-c", "s-esc", "s-deg", "s-om"].forEach((id) => $i(id).addEventListener("input", run));
      $i("s-meth").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; meth = +b.dataset.m; $$("#s-meth button", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); costTouched = false; run(); });
      $i("s-pre").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { $i("s-kw").value = Math.round(+b.dataset.v); costTouched = false; run(); } });
      run();
      let rz; const onR = () => { clearTimeout(rz); rz = setTimeout(() => { if ($i("s-chart")) run(); }, 200); };
      window.addEventListener("resize", onR); cleanup.push(() => window.removeEventListener("resize", onR));
    }
  }

  const FAQ = [
    ["흐린 날이나 겨울에도 전기가 만들어지나요?", "만들어지지만 양이 줄어듭니다. 흐린 날은 맑은 날보다 크게 줄고, 겨울은 해가 짧아 발전량이 적습니다. 대신 기온이 낮으면 모듈 효율은 좋아집니다. 1년 평균으로 하루 약 3.5시간 발전을 가정해 계산합니다.", ["s1-4", "백서 1.4 숫자로 감 잡기"]],
    ["한전이 정전되면 태양광 전기로 공장을 돌릴 수 있나요?", "아니요. 한전 선로와 연결된 인버터는 정전이 되면 안전을 위해 스스로 멈춥니다(단독운전 방지). 복전 후 재기동 지연(현장 설정 300초)이 지나면 자동으로 다시 발전합니다.", ["ch18", "백서 18장 품질 · 검사"]],
    ["지붕에서 물이 새지 않나요?", "구조물이 지붕을 뚫는 부분이 가장 큰 누수 위험입니다. 관통부 방수 · 실리콘 · 볼트캡 처리를 하고, 덮이기 전에 사진으로 남깁니다. 노후 지붕은 설치 전에 칼라강판으로 보강합니다.", ["ch4", "백서 4장 시공 공정"]],
    ["설비는 몇 년 쓰고, 보증은 어떻게 되나요?", "2026 현장 기준 모듈 출력보증 30년(87.4%), 모듈 제품보증 12년, 인버터 5년, 시공 하자보증 3년입니다. 출력보증은 연 약 0.4%씩 줄어드는 것까지 보장한다는 뜻입니다.", ["ch19", "백서 19장 준공 · 보증"]],
    ["공사하는 동안 공장은 멈춰야 하나요?", "대부분 지붕 위 작업이라 공장은 평소대로 운영합니다. 수배전반에 연결하는 정전 작업만 필요해, 수용가와 날짜를 협의해 주말 · 휴일에 합니다.", ["ch4", "백서 4장 시공 공정"]],
    ["남는 전기는 어떻게 되나요?", "자가소비형은 남는 전기가 한전 쪽으로 가지 않도록 역전력계전기가 막습니다. 그래서 공장 사용량에 맞춰 용량을 정합니다. 상계거래를 하면 남는 전기를 한전에 보내고 요금에서 뺄 수 있습니다.", ["types", "사업 유형 · 진행 절차"]],
    ["청소나 점검은 얼마나 자주 하나요?", "원격 감시는 매일, 일상 점검은 월 1회, 정기 점검은 분기 1회, 정밀 점검(열화상 · 절연저항 · 청소 효과)은 연 1회 합니다. 청소는 발전량이 떨어지고 오염이 보일 때 합니다.", ["ch20", "백서 20장 O&M"]],
    ["화재 위험은 없나요?", "주요 원인은 직류 쪽 커넥터 불량과 아크입니다. 같은 제조사 커넥터 사용, 케이블 보호, 정기 열화상 점검이 기본 예방책입니다.", ["ch25", "백서 25장 화재 · 전기 안전"]],
  ];

  /* ---------- ⌘K 통합 검색 ---------- */
  function paletteItems(q) {
    const t = q.toLowerCase().trim(); const out = [];
    const hit = (s) => String(s || "").toLowerCase().includes(t);
    const go = [["개요", "home"], ["백서 표지 · 개정 이력", "wp"], ["사례집", "cases"], ["이슈 레지스터", "cases-issues"], ["원가 분석", "cost"], ["현장 양식", "forms"], ["수익 시뮬레이터", "calc-go"], ["진행 체크리스트", "check-go"], ["자주 묻는 질문", "faq-go"]];
    go.forEach(([n, h]) => { if (!t || hit(n)) out.push({ g: "바로가기", t: n, h }); });
    if (!t) return out.slice(0, 9);
    for (const { c } of CH) { if (hit(c.title)) out.push({ g: "백서 장", t: (typeof c.num === "number" ? c.num + "장 " : "") + c.title, h: c.id }); (c.sections || []).forEach((s) => { if (hit(s.text)) out.push({ g: "백서 절", t: s.text, h: s.id }); }); }
    REP.forEach((r, i) => { if (hit(r.site) || hit(norm(r.site))) out.push({ g: "사례집", t: r.site, s: `${fmt(r.kwp, 2)}kWp · ${r.inspection || ""}`, h: "case-" + (i + 1) }); });
    if (FORMS) FORMS.forms.forEach((f) => { if (hit(f.title) || hit(f.code)) out.push({ g: "양식", t: `양식 ${f.code} ${f.title}`, s: f.sub, h: "forms" }); });
    issuesList().forEach((x) => { if (hit(x.issue) || hit(x.fix)) out.push({ g: "이슈", t: `#${x.no} ${x.issue}`, s: x.site, h: "cases-issues" }); });
    doSearch(q).slice(0, 12).forEach((r) => out.push({ g: "본문", t: r.where, sh: r.h, h: r.href, q }));
    return out.slice(0, 40);
  }
  function openPalette() {
    if ($(".pal")) return;
    const m = document.createElement("div"); m.className = "pal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML = `<div class="pal-box"><div class="pal-in">${icon("search", 18)}<input id="pal-q" placeholder="백서 · 사례집 · 양식 · 이슈 검색" autocomplete="off" aria-label="통합 검색"><kbd>Esc</kbd></div><div class="pal-list" id="pal-list"></div>
      <div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> 이동</span><span><kbd>Enter</kbd> 열기</span><span><kbd>⌘</kbd><kbd>K</kbd> 언제든 열기</span></div></div>`;
    document.body.appendChild(m);
    const inp = $("#pal-q", m), list = $("#pal-list", m); let sel = 0, items = [];
    const paint = () => {
      items = paletteItems(inp.value); sel = Math.min(sel, Math.max(0, items.length - 1));
      let g = "";
      list.innerHTML = items.map((it, k) => { const head = it.g !== g ? `<div class="pal-g">${esc(it.g)}</div>` : ""; g = it.g;
        return `${head}<a class="pal-it ${k === sel ? "on" : ""}" href="#${it.h}" data-k="${k}"><b>${esc(it.t)}</b>${it.sh ? `<span>${it.sh}</span>` : it.s ? `<span>${esc(it.s)}</span>` : ""}</a>`; }).join("") || `<p class="pal-empty">“${esc(inp.value)}”에 맞는 결과가 없습니다.</p>`;
    };
    const close = () => { m.remove(); document.removeEventListener("keydown", key, true); };
    const open = (it) => { if (!it) return; close(); if (it.q) pendingHighlight = it.q; const h = it.h; if (/-go$/.test(h)) { const id = h.replace("-go", ""); const go2 = () => { const e = document.getElementById(id === "check" ? "checklist" : id); if (e) e.scrollIntoView({ behavior: "smooth", block: "start" }); }; location.hash = id === "check" ? "forms" : "home"; setTimeout(go2, 450); } else location.hash = h; };
    const key = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); paint(); $(".pal-it.on", list)?.scrollIntoView({ block: "nearest" }); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); $(".pal-it.on", list)?.scrollIntoView({ block: "nearest" }); }
      else if (e.key === "Enter") { e.preventDefault(); open(items[sel]); }
    };
    document.addEventListener("keydown", key, true);
    inp.addEventListener("input", () => { sel = 0; paint(); });
    list.addEventListener("click", (e) => { const a = e.target.closest(".pal-it"); if (a) { e.preventDefault(); open(items[+a.dataset.k]); } });
    m.addEventListener("click", (e) => { if (e.target === m) close(); });
    paint(); inp.focus();
  }
  document.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); } else if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); } });
  document.addEventListener("click", (e) => { if (e.target.closest("#pal-btn")) openPalette(); if (e.target.closest("#theme-btn")) cycleTheme(); });
  /* ---------- 테마 ---------- */
  const THEMES = ["system", "light", "dark"];
  function applyTheme(t) {
    if (t === "system") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    const b = $("#theme-btn"); if (b) { b.innerHTML = { system: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg>', light: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>', dark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>' }[t]; b.title = { system: "화면 테마: 시스템 설정", light: "화면 테마: 밝게", dark: "화면 테마: 어둡게" }[t]; }
  }
  function cycleTheme() { const cur = store.get("theme", "system"); const nx = THEMES[(THEMES.indexOf(cur) + 1) % 3]; store.set("theme", nx); applyTheme(nx); toast({ system: "시스템 설정을 따릅니다", light: "밝은 화면", dark: "어두운 화면" }[nx]); }

  function checklist(root) {
    const t = findTable(chByNum(3), "단계"); const box = $("#ck", root); if (!t || !box) { if (box) box.closest("section").hidden = true; return; }
    const stages = bodyRows(t).map((r) => ({ name: r[0], tasks: r[1].split(/[,·]/).map((x) => x.trim()).filter(Boolean), out: r[3], gate: /^[-–—\s]*$/.test(r[4] || "") ? "" : r[4], who: r[2] }));
    let site = store.get("ck-site", "새 현장");
    const paint = () => {
      const all = store.get("ck", {}); const st = all[site] || {};
      const keysOf = (s, i) => [...s.tasks.map((_, k) => `${i}-${k}`), ...(s.gate ? [`${i}-g`] : [])];
      const total = stages.reduce((a, s, i) => a + keysOf(s, i).length, 0), done = stages.reduce((a, s, i) => a + keysOf(s, i).filter((k) => st[k]).length, 0), pctv = total ? done / total : 0;
      const sites = Object.keys(all); if (!sites.includes(site)) sites.unshift(site);
      box.innerHTML = `<div class="ck-head">
          <div class="ck-ring" style="--p:${(pctv * 100).toFixed(1)}"><b>${Math.round(pctv * 100)}%</b><span>${done}/${total}</span></div>
          <div class="ck-site"><label for="ck-name">현장</label><div class="ck-row"><input id="ck-name" class="field" value="${esc(site)}" list="ck-sites"><datalist id="ck-sites">${sites.map((s) => `<option value="${esc(s)}">`).join("")}</datalist><button class="btn" type="button" id="ck-reset">초기화</button></div><small>이 기기에만 저장됩니다. 다른 이름을 넣으면 현장별로 따로 관리합니다.</small></div>
        </div>
        <ol class="ck-stages">${stages.map((s, i) => { const keys = keysOf(s, i); const d = keys.filter((k) => st[k]).length;
          return `<li class="${d === keys.length ? "done" : d ? "doing" : ""}"><div class="ck-sh"><span class="ck-n">${i}</span><b>${esc(s.name.replace(/^\d+\.\s*/, ""))}</b><span class="chip">${esc(s.who)}</span><span class="ck-c">${d}/${keys.length}</span></div>
            <div class="ck-items">${s.tasks.map((x, k) => `<label><input type="checkbox" data-k="${i}-${k}" ${st[`${i}-${k}`] ? "checked" : ""}><span>${esc(x)}</span></label>`).join("")}
            ${s.gate ? `<label class="gate"><input type="checkbox" data-k="${i}-g" ${st[`${i}-g`] ? "checked" : ""}><span><b>진행 조건</b> ${esc(s.gate)}</span></label>` : ""}${s.out ? `<small>산출물: ${esc(s.out)}</small>` : ""}</div></li>`; }).join("")}</ol>`;
    };
    box.addEventListener("change", (e) => {
      const c = e.target; const all = store.get("ck", {});
      if (c.id === "ck-name") { site = c.value.trim() || "새 현장"; store.set("ck-site", site); paint(); return; }
      if (!c.dataset.k) return; all[site] = all[site] || {}; all[site][c.dataset.k] = c.checked; store.set("ck", all); const k = c.dataset.k; paint(); $(`[data-k="${k}"]`, box)?.focus();
    });
    box.addEventListener("click", (e) => { if (e.target.id === "ck-reset") { const all = store.get("ck", {}); delete all[site]; store.set("ck", all); paint(); toast(`${site} 체크리스트를 비웠습니다`); } });
    paint();
  }

  /* ---------- 홈 실시간 3D (three.js, CDN) ---------- */
  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
  let threeP = null;
  const Z_IC = {
    in: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    out: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    reset: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/></svg>',
    full: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };
  /* 3D 보기: 끌어서 회전, 휠 · 두 손가락 · 버튼으로 확대, 더블클릭한 곳으로 이동, 크게 보기 */
  async function viewer3d(cfg) {
    const st = cfg.stage; if (!st || !window.SOLAR3D) return null;
    const hr = cfg.hr, tEl = cfg.tEl, outEl = cfg.outEl, sw = cfg.sw, poster = $(".h3-poster", st), fullEl = cfg.fullEl || st;
    const hhmm = (h) => { const H = Math.floor(h), m = Math.round((h - H) * 60 / 5) * 5; const hh = m === 60 ? H + 1 : H, mm = m === 60 ? 0 : m; return `${hh < 12 ? "오전" : "오후"} ${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")}`; };
    let THREE;
    try { threeP = threeP || import(THREE_URL); THREE = await threeP; } catch (e) { threeP = null; st.classList.add("still"); return null; }
    if (!st.isConnected) return null;
    let renderer;
    const canvas = document.createElement("canvas"); canvas.className = "h3-cv";
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { st.classList.add("still"); return null; }
    const small = matchMedia("(max-width: 760px)").matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0x000000, 0);
    const dots = document.createElement("div"); dots.className = "h3-dots";
    const tip = document.createElement("div"); tip.className = "h3-tip"; tip.hidden = true;
    const hint = document.createElement("span"); hint.className = "h3-hint"; hint.innerHTML = `${icon("pointer", 14)} 끌어서 회전 · 휠로 확대 · 더블클릭한 곳으로 이동`;
    const zb = document.createElement("div"); zb.className = "h3-zoom";
    zb.innerHTML = `<button type="button" data-z="in" aria-label="확대" title="확대">${Z_IC.in}</button><button type="button" data-z="out" aria-label="축소" title="축소">${Z_IC.out}</button><button type="button" data-z="reset" aria-label="전체 보기" title="전체 보기">${Z_IC.reset}</button><button type="button" data-z="full" aria-label="크게 보기" title="크게 보기">${Z_IC.full}</button>`;
    st.append(canvas, dots, tip, hint, zb);
    let S3 = null, HS = [], base = { az: 30, el: 28 }, az = 30, el = 28, aspect = 1, dist = 1, idle = 0, visible = true, raf = 0, dirty = true, armed = false, ph = null;
    let zoom = 1, zoomGoal = 1; const ZMIN = 0.7, ZMAX = 9;
    const tgt = new THREE.Vector3(), tgtGoal = new THREE.Vector3(), v = new THREE.Vector3();
    const clampZ = (z) => Math.max(ZMIN, Math.min(ZMAX, z));
    const info = (h) => ({ ...(EQ[h.key] || {}), ...(h.t ? { t: h.t, s: h.s, tag: h.tag } : {}) });
    const size = () => { const r = st.getBoundingClientRect(); if (!r.width || !r.height) return; aspect = r.width / r.height; renderer.setSize(r.width, r.height, false); if (S3) dist = S3.orbit(base.az, base.el, aspect) * 0.86; dirty = true; };
    const sun = () => { if (!S3) return; const h = hr ? +hr.value : 10.5, f = S3.setSun(h), kwp = (S3.modules || 0) * 0.645; if (tEl) tEl.textContent = hhmm(h); if (outEl) outEl.innerHTML = `발전 <b>${Math.round(f * 100)}%</b>${kwp ? ` · 약 ${fmt(kwp * f * 0.86, 0)}kW <small>(${fmt(kwp, 0)}kWp)</small>` : ""}`; dirty = true; };
    const showTip = (i) => { const h = HS[i]; if (!h) { tip.hidden = true; return; } const e = info(h); tip.hidden = false; tip.innerHTML = `<b>${esc(e.t)}</b><span>${esc(e.s || "")}</span>${e.tag ? `<em>${esc(e.tag)}</em>` : ""}`; $$(".h3-dot", dots).forEach((d) => d.classList.toggle("on", +d.dataset.i === i)); };
    const home = () => { if (!S3) return; tgtGoal.copy(S3.center); zoomGoal = 1; az = ((az - base.az + 540) % 360) - 180 + base.az; idle = 0; tip.hidden = true; $$(".h3-dot", dots).forEach((d) => d.classList.remove("on")); };
    const load = (shot) => {
      if (S3) S3.dispose();
      S3 = SOLAR3D.create(THREE, { shot, live: true, shadowMap: small ? 1024 : 2048, hour: hr ? +hr.value : 10.5 });
      S3.setupEnv(renderer);
      base = { az: S3.view.az, el: S3.view.el }; az = base.az; el = base.el; zoom = zoomGoal = 1; tgt.copy(S3.center); tgtGoal.copy(S3.center);
      HS = S3.hotspots.filter((h) => h.t || EQ[h.key]);
      dots.innerHTML = HS.map((h, i) => `<button type="button" class="h3-dot" data-i="${i}" aria-label="${esc(info(h).t)}"><i></i><span>${esc(info(h).t)}</span></button>`).join("");
      tip.hidden = true; size(); sun();
    };
    dots.addEventListener("click", (e) => { const b = e.target.closest(".h3-dot"); if (!b) return; e.stopPropagation(); const i = +b.dataset.i; showTip(i); tgtGoal.copy(HS[i].pos); zoomGoal = clampZ(Math.max(zoomGoal, 3.2)); idle = -1e9; });
    const placeDots = () => {
      const r = st.getBoundingClientRect();
      $$(".h3-dot", dots).forEach((d, i) => { if (!HS[i]) return; v.copy(HS[i].pos).project(S3.camera); const on = v.z < 1 && Math.abs(v.x) < 0.97 && Math.abs(v.y) < 0.97; d.style.transform = `translate(${((v.x + 1) / 2 * r.width).toFixed(1)}px, ${((1 - v.y) / 2 * r.height).toFixed(1)}px)`; d.classList.toggle("off", !on); });
    };
    const setFull = (on) => {
      if (on === !!ph) return;
      if (on) { ph = document.createComment("3d"); fullEl.parentNode.insertBefore(ph, fullEl); document.body.appendChild(fullEl); fullEl.classList.add("full3d"); document.documentElement.classList.add("full3d-on"); }
      else { if (ph.parentNode) ph.parentNode.insertBefore(fullEl, ph); else fullEl.remove(); ph.remove(); ph = null; fullEl.classList.remove("full3d"); document.documentElement.classList.remove("full3d-on"); }
      const fb = $('[data-z="full"]', zb); fb.innerHTML = on ? Z_IC.close : Z_IC.full; fb.title = on ? "닫기 (Esc)" : "크게 보기"; fb.setAttribute("aria-label", fb.title);
      size();
    };
    zb.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const z = b.dataset.z; hint.classList.add("gone");
      if (z === "in") { zoomGoal = clampZ(zoomGoal * 1.5); idle = -1e9; } else if (z === "out") { zoomGoal = clampZ(zoomGoal / 1.5); if (zoomGoal <= 1.02) home(); } else if (z === "reset") home(); else setFull(!ph); });
    // 포인터: 한 손가락 회전, 두 손가락 확대
    const pts = new Map(); let pinch0 = 0, zoom0 = 1;
    const pd = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    st.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { st.setPointerCapture(e.pointerId); } catch (er) { /* 없음 */ } armed = true; st.classList.add("drag"); hint.classList.add("gone"); if (pts.size === 2) { pinch0 = pd(); zoom0 = zoomGoal; } });
    st.addEventListener("pointermove", (e) => { const p = pts.get(e.pointerId); if (!p) return;
      if (pts.size === 1) { const k = 1 / Math.sqrt(zoom); az -= (e.clientX - p.x) * 0.35 * k; el = Math.max(6, Math.min(80, el + (e.clientY - p.y) * 0.25 * k)); idle = Math.min(idle, -300); dirty = true; }
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2 && pinch0 > 0) { zoomGoal = clampZ(zoom0 * pd() / pinch0); idle = -1e9; } });
    const up = (e) => { pts.delete(e.pointerId); if (!pts.size) st.classList.remove("drag"); pinch0 = 0; };
    st.addEventListener("pointerup", up); st.addEventListener("pointercancel", up);
    st.addEventListener("pointerleave", () => { if (!pts.size) armed = false; });
    st.addEventListener("wheel", (e) => { if (!(armed || ph || e.ctrlKey)) return; e.preventDefault(); zoomGoal = clampZ(zoomGoal * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016))); if (zoomGoal <= 1.02 && e.deltaY > 0 && tgtGoal.distanceTo(S3.center) > 0.01) tgtGoal.copy(S3.center); idle = -1e9; hint.classList.add("gone"); }, { passive: false });
    st.addEventListener("dblclick", (e) => { if (e.target.closest("button") || !S3) return; const r = st.getBoundingClientRect(); const p = S3.pick((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)); if (p) { tgtGoal.copy(p); zoomGoal = clampZ(Math.max(zoomGoal * 1.8, 2.4)); idle = -1e9; } });
    const onKey = (e) => { if (e.key === "Escape" && ph) setFull(false); };
    document.addEventListener("keydown", onKey);
    if (hr) hr.addEventListener("input", () => { sun(); idle = Math.min(idle, -300); });
    if (sw) sw.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || b.getAttribute("aria-pressed") === "true") return;
      $$("button", sw).forEach((x) => x.setAttribute("aria-pressed", x === b)); st.classList.add("switching");
      if (poster) poster.src = `3d/${b.dataset.img}.webp`;
      setTimeout(() => { load(b.dataset.shot); st.classList.remove("switching"); }, 180);
    });
    const ro = new ResizeObserver(size); ro.observe(st);
    const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible && !raf) loop(); }, { threshold: 0.02 }); io.observe(st);
    let t = 0, first = true;
    const loop = () => {
      raf = 0; if (!visible || document.hidden || !st.isConnected) return;
      t++; idle++;
      if (Math.abs(zoomGoal - zoom) > 0.002 || tgt.distanceToSquared(tgtGoal) > 1e-5) { zoom += (zoomGoal - zoom) * 0.16; tgt.lerp(tgtGoal, 0.16); dirty = true; }
      if (!pts.size && idle > 0 && !reduceMotion && !ph && zoomGoal === 1) { const target = base.az + Math.sin(t / 420) * 24; az += (target - az) * 0.02; el += (base.el - el) * 0.02; dirty = true; }
      if (dirty && S3) { S3.orbit(az, el, aspect, dist / zoom, tgt); renderer.render(S3.scene, S3.camera); placeDots(); dirty = false; st.classList.toggle("zoomed", zoomGoal > 1.05); if (first) { first = false; st.classList.add("on3d"); } }
      raf = requestAnimationFrame(loop);
    };
    const onVis = () => { if (!document.hidden && visible && !raf) loop(); };
    document.addEventListener("visibilitychange", onVis);
    load(cfg.shot || "hero"); loop();
    const destroy = () => { cancelAnimationFrame(raf); raf = 0; visible = false; ro.disconnect(); io.disconnect(); document.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVis); if (ph) { fullEl.remove(); ph = null; document.documentElement.classList.remove("full3d-on"); } if (S3) S3.dispose(); renderer.dispose(); renderer.forceContextLoss(); };
    cleanup.push(destroy);
    return { load, destroy };
  }
  function hero3d(root) {
    return viewer3d({ stage: $("#h3", root), fullEl: $(".h3-col", root), shot: "hero", hr: $("#h3-hr", root), tEl: $("#h3-time", root), outEl: $("#h3-out", root), sw: $("#h3-sw", root) });
  }
  /* 장 · 파트 배너용 3D 그림 */
  const CH_ART = { 1: "hero", 2: "office", 3: "doc", 4: "step3", 5: "safety", 6: "survey", 7: "hero", 8: "step2", 9: "step6", 10: "doc", 11: "doc-contract", 12: "survey", 13: "doc-design", 14: "doc-permit", 15: "module", 16: "step3", 17: "safety", 18: "step6", 19: "step5", 20: "monitor", 21: "money", 22: "doc-contract", 23: "office", 24: "rpr", 25: "board", 26: "monitor", 27: "money", 28: "doc", 29: "hero", 30: "structure", 31: "doc-design", 32: "module" };
  const PART_ART = ["", "step3", "survey", "doc-permit", "money", "structure"];

  /* ---------- 설치 방식 (어디에 짓나) ----------
     금액: 100kW 안팎 · 계통연계 포함 · 부지비 제외. 업체 공개가 · 매체 · 연구 자료의 범위이며 견적 전 참고용.
     발전 지수: 남향 30° 경사 = 100 으로 본 대략값 (경사 · 방위 손실만 반영). */
  const METHODS = [
    { k: "roof", parts: ["모듈 · 레일 (지붕 고정)", "인버터 (외벽)", "케이블 트레이", "수배전반 · 역전력계전기", "모니터링", "안전난간 · 사다리"], img: "hero", name: "공장 · 창고 지붕", short: "지붕", sub: "골강판 지붕 위에 레일을 고정하고 모듈을 얹습니다", tag: "2026 군산 현장 방식",
      cost: [130, 165], rep: 142, gen: 95, area: "약 4.7m²/kW", site: "기존 지붕 (부지비 없음)",
      fit: "지붕이 넓고 낮에 전기를 많이 쓰는 공장 · 물류창고",
      pros: ["따로 땅이 필요 없고 공사가 빠르다", "공장이 바로 쓰는 자가소비에 가장 잘 맞는다", "건물 태양광 정부 지원 대상"],
      cons: ["지붕 상태(노후 · 석면 · 하중)에 따라 보강비가 붙는다", "관통부 누수 · 벤추레이터 그늘 관리가 필요하다"],
      checks: ["지붕재 노후 · 석면 여부 (보강 · 철거비)", "구조검토: 모듈 · 구조물 하중을 지붕이 견디는지", "관통부 방수 처리와 사진 기록", "벤추레이터 · 채광창 그늘과 안전 (덮개 · 난간)", "건축물대장 위반건축물 여부 (인허가 거부 사유)"],
      permit: "구조검토서, 규모에 따라 전기공사계획 신고 · 공작물 축조신고", src: "업체 공개가 30kW 164만 · 100kW 142만 · 210kW 130만원/kW (후광일렉트릭, 2026)" },
    { k: "flat", parts: ["모듈 · 경사 거치대", "무게 블록 기초", "인버터 (옥탑 벽)", "옥상 트레이 · 수직 덕트", "수배전반", "모니터링"], img: "flatroof", name: "평지붕 옥상", short: "옥상", sub: "콘크리트 옥상에 경사 거치대를 세우고 무게 블록이나 앵커로 고정합니다",
      cost: [150, 180], rep: 165, est: true, gen: 97, area: "약 7~9m²/kW (줄 사이 그림자 간격 포함)", site: "기존 옥상",
      fit: "사무동 · 상가 · 학교처럼 평평한 옥상이 있는 건물",
      pros: ["경사를 원하는 각도로 줄 수 있어 발전 효율이 좋다", "구멍을 내지 않는 무타공 방식을 고를 수 있다"],
      cons: ["경사 거치대 · 무게 블록 비용이 더 든다", "줄 사이를 띄워야 해 같은 면적에 들어가는 용량이 적다"],
      checks: ["슬래브 허용 하중 (무게 블록까지 포함해 구조검토)", "방수층 상태 · 방수 보증 범위 (설치 전 사진)", "모서리 · 가장자리 풍하중 (블록 무게 · 앵커 결정)", "동지 기준 줄 간격 (앞줄 그림자)", "실외기 · 물탱크 · 파라펫 그늘, 점검 통로 확보"],
      permit: "구조검토서, 옥상 위 구조물 높이에 따라 공작물 축조신고 확인", src: "지붕형 단가에 경사 거치대 · 무게 기초 · 방수 보호 비용을 더한 추정 (평지붕은 경사 프레임 추가 비용 발생: 후광일렉트릭)" },
    { k: "carport", parts: ["모듈 · 캐노피 (기둥 · 보)", "기초 · 충돌 보호대", "인버터 (기둥 부착)", "지중 관로 · 맨홀", "수배전반", "빗물받이 · 조명", "전기차 충전기 (선택)"], img: "carport", name: "주차장 (카포트)", short: "주차장", sub: "주차면 위에 기둥 · 보로 지붕을 세우고 그 위에 모듈을 얹습니다", tag: "공영주차장 설치 확대 중",
      cost: [150, 200], rep: 175, gen: 93, area: "주차 1면(2.5×5m)에 약 2.5~3kW", site: "기존 주차장 (주차면 유지)",
      fit: "넓은 직원 주차장이 있는 공장 · 공공기관 · 대형 매장",
      pros: ["주차장을 그대로 쓰면서 발전 (그늘 · 비 가림 효과)", "전기차 충전기와 함께 설치하기 좋다"],
      cons: ["기둥 · 보 · 기초를 새로 세워 지붕형보다 비싸다", "차량 충돌 · 적설 · 배수까지 설계해야 한다"],
      checks: ["주차면 수와 차로 폭 유지 (기둥 위치를 주차선에 맞춤)", "높이 2.5m 이상 · 화물차 · 소방차 진입 높이", "기초 자리 아래 배관 · 전선 매설물 조사", "적설 · 풍하중 구조계산, 차량 충돌 보호대", "빗물받이 · 홈통 배수, 조명 · CCTV 재설치", "건축물 해당 여부 · 공작물 축조신고를 지자체에 확인"],
      permit: "구조계산서, 지자체 건축 부서에 건축물 · 공작물 해당 여부 확인", src: "일반 지상형보다 설치비가 약 30~40% 높다는 분석 (솔라투데이) 을 지상형 단가에 적용" },
    { k: "ground", parts: ["모듈 · 지상 구조물", "스트링 인버터", "케이블 트렌치", "변압기 (고압 연계 시)", "수배전반 · 전기실", "울타리 · CCTV", "배수로 · 기상 센서"], img: "ground", name: "지상 (토지 · 노지)", short: "지상", sub: "땅에 기초를 박고 최적 경사로 여러 줄을 세웁니다",
      cost: [110, 140], rep: 125, gen: 100, area: "약 10~15m²/kW (줄 간격 포함)", site: "토지 매입 · 임대 별도",
      fit: "공장 옆 유휴 부지, 전기를 파는 발전사업",
      pros: ["kW당 공사비가 가장 낮은 편이다", "경사 · 방위를 최적으로 잡아 발전량이 많다"],
      cons: ["토지비 · 토목 · 인허가비가 따로 든다", "개발행위허가 · 이격거리 · 주민 민원 변수가 크다"],
      checks: ["토지 지목 (농지 · 임야면 전용 허가 · 부담금)", "지자체 이격거리 조례 (도로 · 주거지)", "토목: 절토 · 성토, 배수로, 옹벽, 침수 이력", "계통 접속 여유 (변전소 · 배전선로 용량)", "펜스 · 출입문 · 잡초 관리, 주민 설명"],
      permit: "개발행위허가, 농지 · 산지 전용, 발전사업허가(판매 시)", src: "100kW 약 1.1~1.4억원 (해줌 · 한국에너지가이드, 2026). 인허가 · 토목 · 울타리는 별도인 경우가 많음" },
    { k: "agri", parts: ["모듈 · 높은 구조물", "인버터 (기둥 부착)", "지중 관로", "수배전반", "모니터링"], img: "agri", name: "영농형 (농지 위)", short: "영농형", sub: "농지 위에 높은 구조물을 세워 농사와 발전을 함께 합니다",
      cost: [130, 160], rep: 145, gen: 100, area: "줄 간격을 넓혀 땅의 약 30% 안팎만 덮음", site: "농지 (농사 계속)",
      fit: "농가 · 농업법인, 공장 주변 농지",
      pros: ["농사를 계속하면서 추가 수입", "농촌 태양광 금융지원 대상이 될 수 있다"],
      cons: ["농기계가 지나가도록 구조물이 높아 공사비가 오른다", "농지 사용 기간 · 수확량 유지 조건이 붙는다"],
      checks: ["농지 타용도 일시사용 허가 기간과 갱신 조건", "하부 작물 수확량 유지 의무 · 확인 방법", "구조물 높이 · 기둥 간격 (농기계 통과)", "작물에 닿는 빛 (모듈 간격 · 배치)", "농민 참여 · 수익 배분 구조"],
      permit: "농지 타용도 일시사용 허가, 개발행위허가", src: "100~300kW 기준 kW당 130~160만원 (한국에너지가이드, 2026), 2021 연구 kW당 159만원 (한국신재생에너지학회지)" },
    { k: "floating", parts: ["모듈 · 부력체", "계류 줄 · 앵커", "점검 통로 · 접속반", "수상 케이블", "육상 전기실 (인버터 · 변압기)", "수배전반"], img: "floating", name: "수상 (저수지 · 호수)", short: "수상", sub: "물 위에 부력체를 띄우고 그 위에 모듈을 얹은 뒤 줄로 고정합니다",
      cost: [160, 200], rep: 179, est: true, gen: 97, area: "수면 사용 (땅 불필요)", site: "수면 사용 허가 · 점용료",
      fit: "농업용 저수지 · 댐 · 정수장을 가진 공공기관 · 대규모 사업",
      pros: ["땅을 쓰지 않고, 물이 모듈을 식혀 효율이 조금 오를 수 있다", "주변에 가리는 것이 없어 그늘이 적다"],
      cons: ["부력체 · 계류 공사로 단가가 높다", "수위 변화 · 결빙 · 부식 관리가 필요하다"],
      checks: ["수면 관리자 사용 허가 (농어촌공사 · 지자체 등)", "수위 변동 · 결빙 · 태풍에 맞는 계류(앵커 · 줄) 설계", "수질 · 생태 영향 검토", "부력체 재질 인증 · 내구성", "점검용 보트 · 통로, 감전 안전"],
      permit: "공유수면 · 저수지 사용 허가, 환경 영향 검토", src: "2021 연구 3MW 기준 kW당 약 179만원 (한국환경공학회지). 최근 단가 자료가 적어 범위는 추정" },
    { k: "wall", parts: ["모듈 · 브래킷", "인버터", "수직 트레이", "수배전반", "모니터링"], img: "wall", name: "건물 벽면 (BAPV · BIPV)", short: "벽면", sub: "남쪽 벽에 모듈을 붙이거나(BAPV), 외장재 자체를 모듈로 만듭니다(BIPV)",
      cost: [170, 180], rep: 175, gen: 65, area: "벽 면적 (남향 벽)", site: "기존 건물 벽",
      fit: "지붕이 좁은 고층 건물 · 사옥, 건물 디자인을 함께 바꾸는 신축",
      pros: ["지붕이 모자랄 때 추가 용량을 확보", "BIPV는 외장재를 대신해 건물 디자인 요소가 된다"],
      cons: ["세워 붙여 발전량이 지붕의 약 60~70% 수준", "BIPV는 일반 모듈보다 2~3배 비싸다"],
      checks: ["벽 방위 (남향 · 동서향), 주변 건물 그늘", "앵커 · 브래킷 풍하중 구조검토", "외장재 화재 안전 기준 (불연 · 준불연)", "창 가림 · 미관 · 반사광 민원", "고소작업 · 유지보수 접근 방법"],
      permit: "구조검토, 건축물 외장 변경 시 건축 부서 확인", src: "BAPV kW당 약 170~180만원, BIPV는 일반 태양광 대비 2~3배 (정책 기사, 2026)" },
  ];
  const METHOD_SRC = [
    ["후광일렉트릭 — 공장 지붕 태양광 설치 비용 (2026)", "https://hugwangsolar.co.kr/posts/factory-roof-solar-installation-cost-comparison-2026"],
    ["한국에너지가이드 — 2026년 태양광 설치 비용", "https://koreaenergy.kr/2026%EB%85%84-%ED%83%9C%EC%96%91%EA%B4%91-%EC%84%A4%EC%B9%98-%EB%B9%84%EC%9A%A9-%EC%B4%9D%EC%A0%95%EB%A6%AC-kw%EB%8B%B9-%EB%8B%A8%EA%B0%80%EB%B6%80%ED%84%B0-%EC%8B%A4%ED%88%AC%EC%9E%90/"],
    ["해줌 — 2026 태양광 사업 가이드", "https://blog.haezoom.com/insight_rps_11/"],
    ["솔라투데이 — 주차장 태양광, 의무화 넘어 가치 설계로", "https://www.solartodaymag.com/news/articleView.html?idxno=20952"],
    ["한국 태양광 발전 산업의 진흥을 위한 제안 (건물 · 영농형 · 수상 CAPEX)", "https://www.jksee.or.kr/journal/view.php?viewtype=pubreader&number=4518"],
    ["영농형 태양광 경제성 제고를 위한 정책 방안", "https://journalksnre.com/xml/40085/40085.pdf"],
    ["네이트 뉴스 — BIPV, 도심의 게임 체인저 (2026)", "https://m.news.nate.com/view/20260405n09027"],
  ];
  function methodBadges(i) {
    const m = METHODS[i];
    return `<span><small>kW당 공사비</small><b>${m.cost[0]}~${m.cost[1]}<em>만원</em></b>${m.est ? `<i>추정</i>` : ""}</span><span><small>100kW 총액</small><b>${(m.cost[0] / 100).toFixed(1)}~${(m.cost[1] / 100).toFixed(1)}<em>억</em></b></span><span><small>발전 지수</small><b>${m.gen}</b></span>`;
  }
  function methodBody(i) {
    const m = METHODS[i];
    return `<div class="md-h">${m.tag ? `<span class="chip">${esc(m.tag)}</span>` : ""}<h3>${esc(m.name)}</h3><p>${esc(m.sub)}</p></div>
        <dl class="md-kv"><dt>이런 곳에</dt><dd>${esc(m.fit)}</dd><dt>필요 면적</dt><dd>${esc(m.area)}</dd><dt>부지</dt><dd>${esc(m.site)}</dd><dt>인허가</dt><dd>${esc(m.permit)}</dd></dl>
        <div class="md-parts"><b>구성 설비</b><div>${m.parts.map((x, k) => `<span><i>${k + 1}</i>${esc(x)}</span>`).join("")}</div></div>
        <div class="md-pc"><div><b class="ok">좋은 점</b><ul>${m.pros.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div><b class="ng">부담</b><ul>${m.cons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div>
        <div class="md-ck"><b>${icon("check", 16)} 이 방식이면 더 확인할 것</b><ol>${m.checks.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></div>
        <p class="from md-src">금액 근거: ${esc(m.src)}</p>
        <button type="button" class="btn primary md-go" data-m="${i}">이 방식으로 수익 계산 →</button>`;
  }
  function methodCompare() {
    const lo = 100, hi = 210, X = (v) => ((v - lo) / (hi - lo) * 100).toFixed(2) + "%";
    const ticks = [100, 125, 150, 175, 200];
    return `<div class="mc-chart" role="img" aria-label="설치 방식별 kW당 공사비 범위">
      <div class="mc-axis">${ticks.map((t) => `<span style="left:${X(t)}">${t}만</span>`).join("")}</div>
      ${METHODS.map((m, i) => `<button type="button" class="mc-row" data-i="${i}"><span class="mc-n"><img src="3d/${m.img}.webp" alt="" loading="lazy">${esc(m.short)}</span>
        <span class="mc-track">${ticks.map((t) => `<i class="mc-grid" style="left:${X(t)}"></i>`).join("")}<span class="mc-bar ${m.est ? "est" : ""}" style="left:${X(m.cost[0])};width:calc(${X(m.cost[1])} - ${X(m.cost[0])})"></span><span class="mc-dot" style="left:${X(m.rep)}"><b>${m.rep}</b></span></span>
        <span class="mc-g"><i style="width:${m.gen}%"></i><b>${m.gen}</b></span></button>`).join("")}
      <div class="mc-foot"><span><i class="mc-bar-k"></i> kW당 공사비 범위 (만원, 100kW 안팎 · 부지비 제외)</span><span><i class="mc-bar-k est"></i> 자료가 적어 추정</span><span><i class="mc-dot-k"></i> 대표값</span><span><i class="mc-g-k"></i> 발전 지수 (남향 30° = 100)</span></div>
    </div>
    <div class="tbl"><table class="mc-table"><thead><tr><th>방식</th><th>kW당</th><th>100kW 총액</th><th>발전 지수</th><th>부지</th><th>가장 먼저 확인</th></tr></thead><tbody>
      ${METHODS.map((m) => `<tr><td><b>${esc(m.name)}</b></td><td class="num">${m.cost[0]}~${m.cost[1]}만${m.est ? "<sup>추정</sup>" : ""}</td><td class="num">${(m.cost[0] / 100).toFixed(1)}~${(m.cost[1] / 100).toFixed(1)}억</td><td class="num">${m.gen}</td><td>${esc(m.site)}</td><td>${esc(m.checks[0])}</td></tr>`).join("")}
    </tbody></table></div>
    <p class="from mc-note">금액은 업체 공개가 · 매체 · 연구 자료의 범위로, 지붕 보강 · 토목 · 토지비 · 인허가비 포함 여부에 따라 크게 달라집니다. 실제 판단은 현장 실사와 3곳 이상 견적으로 합니다. 판매 사업(REC)이라면 방식별 REC 가중치도 다르니 현행 고시를 확인하세요.</p>
    <p class="from mc-src">출처: ${METHOD_SRC.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`).join(" · ")}</p>`;
  }
  function linkify(h) {
    // "PART 1(1~5장)", "7장", "12장, 13장" → 링크
    return deco(h).replace(/(\d{1,2})장/g, (m, n) => chByNum(+n) ? `<a href="#ch${n}">${m}</a>` : m);
  }

  /* ---------- 7장 현장별 분석: 백서 표를 웹용으로 다시 디자인 ---------- */
  const COVERS = { "우림2공장": "rep/r1-21-000.jpg" };  // 현장별 대표(완공) 사진
  const cellH = (c) => deco(c.html || "");
  const isLockRow = (r) => r.length === 1 && /lockph/.test(r[0].html || "");
  const lockRow = (r) => `<div class="lockrow">${r[0].html}</div>`;
  function siteSection(blocks, opt = {}) {
    const parts = [{ title: null, blocks: [] }];
    for (const b of blocks) { if (b.t === "h4") parts.push({ title: b.text, blocks: [] }); else parts[parts.length - 1].blocks.push(b); }
    const sub = (t, ic, body, cls = "") => `<section class="ss ${cls}"><h4 class="ss-h">${ic ? `<span class="ss-ic">${icon(ic, 17)}</span>` : ""}${deco(esc(t))}</h4>${body}</section>`;
    let html = "";
    for (const p of parts) {
      const t = p.title || "";
      if (!p.title) html += siteProfile(p.blocks);
      else if (/진행 경과/.test(t)) html += sub(t, "chart", siteTimeline(p.blocks), "ss-tl");
      else if (/인허가/.test(t)) html += sub(t, "doc", siteNotes(p.blocks, "permit"));
      else if (/시공 특이/.test(t)) html += sub(t, "tool", siteNotes(p.blocks, "build"));
      else if (/미결/.test(t)) html += sub(t, "check", siteOpen(p.blocks));
      else if (/시공 기록|업무일지/.test(t)) html += sub(t, "steps", siteWorklog(p.blocks), "ss-log");
      else if (/사진/.test(t)) { if (!opt.noPhotos) html += sub(t, "grid", renderBlocks(p.blocks)); }
      else if (/비교/.test(t)) html += sub(t, "scale", siteCompare(p.blocks), "ss-cmp");
      else html += sub(t, null, renderBlocks(p.blocks));
    }
    return `<div class="site-sec">${html}</div>`;
  }
  function siteProfile(blocks) {
    let html = "";
    for (const b of blocks) {
      if (b.t === "table" && !b.head && b.rows.every((r) => r.length === 2 || isLockRow(r))) {
        html += `<div class="sp-grid">${b.rows.map((r) => isLockRow(r) ? lockRow(r) : `<div class="sp"><span>${esc(plain(r[0].html))}</span><b>${cellH(r[1])}</b></div>`).join("")}</div>`;
      } else html += renderBlock(b);
    }
    return html;
  }
  const MAJOR = /허가|검사|합격|계약|철회|착공|준공|확인증|완료보고|보류|재개/;
  function siteTimeline(blocks) {
    return blocks.map((b) => {
      if (b.t !== "table") return renderBlock(b);
      const rows = b.rows.slice(b.head || 0);
      return `<ol class="stl">${rows.map((r) => isLockRow(r) ? `<li>${lockRow(r)}</li>` : `<li class="${MAJOR.test(plain(r[1] ? r[1].html : "")) ? "major" : ""}"><span class="stl-d">${esc(plain(r[0].html))}</span><div class="stl-b">${r.slice(1).map(cellH).join(" · ")}</div></li>`).join("")}</ol>`;
    }).join("");
  }
  function siteNotes(blocks, kind) {
    return blocks.map((b) => {
      if (b.t === "ul") return `<ol class="snotes ${kind}">${b.items.map((x) => `<li>${deco(x)}</li>`).join("")}</ol>`;
      if (b.t === "callout" && /교훈/.test(b.title || "")) {
        const items = b.c.map((x) => x.html || "").filter(Boolean);
        return `<div class="slesson"><div class="slesson-h">${icon("star", 16)} ${esc(b.title)}</div><ol>${items.map((x) => `<li>${deco(x)}</li>`).join("")}</ol></div>`;
      }
      return renderBlock(b);
    }).join("");
  }
  function siteOpen(blocks) {
    return blocks.map((b) => {
      if (b.t !== "table") return renderBlock(b);
      const head = b.head ? cellsText(b.rows[0]) : [];
      const rows = b.rows.slice(b.head || 0);
      return `<div class="sopen">${rows.filter((r) => isLockRow(r) || cellsText(r).some((x) => x.trim())).map((r) => {
        if (isLockRow(r)) return lockRow(r);
        const txt = cellsText(r), done = /완료|합격|종결/.test(txt[3] || "") || /^(완료|합격)/.test((txt[1] || "").trim());
        const who = txt[2] && txt[2].trim(), due = txt[3] && txt[3].trim();
        return `<div class="so ${done ? "done" : ""}"><span class="so-st">${done ? "✓" : "!"}</span><div><b>${cellH(r[0])}</b><p>${r[1] ? cellH(r[1]) : ""}</p></div>
          <div class="so-meta">${who ? `<span class="chip">${esc(who)}</span>` : ""}<span class="chip ${done ? "good" : "warn"}">${esc(due || (done ? "완료" : "미정"))}</span></div></div>`;
      }).join("")}</div>${head.length ? "" : ""}`;
    }).join("");
  }
  const WORK = [["사업관리", "#7a849a"], ["자재", "#a0682e"], ["지붕", "#3266ff"], ["강판", "#3266ff"], ["안전", "#f08400"], ["구조물", "#24407a"], ["모듈", "#1d3fbf"], ["전기", "#d4a000"], ["검사", "#12a36b"], ["시운전", "#12a36b"], ["준공", "#12a36b"]];
  const workChips = (s) => String(s).split(/[·,/]/).map((x) => x.trim()).filter(Boolean).map((x) => { const m = WORK.find(([k]) => x.includes(k)); return `<span class="wk" style="--wc:${m ? m[1] : "#7a849a"}">${esc(x)}</span>`; }).join("");
  function siteWorklog(blocks) {
    return blocks.map((b) => {
      if (b.t === "p") return `<p class="slog-intro">${deco(b.html)}</p>`;
      if (b.t !== "table") return renderBlock(b);
      const rows = b.rows.slice(b.head || 0).filter((r) => !isLockRow(r)).map(cellsText);
      const ppl = rows.map((r) => parseInt(r[3], 10) || 0), mx = Math.max(1, ...ppl);
      const total = ppl.reduce((a, x) => a + x, 0), days = ppl.filter((x) => x > 0).length;
      return `<div class="slog-sum"><div><b>${rows.length}</b><span>기록</span></div><div><b>${days}</b><span>작업일</span></div><div><b>${total}</b><span>투입 인원 (인·일)</span></div>
          <div class="slog-bars" aria-label="일자별 투입 인원">${rows.map((r, i) => `<i title="${esc(r[0])} ${ppl[i]}명" style="height:${ppl[i] ? Math.max(8, ppl[i] / mx * 100) : 3}%;${ppl[i] ? "" : "background:var(--line-2)"}"></i>`).join("")}</div></div>
        <ol class="slog">${rows.map((r, i) => `<li><span class="slog-d">${esc(r[0])}</span><div class="slog-b"><div class="slog-w">${workChips(r[1])}${ppl[i] ? `<span class="slog-p">${icon("people", 13)} ${ppl[i]}명</span>` : ""}</div><p>${deco(esc(r[2] || ""))}</p></div></li>`).join("")}</ol>`;
    }).join("");
  }
  function siteCompare(blocks) {
    return blocks.map((b) => {
      if (b.t !== "table" || !b.head) return renderBlock(b);
      const h = cellsText(b.rows[0]);
      const rows = b.rows.slice(b.head);
      return `<div class="scmp"><div class="scmp-h"><span></span><b class="a">${esc(h[1] || "")}</b><span class="vs">VS</span><b class="b">${esc(h[2] || "")}</b></div>
        ${rows.map((r) => isLockRow(r) ? lockRow(r) : `<div class="scmp-r"><div class="scmp-k">${cellH(r[0])}</div><div class="scmp-a">${r[1] ? cellH(r[1]) : ""}</div><div class="scmp-b">${r[2] ? cellH(r[2]) : ""}</div></div>`).join("")}</div>`;
    }).join("");
  }
  function renderCh7(blocks) {
    let html = "", cur = null;
    const flush = () => { if (cur) { html += renderBlock(cur.h) + siteSection(cur.blocks); cur = null; } };
    for (const b of blocks) {
      if (b.t === "h3") { flush(); cur = { h: b, blocks: [] }; continue; }
      if (cur) cur.blocks.push(b); else html += renderBlock(b);
    }
    flush();
    return html;
  }
  function siteCard(r, i) {
    const e = r.effect || {};
    // 개요 카드에는 완공 후 드론 사진을 쓴다 (현장별 지정 → 보고서 4쪽 항공사진 → 공정 사진)
    const COVER = COVERS;
    const cover = COVER[norm(r.site)] && (r.photos.find((p) => p.src === COVER[norm(r.site)]) || { src: COVER[norm(r.site)] });
    const img = cover || (r.location_img && r.location_img.src && i > 0 ? r.location_img : (r.photos.find((p) => /구조물|모듈/.test(p.cap)) || r.hero_img || {}));
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
      doc.innerHTML = `<header class="ch-banner ${CH_ART[c.num] ? "has-art" : ""}" style="--pc:${pcolor(cur.pi)}">${CH_ART[c.num] ? `<img class="cb-art" src="3d/${CH_ART[c.num]}.webp" alt="" aria-hidden="true" decoding="async">` : ""}<div class="part">${esc(p.label || "문서")} · ${esc(p.title)}</div>${typeof c.num === "number" ? `<div class="bignum" aria-hidden="true">${String(c.num).padStart(2, "0")}</div><span class="ic">${icon(CH_IC[c.num], 24)}</span>` : ""}<h1>${esc(c.title)}</h1>
        <div class="meta">${(c.sections || []).length ? `<span>절 ${c.sections.length}개</span>` : ""}${nTbl ? `<span>표 ${nTbl}개</span>` : ""}${nImg ? `<span>그림 · 사진 ${nImg}장</span>` : ""}${c.locked ? "<span>🔒 대외비</span>" : ""}</div></header>
        ${c.id === "appendix" && FORMS ? `<div class="form-cta"><div><b>이 양식들을 Word 파일로 받을 수 있습니다</b><span>현장에서 바로 쓰도록 디자인하고, 백서 · 보고서 내용으로 필요한 칸을 채웠습니다.</span></div><a class="btn primary" href="#forms">양식 내려받기 →</a></div>` : ""}
        ${c.id === "ch7" || c.num === 7 ? renderCh7(c.blocks) : renderBlocks(c.blocks)}
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
      <div class="page-banner reveal" style="--bgimg:url('${((REP[2] || REP[0] || {}).location_img || {}).src || ""}')"><div class="eyebrow">PART 2 · 2026 군산 사업 분석</div><h1>현장 사례집</h1>
        <p>준공 현장 ${REP.length}곳의 시공완료보고서와 백서 7장 현장별 분석, 10장 이슈 레지스터를 현장 단위로 묶었습니다.</p>
        <div class="chips">${REP.map((r) => `<span>${esc(r.site)} <b>${fmt(r.kwp, 2)}kWp</b></span>`).join("")}<span>이슈 <b>${issues.length}</b>건</span></div></div>

      ${REP.length ? `<section class="card panel reveal"><h3>준공 현장 비교 <span class="from">시공완료보고서 기준 · 막대는 세 현장 중 최댓값 대비</span></h3>
      <div class="compare"><div class="compare-row h"><span>항목</span>${REP.map((r) => `<span>${esc(r.site)}</span>`).join("")}</div>
      ${rowsDef.map(([lab, k, f, low]) => { const vals = metrics.map((m) => m[k]); const mx = Math.max(...vals.filter(isFinite)); return `<div class="compare-row"><span>${lab}${low ? ' <small style="color:var(--ink-3)">(짧을수록 좋음)</small>' : ""}</span>${vals.map((v) => `<span class="cv"><b>${isFinite(v) ? f(v) : "–"}</b><i style="width:${isFinite(v) ? (v / mx * 100).toFixed(1) : 0}%;${low ? "background:var(--sun)" : ""}"></i></span>`).join("")}</div>`; }).join("")}</div></section>` : ""}

      ${REP.some((r) => r.pdf) ? `<section class="card panel reveal" style="margin-top:16px"><h3>시공완료보고서 · 사진대지 내려받기 <span class="from">${REP[0].pdf && REP[0].pdf.enc ? "대외비 · 열람 암호 입력 후 내려받을 수 있습니다" : "원문 PDF"}</span></h3>
        <div class="dl-list">${REP.map((r, i) => r.pdf ? `<div class="dl-item"><span class="dl-ic">PDF</span><div><b>${esc(r.site)}</b><small>시공완료보고서 PDF · 사진대지 원본 ${r.photo_zip ? r.photo_zip.count + "장 (공정별 폴더)" : ""} · ${esc(r.submitted || "")} 제출</small></div><div class="dl-btns">${dlBtn(r, i, "btn")}${zipBtn(r, i)}</div></div>` : "").join("")}</div></section>` : ""}

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
      const cover = COVERS[norm(r.site)] ? (r.photos.find((p) => p.src === COVERS[norm(r.site)]) || { src: COVERS[norm(r.site)] }) : null;
      const pics = (cover ? [cover, r.hero_img, r.location_img] : [r.hero_img, r.location_img, ...r.photos.filter((p) => /구조물|모듈/.test(p.cap)).slice(0, 1)]).filter((x) => x && x.src);
      const photoCaps = [...new Set(r.photos.map((p) => p.cap))];
      const kpi = (cls, k, v, s) => `<div class="kpi ${cls}"><div class="k">${esc(k)}</div><div class="v">${esc(shortWon(v))}</div>${s ? `<div class="s">${esc(s)}</div>` : ""}</div>`;
      $("#case-detail", root).innerHTML = `
        <div class="case-head reveal">
          <div class="case-photos" data-lbgroup="hero">${pics.map((p, k) => `<button type="button" data-lb="${p.src}" data-cap="${esc(r.site)} ${cover ? ["완공 드론 사진", "전경", "설치 위치"][k] : k === 0 ? "전경" : k === 1 ? "설치 위치" : "시공"}"><img src="${p.src}" alt="" loading="lazy"></button>`).join("")}</div>
          <div class="card case-facts"><div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip good">준공</span><span class="chip info">자가소비 (갑)</span><span class="chip">${esc(r.submitted || "")} 보고서 제출</span></div>
            <h2 style="margin-top:10px">${esc(r.site)}</h2><p style="margin:0;color:var(--ink-2);font-size:13.5px">${esc(r.address || "")}</p>
            <dl class="kv"><dt>설비</dt><dd>${esc(r.capacity_text || "")}</dd>${r.contract_amount ? `<dt>계약 금액</dt><dd><span class="mono">${fmt(r.contract_amount)}</span>원 (VAT 별도)</dd>
              <dt>재원</dt><dd>정부지원 <span class="mono">${man((r.funding || {})["정부지원금"])}</span> · 자부담 <span class="mono">${man((r.funding || {})["자기부담금"])}</span></dd>` : `<dt>계약 · 재원</dt><dd><span class="lockph">대외비 — 암호를 입력하면 보입니다</span></dd>`}
              <dt>공사 기간</dt><dd>${esc(r.build_period || "")}</dd><dt>사용전검사</dt><dd>${esc(r.inspection || "")}</dd><dt>하자 보증</dt><dd>${esc(r.warranty || "")}</dd></dl>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px">${dlBtn(r, i)}${zipBtn(r, i)}<span class="from">${esc(r.submitted || "")} 제출본 원문</span></div></div>
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
        <div class="card panel reveal" style="margin-top:16px"><h3>현장 사진 <span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="from">보고서 9장 사진대지 · 공정별 대표 ${r.photos.length}장${r.photo_zip ? ` · 전체 ${r.photo_zip.count}장은 ZIP` : ""}</span>${zipBtn(r, i)}</span></h3>
          <div class="seg" id="ph-tabs" role="group" aria-label="공정 선택">${photoCaps.map((c, k) => `<button type="button" data-c="${esc(c)}" aria-pressed="${k === 0}">${esc(c)}</button>`).join("")}</div>
          <div id="ph-grid"></div></div>
        ${sec ? `<div class="card panel reveal" style="margin-top:16px"><h3>백서 현장별 분석 · ${esc(sec.title)} <a class="from" href="#${sec.id}">백서에서 보기 →</a></h3><div class="doc ${prefs.guide ? "" : "hide-guide"} ${prefs.secret ? "" : "hide-secret"}" style="max-width:none">${siteSection(sec.blocks, { noPhotos: true })}</div></div>` : ""}
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
      root.innerHTML = `<div class="wrap view"><div class="page-banner has-art"><img class="pb-art" src="3d/money.webp" alt="" aria-hidden="true"><div class="eyebrow">21장 원가 관리 · 원가관리 툴 연동</div><h1>원가 분석</h1><p>시공 견적의 항목별 시장 기준 대비 판정, 노무비 실투입 분석, 기준단가 편집과 새 견적 빠른 검토를 제공합니다.</p></div>${VAULT ? lockedBox("cost") : "<p>원가 데이터가 없습니다.</p>"}</div>`;
      return;
    }
    let scope = "all";
    const ch21 = chByNum(21);
    const structT = findTable(ch21, "구분", "항목");
    root.innerHTML = `<div class="wrap view">
      <div class="page-banner has-art"><img class="pb-art" src="3d/money.webp" alt="" aria-hidden="true"><div class="eyebrow">21장 원가 관리 · 원가관리 툴 연동 · 대외비</div><h1>원가 분석</h1><p>${esc(COST.title)}</p></div>
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
        </tbody></table></div>
        <div class="cost-cards">${rows.slice().sort((a, b) => scope === "all" ? b.excess - a.excess : 0).map((r) => `<div class="cc"><div class="cc-h"><b>${esc(r.key)}</b><span class="verdict v-${r.v}">${r.v}</span></div>
          <div class="cc-n"><div><span>견적</span><b>${man(r.quote)}</b></div><div><span>시장 기준</span><b>${man(r.market)}</b></div><div><span>초과율</span><b style="color:${r.rate > 0 ? "var(--bad)" : "var(--cell)"}">${r.rate > 0 ? "+" : ""}${pct(r.rate)}</b></div></div>${bar(r.rate)}
          <div class="cc-s">단가 ${fmt(r.unitQuote, r.unit === "원/W" ? 1 : 0)} → 기준 ${fmt(r.unitBasis, r.unit === "원/W" ? 1 : 0)} ${r.unit} · 마진 반영 후 ${man(r.after)}</div></div>`).join("")}
          <div class="cc total"><div class="cc-h"><b>합계 (비교 가능 항목)</b><span class="verdict v-${tot.v}">${tot.v}</span></div><div class="cc-n"><div><span>견적</span><b>${man(tot.quote)}</b></div><div><span>시장 기준</span><b>${man(tot.market)}</b></div><div><span>초과</span><b style="color:var(--bad)">+${man(tot.excess)}</b></div></div></div></div>
        <p class="from">금액 단위 만원 · 견적 단가는 ${scope === "all" ? "3개 현장 가중 평균" : "해당 현장 견적서 기준"}</p>`;
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

  /* ======================================================================
     현장 양식 (Word)
     ====================================================================== */
  function renderForms(root) {
    if (!FORMS) { root.innerHTML = '<div class="wrap view"><p>양식 데이터가 없습니다.</p></div>'; return; }
    const F = FORMS.forms;
    root.innerHTML = `<div class="wrap view">
      <div class="page-banner forms-banner has-art reveal"><img class="pb-art" src="3d/doc-contract.webp" alt="" aria-hidden="true"><div class="eyebrow">백서 부록 · 양식 모음</div><h1>현장 양식</h1>
        <p>실사부터 O&amp;M까지 현장에서 쓰는 양식 ${F.length}종입니다. A4 한 장에 맞춘 Word 파일로, Pretendard 글꼴이 파일 안에 들어 있어 어느 PC에서 열어도 같은 디자인으로 보입니다.</p>
        <div class="chips"><span>Word (.docx)</span><span>Pretendard 내장</span><span>A4 인쇄용</span><span>결재란 포함</span></div>
        <div style="margin-top:18px">${formBtn(FORMS.all, `⬇ 전체 모음 받기 (A~${F[F.length - 1].code})`, "btn primary big")}</div></div>
      <div class="forms-grid">${F.map((f) => `<article class="card form-card reveal">
        <button type="button" class="form-thumb" ${f.thumb ? `data-lb="${f.thumb}" data-cap="양식 ${esc(f.code)} ${esc(f.title)} 미리보기"` : ""} aria-label="미리보기 크게 보기">${f.thumb ? `<img src="${f.thumb}" alt="양식 ${esc(f.code)} 미리보기" loading="lazy">` : `<span class="ph">${esc(f.code)}</span>`}</button>
        <div class="form-body"><div class="form-meta"><span class="form-code">양식 ${esc(f.code)}</span><span class="chip">${esc(f.sub)}</span>${f.pages ? `<span class="chip">${f.pages}쪽${f.landscape ? " · 가로" : ""}</span>` : ""}</div>
          <h3>${esc(f.title)}</h3><p>${esc(f.desc)}</p>
          <div class="form-actions">${formBtn(f, "⬇ Word 받기")}</div></div></article>`).join("")}</div>

      <section class="sec reveal" id="checklist"><div class="sec-head"><div><div class="eyebrow">온라인 체크리스트</div><h2>현장 진행 체크리스트</h2><p>백서 3장의 사업 단계와 '다음 단계 진행 조건'을 체크리스트로 만들었습니다. 현장 이름을 정하면 진행 상황이 이 기기에 저장됩니다.</p></div></div>
        <div class="card ck" id="ck"></div></section>
      <div class="card panel reveal" style="margin-top:28px"><h3>미리 채워 둔 내용</h3>
        <ul class="filled">
          <li><b>A 현장실사</b> 11개 항목마다 확인 방법 · 기준과 2026 이슈 번호</li>
          <li><b>C TBM</b> 지붕 태양광 대표 위험요인 7가지와 안전 대책</li>
          <li><b>D 안전시설</b> 항목별 점검 기준 (안전난간 높이, 작업발판 폭, 풍속 등)</li>
          <li><b>E 사고 보고</b> 즉시 조치 순서와 사내 보고 체계(백서 5.5)</li>
          <li><b>F 현장 개요 카드</b> 준공 현장 ${REP.length}곳을 시공완료보고서 값으로 채운 카드</li>
          <li><b>I O&amp;M</b> 점검 방법 · 주기와 FEMS 운영 루틴</li>
          <li><b>J 월간 발전</b> 현장별 월 예상 발전량 기준표</li>
        </ul>
        <p class="from" style="margin-top:8px">백서 부록이 바뀌면 다음 업데이트 때 양식도 함께 다시 만들어집니다.</p></div>
    </div>`;
    checklist(root);
  }

  /* ---------- 대외비 잠금 해제 ---------- */
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  let vaultKey = null;
  const PUBLIC_URL = "https://yuhost-solar-whitepaper.netlify.app";
  async function downloadReport(i, btn, kind = "pdf") {
    const r = REP[i], pdf = r && r[kind]; if (!pdf) return;
    return downloadFile(pdf, btn, kind === "pdf" ? "application/pdf" : "application/zip");
  }
  async function downloadFile(pdf, btn, mime) {
    if (pdf.enc && !vaultKey) { askPassword(); toast("현장 자료는 대외비입니다. 암호를 입력한 뒤 다시 누르세요."); return; }
    const old = btn ? btn.innerHTML : "";
    try {
      if (btn) { btn.disabled = true; btn.textContent = "내려받는 중…"; }
      let buf = await (await fetch(pdf.src)).arrayBuffer();
      if (pdf.enc) buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(pdf.iv) }, vaultKey, buf);
      const blob = new Blob([buf], { type: mime });
      // claude.ai Artifact 안에서는 전용 다운로드 기능으로 저장 (일반 링크는 막혀 있음)
      const dl = window.claude && window.claude.use ? await window.claude.use("downloads").catch(() => null) : null;
      if (dl) {
        try { await dl.save({ filename: pdf.name, data: blob }); toast(pdf.name + " 을(를) 저장했습니다."); }
        catch (err) { if (err && err.code !== "declined") toast("이 화면에서는 저장할 수 없습니다. 공개 사이트에서 받으세요: " + PUBLIC_URL); }
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = pdf.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast(pdf.name + " 을(를) 내려받았습니다.");
    } catch (e) { toast("내려받지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요."); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = old; } }
  }
  const dlBtn = (r, i, cls = "btn primary") => r.pdf ? `<button type="button" class="${cls}" data-dl="${i}">${r.pdf.enc && !unlocked ? "🔒 " : "⬇ "}시공완료보고서 PDF <small class="mono" style="opacity:.75">${(r.pdf.size / 1048576).toFixed(1)}MB</small></button>` : "";
  const zipBtn = (r, i, cls = "btn") => r.photo_zip && r.photo_zip.external ? `<a class="${cls}" href="${esc(r.photo_zip.external)}" target="_blank" rel="noopener">⬇ 사진대지 ${r.photo_zip.count}장 ZIP <small style="opacity:.75">공개 사이트에서</small></a>` : r.photo_zip ? `<button type="button" class="${cls}" data-dl="${i}" data-kind="photo_zip">${r.photo_zip.enc && !unlocked ? "🔒 " : "⬇ "}사진대지 ${r.photo_zip.count}장 ZIP <small class="mono" style="opacity:.75">${(r.photo_zip.size / 1048576).toFixed(1)}MB</small></button>` : "";
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-dl]"); if (b) { e.preventDefault(); downloadReport(+b.dataset.dl, b, b.dataset.kind || "pdf"); } });
  const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const formOf = (code) => (code === "ALL" ? FORMS.all : FORMS.forms.find((f) => f.code === code));
  const formBtn = (f, label, cls = "btn primary") => f.external
    ? `<a class="${cls}" href="${esc(f.external)}" target="_blank" rel="noopener">${label} <small style="opacity:.7">공개 사이트에서</small></a>`
    : `<button type="button" class="${cls}" data-form="${f.code || "ALL"}">${label} <small class="mono" style="opacity:.7">${Math.max(1, Math.round(f.size / 1024))}KB</small></button>`;
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-form]"); if (b && FORMS) { e.preventDefault(); downloadFile(formOf(b.dataset.form), b, DOCX); } });
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

  // 화면보다 넓은 표 · 그림에 '밀어서 보기' 표시
  function markScrollable(root) {
    const mark = () => $$(".tbl, .scroll-x", root).forEach((el) => {
      const can = el.scrollWidth > el.clientWidth + 4;
      el.classList.toggle("can-scroll", can);
      if (can && !el.dataset.sw) { el.dataset.sw = 1; el.addEventListener("scroll", () => el.classList.toggle("scrolled", el.scrollLeft > 8), { passive: true }); }
    });
    requestAnimationFrame(mark); setTimeout(mark, 600);
    if (!markScrollable.bound) { markScrollable.bound = true; window.addEventListener("resize", () => mark(), { passive: true }); }
  }

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
    else if (h === "forms") { tab = "forms"; renderForms(main); }
    else if (h === "wp") { tab = "wp"; renderWP(main, null); }
    else if (chById(h)) { tab = "wp"; renderWP(main, h); }
    else if (secToCh[h]) { tab = "wp"; renderWP(main, secToCh[h], h); }
    else { renderHome(main); }
    $$(".tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false"));
    if (tab !== "wp" && !/^case-\d+$/.test(h) && h !== "cases-issues") window.scrollTo(0, 0);
    observe(main);
    markScrollable(main);
    document.title = { home: "태양광 사업관리 백서", wp: "백서 · 태양광 사업관리", cases: "사례집 · 태양광 사업관리", cost: "원가 분석 · 태양광 사업관리", forms: "현장 양식 · 태양광 사업관리" }[tab];
  }
  window.addEventListener("hashchange", route);

  // 바닥글
  const m = WP.meta || {};
  $("#foot").innerHTML = `<div class="wrap"><span>${esc(m.title || "")} ${esc(m.version || "")} · ${esc(m.docno || "")} · ${esc(m.org || "")}</span><span>${esc(m.badge || "")} · 외부 공유 금지${BUILT ? " · 갱신 " + esc(BUILT) : ""}</span></div>`;
  $("#ver").textContent = m.version || "";
  paintLockBtn();
  applyTheme(store.get("theme", "system"));
  route();
  let saved = null; try { saved = sessionStorage.getItem("yh-solar:pw"); } catch (e) { /* 없음 */ }
  if (VAULT && saved) unlock(saved).catch(() => { try { sessionStorage.removeItem("yh-solar:pw"); } catch (e) { /* 없음 */ } });
})();
