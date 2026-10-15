import {fixtureVoice,fixtureCachedVoices,fixtureHeaders} from './fixtures/voice';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {LocalOutput} from '../src/streaming/localOutput';
import type {SemanticUnit} from '../src/streaming/types';
import type {Alignment} from '../server/continuousVoice';

const voices=vi.hoisted(()=>({instances:[] as {audio:(bytes:Uint8Array,alignment?:Alignment,voice?:import('../src/streaming/voiceIdentity').VoiceIdentity)=>void;open:ReturnType<typeof vi.fn>;send:ReturnType<typeof vi.fn>;finish:ReturnType<typeof vi.fn>;close:ReturnType<typeof vi.fn>;early:boolean}[]}));
vi.mock('../src/streaming/voiceClient',()=>({ContinuousVoice:class{
 open=vi.fn(async()=>{});send=vi.fn();finish=vi.fn(async()=>{});close=vi.fn();
 constructor(public audio:(bytes:Uint8Array,alignment?:Alignment,voice?:import('../src/streaming/voiceIdentity').VoiceIdentity)=>void,public early=false){voices.instances.push(this);}
}}));
class Context {
 state='running';sampleRate=24000;destination={};buffers:Float32Array[]=[];
 resume=vi.fn(async()=>{});setSinkId=vi.fn(async()=>{});close=vi.fn(async()=>{});createMediaStreamSource=vi.fn();
 get currentTime(){return performance.now()/1000;}
 createGain(){return{connect:vi.fn(),disconnect:vi.fn()};}
 createBuffer(_channels:number,samples:number){const data=new Float32Array(samples);this.buffers.push(data);return{duration:samples/24000,getChannelData:()=>data};}
 createBufferSource(){const node={buffer:undefined as {duration:number}|undefined,onended:null as null|(()=>void),timer:undefined as ReturnType<typeof setTimeout>|undefined,connect:vi.fn(),disconnect:vi.fn(),start:(at:number)=>{node.timer=setTimeout(()=>node.onended?.(),(at-this.currentTime+(node.buffer?.duration??0))*1000);},stop:vi.fn(()=>clearTimeout(node.timer))};return node;}
 decodeAudioData=vi.fn(async()=>({getChannelData:()=>new Float32Array(2400).fill(.2)}));
}
const hooks=()=>({firstAudio:vi.fn(),scheduled:vi.fn(),started:vi.fn(),finished:vi.fn(),underrun:vi.fn()});
const unit:SemanticUnit={id:'u',turn:1,language:'en',start:0,end:1,source:'SOURCE MUST NEVER PLAY',target:'Hej.',status:'queued',precision:false,timing:{source_start:0,source_stable_at:100}};
let contexts:Context[],fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{
 vi.useFakeTimers();voices.instances=[];contexts=[];
 vi.stubGlobal('AudioContext',class{constructor(){const context=new Context();contexts.push(context);return context;}});
 fetcher=vi.fn(async(url:string)=>url==='/api/health'?new Response(JSON.stringify({ready:true,danishVoice:fixtureVoice,cachedVoices:fixtureCachedVoices,missingAudio:[]})):new Response(new Uint8Array(4800),{headers:fixtureHeaders}));vi.stubGlobal('fetch',fetcher);
});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it.each(['en','da']as const)('routes only translated %s target PCM to the selected headphones using the original continuous voice and renderer',async source=>{
 const h=hooks(),output=new LocalOutput(source,100,h),abort=new AbortController();await output.prepare('headphones-id',abort.signal);
 expect(contexts[0].setSinkId).toHaveBeenCalledWith('headphones-id');expect(contexts[0].createMediaStreamSource).not.toHaveBeenCalled();expect(contexts[0].buffers).toHaveLength(0);
 const stream=await output.open(source,1,abort.signal);const voice=voices.instances[0];expect(voice.open).toHaveBeenCalledWith(source==='en'?'da':'en',abort.signal);expect(voice.early).toBe(false);
 const target=source==='en'?'Hej.':'Hello.';stream.send({...unit,language:source,target});expect(voice.send).toHaveBeenCalledWith(target);expect(voice.send).not.toHaveBeenCalledWith(unit.source);
 const pcm=new Uint8Array(4800);new Int16Array(pcm.buffer).fill(8192);
 voice.audio(pcm,{chars:[...target],charStartTimesMs:[...target].map((_,i)=>i*10),charDurationsMs:[...target].map(()=>10)},fixtureVoice);
 expect(contexts[0].buffers).toHaveLength(1);expect(contexts[0].buffers[0][0]).toBe(.25);expect(h.firstAudio).toHaveBeenCalledWith(unit.id,expect.any(Number));
 const done=stream.finish();await vi.advanceTimersByTimeAsync(250);await done;expect(h.started).toHaveBeenCalledOnce();expect(h.finished).toHaveBeenCalledOnce();output.cancel();expect(vi.getTimerCount()).toBe(0);
});
it('refuses another source direction or a second renderer owner',async()=>{
 const output=new LocalOutput('en',100,hooks());await output.prepare('',new AbortController().signal);
 await expect(output.open('da',1,new AbortController().signal)).rejects.toThrow('isolation');expect(voices.instances).toHaveLength(0);
 const stream=await output.open('en',1,new AbortController().signal);expect(()=>output.renderer()).toThrow('already owned');stream.cancel();const next=output.renderer();next.cancel();output.release(next);output.cancel();
});
it('STOP closes the voice, stops scheduled output and rejects late provider chunks',async()=>{
 const output=new LocalOutput('en',100,hooks());await output.prepare('',new AbortController().signal);await output.open('en',1,new AbortController().signal);
 const voice=voices.instances[0];voice.audio(new Uint8Array(4800),undefined,fixtureVoice);output.cancel();voice.audio(new Uint8Array(4800),undefined,fixtureVoice);
 expect(voice.close).toHaveBeenCalledOnce();expect(contexts[0].close).toHaveBeenCalledOnce();expect(contexts[0].buffers).toHaveLength(1);expect(vi.getTimerCount()).toBe(0);
});
it('aborting a pending cached decode never schedules late audio',async()=>{
 const output=new LocalOutput('en',100,hooks()),abort=new AbortController();await output.prepare('',abort.signal);
 let release!:(buffer:{getChannelData:()=>Float32Array<ArrayBuffer>})=>void;
 contexts[0].decodeAudioData.mockImplementation(()=>new Promise(r=>{release=r;}));const pending=output.opening(abort.signal);
 await vi.waitFor(()=>expect(contexts[0].decodeAudioData).toHaveBeenCalled());abort.abort();output.cancel();release({getChannelData:()=>new Float32Array(2400)});
 await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(contexts[0].buffers).toHaveLength(0);expect(vi.getTimerCount()).toBe(0);
});
it('preserves the exact cached opening file and forbids it on the English listening bus',async()=>{
 const output=new LocalOutput('en',100,hooks());await output.prepare('',new AbortController().signal);const pending=output.opening(new AbortController().signal);await vi.advanceTimersByTimeAsync(250);await pending;
 expect(fetcher).toHaveBeenCalledWith('/audio/opening.wav',expect.anything());expect(voices.instances).toHaveLength(0);output.cancel();
 const english=new LocalOutput('da',100,hooks());await english.prepare('',new AbortController().signal);await expect(english.opening(new AbortController().signal)).rejects.toThrow('only available');english.cancel();
});
it.each(['en','da']as const)('controlled %s fallback preserves the existing target provider split',async source=>{
 const output=new LocalOutput(source,100,hooks());await output.prepare('headphones-id',new AbortController().signal);
 const stream=await output.controlled(source,1,new AbortController().signal);stream.send({...unit,language:source,target:source==='en'?'Hej.':'Hello.'});
 const done=stream.finish();await vi.advanceTimersByTimeAsync(300);await done;
 const speechCall=fetcher.mock.calls.find(([url])=>url=== (source==='en'?'/api/speech/stream':'/api/speech'))!;
 expect(speechCall).toBeTruthy();expect(JSON.parse(String(speechCall[1].body))).toMatchObject({language:source==='en'?'da':'en',text:source==='en'?'Hej.':'Hello.'});
 expect(contexts[0].decodeAudioData).toHaveBeenCalledTimes(source==='en'?0:1);expect(voices.instances).toHaveLength(0);expect(contexts[0].buffers.length).toBeGreaterThan(0);output.cancel();
});
it('rejects unavailable cached/service health before microphone input can be enabled',async()=>{
 fetcher.mockResolvedValue(new Response(JSON.stringify({ready:true,danishVoice:fixtureVoice,cachedVoices:fixtureCachedVoices,missingAudio:['opening']})));
 const output=new LocalOutput('en',100,hooks());await expect(output.prepare('',new AbortController().signal)).rejects.toThrow('not ready');output.cancel();expect(contexts[0].buffers).toHaveLength(0);
});
it('audits the first and later HCP segments with configured provenance, source range and actual playback times',async()=>{
 const audit=vi.fn(),h={...hooks(),audit},output=new LocalOutput('en',100,h,{simultaneous:true});await output.prepare('',new AbortController().signal);const stream=await output.open('en',7,new AbortController().signal);const identity={...fixtureVoice,requestId:'one-Isabella-generation'};const targets=['Hej, godmorgen.','Jeg hedder Humza.'];let offset=0;
 for(let n=0;n<targets.length;n++){stream.send({...unit,id:`segment-${n}`,turn:7,start:n*4,end:(n+1)*4,target:targets[n]});const text=targets[n]+' ',bytes=new Uint8Array(4800);new Int16Array(bytes.buffer).fill(6000);voices.instances[0].audio(bytes,{chars:[...text],charStartTimesMs:[...text].map((_,i)=>offset+i*100/text.length),charDurationsMs:[...text].map(()=>100/text.length)},identity);offset+=100;}
 const done=stream.finish();await vi.advanceTimersByTimeAsync(300);await done;const ends=audit.mock.calls.map(c=>c[0]).filter(e=>e.type==='HCP_OUTPUT_DA_SEGMENT_END');expect(ends).toHaveLength(2);for(let n=0;n<ends.length;n++){expect(ends[n]).toMatchObject({segmentId:`segment-${n}`,sourceRange:{start:n*4,end:(n+1)*4},translatedText:targets[n],...identity,cached:false});expect(ends[n].playbackStart).toBeLessThan(ends[n].playbackEnd);}output.cancel();expect(vi.getTimerCount()).toBe(0);
});
it('rejects a wrong first voice before any sample, alignment callback or fallback can reach the local Danish renderer',async()=>{
 const h=hooks(),output=new LocalOutput('en',100,h,{simultaneous:true});await output.prepare('',new AbortController().signal);await output.open('en',1,new AbortController().signal);expect(()=>voices.instances[0].audio(new Uint8Array(4800),undefined,{...fixtureVoice,voiceId:'wrong-first-voice'})).toThrow('configured');expect(contexts[0].buffers).toHaveLength(0);expect(h.firstAudio).not.toHaveBeenCalled();output.cancel();expect(vi.getTimerCount()).toBe(0);
});
