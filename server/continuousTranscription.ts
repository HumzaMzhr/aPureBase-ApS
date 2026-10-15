import type {Server} from 'node:http';
import WebSocket,{WebSocketServer} from 'ws';
import {transcriptionSession} from './liveTranscription';
import {modelConfig} from './models';

interface Item {generation:number;bytes:number;itemId?:string;committed:boolean;acknowledged:boolean;text:string;final?:string;events:Set<string>}
/** One persistent recognition socket. Commit does not stop the next audio buffer. */
export function attachContinuousTranscription(server:Server,connect=()=>new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription',{headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},maxPayload:2*1024*1024})){
 const gateway=new WebSocketServer({noServer:true,maxPayload:24000});let active=0;
 server.on('upgrade',(req,socket,head)=>{
  const url=new URL(req.url??'/','http://localhost');if(url.pathname!=='/api/transcription/continuous')return;
  const origins=new Set(['http://localhost:5173','http://127.0.0.1:5173']),language=url.searchParams.get('language');
  if(!origins.has(req.headers.origin??'')||!origins.has(`http://${req.headers.host}`)||!['en','da'].includes(language??'')||!process.env.OPENAI_API_KEY||active>=2){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  gateway.handleUpgrade(req,socket,head,client=>{
   active++;let closed=false,ready=false,generation=0,totalBytes=0;
   const items=new Map<number,Item>(),byId=new Map<string,Item>(),commits:Item[]=[];
   const unknown=new Map<string,{text:string;final?:string;events:Set<string>}>();
   const completedIds=new Set<string>(),acknowledgedIds=new Set<string>();
   const timers=new Map<number,ReturnType<typeof setTimeout>>();
   const make=(n:number):Item=>({generation:n,bytes:0,committed:false,acknowledged:false,text:'',events:new Set()});items.set(0,make(0));
   let upstream:WebSocket;
   const send=(event:unknown)=>{if(!closed&&client.readyState===WebSocket.OPEN)client.send(JSON.stringify(event));};
   const close=()=>{if(closed)return;closed=true;active--;clearTimeout(lifetime);for(const timer of timers.values())clearTimeout(timer);timers.clear();upstream?.terminate();client.close();};
   const fail=(code:string)=>{send({type:'error',code});close();};
   const lifetime=setTimeout(()=>fail('session_limit'),600000);
   try{upstream=connect();}catch{fail('connection_failed');return;}
   const deliver=(item:Item)=>{
    if(item.text)send({type:'partial',generation:item.generation,text:item.text,itemId:item.itemId});
    if(item.final!==undefined&&item.committed&&item.acknowledged&&item.itemId){
     send({type:'final',generation:item.generation,text:item.final,itemId:item.itemId});
     clearTimeout(timers.get(item.generation));timers.delete(item.generation);items.delete(item.generation);byId.delete(item.itemId);
     completedIds.add(item.itemId);if(completedIds.size>200)fail('session_limit');
    }
   };
   const owner=(id:string)=>{
    const existing=byId.get(id);if(existing)return existing;
    // If an earlier item has no ID yet, retain text until its commit acknowledgment
    // establishes ownership. Never assign a late old delta to the new microphone turn.
    if(commits.some(item=>!item.itemId))return;
    const current=items.get(generation)!;if(current.itemId)return;
    current.itemId=id;byId.set(id,current);const retained=unknown.get(id);if(retained){current.text=retained.text;current.final=retained.final;current.events=retained.events;unknown.delete(id);}return current;
   };
   upstream.on('open',()=>{if(!closed)upstream.send(JSON.stringify(transcriptionSession(language as 'en'|'da')));});
   upstream.on('message',raw=>{
    if(closed)return;
    try{
     const event=JSON.parse(raw.toString());
     if(event.type==='session.updated'){if(ready)return;ready=true;send({type:'ready',model:modelConfig().liveTranscription,delay:process.env.OPENAI_TRANSCRIBE_DELAY||'low',sampleRate:24000});return;}
     if(event.type==='input_audio_buffer.committed'){
      if(acknowledgedIds.has(event.item_id))return;
      const item=commits.shift();if(!item||typeof event.item_id!=='string')return fail('commit_mismatch');
      if(item.itemId&&item.itemId!==event.item_id)return fail('item_mismatch');
      const id=event.item_id as string;item.itemId=id;item.acknowledged=true;byId.set(id,item);
      acknowledgedIds.add(id);
      const retained=unknown.get(id);if(retained){item.text=retained.text;item.final=retained.final;item.events=retained.events;unknown.delete(id);}
      send({type:'committed',generation:item.generation,itemId:item.itemId});deliver(item);return;
     }
     if(['conversation.item.input_audio_transcription.delta','conversation.item.input_audio_transcription.completed'].includes(event.type)){
      if(typeof event.item_id!=='string')return fail('invalid_item');
      if(completedIds.has(event.item_id))return;
      const item=owner(event.item_id);
      let text=item??unknown.get(event.item_id);
      if(!text){if(unknown.size>=4)return fail('transcript_backpressure');text={text:'',events:new Set()};unknown.set(event.item_id,text);}
      if(typeof event.event_id==='string'){if(text.events.has(event.event_id))return;text.events.add(event.event_id);if(text.events.size>2000)return fail('transcript_limit');}
      if(event.type.endsWith('.delta')){if(typeof event.delta!=='string')return fail('invalid_delta');text.text+=event.delta;if(text.text.length>12000)return fail('transcript_limit');if(item)send({type:'partial',generation:item.generation,text:item.text,itemId:item.itemId});}
      else{if(typeof event.transcript!=='string'||!event.transcript.trim()||event.transcript.length>4000)return fail('invalid_final');text.final=event.transcript;if(item){if(!item.committed)return fail('uncommitted_final');deliver(item);}}
      return;
     }
     if(event.type==='error'||event.type==='conversation.item.input_audio_transcription.failed'){
      const code=typeof event.error?.code==='string'&&/^[a-zA-Z0-9_.-]{1,80}$/.test(event.error.code)?event.error.code:'provider_error';
      console.error('[continuous recognition]',{code});fail(code);
     }
    }catch{fail('invalid_provider_event');}
   });
   upstream.on('error',()=>fail('connection_failed'));upstream.on('close',()=>{if(!closed)fail('disconnected');});
   client.on('message',(raw,binary)=>{
    if(closed)return;
    try{
     if(!ready||upstream.readyState!==WebSocket.OPEN)return fail('not_ready');
     if(upstream.bufferedAmount>1024*1024||client.bufferedAmount>256*1024)return fail('audio_backpressure');
     const item=items.get(generation)!;
     if(binary){const bytes=Buffer.isBuffer(raw)?raw:Array.isArray(raw)?Buffer.concat(raw):Buffer.from(raw as ArrayBuffer);
      if(!bytes.length||bytes.length%2||bytes.length>24000)return fail('invalid_pcm');
      item.bytes+=bytes.length;totalBytes+=bytes.length;
      if(item.bytes>20*1024*1024||totalBytes>40*1024*1024)return fail('audio_limit');
      upstream.send(JSON.stringify({type:'input_audio_buffer.append',audio:bytes.toString('base64')}));
     }else{
      const command=JSON.parse(raw.toString());if(command.type!=='commit'||command.generation!==generation||item.bytes<4800)return fail('invalid_commit');
      if(items.size>=4)return fail('finalization_backpressure');
      item.committed=true;commits.push(item);timers.set(generation,setTimeout(()=>fail('finalization_timeout'),30000));
      upstream.send(JSON.stringify({type:'input_audio_buffer.commit'}));
      generation++;items.set(generation,make(generation));
     }
    }catch{fail('invalid_client_event');}
   });
   client.on('close',close);client.on('error',close);
  });
 });
 return()=>{gateway.clients.forEach(client=>client.terminate());gateway.close();};
}
