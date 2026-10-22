import type {ConsentSession} from '../../session';
import type {ConsentSnapshot,PlaybackRecord,Transcript} from '../../types';
import type {LocalPlaybackPort} from '../../approved/localPlayback';
import {eligibleRecipient} from '../../authority';
import {ConservativeDanishClassifier,explicitAffirmative} from '../../classifier';
import {currentC32Catalog as currentCatalog,currentC32Response as qaResponse} from '../speech/current';
import {retestDefinition} from '../../corrections/retest';
import {validateContactScope} from './databaseResolver';
import {EmailAudit} from './audit';
import {hardenedEmailPolicy} from './policy';
import type {ContactEmailResolver,ContactScope,EmailReconciliationPort,EmailTurn,ParsedEmail,Resolution} from './types';

export function hasReviewedConsent(s:ConsentSnapshot,verified:(p:PlaybackRecord)=>boolean=p=>p.mode==='local-prerecorded'&&p.completionSource==='VERIFIED_OUTPUT_ADAPTER'&&!!p.outputProof?.startsWith('web-audio-source-ended:'+p.playbackId+':')){
 const decision=s.decision,t=s.turns.find(t=>t.id===decision?.turnId),q=t?.consent.question,p=s.playbacks.find(p=>p.playbackId===q?.instanceId);
 return !!(decision?.classification==='YES'&&decision.recipientRevision===s.recipientRevision&&eligibleRecipient(s)&&!s.doNotContactRequested&&!['HUMAN_TAKEOVER','END_SUCCESS','END_REFUSED','END_OTHER'].includes(s.state)&&t?.review?.classification==='YES'&&t.review.reason.trim()&&t.consent.eligibleYes&&t.consent.recipient.recipientRevision===s.recipientRevision&&q?.scope===retestDefinition.consentScope&&q.recipientType===s.recipientType&&q.recipientRevision===s.recipientRevision&&p?.state==='COMPLETED'&&verified(p)&&p.completedAt===q.completedAt&&p.textHash===q.textHash&&p.phraseVersion===q.responseVersion&&p.phraseId===q.responseId&&decision.questionInstanceId===q.instanceId&&t.transcript.answerPlaybackId===q.instanceId&&t.transcript.final&&t.transcript.source==='provider'&&t.transcript.id.startsWith('mic:')&&explicitAffirmative(t.transcript.text)&&t.transcript.speechStartedAt!==undefined&&t.transcript.speechStartedAt>q.completedAt&&t.transcript.observedAt>=t.transcript.speechStartedAt);
}
type Attempt={id:string;revision:number;consentTurnId:string;at:number;turn:EmailTurn;parsed:ParsedEmail;resolution:Resolution;correctionOf?:string};
type Window={id:string;completedAt:number;revision:number;kind:'ADDRESS'|'CONFIRM';attemptId?:string;consumed:boolean};
export type EmailFlowState='IDLE'|'LISTENING'|'RESOLVING'|'CONFIRM_REQUIRED'|'CLARIFICATION_REQUIRED'|'OPERATOR_REVIEW'|'HUMAN_TAKEOVER'|'CONFIRMED_LOCAL_CANDIDATE'|'END_SUCCESS';

