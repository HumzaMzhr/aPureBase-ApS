import {createServer,type Server} from 'node:http';
import {EventEmitter} from 'node:events';
import WebSocket from 'ws';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {attachLiveTranscription,transcriptionSession} from '../server/liveTranscription';
let server:Server;let socket:WebSocket;let stop:()=>void;let upstream:EventEmitter & {readyState:number;bufferedAmount:number;send:ReturnType<typeof vi.fn>;terminate:ReturnType<typeof vi.fn>};let messages:Record<string,unknown>[];
beforeEach(async()=>{vi.stubEnv('OPENAI_API_KEY','server-secret');messages=[];upstream=Object.assign(new EventEmitter(),{readyState:WebSocket.OPEN,bufferedAmount:0,send:vi.fn(),terminate:vi.fn()});server=createServer();stop=attachLiveTranscription(server,()=>upstream as unknown as WebSocket);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address() as {port:number};socket=new WebSocket(`ws://127.0.0.1:${address.port}/api/transcription/live?language=da`,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});socket.on('message',raw=>messages.push(JSON.parse(raw.toString())));await new Promise<void>(r=>socket.once('open',r));upstream.emit('open');upstream.emit('message',Buffer.from(JSON.stringify({type:'session.updated'})));await vi.waitFor(()=>expect(messages).toContainEqual({type:'ready'}));});
afterEach(async()=>{socket.terminate();stop();await new Promise<void>(r=>server.close(()=>r()));vi.unstubAllEnvs();});
const provider=(data:unknown)=>upstream.emit('message',Buffer.from(JSON.stringify(data)));
it('streams PCM during speech but releases only the matching final item after commit',async()=>{
 socket.send(new Uint8Array(4800));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(2));expect(JSON.parse(upstream.send.mock.calls[1][0]).type).toBe('input_audio_buffer.append');expect(messages).not.toContainEqual(expect.objectContaining({type:'final'}));
 socket.send(JSON.stringify({type:'commit'}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(3));provider({type:'conversation.item.input_audio_transcription.completed',item_id:'other',transcript:'WRONG'});provider({type:'conversation.item.input_audio_transcription.completed',item_id:'one',transcript:'Nej tak, ikke interesseret.'});expect(messages).toHaveLength(1);provider({type:'input_audio_buffer.committed',item_id:'one'});await vi.waitFor(()=>expect(messages).toContainEqual({type:'final',text:'Nej tak, ikke interesseret.'}));expect(JSON.stringify(messages)).not.toContain('server-secret');
});
it('fails closed on premature provider finalization',async()=>{provider({type:'conversation.item.input_audio_transcription.completed',item_id:'one',transcript:'premature'});await vi.waitFor(()=>expect(messages).toContainEqual(expect.objectContaining({type:'error'})));expect(messages.some(m=>m.type==='final')).toBe(false);});
it('ends upstream work when the local caller disconnects',async()=>{socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());});
it('uses language hints and disables provider VAD so only the complete local turn commits',()=>{expect(transcriptionSession('da','gpt-live-transcribe').session.audio.input).toMatchObject({turn_detection:null,format:{type:'audio/pcm',rate:24000},transcription:{model:'gpt-live-transcribe',languages:['da'],delay:'low',keywords:expect.arrayContaining(['aPureBase','Pernille'])}});});

it('keeps controlled delay unchanged while allowing an explicit minimal-delay streaming trial',()=>{
 vi.stubEnv('OPENAI_TRANSCRIBE_DELAY','low');
 expect(transcriptionSession('en').session.audio.input.transcription.delay).toBe('low');
 expect(transcriptionSession('en',undefined,true).session.audio.input.transcription.delay).toBe('minimal');
});
