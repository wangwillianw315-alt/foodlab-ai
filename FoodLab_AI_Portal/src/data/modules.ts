import {ClipboardCheck,FlaskConical,Hourglass,ScanSearch} from 'lucide-react';
import type {FoodLabModule,ModuleEnvironment} from '../types/module';

const resolvedUrl=(value:string|undefined,fallback:string,allowLocalFallback:boolean)=>value===undefined?(allowLocalFallback?fallback:''):value.trim();
const developmentUrls=import.meta.env.DEV?{
  productDevelopment:'http://localhost:5174',
  sensory:'http://localhost:5175',
  shelfLife:'http://localhost:5176',
  qa:'http://localhost:5177',
}:{productDevelopment:'',sensory:'',shelfLife:'',qa:''};

export function withModuleDefaults(value:Partial<FoodLabModule>,order=99):FoodLabModule{
  return {
    id:value.id||`module-${order}`,name:value.name||'Untitled module',shortName:value.shortName||value.name||'Module',
    description:value.description||'Module information is not available.',longDescription:value.longDescription||value.description||'Module information is not available.',
    purpose:value.purpose||'Purpose not specified.',colour:value.colour||'#64748B',icon:value.icon||FlaskConical,status:value.status||'NEEDS REVIEW',
    localUrl:value.localUrl||'',productionUrl:value.productionUrl||'',repositoryPath:value.repositoryPath||'',technologies:value.technologies||[],
    targetUsers:value.targetUsers||[],mainFeatures:value.mainFeatures||[],completedFeatures:value.completedFeatures||[],limitations:value.limitations||[],
    futureVersion:value.futureVersion||[],portfolioValue:value.portfolioValue||'Portfolio value not specified.',order:value.order??order
  };
}

