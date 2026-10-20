import baseline from './humanBaseline.json';
import {verifiedAssets} from '../approved/assetPack';
import {ListeningRegistry, type HumanDecision} from '../acceptance/listening';
import {listeningCatalog,type ReviewAsset} from '../acceptance/catalog';
import {currentCatalog,replacements,requiredReplacements,verifyCorrection,verifyCorrectionDynamic,prepareCorrection} from './assets';
import {correctionSlot,correctionVersion,wordingChanges,organization} from './render';
import {validateDefinition} from '../definition';
import {dynamicDefinition} from '../dynamic/controller';
import {acceptanceNextAction,PhysicalRehearsal} from '../acceptance/rehearsal';
import {LocalPrerecordedPlayback,type LocalAudioContext,type LocalPlaybackEvent} from '../approved/localPlayback';
import type {DynamicAsset,SpeechSlot} from '../dynamic/render';
import type {ResponseClip,PlaybackRecord} from '../types';
import type {ConsentSession} from '../session';
export class RetestRegistry extends ListeningRegistry {
 readonly historicalRejected=new Set(baseline.reviews.filter(r=>r.decision==='HUMAN_LISTENING_REJECTED').map(r=>r.audioHash));
 constructor(){super(undefined,[...listeningCatalog,...currentCatalog()]);this.restore({reviews:baseline.reviews,outputs:baseline.outputs});}
 override decide(a:ReviewAsset,d:Exclude<HumanDecision,'NOT_REVIEWED'>,reviewer:string,note:string,heard:boolean,english?:string){if(d==='HUMAN_LISTENING_APPROVED'&&this.historicalRejected.has(a.assetHash))throw new Error('Historical rejected bytes cannot regain approval in C-3.1.');return super.decide(a,d,reviewer,note,heard,english);}
 override restore(raw:unknown){const rows=(raw as {reviews?:{audioHash:string;decision:string}[]})?.reviews;if(rows?.some(r=>baseline.reviews.some(b=>b.audioHash===r.audioHash&&b.decision==='HUMAN_LISTENING_REJECTED')&&r.decision==='HUMAN_LISTENING_APPROVED'))throw new Error('Historical rejected approval cannot be restored.');super.restore(raw);}
 override assertRehearsalAllowed(a:ReviewAsset){if(this.historicalRejected.has(a.assetHash))throw new Error('Historical human-rejected asset blocked.');super.assertRehearsalAllowed(a);}
}
export function retainedApproval(a:ReviewAsset,registry:ListeningRegistry){return baseline.reviews.some(r=>r.audioHash===a.assetHash&&r.textHash===a.textHash&&r.decision==='HUMAN_LISTENING_APPROVED')&&registry.decision(a)==='HUMAN_LISTENING_APPROVED';}
const identityKey=(a:ReviewAsset)=>a.phraseId+':'+a.textHash+':'+a.assetHash;
export function replacementMissing(a:ReviewAsset){return requiredReplacements(a)&&!replacements.some(r=>identityKey(r)===identityKey(a));}
export const retestPlaybackCatalog=()=>[...currentCatalog(),verifiedAssets.find(a=>a.phraseId==='email-correction-confirm')!];
export class RetestPlayback extends LocalPrerecordedPlayback {
 constructor(private registry:ListeningRegistry,private output?:(a:ReviewAsset,e:LocalPlaybackEvent)=>void,makeContext?:()=>LocalAudioContext){super(retestPlaybackCatalog(),async path=>{
  const a=retestPlaybackCatalog().find(a=>a.path===path);if(!a)throw new Error('Unknown cached media');
  const url='binding'in a&&!a.path.startsWith('/audio/consent-stage20c31/')?'/api/c31/media/'+a.assetHash+'.wav':path;
  const r=await fetch(url);if(!r.ok)throw new Error('Existing audio missing; no generation permitted.');return r.arrayBuffer();
 },makeContext,verifyCorrection);}
 async prepare(slot:SpeechSlot,signal:AbortSignal){return prepareCorrection(slot,signal);}
 register(a:DynamicAsset,r:ResponseClip){if(!currentCatalog().some(x=>x.assetHash===a.assetHash&&x.textHash===r.audio?.textHash&&x.text===r.text))throw new Error('Exact cached correction registration required.');}
 override async play(r:ResponseClip,p:PlaybackRecord,emit:(e:LocalPlaybackEvent)=>void){const a=retestPlaybackCatalog().find(a=>a.assetHash===r.audio?.sha256&&a.textHash===r.audio.textHash&&a.phraseId===r.id);if(!a)throw new Error('Pinned C-3.1 output required.');if(this.output)this.registry.assertRehearsalAllowed(a);
 // No network/generation at preparation. Session still binds current slot revision.
 return super.play(r,p,e=>{this.output?.(a,e);emit(e);});}
}
export const retestDefinition=structuredClone(dynamicDefinition);retestDefinition.id='apurebase-consent-stage20c31';retestDefinition.version=correctionVersion;
for(const r of retestDefinition.responses){const change=wordingChanges[r.id];if(change){r.text=change.text;r.english=change.english;r.version=correctionVersion;if(r.audio){r.audio.boundText=change.text;r.audio.phraseVersion=correctionVersion;if(r.id==='receptionist-target-request')r.audio.textHash='dc7aae708cf57a21430de1a52f55f3e0c10e67a7b07d7f30542ee60fe553c687';}}
 const a=currentCatalog().find(a=>a.phraseId===r.id&&!('binding'in a));if(a){r.text=a.text;r.version=a.wordingVersion;if(r.audio){r.audio.sha256=a.assetHash;r.audio.textHash=a.textHash;r.audio.boundText=a.text;r.audio.phraseVersion=a.wordingVersion;}}}
