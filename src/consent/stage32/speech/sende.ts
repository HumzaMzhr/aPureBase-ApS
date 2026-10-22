/** Exact local replacements; earlier recordings remain independently verifiable. */
import pack from './sendeAssets.json';
import type {C32Candidate} from './candidates';
import {sendeIds,sendeVersion,verifySendeBinding} from './sendePlan';
import {LocalPrerecordedPlayback,type LocalAudioContext,type LocalPlaybackEvent} from '../../approved/localPlayback';
import type {PlaybackRecord,ResponseClip} from '../../types';
export const sendeAssets=pack as C32Candidate[];
export function selectedSendeAssets(){
 if(sendeAssets.length!==2||new Set(sendeAssets.map(a=>a.phraseId)).size!==2||sendeIds.some(id=>!sendeAssets.some(a=>a.phraseId===id&&a.wordingVersion===sendeVersion)))throw new Error('Exactly two bound sende corrections required');
 return sendeAssets;
}
export class SendePlayback extends LocalPrerecordedPlayback {
 constructor(makeContext?:()=>LocalAudioContext){super(selectedSendeAssets(),async(path,signal)=>{
  if(!sendeAssets.some(a=>a.path===path)||!/^\/audio\/consent-stage20c32\/[a-f0-9]{64}\.wav$/u.test(path))throw new Error('Unbound correction path');
  const response=await fetch(path,{signal,cache:'no-store'});if(!response.ok)throw new Error('Local correction unavailable');return response.arrayBuffer();
 },makeContext,async(a,bytes)=>{const pinned=sendeAssets.find(p=>p.phraseId===a.phraseId);if(!pinned||JSON.stringify(a)!==JSON.stringify(pinned))throw new Error('Exact correction metadata required');return verifySendeBinding(a as C32Candidate,bytes);});}
 override async play(response:ResponseClip,record:PlaybackRecord,emit:(event:LocalPlaybackEvent)=>void){
  const a=sendeAssets.find(a=>a.phraseId===response.id);
  if(!a||response.version!==a.wordingVersion||response.audio?.phraseVersion!==a.wordingVersion||record.phraseVersion!==a.wordingVersion||record.assetHash!==a.assetHash||record.assetId!==a.path)throw new Error('Exact correction version/asset required');
  return super.play(response,record,emit);
 }
}
