export const formatNumber=(n:number|null|undefined,d=2)=>n==null?'—':n.toFixed(d).replace(/\.00$/,'');
