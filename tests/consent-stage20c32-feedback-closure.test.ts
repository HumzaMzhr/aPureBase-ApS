import {describe,it,expect} from 'vitest';
import {pronunciationConcerns,type PhraseReview} from '../src/consent/stage32/hardening/review';
import {ordinaryScenario} from '../src/consent/stage32/hardening/simulator';
import {candidates} from '../src/consent/stage32/speech/candidates';

describe('feedback closure defects reproduced before correction',()=>{
 const row:PhraseReview={phraseId:'clarify',canonicalHash:'a'.repeat(64),spokenHash:'b'.repeat(64),audioHash:'c'.repeat(64),heardExactAsset:true,status:'PASS',naturalness:4,pronunciation:4,pace:4,comments:''};
 it.each([{pronunciation:3},{naturalness:3},{comments:'The ending sounds wrong'}])('does not hide a human concern behind PASS: %j',change=>{
  expect(pronunciationConcerns([{...row,...change}])).toHaveLength(1);
 });
 it('the complete C32 structured call selects the same new close as the listening workspace',async()=>{
  const result=await ordinaryScenario('A');
  expect(result.intervals.at(-1)?.hash).toBe(candidates.find(a=>a.phraseId==='success-close')!.assetHash);
 });
});

import {currentAssetTable,assertCurrentAssetTable,feedbackMaster,proposedClosureGenerations,assertProposedClosureGenerations} from '../src/consent/stage32/feedback/closure';
import {c32Definition,validateC32Definition,currentC32Catalog,currentC32ReviewBindings,currentC32Response,C32Playback} from '../src/consent/stage32/speech/current';
import {retestDefinition,qaResponse} from '../src/consent/corrections/retest';
import {currentCatalog} from '../src/consent/corrections/assets';
import {canonicalPhrase,makePlan,validatePlan,type SynthesisPlan} from '../src/consent/stage32/speech/plans';
import {textHash} from '../src/consent/wording';
import {listeningReadyFor} from '../src/consent/stage32/hardening/review';
import type {PlaybackRecord} from '../src/consent/types';

