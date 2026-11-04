const {test} = require('node:test');
const assert = require('node:assert/strict');
const response = require('../phishing-defender/response.js');
const reports = require('../phishing-defender/reports.js');

test('이미 한 행동을 여러 개 고르면 송금 대응이 먼저 나온다', () => {
  const result = response.guide(['opened','installed','paid']);
  assert.deepEqual(result.ids,['paid','installed','opened']);
  assert.match(result.steps[0].text,/112/);
  assert.equal(result.urgent,true);
  assert.equal(response.guide([]).urgent,false);
});
test('공유 요약에 원문·URL·전화번호·계좌번호가 복사되지 않는다', () => {
  const message = '홍길동 010-1234-5678 https://bad.example/path 계좌 123-456-789012';
  const result = response.summary({
    message, selected:['paid'],
    analysis:{links:[{host:'private.bad.example'}],riskReasons:['의심 링크 형식']},
    assessment:{reasons:['기존 연락처로 확인하지 못함']}
  });
  for (const secret of ['홍길동','010-1234-5678','bad.example','123-456-789012']) assert.ok(!result.includes(secret));
  assert.match(result,/112/);
  assert.match(result,/원문·스크린샷·답변은 포함하지 않음/);
});
test('신고는 전화 형식과 글 길이를 확인하고 상태 이름을 검토 단계별로 구분한다', () => {
  assert.equal(reports.validReport('suspicious','의심스러운 통화가 있었습니다','010-1234-5678'),true);
  assert.equal(reports.validReport('suspicious','짧음','010-1234-5678'),false);
  assert.equal(reports.validPhone('12345'),false);
  assert.match(reports.labels.received,/사실 확인 전/);
  assert.notEqual(reports.labels.received,reports.labels.verified);
  assert.match(reports.correctionLabels.pending,/검토 전/);
});
