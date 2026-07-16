import {defaultQualityStandards} from '../data/qualityStandards';
import type {QualityStandard,QualityStandardsMap} from '../types/quality';

export const STANDARDS_STORAGE_KEY='food-qa-dashboard-standards-v1';
export const cloneStandards=(standards:QualityStandardsMap):QualityStandardsMap=>structuredClone(standards);

export function validateStandard(standard:QualityStandard):string[]{
  const errors:string[]=[];
  if(!standard||!standard.ph||!standard.waterActivity||!standard.moisture||!standard.temperature)return ['Standard structure is incomplete.'];
  const values=[standard.ph.min,standard.ph.max,standard.waterActivity.max,standard.moisture.min,standard.moisture.max,standard.temperature.max,standard.warningMarginPercent];
  if(values.some(value=>!Number.isFinite(value)))return ['All limits must be valid numbers.'];
  if(standard.ph.min<0||standard.ph.max>14||standard.ph.min>=standard.ph.max)errors.push('pH must have a valid 0–14 range with minimum below maximum.');
  if(standard.waterActivity.max<=0||standard.waterActivity.max>1)errors.push('Water activity maximum must be greater than 0 and no more than 1.');
  if(standard.moisture.min<0||standard.moisture.max>100||standard.moisture.min>=standard.moisture.max)errors.push('Moisture must have a valid 0–100% range with minimum below maximum.');
  if(standard.temperature.max < -50 || standard.temperature.max > 200)errors.push('Temperature maximum must be between -50 and 200 C.');
  if(standard.warningMarginPercent<1||standard.warningMarginPercent>25)errors.push('Warning margin must be between 1% and 25%.');
  return errors;
}

export function validateStandards(standards:QualityStandardsMap):Record<string,string[]>{
  const result:Record<string,string[]>={};
  for(const product of Object.keys(defaultQualityStandards)){
    if(!standards[product])result[product]=['Product standard is missing.'];
    else{const errors=validateStandard(standards[product]);if(errors.length)result[product]=errors}
  }
  return result;
}

export function loadStoredStandards():QualityStandardsMap{
  try{const stored=localStorage.getItem(STANDARDS_STORAGE_KEY);if(!stored)return cloneStandards(defaultQualityStandards);const parsed=JSON.parse(stored) as QualityStandardsMap;const known=Object.fromEntries(Object.keys(defaultQualityStandards).map(product=>[product,{...parsed?.[product],productName:product}])) as QualityStandardsMap;if(Object.keys(validateStandards(known)).length)return cloneStandards(defaultQualityStandards);return cloneStandards(known)}catch{return cloneStandards(defaultQualityStandards)}
}
