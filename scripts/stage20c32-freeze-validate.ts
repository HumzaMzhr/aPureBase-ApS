/** Sequential isolated validation; no retries, timeout/config changes or live providers. */
import {readFile,writeFile,mkdir,mkdtemp,copyFile,symlink,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {join,dirname,resolve} from 'node:path';
const root=process.cwd(),directory=await mkdtemp('/private/tmp/c32-freeze-validation-'),tree=join(directory,'tree');await mkdir(tree);
const listed=(args:string[])=>execFileSync('git',args,{encoding:'utf8'}).split('\0').filter(Boolean);
const files=[...new Set([...listed(['ls-files','-z']),...listed(['ls-files','--others','--exclude-standard','-z'])])].sort();
const proof=JSON.parse(await readFile('docs/stage-2.0c-3.2-final-freeze-evidence/source-proof.json','utf8')) as {records:{path:string;sha256:string}[]};
for(const path of files){const target=join(tree,path);await mkdir(dirname(target),{recursive:true});await copyFile(join(root,path),target);}
await symlink(join(root,'node_modules'),join(tree,'node_modules'),'dir');
const results:{label:string;command:string[];exitCode:number|null;elapsedMs:number;log:string;testsPassed:number|null;testFiles:number|null}[]=[];
function unchanged(){for(const s of proof.records)for(const folder of [root,tree])if(createHash('sha256').update(readFileSync(join(folder,s.path))).digest('hex')!==s.sha256)throw new Error('Candidate source drift: '+s.path);}
async function run(label:string,command:string,args:string[]){const log=join(directory,label+'.txt'),start=performance.now();const r=spawnSync(command,args,{cwd:tree,encoding:'utf8',maxBuffer:30*1024*1024,timeout:600000});const text=(r.stdout??'')+(r.stderr??'');await writeFile(log,text);const tests=/Tests\s+(\d+) passed/u.exec(text),testFiles=/Test Files\s+(\d+) passed/u.exec(text);const row={label,command:[command,...args],exitCode:r.status,elapsedMs:performance.now()-start,log,testsPassed:tests?Number(tests[1]):null,testFiles:testFiles?Number(testFiles[1]):null};results.push(row);await writeFile(join(directory,'results.json'),JSON.stringify({directory,tree,sourceProof:proof.records,results},null,2)+'\n');console.log(JSON.stringify(row));if(r.status!==0)throw new Error(label+' failed; no automatic retry: '+log);unchanged();}
const vitest=resolve(root,'node_modules/vitest/vitest.mjs');
const focused=(await readdir(join(tree,'tests'))).filter(n=>/^consent-stage20c32.*\.test\.(ts|tsx)$/u.test(n)).map(n=>'tests/'+n);
unchanged();await run('focused',process.execPath,[vitest,'run',...focused]);
await run('c31',process.execPath,[vitest,'run','tests/consent-stage20c3.test.ts','tests/consent-stage20c3-view.test.tsx','tests/consent-stage20c31.test.ts','tests/consent-stage20c31-view.test.tsx','tests/consent-stage20c31-gateway.test.ts']);
const prior=(await readdir(join(tree,'tests'))).filter(n=>/^consent.*\.test\.(ts|tsx)$/u.test(n)&&!n.startsWith('consent-stage20c32')).map(n=>'tests/'+n);prior.push('tests/stage196-short-consent.test.ts');await run('prior-consent',process.execPath,[vitest,'run',...prior]);
for(let i=1;i<=5;i++){await run('replay-'+i,process.execPath,[vitest,'run','tests/stage195-replay.test.ts']);await run('pcm-'+i,process.execPath,[vitest,'run','tests/continuous-transcription-gateway.test.ts','-t','forwards all 45 seconds']);}
for(let i=1;i<=3;i++)await run('full-'+i,'npm',['test']);
await run('lint','npm',['run','lint']);await run('typecheck','npm',['run','typecheck']);await run('standard-build','npm',['run','build']);
console.log('COMPLETE '+directory);
