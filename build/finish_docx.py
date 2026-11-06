"""docx-js로 만든 양식에 Pretendard 굵게(Bold) 글꼴을 추가로 넣고 마무리한다.

- word/fonts/font2.odttf (난독화한 Bold) + fontTable 의 <w:embedBold>
- 글꼴 서명(w:sig)을 실제 글꼴의 유니코드 · 코드페이지 범위로 맞춤 (한글 지원 표시)
- settings: 글꼴 포함 저장(embedTrueTypeFonts) · 부분 글꼴(saveSubsetFonts) 켜기
- ZIP 폴더 항목 제거

사용: python3 -I build/finish_docx.py <글꼴 폴더> <docx ...>
"""
import re
import sys
import uuid
import zipfile
from pathlib import Path

from fontTools.ttLib import TTFont


def obfuscate(data: bytes, guid: str) -> bytes:
    key = bytes.fromhex(guid.replace("-", ""))[::-1]
    head = bytes(b ^ key[i % 16] for i, b in enumerate(data[:32]))
    return head + data[32:]


def sig_attrs(ttf):
    o = TTFont(str(ttf))["OS/2"]
    h = lambda v: f"{v:08X}"
    return (f'w:usb0="{h(o.ulUnicodeRange1)}" w:usb1="{h(o.ulUnicodeRange2)}" w:usb2="{h(o.ulUnicodeRange3)}" '
            f'w:usb3="{h(o.ulUnicodeRange4)}" w:csb0="{h(o.ulCodePageRange1)}" w:csb1="{h(o.ulCodePageRange2)}"')


def finish(path, bold_bytes, sig):
    src = zipfile.ZipFile(path)
    files = {i.filename: src.read(i.filename) for i in src.infolist() if not i.filename.endswith("/")}
    src.close()
    guid = str(uuid.uuid4())
    ft = files["word/fontTable.xml"].decode("utf-8")
    ft = re.sub(r'<w:sig [^>]*/>', f"<w:sig {sig}/>", ft)
    ft = re.sub(r'w:fontKey="(\{[^"]+\})"', lambda m: f'w:fontKey="{m.group(1).upper()}"', ft)  # ST_Guid 는 대문자
    if "w:embedBold" not in ft:
        ft = re.sub(r'(<w:embedRegular [^>]*/>)', r'\1' + f'<w:embedBold r:id="rIdB1" w:fontKey="{{{guid.upper()}}}"/>', ft, count=1)
        rels = files["word/_rels/fontTable.xml.rels"].decode("utf-8")
        rels = rels.replace("</Relationships>", '<Relationship Id="rIdB1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/fontB1.odttf"/></Relationships>')
        files["word/_rels/fontTable.xml.rels"] = rels.encode("utf-8")
        files["word/fonts/fontB1.odttf"] = obfuscate(bold_bytes, guid)
    files["word/fontTable.xml"] = ft.encode("utf-8")
    st = files["word/settings.xml"].decode("utf-8")
    if "embedTrueTypeFonts" not in st:
        if "<w:displayBackgroundShape/>" in st:
            st = st.replace("<w:displayBackgroundShape/>", "<w:displayBackgroundShape/><w:embedTrueTypeFonts/><w:saveSubsetFonts/>", 1)
        else:
            st = re.sub(r"(<w:settings[^>]*>)", r"\1<w:embedTrueTypeFonts/><w:saveSubsetFonts/>", st, count=1)
    files["word/settings.xml"] = st.encode("utf-8")
    order = ["[Content_Types].xml"] + [k for k in files if k != "[Content_Types].xml"]
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for k in order:
            z.writestr(k, files[k])


def main():
    fonts = Path(sys.argv[1])
    bold = (fonts / "Pretendard-Bold.ttf").read_bytes()
    sig = sig_attrs(fonts / "Pretendard-Regular.ttf")
    for p in sys.argv[2:]:
        finish(p, bold, sig)
    print(f"Word 양식 {len(sys.argv) - 2}개: Pretendard Regular · Bold 포함")


if __name__ == "__main__":
    main()
