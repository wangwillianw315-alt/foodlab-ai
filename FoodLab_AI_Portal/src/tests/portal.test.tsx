import {renderToString} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
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
  it('returns the correct URL for Open Module',()=>{expect(getModuleUrl(createModules()[1].localUrl)).toEqual({url:'http://localhost:5175/',error:''})});
  it('uses safe defaults when module data is incomplete',()=>{expect(withModuleDefaults({id:'partial'},7)).toMatchObject({id:'partial',name:'Untitled module',status:'NEEDS REVIEW',order:7,technologies:[]})});
  it('renders module status labels',()=>{expect(renderToString(<StatusBadge status="COMPLETE"/>)).toContain('COMPLETE')});
  it('describes implemented Phase 2 handoffs without implying a shared database',()=>{const items=createModules();expect(items.every(x=>x.limitations.some(item=>item.includes('local JSON')&&item.includes('no shared database')))).toBe(true);expect(items.flatMap(x=>x.completedFeatures).join(' ')).toContain('Product to Sensory JSON handoff');expect(items.flatMap(x=>x.completedFeatures).join(' ')).toContain('Shelf Life planning-standard JSON import')});
});

describe('portal navigation content',()=>{
  it('includes all four linked lifecycle modules',()=>{expect(workflowSteps.filter(x=>x.moduleId).map(x=>x.moduleId)).toEqual(['product-development','sensory','shelf-life','qa']);expect(workflowSteps.some(x=>x.label==='QA Monitoring')).toBe(true)});
  it('renders a safe not-found page model',()=>{const page=NotFoundPage();expect(page.props.children[1].props.children).toBe('Page not found')});
  it('publishes all three Phase 2 transfer examples',()=>{expect(transferWorkflowStages.filter(x=>x.exampleUrl).map(x=>x.transferType)).toEqual(['PRODUCT_TO_SENSORY','SENSORY_TO_SHELF_LIFE','SHELF_LIFE_TO_QA'])});
});
