import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {SessionDiagnostics,diagnosticLimits,diagnosticMetadata,diagnosticReason,diagnosticStorageKey,exportLastSessionDiagnostics,lastSessionDiagnostics,observeDiagnostic} from '../src/streaming/sessionDiagnostics';
import {emptyLocal} from '../src/streaming/localSession';
beforeEach(()=>{const entries=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>entries.set(key,value)});});
afterEach(()=>vi.unstubAllGlobals());
it('retains a failed session through READY/reset and a new recorder/module lifetime',async()=>{
 const session=new SessionDiagnostics('en','realtime',()=>123);session.record('recognition.invalid_final',{itemId:'item-a',generation:3,committed:true,empty:true});session.finish('failed','recognition.invalid_final');
 const serialized=localStorage.getItem(diagnosticStorageKey);expect(serialized).toBeTruthy();expect(emptyLocal().state).toBe('READY');
 vi.resetModules();const reloaded=await import('../src/streaming/sessionDiagnostics');expect(reloaded.lastSessionDiagnostics()).toMatchObject({sessionId:session.sessionId,outcome:'failed',reason:'recognition.invalid_final'});expect(reloaded.exportLastSessionDiagnostics()).toContain('item-a');
});
it('does not overwrite a previous failure while the next successful session is running',()=>{
 const failure=new SessionDiagnostics('en','realtime');failure.finish('failed','voice.finalization_timeout');const original=localStorage.getItem(diagnosticStorageKey);
 const next=new SessionDiagnostics('da','realtime');next.record('translation.ready',{unitId:'next-unit'});expect(localStorage.getItem(diagnosticStorageKey)).toBe(original);
 next.finish('completed','drained');expect(lastSessionDiagnostics()).toMatchObject({sessionId:next.sessionId,outcome:'completed'});
 const third=new SessionDiagnostics('en','realtime');third.finish('failed','recognition.invalid_final');expect(lastSessionDiagnostics()?.sessionId).toBe(third.sessionId);
});
it('bounds event count and serialized bytes while retaining the terminal reason and first/last PCM summary',()=>{
 let now=0;const session=new SessionDiagnostics('en','realtime',()=>now++);
 session.record('voice.pcm_received',{requestId:'voice-one',totalSamples:24});
 for(let n=0;n<5000;n++)session.record('recognition.provider_event',{eventId:`event-${n}`,generation:n});
 session.record('voice.pcm_received',{requestId:'voice-one',totalSamples:4800});session.finish('failed','voice.finalization_timeout');const record=lastSessionDiagnostics()!;
 expect(record.events.length).toBeLessThanOrEqual(diagnosticLimits.events);expect(new TextEncoder().encode(localStorage.getItem(diagnosticStorageKey)!).length).toBeLessThanOrEqual(diagnosticLimits.bytes);expect(record.droppedEvents).toBeGreaterThan(0);
 expect(record.events.at(-1)?.event).toBe('session.ended');expect(record.connections[0]).toMatchObject({id:'voice-one',firstPCMReceivedAt:2,lastPCMReceivedAt:5003,totalSamples:4800});
});
it('excludes credentials, raw PCM, generated audio, transcript text, arbitrary nested payloads and error messages',()=>{
 const session=new SessionDiagnostics('en','realtime');session.record('voice.pcm_received',{
  requestId:'safe-connection',providerRequestId:'sk-secret-provider-token',apiKey:'private-key',authorization:'Bearer hidden-token',headers:{'xi-api-key':'hidden-key'},rawPCM:new Uint8Array([1,2,3]),audio:'base64AudioPayload',text:'a spoken secret',transcript:'private conversation',error:new Error('private-key'),classification:'voice.failure',sentCharacters:16
 });session.finish('failed',diagnosticReason(new Error('Voice finalization timed out. private-key')));
 const json=exportLastSessionDiagnostics()!;for(const forbidden of ['private-key','hidden-token','hidden-key','rawPCM','base64AudioPayload','a spoken secret','private conversation','sk-secret-provider-token','authorization','headers'])expect(json).not.toContain(forbidden);
 expect(json).toContain('safe-connection');expect(json).toContain('voice.finalization_timeout');expect(diagnosticMetadata({samples:Infinity,committed:'true',generation:[],itemId:'Bearer:secret'})).toEqual({});
});
it('exports recognition, translation, TTS, playback, watchdogs and pending counts as metadata with independent clocks',()=>{
 let now=100;const session=new SessionDiagnostics('en','realtime',()=>now++),snapshot=emptyLocal();
 snapshot.lanes.en.units.push({id:'en-1-0-3',turn:1,language:'en',start:0,end:3,source:'private source',target:'private target',status:'queued',precision:false,timing:{source_start:100,source_stable_at:120,translation_started:130,translation_ready:160,tts_text_sent:170}});
 snapshot.recognition={sourceSamples:2400,asrObservedWords:3,finalizedItems:0,pendingFinals:1,model:'fixture',delay:'low',pendingSource:''};
 session.record('recognition.provider_event',{providerAt:500,clock:'server-performance.now',itemId:'item-one',eventId:'event-one',generation:0,committed:true,alreadyFinal:false});session.capture(snapshot);
 session.record('ELEVENLABS_TEXT_SENT',{requestId:'voice-one',sentCharacters:14,textCharacters:14});session.record('tts.unit_sent',{unitId:'en-1-0-3',requestId:'voice-one'});session.record('voice.finish_requested',{requestId:'voice-one',ending:true});session.record('voice.provider_eos_sent',{requestId:'voice-one',clock:'server-performance.now',providerAt:700});
 session.record('voice.pcm_received',{requestId:'voice-one',totalSamples:2400});snapshot.lanes.en.units[0].timing.playback_started=200;snapshot.lanes.en.units[0].timing.playback_finished=300;session.capture(snapshot);
 session.record('voice.finalization_timeout_started',{requestId:'voice-one',timeoutMs:30000,deadlineAt:30100});session.record('voice.finalization_timeout_expired',{requestId:'voice-one',timeoutMs:30000});session.finish('failed','voice.finalization_timeout');
 const exported=JSON.parse(exportLastSessionDiagnostics()!);expect(exported.events.map((e:{event:string})=>e.event)).toEqual(expect.arrayContaining(['recognition.provider_event','unit.committed','translation.started','translation.ready','tts.queued','ELEVENLABS_TEXT_SENT','voice.provider_eos_sent','voice.pcm_received','playback.started','playback.finished','voice.finalization_timeout_started','voice.finalization_timeout_expired']));
 expect(exported.pending).toMatchObject({pendingRecognition:1,pendingTranslation:0,pendingTTS:1,pendingPlayback:1});expect(exported.units[0]).toMatchObject({requestId:'voice-one',timing:{translation_ready:160}});expect(JSON.stringify(exported)).not.toContain('private');expect(exported.events.find((e:{event:string})=>e.event==='recognition.provider_event').data).toMatchObject({providerAt:500,clock:'server-performance.now'});
});
it('cannot throw from observers or blocked/full local storage and seals the terminal trace against late events',()=>{
 expect(()=>observeDiagnostic(()=>{throw new Error('observer failure');},'voice.cleanup')).not.toThrow();const session=new SessionDiagnostics('en','realtime');vi.stubGlobal('localStorage',{setItem:()=>{throw new Error('QuotaExceededError');},getItem:()=>{throw new Error('SecurityError');}});
 expect(()=>session.finish('failed','voice.failure')).not.toThrow();const previous=exportLastSessionDiagnostics();session.record('late.event');session.finish('completed','drained');expect(exportLastSessionDiagnostics()).toBe(previous);
});
it('bounds unit and connection summaries as well as exported JSON',()=>{
 const session=new SessionDiagnostics('en','realtime'),snapshot=emptyLocal();
 for(let n=0;n<250;n++)snapshot.lanes.en.units.push({id:`en-${n}-0-3`,turn:n,language:'en',start:0,end:3,source:'not retained',status:'committed',precision:false,timing:{source_start:n,source_stable_at:n+1}});
 session.capture(snapshot);for(let n=0;n<40;n++)session.record('voice.pcm_received',{requestId:`context-${n}`,totalSamples:2400});session.finish('stopped','STOP');const record=lastSessionDiagnostics()!;
 expect(record.units).toHaveLength(diagnosticLimits.units);expect(record.connections).toHaveLength(diagnosticLimits.connections);expect(new TextEncoder().encode(exportLastSessionDiagnostics()!).length).toBeLessThanOrEqual(diagnosticLimits.bytes);
});
it('retains independent translation dispatch/ready and FIFO audio queue counters in the exported trace',()=>{
 const session=new SessionDiagnostics('en','realtime'),snapshot=emptyLocal();
 snapshot.backpressure={en:{state:'behind',lagMs:7000,warningLagMs:3000,highLagMs:6000,warning:'Interpreter is behind.',translationQueueUnits:4,ttsQueueUnits:3,playbackBufferMs:2000,workQueueJobs:7,workQueueCapacity:400,semanticUnits:8,semanticUnitCapacity:200,translationActiveRequests:2,translationReadyUnits:2,audioQueueJobs:3}};
 session.capture(snapshot);session.finish('stopped','STOP');const record=lastSessionDiagnostics()!;
 expect(record.pending).toMatchObject({translationActiveRequests:2,translationReadyUnits:2,audioQueueJobs:3});expect(record.events.find(e=>e.event==='session.pending')?.data).toMatchObject({translationActiveRequests:2,translationReadyUnits:2,audioQueueJobs:3});
});
it('retains completion provenance totals despite bounded event/block history and excludes all PCM payloads',()=>{
 const session=new SessionDiagnostics('en','realtime');
 for(let n=0;n<600;n++){
  const data={unitId:'u',requestId:'r',provider:'ElevenLabs',voiceId:'gIfqD5jrnhkFu8ENVbXC',modelId:'eleven_flash_v2_5',streamId:'renderer',rendererId:'renderer',pcmBlockSequence:n,firstSample:n*480,lastSample:(n+1)*480-1,scheduledAt:n,playbackStartedAt:n+1,playbackFinishedAt:n+2,provenanceVerified:true,rawPCM:new Uint8Array(4800),audio:'forbidden-audio',authorization:'secret'};
  session.record('VOICE_PROVENANCE_VERIFIED',data);session.record('PCM_BLOCK_SCHEDULED',data);session.record('PCM_BLOCK_PLAYBACK_STARTED',data);session.record('PCM_BLOCK_PLAYBACK_FINISHED',data);
 }
 session.finish('completed','drained');const record=lastSessionDiagnostics()!;expect(record.voiceProvenance).toEqual({audiblePCMBlocks:600,verifiedIsabellaPCMBlocks:600,unverifiedPCMBlocks:0,alternateVoicePCMBlocks:0});expect(record.pcmBlocks.length).toBeLessThanOrEqual(diagnosticLimits.pcmBlocks);expect(record.pcmBlocks.at(-1)).toMatchObject({pcmBlockSequence:599,playbackFinishedAt:601});expect(record.droppedPCMBlocks).toBeGreaterThan(0);expect(new TextEncoder().encode(exportLastSessionDiagnostics()!).length).toBeLessThanOrEqual(diagnosticLimits.bytes);expect(exportLastSessionDiagnostics()).not.toMatch(/forbidden-audio|rawPCM|authorization/);
});
