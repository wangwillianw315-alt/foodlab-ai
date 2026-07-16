import ExcelJS from 'exceljs';
import {describe,expect,it} from 'vitest';
import {parseQualityCsv} from '../utils/csvParser';
import {autoMapColumns,duplicateMappedColumns,mappedRowsToCsv,missingRequiredMappings,readExcelWorkbook} from '../utils/excelParser';

const headers=['Sample ID','Product','Lot Number','Inspection Date','pH','aW','Moisture %','Temp C','Protein %','Fat %'];

describe('Excel import',()=>{
  it('automatically maps common food QA column aliases',()=>{const mapping=autoMapColumns(headers);expect(mapping).toMatchObject({sample_id:'Sample ID',product_name:'Product',batch_number:'Lot Number',test_date:'Inspection Date',water_activity:'aW',temperature_c:'Temp C'})});
  it('reports missing required mappings',()=>{const mapping=autoMapColumns(['Sample ID','Product']);expect(missingRequiredMappings(mapping)).toContain('Batch number')});
  it('prevents one source column from being mapped twice',()=>{const mapping=autoMapColumns(headers);mapping.fat_percent='Protein %';expect(duplicateMappedColumns(mapping)).toEqual(['Protein %'])});
  it('converts mapped worksheet rows into assessable quality CSV',()=>{const mapping=autoMapColumns(headers);const csv=mappedRowsToCsv([{'Sample ID':'X-1','Product':'Milk','Lot Number':'M-1','Inspection Date':'2026-06-01','pH':'6.65','aW':'0.85','Moisture %':'87','Temp C':'3','Protein %':'3.4','Fat %':'3.5'}],mapping);const result=parseQualityCsv(csv);expect(result.errors).toHaveLength(0);expect(result.records[0]).toMatchObject({sample_id:'X-1',batch_number:'M-1',status:'PASS'})});
  it('reads worksheet names, dates and rows from a real xlsx buffer',async()=>{const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('QA Data');sheet.addRow(headers);sheet.addRow(['X-2','Milk','M-2',new Date('2026-06-02T00:00:00Z'),6.6,0.85,87,3,3.4,3.5]);const buffer=await workbook.xlsx.writeBuffer();const sheets=await readExcelWorkbook(new Uint8Array(buffer).buffer);expect(sheets).toHaveLength(1);expect(sheets[0]).toMatchObject({name:'QA Data'});expect(sheets[0].rows[0]['Inspection Date']).toBe('2026-06-02')});
});
