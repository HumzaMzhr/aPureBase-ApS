import { eligibleRecipient } from './authority';
import type { ExactConsentQuestion } from './consentGuard';
import { canonicalConsent } from './wording';
import type { ConsentHandoffCandidate, ConsentSnapshot } from './types';

/** Interface-only projection. No CRM, mail, database or activation policy. */
export function handoffCandidate(snapshot: ConsentSnapshot, expected: ExactConsentQuestion = canonicalConsent): ConsentHandoffCandidate {
  const decision = snapshot.decision, email = snapshot.email;
  const answer = snapshot.turns.find(t => t.id === decision?.turnId), question = answer?.consent.question;
  const playback = snapshot.playbacks.find(p => p.playbackId === question?.instanceId);
  if (snapshot.state !== 'END_SUCCESS' || !eligibleRecipient(snapshot) || snapshot.doNotContactRequested || decision?.classification !== 'YES' || decision.recipientRevision !== snapshot.recipientRevision || !answer?.review || answer.review.classification !== 'YES' || !answer.consent.eligibleYes || question?.responseId !== expected.phraseId || question.responseVersion !== expected.version || question.textHash !== expected.textHash || question.recipientRevision !== snapshot.recipientRevision || playback?.state !== 'COMPLETED' || playback.completedAt !== question.completedAt || !playback.completionSource || !email?.confirmed || !email.confirmedAt || email.readbackValue !== email.normalizedCandidate || email.consentTurnId !== decision.turnId || email.recipientRevision !== snapshot.recipientRevision || email.normalizationChanged && !email.normalizationReviewedAt) throw new Error('Handoff requires current reviewed consent, completed bound playback and confirmed exact email.');
  return structuredClone({ auditVersion: '2.0b2-1', evaluationOnly: true, callId: snapshot.callId,
    recipientType: snapshot.recipientType, recipientEvidence: answer.consent.recipient,
    consentScopeId: question.scope, consentQuestionPhraseId: question.responseId,
    consentQuestionVersion: question.responseVersion, consentQuestionTextHash: question.textHash,
    playbackId: playback.playbackId, playbackCompletedAt: playback.completedAt!, completionSource: playback.completionSource,
    answerTurnId: answer.id, answerTranscript: answer.transcript.text, answerClassification: 'YES',
    agentReviewedAt: answer.review.reviewedAt, consentDateTime: decision.recordedAt, email });
}
