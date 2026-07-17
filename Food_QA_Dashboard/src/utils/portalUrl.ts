export function resolvePortalUrl(value=import.meta.env.VITE_PORTAL_URL){
  const candidate=(value??'').trim()||(import.meta.env.DEV?'http://localhost:5173/':'');
  if(!candidate)return '';
  try{const parsed=new URL(candidate);return ['http:','https:'].includes(parsed.protocol)?parsed.toString():''}catch{return ''}
}
