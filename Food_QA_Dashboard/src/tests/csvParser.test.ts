import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseQualityCsv } from '../utils/csvParser';

const header='sample_id,product_name,batch_number,test_date,ph,water_activity,moisture_percent,temperature_c,protein_percent,fat_percent,status';
const row=(values='A,Milk,B,2026-01-01,6.6,0.85,87,3,,,FAIL')=>`${header}\n${values}`;

describe('parseQualityCsv',()=>{
  it('converts numeric fields and recalculates an uploaded status',()=>{const result=parseQualityCsv(row());expect(result.records[0].ph).toBe(6.6);expect(result.records[0].status).toBe('PASS')});
  it('ignores blank rows',()=>expect(parseQualityCsv(`${header}\n\nA,Milk,B,2026-01-01,6.6,0.85,87,3,,,`).records).toHaveLength(1));
  it('reports invalid numeric rows without crashing',()=>{const result=parseQualityCsv(row('A,Milk,B,2026-01-01,nope,0.95,87,3,,,'));expect(result.records).toHaveLength(0);expect(result.errors).toHaveLength(1)});
  it('marks a negative water activity as a failure',()=>expect(parseQualityCsv(row('A,Milk,B,2026-01-01,6.6,-0.1,87,3,,,')).records[0]).toMatchObject({status:'FAIL',failed_parameters:['Water activity']}));
  it('reports missing columns',()=>expect(parseQualityCsv('sample_id,product_name\nA,Milk').errors[0].message).toContain('Missing required columns'));
  it('rejects an impossible calendar date',()=>expect(parseQualityCsv(row('A,Milk,B,2026-02-30,6.6,0.85,87,3,,,')).errors[0].message).toContain('Invalid test_date'));
  it('rejects duplicate sample IDs while retaining the first row',()=>{const result=parseQualityCsv(`${row()}\nA,Milk,B,2026-01-02,6.6,0.85,87,3,,,`);expect(result.records).toHaveLength(1);expect(result.errors[0].message).toContain('Duplicate sample_id')});
  it('normalises known product names without case sensitivity',()=>expect(parseQualityCsv(row('A,protein bar,B,2026-01-01,6.2,0.5,10,20,,,')).records[0].product_name).toBe('Protein Bar'));
  it('retains valid rows when another row is invalid',()=>{const result=parseQualityCsv(`${row()}\nB,Milk,B,wrong-date,6.6,0.85,87,3,,,`);expect(result.records).toHaveLength(1);expect(result.errors).toHaveLength(1)});
  it('loads all 64 built-in demonstration rows',()=>{const result=parseQualityCsv(readFileSync('public/sample-food-quality-data.csv','utf8'));expect(result.errors).toHaveLength(0);expect(result.records).toHaveLength(64)});
});
