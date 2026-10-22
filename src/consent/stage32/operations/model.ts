import {TranscriptLedger,type LedgerInput} from './ledger';
import {currentC32Asset} from '../speech/current';
export const sections=['Dashboard','Calls','Active Call','Transcripts','Contacts / Resolution','Review','Diagnostics','Settings'] as const;
export type Section=typeof sections[number];
export const degradedStates=['ASR unavailable','TTS/audio unavailable','Telephone transport unavailable','Database unavailable','Model advisory unavailable','Ambiguous email','Consent unclear','Wrong recipient','Authority unresolved','Human takeover required','Unexpected system error'] as const;
export interface TakeoverContext {callId:string;recipient:string|null;transcript:ReturnType<TranscriptLedger['export']>;consentState:string;emailState:string;reason:string;lastIsabellaAction:string|null;lastClinicUtterance:string|null}
/** Future transport implementation must supply these methods; no implementation is provided here. */
export interface FutureCallControlPort {beginTakeover(context:TakeoverContext):Promise<void>;completeTakeover(callId:string):Promise<void>;returnToAutomation(callId:string,policyAuthorization:string):Promise<void>;endCall(callId:string):Promise<void>}
export interface OperatorView {source:'NOT_CONNECTED'|'LOCAL_EVALUATION';callId:string|null;recipient:string|null;telephone:string|null;durationSeconds:number|null;isabella:'NOT_CONNECTED'|'LISTENING'|'SPEAKING'|'WAITING'|'HUMAN_TAKEOVER';phrase:string|null;recipientVerified:boolean|null;authority:string;question:string;consent:string;reviewed:boolean|null;rawEmail:string|null;reconstructed:string|null;database:string;resolution:string;confirmation:string;takeoverReason:string|null;ledger:TranscriptLedger|null}
export function disconnectedView():OperatorView{return {source:'NOT_CONNECTED',callId:null,recipient:null,telephone:null,durationSeconds:null,isabella:'NOT_CONNECTED',phrase:null,recipientVerified:null,authority:'UNRESOLVED',question:'NOT DELIVERED',consent:'NO DECISION',reviewed:null,rawEmail:null,reconstructed:null,database:'NOT CONNECTED',resolution:'INSUFFICIENT',confirmation:'PENDING',takeoverReason:null,ledger:null};}
/** Explicit opt-in local fixture, not production statistics, microphone capture or consent evidence. */
export function evaluationView():OperatorView {
 const ledger=new TranscriptLedger('local-evaluation:transcript-example');let index=0;
 const append=(e:Omit<LedgerInput,'eventId'|'callId'|'timestamp'|'monotonicTimestamp'|'evidenceClassification'>,at:number)=>ledger.append({...e,eventId:'example-'+(++index),callId:ledger.callId,timestamp:new Date(Date.UTC(2026,0,1)+at).toISOString(),monotonicTimestamp:at,evidenceClassification:'LOCAL_EVALUATION'});
 const opening=currentC32Asset('opening'),why=currentC32Asset('why-calling'),openingEnd=opening.duration*1000;
 const play=(a:typeof opening,at:number)=>{const playbackId='example:'+a.phraseId;append({speaker:'ISABELLA',eventType:'ISABELLA_PLAYBACK_STARTED',sourceText:a.text,sourceLanguage:'da',playbackId,metadata:{phraseId:a.phraseId,assetHash:a.assetHash,phraseVersion:a.wordingVersion}},at);append({speaker:'ISABELLA',eventType:'ISABELLA_PLAYBACK_COMPLETED',sourceText:a.text,sourceLanguage:'da',playbackId},at+a.duration*1000);};
 play(opening,0);
 append({speaker:'CLINIC',eventType:'SPEECH_PARTIAL',sourceLanguage:'da',sourceText:'Ja, hvad',sourceTurnId:'example:turn-1',asrFinal:false},openingEnd+500);
 append({speaker:'CLINIC',eventType:'SPEECH_FINAL',sourceLanguage:'da',sourceText:'Ja, hvad drejer det sig om?',sourceTurnId:'example:turn-1',asrFinal:true,translatedLanguage:'en',translatedText:'Yes, what is this about?',translationStatus:'DERIVED'},openingEnd+1200);
 const whyStart=openingEnd+2200,whyEnd=whyStart+why.duration*1000;play(why,whyStart);
 append({speaker:'SYSTEM',eventType:'CONSENT_EVENT',metadata:{message:'No reviewed consent. This is an observational local example only.'}},whyEnd+500);
 append({speaker:'CLINIC',eventType:'SPEECH_FINAL',sourceLanguage:'da',sourceText:'info snabel-a klinik punktum dk',sourceTurnId:'example:turn-2',asrFinal:true},whyEnd+3000);
 append({speaker:'SYSTEM',eventType:'EMAIL_EVENT',metadata:{message:'Synthetic email candidate reconstructed; recipient confirmation required.'}},whyEnd+3100);
 return {...disconnectedView(),source:'LOCAL_EVALUATION',callId:ledger.callId,recipient:'Synthetic clinic · local example',isabella:'WAITING',rawEmail:'info snabel-a klinik punktum dk',reconstructed:'info@klinik.dk',database:'LOCAL SYNTHETIC MATCH',resolution:'VERY_STRONG · LOCAL EXAMPLE',ledger};
}
export function formatElapsed(ms:number){if(!Number.isFinite(ms)||ms<0)return '—';return `${Math.floor(ms/60000).toString().padStart(2,'0')}:${Math.floor(ms/1000%60).toString().padStart(2,'0')}.${Math.floor(ms%1000).toString().padStart(3,'0')}`;}
export function takeoverContext(v:OperatorView,reason:string):TakeoverContext|null{if(!v.callId||!v.ledger)return null;const entries=v.ledger.entries();return {callId:v.callId,recipient:v.recipient,transcript:v.ledger.export(),consentState:v.consent,emailState:v.confirmation,reason,lastIsabellaAction:entries.filter(e=>e.speaker==='ISABELLA').at(-1)?.eventType??null,lastClinicUtterance:entries.filter(e=>e.speaker==='CLINIC'&&e.eventType==='SPEECH_FINAL').at(-1)?.sourceText??null};}
