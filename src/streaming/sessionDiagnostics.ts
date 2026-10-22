import type {RecognitionAuditSnapshot} from './recognitionAudit';
import {sessionBreakdown} from './sessionBreakdown';
import {emptyVoiceProvenance,type VoiceProvenanceSummary} from './pcmProvenance';
import type {LocalSnapshot} from './localSession';

export type DiagnosticSink=(event:string,data?:Record<string,unknown>)=>void;
export const diagnosticStorageKey='apurebase.last-session-diagnostics.v1';
export const diagnosticLimits={events:2000,bytes:384*1024,units:200,connections:32,pcmBlocks:512,translationLifecycle:256,voiceLifecycle:256,recognitionLifecycle:256};
const numberFields=new Set(['attempt','pcmIdleMs','recoveryAttempts','receivedSamples','totalReceivedSamples','sampleRate','deviceSampleRate','channelCount','frameSamples','workletChannels','leadMs','configuredSpeed','effectiveSpeedSetting','preGainPeak','preGainRms','requestedGain','effectiveGain','gainApplied','postGainPeak','postGainRms','clippingEvents','peakProtectionEvents','verificationMs','keywordCount','pcmBlockSequence','firstSample','lastSample','providerBlockFirst','providerBlockLast','scheduledAt','playbackStartedAt','playbackFinishedAt','providerAt','generation','currentGeneration','pendingFinals','pendingRecognition','pendingTranslation','pendingTTS','pendingPlayback','translationActiveRequests','translationReadyUnits','audioQueueJobs','textCharacters','partialCharacters','finalCharacters','sentCharacters','pendingCharacters','samples','totalSamples','bufferMs','timeoutMs','deadlineAt','sourceSamples','receivedWords','committedWords','translatedWords','spokenWords','turn','start','end','globalStart']);
const flagFields=new Set(['echoCancellation','noiseSuppression','autoGainControl','cancelled','provenanceVerified','turnExists','committed','acknowledged','alreadyFinal','ending','final','empty','whitespace','hasAudio']);
const idFields=new Set(['gainPolicy','contextHintId','stabilityReason','provider','origin','rendererId','connectionId','requestId','providerRequestId','itemId','eventId','providerEvent','unitId','streamId','voiceId','modelId','model','status','classification','reason','language','path','textType','clock']);
const identifier=(value:unknown)=>typeof value==='string'&&/^[a-zA-Z0-9_.:-]{1,160}$/.test(value)&&!/(?:sk[-_]|Bearer|authorization|api[-_]?key|secret|token)/i.test(value)?value:undefined;
/** Only explicitly allowed primitive metadata crosses the persistence/wire boundary.
 * Only bounded unit-ID lists are allowed; speech text, errors, headers, arbitrary objects and binary data never do. */
