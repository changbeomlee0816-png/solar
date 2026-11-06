/* 현장 양식 Word(.docx) 만들기 — 백서 부록 A~J를 현장에서 바로 쓰는 디자인 양식으로.
 *
 * 사용: node build/make_forms.js <whitepaper.json> <reports.json|-> <출력 폴더> <글꼴 폴더>
 * - 글꼴 폴더의 Pretendard-Regular.ttf 를 문서에 넣는다(굵게는 build/embed_bold.py 가 추가).
 * - 백서 · 시공완료보고서 내용으로 미리 채울 수 있는 칸은 채운다 (현장 개요 카드, 월간 발전 기준표, 용어 등).
 */
"use strict";
const fs = require("fs");
const path = require("path");
let docx;
try { docx = require("docx"); } catch (e) { docx = require(path.join(require("child_process").execSync("npm root -g").toString().trim(), "docx")); }
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  AlignmentType, VerticalAlign, Header, Footer, PageNumber, PageOrientation, TableLayoutType, CharacterSet,
  LevelFormat, HeightRule, PageBreak,
} = docx;

const [, , WP_JSON, REP_JSON, OUT, FONT_DIR] = process.argv;
const WP = JSON.parse(fs.readFileSync(WP_JSON, "utf8"));
const REP = REP_JSON && REP_JSON !== "-" && fs.existsSync(REP_JSON) ? JSON.parse(fs.readFileSync(REP_JSON, "utf8")) : [];
fs.mkdirSync(OUT, { recursive: true });
const META = WP.meta || {};
const ORG = META.org || "㈜유호스트 태양광 TF";
const PROJECT = META.project || "2026 군산산단 태양광 구축사업";

/* ---------- 백서 데이터 도우미 ---------- */
const plain = (h) => String(h || "").replace(/<\/(p|li)>/g, " ").replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const chapters = WP.parts.flatMap((p) => p.chapters);
const chap = (num) => chapters.find((c) => c.num === num || c.id === num);
const tables = (c) => (c ? c.blocks.filter((b) => b.t === "table") : []);
const rowsOf = (t) => (t ? t.rows.map((r) => r.map((c) => plain(c.html))) : []);
function findTable(c, first, second) {
  return tables(c).find((t) => { const h = rowsOf(t)[0] || []; return (h[0] || "").startsWith(first) && (!second || (h[1] || "").startsWith(second)); });
}
function appendixSection(letter) {
  const c = chap("appendix"); if (!c) return [];
  const out = []; let on = false;
  for (const b of c.blocks) {
    if (b.t === "h3") { if (on) break; on = b.text.trim().startsWith(letter + "."); continue; }
    if (on) out.push(b);
  }
  return out;
}
const norm = (s) => String(s || "").replace(/\(주\)|\(유\)|[㈜()\s]/g, "");
const issues = (() => {
  const t = findTable(chap(10), "No", "일자");
  return rowsOf(t).slice(1).filter((r) => /^\d+$/.test(r[0]) && r[4]).map((r) => ({ no: +r[0], site: r[2], cat: r[3], issue: r[4] }));
})();
const issuesFor = (name) => { const k = norm(name).replace(/\d?공장$/, "").slice(0, 2); return issues.filter((x) => x.site.includes(k)).map((x) => x.no); };

/* ---------- 디자인 토큰 ---------- */
const C = { ink: "0B1220", ink2: "3D4659", ink3: "8A93A6", navy: "0F1B33", sun: "FF8A00", sunSoft: "FFF4E2", line: "D9DEE7", soft: "F4F6F9", key: "F7F8FA", cell: "3266FF", cellSoft: "EDF2FF", leaf: "12A36B", leafSoft: "E6F7EF", bad: "C43B3B", badSoft: "FBE6E6" };
const FONT = "Pretendard";
const PAGE_W = 11906, PAGE_H = 16838, MARGIN = 794; // A4, 14mm
let CW = PAGE_W - MARGIN * 2; // 본문 폭 (가로 방향이면 바뀜)
const border = (color = C.line, size = 4) => ({ style: BorderStyle.SINGLE, size, color });
const NOB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allB = (b) => ({ top: b, bottom: b, left: b, right: b });

