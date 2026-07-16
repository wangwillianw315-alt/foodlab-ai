import type {BatchMonitoringProject,ImportedQAProduct,LinkedQAStandard,ShelfLifeToQAEnvelope,TransferHistoryEntry,TransferParseResult} from '../types/transfer';

export const QA_PRODUCTS_STORAGE_KEY='food-qa-dashboard-linked-products-v1';
export const QA_TRANSFER_HISTORY_KEY='food-qa-dashboard-transfer-history-v1';
export const FOODLAB_WORKSPACE_KEY='foodlab-workspace-id';

const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const idPattern=(prefix:string,value:unknown)=>typeof value==='string'&&new RegExp(`^${prefix}-[A-Fa-f0-9]{8,}$`).test(value);
const finiteNumberOrNull=(value:unknown)=>value===null||(typeof value==='number'&&Number.isFinite(value));
const rfc3339=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/;
const validDateTime=(value:unknown)=>{
  if(typeof value!=='string')return false;
  const match=value.match(rfc3339);if(!match||!Number.isFinite(Date.parse(value)))return false;
  const year=Number(match[1]);const month=Number(match[2]);const day=Number(match[3]);const hour=Number(match[4]);const minute=Number(match[5]);const second=Number(match[6]);
  const calendar=new Date(0);calendar.setUTCHours(0,0,0,0);calendar.setUTCFullYear(year,month-1,day);
  return calendar.getUTCFullYear()===year&&calendar.getUTCMonth()===month-1&&calendar.getUTCDate()===day&&hour<=23&&minute<=59&&second<=59&&(!match[8]||(Number(match[8])<=23&&Number(match[9])<=59));
};
const failure=(error:string):TransferParseResult=>({ok:false,error,warnings:[]});

export const createFoodLabId=(prefix:string)=>`${prefix}-${crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase()}`;

export function parseShelfLifeToQA(raw:string):TransferParseResult{
  let value:unknown;
  try{value=JSON.parse(raw)}catch{return failure('The selected file is not valid JSON.')}
  if(!isRecord(value)||value.foodlab_transfer!==true)return failure('This is not a FoodLab transfer file.');
  const version=typeof value.schema_version==='string'?value.schema_version:'';
  if(version!=='1.0.0'){
    const major=version.split('.')[0];
    return failure(major==='1'?`Schema ${version||'(missing)'} is newer than the supported 1.0.0 version.`:`Unsupported schema major version: ${version||'(missing)'}.`);
  }
  if(value.transfer_type!=='SHELF_LIFE_TO_QA'||value.source_module!=='SHELF_LIFE'||value.target_module!=='QA')return failure('Expected a Shelf Life to QA transfer.');
  if(!idPattern('TX',value.transfer_id)||!idPattern('WS',value.workspace_id)||!idPattern('SL',value.source_record_id))return failure('Transfer, workspace or source record ID is missing or has an invalid FoodLab prefix/format.');
  if(!validDateTime(value.exported_at)||typeof value.exported_by!=='string'||!value.exported_by.trim())return failure('Export timestamp or exporter metadata is missing or invalid.');
  if(!isRecord(value.metadata)||typeof value.metadata.application_version!=='string'||!value.metadata.application_version.trim()||typeof value.metadata.notes!=='string'||typeof value.metadata.disclaimer!=='string'||!value.metadata.disclaimer.trim())return failure('Transfer metadata must include a non-empty application_version, string notes and a non-empty disclaimer.');
  if(!isRecord(value.payload))return failure('Transfer payload is missing.');
  const payload=value.payload;
  if(!idPattern('PD',payload.product_project_id)||!idPattern('PR',payload.product_id)||!idPattern('FV',payload.formula_version_id)||!idPattern('SL',payload.shelf_life_study_id))return failure('Product, formula or shelf-life IDs are missing or have invalid FoodLab prefixes/formats.');
  if(payload.sensory_project_id!==undefined&&!idPattern('SN',payload.sensory_project_id))return failure('sensory_project_id must use the SN FoodLab ID format when supplied.');
  if(value.source_record_id!==payload.shelf_life_study_id)return failure('source_record_id must match payload.shelf_life_study_id.');
  const requiredStrings=['product_name','product_category','storage_condition','packaging_notes'] as const;
  if(requiredStrings.some(key=>typeof payload[key]!=='string')||!(payload.product_name as string).trim())return failure('The QA product payload is incomplete or contains invalid string fields.');
  if(!finiteNumberOrNull(payload.planning_shelf_life_days))return failure('planning_shelf_life_days must be a finite number or null.');
  if(!Array.isArray(payload.qa_parameters)||!Array.isArray(payload.scientific_limitations)||payload.scientific_limitations.some(item=>typeof item!=='string'))return failure('QA parameters or scientific limitations are invalid.');
  const invalidParameter=payload.qa_parameters.some(item=>{
    if(!isRecord(item))return true;
    return typeof item.parameter_name!=='string'||!item.parameter_name.trim()
      ||typeof item.unit!=='string'
      ||!finiteNumberOrNull(item.lower_limit)
      ||!finiteNumberOrNull(item.upper_limit)
      ||typeof item.warning_rule!=='string'||!item.warning_rule.trim()
      ||item.confirmed_by_user!==true;
  });
  if(invalidParameter)return failure('Every QA parameter must contain a name, unit, finite-number-or-null limits, warning_rule and confirmed_by_user=true.');
  const warnings:string[]=[];
  if(payload.qa_parameters.length===0)warnings.push('No confirmed QA limits were included.');
  return{ok:true,value:value as unknown as ShelfLifeToQAEnvelope,warnings};
}

