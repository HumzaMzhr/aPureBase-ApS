import {IsolatedMicrophone} from '../../../streaming/input';
import {StructuredEmailSession} from '../session';
import {C32Playback} from '../speech/current';
import {prepareC32Recognition} from '../recognition';
import {EvaluationPreflight} from '../hardening/preflight';
import {EmailASRDiagnostics} from '../diagnostics';
import {parseEmailEvidence} from '../hardening/parser';
import {resolveEvidence} from '../hardening/resolution';
import {boundedRecords} from '../email/databaseResolver';
import type {ContactEmailResolver,ContactScope} from '../email/types';
import type {PhysicalRecognition,SourceAudit} from '../../acceptance/recognition';
import type {ReviewedObservation,EmailCase} from './contract';
/** Exact local fixture record set selected before capture, never inferred from ASR or queried remotely. */
export function fixtureResolver(fixture:EmailCase):ContactEmailResolver{return {resolveCandidates:async(scope,signal)=>{signal.throwIfAborted();if(scope.source!=='SYNTHETIC_FIXTURE'||scope.contactId!=='synthetic:'+fixture.id)throw new Error('Wrong local fixture scope');return boundedRecords(fixture.records.map((email,i)=>({email,contactId:scope.contactId,sourceRecordId:'synthetic:'+fixture.id+':'+i,recordVersion:'1'})),scope);}};}
export function fixtureScope(callId:string,revision:number,fixture:EmailCase):ContactScope{return {callId,recipientRevision:revision,contactId:'synthetic:'+fixture.id,mappingEvidenceId:'synthetic:independently-selected:'+fixture.id,source:'SYNTHETIC_FIXTURE'};}
export async function inspectCapturedEmail(text:string,fixture:EmailCase,callId:string){const parsed=parseEmailEvidence(text),resolution=await resolveEvidence(parsed,fixtureScope(callId,0,fixture),fixtureResolver(fixture));return {rawTranscript:text,reconstructedCandidate:parsed.candidates,databaseCandidates:resolution.databaseCandidates,modelRecommendation:resolution.suggestion??{status:'NOT_REQUESTED'},resolutionStatus:resolution.classification,resolvedCandidate:resolution.selected,correctionLineage:[],takeoverReason:resolution.action==='CONFIRM'?null:resolution.reason,rawASR:text,reconstructed:parsed.candidates,tokens:parsed.tokens,reconstruction:parsed,databaseEvidence:resolution.databaseEvidence,databaseFixtureCandidates:fixture.records,finalResolution:resolution,confirmationStatus:'NOT_CONFIRMED',fullEmailSpeechEnabled:false,acousticSymbolVerified:false,databaseIsSynthetic:true,productionConsent:false};}
export class PhysicalTest {
 readonly player=new C32Playback();readonly gate=new EvaluationPreflight();readonly diagnostics=new EmailASRDiagnostics();readonly session:StructuredEmailSession;
 private mic?:PhysicalRecognition;private stopping=false;readonly began=performance.now();inputLevel=0;
 constructor(readonly row:ReviewedObservation,readonly fixture:EmailCase,private changed:()=>void){
  this.session=new StructuredEmailSession(row.id,{localPlayback:this.player,dynamicSpeech:this.player},fixtureResolver(fixture));
  this.session.subscribe(()=>{this.retain();this.changed();});
 }
 private retain(){this.row.timingEvidence=this.row.events.filter(e=>e.event==='transcriptFinal').map(e=>{const onset=this.row.events.find(o=>o.event==='speechStarted'&&o.turnId===e.turnId),end=this.row.events.find(o=>o.event==='speechEnded'&&o.turnId===e.turnId),start=typeof onset?.data.speechStartedAt==='number'?onset.data.speechStartedAt:null,endpoint=typeof end?.data.speechEndedAt==='number'?end.data.speechEndedAt:null;return {turnId:e.turnId??null,sourceOnsetMs:start,sourceEndpointMs:endpoint,finalObservedMs:e.at,endpointToFinalMs:endpoint===null?null:e.at-endpoint};});this.row.preflight={snapshot:this.gate.snapshot(),lifecycle:this.gate.export(),emailDiagnostics:this.diagnostics.export()};this.row.sessionEvidence=this.session.exportReview();const s=this.session.snapshot(),e=this.session.structuredEmail.snapshot();this.row.finalState=e.state==='END_SUCCESS'?'END_SUCCESS':s.state;this.row.takeover=s.state==='HUMAN_TAKEOVER'||e.state==='HUMAN_TAKEOVER';this.row.consentOutcome=s.decision?.classification??'NO_REVIEWED_DECISION';this.row.emailOutcome=e.storedEmail?.email??e.confirmation?.candidate??e.attempt?.resolution.selected??null;if(this.row.kind==='NATURAL_CALL'&&e.attempt)this.row.resolution={...e.pipeline,rawASR:e.attempt.turn.text,reconstructed:e.attempt.parsed.candidates,databaseFixtureCandidates:e.attempt.resolution.databaseCandidates,finalResolution:e.attempt.resolution,confirmationStatus:e.confirmation?'OWNED_RECIPIENT_CONFIRMATION':'NOT_CONFIRMED',correctionOf:e.attempt.correctionOf??null,sourceTurnId:e.attempt.turn.id,candidateRevision:e.attempt.revision};}
 private audit=(e:SourceAudit)=>{
  if(this.row.events.length>=3900){this.fail('Evidence retention full; stop and export');return;}
  this.row.events.push(structuredClone(e));
  if(e.event==='transcriptFinal')queueMicrotask(()=>{void this.session.settled().then(()=>{this.retain();this.changed();}).catch(error=>this.fail(error instanceof Error?error.message:'Session final processing failed'));});
  if(e.event==='transcriptFinal'&&typeof e.data.text==='string'&&(this.row.kind==='EMAIL_RECOVERY'||['email','correction'].includes(this.row.testId))){void inspectCapturedEmail(e.data.text,this.fixture,this.row.id).then(r=>{this.row.resolution=r;this.retain();this.changed();}).catch(error=>this.fail(error instanceof Error?error.message:'Email diagnostic failed'));}
  this.retain();this.changed();
 };
 private fail=(reason:string)=>{this.row.error=reason;this.row.verdict='FAIL';this.row.comment||='Physical readiness/capture failed: '+reason;this.stop();};
 async start(){
  try{
   const response=await fetch('/api/c31/health',{cache:'no-store'});if(!response.ok)throw new Error('Backend health HTTP '+response.status);this.row.backend=await response.json();
   if(!this.gate.backendResult(this.row.backend))throw new Error(this.row.backend.configured?'Wrong backend/origin':'MISSING_CREDENTIAL: no authorized ASR key supplied locally');
   const armed=await fetch('/api/package/arm-asr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({manualStart:true})});if(!armed.ok)throw new Error('ASR manual start unavailable (HTTP '+armed.status+')');
   const input=new IsolatedMicrophone((event,data)=>this.audit({event,callId:this.row.id,at:performance.now(),data:data??{}}));
   // Same microphone, same PCM callback/settings. UI RMS only; no additional capture or audio retention.
   const meter={prepare:async(...args:Parameters<IsolatedMicrophone['prepare']>)=>{const [device,pcm,failed]=args;await input.prepare(device,(bytes,timing)=>{const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let sum=0;for(let i=0;i+1<bytes.length;i+=2)sum+=(view.getInt16(i,true)/32768)**2;this.inputLevel=Math.sqrt(sum/Math.max(1,bytes.length/2));pcm(bytes,timing);},failed);},enable:(v:boolean)=>input.enable(v),cancel:()=>{this.inputLevel=0;input.cancel();}};
   this.mic=prepareC32Recognition(this.session,this.gate,this.diagnostics,this.audit,e=>this.fail(e.message),()=>performance.now(),undefined,meter);
   await this.mic.start();if(this.row.error)return;
   if(this.row.kind==='NATURAL_CALL')await this.session.approvePlayback('opening');
  }catch(error){this.fail(error instanceof Error?error.message:'Physical test unavailable');}
  this.retain();this.changed();
 }
 stop(){if(this.stopping||this.row.endedAt)return;this.stopping=true;this.mic?.stop();this.row.endedAt=new Date().toISOString();this.row.elapsedSeconds=(performance.now()-this.began)/1000;this.retain();this.stopping=false;this.changed();}
 verifyTarget(){this.session.setRecipient('TARGET_HCP','Reviewer explicitly attests the local target-HCP role',true);}
 receptionist(reviewer:string){this.session.setRecipient('INTERMEDIARY','Reviewer explicitly attests local receptionist role');this.session.bindName({original:'Jens Hansen',source:'contact-data',evidenceId:'synthetic:local-target',evidenceText:'Local fixture target Jens Hansen',reviewedBy:reviewer,reviewedAt:new Date().toISOString(),pronunciationConfirmed:true,recipientRevision:this.session.snapshot().recipientRevision});}
 reviewConsent(verdict:'YES'|'NO'|'UNCLEAR',reviewer:string){const turn=this.session.snapshot().turns.at(-1);if(!turn)throw new Error('Await a provider final first');this.session.reviewConsent(turn.id,verdict,'Separate local operator review by '+reviewer);if(verdict==='YES')this.session.bindContactScope(fixtureScope(this.row.id,this.session.snapshot().recipientRevision,this.fixture));}
 async play(id:string){await this.session.approvePlayback(id);this.retain();this.changed();}
 async confirm(){await this.session.structuredEmail.confirmPrompt();this.retain();this.changed();}
 async complete(reviewer:string){await this.session.structuredEmail.completeLocalCall({reviewer,reason:'Reviewer checked actual owned recipient confirmation in local retest'});this.stop();}
 async dispose(){this.stop();this.session.dispose();await this.player.dispose();}
}
export function makeObservation(testId:string,kind:ReviewedObservation['kind'],expectedText:string,correctionOf:string|null=null):ReviewedObservation{return {id:'physical:'+crypto.randomUUID(),testId,kind,startedAt:new Date().toISOString(),endedAt:null,events:[],timingEvidence:[],backend:{},preflight:null,expectedText,meaningPreserved:null,reconstructionCorrect:null,correctionOwnershipCorrect:null,correctionOf,resolution:null,confirmationStatus:'NOT_CONFIRMED',error:null,verdict:'PENDING',comment:'',source:'PHYSICAL_MICROPHONE_LIFECYCLE',elapsedSeconds:null,sessionEvidence:null,finalState:null,takeover:null,consentOutcome:null,emailOutcome:null};}
