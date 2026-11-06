"""원가관리 툴 .xlsx → cost.json.

웹 원가 페이지는 이 JSON의 '입력값'(기준단가 · 견적원본 · 투입 인원 일지)으로 엑셀과 같은 계산을
다시 한다. 시트 이름과 머리글 이름으로 찾으므로 행이 늘어나도 그대로 동작한다.

사용: python3 -I build/convert_xlsx.py <원가관리툴.xlsx> <출력 폴더>
"""
import datetime as dt
import json
import re
import sys
import warnings
from pathlib import Path

import openpyxl

warnings.filterwarnings("ignore")


def clean(v):
    if isinstance(v, str):
        return v.strip()
    if isinstance(v, dt.time):
        return v.hour + v.minute / 60
    if isinstance(v, dt.datetime):
        return v.strftime("%Y-%m-%d")
    return v


def rows(ws):
    return [[clean(c) for c in r] for r in ws.iter_rows(values_only=True)]


def find_row(rs, pred, start=0):
    for i in range(start, len(rs)):
        if pred([c for c in rs[i] if c is not None]):
            return i
    return -1


def bullets(rs, after_label="검토 결과"):
    i = find_row(rs, lambda r: r and r[0] == after_label)
    out = []
    if i < 0:
        return out
    for r in rs[i + 1:]:
        vals = [c for c in r if c not in (None, "")]
        if not vals or not isinstance(vals[0], str) or not re.match(r"^[①-⑩]", vals[0]):
            break
        out.append(vals[0])
    return out


def parse_basis(ws):
    rs = rows(ws)
    items = []
    h = find_row(rs, lambda r: r[:2] == ["항목", "기준값"])
    for r in rs[h + 1:]:
        if r[0] == "공종별 적용 직종":
            break
        if not r[0] or r[1] is None:
            continue
        items.append({"name": r[0], "value": r[1], "unit": r[2], "range": r[3], "grade": r[4], "basis": r[5]})
    trades = {}
    t = find_row(rs, lambda r: r and r[0] == "공종")
    if t >= 0:
        for r in rs[t + 1:]:
            if not r[0]:
                break
            trades[r[0]] = {"lead_trade": r[2], "worker_trade": r[3]}
    return items, trades


def parse_quotes(ws):
    rs = rows(ws)
    h = find_row(rs, lambda r: r and r[0] == "구분")
    sites = [c for c in rs[h][1:] if c]
    info = {s: {} for s in sites}
    i = h + 1
    while i < len(rs) and rs[i][0] and rs[i][0] != "No":
        for j, s in enumerate(sites):
            info[s][rs[i][0]] = rs[i][1 + j]
        i += 1
    i = find_row(rs, lambda r: r and r[0] == "No", i)
    hdr = rs[i]
    idx = {name: k for k, name in enumerate(hdr) if name}
    items = []
    for r in rs[i + 1:]:
        if r[0] is None or not isinstance(r[0], (int, float)):
            continue
        items.append({
            "no": r[idx["No"]], "site": r[idx["현장"]], "group": r[idx["견적서 대분류"]],
            "item": r[idx["견적서 항목"]], "std": r[idx["표준항목"]], "unit": r[idx["단위"]],
            "qty": r[idx["수량"]], "price": r[idx["단가"]], "amount": r[idx["금액"]],
            "note": r[idx.get("비고 (견적서)", -1)] if "비고 (견적서)" in idx else None,
            "memo": r[idx.get("검토 메모", -1)] if "검토 메모" in idx else None,
        })
    return sites, info, items


def parse_log(ws):
    rs = rows(ws)
    h = find_row(rs, lambda r: r[:3] == ["현장", "일자", "공종"])
    out = []
    for r in rs[h + 1:]:
        if r[0] == "합계":
            break
        if not r[0] or r[1] is None or str(r[0]).startswith("·"):
            continue
        out.append({
            "site": r[0], "date": r[1], "work": r[2], "desc": r[3],
            "lead": r[4] or 0, "workers": r[5] or 0, "equip": r[6] or 0,
            "start": r[7], "end": r[8], "rest": r[9] or 0,
            "basis": r[18] if len(r) > 18 else None, "raw": r[19] if len(r) > 19 else None,
        })
    notes = [r[0] for r in rs if isinstance(r[0], str) and r[0].startswith("·")]
    return out, notes


def parse_sources(ws):
    rs = rows(ws)
    h = find_row(rs, lambda r: r and r[0] == "자료")
    out = []
    for r in rs[h + 1:]:
        if r[0]:
            out.append({"name": r[0], "used": r[1], "where": r[2]})
    date = next((r[0] for r in rs if isinstance(r[0], str) and r[0].startswith("조회일")), "")
    return out, date


def main():
    src, out = sys.argv[1], sys.argv[2]
    wb = openpyxl.load_workbook(src, data_only=True)
    names = wb.sheetnames
    summary = rows(wb["원가 검토 요약"]) if "원가 검토 요약" in names else []
    labor = rows(wb["노무비 분석"]) if "노무비 분석" in names else []
    basis, trades = parse_basis(wb["기준단가"])
    sites, info, items = parse_quotes(wb["견적원본"])
    log, log_notes = parse_log(wb["투입 인원 일지"])
    sources, src_date = parse_sources(wb["출처"]) if "출처" in names else ([], "")
    # 시장 비교 E표 (공개가) 는 툴에서 그대로 가져온다
    market = []
    e = find_row(summary, lambda r: r and str(r[0]).startswith("E."))
    if e >= 0:
        for r in summary[e + 2:]:
            vals = [c for c in r if c is not None]
            if len(vals) < 4:
                break
            market.append({"name": vals[0], "values": vals[1:-1], "source": vals[-1]})
    data = {
        "title": summary[0][0] if summary else "원가 검토",
        "subtitle": summary[1][0] if len(summary) > 1 else "",
        "findings": bullets(summary),
        "labor_findings": bullets(labor),
        "basis": basis, "trades": trades,
        "sites": sites, "site_info": info, "quotes": items,
        "log": log, "log_notes": log_notes,
        "market": market, "sources": sources, "source_date": src_date,
    }
    Path(out).mkdir(parents=True, exist_ok=True)
    Path(out, "cost.json").write_text(json.dumps(data, ensure_ascii=False, default=str), encoding="utf-8")
    print(f"cost.json: 현장 {len(sites)}곳, 견적 {len(items)}줄, 인원 일지 {len(log)}줄, 기준단가 {len(basis)}개")


if __name__ == "__main__":
    main()
