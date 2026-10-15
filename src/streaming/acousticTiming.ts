import type {SemanticUnit} from './types';

export interface ClockMapping {method:'output-timestamp'|'context-performance-pair';contextTime:number;performanceTime:number;renderQuantumMs:number;deviceLatencyIncluded:boolean}
/** Explicit conversion; AudioContext seconds are never subtracted from performance ms. */
export function audioClockMapping(context:Pick<AudioContext,'currentTime'|'sampleRate'>&Partial<Pick<AudioContext,'getOutputTimestamp'>>,now:()=>number,output=false):ClockMapping{
 try{if(output&&context.getOutputTimestamp){const stamp=context.getOutputTimestamp();if(Number.isFinite(stamp.contextTime)&&Number.isFinite(stamp.performanceTime)&&stamp.performanceTime!>0)return{method:'output-timestamp',contextTime:stamp.contextTime!,performanceTime:stamp.performanceTime!,renderQuantumMs:128/(context.sampleRate||24000)*1000,deviceLatencyIncluded:true};}}catch{/* Some devices do not expose output timestamps. */}
 return{method:'context-performance-pair',contextTime:context.currentTime,performanceTime:now(),renderQuantumMs:128/(context.sampleRate||24000)*1000,deviceLatencyIncluded:false};
}
export const contextToMonotonic=(seconds:number,mapping:ClockMapping)=>mapping.performanceTime+(seconds-mapping.contextTime)*1000;
export interface CaptureTiming {frameStart:number;frameEnd:number;sampleRate:number;startAt:number;endAt:number;clock:ClockMapping}
export interface PlaybackTiming {
 type:'pcm_received'|'block_scheduled'|'block_started'|'block_audible'|'block_rendered'|'unit_scheduled'|'cancelled';streamId:string;at:number;clock:ClockMapping;
 block?:number;unitId?:string;sampleStart?:number;sampleEnd?:number;startAt?:number;endAt?:number;signalStartAt?:number;signalEndAt?:number;
}
export interface SourceRegion {firstFrame:number;lastFrame:number;startAt:number;endAt:number}
export interface AcousticSnapshot {
 epoch:number;clock:'performance.now';sourceSpeechOnset?:number;sourceSpeechEnd?:number;firstSourceSpeechFrame?:number;lastSourceSpeechFrame?:number;
 firstTranslatedAudioActuallyPlayed?:number;targetPlaybackEnd?:number;firstAudioLatency?:number;tailLatency?:number;firstPCMPlayedAt?:number;lastPCMPlayedAt?:number;
 sourceClock?:ClockMapping;outputClock?:ClockMapping;sourceRegions:SourceRegion[];sourceFrames:number;unclockedSourceFrames:number;sourceQuiet:boolean;complete:boolean;stopped:boolean;cancelledOutput:boolean;
 firstPCMReceivedAt?:number;firstPCMScheduledAt?:number;units:ReturnType<AcousticTiming['unitTrace']>;limitations:string[];
}
/** Measurement only. This object never sends PCM, commits source or controls playback. */
export class AcousticTiming {
 readonly epoch:number;private stopped=false;private stoppedAt?:number;private onset?:number;private speechEnd?:number;private firstFrame?:number;private lastFrame?:number;private sourceFrames=0;private unclockedSourceFrames=0;private sourceClock?:ClockMapping;private outputClock?:ClockMapping;
 private regions:SourceRegion[]=[];private blocks=new Map<string,PlaybackTiming>();private unitPlayback=new Map<string,PlaybackTiming>();private ttsSent=new Map<string,number>();private cancelled=new Set<string>();private firstPCMReceived?:number;private lastComplete=false;
 constructor(private now=()=>performance.now(),private silenceMs=450){this.epoch=now();}
 relative(at:number|undefined){return at===undefined?undefined:at-this.epoch;}
 source(pcm:Uint8Array,timing?:CaptureTiming){
  if(this.stopped)return;this.sourceFrames+=pcm.length/2;
  if(!timing||timing.sampleRate!==24000||timing.frameEnd-timing.frameStart!==pcm.length/2||!Number.isFinite(timing.startAt)){this.unclockedSourceFrames+=pcm.length/2;return;}
  this.sourceClock=timing.clock;const view=new DataView(pcm.buffer,pcm.byteOffset,pcm.byteLength);const window=240; // 10 ms; observes the existing .018 speech energy threshold without changing capture/VAD.
  for(let at=0;at<pcm.length/2;at+=window){const end=Math.min(pcm.length/2,at+window);let energy=0;for(let n=at;n<end;n++)energy+=(view.getInt16(n*2,true)/32768)**2;if(Math.sqrt(energy/(end-at))<.018)continue;
   const startAt=timing.startAt+at/24,endAt=timing.startAt+end/24;this.onset??=startAt;this.firstFrame??=timing.frameStart+at;this.speechEnd=endAt;this.lastFrame=timing.frameStart+end-1;
   const previous=this.regions.at(-1);if(previous&&startAt-previous.endAt<this.silenceMs){previous.endAt=endAt;previous.lastFrame=this.lastFrame;}else this.regions.push({firstFrame:timing.frameStart+at,lastFrame:this.lastFrame,startAt,endAt});
  }
 }
 pcmReceived(at:number){if(!this.stopped)this.firstPCMReceived??=at;}
 textSent(unitIds:string[],at:number){if(this.stopped)return;for(const id of unitIds)if(!this.ttsSent.has(id))this.ttsSent.set(id,at);}
 playback(event:PlaybackTiming){
  if(this.stopped)return;this.outputClock=event.clock;
  if(event.type==='pcm_received'){this.pcmReceived(event.at);return;}
  if(event.type==='cancelled'){this.cancelled.add(event.streamId);return;}
  if(event.type==='unit_scheduled'){const old=this.unitPlayback.get(event.unitId!);this.unitPlayback.set(event.unitId!,{...event,at:old?.at??event.at});return;}
  const key=`${event.streamId}:${event.block}`;const old=this.blocks.get(key);this.blocks.set(key,{...old,...event,at:old?.at??event.at});
 }
 stop(){if(this.stopped)return;this.stoppedAt=this.now();this.stopped=true;}
 unitTrace(units:SemanticUnit[],sourceFinalized=false){
  return units.map((u,i)=>{const p=this.unitPlayback.get(u.id);const sourceAudioStart=i===0?this.onset:undefined,sourceAudioEnd=sourceFinalized&&i===units.length-1?this.speechEnd:undefined;
   const relative=(at:number|undefined)=>this.relative(at)??null;const difference=(end:number|undefined,start:number|undefined)=>end===undefined||start===undefined?null:end-start;
   const start=u.timing.playback_started!==undefined&&p?.startAt!==undefined&&p.startAt<=(this.stoppedAt??this.now())?p.startAt:undefined,end=u.timing.playback_finished!==undefined&&p?.endAt!==undefined&&p.endAt<=(this.stoppedAt??this.now())?p.endAt:undefined;
   return{unitId:u.id,sourceAudioStart:relative(sourceAudioStart),sourceAudioEnd:relative(sourceAudioEnd),sourceAudioAlignment:units.length===1&&sourceFinalized?'session speech bounds':'session boundary only; internal word/audio alignment unavailable',asrAvailableAt:relative(u.timing.source_end_observed),committedAt:relative(u.timing.source_stable_at),translationStartedAt:relative(u.timing.translation_started),translationReadyAt:relative(u.timing.translation_ready),ttsTextSentAt:relative(this.ttsSent.get(u.id)),ttsQueuedAt:relative(u.timing.tts_text_sent),ttsFirstPCMAt:relative(u.timing.first_audio_received),pcmScheduledAt:relative(p?.at),playbackStartAt:relative(start),playbackEndAt:relative(end),latencies:{asrAvailability:difference(u.timing.source_end_observed,sourceAudioEnd),semanticCommitment:difference(u.timing.source_stable_at,u.timing.source_end_observed),translation:difference(u.timing.translation_ready,u.timing.translation_started),elevenLabs:difference(u.timing.first_audio_received,this.ttsSent.get(u.id)),scheduler:difference(start,u.timing.first_audio_received),unitPlayback:difference(start,sourceAudioStart)}};
  });
 }
 snapshot(units:SemanticUnit[]=[],pipelineDone=false,sourceFinalized=false):AcousticSnapshot{
  const now=this.stoppedAt??this.now(),blocks=[...this.blocks.values()];const played=blocks.filter(b=>b.type!=='block_scheduled'&&b.startAt!==undefined&&b.startAt<=now);const signal=played.filter(b=>(b.type==='block_audible'||b.type==='block_rendered')&&b.signalStartAt!==undefined&&b.signalStartAt<=now);
  const first=signal.length?Math.min(...signal.map(b=>b.signalStartAt!)):undefined;
  const last=signal.length?Math.max(...signal.map(b=>Math.min(b.signalEndAt!,now))):undefined;
  const allRendered=blocks.length>0&&blocks.every(b=>b.type==='block_rendered'&&b.endAt!==undefined&&b.endAt<=now);const sourceQuiet=this.speechEnd!==undefined&&now-this.speechEnd>=this.silenceMs;
  const complete=(this.stopped?this.lastComplete:pipelineDone&&sourceQuiet&&allRendered&&this.cancelled.size===0);if(!this.stopped)this.lastComplete=complete;
  return{epoch:this.epoch,clock:'performance.now',sourceSpeechOnset:this.relative(this.onset),sourceSpeechEnd:this.relative(this.speechEnd),firstSourceSpeechFrame:this.firstFrame,lastSourceSpeechFrame:this.lastFrame,firstTranslatedAudioActuallyPlayed:this.relative(first),targetPlaybackEnd:complete?this.relative(last):undefined,firstAudioLatency:first===undefined||this.onset===undefined?undefined:first-this.onset,tailLatency:complete&&last!==undefined&&this.speechEnd!==undefined?last-this.speechEnd:undefined,firstPCMPlayedAt:played.length?this.relative(Math.min(...played.map(b=>b.startAt!))):undefined,lastPCMPlayedAt:allRendered?this.relative(Math.max(...blocks.map(b=>b.endAt!))):undefined,firstPCMReceivedAt:this.relative(this.firstPCMReceived),firstPCMScheduledAt:blocks.length?this.relative(Math.min(...blocks.map(b=>b.at))):undefined,sourceClock:this.sourceClock,outputClock:this.outputClock,sourceRegions:this.regions.map(r=>({...r,startAt:r.startAt-this.epoch,endAt:r.endAt-this.epoch})),sourceFrames:this.sourceFrames,unclockedSourceFrames:this.unclockedSourceFrames,sourceQuiet,complete,stopped:this.stopped,cancelledOutput:this.cancelled.size>0,units:this.unitTrace(units,sourceFinalized&&sourceQuiet),limitations:['Browser PCM/output timeline, not an external acoustic loopback measurement.','Source detector: .018 RMS / 10 ms; target detector: .005 RMS / 20 ms.','Input device/OS processing delay is not supplied by the capture API.','Internal source word/audio alignment unavailable; unavailable unit timestamps remain null.',...(this.outputClock&&!this.outputClock.deviceLatencyIncluded?['Output timestamp unavailable: calibrated render timeline only; physical output latency unknown.']:[])]};
 }
}
