const samples = {
  phishing: `[배송 안내] 주소 오류로 배송이 보류되었습니다. 오늘 안에 아래 링크에서 주소와 카드 정보를 다시 입력하지 않으면 반송됩니다.\nhttp://fast-delivery-check.example/confirm`,
  normal: `[동아리 일정 안내] 이번 주 모임은 금요일 오후 6시, 평소 사용하던 학교 세미나실에서 진행합니다. 일정은 동아리 공지 게시판에서도 확인할 수 있습니다.`,
  prevention: '보안 안내: 인증번호를 절대 알려주지 마세요. 비밀번호를 다른 사람에게 보내지 마세요.',
  family: '엄마 나 휴대폰 고장 나서 새 번호야. 통화는 안 돼. 지금 상품권을 구매해서 보내줘.',
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
let latestAnalysis = null;
let latestContextAssessment = null;

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
  document.querySelectorAll(".sample[data-sample]").forEach((button) => button.classList.toggle("selected", button.dataset.sample === sampleName));
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
  invalidateAnalysis(false);
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
  const analysis = PDAnalysis.analyze(message);
  latestAnalysis = analysis;
  latestContextAssessment = null;
  renderEvidence(message, analysis);
  renderContext(PDContext.suggestType(message));
  const urls = analysis.links;
  const findings = [];
  const suspiciousLink = urls.some((link) => !link.valid || link.reasons.length);
  const hasUrgency = analysis.hasUrgency;
  const hasRequest = analysis.hasRequest;
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
    findings.push(suspiciousLink ? "직접 확인이 필요한 링크 형식을 찾았습니다. 확인 근거 영역의 호스트별 이유를 확인하세요." : "링크를 찾았습니다. 메시지의 이름이 아니라 실제 도메인이 공식 주소와 같은지 확인하세요.");
  } else {
    setChoice("link", "review");
    findings.push("링크를 찾지 못했습니다. 버튼·이미지 링크가 있는 원본 메시지라면 직접 확인하세요.");
  }
  if (analysis.requestAction) {
    setChoice("request", "risk");
    findings.push("민감 정보·금전·설치 표현과 행동 요구가 함께 나타납니다. 원문과 상황을 확인하세요.");
  } else {
    setChoice("request", "review");
  }
  if (hasUrgency && analysis.signalLevel === "risk") {
    setChoice("pressure", "risk");
    findings.push("서두르게 만드는 압박 표현을 찾았습니다.");
  } else {
    setChoice("pressure", "review");
  }
  if (analysis.suppressed.length) findings.push(`예방·완료 안내로 읽히는 표현 ${analysis.suppressed.length}개를 구분했습니다. 일부 정해진 문형만 처리하며 안전 보장은 아닙니다.`);
  if (hasRequest && !analysis.requestAction) findings.push('민감 정보 관련 단어는 있지만 행동 요구를 확인하지 못했습니다. 직접 맥락을 살펴보세요.');
  if (hasUrgency && analysis.signalLevel !== 'risk') findings.push('긴급·마감 표현만으로 위험 판정하지 않습니다. 요청 내용과 상황을 함께 확인하세요.');
  setChoice("context", "review");
  findings.push("아래 추가 질문에 답하면 상황 점검을 보완할 수 있습니다. 유형 제안은 키워드 기반이며 직접 바꿀 수 있습니다.");
  automaticFindings = findings;
  showResult();
  document.querySelector('#evidence-panel').scrollIntoView({behavior: 'instant', block: 'start'});
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
  if (counts.risk > 0 || latestAnalysis?.signalLevel === 'risk' || latestContextAssessment?.level === 'risk') {
    title.textContent = "위험 신호가 확인되었습니다";
    guidance.innerHTML = `<strong>지금은 누르거나 보내지 마세요.</strong><p>메시지 안의 링크·전화번호를 사용하지 말고, 해당 기관의 공식 앱·웹사이트 또는 이미 알고 있는 연락처로 직접 확인하세요.</p>`;
  } else if (counts.review > 0) {
    title.textContent = "확인이 필요한 항목이 있습니다";
    guidance.innerHTML = `<strong>확인 전에는 행동을 미루세요.</strong><p>발신자 주소와 링크의 실제 도메인을 공식 정보와 비교하고, 평소 이용하던 경로로 사실 여부를 확인하세요.</p>`;
  } else {
    title.textContent = "현재 선택에서는 위험 신호가 적습니다";
    guidance.innerHTML = `<strong>그래도 민감한 정보 요청은 다시 확인하세요.</strong><p>안전으로 보이는 메시지도 발신자 위조가 가능하므로, 비밀번호·인증번호·송금 요청은 공식 경로에서 한 번 더 확인하세요.</p>`;
  }
  const displayedFindings = [...automaticFindings];
  if (latestContextAssessment) {
    displayedFindings.push(...latestContextAssessment.reasons.map(reason => `상황 답변: ${escapeHtml(reason)}`));
    displayedFindings.push('추가 질문의 답변을 반영했습니다. 유리한 답변으로 기존 위험 신호를 지우지 않습니다.');
  } else if (latestAnalysis) displayedFindings.push('추가 질문 답변은 아직 반영하지 않았습니다.');
  if (displayedFindings.length) {
    summary.innerHTML = `<h3>자동 확인에서 찾은 신호</h3><ul>${displayedFindings.map((finding) => `<li>${finding}</li>`).join("")}</ul>`;
    summary.hidden = false;
  } else {
    summary.hidden = true;
  }
  result.hidden = false;
  result.focus();
}

