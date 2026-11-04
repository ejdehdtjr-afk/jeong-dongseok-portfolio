(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PDContext = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const checkedAt = '2026-11-04';
  const routes = {
    kisa: {title:'KISA 118 상담 안내', url:'https://www.kisa.or.kr/118', description:'스미싱·개인정보·사이버 보안 상담 경로를 확인하세요.'},
    smishing: {title:'KISA 스미싱·큐싱 공식 안내', url:'https://www.kisa.or.kr/1020601', description:'공식 상담·신고 방법을 확인하세요.'},
    post: {title:'인터넷우체국', url:'https://www.epost.go.kr/', description:'우체국을 사칭한 메시지일 때만 이용하세요. 다른 택배는 구매처 앱이나 해당 배송사의 기존 공식 앱에서 확인하세요.'},
    police: {title:'경찰청 공식 홈페이지', url:'https://www.police.go.kr/', description:'경찰 사칭이 의심되면 메시지의 연락처 대신 공식 경로를 직접 확인하세요.'}
  };
  const types = {
    delivery: {title:'택배·배송', pattern:/배송|택배|반송|운송장|우체국/, instruction:'주문한 물건이 있어도 이 메시지가 진짜라는 뜻은 아닙니다. 구매처의 주문 내역에서 직접 확인하세요.', routes:['post','smishing'], questions:[
      {id:'expected',text:'최근 본인이 주문했거나 받을 물건이 있나요?',risk:'no',reason:'받을 물건이 없는데 배송 확인을 요구합니다.'},
      {id:'verified',text:'메시지 밖의 구매처 앱·기존 공식 앱에서 같은 내용을 확인했나요?',risk:'no',reason:'독립적인 공식 경로에서 내용이 확인되지 않았습니다.'},
      {id:'sensitive',text:'주소 확인을 이유로 카드 정보·인증번호·앱 설치를 요구하나요?',risk:'yes',reason:'배송 확인을 빌미로 민감한 행동을 요구합니다.'}
    ]},
    family: {title:'가족·지인',pattern:/엄마|아빠|가족|아들|딸|휴대폰.*고장|번호.*바뀌/, instruction:'메시지에 적힌 새 번호 대신 원래 저장된 번호로 직접 통화해 확인하세요. 이 앱은 가족에게 자동 연락하지 않습니다.', routes:['kisa','smishing'], questions:[
      {id:'verified',text:'원래 알고 있던 연락처로 직접 통화해 본인임을 확인했나요?',risk:'no',reason:'기존 연락처로 본인 확인이 되지 않았습니다.'},
      {id:'newnumber',text:'새 번호·다른 계정이라며 기존 연락처로 통화를 피하나요?',risk:'yes',reason:'새 연락처만 쓰도록 하며 기존 연락을 피합니다.'},
      {id:'sensitive',text:'송금·상품권 구매·인증번호 전달을 요청하나요?',risk:'yes',reason:'가족·지인 관계를 이용해 금전·인증 행동을 요구합니다.'}
    ]},
    finance: {title:'금융·대출',pattern:/은행|대출|카드|계좌|송금|이체|금융|입금/, instruction:'본인이 먼저 이용한 금융사의 기존 공식 앱 또는 카드 등에 적힌 연락처로 확인하세요. 메시지에서 제공한 앱·전화번호는 확인 경로로 쓰지 마세요.', routes:['kisa'], questions:[
      {id:'expected',text:'본인이 먼저 신청하거나 문의한 금융 업무인가요?',risk:'no',reason:'본인이 시작하지 않은 금융 업무를 진행하도록 합니다.'},
      {id:'verified',text:'기존 금융사 앱·독립적으로 확인한 연락처에서 같은 내용을 확인했나요?',risk:'no',reason:'독립적인 금융사 경로에서 내용이 확인되지 않았습니다.'},
      {id:'sensitive',text:'안전계좌 송금·원격제어 앱 설치·인증번호 전달을 요구하나요?',risk:'yes',reason:'금융 업무를 이유로 고위험 행동을 요구합니다.'}
    ]},
    authority: {title:'공공기관·수사기관',pattern:/경찰|검찰|수사|과태료|범칙금|국세|공공기관|정부/, instruction:'메시지 밖에서 해당 기관의 공식 홈페이지를 직접 찾아 사실 여부를 확인하세요. 아래 경찰청 경로는 경찰을 사칭한 경우에만 해당합니다.',routes:['police','smishing'], questions:[
      {id:'verified',text:'메시지 밖의 해당 기관 공식 경로에서 같은 통지를 확인했나요?',risk:'no',reason:'해당 기관의 독립적인 공식 경로에서 확인되지 않았습니다.'},
      {id:'secrecy',text:'가족·주변에 알리지 말라거나 통화를 끊지 말라고 하나요?',risk:'yes',reason:'독립적인 확인과 주변 도움을 막으려 합니다.'},
      {id:'sensitive',text:'수사·과태료를 이유로 송금·앱 설치·인증번호를 요구하나요?',risk:'yes',reason:'기관 권위를 내세워 민감한 행동을 요구합니다.'}
    ]},
    account: {title:'계정·서비스',pattern:/계정|로그인|비밀번호|password|인증번호|보안/, instruction:'메시지 링크 대신 평소 사용하는 앱을 직접 열어 알림·보안 설정을 확인하세요. 이 앱은 로그인 여부나 기관 소유권을 검증하지 않습니다.',routes:['kisa'], questions:[
      {id:'expected',text:'본인이 방금 로그인·비밀번호 변경·가입을 시도했나요?',risk:'no',reason:'본인이 시도하지 않은 계정 작업을 요구합니다.'},
      {id:'verified',text:'평소 사용하는 앱을 직접 열어 같은 알림을 확인했나요?',risk:'no',reason:'평소 사용하던 앱에서 같은 내용을 확인하지 못했습니다.'},
      {id:'sensitive',text:'다른 사람에게 비밀번호·인증번호를 보내라고 하나요?',risk:'yes',reason:'계정의 비밀 정보를 다른 사람에게 전달하도록 요구합니다.'}
    ]},
    other: {title:'기타·잘 모르겠음',pattern:null,instruction:'발신자를 독립적으로 확인할 수 없으면 행동을 미루고 KISA 공식 상담 안내를 확인하세요.',routes:['kisa','smishing'],questions:[
      {id:'expected',text:'평소 관계·상황에서 예상했던 요청인가요?',risk:'no',reason:'평소 예상하지 않았던 요청입니다.'},
      {id:'verified',text:'메시지에 없는 기존 연락처·공식 앱으로 사실을 확인했나요?',risk:'no',reason:'메시지 밖의 경로에서 사실이 확인되지 않았습니다.'},
      {id:'sensitive',text:'송금·인증번호·신분증·앱 설치처럼 민감한 행동을 요구하나요?',risk:'yes',reason:'민감한 정보 또는 금전·설치 행동을 요구합니다.'}
    ]}
  };
  function suggestType(message) {
    return ['family','authority','delivery','finance','account'].find(key => types[key].pattern.test(message)) || 'other';
  }
  function assess(type, answers, analysis) {
    const config = types[type] || types.other;
    const valid = ['yes','no','unknown'];
    const reasons = [];
    let answered = 0;
    let unknown = 0;
    for (const q of config.questions) {
      const value = answers[q.id];
      if (!valid.includes(value)) continue;
      answered++;
      if(value === 'unknown') unknown++;
      if(value === q.risk) reasons.push(q.reason);
    }
    return {answered, unknown, total:config.questions.length, complete:answered === config.questions.length,
      level:analysis.signalLevel === 'risk' || reasons.length ? 'risk' : 'review', reasons,
      note:'답변이 긍정적이어도 메시지의 링크·행동 요구 신호를 지우거나 안전 판정을 내리지 않습니다.'};
  }
  return {types,routes,checkedAt,suggestType,assess};
});
