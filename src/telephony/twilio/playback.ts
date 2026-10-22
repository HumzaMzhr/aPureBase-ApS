import type {LocalPlaybackEvent,LocalPlaybackPort} from '../../consent/approved/localPlayback';
import type {PlaybackRecord,ResponseClip} from '../../consent/types';
import {currentC32Catalog} from '../../consent/stage32/speech/current';
import {verifySendeBinding,sendeVersion} from '../../consent/stage32/speech/sendePlan';
import {verifyCandidate,type C32Candidate,candidates} from '../../consent/stage32/speech/candidates';
import {verifyCorrection,prepareCorrection} from '../../consent/corrections/assets';
import type {DynamicAsset,SpeechSlot} from '../../consent/dynamic/render';
import type {VerifiedAsset} from '../../consent/approved/assets';
import {textHash} from '../../consent/wording';
import {wavToTelephone} from '../media';
import type {Clock,OutboundMediaStream,PlaybackCompletionEvidence} from '../types';
export type AssetLoader=(path:string,signal?:AbortSignal)=>Promise<Uint8Array<ArrayBuffer>>;
export async function verifyTelephoneAsset(a:VerifiedAsset,bytes:Uint8Array<ArrayBuffer>){if(a.wordingVersion===sendeVersion)return verifySendeBinding(a as C32Candidate,bytes);if(candidates.some(c=>c.assetHash===a.assetHash))return verifyCandidate(a as C32Candidate,bytes);return verifyCorrection(a,bytes);}
/** Marks prove the provider buffer boundary, never physical hearing. Registry is per call/stream. */
export class TelephonePlayback implements LocalPlaybackPort {
 readonly evidence:PlaybackCompletionEvidence[]=[];
 private proofs=new Map<string,PlaybackCompletionEvidence>();private assets=currentC32Catalog();private pending?:{record:PlaybackRecord;emit:(e:LocalPlaybackEvent)=>void;base:LocalPlaybackEvent;resolve:()=>void;mark?:string;frames:number;first:number;last:number;start:number;synthesis:string;cancelled:boolean;abort:AbortController;deadline:number};private sequence=0;private closed=false;
 readonly completionBoundary={mode:'telephone-prerecorded' as const,source:'VERIFIED_TELEPHONE_MARK' as const,accepts:(r:PlaybackRecord,proof:string|undefined)=>{const e=proof?this.proofs.get(proof):undefined;return !!e&&e.callId===r.callId&&e.streamId===this.streamId&&e.playbackId===r.playbackId&&e.phraseId===r.phraseId&&e.phraseVersion===r.phraseVersion&&e.canonicalTextHash===r.textHash&&e.assetHash===r.assetHash&&e.recipientRevision===r.recipientRevision;}};
 constructor(readonly callId:string,readonly streamId:string,private stream:OutboundMediaStream,private load:AssetLoader,private clock:Clock,private observe:(r:PlaybackRecord,e:LocalPlaybackEvent)=>void=()=>{}){}
 prepare(slot:SpeechSlot,signal:AbortSignal){if(slot.kind==='EMAIL')throw new Error('No full-email telephone TTS');return prepareCorrection(slot,signal);}
 register(a:DynamicAsset){if(a.binding.slot.kind!=='NAME'||!currentC32Catalog().some(c=>c.assetHash===a.assetHash))throw new Error('Only exact cached name allowed');this.assets.push(a);}
 get activeMark(){return this.pending?.mark;}
 get activePlaybackId(){return this.pending?.record.playbackId;}
 private emit(p:NonNullable<TelephonePlayback['pending']>,action:LocalPlaybackEvent['action'],extra:Partial<LocalPlaybackEvent>={}){const e={...p.base,...extra,action};if(action==='fail'){p.emit(e);this.observe(p.record,e);}else{this.observe(p.record,e);p.emit(e);}}
 async play(response:ResponseClip,r:PlaybackRecord,emit:(e:LocalPlaybackEvent)=>void){
  if(this.closed||r.callId!==this.callId)throw new Error('Inactive/cross-call output');this.cancel();
  const a=this.assets.find(a=>a.phraseId===response.id&&a.assetHash===response.audio?.sha256&&a.textHash===response.audio?.textHash&&a.wordingVersion===response.version);
  if(!a||a.text!==response.text||r.assetHash!==null&&r.assetHash!==a.assetHash||r.textHash!==a.textHash||r.phraseId!==a.phraseId||r.phraseVersion!==a.wordingVersion||response.approval!=='business-authorized'||a.phraseId.includes('readback')||('binding'in a&&a.binding.slot.kind==='EMAIL'))throw new Error('Unbound/diagnostic telephone speech blocked');
  let resolve=()=>{};const done=new Promise<void>(f=>{resolve=f;});const p={record:{...structuredClone(r),assetHash:a.assetHash},emit,base:{action:'start' as const,callId:r.callId,playbackId:r.playbackId,phraseId:r.phraseId,phraseVersion:r.phraseVersion,textHash:a.textHash,assetHash:a.assetHash,recipientRevision:r.recipientRevision},resolve,frames:0,first:0,last:0,start:this.clock.now(),synthesis:'',cancelled:false,abort:new AbortController(),deadline:Infinity,mark:undefined as string|undefined};this.pending=p;
  try{const bytes=await Promise.race([this.load(a.path,p.abort.signal),done.then(()=>null)]);if(!bytes||p.cancelled)return;await verifyTelephoneAsset(a,bytes);const converted=await wavToTelephone(bytes,a.assetHash);p.synthesis=await textHash('spokenText'in a?String(a.spokenText):a.text);if(p.cancelled||this.closed)return;
   p.start=this.clock.now();p.deadline=p.start+converted.durationMs+30000;this.emit(p,'start',{gain:converted.gain});
   for(const frame of converted.frames){if(p.cancelled)return;const seq=++this.sequence;if(!p.first)p.first=seq;p.last=seq;this.stream.send({event:'media',streamSid:this.streamId,media:{payload:frame.payload}});p.frames++;}
   p.mark='d1:'+crypto.randomUUID();this.stream.send({event:'mark',streamSid:this.streamId,mark:{name:p.mark}});await done;
  }catch(e){if(p.cancelled)return;if(!p.cancelled){p.cancelled=true;this.emit(p,'fail',{error:'Telephone output failed'});p.resolve();}throw e;}finally{if(this.pending===p)this.pending=undefined;}
 }
 mark(name:string,sequence:number,streamId:string){const p=this.pending;if(this.closed||!p||p.cancelled||p.mark!==name||streamId!==this.streamId||!p.frames)return false;const proof='twilio-mark-boundary:'+crypto.randomUUID();const e:PlaybackCompletionEvidence={kind:'TWILIO_MARK_BOUNDARY',callId:this.callId,streamId,playbackId:p.record.playbackId,phraseId:p.record.phraseId,phraseVersion:p.record.phraseVersion,canonicalTextHash:p.record.textHash!,synthesisTextHash:p.synthesis,assetHash:p.record.assetHash!,recipientRevision:p.record.recipientRevision,markName:name,markSequence:sequence,submittedFrames:p.frames,firstOutboundSequence:p.first,lastOutboundSequence:p.last,startedAt:p.start,completedAt:this.clock.now(),physicalHearingProven:false,proof};this.proofs.set(proof,e);this.evidence.push(e);p.cancelled=true;this.pending=undefined;try{this.emit(p,'complete',{outputProof:proof});}finally{p.resolve();}return true;}
 cancel(){const p=this.pending;if(!p||p.cancelled)return;p.cancelled=true;p.abort.abort();this.pending=undefined;try{this.emit(p,'interrupt');}finally{try{this.stream.send({event:'clear',streamSid:this.streamId});}catch{this.emit(p,'fail',{error:'CLEAR_SEND_FAILED'});}finally{p.resolve();}}}
 expire(){const p=this.pending;if(!p||p.cancelled||this.clock.now()<=p.deadline)return false;p.cancelled=true;p.abort.abort();this.pending=undefined;try{this.emit(p,'fail',{error:'PROVIDER_MARK_TIMEOUT'});}finally{p.resolve();}return true;}
 shutdown(){if(this.closed)return;this.cancel();this.closed=true;this.stream.close();}
}
