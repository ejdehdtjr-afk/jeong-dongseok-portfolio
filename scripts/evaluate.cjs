const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../phishing-defender');
const {evaluate} = require(path.join(root,'evaluation.js'));
const cases = require(path.join(root,'scenarios.js'));
const result = evaluate(cases);
fs.writeFileSync(path.join(root,'evaluation-results.json'),JSON.stringify(result,null,2)+'\n');
const a=result.baseline,b=result.current;
const lines=[
  '# 중간 점검 2차 — 가상 사례 30개 비교 기록',
  '',
  '- 작성일: 2026-11-04 (한국 시간)',
  '- 실행: 저장소 루트에서 `npm run evaluate`',
  '- 자료: AI가 개발·확인을 위해 작성한 가상 메시지. 정상·피싱·애매한 사례 각 10개.',
  '- 1차 기준: commit `2a666164d1d124a921f47821c21f7e18de025e1b`의 analysis.js 로직을 analysis-v1.js로 보존. 브라우저 전역 이름만 PDAnalysisV1로 바꿈.',
  '- 2차 기준: 현재 analysis.js. 상황 답변·가상 분류 라벨을 분석기에 입력하지 않고 동일한 텍스트만 비교.',
  '- 독립적인 평가 자료·무작위 표본·실제 피해 사례가 아니다. 개발에 사용한 사례이므로 실제 탐지 성능으로 일반화하지 않는다.',
  '',
  '| 항목 | 1차 | 2차 |',
  '|---|---:|---:|',
  `| 정상 문장의 위험 신호 표시(오탐) | ${a.falseAlarms}/${a.normal} | ${b.falseAlarms}/${b.normal} |`,
  `| 피싱 문장을 확인 필요로 남김(누락) | ${a.missed}/${a.phishing} | ${b.missed}/${b.phishing} |`,
  `| 애매한 문장의 위험 신호 표시(참고) | ${a.ambiguousFlagged}/${a.ambiguous} | ${b.ambiguousFlagged}/${b.ambiguous} |`,
  `| 전체 확인 필요 표시 | ${a.review}/${result.total} | ${b.review}/${result.total} |`,
  '',
  '오탐은 정상 가상 문장에 위험 신호를 표시한 경우, 누락은 피싱 가상 문장에 위험 신호를 표시하지 못한 경우다. 애매한 10개는 오탐·누락의 분모에서 제외했다. 확인 필요는 안전 판정이 아니다.',
  '',
  '## 남은 누락 사례',
  '',
  ...result.rows.filter(r=>r.category==='phishing'&&r.after==='review').map(r=>`- ${r.id}: ${r.text}`),
  '',
  '완곡한 인증정보 요구와 겉보기에 평범한 HTTPS 링크처럼 알려진 단어·형식에 걸리지 않는 메시지를 놓친다. 이를 숨기지 않고 비교 화면의 누락 필터로 확인하게 했다.',
  '',
  '## 전체 사례별 결과',
  '',
  '| ID | 가상 분류 | 1차 | 2차 |',
  '|---|---|---|---|',
  ...result.rows.map(r=>`| ${r.id} | ${r.category} | ${r.before} | ${r.after} |`),
  '',
  '원문과 세부 신호는 scenarios.js·evaluation-results.json 및 validation.html에서 확인할 수 있다. 실제 사용자 효과·탐지 정확도 향상을 입증한 결과로 제출하지 않는다.',
];
fs.writeFileSync(path.join(root,'EVALUATION-2.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({total:result.total,baseline:a,current:b},null,2));
