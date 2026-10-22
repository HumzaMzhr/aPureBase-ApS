import { approvedInventory, assetVoice, bytesHash, decodeWave, wordingVersion, type VerifiedAsset } from '../approved/assets';
import { textHash } from '../wording';
import { literalEmail } from '../classifier';
export const rendererVersion = 'stage-2.0c2-deterministic-1';
export interface NameEvidence { original: string; source: 'contact-data' | 'verified-call'; evidenceId: string; evidenceText: string; reviewedBy: string; reviewedAt: string; pronunciationConfirmed: boolean; recipientRevision: number }
export type SpeechSlot = { kind: 'NAME'; phraseId: string; name: NameEvidence } | { kind: 'EMAIL'; phraseId: 'email-readback-intro'; candidate: string; sourceTurnId: string; recipientRevision: number; normalizationReviewed: boolean };
export interface SpeechBinding { slot: SpeechSlot; renderedValue: string; renderedText: string; textHash: string; phraseVersion: string; rendererVersion: string; cacheKey: string }
export interface DynamicAsset extends VerifiedAsset { binding: SpeechBinding }
const letters = ['a','be','se','de','e','ef','ge','hå','i','jåd','kå','el','em','en','o','pe','ku','ær','es','te','u','ve','dobbelt-ve','eks','y','sæt'];
const digits = ['nul','en','to','tre','fire','fem','seks','syv','otte','ni'];
const signs: Record<string,string> = { '.': 'punktum', '-': 'bindestreg', '_': 'understregning', '+': 'plus', '@': 'snabel-a' };
export function speakEmail(value: string) {
  if (!literalEmail(value) || value.length > 120 || !/^[A-Za-z0-9._+@-]+$/u.test(value)) throw new Error('Unsupported literal email characters; HUMAN_TAKEOVER required.');
  return [...value].map(c => signs[c] ?? (/^[0-9]$/u.test(c) ? digits[Number(c)] : (c === c.toUpperCase() ? 'stort ' : '') + letters[c.toLowerCase().charCodeAt(0)-97])).join(', ');
}
export function validateName(n: NameEvidence) {
  if (!n || !n.pronunciationConfirmed || !n.reviewedBy?.trim() || !n.reviewedAt || !Number.isInteger(n.recipientRevision) || n.recipientRevision < 0 || !['contact-data','verified-call'].includes(n.source) || !n.evidenceId?.trim() || !n.evidenceText?.includes(n.original) || !/^[A-Za-zÆØÅæøåÉéÜüÄäÖö]+(?:[ -][A-Za-zÆØÅæøåÉéÜüÄäÖö]+){0,5}$/u.test(n.original) || n.original.length > 80) throw new Error('Unsupported or unverified name/pronunciation; HUMAN_TAKEOVER required.');
  return n.original;
}
export async function renderSlot(slot: SpeechSlot): Promise<SpeechBinding> {
  let renderedValue: string, renderedText: string;
  if (slot.kind === 'NAME') {
    const phrase = approvedInventory.find(p => p.id === slot.phraseId);
    if (!phrase || phrase.dynamicValues.length !== 1 || !phrase.text.includes('[NAVN]')) throw new Error('Only declared NAME templates may be rendered.');
    renderedValue = validateName(slot.name); renderedText = phrase.text.replace('[NAVN]', renderedValue);
  } else if (slot.kind === 'EMAIL') {
    if (slot.phraseId !== 'email-readback-intro' || !slot.normalizationReviewed || !slot.sourceTurnId?.trim() || !Number.isInteger(slot.recipientRevision) || slot.recipientRevision < 0) throw new Error('Email revision/normalization approval required.');
    renderedValue = speakEmail(slot.candidate); renderedText = renderedValue;
  } else throw new Error('Only declared NAME/EMAIL slots may be rendered.');
  const hash = await textHash(renderedText);
  return { slot: structuredClone(slot), renderedValue, renderedText, textHash: hash, phraseVersion: wordingVersion, rendererVersion, cacheKey: await textHash(JSON.stringify({ kind: slot.kind, phraseId: slot.phraseId, hash, wordingVersion, rendererVersion, voice: assetVoice })) };
}
export async function verifyDynamicAsset(asset: DynamicAsset, bytes?: Uint8Array<ArrayBuffer>) {
  const binding = await renderSlot(asset.binding.slot);
  if (binding.cacheKey !== asset.binding.cacheKey || binding.renderedValue !== asset.binding.renderedValue || binding.renderedText !== asset.binding.renderedText || binding.textHash !== asset.binding.textHash || asset.binding.phraseVersion !== wordingVersion || asset.binding.rendererVersion !== rendererVersion || asset.phraseId !== binding.slot.phraseId || asset.text !== binding.renderedText || asset.textHash !== binding.textHash || asset.wordingVersion !== wordingVersion || JSON.stringify(asset.voice) !== JSON.stringify(assetVoice) || asset.requestedSpeed !== .95 || !asset.provenance.verified || asset.provenance.method !== 'authenticated-provider-response-and-content-hash' || asset.provenance.endpoint !== `https://api.elevenlabs.io/v1/text-to-speech/${assetVoice.voiceId}` || !/^[a-f0-9]{64}$/u.test(asset.provenance.settingsHash) || !/^[a-f0-9]{64}$/u.test(asset.assetHash) || asset.status !== 'GENERATED_VERIFIED_LOCAL_ONLY' || asset.productionApproved !== false || asset.sampleRate !== 24000 || asset.mediaFormat !== 'wav-pcm-s16le-mono' || !asset.verification.mediaValid || !asset.verification.nonSilent) throw new Error('Dynamic slot/text/voice/provenance binding rejected.');
  if (bytes) { const pcm = decodeWave(bytes); if (await bytesHash(bytes) !== asset.assetHash || pcm.clippingEvents || pcm.peak < .001 || pcm.rms < .0001 || pcm.samples.length !== asset.samples || Math.abs(pcm.duration - asset.duration) > 1/24000) throw new Error('Dynamic media/hash rejected.'); }
  return binding;
}
