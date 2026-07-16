import { Download, FileCheck2, LoaderCircle, RotateCcw, Upload } from 'lucide-react';
import { lazy, Suspense, useRef, useState } from 'react';
import { useQualityData } from '../../hooks/useQualityData';
import type { ExcelSheet } from '../../utils/excelParser';

const ExcelImportDialog=lazy(()=>import('./ExcelImportDialog').then(module=>({default:module.ExcelImportDialog})));

export function CsvUploader() {
  const { importCsv, importResult, resetSample, source } = useQualityData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [excelImport,setExcelImport]=useState<{file:File;sheets:ExcelSheet[]}|null>(null);
  const [fileError,setFileError]=useState(''); const [reading,setReading]=useState(false);

  const openFile=async(file:File)=>{
    setFileError('');
    if(file.name.toLowerCase().endsWith('.csv')){importCsv(await file.text(),file.name);return}
    if(!file.name.toLowerCase().endsWith('.xlsx')){setFileError('Choose a .csv or .xlsx file. Legacy .xls files are not supported.');return}
    setReading(true);
    try{const{readExcelWorkbook}=await import('../../utils/excelParser');const sheets=await readExcelWorkbook(await file.arrayBuffer());setExcelImport({file,sheets})}
    catch(error){setFileError(error instanceof Error?error.message:'The Excel workbook could not be read.')}
    finally{setReading(false)}
  };

  return <div className="card p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="font-bold text-slate-900">Data source</h2>
        <p className="mt-1 text-sm text-slate-500">Upload CSV or Excel (.xlsx), or continue with the built-in demonstration dataset.</p>
        {source && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600"><FileCheck2 size={15} className="text-emerald-600"/><strong>{source.name}</strong><span>- {source.validRows} valid rows{source.rejectedRows > 0 && ` - ${source.rejectedRows} rejected`}</span></div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={event=>{const file=event.target.files?.[0];if(file)void openFile(file);event.target.value=''}}/>
        <button className="btn-primary" disabled={reading} onClick={()=>inputRef.current?.click()}>{reading?<LoaderCircle className="animate-spin" size={16}/>:<Upload size={16}/>}Import CSV / Excel</button>
        <a className="btn-secondary" href="/sample-food-quality-data.csv" download><Download size={16}/>Sample CSV</a>
        <button className="btn-secondary" onClick={resetSample}><RotateCcw size={16}/>Restore sample</button>
      </div>
    </div>
    {fileError&&<div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{fileError}</div>}
    {importResult && <div role="status" className={`mt-4 rounded-lg border p-3 text-sm ${importResult.errors.length ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><p className="font-semibold">{importResult.records.length} rows imported - {importResult.errors.length} rows rejected</p>{importResult.errors.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold">Review import issues</summary><ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">{importResult.errors.slice(0,20).map((issue,index)=><li key={`${issue.row}-${index}`}>Row {issue.row}: {issue.message}</li>)}</ul>{importResult.errors.length>20&&<p className="mt-2 text-xs">Showing the first 20 of {importResult.errors.length} issues.</p>}</details>}</div>}
    {excelImport&&<Suspense fallback={null}><ExcelImportDialog file={excelImport.file} sheets={excelImport.sheets} onClose={()=>setExcelImport(null)}/></Suspense>}
  </div>;
}
