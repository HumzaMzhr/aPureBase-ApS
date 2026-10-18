import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ContinuousRecognitionDirection} from '../src/streaming/continuousRecognition';
import type {RecognitionEvent} from '../src/streaming/continuousTranscriptionClient';
import {StreamingInterpreter} from '../src/streaming/engine';
import {words} from '../src/streaming/semantic';
import type {SemanticUnit} from '../src/streaming/types';
const transport=vi.hoisted(()=>({open:vi.fn(async()=>{}),append:vi.fn(),commit:vi.fn(),close:vi.fn(),event:undefined as undefined|((e:RecognitionEvent)=>void),error:undefined as undefined|((e:Error)=>void)}));
vi.mock('../src/streaming/continuousTranscriptionClient',()=>({ContinuousTranscription:class{model='gpt-live-transcribe';delay='low';open=transport.open;append=transport.append;commit=transport.commit;close=transport.close;constructor(event:(e:RecognitionEvent)=>void,error:(e:Error)=>void){transport.event=event;transport.error=error;}}}));
beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function setup(language:'en'|'da'='en',interpreter?:StreamingInterpreter){
 const engine={sourceStarted:vi.fn(),partial:vi.fn(),finalized:vi.fn(),snapshot:{lanes:{[language]:{precision:''}}}};const failure=vi.fn(),progress=vi.fn(),abort=new AbortController();
 const recognition=new ContinuousRecognitionDirection(language,interpreter??engine as unknown as StreamingInterpreter,abort.signal,language==='en'?450:1350,failure,undefined,progress);
 const bytes=new Uint8Array(4800);new Int16Array(bytes.buffer).fill(2000);
 return{recognition,engine,failure,progress,abort,bytes};
}
// Supply observed quiet PCM; elapsed wall time alone no longer finalizes an item.
async function quiet(s:ReturnType<typeof setup>){for(let i=0;i<5;i++){await vi.advanceTimersByTimeAsync(100);s.recognition.feed(new Uint8Array(4800));}}
it.each(['en','da']as const)('consumes 45 seconds of continuous %s speech and drains its final after natural silence',async language=>{
 const s=setup(language);await s.recognition.open();
 for(let n=0;n<450;n++){s.recognition.feed(s.bytes);if(n%20===0)transport.event?.({type:'partial',generation:0,text:`Live source ${n}.`});await vi.advanceTimersByTimeAsync(100);}
 expect(transport.append).toHaveBeenCalledTimes(450);expect(transport.open).toHaveBeenCalledOnce();expect(transport.commit).not.toHaveBeenCalled();expect(s.failure).not.toHaveBeenCalled();
 const silenceFrames=language==='en'?5:14;
 for(let n=0;n<silenceFrames;n++){s.recognition.feed(new Uint8Array(4800));await vi.advanceTimersByTimeAsync(100);}
 expect(transport.commit).toHaveBeenCalledExactlyOnceWith(0);transport.event?.({type:'final',generation:0,text:'Complete continuous source.'});await s.recognition.finish();
 expect(s.engine.finalized).toHaveBeenCalledExactlyOnceWith(language,'Complete continuous source.');expect(s.progress.mock.calls.at(-1)?.[0]).toMatchObject({sourceSamples:(450+silenceFrames)*2400,pendingFinals:0,finalizedItems:1});s.recognition.cancel();expect(vi.getTimerCount()).toBe(0);
});
it('keeps consuming 8 seconds of next-turn PCM while an older final waits, instead of overflowing the old 3-second queue',async()=>{
 const s=setup();await s.recognition.open();s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);
 await quiet(s);expect(transport.commit).toHaveBeenCalledWith(0);
 for(let n=0;n<80;n++){s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);}
 transport.event?.({type:'partial',generation:1,text:'Next complete sentence.'});await quiet(s);transport.event?.({type:'final',generation:1,text:'Next complete sentence.'});
 expect(s.engine.finalized).not.toHaveBeenCalled();transport.event?.({type:'final',generation:0,text:'First complete sentence.'});
 expect(s.engine.finalized.mock.calls.map(call=>call[1])).toEqual(['First complete sentence.','Next complete sentence.']);expect(transport.append).toHaveBeenCalledTimes(92);expect(transport.open).toHaveBeenCalledOnce();expect(s.failure).not.toHaveBeenCalled();s.recognition.cancel();
});
it('does not mix later ASR partial text into an earlier active semantic turn',async()=>{
 const s=setup();await s.recognition.open();s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);transport.event?.({type:'partial',generation:0,text:'First phrase.'});
 await quiet(s);s.recognition.feed(s.bytes);transport.event?.({type:'partial',generation:1,text:'SECOND SOURCE'});
 expect(s.engine.partial).not.toHaveBeenCalledWith('en','SECOND SOURCE');expect(s.progress.mock.calls.at(-1)?.[0].pendingSource).toBe('SECOND SOURCE');transport.event?.({type:'final',generation:0,text:'First phrase.'});
 expect(s.engine.partial).toHaveBeenCalledWith('en','SECOND SOURCE');s.recognition.cancel();
});
it('cleans up finalization and ignores late source/ASR events on STOP',async()=>{
 const s=setup();await s.recognition.open();s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);
 const pending=s.recognition.finish();const stopped=expect(pending).rejects.toMatchObject({name:'AbortError'});s.recognition.cancel();await stopped;
 transport.event?.({type:'final',generation:0,text:'late'});s.recognition.feed(s.bytes);expect(s.engine.finalized).not.toHaveBeenCalled();expect(transport.append).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
});
it('uses retained source only for consequential exact identity, while continuing next-turn input',async()=>{
 const s=setup();s.engine.snapshot.lanes.en.precision='ASR uncertain protected name: Humza';let resolve!:(r:Response)=>void;
 const fetcher=vi.fn(()=>new Promise<Response>(r=>{resolve=r;}));vi.stubGlobal('fetch',fetcher);await s.recognition.open();s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);await quiet(s);
 transport.event?.({type:'final',generation:0,text:'The legal name is Hamza.'});s.recognition.feed(s.bytes);expect(transport.append).toHaveBeenCalledTimes(8);
 resolve(new Response(JSON.stringify({text:'The legal name is Humza.'})));await vi.waitFor(()=>expect(s.engine.finalized).toHaveBeenCalledWith('en','The legal name is Humza.'));expect(fetcher).toHaveBeenCalledWith('/api/transcribe',expect.objectContaining({body:expect.any(Blob)}));s.recognition.cancel();
});
it('fails clearly on provider disconnect, stops append, and permits a fresh session without replay',async()=>{
 const s=setup();await s.recognition.open();s.recognition.feed(s.bytes);transport.error?.(new Error('Disconnected'));s.recognition.feed(s.bytes);
 expect(s.failure).toHaveBeenCalledOnce();expect(transport.append).toHaveBeenCalledOnce();expect(transport.close).toHaveBeenCalledOnce();const next=setup();await next.recognition.open();expect(transport.open).toHaveBeenCalledTimes(2);next.recognition.cancel();
});
it.each(['My name is Hamza.','Calling on behalf of PureBase.','Calling on behalf of a PureBase.','Calling on behalf of a pure base.'])('does not re-transcribe or interrupt a known spoken campaign variant: %s',async text=>{
 const s=setup();const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);s.engine.snapshot.lanes.en.precision='ASR uncertain protected name: Humza';await s.recognition.open();
 s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);transport.event?.({type:'partial',generation:0,text});await quiet(s);transport.event?.({type:'final',generation:0,text});
 await vi.waitFor(()=>expect(s.engine.finalized).toHaveBeenCalledWith('en',text));expect(fetcher).not.toHaveBeenCalled();expect(s.failure).not.toHaveBeenCalled();expect(s.progress.mock.calls.at(-1)?.[0].recognizedSource).toContain(text);s.recognition.feed(s.bytes);expect(transport.append).toHaveBeenCalledTimes(8);s.recognition.cancel();
});

