let currentPage='',lastStep=0,completionShown=false;
const seen=new Set();
try{for(const key of JSON.parse(sessionStorage.getItem('threadform-events')||'[]'))seen.add(key);}catch{}
export function event(name,once=false){
 if(once&&seen.has(name))return;
 if(once){seen.add(name);try{sessionStorage.setItem('threadform-events',JSON.stringify([...seen]));}catch{}}
 window.clarity?.('event',name);
}
export function designInteraction(){if(currentPage==='studio')event('design_start',true);}
export function notificationButton(){return '<button class="secondary" type="button" data-notify-open>샘플 제작 오픈 알림 받기</button>';}
export function growthRender(state){
 document.querySelectorAll('input,textarea,form,.project-bar,#garment-wrap,.landing-art,.sample-design,.project-grid').forEach(el=>el.setAttribute('data-clarity-mask','true'));
 const changed=currentPage!==state.page;currentPage=state.page;
 if(state.page==='home')document.querySelector('.landing-actions')?.insertAdjacentHTML('afterend','<div class="notify-entry">'+notificationButton()+'<p class="hint">제작 준비가 끝나면 이메일로 알려드려요. 신청은 무료입니다.</p></div>');
 if(state.page==='sample')document.querySelector('main')?.insertAdjacentHTML('afterbegin','<aside class="note notify-entry"><b>샘플 제작 오픈 소식을 받아보세요.</b><p>제작 파트너와 계약을 준비하고 있어요. 알림 신청만으로 결제되거나 제작이 시작되지 않습니다.</p>'+notificationButton()+'</aside>');
 if(state.page==='studio'){
  lastStep=state.step+1;event('step_'+lastStep,true);
  if(lastStep===7){event('design_complete',true);if(!completionShown&&!seen.has('completion_prompt')){completionShown=true;seen.add('completion_prompt');try{sessionStorage.setItem('threadform-events',JSON.stringify([...seen]));}catch{}queueMicrotask(()=>openNotification(true));}}
 }
 if(changed&&state.page==='lookbook')event('lookbook_open');
 if(changed&&state.page==='sample')event('sample_page');
}
function openNotification(complete=false){
 if(document.querySelector('#notify-dialog'))return;
 const dialog=document.createElement('dialog');dialog.id='notify-dialog';dialog.className='notification-dialog';dialog.setAttribute('aria-labelledby','notify-title');dialog.setAttribute('data-clarity-mask','true');
 dialog.innerHTML=`<button type="button" class="modal-close" data-notify-close aria-label="닫기">×</button><span class="eyebrow">YOUR NEXT CHAPTER</span><h2 id="notify-title">${complete?'첫 디자인 완성!':'내 옷을 실물로 만날 준비'}</h2><p>실제 샘플 제작이 열리면 가장 먼저 알려드릴게요.<br>알림 신청은 무료이며 제작 주문이 아닙니다.</p><form id="notification-form"><label class="field">이메일 (필수)<input name="email" type="email" required maxlength="254" autocomplete="email"></label><label class="field">이름 (선택)<input name="name" maxlength="80" autocomplete="name"></label><label class="field">어떤 옷을 만들고 싶으세요? (선택)<input name="idea" maxlength="300" placeholder="예: 지퍼 포켓이 달린 오버핏 후드"></label><input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="display:none"><details><summary>수집하는 정보와 보관 기간</summary><p class="hint">운영자: THREADFORM (qkrwodud818@gmail.com). 이메일과 선택 입력한 이름·만들고 싶은 옷을 샘플 제작 오픈 안내와 신청자 관리에 이용합니다. 알림 발송 후 1년 또는 동의 철회 시까지 보관합니다. 위 이메일로 동의 철회와 삭제를 요청할 수 있습니다. 동의하지 않아도 디자인 도구를 사용할 수 있습니다.</p></details><label class="check"><input type="checkbox" name="privacyConsent" required> [필수] 위 개인정보 수집·이용에 동의합니다.</label><label class="check"><input type="checkbox" name="marketingConsent" required> [필수] 샘플 제작 오픈 안내를 이메일로 받는 데 동의합니다. (광고성 정보 포함)</label><button type="submit" class="primary full">오픈 알림 신청하기</button><p id="notify-status" role="status" aria-live="polite"></p></form>`;
 document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
 dialog.querySelector('[data-notify-close]').onclick=()=>dialog.close();
 dialog.querySelector('form').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,status=form.querySelector('#notify-status'),button=form.querySelector('[type=submit]'),values=Object.fromEntries(new FormData(form));button.disabled=true;status.textContent='신청 내용을 저장하고 있어요…';
  try{
   const response=await fetch('/api/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,privacyConsent:values.privacyConsent==='on',marketingConsent:values.marketingConsent==='on'}),signal:AbortSignal.timeout(15000)});
   const result=await response.json();if(!response.ok||result.saved!==true)throw Error(result.error||'아직 저장되지 않았습니다. 잠시 후 다시 시도해 주세요.');
   event('notify_signup');form.innerHTML='<div class="note" role="status"><h3>신청 완료!</h3><p>오픈하면 가장 먼저 알려드릴게요.</p></div><button type="button" class="primary" data-notify-done>디자인 계속하기</button>';form.querySelector('button').onclick=()=>dialog.close();
  }catch(error){status.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 같은 이메일로 다시 신청해도 중복 저장되지 않습니다.':error.message;button.disabled=false;}
 };
}
export function initializeGrowth(){
 // Queue only event names: never identify visitors with emails or design contents.
 window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments);};
 fetch('/api/public-config').then(r=>r.ok?r.json():{}).then(({clarityId})=>{
  if(!/^[a-z0-9]{5,30}$/i.test(clarityId||''))return;
  const script=document.createElement('script');script.async=true;script.src='https://www.clarity.ms/tag/'+clarityId;document.head.append(script);
 }).catch(()=>{});
 document.addEventListener('click',e=>{if(e.target.closest('[data-notify-open]'))openNotification();if(e.target.closest('[data-action="brief"]'))event('pdf_download');if(e.target.closest('[data-action="mode"][data-value="3d"]'))event('view_3d');});
 document.addEventListener('pointerdown',e=>{if(e.isTrusted&&e.target.closest('.studio-layout'))designInteraction();},true);
 document.addEventListener('keydown',e=>{if(e.isTrusted&&['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&e.target.closest('.studio-layout'))designInteraction();},true);
 document.addEventListener('input',e=>{if(e.isTrusted&&e.target.closest('.studio-layout'))designInteraction();},true);
 window.addEventListener('pagehide',()=>{if(currentPage==='studio'&&lastStep)event('exit_step_'+lastStep);});
}
