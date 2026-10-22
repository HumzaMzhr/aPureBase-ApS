import {retestDefinition,retestPlaybackCatalog,validateRetestDefinition,RetestPlayback,RetestRegistry,qaResponse} from '../../corrections/retest';
import type {ReviewAsset} from '../../acceptance/catalog';
import {candidateCatalog,candidates,candidateIds,C32CandidatePlayback} from './candidates';
import type {ConversationDefinition,PlaybackRecord,ResponseClip} from '../../types';
import type {LocalAudioContext,LocalPlaybackEvent} from '../../approved/localPlayback';
import type {ListeningRegistry} from '../../acceptance/listening';
import {textHash} from '../../wording';

/** One C32 selection authority; historical C1/C31 catalogs are never mutated. */
export function currentC32Catalog(){
 const selected=candidateCatalog();
 return structuredClone([...selected,...retestPlaybackCatalog().filter(a=>!candidateIds.some(id=>id===a.phraseId)&&!selected.some(s=>s.phraseId===a.phraseId&&s.textHash===a.textHash))]);
}
export function currentC32Asset(phraseId:string){
 const asset=currentC32Catalog().find(a=>a.phraseId===phraseId&&!('binding'in a));
 if(!asset)throw new Error('Current bound C32 static asset unavailable: '+phraseId);
 return asset;
}
export function currentC32Response(asset:ReviewAsset){
 if(!currentC32Catalog().some(a=>a.phraseId===asset.phraseId&&a.assetHash===asset.assetHash&&a.textHash===asset.textHash&&a.wordingVersion===asset.wordingVersion))throw new Error('Current C32 response binding required');
 const response=qaResponse(asset);response.audio.phraseVersion=asset.wordingVersion;return response;
}
export const reviewAssetKey=(asset:Pick<ReviewAsset,'phraseId'|'assetHash'>)=>asset.phraseId+':'+asset.assetHash;
export async function currentC32ReviewBindings(){return Promise.all(currentC32Catalog().map(async a=>({phraseId:a.phraseId,canonicalHash:a.textHash,spokenHash:await textHash('spokenText'in a?String(a.spokenText):a.text),audioHash:a.assetHash})));}
export const c32Definition=structuredClone(retestDefinition);
c32Definition.id='apurebase-consent-stage20c32';
c32Definition.version='stage-2.0c32-feedback-closure-1';
for(const candidate of candidates){
 const response=c32Definition.responses.find(r=>r.id===candidate.phraseId);
 if(!response||!response.audio||response.canArmConsent&&(candidate.phraseId!=='clarify'||candidate.text!==response.text||candidate.textHash!==response.audio.textHash))throw new Error('Only exact canonical Clarify audio may replace a consent question');
 response.text=candidate.text;response.version=candidate.wordingVersion;
 response.audio={...response.audio,boundText:candidate.text,textHash:candidate.textHash,sha256:candidate.assetHash,phraseVersion:candidate.wordingVersion};
}
const identity=JSON.stringify(c32Definition);
export function validateC32Definition(definition:ConversationDefinition){
 validateRetestDefinition(retestDefinition);
 if(JSON.stringify(definition)!==identity)throw new Error('Exact C32 phrase/version/graph/consent binding required');
 for(const question of retestDefinition.responses.filter(r=>r.canArmConsent)){
  const selected=definition.responses.find(r=>r.id===question.id)!;
  const meaning={...selected,version:question.version,audio:question.audio};
  if(JSON.stringify(meaning)!==JSON.stringify(question)||question.id!=='clarify'&&JSON.stringify(selected)!==JSON.stringify(question))throw new Error('C32 cannot change consent question meaning, scope, roles or non-Clarify bindings');
 }
}

/** Cached playback only. One owner across the new and retained local players. */
export class C32Playback extends RetestPlayback {
 private readonly candidatePlayer:C32CandidatePlayback;
 constructor(registry:ListeningRegistry=new RetestRegistry(),makeContext?:()=>LocalAudioContext){super(registry,undefined,makeContext);this.candidatePlayer=new C32CandidatePlayback(makeContext);}
 override async play(response:ResponseClip,record:PlaybackRecord,emit:(event:LocalPlaybackEvent)=>void){
  this.cancel();
  if(candidateIds.some(id=>id===response.id)){
   const current=currentC32Asset(response.id);
   if(response.version!==current.wordingVersion||response.audio?.sha256!==current.assetHash)throw new Error('Historical C32 candidate selection blocked');
   return this.candidatePlayer.play(response,record,emit);
  }
  return super.play(response,record,emit);
 }
 override cancel(){super.cancel();this.candidatePlayer?.cancel();}
 override async dispose(){await super.dispose();await this.candidatePlayer.dispose();}
}
