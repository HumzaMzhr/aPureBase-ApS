import { ConsentSession } from '../session';
import { OperationalClassifier } from '../approved/selector';
import { nextAction, dynamicDefinition, type NextAction } from '../dynamic/controller';
import { eligibleRecipient } from '../authority';
import { CachedAcceptancePlayback } from './cachedPlayback';
import { ListeningRegistry } from './listening';
import { durations, type Interval } from './timing';
import type { SourceAudit } from './recognition';
import type { LocalPlaybackEvent, LocalPlaybackPort } from '../approved/localPlayback';
import type { DynamicSpeechPort } from '../dynamic/port';
import type { ReviewAsset } from './catalog';
import type { Transcript } from '../types';
export function acceptanceNextAction(session:ConsentSession):NextAction {
 const s=session.snapshot(),last=s.turns.at(-1);
 if(s.state==='CONSENT_UNCLEAR'&&s.recipientType==='INTERMEDIARY'&&!s.fallbackReason){
  if(eligibleRecipient(s)&&last?.classification.confidence===1&&['AFFIRMATIVE','AMBIGUOUS'].includes(last.classification.intent)&&session.responses().some(r=>r.id==='intermediary-consent-question'))return {kind:'PLAY',phraseId:'intermediary-consent-question',label:'Approve a fresh complete named consent question; prior YES remains ineligible'};
  return{kind:'TAKEOVER',label:'No safe deterministic intermediary retry: current authority/source evidence is insufficient'};
 }
 const action=nextAction(session);
 if(action.kind==='WAIT'&&!s.state.startsWith('END_')&&s.state!=='HUMAN_TAKEOVER'&&action.label==='Current evidence/state does not authorize a response.')return{kind:'TAKEOVER',label:'No safe approved response in current state'};
 return action;
}
export class C3Classifier extends OperationalClassifier {
 override classify(t:Transcript){if(t.final&&/^(gentag venligst|kan du gentage spørgsmålet)[.!?]?$/iu.test(t.text.trim()))return{intent:'AMBIGUOUS' as const,confidence:1,basis:'Complete repeat request; never affirmative consent',classifierVersion:'da-c3-repeat-route-1'};return super.classify(t);}
}
export class PhysicalRehearsal {
 readonly session:ConsentSession;readonly player:CachedAcceptancePlayback;events:SourceAudit[]=[];outputs:{asset:ReviewAsset;event:LocalPlaybackEvent;at:number}[]=[];pauses:Interval[]=[];private pausedAt?:number;private openingStartedAt?:number;private terminalAt?:number;private starts=new Map<string,number>();private sourceStarts=new Map<string,number>();private sourceIntervals:Interval[]=[];private createdAt:number;
 stopRecognition=()=>{};
 constructor(readonly scenarioId:string,readonly category:string,registry:ListeningRegistry,private changed:()=>void,private now=()=>performance.now(),testPort?:LocalPlaybackPort&DynamicSpeechPort){
  this.createdAt=now();this.player=new CachedAcceptancePlayback(registry,(a,e)=>this.output(a,e));
  const port=testPort??this.player;
  this.session=new ConsentSession(crypto.randomUUID(),{now:this.now,localPlayback:port,dynamicSpeech:port,classifier:new C3Classifier(),stopTranscription:()=>this.stopRecognition()},dynamicDefinition);
  this.session.subscribe(()=>{const s=this.session.snapshot();if((s.state.startsWith('END_')||s.state==='HUMAN_TAKEOVER')&&this.terminalAt===undefined)this.terminalAt=this.now();this.changed();});
 }
 private output(asset:ReviewAsset,event:LocalPlaybackEvent){const at=this.now();this.outputs.push({asset,event:structuredClone(event),at});if(event.action==='start'){this.starts.set(event.playbackId,at);if(asset.phraseId==='opening'&&this.openingStartedAt===undefined)this.openingStartedAt=at;}if(event.action==='fail')queueMicrotask(()=>this.fail('Output failed: '+(event.error??'No actual completion')));this.changed();}
 audit(e:SourceAudit){if(this.events.length>=3900){this.fail('C-3 source evidence retention limit; export before continuing.');return;}this.events.push(structuredClone(e));if(e.event==='speechStarted'&&e.turnId&&typeof e.data.speechStartedAt==='number')this.sourceStarts.set(e.turnId,e.data.speechStartedAt);if(e.event==='speechEnded'&&e.turnId&&typeof e.data.speechEndedAt==='number'){const start=this.sourceStarts.get(e.turnId);if(start!==undefined)this.sourceIntervals.push({start,end:e.data.speechEndedAt});}this.changed();}
 receiveManual(text:string,final:boolean,onset?:{id:string;at:number;owner?:string}){const id=onset?.id??crypto.randomUUID(),at=this.now();this.events.push({event:final?'manual.final':'manual.partial',callId:this.session.snapshot().callId,turnId:id,at,data:{text,source:'MANUAL_SIMULATION',speechStartedAt:onset?.at,answerPlaybackId:onset?.owner}});this.session.receive({id,text,final,source:'manual-rehearsal',observedAt:at,speechStartedAt:onset?.at,answerPlaybackId:onset?.owner});}
 markManualOnset(){const s=this.session.snapshot();const o={id:crypto.randomUUID(),at:this.now(),owner:this.session.confirmationPlaybackId()??(s.answerWindow?.status==='OPEN'?s.answerWindow.playbackId:s.activePlaybackId)};this.receiveManual('',false,o);return o;}
 async playNext(){if(this.pausedAt!==undefined)throw new Error('Debug pause active.');const a=acceptanceNextAction(this.session);if(a.kind==='TAKEOVER'){this.fail(a.label);return;}try{if(a.kind==='PLAY')await this.session.approvePlayback(a.phraseId);else if(a.kind==='READBACK')await this.session.readbackEmail();else throw new Error('Complete the explicit operator evidence action first.');}catch(e){this.fail(e instanceof Error?e.message:'Playback failed');throw e;}}
 async repeatQuestion(){const s=this.session.snapshot();if(!['CONSENT_ASK','CONSENT_UNCLEAR'].includes(s.state)||!eligibleRecipient(s))throw new Error('Fresh question requires current eligible recipient/authority.');await this.session.approvePlayback(s.recipientType==='INTERMEDIARY'?'intermediary-consent-question':'consent-question');}
 pause(){if(this.pausedAt!==undefined)throw new Error('Already paused');this.pausedAt=this.now();this.audit({event:'debug.pause_started',callId:this.session.snapshot().callId,at:this.pausedAt,data:{}});}
 resume(){if(this.pausedAt===undefined)return;this.pauses.push({start:this.pausedAt,end:this.now()});this.pausedAt=undefined;this.changed();}
 fail(reason:string){const s=this.session.snapshot();if(!s.state.startsWith('END_')&&s.state!=='HUMAN_TAKEOVER')this.session.takeover(reason);}
 export(){
  const end=this.terminalAt??this.now(),intervals:Interval[]=[];let rendered=0;
  for(const o of this.outputs){if(['complete','interrupt','fail'].includes(o.event.action)){const start=this.starts.get(o.event.playbackId);if(start!==undefined){intervals.push({start,end:o.at});rendered+=o.event.action==='complete'?o.asset.duration*1000:Math.min(o.asset.duration*1000,o.at-start);}}}
  const provider=this.events.some(e=>e.event==='speechStarted'),manual=this.events.some(e=>e.event.startsWith('manual.'));
  return{version:'stage-2.0c3-1',scenarioId:this.scenarioId,category:this.category,createdAt:this.createdAt,clock:'browser-performance.now',session:this.session.exportReview(),sourceEvidence:structuredClone(this.events),outputEvidence:structuredClone(this.outputs),duration:durations({openingStartedAt:this.openingStartedAt,terminalAt:this.terminalAt,outputIntervals:intervals,recipientIntervals:this.sourceIntervals,recipientEvidence:provider&&!manual?'MICROPHONE_LOCAL_VAD':manual?'MANUAL_SIMULATION':'NONE',debugPauses:[...this.pauses,...(this.pausedAt!==undefined?[{start:this.pausedAt,end}]:[])],renderedIsabellaMs:rendered}),completed:this.terminalAt!==undefined,microphoneCaptureObserved:this.events.some(e=>e.event==='microphone.capture_ready'),asrFinalsObserved:this.events.filter(e=>e.event==='transcriptFinal').length,mixedManualAndMicrophone:provider&&manual,sourceAudioStored:false,telephoneVerified:false,humanListeningInferred:false,takeover:{transportTransferred:false,operatorMustManuallyStartInterpreter:true}};
 }
 dispose(){this.stopRecognition();this.session.dispose();void this.player.dispose();}
}
