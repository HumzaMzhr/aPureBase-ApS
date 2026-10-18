// Frozen pre-Stage-1.9.2 implementation for the offline before/after benchmark.
import {uncertaintyRoute} from '../../src/streaming/uncertainty';
import {nextStreamIdentity} from '../../src/streaming/identity';
import {campaignSpeechText,exactIdentityRequired} from '../../src/config/campaignSpeech';
import type {Language} from '../../src/types';
import type {UnitResult,UnitRequest} from '../../server/incrementalTranslation';
import {SemanticCommitter,words,uncertainProtectedTerm,precisionTrigger} from './stage191-semantic';
import {emptyLane,type SemanticUnit,type StreamingSnapshot} from '../../src/streaming/types';
export interface Output {send(unit:SemanticUnit):void;finish():Promise<void>;cancel():void;queuedMs?:number}
export interface InterpreterIO {now():number;translate(input:UnitRequest,signal:AbortSignal,partial:(text:string)=>void):Promise<UnitResult>;output(language:Language,turn:number,signal:AbortSignal):Promise<Output>;pauseInput(language:Language):void;failed?(error:Error):void}
interface Turn {id:number;start:number;committer:SemanticCommitter;wordAt:number[];units:SemanticUnit[];done:Promise<string>;resolve:(text:string)=>void;final?:string;held?:number;revision?:boolean;cancelled?:boolean;base:number}
interface Job {turn:Turn;unit?:SemanticUnit}
class PrecisionReviewRequired extends Error {}
const semanticUnitCapacity=200,workQueueCapacity=semanticUnitCapacity*2,queueWarningJobs=8;
export class StreamingInterpreter {
 snapshot:StreamingSnapshot={state:'READY',lanes:{en:emptyLane(),da:emptyLane()},error:'',warning:'',bargeIns:[]};
 private abort=new AbortController();private current:Partial<Record<Language,Turn>>={};private queues:Record<Language,Job[]>={en:[],da:[]};private workers:Record<Language,boolean>={en:false,da:false};private outputs:Partial<Record<Language,Output>>={};private history:Record<Language,{source:string;target:string}[]>={en:[],da:[]};private outputTurns:Partial<Record<Language,number>>={};private draining:Partial<Record<Language,boolean>>={};private prefetched=new Map<string,{result:Promise<UnitResult>;context:string}>();private translationRequests:Record<Language,number>={en:0,da:0};private translationWaiters:Record<Language,(()=>void)[]>={en:[],da:[]};private audioQueues:Record<Language,Job[]>={en:[],da:[]};private audioWorkers:Partial<Record<Language,Promise<void>>>={};private preparedAudio:Partial<Record<Language,{turn:number;result:Promise<Output>}>>={};private contextWaiters=new Set<{language:Language;wake:()=>void}>();private ended=false;private lagTimer?:ReturnType<typeof setInterval>;
 constructor(private io:InterpreterIO,private notify:(snapshot:StreamingSnapshot)=>void,private options:{bargeIn:boolean;forceControlled:boolean;protectedTerms:string[];warningLagMs:number;maxLagMs:number;conversationContext:string;latencyProfile?:'standard'|'fast';scopedPrecision?:boolean;simultaneous?:boolean}){}
 private emit(){this.notify({...this.snapshot,lanes:{en:{...this.snapshot.lanes.en,units:[...this.snapshot.lanes.en.units]},da:{...this.snapshot.lanes.da,units:[...this.snapshot.lanes.da.units]}},bargeIns:[...this.snapshot.bargeIns]});}
 start(){this.ended=false;this.snapshot.state='LISTENING';this.lagTimer=setInterval(()=>this.measureLag(),100);this.emit();}
 sourceStarted(language:Language,at:number){if(this.ended)return;if(this.current[language])return;
  const other=language==='en'?'da':'en';const pending=Boolean(this.outputs[other])||this.snapshot.lanes[other].units.some(u=>u.status==='queued'||u.status==='translating');
  if(pending){this.snapshot.bargeIns.push({at,source:language,event:'SPEAKER_CHANGE_DURING_TRANSLATION',remainingAudioMs:this.outputs[other]?.queuedMs,action:this.options.bargeIn?'Interrupted pending output; undelivered ranges retained':'Logged only'});if(this.options.bargeIn){this.io.pauseInput(other);const oldTurn=this.current[other];if(oldTurn){oldTurn.cancelled=true;oldTurn.resolve('');}this.outputs[other]?.cancel();this.outputs[other]=undefined;this.outputTurns[other]=undefined;this.queues[other]=[];for(const unit of this.snapshot.lanes[other].units)if(unit.status!=='spoken')unit.status='interrupted';this.snapshot.warning='Interrupted content is retained for human review.';}}
  let resolve!:(text:string)=>void;const done=new Promise<string>(r=>{resolve=r;});const guard=this.options.scopedPrecision?(text:string)=>precisionTrigger(text)||(exactIdentityRequired(text)?uncertainProtectedTerm(text,this.options.protectedTerms):''):undefined;const turn:Turn={id:nextStreamIdentity(),start:at,committer:new SemanticCommitter(language,100,120,this.options.latencyProfile==='fast'||this.options.scopedPrecision,guard,this.options.scopedPrecision,this.options.simultaneous),base:this.completedWordCount(language),wordAt:[],units:[],done,resolve};if(this.options.forceControlled)turn.committer.precision='Controlled handling requested';this.current[language]=turn;this.snapshot.lanes[language].sourceStarted=at;this.snapshot.lanes[language].sourceFinished=undefined;this.snapshot.state='LISTENING';this.emit();
 }
 partial(language:Language,text:string){if(this.options.scopedPrecision)text=campaignSpeechText(text);const turn=this.current[language];if(!turn||this.ended||turn.cancelled)return;const now=this.io.now();for(let i=turn.wordAt.length;i<words(text).length;i++)turn.wordAt[i]=now;const risk=this.options.scopedPrecision?'':uncertainProtectedTerm(text,['Humza','Pernille','Isabella','aPureBase',...this.options.protectedTerms])||precisionTrigger(text);if(risk&&(!turn.committer.precision||turn.committer.precision==='Controlled handling requested'))turn.committer.precision=risk;const result=turn.committer.update(text,now);if(result.revision){turn.revision=true;this.terminalReview(language,'ASR revised an already committed span. No spoken correction will be generated.');return;}const lane=this.snapshot.lanes[language];lane.precision=result.precision;lane.partial=turn.committer.partialText;lane.liveCommitted=turn.committer.committedText;lane.receivedWords=this.completedWordCount(language)+turn.committer.received;if(result.precision)this.snapshot.state='PRECISION MODE';for(const segment of result.segments)this.enqueue(language,turn,segment);this.wakeContext(language);this.emit();}
 finalized(language:Language,text:string){if(this.options.scopedPrecision)text=campaignSpeechText(text);const turn=this.current[language];if(!turn||this.ended)return;turn.final=text;const now=this.io.now();const result=turn.committer.update(text,now,true);if(result.revision){turn.revision=true;turn.resolve(text);this.terminalReview(language,'Final ASR revised a committed span. Review required; no correction is spoken.');return;}const lane=this.snapshot.lanes[language];lane.source=[lane.source,text].filter(Boolean).join('\n');lane.partial='';lane.liveCommitted='';lane.precision=result.precision;lane.sourceFinished=now;lane.receivedWords=this.completedWordCount(language);if(turn.held===undefined&&!turn.cancelled)for(const segment of result.segments)this.enqueue(language,turn,segment);turn.resolve(text);this.current[language]=undefined;if(!this.ended){if(this.queuedJobs(language)>=workQueueCapacity)this.stopForCapacity(language,'Interpretation work queue',workQueueCapacity);else{this.queues[language].push({turn});void this.work(language);}}this.wakeContext(language);this.emit();}
 private completedWordCount(language:Language){return words(this.snapshot.lanes[language].source).length;}
 private enqueue(language:Language,turn:Turn,segment:{start:number;end:number;text:string;precision?:boolean}){if(this.ended)return;const lane=this.snapshot.lanes[language];if(lane.units.length>=semanticUnitCapacity){this.stopForCapacity(language,'Semantic unit storage',semanticUnitCapacity);return;}if(this.queuedJobs(language)>=workQueueCapacity){this.stopForCapacity(language,'Interpretation work queue',workQueueCapacity);return;}const unit:SemanticUnit={id:`${language}-${turn.id}-${segment.start}-${segment.end}`,turn:turn.id,globalStart:turn.base+segment.start,language,start:segment.start,end:segment.end,source:segment.text,status:'committed',precision:segment.precision??Boolean(turn.committer.precision),timing:{source_start:segment.start===0?turn.start:turn.wordAt[segment.start]??this.io.now(),source_stable_at:this.io.now(),source_end_observed:turn.wordAt[segment.end-1]??this.io.now()}};turn.units.push(unit);lane.units.push(unit);lane.committedWords+=unit.end-unit.start;this.queues[language].push({turn,unit});this.updateBackpressure(language);if(this.options.simultaneous)this.prefetchNext(language);void this.work(language);}
 private request(language:Language,unit:SemanticUnit):UnitRequest{const history=this.history[language].slice(-6);return{text:unit.source,language,sourceHistory:(this.options.simultaneous?this.snapshot.lanes[language].units.filter(u=>(u.globalStart??u.start)<(unit.globalStart??unit.start)).slice(-6).map(u=>u.source):history.map(h=>h.source)).join(' ').slice(-1600),targetHistory:history.map(h=>h.target).join(' ').slice(-1600),conversationContext:this.options.conversationContext.slice(0,1600),speakerRole:language==='en'?'agent':'clinic',protectedTerms:this.options.protectedTerms,precision:unit.precision,...(this.options.simultaneous?{uncertaintyRouting:true,followingSourceContext:this.followingSource(language,unit)}:{}),...(this.options.latencyProfile?{latencyProfile:this.options.latencyProfile}:{})};}
 private followingSource(language:Language,unit:SemanticUnit){const source=[this.snapshot.lanes[language].source,this.current[language]?.final===undefined?this.current[language]?.committer.source:undefined].filter(Boolean).join(' ');const tokens=words(source),end=(unit.globalStart??unit.start)+unit.end-unit.start;return tokens[end]?source.slice(tokens[end].start).slice(0,1600):'';}
 private wakeContext(language:Language){for(const waiter of [...this.contextWaiters])if(waiter.language===language)waiter.wake();}
 private waitForContext(language:Language,unit:SemanticUnit,turn:Turn,previous:string){
  const signal=this.abort.signal;signal.throwIfAborted();return new Promise<string>((resolve,reject)=>{
   const cleanup=()=>{this.contextWaiters.delete(waiter);signal.removeEventListener('abort',aborted);};
   const aborted=()=>{cleanup();reject(new DOMException('Call ended','AbortError'));};
   const waiter={language,wake:()=>{const context=this.followingSource(language,unit);if(turn.cancelled||turn.revision||['review','interrupted'].includes(unit.status)||context!==previous){cleanup();resolve(context);}}};
   this.contextWaiters.add(waiter);signal.addEventListener('abort',aborted,{once:true});waiter.wake();
  });
 }
 private async finalText(turn:Turn){const signal=this.abort.signal;signal.throwIfAborted();return await new Promise<string>((resolve,reject)=>{const aborted=()=>reject(new DOMException('Call ended','AbortError'));signal.addEventListener('abort',aborted,{once:true});turn.done.then(text=>{signal.removeEventListener('abort',aborted);if(signal.aborted)aborted();else resolve(text);});});}
 private prefetchNext(language:Language){
  if(!this.options.simultaneous||this.ended)return;
  // Refill request slots when a request settles, independently of ordered
  // validation and audio drain. Results stay attached to bounded source units.
  while(this.translationRequests[language]<2){
   const job=this.queues[language].find(j=>j.unit&&j.unit.status==='committed'&&!this.prefetched.has(j.unit.id)&&!j.turn.cancelled&&!j.turn.revision);if(!job?.unit)return;
   const unit=job.unit;unit.status='translating';unit.timing.translation_started=this.io.now();this.translationRequests[language]++;
   const request=this.request(language,unit);let pending:Promise<UnitResult>;
   try{pending=this.io.translate(request,this.abort.signal,text=>{if(!this.abort.signal.aborted){unit.timing.translation_first_text??=this.io.now();this.snapshot.lanes[language].targetPartial=text;this.emit();}});}catch(error){pending=Promise.reject(error);}
   const result=pending.then(value=>{if(!this.abort.signal.aborted)unit.timing.translation_ready=this.io.now();return value;}).finally(()=>{this.releaseTranslationSlot(language);if(!this.ended)this.emit();});
   result.catch(()=>{});this.prefetched.set(unit.id,{result,context:request.followingSourceContext??''});
  }
 }
 private releaseTranslationSlot(language:Language){
  this.translationRequests[language]--;const waiting=this.translationWaiters[language].shift();if(waiting)waiting();else this.prefetchNext(language);
 }
 private async retryTranslation(language:Language,input:UnitRequest){
  const signal=this.abort.signal;signal.throwIfAborted();
  if(this.translationRequests[language]>=2)await new Promise<void>((resolve,reject)=>{
   const cleanup=()=>signal.removeEventListener('abort',aborted);
   const wake=()=>{cleanup();this.translationRequests[language]++;resolve();};
   const aborted=()=>{cleanup();this.translationWaiters[language]=this.translationWaiters[language].filter(waiter=>waiter!==wake);reject(new DOMException('Call ended','AbortError'));};
   this.translationWaiters[language].push(wake);signal.addEventListener('abort',aborted,{once:true});
  });else this.translationRequests[language]++;
  try{signal.throwIfAborted();return await this.io.translate(input,signal,()=>{});}finally{this.releaseTranslationSlot(language);}
 }
 private queuedJobs(language:Language){return this.queues[language].length+this.audioQueues[language].length;}
 private prepareAudio(language:Language,turn:Turn){
  if(this.outputs[language]||this.preparedAudio[language]||this.audioWorkers[language]||this.audioQueues[language].length)return;
  const signal=this.abort.signal;const result=this.io.output(language,turn.id,signal).then(output=>{if(signal.aborted)output.cancel();else if(this.preparedAudio[language]?.turn===turn.id){this.outputs[language]=output;this.outputTurns[language]=turn.id;}return output;});
  result.catch(()=>{});this.preparedAudio[language]={turn:turn.id,result};
 }
 private workAudio(language:Language):Promise<void>{
  if(this.audioWorkers[language])return this.audioWorkers[language]!;
  if(this.ended||!this.audioQueues[language].length)return Promise.resolve();
  const work=this.runAudio(language);this.audioWorkers[language]=work;
  void work.finally(()=>{if(this.audioWorkers[language]===work){this.audioWorkers[language]=undefined;if(!this.ended&&this.audioQueues[language].length)void this.workAudio(language);}});
  return work;
 }
 // Only this worker owns ordered voice contexts and turn-finalization boundaries.
 private async runAudio(language:Language){
  const signal=this.abort.signal;let output=this.outputs[language],turnId=this.outputTurns[language],preparing:Promise<Output>|undefined;
  try{
   while(this.audioQueues[language].length&&!this.ended){
    signal.throwIfAborted();const {turn,unit}=this.audioQueues[language].shift()!;
    if(!unit){if(output){await output.finish();signal.throwIfAborted();output=undefined;this.outputs[language]=undefined;turnId=undefined;this.outputTurns[language]=undefined;}continue;}
    if(turn.cancelled||turn.revision||['review','interrupted'].includes(unit.status))continue;
    if(turnId!==turn.id){preparing=this.preparedAudio[language]?.turn===turn.id?this.preparedAudio[language]!.result:this.io.output(language,turn.id,signal);output=await preparing;signal.throwIfAborted();preparing=undefined;this.outputs[language]=output;turnId=turn.id;this.outputTurns[language]=turn.id;}
    if(turn.cancelled||turn.revision||['review','interrupted'].includes(unit.status))continue;
    if(this.preparedAudio[language]?.turn===turn.id)this.preparedAudio[language]=undefined;unit.timing.tts_text_sent=this.io.now();output!.send(unit);this.emit();
   }
  }catch(error){
   if(preparing){try{(await preparing).cancel();}catch{/* Setup failed or STOP cancelled it. */}}
   if(!signal.aborted){if(this.draining[language]){output?.cancel();this.audioQueues[language]=[];this.snapshot.warning='Output failed while draining validated speech. Review retained transcript.';this.snapshot.state='PRECISION MODE';this.emit();}else{this.stopForReview(language,error instanceof Error?error.message:'Streaming output failed.');this.io.failed?.(error instanceof Error?error:new Error('Interpretation output failed.'));}}
  }
 }

