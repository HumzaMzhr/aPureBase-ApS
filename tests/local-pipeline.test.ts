import {fixtureVoice,fixtureCachedVoices,fixturePcm} from './fixtures/voice';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {LocalTestSession,type LocalOptions} from '../src/streaming/localSession';
import type {Language} from '../src/types';
import type {Alignment} from '../server/continuousVoice';
import {translateControlledTurn,translateLocalControlledTurn} from '../src/streaming/translationClient';

const mocks=vi.hoisted(()=>({recognizers:[] as {language?:Language;partial?:(text:string)=>void;open:ReturnType<typeof vi.fn>;append:ReturnType<typeof vi.fn>;finish:ReturnType<typeof vi.fn>;close:ReturnType<typeof vi.fn>}[],voices:[] as {audio:(bytes:Uint8Array,alignment?:Alignment,voice?:import('../src/streaming/voiceIdentity').VoiceIdentity)=>void;open:ReturnType<typeof vi.fn>;send:ReturnType<typeof vi.fn>;finish:ReturnType<typeof vi.fn>;close:ReturnType<typeof vi.fn>}[]}));
vi.mock('../src/liveTranscription',()=>({LiveTranscription:class{
 language?:Language;partial?:(text:string)=>void;
 open=vi.fn(async(language:Language,_signal:AbortSignal,partial:(text:string)=>void)=>{this.language=language;this.partial=partial;});append=vi.fn();finish=vi.fn(async()=>this.language==='en'?'Hello.':'Hej.');close=vi.fn();
 constructor(){mocks.recognizers.push(this);}
}}));
vi.mock('../src/streaming/voiceClient',()=>({ContinuousVoice:class{
 open=vi.fn(async()=>{});close=vi.fn();
 send=vi.fn((text:string)=>{const bytes=new Uint8Array(4800);new Int16Array(bytes.buffer).fill(8192);this.audio(fixturePcm(bytes),{chars:[...text],charStartTimesMs:[...text].map((_,i)=>i*10),charDurationsMs:[...text].map(()=>10)},fixtureVoice);});finish=vi.fn(async()=>{});
 constructor(public audio:(bytes:Uint8Array,alignment?:Alignment,voice?:import('../src/streaming/voiceIdentity').VoiceIdentity)=>void){mocks.voices.push(this);}
}}));
class Context {
 sampleRate=24000;state='running';destination={};samples:Float32Array[]=[];
 get currentTime(){return performance.now()/1000;}
 resume=vi.fn(async()=>{});close=vi.fn(async()=>{});setSinkId=vi.fn(async()=>{});audioWorklet={addModule:vi.fn(async()=>{})};
 inputEdges:unknown[]=[];
 createMediaStreamSource(){return{connect:(target:unknown)=>this.inputEdges.push(target),disconnect:vi.fn()};}
 createGain(){return{connect:vi.fn(),disconnect:vi.fn()};}
 createBuffer(_channels:number,length:number){const data=new Float32Array(length);this.samples.push(data);return{duration:length/24000,getChannelData:()=>data};}
 createBufferSource(){const node={buffer:undefined as {duration:number}|undefined,onended:null as null|(()=>void),timer:undefined as ReturnType<typeof setTimeout>|undefined,connect:vi.fn(),disconnect:vi.fn(),start:(at:number)=>{node.timer=setTimeout(()=>node.onended?.(),(at-this.currentTime+(node.buffer?.duration??0))*1000);},stop:()=>clearTimeout(node.timer)};return node;}
}
let contexts:Context[],worklet:{port:{onmessage?:((event:{data:unknown})=>void)|null;postMessage:ReturnType<typeof vi.fn>;close:ReturnType<typeof vi.fn>};options:unknown},getMicrophone:ReturnType<typeof vi.fn>,track:{enabled:boolean;onended:null;stop:ReturnType<typeof vi.fn>};
beforeEach(()=>{
 vi.useFakeTimers();mocks.recognizers=[];mocks.voices=[];contexts=[];
 vi.stubGlobal('AudioContext',class{constructor(){const context=new Context();contexts.push(context);return context;}});
 vi.stubGlobal('AudioWorkletNode',class{port={onmessage:null as null|((event:{data:unknown})=>void),postMessage:vi.fn((event:{type:string})=>{if(event.type==='checkpoint')this.port.onmessage?.({data:{type:'checkpointed'}});}),close:vi.fn()};disconnect=vi.fn();constructor(_context:unknown,_name:unknown,public options:unknown){worklet={port:this.port,options};}});
 track={enabled:true,onended:null,stop:vi.fn()};getMicrophone=vi.fn(async()=>({getAudioTracks:()=>[track],getTracks:()=>[track]}));vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:getMicrophone}});
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
const options:LocalOptions={source:'en',path:'semantic',cachedOpening:false,microphone:'chosen-input',output:'chosen-headphones',jitterMs:100,bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret only.'};
it.each(['en','da']as const)('runs default %s local components from the selected microphone through the unchanged semantic provider API to only target playback',async source=>{
 const fetcher=vi.fn(async(url:string,init?:RequestInit)=>{
  if(url==='/api/health')return new Response(JSON.stringify({ready:true,danishVoice:fixtureVoice,cachedVoices:fixtureCachedVoices,missingAudio:[]}));
  expect(url).toBe('/api/interpret/unit');expect(JSON.parse(String(init?.body)).language).toBe(source);
  return new Response(`data: ${JSON.stringify({type:'done',result:{translation:source==='en'?'Hej.':'Hello.',confidence:.99,needs_precision:false,model:'fixture-translation'}})}\n\n`);
 });vi.stubGlobal('fetch',fetcher);
 const session=new LocalTestSession({...options,source},()=>{});await session.prepare();
 expect(getMicrophone).toHaveBeenCalledWith({audio:{deviceId:{exact:'chosen-input'},echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
 const input=contexts.find(c=>c.inputEdges.length)!;const output=contexts.find(c=>c!==input)!;
 expect(worklet.options).toMatchObject({numberOfOutputs:0});expect(input.inputEdges).toHaveLength(1);expect(input.inputEdges[0]).toMatchObject(worklet);expect(input.inputEdges).not.toContain(input.destination);expect(input.samples).toHaveLength(0);expect(output.setSinkId).toHaveBeenCalledWith('chosen-headphones');
 const bytes=new Uint8Array(4800);new Int16Array(bytes.buffer).fill(2000);
 worklet.port.onmessage?.({data:{type:'pcm',audio:bytes.buffer}});await vi.advanceTimersByTimeAsync(100);worklet.port.onmessage?.({data:{type:'pcm',audio:bytes.buffer}});
 expect(mocks.recognizers[0].append).toHaveBeenCalledTimes(2);expect(output.samples).toHaveLength(0);
 mocks.recognizers[0].partial?.(source==='en'?'Hello.':'Hej.');
 const final=session.finish();await vi.advanceTimersByTimeAsync(500);await final;
 expect(mocks.voices[0].open).toHaveBeenCalledWith(source==='en'?'da':'en',expect.any(AbortSignal));
 expect(output.samples[0][0]).toBe(.25); // generated voice PCM; source samples were 2000/32768
 expect(input.samples).toHaveLength(0);expect(session.snapshot.lanes[source].source).toBe(source==='en'?'Hello.':'Hej.');expect(session.snapshot.lanes[source].target).toBe(source==='en'?'Hej.':'Hello.');
 expect(session.snapshot.firstPlaybackMs).toBeGreaterThanOrEqual(100);session.end();expect(track.stop).toHaveBeenCalledOnce();expect(contexts.every(c=>c.close.mock.calls.length===1)).toBe(true);expect(vi.getTimerCount()).toBe(0);
});
it('adds model telemetry only for local controlled evaluation, with identical endpoint, source and validated target',async()=>{
 const fetcher=vi.fn(async()=>new Response('data: {"type":"done","text":"Hej."}\n\n',{headers:{'X-Translation-Model':'fixture-careful'}}));vi.stubGlobal('fetch',fetcher);
 const request={text:'Hello.',language:'en' as const,sourceHistory:'',targetHistory:'',conversationContext:'',speakerRole:'agent' as const,protectedTerms:[],precision:true};
 const live=await translateControlledTurn(request,new AbortController().signal);const local=await translateLocalControlledTurn(request,new AbortController().signal);
 expect(live).toEqual({translation:'Hej.',confidence:1,needs_precision:false});expect(local.model).toBe('fixture-careful');expect(local.translation).toBe(live.translation);
 const [liveCall,localCall]=fetcher.mock.calls as unknown as [string,RequestInit][];
 expect(liveCall[0]).toBe(localCall[0]);expect(liveCall[1].body).toBe(localCall[1].body);expect(liveCall[1].headers).toEqual({'Content-Type':'application/json'});expect(localCall[1].headers).toMatchObject({'X-Interpreter-Metrics':'local'});
});
it('stops an actual late microphone permission grant without starting the pipeline',async()=>{
 let grant!:(stream:{getAudioTracks:()=>typeof track[];getTracks:()=>typeof track[]})=>void;
 getMicrophone.mockImplementation(()=>new Promise(r=>{grant=r;}));
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({ready:true,danishVoice:fixtureVoice,cachedVoices:fixtureCachedVoices,missingAudio:[]}))));
 const session=new LocalTestSession(options,()=>{}),pending=session.prepare();await vi.waitFor(()=>expect(getMicrophone).toHaveBeenCalled());session.end();
 grant({getAudioTracks:()=>[track],getTracks:()=>[track]});await expect(pending).rejects.toMatchObject({name:'AbortError'});
 expect(track.stop).toHaveBeenCalledOnce();expect(mocks.recognizers).toHaveLength(0);expect(contexts.every(c=>c.samples.length===0)).toBe(true);expect(vi.getTimerCount()).toBe(0);
});
