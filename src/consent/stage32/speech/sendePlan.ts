/** Two explicitly requested synthesis-only respellings. Never an ASR or canonical-text rule. */
import {candidates,type C32Candidate} from './candidates';
import {assetVoice,bytesHash,decodeWave} from '../../approved/assets';
import {deliveryGain} from '../../../streaming/deliveryGain';
import {textHash} from '../../wording';
export const sendeVersion='stage-2.0c32-sende-correction-1';
export const sendeIds=['why-calling','clarify'] as const;
export const sendeFeedbackHash='d3a2804f8c9b47a0dceb33657d1eed62b80ae74084109a709fd4e7c81ca71084';
const previousHashes={ 'why-calling':'b2d46752a12b82aedce1b19be0681e536eaaa26b382d1f3a28edfa4258cff2ff',clarify:'55e255476384ad077184102aedf4dcfecdeb865974e3346ab2cadefcb292f420'};
export async function sendePlans(){return Promise.all(sendeIds.map(async id=>{
 const old=candidates.find(a=>a.phraseId===id);if(!old||old.assetHash!==previousHashes[id]||(old.spokenText.match(/\bsende\b/gu)??[]).length!==1||old.spokenText.includes('senne'))throw new Error('Exact pre-correction asset required');
 const synthesisText=old.spokenText.replace(/\bsende\b/u,'senne');
 const plan={phraseId:id,canonicalText:old.text,canonicalTextHash:old.textHash,canonicalVersion:sendeVersion,synthesisText,previousAssetHash:old.assetHash,version:sendeVersion,feedbackHash:sendeFeedbackHash,reviewer:'Humza',requestedRendering:{source:'sende',rendered:'senne',scope:'ONLY_THIS_EXACT_PHRASE'},voice:assetVoice};
 return {...plan,planHash:await textHash(JSON.stringify(plan)),characters:synthesisText.length};
 }));}
export type SendePlan=Awaited<ReturnType<typeof sendePlans>>[number];
export async function validateSendePlan(plan:SendePlan){const expected=(await sendePlans()).find(p=>p.phraseId===plan.phraseId);if(!expected||JSON.stringify(plan)!==JSON.stringify(expected)||await textHash(plan.canonicalText)!==plan.canonicalTextHash||plan.canonicalText.includes('senne')||plan.synthesisText.replace(/\bsenne\b/u,'sende')!==candidates.find(a=>a.phraseId===plan.phraseId)!.spokenText)throw new Error('Only exact canonical-preserving sende respelling is allowed');}
export async function verifySendeBinding(a:C32Candidate,bytes:Uint8Array<ArrayBuffer>){
 const plan=(await sendePlans()).find(p=>p.phraseId===a.phraseId);if(!plan)throw new Error('Unsupported correction phrase');await validateSendePlan(plan);
 if(a.text!==plan.canonicalText||a.textHash!==plan.canonicalTextHash||a.wordingVersion!==sendeVersion||a.spokenText!==plan.synthesisText||a.spokenTextHash!==await textHash(plan.synthesisText)||a.planHash!==plan.planHash||a.synthesisVersion!==sendeVersion||a.replacesAudioHash!==plan.previousAssetHash||a.assetHash===plan.previousAssetHash||a.path!==`/audio/consent-stage20c32/${a.assetHash}.wav`||JSON.stringify(a.voice)!==JSON.stringify(assetVoice)||a.requestedSpeed!==.95||a.sampleRate!==24000||a.mediaFormat!=='wav-pcm-s16le-mono'||a.humanReviewStatus!=='HUMAN_REVIEW_PENDING'||a.productionApproved!==false||!a.candidateWordingAuthorized||a.status!=='GENERATED_VERIFIED_LOCAL_ONLY'||!a.provenance.verified||!a.provenance.providerRequestId||a.provenance.endpoint!==`https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}`||a.provenance.settingsHash!==await textHash(JSON.stringify({speed:.95}))||await bytesHash(bytes)!==a.assetHash)throw new Error('Sende correction identity/provenance rejected');
 const pcm=decodeWave(bytes),gain=deliveryGain(pcm.samples.slice(),true);
 if(a.verification.clippingEvents!==0||pcm.clippingEvents||gain.clippingEvents||pcm.peak<.001||pcm.rms<.0001||pcm.samples.length!==a.samples||Math.abs(pcm.duration-a.duration)>1/24000||pcm.peak!==a.verification.rawPeak||gain.gainApplied!==a.verification.gainApplied||gain.peakProtectionEvents!==a.verification.peakProtectionEvents||Math.abs(gain.postGainPeak-a.verification.outputPeak)>1e-6||!a.verification.mediaValid||!a.verification.nonSilent)throw new Error('Sende correction PCM/gain rejected');
 return pcm;
}