/** Candidate-only adjunct to the unchanged consent engine. Never writes its consent/email/handoff. */
export class EmailAcquisition {
 readonly audit:EmailAudit;
 private state:EmailFlowState='IDLE';private scope?:ContactScope;private window?:Window;private attempt?:Attempt;
 private confirmation?:{turn:EmailTurn;candidate:string};private seen=new Set<string>();
 private onsets=new Map<string,{onset?:number;owner?:string;revision:number;generation:number}>();
 private generation=0;private abort?:AbortController;private playback?:PlaybackRecord;private correctionOf?:string;
 private history:Attempt[]=[];private takeoverReason:string|null=null;
 private requests=new Map<string,number>();private requestIds=new Set<string>();private candidateCount=0;
 private stored?:{kind:'LOCAL_EVALUATION_CONFIRMED_EMAIL';email:string;recipientRevision:number;consentTurnId:string;sourceTurnId:string;confirmationTurnId:string;candidateRevision:number;storedAt:number;reviewer:string;reviewReason:string;productionConsent:false};
 constructor(private session:ConsentSession,private resolver:ContactEmailResolver,private player:LocalPlaybackPort,private model?:EmailReconciliationPort,private now:()=>number=()=>performance.now(),private forwardControl:(turn:Transcript)=>void=turn=>session.receive(turn)){this.audit=new EmailAudit(now);}
 snapshot(){return structuredClone({state:this.state,attempt:this.attempt,confirmation:this.confirmation,window:this.window,playback:this.playback,storedEmail:this.current()?this.stored:undefined,candidateAttempts:this.candidateCount,savingEnabled:false,sourceAudioStored:false,characterReadback:'DIAGNOSTIC_COMPARISON_ONLY',productionReady:false,normalEmailSpeech:'CONCISE_CONFIRMATION_ONLY',fullCallRecording:'NOT_IMPLEMENTED_BUSINESS_DECISION_REQUIRED',takeoverReason:this.takeoverReason,attemptHistory:this.history,pipeline:this.pipeline()});}
 pipeline(){const a=this.attempt;return structuredClone({rawTranscript:a?.turn.text??null,reconstructedCandidate:a?.parsed.candidates??[],databaseCandidates:a?.resolution.databaseCandidates??[],modelRecommendation:a?.resolution.suggestion??{status:'NOT_REQUESTED',raw:null,accepted:false,reason:'No advisory model invoked'},resolutionStatus:a?.resolution.classification??'NOT_RESOLVED',resolvedCandidate:this.current()&&['CONFIRM_REQUIRED','CONFIRMED_LOCAL_CANDIDATE','END_SUCCESS'].includes(this.state)?a?.resolution.selected??null:null,confirmationStatus:this.confirmation?'OWNED_RECIPIENT_CONFIRMED':this.state==='CONFIRM_REQUIRED'?'PENDING_CONFIRMATION':'NOT_CONFIRMED',correctionLineage:this.history.map(h=>({attemptId:h.id,correctionOf:h.correctionOf??null,candidate:h.resolution.selected,status:h.id===a?.id?(this.confirmation?'CONFIRMED':this.state==='CONFIRM_REQUIRED'?'PENDING_CONFIRMATION':'INVALIDATED'):'SUPERSEDED'})),takeoverReason:this.takeoverReason,sourceTurn:a?.turn??null,reconstruction:a?.parsed??null,databaseEvidence:a?.resolution.databaseEvidence??null,confirmation:this.confirmation??null,questionPlayback:this.playback??null,fullEmailSpeechEnabled:false});}
 private current(){const s=this.session.snapshot();return hasReviewedConsent(s,p=>this.session.verifiedPlaybackRecord(p))&&this.scope?.callId===s.callId&&this.scope.recipientRevision===s.recipientRevision;}
 private consentKey(){const s=this.session.snapshot();return s.callId+':'+s.recipientRevision+':'+s.decision?.turnId;}
 assertCanRequest(){if(this.state==='END_SUCCESS')throw new Error('Local call already completed');if((this.requests.get(this.consentKey())??0)>=2){this.invalidate('EMAIL_RETRY_BUDGET_EXHAUSTED');this.state='HUMAN_TAKEOVER';throw new Error('One email retry only; human assistance required');}}
 open(scope:ContactScope){
  validateContactScope(scope);
  const s=this.session.snapshot(),p=s.playbacks.at(-1),a=currentCatalog().find(a=>a.phraseId==='email-request');
  if(!hasReviewedConsent(s,p=>this.session.verifiedPlaybackRecord(p))||scope.callId!==s.callId||scope.recipientRevision!==s.recipientRevision||!scope.contactId||!scope.mappingEvidenceId||!p||!a||p.phraseId!=='email-request'||p.state!=='COMPLETED'||!this.session.verifiedPlaybackRecord(p)||p.completedAt===null||p.assetHash!==a.assetHash||p.textHash!==a.textHash||p.recipientRevision!==s.recipientRevision)throw new Error('Current reviewed scoped consent, independent contact mapping and completed email request required');
  this.assertCanRequest();if(this.requestIds.has(p.playbackId))throw new Error('Completed request cannot be reused');
  this.requests.set(this.consentKey(),(this.requests.get(this.consentKey())??0)+1);this.requestIds.add(p.playbackId);
  if(this.scope?.recipientRevision!==scope.recipientRevision)this.candidateCount=0;
  this.invalidate('NEW_ADDRESS_WINDOW');this.scope=structuredClone(scope);this.window={id:p.playbackId,completedAt:p.completedAt,revision:s.recipientRevision,kind:'ADDRESS',consumed:false};this.state='LISTENING';this.takeoverReason=null;
  this.audit.append('email.request_opened',{scope,playback:p,consentTurnId:s.decision!.turnId,canonicalText:a.text});
 }
 owner(){if(!this.current())return undefined;return this.playback&&['QUEUED','PLAYING'].includes(this.playback.state)?this.playback.playbackId:this.window&&!this.window.consumed?this.window.id:undefined;}
 invalidate(reason:string){this.generation++;this.abort?.abort();this.abort=undefined;this.window=undefined;this.confirmation=undefined;this.stored=undefined;if(this.playback&&['QUEUED','PLAYING'].includes(this.playback.state)){this.playback.state='INTERRUPTED';this.player.cancel();}this.state='OPERATOR_REVIEW';this.takeoverReason=reason;this.audit.append('email.invalidated',{reason,attemptId:this.attempt?.id});}
 operatorReview(reviewer:string,reason:string,proposedValue?:string){this.audit.append('email.operator_review',{reviewer,reason,proposedValue,authorizedSave:false});this.invalidate('OPERATOR_REVIEW_CANNOT_OVERRIDE_RECIPIENT_EVIDENCE');}
 private deny(reason:string){this.audit.append('email.evidence_rejected',{reason});return false;}
 /** Adapter must forward the original Danish transcript, not normalized text. */
 async receive(input:EmailTurn):Promise<boolean>{
  this.audit.append('email.asr',{transcript:input,endpointOwner:input.answerPlaybackId??null,revision:input.recipientRevision});
  if(!this.onsets.has(input.id))this.onsets.set(input.id,{onset:input.speechStartedAt,owner:input.answerPlaybackId,revision:input.recipientRevision,generation:this.generation});
  const boundary=this.onsets.get(input.id)!;
  if(!input.final){if(this.playback&&['QUEUED','PLAYING'].includes(this.playback.state))this.invalidate('BARGE_IN');return false;}
  if(this.seen.has(input.id))return this.deny('DUPLICATE_FINAL');this.seen.add(input.id);
  const turn:EmailTurn={...structuredClone(input),speechStartedAt:boundary.onset,answerPlaybackId:boundary.owner,recipientRevision:boundary.revision};
  const intent=new ConservativeDanishClassifier().classify(turn).intent;
  if(['REQUEST_HUMAN','WITHDRAWAL','STOP_CONTACT','AUTHORITY_DENIED','WRONG_PERSON','RECEPTIONIST','RIGHT_PERSON','AUTHORITY_CLAIMED','INTERMEDIARY_OFFER'].includes(intent)||intent==='REFUSAL'&&(!/^nej(?:,? tak)?[.!]?$/iu.test(turn.text.trim())||this.window?.kind!=='CONFIRM')){
   this.invalidate(intent);this.state='HUMAN_TAKEOVER';this.forwardControl(turn);this.audit.append('email.control_forwarded',{intent});return false;
  }
  const w=this.window;
  if(!this.current()){this.invalidate('CONSENT_OR_IDENTITY_STALE');return false;}
  const parsed=hardenedEmailPolicy.parse(turn.text);
  // Unowned corrections may revoke eligibility, but cannot supply a new accepted value.
  if(this.confirmation&&turn.source==='provider'&&(/^(nej\b|no\b|undskyld\b|jeg sagde\b|adressen er forkert|e-mailadressen er forkert)/iu.test(turn.text.trim())||parsed.candidates.some(c=>c!==this.confirmation!.candidate))){this.correctionOf=this.attempt?.id;this.invalidate('POST_CONFIRMATION_CORRECTION_REQUIRES_FRESH_OWNERSHIP');this.state='CLARIFICATION_REQUIRED';return false;}
  if(w?.consumed&&turn.answerPlaybackId===w.id&&boundary.generation===this.generation){this.invalidate('NEW_FINAL_AFTER_CONSUMED_WINDOW');this.state='CLARIFICATION_REQUIRED';return false;}
  if(!w||w.consumed||boundary.generation!==this.generation||turn.source!=='provider'||!turn.id.startsWith('mic:')||turn.answerPlaybackId!==w.id||turn.recipientRevision!==w.revision||turn.speechStartedAt===undefined||!Number.isFinite(turn.speechStartedAt)||!Number.isFinite(turn.observedAt)||turn.speechStartedAt<=w.completedAt||turn.observedAt<turn.speechStartedAt||turn.observedAt>this.now())return this.deny('UNOWNED_STALE_OR_PRE_COMPLETION_FINAL');
  w.consumed=true;
  if(w.kind==='CONFIRM'&&(explicitAffirmative(turn.text)||intent==='EMAIL_CONFIRMED')){
   const attempt=this.attempt;
   if(!attempt||attempt.id!==w.attemptId||attempt.resolution.classification!=='EXACT_VERIFIED_MATCH')return this.deny('NO_EXACT_CONFIRMATION_CANDIDATE');
   const generation=this.generation;this.abort=new AbortController();
   const checked=await hardenedEmailPolicy.resolve(attempt.parsed,this.scope!,this.resolver,undefined,this.abort.signal).catch(()=>null);
   if(generation!==this.generation||!this.current())return this.deny('STALE_CONFIRMATION_LOOKUP');
   if(!checked||checked.classification!=='EXACT_VERIFIED_MATCH'||checked.selected!==attempt.resolution.selected||JSON.stringify(checked.databaseCandidates)!==JSON.stringify(attempt.resolution.databaseCandidates)){this.invalidate('CONTACT_RECORD_CHANGED_OR_UNAVAILABLE');return false;}
   this.confirmation={turn,candidate:checked.selected!};this.state='CONFIRMED_LOCAL_CANDIDATE';this.audit.append('email.recipient_confirmed',{attemptId:attempt.id,turn,candidate:checked.selected,savingEnabled:false});return true;
  }
  if(w.kind==='CONFIRM'&&/^(nej\b|no\b|adressen er forkert|e-mailadressen er forkert)/iu.test(turn.text.trim())&&!parsed.candidates.length){
   this.correctionOf=this.attempt?.id;this.invalidate('RECIPIENT_DENIED_EMAIL');this.state='CLARIFICATION_REQUIRED';this.audit.append('email.correction_required',{sourceTurnId:turn.id,correctionOf:this.correctionOf});return false;
  }
  this.abort?.abort();const generation=++this.generation;this.abort=new AbortController();this.state='RESOLVING';
  if(++this.candidateCount>2){this.invalidate('EMAIL_CORRECTION_BUDGET_EXHAUSTED');this.state='HUMAN_TAKEOVER';return false;}
  this.audit.append('email.parsed',{sourceTurnId:turn.id,parsed});
  const resolution=await hardenedEmailPolicy.resolve(parsed,this.scope!,this.resolver,this.model,this.abort.signal).catch(()=>null);
  if(generation!==this.generation||!this.current())return this.deny('STALE_RESOLUTION');
  if(!resolution){this.invalidate('RESOLUTION_CANCELLED');return false;}
  this.attempt={id:turn.id,revision:this.candidateCount,consentTurnId:this.session.snapshot().decision!.turnId,at:this.now(),turn,parsed,resolution,correctionOf:this.correctionOf??(w.kind==='CONFIRM'?w.attemptId:undefined)};this.correctionOf=undefined;this.history.push(structuredClone(this.attempt));
  this.state=resolution.action==='CONFIRM'?'CONFIRM_REQUIRED':resolution.classification==='UNPARSABLE'&&parsed.errors.every(e=>e==='NO_LITERAL_ADDRESS_STRUCTURE')&&this.candidateCount<2?'CLARIFICATION_REQUIRED':resolution.action;
  if(this.state==='CLARIFICATION_REQUIRED')this.audit.append('email.repeat_required',{attemptId:turn.id,remaining:1,requestPhraseId:'email-request'});
  if(this.candidateCount>=2&&resolution.action!=='CONFIRM')this.state='HUMAN_TAKEOVER';
  this.takeoverReason=['OPERATOR_REVIEW','HUMAN_TAKEOVER'].includes(this.state)?resolution.reason:null;
  this.audit.append('email.resolved',this.attempt);return true;
 }
 /** Local evaluation data only; no CRM/production storage or baseline consent mutation. */
 async completeLocalCall(review:{reviewer:string;reason:string}){
  if(!this.current()||this.state!=='CONFIRMED_LOCAL_CANDIDATE'||!this.confirmation||!this.attempt||!review.reviewer.trim()||!review.reason.trim())throw new Error('Current owned recipient confirmation and explicit operator review required');
  const generation=this.generation,attempt=this.attempt,confirmation=structuredClone(this.confirmation),s=this.session.snapshot();
  const checked=await hardenedEmailPolicy.resolve(attempt.parsed,this.scope!,this.resolver);
  if(!this.current()||generation!==this.generation||checked.selected!==confirmation.candidate||checked.classification!=='EXACT_VERIFIED_MATCH'||JSON.stringify(checked.databaseCandidates)!==JSON.stringify(attempt.resolution.databaseCandidates))throw new Error('Changed evidence cannot be stored');
  const a=currentCatalog().find(a=>a.phraseId==='success-close')!;
  const p:PlaybackRecord={playbackId:crypto.randomUUID(),callId:s.callId,phraseId:a.phraseId,phraseVersion:a.wordingVersion,assetId:a.path,assetHash:a.assetHash,textHash:a.textHash,state:'QUEUED',mode:this.session.outputMode(),queuedAt:this.now(),startedAt:null,completedAt:null,interruptedAt:null,failedAt:null,completionSource:null,recipientRevision:s.recipientRevision,answerConsumed:false};
  this.playback=p;
  try{await this.player.play(qaResponse(a),structuredClone(p),e=>{
   this.audit.append('email.local_close_output',e);
   if(generation!==this.generation||!this.current()||this.playback!==p||!['QUEUED','PLAYING'].includes(p.state)||e.playbackId!==p.playbackId||e.callId!==p.callId||e.assetHash!==p.assetHash||e.phraseId!==p.phraseId||e.textHash!==p.textHash||e.phraseVersion!==p.phraseVersion||e.recipientRevision!==p.recipientRevision)return;
   if(e.action==='start'){p.state='PLAYING';p.startedAt=this.now();}
   if(e.action==='complete'&&p.state==='PLAYING'&&this.session.acceptsOutput(p,e.outputProof)&&!e.gain?.clippingEvents){p.state='COMPLETED';p.completedAt=this.now();p.completionSource=this.session.outputSource();p.outputProof=e.outputProof;}
   if(e.action==='fail'||e.action==='interrupt')this.invalidate('LOCAL_CLOSE_FAILED');
  });}catch(e){this.invalidate('LOCAL_CLOSE_FAILED');throw e;}
  if(p.state!=='COMPLETED'||generation!==this.generation||!this.current())throw new Error('Local close completion missing');
  this.stored={kind:'LOCAL_EVALUATION_CONFIRMED_EMAIL',email:confirmation.candidate,recipientRevision:s.recipientRevision,consentTurnId:attempt.consentTurnId,sourceTurnId:attempt.id,confirmationTurnId:confirmation.turn.id,candidateRevision:attempt.revision,storedAt:this.now(),reviewer:review.reviewer.trim(),reviewReason:review.reason.trim(),productionConsent:false};this.state='END_SUCCESS';this.audit.append('email.local_evaluation_stored',this.stored);return structuredClone(this.stored);
 }
 /** Unambiguous exact speech only. HIGH requires re-spelling/clarification, not a generic yes. */
 async confirmPrompt(){
  if(!this.current()||this.state!=='CONFIRM_REQUIRED'||this.attempt?.resolution.classification!=='EXACT_VERIFIED_MATCH'){this.audit.append('email.confirmation_blocked',{reason:'Concise question cannot disambiguate unspoken inferred characters; request fresh address or operator review'});throw new Error('Exact spoken reconstruction required; high confidence needs explicit disambiguation');}
  const a=currentCatalog().find(a=>a.phraseId==='email-confirmation-question')!;
  const generation=this.generation,attempt=this.attempt,s=this.session.snapshot();
  const p:PlaybackRecord={playbackId:crypto.randomUUID(),callId:s.callId,phraseId:a.phraseId,phraseVersion:a.wordingVersion,assetId:a.path,assetHash:a.assetHash,textHash:a.textHash,state:'QUEUED',mode:this.session.outputMode(),queuedAt:this.now(),startedAt:null,completedAt:null,interruptedAt:null,failedAt:null,completionSource:null,recipientRevision:s.recipientRevision,answerConsumed:false};
  this.playback=p;this.window=undefined;this.audit.append('email.confirmation_queued',{attemptId:attempt.id,selected:attempt.resolution.selected,record:p});
  try{await this.player.play(qaResponse(a),structuredClone(p),event=>{
   this.audit.append('email.output',event);
   if(generation!==this.generation||!this.current()||this.playback!==p||!['QUEUED','PLAYING'].includes(p.state)||event.playbackId!==p.playbackId||event.callId!==p.callId||event.phraseId!==p.phraseId||event.phraseVersion!==p.phraseVersion||event.assetHash!==p.assetHash||event.textHash!==p.textHash||event.recipientRevision!==p.recipientRevision)return;
   if(event.action==='start'){p.state='PLAYING';p.startedAt=this.now();}
   if(event.action==='complete'&&p.state==='PLAYING'&&this.session.acceptsOutput(p,event.outputProof)&&(!event.gain||!event.gain.clippingEvents)){
    p.state='COMPLETED';p.completedAt=this.now();p.completionSource=this.session.outputSource();p.outputProof=event.outputProof;p.gain=event.gain;
    this.window={id:p.playbackId,completedAt:p.completedAt,revision:p.recipientRevision,kind:'CONFIRM',attemptId:attempt.id,consumed:false};
   }else if(['interrupt','fail'].includes(event.action))this.invalidate('CONFIRMATION_OUTPUT_'+event.action);
  });}catch(error){this.invalidate('CONFIRMATION_OUTPUT_FAILED');throw error;}
  // A resolved promise with no source-ended event is never completion proof.
  if(p.state!=='COMPLETED'&&generation===this.generation)this.invalidate('NO_COMPLETED_OUTPUT_PROOF');
 }
 export(){return {...this.snapshot(),...this.audit.export(),stage:'2.0C-3.2',status:'NOT_ACCEPTED',downstreamHandoffEnabled:false,telephoneVerified:false};}
}

/** Route an email turn only after the host opened this flow from the real consent session. */
export function emailTurn(raw:Transcript,recipientRevision:number):EmailTurn{return {...structuredClone(raw),recipientRevision};}
