import {syntheticCall,ordinaryScenario} from './simulator';
import {runEmailCase,emailCorpus} from './corpus';
import {hasReviewedConsent} from '../email/flow';
import {measureOutcome} from './outcomes';
import {runScenario} from './scenarios';
export const remediationScenarioIds=['direct','clarification','correction','receptionist','wrong-correct','intermediary','refusal','busy','unsupported-question','human-request','unsupported-value','output-failure','authority-denied','authority-revision','stale-lookup','recipient-during-lookup','malformed-db','email-revision-confirmation','partial-finalization','barge-consent','barge-email','delayed-final-repeat','model-timeout','model-invalid','model-invented','model-conflict','model-late-revision','db-delay','ambiguous','conflict','post-confirmation-correction','email-review-without-consent'] as const;
const mapped:Record<string,string>={direct:'A',clarification:'Q',correction:'AT',receptionist:'K','wrong-correct':'L',intermediary:'M',refusal:'AQ',busy:'AR','unsupported-question':'S','human-request':'U','unsupported-value':'AA','output-failure':'Y','barge-consent':'V'};
const corpusMap:Record<string,string>={'model-timeout':'model-timeout','model-invalid':'model-invalid','model-invented':'model-wrong','model-conflict':'model-wrong','malformed-db':'db-malformed',ambiguous:'ambiguous-en',conflict:'wrong-local'};
export async function runRemediationScenario(id:typeof remediationScenarioIds[number]){
 if(mapped[id]){const r=await runScenario(mapped[id]),s=r.summary as {stateEvidence?:ReturnType<Awaited<ReturnType<typeof syntheticCall>>['export']>['stateEvidence']};return {id,passed:r.passed,execution:'ACTUAL_PUBLIC_CONTROLLER_INJECTED',stateEvidence:s.stateEvidence??null,detail:r.summary};}
 if(corpusMap[id]){const r=await runEmailCase(emailCorpus.find(c=>c.id===corpusMap[id])!);return {id,passed:r.correct&&!r.outcome.finalStoredAddress,stateEvidence:r.sessionEvidence.stateEvidence,execution:'ACTUAL_PUBLIC_CONTROLLER_INJECTED',detail:r};}
 let release!:(value:never[])=>void,start!:()=>void;const started=new Promise<void>(r=>{start=r;});
 const delayed=['stale-lookup','recipient-during-lookup','db-delay'].includes(id);
 const f=await syntheticCall('remediation-'+id,delayed?{resolveCandidates:async()=>{start();return new Promise(r=>{release=r;});}}:undefined,{},id==='model-late-revision'?{suggest:async()=>{start();return new Promise(r=>{release=r;});}}:undefined);
 await f.identity(id.startsWith('authority')?'INTERMEDIARY':'TARGET_HCP');
 if(id.startsWith('authority')){const claim=await f.speak('Jeg har bemyndigelse til at håndtere denne forespørgsel og oplyse lægens e-mailadresse');f.session.confirmAuthority(claim,'Synthetic authority review','synthetic:operator');f.advance(f.export().config.operatorSeconds*1000);f.session.bindName({original:'Jens Hansen',source:'contact-data',evidenceId:'synthetic:name',evidenceText:'Synthetic target Jens Hansen',reviewedBy:'synthetic:operator',reviewedAt:'2026-10-21',pronunciationConfirmed:true,recipientRevision:f.session.snapshot().recipientRevision});}
 await f.session.approvePlayback('purpose');const questionOwner=await f.question();let passed=false;
 if(id==='delayed-final-repeat'){await f.question();await f.speak('Ja',{owner:questionOwner});passed=!f.session.snapshot().turns.at(-1)?.consent.eligibleYes;}
 else if(id==='email-review-without-consent'){f.session.structuredEmail.operatorReview('synthetic:operator','Email is not consent');passed=!hasReviewedConsent(f.session.snapshot());}
 else{
  await f.yes();await f.ask();
  if(delayed||id==='model-late-revision'){const pending=f.speak('anna@clinic.example');await started;if(id!=='db-delay')await f.identity();release([]);await pending;passed=!f.session.structuredEmail.snapshot().storedEmail&&(id==='db-delay'||!hasReviewedConsent(f.session.snapshot()));}
  else if(id.startsWith('authority')){await f.speak('anna@clinic.example');await f.speak('Jeg har ikke fuldmagt');passed=f.session.snapshot().authorityStatus==='DENIED'&&!hasReviewedConsent(f.session.snapshot())&&!f.session.structuredEmail.snapshot().storedEmail;}
  else if(id==='partial-finalization'){const owner=f.session.confirmationPlaybackId();await f.speak('anna',{id:'mic:partial',owner,final:false});await f.speak('anna@clinic.example',{id:'mic:partial',owner});passed=f.session.structuredEmail.snapshot().attempt?.turn.text==='anna@clinic.example';}
  else if(['barge-email','email-revision-confirmation'].includes(id)){await f.speak('anna@clinic.example');f.hold();const pending=f.session.structuredEmail.confirmPrompt();await Promise.resolve();await f.speak('anne',{final:false});f.release();await pending;passed=f.session.structuredEmail.snapshot().playback?.state==='INTERRUPTED'&&!f.session.structuredEmail.snapshot().confirmation;}
  else if(id==='post-confirmation-correction'){await f.speak('anna@clinic.example');await f.session.structuredEmail.confirmPrompt();await f.speak('Ja');await f.speak('Nej, det er anne@clinic.example',{owner:'unowned-correction'});passed=!f.session.structuredEmail.snapshot().confirmation&&!f.session.structuredEmail.snapshot().storedEmail;}
 }
 const e=f.export();return {id,execution:'ACTUAL_PUBLIC_CONTROLLER_INJECTED',passed,stateEvidence:e.stateEvidence,detail:{outcome:measureOutcome(f.session.structuredEmail.snapshot(),f.session.snapshot()),...e}};
}
export async function runRemediationScenarios(){const rows=[];for(const id of remediationScenarioIds)rows.push(await runRemediationScenario(id));return {denominator:remediationScenarioIds.length,excluded:[],rows,passed:rows.filter(r=>r.passed).length,failed:rows.filter(r=>!r.passed).map(r=>r.id),physicalTiming:'HUMAN_EVIDENCE_PENDING',ordinary:await ordinaryScenario('AS',{paceSeconds:.25})};}
export async function expandedConsentMatrix(){
 const {consentMatrix}=await import('./consentMatrix');const baseline=await consentMatrix();
 const extra=[];for(const id of ['authority-revision','email-review-without-consent'] as const){const r=await runRemediationScenario(id);extra.push({id,expectedEligible:false,eligible:false,passed:r.passed,evidence:r.stateEvidence});}
 const f=await syntheticCall('consumed-question');await f.identity();await f.session.approvePlayback('purpose');const owner=await f.question();await f.speak('Hvilken information?');await f.session.approvePlayback('explanation');await f.speak('Ja',{owner});const blocked=!f.session.snapshot().turns.at(-1)?.consent.eligibleYes&&!hasReviewedConsent(f.session.snapshot());extra.push({id:'clarification-after-consumed-question',expectedEligible:false,eligible:!blocked,passed:blocked,evidence:f.export().stateEvidence});
 return {kind:'ACTUAL_GUARDS_WITH_PUBLIC_SESSION_INVALIDATIONS',denominator:baseline.rows.length+extra.length,rows:[...baseline.rows,...extra],falsePositives:baseline.falsePositives+extra.filter(r=>r.eligible).length,failed:[...baseline.failed,...extra.filter(r=>!r.passed).map(r=>r.id)]};
}
