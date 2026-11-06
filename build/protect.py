"""공개용 데이터 만들기: 대외비를 지우고, 원본 전체는 암호로 암호화해 함께 싣는다.

- 대외비 판정
  · 장 단위: 제목이 LOCK_CHAPTERS 에 걸리는 장 (원가 · 계약 · 시공사 비교 · 협력사 평가)
  · 블록 단위: 글에 '대외비'가 들어간 문단 · 박스 · 목록 항목 · 표의 행
  · 원가 분석 데이터 전체, 시공완료보고서의 금액 항목(계약금액 · 재원 · 공종별 사업비)
- 지운 자리에는 '잠김' 표시만 남는다. 공개 파일 어디에도 원문이 없다.
- 암호화: PBKDF2-SHA256(310,000회) → AES-256-GCM, 내용은 gzip 압축. 브라우저 WebCrypto로 푼다.
"""
import base64
import copy
import gzip
import json
import os
import re
from pathlib import Path

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

KEYWORD = "대외비"
LOCK_CHAPTERS = re.compile(r"원가 관리|계약 관리|시공사 비교|협력사")
ITER = 310_000
LOCK_HTML = '<span class="lockph">대외비 — 암호를 입력하면 보입니다</span>'
REPORT_SECRET = ("contract_amount", "funding", "cost_breakdown")


def has_secret(obj):
    return KEYWORD in json.dumps(obj, ensure_ascii=False)


def redact_block(b):
    if not has_secret(b):
        return b
    t = b.get("t")
    if t == "ul":
        return {**b, "items": [LOCK_HTML if KEYWORD in x else x for x in b["items"]]}
    if t == "table":
        rows = []
        for r in b["rows"]:
            if has_secret(r):
                span = sum(c.get("cs", 1) for c in r)
                rows.append([{"html": LOCK_HTML, "cs": span, "rs": 1, "k": None}])
            else:
                rows.append(r)
        return {**b, "rows": rows}
    if t == "callout" and KEYWORD not in (b.get("title") or ""):
        return {**b, "c": [({"t": c["t"], "html": LOCK_HTML} if has_secret(c) else c) for c in b["c"]]}
    return {"t": "locked", "what": "callout" if t == "callout" else "block"}


def redact_wp(wp):
    pub = copy.deepcopy(wp)
    pub["meta"]["revisions"] = [r for r in pub["meta"].get("revisions", []) if not has_secret(r)]
    for p in pub["parts"]:
        for c in p["chapters"]:
            if LOCK_CHAPTERS.search(c["title"]):
                c["locked"] = True
                c["blocks"] = [{"t": "locked", "what": "chapter"}]
                c["sections"] = []
            else:
                out, in_secret = [], False
                for b in c["blocks"]:
                    if b["t"] == "h3":
                        in_secret = KEYWORD in b["text"]
                        if in_secret:
                            b = {**b, "text": re.sub(r"\s*\(?대외비\)?", "", b["text"]) + " (잠김)"}
                            out += [b, {"t": "locked", "what": "section"}]
                            continue
                    if not in_secret:
                        out.append(redact_block(b))
                c["blocks"] = out
                c["sections"] = [{"id": b["id"], "text": b["text"]} for b in out if b["t"] == "h3"]
    return pub


def image_srcs(obj):
    return set(re.findall(r'(?:img|rep)/[\w.-]+\.(?:jpg|png)', json.dumps(obj, ensure_ascii=False)))


def inline_images(obj, srcs, root):
    s = json.dumps(obj, ensure_ascii=False)
    for src in srcs:
        data = (root / src).read_bytes()
        mime = "image/png" if src.endswith(".png") else "image/jpeg"
        s = s.replace(src, f"data:{mime};base64," + base64.b64encode(data).decode())
    return json.loads(s)


def b64(x):
    return base64.b64encode(x).decode()


def derive(password, salt):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(password.encode("utf-8"))


def encrypt(obj, key, salt):
    raw = gzip.compress(json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 9)
    iv = os.urandom(12)
    ct = AESGCM(key).encrypt(iv, raw, None)
    return {"v": 1, "iter": ITER, "salt": b64(salt), "iv": b64(iv), "ct": b64(ct)}


def encrypt_pdfs(reports, key, root):
    """시공완료보고서 PDF를 같은 키로 파일 단위 암호화 (rep/pdf/*.bin). 원본 PDF는 공개 폴더에서 지운다."""
    for r in reports or []:
        pdf = r.get("pdf")
        if not pdf or pdf.get("enc"):
            continue
        src = root / pdf["src"]
        iv = os.urandom(12)
        dst = src.with_suffix(".bin")
        dst.write_bytes(AESGCM(key).encrypt(iv, src.read_bytes(), None))
        src.unlink()
        pdf.update({"src": str(dst.relative_to(root)).replace("\\", "/"), "iv": b64(iv), "enc": True})


def protect(data, password, root):
    """data: {wp, cost, reports, built} → (공개 데이터, 숨긴 이미지 목록)"""
    root = Path(root)
    salt = os.urandom(16)
    key = derive(password, salt)
    encrypt_pdfs(data.get("reports"), key, root)
    full = {"wp": data["wp"], "cost": data.get("cost"), "reports": data.get("reports")}
    pub = {"wp": redact_wp(data["wp"]), "cost": None, "built": data.get("built")}
    if data.get("reports") is not None:
        pub["reports"] = [{k: (None if k in REPORT_SECRET else v) for k, v in r.items()} for r in data["reports"]]
    # 공개본에서 빠진 사진은 암호문 안으로 옮긴다
    hidden = image_srcs(full) - image_srcs(pub)
    full = inline_images(full, hidden, root)
    pub["vault"] = encrypt(full, key, salt)
    pub["vault"]["hint"] = "대외비 열람 암호"
    assert KEYWORD not in json.dumps({k: v for k, v in pub.items() if k != "vault"}, ensure_ascii=False).replace("대외비 — 암호를 입력하면 보입니다", "").replace(pub["wp"]["meta"].get("badge", ""), ""), "공개본에 대외비 문구가 남아 있습니다"
    return pub, sorted(hidden)
