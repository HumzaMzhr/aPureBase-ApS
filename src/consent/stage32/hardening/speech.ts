import historical from '../../corrections/humanBaseline.json';
import {speechInventory,validatePlan,type SynthesisPlan,type CanonicalPhrase} from '../speech/plans';
import {retestDefinition} from '../../corrections/retest';
import {textHash} from '../../wording';
export const priorityPhrases=['opening','why-calling','consent-question','email-request','clarify','success-close'] as const;
export const historicalFeedback=historical.reviews.map((r,i)=>({id:'asem-action-'+i,phraseId:r.phraseId,canonicalHash:r.textHash,assetHash:r.audioHash,decision:r.decision,comment:r.note,source:'src/consent/corrections/humanBaseline.json',originalActionIndex:i,reviewer:r.reviewer,handling:r.note?'REVIEW_OR_PRIOR_C31_REMEDIATION_RETAINED':'EXISTING_FEEDBACK_RETAINED'}));
export async function requestBlueprint(plan:SynthesisPlan){
 await validatePlan(plan,plan.canonical);
 return {phraseId:plan.canonical.phraseId,phraseVersion:plan.canonical.wordingVersion,canonicalText:plan.canonical.canonicalText,canonicalTextHash:plan.canonical.canonicalTextHash,spokenRenderText:plan.synthesisText,spokenRenderHash:await textHash(plan.synthesisText),pronunciationVersion:plan.synthesisVersion,planHash:plan.synthesisHash,consentCritical:plan.canonical.consentCritical,voiceId:plan.voice.voiceId,providerParameters:{text:plan.synthesisText,model_id:plan.voice.modelId,language_code:'da',voice_settings:{speed:.95}},generationAuthorized:false,recording:null};
}
export async function validateBlueprint(blueprint:Awaited<ReturnType<typeof requestBlueprint>>,plan:SynthesisPlan,authority:CanonicalPhrase){
 await validatePlan(plan,authority);const expected=await requestBlueprint(plan);
 if(JSON.stringify(blueprint)!==JSON.stringify(expected))throw new Error('Exact canonical/speech/provider/phrase ownership mismatch');
}
export async function pronunciationRegistry(){
 const inventory=await speechInventory();
 return Promise.all(inventory.map(async row=>({phraseId:row.canonical.phraseId,canonicalText:row.canonical.canonicalText,canonicalHash:row.canonical.canonicalTextHash,phraseVersion:row.canonical.wordingVersion,english:retestDefinition.responses.find(r=>r.id===row.canonical.phraseId)!.english,consentCritical:row.canonical.consentCritical,sourceFeedback:historicalFeedback.filter(f=>f.phraseId===row.canonical.phraseId),rules:[{id:'canonical-identity',version:'c32h1-registry-1',mode:'EXACT_WORDS',span:row.canonical.canonicalText,phraseOwner:row.canonical.phraseId,canonicalHash:row.canonical.canonicalTextHash,reason:'Business, scope and recipient stay canonical'},...(row.canonical.canonicalText.includes('aPureBase')?[{id:'organization-alias',version:'c32h1-registry-1',mode:'EXISTING_C31_ALIAS',span:'aPureBase',phraseOwner:row.canonical.phraseId,canonicalHash:row.canonical.canonicalTextHash,reason:'Separate a Pure Base rendering only; no canonical change'}]:[]),...(row.canonical.phraseId==='why-calling'?[{id:'sende-dig',version:'c32h1-registry-1',mode:'CONNECTED_WORD_REVIEW_ONLY',span:'sende dig',phraseOwner:row.canonical.phraseId,canonicalHash:row.canonical.canonicalTextHash,reason:'Asem: sente dej versus intended approximately sene dej. No misspelling or unsupported phonemes.'}]:[]),...(row.canonical.canonicalText.includes('via e-mail')?[{id:'via-email',version:'c32h1-registry-1',mode:'NATIVE_BOUNDARY_REVIEW_ONLY',span:'via e-mail',phraseOwner:row.canonical.phraseId,canonicalHash:row.canonical.canonicalTextHash,reason:'Preserve exact channel and proposition; review linked speech'}]:[])],plans:await Promise.all(row.plans.map(requestBlueprint)),humanStatus:'HUMAN_REVIEW_REQUIRED'})));
}
/** Minimal future A/B request; not a generation program. Others reuse existing reference. */
export async function proposedGenerations(){
 const inventory=await speechInventory();
 const rows=await Promise.all(priorityPhrases.map(async id=>{
  const row=inventory.find(r=>r.canonical.phraseId===id&&!r.canonical.template)!;
  const candidate=id==='why-calling'?row.plans.find(p=>p.synthesisVersion.endsWith(':PUNCTUATION')):undefined;
  return {phraseId:id,canonicalText:row.canonical.canonicalText,english:retestDefinition.responses.find(r=>r.id===id)!.english,existingAssetHash:row.historicalAssetHash,current:await requestBlueprint(row.plans[0]),candidate:candidate?await requestBlueprint(candidate):null,reason:id==='why-calling'?'Bounded comma/connected-speech A/B motivated by reported weak-consonant/fluency issue; effectiveness unknown':'No additional paid variant justified before focused listening; preserve current rendering',humanFeedbackTriggered:historicalFeedback.some(f=>f.phraseId===id&&!!f.comment)||id==='why-calling',generationActuallyNecessary:id==='why-calling'?'ONLY_IF_AUTHORIZED_FOR_AB':'NO',consentCritical:row.canonical.consentCritical,newAudioGenerated:false};
 }));
 const requests=rows.flatMap(r=>r.candidate?[{phraseId:r.phraseId,url:'https://api.elevenlabs.io/v1/text-to-speech/'+r.candidate.voiceId+'?output_format=pcm_24000',voice:'Isabella',voiceId:r.candidate.voiceId,body:r.candidate.providerParameters,characters:r.candidate.spokenRenderText.length,canonicalHash:r.candidate.canonicalTextHash,spokenHash:r.candidate.spokenRenderHash,planHash:r.candidate.planHash}]:[]);
 return {status:'PROPOSED_ONLY_NOT_AUTHORIZED',generationProgramInstalled:false,requestCount:requests.length,totalCharacters:requests.reduce((n,r)=>n+r.characters,0),rows,requests,semanticRisk:'Punctuation can alter prosody; native listening must establish whether the consonant improves. No automatic correctness claim.',voiceTraining:false,globalSettingsChanged:false};
}
