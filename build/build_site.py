"""백서 웹 빌드: 원본 자료 → dist/ (index.html + img/ + rep/).

사용:
  python3 -I build/build_site.py --docx 백서.docx --xlsx 원가관리툴.xlsx --reports 보고서폴더 --out dist

- 백서(.docx)는 필수, 원가 툴과 시공완료보고서는 없으면 해당 화면만 비어 있게 된다.
- 결과 dist/index.html 하나에 화면 코드와 데이터가 모두 들어가고, 사진은 img/ · rep/ 폴더로 나간다.
"""
import argparse
import base64
import os
import re
import datetime as dt
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
SITE = ROOT / "site"
PUBLIC_URL = "https://yuhost-solar-whitepaper.netlify.app"


def run(script, *args):
    subprocess.run([sys.executable, "-I", str(BUILD / script), *map(str, args)], check=True)


def make_forms(data, out):
    """백서 부록 A~J → 디자인한 Word 양식(.docx, Pretendard 포함) + 미리보기 이미지."""
    node = shutil.which("node")
    if not node:
        print("node 가 없어 Word 양식을 건너뜀")
        return None
    fonts = BUILD / ".cache" / "docxfonts"
    if not (fonts / "Pretendard-Bold.ttf").exists():
        run("make_docx_fonts.py", fonts)
    tmp = out / "_tmp"
    tmp.mkdir(exist_ok=True)
    (tmp / "wp.json").write_text(json.dumps(data["wp"], ensure_ascii=False), encoding="utf-8")
    (tmp / "rep.json").write_text(json.dumps(data.get("reports") or [], ensure_ascii=False), encoding="utf-8")
    fdir = out / "forms"
    env = dict(os.environ)
    try:
        env["NODE_PATH"] = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
    except OSError:
        pass
    subprocess.run([node, str(BUILD / "make_forms.js"), str(tmp / "wp.json"), str(tmp / "rep.json"), str(fdir), str(fonts)], check=True, env=env)
    docs = sorted(fdir.glob("*.docx"))
    run("finish_docx.py", fonts, *docs)
    meta = json.loads((fdir / "forms.json").read_text(encoding="utf-8"))
    # 미리보기: 첫 쪽을 PNG로 (LibreOffice 가 있을 때)
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    entries = meta["forms"] + [meta["all"]]
    for f in entries:
        f["src"] = f"forms/{f['file']}"
        f["name"] = f["file"]
        f["size"] = (fdir / f["file"]).stat().st_size
    if soffice:
        for i, f in enumerate(meta["forms"]):
            subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", str(tmp), str(fdir / f["file"])], capture_output=True, timeout=180)
            pdf = tmp / (Path(f["file"]).stem + ".pdf")
            if pdf.exists():
                pages = re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True).stdout)
                f["pages"] = int(pages.group(1)) if pages else 1
                stem = fdir / f"thumb-{f['code']}"
                subprocess.run(["pdftoppm", "-png", "-r", "60", "-f", "1", "-l", "1", "-singlefile", str(pdf), str(stem)], check=True)
                f["thumb"] = f"forms/thumb-{f['code']}.png"
    for x in ("forms.json", "chars.txt"):
        (fdir / x).unlink(missing_ok=True)
    shutil.rmtree(tmp)
    print(f"Word 양식 {len(meta['forms'])}종 + 모음 1종 (미리보기 {'있음' if soffice else '없음'})")
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--docx", required=True)
    ap.add_argument("--xlsx")
    ap.add_argument("--reports")
    ap.add_argument("--out", required=True)
    ap.add_argument("--password", default=os.environ.get("WP_PASSWORD"),
                    help="대외비 열람 암호 (또는 환경변수 WP_PASSWORD). 주면 공개용(대외비 암호화) 빌드")
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
        # 사례집에서 내려받을 시공완료보고서 원본 PDF
        (out / "rep" / "pdf").mkdir(parents=True, exist_ok=True)
        for i, r in enumerate(data["reports"]):
            src = Path(a.reports) / r["file"]
            dst = out / "rep" / "pdf" / f"report-{i + 1}.pdf"
            shutil.copyfile(src, dst)
            name = re.sub(r"\(주\)|\(유\)|[㈜()\s]", "", r.get("site") or f"현장{i + 1}") + "_시공완료보고서.pdf"
            r["pdf"] = {"src": f"rep/pdf/report-{i + 1}.pdf", "name": name, "size": dst.stat().st_size, "submitted": r.get("submitted")}
    data["built"] = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    forms = make_forms(data, out)
    if forms:
        data["forms"] = forms
        if not a.password:
            # Artifact 본은 Word 파일을 실을 수 없어 공개 사이트의 양식 화면으로 연결한다
            for f in forms["forms"] + [forms["all"]]:
                (out / f["src"]).unlink(missing_ok=True)
                f["external"] = f"{PUBLIC_URL}/#forms"
    if not a.password and data.get("reports"):
        # Artifact(사내 전체본)는 ZIP을 실을 수 없어 공개 사이트의 같은 현장으로 연결한다
        for i, r in enumerate(data["reports"]):
            z = r.get("photo_zip")
            if z:
                (out / z["src"]).unlink(missing_ok=True)
                z["external"] = f"{PUBLIC_URL}/#case-{i + 1}"
    all_chars = set(json.dumps(data, ensure_ascii=False))  # 대외비 해제 후 보일 글자까지 글꼴에 남긴다
    if a.password:
        sys.path.insert(0, str(BUILD))
        from protect import protect
        data, hidden = protect(data, a.password, out)
        if forms:
            data["forms"] = forms  # 양식에는 대외비가 없어 공개본에 그대로 싣는다
        for src in hidden:
            (out / src).unlink(missing_ok=True)
        print(f"공개용 빌드: 대외비 암호화, 공개 폴더에서 뺀 사진 {len(hidden)}장")

    font_src = SITE / "fonts" / "PretendardVariable.woff2"
    blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = (SITE / "index.template.html").read_text(encoding="utf-8")
    html = html.replace("/*__STYLE__*/", (SITE / "style.css").read_text(encoding="utf-8"))
    html = html.replace("/*__DATA__*/", blob)
    html = html.replace("/*__APP__*/", "\n".join((SITE / f).read_text(encoding="utf-8") for f in ("scene3d.js", "app.js")))
    # 3D 렌더 이미지 (일반 장면, 저장소에 포함)
    if (SITE / "3d").is_dir():
        shutil.copytree(SITE / "3d", out / "3d")
    if a.password:
        # 일반 웹 호스팅용: 완전한 HTML 문서로 감싼다 (Artifact는 자체 골격을 붙이므로 감싸지 않음)
        head, body = html.split("</style>", 1)
        html = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                + head + "</style>\n</head>\n<body>\n" + body + "\n</body>\n</html>\n")
    (out / "index.html").write_text(html, encoding="utf-8")
    # Pretendard: 페이지에 실제로 쓰인 글자만 남겨 용량을 줄인다 (fontTools 없으면 전체 파일)
    (out / "fonts").mkdir(exist_ok=True)
    try:
        from fontTools import subset
        chars = set(html) | all_chars | set(chr(c) for c in range(32, 127)) | set("₂·→←↑↓…“”‘’「」《》〔〕【】★✎✓✕※")
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        font = subset.load_font(str(font_src), opts)
        sub = subset.Subsetter(opts)
        sub.populate(text="".join(chars))
        sub.subset(font)
        subset.save_font(font, str(out / "fonts" / "pretendard.woff2"), opts)
    except ImportError:
        shutil.copyfile(font_src, out / "fonts" / "pretendard.woff2")
    # 글꼴은 페이지 안에 넣는다 (파일로 두면 로컬 열기 · 일부 호스트에서 CORS로 막힘)
    font_b64 = base64.b64encode((out / "fonts" / "pretendard.woff2").read_bytes()).decode()
    html = html.replace('url("fonts/pretendard.woff2") format("woff2-variations"), url("fonts/pretendard.woff2") format("woff2")',
                        f'url(data:font/woff2;base64,{font_b64}) format("woff2")')
    html = html.replace('<link rel="preload" href="fonts/pretendard.woff2" as="font" type="font/woff2" crossorigin>\n', "")
    (out / "index.html").write_text(html, encoding="utf-8")
    shutil.rmtree(out / "fonts")
    for f in ("whitepaper.json", "cost.json", "reports.json"):
        (out / f).unlink(missing_ok=True)

    files = [p for p in out.rglob("*") if p.is_file()]
    size = sum(p.stat().st_size for p in files)
    print(f"완료: {out}/index.html ({(out / 'index.html').stat().st_size / 1e6:.1f}MB), 파일 {len(files)}개, 합계 {size / 1e6:.1f}MB")


if __name__ == "__main__":
    main()
