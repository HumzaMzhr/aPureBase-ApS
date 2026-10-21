import {retestDefinition,retestPlaybackCatalog} from '../../corrections/retest';
import {spokenText} from '../../corrections/render';
import {assetVoice} from '../../approved/assets';
import {textHash} from '../../wording';
import type {ResponseClip} from '../../types';

export type ListeningStatus='NOT_REVIEWED'|'PASS'|'PASS_WITH_NOTE'|'FAIL_PRONUNCIATION'|'FAIL_PROSODY'|'FAIL_NATURALNESS'|'REGENERATE'|'HUMAN_TAKEOVER_ONLY';
export interface CanonicalPhrase {phraseId:string;canonicalText:string;canonicalTextHash:string;wordingVersion:string;consentScope:string|null;recipientTypes:readonly string[];consentCritical:boolean;template:boolean}
export interface ProsodyProfile {connectedSpeech:string;reduction:string;weakConsonants:string;softD:string;stress:string;rhythm:string;tempo:string;intonation:'QUESTION'|'STATEMENT'|'MIXED';sentenceFinal:string}
export interface PhraseSegment {text:string;pauseAfterMs:number|null;boundaryReason:string}
export interface PronunciationOverride {source:string;rendered:string;mechanism:'ALIAS';authorization:'EXISTING_C31_ORGANIZATION_RENDERING'}
export interface SynthesisPlan {canonical:CanonicalPhrase;synthesisVersion:string;synthesisText:string;segments:PhraseSegment[];overrides:PronunciationOverride[];prosody:ProsodyProfile;voice:typeof assetVoice;synthesisHash:string;strategy:('PUNCTUATION'|'SEGMENTATION'|'HINT'|'ATOMIC_UNITS'|'PROVIDER_FEATURE'|'NO_CHANGE'|'HUMAN_REVIEW')[];generatedAssetHash:string|null;assetOrigin:'UNGENERATED'|'RETAINED_HISTORICAL_REFERENCE';humanListeningStatus:ListeningStatus;expectedDurationSeconds:number|null;durationEvidence:'UNKNOWN_UNGENERATED'|'HISTORICAL_FILE_CONTENT';regressionIds:string[];risk:string}
export const providerCapabilities={model:'eleven_flash_v2_5',danishDictionaryPhonemes:false,aliases:true,ssmlPhonemes:false,requestTextContext:true,checkedOn:'2026-10-21',source:'https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/pronunciation-dictionaries',note:'Non-English phonemes require a different model; changing model is not authorized. Alias support does not prove Danish pronunciation.'} as const;
export const pronunciationRegressions=[{id:'why-calling:sende-dig',phraseId:'why-calling',canonicalSpan:'sende dig',reportedBy:'Asem Raza Shareef',reportedPerception:'sente dej',intendedApproximatePerception:'sene dej',renderingInstruction:false,mandatory:true,status:'HUMAN_RETEST_REQUIRED',source:'Current C-3.2 user request; not a new physical run'}] as const;
const criticized=new Set(['why-calling','consent-question','refusal-close','stop-contact-close','unsubscribe','explanation','receptionist-target-request','email-readback-intro','success-close']);
const semanticTokens=(s:string)=>s.replaceAll('a Pure Base','aPureBase').normalize('NFC').match(/[\p{L}\p{N}@_+\-[\]]+/gu)??[];
const profile=(text:string):ProsodyProfile=>({connectedSpeech:'Review function-word joins and sende dig where present; metadata only',reduction:'Review unstressed endings and function words; no forced phonetic substitutions',weakConsonants:'Review silent/weak consonants with native listener',softD:'Review Danish soft-d where present; no unsupported phoneme tags',stress:'Review faglig, relevant, information, sundhedsperson and compound stress where present',rhythm:'Conversational, hesitation-free; inspect joins, no artificial buffering',tempo:'Keep requested speed 0.95',intonation:text.includes('?')?(text.includes('.')?'MIXED':'QUESTION'):'STATEMENT',sentenceFinal:'Native listener assesses falling statement or appropriate question ending'});
export async function canonicalPhrase(r:ResponseClip,text=r.text,hash?:string):Promise<CanonicalPhrase>{return {phraseId:r.id,canonicalText:text,canonicalTextHash:hash??await textHash(text),wordingVersion:r.version,consentScope:r.consentScope??null,recipientTypes:[...(r.recipientTypes??[])],consentCritical:r.consentCritical,template:!!r.dynamicValues?.length&&text===r.text};}
export async function makePlan(canonical:CanonicalPhrase,variant:'REFERENCE'|'PUNCTUATION'|'SEGMENTATION'='REFERENCE',referenceText?:string):Promise<SynthesisPlan>{
 const rendering=variant==='REFERENCE'&&referenceText!==undefined?referenceText:spokenText(canonical.canonicalText);
 const synthesisText=variant==='PUNCTUATION'?rendering.replace(/,\s+(om|hvis)\b/gu,' $1'):rendering;
 const parts=variant==='SEGMENTATION'?synthesisText.split(/(?<=[.?])\s+/u):[synthesisText];
 const plan:Omit<SynthesisPlan,'synthesisHash'>={canonical:structuredClone(canonical),synthesisVersion:'stage-2.0c32-plan-1:'+variant,synthesisText,segments:parts.map(text=>({text,pauseAfterMs:null,boundaryReason:variant==='SEGMENTATION'?'Existing sentence boundary; pause not yet measured':'Continuous unit; provider-controlled natural pause'})),overrides:rendering!==canonical.canonicalText?[{source:'aPureBase',rendered:'a Pure Base',mechanism:'ALIAS',authorization:'EXISTING_C31_ORGANIZATION_RENDERING'}]:[],prosody:profile(synthesisText),voice:{...assetVoice},strategy:variant==='PUNCTUATION'?['PUNCTUATION','HUMAN_REVIEW']:variant==='SEGMENTATION'?['SEGMENTATION','ATOMIC_UNITS','HUMAN_REVIEW']:['NO_CHANGE','HUMAN_REVIEW'],generatedAssetHash:null,assetOrigin:'UNGENERATED',humanListeningStatus:'NOT_REVIEWED',expectedDurationSeconds:null,durationEvidence:'UNKNOWN_UNGENERATED',regressionIds:pronunciationRegressions.filter(r=>r.phraseId===canonical.phraseId).map(r=>r.id),risk:'Naturalness unproven; changed plan requires new authorized audio and fresh listening, joins may sound worse. Retained reference association is a review binding, not a new generation receipt.'};
 return {...plan,synthesisHash:await planHash(plan)};
}
async function planHash(plan:Omit<SynthesisPlan,'synthesisHash'>|SynthesisPlan){return textHash(JSON.stringify({canonical:plan.canonical,synthesisVersion:plan.synthesisVersion,synthesisText:plan.synthesisText,segments:plan.segments,overrides:plan.overrides,prosody:plan.prosody,voice:plan.voice,strategy:plan.strategy}));}
export async function validatePlan(plan:SynthesisPlan,expected:CanonicalPhrase){
 if(JSON.stringify(plan.canonical)!==JSON.stringify(expected)||await textHash(plan.canonical.canonicalText)!==plan.canonical.canonicalTextHash||JSON.stringify(semanticTokens(plan.synthesisText))!==JSON.stringify(semanticTokens(expected.canonicalText))||JSON.stringify(semanticTokens(plan.segments.map(s=>s.text).join(' ')))!==JSON.stringify(semanticTokens(expected.canonicalText))||JSON.stringify(plan.voice)!==JSON.stringify(assetVoice)||plan.synthesisHash!==await planHash(plan))throw new Error('Canonical/semantic/scope/recipient/rendering/voice identity mismatch');
 if(plan.overrides.some(o=>o.source!=='aPureBase'||o.rendered!=='a Pure Base'||o.mechanism!=='ALIAS'||o.authorization!=='EXISTING_C31_ORGANIZATION_RENDERING'))throw new Error('Unauthorized semantic/pronunciation override');
 if(plan.segments.some(s=>s.pauseAfterMs!==null&&(!Number.isFinite(s.pauseAfterMs)||s.pauseAfterMs<0||s.pauseAfterMs>500)))throw new Error('Unbounded rendering pause');
 if(/<\/?(?:phoneme|speak|prosody)\b/iu.test(plan.synthesisText))throw new Error('Unsupported provider pronunciation');
}
export interface PlannedAssetBinding {canonicalTextHash:string;synthesisHash:string;synthesisVersion:string;voice:typeof assetVoice;assetHash:string;humanListeningStatus:ListeningStatus}
export async function validateNewBinding(plan:SynthesisPlan,binding:PlannedAssetBinding,oldHashes:readonly string[],authority:CanonicalPhrase){
 await validatePlan(plan,authority);
 if(binding.canonicalTextHash!==plan.canonical.canonicalTextHash||binding.synthesisHash!==plan.synthesisHash||binding.synthesisVersion!==plan.synthesisVersion||JSON.stringify(binding.voice)!==JSON.stringify(plan.voice)||!/^[a-f0-9]{64}$/u.test(binding.assetHash)||oldHashes.includes(binding.assetHash))throw new Error('New rendering requires new exact binding/version/bytes; historical audio cannot be relabeled');
}
/** Preserve and review unchanged audio; never relabel its original generation receipt. */
export async function bindRetainedReference(plan:SynthesisPlan,authority:CanonicalPhrase,assetHash:string):Promise<SynthesisPlan>{
 const asset=retestPlaybackCatalog().find(a=>a.assetHash===assetHash&&a.phraseId===authority.phraseId&&a.textHash===authority.canonicalTextHash);
 if(!asset)throw new Error('Pinned historical reference required');
 const actual='spokenText'in asset?String(asset.spokenText):asset.text;
 const expected=await makePlan(authority,'REFERENCE',actual);
 await validatePlan(plan,authority);
 if(plan.synthesisHash!==expected.synthesisHash||!asset.provenance.verified)throw new Error('Changed synthesis cannot reuse historical reference');
 return {...structuredClone(plan),generatedAssetHash:assetHash,assetOrigin:'RETAINED_HISTORICAL_REFERENCE',humanListeningStatus:'NOT_REVIEWED',expectedDurationSeconds:asset.duration,durationEvidence:'HISTORICAL_FILE_CONTENT'};
}
export async function speechInventory(){
 const rows:{canonical:CanonicalPhrase;historicalAssetHash:string|null;historicalDurationSeconds:number|null;plans:SynthesisPlan[];likelyConcerns:string[]}[]=[];
 for(const r of retestDefinition.responses.filter(r=>r.deliveryType==='SPOKEN_CLIP')){
  const assets=retestPlaybackCatalog().filter(a=>a.phraseId===r.id);
  const variants:{text:string;hash:string;version:string;asset:string|null;duration:number|null;spoken?:string}[]=assets.length?assets.map(a=>({text:a.text,hash:a.textHash,version:a.wordingVersion,asset:a.assetHash,duration:a.duration,spoken:'spokenText'in a?String(a.spokenText):a.text})): [{text:r.text,hash:await textHash(r.text),version:r.version,asset:null,duration:null}];
  // Templates must also be reviewed; fixture coverage does not establish arbitrary-name pronunciation.
  if(r.dynamicValues?.length&&!variants.some(v=>v.text===r.text))variants.push({text:r.text,hash:await textHash(r.text),version:r.version,asset:null,duration:null});
  for(const v of variants){const c=await canonicalPhrase({...r,version:v.version},v.text,v.hash),reference=await makePlan(c,'REFERENCE',v.spoken),plans=[v.asset?await bindRetainedReference(reference,c,v.asset):reference];
   if(criticized.has(r.id)&&r.id!=='email-readback-intro'){
    const variant=await makePlan(c,r.id==='why-calling'?'PUNCTUATION':'SEGMENTATION');
    // Do not propose paid regeneration of a version-only/no-op variant.
    if(variant.synthesisText!==plans[0].synthesisText||JSON.stringify(variant.segments)!==JSON.stringify(plans[0].segments)&&variant.segments.length>1)plans.push(variant);
   }
   rows.push({canonical:c,historicalAssetHash:v.asset,historicalDurationSeconds:v.duration,plans,likelyConcerns:['Native Danish review required',...['aPureBase','e-mail','sundhedsperson','faglig','information','framelde','relevant','produkter','sygdomsområder'].filter(w=>v.text.includes(w))]});
  }
 }
 return rows;
}
export interface ListeningReview {canonicalTextHash:string;synthesisHash:string;assetHash:string;status:ListeningStatus;reviewer:string;heardExactAsset:boolean;note:string}
export function listeningGate(plans:readonly SynthesisPlan[],reviews:readonly ListeningReview[]){
 const accepted=(p:SynthesisPlan)=>!!p.generatedAssetHash&&reviews.some(r=>r.canonicalTextHash===p.canonical.canonicalTextHash&&r.synthesisHash===p.synthesisHash&&r.assetHash===p.generatedAssetHash&&r.heardExactAsset&&!!r.reviewer.trim()&&['PASS','PASS_WITH_NOTE'].includes(r.status));
 const count=plans.filter(accepted).length,critical=plans.filter(p=>p.canonical.consentCritical),mandatory=plans.filter(p=>p.regressionIds.length);
 return {status:'NOT_ACCEPTED',reviewedAccepted:count,total:plans.length,acceptedPercent:plans.length?count/plans.length*100:0,criticalTotal:critical.length,criticalAccepted:critical.filter(accepted).length,mandatoryTotal:mandatory.length,mandatoryPassed:mandatory.filter(p=>p.generatedAssetHash&&reviews.some(r=>r.assetHash===p.generatedAssetHash&&r.synthesisHash===p.synthesisHash&&r.canonicalTextHash===p.canonical.canonicalTextHash&&r.status==='PASS'&&r.heardExactAsset&&r.reviewer.trim())).length,eligibleForHumanAcceptanceReview:plans.length>0&&critical.every(accepted)&&count/plans.length>=.95&&mandatory.length>0&&mandatory.every(p=>p.generatedAssetHash&&reviews.some(r=>r.assetHash===p.generatedAssetHash&&r.synthesisHash===p.synthesisHash&&r.canonicalTextHash===p.canonical.canonicalTextHash&&r.status==='PASS'&&r.heardExactAsset&&r.reviewer.trim())),linguisticCorrectnessProvenByAutomation:false};
}
