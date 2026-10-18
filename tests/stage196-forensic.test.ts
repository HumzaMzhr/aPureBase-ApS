import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import physical from './fixtures/stage196-physical-session.json';
import {SemanticCommitter,precisionTrigger} from '../src/streaming/semantic';
import {ContinuousVoice as Before} from './fixtures/stage195-voiceClient';
import {ContinuousVoice as After} from '../src/streaming/voiceClient';
import {fixtureVoice} from './fixtures/voice';
const d=physical.diagnostics,s=physical.review.snapshot;
class Socket{
 static OPEN=1;static last:Socket;readyState=1;bufferedAmount=0;binaryType='';onmessage:null|((e:{data:string|ArrayBuffer})=>void)=null;onclose=null;onerror=null;send=vi.fn();close=vi.fn();sequence=0;samples=0;
 constructor(){Socket.last=this;}
 event(data:unknown){this.onmessage?.({data:JSON.stringify(data)});}
 pcm(samples:number,text:string){const start=this.samples;this.samples+=samples;this.event({type:'alignment',voice:fixtureVoice,requestId:fixtureVoice.requestId,sequence:this.sequence++,sampleStart:start,sampleEnd:this.samples,samples,alignment:{chars:[...text],charStartTimesMs:[],charDurationsMs:[]}});this.onmessage?.({data:new Int16Array(samples).fill(1000).buffer});}
}
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('WebSocket',Socket);vi.stubGlobal('location',{protocol:'http:',host:'localhost:5173'});});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('reconstructs the physical 7907ms gap with actual partials through the semantic committer before any production change',()=>{
 const item=d.recognitionAudit.items.find(i=>i.generation===12)!,unit=s.lanes.en.units.find(u=>u.id==='en-13-0-21')!,gap=s.gaps[10];
 const c=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true,true);
 for(const p of item.partials)expect(c.update(p.text,p.at).segments).toEqual([]);
 expect(c.update(item.final!,item.finalAt!,true).segments.map(x=>x.text)).toEqual([unit.source]);
 expect(gap.gap_duration).toBe(7907);expect(unit.timing.source_stable_at-gap.gap_start).toBeCloseTo(5605.4666667);
 expect(unit.timing.translation_ready-unit.timing.translation_started).toBeCloseTo(1616.1);
 expect(gap.gap_end-unit.timing.source_stable_at).toBeCloseTo(2301.5333333);
 // No fabricated clause may be played before its qualifiers/choice are known.
 expect(c.cursor).toBe(21);
});
it('reconstructs the physical 6333ms PCM supply stall independently of upstream ASR or translation',()=>{
 const gap=s.gaps[12],unit=s.lanes.en.units.find(u=>u.id==='en-13-0-21')!,before=d.pcmBlocks[35],after=d.pcmBlocks[36];
 expect(gap.gap_duration).toBeCloseTo(6333.1666667);expect(unit.timing.translation_ready).toBeLessThan(gap.gap_start-5000);
 expect(s.audioTrace.filter(t=>t.type==='ELEVENLABS_TEXT_SENT'&&t.at<=gap.gap_end).at(-1)?.at).toBeLessThan(gap.gap_start);
 expect(gap.gap_start).toBe(before.playbackFinishedAt);expect(after.playbackStartedAt-gap.gap_start).toBeCloseTo(6332.5);
 const arrivals=s.audioTrace.filter(t=>t.type==='voice.pcm_received'&&t.at>113000&&t.at<121000);
 expect(arrivals).toHaveLength(2);expect(arrivals[1].at-arrivals[0].at).toBeCloseTo(6792.8);
 expect(after.scheduledAt-arrivals[1].at).toBeCloseTo(11.7);expect(after.playbackStartedAt-after.scheduledAt).toBeCloseTo(5.2666666);
});
it.each([false,true])('keeps recorded provider arrivals unchanged while observing bounded stall control (candidate=%s)',async candidate=>{
 const Voice=candidate?After:Before,trace=vi.fn(),audio=vi.fn();let bufferUntil=0;
 const v=new Voice(audio,true,true,undefined,{simultaneous:true,queuedMs:()=>Math.max(0,bufferUntil-performance.now()),trace:(type,data)=>trace(type,{...data,at:performance.now()}),expectedVoice:fixtureVoice});const opening=v.open('da',new AbortController().signal);const ws=Socket.last;ws.event({type:'ready',voice:fixtureVoice});await opening;
 const unit=s.lanes.en.units.find(u=>u.id==='en-13-0-21')!;await vi.advanceTimersByTimeAsync(108476.2);v.send(unit.target!);
 const packets=[{at:109090.6,samples:39644,chars:26},{at:109165.9,samples:10472,chars:8},{at:109918.4,samples:39644,chars:32},{at:113342.3,samples:11220,chars:9},{at:120135.1,samples:71808,chars:51}];let cursor=0;
 for(const p of packets){await vi.advanceTimersByTimeAsync(p.at-performance.now());ws.pcm(p.samples,(unit.target!+' ').slice(cursor,cursor+p.chars));cursor+=p.chars;bufferUntil=d.pcmBlocks[32+packets.indexOf(p)].playbackFinishedAt;}
 expect(audio).toHaveBeenCalledTimes(5);expect(ws.send.mock.calls.map(([r])=>JSON.parse(r)).filter(c=>c.type==='text').map(c=>c.text)).toEqual([unit.target]);
 const recovery=ws.send.mock.calls.map(([r])=>JSON.parse(r)).filter(c=>c.reason==='provider_stall');expect(recovery).toHaveLength(candidate?2:0);if(candidate)expect(trace.mock.calls.filter(([type])=>type==='ELEVENLABS_STALL_RECOVERY').map(([,data])=>Math.round(data.at))).toEqual([112600,114100]);
 await vi.advanceTimersByTimeAsync(10000);expect(ws.send.mock.calls.map(([r])=>JSON.parse(r)).filter(c=>c.reason==='provider_stall')).toHaveLength(candidate?2:0);
 v.close();expect(vi.getTimerCount()).toBe(0);
});
