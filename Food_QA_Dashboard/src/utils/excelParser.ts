import ExcelJS from 'exceljs';
import Papa from 'papaparse';

export type ImportField='sample_id'|'product_name'|'batch_number'|'test_date'|'ph'|'water_activity'|'moisture_percent'|'temperature_c'|'protein_percent'|'fat_percent'|'status';
export type ColumnMapping=Record<ImportField,string>;
export interface ExcelSheet { name:string; headers:string[]; rows:Record<string,string>[]; }

export const importFields:{key:ImportField;label:string;required:boolean}[]=[
  {key:'sample_id',label:'Sample ID',required:true},{key:'product_name',label:'Product name',required:true},
  {key:'batch_number',label:'Batch number',required:true},{key:'test_date',label:'Test date',required:true},
  {key:'ph',label:'pH',required:true},{key:'water_activity',label:'Water activity',required:true},
  {key:'moisture_percent',label:'Moisture %',required:true},{key:'temperature_c',label:'Temperature C',required:true},
  {key:'protein_percent',label:'Protein %',required:false},{key:'fat_percent',label:'Fat %',required:false},
  {key:'status',label:'Status (ignored and recalculated)',required:false},
];

const aliases:Record<ImportField,string[]>={
  sample_id:['sample id','sample_id','sample','sample number','sample no'],
  product_name:['product name','product_name','product','food product'],
  batch_number:['batch number','batch_number','batch','batch no','lot','lot number'],
  test_date:['test date','test_date','date','inspection date','analysis date'],
  ph:['ph','p h'], water_activity:['water activity','water_activity','aw','a w'],
  moisture_percent:['moisture percent','moisture_percent','moisture','moisture %'],
  temperature_c:['temperature c','temperature_c','temperature','temp','temp c','temperature °c'],
  protein_percent:['protein percent','protein_percent','protein','protein %'],
  fat_percent:['fat percent','fat_percent','fat','fat %'], status:['status','result','quality status'],
};
const normalise=(value:string)=>value.trim().toLowerCase().replace(/[-]+/g,' ').replace(/\s+/g,' ');
const cellText=(value:ExcelJS.CellValue):string=>{
  if(value==null)return '';
  if(value instanceof Date)return value.toISOString().slice(0,10);
  if(typeof value==='object'){
    if('result' in value)return cellText(value.result as ExcelJS.CellValue);
    if('richText' in value)return value.richText.map(part=>part.text).join('');
    if('text' in value)return String(value.text);
  }
  return String(value).trim();
};

export async function readExcelWorkbook(buffer:ArrayBuffer):Promise<ExcelSheet[]> {
  const workbook=new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheets:ExcelSheet[]=[];
  workbook.eachSheet(worksheet=>{
    const headerRow=worksheet.getRow(1);
    const headers:string[]=[]; const used=new Set<string>();
    headerRow.eachCell({includeEmpty:true},(cell,column)=>{let header=cellText(cell.value)||`Column ${column}`;let unique=header;let suffix=2;while(used.has(unique)){unique=`${header} (${suffix++})`}used.add(unique);headers[column-1]=unique});
    const rows:Record<string,string>[]=[];
    worksheet.eachRow({includeEmpty:false},(row,rowNumber)=>{if(rowNumber===1)return;const record:Record<string,string>={};let hasValue=false;headers.forEach((header,index)=>{const value=cellText(row.getCell(index+1).value);record[header]=value;if(value)hasValue=true});if(hasValue)rows.push(record)});
    if(headers.length&&rows.length)sheets.push({name:worksheet.name,headers,rows});
  });
  if(!sheets.length)throw new Error('No worksheet with a header row and data rows was found.');
  return sheets;
}

export function autoMapColumns(headers:string[]):ColumnMapping {
  return Object.fromEntries(importFields.map(field=>[field.key,headers.find(header=>aliases[field.key].includes(normalise(header)))??''])) as ColumnMapping;
}

export function missingRequiredMappings(mapping:ColumnMapping):string[] {
  return importFields.filter(field=>field.required&&!mapping[field.key]).map(field=>field.label);
}

export function duplicateMappedColumns(mapping:ColumnMapping):string[] {
  const selected=Object.values(mapping).filter(Boolean);
  return [...new Set(selected.filter((column,index)=>selected.indexOf(column)!==index))];
}

export function mappedRowsToCsv(rows:Record<string,string>[],mapping:ColumnMapping):string {
  const mapped=rows.map(row=>Object.fromEntries(importFields.map(field=>[field.key,mapping[field.key]?row[mapping[field.key]]??'':''])));
  return Papa.unparse(mapped,{columns:importFields.map(field=>field.key)});
}
