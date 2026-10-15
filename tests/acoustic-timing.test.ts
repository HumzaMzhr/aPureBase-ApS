import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import {AcousticTiming,audioClockMapping,contextToMonotonic,type CaptureTiming,type ClockMapping,type PlaybackTiming} from '../src/streaming/acousticTiming';
import {ContinuousPcmScheduler} from '../src/streaming/scheduler';
import {TrailingMonitor} from '../src/streaming/trailing';
import {emptyLane,type SemanticUnit} from '../src/streaming/types';
import {fixtureVoice} from './fixtures/voice';
import {sourceCalibrationPcm,sourceSpeechRegions,signalPcm,calibrationWav} from './fixtures/acousticCalibration';
import {calibrationTrace} from '../src/streaming/calibrationTrace';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
const epoch=100000;
const mapping:ClockMapping={method:'context-performance-pair',contextTime:40,performanceTime:epoch,renderQuantumMs:128/24,deviceLatencyIncluded:false};
function inputTiming(start:number,count:number):CaptureTiming{return{frameStart:start,frameEnd:start+count,sampleRate:24000,startAt:epoch+start/24,endAt:epoch+(start+count)/24,clock:mapping};}
function event(type:PlaybackTiming['type'],start:number,end:number,signalStart=start,signalEnd=end,block=0):PlaybackTiming{return{type,streamId:'fixture',at:epoch+start-500,clock:mapping,block,startAt:epoch+start,endAt:epoch+end,signalStartAt:epoch+signalStart,signalEndAt:epoch+signalEnd};}
it('normalizes independent AudioContext origins to one monotonic session epoch',()=>{
 const input=audioClockMapping({currentTime:40,sampleRate:24000},()=>epoch);expect(contextToMonotonic(42.037,input)-epoch).toBeCloseTo(2037,8);
 const output=audioClockMapping({currentTime:20,sampleRate:24000,getOutputTimestamp:()=>({contextTime:19.96,performanceTime:epoch})},()=>epoch,true);expect(contextToMonotonic(20.5,output)-epoch).toBeCloseTo(540,8);expect(output.deviceLatencyIncluded).toBe(true);
 const fallback=audioClockMapping({currentTime:20,sampleRate:24000,getOutputTimestamp:()=>({contextTime:0,performanceTime:0})},()=>epoch,true);expect(contextToMonotonic(20.5,fallback)-epoch).toBe(500);expect(fallback.deviceLatencyIncluded).toBe(false);
});
it('recovers two known speech regions and excludes two seconds of initial silence despite delayed callbacks',()=>{
 let now=epoch;const meter=new AcousticTiming(()=>now),pcm=sourceCalibrationPcm();for(let offset=0;offset<pcm.length;offset+=4800){now=epoch+offset/48+900;meter.source(pcm.subarray(offset,offset+4800),inputTiming(offset/2,Math.min(2400,(pcm.length-offset)/2)));}
 const result=meter.snapshot();expect(result.sourceSpeechOnset).toBeCloseTo(2030,5);expect(result.sourceSpeechEnd).toBeCloseTo(6470,5);expect(result.firstSourceSpeechFrame).toBe(2030*24);expect(result.lastSourceSpeechFrame).toBe(6470*24-1);expect(result.sourceRegions).toHaveLength(2);for(let n=0;n<2;n++){expect(Math.abs(result.sourceRegions[n].startAt-sourceSpeechRegions[n][0])).toBeLessThanOrEqual(10);expect(Math.abs(result.sourceRegions[n].endAt-sourceSpeechRegions[n][1])).toBeLessThanOrEqual(10);}expect(result.sourceFrames).toBe(8500*24);
});
it('does not manufacture acoustic onset from unclocked callbacks or the START click',()=>{
 let now=epoch;const meter=new AcousticTiming(()=>now);now+=2000;meter.source(signalPcm(100,[[0,100]]));expect(meter.snapshot().sourceSpeechOnset).toBeUndefined();expect(meter.snapshot().unclockedSourceFrames).toBe(2400);
});
it('distinguishes PCM receipt, scheduling, audible playback and tail independently of word counts',()=>{
 let now=epoch;const meter=new AcousticTiming(()=>now);meter.source(sourceCalibrationPcm(),inputTiming(0,8500*24));meter.pcmReceived(epoch+3000);meter.playback(event('block_scheduled',3500,9000,3900,8500));now=epoch+4000;expect(meter.snapshot().firstAudioLatency).toBeUndefined();meter.playback(event('block_audible',3500,9000,3900,8500));expect(meter.snapshot().firstAudioLatency).toBe(1870);expect(meter.snapshot().firstPCMReceivedAt).toBe(3000);expect(meter.snapshot().tailLatency).toBeUndefined();meter.playback(event('block_rendered',3500,9000,3900,8500));now=epoch+10000;const r=meter.snapshot([],true,true);expect(r.sourceSpeechEnd).toBe(6470);expect(r.targetPlaybackEnd).toBe(8500);expect(r.tailLatency).toBe(2030);expect(r.lastPCMPlayedAt).toBe(9000);expect(r.complete).toBe(true);
});
it('keeps unknown per-unit acoustic boundaries null and records actual TTS send separately from queued text',()=>{
 let now=epoch;const meter=new AcousticTiming(()=>now);meter.source(sourceCalibrationPcm(),inputTiming(0,8500*24));now+=10000;
 const unit=(id:string,base:number):SemanticUnit=>({id,turn:1,language:'en',start:base,end:base+4,source:'Source words.',status:'spoken',precision:false,timing:{source_start:epoch,source_stable_at:epoch+1500+base,source_end_observed:epoch+1400+base,translation_started:epoch+1510+base,translation_ready:epoch+1800+base,tts_text_sent:epoch+1801+base,first_audio_received:epoch+2200+base,playback_started:epoch+2400+base,playback_finished:epoch+3100+base}});
 meter.textSent(['u1'],epoch+2000);meter.playback({...event('unit_scheduled',2400,3100),unitId:'u1'});meter.playback({...event('unit_scheduled',3300,4000),unitId:'u2'});
 const units=[unit('u1',0),unit('u2',4)],trace=meter.unitTrace(units,true);expect(trace[0].sourceAudioStart).toBe(2030);expect(trace[0].sourceAudioEnd).toBeNull();expect(trace[1].sourceAudioStart).toBeNull();expect(trace[1].sourceAudioEnd).toBe(6470);expect(trace[0]).toMatchObject({asrAvailableAt:1400,committedAt:1500,ttsQueuedAt:1801,ttsTextSentAt:2000,ttsFirstPCMAt:2200,playbackStartAt:2400,playbackEndAt:3100,latencies:{translation:290,elevenLabs:200,scheduler:200,semanticCommitment:100}});expect(trace[1].latencies.asrAvailability).not.toBeNull();expect(trace[0].latencies.asrAvailability).toBeNull();expect(calibrationTrace(meter.snapshot(units,false,true))).toContain('internal word/audio alignment unavailable');
});
it('STOP freezes observations, rejects late events, and a new session starts empty',()=>{
 let now=epoch;const meter=new AcousticTiming(()=>now);meter.source(sourceCalibrationPcm(),inputTiming(0,8500*24));meter.playback(event('block_scheduled',12000,14000));now=epoch+10000;meter.stop();now+=10000;meter.playback(event('block_rendered',12000,14000));meter.source(signalPcm(100,[[0,100]]),inputTiming(1000000,2400));expect(meter.snapshot([],true).firstAudioLatency).toBeUndefined();expect(meter.snapshot([],true).tailLatency).toBeUndefined();expect(meter.snapshot().stopped).toBe(true);const next=new AcousticTiming(()=>now);expect(next.snapshot().sourceSpeechOnset).toBeUndefined();expect(next.snapshot().firstPCMPlayedAt).toBeUndefined();
});
it('preserves completed measurements on STOP and invalidates a tail when source speech resumes',()=>{
 let now=epoch;const meter=new AcousticTiming(()=>now);meter.source(sourceCalibrationPcm(),inputTiming(0,8500*24));meter.playback(event('block_rendered',3500,9000,3900,8500));now=epoch+10000;expect(meter.snapshot([],true).tailLatency).toBe(2030);meter.source(signalPcm(100,[[0,100]]),inputTiming(10000*24,2400));expect(meter.snapshot([],false).tailLatency).toBeUndefined();now+=1000;meter.playback(event('block_rendered',10000,10500));expect(meter.snapshot([],true).tailLatency).toBe(400);meter.stop();now+=1000;expect(meter.snapshot([],false).tailLatency).toBe(400);
});
it('demonstrates why the unchanged legacy 12-second metric is semantic interpolation, not acoustic delay',()=>{
 const lane=emptyLane();lane.receivedWords=40;lane.committedWords=40;lane.translatedWords=40;lane.units=[{id:'u',turn:1,language:'en',start:0,end:40,source:'Source',status:'queued',precision:false,playedFraction:.5,timing:{source_start:0,source_end_observed:6000,source_stable_at:6500,playback_started:7000}}];const old=new TrailingMonitor();old.update(lane,0,15000,15000,{ttsCharacters:200,targetSamples:240000,playbackSamples:120000});expect(old.summary.currentTrailingLag).toBe(12000); // 15,000 - (0 + .5 * 6,000)
});

