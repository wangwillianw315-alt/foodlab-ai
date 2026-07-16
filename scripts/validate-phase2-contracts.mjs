import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const schemaFiles=['foodlab-envelope.schema.json','product-to-sensory.schema.json','sensory-to-shelf-life.schema.json','shelf-life-to-qa.schema.json'];
for(const file of schemaFiles){const schema=read(`shared-contracts/${file}`);assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');assert.ok(schema.$id)}

const cases=[
  ['product-to-sensory','PRODUCT_TO_SENSORY','PRODUCT_DEVELOPMENT','SENSORY'],
  ['sensory-to-shelf-life','SENSORY_TO_SHELF_LIFE','SENSORY','SHELF_LIFE'],
  ['shelf-life-to-qa','SHELF_LIFE_TO_QA','SHELF_LIFE','QA']
];
for(const [name,type,source,target] of cases){
  const shared=read(`shared-contracts/examples/${name}.example.json`);const portal=read(`FoodLab_AI_Portal/public/transfers/${name}.example.json`);
  assert.deepEqual(portal,shared,`${name} Portal download must match the documented contract example`);
  assert.equal(shared.foodlab_transfer,true);assert.equal(shared.schema_version,'1.0.0');assert.equal(shared.transfer_type,type);assert.equal(shared.source_module,source);assert.equal(shared.target_module,target);
  assert.match(shared.transfer_id,/^TX-[A-F0-9]{8,}$/i);assert.match(shared.workspace_id,/^WS-[A-F0-9]{8,}$/i);assert.ok(shared.payload&&typeof shared.payload==='object');assert.ok(shared.metadata.disclaimer);
}

const sensory=read('shared-contracts/examples/sensory-to-shelf-life.example.json');
const forbidden=new Set(['panelists','panelist_id','participant_code','demographics','age_group','gender']);
const visit=value=>{if(Array.isArray(value))return value.forEach(visit);if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){assert.equal(forbidden.has(key),false,`Sensory aggregate payload contains forbidden key ${key}`);visit(item)}};
visit(sensory.payload);
const shelf=read('shared-contracts/examples/shelf-life-to-qa.example.json');assert.ok(shelf.payload.qa_parameters.every(item=>item.confirmed_by_user===true));
const product=read('shared-contracts/examples/product-to-sensory.example.json');assert.ok(product.payload.samples.length<=4);assert.ok(product.payload.samples.every(item=>!Object.hasOwn(item,'cost_summary')));

for(const [name] of cases)assert.ok(existsSync(resolve(root,`FoodLab_AI_Portal/public/transfers/${name}.example.json`)));
console.log(`Phase 2 contracts valid: ${cases.length} examples, ${schemaFiles.length} schemas.`);
