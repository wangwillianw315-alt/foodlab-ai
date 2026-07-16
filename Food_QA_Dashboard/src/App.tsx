import { lazy, Suspense, useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ErrorMessage } from './components/ui/ErrorMessage';
import { LoadingState } from './components/ui/LoadingState';
import { QualityProvider, useQualityData } from './hooks/useQualityData';

const DashboardPage=lazy(()=>import('./pages/DashboardPage').then(module=>({default:module.DashboardPage})));
const DataExplorerPage=lazy(()=>import('./pages/DataExplorerPage').then(module=>({default:module.DataExplorerPage})));
const StandardsPage=lazy(()=>import('./pages/StandardsPage').then(module=>({default:module.StandardsPage})));
const LifecycleTransferPage=lazy(()=>import('./pages/LifecycleTransferPage').then(module=>({default:module.LifecycleTransferPage})));
const AboutPage=lazy(()=>import('./pages/AboutPage').then(module=>({default:module.AboutPage})));

export type Page='Dashboard'|'Data Explorer'|'Standards'|'Lifecycle Transfer'|'About';
const routes:Record<Page,string>={'Dashboard':'dashboard','Data Explorer':'data-explorer','Standards':'standards','Lifecycle Transfer':'lifecycle-transfer','About':'about'};
const pageFromHash=():Page=>Object.entries(routes).find(([,slug])=>window.location.hash===`#/${slug}`)?.[0] as Page||'Dashboard';

function Shell(){
  const [page,setPage]=useState<Page>(pageFromHash);
  const {loading,loadError,retry}=useQualityData();
  useEffect(()=>{if(!window.location.hash)history.replaceState(null,'','#/dashboard');const onHashChange=()=>setPage(pageFromHash());window.addEventListener('hashchange',onHashChange);return()=>window.removeEventListener('hashchange',onHashChange)},[]);
  const navigate=(next:Page)=>{window.location.hash=`/${routes[next]}`};
  const content=page==='Dashboard'?<DashboardPage/>:page==='Data Explorer'?<DataExplorerPage/>:page==='Standards'?<StandardsPage/>:page==='Lifecycle Transfer'?<LifecycleTransferPage/>:<AboutPage/>;
  return <div className="min-h-screen bg-slate-50">
    <button onClick={()=>document.getElementById('main-content')?.focus()} className="sr-only z-[100] rounded bg-white p-3 text-navy-800 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to main content</button>
    <header className="bg-white"><Header/><Navigation page={page} onChange={navigate}/></header>
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 focus:outline-none">{loading?<LoadingState/>:loadError?<ErrorMessage message={loadError} onRetry={retry}/>:<Suspense fallback={<LoadingState/>}>{content}</Suspense>}</main>
    <footer className="mt-10 border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">Food QA Dashboard v1.0.0 - Demonstration data only - All processing remains in your browser</footer>
  </div>;
}

export default function App(){return <ErrorBoundary><QualityProvider><Shell/></QualityProvider></ErrorBoundary>}
