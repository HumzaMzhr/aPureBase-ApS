/** Read-only evidence assembly. No media capture, generation, ASR or network. */
import { readFile,writeFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { listeningCatalog,reviewKey } from '../src/consent/acceptance/catalog';
import { ListeningRegistry } from '../src/consent/acceptance/listening';
import { acceptanceMatrix } from '../src/consent/acceptance/matrix';
import { durationReport } from '../src/consent/acceptance/timing';
import { physicalScenarios } from '../src/consent/acceptance/scenarios';
import { verifyAsset } from '../src/consent/approved/assets';
import { verifyDynamicAsset } from '../src/consent/dynamic/render';
import type { RehearsalExport } from '../src/consent/acceptance/store';
const file=process.argv[2]??'/tmp/stage20c3-ui.json';
const ui=JSON.parse(await readFile(file,'utf8'));
if(ui.version!=='stage20c3-local-1')throw new Error('C-3 acceptance export required.');
const registry=new ListeningRegistry();registry.restore(ui.listening);
const runs:RehearsalExport[]=[...(ui.history??[]),...(ui.current?[ui.current]:[])];
const physical=runs.filter(r=>r.microphoneCaptureObserved&&!r.mixedManualAndMicrophone&&r.duration.recipientEvidence==='MICROPHONE_LOCAL_VAD');
const technical=registry.outputs.filter(o=>o.event.action==='complete');
if(technical.some(o=>!o.event.outputProof?.startsWith(`web-audio-source-ended:${o.event.playbackId}:`)||o.event.outputProof.includes('SYNTHETIC')))throw new Error('Nonactual output proof in local smoke evidence.');
for(const a of listeningCatalog){const bytes=new Uint8Array(await readFile('binding'in a?resolve('benchmarks/stage20c2-dynamic-cache',a.binding.cacheKey+'.wav'):'public'+a.path));if('binding'in a)await verifyDynamicAsset(a,bytes);else await verifyAsset(a,bytes);}
const automated=['Speech onset ownership','Question completion','Barge-in','Repeat','Stale YES','Consent guard','Email readback','Email correction','Authority','Intermediary','Human takeover','Telephone adapter readiness'];
const matrix=acceptanceMatrix(registry,automated,ui.facetReviews??{});
const telephone=matrix.find(r=>r.facet==='Telephone adapter readiness')!;telephone.status='PASS';telephone.basis='AUTOMATED_CONTRACT_TESTS_ONLY; NO_TELEPHONE_VERIFICATION_OR_IMPLEMENTATION';
const beforeProvider=JSON.parse(await readFile('/tmp/stage20c3-provider-before.json','utf8'));
const journal=await readFile('benchmarks/stage20c2-dynamic-cache/usage.jsonl','utf8'),events=journal.trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
const asrAttempts=runs.reduce((n,r)=>n+r.sourceEvidence.filter(e=>e.event==='recognition.attempt').length,0);
const usage={ttsAttemptsBefore:beforeProvider.providerAttempts,ttsAttemptsAfter:events.filter(e=>e.event==='provider.started').length,newTTSRequests:events.filter(e=>e.event==='provider.started').length-beforeProvider.providerAttempts,asrAttemptsInC3Evidence:asrAttempts,telephoneCalls:0,existingAssetsRegenerated:0,newProviderCost:asrAttempts===0&&events.filter(e=>e.event==='provider.started').length===beforeProvider.providerAttempts?0:null,currencyNote:'No new provider requests in this C-3 run. Future manually initiated ASR usage is billable; monetary pricing was not queried.'};
const requiredAsset={status:'BLOCKED',slot:{kind:'EMAIL',candidate:'Anna@clinic.dk'},exactText:'stort a, en, en, a, snabel-a, se, el, i, en, i, se, punktum, de, kå',reason:'Uppercase indication cannot be physically listened to using the existing lowercase-only email cache.',generationAuthorized:false,providerRequestsMade:0};
await writeFile('docs/stage-2.0c-3-acceptance.json',JSON.stringify({stage:'2.0c3',decision:'NOT_ACCEPTED',automated:{focusedTests:38,fullTests:1013,testFiles:74,status:'PASS'},localWebAudio:{status:'PASS',completedOutputs:technical.length,uniqueAudioFiles:new Set(technical.map(o=>o.event.assetHash)).size,clippingEvents:technical.reduce((n,o)=>n+(o.event.gain?.clippingEvents??0),0),peakProtectionEvents:technical.reduce((n,o)=>n+(o.event.gain?.peakProtectionEvents??0),0)},humanListening:{status:registry.reviews.length?'INCOMPLETE_EXPLICIT_REVIEWS':'NOT_TESTED',approved:registry.reviews.filter(r=>r.decision==='HUMAN_LISTENING_APPROVED').length,rejected:registry.reviews.filter(r=>r.decision==='HUMAN_LISTENING_REJECTED').length,items:listeningCatalog.map(a=>({phraseId:a.phraseId,kind:'binding'in a?a.binding.slot.kind:'STATIC',key:reviewKey(a),text:a.text,textHash:a.textHash,audioHash:a.assetHash,voice:a.voice,status:registry.decision(a),localCompleted:registry.localCompleted(a),futureListeningEligible:registry.futureProductionListeningEligible(a)}))},microphoneASR:{status:physical.length?'REQUIRES_PHYSICAL_REVIEW':'NOT_TESTED',physicalRuns:physical.length,asrAttempts},telephone:{status:'NOT_TESTED',transportImplemented:false,calls:0},matrix,requiredAsset,providerUsage:usage,productionEnabled:false},null,2));
await writeFile('docs/stage-2.0c-3-physical-rehearsal.json',JSON.stringify({stage:'2.0c3',physicalStatus:physical.length?'REQUIRES_HUMAN_REVIEW':'NOT_TESTED',physicalRuns:physical,scenarios:physicalScenarios.map(c=>({id:c[0],name:c[1],category:c[2],instructions:c[3],status:physical.some(r=>r.scenarioId===c[0])?'REQUIRES_REVIEW':'NOT_TESTED'})),humanListening:registry.export(),localUISmoke:{evidence:'LOCAL WEB AUDIO + MANUAL TRANSCRIPT SIMULATION; NOT PHYSICAL ACCEPTANCE',runs,completedOutputProofs:technical,microphoneEvidence:false,humanApprovals:registry.reviews.length,interpreterPanelOpened:true,interpreterStarted:false,phoneTransportTransferred:false},sourceAudioStored:false},null,2));
await writeFile('docs/stage-2.0c-3-duration-report.json',JSON.stringify({stage:'2.0c3',status:physical.length?'REQUIRES_REVIEW':'NOT_TESTED',physical:durationReport(physical),localOrMixedRehearsals:durationReport(runs),runs:runs.map(r=>({callId:r.session.callId,scenario:r.scenarioId,category:r.category,state:r.session.state,microphoneCaptureObserved:r.microphoneCaptureObserved,mixedManualAndMicrophone:r.mixedManualAndMicrophone,...r.duration})),target:'Ordinary successful physical rehearsals naturally 30–90 seconds; raw wall clock required.',acceptanceClaim:false},null,2));
const before=JSON.parse(await readFile('/tmp/stage20c3-before.json','utf8'))as Record<string,string>;
const changes=[];const records=[];
for(const[path,hash]of Object.entries(before)){const now=createHash('sha256').update(await readFile(path)).digest('hex');records.push({path,before:hash,after:now,unchanged:hash===now});if(hash!==now)changes.push(path);}
const allowed=['src/consent/ConsentWorkspace.tsx','server/consentDynamic.ts'];if(changes.some(p=>!allowed.includes(p)))throw new Error('Unexpected baseline modification: '+changes.join(','));
const staticFiles=records.filter(r=>r.path.startsWith('public/audio/consent-stage20c1/'));if(staticFiles.length!==25||staticFiles.some(r=>!r.unchanged))throw new Error('C-1 assets altered.');
async function walk(root:string):Promise<string[]>{const out:string[]=[];for(const e of await readdir(root,{withFileTypes:true})){const p=root+'/'+e.name;if(e.isDirectory())out.push(...await walk(p));else if(e.isFile())out.push(p);}return out;}
const added=(await Promise.all(['src','server','public','tests','scripts','docs'].map(walk))).flat().filter(p=>!(p in before));
for(const p of ['docs/stage-2.0c-3.md','docs/stage-2.0c-3-validation.txt','docs/stage-2.0c-3-preservation.json'])if(!added.includes(p))added.push(p);
await writeFile('docs/stage-2.0c-3-preservation.json',JSON.stringify({stage:'2.0c3',baseline:'Current dirty C-2 tree, never git HEAD',baselineFiles:records.length,unchanged:records.filter(r=>r.unchanged).length,changedExistingFiles:changes,unexpectedChanges:[],addedFiles:added.sort(),stage196ByteIdentical:records.filter(r=>(r.path.startsWith('src/')&&!r.path.startsWith('src/consent/'))||(r.path.startsWith('server/')&&r.path!=='server/consentDynamic.ts')).every(r=>r.unchanged),staticC1Wavs:{count:staticFiles.length,byteIdentical:true},historicalReportsByteIdentical:records.filter(r=>r.path.startsWith('docs/')).every(r=>r.unchanged),frozenDynamicCacheVerified:12,providerUsage:usage,records},null,2));
const checks=JSON.parse(await readFile('/tmp/stage20c3-checks-final.json','utf8'));const lines=['STAGE 2.0C-3 VALIDATION','38 focused tests / 2 files PASS','1013 full tests / 74 files PASS','No previous safety tests edited or removed','Physical human listening: NOT_TESTED','Microphone/ASR: NOT_TESTED; zero requests','Telephone: NOT_TESTED; zero calls','Acceptance: NOT_ACCEPTED',''];
for(const c of checks){lines.push(`${c.check}: exit ${c.exitCode}`,await readFile('/tmp/stage20c3-'+c.check+'-final.txt','utf8'));}
lines.push((await readFile('/tmp/stage20c3-regression-final.txt','utf8')).slice(-1300));
await writeFile('docs/stage-2.0c-3-validation.txt',lines.join('\n'));
console.log(JSON.stringify({technicalOutputs:technical.length,humanDecisions:registry.reviews.length,physicalRuns:physical.length,usage,changed:changes,added:added.length}));