// Provider completion order is independent of microphone/commit order. Keep
// emitting PCM while finals wait; no timer extension or provider retry is used.
async function turn(s:ReturnType<typeof setup>,generation:number,text:string,complete=true){
 for(let n=0;n<10;n++){s.recognition.feed(s.bytes);if(n===2||n===7)transport.event?.({type:'partial',generation,text});await vi.advanceTimersByTimeAsync(100);}
 for(let n=0;n<5;n++){s.recognition.feed(new Uint8Array(4800));await vi.advanceTimersByTimeAsync(100);}
 expect(s.failure).not.toHaveBeenCalled();
 expect(transport.commit).toHaveBeenLastCalledWith(generation);
 if(complete)transport.event?.({type:'final',generation,text});
}
it('does not mistake later completed items retained behind a delayed final for a provider stall',async()=>{
 const s=setup();await s.recognition.open();const texts=Array.from({length:9},(_,n)=>`Complete source item ${n}.`);
 for(let n=0;n<texts.length;n++)await turn(s,n,texts[n],n!==0);
 expect(s.failure).not.toHaveBeenCalled();expect(transport.commit).toHaveBeenCalledTimes(9);expect(transport.append).toHaveBeenCalledTimes(135);
 expect(s.engine.finalized).not.toHaveBeenCalled();expect(s.progress.mock.calls.at(-1)?.[0].pendingFinals).toBe(1);
 // The final is delayed by 12 seconds, safely inside the unchanged watchdog.
 const drain=s.recognition.finish();transport.event?.({type:'final',generation:0,text:texts[0]});await drain;
 expect(s.engine.finalized.mock.calls.map(call=>call[1])).toEqual(texts);
 expect(s.progress.mock.calls.at(-1)?.[0]).toMatchObject({pendingFinals:0,finalizedItems:9});s.recognition.cancel();expect(vi.getTimerCount()).toBe(0);
});
it('treats a received final as terminal while it waits for an earlier item',async()=>{
 const s=setup();await s.recognition.open();await turn(s,0,'First source.',false);await turn(s,1,'Second source.');
 transport.event?.({type:'final',generation:1,text:'Duplicate must not replace second source.'});transport.event?.({type:'partial',generation:1,text:'Late delta must not change source.'});
 expect(s.progress.mock.calls.at(-1)?.[0].pendingFinals).toBe(1);
 transport.event?.({type:'final',generation:0,text:'First source.'});transport.event?.({type:'final',generation:0,text:'Late duplicate.'});
 expect(s.engine.finalized.mock.calls.map(call=>call[1])).toEqual(['First source.','Second source.']);expect(s.failure).not.toHaveBeenCalled();s.recognition.cancel();
});
it('finalizes an earlier item while later speech keeps appending and emitting partials',async()=>{
 const s=setup();await s.recognition.open();await turn(s,0,'First source.',false);
 for(let n=0;n<30;n++){
  s.recognition.feed(s.bytes);transport.event?.({type:'partial',generation:1,text:`Later source continues ${n}.`});
  if(n===10)transport.event?.({type:'final',generation:0,text:'First source.'});await vi.advanceTimersByTimeAsync(100);
 }
 expect(s.engine.finalized).toHaveBeenCalledExactlyOnceWith('en','First source.');expect(s.engine.partial).toHaveBeenLastCalledWith('en','Later source continues 29.');expect(transport.append).toHaveBeenCalledTimes(45);
 const drain=s.recognition.finish();transport.event?.({type:'final',generation:1,text:'Later source continues.'});await drain;expect(s.progress.mock.calls.at(-1)?.[0].pendingFinals).toBe(0);expect(s.failure).not.toHaveBeenCalled();s.recognition.cancel();
});
it('does not run the provider watchdog on a final already received during existing precision processing',async()=>{
 const s=setup();let resolve!:(r:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(r=>{resolve=r;})));await s.recognition.open();
 await turn(s,0,'The legal name is Hamza.');await vi.advanceTimersByTimeAsync(31000);
 expect(s.failure).not.toHaveBeenCalled();expect(s.progress.mock.calls.at(-1)?.[0].pendingFinals).toBe(0);
 resolve(new Response(JSON.stringify({text:'The legal name is Humza.'})));await vi.waitFor(()=>expect(s.engine.finalized).toHaveBeenCalledExactlyOnceWith('en','The legal name is Humza.'));s.recognition.cancel();
});
it('still fails at the existing pending-provider limit when no finals arrive',async()=>{
 const s=setup();await s.recognition.open();for(let n=0;n<3;n++)await turn(s,n,`Unfinished source ${n}.`,false);
 s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);await quiet(s);
 expect(s.failure).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({message:expect.stringContaining('Recognition finalization is stalled')}));expect(transport.commit).toHaveBeenCalledTimes(3);expect(transport.close).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
