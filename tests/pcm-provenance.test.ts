import {realtimeIsabellaGain,deliveryGainPolicy} from '../src/config/realtimeDelivery';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ContinuousPcmScheduler} from '../src/streaming/scheduler';
import {VerifiedPcmSource,verifyCachedAudio} from '../src/streaming/pcmProvenance';
import {SessionDiagnostics,lastSessionDiagnostics} from '../src/streaming/sessionDiagnostics';
import {fixtureVoice} from './fixtures/voice';
class Context {
 state='running';destination={};buffers:Float32Array[]=[];nodes:{stop:ReturnType<typeof vi.fn>;start:ReturnType<typeof vi.fn>}[]=[];
 get currentTime(){return performance.now()/1000;}
 createGain(){return{connect:vi.fn(),disconnect:vi.fn()};}
 createBuffer(_channels:number,samples:number){const floats=new Float32Array(samples);this.buffers.push(floats);return{duration:samples/24000,getChannelData:()=>floats};}
 createBufferSource(){const node={buffer:undefined as {duration:number}|undefined,onended:null as null|(()=>void),timer:undefined as ReturnType<typeof setTimeout>|undefined,connect:vi.fn(),disconnect:vi.fn(),start:vi.fn((at:number)=>{node.timer=setTimeout(()=>node.onended?.(),(at-this.currentTime+node.buffer!.duration)*1000);}),stop:vi.fn(()=>clearTimeout(node.timer))};this.nodes.push(node);return node;}
}
const hooks=()=>({firstAudio:vi.fn(),scheduled:vi.fn(),started:vi.fn(),finished:vi.fn(),underrun:vi.fn()});
beforeEach(()=>{vi.useFakeTimers();const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)});});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function setup(requestId='voice-request',deliveryBoost=false){
 const context=new Context(),voice={...fixtureVoice,requestId},source=new VerifiedPcmSource(voice,'elevenlabs-ws'),diagnostics=new SessionDiagnostics('en','realtime'),events:Record<string,unknown>[]=[];
 const audit=vi.fn(event=>{events.push({...event});diagnostics.record(event.type,event);});
 const scheduler=new ContinuousPcmScheduler(context as unknown as AudioContext,'clinic','HCP_OUTPUT_DA',100,{...hooks(),audit},undefined,voice,deliveryBoost);
 const pcm=(samples:number)=>{const bytes=new Uint8Array(samples*2);new Int16Array(bytes.buffer).fill(8192);return source.accept(bytes);};
 return{context,voice,source,diagnostics,events,scheduler,pcm,audit};
}
it.each([[12716,659],[2400,450]])('verifies the first through final short Tak PCM (%j samples), including the final carry flush',async(first,last)=>{
 const chunks=[first,last];const s=setup();s.scheduler.mark('final-Tak',0,chunks[0]+chunks[1],true);
 for(const samples of chunks)s.scheduler.push(s.pcm(samples),s.voice);s.source.seal();const done=s.scheduler.finish();await vi.advanceTimersByTimeAsync(1000);await done;
 expect(s.context.nodes).toHaveLength(2);expect(s.context.buffers.every(b=>b.every(v=>v===.25))).toBe(true);
 for(let block=0;block<2;block++){
  const verified=s.events.findIndex(e=>e.type==='VOICE_PROVENANCE_VERIFIED'&&e.pcmBlockSequence===block),scheduled=s.events.findIndex(e=>e.type==='PCM_BLOCK_SCHEDULED'&&e.pcmBlockSequence===block);
  expect(verified).toBeLessThan(scheduled);expect(s.audit.mock.invocationCallOrder[verified]).toBeLessThan(s.context.nodes[block].start.mock.invocationCallOrder[0]);expect(verified).toBeGreaterThanOrEqual(0);
 }
 s.diagnostics.finish('completed','drained');const record=lastSessionDiagnostics()!;
 expect(record.voiceProvenance).toEqual({audiblePCMBlocks:2,verifiedIsabellaPCMBlocks:2,unverifiedPCMBlocks:0,alternateVoicePCMBlocks:0});
 expect(record.pcmBlocks[1]).toMatchObject({unitId:'final-Tak',requestId:s.voice.requestId,provider:'ElevenLabs',voiceId:fixtureVoice.voiceId,modelId:'eleven_flash_v2_5',pcmBlockSequence:1,firstSample:chunks[0],lastSample:chunks[0]+chunks[1]-1,rendererId:expect.any(String),streamId:expect.any(String),scheduledAt:expect.any(Number),playbackStartedAt:expect.any(Number),playbackFinishedAt:expect.any(Number),verifiedAt:expect.any(Number)});
 expect(Number(record.pcmBlocks[1].playbackStartedAt)).toBeGreaterThanOrEqual(Number(record.pcmBlocks[0].playbackFinishedAt));expect(vi.getTimerCount()).toBe(0);
});
it('binds a new tail connection to its own renderer; stale previous-request PCM cannot enter it',async()=>{
 const first=setup('first-request');first.scheduler.mark('main',0,2400,true);first.scheduler.push(first.pcm(2400),first.voice);const stale=first.pcm(480);const finished=first.scheduler.finish();first.source.seal();await vi.advanceTimersByTimeAsync(200);await finished;
 const tail=setup('tail-request');tail.scheduler.mark('Tak',0,659,true);expect(()=>tail.scheduler.push(stale,first.voice)).toThrow('request provenance');expect(tail.context.nodes).toHaveLength(0);tail.scheduler.push(tail.pcm(659),tail.voice);tail.source.seal();const done=tail.scheduler.finish();await vi.advanceTimersByTimeAsync(200);await done;expect(tail.events.filter(e=>e.type==='PCM_BLOCK_PLAYBACK_FINISHED')).toHaveLength(1);expect(tail.events.find(e=>e.type==='VOICE_PROVENANCE_VERIFIED')).toMatchObject({requestId:'tail-request',unitId:'Tak'});
});
it('rejects configured identity alone, modified payloads, replayed receipts and unverified carry before scheduling',()=>{
 const s=setup();expect(()=>s.scheduler.push(new Uint8Array(4800),s.voice)).toThrow('Unverified');const corrupt=s.pcm(2400);corrupt[0]^=1;expect(()=>s.scheduler.push(corrupt,s.voice)).toThrow('bytes');expect(s.context.nodes).toHaveLength(0);
 const valid=s.pcm(2400);s.scheduler.push(valid,s.voice);expect(()=>s.scheduler.push(valid,s.voice)).toThrow('stale');expect(s.context.nodes).toHaveLength(1);s.scheduler.cancel();expect(vi.getTimerCount()).toBe(0);
});
it.each([{provider:'OpenAI'},{provider:'SpeechSynthesis'},{provider:'OS/system TTS'},{provider:'fallback'},{voiceId:'another-voice'},{modelId:'another-model'}])('rejects alternate PCM provenance %j before any audible source',wrong=>{
 const s=setup();expect(()=>s.scheduler.push(s.pcm(2400),{...s.voice,...wrong})).toThrow('ElevenLabs');expect(s.context.nodes).toHaveLength(0);s.scheduler.cancel();
});
it('cannot flush a revoked origin during cleanup, and STOP cannot schedule or restart a node',async()=>{
 const s=setup();s.scheduler.push(s.pcm(200),s.voice);s.source.cancel();await expect(s.scheduler.finish()).rejects.toThrow('Unverified');expect(s.context.nodes).toHaveLength(0);s.scheduler.cancel();expect(()=>s.scheduler.push(new Uint8Array(4800),s.voice)).toThrow('closed');
 const active=setup();active.scheduler.push(active.pcm(2400),active.voice);active.scheduler.push(active.pcm(2400),active.voice);active.scheduler.cancel();active.scheduler.cancel();await vi.advanceTimersByTimeAsync(1000);expect(active.context.nodes.every(n=>n.stop.mock.calls.length===1&&n.start.mock.calls.length===1)).toBe(true);expect(active.events.filter(e=>e.type==='PCM_BLOCK_PLAYBACK_STARTED')).toHaveLength(0);expect(vi.getTimerCount()).toBe(0);
});
it('preserves every scheduled time, PCM value and ordered node across the provenance gate',async()=>{
 const s=setup(),referenceContext=new Context(),reference=new ContinuousPcmScheduler(referenceContext as unknown as AudioContext,'agent','AGENT_OUTPUT_EN',100,hooks());
 for(const samples of [2400,700,450]){const bytes=s.pcm(samples);s.scheduler.push(bytes,s.voice);reference.push(bytes);}
 const done=Promise.all([s.scheduler.finish(),reference.finish()]);await vi.advanceTimersByTimeAsync(1000);await done;expect(s.scheduler.schedule).toEqual(reference.schedule);expect(s.context.buffers).toEqual(referenceContext.buffers);expect(vi.getTimerCount()).toBe(0);
});
it('rejects a cache without generation-time content evidence or whose bytes differ from that evidence',async()=>{
 await expect(verifyCachedAudio(new ArrayBuffer(4),fixtureVoice)).rejects.toThrow('generation-time');await expect(verifyCachedAudio(new ArrayBuffer(4),{...fixtureVoice,audioSha256:'0'.repeat(64)})).rejects.toThrow('mismatch');
});

