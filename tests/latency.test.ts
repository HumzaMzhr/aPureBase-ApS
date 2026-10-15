import { expect, it } from 'vitest';
import { stageLatency, summarize } from '../src/latency';
it('measures all eight directly observed stages without inventing absent timestamps',()=>{
  expect(stageLatency({speechEnd:0,turnConfirmed:450,transcriptionStarted:460,transcriptReady:650,translationStarted:660,firstText:900,completeText:1100,voiceRequested:1110,firstAudio:1500,playback:1550})).toEqual({endDetection:450,transcription:190,firstText:240,completeText:440,handoff:10,elevenFirstAudio:390,playback:50,total:1550});
  expect(stageLatency({speechEnd:0,turnConfirmed:450}).transcription).toBeUndefined();
});
it('uses the middle pair for an even-sample median and nearest-rank p95 with explicit counts',()=>{
  expect(summarize(Array.from({length:10},(_,i)=>({total:(i+1)*100})))).toEqual({total:{count:10,median:550,p95:1000}});
  expect(summarize([{total:0,firstText:undefined},{total:200,firstText:100}])).toEqual({total:{count:2,median:100,p95:200},firstText:{count:1,median:100,p95:100}});
});
