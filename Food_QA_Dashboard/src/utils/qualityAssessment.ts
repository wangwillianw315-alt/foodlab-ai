import { qualityStandards } from '../data/qualityStandards';
import type { FoodQualityRecord, ParameterKey, QualityStatus, QualityStandard, QualityStandardsMap } from '../types/quality';
import type {LinkedParameterKey,LinkedQAStandard,QAParameterTransfer} from '../types/transfer';

type Result = { status: QualityStatus; quality_score: number; failed_parameters: string[]; warning_parameters: string[]; missing_parameters: string[]; assessment_standard_id?:string;assessment_source?:'DEMONSTRATION'|'LIFECYCLE_TRANSFER' };
const labels: Record<ParameterKey,string> = { ph:'pH', water_activity:'Water activity', moisture_percent:'Moisture', temperature_c:'Temperature' };
export const rangeWarningBounds=(min:number,max:number,warningPercent:number)=>{const edge=(max-min)*(warningPercent/100);return{lowerEnd:min+edge,upperStart:max-edge}};
export const maximumWarningStart=(max:number,warningPercent:number)=>max-Math.abs(max)*(warningPercent/100);
const rangeState = (value:number, min:number, max:number,warningPercent:number): 'pass'|'warning'|'fail' => {
  if (value < min || value > max) return 'fail';
  const bounds=rangeWarningBounds(min,max,warningPercent);
  return value <= bounds.lowerEnd || value >= bounds.upperStart ? 'warning' : 'pass';
};
const maxState = (value:number, max:number,warningPercent:number,min=Number.NEGATIVE_INFINITY): 'pass'|'warning'|'fail' => value < min || value > max ? 'fail' : value >= maximumWarningStart(max,warningPercent) ? 'warning' : 'pass';

const linkedKey=(parameter:QAParameterTransfer):LinkedParameterKey|undefined=>{
  const name=parameter.parameter_name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  if(name==='ph'||name==='ph value'||name==='acidity ph')return'ph';
  if(name==='water activity'||name==='water activity aw'||name==='aw')return'water_activity';
  if(name==='moisture'||name==='moisture percent'||name==='moisture content')return'moisture_percent';
  if(name==='temperature'||name==='temperature c'||name==='storage temperature')return'temperature_c';
  if(name==='protein'||name==='protein percent'||name==='protein content')return'protein_percent';
  if(name==='fat'||name==='fat percent'||name==='fat content')return'fat_percent';
  return undefined;
};
const warningFraction=(rule:string)=>{const match=rule.match(/(\d+(?:\.\d+)?)\s*%/);if(!match)return null;const value=Number(match[1]);return Number.isFinite(value)&&value>=0&&value<=100?value/100:null};
const linkedState=(value:number,parameter:QAParameterTransfer):'pass'|'warning'|'fail'=>{
  const{lower_limit:lower,upper_limit:upper}=parameter;
  if((lower!==null&&value<lower)||(upper!==null&&value>upper))return'fail';
  const fraction=warningFraction(parameter.warning_rule);
  if(fraction===null)return'pass';
  if(lower!==null&&upper!==null){const edge=Math.max(0,upper-lower)*fraction;return value<=lower+edge||value>=upper-edge?'warning':'pass'}
  if(upper!==null){const edge=Math.max(Math.abs(upper),1)*fraction;return value>=upper-edge?'warning':'pass'}
  if(lower!==null){const edge=Math.max(Math.abs(lower),1)*fraction;return value<=lower+edge?'warning':'pass'}
  return'pass';
};
const assessLinkedQuality=(record:FoodQualityRecord,standard:LinkedQAStandard):Result=>{
  const assessable=standard.parameters.flatMap(parameter=>{const key=linkedKey(parameter);return key&&(parameter.lower_limit!==null||parameter.upper_limit!==null)?[{parameter,key}]:[]});
  if(!assessable.length)return{status:'INCOMPLETE',quality_score:0,failed_parameters:[],warning_parameters:[],missing_parameters:['No assessable linked parameters'],assessment_standard_id:standard.standard_id,assessment_source:'LIFECYCLE_TRANSFER'};
  const failed:string[]=[];const warning:string[]=[];const missing:string[]=[];
  for(const{parameter,key}of assessable){const value=record[key];if(value==null){missing.push(parameter.parameter_name);continue}const state=linkedState(value,parameter);if(state==='fail')failed.push(parameter.parameter_name);else if(state==='warning')warning.push(parameter.parameter_name)}
  const status:QualityStatus=failed.length?'FAIL':missing.length?'INCOMPLETE':warning.length?'WARNING':'PASS';
  return{status,quality_score:Math.max(0,100-failed.length*25-warning.length*5-missing.length*15),failed_parameters:failed,warning_parameters:warning,missing_parameters:missing,assessment_standard_id:standard.standard_id,assessment_source:'LIFECYCLE_TRANSFER'};
};

export function assessQuality(record: FoodQualityRecord,standards:QualityStandardsMap=qualityStandards,linkedStandards:LinkedQAStandard[]=[]): Result {
  const linked=linkedStandards.find(item=>item.status==='ACTIVE'&&item.product_name.trim().toLowerCase()===record.product_name.trim().toLowerCase()&&item.batch_id===record.batch_number);
  if(linked)return assessLinkedQuality(record,linked);
  const required: ParameterKey[] = ['ph','water_activity','moisture_percent','temperature_c'];
  const missing = required.filter(k => record[k] == null).map(k => labels[k]);
  const standard = standards[record.product_name];
  if (!standard) return { status:'INCOMPLETE', quality_score:0, failed_parameters:[], warning_parameters:[], missing_parameters: [...missing,'Unsupported product'] };
  const states: [ParameterKey, 'pass'|'warning'|'fail'][] = [];
  if (record.ph != null) states.push(['ph',rangeState(record.ph,standard.ph.min,standard.ph.max,standard.warningMarginPercent)]);
  if (record.water_activity != null) states.push(['water_activity',maxState(record.water_activity,standard.waterActivity.max,standard.warningMarginPercent,0)]);
  if (record.moisture_percent != null) states.push(['moisture_percent',rangeState(record.moisture_percent,standard.moisture.min,standard.moisture.max,standard.warningMarginPercent)]);
  if (record.temperature_c != null) states.push(['temperature_c',maxState(record.temperature_c,standard.temperature.max,standard.warningMarginPercent)]);
  const failed = states.filter(([,s])=>s==='fail').map(([k])=>labels[k]);
  const warning = states.filter(([,s])=>s==='warning').map(([k])=>labels[k]);
  const status: QualityStatus = failed.length ? 'FAIL' : missing.length ? 'INCOMPLETE' : warning.length ? 'WARNING' : 'PASS';
  return { status, quality_score:Math.max(0,100-failed.length*25-warning.length*5-missing.length*15), failed_parameters:failed, warning_parameters:warning, missing_parameters:missing, assessment_source:'DEMONSTRATION' };
}
export const assessRecord = (record:FoodQualityRecord,standards:QualityStandardsMap=qualityStandards,linkedStandards:LinkedQAStandard[]=[]): FoodQualityRecord => ({...record,...assessQuality(record,standards,linkedStandards)});
export function parameterStandard(key:ParameterKey, standard:QualityStandard) {
  if (key==='ph') return `${standard.ph.min}–${standard.ph.max}`;
  if (key==='water_activity') return `≤ ${standard.waterActivity.max}`;
  if (key==='moisture_percent') return `${standard.moisture.min}–${standard.moisture.max}%`;
  return `≤ ${standard.temperature.max}°C`;
}
