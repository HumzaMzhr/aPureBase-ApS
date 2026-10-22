import {lookupContactEvidence} from '../email/databaseResolver';
import {classifyEmail} from '../email/confidence';
import {validateSuggestion} from '../email/reconciliation';
import {withDeadline} from '../email/candidateResolver';
import type {ContactEmailResolver,ContactScope,EmailReconciliationPort,ParsedEmail,Resolution} from '../email/types';
import type {EmailEvidence} from './parser';
export type LookupStatus='LOOKUP_NOT_ATTEMPTED'|'NO_MATCH'|'UNIQUE_MATCH'|'MULTIPLE_MATCHES'|'LOOKUP_FAILED';
export type EvidenceLabel='EXACT'|'VERY_STRONG'|'STRONG'|'AMBIGUOUS'|'CONFLICT'|'INSUFFICIENT';
export interface ScoredEmail extends Resolution {lookupStatus:LookupStatus;policyLabel:EvidenceLabel;matchType:'EXACT'|'NORMALIZED_EXACT'|'UNIQUE_STRONG_MATCH'|'AMBIGUOUS'|'NO_MATCH';autoAccept:false;calibratedProbability:null;businessDecision:'CONCISE_CONFIRMATION_FROZEN_C32'}
export function scoreEmail(p:ParsedEmail,r:Resolution):ScoredEmail{
 const policyLabel:EvidenceLabel=r.classification==='EXACT_VERIFIED_MATCH'?(p.operations.length?'VERY_STRONG':'EXACT'):r.classification==='HIGH_CONFIDENCE_MATCH'?'STRONG':r.classification==='AMBIGUOUS_MATCH'?'AMBIGUOUS':r.classification==='CONTRADICTORY_MATCH'?'CONFLICT':'INSUFFICIENT';
 return {...r,action:policyLabel==='STRONG'?'OPERATOR_REVIEW':r.action,lookupStatus:r.databaseStatus!=='OK'?'LOOKUP_FAILED':!r.databaseCandidates.length?'NO_MATCH':r.databaseCandidates.length===1?'UNIQUE_MATCH':'MULTIPLE_MATCHES',policyLabel,matchType:policyLabel==='EXACT'?'EXACT':policyLabel==='VERY_STRONG'?'NORMALIZED_EXACT':policyLabel==='STRONG'?'UNIQUE_STRONG_MATCH':policyLabel==='AMBIGUOUS'?'AMBIGUOUS':'NO_MATCH',autoAccept:false,calibratedProbability:null,businessDecision:'CONCISE_CONFIRMATION_FROZEN_C32'};
}
/** Scoped lookup may explain incomplete speech, but never supplies missing characters. */
export async function resolveEvidence(p:ParsedEmail,scope:ContactScope,db:ContactEmailResolver,model?:EmailReconciliationPort,signal?:AbortSignal,timeoutMs=250):Promise<ScoredEmail>{
 if(!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>1000)throw new Error('Bounded deadline required');
 if(p.raw.length>512)return {...scoreEmail(p,classifyEmail(p,[])),lookupStatus:'LOOKUP_NOT_ATTEMPTED'};
 let r:Resolution;
 try{const lookup=await withDeadline(s=>lookupContactEvidence(db,scope,s,p.candidates),timeoutMs,signal),records=lookup.records;
  r={...classifyEmail(p,records),databaseEvidence:lookup.evidence};
  const repeated=(p as EmailEvidence).repetitions;
  const fragment=p.tokens.map(t=>t.alternatives[0]??'').join('');
  const incomplete=!p.candidates.length&&/^[a-z0-9._+-]+@[a-z0-9-]+$/iu.test(fragment);
  if(repeated&&p.errors.length||incomplete&&records.filter(v=>v.email.startsWith(fragment+'.')).length>1||/\b(uklart|uhm)\b/iu.test(p.raw)&&records.length>1){r={...r,classification:'AMBIGUOUS_MATCH',action:'OPERATOR_REVIEW',selected:null,selectionSource:null,reason:'Conflicting repetitions or incomplete evidence fits multiple scoped records; no missing characters supplied'};}
 }catch(e){if(signal?.aborted)throw e;return scoreEmail(p,classifyEmail(p,[],e instanceof Error&&e.message==='TIMEOUT'?'TIMEOUT':'UNAVAILABLE'));}
 if(model){
  try{const raw=await withDeadline(s=>model.suggest({rawTranscript:p.raw,tokens:structuredClone(p.tokens),reconstructed:[...p.candidates],knownContacts:structuredClone(r.databaseCandidates)},s),timeoutMs,signal);r.suggestion=validateSuggestion(raw,p,r);r.suggestion.status=r.suggestion.accepted?'ACCEPTED_ADVISORY':'REJECTED';if(!r.suggestion.accepted&&raw&&typeof raw==='object'&&'candidate'in raw&&typeof raw.candidate==='string'&&raw.candidate!==r.selected)r={...r,classification:'CONTRADICTORY_MATCH',selected:null,selectionSource:null,action:'OPERATOR_REVIEW',reason:'Invented or conflicting model candidate requires review: '+r.suggestion.reason};}catch(e){if(signal?.aborted)throw e;r.suggestion={raw:null,accepted:false,reason:'Model unavailable/timeout: deterministic evidence wins',status:e instanceof Error&&e.message==='TIMEOUT'?'TIMEOUT':'ERROR'};}
 }
 return scoreEmail(p,r);
}
