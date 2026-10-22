import {observeDiagnostic,diagnosticReason,diagnosticText,type DiagnosticSink} from '../../src/streaming/sessionDiagnostics';
import type {Language} from '../../src/types';
import {EndOfTurn} from '../../src/browserAudio';
import {sourceWav} from '../../src/streaming/pcmWav';
import {words,uncertainProtectedTerm} from '../../src/streaming/semantic';
import {exactIdentityRequired} from '../../src/config/campaignSpeech';
import type {StreamingInterpreter} from '../../src/streaming/engine';
import {ContinuousTranscription,type RecognitionEvent} from '../../src/streaming/continuousTranscriptionClient';

interface Turn {generation:number;vad:EndOfTurn;chunks:Uint8Array[];bytes:number;start:number;firstVoice?:number;text:string;final?:string;committed:boolean;started:boolean;commitAt?:number}
export interface RecognitionPosition {sourceSamples:number;asrObservedWords:number;finalizedItems:number;pendingFinals:number;model:string;delay:string;pendingSource:string;recognizedSource?:string}
/** Continuous PCM goes straight to one persistent WS, including while earlier finals are pending.
 * Only bounded item text/source backups wait for ordered semantic processing; no reconnect audio queue. */
export class ContinuousRecognitionDirection {
 private transport:ContinuousTranscription;private turns=new Map<number,Turn>();private generation=0;private timer?:ReturnType<typeof setInterval>;
 private cancelled=false;private ready=false;private processing=false;private sourceSamples=0;private completedWords=0;private finalizedItems=0;private positionKey='';private rawCompleted='';private finishWaiters:{until:number;resolve:()=>void;reject:(e:Error)=>void}[]=[];
 constructor(private language:Language,private engine:StreamingInterpreter,private signal:AbortSignal,private silenceMs:number,private failed:(e:Error)=>void,private now=()=>performance.now(),private progress:(position:RecognitionPosition)=>void=()=>{},private protectedTerms:string[]=[],private trace?:DiagnosticSink){
  this.transport=new ContinuousTranscription(this.event,this.fail,this.trace?(event,data)=>this.diagnostic(event,data):undefined);this.turns.set(0,this.make(0));
 }
 private diagnostic(event:string,data:Record<string,unknown>={}){observeDiagnostic(this.trace,event,{currentGeneration:this.generation,pendingFinals:this.pendingFinals(),...data});}
 private make(generation:number):Turn{return{generation,vad:new EndOfTurn(this.silenceMs,false),chunks:[],bytes:0,start:this.now(),text:'',committed:false,started:false};}
 async open(){this.signal.throwIfAborted();await this.transport.open(this.language,this.signal);this.signal.throwIfAborted();this.ready=true;this.diagnostic('recognition.ready');this.timer=setInterval(()=>{
  if(this.cancelled)return;const current=this.turns.get(this.generation);
  if(current?.vad.started&&!current.committed&&this.now()-current.vad.lastVoice>=this.silenceMs)this.commit(current);
  for(const turn of this.turns.values())if(turn.final===undefined&&turn.commitAt!==undefined&&this.now()-turn.commitAt>30000){this.diagnostic('recognition.timeout_expired',{generation:turn.generation,timeoutMs:30000});this.fail(new Error('Realtime recognition finalization timed out. Retained transcript requires review.'));}
  this.positions();
 },50);this.positions();}
 private fail=(error:Error)=>{if(this.cancelled||this.signal.aborted)return;this.diagnostic('recognition.failed',{classification:diagnosticReason(error)});this.cancel(error);this.failed(error);};
 feed(bytes:Uint8Array,at=this.now()){
  if(this.cancelled||this.signal.aborted)return;
  try{
   if(!this.ready)throw new Error('Realtime recognition is not ready.');
   if(!bytes.length||bytes.length%2||bytes.length>24000)throw new Error('Invalid 24 kHz PCM16 microphone frame.');
   const turn=this.turns.get(this.generation)!;this.sourceSamples+=bytes.length/2;turn.bytes+=bytes.length;
   if(turn.bytes>20*1024*1024||this.sourceSamples*2>40*1024*1024)throw new Error('Source audio limit reached. Stop and export the retained transcript.');
   turn.chunks.push(bytes.slice());const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let energy=0;
   for(let i=0;i<bytes.length;i+=2)energy+=(view.getInt16(i,true)/32768)**2;
   const rms=Math.sqrt(energy/(bytes.length/2));if(rms>=.018)turn.firstVoice??=at;
   turn.vad.sample(at,rms);this.transport.append(bytes); // no waiting on translation, TTS or previous final
   if(turn.vad.started)this.activate();this.positions();
  }catch(error){this.fail(error instanceof Error?error:new Error('Realtime capture failed.'));}
 }
 private event=(event:RecognitionEvent)=>{
  if(this.cancelled||this.signal.aborted)return;
  const turn=this.turns.get(event.generation);this.diagnostic(`recognition.${event.type}`,{generation:event.generation,itemId:event.itemId,turnExists:Boolean(turn),committed:turn?.committed,alreadyFinal:turn?.final!==undefined,...diagnosticText(event.text)});if(!turn)return; // late duplicates cannot modify newer turns
  if(turn.final!==undefined)return; // terminal provider result, even while ordered semantic delivery waits
  if(event.type==='partial'){turn.text=event.text!;if(turn.firstVoice!==undefined&&!turn.vad.started)turn.vad.started=true;this.activate(true);}
  if(event.type==='final'){if(!turn.committed){this.fail(new Error('Recognition finalized an uncommitted source item. Restart required.'));return;}turn.final=event.text;void this.process();}
  this.positions();
 };
 private activate(update=false){
  const first=this.turns.values().next().value as Turn|undefined;if(!first)return;
  if(!first.started&&(first.vad.started||first.text)){first.started=true;this.engine.sourceStarted(this.language,first.firstVoice??first.start);}
  if(update&&first.started&&first.text)this.engine.partial(this.language,first.text);
 }
 private commit(turn:Turn){
  if(turn.committed||this.cancelled)return;
  try{
   // Completed later items may still be retained behind an earlier final. They
   // are not pending provider work and must not exhaust the three-final limit.
   if(this.pendingFinals()>=3)throw new Error('Recognition finalization is stalled. Interpretation stopped before audio could be lost; restart and review retained text.');
   if(turn.bytes<4800)return;
   turn.committed=true;turn.commitAt=this.now();this.diagnostic('recognition.commit',{generation:turn.generation,committed:true,partialCharacters:turn.text.length});this.diagnostic('recognition.timeout_started',{generation:turn.generation,timeoutMs:30000,deadlineAt:turn.commitAt+30000,clock:'browser-performance.now'});this.transport.commit(turn.generation);
   this.generation++;this.turns.set(this.generation,this.make(this.generation));this.positions();
  }catch(error){this.fail(error instanceof Error?error:new Error('Recognition commit failed.'));}
 }
 private async process(){
  if(this.processing||this.cancelled)return;this.processing=true;
  try{
   for(;;){const turn=this.turns.values().next().value as Turn|undefined;if(!turn||turn.final===undefined)break;
    this.activate(true);let text=turn.final;if(!text.trim()&&turn.text.trim())throw new Error('Recognition returned an empty final for retained source text. Review required.');
    if(exactIdentityRequired(text)&&uncertainProtectedTerm(text,['Humza','Pernille','Isabella','aPureBase',...this.protectedTerms])){
     const response=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'audio/wav','X-Source-Language':this.language},body:sourceWav(turn.chunks),signal:this.signal});
     if(!response.ok)throw new Error('Precision recognition unavailable. Review protected names before restarting.');text=(await response.json()).text;
     if(typeof text!=='string'||!text.trim())throw new Error('Precision recognition returned no source text.');
     if(uncertainProtectedTerm(text,['Humza','Pernille','Isabella','aPureBase',...this.protectedTerms])){this.engine.partial(this.language,text);throw new Error('Protected name remains uncertain after precision recognition. Review the retained source before restarting.');}
    }
    this.signal.throwIfAborted();if(this.cancelled)return;
    if(turn.started||text.trim())this.engine.finalized(this.language,text);this.diagnostic('recognition.semantic_finalized',{generation:turn.generation,committed:turn.committed,alreadyFinal:true,...diagnosticText(text)});this.completedWords+=words(text).length;this.finalizedItems++;this.rawCompleted=[this.rawCompleted,turn.final].filter(Boolean).join('\n').slice(-12000);
    this.turns.delete(turn.generation);turn.chunks=[];
    for(const waiter of this.finishWaiters.filter(w=>w.until<=turn.generation))waiter.resolve();this.finishWaiters=this.finishWaiters.filter(w=>w.until>turn.generation);
    this.activate(true);this.positions();
   }
  }catch(error){this.fail(error instanceof Error?error:new Error('Recognition finalization failed.'));}
  finally{this.processing=false;}
 }
 async finish(){
  if(this.cancelled)return;this.signal.throwIfAborted();const current=this.turns.get(this.generation)!;
  if(current.vad.started||current.text)this.commit(current);
  const until=this.generation-1;if(until<0||!this.turns.has(until))return;
  await new Promise<void>((resolve,reject)=>this.finishWaiters.push({until,resolve,reject}));this.signal.throwIfAborted();
 }
 private pendingFinals(){return [...this.turns.values()].filter(t=>t.committed&&t.final===undefined).length;}
 private positions(){const position={sourceSamples:this.sourceSamples,asrObservedWords:this.completedWords+[...this.turns.values()].reduce((n,t)=>n+words(t.text).length,0),finalizedItems:this.finalizedItems,pendingFinals:this.pendingFinals(),model:this.transport.model,delay:this.transport.delay,recognizedSource:[this.rawCompleted,...[...this.turns.values()].map(t=>t.final??t.text)].filter(Boolean).join('\n'),pendingSource:[...this.turns.values()].slice(1).map(t=>t.final??t.text).filter(Boolean).join('\n')};const key=JSON.stringify(position);if(key!==this.positionKey){this.positionKey=key;this.progress(position);}}
 cancel(error:Error=new DOMException('Recognition ended','AbortError')){if(this.cancelled)return;this.diagnostic('recognition.stop',{reason:diagnosticReason(error)});this.positions();this.cancelled=true;this.ready=false;clearInterval(this.timer);this.transport.close();for(const waiter of this.finishWaiters)waiter.reject(error);this.finishWaiters=[];this.turns.clear();}
}
