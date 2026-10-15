import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ElevenLabsVoiceProvider, elevenLabsConfig, publicVoiceConfig, pcmToWav } from '../server/voice';
import { phraseHash } from '../server/audioAssets';
let upstream: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv('ELEVENLABS_API_KEY', 'eleven-secret-sentinel'); vi.stubEnv('ELEVENLABS_VOICE_ID', 'test-voice'); vi.stubEnv('ELEVENLABS_MODEL_ID', 'eleven_flash_v2_5');
  vi.stubEnv('ELEVENLABS_VOICE_NAME', 'Test voice'); vi.stubEnv('ELEVENLABS_VOICE_SETTINGS', ''); vi.stubEnv('ELEVENLABS_TIMEOUT_MS', '30000');
  upstream = vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]))); vi.stubGlobal('fetch', upstream);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
it('validates required configuration without leaking credentials', () => {
  expect(publicVoiceConfig()).toMatchObject({ provider: 'ElevenLabs', voiceName: 'Test voice', modelId: 'eleven_flash_v2_5', format: 'pcm_24000' });
  expect(JSON.stringify(publicVoiceConfig())).not.toContain('eleven-secret-sentinel');
  vi.stubEnv('ELEVENLABS_API_KEY', ''); expect(elevenLabsConfig).toThrow('ELEVENLABS_API_KEY');
  vi.stubEnv('ELEVENLABS_API_KEY', 'eleven-secret-sentinel'); vi.stubEnv('ELEVENLABS_VOICE_SETTINGS', '{"apiKey":"bad"}'); expect(elevenLabsConfig).toThrow('VOICE_SETTINGS');
});
it('sends final Danish text unchanged to documented streaming endpoint with defaults', async () => {
  const text = 'aPureBase Example Pharma Pernille anna-2.jensen@example.dk 10 mg';
  const provider = new ElevenLabsVoiceProvider(); const stream = await provider.streamSpeech(text); const reader = stream.getReader();
  expect((await reader.read()).value).toEqual(new Uint8Array([1, 2, 3, 4])); expect((await reader.read()).done).toBe(true);
  const [url, options] = upstream.mock.calls[0]; expect(url).toContain('/test-voice/stream?output_format=pcm_24000'); expect(url).not.toContain('optimize_streaming_latency');
  expect(options.headers['xi-api-key']).toBe('eleven-secret-sentinel');
  expect(JSON.parse(options.body)).toEqual({ text, model_id: 'eleven_flash_v2_5', language_code: 'da' }); provider.cancel();
});
it('returns first bytes while later audio remains pending, rather than buffering', async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  upstream.mockResolvedValue(new Response(new ReadableStream<Uint8Array>({ start(c) { controller = c; } })));
  const provider = new ElevenLabsVoiceProvider(); const reader = (await provider.streamSpeech('Hej')).getReader();
  controller.enqueue(new Uint8Array([1, 2])); expect((await reader.read()).value).toEqual(new Uint8Array([1, 2]));
  let finished = false; const pending = reader.read().then(v => { finished = true; return v; }); await Promise.resolve(); expect(finished).toBe(false);
  controller.enqueue(new Uint8Array([3, 4])); expect((await pending).done).toBe(false); controller.close(); expect((await reader.read()).done).toBe(true); provider.cancel();
});
it('supports configuration-driven voice replacement and cache invalidation', () => {
  const first = elevenLabsConfig(); const hash = phraseHash('opening', 'Hej fra aPureBase.', first);
  vi.stubEnv('ELEVENLABS_VOICE_ID', 'verified-custom-voice'); vi.stubEnv('ELEVENLABS_VOICE_NAME', 'Asem Raza');
  const second = elevenLabsConfig(); expect(second.voiceId).toBe('verified-custom-voice'); expect(publicVoiceConfig().voiceName).toBe('Asem Raza');
  expect(phraseHash('opening', 'Hej fra aPureBase.', second)).not.toBe(hash);
  expect(phraseHash('opening', 'Different text', first)).not.toBe(hash);
  expect(phraseHash('opening', 'Hej fra aPureBase.', { ...first, settings: { speed: .9 } })).not.toBe(hash);
});
it.each([[401, 'authentication'], [403, 'authentication'], [402, 'payment'], [429, 'quota'], [404, 'unavailable'], [422, 'unavailable'], [500, 'unavailable']])('sanitizes upstream HTTP %s and never silently falls back', async (status, reason) => {
  upstream.mockResolvedValue(new Response('eleven-secret-sentinel', { status: Number(status) }));
  await expect(new ElevenLabsVoiceProvider().generateSpeech('Hej')).rejects.toMatchObject({ message: 'Voice generation unavailable.', reason }); expect(upstream).toHaveBeenCalledOnce();
});
it('rejects empty, interrupted and incomplete PCM audio', async () => {
  upstream.mockResolvedValue(new Response(new Uint8Array())); await expect(new ElevenLabsVoiceProvider().generateSpeech('Hej')).rejects.toThrow('Voice generation unavailable.');
  upstream.mockResolvedValue(new Response(new Uint8Array([1]))); await expect(new ElevenLabsVoiceProvider().generateSpeech('Hej')).rejects.toThrow('Voice generation unavailable.');
  upstream.mockResolvedValue(new Response(new ReadableStream({ start(c) { c.error(new Error('provider-secret')); } })));
  await expect(new ElevenLabsVoiceProvider().generateSpeech('Hej')).rejects.toThrow('Voice generation unavailable.');
});
it('aborts an in-flight provider request and never exposes its key', async () => {
  upstream.mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
  const provider = new ElevenLabsVoiceProvider(); const abort = new AbortController(); const pending = provider.streamSpeech('Hej', abort.signal);
  const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' }); abort.abort(); await rejection; expect(upstream.mock.calls[0][1].signal.aborted).toBe(true);
});
it('times out before first audio without retrying or changing the response', async () => {
  vi.useFakeTimers(); vi.stubEnv('ELEVENLABS_TIMEOUT_MS', '1000');
  // Native AbortSignal.timeout is not controlled by Vitest fake timers.
  const timeout = new AbortController(); vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
  upstream.mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('timeout')))));
  const pending = new ElevenLabsVoiceProvider().generateSpeech('Hej'); const rejected = expect(pending).rejects.toMatchObject({ reason: 'timeout' }); timeout.abort(); await rejected;
  expect(upstream).toHaveBeenCalledOnce(); vi.restoreAllMocks();
});
it('wraps cached generated PCM in a valid 24kHz WAV container', async () => {
  const provider = new ElevenLabsVoiceProvider(); const wav = pcmToWav(await provider.generateSpeech('Hej'));
  expect(wav.toString('ascii', 0, 4)).toBe('RIFF'); expect(wav.readUInt32LE(24)).toBe(24000); expect(wav.readUInt16LE(34)).toBe(16);
  expect(wav.readUInt32LE(40)).toBe(4); expect(wav.length).toBe(48); provider.cancel();
});

it('recognizes quota errors carried by a 402 response without leaking the provider body', async () => {
  upstream.mockResolvedValue(new Response(JSON.stringify({detail:{status:'quota_exceeded',message:'eleven-secret-sentinel'}}),{status:402}));
  await expect(new ElevenLabsVoiceProvider().generateSpeech('Hej')).rejects.toMatchObject({reason:'quota',message:'Voice generation unavailable.'});
});
it('keeps the timeout active while consuming audio after the first bytes', async () => {
  const timeout=new AbortController();vi.spyOn(AbortSignal,'timeout').mockReturnValue(timeout.signal);
  upstream.mockImplementation(async(_url,options)=>new Response(new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array([1,2]));options.signal.addEventListener('abort',()=>c.error(new Error('timeout')));}})));
  const provider=new ElevenLabsVoiceProvider();const reader=(await provider.streamSpeech('Hej')).getReader();expect((await reader.read()).value).toEqual(new Uint8Array([1,2]));
  const pending=reader.read();const rejection=expect(pending).rejects.toMatchObject({reason:'timeout',message:'Voice generation unavailable.'});timeout.abort();await rejection;vi.restoreAllMocks();
});
