export function getModuleUrl(localUrl:string,productionUrl=''){
  const candidate=(productionUrl||localUrl||'').trim();
  if(!candidate)return {url:'',error:'Module URL not configured'};
  try{const parsed=new URL(candidate);if(!['http:','https:'].includes(parsed.protocol))throw new Error();return {url:parsed.toString(),error:''}}catch{return {url:'',error:'Module URL is invalid'}}
}

export async function checkUrlAvailability(url:string,timeoutMs=2500){
  const checked=getModuleUrl(url);if(checked.error)return false;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{await fetch(checked.url,{method:'GET',mode:'no-cors',signal:controller.signal});return true}catch{return false}finally{clearTimeout(timer)}
}
