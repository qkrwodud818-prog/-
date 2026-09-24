/** Canonical outer-sleeve atlas: x runs back→front, y runs shoulder→cuff. */
const esc = (value='') => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num=(v,def,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):def;
const color=(v,def)=>/^#[\da-f]{6}$/i.test(v||'')?v:def;
const raster=v=>typeof v==='string'&&v.length<=8_000_000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v);

export function sleevePlacement(design,view='left') {
  return {view:view==='right'?'right':'left',x:300,y:300,width:40,height:70};
}

export function renderSleeve(design={},view='left',options={}) {
  const {surface='outer',texture=false,interactive=false,selectedGraphic=null,selectedDetail=null,technical=false,idPrefix='sleeve'}=options;
  view=view==='right'?'right':'left';
  const id=String(idPrefix).replace(/[^a-zA-Z0-9_-]/g,'')||'sleeve';
  const body=color(design.colors?.sleeves,color(design.colors?.body,'#626b4f')),rib=color(design.colors?.rib,body);
  const cuffHeight=Math.min(200,num(design.cuffRib,6,0,16)/Math.max(num(design.sleeve,60,0,75),1)*640);
  const p=design.pattern||{},tile=num(p.scale,4,.5,30)*4,pc=color(p.color,'#ece9e2');
  const pattern=p.type==='horizontal'?`<path d="M0 0H${tile}" stroke="${pc}" stroke-width="${tile/3}"/>`
    :p.type==='vertical'?`<path d="M0 0V${tile}" stroke="${pc}" stroke-width="${tile/3}"/>`
    :p.type==='gingham'?`<path d="M0 0H${tile}M0 0V${tile}" stroke="${pc}" stroke-width="${tile/2}" opacity=".55"/>`
    :p.type==='dots'?`<circle cx="${tile/2}" cy="${tile/2}" r="${tile/5}" fill="${pc}"/>`
    :p.type==='image'&&raster(p.image)?`<image href="${esc(p.image)}" width="${tile}" height="${tile}"/>`:'';
  const fabric=String(design.fabric||''),weave=/denim|chino/.test(fabric)?'<path d="M-4 4L4-4M0 8L8 0M4 12L12 4" stroke="#fff" stroke-width="1.5"/>'
    :/rib|corduroy/.test(fabric)?'<path d="M2 0V8M6 0V8" stroke="#111"/>'
    :/mesh|pique/.test(fabric)?'<circle cx="2" cy="2" r="1.2" fill="#111"/><circle cx="6" cy="6" r="1.2" fill="#111"/>'
    :/waffle|ripstop|quilt/.test(fabric)?'<path d="M0 0H8V8H0Z" stroke="#111" fill="none"/>'
    :'<path d="M0 2L2 4L4 2M4 6L6 8L8 6" stroke="#fff" fill="none"/>';
  const defs=`<defs><clipPath id="${id}-silhouette"><path d="M0 0H600V640H0Z"/></clipPath><pattern id="${id}-fabric" width="8" height="8" patternUnits="userSpaceOnUse">${weave}</pattern><pattern id="${id}-pattern" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse">${pattern}</pattern><pattern id="${id}-rib" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M1 0V5" stroke="#000" opacity=".14"/></pattern></defs>`;
  const underlay=`<path d="M0 0H600V640H0Z" fill="${body}"/>${!technical?`<rect width="600" height="640" fill="url(#${id}-fabric)" opacity=".16"/>`:''}${pattern?`<rect width="600" height="640" fill="url(#${id}-pattern)" opacity=".7"/>`:''}${raster(design.fabricImage)&&!technical?`<image href="${esc(design.fabricImage)}" width="600" height="640" opacity=".2"/>`:''}${cuffHeight>0?`<rect y="${640-cuffHeight}" width="600" height="${cuffHeight}" fill="${rib}"/><rect y="${640-cuffHeight}" width="600" height="${cuffHeight}" fill="url(#${id}-rib)"/><path d="M0 ${640-cuffHeight}H600" stroke="#293027" stroke-width="1"/>`:''}`;
  const stitches=`<g fill="none" stroke="#293027" stroke-width="1" opacity=".6" pointer-events="none"><path d="M0 5H600M0 635H600" stroke-dasharray="3 3"/></g>`;
  const graphics=(Array.isArray(design.graphics)?design.graphics:[]).filter(a=>a&&a.view===view&&surface==='outer').map(a=>{
    const x=num(a.x,300,0,600),y=num(a.y,300,0,640),size=num(a.size,36,16,140),rotation=num(a.rotation,0,-180,180);
    const art=a.kind==='image'&&raster(a.src)?`<image href="${esc(a.src)}" x="${-size}" y="${-size}" width="${size*2}" height="${size*2}" preserveAspectRatio="xMidYMid meet"/>`
      :a.kind==='text'?`<text text-anchor="middle" dominant-baseline="middle" font-family="Pretendard,sans-serif" font-weight="800" font-size="${size}" fill="${color(a.color,'#f5f2e9')}">${esc(a.text||'')}</text>`:'';
    const bounds=interactive&&selectedGraphic===a.id?`<rect x="${-size*2}" y="${-size}" width="${size*4}" height="${size*2}" fill="none" stroke="#78a6ff" stroke-dasharray="4 3"/><rect data-resize-graphic="${esc(a.id)}" x="${size*2-5}" y="${size-5}" width="10" height="10" fill="#78a6ff"/>`:'';
    return `<g transform="translate(${x} ${y}) rotate(${rotation})"${interactive?` data-graphic-id="${esc(a.id)}" style="cursor:move"`:''}>${art}${bounds}</g>`;
  }).join('');
  const details=(Array.isArray(design.details)?design.details:[]).filter(d=>d&&(d.seam||'outer')===surface&&(d.view===view||d.symmetric&&['left','right'].includes(d.view))).map(d=>detail(d,interactive,selectedDetail)).join('');
  const frame=texture?'':`<g pointer-events="none"><rect x="1" y="1" width="598" height="638" rx="2" fill="none" stroke="#53604a" stroke-width="2"/><g font-family="Pretendard,sans-serif" font-size="11" fill="#fff" stroke="#263027" stroke-width="2" paint-order="stroke"><text x="300" y="23" text-anchor="middle">${view==='left'?'착용자 왼쪽':'착용자 오른쪽'} 소매 · ${surface==='inner'?'안쪽선(인심)':'옆선(아웃심)'} · 어깨</text><text x="15" y="320">뒤</text><text x="585" y="320" text-anchor="end">앞</text><text x="300" y="620" text-anchor="middle">소매 끝 · 펼친 표면</text></g></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 640" class="garment-svg" role="img" aria-label="${esc(design.name||'의류 디자인')} ${view==='left'?'왼쪽':'오른쪽'} 소매 펼친 표면">${defs}${underlay}${stitches}<g clip-path="url(#${id}-silhouette)">${graphics}${details}</g>${frame}</svg>`;
}

