import {readFile,writeFile,mkdir,mkdtemp,copyFile,symlink,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {join,dirname,resolve} from 'node:path';
const root=process.cwd(),directory=await mkdtemp('/tmp/c32h2-validation-'),tree=join(directory,'tree');await mkdir(tree);
const listed=(args:string[])=>execFileSync('git',args,{encoding:'utf8'}).split('\0').filter(Boolean);
const files=[...new Set([...listed(['ls-files','-z']),...listed(['ls-files','--others','--exclude-standard','-z'])])].sort();
const sourceProof:{path:string;sha256:string}[]=[];
for(const path of files){const target=join(tree,path);await mkdir(dirname(target),{recursive:true});await copyFile(join(root,path),target);if(/^(src|server|tests|scripts)\//u.test(path)||/^(package.*json|.*config\.[tj]s|stage20c32.html)$/u.test(path))sourceProof.push({path,sha256:createHash('sha256').update(await readFile(target)).digest('hex')});}
await symlink(join(root,'node_modules'),join(tree,'node_modules'),'dir');
await writeFile(join(directory,'source-proof.json'),JSON.stringify({root,tree,sourceProof,reason:'Exact candidate snapshot; legacy replay tests write benchmark reports. Original historical files must remain untouched.'},null,2)+'\n');
const results:{label:string;command:string[];exitCode:number|null;elapsedMs:number;log:string;testsPassed:number|null;testFiles:number|null;maxResidentSetSize:string|null}[]=[];
async function run(label:string,command:string,args:string[]){
 const log=join(directory,label+'.txt'),start=performance.now();
 const timeArgs=process.platform==='darwin'?['-l',command,...args]:['-v',command,...args];
 const r=spawnSync('/usr/bin/time',timeArgs,{cwd:tree,encoding:'utf8',maxBuffer:20*1024*1024,timeout:600000});const text=(r.stdout??'')+(r.stderr??'');await writeFile(log,text);
 const tests=/Tests\s+(\d+) passed/u.exec(text),testFiles=/Test Files\s+(\d+) passed/u.exec(text),memory=/(\d+)\s+maximum resident set size|Maximum resident set size[^\n]*/iu.exec(text);
 const result={label,command:[command,...args],exitCode:r.status,elapsedMs:performance.now()-start,log,testsPassed:tests?Number(tests[1]):null,testFiles:testFiles?Number(testFiles[1]):null,maxResidentSetSize:memory?.[0]??null};results.push(result);await writeFile(join(directory,'results.json'),JSON.stringify({directory,tree,sourceProof,results},null,2)+'\n');console.log(JSON.stringify(result));
 if(r.status!==0)throw new Error(label+' failed; no automatic retry. See '+log);
 for(const source of sourceProof)if(createHash('sha256').update(await readFile(join(tree,source.path))).digest('hex')!==source.sha256||createHash('sha256').update(await readFile(join(root,source.path))).digest('hex')!==source.sha256)throw new Error('Validated source changed: '+source.path);
}
const vitest=resolve(root,'node_modules/vitest/vitest.mjs');
const focused=(await readdir(join(tree,'tests'))).filter(n=>/^consent-stage20c32.*\.test\.(ts|tsx)$/u.test(n)).map(n=>'tests/'+n);
await run('focused',process.execPath,[vitest,'run',...focused]);
await run('c31',process.execPath,[vitest,'run','tests/consent-stage20c3.test.ts','tests/consent-stage20c3-view.test.tsx','tests/consent-stage20c31.test.ts','tests/consent-stage20c31-view.test.tsx','tests/consent-stage20c31-gateway.test.ts']);
const prior=(await readdir(join(tree,'tests'))).filter(n=>/^consent.*\.test\.(ts|tsx)$/u.test(n)&&!n.startsWith('consent-stage20c32')).map(n=>'tests/'+n);prior.push('tests/stage196-short-consent.test.ts');
await run('all-prior-consent',process.execPath,[vitest,'run',...prior]);
for(let i=1;i<=5;i++){await run('replay-'+i,process.execPath,[vitest,'run','tests/stage195-replay.test.ts']);await run('pcm-'+i,process.execPath,[vitest,'run','tests/continuous-transcription-gateway.test.ts','-t','forwards all 45 seconds']);}
for(let i=1;i<=3;i++)await run('full-'+i,'npm',['test']);
console.log('COMPLETE '+directory);
