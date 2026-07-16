import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FoodQualityRecord } from '../../types/quality';
import { exportRecords } from '../../utils/exportCsv';
import { formatNumber } from '../../utils/formatting';
import { EmptyState } from '../ui/EmptyState';
import { StatusBadge } from '../ui/StatusBadge';
import { RecordDetails } from './RecordDetails';

type SortKey = keyof FoodQualityRecord;
const columns: { key: SortKey; label: string }[] = [
  {key:'sample_id',label:'Sample ID'},{key:'product_name',label:'Product'},{key:'batch_number',label:'Batch'},
  {key:'test_date',label:'Test Date'},{key:'ph',label:'pH'},{key:'water_activity',label:'Water Activity'},
  {key:'moisture_percent',label:'Moisture %'},{key:'temperature_c',label:'Temperature C'},
  {key:'protein_percent',label:'Protein %'},{key:'fat_percent',label:'Fat %'},
  {key:'quality_score',label:'Quality Score'},{key:'status',label:'Status'}
];

export function QualityTable({records}:{records:FoodQualityRecord[]}) {
  const [page,setPage]=useState(1); const [size,setSize]=useState(10);
  const [sort,setSort]=useState<SortKey>('test_date'); const [ascending,setAscending]=useState(false);
  const [selected,setSelected]=useState<FoodQualityRecord|null>(null);
  const sorted=useMemo(()=>records.slice().sort((a,b)=>{const av=a[sort]??'',bv=b[sort]??'';return(av<bv?-1:av>bv?1:0)*(ascending?1:-1)}),[records,sort,ascending]);
  const pages=Math.max(1,Math.ceil(records.length/size));
  useEffect(()=>setPage(current=>Math.min(current,pages)),[pages]);
  const shown=sorted.slice((page-1)*size,page*size);
  const choose=(key:SortKey)=>{if(sort===key)setAscending(value=>!value);else{setSort(key);setAscending(true)}};

  return <div className="card overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
      <div><h2 className="font-bold">Quality records</h2><p className="text-xs text-slate-500">{records.length} filtered records - select a row for full assessment</p></div>
      <button className="btn-secondary" disabled={!records.length} onClick={()=>exportRecords(records)}><Download size={16}/>Export filtered CSV</button>
    </div>
    {!records.length ? <div className="p-5"><EmptyState/></div> : <>
      <div className="overflow-x-auto"><table className="w-full min-w-[1350px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(column=><th key={column.key} className="px-4 py-3"><button className="flex items-center gap-1 font-bold" onClick={()=>choose(column.key)}>{column.label}{sort===column.key&&(ascending?<ChevronUp size={13}/>:<ChevronDown size={13}/>)}</button></th>)}<th className="px-4 py-3">Issues</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{shown.map(record=><tr key={record.sample_id} tabIndex={0} onClick={()=>setSelected(record)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(record)}}} className="cursor-pointer hover:bg-navy-50/60 focus:bg-navy-50 focus:outline-none">
          <td className="px-4 py-3 font-semibold text-navy-700">{record.sample_id}</td><td className="px-4 py-3">{record.product_name}</td><td className="px-4 py-3">{record.batch_number}</td><td className="px-4 py-3">{record.test_date}</td>
          <td className="px-4 py-3">{formatNumber(record.ph)}</td><td className="px-4 py-3">{formatNumber(record.water_activity,3)}</td><td className="px-4 py-3">{formatNumber(record.moisture_percent)}</td><td className="px-4 py-3">{formatNumber(record.temperature_c)}</td><td className="px-4 py-3">{formatNumber(record.protein_percent)}</td><td className="px-4 py-3">{formatNumber(record.fat_percent)}</td>
          <td className="px-4 py-3 font-bold">{record.quality_score}</td><td className="px-4 py-3"><StatusBadge status={record.status!}/></td><td className="max-w-56 truncate px-4 py-3 text-xs text-slate-500">{[...(record.failed_parameters??[]),...(record.warning_parameters??[]),...(record.missing_parameters??[])].join(', ')||'None'}</td>
        </tr>)}</tbody>
      </table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm">
        <label>Rows per page <select aria-label="Rows per page" className="ml-2 rounded-lg border border-slate-300 p-1.5" value={size} onChange={event=>{setSize(+event.target.value);setPage(1)}}>{[10,25,50].map(value=><option key={value}>{value}</option>)}</select></label>
        <div className="flex items-center gap-2"><button className="btn-secondary" disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Previous</button><span>Page {page} of {pages}</span><button className="btn-secondary" disabled={page>=pages} onClick={()=>setPage(value=>value+1)}>Next</button></div>
      </div>
    </>}
    {selected&&<RecordDetails record={selected} onClose={()=>setSelected(null)}/>} 
  </div>;
}
