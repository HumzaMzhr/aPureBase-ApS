import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ContinuousPcmScheduler} from '../src/streaming/scheduler';
import type {AudioTrace} from '../src/streaming/audioDiagnostics';
import {fixturePcm,fixtureVoice} from './fixtures/voice';

class Context {
 state='running';destination={};
 get currentTime(){return performance.now()/1000;}
 createGain(){return{connect:vi.fn(),disconnect:vi.fn()};}
 createBuffer(_channels:number,samples:number){const data=new Float32Array(samples);return{duration:samples/24000,getChannelData:()=>data};}
 createBufferSource(){
  const node={buffer:undefined as {duration:number}|undefined,onended:null as null|(()=>void),connect:vi.fn(),disconnect:vi.fn(),timer:undefined as ReturnType<typeof setTimeout>|undefined,start:(at:number)=>{node.timer=setTimeout(()=>node.onended?.(),(at-this.currentTime+(node.buffer?.duration??0))*1000);},stop:()=>clearTimeout(node.timer)};
  return node;
 }
}
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
function renderer(){
 const context=new Context(),events:AudioTrace[]=[];
 const scheduler=new ContinuousPcmScheduler(context as unknown as AudioContext,'clinic','HCP_OUTPUT_DA',100,{firstAudio:vi.fn(),scheduled:vi.fn(),started:vi.fn(),finished:vi.fn(),underrun:vi.fn(),audit:event=>events.push(event)},undefined,fixtureVoice,true);
 return{scheduler,events};
}
it('reproduces a sustained valid-Isabella stream failing the30second queue guard after output accumulates faster than playback',()=>{
 const {scheduler,events}=renderer();let error:unknown,elapsed=0,acceptedSamples=0;
 for(let n=0;n<125;n++){
  vi.advanceTimersByTime(1200);elapsed+=1200;
  const pcm=fixturePcm(new Uint8Array(40320*2));
  try{scheduler.push(pcm,fixtureVoice);acceptedSamples+=40320;}catch(failure){error=failure;break;}
 }
 expect(error).toBeInstanceOf(Error);expect((error as Error).message).toBe('Audio queue exceeded its limit.');
 expect(elapsed).toBeGreaterThan(60000);expect(elapsed).toBeLessThan(150000);
 expect(scheduler.queuedMs).toBeGreaterThan(30000);expect(scheduler.receivedPcmSamples).toBe(acceptedSamples);
 expect(events.at(-1)?.type).toBe('PCM_PROVENANCE_ACCEPTED');expect(events.some(e=>e.type==='PCM_PROVENANCE_REJECTED')).toBe(false);
 expect(events.filter(e=>e.type==='PCM_BLOCK_SCHEDULED')).toHaveLength(acceptedSamples/40320);
 scheduler.cancel();expect(vi.getTimerCount()).toBe(0);
});
it('keeps a balanced150second persistent PCM stream ordered and fully drained without needing a larger buffer',async()=>{
 const {scheduler,events}=renderer();let peakQueue=0;
 for(let n=0;n<150;n++){
  scheduler.push(fixturePcm(new Uint8Array(24000*2)),fixtureVoice);peakQueue=Math.max(peakQueue,scheduler.queuedMs);vi.advanceTimersByTime(1000);
 }
 const finished=scheduler.finish();await vi.advanceTimersByTimeAsync(100);await finished;
 expect(peakQueue).toBeLessThan(1100);expect(scheduler.receivedPcmSamples).toBe(150*24000);expect(scheduler.playedPcmSamples).toBe(150*24000);
 const blocks=events.filter(e=>e.type==='PCM_BLOCK_SCHEDULED');expect(blocks).toHaveLength(150);
 blocks.forEach((block,index)=>{expect(block.pcmBlockSequence).toBe(index);expect(block.firstSample).toBe(index*24000);expect(block.provenanceVerified).toBe(true);expect(block.voiceId).toBe(fixtureVoice.voiceId);});
 expect(events.some(e=>e.type==='PCM_PROVENANCE_REJECTED')).toBe(false);expect(vi.getTimerCount()).toBe(0);
});
