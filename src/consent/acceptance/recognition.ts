import { DanishTranscriptAdapter, type DanishTranscriptionPort } from '../transcription';
import { ContinuousTranscription } from '../../streaming/continuousTranscriptionClient';
import { IsolatedMicrophone } from '../../streaming/input';
import type { RecognitionEvent } from '../../streaming/continuousTranscriptionClient';
import type { CaptureTiming } from '../../streaming/acousticTiming';
import type { ConsentSession } from '../session';
import type { Transcript } from '../types';
interface Boundary {turnId:string;start:number;end?:number;owner?:string;recipientRevision:number;committed:boolean;final:boolean}
export type SourceAudit={event:string;callId:string;turnId?:string;at:number;data:Record<string,unknown>};
/** C-3-only VAD/ownership bridge. Reuses unchanged microphone and Danish adapter.
 * No PCM retained; boundaries and raw transcripts only. Local VAD is not acoustic
 * word alignment or a calibrated provider confidence score. */
export class PhysicalRecognition {
 private adapter:DanishTranscriptAdapter;private microphone:Pick<IsolatedMicrophone,'prepare'|'enable'|'cancel'>;private abort?:AbortController;private generation=0;private voiced=false;private lastVoice=0;private boundaries=new Map<number,Boundary>();private instance=crypto.randomUUID();private enabled=false;
 constructor(private session:ConsentSession,private audit:(e:SourceAudit)=>void,private failed:(e:Error)=>void,private now=()=>performance.now(),factory?: (event:(e:RecognitionEvent)=>void,error:(e:Error)=>void)=>DanishTranscriptionPort,microphone?:Pick<IsolatedMicrophone,'prepare'|'enable'|'cancel'>){
  this.microphone=microphone??new IsolatedMicrophone((event,data)=>this.log(event,data??{}));this.adapter=new DanishTranscriptAdapter(turn=>this.receive(turn),e=>this.fail(e),factory??((event,error)=>new ContinuousTranscription(event,error,(event,data)=>this.log(event,data??{}))),now);
 }
 private log(event:string,data:Record<string,unknown>,turnId?:string){this.audit({event,callId:this.session.snapshot().callId,turnId,at:this.now(),data});}
 async start(){if(this.enabled)throw new Error('Microphone already active.');this.enabled=true;this.abort=new AbortController();this.log('microphone.permission_requested',{});try{await this.microphone.prepare('',(bytes,t)=>this.frame(bytes,t),e=>this.fail(e));if(!this.enabled)return;this.log('microphone.capture_ready',{actualGetUserMedia:true,pcmRetained:false});this.log('recognition.attempt',{provider:'existing Danish gateway',billing:'unknown until provider receipt'});await this.adapter.start(this.abort.signal);if(!this.enabled)return;this.microphone.enable(true);this.log('recognition.started',{language:'da',confidence:null,confidenceEvidence:'PROVIDER_CONFIDENCE_NOT_AVAILABLE',cost:'Provider usage begins only after explicit operator start'});}catch(e){this.fail(e instanceof Error?e:new Error('Microphone/ASR unavailable.'));}}
 frame(bytes:Uint8Array,t?:CaptureTiming){if(!this.enabled)return;try{const now=this.now();if(bytes.length%2||!bytes.length)throw new Error('Invalid microphone PCM.');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let squares=0;for(let i=0;i<bytes.length;i+=2)squares+=(view.getInt16(i,true)/32768)**2;const rms=Math.sqrt(squares/(bytes.length/2));const start=t&&Number.isFinite(t.startAt)&&t.startAt<=now?t.startAt:now,end=t&&Number.isFinite(t.endAt)&&t.endAt<=now?t.endAt:now;
   if(rms>=.012){if(!this.voiced){if(this.boundaries.size>=200)throw new Error('Source boundary retention full; export and stop.');this.voiced=true;const s=this.session.snapshot(),owner=this.session.confirmationPlaybackId()??(s.answerWindow?.status==='OPEN'?s.answerWindow.playbackId:s.playbacks.at(-1)?.state==='PLAYING'||s.playbacks.at(-1)?.state==='QUEUED'?s.activePlaybackId:undefined);const b:Boundary={turnId:`mic:${this.instance}:${this.generation}`,start,owner,recipientRevision:s.recipientRevision,committed:false,final:false};this.boundaries.set(this.generation,b);this.log('speechStarted',{generation:this.generation,speechStartedAt:start,answerPlaybackId:owner,recipientRevision:s.recipientRevision,evidence:'MICROPHONE_LOCAL_VAD',rms,captureFrameStart:t?.frameStart,captureFrameEnd:t?.frameEnd,captureTimingAvailable:!!t},b.turnId);this.session.receive({id:b.turnId,text:'',final:false,source:'provider',observedAt:now,speechStartedAt:start,answerPlaybackId:owner});}this.lastVoice=end;}
   this.adapter.append(bytes);
   if(this.voiced&&end-this.lastVoice>=800){const b=this.boundaries.get(this.generation)!;b.end=this.lastVoice;b.committed=true;this.log('speechEnded',{generation:this.generation,speechEndedAt:b.end,evidence:'MICROPHONE_LOCAL_VAD'},b.turnId);this.adapter.commit(this.generation);this.log('recognition.commit_requested',{generation:this.generation},b.turnId);this.generation++;this.voiced=false;}
  }catch(e){this.fail(e instanceof Error?e:new Error('Capture failed.'));}}
 private receive(raw:Transcript){const generation=Number(raw.id.split(':')[0]),b=this.boundaries.get(generation);this.log(raw.final?'transcriptFinal':'transcriptPartial',{...raw,generation,confidence:null,evidenceStatus:b?'PROVIDER_TEXT_WITH_LOCAL_VAD':'NO_OWNED_ONSET',speechStartedAt:b?.start,speechEndedAt:b?.end,answerPlaybackId:b?.owner},b?.turnId);
  if(b?.final)return;if(raw.final&&b)b.final=true;
  this.session.receive({...raw,id:b?.turnId??`unowned:${this.instance}:${raw.id}`,speechStartedAt:b?.start,answerPlaybackId:b?.owner});
 }
 private fail(e:Error){if(!this.enabled)return;this.log('recognition.failed',{reason:e.message});this.stop();this.failed(e);}
 stop(){this.enabled=false;this.microphone.cancel();this.adapter.stop();this.abort?.abort();this.abort=undefined;this.log('recognition.stopped',{audioStored:false});}
}
