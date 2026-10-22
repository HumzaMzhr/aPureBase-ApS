import {expect,it} from 'vitest';
import {analyzeStage192,distribution} from '../scripts/analyze-stage192-latency';
const trace=()=>({sessionId:'offline-session',epoch:100,outcome:'completed',droppedEvents:100,events:[],units:[{unitId:'en-1-0-5',turn:1,start:0,end:5,timing:{source_start:110,source_end_observed:120,source_stable_at:130,translation_started:135,translation_ready:180,tts_text_sent:210,first_audio_received:230,playback_started:250,playback_finished:300}}]});
const review=()=>({snapshot:{lanes:{en:{units:[{id:'en-1-0-5',source:'DO NOT EXPORT SOURCE TEXT',target:'DO NOT EXPORT TRANSLATED TEXT',timing:{source_stable_at:130,translation_queued:131,translation_consumed:190,tts_queued:191}}]}},acoustic:{epoch:99,complete:true,firstAudioLatency:140,tailLatency:90,units:[{unitId:'en-1-0-5',sourceAudioStart:11,sourceAudioEnd:21}]},audioTrace:[{text:'DO NOT EXPORT AUDIO TRACE'}]},ratings:{anything:'DO NOT EXPORT RATINGS'}});
it('reports missing clocks as null instead of fabricating acoustic or scheduler delays',()=>{
 const result=analyzeStage192(trace());expect(result.rows[0].stages).toMatchObject({sourceAudioStartAt:null,sourceAudioEndAt:null,translationFirstTokenAt:null,orderedConsumedAt:null,pcmReadyForSchedulingAt:null});expect(result.summaries.asrDelay).toBeNull();expect(result.summaries.schedulerWait).toBeNull();expect(result.summaries.playbackQueue).toBeNull();expect(result.rows[0].durations.postASRObservationCommit).toBe(10);
});
it('joins full review queue timings after event eviction using matching IDs and commit times; exports only selected numeric metadata',()=>{
 const result=analyzeStage192(trace(),review()),row=result.rows[0];expect(result.reviewTimingsMerged).toBe(true);expect(row.stages).toMatchObject({sourceAudioStartAt:110,sourceAudioEndAt:120,translationQueuedAt:131,orderedConsumedAt:190,ttsTextQueuedAt:191});expect(row.durations).toMatchObject({asrDelay:0,translationQueue:4,orderedResultWait:10,ttsQueue:19});expect(result.acousticMetrics).toEqual({complete:true,firstAudioLatencyMs:140,endTailLatencyMs:90});expect(JSON.stringify(result)).not.toContain('DO NOT EXPORT');expect(trace().units[0].timing).not.toHaveProperty('translation_consumed');
});
it('rejects a review from another session even if a browser reload reused its unit IDs',()=>{
 const other=review();other.snapshot.lanes.en.units[0].timing.source_stable_at=999;expect(()=>analyzeStage192(trace(),other)).toThrow('same session');
});
it('calculates comparable median, nearest-rank p95 and maximum without treating missing samples as zero',()=>{
 expect(distribution([undefined,null,NaN,-1,1,2,3,4])).toEqual({n:4,medianMs:2.5,p95Ms:4,maximumMs:4});expect(distribution([null,undefined])).toBeNull();
});