export function createModules(env:ModuleEnvironment={},allowLocalFallback=true):FoodLabModule[]{
  const configured:FoodLabModule[]=[
    {
      id:'product-development',name:'Food Product Development AI',shortName:'Product Development',
      description:'Manage product briefs, formula versions, ingredient costs, estimated nutrition and product development trials.',
      longDescription:'A structured workspace for moving a food concept from product brief through iterative formula trials, cost and nutrition estimates, and development review.',
      purpose:'新品开发与配方管理。',colour:'#2563EB',icon:FlaskConical,status:'STABLE',
      localUrl:resolvedUrl(env.VITE_PRODUCT_DEVELOPMENT_URL,developmentUrls.productDevelopment,allowLocalFallback),productionUrl:'',repositoryPath:'../Food_Product_Development_AI',
      technologies:['React 18','TypeScript','Zustand','Zod','Recharts'],
      targetUsers:['Product Development Technologist','NPD Technologist','Food Scientist','R&D Assistant'],
      mainFeatures:['Product briefs and project tracking','Formula version comparison','Ingredient cost and nutrition estimates','Development trials and sensory summaries'],
      completedFeatures:['Local project and ingredient management','Formula scaling and target analysis','JSON/CSV portability','Versioned Product to Sensory JSON handoff'],
      limitations:['Illustrative calculations require supplier-data verification','No regulatory, safety or manufacturing approval','Transfers use explicit local JSON files; there is no shared database or live sync'],
      futureVersion:['Richer lifecycle traceability and transfer validation history','Shared ingredient reference definitions'],
      portfolioValue:'Demonstrates structured NPD workflows, traceable formula iteration and food-science calculation design.',order:1
    },
    {
      id:'sensory',name:'Food Sensory AI',shortName:'Sensory',
      description:'Design blinded sensory studies, analyse hedonic ratings, JAR results, preferences and consumer feedback.',
      longDescription:'A local-first sensory study workspace covering samples, panelists, blinded test design, response capture and transparent descriptive analysis.',
      purpose:'感官评价与消费者偏好分析。',colour:'#D97706',icon:ScanSearch,status:'STABLE',
      localUrl:resolvedUrl(env.VITE_SENSORY_URL,developmentUrls.sensory,allowLocalFallback),productionUrl:'',repositoryPath:'../Food_Sensory_AI',
      technologies:['React 18','TypeScript','Zustand','PapaParse','Recharts'],
      targetUsers:['Sensory Technician','Consumer Insights Assistant','Product Development','Food Scientist'],
      mainFeatures:['Blind codes and serving-order planning','Hedonic, JAR and difference-test analysis','Panelist and response management','Consumer comment exploration'],
      completedFeatures:['Sensory project workspace','Receive Product Development JSON handoffs','Aggregate-only Shelf Life JSON handoff','JSON/CSV exports'],
      limitations:['No live survey collection','No validated statistical decision workflow','Transfers remain local JSON files with no shared database or live sync'],
      futureVersion:['Expanded inferential methods and study provenance','Richer lifecycle audit history'],
      portfolioValue:'Connects experimental design, consumer data and careful interpretation in a practical browser workflow.',order:2
    },
    {
      id:'shelf-life',name:'Food Shelf Life Predictor',shortName:'Shelf Life',
      description:'Plan storage studies, manage sampling schedules, analyse stability data and generate transparent shelf-life estimates.',
      longDescription:'A research-planning tool for storage conditions, sampling schedules, stability observations, limits, transparent models and cautious reporting.',
      purpose:'保质期实验与稳定性预测。',colour:'#7357C7',icon:Hourglass,status:'STABLE',
      localUrl:resolvedUrl(env.VITE_SHELF_LIFE_URL,developmentUrls.shelfLife,allowLocalFallback),productionUrl:'',repositoryPath:'../Food_Shelf_Life_Predictor',
      technologies:['React 18','TypeScript','Zustand','PapaParse','Recharts','simple-statistics'],
      targetUsers:['Food Technologist','R&D Technologist','QA Technologist','Shelf-Life Research Assistant'],
      mainFeatures:['Storage-study design','Sampling schedule management','Stability and limit assessment','Q10, Arrhenius and trend demonstrations'],
      completedFeatures:['Study, condition and result management','Receive aggregate Sensory JSON handoffs','Confirmed-limit QA JSON handoff','Structured research reports'],
      limitations:['Cannot determine a commercial expiry date','Requires validated laboratory methods and professional review','Transfers remain local JSON files with no shared database or live sync'],
      futureVersion:['Shared parameter definitions and evidence metadata','Richer lifecycle audit history'],
      portfolioValue:'Shows responsible modelling, study planning and explicit separation of quality and safety evidence.',order:3
    },
    {
      id:'qa',name:'Food QA Dashboard',shortName:'QA Monitoring',
      description:'Import food quality data, identify warnings and failures, compare batches and monitor production quality trends.',
      longDescription:'A browser-based quality dashboard for importing batch records, applying editable product standards, investigating exceptions and viewing production trends.',
      purpose:'生产质量数据监控。',colour:'#2E9D61',icon:ClipboardCheck,status:'COMPLETE',
      localUrl:resolvedUrl(env.VITE_QA_URL,developmentUrls.qa,allowLocalFallback),productionUrl:'',repositoryPath:'../Food_QA_Dashboard',
      technologies:['React 19','TypeScript','PapaParse','ExcelJS','Recharts','Vitest'],
      targetUsers:['QA Assistant','QC Technician','Food Technologist','Quality Coordinator'],
      mainFeatures:['CSV and Excel import','Configurable quality standards','Batch comparison and exception review','Trend dashboards and exports'],
      completedFeatures:['Quality assessment rules','Data explorer and filters','Standards editor','Shelf Life planning-standard JSON import'],
      limitations:['Browser-local demonstration only','Standards require site-specific validation','Transfers remain local JSON files with no shared database or live sync'],
      futureVersion:['Shared batch identifiers and audit metadata','Richer lifecycle audit history'],
      portfolioValue:'Demonstrates data-quality handling, defensible rules, traceable exceptions and production-facing visual analytics.',order:4
    }
  ];
  return configured.map((item,index)=>withModuleDefaults(item,index+1)).sort((a,b)=>a.order-b.order);
}

export const modules=createModules(import.meta.env,import.meta.env.DEV);