const run = (text, o = {}) => new TextRun({ text: String(text), font: FONT, size: o.size || 19, bold: !!o.bold, color: o.color || C.ink, ...o.extra });
function para(parts, o = {}) {
  const children = (Array.isArray(parts) ? parts : [parts]).map((p) => (typeof p === "string" ? run(p, o) : p));
  return new Paragraph({ children, alignment: o.align, spacing: { before: o.before || 0, after: o.after == null ? 0 : o.after, line: o.line || 264 }, indent: o.indent, border: o.border, shading: o.shading, keepNext: o.keepNext });
}
function cell(content, o = {}) {
  const kids = (Array.isArray(content) ? content : [content]).map((x) => (x instanceof Paragraph || x instanceof Table ? x : para(x === "" ? " " : x, o)));
  return new TableCell({
    children: kids, width: { size: o.w, type: WidthType.DXA }, columnSpan: o.span, rowSpan: o.rspan,
    shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
    verticalAlign: o.valign || VerticalAlign.CENTER,
    margins: { top: o.pad == null ? 70 : o.pad, bottom: o.pad == null ? 70 : o.pad, left: 110, right: 110 },
    borders: o.borders || allB(border()),
  });
}
function table(widths, rows, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
    rows: rows.map((r, ri) => new TableRow({
      children: r, cantSplit: true, tableHeader: o.headerRows ? ri < o.headerRows : false,
      height: o.rowH ? { value: (typeof o.rowH === "function" ? o.rowH(ri) : o.rowH), rule: HeightRule.ATLEAST } : undefined,
    })),
  });
}
const scale = (fracs) => { const t = fracs.reduce((a, b) => a + b, 0); const ws = fracs.map((f) => Math.floor(CW * f / t)); ws[ws.length - 1] += CW - ws.reduce((a, b) => a + b, 0); return ws; };
const box = "☐";
const checks = (items) => items.map((x) => `${box} ${x}`).join("    ");
const gap = (h = 160) => para(" ", { after: 0, size: 4, line: h });

// 머리 띠: 양식 코드 · 제목 · 소속
function banner(code, title, sub) {
  const [w1, w2] = scale([0.68, 0.32]);
  return table([w1, w2], [[
    cell([
      para([run(`양식 ${code}`, { size: 16, bold: true, color: "FFC94A" }), run(`   ${sub}`, { size: 16, color: "AFC0E0" })], { after: 60 }),
      para(run(title, { size: 34, bold: true, color: "FFFFFF" })),
    ], { w: w1, fill: C.navy, borders: allB(NOB), pad: 180 }),
    cell([
      para(run(ORG, { size: 16, bold: true, color: "FFFFFF" }), { align: AlignmentType.RIGHT, after: 40 }),
      para(run(PROJECT, { size: 15, color: "AFC0E0" }), { align: AlignmentType.RIGHT, after: 40 }),
      para(run(`YH-SOLAR-F-${code} · 백서 ${META.version || ""} 부록 ${code}`, { size: 14, color: "AFC0E0" }), { align: AlignmentType.RIGHT }),
    ], { w: w2, fill: C.navy, borders: allB(NOB), pad: 180 }),
  ]]);
}
const accent = () => table([CW], [[cell(para(" ", { size: 2, line: 60 }), { w: CW, fill: C.sun, borders: allB(NOB), pad: 0 })]]);
// 결재란
function approval(labels = ["작성", "검토", "승인"]) {
  const lw = 520, bw = 1050; const left = CW - lw - bw * labels.length;
  return table([left, lw, ...labels.map(() => bw)], [
    [cell(para([run("작성일  ", { size: 16, color: C.ink3 }), run("20     .     .     .", { size: 18 })]), { w: left, rspan: 2, borders: allB(NOB) }),
      cell(para(run("결재", { size: 16, bold: true, color: C.ink2 }), { align: AlignmentType.CENTER }), { w: lw, rspan: 2, fill: C.soft }),
      ...labels.map((l) => cell(para(run(l, { size: 15, bold: true, color: C.ink2 }), { align: AlignmentType.CENTER }), { w: bw, fill: C.soft, pad: 40 }))],
    [...labels.map(() => cell(" ", { w: bw }))],
  ], { rowH: (i) => (i === 1 ? 560 : 0) });
}
const APPROVAL = (labels) => ({ __approval: labels });
// 소제목: 왼쪽 주황 막대
const heading = (text, note) => para([run(text, { size: 22, bold: true }), ...(note ? [run(`   ${note}`, { size: 16, color: C.ink3 })] : [])],
  { before: 200, after: 80, keepNext: true, border: { left: { style: BorderStyle.SINGLE, size: 24, color: C.sun, space: 8 } }, indent: { left: 120 } });
