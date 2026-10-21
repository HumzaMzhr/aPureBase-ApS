import {StructuredEmailSession} from '../session';
import {evaluationFlow,type NaturalFlow} from './naturalFlow';
export {naturalFlow} from './naturalFlow';
import {currentCatalog,prepareCorrection} from '../../corrections/assets';
import type {LocalPlaybackEvent,LocalPlaybackPort} from '../../approved/localPlayback';
import type {ContactEmailResolver,ContactScope} from '../email/types';
/** Actual consent/session code + synthetic event clock. Never plays PCM or opens providers. */
export async function syntheticCall(id='direct',db?:ContactEmailResolver,config:Partial<NaturalFlow>={},model?:import('../email/types').EmailReconciliationPort){
 const flow=evaluationFlow(config);
 let clock=0,turn=0,recipientSpeech=0,recipientThinking=0,hold=false,fail=false,late:(()=>void)|undefined;
 const intervals:{phraseId:string;hash:string;start:number;end:number;seconds:number}[]=[];
 const pending:((e:LocalPlaybackEvent)=>void)[]=[];
 const scope:ContactScope={callId:'synthetic:'+id,recipientRevision:1,contactId:'synthetic:clinic',mappingEvidenceId:'synthetic:verified-map',source:'SYNTHETIC_FIXTURE'};
 const resolver:ContactEmailResolver=db??{resolveCandidates:async()=>['anna@clinic.example','anne@clinic.example'].map((email,i)=>({contactId:scope.contactId,email,recordVersion:'1',sourceRecordId:'synthetic:record:'+i}))};
 const player:LocalPlaybackPort & {prepare:typeof prepareCorrection;register:()=>void}={prepare:prepareCorrection,register:()=>{},cancel:()=>{},play:async(r,p,emit)=>{
  const a=currentCatalog().find(a=>a.assetHash===r.audio?.sha256&&a.textHash===r.audio?.textHash);if(!a)throw new Error('No existing media binding for simulation');
  const base={callId:p.callId,playbackId:p.playbackId,phraseId:r.id,phraseVersion:r.version,textHash:r.audio!.textHash!,assetHash:r.audio!.sha256!,recipientRevision:p.recipientRevision};
  if(fail){emit({...base,action:'fail',error:'SYNTHETIC_OUTPUT_FAILURE'});throw new Error('SYNTHETIC_OUTPUT_FAILURE');}
  clock+=flow.paceSeconds*1000;const start=clock;emit({...base,action:'start'});
  const complete=()=>{clock+=a.duration*1000;intervals.push({phraseId:r.id,hash:a.assetHash,start,end:clock,seconds:a.duration});emit({...base,action:'complete',outputProof:'web-audio-source-ended:'+p.playbackId+':SYNTHETIC_SIMULATOR_NOT_PHYSICAL'});};
  if(hold){pending.push(emit);late=complete;}else complete();
 }};
 const session=new StructuredEmailSession(scope.callId,{now:()=>clock,localPlayback:player,dynamicSpeech:player},resolver,{model});
 const initialState=session.snapshot().state;
 const speak=async(text:string,options:{owner?:string;final?:boolean;id?:string;onset?:number;delay?:number;speechMs?:number}={})=>{
  const thinking=options.delay??flow.thinkingSeconds*1000,speech=options.speechMs??(/@|snabel/iu.test(text)?flow.emailSpeechSeconds*1000:text.length>50?flow.authoritySpeechSeconds*1000:flow.shortSpeechSeconds*1000);clock+=thinking;recipientThinking+=thinking;const onset=options.onset??clock;clock+=speech;recipientSpeech+=speech;
  const id=options.id??'mic:SIMULATED:'+(++turn);session.receive({id,text,source:'provider',final:options.final??true,observedAt:clock,speechStartedAt:onset,answerPlaybackId:options.owner??session.confirmationPlaybackId()??session.snapshot().activePlaybackId});await session.settled();return id;
 };
 const identity=async(kind:'TARGET_HCP'|'INTERMEDIARY'='TARGET_HCP')=>{clock+=flow.operatorSeconds*1000;session.setRecipient(kind,'Synthetic identity attestation only',kind==='TARGET_HCP');if(kind==='INTERMEDIARY')session.bindName({original:'Jens Hansen',source:'contact-data',evidenceId:'synthetic:contact',evidenceText:'Synthetic target Jens Hansen',reviewedBy:'synthetic:operator',reviewedAt:'2026-10-21',pronunciationConfirmed:true,recipientRevision:session.snapshot().recipientRevision});};
 const question=async()=>{const id=session.snapshot().recipientType==='INTERMEDIARY'?'intermediary-consent-question':'consent-question';await session.approvePlayback(id);return session.snapshot().activePlaybackId!;};
 const yes=async()=>{await speak('Ja');clock+=flow.operatorSeconds*1000;session.reviewConsent(session.snapshot().turns.at(-1)!.id,'YES','Synthetic separate operator review after owned final');session.bindContactScope({...scope,recipientRevision:session.snapshot().recipientRevision});};
 const ask=()=>session.approvePlayback('email-request');
 const complete=async()=>{await session.structuredEmail.confirmPrompt();await speak('Ja, adressen er korrekt');clock+=flow.operatorSeconds*1000;return session.structuredEmail.completeLocalCall({reviewer:'synthetic:operator',reason:'Exact candidate visually reviewed in simulation'});};
 await session.approvePlayback('opening');
 return {session,speak,identity,question,yes,ask,complete,scope,intervals,clock:()=>clock,advance:(ms:number)=>{clock+=ms;},hold:()=>{hold=true;},release:()=>{hold=false;late?.();},failOutput:()=>{fail=true;},export:()=>({config:flow,kind:'MODELED_SIMULATED_NOT_PHYSICAL',wallClockSeconds:null,modeledElapsedSeconds:clock/1000,mediaSeconds:intervals.reduce((n,i)=>n+i.seconds,0),modeledRecipientSpeechSeconds:recipientSpeech/1000,modeledRecipientThinkingSeconds:recipientThinking/1000,modeledTransitionsSeconds:intervals.length*flow.paceSeconds,modeledOperatorAndExplicitDelaySeconds:clock/1000-intervals.reduce((n,i)=>n+i.seconds,0)-recipientSpeech/1000-recipientThinking/1000-intervals.length*flow.paceSeconds,providerNetworkSeconds:null,unresolvedPhysicalDelaySeconds:null,intervals:structuredClone(intervals),stateEvidence:{initialState,transcripts:session.snapshot().turns.map(t=>t.transcript),recipientType:session.snapshot().recipientType,authorityStatus:session.snapshot().authorityStatus,consent:session.snapshot().decision??null,consentOwner:session.snapshot().decision?.questionInstanceId??null,transcriptOwnership:session.snapshot().turns.map(t=>({id:t.id,owner:t.transcript.answerPlaybackId??null})),email:session.structuredEmail.export(),terminalState:session.structuredEmail.snapshot().state==='END_SUCCESS'?'END_SUCCESS':session.snapshot().state,confirmationState:session.structuredEmail.snapshot().confirmation??null,modelAdvisory:session.structuredEmail.snapshot().attempt?.resolution.suggestion??null,correctionLineage:session.structuredEmail.audit.export().events.filter(e=>e.event==='email.resolved'),takeoverReason:session.structuredEmail.audit.export().events.filter(e=>e.event==='email.invalidated').at(-1)?.data??null,automaticStorage:!!session.structuredEmail.snapshot().storedEmail&&!session.structuredEmail.snapshot().confirmation},session:session.exportReview(),sourceAudioStored:false,telephone:false})};
}

export const scenarioContract=Object.freeze({version:'c32h1-scenarios-1',ids:['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AQ','AR','AS','AT'],ordinaryEligible:['A','B','E','F','Q','AP','AS','AT'],exclusions:[]});
export async function ordinaryScenario(id:string,config:Partial<NaturalFlow>={}){
 const f=await syntheticCall(id,undefined,config);await f.identity();await f.session.approvePlayback('purpose');await f.question();
 if(id==='Q'){await f.speak('Måske');await f.session.approvePlayback('clarify');}
 await f.yes();await f.ask();
 const text=id==='B'?'anna snabel a clinic punktum example.':id==='F'?'anna@clinic.example; anna@clinic.example':'anna@clinic.example';
 await f.speak(text);
 if(['E','AT'].includes(id)){await f.session.structuredEmail.confirmPrompt();await f.speak('Nej, det er anne snabel-a clinic punktum example');}
 await f.complete();return f.export();
}
