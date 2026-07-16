import { AlertTriangle,FileSpreadsheet,X } from 'lucide-react';
import { useMemo,useState } from 'react';
import { useQualityData } from '../../hooks/useQualityData';
import { autoMapColumns,duplicateMappedColumns,importFields,mappedRowsToCsv,missingRequiredMappings,type ColumnMapping,type ExcelSheet } from '../../utils/excelParser';

export function ExcelImportDialog({file,sheets,onClose}:{file:File;sheets:ExcelSheet[];onClose:()=>void}){
  const{importCsv}=useQualityData();const[sheetIndex,setSheetIndex]=useState(0);const sheet=sheets[sheetIndex];
  const[mapping,setMapping]=useState<ColumnMapping>(()=>autoMapColumns(sheet.headers));
  const missing=useMemo(()=>missingRequiredMappings(mapping),[mapping]);
  const duplicates=useMemo(()=>duplicateMappedColumns(mapping),[mapping]);
  const chooseSheet=(index:number)=>{setSheetIndex(index);setMapping(autoMapColumns(sheets[index].headers))};
  const confirm=()=>{if(missing.length||duplicates.length)return;importCsv(mappedRowsToCsv(sheet.rows,mapping),file.name);onClose()};
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="excel-import-title" onClick={onClose}>
    <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={event=>event.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5"><div className="flex gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><FileSpreadsheet size={22}/></span><div><h2 id="excel-import-title" className="text-lg font-bold">Map Excel columns</h2><p className="text-sm text-slate-500">{file.name} - {sheet.rows.length} data rows</p></div></div><button aria-label="Close Excel import" className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose}><X/></button></div>
      <div className="space-y-6 p-5">
        {sheets.length>1&&<label className="field-label block">Worksheet<select className="input mt-1 max-w-sm" value={sheetIndex} onChange={event=>chooseSheet(+event.target.value)}>{sheets.map((item,index)=><option key={item.name} value={index}>{item.name} ({item.rows.length} rows)</option>)}</select></label>}
        <div><h3 className="font-bold">Column mapping</h3><p className="mt-1 text-sm text-slate-500">Required fields must be matched before import. Optional nutrition fields may remain unmapped.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{importFields.map(field=><label key={field.key} className="field-label">{field.label}{field.required&&<span className="text-rose-600"> *</span>}<select className="input mt-1" value={mapping[field.key]} onChange={event=>setMapping(current=>({...current,[field.key]:event.target.value}))}><option value="">Not mapped</option>{sheet.headers.map(header=><option key={header}>{header}</option>)}</select></label>)}</div></div>
        {missing.length>0&&<div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="shrink-0" size={18}/><span>Map the following required fields: {missing.join(', ')}.</span></div>}
        {duplicates.length>0&&<div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="shrink-0" size={18}/><span>Each source column can be used once. Repeated: {duplicates.join(', ')}.</span></div>}
        <div><h3 className="font-bold">Data preview</h3><p className="mb-3 mt-1 text-sm text-slate-500">First five rows from worksheet “{sheet.name}”.</p><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-slate-50"><tr>{sheet.headers.map(header=><th key={header} className="whitespace-nowrap px-3 py-2 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{sheet.rows.slice(0,5).map((row,index)=><tr key={index}>{sheet.headers.map(header=><td key={header} className="max-w-48 truncate px-3 py-2">{row[header]||'—'}</td>)}</tr>)}</tbody></table></div></div>
      </div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={missing.length>0||duplicates.length>0} onClick={confirm}>Import {sheet.rows.length} rows</button></div>
    </div>
  </div>;
}
