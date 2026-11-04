(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PDAnalysis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const urgency = ['오늘 안', '즉시', '지금', '긴급', '마감', '정지', '보류', '마지막 경고', 'within 24', 'urgent', 'immediately'];
  const requests = ['비밀번호', '인증번호', '인증 코드', '카드 정보', '계좌', '송금', '결제', '주민등록', 'password', 'verification code', 'wire transfer'];
  const shorteners = new Set(['bit.ly', 'tinyurl.com', 'goo.gl', 't.co']);
  const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  function inspectLink(raw) {
    try {
      const url = new URL(/^www\./i.test(raw) ? `https://${raw}` : raw);
      const host = url.hostname.toLowerCase();
      const reasons = [];
      if (url.protocol === 'http:') reasons.push('암호화되지 않은 HTTP 주소');
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.startsWith('[')) reasons.push('숫자 또는 IP 형태의 호스트');
      if (shorteners.has(host)) reasons.push('최종 목적지를 숨기는 단축 주소');
      if (host.split('.').some((part) => part.startsWith('xn--'))) reasons.push('국제화 도메인 인코딩: 눈에 보이는 철자와 비교 필요');
      if (url.username || url.password) reasons.push('@ 앞부분은 사이트 주소가 아닌 사용자 정보');
      return {raw, host, protocol: url.protocol, reasons, valid: true};
    } catch { return {raw, host: '', reasons: ['주소를 해석하지 못함: 원본과 비교 필요'], valid: false}; }
  }
  function analyze(message) {
    const spans = [];
    const links = [];
    for (const match of message.matchAll(/(?:https?:\/\/|www\.)[^\s<>"'\u200b]+/gi)) {
      const raw = match[0].replace(/[),.;!?\]}>。，！？）]+$/u, '');
      links.push(inspectLink(raw));
      spans.push({start: match.index, end: match.index + raw.length, kind: 'link', label: '링크: 실제 호스트를 확인하세요'});
    }
    const lower = message.toLowerCase();
    for (const [kind, words] of [['request', requests], ['pressure', urgency]]) {
      for (const word of words) {
        let start = lower.indexOf(word);
        while (start !== -1) {
          // 1차는 신호 추출만 수행한다. 문맥·부정문 의미 판별은 후속 검증 범위다.
          spans.push({start, end: start + word.length, kind, label: kind === 'request' ? '민감 정보·금전 관련 표현 (요청인지 직접 확인)' : '긴급·압박 관련 표현 (맥락 확인 필요)'});
          start = lower.indexOf(word, start + word.length);
        }
      }
    }
    spans.sort((a, b) => a.start - b.start || b.end - a.end);
    const nonOverlapping = [];
    let end = 0;
    for (const span of spans) if (span.start >= end) { nonOverlapping.push(span); end = span.end; }
    return {links, spans: nonOverlapping, hasRequest: spans.some((s) => s.kind === 'request'), hasUrgency: spans.some((s) => s.kind === 'pressure')};
  }
  function highlight(message, spans) {
    let cursor = 0;
    const parts = [];
    for (const span of spans) {
      parts.push(escapeHtml(message.slice(cursor, span.start)));
      parts.push(`<mark class="signal-${span.kind}" title="${escapeHtml(span.label)}">${escapeHtml(message.slice(span.start, span.end))}</mark>`);
      cursor = span.end;
    }
    parts.push(escapeHtml(message.slice(cursor)));
    return parts.join('');
  }
  return {analyze, highlight, inspectLink, escapeHtml};
});
