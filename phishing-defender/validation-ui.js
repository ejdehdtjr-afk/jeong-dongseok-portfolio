let comparison = null;
const escapeText=PDAnalysis.escapeHtml;
const level={risk:'위험 신호',review:'확인 필요'};
const categories={normal:'정상 가상 사례',phishing:'피싱 가상 사례',ambiguous:'애매한 가상 사례'};
function renderCases(){
  const filter=document.querySelector('#case-filter').value;
  const rows=comparison.rows.filter(row=>filter==='all'||(filter==='changed'&&row.before!==row.after)||(filter==='missed'&&row.category==='phishing'&&row.after==='review')||row.category===filter);
  document.querySelector('#case-count').textContent=`${rows.length}개 사례를 표시합니다.`;
  document.querySelector('#comparison-cases').innerHTML=rows.map(row=>`<article class="case-card"><p class="eyebrow">${row.id} · ${categories[row.category]}</p><h3>1차 ${level[row.before]} → 2차 ${level[row.after]}</h3><p class="case-message">${escapeText(row.text)}</p><p>${escapeText(row.reasons.join(' · ')||'현재 규칙으로 명확한 위험 신호를 찾지 못함. 독립적인 확인이 필요합니다.')}</p>${row.suppressed.length?`<p>예방·완료 안내로 구분: ${escapeText(row.suppressed.join(', '))}</p>`:''}<a href="./?example=${row.id}#message">이 가상 사례를 점검 화면에서 열기 →</a></article>`).join('');
}
document.querySelector('#run-comparison').addEventListener('click',()=>{
  comparison=PDEvaluation.evaluate(PDScenarios);
  const a=comparison.baseline,b=comparison.current;
  document.querySelector('#comparison-summary').innerHTML=[['정상 사례의 위험 신호 표시(오탐)',`${a.falseAlarms}/${a.normal}`,`${b.falseAlarms}/${b.normal}`],['피싱 사례를 확인 필요로 남김(누락)',`${a.missed}/${a.phishing}`,`${b.missed}/${b.phishing}`],['애매한 사례의 위험 신호 표시(참고)',`${a.ambiguousFlagged}/${a.ambiguous}`,`${b.ambiguousFlagged}/${b.ambiguous}`],['전체 확인 필요 표시',`${a.review}/${comparison.total}`,`${b.review}/${comparison.total}`]].map(row=>`<tr>${row.map((cell,i)=>i===0?`<th scope="row">${cell}</th>`:`<td>${cell}</td>`).join('')}</tr>`).join('');
  document.querySelector('#comparison-status').textContent='30개 비교를 완료했습니다. 이 결과는 가상 개발 사례에 한정됩니다.';
  document.querySelector('#comparison-results').hidden=false;
  renderCases();
});
document.querySelector('#case-filter').addEventListener('change',()=>{if(comparison)renderCases();});
