"""Word 양식에 넣을 Pretendard 정적 글꼴(TTF) 만들기.

가변 글꼴(site/fonts/PretendardVariable.woff2)에서 Regular(400) · Bold(700)를 뽑고,
KS X 1001 한글 2,350자 + 영문 · 숫자 · 기호 + 양식에 쓰인 글자만 남긴다.
Word 파일에 글꼴을 넣어(임베드) Pretendard가 없는 PC에서도 같은 글씨로 보이게 한다.

사용: python3 -I build/make_docx_fonts.py <출력 폴더> [추가 글자 파일]
"""
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "site" / "fonts" / "PretendardVariable.woff2"


def ksx1001_hangul():
    out = []
    for hi in range(0xB0, 0xC9):
        for lo in range(0xA1, 0xFF):
            try:
                out.append(bytes([hi, lo]).decode("euc-kr"))
            except UnicodeDecodeError:
                pass
    return "".join(out)


def make(weight, style, chars, dst):
    font = TTFont(str(SRC))
    font.flavor = None
    inst = instancer.instantiateVariableFont(font, {"wght": weight})
    opts = subset.Options()
    opts.layout_features = ["kern", "liga", "ccmp", "locl", "tnum"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=chars)
    sub.subset(inst)
    name = inst["name"]
    for rec in list(name.names):
        if rec.nameID in (16, 17, 25):
            name.removeNames(nameID=rec.nameID)
    full = "Pretendard" if style == "Regular" else f"Pretendard {style}"
    for nid, val in ((1, "Pretendard"), (2, style), (3, f"Pretendard-{style};YH"), (4, full), (6, f"Pretendard-{style}")):
        name.setName(val, nid, 3, 1, 0x409)
        name.setName(val, nid, 1, 0, 0)
    os2 = inst["OS/2"]
    os2.usWeightClass = weight
    os2.fsSelection = (os2.fsSelection & ~0b1100001) | (0b100000 if style == "Bold" else 0b1000000)
    inst["head"].macStyle = 1 if style == "Bold" else 0
    os2.fsType = 0  # 설치 가능(임베드 허용) — OFL
    inst.save(str(dst))


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    extra = Path(sys.argv[2]).read_text(encoding="utf-8") if len(sys.argv) > 2 else ""
    chars = ksx1001_hangul() + "".join(chr(c) for c in range(32, 127)) + "".join(chr(c) for c in range(0xA0, 0x180)) \
        + "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ" + "□■☐☑✓✔✕·•…‘’“”–—→←↑↓↔※★☆○●◎◇◆△▲▶▷①②③④⑤⑥⑦⑧⑨⑩㎡㎾㎽㎸℃°±×÷≥≤≠∼〔〕【】「」『』《》〈〉₂²³%" + extra
    make(400, "Regular", chars, out / "Pretendard-Regular.ttf")
    make(700, "Bold", chars, out / "Pretendard-Bold.ttf")
    for f in ("Pretendard-Regular.ttf", "Pretendard-Bold.ttf"):
        print(f, f"{(out / f).stat().st_size / 1e3:.0f}KB")


if __name__ == "__main__":
    main()
