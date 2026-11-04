# 피디(P.D.) — 프리미엄 최종 과제

의심 문자·메신저를 스크린샷 또는 텍스트로 점검하고, 상황별 질문과 공식 확인 경로를 제공한다. 이미 링크를 눌렀거나 정보 제공·앱 설치·송금을 했다면 첫 화면에서 바로 대응 순서를 볼 수 있다.

- [공개 앱](https://ejdehdtjr-afk.github.io/jeong-dongseok-portfolio/phishing-defender/)
- [1차·2차 가상 사례 비교](https://ejdehdtjr-afk.github.io/jeong-dongseok-portfolio/phishing-defender/validation.html)
- [최종 계획서](plan.md) · [최종 제출 입력 문구](SUBMISSION-3.md) · [검증 기록](VERIFICATION-3.md)
- 이전 제출: [1차](SUBMISSION-1.md), [2차](SUBMISSION-2.md), [2차 계획](plan-v2.md)

## 실행

저장소 루트에서 `npm ci`, `npm test`, `npm run preview`를 실행한다. 미리보기는 http://127.0.0.1:4173/phishing-defender/ 이다. OCR 파일은 `vendor/`에 포함돼 있다.

## 신고 기능 설정

3차 신고 상태·정정은 [SQL 변경안](sql/001_report_lifecycle.sql)을 기존 Supabase 프로젝트의 SQL Editor에서 관리자가 실행해야 동작한다. 적용 전 화면은 제보 접수를 비활성화하고 미연결 상태를 알린다. 기존 `submit_phone_report` 함수와 신고 데이터는 변경하지 않는다. 새 제보는 접수 상태로 시작하고, 제보자에게는 조회 코드로 상태·정정 요청만 허용한다. 운영자 검증 상태는 SQL Editor에서 별도로 바꾼다. 공개 운영 전에 신고 글 보존 기간·관리자 검토·남용 방지 정책을 확정한다.

## 한계

키워드·일부 문형 기반 보조 도구로 발신자·피싱 여부를 확정하지 않는다. 링크 최종 이동 주소와 악성코드를 검사하지 않는다. 원문 제외 요약도 공유 전 직접 확인해야 한다. 가상 30개 비교는 AI가 개발용으로 만든 사례이며 독립적인 탐지 성능 평가가 아니다. 실제 개인정보나 피해 번호로 테스트하지 않는다.

## 구성요소

Tesseract.js 6.0.1, 관련 코어와 한국어·영어 학습 파일을 사용한다. 라이선스·출처는 `vendor/THIRD-PARTY.md`를 참조한다. 공식 확인 경로는 `context.js`에 고정하고 확인일을 표시한다.
