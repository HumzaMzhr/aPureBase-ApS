import {PhysicalRecognition,type SourceAudit} from '../acceptance/recognition';
import {ASRPreflight} from '../corrections/preflight';
import {EmailASRDiagnostics} from './diagnostics';
import {EvaluationPreflight} from './hardening/preflight';
import type {StructuredEmailSession} from './session';

/** Construction is inert. The existing bridge's start() remains a separately authorized
 * manual microphone/provider action. No recognition settings or VAD thresholds change.
 */
export function prepareC32Recognition(session:StructuredEmailSession,preflight:ASRPreflight,diagnostics:EmailASRDiagnostics,notify:(e:SourceAudit)=>void,failed:(error:Error)=>void,now=()=>performance.now(),factory?:ConstructorParameters<typeof PhysicalRecognition>[4],microphone?:ConstructorParameters<typeof PhysicalRecognition>[5],spokenTest=()=> '',statusChanged?:(state:ReturnType<EvaluationPreflight['snapshot']>)=>void){
 return new PhysicalRecognition(session,e=>{diagnostics.observe(e);preflight.observe(e,spokenTest());if(preflight instanceof EvaluationPreflight)statusChanged?.(preflight.snapshot());session.structuredEmail.audit.append('email.source_lifecycle',e);notify(e);},error=>{session.structuredEmail.invalidate('ASR_FAILED');failed(error);},now,factory,microphone);
}
