import {assertDanishVoice,type VoiceIdentity} from './voiceIdentity';

export interface PcmEnvelope {sequence:number;sampleStart:number;sampleEnd:number;requestId:string}
export interface PcmReceipt extends PcmEnvelope {provider:string;voiceId:string;modelId:string;origin:string;source:VerifiedPcmSource}
const receipts=new WeakMap<Uint8Array,{receipt:PcmReceipt;copy:Uint8Array;consumed:boolean}>();
/** Created at a verified transport boundary, never from renderer configuration.
 * A receipt binds actual bytes to one request and one ordered provider stream. */
export class VerifiedPcmSource {
 readonly voice:Readonly<VoiceIdentity>;private sequence=0;private samples=0;private sealed=false;revoked=false;
 constructor(voice:VoiceIdentity,readonly origin:'elevenlabs-ws'|'elevenlabs-http'|'verified-cache'|'ordered-peer'){
  assertDanishVoice(voice);if(typeof voice.requestId!=='string'||!/^[a-zA-Z0-9_.:-]{1,160}$/.test(voice.requestId))throw new Error('PCM provenance requires a request identity.');this.voice=Object.freeze({...voice});
 }
 accept(bytes:Uint8Array,envelope:PcmEnvelope={requestId:this.voice.requestId!,sequence:this.sequence,sampleStart:this.samples,sampleEnd:this.samples+bytes.length/2}){
  if(this.sealed||this.revoked)throw new Error('PCM provenance source is closed.');
  if(!bytes.length||bytes.length%2||envelope.requestId!==this.voice.requestId||envelope.sequence!==this.sequence||envelope.sampleStart!==this.samples||envelope.sampleEnd!==this.samples+bytes.length/2)throw new Error('PCM provenance sequence, range or request mismatch.');
  if(receipts.has(bytes))throw new Error('PCM block already has provenance.');
  const receipt={...envelope,provider:this.voice.provider,voiceId:this.voice.voiceId,modelId:this.voice.modelId,origin:this.origin,source:this};
  receipts.set(bytes,{receipt,copy:bytes.slice(),consumed:false});this.sequence++;this.samples=envelope.sampleEnd;return bytes;
 }
 seal(){this.sealed=true;} // Normal EOS retains receipts already queued for the final flush.
 cancel(){this.sealed=true;this.revoked=true;}
}
export function inspectPcm(bytes:Uint8Array,voice?:VoiceIdentity,consume=false):PcmReceipt{
 const entry=receipts.get(bytes);if(!entry||entry.consumed||entry.receipt.source.revoked)throw new Error('Unverified or stale PCM provenance. No audio is allowed.');
 const r=entry.receipt;assertDanishVoice(voice,r);
 if(voice.requestId!==r.requestId||entry.copy.length!==bytes.length||bytes.some((byte,n)=>byte!==entry.copy[n]))throw new Error('PCM bytes or request provenance changed.');
 if(consume)entry.consumed=true;return r;
}
export async function verifyCachedAudio(bytes:ArrayBuffer,voice:VoiceIdentity&{audioSha256?:string}){
 assertDanishVoice(voice);if(!voice.audioSha256||!/^[a-f0-9]{64}$/.test(voice.audioSha256))throw new Error('Cached audio has no generation-time content provenance. No audio is allowed.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
 if(hash!==voice.audioSha256)throw new Error('Cached audio content provenance mismatch.');
}
export interface VoiceProvenanceSummary {audiblePCMBlocks:number;verifiedIsabellaPCMBlocks:number;unverifiedPCMBlocks:number;alternateVoicePCMBlocks:number}
export const emptyVoiceProvenance=():VoiceProvenanceSummary=>({audiblePCMBlocks:0,verifiedIsabellaPCMBlocks:0,unverifiedPCMBlocks:0,alternateVoicePCMBlocks:0});
