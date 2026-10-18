import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {StreamingInterpreter,type InterpreterIO,type Output} from '../src/streaming/engine';
import type {UnitResult} from '../server/incrementalTranslation';
import type {StreamingSnapshot} from '../src/streaming/types';

const source='We are calling the clinic.',target='Vi ringer til klinikken.';
const options={bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret faithfully.',scopedPrecision:true,simultaneous:true};
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
function setup(translationMs:(index:number)=>number,voiceMs=500,finalizationMs=0){
 let active=0,maxActive=0,playEnd=0,request=0;
 const sent:string[]=[],spoken:string[]=[],requests:{text:string;at:number}[]=[],pressure:NonNullable<StreamingSnapshot['backpressure']>['en'][]=[];
 const outputs:Output[]=[],timers=new Set<ReturnType<typeof setTimeout>>();
 const later=(ms:number,action:()=>void)=>{const timer=setTimeout(()=>{timers.delete(timer);action();},ms);timers.add(timer);return timer;};
 const io:InterpreterIO={now:()=>performance.now(),translate:vi.fn((input,signal)=>{
  const index=request++;requests.push({text:input.text,at:performance.now()});active++;maxActive=Math.max(maxActive,active);
  return new Promise<UnitResult>((resolve,reject)=>{const aborted=()=>{clearTimeout(timer);timers.delete(timer);active--;reject(new DOMException('STOP','AbortError'));};const timer=later(translationMs(index),()=>{signal.removeEventListener('abort',aborted);active--;resolve({translation:target,confidence:.99,needs_precision:false});});signal.addEventListener('abort',aborted,{once:true});});
 }),output:vi.fn(async()=>{
  const ownTimers=new Set<ReturnType<typeof setTimeout>>();let finishResolve:(()=>void)|undefined;
  const ownLater=(ms:number,action:()=>void)=>{const timer=later(ms,()=>{ownTimers.delete(timer);action();});ownTimers.add(timer);};
  const output:Output={send:unit=>{
   sent.push(unit.id);const start=Math.max(performance.now(),playEnd);playEnd=start+voiceMs;
   engine.playback(unit.id,'firstAudio',performance.now());engine.playback(unit.id,'scheduled',performance.now());
   ownLater(start-performance.now(),()=>engine.playback(unit.id,'started',performance.now()));
   ownLater(playEnd-performance.now(),()=>{spoken.push(unit.id);engine.playback(unit.id,'finished',performance.now());});
  },finish:vi.fn(()=>new Promise<void>(resolve=>{finishResolve=resolve;ownLater(Math.max(0,playEnd-performance.now())+finalizationMs,()=>{finishResolve=undefined;resolve();});})),cancel:vi.fn(()=>{for(const timer of ownTimers){clearTimeout(timer);timers.delete(timer);}ownTimers.clear();finishResolve?.();finishResolve=undefined;})};
  outputs.push(output);return output;
 }),pauseInput:vi.fn(),failed:vi.fn()};
 const engine=new StreamingInterpreter(io,s=>{if(s.backpressure?.en)pressure.push({...s.backpressure.en});},options);engine.start();
 const commit=(text=source)=>{engine.sourceStarted('en',performance.now());engine.finalized('en',text);};
 const stop=()=>{engine.end();for(const timer of timers)clearTimeout(timer);timers.clear();};
 const assertDrained=()=>{const lane=engine.snapshot.lanes.en,ids=lane.units.map(u=>u.id);expect(engine.idle).toBe(true);expect(io.failed).not.toHaveBeenCalled();expect(sent).toEqual(ids);expect(spoken).toEqual(ids);expect(new Set(sent).size).toBe(ids.length);expect(lane.units.every(u=>u.status==='spoken')).toBe(true);expect(lane.translatedWords).toBe(lane.committedWords);expect(lane.spokenWords).toBe(lane.committedWords);expect(lane.target).toBe(Array(ids.length).fill(target).join(' '));};
 return{engine,io,commit,requests,sent,spoken,outputs,pressure,assertDrained,stop,get maxActive(){return maxActive;}};
}
it('refills available translation slots behind a 24-second head request while retaining ordered results and speech',async()=>{
 const s=setup(index=>index===0?24010:1000);
 try{
  for(let n=0;n<10;n++)s.commit();await vi.advanceTimersByTimeAsync(12000);
  expect(s.requests).toHaveLength(10);expect(s.maxActive).toBe(2);expect(s.sent).toEqual([]);
  const units=s.engine.snapshot.lanes.en.units;expect(units[0].timing.translation_ready).toBeUndefined();expect(units.slice(1).every(u=>u.timing.translation_ready!==undefined)).toBe(true);expect(units.every(u=>u.target===undefined)).toBe(true);
  expect(s.pressure.at(-1)).toMatchObject({translationActiveRequests:1,translationReadyUnits:9});
  await vi.advanceTimersByTimeAsync(20000);s.assertDrained();expect(units[0].timing.translation_ready!-units[0].timing.translation_started!).toBe(24010);
 }finally{s.stop();}expect(vi.getTimerCount()).toBe(0);
});
it('keeps translating committed source while earlier voice generation/playback/finalization is pending',async()=>{
 const s=setup(()=>500,5000,10000);
 try{
  for(let n=0;n<6;n++){s.commit();await vi.advanceTimersByTimeAsync(2000);}
  expect(s.requests).toHaveLength(6);expect(s.engine.snapshot.lanes.en.translatedWords).toBe(30);
  expect(s.outputs).toHaveLength(1);expect(s.sent).toHaveLength(1);expect(s.outputs[0].finish).toHaveBeenCalledOnce();
  expect(s.pressure.some(p=>p?.audioQueueJobs&&p.audioQueueJobs>2)).toBe(true);
  await vi.advanceTimersByTimeAsync(100000);s.assertDrained();expect(s.outputs).toHaveLength(2);
  expect(s.engine.snapshot.lanes.en.units[1].timing.translation_ready).toBeLessThan(s.engine.snapshot.lanes.en.units[0].timing.playback_finished!);
 }finally{s.stop();}expect(vi.getTimerCount()).toBe(0);
});
it('sustains 45 seconds of continuous source with bounded translation backlog and drains every semantic unit in order',async()=>{
 // 3.5-second requests / 2.5-second source units require both bounded slots.
 const s=setup(()=>3500,1000);const backlog:number[]=[];let text='';
 try{
  s.engine.sourceStarted('en',performance.now());
  for(let n=0;n<18;n++){
   text+=(text?' ':'')+source;s.engine.partial('en',text);await vi.advanceTimersByTimeAsync(200);s.engine.partial('en',text+' More');await vi.advanceTimersByTimeAsync(2300);
   const lane=s.engine.snapshot.lanes.en;backlog.push(lane.committedWords-lane.translatedWords);
  }
  expect(s.engine.hasActiveSource).toBe(true);expect(s.requests).toHaveLength(18);expect(Math.max(...backlog)).toBeLessThanOrEqual(10);expect(backlog.at(-1)).toBeLessThanOrEqual(10);expect(s.maxActive).toBe(2);expect(s.io.pauseInput).not.toHaveBeenCalled();
  s.engine.finalized('en',text);await vi.advanceTimersByTimeAsync(10000);s.assertDrained();expect(s.engine.snapshot.lanes.en.units).toHaveLength(18);
  const units=s.engine.snapshot.lanes.en.units;for(let n=1;n<units.length;n++){expect(units[n].start).toBe(units[n-1].end);expect(units[n].timing.playback_started).toBeGreaterThanOrEqual(units[n-1].timing.playback_finished!);}
  expect(s.pressure.some(p=>p?.translationActiveRequests===2)).toBe(true);
 }finally{s.stop();}expect(vi.getTimerCount()).toBe(0);
});
it('supplies preceding committed source context to ahead requests without including future source as history',async()=>{
 const s=setup(()=>1000);
 try{
  s.commit('We are calling the clinic.');s.commit('We can explain the service.');s.commit('We can call later.');await vi.advanceTimersByTimeAsync(3000);
  const inputs=vi.mocked(s.io.translate).mock.calls.map(([input])=>input);
  expect(inputs[0].sourceHistory).toBe('');expect(inputs[1].sourceHistory).toBe('We are calling the clinic.');expect(inputs[1].targetHistory).toBe('');expect(inputs[2].sourceHistory).toBe('We are calling the clinic. We can explain the service.');
  expect(inputs[1].sourceHistory).not.toContain('later');s.assertDrained();
 }finally{s.stop();}
});
it('STOP aborts in-flight translations and pending voice work without sending late or duplicate audio',async()=>{
 const s=setup(index=>index<2?100:5000,5000,10000);
 for(let n=0;n<8;n++)s.commit();await vi.advanceTimersByTimeAsync(1000);expect(s.sent).toHaveLength(2);expect(s.maxActive).toBe(2);const sent=[...s.sent];
 s.engine.end();await vi.advanceTimersByTimeAsync(30000);
 expect(s.sent).toEqual(sent);expect(s.engine.idle).toBe(true);expect(s.outputs[0].cancel).toHaveBeenCalledOnce();expect(s.io.failed).not.toHaveBeenCalled();expect(s.engine.snapshot.lanes.en.units.every(u=>u.status==='interrupted')).toBe(true);expect(vi.getTimerCount()).toBe(0);
});
it('keeps consequential precision retry inside the same bounded dispatcher and blocks all following audio',async()=>{
 const s=setup(()=>0);let active=0,maxActive=0;const releases:{text:string;resolve:(result:UnitResult)=>void}[]=[];
 vi.mocked(s.io.translate).mockImplementation(input=>{active++;maxActive=Math.max(active,maxActive);return new Promise<UnitResult>(resolve=>releases.push({text:input.text,resolve:result=>{active--;resolve(result);}}));});
 const uncertain:UnitResult={translation:'Jeg giver tilladelse.',confidence:.4,needs_precision:true,meaning_status:'recoverable',consequential_uncertainty:true};
 try{
  s.commit('I give permission.');for(let n=0;n<4;n++)s.commit();expect(releases).toHaveLength(2);
  releases.shift()!.resolve(uncertain);await vi.advanceTimersByTimeAsync(1);
  while(releases.length){const next=releases.shift()!;next.resolve(next.text==='I give permission.'?uncertain:{translation:target,confidence:.99,needs_precision:false});await vi.advanceTimersByTimeAsync(1);}
  expect(maxActive).toBeLessThanOrEqual(2);expect(s.sent).toEqual([]);expect(s.io.failed).toHaveBeenCalledOnce();expect(s.engine.idle).toBe(true);
 }finally{s.stop();}
});
it('reports precision review once even when draining earlier validated speech fails',async()=>{
 const s=setup(()=>0);vi.mocked(s.io.translate).mockImplementation(async input=>input.text==='I give permission.'?{translation:'Jeg giver tilladelse.',confidence:.4,needs_precision:true,meaning_status:'recoverable',consequential_uncertainty:true}:{translation:target,confidence:.99,needs_precision:false});
 vi.mocked(s.io.output).mockImplementation(async()=>({send:()=>{},finish:async()=>{throw new Error('Voice drain failed.');},cancel:vi.fn()}));
 try{s.engine.sourceStarted('en',performance.now());s.engine.finalized('en',source+' I give permission.');await vi.advanceTimersByTimeAsync(100);expect(s.io.failed).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({message:expect.stringContaining('human review')}));expect(s.engine.idle).toBe(true);}finally{s.stop();}
});
it('STOP removes a precision retry waiting for a dispatch slot',async()=>{
 const s=setup(()=>0);const releases:((value:UnitResult)=>void)[]=[];
 vi.mocked(s.io.translate).mockImplementation(()=>new Promise<UnitResult>(resolve=>releases.push(resolve)));
 s.commit('I give permission.');for(let n=0;n<4;n++)s.commit();
 releases.shift()!({translation:'Jeg giver tilladelse.',confidence:.4,needs_precision:true,meaning_status:'recoverable',consequential_uncertainty:true});await vi.advanceTimersByTimeAsync(1);
 const requests=vi.mocked(s.io.translate).mock.calls.length;expect(requests).toBe(3);s.engine.end();
 for(const release of releases)release({translation:target,confidence:.99,needs_precision:false});await vi.advanceTimersByTimeAsync(1);
 expect(s.io.translate).toHaveBeenCalledTimes(requests);expect(s.sent).toEqual([]);expect(s.engine.idle).toBe(true);expect(s.io.failed).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('cancels an unused preconnected voice context when the first unit requires review, without finalizing empty TTS',async()=>{
 const s=setup(()=>0),finish=vi.fn(async()=>{}),cancel=vi.fn();
 vi.mocked(s.io.output).mockResolvedValue({send:vi.fn(),finish,cancel});vi.mocked(s.io.translate).mockResolvedValue({translation:'Jeg giver tilladelse.',confidence:.4,needs_precision:true,meaning_status:'recoverable',consequential_uncertainty:true});
 try{s.commit('I give permission.');await vi.advanceTimersByTimeAsync(100);expect(finish).not.toHaveBeenCalled();expect(cancel).toHaveBeenCalledOnce();expect(s.io.failed).toHaveBeenCalledOnce();expect(s.engine.idle).toBe(true);}finally{s.stop();}
});
it('keeps a retained voice over genuine idle ASR item boundaries, closes its idle lease, and opens the next request only for later source',async()=>{
 const s=setup(()=>0);const send=vi.fn(),finish=vi.fn(async()=>{}),cancel=vi.fn();vi.mocked(s.io.output).mockImplementation(async()=>({retainBetweenItems:true,send,finish,cancel}));
 try{s.commit();await vi.advanceTimersByTimeAsync(2000);expect(send).toHaveBeenCalledOnce();expect(finish).not.toHaveBeenCalled();expect(s.engine.idle).toBe(true);s.commit();await vi.advanceTimersByTimeAsync(2000);expect(s.io.output).toHaveBeenCalledOnce();expect(send).toHaveBeenCalledTimes(2);await vi.advanceTimersByTimeAsync(146010);expect(finish).toHaveBeenCalledOnce();expect(s.io.output).toHaveBeenCalledOnce();s.commit();await vi.advanceTimersByTimeAsync(10);expect(s.io.output).toHaveBeenCalledTimes(2);}finally{s.stop();}expect(vi.getTimerCount()).toBe(0);
});
it('finalizes retained validated audio before a consequential precision review and sends no uncertain following text',async()=>{
 const s=setup(()=>0),send=vi.fn(),finish=vi.fn(async()=>{});vi.mocked(s.io.output).mockResolvedValue({retainBetweenItems:true,send,finish,cancel:vi.fn()});vi.mocked(s.io.translate).mockImplementation(async input=>input.text==='I give permission.'?{translation:'Jeg giver tilladelse.',confidence:.4,needs_precision:true,meaning_status:'recoverable',consequential_uncertainty:true}:{translation:target,confidence:1,needs_precision:false});
 try{s.commit();await vi.advanceTimersByTimeAsync(100);s.commit('I give permission.');await vi.advanceTimersByTimeAsync(100);expect(send).toHaveBeenCalledOnce();expect(finish).toHaveBeenCalledOnce();expect(s.io.failed).toHaveBeenCalledOnce();expect(s.engine.idle).toBe(true);}finally{s.stop();}expect(vi.getTimerCount()).toBe(0);
});
