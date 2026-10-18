/** Local, bounded raw ASR evidence explicitly included in diagnostic/review exports.
 * Never provider prompts; never microphone PCM, device IDs, headers or credentials. */
export interface RecognitionItemAudit {
 generation:number;startedAt:number;observedThrough?:number;firstVoiceAt?:number;lastVoiceAt?:number;vadStartedAt?:number;commitAt?:number;commitReason?:string;finalAt?:number;providerItemId?:string;final?:string;reviewReason?:string;semanticUnitIds?:string[];semanticFinalizedAt?:number;gatewaySamples?:number;
 partials:{at:number;text:string}[];droppedPartials:number;frames:number;samples:number;appendedSamples:number;squares:number;peak:number;clippedSamples:number;maxWindowRms:number;voicedSamples:number;
}
export interface RecognitionAuditSnapshot {version:1;silenceMs:number;windowMs:10;threshold:.018;sampleRate:24000;frameGaps:number;overlapSamples:number;unclockedPackets:number;droppedItems:number;items:RecognitionItemAudit[]}
export class RecognitionAudit {
 private items=new Map<number,RecognitionItemAudit>();private frameEnd?:number;private frameGaps=0;private overlapSamples=0;private unclockedPackets=0;private droppedItems=0;
 constructor(private silenceMs:number){}
 item(generation:number,startedAt=0){let item=this.items.get(generation);if(!item){item={generation,startedAt,partials:[],droppedPartials:0,frames:0,samples:0,appendedSamples:0,squares:0,peak:0,clippedSamples:0,maxWindowRms:0,voicedSamples:0};this.items.set(generation,item);if(this.items.size>128){this.items.delete(this.items.keys().next().value!);this.droppedItems++;}}return item;}
 frame(generation:number,samples:number,squares:number,peak:number,clippedSamples:number,maxWindowRms:number,frameStart?:number,frameEnd?:number,voicedSamples=0){const item=this.item(generation);item.frames++;item.voicedSamples+=voicedSamples;item.samples+=samples;item.appendedSamples+=samples;item.squares+=squares;item.peak=Math.max(item.peak,peak);item.clippedSamples+=clippedSamples;item.maxWindowRms=Math.max(item.maxWindowRms,maxWindowRms);
  if(frameStart===undefined||frameEnd===undefined)this.unclockedPackets++;else{if(this.frameEnd!==undefined){this.frameGaps+=Math.max(0,frameStart-this.frameEnd);this.overlapSamples+=Math.max(0,this.frameEnd-frameStart);}this.frameEnd=frameEnd;}
 }
 partial(generation:number,text:string,at:number,itemId?:string){const item=this.item(generation);item.providerItemId=itemId??item.providerItemId;if(item.partials.at(-1)?.text!==text){item.partials.push({at,text:text.slice(0,12000)});if(item.partials.length>64){item.partials.shift();item.droppedPartials++;}while([...this.items.values()].reduce((n,i)=>n+i.partials.reduce((sum,p)=>sum+p.text.length,0),0)>24000){const oldest=[...this.items.values()].find(i=>i.partials.length)!;oldest.partials.shift();oldest.droppedPartials++;}}}
 snapshot():RecognitionAuditSnapshot{
  const result:RecognitionAuditSnapshot={version:1,silenceMs:this.silenceMs,windowMs:10,threshold:.018,sampleRate:24000,frameGaps:this.frameGaps,overlapSamples:this.overlapSamples,unclockedPackets:this.unclockedPackets,droppedItems:this.droppedItems,items:[...this.items.values()].map(i=>({...i,partials:i.partials.map(p=>({...p}))}))};
  // Independent raw-evidence budget prevents the noisy event ring evicting all
  // early ASR. Drop old partials first, retain item finals/metadata where possible.
  const bytes=()=>new TextEncoder().encode(JSON.stringify(result)).length;
  while(bytes()>65536){const partial=result.items.find(i=>i.partials.length);if(partial){partial.partials.shift();partial.droppedPartials++;}else if(result.items.length>1){result.items.shift();result.droppedItems++;}else break;}
  return result;
 }
}
