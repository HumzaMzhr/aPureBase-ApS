import {afterEach,expect,it,vi} from 'vitest';
import {RecognitionAudit} from '../src/streaming/recognitionAudit';
import {SessionDiagnostics,lastSessionDiagnostics} from '../src/streaming/sessionDiagnostics';
import {align} from '../scripts/score-stage195-asr';
import reference from './fixtures/stage195-reference.json';
import physical from './fixtures/stage196-physical-session.json';
afterEach(()=>vi.unstubAllGlobals());
it('retains 35 ordinary word revisions without the old 32-partial eviction',()=>{const audit=new RecognitionAudit(750);for(let i=0;i<35;i++)audit.partial(0,'An ordinary changing partial '+i,i);expect(audit.snapshot().items[0].partials).toHaveLength(35);expect(audit.snapshot().items[0].droppedPartials).toBe(0);});
it('keeps provider/text/recovery chronology separately when repeated unit notifications evict the early event ring',()=>{
 const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)});const diagnostics=new SessionDiagnostics('en','realtime');
 diagnostics.record('ELEVENLABS_TEXT_SENT',{unitIds:['en-1-0-2'],text:'Never in metadata',sentCharacters:100});diagnostics.record('ELEVENLABS_STALL_RECOVERY',{receivedSamples:100,pcmIdleMs:800,recoveryAttempts:1});diagnostics.record('voice.provider_pcm_received',{totalSamples:100,pcmIdleMs:6790});
 for(let i=0;i<10000;i++)diagnostics.record('playback.unit_scheduled',{unitId:'en-1-0-2'});diagnostics.finish('completed','STOP');const result=lastSessionDiagnostics()!;
 expect(result.voiceLifecycle?.map(e=>e.event)).toEqual(['ELEVENLABS_TEXT_SENT','ELEVENLABS_STALL_RECOVERY','voice.provider_pcm_received']);expect(result.voiceLifecycle?.[1].data).toMatchObject({pcmIdleMs:800,recoveryAttempts:1});expect(result.droppedVoiceLifecycle).toBe(0);expect(JSON.stringify(result)).not.toContain('Never in metadata');expect(new TextEncoder().encode(JSON.stringify(result)).length).toBeLessThanOrEqual(384*1024);
});
it('scores every recorded provider final and committed unit without pretending that a timing replay changes WER',()=>{
 const raw=align(reference.text,physical.diagnostics.recognitionAudit.items.filter(i=>i.final).map(i=>({unitId:String(i.generation),text:i.final!}))),committed=align(reference.text,physical.review.snapshot.lanes.en.units.map(u=>({unitId:u.id,text:u.source})));
 expect(raw.referenceWords).toBe(166);expect(raw.observedWords).toBe(162);expect(committed.observedWords).toBe(161);expect(raw).toMatchObject({substitutions:8,deletions:4,insertions:0});expect(committed).toMatchObject({substitutions:5,deletions:5,insertions:0});expect(raw.WER).toBeCloseTo(12/166);expect(committed.WER).toBeCloseTo(10/166);
});