export function detail(d,interactive,selected) {
  const x=num(d.x,300,0,600),y=num(d.y,300,0,640),w=num(d.width,40,d.sleevePlacement ? .01 : 6,d.sleevePlacement?600:250),h=num(d.height,70,d.sleevePlacement ? .01 : 6,d.sleevePlacement?640:320),col=color(d.color,'#30352d');
  let art='';
  if(d.type==='armprint'&&raster(d.src)){art=`<image href="${esc(d.src)}" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;}else if(d.type==='armprint'){art=`<text text-anchor="middle" dominant-baseline="middle" font-family="Pretendard,sans-serif" font-weight="800" font-size="${Math.min(h*.7,w/Math.max(1,String(d.text||'YOUR LABEL').length*.65))}" fill="${col}">${esc(d.text||'YOUR LABEL')}</text>${d.processing==='자수'?`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" fill="none" stroke="${col}" stroke-dasharray="2 2"/>`:''}`;}else if(/zip/.test(d.type||'')){
    const metal=d.zipperType==='골드'?'#b8923d':d.zipperType==='검정'?'#222':d.zipperType==='동색'?col:'#aaaeb3';
    art=`<path d="M-3 ${-h/2}V${h/2}M3 ${-h/2}V${h/2}" stroke="${col}" stroke-width="2"/><path d="M0 ${-h/2}V${h/2}" stroke="${metal}" stroke-width="3" stroke-dasharray="2 2"/><rect x="-4" y="${-h/2}" width="8" height="12" rx="2" fill="${metal}"/>`;
  }else if(d.type==='henley'){
    art=`<rect x="-8" y="${-h/2}" width="16" height="${h}" fill="none" stroke="${col}"/>`;
    for(let i=0,n=Math.round(num(d.buttons,3,0,12));i<n;i++)art+=`<circle cy="${-h/2+(i+1)*h/(n+1)}" r="2.5" fill="${col}"/>`;
  }else if(d.type==='polo')art=`<path d="M${-w/2} ${-h/2}L0 0L${-w/3} ${h/2}ZM${w/2} ${-h/2}L0 0L${w/3} ${h/2}Z" fill="${col}"/>`;
  else if(d.type==='thumbhole'||d.type==='elbow')art=`<ellipse rx="${w/2}" ry="${h/2}" fill="${d.type==='elbow'?col:'none'}" stroke="${col}" stroke-width="2"/>`;
  else if(d.type==='drawstring')art=`<path d="M${-w/2} ${-h/2}Q0 ${h/2} ${w/2} ${-h/2}M0 0V${h/2}" fill="none" stroke="${col}" stroke-width="3"/>`;
  else if(d.type==='slit')art=`<path d="M0 ${-h/2}V${h/2}" stroke="${col}" stroke-width="3"/>`;
  else art=`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${d.type==='kangaroo'?12:2}" fill="${['tape','sidetape','colorpanel','velcro','label','mockneck','turtleneck'].includes(d.type)?col:'none'}" stroke="${col}" stroke-width="1.5"/><path d="M${-w/2+4} ${-h/2+5}H${w/2-4}" stroke="${col}" stroke-dasharray="3 2"/>`;
  const tag=interactive?` data-detail-id="${esc(d.id)}" style="cursor:move"`:'';
  const bounds=interactive&&selected===d.id?`<rect x="${-w/2-5}" y="${-h/2-5}" width="${w+10}" height="${h+10}" fill="none" stroke="#4d8dff" stroke-dasharray="4 3"/>`:'';
  return `<g transform="translate(${x} ${y}) rotate(${num(d.rotation,0,-180,180)})"${tag}>${art}${bounds}</g>`;
}
