export const calibrationRate=24000;
/** Deterministic speech-like tones, not ASR or a voice-quality fixture. */
export const sourceSpeechRegions=[[2037,3241],[5241,6467]] as const;
export function signalPcm(durationMs:number,regions:readonly (readonly [number,number])[]){
 const pcm=new Uint8Array(Math.round(durationMs*24)*2),view=new DataView(pcm.buffer);
 for(const [start,end]of regions)for(let n=Math.round(start*24);n<Math.min(pcm.length/2,Math.round(end*24));n++)view.setInt16(n*2,Math.round(Math.sin(n/calibrationRate*2*Math.PI*480)*.12*32767),true);
 return pcm;
}
export const sourceCalibrationPcm=()=>signalPcm(8500,sourceSpeechRegions);
export function calibrationWav(pcm:Uint8Array){const bytes=new Uint8Array(44+pcm.length),view=new DataView(bytes.buffer);const text=(at:number,s:string)=>[...s].forEach((c,i)=>bytes[at+i]=c.charCodeAt(0));text(0,'RIFF');view.setUint32(4,36+pcm.length,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,24000,true);view.setUint32(28,48000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,pcm.length,true);bytes.set(pcm,44);return bytes;}
