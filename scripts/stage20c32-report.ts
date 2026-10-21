import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {speechInventory,listeningGate,pronunciationRegressions,providerCapabilities} from '../src/consent/stage32/speech/plans';
import {durationModel} from '../src/consent/stage32/duration';
import {listeningCatalog} from '../src/consent/acceptance/catalog';
import {replacements} from '../src/consent/corrections/assets';

// Offline artifacts only. No generation/network/API imports or requests.
const root='docs/stage-2.0c-3.2';
const baseline=JSON.parse(await readFile('/tmp/c32-baseline.json','utf8')) as {branch:string;head:string;remoteHead:string;status:string;diff:string;records:{path:string;sha256:string}[]};
const rows=await Promise.all(baseline.records.map(async r=>({...r,afterSha256:createHash('sha256').update(await readFile(r.path)).digest('hex')})));
if(rows.some(r=>r.sha256!==r.afterSha256))throw new Error('Historical file changed; do not rewrite preservation evidence');
const originals=await Promise.all(listeningCatalog.map(async a=>{const path='binding'in a?'benchmarks/stage20c2-dynamic-cache/'+a.binding.cacheKey+'.wav':'public'+a.path;const hash=createHash('sha256').update(await readFile(path)).digest('hex');if(hash!==a.assetHash)throw new Error('Original recording changed');return {path,sha256:hash};}));
const corrected=await Promise.all(replacements.map(async a=>{const path='public'+a.path;const hash=createHash('sha256').update(await readFile(path)).digest('hex');if(hash!==a.assetHash)throw new Error('C-3.1 recording changed');return {path,sha256:hash};}));
await writeFile(root+'-preservation.json',JSON.stringify({stage:'2.0C-3.2',baseline:{...baseline,records:undefined},historicalTrackedFiles:rows.length,allHistoricalTrackedFilesByteIdentical:true,stage196Preserved:true,originalRecordings:originals,correctedC31Recordings:corrected,records:rows,trackedDelta:execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim(),noHistoricalExceptions:true},null,2)+'\n');
const inventory=await speechInventory();
await writeFile(root+'-speech-plan.json',JSON.stringify({stage:'2.0C-3.2',status:'NOT_ACCEPTED',paidGenerationAuthorized:false,providerCapabilities,pronunciationRegressions,inventory,acceptanceGate:listeningGate(inventory.map(r=>r.plans[0]),[])},null,2)+'\n');
await writeFile(root+'-duration.json',JSON.stringify(durationModel(),null,2)+'\n');
const headers=['inventory key','phraseId','canonical hash','consent critical','template','historical audio hash','canonical wording','C32 listening','concerns','variants'];
const table=inventory.map((r,i)=>[i+1,r.canonical.phraseId,r.canonical.canonicalTextHash,r.canonical.consentCritical,r.canonical.template,r.historicalAssetHash??'UNGENERATED',r.canonical.canonicalText,'NOT_REVIEWED',r.likelyConcerns.join('; '),r.plans.map(p=>p.synthesisVersion).join('; ')]);
const csv=[headers,...table].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
await writeFile(root+'-listening-matrix.csv',csv);
await writeFile(root+'-historical-evidence-read.json',await readFile('/tmp/c32-reviewed-evidence.json'));
console.log(JSON.stringify({historicalFiles:rows.length,originalRecordings:originals.length,c31Recordings:corrected.length,phraseInventory:inventory.length,plans:inventory.reduce((n,r)=>n+r.plans.length,0),duration:durationModel().subtotalExcludingUnknownSeconds}));
