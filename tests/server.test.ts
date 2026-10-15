import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { handleApi, translate, speech, transcribe } from '../server/api';
let upstream: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'server-only-sentinel');
  vi.stubEnv('OPENAI_TRANSLATION_MODEL','gpt-5.5');
  upstream = vi.fn(async () => new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'No, thank you.' }] }] })));
  vi.stubGlobal('fetch', upstream);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function request(body = '{"text":"Nej tak.","language":"da"}', origin = 'http://localhost:5173', host = 'localhost:5173', method = 'POST', path = '/api/translate') {
  const req = Object.assign(Readable.from([body]), { method, headers: { origin, host, 'content-type': 'application/json' } });
  const res = Object.assign(new EventEmitter(), { writeHead: vi.fn(), end: vi.fn(), writableEnded: false, destroyed: false });
  await handleApi(req as unknown as IncomingMessage, res as unknown as ServerResponse, path);
  return { status: res.writeHead.mock.calls[0][0], headers: res.writeHead.mock.calls[0][1], body: res.end.mock.calls[0][0] as string };
}
it('keeps API credentials upstream and turns uncached', async () => {
  const result = await request(); expect(result.status).toBe(200); expect(result.headers['Cache-Control']).toBe('no-store');
  expect(result.body).not.toContain('server-only-sentinel');
  expect(upstream.mock.calls[0][1].headers.Authorization).toBe('Bearer server-only-sentinel');
  expect(JSON.parse(upstream.mock.calls[0][1].body).store).toBe(false);
});
it('rejects cross-origin/rebinding requests', async () => {
  expect((await request(undefined,'https://other.example')).status).toBe(403);
  expect((await request(undefined,undefined,'attacker.example:5173')).status).toBe(403); expect(upstream).not.toHaveBeenCalled();
});
it('validates complete text, language, method and bounded request size', async () => {
  expect((await request('{"text":"test","language":"fr"}')).status).toBe(400);
  expect((await request('invalid')).status).toBe(400);
  expect((await request('{"text":"","language":"da"}')).status).toBe(400);
  expect((await request('a'.repeat(24001))).status).toBe(413);
  expect((await request(undefined,undefined,undefined,'GET')).status).toBe(405); expect(upstream).not.toHaveBeenCalled();
});
it('reports missing key and sanitized upstream errors', async () => {
  vi.stubEnv('OPENAI_API_KEY',''); expect((await request()).status).toBe(503);
  vi.stubEnv('OPENAI_API_KEY','server-only-sentinel'); upstream.mockResolvedValue(new Response('server-only-sentinel',{status:401}));
  const failed=await request(); expect(failed.status).toBe(502); expect(failed.body).not.toContain('server-only-sentinel');
});
it('faithful interpretation prompt preserves refusals, callback and consent uncertainty', async () => {
  await translate('Jeg skal lige spørge lægen først.','da');
  const body=JSON.parse(upstream.mock.calls[0][1].body);
  expect(body.instructions).toContain('not agreement'); expect(body.instructions).toContain('refusals'); expect(body.instructions).toContain('ringe igen');
  expect(body.instructions).toContain('Never answer'); expect(body).not.toHaveProperty('tools');
});
it('protects company names, names and literal emails byte for byte', async () => {
  upstream.mockImplementation(async (_url: string, options: {body:string}) => {
    const body=JSON.parse(options.body); return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:body.input[0].content[0].text}]}]}));
  });
  const source='aPureBase Example Pharma Humza Pernille Isabella anna-2.jensen@example.dk';
  expect(await translate(source,'da')).toBe(source);
});
it('rejects translation omitting protected names before speech generation', async () => {
  await expect(translate('aPureBase','en')).rejects.toThrow('protected');
});
it('keeps English speech generation and complete buffering unchanged', async () => {
  upstream.mockResolvedValue(new Response(new Uint8Array(2000))); const bytes=await speech('Hello','en'); expect(bytes.byteLength).toBe(2000);
  expect(JSON.parse(upstream.mock.calls[0][1].body).voice).toBe('marin');
});
it('transcribes complete files with explicit source hints and glossary', async () => {
  upstream.mockResolvedValue(new Response(JSON.stringify({text:'Hej, Pernille.'})));
  expect(await transcribe(new Blob([new Uint8Array(1000)],{type:'audio/wav'}),'da')).toBe('Hej, Pernille.');
  const form=upstream.mock.calls[0][1].body as FormData;
  expect(form.get('languages[]')).toBe('da'); expect(String(form.get('prompt'))).toContain('aPureBase'); expect(form.has('stream')).toBe(false);
});
it('honors browser backpressure instead of reading and buffering the remaining provider stream',async()=>{
  vi.stubEnv('ELEVENLABS_API_KEY','private-eleven-key');vi.stubEnv('ELEVENLABS_VOICE_ID','test-voice');vi.stubEnv('ELEVENLABS_MODEL_ID','eleven_flash_v2_5');vi.stubEnv('ELEVENLABS_VOICE_SETTINGS','');
  let pulls=0;upstream.mockResolvedValue(new Response(new ReadableStream<Uint8Array>({pull(c){pulls++;if(pulls===1)c.enqueue(new Uint8Array([1,2]));else if(pulls===2)c.enqueue(new Uint8Array([3,4]));else c.close();}},{highWaterMark:0})));
  const req=Object.assign(Readable.from([JSON.stringify({text:'Hej fra aPureBase.',language:'da'})]),{method:'POST',headers:{origin:'http://localhost:5173',host:'localhost:5173','content-type':'application/json'}});
  const res=Object.assign(new EventEmitter(),{headersSent:false,writableEnded:false,destroyed:false,writeHead:vi.fn(),write:vi.fn(()=>true).mockReturnValueOnce(false),end:vi.fn(),destroy:vi.fn()});
  const pending=handleApi(req as unknown as IncomingMessage,res as unknown as ServerResponse,'/api/speech/stream');
  await vi.waitFor(()=>expect(res.write).toHaveBeenCalledOnce());expect(pulls).toBe(1);expect(res.end).not.toHaveBeenCalled();
  res.emit('drain');await pending;expect(pulls).toBe(3);expect(res.write).toHaveBeenCalledTimes(2);expect(res.end).toHaveBeenCalledOnce();
});
it('reports the selected controlled model only when local evaluation requests telemetry',async()=>{
  vi.stubEnv('OPENAI_TRANSLATION_MODEL','fixture-ordinary');vi.stubEnv('OPENAI_CAREFUL_TRANSLATION_MODEL','fixture-careful');
  upstream.mockImplementation(async()=>new Response('data: {"type":"response.output_text.delta","delta":"Nej."}\n\ndata: {"type":"response.completed","response":{"status":"completed","output":[{"type":"message","content":[{"type":"output_text","text":"Nej."}]}]}}\n\n'));
  for(const local of [false,true]){
    const req=Object.assign(Readable.from([JSON.stringify({text:'I do not give permission.',language:'en'})]),{method:'POST',headers:{origin:'http://localhost:5173',host:'localhost:5173','content-type':'application/json',...(local?{'x-interpreter-metrics':'local'}:{})}});
    const res=Object.assign(new EventEmitter(),{headersSent:false,writableEnded:false,destroyed:false,writeHead:vi.fn(),write:vi.fn((text:string)=>{void text;return true;}),end:vi.fn()});
    await handleApi(req as unknown as IncomingMessage,res as unknown as ServerResponse,'/api/translate/stream');
    const headers=res.writeHead.mock.calls[0][1];expect(headers['X-Translation-Model']).toBe(local?'fixture-careful':undefined);
    expect(JSON.parse(upstream.mock.calls.at(-1)![1].body).model).toBe('fixture-careful');expect(res.write.mock.calls.map(([text])=>text).join('')).toContain('"text":"Nej."');
  }
});
