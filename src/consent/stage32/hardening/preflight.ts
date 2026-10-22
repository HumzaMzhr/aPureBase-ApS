import {ASRPreflight} from '../../corrections/preflight';
import type {SourceAudit} from '../../acceptance/recognition';
export type PreflightStatus='READY'|'MISSING_CREDENTIAL'|'MODEL_UNAVAILABLE'|'MIC_PERMISSION_REQUIRED'|'TRANSPORT_ERROR'|'UNKNOWN_ERROR';
export function preflightStatus(input:{configured?:boolean;modelAvailable?:boolean;permission?:'granted'|'denied'|'prompt';transport?:'ready'|'error'|'unknown';failure?:string}):PreflightStatus {
 if(input.configured===false)return'MISSING_CREDENTIAL';if(input.modelAvailable===false)return'MODEL_UNAVAILABLE';if(input.permission!=='granted')return'MIC_PERMISSION_REQUIRED';if(input.transport==='error')return'TRANSPORT_ERROR';return input.configured===true&&input.modelAvailable===true&&input.transport==='ready'&&!input.failure?'READY':'UNKNOWN_ERROR';
}
/** Consumes the unchanged physical recognition lifecycle; never opens capture/transport. */
export class EvaluationPreflight extends ASRPreflight {
 private current:{configured?:boolean;modelAvailable?:boolean;permission:'granted'|'denied'|'prompt';transport:'ready'|'error'|'unknown';failure?:string}={permission:'prompt',transport:'unknown'};
 constructor(readonly evidenceSource:'LIVE_LIFECYCLE'|'INJECTED_LOCAL'='LIVE_LIFECYCLE'){super();}
 override backendResult(v:Parameters<ASRPreflight['backendResult']>[0]){this.current.configured=v.configured;return super.backendResult(v);}
 environment(value:{permission?:'granted'|'denied'|'prompt';modelAvailable?:boolean}){if(value.permission!==undefined&&!['granted','denied','prompt'].includes(value.permission)||value.modelAvailable!==undefined&&typeof value.modelAvailable!=='boolean')throw new Error('Invalid preflight input');Object.assign(this.current,value);}
 override observe(e:SourceAudit,spokenTest:string){super.observe(e,spokenTest);if(e.event==='microphone.permission_requested'){this.current.permission='prompt';this.current.transport='unknown';delete this.current.failure;}if(e.event==='microphone.capture_ready'&&e.data.actualGetUserMedia===true)this.current.permission='granted';if(e.event==='recognition.started'){this.current.modelAvailable=true;this.current.transport='ready';delete this.current.failure;}if(e.event==='recognition.failed'){this.current.transport='error';this.current.failure='LIFECYCLE_FAILURE';}if(e.event==='recognition.stopped')this.current.transport='unknown';}
 snapshot(){const mapped=preflightStatus(this.current);const status=mapped==='READY'&&[this.backend,this.microphone,this.authorization,this.transport].some(v=>v!=='PASS')?'UNKNOWN_ERROR':mapped;return {status,transportChecks:{backend:this.backend,microphone:this.microphone,authorization:this.authorization,transport:this.transport},scenarioEvidenceGate:super.mayStartScenarios,inputs:structuredClone(this.current),evidenceSource:this.evidenceSource,liveASRVerified:false};}
 override get mayStartScenarios(){return this.snapshot().status==='READY'&&super.mayStartScenarios;}
}
