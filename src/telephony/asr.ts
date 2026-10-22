import {DanishTranscriptAdapter,type DanishTranscriptionPort} from '../consent/transcription';
import type {RecognitionEvent} from '../streaming/continuousTranscriptionClient';
import type {StructuredEmailSession} from '../consent/stage32/session';
import type {Transcript} from '../consent/types';
import type {InboundMedia,Clock} from './types';
import type {CallTranscript} from './transcriptBridge';
export type AsrFactory=(event:(e:RecognitionEvent)=>void,error:(e:Error)=>void)=>DanishTranscriptionPort;
type Boundary={id:string;start:number;end?:number;owner?:string;revision:number;final:boolean};
/** Same Danish adapter, 24k PCM, .012 local RMS VAD and 800ms endpoint policy as microphone.
 * Provider media offsets are mapped once to the call monotonic clock. No raw audio retained. */
export class TelephoneRecognition {
 private adapter:DanishTranscriptAdapter;private enabled=false;private abort=new AbortController();private generation=0;private voiced=false;private lastVoice=0;private anchor?:number;private bounds=new Map<number,Boundary>();private instance=crypto.randomUUID();
 readonly diagnostics:{event:string;at:number;generation:number;owner?:string;start?:number;end?:number}[]=[];
 constructor(private session:StructuredEmailSession,private transcript:CallTranscript,private clock:Clock,factory:AsrFactory,private failed:(e:Error)=>void,private afterSource:()=>void=()=>{}){this.adapter=new DanishTranscriptAdapter(t=>this.receive(t),e=>this.fail(e),factory,()=>clock.now());}
 async start(){if(this.enabled)throw new Error('ASR already started');this.enabled=true;try{await this.adapter.start(this.abort.signal);}catch(e){this.fail(e instanceof Error?e:new Error('ASR failed'));throw e;}}
 append(m:InboundMedia){if(!this.enabled)return;try{if(m.callId!==this.session.snapshot().callId||!m.pcm24k.length||m.pcm24k.length%2)throw new Error('Invalid ASR media ownership/PCM');const duration=m.pcm24k.length/48;this.anchor??=this.clock.now()-m.providerTimestampMs-duration;const start=this.anchor+m.providerTimestampMs,end=start+duration;if(start<0||end>this.clock.now()+1)throw new Error('Invalid/future media timestamp');const v=new DataView(m.pcm24k.buffer,m.pcm24k.byteOffset,m.pcm24k.byteLength);let squares=0;for(let i=0;i<v.byteLength;i+=2)squares+=(v.getInt16(i,true)/32768)**2;const rms=Math.sqrt(squares/(v.byteLength/2));
  if(rms>=.012){if(!this.voiced){if(this.bounds.size>=200)throw new Error('ASR retention limit');this.voiced=true;const s=this.session.snapshot(),b:Boundary={id:`mic:telephone:${this.instance}:${this.generation}`,start,owner:this.session.confirmationPlaybackId()??(s.answerWindow?.status==='OPEN'?s.answerWindow.playbackId:s.playing?s.activePlaybackId:undefined),revision:s.recipientRevision,final:false};this.bounds.set(this.generation,b);this.diagnostics.push({event:'speechStarted',at:this.clock.now(),generation:this.generation,owner:b.owner,start});this.session.receive({id:b.id,text:'',final:false,source:'provider',observedAt:this.clock.now(),speechStartedAt:start,answerPlaybackId:b.owner});}this.lastVoice=end;}
  this.adapter.append(m.pcm24k);
  if(this.voiced&&end-this.lastVoice>=800){const b=this.bounds.get(this.generation)!;b.end=this.lastVoice;this.diagnostics.push({event:'speechEnded/commitRequested',at:this.clock.now(),generation:this.generation,owner:b.owner,start:b.start,end:b.end});this.adapter.commit(this.generation);this.generation++;this.voiced=false;}
 }catch(e){this.fail(e instanceof Error?e:new Error('ASR media failed'));}}
 private receive(t:Transcript){if(!this.enabled)return;const g=Number(t.id.split(':')[0]),b=this.bounds.get(g);if(b?.final)return;const owned={...t,id:b?.id??`unowned:${this.instance}:${t.id}`,speechStartedAt:b?.start,answerPlaybackId:b?.owner};if(t.final&&b)b.final=true;this.diagnostics.push({event:t.final?'providerFinal':'providerPartial',at:this.clock.now(),generation:g,owner:b?.owner,start:b?.start,end:b?.end});this.transcript.speech(owned);if(b&&b.revision!==this.session.snapshot().recipientRevision){this.diagnostics.push({event:'staleRecipientRevision',at:this.clock.now(),generation:g,owner:b.owner,start:b.start,end:b.end});return;}this.session.receive(owned);if(t.final)this.afterSource();}
 private fail(e:Error){if(!this.enabled)return;this.stop();this.failed(e);}
 stop(){this.enabled=false;this.adapter.stop();this.abort.abort();}
}
