/** Independent snapshot; serial commands, no retries/test timeout/concurrency changes. */
import {readFile,writeFile,mkdir,mkdtemp,copyFile,symlink,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {join,dirname,resolve} from 'node:path';
const root=process.cwd(),directory=await mkdtemp('/private/tmp/d1-validation-'),tree=join(directory,'tree');await mkdir(tree);
const listed=(args:string[])=>execFileSync('git',args,{encoding:'utf8'}).split('\0').filter(Boolean);
const files=[...new Set([...listed(['ls-files','-z']),...listed(['ls-files','--others','--exclude-standard','-z'])])].sort();
const hash=(v:Uint8Array)=>createHash('sha256').update(v).digest('hex');const proof=files.filter(p=>!p.startsWith('docs/stage-2.0d-1')).map(path=>({path,sha256:hash(readFileSync(path))}));
for(const path of files){const target=join(tree,path);await mkdir(dirname(target),{recursive:true});await copyFile(join(root,path),target);}await symlink(join(root,'node_modules'),join(tree,'node_modules'),'dir');
const results:{label:string;command:string[];exitCode:number|null;elapsedMs:number;log:string;testsPassed:number|null;testFiles:number|null}[]=[];
const env={...process.env,GIT_DIR:join(root,'.git'),GIT_WORK_TREE:tree};
function unchanged(){for(const s of proof){if(hash(readFileSync(join(root,s.path)))!==s.sha256)throw new Error('Root candidate drift: '+s.path);if(/^(src|server|scripts|tests)\//u.test(s.path)&&hash(readFileSync(join(tree,s.path)))!==s.sha256)throw new Error('Snapshot source drift: '+s.path);}}
async function run(label:string,command:string,args:string[]){const log=join(directory,label+'.txt'),start=performance.now();const r=spawnSync(command,args,{cwd:tree,env,encoding:'utf8',maxBuffer:30*1024*1024,timeout:600000});const text=(r.stdout??'')+(r.stderr??'');await writeFile(log,text);const tests=/Tests\s+(\d+) passed/u.exec(text),testFiles=/Test Files\s+(\d+) passed/u.exec(text);const row={label,command:[command,...args],exitCode:r.status,elapsedMs:performance.now()-start,log,testsPassed:tests?Number(tests[1]):null,testFiles:testFiles?Number(testFiles[1]):null};results.push(row);await writeFile(join(directory,'results.json'),JSON.stringify({directory,tree,proof,results},null,2)+'\n');console.log(JSON.stringify(row));if(r.status!==0)throw new Error(label+' failed; no automatic retry: '+log);unchanged();}
const vitest=resolve(root,'node_modules/vitest/vitest.mjs'),tests=await readdir(join(tree,'tests')),focus=(pattern:RegExp)=>tests.filter(n=>pattern.test(n)).map(n=>'tests/'+n);
unchanged();await run('d1-focused',process.execPath,[vitest,'run',...focus(/^telephony-stage20d1.*\.test\.(ts|tsx)$/u)]);await run('c32',process.execPath,[vitest,'run',...focus(/^consent-stage20c32.*\.test\.(ts|tsx)$/u)]);
await run('c31',process.execPath,[vitest,'run','tests/consent-stage20c3.test.ts','tests/consent-stage20c3-view.test.tsx','tests/consent-stage20c31.test.ts','tests/consent-stage20c31-view.test.tsx','tests/consent-stage20c31-gateway.test.ts']);
const prior=focus(/^consent.*\.test\.(ts|tsx)$/u).filter(n=>!n.includes('stage20c32'));prior.push('tests/stage196-short-consent.test.ts');await run('prior-consent',process.execPath,[vitest,'run',...prior]);
for(let i=1;i<=5;i++){await run('replay-'+i,process.execPath,[vitest,'run','tests/stage195-replay.test.ts']);await run('pcm-'+i,process.execPath,[vitest,'run','tests/continuous-transcription-gateway.test.ts','-t','forwards all 45 seconds']);}
for(let i=1;i<=3;i++)await run('full-'+i,'npm',['test']);
await run('lint','npm',['run','lint']);await run('typecheck','npm',['run','typecheck']);await run('standard-build','npm',['run','build']);await run('d1-operations-qa-build',process.execPath,['--import','tsx','scripts/stage20d1-package.ts',join(directory,'package')]);
await run('preservation',process.execPath,['--import','tsx','scripts/verify-stage20d1.ts']);await run('diff-check','git',['diff','--check']);
const final={directory,tree,proof,results,complete:true};await writeFile(join(directory,'results.json'),JSON.stringify(final,null,2)+'\n');await writeFile('/private/tmp/stage20d1/latest-validation.json',JSON.stringify(final,null,2)+'\n');console.log('COMPLETE '+directory);void readFile;
