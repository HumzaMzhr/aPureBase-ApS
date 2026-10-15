import type { IncomingMessage, ServerResponse } from 'node:http';
import { incrementalTranslation,unitRequest } from './incrementalTranslation';
import { recommendResponse } from './intelligence';
import { modelConfig, speechInstructions } from './models';
import { streamTranslation, selectTranslationConfig } from './translation';
import { ElevenLabsVoiceProvider, VoiceError, pcmToWav, publicVoiceConfig } from './voice';
import { compactInterpreterInstructions, campaignGlossary } from '../src/config/campaignGlossary';
import { protectTokens } from '../src/email';

const origins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);
export const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body));
};
export { ApiError, openAI } from './openai';
import { ApiError, openAI, language, textField } from './openai';
export async function transcribe(audio: Blob, source: 'da' | 'en', signal?: AbortSignal) {
  if (!audio.size || audio.size > 20 * 1024 * 1024) throw new ApiError(400, 'Recording is empty or exceeds 20 MB.');
  const form = new FormData(); const config = modelConfig();
  const extension = audio.type.includes('wav') ? 'wav' : audio.type.includes('mp4') ? 'mp4' : 'webm';
  form.set('file', audio, `turn.${extension}`); form.set('model', config.transcription);
  form.set('response_format', 'json');
  form.set('prompt', `Transcribe faithfully in the source language. Do not answer or translate. Preserve names, numbers and email addresses. Expected spellings when spoken: Humza (H-u-m-z-a), Pernille, Isabella, aPureBase. Do not insert names if not spoken. Campaign terms: ${campaignGlossary.map(t => t.join(' / ')).join(', ')}.`);
  if (config.transcription === 'gpt-transcribe') form.append('languages[]', source);
  else form.set('language', source);
  const result = await (await openAI('audio/transcriptions', form, signal)).json() as { text?: string };
  return textField(result.text);
}
export async function translate(original: string, source: 'da' | 'en', signal?: AbortSignal) {
  textField(original); const protectedText = protectTokens(original); const selected = selectTranslationConfig(original);
  const body = {
    model: selected.model, instructions: compactInterpreterInstructions(source),
    input: [{ role: 'user', content: [{ type: 'input_text', text: protectedText.text }] }],
    store: false, max_output_tokens: 3000,
    ...(selected.model.startsWith('gpt-5') || selected.model.startsWith('gpt-6') ? { reasoning: { effort: selected.reasoning } } : {})
  };
  const result = await (await openAI('responses', JSON.stringify(body), signal)).json() as { status?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] };
  if (result.status && result.status !== 'completed') throw new ApiError(502, 'Translation did not complete. No audio will play.');
  const text = result.output?.filter(o => o.type === 'message').flatMap(o => o.content ?? []).filter(c => c.type === 'output_text').map(c => c.text ?? '').join('');
  try { return textField(protectedText.restore(text ?? '')); }
  catch { throw new ApiError(502, 'Translation omitted protected content or returned no text. Human verification required.'); }
}
export async function speech(text: string, target: 'da' | 'en', signal?: AbortSignal) {
  textField(text); const config = modelConfig();
  if (target === 'da') {
    const provider = new ElevenLabsVoiceProvider();
    try { return pcmToWav(await provider.generateSpeech(text, signal)); }
    finally { provider.cancel(); }
  }
  const response = await openAI('audio/speech', JSON.stringify({ model: config.speech, voice: config.voice, input: text,
    response_format: 'mp3', ...(config.speech.startsWith('gpt-') ? { instructions: speechInstructions(target) } : {}) }), signal);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 1000) throw new ApiError(502, 'Speech generation returned empty audio.');
  return bytes; // Full body buffered. Never stream partial translated audio to the browser.
}
export async function handleApi(req: IncomingMessage, res: ServerResponse, path: string) {
  if (!origins.has(`http://${req.headers.host}`) || !origins.has(req.headers.origin ?? '')) return json(res, 403, { error: 'Use the local demo page.' });
  if (req.method !== 'POST') return json(res, 405, { error: 'POST required.' });
  const controller = new AbortController();
  const disconnected = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', disconnected);
  try {
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of req) {
      const bytes = Buffer.from(chunk); size += bytes.length;
      if (size > (path === '/api/transcribe' ? 20 * 1024 * 1024 : 24000)) throw new ApiError(413, 'Request too large.');
      chunks.push(bytes);
    }
    const bytes = Buffer.concat(chunks);
    if (path === '/api/transcribe') {
      const contentType = req.headers['content-type'] ?? '';
      if (!['audio/webm', 'audio/wav', 'audio/mp4'].some(t => contentType.startsWith(t))) throw new ApiError(415, 'Use a complete WebM, WAV or MP4 recording.');
      const result = await transcribe(new Blob([bytes], { type: contentType }), language(req.headers['x-source-language']), controller.signal);
      return json(res, 200, { text: result });
    }
    if (!req.headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'JSON required.');
    let data: Record<string,unknown>;
    try { data = JSON.parse(bytes.toString('utf8')); } catch { throw new ApiError(400, 'Invalid JSON.'); }
    const source = language(data.language); const text = textField(data.text);
    if(path==='/api/interpret/unit'){const input=unitRequest(data);res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'});for await(const event of incrementalTranslation(input,controller.signal))res.write(`data: ${JSON.stringify(event)}\n\n`);return res.end();}
    if (path === '/api/plan') { if(source!=='da')throw new ApiError(400,'Recommendations require a finalized Danish utterance.'); return json(res,200,await recommendResponse(text,controller.signal)); }
    if (path === '/api/translate/stream') {
      const telemetry=req.headers['x-interpreter-metrics']==='local'?selectTranslationConfig(text):undefined;
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', ...(telemetry?{'X-Translation-Model':telemetry.model}:{}) });
      for await (const event of streamTranslation(text, source, controller.signal,telemetry)) { controller.signal.throwIfAborted(); res.write(`data: ${JSON.stringify(event)}\n\n`); }
      return res.end();
    }
    if (path === '/api/translate') return json(res, 200, { text: await translate(text, source, controller.signal) });
    if (path === '/api/speech/stream') {
      if (source !== 'da') throw new ApiError(400, 'Streaming speech is Danish only.');
      const provider = new ElevenLabsVoiceProvider();
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      try {
        reader = (await provider.streamSpeech(text, controller.signal)).getReader();
        // Do not send success headers for an empty/failed provider response.
        let part = await reader.read();
        if (part.done) throw new VoiceError('interrupted');
        const voice=publicVoiceConfig();
        res.writeHead(200, { 'X-Voice-Provider':voice.provider,'X-Voice-Id':voice.voiceId,'X-Voice-Model':voice.modelId, 'Content-Type': 'audio/pcm', 'X-Audio-Sample-Rate': '24000', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
        while (!part.done) {
          controller.signal.throwIfAborted();
          if (!res.write(Buffer.from(part.value))) {
            await new Promise<void>((resolve, reject) => {
              const clear = () => { res.off('drain', drained); controller.signal.removeEventListener('abort', aborted); };
              const drained = () => { clear(); resolve(); };
              const aborted = () => { clear(); reject(new DOMException('Call ended', 'AbortError')); };
              res.once('drain', drained); controller.signal.addEventListener('abort', aborted, { once: true });
              if (controller.signal.aborted) aborted();
            });
          }
          part = await reader.read();
        }
        return res.end();
      } finally { await reader?.cancel().catch(() => {}); reader?.releaseLock(); provider.cancel(); }
    }
    if (path === '/api/speech') {
      const audio = await speech(text, source, controller.signal);
      const voice=source==='da'?publicVoiceConfig():undefined;
      res.writeHead(200, { ...(voice?{'X-Voice-Provider':voice.provider,'X-Voice-Id':voice.voiceId,'X-Voice-Model':voice.modelId}:{}), 'Content-Type': source === 'da' ? 'audio/wav' : 'audio/mpeg', 'Cache-Control': 'no-store' }); return res.end(Buffer.from(new Uint8Array(audio)));
    }
    throw new ApiError(404, 'Unknown API endpoint.');
  } catch (error) {
    if (controller.signal.aborted || res.destroyed) return;
    if (res.headersSent) { res.destroy(); return; } // Interrupted audio must not look like a complete stream.
    if (error instanceof VoiceError) {
      console.error('[interpreter] Danish voice failed', { reason: error.reason });
      return json(res, 503, { error: 'Voice generation unavailable.', reason: error.reason });
    }
    const known = error instanceof ApiError;
    console.error('[interpreter] request failed', { path, status: known ? error.status : 502 });
    json(res, known ? error.status : 502, { error: known ? error.message : 'Processing unavailable. Check network and try a new call.' });
  } finally { res.off('close', disconnected); }
}