// 라벨 · 값 표 (2열 또는 4열)
function kvTable(pairs, cols = 2) {
  const per = cols === 2 ? scale([0.24, 0.76]) : scale([0.15, 0.35, 0.15, 0.35]);
  const rows = [];
  for (let i = 0; i < pairs.length; i += cols / 2) {
    const r = [];
    for (let j = 0; j < cols / 2; j++) {
      const p = pairs[i + j];
      if (!p) { r.push(cell(" ", { w: per[j * 2], fill: C.key }), cell(" ", { w: per[j * 2 + 1] })); continue; }
      const [k, v, o = {}] = p;
      if (o.full) { r.push(cell(para(run(k, { size: 17, bold: true, color: C.ink2 })), { w: per[0], fill: C.key }), cell(v, { w: CW - per[0], span: cols - 1, size: 18 })); j = cols; break; }
      r.push(cell(para(run(k, { size: 17, bold: true, color: C.ink2 })), { w: per[j * 2], fill: C.key }), cell(v, { w: per[j * 2 + 1], size: 18, color: o.color }));
    }
    rows.push(r);
  }
  return table(per, rows, { rowH: 400 });
}
// 데이터 표 (머리행 + 본문)
function gridTable(widths, head, body, o = {}) {
  return table(widths, [
    head.map((h, i) => cell(para(run(h, { size: 16, bold: true, color: C.ink2 }), { align: o.headAlign || AlignmentType.CENTER }), { w: widths[i], fill: C.soft })),
    ...body.map((r) => r.map((v, i) => {
      const al = (o.align || [])[i];
      const isObj = v && typeof v === "object" && !(v instanceof Paragraph);
      const val = isObj ? v.text : v;
      return cell(Array.isArray(val) ? val : para(typeof val === "string" ? run(val, { size: o.size || 17, bold: isObj && v.bold, color: isObj && v.color }) : val, { align: al }), { w: widths[i], fill: isObj ? v.fill : (o.keyCol === i ? C.key : undefined) });
    })),
  ], { headerRows: 1, rowH: o.rowH || 380 });
}
// 작성 요령 박스
function tips(title, lines, tone = "sun") {
  const fill = tone === "sun" ? C.sunSoft : tone === "leaf" ? C.leafSoft : tone === "bad" ? C.badSoft : C.cellSoft;
  const col = tone === "sun" ? "C26A00" : tone === "leaf" ? C.leaf : tone === "bad" ? C.bad : C.cell;
  return table([CW], [[cell([
    para(run(title, { size: 17, bold: true, color: col }), { after: 60 }),
    ...lines.map((l) => para([run("·  ", { size: 17, bold: true, color: col }), run(l, { size: 17, color: C.ink2 })], { after: 30, indent: { left: 200, hanging: 200 } })),
  ], { w: CW, fill, borders: allB(NOB), pad: 140 })]]);
}
// 빈 줄 칸 (손글씨)
const writeBox = (label, lines = 3) => kvTable([[label, Array.from({ length: lines }, () => para(" ", { line: 300 })), { full: true }]]);

function footer(code, title) {
  return new Footer({ children: [para([
    run(`${ORG}  ·  양식 ${code} ${title}`, { size: 14, color: C.ink3 }),
    new TextRun({ children: ["\t", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], font: FONT, size: 14, color: C.ink3 }),
  ], { border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 6 } } })].map((p) => { p.properties && 0; return p; }) });
}

/* ---------- 양식 정의 ---------- */
const SITES = (() => {
  const t = findTable(chap(6), "No", "현장");
  return rowsOf(t).slice(1).filter((r) => r[1]).map((r) => ({ no: r[0], name: r[1], type: r[2], cap: r[3], builder: r[4], cm: r[5], status: r[6] }));
})();
const siteChoices = SITES.map((s) => s.name.replace(/\s*\(.*\)/, "")).slice(0, 9);

const FORMS = [];
const form = (code, title, sub, desc, build, opts = {}) => FORMS.push({ code, title, sub, desc, build, landscape: !!opts.landscape });

form("A", "현장실사 체크시트", "현장실사 · 12장", "수용가 선정 후 첫 실사 때 들고 가는 11개 항목 체크리스트. 확인 방법과 2026 사례 근거를 채워 두었습니다.", () => {
  const base = appendixSection("A").find((b) => b.t === "table" && rowsOf(b)[0][0] === "No");
  const items = rowsOf(base).slice(1).map((r) => r[1]);
  const HOW = {
    "지붕 면적": ["지붕", "건축도면과 실측 대조, 방위(남향/동서향) · 경사 기록, 드론 · 전경 사진"],
    "강판 골": ["지붕", "골 수 직접 세기 · 간격 · 길이 줄자 실측, 비교 사진 (이슈 No.9 우림 4골/5골 불일치)"],
    "용마루": ["지붕", "노후 · 형상 확인 후 교체 범위 확정, 벤추레이터는 음영 검토 (32장)"],
    "채광창": ["지붕", "추락 위험 구역 표시, 덮개 · 방망 필요 수량 산출"],
    "수전 방식": ["전기", "고지서 · 수전설비 확인. 고압 + 상계거래는 추가 설비 약 8,000만원 (하임 사례)"],
    "차단기": ["전기", "수배전반 내부 사진, 차단기 용량 · 부스바 규격 기록 (이슈 No.18)"],
    "인버터 위치": ["전기", "설치 위치 · 환기, 포설 경로 · 길이(m) 실측 — 6SQ 1,000m ≈ 200만원"],
    "토지이용": ["인허가", "토지이음 열람: 비행안전구역 · 군 협의, 관리기관 토지사용승낙 (이슈 No.19 · 35)"],
    "사다리": ["안전", "수용가 협의 → 감리 확인, 2.5m 이상 구간 등받이울"],
    "하차": ["시공", "크레인 작업반경 · 지게차 · 하차 공간 (이슈 No.16)"],
    "수용가": ["수용가", "케이블 제조사 등 요구 사양을 서면으로 확인 (이슈 No.20)"],
  };
  const w = scale([0.05, 0.08, 0.25, 0.38, 0.14, 0.10]);
  return [
    kvTable([["현장명", " "], ["실사일", "20     .     .     .  (     )"], ["주소", " "], ["사업 유형", checks(["자가소비", "상계거래", "직접PPA", "BAPV·BIPV"])],
      ["참석자", "유호스트           /  시공사           /  감리           /  수용가", { full: true }]], 4),
    heading("확인 항목", "결과에 ☑, 사진 촬영 후 □에 표시"),
    gridTable(w, ["No", "구분", "확인 항목", "확인 방법 · 기준", "결과", "사진"],
      items.map((it, i) => { const k = Object.keys(HOW).find((x) => it.includes(x)) || ""; const [g, how] = HOW[k] || ["", ""];
        return [String(i + 1), { text: g, bold: true, color: C.ink2 }, { text: it, bold: true }, how, `${box} 적합\n`.trim() + `  ${box} 보완`, box]; }),
      { align: [AlignmentType.CENTER, AlignmentType.CENTER, null, null, AlignmentType.CENTER, AlignmentType.CENTER], rowH: 500 }),
    heading("특이사항 · 추가 확인"),
    writeBox("내용", 2),
    gap(),
    tips("작성 요령", [
      "실사 사진은 현장명_일자_항목번호로 저장하고 사진대지에 붙인다.",
      "도면이 없는 수용가는 선정 직후 전기도면 발급을 요청한다 (이슈 No.2).",
      "보완 항목은 시공계획서 필수 항목(13.2)에 반영하고 담당자를 정한다.",
    ]),
    APPROVAL(["작성", "PM", "총괄"]),
  ];
});

