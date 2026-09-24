import {config as c} from '/config.js';
import {validateAnalysis} from '/photo-schema.js';
export function initPhotoUpload(root,editor){
 const p=c.photoAnalysis,t=p.copy,file=root.querySelector('#photo'),ref=root.querySelector('.reference'),canvas=root.querySelector('.canvas');
 let url='',serial=0,result=null,pending=null;const jobs=new Map();
 const message=document.createElement('div');message.className='photo-status';message.setAttribute('role','status');canvas.append(message);
 const disclosure=document.createElement('p');disclosure.className='photo-privacy';disclosure.textContent=t.privacy;ref.append(disclosure);
 const panel=document.createElement('section');panel.className='photo-result';panel.hidden=true;root.querySelector('.panel-scroll').prepend(panel);
 const zoom=document.createElement('dialog');zoom.className='photo-zoom';zoom.innerHTML=`<form method="dialog"><button>${t.close}</button></form><img alt="${c.copy.reference}">`;root.append(zoom);
 const image=ref.querySelector('img');image.tabIndex=0;image.setAttribute('role','button');image.setAttribute('aria-label',t.zoom);
 const showZoom=()=>{if(!url)return;zoom.querySelector('img').src=url;zoom.showModal();};image.onclick=showZoom;image.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showZoom();}};
 const reader=f=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});
 async function analyze(f,hash){if(jobs.has(hash))return jobs.get(hash);const job=(async()=>{const res=await fetch(p.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:await reader(f)}),signal:AbortSignal.timeout(p.clientTimeoutMs)});const data=await res.json();if(res.status!==200)throw Object.assign(Error(data.code||'failed'),{code:data.code});return {analysis:validateAnalysis(data.analysis),cached:data.cached};})();jobs.set(hash,job);try{return await job;}catch(error){if(error.code==='unavailable'||error.code==='pending'||error.code==='limited')jobs.delete(hash);throw error;}}
 function renderResult(){
  panel.hidden=false;panel.replaceChildren();const heading=document.createElement('h3');heading.textContent=t.title;panel.append(heading);const note=document.createElement('p');note.textContent=t.estimate;panel.append(note);
  for(const key of p.fields){const row=document.createElement('div');row.className='analysis-field';row.dataset.field=key;const label=document.createElement('label');label.textContent=p.labels[key];label.htmlFor='analysis-'+key;row.append(label);
   if(result.confidence[key]<p.confidenceThreshold){const flag=document.createElement('span');flag.className='confidence-warning';flag.textContent='● '+t.review;row.append(flag);}
   if(key==='details'){const wrap=document.createElement('div');wrap.className='analysis-details';for(const code of p.enums.details){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=code;input.checked=result.details.includes(code);input.dataset.analysis=key;label.append(input,document.createTextNode(p.names[code]));wrap.append(label);}row.append(wrap);}
   else if(key==='colors'){const colors=document.createElement('div');colors.className='analysis-colors';result.colors.forEach((value,i)=>{const input=document.createElement('input');input.type='color';input.value=value;input.dataset.analysis=key;input.dataset.index=i;input.setAttribute('aria-label',p.labels[key]+' '+(i+1));colors.append(input);});row.append(colors);}
   else{const select=document.createElement('select');select.id='analysis-'+key;select.dataset.analysis=key;for(const value of p.enums[key]){const option=document.createElement('option');option.value=value;option.textContent=p.names[value];option.selected=result[key]===value;select.append(option);}row.append(select);}
   if(result.confidence[key]<p.confidenceThreshold){const confirm=document.createElement('button');confirm.type='button';confirm.dataset.confirm=key;confirm.textContent=t.confirm;row.append(confirm);}panel.append(row);
  }
 }
 function apply(data){result=structuredClone(data);editor.applyAnalysis(result);renderResult();}
 async function upload(f){
  const id=++serial;if(!f||!c.limits.photoTypes.includes(f.type)||f.size>p.maxBytes){message.textContent=t.invalid;return;}
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(f);image.src=url;ref.hidden=false;panel.hidden=true;pending=null;message.replaceChildren(document.createTextNode(t.loading));const revision=editor.getRevision();
  try{const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');const data=await analyze(f,hash);if(id!==serial)return;
   if(editor.getRevision()!==revision){pending=data.analysis;message.textContent=t.stale;const button=document.createElement('button');button.textContent=t.apply;button.onclick=()=>{if(pending){apply(pending);pending=null;message.textContent=t.success;}};message.append(button);return;}
   apply(data.analysis);message.textContent=data.analysis.kind==='unknown'?t.unknown:data.cached?t.cached:t.success;
  }catch(error){if(id===serial)message.textContent=t[error.code]||t.failed;}
 }
 file.onchange=()=>{const f=file.files?.[0];file.value='';if(f)upload(f);};
 root.querySelector('.photo-add').onclick=()=>file.click();
 ref.querySelector('button').onclick=()=>{serial++;if(url)URL.revokeObjectURL(url);url='';ref.hidden=true;image.removeAttribute('src');message.textContent='';panel.hidden=true;pending=null;zoom.close();zoom.querySelector('img').removeAttribute('src');};
 canvas.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';canvas.classList.add('photo-drop');}});
 canvas.addEventListener('dragleave',e=>{if(!canvas.contains(e.relatedTarget))canvas.classList.remove('photo-drop');});
 canvas.addEventListener('drop',e=>{e.preventDefault();canvas.classList.remove('photo-drop');const f=e.dataTransfer?.files?.[0];if(f)upload(f);});
 panel.addEventListener('change',e=>{const key=e.target.dataset.analysis;if(!key||!result)return;if(key==='details')result[key]=Array.from(panel.querySelectorAll('[data-analysis="details"]:checked'),x=>x.value);else if(key==='colors')result.colors[Number(e.target.dataset.index)]=e.target.value;else result[key]=e.target.value;result.confidence[key]=1;editor.applyAnalysis(result,key);renderResult();});
 panel.addEventListener('click',e=>{const key=e.target.dataset.confirm;if(!key||!result)return;result.confidence[key]=1;renderResult();});
 addEventListener('pagehide',()=>{serial++;if(url)URL.revokeObjectURL(url);});
}
