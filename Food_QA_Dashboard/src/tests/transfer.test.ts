import {readFileSync} from 'node:fs';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {defaultQualityStandards} from '../data/qualityStandards';
import type {ShelfLifeToQAEnvelope} from '../types/transfer';
import {parseQualityCsv} from '../utils/csvParser';
import {loadBatchMonitoringProjects,loadLinkedQAProducts,loadLinkedQAStandards,loadQATransferHistory,parseShelfLifeToQA,recordQATransfer,saveShelfLifeImport} from '../utils/transfer';

const storage=new Map<string,string>();
beforeEach(()=>{storage.clear();vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)})});
afterEach(()=>vi.unstubAllGlobals());

const envelope=():ShelfLifeToQAEnvelope=>({
  foodlab_transfer:true,schema_version:'1.0.0',transfer_id:'TX-A1B2C3D4',transfer_type:'SHELF_LIFE_TO_QA',source_module:'SHELF_LIFE',target_module:'QA',
  exported_at:'2026-07-16T00:00:00.000Z',exported_by:'Local user',workspace_id:'WS-A1B2C3D4',source_record_id:'SL-A1B2C3D4',
  payload:{product_project_id:'PD-A1B2C3D4',product_id:'PR-A1B2C3D4',formula_version_id:'FV-A1B2C3D4',sensory_project_id:'SN-A1B2C3D4',shelf_life_study_id:'SL-A1B2C3D4',product_name:'Demo Product',product_category:'Snack',planning_shelf_life_days:90,storage_condition:'Ambient',packaging_notes:'Sealed',qa_parameters:[{parameter_name:'Moisture',unit:'%',lower_limit:5,upper_limit:10,warning_rule:'Warn within 10% of either limit',confirmed_by_user:true}],scientific_limitations:['Planning only']},
  metadata:{application_version:'1.0.0',notes:'test',disclaimer:'Planning values only'},
});
const asJson=(value:unknown)=>JSON.stringify(value);
const without=(value:Record<string,unknown>,key:string)=>{const copy=structuredClone(value);delete copy[key];return copy};
const csv=(batch:string,moisture:string)=>`sample_id,product_name,batch_number,test_date,ph,water_activity,moisture_percent,temperature_c,protein_percent,fat_percent\nS-1,Demo Product,${batch},2026-07-16,,,${moisture},,,`;

describe('Shelf Life to QA contract validation',()=>{
  it('accepts the complete supported transfer envelope',()=>expect(parseShelfLifeToQA(asJson(envelope()))).toMatchObject({ok:true,warnings:[]}));
  it('accepts the published shared-contract example',()=>expect(parseShelfLifeToQA(readFileSync('../shared-contracts/examples/shelf-life-to-qa.example.json','utf8')).ok).toBe(true));
  it('rejects every missing required envelope field',()=>{
    const required=['foodlab_transfer','schema_version','transfer_id','transfer_type','source_module','target_module','exported_at','exported_by','workspace_id','source_record_id','payload','metadata'];
    for(const key of required)expect(parseShelfLifeToQA(asJson(without(envelope() as unknown as Record<string,unknown>,key))).ok,`missing ${key}`).toBe(false);
  });
  it('rejects wrong direction and unsupported schema versions',()=>{
    expect(parseShelfLifeToQA(asJson({...envelope(),transfer_type:'PRODUCT_TO_SENSORY'})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),schema_version:'1.1.0'})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),schema_version:'2.0.0'})).ok).toBe(false);
  });
  it('rejects malformed transfer, workspace and lifecycle ID prefixes',()=>{
    for(const update of [
      {transfer_id:'TX-NOTHEX123'},{workspace_id:'PD-A1B2C3D4'},{source_record_id:'QA-A1B2C3D4'},
      {payload:{...envelope().payload,product_project_id:'PR-A1B2C3D4'}},{payload:{...envelope().payload,product_id:'PD-A1B2C3D4'}},
      {payload:{...envelope().payload,formula_version_id:'SL-A1B2C3D4'}},{payload:{...envelope().payload,shelf_life_study_id:'QA-A1B2C3D4'}},
      {payload:{...envelope().payload,sensory_project_id:'PD-A1B2C3D4'}},
    ])expect(parseShelfLifeToQA(asJson({...envelope(),...update})).ok).toBe(false);
  });
  it('requires source_record_id to map to shelf_life_study_id',()=>expect(parseShelfLifeToQA(asJson({...envelope(),source_record_id:'SL-FFFFFFFF'}))).toMatchObject({ok:false,error:expect.stringContaining('must match')}));
  it('rejects invalid export and metadata fields',()=>{
    expect(parseShelfLifeToQA(asJson({...envelope(),exported_at:'2026-07-16'})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),exported_at:'2026-02-30T00:00:00.000Z'})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),exported_by:' '})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),metadata:{notes:'missing app version'}})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),metadata:{application_version:' ',notes:'test',disclaimer:'Planning only'}})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),metadata:{application_version:'1',notes:2}})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),metadata:{application_version:'1',notes:'ok',disclaimer:42}})).ok).toBe(false);
  });
  it('rejects a missing or empty required disclaimer',()=>{
    expect(parseShelfLifeToQA(asJson({...envelope(),metadata:{application_version:'1.0.0',notes:'test'}})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),metadata:{application_version:'1.0.0',notes:'test',disclaimer:''}})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),metadata:{application_version:'1.0.0',notes:'test',disclaimer:'   '}})).ok).toBe(false);
  });
  it('rejects missing payload fields and invalid number/null shapes',()=>{
    expect(parseShelfLifeToQA(asJson({...envelope(),payload:without(envelope().payload as unknown as Record<string,unknown>,'product_category')})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),payload:{...envelope().payload,planning_shelf_life_days:'90'}})).ok).toBe(false);
    expect(parseShelfLifeToQA(asJson({...envelope(),payload:{...envelope().payload,scientific_limitations:['valid',3]}})).ok).toBe(false);
  });
  it('requires complete confirmed parameters, warning rules and numeric/null limits',()=>{
    const parameter=envelope().payload.qa_parameters[0];
    for(const invalid of [
      {...parameter,parameter_name:''},{...parameter,lower_limit:'5'},{...parameter,upper_limit:[]},{...parameter,warning_rule:''},{...parameter,confirmed_by_user:false},without(parameter as unknown as Record<string,unknown>,'unit'),
    ])expect(parseShelfLifeToQA(asJson({...envelope(),payload:{...envelope().payload,qa_parameters:[invalid]}})).ok).toBe(false);
  });
  it('handles invalid JSON without throwing',()=>expect(parseShelfLifeToQA('{broken')).toMatchObject({ok:false}));
});