form("B", "일일 작업보고서", "시공 관리 · 5장 · 16장", "매일 작업 종료 후 작성. 투입 인원 · 장비 · 자재, 덮이기 전 사진 확인, 단톡방 보고까지 한 장에.", () => {
  const w5 = scale([0.24, 0.16, 0.6]);
  return [
    kvTable([["현장명", " "], ["일자", "20     .     .     .  (     )"], ["날씨", checks(["맑음", "흐림", "비", "눈"])], ["풍속 · 기온", "         m/s   ·          ℃"],
      ["작업 시간", "TBM    :      ·  작업    :      ~    :      ·  휴게      h", { full: true }]], 4),
    heading("투입 인원 · 장비"),
    gridTable(scale([0.3, 0.14, 0.56]), ["구분", "인원(명)", "비고 (내국인 / 외국인 · 소속)"],
      [["현장소장 · 반장", "", ""], ["시공자", "", "내국인     /  외국인"], ["장비 운전원", "", ""], ["유호스트", "", ""], ["감리", "", ""], [{ text: "계", bold: true, fill: C.key }, "", ""]],
      { keyCol: 0, align: [null, AlignmentType.CENTER], rowH: 330 }),
    gap(60),
    kvTable([["장비", "크레인 (     t ×    대)    스카이 (    대)    인양기 (    대)    지게차 (    대)", { full: true }]]),
    heading("금일 작업"),
    kvTable([["공정", checks(["지붕 보강", "안전시설", "구조물", "모듈", "전기", "시험·검사", "기타"]), { full: true }]]),
    writeBox("작업 내용", 2),
    heading("자재 입고 · 사용"),
    gridTable(scale([0.28, 0.24, 0.12, 0.14, 0.22]), ["품목", "규격 · 제조사", "수량", "입고/사용", "비고"], Array.from({ length: 3 }, () => ["", "", "", `${box}입고 ${box}사용`, ""]), { align: [null, null, AlignmentType.CENTER, AlignmentType.CENTER] }),
    heading("덮이기 전 사진 확인", "다시 볼 수 없는 부분은 반드시 촬영"),
    kvTable([["확인", checks(["지붕 관통부 방수", "접지선", "결선 · 커넥터", "케이블 포설 경로", "볼트 체결"]), { full: true }]]),
    heading("특이사항 · 익일 계획"),
    writeBox("이슈 · 원인 · 조치", 2), gap(60), writeBox("익일 계획", 2),
    gap(80),
    kvTable([["단톡방 보고", checks(["작업 전 보고", "작업 종료 보고 + 사진"]) + "      ※ 견적 · 단가 · 비밀번호는 올리지 않는다", { full: true }]]),
    APPROVAL(["작성", "PM", "감리 확인"]),
  ];
});

