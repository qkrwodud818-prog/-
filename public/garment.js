import {renderSleeve,detail as sleeveDetail} from './sleeve.js';
/** Parametric, dependency-free garment preview. All user strings are escaped. */
export function escapeXml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
}

const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback));
const safeColor = (value, fallback) => /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value || '') ? value : fallback;

/** Four pixels represent one centimetre. HPS remains fixed during editing. */
export function garmentGeometry(d={}) {
  const value=(key,def,min=0,max=100)=>clamp(d[key],min,max,def);
  const scale=4,hps=150,fitOffset=0;
  const chest=value('chest',64,32,90),length=value('length',66,35,100),shoulder=value('shoulder',58,28,80);
  const shoulderY=hps+value('shoulderDrop',6,0,18)*scale;
  const angle=value('sleeveAngle',52,5,80)*Math.PI/180;
  const sleeve=value('sleeve',d.type==='tshirt'?23:60,0,75);
  const shoulderX=300-shoulder*2-fitOffset;
  const cuffX=shoulderX-Math.cos(angle)*sleeve*scale,cuffY=shoulderY+Math.sin(angle)*sleeve*scale;
  const halfCuff=value('cuff',11,6,35)*2,halfBicep=value('bicep',25,12,42)*2;
  return {scale,hps,left:300-chest*2-fitOffset,right:300+chest*2+fitOffset,bottom:hps+length*scale,
    shoulderX,shoulderY,cuffX,cuffY,angle,halfCuff,halfBicep,
    hemLeft:300-value('hem',60,32,90)*2,hemRight:300+value('hem',60,32,90)*2,
    neckLeft:300-value('neckWidth',21,10,36)*2,neckRight:300+value('neckWidth',21,10,36)*2,
    underarmY:shoulderY+value('armhole',26,12,40)*4,hemRib:value('hemRib',6,0,16)*4,cuffRib:value('cuffRib',6,0,16)*4,
    frontDepth:value('neckFront',10,1,30)*4,backDepth:value('neckBack',3,1,16)*4};
}
export function handleValue(key,x,y,design={}) {
  const g=garmentGeometry(design),dx=g.shoulderX-x,dy=y-g.shoulderY;
  const map={length:(y-g.hps)/4,chest:Math.abs(x-300)/2,hem:Math.abs(x-300)/2,shoulder:Math.abs(x-300)/2,shoulderDrop:(y-g.hps)/4,
    armhole:(y-g.shoulderY)/4,neckWidth:Math.abs(x-300)/2,neckFront:(y-g.hps)/4,neckBack:(y-g.hps)/4,hemRib:(g.bottom-y)/4,
    sleeve:Math.hypot(dx,dy)/4,sleeveAngle:Math.atan2(dy,Math.abs(dx))*180/Math.PI,
    cuff:Math.abs((x-g.cuffX)*Math.sin(g.angle)+(y-g.cuffY)*Math.cos(g.angle))/2,
    cuffRib:Math.max(0,((x-g.cuffX)*Math.cos(g.angle)-(y-g.cuffY)*Math.sin(g.angle))/4),
    bicep:Math.abs((x-g.shoulderX)*Math.sin(g.angle)+(y-g.shoulderY)*Math.cos(g.angle))/2};
  return Math.round((map[key]??design[key]??0)*2)/2;
}

