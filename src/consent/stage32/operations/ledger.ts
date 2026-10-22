/** Observational in-memory contract. Never a source of consent, ASR correction or storage writes. */
export const speakers=['ISABELLA','CLINIC','HUMAN_AGENT','SYSTEM'] as const;
export const eventTypes=['SPEECH_PARTIAL','SPEECH_FINAL','TRANSLATION_EVENT','ISABELLA_PLAYBACK_STARTED','ISABELLA_PLAYBACK_COMPLETED','ISABELLA_PLAYBACK_INTERRUPTED','CONSENT_EVENT','EMAIL_EVENT','AUTHORITY_EVENT','TAKEOVER_EVENT','CALL_EVENT','ERROR_EVENT'] as const;
export type Speaker=typeof speakers[number];
export type EventType=typeof eventTypes[number];
export interface LedgerInput {
 eventId:string;callId:string;timestamp:string;monotonicTimestamp?:number;speaker:Speaker;eventType:EventType;
 sourceLanguage?:string;sourceText?:string;translatedLanguage?:string;translatedText?:string;
 translationStatus?:'NOT_REQUESTED'|'PENDING'|'DERIVED'|'FAILED';asrFinal?:boolean;sourceTurnId?:string;playbackId?:string;
 evidenceClassification:'LOCAL_EVALUATION'|'OBSERVED_PROVIDER'|'OBSERVED_ENGINE'|'DERIVED';
 evidenceReferences?:string[];metadata?:Readonly<Record<string,string|number|boolean|null>>;
}
export interface LedgerEntry extends LedgerInput {sequenceNumber:number}
export interface TranscriptExport {schema:'c32-transcript-ledger-1';callId:string;ordering:'callId+sequenceNumber';observationalOnly:true;productionConsent:false;sourceAudioStored:false;retention:'BUSINESS_DECISION_REQUIRED';entries:LedgerEntry[]}
const id=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=200;
const speech=(type:EventType)=>type==='SPEECH_PARTIAL'||type==='SPEECH_FINAL';
const playback=(type:EventType)=>type.startsWith('ISABELLA_PLAYBACK_');
function validate(input:LedgerInput){
 const allowed=['eventId','callId','timestamp','monotonicTimestamp','speaker','eventType','sourceLanguage','sourceText','translatedLanguage','translatedText','translationStatus','asrFinal','sourceTurnId','playbackId','evidenceClassification','evidenceReferences','metadata'];
 if(Object.keys(input).some(k=>!allowed.includes(k)))throw new Error('Unknown ledger field; sequence is locally allocated');
 if(input.translationStatus!==undefined&&!['NOT_REQUESTED','PENDING','DERIVED','FAILED'].includes(input.translationStatus))throw new Error('Invalid translation lifecycle');
 if(!id(input.eventId)||!id(input.callId)||!speakers.includes(input.speaker)||!eventTypes.includes(input.eventType)||!Number.isFinite(Date.parse(input.timestamp))||input.monotonicTimestamp!==undefined&&(!Number.isFinite(input.monotonicTimestamp)||input.monotonicTimestamp<0))throw new Error('Invalid ledger identity/type/time');
 if(!['LOCAL_EVALUATION','OBSERVED_PROVIDER','OBSERVED_ENGINE','DERIVED'].includes(input.evidenceClassification))throw new Error('Explicit observational evidence classification required');
 for(const v of [input.sourceText,input.translatedText])if(v!==undefined&&(typeof v!=='string'||v.length>4000))throw new Error('Bounded literal transcript text required');
 for(const v of [input.sourceTurnId,input.playbackId,input.sourceLanguage,input.translatedLanguage])if(v!==undefined&&!id(v))throw new Error('Invalid source relationship');
 if(speech(input.eventType)&&(!['CLINIC','HUMAN_AGENT'].includes(input.speaker)||!id(input.sourceTurnId)||!input.sourceText?.trim()||!input.sourceLanguage||input.asrFinal!==(input.eventType==='SPEECH_FINAL')))throw new Error('Owned literal partial/final required');
 if(playback(input.eventType)&&(input.speaker!=='ISABELLA'||!id(input.playbackId)||!input.sourceText?.trim()||input.asrFinal!==undefined))throw new Error('Canonical playback observation required');
 if(!speech(input.eventType)&&!playback(input.eventType)&&input.speaker!=='SYSTEM')throw new Error('System event must not look like speech');
 if(input.translatedText!==undefined&&(!input.translatedLanguage||input.translationStatus!=='DERIVED'))throw new Error('Meaning must be separately labelled derived');
 if(input.eventType==='TRANSLATION_EVENT'&&(!id(input.sourceTurnId)||input.sourceText!==undefined||!input.translatedText||input.evidenceClassification!=='DERIVED'))throw new Error('Translation cannot rewrite source');
 if(input.evidenceReferences&&(!Array.isArray(input.evidenceReferences)||input.evidenceReferences.length>20||input.evidenceReferences.some(v=>!id(v))))throw new Error('Bounded evidence references required');
 if(input.metadata&&(Object.keys(input.metadata).length>30||Object.entries(input.metadata).some(([k,v])=>!id(k)||!(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)||typeof v==='string'&&v.length<=1000))))throw new Error('Invalid bounded metadata');
}
export class TranscriptLedger {
 private readonly rows:LedgerEntry[]=[];
 constructor(readonly callId:string){if(!id(callId))throw new Error('Call ID required');}
 append(input:LedgerInput):LedgerEntry{
  validate(input);if(input.callId!==this.callId)throw new Error('Cross-call transcript rejected');
  if('sequenceNumber'in input)throw new Error('Sequence is allocated by this call ledger');
  const same=this.rows.find(e=>e.eventId===input.eventId);
  if(same){const {sequenceNumber:_,...previous}=same;void _;if(JSON.stringify(previous)!==JSON.stringify(input))throw new Error('Conflicting duplicate event');return structuredClone(same);}
  const final=this.rows.find(e=>e.eventType==='SPEECH_FINAL'&&e.sourceTurnId===input.sourceTurnId&&e.speaker===input.speaker);
  if(speech(input.eventType)&&final){if(input.eventType==='SPEECH_FINAL'&&input.sourceText===final.sourceText&&input.sourceLanguage===final.sourceLanguage)return structuredClone(final);throw new Error('Final source cannot be silently rewritten or followed by stale partial');}
  if(input.eventType==='TRANSLATION_EVENT'&&!this.rows.some(e=>e.eventType==='SPEECH_FINAL'&&e.sourceTurnId===input.sourceTurnId))throw new Error('Derived meaning requires an existing source final');
  if(playback(input.eventType)){
   const prior=this.rows.filter(e=>e.playbackId===input.playbackId&&playback(e.eventType));
   if(input.eventType==='ISABELLA_PLAYBACK_STARTED'?prior.length:prior.length!==1||prior[0].eventType!=='ISABELLA_PLAYBACK_STARTED')throw new Error('Playback terminal observation requires exactly one active start');
   if(prior[0]&&(prior[0].sourceText!==input.sourceText||prior[0].sourceLanguage!==input.sourceLanguage))throw new Error('Playback canonical text changed');
  }
  if(this.rows.length>=20000)throw new Error('Local transcript capacity reached');
  const next:LedgerEntry={...structuredClone(input),sequenceNumber:this.rows.length+1};this.rows.push(next);return structuredClone(next);
 }
 entries(){return structuredClone(this.rows);}
 export():TranscriptExport{return {schema:'c32-transcript-ledger-1',callId:this.callId,ordering:'callId+sequenceNumber',observationalOnly:true,productionConsent:false,sourceAudioStored:false,retention:'BUSINESS_DECISION_REQUIRED',entries:this.entries()};}
 static fromExport(value:TranscriptExport){
  if(!value||value.schema!=='c32-transcript-ledger-1'||value.ordering!=='callId+sequenceNumber'||value.observationalOnly!==true||value.productionConsent!==false||value.sourceAudioStored!==false||value.retention!=='BUSINESS_DECISION_REQUIRED'||!Array.isArray(value.entries)||value.entries.length>20000)throw new Error('Invalid observational export');
  const ledger=new TranscriptLedger(value.callId);
  for(const [index,row] of value.entries.entries()){
   const {sequenceNumber,...input}=row;if(sequenceNumber!==index+1)throw new Error('Non-monotonic export sequence');const added=ledger.append(input);if(added.sequenceNumber!==sequenceNumber)throw new Error('Duplicate speech in export');
  }return ledger;
 }
}
/** Contract only. No implementation or implicit browser/cloud persistence is installed. */
export interface FutureTranscriptStoragePort {save(snapshot:TranscriptExport,retentionAuthorization:string):Promise<void>;load(callId:string):Promise<TranscriptExport|null>}
