/** Bounded, explicitly authorized replacement pack only. Never invoke from UI. */
import 'dotenv/config';
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {replacementPlan, type CorrectionAsset} from '../src/consent/corrections/assets';
import {correctionVersion} from '../src/consent/corrections/render';
import {assetVoice,bytesHash,decodeWave} from '../src/consent/approved/assets';
import {elevenLabsConfig,pcmToWav} from '../server/voice';
import {deliveryGain} from '../src/streaming/deliveryGain';
import {textHash} from '../src/consent/wording';
const directory='public/audio/consent-stage20c31',journal='docs/stage-2.0c-3.1-generation.jsonl';
const plan=await replacementPlan();if(plan.length!==12)throw new Error('Exactly 12 authorized replacements expected.');
if(!process.argv.includes('--generate')){console.log(JSON.stringify(plan.map(p=>({phrase:p.old.phraseId,text:p.text,spokenText:p.spokenText,textHash:p.textHash,spokenTextHash:p.spokenTextHash,replaces:p.old.assetHash})),null,2));process.exit(0);}
const config=elevenLabsConfig();if(config.voiceId!==assetVoice.voiceId||config.modelId!==assetVoice.modelId||config.voiceName!=='Isabella')throw new Error('Pinned Isabella required.');
const settings={...config.settings,speed:.95},settingsHash=await textHash(JSON.stringify(settings));
const pack=JSON.parse(await readFile('src/consent/corrections/assetPack.json','utf8'))as CorrectionAsset[];
let entries:{event:string;spokenTextHash:string}[]=[];try{entries=(await readFile(journal,'utf8')).trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));}catch{/* New journal. */}
await mkdir(directory,{recursive:true});
async function audit(data:Record<string,unknown>){await appendFile(journal,JSON.stringify({at:new Date().toISOString(),...data})+'\n');}
for(const p of plan){
 const existing=pack.find(a=>a.replacesAudioHash===p.old.assetHash&&a.textHash===p.textHash&&a.spokenTextHash===p.spokenTextHash&&a.provenance.settingsHash===settingsHash);
 if(existing){const bytes=new Uint8Array(await readFile('public'+existing.path));if(await bytesHash(bytes)!==existing.assetHash)throw new Error('Existing candidate corrupted; no regeneration.');continue;}
 if(entries.some(e=>e.spokenTextHash===p.spokenTextHash&&e.event==='request.started'))throw new Error('Prior attempted range requires manual inspection; no automatic paid retry.');
 await audit({event:'request.started',phraseId:p.old.phraseId,text:p.text,textHash:p.textHash,spokenText:p.spokenText,spokenTextHash:p.spokenTextHash,settings,settingsHash,voice:assetVoice,characters:p.spokenText.length,replaces:p.old.assetHash});
 try{
 const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}?output_format=pcm_24000`,{method:'POST',headers:{'xi-api-key':config.apiKey,'Content-Type':'application/json'},body:JSON.stringify({text:p.spokenText,model_id:assetVoice.modelId,language_code:'da',voice_settings:settings}),signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw new Error('Provider HTTP '+response.status);
 const receipt=response.headers.get('request-id')??response.headers.get('x-request-id');if(!receipt)throw new Error('Missing provider receipt');
 const wav=new Uint8Array(pcmToWav(new Uint8Array(await response.arrayBuffer()))),d=decodeWave(wav),gain=deliveryGain(d.samples.slice(),true);if(d.clippingEvents||gain.clippingEvents||d.peak<.001||d.rms<.0001)throw new Error('Clipped/silent recording rejected');
 const hash=await bytesHash(wav),a:CorrectionAsset={phraseId:p.old.phraseId,wordingVersion:correctionVersion,text:p.text,textHash:p.textHash,assetHash:hash,path:`/audio/consent-stage20c31/${hash}.wav`,voice:assetVoice,requestedSpeed:.95,generatedAt:new Date().toISOString(),duration:d.duration,samples:d.samples.length,sampleRate:24000,mediaFormat:'wav-pcm-s16le-mono',provenance:{verified:true,method:'authenticated-provider-response-and-content-hash',providerRequestId:receipt,endpoint:`https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}`,settingsHash},verification:{mediaValid:true,nonSilent:true,clippingEvents:d.clippingEvents,rawPeak:d.peak,gainApplied:gain.gainApplied,peakProtectionEvents:gain.peakProtectionEvents,outputPeak:gain.postGainPeak},status:'GENERATED_VERIFIED_LOCAL_ONLY',businessWordingApproved:false,productionApproved:false,spokenText:p.spokenText,spokenTextHash:p.spokenTextHash,candidateWordingAuthorized:true,replacesAudioHash:p.old.assetHash,...(p.binding?{binding:p.binding}:{})};
 await writeFile('public'+a.path,wav,{flag:'wx'});pack.push(a);await writeFile('src/consent/corrections/assetPack.json',JSON.stringify(pack,null,2)+'\n');
 await audit({event:'request.verified',phraseId:a.phraseId,spokenTextHash:p.spokenTextHash,characters:p.spokenText.length,assetHash:hash,providerRequestId:receipt,providerCharacterCost:response.headers.get('character-cost'),duration:d.duration,clipping:d.clippingEvents,peakProtection:gain.peakProtectionEvents});
 console.log(a.phraseId,hash,d.duration);
 }catch(e){await audit({event:'request.failed',phraseId:p.old.phraseId,spokenTextHash:p.spokenTextHash,reason:e instanceof Error?e.message:'Failed',billing:'unknown'});throw e;}
}
await writeFile('docs/stage-2.0c-3.1-audio-manifest.json',JSON.stringify({stage:correctionVersion,acceptance:'NOT_ACCEPTED',assets:pack},null,2)+'\n');
