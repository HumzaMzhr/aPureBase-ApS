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
