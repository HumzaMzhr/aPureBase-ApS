/** Handoff-only evidence contract. Imports the validated candidate; never changes its policies. */
import type {ConsentSnapshot} from '../../types';
import type {SourceAudit} from '../../acceptance/recognition';
import {containsSecret} from '../hardening/review';
export const packageVersion='stage-2.0c32-email-architecture-1';
export const micIds=['ordinary','yes','no','email','correction'] as const;
export const callIds=['A','B','C','D','E'] as const;
export type Verdict='PENDING'|'PASS'|'FAIL';
export interface Identity {baseCommit:string;coreSourceHash:string;handoffSourceHash:string;candidateSourceHash:string;uncommitted:boolean;packageVersion:string}
export interface ListeningItem {phraseId:string;reviewKey:string;name:string;canonicalText:string;synthesisText:string;currentAssetHash:string;canonicalVersion:string;assetPath:string;actualLoadURL:string;diagnosticOnly:boolean;historicalAssetHashes:string[];history:unknown[];context:string;replacement:boolean}
export interface ReviewData {identity:Identity;items:ListeningItem[];allCurrentAssets:{phraseId:string;assetHash:string;path:string;loadURL:string;version:string}[];emailCases:EmailCase[];businessPending:string[]}
export interface EmailCase {id:string;name:string;address:string;previous?:string;feature:string;records:string[]}
export interface ListeningReview {key:string;hash:string;version:string;heardHash:string;sourceEndedProof:string;pronunciation:number;naturalness:number;pace:number;verdict:Verdict;comment:string;sharedDefect:boolean;at:string}
export const automationChoices=['Definitely not','Probably not','Unsure','Probably yes','Definitely yes'] as const;
export interface CallReview {consentCorrect:boolean|null;emailCorrect:boolean|'NA'|null;takeoverCorrect:boolean|'NA'|null;naturalness:number;flow:number;pronunciation:number;pace:number;automatedVoice:typeof automationChoices[number]|''}
export interface LiveObservation {id:string;testId:string;kind:'MICROPHONE_SMOKE'|'EMAIL_RECOVERY'|'NATURAL_CALL';startedAt:string;endedAt:string|null;events:SourceAudit[];timingEvidence:{turnId:string|null;sourceOnsetMs:number|null;sourceEndpointMs:number|null;finalObservedMs:number;endpointToFinalMs:number|null}[];backend:Record<string,unknown>;preflight:unknown;expectedText:string;meaningPreserved:boolean|null;reconstructionCorrect:boolean|null;correctionOwnershipCorrect:boolean|null;correctionOf:string|null;resolution:unknown;confirmationStatus:'NOT_CONFIRMED'|'HUMAN_DIAGNOSTIC_CONFIRMED';error:string|null;verdict:Verdict;comment:string;source:'PHYSICAL_MICROPHONE_LIFECYCLE';elapsedSeconds:number|null;sessionEvidence:unknown;finalState:string|null;takeover:boolean|null;consentOutcome:string|null;emailOutcome:string|null}
export type ReviewedObservation=LiveObservation & {assessment?:'CORRECT'|'MINOR_ERROR'|'INCORRECT';errorOrigin?:'ASR'|'RECONSTRUCTION'|'DATABASE'|'RESOLUTION'|'CONFIRMATION'|'NONE';callReview?:CallReview};
export interface Archive {version:typeof packageVersion;candidateSourceHash:string;reviewer:string;listening:ListeningReview[];microphones:ReviewedObservation[];emails:ReviewedObservation[];calls:ReviewedObservation[];safety:Record<string,number|null>;safetyComment:string;overallHumanResult:'HUMAN_RETEST_PASS'|'HUMAN_RETEST_FAIL'|'HUMAN_RETEST_INCOMPLETE';drafts:Record<string,unknown>}
export const safetyIds=['consentFalsePositives','wrongRecipientConsent','staleConsentOwnership','incorrectEmailAutomaticAcceptance','ambiguousEmailAutomaticAcceptance'] as const;
export function emptyArchive(data:ReviewData):Archive{return {version:packageVersion,candidateSourceHash:data.identity.candidateSourceHash,reviewer:'',listening:[],microphones:[],emails:[],calls:[],safety:Object.fromEntries(safetyIds.map(k=>[k,null])),safetyComment:'',overallHumanResult:'HUMAN_RETEST_INCOMPLETE',drafts:{}};}
export function verifyListening(row:ListeningReview,data:ReviewData){
 const item=data.items.find(i=>i.reviewKey===row.key);
 if(!item||row.hash!==item.currentAssetHash||row.heardHash!==item.currentAssetHash||row.version!==item.canonicalVersion||!row.sourceEndedProof.startsWith('web-audio-source-ended:')||!['PASS','FAIL'].includes(row.verdict)||![row.pronunciation,row.naturalness,row.pace].every(v=>Number.isInteger(v)&&v>=1&&v<=5))throw new Error('Exact completed asset, attestation and three 1–5 ratings required');
 if((row.verdict==='FAIL'||Math.min(row.pronunciation,row.naturalness,row.pace)<=3)&&!row.comment.trim())throw new Error('Comment required for FAIL or any score ≤3');
}
export function listeningGate(a:Archive,data:ReviewData){
 const latest=data.items.map(i=>({item:i,row:a.listening.filter(r=>r.key===i.reviewKey).at(-1)}));
 const complete=latest.filter(({item})=>!item.diagnosticOnly).every(({row})=>!!row);
 const concerns=latest.filter(({row})=>row&&(row.verdict==='FAIL'||Math.min(row.pronunciation,row.naturalness,row.pace)<=3));
 return {complete,currentBlocking:concerns.filter(({item,row})=>!item.diagnosticOnly||row!.sharedDefect).map(({item})=>item.reviewKey),diagnosticConcerns:concerns.filter(({item})=>item.diagnosticOnly).map(({item})=>item.reviewKey),mayContinue:complete&&!concerns.some(({item,row})=>!item.diagnosticOnly||row!.sharedDefect)};
}
export function liveFinals(row:LiveObservation){
 const ready=row.events.find(e=>e.event==='recognition.started'&&e.callId===row.id),capture=row.events.find(e=>e.event==='microphone.capture_ready'&&e.callId===row.id&&e.data.actualGetUserMedia===true);
 if(row.source!=='PHYSICAL_MICROPHONE_LIFECYCLE'||!ready||!capture||row.backend.configured!==true||row.backend.gateway!==true||row.backend.stage!=='2.0c31')return [];
 return row.events.filter(e=>e.event==='transcriptFinal'&&e.callId===row.id&&e.at>=ready.at&&e.at>=capture.at&&e.turnId?.startsWith('mic:')&&e.data.final===true&&e.data.source==='provider'&&typeof e.data.text==='string'&&e.data.text.trim()&&row.events.some(o=>o.event==='speechStarted'&&o.callId===row.id&&o.turnId===e.turnId&&o.at<=e.at));
}
export function verifyLive(row:ReviewedObservation){
 if(row.assessment&&row.verdict==='PASS'&&row.assessment!=='CORRECT')throw new Error('A minor or incorrect result cannot be recorded as PASS');
 if(row.kind==='NATURAL_CALL'&&row.verdict!=='PENDING'){
  const q=row.callReview;
  if(row.verdict==='PASS'&&(!q||q.consentCorrect!==true||![true,'NA'].includes(q.emailCorrect as boolean|'NA')||![true,'NA'].includes(q.takeoverCorrect as boolean|'NA')||![q.naturalness,q.flow,q.pronunciation,q.pace].every(v=>Number.isInteger(v)&&v>=4&&v<=5)||!automationChoices.includes(q.automatedVoice as typeof automationChoices[number])))throw new Error('Call PASS requires correct outcomes and all four scores above 3');
  if(q&&(q.consentCorrect===false||q.emailCorrect===false||q.takeoverCorrect===false||[q.naturalness,q.flow,q.pronunciation,q.pace].some(v=>v>0&&v<=3))&&!row.comment.trim())throw new Error('Comment required for a weak call score or incorrect outcome');
 }
 if(row.verdict==='PASS'&&(!liveFinals(row).length||row.error||row.events.some(e=>e.event==='recognition.failed')||!row.endedAt||row.elapsedSeconds===null||row.meaningPreserved!==true))throw new Error('PASS requires genuine owned provider-final lifecycle, successful readiness, stopped test and preserved meaning');
 if(row.verdict==='PASS'&&(row.testId==='email'||row.testId==='correction'||row.kind==='EMAIL_RECOVERY')&&(row.reconstructionCorrect!==true||row.confirmationStatus!=='HUMAN_DIAGNOSTIC_CONFIRMED'))throw new Error('Email diagnostic confirmation and correct reconstruction required');
 if(row.verdict==='PASS'&&row.testId==='correction'&&(row.correctionOwnershipCorrect!==true||!row.correctionOf))throw new Error('Correct linked correction ownership required');
 if(row.verdict==='PASS'&&(row.kind==='EMAIL_RECOVERY'||['email','correction'].includes(row.testId))){
  const r=row.resolution as {reconstructed?:string[];finalResolution?:{selected?:string|null}}|null;
  if(!r?.finalResolution?.selected||!r.reconstructed?.includes(r.finalResolution.selected))throw new Error('No exact captured email candidate to confirm');
 }
 if(row.verdict==='PASS'&&row.kind==='NATURAL_CALL'){
  const evidence=row.sessionEvidence as (ConsentSnapshot&{structuredEmail?:{state?:string;storedEmail?:{productionConsent:boolean};attempt?:{correctionOf?:string;revision:number}}})|null;
  const s=evidence;
  if(!s||row.takeover||!row.finalState)throw new Error('Guarded completed natural-call evidence required');
  if(['A','C','E'].includes(row.testId)&&(row.finalState!=='END_SUCCESS'||evidence?.structuredEmail?.state!=='END_SUCCESS'||!evidence.structuredEmail.storedEmail||evidence.structuredEmail.storedEmail.productionConsent!==false||s.decision?.classification!=='YES'||!s.turns.find(t=>t.id===s.decision?.turnId)?.consent.eligibleYes))throw new Error('Ordinary success requires real guarded consent and confirmed local email');
  if(row.testId==='E'&&(!evidence?.structuredEmail?.attempt?.correctionOf||evidence.structuredEmail.attempt.revision<2))throw new Error('Correction conversation lacks actual owned email revision lineage');
  if(row.testId==='B'&&(row.finalState!=='END_REFUSED'||s.decision?.classification!=='NO'))throw new Error('Refusal call must actually finish refused');
  if(row.testId==='C'&&!s.playbacks.some(p=>p.phraseId==='clarify'&&p.state==='COMPLETED'))throw new Error('Clarification call lacks completed current Clarify');
  if(row.testId==='D'&&(!s.targetVerified||!s.playbacks.some(p=>p.phraseId==='receptionist-target-request'&&p.state==='COMPLETED')))throw new Error('Transfer call lacks actual completed receptionist request and verified joined target');
 }
 if(row.verdict==='FAIL'&&!row.comment.trim())throw new Error('Explain the failed physical observation');
}
export function gates(a:Archive,data:ReviewData){
 const listening=listeningGate(a,data);
 const passed=(r:LiveObservation|undefined)=>{if(!r||r.verdict!=='PASS')return false;try{verifyLive(r);return true;}catch{return false;}};
 const microphones=micIds.every(id=>passed(a.microphones.filter(r=>r.testId===id).at(-1)));
 const emails=data.emailCases.every(c=>passed(a.emails.filter(r=>r.testId===c.id).at(-1)));
 const naturalCalls=['A','B','C','D'].every(id=>passed(a.calls.filter(r=>r.testId===id).at(-1)));
 const optional=a.calls.filter(r=>r.testId==='E').at(-1);const optionalCallBlocking=optional&&!passed(optional)?[optional.id]:[];
 const durationConcerns=a.calls.filter(r=>r.verdict==='PASS'&&['A','C','E'].includes(r.testId)&&r.finalState==='END_SUCCESS'&&(r.elapsedSeconds===null||r.elapsedSeconds<30||r.elapsedSeconds>90)).map(r=>r.id);
 const safetyBlocking=safetyIds.some(k=>(a.safety[k]??0)>0),safetyAssessed=safetyIds.every(k=>a.safety[k]===0);
 return {listening,microphones,emails,naturalCalls,optionalCallBlocking,durationConcerns,safetyBlocking,safetyAssessed,eligibleForHumanRetestPass:listening.mayContinue&&microphones&&emails&&naturalCalls&&!optionalCallBlocking.length&&!durationConcerns.length&&safetyAssessed&&!safetyBlocking};
}
export function validateArchive(a:Archive,data:ReviewData){
 if(a.version!==packageVersion||a.candidateSourceHash!==data.identity.candidateSourceHash||typeof a.reviewer!=='string'||a.reviewer.length>100||!['HUMAN_RETEST_PASS','HUMAN_RETEST_FAIL','HUMAN_RETEST_INCOMPLETE'].includes(a.overallHumanResult)||!Array.isArray(a.listening)||!Array.isArray(a.microphones)||!Array.isArray(a.emails)||!Array.isArray(a.calls)||a.listening.length>160||a.microphones.length>50||a.emails.length>80||a.calls.length>20)throw new Error('Invalid bounded candidate review archive');
 for(const r of a.listening)verifyListening(r,data);
 for(const r of [...a.microphones,...a.emails,...a.calls]){if(r.verdict==='PASS'&&r.testId==='correction'){const prior=[...a.microphones,...a.emails].find(p=>p.id===r.correctionOf&&p.kind===r.kind);if(!prior||!liveFinals(prior).length||prior.startedAt>=r.startedAt)throw new Error('Correction must link an earlier captured address');}if(r.events.length>3900||!['PHYSICAL_MICROPHONE_LIFECYCLE'].includes(r.source))throw new Error('Invalid physical evidence source');verifyLive(r);}
 if(a.microphones.some(r=>!micIds.includes(r.testId as typeof micIds[number]))||a.emails.some(r=>!data.emailCases.some(c=>c.id===r.testId))||a.calls.some(r=>!callIds.includes(r.testId as typeof callIds[number])))throw new Error('Unknown physical test identity');
 for(const k of safetyIds)if(a.safety[k]!==null&&(!Number.isInteger(a.safety[k])||Number(a.safety[k])<0))throw new Error('Safety count must be unknown or an observed nonnegative integer');
 const text=JSON.stringify(a);if(text.length>8000000||containsSecret(text))throw new Error('Excessive or secret-like review data excluded');
 if(a.overallHumanResult==='HUMAN_RETEST_PASS'&&(!a.reviewer.trim()||!gates(a,data).eligibleForHumanRetestPass))throw new Error('Human retest PASS is blocked by incomplete evidence or unresolved concerns');
}
export function exportReview(a:Archive,data:ReviewData,environment:{userAgent:string;language:string;timeZone:string;platform:string},now=new Date().toISOString()){
 validateArchive(a,data);if(!a.reviewer.trim())throw new Error('Enter reviewer name before export');
 return {schema:packageVersion,kind:'CONSOLIDATED_LOCAL_HUMAN_RETEST_NOT_PRODUCTION_CONSENT',candidate:data.identity,reviewerName:a.reviewer,reviewTimestamp:now,machineBrowserMetadata:environment,listeningReviews:a.listening,microphoneObservations:a.microphones,emailRecoveryEvidence:a.emails,naturalCallObservations:a.calls,safetyObservations:a.safety,safetyComment:a.safetyComment,gates:gates(a,data),overallHumanResult:a.overallHumanResult,stageAccepted:false,productionReady:false,telephoneVerified:false,sourceAudioStored:false,authenticatedReviewer:false,evidenceOrigin:'Locally captured lifecycle plus self-reported human judgments; exported JSON is not cryptographically authenticated',businessPending:data.businessPending};
}
export function validateExport(value:unknown,data:ReviewData){
 const v=value as ReturnType<typeof exportReview>;
 if(!v||typeof v!=='object'||!v.candidate||JSON.stringify(v.candidate)!==JSON.stringify(data.identity)||!v.machineBrowserMetadata||Object.keys(v.machineBrowserMetadata).sort().join(',')!=='language,platform,timeZone,userAgent'||Object.values(v.machineBrowserMetadata).some(s=>typeof s!=='string'||s.length>500||containsSecret(s))||!Number.isFinite(Date.parse(v.reviewTimestamp)))throw new Error('Invalid export identity/environment/timestamp');
 const a:Archive={version:packageVersion,candidateSourceHash:data.identity.candidateSourceHash,reviewer:v.reviewerName,listening:v.listeningReviews,microphones:v.microphoneObservations,emails:v.emailRecoveryEvidence,calls:v.naturalCallObservations,safety:v.safetyObservations,safetyComment:v.safetyComment,overallHumanResult:v.overallHumanResult,drafts:{}};
 const expected=exportReview(a,data,v.machineBrowserMetadata,v.reviewTimestamp);
 const stable=(x:unknown):unknown=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])):x;
 if(JSON.stringify(stable(v))!==JSON.stringify(stable(expected)))throw new Error('Export schema, recomputed gates or non-production flags differ');
}
