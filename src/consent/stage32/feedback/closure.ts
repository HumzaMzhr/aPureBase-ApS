import baseline from '../../corrections/humanBaseline.json';
import latest from './latestHumanReview.json';
import physical from './physicalFindings.json';
import sources from './sources.json';
import {listeningCatalog,type ReviewAsset} from '../../acceptance/catalog';
import {replacements} from '../../corrections/assets';
import {candidates} from '../speech/candidates';
import {c32Definition,currentC32Catalog,currentC32ReviewBindings,reviewAssetKey} from '../speech/current';
import {canonicalPhrase,makePlan,validatePlan} from '../speech/plans';
import {textHash} from '../../wording';

export const closureVersion='stage-2.0c32-feedback-closure-1';
export const feedbackStatuses=['RESOLVED_BY_HUMAN_EVIDENCE','NEW_CANDIDATE_HUMAN_REVIEW_PENDING','AUTOMATED_IMPROVEMENT_AVAILABLE','AUTOMATED_CHECK_ONLY','UNRESOLVED','SUPERSEDED'] as const;
const allAssets=()=>[...listeningCatalog,...replacements,...candidates];
const spoken=(a:ReviewAsset)=>'spokenText'in a?String(a.spokenText):a.text;
const isWeak=(rating:{pronunciation:number;naturalness:number;pace:number})=>rating.pronunciation<=3||rating.naturalness<=3||rating.pace<=3;
export function reviewsForHash(hash:string){return [
 ...baseline.reviews.map((r,i)=>({stage:'C-3',source:'original-export',actionIndex:i,decision:r.decision,ratings:null,comment:r.note,heardExactAsset:r.selfAttestedPhysicalListening,audioHash:r.audioHash})).filter(r=>r.audioHash===hash),
 ...latest.phraseReviews.map((r,i)=>({stage:'C-3.2',source:'latest-export',actionIndex:i,decision:r.status,ratings:{naturalness:r.naturalness,pronunciation:r.pronunciation,pace:r.pace},comment:r.comments,heardExactAsset:r.heardExactAsset,audioHash:r.audioHash})).filter(r=>r.audioHash===hash)
 ];}
export function replacementChain(hash:string){
 const chain:string[]=[];let current=hash;
 for(let i=0;i<allAssets().length;i++){
  const next=[...replacements,...candidates].find(a=>a.replacesAudioHash===current);
  if(!next)break;if(chain.includes(next.assetHash))throw new Error('Cyclic asset replacement');chain.push(next.assetHash);current=next.assetHash;
 }
 return chain;
}
export function humanStatus(a:ReviewAsset){
 const rows=reviewsForHash(a.assetHash),last=rows.at(-1);
 if(!last)return'NEW_CANDIDATE_HUMAN_REVIEW_PENDING';
 if(last.decision==='FAIL'||last.decision==='HUMAN_LISTENING_REJECTED'||last.ratings&&isWeak(last.ratings)||last.comment.trim())return'UNRESOLVED';
 return last.heardExactAsset?'RESOLVED_BY_HUMAN_EVIDENCE':'UNRESOLVED';
}
export function pronunciationExpectation(phraseId:string,text:string){return {
 kind:'HUMAN_REVIEW_DESCRIPTION_NOT_PROVIDER_PAYLOAD',
 connectedSpeech:phraseId==='why-calling'?'Asem: written sende dig; expected approximately sene dej, reported sente dej. Human comparison of exact hashes required.':'Natural connected Danish; inspect function-word joins and word boundaries.',
 weakConsonants:/hav|framelde/u.test(text)?'Related historical feedback on hav/framelde: assess silent/weak consonants; occurrence alone is not a new human failure.':'Native assessment of weak consonants and soft-d remains required.',
 organization:text.includes('aPureBase')?'Preserve organization identity; distinguish canonical spelling from existing a Pure Base synthesis alias.':null,
 scope:'No phonetic misspelling in canonical text; no acoustic correctness inferred from spelling or PCM statistics.'
 };}
