import {writeFile} from 'node:fs/promises';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ContinuousVoice} from '../src/streaming/voiceClient';
import {ContinuousVoice as BeforeVoice} from './fixtures/stage193-voiceClient';
import {VoiceDemand} from '../src/streaming/voiceDemand';
import {validatedGreeting} from '../src/streaming/validatedGreeting';
import {incrementalTranslation,type UnitRequest} from '../server/incrementalTranslation';
import {fixtureVoice} from './fixtures/voice';
import physical from './fixtures/stage194-physical-metadata.json';
class Socket {
 static OPEN=1;static last:Socket;readyState=1;bufferedAmount=0;binaryType='';onmessage:null|((event:{data:string|ArrayBuffer})=>void)=null;onclose=null;onerror=null;send=vi.fn();close=vi.fn();constructor(){Socket.last=this;}
 event(value:unknown){this.onmessage?.({data:JSON.stringify(value)});}
 pcm(){this.event({type:'alignment',voice:fixtureVoice,requestId:fixtureVoice.requestId,sequence:0,sampleStart:0,sampleEnd:2400,samples:2400});this.onmessage?.({data:new Uint8Array(4800).buffer});}
}
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('WebSocket',Socket);vi.stubGlobal('location',{host:'localhost:5173',protocol:'http:'});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
// Exact retained text-ready/send, following-text and physical audible boundaries.
// Synthetic text has the measured character length, never reproduces source speech.
const replayReports:unknown[]=[];
const cases=[{turn:4,nextAt:38063.5,baselineService:677.2},{turn:14,nextAt:77690.7,baselineService:432.3},{turn:16,nextAt:88524,baselineService:438.7}];
it.each(cases)('replays physical unit $turn with the frozen pre-1.9.4 client and fixes pre-first-PCM demand without speculative text',async c=>{
 const unit=physical.units.find(u=>u.id.startsWith(`en-${c.turn}-`))!,gap=physical.gaps.find(g=>g.next_expected_segment===unit.id)!;
 async function replay(candidate:boolean){
  let first=Infinity;const Voice=candidate?ContinuousVoice:BeforeVoice;
  const voice=new Voice(()=>{first=Math.min(first,performance.now());},true,true,undefined,{simultaneous:true,expectedVoice:fixtureVoice,queuedMs:()=>Math.max(0,gap.gap_start-performance.now())});
  const ready=voice.open('da',new AbortController().signal);const socket=Socket.last;socket.event({type:'ready',voice:fixtureVoice});await ready;
  let chars=0,requested=false;socket.send.mockImplementation((raw:string)=>{const command=JSON.parse(raw);if(command.type==='text')chars+=command.text.length;if(!requested&&(command.type==='flush'||chars>=50)){requested=true;setTimeout(()=>socket.pcm(),candidate?807.2:c.baselineService);}});
  const sendAt=candidate?unit.timing.translation_consumed:unit.actualTextSentAt!;
  setTimeout(()=>voice.send('a'.repeat(unit.characters)),sendAt-performance.now());setTimeout(()=>voice.send('b'.repeat(70)),c.nextAt-performance.now());
  await vi.advanceTimersByTimeAsync(c.nextAt+1200-performance.now());
  const onsetOverhead=gap.gap_end!-unit.timing.first_audio_received,latency=Math.max(0,first+onsetOverhead-gap.gap_start);
  const flushes=socket.send.mock.calls.map(([raw])=>JSON.parse(raw)).filter(e=>e.type==='flush');voice.close();expect(vi.getTimerCount()).toBe(0);return{latency,first,flushes};
 }
 const before=await replay(false);vi.useRealTimers();vi.useFakeTimers();const after=await replay(true);
 expect(Math.abs(before.latency-gap.gap_duration)).toBeLessThan(8);expect(after.latency).toBeLessThan(before.latency-3500);expect(after.flushes).not.toHaveLength(0);
 replayReports.push({unitId:unit.id,physicalGapMs:gap.gap_duration,frozenClientReplayMs:before.latency,candidateConservativeReplayMs:after.latency,translationReady:unit.timing.translation_ready,previousAudibleEnd:gap.gap_start,textWasAvailableInTime:unit.timing.translation_ready<=gap.gap_start-957.2,providerServiceMs:807.2});await writeFile('benchmarks/stage194-three-largest-gap-regressions.json',JSON.stringify({kind:'Independent gap replays anchored to original audible ends; conservative 807.2ms generation plus measured PCM-to-audible overhead. Not a whole-session acoustic prediction.',cases:replayReports},null,2)+'\n');
 if(unit.timing.translation_ready<=gap.gap_start-957.2)expect(after.latency).toBeLessThan(1000);
 else expect(after.latency).toBeLessThanOrEqual(unit.timing.translation_consumed-gap.gap_start+807.2+(gap.gap_end!-unit.timing.first_audio_received)+2);
});
it('bounds and adapts generation lead without delaying available audio or repeatedly flushing the same text',()=>{
 const demand=new VoiceDemand();expect(demand.leadMs).toBeCloseTo(957.2);expect(demand.shouldFlush(950,16,true)).toBe(true);expect(demand.shouldFlush(1200,16,true)).toBe(false);expect(demand.shouldFlush(0,16,false)).toBe(false);expect(demand.shouldFlush(0,0,true)).toBe(false);
 demand.observe(15000);expect(demand.leadMs).toBe(1800);for(let i=0;i<21;i++)demand.observe(300);expect(demand.leadMs).toBe(750);demand.observe(NaN);expect(demand.leadMs).toBe(750);
});
const request=(text:string,language:'en'|'da'='en'):UnitRequest=>({text,language,sourceHistory:'',targetHistory:'',conversationContext:'Faithful interpretation.',speakerRole:'agent',protectedTerms:[],precision:false,uncertaintyRouting:true});
it.each([['Hi, good morning','Hej, godmorgen'],['Good evening.','God aften.'],['Hello, good afternoon!','Hej, god eftermiddag!']])('translates the whole committed greeting %s without a provider round trip',async(source,target)=>{
 const fetch=vi.fn(()=>{throw Error('No provider access allowed');});vi.stubGlobal('fetch',fetch);const results=[];for await(const r of incrementalTranslation(request(source)))results.push(r);expect(results).toEqual([{type:'done',result:expect.objectContaining({translation:target,model:'validated-greeting-v1',needs_precision:false})}]);expect(fetch).not.toHaveBeenCalled();
});
it('keeps Danish greeting equivalence, protected precision and all extended/uncertain source on their existing path',()=>{
 expect(validatedGreeting(request('Hej, godmorgen','da'))?.translation).toBe('Hi, good morning');
 for(const text of ['Hi','Hi, good','Hi, good morning, I do not consent.','Good morning?','Good morning Dr. Smith','Good morning 5 mg','Studi a professional work.'])expect(validatedGreeting(request(text))).toBeUndefined();
 expect(validatedGreeting({...request('Hi, good morning'),precision:true})).toBeUndefined();expect(validatedGreeting({...request('Hi, good morning'),protectedTerms:['morning']})).toBeUndefined();expect(validatedGreeting({...request('Hi, good morning'),uncertaintyRouting:false})).toBeUndefined();
});
it('does not bypass cancellation even for a whole greeting',async()=>{const abort=new AbortController();abort.abort();await expect(incrementalTranslation(request('Hi, good morning'),abort.signal).next()).rejects.toThrow();});
it('does not mistake a later initialSentence flag for a second gateway initial flush',async()=>{
 const voice=new ContinuousVoice(()=>{},true,true,undefined,{simultaneous:true,queuedMs:()=>0,expectedVoice:fixtureVoice});const opening=voice.open('da',new AbortController().signal);Socket.last.event({type:'ready',voice:fixtureVoice});await opening;voice.send('Hej, godmorgen');voice.send('Vi ringer nu.');await vi.advanceTimersByTimeAsync(250);expect(Socket.last.send.mock.calls.map(([raw])=>JSON.parse(raw)).filter(c=>c.type==='flush')).toHaveLength(1);voice.close();expect(vi.getTimerCount()).toBe(0);
});
it('flushes a standalone validated short greeting after its bounded prosody hold even before any PCM',async()=>{
 const voice=new ContinuousVoice(()=>{},true,true,undefined,{simultaneous:true,queuedMs:()=>0,expectedVoice:fixtureVoice});const opening=voice.open('da',new AbortController().signal);Socket.last.event({type:'ready',voice:fixtureVoice});await opening;voice.send('Hej.');await vi.advanceTimersByTimeAsync(250);expect(Socket.last.send.mock.calls.map(([raw])=>JSON.parse(raw)).filter(c=>c.type==='flush')).toHaveLength(1);voice.close();expect(vi.getTimerCount()).toBe(0);
});
