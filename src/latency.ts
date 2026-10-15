import type { StageTiming } from './types';
const difference = (end?: number, start?: number) => end === undefined || start === undefined ? undefined : end - start;
export function stageLatency(t: StageTiming) {
  return { endDetection: difference(t.turnConfirmed,t.speechEnd), transcription: difference(t.transcriptReady,t.transcriptionStarted), firstText: difference(t.firstText,t.translationStarted), completeText: difference(t.completeText,t.translationStarted), handoff: difference(t.voiceRequested,t.completeText), elevenFirstAudio: difference(t.firstAudio,t.voiceRequested), playback: difference(t.playback,t.firstAudio), total: difference(t.playback,t.speechEnd) };
}
export function percentile(values: number[], p: number) {
  const sorted = values.filter(Number.isFinite).sort((a,b)=>a-b); if (!sorted.length) return undefined;
  if (p === .5) return sorted.length % 2 ? sorted[Math.floor(sorted.length/2)] : (sorted[sorted.length/2-1] + sorted[sorted.length/2])/2;
  return sorted[Math.max(0,Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1))];
}
export function summarize(rows: Record<string, number | undefined>[]) {
  return Object.fromEntries([...new Set(rows.flatMap(row=>Object.keys(row)))].map(key=>{
    const values=rows.map(row=>row[key]).filter((value):value is number=>value!==undefined);
    return [key,{count:values.length,median:percentile(values,.5),p95:percentile(values,.95)}];
  }));
}
