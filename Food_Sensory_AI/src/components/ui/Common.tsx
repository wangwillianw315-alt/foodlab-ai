import {ReactNode} from 'react';
export const Card=({children,className=''}:{children:ReactNode,className?:string})=><section className={`card ${className}`}>{children}</section>;
export const PageHeader=({title,subtitle,action}:{title:string,subtitle:string,action?:ReactNode})=><div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
export const Empty=({text}:{text:string})=><div className="empty">{text}</div>;
export const Metric=({label,value,detail}:{label:string,value:string|number,detail?:string})=><Card><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong>{detail&&<small>{detail}</small>}</Card>;
export const fmt=(v:number|null|undefined,d=1)=>v==null||!Number.isFinite(v)?'—':v.toFixed(d);
