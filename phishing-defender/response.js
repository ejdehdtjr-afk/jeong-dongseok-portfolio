(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PDResponse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const actions = {
    opened: { label: '링크만 눌렀어요', steps: [
      '열린 페이지를 닫고, 그 페이지에 정보를 더 입력하거나 파일을 내려받지 마세요.',
      '설치·정보 입력·결제까지 했다면 아래 해당 항목도 함께 선택하세요.',
      '문자 속 주소 대신 원래 사용하던 앱이나 직접 찾은 공식 주소로 사실을 확인하세요.'
    ] },
    credentials: { label: '비밀번호·인증번호를 입력하거나 보냈어요', steps: [
      '믿을 수 있는 다른 기기에서 해당 서비스의 공식 앱·사이트로 들어가 비밀번호를 바꾸세요.',
      '같은 비밀번호를 쓰는 다른 계정도 바꾸고, 로그인 기록·복구 연락처를 확인하세요.',
      '금융 인증정보를 노출했다면 거래 금융회사 고객센터에 바로 연락하세요. 인증번호는 누구에게도 다시 알려주지 마세요.'
    ] },
    identity: { label: '신분증·개인정보를 보냈어요', steps: [
      '어떤 정보를 보냈는지 기록하고, 관련 기관의 공식 고객센터에 노출 사실을 알리세요.',
      '금융정보도 포함됐다면 거래 금융회사에 추가 피해 예방 조치를 문의하세요.',
      '이후 본인 명의 개설·거래 알림을 주의 깊게 확인하세요.'
    ] },
    installed: { label: '앱을 설치했어요', steps: [
      '의심 앱에서 더 이상 로그인·금융거래를 하지 마세요. 다른 안전한 기기나 전화로 도움을 요청하세요.',
      '국번 없이 118에 연락해 악성 앱 점검·삭제 방법을 안내받으세요.',
      '금융정보 노출이 의심되면 거래 금융회사에 바로 연락해 계좌 보호 조치를 문의하세요.'
    ] },
    paid: { label: '돈을 이체하거나 결제했어요', steps: [
      '지금 바로 112 또는 송금한 금융회사 고객센터에 연락해 피해 신고와 지급정지를 요청하세요.',
      '거래 시각·금액·계좌·대화 기록을 보존하되, 이 화면에 계좌번호 전체를 입력하지 마세요.',
      '상대방이 안내한 전화번호로 다시 연락하거나 추가 송금하지 마세요.'
    ] }
  };
  const order = ['paid', 'installed', 'credentials', 'identity', 'opened'];
  function guide(selected) {
    const ids = order.filter(id => selected.includes(id));
    if (!ids.length) return { ids: [], urgent: false, steps: [
      '메시지 속 링크·번호를 사용하지 말고, 기존에 알던 연락처나 공식 앱에서 확인하세요.'
    ] };
    return { ids, urgent: ids.includes('paid') || ids.includes('installed'), steps: ids.flatMap(id => actions[id].steps.map(text => ({ id, text }))) };
  }
  function mask(text) {
    return String(text || '')
      .replace(/https?:\/\/[^\s<>'"()]+|\bwww\.[^\s<>'"()]+/gi, '[링크 가림]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[이메일 가림]')
      .replace(/(?:\+?82[- ]?0?|0)1[016789][- ]?\d{3,4}[- ]?\d{4}\b/g, '[전화번호 가림]')
      .replace(/\b\d{2,6}[- ]\d{2,6}[- ]\d{3,8}\b/g, '[번호 가림]')
      .replace(/\b\d{12,19}\b/g, '[긴 번호 가림]')
      .replace(/\b\d{6}[- ]?\d{7}\b/g, '[주민번호 형식 가림]');
  }
  function summary({ analysis, assessment, selected, message }) {
    const labels = guide(selected).ids.map(id => actions[id].label);
    const reasons = [...(analysis?.riskReasons || []), ...(assessment?.reasons || [])].map(mask);
    const linkCount = (analysis?.links || []).length;
    const lines = [
      '피디 점검 요약 · 자동 판정이 아닌 확인용 기록',
      `발견 신호: ${reasons.length ? reasons.join(' / ') : '현재 규칙에서 뚜렷한 위험 표현을 찾지 못함'}`,
      `주소: ${linkCount ? `${linkCount}개 발견. 실제 호스트는 앱의 근거 화면에서 확인` : '텍스트에서 찾지 못함'}`,
      `이미 한 행동: ${labels.length ? labels.join(', ') : '선택하지 않음'}`,
      '미확인: 실제 발신자, 링크 최종 이동 주소, 피해 여부',
      `다음 행동: ${guide(selected).steps[0].text}`,
      '원문·스크린샷·답변은 포함하지 않음. 공유 전에 아래 내용을 직접 확인하세요.'
    ];
    // Show a warning without copying any original content into the export.
    if (mask(message) !== String(message || '')) lines.push('원문에 가려야 할 주소·번호 형식이 감지됨.');
    return lines.join('\n');
  }
  return { actions, order, guide, mask, summary };
});
