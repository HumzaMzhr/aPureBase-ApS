import {fixtureVoice,fixtureCachedVoices,fixtureHeaders} from './fixtures/voice';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BrowserCallIO } from '../src/browserAudio';
import type { CallOptions } from '../src/types';
class Track { enabled=true; readyState='live'; onended:(()=>void)|null=null;stop=vi.fn(()=>{this.readyState='ended';}); }
class Stream { track=new Track();getAudioTracks(){return [this.track];}getTracks(){return [this.track];} }
class Context {
  get currentTime(){return performance.now()/1000;}
  destination={};
  createGain(){return {connect:vi.fn(),disconnect:vi.fn()};}
  createBuffer(_channels:number,samples:number,rate:number){const data=new Float32Array(samples);return {duration:samples/rate,getChannelData:()=>data};}
  createBufferSource(){
    const node={buffer:undefined as {duration:number}|undefined,onended:null as (()=>void)|null,timer:undefined as ReturnType<typeof setTimeout>|undefined,connect:vi.fn(),disconnect:vi.fn(),stop:()=>clearTimeout(node.timer),start:(at:number)=>{node.timer=setTimeout(()=>node.onended?.(),(at-this.currentTime+(node.buffer?.duration??0))*1000);}};return node;
  }
  setSinkId=vi.fn(async()=>{});
  state='running';resume=vi.fn(async()=>{});close=vi.fn(async()=>{});
  createMediaStreamSource(){return {connect:vi.fn(),disconnect:vi.fn()};}
  createAnalyser(){return {fftSize:1024,getFloatTimeDomainData:(b:Float32Array)=>b.fill(.04),disconnect:vi.fn()};}
}
class AudioMock {
  static last:AudioMock;src='';onplaying:(()=>void)|null=null;onended:(()=>void)|null=null;onerror:(()=>void)|null=null;
  constructor(){AudioMock.last=this;}
  play=vi.fn(async()=>{this.onplaying?.();});pause=vi.fn();load=vi.fn();removeAttribute=vi.fn();setSinkId=vi.fn(async()=>{});
}
class Recorder {
  static isTypeSupported=()=>true;state='inactive';ondataavailable:((e:{data:Blob})=>void)|null=null;onstop:(()=>void)|null=null;onerror:(()=>void)|null=null;
  start(){this.state='recording';}stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['complete'])});this.onstop?.();});}
}
let streams:Stream[];
const options:CallOptions={demo:false,scenario:'callback',silenceMs:650,manual:true,agentMic:'agent',clinicMic:'clinic',agentOutput:'',clinicOutput:''};
beforeEach(()=>{
  streams=[];vi.useFakeTimers();
  vi.stubGlobal('navigator',{userAgent:'Chrome/140.0',mediaDevices:{getUserMedia:vi.fn(async()=>{const s=new Stream();streams.push(s);return s;})}});
  vi.stubGlobal('Audio',AudioMock);vi.stubGlobal('AudioContext',Context);vi.stubGlobal('MediaRecorder',Recorder);
  vi.stubGlobal('fetch',vi.fn(async(url)=>url==='/api/speech'?new Response(new Uint8Array(2000),{headers:fixtureHeaders}):new Response(JSON.stringify({ready:true,danishVoice:fixtureVoice,cachedVoices:fixtureCachedVoices,missingAudio:[]}))));
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('keeps both microphones disabled at startup and throughout audio playback',async()=>{
  const io=new BrowserCallIO();const abort=new AbortController();await io.prepare(options,abort.signal);
  expect(streams.every(s=>!s.track.enabled)).toBe(true);
  const playing=io.play(await io.speech('Hej.','da',abort.signal),'da',abort.signal,()=>{});
  await Promise.resolve();expect(streams.every(s=>!s.track.enabled)).toBe(true);
  await expect(io.capture('en',abort.signal,()=>{})).rejects.toThrow('owned');
  AudioMock.last.onended?.();await playing;io.cancel();
});
it('owns exactly one microphone and disables it before final processing',async()=>{
  const io=new BrowserCallIO();const abort=new AbortController();await io.prepare(options,abort.signal);
  const speaking=vi.fn();const recording=io.capture('da',abort.signal,speaking);
  expect(streams[0].track.enabled).toBe(true);expect(streams[1].track.enabled).toBe(false);
  await vi.advanceTimersByTimeAsync(150);expect(speaking).toHaveBeenCalledOnce();
  io.finish();const result=await recording;expect(result.finalization).toBe('manual');expect(streams.every(s=>!s.track.enabled)).toBe(true);io.cancel();
});
it('cancels output and capture without leaving stale URLs, tracks or timers',async()=>{
  const io=new BrowserCallIO();const abort=new AbortController();await io.prepare(options,abort.signal);
  const recording=io.capture('en',abort.signal,()=>{});const rejected=expect(recording).rejects.toThrow('Call ended');
  abort.abort();io.cancel();await rejected;
  expect(streams.every(s=>s.track.stop.mock.calls.length>0)).toBe(true);expect(vi.getTimerCount()).toBe(0);
});
it('creates no microphone request in simulated demo mode',async()=>{
  const io=new BrowserCallIO();await io.prepare({...options,demo:true},new AbortController().signal);expect(streams).toHaveLength(0);io.cancel();
});
it('never requests a microphone after End Call while service preparation is pending',async()=>{
  let release!:(response:Response)=>void;
  vi.mocked(fetch).mockImplementation(()=>new Promise<Response>(resolve=>{release=resolve;}));
  const io=new BrowserCallIO();const abort=new AbortController();const pending=io.prepare(options,abort.signal);
  await vi.waitFor(()=>expect(fetch).toHaveBeenCalledOnce());abort.abort();
  const rejected=expect(pending).rejects.toThrow();release(new Response(JSON.stringify({ready:true,danishVoice:fixtureVoice,cachedVoices:fixtureCachedVoices,missingAudio:[]})));await rejected;
  expect(streams).toHaveLength(0);io.cancel();
});
it('preloads fixed phrases once, reuses them without AI calls and invalidates them when voice assets change',async()=>{
  const urls=['/audio/opening.wav','/audio/purpose.wav'];let version='voice-a';
  vi.mocked(fetch).mockImplementation(async url=>String(url)==='/api/health' ? new Response(JSON.stringify({ready:true,danishVoice:fixtureVoice,cachedVoices:fixtureCachedVoices,missingAudio:[],cachedPhrases:urls,audioVersion:version})) : new Response(new Uint8Array(2000)));
  const io=new BrowserCallIO();const abort=new AbortController();
  expect(await io.prepare({...options,demo:true},abort.signal)).toMatchObject(fixtureVoice);
  const calls=vi.mocked(fetch).mock.calls.length;await io.load(urls[0],abort.signal);await io.load(urls[1],abort.signal);expect(fetch).toHaveBeenCalledTimes(calls);
  io.cancel();await io.prepare({...options,demo:true},abort.signal);expect(fetch).toHaveBeenCalledTimes(calls+1);
  io.cancel();version='voice-b';await io.prepare({...options,demo:true},abort.signal);expect(fetch).toHaveBeenCalledTimes(calls+4);
  expect(vi.mocked(fetch).mock.calls.every(([url])=>!String(url).includes('/api/speech'))).toBe(true);io.cancel();
});

it('streaming owns audio exclusively, suppresses both microphones and cancels its pending fetch on End Call',async()=>{
  const io=new BrowserCallIO();const abort=new AbortController();await io.prepare(options,abort.signal);
  let requestSignal!:AbortSignal;
  vi.mocked(fetch).mockImplementation(async(_url,init)=>{
    requestSignal=init!.signal!;
    return new Response(new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(4096));requestSignal.addEventListener('abort',()=>c.error(new DOMException('Call ended','AbortError')));}}),{headers:{...fixtureHeaders,'Content-Type':'audio/pcm','X-Audio-Sample-Rate':'24000'}});
  });
  const events={requestStarted:vi.fn(),firstAudio:vi.fn(),started:vi.fn(),complete:vi.fn()};const playback=io.streamDanish('Hej fra aPureBase.',abort.signal,events);
  const rejected=expect(playback).rejects.toMatchObject({name:'AbortError'});await vi.advanceTimersByTimeAsync(50);
  expect(events.started).toHaveBeenCalledOnce();expect(events.complete).not.toHaveBeenCalled();expect(streams.every(s=>!s.track.enabled)).toBe(true);
  await expect(io.capture('en',abort.signal,()=>{})).rejects.toThrow('owned');await expect(io.play(new Blob(['other audio']),'en',abort.signal,()=>{})).rejects.toThrow('owned');
  io.cancel();await rejected;expect(requestSignal.aborted).toBe(true);expect(streams.every(s=>s.track.stop.mock.calls.length>0)).toBe(true);expect(vi.getTimerCount()).toBe(0);
});
it('rejects an untagged or non-Isabella Danish blob before legacy audio playback',async()=>{
 const io=new BrowserCallIO(),abort=new AbortController();await io.prepare({...options,demo:true},abort.signal);
 await expect(io.play(new Blob(['generic Danish']),'da',abort.signal,()=>{})).rejects.toThrow('ElevenLabs');expect(AudioMock.last.play).not.toHaveBeenCalled();
 vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array(2000),{headers:{...fixtureHeaders,'X-Voice-Provider':'OpenAI'}}));await expect(io.speech('Hej.','da',abort.signal)).rejects.toThrow('ElevenLabs');expect(AudioMock.last.play).not.toHaveBeenCalled();io.cancel();
});
