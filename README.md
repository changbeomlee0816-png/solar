# 태양광 사업관리 백서 — 웹 프로그램

㈜유호스트 태양광 TF의 「태양광 사업관리 백서」를 사내 인원이 보기 쉬운 웹 화면으로 바꾸는 빌드 도구입니다.

- **배포 주소 (고정 링크):** https://claude.ai/artifact/LhNbDu4kexq28L5cVSEcsX
  - 비공개 Artifact입니다. 페이지의 **Share** 메뉴에서 공유할 사람을 지정해야 다른 인원이 열 수 있습니다.
  - 백서를 고쳐 다시 빌드 · 배포해도 **같은 링크**가 유지됩니다.

## 화면 구성

| 화면 | 주소 | 내용 | 데이터 출처 |
|---|---|---|---|
| 개요 | `#home` | 전기 흐름 · 사업 유형 · 10단계 흐름 · 시공 공정 애니메이션, 용량 계산기, 준공 현장 카드 | 백서 1~4장, 10장, 21.5 |
| 백서 | `#wp`, `#ch7`, `#s21-6` … | 전체 본문 리더 (목차 · 검색 · 절 목차 · 사진 확대 · 작성가이드/대외비 표시 전환) | 백서 .docx 전체 |
| 사례집 | `#cases`, `#case-1` … | 준공 현장 비교, 현장별 공정 · 사업비 · 월별 발전 · 사용전검사 · 사진대지, 7장 현장별 분석, 이슈 레지스터 필터 | 시공완료보고서 PDF + 백서 7 · 10장 |
| 원가 분석 | `#cost` | 항목별 시장 기준 대비 판정, 노무비 실투입 분석, 기준단가 · 인원 일지 편집 시 즉시 재계산, 새 견적 빠른 검토 | 원가관리 툴 .xlsx + 백서 21장 |

화면의 표 · 문구는 원본 파일에서 자동으로 뽑아 오므로, **백서에 내용을 추가하고 다시 빌드하면 웹도 같이 바뀝니다.**
(장 · 절 구분은 백서의 글자 크기 규칙을 따릅니다: 장 17pt, 절 12.5pt, 소제목 10.5pt 굵게, ✎ 작성가이드 8.5pt.)

## 업데이트 방법

### Claude에게 맡기기 (권장)
Claude Code 세션에서 이 저장소를 열고 새 백서(.docx) · 원가 툴(.xlsx) · 보고서(PDF)를 올린 뒤
"백서 웹 업데이트해줘"라고 하면 됩니다. `CLAUDE.md`에 절차와 배포 주소가 적혀 있어 같은 링크로 다시 배포합니다.

### 직접 빌드하기
```bash
pip install python-docx openpyxl pillow   # poppler-utils(pdftotext, pdfimages)도 필요
```
```bash
python3 -I build/build_site.py --docx source/백서.docx --xlsx source/원가관리툴.xlsx --reports source/reports --out dist
```
`dist/index.html`과 `dist/img/`, `dist/rep/`가 만들어집니다. 브라우저로 `dist/index.html`을 열어 확인할 수 있습니다.

## 보안

- 이 저장소는 **공개 저장소**입니다. 백서 · 원가 툴 · 보고서 원본과 빌드 결과(`dist/`)는 `.gitignore`로 제외되어 커밋되지 않습니다.
- 보고서 변환기는 FEMS 접속 아이디 · 비밀번호, 사업자등록번호 같은 항목을 읽지 않습니다.
- 백서의 '대외비' 박스는 백서 화면 왼쪽 아래 옵션으로 숨길 수 있습니다 (외부 설명용).

## 폴더

```
build/convert_docx.py     백서 .docx → 구조화 JSON + 이미지
build/convert_xlsx.py     원가관리 툴 .xlsx → 입력값 JSON (계산은 화면에서 재현)
build/convert_reports.py  시공완료보고서 PDF → 핵심 수치 · 공정 · 사진
build/build_site.py       위 세 개를 돌려 dist/index.html 하나로 묶음
site/                     화면 코드 (index.template.html, style.css, app.js)
source/                   원본 자료 두는 곳 (git 제외)
```
