# 피디(P.D.) — 프리미엄 중간 점검 2차

1차의 스크린샷 OCR·원문 강조·호스트 표시에 이어, 6개 유형별 추가 질문과 답변 반영·고정 공식 경로·일부 예방 문구 구분·가상 사례 30개 비교 화면을 구현했다.

- [공개 앱](https://ejdehdtjr-afk.github.io/jeong-dongseok-portfolio/phishing-defender/)
- [1차·2차 비교 화면](https://ejdehdtjr-afk.github.io/jeong-dongseok-portfolio/phishing-defender/validation.html)
- [계획서 v2](plan.md) · [1차 계획 보관본](plan-v1.md)
- [2차 제출 문구](SUBMISSION-2.md) · [검증 기록](VERIFICATION-2.md) · [가상 비교 기록](EVALUATION-2.md)
- [목표 입력 문구](목표-입력문구-2차.md) · [제출 순서](제출-순서-2차.md)
- [1차 제출 문구](SUBMISSION-1.md) · [1차 검증 기록](VERIFICATION-1.md)

## 실행

저장소 루트에서 `npm ci`, `npm test`, `npm run evaluate`, `npm run preview`를 사용한다. 미리보기는 http://127.0.0.1:4173/phishing-defender/ 이다. 정적 배포용 OCR 파일은 vendor에 포함하며 재생성은 `npm run vendor:ocr`다. file:// 대신 HTTP·HTTPS로 연다.

## 분석 범위

키워드·일부 문형 기반 보조 도구다. 6개 유형은 발신자를 식별한 결과가 아닌 수정 가능한 제안이다. 모름·유리한 상황 답변을 안전의 증거로 쓰지 않는다. 링크의 최종 이동·기관 소유권·악성코드를 검사하지 않는다.

가상 30개 비교는 AI가 개발용으로 만든 사례이며 독립 평가가 아니다. 정상 위험 표시 7→0, 피싱 누락 5→2의 변경을 재현하지만 일반적인 탐지 성능으로 해석하면 안 된다. 남은 누락 P08·P09를 비교 화면에서 확인할 수 있다. 1차 분석은 2a66616에서 고정했다.

## 개인정보

메시지·이미지·질문 답변은 브라우저에서 처리하고 저장·외부 AI 전송을 추가하지 않는다. OCR 도구·학습 파일은 같은 사이트에서 받는다. 기존 전화번호 신고 저장은 별도 Supabase 기능이다. 실제 개인정보·비밀번호·인증번호로 실험하지 않는다.

## 다음 범위

이미 링크를 누르거나 정보 입력·앱 설치·송금을 한 상황의 상세 대응 안내, 개인정보를 가린 결과 요약은 최종 단계이며 아직 구현하지 않았다.

## 외부 구성요소

Tesseract.js 6.0.1과 tesseract.js-core·한국어/영어 학습 데이터를 사용한다. 라이선스와 출처는 vendor/THIRD-PARTY.md를 참조한다. 공식 확인 경로는 context.js에 고정하고 확인일·기관별 적용 범위를 표시한다.