function invalidateAnalysis(clearChoices) {
  automaticFindings = [];
  latestAnalysis = null;
  latestContextAssessment = null;
  document.querySelector('#context-panel').hidden = true;
  document.querySelector('#context-result').hidden = true;
  result.hidden = true;
  document.querySelector("#analysis-summary").hidden = true;
  document.querySelector("#evidence-panel").hidden = true;
  document.querySelector("#form-error").hidden = true;
  if (clearChoices) document.querySelectorAll(".choices input").forEach((item) => { item.checked = false; });
}

function renderEvidence(message, analysis) {
  document.querySelector("#highlighted-message").innerHTML = PDAnalysis.highlight(message, analysis.spans);
  document.querySelector("#link-evidence").innerHTML = analysis.links.length
    ? analysis.links.map((link) => `<article class="link-card"><p>원문 주소 (열리지 않는 텍스트)</p><p>${escapeHtml(link.raw)}</p><strong>실제 호스트</strong><code>${escapeHtml(link.host || '해석하지 못함')}</code><ul>${(link.reasons.length ? link.reasons : ['형식만으로 위험 신호를 찾지 못했습니다. 공식 주소와 직접 비교해야 합니다.']).map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul></article>`).join('')
    : '<p>텍스트에서 HTTP·HTTPS·www 링크를 찾지 못했습니다. 링크가 없다고 안전한 것은 아닙니다. 원본의 버튼·이미지·QR 링크도 직접 확인하세요.</p>';
  document.querySelector("#evidence-panel").hidden = false;
}

