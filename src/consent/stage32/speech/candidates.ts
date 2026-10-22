import pack from './candidatePack.json';
import {currentCatalog} from '../../corrections/assets';
import {retestDefinition,qaResponse} from '../../corrections/retest';
import {assetVoice,bytesHash,decodeWave,type VerifiedAsset} from '../../approved/assets';
import {deliveryGain} from '../../../streaming/deliveryGain';
import {textHash} from '../../wording';
import {canonicalPhrase,makePlan,validateNewBinding,validatePlan,type SynthesisPlan} from './plans';
import {LocalPrerecordedPlayback,type LocalAudioContext,type LocalPlaybackEvent} from '../../approved/localPlayback';
import type {PlaybackRecord,ResponseClip} from '../../types';

export const candidateVersion='stage-2.0c32-candidate-1';
export const successCloseText='Perfekt, mange tak for din tid. Du kan altid sige fra, hvis du ikke længere ønsker at modtage informationen. Hav en god dag.';
export const candidateIds=['why-calling','success-close','clarify'] as const;
export const clarifyVersion='stage-2.0c32-clarify-ab-1';
export const candidateVersionFor=(id:string)=>id==='clarify'?clarifyVersion:candidateVersion;
export interface C32Candidate extends VerifiedAsset {
  spokenText:string;spokenTextHash:string;planHash:string;synthesisVersion:string;
  replacesAudioHash:string;humanReviewStatus:'HUMAN_REVIEW_PENDING';candidateWordingAuthorized:true;
}
export const candidates=pack as C32Candidate[];

export async function candidatePlans():Promise<SynthesisPlan[]> {
  return Promise.all(candidateIds.map(async id=>{
    const response=retestDefinition.responses.find(r=>r.id===id);
    if(!response)throw new Error('Missing C-3.2 phrase');
    const text=id==='success-close'?successCloseText:response.text;
    const canonical=await canonicalPhrase({...response,version:candidateVersionFor(id)},text);
    const plan=await makePlan(canonical,id==='why-calling'?'PUNCTUATION':'REFERENCE');
    await validatePlan(plan,canonical);
    if(id==='why-calling'&&(!plan.synthesisText.includes('sende dig')||text!==response.text))throw new Error('Why Calling canonical meaning changed');
    if(id==='success-close'&&plan.synthesisText!==successCloseText)throw new Error('Success Close wording changed');
    return plan;
  }));
}

export async function verifyCandidate(candidate:C32Candidate,bytes:Uint8Array<ArrayBuffer>):Promise<ReturnType<typeof decodeWave>> {
  const plan=(await candidatePlans()).find(p=>p.canonical.phraseId===candidate.phraseId);
  const historical=currentCatalog().find(a=>a.phraseId===candidate.phraseId&&!('binding'in a));
  const pinned=candidates.find(a=>a.phraseId===candidate.phraseId);
  if(!plan||!historical||!pinned||JSON.stringify(candidate)!==JSON.stringify(pinned)||candidates.length!==candidateIds.length||
    candidate.wordingVersion!==candidateVersionFor(candidate.phraseId)||candidate.text!==plan.canonical.canonicalText||
    candidate.textHash!==plan.canonical.canonicalTextHash||candidate.spokenText!==plan.synthesisText||
    candidate.spokenTextHash!==await textHash(plan.synthesisText)||candidate.planHash!==plan.synthesisHash||
    candidate.synthesisVersion!==plan.synthesisVersion||candidate.replacesAudioHash!==historical.assetHash||
    candidate.assetHash===historical.assetHash||candidate.path!==`/audio/consent-stage20c32/${candidate.assetHash}.wav`||
    JSON.stringify(candidate.voice)!==JSON.stringify(assetVoice)||candidate.requestedSpeed!==.95||
    !candidate.provenance.verified||!candidate.provenance.providerRequestId||
    candidate.provenance.endpoint!==`https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}`||
    !/^[a-f0-9]{64}$/u.test(candidate.provenance.settingsHash)||
    candidate.humanReviewStatus!=='HUMAN_REVIEW_PENDING'||!candidate.candidateWordingAuthorized||
    candidate.productionApproved!==false||candidate.status!=='GENERATED_VERIFIED_LOCAL_ONLY'||
    !candidate.verification.mediaValid||!candidate.verification.nonSilent||
    await bytesHash(bytes)!==candidate.assetHash)throw new Error('C-3.2 candidate binding rejected');
  await validateNewBinding(plan,{canonicalTextHash:candidate.textHash,synthesisHash:candidate.planHash,synthesisVersion:candidate.synthesisVersion,voice:candidate.voice,assetHash:candidate.assetHash,humanListeningStatus:'NOT_REVIEWED'},[historical.assetHash],plan.canonical);
  const decoded=decodeWave(bytes),gain=deliveryGain(decoded.samples.slice(),true);
  if(decoded.clippingEvents||gain.clippingEvents||decoded.peak<.001||decoded.rms<.0001||
    decoded.samples.length!==candidate.samples||Math.abs(decoded.duration-candidate.duration)>1/24000||
    decoded.peak!==candidate.verification.rawPeak||gain.gainApplied!==candidate.verification.gainApplied||
    gain.peakProtectionEvents!==candidate.verification.peakProtectionEvents||
    Math.abs(gain.postGainPeak-candidate.verification.outputPeak)>1e-6)throw new Error('C-3.2 media/gain verification failed');
  return decoded;
}

export function candidateCatalog(){
  if(candidates.length!==candidateIds.length||new Set(candidates.map(a=>a.phraseId)).size!==candidateIds.length||candidateIds.some(id=>!candidates.some(a=>a.phraseId===id)))throw new Error('Exactly three C-3.2 candidates required');
  return currentCatalog().map(historical=>candidates.find(a=>a.phraseId===historical.phraseId)??historical);
}

export class C32CandidatePlayback extends LocalPrerecordedPlayback {
  constructor(makeContext?:()=>LocalAudioContext){
    super(candidates,async(path,signal)=>{
      if(!candidates.some(a=>a.path===path)||!/^\/audio\/consent-stage20c32\/[a-f0-9]{64}\.wav$/u.test(path))throw new Error('Unbound C-3.2 media path');
      const response=await fetch(path,{signal,cache:'no-store'});
      if(!response.ok)throw new Error('C-3.2 local media unavailable');
      return response.arrayBuffer();
    },makeContext,async(a,bytes)=>verifyCandidate(a as C32Candidate,bytes));
  }
  override async play(response:ResponseClip,record:PlaybackRecord,emit:(event:LocalPlaybackEvent)=>void):Promise<void>{
    const candidate=candidates.find(a=>a.phraseId===response.id);
    if(!candidate||response.audio?.phraseVersion!==candidate.wordingVersion||record.phraseVersion!==candidate.wordingVersion||
      record.assetHash!==candidate.assetHash||record.assetId!==candidate.path)throw new Error('Exact C-3.2 version and asset required');
    return super.play(response,record,emit);
  }
}

export function candidateResponse(candidate:C32Candidate){
  const response=qaResponse(candidate);
  if(!response.audio)throw new Error('C-3.2 response has no audio binding');
  response.audio.phraseVersion=candidate.wordingVersion;
  return response;
}
