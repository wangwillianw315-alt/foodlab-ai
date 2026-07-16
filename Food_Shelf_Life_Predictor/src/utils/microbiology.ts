export const cfuToLog10=(cfu:number)=>cfu>0?Math.log10(cfu):null;export const log10ToCfu=(log:number)=>10**log;
export function parseMicrobialResult(raw:string){const s=raw.trim().toUpperCase();if(['ND','NOT DETECTED'].includes(s))return{value:null,qualifier:'NOT_DETECTED'};const m=s.match(/^([<>])?\s*(\d+(?:\.\d+)?)$/);return m?{value:Number(m[2]),qualifier:m[1]==='<'?'LESS_THAN':m[1]==='>'?'GREATER_THAN':'EXACT'}:{value:null,qualifier:'INVALID'}}
export const validateMicrobialResult=(value:number|null,qualifier='EXACT')=>qualifier==='NOT_DETECTED'||(value!=null&&value>=0&&Number.isFinite(value));
export function calculateMicrobialSummary(values:number[]){const valid=values.filter(v=>v>0);return{count:values.length,meanLog:valid.length?valid.reduce((s,v)=>s+Math.log10(v),0)/valid.length:null,notLoggable:values.length-valid.length}}
export const parseMicrobialQualifier=parseMicrobialResult;
