import type { ListeningRegistry } from './listening';
import type { ReviewAsset } from './catalog';
export interface MediaBinding {callId:string;streamId:string;playbackId:string;phraseId:string;phraseVersion:string;textHash:string;audioHash:string;recipientRevision:number;epoch:number}
export type TelephoneEvent =
 | {type:'callConnected';callId:string;streamId:string;at:number;clock:string}
 | {type:'incomingAudio';callId:string;turnId:string;pcm:Uint8Array;sampleRate:number;at:number;clock:string}
 | {type:'speechStarted'|'speechEnded';callId:string;turnId:string;at:number;clock:string;answerPlaybackId?:string}
 | {type:'transcriptPartial'|'transcriptFinal';callId:string;turnId:string;text:string;at:number;clock:string;confidence:number|null;evidenceStatus:string;answerPlaybackId?:string}
 | {type:'outputStarted'|'outputInterrupted'|'outputFailed';binding:MediaBinding;at:number;clock:string;providerEventId:string}
 | {type:'outputCompleted';binding:MediaBinding;at:number;clock:string;providerEventId:string;proof:{kind:'TRANSPORT_RENDER_BOUNDARY';markId:string;disposition:'PLAYED';cleared:false}};
/** Stage 2.0D boundary only. No telephone/Twilio implementation exists in C-3. */
export interface TelephoneMediaAdapter {
 subscribe(receive:(event:TelephoneEvent)=>void):()=>void;
 queueOutput(input:{binding:MediaBinding;asset:ReviewAsset;bytes:Uint8Array},signal:AbortSignal):Promise<void>; // Submission only; not delivery.
 interruptOutput(binding:MediaBinding):void;
 hangup(callId:string):Promise<void>;
 transferToHuman(callId:string,retainedContext:unknown):Promise<{transportTransferConfirmed:boolean;providerEventId?:string}>;
}
export class TelephoneOutputLedger {
 private rows=new Map<string,{binding:MediaBinding;state:'QUEUED'|'PLAYING'|'COMPLETED'|'INTERRUPTED'|'FAILED';at:number}>();private events=new Set<string>();
 constructor(private registry:ListeningRegistry){}
 queue(binding:MediaBinding,asset:ReviewAsset,at:number){if(!this.registry.futureProductionListeningEligible(asset)||asset.assetHash!==binding.audioHash||asset.textHash!==binding.textHash||this.rows.has(binding.playbackId)||!Number.isFinite(at))throw new Error('Unreviewed/rejected/mismatched/duplicate telephone output blocked.');this.rows.set(binding.playbackId,{binding:structuredClone(binding),state:'QUEUED',at});}
 event(e:Extract<TelephoneEvent,{type:'outputStarted'|'outputInterrupted'|'outputFailed'|'outputCompleted'}>){
  if(!['outputStarted','outputCompleted','outputInterrupted','outputFailed'].includes(e.type))return false;
  const row=this.rows.get(e.binding.playbackId);if(!row||JSON.stringify(row.binding)!==JSON.stringify(e.binding)||!Number.isFinite(e.at)||e.at<row.at||e.clock!=='call-monotonic-ms'||!e.providerEventId||this.events.has(e.providerEventId)||['COMPLETED','INTERRUPTED','FAILED'].includes(row.state))return false;
  if(e.type==='outputCompleted'&&(row.state!=='PLAYING'||e.proof?.kind!=='TRANSPORT_RENDER_BOUNDARY'||e.proof.disposition!=='PLAYED'||e.proof.cleared!==false||!e.proof.markId))return false;
  if(e.type==='outputStarted'&&row.state!=='QUEUED')return false;
  row.state=e.type==='outputStarted'?'PLAYING':e.type==='outputCompleted'?'COMPLETED':e.type==='outputInterrupted'?'INTERRUPTED':'FAILED';row.at=e.at;this.events.add(e.providerEventId);return true;
 }
 interrupt(playbackId:string){const r=this.rows.get(playbackId);if(r&&['QUEUED','PLAYING'].includes(r.state))r.state='INTERRUPTED';}
 state(playbackId:string){return this.rows.get(playbackId)?.state;}
}
