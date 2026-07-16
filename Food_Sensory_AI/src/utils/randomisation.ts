export const shuffle=<T>(v:T[],random=Math.random)=>{const a=[...v];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
export const generateServingOrders=<T>(samples:T[],panelists:number)=>Array.from({length:panelists},()=>shuffle(samples));
