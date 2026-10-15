import {AcousticTiming,type AcousticSnapshot,type CaptureTiming} from './acousticTiming';
import {GapTimeline,type AudioTrace,type GapTrace} from './audioDiagnostics';
import type {Language} from '../types';
import {opening} from '../config/phrases';
import {percentile} from '../latency';
import {TrailingMonitor,type TrailingSample,type PlaybackPosition} from './trailing';
import {IsolatedMicrophone} from './input';
import {LocalOutput} from './localOutput';
import {RecognitionDirection} from './recognition';
import {ContinuousRecognitionDirection,type RecognitionPosition} from './continuousRecognition';
import type {AudioInputSource,TranslatedAudioOutput,TranslatedPcmOutput} from './audioInterfaces';
import {RealtimeTranslationTrial} from './realtimeTranslationClient';
import {StreamingInterpreter,type InterpreterIO} from './engine';
import {translateLocalControlledTurn,translateUnit} from './translationClient';
import {emptyLane,unitMetrics,type StreamingSnapshot} from './types';
import type {StreamingOptions} from './host';
import type {PlaybackHooks} from './scheduler';

export type LocalPath='realtime'|'semantic'|'direct';
export interface LocalOptions extends StreamingOptions {source:Language;path:LocalPath;prosodyMs?:number;cachedOpening:boolean}
export interface LocalSnapshot extends StreamingSnapshot {
 active:boolean;path:LocalPath;acoustic?:AcousticSnapshot;trailing?:TrailingMonitor['summary'];trailingSamples?:TrailingSample[];lastSourceSpeechAt?:number;controlled:boolean;sourceOnset?:number;firstAudioMs?:number;firstPlaybackMs?:number;queuedMs?:number;
 audioTrace?:AudioTrace[];gaps?:GapTrace[];events:{at:number;type:string;detail:string}[];
 recognition?:RecognitionPosition;positions?:Partial<PlaybackPosition>&{sourceSamples?:number;asrObservedWords?:number;translationSourceWords:number;ttsCharacters?:number;targetSamples?:number;playbackSamples?:number};
}
export const emptyLocal=():LocalSnapshot=>({state:'READY',lanes:{en:emptyLane(),da:emptyLane()},error:'',warning:'',bargeIns:[],active:false,path:'realtime',controlled:false,events:[]});
type Microphone=AudioInputSource;
type Recognition=Pick<RecognitionDirection,'open'|'feed'|'finish'|'cancel'>;
type Direct=Pick<RealtimeTranslationTrial,'open'|'append'|'finish'|'close'>;
type OutputDevice=TranslatedAudioOutput;
/** Dependencies can be replaced by offline tests; defaults are the existing Stage 1.7 components. */
export interface LocalDependencies {
 microphone?:()=>Microphone;
 output?:(source:Language,jitter:number,hooks:PlaybackHooks)=>OutputDevice;
 recognition?:(source:Language,engine:StreamingInterpreter,signal:AbortSignal,silence:number,failed:(e:Error)=>void)=>Recognition;
 continuousRecognition?:(source:Language,engine:StreamingInterpreter,signal:AbortSignal,silence:number,failed:(e:Error)=>void,progress:(position:RecognitionPosition)=>void)=>Recognition;
 direct?:(audio:(bytes:Uint8Array)=>void,caption:(lane:'source'|'target',text:string)=>void,failed:(e:Error)=>void)=>Direct;
 translate?:InterpreterIO['translate'];now?:()=>number;
}
export function localMetrics(snapshot:LocalSnapshot,source:Language){
 const lags=snapshot.lanes[source].units.map(u=>unitMetrics(u.timing).sourceToTargetLag).filter((n):n is number=>n!==undefined);
 return{timeToFirstTranslatedAudio:snapshot.firstPlaybackMs,firstTranslatedPcm:snapshot.firstAudioMs,currentLag:snapshot.path==='direct'?undefined:snapshot.lag,medianLag:percentile(lags,.5),p95Lag:percentile(lags,.95),samples:lags.length};
}
export class LocalTestSession {
 snapshot:LocalSnapshot=emptyLocal();
 private abort=new AbortController();private microphone:Microphone;private output:OutputDevice;private engine:StreamingInterpreter;private recognition?:Recognition;private direct?:Direct;private renderer?:TranslatedPcmOutput;private timer?:ReturnType<typeof setInterval>;private paused=false;private preparing=false;private ended=false;private finishing=false;private directSamples=0;
 private acoustic:AcousticTiming;
 private gapTimeline=new GapTimeline(gap=>{this.snapshot.events=[...this.snapshot.events,{at:this.now(),type:'GAP',detail:JSON.stringify(gap)}].slice(-200);});private now:()=>number;private trailingMonitor=new TrailingMonitor();private sampleBase=0;private playedBase=0;
 constructor(private options:LocalOptions,private changed:(state:LocalSnapshot)=>void,deps:LocalDependencies={}){
  if(options.path==='direct'&&options.source==='en')throw new Error('OpenAI Danish audio is disabled. Use REALTIME INTERPRETER with ElevenLabs Isabella.');
  if(options.path==='direct'&&options.forceControlled)throw new Error('Direct translation cannot use controlled handling.');
  if(options.cachedOpening&&options.source!=='en')throw new Error('Cached Danish opening requires English → Danish.');
  this.now=deps.now??(()=>performance.now());this.acoustic=new AcousticTiming(this.now,options.source==='en'?450:1350);
  this.snapshot.path=options.path;this.snapshot.controlled=options.forceControlled;
  this.microphone=deps.microphone?.()??new IsolatedMicrophone();
  const hooks:PlaybackHooks={measurement:event=>{if(!this.preparing)this.acoustic.playback(event);},audit:event=>{if(event.type==='ELEVENLABS_TEXT_SENT'&&Array.isArray(event.unitIds))this.acoustic.textSent(event.unitIds as string[],event.at);this.snapshot.audioTrace??=[];this.snapshot.audioTrace.push(event);if(this.snapshot.audioTrace.length>4096)this.snapshot.audioTrace.shift();if(event.type!=='HCP_OUTPUT_DA_PCM')this.event(event.type,JSON.stringify(event));},progress:(id,fraction)=>this.engine.playbackPosition(id,fraction),failed:this.fail,voiceIdentity:voice=>this.event('verified voice',JSON.stringify(voice)),firstAudio:(id,at)=>{this.engine.playback(id,'firstAudio',at);if(this.snapshot.sourceOnset!==undefined)this.snapshot.firstAudioMs??=at-this.snapshot.sourceOnset;this.emit();},scheduled:(id,at)=>this.engine.playback(id,'scheduled',at),started:(id,at)=>{this.engine.playback(id,'started',at);if(this.snapshot.sourceOnset!==undefined)this.snapshot.firstPlaybackMs??=at-this.snapshot.sourceOnset;this.event('target playback',id);},finished:(id,at)=>this.engine.playback(id,'finished',at),underrun:ms=>{this.snapshot.warning='Output underrun observed. Human listening review required.';this.event('underrun',`${Math.round(ms)} ms`);}};
  this.output=deps.output?.(options.source,options.jitterMs,hooks)??new LocalOutput(options.source,options.jitterMs,hooks,{quality:options.path==='realtime',simultaneous:options.path==='realtime',prosodyMs:options.prosodyMs??250});
  this.engine=new StreamingInterpreter({now:this.now,translate:deps.translate??(options.forceControlled?translateLocalControlledTurn:translateUnit),output:async(language,turn,signal)=>{
   if(language!==options.source)throw new Error('Local direction isolation violation.');
   if(!options.forceControlled)return this.output.open(language,turn,signal);
   this.microphone.enable(false);
   const output=await this.output.controlled(language,turn,signal);
   return{send:output.send,cancel:output.cancel,finish:async()=>{await output.finish();await new Promise<void>(r=>setTimeout(r,180));signal.throwIfAborted();if(!this.paused){this.microphone.enable(true);this.engine.listening(options.source);}}};
  },pauseInput:language=>{if(language===options.source){this.paused=true;this.microphone.enable(false);}},failed:options.path==='realtime'?this.fail:undefined},state=>{this.snapshot={...this.snapshot,...state};this.emit();},{...options,scopedPrecision:options.path==='realtime',simultaneous:options.path==='realtime'&&!options.forceControlled});
  if(options.path==='realtime'){
   const progress=(position:RecognitionPosition)=>{this.snapshot.recognition=position;this.emit();};
   this.recognition=deps.continuousRecognition?.(options.source,this.engine,this.abort.signal,options.source==='en'?450:1350,this.fail,progress)??new ContinuousRecognitionDirection(options.source,this.engine,this.abort.signal,options.source==='en'?450:1350,this.fail,undefined,progress,options.protectedTerms);
  }
  else if(options.path==='semantic')this.recognition=deps.recognition?.(options.source,this.engine,this.abort.signal,options.source==='en'?450:1350,this.fail)??new RecognitionDirection(options.source,this.engine,this.abort.signal,options.source==='en'?450:1350,this.fail);
  else this.direct=deps.direct?.(this.directAudio,this.caption,this.fail)??new RealtimeTranslationTrial(this.directAudio,this.caption,this.fail);
 }
 private emit(){if(this.options.path==='realtime'){if(this.snapshot.active&&!this.ended&&this.snapshot.lastSourceSpeechAt!==undefined&&this.snapshot.lanes[this.options.source].sourceFinished!==undefined&&!this.engine.hasActiveSource&&!(this.snapshot.recognition?.pendingFinals??0)&&this.now()-this.snapshot.lastSourceSpeechAt>=(this.options.source==='en'?450:1350))this.trailingMonitor.sourceEnded(this.snapshot.lastSourceSpeechAt);this.trailingMonitor.update(this.snapshot.lanes[this.options.source],this.snapshot.sourceOnset,this.snapshot.lastSourceSpeechAt,this.now(),this.output?.positions??{ttsCharacters:0,targetSamples:0,playbackSamples:0},this.snapshot.recognition?.pendingFinals??0);this.snapshot.trailing=this.trailingMonitor.summary;}this.snapshot.positions={sourceSamples:this.snapshot.recognition?.sourceSamples,asrObservedWords:this.snapshot.recognition?.asrObservedWords,translationSourceWords:this.snapshot.lanes[this.options.source].translatedWords,...this.output?.positions,targetSamples:(this.output?.positions?.targetSamples??0)-this.sampleBase,playbackSamples:(this.output?.positions?.playbackSamples??0)-this.playedBase};if(this.snapshot.active&&!this.ended)this.gapTimeline.update(this.snapshot.lanes[this.options.source],this.output?.positions,this.now(),this.snapshot.lastSourceSpeechAt!==undefined&&this.now()-this.snapshot.lastSourceSpeechAt<=250,this.snapshot.recognition?.pendingFinals,this.snapshot.trailing?.latest?.playbackPosition);this.snapshot.gaps=this.gapTimeline.records.map(g=>({...g,causes:[...g.causes]}));this.updateAcoustic();this.changed({...this.snapshot,events:[...this.snapshot.events]});}
 private updateAcoustic(){const sourceFinalized=!this.engine?.hasActiveSource&&!(this.snapshot.recognition?.pendingFinals??0);this.snapshot.acoustic=this.acoustic.snapshot(this.snapshot.lanes[this.options.source].units,sourceFinalized&&Boolean(this.engine?.idle),sourceFinalized);}
 private event(type:string,detail:string){this.snapshot.events=[...this.snapshot.events,{at:this.now(),type,detail}].slice(-200);this.emit();}
 private fail=(error:Error)=>{if(this.ended||this.abort.signal.aborted)return;this.end();this.snapshot.state='ERROR';this.snapshot.error=error.message;this.event('error',error.message);};
 private capture=(bytes:Uint8Array,timing?:CaptureTiming)=>{
  if(this.ended||this.paused||!this.snapshot.active||this.preparing)return;
  try{
   if(bytes.length%2)throw new Error('Incomplete microphone sample.');
   const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let energy=0;
   for(let i=0;i<bytes.length;i+=2)energy+=(view.getInt16(i,true)/32768)**2;
   if(bytes.length&&Math.sqrt(energy/(bytes.length/2))>=.018){this.snapshot.lastSourceSpeechAt=this.now();this.trailingMonitor.sourceAdvanced(this.snapshot.lastSourceSpeechAt);}
   if(bytes.length&&Math.sqrt(energy/(bytes.length/2))>=.018&&this.snapshot.sourceOnset===undefined){this.snapshot.sourceOnset=this.now();this.event('source onset',this.options.source);}
   // The only source-PCM destinations are recognition or the translation provider.
   if(this.direct)this.direct.append(bytes);else this.recognition!.feed(bytes);
   this.acoustic.source(bytes,timing);
  }catch(error){this.fail(error instanceof Error?error:new Error('Microphone processing failed.'));}
 };
 private directAudio=(bytes:Uint8Array)=>{
  if(this.ended||this.abort.signal.aborted||!this.renderer)return;
  try{this.directSamples+=Math.floor(bytes.length/2);this.renderer.mark('direct-target',0,this.directSamples,false);this.renderer.push(bytes);this.event('translated PCM chunk',`${bytes.length} bytes`);}
  catch(error){this.fail(error instanceof Error?error:new Error('Translated playback failed.'));}
 };
 private caption=(kind:'source'|'target',text:string)=>{
  if(this.ended||this.abort.signal.aborted)return;
  const lane=this.snapshot.lanes[this.options.source];lane[kind]+=text;this.event(`${kind} caption`,text);
 };
 async prepare(){
  if(this.preparing||this.snapshot.active||this.ended)throw new Error('Start a new local test session.');
  this.preparing=true;this.snapshot.active=true;this.snapshot.state='OPENING';this.event('prepare',`${this.options.source} · ${this.options.path}`);
  try{
   // Promise.allSettled waits for a late permission grant before final cleanup on setup failure.
   const preparations=await Promise.allSettled([this.output.prepare(this.options.output,this.abort.signal),this.microphone.prepare(this.options.microphone,this.capture,this.fail)]);
   const failure=preparations.find(p=>p.status==='rejected');if(failure?.status==='rejected')throw failure.reason;
   this.abort.signal.throwIfAborted();
   if(this.options.cachedOpening){await this.output.opening(this.abort.signal);this.abort.signal.throwIfAborted();this.engine.cached('opening',opening.en,opening.da);this.event('cached opening','Excluded from translation latency');}
   this.sampleBase=this.output.positions?.targetSamples??0;this.playedBase=this.output.positions?.playbackSamples??0;
   if(this.direct){this.renderer=this.output.renderer();await this.direct.open(this.options.source,this.abort.signal);}
   else await this.recognition!.open();
   this.abort.signal.throwIfAborted();this.preparing=false;
   if(this.direct){this.snapshot.state='LISTENING';this.timer=setInterval(()=>{this.snapshot.queuedMs=this.renderer?.queuedMs;this.emit();},100);}
   else{this.engine.start();this.engine.listening(this.options.source);}
   this.microphone.enable(true);this.event('listening',this.options.source);
  }catch(error){this.preparing=false;if(!this.ended)this.fail(error instanceof Error?error:new Error('Local test setup failed.'));else{this.microphone.cancel();this.output.cancel();}throw error;}
 }
 async finish(){
  if(!this.snapshot.active||this.preparing||this.ended||this.finishing)return;
  this.finishing=true;
  try{
   await this.microphone.checkpoint();this.abort.signal.throwIfAborted();if(this.snapshot.lastSourceSpeechAt!==undefined)this.trailingMonitor.sourceEnded(this.snapshot.lastSourceSpeechAt);
   if(this.direct){this.microphone.enable(false);await this.direct.finish();this.abort.signal.throwIfAborted();this.renderer!.mark('direct-target',0,this.directSamples,true);await this.renderer!.finish();this.abort.signal.throwIfAborted();this.event('direct drain','Translated output complete');this.end();}
   else{if(this.options.path==='realtime')this.microphone.enable(false);await this.recognition!.finish();this.abort.signal.throwIfAborted();if(this.options.path==='realtime'&&!this.paused)this.microphone.enable(true);}
  }catch(error){if(!this.ended)this.fail(error instanceof Error?error:new Error('Finalization failed.'));throw error;}
  finally{this.finishing=false;}
 }
 end(){
  if(this.ended)return;this.updateAcoustic();this.acoustic.stop();this.ended=true;this.snapshot.active=false;this.abort.abort();clearInterval(this.timer);
  if(this.options.path!=='direct')this.engine.end();
  this.microphone.cancel();this.recognition?.cancel();this.direct?.close();this.renderer?.cancel();this.output.cancel();
  this.gapTimeline.close(this.now());this.snapshot.trailingSamples=[...this.trailingMonitor.samples];this.snapshot.state='READY';this.event('stop','Microphone and target output stopped; no source replay');
 }
 get idle(){return this.engine.idle;}
}
