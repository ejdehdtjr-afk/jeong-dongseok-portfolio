(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PDReports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const endpoint = 'https://rzzrwjfwrioocysqapbl.supabase.co/rest/v1/rpc/';
  const key = 'sb_publishable_ULhVYVm2tZjlJGrUFauFPA_Mycpz9Ze';
  const labels = Object.freeze({ received: '접수됨 · 사실 확인 전', reviewing: '검토 중', verified: '운영자 확인', dismissed: '오인 신고로 정정', withdrawn: '신고 철회' });
  const correctionLabels = Object.freeze({ none: '정정 요청 없음', pending: '정정 요청 접수 · 검토 전', resolved: '정정 검토 완료' });
  function validPhone(value) { return /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(String(value).trim()); }
  function validReport(kind, text, phone) {
    return ['suspicious', 'dangerous'].includes(kind) && validPhone(phone) && text.trim().length >= 10 && text.trim().length <= 500;
  }
  async function rpc(name, body = {}) {
    const response = await fetch(endpoint + name, {
      method: 'POST', headers: { 'Content-Type':'application/json', apikey:key, Authorization:`Bearer ${key}` },
      body: JSON.stringify(body)
    });
    let data;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok) throw new Error(response.status === 404 ? '신고 서버의 3차 기능이 아직 적용되지 않았습니다.' : '서버 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도하세요.');
    return data;
  }
  function makeSecret() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return [...bytes].map(byte => byte.toString(16).padStart(2,'0')).join('');
  }
  async function create(phone, kind, text) {
    if (!validReport(kind,text,phone)) throw new Error('번호 형식과 신고 글 10~500자를 확인해 주세요.');
    const secret = makeSecret();
    const data = await rpc('pd_create_report', { p_phone:phone.trim(), p_kind:kind, p_text:text.trim(), p_secret:secret });
    if (!data || !data.id || !data.status) throw new Error('접수 번호를 받지 못했습니다. 다시 제출하기 전에 운영자에게 확인하세요.');
    return { id:data.id, secret, status:data.status, correction_status:data.correction_status || 'none', created_at:data.created_at };
  }
  async function status(receipt) {
    if (!receipt?.id || !receipt?.secret) throw new Error('접수 번호와 조회 비밀값이 필요합니다.');
    return rpc('pd_report_status', { p_id:receipt.id, p_secret:receipt.secret });
  }
  async function correct(receipt, reason) {
    if (!receipt?.id || !receipt?.secret) throw new Error('접수 번호와 조회 비밀값이 필요합니다.');
    if (reason.trim().length < 10 || reason.trim().length > 500) throw new Error('정정 이유를 10~500자로 적어 주세요.');
    const data = await rpc('pd_correct_report', { p_id:receipt.id, p_secret:receipt.secret, p_reason:reason.trim() });
    if (!data) throw new Error('조회 코드가 일치하지 않아 정정 요청을 접수하지 못했습니다.');
    return data;
  }
  return { labels, correctionLabels, validPhone, validReport, makeSecret, create, status, correct, rpc };
});
