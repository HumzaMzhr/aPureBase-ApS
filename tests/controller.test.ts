import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CallController, transitions } from '../src/controller';
import { inputOwner, type CallIO, type CallOptions, type Capture } from '../src/types';
const options: CallOptions = {demo:true,scenario:'callback',silenceMs:650,manual:false,agentMic:'',clinicMic:'',agentOutput:'',clinicOutput:''};
const audio = new Blob(['complete audio']);
let io: CallIO;
let clock: number;
let log: string[];
beforeEach(() => {
  clock=0;log=[];
  io={prepare:vi.fn(async()=>{}),load:vi.fn(async(url)=>{log.push(url);return audio;}),
    play:vi.fn(async(_blob,_language,_signal,started)=>{started();}),
    capture:vi.fn(async(_lang,_signal,speaking)=>{speaking();return {audio,endedAt:clock,finalization:'manual' as const};}),
    finish:vi.fn(),cancel:vi.fn(),transcribe:vi.fn(async()=>{clock+=100;return 'Jeg skal lige spørge lægen først.';}),
    translate:vi.fn(async()=>{clock+=200;return 'I need to ask the doctor first.';}),speech:vi.fn(async()=>{clock+=300;return audio;}),
    streamDanish:vi.fn(async(_text,_signal,events)=>{events.requestStarted();clock+=80;events.firstAudio();clock+=30;events.started();clock+=300;events.complete();}),
    now:()=>clock,pause:vi.fn(async()=>{})};
});
afterEach(()=>vi.restoreAllMocks());
it('plays opening exactly once per call and reaches waiting state',async()=>{
  const states:string[]=[];const c=new CallController(io,s=>states.push(s.state));
  await c.start(options);await c.start(options);
  expect(log.filter(x=>x==='/audio/opening.wav')).toHaveLength(1);
  expect(c.snapshot.state).toBe('WAITING_FOR_AGENT');
  expect(states).toContain('PLAYING_OPENING_DANISH');expect(states).toContain('DANISH_SPEAKING');expect(states).toContain('PROCESSING_DANISH');expect(states).toContain('PLAYING_ENGLISH');
});
it('only allows documented transitions and one input owner',()=>{
  expect(transitions.PLAYING_ENGLISH).toEqual(['WAITING_FOR_AGENT']);
  expect(inputOwner('LISTENING_DANISH')).toBe('da');expect(inputOwner('ENGLISH_SPEAKING')).toBe('en');
  for(const state of ['PLAYING_DANISH','PLAYING_ENGLISH','PROCESSING_DANISH','PROCESSING_ENGLISH'] as const) expect(inputOwner(state)).toBeUndefined();
});
it('does not transcribe/translate/play output until Danish capture is finalized',async()=>{
  let release!: (capture:Capture)=>void;
  io.capture=vi.fn((_language,_signal,speaking)=>{speaking();return new Promise<Capture>(resolve=>{release=resolve;});});
  const c=new CallController(io,()=>{});const call=c.start({...options,demo:false});
  await vi.waitFor(()=>expect(c.snapshot.state).toBe('DANISH_SPEAKING'));
  expect(io.transcribe).not.toHaveBeenCalled();expect(io.translate).not.toHaveBeenCalled();expect(io.play).toHaveBeenCalledTimes(1);
  release({audio,endedAt:clock,finalization:'manual' as const});await call;
  expect(c.snapshot.state).toBe('WAITING_FOR_AGENT');expect(io.play).toHaveBeenCalledTimes(2);
});
it('waits for full translation and generated audio before any translated playback',async()=>{
  let release!: (audio:Blob)=>void;io.speech=vi.fn(()=>new Promise<Blob>(resolve=>{release=resolve;}));
  const c=new CallController(io,()=>{});const call=c.start(options);
  await vi.waitFor(()=>expect(io.speech).toHaveBeenCalledOnce());
  expect(c.snapshot.state).toBe('PROCESSING_DANISH');expect(io.play).toHaveBeenCalledTimes(1); // opening + simulated clinic source only
  release(audio);await call;expect(io.play).toHaveBeenCalledTimes(2);
});
it('plays phrase directly with no phrase translation request, then listens again',async()=>{
  const c=new CallController(io,()=>{});await c.start(options);
  vi.mocked(io.translate).mockClear();await c.phrase('callback');
  expect(log).toContain('/audio/callback.wav');
  expect(c.snapshot.turns.find(t=>t.method==='PRERECORDED'&&t.original.includes('ringer igen'))).toBeDefined();
  expect(io.translate).toHaveBeenCalledTimes(1); // the following clinic turn only
});
it('custom English response is finalized, interpreted and followed by Danish listening',async()=>{
  const c=new CallController(io,()=>{});await c.start(options);await c.custom();
  expect(io.capture).toHaveBeenCalledWith('en',expect.any(AbortSignal),expect.any(Function));
  const liveAgent=c.snapshot.turns.find(t=>t.speaker==='AGENT'&&t.method==='LIVE AI');expect(liveAgent?.sourceLanguage).toBe('en');
  expect(c.snapshot.state).toBe('WAITING_FOR_AGENT');
});
it('prevents overlapping actions and stale playback after END CALL',async()=>{
  let release!: (text:string)=>void;io.translate=vi.fn(()=>new Promise<string>(resolve=>{release=resolve;}));
  const c=new CallController(io,()=>{});const call=c.start(options);
  await vi.waitFor(()=>expect(io.translate).toHaveBeenCalledOnce());
  const count=vi.mocked(io.play).mock.calls.length;c.end();release('late translation');await call;
  expect(io.play).toHaveBeenCalledTimes(count);expect(io.speech).not.toHaveBeenCalled();expect(io.cancel).toHaveBeenCalled();expect(c.snapshot.state).toBe('IDLE');
});
it('blocks custom/phrase buttons during playback and processes one action only',async()=>{
  let release!:()=>void;io.play=vi.fn((_blob,_lang,_signal,started)=>{started();return new Promise<void>(resolve=>{release=resolve;});});
  const c=new CallController(io,()=>{});const call=c.start(options);
  await vi.waitFor(()=>expect(c.snapshot.state).toBe('PLAYING_OPENING_DANISH'));
  await c.custom();await c.phrase('purpose');expect(io.capture).not.toHaveBeenCalled();expect(io.play).toHaveBeenCalledOnce();
  c.end();release();await call;expect(c.snapshot.state).toBe('IDLE');
});
it('finalized IDs prevent duplicates and preserve complete uncertainty without consent classification',async()=>{
  const c=new CallController(io,()=>{});await c.start(options);await c.scriptedResponse();
  const turns=c.snapshot.turns;expect(new Set(turns.map(t=>t.id)).size).toBe(turns.length);
  expect(turns.some(t=>t.translated==='I need to ask the doctor first.')).toBe(true);
  expect(JSON.stringify(turns)).not.toContain('consentGranted');expect(turns[1]).toHaveProperty('timestamp');expect(turns[1].timing?.t4).toBeDefined();
});
it('runs full callback scenario and thank-you without false consent state',async()=>{
  const c=new CallController(io,()=>{});await c.start(options);
  for(let i=0;i<5;i++) await c.scriptedResponse();
  expect(c.snapshot.state).toBe('CALL_COMPLETE');expect(c.snapshot.turns.at(-1)?.method).toBe('PRERECORDED');expect(log).toContain('/audio/clinic-ask-doctor.wav');expect(log).toContain('/audio/clinic-callback.wav');
});
it('consent scenario presents candidate email only for human spelling verification',async()=>{
  io.transcribe=vi.fn(async()=> 'Ja, anna.jensen@example.dk.');io.translate=vi.fn(async()=> 'Yes, anna.jensen@example.dk.');
  const c=new CallController(io,()=>{});await c.start({...options,scenario:'consent'});
  const turn=c.snapshot.turns[1];expect(turn.email?.confirmed).toBe(false);c.confirmEmail(turn.id,'anna.jensen@example.dk');expect(c.snapshot.turns[1].email?.confirmed).toBe(true);
  expect(c.snapshot.turns[1]).not.toHaveProperty('consent');
});
it('stays usable for a five-minute simulated call without a session restart',async()=>{
  vi.useFakeTimers();const c=new CallController(io,()=>{});await c.start(options);
  for(let i=0;i<4;i++){await vi.advanceTimersByTimeAsync(75000);clock+=75000;await c.scriptedResponse();}
  expect(c.snapshot.state).toBe('WAITING_FOR_AGENT');expect(io.prepare).toHaveBeenCalledOnce();
  await c.scriptedResponse();expect(c.snapshot.state).toBe('CALL_COMPLETE');vi.useRealTimers();
});
it('does not attribute previous AI latency to a prerecorded bank reply',async()=>{
  const states:{state:string;timed:boolean}[]=[];
  const c=new CallController(io,s=>states.push({state:s.state,timed:Boolean(s.timing)}));await c.start(options);await c.phrase('callback');
  expect(states.filter(s=>s.state==='PLAYING_DANISH').every(s=>!s.timed)).toBe(true);
});
it('shows candidate email only on provided clinic details, not an agent request',async()=>{
  const c=new CallController(io,()=>{});await c.start(options);
  io.transcribe=vi.fn(async()=>"We would like the doctor's professional email address.");
  await c.custom();expect(c.snapshot.turns.find(t=>t.speaker==='AGENT'&&t.method==='LIVE AI')?.email).toBeUndefined();
});
it('waits for a complete English source and final Danish text before requesting streaming speech',async()=>{
  const c=new CallController(io,()=>{});await c.start(options);vi.mocked(io.translate).mockClear();
  let finish!:(capture:Capture)=>void;io.capture=vi.fn(()=>new Promise<Capture>(resolve=>{finish=resolve;}));
  const pending=c.custom();await vi.waitFor(()=>expect(io.capture).toHaveBeenCalledOnce());
  expect(io.translate).not.toHaveBeenCalled();expect(io.streamDanish).not.toHaveBeenCalled();
  let finalText!:(text:string)=>void;io.translate=vi.fn(()=>new Promise<string>(resolve=>{finalText=resolve;}));
  finish({audio,endedAt:clock,finalization:'manual'});await vi.waitFor(()=>expect(io.translate).toHaveBeenCalledOnce());
  expect(io.streamDanish).not.toHaveBeenCalled();finalText('Hej fra aPureBase.');
  // Stop on the next clinic listening step rather than waiting for another unresolved translation.
  io.translate=vi.fn(async()=> 'English clinic translation');await pending;
  expect(io.streamDanish).toHaveBeenCalledWith('Hej fra aPureBase.',expect.any(AbortSignal),expect.any(Object));
});
it('measures first audio and playback separately from complete generation',async()=>{
  const {latencyParts}=await import('../src/controller');const c=new CallController(io,()=>{});await c.start(options);await c.custom();
  const turn=c.snapshot.turns.find(t=>t.speaker==='AGENT'&&t.method==='LIVE AI')!;
  expect(turn.timing).toMatchObject({provider:'ElevenLabs'});expect(latencyParts(turn.timing!)).toMatchObject({finalization:100,translation:200,voice:80,playback:30,total:410,complete:410});
});
it('offers an explicit voice retry without retranscribing, retranslating or duplicating the turn',async()=>{
  const c=new CallController(io,()=>{});await c.start(options);
  vi.mocked(io.streamDanish).mockRejectedValueOnce(new Error('Voice generation unavailable.'));await c.custom();
  expect(c.snapshot).toMatchObject({state:'ERROR',error:'Voice generation unavailable.',retryable:true});
  const count=c.snapshot.turns.length;const translations=vi.mocked(io.translate).mock.calls.length;
  await c.retryVoice();expect(c.snapshot.state).toBe('WAITING_FOR_AGENT');expect(io.streamDanish).toHaveBeenCalledTimes(2);
  expect(io.translate).toHaveBeenCalledTimes(translations+1); // only the new clinic source, never the retried English turn
  expect(c.snapshot.turns).toHaveLength(count+1);expect(new Set(c.snapshot.turns.map(t=>t.id)).size).toBe(c.snapshot.turns.length);
});
it('End Call during streaming resets to IDLE and ignores late bytes and playback events',async()=>{
  const c=new CallController(io,()=>{});await c.start(options);
  let hooks!:Parameters<CallIO['streamDanish']>[2];let release!:()=>void;
  io.streamDanish=vi.fn((_text,_signal,events)=>{hooks=events;events.requestStarted();return new Promise<void>(resolve=>{release=resolve;});});
  const pending=c.custom();await vi.waitFor(()=>expect(io.streamDanish).toHaveBeenCalledOnce());
  c.end();expect(c.snapshot.state).toBe('IDLE');expect(()=>hooks.firstAudio()).toThrow();expect(()=>hooks.started()).toThrow();
  release();await pending;expect(c.snapshot.state).toBe('IDLE');expect(c.snapshot.retryable).toBe(false);expect(c.snapshot.timing).toBeUndefined();
});
it('uses finalized incremental transcripts without a second file transcription and records stage boundaries',async()=>{
  io.capture=vi.fn(async()=>({audio,endedAt:10,confirmedAt:460,transcriptionStarted:462,transcriptReady:700,transcript:'Nej tak.',finalization:'silence' as const}));
  io.translate=vi.fn(async(_text,_language,_signal,events)=>{clock=710;events?.requestStarted();clock=800;events?.firstText();clock=900;return 'No, thank you.';});
  const c=new CallController(io,()=>{});await c.start({...options,demo:false});expect(io.transcribe).not.toHaveBeenCalled();expect(c.snapshot.turns[1].original).toBe('Nej tak.');
  expect(c.snapshot.turns[1].timing?.stages).toMatchObject({speechEnd:10,turnConfirmed:460,transcriptionStarted:462,transcriptReady:700,translationStarted:710,firstText:800,completeText:900,voiceRequested:900});
});
it('holds recommendations for an explicit approval and plays exact bank audio with no voice request',async()=>{
  const {phrases}=await import('../src/config/phrases');const p=phrases[0];
  io.recommend=vi.fn(async()=>({intent:'purpose',confidence:.99,english_interpretation:'Why are you calling?',recommended_response_en:p.en,response_da:p.da,action:'USE_CACHED_PHRASE' as const,requires_human_approval:true,cached_phrase_id:p.id}));
  io.transcribe=vi.fn(async()=> 'Hvorfor ringer du?');const c=new CallController(io,()=>{});await c.start(options);const outputs=vi.mocked(io.play).mock.calls.length;await c.suggest();expect(io.play).toHaveBeenCalledTimes(outputs);expect(c.snapshot.decision?.requires_human_approval).toBe(true);
  await c.approveSuggestion();expect(log).toContain('/audio/purpose.wav');expect(io.streamDanish).not.toHaveBeenCalled();expect(c.snapshot.cachePlaybackMs).toBe(0);
});
it('custom finalized translation exactly matching a bank phrase bypasses ElevenLabs',async()=>{
  const {phrases}=await import('../src/config/phrases');const c=new CallController(io,()=>{});await c.start(options);io.translate=vi.fn(async()=>phrases[0].da);await c.custom();expect(io.streamDanish).not.toHaveBeenCalled();expect(log).toContain('/audio/purpose.wav');expect(c.snapshot.turns.find(t=>t.speaker==='AGENT'&&t.method==='LIVE AI')?.timing?.provider).toBe('Cached');
});
