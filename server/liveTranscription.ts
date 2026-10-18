import {transcriptionContext} from './transcriptionContext';
import type { Server } from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';
import { modelConfig } from './models';
export function transcriptionSession(language: 'da' | 'en', model = modelConfig().liveTranscription, fast = false) {
  const modern=model==='gpt-live-transcribe'||model==='gpt-transcribe';
  return {type:'session.update',session:{type:'transcription',audio:{input:{format:{type:'audio/pcm',rate:24000},transcription:{model,...(modern?{languages:[language],keywords:transcriptionContext.keywords}:{language}),...(model==='gpt-live-transcribe'?{delay:fast?'minimal':process.env.OPENAI_TRANSCRIBE_DELAY||'low'}:{}),...(model!=='gpt-realtime-whisper'?{prompt:modern?transcriptionContext.prompt:'Transcribe faithfully; do not answer or translate. Healthcare contact call. Expected spellings when spoken: Humza, Pernille, Isabella, aPureBase, Example Pharma. Humza is spelled H-u-m-z-a. Preserve professional information, spelled email addresses, numbers, dates, refusals and callbacks. Do not insert these names if not spoken.'}:{})},turn_detection:null}}}};
}
export function attachLiveTranscription(server: Server, connect = () => new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription',{headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},maxPayload:2*1024*1024})) {
  const gateway=new WebSocketServer({noServer:true,maxPayload:24000});let active=0;
  server.on('upgrade',(req,socket,head)=>{
    const url=new URL(req.url??'/','http://localhost');if(url.pathname!=='/api/transcription/live')return;
    const origins=new Set(['http://localhost:5173','http://127.0.0.1:5173']);
    const language=url.searchParams.get('language');const partials=url.searchParams.get('partials')==='1';const fast=partials&&url.searchParams.get('profile')==='fast';
    if(!origins.has(req.headers.origin??'')||!origins.has(`http://${req.headers.host}`)||!['en','da'].includes(language??'')||!process.env.OPENAI_API_KEY||active>=2){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
    gateway.handleUpgrade(req,socket,head,client=>{
      active++;const upstream=connect();
      let ready=false;let committed=false;let bytes=0;let closed=false;let itemId:string|undefined;
      const pending=new Map<string,string>();let partial='';const deltaIds=new Set<string>();
      const send=(data:unknown)=>{if(client.readyState===WebSocket.OPEN)client.send(JSON.stringify(data));};
      const close=()=>{if(closed)return;closed=true;active--;clearTimeout(lifetime);clearTimeout(finalTimeout);upstream.terminate();client.close();};
      const fail=()=>{send({type:'error',error:'Live transcription unavailable.'});close();};
      const lifetime=setTimeout(fail,185000);let finalTimeout:ReturnType<typeof setTimeout>|undefined;
      const finish=()=>{if(committed&&itemId&&pending.has(itemId)){const text=pending.get(itemId)!;if(!text.trim()||text.length>4000)return fail();send({type:'final',text});close();}};
      upstream.on('open',()=>upstream.send(JSON.stringify(transcriptionSession(language as 'en'|'da',undefined,fast))));
      upstream.on('message',raw=>{
        if(closed)return;
        try{const event=JSON.parse(raw.toString());
          if(event.type==='session.updated'){ready=true;send({type:'ready'});}
          if(partials&&event.type==='conversation.item.input_audio_transcription.delta'&&typeof event.delta==='string'&&!committed){if(event.event_id&&deltaIds.has(event.event_id))return;if(event.event_id)deltaIds.add(event.event_id);partial+=event.delta;if(partial.length>12000||deltaIds.size>2000)return fail();send({type:'partial',text:partial,itemId:event.item_id});}
          if(event.type==='input_audio_buffer.committed'){itemId=event.item_id;finish();}
          if(event.type==='conversation.item.input_audio_transcription.completed'){
            if(!committed)return fail();if(typeof event.item_id!=='string'||typeof event.transcript!=='string')return fail();pending.set(event.item_id,event.transcript);finish();
          }
          if(event.type==='error'||event.type==='conversation.item.input_audio_transcription.failed'){console.error('[transcription] provider error',{code:event.error?.code,param:event.error?.param});fail();}
        }catch{fail();}
      });
      upstream.on('error',fail);upstream.on('close',()=>{if(!closed)fail();});
      client.on('message',(raw,binary)=>{
        if(closed)return;
        try{
          if(!ready||upstream.readyState!==WebSocket.OPEN)return fail();
          const chunk=Buffer.isBuffer(raw)?raw:Array.isArray(raw)?Buffer.concat(raw):Buffer.from(raw as ArrayBuffer);
          if(binary){if(committed||chunk.length%2||chunk.length>24000)return fail();bytes+=chunk.length;if(bytes>20*1024*1024||upstream.bufferedAmount>1024*1024)return fail();upstream.send(JSON.stringify({type:'input_audio_buffer.append',audio:chunk.toString('base64')}));}
          else{const command=JSON.parse(raw.toString());if(command.type!=='commit'||committed||bytes<4800)return fail();committed=true;upstream.send(JSON.stringify({type:'input_audio_buffer.commit'}));finalTimeout=setTimeout(fail,30000);}
        }catch{fail();}
      });
      client.on('close',close);client.on('error',close);
    });
  });
  return ()=>{gateway.clients.forEach(client=>client.terminate());gateway.close();};
}
