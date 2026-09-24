import {config} from './config.js';
const p=config.photoAnalysis;
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const properties={};
for(const key of p.fields){if(key==='colors')properties[key]={type:'array',items:{type:'string',pattern:'^#[0-9A-Fa-f]{6}$'},minItems:1,maxItems:p.maxColors};else if(key==='details')properties[key]={type:'array',items:{type:'string',enum:p.enums.details},maxItems:p.maxDetails};else properties[key]={type:'string',enum:p.enums[key]};}
properties.confidence=object(Object.fromEntries(p.fields.map(key=>[key,{type:'number',minimum:0,maximum:1}])));
export const photoSchema=object(properties);
export function validateAnalysis(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!photoSchema.required.includes(k)))throw Error('invalid analysis');
 for(const key of p.fields){const v=value[key];if(key==='colors'){if(!Array.isArray(v)||!v.length||v.length>p.maxColors||v.some(x=>typeof x!=='string'||!/^#[a-f0-9]{6}$/i.test(x)))throw Error('invalid colors');}else if(key==='details'){if(!Array.isArray(v)||v.length>p.maxDetails||v.some(x=>!p.enums.details.includes(x)))throw Error('invalid details');}else if(!p.enums[key].includes(v))throw Error('invalid field');
  if(typeof value.confidence?.[key]!=='number'||!Number.isFinite(value.confidence[key])||value.confidence[key]<0||value.confidence[key]>1)throw Error('invalid confidence');
 }
 const out=structuredClone(value);out.confidence.fabric_guess=Math.min(p.fabricConfidenceMax,out.confidence.fabric_guess);if(out.kind==='unknown')out.confidence.kind=0;return out;
}