function renderContext(type) {
  const config = PDContext.types[type] || PDContext.types.other;
  document.querySelector('#message-type').value = type;
  document.querySelector('#context-description').textContent = config.instruction;
  document.querySelector('#context-questions').innerHTML = config.questions.map(q => `<fieldset class="context-question"><legend>${escapeHtml(q.text)}</legend><div class="context-answers">${[['yes','예'],['no','아니요'],['unknown','잘 모르겠어요']].map(([value,label]) => `<label><input type="radio" name="ctx-${q.id}" value="${value}"> ${label}</label>`).join('')}</div></fieldset>`).join('');
  document.querySelector('#context-result').hidden = true;
  document.querySelector('#context-error').hidden = true;
  document.querySelector('#official-routes').innerHTML = config.routes.map(key => {
    const route = PDContext.routes[key];
    return `<article class="route-card"><h4><a href="${route.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(route.title)} ↗</a></h4><code>${escapeHtml(new URL(route.url).hostname)}</code><p>${escapeHtml(route.description)}</p></article>`;
  }).join('');
  document.querySelector('#route-date').textContent = `공식 출처 확인일: ${PDContext.checkedAt}. 메시지에서 가져온 주소가 아닌 사전에 확인한 경로입니다. 서비스 화면은 이후 달라질 수 있습니다.`;
  document.querySelector('#context-panel').hidden = false;
}
function clearContextResult() {
  latestContextAssessment = null;
  document.querySelector('#context-result').hidden = true;
  if (latestAnalysis) {setChoice('context','review'); result.hidden = true;}
}
document.querySelector('#context-questions').addEventListener('change', clearContextResult);
document.querySelector('#message-type').addEventListener('change', event => {
  clearContextResult();
  renderContext(event.target.value);
});
document.querySelector('#apply-context').addEventListener('click', () => {
  if (!latestAnalysis) return;
  const type = document.querySelector('#message-type').value;
  const answers = {};
  for (const q of PDContext.types[type].questions) answers[q.id] = document.querySelector(`input[name="ctx-${q.id}"]:checked`)?.value;
  const assessment = PDContext.assess(type,answers,latestAnalysis);
  if (!assessment.complete) {
    document.querySelector('#context-error').textContent = '질문 세 개에 모두 답해 주세요. 확실하지 않으면 잘 모르겠어요를 선택하세요.';
    document.querySelector('#context-error').hidden = false;
    return;
  }
  latestContextAssessment = assessment;
  document.querySelector('#context-error').hidden = true;
  setChoice('context', assessment.reasons.length ? 'risk' : 'review');
  const box = document.querySelector('#context-result');
  box.innerHTML = `<strong>${assessment.level === 'risk' ? '주의 신호가 남아 있습니다' : '독립적인 확인을 계속 진행하세요'}</strong><p>${assessment.unknown ? `잘 모르겠다고 답한 항목 ${assessment.unknown}개는 확인이 필요합니다.` : '답변을 반영했지만 메시지의 진위를 확정하지 않습니다.'}</p><ul>${assessment.reasons.map(reason=>`<li>${escapeHtml(reason)}</li>`).join('')}</ul><p>${escapeHtml(assessment.note)}</p>`;
  box.hidden = false;
  showResult();
  box.scrollIntoView({behavior:'instant',block:'start'});
});

renderChecklist();
selectSample("phishing");
document.querySelectorAll(".sample[data-sample]").forEach((button) => button.addEventListener("click", () => selectSample(button.dataset.sample)));
input.addEventListener("input", () => document.querySelectorAll(".sample[data-sample]").forEach((button) => button.classList.remove("selected")));
input.addEventListener("input", () => invalidateAnalysis(true));
document.querySelector("#auto-check-button").addEventListener("click", autoCheckMessage);
document.querySelector("#result-button").addEventListener("click", showResult);