export function retestNext(s:ConsentSession){const a=acceptanceNextAction(s);if(a.kind==='TAKEOVER'&&a.label==='No exact verified approved static asset.'){const snap=s.snapshot(),r=s.response(snap.recommendedResponseId);if(r&&s.responses().some(x=>x.id===r.id)&&currentCatalog().some(x=>x.phraseId===r.id&&x.text===r.text&&x.textHash===r.audio?.textHash))return{kind:'PLAY' as const,phraseId:r.id,label:'Play/Approve C-3.1 candidate '+r.id};}return a;}
const definitionIdentity=JSON.stringify(retestDefinition);
export function validateRetestDefinition(d:typeof retestDefinition){validateDefinition(dynamicDefinition);if(JSON.stringify(d)!==definitionIdentity)throw new Error('Exact C-3.1 wording/role/asset/graph binding required.');}
export function makeRetest(scenario:string,category:string,registry:ListeningRegistry,changed:()=>void){return new PhysicalRehearsal(scenario,category,registry,changed,undefined,undefined,{definition:retestDefinition,assetPolicy:{definitionId:retestDefinition.id,validateDefinition:validateRetestDefinition,assets:retestPlaybackCatalog(),render:correctionSlot,verifyDynamic:verifyCorrectionDynamic},makePlayer:output=>new RetestPlayback(registry,(a,e)=>{registry.observe(a,e,performance.now());output(a,e);}),next:retestNext});}
export function qaResponse(a:ReviewAsset){const r=structuredClone(retestDefinition.responses.find(r=>r.id===a.phraseId)!);return{...r,text:a.text,version:a.wordingVersion,dynamicValues:[],audio:{...r.audio!,boundText:a.text,textHash:a.textHash,sha256:a.assetHash,status:'GENERATED_VERIFIED_LOCAL_ONLY' as const}};}
export function localAcceptance(registry:ListeningRegistry,preflightPassed:boolean,runs:ReturnType<PhysicalRehearsal['export']>[],facets:Record<string,{status:string}>){const required=['Microphone input','ASR accuracy','Question completion','Barge-in','Repeat','Stale YES','Consent guard','Email readback','Email correction','Authority','Intermediary','Human takeover','Call duration','Volume consistency','Physical playback'];const missing=currentCatalog().filter(a=>!registry.futureProductionListeningEligible(a)).map(a=>a.phraseId+':'+a.textHash);const completed=new Set(runs.filter(r=>r.completed&&r.microphoneCaptureObserved&&r.asrFinalsObserved>0&&!r.mixedManualAndMicrophone).map(r=>r.scenarioId));return{status:'NOT_ACCEPTED',eligibleForHumanAcceptanceReview:replacements.length===12&&preflightPassed&&!missing.length&&required.every(f=>facets[f]?.status==='PASS')&&'ABCDEFGHIJKLMNOPQR'.split('').every(s=>completed.has(s))&&runs.some(r=>r.session.state==='END_SUCCESS'&&r.duration.recipientEvidence==='MICROPHONE_LOCAL_VAD'&&r.duration.wallClockSeconds!==null),missingListening:missing,missingScenarios:'ABCDEFGHIJKLMNOPQR'.split('').filter(s=>!completed.has(s)),organization,telephoneVerified:false,productionEnabled:false};}
