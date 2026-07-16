import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Bar,BarChart,CartesianGrid,Cell,Legend,Line,LineChart,Pie,PieChart,ReferenceArea,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import type {FoodQualityRecord,QualityStandardsMap} from '../../types/quality';
import {batchScores,failureReasons,productPerformance} from '../../utils/analytics';
import {maximumWarningStart,rangeWarningBounds} from '../../utils/qualityAssessment';
import {EmptyState} from '../ui/EmptyState';

const colors:Record<string,string>={PASS:'#059669',WARNING:'#d97706',FAIL:'#e11d48',INCOMPLETE:'#94a3b8'};
function Box({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){return <section className="card min-w-0 p-5"><h3 className="font-bold text-slate-900">{title}</h3><p className="mb-4 mt-1 text-xs text-slate-500">{subtitle}</p>{children}</section>}
const wrap=(node:ReactNode)=><div className="h-72 w-full">{node}</div>;

export function DashboardCharts({records,standards}:{records:FoodQualityRecord[];standards:QualityStandardsMap}){
  const products=useMemo(()=>[...new Set(records.map(record=>record.product_name))].sort(),[records]);
  const[trendProduct,setTrendProduct]=useState(products[0]??'');
  useEffect(()=>{if(!products.includes(trendProduct))setTrendProduct(products[0]??'')},[products,trendProduct]);
  const trend=useMemo(()=>records.filter(record=>record.product_name===trendProduct).slice().sort((a,b)=>a.test_date.localeCompare(b.test_date)),[records,trendProduct]);
  const standard=standards[trendProduct];
  const phBounds=standard?rangeWarningBounds(standard.ph.min,standard.ph.max,standard.warningMarginPercent):null;
  const waterWarningStart=standard?maximumWarningStart(standard.waterActivity.max,standard.warningMarginPercent):0;
  const status=['PASS','WARNING','FAIL','INCOMPLETE'].map(name=>({name,value:records.filter(record=>record.status===name).length}));
  const productSelector=<select aria-label="Trend product" className="input mb-3 w-48" value={trendProduct} onChange={event=>setTrendProduct(event.target.value)}>{products.map(product=><option key={product}>{product}</option>)}</select>;
  if(!records.length)return <EmptyState/>;
  return <div className="grid gap-5 xl:grid-cols-2">
    <Box title="Quality Status Overview" subtitle="Distribution of assessed sample outcomes">{wrap(<ResponsiveContainer><PieChart><Pie data={status} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>{status.map(item=><Cell key={item.name} fill={colors[item.name]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>)}</Box>
    <Box title="Quality Score by Batch" subtitle="Average assessment score for each production batch">{wrap(<ResponsiveContainer><BarChart data={batchScores(records)} margin={{left:-15}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="batch" tick={{fontSize:11}}/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="score" name="Average score" fill="#155483" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>)}</Box>
    <Box title="pH Trend" subtitle={`One product at a time, with specification and ${standard?.warningMarginPercent??10}% warning zones`}>{productSelector}{wrap(<ResponsiveContainer><LineChart data={trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="test_date" tick={{fontSize:10}}/><YAxis domain={['auto','auto']}/><Tooltip/><Legend/>{standard&&phBounds&&<><ReferenceArea y1={standard.ph.min} y2={phBounds.lowerEnd} fill="#f59e0b" fillOpacity={0.12}/><ReferenceArea y1={phBounds.upperStart} y2={standard.ph.max} fill="#f59e0b" fillOpacity={0.12}/><ReferenceLine y={standard.ph.min} stroke="#e11d48" strokeDasharray="5 4" label={{value:'Min',position:'insideBottomLeft',fontSize:10}} ifOverflow="extendDomain"/><ReferenceLine y={standard.ph.max} stroke="#e11d48" strokeDasharray="5 4" label={{value:'Max',position:'insideTopLeft',fontSize:10}} ifOverflow="extendDomain"/></>}<Line connectNulls={false} dataKey="ph" name={`${trendProduct} pH`} stroke="#155483" strokeWidth={2} dot={{r:2}}/></LineChart></ResponsiveContainer>)}</Box>
    <Box title="Water Activity Trend" subtitle={`Maximum specification and ${standard?.warningMarginPercent??10}% warning zone for the selected product`}>{productSelector}{wrap(<ResponsiveContainer><LineChart data={trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="test_date" tick={{fontSize:10}}/><YAxis domain={['auto','auto']}/><Tooltip/><Legend/>{standard&&<><ReferenceArea y1={waterWarningStart} y2={standard.waterActivity.max} fill="#f59e0b" fillOpacity={0.12}/><ReferenceLine y={standard.waterActivity.max} stroke="#e11d48" strokeDasharray="5 4" label={{value:'Maximum',position:'insideTopLeft',fontSize:10}} ifOverflow="extendDomain"/></>}<Line connectNulls={false} dataKey="water_activity" name={`${trendProduct} water activity`} stroke="#0891b2" strokeWidth={2} dot={{r:2}}/></LineChart></ResponsiveContainer>)}</Box>
    <Box title="Failure Reasons" subtitle="Count of failed readings by measured parameter">{wrap(<ResponsiveContainer><BarChart layout="vertical" data={failureReasons(records)} margin={{left:20}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={92} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="count" name="Failures" fill="#e11d48" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer>)}</Box>
    <Box title="Product Performance" subtitle="Pass rate and average quality score by product">{wrap(<ResponsiveContainer><BarChart data={productPerformance(records)}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="product" tick={{fontSize:10}}/><YAxis domain={[0,100]}/><Tooltip/><Legend/><Bar dataKey="passRate" name="Pass rate %" fill="#059669" radius={[4,4,0,0]}/><Bar dataKey="averageScore" name="Average score" fill="#155483" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>)}</Box>
  </div>;
}
