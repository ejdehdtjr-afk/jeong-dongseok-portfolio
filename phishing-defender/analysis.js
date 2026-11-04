(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PDAnalysis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const urgency = ['오늘 안', '즉시', '지금', '긴급', '마감', '정지', '보류', '마지막 경고', 'within 24', 'urgent', 'immediately'];
  const requests = ['비밀번호', '인증번호', '인증 코드', '카드 정보', '계좌', '송금', '결제', '주민등록', 'password', 'verification code', 'wire transfer', '상품권', '안전계좌', '원격제어', '원격 제어', '앱 설치', '신분증', '이체', '입금'];
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
    const suppressed = [];
    const actionPattern = /입력|보내|전달|알려|제공|송금|이체|입금|결제|구매|구입|설치|share|send|enter|provide|transfer/i;
    function sentenceAt(start) {
      const before = message.slice(0, start);
      const begin = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?')) + 1;
      const rest = message.slice(start);
      const stop = rest.search(/[\n.!?。]/);
      return message.slice(begin, stop === -1 ? message.length : start + stop);
    }
    function preventionAt(start, length) {
      const after = message.slice(start + length).split(/[\n.!?。]/)[0];
      // A later warning about another secret must not cancel the current request.
      const nextTerm = requests.map(word => after.toLowerCase().indexOf(word)).filter(index => index >= 0);
      const localAfter = nextTerm.length ? after.slice(0, Math.min(...nextTerm)) : after;
      const warning = /^(?!.{0,60}않으면).{0,45}(?:(?:알려\s*주|보내|공유하|제공하|입력하|전달하|요구하|요청하|송금하|결제하)지\s*(?:마(?:세요|십시오)?|않(?:습니다|아요|는다)|말(?:아|고))|(?:입력|공유|제공|전달|송금|결제)\s*금지)/.test(localAfter);
      const englishWarning = /(?:never|do not|don't)\s+(?:share|send|provide|enter)\s+(?:(?:your|the)\s+)?$/i.test(message.slice(Math.max(0, start - 90), start));
      const receipt = /^(?:가|이|를|\s)*완료(?:되었|됐|했습니다)/.test(after);
      return warning || englishWarning || receipt;
    }
    for (const [kind, words] of [['request', requests], ['pressure', urgency]]) {
      for (const word of words) {
        let start = lower.indexOf(word);
        while (start !== -1) {
          const insideLink = spans.some((span) => span.kind === 'link' && start >= span.start && start < span.end);
          if (!insideLink) {
            const isPrevention = kind === 'request' && preventionAt(start, word.length);
            const signal = {start, end: start + word.length, kind: isPrevention ? 'notice' : kind, label: isPrevention ? '예방·완료 안내로 읽히는 표현 (안전 보장은 아님)' : kind === 'request' ? '민감 정보·금전 관련 표현 (요청인지 직접 확인)' : '긴급·압박 관련 표현 (맥락 확인 필요)'};
            spans.push(signal);
            if (isPrevention) suppressed.push(word);
          }
          start = lower.indexOf(word, start + word.length);
        }
      }
    }
    spans.sort((a, b) => a.start - b.start || b.end - a.end);
    const nonOverlapping = [];
    let end = 0;
    for (const span of spans) if (span.start >= end) { nonOverlapping.push(span); end = span.end; }
    const hasRequest = spans.some((s) => s.kind === 'request');
    const hasUrgency = spans.some((s) => s.kind === 'pressure');
    const requestAction = spans.some((s) => s.kind === 'request' && actionPattern.test(sentenceAt(s.start)));
    const linkRisk = links.some((link) => !link.valid || link.reasons.length > 0);
    const riskReasons = [];
    if (linkRisk) riskReasons.push('직접 확인이 필요한 링크 형식');
    if (requestAction) riskReasons.push('민감 정보·금전·설치 표현과 행동 요구가 함께 나타남');
    return {links, spans: nonOverlapping, hasRequest, hasUrgency, requestAction, linkRisk, suppressed,
      signalLevel: riskReasons.length ? 'risk' : 'review', riskReasons};
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
