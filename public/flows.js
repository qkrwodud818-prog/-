import {renderGarment} from './garment.js';
import {TYPES,FABRICS} from './catalog.js';
import {btn,esc} from './panels.js';
import {estimateSample} from './estimate.js';

const operator='qkrwodud818@gmail.com';
const won=value=>`${Math.round(Number(value)||0).toLocaleString('ko-KR')}원`;
const sourceUrl=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?esc(u.href):'#';}catch{return '#';}};

function deliveryState(result,kind){
  if(result.manual)return manualState(result,kind);
  const sent=result.mailStatus==='sent',failed=result.mailStatus==='failed';
  const title=sent?'요청서를 저장하고 운영자에게 전달했어요.':failed?'요청서는 저장했지만 이메일 전달에 실패했어요.':'요청서를 저장했어요. 이메일 연결은 준비 중이에요.';
  const detail=sent?'운영자가 내용을 확인한 뒤 연락드립니다. 아직 제작이나 계약이 확정된 것은 아닙니다.':failed?'저장된 요청서는 유지됩니다. 아래 버튼으로 이메일 전달을 다시 시도할 수 있어요.':'아직 운영자에게 전달되지 않았습니다. 이메일 서비스 연결 후 다시 전달해 주세요.';
  return `<div class="success-state"><span>${sent?'✓':'↗'}</span><h3>${title}</h3><p>요청 번호 ${esc(result.id||'')}<br>${detail}</p>${!sent?btn(`retry-${kind}`,'이메일 전달 다시 시도','primary'):''}${kind==='sample'?`${btn('download-request','요청서 내려받기','secondary')}${btn('brief','작업지시서 내려받기','secondary')}${btn('sample-again','다시 작성','text')}`:''}</div>`;
}

export function lookbook(d,ai={},cap={}){
  const model=ai.model==='woman'?'woman':'man',ready=Boolean(cap.aiConfigured&&cap.models?.[model]);
  return `<main class="workflow-page">
    <div class="workflow-intro"><span class="eyebrow">02 / YOUR FIRST CAMPAIGN</span><h2>상상했던 옷을,<br><em>실제 화보처럼.</em></h2><p>내 디자인을 고정 AI 모델에게 입혀보세요.<br>${publicBeta?'공개 베타에서는 고정 모델 참고 사진만 볼 수 있어요. AI 착장 생성은 준비 중입니다.':'남성 180cm · 65kg / 여성 165cm · 45kg 설정으로 무료 생성합니다.'}</p></div>
    <div class="lookbook-grid">
      <div class="reference-card"><div class="section-label">YOUR DESIGN <span>${esc(TYPES[d.type])}</span></div>${renderGarment(d,'front',{idPrefix:'ai-ref'})}<div class="reference-bottom"><b>${esc(d.brand)}</b><span>${esc(d.name)}</span>${btn('studio','디자인 수정 ↗','text')}</div></div>
      <div class="ai-result">${ai.image?`<img src="${esc(ai.image)}" alt="디자인으로 생성한 AI 모델 착용 콘셉트"><span class="image-label">AI GENERATED · CONCEPT IMAGE</span>`:cap.models?.[model]?`<img src="./assets/model-${model}.png" alt="${model==='man'?'180cm 65kg':'165cm 45kg'} 고정 ${model==='man'?'남성':'여성'} 모델 참고 이미지. 현재 디자인의 생성 결과가 아닙니다." style="width:100%;height:100%;object-fit:contain;object-position:center"><span class="image-label">고정 모델 참고 이미지 · 내 디자인 적용 전</span>${ai.busy?'<div class="empty-lookbook" style="position:absolute;inset:0;background:rgba(250,249,246,.82)"><h3>첫 화보를 만들고 있어요.</h3><p>내 디자인을 참고해 모델 착용 이미지를 생성 중입니다.</p><div class="loading-line"></div></div>':''}`:'<div class="empty-lookbook"><h3>고정 모델 사진 준비 중</h3><p>인플루언서 화보 스타일의 모델을 준비하고 있습니다.</p></div>'}</div>
      <div class="lookbook-options"><h3>내 브랜드의 첫 화보</h3><label class="field">착용 모델<select id="ai-model" ${ai.busy?'disabled':''}><option value="man" ${model==='man'?'selected':''}>고정 남성 모델</option><option value="woman" ${model==='woman'?'selected':''}>고정 여성 모델</option></select></label><div class="quote-box"><span>고정 모델 · 스튜디오</span><strong>${model==='man'?'180cm / 65kg':'165cm / 45kg'}</strong><p>동일한 모델과 배경으로 디자인을 비교해보세요.<br>${publicBeta?'현재 사진은 내 디자인을 입힌 결과가 아닙니다.':'AI 착용 이미지 생성은 무료입니다.'}</p></div>
        ${ready?'<p class="hint">선택한 모델 참고 이미지와 내 디자인을 함께 사용해 생성합니다.</p>':`<div class="note">${!cap.aiConfigured?'AI 생성 서비스 연결 준비 중입니다.':'선택한 고정 모델 연결 준비 중입니다.'} 연결이 완료되면 무료로 생성할 수 있어요. 기본 모델 사진은 참고 이미지입니다.</div>`}
        ${ai.error?`<p class="error" role="alert">${esc(ai.error)}</p>`:''}
        ${ai.image&&(ai.signature!==JSON.stringify(d)||ai.generatedModel!==model)?'<p class="note">생성 후 디자인이 변경됐어요. 다시 생성해 주세요.</p>':''}
        ${btn('generate',ai.busy?'이미지 생성 중…':ready?'무료로 AI 모델에게 입혀보기 ↗':'AI 모델 연결 준비 중','primary full',!ready||ai.busy?'disabled':'')}
        ${btn('reference','디자인 PNG 저장','secondary full')}${btn('prompt','생성 프롬프트 저장','text full')}${ai.image?btn('download-ai','생성 이미지 저장','secondary full'):''}
        <p class="hint">모델 신체 조건은 미리보기 기준입니다. AI 이미지는 실제 핏이나 생산 결과를 보장하지 않으며, 제작은 작업지시서와 실물 샘플을 기준으로 확인합니다.</p>
      </div>
    </div><div class="workflow-cta"><div><h3>마음에 드는 디자인이 나왔다면.</h3><p>실제 원단과 핏을 샘플로 확인해보세요.</p></div>${btn('sample','이 옷 샘플 제작하기 →','primary')}</div>
  </main>`;
}

