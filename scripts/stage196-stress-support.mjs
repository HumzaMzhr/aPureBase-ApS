/** Test-only stopping rules. Never imported by production. */
export function completionAudit(snapshot, idle) {
 const lane=snapshot?.lanes?.en, p=snapshot?.positions??{}, r=snapshot?.recognition??{};
 const counts=lane?[lane.receivedWords,lane.committedWords,lane.translatedWords,lane.spokenWords]:[];
 const wordsEqual=counts.length===4&&counts.every(n=>Number.isFinite(n)&&n>0&&n===counts[0]);
 const unitsSpoken=Boolean(lane?.units?.length)&&lane.units.every(u=>u.status==='spoken');
 const samplesDrained=p.targetSamples>0&&p.targetSamples===p.playbackSamples;
 const queues=snapshot?.backpressure?.en??{};
 const workersDrained=Boolean(idle)&&!(r.pendingFinals??0)&&['translationActiveRequests','translationReadyUnits','audioQueueJobs'].every(k=>!(queues[k]??0));
 const buffersDrained=(p.bufferMs??Infinity)<=5&&(p.carryMs??0)<=5;
 const acousticComplete=Boolean(snapshot?.acoustic?.complete);
 return {complete:wordsEqual&&unitsSpoken&&samplesDrained&&workersDrained&&buffersDrained&&acousticComplete,wordsEqual,unitsSpoken,samplesDrained,workersDrained,buffersDrained,acousticComplete,counts,unfinishedUnits:lane?.units?.filter(u=>u.status!=='spoken').map(u=>({id:u.id,status:u.status}))??[]};
}
