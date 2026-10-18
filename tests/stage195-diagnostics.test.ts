import {readFile} from 'node:fs/promises';
import {afterEach,expect,it,vi} from 'vitest';
import {SessionDiagnostics,lastSessionDiagnostics,diagnosticMetadata} from '../src/streaming/sessionDiagnostics';
import {RecognitionAudit} from '../src/streaming/recognitionAudit';
import {emptyLocal} from '../src/streaming/localSession';
import {realtimeIsabellaGain,realtimeIsabellaSpeed} from '../src/config/realtimeDelivery';
import {align} from '../scripts/score-stage195-asr';
import physical from './fixtures/stage195-physical-session.json';
import reference from './fixtures/stage195-reference.json';
afterEach(()=>vi.unstubAllGlobals());
it('exports bounded raw partial/final and capture evidence separately from the noisy sanitized event ring',()=>{
 const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)});const diagnostics=new SessionDiagnostics('en','realtime'),audit=new RecognitionAudit(750);audit.item(0,1);audit.partial(0,'Raw provider draft',2);Object.assign(audit.item(0),{final:'Raw provider final',finalAt:3});
 const snapshot=emptyLocal();snapshot.recognition={sourceSamples:2400,asrObservedWords:3,finalizedItems:1,pendingFinals:0,model:'gpt-live-transcribe',delay:'low',pendingSource:'',audit:audit.snapshot()};diagnostics.record('capture.config',{sampleRate:24000,channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true,deviceId:'NEVER_EXPORT_DEVICE_ID',authorization:'NEVER_EXPORT_HEADER'});diagnostics.capture(snapshot);for(let n=0;n<10000;n++)diagnostics.record('playback.unit_scheduled',{unitId:'old',providerAt:n});diagnostics.finish('stopped','review');const record=lastSessionDiagnostics()!;
 expect(record.droppedEvents).toBeGreaterThan(0);expect(record.recognitionAudit?.items[0]).toMatchObject({partials:[{at:2,text:'Raw provider draft'}],final:'Raw provider final'});expect(record.captureSettings).toMatchObject({sampleRate:24000,channelCount:1,autoGainControl:true});expect(JSON.stringify(record)).not.toMatch(/NEVER_EXPORT/);expect(diagnosticMetadata({text:'arbitrary-event-payload'})).toEqual({});expect(new TextEncoder().encode(JSON.stringify(record)).length).toBeLessThanOrEqual(384*1024);
});
it('scores the exact recorded intended passage separately from the false post-passage item',()=>{
 const intended=physical.units.filter(u=>u.id!=='en-43-0-10'),raw=align(reference.text,intended.map(u=>({unitId:u.id,text:u.rawSource}))),committed=align(reference.text,intended.map(u=>({unitId:u.id,text:u.source})));
 expect(raw).toMatchObject({referenceWords:166,observedWords:168,substitutions:16,deletions:3,insertions:5});expect(raw.WER).toBeCloseTo(24/166);expect(committed.WER).toBeCloseTo(21/166);expect(raw.perUnit.filter(u=>u.edits.length)).toHaveLength(17);expect(raw.edits.some(e=>e.unitId==='en-43-0-10')).toBe(false);
});
it('locks accepted voice/speed/gain/model/provenance and preserves the production context from before this stage',async()=>{
 expect(realtimeIsabellaGain).toBe(3.5573605757216837);expect(realtimeIsabellaSpeed).toBe(.95);
 const files=['src/config/realtimeDelivery.ts','src/streaming/pcmProvenance.ts','src/streaming/voiceIdentity.ts','server/models.ts','server/transcriptionContext.ts'];
 const hashes=JSON.parse(await readFile('tests/fixtures/stage195-locked-files.json','utf8')) as Record<string,string>;const{createHash}=await import('node:crypto');for(const file of files)expect(createHash('sha256').update(await readFile(file)).digest('hex'),file).toBe(hashes[file]);
});
