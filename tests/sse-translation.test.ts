import {afterEach,beforeEach,expect,it,vi}from'vitest';
import {streamTranslation}from'../server/translation';
import {readSse}from'../src/sse';
const sse=(events:unknown[])=>new Response(events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join(''));
let upstream:ReturnType<typeof vi.fn>;
beforeEach(()=>{vi.stubEnv('OPENAI_API_KEY','server-only-key');upstream=vi.fn();vi.stubGlobal('fetch',upstream);});afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('parses split UTF-8 and CRLF SSE without losing Danish characters',async()=>{
  const bytes=new TextEncoder().encode('data: {"text":"læge"}\r\n\r\ndata: {"text":"e-mail"}\r\n\r\n');
  const stream=new ReadableStream<Uint8Array>({start(c){for(const byte of bytes)c.enqueue(new Uint8Array([byte]));c.close();}});const events=[];for await(const event of readSse(stream))events.push(event);expect(events).toEqual([{text:'læge'},{text:'e-mail'}]);
});
it('measures first useful text but withholds translated speech text until completed and protected tokens validated',async()=>{
  upstream.mockResolvedValue(sse([{type:'response.output_text.delta',sequence_number:1,delta:'Hej fra __KEEP_0__.'},{type:'response.completed',sequence_number:2,response:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Hej fra __KEEP_0__.'}]}]}}]));
  const events=[];for await(const event of streamTranslation('Hello from aPureBase.','en',undefined,{model:'gpt-4.1-mini',reasoning:'none',compact:true}))events.push(event);
  expect(events).toEqual([{type:'first_text'},{type:'done',text:'Hej fra aPureBase.'}]);const request=JSON.parse(upstream.mock.calls[0][1].body);expect(request.stream).toBe(true);expect(request.store).toBe(false);expect(request).not.toHaveProperty('reasoning');expect(request.instructions).toContain('Do not shorten');
});
it('fails incomplete or protected-token-dropping streams without returning speech-ready text',async()=>{
  for(const events of [[{type:'response.output_text.delta',delta:'Hej.'}],[{type:'response.output_text.delta',delta:'Hej.'},{type:'response.completed',response:{status:'completed'}}]]){
    upstream.mockResolvedValue(sse(events));let done=false;await expect((async()=>{for await(const event of streamTranslation('aPureBase','en'))if(event.type==='done')done=true;})()).rejects.toThrow();expect(done).toBe(false);
  }
});
it('deduplicates repeated provider sequence numbers without duplicating finalized text',async()=>{
  upstream.mockResolvedValue(sse([{type:'response.output_text.delta',sequence_number:1,delta:'Nej tak.'},{type:'response.output_text.delta',sequence_number:1,delta:'Nej tak.'},{type:'response.completed',sequence_number:2,response:{status:'completed'}}]));
  const events=[];for await(const event of streamTranslation('No thanks.','en'))events.push(event);expect(events.at(-1)).toEqual({type:'done',text:'Nej tak.'});
});
