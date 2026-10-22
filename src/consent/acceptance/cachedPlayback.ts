import { DynamicLocalPlayback } from '../dynamic/playback';
import { renderSlot, verifyDynamicAsset, type DynamicAsset, type SpeechSlot } from '../dynamic/render';
import { cachedDynamicAssets, playbackCatalog, type ReviewAsset } from './catalog';
import type { ListeningRegistry } from './listening';
import type { LocalAudioContext, LocalPlaybackPort } from '../approved/localPlayback';
import type { ResponseClip, PlaybackRecord } from '../types';
export class NewAssetRequired extends Error {constructor(readonly slot:SpeechSlot,readonly exactText:string){super('No verified exact cached audio. New TTS requires separate authorization: '+exactText);}}
export class CachedAcceptancePlayback extends DynamicLocalPlayback {
  constructor(private registry:ListeningRegistry,private output:(a:ReviewAsset,e:Parameters<LocalPlaybackPort['play']>[2] extends (e:infer E)=>void?E:never)=>void=()=>{},makeContext?:()=>LocalAudioContext,private cachedRequest:typeof fetch=(url,init)=>fetch(url,init)){super(makeContext,cachedRequest);}
  override async prepare(slot:SpeechSlot,signal:AbortSignal){
    const b=await renderSlot(slot),known=cachedDynamicAssets.find(a=>a.binding.cacheKey===b.cacheKey);
    if(!known)throw new NewAssetRequired(slot,b.renderedText);
    const response=await this.cachedRequest('http://127.0.0.1:5180/prepare-cached',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(slot),signal});
    if(!response.ok)throw new Error('C-3 cache unavailable; no generation attempted.');const a=await response.json()as DynamicAsset;await verifyDynamicAsset(a);
    if(a.assetHash!==known.assetHash||a.textHash!==known.textHash||JSON.stringify(a.binding.slot)!==JSON.stringify(slot))throw new Error('C-3 exact cached binding mismatch.');return a;
  }
  override async play(r:ResponseClip,p:PlaybackRecord,emit:Parameters<LocalPlaybackPort['play']>[2]){
    const a=playbackCatalog.find(a=>a.phraseId===r.id&&a.textHash===r.audio?.textHash&&a.assetHash===r.audio?.sha256);if(!a)throw new Error('No pinned C-3 listening asset.');this.registry.assertRehearsalAllowed(a);
    return super.play(r,p,e=>{this.registry.observe(a,e,performance.now());this.output(a,e);emit(e);});
  }
}
