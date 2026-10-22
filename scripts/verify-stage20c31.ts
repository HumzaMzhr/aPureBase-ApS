/** Read-only C-3.1 handoff check. No credentials, network or generation. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {listeningCatalog} from '../src/consent/acceptance/catalog';
import {verifyAsset} from '../src/consent/approved/assets';
import {verifyDynamicAsset} from '../src/consent/dynamic/render';
import {currentCatalog,replacements,verifyCorrection} from '../src/consent/corrections/assets';
import {RetestRegistry,retainedApproval} from '../src/consent/corrections/retest';

const auditBytes=await readFile('docs/stage-2.0c-3.1-preservation.json');
const audit=JSON.parse(auditBytes.toString()) as {
 records:{path:string;before:string;after:string;unchanged:boolean}[];
 candidateFiles:{path:string;sha256:string}[];
};
// Keep the historical proof immutable. A correction may extend only these two
// exact harness files, with both the old pinned and new content hashes checked.
type HarnessAudit={originalPreservationSha256:string;changes:{path:string;before:string;after:string}[]};
let harness:HarnessAudit|undefined;
try{harness=JSON.parse(await readFile('docs/stage-2.0c-3.1-timeout-investigation/harness-preservation.json','utf8'));}
catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
if(harness){
 const allowed=['tests/continuous-transcription-gateway.test.ts','scripts/verify-stage20c31.ts'];
 if(harness.originalPreservationSha256!==createHash('sha256').update(auditBytes).digest('hex')||harness.changes.length!==allowed.length||new Set(harness.changes.map(c=>c.path)).size!==allowed.length)throw new Error('Invalid harness preservation extension.');
 for(const change of harness.changes){
  const pinned=audit.records.find(r=>r.path===change.path)?.after??audit.candidateFiles.find(f=>f.path===change.path)?.sha256;
  if(!allowed.includes(change.path)||change.before!==pinned||!/^[a-f0-9]{64}$/u.test(change.after))throw new Error('Unexpected harness correction: '+change.path);
 }
}
const expectedHash=(path:string,pinned:string)=>harness?.changes.find(c=>c.path===path)?.after??pinned;
for(const record of audit.records){
 const hash=createHash('sha256').update(await readFile(record.path)).digest('hex');
 if(hash!==expectedHash(record.path,record.after))throw new Error('Baseline/candidate file mismatch: '+record.path);
}
for(const file of audit.candidateFiles){
 if(createHash('sha256').update(await readFile(file.path)).digest('hex')!==expectedHash(file.path,file.sha256))throw new Error('C-3.1 handoff mismatch: '+file.path);
}
for(const a of listeningCatalog){
 const path='binding'in a?'benchmarks/stage20c2-dynamic-cache/'+a.binding.cacheKey+'.wav':'public'+a.path;
 const bytes=new Uint8Array(await readFile(path));
 if('binding'in a)await verifyDynamicAsset(a,bytes);else await verifyAsset(a,bytes);
}
if(replacements.length!==12||currentCatalog().length!==37)throw new Error('C-3.1 catalog incomplete.');
for(const a of replacements)await verifyCorrection(a,new Uint8Array(await readFile('public'+a.path)));
const registry=new RetestRegistry();
if(currentCatalog().filter(a=>retainedApproval(a,registry)).length!==24)throw new Error('Historical approval carryover mismatch.');
console.log(JSON.stringify({status:'PASS',baselineFiles:audit.records.length,candidateFiles:audit.candidateFiles.length,harnessCorrectionFiles:harness?.changes.map(c=>c.path)??[],originalRecordings:37,newRecordings:12,retainedCurrentApprovals:24,humanRetestRequired:13,providerRequests:0,physicalASR:'NOT_TESTED',stage:'NOT_ACCEPTED',telephoneVerified:false,productionEnabled:false},null,2));
