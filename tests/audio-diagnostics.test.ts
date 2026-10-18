import {it,expect,vi} from 'vitest';
import {GapTimeline} from '../src/streaming/audioDiagnostics';
import {AlignmentLedger} from '../src/streaming/alignment';
import {emptyLane,type SemanticUnit} from '../src/streaming/types';
const unit=(id:string,target:string):SemanticUnit=>({id,turn:1,language:'en',start:0,end:4,source:'My name is Humza.',target,status:'queued',precision:false,timing:{source_start:0,source_stable_at:0,tts_text_sent:500}});
it('logs a >750ms content-ready gap with positions/backlogs and closes it at actual audible resumption',()=>{
 const event=vi.fn(),timeline=new GapTimeline(event),lane={...emptyLane(),receivedWords:8,committedWords:8,translatedWords:8,spokenWords:4,units:[{...unit('previous','Hej.'),status:'spoken' as const,timing:{source_start:0,source_stable_at:0,playback_started:100,playback_finished:500}},unit('next','Jeg hedder Humza.')]};const positions={lastAudibleAt:500,bufferMs:0,ttsCharacters:25};timeline.update(lane,positions,500,true,1,4);timeline.update(lane,positions,1300,true,1,4);expect(timeline.records[0]).toMatchObject({gap_start:500,gap_duration:800,last_source_position:8,committed_source_position:8,translated_position:8,tts_position:25,playback_position:4,ASR_backlog:1,translation_backlog:0,TTS_backlog:4,playback_buffer_depth:0,last_played_segment:'previous',next_expected_segment:'next',root_cause_classification:'ELEVENLABS_WAITING_FOR_AUDIO'});timeline.update(lane,{...positions,lastAudibleAt:1600,bufferMs:900},1600,true,0,5);expect(timeline.records[0]).toMatchObject({gap_end:1600,gap_duration:1100,endedBy:'audible_audio'});expect(event).toHaveBeenCalledTimes(2);
});
it('distinguishes provider-generated quiet PCM from an empty playback queue, without masking either',()=>{
 const timeline=new GapTimeline(),lane={...emptyLane(),units:[unit('u','Hej.')]};timeline.update(lane,{lastAudibleAt:100,bufferMs:1500},100,true);timeline.update(lane,{lastAudibleAt:100,bufferMs:700},900,true);expect(timeline.records[0].root_cause_classification).toBe('PCM_QUEUED_WITHOUT_AUDIBLE_PROGRESS');
});
it('does not flag a natural pause with no outstanding or expected translated speech',()=>{
 const timeline=new GapTimeline();timeline.update(emptyLane(),{lastAudibleAt:100,bufferMs:0},3000,false);expect(timeline.records).toHaveLength(0);
});
it('does not fragment a >750ms gap when an observed clock boundary jitters by a few milliseconds',()=>{
 const timeline=new GapTimeline(),lane={...emptyLane(),units:[unit('u','Hej.')]};timeline.update(lane,{lastAudibleAt:100},100,true);timeline.update(lane,{lastAudibleAt:100},900,true);timeline.update(lane,{lastAudibleAt:103},1000,true);timeline.update(lane,{lastAudibleAt:107},1100,true);expect(timeline.records).toHaveLength(1);expect(timeline.records[0].gap_end).toBeUndefined();timeline.update(lane,{lastAudibleAt:1500,bufferMs:700},1500,true);expect(timeline.records[0]).toMatchObject({gap_start:100,gap_end:1500,gap_duration:1400});
});
it('records stage changes during the gap and closes instrumentation on STOP',()=>{
 const timeline=new GapTimeline(),u={...unit('u','Hej.'),status:'translating' as const,timing:{source_start:0,source_stable_at:0}},lane={...emptyLane(),receivedWords:4,committedWords:4,units:[u]};timeline.update(lane,{lastAudibleAt:100},100,true);timeline.update(lane,{lastAudibleAt:100},900,true);expect(timeline.records[0].root_cause_classification).toBe('TRANSLATION_REQUEST');Object.assign(u,{status:'queued',timing:{...u.timing,tts_text_sent:1000}});timeline.update(lane,{lastAudibleAt:100},1200,true);expect(timeline.records[0].causes.map(c=>c.classification)).toEqual(['TRANSLATION_REQUEST','ELEVENLABS_WAITING_FOR_AUDIO']);timeline.close(1500);expect(timeline.records[0]).toMatchObject({gap_end:1500,endedBy:'STOP'});
});
it('reports the dominant wait instead of misclassifying the entire gap as the short provider pause before resumption',()=>{
 const timeline=new GapTimeline(),u={...unit('u','Hej.'),status:'translating' as const,timing:{source_start:0,source_stable_at:0}},lane={...emptyLane(),units:[u]};timeline.update(lane,{lastAudibleAt:100},100,true);timeline.update(lane,{lastAudibleAt:100},900,true);Object.assign(u,{status:'queued',timing:{...u.timing,tts_text_sent:1700}});timeline.update(lane,{lastAudibleAt:100},1700,true);timeline.update(lane,{lastAudibleAt:100,bufferMs:700},2200,true);timeline.update(lane,{lastAudibleAt:2220,bufferMs:700},2220,true);expect(timeline.records[0].root_cause_classification).toBe('TRANSLATION_REQUEST');expect(timeline.records[0].causes.at(-1)?.classification).toBe('PCM_QUEUED_WITHOUT_AUDIBLE_PROGRESS');
});
it('does not shift semantic audio alignment when an in-stream flush adds a control space',()=>{
 const ledger=new AlignmentLedger();ledger.register(unit('one','Hej.'));ledger.register(unit('two','Jeg hedder Humza.'));const text='Hej.  Jeg hedder Humza.';const marks=ledger.consume(new Uint8Array(48000),{chars:[...text],charStartTimesMs:[...text].map((_,n)=>n*20),charDurationsMs:[...text].map(()=>20)});expect(ledger.coverage).toBe(true);expect(marks.filter(m=>m.complete).map(m=>m.id)).toEqual(['one','two']);expect(marks.find(m=>m.id==='two')?.start).toBe(6*20*24);
});