form("C", "TBM · 안전교육 일지", "안전관리 · 17장", "작업 전 TBM에서 그날 위험요인과 대책을 확인하고 참석자 서명을 받는 양식. 지붕 태양광 공사의 대표 위험요인을 미리 넣었습니다.", () => {
  const risks = [
    ["추락", "지붕 가장자리 · 채광창 · 노후 지붕재", "안전난간 · 채광창 덮개 확인, 안전대 체결, 노후 지붕재 밟지 않기"],
    ["낙하 · 비래", "자재 인양 · 공구", "인양 작업반경 출입 통제, 신호수 배치, 공구 낙하 방지끈"],
    ["감전", "정전 · 결선 · 수배전반 작업", "정전 잠금 · 표지(LOTO), 검전 후 작업, 절연장갑"],
    ["강풍 · 우천", "강판 · 모듈 취급, 미끄러운 지붕", "풍속 확인, 기준 초과 시 작업 중지, 자재 결속"],
    ["장비", "크레인 · 스카이 · 지게차", "아웃트리거 지반 확인, 작업반경 통제, 유도자 배치"],
    ["베임 · 협착", "강판 · 형강 절단 · 운반", "절단 장갑 착용, 2인 운반, 절단부 정리"],
    ["온열 · 한랭", "여름 지붕 고온 · 동절기", "휴식 · 음수, 그늘막, 작업 시간 조정"],
  ];
  return [
    kvTable([["현장명", " "], ["일시", "20    .    .    .      :     "], ["교육자", " "], ["금일 작업", " "]], 4),
    heading("금일 위험요인 · 대책", "해당 항목에 ☑, 추가 위험은 빈 칸에"),
    gridTable(scale([0.07, 0.14, 0.28, 0.51]), ["해당", "위험", "작업 · 장소", "안전 대책"],
      [...risks.map(([a, b, c]) => [box, { text: a, bold: true }, b, c]), [box, "", "", ""], [box, "", "", ""]],
      { align: [AlignmentType.CENTER], rowH: 420 }),
    gap(100),
    kvTable([["보호구 확인", checks(["안전모", "안전대", "안전화", "절연장갑", "보안경", "기타 (          )"]), { full: true }]]),
    heading("참석자 확인", "신규 투입자는 안전교육 실시 후 표시"),
    gridTable(scale([0.06, 0.2, 0.18, 0.16, 0.12, 0.28]), ["No", "소속", "성명", "직종", "신규", "서명"],
      Array.from({ length: 10 }, (_, i) => [String(i + 1), "", "", "", box, ""]), { align: [AlignmentType.CENTER, null, null, null, AlignmentType.CENTER], rowH: 400 }),
    gap(),
    tips("꼭 확인", [
      "일용직 · 재하도급 인력은 투입일마다 보험 가입과 안전교육을 확인한다 (이슈 No.11 · 45).",
      "TBM 사진과 이 일지를 함께 보관한다. 작업 시작시간은 시공사 통보 시각을 기준으로 지킨다 (이슈 No.15).",
    ], "bad"),
  ];
});

form("D", "안전시설 점검표", "안전관리 · 17장", "본공사 시작 전과 매일 작업 전 점검. 항목마다 점검 기준을 채워 두었습니다.", () => {
  const rows = [
    ["추락", "지붕 가장자리 안전난간", "가장자리 전 구간, 높이 1.2m 내외 (장원 H1,200), 견고 고정"],
    ["추락", "채광창 덮개 / 방망", "모든 채광창 덮개 또는 방망, 위치 표시"],
    ["추락", "작업발판 (깨지기 쉬운 지붕재)", "폭 30cm 이상 발판 (산업안전보건기준에 관한 규칙 제45조)"],
    ["추락", "안전대 부착설비", "안전줄 · 앵커 설치, 작업자 체결 확인"],
    ["추락", "안전사다리 고정 상태", "상 · 하부 고정, 2.5m 이상 구간 등받이울"],
    ["낙하", "인양 작업반경 통제 · 신호수", "출입금지 표지 · 라바콘, 신호수 1명 이상"],
    ["기상", "풍속 확인 (기준 10 m/s)", "순간풍속 기준 초과 시 작업 중지 검토 — 현장 기준으로 조정"],
    ["감전", "정전 작업 잠금 · 검전", "차단기 잠금 · 표지, 검전기로 무전압 확인"],
    ["화재", "소화기 비치", "절단 · 용접 작업 시 작업 위치 10m 이내"],
    ["보호구", "보호구 지급 · 착용", "안전모 · 안전대 · 안전화 전원 착용"],
  ];
  return [
    kvTable([["현장명", " "], ["점검일", "20     .     .     ."], ["점검자", " "], ["공정", checks(["강판", "구조물", "모듈", "전기"])]], 4),
    heading("점검 항목"),
    gridTable(scale([0.08, 0.24, 0.36, 0.07, 0.07, 0.18]), ["구분", "점검 항목", "기준", "적합", "부적합", "조치 내용"],
      rows.map(([g, it, std]) => [{ text: g, bold: true, color: C.ink2 }, { text: it, bold: true }, std, box, box, ""]),
      { align: [AlignmentType.CENTER, null, null, AlignmentType.CENTER, AlignmentType.CENTER], rowH: 520 }),
    heading("부적합 조치 확인"),
    writeBox("내용 · 완료일", 3),
    gap(),
    tips("판정 기준", ["부적합 항목이 하나라도 있으면 해당 작업을 시작하지 않는다.", "풍속 · 강우 기준은 현장 PM이 정하고, 기준을 넘으면 작업 중지를 PM에게 보고한다."]),
    APPROVAL(["점검자", "PM", "감리"]),
  ];
});

