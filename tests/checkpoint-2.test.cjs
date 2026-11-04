const {test} = require('node:test');
const assert = require('node:assert/strict');
const analysis = require('../phishing-defender/analysis.js');
const context = require('../phishing-defender/context.js');
const cases = require('../phishing-defender/scenarios.js');
const {evaluate} = require('../phishing-defender/evaluation.js');

test('부정 조건을 예방 안내로 잘못 낮추지 않음', () => {
  assert.equal(analysis.analyze('인증번호를 입력하지 않으면 계정 정지입니다.').signalLevel,'risk');
});
test('금지 안내 뒤 별도 정보 요청은 여전히 위험 신호', () => {
  assert.equal(analysis.analyze('비밀번호를 보내지 마세요. 대신 인증번호를 알려주세요.').signalLevel,'risk');
});
test('같은 문장 안의 다른 정보에 대한 금지 문구로 요청을 숨기지 못함', () => {
  assert.equal(analysis.analyze('인증번호를 보내고 비밀번호는 알려주지 마세요.').signalLevel,'risk');
});
test('영문 예방 문구 뒤의 다른 행동 요구도 별도로 검사', () => {
  assert.equal(analysis.analyze('Do not share your password but enter your verification code here.').signalLevel,'risk');
});
test('예방 안내와 송금 완료는 구분하지만 안전 판정은 없음', () => {
  for (const text of ['비밀번호 입력 금지입니다.','카드 결제가 완료되었습니다.','Never share your password.']) {
    assert.equal(analysis.analyze(text).signalLevel,'review',text);
  }
});
test('압박 단어만으로 위험 신호가 되지 않고 링크 안 키워드는 행동 요구가 아님', () => {
  assert.equal(analysis.analyze('긴급 모임 공지: 오늘 안에 준비물을 챙겨주세요.').signalLevel,'review');
  assert.equal(analysis.analyze('https://example.test/password/urgent').hasRequest,false);
});
test('상품권·신분증·원격제어 행동 요청을 새로 감지', () => {
  for (const text of ['상품권을 구매해서 보내줘.','신분증 사진을 보내주세요.','원격제어 앱 설치를 진행하세요.']) assert.equal(analysis.analyze(text).signalLevel,'risk',text);
});
test('긍정적인 상황 답변으로 기존 위험 신호를 낮추지 않음', () => {
  const r=context.assess('delivery',{expected:'yes',verified:'yes',sensitive:'no'},analysis.analyze('카드 정보를 입력하세요.'));
  assert.equal(r.level,'risk');
  assert.equal(r.complete,true);
  assert.equal(r.reasons.length,0);
});
test('모름·누락을 안전으로 취급하지 않음', () => {
  const r=context.assess('delivery',{expected:'unknown',verified:'unknown',sensitive:'unknown'},analysis.analyze('배송 안내'));
  assert.equal(r.level,'review');assert.equal(r.unknown,3);
  assert.equal(context.assess('delivery',{},analysis.analyze('배송 안내')).complete,false);
});
test('같은 문장이라도 상황 답변의 위험 징후는 근거와 함께 반영', () => {
  const r=context.assess('family',{verified:'no',newnumber:'yes',sensitive:'yes'},analysis.analyze('연락 부탁해'));
  assert.equal(r.level,'risk');assert.equal(r.reasons.length,3);
});
test('6개 유형 질문은 고유하며 유효한 공식 경로만 사용', () => {
  const hosts=new Set(['www.kisa.or.kr','www.epost.go.kr','www.police.go.kr']);
  assert.equal(Object.keys(context.types).length,6);
  for(const type of Object.values(context.types)) {
    assert.equal(type.questions.length,3);
    assert.equal(new Set(type.questions.map(q=>q.id)).size,3);
    for(const key of type.routes) {
      const url=new URL(context.routes[key].url);
      assert.equal(url.protocol,'https:');assert.ok(hosts.has(url.hostname));assert.equal(url.search,'');
    }
  }
});
test('유형 제안은 가족·기관 맥락을 우선하며 모르는 메시지는 기타',()=>{
  assert.equal(context.suggestType('엄마 계좌로 송금해'),'family');
  assert.equal(context.suggestType('경찰 안전계좌 이체'),'authority');
  assert.equal(context.suggestType('배송 카드 정보'),'delivery');
  assert.equal(context.suggestType('수고하세요'),'other');
});
test('30개 가상 사례는 고유 ID와 유형별 10개를 가지며 입력 순서대로 비교',()=>{
  assert.equal(cases.length,30);assert.equal(new Set(cases.map(c=>c.id)).size,30);
  for(const category of ['normal','phishing','ambiguous'])assert.equal(cases.filter(c=>c.category===category).length,10);
  const r=evaluate(cases);assert.equal(r.total,30);assert.equal(r.rows[0].id,cases[0].id);
  for(const variant of ['baseline','current']) {
    assert.equal(r[variant].normal,10);assert.equal(r[variant].phishing,10);assert.equal(r[variant].ambiguous,10);
  }
});
test('애매한 사례는 정상 오탐·피싱 누락의 분모에서 제외',()=>{
  const r=evaluate(cases.filter(c=>c.category==='ambiguous'));
  assert.equal(r.current.normal,0);assert.equal(r.current.phishing,0);assert.equal(r.current.ambiguous,10);
});
test('개발 사례에서 놓치는 피싱도 숨기지 않음',()=>{
  const r=evaluate(cases);
  assert.ok(r.rows.some(row=>row.category==='phishing'&&row.after==='review'));
});
