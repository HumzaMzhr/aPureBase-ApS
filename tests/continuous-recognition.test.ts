import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ContinuousRecognitionDirection} from '../src/streaming/continuousRecognition';
import type {RecognitionEvent} from '../src/streaming/continuousTranscriptionClient';
import type {StreamingInterpreter} from '../src/streaming/engine';
const transport=vi.hoisted(()=>({open:vi.fn(async()=>{}),append:vi.fn(),commit:vi.fn(),close:vi.fn(),event:undefined as undefined|((e:RecognitionEvent)=>void),error:undefined as undefined|((e:Error)=>void)}));
vi.mock('../src/streaming/continuousTranscriptionClient',()=>({ContinuousTranscription:class{model='gpt-live-transcribe';delay='low';open=transport.open;append=transport.append;commit=transport.commit;close=transport.close;constructor(event:(e:RecognitionEvent)=>void,error:(e:Error)=>void){transport.event=event;transport.error=error;}}}));
beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function setup(language:'en'|'da'='en'){
 const engine={sourceStarted:vi.fn(),partial:vi.fn(),finalized:vi.fn(),snapshot:{lanes:{[language]:{precision:''}}}};const failure=vi.fn(),progress=vi.fn(),abort=new AbortController();
 const recognition=new ContinuousRecognitionDirection(language,engine as unknown as StreamingInterpreter,abort.signal,language==='en'?450:1350,failure,undefined,progress);
 const bytes=new Uint8Array(4800);new Int16Array(bytes.buffer).fill(2000);
 return{recognition,engine,failure,progress,abort,bytes};
}
it.each(['en','da']as const)('consumes 30 seconds of continuous %s speech with one socket and no recognition audio queue',async language=>{
 const s=setup(language);await s.recognition.open();
 for(let n=0;n<300;n++){s.recognition.feed(s.bytes);if(n%20===0)transport.event?.({type:'partial',generation:0,text:`Live source ${n}.`});await vi.advanceTimersByTimeAsync(100);}
 expect(transport.append).toHaveBeenCalledTimes(300);expect(transport.open).toHaveBeenCalledOnce();expect(s.failure).not.toHaveBeenCalled();
 const final=s.recognition.finish();transport.event?.({type:'final',generation:0,text:'Complete 30 second source.'});await final;
 expect(s.engine.finalized).toHaveBeenCalledWith(language,'Complete 30 second source.');expect(s.progress.mock.calls.at(-1)?.[0].sourceSamples).toBe(720000);s.recognition.cancel();expect(vi.getTimerCount()).toBe(0);
});
it('keeps consuming 8 seconds of next-turn PCM while an older final waits, instead of overflowing the old 3-second queue',async()=>{
 const s=setup();await s.recognition.open();s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);
 await vi.advanceTimersByTimeAsync(500);expect(transport.commit).toHaveBeenCalledWith(0);
 for(let n=0;n<80;n++){s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);}
 transport.event?.({type:'partial',generation:1,text:'Next complete sentence.'});await vi.advanceTimersByTimeAsync(500);transport.event?.({type:'final',generation:1,text:'Next complete sentence.'});
 expect(s.engine.finalized).not.toHaveBeenCalled();transport.event?.({type:'final',generation:0,text:'First complete sentence.'});
 expect(s.engine.finalized.mock.calls.map(call=>call[1])).toEqual(['First complete sentence.','Next complete sentence.']);expect(transport.append).toHaveBeenCalledTimes(82);expect(transport.open).toHaveBeenCalledOnce();expect(s.failure).not.toHaveBeenCalled();s.recognition.cancel();
});
it('does not mix later ASR partial text into an earlier active semantic turn',async()=>{
 const s=setup();await s.recognition.open();s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);transport.event?.({type:'partial',generation:0,text:'First phrase.'});
 await vi.advanceTimersByTimeAsync(500);transport.event?.({type:'partial',generation:1,text:'SECOND SOURCE'});
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
 const fetcher=vi.fn(()=>new Promise<Response>(r=>{resolve=r;}));vi.stubGlobal('fetch',fetcher);await s.recognition.open();s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(500);
 transport.event?.({type:'final',generation:0,text:'The legal name is Hamza.'});s.recognition.feed(s.bytes);expect(transport.append).toHaveBeenCalledTimes(3);
 resolve(new Response(JSON.stringify({text:'The legal name is Humza.'})));await vi.waitFor(()=>expect(s.engine.finalized).toHaveBeenCalledWith('en','The legal name is Humza.'));expect(fetcher).toHaveBeenCalledWith('/api/transcribe',expect.objectContaining({body:expect.any(Blob)}));s.recognition.cancel();
});
it('fails clearly on provider disconnect, stops append, and permits a fresh session without replay',async()=>{
 const s=setup();await s.recognition.open();s.recognition.feed(s.bytes);transport.error?.(new Error('Disconnected'));s.recognition.feed(s.bytes);
 expect(s.failure).toHaveBeenCalledOnce();expect(transport.append).toHaveBeenCalledOnce();expect(transport.close).toHaveBeenCalledOnce();const next=setup();await next.recognition.open();expect(transport.open).toHaveBeenCalledTimes(2);next.recognition.cancel();
});
it.each(['My name is Hamza.','Calling on behalf of PureBase.','Calling on behalf of a PureBase.','Calling on behalf of a pure base.'])('does not re-transcribe or interrupt a known spoken campaign variant: %s',async text=>{
 const s=setup();const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);s.engine.snapshot.lanes.en.precision='ASR uncertain protected name: Humza';await s.recognition.open();
 s.recognition.feed(s.bytes);await vi.advanceTimersByTimeAsync(100);s.recognition.feed(s.bytes);transport.event?.({type:'partial',generation:0,text});await vi.advanceTimersByTimeAsync(500);transport.event?.({type:'final',generation:0,text});
 await vi.waitFor(()=>expect(s.engine.finalized).toHaveBeenCalledWith('en',text));expect(fetcher).not.toHaveBeenCalled();expect(s.failure).not.toHaveBeenCalled();expect(s.progress.mock.calls.at(-1)?.[0].recognizedSource).toContain(text);s.recognition.feed(s.bytes);expect(transport.append).toHaveBeenCalledTimes(3);s.recognition.cancel();
});
