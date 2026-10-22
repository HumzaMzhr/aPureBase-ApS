import {readFileSync} from 'node:fs';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {StreamingInterpreter,type InterpreterIO} from '../src/streaming/engine';
import type {UnitResult} from '../server/incrementalTranslation';
import {deliveryGain} from '../src/streaming/deliveryGain';
import {realtimeIsabellaGain,realtimeIsabellaSpeed} from '../src/config/realtimeDelivery';
import {SessionDiagnostics,lastSessionDiagnostics,diagnosticLimits} from '../src/streaming/sessionDiagnostics';
const physical=JSON.parse(readFileSync(new URL('./fixtures/stage193-physical-metadata.json',import.meta.url),'utf8')) as {units:{unitId:string;timing:Record<string,number>}[];blocks:{samples:number;peak:number;rms:number;start:number;end:number}[];gaps:{duration:number}[];firstAudio:number;tail:number};
beforeEach(()=>vi.useFakeTimers());afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('retains both physical audible failures separately from PCM underruns and final tail',()=>{
 expect(physical.gaps.filter(g=>g.duration>4500).map(g=>g.duration)).toEqual([expect.closeTo(5108.666667,3),30558]);
 const u=physical.units.find(u=>u.unitId==='en-19-0-4')!,later=physical.units.find(u=>u.unitId==='en-20-0-4')!;
 expect(u.timing.translation_ready-u.timing.translation_started).toBeCloseTo(32880.7);
 expect(later.timing.translation_consumed-later.timing.translation_ready).toBeCloseTo(28353.1);
 // These remain FAILED physical acceptance; gain-only changes cannot improve timing.
 expect(physical.firstAudio).toBeGreaterThan(5000);expect(physical.tail).toBeGreaterThan(5000);
});
it('derives fixed calibration from actual sample-weighted RMS with headroom across every retained block',()=>{
 const samples=physical.blocks.reduce((n,b)=>n+b.samples,0),inputRms=Math.sqrt(physical.blocks.reduce((n,b)=>n+b.rms*b.rms*b.samples,0)/samples);
 expect(inputRms).toBeCloseTo(.0224885834,9);expect(realtimeIsabellaGain*inputRms).toBeCloseTo(.08,8);
 const outputPeak=Math.max(...physical.blocks.map(b=>b.peak*realtimeIsabellaGain));expect(outputPeak).toBeCloseTo(.8269169771,8);expect(outputPeak).toBeLessThan(.98);
 expect(realtimeIsabellaGain/1.5).toBeGreaterThan(2.3);expect(realtimeIsabellaSpeed).toBe(.95);
});
it.each([0,.00001,.02,.232452392578125,.8,1])('measures requested/effective gain and protects PCM with input peak %s',peak=>{
 const input=new Float32Array([peak,-peak,peak/2,-peak/2]),original=input.slice(),r=deliveryGain(input,true);
 expect(r.requestedGain).toBe(realtimeIsabellaGain);expect(r.effectiveGain).toBe(r.gainApplied);expect(r.postGainPeak).toBeLessThan(1);expect(r.clippingEvents).toBe(0);
 expect(r.postGainRms).toBeCloseTo(r.preGainRms*r.effectiveGain,6);expect(r.postGainPeak).toBeCloseTo(r.preGainPeak*r.effectiveGain,6);
 if(peak){expect(input[2]/input[0]).toBeCloseTo(.5);expect(input[1]/input[0]).toBeCloseTo(-1);}else expect(input).toEqual(original);
 if(peak>.5)expect(r.peakProtectionEvents).toBe(1);
});
it('keeps silence silent and leaves other delivery modes at unity',()=>{
 expect(deliveryGain(new Float32Array(480),true).postGainRms).toBe(0);
 const input=new Float32Array([.2,-.3]);const original=input.slice();expect(deliveryGain(input,false).effectiveGain).toBe(1);expect(input).toEqual(original);
});
function interpreter(contextReady:()=>boolean){
 let active=0,maxActive=0;const sent:string[]=[],spoken:string[]=[],stages:{unit:string;event:string;at:number;data?:Record<string,unknown>}[]=[];
 const io:InterpreterIO={now:()=>performance.now(),translate:vi.fn(async(input,signal):Promise<UnitResult>=>{
  active++;maxActive=Math.max(active,maxActive);
  try{await new Promise<void>((resolve,reject)=>{const aborted=()=>{clearTimeout(timer);reject(new DOMException('STOP','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',aborted);resolve();},1000);signal.addEventListener('abort',aborted,{once:true});});
   return input.text==='Two dear professional work.'&&!contextReady()?{translation:'',confidence:0,needs_precision:true,meaning_status:'needs_context',consequential_uncertainty:false}:{translation:input.text==='Thank you.'?'Tak.':'Faglig information.',confidence:1,needs_precision:false,meaning_status:'recoverable',consequential_uncertainty:false};
  }finally{active--;}
 }),output:async()=>({send:u=>{sent.push(u.id);engine.playback(u.id,'firstAudio',performance.now());engine.playback(u.id,'started',performance.now());engine.playback(u.id,'finished',performance.now());spoken.push(u.id);},finish:async()=>{},cancel:vi.fn()}),pauseInput:vi.fn(),failed:vi.fn(),stage:(unit,event,at,data)=>stages.push({unit,event,at,data})};
 const engine=new StreamingInterpreter(io,()=>{},{bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret faithfully.',scopedPrecision:true,simultaneous:true});engine.start();
 const commit=(text:string)=>{engine.sourceStarted('en',performance.now());engine.finalized('en',text);};
 return{engine,io,sent,spoken,stages,commit,get maxActive(){return maxActive;}};
}
it('reproduces the context-held head, dispatches later translations, and drains exactly once in order after validated context',async()=>{
 let ready=false;const s=interpreter(()=>ready);
 try{
  s.commit('Two dear professional work.');await vi.advanceTimersByTimeAsync(1500);expect(s.engine.snapshot.lanes.en.units[0].status).toBe('held');
  for(let n=0;n<12;n++){s.commit('We provide professional information.');await vi.advanceTimersByTimeAsync(2500);}
  const lane=s.engine.snapshot.lanes.en;expect(s.sent).toEqual([]);expect(lane.units.slice(1).every(u=>u.timing.translation_ready!==undefined)).toBe(true);expect(s.maxActive).toBeLessThanOrEqual(2);
  expect(s.stages.some(e=>e.event==='translation.context_wait_started')).toBe(true);expect(s.stages.some(e=>e.event==='translation.retry_started')).toBe(true);
  ready=true;s.commit('Thank you.');await vi.advanceTimersByTimeAsync(4000);
  expect(s.sent).toEqual(lane.units.map(u=>u.id));expect(s.spoken).toEqual(s.sent);expect(new Set(s.sent).size).toBe(lane.units.length);expect(lane.units.at(-1)?.target).toBe('Tak.');expect(lane.spokenWords).toBe(lane.committedWords);expect(s.engine.idle).toBe(true);expect(s.io.failed).not.toHaveBeenCalled();
 }finally{s.engine.end();}expect(vi.getTimerCount()).toBe(0);
});
it('STOP clears a context hold and in-flight bounded requests without later audio',async()=>{
 const s=interpreter(()=>false);s.commit('Two dear professional work.');await vi.advanceTimersByTimeAsync(1500);s.commit('We provide professional information.');s.engine.end();await vi.advanceTimersByTimeAsync(4000);expect(s.sent).toEqual([]);expect(s.engine.idle).toBe(true);expect(vi.getTimerCount()).toBe(0);
});
it('reproduces the separate unit-17 wait for an unclosed source phrase without dispatching speculative text',async()=>{
 const s=interpreter(()=>true),phrase='We work with different types of healthcare communication';
 try{
  s.engine.sourceStarted('en',performance.now());s.engine.partial('en',phrase);await vi.advanceTimersByTimeAsync(400);s.engine.partial('en',phrase+' ');await vi.advanceTimersByTimeAsync(3600);
  expect(s.io.translate).not.toHaveBeenCalled();expect(s.sent).toEqual([]);
  s.engine.finalized('en',phrase);await vi.advanceTimersByTimeAsync(1500);
  expect(s.sent).toHaveLength(1);expect(s.engine.snapshot.lanes.en.units[0].status).toBe('spoken');expect(s.engine.idle).toBe(true);
 }finally{s.engine.end();}expect(vi.getTimerCount()).toBe(0);
});
it('persists calibrated input/output levels and a bounded context/retry trace after ordinary event eviction',()=>{
 const map=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v)});
 const d=new SessionDiagnostics('en','realtime'),q=deliveryGain(new Float32Array([.05,-.1]),true);
 d.record('PCM_GAIN_APPLIED',{...q,provenanceVerified:true});
 for(let n=0;n<600;n++)d.record('translation.context_wait_started',{unitId:'en-19-0-4',classification:'needs_context',text:'PRIVATE',pcm:new Uint8Array([1,2])});
 for(let n=0;n<3000;n++)d.record('playback.unit_scheduled',{unitId:'en-1-0-1'});
 d.finish('completed','STOP');const r=lastSessionDiagnostics()!;
 expect(r.voiceQuality).toMatchObject({requestedGain:q.requestedGain,effectiveGain:q.effectiveGain,preGainRms:q.preGainRms,postGainRms:q.postGainRms,clippingEvents:0});expect(r.translationLifecycle).toHaveLength(diagnosticLimits.translationLifecycle);expect(r.translationLifecycle?.every(e=>e.data.unitId==='en-19-0-4')).toBe(true);expect(JSON.stringify(r)).not.toContain('PRIVATE');expect(new TextEncoder().encode(JSON.stringify(r)).length).toBeLessThanOrEqual(diagnosticLimits.bytes);
});
