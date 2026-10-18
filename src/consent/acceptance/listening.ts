import type { LocalPlaybackEvent } from '../approved/localPlayback';
import { listeningCatalog, reviewKey, type ReviewAsset } from './catalog';
export type HumanDecision = 'HUMAN_LISTENING_APPROVED'|'HUMAN_LISTENING_REJECTED'|'NOT_REVIEWED';
export interface ListeningReview { key:string; phraseId:string; slot?:unknown; text:string; english?:string; textHash:string; audioHash:string; voice:ReviewAsset['voice']; requestedGain:number; effectiveGain?:number; peakProtectionEvents?:number; reviewer:string; decision:Exclude<HumanDecision,'NOT_REVIEWED'>; timestamp:string; note:string; playbackId:string; outputProof?:string; selfAttestedPhysicalListening:true }
export interface ListenOutput {key:string; event:LocalPlaybackEvent; at:number}
/** Local explicit human attestations. Never derived from playback completion. */
export class ListeningRegistry {
  outputs:ListenOutput[]=[]; reviews:ListeningReview[]=[];
  constructor(private persist?:()=>void){}
  observe(asset:ReviewAsset,event:LocalPlaybackEvent,at:number) {if(event.assetHash!==asset.assetHash||event.textHash!==asset.textHash||event.phraseId!==asset.phraseId)throw new Error('Listening output asset mismatch.');this.outputs.push({key:reviewKey(asset),event:structuredClone(event),at});this.persist?.();}
  decision(asset:ReviewAsset):HumanDecision {return this.reviews.filter(r=>r.key===reviewKey(asset)).at(-1)?.decision??'NOT_REVIEWED';}
  localCompleted(asset:ReviewAsset){return this.outputs.some(o=>o.key===reviewKey(asset)&&o.event.action==='complete'&&o.event.outputProof?.startsWith(`web-audio-source-ended:${o.event.playbackId}:`));}
  decide(asset:ReviewAsset,decision:Exclude<HumanDecision,'NOT_REVIEWED'>,reviewer:string,note:string,heard:boolean,english?:string){
    const key=reviewKey(asset),output=this.outputs.filter(o=>o.key===key).at(-1);
    if(!heard||!reviewer.trim()||!output||!['complete','interrupt'].includes(output.event.action)||decision==='HUMAN_LISTENING_APPROVED'&&(output.event.action!=='complete'||!output.event.outputProof?.startsWith(`web-audio-source-ended:${output.event.playbackId}:`))||decision==='HUMAN_LISTENING_REJECTED'&&!note.trim())throw new Error('Explicit reviewer/physical-listening attestation after output required; rejection needs a note.');
    if(!['HUMAN_LISTENING_APPROVED','HUMAN_LISTENING_REJECTED'].includes(decision))throw new Error('Invalid review decision.');
    const r:ListeningReview={key,phraseId:asset.phraseId,slot:'binding'in asset?asset.binding.slot:undefined,text:asset.text,english,textHash:asset.textHash,audioHash:asset.assetHash,voice:asset.voice,requestedGain:3.5573605757216837,effectiveGain:output.event.gain?.gainApplied,peakProtectionEvents:output.event.gain?.peakProtectionEvents,reviewer:reviewer.trim(),decision,timestamp:new Date().toISOString(),note,playbackId:output.event.playbackId,outputProof:output.event.outputProof,selfAttestedPhysicalListening:true};this.reviews.push(r);this.persist?.();return r;
  }
  /** Necessary listening gate only. This never authorizes deployment/telephony. */
  futureProductionListeningEligible(asset:ReviewAsset){return this.decision(asset)==='HUMAN_LISTENING_APPROVED'&&this.localCompleted(asset);}
  assertRehearsalAllowed(asset:ReviewAsset){if(this.decision(asset)==='HUMAN_LISTENING_REJECTED')throw new Error('Human-rejected audio blocked from call rehearsal/production. Use isolated QA Replay to review remediation; no regeneration.');}
  restore(raw:unknown){
    if(!raw||typeof raw!=='object')throw new Error('Invalid listening archive.');const x=raw as {outputs?:ListenOutput[];reviews?:ListeningReview[]};
    if(!Array.isArray(x.outputs)||!Array.isArray(x.reviews)||x.outputs.length>3000||x.reviews.length>2000)throw new Error('Invalid/bounded review archive required.');
    for(const r of x.reviews){const a=listeningCatalog.find(a=>reviewKey(a)===r.key);if(!a||r.audioHash!==a.assetHash||r.textHash!==a.textHash||r.text!==a.text||!r.reviewer?.trim()||!r.timestamp||r.selfAttestedPhysicalListening!==true||!['HUMAN_LISTENING_APPROVED','HUMAN_LISTENING_REJECTED'].includes(r.decision)||!x.outputs.some(o=>o.key===r.key&&o.event.playbackId===r.playbackId&&o.event.assetHash===a.assetHash&&o.event.textHash===a.textHash&&o.event.action===(r.decision==='HUMAN_LISTENING_APPROVED'?'complete':o.event.action)&& (r.decision!=='HUMAN_LISTENING_APPROVED'||o.event.outputProof===r.outputProof&&!!r.outputProof?.startsWith(`web-audio-source-ended:${r.playbackId}:`))))throw new Error('Invalid/stale human review binding.');}
    this.outputs=structuredClone(x.outputs);this.reviews=structuredClone(x.reviews);
  }
  export(){return structuredClone({outputs:this.outputs,reviews:this.reviews,productionEnabled:false,identityAssurance:'LOCAL_SELF_ATTESTATION_NOT_AUTHENTICATED'});}
}
export const qualityChecks=['Natural Danish voice','Static phrase understandable','Email letters and separators understandable','Numbers / uppercase cue','Name pronunciation','Sentence joins','Static/dynamic volume consistency','No clipping, distortion or unnatural silence','Suitable for a short business call'] as const;
export function remediation(a:ReviewAsset){return {phraseId:a.phraseId,text:a.text,audioHash:a.assetHash,recommendation:'Retain original bytes. Review rejection note, Danish pronunciation/wording and gain evidence. Obtain explicit authorization before any replacement generation; replacement requires new hashes and fresh human review.',regenerateAutomatically:false};}
