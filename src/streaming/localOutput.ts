import {VerifiedPcmSource,verifyCachedAudio} from './pcmProvenance';
import {opening} from '../config/phrases';
import {segmentTrace} from './audioDiagnostics';
import type {Language} from '../types';
import {targetLanguage,outputBus,type SemanticUnit} from './types';
import {AlignmentLedger} from './alignment';
import {ContinuousVoice} from './voiceClient';
import {ContinuousPcmScheduler,type PlaybackHooks} from './scheduler';
import {controlledOutput} from './controlledOutput';
import {assertDanishVoice,type VoiceIdentity} from './voiceIdentity';
import type {Output} from './engine';
import type {TranslatedAudioOutput,TranslatedPcmOutput} from './audioInterfaces';
export interface LocalOutputSettings {quality?:boolean;simultaneous?:boolean;prosodyMs?:number;selectOutput?:(context:AudioContext,device:string)=>Promise<void>;pcm?:(bytes:Uint8Array,renderer:ContinuousPcmScheduler)=>void}

/** Local evaluation owns only the selected target bus. Source capture has a separate, outputless graph. */
export class LocalOutput implements TranslatedAudioOutput {
 private context?:AudioContext;private voice?:VoiceIdentity;private cachedVoices:Record<string,VoiceIdentity>={};
 private owners=new Set<ContinuousPcmScheduler>();private ttsCharacters=0;private targetSamples=0;private playbackSamples=0;
 private lastAudibleAt?:number;private firstScheduledAt?:number;private voiceConnections=0;private underruns=0;private underrunMs=0;private cancellations=new Set<()=>void>();
 constructor(private source:Language,private jitter:number,private hooks:PlaybackHooks,private settings:LocalOutputSettings={}){}
 async prepare(sink:string,signal:AbortSignal){
  signal.throwIfAborted();
  const context=new AudioContext({sampleRate:24000});this.context=context;
  await context.resume();signal.throwIfAborted();
  const audio=context as AudioContext&{setSinkId?:(id:string)=>Promise<void>};
  if(this.settings.selectOutput)await this.settings.selectOutput(context,sink);
  else{if(sink&&!audio.setSinkId)throw new Error('Headphone selection requires Chrome setSinkId.');if(audio.setSinkId)await audio.setSinkId(sink);}
  signal.throwIfAborted();
  const response=await fetch('/api/health',{signal});
  if(!response.ok)throw new Error('Service unavailable.');
  const health=await response.json();
  if(!health.ready||health.missingAudio?.length)throw new Error('Service or cached phrases are not ready.');
  if(this.source==='en')assertDanishVoice(health.danishVoice);this.voice=Object.freeze({...health.danishVoice,requestId:undefined});this.cachedVoices=health.cachedVoices??{};
  signal.throwIfAborted();
 }
 renderer(){
  if(!this.context||this.owners.size)throw new Error('Local target output is unavailable or already owned.');
  const scheduler=new ContinuousPcmScheduler(this.context,this.source==='en'?'clinic':'agent',outputBus(this.source),this.jitter,this.hooks,undefined,this.source==='en'?this.voice:undefined,this.source==='en'&&Boolean(this.settings.simultaneous));
  this.owners.add(scheduler);return scheduler;
 }
 release(renderer:TranslatedPcmOutput){if(this.owners.has(renderer as ContinuousPcmScheduler)){const scheduler=renderer as ContinuousPcmScheduler;this.lastAudibleAt=scheduler.lastAudibleAt??this.lastAudibleAt;this.firstScheduledAt??=scheduler.firstScheduledAt;this.underruns+=scheduler.gaps.length;this.underrunMs+=scheduler.underrunMs;this.targetSamples+=scheduler.receivedPcmSamples;this.playbackSamples+=scheduler.playedPcmSamples;this.owners.delete(scheduler);}}
 get positions(){return{lastAudibleAt:[...this.owners].reduce((at,r)=>Math.max(at,r.lastAudibleAt??-Infinity),this.lastAudibleAt??-Infinity)>-Infinity?Math.max(this.lastAudibleAt??-Infinity,...[...this.owners].map(r=>r.lastAudibleAt??-Infinity)):undefined,firstScheduledAt:this.firstScheduledAt??[...this.owners].find(r=>r.firstScheduledAt!==undefined)?.firstScheduledAt,carryMs:[...this.owners].reduce((n,r)=>n+r.carryMs,0),bufferMs:[...this.owners].reduce((n,r)=>n+r.queuedMs,0),nextScheduledInMs:[...this.owners].reduce((n,r)=>Math.max(n,r.nextScheduledInMs??0),0),underruns:this.underruns+[...this.owners].reduce((n,r)=>n+r.gaps.length,0),underrunMs:this.underrunMs+[...this.owners].reduce((n,r)=>n+r.underrunMs,0),voiceConnections:this.voiceConnections,ttsCharacters:this.ttsCharacters,targetSamples:this.targetSamples+[...this.owners].reduce((n,r)=>n+r.receivedPcmSamples,0),playbackSamples:this.playbackSamples+[...this.owners].reduce((n,r)=>n+r.playedPcmSamples,0)};}
 async open(language:Language,_turn:number,signal:AbortSignal):Promise<Output>{
  if(language!==this.source)throw new Error('Local direction isolation violation.');
  signal.throwIfAborted();
  const scheduler=this.renderer(),ledger=new AlignmentLedger(),submittedUnits:SemanticUnit[]=[];let closed=false;
  this.voiceConnections++;const voice=new ContinuousVoice((bytes,alignment,voice)=>{
   if(closed||signal.aborted)return;if(this.source==='en')assertDanishVoice(voice,this.voice);
   for(const mark of ledger.consume(bytes,alignment))scheduler.mark(mark.id,mark.start,mark.end,mark.complete);
   if(this.source==='en')scheduler.authorizeRequest(voice!.requestId!);scheduler.push(bytes,voice);if(this.settings.simultaneous&&ledger.coverage)scheduler.flushPending();
   this.settings.pcm?.(bytes,scheduler);
  },this.settings.quality,this.settings.quality,error=>{scheduler.cancel();this.hooks.failed?.(error);},{simultaneous:this.settings.simultaneous,prosodyMs:this.settings.prosodyMs,expectedVoice:this.source==='en'?this.voice:undefined,queuedMs:()=>scheduler.queuedMs,trace:(type,data)=>this.hooks.audit?.({...data,...(type==='ELEVENLABS_TEXT_SENT'?{unitIds:submittedUnits.filter(u=>u.targetStart!<Number(data.sentCharacters)).map(u=>u.id)}:{}),type,at:performance.now()})});
  const release=()=>{this.release(scheduler);this.cancellations.delete(cancel);signal.removeEventListener('abort',cancel);};
  const cancel=()=>{if(closed)return;closed=true;voice.close();scheduler.cancel();release();};
  this.cancellations.add(cancel);signal.addEventListener('abort',cancel,{once:true});
  try{await voice.open(targetLanguage(language),signal);signal.throwIfAborted();}
  catch(error){cancel();throw error;}
  return{retainBetweenItems:Boolean(this.settings.simultaneous),get queuedMs(){return scheduler.queuedMs;},send:unit=>{signal.throwIfAborted();if(closed)throw new Error('Local output interrupted.');ledger.register(unit);submittedUnits.push(unit);if(this.source==='en')scheduler.traceSegment(segmentTrace(unit,this.voice!));voice.send(unit.target!);this.ttsCharacters+=unit.target!.length;},finish:async()=>{
   try{await voice.finish();signal.throwIfAborted();await scheduler.finish();signal.throwIfAborted();closed=true;release();}
   catch(error){cancel();throw error;}
  },cancel};
 }
 async controlled(language:Language,_turn:number,signal:AbortSignal):Promise<Output>{
  if(language!==this.source||!this.context)throw new Error('Local direction isolation violation.');
  signal.throwIfAborted();const scheduler=this.renderer();
  const output=controlledOutput(language,this.context,{push:(bytes,voice)=>{if(this.source==='en')scheduler.authorizeRequest(voice!.requestId!);scheduler.push(bytes,voice);},mark:(...args)=>scheduler.mark(...args),finish:()=>scheduler.finish(),cancel:()=>scheduler.cancel(),firstByte:(id,at)=>this.hooks.firstAudio(id,at)},signal);
  const cancel=()=>{output.cancel();this.release(scheduler);this.cancellations.delete(cancel);signal.removeEventListener('abort',cancel);};
  this.cancellations.add(cancel);signal.addEventListener('abort',cancel,{once:true});
  return{send:unit=>{if(this.source==='en')scheduler.traceSegment(segmentTrace(unit,this.voice!));output.send(unit);},finish:async()=>{try{await output.finish();signal.throwIfAborted();}finally{cancel();}},cancel};
 }
 async opening(signal:AbortSignal){
  if(this.source!=='en')throw new Error('The cached Danish opening is only available for English → Danish.');
  signal.throwIfAborted();if(!this.context)throw new Error('Output not prepared.');
  const context=this.context;const voice=this.cachedVoices['/audio/opening.wav'];assertDanishVoice(voice,this.voice);
  const response=await fetch('/audio/opening.wav',{signal});
  if(!response.ok)throw new Error('Cached opening unavailable.');
  const asset=await response.arrayBuffer();await verifyCachedAudio(asset,voice);signal.throwIfAborted();const buffer=await context.decodeAudioData(asset);signal.throwIfAborted();
  const floats=buffer.getChannelData(0),pcm=new Uint8Array(floats.length*2),view=new DataView(pcm.buffer);
  for(let i=0;i<floats.length;i++)view.setInt16(i*2,Math.round(Math.max(-1,Math.min(1,floats[i]))*32767),true);
  const scheduler=this.renderer();const cancel=()=>scheduler.cancel();signal.addEventListener('abort',cancel,{once:true});
  try{scheduler.traceSegment(segmentTrace({id:'cached-opening',turn:0,language:'en',start:0,end:0,source:'',target:opening.da,status:'queued',precision:false,timing:{source_start:0,source_stable_at:0}},voice,true,'cached:/audio/opening.wav'));scheduler.mark('cached-opening',0,floats.length,true);const source=new VerifiedPcmSource({...voice,requestId:crypto.randomUUID()},'verified-cache');scheduler.authorizeRequest(source.voice.requestId!);scheduler.push(source.accept(pcm),source.voice);source.seal();await scheduler.finish();signal.throwIfAborted();}
  finally{scheduler.cancel();this.release(scheduler);signal.removeEventListener('abort',cancel);}
 }
 cancel(){for(const cancel of [...this.cancellations])cancel();for(const owner of [...this.owners]){this.release(owner);owner.cancel();}void this.context?.close();this.context=undefined;}
}
