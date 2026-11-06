"""백서 .docx → whitepaper.json + 이미지 변환기.

백서는 Word 스타일 대신 글자 크기로 장·절을 구분한다 (17pt 장, 12.5pt 절, 10.5pt 소제목,
14pt 'PART n', 26pt 파트 제목). 이 규칙으로 문서를 구조화해 웹 리더가 읽을 JSON을 만든다.

사용: python3 -I build/convert_docx.py <백서.docx> <출력 폴더>
"""
import hashlib
import html
import io
import json
import re
import sys
from pathlib import Path

import docx
from PIL import Image

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
MC = "{http://schemas.openxmlformats.org/markup-compatibility/2006}"

MAX_IMG_W = 1400


class Converter:
    def __init__(self, path, out):
        self.doc = docx.Document(path)
        self.out = Path(out)
        (self.out / "img").mkdir(parents=True, exist_ok=True)
        self.rels = self.doc.part.rels
        self.images = {}
        self.slug_count = {}

    # ---------- 이미지 ----------
    def image(self, rid):
        if rid in self.images:
            return self.images[rid]
        rel = self.rels.get(rid)
        if rel is None or "image" not in rel.reltype:
            return None
        blob = rel.target_part.blob
        h = hashlib.sha1(blob).hexdigest()[:12]
        try:
            im = Image.open(io.BytesIO(blob))
            im.load()
        except Exception:
            return None
        w, hgt = im.size
        has_alpha = im.mode in ("RGBA", "LA", "P")
        if w > MAX_IMG_W:
            im = im.resize((MAX_IMG_W, round(hgt * MAX_IMG_W / w)), Image.LANCZOS)
        if has_alpha:
            name = f"{h}.png"
            im.save(self.out / "img" / name, optimize=True)
        else:
            name = f"{h}.jpg"
            im.convert("RGB").save(self.out / "img" / name, quality=80, optimize=True, progressive=True)
        info = {"src": f"img/{name}", "w": im.size[0], "h": im.size[1]}
        self.images[rid] = info
        return info

    # ---------- 텍스트 ----------
    @staticmethod
    def run_props(r):
        rpr = r.find(W + "rPr")
        size = bold = color = None
        if rpr is not None:
            sz = rpr.find(W + "sz")
            if sz is not None:
                size = int(sz.get(W + "val")) / 2
            b = rpr.find(W + "b")
            if b is not None and b.get(W + "val") not in ("0", "false"):
                bold = True
            c = rpr.find(W + "color")
            if c is not None:
                color = c.get(W + "val")
        return size, bold, color

    def para_info(self, p):
        """문단의 (html, plain, 첫 run 속성, 이미지 목록, 목록 여부)."""
        parts, plain, imgs = [], [], []
        first = None
        for r in p.iter(W + "r"):
            # mc:Fallback 안의 중복 내용은 건너뛴다
            if any(a.tag == MC + "Fallback" for a in r.iterancestors()):
                continue
            for blip in r.iter(A + "blip"):
                info = self.image(blip.get(R + "embed"))
                if info:
                    imgs.append(info)
            txt = "".join(
                (t.text or "") if t.tag == W + "t" else ("\n" if t.tag in (W + "br", W + "cr") else "\t")
                for t in r
                if t.tag in (W + "t", W + "br", W + "cr", W + "tab")
            )
            if not txt:
                continue
            props = self.run_props(r)
            if first is None and txt.strip():
                first = props
            esc = html.escape(txt).replace("\n", "<br>")
            if props[1]:
                esc = f"<strong>{esc}</strong>"
            elif props[2] and props[2].upper() in ("C00000", "FF0000", "C0504D"):
                esc = f'<em class="warn">{esc}</em>'
            parts.append(esc)
            plain.append(txt)
        ppr = p.find(W + "pPr")
        is_list = ppr is not None and ppr.find(W + "numPr") is not None
        h = "".join(parts).replace("</strong><strong>", "")
        h = re.sub(r"\t+", " ", h).strip()
        text = re.sub(r"[\t ]+", " ", "".join(plain)).strip()
        return h, text, first or (None, None, None), imgs, is_list

    def slug(self, base):
        s = re.sub(r"[^0-9A-Za-z]+", "-", base).strip("-").lower() or "s"
        n = self.slug_count.get(s, 0)
        self.slug_count[s] = n + 1
        return s if n == 0 else f"{s}-{n}"

    # ---------- 표 ----------
    def cell_content(self, tc):
        blocks = []
        for el in tc:
            if el.tag == W + "p":
                h, text, props, imgs, is_list = self.para_info(el)
                for im in imgs:
                    blocks.append({"t": "img", **im})
                if text:
                    blocks.append({"t": "li" if is_list else "p", "html": h, "bold": bool(props[1]), "size": props[0]})
            elif el.tag == W + "tbl":
                blocks.append(self.table(el))
        return blocks

    def table(self, tbl):
        rows = []
        vmerge_open = {}
        for tr in tbl.findall(W + "tr"):
            row = []
            col = 0
            for tc in tr.findall(W + "tc"):
                pr = tc.find(W + "tcPr")
                span = 1
                fill = None
                vm = None
                if pr is not None:
                    gs = pr.find(W + "gridSpan")
                    if gs is not None:
                        span = int(gs.get(W + "val"))
                    shd = pr.find(W + "shd")
                    if shd is not None:
                        fill = (shd.get(W + "fill") or "").upper()
                        if fill in ("AUTO", "FFFFFF"):
                            fill = None
                    v = pr.find(W + "vMerge")
                    if v is not None:
                        vm = v.get(W + "val") or "continue"
                if vm == "continue" and col in vmerge_open:
                    vmerge_open[col]["rs"] += 1
                    col += span
                    continue
                cell = {"c": self.cell_content(tc), "cs": span, "rs": 1, "fill": fill}
                if vm == "restart":
                    vmerge_open[col] = cell
                else:
                    vmerge_open.pop(col, None)
                row.append(cell)
                col += span
            rows.append(row)
        ncols = len(tbl.find(W + "tblGrid").findall(W + "gridCol")) if tbl.find(W + "tblGrid") is not None else 0
        return self.classify_table(rows, ncols)

    @staticmethod
    def cell_text(cell):
        return " ".join(b.get("html", "") for b in cell["c"] if b["t"] in ("p", "li"))

    def classify_table(self, rows, ncols):
        cells = [c for r in rows for c in r]
        flat_text = " ".join(re.sub("<[^>]+>", "", self.cell_text(c)) for c in cells)
        # 단일 셀 상자 → 강조 박스(callout)
        if len(cells) == 1:
            c = cells[0]
            blocks = c["c"]
            title = None
            if blocks and blocks[0]["t"] == "p" and blocks[0].get("bold") and len(blocks) > 1:
                title = re.sub("<[^>]+>", "", blocks[0]["html"])
                blocks = blocks[1:]
            tone = "info"
            probe = (title or "") + flat_text[:40]
            if "대외비" in probe:
                tone = "secret"
            elif "★" in probe or "체크" in probe:
                tone = "check"
            elif "주의" in probe or "위험" in probe or "금지" in probe:
                tone = "warn"
            fill = c["fill"] or ""
            if fill.startswith("FFF") or fill.startswith("FCE") or fill.startswith("FDE"):
                tone = "warn" if tone == "info" else tone
            return {"t": "callout", "tone": tone, "title": title, "c": blocks, "fill": fill}
        # 사진 표 → 갤러리
        img_cells = [c for c in cells if any(b["t"] == "img" for b in c["c"])]
        if img_cells and len(img_cells) >= max(1, len(cells) // 3):
            items = []
            pending = []
            for r in rows:
                for c in r:
                    ims = [b for b in c["c"] if b["t"] == "img"]
                    cap = re.sub("<[^>]+>", " ", self.cell_text(c)).strip()
                    if ims:
                        for im in ims:
                            items.append({"src": im["src"], "w": im["w"], "h": im["h"], "cap": cap})
                            pending.append(items[-1])
                    elif cap and pending:
                        # 사진 아래 행의 캡션
                        tgt = pending.pop(0)
                        tgt["cap"] = (tgt["cap"] + " " + cap).strip()
                if any(not any(b["t"] == "img" for b in c["c"]) for c in r):
                    pending = []
            return {"t": "gallery", "items": items}
        # 일반 표: 머리행 판정 (진한 남색 배경)
        head_rows = 0
        for r in rows:
            if r and all((c["fill"] or "") in ("1F3864", "2F5496", "203864", "1F4E79") for c in r):
                head_rows += 1
            else:
                break
        out_rows = []
        for r in rows:
            out = []
            for c in r:
                out.append({
                    "html": self.cells_html(c["c"]),
                    "cs": c["cs"], "rs": c["rs"],
                    "k": "band" if c["fill"] in ("D9E1F2", "DEEAF6", "DAE3F3") and c["cs"] > 1 else (
                        "key" if c["fill"] in ("F2F2F2", "EEF2F8", "E7E6E6", "F3F3F3") else None),
                })
            out_rows.append(out)
        return {"t": "table", "head": head_rows, "rows": out_rows, "ncols": ncols}

    def cells_html(self, blocks):
        parts = []
        lis = []
        for b in blocks:
            if b["t"] == "li":
                lis.append(f"<li>{b['html']}</li>")
                continue
            if lis:
                parts.append("<ul>" + "".join(lis) + "</ul>")
                lis = []
            if b["t"] == "p":
                parts.append(f"<p>{b['html']}</p>")
            elif b["t"] == "img":
                parts.append(f'<img src="{b["src"]}" width="{b["w"]}" height="{b["h"]}" loading="lazy" alt="">')
            elif b["t"] == "table":
                parts.append("<div class='subtable'>[표]</div>")
        if lis:
            parts.append("<ul>" + "".join(lis) + "</ul>")
        if len(parts) == 1 and parts[0].startswith("<p>"):
            return parts[0][3:-4]
        return "".join(parts)

    # ---------- 본문 ----------
    def run(self):
        meta = {"title": "", "subtitle": "", "org": "", "version": "", "date": "", "docno": ""}
        parts = []
        front = {"label": "", "title": "문서 정보", "subtitle": "", "chapters": []}
        cur_part = front
        cur_ch = None
        cur_sec = None
        revisions = []
        pending_part = None

        def new_chapter(num, title):
            nonlocal cur_ch, cur_sec
            cid = f"ch{num}" if num else self.slug("front-" + str(len(front["chapters"])))
            cur_ch = {"id": cid, "num": num, "title": title, "blocks": [], "sections": []}
            cur_part["chapters"].append(cur_ch)
            cur_sec = None
            return cur_ch

        def add(block):
            nonlocal cur_ch
            if cur_ch is None:
                new_chapter(None, "표지")
            cur_ch["blocks"].append(block)

        for el in self.doc.element.body.iterchildren():
            if el.tag == W + "p":
                h, text, (size, bold, color), imgs, is_list = self.para_info(el)
                for im in imgs:
                    add({"t": "fig", **im, "cap": ""})
                if not text:
                    continue
                if imgs and text.startswith("[그림"):
                    continue
                if size == 32:
                    meta["title"] = text
                    continue
                if size == 13 and bold and not meta["org"] and cur_ch is None:
                    meta["project"] = text
                    continue
                if size == 12 and not bold and not meta["subtitle"]:
                    meta["subtitle"] = text
                    continue
                if size == 12 and bold and not meta["org"]:
                    meta["org"] = text
                    continue
                if size == 9 and color == "7F7F7F" and "대외비" in text and cur_ch is None:
                    meta["badge"] = text
                    continue
                if size == 14 and text.startswith("PART"):
                    pending_part = {"label": text, "title": "", "subtitle": "", "chapters": [], "toc": []}
                    parts.append(pending_part)
                    cur_part = pending_part
                    cur_ch = None
                    continue
                if size == 26 and pending_part is not None:
                    pending_part["title"] = text
                    continue
                if size == 11 and not bold and pending_part is not None and not pending_part["subtitle"]:
                    pending_part["subtitle"] = text
                    continue
                if size == 11 and bold and color == "1F3864" and re.match(r"^\d+장", text):
                    if pending_part is not None:
                        pending_part["toc"].append(text)
                    continue
                if size == 17 and bold:
                    m = re.match(r"^(\d+)\s+(.*)$", text)
                    if m:
                        new_chapter(int(m.group(1)), m.group(2).strip())
                    elif text.startswith("부록"):
                        new_chapter("부록", text.replace("부록", "").strip() or "양식 모음")
                        cur_ch["id"] = "appendix"
                    else:
                        new_chapter(None, text)
                    pending_part = None
                    continue
                if size == 8.5 and color == "1F3864" and text.startswith("작성 담당"):
                    continue
                if size == 12.5 and bold:
                    m = re.match(r"^(\d+\.\d+)\s+(.*)$", text)
                    sid = (cur_ch["id"] if cur_ch else "x") + "-" + (m.group(1).replace(".", "-") if m else self.slug(text))
                    if m:
                        sid = "s" + m.group(1).replace(".", "-")
                    blk = {"t": "h3", "text": text, "id": sid}
                    add(blk)
                    cur_ch["sections"].append({"id": sid, "text": text})
                    continue
                if size == 10.5 and bold:
                    add({"t": "h4", "text": text})
                    continue
                if size == 8.5 and text.startswith("✎"):
                    add({"t": "guide", "html": h.replace("✎ 작성가이드", "").replace("<strong>✎ 작성가이드</strong>", "").strip()})
                    continue
                if size == 8.5 and text.startswith("그림"):
                    # 바로 앞 그림의 캡션
                    blocks = cur_ch["blocks"] if cur_ch else []
                    if blocks and blocks[-1]["t"] == "fig" and not blocks[-1]["cap"]:
                        blocks[-1]["cap"] = text
                    else:
                        add({"t": "caption", "text": text})
                    continue
                if color == "7F7F7F" and size == 10:
                    add({"t": "note", "html": h})
                    continue
                add({"t": "li" if is_list else "p", "html": h})
            elif el.tag == W + "tbl":
                tb = self.table(el)
                # 표지 문서정보 표
                if cur_ch is None and tb["t"] == "table":
                    for r in tb["rows"]:
                        cells = [re.sub("<[^>]+>", "", c["html"]) for c in r]
                        for i in range(0, len(cells) - 1, 2):
                            k, v = cells[i].strip(), cells[i + 1].strip()
                            if k == "문서번호":
                                meta["docno"] = v
                            elif k == "버전":
                                meta["version"] = v
                            elif k == "작성":
                                meta["author"] = v
                            elif k == "작성일":
                                meta["date"] = v
                    continue
                add(tb)
        # 목록(li) 묶기
        for p in [front] + parts:
            for ch in p["chapters"]:
                ch["blocks"] = group_lists(ch["blocks"])
                if ch["title"] == "문서 정보 및 작성 가이드":
                    for b in ch["blocks"]:
                        if b["t"] == "table" and b["rows"] and "버전" in b["rows"][0][0]["html"]:
                            revisions = [[re.sub("<[^>]+>", "", c["html"]) for c in r] for r in b["rows"][b["head"] or 1:]]
                            break
        meta["revisions"] = revisions
        meta["images"] = len(self.images)
        data = {"meta": meta, "parts": [front] + parts}
        return data


def group_lists(blocks):
    out = []
    for b in blocks:
        if b["t"] == "li":
            if out and out[-1]["t"] == "ul":
                out[-1]["items"].append(b["html"])
            else:
                out.append({"t": "ul", "items": [b["html"]]})
        else:
            out.append(b)
    return out


def main():
    src, out = sys.argv[1], sys.argv[2]
    data = Converter(src, out).run()
    Path(out, "whitepaper.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    n_ch = sum(len(p["chapters"]) for p in data["parts"])
    print(f"whitepaper.json: {len(data['parts'])}개 파트, {n_ch}개 장, 이미지 {data['meta']['images']}개, 버전 {data['meta']['version']}")


if __name__ == "__main__":
    main()
