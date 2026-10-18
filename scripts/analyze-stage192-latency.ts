import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
interface Unit {unitId:string;turn:number;start:number;end:number;ttsTextSentAt?:number;timing:Record<string,number>}
interface Event {at:number;event:string;data:Record<string,unknown>}
interface Trace {sessionId:string;epoch:number;outcome:string;droppedEvents:number;units:Unit[];events:Event[];pcmBlocks?:Record<string,unknown>[]}
interface Review {snapshot:{lanes:Record<string,{units:{id:string;timing:Record<string,number>}[]}>;acoustic?:{epoch:number;complete:boolean;firstAudioLatency?:number;tailLatency?:number;units:{unitId:string;sourceAudioStart:number|null;sourceAudioEnd:number|null}[]}}}
export function distribution(values:(number|null|undefined)[]){const v=values.filter((n):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0).sort((a,b)=>a-b);return v.length?{n:v.length,medianMs:(v[Math.floor((v.length-1)/2)]+v[Math.ceil((v.length-1)/2)])/2,p95Ms:v[Math.ceil(v.length*.95)-1],maximumMs:v.at(-1)!}:null;}
export function analyzeStage192(trace:Trace,review?:Review){
 // The existing review export retains full unit timings even after bounded
 // event eviction. Match IDs AND commit times before joining the two files.
 // Never import its speech text, audio trace, ratings or arbitrary fields.
 const reviewUnits=new Map(Object.values(review?.snapshot.lanes??{}).flatMap(l=>l.units).map(u=>[u.id,u]));
 if(review&&(!trace.units.length||trace.units.some(u=>!reviewUnits.has(u.unitId)||reviewUnits.get(u.unitId)!.timing.source_stable_at!==u.timing.source_stable_at)))throw new Error('Review and diagnostics must belong to the same session.');
 const acoustic=review?.snapshot.acoustic;
 const queued=new Map(trace.events.filter(e=>e.event==='unit.state'&&e.data.status==='queued').map(e=>[e.data.unitId,e.at]));
 const stage=(id:string,name:string)=>trace.events.find(e=>e.event===name&&e.data.unitId===id)?.data.providerAt as number|undefined;
 const starts=trace.events.filter(e=>e.event==='voice.setup_timeout_started').map(e=>e.at);
 const connections=trace.events.filter(e=>e.event==='VOICE_READY').map(e=>({requestId:e.data.requestId,readyAt:e.at,startedAt:starts.filter(at=>at<=e.at).at(-1)}));
 const delta=(end:number|undefined,start:number|undefined)=>end===undefined||start===undefined?null:end-start;
 const rows=trace.units.map(unit=>{
  const t={...unit.timing};for(const key of ['translation_queued','translation_consumed','tts_queued']){const value=reviewUnits.get(unit.unitId)?.timing[key];if(typeof value==='number'&&Number.isFinite(value))t[key]=value;}
  const consumed=t.translation_consumed??stage(unit.unitId,'translation.consumed')??queued.get(unit.unitId);
  const ttsEnqueued=t.tts_queued??stage(unit.unitId,'tts.enqueued')??consumed;
  const blocks=trace.pcmBlocks?.filter(b=>b.unitId===unit.unitId||Array.isArray(b.unitIds)&&b.unitIds.includes(unit.unitId));
  const pcmReady=blocks?.length?Math.min(...blocks.map(b=>Number(b.scheduledAt))):undefined;
  const played=blocks?.map(b=>typeof b.playbackStartedAt==='number'?b.playbackStartedAt:NaN).filter(Number.isFinite)??[];const playback=played.length?Math.min(...played):undefined;
  const connection=connections.find(c=>c.requestId===(unit as Unit&{requestId?:string}).requestId);
  const bounds=acoustic?.units.find(u=>u.unitId===unit.unitId);
  const sourceStart=bounds?.sourceAudioStart,sourceEnd=bounds?.sourceAudioEnd;
  const sourceAudioStartAt=typeof sourceStart==='number'?acoustic!.epoch+sourceStart:undefined,sourceAudioEndAt=typeof sourceEnd==='number'?acoustic!.epoch+sourceEnd:undefined;
  return{unitId:unit.unitId,words:unit.end-unit.start,stages:{sourceAudioStartAt:sourceAudioStartAt??null,sourceAudioEndAt:sourceAudioEndAt??null,sourceCaptureObservedAt:t.source_start??null,asrLastWordObservedAt:t.source_end_observed??null,semanticCommittedAt:t.source_stable_at??null,translationQueuedAt:t.translation_queued??stage(unit.unitId,'translation.queued')??t.source_stable_at??null,translationRequestStartedAt:t.translation_started??null,translationFirstTokenAt:t.translation_first_text??null,translationCompletedValidatedAt:t.translation_ready??null,orderedConsumedAt:consumed??null,ttsTextQueuedAt:ttsEnqueued??null,ttsDispatchAt:t.tts_text_sent??null,elevenLabsRequestStartedAt:connection?.startedAt??null,elevenLabsTextSentAt:unit.ttsTextSentAt??null,firstPCMReceivedAt:t.first_audio_received??null,pcmReadyForSchedulingAt:pcmReady??null,playbackStartedAt:playback??t.playback_started??null,playbackFinishedAt:t.playback_finished??null},durations:{asrDelay:delta(t.source_end_observed,sourceAudioEndAt),postASRObservationCommit:delta(t.source_stable_at,t.source_end_observed),translationQueue:delta(t.translation_started,t.translation_queued??t.source_stable_at),translationProvider:delta(t.translation_ready,t.translation_started),orderedResultWait:delta(consumed,t.translation_ready),ttsQueue:delta(t.tts_text_sent,ttsEnqueued),readyToTTSDispatchCombined:delta(t.tts_text_sent,t.translation_ready),localTextBuffer:delta(unit.ttsTextSentAt,t.tts_text_sent),elevenLabsFirstPCM:delta(t.first_audio_received,unit.ttsTextSentAt),schedulerWait:delta(pcmReady,t.first_audio_received),playbackQueue:delta(playback,pcmReady),pcmToPlaybackCombined:delta(t.playback_started,t.first_audio_received)}};
 });
 const summaries=Object.fromEntries(Object.keys(rows[0]?.durations??{}).map(key=>[key,distribution(rows.map(r=>r.durations[key as keyof typeof r.durations]))]));
 return{method:'Offline metadata analysis. All times are monotonic milliseconds. p95 uses nearest rank; missing stages remain null. No speech/audio/credentials are copied.',sessionId:trace.sessionId,epoch:trace.epoch,outcome:trace.outcome,droppedEvents:trace.droppedEvents,reviewTimingsMerged:Boolean(review),acousticMetrics:acoustic?{complete:acoustic.complete,firstAudioLatencyMs:acoustic.firstAudioLatency??null,endTailLatencyMs:acoustic.tailLatency??null}:null,limitations:['Internal source word/audio alignment is unavailable; only session boundary units can have acoustic source timestamps.','For old exports ordered-consumption uses the retained queued-state observation when present; it is an observation, not an exact event timestamp.','Legacy playback_scheduled is a projected playback time, not the scheduling-call time. Separate scheduler/playback waits require Part A PCM-block records.','Translation request duration includes local transport and server validation; provider/network portions cannot be separated.','Export session and review alongside retained diagnostics to recover new queue timestamps after bounded event eviction.'],summaries,connectionSetup:distribution(connections.map(c=>delta(c.readyAt,c.startedAt))),rows};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const input=process.argv[2];if(!input)throw new Error('Provide a retained diagnostics JSON path. This script never calls a provider.');
 const review=process.argv[4]?JSON.parse(await readFile(process.argv[4],'utf8')):undefined;
 const result=analyzeStage192(JSON.parse(await readFile(input,'utf8')),review);const output=process.argv[3]??'benchmarks/stage192-baseline-analysis.json';await writeFile(output,JSON.stringify(result,null,2)+'\n');console.info(JSON.stringify({output,units:result.rows.length,summaries:result.summaries,connectionSetup:result.connectionSetup},null,2));
}
