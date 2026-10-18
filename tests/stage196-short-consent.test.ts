import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import physical from './fixtures/stage196-short-consent-physical.json';
import reference from './fixtures/stage196-short-consent-reference.json';
import {align} from '../scripts/score-stage195-asr';
import {SemanticCommitter,precisionTrigger} from '../src/streaming/semantic';
import {SessionDiagnostics,lastSessionDiagnostics} from '../src/streaming/sessionDiagnostics';
import {ContinuousVoice as Before} from './fixtures/stage196-before-short-voiceClient';
import {ContinuousVoice as Current} from '../src/streaming/voiceClient';
import {fixtureVoice} from './fixtures/voice';
const d=physical.diagnostics,s=physical.review.snapshot;
class Socket{
 static OPEN=1;static last:Socket;readyState=1;bufferedAmount=0;binaryType='';onmessage:null|((e:{data:string|ArrayBuffer})=>void)=null;onclose=null;onerror=null;send=vi.fn();close=vi.fn();sequence=0;samples=0;
 constructor(){Socket.last=this;}
 event(data:unknown){this.onmessage?.({data:JSON.stringify(data)});}
 pcm(samples:number,text:string){const start=this.samples;this.samples+=samples;this.event({type:'alignment',voice:fixtureVoice,requestId:fixtureVoice.requestId,sequence:this.sequence++,sampleStart:start,sampleEnd:this.samples,samples,alignment:{chars:[...text],charStartTimesMs:[],charDurationsMs:[]}});this.onmessage?.({data:new Int16Array(samples).fill(1000).buffer});}
}
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('WebSocket',Socket);vi.stubGlobal('location',{protocol:'http:',host:'localhost:5173'});});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it.each([[4,5717.1666667],[5,7751.6666667],[6,5044.1666667]])('reproduces physical gap %i from immutable evidence without manufacturing an earlier provider response', (index,duration)=>{
 const gap=s.gaps[index],unit=s.lanes.en.units[5];expect(gap.gap_duration).toBeCloseTo(duration);
 if(index===4){expect(unit.timing.source_stable_at-gap.gap_start).toBeCloseTo(2465.2333333);expect(gap.gap_end-unit.timing.source_stable_at).toBeCloseTo(3251.9333333);expect(gap.gap_end-unit.timing.translation_ready).toBeCloseTo(1754.1333333);}
 else{expect(unit.timing.translation_ready).toBeLessThan(gap.gap_start);const pcm=s.audioTrace.find(e=>e.type==='voice.pcm_received'&&e.at>gap.gap_start)!;expect(pcm.at-gap.gap_start).toBeGreaterThan(5000);expect(gap.gap_end-pcm.at).toBeLessThan(22);}
});
it('reproduces recovery controls that arrived before buffer drain but failed to restore timely physical PCM',()=>{
 const requests=s.audioTrace.filter(e=>e.type==='ELEVENLABS_STALL_RECOVERY');expect(requests).toHaveLength(2);
 for(const [n,r]of requests.entries()){const next=s.audioTrace.find(e=>e.type==='voice.pcm_received'&&e.at>r.at)!;expect(next.at-r.at).toBeCloseTo([7975.5,5242.2][n]);expect(r.bufferMs).toBeLessThanOrEqual(250);expect(r.recoveryAttempts).toBe(1);expect(s.audioTrace.some(e=>e.type==='VOICE_FLUSH_CONFIRMED'&&e.at>r.at&&e.at<next.at)).toBe(true);}
});
it('retains both provider omissions literally and scores 4 deletions of 67 words in raw and committed ASR',()=>{
 const raw=d.recognitionAudit.items.filter(i=>i.final).map(i=>({unitId:String(i.generation),text:i.final!})),units=s.lanes.en.units.map(u=>({unitId:u.id,text:u.source}));
 for(const rows of [raw,units]){const score=align(reference.text,rows);expect(score).toMatchObject({referenceWords:67,observedWords:63,substitutions:0,deletions:4,insertions:0});expect(score.WER).toBeCloseTo(4/67);}
 expect(d.recognitionAudit.items[0].partials.some(p=>/calling|behalf|\bon\b/i.test(p.text))).toBe(false);expect(d.recognitionAudit.items[1].partials.some(p=>/information/i.test(p.text))).toBe(false);
 const c=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true,true);const spoken:string[]=[];
 for(const p of d.recognitionAudit.items[0].partials)spoken.push(...c.update(p.text,p.at).segments.map(x=>x.text));spoken.push(...c.update(raw[0].text,d.recognitionAudit.items[0].finalAt!,true).segments.map(x=>x.text));expect(spoken.join(' ')).not.toMatch(/calling|behalf/);
});
it('preserves full consent and reconstructs the late final without treating eleven seconds of incomplete partials as a stable question',()=>{
 const item=d.recognitionAudit.items[5];expect(item.finalAt!-item.commitAt!).toBeCloseTo(11587.5);expect(item.gatewaySamples).toBe(item.appendedSamples);expect(item.partials.find(p=>p.text.trim()===item.final)?.at).toBeCloseTo(65170.6);
 const c=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true,true);
 for(const p of item.partials)expect(c.update(p.text,p.at).segments).toEqual([]);
 expect(c.update(item.final!,item.finalAt!,true).segments.map(x=>x.text)).toEqual([item.final]);
 const consent=d.recognitionAudit.items[3],c2=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true,true);
 for(const p of consent.partials)expect(c2.update(p.text,p.at).segments).toEqual([]);expect(c2.update(consent.final!,consent.finalAt!,true).segments.map(x=>x.text)).toEqual([consent.final]);
});
it('checks actual frame/endpoint integrity, contiguous PCM ownership and exact final queue drain',()=>{
 const audit=d.recognitionAudit;expect(audit).toMatchObject({frameGaps:0,overlapSamples:0,unclockedPackets:0,droppedItems:0});
 for(let n=0;n<6;n++){const i=audit.items[n];expect(i.gatewaySamples).toBe(i.appendedSamples);expect(i.commitAt!-i.lastVoiceAt!).toBeGreaterThanOrEqual(750);expect(i.observedThrough!-i.lastVoiceAt!).toBeGreaterThanOrEqual(750);if(n)expect(i.firstVoiceAt).toBeGreaterThan(audit.items[n-1].commitAt!);}
 let sample=0;for(const [seq,p]of d.pcmBlocks.entries()){expect(p.pcmBlockSequence).toBe(seq);expect(p.firstSample).toBe(sample);sample=p.lastSample+1;expect(p.provenanceVerified).toBe(true);}expect(sample).toBe(546788);
 expect(d.pending).toMatchObject({receivedWords:63,committedWords:63,translatedWords:63,spokenWords:63,pendingRecognition:0,pendingTranslation:0,pendingTTS:0,pendingPlayback:0,translationActiveRequests:0,translationReadyUnits:0,audioQueueJobs:0});expect(d.voiceQuality.clippingEvents).toBe(0);
});
it.each([true,false])('bounds recovery to two controls per target range even if the first produces no new PCM; never resubmits text (before=%s)',async before=>{
 const Voice=before?Before:Current,trace=vi.fn(),audio=vi.fn();let until=0;
 const v=new Voice(audio,true,true,undefined,{simultaneous:true,queuedMs:()=>Math.max(0,until-performance.now()),trace:(event,data)=>trace(event,{...data,at:performance.now()}),expectedVoice:fixtureVoice});const opening=v.open('da',new AbortController().signal);const ws=Socket.last;ws.event({type:'ready',voice:fixtureVoice});await opening;
 const consent=s.lanes.en.units[5].target!,unsubscribe=s.lanes.en.units[6].target!;
 const advance=async(at:number)=>vi.advanceTimersByTimeAsync(at-performance.now());
 await advance(46440.5);v.send(consent);await advance(48118.5);ws.pcm(25432,(consent+' ').slice(0,27));until=d.pcmBlocks[8].playbackFinishedAt;
 await advance(56575.1);v.send(unsubscribe);await advance(56924.8);ws.pcm(36652,(consent+' ').slice(27,59));until=d.pcmBlocks[9].playbackFinishedAt;
 await advance(63490.8);ws.pcm(51612,(consent+' ').slice(59));until=d.pcmBlocks[10].playbackFinishedAt;
 // Alignment character coverage is a test witness derived from retained pending
 // counts; original full alignment/waveform is unavailable. No PCM arrival moved.
 await advance(63892);ws.pcm(109956,unsubscribe+' ');until=d.pcmBlocks[13].playbackFinishedAt;await advance(74000);
 const controls=trace.mock.calls.filter(([e])=>e==='ELEVENLABS_STALL_RECOVERY').map(([,x])=>x);
 expect(controls).toHaveLength(before?2:4);for(const [n,at]of (before?[48950,58250]:[48950,50450,58250,59750]).entries())expect(Math.abs(controls[n].at-at)).toBeLessThan(2);
 expect(ws.send.mock.calls.map(([r])=>JSON.parse(r)).filter(c=>c.type==='text').map(c=>c.text)).toEqual([consent,unsubscribe]);expect(audio).toHaveBeenCalledTimes(4);expect(ws.samples).toBe(223652);expect(ws.sequence).toBe(4);
 v.close();await vi.advanceTimersByTimeAsync(10000);expect(vi.getTimerCount()).toBe(0);
});
it('keeps commit/send/ACK/provider-complete/final/semantic milestones and gateway flush ACK outside the evicted event ring',()=>{
 const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)});const diagnostics=new SessionDiagnostics('en','realtime');
 const events=['recognition.commit','recognition.commit_sent','recognition.commit_acknowledged','recognition.provider_completed','recognition.final_delivered','recognition.final','recognition.semantic_finalized'];
 for(const event of events)diagnostics.record(event,{generation:5,providerAt:123456,clock:'server-performance.now',text:'NEVER STORE THIS'});diagnostics.record('VOICE_FLUSH_CONFIRMED',{reason:'provider_stall'});
 for(let n=0;n<10000;n++)diagnostics.record('playback.unit_scheduled',{unitId:'en-1-0-3'});diagnostics.finish('completed','STOP');const result=lastSessionDiagnostics()!;
 expect(result).toHaveProperty('recognitionLifecycle',events.map(event=>expect.objectContaining({event,data:expect.objectContaining({generation:5,providerAt:123456,clock:'server-performance.now'})})));
 expect(result.voiceLifecycle?.some(e=>e.event==='VOICE_FLUSH_CONFIRMED')).toBe(true);expect(JSON.stringify(result)).not.toContain('NEVER STORE THIS');expect(JSON.stringify(result).length).toBeLessThan(384*1024);
});
it('bounds durable ASR milestones and reports eviction without exporting source text',()=>{
 const diagnostics=new SessionDiagnostics('en','realtime');for(let n=0;n<300;n++)diagnostics.record('recognition.commit_sent',{generation:n,text:'PRIVATE SOURCE'});diagnostics.finish('completed','STOP');
 expect(lastSessionDiagnostics()?.recognitionLifecycle).toHaveLength(256);expect(lastSessionDiagnostics()?.droppedRecognitionLifecycle).toBe(44);expect(JSON.stringify(lastSessionDiagnostics())).not.toContain('PRIVATE SOURCE');
});
