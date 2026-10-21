import {boundedRecords} from './databaseResolver';
import {classifyEmail} from './confidence';
import {validateSuggestion} from './reconciliation';
import type {ContactEmailResolver,ContactScope,EmailReconciliationPort,ParsedEmail,Resolution} from './types';

/** Bounded deadline, cancellation and no retry. Late adapters cannot mutate returned evidence. */
export async function withDeadline<T>(work:(signal:AbortSignal)=>Promise<T>,ms:number,parent?:AbortSignal):Promise<T>{
 const abort=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let onAbort:(()=>void)|undefined;
 try{return await Promise.race([Promise.resolve().then(()=>{abort.signal.throwIfAborted();return work(abort.signal);}),new Promise<never>((_,reject)=>{
  onAbort=()=>{abort.abort();reject(new Error('CANCELLED'));};
  if(parent?.aborted){onAbort();return;}parent?.addEventListener('abort',onAbort,{once:true});
  timer=setTimeout(()=>{abort.abort();reject(new Error('TIMEOUT'));},ms);
 })]);}finally{if(timer)clearTimeout(timer);if(onAbort)parent?.removeEventListener('abort',onAbort);abort.abort();}
}
export async function resolveEmail(parsed:ParsedEmail,scope:ContactScope,resolver:ContactEmailResolver,model?:EmailReconciliationPort,signal?:AbortSignal,timeoutMs=250):Promise<Resolution>{
 if(!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>1000)throw new Error('Bounded resolver deadline required');
 if(parsed.errors.length)return classifyEmail(parsed,[]);
 let resolution:Resolution;
 try {const records=await withDeadline(s=>resolver.resolveCandidates({...structuredClone(scope),spokenCandidates:[...parsed.candidates]},s),timeoutMs,signal);resolution=classifyEmail(parsed,boundedRecords(records,scope));}
 catch(error){if(signal?.aborted)throw error;return classifyEmail(parsed,[],error instanceof Error&&error.message==='TIMEOUT'?'TIMEOUT':'UNAVAILABLE');}
 if(model){try{const raw=await withDeadline(s=>model.suggest({rawTranscript:parsed.raw,tokens:structuredClone(parsed.tokens),reconstructed:[...parsed.candidates],knownContacts:structuredClone(resolution.databaseCandidates)},s),timeoutMs,signal);resolution.suggestion=validateSuggestion(raw,parsed,resolution);}catch(error){if(signal?.aborted)throw error;resolution.suggestion={raw:null,accepted:false,reason:'Advisory model unavailable; deterministic result unchanged'};}}
 return resolution;
}
