import {RecognitionReviewRequired} from '../src/streaming/continuousRecognition';
import type {CaptureTiming} from '../src/streaming/acousticTiming';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {LocalTestSession,localMetrics,type LocalDependencies,type LocalOptions} from '../src/streaming/localSession';
import type {StreamingInterpreter} from '../src/streaming/engine';
import type {PlaybackHooks,ContinuousPcmScheduler} from '../src/streaming/scheduler';
import type {SemanticUnit} from '../src/streaming/types';
import {lastSessionDiagnostics,exportLastSessionDiagnostics} from '../src/streaming/sessionDiagnostics';

const options:LocalOptions={source:'en',path:'semantic',cachedOpening:false,microphone:'selected-mic',output:'selected-headphones',jitterMs:100,bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret only.'};
beforeEach(()=>vi.useFakeTimers());afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function setup(overrides:Partial<LocalOptions>={}){
 let clock=100, capture!:(bytes:Uint8Array,timing?:CaptureTiming)=>void, engine!:StreamingInterpreter,hooks!:PlaybackHooks;
 let translatedAudio!:(bytes:Uint8Array)=>void,caption!:(lane:'source'|'target',text:string)=>void;
 const source={prepare:vi.fn(async(_device:string,pcm:(bytes:Uint8Array,timing?:CaptureTiming)=>void)=>{capture=pcm;}),enable:vi.fn(),checkpoint:vi.fn(async()=>{}),cancel:vi.fn()};
 const sent:SemanticUnit[]=[];
 const speech={send:vi.fn((unit:SemanticUnit)=>sent.push(unit)),finish:vi.fn(async()=>{}),cancel:vi.fn()};
 const renderer={push:vi.fn(),mark:vi.fn(),finish:vi.fn(async()=>{}),cancel:vi.fn(),queuedMs:120};
 const output={prepare:vi.fn(async()=>{}),open:vi.fn(async()=>speech),controlled:vi.fn(async()=>speech),opening:vi.fn(async()=>{}),renderer:vi.fn(()=>renderer as unknown as ContinuousPcmScheduler),release:vi.fn(),cancel:vi.fn()};
 const recognition={open:vi.fn(async()=>{}),feed:vi.fn(),finish:vi.fn(async()=>{}),cancel:vi.fn()};
 const direct={open:vi.fn(async()=>{}),append:vi.fn(),finish:vi.fn(async()=>{}),close:vi.fn()};
 const deps:LocalDependencies={now:()=>clock,microphone:()=>source,output:(_language,_jitter,h)=>{hooks=h;return output;},recognition:vi.fn((_language,e)=>{engine=e;return recognition;}),continuousRecognition:vi.fn((_language,e)=>{engine=e;return recognition;}),direct:(audio,text)=>{translatedAudio=audio;caption=text;return direct;},translate:vi.fn(async input=>({translation:input.language==='en'?'Hej.':'Hello.',confidence:.99,needs_precision:false,model:'fixture-model'}))};
 const changed=vi.fn();const session=new LocalTestSession({...options,...overrides},changed,deps);
 const pcm=new Uint8Array(4800);new Int16Array(pcm.buffer).fill(2000);
 return{session,source,output,recognition,direct,deps,sent,speech,renderer,changed,feed:(timing?:CaptureTiming)=>capture(pcm,timing),lateAudio:()=>translatedAudio(new Uint8Array([0,8,0,9])),caption:(lane:'source'|'target',text:string)=>caption(lane,text),engine:()=>engine,hooks:()=>hooks,at:(n:number)=>{clock=n;}};
}
it.each(['en','da']as const)('starts %s on one microphone without any peer or pairing prerequisite',async language=>{
 vi.stubGlobal('RTCPeerConnection',class{constructor(){throw new Error('Local mode must not create a peer');}});
 const s=setup({source:language});await s.session.prepare();
 expect(s.source.prepare).toHaveBeenCalledWith('selected-mic',expect.any(Function),expect.any(Function));
 expect(s.output.prepare).toHaveBeenCalledWith('selected-headphones',expect.any(AbortSignal));
 expect(s.deps.recognition).toHaveBeenCalledWith(language,expect.anything(),expect.any(AbortSignal),language==='en'?450:1350,expect.any(Function));
 s.feed();expect(s.recognition.feed).toHaveBeenCalledOnce();expect(s.speech.send).not.toHaveBeenCalled();expect(s.renderer.push).not.toHaveBeenCalled();expect(s.direct.append).not.toHaveBeenCalled();
 expect(s.source.enable).toHaveBeenLastCalledWith(true);s.session.end();
});
it.each(['en','da']as const)('uses the actual semantic engine and source direction %s for validated translated speech',async language=>{
 const s=setup({source:language});await s.session.prepare();s.feed();
 const engine=s.engine();engine.sourceStarted(language,100);
 engine.partial(language,language==='en'?'My name is Humza,':'Hej, jeg hedder Pernille.');s.at(300);
 engine.partial(language,language==='en'?'My name is Humza, and I am calling.':'Hej, jeg hedder Pernille. Jeg ringer til dig.');
 await vi.waitFor(()=>expect(s.sent.length).toBeGreaterThan(0));
 expect(s.output.open).toHaveBeenCalledWith(language,expect.any(Number),expect.any(AbortSignal));
 expect(s.sent[0].target).toBe(language==='en'?'Hej.':'Hello.');expect(s.session.snapshot.lanes[language].target).toBe(s.sent[0].target);
 expect(s.session.snapshot.lanes[language==='en'?'da':'en'].units).toHaveLength(0);
 s.session.end();expect(vi.getTimerCount()).toBe(0);
});
it('retains precision handling rather than speaking a partial negation',async()=>{
 const s=setup();await s.session.prepare();const engine=s.engine();engine.sourceStarted('en',100);engine.partial('en','I do not give permission to send emails.');
 expect(s.speech.send).not.toHaveBeenCalled();expect(s.session.snapshot.lanes.en.precision).toBeTruthy();
 engine.finalized('en','I do not give permission to send emails.');await vi.waitFor(()=>expect(s.sent).toHaveLength(1));
 expect(s.sent[0].precision).toBe(true);s.session.end();
});
it('controlled fallback waits for a full turn and resumes the same microphone after translated output',async()=>{
 const s=setup({forceControlled:true});await s.session.prepare();const engine=s.engine();engine.sourceStarted('en',100);engine.partial('en','Hello, I am calling the clinic.');
 expect(s.output.controlled).not.toHaveBeenCalled();engine.finalized('en','Hello, I am calling the clinic.');
 await vi.waitFor(()=>expect(s.sent).toHaveLength(1));expect(s.output.open).not.toHaveBeenCalled();
 expect(s.source.enable).toHaveBeenLastCalledWith(false);await vi.waitFor(()=>expect(engine.idle).toBe(true));
 expect(s.source.enable).toHaveBeenLastCalledWith(true);expect(s.session.snapshot.listeningTo).toBe('en');s.session.end();
});
it('finalizes only the local source via the existing microphone checkpoint',async()=>{
 const s=setup({source:'da'});await s.session.prepare();await s.session.finish();
 expect(s.source.checkpoint).toHaveBeenCalledOnce();expect(s.recognition.finish).toHaveBeenCalledOnce();s.session.end();
});
it('plays the cached Danish opening with input disabled and excludes it from latency',async()=>{
 const s=setup({cachedOpening:true});s.output.opening.mockImplementation(async()=>{expect(s.source.enable).not.toHaveBeenCalledWith(true);s.hooks().firstAudio('cached',10);s.hooks().started('cached',20);s.feed();});
 await s.session.prepare();expect(s.output.opening).toHaveBeenCalledOnce();expect(s.recognition.feed).not.toHaveBeenCalled();
 expect(s.session.snapshot.cachedEvents?.[0].id).toBe('opening');expect(localMetrics(s.session.snapshot,'en').timeToFirstTranslatedAudio).toBeUndefined();s.session.end();
});
it('refuses a Danish opening during Danish → English and refuses direct controlled handling',()=>{
 expect(()=>setup({source:'da',cachedOpening:true})).toThrow('Cached Danish opening');
 expect(()=>setup({source:'da',path:'direct',forceControlled:true})).toThrow('cannot use controlled');
});
it.each(['da']as const)('direct %s capture goes only to the provider, while only generated PCM reaches headphones',async source=>{
 const s=setup({source,path:'direct'});await s.session.prepare();s.feed();
 expect(s.direct.open).toHaveBeenCalledWith(source,expect.any(AbortSignal));expect(s.direct.append).toHaveBeenCalledOnce();expect(s.renderer.push).not.toHaveBeenCalled();
 s.caption('source','Hej.');s.caption('target','Hello.');s.lateAudio();
 expect(s.renderer.push).toHaveBeenCalledOnce();expect(s.session.snapshot.lanes[source].source).toBe('Hej.');
 s.session.end();s.lateAudio();s.caption('source','late');s.feed();expect(s.renderer.push).toHaveBeenCalledOnce();expect(s.direct.append).toHaveBeenCalledOnce();
 expect(s.session.snapshot.lanes[source].source).not.toContain('late');expect(s.direct.close).toHaveBeenCalledOnce();expect(s.renderer.cancel).toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('direct Finish drains generated speech and preserves both captions and honest unavailable semantic lag',async()=>{
 const s=setup({source:'da',path:'direct'});await s.session.prepare();s.feed();s.caption('source','Hello.');s.caption('target','Hej.');
 s.at(400);s.hooks().firstAudio('direct-target',400);s.hooks().started('direct-target',450);
 await s.session.finish();expect(s.renderer.finish).toHaveBeenCalledOnce();expect(s.direct.finish).toHaveBeenCalledOnce();
 expect(s.session.snapshot.active).toBe(false);expect(s.session.snapshot.lanes.da.source).toBe('Hello.');expect(s.session.snapshot.lanes.da.target).toBe('Hej.');
 expect(localMetrics(s.session.snapshot,'en')).toMatchObject({timeToFirstTranslatedAudio:350,firstTranslatedPcm:300,currentLag:undefined,medianLag:undefined,p95Lag:undefined});
});
it('measures first translated playback and semantic lag statistics on the same laptop clock',async()=>{
 const s=setup();await s.session.prepare();s.feed();const engine=s.engine();engine.sourceStarted('en',100);engine.finalized('en','Hello.');await vi.waitFor(()=>expect(s.sent).toHaveLength(1));
 const id=s.sent[0].id;s.hooks().firstAudio(id,350);s.hooks().started(id,500);s.hooks().finished(id,600);
 expect(localMetrics(s.session.snapshot,'en')).toMatchObject({timeToFirstTranslatedAudio:400,firstTranslatedPcm:250,medianLag:400,p95Lag:400,samples:1});s.session.end();
});
it('STOP during preparation cannot start recognition or enable a late microphone grant',async()=>{
 const s=setup();let release!:()=>void;s.source.prepare.mockImplementation(()=>new Promise<void>(r=>{release=r;}));
 const pending=s.session.prepare();expect(s.session.snapshot.active).toBe(true);s.session.end();release();await expect(pending).rejects.toMatchObject({name:'AbortError'});
 expect(s.source.cancel).toHaveBeenCalled();expect(s.recognition.open).not.toHaveBeenCalled();expect(s.source.enable).not.toHaveBeenCalledWith(true);expect(s.output.cancel).toHaveBeenCalled();
});
it('setup failure cleans both audio graphs and permits a fresh session',async()=>{
 const s=setup();s.output.prepare.mockRejectedValue(new Error('Headphones disconnected'));await expect(s.session.prepare()).rejects.toThrow('Headphones disconnected');
 expect(s.session.snapshot).toMatchObject({state:'ERROR',active:false});expect(s.source.cancel).toHaveBeenCalledOnce();expect(s.output.cancel).toHaveBeenCalledOnce();expect(s.recognition.open).not.toHaveBeenCalled();
 const next=setup();await next.session.prepare();expect(next.session.snapshot.active).toBe(true);next.session.end();
});
it('STOP while translation is pending never plays the late result',async()=>{
 const s=setup();let release!:(r:{translation:string;confidence:number;needs_precision:boolean})=>void;
 vi.mocked(s.deps.translate!).mockImplementation(()=>new Promise(r=>{release=r;}));await s.session.prepare();const engine=s.engine();engine.sourceStarted('en',100);engine.finalized('en','Hello.');
 await vi.waitFor(()=>expect(s.deps.translate).toHaveBeenCalled());s.session.end();release({translation:'Late.',confidence:.99,needs_precision:false});await vi.waitFor(()=>expect(engine.idle).toBe(true));
 expect(s.speech.send).not.toHaveBeenCalled();expect(s.source.cancel).toHaveBeenCalledOnce();expect(s.recognition.cancel).toHaveBeenCalledOnce();
});
it.each(['en','da']as const)('selects the persistent primary recognizer for %s with isolated target output',async source=>{
 const s=setup({source,path:'realtime'});await s.session.prepare();s.feed();expect(s.deps.continuousRecognition).toHaveBeenCalledWith(source,expect.anything(),expect.any(AbortSignal),source==='en'?750:1350,expect.any(Function),expect.any(Function));expect(s.deps.recognition).not.toHaveBeenCalled();
 const engine=s.engine();engine.sourceStarted(source,100);engine.finalized(source,'Hej.');await vi.waitFor(()=>expect(s.sent).toHaveLength(1));expect(s.output.open).toHaveBeenCalledWith(source,expect.any(Number),expect.any(AbortSignal));s.session.end();
});
it('primary provider failure stops input/output, retains the transcript and allows restart',async()=>{
 const s=setup({path:'realtime'});vi.mocked(s.deps.translate!).mockRejectedValue(new Error('Translation unavailable'));await s.session.prepare();const engine=s.engine();engine.sourceStarted('en',100);engine.finalized('en','Retained source.');
 await vi.waitFor(()=>expect(s.session.snapshot.state).toBe('ERROR'));expect(s.session.snapshot.active).toBe(false);expect(s.session.snapshot.lanes.en.source).toBe('Retained source.');expect(s.source.cancel).toHaveBeenCalledOnce();expect(s.output.cancel).toHaveBeenCalledOnce();expect(s.speech.send).not.toHaveBeenCalled();
 const next=setup({path:'realtime'});await next.session.prepare();expect(next.session.snapshot.active).toBe(true);next.session.end();
});
it('measures a naturally finalized primary-source tail without requiring the Finish speaking button',async()=>{
 const s=setup({path:'realtime'});await s.session.prepare();s.feed();const engine=s.engine();engine.sourceStarted('en',100);s.at(700);engine.finalized('en','My name is Humza.');await vi.waitFor(()=>expect(s.sent).toHaveLength(1));const id=s.sent[0].id;s.hooks().started(id,800);s.at(1200);s.hooks().finished(id,1200);expect(s.session.snapshot.trailing?.endOfSourceToEndOfTranslation).toBe(1100);s.at(1500);s.feed();await vi.advanceTimersByTimeAsync(100);expect(s.session.snapshot.trailing?.endOfSourceToEndOfTranslation).toBeUndefined();s.session.end();
});
it('disables the OpenAI Danish audio experiment before opening microphone, renderer or paid session',()=>{
 expect(()=>setup({source:'en',path:'direct'})).toThrow('OpenAI Danish audio is disabled');
});
it('STOP closes an active GAP diagnostic and cannot create another gap from retained uncommitted source',async()=>{
 const s=setup({path:'realtime'});Object.assign(s.output,{positions:{ttsCharacters:5,targetSamples:2400,playbackSamples:2400,lastAudibleAt:100,firstScheduledAt:100,bufferMs:0}});await s.session.prepare();s.feed();const engine=s.engine();engine.sourceStarted('en',100);engine.finalized('en','My name is Humza.');await vi.waitFor(()=>expect(s.sent).toHaveLength(1));s.at(300);s.hooks().started(s.sent[0].id,150);s.hooks().finished(s.sent[0].id,200);s.at(1000);engine.sourceStarted('en',1000);engine.partial('en','I can explain');s.feed();s.at(1900);await vi.advanceTimersByTimeAsync(100);expect(s.session.snapshot.gaps).toHaveLength(1);s.session.end();expect(s.session.snapshot.gaps).toHaveLength(1);expect(s.session.snapshot.gaps?.[0]).toMatchObject({gap_end:1900,endedBy:'STOP'});await vi.advanceTimersByTimeAsync(1000);expect(s.session.snapshot.gaps).toHaveLength(1);expect(vi.getTimerCount()).toBe(0);
});
it('retains translated Danish text after ElevenLabs failure and never opens any fallback voice',async()=>{
 const s=setup({path:'realtime'});s.output.open.mockRejectedValue(new Error('ElevenLabs unavailable'));await s.session.prepare();
 const engine=s.engine();engine.sourceStarted('en',100);engine.finalized('en','My name is Humza.');await vi.waitFor(()=>expect(s.session.snapshot.state).toBe('ERROR'));
 expect(s.session.snapshot.lanes.en.target).toBeTruthy();expect(s.speech.send).not.toHaveBeenCalled();expect(s.output.controlled).not.toHaveBeenCalled();expect(s.direct.open).not.toHaveBeenCalled();expect(s.source.cancel).toHaveBeenCalledOnce();expect(s.output.cancel).toHaveBeenCalledOnce();
});
it('keeps the primary microphone and recognizer feeding while lagged translations keep queueing',async()=>{
 const s=setup({path:'realtime'});await s.session.prepare();const engine=s.engine();engine.sourceStarted('en',100);engine.partial('en','We are calling the clinic.');s.at(400);engine.partial('en','We are calling the clinic. We send information.');await vi.waitFor(()=>expect(s.sent).toHaveLength(1));s.at(21000);await vi.advanceTimersByTimeAsync(100);
 expect(s.session.snapshot.backpressure?.en?.state).toBe('behind');expect(s.session.snapshot.lanes.en.precision).toBe('');expect(s.session.snapshot.active).toBe(true);s.feed();expect(s.recognition.feed).toHaveBeenCalledOnce();expect(s.source.enable).toHaveBeenLastCalledWith(true);expect(s.recognition.cancel).not.toHaveBeenCalled();expect(s.source.cancel).not.toHaveBeenCalled();engine.partial('en','We are calling the clinic. We send information. We can call later.');s.at(21400);engine.partial('en','We are calling the clinic. We send information. We can call later. More');await vi.waitFor(()=>expect(s.sent.length).toBeGreaterThan(1));expect(s.output.open).toHaveBeenCalledOnce();expect(s.session.snapshot.error).toBe('');s.session.end();expect(s.recognition.cancel).toHaveBeenCalledOnce();expect(s.output.cancel).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
it('reports acoustic first-audio and tail from source PCM and target playback, independently of legacy ASR timings',async()=>{
 const s=setup({path:'realtime'});await s.session.prepare();const clock={method:'context-performance-pair' as const,contextTime:0,performanceTime:100,renderQuantumMs:128/24,deviceLatencyIncluded:false};s.at(2300);s.feed({frameStart:48000,frameEnd:50400,sampleRate:24000,startAt:2100,endAt:2200,clock});const engine=s.engine();engine.sourceStarted('en',2300);engine.finalized('en','We call the clinic.');await vi.waitFor(()=>expect(s.sent).toHaveLength(1));const id=s.sent[0].id;
 s.hooks().measurement?.({type:'pcm_received',streamId:'test',at:3300,clock});s.hooks().measurement?.({type:'block_scheduled',streamId:'test',block:0,at:3400,clock,startAt:4300,endAt:5300,signalStartAt:4400,signalEndAt:5200});s.at(4000);await vi.advanceTimersByTimeAsync(100);expect(s.session.snapshot.acoustic?.firstAudioLatency).toBeUndefined();
 s.at(4500);s.hooks().measurement?.({type:'block_audible',streamId:'test',block:0,at:4500,clock,startAt:4300,endAt:5300,signalStartAt:4400,signalEndAt:5200});s.hooks().started(id,4300);expect(s.session.snapshot.acoustic).toMatchObject({sourceSpeechOnset:2000,sourceSpeechEnd:2100,firstAudioLatency:2300,firstPCMReceivedAt:3200});expect(s.session.snapshot.acoustic?.tailLatency).toBeUndefined();
 s.at(5500);s.hooks().measurement?.({type:'block_rendered',streamId:'test',block:0,at:5500,clock,startAt:4300,endAt:5300,signalStartAt:4400,signalEndAt:5200});s.hooks().finished(id,5300);await vi.advanceTimersByTimeAsync(100);expect(s.session.snapshot.acoustic).toMatchObject({targetPlaybackEnd:5100,tailLatency:3000,complete:true});const before=s.session.snapshot.acoustic;s.session.end();expect(s.session.snapshot.acoustic).toMatchObject({firstAudioLatency:before!.firstAudioLatency,tailLatency:before!.tailLatency,stopped:true});
});
it('archives a real session failure before READY/reset without altering STOP cleanup or replaying audio',async()=>{
 const s=setup({path:'realtime'});await s.session.prepare();s.feed();const engine=s.engine();engine.sourceStarted('en',100);engine.finalized('en','We are calling the clinic.');await vi.waitFor(()=>expect(s.sent).toHaveLength(1));
 s.hooks().audit?.({type:'voice.finish_requested',at:400,requestId:'failure-context',text:'private speech',apiKey:'never-store'});
 s.hooks().audit?.({type:'voice.finalization_timeout_expired',at:30400,requestId:'failure-context',timeoutMs:30000});s.hooks().failed?.(new Error('Voice finalization timed out.'));
 const failed=lastSessionDiagnostics()!;expect(failed).toMatchObject({outcome:'failed',reason:'voice.finalization_timeout'});expect(failed.events.map(e=>e.event)).toEqual(expect.arrayContaining(['unit.committed','translation.ready','tts.queued','voice.finish_requested','voice.finalization_timeout_expired','session.stop_requested','session.ended']));
 expect(exportLastSessionDiagnostics()).not.toContain('private speech');expect(exportLastSessionDiagnostics()).not.toContain('never-store');
 expect(s.source.cancel).toHaveBeenCalledOnce();expect(s.recognition.cancel).toHaveBeenCalledOnce();expect(s.output.cancel).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);s.session.end();s.feed();expect(s.source.cancel).toHaveBeenCalledOnce();
 const next=setup({path:'realtime'});await next.session.prepare();expect(lastSessionDiagnostics()?.sessionId).toBe(failed.sessionId);next.session.end();expect(lastSessionDiagnostics()?.sessionId).not.toBe(failed.sessionId);
});
it('persists STOP and playback metadata once while cleanup still cancels every existing source/output',async()=>{
 const s=setup({path:'realtime'});await s.session.prepare();s.hooks().measurement?.({type:'block_scheduled',streamId:'stream-one',block:0,at:300,clock:{method:'context-performance-pair',contextTime:0,performanceTime:100,renderQuantumMs:128/24,deviceLatencyIncluded:false}});s.session.end();
 expect(lastSessionDiagnostics()).toMatchObject({reason:'STOP',outcome:'stopped'});expect(lastSessionDiagnostics()?.events.map(e=>e.event)).toContain('playback.block_scheduled');
 expect(s.source.cancel).toHaveBeenCalledOnce();expect(s.recognition.cancel).toHaveBeenCalledOnce();expect(s.output.cancel).toHaveBeenCalledOnce();const json=exportLastSessionDiagnostics();s.hooks().audit?.({type:'late.event',at:900});expect(exportLastSessionDiagnostics()).toBe(json);expect(vi.getTimerCount()).toBe(0);
});

it('retains already committed translation and final audio when later unsupported ASR requires review',async()=>{
 const s=setup({path:'realtime'});let resolve!:(value:{translation:string;confidence:number;needs_precision:boolean})=>void;vi.mocked(s.deps.translate!).mockImplementation(()=>new Promise(r=>{resolve=r;}));await s.session.prepare();s.engine().sourceStarted('en',100);s.engine().finalized('en','Thank you.');await vi.advanceTimersByTimeAsync(1);
 const review=s.deps.continuousRecognition as ReturnType<typeof vi.fn>;const failed=review.mock.calls[0][4] as (e:Error)=>void;failed(new RecognitionReviewRequired('Unsupported raw source requires human review.'));
 expect(s.output.cancel).not.toHaveBeenCalled();expect(s.speech.cancel).not.toHaveBeenCalled();expect(s.session.snapshot.active).toBe(true);expect(s.source.enable).toHaveBeenLastCalledWith(false);expect(s.session.snapshot.warning).toContain('human review');
 resolve({translation:'Tak.',confidence:1,needs_precision:false});await vi.advanceTimersByTimeAsync(10);expect(s.sent).toHaveLength(1);const id=s.sent[0].id;s.hooks().firstAudio(id,1000);s.hooks().started(id,1010);s.hooks().finished(id,1300);
 expect(s.session.snapshot.lanes.en).toMatchObject({committedWords:2,translatedWords:2,spokenWords:2});expect(s.output.cancel).not.toHaveBeenCalled();s.session.end();expect(s.output.cancel).toHaveBeenCalledOnce();
});
