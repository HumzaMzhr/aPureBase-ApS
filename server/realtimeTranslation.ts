import type {Server} from 'node:http';
import WebSocket,{WebSocketServer} from 'ws';

/** Development-only comparison. Direct audio bypasses the semantic/precision gates. */
export function attachTranslationTrial(server:Server,connect=()=>new WebSocket('wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate',{
 headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'OpenAI-Safety-Identifier':'apurebase-fictional-latency-trial'},maxPayload:3*1024*1024
})){
 const gateway=new WebSocketServer({noServer:true,maxPayload:24000});let active=0;
 server.on('upgrade',(req,socket,head)=>{
  const url=new URL(req.url??'/','http://localhost');if(url.pathname!=='/api/developer/translation/live')return;
  const language=url.searchParams.get('language');const allowed=new Set(['http://localhost:5173','http://127.0.0.1:5173']);
  if(!allowed.has(req.headers.origin??'')||!allowed.has(`http://${req.headers.host}`)||language!=='da'||!process.env.OPENAI_API_KEY||active>=2){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  gateway.handleUpgrade(req,socket,head,client=>{
   active++;let closed=false,ready=false,ending=false,done=false,inputBytes=0,outputBytes=0;const captionBytes={source:0,target:0};const ids=new Set<string>();const upstream=connect();
   const send=(data:unknown)=>{if(client.readyState===WebSocket.OPEN)client.send(JSON.stringify(data));};
   const close=()=>{if(closed)return;closed=true;active--;clearTimeout(lifetime);clearTimeout(drain);upstream.terminate();client.close();};
   const fail=(code='translation_unavailable')=>{send({type:'error',code,error:'Direct translation trial failed. No automatic replay.'});close();};
   const lifetime=setTimeout(()=>fail('session_timeout'),120000);let drain:ReturnType<typeof setTimeout>|undefined;
   upstream.on('open',()=>upstream.send(JSON.stringify({type:'session.update',session:{audio:{input:{transcription:{model:'gpt-realtime-whisper'}},output:{language:'en'}}}})));
   upstream.on('message',raw=>{if(closed)return;try{
    const event=JSON.parse(raw.toString());if(event.type==='error')return fail(typeof event.error?.code==='string'?event.error.code:'provider_error');
    if(event.type==='session.updated'){
     const format=event.session?.audio?.output?.format;if(format&&(format.type!=='audio/pcm'||format.rate!==24000))return fail('unsupported_output_format');
     ready=true;send({type:'ready',model:event.session?.model??'gpt-realtime-translate',outputLanguage:'en',sampleRate:24000});
    }
    if(['session.input_transcript.delta','session.output_transcript.delta','session.output_audio.delta'].includes(event.type)){
     if(!ready)return fail('premature_output');if(event.event_id){if(ids.has(event.event_id))return;ids.add(event.event_id);if(ids.size>3000)return fail('event_limit');}
     if(typeof event.delta!=='string')return fail('invalid_delta');
     if(event.type==='session.output_audio.delta'){
      if((event.sample_rate!==undefined&&event.sample_rate!==24000)||(event.channels!==undefined&&event.channels!==1)||(event.format!==undefined&&event.format!=='pcm16'))return fail('unsupported_output_format');
      const pcm=Buffer.from(event.delta,'base64');outputBytes+=pcm.length;
      if(!pcm.length||pcm.length%2||outputBytes>20*1024*1024||client.bufferedAmount>2*1024*1024)return fail('audio_limit');send({type:'audio_meta',sampleRate:event.sample_rate??24000,channels:event.channels??1,format:event.format??'pcm16',elapsedMs:event.elapsed_ms});client.send(pcm);
     }else{const lane=event.type==='session.input_transcript.delta'?'source':'target';captionBytes[lane]+=event.delta.length;if(captionBytes[lane]>12000)return fail('transcript_limit');send({type:'caption',lane,text:event.delta,elapsedMs:event.elapsed_ms});}
    }
    if(event.type==='session.closed'){if(!ending||done)return fail('premature_close');done=true;send({type:'done'});close();}
   }catch{fail('invalid_provider_event');}});
   client.on('message',(raw,binary)=>{if(closed)return;try{
    if(!ready||ending||upstream.readyState!==WebSocket.OPEN||upstream.bufferedAmount>1024*1024)return fail('source_backpressure');
    if(binary){const pcm=Buffer.isBuffer(raw)?raw:Array.isArray(raw)?Buffer.concat(raw):Buffer.from(raw as ArrayBuffer);inputBytes+=pcm.length;if(!pcm.length||pcm.length%2||pcm.length>24000||inputBytes>20*1024*1024)return fail('source_limit');upstream.send(JSON.stringify({type:'session.input_audio_buffer.append',audio:pcm.toString('base64')}));}
    else{const command=JSON.parse(raw.toString());if(command.type!=='finish'||inputBytes<4800)return fail('invalid_command');ending=true;upstream.send(JSON.stringify({type:'session.close'}));drain=setTimeout(()=>fail('drain_timeout'),45000);}
   }catch{fail('invalid_source_event');}});
   upstream.on('error',()=>fail('transport_error'));upstream.on('close',()=>{if(!closed&&!done)fail('provider_disconnected');});client.on('close',close);client.on('error',close);
  });
 });
 return()=>{gateway.clients.forEach(c=>c.terminate());gateway.close();};
}