describe('Shelf Life to QA imported artifacts',()=>{
  it('atomically creates a linked product, custom standard and batch monitoring project',()=>{
    const result=saveShelfLifeImport(envelope(),'ACTIVE');
    expect(result.ok).toBe(true);
    if(!result.ok)return;
    expect(result.product).toMatchObject({product_project_id:'PD-A1B2C3D4',sensory_project_id:'SN-A1B2C3D4',shelf_life_study_id:'SL-A1B2C3D4',status:'ACTIVE'});
    expect(result.linkedStandard).toMatchObject({standard_id:result.product.qa_product_id,batch_id:result.product.batch_id,status:'ACTIVE',source_record_id:'SL-A1B2C3D4'});
    expect(result.batchMonitoringProject).toMatchObject({batch_id:result.product.batch_id,standard_id:result.product.qa_product_id,status:'ACTIVE'});
    expect(loadLinkedQAProducts()).toHaveLength(1);expect(loadLinkedQAStandards()).toHaveLength(1);expect(loadBatchMonitoringProjects()).toHaveLength(1);
  });
  it('never overwrites a matching product, source study or transfer',()=>{
    expect(saveShelfLifeImport(envelope(),'ACTIVE').ok).toBe(true);
    expect(saveShelfLifeImport(envelope(),'DRAFT')).toMatchObject({ok:false});
    const changedName={...envelope(),payload:{...envelope().payload,product_name:'Changed name'}};
    expect(saveShelfLifeImport(changedName,'ACTIVE')).toMatchObject({ok:false});
    expect(loadLinkedQAProducts()).toHaveLength(1);
  });
  it('uses an active linked standard for the matching product and generated batch',()=>{
    const saved=saveShelfLifeImport(envelope(),'ACTIVE');expect(saved.ok).toBe(true);if(!saved.ok)return;
    const linked=loadLinkedQAStandards();
    expect(parseQualityCsv(csv(saved.product.batch_id,'11'),defaultQualityStandards,linked).records[0]).toMatchObject({status:'FAIL',failed_parameters:['Moisture'],assessment_source:'LIFECYCLE_TRANSFER',assessment_standard_id:saved.product.qa_product_id});
    expect(parseQualityCsv(csv(saved.product.batch_id,'9.8'),defaultQualityStandards,linked).records[0]).toMatchObject({status:'WARNING',warning_parameters:['Moisture']});
    expect(parseQualityCsv(csv(saved.product.batch_id,'7'),defaultQualityStandards,linked).records[0]).toMatchObject({status:'PASS'});
  });
  it('does not apply a linked standard to the wrong batch or to a draft',()=>{
    const active=saveShelfLifeImport(envelope(),'ACTIVE');expect(active.ok).toBe(true);if(!active.ok)return;
    expect(parseQualityCsv(csv('BA-FFFFFFFF','7'),defaultQualityStandards,loadLinkedQAStandards()).records[0]).toMatchObject({status:'INCOMPLETE',missing_parameters:expect.arrayContaining(['Unsupported product'])});
    storage.clear();const draft=saveShelfLifeImport(envelope(),'DRAFT');expect(draft.ok).toBe(true);if(!draft.ok)return;
    expect(parseQualityCsv(csv(draft.product.batch_id,'7'),defaultQualityStandards,loadLinkedQAStandards()).records[0]).toMatchObject({status:'INCOMPLETE',missing_parameters:expect.arrayContaining(['Unsupported product'])});
  });
  it('records metadata-only transfer history',()=>{recordQATransfer({transfer_id:'TX-A1B2C3D4',transfer_type:'SHELF_LIFE_TO_QA',imported_or_exported:'IMPORTED',timestamp:new Date().toISOString(),linked_record_id:'QA-A1B2C3D4',filename:'transfer.json',success:true,warning_count:0});expect(loadQATransferHistory()).toHaveLength(1);expect(JSON.stringify(loadQATransferHistory())).not.toContain('qa_parameters')});
  it('keeps cross-module identifiers optional for old linked data',()=>{storage.set('food-qa-dashboard-linked-products-v1',JSON.stringify([{product_name:'Legacy'}]));expect(loadLinkedQAProducts()[0].product_name).toBe('Legacy');expect(loadLinkedQAStandards()).toEqual([]);expect(loadBatchMonitoringProjects()).toEqual([])});
});
