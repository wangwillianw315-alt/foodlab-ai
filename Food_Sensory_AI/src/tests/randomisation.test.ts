import {describe,expect,it} from 'vitest'; import {generateServingOrders,shuffle} from '../utils/randomisation';
describe('randomisation',()=>{it('does not lose samples',()=>{expect(shuffle(['a','b','c']).sort()).toEqual(['a','b','c']);expect(generateServingOrders([1,2,3],8)).toHaveLength(8)})});
