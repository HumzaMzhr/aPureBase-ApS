import {StreamingInterpreter as Candidate,type InterpreterIO,type Output} from '../src/streaming/engine';
import {StreamingInterpreter as Baseline} from '../tests/fixtures/stage192-engine';
import {VirtualClock} from './stage192-simulation';
import {distribution} from './analyze-stage192-latency';
import {completeGreeting} from '../src/streaming/completeGreeting';
import {realtimeIsabellaSpeed} from '../src/config/realtimeDelivery';
import type {SemanticUnit} from '../src/streaming/types';
/** Text and virtual timing only. No microphone, provider, PCM or audio device. */
export async function simulateStage193(variant:'baseline'|'candidate',seconds=90,translationMs=1693.7){
 const clock=new VirtualClock(),speed=variant==='candidate'?realtimeIsabellaSpeed:1,count=Math.floor(seconds*1000/2500),sent:string[]=[],spoken:string[]=[],sourceEnds=new Map<string,number>();
 let active=0,maxActive=0,voiceConnections=0,owners=0,nextPlay=0,ttsRequests=0,totalAudioMs=0;const errors:string[]=[];
 const options={bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret faithfully.',scopedPrecision:true,simultaneous:true};
 const io:InterpreterIO={now:()=>clock.now,pauseInput:()=>{},failed:e=>errors.push(e.message),translate:input=>{
  active++;maxActive=Math.max(active,maxActive);return new Promise(resolve=>clock.after(input.text==='Hi, good morning'?1601.5:translationMs,()=>{active--;resolve({translation:input.text==='Hi, good morning'?'Hej, godmorgen':input.text==='My name is Humza.'?'Jeg hedder Humza.':input.text==='Thank you.'?'Tak.':'Vi ringer til klinikken nu.',confidence:1,needs_precision:false});}));
 },output:async()=>{
  voiceConnections++;owners++;if(owners!==1)throw new Error('Overlapping renderers.');let closed=false,generated=false,pending=0,buffered:SemanticUnit[]=[],held:SemanticUnit|undefined,holdTimer:number|undefined,done:(()=>void)|undefined;
  const complete=()=>{if(closed&&pending===0&&!held&&!buffered.length&&done){owners--;const resolve=done;done=undefined;resolve();}};
  const generate=()=>{const units=buffered;buffered=[];generated=true;
   for(const unit of units){pending++;clock.after(568.1,()=>{engine.playback(unit.id,'firstAudio',clock.now);const start=Math.max(nextPlay,clock.now+10),duration=(unit.source==='Hi, good morning'?640:unit.source==='Thank you.'?400:1582.4)/speed,end=start+duration;totalAudioMs+=duration;nextPlay=end;engine.playback(unit.id,'scheduled',start);clock.after(start-clock.now+40/speed,()=>engine.playback(unit.id,'started',clock.now));clock.after(end-clock.now,()=>{spoken.push(unit.id);engine.playback(unit.id,'finished',clock.now);pending--;complete();});});}
  };
  const submit=(unit:SemanticUnit)=>{held=undefined;ttsRequests++;buffered.push(unit);if(generated||/[.!?]$/.test(unit.target!)||variant==='candidate'&&completeGreeting(unit.target!))generate();};
  const output:Output={send:unit=>{
   if(closed)throw new Error('Send after EOS.');sent.push(unit.id);sourceEnds.set(unit.id,(sent.length)*2500);
   if(held){clock.cancel(holdTimer!);submit(held);}
   if(unit.target!.length<=32&&unit.target!.split(/\s+/).length<=4&&/[,.!?]$/.test(unit.target!)){held=unit;holdTimer=clock.after(250,()=>submit(unit));}else submit(unit);
  },finish:()=>new Promise<void>(resolve=>{closed=true;done=resolve;if(held){clock.cancel(holdTimer!);submit(held);}if(buffered.length)generate();complete();}),cancel:()=>{closed=true;}};return output;
 }};
 const engine=variant==='candidate'?new Candidate(io,()=>{},options):new Baseline(io,()=>{},options);engine.start();
 for(let n=0;n<count;n++){
  const text=n===0?'Hi, good morning':n===1?'My name is Humza.':n===count-1?'Thank you.':'We are calling the clinic now.';
  const available=n===0?3333.3:(n+1)*2500+650,final=available+(n===0?789.8:479.4),previousFinal=n===0?0:n===1?3333.3+789.8:n*2500+650+479.4;
  clock.after(Math.max(n*2500,previousFinal+(n?1:0)),()=>engine.sourceStarted('en',n*2500));clock.after(available,()=>engine.partial('en',text));clock.after(available+180,()=>engine.partial('en',text+' '));clock.after(final,()=>engine.finalized('en',text));
 }
 try{await clock.drain();const lane=engine.snapshot.lanes.en,units=lane.units;
  if(errors.length||!engine.idle||units.length!==count||units.some(u=>u.status!=='spoken')||sent.join('|')!==spoken.join('|')||new Set(sent).size!==count||lane.receivedWords!==lane.spokenWords)throw new Error('Simulated delivery invariant failed.');
  const delays=units.map(u=>u.timing.playback_finished!-sourceEnds.get(u.id)!),window=Math.min(10,Math.floor(count/3));
  return{variant,seconds,speed,firstTranslatedAudioMs:units[0].timing.playback_started!,trailingDelay:distribution(delays),sustainedWindows:{early:distribution(delays.slice(3,3+window)),late:distribution(delays.slice(-window-1,-1))},finalTailMs:units.at(-1)!.timing.playback_finished!-seconds*1000,voiceConnections,translationRequests:units.length,TTSRequests:ttsRequests,deliveredSemanticUnits:units.length,committedWords:lane.committedWords,spokenWords:lane.spokenWords,totalSimulatedAudioMs:totalAudioMs,maxConcurrentTranslations:maxActive,pending:{translation:active,TTS:owners,playback:units.filter(u=>u.status!=='spoken').length,timers:clock.pending}};
 }finally{engine.end();}
}
export const stage193Assumptions={scope:'Deterministic simulation, not physical/acoustic latency. Actual baseline/candidate engines with virtual providers.',source:'45 or 90 seconds at one unit per 2.5 seconds. First greeting deliberately has no punctuation, as in the physical trace. Later ordinary sentences, known-name introduction and final Thank you are included.',ASR:'First observation at 3333.3ms, others 650ms after synthetic source end. Distinct unchanged update 180ms later is a synthetic stability witness, not a measured provider cadence. Final delay is 789.8ms first / 479.4ms later.',translation:'Identical services: 1601.5ms first, 1693.7ms otherwise (3500ms stress). Maximum two slots.',TTS:'First initial incomplete threshold waits for the next complete sentence in baseline; candidate allows finite complete greeting flush. Identical 568.1ms generation service. Existing 250ms short-fragment holding and final flush modeled. Voice preconnection overlaps translation and has no added setup cost in either simulation. Speed changes duration only: 0.95 vs 1.0.',playback:'FIFO, 10ms resume and 40ms assumed provider-leading silence. 640ms greeting, 400ms final Tak, otherwise 1582.4ms divided by speed. No gain-related timing change. Network variability and human pace/quality require a physical test.'};