it('still times out a genuinely missing provider final without increasing the watchdog',async()=>{
 const s=setup();await s.recognition.open();await turn(s,0,'Missing final source.',false);const drain=s.recognition.finish();const failed=expect(drain).rejects.toThrow('finalization timed out');
 await vi.advanceTimersByTimeAsync(30050);await failed;expect(s.failure).toHaveBeenCalledOnce();expect(transport.close).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
it('STOP clears received-but-blocked finals and rejects drain without later semantic delivery',async()=>{
 const s=setup();await s.recognition.open();await turn(s,0,'First source.',false);await turn(s,1,'Second source.');
 const drain=s.recognition.finish();const stopped=expect(drain).rejects.toMatchObject({name:'AbortError'});s.recognition.cancel();await stopped;
 transport.event?.({type:'final',generation:0,text:'First source.'});transport.event?.({type:'final',generation:1,text:'Second source.'});s.recognition.feed(s.bytes);
 expect(s.engine.finalized).not.toHaveBeenCalled();expect(transport.append).toHaveBeenCalledTimes(30);expect(transport.close).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
it('runs 45 seconds through the actual semantic engine with out-of-order finals, no missing/duplicate units, and complete output drain',async()=>{
 const texts=['We are calling the clinic.','We can send information.','We work with your team.','We are contacting the office.','We can explain the service.','We have more information.','We can call again.','We are here to help.','We can speak later.'];
 const sent:string[]=[],finish=vi.fn(async()=>{}),failed=vi.fn();
 const engine=new StreamingInterpreter({now:()=>performance.now(),translate:vi.fn(async()=>({translation:'Vi ringer til klinikken.',confidence:.99,needs_precision:false})),output:vi.fn(async()=>({send:(unit:SemanticUnit)=>sent.push(unit.id),finish,cancel:vi.fn()})),pauseInput:vi.fn(),failed},()=>{},{bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret faithfully.',scopedPrecision:true,simultaneous:true});
 engine.start();const s=setup('en',engine);await s.recognition.open();
 // Five groups of 9 seconds. Every group contains three normal speech items;
 // the oldest final arrives after the later two and after next speech begins.
 const expected:string[]=[];
 for(let group=0;group<5;group++){
  for(let item=0;item<3;item++){
   const generation=group*3+item,text=texts[generation%texts.length];expected.push(text);
   for(let frame=0;frame<25;frame++){s.recognition.feed(s.bytes);if(frame===2||frame===12||frame===22)transport.event?.({type:'partial',generation,text});if(item===2&&frame===10)transport.event?.({type:'final',generation:generation-2,text:expected[generation-2]});await vi.advanceTimersByTimeAsync(100);}
   for(let frame=0;frame<5;frame++){s.recognition.feed(new Uint8Array(4800));await vi.advanceTimersByTimeAsync(100);}
   if(item!==0)transport.event?.({type:'final',generation,text});
   if(item===2){transport.event?.({type:'final',generation,text});transport.event?.({type:'final',generation:group*3,text:expected[group*3]});}
  }
 }
 await s.recognition.finish();await vi.waitFor(()=>expect(engine.idle).toBe(true));
 const units=engine.snapshot.lanes.en.units;
 expect(s.failure).not.toHaveBeenCalled();expect(failed).not.toHaveBeenCalled();expect(transport.append).toHaveBeenCalledTimes(450);expect(transport.open).toHaveBeenCalledOnce();expect(transport.commit).toHaveBeenCalledTimes(15);
 expect(engine.snapshot.lanes.en.source.split('\n')).toEqual(expected);expect(units.map(u=>u.source)).toEqual(expected);expect(new Set(units.map(u=>u.id)).size).toBe(15);expect(sent).toEqual(units.map(u=>u.id));expect(engine.snapshot.lanes.en.committedWords).toBe(words(expected.join(' ')).length);
 expect(finish.mock.calls.length).toBeGreaterThan(0);expect(finish.mock.calls.length).toBeLessThan(15);expect(engine.hasActiveSource).toBe(false);expect(s.progress.mock.calls.at(-1)?.[0]).toMatchObject({pendingFinals:0,finalizedItems:15,sourceSamples:1080000});
 s.recognition.cancel();engine.end();expect(vi.getTimerCount()).toBe(0);
});

it.each(['',' \n\t '])('continues after 119 fully spoken words followed by a legitimate empty final %j',async empty=>{
 const sent:string[]=[],failed=vi.fn();
 const engine=new StreamingInterpreter({now:()=>performance.now(),translate:vi.fn(async input=>({translation:input.text,confidence:.99,needs_precision:false})),output:vi.fn(async()=>({send:(unit:SemanticUnit)=>{sent.push(unit.id);engine.playback(unit.id,'firstAudio',performance.now());engine.playback(unit.id,'started',performance.now());engine.playback(unit.id,'finished',performance.now());},finish:async()=>{},cancel:vi.fn()})),pauseInput:vi.fn(),failed},()=>{},{bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret faithfully.',scopedPrecision:true,simultaneous:true});
 engine.start();const s=setup('en',engine);await s.recognition.open();
 const source=Array(23).fill('We are calling the clinic.').join(' ')+' We can call later.';
 expect(words(source)).toHaveLength(119);await turn(s,0,source);await vi.waitFor(()=>expect(engine.idle).toBe(true));
 expect(engine.snapshot.lanes.en).toMatchObject({receivedWords:119,committedWords:119,translatedWords:119,spokenWords:119});const previous=sent.length;
 // Noise/VAD can commit a real audio buffer without producing any words.
 s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);await quiet(s);
 expect(transport.commit).toHaveBeenLastCalledWith(1);transport.event?.({type:'final',generation:1,text:empty});await s.recognition.finish();await vi.waitFor(()=>expect(engine.idle).toBe(true));
 expect(s.failure).not.toHaveBeenCalled();expect(failed).not.toHaveBeenCalled();expect(sent).toHaveLength(previous);expect(engine.hasActiveSource).toBe(false);
 expect(engine.snapshot.lanes.en).toMatchObject({receivedWords:119,committedWords:119,translatedWords:119,spokenWords:119});expect(s.progress.mock.calls.at(-1)?.[0]).toMatchObject({pendingFinals:0,finalizedItems:2});
 transport.event?.({type:'final',generation:1,text:empty});await turn(s,2,'Thank you for your time.');await s.recognition.finish();await vi.waitFor(()=>expect(engine.idle).toBe(true));
 expect(engine.snapshot.lanes.en).toMatchObject({receivedWords:124,committedWords:124,translatedWords:124,spokenWords:124});expect(sent).toEqual(engine.snapshot.lanes.en.units.map(u=>u.id));expect(new Set(sent).size).toBe(sent.length);
 s.recognition.cancel();engine.end();expect(vi.getTimerCount()).toBe(0);
});
it('does not erase retained partial speech when a conflicting empty final arrives',async()=>{
 const s=setup();await s.recognition.open();await turn(s,0,'Retained source.',false);transport.event?.({type:'final',generation:0,text:''});
 expect(s.failure).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({message:expect.stringContaining('empty final for retained source text')}));expect(s.engine.finalized).not.toHaveBeenCalled();expect(transport.close).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
it('a silent final behind an earlier pending item cannot block the following semantic generation',async()=>{
 const s=setup();await s.recognition.open();await turn(s,0,'Earlier source.',false);
 s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);await quiet(s);transport.event?.({type:'final',generation:1,text:''});
 await turn(s,2,'Later source.');expect(s.engine.finalized).not.toHaveBeenCalled();expect(s.progress.mock.calls.at(-1)?.[0].pendingFinals).toBe(1);
 transport.event?.({type:'final',generation:0,text:'Earlier source.'});await s.recognition.finish();expect(s.engine.finalized.mock.calls.map(c=>c[1]).filter(Boolean)).toEqual(['Earlier source.','Later source.']);expect(s.progress.mock.calls.at(-1)?.[0]).toMatchObject({pendingFinals:0,finalizedItems:3});expect(s.failure).not.toHaveBeenCalled();s.recognition.cancel();
});