const reportSection = document.createElement("section");
reportSection.className = "research-note";
reportSection.innerHTML = `<p class="eyebrow">전화 신고·글 신고</p><h2>의심 전화번호를 안전하게 접수하세요</h2><p>개인 이름·주소는 쓰지 마세요. 의심 신고가 같은 번호에 5건 쌓이면 ‘신고 필요’로 자동 분류됩니다.</p><p><a href="tel:112">긴급 피해·범죄 112로 전화</a> · <a href="tel:118">불법스팸 118로 전화</a></p><form id="phone-report"><label>전화번호<input required name="phone" placeholder="010-1234-5678"></label><label>분류<select name="kind"><option value="suspicious">의심 전화번호</option><option value="dangerous">위험 전화번호</option></select></label><label>신고 글<textarea required name="text" minlength="10" maxlength="500" placeholder="통화 내용과 의심 이유를 10~500자로 적어 주세요."></textarea></label><button class="result-button">신고 글 저장</button><p id="report-status" class="hint" aria-live="polite"></p></form>`;
document.querySelector(".safe-actions").before(reportSection);
document.querySelector("#phone-report").addEventListener("submit", async (event) => {
  event.preventDefault(); const reportForm = event.currentTarget; const form = new FormData(reportForm); const status = document.querySelector("#report-status");
  status.textContent = "저장 중…";
  try { const response = await fetch("https://rzzrwjfwrioocysqapbl.supabase.co/rest/v1/rpc/submit_phone_report", {method:"POST",headers:{"Content-Type":"application/json","apikey":"sb_publishable_ULhVYVm2tZjlJGrUFauFPA_Mycpz9Ze","Authorization":"Bearer sb_publishable_ULhVYVm2tZjlJGrUFauFPA_Mycpz9Ze"},body:JSON.stringify({p_phone:form.get("phone"),p_kind:form.get("kind"),p_text:form.get("text")})}); const data=await response.json(); if(!response.ok) throw new Error(data.message||"저장 실패"); status.textContent=`저장됨: ${data.status === "reported" ? "신고 필요 전화번호" : data.status === "dangerous" ? "위험 전화번호" : "의심 전화번호"}로 분류되었습니다.`; reportForm.reset(); } catch(error) { status.textContent=`저장하지 못했습니다: ${error.message}`; }
});

// OCR is loaded only on demand. Runtime, worker, WASM and traineddata are same-origin.
const imageInput = document.querySelector('#screenshot-input');
const imagePreview = document.querySelector('#image-preview');
const ocrButton = document.querySelector('#ocr-button');
const ocrStatus = document.querySelector('#ocr-status');
const ocrProgress = document.querySelector('#ocr-progress');
let imageURL = null;
let imageFile = null;
let activeWorker = null;
let generation = 0;
let ocrBusy = false;
let scriptPromise = null;

function lockMessageDuringOCR(locked) {
  input.disabled = locked;
  document.querySelectorAll('.sample[data-sample], #clear-message, #auto-check-button').forEach((button) => { button.disabled = locked; });
}

async function clearImage(statusText = '이미지를 삭제했습니다. 인식 중이었다면 취소됩니다.') {
  generation += 1;
  const worker = activeWorker;
  activeWorker = null;
  if (worker) await worker.terminate().catch(() => {});
  if (imageURL) URL.revokeObjectURL(imageURL);
  imageURL = null;
  imageFile = null;
  imageInput.value = '';
  imagePreview.removeAttribute('src');
  document.querySelector('#image-preview-box').hidden = true;
  ocrBusy = false;
  lockMessageDuringOCR(false);
  ocrButton.disabled = true;
  imageInput.disabled = false;
  ocrProgress.hidden = true;
  ocrStatus.textContent = statusText;
}

imageInput.addEventListener('change', async () => {
  const file = imageInput.files[0];
  await clearImage('이미지를 확인하고 있습니다.');
  if (!file) { ocrStatus.textContent = '선택한 이미지가 없습니다.'; return; }
  const token = generation;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    ocrStatus.textContent = 'PNG·JPEG·WebP 이미지를 10MB 이하로 선택해 주세요.'; return;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const pixels = bitmap.width * bitmap.height;
    bitmap.close();
    if (token !== generation) return;
    if (pixels > 20000000) { ocrStatus.textContent = '이미지가 너무 큽니다. 2천만 화소 이하로 줄여 주세요.'; return; }
    imageFile = file;
    imageURL = URL.createObjectURL(file);
    imagePreview.src = imageURL;
    document.querySelector('#image-preview-box').hidden = false;
    ocrButton.disabled = false;
    ocrStatus.textContent = '이미지가 준비됐습니다. 글자를 가져오면 현재 메시지 내용이 교체됩니다.';
  } catch { if (token === generation) ocrStatus.textContent = '이미지를 읽지 못했습니다. 손상되지 않은 PNG·JPEG·WebP로 다시 선택해 주세요.'; }
});

