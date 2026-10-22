import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {expect,it} from 'vitest';
import {simulateStage192,simulationAssumptions} from '../scripts/stage192-simulation';
it('compares the actual frozen before implementation with Stage 1.9.2 using identical deterministic 90-second services',async()=>{
 const before=await simulateStage192('before'),after=await simulateStage192('after');
 expect(after.finalTailMs!).toBeLessThan(before.finalTailMs!);expect(after.trailingDelay!.medianMs).toBeLessThan(before.trailingDelay!.medianMs);expect(after.timeToFirstTranslatedAudioMs!).toBeLessThan(before.timeToFirstTranslatedAudioMs!);
 for(const row of [before,after]){expect(row.translationRequests).toBe(row.units);expect(row.maxConcurrentTranslations).toBeLessThanOrEqual(2);expect(row.maxAudibleOwners).toBe(1);expect(row.committedWords).toBe(row.spokenWords);expect(row.pending).toEqual({translation:0,TTS:0,playback:0,timers:0});}
 expect(after.voiceConnections).toBeLessThan(before.voiceConnections);await writeFile('benchmarks/stage192-deterministic-comparison.json',JSON.stringify({assumptions:simulationAssumptions,before,after},null,2)+'\n');
});
it.each([45,90])('drains %i seconds completely, once and in order with two bounded slots under 3.5-second translation service',async seconds=>{
 const result=await simulateStage192('after',seconds,3500);expect(result.translationRequests).toBe(result.units);expect(result.maxConcurrentTranslations).toBe(2);expect(result.pending).toEqual({translation:0,TTS:0,playback:0,timers:0});expect(result.committedWords).toBe(result.translatedWords);expect(result.translatedWords).toBe(result.spokenWords);
});
it('retains Stage 1.9.2 protected cores outside the explicitly authorized Stage 1.9.3 delivery/metadata changes',async()=>{
 const hashes=JSON.parse(await readFile('benchmarks/stage192-protected-files.json','utf8')) as Record<string,string>;
 // Stage 1.9.3 explicitly authorizes greeting flush, native pace, verified gain,
 // recognition context metadata and diagnostic additions. Stage 1.9.4 explicitly
 // authorizes signed-tail semantics and exact validated greeting equivalences;
 // Stage 1.9.5 explicitly authorizes local recognition endpoint correctness.
 // Do not rewrite baseline hashes.
 const authorized=new Set(['src/streaming/localOutput.ts','src/streaming/voiceClient.ts','src/streaming/scheduler.ts','src/streaming/sessionDiagnostics.ts','server/continuousVoice.ts','server/continuousTranscription.ts','src/streaming/acousticTiming.ts','server/incrementalTranslation.ts','src/streaming/continuousRecognition.ts']);
 for(const [file,hash]of Object.entries(hashes))if(!authorized.has(file))expect(createHash('sha256').update(await readFile(file)).digest('hex'),file).toBe(hash);
});
