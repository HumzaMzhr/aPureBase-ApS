import { LocalPrerecordedPlayback, type LocalPlaybackPort, type LocalAudioContext } from '../approved/localPlayback';
import type { ResponseClip, PlaybackRecord } from '../types';
import { verifyDynamicAsset, type DynamicAsset, type SpeechSlot } from './render';
import type { DynamicSpeechPort } from './port';
import { deliveryGain } from '../../streaming/deliveryGain';
/** Explicit slot-only gateway client. No ASR or generic language model. */
export class DynamicLocalPlayback implements LocalPlaybackPort, DynamicSpeechPort {
  private staticPlayer: LocalPrerecordedPlayback;
  private assets = new Map<string,DynamicAsset>();
  private context?: LocalAudioContext;
  private pending?: () => void;
  constructor(private makeContext:()=>LocalAudioContext=()=>new AudioContext(), private request: typeof fetch=(input,init)=>fetch(input,init)) { this.staticPlayer=new LocalPrerecordedPlayback(undefined,undefined,makeContext); }
  async prepare(slot:SpeechSlot,signal:AbortSignal) {
    const response=await this.request('http://127.0.0.1:5180/prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(slot),signal});
    if(!response.ok)throw new Error('Dynamic provider/cache failed; takeover required.');
    const asset=await response.json() as DynamicAsset; await verifyDynamicAsset(asset); return asset;
  }
  register(asset:DynamicAsset,response:ResponseClip) {
    if(asset.phraseId!==response.id||asset.textHash!==response.audio?.textHash||asset.text!==response.text)throw new Error('Dynamic registration mismatch.');
    this.assets.set(asset.textHash,structuredClone(asset));
  }
  async play(response:ResponseClip,record:PlaybackRecord,emit:Parameters<LocalPlaybackPort['play']>[2]) {
    this.cancel();
    const asset=this.assets.get(response.audio?.textHash??'');
    if(!asset)return this.staticPlayer.play(response,record,emit);
    if(asset.text!==response.text||asset.phraseId!==response.id||asset.wordingVersion!==response.version||asset.assetHash!==response.audio?.sha256)throw new Error('Dynamic playback binding mismatch.');
    const abort=new AbortController();let settled=false,source:AudioBufferSourceNode|undefined,finish=()=>{};
    const base={playbackId:record.playbackId,callId:record.callId,phraseId:response.id,phraseVersion:response.version,textHash:asset.textHash,assetHash:asset.assetHash,recipientRevision:record.recipientRevision};
    const cancel=()=>{if(settled)return;settled=true;abort.abort();if(source){try{source.stop();}catch{/* Ended. */}source.disconnect();}emit({...base,action:'interrupt'});finish();};this.pending=cancel;
    try {
      const url=`http://127.0.0.1:5180/cache/${asset.binding.cacheKey}.wav`;
      const result=await this.request(url,{signal:abort.signal});if(!result.ok)throw new Error('Dynamic cache media unavailable.');
      const bytes=await result.arrayBuffer();await verifyDynamicAsset(asset,new Uint8Array(bytes));if(settled)return;
      this.context??=this.makeContext();await this.context.resume();if(settled)return;if(this.context.state!=='running')throw new Error('Audio output unavailable.');
      const decoded=await this.context.decodeAudioData(bytes.slice(0));if(settled)return;
      if(decoded.numberOfChannels!==1||Math.abs(decoded.duration-asset.duration)>.002)throw new Error('Browser decoded dynamic media mismatch.');
      const samples=decoded.getChannelData(0).slice(),gain=deliveryGain(samples,true);if(gain.clippingEvents)throw new Error('Dynamic clipping rejected.');
      const output=this.context.createBuffer(1,samples.length,decoded.sampleRate);output.copyToChannel(samples,0);
      source=this.context.createBufferSource();source.buffer=output;source.connect(this.context.destination);
      const done=new Promise<void>(resolve=>{finish=resolve;});
      source.onended=()=>{if(settled)return;settled=true;source?.disconnect();if(this.context?.state!=='running')emit({...base,action:'fail',error:'Output suspended before completion.'});else emit({...base,action:'complete',outputProof:`web-audio-source-ended:${record.playbackId}:frames=${output.length}:rate=${output.sampleRate}:context=${this.context.currentTime}`,gain});finish();};
      source.start();emit({...base,action:'start',gain});await done;
    }catch(error){if(!settled){settled=true;source?.disconnect();emit({...base,action:'fail',error:error instanceof Error?error.message:'Failed'});throw error;}}
    finally{if(this.pending===cancel)this.pending=undefined;}
  }
  cancel(){this.pending?.();this.pending=undefined;this.staticPlayer.cancel();}
  async dispose(){this.cancel();await this.context?.close();await this.staticPlayer.dispose();}
}
