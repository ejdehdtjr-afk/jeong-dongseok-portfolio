const samples = {
  phishing: `[배송 안내] 주소 오류로 배송이 보류되었습니다. 오늘 안에 아래 링크에서 주소와 카드 정보를 다시 입력하지 않으면 반송됩니다.\nhttp://fast-delivery-check.example/confirm`,
  normal: `[동아리 일정 안내] 이번 주 모임은 금요일 오후 6시, 평소 사용하던 학교 세미나실에서 진행합니다. 일정은 동아리 공지 게시판에서도 확인할 수 있습니다.`,
  blank: ""
};

const checks = [
  { id: "sender", title: "발신자", prompt: "보낸 사람이 공식 채널인지, 이름·주소가 평소와 같은지 확인했나요?" },
  { id: "link", title: "링크", prompt: "링크 주소가 메시지에서 말하는 기관의 공식 주소와 일치하나요?" },
  { id: "request", title: "요청 행동", prompt: "비밀번호·인증번호·계좌 정보·송금처럼 민감한 행동을 요구하나요?" },
  { id: "pressure", title: "압박 표현", prompt: "‘지금’, ‘오늘 안에’, ‘계정 정지’처럼 서두르게 하나요?" },
  { id: "context", title: "맥락", prompt: "평소 받던 내용·관계·상황과 다른 요청인가요?" }
];

const choices = [
  ["safe", "안전으로 확인"],
  ["review", "확인 필요"],
  ["risk", "위험 신호"]
];

const checklist = document.querySelector("#checklist");
const input = document.querySelector("#message-input");
const result = document.querySelector("#result");
let automaticFindings = [];

function renderChecklist() {
  checklist.innerHTML = checks.map((check) => `
    <article class="check-card" aria-labelledby="${check.id}-title">
      <h3 id="${check.id}-title">${check.title}</h3>
      <p>${check.prompt}</p>
      <div class="choices" role="radiogroup" aria-label="${check.title} 점검 결과">
        ${choices.map(([value, label]) => `<label class="choice"><input type="radio" name="${check.id}" value="${value}"><span>${label}</span></label>`).join("")}
      </div>
    </article>`).join("");
}

function selectSample(sampleName) {
  input.value = samples[sampleName];
  document.querySelectorAll(".sample").forEach((button) => button.classList.toggle("selected", button.dataset.sample === sampleName));
  const preset = sampleName === "phishing"
    ? ["review", "risk", "risk", "risk", "review"]
    : sampleName === "normal"
      ? ["safe", "safe", "safe", "safe", "safe"]
      : [];
  checks.forEach((check, index) => {
    const radio = document.querySelector(`input[name="${check.id}"][value="${preset[index]}"]`);
    if (radio) radio.checked = true;
    if (!preset[index]) document.querySelectorAll(`input[name="${check.id}"]`).forEach((item) => { item.checked = false; });
  });
  result.hidden = true;
  document.querySelector("#analysis-summary").hidden = true;
}

function setChoice(id, value) {
  const radio = document.querySelector(`input[name="${id}"][value="${value}"]`);
  if (radio) radio.checked = true;
}

