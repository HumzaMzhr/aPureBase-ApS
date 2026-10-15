/** Incremental SSE parser shared by the server and browser; handles UTF-8/chunk splits. */
export async function* readSse(body: ReadableStream<Uint8Array>) {
  const reader=body.getReader();const decoder=new TextDecoder();let buffer='';let received=0;
  const parse=(frame:string)=>{
    const data=frame.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
    if(!data||data==='[DONE]')return undefined;return JSON.parse(data) as Record<string, unknown>;
  };
  try{
    for(;;){const {done,value}=await reader.read();if(done)break;received+=value.byteLength;if(received>2*1024*1024)throw new Error('Response stream exceeds limit.');buffer=(buffer+decoder.decode(value,{stream:true})).replace(/\r\n/g,'\n');
      let end;while((end=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,end);buffer=buffer.slice(end+2);const event=parse(frame);if(event)yield event;}
    }
    buffer+=decoder.decode();if(buffer.trim()){const event=parse(buffer);if(event)yield event;}
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
