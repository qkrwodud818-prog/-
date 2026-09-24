import {config as c} from '../config.js';
const w=c.welcome;
export const blank=()=>({version:w.version,stage:1,scene:0,question:0,answers:{styles:[],item:null,audience:null,brand:'',brandMode:'',font:0,mood:'',purpose:null},picked:0,completed:false});
const bounded=(v,max,fallback=0)=>Number.isInteger(v)&&v>=0&&v<=max?v:fallback;
export function normalize(input){
 const out=blank();if(!input||typeof input!=='object'||input.version!==w.version)return out;
 out.stage=bounded(input.stage,3,1)||1;out.scene=bounded(input.scene,w.scenes.length-1);out.question=bounded(input.question,w.questions.length-1);out.picked=bounded(input.picked,c.styles.length-1);out.completed=input.completed===true;
 const a=input.answers&&typeof input.answers==='object'?input.answers:{};
 out.answers.styles=Array.isArray(a.styles)?[...new Set(a.styles.filter(x=>Number.isInteger(x)&&x>=0&&x<w.questions[0].options.length))].slice(0,w.limits.styles):[];
 for(const key of ['item','audience','purpose']){const q=w.questions.find(x=>x.key===key);out.answers[key]=bounded(a[key],q.options.length-1,null);}
 for(const key of ['brand','mood'])out.answers[key]=typeof a[key]==='string'?a[key].slice(0,w.limits[key]):'';
 out.answers.brandMode=['name','pending','none'].includes(a.brandMode)?a.brandMode:'';
 out.answers.font=bounded(a.font,w.fonts.length-1);return out;
}
export function load(storage){try{return normalize(JSON.parse(storage.getItem(w.storageKey)||'null'));}catch{return blank();}}
export function save(storage,state){try{storage.setItem(w.storageKey,JSON.stringify(normalize(state)));return true;}catch{return false;}}
export function collection(state){
 const a=normalize(state).answers,tags=a.styles.length?a.styles:[0];
 return c.styles.map((base,i)=>{const tag=tags[i%tags.length],profile=w.styleProfiles[tag],item=w.itemProfiles[a.item];return {...base,tag:w.questions[0].options[tag],color:profile.color,fit:profile.fit,...(item?{kind:item.kind,type:item.type,feature:item.feature}:{}),values:{...base.values,chest:profile.chest,shoulder:profile.shoulder,...(item?{sleeve:item.sleeve}:{})}};});
}
