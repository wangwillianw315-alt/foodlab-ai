import {spawn} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const [project,task,port]=process.argv.slice(2);
const root=resolve(project||'');
if(!project||!existsSync(resolve(root,'package.json'))){console.error(`Unknown project: ${project||'(missing)'}`);process.exit(1)}
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
if(!pkg.scripts?.[task]){console.error(`${project} has no ${task} script`);process.exit(1)}

const node=process.execPath;
const bin=(name,file)=>resolve(root,'node_modules',name,file);
const commands={
  dev:[[node,[bin('vite','bin/vite.js'),'--port',port,'--strictPort']]],
  build:[[node,[bin('typescript','bin/tsc'),'-b']],[node,[bin('vite','bin/vite.js'),'build']]],
  test:[[node,[bin('vitest','vitest.mjs'),'run']]]
};
if(!commands[task]){console.error(`Unsupported task: ${task}`);process.exit(1)}

let active;
const forward=signal=>{if(active&&!active.killed)active.kill(signal)};
process.on('SIGINT',()=>forward('SIGINT'));
process.on('SIGTERM',()=>forward('SIGTERM'));

for(const [command,args] of commands[task]){
  const code=await new Promise((done,reject)=>{active=spawn(command,args,{cwd:root,stdio:'inherit'});active.on('error',reject);active.on('exit',value=>done(value??1))});
  if(code!==0)process.exit(code);
}
