import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {defaultQualityStandards} from '../data/qualityStandards';
import type {DataSourceInfo,FoodQualityRecord,ParseResult,QualityStandardsMap} from '../types/quality';
import type {BatchMonitoringProject,LinkedQAStandard} from '../types/transfer';
import {parseQualityCsv} from '../utils/csvParser';
import {assessRecord} from '../utils/qualityAssessment';
import {cloneStandards,loadStoredStandards,STANDARDS_STORAGE_KEY,validateStandards} from '../utils/standards';
import {loadBatchMonitoringProjects,loadLinkedQAStandards} from '../utils/transfer';

type ContextValue={records:FoodQualityRecord[];standards:QualityStandardsMap;linkedStandards:LinkedQAStandard[];batchMonitoringProjects:BatchMonitoringProject[];standardsStorageWarning:string;loading:boolean;loadError:string;importResult:ParseResult|null;source:DataSourceInfo|null;importCsv:(text:string,fileName?:string)=>void;saveStandards:(next:QualityStandardsMap)=>boolean;refreshLifecycleData:()=>void;resetStandards:()=>void;resetSample:()=>void;retry:()=>void};
const QualityContext=createContext<ContextValue|null>(null);
const SESSION_KEY='food-qa-dashboard-session-v1';

export function QualityProvider({children}:{children:ReactNode}){
  const[standards,setStandards]=useState<QualityStandardsMap>(loadStoredStandards);
  const[linkedStandards,setLinkedStandards]=useState<LinkedQAStandard[]>(loadLinkedQAStandards);
  const[batchMonitoringProjects,setBatchMonitoringProjects]=useState<BatchMonitoringProject[]>(loadBatchMonitoringProjects);
  const[standardsStorageWarning,setStandardsStorageWarning]=useState('');
  const[records,setRecords]=useState<FoodQualityRecord[]>([]);const[loading,setLoading]=useState(true);
  const[loadError,setLoadError]=useState('');const[importResult,setImportResult]=useState<ParseResult|null>(null);const[source,setSource]=useState<DataSourceInfo|null>(null);

  const readSession=()=>{try{return sessionStorage.getItem(SESSION_KEY)}catch{return null}};
  const clearSession=()=>{try{sessionStorage.removeItem(SESSION_KEY)}catch{/* Storage restrictions must not block sample loading. */}};
  const persistSession=(nextRecords:FoodQualityRecord[],nextSource:DataSourceInfo|null)=>{if(!nextSource||nextSource.isSample)return;try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({records:nextRecords,source:nextSource}))}catch{/* Data remains available in memory if storage quota is exceeded. */}};
  const load=()=>{setLoading(true);setLoadError('');fetch('/sample-food-quality-data.csv').then(response=>{if(!response.ok)throw new Error('Sample data could not be loaded');return response.text()}).then(text=>{const result=parseQualityCsv(text,standards,linkedStandards);setRecords(result.records);setSource({name:'Built-in sample dataset',importedAt:new Date().toISOString(),validRows:result.records.length,rejectedRows:result.errors.length,isSample:true});setImportResult(null);clearSession()}).catch(error=>setLoadError(error instanceof Error?error.message:'Unable to load data')).finally(()=>setLoading(false));};

  useEffect(()=>{const saved=readSession();if(saved){try{const value=JSON.parse(saved) as {records:FoodQualityRecord[];source:DataSourceInfo};const reassessed=value.records.map(record=>assessRecord(record,standards,linkedStandards));setRecords(reassessed);setSource(value.source);persistSession(reassessed,value.source);setLoading(false);return}catch{clearSession()}}load()},[]);

  const importCsv=(text:string,fileName='Uploaded CSV')=>{const result=parseQualityCsv(text,standards,linkedStandards);setImportResult(result);if(result.records.length){const nextSource={name:fileName,importedAt:new Date().toISOString(),validRows:result.records.length,rejectedRows:result.errors.length,isSample:false};setRecords(result.records);setSource(nextSource);setLoadError('');persistSession(result.records,nextSource)}};
  const applyStandards=(next:QualityStandardsMap,persist:boolean)=>{if(Object.keys(validateStandards(next)).length)return false;const safe=cloneStandards(next);setStandards(safe);setRecords(current=>{const reassessed=current.map(record=>assessRecord(record,safe,linkedStandards));persistSession(reassessed,source);return reassessed});try{if(persist)localStorage.setItem(STANDARDS_STORAGE_KEY,JSON.stringify(safe));else localStorage.removeItem(STANDARDS_STORAGE_KEY);setStandardsStorageWarning('')}catch{setStandardsStorageWarning('Standards are active for this page, but browser storage is unavailable so they may not persist after reload.')}return true};
  const refreshLifecycleData=()=>{const nextStandards=loadLinkedQAStandards();setLinkedStandards(nextStandards);setBatchMonitoringProjects(loadBatchMonitoringProjects());setRecords(current=>{const reassessed=current.map(record=>assessRecord(record,standards,nextStandards));persistSession(reassessed,source);return reassessed})};
  const saveStandards=(next:QualityStandardsMap)=>applyStandards(next,true);
  const resetStandards=()=>{applyStandards(cloneStandards(defaultQualityStandards),false)};
  const value=useMemo(()=>({records,standards,linkedStandards,batchMonitoringProjects,standardsStorageWarning,loading,loadError,importResult,source,importCsv,saveStandards,refreshLifecycleData,resetStandards,resetSample:load,retry:load}),[records,standards,linkedStandards,batchMonitoringProjects,standardsStorageWarning,loading,loadError,importResult,source]);
  return <QualityContext.Provider value={value}>{children}</QualityContext.Provider>;
}

export function useQualityData(){const context=useContext(QualityContext);if(!context)throw new Error('useQualityData must be inside provider');return context}
