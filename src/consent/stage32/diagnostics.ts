import type {SourceAudit} from '../acceptance/recognition';
import {EmailAudit} from './email/audit';

/** Attach alongside the unchanged C-3.1 preflight callback. Metadata/text only; no PCM. */
export class EmailASRDiagnostics {
 private boundaries=new Map<string,{start:number;end?:number;owner:unknown;revision:unknown}>();
 readonly audit=new EmailAudit();
 observe(source:SourceAudit){
  const hasPCM=(x:unknown):boolean=>x instanceof ArrayBuffer||ArrayBuffer.isView(x)||!!x&&typeof x==='object'&&Object.values(x).some(hasPCM);
  if(hasPCM(source.data))throw new Error('PCM/recordings are excluded from email diagnostics');
  this.audit.append('email.asr.lifecycle',source);
  if(source.event==='speechStarted'&&source.turnId)this.boundaries.set(source.turnId,{start:Number(source.data.speechStartedAt),owner:source.data.answerPlaybackId,revision:source.data.recipientRevision});
  const boundary=source.turnId?this.boundaries.get(source.turnId):undefined;
  if(boundary&&source.event==='speechEnded')boundary.end=Number(source.data.speechEndedAt);
  if(source.event==='transcriptFinal')this.audit.append('email.asr.endpoint_diagnostic',{turnId:source.turnId??null,boundary:boundary??null,ownedOnsetAvailable:!!boundary,localEndpointObserved:boundary?.end!==undefined,providerConfidence:null,wordAlignmentAvailable:false,note:'Local VAD is not acoustic word alignment; boundary crossing needs human/source evidence. No confidence fabricated.'});
 }
 export(){return {...this.audit.export(),boundaries:[...this.boundaries].map(([turnId,b])=>({turnId,...structuredClone(b)})),liveASRVerified:false};}
}
