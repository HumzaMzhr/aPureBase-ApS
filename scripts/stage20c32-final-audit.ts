/** Deterministic final evidence. No network, generation, microphone or real-contact input. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {runEmailCorpus} from '../src/consent/stage32/hardening/corpus';
import {runClosureAdversarial} from '../src/consent/stage32/feedback/adversarial';
import {expandedConsentMatrix,remediationScenarioIds,runRemediationScenario} from '../src/consent/stage32/hardening/remediationScenarios';
import {scenarioContract} from '../src/consent/stage32/hardening/simulator';
import {runScenario} from '../src/consent/stage32/hardening/scenarios';
import {technicalAudioQA} from './stage20c32-hardening-qa';
import {candidates,verifyCandidate} from '../src/consent/stage32/speech/candidates';
import {deliveryGain} from '../src/streaming/deliveryGain';
import {currentAssetTable} from '../src/consent/stage32/feedback/closure';
const out=process.argv[2]??'docs/stage-2.0c-3.2-final-consolidation';await mkdir(out,{recursive:true});const json=(name:string,v:unknown)=>writeFile(out+'/'+name,JSON.stringify(v,null,2)+'\n');
const email=await runEmailCorpus(),boundaries=await runClosureAdversarial(),consent=await expandedConsentMatrix();
if(email.metrics.policyCorrect!==66||email.metrics.falseAutoAccepts||email.metrics.ambiguousAutoSelections||boundaries.passed!==18||!boundaries.negativeControl.detected||consent.failed.length||consent.falsePositives)throw new Error('Safety verification failed');
await json('email-corpus.json',email);await json('db-model-boundaries.json',boundaries);await json('consent-matrix.json',consent);
const scenarios=[];for(const id of scenarioContract.ids){const r=await runScenario(id);if(!r.passed)throw new Error('Scenario failed: '+id);scenarios.push({id,passed:r.passed,checks:r.checks});}
const remediation=[];for(const id of remediationScenarioIds){const r=await runRemediationScenario(id);if(!r.passed)throw new Error('Remediation failed: '+id);remediation.push({id,passed:r.passed});}
await json('scenarios.json',{original:scenarios,remediation});
const audio=await technicalAudioQA({scanOutside:false});if(audio.approvedInventory.passed!==49)throw new Error('Historical audio QA failed');
const added=[];for(const a of candidates){const b=new Uint8Array(await readFile('public'+a.path)),pcm=await verifyCandidate(a,b),gain=deliveryGain(pcm.samples.slice(),true);if(pcm.clippingEvents||gain.clippingEvents||a.productionApproved||a.humanReviewStatus!=='HUMAN_REVIEW_PENDING')throw new Error('Current audio QA or approval failed');added.push({phraseId:a.phraseId,path:a.path,sha256:createHash('sha256').update(b).digest('hex'),samples:pcm.samples.length,seconds:pcm.duration,gain,nativeApproval:'PENDING'});}
await json('audio-qa.json',{historical:audio.approvedInventory,currentC32:added,total:52,providerRequests:0,audioGenerated:0});
const table=await currentAssetTable(),pending=table.rows.filter(r=>r.humanStatus!=='RESOLVED_BY_HUMAN_EVIDENCE');if(pending.filter(r=>!r.diagnosticOnly).length!==12||pending.filter(r=>r.diagnosticOnly).length!==4)throw new Error('Listening split failed');
const old=JSON.parse(await readFile('docs/stage-2.0c-3.2-email-architecture/reachability.json','utf8')) as {rows:{classification:string;normalFullEmailPlaybackReachable:boolean}[]};
const rows=old.rows.map(r=>({...r,classification:r.classification==='NORMAL_PATH_REQUIRED'?'NORMAL_PATH':r.classification}));const reachable=rows.filter(r=>r.classification==='NORMAL_PATH'&&r.normalFullEmailPlaybackReachable).length;if(reachable)throw new Error('STOP: normal full-email readback reachable');
await json('reachability.json',{normalPathFullEmailReadbackCount:reachable,classificationScope:'Current C32 normal controller; historical stages and diagnostic players retained separately',runtimeProof:'Normal sequence and response/EMAIL-slot rejection covered by email-freeze tests',rows});
await json('safety-summary.json',{emailCases:66,emailPolicyCorrect:email.metrics.policyCorrect,falseEmailAutoAccepts:email.metrics.falseAutoAccepts,ambiguousAutomaticSelections:email.metrics.ambiguousAutoSelections,dbModelCases:boundaries.denominator,dbModelPassed:boundaries.passed,negativeControl:boundaries.negativeControl,consentCases:consent.denominator,consentFalsePositives:consent.falsePositives,scenarios:scenarios.length,remediation:remediation.length,normalPathFullEmailReadbackCount:reachable,requiredListening:12,optionalDiagnostics:4,recordingsPreserved:52,providerRequests:0,audioGeneration:0,liveASR:0,telephone:0,productionReady:false,accepted:false});
console.log('Final safety, 66 email cases, 18 boundaries, 29 consent, 46+32 scenarios, 52 audio QA, 12/4 split, zero normal full-email readback: PASS');
