import{addDays,formatISO,isBefore,parseISO}from'date-fns';import type{SamplingPoint}from'../types/shelfLife';
export const calculatePlannedDate=(start:string,day:number)=>formatISO(addDays(parseISO(start),day),{representation:'date'});
export const generateSamplingSchedule=(conditionId:string,start:string,days:number[]):SamplingPoint[]=>days.map((d,i)=>({sampling_point_id:`sp-${conditionId}-${i}`,condition_id:conditionId,planned_day:d,planned_date:calculatePlannedDate(start,d),sample_status:'PLANNED',replicate_count:2}));
export const identifyOverdueSamples=(s:SamplingPoint[],today=new Date())=>s.filter(p=>p.sample_status==='PLANNED'&&isBefore(parseISO(p.planned_date),today));
export const calculateCompletionRate=(s:SamplingPoint[])=>s.length?s.filter(p=>p.sample_status==='COMPLETED').length/s.length*100:0;
