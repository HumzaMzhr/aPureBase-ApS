/** Build-only consolidated handoff. No generation/ASR request is made by this script. */
import {readFile,writeFile,mkdir,copyFile,readdir,chmod,lstat} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {currentC32Catalog,currentC32Response,reviewAssetKey} from '../src/consent/stage32/speech/current';
import {currentAssetTable,feedbackMaster} from '../src/consent/stage32/feedback/closure';
import {packageVersion,type ReviewData} from '../src/consent/stage32/handoff/contract';
const repositoryMode=process.argv.includes('--repository');
const out=resolve(process.argv[2]??'/private/tmp/c32-final-asem-package/aPureBase-C32-Final-Asem-Retest');
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const proof=JSON.parse(await readFile('docs/stage-2.0c-3.2-final-freeze-evidence/source-proof.json','utf8')) as {records:{path:string;sha256:string}[]};
for(const r of proof.records)if(hash(await readFile(r.path))!==r.sha256)throw new Error('Validated candidate drift: '+r.path);
const handoffFiles=['stage20c32-retest.html','scripts/stage20c32-package.ts','scripts/stage20c32-handoff.vite.ts','docs/stage-2.0c-3.2-apurebase-brand-source.md','docs/stage-2.0c-3.2-apurebase-brand-tokens.json'];
async function files(dir:string):Promise<string[]>{const rows:string[]=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())rows.push(...await files(p));else if(e.isFile())rows.push(p);}return rows;}
handoffFiles.push(...await files('src/consent/stage32/handoff'),...await files('scripts/stage20c32-handoff'),...((await files('tests')).filter(p=>p.includes('stage20c32-package'))));
const handoff=await Promise.all(handoffFiles.sort().map(async path=>({path,sha256:hash(await readFile(path))})));
const coreSourceHash=hash(JSON.stringify([...proof.records].sort((a,b)=>a.path.localeCompare(b.path))));const handoffSourceHash=hash(JSON.stringify(handoff));
const identity={baseCommit:execFileSync('git',['rev-parse','HEAD']).toString().trim(),coreSourceHash,handoffSourceHash,candidateSourceHash:hash(coreSourceHash+'\n'+handoffSourceHash),uncommitted:execFileSync('git',['status','--porcelain','--untracked-files=no']).toString().trim().length>0,packageVersion};
const catalog=currentC32Catalog(),table=await currentAssetTable(),master=await feedbackMaster();
const labels:Record<string,string>={'why-calling':'Why Calling','success-close':'Success Close','clarify':'Clarify','consent-question':'Consent Question','email-request':'Email Request','refusal-close':'Refusal Close','about-apurebase':'About aPureBase','explanation':'Explanation','unsubscribe':'Unsubscribe','stop-contact-close':'Stop Contact Close','email-readback-intro':'Corrected Diagnostic Email Readback','receptionist-target-request':'Corrected Receptionist Target Request'};
const contexts:Record<string,string>={'why-calling':'Humza rejected the previous exact clip and requested senne instead of sende. This new provider-only respelling keeps canonical Danish unchanged; pronunciation improvement requires fresh listening.','success-close':'Previous framelde pronunciation concern. The authorized wording now uses sige fra. New C32 bytes are unreviewed.','clarify':'Humza passed the previous clip but explicitly requested senne instead of sende. This new provider-only respelling keeps the canonical consent question unchanged and requires fresh listening.','consent-question':'Existing current exact asset remains pronunciation 2/5 despite PASS. It has NOT been automatically fixed; another native verdict is required.','email-request':'Existing current exact asset remains pronunciation 2/5 despite PASS. It has NOT been automatically fixed; another native verdict is required.'};
const pending=table.rows.filter(r=>r.humanStatus!=='RESOLVED_BY_HUMAN_EVIDENCE');if(pending.length!==16)throw new Error('Authoritative pending inventory must be exactly 16');
const items=[...pending].sort((a,b)=>Number(a.diagnosticOnly)-Number(b.diagnosticOnly)).map(r=>{const a=catalog.find(a=>reviewAssetKey(a)===r.reviewKey)!;const variant='binding'in a?(a.binding.slot.kind==='NAME'?a.binding.slot.name.original:a.binding.slot.candidate):'';return {phraseId:r.phraseId,reviewKey:r.reviewKey,name:(labels[r.phraseId]??r.phraseId)+(variant?' — '+variant:''),canonicalText:r.canonicalText,synthesisText:r.synthesisText,currentAssetHash:r.currentAssetHash,canonicalVersion:r.canonicalVersion,assetPath:r.assetPath,actualLoadURL:r.actualLoadURL,diagnosticOnly:r.diagnosticOnly,historicalAssetHashes:r.historicalAssetHashes,history:master.observations.filter(h=>h.phraseId===r.phraseId&&(h.audioHashHeard===r.currentAssetHash||h.replacementAudioHash===r.currentAssetHash)),context:contexts[r.phraseId]??(r.humanStatus==='NEW_CANDIDATE_HUMAN_REVIEW_PENDING'?'This exact replacement/asset has no native approval. Compare the preserved historical context below.':'Retain the existing concern and give a fresh exact-hash native verdict.'),replacement:r.historicalAssetHashes.length>0};});
const data:ReviewData={identity,items,allCurrentAssets:table.rows.map(r=>({phraseId:r.phraseId,assetHash:r.currentAssetHash,path:r.assetPath,loadURL:r.actualLoadURL,version:r.canonicalVersion})),emailCases:[{id:'info',name:'Info',address:'info@klinik.dk',feature:'simple naturally spoken address',records:['info@klinik.dk']},{id:'kontakt',name:'Contact',address:'kontakt@klinik.dk',feature:'simple naturally spoken address',records:['kontakt@klinik.dk']},{id:'dot',name:'Name with dot',address:'anna.jensen@hospital.dk',feature:'dot',records:['anna.jensen@hospital.dk']},{id:'laegehuset',name:'Practice',address:'laegehuset@domain.dk',feature:'representative domain',records:['laegehuset@domain.dk']},{id:'hyphen',name:'Hyphen',address:'info-test@klinik.dk',feature:'hyphen',records:['info-test@klinik.dk']},{id:'underscore',name:'Underscore',address:'anna_test@hospital.dk',feature:'underscore',records:['anna_test@hospital.dk']},{id:'plus',name:'Plus',address:'anna+test@hospital.dk',feature:'plus',records:['anna+test@hospital.dk']},{id:'correction',name:'Correction of Info',address:'kontakt@klinik.dk',previous:'info@klinik.dk',feature:'correct the earlier captured info address',records:['info@klinik.dk','kontakt@klinik.dk']}],businessPending:JSON.parse(await readFile('docs/stage-2.0c-3.2-hardening-2-acceptance-index.json','utf8')).businessPending.filter((v:string)=>v!=='production concise confirmation')};
await mkdir(out,{recursive:true});const json=async(name:string,v:unknown)=>writeFile(resolve(out,name),JSON.stringify(v,null,2)+'\n');
await json('review-data.json',data);await json('BUILD-IDENTITY.json',identity);await json('SOURCE-RECORDS.json',{validatedCore:proof.records,handoff});
await json('CURRENT-CATALOG.json',catalog);
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','scripts/stage20c32-handoff.vite.ts','--outDir',resolve(out,'app'),'--emptyOutDir'],{stdio:'inherit'});
const bindingProofs=[];
for(const row of table.rows){
 const a=catalog.find(a=>a.phraseId===row.phraseId&&a.assetHash===row.currentAssetHash)!;const response=currentC32Response(a);const path=a.path.startsWith('/audio/')?'public'+a.path:'binding'in a?'benchmarks/stage20c2-dynamic-cache/'+a.binding.cacheKey+'.wav':'';
 const bytes=await readFile(path);if(hash(bytes)!==row.currentAssetHash||response.audio.sha256!==row.currentAssetHash||a.assetHash!==row.currentAssetHash)throw new Error('Current/packaged/playback binding mismatch');
 const target=resolve(out,'app',a.path.slice(1));await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
 bindingProofs.push({reviewKey:row.reviewKey,displayedHash:row.currentAssetHash,selectedCatalogHash:a.assetHash,packagedWAVHash:hash(bytes),playbackTargetHash:response.audio.sha256,packagedPath:relative(out,target),loadURL:row.actualLoadURL});
}
await copyFile('public/pcm-capture.js',resolve(out,'app/pcm-capture.js'));
await json('BINDING-PROOFS.json',bindingProofs);
const banner="import {createRequire} from 'node:module';const require=createRequire(import.meta.url);";
await build({entryPoints:['scripts/stage20c32-handoff/server.ts'],bundle:true,platform:'node',format:'esm',outfile:resolve(out,'server.mjs'),external:['bufferutil','utf-8-validate'],banner:{js:banner}});
await build({entryPoints:['scripts/stage20c32-handoff/verify-review.ts'],bundle:true,platform:'node',format:'esm',outfile:resolve(out,'verify-review.mjs')});
for(const name of ['Start.command','Stop.command','Configure-ASR.command','stop.mjs','verify.mjs','START-HERE.txt','HUMAN-REVIEW-GUIDE.txt','REVIEW-EXPORT-SCHEMA.json']){await copyFile('scripts/stage20c32-handoff/'+name,resolve(out,name));if(name.endsWith('.command'))await chmod(resolve(out,name),0o755);}
await copyFile('docs/stage-2.0c-3.2-apurebase-brand-source.md',resolve(out,'BRAND-SOURCE.md'));
await copyFile('docs/stage-2.0c-3.2-apurebase-brand-tokens.json',resolve(out,'BRAND-TOKENS.json'));
const runtimes:unknown[]=[];
if(!repositoryMode){
const download='/private/tmp/c32-final-asem-package/runtime-downloads',sums=await readFile(resolve(download,'SHASUMS256.txt'),'utf8');
for(const arch of ['arm64','x64']){const archive='node-v25.9.0-darwin-'+arch+'.tar.gz',expected=sums.split('\n').find(l=>l.endsWith('  '+archive))?.split(' ')[0];if(!expected||hash(await readFile(resolve(download,archive)))!==expected)throw new Error('Official runtime checksum mismatch');const dir=resolve(out,'runtime',arch);await mkdir(dir,{recursive:true});execFileSync('/usr/bin/tar',['-xzf',resolve(download,archive),'-C',dir,'--strip-components','2','node-v25.9.0-darwin-'+arch+'/bin/node']);await chmod(resolve(dir,'node'),0o755);runtimes.push({arch,version:'25.9.0',archiveSHA256:expected,nodeSHA256:hash(await readFile(resolve(dir,'node'))),source:'https://nodejs.org/dist/v25.9.0/'+archive});}
await mkdir(resolve(out,'licenses'),{recursive:true});execFileSync('/usr/bin/tar',['-xzf',resolve(download,'node-v25.9.0-darwin-arm64.tar.gz'),'-C',resolve(out,'licenses'),'--strip-components','1','node-v25.9.0-darwin-arm64/LICENSE']);
}
await mkdir(resolve(out,'licenses'),{recursive:true});
for(const name of ['react','react-dom','ws'])await copyFile('node_modules/'+name+'/LICENSE',resolve(out,'licenses/'+name+'-LICENSE'));
await json('RUNTIME-PROVENANCE.json',runtimes);
const listed=[];for(const path of (await files(out)).sort()){if(path.endsWith('/PACKAGE-MANIFEST.json'))continue;const st=await lstat(path);if(st.isSymbolicLink())throw new Error('No package symlinks');listed.push({path:relative(out,path),sha256:hash(await readFile(path)),bytes:st.size,executable:!!(st.mode&0o111)});}
await json('PACKAGE-MANIFEST.json',{packageVersion,identity,listeningItems:16,requiredNormalListeningItems:12,optionalDiagnosticListeningItems:4,emailArchitecture:'CONCISE_CONFIRMATION_ONLY',uniqueCurrentRecordings:new Set(table.rows.map(r=>r.currentAssetHash)).size,files:listed,providerRequestsDuringBuild:0,productionReady:false});
execFileSync(process.execPath,[resolve(out,'verify.mjs')],{stdio:'inherit'});
console.log(JSON.stringify({packageDirectory:out,identity,listeningItems:items.length,packagedCurrentUnits:catalog.length,uniqueCurrentRecordings:new Set(table.rows.map(r=>r.currentAssetHash)).size},null,2));
