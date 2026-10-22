import {writeFile} from 'node:fs/promises';
import {expect,it} from 'vitest';
import {simulateStage193,stage193Assumptions} from '../scripts/stage193-simulation';
it('compares frozen Stage 1.9.2 and candidate source/greeting delivery with identical provider service and explicit slower audio',async()=>{
 const baseline=await simulateStage193('baseline'),candidate=await simulateStage193('candidate');
 expect(candidate.firstTranslatedAudioMs).toBeLessThan(baseline.firstTranslatedAudioMs);expect(candidate.totalSimulatedAudioMs/baseline.totalSimulatedAudioMs).toBeCloseTo(1/.95);expect(candidate.finalTailMs-baseline.finalTailMs).toBeLessThan(250);
 for(const r of [baseline,candidate]){expect(r.voiceConnections).toBe(1);expect(r.translationRequests).toBe(r.deliveredSemanticUnits);expect(r.TTSRequests).toBe(r.deliveredSemanticUnits);expect(r.maxConcurrentTranslations).toBeLessThanOrEqual(2);expect(r.committedWords).toBe(r.spokenWords);expect(r.pending).toEqual({translation:0,TTS:0,playback:0,timers:0});}
 await writeFile('benchmarks/stage193-deterministic-comparison.json',JSON.stringify({assumptions:stage193Assumptions,baseline,candidate},null,2)+'\n');
});
it.each([45,90])('drains %i seconds of slower Isabella speech with two translation slots under 3500ms translation service',async seconds=>{
  const r=await simulateStage193('candidate',seconds,3500);expect(r.maxConcurrentTranslations).toBe(2);expect(r.pending).toEqual({translation:0,TTS:0,playback:0,timers:0});expect(r.deliveredSemanticUnits).toBe(Math.floor(seconds/2.5));expect(r.TTSRequests).toBe(r.translationRequests);expect(r.spokenWords).toBe(r.committedWords);expect(r.sustainedWindows.late!.medianMs).toBeLessThanOrEqual(r.sustainedWindows.early!.medianMs+1);
});
