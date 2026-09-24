import {config as c} from '/config.js';
import {load,save,collection} from './state.js';
const w=c.welcome,t=w.copy,root=document.querySelector('#onboarding');
const escape=s=>String(s??'').replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
let state=load(storage),nextTimer,labelTimer,observer;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
document.title=t.title;
for(const [key,value]of Object.entries(w.time))document.documentElement.style.setProperty('--'+key,value+'ms');
const preloaded=w.scenes.map(s=>{const image=new Image();image.src=s.image;image.decode?.().catch(()=>{});return image;});
const brand=()=>state.answers.brandMode==='name'&&state.answers.brand.trim()?state.answers.brand.trim():t.defaultBrand;
const labelName=()=>brand()===t.defaultBrand?t.labelFallback:brand();
function persist(){const okay=save(storage,state),status=root.querySelector('.save-status');if(status){status.textContent=okay?t.saved:t.saveError;status.classList.toggle('error',!okay);}return okay;}
function cancel(){clearTimeout(nextTimer);clearTimeout(labelTimer);}
function labelMarkup(){return `<div class="label-display" role="img" aria-label="${escape(t.labelAlt)}"><div class="neck-label"><small>${escape(t.neck)}</small><strong class="brand-ink"></strong><span>${escape(t.made)}</span></div><div class="hang-tag"><span class="tag-hole"></span><small>${escape(t.hang)}</small><strong class="brand-ink"></strong><span>${escape(t.made)}</span></div></div>`;}
function updateLabel(animate=false){root.querySelectorAll('.brand-ink').forEach(el=>{el.textContent=labelName();el.style.fontFamily=w.fonts[state.answers.font].family;});const caption=root.querySelector('.label-caption');if(caption)caption.textContent=brand()===t.defaultBrand?t.emptyLabel:brand()+t.firstLabel;clearTimeout(labelTimer);root.querySelectorAll('.label-display').forEach(el=>el.classList.remove('shine'));if(animate)labelTimer=setTimeout(()=>{if(!reduced.matches)root.querySelectorAll('.label-display').forEach(el=>el.classList.add('shine'));},w.time.labelIdle);}
function base(){cancel();observer?.disconnect();root.innerHTML=`<header class="onboarding-header"><a href="${w.designRoute}" aria-label="${c.copy.brand}">${c.copy.brand}</a><div><span class="stage-count">${state.stage} / 3</span><button data-action="skip">${t.skip}</button></div></header><p class="save-status" role="status"></p><main id="step"></main>`;root.dataset.stage=state.stage;persist();}
function render(){base();if(state.stage===1)story();else if(state.stage===2)questions();else result();}
function go(stage){cancel();state.stage=stage;persist();render();}
function leave(picked){cancel();if(Number.isInteger(picked))state.picked=picked;state.completed=state.stage===3;persist();location.assign(w.designRoute+(state.stage===3?'?collection=1&look='+state.picked:''));}
function story(){
 const step=root.querySelector('#step');step.innerHTML=`<div class="story-scroll" tabindex="0" aria-label="${t.start}">${w.scenes.map((s,i)=>`<section class="story-scene" data-scene="${i}"><div class="scene-placeholder"><img src="${s.image}" alt="${escape(s.alt)}" decoding="async" fetchpriority="${i===state.scene?'high':'auto'}"></div><div class="scene-shade"></div><div class="scene-copy"><span>0${i+1} / 0${w.scenes.length}</span><h1>${s.text}</h1>${i===w.scenes.length-1?`<button class="primary" data-action="start">${t.start}<b>↗</b></button>`:`<button class="scroll-next" data-scene-next="${i+1}">${t.scroll} ↓</button>`}</div></section>`).join('')}</div>`;
 const scroller=step.querySelector('.story-scroll');step.querySelectorAll('img').forEach(image=>{if(image.complete&&image.naturalWidth)image.classList.add('loaded');image.onload=()=>image.classList.add('loaded');});
 observer=new IntersectionObserver(entries=>{for(const entry of entries){entry.target.classList.toggle('entered',entry.isIntersecting);if(entry.isIntersecting){state.scene=Number(entry.target.dataset.scene);persist();}}},{root:scroller,threshold:.6});
 const target=step.querySelector(`[data-scene="${state.scene}"]`);scroller.scrollTop=target.offsetTop;
 step.querySelectorAll('.story-scene').forEach(scene=>observer.observe(scene));
}
function questionMarkup(q,index){
 const a=state.answers;
 let body='';
 if(q.options)body=`<div class="option-grid">${q.options.map((v,i)=>`<button data-option="${i}" aria-pressed="${q.kind==='multi'?a.styles.includes(i):a[q.key]===i}"><span>${escape(v)}</span><i aria-hidden="true">${q.kind==='multi'&&a.styles.includes(i)||a[q.key]===i?'✓':'＋'}</i></button>`).join('')}</div>`;
 if(q.kind==='brand')body=`<div class="brand-workspace"><div class="brand-form"><label for="brand-name">${t.brandPlaceholder}</label><input id="brand-name" name="brand" autocomplete="organization" maxlength="${w.limits.brand}" value="${escape(a.brand)}" placeholder="${t.brandPlaceholder}"><div class="font-options" role="group" aria-label="${t.font}">${w.fonts.map((f,i)=>`<button data-font="${i}" style="font-family:${escape(f.family)}" aria-pressed="${i===a.font}">${f.name}</button>`).join('')}</div><div class="brand-alternatives"><button data-brand-mode="pending" aria-pressed="${a.brandMode==='pending'}">${t.pending}</button><button data-brand-mode="none" aria-pressed="${a.brandMode==='none'}">${t.none}</button></div></div><div>${labelMarkup()}<p class="label-caption"></p></div></div>`;
 if(q.kind==='text')body=`<label class="input-label" for="brand-mood">${t.optional}</label><textarea id="brand-mood" name="mood" maxlength="${w.limits.mood}" rows="3" placeholder="${t.moodPlaceholder}">${escape(a.mood)}</textarea>`;
 return `<article class="question-panel"><div class="question-number">${t.question} ${index+1} / ${w.questions.length}</div><h1 tabindex="-1">${q.title}</h1>${q.kind==='multi'?`<p class="question-hint">${t.styleHelp}</p>`:''}${body}<nav class="question-nav"><button data-action="back">← ${t.back}</button><button data-action="skip-question">${t.skipQuestion}</button><button class="primary" data-action="next">${t.next} →</button></nav></article>`;
}
function questions(){root.querySelector('#step').innerHTML=`<div class="question-shell"><div class="progress" role="progressbar" aria-label="${t.question}" aria-valuemin="0" aria-valuemax="${w.questions.length}"><span></span></div><div class="q-viewport"></div></div>`;showQuestion(false);}
function showQuestion(slide=true,direction=1){
 clearTimeout(labelTimer);const view=root.querySelector('.q-viewport');view.querySelectorAll('[inert]').forEach(el=>el.remove());const old=view.querySelector('.question-panel'),q=w.questions[state.question];
 const wrapper=document.createElement('div');wrapper.innerHTML=questionMarkup(q,state.question);const panel=wrapper.firstElementChild;view.append(panel);
 const progress=root.querySelector('.progress');progress.setAttribute('aria-valuenow',state.question+1);progress.querySelector('span').style.transform=`scaleX(${(state.question+1)/w.questions.length})`;
 if(old){old.inert=true;old.setAttribute('aria-hidden','true');}
 if(slide&&!reduced.matches&&old){panel.classList.add(direction>0?'from-right':'from-left');requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!panel.isConnected)return;panel.classList.add('arrived');old.classList.add(direction>0?'out-left':'out-right');}));setTimeout(()=>{old.remove();if(panel.isConnected&&!panel.inert)panel.querySelector('h1').focus({preventScroll:true});},w.time.slide);}else{old?.remove();panel.querySelector('h1').focus({preventScroll:true});}
 updateLabel();persist();
}
function advance(){clearTimeout(nextTimer);if(state.question>=w.questions.length-1){go(3);return;}state.question++;persist();showQuestion(true);}
function later(){clearTimeout(nextTimer);nextTimer=setTimeout(advance,w.time.advance);}
function lookImage(s){const length=s.values.length*2.55,half=s.values.chest*.95,arm=s.values.sleeve*1.4,tip=74+arm;return `<svg viewBox="0 0 300 280" role="img" aria-label="${escape(s.kind)}"><path d="M125 38L${150-half} 55 35 ${tip} 68 ${tip+15} ${160-half} 112 ${160-half} ${55+length}H${140+half}L${140+half} 112 232 ${tip+15} 265 ${tip} ${150+half} 55 175 38Q150 62 125 38Z" fill="${c.colors[s.color].hex}" stroke="#6e7965" stroke-width="1.5"/>${s.feature==='hood'?'<path d="M125 38Q150 -5 175 38L167 67H133Z" fill="none" stroke="#6e7965"/>':s.feature==='zip'||s.feature==='jacket'?'<path d="M150 50V'+(55+length)+'" stroke="#6e7965"/>':''}${s.details.includes(0)?'<path d="M126 148H174L184 190H116Z" fill="none" stroke="#6e7965"/>':''}${s.details.includes(1)?'<path d="M35 '+tip+'L68 '+(tip+15)+'M232 '+(tip+15)+'L265 '+tip+'" stroke="#6e7965" stroke-width="5"/>':''}</svg>`;}
function result(){
 const looks=collection(state);root.querySelector('#step').innerHTML=`<section class="collection"><p class="eyebrow">${t.made}</p><h1>${escape(brand())}${t.collectionSuffix}</h1><p>${t.collectionSub}</p><div class="collection-label">${labelMarkup()}</div><div class="collection-grid">${looks.map((s,i)=>`<button class="look ${i===state.picked?'selected':''}" data-look="${i}" aria-pressed="${i===state.picked}" style="--delay:${i*w.time.stagger}ms">${lookImage(s)}<span>${escape(s.tag)}</span><strong>${escape(s.name)}</strong><small>${escape(s.kind)} · ${escape(s.fit)}</small></button>`).join('')}</div><p class="promise">${t.promise}</p><small class="schedule">${t.schedule}</small><p class="price">${t.price}</p><div class="result-actions"><button data-action="edit">${t.edit}</button><button class="primary" data-action="choose">${t.choose} ↗</button></div></section>`;updateLabel();
}
root.addEventListener('click',e=>{
 if(e.target.closest('.question-panel')?.inert)return;
 const action=e.target.closest('[data-action]')?.dataset.action;
 if(action){cancel();if(action==='skip')return leave();if(action==='start')return go(2);if(action==='next'||action==='skip-question')return advance();if(action==='back'){if(state.question===0)return go(1);state.question--;persist();showQuestion(true,-1);return;}if(action==='edit'){state.question=0;return go(2);}if(action==='choose')return leave(state.picked);}
 const scene=e.target.closest('[data-scene-next]');if(scene){const target=root.querySelector(`[data-scene="${scene.dataset.sceneNext}"]`);root.querySelector('.story-scroll').scrollTo({top:target.offsetTop,behavior:reduced.matches?'instant':'smooth'});return;}
 const panel=e.target.closest('.question-panel');if(panel?.inert)return;
 const option=e.target.closest('[data-option]');if(option&&state.stage===2){const q=w.questions[state.question],n=Number(option.dataset.option);clearTimeout(nextTimer);if(q.kind==='multi'){const list=state.answers.styles;if(list.includes(n))state.answers.styles=list.filter(x=>x!==n);else if(list.length<w.limits.styles)state.answers.styles=[...list,n];panel.querySelectorAll('[data-option]').forEach(b=>{const selected=state.answers.styles.includes(Number(b.dataset.option));b.setAttribute('aria-pressed',selected);b.querySelector('i').textContent=selected?'✓':'＋';});persist();if(state.answers.styles.length===w.limits.styles)later();}else{state.answers[q.key]=n;panel.querySelectorAll('[data-option]').forEach(b=>{b.setAttribute('aria-pressed',b===option);b.querySelector('i').textContent=b===option?'✓':'＋';});persist();later();}return;}
 const font=e.target.closest('[data-font]');if(font){clearTimeout(nextTimer);state.answers.font=Number(font.dataset.font);panel.querySelectorAll('[data-font]').forEach(b=>b.setAttribute('aria-pressed',b===font));persist();updateLabel(true);return;}
 const mode=e.target.closest('[data-brand-mode]');if(mode){state.answers.brandMode=mode.dataset.brandMode;state.answers.brand='';panel.querySelector('input').value='';panel.querySelectorAll('[data-brand-mode]').forEach(b=>b.setAttribute('aria-pressed',b===mode));persist();updateLabel();later();return;}
 const look=e.target.closest('[data-look]');if(look){state.picked=Number(look.dataset.look);root.querySelectorAll('[data-look]').forEach(b=>{b.classList.toggle('selected',b===look);b.setAttribute('aria-pressed',b===look);});persist();}
});
root.addEventListener('input',e=>{if(e.target.closest('.question-panel')?.inert)return;if(e.target.name==='brand'){clearTimeout(nextTimer);state.answers.brand=e.target.value.slice(0,w.limits.brand);state.answers.brandMode=state.answers.brand.trim()?'name':'';root.querySelectorAll('[data-brand-mode]').forEach(b=>b.setAttribute('aria-pressed','false'));persist();updateLabel(true);}if(e.target.name==='mood'){state.answers.mood=e.target.value.slice(0,w.limits.mood);persist();}});
root.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.name==='brand'&&!e.isComposing){e.preventDefault();advance();}});
addEventListener('pagehide',()=>{cancel();persist();observer?.disconnect();});
render();
