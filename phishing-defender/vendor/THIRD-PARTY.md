# OCR 구성요소와 출처

- Tesseract.js 6.0.1: https://github.com/naptha/tesseract.js — Apache-2.0. TESSERACT-LICENSE.md 동봉.
- tesseract.js-core 6.1.2: https://github.com/naptha/tesseract.js-core — Apache-2.0. CORE-LICENSE 동봉. 정확한 설치 의존성은 저장소 package-lock.json 참조.
- @tesseract.js-data/kor·eng 1.0.0: https://github.com/naptha/tessdata — npm 패키지는 MIT 표기. 학습 데이터 upstream: https://github.com/tesseract-ocr/tessdata_best (Apache-2.0).
- 언어 데이터는 각 패키지의 4.0.0_best_int 폴더에서 가져왔다.

자체 이미지·메시지를 외부 OCR API로 보내지 않도록 실행 파일·학습 데이터를 같은 사이트에서 제공한다. 원본·권리 표기는 이 문서와 라이선스 파일에 보존한다.