describe('complete current C32 asset ownership',()=>{
 it('makes every exact cached fixture reachable, including name variants and the intentional confirmation alias',async()=>{
  const table=await currentAssetTable(),bindings=await currentC32ReviewBindings();await expect(assertCurrentAssetTable(table)).resolves.toBeUndefined();
  expect(new Set(table.rows.map(r=>r.reviewKey)).size).toBe(table.rows.length);
  for(const a of currentC32Catalog())expect(bindings.some(b=>b.phraseId===a.phraseId&&b.audioHash===a.assetHash&&b.canonicalHash===a.textHash)).toBe(true);
  expect(table.rows.filter(r=>r.phraseId==='receptionist-target-request')).toHaveLength(2);
  expect(table.rows.filter(r=>r.phraseId==='authority-ask')).toHaveLength(2);
  expect(table.rows.find(r=>r.phraseId==='email-correction-confirm')?.currentAssetHash).toBe(table.rows.find(r=>r.phraseId==='email-confirmation-question')?.currentAssetHash);
  expect(table.templates.every(r=>!r.generated&&!r.playable&&r.currentAssetHash===null)).toBe(true);
 });
 it.each(['currentAssetHash','canonicalVersion','canonicalTextHash','synthesisTextHash','generated','intendedReviewPath'] as const)('rejects altered current ownership field %s',async field=>{
  const table=await currentAssetTable();(table.rows[0] as unknown as Record<string,unknown>)[field]=field==='generated'?false:'wrong';await expect(assertCurrentAssetTable(table)).rejects.toThrow();
 });
 it('never reselects any replaced low-rated hash, including Clarify, on definition, review or structured-call paths',async()=>{
  const table=await currentAssetTable();
  for(const a of candidates){const old=currentCatalog().find(o=>o.phraseId===a.phraseId)!;
   expect(table.rows.filter(r=>r.phraseId===a.phraseId).map(r=>r.currentAssetHash)).toEqual([a.assetHash]);
   expect(c32Definition.responses.find(r=>r.id===a.phraseId)?.audio?.sha256).toBe(a.assetHash);
   expect(table.rows.find(r=>r.phraseId===a.phraseId)?.historicalAssetHashes).toContain(old.assetHash);
   expect(()=>currentC32Response(old)).toThrow();
   const p={phraseVersion:a.wordingVersion,assetHash:old.assetHash,assetId:old.path} as PlaybackRecord;
   const player=new C32Playback();await expect(player.play(qaResponse(old),p,()=>{})).rejects.toThrow('Historical C32');await player.dispose();
  }
 });
 it('the completed Clarify candidate owns consent without inheriting the old human PASS or 2/5 rating',async()=>{
  const run=await ordinaryScenario('Q'),asset=candidates.find(a=>a.phraseId==='clarify')!;
  expect(run.intervals.filter(i=>i.phraseId==='clarify').map(i=>i.hash)).toEqual([asset.assetHash]);
  const table=await currentAssetTable(),row=table.rows.find(r=>r.phraseId==='clarify')!;
  expect(row.humanRatingForCurrentHash).toEqual([]);expect(row.humanStatus).toBe('NEW_CANDIDATE_HUMAN_REVIEW_PENDING');
  expect(run.stateEvidence.terminalState).toBe('END_SUCCESS');
  for(const change of [{text:asset.spokenText},{canArmConsent:false},{consentScope:'other'},{recipientTypes:['INTERMEDIARY']},{version:'stage-2.0c1-approved-1'}]){
   const d=structuredClone(c32Definition);Object.assign(d.responses.find(r=>r.id==='clarify')!,change);
   expect(()=>validateC32Definition(d)).toThrow();
  }
 });
 it('keeps every consent question, scope, graph and recipient policy unchanged',()=>{
  validateC32Definition(c32Definition);expect(c32Definition.consentScope).toBe(retestDefinition.consentScope);
  expect(c32Definition.transitions).toEqual(retestDefinition.transitions);
  for(const q of retestDefinition.responses.filter(r=>r.canArmConsent)){
   const current=c32Definition.responses.find(r=>r.id===q.id)!;
   expect({...current,version:q.version,audio:q.audio}).toEqual(q);
   if(q.id!=='clarify')expect(current).toEqual(q);
   else {expect(current.audio?.sha256).toBe(candidates.find(a=>a.phraseId==='clarify')!.assetHash);expect(current.text).toBe(q.text);}
  }
  const d=structuredClone(c32Definition);d.responses.find(r=>r.id==='why-calling')!.audio!.sha256=currentCatalog().find(r=>r.phraseId==='why-calling')!.assetHash;
  expect(()=>validateC32Definition(d)).toThrow();
 });
 it('reports all real actions without treating derived copies or missing C31 evidence as retests',async()=>{
  const master=await feedbackMaster();expect(master.observations.filter(r=>r.id.includes(':listening:'))).toHaveLength(42);
  expect(master.latestWeakPhrases.map(r=>r.phraseId).sort()).toEqual(['clarify','consent-question','email-request','success-close','why-calling']);
  expect(master.separateC31HumanRetestEvidence).toBe('NOT_FOUND');expect(master.physicalAttempts).toBe(6);
  expect(master.observations.filter(r=>r.id==='C-3:listening:0'||r.id==='C-3:listening:1')).toHaveLength(2);
  const current=await currentAssetTable();for(const a of candidates)expect(current.rows.find(r=>r.currentAssetHash===a.assetHash)?.humanRatingForCurrentHash).toEqual([]);
 });
 it('the single completed authorization cannot be relabelled as ungenerated or reused',async()=>{
  const proposal=await proposedClosureGenerations();expect(proposal.requestCount).toBe(1);expect(proposal.requests[0].phraseId).toBe('clarify');
  expect(proposal.requests[0].generated).toBe(true);expect(proposal.requests[0].assetHash).toBe(candidates.find(a=>a.phraseId==='clarify')!.assetHash);expect(proposal.requests[0].authorization).toBe('EXACT_ONE_REQUEST_AUTHORIZED_AND_CONSUMED');expect(proposal.remainingAuthorizedRequests).toBe(0);
  expect(proposal.totalCharacters).toBe(proposal.requests[0].payload.text.length);await expect(assertProposedClosureGenerations(proposal)).resolves.toBeUndefined();
  await expect(assertProposedClosureGenerations({...proposal,requests:[{...proposal.requests[0],generated:false}] } as never)).rejects.toThrow();
 });
});