function autoCheckMessage() {
  const message = input.value.trim();
  const error = document.querySelector("#form-error");
  if (!message) {
    error.textContent = "자동 확인할 메시지를 입력하거나 예시 메시지를 선택해 주세요.";
    error.hidden = false;
    input.focus();
    return;
  }

  error.hidden = true;
  const lower = message.toLowerCase();
  const urls = message.match(/https?:\/\/[^\s)>\]}]+/gi) || [];
  const findings = [];
  const urgencyWords = ["오늘 안", "즉시", "지금", "긴급", "마감", "정지", "보류", "마지막 경고", "within 24", "urgent", "immediately"];
  const requestWords = ["비밀번호", "인증번호", "인증 코드", "카드 정보", "계좌", "송금", "결제", "주민등록", "password", "verification code", "wire transfer"];
  const suspiciousLink = urls.some((url) => /^http:\/\//i.test(url) || /\d{1,3}(?:\.\d{1,3}){3}/.test(url) || /(bit\.ly|tinyurl|goo\.gl)/i.test(url));
  const hasUrgency = urgencyWords.some((word) => lower.includes(word));
  const hasRequest = requestWords.some((word) => lower.includes(word));
  const sender = message.match(/(?:from|발신자|보낸\s*사람)\s*[:：]?\s*[^\n<]*<?([\w.+-]+@[\w.-]+\.[a-z]{2,})>?/i)?.[1];

  if (sender) {
    setChoice("sender", "review");
    findings.push(`발신자 주소 <strong>${escapeHtml(sender)}</strong>가 보입니다. 공식 주소와 직접 비교해 보세요.`);
  } else {
    setChoice("sender", "review");
    findings.push("발신자 정보를 텍스트에서 확인하지 못했습니다. 보낸 사람의 실제 주소를 직접 확인하세요.");
  }
  if (urls.length) {
    setChoice("link", suspiciousLink ? "risk" : "review");
    findings.push(suspiciousLink ? "일반적이지 않거나 보안 연결이 아닌 링크 형식을 찾았습니다." : "링크를 찾았습니다. 메시지의 이름이 아니라 실제 도메인이 공식 주소와 같은지 확인하세요.");
  } else {
    setChoice("link", "review");
    findings.push("링크를 찾지 못했습니다. 버튼·이미지 링크가 있는 원본 메시지라면 직접 확인하세요.");
  }
  if (hasRequest) {
    setChoice("request", "risk");
    findings.push("개인정보·인증·금전 관련 요청 표현을 찾았습니다.");
  } else {
    setChoice("request", "safe");
  }
  if (hasUrgency) {
    setChoice("pressure", "risk");
    findings.push("서두르게 만드는 압박 표현을 찾았습니다.");
  } else {
    setChoice("pressure", "safe");
  }
  setChoice("context", "review");
  findings.push("평소 관계와 상황에 맞는 요청인지는 자동으로 알 수 없어 직접 확인이 필요합니다.");
  automaticFindings = findings;
  showResult();
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function showResult() {
  const selections = checks.map((check) => document.querySelector(`input[name="${check.id}"]:checked`)?.value);
  const error = document.querySelector("#form-error");
  if (selections.some((value) => !value)) {
    error.textContent = "다섯 항목을 모두 선택해 주세요. 확실하지 않으면 ‘확인 필요’를 고르면 됩니다.";
    error.hidden = false;
    return;
  }
  error.hidden = true;
  const counts = selections.reduce((total, value) => ({ ...total, [value]: total[value] + 1 }), { safe: 0, review: 0, risk: 0 });
  document.querySelector("#risk-count").textContent = counts.risk;
  document.querySelector("#review-count").textContent = counts.review;
  document.querySelector("#safe-count").textContent = counts.safe;
  const title = document.querySelector("#result-title");
  const guidance = document.querySelector("#result-guidance");
  const summary = document.querySelector("#analysis-summary");
  if (counts.risk > 0) {
    title.textContent = "위험 신호가 확인되었습니다";
    guidance.innerHTML = `<strong>지금은 누르거나 보내지 마세요.</strong><p>메시지 안의 링크·전화번호를 사용하지 말고, 해당 기관의 공식 앱·웹사이트 또는 이미 알고 있는 연락처로 직접 확인하세요.</p>`;
  } else if (counts.review > 0) {
    title.textContent = "확인이 필요한 항목이 있습니다";
    guidance.innerHTML = `<strong>확인 전에는 행동을 미루세요.</strong><p>발신자 주소와 링크의 실제 도메인을 공식 정보와 비교하고, 평소 이용하던 경로로 사실 여부를 확인하세요.</p>`;
  } else {
    title.textContent = "현재 선택에서는 위험 신호가 적습니다";
    guidance.innerHTML = `<strong>그래도 민감한 정보 요청은 다시 확인하세요.</strong><p>안전으로 보이는 메시지도 발신자 위조가 가능하므로, 비밀번호·인증번호·송금 요청은 공식 경로에서 한 번 더 확인하세요.</p>`;
  }
  if (automaticFindings.length) {
    summary.innerHTML = `<h3>자동 확인에서 찾은 신호</h3><ul>${automaticFindings.map((finding) => `<li>${finding}</li>`).join("")}</ul>`;
    summary.hidden = false;
  } else {
    summary.hidden = true;
  }
  result.hidden = false;
  result.focus();
}

renderChecklist();
selectSample("phishing");
document.querySelectorAll(".sample").forEach((button) => button.addEventListener("click", () => selectSample(button.dataset.sample)));
input.addEventListener("input", () => document.querySelectorAll(".sample").forEach((button) => button.classList.remove("selected")));
input.addEventListener("input", () => { automaticFindings = []; });
document.querySelector("#auto-check-button").addEventListener("click", autoCheckMessage);
document.querySelector("#result-button").addEventListener("click", showResult);

const reportSection = document.createElement("section");
reportSection.className = "research-note";
reportSection.innerHTML = `<p class="eyebrow">전화 신고·글 신고</p><h2>의심 전화번호를 안전하게 접수하세요</h2><p>개인 이름·주소는 쓰지 마세요. 의심 신고가 같은 번호에 5건 쌓이면 ‘신고 필요’로 자동 분류됩니다.</p><p><a href="tel:112">긴급 피해·범죄 112로 전화</a> · <a href="tel:118">불법스팸 118로 전화</a></p><form id="phone-report"><label>전화번호<input required name="phone" placeholder="010-1234-5678"></label><label>분류<select name="kind"><option value="suspicious">의심 전화번호</option><option value="dangerous">위험 전화번호</option></select></label><label>신고 글<textarea required name="text" minlength="10" maxlength="500" placeholder="통화 내용과 의심 이유를 10~500자로 적어 주세요."></textarea></label><button class="result-button">신고 글 저장</button><p id="report-status" class="hint" aria-live="polite"></p></form>`;
document.querySelector(".safe-actions").before(reportSection);
document.querySelector("#phone-report").addEventListener("submit", async (event) => {
  event.preventDefault(); const form = new FormData(event.currentTarget); const status = document.querySelector("#report-status");
  status.textContent = "저장 중…";
  try { const response = await fetch("https://rzzrwjfwrioocysqapbl.supabase.co/rest/v1/rpc/submit_phone_report", {method:"POST",headers:{"Content-Type":"application/json","apikey":"sb_publishable_ULhVYVm2tZjlJGrUFauFPA_Mycpz9Ze","Authorization":"Bearer sb_publishable_ULhVYVm2tZjlJGrUFauFPA_Mycpz9Ze"},body:JSON.stringify({p_phone:form.get("phone"),p_kind:form.get("kind"),p_text:form.get("text")})}); const data=await response.json(); if(!response.ok) throw new Error(data.message||"저장 실패"); status.textContent=`저장됨: ${data.status === "reported" ? "신고 필요 전화번호" : data.status === "dangerous" ? "위험 전화번호" : "의심 전화번호"}로 분류되었습니다.`; event.currentTarget.reset(); } catch(error) { status.textContent=`저장하지 못했습니다: ${error.message}`; }
});
