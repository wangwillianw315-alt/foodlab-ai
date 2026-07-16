import Papa from 'papaparse';
import { isValid, parseISO } from 'date-fns';
import { qualityStandards } from '../data/qualityStandards';
import type { FoodQualityRecord, ParseResult, QualityStandardsMap } from '../types/quality';
import type {LinkedQAStandard} from '../types/transfer';
import { assessRecord } from './qualityAssessment';

export const REQUIRED_HEADERS = ['sample_id','product_name','batch_number','test_date','ph','water_activity','moisture_percent','temperature_c','protein_percent','fat_percent'];
const numeric = ['ph','water_activity','moisture_percent','temperature_c','protein_percent','fat_percent'] as const;
const canonicalProducts = Object.keys(qualityStandards);
const normaliseProduct = (value:string) => canonicalProducts.find(product=>product.toLowerCase()===value.trim().toLowerCase()) ?? value.trim();
const isIsoDate = (value:string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));
export function parseQualityCsv(csv:string,standards:QualityStandardsMap=qualityStandards,linkedStandards:LinkedQAStandard[]=[]): ParseResult {
  const parsed = Papa.parse<Record<string,string>>(csv,{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()});
  const headers = parsed.meta.fields ?? [];
  const absent = REQUIRED_HEADERS.filter(h=>!headers.includes(h));
  if (absent.length) return {records:[],errors:[{row:1,message:`Missing required columns: ${absent.join(', ')}`}],totalRows:parsed.data.length};
  const records:FoodQualityRecord[]=[]; const errors:{row:number;message:string}[]=[]; const sampleIds=new Set<string>();
  parsed.data.forEach((raw,index)=>{
    const row=index+2; const values:Record<string,unknown>={...raw}; const bad:string[]=[];
    numeric.forEach(key=>{ const text=(raw[key]??'').trim(); if (!text) values[key]=null; else { const n=Number(text); if(Number.isFinite(n)) values[key]=n; else bad.push(key); } });
    if (bad.length) { errors.push({row,message:`Invalid number in: ${bad.join(', ')}`}); return; }
    const sampleId=raw.sample_id?.trim(); const date=raw.test_date?.trim();
    if (!sampleId || !raw.product_name?.trim() || !raw.batch_number?.trim() || !date) { errors.push({row,message:'Missing sample ID, product, batch or test date'}); return; }
    if (!isIsoDate(date)) { errors.push({row,message:'Invalid test_date; expected a real date in YYYY-MM-DD format'}); return; }
    if (sampleIds.has(sampleId)) { errors.push({row,message:`Duplicate sample_id: ${sampleId}`}); return; }
    sampleIds.add(sampleId);
    records.push(assessRecord({sample_id:sampleId,product_name:normaliseProduct(raw.product_name),batch_number:raw.batch_number.trim(),test_date:date,ph:values.ph as number|null,water_activity:values.water_activity as number|null,moisture_percent:values.moisture_percent as number|null,temperature_c:values.temperature_c as number|null,protein_percent:values.protein_percent as number|null,fat_percent:values.fat_percent as number|null,source_row:row},standards,linkedStandards));
  });
  parsed.errors.forEach(e=>errors.push({row:(e.row??0)+2,message:e.message}));
  return {records,errors,totalRows:parsed.data.length};
}