async function rehash(plan:SynthesisPlan){plan.synthesisHash=await textHash(JSON.stringify({canonical:plan.canonical,synthesisVersion:plan.synthesisVersion,synthesisText:plan.synthesisText,segments:plan.segments,overrides:plan.overrides,prosody:plan.prosody,voice:plan.voice,strategy:plan.strategy}));return plan;}
describe('independent canonical meaning versus synthesis and pronunciation expectation',()=>{
 it.each([
  ['organization','a Pure Base','Other Company'],['recipient','dig','dem'],['permission','må','skal'],['action','sende','sælge'],['channel','e-mail','SMS'],['affirmative proposition','sende','ikke sende'],['phonetic spelling','sende dig','sene dej']
 ])('rejects a rehashed %s alteration',async(_kind,from,to)=>{
  const authority=await canonicalPhrase(retestDefinition.responses.find(r=>r.id==='why-calling')!);const plan=await makePlan(authority,'PUNCTUATION');
  expect(plan.synthesisText).toContain(from);plan.synthesisText=plan.synthesisText.replace(from,to);plan.segments=[{...plan.segments[0],text:plan.synthesisText}];await rehash(plan);
  await expect(validatePlan(plan,authority)).rejects.toThrow();
 });
 it('a rehashed canonical scope or role graft is still rejected against the independently supplied authority',async()=>{
  const authority=await canonicalPhrase(retestDefinition.responses.find(r=>r.id==='consent-question')!);
  for(const change of [{consentScope:'other-scope'},{recipientTypes:['INTERMEDIARY']}]){const plan=await makePlan(authority);Object.assign(plan.canonical,change);await rehash(plan);await expect(validatePlan(plan,authority)).rejects.toThrow();}
 });
 it('latest exact-hash evidence wins; neither a prior good score nor another hash masks a later problem',()=>{
  const row:PhraseReview={phraseId:'clarify',canonicalHash:'a'.repeat(64),spokenHash:'b'.repeat(64),audioHash:'c'.repeat(64),heardExactAsset:true,status:'PASS',naturalness:4,pronunciation:4,pace:4,comments:''};
  expect(listeningReadyFor([row],[row])).toBe(true);
  expect(listeningReadyFor([row],[row,{...row,pronunciation:3}])).toBe(false);
  expect(listeningReadyFor([row],[{...row,audioHash:'d'.repeat(64)}])).toBe(false);
  expect(listeningReadyFor([row],[row,{...row,comments:'sounds wrong'}])).toBe(false);
 });
});

import {closureAdversarialIds,closureAdversarialCase,runClosureAdversarial} from '../src/consent/stage32/feedback/adversarial';
import {syntheticCall} from '../src/consent/stage32/hardening/simulator';
import {prepareC32Recognition} from '../src/consent/stage32/recognition';
import {EvaluationPreflight} from '../src/consent/stage32/hardening/preflight';
import {EmailASRDiagnostics} from '../src/consent/stage32/diagnostics';
import type {RecognitionEvent} from '../src/streaming/continuousTranscriptionClient';

