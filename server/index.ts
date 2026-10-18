import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import {attachTranslationTrial} from './realtimeTranslation';
import { benchmarkArtifacts } from './benchmarkArtifacts';
import { attachContinuousVoice } from './continuousVoice';
import { attachLiveTranscription } from './liveTranscription';
import {attachContinuousTranscription} from './continuousTranscription';
import { handleApi, json } from './api';
import { modelConfig } from './models';
import { opening, phrases } from '../src/config/phrases';
import { allScriptLines } from '../src/config/scenarios';
import { elevenLabsConfig, publicVoiceConfig } from './voice';
import { fixedPhrases, phraseHash, audioVersion } from './audioAssets';

// Validate required voice configuration before opening Vite or any listener.
try { elevenLabsConfig(); } catch (error) { console.error(error instanceof Error ? error.message : 'Invalid ElevenLabs configuration.'); process.exit(1); }
const production = process.argv.includes('--production');
const vite = production ? undefined : await (await import('vite')).createServer({ server: { middlewareMode: true, hmr: { host: '127.0.0.1' } }, appType: 'spa' });
const server = createServer(async (req, res) => {
  try {
    const route = req.url?.split('?')[0];
    if (route === '/api/health') {
      const assets = [opening.id, ...phrases.map(p => p.id), ...allScriptLines.map(l => l.id)];
      let manifest: Record<string, { hash?: string;provider?:string;voice?:string;model?:string;audioSha256?:string }> = {};
      try { manifest = JSON.parse(await readFile(resolve('public/audio/manifest.json'), 'utf8')); } catch { /* missing manifest */ }
      const voiceConfig = elevenLabsConfig();
      const stale = fixedPhrases.filter(p => manifest[p.id]?.hash !== phraseHash(p.id, p.da, voiceConfig)||manifest[p.id]?.provider!=='ElevenLabs'||manifest[p.id]?.voice!==voiceConfig.voiceId||manifest[p.id]?.model!==voiceConfig.modelId).map(p => p.id);
      const absent = (await Promise.all(assets.map(async id => { try { await readFile(resolve('public/audio', `${id}.wav`)); return ''; } catch { return id; } }))).filter(Boolean);
      return json(res, 200, { ready: Boolean(process.env.OPENAI_API_KEY), directTranslationAvailable: !production, missingAudio: [...new Set([...absent, ...stale])], audioVersion: audioVersion(voiceConfig), cachedVoices:Object.fromEntries(fixedPhrases.map(p=>[`/audio/${p.id}.wav`,{provider:manifest[p.id]?.provider,voiceId:manifest[p.id]?.voice,modelId:manifest[p.id]?.model,audioSha256:manifest[p.id]?.audioSha256}])), cachedPhrases: fixedPhrases.map(p => `/audio/${p.id}.wav`), models: modelConfig(), danishVoice: publicVoiceConfig() });
    }
    if(!production&&route==='/api/developer/stage17-artifact')return await benchmarkArtifacts(req,res);
    if (route?.startsWith('/api/')) {
      if (!['/api/interpret/unit', '/api/plan', '/api/transcribe', '/api/translate', '/api/translate/stream', '/api/speech', '/api/speech/stream'].includes(route)) return json(res, 404, { error: 'Unknown API endpoint.' });
      return await handleApi(req, res, route);
    }
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    if (vite) return vite.middlewares(req, res);
    if (pathname.split('/').some(segment => segment.startsWith('.'))) { res.writeHead(404); return res.end('Not found'); }
    const root = resolve('dist');
    const path = resolve(root, `.${pathname}`);
    if (!path.startsWith(`${root}/`) && path !== root) { res.writeHead(403); return res.end(); }
    const file = extname(path) ? path : resolve(root, 'index.html');
    const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
    try { const data = await readFile(file); res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' }); res.end(data); }
    catch { res.writeHead(404); res.end('Not found'); }
  } catch { if (!res.headersSent) json(res, 500, { error: 'Request failed.' }); else res.end(); }
});
const stopTranscription = attachLiveTranscription(server);
const stopContinuousTranscription=attachContinuousTranscription(server);
const stopVoice = attachContinuousVoice(server);
const stopTranslationTrial = production?()=>{}:attachTranslationTrial(server);
server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(error.code === 'EADDRINUSE'
    ? 'Port 5173 is already in use. Open http://localhost:5173 to use the running app, or stop that server before running npm run dev again.'
    : `Unable to start the translator server (${error.code ?? 'unknown error'}).`);
  process.exitCode = 1;
  void vite?.close().catch(() => { console.error('Unable to close the development server.'); });
});
server.listen(5173, '127.0.0.1', () => console.info('Translator: http://localhost:5173'));
function shutdown() { stopTranslationTrial(); stopVoice(); stopTranscription(); stopContinuousTranscription(); server.close(); void vite?.close(); }
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
