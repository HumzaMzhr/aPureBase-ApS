/** Sole authorized live work: one request per unique approved STATIC phrase.
 * Durable journal is written BEFORE each request; no automatic paid retries. */
import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { approvedInventory, assetVoice, decodeWave, verifyAsset, wordingVersion, type AssetManifest, type VerifiedAsset } from '../src/consent/approved/assets';
import { elevenLabsConfig, pcmToWav } from '../server/voice';
import { deliveryGain } from '../src/streaming/deliveryGain';
const config = elevenLabsConfig();
if (config.voiceId !== assetVoice.voiceId || config.modelId !== assetVoice.modelId) throw new Error('Configured voice/model differs from authorized Isabella configuration.');
const settings = { ...config.settings, speed: .95 };
const manifestFile = 'docs/stage-2.0c-1-audio-manifest.json';
let manifest: AssetManifest;
try { manifest = JSON.parse(await readFile(manifestFile, 'utf8')); } catch { manifest = { version: wordingVersion, assets: [], generations: [] }; }
if (manifest.version !== wordingVersion) throw new Error('Unexpected existing manifest version.');
await mkdir('public/audio/consent-stage20c1', { recursive: true });
const save = () => writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
for (const phrase of approvedInventory.filter(p => !p.dynamicValues.length)) {
  const existing = manifest.assets.find(a => a.phraseId === phrase.id);
  if (existing) { await verifyAsset(existing, new Uint8Array(await readFile('public' + existing.path))); console.info('Verified existing asset', phrase.id); continue; }
  const shared = manifest.assets.find(a => a.textHash === phrase.textHash && a.wordingVersion === wordingVersion);
  if (shared) { const alias: VerifiedAsset = { ...shared, phraseId: phrase.id }; await verifyAsset(alias, new Uint8Array(await readFile('public' + alias.path))); manifest.assets.push(alias); await save(); console.info('Bound identical-text alias', phrase.id); continue; }
  if (manifest.generations.some(g => g.phraseId === phrase.id && (g.status !== 'FAILED' || !process.argv.includes('--retry-failed')))) throw new Error(`Generation already attempted for ${phrase.id}; inspect the durable journal before an explicitly authorized failed/invalid retry.`);
  const job: AssetManifest['generations'][number] = { phraseId: phrase.id, characters: phrase.text.length, startedAt: new Date().toISOString(), status: 'STARTED' };
  manifest.generations.push(job); await save();
  try {
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}`;
    const response = await fetch(endpoint + '?output_format=pcm_24000', { method: 'POST', headers: { 'xi-api-key': config.apiKey, 'Content-Type': 'application/json', Accept: 'application/octet-stream' }, body: JSON.stringify({ text: phrase.text, model_id: assetVoice.modelId, language_code: 'da', voice_settings: settings }), signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}; no raw provider error or credentials retained.`);
    const raw = new Uint8Array(await response.arrayBuffer());
    if (!raw.length || raw.length % 2 || raw.length > 24000 * 2 * 90) throw new Error('Invalid provider PCM.');
    const wav = new Uint8Array(pcmToWav(raw));
    const decoded = decodeWave(wav), gain = deliveryGain(decoded.samples.slice(), true);
    const asset: VerifiedAsset = { phraseId: phrase.id, wordingVersion, text: phrase.text, textHash: phrase.textHash, assetHash: createHash('sha256').update(wav).digest('hex'), path: `/audio/consent-stage20c1/${phrase.textHash}.wav`, voice: assetVoice, requestedSpeed: .95, generatedAt: new Date().toISOString(), duration: decoded.duration, samples: decoded.samples.length, sampleRate: 24000, mediaFormat: 'wav-pcm-s16le-mono', provenance: { verified: true, method: 'authenticated-provider-response-and-content-hash', providerRequestId: response.headers.get('request-id') ?? response.headers.get('x-request-id'), endpoint, settingsHash: createHash('sha256').update(JSON.stringify(settings)).digest('hex') }, verification: { mediaValid: true, nonSilent: decoded.peak >= .001 && decoded.rms >= .0001, clippingEvents: decoded.clippingEvents, rawPeak: decoded.peak, gainApplied: gain.gainApplied, peakProtectionEvents: gain.peakProtectionEvents, outputPeak: gain.postGainPeak }, status: 'GENERATED_VERIFIED_LOCAL_ONLY', businessWordingApproved: true, productionApproved: false };
    await verifyAsset(asset, wav);
    await writeFile('public' + asset.path, wav); manifest.assets.push(asset); job.status = 'VERIFIED'; await save();
    console.info('Generated and verified', phrase.id, phrase.text.length, 'characters', decoded.duration.toFixed(3), 'seconds');
  } catch (error) { job.status = 'FAILED'; job.reason = error instanceof Error ? error.message + ((error.cause as { code?: string } | undefined)?.code ? ` (${(error.cause as { code: string }).code})` : '') : 'Generation failed'; await save(); throw new Error(job.reason); }
}
console.info(JSON.stringify({ generations: manifest.generations.length, charactersSubmitted: manifest.generations.reduce((s, g) => s + g.characters, 0), assets: manifest.assets.length, dynamicTemplatesNotGenerated: approvedInventory.filter(p => p.dynamicValues.length).map(p => p.id) }));
