/** Dedicated loopback C-3.1 launcher. Reuses unchanged Stage 1.9.6 ASR gateway. */
import 'dotenv/config';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {attachContinuousTranscription} from './continuousTranscription';
import {createServer as createVite} from 'vite';
import WebSocket from 'ws';
import {modelConfig} from './models';
import {attachRetestFallback,handleRetestFallback} from './consentRetestFallback';
import {listeningCatalog} from '../src/consent/acceptance/catalog';
export function preflightHealth(env:NodeJS.ProcessEnv=process.env){return{stage:'2.0c31',gateway:true,configured:!!env.OPENAI_API_KEY?.trim(),model:env.OPENAI_LIVE_TRANSCRIBE_MODEL||'gpt-live-transcribe',language:'da',sampleRate:24000,providerAuthorization:'NOT_TESTED_UNTIL_EXPLICIT_MICROPHONE_START',allowedOrigins:['http://127.0.0.1:5173','http://localhost:5173'],providerRequestsOnHealth:0};}
export async function createRetestServer(connect?:Parameters<typeof attachContinuousTranscription>[1]){
 const diagnostics:{provider?:{stage:string;httpStatus?:number;code?:string};localUpgrade?:{originAllowed:boolean;hostAllowed:boolean;configured:boolean}}={};
 const provider=connect??(()=>{const ws=new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription',{headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY},maxPayload:2*1024*1024});ws.on('unexpected-response',(_req,response)=>{diagnostics.provider={stage:'HTTP_UPGRADE_REJECTED',httpStatus:response.statusCode};response.resume();ws.terminate();});ws.on('error',(e:NodeJS.ErrnoException)=>{if(!diagnostics.provider?.httpStatus)diagnostics.provider={stage:'NETWORK_OR_TRANSPORT_ERROR',code:e.code&&/^[A-Z0-9_]{1,40}$/u.test(e.code)?e.code:'UNAVAILABLE'};});ws.on('open',()=>{diagnostics.provider={stage:'WEBSOCKET_OPEN_SESSION_UPDATE_PENDING'};});ws.on('message',raw=>{try{const e=JSON.parse(raw.toString());if(e.type==='session.updated')diagnostics.provider={stage:'SESSION_READY'};if(e.type==='error')diagnostics.provider={stage:'SESSION_REJECTED',code:typeof e.error?.code==='string'&&/^[a-zA-Z0-9_.-]{1,80}$/u.test(e.error.code)?e.error.code:'PROVIDER_ERROR'};}catch{/* Do not log provider text or credentials. */}});return ws;});
 const server=createServer(async(req,res)=>{try{
  const pathname=new URL(req.url??'/','http://127.0.0.1').pathname;
  if(pathname==='/api/c31/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({...preflightHealth(),diagnostics}));return;}
  if(pathname.startsWith('/api/c31/media/')){const hash=pathname.slice('/api/c31/media/'.length).replace(/\.wav$/u,'');const a=listeningCatalog.find(a=>a.assetHash===hash&&'binding'in a);if(!a||!('binding'in a))throw new Error('Unknown frozen asset');const bytes=await readFile(resolve('benchmarks/stage20c2-dynamic-cache',a.binding.cacheKey+'.wav'));res.writeHead(200,{'Content-Type':'audio/wav','Cache-Control':'no-store'});res.end(bytes);return;}
  if(await handleRetestFallback(req,res,pathname))return;
  if(pathname.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Use C-3.1 health and existing continuous recognition gateway only.'}));return;}
  vite.middlewares(req,res);
 }catch{res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Local cached resource unavailable; no regeneration.'}));}});
 const vite=await createVite({server:{middlewareMode:true,hmr:{server}},appType:'spa'});
 server.prependListener('upgrade',req=>{if(req.url?.startsWith('/api/transcription/continuous')){const allowed=['http://127.0.0.1:5173','http://localhost:5173'];diagnostics.localUpgrade={originAllowed:allowed.includes(req.headers.origin??''),hostAllowed:allowed.includes('http://'+req.headers.host),configured:!!process.env.OPENAI_API_KEY?.trim()};}});
 const stop=attachContinuousTranscription(server,provider),stopFallback=attachRetestFallback(server);
 return{server,close:async()=>{stop();stopFallback();await new Promise<void>(r=>server.close(()=>r()));await vite.close();},model:modelConfig().liveTranscription};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const app=await createRetestServer();app.server.on('error',e=>{console.error('C-3.1 listener failed:',(e as NodeJS.ErrnoException).code);void app.close();});app.server.listen(5173,'127.0.0.1',()=>console.log('C-3.1 retest: http://127.0.0.1:5173/consent-call?stage=2.0c31 (no provider session started)'));let stopping=false;for(const signal of ['SIGINT','SIGTERM']as const)process.once(signal,()=>{if(!stopping){stopping=true;void app.close();}});}
