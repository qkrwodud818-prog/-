import {pricingConfig} from './pricing.config.js';
import {normalizeSleevePlacement} from './sleeve-placement.js';
import { TYPES, FABRICS, MEASUREMENTS, DETAILS, typeDefaults } from './catalog.js';
const STORAGE_KEY = 'threadform-projects-v1';
const choices = {
  type: Object.keys(TYPES),
  fit: ['slim', 'regular', 'oversized', 'boxy'],
  fabric: Object.keys(FABRICS),
  view: ['front', 'back', 'left', 'right'],
};
const labels = {
  hoodie: '후드티', sweatshirt: '스웨트셔츠', tshirt: '티셔츠',
  regular: '레귤러', oversized: '오버사이즈', boxy: '박시',
  'french-terry': '프렌치 테리', brushed: '기모', jersey: '저지',
  front: '전면', back: '후면', left: '왼쪽', right: '오른쪽',
};
const uid = () => globalThis.crypto?.randomUUID?.() || `d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const string = (value, fallback, max = 80) => typeof value === 'string'
  ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max)
  : fallback;
const number = (value, fallback, min, max) => {
  if (typeof value !== 'number' && typeof value !== 'string') return fallback;
  if (value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const option = (value, key, fallback) => choices[key].includes(value) ? value : fallback;
const color = (value, fallback) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
const imageSource = value => typeof value === 'string' && value.length <= 8_000_000
  && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : '';

export function createDesign() {
  return {
    ...Object.fromEntries(MEASUREMENTS.map(m=>[m.key,m.default])),
    id: uid(), name: '첫 번째 후드', brand: 'UNTITLED STUDIO',
    audience: 'unisex', type: 'hoodie', fit: 'oversized', length: 66, chest: 64, sleeve: 60,
    fabric: 'french-terry',
    colors: { body: '#626b4f', sleeves: '#626b4f', hood: '#626b4f', rib: '#626b4f' },
    pocket: true, zipper: false,
    graphics: [{ id: uid(), purpose:'logo', name:'내 문양', kind: 'text', text: 'OFF SCRIPT', src: '', view: 'front', x: 300, y: 300, size: 36, rotation: 0, color: '#f5f2e9', processing:'실크 프린트' }],
    neckline:'hood', symmetric:true, pattern:{type:'solid',color:'#ece9e2',scale:4,image:''},fabricImage:'',details:[],season:'2026 FW',styleNumber:'TF-001',
    grades:Object.fromEntries(MEASUREMENTS.map(m=>[m.key,m.grade])),tolerances:Object.fromEntries(MEASUREMENTS.map(m=>[m.key,m.tolerance])),sizeOverrides:{S:{},M:{},L:{},XL:{}},
    notes: '', quantity: 30,
  };
}

// Normalize untrusted imported/saved data. Render text with textContent or escapeHtml.
export function resetDesign(input,step=null) {
 const current=sanitizeDesign(input),base=createDesign();
 if(step===null)return sanitizeDesign({...base,id:current.id,brand:current.brand,graphics:[],details:[],pocket:false,zipper:false,name:'새 디자인',styleNumber:'',season:'',notes:''});
 if(!Number.isInteger(step)||step<0||step>6)throw new Error('유효한 디자인 단계가 아닙니다.');
 const next=structuredClone(current),shape={...base,...typeDefaults(current.type)};
 const fields=[['type','audience'],[...MEASUREMENTS.map(m=>m.key),'fit','neckline','symmetric','grades','tolerances','sizeOverrides'],['details','pocket','zipper'],['fabric','fabricImage'],['colors','pattern'],[],['name','styleNumber','season','quantity','notes']][step];
 for(const key of fields)next[key]=structuredClone((step===1?shape:base)[key]);
 if(step===2){next.details=[];next.pocket=false;next.zipper=false;next.graphics=next.graphics.filter(g=>g.purpose!=='custom');}
 if(step===3)next.fabric=typeDefaults(current.type).fabric;
 if(step===5)next.graphics=next.graphics.filter(g=>g.purpose==='custom');
 if(step===6)Object.assign(next,{name:'새 디자인',styleNumber:'',season:'',notes:''});
 return sanitizeDesign(next);
}
export function sanitizeDesign(input) {
  const value = record(input);
  const defaults = createDesign();
  const colors = record(value.colors);
  const sourceGraphics = Array.isArray(value.graphics) ? value.graphics : defaults.graphics;
  const seenIds = new Set();
  const graphics = sourceGraphics.slice(0, 40).map(raw => {
    const graphic = record(raw);
    let id = string(graphic.id, uid(), 100);
    if (!id || seenIds.has(id)) id = uid();
    seenIds.add(id);
    return {
      id, purpose:graphic.purpose==='custom'?'custom':'logo', name:string(graphic.name,'내 문양',80), kind: graphic.kind === 'image' ? 'image' : 'text',
      text: string(graphic.text, '', 120), src: imageSource(graphic.src),
      view: option(graphic.view, 'view', 'front'),
      x: number(graphic.x, 300, 0, 600), y: number(graphic.y, 300, 0, 640),
      size: number(graphic.size, 36, 16, 140), rotation: number(graphic.rotation, 0, -180, 180),
      color: color(graphic.color, '#f5f2e9'),
      processing:['실크 프린트','DTF 전사','자수','와펜'].includes(graphic.processing)?graphic.processing:'실크 프린트',
    };
  }).filter(graphic => graphic.kind !== 'image' || graphic.src);
  const pattern=record(value.pattern),seenDetails=new Set();
  const details=(Array.isArray(value.details)?value.details:[]).slice(0,60).map(raw=>{
    const d=record(raw);if(!Object.hasOwn(DETAILS,d.type))return null;
    let id=string(d.id,uid(),100);if(!id||seenDetails.has(id))id=uid();seenDetails.add(id);
    return {sleevePlacement:d.sleevePlacement===true,seam:d.seam==='inner'?'inner':'outer',startPercent:number(d.startPercent,pricingConfig.sleevePlacement.start,0,99),endPercent:number(d.endPercent,pricingConfig.sleevePlacement.end,1,100),widthCm:number(d.widthCm,pricingConfig.sleevePlacement.widthCm,pricingConfig.sleevePlacement.minWidthCm,pricingConfig.sleevePlacement.maxWidthCm),src:imageSource(d.src),text:string(d.text,'YOUR LABEL',60),processing:['실크 프린트','DTF 전사','자수','와펜'].includes(d.processing)?d.processing:'실크 프린트',id,type:d.type,view:option(d.view,'view','front'),x:number(d.x,300,0,600),y:number(d.y,300,0,640),width:number(d.width,50,6,250),height:number(d.height,70,6,320),color:color(d.color,'#30352d'),symmetric:d.symmetric===true,rotation:number(d.rotation,0,-180,180),buttons:Math.round(number(d.buttons,3,0,12)),zipperType:['은색','검정','골드','동색'].includes(d.zipperType)?d.zipperType:'은색'};
  }).filter(Boolean).map(item=>normalizeSleevePlacement(item,value));
  return {
    ...Object.fromEntries(MEASUREMENTS.map(m=>[m.key,number(value[m.key],m.default,m.min,m.max)])),
    id: string(value.id, defaults.id, 100) || defaults.id,
    name: string(value.name, defaults.name, 80), brand: string(value.brand, defaults.brand, 80),
    audience:['men','women','unisex'].includes(value.audience)?value.audience:'unisex',
    type: option(value.type, 'type', defaults.type), fit: option(value.fit, 'fit', defaults.fit),
    length: number(value.length, 66, 48, 82), chest: number(value.chest, 64, 50, 76),
    sleeve: number(value.sleeve, 60, 0, 75), fabric: option(value.fabric, 'fabric', defaults.fabric),
    colors: Object.fromEntries(Object.keys(defaults.colors).map(key => [key, color(colors[key], defaults.colors[key])])),
    pocket: value.type === 'tshirt' ? false : typeof value.pocket === 'boolean' ? value.pocket : true,
    zipper: typeof value.zipper === 'boolean' ? value.zipper : false,
    graphics, notes: string(value.notes, '', 2000),
    quantity: Math.round(number(value.quantity, 30, 1, 10000)),
    neckline:['round','v','hood','polo','mock','turtle'].includes(value.neckline)?value.neckline:defaults.neckline,symmetric:value.symmetric!==false,
    pattern:{type:['solid','horizontal','vertical','gingham','dots','image'].includes(pattern.type)?pattern.type:'solid',color:color(pattern.color,defaults.pattern.color),scale:number(pattern.scale,4,.5,30),image:imageSource(pattern.image)},fabricImage:imageSource(value.fabricImage),details,
    season:string(value.season,defaults.season,40),styleNumber:string(value.styleNumber,defaults.styleNumber,40),
    grades:Object.fromEntries(MEASUREMENTS.map(m=>[m.key,number(record(value.grades)[m.key],m.grade,-10,10)])),
    tolerances:Object.fromEntries(MEASUREMENTS.map(m=>[m.key,number(record(value.tolerances)[m.key],m.tolerance,0,10)])),
    sizeOverrides:Object.fromEntries(['S','M','L','XL'].map(size=>[size,Object.fromEntries(MEASUREMENTS.filter(m=>Object.hasOwn(record(record(value.sizeOverrides)[size]),m.key)).map(m=>[m.key,number(value.sizeOverrides[size][m.key],m.default,m.min,m.max)]))])),
  };
}

export function loadDesigns(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  const ids = new Set();
  return parsed.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map(sanitizeDesign).filter(item => {
      if (ids.has(item.id)) return false;
      ids.add(item.id);
      return true;
    });
}

export function saveDesign(storage, design) {
  const saved = sanitizeDesign(design);
  const designs = loadDesigns(storage);
  const existingIndex = designs.findIndex(item => item.id === saved.id);
  if (existingIndex >= 0) designs[existingIndex] = saved;
  else designs.unshift(saved);
  storage.setItem(STORAGE_KEY, JSON.stringify(designs));
  return saved;
}

export function buildBrief(input) {
  const design = sanitizeDesign(input);
  return [
    'THREADFORM · 디자인 브리프',
    `프로젝트: ${design.name}`, `프로젝트 ID: ${design.id}`, `브랜드: ${design.brand}`,
    `품목: ${TYPES[design.type]}`, `핏: ${labels[design.fit]||design.fit}`,
    `총장: ${design.length} cm / 가슴 단면: ${design.chest} cm / 소매: ${design.sleeve} cm`,
    `원단: ${FABRICS[design.fabric].label} / ${FABRICS[design.fabric].composition}, ${FABRICS[design.fabric].weight} g/m² (제안 사양, 수급 확인 필요)`,
    ...MEASUREMENTS.map(m=>`${m.code} ${m.label}: ${design[m.key]} / 편차 ${design.grades[m.key]} / 공차 ±${design.tolerances[m.key]} / ${m.method}`),
    ...design.details.map(d=>`${DETAILS[d.type].label}: ${labels[d.view]} x=${d.x}, y=${d.y}; ${d.width}×${d.height} 시안 px; 단추 ${d.buttons}; 지퍼 ${d.zipperType}`),
    `몸판 색상: ${design.colors.body} / 소매 색상: ${design.colors.sleeves}`,
    `후드 색상: ${design.colors.hood} / 시보리 색상: ${design.colors.rib}`,
    `주머니: ${design.pocket ? '있음' : '없음'} / 지퍼: ${design.zipper ? '있음' : '없음'}`,
    `희망 제작 수량: ${design.quantity}벌`, '', '그래픽 배치 (600 × 640 시안 좌표 기준)',
    ...(design.graphics.length ? design.graphics.map((graphic, index) =>
      `${index + 1}. ${labels[graphic.view]} · ${graphic.kind === 'image' ? '업로드 이미지 (원본 별도 전달 필요)' : `텍스트: ${graphic.text}`}\n   위치 x=${graphic.x}, y=${graphic.y} / 크기 ${graphic.size} / 회전 ${graphic.rotation}° / 색상 ${graphic.color}`
    ) : ['그래픽 없음']),
    '', '추가 요청사항', design.notes || '없음', '',
    '이 문서는 콘셉트 디자인 초안이며 생산용 패턴이나 확정 작업지시서가 아닙니다.',
    '치수·원단·봉제·그래픽 가공 가능 여부는 전문가 검토와 실제 샘플 확인이 필요합니다.',
    '화면 미리보기는 실제 핏·소재감·색상을 보증하지 않습니다. 공장에 전송되거나 주문 접수되지 않았습니다.',
  ].join('\n');
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
