import {realtimeIsabellaGain,deliveryGainPolicy} from '../src/config/realtimeDelivery';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {StreamingInterpreter} from '../src/streaming/engine';
import {LocalOutput} from '../src/streaming/localOutput';
import {SessionDiagnostics,lastSessionDiagnostics} from '../src/streaming/sessionDiagnostics';
import {fixtureVoice,fixtureCachedVoices} from './fixtures/voice';
class Socket {
 static OPEN=1;static instances:Socket[]=[];readyState=1;bufferedAmount=0;binaryType='';onmessage:null|((event:{data:string|ArrayBuffer})=>void)=null;onerror:null|(()=>void)=null;onclose:null|(()=>void)=null;
 identity={...fixtureVoice,requestId:`stage192-voice-${Socket.instances.length+1}`};texts:string[]=[];private sequence=0;private sample=0;private pending=0;private ending=false;private closed=false;private timers=new Set<ReturnType<typeof setTimeout>>();
 constructor(){Socket.instances.push(this);this.later(0,()=>this.event({type:'ready',voice:this.identity}));}
 private later(ms:number,run:()=>void){const timer=setTimeout(()=>{this.timers.delete(timer);if(!this.closed)run();},ms);this.timers.add(timer);}
 event(data:unknown){this.onmessage?.({data:data instanceof ArrayBuffer?data:JSON.stringify(data)});}
 send=(raw:string)=>{
  const command=JSON.parse(raw);if(command.type==='text'){
   const text=command.text+' ';this.texts.push(command.text);this.pending++;
   this.later(30,()=>{const samples=command.text==='Tak.'?240:4800,pcm=new Uint8Array(samples*2);new Int16Array(pcm.buffer).fill(8192);this.event({type:'alignment',voice:this.identity,requestId:this.identity.requestId,sequence:this.sequence++,sampleStart:this.sample,sampleEnd:this.sample+samples,samples,alignment:{chars:[...text],charStartTimesMs:[...text].map((_,n)=>this.sample/24+n*samples/24/text.length),charDurationsMs:[...text].map(()=>samples/24/text.length)}});this.sample+=samples;this.event(pcm.buffer);this.pending--;if(this.ending&&!this.pending)this.event({type:'done'});});
  }
  if(command.type==='finish'){this.ending=true;if(!this.pending)this.later(0,()=>this.event({type:'done'}));}
 };
 close=vi.fn(()=>{this.closed=true;for(const timer of this.timers)clearTimeout(timer);this.timers.clear();});
}
class Context {
 static last:Context;state='running';sampleRate=24000;destination={};buffers:Float32Array[]=[];nodes:{stop:ReturnType<typeof vi.fn>;start:ReturnType<typeof vi.fn>}[]=[];
 constructor(){Context.last=this;}get currentTime(){return performance.now()/1000;}
 resume=async()=>{};setSinkId=async()=>{};close=async()=>{};
 createGain(){return{connect:()=>{},disconnect:()=>{}};}
 createBuffer(_channels:number,samples:number){const data=new Float32Array(samples);this.buffers.push(data);return{duration:samples/24000,getChannelData:()=>data};}
 createBufferSource(){const node={buffer:undefined as undefined|{duration:number},onended:null as null|(()=>void),timer:undefined as ReturnType<typeof setTimeout>|undefined,connect:()=>{},disconnect:()=>{},start:vi.fn((at:number)=>{node.timer=setTimeout(()=>node.onended?.(),(at-this.currentTime+node.buffer!.duration)*1000);}),stop:vi.fn(()=>clearTimeout(node.timer))};this.nodes.push(node);return node;}
}
beforeEach(()=>{vi.useFakeTimers();Socket.instances=[];vi.stubGlobal('AudioContext',Context);vi.stubGlobal('WebSocket',Socket);vi.stubGlobal('location',{host:'localhost:5173',protocol:'http:'});vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({ready:true,danishVoice:fixtureVoice,cachedVoices:fixtureCachedVoices,missingAudio:[]}))));const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
async function setup(){
 const diagnostics=new SessionDiagnostics('en','realtime'),failed=vi.fn();
 const output=new LocalOutput('en',100,{firstAudio:(id,at)=>engine.playback(id,'firstAudio',at),scheduled:(id,at)=>engine.playback(id,'scheduled',at),started:(id,at)=>engine.playback(id,'started',at),finished:(id,at)=>engine.playback(id,'finished',at),underrun:()=>{},audit:event=>diagnostics.record(event.type,event),failed},{quality:true,simultaneous:true,prosodyMs:250});
 const abort=new AbortController(),translate=vi.fn(async input=>({translation:input.text==='Thank you.'?'Tak.':'Vi ringer til klinikken nu.',confidence:1,needs_precision:false}));
 const engine=new StreamingInterpreter({now:()=>performance.now(),translate,output:(language,turn,signal)=>output.open(language,turn,signal),pauseInput:()=>{},failed},()=>{},{bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:'Interpret faithfully.',scopedPrecision:true,simultaneous:true});
 await output.prepare('',abort.signal);engine.start();return{engine,output,diagnostics,failed,translate};
}
it('keeps actual LocalOutput/client/scheduler provenance through reused ASR items and the final short Tak carry flush',async()=>{
 const s=await setup();try{
  const phrase='We are calling the clinic now.';s.engine.sourceStarted('en',0);s.engine.partial('en',phrase);await vi.advanceTimersByTimeAsync(130);s.engine.partial('en',phrase);await vi.advanceTimersByTimeAsync(80);
  s.engine.finalized('en',phrase);s.engine.sourceStarted('en',performance.now());s.engine.partial('en',phrase);await vi.advanceTimersByTimeAsync(130);s.engine.partial('en',phrase);await vi.advanceTimersByTimeAsync(50);
  s.engine.finalized('en',phrase);s.engine.sourceStarted('en',performance.now());s.engine.finalized('en','Thank you.');await vi.advanceTimersByTimeAsync(2000);
  expect(s.engine.idle).toBe(true);expect(s.failed).not.toHaveBeenCalled();expect(Socket.instances).toHaveLength(1);expect(s.translate).toHaveBeenCalledTimes(3);expect(Socket.instances[0].texts).toEqual(['Vi ringer til klinikken nu.','Vi ringer til klinikken nu.','Tak.']);
  const lane=s.engine.snapshot.lanes.en;expect(lane.units.every(u=>u.status==='spoken')).toBe(true);expect(lane.spokenWords).toBe(lane.committedWords);expect(Context.last.buffers.every(b=>b.every(v=>v===Math.fround(.25*realtimeIsabellaGain)))).toBe(true);
  s.diagnostics.finish('completed','drained');const record=lastSessionDiagnostics()!;expect(record.voiceProvenance.audiblePCMBlocks).toBeGreaterThan(0);expect(record.voiceProvenance.audiblePCMBlocks).toBe(record.voiceProvenance.verifiedIsabellaPCMBlocks);expect(record.voiceProvenance.unverifiedPCMBlocks).toBe(0);expect(record.voiceProvenance.alternateVoicePCMBlocks).toBe(0);expect(record.pcmBlocks.at(-1)).toMatchObject({requestId:Socket.instances[0].identity.requestId,voiceId:fixtureVoice.voiceId,modelId:fixtureVoice.modelId,playbackFinishedAt:expect.any(Number)});expect(record.events.filter(e=>e.event==='VOICE_PROVENANCE_VERIFIED')).toHaveLength(Context.last.nodes.length);
 }finally{s.engine.end();s.output.cancel();}expect(vi.getTimerCount()).toBe(0);
});
it('STOP cancels all reused-context PCM sources and a saved socket callback cannot produce later audio',async()=>{
 const s=await setup();const phrase='We are calling the clinic now.';s.engine.sourceStarted('en',0);s.engine.partial('en',phrase);await vi.advanceTimersByTimeAsync(130);s.engine.partial('en',phrase);await vi.advanceTimersByTimeAsync(50);const socket=Socket.instances[0],callback=socket.onmessage!;expect(Context.last.nodes.length).toBeGreaterThan(0);const count=Context.last.nodes.length;
 s.engine.end();s.output.cancel();callback({data:new Uint8Array(4800).buffer});await vi.advanceTimersByTimeAsync(1000);expect(Context.last.nodes).toHaveLength(count);expect(Context.last.nodes.every(node=>node.stop.mock.calls.length===1&&node.start.mock.calls.length===1)).toBe(true);expect(s.failed).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('attributes first-to-final PCM independently to twenty distinct semantic units on one verified request, including Tak',async()=>{
 const s=await setup();try{
  for(let n=0;n<20;n++){s.engine.sourceStarted('en',performance.now());s.engine.finalized('en',n===19?'Thank you.':'We are calling the clinic now.');}
  await vi.advanceTimersByTimeAsync(6000);
  expect(Socket.instances).toHaveLength(1);expect(s.translate).toHaveBeenCalledTimes(20);expect(s.failed).not.toHaveBeenCalled();expect(s.engine.idle).toBe(true);
  const units=s.engine.snapshot.lanes.en.units;expect(new Set(units.map(u=>u.id)).size).toBe(20);expect(units.every(u=>u.status==='spoken')).toBe(true);expect(Socket.instances[0].texts.at(-1)).toBe('Tak.');
  s.diagnostics.finish('completed','drained');const record=lastSessionDiagnostics()!,verified=record.events.filter(e=>e.event==='VOICE_PROVENANCE_VERIFIED');
  expect(verified).toHaveLength(Context.last.nodes.length);expect(record.pcmBlocks.every(b=>b.requestId===Socket.instances[0].identity.requestId&&b.voiceId===fixtureVoice.voiceId&&b.modelId===fixtureVoice.modelId&&b.gainPolicy===deliveryGainPolicy&&b.gainApplied===realtimeIsabellaGain&&b.clippingEvents===0)).toBe(true);
  const attributed=new Set(record.pcmBlocks.flatMap(b=>b.unitIds as string[]));for(const unit of units)expect(attributed.has(unit.id),unit.id).toBe(true);
  expect(record.voiceProvenance.audiblePCMBlocks).toBe(record.voiceProvenance.verifiedIsabellaPCMBlocks);expect(record.voiceProvenance.unverifiedPCMBlocks).toBe(0);expect(record.voiceProvenance.alternateVoicePCMBlocks).toBe(0);
 }finally{s.engine.end();s.output.cancel();}expect(vi.getTimerCount()).toBe(0);
});
it('rolls over an aged connection to a new request-bound renderer and ignores stale PCM callbacks before the final Tak',async()=>{
 const s=await setup();try{
  const phrase='We are calling the clinic now.';s.engine.sourceStarted('en',0);s.engine.partial('en',phrase);await vi.advanceTimersByTimeAsync(130);s.engine.partial('en',phrase);await vi.advanceTimersByTimeAsync(300);
  const old=Socket.instances[0],saved=old.onmessage!;await vi.advanceTimersByTimeAsync(150001);
  s.engine.partial('en',phrase+' '+phrase);await vi.advanceTimersByTimeAsync(130);s.engine.partial('en',phrase+' '+phrase);await vi.advanceTimersByTimeAsync(300);
  expect(Socket.instances).toHaveLength(2);expect(Socket.instances[1].identity.requestId).not.toBe(old.identity.requestId);const scheduled=Context.last.nodes.length;
  saved({data:new Uint8Array(4800).buffer});await vi.advanceTimersByTimeAsync(20);expect(Context.last.nodes).toHaveLength(scheduled);
  s.engine.finalized('en',phrase+' '+phrase+' Thank you.');await vi.advanceTimersByTimeAsync(1000);
  expect(s.failed).not.toHaveBeenCalled();expect(s.engine.idle).toBe(true);expect(s.engine.snapshot.lanes.en.units.every(u=>u.status==='spoken')).toBe(true);expect(Socket.instances[1].texts.at(-1)).toBe('Tak.');
  s.diagnostics.finish('completed','drained');const record=lastSessionDiagnostics()!,requests=new Set(record.pcmBlocks.map(b=>b.requestId));expect(requests.size).toBe(2);
  for(const requestId of requests){const renderers=new Set(record.pcmBlocks.filter(b=>b.requestId===requestId).map(b=>b.rendererId));expect(renderers.size).toBe(1);}
  expect(record.voiceProvenance.audiblePCMBlocks).toBe(record.voiceProvenance.verifiedIsabellaPCMBlocks);expect(record.voiceProvenance.unverifiedPCMBlocks).toBe(0);expect(record.voiceProvenance.alternateVoicePCMBlocks).toBe(0);
 }finally{s.engine.end();s.output.cancel();}expect(vi.getTimerCount()).toBe(0);
});