export function renderGarment(design={},view='front',options={}) {
  if(view==='left'||view==='right') return renderSleeve(design,view,options);
  const {interactive=false,selectedGraphic=null,selectedDetail=null,technical=false,showMeasurements=false,handles=false,idPrefix='main'}=options;
  const id=String(idPrefix).replace(/[^a-zA-Z0-9_-]/g,'')||'garment',g=garmentGeometry(design),back=view==='back',type=design.type||'hoodie';
  const colors=design.colors||{},body=safeColor(colors.body,'#626b4f'),sleeves=safeColor(colors.sleeves,body),rib=safeColor(colors.rib,body),hood=safeColor(colors.hood,body);
  const neck=design.neckline||(['hoodie','ziphoodie','denimhoodie'].includes(type)?'hood':type==='polo'?'polo':type==='turtlehenley'?'turtle':'round');
  const paths=[],part=n=>interactive?` data-part="${n}" style="cursor:pointer"`:'';
  const shape=(d,fill,name='body')=>{paths.push(d);return `<g${part(name)}><path d="${d}" fill="${fill}" stroke="#263027" stroke-width="${technical?2:1.3}"/>${technical?'':`<path d="${d}" fill="url(#${id}-cloth)"/><path d="${d}" fill="url(#${id}-fabric)" opacity=".16"/>`}</g>`;};
  const line=(d,dash=false)=>`<path d="${d}" fill="none" stroke="#263027" stroke-width="1"${dash?' stroke-dasharray="3 3"':''} pointer-events="none"/>`;
  const c=Math.cos(g.angle),s=Math.sin(g.angle),point=(x,y)=>`${x.toFixed(2)} ${y.toFixed(2)}`;
  const outer=[g.cuffX-g.halfCuff*s,g.cuffY-g.halfCuff*c],inner=[g.cuffX+g.halfCuff*s,g.cuffY+g.halfCuff*c];
  const sleevePath=(mirror=false)=>{
    const p=(x,y)=>point(mirror?600-x:x,y);
    return `M${p(g.shoulderX,g.shoulderY)} L${p(...outer)} L${p(...inner)} L${p(g.shoulderX+g.halfBicep*s,g.shoulderY+g.halfBicep*c)} L${p(g.left,g.underarmY)}Z`;
  };
  let drawing='';
  if(type!=='tank'&&Number(design.sleeve??60)>0){
    drawing+=`<g ${interactive?`data-sleeve-focus="${back?'left':'right'}" role="button" tabindex="0" aria-label="소매 확대"`:''}>${shape(sleevePath(),sleeves,'sleeves')}</g><g ${interactive?`data-sleeve-focus="${back?'right':'left'}" role="button" tabindex="0" aria-label="소매 확대"`:''}>${shape(sleevePath(true),sleeves,'sleeves')}</g>`;
    for(const mirror of [false,true]){
      const p=(x,y)=>point(mirror?600-x:x,y);
      if(g.cuffRib>0)drawing+=shape(`M${p(...outer)}L${p(...inner)}L${p(inner[0]+c*g.cuffRib,inner[1]-s*g.cuffRib)}L${p(outer[0]+c*g.cuffRib,outer[1]-s*g.cuffRib)}Z`,rib,'rib');
      drawing+=line(`M${p(outer[0]+c*5,outer[1]-s*5)}L${p(inner[0]+c*5,inner[1]-s*5)}`,true);
    }
  }
  const depth=back?g.backDepth:g.frontDepth;
  const neckCurve=neck==='v'&&!back?`L300 ${g.hps+depth}L${g.neckRight} ${g.hps}`:`Q300 ${g.hps+depth*2} ${g.neckRight} ${g.hps}`;
  const torso=`M${g.neckLeft} ${g.hps}${neckCurve} L${600-g.shoulderX} ${g.shoulderY} L${g.right} ${g.underarmY} L${g.hemRight} ${g.bottom} L${g.hemLeft} ${g.bottom} L${g.left} ${g.underarmY}L${g.shoulderX} ${g.shoulderY}Z`;
  drawing+=shape(torso,body);
  drawing+=line(`M${g.shoulderX} ${g.shoulderY}L${g.left} ${g.underarmY}M${600-g.shoulderX} ${g.shoulderY}L${g.right} ${g.underarmY}`);
  if(g.hemRib>0)drawing+=shape(`M${g.hemLeft} ${g.bottom-g.hemRib}H${g.hemRight}V${g.bottom}H${g.hemLeft}Z`,rib,'rib');
  drawing+=line(`M${g.hemLeft+3} ${g.bottom-5}H${g.hemRight-3}`,true);
  if(neck==='hood'){
    const hp=`M${g.neckLeft} ${g.hps+12}Q${g.neckLeft-25} ${g.hps-68} 300 ${g.hps-72}Q${g.neckRight+25} ${g.hps-68} ${g.neckRight} ${g.hps+12}Q300 ${g.hps+(back?110:65)} ${g.neckLeft} ${g.hps+12}Z`;
    drawing+=shape(hp,hood,'hood');drawing+=line(back?`M300 ${g.hps-65}V${g.hps+65}`:`M${g.neckLeft+10} ${g.hps}Q300 ${g.hps-78} ${g.neckRight-10} ${g.hps}L300 ${g.hps+34}Z`,true);
  }else if(neck==='turtle'||neck==='mock'){
    const h=neck==='turtle'?42:22;drawing+=shape(`M${g.neckLeft} ${g.hps+8}V${g.hps-h}Q300 ${g.hps-h-12} ${g.neckRight} ${g.hps-h}V${g.hps+8}Q300 ${g.hps+25} ${g.neckLeft} ${g.hps+8}Z`,hood,'hood');
  }else{
    drawing+=shape(`M${g.neckLeft} ${g.hps}Q300 ${g.hps+depth*2} ${g.neckRight} ${g.hps}L${g.neckRight+5} ${g.hps+5}Q300 ${g.hps+depth*2+12} ${g.neckLeft-5} ${g.hps+5}Z`,hood,'hood');
    if(neck==='polo'&&!back)drawing+=shape(`M${g.neckLeft} ${g.hps}L300 ${g.hps+32}L${g.neckLeft+8} ${g.hps+50}L${g.neckLeft-12} ${g.hps+15}ZM${g.neckRight} ${g.hps}L300 ${g.hps+32}L${g.neckRight-8} ${g.hps+50}L${g.neckRight+12} ${g.hps+15}Z`,hood,'hood');
  }
  if(!back){
    if(design.pocket)drawing+=shape(`M245 ${g.bottom-110}H355L370 ${g.bottom-48}H230Z`,body);
    const centerDetail=(design.details||[]).some(d=>d.view==='front'&&['henley','halfzip','fullzip'].includes(d.type)),full=design.zipper&&!centerDetail;
    if(full||type==='halfzip'&&!centerDetail)drawing+=line(`M298 ${g.hps+depth}V${full?g.bottom:g.hps+150}M302 ${g.hps+depth}V${full?g.bottom:g.hps+150}`,true);
    if(['henley','polo','turtlehenley'].includes(type)&&!centerDetail){drawing+=shape(`M293 ${g.hps+depth}H307V${g.hps+depth+65}H293Z`,body);for(let i=0;i<3;i++)drawing+=`<circle cx="300" cy="${g.hps+depth+12+i*20}" r="2.5" fill="#263027"/>`;}
  }
  if(type==='trackjacket')drawing+=line(`M${g.shoulderX-8} ${g.shoulderY}L${g.cuffX-6} ${g.cuffY}M${600-g.shoulderX+8} ${g.shoulderY}L${606-g.cuffX} ${g.cuffY}`);
  if(type==='windbreaker')drawing+=line(`M${g.left} ${g.underarmY}Q300 ${g.underarmY+20} ${g.right} ${g.underarmY}`);
  if(type==='denimhoodie')drawing+=line(`M${g.left+20} ${g.underarmY}H${g.right-20}M${g.left+20} ${g.underarmY+4}H${g.right-20}`,true);
  const pattern=design.pattern||{},tile=clamp(pattern.scale,.5,30,4)*4,pc=safeColor(pattern.color,'#eee9df');
  const image=src=>typeof src==='string'&&src.length<=8000000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src);
  const patternInk=pattern.type==='horizontal'?`<path d="M0 0H${tile}" stroke="${pc}" stroke-width="${tile/3}"/>`:pattern.type==='vertical'?`<path d="M0 0V${tile}" stroke="${pc}" stroke-width="${tile/3}"/>`:pattern.type==='gingham'?`<path d="M0 0H${tile}M0 0V${tile}" stroke="${pc}" stroke-width="${tile/2}" opacity=".55"/>`:pattern.type==='dots'?`<circle cx="${tile/2}" cy="${tile/2}" r="${tile/5}" fill="${pc}"/>`:pattern.type==='image'&&image(pattern.image)?`<image href="${escapeXml(pattern.image)}" width="${tile}" height="${tile}"/>`:'';
  const fabric=String(design.fabric||''),weave=/denim|chino/.test(fabric)?'<path d="M-4 4L4-4M0 8L8 0M4 12L12 4" stroke="#fff" stroke-width="1.5"/>':/rib|corduroy/.test(fabric)?'<path d="M2 0V8M6 0V8" stroke="#111"/>':/mesh|pique/.test(fabric)?'<circle cx="2" cy="2" r="1.2" fill="#111"/><circle cx="6" cy="6" r="1.2" fill="#111"/>':/waffle|ripstop|quilt/.test(fabric)?'<path d="M0 0H8V8H0Z" stroke="#111" fill="none"/>':'<path d="M0 2L2 4L4 2M4 6L6 8L8 6" stroke="#fff" fill="none"/>';
  const defs=`<defs><pattern id="${id}-fabric" width="8" height="8" patternUnits="userSpaceOnUse">${weave}</pattern><linearGradient id="${id}-cloth"><stop stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient><clipPath id="${id}-silhouette">${paths.map(p=>`<path d="${p}"/>`).join('')}</clipPath><pattern id="${id}-pattern" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse">${patternInk}</pattern></defs>`;
  const overlays=(Array.isArray(design.details)?design.details:[]).filter(d=>d&&d.view===view).map(d=>renderDetail(d,interactive,selectedDetail)).join('');
  const graphics=(Array.isArray(design.graphics)?design.graphics:[]).filter(a=>a&&a.view===view).map(a=>{
    const x=clamp(a.x,0,600,300),y=clamp(a.y,0,640,300),size=clamp(a.size,16,140,36),rotation=clamp(a.rotation,-180,180,0);
    const content=a.kind==='image'&&image(a.src)?`<image href="${escapeXml(a.src)}" x="${-size}" y="${-size}" width="${size*2}" height="${size*2}" preserveAspectRatio="xMidYMid meet"/>`:a.kind==='text'?`<text text-anchor="middle" dominant-baseline="middle" font-family="Pretendard,sans-serif" font-weight="800" font-size="${size}" fill="${safeColor(a.color,'#f5f2e9')}">${escapeXml(a.text||'')}</text>`:'';
    return `<g transform="translate(${x} ${y}) rotate(${rotation})"${interactive?` data-graphic-id="${escapeXml(a.id)}" style="cursor:move"`:''}>${content}${interactive&&selectedGraphic===a.id?`<rect x="${-size*2}" y="${-size}" width="${size*4}" height="${size*2}" fill="none" stroke="#78a6ff" stroke-dasharray="4 3"/><rect data-resize-graphic="${escapeXml(a.id)}" x="${size*2-5}" y="${size-5}" width="10" height="10" fill="#78a6ff"/>`:''}</g>`;
  }).join('');
  const handlePoints={length:[g.hemLeft,g.bottom],chest:[g.left,g.underarmY+10],hem:[g.hemRight,g.bottom],shoulder:[g.shoulderX,g.shoulderY],shoulderDrop:[600-g.shoulderX,g.shoulderY],armhole:[g.right,g.underarmY],sleeve:[g.cuffX,g.cuffY],sleeveAngle:[600-g.cuffX,g.cuffY],cuff:inner,bicep:[g.shoulderX+g.halfBicep*s,g.shoulderY+g.halfBicep*c],neckWidth:[g.neckLeft,g.hps],neckFront:[300,g.hps+g.frontDepth],neckBack:[300,g.hps+g.backDepth],hemRib:[g.hemRight,g.bottom-g.hemRib],cuffRib:[g.cuffX+c*g.cuffRib,g.cuffY-s*g.cuffRib]};
  const knobs=handles?Object.entries(handlePoints).filter(([k])=>!(back&&k==='neckFront')&&!(!back&&k==='neckBack')).map(([key,[x,y]])=>`<g data-handle="${key}" data-handle-axis="${['length','shoulderDrop','armhole','neckFront','neckBack','hemRib'].includes(key)?'y':'xy'}" style="cursor:move"><title>${key}: ${design[key]??''}</title>${key.endsWith('Rib')?`<rect x="${x-5}" y="${y-5}" width="10" height="10"`:`<circle cx="${x}" cy="${y}" r="5"`} fill="#4d8dff" stroke="white" stroke-width="2"/></g>`).join(''):'';
  const measures=showMeasurements?renderMeasurements(g,design,back):'';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 640" class="garment-svg" role="${interactive?'group':'img'}" aria-label="${escapeXml(design.name||'의류 디자인')} ${escapeXml(view)} 미리보기">${defs}${drawing}${patternInk?`<g clip-path="url(#${id}-silhouette)" pointer-events="none"><rect width="600" height="640" fill="url(#${id}-pattern)" opacity=".7"/></g>`:''}${image(design.fabricImage)&&!technical?`<g clip-path="url(#${id}-silhouette)" pointer-events="none"><image href="${escapeXml(design.fabricImage)}" width="600" height="640" opacity=".2"/></g>`:''}<g clip-path="url(#${id}-silhouette)">${graphics}${overlays}${options.skipSleeveOverlays?'':sleeveOverlays(design,g,back)}</g>${measures}${knobs}</svg>`;
}

