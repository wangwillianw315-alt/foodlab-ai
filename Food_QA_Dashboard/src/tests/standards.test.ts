import {afterEach,describe,expect,it,vi} from 'vitest';
import {defaultQualityStandards} from '../data/qualityStandards';
import {cloneStandards,loadStoredStandards,STANDARDS_STORAGE_KEY,validateStandard,validateStandards} from '../utils/standards';

afterEach(()=>vi.unstubAllGlobals());

describe('quality standard configuration',()=>{
  it('deep clones defaults without allowing nested mutation',()=>{const copy=cloneStandards(defaultQualityStandards);copy.Milk.ph.max=9;expect(defaultQualityStandards.Milk.ph.max).toBe(6.8)});
  it('accepts valid demonstration standards',()=>expect(validateStandards(defaultQualityStandards)).toEqual({}));
  it('rejects invalid ranges and warning margins',()=>{const standard=cloneStandards(defaultQualityStandards).Milk;standard.ph.min=7;standard.ph.max=6;standard.warningMarginPercent=50;expect(validateStandard(standard)).toEqual(expect.arrayContaining([expect.stringContaining('pH'),expect.stringContaining('Warning margin')]))});
  it('rejects water activity above one and moisture above 100 percent',()=>{const standard=cloneStandards(defaultQualityStandards).Milk;standard.waterActivity.max=1.1;standard.moisture.max=101;expect(validateStandard(standard)).toHaveLength(2)});
  it('falls back safely when stored JSON is corrupt',()=>{vi.stubGlobal('localStorage',{getItem:()=>'{broken'});expect(loadStoredStandards()).toEqual(defaultQualityStandards)});
  it('falls back safely when browser storage throws',()=>{vi.stubGlobal('localStorage',{getItem:()=>{throw new DOMException('blocked','SecurityError')}});expect(loadStoredStandards()).toEqual(defaultQualityStandards)});
  it('drops extra products and forces canonical product identities',()=>{const stored={...cloneStandards(defaultQualityStandards),Milk:{...cloneStandards(defaultQualityStandards).Milk,productName:'Changed'},Extra:cloneStandards(defaultQualityStandards).Milk};vi.stubGlobal('localStorage',{getItem:(key:string)=>key===STANDARDS_STORAGE_KEY?JSON.stringify(stored):null});const loaded=loadStoredStandards();expect(Object.keys(loaded)).toEqual(Object.keys(defaultQualityStandards));expect(loaded.Milk.productName).toBe('Milk')});
});