class Context {
 sampleRate=24000;state='running';destination={};get currentTime(){return performance.now()/1000+40;}
 getOutputTimestamp(){return{contextTime:this.currentTime-.04,performanceTime:performance.now()};}
 createGain(){return{connect:vi.fn(),disconnect:vi.fn()};}
 createBuffer(_c:number,samples:number){const data=new Float32Array(samples);return{duration:samples/24000,getChannelData:()=>data};}
 createBufferSource(){const node={buffer:undefined as {duration:number}|undefined,onended:null as null|(()=>void),connect:vi.fn(),disconnect:vi.fn(),timer:undefined as ReturnType<typeof setTimeout>|undefined,start:(at:number)=>{node.timer=setTimeout(()=>node.onended?.(),Math.ceil((at-this.currentTime+(node.buffer?.duration??0))*1000));},stop:()=>clearTimeout(node.timer)};return node;}
}
it('calibrates actual scheduler playback within 20 ms using known PCM and a 40 ms output-device offset',async()=>{
 vi.useFakeTimers();const meter=new AcousticTiming(()=>performance.now()),start=performance.now(),context=new Context();meter.source(sourceCalibrationPcm(),{...inputTiming(0,8500*24),startAt:start,endAt:start+8500,clock:{...mapping,performanceTime:start}});const observations:PlaybackTiming[]=[];
 const hooks={firstAudio:vi.fn(),scheduled:vi.fn(),started:vi.fn(),finished:vi.fn(),underrun:vi.fn(),measurement:(e:PlaybackTiming)=>{observations.push(e);meter.playback(e);}};const scheduler=new ContinuousPcmScheduler(context as unknown as AudioContext,'clinic','HCP_OUTPUT_DA',100,hooks,undefined,fixtureVoice);
 await vi.advanceTimersByTimeAsync(3500);scheduler.mark('u1',0,1500*24,true);scheduler.push(signalPcm(1500,[[400,1200]]),fixtureVoice);await vi.advanceTimersByTimeAsync(3500);scheduler.mark('u2',1500*24,3000*24,true);scheduler.push(signalPcm(1500,[[200,1100]]),fixtureVoice);const done=scheduler.finish();await vi.advanceTimersByTimeAsync(2000);await done;
 const r=meter.snapshot([],true,true);expect(r.sourceSpeechOnset).toBe(2030);expect(r.sourceSpeechEnd).toBe(6470);expect(r.firstPCMReceivedAt).toBe(3500);expect(Math.abs(r.firstPCMPlayedAt!-3550)).toBeLessThanOrEqual(1);expect(Math.abs(r.firstTranslatedAudioActuallyPlayed!-3950)).toBeLessThanOrEqual(20);expect(Math.abs(r.targetPlaybackEnd!-8150)).toBeLessThanOrEqual(20);expect(Math.abs(r.firstAudioLatency!-1913)).toBeLessThanOrEqual(20);expect(Math.abs(r.tailLatency!-1683)).toBeLessThanOrEqual(20);expect(observations.some(e=>e.type==='block_audible')).toBe(true);expect(r.outputClock?.deviceLatencyIncluded).toBe(true);expect(vi.getTimerCount()).toBe(0);
 if(process.env.CALIBRATION_ARTIFACT_DIR){const directory=process.env.CALIBRATION_ARTIFACT_DIR;await mkdir(directory,{recursive:true});const expected={sourceOnset:2037,sourceEnd:6467,firstPCMPlayback:3550,targetSpeechStart:3950,targetSpeechEnd:8150,firstAudioLatency:1913,tailLatency:1683};const measured={sourceOnset:r.sourceSpeechOnset!,sourceEnd:r.sourceSpeechEnd!,firstPCMPlayback:r.firstPCMPlayedAt!,targetSpeechStart:r.firstTranslatedAudioActuallyPlayed!,targetSpeechEnd:r.targetPlaybackEnd!,firstAudioLatency:r.firstAudioLatency!,tailLatency:r.tailLatency!};const errors=Object.fromEntries(Object.entries(expected).map(([key,value])=>[key,Math.abs(measured[key as keyof typeof measured]-value)]));await writeFile(join(directory,'calibration-results.json'),JSON.stringify({kind:'Deterministic mocked PCM calibration using production scheduler and measurement observer; no paid API or physical acoustic loopback',sampleRate:24000,sourceSpeechRegions,expected,measured,absoluteErrorMs:errors,maxAbsoluteErrorMs:Math.max(...Object.values(errors)),toleranceMs:20,clockOutputDelayMs:40,acousticSnapshot:r},null,2));await writeFile(join(directory,'source-known-timing.wav'),calibrationWav(sourceCalibrationPcm()));}

});
it('observers do not alter PCM scheduling, and a failing observer cannot interrupt playback',async()=>{
 vi.useFakeTimers();const context1=new Context(),context2=new Context();const hooks=()=>({firstAudio:vi.fn(),scheduled:vi.fn(),started:vi.fn(),finished:vi.fn(),underrun:vi.fn()});const first=new ContinuousPcmScheduler(context1 as unknown as AudioContext,'clinic','HCP_OUTPUT_DA',100,hooks(),undefined,fixtureVoice),second=new ContinuousPcmScheduler(context2 as unknown as AudioContext,'clinic','HCP_OUTPUT_DA',100,{...hooks(),measurement:()=>{throw new Error('diagnostic failed');}},undefined,fixtureVoice);
 const pcm=signalPcm(500,[[0,500]]);first.push(pcm,fixtureVoice);second.push(pcm,fixtureVoice);expect(first.schedule).toEqual(second.schedule);expect(first.receivedPcmSamples).toBe(second.receivedPcmSamples);const done=Promise.all([first.finish(),second.finish()]);await vi.advanceTimersByTimeAsync(600);await done;expect(vi.getTimerCount()).toBe(0);
});
