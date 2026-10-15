import {it,expect,vi,afterEach} from 'vitest';
import {StreamingInterpreter,type Output,type InterpreterIO} from '../src/streaming/engine';
import {SemanticCommitter,precisionTrigger} from '../src/streaming/semantic';
import {TrailingMonitor} from '../src/streaming/trailing';
import type {SemanticUnit} from '../src/streaming/types';
import {emptyLane} from '../src/streaming/types';
const options={bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret only',scopedPrecision:true,simultaneous:true};
afterEach(()=>vi.useRealTimers());
it('commits a complete precision sentence without holding the following ordinary range',()=>{
 const c=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true);
 const source='Hi, good morning. We would like permission to send information by email. The information may include medical material. ';
 c.update(source,0);const result=c.update(source+'We call the clinic.',300);
 expect(result.segments.map(s=>[s.text,s.precision])).toEqual([['Hi, good morning.',false],['We would like permission to send information by email.',true],['The information may include medical material.',false]]);expect(c.precision).toBe('');
});
it.each(["We don't have permission,",'Can you,','My email address is anna@'])('does not release unsafe precision/question fragments: %s',text=>{
 const c=new SemanticCommitter('en',100,120,true,precisionTrigger,true,true);c.update(text,0);expect(c.update(text+' additional context',300).segments).toHaveLength(0);
});
it.each([['da','Har du noget mere,','jeg skal give videre?'],['en','Have you anything else,','that I should pass on?'],['da','Jeg skal lige høre,','hvem der bedst kan hjælpe med din forespørgsel.'],['en','Let me just check,','who can help with your inquiry.']] as const)('keeps the %s question or indirect-question complement together: %s', (language,prefix,tail)=>{
 const c=new SemanticCommitter(language,100,120,true,precisionTrigger,true,true);c.update(prefix,0);const source=prefix+' '+tail;c.update(source,300);const result=c.update(source+' '+(language==='en'?'We are calling.':'Vi ringer.'),600);expect(result.segments).toHaveLength(1);expect(result.segments[0].text).toBe(source);expect(c.committedText).toBe(source);
});
it.each(['en','da']as const)('runs 30 seconds of continuous %s source with concurrent translation/playback, FIFO and no missing ranges',async language=>{
 vi.useFakeTimers();let next=0,finishAt=0;const sent:SemanticUnit[]=[];const timers=new Set<ReturnType<typeof setTimeout>>();
 const after=(ms:number,fn:()=>void)=>{const timer=setTimeout(()=>{timers.delete(timer);fn();},ms);timers.add(timer);};
 const output:Output={send:unit=>{sent.push(unit);const at=Math.max(performance.now()+150,next),duration=(unit.end-unit.start)/3*1000;next=at+duration;after(50,()=>engine.playback(unit.id,'firstAudio',performance.now()));after(at-performance.now(),()=>engine.playback(unit.id,'started',performance.now()));after(next-performance.now(),()=>engine.playback(unit.id,'finished',performance.now()));},finish:()=>new Promise<void>(resolve=>{after(Math.max(0,next-performance.now()),()=>{finishAt=performance.now();resolve();});}),cancel:()=>{for(const timer of timers)clearTimeout(timer);timers.clear();}};
 const requests:{at:number;playing:boolean}[]=[];
 const io:InterpreterIO={now:()=>performance.now(),translate:async input=>{requests.push({at:performance.now(),playing:sent.some(u=>u.timing.playback_started!==undefined&&u.timing.playback_finished===undefined)});await new Promise<void>(r=>after(100,r));return{translation:input.text,confidence:.99,needs_precision:false};},output:vi.fn(async()=>output),pauseInput:vi.fn()};
 const engine=new StreamingInterpreter(io,()=>{},options);engine.start();engine.sourceStarted(language,0);
 const phrase=language==='en'?'We are calling the clinic to share relevant professional information.':'Vi ringer til klinikken for at dele relevant faglig information.';
 const tokens=(language==='en'?'Hi, good morning. ':'Hej, godmorgen. ')+Array(10).fill(phrase).join(' ');const words=tokens.split(/\s+/).slice(0,90);let source='';
 for(let n=0;n<90;n++){await vi.advanceTimersByTimeAsync(1000/3);source+=(source?' ':'')+words[n];engine.partial(language,source);}
 const sourceEnd=performance.now();engine.finalized(language,source);await vi.advanceTimersByTimeAsync(10000);
 expect(sent[0].timing.playback_started).toBeLessThan(sourceEnd);expect(requests.some(r=>r.playing&&r.at<sourceEnd)).toBe(true);expect(io.output).toHaveBeenCalledOnce();expect(io.pauseInput).not.toHaveBeenCalled();expect(engine.idle).toBe(true);expect(finishAt).toBeGreaterThan(sourceEnd);
 const units=engine.snapshot.lanes[language].units;expect(new Set(units.map(u=>u.id)).size).toBe(units.length);expect(units.at(-1)?.end).toBe(engine.snapshot.lanes[language].receivedWords);expect(engine.snapshot.lanes[language].spokenWords).toBe(engine.snapshot.lanes[language].receivedWords);for(let n=1;n<units.length;n++)expect(units[n].start).toBe(units[n-1].end);engine.end();expect(vi.getTimerCount()).toBe(0);
});
it('translates the next natural source turn while the previous output is still draining',async()=>{
 let finish!:(value:void)=>void;const output:Output={send:vi.fn(),finish:()=>new Promise<void>(r=>{finish=r;}),cancel:vi.fn()};const io:InterpreterIO={now:()=>0,translate:vi.fn(async input=>({translation:input.text,confidence:.99,needs_precision:false})),output:vi.fn(async()=>output),pauseInput:vi.fn()};const engine=new StreamingInterpreter(io,()=>{},options);engine.start();engine.sourceStarted('en',0);engine.finalized('en','My name is Humza.');await vi.waitFor(()=>expect(output.send).toHaveBeenCalledOnce());
 engine.sourceStarted('en',100);engine.finalized('en','I am calling the clinic.');await vi.waitFor(()=>expect(io.translate).toHaveBeenCalledTimes(2));expect(output.send).toHaveBeenCalledOnce();finish();await vi.waitFor(()=>expect(output.send).toHaveBeenCalledTimes(2));engine.end();finish();
});
it('continues a recoverable ordinary uncertain unit without a precision retry',async()=>{
 const texts:string[]=[];const output:Output={send:vi.fn(),finish:vi.fn(async()=>{}),cancel:vi.fn()};const io:InterpreterIO={now:()=>0,translate:async input=>{texts.push(input.text);return{translation:input.text,confidence:texts.length===1?.5:.99,needs_precision:texts.length===1};},output:async()=>output,pauseInput:vi.fn()};const engine=new StreamingInterpreter(io,()=>{},options);engine.start();engine.sourceStarted('en',0);engine.finalized('en','My name is Humza.');await vi.waitFor(()=>expect(engine.idle).toBe(true));expect(texts).toEqual(['My name is Humza.']);expect(output.send).toHaveBeenCalledOnce();engine.end();
});
it('STOP aborts a prefetched translation and prevents it from reaching the draining output',async()=>{
 let release!:(value:void)=>void;let finish!:(value:void)=>void;let pendingSignal:AbortSignal|undefined;
 const output:Output={send:vi.fn(),finish:()=>new Promise<void>(r=>{finish=r;}),cancel:vi.fn()};
 const io:InterpreterIO={now:()=>0,translate:vi.fn(async(input,signal)=>{if(input.text.includes('clinic')){pendingSignal=signal;await new Promise<void>(r=>{release=r;});}return{translation:input.text,confidence:.99,needs_precision:false};}),output:vi.fn(async()=>output),pauseInput:vi.fn()};
 const engine=new StreamingInterpreter(io,()=>{},options);engine.start();engine.sourceStarted('en',0);engine.finalized('en','My name is Humza.');await vi.waitFor(()=>expect(output.send).toHaveBeenCalledOnce());engine.sourceStarted('en',100);engine.finalized('en','I am calling the clinic.');await vi.waitFor(()=>expect(pendingSignal).toBeDefined());engine.end();expect(pendingSignal?.aborted).toBe(true);release();finish();await vi.waitFor(()=>expect(engine.idle).toBe(true));expect(output.send).toHaveBeenCalledOnce();expect(output.cancel).toHaveBeenCalled();expect(engine.snapshot.lanes.en.units[1].status).toBe('interrupted');
});
it('does not report a completed tail while the final recognition range is still pending',()=>{
 const monitor=new TrailingMonitor(),lane=emptyLane();lane.receivedWords=4;lane.spokenWords=4;lane.units=[{id:'done',turn:1,language:'en',start:0,end:4,source:'My name is Humza.',status:'spoken',precision:false,timing:{source_start:0,source_stable_at:1000,source_end_observed:900,playback_started:1000,playback_finished:2000}}];monitor.sourceEnded(3000);monitor.update(lane,0,3000,3100,{ttsCharacters:20,targetSamples:24000,playbackSamples:24000});expect(monitor.summary.endOfSourceToEndOfTranslation).toBeUndefined();lane.partial='Further content';lane.sourceFinished=3200;monitor.update(lane,0,3000,3300,{ttsCharacters:20,targetSamples:24000,playbackSamples:24000});expect(monitor.summary.endOfSourceToEndOfTranslation).toBeUndefined();
});
it('logs speaker change with remaining audio and does not interrupt either source by default',async()=>{
 const output:Output={queuedMs:850,send:vi.fn(),finish:()=>new Promise<void>(()=>{}),cancel:vi.fn()};const io:InterpreterIO={now:()=>0,translate:async input=>({translation:input.text,confidence:.99,needs_precision:false}),output:async()=>output,pauseInput:vi.fn()};const engine=new StreamingInterpreter(io,()=>{},options);engine.start();engine.sourceStarted('en',0);engine.partial('en','My name is Humza,');await new Promise(r=>setTimeout(r,130));engine.partial('en','My name is Humza, and I am calling.'); // clock is fixed: finalize to queue output
 engine.finalized('en','My name is Humza.');await vi.waitFor(()=>expect(output.send).toHaveBeenCalledOnce());engine.sourceStarted('da',100);expect(engine.snapshot.bargeIns[0]).toMatchObject({event:'SPEAKER_CHANGE_DURING_TRANSLATION',remainingAudioMs:850,action:'Logged only'});expect(output.cancel).not.toHaveBeenCalled();engine.end();
});
it('measures estimated trailing progress, checkpoints and source-end tail independently of old unit-onset delay',()=>{
 const monitor=new TrailingMonitor();const lane={source:'',liveCommitted:'',partial:'',target:'',targetPartial:'',receivedWords:15,committedWords:15,translatedWords:15,spokenWords:0,precision:'',sourceFinished:5000,units:[{id:'u',turn:1,globalStart:0,language:'en' as const,start:0,end:15,source:'source',status:'queued' as const,precision:false,playedFraction:.6,timing:{source_start:0,source_end_observed:5000,source_stable_at:5100,playback_started:2000}}]};
 monitor.update(lane,0,5000,5000,{ttsCharacters:50,targetSamples:24000,playbackSamples:12000,bufferMs:500});expect(monitor.summary.currentTrailingLag).toBe(2000);expect(monitor.summary.checkpoints).toHaveLength(1);monitor.sourceEnded(5000);lane.spokenWords=15;lane.units[0].playedFraction=1;lane.units[0].status='spoken' as 'queued';Object.assign(lane.units[0].timing,{playback_finished:6900});monitor.update(lane,0,5000,7000,{ttsCharacters:50,targetSamples:24000,playbackSamples:24000});expect(monitor.summary.endOfSourceToEndOfTranslation).toBe(1900);expect(monitor.summary.sampleCount).toBe(1);expect(monitor.summary.currentTrailingLag).toBe(0);
});