 playbackPosition(id:string,fraction:number){const unit=[...this.snapshot.lanes.en.units,...this.snapshot.lanes.da.units].find(u=>u.id===id);if(!this.ended&&unit)unit.playedFraction=Math.max(unit.playedFraction??0,Math.min(1,Math.max(0,fraction)));}
 private async work(language:Language){if(this.workers[language]||this.ended)return;this.workers[language]=true;const signal=this.abort.signal;let output=this.outputs[language];let outputTurn:number|undefined=this.outputTurns[language];let pendingOutput:Promise<Output>|undefined;let activeTurn:Turn|undefined;
  try{while(this.queues[language].length&&!this.ended){signal.throwIfAborted();const job=this.queues[language].shift()!;if(!job.unit){if(this.options.simultaneous){this.audioQueues[language].push(job);void this.workAudio(language);continue;}if(output){this.draining[language]=true;this.prefetchNext(language);try{await output.finish();}finally{this.draining[language]=false;}signal.throwIfAborted();output=undefined;this.outputs[language]=undefined;outputTurn=undefined;this.outputTurns[language]=undefined;}continue;}
   const {turn,unit}=job;activeTurn=turn;if(unit.status==='interrupted'||unit.status==='review'||turn.revision||turn.cancelled)continue;
   unit.status='translating';unit.timing.translation_started??=this.io.now();this.snapshot.state=unit.precision?'PRECISION MODE':'INTERPRETING';this.emit();
   // Preconnect one voice context while the first unit translates; it receives no unstable text.
   let preparing:Promise<Output>|undefined;if(!this.options.simultaneous&&outputTurn!==turn.id){preparing=this.io.output(language,turn.id,signal);pendingOutput=preparing;preparing.catch(()=>{});}
   if(this.options.simultaneous)this.prepareAudio(language,turn);this.prefetchNext(language);const prefetched=this.prefetched.get(unit.id);let contextUsed=prefetched?.context??this.followingSource(language,unit);let result=await (prefetched?.result??this.io.translate(this.request(language,unit),signal,text=>{if(!signal.aborted){unit.timing.translation_first_text??=this.io.now();this.snapshot.lanes[language].targetPartial=text;this.emit();}}));this.prefetched.delete(unit.id);signal.throwIfAborted();if(turn.cancelled||turn.revision||['interrupted','review'].includes(unit.status)){(await preparing)?.cancel();pendingOutput=undefined;continue;}
   if(this.options.simultaneous){
    let route=uncertaintyRoute(unit.source,result);
    while(route==='context'){
     unit.status='held';this.snapshot.lanes[language].targetPartial='';this.snapshot.state='LISTENING';this.emit();
     // Translate following units if available, but preserve audible source order.
     this.prefetchNext(language);const context=await this.waitForContext(language,unit,turn,contextUsed);signal.throwIfAborted();if(turn.cancelled||turn.revision||['review','interrupted'].includes(unit.status))break;
     contextUsed=context;unit.status='translating';result=await this.retryTranslation(language,{...this.request(language,unit),followingSourceContext:context});signal.throwIfAborted();unit.timing.translation_ready=this.io.now();route=uncertaintyRoute(unit.source,result);
    }
    if(turn.cancelled||turn.revision||(unit as SemanticUnit).status==='interrupted'||(unit as SemanticUnit).status==='review'){(await preparing)?.cancel();pendingOutput=undefined;continue;}
    if(route==='precision'){unit.precision=true;result=await this.retryTranslation(language,this.request(language,unit));unit.timing.translation_ready=this.io.now();signal.throwIfAborted();if(uncertaintyRoute(unit.source,result)!=='continue')throw new PrecisionReviewRequired(`Semantic unit requires human review (${result.guardReason??'consequential uncertainty'}). No uncertain audio was sent.`);}
   }
   if(!this.options.simultaneous&&(result.needs_precision||result.confidence<.9)){unit.status='review';turn.held=unit.start;turn.committer.precision='Translation uncertainty';this.snapshot.lanes[language].precision='Translation uncertainty';this.snapshot.state='PRECISION MODE';this.snapshot.lanes[language].targetPartial='';this.emit();const text=await this.finalText(turn);signal.throwIfAborted();if(turn.cancelled||turn.revision||['interrupted'].includes(unit.status)){(await preparing)?.cancel();pendingOutput=undefined;continue;}if(turn.revision)throw new Error('Committed ASR revision requires human review.');
    // Merge only unvalidated/unsent units into a complete precision tail. Spoken ranges remain immutable.
    const removed=turn.units.filter(u=>u!==unit&&u.start>=unit.start);this.queues[language]=this.queues[language].filter(j=>!j.unit||!removed.includes(j.unit));this.snapshot.lanes[language].units=this.snapshot.lanes[language].units.filter(u=>!removed.includes(u));const tokens=words(text);this.snapshot.lanes[language].committedWords-=removed.reduce((n,u)=>n+u.end-u.start,0);this.snapshot.lanes[language].committedWords+=tokens.length-unit.end;unit.end=tokens.length;unit.source=text.slice(tokens[unit.start]?.start??0).trim();unit.precision=true;unit.timing.source_stable_at=this.io.now();result=await this.io.translate(this.request(language,unit),signal,()=>{});signal.throwIfAborted();if(result.needs_precision||result.confidence<.9)throw new PrecisionReviewRequired(`Precision translation still needs human review (${result.guardReason??'model uncertainty'}). No uncertain audio was sent.`);
   }
   unit.timing.translation_ready??=this.io.now();unit.model=result.model;unit.serviceTier=result.service_tier;unit.target=result.translation;this.snapshot.lanes[language].targetPartial='';this.snapshot.lanes[language].target=[this.snapshot.lanes[language].target,result.translation].filter(Boolean).join(' ');this.snapshot.lanes[language].translatedWords+=unit.end-unit.start;this.history[language].push({source:unit.source,target:result.translation});this.history[language]=this.history[language].slice(-12);
   if(this.options.simultaneous){unit.status='queued';this.audioQueues[language].push({turn,unit});void this.workAudio(language);this.emit();continue;}
   if(preparing){output=await preparing;pendingOutput=undefined;signal.throwIfAborted();this.outputs[language]=output;outputTurn=turn.id;this.outputTurns[language]=turn.id;}if((unit as SemanticUnit).status==='interrupted'||turn.cancelled)continue;unit.timing.tts_text_sent=this.io.now();unit.status='queued';output!.send(unit);this.emit();
  }if(!this.ended){this.snapshot.state=this.snapshot.lanes.en.precision||this.snapshot.lanes.da.precision?'PRECISION MODE':'LISTENING';this.emit();}}
  catch(error){
   if(pendingOutput){try{(await pendingOutput).cancel();}catch{/* Setup already failed or was cancelled. */}pendingOutput=undefined;}
   if(!signal.aborted){
    const drain=error instanceof PrecisionReviewRequired;
    this.stopForReview(language,error instanceof Error?error.message:'Streaming failed.',drain);
    const unused=this.preparedAudio[language];
    if(this.options.simultaneous&&unused&&!this.snapshot.lanes[language].units.some(unit=>unit.turn===unused.turn&&unit.status==='queued')){
     // A preconnection with no validated text must be cancelled, never finalized as empty TTS.
     this.preparedAudio[language]=undefined;try{(await unused.result).cancel();}catch{/* Setup failed. */}
     if(this.outputTurns[language]===unused.turn){this.outputs[language]=undefined;this.outputTurns[language]=undefined;}
    }
    if(signal.aborted)return;
    if(drain&&this.options.simultaneous&&activeTurn){
     this.draining[language]=true;
     try{this.audioQueues[language].push({turn:activeTurn});do{await this.workAudio(language);}while(this.audioWorkers[language]||this.audioQueues[language].length);}finally{this.draining[language]=false;}
    }
    if(drain&&output&&!this.options.simultaneous){try{await output.finish();}catch{output.cancel();this.snapshot.warning='Output failed while draining validated speech. Review retained transcript.';}this.outputs[language]=undefined;this.outputTurns[language]=undefined;this.snapshot.state='PRECISION MODE';this.emit();}
    if(!signal.aborted)this.io.failed?.(error instanceof Error?error:new Error('Interpretation failed.'));
   }
  }
  finally{this.workers[language]=false;}
 }
 playback(id:string,event:'firstAudio'|'scheduled'|'started'|'finished',at:number){if(this.ended)return;const unit=[...this.snapshot.lanes.en.units,...this.snapshot.lanes.da.units].find(u=>u.id===id);if(!unit||unit.status==='interrupted')return;if(event==='firstAudio')unit.timing.first_audio_received??=at;if(event==='scheduled')unit.timing.playback_scheduled??=at;if(event==='started'){unit.timing.playback_started??=at;this.snapshot.state=unit.precision?'PRECISION MODE':'SPEAKING';}if(event==='finished'&&unit.status!=='spoken'){unit.timing.playback_finished=at;unit.status='spoken';unit.playedFraction=1;this.snapshot.lanes[unit.language].spokenWords+=unit.end-unit.start;}this.emit();}
 private measureLag(){if(this.ended)return;const pending=[...this.snapshot.lanes.en.units,...this.snapshot.lanes.da.units].filter(u=>!['spoken','interrupted','review'].includes(u.status));const observedHeld=this.options.scopedPrecision?Object.values(this.current).filter((turn):turn is Turn=>Boolean(turn)&&!turn!.cancelled&&!turn!.revision&&turn!.committer.received>turn!.committer.cursor).map(turn=>this.io.now()-(turn.committer.cursor===0?turn.start:turn.wordAt[turn.committer.cursor]??this.io.now())):[];this.snapshot.lag=Math.max(0,...observedHeld,...pending.map(u=>(u.timing.playback_started??this.io.now())-u.timing.source_start));for(const language of ['en','da']as const)this.updateBackpressure(language);this.emit();}
 private updateBackpressure(language:Language){
  const lane=this.snapshot.lanes[language];const pending=lane.units.filter(u=>!['spoken','interrupted','review'].includes(u.status));const contextHeld=pending.some(u=>u.status==='held');
  const lagMs=Math.max(0,...pending.filter(u=>u.timing.playback_started===undefined&&!contextHeld).map(u=>this.io.now()-u.timing.source_start));
  const workQueueJobs=this.queuedJobs(language),warningLagMs=this.options.simultaneous?3000:this.options.warningLagMs,highLagMs=this.options.simultaneous?6000:this.options.maxLagMs;const state=lagMs>=highLagMs||workQueueJobs>=queueWarningJobs?'behind':lagMs>warningLagMs?'lagging':'normal';
  this.snapshot.backpressure??={};this.snapshot.backpressure[language]={state,lagMs,warningLagMs,highLagMs,warning:state==='normal'?'':'Interpreter is behind.',translationQueueUnits:pending.filter(u=>u.status==='committed'||u.status==='translating').length,ttsQueueUnits:pending.filter(u=>u.status==='queued'&&u.timing.first_audio_received===undefined).length,playbackBufferMs:this.outputs[language]?.queuedMs??0,workQueueJobs,workQueueCapacity,...(this.options.simultaneous?{translationActiveRequests:this.translationRequests[language],translationReadyUnits:lane.units.filter(u=>u.timing.translation_ready!==undefined&&u.target===undefined).length,audioQueueJobs:this.audioQueues[language].length}:{}),semanticUnits:lane.units.length,semanticUnitCapacity};
 }
 private stopForCapacity(language:Language,queue:string,capacity:number){
  this.updateBackpressure(language);const pressure=this.snapshot.backpressure![language]!;
  const error=new Error(`${queue} reached capacity (${capacity}${queue==='Semantic unit storage'?' units':' jobs'} for ${language.toUpperCase()}). Captured source and undelivered ranges are retained. Stop and export before restarting.`);
  this.end();this.snapshot.backpressure={...this.snapshot.backpressure,[language]:{...pressure,state:'capacity',warning:'Interpreter is behind.',capacityQueue:queue}};this.snapshot.error=error.message;this.snapshot.state='ERROR';this.emit();this.io.failed?.(error);
 }
 private terminalReview(language:Language,reason:string){this.stopForReview(language,reason);this.io.failed?.(new Error(reason));}
 private stopForReview(language:Language,reason:string,drainValidated=false){this.io.pauseInput(language);const current=this.current[language];if(current)current.committer.precision=reason;this.queues[language]=[];if(!drainValidated)this.audioQueues[language]=[];this.snapshot.lanes[language].precision=reason;this.snapshot.warning=reason;this.snapshot.state='PRECISION MODE';if(!drainValidated)this.outputs[language]?.cancel();for(const unit of this.snapshot.lanes[language].units)if(unit.status!=='spoken'&&!(drainValidated&&unit.status==='queued'))unit.status='review';this.wakeContext(language);this.emit();}
 end(){if(this.ended)return;this.ended=true;this.abort.abort();this.prefetched.clear();clearInterval(this.lagTimer);for(const language of ['en','da']as const){this.io.pauseInput(language);this.outputs[language]?.cancel();this.preparedAudio[language]=undefined;this.queues[language]=[];this.audioQueues[language]=[];for(const unit of this.snapshot.lanes[language].units)if(unit.status!=='spoken')unit.status='interrupted';}this.snapshot.state='READY';this.snapshot.lag=undefined;this.snapshot.backpressure=undefined;this.emit();}
 listening(language:Language){if(this.ended)return;this.snapshot.listeningTo=language;this.snapshot.state='LISTENING';this.emit();}
 cached(id:string,en:string,da:string){this.snapshot.cachedEvents=[...(this.snapshot.cachedEvents??[]),{id,en,da,at:this.io.now()}];this.snapshot.state='SPEAKING';this.emit();}
 get hasActiveSource(){return Boolean(this.current.en||this.current.da);}
 get idle(){return !this.workers.en&&!this.workers.da&&!this.queues.en.length&&!this.queues.da.length&&!this.audioWorkers.en&&!this.audioWorkers.da&&!this.audioQueues.en.length&&!this.audioQueues.da.length;}
}
