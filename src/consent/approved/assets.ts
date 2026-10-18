import inventory from './inventory';
import { textHash } from '../wording';
import { assertDanishVoice } from '../../streaming/voiceIdentity';
export const wordingVersion = 'stage-2.0c1-approved-1';
export const approvedInventory = inventory;
export const assetVoice = { provider: 'ElevenLabs', name: 'Isabella', voiceId: 'gIfqD5jrnhkFu8ENVbXC', modelId: 'eleven_flash_v2_5', speed: 0.95 } as const;
export interface VerifiedAsset {
  phraseId: string; wordingVersion: string; text: string; textHash: string; assetHash: string;
  path: string; voice: typeof assetVoice; requestedSpeed: number; generatedAt: string;
  duration: number; samples: number; sampleRate: 24000; mediaFormat: 'wav-pcm-s16le-mono';
  provenance: { verified: boolean; method: 'authenticated-provider-response-and-content-hash'; providerRequestId: string | null; endpoint: string; settingsHash: string };
  verification: { mediaValid: boolean; nonSilent: boolean; clippingEvents: number; rawPeak: number; gainApplied: number; peakProtectionEvents: number; outputPeak: number };
  status: 'GENERATED_VERIFIED_LOCAL_ONLY'; businessWordingApproved: true; productionApproved: false;
}
export interface AssetManifest { version: string; assets: VerifiedAsset[]; generations: { phraseId: string; characters: number; startedAt: string; status: 'STARTED' | 'VERIFIED' | 'FAILED'; reason?: string }[]; }
/** Strict RIFF PCM decoding; does not infer media validity from a filename. */
export function decodeWave(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), label = (at: number, n: number) => new TextDecoder().decode(bytes.subarray(at, at + n));
  if (bytes.length < 46 || label(0, 4) !== 'RIFF' || label(8, 4) !== 'WAVE' || v.getUint32(4, true) + 8 !== bytes.length) throw new Error('Invalid WAV container.');
  let offset = 12, data: Uint8Array | undefined, format = false;
  while (offset + 8 <= bytes.length) {
    const id = label(offset, 4), size = v.getUint32(offset + 4, true), start = offset + 8;
    if (start + size > bytes.length) throw new Error('Truncated WAV chunk.');
    if (id === 'fmt ') { if (size < 16 || v.getUint16(start, true) !== 1 || v.getUint16(start + 2, true) !== 1 || v.getUint32(start + 4, true) !== 24000 || v.getUint32(start + 8, true) !== 48000 || v.getUint16(start + 12, true) !== 2 || v.getUint16(start + 14, true) !== 16) throw new Error('WAV must be mono PCM16 / 24 kHz.'); format = true; }
    if (id === 'data') { if (data) throw new Error('Duplicate audio chunk.'); data = bytes.subarray(start, start + size); }
    offset = start + size + size % 2;
  }
  if (!format || !data || data.length < 4800 || data.length % 2 || data.length > 24000 * 2 * 90) throw new Error('Invalid PCM frames.');
  const pcm = new DataView(data.buffer, data.byteOffset, data.byteLength), samples = new Float32Array(data.length / 2);
  let peak = 0, squares = 0, clippingEvents = 0;
  for (let n = 0; n < samples.length; n++) { const sample = pcm.getInt16(n * 2, true); samples[n] = sample / 32768; peak = Math.max(peak, Math.abs(samples[n])); squares += samples[n] ** 2; if (sample === -32768 || sample === 32767) clippingEvents++; }
  return { samples, sampleRate: 24000, duration: samples.length / 24000, peak, rms: Math.sqrt(squares / samples.length), clippingEvents };
}
export async function bytesHash(bytes: Uint8Array<ArrayBuffer>) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join(''); }
export async function verifyAsset(asset: VerifiedAsset, bytes: Uint8Array<ArrayBuffer>) {
  const phrase = approvedInventory.find(p => p.id === asset.phraseId);
  assertDanishVoice(asset.voice);
  if (!phrase || phrase.dynamicValues.length || asset.wordingVersion !== wordingVersion || asset.wordingVersion !== phrase.wordingVersion || asset.text !== phrase.text || asset.textHash !== phrase.textHash || await textHash(asset.text) !== asset.textHash || await bytesHash(bytes) !== asset.assetHash || asset.voice.name !== 'Isabella' || asset.voice.speed !== .95 || asset.requestedSpeed !== .95 || !asset.provenance.verified || asset.provenance.method !== 'authenticated-provider-response-and-content-hash' || asset.provenance.endpoint !== `https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}` || !/^[a-f0-9]{64}$/u.test(asset.provenance.settingsHash) || asset.status !== 'GENERATED_VERIFIED_LOCAL_ONLY' || !asset.businessWordingApproved || asset.productionApproved !== false || !asset.verification.mediaValid || !asset.verification.nonSilent) throw new Error('Asset identity/text/version/hash/provenance binding rejected.');
  const decoded = decodeWave(bytes);
  if (decoded.clippingEvents || decoded.peak < .001 || decoded.rms < .0001 || decoded.samples.length !== asset.samples || asset.sampleRate !== 24000 || asset.mediaFormat !== 'wav-pcm-s16le-mono' || Math.abs(decoded.duration - asset.duration) > 1 / 24000) throw new Error('Decoded audio validity/duration/clipping rejected.');
  return decoded;
}
