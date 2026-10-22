/** Exactly one request per reviewed phrase, durable exclusive journal, no paid retries. */
import {config as loadEnv} from 'dotenv';
import {mkdir,open,readFile,writeFile} from 'node:fs/promises';
import {sendePlans,sendeVersion,verifySendeBinding} from '../src/consent/stage32/speech/sendePlan';
import {candidates,type C32Candidate} from '../src/consent/stage32/speech/candidates';
import {assetVoice,bytesHash,decodeWave} from '../src/consent/approved/assets';
import {deliveryGain} from '../src/streaming/deliveryGain';
import {textHash} from '../src/consent/wording';
import {elevenLabsConfig,pcmToWav} from '../server/voice';
const plans=await sendePlans(),folder='docs/stage-2.0c-3.2-sende-correction';
const endpoint=`https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}?output_format=pcm_24000`;
const requests=plans.map(p=>({phraseId:p.phraseId,endpoint,payload:{text:p.synthesisText,model_id:assetVoice.modelId,language_code:'da',voice_settings:{speed:.95}},characters:p.characters,planHash:p.planHash}));
await mkdir(folder,{recursive:true});await writeFile(folder+'/generation-plan.json',JSON.stringify({requestCount:2,totalCharacters:plans.reduce((n,p)=>n+p.characters,0),automaticRetries:0,requests,plans},null,2)+'\n');
if(!process.argv.includes('--generate')){console.log(JSON.stringify({requests,totalCharacters:plans.reduce((n,p)=>n+p.characters,0),paidRequestsMade:0},null,2));process.exit(0);}
loadEnv({path:'.env',quiet:true});const config=elevenLabsConfig();if(config.voiceId!==assetVoice.voiceId||config.modelId!==assetVoice.modelId||config.voiceName!=='Isabella'||Object.keys(config.settings??{}).some(k=>k!=='speed')||config.settings?.speed!==undefined&&config.settings.speed!==.95)throw new Error('Pinned voice/settings required');
const packPath='src/consent/stage32/speech/sendeAssets.json';const existing=JSON.parse(await readFile(packPath,'utf8'));if(!Array.isArray(existing)||existing.length)throw new Error('Correction already installed; generation is one-shot');
const journal=await open(folder+'/requests.jsonl','wx');const log=async(v:object)=>{await journal.write(JSON.stringify({at:new Date().toISOString(),...v})+'\n');await journal.sync();};const assets:C32Candidate[]=[];
try{for(const [i,p] of plans.entries()){
 const request=requests[i];await log({event:'request.started',...request,previousAssetHash:p.previousAssetHash,automaticRetry:false});
 const response=await fetch(endpoint,{method:'POST',headers:{'xi-api-key':config.apiKey,'Content-Type':'application/json'},body:JSON.stringify(request.payload),signal:AbortSignal.timeout(config.timeoutMs)});const receipt=response.headers.get('request-id')??response.headers.get('x-request-id');await log({event:'response.received',phraseId:p.phraseId,status:response.status,providerRequestId:receipt,characterCost:response.headers.get('character-cost')});
 const raw=new Uint8Array(await response.arrayBuffer());if(!response.ok||!receipt)throw new Error('Provider response rejected; no retry');const wav=new Uint8Array(pcmToWav(raw)),pcm=decodeWave(wav),gain=deliveryGain(pcm.samples.slice(),true),hash=await bytesHash(wav),old=candidates.find(a=>a.phraseId===p.phraseId)!;
 const a:C32Candidate={...structuredClone(old),wordingVersion:sendeVersion,text:p.canonicalText,textHash:p.canonicalTextHash,assetHash:hash,path:`/audio/consent-stage20c32/${hash}.wav`,generatedAt:new Date().toISOString(),duration:pcm.duration,samples:pcm.samples.length,provenance:{verified:true,method:'authenticated-provider-response-and-content-hash',providerRequestId:receipt,endpoint:endpoint.split('?')[0],settingsHash:await textHash(JSON.stringify({speed:.95}))},verification:{mediaValid:true,nonSilent:true,clippingEvents:pcm.clippingEvents,rawPeak:pcm.peak,gainApplied:gain.gainApplied,peakProtectionEvents:gain.peakProtectionEvents,outputPeak:gain.postGainPeak},spokenText:p.synthesisText,spokenTextHash:await textHash(p.synthesisText),planHash:p.planHash,synthesisVersion:sendeVersion,replacesAudioHash:p.previousAssetHash,humanReviewStatus:'HUMAN_REVIEW_PENDING',productionApproved:false};
 await verifySendeBinding(a,wav);await writeFile('public'+a.path,wav,{flag:'wx'});assets.push(a);await log({event:'request.verified',phraseId:p.phraseId,assetHash:hash,characters:p.characters,providerRequestId:receipt,clippingEvents:gain.clippingEvents});
 }
 await writeFile(packPath,JSON.stringify(assets,null,2)+'\n');await log({event:'batch.completed',succeeded:assets.length,totalCharacters:plans.reduce((n,p)=>n+p.characters,0),failures:0,retries:0});console.log(JSON.stringify({succeeded:assets.length,assets:assets.map(a=>({phraseId:a.phraseId,sha256:a.assetHash}))}));
}catch(e){await log({event:'batch.failed',reason:e instanceof Error?e.message:'Unknown failure',completed:assets.length,retries:0,billing:'Check provider ledger; no automatic retry'});throw e;}finally{await journal.close();}
