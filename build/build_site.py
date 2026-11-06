"""백서 웹 빌드: 원본 자료 → dist/ (index.html + img/ + rep/).

사용:
  python3 -I build/build_site.py --docx 백서.docx --xlsx 원가관리툴.xlsx --reports 보고서폴더 --out dist

- 백서(.docx)는 필수, 원가 툴과 시공완료보고서는 없으면 해당 화면만 비어 있게 된다.
- 결과 dist/index.html 하나에 화면 코드와 데이터가 모두 들어가고, 사진은 img/ · rep/ 폴더로 나간다.
"""
import argparse
import datetime as dt
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
SITE = ROOT / "site"


def run(script, *args):
    subprocess.run([sys.executable, "-I", str(BUILD / script), *map(str, args)], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--docx", required=True)
    ap.add_argument("--xlsx")
    ap.add_argument("--reports")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    out = Path(a.out)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    run("convert_docx.py", a.docx, out)
    data = {"wp": json.loads((out / "whitepaper.json").read_text(encoding="utf-8"))}
    if a.xlsx:
        run("convert_xlsx.py", a.xlsx, out)
        data["cost"] = json.loads((out / "cost.json").read_text(encoding="utf-8"))
    if a.reports:
        run("convert_reports.py", a.reports, out)
        data["reports"] = json.loads((out / "reports.json").read_text(encoding="utf-8"))
    data["built"] = dt.datetime.now().strftime("%Y-%m-%d %H:%M")

    blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = (SITE / "index.template.html").read_text(encoding="utf-8")
    html = html.replace("/*__STYLE__*/", (SITE / "style.css").read_text(encoding="utf-8"))
    html = html.replace("/*__DATA__*/", blob)
    html = html.replace("/*__APP__*/", (SITE / "app.js").read_text(encoding="utf-8"))
    (out / "index.html").write_text(html, encoding="utf-8")
    for f in ("whitepaper.json", "cost.json", "reports.json"):
        (out / f).unlink(missing_ok=True)

    files = [p for p in out.rglob("*") if p.is_file()]
    size = sum(p.stat().st_size for p in files)
    print(f"완료: {out}/index.html ({(out / 'index.html').stat().st_size / 1e6:.1f}MB), 파일 {len(files)}개, 합계 {size / 1e6:.1f}MB")


if __name__ == "__main__":
    main()