export async function currentAssetTable(){
 const bindings=await currentC32ReviewBindings();
 const rows=await Promise.all(currentC32Catalog().map(async a=>{
  const synthesisText=spoken(a),history=allAssets().filter(h=>h.phraseId===a.phraseId&&replacementChain(h.assetHash).includes(a.assetHash)).map(h=>h.assetHash);
  const definition=c32Definition.responses.find(r=>r.id===a.phraseId)!;
  const diagnosticOnly='binding'in a&&a.binding.slot.kind==='EMAIL'||['email-readback-intro','email-correction-prefix'].includes(a.phraseId);
  return {phraseId:a.phraseId,reviewKey:reviewAssetKey(a),canonicalText:a.text,canonicalVersion:a.wordingVersion,canonicalTextHash:a.textHash,synthesisText,synthesisVersion:'synthesisVersion'in a?String(a.synthesisVersion):'binding'in a?a.binding.rendererVersion:a.wordingVersion+':provider-input',synthesisTextHash:await textHash(synthesisText),pronunciationExpectation:pronunciationExpectation(a.phraseId,a.text),currentAssetHash:a.assetHash,historicalAssetHashes:[...new Set(history)],assetPath:a.path,actualLoadURL:'binding'in a&&!a.path.startsWith('/audio/consent-stage20c31/')?'/api/c31/media/'+a.assetHash+'.wav':a.path,phraseVersionBinding:'binding'in a?'EXACT_CACHED_DYNAMIC_BINDING':definition.version===a.wordingVersion&&definition.audio?.sha256===a.assetHash?'EXACT_STATIC_DEFINITION':'MISMATCH',binding:bindings.find(b=>b.phraseId===a.phraseId&&b.audioHash===a.assetHash)!,provider:a.voice,providerReceipt:a.provenance,generated:true,generatedAt:a.generatedAt,seconds:a.duration,humanRatingForCurrentHash:reviewsForHash(a.assetHash),humanStatus:humanStatus(a),diagnosticOnly,productionEnabled:false,intendedReviewPath:'C32 ReviewPanel -> exact reviewKey -> C32Playback',selectionReason:candidates.some(c=>c.assetHash===a.assetHash)?'Newest generated C32 candidate; historical hashes blocked':replacements.some(c=>c.assetHash===a.assetHash)?'Exact existing C31 correction; no later generated replacement':'Unchanged C1/C2 reference; historical human evidence retained without new approval'};
 }));
 const templates=c32Definition.responses.filter(r=>r.deliveryType==='SPOKEN_CLIP'&&r.dynamicValues?.length).map(r=>({phraseId:r.id,canonicalText:r.text,canonicalVersion:r.version,canonicalTextHash:r.audio?.textHash??null,synthesisText:null,currentAssetHash:null,generated:false,playable:false,status:'UNBOUND_TEMPLATE_EXACT_CACHED_VALUES_ONLY',productionEnabled:false}));
 return {version:closureVersion,status:'NOT_ACCEPTED',productionEnabled:false,rows,templates};
}
export type AssetTable=Awaited<ReturnType<typeof currentAssetTable>>;
export async function assertCurrentAssetTable(table:AssetTable){
 const expected=await currentAssetTable();
 if(JSON.stringify(table)!==JSON.stringify(expected))throw new Error('Current phrase/version/text/generated/reachability table differs from selection authority');
 for(const a of table.rows){
  if(a.phraseVersionBinding==='MISMATCH'||!a.providerReceipt.verified||!a.providerReceipt.providerRequestId||a.binding.canonicalHash!==a.canonicalTextHash||a.binding.spokenHash!==a.synthesisTextHash||a.historicalAssetHashes.includes(a.currentAssetHash))throw new Error('Invalid current spoken-unit identity');
 }
}
export async function proposedClosureGenerations(){
 const a=listeningCatalog.find(a=>a.phraseId==='clarify')!,response=c32Definition.responses.find(r=>r.id==='clarify')!;
 const generated=candidates.find(c=>c.phraseId==='clarify')!;
 const authority=await canonicalPhrase({...response,version:'stage-2.0c32-clarify-ab-1'},a.text);
 const plan=await makePlan(authority);await validatePlan(plan,authority);
 if(plan.synthesisText===spoken(a))throw new Error('A no-op generation is not justified');
 const request={phraseId:a.phraseId,canonicalText:a.text,sourceCanonicalVersion:a.wordingVersion,canonicalVersion:authority.wordingVersion,canonicalTextHash:a.textHash,proposedSynthesisText:plan.synthesisText,synthesisVersion:plan.synthesisVersion,synthesisTextHash:await textHash(plan.synthesisText),planHash:plan.synthesisHash,reason:'Current Clarify retains original aPureBase provider spelling and has latest pronunciation 2/5. Bounded A/B applies the existing C31 organization alias to the same canonical permission question, without new words, channel or scope.',oldAssetHash:a.assetHash,oldHumanRating:reviewsForHash(a.assetHash),voice:'Isabella',voiceId:a.voice.voiceId,model:a.voice.modelId,speed:.95,characterCount:plan.synthesisText.length,expectedProviderCalls:1,generated:true,assetHash:generated.assetHash,authorization:'EXACT_ONE_REQUEST_AUTHORIZED_AND_CONSUMED',payload:{text:plan.synthesisText,model_id:a.voice.modelId,language_code:'da',voice_settings:{speed:.95}},endpoint:'https://api.elevenlabs.io/v1/text-to-speech/'+a.voice.voiceId+'?output_format=pcm_24000'};
 return {version:closureVersion,status:'COMPLETED_NO_FURTHER_GENERATION_AUTHORIZED',remainingAuthorizedRequests:0,requestCount:1,totalCharacters:request.characterCount,requests:[request],alreadyGeneratedWhyCallingAndSuccessClose:'DO_NOT_REGENERATE',otherLowRatings:[{phraseId:'consent-question',disposition:'D_INSUFFICIENT_PHONEME_EVIDENCE',reason:'Already uses the organization alias. A 2/5 rating alone does not justify an identical paid request or an arbitrary punctuation change.'},{phraseId:'email-request',disposition:'D_INSUFFICIENT_PHONEME_EVIDENCE',reason:'No word-specific comment or independently justified prosody correction; retain concern and request a precise native verdict, not speculative generations.'}]};
}
export async function assertProposedClosureGenerations(value:Awaited<ReturnType<typeof proposedClosureGenerations>>){if(JSON.stringify(value)!==JSON.stringify(await proposedClosureGenerations()))throw new Error('Exact authorized completed generation record required');}
export async function feedbackMaster(){
 const table=await currentAssetTable();
 function observation(stage:string,index:number,phraseId:string,canonicalText:string,hash:string,ratings:{naturalness:number;pronunciation:number;pace:number}|null,decision:string,comment:string,source:string){
  const chain=replacementChain(hash),end=chain.at(-1)??hash,selected=table.rows.find(a=>a.phraseId===phraseId&&a.currentAssetHash===end),last=reviewsForHash(end).at(-1);
  let status:typeof feedbackStatuses[number]=selected?(last?humanStatus(currentC32Catalog().find(a=>a.phraseId===phraseId&&a.assetHash===end)!):'NEW_CANDIDATE_HUMAN_REVIEW_PENDING'):'SUPERSEDED';
  if(stage==='C-3'&&phraseId==='success-close'&&comment.trim())status='UNRESOLVED';
  return {id:stage+':listening:'+index,stage,source,sourceActionIndex:index,phraseId,canonicalText,canonicalTextHash:allAssets().find(a=>a.assetHash===hash)?.textHash??null,canonicalVersion:allAssets().find(a=>a.assetHash===hash)?.wordingVersion??null,synthesisVersion:allAssets().find(a=>a.assetHash===hash)?.wordingVersion+':provider-input',audioHashHeard:hash,ratings,decision,verbatimComment:comment,businessMechanismPending:stage==='C-3'&&phraseId==='success-close'&&!!comment.trim(),identifiedProblem:ratings&&isWeak(ratings)?'Weak human quality rating; exact phoneme unspecified unless separately reported':comment||null,flags:{weakPronunciation:!!ratings&&ratings.pronunciation<=3,weakNaturalness:!!ratings&&ratings.naturalness<=3,weakPace:!!ratings&&ratings.pace<=3,commentRequiresReview:!!comment.trim(),conflictingPass:(decision==='PASS'||decision==='HUMAN_LISTENING_APPROVED')&&(!!ratings&&isWeak(ratings)||!!comment.trim())},subsequentlyChanged:chain.length>0,replacementChain:chain,replacementPhrase:selected?.canonicalText??null,replacementVersion:selected?.canonicalVersion??null,replacementAudioHash:chain.length?end:null,replacementActuallyGenerated:chain.length>0&&!!selected,replacementWiredIntoC32:chain.length>0&&!!selected,automatedValidation:'EXACT_ASSET_SELECTION_RENDER_AND_PCM_TESTS',humanRetest:chain.length?reviewsForHash(end).filter(r=>r.stage!=='C-3'):[],status};
 }
 const listening=[...baseline.reviews.map((r,i)=>observation('C-3',i,r.phraseId,r.text,r.audioHash,null,r.decision,r.note,'WhatsApp Business Acceptance Data.json:listening.reviews['+i+']')),...latest.phraseReviews.map((r,i)=>observation('C-3.2',i,r.phraseId,allAssets().find(a=>a.assetHash===r.audioHash)?.text??'UNAVAILABLE',r.audioHash,{naturalness:r.naturalness,pronunciation:r.pronunciation,pace:r.pace},r.status,r.comments,'APureBase C32 Human Review.json:phraseReviews['+i+']'))];
 const system=physical.attempts.map(r=>({id:'C-3:attempt:'+r.index,stage:'C-3',phraseId:null,canonicalText:null,audioHashHeard:null,ratings:null,decision:null,verbatimComment:null,source:'WhatsApp Business Acceptance Data.json:'+(r.index<5?'history['+r.index+']':'current'),identifiedProblem:r.recognitionFailureMs!==null?'Microphone ready; transport failed before ready/final in '+r.recognitionFailureMs+' ms. Exact cause unproven.':'Incomplete ordinary attempt; no source finals or completed successful call. Opening evidence absent: '+!r.openingPresent,subsequentlyChanged:true,replacementPhrase:null,replacementVersion:null,replacementAudioHash:null,replacementActuallyGenerated:false,replacementWiredIntoC32:false,automatedValidation:'PREFLIGHT_OWNERSHIP_LIFECYCLE_AND_COMPLETE_SCENARIO_REGRESSIONS',humanRetest:[],status:r.recognitionFailureMs!==null?'UNRESOLVED':'AUTOMATED_CHECK_ONLY',physical:r}));
 const relay=[{id:'relayed:sende-dig',stage:'C-3.2 user-relayed',phraseId:'why-calling',canonicalText:baseline.reviews.find(r=>r.phraseId==='why-calling')!.text,audioHashHeard:'147ff7168b2e900239d6f6f5723de61c55c175f56d1793d25da972ad9ca609bb',ratings:null,decision:null,verbatimComment:null,relayedDescription:'Written sende dig; reported sente dej; expected approximately sene dej. This is a user-relayed description, not a verbatim Asem review comment.',source:'dcd48e56-2c7d-40f2-b9e5-59102640016f/Pasted text.txt:84-110 (relayed description, not a recorded verbatim Asem quote)',identifiedProblem:'Connected-speech consonant, not canonical spelling',status:'NEW_CANDIDATE_HUMAN_REVIEW_PENDING',replacementAudioHash:candidates.find(a=>a.phraseId==='why-calling')!.assetHash,replacementActuallyGenerated:true,replacementWiredIntoC32:true},
 {id:'relayed:naturalness',stage:'C-3.2 user-relayed',phraseId:null,canonicalText:null,audioHashHeard:null,ratings:null,decision:null,verbatimComment:null,relayedDescription:'Isabella sounds approximately 90% natural but occasionally synthetic',source:'dcd48e56-2c7d-40f2-b9e5-59102640016f/Pasted text.txt:153',identifiedProblem:'Qualitative impression; 90% is a user description, not a measured realism score',status:'AUTOMATED_CHECK_ONLY',replacementAudioHash:null,replacementActuallyGenerated:false,replacementWiredIntoC32:false},
 {id:'request:email-architecture',stage:'C-3.2 user request',phraseId:'email-readback-intro',canonicalText:null,audioHashHeard:null,ratings:null,decision:null,verbatimComment:null,source:'Current closure request phases 8/10',identifiedProblem:'Clinic-spoken email should be primary, character-by-character TTS diagnostic only',status:'AUTOMATED_CHECK_ONLY',replacementAudioHash:null,replacementActuallyGenerated:false,replacementWiredIntoC32:false},
 {id:'request:call-duration',stage:'C-3.2 user request',phraseId:null,canonicalText:null,audioHashHeard:null,ratings:null,decision:null,verbatimComment:null,source:'Current closure request phase 10',identifiedProblem:'Ordinary successful call target 30–90 seconds; do not pad unwilling-recipient exits',status:'AUTOMATED_CHECK_ONLY',replacementAudioHash:null,replacementActuallyGenerated:false,replacementWiredIntoC32:false}];
 return {version:closureVersion,acceptance:'NOT_ACCEPTED',sources,originalListeningActions:37,latestListeningActions:5,physicalAttempts:physical.attempts.length,separateC31HumanRetestEvidence:'NOT_FOUND',observations:[...listening,...system,...relay].map(r=>Object.assign({canonicalVersion:null as string|null,synthesisVersion:null as string|null,subsequentlyChanged:false,replacementPhrase:null,replacementVersion:null,replacementAudioHash:null,replacementActuallyGenerated:false,replacementWiredIntoC32:false,automatedValidation:'REFER_TO_FINAL_VALIDATION_AND_EXACT_ASSET_TABLE',humanRetest:[]},r)),latestWeakPhrases:latest.phraseReviews.filter(isWeak).map(r=>({phraseId:r.phraseId,audioHash:r.audioHash,ratings:{pronunciation:r.pronunciation,naturalness:r.naturalness,pace:r.pace},decision:r.status,comment:r.comments})),unreviewedLatestOpening:'C32 latest export lacks Opening; exact unchanged C3 approval is retained separately',derivedAcceptanceGates:physical.acceptanceFacets,productionEnabled:false};
}
