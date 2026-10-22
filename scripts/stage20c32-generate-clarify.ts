/** Single authorized 82-character Clarify request. A durable exclusive journal forbids retries. */
import {config as loadEnv} from 'dotenv';
import {mkdir,open,readFile,writeFile} from 'node:fs/promises';
import {currentCatalog} from '../src/consent/corrections/assets';
import {retestDefinition} from '../src/consent/corrections/retest';
import {assetVoice,bytesHash,decodeWave} from '../src/consent/approved/assets';
import {canonicalPhrase,makePlan,validatePlan} from '../src/consent/stage32/speech/plans';
import type {C32Candidate} from '../src/consent/stage32/speech/candidates';
import {elevenLabsConfig,pcmToWav} from '../server/voice';
import {deliveryGain} from '../src/streaming/deliveryGain';
import {textHash} from '../src/consent/wording';

const exactText='Selvfølgelig. Må a Pure Base sende relevant faglig information til dig via e-mail?';
const version='stage-2.0c32-clarify-ab-1';
const journalPath='docs/stage-2.0c-3.2-clarify-generation.jsonl';
const packPath='src/consent/stage32/speech/candidatePack.json';
const response=retestDefinition.responses.find(r=>r.id==='clarify')!;
const canonical=await canonicalPhrase({...response,version});
const plan=await makePlan(canonical,'REFERENCE');await validatePlan(plan,canonical);
const payload={text:exactText,model_id:assetVoice.modelId,language_code:'da',voice_settings:{speed:.95}};
const endpoint=`https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}?output_format=pcm_24000`;
if(exactText.length!==82||plan.synthesisText!==exactText||plan.synthesisHash!=='5dc18f4bae4e37f9b4fba4bac0d9de90a5806a7b1e02ae2d3af695fdc0ff9f10'||
 canonical.canonicalText!=='Selvfølgelig. Må aPureBase sende relevant faglig information til dig via e-mail?')throw new Error('Authorized payload/meaning mismatch');
const historical=currentCatalog().find(a=>a.phraseId==='clarify')!;
const pack=JSON.parse(await readFile(packPath,'utf8')) as C32Candidate[];
if(!process.argv.includes('--generate')){console.log(JSON.stringify({endpoint,payload,characters:82,canonical,planHash:plan.synthesisHash,version},null,2));process.exit(0);}
if(pack.length!==2||pack.some(a=>a.phraseId==='clarify'))throw new Error('Expected untouched two-candidate pack');
loadEnv({path:'/Users/humzamazhar/Documents/ChatGPT/aPureBase ApS/.env',quiet:true});
const config=elevenLabsConfig();
if(config.voiceId!==assetVoice.voiceId||config.modelId!==assetVoice.modelId||config.voiceName!=='Isabella'||
 Object.keys(config.settings??{}).some(k=>k!=='speed')||config.settings?.speed!==undefined&&config.settings.speed!==.95)throw new Error('Pinned voice/settings mismatch');
await mkdir('public/audio/consent-stage20c32',{recursive:true});
const journal=await open(journalPath,'wx');
async function audit(data:Record<string,unknown>){await journal.write(JSON.stringify({at:new Date().toISOString(),...data})+'\n');await journal.sync();}
const spokenTextHash=await textHash(exactText),settingsHash=await textHash(JSON.stringify(payload.voice_settings));
await audit({event:'request.started',phraseId:'clarify',endpoint,payload,characters:82,version,canonicalTextHash:canonical.canonicalTextHash,spokenTextHash,planHash:plan.synthesisHash,settingsHash,replacesAudioHash:historical.assetHash,automaticRetry:false});
try{
 const result=await fetch(endpoint,{method:'POST',headers:{'xi-api-key':config.apiKey,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(config.timeoutMs)});
 const receipt=result.headers.get('request-id')??result.headers.get('x-request-id');
 await audit({event:'response.received',httpStatus:result.status,providerRequestId:receipt,providerCharacterCost:result.headers.get('character-cost'),contentType:result.headers.get('content-type')});
 const raw=new Uint8Array(await result.arrayBuffer());
 await writeFile('/private/tmp/c32-clarify-closure/provider-response.pcm',raw,{flag:'wx'});
 if(!result.ok||!receipt)throw new Error('Provider status/receipt invalid; do not retry');
 const wav=new Uint8Array(pcmToWav(raw)),decoded=decodeWave(wav),gain=deliveryGain(decoded.samples.slice(),true),assetHash=await bytesHash(wav);
 if(decoded.clippingEvents||gain.clippingEvents||decoded.peak<.001||decoded.rms<.0001||assetHash===historical.assetHash)throw new Error('Media rejected; no retry');
 const candidate:C32Candidate={phraseId:'clarify',wordingVersion:version,text:canonical.canonicalText,textHash:canonical.canonicalTextHash,assetHash,path:`/audio/consent-stage20c32/${assetHash}.wav`,voice:assetVoice,requestedSpeed:.95,generatedAt:new Date().toISOString(),duration:decoded.duration,samples:decoded.samples.length,sampleRate:24000,mediaFormat:'wav-pcm-s16le-mono',provenance:{verified:true,method:'authenticated-provider-response-and-content-hash',providerRequestId:receipt,endpoint:endpoint.split('?')[0],settingsHash},verification:{mediaValid:true,nonSilent:true,clippingEvents:decoded.clippingEvents,rawPeak:decoded.peak,gainApplied:gain.gainApplied,peakProtectionEvents:gain.peakProtectionEvents,outputPeak:gain.postGainPeak},status:'GENERATED_VERIFIED_LOCAL_ONLY',businessWordingApproved:historical.businessWordingApproved,productionApproved:false,spokenText:exactText,spokenTextHash,planHash:plan.synthesisHash,synthesisVersion:plan.synthesisVersion,replacesAudioHash:historical.assetHash,humanReviewStatus:'HUMAN_REVIEW_PENDING',candidateWordingAuthorized:true};
 await writeFile('public'+candidate.path,wav,{flag:'wx'});
 await writeFile(packPath,JSON.stringify([...pack,candidate],null,2)+'\n');
 await audit({event:'request.verified',phraseId:'clarify',characters:82,assetHash,providerRequestId:receipt,duration:decoded.duration,samples:decoded.samples.length,rawClipping:decoded.clippingEvents,renderedClipping:gain.clippingEvents,peakProtectionEvents:gain.peakProtectionEvents});
 console.log(JSON.stringify(candidate,null,2));
}catch(error){await audit({event:'request.failed',reason:error instanceof Error?error.message:'Generation failed',billing:'unknown',automaticRetry:false});throw error;}
finally{await journal.close();}
