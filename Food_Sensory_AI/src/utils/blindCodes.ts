export const generateBlindCode=(used:string[]=[],random=Math.random)=>{for(let i=0;i<1000;i++){const c=String(100+Math.floor(random()*900));if(!used.includes(c))return c}const start=Math.floor(random()*900);for(let i=0;i<900;i++){const c=String(100+(start+i)%900);if(!used.includes(c))return c}throw new Error('No unique blind code available')};
export const generateBlindCodes=(n:number,used:string[]=[])=>{const out:string[]=[];while(out.length<n)out.push(generateBlindCode([...used,...out]));return out};
export const hasDuplicateBlindCodes=(v:string[])=>new Set(v).size!==v.length;
