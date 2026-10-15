import WebSocket from 'ws';
export const DANISH_AUDIO_FORMAT = 'pcm_24000';
export const DANISH_SAMPLE_RATE = 24000;
export interface VoiceSettings { stability?: number; similarity_boost?: number; style?: number; speed?: number; use_speaker_boost?: boolean }
export interface ElevenLabsConfig { apiKey: string; voiceId: string; modelId: string; voiceName: string; settings?: VoiceSettings; timeoutMs: number }
export class VoiceError extends Error {
  constructor(public reason: 'configuration' | 'authentication' | 'payment' | 'quota' | 'unavailable' | 'timeout' | 'interrupted') { super('Voice generation unavailable.'); }
}
export function elevenLabsConfig(): ElevenLabsConfig {
  const missing = ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'ELEVENLABS_MODEL_ID'].filter(k => !process.env[k]?.trim());
  if (missing.length) throw new Error(`Missing ElevenLabs configuration: ${missing.join(', ')}. Set these values in .env and restart.`);
  const voiceId = process.env.ELEVENLABS_VOICE_ID!.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(voiceId)) throw new Error('Invalid ELEVENLABS_VOICE_ID.');
  let settings: VoiceSettings | undefined;
  if (process.env.ELEVENLABS_VOICE_SETTINGS?.trim()) {
    try {
      const input: unknown = JSON.parse(process.env.ELEVENLABS_VOICE_SETTINGS);
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error();
      const allowed: Record<string, [number, number] | 'boolean'> = { stability: [0, 1], similarity_boost: [0, 1], style: [0, 1], speed: [.7, 1.2], use_speaker_boost: 'boolean' };
      for (const [key, value] of Object.entries(input)) {
        const bounds = allowed[key];
        if (!bounds || (bounds === 'boolean' ? typeof value !== 'boolean' : typeof value !== 'number' || !Number.isFinite(value) || value < bounds[0] || value > bounds[1])) throw new Error();
      }
      settings = input as VoiceSettings;
    } catch { throw new Error('Invalid ELEVENLABS_VOICE_SETTINGS. Use documented voice settings as JSON.'); }
  }
  const timeoutMs = Number(process.env.ELEVENLABS_TIMEOUT_MS || 30000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) throw new Error('ELEVENLABS_TIMEOUT_MS must be between 1000 and 120000.');
  return { apiKey: process.env.ELEVENLABS_API_KEY!.trim(), voiceId, modelId: process.env.ELEVENLABS_MODEL_ID!.trim(), voiceName: process.env.ELEVENLABS_VOICE_NAME?.trim() || `Configured voice (${voiceId})`, settings, timeoutMs };
}
export function publicVoiceConfig(config = elevenLabsConfig()) {
  const { voiceId, modelId, voiceName } = config;
  return { provider: 'ElevenLabs', voiceId, voiceName, modelId, modelName: modelId === 'eleven_flash_v2_5' ? 'Eleven Flash v2.5' : modelId, format: DANISH_AUDIO_FORMAT };
}
export function streamingSpeechUrl(language:'da'|'en',config=elevenLabsConfig()){const query=new URLSearchParams({model_id:config.modelId,language_code:language,output_format:'pcm_24000',sync_alignment:'true',inactivity_timeout:'180',auto_mode:'false'});return `wss://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}/stream-input?${query}`;}
export interface VoiceProvider {
  streamSpeech(text: string, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>>;
  generateSpeech(text: string, signal?: AbortSignal): Promise<Uint8Array>;
  cancel(): void;
}
/** One instance per operation: cancellation never affects another call. */
export class ElevenLabsVoiceProvider implements VoiceProvider {
  private controller = new AbortController();
  constructor(private config = elevenLabsConfig()) {}
  cancel() { this.controller.abort(); }
  openStreamingSocket(language:'da'|'en'){return new WebSocket(streamingSpeechUrl(language,this.config),{headers:{'xi-api-key':this.config.apiKey},maxPayload:3*1024*1024});}
  async streamSpeech(text: string, signal?: AbortSignal) {
    const timeout = AbortSignal.timeout(this.config.timeoutMs);
    const combined = AbortSignal.any([this.controller.signal, timeout, ...(signal ? [signal] : [])]);
    const classify = () => {
      if (signal?.aborted || this.controller.signal.aborted) return new DOMException('Call ended', 'AbortError');
      return new VoiceError(timeout.aborted ? 'timeout' : 'interrupted');
    };
    let response: Response;
    try {
      combined.throwIfAborted();
      response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(this.config.voiceId)}/stream?output_format=${DANISH_AUDIO_FORMAT}`, {
        method: 'POST', headers: { 'xi-api-key': this.config.apiKey, 'Content-Type': 'application/json', Accept: 'application/octet-stream' },
        body: JSON.stringify({ text, model_id: this.config.modelId, language_code: 'da', ...(this.config.settings ? { voice_settings: this.config.settings } : {}) }), signal: combined
      });
    } catch { throw classify(); }
    if (!response.ok) {
      // Inspect only a provider error code, never log/return its raw message or key.
      const data = await response.json().catch(() => undefined) as { detail?: { status?: string } } | undefined;
      const code = data?.detail?.status;
      const reason = ['quota_exceeded', 'insufficient_credits', 'rate_limit_exceeded'].includes(code ?? '') ? 'quota'
        : response.status === 401 || response.status === 403 ? 'authentication'
        : response.status === 402 ? 'payment' : response.status === 429 ? 'quota' : 'unavailable';
      throw new VoiceError(reason);
    }
    if (!response.body) throw new VoiceError('interrupted');
    const reader = response.body.getReader(); let bytes = 0;
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          combined.throwIfAborted();
          const part = await reader.read(); combined.throwIfAborted();
          if (part.done) {
            if (bytes < 2 || bytes % 2) throw new VoiceError('interrupted');
            controller.close(); reader.releaseLock();
          } else {
            bytes += part.value.byteLength;
            if (bytes > 20 * 1024 * 1024) throw new VoiceError('interrupted');
            if (part.value.byteLength) controller.enqueue(part.value);
          }
        } catch { await reader.cancel().catch(() => {}); controller.error(classify()); }
      },
      async cancel() { await reader.cancel().catch(() => {}); }
    }, { highWaterMark: 0 });
  }
  async generateSpeech(text: string, signal?: AbortSignal) {
    const stream = await this.streamSpeech(text, signal); const reader = stream.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); size += value.byteLength; } }
    finally { reader.releaseLock(); }
    const result = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
  }
}
/** Add a WAV container for cached PCM assets; the live stream stays headerless. */
export function pcmToWav(pcm: Uint8Array) {
  const wav = Buffer.alloc(44 + pcm.byteLength);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.byteLength, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(DANISH_SAMPLE_RATE, 24); wav.writeUInt32LE(DANISH_SAMPLE_RATE * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.byteLength, 40); wav.set(pcm, 44);
  return wav;
}