function renderMeasurements(g,d,back) {
  const dims=[['A',g.hemRight+20,g.hps,g.hemRight+20,g.bottom,d.length],['B',g.left,g.underarmY+10,g.right,g.underarmY+10,d.chest],['C',g.hemLeft,g.bottom+18,g.hemRight,g.bottom+18,d.hem],['D',g.shoulderX,g.shoulderY-14,600-g.shoulderX,g.shoulderY-14,d.shoulder],['E',g.shoulderX,g.shoulderY,g.cuffX,g.cuffY,d.sleeve],['H',g.right+10,g.shoulderY,g.right+10,g.underarmY,d.armhole],['I',g.neckLeft,g.hps-12,g.neckRight,g.hps-12,d.neckWidth],[back?'K':'J',300,g.hps,300,g.hps+(back?g.backDepth:g.frontDepth),back?d.neckBack:d.neckFront],['L',g.shoulderX-12,g.hps,g.shoulderX-12,g.shoulderY,d.shoulderDrop],['M',g.hemLeft-10,g.bottom-g.hemRib,g.hemLeft-10,g.bottom,d.hemRib],['N',g.cuffX,g.cuffY,g.cuffX+Math.cos(g.angle)*g.cuffRib,g.cuffY-Math.sin(g.angle)*g.cuffRib,d.cuffRib],['F',g.shoulderX,g.shoulderY,g.shoulderX+Math.sin(g.angle)*g.halfBicep,g.shoulderY+Math.cos(g.angle)*g.halfBicep,d.bicep],['G',g.cuffX-Math.sin(g.angle)*g.halfCuff,g.cuffY-Math.cos(g.angle)*g.halfCuff,g.cuffX+Math.sin(g.angle)*g.halfCuff,g.cuffY+Math.cos(g.angle)*g.halfCuff,d.cuff]];
  return `<g pointer-events="none" font-family="Pretendard,sans-serif" font-size="10" fill="#2b6dc4">${dims.map(([code,x1,y1,x2,y2,n])=>`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#2b6dc4" stroke-width=".8" stroke-dasharray="3 2"/><text x="${(x1+x2)/2+5}" y="${(y1+y2)/2-5}">${code} ${escapeXml(n??'')}cm</text>`).join('')}</g>`;
}
function renderDetail(d,interactive,selected) {
 const x=clamp(d.x,0,600,300),y=clamp(d.y,0,640,300),w=clamp(d.width,6,250,50),h=clamp(d.height,6,320,70),col=safeColor(d.color,'#30352d');
 let art='';
 if(/zip/.test(d.type||'')){const metal=d.zipperType==='골드'?'#b8923d':d.zipperType==='검정'?'#222':d.zipperType==='동색'?col:'#aaaeb3';art=`<path d="M-3 ${-h/2}V${h/2}M3 ${-h/2}V${h/2}" stroke="${col}" stroke-width="2"/><path d="M0 ${-h/2}V${h/2}" stroke="${metal}" stroke-width="3" stroke-dasharray="2 2"/><rect x="-4" y="${-h/2}" width="8" height="12" rx="2" fill="${metal}"/>`;}
 else if(d.type==='henley'){art=`<rect x="-8" y="${-h/2}" width="16" height="${h}" fill="none" stroke="${col}"/>`;for(let i=0,n=Math.round(clamp(d.buttons,0,12,3));i<n;i++)art+=`<circle cx="0" cy="${-h/2+(i+1)*h/(n+1)}" r="2.5" fill="${col}"/>`;}
 else if(d.type==='polo')art=`<path d="M${-w/2} ${-h/2}L0 0L${-w/3} ${h/2}ZM${w/2} ${-h/2}L0 0L${w/3} ${h/2}Z" fill="${col}"/>`;
 else if(d.type==='thumbhole'||d.type==='elbow')art=`<ellipse rx="${w/2}" ry="${h/2}" fill="${d.type==='elbow'?col:'none'}" stroke="${col}" stroke-width="2"/>`;
 else if(d.type==='drawstring')art=`<path d="M${-w/2} ${-h/2}Q0 ${h/2} ${w/2} ${-h/2}M0 0V${h/2}" fill="none" stroke="${col}" stroke-width="3"/>`;
 else if(d.type==='slit')art=`<path d="M0 ${-h/2}V${h/2}" stroke="${col}" stroke-width="3"/>`;
 else art=`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${d.type==='kangaroo'?12:2}" fill="${['tape','label','mockneck','turtleneck'].includes(d.type)?col:'none'}" stroke="${col}" stroke-width="1.5"/><path d="M${-w/2+4} ${-h/2+5}H${w/2-4}" stroke="${col}" stroke-dasharray="3 2"/>`;
 const tag=interactive?` data-detail-id="${escapeXml(d.id)}" style="cursor:move"`:'';
 const outline=interactive&&selected===d.id?`<rect x="${-w/2-5}" y="${-h/2-5}" width="${w+10}" height="${h+10}" fill="none" stroke="#4d8dff" stroke-dasharray="4 3"/>`:'';
 return `<g transform="translate(${x} ${y}) rotate(${clamp(d.rotation,-180,180,0)})"${tag}>${art}${outline}</g>${d.symmetric&&Math.abs(x-300)>2?`<g transform="translate(${600-x} ${y}) rotate(${-clamp(d.rotation,-180,180,0)})"${tag}>${art}</g>`:''}`;
}

