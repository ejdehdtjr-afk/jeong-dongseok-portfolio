# 피디(P.D.) — 프리미엄 중간 점검 1차

기존 마지막 B 과제의 5단계 피싱 점검 웹앱에 스크린샷 입력·한국어/영어 글자 인식·인식 결과 수정·원문 강조·실제 호스트 표시를 추가했다. 이번 범위는 중간 점검 1차까지다.

- 결과물: https://ejdehdtjr-afk.github.io/jeong-dongseok-portfolio/phishing-defender/
- [1차 계획서](plan.md)
- [프로젝트 목표 화면 입력 문구](목표-입력문구.md)
- [1차 중간 점검 제출 문구](SUBMISSION-1.md)
- [검증 결과와 한계](VERIFICATION-1.md)
- [가상 문자 이미지](examples/delivery-demo.png)

## 실행과 검증

저장소 루트에서 `npm ci`, `npm test`, `npm run preview`를 실행한다. 미리보기는 http://127.0.0.1:4173/phishing-defender/ 이다. 정적 배포에 필요한 OCR 파일은 vendor 폴더에 포함되어 있으며 다시 만들 때는 `npm run vendor:ocr`를 사용한다. file:// 대신 HTTP 또는 HTTPS에서 실행한다.

## 개인정보와 기능 범위

메시지·이미지는 브라우저에서 분석하며 앱 서버에 전송하거나 저장하지 않는다. OCR 도구·언어 파일은 같은 사이트에서 내려받는다. 첫 사용은 다운로드와 처리에 시간이 걸리며 OCR은 오인식할 수 있으므로 원본 대조·수정 후 분석한다.

전화번호 신고 저장은 별도 기존 기능이다. 사용자가 신고 저장 버튼을 누르면 번호·분류·신고 글이 Supabase에 저장된다. 개인정보·비밀번호·인증번호가 포함된 자료로 실험하지 않는다.

자동 확인은 단어·주소 형식 기반 보조 기능이며 피싱 확정 판정이 아니다. HTTPS·신고 없음·신호 미검출도 안전을 보장하지 않는다. 2차의 상황 질문·공식 확인 경로와 최종의 행동별 대응은 아직 구현하지 않았다.

## 외부 구성요소

Tesseract.js 6.0.1 (Apache-2.0), tesseract.js-core (Apache-2.0), @tesseract.js-data/kor·eng 1.0.0 패키지를 사용한다. 관련 라이선스·출처는 vendor/THIRD-PARTY.md 및 동봉 파일에 기록했다.