form("E", "사고 발생 보고서", "안전관리 · 17장", "사고 직후 작성. 즉시 조치 순서와 사내 보고 체계를 채워 두었습니다.", () => {
  const contact = findTable(chap(5), "상황", "연락");
  const cts = rowsOf(contact).slice(1);
  return [
    tips("사고 직후 즉시 조치 순서", [
      "① 작업 중지 · 2차 사고 방지  →  ② 응급조치 · 119 신고  →  ③ 총괄 · 현장 PM 보고  →  ④ 시공사 · 보험사 통보  →  ⑤ 현장 보존 · 사진",
      "중대재해(사망 등)는 지체 없이 관할 지방고용노동관서에 보고한다 (산업안전보건법 제54조).",
    ], "bad"),
    heading("사고 개요"),
    kvTable([["발생 일시", "20     .     .     .        :      "], ["장소", " "], ["재해자", "소속          ·  성명          ·  직종          "], ["작업 공정", " "],
      ["사고 유형", checks(["추락", "낙하", "협착", "감전", "베임", "기타 (        )"]), { full: true }],
      ["부상 정도", checks(["경상", "중상", "사망", "아차사고"]), { full: true }]], 4),
    heading("경위 · 조치"),
    writeBox("사고 경위", 4), gap(80), writeBox("응급조치 · 후송", 2),
    heading("보고 · 통보"),
    gridTable(scale([0.3, 0.3, 0.2, 0.2]), ["대상", "담당 (백서 5.5)", "시각", "방법"],
      [["총괄", (cts.find((r) => r[0].includes("금액")) || [])[1] || "총괄", "    :    ", ""],
        ["현장 PM", (cts.find((r) => r[0].includes("공정")) || [])[1] || "현장 PM", "    :    ", ""],
        ["시공사", "현장소장", "    :    ", ""], ["보험사", "공제 · 보험 담당", "    :    ", ""], ["관계기관", "노동관서 · 119 · 경찰", "    :    ", ""]],
      { align: [null, null, AlignmentType.CENTER], rowH: 440 }),
    heading("원인 · 재발 방지"),
    writeBox("원인", 3), gap(80), writeBox("재발 방지 대책", 3),
    gap(), kvTable([["첨부", checks(["현장 사진", "TBM 일지", "작업자 명단 · 보험 증빙", "진단서"]), { full: true }]]),
    APPROVAL(["작성", "PM", "총괄"]),
  ];
});

form("F", "현장 개요 카드", "현장별 분석 · 7장", `현장마다 한 장으로 핵심 정보를 정리하는 카드. 빈 양식과 함께 준공 현장 ${REP.length}곳은 시공완료보고서 값으로 채운 카드를 넣었습니다.`, () => {
  const blank = () => [
    kvTable([["현장명 / 주소", " ", { full: true }],
      ["사업 유형", checks(["자가소비", "상계거래", "직접PPA", "BAPV·BIPV"]), { full: true }],
      ["설비 용량", "DC          kWp  /  AC          kW  /  모듈          W ×          매  /  인버터                    ", { full: true }],
      ["스트링 구성", " ", { full: true }], ["수전 방식 / 계약전력", " ", { full: true }], ["시공사 / 감리", " ", { full: true }],
      ["주요 인허가 (일자)", " ", { full: true }], ["착공 / 사용전검사 / 준공", " ", { full: true }], ["주요 이슈 (10장 No.)", " ", { full: true }]]),
  ];
  const out = [heading("빈 양식"), ...blank()];
  for (const r of REP) {
    const s = SITES.find((x) => norm(r.site).includes(norm(x.name).replace(/\(.*\)/, ""))) || {};
    const strings = (r.checks || []).find((c) => c.item.includes("스트링")) || {};
    const iss = issuesFor(r.site);
    out.push(new Paragraph({ children: [new PageBreak()] }));
    out.push(banner("F", `현장 개요 카드 — ${norm(r.site)}`, "시공완료보고서 기준으로 채움"), accent(), gap(200));
    out.push(kvTable([
      ["현장명 / 주소", `${r.site}  ·  ${r.address || ""}`, { full: true }],
      ["사업 유형", `☑ 자가소비 (갑)   ${box} 상계거래   ${box} 직접PPA   ${box} BAPV·BIPV`, { full: true }],
      ["설비 용량", r.capacity_text || "", { full: true }],
      ["스트링 구성", strings.result || "", { full: true }],
      ["수전 방식 / 계약전력", (r.power || " "), { full: true }],
      ["시공사 / 감리", [s.builder, s.cm].filter(Boolean).join("  /  ") || " ", { full: true }],
      ["주요 인허가 (일자)", (r.permits || []).map((p) => `${p.name} ${p.date}`).join("  ·  ") || " ", { full: true }],
      ["착공 / 사용전검사 / 준공", `${r.start_date || ""}  /  ${(r.inspection || "").slice(0, 13)}  /  ${r.completion_date || ""}`, { full: true }],
      ["주요 이슈 (10장 No.)", iss.length ? iss.map((n) => "No." + n).join(", ") : " ", { full: true }],
    ]));
    const e = r.effect || {};
    out.push(heading("기대 효과 (연간, 보고서 8.1)"));
    out.push(gridTable(scale([0.25, 0.25, 0.25, 0.25]), ["예상 발전량", "자가소비량", "전기요금 절감", "자부담 회수"],
      [[(e.gen || {}).value || "", ((e.self || {}).value || "") + " " + ((e.self || {}).note || ""), (e.saving || {}).value || "", (e.payback || {}).value || ""]],
      { align: [AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER], rowH: 520 }));
    out.push(heading("공정 경과 (보고서 5.2)"));
    out.push(gridTable(scale([0.18, 0.82]), ["일자", "공정 · 내용"], (r.timeline || []).map((t) => [{ text: t.date, bold: true }, t.text]), { align: [AlignmentType.CENTER], rowH: 340, size: 16 }));
  }
  return out;
});

