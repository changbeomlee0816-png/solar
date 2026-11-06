# CLAUDE.md — 태양광 백서 웹 업데이트 절차

## 배포 대상
- Artifact URL: https://claude.ai/artifact/LhNbDu4kexq28L5cVSEcsX (title: 태양광 사업관리 백서)
- 항상 이 URL로 다시 배포한다 (Artifact publish 시 `url`에 위 주소를 넣는다. 새 Artifact를 만들지 않는다).
- 다른 대화에서 배포할 때는 먼저 `action: "read"`로 위 URL을 읽은 뒤 publish 한다.

## 업데이트 순서
1. 사용자가 올린 새 자료를 스크래치 폴더(또는 `source/`)에 둔다. 보고서는 한 폴더에 PDF로 모은다.
2. 빌드:
   `python3 -I build/build_site.py --docx <백서.docx> --xlsx <원가관리툴.xlsx> --reports <보고서폴더> --out <스크래치>/dist`
   - 출력 로그의 장 수 · 이미지 수 · 버전이 예상과 맞는지 확인한다.
3. Playwright로 `#home`, `#wp`, `#cases`, `#cost`를 열어 콘솔 오류가 없는지 확인한다.
4. 배포: Artifact publish
   - `file_path`: `<dist>/index.html`, `root`: `<dist>`, `files`: `img/*`, `rep/*` 전부 (경로 목록)
   - `url`: 위 Artifact URL, `label`: 백서 버전 (예: "v1.3 반영")
   - 255개 파일 제한을 넘으면 여러 번 나눠 publish 한다.
5. 코드 변경이 있으면 커밋 · 푸시한다. **원본 자료와 dist는 절대 커밋하지 않는다 (공개 저장소, 대외비 자료).**

## 변환 규칙 메모
- 백서 docx에는 Word 스타일이 없다. 글자 크기로 구분: 32pt 제목, 14pt "PART n", 26pt 파트 제목, 17pt 장, 12.5pt 절(`n.n 제목`), 10.5pt 굵게 소제목, 8.5pt 회색 ✎ 작성가이드 / 그림 캡션.
- 단일 셀 표 = 강조 박스(이 장의 핵심, 교훈, ★, 대외비). 사진이 든 표 = 갤러리.
- 홈 · 사례집은 표 머리글로 표를 찾는다 (예: 3장 "단계", 10장 "No/일자", 2장 "구분/자가소비"). 머리글 이름이 바뀌면 `site/app.js`의 `findTable` 호출을 맞춘다.
- 원가 계산은 `site/app.js`의 `computeCost`가 엑셀 산식을 재현한다 (판정: 과다 > 30%, 상회 > 마진 15%, 하회 < -10%; 적정 노무비 = 직접노무비 × (1 + 간접 9% + 사회보험 10% + 공구손료 3%); 1인 공수: 실작업 4.5h 이하 0.5, 8h 초과분 1.5배).
