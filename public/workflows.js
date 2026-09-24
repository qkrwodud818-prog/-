import { sanitizeDesign, buildBrief } from './model.js';
export function fontCss(){
 if(typeof document==='undefined')return '';
 for(const sheet of document.styleSheets||[]){try{for(const rule of sheet.cssRules)if(rule.cssText.startsWith('@font-face')&&rule.cssText.includes('Pretendard'))return rule.cssText;}catch{}}
 return '';
}
export function withSvgFont(svg){return svg.replace(/(<svg\b[^>]*>)/,'$1<style>'+fontCss()+'</style>');}
export const MODEL_PRESETS = {man:'fictional adult male fashion influencer, conceptual height 180cm weight 65kg',woman:'fictional adult female fashion influencer, conceptual height 165cm weight 45kg'};
export function buildTryOnPrompt(design,options={}) {
 const person=MODEL_PRESETS[options.model]||MODEL_PRESETS.man;
 return [`Realistic fashion catalog image of the SAME ${person} in the first reference.`,
 'Keep the exact face, hair, glamorous influencer styling, body, pose, trousers, shoes, lighting, framing and studio background of the fixed reference. Replace only the upper garment. Do not generate a new person.',
 'The clothing reference shows the exact garment. Preserve silhouette, colors, neckline, sleeve shape, all uploaded artwork, print text, pockets and closure placement. No redesign, interface, measurement lines, labels or watermark.',
 'Natural fabric folds. Concept visualization only, not a fit or production guarantee.',buildBrief(sanitizeDesign(design))].join('\n');
}
export async function svgToPng(svg, { width = 1200 } = {}) {
  if (typeof svg !== 'string' || !svg.includes('<svg')) throw new Error('도식화 이미지를 준비할 수 없습니다.');
  const url = URL.createObjectURL(new Blob([withSvgFont(svg)], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(2048, Math.max(256, Number(width) || 1200));
    canvas.height = Math.round(canvas.width * (image.naturalHeight || 640) / (image.naturalWidth || 600));
    const context = canvas.getContext('2d');
    context.fillStyle = '#f5f3ee'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
async function request(url, options = {}) {
  let response;
  try { response = await fetch(url, options); }
  catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('로컬 서버에 연결할 수 없습니다. 서버 실행 후 다시 시도하거나 파일로 내보내세요.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.');
  return data;
}
export const getCapabilities = () => request('/api/capabilities');
export async function generateTryOn(design, options, referencePng, { signal } = {}) {
  const result = await request('/api/tryon', { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ design: sanitizeDesign(design), options, referencePng }) });
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(result.image || '')) throw new Error('생성 이미지 응답이 올바르지 않습니다.');
  return result.image;
}
export function validateCustomer(input = {}) {
  const clean = (value, limit) => typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, limit) : '';
  const customer = { name: clean(input.name, 80), email: clean(input.email, 254), phone: clean(input.phone, 30), quantity: Number(input.quantity ?? 1), size: input.size || 'M', notes: clean(input.notes, 3000), consent: input.consent === true };
  if (!customer.name) throw new Error('이름을 입력해주세요.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new Error('이메일 주소를 확인해주세요.');
  if (!Number.isInteger(customer.quantity) || customer.quantity < 1 || customer.quantity > 10000) throw new Error('수량은 1~10,000 사이의 정수로 입력해주세요.');
  if (!['S', 'M', 'L', 'XL'].includes(customer.size)) throw new Error('샘플 사이즈를 선택해주세요.');
  if (!customer.consent) throw new Error('요청서 저장과 운영자 이메일 전달에 동의해주세요.');
  return customer;
}
export async function createSampleRequest(design,customer,options={}) {
 return request('/api/sample-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({design:sanitizeDesign(design),customer:validateCustomer(customer),estimateConsent:options.estimateConsent===true,idempotencyKey:options.idempotencyKey})});
}
export async function createPromotionRequest(payload) {
 return request('/api/promotion-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
}