form("G", "용어 정리", "현장 휴대용", "현장에서 자주 쓰는 용어. 백서 1.3 전기 기초와 부록 G를 합쳤습니다.", () => {
  const g = appendixSection("G").find((b) => b.t === "table");
  const basic = findTable(chap(1), "용어", "뜻");
  const rows = [];
  const seen = new Set();
  for (const r of rowsOf(basic).slice(1)) { rows.push([r[0], r[1], r[2] || ""]); seen.add(r[0]); }
  for (const r of rowsOf(g).slice(1)) {
    if (seen.has(r[0])) continue;
    let d = r[1];
    if (/정의 입력|확인 필요/.test(d) && r[0].startsWith("갑")) d = "산업용(갑) 전력 요금제 수용가 대상 자가소비형 태양광을 부르는 사내 구분 (1~6번 현장). 요금제 기준은 한전 고지서로 확인";
    rows.push([r[0], d, ""]);
  }
  return [gridTable(scale([0.2, 0.5, 0.3]), ["용어", "뜻", "예시"], rows.map((r) => [{ text: r[0], bold: true }, r[1], r[2]]), { rowH: 420, size: 16 })];
});

form("H", "참고 자료 목록", "기준 · 법령", "시공 기준 · 안전 법령 · 사내 자료 목록. 확인한 날짜를 적어 최신 여부를 관리합니다.", () => {
  const ul = appendixSection("H").find((b) => b.t === "ul");
  const items = (ul ? ul.items : []).map(plain);
  const kind = (s) => (s.startsWith("사내") ? "사내" : /규칙|법|노동부/.test(s) ? "법령 · 안전" : /기준|KFS|IEA/.test(s) ? "시공 · 설비 기준" : "통계 · 기타");
  return [gridTable(scale([0.06, 0.16, 0.6, 0.18]), ["No", "구분", "자료", "확인일"], items.map((s, i) => [String(i + 1), { text: kind(s), bold: true, color: C.ink2 }, s, "    .    .    "]), { align: [AlignmentType.CENTER], rowH: 520, size: 16 })];
});

form("I", "O&M 점검표", "운영 · 유지관리 · 20장", "준공 후 정기 점검표. 항목별 점검 방법 · 기준과 주기, FEMS 운영 루틴을 채워 두었습니다.", () => {
  const rows = [
    ["모듈", "모듈 오염 · 파손", "육안 · 사진, 발전량이 전월보다 떨어지면 청소 검토", "월"],
    ["구조물", "구조물 볼트 · 녹", "볼트 풀림 · 부식, 태풍 · 강풍 후 특별 점검", "분기"],
    ["지붕", "지붕 관통부 누수", "실내 천장 누수 흔적, 실리콘 · 볼트캡 상태", "분기 · 우기 전"],
    ["전기", "케이블 · 커넥터 (발열 · 변색)", "피복 손상 · 변색, 열화상 점검 권장", "반기"],
    ["전기", "인버터 에러 · 환기", "에러 이력, 팬 · 필터, 차양막 · 표시창 덮개", "월"],
    ["보호", "수배전반 · 계전기", "역전력계전기 동작, 32PX 보조릴레이 장착 확인 (이슈 No.34)", "월"],
    ["보호", "접지", "접지저항 측정 (TT 방식 100Ω 이하, 장원 58.7Ω)", "연"],
    ["감시", "모니터링 통신", "FEMS 발전량 0 여부, 한전 대비 정합성 98% 이상 (이슈 No.30)", "매일"],
  ];
  return [
    kvTable([["현장명", " "], ["점검일", "20     .     .     ."], ["점검자", " "], ["점검 구분", checks(["일상", "정기", "정밀", "특별"])]], 4),
    heading("점검 항목"),
    gridTable(scale([0.08, 0.2, 0.36, 0.1, 0.06, 0.06, 0.14]), ["구분", "점검 항목", "방법 · 기준", "주기", "양호", "불량", "조치"],
      rows.map(([g, it, how, per]) => [{ text: g, bold: true, color: C.ink2 }, { text: it, bold: true }, how, per, box, box, ""]),
      { align: [AlignmentType.CENTER, null, null, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER], rowH: 520, size: 16 }),
    heading("FEMS 운영 루틴", "시공완료보고서 7장"),
    gridTable(scale([0.18, 0.82]), ["주기", "확인할 것"], [
      [{ text: "매일 5분", bold: true }, "대시보드에서 발전 여부 · 알람 확인. 맑은 낮에 발전량이 0이면 인버터 · 차단기 상태를 보고 유호스트에 연락"],
      [{ text: "매주 15분", bold: true }, "기간 사용량에서 전주 대비 발전량 비교. 날씨가 비슷한데 크게 줄었으면 점검 요청"],
      [{ text: "매월 1시간", bold: true }, "한전 고지서와 발전량 · 공장 사용량 대조, 월간 리포트 저장 (성과관리 자료)"],
    ], { rowH: 460, size: 16 }),
    heading("이상 · 조치 내용"), writeBox("내용", 3),
    APPROVAL(["점검자", "PM"]),
  ];
});

