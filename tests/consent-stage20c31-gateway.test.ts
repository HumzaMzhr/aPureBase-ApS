import {it,expect,vi} from 'vitest';
import WebSocket,{WebSocketServer} from 'ws';
import {createRetestServer} from '../server/consentRetest';
import type {AddressInfo} from 'node:net';
it('reproduces pre-ready local 403 without a key, then reuses unchanged gateway for ready/commit/final using only loopback provider mocks',async()=>{
 const upstream=new WebSocketServer({port:0,host:'127.0.0.1'});await new Promise<void>(r=>upstream.once('listening',r));let providerConnections=0;
 upstream.on('connection',ws=>ws.on('message',raw=>{const e=JSON.parse(raw.toString());if(e.type==='session.update'){expect(e.session.audio.input.transcription.languages).toEqual(['da']);ws.send(JSON.stringify({type:'session.updated'}));}if(e.type==='input_audio_buffer.commit'){ws.send(JSON.stringify({type:'input_audio_buffer.committed',item_id:'one'}));ws.send(JSON.stringify({type:'conversation.item.input_audio_transcription.completed',item_id:'one',transcript:'Det er mig'}));}}));
 const app=await createRetestServer(()=>{providerConnections++;return new WebSocket('ws://127.0.0.1:'+(upstream.address()as AddressInfo).port);});await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const port=(app.server.address()as AddressInfo).port;
 const options={headers:{Origin:'http://127.0.0.1:5173',Host:'127.0.0.1:5173'}};
 try{vi.stubEnv('OPENAI_API_KEY','');const health=await fetch('http://127.0.0.1:'+port+'/api/c31/health');expect(health.headers.get('content-type')).toBe('application/json');expect(await health.json()).toMatchObject({stage:'2.0c31',gateway:true,configured:false});
  const denied=new WebSocket('ws://127.0.0.1:'+port+'/api/transcription/continuous?language=da',options);const code=await new Promise<number>(resolve=>{denied.on('unexpected-response',(_q,r)=>{resolve(r.statusCode!);r.resume();denied.terminate();});denied.on('error',()=>{});});expect(code).toBe(403);expect(providerConnections).toBe(0);
  vi.stubEnv('OPENAI_API_KEY','LOCAL-MOCK-NOT-A-CREDENTIAL');const ws=new WebSocket('ws://127.0.0.1:'+port+'/api/transcription/continuous?language=da',options);
  const final=await new Promise<string>((resolve,reject)=>{ws.on('error',reject);ws.on('message',raw=>{const e=JSON.parse(raw.toString());if(e.type==='ready'){ws.send(new Uint8Array(9600));ws.send(JSON.stringify({type:'commit',generation:0}));}if(e.type==='final'){resolve(e.text);ws.close();}});});expect(final).toBe('Det er mig');expect(providerConnections).toBe(1);
 }finally{vi.unstubAllEnvs();await app.close();upstream.clients.forEach(w=>w.terminate());await new Promise<void>(r=>upstream.close(()=>r()));}
},20000);
