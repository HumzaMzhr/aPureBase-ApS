import {createServer,type Server} from 'node:http';
import {EventEmitter} from 'node:events';
import WebSocket from 'ws';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {attachContinuousTranscription} from '../server/continuousTranscription';
let server:Server,socket:WebSocket,stop:()=>void,endpoint:string,messages:Record<string,unknown>[];
let upstream:EventEmitter&{readyState:number;bufferedAmount:number;send:ReturnType<typeof vi.fn>;terminate:ReturnType<typeof vi.fn>};
beforeEach(async()=>{
 vi.stubEnv('OPENAI_API_KEY','continuous-private-key');messages=[];
 upstream=Object.assign(new EventEmitter(),{readyState:WebSocket.OPEN,bufferedAmount:0,send:vi.fn(),terminate:vi.fn()});server=createServer();stop=attachContinuousTranscription(server,()=>upstream as unknown as WebSocket);
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));endpoint=`ws://127.0.0.1:${(server.address() as {port:number}).port}/api/transcription/continuous?language=en`;
 socket=new WebSocket(endpoint,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});socket.on('message',raw=>messages.push(JSON.parse(raw.toString())));
 await new Promise<void>(r=>socket.once('open',r));upstream.emit('open');event({type:'session.updated'});await vi.waitFor(()=>expect(messages.some(m=>m.type==='ready')).toBe(true));
});
afterEach(async()=>{socket.terminate();stop();await new Promise<void>(r=>server.close(()=>r()));vi.unstubAllEnvs();});
const event=(data:unknown)=>upstream.emit('message',Buffer.from(JSON.stringify(data)));
async function append(){const before=upstream.send.mock.calls.length;socket.send(new Uint8Array(4800));await vi.waitFor(()=>expect(upstream.send.mock.calls.length).toBe(before+1));}
async function commit(generation:number){socket.send(JSON.stringify({type:'commit',generation}));await vi.waitFor(()=>expect(upstream.send.mock.calls.filter(([text])=>JSON.parse(text).type==='input_audio_buffer.commit').length).toBe(generation+1));}
it('keeps accepting PCM after commit with no reconnect, and correlates out-of-order finals by item ID',async()=>{
 await append();event({type:'conversation.item.input_audio_transcription.delta',item_id:'first',event_id:'d0',delta:'Hello.'});await commit(0);
 await append();event({type:'input_audio_buffer.committed',item_id:'first'});
 event({type:'conversation.item.input_audio_transcription.delta',item_id:'second',event_id:'d1',delta:'Next sentence.'});await commit(1);
 event({type:'conversation.item.input_audio_transcription.completed',item_id:'second',transcript:'Next sentence.'});expect(messages.filter(m=>m.type==='final')).toHaveLength(0);
 event({type:'input_audio_buffer.committed',item_id:'second'});event({type:'conversation.item.input_audio_transcription.completed',item_id:'first',transcript:'Hello.'});
 await vi.waitFor(()=>expect(messages.filter(m=>m.type==='final')).toHaveLength(2));
 expect(messages.filter(m=>m.type==='final').map(m=>[m.generation,m.text])).toEqual([[1,'Next sentence.'],[0,'Hello.']]);
 expect(upstream.terminate).not.toHaveBeenCalled();expect(JSON.stringify(messages)).not.toContain('continuous-private-key');
});
it('deduplicates delta, commit and completed events without appending old words to a newer buffer',async()=>{
 await append();const delta={type:'conversation.item.input_audio_transcription.delta',item_id:'one',event_id:'same',delta:'Hello.'};event(delta);event(delta);await commit(0);
 event({type:'input_audio_buffer.committed',item_id:'one'});event({type:'input_audio_buffer.committed',item_id:'one'});event({type:'conversation.item.input_audio_transcription.completed',item_id:'one',transcript:'Hello.'});
 await vi.waitFor(()=>expect(messages.filter(m=>m.type==='final')).toHaveLength(1));event(delta);event({type:'conversation.item.input_audio_transcription.completed',item_id:'one',transcript:'Hello.'});
 await append();expect(messages.filter(m=>m.type==='final')).toHaveLength(1);expect(messages.filter(m=>m.type==='partial').every(m=>m.text==='Hello.')).toBe(true);
});
it('retains ambiguous delayed text until acknowledgment establishes its generation',async()=>{
 await append();await commit(0);await append();event({type:'conversation.item.input_audio_transcription.delta',item_id:'old',event_id:'old-d',delta:'First.'});
 event({type:'conversation.item.input_audio_transcription.delta',item_id:'new',event_id:'new-d',delta:'Second '});
 expect(messages.filter(m=>m.type==='partial')).toHaveLength(0);event({type:'input_audio_buffer.committed',item_id:'old'});event({type:'conversation.item.input_audio_transcription.delta',item_id:'new',event_id:'new-d2',delta:'sentence.'});
 await vi.waitFor(()=>expect(messages).toContainEqual(expect.objectContaining({type:'partial',generation:1,text:'Second sentence.'})));expect(messages).toContainEqual(expect.objectContaining({type:'partial',generation:0,text:'First.'}));
});
it('stops on bounded transport pressure without dropping a queued frame or retrying it',async()=>{
 upstream.bufferedAmount=1024*1024+1;socket.send(new Uint8Array(4800));await vi.waitFor(()=>expect(messages).toContainEqual({type:'error',code:'audio_backpressure'}));
 expect(upstream.send).toHaveBeenCalledOnce();expect(upstream.terminate).toHaveBeenCalledOnce();
});
it('stops rather than accumulating unbounded pending committed items',async()=>{
 for(let n=0;n<3;n++){await append();await commit(n);}await append();socket.send(JSON.stringify({type:'commit',generation:3}));
 await vi.waitFor(()=>expect(messages).toContainEqual({type:'error',code:'finalization_backpressure'}));expect(upstream.terminate).toHaveBeenCalledOnce();
});
it('closes stale sessions and allows a new clean connection after disconnect',async()=>{
 socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());socket=new WebSocket(endpoint,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});
 await new Promise<void>(r=>socket.once('open',r));expect(socket.readyState).toBe(WebSocket.OPEN);
});
it('rejects a cross-origin connection before opening another paid upstream',async()=>{
 const forbidden=new WebSocket(endpoint,{headers:{Host:'localhost:5173',Origin:'https://other.example'}});
 const status=await new Promise<number>(resolve=>{forbidden.once('unexpected-response',(req,res)=>{const status=res.statusCode!;res.resume();req.destroy();resolve(status);});forbidden.on('error',()=>{});});expect(status).toBe(403);
});
it('forwards all 45 seconds of PCM across sequential items while earlier finals are delayed',async()=>{
 const input:Buffer[]=[],finals:string[]=[];
 // Observe mock-provider receipt directly. Repeatedly parsing every accumulated
 // base64 request in a polling assertion made this fixture exceed five seconds
 // on the physical test laptop; the byte/order assertions below are unchanged.
 let appends=0,commits=0,batchReceived:(()=>void)|undefined,committed:(()=>void)|undefined,targetAppends=0;
 upstream.send.mockImplementation(raw=>{const request=JSON.parse(raw);if(request.type==='input_audio_buffer.append'){appends++;if(appends===targetAppends)batchReceived?.();}if(request.type==='input_audio_buffer.commit'){commits++;committed?.();}});
 for(let generation=0;generation<15;generation++){
  const count=appends;targetAppends=count+30;const batch=new Promise<void>(resolve=>{batchReceived=resolve;});
  for(let frame=0;frame<30;frame++){const pcm=Buffer.alloc(4800);pcm.writeInt16LE(generation*30+frame);input.push(pcm);socket.send(pcm);}
  await batch;batchReceived=undefined;expect(appends).toBe(count+30);
  const id=`item-${generation}`,text=`Source item ${generation}.`;finals.push(text);
  event({type:'conversation.item.input_audio_transcription.delta',item_id:id,event_id:`delta-${generation}`,delta:text});const commitment=new Promise<void>(resolve=>{committed=resolve;});socket.send(JSON.stringify({type:'commit',generation}));await commitment;committed=undefined;expect(commits).toBe(generation+1);
  event({type:'input_audio_buffer.committed',item_id:id,previous_item_id:generation?`item-${generation-1}`:null});
  if(generation!==0)event({type:'conversation.item.input_audio_transcription.completed',item_id:id,transcript:text});
 }
 // Fourteen real completions must free provider capacity despite the first
 // outstanding item. The browser restores semantic order by generation.
 await vi.waitFor(()=>expect(messages.filter(m=>m.type==='final')).toHaveLength(14));
 event({type:'conversation.item.input_audio_transcription.completed',item_id:'item-0',transcript:finals[0]});
 await vi.waitFor(()=>expect(messages.filter(m=>m.type==='final')).toHaveLength(15));
 const appended=upstream.send.mock.calls.map(([raw])=>JSON.parse(raw)).filter(e=>e.type==='input_audio_buffer.append');
 // Compare every byte natively: generic deep equality expands 2.16 MB into
 // millions of JS properties and can exhaust the wall-clock test budget while
 // contending with fake-clock replays. No sampling/hash or ordering relaxation.
 const received=Buffer.concat(appended.map(e=>Buffer.from(e.audio,'base64')));
 expect(appended).toHaveLength(450);expect(received.byteLength).toBe(45*24000*2);expect(received.equals(Buffer.concat(input))).toBe(true);
 expect(messages.filter(m=>m.type==='final').sort((a,b)=>Number(a.generation)-Number(b.generation)).map(m=>m.text)).toEqual(finals);
 expect(messages.filter(m=>m.type==='error')).toEqual([]);expect(upstream.terminate).not.toHaveBeenCalled();
});
it('correlates final-before-ack and late duplicates without assigning them to the next item',async()=>{
 await append();await commit(0);await append();
 event({type:'conversation.item.input_audio_transcription.completed',item_id:'first',transcript:'First source.'});
 event({type:'conversation.item.input_audio_transcription.delta',item_id:'second',event_id:'second-delta',delta:'Second source.'});
 event({type:'input_audio_buffer.committed',item_id:'first'});
 await vi.waitFor(()=>expect(messages.filter(m=>m.type==='final')).toHaveLength(1));
 event({type:'conversation.item.input_audio_transcription.completed',item_id:'first',transcript:'Duplicate must not be emitted.'});
 event({type:'conversation.item.input_audio_transcription.delta',item_id:'first',event_id:'late-first',delta:'Late must not reach second.'});
 await commit(1);event({type:'input_audio_buffer.committed',item_id:'second',previous_item_id:'first'});event({type:'conversation.item.input_audio_transcription.completed',item_id:'second',transcript:'Second source.'});
 await vi.waitFor(()=>expect(messages.filter(m=>m.type==='final')).toHaveLength(2));
 expect(messages.filter(m=>m.type==='final').map(m=>[m.generation,m.text])).toEqual([[0,'First source.'],[1,'Second source.']]);expect(messages.filter(m=>m.type==='error')).toEqual([]);
});
it('still terminates and reports a genuine provider transcription failure without inventing a final',async()=>{
 await append();await commit(0);event({type:'input_audio_buffer.committed',item_id:'failed'});
 const log=vi.spyOn(console,'error').mockImplementation(()=>{});
 try{event({type:'conversation.item.input_audio_transcription.failed',item_id:'failed',error:{code:'audio_unintelligible'}});
  await vi.waitFor(()=>expect(messages).toContainEqual({type:'error',code:'audio_unintelligible'}));
  expect(messages.filter(m=>m.type==='final')).toEqual([]);expect(upstream.terminate).toHaveBeenCalledOnce();
 }finally{log.mockRestore();}
});
it('retains opt-in invalid-final lifecycle metadata while preserving the original failure and provider requests',async()=>{
 socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());messages=[];
 socket=new WebSocket(endpoint+'&diagnostics=1',{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});socket.on('message',raw=>messages.push(JSON.parse(raw.toString())));await new Promise<void>(r=>socket.once('open',r));upstream.emit('open');event({type:'session.updated'});await vi.waitFor(()=>expect(messages.some(m=>m.type==='ready')).toBe(true));
 await append();event({type:'conversation.item.input_audio_transcription.delta',item_id:'empty-item',delta:'Retained source.'});await commit(0);event({type:'input_audio_buffer.committed',item_id:'empty-item',event_id:'commit-event'});event({type:'conversation.item.input_audio_transcription.completed',item_id:'empty-item',event_id:'final-event',transcript:'',authorization:'never-export',audio:'never-export-audio'});
 await vi.waitFor(()=>expect(messages).toContainEqual({type:'error',code:'invalid_final'}));
 const trace=messages.filter(m=>m.type==='diagnostic');expect(trace).toContainEqual(expect.objectContaining({event:'recognition.item_state',data:expect.objectContaining({itemId:'empty-item',eventId:'final-event',generation:0,currentGeneration:1,turnExists:true,committed:true,acknowledged:true,alreadyFinal:false,empty:true,textCharacters:0,clock:'server-performance.now'})}));
 expect(trace).toContainEqual(expect.objectContaining({event:'recognition.invalid_final',data:expect.objectContaining({classification:'empty_final_conflict'})}));expect(JSON.stringify(trace)).not.toContain('continuous-private-key');expect(JSON.stringify(trace)).not.toContain('never-export');expect(JSON.stringify(trace)).not.toContain('"audio":');
 expect(upstream.send.mock.calls.map(([raw])=>JSON.parse(raw).type).filter(type=>type!=='session.update')).toEqual(['input_audio_buffer.append','input_audio_buffer.commit']);
});

