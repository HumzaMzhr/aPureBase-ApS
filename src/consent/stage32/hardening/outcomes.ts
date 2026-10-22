import {hasReviewedConsent} from '../email/flow';
import type {EmailAcquisition} from '../email/flow';
import type {ConsentSnapshot} from '../../types';
export type AcquisitionSnapshot=ReturnType<EmailAcquisition['snapshot']>;
/** Read actual state. A test-only unsafe snapshot can falsify these safety metrics. */
export function measureOutcome(s:AcquisitionSnapshot,host:ConsentSnapshot){
 const stored=s.storedEmail,attempt=s.attempt,confirmation=s.confirmation;
 const owned=!!attempt&&attempt.turn.final&&attempt.turn.source==='provider'&&attempt.turn.answerPlaybackId!==undefined&&attempt.turn.recipientRevision===host.recipientRevision;
 const reviewed=!!stored&&!!stored.reviewer.trim()&&!!stored.reviewReason.trim();
 const confirmed=!!confirmation&&confirmation.candidate===stored?.email&&confirmation.turn.final&&confirmation.turn.source==='provider'&&!!s.window&&confirmation.turn.answerPlaybackId===s.window.id&&confirmation.turn.speechStartedAt!==undefined&&confirmation.turn.speechStartedAt>s.window.completedAt;
 return {candidate:attempt?.resolution.selected??null,resolution:attempt?.resolution??null,ownership:{owned,sourceTurnId:attempt?.id??null,owner:attempt?.turn.answerPlaybackId??null,recipientRevision:host.recipientRevision},confirmation:confirmation??null,operatorReview:stored?{reviewer:stored.reviewer,reason:stored.reviewReason}:null,finalStoredAddress:stored?.email??null,autoAccepted:!!stored&&(!owned||!confirmed||!reviewed||!hasReviewedConsent(host)),terminalState:s.state,hostState:host.state,correctionLineage:attempt?.correctionOf??null};
}
export function safetyMetrics(rows:readonly {outcome:ReturnType<typeof measureOutcome>;ambiguous:boolean;expected:string|null}[]){return {falseAutoAccepts:rows.filter(r=>r.outcome.finalStoredAddress!==null&&(r.outcome.autoAccepted||r.outcome.finalStoredAddress!==r.expected)).length,ambiguousAutoSelections:rows.filter(r=>r.ambiguous&&(r.outcome.candidate!==null||r.outcome.finalStoredAddress!==null)).length};}
export function assertSafeMetrics(metrics:ReturnType<typeof safetyMetrics>){if(metrics.falseAutoAccepts||metrics.ambiguousAutoSelections)throw new Error('Unsafe observed email outcome');}
