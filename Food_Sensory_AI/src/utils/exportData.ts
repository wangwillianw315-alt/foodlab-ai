import Papa from 'papaparse';
export const downloadText=(name:string,text:string,type='text/plain')=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)};
export const exportJson=(name:string,data:unknown)=>downloadText(name,JSON.stringify(data,null,2),'application/json');
export const exportCsv=(name:string,data:Record<string,unknown>[])=>downloadText(name,Papa.unparse(data),'text/csv');