export function diagnosticMetadata(input:Record<string,unknown>={}){
 const result:Record<string,string|number|boolean|string[]|null>={};
 for(const [key,value]of Object.entries(input)){
  if(key==='unitIds'&&Array.isArray(value))result[key]=value.filter(v=>identifier(v)!==undefined).slice(0,200);
  else if(['configuredSpeed','playbackStartedAt','playbackFinishedAt'].includes(key)&&value===null)result[key]=null;
  else if(numberFields.has(key)&&typeof value==='number'&&Number.isFinite(value))result[key]=value;
  else if(flagFields.has(key)&&typeof value==='boolean')result[key]=value;
  else if(idFields.has(key)){const id=identifier(value);if(id!==undefined)result[key]=id;}
 }
 return result;
}
export function diagnosticText(value:unknown){return{textType:typeof value,textCharacters:typeof value==='string'?value.length:0,empty:value==='',whitespace:typeof value==='string'&&!value.trim()};}
export function diagnosticReason(error:unknown){
 const text=error instanceof Error?error.message:'';
 if(/provenance|unverified.*PCM/i.test(text))return 'voice.provenance_rejected';
 const code=text.match(/recognition stopped \(([a-zA-Z0-9_.-]{1,80})\)/)?.[1];
 if(code)return `recognition.${code}`;
 if(/Voice finalization timed out/.test(text))return 'voice.finalization_timeout';
 if(/recognition finalization timed out/i.test(text))return 'recognition.finalization_timeout';
 if(/Recognition finalization is stalled/.test(text))return 'recognition.finalization_stalled';
 if(/ElevenLabs|voice/i.test(text))return 'voice.failure';
 if(/recognition/i.test(text))return 'recognition.failure';
 if(/translation/i.test(text))return 'translation.failure';
 return error instanceof Error&&error.name==='AbortError'?'aborted':'session.failure';
}
/** Observers must never throw into a provider callback or pipeline transition. */
export function observeDiagnostic(sink:((event:string,data:Record<string,unknown>)=>void)|undefined,event:string,data:Record<string,unknown>={}){try{sink?.(event,diagnosticMetadata(data));}catch{/* Diagnostics cannot stop interpretation. */}}
export interface DiagnosticEvent {sequence:number;at:number;event:string;data:ReturnType<typeof diagnosticMetadata>}
export interface SessionDiagnosticRecord {
 version:1;sessionId:string;clock:'browser-performance.now';epoch:number;source:string;path:string;
 outcome:'failed'|'completed'|'stopped';reason:string;endedAt:number;droppedEvents:number;
 events:DiagnosticEvent[];recognitionLifecycle?:DiagnosticEvent[];droppedRecognitionLifecycle?:number;translationLifecycle?:DiagnosticEvent[];voiceLifecycle?:DiagnosticEvent[];droppedVoiceLifecycle?:number;units:Record<string,unknown>[];connections:Record<string,unknown>[];pending:Record<string,number>;voiceProvenance:VoiceProvenanceSummary;pcmBlocks:Record<string,unknown>[];droppedPCMBlocks:number;voiceQuality?:Record<string,unknown>;latencyBreakdown?:ReturnType<typeof sessionBreakdown>;asrContext?:Record<string,unknown>;recognitionAudit?:RecognitionAuditSnapshot;captureSettings?:ReturnType<typeof diagnosticMetadata>;
}
let memoryLast:SessionDiagnosticRecord|undefined;
function storage(){try{if(typeof window==='undefined'&&!Object.getOwnPropertyDescriptor(globalThis,'localStorage')?.value)return;return globalThis.localStorage;}catch{return undefined;}}
export function lastSessionDiagnostics():SessionDiagnosticRecord|undefined{
 try{const text=storage()?.getItem(diagnosticStorageKey);if(text&&new TextEncoder().encode(text).length<=diagnosticLimits.bytes){const parsed=JSON.parse(text);if(parsed.version===1&&Array.isArray(parsed.events)&&parsed.events.length<=diagnosticLimits.events)return parsed;}}catch{/* Private browsing/storage restrictions: retain the in-memory copy. */}
 return memoryLast;
}
export function exportLastSessionDiagnostics(){const record=lastSessionDiagnostics();return record?JSON.stringify(record):undefined;}
export class SessionDiagnostics {
 readonly sessionId=globalThis.crypto.randomUUID();readonly epoch:number;
 private recognitionLifecycle:DiagnosticEvent[]=[];private droppedRecognitionLifecycle=0;
 private voiceLifecycle:DiagnosticEvent[]=[];private droppedVoiceLifecycle=0;private translationLifecycle:DiagnosticEvent[]=[];private events:DiagnosticEvent[]=[];private sequence=0;private droppedEvents=0;private eventBytes=0;private sealed=false;
 private units=new Map<string,Record<string,unknown>>();private connections=new Map<string,Record<string,unknown>>();
 private voiceQuality:Record<string,number|string|null>={configuredSpeed:null,effectiveSpeedSetting:null,preGainPeak:null,preGainRms:null,requestedGain:null,effectiveGain:null,gainApplied:null,postGainPeak:null,postGainRms:null,clippingEvents:0,peakProtectionEvents:0};private qualitySamples=0;private qualitySquares=0;private qualityPostSquares=0;private firstPCMAt?:number;private clientVerificationMs?:number;private rendererVerificationMs?:number;private latencyBreakdown?:ReturnType<typeof sessionBreakdown>;private asrContext:Record<string,unknown>={};
 private voiceProvenance=emptyVoiceProvenance();private pcmBlocks=new Map<string,Record<string,unknown>>();private droppedPCMBlocks=0;
 private recognitionAudit?:RecognitionAuditSnapshot;private captureSettings:ReturnType<typeof diagnosticMetadata>={};
 private unitVoice=new Map<string,{requestId:string;ttsTextSentAt:number}>();
 private seen=new Map<string,string>();private pending:Record<string,number>={};
 constructor(private source:string,private path:string,private now=()=>performance.now()){this.epoch=now();this.record('session.created',{language:source,path});}
 get qualitySummary(){return{...this.voiceQuality};}
 get timingSummary(){return this.latencyBreakdown;}
 get provenanceSummary(){return{...this.voiceProvenance};}
 readonly record:DiagnosticSink=(event,data={})=>{
  try{
   if(this.sealed)return;
   const safeEvent=identifier(event)??'diagnostic.event';const safe=diagnosticMetadata(data);
   if(event==='VOICE_READY'){if(typeof safe.effectiveSpeedSetting==='number')this.voiceQuality.effectiveSpeedSetting=safe.effectiveSpeedSetting;if(typeof safe.configuredSpeed==='number'||safe.configuredSpeed===null)this.voiceQuality.configuredSpeed=safe.configuredSpeed;}
   if(event==='voice.pcm_received'&&typeof safe.providerAt==='number')this.firstPCMAt??=safe.providerAt;
   if(event==='voice.pcm_verified'&&typeof safe.verificationMs==='number')this.clientVerificationMs??=safe.verificationMs;
   if(event==='PCM_PROVENANCE_ACCEPTED'&&typeof safe.verificationMs==='number')this.rendererVerificationMs??=safe.verificationMs;
   if(event.startsWith('capture.'))this.captureSettings={...this.captureSettings,...safe};
   if(event==='recognition.context_hints')this.asrContext={...safe};
   if(event==='PCM_GAIN_APPLIED'&&typeof safe.samples==='number'&&typeof safe.preGainRms==='number'&&safe.provenanceVerified===true){this.qualitySamples+=safe.samples;this.qualitySquares+=safe.preGainRms**2*safe.samples;this.voiceQuality.preGainPeak=Math.max(Number(this.voiceQuality.preGainPeak),Number(safe.preGainPeak));this.voiceQuality.preGainRms=Math.sqrt(this.qualitySquares/this.qualitySamples);this.voiceQuality.gainApplied=Number(safe.gainApplied);if(typeof safe.requestedGain==='number')this.voiceQuality.requestedGain=safe.requestedGain;if(typeof safe.effectiveGain==='number')this.voiceQuality.effectiveGain=safe.effectiveGain;if(typeof safe.postGainRms==='number'){this.qualityPostSquares+=safe.postGainRms**2*safe.samples;this.voiceQuality.postGainRms=Math.sqrt(this.qualityPostSquares/this.qualitySamples);}this.voiceQuality.postGainPeak=Math.max(Number(this.voiceQuality.postGainPeak),Number(safe.postGainPeak));this.voiceQuality.clippingEvents=Number(this.voiceQuality.clippingEvents)+Number(safe.clippingEvents);this.voiceQuality.peakProtectionEvents=Number(this.voiceQuality.peakProtectionEvents)+Number(safe.peakProtectionEvents);this.voiceQuality.gainPolicy=String(safe.gainPolicy);}
   if(event==='tts.unit_sent'&&typeof safe.unitId==='string'&&typeof safe.requestId==='string'){
    if(this.unitVoice.get(safe.unitId)?.requestId===safe.requestId)return;
    this.unitVoice.set(safe.unitId,{requestId:safe.requestId,ttsTextSentAt:this.now()});if(this.unitVoice.size>diagnosticLimits.units)this.unitVoice.delete(this.unitVoice.keys().next().value!);
   }
   if(['PCM_GAIN_APPLIED','VOICE_PROVENANCE_VERIFIED','PCM_BLOCK_SCHEDULED','PCM_BLOCK_PLAYBACK_STARTED','PCM_BLOCK_PLAYBACK_FINISHED','PCM_BLOCK_CANCELLED'].includes(event)&&typeof safe.streamId==='string'&&typeof safe.pcmBlockSequence==='number'){
    const key=`${safe.streamId}:${safe.pcmBlockSequence}`;const block={...this.pcmBlocks.get(key),...safe};
    if(event==='VOICE_PROVENANCE_VERIFIED')block.verifiedAt=this.now();
    this.pcmBlocks.set(key,block);if(this.pcmBlocks.size>diagnosticLimits.pcmBlocks){this.pcmBlocks.delete(this.pcmBlocks.keys().next().value!);this.droppedPCMBlocks++;}
    if(event==='PCM_BLOCK_PLAYBACK_STARTED'){
     this.voiceProvenance.audiblePCMBlocks++;
     if(safe.provenanceVerified===true&&safe.provider==='ElevenLabs'&&safe.voiceId==='gIfqD5jrnhkFu8ENVbXC'&&safe.modelId==='eleven_flash_v2_5')this.voiceProvenance.verifiedIsabellaPCMBlocks++;
     else{this.voiceProvenance.unverifiedPCMBlocks++;if(safe.provider!=='ElevenLabs'||safe.voiceId!=='gIfqD5jrnhkFu8ENVbXC'||safe.modelId!=='eleven_flash_v2_5')this.voiceProvenance.alternateVoicePCMBlocks++;}
    }
   }
   const entry={sequence:++this.sequence,at:this.now(),event:safeEvent,data:{...this.pending,...safe}};
   if(event.startsWith('translation.attempt_')||event==='translation.first_text_timeout'||['translation.context_wait_started','translation.context_wait_resumed','translation.retry_started','translation.retry_settled'].includes(event)){this.translationLifecycle.push(entry);if(this.translationLifecycle.length>diagnosticLimits.translationLifecycle)this.translationLifecycle.shift();}
   if(['recognition.commit','recognition.commit_sent','recognition.commit_acknowledged','recognition.committed','recognition.provider_completed','recognition.final_delivered','recognition.final','recognition.semantic_finalized','recognition.finalization_timeout_started','recognition.finalization_timeout_expired','recognition.transport_failed'].includes(event)){this.recognitionLifecycle.push(entry);if(this.recognitionLifecycle.length>diagnosticLimits.recognitionLifecycle){this.recognitionLifecycle.shift();this.droppedRecognitionLifecycle++;}}
   if(['VOICE_FLUSH_CONFIRMED','ELEVENLABS_TEXT_SENT','ELEVENLABS_STARVATION_FLUSH','ELEVENLABS_STALL_RECOVERY','voice.provider_text_sent','voice.provider_flush_sent','voice.provider_pcm_received','voice.pcm_received','voice.failed'].includes(event)){this.voiceLifecycle.push(entry);if(this.voiceLifecycle.length>diagnosticLimits.voiceLifecycle){this.voiceLifecycle.shift();this.droppedVoiceLifecycle++;}}
   this.events.push(entry);this.eventBytes+=JSON.stringify(entry).length;
   while(this.events.length>diagnosticLimits.events||this.eventBytes>diagnosticLimits.bytes/2){this.eventBytes-=JSON.stringify(this.events.shift()!).length;this.droppedEvents++;}
   const id=String(safe.requestId??safe.connectionId??'');
   if(id){const connection=this.connections.get(id)??{id};connection.lastEventAt=entry.at;
    for(const key of ['requestId','connectionId','providerRequestId','voiceId','modelId'])if(safe[key]!==undefined)connection[key]=safe[key];
    if(event==='voice.pcm_received'){connection.firstPCMReceivedAt??=entry.at;connection.lastPCMReceivedAt=entry.at;connection.totalSamples=safe.totalSamples;}
    this.connections.set(id,connection);if(this.connections.size>diagnosticLimits.connections)this.connections.delete(this.connections.keys().next().value!);
   }
  }catch{/* Bounded best-effort metadata collection only. */}
 };
 capture(snapshot:LocalSnapshot){
  try{
   if(this.sealed)return;this.recognitionAudit=snapshot.recognition?.audit;const lane=snapshot.lanes[this.source as 'en'|'da'];this.latencyBreakdown=sessionBreakdown(snapshot,this.source as 'en'|'da',id=>this.unitVoice.get(id)?.ttsTextSentAt,this.firstPCMAt,this.clientVerificationMs===undefined||this.rendererVerificationMs===undefined?undefined:this.clientVerificationMs+this.rendererVerificationMs);
   const pending={pendingRecognition:snapshot.recognition?.pendingFinals??0,pendingTranslation:lane.units.filter(u=>['committed','translating','held'].includes(u.status)).length,pendingTTS:lane.units.filter(u=>u.status==='queued'&&u.timing.first_audio_received===undefined).length,pendingPlayback:lane.units.filter(u=>u.status==='queued').length,receivedWords:lane.receivedWords,committedWords:lane.committedWords,translatedWords:lane.translatedWords,spokenWords:lane.spokenWords,translationActiveRequests:snapshot.backpressure?.[this.source as 'en'|'da']?.translationActiveRequests??0,translationReadyUnits:snapshot.backpressure?.[this.source as 'en'|'da']?.translationReadyUnits??0,audioQueueJobs:snapshot.backpressure?.[this.source as 'en'|'da']?.audioQueueJobs??0};
   if(JSON.stringify(pending)!==JSON.stringify(this.pending)){this.pending=pending;this.record('session.pending',pending);}
   const stages={source_stable_at:'unit.committed',translation_started:'translation.started',translation_first_text:'translation.first_text',translation_ready:'translation.ready',tts_text_sent:'tts.queued',first_audio_received:'tts.first_pcm',playback_scheduled:'playback.scheduled',playback_started:'playback.started',playback_finished:'playback.finished'};
   for(const unit of lane.units.slice(-diagnosticLimits.units)){
    const timing:Record<string,number>={};for(const key of ['translation_queued','translation_consumed','tts_queued','source_start','source_end_observed',...Object.keys(stages)]){const value=unit.timing[key as keyof typeof unit.timing];if(typeof value==='number'&&Number.isFinite(value))timing[key]=value;}
    const summary={...diagnosticMetadata({unitId:unit.id,turn:unit.turn,start:unit.start,end:unit.end,globalStart:unit.globalStart,status:unit.status,model:unit.model,stabilityReason:unit.stabilityReason,textCharacters:unit.target?.length}),...this.unitVoice.get(unit.id),timing};
    const serialized=JSON.stringify(summary);if(this.seen.get(unit.id)===serialized)continue;
    const previous=this.units.get(unit.id)?.timing as Record<string,number>|undefined;
    for(const [key,event]of Object.entries(stages))if(timing[key]!==undefined&&timing[key]!==previous?.[key])this.record(event,{unitId:unit.id,providerAt:timing[key],clock:'browser-performance.now',status:unit.status});
    if(this.units.get(unit.id)?.status!==unit.status)this.record('unit.state',{unitId:unit.id,status:unit.status});
    this.units.set(unit.id,summary);this.seen.set(unit.id,serialized);
    if(this.units.size>diagnosticLimits.units){const oldest=this.units.keys().next().value!;this.units.delete(oldest);this.seen.delete(oldest);}
   }
  }catch{/* Never influence runtime behavior. */}
 }
 finish(outcome:SessionDiagnosticRecord['outcome'],reason:string){
  if(this.sealed)return;this.record('session.ended',{classification:outcome,reason});this.sealed=true;
  const record:SessionDiagnosticRecord={version:1,sessionId:this.sessionId,clock:'browser-performance.now',epoch:this.epoch,source:identifier(this.source)??'unknown',path:identifier(this.path)??'unknown',outcome,reason:identifier(reason)??'session.ended',endedAt:this.now(),droppedEvents:this.droppedEvents,events:this.events,recognitionLifecycle:[...this.recognitionLifecycle],droppedRecognitionLifecycle:this.droppedRecognitionLifecycle,voiceLifecycle:[...this.voiceLifecycle],droppedVoiceLifecycle:this.droppedVoiceLifecycle,translationLifecycle:[...this.translationLifecycle],units:[...this.units.values()],connections:[...this.connections.values()],pending:{...this.pending},voiceProvenance:{...this.voiceProvenance},pcmBlocks:[...this.pcmBlocks.values()],droppedPCMBlocks:this.droppedPCMBlocks,voiceQuality:{...this.voiceQuality},latencyBreakdown:this.latencyBreakdown,asrContext:{...this.asrContext},recognitionAudit:this.recognitionAudit,captureSettings:{...this.captureSettings}};
  try{
   // Keep final outcome and most recent events even if storage size is reached.
   while(new TextEncoder().encode(JSON.stringify(record)).length>diagnosticLimits.bytes&&record.events.length){record.events.shift();record.droppedEvents++;}
   while(new TextEncoder().encode(JSON.stringify(record)).length>diagnosticLimits.bytes&&record.pcmBlocks.length){record.pcmBlocks.shift();record.droppedPCMBlocks++;}
   while(new TextEncoder().encode(JSON.stringify(record)).length>diagnosticLimits.bytes&&record.voiceLifecycle?.length){record.voiceLifecycle.shift();record.droppedVoiceLifecycle=(record.droppedVoiceLifecycle??0)+1;}
   while(new TextEncoder().encode(JSON.stringify(record)).length>diagnosticLimits.bytes&&record.recognitionLifecycle?.length){record.recognitionLifecycle.shift();record.droppedRecognitionLifecycle=(record.droppedRecognitionLifecycle??0)+1;}
   memoryLast=record;storage()?.setItem(diagnosticStorageKey,JSON.stringify(record));
  }catch{/* Failure to persist must not affect STOP or error cleanup. */}
 }
}
