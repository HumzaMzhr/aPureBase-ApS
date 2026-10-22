/** Local evidence collector only. No production server changes or provider calls. */
import {createServer,request as httpRequest} from 'node:http';
import WebSocket,{WebSocketServer} from 'ws';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const folder=resolve('benchmarks/stage196-stress-50-20261017');
const config=JSON.parse(await readFile(join(folder,'config.json'),'utf8'));
let stopped=false,current=null,infraFailures=0,lastHeartbeat=null,cooldownUntil=0;
const attempts=[];
async function restore(){for(const name of (await readdir(join(folder,'runs'))).filter(n=>/^\d{3}$/.test(n)).sort()){
 const start=JSON.parse(await readFile(join(folder,'runs',name,'start.json'),'utf8'));let result=null;
 try{result=JSON.parse(await readFile(join(folder,'runs',name,'review.json'),'utf8'));}catch{stopped=true;}
 attempts.push({...start,completed:Boolean(result),status:result?.status??'interrupted'});
}}
await restore();
async function state(){const value={batchId:config.batchId,requested:config.maxAttempts,started:attempts.length,completed:attempts.filter(a=>a.completed).length,stopped,current,cooldownUntil,lastHeartbeat,attempts};await writeFile(join(folder,'progress.json'),JSON.stringify(value,null,2)+'\n');return value;}
const server=createServer(async(req,res)=>{
 try{
  const origin=req.headers.origin;
  if(origin&&!['http://localhost:5173','http://127.0.0.1:5173','http://localhost:5174','http://127.0.0.1:5174'].includes(origin)){res.writeHead(403);res.end();return;}
  res.setHeader('Access-Control-Allow-Origin',origin??'http://localhost:5173');res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Cache-Control','no-store');
  if(req.url?.startsWith('/api/')){const upstream=httpRequest({hostname:'127.0.0.1',port:5173,path:req.url,method:req.method,headers:{...req.headers,host:'localhost:5173',origin:'http://localhost:5173'}},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end('Local backend proxy failed');});req.pipe(upstream);return;}
  if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(await readFile(resolve('scripts/stage196-stress.html')));return;}
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const url=new URL(req.url,'http://localhost:5174');const json=(value,code=200)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  if(req.method==='GET'&&url.pathname==='/config'){json({...config,productionFingerprints:undefined});return;}
  if(req.method==='GET'&&url.pathname==='/status'){json(await state());return;}
  if(req.method==='GET'&&url.pathname.startsWith('/source/')){const source=config.sources.find(s=>'/source/'+s.file===url.pathname);if(!source){json({error:'not_found'},404);return;}res.writeHead(200,{'Content-Type':'audio/wav'});res.end(await readFile(join(folder,'sources',source.file)));return;}
  if(req.method!=='POST'||!origin){json({error:'read_only_or_origin_required'},403);return;}
  const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>64*1024*1024)throw new Error('artifact_too_large');chunks.push(c);}const body=Buffer.concat(chunks);
  if(url.pathname==='/claim'){
   if(!stopped&&Date.now()<cooldownUntil){json({waitMs:cooldownUntil-Date.now()});return;}
   if(stopped||current||attempts.length>=config.maxAttempts){json({done:true,stopped,busy:Boolean(current)});return;}
   for(const [path,hash]of Object.entries(config.productionFingerprints)){if(createHash('sha256').update(await readFile(resolve(path))).digest('hex')!==hash){stopped=true;throw new Error('production_changed:'+path);}}
   const index=attempts.length+1,source=config.sources[(index-1)%config.sources.length],runId=String(index).padStart(3,'0');
   const entry={index,runId,profile:source.id,startedAt:new Date().toISOString(),completed:false};attempts.push(entry);current=runId;
   await mkdir(join(folder,'runs',runId));await writeFile(join(folder,'runs',runId,'start.json'),JSON.stringify(entry,null,2));await state();json({...entry,source,runTimeoutMs:config.runTimeoutMs});return;
  }
  if(url.pathname==='/stop'){stopped=true;await state();json({stopped:true});return;}
  const evidenceMatch=url.pathname.match(/^\/run\/(\d{3})\/evidence\/(\d+)$/);
  if(evidenceMatch){
   const [,id,chunk]=evidenceMatch;if(!attempts.some(a=>a.runId===id)){json({error:'unknown_run'},404);return;}
   const dir=join(folder,'runs',id,'evidence');await mkdir(dir,{recursive:true});
   const path=join(dir,String(chunk).padStart(6,'0')+'.jsonl');
   try{const prior=await readFile(path);if(!prior.equals(body)){json({error:'evidence_chunk_exists'},409);return;}}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(path,body);}
   json({saved:true,stop:stopped});return;
  }
  const match=url.pathname.match(/^\/run\/(\d{3})\/(heartbeat|source-end|review|diagnostics|provider-pcm)$/);
  if(!match||!attempts.some(a=>a.runId===match[1])){json({error:'unknown_run'},404);return;}
  const [,id,kind]=match;
  if(kind==='heartbeat'){lastHeartbeat={runId:id,at:new Date().toISOString(),...JSON.parse(body)};await state();json({saved:true,stop:stopped});return;}
  const path=join(folder,'runs',id,kind+(kind==='provider-pcm'?'.pcm':'.json'));
  // Preserve completed artifacts; a retry may only repeat identical bytes.
  try{const existing=await readFile(path);if(!existing.equals(body)){json({error:'artifact_exists'},409);return;}}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(path,body);}
  if(kind==='review'){
   const result=JSON.parse(body),attempt=attempts.find(a=>a.runId===id);attempt.completed=true;attempt.status=result.status;attempt.finishedAt=new Date().toISOString();attempt.error=result.error;attempt.sessionId=result.diagnosticsSessionId;current=null;
   if(result.error&&/quota|payment|authentication|429|403|401|not_ready|setup failed|connection failed|unavailable|timed out|Recognition ended/i.test(result.error))infraFailures++;else infraFailures=0;
   if(infraFailures>=config.consecutiveInfrastructureFailureLimit){cooldownUntil=Date.now()+60000;infraFailures=0;}
  }
  await state();json({saved:true,stop:stopped});
 }catch(error){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
});
const relay=new WebSocketServer({noServer:true,maxPayload:2*1024*1024});
server.on('upgrade',(req,socket,head)=>{
 if(!['http://localhost:5174','http://127.0.0.1:5174'].includes(req.headers.origin)||!/^\/api\/(transcription\/continuous|voice\/live)\?/.test(req.url??'')){socket.destroy();return;}
 relay.handleUpgrade(req,socket,head,client=>{
  const start=Date.now(),upstream=new WebSocket('ws://127.0.0.1:5173'+req.url,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'},maxPayload:2*1024*1024});
  const log=(event,code,reason)=>{const line=JSON.stringify({at:new Date().toISOString(),runId:current,path:req.url,event,code,reason:String(reason??'').slice(0,120),elapsedMs:Date.now()-start});console.info(line);};
  client.on('message',(raw,binary)=>{if(upstream.readyState===WebSocket.OPEN)upstream.send(raw,{binary});else{log('early_client_message');client.close();}});
  upstream.on('message',(raw,binary)=>{if(client.readyState===WebSocket.OPEN)client.send(raw,{binary});});
  upstream.on('close',(code,reason)=>{log('backend_connection_closed',code,reason);if(client.readyState===WebSocket.OPEN)client.close();});
  client.on('close',(code,reason)=>{log('browser_connection_closed',code,reason);upstream.terminate();});
  upstream.on('error',error=>{log('backend_connection_error',undefined,error.message);client.close();});client.on('error',error=>{log('browser_connection_error',undefined,error.message);upstream.terminate();});
 });
});
server.listen(5174,'127.0.0.1',()=>console.info('Batch collector http://127.0.0.1:5174; max=50; serial; no provider calls by collector'));
