import {config as c} from '/config.js';
import {initStyleEditor} from './style-editor.js';
import {initPhotoUpload} from './photo-upload.js';
const t=c.copy,root=document.querySelector('#design-app');
document.title=t.title;
document.documentElement.style.setProperty('--motion',`${c.time.transitionMs}ms`);
let expanded=false;
root.innerHTML=`<header><strong>${t.brand}</strong><span>${t.badge}</span></header>
<main class="workspace"><section class="canvas" aria-label="${t.canvas}"><h2 class="canvas-heading">${t.project}</h2>
<div class="tabs" role="tablist">${t.tabs.map((v,i)=>`<button role="tab" data-tab="${i}" aria-selected="${i===c.defaults.tab}">${v}</button>`).join('')}</div>
<div class="art"><svg viewBox="0 0 480 600" role="img" aria-label="${t.canvas}">
<g fill="#e2e6df" stroke="#cdd4c8" stroke-width="1.3"><ellipse cx="240" cy="64" rx="31" ry="39"/><path d="M224 99V119L175 139 141 251 166 266 197 198 194 346 179 562Q191 579 211 563L240 407 269 563Q289 579 301 562L286 346 283 198 314 266 339 251 305 139 256 119V99Z"/></g>
<g id="garment" fill="${c.colors[c.defaults.color].hex}" stroke="#74796c" stroke-width="1.8" stroke-linejoin="round"><path d="M210 127L166 143 106 292 146 312 188 227 183 391Q240 403 297 391L292 227 334 312 374 292 314 143 270 127Q240 154 210 127Z"/><path id="neck" d="M210 127Q240 172 270 127" fill="none"/><path d="M166 143L188 227M314 143L292 227M183 377Q240 389 297 377M111 279L152 299M328 299L369 279" fill="none" stroke-width="1"/><path id="pocket" d="M214 275H266L278 337H202Z" hidden fill="none"/><path id="cuffs" d="M106 292L146 312M334 312L374 292" hidden stroke-width="8"/><path id="cord" d="M231 388V423M249 388V423" hidden fill="none"/></g>
<g class="measure-lines" hidden fill="none" stroke="#6d896c" stroke-width="1" stroke-dasharray="4 4"><path d="M91 129V398M85 129H100M85 398H100M187 249H293M187 242V256M293 242V256"/><g fill="#536e53" stroke="none" font-size="12" font-family="Pretendard, sans-serif"><text x="69" y="268" id="length-label"></text><text x="229" y="239" id="chest-label"></text></g></g></svg></div>
<button class="photo-add"><b>＋</b>${t.photo}</button><input id="photo" type="file" accept="${c.limits.photoTypes.join(',')}" hidden><aside class="reference" hidden><img alt="${t.reference}"><button>${t.removePhoto}</button></aside><div class="caption">${t.frontMark}</div></section>
<aside class="properties"><button class="sheet-handle" aria-label="${t.sheet}" aria-expanded="false"></button><h1>${t.properties}</h1><p class="hint">${t.hint}</p><div class="panel-scroll">
${t.sections.map((label,i)=>`<details ${i===0?'open':''}><summary>${label}</summary>${i===0?c.measurements.map(m=>`<label class="measure">${m.label}<span class="number"><input aria-label="${m.label}" data-number="${m.key}" type="number" min="${m.min}" max="${m.max}" step="${m.step}" value="${m.value}"><small>${t.unit}</small></span><input aria-label="${m.label} ${t.unit}" data-range="${m.key}" type="range" min="${m.min}" max="${m.max}" step="${m.step}" value="${m.value}"></label>`).join(''):i===1?`<div class="swatches">${c.colors.map((v,n)=>`<button aria-label="${v.name}" title="${v.name}" data-color="${n}" aria-pressed="${n===c.defaults.color}" style="--swatch:${v.hex}"></button>`).join('')}</div>`:`<div class="choices">${(i===2?c.materials:c.details).map((v,n)=>`<button data-${i===2?'material':'detail'}="${n}" aria-pressed="${i===2&&n===c.defaults.material}">${v}</button>`).join('')}</div><p class="help">${i===2?t.materialHint:t.detailHint}</p>`}</details>`).join('')}</div></aside></main>
<footer class="quote"><div class="quote-copy"><small>${t.estimate}</small><strong>${t.pricePlaceholder}</strong></div><span class="dummy">${t.dummy}</span><button data-dialog="inquiry">${t.inquiry}</button><button class="primary" data-dialog="save">${t.save}</button></footer>
<dialog><h2>${t.dialogTitle}</h2><p></p><form method="dialog"><button>${t.close}</button></form></dialog>`;
const panel=root.querySelector('.properties'),handle=root.querySelector('.sheet-handle');
function setSheet(value){expanded=value;panel.style.setProperty('--sheet-offset',`${(expanded?0:c.sheet.expanded-c.sheet.collapsed)*100}dvh`);handle.setAttribute('aria-expanded',String(expanded));}
setSheet(false);
handle.onclick=()=>setSheet(!expanded);
let startY=null,dragged=false;
handle.onpointerdown=e=>{startY=e.clientY;dragged=false;handle.setPointerCapture(e.pointerId);};
handle.onpointermove=e=>{if(startY===null)return;const delta=e.clientY-startY;if(Math.abs(delta)>c.sheet.threshold)dragged=true;panel.classList.add('dragging');const base=expanded?0:(c.sheet.expanded-c.sheet.collapsed)*innerHeight;panel.style.setProperty('--sheet-offset',`${Math.max(0,Math.min((c.sheet.expanded-c.sheet.collapsed)*innerHeight,base+delta))}px`);};
handle.onpointerup=e=>{if(startY===null)return;const delta=e.clientY-startY;panel.classList.remove('dragging');if(dragged){setSheet(delta<0);handle.onclick=null;setTimeout(()=>handle.onclick=()=>setSheet(!expanded),0);}else setSheet(expanded);startY=null;};
handle.onpointercancel=()=>{startY=null;panel.classList.remove('dragging');setSheet(expanded);};
function message(text){root.querySelector('dialog p').textContent=text;root.querySelector('dialog').showModal();}
root.addEventListener('click',e=>{
 const tab=e.target.closest('[data-tab]');if(tab){const n=Number(tab.dataset.tab);if(n===2){const active=tab.getAttribute('aria-selected')!=='true';tab.setAttribute('aria-selected',active);root.querySelector('.measure-lines').toggleAttribute('hidden',!active);}else{root.querySelectorAll('[data-tab="0"],[data-tab="1"]').forEach(b=>b.setAttribute('aria-selected',String(b===tab)));root.querySelector('#neck').setAttribute('d',n===0?'M210 127Q240 172 270 127':'M210 127Q240 140 270 127');root.querySelector('.caption').textContent=n===0?t.frontMark:t.backMark;}return;}
 const color=e.target.closest('[data-color]');if(color){root.querySelector('#garment').setAttribute('fill',c.colors[Number(color.dataset.color)].hex);root.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b===color)));}
 const material=e.target.closest('[data-material]');if(material)root.querySelectorAll('[data-material]').forEach(b=>b.setAttribute('aria-pressed',String(b===material)));
 const detail=e.target.closest('[data-detail]');if(detail){const enabled=detail.getAttribute('aria-pressed')!=='true';detail.setAttribute('aria-pressed',enabled);root.querySelector('#'+['pocket','cuffs','cord'][Number(detail.dataset.detail)]).toggleAttribute('hidden',!enabled);}
 const action=e.target.closest('[data-dialog]');if(action)message(t[action.dataset.dialog+'Message']);
});
function updateLabels(){for(const key of ['length','chest'])root.querySelector('#'+key+'-label').textContent=root.querySelector(`[data-number="${key}"]`).value;}
root.addEventListener('input',e=>{const key=e.target.dataset.number||e.target.dataset.range;if(!key)return;const m=c.measurements.find(v=>v.key===key),raw=e.target.valueAsNumber;if(!Number.isFinite(raw))return;const value=Math.max(m.min,Math.min(m.max,raw));root.querySelector(`[data-number="${key}"]`).value=value;root.querySelector(`[data-range="${key}"]`).value=value;updateLabels();});updateLabels();
initPhotoUpload(root,initStyleEditor(root));