it.each(['', ' \n\t '])('resolves an acknowledged silent final %j and keeps the persistent session listening',async transcript=>{
 // Test 3: all prior speech is finalized; a later audio commit contains no new text.
 await append();event({type:'conversation.item.input_audio_transcription.delta',item_id:'speech',delta:'We can call later.'});await commit(0);
 event({type:'input_audio_buffer.committed',item_id:'speech'});event({type:'conversation.item.input_audio_transcription.completed',item_id:'speech',transcript:'We can call later.'});
 await vi.waitFor(()=>expect(messages.filter(m=>m.type==='final')).toHaveLength(1));
 await append();await commit(1);event({type:'input_audio_buffer.committed',item_id:'silence'});
 event({type:'conversation.item.input_audio_transcription.completed',item_id:'silence',event_id:'empty-final',transcript});
 await vi.waitFor(()=>expect(messages.filter(m=>m.type==='final')).toHaveLength(2));
 event({type:'conversation.item.input_audio_transcription.completed',item_id:'silence',transcript});event({type:'conversation.item.input_audio_transcription.delta',item_id:'silence',delta:'Late duplicate.'});
 await append();await commit(2);event({type:'input_audio_buffer.committed',item_id:'next'});event({type:'conversation.item.input_audio_transcription.completed',item_id:'next',transcript:'Thank you.'});
 await vi.waitFor(()=>expect(messages.filter(m=>m.type==='final')).toHaveLength(3));
 expect(messages.filter(m=>m.type==='final').map(m=>[m.generation,m.text])).toEqual([[0,'We can call later.'],[1,''],[2,'Thank you.']]);
 expect(messages.filter(m=>m.type==='error')).toEqual([]);expect(upstream.terminate).not.toHaveBeenCalled();
});
it('retains an empty final before its acknowledgment and resolves only the correct generation',async()=>{
 await append();await commit(0);await append();await commit(1);
 event({type:'conversation.item.input_audio_transcription.completed',item_id:'quiet',transcript:'  '});
 event({type:'conversation.item.input_audio_transcription.delta',item_id:'quiet',event_id:'late-quiet-delta',delta:'Late text cannot reopen a final.'});event({type:'conversation.item.input_audio_transcription.completed',item_id:'quiet',transcript:'A duplicate cannot replace a final.'});
 event({type:'conversation.item.input_audio_transcription.completed',item_id:'speech',transcript:'Next source.'});
 expect(messages.filter(m=>m.type==='final')).toHaveLength(0);
 event({type:'input_audio_buffer.committed',item_id:'quiet'});event({type:'input_audio_buffer.committed',item_id:'speech'});
 await vi.waitFor(()=>expect(messages.filter(m=>m.type==='final')).toHaveLength(2));
 expect(messages.filter(m=>m.type==='final').map(m=>[m.generation,m.text])).toEqual([[0,''],[1,'Next source.']]);expect(messages.filter(m=>m.type==='partial'&&m.itemId==='quiet')).toEqual([]);expect(messages.filter(m=>m.type==='error')).toEqual([]);
});
it.each([undefined,null,42,'x'.repeat(4001)])('still rejects a malformed completed transcript (%#)',async transcript=>{
 await append();await commit(0);event({type:'input_audio_buffer.committed',item_id:'malformed'});event({type:'conversation.item.input_audio_transcription.completed',item_id:'malformed',transcript});
 await vi.waitFor(()=>expect(messages).toContainEqual({type:'error',code:'invalid_final'}));expect(messages.filter(m=>m.type==='final')).toEqual([]);expect(upstream.terminate).toHaveBeenCalledOnce();
});
it('exposes provider completion separately from delayed commit ACK without weakening ACK-before-final delivery',async()=>{
 socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());messages=[];
 socket=new WebSocket(endpoint+'&diagnostics=1',{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});socket.on('message',raw=>messages.push(JSON.parse(raw.toString())));await new Promise<void>(r=>socket.once('open',r));upstream.emit('open');event({type:'session.updated'});await vi.waitFor(()=>expect(messages.some(m=>m.type==='ready')).toBe(true));
 await append();event({type:'conversation.item.input_audio_transcription.delta',item_id:'consent-question',delta:'Is it okay to send this by email?'});await commit(0);
 event({type:'conversation.item.input_audio_transcription.completed',item_id:'consent-question',transcript:'Is it okay to send this by email?'});
 await vi.waitFor(()=>expect(messages).toContainEqual(expect.objectContaining({type:'diagnostic',event:'recognition.provider_completed',data:expect.objectContaining({generation:0,acknowledged:false,clock:'server-performance.now',providerAt:expect.any(Number)})})));
 expect(messages.some(m=>m.type==='final')).toBe(false);event({type:'input_audio_buffer.committed',item_id:'consent-question'});
 await vi.waitFor(()=>expect(messages.some(m=>m.type==='final')).toBe(true));const milestones=messages.filter(m=>m.type==='diagnostic').map(m=>m.event);
 expect(milestones.indexOf('recognition.commit_sent')).toBeLessThan(milestones.indexOf('recognition.provider_completed'));expect(milestones.indexOf('recognition.provider_completed')).toBeLessThan(milestones.indexOf('recognition.commit_acknowledged'));expect(milestones.indexOf('recognition.commit_acknowledged')).toBeLessThan(milestones.indexOf('recognition.final_delivered'));
});
