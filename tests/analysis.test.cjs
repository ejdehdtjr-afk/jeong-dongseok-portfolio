const {test} = require('node:test');
const assert = require('node:assert/strict');
const {analyze, highlight, inspectLink} = require('../phishing-defender/analysis.js');

test('기관명을 넣은 하위도메인과 @ 사용자정보에 속지 않고 실제 호스트 표시', () => {
  assert.equal(inspectLink('https://bank.example.attacker.test/login').host, 'bank.example.attacker.test');
  const link = inspectLink('https://bank.example@attacker.test/login');
  assert.equal(link.host, 'attacker.test');
  assert.ok(link.reasons.some((reason) => reason.includes('@')));
});
test('HTTP, IP, 단축주소, 국제화 도메인 이유 구분', () => {
  for (const value of ['http://site.test/', 'https://127.0.0.1/', 'https://bit.ly/abc', 'https://xn--pple-43d.test/']) {
    assert.ok(inspectLink(value).reasons.length, value);
  }
  assert.equal(inspectLink('https://bit.ly.evil.test/').reasons.length, 0);
});
test('HTTPS 일반주소는 안전 판정 없이 형식 신호만 반환', () => {
  assert.deepEqual(inspectLink('https://example.test/').reasons, []);
});
test('한국어·영어 표현과 여러 링크·끝 문장부호 처리', () => {
  const result = analyze('지금 인증번호 입력. URGENT password https://example.test/a).\nwww.example.org/path');
  assert.ok(result.hasRequest && result.hasUrgency);
  assert.equal(result.links.length, 2);
  assert.equal(result.links[0].raw, 'https://example.test/a');
  assert.equal(result.links[1].host, 'www.example.org');
});
test('HTML 입력은 강조 표시에서도 실행 가능한 마크업이 되지 않음', () => {
  const text = '<img src=x onerror=alert(1)> 지금 인증번호';
  const html = highlight(text, analyze(text).spans);
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('<mark'));
});
test('링크 안 키워드와 겹쳐도 강조 원문 내용이 손실되지 않음', () => {
  const text = 'https://example.test/password 지금 지금';
  const html = highlight(text, analyze(text).spans);
  assert.equal(html.replace(/<[^>]*>/g, ''), text);
});
test('빈 입력·신호 없는 문장·해석 불가능 주소도 예외 없이 처리', () => {
  assert.deepEqual(analyze('').links, []);
  assert.deepEqual(analyze('금요일 모임입니다.').spans, []);
  assert.equal(inspectLink('http://[').valid, false);
});
test('예방 안내 문구도 단순 규칙 한계로 검출되며 확정 판정 값은 없음', () => {
  const result = analyze('인증번호를 절대 알려주지 마세요.');
  assert.equal(result.hasRequest, true);
  assert.equal(result.verdict, undefined);
});
