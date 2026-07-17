import {renderToString} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import App from '../App';
import {ModuleCard} from '../components/modules/ModuleCard';
import {StatusBadge} from '../components/ui/StatusBadge';
import {createModules,withModuleDefaults} from '../data/modules';
import {transferWorkflowStages,workflowSteps} from '../data/workflow';
import {NotFoundPage} from '../pages/NotFoundPage';
import {getModuleUrl} from '../utils/moduleUrl';

describe('portal module configuration',()=>{
  it('loads four modules in order',()=>{const items=createModules();expect(items).toHaveLength(4);expect(items.map(x=>x.order)).toEqual([1,2,3,4])});
  it('does not fail when a URL is explicitly missing',()=>{const items=createModules({VITE_SENSORY_URL:''});expect(items.find(x=>x.id==='sensory')?.localUrl).toBe('');expect(getModuleUrl('')).toMatchObject({error:'Module URL not configured'})});
  it('allows environment URL overrides',()=>{const items=createModules({VITE_QA_URL:'http://127.0.0.1:9000'});expect(items.find(x=>x.id==='qa')?.localUrl).toBe('http://127.0.0.1:9000')});
  it('rejects invalid module URLs',()=>{expect(getModuleUrl('not a url').error).toBe('Module URL is invalid')});
  it('uses safe defaults when optional environment data is absent',()=>{expect(createModules({})[0]).toMatchObject({name:'Food Product Development AI',status:'STABLE',localUrl:'http://localhost:5174'})});
  it('does not use localhost when a production URL is missing',()=>{expect(createModules({},false).every(item=>item.localUrl==='')).toBe(true)});
  it('uses configured HTTPS module URLs in production',()=>{expect(createModules({VITE_QA_URL:'https://foodlab-qa.example.com'},false).find(item=>item.id==='qa')?.localUrl).toBe('https://foodlab-qa.example.com')});
  it('returns the correct URL for Open Module',()=>{expect(getModuleUrl(createModules()[1].localUrl)).toEqual({url:'http://localhost:5175/',error:''})});
  it('uses safe defaults when module data is incomplete',()=>{expect(withModuleDefaults({id:'partial'},7)).toMatchObject({id:'partial',name:'Untitled module',status:'NEEDS REVIEW',order:7,technologies:[]})});
  it('renders module status labels',()=>{expect(renderToString(<StatusBadge status="COMPLETE"/>)).toContain('COMPLETE')});
  it('describes implemented Phase 2 handoffs without implying a shared database',()=>{const items=createModules();expect(items.every(x=>x.limitations.some(item=>item.includes('local JSON')&&item.includes('no shared database')))).toBe(true);expect(items.flatMap(x=>x.completedFeatures).join(' ')).toContain('Product to Sensory JSON handoff');expect(items.flatMap(x=>x.completedFeatures).join(' ')).toContain('Shelf Life planning-standard JSON import')});
});

describe('portal navigation content',()=>{
  it('includes all four linked lifecycle modules',()=>{expect(workflowSteps.filter(x=>x.moduleId).map(x=>x.moduleId)).toEqual(['product-development','sensory','shelf-life','qa']);expect(workflowSteps.some(x=>x.label==='QA Monitoring')).toBe(true)});
  it('renders a safe not-found page model',()=>{const page=NotFoundPage();expect(page.props.children[1].props.children).toBe('Page not found')});
  it('publishes all three Phase 2 transfer examples',()=>{expect(transferWorkflowStages.filter(x=>x.exampleUrl).map(x=>x.transferType)).toEqual(['PRODUCT_TO_SENSORY','SENSORY_TO_SHELF_LIFE','SHELF_LIFE_TO_QA'])});
  it.each(['/','/modules','/workflow','/portfolio','/about','/limitations','/demo'])('renders the %s deployment route',route=>{const html=renderToString(<MemoryRouter initialEntries={[route]}><App/></MemoryRouter>);expect(html).not.toContain('Page not found')});
  it('renders safe new-tab module links',()=>{const module=createModules({VITE_PRODUCT_DEVELOPMENT_URL:'https://product.example.com'},false)[0];const html=renderToString(<MemoryRouter><ModuleCard module={module}/></MemoryRouter>);expect(html).toContain('target="_blank"');expect(html).toContain('rel="noopener noreferrer"')});
});
