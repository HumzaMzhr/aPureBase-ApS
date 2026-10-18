import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ContinuousRecognitionDirection as Current} from '../src/streaming/continuousRecognition';
import {ContinuousRecognitionDirection as Before} from './fixtures/stage194-continuousRecognition';
import {RecognitionAudit} from '../src/streaming/recognitionAudit';
import {StreamingInterpreter} from '../src/streaming/engine';
import {SemanticCommitter,precisionTrigger} from '../src/streaming/semantic';
import {validatedGreeting} from '../src/streaming/validatedGreeting';
import {incrementalTranslation,type UnitRequest} from '../server/incrementalTranslation';
import {GapTimeline} from '../src/streaming/audioDiagnostics';
import {emptyLane} from '../src/streaming/types';
import type {RecognitionEvent} from '../src/streaming/continuousTranscriptionClient';
import {transcriptionSession} from '../server/liveTranscription';
import reference from './fixtures/stage195-reference.json';
const transports=vi.hoisted(()=>[] as {event:(e:RecognitionEvent)=>void;commits:number[];append:ReturnType<typeof vi.fn>}[]);
vi.mock('../src/streaming/continuousTranscriptionClient',()=>({ContinuousTranscription:class{model='gpt-live-transcribe';delay='low';t;constructor(event:(e:RecognitionEvent)=>void){this.t={event,commits:[] as number[],append:vi.fn()};transports.push(this.t);}open=async()=>{};append=(b:Uint8Array)=>this.t.append(b);commit=(g:number)=>this.t.commits.push(g);close=()=>{};}}));
beforeEach(()=>{vi.useFakeTimers();transports.length=0;});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function setup(before=false,silence=750){const engine={sourceStarted:vi.fn(),partial:vi.fn(),finalized:vi.fn(),snapshot:{lanes:{en:{precision:''}}}},failure=vi.fn(),progress=vi.fn(),Recognition=before?Before:Current,recognition=new Recognition('en',engine as unknown as StreamingInterpreter,new AbortController().signal,silence,failure,undefined,progress);return{recognition,engine,failure,progress,get transport(){return transports.at(-1)!;}};}
const pcm=(amplitude:number,samples=2400)=>{const bytes=new Uint8Array(samples*2);new Int16Array(bytes.buffer).fill(amplitude);return bytes;};
async function frames(s:ReturnType<typeof setup>,count:number,amplitude:number){for(let n=0;n<count;n++){s.recognition.feed(pcm(amplitude));await vi.advanceTimersByTimeAsync(100);}}
it('joins slowly articulated words across 600ms pauses without changing any transcript or dropping PCM',async()=>{
 for(const before of [true,false]){const s=setup(before,before?450:750);await s.recognition.open();for(let word=0;word<3;word++){await frames(s,2,2000);await frames(s,6,0);}await frames(s,2,0);
  expect(s.transport.append).toHaveBeenCalledTimes(26);expect(s.transport.commits).toHaveLength(before?3:1);expect(s.failure).not.toHaveBeenCalled();
  if(!before){s.transport.event({type:'final',generation:0,text:'Three slowly spoken words.'});expect(s.engine.finalized).toHaveBeenCalledExactlyOnceWith('en','Three slowly spoken words.');}s.recognition.cancel();expect(vi.getTimerCount()).toBe(0);
 }
});
it('sees short-word energy that a 100ms average misses and commits its provider text after bounded quiet',async()=>{
 for(const before of [true,false]){const s=setup(before);await s.recognition.open();const bytes=pcm(0);new Int16Array(bytes.buffer).fill(900,0,240); // 10ms .027 RMS, whole packet .0087 RMS.
  s.recognition.feed(bytes);s.transport.event({type:'partial',generation:0,text:'Quiet short word'});await frames(s,10,0);expect(s.transport.commits).toHaveLength(before?0:1);s.recognition.cancel();expect(vi.getTimerCount()).toBe(0);
 }
});
it('reproduces text without local VAD getting stranded across silence, retains it for review and never sends it as semantic speech',async()=>{
 for(const before of [true,false]){const s=setup(before);await s.recognition.open();await frames(s,2,0);s.transport.event({type:'partial',generation:0,itemId:'unsupported-item',text:'Uncorroborated recognition'});await frames(s,4,0);s.transport.event({type:'partial',generation:0,itemId:'unsupported-item',text:'Uncorroborated recognition   '});await frames(s,5,0);
  expect(s.transport.commits).toHaveLength(before?0:1);
  if(before){expect(s.engine.sourceStarted).toHaveBeenCalledOnce();await vi.advanceTimersByTimeAsync(31000);expect(s.transport.commits).toHaveLength(0);}else{s.transport.event({type:'final',generation:0,itemId:'unsupported-item',text:'Uncorroborated recognition'});expect(s.engine.sourceStarted).not.toHaveBeenCalled();expect(s.engine.finalized).not.toHaveBeenCalled();expect(s.failure).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({message:expect.stringContaining('human review')}));const last=s.progress.mock.calls.at(-1)![0];expect(last.recognizedSource).toContain('Uncorroborated recognition');expect(last.audit.items[0]).toMatchObject({final:'Uncorroborated recognition',reviewReason:'no_local_speech_evidence',commitReason:'text_without_vad_silence'});expect(last.audit.items[0].partials).toHaveLength(2);}
  s.recognition.cancel();expect(vi.getTimerCount()).toBe(0);
 }
});
it('ends ordinary Thank you plus silence normally and accepts genuine new speech afterwards',async()=>{
 const s=setup();await s.recognition.open();await frames(s,2,2000);s.transport.event({type:'partial',generation:0,text:'Thank you.'});await frames(s,8,0);s.transport.event({type:'final',generation:0,text:'Thank you.'});await frames(s,310,0);
 expect(s.transport.commits).toEqual([0]);expect(s.failure).not.toHaveBeenCalled();expect(s.engine.finalized).toHaveBeenCalledExactlyOnceWith('en','Thank you.');
 await frames(s,2,2000);s.transport.event({type:'partial',generation:1,text:'Another actual statement.'});await frames(s,8,0);s.transport.event({type:'final',generation:1,text:'Another actual statement.'});expect(s.engine.finalized.mock.calls.map(c=>c[1])).toEqual(['Thank you.','Another actual statement.']);s.recognition.cancel();expect(vi.getTimerCount()).toBe(0);
});
it('retains distinct partial revisions, final text and capture statistics without inventing a correction',async()=>{
 const s=setup();await s.recognition.open();await frames(s,2,2000);s.transport.event({type:'partial',generation:0,text:'Provider draft'});s.transport.event({type:'partial',generation:0,text:'Provider revised draft'});await frames(s,8,0);s.transport.event({type:'final',generation:0,text:'Provider final wording.'});const audit=s.progress.mock.calls.at(-1)![0].audit;
 expect(audit.items[0].partials.map((p:{text:string})=>p.text)).toEqual(['Provider draft','Provider revised draft']);expect(audit.items[0]).toMatchObject({final:'Provider final wording.',clippedSamples:0});expect(audit.items.reduce((n:number,i:{samples:number})=>n+i.samples,0)).toBe(24000);expect(audit.items.reduce((n:number,i:{appendedSamples:number})=>n+i.appendedSamples,0)).toBe(24000);expect(s.engine.finalized).toHaveBeenCalledWith('en','Provider final wording.');s.recognition.cancel();
});
it('bounds raw evidence independently, reports frame discontinuities and never hides dropped partials',()=>{
 const audit=new RecognitionAudit(750);audit.item(0,0);audit.frame(0,2400,1,.2,0,.1,100,2500);audit.frame(0,2400,1,.2,0,.1,2600,5000);for(let i=0;i<100;i++)audit.partial(0,'x'.repeat(1000)+i,i);const result=audit.snapshot();expect(result.frameGaps).toBe(100);expect(result.items[0].droppedPartials).toBeGreaterThan(0);expect(new TextEncoder().encode(JSON.stringify(result)).length).toBeLessThanOrEqual(65536);
});
const request=(text:string):UnitRequest=>({text,language:'en',sourceHistory:'',targetHistory:'',conversationContext:'',speakerRole:'agent',protectedTerms:[],precision:false,uncertaintyRouting:true});
it('routes the exact recorded comma greeting through the existing catalogue without a provider call',async()=>{
 vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Provider forbidden');}));const result=[];for await(const e of incrementalTranslation(request('Hi, good morning,')))result.push(e);expect(result).toEqual([{type:'done',result:expect.objectContaining({model:'validated-greeting-v1',translation:'Hej, godmorgen,'})}]);expect(fetch).not.toHaveBeenCalled();
 const committer=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true,true);expect(committer.update('Hi, good morning,',0).segments).toEqual([]);expect(committer.update('Hi, good morning,',130).segments.map(s=>s.text)).toEqual(['Hi, good morning,']);
 for(const source of ['Hi, good morning, I do not consent.','Hi, good morning?','Hi, good morning, doctor Smith.'])expect(validatedGreeting(request(source))).toBeUndefined();expect(validatedGreeting({...request('Hi, good morning,'),precision:true})).toBeUndefined();expect(validatedGreeting({...request('Hi, good morning,'),protectedTerms:['morning']})).toBeUndefined();
});
it('does not introduce the offline reference or phrase-specific correction into production recognition configuration',()=>{
 const config=JSON.stringify(transcriptionSession('en'));expect(config).not.toContain(reference.text);for(const phrase of ['to receive useful and relevant information','continue receiving this information in the future','I hope this gives you a clear introduction'])expect(config).not.toContain(phrase);expect(config).toContain('"turn_detection":null');expect(config).toContain('"model":"gpt-live-transcribe"');
});
it('records a 620ms audible transition without changing scheduling or translating silence',()=>{
 const lane=emptyLane();lane.receivedWords=1;const gaps=new GapTimeline();gaps.update(lane,{lastAudibleAt:0},0,true);gaps.update(lane,{lastAudibleAt:0},500,true);gaps.update(lane,{lastAudibleAt:620},620,true);expect(gaps.records).toHaveLength(1);expect(gaps.records[0]).toMatchObject({gap_start:0,gap_end:620,gap_duration:620,endedBy:'audible_audio'});
});
it('retains the recorded suspicious wording verbatim rather than substituting expected healthcare phrases',async()=>{
 const s=setup();await s.recognition.open();await frames(s,2,2000);s.transport.event({type:'partial',generation:0,text:'Pero sí useful'});await frames(s,8,0);s.transport.event({type:'final',generation:0,text:'Pero sí useful'});expect(s.engine.finalized).toHaveBeenCalledExactlyOnceWith('en','Pero sí useful');expect(s.progress.mock.calls.at(-1)![0].audit.items[0].final).toBe('Pero sí useful');s.recognition.cancel();
});