it('counts a block that began before STOP but before the next observation tick, then cancels it without rescheduling',()=>{
 const s=setup();s.scheduler.push(s.pcm(2400),s.voice);Object.defineProperty(s.context,'currentTime',{get:()=>.011});s.scheduler.cancel();
 expect(s.diagnostics.provenanceSummary).toEqual({audiblePCMBlocks:1,verifiedIsabellaPCMBlocks:1,unverifiedPCMBlocks:0,alternateVoicePCMBlocks:0});expect(s.events.find(e=>e.type==='PCM_BLOCK_CANCELLED')).toMatchObject({cancelled:true,playbackStartedAt:10,playbackFinishedAt:11});expect(s.context.nodes[0].stop).toHaveBeenCalledOnce();expect(s.context.nodes[0].start).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
it('authorizes the deterministic renderer gain only after byte verification, retains original PCM and rejects altered/unverified samples',async()=>{
 const s=setup('gain-request',true);expect(()=>s.scheduler.push(new Uint8Array(4800),s.voice)).toThrow('Unverified');expect(s.context.nodes).toHaveLength(0);
 const altered=s.pcm(2400);altered[0]^=1;expect(()=>s.scheduler.push(altered,s.voice)).toThrow('bytes');expect(s.context.nodes).toHaveLength(0);
 const bytes=s.pcm(2400),original=bytes.slice();s.scheduler.push(bytes,s.voice);expect(bytes).toEqual(original);expect(s.context.buffers[0].every(x=>x===Math.fround(.25*realtimeIsabellaGain))).toBe(true);
 const verified=s.events.find(e=>e.type==='VOICE_PROVENANCE_VERIFIED')!,gain=s.events.find(e=>e.type==='PCM_GAIN_APPLIED')!;expect(verified.requestId).toBe('gain-request');expect(gain).toMatchObject({requestId:'gain-request',gainPolicy:deliveryGainPolicy,gainApplied:realtimeIsabellaGain,preGainPeak:.25,postGainPeak:Math.fround(.25*realtimeIsabellaGain),clippingEvents:0,provenanceVerified:true});
 expect(()=>s.scheduler.push(bytes,s.voice)).toThrow('stale');const done=s.scheduler.finish();await vi.advanceTimersByTimeAsync(200);await done;s.scheduler.cancel();expect(vi.getTimerCount()).toBe(0);
});
