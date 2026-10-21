import {normalizeEmail,validEmail} from './normalize';
import type {ContactEmail,ContactEmailResolver,ContactScope} from './types';

const scalar=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&v===v.trim();
const object=(v:unknown,keys:readonly string[],required=keys):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).every(k=>keys.includes(k))&&required.every(k=>Object.hasOwn(v,k));
export function validateContactScope(scope:unknown):asserts scope is ContactScope {
 const keys=['callId','recipientRevision','contactId','mappingEvidenceId','source','spokenCandidates'];
 if(!object(scope,keys,keys.slice(0,5))||!scalar(scope.callId,200)||!scalar(scope.contactId,200)||!scalar(scope.mappingEvidenceId,256)||!Number.isSafeInteger(scope.recipientRevision)||Number(scope.recipientRevision)<0||!['SYNTHETIC_FIXTURE','VERIFIED_CONTACT_ADAPTER'].includes(String(scope.source))||typeof scope.source!=='string'||Object.hasOwn(scope,'spokenCandidates')&&(!Array.isArray(scope.spokenCandidates)||scope.spokenCandidates.length>16||scope.spokenCandidates.some(v=>typeof v!=='string'||v.length>254)))throw new Error('Invalid exact contact scope');
}
export function boundedRecords(raw:unknown,scope:ContactScope):ContactEmail[] {
 validateContactScope(scope);
 if(!Array.isArray(raw)||raw.length>3)throw new Error('Bounded contact result required');
 return raw.map((r:unknown)=>{
  if(!object(r,['contactId','email','recordVersion','sourceRecordId'])||!scalar(r.contactId,200)||r.contactId!==scope.contactId||!scalar(r.recordVersion,128)||!scalar(r.sourceRecordId,256)||!scalar(r.email,254)||!validEmail(r.email)||r.email!==normalizeEmail(r.email).value)throw new Error('Invalid scoped contact record');
  return {contactId:r.contactId,email:r.email,recordVersion:r.recordVersion,sourceRecordId:r.sourceRecordId};
 });
}
/** Future integration envelope; the legacy minimal records never masquerade as a production lookup receipt. */
export interface ContactLookupReceipt {sourceSystem:string;sourceRecordId:string;recordVersion:string;contactId:string;email:string;lookedUpAt:number;recipientRevision:number;scope:ContactScope}
export function validateLookupReceipt(raw:unknown,scope:ContactScope):ContactLookupReceipt {
 validateContactScope(scope);
 if(!object(raw,['sourceSystem','sourceRecordId','recordVersion','contactId','email','lookedUpAt','recipientRevision','scope'])||!scalar(raw.sourceSystem,128)||typeof raw.lookedUpAt!=='number'||!Number.isFinite(raw.lookedUpAt)||raw.lookedUpAt<0||raw.recipientRevision!==scope.recipientRevision||!raw.scope||typeof raw.scope!=='object'||Array.isArray(raw.scope)||Object.keys(scope).some(k=>JSON.stringify((raw.scope as Record<string,unknown>)[k])!==JSON.stringify((scope as unknown as Record<string,unknown>)[k])))throw new Error('Exact provenance lookup receipt required');
 validateContactScope(raw.scope);boundedRecords([{contactId:raw.contactId,email:raw.email,recordVersion:raw.recordVersion,sourceRecordId:raw.sourceRecordId}],scope);
 return structuredClone(raw) as unknown as ContactLookupReceipt;
}
export interface ContactLookupPort {lookup(scope:ContactScope,signal:AbortSignal):Promise<readonly ContactLookupReceipt[]>}
/** Exact fixture IDs only. No fuzzy/global search or production data is bundled. */
export class FixtureContactEmailResolver implements ContactEmailResolver {
 private readonly records:readonly ContactEmail[];
 constructor(records:readonly ContactEmail[]){
  if(records.some(r=>!r.contactId.startsWith('synthetic:')||!r.email.endsWith('.example')))throw new Error('Synthetic reserved-domain records only');
  this.records=structuredClone(records);
 }
 async resolveCandidates(scope:ContactScope,signal:AbortSignal){
  signal.throwIfAborted();
  if(scope.source!=='SYNTHETIC_FIXTURE'||!scope.mappingEvidenceId.startsWith('synthetic:'))throw new Error('Independent synthetic identity mapping required');
  return boundedRecords(this.records.filter(r=>r.contactId===scope.contactId),scope);
 }
}
