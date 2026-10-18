import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { handleApi } from '../server/api';
let server: Server; let endpoint: string; let source: ReadableStreamDefaultController<Uint8Array>; let providerSignal: AbortSignal;
const realFetch = globalThis.fetch;
beforeEach(async () => {
  source = undefined!; providerSignal = undefined!;
  vi.stubEnv('ELEVENLABS_API_KEY', 'private-eleven-key'); vi.stubEnv('ELEVENLABS_VOICE_ID', 'gIfqD5jrnhkFu8ENVbXC'); vi.stubEnv('ELEVENLABS_MODEL_ID', 'eleven_flash_v2_5'); vi.stubEnv('ELEVENLABS_VOICE_SETTINGS', '');
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL, options?: RequestInit) => {
    if (!String(url).startsWith('https://api.elevenlabs.io/')) return realFetch(url, options);
    providerSignal = options!.signal!;
    return new Response(new ReadableStream<Uint8Array>({
      start(c) { source = c; providerSignal.addEventListener('abort', () => { try { c.error(new DOMException('Cancelled', 'AbortError')); } catch { /* closed */ } }); }
    }));
  }));
  // The fixture uses an ephemeral listener; host validation is covered in server.test.ts.
  server = createServer((req, res) => { req.headers.host = 'localhost:5173'; void handleApi(req, res, '/api/speech/stream'); });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  endpoint = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/speech/stream`;
});
afterEach(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const options = (signal?: AbortSignal): RequestInit => ({ method: 'POST', headers: { Host: 'localhost:5173', Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Hej fra aPureBase.', language: 'da' }), signal });
it('relays first provider bytes over actual HTTP before generation completes and keeps credentials private', async () => {
  const pending = fetch(endpoint, options()); await vi.waitFor(() => expect(source).toBeDefined());
  source.enqueue(new Uint8Array([1, 2])); const response = await pending; expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('audio/pcm'); expect(response.headers.get('X-Audio-Sample-Rate')).toBe('24000'); expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect([...response.headers].join()).not.toContain('private-eleven-key'); const reader = response.body!.getReader();
  expect((await reader.read()).value).toEqual(new Uint8Array([1, 2]));
  source.enqueue(new Uint8Array([3, 4])); source.close(); expect((await reader.read()).value).toEqual(new Uint8Array([3, 4])); expect((await reader.read()).done).toBe(true);
});
it('aborts the ElevenLabs request when the browser ends the call during streaming', async () => {
  const abort = new AbortController(); const pending = fetch(endpoint, options(abort.signal)); await vi.waitFor(() => expect(source).toBeDefined());
  source.enqueue(new Uint8Array([0, 0])); const response = await pending; await response.body!.getReader().read();
  abort.abort(); await vi.waitFor(() => expect(providerSignal.aborted).toBe(true));
});
it('fails interrupted audio as a broken stream rather than appending JSON or completing silently', async () => {
  const pending = fetch(endpoint, options()); await vi.waitFor(() => expect(source).toBeDefined()); source.enqueue(new Uint8Array([0, 0]));
  const response = await pending; const reader = response.body!.getReader(); await reader.read();
  const failure = expect(reader.read()).rejects.toThrow(); source.error(new Error('private-eleven-key')); await failure;
});
it('returns a sanitized, retryable voice error before headers for authentication/quota/payment failures', async () => {
  vi.mocked(fetch).mockImplementation(async (url, init) => String(url).startsWith('https://api.elevenlabs.io/') ? new Response('private-eleven-key', { status: 402 }) : realFetch(url, init));
  const response = await fetch(endpoint, options()); expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: 'Voice generation unavailable.', reason: 'payment' });
});
