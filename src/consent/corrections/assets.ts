import pack from './assetPack.json';
import { listeningCatalog, type ReviewAsset } from '../acceptance/catalog';
import { verifyAsset, bytesHash, decodeWave, assetVoice, type VerifiedAsset } from '../approved/assets';
import { verifyDynamicAsset, type DynamicAsset, type SpeechBinding, type SpeechSlot } from '../dynamic/render';
import { textHash } from '../wording';
import { correctionSlot, correctionVersion, wordingChanges, spokenText } from './render';
export interface CorrectionAsset extends VerifiedAsset {spokenText:string;spokenTextHash:string;candidateWordingAuthorized:true;replacesAudioHash:string;binding?:SpeechBinding}
export const replacements=pack as unknown as CorrectionAsset[];
export const requiredReplacements=(a:ReviewAsset)=>('binding'in a?a.binding.slot.kind==='EMAIL'||a.phraseId==='receptionist-target-request':['refusal-close','stop-contact-close','unsubscribe','explanation','why-calling','consent-question'].includes(a.phraseId));
export function identity(a:VerifiedAsset){return a.phraseId+':'+a.textHash+':'+a.assetHash;}
export function currentCatalog():ReviewAsset[]{return listeningCatalog.map(old=>{if(!requiredReplacements(old))return old;const a=replacements.find(a=>a.replacesAudioHash===old.assetHash&&a.phraseId===old.phraseId);return (a??old)as ReviewAsset;});}
export async function replacementPlan(){return Promise.all(listeningCatalog.filter(requiredReplacements).map(async old=>{const binding='binding'in old?await correctionSlot(old.binding.slot):undefined;const text=binding?.renderedText??wordingChanges[old.phraseId]?.text??old.text;const spoken=spokenText(text);return {old,text,spokenText:spoken,textHash:await textHash(text),spokenTextHash:await textHash(spoken),binding,version:correctionVersion};}));}
export async function verifyCorrection(a:VerifiedAsset,bytes:Uint8Array<ArrayBuffer>){
 const expected=replacements.find(x=>identity(x)===identity(a));
 if(!expected){if('binding'in a){await verifyDynamicAsset(a as DynamicAsset,bytes);return decodeWave(bytes);}return verifyAsset(a,bytes);}
 if(JSON.stringify(a)!==JSON.stringify(expected))throw new Error('Correction manifest identity differs from pinned candidate.');
 if(await textHash(expected.text)!==expected.textHash||await textHash(expected.spokenText)!==expected.spokenTextHash||expected.spokenText!==spokenText(expected.text)||await bytesHash(bytes)!==expected.assetHash||JSON.stringify(expected.voice)!==JSON.stringify(assetVoice)||expected.requestedSpeed!==.95||!expected.candidateWordingAuthorized||expected.productionApproved||!expected.provenance.verified||!expected.provenance.providerRequestId||expected.provenance.endpoint!==`https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}`||expected.wordingVersion!==correctionVersion)throw new Error('Correction text/voice/provenance rejected.');
 const d=decodeWave(bytes);if(d.clippingEvents||d.peak<.001||d.rms<.0001||d.samples.length!==a.samples||Math.abs(d.duration-a.duration)>1/24000)throw new Error('Correction media invalid.');return d;
}
export async function verifyCorrectionDynamic(a:DynamicAsset){const binding=await correctionSlot(a.binding.slot);const match=replacements.find(x=>x.binding?.cacheKey===binding.cacheKey);if(!match)return verifyDynamicAsset(a);if(a.assetHash!==match.assetHash||a.textHash!==match.textHash||a.text!==match.text||a.wordingVersion!==match.wordingVersion||JSON.stringify(a.voice)!==JSON.stringify(assetVoice)||JSON.stringify(binding)!==JSON.stringify(a.binding))throw new Error('Correction dynamic binding rejected.');return binding;}
export async function prepareCorrection(slot:SpeechSlot,signal:AbortSignal):Promise<DynamicAsset>{signal.throwIfAborted();const b=await correctionSlot(slot);const all=[...replacements,...listeningCatalog.filter(a=>'binding'in a)];const a=all.find(a=>'binding'in a&&a.binding?.cacheKey===b.cacheKey);if(!a)throw new Error('Exact C-3.1 cached asset missing; no TTS during retest.');return {...structuredClone(a),binding:b}as DynamicAsset;}
