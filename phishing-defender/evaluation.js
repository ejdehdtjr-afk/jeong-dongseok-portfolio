(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./analysis-v1.js'),require('./analysis.js'));
  else root.PDEvaluation=factory(root.PDAnalysisV1,root.PDAnalysis);
})(typeof globalThis!=='undefined'?globalThis:this,function(baseline,current){
  function evaluate(cases){
    const rows=cases.map(item=>{
      const before=baseline.analyze(item.text), after=current.analyze(item.text);
      const previous=before.hasRequest||before.hasUrgency||before.links.some(link=>!link.valid||link.reasons.length)?'risk':'review';
      return {...item,before:previous,after:after.signalLevel,reasons:after.riskReasons,suppressed:after.suppressed};
    });
    function summary(key){return {
      normal:rows.filter(r=>r.category==='normal').length,
      falseAlarms:rows.filter(r=>r.category==='normal'&&r[key]==='risk').length,
      phishing:rows.filter(r=>r.category==='phishing').length,
      missed:rows.filter(r=>r.category==='phishing'&&r[key]!=='risk').length,
      ambiguous:rows.filter(r=>r.category==='ambiguous').length,
      ambiguousFlagged:rows.filter(r=>r.category==='ambiguous'&&r[key]==='risk').length,
      review:rows.filter(r=>r[key]==='review').length
    };}
    return {total:rows.length,baseline:summary('before'),current:summary('after'),rows};
  }
  return {evaluate};
});
