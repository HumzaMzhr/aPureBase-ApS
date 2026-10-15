import {percentile} from '../latency';
import type {Lane} from './types';
export interface PlaybackPosition {ttsCharacters:number;targetSamples:number;playbackSamples:number;bufferMs?:number;nextScheduledInMs?:number;underruns?:number;underrunMs?:number;voiceConnections?:number;lastAudibleAt?:number;firstScheduledAt?:number;carryMs?:number}
export interface TrailingSample {at:number;elapsedMs:number;lagMs:number;sourcePosition:number;committedPosition:number;translatedPosition:number;playbackPosition:number;asrBacklog:number;translationBacklog:number;ttsBacklog:number;playbackBufferMs:number}
export class TrailingMonitor {
 samples:TrailingSample[]=[];checkpoints:TrailingSample[]=[];private nextCheckpoint=5000;private endSource?:number;private endTarget?:number;private latest?:TrailingSample;
 update(lane:Lane,sourceOnset:number|undefined,sourceHead:number|undefined,now:number,positions:PlaybackPosition,asrBacklog=0){
  if(sourceOnset===undefined||sourceHead===undefined)return;
  let playbackPosition=0,playedSourceAt=sourceOnset,started=false;
  for(const unit of lane.units){const fraction=unit.status==='spoken'?1:unit.playedFraction??0;if(unit.timing.playback_started!==undefined)started=true;if(!fraction)continue;
   const base=unit.globalStart??unit.start;const position=base+(unit.end-unit.start)*fraction;
   if(position>=playbackPosition){playbackPosition=position;playedSourceAt=unit.timing.source_start+((unit.timing.source_end_observed??unit.timing.source_stable_at)-unit.timing.source_start)*fraction;}
  }
  const lagMs=Math.max(0,Math.min(this.endSource??sourceHead,sourceHead)-playedSourceAt);
  const sample={at:now,elapsedMs:now-sourceOnset,lagMs,sourcePosition:lane.receivedWords,committedPosition:lane.committedWords,translatedPosition:lane.translatedWords,playbackPosition,asrBacklog,translationBacklog:lane.committedWords-lane.translatedWords,ttsBacklog:lane.units.filter(u=>u.status==='queued'&&u.timing.first_audio_received===undefined).reduce((n,u)=>n+u.end-u.start,0),playbackBufferMs:positions.bufferMs??0};
  this.latest=sample;if(started&&this.endSource===undefined&&now-sourceHead<=250){this.samples.push(sample);if(this.samples.length>12000)this.samples.shift();}
  if(this.endSource===undefined&&sample.elapsedMs>=this.nextCheckpoint){this.checkpoints.push(sample);this.nextCheckpoint+=5000;}
  if(this.endSource!==undefined&&lane.sourceFinished!==undefined&&!lane.partial&&!lane.liveCommitted&&lane.spokenWords===lane.receivedWords&&lane.units.length&&lane.units.every(u=>u.status==='spoken'))this.endTarget=Math.max(...lane.units.map(u=>u.timing.playback_finished??now));else if(this.endSource!==undefined)this.endTarget=undefined;
 }
 sourceAdvanced(at:number){if(this.endSource!==undefined&&at>this.endSource){this.endSource=undefined;this.endTarget=undefined;}}
 sourceEnded(at:number){this.endSource=at;}
 get summary(){const lags=this.samples.map(s=>s.lagMs);const last=this.latest;const recent=this.checkpoints.slice(-3);const drift=recent.length>1?recent.at(-1)!.lagMs-recent[0].lagMs:undefined;
  return{currentTrailingLag:last?.lagMs,medianTrailingLag:percentile(lags,.5),p95TrailingLag:percentile(lags,.95),maximumTrailingLag:lags.length?Math.max(...lags):undefined,endOfSourceToEndOfTranslation:this.endSource===undefined||this.endTarget===undefined?undefined:Math.max(0,this.endTarget-this.endSource),growth:drift===undefined?'UNMEASURED':drift>500?'GROWING':drift< -500?'SHRINKING':'STABLE',sampleCount:lags.length,latest:last,checkpoints:this.checkpoints};
 }
}
