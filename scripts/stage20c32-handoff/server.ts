/** Handoff-only loopback host. No TTS route, no .env autoload, no provider at boot/health. */
import {createServer} from 'node:http';
import {readFile,realpath,mkdir,writeFile,unlink} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {attachContinuousTranscription} from '../../server/continuousTranscription';
const root=resolve(fileURLToPath(new URL('.',import.meta.url))),app=resolve(root,'app');
const data=JSON.parse(await readFile(resolve(root,'review-data.json'),'utf8'));
const stateDirectory=process.env.APUREBASE_STATE_DIR??resolve(process.env.HOME??'','Library/Application Support/aPureBase-C32-Retest');
const stateFile=resolve(stateDirectory,'server-'+createHash('sha256').update(root).digest('hex').slice(0,16)+'.json');
const verifyOnly=process.env.APUREBASE_VERIFICATION_ONLY==='1';
if(verifyOnly)delete process.env.OPENAI_API_KEY;
else if(!process.env.OPENAI_API_KEY){try{process.env.OPENAI_API_KEY=(await readFile(resolve(process.env.HOME??'','Library/Application Support/aPureBase-C32-Retest/openai-asr-key.txt'),'utf8')).trim();}catch{/* Listening works without a key. */}}
// No inherited alternate model/profile can alter the validated recognition settings.
process.env.OPENAI_LIVE_TRANSCRIBE_MODEL='gpt-live-transcribe';process.env.OPENAI_TRANSCRIBE_DELAY='low';
let permitUntil=0;const bootId=crypto.randomUUID();
const inner=createServer();const closeGateway=attachContinuousTranscription(inner);
const json=(res:import('node:http').ServerResponse,status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const server=createServer(async(req,res)=>{
 try{
  if(!['127.0.0.1:5173','localhost:5173'].includes(req.headers.host??''))return json(res,403,{error:'Loopback host required'});
  const path=decodeURIComponent(new URL(req.url??'/','http://127.0.0.1:5173').pathname);
  if(path==='/api/c31/health')return json(res,200,{stage:'2.0c31',gateway:true,configured:!verifyOnly&&!!process.env.OPENAI_API_KEY,model:'gpt-live-transcribe',language:'da',sampleRate:24000,packageVersion:data.identity.packageVersion,candidateSourceHash:data.identity.candidateSourceHash,bootId,processId:process.pid,providerAuthorization:'NOT_TESTED_UNTIL_MANUAL_START',providerRequestsOnHealth:0,verificationOnly:verifyOnly});
  if(path==='/api/package/arm-asr'){
   if(req.method!=='POST'||!['http://127.0.0.1:5173','http://localhost:5173'].includes(req.headers.origin??''))return json(res,403,{error:'Same-origin explicit manual start required'});
   if(verifyOnly||!process.env.OPENAI_API_KEY)return json(res,403,{error:verifyOnly?'CONSTRUCTION_VERIFICATION_NO_PROVIDER':'MISSING_CREDENTIAL'});
   permitUntil=Date.now()+30000;return json(res,200,{armed:true,expiresMs:30000});
  }
  if(req.method!=='GET')return json(res,405,{error:'Unsupported method'});
  if(path==='/review-data.json')return json(res,200,data);
  const media=data.allCurrentAssets.find((a:{loadURL:string})=>a.loadURL===path);
  const file=media?resolve(app,media.path.slice(1)):resolve(app,path==='/'?'stage20c32-retest.html':path.slice(1));
  if(path.startsWith('/api/')&&!media)return json(res,404,{error:'Only current cached media, local health and manually armed recognition exist'});
  if(!file.startsWith(app+sep))return json(res,403,{error:'Invalid path'});
  const real=await realpath(file);if(!real.startsWith(app+sep))return json(res,403,{error:'Invalid resource'});
  const bytes=await readFile(real);
  if(media&&createHash('sha256').update(bytes).digest('hex')!==media.assetHash)return json(res,409,{error:'Packaged/current WAV hash mismatch'});
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.wav':'audio/wav','.json':'application/json','.jpg':'image/jpeg'} as Record<string,string>)[extname(file)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' ws://127.0.0.1:5173 ws://localhost:5173; media-src 'self' blob:; worker-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'"});res.end(bytes);
 }catch{json(res,404,{error:'Packaged resource unavailable'});}
});
server.on('upgrade',(req,socket,head)=>{if(verifyOnly||Date.now()>permitUntil||req.url?.split('?')[0]!=='/api/transcription/continuous'){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}permitUntil=0;inner.emit('upgrade',req,socket,head);});
server.on('error',e=>{process.stderr.write('Local package startup failed: '+((e as NodeJS.ErrnoException).code??'UNKNOWN')+'\n');process.exitCode=1;});
server.listen(5173,'127.0.0.1',()=>{void mkdir(stateDirectory,{recursive:true,mode:0o700}).then(()=>writeFile(stateFile,JSON.stringify({pid:process.pid,bootId,candidateSourceHash:data.identity.candidateSourceHash}),{mode:0o600})).catch(()=>{process.stderr.write('Private launcher state unavailable; stop with Ctrl-C in this Terminal.\n');});process.stdout.write('aPureBase C32 retest ready: http://127.0.0.1:5173/ · no provider session started\n');});
function shutdown(){closeGateway();void unlink(stateFile).catch(()=>{});server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),1500).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
