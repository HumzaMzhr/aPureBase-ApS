/** Exactly two authorized C-3.2 candidates. The persistent journal blocks automatic paid retries. */
import 'dotenv/config';
import {appendFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {candidateIds,candidatePlans,candidateVersion,candidates,type C32Candidate} from '../src/consent/stage32/speech/candidates';
import {currentCatalog} from '../src/consent/corrections/assets';
import {assetVoice,bytesHash,decodeWave} from '../src/consent/approved/assets';
import {elevenLabsConfig,pcmToWav} from '../server/voice';
import {deliveryGain} from '../src/streaming/deliveryGain';
import {textHash} from '../src/consent/wording';

const directory='public/audio/consent-stage20c32';
const journal='docs/stage-2.0c-3.2-generation.jsonl';
const packPath='src/consent/stage32/speech/candidatePack.json';
const plans=await candidatePlans();
if(plans.length!==2||candidateIds.some(id=>!plans.some(p=>p.canonical.phraseId===id)))throw new Error('Exactly two authorized plans required');
const summary=plans.map(plan=>({phraseId:plan.canonical.phraseId,canonicalText:plan.canonical.canonicalText,
  canonicalHash:plan.canonical.canonicalTextHash,spokenText:plan.synthesisText,spokenHash:plan.synthesisHash,
  characters:plan.synthesisText.length,version:candidateVersion}));
if(!process.argv.includes('--generate')){console.log(JSON.stringify(summary,null,2));process.exit(0);}
const config=elevenLabsConfig();
if(config.voiceId!==assetVoice.voiceId||config.modelId!==assetVoice.modelId||config.voiceName!=='Isabella'||
  config.settings?.speed!==undefined&&config.settings.speed!==.95)throw new Error('Pinned Isabella / Flash v2.5 / 0.95 required');
const settings={...config.settings,speed:.95},settingsHash=await textHash(JSON.stringify(settings));
const existing=candidates;
if(existing.length||await readFile(journal,'utf8').then(s=>s.trim().length>0).catch(()=>false))throw new Error('C-3.2 generation was already attempted; manual review required');
await mkdir(directory,{recursive:true});
async function audit(data:Record<string,unknown>):Promise<void>{await appendFile(journal,JSON.stringify({at:new Date().toISOString(),...data})+'\n');}
for(const plan of plans){
  const historical=currentCatalog().find(a=>a.phraseId===plan.canonical.phraseId&&!('binding'in a));
  if(!historical)throw new Error('Missing historical reference');
  const spokenTextHash=await textHash(plan.synthesisText);
  await audit({event:'request.started',phraseId:plan.canonical.phraseId,canonicalTextHash:plan.canonical.canonicalTextHash,
    spokenTextHash,planHash:plan.synthesisHash,version:candidateVersion,characters:plan.synthesisText.length,
    settingsHash,replacesAudioHash:historical.assetHash});
  try{
    const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}?output_format=pcm_24000`,{
      method:'POST',headers:{'xi-api-key':config.apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({text:plan.synthesisText,model_id:assetVoice.modelId,language_code:'da',voice_settings:settings}),
      signal:AbortSignal.timeout(config.timeoutMs)});
    if(!response.ok)throw new Error('Provider HTTP '+response.status);
    const receipt=response.headers.get('request-id')??response.headers.get('x-request-id');
    if(!receipt)throw new Error('Missing provider receipt');
    const wav=new Uint8Array(pcmToWav(new Uint8Array(await response.arrayBuffer())));
    const decoded=decodeWave(wav),gain=deliveryGain(decoded.samples.slice(),true);
    if(decoded.clippingEvents||gain.clippingEvents||decoded.peak<.001||decoded.rms<.0001)throw new Error('Clipped/silent media rejected');
    const assetHash=await bytesHash(wav);
    if(assetHash===historical.assetHash)throw new Error('Historical audio returned; not a new candidate');
    const candidate:C32Candidate={phraseId:plan.canonical.phraseId,wordingVersion:candidateVersion,
      text:plan.canonical.canonicalText,textHash:plan.canonical.canonicalTextHash,
      assetHash,path:`/audio/consent-stage20c32/${assetHash}.wav`,voice:assetVoice,requestedSpeed:.95,
      generatedAt:new Date().toISOString(),duration:decoded.duration,samples:decoded.samples.length,
      sampleRate:24000,mediaFormat:'wav-pcm-s16le-mono',
      provenance:{verified:true,method:'authenticated-provider-response-and-content-hash',providerRequestId:receipt,
        endpoint:`https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}`,settingsHash},
      verification:{mediaValid:true,nonSilent:true,clippingEvents:decoded.clippingEvents,rawPeak:decoded.peak,
        gainApplied:gain.gainApplied,peakProtectionEvents:gain.peakProtectionEvents,outputPeak:gain.postGainPeak},
      status:'GENERATED_VERIFIED_LOCAL_ONLY',businessWordingApproved:plan.canonical.phraseId==='success-close',
      productionApproved:false,spokenText:plan.synthesisText,spokenTextHash,planHash:plan.synthesisHash,
      synthesisVersion:plan.synthesisVersion,replacesAudioHash:historical.assetHash,
      humanReviewStatus:'HUMAN_REVIEW_PENDING',candidateWordingAuthorized:true};
    await writeFile('public'+candidate.path,wav,{flag:'wx'});
    existing.push(candidate);
    await writeFile(packPath,JSON.stringify(existing,null,2)+'\n');
    await audit({event:'request.verified',phraseId:candidate.phraseId,characters:plan.synthesisText.length,
      assetHash,providerRequestId:receipt,providerCharacterCost:response.headers.get('character-cost'),
      duration:decoded.duration,clippingEvents:decoded.clippingEvents,peakProtectionEvents:gain.peakProtectionEvents});
    console.log(candidate.phraseId,assetHash,decoded.duration);
  }catch(error){
    await audit({event:'request.failed',phraseId:plan.canonical.phraseId,
      reason:error instanceof Error?error.message:'Generation failed',billing:'unknown'});
    throw error;
  }
}
