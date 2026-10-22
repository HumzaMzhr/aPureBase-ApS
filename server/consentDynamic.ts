/** Isolated loopback C-2 gateway. Stage 1 server/configuration is untouched. */
import 'dotenv/config';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, rename, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { elevenLabsConfig, pcmToWav } from './voice';
import { assetVoice, bytesHash, decodeWave } from '../src/consent/approved/assets';
import { textHash } from '../src/consent/wording';
import { deliveryGain } from '../src/streaming/deliveryGain';
import { renderSlot, verifyDynamicAsset, type DynamicAsset, type SpeechSlot } from '../src/consent/dynamic/render';
export class DynamicSpeechStore {
  private pending = new Map<string, Promise<DynamicAsset>>();
  constructor(readonly directory = resolve('benchmarks/stage20c2-dynamic-cache'), private provider = fetch) {}
  async audit(data: Record<string, unknown>) { await mkdir(this.directory, { recursive: true }); await appendFile(resolve(this.directory,'usage.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...data })+'\n', { mode: 0o600 }); }
  async prepare(slot: SpeechSlot, signal: AbortSignal, cacheOnly = false) {
    const binding = await renderSlot(slot), key = binding.cacheKey;
    signal.throwIfAborted();
    const config = elevenLabsConfig();
    if (config.voiceId !== assetVoice.voiceId || config.modelId !== assetVoice.modelId || config.voiceName !== assetVoice.name) throw new Error('Pinned Isabella configuration required.');
    const settings = { ...config.settings, speed: .95 }, settingsHash = await textHash(JSON.stringify(settings));
    const rebind = (a: DynamicAsset) => ({ ...a, binding });
    try {
      const cached = JSON.parse(await readFile(resolve(this.directory, key+'.json'), 'utf8')) as DynamicAsset;
      await verifyDynamicAsset(cached, new Uint8Array(await readFile(resolve(this.directory,key+'.wav'))));
      if (cached.provenance.settingsHash !== settingsHash) throw new Error('Cache settings mismatch.');
      signal.throwIfAborted(); await this.audit({ event:'cache.hit', cacheKey:key, characters:0 }); return rebind(cached);
    } catch (error) { if (signal.aborted) throw error; if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if(cacheOnly)throw new Error('C-3 cache miss; generation requires separate authorization. Exact text: '+binding.renderedText);
    const existing = this.pending.get(key);
    if (existing) { const a = await existing; signal.throwIfAborted(); await this.audit({ event:'cache.shared', cacheKey:key }); return rebind(a); }
    const generate = async (): Promise<DynamicAsset> => {
      await this.audit({ event:'provider.started', cacheKey:key, kind:slot.kind, phraseId:slot.phraseId, characters:binding.renderedText.length });
      try {
        const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}`;
        const response = await this.provider(endpoint+'?output_format=pcm_24000', { method:'POST', headers:{ 'xi-api-key':config.apiKey,'Content-Type':'application/json' }, body:JSON.stringify({ text:binding.renderedText, model_id:assetVoice.modelId, language_code:'da', voice_settings:settings }), signal:AbortSignal.any([signal,AbortSignal.timeout(config.timeoutMs)]) });
        if (!response.ok) throw new Error('Dynamic provider failed with HTTP '+response.status);
        const pcm = new Uint8Array(await response.arrayBuffer()); signal.throwIfAborted();
        if (pcm.length > 24000*2*90 || pcm.length%2) throw new Error('Invalid provider PCM size.');
        const wav = pcmToWav(pcm), decoded = decodeWave(wav), gain = deliveryGain(decoded.samples.slice(), true);
        const asset: DynamicAsset = { phraseId:slot.phraseId, wordingVersion:binding.phraseVersion, text:binding.renderedText, textHash:binding.textHash, assetHash:await bytesHash(wav), path:`http://127.0.0.1:5180/cache/${key}.wav`, voice:assetVoice,requestedSpeed:.95,generatedAt:new Date().toISOString(),duration:decoded.duration,samples:decoded.samples.length,sampleRate:24000,mediaFormat:'wav-pcm-s16le-mono',provenance:{verified:true,method:'authenticated-provider-response-and-content-hash',providerRequestId:response.headers.get('request-id') ?? response.headers.get('x-request-id'),endpoint,settingsHash},verification:{mediaValid:true,nonSilent:decoded.peak>=.001&&decoded.rms>=.0001,clippingEvents:decoded.clippingEvents,rawPeak:decoded.peak,gainApplied:gain.gainApplied,peakProtectionEvents:gain.peakProtectionEvents,outputPeak:gain.postGainPeak},status:'GENERATED_VERIFIED_LOCAL_ONLY',businessWordingApproved:true,productionApproved:false,binding };
        await verifyDynamicAsset(asset,wav); signal.throwIfAborted();
        await writeFile(resolve(this.directory,key+'.wav.tmp'),wav,{mode:0o600}); await rename(resolve(this.directory,key+'.wav.tmp'),resolve(this.directory,key+'.wav'));
        await writeFile(resolve(this.directory,key+'.json.tmp'),JSON.stringify(asset,null,2),{mode:0o600}); await rename(resolve(this.directory,key+'.json.tmp'),resolve(this.directory,key+'.json'));
        await this.audit({ event:'provider.verified',cacheKey:key,characters:binding.renderedText.length,assetHash:asset.assetHash,duration:asset.duration,providerRequestId:asset.provenance.providerRequestId,providerCharacterCost:response.headers.get('character-cost'),gain:asset.verification }); return asset;
      } catch(error) { await this.audit({event:'provider.failed',cacheKey:key,characters:binding.renderedText.length,reason:error instanceof Error?error.message:'Failed',billing:'unknown'}); throw error; }
    };
    const promise = generate(); this.pending.set(key,promise);
    try { return rebind(await promise); } finally { this.pending.delete(key); }
  }
}
export function createDynamicGateway(store = new DynamicSpeechStore()) {
  const origins = new Set(['http://127.0.0.1:5175','http://localhost:5175','http://127.0.0.1:5173','http://localhost:5173']);
  return createServer(async(req,res) => {
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) { res.writeHead(403).end(); return; }
    if (origin) res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin'); res.setHeader('Cache-Control','no-store');
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','POST, GET');res.writeHead(204).end();return;}
    try {
      if(req.method==='GET'&&req.url==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'ok',stage:'2.0c2',providerSessionStarted:false}));return;}
      if(req.method==='GET'&&/^\/cache\/[a-f0-9]{64}\.wav$/u.test(req.url??'')){const bytes=await readFile(resolve(store.directory,req.url!.slice(7)));res.setHeader('Content-Type','audio/wav');res.end(bytes);return;}
      if(req.method!=='POST'||!['/prepare','/prepare-cached'].includes(req.url??'')||!origin||req.headers['content-type']!=='application/json'){res.writeHead(403).end();return;}
      let body='';for await(const part of req){body+=String(part);if(body.length>8000)throw new Error('Bounded slot request required.');}
      const input=JSON.parse(body); if(Object.keys(input).some(k=>!['kind','phraseId','name','candidate','sourceTurnId','recipientRevision','normalizationReviewed'].includes(k)))throw new Error('Free response text is forbidden.');
      const abort=new AbortController();res.on('close',()=>{if(!res.writableEnded)abort.abort();});
      const result=await store.prepare(input as SpeechSlot,abort.signal,req.url==='/prepare-cached');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
    }catch(error){res.writeHead(422,{'Content-Type':'application/json'}).end(JSON.stringify({error:error instanceof Error?error.message:'Dynamic generation failed; takeover required.'}));}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)createDynamicGateway().listen(5180,'127.0.0.1',()=>process.stdout.write('C-2 dynamic gateway ready on loopback 5180; no provider session started.\n'));
