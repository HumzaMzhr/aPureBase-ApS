import {TranscriptLedger,type LedgerInput} from '../consent/stage32/operations/ledger';
import type {Clock} from './types';
import type {Transcript,PlaybackRecord} from '../consent/types';
import type {LocalPlaybackEvent} from '../consent/approved/localPlayback';
import {currentC32Catalog} from '../consent/stage32/speech/current';
export class CallTranscript {
 readonly ledger:TranscriptLedger;private index=0;private closed=false;private finals=new Set<string>();private starts=new Set<string>();
 constructor(readonly callId:string,private clock:Clock){this.ledger=new TranscriptLedger(callId);}
 append(input:Omit<LedgerInput,'callId'|'eventId'|'timestamp'|'monotonicTimestamp'|'evidenceClassification'>){if(this.closed)return;return this.ledger.append({...input,callId:this.callId,eventId:this.callId+':'+(++this.index),timestamp:this.clock.wall(),monotonicTimestamp:this.clock.now(),evidenceClassification:input.eventType==='TRANSLATION_EVENT'?'DERIVED':'LOCAL_EVALUATION'});}
 system(eventType:LedgerInput['eventType'],message:string){this.append({speaker:'SYSTEM',eventType,metadata:{message}});}
 close(){this.closed=true;}
 speech(t:Transcript){if(this.closed)return;if(!t.text.trim()||this.finals.has(t.id))return;if(t.final)this.finals.add(t.id);this.append({speaker:'CLINIC',eventType:t.final?'SPEECH_FINAL':'SPEECH_PARTIAL',sourceLanguage:'da',sourceText:t.text,sourceTurnId:t.id,asrFinal:t.final,translationStatus:'NOT_REQUESTED',metadata:{answerPlaybackId:t.answerPlaybackId??null,speechStartedAt:t.speechStartedAt??null,providerItemId:t.providerItemId??null}});}
 meaning(turnId:string,text:string|null){if(this.closed)return;if(text)this.append({speaker:'SYSTEM',eventType:'TRANSLATION_EVENT',sourceTurnId:turnId,translatedLanguage:'en',translatedText:text,translationStatus:'DERIVED',metadata:{message:'English meaning is derived assistance only'}});else this.system('ERROR_EVENT','English meaning unavailable; Danish source retained');}
 playback(r:PlaybackRecord,e:LocalPlaybackEvent){const a=currentC32Catalog().find(a=>a.assetHash===r.assetHash);if(!a)throw new Error('Unknown canonical asset');if(e.action==='start'){this.starts.add(r.playbackId);}else if(!this.starts.has(r.playbackId))return;
  this.append({speaker:e.action==='fail'?'SYSTEM':'ISABELLA',eventType:e.action==='start'?'ISABELLA_PLAYBACK_STARTED':e.action==='complete'?'ISABELLA_PLAYBACK_COMPLETED':e.action==='interrupt'?'ISABELLA_PLAYBACK_INTERRUPTED':'ERROR_EVENT',...(e.action==='fail'?{}:{sourceText:a.text,sourceLanguage:'da',playbackId:r.playbackId}),metadata:{phraseId:r.phraseId,assetHash:a.assetHash,phraseVersion:r.phraseVersion,completionSource:e.action==='complete'?'TWILIO_MARK_BOUNDARY':null,physicalHearingProven:false,message:e.action==='fail'?'Output failed':'Telephone '+e.action}});
 }
}
