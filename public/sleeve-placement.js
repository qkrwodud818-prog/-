import {pricingConfig} from './pricing.config.js';
const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
export const seamTypes=['sidetape','armprint','armpocket','armzip','colorpanel','velcro'];
export function normalizeSleevePlacement(item,design){
 if(!['left','right'].includes(item.view)||!item.sleevePlacement)return item;
 const defaults=pricingConfig.sleevePlacement;
 const start=clamp(item.startPercent,0,99,defaults.start),end=clamp(item.endPercent,start+1,100,Math.max(defaults.end,start+1));
 const widthCm=clamp(item.widthCm,defaults.minWidthCm,defaults.maxWidthCm,defaults.widthCm);
 const mid=(start+end)/200,flatWidth=clamp(design.bicep,12,42,25)*(1-mid)+clamp(design.cuff,6,35,11)*mid;
 return {...item,seam:item.seam==='inner'?'inner':'outer',startPercent:start,endPercent:end,widthCm,
  x:300,y:(start+end)/200*640,width:Math.min(600,widthCm/Math.max(1,flatWidth/2)*600),height:(end-start)/100*640,rotation:0};
}
export function sleevePlacementText(item,design){
 const start=(item.startPercent||0)/100*design.sleeve,length=((item.endPercent||0)-(item.startPercent||0))/100*design.sleeve;
 return `${item.seam==='inner'?'소매 안쪽선(인심)':'소매 옆선(아웃심)'} · 어깨 봉제점에서 ${start.toFixed(1)}cm 아래부터, 길이 ${length.toFixed(1)}cm, 폭 ${Number(item.widthCm).toFixed(1)}cm · ${item.symmetric?'양쪽 소매 동일':'좌우 비대칭 — 주의'}`;
}
