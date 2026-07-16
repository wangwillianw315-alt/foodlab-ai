export interface WorkflowStep{label:string;description:string;moduleId?:string}
export const workflowSteps:WorkflowStep[]=[
  {label:'Product Brief',description:'Define the product opportunity, target consumer and constraints.'},
  {label:'Formula Development',description:'Create, cost and compare formulation versions.',moduleId:'product-development'},
  {label:'Sensory Evaluation',description:'Test acceptability, differences and consumer response.',moduleId:'sensory'},
  {label:'Shelf-Life Validation',description:'Plan storage evidence and evaluate stability.',moduleId:'shelf-life'},
  {label:'Pilot Production',description:'Translate the selected formula into a controlled pilot run.'},
  {label:'QA Monitoring',description:'Track specifications, batches, warnings and failures.',moduleId:'qa'},
  {label:'Continuous Improvement',description:'Feed production evidence back into the next product iteration.'}
];

export interface TransferWorkflowStage{number:string;title:string;moduleId:string;module:string;input:string;processing:string;output:string;transferType:string;status:'IMPLEMENTED';exampleUrl?:string}
export const transferWorkflowStages:TransferWorkflowStage[]=[
  {number:'01',title:'Formula Development',moduleId:'product-development',module:'Food Product Development AI',input:'Product brief and up to four formula versions',processing:'Select samples, allergens and suggested test design',output:'Versioned product and sample handoff',transferType:'PRODUCT_TO_SENSORY',status:'IMPLEMENTED',exampleUrl:'/transfers/product-to-sensory.example.json'},
  {number:'02',title:'Sensory Evaluation',moduleId:'sensory',module:'Food Sensory AI',input:'Product transfer, formula mappings and samples',processing:'Create blind codes, run the study and aggregate evidence',output:'One shortlisted formula with aggregated sensory findings',transferType:'SENSORY_TO_SHELF_LIFE',status:'IMPLEMENTED',exampleUrl:'/transfers/sensory-to-shelf-life.example.json'},
  {number:'03',title:'Shelf-Life Validation',moduleId:'shelf-life',module:'Food Shelf Life Predictor',input:'Shortlisted formula and aggregated sensory focus',processing:'Define conditions, limits and transparent planning evidence',output:'Approved product and user-confirmed planning limits',transferType:'SHELF_LIFE_TO_QA',status:'IMPLEMENTED',exampleUrl:'/transfers/shelf-life-to-qa.example.json'},
  {number:'04',title:'QA Monitoring',moduleId:'qa',module:'Food QA Dashboard',input:'Shelf-life transfer and explicitly confirmed limits',processing:'Preview, confirm and create a linked standard or draft',output:'QA product, batch identifier and lifecycle traceability',transferType:'SHELF_LIFE_TO_QA import',status:'IMPLEMENTED'}
];
