import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ContinuousRecognitionDirection as Current} from '../src/streaming/continuousRecognition';
import {ContinuousRecognitionDirection as Before} from './fixtures/stage195-continuousRecognition';
import type {StreamingInterpreter} from '../src/streaming/engine';
import type {RecognitionEvent} from '../src/streaming/continuousTranscriptionClient';
const transports=vi.hoisted(()=>[] as {event:(e:RecognitionEvent)=>void;commits:number[];append:ReturnType<typeof vi.fn>}[]);
vi.mock('../src/streaming/continuousTranscriptionClient',()=>({ContinuousTranscription:class{model='gpt-live-transcribe';delay='low';t;constructor(event:(e:RecognitionEvent)=>void){this.t={event,commits:[] as number[],append:vi.fn()};transports.push(this.t);}open=async()=>{};append=(b:Uint8Array)=>this.t.append(b);commit=(g:number)=>this.t.commits.push(g);close=()=>{};}}));
beforeEach(()=>{vi.useFakeTimers();transports.length=0;});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function setup(before=false,silence=750){const engine={sourceStarted:vi.fn(),partial:vi.fn(),finalized:vi.fn(),snapshot:{lanes:{en:{precision:''}}}},failure=vi.fn(),progress=vi.fn(),Recognition=before?Before:Current,recognition=new Recognition('en',engine as unknown as StreamingInterpreter,new AbortController().signal,silence,failure,undefined,progress);return{recognition,engine,failure,progress,get transport(){return transports.at(-1)!;}};}
const pcm=(amplitude:number,samples=2400)=>{const bytes=new Uint8Array(samples*2);new Int16Array(bytes.buffer).fill(amplitude);return bytes;};
async function frames(s:ReturnType<typeof setup>,count:number,amplitude:number){for(let n=0;n<count;n++){s.recognition.feed(pcm(amplitude));await vi.advanceTimersByTimeAsync(100);}}

it.each([true,false])('does not finalize inside the next undelivered 100ms capture packet (baseline=%s)',async before=>{
 const s=setup(before);await s.recognition.open();
 await frames(s,2,2000); // final voice window ends at t=100
 s.transport.event({type:'partial',generation:0,text:'We need specialists'});
 await frames(s,6,0); // through t=700 silence; wall clock reaches t=800
 // At t=850 the previous implementation commits. Actual new speech begins
 // at t=820 inside the packet not delivered until t=900. No PCM is dropped,
 // but the premature item boundary separates its syntactic continuation.
 await vi.advanceTimersByTimeAsync(100); // t=900
 const next=pcm(0);new Int16Array(next.buffer).fill(2000,480);s.recognition.feed(next);
 expect(s.transport.commits).toHaveLength(before?1:0);
 expect(s.transport.append).toHaveBeenCalledTimes(9);
 await frames(s,9,0);expect(s.transport.commits).toHaveLength(1);
 s.recognition.cancel();expect(vi.getTimerCount()).toBe(0);
});
it('still finalizes real observed quiet and retains bad provider words literally',async()=>{
 const s=setup();await s.recognition.open();await frames(s,2,2000);s.transport.event({type:'partial',generation:0,text:'I professional information for healthcare'});await frames(s,10,0);
 expect(s.transport.commits).toEqual([0]);s.transport.event({type:'final',generation:0,text:'I professional information for healthcare'});
 expect(s.engine.finalized).toHaveBeenCalledExactlyOnceWith('en','I professional information for healthcare');s.recognition.cancel();
});
