import {StreamingInterpreter as After,type InterpreterIO,type Output} from '../src/streaming/engine';
import {StreamingInterpreter as Before} from '../tests/fixtures/stage191-engine';
import {distribution} from './analyze-stage192-latency';
/** Offline virtual providers only. No fetch, microphone, socket or sound output. */
export class VirtualClock {
 now=0;private id=0;private tasks=new Map<number,{at:number;run:()=>void}>();
 after(ms:number,run:()=>void){const id=++this.id;this.tasks.set(id,{at:this.now+ms,run});return id;}
 cancel(id:number){this.tasks.delete(id);}
 async settle(){for(let n=0;n<100;n++)await Promise.resolve();}
 async until(target:number){
  for(;;){await this.settle();const next=[...this.tasks].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next)break;this.tasks.delete(next[0]);this.now=next[1].at;next[1].run();}
  this.now=target;await this.settle();
 }
 async drain(limit=600000){for(let n=0;n<10000;n++){await this.settle();const next=Math.min(...[...this.tasks.values()].map(t=>t.at));if(!Number.isFinite(next))return;if(next>limit)throw new Error('Virtual drain exceeded its bound.');await this.until(next);}throw new Error('Virtual task bound exceeded.');}
 get pending(){return this.tasks.size;}
}
const options={bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret the source faithfully.',scopedPrecision:true,simultaneous:true};
export async function simulateStage192(variant:'before'|'after',seconds=90,providerMs=1841.3){
 const clock=new VirtualClock(),requests:{source:string;start:number;end?:number}[]=[],sent:string[]=[],spoken:string[]=[],failures:string[]=[],stages:{unitId:string;event:string;at:number}[]=[];
 let active=0,maxActive=0,owners=0,maxOwners=0,connections=0,nextPlayback=0,finishedContexts=0;
 const source='We are calling the clinic now.',target='Vi ringer til klinikken nu.',cadence=2500,count=Math.floor(seconds*1000/cadence),sourceEnds=new Map<string,number>();
 const io:InterpreterIO={now:()=>clock.now,stage:(unitId,event,at)=>stages.push({unitId,event,at}),pauseInput:()=>{},failed:e=>failures.push(e.message),translate:(input,signal)=>{
  const index=requests.length,request={source:input.text,start:clock.now,end:undefined as number|undefined};requests.push(request);active++;maxActive=Math.max(active,maxActive);
  return new Promise((resolve,reject)=>{const aborted=()=>{clock.cancel(timer);active--;reject(new DOMException('STOP','AbortError'));};const timer=clock.after(index===0?2773:providerMs,()=>{signal.removeEventListener('abort',aborted);active--;request.end=clock.now;resolve({translation:target,confidence:1,needs_precision:false});});signal.addEventListener('abort',aborted,{once:true});});
 },output:(_language,_turn,signal)=>{
  connections++;owners++;maxOwners=Math.max(owners,maxOwners);if(owners>1)throw new Error('Two audible renderer owners.');
  return new Promise<Output>((resolve,reject)=>{
   const aborted=()=>{clock.cancel(setup);owners--;reject(new DOMException('STOP','AbortError'));};const setup=clock.after(501.8,()=>{
    signal.removeEventListener('abort',aborted);let closed=false,completed=false,lastEnd=clock.now;const timers=new Set<number>(),finishers:(()=>void)[]=[];let pendingPCM=0;
    const later=(ms:number,run:()=>void)=>{const timer=clock.after(ms,()=>{timers.delete(timer);run();});timers.add(timer);return timer;};
    const complete=()=>{if(closed&&!completed&&pendingPCM===0&&clock.now>=lastEnd){completed=true;owners--;finishedContexts++;for(const finish of finishers.splice(0))finish();}};
    resolve({send:unit=>{
     if(closed)throw new Error('Text sent after EOS.');sent.push(unit.id);sourceEnds.set(unit.id,(sent.length)*cadence);pendingPCM++;
     later(sent.length===1?766.3:530.5,()=>{pendingPCM--;engine.playback(unit.id,'firstAudio',clock.now);const start=nextPlayback>clock.now?nextPlayback:clock.now+10;const end=start+1582.4;nextPlayback=end;lastEnd=end;engine.playback(unit.id,'scheduled',start);later(start-clock.now,()=>engine.playback(unit.id,'started',clock.now));later(end-clock.now,()=>{spoken.push(unit.id);engine.playback(unit.id,'finished',clock.now);complete();});});
    },finish:()=>new Promise<void>(done=>{closed=true;finishers.push(done);complete();}),cancel:()=>{for(const timer of timers)clock.cancel(timer);timers.clear();if(!completed){completed=true;owners--;}for(const finish of finishers.splice(0))finish();}});
   });signal.addEventListener('abort',aborted,{once:true});
  });
 }};
 const engine=variant==='before'?new Before(io,()=>{},options):new After(io,()=>{},options);engine.start();
 for(let n=0;n<count;n++){
  const sourceStart=n*cadence,available=n===0?3532.9:(n+1)*cadence+650,commit=available+(n===0?835.7:634.3),previousCommit=n===0?0:(n===1?3532.9+835.7:n*cadence+650+634.3);
  clock.after(Math.max(sourceStart,previousCommit+(n?1:0)),()=>engine.sourceStarted('en',sourceStart));
  clock.after(available,()=>engine.partial('en',source));
  // A synthetic distinct provider update repeats the stable closed sentence.
  // This stability witness is an explicit assumption, not measured provider cadence.
  clock.after(available+180,()=>engine.partial('en',source+' '));clock.after(commit,()=>engine.finalized('en',source));
 }
 try{
  await clock.drain();const lane=engine.snapshot.lanes.en,units=lane.units;
  const end=seconds*1000,tail=units.at(-1)?.timing.playback_finished,first=units[0]?.timing.playback_started;
  const delays=units.map(u=>u.timing.playback_finished===undefined?null:u.timing.playback_finished-(sourceEnds.get(u.id)??0));
  if(failures.length||!engine.idle||units.length!==count||units.some(u=>u.status!=='spoken')||new Set(sent).size!==count||sent.join('|')!==spoken.join('|')||lane.receivedWords!==lane.spokenWords)throw new Error('Virtual delivery invariant failed: '+JSON.stringify({failures,idle:engine.idle,units:units.length,sent:sent.length,spoken:spoken.length}));
  return{variant,sourceSeconds:seconds,units:units.length,committedWords:lane.committedWords,translatedWords:lane.translatedWords,spokenWords:lane.spokenWords,translationRequests:requests.length,maxConcurrentTranslations:maxActive,maxAudibleOwners:maxOwners,voiceConnections:connections,finishedContexts,timeToFirstTranslatedAudioMs:first,trailingDelay:distribution(delays),finalTailMs:tail===undefined?null:tail-end,pending:{translation:active,TTS:owners,playback:units.filter(u=>u.status!=='spoken').length,timers:clock.pending},requests,unitTimings:units.map(u=>({unitId:u.id,start:u.start,end:u.end,...u.timing})),stages};
 }finally{engine.end();}
}
export const simulationAssumptions={scope:'Deterministic virtual ASR/text/TTS/rendering. No audio generated; not live/acoustic performance.',source:'Repeated ordinary sentence; 36 units / 90s, or 18 units / 45s. Unit source end is known in this synthetic fixture.',asr:'650ms simulated availability after unit end; first unit uses the observed 3532.9ms capture-to-ASR interval. A distinct stable repeated ASR update is injected 180ms later. Finalization occurs another 634.3ms after availability (835.7ms for first unit).',translation:'1841.3ms request service, except 2773ms for first request; optional 3500ms stress variant. Network and final fidelity validation are represented together.',voice:'501.8ms connection setup, 530.5ms text-to-first-PCM (766.3ms first), 1582.4ms target duration per unit. Five-word target avoids the existing short-fragment buffer. All parameters and text are identical before/after.',playback:'Single FIFO owner; existing 10ms resumption schedule rule modeled. Jitter/prosody settings and real provenance enforcement are not replaced by this simulation; integration tests cover those separately.',quantiles:'Median interpolates the middle two samples; p95 uses nearest rank. Trailing delay is final unit playback minus that synthetic unit source end.'};