const safeRead=<T>(key:string,fallback:T):T=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback}catch{return fallback}};
const safeWrite=(key:string,value:unknown)=>{localStorage.setItem(key,JSON.stringify(value))};
export const loadLinkedQAProducts=()=>{const value=safeRead<unknown>(QA_PRODUCTS_STORAGE_KEY,[]);return Array.isArray(value)?value.filter(item=>isRecord(item)&&typeof item.product_name==='string') as unknown as ImportedQAProduct[]:[]};
const isLinkedStandard=(value:unknown):value is LinkedQAStandard=>isRecord(value)&&typeof value.standard_id==='string'&&typeof value.qa_product_id==='string'&&typeof value.batch_id==='string'&&typeof value.product_name==='string'&&(value.status==='ACTIVE'||value.status==='DRAFT')&&Array.isArray(value.parameters)&&Array.isArray(value.scientific_limitations);
const isBatchMonitoringProject=(value:unknown):value is BatchMonitoringProject=>isRecord(value)&&typeof value.batch_id==='string'&&typeof value.qa_product_id==='string'&&typeof value.standard_id==='string'&&typeof value.product_name==='string'&&(value.status==='ACTIVE'||value.status==='DRAFT');
export const loadLinkedQAStandards=():LinkedQAStandard[]=>loadLinkedQAProducts().flatMap(product=>isLinkedStandard(product.linked_standard)?[product.linked_standard]:[]);
export const loadBatchMonitoringProjects=():BatchMonitoringProject[]=>loadLinkedQAProducts().flatMap(product=>isBatchMonitoringProject(product.batch_monitoring_project)?[product.batch_monitoring_project]:[]);
export const loadQATransferHistory=()=>{const value=safeRead<unknown>(QA_TRANSFER_HISTORY_KEY,[]);return Array.isArray(value)?value as TransferHistoryEntry[]:[]};
export const recordQATransfer=(entry:TransferHistoryEntry)=>{const next=[entry,...loadQATransferHistory()].slice(0,100);try{safeWrite(QA_TRANSFER_HISTORY_KEY,next)}catch{/* History failure must not block an import. */}return next};

export function saveShelfLifeImport(envelope:ShelfLifeToQAEnvelope,status:'ACTIVE'|'DRAFT'){
  const existing=loadLinkedQAProducts();
  const duplicate=existing.find(item=>item.product_name.trim().toLowerCase()===envelope.payload.product_name.trim().toLowerCase()||item.transfer_id===envelope.transfer_id||item.source_record_id===envelope.source_record_id);
  if(duplicate)return{ok:false as const,error:'This product, source study or transfer is already linked to QA. No existing standard or batch project was overwritten.'};
  const qaProductId=createFoodLabId('QA');
  const batchId=createFoodLabId('BA');
  const createdAt=new Date().toISOString();
  const linkedStandard:LinkedQAStandard={
    standard_id:qaProductId,qa_product_id:qaProductId,batch_id:batchId,workspace_id:envelope.workspace_id,
    product_name:envelope.payload.product_name,status,parameters:structuredClone(envelope.payload.qa_parameters),
    scientific_limitations:[...envelope.payload.scientific_limitations],source_transfer_id:envelope.transfer_id,
    source_record_id:envelope.source_record_id,created_at:createdAt,
  };
  const batchMonitoringProject:BatchMonitoringProject={
    batch_id:batchId,qa_product_id:qaProductId,standard_id:linkedStandard.standard_id,workspace_id:envelope.workspace_id,
    product_name:envelope.payload.product_name,status,product_project_id:envelope.payload.product_project_id,
    product_id:envelope.payload.product_id,formula_version_id:envelope.payload.formula_version_id,
    sensory_project_id:envelope.payload.sensory_project_id,shelf_life_study_id:envelope.payload.shelf_life_study_id,
    source_transfer_id:envelope.transfer_id,created_at:createdAt,
  };
  const product:ImportedQAProduct={
    ...envelope.payload,qa_product_id:qaProductId,batch_id:batchId,workspace_id:envelope.workspace_id,
    transfer_id:envelope.transfer_id,source_record_id:envelope.source_record_id,status,created_at:createdAt,
    linked_standard:linkedStandard,batch_monitoring_project:batchMonitoringProject,
  };
  try{safeWrite(QA_PRODUCTS_STORAGE_KEY,[...existing,product]);return{ok:true as const,product,linkedStandard,batchMonitoringProject}}
  catch{return{ok:false as const,error:'Browser storage is unavailable. Nothing was saved.'}}
}