function loadOCR() {
  if (window.Tesseract) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'vendor/tesseract.min.js';
    script.onload = resolve;
    script.onerror = () => { script.remove(); scriptPromise = null; reject(new Error('인식 도구를 내려받지 못했습니다.')); };
    document.head.append(script);
  });
  return scriptPromise;
}

ocrButton.addEventListener('click', async () => {
  if (!imageFile || ocrBusy) return;
  const token = ++generation;
  const file = imageFile;
  ocrBusy = true;
  lockMessageDuringOCR(true);
  ocrButton.disabled = true;
  imageInput.disabled = true;
  ocrProgress.hidden = false;
  ocrProgress.value = 0;
  ocrStatus.textContent = '한국어·영어 인식 도구를 준비하고 있습니다. 첫 실행은 시간이 걸립니다.';
  let worker = null;
  let timer;
  try {
    await Promise.race([
      (async () => {
        await loadOCR();
        if (token !== generation) return;
        worker = await Tesseract.createWorker(['kor', 'eng'], 1, {
          workerPath: new URL('vendor/worker.min.js', location.href).href,
          corePath: new URL('vendor/core/', location.href).href,
          langPath: new URL('vendor/lang/', location.href).href.replace(/\/$/, ''),
          logger: (event) => {
            if (token !== generation) return;
            if (event.status === 'recognizing text') {
              ocrProgress.value = event.progress;
              ocrStatus.textContent = `글자를 읽고 있습니다… ${Math.round(event.progress * 100)}%`;
            }
          }
        });
        if (token !== generation) { await worker.terminate(); return; }
        activeWorker = worker;
        const {data} = await worker.recognize(file);
        if (token !== generation) return;
        const text = data.text.trim();
        if (!text) { ocrStatus.textContent = '읽을 수 있는 글자를 찾지 못했습니다. 더 선명한 이미지나 직접 입력을 이용하세요.'; return; }
        input.value = text.slice(0, 20000);
        input.dispatchEvent(new Event('input', {bubbles:true}));
        ocrStatus.textContent = text.length > 20000 ? '20,000자까지만 가져왔습니다. 원본과 비교해 수정한 후 자동 확인을 누르세요.' : '글자를 가져왔습니다. 원본과 비교해 수정한 후 메시지 자동 확인을 누르세요.';
        lockMessageDuringOCR(false);
        input.focus();
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('인식 제한 시간')), 120000); })
    ]);
  } catch {
    if (token === generation) {
      generation += 1;
      ocrStatus.textContent = '글자를 가져오지 못했습니다. 연결·이미지 상태를 확인한 뒤 다시 시도하거나 직접 입력하세요.';
    }
  } finally {
    clearTimeout(timer);
    if (worker) await worker.terminate().catch(() => {});
    if (activeWorker === worker) activeWorker = null;
    // A cancelled old job must not change the controls of a newly started job.
    if (token === generation || (!activeWorker && !ocrBusy)) {
      ocrBusy = false;
      lockMessageDuringOCR(false);
      ocrButton.disabled = !imageFile;
      imageInput.disabled = false;
      ocrProgress.hidden = true;
    } else if (generation === token + 1 && ocrBusy && activeWorker === null) {
      ocrBusy = false;
      lockMessageDuringOCR(false);
      ocrButton.disabled = !imageFile;
      imageInput.disabled = false;
      ocrProgress.hidden = true;
    }
  }
});

document.querySelector('#clear-image').addEventListener('click', () => clearImage());
document.querySelector('#clear-message').addEventListener('click', () => {
  input.value = '';
  input.dispatchEvent(new Event('input', {bubbles:true}));
  input.focus();
});
window.addEventListener('pagehide', () => { if (imageURL) URL.revokeObjectURL(imageURL); if (activeWorker) activeWorker.terminate(); });

const exampleId = new URLSearchParams(location.search).get('example');
const selectedExample = PDScenarios.find(item => item.id === exampleId);
if (selectedExample) {
  input.value = selectedExample.text;
  input.dispatchEvent(new Event('input', {bubbles:true}));
}