function renderLegacy(design = {}, view = 'front', { interactive = false, selectedGraphic = null, idPrefix = 'main' } = {}) {
  const id = String(idPrefix).replace(/[^a-zA-Z0-9_-]/g, '') || 'garment';
  const type = ['hoodie', 'sweatshirt', 'tshirt'].includes(design.type) ? design.type : 'hoodie';
  const side = view === 'left' || view === 'right';
  const back = view === 'back';
  const tee = type === 'tshirt';
  const hoodie = type === 'hoodie';
  const colors = design.colors || {};
  const body = safeColor(colors.body, '#65704c');
  const sleeves = safeColor(colors.sleeves, body);
  const hood = safeColor(colors.hood, body);
  const rib = safeColor(colors.rib, body);
  const width = clamp(design.chest, 50, 76, 64) * 1.78 + (design.fit === 'oversized' ? 8 : design.fit === 'boxy' ? 12 : 0);
  const bottom = 465 + (clamp(design.length, 48, 82, 66) - 66) * 4.1;
  const shoulderY = design.fit === 'regular' ? 190 : 205;
  const left = 300 - width;
  const right = 300 + width;
  const sleeveLength = clamp(design.sleeve, 18, 68, tee ? 24 : 60);
  const cuffY = 272 + (sleeveLength - 18) * 3.4;
  const cuffX = 110 - (sleeveLength - 18) * .76;
  const part = name => interactive ? ` data-part="${name}" style="cursor:pointer"` : '';
  const defs = `<defs>
    <linearGradient id="${id}-cloth" x1="0" x2="1" y1="0" y2=".35"><stop stop-color="#fff" stop-opacity=".13"/><stop offset=".25" stop-color="#fff" stop-opacity=".025"/><stop offset=".55" stop-color="#000" stop-opacity=".025"/><stop offset=".82" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".04"/></linearGradient>
    <linearGradient id="${id}-fold" x1="0" x2="1"><stop stop-color="#000" stop-opacity=".15"/><stop offset=".5" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity=".11"/></linearGradient>
    <linearGradient id="${id}-hood" x1="0" x2=".8" y1="0" y2="1"><stop stop-color="#fff" stop-opacity=".18"/><stop offset=".7" stop-color="#000" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
    <pattern id="${id}-ribbing" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M1 0V4" stroke="#000" stroke-opacity=".13" stroke-width=".75"/></pattern>
    <pattern id="${id}-weave" width="${design.fabric === 'jersey' ? 3 : 5}" height="5" patternUnits="userSpaceOnUse"><path d="M1 1l1 1m1 1l1 1" stroke="#fff" stroke-opacity="${design.fabric === 'brushed' ? '.09' : '.045'}" stroke-width=".7"/></pattern>
  </defs>`;
  let shapes = [];
  let details = '';
  const shape = (d, fill, name, shade = 'cloth') => {
    shapes.push(d);
    return `<g${part(name)}><path d="${d}" fill="${fill}" stroke="#192118" stroke-opacity=".24" stroke-width="1.4"/><path d="${d}" fill="url(#${id}-${shade})"/><path d="${d}" fill="url(#${id}-weave)"/></g>`;
  };
  const seam = (d, opacity = '.23', dashed = false) => `<path d="${d}" fill="none" stroke="#253020" stroke-opacity="${opacity}" stroke-width="1.25"${dashed ? ' stroke-dasharray="2 3"' : ''} pointer-events="none"/>`;
  if (side) {
    const sx = 227;
    const ex = 355 + (width - 114) * .3;
    const mirror = view === 'right' ? 'translate(600 0) scale(-1 1)' : '';
    const torso = `M${sx} 192 Q280 173 ${ex} 202 L${ex + 8} ${bottom - 24} Q300 ${bottom + 1} ${sx + 5} ${bottom - 14}Z`;
    const sleeve = `M263 ${shoulderY} Q300 183 320 226 L340 ${cuffY} L282 ${cuffY + 10} L247 244Q239 213 263 ${shoulderY}Z`;
    details += `<g transform="${mirror}">`;
    details += shape(torso, body, 'body');
    if (hoodie) {
      details += shape('M226 195 Q202 149 235 112 Q280 97 311 127 Q342 157 341 202 L303 222 Q275 193 226 195Z', hood, 'hood', 'hood');
      details += seam('M235 119Q216 151 238 184Q268 192 304 212');
      details += seam('M303 132Q288 153 301 187', '.14');
    } else {
      details += shape('M232 190Q271 174 309 190L305 203Q265 190 234 204Z', hood, 'hood');
    }
    if (design.pocket && !tee) details += shape(`M${ex - 19} ${bottom - 132}Q${ex + 12} ${bottom - 107} ${ex + 5} ${bottom - 53}L${ex - 35} ${bottom - 53}Z`, body, 'body');
    details += shape(sleeve, sleeves, 'sleeves');
    const cuff = `M282 ${cuffY - 13}L337 ${cuffY - 23}L341 ${cuffY}L285 ${cuffY + 10}Z`;
    details += shape(cuff, rib, 'rib');
    if (!tee) details += `<path d="${cuff}" fill="url(#${id}-ribbing)" pointer-events="none"/>`;
    details += shape(`M${sx + 5} ${bottom - 31}Q298 ${bottom - 16} ${ex + 8} ${bottom - 36}L${ex + 8} ${bottom - 15}Q300 ${bottom + 3} ${sx + 5} ${bottom - 11}Z`, rib, 'rib');
    details += seam(`M244 252L251 ${bottom - 35}`, '.17', true);
    details += seam(`M268 223Q286 216 309 226`, '.2', true);
    details += '</g>';
    // Mirror clipping with the same transform as the physical garment.
    shapes = shapes.map(d => `<path d="${d}" transform="${mirror}"/>`);
  } else {
    const torso = `M248 164 Q232 177 ${left} ${shoulderY} L${left + 9} 281 L${left + 5} ${bottom - 23} Q300 ${bottom + 1} ${right - 5} ${bottom - 23} L${right - 9} 281 L${right} ${shoulderY} Q370 177 352 164Z`;
    const sleeveL = `M${left} ${shoulderY}Q${left - 24} ${shoulderY + 7} ${left - 42} ${shoulderY + 28} L${cuffX} ${cuffY - 17} L${cuffX + 51} ${cuffY + 8} L${left + 18} 278Z`;
    const sleeveR = `M${right} ${shoulderY}Q${right + 24} ${shoulderY + 7} ${right + 42} ${shoulderY + 28} L${600 - cuffX} ${cuffY - 17} L${549 - cuffX} ${cuffY + 8} L${right - 18} 278Z`;
    details += shape(sleeveL, sleeves, 'sleeves');
    details += shape(sleeveR, sleeves, 'sleeves');
    details += shape(torso, body, 'body');
    details += seam(`M${left + 3} ${shoulderY + 8}Q${left + 22} 245 ${left + 17} 275M${right - 3} ${shoulderY + 8}Q${right - 22} 245 ${right - 17} 275`, '.3', true);
    details += seam(`M${left + 17} 295Q${left + 32} 340 ${left + 19} ${bottom - 39}M${right - 17} 295Q${right - 32} 340 ${right - 19} ${bottom - 39}`, '.09');
    const cuffL = `M${cuffX + 7} ${cuffY - 32}L${cuffX + 60} ${cuffY - 6}L${cuffX + 51} ${cuffY + 10}L${cuffX} ${cuffY - 15}Z`;
    const cuffR = `M${593 - cuffX} ${cuffY - 32}L${540 - cuffX} ${cuffY - 6}L${549 - cuffX} ${cuffY + 10}L${600 - cuffX} ${cuffY - 15}Z`;
    details += shape(cuffL, rib, 'rib');
    details += shape(cuffR, rib, 'rib');
    const hem = `M${left + 5} ${bottom - 39}Q300 ${bottom - 20} ${right - 5} ${bottom - 39}L${right - 6} ${bottom - 14}Q300 ${bottom + 8} ${left + 6} ${bottom - 14}Z`;
    details += shape(hem, rib, 'rib');
    if (!tee) details += `<g fill="url(#${id}-ribbing)" pointer-events="none"><path d="${cuffL}"/><path d="${cuffR}"/><path d="${hem}"/></g>`;
    if (hoodie) {
      if (back) {
        details += shape('M245 171Q225 137 250 110Q300 83 350 110Q375 137 355 171L350 208Q329 236 300 238Q269 236 250 208Z', hood, 'hood', 'hood');
        details += seam('M300 103Q290 158 300 231', '.22', true);
        details += seam('M251 201Q298 225 349 201', '.12');
      } else {
        details += shape('M244 180Q224 158 241 126Q258 101 300 102Q342 101 359 126Q376 158 356 180L331 210Q300 222 269 210Z', hood, 'hood', 'hood');
        details += `<path d="M255 169Q251 128 300 119Q349 128 345 169L321 193Q300 203 279 193Z" fill="#10170e" opacity=".49" pointer-events="none"/>`;
        details += shape('M244 165Q259 177 299 191L322 212Q279 225 246 193Z', hood, 'hood', 'cloth');
        details += shape('M356 165Q341 177 301 191L278 212Q321 225 354 193Z', hood, 'hood', 'cloth');
        details += seam('M250 174Q271 191 306 201M350 174Q329 191 294 201', '.27');
        details += `<g fill="none" stroke="#e9e6d9" stroke-width="2.4" opacity=".82" pointer-events="none"><path d="M277 209Q271 236 276 267"/><path d="M323 209Q329 234 324 260"/></g><g fill="#31372a" pointer-events="none"><rect x="274" y="264" width="4" height="9" rx="1"/><rect x="322" y="258" width="4" height="9" rx="1"/></g>`;
      }
    } else {
      details += shape(`M248 164Q300 ${back ? 186 : 215} 352 164L359 174Q300 ${back ? 204 : 235} 241 174Z`, hood, 'hood');
      details += seam(`M249 173Q300 ${back ? 197 : 222} 351 173`, '.25', true);
    }
    if (design.pocket && !tee && !back) {
      const pocket = `M237 ${bottom - 142}L363 ${bottom - 142}Q355 ${bottom - 120} 377 ${bottom - 98}L373 ${bottom - 56}Q300 ${bottom - 47} 227 ${bottom - 56}L223 ${bottom - 98}Q245 ${bottom - 120} 237 ${bottom - 142}Z`;
      details += shape(pocket, body, 'body', 'fold');
      details += seam(`M243 ${bottom - 135}L357 ${bottom - 135}M229 ${bottom - 95}L233 ${bottom - 62}Q300 ${bottom - 55} 367 ${bottom - 62}L371 ${bottom - 95}`, '.28', true);
    }
    if (design.zipper && !back) {
      details += `<g pointer-events="none"><path d="M300 ${hoodie ? 214 : 205}V${bottom - 10}" stroke="#253025" stroke-width="5" opacity=".8"/><path d="M300 ${hoodie ? 214 : 205}V${bottom - 10}" stroke="#c8c5b5" stroke-width="2" stroke-dasharray="2 2"/><rect x="296" y="${hoodie ? 215 : 207}" width="8" height="17" rx="2" fill="#bcbcaf" stroke="#4b5044"/></g>`;
    }
    shapes = shapes.map(d => `<path d="${d}"/>`);
  }
  const graphics = (Array.isArray(design.graphics) ? design.graphics : []).filter(g => g && g.view === view).map(g => {
    const x = clamp(g.x, 0, 600, 300);
    const y = clamp(g.y, 0, 640, 300);
    const size = clamp(g.size, 16, 140, 36);
    const rotation = clamp(g.rotation, -180, 180, 0);
    const text = escapeXml(String(g.text || '').slice(0, 150));
    const color = safeColor(g.color, '#f0ebda');
    let artwork = '';
    if (g.kind === 'image' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(g.src || '')) {
      artwork = `<image href="${escapeXml(g.src)}" x="${-size}" y="${-size}" width="${size * 2}" height="${size * 2}" preserveAspectRatio="xMidYMid meet"/>`;
    } else if (g.kind === 'text') {
      artwork = `<text x="0" y="0" fill="${color}" text-anchor="middle" dominant-baseline="middle" font-family="Pretendard, sans-serif" font-size="${size}" font-weight="800" letter-spacing="${size * -.025}">${text}</text>`;
    }
    const selected = selectedGraphic === g.id;
    return `<g transform="translate(${x} ${y}) rotate(${rotation})"${interactive ? ` data-graphic-id="${escapeXml(g.id)}" style="cursor:move"` : ''}>${artwork}${selected && interactive ? `<rect x="${-size * (g.kind === 'image' ? 1 : 1.8)}" y="${-size * .65}" width="${size * (g.kind === 'image' ? 2 : 3.6)}" height="${size * 1.3}" fill="none" stroke="#b4f04c" stroke-width="1.5" stroke-dasharray="5 4" pointer-events="none"/>` : ''}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 640" class="garment-svg" role="img" aria-label="${escapeXml(design.name || '의류 디자인')} ${escapeXml(view)} 미리보기">${defs}<ellipse cx="300" cy="${bottom + 42}" rx="${side ? 94 : 156}" ry="10" fill="#282d22" opacity=".045"/>${details}<defs><clipPath id="${id}-silhouette">${shapes.join('')}</clipPath></defs><g clip-path="url(#${id}-silhouette)">${graphics}</g></svg>`;
}

function sleeveOverlays(d,g,back){
 if(d.type==='tank'||d.sleeve<=0)return '';
 const c=Math.cos(g.angle),s=Math.sin(g.angle);let out='';
 for(const item of d.details||[]){if(!item.sleevePlacement||!['left','right'].includes(item.view))continue;
  for(const side of item.symmetric?['left','right']:[item.view]){
   const mirrored=back?side==='right':side==='left',mid=(item.startPercent+item.endPercent)/200,inner=item.seam==='inner';
   const sx=g.shoulderX+(inner?g.halfBicep*s:0),sy=g.shoulderY+(inner?g.halfBicep*c:0);
   const ex=g.cuffX+(inner?1:-1)*g.halfCuff*s,ey=g.cuffY+(inner?1:-1)*g.halfCuff*c;
   const inset=item.widthCm*2*(inner?-1:1),x=sx+(ex-sx)*mid+inset*s,y=sy+(ey-sy)*mid+inset*c;
   const width=item.widthCm*4,height=(item.endPercent-item.startPercent)/100*d.sleeve*4,angle=(mirrored?-1:1)*Math.atan2(-(ex-sx),ey-sy)*180/Math.PI;
   out+=`<g pointer-events="none" transform="translate(${mirrored?600-x:x} ${y}) rotate(${angle})">${sleeveDetail({...item,x:0,y:0,width,height,rotation:0},false,null)}</g>`;
  }
 }
 return out;
}
