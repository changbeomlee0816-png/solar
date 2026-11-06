"""시공완료보고서 PDF → reports.json + 사진.

세 보고서가 같은 양식(표지 · 준공계 · 1~9장)을 쓰므로 pdftotext 결과에서 항목 이름으로 값을 찾는다.
접속 정보(7.2 아이디 · 비밀번호), 사업자등록번호 같은 민감 정보는 읽지 않는다.

사용: python3 -I build/convert_reports.py <보고서 폴더> <출력 폴더>
필요: poppler-utils (pdftotext, pdfimages)
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

PHOTO_MAX = 1000
PER_SECTION = 4  # 사진대지 섹션별로 웹에 싣는 사진 수


def text_pages(pdf):
    raw = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True, check=True).stdout
    pages = raw.split("\f")
    norm = []
    for p in pages:
        lines = []
        for ln in p.splitlines():
            ln = re.sub(r" {2,}", " | ", ln).strip(" |")
            if ln:
                lines.append(ln)
        norm.append(lines)
    return norm


def label(ln, name):
    """'사 | 업 | 명 값' 처럼 글자 사이가 벌어진 라벨을 찾아 값을 돌려준다."""
    pat = r"^\s*" + r"[\s|]*".join(map(re.escape, name)) + r"[\s|]+(.*)$"
    m = re.match(pat, ln)
    return m.group(1).replace(" | ", " ").strip() if m else None


def first(lines, name):
    for ln in lines:
        v = label(ln, name)
        if v:
            return v
    return None


def num(s):
    s = re.sub(r"[^\d.\-]", "", s or "")
    try:
        return float(s) if "." in s else int(s)
    except ValueError:
        return None


def section(lines, start_pat, end_pat):
    out, on = [], False
    for ln in lines:
        if re.match(start_pat, ln):
            on = True
            continue
        if on and re.match(end_pat, ln):
            break
        if on:
            out.append(ln)
    return out


def parse(pdf):
    pages = text_pages(pdf)
    allp = [ln for p in pages for ln in p]
    r = {"file": pdf.name}
    r["project"] = first(allp, "사업명")
    r["site"] = first(allp, "수용가")
    r["address"] = first(allp, "설치장소")
    r["capacity_text"] = first(allp, "설비용량")
    m = re.search(r"([\d.]+)\s*kWp", r["capacity_text"] or "")
    r["kwp"] = float(m.group(1)) if m else None
    r["contract_period"] = first(allp, "계약기간")
    r["build_period"] = first(allp, "공사기간")
    r["submitted"] = first(allp, "제출일")
    amt = first(allp, "계약금액") or ""
    m = re.search(r"\(([\d,]+)원", amt)
    r["contract_amount"] = num(m.group(1)) if m else None
    r["contract_date"] = first(allp, "계약일자")
    r["start_date"] = first(allp, "착공일자")
    r["inspection"] = first(allp, "사용전검사")
    r["completion_date"] = first(allp, "준공일자")
    r["warranty"] = first(allp, "하자보증")
    # 수행 체계 (여러 줄)
    body = section(allp, r"^1\. 사업 개요", r"^2\. 수용가 현황")
    team = []
    grab = False
    for ln in body:
        if "판매자" in ln:
            grab = True
        if grab:
            if re.search(r"사\s*\|?\s*업\s*\|?\s*추", ln) or "→" in ln:
                break
            team.append(re.sub(r"^수\s*\|\s*행\s*\|\s*체\s*\|\s*계\s*\|?\s*", "", ln))
    r["team"] = " ".join(team).replace(" | ", " ").strip() or None
    steps = []
    for ln in body:
        if "→" in ln:
            steps.append(re.sub(r"^사\s*\|\s*업\s*\|\s*추\s*\|\s*진\s*\|?\s*", "", ln).replace(" | ", " "))
    r["flow"] = " ".join(steps).strip()
    # 수용가 현황
    cust = section(allp, r"^2\. 수용가 현황", r"^3\. 계약")
    r["industry"] = first(cust, "업종·규모") or first(cust, "업종 · 규모")
    r["product"] = first(cust, "주요생산품")
    r["sales"] = first(cust, "매출액")
    r["power"] = first(cust, "수전설비")
    # 재원
    fin = section(allp, r"^3\.2 총사업비", r"^3\.3")
    r["funding"] = {}
    for ln in fin:
        m = re.match(r"^(정부지원금|자기부담금|총사업비|금융비용 \(별도\))\s*\|\s*([\d,]+)", ln)
        if m:
            r["funding"][m.group(1).replace(" (별도)", "")] = num(m.group(2))
    # 공종별 사업비
    cost = section(allp, r"^3\.3 공종별", r"^3\.4")
    r["cost_breakdown"] = []
    for ln in cost:
        m = re.match(r"^\|?\s*(설계 · 인허가 · 구조검토|주요 설비자재|구조물 공사|전기 공사|공사 외 비용)\s*\|\s*(?:(.*?)\s*\|\s*)?([\d,]{6,})\s*\|\s*([\d.]+)%", ln)
        if m:
            r["cost_breakdown"].append({"name": m.group(1), "desc": (m.group(2) or "").strip(), "amount": num(m.group(3)), "pct": float(m.group(4))})
    # 설비
    eq = section(allp, r"^4\. 설비 현황", r"^5\. 인허가")
    eqt = " ".join(eq)
    m = re.search(r"(HiS-[\w-]+)", eqt)
    r["module_model"] = m.group(1) if m else None
    m = re.search(r"\((HPC-[\w-]+)\)", eqt)
    r["inverter_model"] = m.group(1) if m else None
    m = re.search(r"효율\s*([\d.]+%)", eqt)
    r["module_eff"] = m.group(1) if m else None
    # 인허가
    perm = section(allp, r"^5\.1 인허가", r"^5\.2")
    r["permits"] = []
    for ln in perm:
        m = re.match(r"^\|?\s*([가-힣 ·]+?)\s*\|\s*(\d{2}\.\d{2}|\d{4}\.\d{2}(?:\.\d{2})?)\s*\|", ln)
        if m and m.group(1).strip() not in ("항목",):
            r["permits"].append({"name": m.group(1).strip(), "date": m.group(2)})
    # 공정 경과
    proc = section(allp, r"^5\.2 공정 경과", r"^(5\.3|6\.|- \d+ -)")
    r["timeline"] = []
    for ln in proc:
        m = re.match(r"^\|?\s*(\d{2}\.\d{2}(?:~\d{0,2}\.?\d{0,2})?)\s*\|\s*(.+)$", ln)
        if m:
            r["timeline"].append({"date": m.group(1), "text": m.group(2).replace(" | ", " ").replace("〔확인〕", "").strip()})
    # 사용전검사
    insp = section(allp, r"^6\. 사용전검사", r"^진행 내용")
    r["inspection_result"] = " ".join(x for x in (first(insp, "결과"),) if x)
    r["inspection_when"] = first(insp, "검사일시")
    # 검사 항목 (판정 '적합')
    items = section(allp, r"^검사 항목", r"^모듈 사용전 점검")
    r["checks"] = []
    for ln in items:
        cells = [c.strip() for c in ln.split("|") if c.strip()]
        if len(cells) >= 3 and cells[-1] in ("적합", "부적합", "합격"):
            r["checks"].append({"item": cells[0], "std": cells[1] if len(cells) > 3 else "", "result": cells[-2], "ok": cells[-1] != "부적합"})
    # 기대효과
    eff = section(allp, r"^8\.1 예상 효과", r"^8\.2")
    effect = {}
    keys = {
        "예상 발전량": "gen", "자가소비량": "self", "전기요금 절감액": "saving", "전기요금 절감률": "saving_rate",
        "RE100 달성률": "re100", "온실가스 감축": "ghg", "자기부담금 회수기간": "payback", "추가 절감 (요금제 변경)": "extra",
    }
    for ln in eff:
        for k, key in keys.items():
            if ln.startswith("| " + k) or ln.startswith(k):
                cells = [c.strip() for c in ln.split("|") if c.strip()]
                if len(cells) >= 2:
                    effect[key] = {"label": k, "value": cells[1], "note": " ".join(cells[2:])}
    r["effect"] = effect
    month = section(allp, r"^8\.2 월별", r"^8\.3")
    r["monthly"] = []
    for ln in month:
        m = re.match(r"^\|?\s*(\d{1,2})월\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)", ln)
        if m:
            r["monthly"].append({"m": int(m.group(1)), "use": num(m.group(2)), "gen": num(m.group(3)), "self": num(m.group(4)), "saving": num(m.group(5))})
    # 사진대지 페이지 → 섹션 제목
    photo_pages = {}
    on = False
    cur = "사진대지"
    for i, p in enumerate(pages, start=1):
        for ln in p:
            if re.match(r"^9\. 사진대지", ln):
                on = True
            if on and re.match(r"^(10\. 첨부자료|준공 검수 확인서)", ln):
                on = False
            if on:
                m = re.match(r"^9\.\d+\s+(.+)$", ln)
                if m:
                    cur = m.group(1).strip()
        if on or (photo_pages and not on and i == max(photo_pages) + 1 and False):
            photo_pages[i] = cur
    r["_photo_pages"] = photo_pages
    return r


def extract_images(pdf, pages_wanted, outdir, prefix):
    out = {}
    with tempfile.TemporaryDirectory() as td:
        for pg in pages_wanted:
            subprocess.run(["pdfimages", "-f", str(pg), "-l", str(pg), "-j", "-p", str(pdf), f"{td}/p"], check=True)
        for f in sorted(Path(td).iterdir()):
            m = re.match(r"p-(\d+)-(\d+)\.", f.name)
            if not m:
                continue
            pg = int(m.group(1))
            try:
                im = Image.open(f)
                im.load()
            except Exception:
                continue
            if min(im.size) < 300 or im.mode in ("1", "L") and min(im.size) < 600:
                continue
            if im.width > PHOTO_MAX:
                im = im.resize((PHOTO_MAX, round(im.height * PHOTO_MAX / im.width)), Image.LANCZOS)
            name = f"{prefix}-{pg:02d}-{m.group(2)}.jpg"
            im.convert("RGB").save(outdir / name, quality=78, optimize=True, progressive=True)
            out.setdefault(pg, []).append({"src": f"rep/{name}", "w": im.width, "h": im.height})
    return out


def main():
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    (out / "rep").mkdir(parents=True, exist_ok=True)
    reports = []
    for i, pdf in enumerate(sorted(src.glob("*.pdf"))):
        r = parse(pdf)
        prefix = f"r{i + 1}"
        pp = r.pop("_photo_pages")
        imgs = extract_images(pdf, [4, 5] + sorted(pp), out / "rep", prefix)
        r["location_img"] = (imgs.get(4) or [None])[0]
        r["hero_img"] = (imgs.get(5) or [None])[0]
        photos, per = [], {}
        for pg in sorted(pp):
            for im in imgs.get(pg, []):
                cap = pp[pg]
                if per.get(cap, 0) < PER_SECTION:
                    per[cap] = per.get(cap, 0) + 1
                    photos.append(dict(im, cap=cap))
                else:
                    (out / im["src"]).unlink(missing_ok=True)
        r["photos"] = photos
        reports.append(r)
        print(f"{pdf.name}: {r['site']} {r['kwp']}kWp, 공정 {len(r['timeline'])}건, 월별 {len(r['monthly'])}개월, 사진 {len(r['photos'])}장")
    (out / "reports.json").write_text(json.dumps(reports, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
