import type { SourceAudit } from '../acceptance/recognition';
export const smokeUtterances=['Ja','Nej','Det er mig','Send det til min e-mail','Jeg vil gerne vide mere'] as const;
export type Check='NOT_TESTED'|'PASS'|'FAIL';
export class ASRPreflight {
 microphone:Check='NOT_TESTED';backend:Check='NOT_TESTED';authorization:Check='NOT_TESTED';transport:Check='NOT_TESTED';finalSmoke:Check='NOT_TESTED';
 events:SourceAudit[]=[];finals:{spokenTest:string;literalFinal:string;source:'MICROPHONE';callId:string;turnId:string;latencyMs:number|null;providerSession:'READY';review:'NOT_REVIEWED'|'PASS'|'FAIL';reviewedBy?:string;reviewedAt?:string}[]=[];
 private started=false;private onsets=new Map<string,number>();private ends=new Map<string,number>();
 backendResult(value:{stage?:string;configured?:boolean;gateway?:boolean}){this.backend=value.stage==='2.0c31'&&value.gateway===true?'PASS':'FAIL';if(!value.configured){this.authorization='FAIL';this.transport='FAIL';}return this.backend==='PASS'&&value.configured===true;}
 observe(e:SourceAudit,spokenTest:string){this.events.push(structuredClone(e));if(e.event==='microphone.capture_ready'&&e.data.actualGetUserMedia===true)this.microphone='PASS';if(e.event==='recognition.started'){this.started=true;this.authorization='PASS';this.transport='PASS';}if(e.event==='speechStarted'&&e.turnId)this.onsets.set(e.turnId,e.at);if(e.event==='speechEnded'&&e.turnId)this.ends.set(e.turnId,typeof e.data.speechEndedAt==='number'?e.data.speechEndedAt:e.at);
 if(e.event==='transcriptFinal'&&e.turnId?.startsWith('mic:')&&e.data.source==='provider'&&e.data.final===true&&typeof e.data.text==='string'&&e.data.text.trim()&&this.started&&this.microphone==='PASS'&&this.backend==='PASS'&&this.onsets.has(e.turnId)&&!this.finals.some(f=>f.turnId===e.turnId&&f.callId===e.callId)){this.finals.push({spokenTest,literalFinal:e.data.text,source:'MICROPHONE',callId:e.callId,turnId:e.turnId,latencyMs:this.ends.has(e.turnId)?e.at-this.ends.get(e.turnId)!:null,providerSession:'READY',review:'NOT_REVIEWED'});this.finalSmoke='PASS';}
 if(e.event==='recognition.failed'){if(this.microphone!=='PASS')this.microphone='FAIL';if(!this.started)this.authorization='FAIL';this.transport='FAIL';this.finalSmoke='FAIL';this.started=false;}}
 fail(){this.transport='FAIL';this.finalSmoke='FAIL';this.started=false;}
 get mayStartScenarios(){return [this.microphone,this.backend,this.authorization,this.transport,this.finalSmoke].every(x=>x==='PASS')&&this.finals.some(f=>f.review==='PASS');}
 export(){return structuredClone({microphone:this.microphone,recognitionBackend:this.backend,providerSessionAuthorization:this.authorization,realtimeTransport:this.transport,danishFinalSmoke:this.finalSmoke,finals:this.finals,events:this.events,sourceAudioStored:false,telephoneVerified:false});}
}
