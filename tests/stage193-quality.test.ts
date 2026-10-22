import {realtimeIsabellaGain} from '../src/config/realtimeDelivery';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {SemanticCommitter,precisionTrigger} from '../src/streaming/semantic';
import {SemanticCommitter as BeforeCommitter} from './fixtures/stage192-semantic';
import {completeGreeting} from '../src/streaming/completeGreeting';
import {deliveryGain} from '../src/streaming/deliveryGain';
import {realtimeIsabellaSpeed} from '../src/config/realtimeDelivery';
import {transcriptionSession} from '../server/liveTranscription';
import {campaignSpeechText} from '../src/config/campaignSpeech';
import {SessionDiagnostics,lastSessionDiagnostics} from '../src/streaming/sessionDiagnostics';
import {emptyLocal} from '../src/streaming/localSession';
import {AcousticTiming} from '../src/streaming/acousticTiming';
import {sessionBreakdown} from '../src/streaming/sessionBreakdown';
const committer=()=>new SemanticCommitter('en',100,120,true,precisionTrigger,true,true,true);
beforeEach(()=>{vi.useFakeTimers();const map=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v)});});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it.each(['Hi, good morning.','Hi, good morning','Good morning.'])('commits the complete stable greeting %s before the next sentence without changing its text',text=>{
 const c=committer();expect(c.update(text,0).segments).toEqual([]);const segments=c.update(text+' ',130).segments;expect(segments.map(s=>s.text)).toEqual([text]);expect(segments[0].stabilityReason).toBe('stable_closed_greeting');expect(c.update(text,200,true).segments).toEqual([]);
});
it('removes terminal punctuation wait for a stable complete greeting against the exact Stage 1.9.2 baseline',()=>{
 const before=new BeforeCommitter('en',100,120,true,precisionTrigger,true,true,true),after=committer(),text='Hi, good morning';before.update(text,0);after.update(text,0);expect(before.update(text,130).segments).toEqual([]);expect(after.update(text,130).segments.map(s=>s.text)).toEqual([text]);
});
it.each(['Hi,','Hi, good','My name is','I am calling on behalf of','I would like to','Good morning if','Could you give permission?','My email address is a@example.dk.','My phone number is four seven.','The date is October fourteen.','The legal name is Hannah.','I give consent.'])('holds incomplete or consequential source %s',text=>{
 const c=committer();c.update(text,0);expect(c.update(text,500).segments).toEqual([]);
});
it('does not manufacture stability by polling or accept a changed greeting prefix',()=>{
 const c=committer();c.update('Hi, good morning',0);expect(c.cursor).toBe(0);expect(c.update('Hi, good morning if',500).segments).toEqual([]);
});
it('keeps voice-first known-name aliases while exact identity remains protected',()=>{
 const c=committer(),text=campaignSpeechText('My name is Hamza.');expect(text).toBe('My name is Humza.');c.update(text,0);expect(c.update(text,130).segments.map(s=>s.text)).toEqual([text]);expect(campaignSpeechText('The legal name is Hamza.')).toBe('The legal name is Hamza.');expect(precisionTrigger('The legal name is Hamza.')).toBeTruthy();
});
it('uses supported non-scripted context hints while preserving recognition models and low delay',()=>{
 const config=transcriptionSession('en','gpt-live-transcribe').session.audio.input.transcription;if(!('keywords' in config))throw new Error('Missing modern recognition hints.');expect(config.model).toBe('gpt-live-transcribe');expect(config.delay).toBe('low');expect(config.keywords).toEqual(expect.arrayContaining(['Humza','aPureBase','healthcare professionals']));expect(config.prompt).not.toMatch(/Hi, my name|Our Papa|Or halt|spelled H-u|We are calling because/i);expect(config.keywords?.every(k=>!/[<>\r\n]/.test(k))).toBe(true);expect(campaignSpeechText('Our Papa. Or halt.')).toBe('Our Papa. Or halt.');
});
it('keeps native speed in the approved range without touching browser playback rate',()=>{
 expect(realtimeIsabellaSpeed).toBeGreaterThanOrEqual(.9);expect(realtimeIsabellaSpeed).toBeLessThanOrEqual(.95);
});
it('increases healthy PCM level linearly and protects hot PCM with headroom instead of waveform clipping',()=>{
 const quiet=new Float32Array([.1,-.2,.15]),q=deliveryGain(quiet,true);expect(q.gainApplied).toBe(realtimeIsabellaGain);expect(q.preGainPeak).toBeCloseTo(.2);expect(q.postGainPeak).toBeCloseTo(.2*realtimeIsabellaGain);expect(q.clippingEvents).toBe(0);expect(quiet[1]/quiet[0]).toBeCloseTo(-2);
 const hot=new Float32Array([1,-1,.5]),h=deliveryGain(hot,true);expect(h.peakProtectionEvents).toBe(1);expect(h.gainApplied).toBe(.98);expect(h.postGainPeak).toBeCloseTo(.98);expect(h.clippingEvents).toBe(0);expect(hot[2]/hot[0]).toBeCloseTo(.5);
});
it('preserves numeric quality and first/tail metadata after event eviction without storing raw ASR or audio',()=>{
 let now=100;const diagnostics=new SessionDiagnostics('en','realtime',()=>now),snapshot=emptyLocal();
 diagnostics.record('VOICE_READY',{configuredSpeed:null,effectiveSpeedSetting:.95});diagnostics.record('recognition.context_hints',{contextHintId:'healthcare-contact-v1',keywordCount:9});
 const metrics=deliveryGain(new Float32Array([.1,-.2]),true);diagnostics.record('PCM_GAIN_APPLIED',{...metrics,provenanceVerified:true,rawASR:'SENSITIVE',audio:new Uint8Array([1,2]),authorization:'SECRET'});
 diagnostics.capture(snapshot);for(let n=0;n<2500;n++){now++;diagnostics.record('bounded.event');}diagnostics.finish('completed','STOP');const record=lastSessionDiagnostics()!;
 expect(record.voiceQuality).toMatchObject({configuredSpeed:null,effectiveSpeedSetting:.95,gainApplied:realtimeIsabellaGain,clippingEvents:0});expect(record.asrContext).toMatchObject({contextHintId:'healthcare-contact-v1',keywordCount:9});expect(record.latencyBreakdown?.firstAudioBreakdown.totalFirstAudio).toBeNull();expect(record.latencyBreakdown?.tailBreakdown.totalTail).toBeNull();expect(record.droppedEvents).toBeGreaterThan(0);expect(JSON.stringify(record)).not.toMatch(/SENSITIVE|SECRET|rawASR|authorization/);
});
it('never classifies a bare Hi or Hej, question or unfinished qualifier as a complete greeting',()=>{
 for(const text of ['Hi,','Hej.','Good morning if','Good morning?','Hi my name is'])expect(completeGreeting(text)).toBe(false);
});
it.each(['Or halt','Our Papa is to make professional information easier'])('confirms corrupt raw item %s could not be created by the Stage 1.9.2 early-commit rule',text=>{
 const before=new BeforeCommitter('en',100,120,true,precisionTrigger,true,true,true);before.update(text,0);expect(before.update(text,500).segments).toEqual([]);expect(before.update(text,600,true).segments.map(s=>s.text)).toEqual([text]);
});
it('keeps first-audio and tail clocks consistent and does not add verification CPU time twice',()=>{
 const s=emptyLocal();s.acoustic={...new AcousticTiming(()=>1000).snapshot(),epoch:1000,sourceSpeechOnset:100,sourceSpeechEnd:200,firstTranslatedAudioActuallyPlayed:550,targetPlaybackEnd:800,firstAudioLatency:450,tailLatency:600,complete:true};
 s.lanes.en.units=[{id:'first-last',turn:1,language:'en',start:0,end:3,source:'private source',target:'private translation',status:'spoken',precision:false,timing:{source_start:1100,source_end_observed:1200,source_stable_at:1250,translation_started:1260,translation_ready:1360,translation_consumed:1370,tts_text_sent:1380,first_audio_received:1500,playback_started:1550,playback_finished:1800}}];
 const r=sessionBreakdown(s,'en',()=>1390,1495,.5);expect(r.firstAudioBreakdown).toEqual({sourceOnsetToStableASR:100,stableASRToCommit:50,commitToTranslationStart:10,translationProvider:100,translationReadyToTTS:30,ttsToFirstPCM:105,pcmVerification:.5,pcmToPlayback:55,totalFirstAudio:450});expect(r.tailBreakdown).toEqual({sourceSpeechEndAt:1200,targetAudioEndAt:1800,sourceEndToFinalCommit:50,translationQueue:10,finalTranslation:100,orderedWait:10,ttsWait:20,ttsGeneration:110,finalPlayback:300,totalTail:600,rawSignedTail:null,targetAudioLead:null});expect(JSON.stringify(r)).not.toContain('private');
});
