import {CheckCircle2,FileJson,History,Link2,ShieldAlert,Upload} from 'lucide-react';
import {useState} from 'react';
import {useQualityData} from '../hooks/useQualityData';
import type {ShelfLifeToQAEnvelope,TransferHistoryEntry} from '../types/transfer';
import {loadLinkedQAProducts,loadQATransferHistory,parseShelfLifeToQA,recordQATransfer,saveShelfLifeImport} from '../utils/transfer';

export function LifecycleTransferPage(){
  const{refreshLifecycleData}=useQualityData();
  const[preview,setPreview]=useState<ShelfLifeToQAEnvelope|null>(null);
  const[fileName,setFileName]=useState('');
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');
  const[warnings,setWarnings]=useState<string[]>([]);
  const[history,setHistory]=useState<TransferHistoryEntry[]>(loadQATransferHistory);
  const[products,setProducts]=useState(loadLinkedQAProducts);

  const onFile=async(file?:File)=>{
    if(!file)return;
    setFileName(file.name);setMessage('');
    const parsed=parseShelfLifeToQA(await file.text());setWarnings(parsed.warnings);
    if(!parsed.ok){
      setPreview(null);setError(parsed.error);
      const entry={transfer_id:`TX-INVALID-${Date.now()}`,transfer_type:'SHELF_LIFE_TO_QA',imported_or_exported:'IMPORTED' as const,timestamp:new Date().toISOString(),linked_record_id:'',filename:file.name,success:false,warning_count:parsed.warnings.length};
      setHistory(recordQATransfer(entry));return;
    }
    setError('');setPreview(parsed.value);
  };

  const save=(status:'ACTIVE'|'DRAFT')=>{
    if(!preview)return;
    const result=saveShelfLifeImport(preview,status);
    const entry={transfer_id:preview.transfer_id,transfer_type:preview.transfer_type,imported_or_exported:'IMPORTED' as const,timestamp:new Date().toISOString(),linked_record_id:result.ok?result.product.qa_product_id:'',filename:fileName,success:result.ok,warning_count:warnings.length};
    setHistory(recordQATransfer(entry));
    if(!result.ok){setError(result.error);return}
    refreshLifecycleData();setProducts(loadLinkedQAProducts());
    setMessage(`${result.product.product_name} saved as ${status==='ACTIVE'?'an active linked standard and batch monitoring project':'a linked standard and batch project draft'}.`);
    setPreview(null);setError('');
  };

  return <div className="space-y-6">
    <div><p className="eyebrow">Lifecycle handoff</p><h2 className="page-title">Import Product from Shelf Life</h2><p className="page-subtitle">Review a versioned FoodLab JSON transfer before creating a linked QA standard and batch monitoring project. Existing records are never overwritten.</p></div>
    <section className="card p-5">
      <label className="btn-primary w-fit cursor-pointer"><Upload size={16}/>Select transfer JSON<input className="sr-only" type="file" accept="application/json,.json" onChange={event=>void onFile(event.target.files?.[0])}/></label>
      <p className="mt-3 text-xs text-slate-500">Expected: SHELF_LIFE_TO_QA · schema 1.0.0</p>
      {error&&<div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    </section>
    {preview&&<section className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-2"><FileJson className="text-emerald-700"/><div><h3 className="font-bold">Transfer preview: {preview.payload.product_name}</h3><p className="text-xs text-slate-500">{preview.transfer_id} · {fileName}</p></div></div></div>
      <div className="grid gap-5 p-5 lg:grid-cols-2"><dl className="grid grid-cols-2 gap-3 text-sm"><dt className="text-slate-500">Category</dt><dd>{preview.payload.product_category}</dd><dt className="text-slate-500">Formula</dt><dd>{preview.payload.formula_version_id}</dd><dt className="text-slate-500">Planning shelf life</dt><dd>{preview.payload.planning_shelf_life_days??'Not supplied'} days</dd><dt className="text-slate-500">Storage</dt><dd>{preview.payload.storage_condition||'Not supplied'}</dd></dl><div><h4 className="font-semibold">Confirmed parameters</h4><ul className="mt-2 space-y-2 text-sm text-slate-600">{preview.payload.qa_parameters.map(parameter=><li key={`${parameter.parameter_name}-${parameter.unit}`}><strong>{parameter.parameter_name}</strong> ({parameter.unit}): {parameter.lower_limit??'—'} to {parameter.upper_limit??'—'} · {parameter.warning_rule}</li>)}{!preview.payload.qa_parameters.length&&<li>No confirmed limits supplied.</li>}</ul></div></div>
      {warnings.length>0&&<ul className="mx-5 mb-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{warnings.map(warning=><li key={warning}>{warning}</li>)}</ul>}
      <div className="border-t border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldAlert className="mr-2 inline" size={17}/><strong>Transferred limits are user-confirmed planning values and are not automatically regulatory specifications.</strong></div>
      <div className="flex flex-wrap gap-2 p-5"><button className="btn-primary" onClick={()=>save('ACTIVE')}>Create standard and batch project</button><button className="btn-secondary" onClick={()=>save('DRAFT')}>Save as draft</button><button className="btn-secondary" onClick={()=>{setPreview(null);setError('');setWarnings([])}}>Cancel</button></div>
    </section>}
    {message&&<div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18}/>{message}</div>}
    <section className="card p-5"><h3 className="flex items-center gap-2 font-bold"><Link2 size={18}/>Linked standards and batch monitoring</h3><p className="mt-1 text-xs text-slate-500">An active linked standard is used when an imported CSV row matches both the product name and generated batch ID.</p>{products.length?<div className="mt-4 grid gap-3">{products.map(product=><article key={product.qa_product_id} className="rounded-lg border border-slate-200 p-4"><div className="flex justify-between"><strong>{product.product_name}</strong><span className="text-xs font-bold text-slate-500">{product.status}</span></div><dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div>Product Development Project: <strong>{product.product_project_id}</strong></div><div>Sensory Project: <strong>{product.sensory_project_id||'Not linked'}</strong></div><div>Shelf-Life Study: <strong>{product.shelf_life_study_id}</strong></div><div>Linked standard: <strong>{product.linked_standard?.standard_id||product.qa_product_id}</strong></div><div>Batch monitoring ID: <strong>{product.batch_monitoring_project?.batch_id||product.batch_id}</strong></div></dl></article>)}</div>:<p className="mt-3 text-sm text-slate-500">No linked products have been imported.</p>}</section>
    <section className="card p-5"><h3 className="flex items-center gap-2 font-bold"><History size={18}/>Transfer history</h3><p className="mt-1 text-xs text-slate-500">Metadata only; full transfer payloads are not stored here.</p>{history.length?<div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b"><th className="py-2">Time</th><th>ID</th><th>File</th><th>Result</th></tr></thead><tbody>{history.map((item,index)=><tr className="border-b border-slate-100" key={`${item.transfer_id}-${index}`}><td className="py-2">{new Date(item.timestamp).toLocaleString()}</td><td>{item.transfer_id}</td><td>{item.filename}</td><td>{item.success?'Success':'Failed'}{item.warning_count?` · ${item.warning_count} warning(s)`:''}</td></tr>)}</tbody></table></div>:<p className="mt-3 text-sm text-slate-500">No transfer attempts recorded.</p>}</section>
  </div>;
}
