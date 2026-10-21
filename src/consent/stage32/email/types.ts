import type {Transcript} from '../../types';

export const emailVersion = 'stage-2.0c32-structured-email-1';
export type Confidence = 'EXACT_VERIFIED_MATCH' | 'HIGH_CONFIDENCE_MATCH' | 'AMBIGUOUS_MATCH' | 'CONTRADICTORY_MATCH' | 'NO_DATABASE_MATCH' | 'UNPARSABLE';
export type Action = 'CONFIRM' | 'OPERATOR_REVIEW' | 'HUMAN_TAKEOVER';
export interface EmailToken {raw:string; start:number; end:number; kind:'literal'|'separator'|'digit'|'letter'|'repeat'; alternatives:string[]}
export interface Normalization {operation:string; before:string; after:string; tokenIndex?:number}
export interface ParsedEmail {version:string; raw:string; tokens:EmailToken[]; candidates:string[]; operations:Normalization[]; uncertainTokens:number[]; errors:string[]}
/** Supplied by an independently verified identity mapping, never inferred from an email. */
export interface ContactScope {callId:string; recipientRevision:number; contactId:string; mappingEvidenceId:string; source:'SYNTHETIC_FIXTURE'|'VERIFIED_CONTACT_ADAPTER'}
export interface ContactEmail {contactId:string; email:string; recordVersion:string; sourceRecordId:string}
export interface ContactEmailResolver {resolveCandidates(input:ContactScope & {spokenCandidates:readonly string[]}, signal:AbortSignal):Promise<readonly ContactEmail[]>}
export interface RankedCandidate {candidate:string; matches:ContactEmail[]; score:0|1; reason:string}
export interface Resolution {classification:Confidence; action:Action; selected:string|null; selectionSource:'DETERMINISTIC_EXACT'|'BOUNDED_RECONCILIATION'|null; reason:string; ranked:RankedCandidate[]; databaseCandidates:ContactEmail[]; databaseStatus:'OK'|'UNAVAILABLE'|'TIMEOUT'; suggestion?:{raw:unknown; accepted:boolean; reason:string}}
export interface EmailReconciliationInput {rawTranscript:string; tokens:readonly EmailToken[]; reconstructed:readonly string[]; knownContacts:readonly ContactEmail[]}
export interface EmailSuggestion {candidate:string; confidence:Confidence; reason:string; evidenceTokenIndices:number[]; uncertainTokens:number[]}
/** No implementation making network requests is installed. Suggestions never authorize saving. */
export interface EmailReconciliationPort {suggest(input:EmailReconciliationInput, signal:AbortSignal):Promise<unknown>}
export interface EmailTurn extends Transcript {recipientRevision:number}
export interface AuditEvent {sequence:number; event:string; at:number; data:unknown}
/** Future policy-controlled interface only. No PCM is accepted or recorded by C-3.2. */
export interface FutureRecordingAuditPort {authorize(policyId:string, explicitBusinessLegalAuthorizationId:string):Promise<{authorized:boolean}>}
