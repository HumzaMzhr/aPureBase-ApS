import { createHash } from 'node:crypto';
import { opening, phrases } from '../src/config/phrases';
import { DANISH_AUDIO_FORMAT, type ElevenLabsConfig } from './voice';
export const fixedPhrases = [opening, ...phrases];
export function phraseHash(id: string, text: string, config: ElevenLabsConfig) {
  return createHash('sha256').update(JSON.stringify({ id, text, language: 'da', provider: 'ElevenLabs', voice: config.voiceId, model: config.modelId, format: DANISH_AUDIO_FORMAT, settings: config.settings ?? null })).digest('hex');
}
export function audioVersion(config: ElevenLabsConfig) { return createHash('sha256').update(fixedPhrases.map(p => phraseHash(p.id, p.da, config)).join('')).digest('hex').slice(0, 16); }
