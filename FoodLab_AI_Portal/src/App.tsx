import {Route,Routes} from 'react-router-dom';
import {SiteLayout} from './components/layout/SiteLayout';
import {AboutPage} from './pages/AboutPage';
import {HomePage} from './pages/HomePage';
import {ModulesPage} from './pages/ModulesPage';
import {NotFoundPage} from './pages/NotFoundPage';
import {PortfolioPage} from './pages/PortfolioPage';
import {WorkflowPage} from './pages/WorkflowPage';
export default function App(){return <Routes><Route element={<SiteLayout/>}><Route path="/" element={<HomePage/>}/><Route path="/modules" element={<ModulesPage/>}/><Route path="/workflow" element={<WorkflowPage/>}/><Route path="/portfolio" element={<PortfolioPage/>}/><Route path="/about" element={<AboutPage/>}/><Route path="*" element={<NotFoundPage/>}/></Route></Routes>}
