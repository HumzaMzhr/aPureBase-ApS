import {createServer,type Server} from 'node:http';
import {EventEmitter} from 'node:events';
import WebSocket from 'ws';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {attachContinuousVoice,voiceSocketUrl,parseAlignment} from '../server/continuousVoice';
let server:Server;let socket:WebSocket;let stop:()=>void;let connect:()=>WebSocket;let messages:(Record<string,unknown>|Buffer)[];let upstream:EventEmitter&{send:ReturnType<typeof vi.fn>;terminate:ReturnType<typeof vi.fn>;bufferedAmount:number};
beforeEach(async()=>{vi.stubEnv('ELEVENLABS_API_KEY','private-voice-key');vi.stubEnv('ELEVENLABS_VOICE_ID','gIfqD5jrnhkFu8ENVbXC');vi.stubEnv('ELEVENLABS_MODEL_ID','eleven_flash_v2_5');vi.stubEnv('ELEVENLABS_VOICE_SETTINGS','');vi.stubEnv('STREAMING_TTS_SCHEDULE','50,120,160,290');upstream=Object.assign(new EventEmitter(),{send:vi.fn(),terminate:vi.fn(),bufferedAmount:0});connect=vi.fn(()=>upstream as unknown as WebSocket);server=createServer();stop=attachContinuousVoice(server,connect);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const {port}=server.address() as {port:number};socket=new WebSocket(`ws://127.0.0.1:${port}/api/voice/live?language=da`,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});messages=[];socket.on('message',(raw,binary)=>messages.push(binary?Buffer.from(raw as Buffer):JSON.parse(raw.toString())));await new Promise<void>(r=>socket.once('open',r));upstream.emit('open');await vi.waitFor(()=>expect(messages).toContainEqual(expect.objectContaining({type:'ready'})));});
afterEach(async()=>{socket.terminate();stop();await new Promise<void>(r=>server.close(()=>r()));vi.unstubAllEnvs();});
const provider=(data:unknown)=>upstream.emit('message',Buffer.from(JSON.stringify(data)));
it('adds only opt-in metadata for text/flush/EOS/PCM/provider final while preserving provider commands',async()=>{
 socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());messages=[];upstream.send.mockClear();
 const {port}=server.address() as {port:number};socket=new WebSocket(`ws://127.0.0.1:${port}/api/voice/live?language=da&profile=simultaneous&diagnostics=1`,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});socket.on('message',(raw,binary)=>messages.push(binary?Buffer.from(raw as Buffer):JSON.parse(raw.toString())));await new Promise<void>(r=>socket.once('open',r));upstream.emit('upgrade',{headers:{'request-id':'provider-request-one'}});upstream.emit('open');await vi.waitFor(()=>expect(messages).toContainEqual(expect.objectContaining({type:'ready'})));
 socket.send(JSON.stringify({type:'text',text:'Godmorgen.',initialClause:true}));socket.send(JSON.stringify({type:'finish'}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(4));provider({audio:Buffer.from([1,2,3,4]).toString('base64')});provider({is_final:true});
 await vi.waitFor(()=>expect(messages).toContainEqual({type:'done'}));const trace=messages.filter(m=>!Buffer.isBuffer(m)&&m.type==='diagnostic') as Record<string,unknown>[];
 expect(trace.map(m=>m.event)).toEqual(expect.arrayContaining(['voice.provider_text_sent','voice.finish_received','voice.provider_flush_sent','voice.provider_eos_sent','voice.provider_pcm_received','voice.provider_final_received']));
 expect(trace).toContainEqual(expect.objectContaining({event:'voice.provider_pcm_received',data:expect.objectContaining({samples:2,totalSamples:2,providerRequestId:'provider-request-one',clock:'server-performance.now'})}));
 const requests=upstream.send.mock.calls.map(([raw])=>JSON.parse(raw));expect(requests.slice(1)).toEqual([{text:'Godmorgen. ',try_trigger_generation:true,flush:true},{text:' ',flush:true},{text:''}]);expect(JSON.stringify(trace)).not.toContain('Godmorgen');expect(JSON.stringify(trace)).not.toContain('private-voice-key');expect(JSON.stringify(trace)).not.toContain('AQIDBA==');
});
it('keeps one fixed voice context across semantic units and flushes only at end',async()=>{socket.send(JSON.stringify({type:'text',text:'Hej, mit navn er Humza,'}));socket.send(JSON.stringify({type:'text',text:'jeg ringer på vegne af aPureBase.'}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(3));expect(connect).toHaveBeenCalledOnce();const sends=upstream.send.mock.calls.map(c=>JSON.parse(c[0]));expect(sends[0]).toMatchObject({text:' ',generation_config:{chunk_length_schedule:[50,120,160,290]}});expect(sends.slice(1).every(s=>!s.flush)).toBe(true);socket.send(JSON.stringify({type:'finish'}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(5));expect(JSON.parse(upstream.send.mock.calls[3][0])).toEqual({text:' ',flush:true});expect(JSON.parse(upstream.send.mock.calls[4][0])).toEqual({text:''});provider({isFinal:true});await vi.waitFor(()=>expect(messages).toContainEqual({type:'done'}));});
it('relays PCM and alignment in order without keys or source audio',async()=>{provider({audio:Buffer.from([1,2,3,4]).toString('base64'),alignment:{chars:['H'],charStartTimesMs:[0],charDurationsMs:[10]}});await vi.waitFor(()=>expect(messages).toHaveLength(3));expect(messages[1]).toMatchObject({type:'alignment',alignment:{chars:['H']}});expect(messages[2]).toEqual(Buffer.from([1,2,3,4]));expect(JSON.stringify(messages)).not.toContain('private-voice-key');expect(voiceSocketUrl('da')).toContain('gIfqD5jrnhkFu8ENVbXC/stream-input');expect(voiceSocketUrl('en')).toContain('language_code=en');expect(voiceSocketUrl('da')).toContain('auto_mode=false');});
it('does not reconnect/replay after provider disconnect',async()=>{upstream.emit('close');await vi.waitFor(()=>expect(messages).toContainEqual(expect.objectContaining({type:'error'})));expect(connect).toHaveBeenCalledOnce();expect(upstream.terminate).toHaveBeenCalledOnce();});
it('cancels upstream on caller End Call and rejects text after finish',async()=>{socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());});
it('validates alignment rather than fabricating timestamps',()=>{expect(parseAlignment({chars:['a'],char_start_times_ms:[1],char_durations_ms:[10]})).toMatchObject({chars:['a']});expect(parseAlignment({chars:['a'],charStartTimesMs:[-1],charDurationsMs:[1]})).toBeUndefined();expect(parseAlignment({chars:['a'],charStartTimesMs:[],charDurationsMs:[]})).toBeUndefined();});
it('can release only the first complete short sentence without flushing intermediate fragments',async()=>{socket.send(JSON.stringify({type:'text',text:'Tak.',initialSentence:true}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(2));expect(JSON.parse(upstream.send.mock.calls[1][0]).flush).toBe(true);socket.send(JSON.stringify({type:'text',text:'Mit navn er',initialSentence:true}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(3));expect(JSON.parse(upstream.send.mock.calls[2][0]).flush).toBeUndefined();});
it('uses provider-default quality buffering and a single fixed Flash voice context for the primary path',async()=>{
 socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());upstream.send.mockClear();const {port}=server.address() as {port:number};
 socket=new WebSocket(`ws://127.0.0.1:${port}/api/voice/live?language=da&profile=quality`,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});await new Promise<void>(r=>socket.once('open',r));upstream.emit('open');await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledOnce());
 expect(JSON.parse(upstream.send.mock.calls[0][0])).not.toHaveProperty('generation_config');
 socket.send(JSON.stringify({type:'text',text:'Hej, jeg hedder Humza,',initialClause:true}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(2));expect(JSON.parse(upstream.send.mock.calls[1][0]).flush).toBe(true);
 socket.send(JSON.stringify({type:'text',text:'jeg ringer på vegne af aPureBase.',initialClause:true}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(3));expect(JSON.parse(upstream.send.mock.calls[2][0]).flush).toBeUndefined();expect(JSON.stringify(messages)).not.toContain('private-voice-key');
});
it('never force-flushes an isolated Danish greeting even when an older client requests it',async()=>{
 socket.send(JSON.stringify({type:'text',text:'Hej.',initialSentence:true,initialClause:true}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(2));expect(JSON.parse(upstream.send.mock.calls[1][0])).not.toHaveProperty('flush');
 expect(messages[0]).toMatchObject({type:'ready',voice:{provider:'ElevenLabs',voiceId:'gIfqD5jrnhkFu8ENVbXC',modelId:'eleven_flash_v2_5'}});
});
it('uses a bounded simultaneous text schedule without changing Isabella, Flash model or voice settings',async()=>{
 socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());upstream.send.mockClear();const {port}=server.address() as {port:number};socket=new WebSocket(`ws://127.0.0.1:${port}/api/voice/live?language=da&profile=simultaneous`,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});await new Promise<void>(r=>socket.once('open',r));upstream.emit('open');await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledOnce());expect(JSON.parse(upstream.send.mock.calls[0][0])).toMatchObject({generation_config:{chunk_length_schedule:[50,80,100,120]}});expect(connect).toHaveBeenLastCalledWith('da',expect.objectContaining({voiceId:'gIfqD5jrnhkFu8ENVbXC',modelId:'eleven_flash_v2_5'}));expect(voiceSocketUrl('da')).toContain('gIfqD5jrnhkFu8ENVbXC');expect(voiceSocketUrl('da')).toContain('eleven_flash_v2_5');
});
it('snapshots the exact upstream voice configuration and tags every PCM frame with one generation identity',async()=>{
 const id=(messages[0] as Record<string,unknown>).voice as {requestId:string};expect(id.requestId).toMatch(/^[a-f0-9-]+$/);vi.stubEnv('ELEVENLABS_VOICE_ID','changed-after-socket-open');provider({audio:Buffer.from([1,2]).toString('base64')});provider({audio:Buffer.from([3,4]).toString('base64')});await vi.waitFor(()=>expect(messages).toHaveLength(5));for(const packet of [messages[1],messages[3]])expect(packet).toMatchObject({type:'alignment',voice:{provider:'ElevenLabs',voiceId:'gIfqD5jrnhkFu8ENVbXC',modelId:'eleven_flash_v2_5',requestId:id.requestId}});expect(connect).toHaveBeenCalledOnce();
});
it('force-generates existing buffered text on starvation without closing or opening another Isabella context',async()=>{
 socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());upstream.send.mockClear();const {port}=server.address() as {port:number};socket=new WebSocket(`ws://127.0.0.1:${port}/api/voice/live?language=da&profile=simultaneous`,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});await new Promise<void>(r=>socket.once('open',r));upstream.emit('open');await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledOnce());socket.send(JSON.stringify({type:'text',text:'Hej, godmorgen.',initialClause:true}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(2));socket.send(JSON.stringify({type:'text',text:'Jeg hedder Humza.'}));socket.send(JSON.stringify({type:'flush',reason:'playback_starvation'}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(4));expect(JSON.parse(upstream.send.mock.calls[3][0])).toEqual({text:' ',flush:true});socket.send(JSON.stringify({type:'flush',reason:'playback_starvation'}));await new Promise(r=>setTimeout(r,20));expect(upstream.send).toHaveBeenCalledTimes(4);expect(upstream.send.mock.calls.some(c=>JSON.parse(c[0]).text==='')).toBe(false);expect(upstream.terminate).toHaveBeenCalledOnce();
});
it('binds the final short provider PCM to the same request with exact contiguous frame sequences and ranges',async()=>{
 socket.send(JSON.stringify({type:'text',text:'Tak.'}));socket.send(JSON.stringify({type:'finish'}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(4));
 provider({audio:Buffer.alloc(12716*2).toString('base64')});provider({audio:Buffer.alloc(659*2).toString('base64')});provider({isFinal:true});await vi.waitFor(()=>expect(messages).toContainEqual({type:'done'}));
 const packets=messages.filter(m=>!Buffer.isBuffer(m)&&m.type==='alignment') as Record<string,unknown>[];expect(packets).toHaveLength(2);expect(packets[0]).toMatchObject({sequence:0,sampleStart:0,sampleEnd:12716,samples:12716,requestId:expect.any(String)});expect(packets[1]).toMatchObject({sequence:1,sampleStart:12716,sampleEnd:13375,samples:659,requestId:packets[0].requestId});expect(packets[1].voice).toMatchObject({voiceId:'gIfqD5jrnhkFu8ENVbXC',modelId:'eleven_flash_v2_5',requestId:packets[0].requestId});
});
it('supplies the complete request-bound envelope for every sequential semantic submission on one persistent gateway connection',async()=>{
 const identity=(messages[0] as {voice:{requestId:string}}).voice;
 for(let n=0;n<20;n++){
  socket.send(JSON.stringify({type:'text',text:n===19?'Tak.':'Vi ringer til klinikken nu.'}));
  await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(n+2));
  const pcm=Buffer.alloc((n===19?240:2400)*2,n);provider({audio:pcm.toString('base64')});
 }
 await vi.waitFor(()=>expect(messages.filter(m=>Buffer.isBuffer(m))).toHaveLength(20));
 const envelopes=messages.filter(m=>!Buffer.isBuffer(m)&&m.type==='alignment') as Record<string,unknown>[];
 let sample=0;for(let n=0;n<20;n++){const samples=n===19?240:2400;expect(envelopes[n]).toMatchObject({voice:identity,requestId:identity.requestId,sequence:n,sampleStart:sample,sampleEnd:sample+samples,samples});sample+=samples;}
 expect(connect).toHaveBeenCalledOnce();expect(new Set(envelopes.map(e=>e.requestId)).size).toBe(1);
 socket.send(JSON.stringify({type:'finish'}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(23));provider({is_final:true});await vi.waitFor(()=>expect(messages).toContainEqual({type:'done'}));
});
it('flushes a validated complete greeting without punctuation immediately, while a bare Hej still cannot force generation',async()=>{
 socket.send(JSON.stringify({type:'text',text:'Hej, godmorgen',initialSentence:true}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(2));expect(JSON.parse(upstream.send.mock.calls[1][0])).toEqual({text:'Hej, godmorgen ',try_trigger_generation:true,flush:true});expect(connect).toHaveBeenCalledOnce();
});
it('sends native 0.95 Isabella speed on the simultaneous connection without changing the configured voice or other settings',async()=>{
 socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());upstream.send.mockClear();vi.stubEnv('ELEVENLABS_VOICE_SETTINGS','{"stability":0.6,"similarity_boost":0.8}');const {port}=server.address() as {port:number};messages=[];
 socket=new WebSocket(`ws://127.0.0.1:${port}/api/voice/live?language=da&profile=simultaneous`,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});socket.on('message',raw=>messages.push(JSON.parse(raw.toString())));await new Promise<void>(r=>socket.once('open',r));upstream.emit('open');await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledOnce());
 expect(JSON.parse(upstream.send.mock.calls[0][0])).toMatchObject({voice_settings:{speed:.95,stability:.6,similarity_boost:.8},generation_config:{chunk_length_schedule:[50,80,100,120]}});await vi.waitFor(()=>expect(messages).toContainEqual(expect.objectContaining({type:'ready',voice:expect.objectContaining({configuredSpeed:null,effectiveSpeedSetting:.95,voiceId:'gIfqD5jrnhkFu8ENVbXC',modelId:'eleven_flash_v2_5'})})));
});
it('bounds stalled-provider reflushes by real PCM progress, idle time and two attempts per text range',async()=>{
 socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());upstream.send.mockClear();const {port}=server.address() as {port:number};
 socket=new WebSocket(`ws://127.0.0.1:${port}/api/voice/live?language=da&profile=simultaneous`,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});await new Promise<void>(r=>socket.once('open',r));upstream.emit('open');await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledOnce());
 let clock=1000000;const clockSpy=vi.spyOn(performance,'now').mockImplementation(()=>clock);
 try{
  socket.send(JSON.stringify({type:'text',text:'En almindelig allerede valideret beskrivelse uden nye oplysninger.'}));socket.send(JSON.stringify({type:'flush',reason:'playback_starvation'}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(3));
  const recovery=()=>socket.send(JSON.stringify({type:'flush',reason:'provider_stall'}));const tick=()=>new Promise(r=>setTimeout(r,20));
  recovery();await tick();expect(upstream.send).toHaveBeenCalledTimes(3); // no PCM progress
  provider({audio:Buffer.from([1,2]).toString('base64')});recovery();await tick();expect(upstream.send).toHaveBeenCalledTimes(3); // not idle
  clock+=800;recovery();await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(4));recovery();await tick();expect(upstream.send).toHaveBeenCalledTimes(4); // same frontier
  provider({audio:Buffer.from([3,4]).toString('base64')});clock+=800;recovery();await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(5));
  provider({audio:Buffer.from([5,6]).toString('base64')});clock+=800;recovery();await tick();expect(upstream.send).toHaveBeenCalledTimes(5); // cap reached
  expect(upstream.send.mock.calls.slice(2).map(([raw])=>JSON.parse(raw))).toEqual(Array(3).fill({text:' ',flush:true}));expect(connect).toHaveBeenCalledTimes(2); // setup socket plus tested socket; no recovery connection
 }finally{clockSpy.mockRestore();}
});
it('allows the bounded second residual reflush after 1500ms without PCM progress, but never a third or text replay',async()=>{
 socket.close();await vi.waitFor(()=>expect(upstream.terminate).toHaveBeenCalledOnce());upstream.send.mockClear();const {port}=server.address() as {port:number};socket=new WebSocket(`ws://127.0.0.1:${port}/api/voice/live?language=da&profile=simultaneous`,{headers:{Host:'localhost:5173',Origin:'http://localhost:5173'}});await new Promise<void>(r=>socket.once('open',r));upstream.emit('open');await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledOnce());
 socket.send(JSON.stringify({type:'text',text:'En allerede valideret fuldstændig sætning med oplysninger.'}));socket.send(JSON.stringify({type:'flush',reason:'playback_starvation'}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(3));
 let clock=2000000;const spy=vi.spyOn(performance,'now').mockImplementation(()=>clock);
 try{
  provider({audio:Buffer.from([1,2]).toString('base64')});clock+=800;socket.send(JSON.stringify({type:'flush',reason:'provider_stall'}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(4));
  clock+=1499;socket.send(JSON.stringify({type:'flush',reason:'provider_stall'}));await new Promise(r=>setTimeout(r,20));expect(upstream.send).toHaveBeenCalledTimes(4);
  clock++;socket.send(JSON.stringify({type:'flush',reason:'provider_stall'}));await vi.waitFor(()=>expect(upstream.send).toHaveBeenCalledTimes(5));
  clock+=5000;socket.send(JSON.stringify({type:'flush',reason:'provider_stall'}));await new Promise(r=>setTimeout(r,20));expect(upstream.send).toHaveBeenCalledTimes(5);
  expect(upstream.send.mock.calls.slice(2).map(([raw])=>JSON.parse(raw))).toEqual(Array(3).fill({text:' ',flush:true}));expect(connect).toHaveBeenCalledTimes(2);
 }finally{spy.mockRestore();}
});
