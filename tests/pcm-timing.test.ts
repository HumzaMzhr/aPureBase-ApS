import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {afterEach,expect,it,vi} from 'vitest';
import {IsolatedMicrophone} from '../src/streaming/input';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('adds capture sample timestamps without changing PCM samples, 2400-frame packets or checkpoints',()=>{
 const posted:{type:string;audio?:ArrayBuffer;frameStart?:number;frameEnd?:number;sampleRate?:number}[]=[];let Processor!:new()=>{process(inputs:Float32Array[][]):boolean;port:{onmessage:(e:{data:{type:string}})=>void}};
 const scope={sampleRate:24000,currentFrame:0,AudioWorkletProcessor:class{port={postMessage:(event:typeof posted[number])=>posted.push(event),onmessage:()=>{}};},registerProcessor:(_name:string,constructor:typeof Processor)=>{Processor=constructor;}};
 runInNewContext(readFileSync('public/pcm-capture.js','utf8'),scope);const processor=new Processor();const expected:number[]=[];
 for(let block=0;block<20;block++){scope.currentFrame=block*128;const input=Float32Array.from({length:128},(_,n)=>Math.sin((block*128+n)*.05)*.1);expected.push(...input.map(v=>Math.round(Math.max(-1,Math.min(1,v))*32767)));processor.process([[input]]);}
 const first=posted[0];expect(first).toMatchObject({type:'pcm',frameStart:0,frameEnd:2400,sampleRate:24000});expect(first.audio!.byteLength).toBe(4800);processor.port.onmessage({data:{type:'checkpoint'}});expect(posted[1]).toMatchObject({type:'pcm',frameStart:2400,frameEnd:2560,sampleRate:24000});expect(posted[2].type).toBe('checkpointed');
 const actual=posted.filter(e=>e.type==='pcm').flatMap(e=>Array.from(new Int16Array(e.audio!)));expect(actual).toEqual(expected);
});
it('converts worklet sample positions to monotonic input time rather than delayed callback arrival',async()=>{
 vi.spyOn(performance,'now').mockReturnValue(6500);const context={currentTime:43.5,sampleRate:24000,resume:async()=>{},close:async()=>{},audioWorklet:{addModule:async()=>{}},createMediaStreamSource:()=>({connect:vi.fn(),disconnect:vi.fn()})};
 const port={onmessage:null as null|((event:{data:unknown})=>void),postMessage:vi.fn(),close:vi.fn()};vi.stubGlobal('AudioContext',class{constructor(){return context;}});vi.stubGlobal('AudioWorkletNode',class{port=port;disconnect=vi.fn();});const track={enabled:false,onended:null,stop:vi.fn()};vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:async()=>({getAudioTracks:()=>[track],getTracks:()=>[track]})}});
 const consume=vi.fn(),input=new IsolatedMicrophone();await input.prepare('',consume,vi.fn());input.enable(true);port.onmessage?.({data:{type:'pcm',audio:new Uint8Array(4800).buffer,frameStart:42*24000,frameEnd:42*24000+2400,sampleRate:24000}});
 expect(consume).toHaveBeenCalledOnce();expect(consume.mock.calls[0][1]).toMatchObject({startAt:5000,frameStart:42*24000,clock:{method:'context-performance-pair',performanceTime:6500}});expect(consume.mock.calls[0][1].endAt).toBeCloseTo(5100,8);input.cancel();
});