describe('additional independent database and model boundaries on the public C32 controller',()=>{
 it.each(closureAdversarialIds)('%s',async id=>{const row=await closureAdversarialCase(id);expect(row.passed,JSON.stringify(row.checks)).toBe(true);});
 it('measures actual safe state outcomes and a deliberately unsafe nonzero negative control',async()=>{
  const result=await runClosureAdversarial();expect(result.passed).toBe(result.denominator);
  expect(result.metrics).toEqual({falseEmailAutoAccepts:0,ambiguousAutomaticSelections:0});
  expect(result.negativeControl).toMatchObject({detected:true,metrics:{falseAutoAccepts:1,ambiguousAutoSelections:1},realControllerStoredEmail:null});
 });
});

describe('C32 microphone ownership without opening a physical microphone or provider',()=>{
 it('retains real VAD boundaries, partial/final differences and endpoint handoff; duplicate finals cannot acquire twice',async()=>{
  const f=await syntheticCall('asr-boundaries');await f.identity();await f.session.approvePlayback('purpose');await f.question();await f.yes();await f.ask();
  let emit!:(e:RecognitionEvent)=>void;const preflight=new EvaluationPreflight('INJECTED_LOCAL'),diagnostics=new EmailASRDiagnostics();preflight.backendResult({stage:'2.0c31',configured:true,gateway:true});
  const bridge=prepareC32Recognition(f.session,preflight,diagnostics,()=>{},()=>{},f.clock,event=>{emit=event;return {open:async()=>{},append:()=>{},commit:()=>{},close:()=>{}};},{prepare:async()=>{},enable:()=>{},cancel:()=>{}});
  await bridge.start();emit({type:'final',generation:99,text:'invented@clinic.example'});await f.session.settled();expect(f.session.structuredEmail.snapshot().attempt).toBeUndefined();
  f.advance(100);const voice=new Uint8Array(4800);for(let i=0;i<voice.length;i+=2)new DataView(voice.buffer).setInt16(i,2000,true);bridge.frame(voice);
  emit({type:'partial',generation:0,text:'anne'});await f.session.settled();expect(f.session.structuredEmail.snapshot().attempt).toBeUndefined();
  f.advance(900);bridge.frame(new Uint8Array(4800));emit({type:'final',generation:0,text:'anna snabel-a clinic punktum example'});await f.session.settled();
  expect(f.session.structuredEmail.snapshot().attempt?.resolution.selected).toBe('anna@clinic.example');
  emit({type:'final',generation:0,text:'different@clinic.example'});await f.session.settled();
  expect(f.session.structuredEmail.audit.export().events.filter(e=>e.event==='email.resolved')).toHaveLength(1);
  expect(diagnostics.export().boundaries[0].end).toBeDefined();expect(preflight.export().finals).toHaveLength(1);expect(preflight.snapshot().liveASRVerified).toBe(false);bridge.stop();expect(preflight.snapshot().status).not.toBe('READY');
 });
 it.each(['provider error','setup timeout'])('a %s fails closed and cannot promote preflight or email state',async reason=>{
  const f=await syntheticCall('asr-fail');const p=new EvaluationPreflight('INJECTED_LOCAL');p.backendResult({stage:'2.0c31',configured:true,gateway:true});let failed=false;
  const bridge=prepareC32Recognition(f.session,p,new EmailASRDiagnostics(),()=>{},()=>{failed=true;},f.clock,()=>({open:async()=>{throw new Error('SYNTHETIC '+reason);},append:()=>{},commit:()=>{},close:()=>{}}),{prepare:async()=>{},enable:()=>{},cancel:()=>{}});
  await bridge.start();expect(failed).toBe(true);expect(p.snapshot().status).not.toBe('READY');expect(p.mayStartScenarios).toBe(false);expect(f.session.structuredEmail.snapshot().storedEmail).toBeUndefined();
 });
});