function estimateBox(d){
  const quote=estimateSample(d);
  return `<div class="quote-box"><span>현재 디자인의 샘플 1벌 예상 비용</span><strong>${won(quote.low)} ~ ${won(quote.high)}</strong><p>${esc(quote.disclaimer)}<br>이 금액은 최종 견적이나 결제 금액이 아닙니다.</p>
    <details><summary>예상 비용 내역과 참고 출처 보기</summary><div class="sample-process">${quote.items.map(item=>`<div><span>${esc(item.label)}<small>${esc(item.basis)}</small></span><b>${won(item.low)} ~ ${won(item.high)}</b></div>`).join('')}</div><ul>${quote.sources.map(source=>`<li><a href="${sourceUrl(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a></li>`).join('')}</ul><p class="hint">산정 기준 ${esc(quote.version)} · 실제 원단 수급과 제작 사양에 따라 달라집니다.</p></details>
  </div>`;
}

export function sample(d,result,cap={}){
  return `<main class="workflow-page"><div class="workflow-intro"><span class="eyebrow">03 / FROM SCREEN TO SAMPLE</span><h2>첫 번째 옷을<br><em>만날 준비.</em></h2><p>디자인과 원하는 제작 조건을 한 번에 정리하세요.<br>운영자와 사양·최종 견적을 확인한 뒤 제작 여부를 결정합니다.</p></div>
    <div class="sample-grid"><section class="sample-design">${renderGarment(d,'front',{idPrefix:'sample'})}<h3>${esc(d.name)}</h3><p>${esc(TYPES[d.type])} · ${esc(FABRICS[d.fabric]?.label||'사용자 원단')}</p><div class="sample-process">${[['01','제작 요청서 작성','디자인 + 사이즈 + 메모'],['02','운영자 상담과 견적 확인','원단 수급 / 제작 수량 / 일정'],['03','샘플 확인 후 생산 결정','수정 사항과 최종 금액을 확인']].map(([n,t,p])=>`<div><b>${n}</b><span>${t}<small>${p}</small></span></div>`).join('')}</div></section>
    <section class="sample-form"><h3>샘플 제작 요청서</h3><p class="hint">${publicBeta?'공개 베타에서는 이메일 초안을 작성합니다. 이메일 앱에서 직접 전송하고 작업지시서를 첨부해 주세요.':`요청서를 저장하고 운영자 ${operator}에게 이메일로 전달합니다.`} 접수만으로 결제되거나 제작이 시작되지는 않습니다.</p>${cap.mailConfigured===false?'<div class="note">이메일 연결 준비 중입니다. 요청서는 저장할 수 있지만 연결 전에는 운영자에게 자동 전달되지 않습니다.</div>':''}
      ${result?`${deliveryState(result,'sample')}<div class="workflow-cta"><div><h3>브랜드를 알릴 준비도 해보세요.</h3><p>마이크로인플루언서 홍보 상담을 신청할 수 있습니다.</p></div>${btn('promotion','내 브랜드 홍보 하기!','primary')}</div>`:`<form id="sample-form">
      <div class="form-row"><label class="field">담당자 이름<input name="name" required maxlength="80" autocomplete="name"></label><label class="field">이메일<input name="email" type="email" required maxlength="254" autocomplete="email"></label></div>
      <label class="field">연락처 (선택)<input name="phone" type="tel" maxlength="30" autocomplete="tel"></label><div class="form-row"><label class="field">샘플 사이즈<select name="size"><option>S</option><option selected>M</option><option>L</option><option>XL</option></select></label><label class="field">희망 본생산 수량<input name="quantity" type="number" min="1" max="10000" required value="${esc(d.quantity)}"></label></div>
      <label class="field">추가 요청<textarea name="notes" rows="4" maxlength="2000" placeholder="원하는 원단, 목표 가격, 희망 일정">${esc(d.notes)}</textarea></label>
      ${estimateBox(d)}
      <label class="check"><input name="estimateConsent" value="true" type="checkbox" required> 표시된 금액이 대략적인 예상 비용이며, 실제 사양 검토 후 최종 견적이 달라질 수 있음을 확인했습니다.</label>
      <label class="check"><input name="consent" value="true" type="checkbox" required> 제작 상담을 위해 이름·이메일·연락처·디자인·요청 내용을 ${publicBeta?'내가 직접 이메일로 운영자에게 전달':'저장하고 운영자 '+operator+'에게 이메일로 전달'}하는 데 동의합니다.</label>
      <button class="primary full" type="submit">${publicBeta?'샘플 상담 이메일 초안 만들기 →':'샘플 요청서 저장하고 전달하기 →'}</button><p id="sample-error" class="error" role="alert"></p></form>`}
    </section></div></main>`;
}

export function promotion(d,result,cap={}){
  return `<main class="workflow-page"><div class="workflow-intro"><span class="eyebrow">04 / INTRODUCE YOUR BRAND</span><h2>당신의 브랜드를,<br><em>더 많은 사람에게.</em></h2><p>틱톡과 인스타그램 마이크로인플루언서 홍보를 상담해보세요.<br>브랜드와 제품에 맞는 진행 범위를 함께 정합니다.</p></div>
    <div class="sample-grid"><section class="sample-design">${renderGarment(d,'front',{idPrefix:'promotion'})}<h3>${esc(d.brand)}</h3><p>${esc(d.name)}</p><div class="quote-box"><span>브랜드 홍보 상담</span><strong>월 199,000원</strong><p>TikTok · Instagram 마이크로인플루언서 홍보<br>참여 인원, 콘텐츠 수, 일정과 제공 범위는 상담 후 확정합니다. 조회수·매출 등 성과를 보장하지 않습니다.</p></div></section>
    <section class="sample-form"><h3>내 브랜드 홍보 신청</h3><p class="hint">지금은 상담 신청 단계이며 결제되지 않습니다. 최종 조건을 안내받고 진행 여부를 결정하세요.</p>${cap.mailConfigured===false?'<div class="note">이메일 연결 준비 중입니다. 신청서는 저장할 수 있지만 연결 전에는 운영자에게 자동 전달되지 않습니다.</div>':''}
      ${result?deliveryState(result,'promotion'):`<form id="promotion-form"><label class="field">브랜드 이름<input name="brand" required maxlength="120" value="${esc(d.brand)}"></label>
      <div class="form-row"><label class="field">담당자 이름<input name="name" required maxlength="80" autocomplete="name"></label><label class="field">이메일<input name="email" type="email" required maxlength="254" autocomplete="email"></label></div>
      <label class="field">연락처 (선택)<input name="phone" type="tel" maxlength="30" autocomplete="tel"></label><div class="form-row"><label class="field">인스타그램 계정 (선택)<input name="instagram" maxlength="200" placeholder="@brand 또는 프로필 주소"></label><label class="field">틱톡 계정 (선택)<input name="tiktok" maxlength="200" placeholder="@brand 또는 프로필 주소"></label></div>
      <label class="field">홍보하고 싶은 내용<textarea name="notes" rows="5" maxlength="2000" placeholder="제품 소개, 타깃 고객, 출시 일정, 원하는 홍보 방향"></textarea></label>
      <label class="check"><input name="consent" value="true" type="checkbox" required> 홍보 상담을 위해 이름·이메일·연락처·브랜드·SNS 계정·신청 내용을 ${publicBeta?'내가 직접 이메일로 운영자에게 전달':'저장하고 운영자 '+operator+'에게 이메일로 전달'}하는 데 동의합니다.</label>
      <button class="primary full" type="submit">${publicBeta?'홍보 상담 이메일 초안 만들기 →':'홍보 상담 신청하기 →'}</button><p id="promotion-error" class="error" role="alert"></p></form>`}
      ${btn('studio','디자인 스튜디오로 돌아가기','text full')}
    </section></div></main>`;
}

export const publicBeta=typeof document!=='undefined'&&document.querySelector('meta[name="threadform-mode"]')?.content==='public-beta';
const email='qkrwodud818@gmail.com';
export const mailDraft=(subject,body)=>`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
export function betaBanner(){return `<aside class="note" style="margin:16px 4%;display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div><b>무료 디자인 체험 · 공개 베타</b><br>디자인은 이 브라우저에 저장됩니다. AI 착장은 준비 중이며, 상담과 피드백은 이메일로 직접 보내주세요.</div>${btn('feedback','사용해 보고 의견 보내기','primary')}</aside>`;}
export function feedbackForm(){return `<main class="workflow-page"><div class="workflow-intro"><span class="eyebrow">HELP SHAPE THREADFORM</span><h2>어떤 옷을 만들고 싶었나요?</h2><p>잘된 점도, 막힌 부분도 듣고 싶어요. 개인정보 없이 의견만 보내도 됩니다.</p></div><form id="beta-feedback-form" class="sample-form" style="max-width:720px;margin:auto"><label class="field">만들려고 했던 옷<textarea name="idea" rows="2" maxlength="600" placeholder="예: 소매에 지퍼가 있는 크롭 후드"></textarea></label><label class="field">가장 불편했던 점 / 원하는 기능<textarea name="feedback" required rows="5" maxlength="2000" placeholder="어느 단계에서 무엇이 안 됐는지 알려주세요."></textarea></label><label class="field">실제로 제작해 보고 싶은가요?<select name="intent"><option>아직 둘러보는 중</option><option>기능이 좋아지면 제작하고 싶어요</option><option>견적을 받아보고 싶어요</option></select></label><p class="hint">의견은 서버에 자동 전송되지 않습니다. 이메일 앱이 열리면 직접 전송해 주세요. 앱이 없으면 내용을 복사해 ${email}로 보내주세요.</p><button class="primary" type="submit">이메일로 의견 보내기 ↗</button> ${btn('copy-feedback','의견 복사','secondary')}<p id="beta-feedback-status" role="status"></p></form></main>`;}
export function feedbackText(form){const v=Object.fromEntries(new FormData(form));return `THREADFORM 공개 베타 피드백\n\n만들고 싶은 옷: ${v.idea||'-'}\n\n의견: ${v.feedback||'-'}\n\n제작 의향: ${v.intent||'-'}`;}
export function manualRequest(kind,payload){const c=payload.customer;const body=`THREADFORM ${kind==='sample'?'샘플 제작':'브랜드 홍보'} 상담\n이름: ${c.name}\n이메일: ${c.email}\n연락처: ${c.phone||'-'}\n브랜드: ${payload.brand||payload.design?.brand||'-'}\n품명: ${payload.design?.name||'-'}\n사이즈: ${c.size||'-'}\n수량: ${c.quantity||'-'}\n인스타그램: ${payload.instagram||'-'}\n틱톡: ${payload.tiktok||'-'}\n메모: ${payload.notes||c.notes||'-'}\n\n${kind==='sample'?'작업지시서 파일을 이 이메일에 직접 첨부해 주세요.':'월 199,000원 홍보 상담 요청이며 계약/결제는 별도 확정합니다.'}`;return {manual:true,body,href:mailDraft('THREADFORM 상담 요청',body)};}
export function manualState(result,kind){return `<div class="note"><h3>이메일 초안을 준비했어요.</h3><p>아직 운영자에게 전달되지 않았습니다. 이메일 앱에서 직접 전송해 주세요.${kind==='sample'?' 작업지시서를 내려받아 이메일에 직접 첨부해 주세요.':''}</p><a class="primary" href="${esc(result.href)}">이메일 앱 열기 ↗</a> ${btn('copy-request','요청 내용 복사','secondary',`data-value="${kind}"`)}${btn('brief','작업지시서 내려받기','secondary')}<p class="hint">이메일 앱이 없으면 복사한 내용을 ${email}로 보내주세요.</p></div>`;}
