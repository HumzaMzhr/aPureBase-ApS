import type {SemanticUnit,Lane} from './types';
import type {VoiceIdentity} from './voiceIdentity';
export interface AudioTrace {type:string;at:number;[key:string]:unknown}
export interface SegmentTrace {segmentId:string;sourceRange:{start:number;end:number;globalStart?:number}|null;translatedText:string;provider:string;voiceId:string;modelId:string;requestId:string;providerRequestId?:string;cached:boolean;playbackStart?:number;playbackEnd?:number}
export const segmentTrace=(unit:SemanticUnit,voice:VoiceIdentity,cached=false,requestId=voice.requestId??`local-turn-${unit.turn}`):SegmentTrace=>({segmentId:unit.id,sourceRange:cached?null:{start:unit.start,end:unit.end,globalStart:unit.globalStart},translatedText:unit.target??'',provider:voice.provider,voiceId:voice.voiceId,modelId:voice.modelId,requestId,providerRequestId:voice.providerRequestId,cached});
export interface AudioPosition {lastAudibleAt?:number;firstScheduledAt?:number;bufferMs?:number;carryMs?:number;targetSamples?:number;playbackSamples?:number;ttsCharacters?:number}
export interface GapTrace {gap_start:number;gap_end?:number;gap_duration:number;last_source_position:number;committed_source_position:number;translated_position:number;tts_position:number;playback_position:number;ASR_backlog:number;translation_backlog:number;TTS_backlog:number;playback_buffer_depth:number;last_played_segment?:string;next_expected_segment?:string;root_cause_classification:string;causes:{at:number;classification:string}[];endedBy?:string}
/** Diagnostic only: silence in supplied PCM is distinct from starvation of the output queue. */
export class GapTimeline {
 constructor(private event:(gap:GapTrace)=>void=()=>{}){}
 records:GapTrace[]=[];private active?:GapTrace;private expectedSince?:number;
 update(lane:Lane,position:AudioPosition|undefined,now:number,sourceActive:boolean,asrBacklog=0,playedPosition=0){
  if(!position)return;
  const pending=lane.units.filter(u=>!['spoken','interrupted','review'].includes(u.status));
  const expected=pending.length>0||sourceActive||asrBacklog>0||lane.receivedWords>lane.committedWords;
  if(!expected){this.close(now,'no_pending_content');this.expectedSince=undefined;return;}
  this.expectedSince??=now;const last=position.lastAudibleAt??position.firstScheduledAt;if(last===undefined)return;
  const start=Math.max(last,this.expectedSince);
  if(this.active&&last>this.active.gap_start+20){this.close(start,'audible_audio');}
  if(now-start<=750)return;
  const next=pending.find(u=>u.target)||pending[0];const missing=lane.receivedWords-lane.committedWords;
  const classification=(position.bufferMs??0)>20?'PROVIDER_GENERATED_SILENCE':(position.carryMs??0)>0?'JITTER_OR_PCM_FRAME_WAIT':next?.timing.tts_text_sent!==undefined&&next.timing.first_audio_received===undefined?'ELEVENLABS_WAITING_FOR_AUDIO':next?.status==='translating'?(next.precision?'PRECISION_TRANSLATION_REQUEST':'TRANSLATION_REQUEST'):next?.timing.first_audio_received!==undefined?'AUDIO_STREAM_UNDERRUN':missing>0?(lane.precision?'PRECISION_WAIT':'SEMANTIC_COMMITMENT'):asrBacklog>0||sourceActive?'ASR_WAITING':'OUTPUT_SCHEDULING_WAIT';
  const values={last_source_position:lane.receivedWords,committed_source_position:lane.committedWords,translated_position:lane.translatedWords,tts_position:position.ttsCharacters??0,playback_position:playedPosition,ASR_backlog:asrBacklog,translation_backlog:lane.committedWords-lane.translatedWords,TTS_backlog:pending.filter(u=>u.status==='queued'&&u.timing.first_audio_received===undefined).reduce((n,u)=>n+u.end-u.start,0),playback_buffer_depth:position.bufferMs??0,last_played_segment:lane.units.filter(u=>u.timing.playback_started!==undefined).at(-1)?.id,next_expected_segment:next?.id,root_cause_classification:classification};
  if(!this.active){this.active={gap_start:start,gap_duration:now-start,...values,causes:[{at:now,classification}]};this.records.push(this.active);this.event({...this.active,causes:[...this.active.causes]});if(this.records.length>200)this.records.shift();}
  else{if(this.active.causes.at(-1)?.classification!==classification)this.active.causes.push({at:now,classification});Object.assign(this.active,values,{gap_duration:now-this.active.gap_start});this.active.root_cause_classification=this.dominant(this.active,now);}
 }
 private dominant(gap:GapTrace,until:number){const durations=new Map<string,number>();gap.causes.forEach((cause,index)=>{const from=index===0?gap.gap_start:cause.at,to=gap.causes[index+1]?.at??until;durations.set(cause.classification,(durations.get(cause.classification)??0)+Math.max(0,to-from));});return [...durations].sort((a,b)=>b[1]-a[1])[0]?.[0]??gap.root_cause_classification;}
 close(at:number,reason='STOP'){if(!this.active)return;this.active.gap_end=at;this.active.gap_duration=Math.max(0,at-this.active.gap_start);this.active.endedBy=reason;this.active.root_cause_classification=this.dominant(this.active,at);this.event({...this.active,causes:[...this.active.causes]});this.active=undefined;}
}
