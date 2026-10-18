import assert from 'node:assert/strict';
import {completionAudit} from './stage196-stress-support.mjs';
const state={lanes:{en:{receivedWords:67,committedWords:67,translatedWords:67,spokenWords:67,units:[{id:'last',status:'spoken'}]}},positions:{targetSamples:24000,playbackSamples:24000,bufferMs:0,carryMs:0},recognition:{pendingFinals:0},acoustic:{complete:true},backpressure:{en:{translationActiveRequests:0,translationReadyUnits:0,audioQueueJobs:0}}};
assert.equal(completionAudit(state,true).complete,true);
const premature=structuredClone(state);premature.lanes.en.spokenWords=55;premature.lanes.en.units[0].status='queued';
assert.equal(completionAudit(premature,true).complete,false);
assert.equal(completionAudit(premature,true).samplesDrained,true);
assert.equal(completionAudit(premature,true).unitsSpoken,false);
for(const mutate of [s=>s.recognition.pendingFinals=1,s=>s.positions.playbackSamples--,s=>s.positions.bufferMs=20,s=>s.positions.carryMs=20,s=>s.acoustic.complete=false,s=>s.backpressure.en.translationActiveRequests=1,s=>s.lanes.en.units[0].status='interrupted',s=>s.lanes.en.receivedWords++,s=>s.lanes.en.units=[]]){
 const copy=structuredClone(state);mutate(copy);assert.equal(completionAudit(copy,true).complete,false);
}
assert.equal(completionAudit(state,false).complete,false);
assert.equal(completionAudit(undefined,false).complete,false);
console.info('15 completion and premature-stop regression assertions passed; no provider requests.');
