import type {AcousticSnapshot} from './acousticTiming';
const seconds=(at:number|null)=>at===null?'unavailable':`${(at/1000).toFixed(3)}s`;
export function calibrationTrace(snapshot?:AcousticSnapshot){
 return snapshot?.units.slice(-8).map(u=>`UNIT ${u.unitId}\nSource audio: ${seconds(u.sourceAudioStart)}–${seconds(u.sourceAudioEnd)} (${u.sourceAudioAlignment})\nASR available: ${seconds(u.asrAvailableAt)} · Committed: ${seconds(u.committedAt)}\nTranslation: ${seconds(u.translationStartedAt)} → ${seconds(u.translationReadyAt)}\nTTS queued: ${seconds(u.ttsQueuedAt)} · Actually sent: ${seconds(u.ttsTextSentAt)}\nFirst PCM: ${seconds(u.ttsFirstPCMAt)} · Scheduled: ${seconds(u.pcmScheduledAt)}\nPlayback: ${seconds(u.playbackStartAt)} → ${seconds(u.playbackEndAt)}\nStage latencies (ms): ${JSON.stringify(u.latencies)}`).join('\n\n')||'No committed semantic units yet.';
}