form("J", "월간 발전 보고", "성과 관리 · 26장", "매월 현장별 발전 실적을 예상치와 비교하는 보고서. 현장별 월 예상 발전량 기준표(시공완료보고서 8.2)를 채워 두었습니다.", () => {
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const out = [
    kvTable([["보고 월", "20        년          월"], ["작성자", " "]], 4),
    heading("현장별 실적", "예상 발전량은 아래 기준표에서 옮겨 적는다"),
    gridTable(scale([0.15, 0.09, 0.12, 0.12, 0.1, 0.08, 0.12, 0.1, 0.12]), ["현장", "용량 kWp", "예상 kWh", "실적 kWh", "예상 대비", "PR", "자가소비 kWh", "고장·정지", "비고"],
      [...REP.map((r) => [{ text: norm(r.site), bold: true }, (r.kwp || "").toString(), "", "", "      %", "     %", "", "", ""]), ["", "", "", "", "      %", "     %", "", "", ""]],
      { align: [null, AlignmentType.CENTER, AlignmentType.RIGHT, AlignmentType.RIGHT, AlignmentType.RIGHT, AlignmentType.RIGHT, AlignmentType.RIGHT], rowH: 440 }),
    heading("월 예상 발전량 기준표 (kWh)", "시공완료보고서 8.2 설계 시뮬레이션"),
  ];
  if (REP.length) {
    out.push(gridTable(scale([0.16, ...months.map(() => 0.07)]), ["현장", ...months.map((m) => m + "월")],
      REP.map((r) => [{ text: norm(r.site), bold: true }, ...months.map((m) => { const x = (r.monthly || []).find((y) => y.m === m); return x ? x.gen.toLocaleString("ko-KR") : "–"; })]),
      { align: [null, ...months.map(() => AlignmentType.RIGHT)], rowH: 420, size: 15 }));
  }
  out.push(gap(), tips("계산 방법", [
    "예상 대비(%) = 실적 ÷ 예상 × 100. 준공 후 1년 실적이 예상의 90% 미만이면 원인 분석 · 개선 조치 (계약 제13조).",
    "PR(%) = 실적 kWh ÷ (설비 kWp × 해당 월 일사량 kWh/m²) × 100. 일사량 출처를 비고에 적는다.",
    "실적은 FEMS 월간 리포트와 한전 파워플래너 값을 대조해 적는다.",
  ], "cell"));
  out.push(APPROVAL(["작성", "PM"]));
  return out;
}, { landscape: true });

/* ---------- 문서 만들기 ---------- */
const regular = fs.readFileSync(path.join(FONT_DIR, "Pretendard-Regular.ttf"));
function makeDoc(sections, title) {
  return new Document({
    creator: ORG, title, description: `${PROJECT} · 태양광 사업관리 백서 부록 양식`,
    fonts: [{ name: FONT, data: regular, characterSet: CharacterSet.HANGUL }],
    styles: { default: { document: { run: { font: { ascii: FONT, eastAsia: FONT, hAnsi: FONT, cs: FONT }, size: 19, color: C.ink } } } },
    sections,
  });
}
function sectionFor(f) {
  CW = (f.landscape ? PAGE_H : PAGE_W) - MARGIN * 2;
  const raw = f.build();
  const ap = raw.find((x) => x && x.__approval);
  const body = raw.filter((x) => !(x && x.__approval));
  return {
    properties: { page: { size: { width: PAGE_W, height: PAGE_H, orientation: f.landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, footer: 400 } } },
    footers: { default: new Footer({ children: [new Paragraph({
      tabStops: [{ type: "right", position: CW }],
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 6 } },
      children: [run(`${ORG}  ·  양식 ${f.code} ${f.title}`, { size: 14, color: C.ink3 }), new TextRun({ children: ["\t", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], font: FONT, size: 14, color: C.ink3 })],
    })] }) },
    children: [banner(f.code, f.title, f.sub), accent(), gap(120), ...(ap ? [approval(ap.__approval), gap(120)] : []), ...body],
  };
}
(async () => {
  const list = [];
  for (const f of FORMS) {
    const file = `양식${f.code}_${f.title.replace(/[ ·/]+/g, "_")}.docx`;
    const buf = await Packer.toBuffer(makeDoc([sectionFor(f)], `양식 ${f.code} ${f.title}`));
    fs.writeFileSync(path.join(OUT, file), buf);
    list.push({ code: f.code, title: f.title, sub: f.sub, desc: f.desc, file, size: buf.length, landscape: f.landscape });
  }
  const all = await Packer.toBuffer(makeDoc(FORMS.map(sectionFor), "태양광 현장 양식 모음"));
  const allName = "태양광_현장양식_모음_A-J.docx";
  fs.writeFileSync(path.join(OUT, allName), all);
  fs.writeFileSync(path.join(OUT, "forms.json"), JSON.stringify({ forms: list, all: { file: allName, size: all.length } }));
  // 글꼴 부분집합에 넣을 글자
  fs.writeFileSync(path.join(OUT, "chars.txt"), Array.from(new Set(JSON.stringify(list) + FORMS.map((f) => f.title + f.desc).join(""))).join(""));
  console.log(`양식 ${list.length}종 + 모음 1종 → ${OUT}`);
})();
