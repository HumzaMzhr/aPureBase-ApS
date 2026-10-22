import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {StreamingInterpreter,type InterpreterIO,type Output} from '../src/streaming/engine';
import type {SemanticUnit} from '../src/streaming/types';
import {words} from '../src/streaming/semantic';
import {ContinuousPcmScheduler} from '../src/streaming/scheduler';
import {fixtureVoice,fixturePcm} from './fixtures/voice';
const options={bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret only.',scopedPrecision:true,simultaneous:true};
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
function setup(stalled=false){
 let now=0;const releases:(()=>void)[]=[];const completeOnSend=stalled;const sent:SemanticUnit[]=[];
 const output:Output={send:vi.fn(unit=>{sent.push(unit);if(completeOnSend){engine.playback(unit.id,'firstAudio',now);engine.playback(unit.id,'started',now);engine.playback(unit.id,'finished',now);}}),finish:vi.fn(async()=>{}),cancel:vi.fn()};
 const io:InterpreterIO={now:()=>now,translate:vi.fn(async input=>{if(stalled&&sent.length===0)await new Promise<void>(r=>releases.push(r));return{translation:input.text,confidence:.99,needs_precision:false};}),output:vi.fn(async()=>output),pauseInput:vi.fn(),failed:vi.fn()};
 const engine=new StreamingInterpreter(io,()=>{},options);engine.start();return{engine,io,output,sent,at:(value:number)=>now=value,release:()=>{stalled=false;for(const release of releases.splice(0))release();},clock:()=>now};
}
it.each([3000,6000,20000])('%i ms of lag is advisory and does not pause recognition, translation or TTS queueing',async lag=>{
 const s=setup();try{s.engine.sourceStarted('en',0);s.engine.partial('en','We are calling the clinic.');s.at(200);s.engine.partial('en','We are calling the clinic. We can explain more.');await vi.waitFor(()=>expect(s.sent).toHaveLength(1));
  s.at(lag);await vi.advanceTimersByTimeAsync(100);expect(s.engine.snapshot.backpressure?.en).toMatchObject({state:lag===3000?'normal':'behind',lagMs:lag});expect(s.engine.snapshot.lanes.en.precision).toBe('');expect(s.engine.snapshot.state).not.toBe('PRECISION MODE');expect(s.engine.snapshot.warning).not.toMatch(/Finish speaking|pause|Lag limit/i);
  s.engine.partial('en','We are calling the clinic. We can explain more. We send information.');s.at(lag+300);s.engine.partial('en','We are calling the clinic. We can explain more. We send information. More');await vi.waitFor(()=>expect(s.sent.length).toBeGreaterThan(1));expect(s.io.pauseInput).not.toHaveBeenCalled();expect(s.io.failed).not.toHaveBeenCalled();expect(vi.mocked(s.io.translate).mock.calls.every(c=>!c[0].precision)).toBe(true);
 }finally{s.engine.end();}
});
it('shows only a developer backpressure warning between three and six seconds',async()=>{
 const s=setup();try{s.engine.sourceStarted('en',0);s.engine.partial('en','We are calling the clinic.');s.at(200);s.engine.partial('en','We are calling the clinic. We can explain more.');await vi.waitFor(()=>expect(s.sent).toHaveLength(1));s.at(4000);await vi.advanceTimersByTimeAsync(100);expect(s.engine.snapshot.backpressure?.en).toMatchObject({state:'lagging',warning:'Interpreter is behind.'});expect(s.engine.snapshot.warning).toBe('');expect(s.engine.snapshot.lanes.en.precision).toBe('');expect(s.io.pauseInput).not.toHaveBeenCalled();}finally{s.engine.end();}
});
it('passes the old eight-job threshold without merging or freezing committed units; all meaning drains once',async()=>{
 const s=setup(true);let source='';try{s.engine.sourceStarted('en',0);for(let n=0;n<22;n++){source+='We are calling the clinic. ';s.at(n*1000);s.engine.partial('en',source);s.at(n*1000+200);s.engine.partial('en',source+' More');await vi.advanceTimersByTimeAsync(100);}
  const lane=s.engine.snapshot.lanes.en;expect(lane.units.length).toBeGreaterThan(8);expect(lane.precision).toBe('');expect(lane.committedWords).toBe(words(source).length);expect(s.engine.snapshot.backpressure?.en).toMatchObject({state:'behind',semanticUnitCapacity:200,workQueueCapacity:400});expect(s.io.pauseInput).not.toHaveBeenCalled();expect(s.io.failed).not.toHaveBeenCalled();
  s.release();s.engine.finalized('en',source.trim());await vi.waitFor(()=>expect(s.engine.idle).toBe(true));expect(s.sent.map(u=>u.source).join(' ')).toBe(source.trim());expect(new Set(s.sent.map(u=>u.id)).size).toBe(s.sent.length);expect(lane.units).toHaveLength(22);for(let n=1;n<lane.units.length;n++)expect(lane.units[n].start).toBe(lane.units[n-1].end);expect(s.output.finish).toHaveBeenCalledOnce();expect(lane.spokenWords).toBe(lane.receivedWords);
 }finally{s.engine.end();}
});
it('reports the exact bounded storage capacity as a technical error, never semantic precision',async()=>{
 const s=setup(true);let source='';s.engine.sourceStarted('en',0);for(let n=0;n<201;n++){source+='We are calling the clinic. ';s.at(n*300);s.engine.partial('en',source);s.at(n*300+200);s.engine.partial('en',source+' More');}
 expect(s.engine.snapshot.lanes.en.units).toHaveLength(200);expect(s.engine.snapshot.lanes.en.precision).toBe('');expect(s.engine.snapshot.state).toBe('ERROR');expect(s.engine.snapshot.error).toContain('Semantic unit storage reached capacity (200 units for EN)');expect(s.engine.snapshot.backpressure?.en).toMatchObject({state:'capacity',capacityQueue:'Semantic unit storage'});expect(s.engine.snapshot.lanes.en.liveCommitted).toContain(source.trim());expect(s.engine.snapshot.lanes.en.units.every(u=>u.status==='interrupted')).toBe(true);expect(s.io.failed).toHaveBeenCalledOnce();s.release();await vi.waitFor(()=>expect(s.engine.idle).toBe(true));expect(s.sent).toHaveLength(0);s.engine.end();expect(vi.getTimerCount()).toBe(0);
});
it('keeps consequential uncertainty in precision even when playback is behind',async()=>{
 const s=setup();vi.mocked(s.io.translate).mockImplementation(async input=>({translation:input.text,confidence:.4,needs_precision:true,meaning_status:'recoverable',consequential_uncertainty:false}));try{
  s.engine.sourceStarted('en',0);s.at(20000);s.engine.finalized('en','I do not give permission.');await vi.waitFor(()=>expect(s.engine.idle).toBe(true));expect(s.sent).toHaveLength(0);expect(s.io.failed).toHaveBeenCalledOnce();expect(s.engine.snapshot.lanes.en.precision).toContain('human review');expect(s.io.pauseInput).toHaveBeenCalledWith('en');
 }finally{s.engine.end();}
});
it('STOP cancels lagged queues and prevents a late translation from becoming audio',async()=>{
 const s=setup(true);s.engine.sourceStarted('en',0);s.engine.partial('en','We are calling the clinic.');s.at(200);s.engine.partial('en','We are calling the clinic. We can explain more.');await vi.waitFor(()=>expect(s.io.translate).toHaveBeenCalledOnce());s.at(20000);await vi.advanceTimersByTimeAsync(100);expect(s.engine.snapshot.backpressure?.en?.state).toBe('behind');s.engine.end();s.release();await vi.waitFor(()=>expect(s.engine.idle).toBe(true));expect(s.sent).toHaveLength(0);expect(s.output.cancel).toHaveBeenCalled();expect(s.engine.snapshot.backpressure).toBeUndefined();expect(s.engine.snapshot.lanes.en.units.every(u=>u.status==='interrupted')).toBe(true);expect(vi.getTimerCount()).toBe(0);
});

class Context {
 state='running';destination={};get currentTime(){return performance.now()/1000;}
 createGain(){return{connect:vi.fn(),disconnect:vi.fn()};}
 createBuffer(_channels:number,samples:number){const data=new Float32Array(samples);return{duration:samples/24000,getChannelData:()=>data};}
 createBufferSource(){const node={buffer:undefined as {duration:number}|undefined,onended:null as null|(()=>void),connect:vi.fn(),disconnect:vi.fn(),timer:undefined as ReturnType<typeof setTimeout>|undefined,start:(at:number)=>{node.timer=setTimeout(()=>node.onended?.(),Math.ceil((at-this.currentTime+(node.buffer?.duration??0))*1000));},stop:()=>clearTimeout(node.timer)};return node;}
}
it('interprets 30 seconds continuously while Danish output trails, with real FIFO PCM scheduling and a complete natural drain',async()=>{
 const context=new Context(),sent:SemanticUnit[]=[],pending=new Set<ReturnType<typeof setTimeout>>();const states:{state:string;precision:string;pressure?:string}[]=[];let sample=0;
 const scheduler=new ContinuousPcmScheduler(context as unknown as AudioContext,'clinic','HCP_OUTPUT_DA',100,{firstAudio:(id,at)=>engine.playback(id,'firstAudio',at),scheduled:(id,at)=>engine.playback(id,'scheduled',at),started:(id,at)=>engine.playback(id,'started',at),finished:(id,at)=>engine.playback(id,'finished',at),underrun:()=>{}},undefined,fixtureVoice);
 const output:Output={get queuedMs(){return scheduler.queuedMs;},send:unit=>{sent.push(unit);const timer=setTimeout(()=>{pending.delete(timer);const samples=(unit.end-unit.start)*8000;scheduler.mark(unit.id,sample,sample+samples,true);sample+=samples;scheduler.push(fixturePcm(new Uint8Array(samples*2)),fixtureVoice);},7000);pending.add(timer);},finish:async()=>{while(pending.size)await new Promise<void>(r=>setTimeout(r,50));await scheduler.finish();},cancel:()=>{for(const timer of pending)clearTimeout(timer);pending.clear();scheduler.cancel();}};
 const io:InterpreterIO={now:()=>performance.now(),translate:vi.fn(async input=>({translation:input.text,confidence:.99,needs_precision:false})),output:vi.fn(async()=>output),pauseInput:vi.fn(),failed:vi.fn()};const engine=new StreamingInterpreter(io,s=>states.push({state:s.state,precision:s.lanes.en.precision,pressure:s.backpressure?.en?.state}),options);engine.start();engine.sourceStarted('en',performance.now());let source='';const tokens=Array(18).fill('We are calling the clinic.').join(' ').split(' ');
 for(const token of tokens){await vi.advanceTimersByTimeAsync(1000/3);source+=(source?' ':'')+token;engine.partial('en',source);}
 expect(engine.hasActiveSource).toBe(true);expect(states.some(s=>s.pressure==='behind')).toBe(true);expect(states.every(s=>s.state!=='PRECISION MODE'&&!s.precision)).toBe(true);expect(io.pauseInput).not.toHaveBeenCalled();expect(io.failed).not.toHaveBeenCalled();expect(sent.length).toBeGreaterThan(8);
 // Natural recognition finalization after the continuous source, not a forced Finish action.
 engine.finalized('en',source);await vi.advanceTimersByTimeAsync(15000);expect(engine.idle).toBe(true);expect(engine.snapshot.lanes.en.spokenWords).toBe(tokens.length);expect(sent.map(u=>u.source).join(' ')).toBe(source);expect(new Set(sent.map(u=>u.id)).size).toBe(sent.length);for(let n=1;n<sent.length;n++)expect(sent[n].start).toBe(sent[n-1].end);for(let n=1;n<scheduler.schedule.length;n++)expect(scheduler.schedule[n].start).toBeGreaterThanOrEqual(scheduler.schedule[n-1].end);expect(io.pauseInput).not.toHaveBeenCalled();expect(io.failed).not.toHaveBeenCalled();engine.end();expect(vi.getTimerCount()).toBe(0);
});
