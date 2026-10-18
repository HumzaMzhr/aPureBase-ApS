import { canonicalConsent } from './wording';
import { explicitAffirmative, explicitRefusal } from './classifier';
import { eligibleRecipient } from './authority';
import type { ConsentClass, ConsentEvidence, QuestionEvidence, RecipientEvidence, Respondent, Transcript } from './types';

export interface ExactConsentQuestion { phraseId: string; text: string; version: string; textHash: string; recipientTypes?: readonly string[] }
export function evaluateConsent(turn: Transcript, respondent: Respondent, scope: string, question?: QuestionEvidence, recipient?: RecipientEvidence, expected: ExactConsentQuestion = canonicalConsent): ConsentEvidence {
  const identity: RecipientEvidence = recipient ? {
    recipientType: recipient.recipientType, targetVerified: recipient.targetVerified, recipientRevision: recipient.recipientRevision,
    authorityPolicyVersion: recipient.authorityPolicyVersion, authorityEvidenceTurnId: recipient.authorityEvidenceTurnId, authorityEvidenceText: recipient.authorityEvidenceText, authorityAttestedBy: recipient.authorityAttestedBy, authorityAttestedAt: recipient.authorityAttestedAt,
    identityAttestation: recipient.identityAttestation, authorityStatus: recipient.authorityStatus,
    authorityEvidence: recipient.authorityEvidence, authorityAttestation: recipient.authorityAttestation,
  } : { recipientType: 'UNKNOWN', targetVerified: false, recipientRevision: 0, authorityStatus: 'UNVERIFIED' };
  const evidence = { respondent, recipient: structuredClone(identity), question: question ? { ...question } : undefined };
  if (!turn.final) return { ...evidence, classification: 'UNCLEAR', eligibleYes: false, reason: 'Only final recognition can be reviewed.' };
  if (explicitRefusal(turn.text)) return { ...evidence, classification: 'NO', eligibleYes: false, reason: 'Explicit refusal.' };
  const eligible = question?.responseId === expected.phraseId && question.exactText === expected.text && question.responseVersion === expected.version && question.textHash === expected.textHash && question.playback?.phraseId === question.responseId && question.playback.phraseVersion === question.responseVersion && question.playback.state === 'COMPLETED' && question.playback.playbackId === question.instanceId && question.playback.completedAt === question.completedAt && !!question.playback.completionSource && !question.playback.answerConsumed &&
    turn.answerPlaybackId === question.instanceId && !!question.textHash && !!question && !!question.instanceId && !!question.exactText && !!question.responseVersion &&
    (!expected.recipientTypes || expected.recipientTypes.includes(identity.recipientType)) && question.recipientRevision === identity.recipientRevision && question.recipientType === identity.recipientType &&
    question.scope === scope && Number.isFinite(question.completedAt) && question.completedAt >= 0 &&
    question.completedAt <= turn.observedAt && turn.speechStartedAt !== undefined &&
    turn.speechStartedAt > question.completedAt && eligibleRecipient(identity) && explicitAffirmative(turn.text);
  return { ...evidence, classification: eligible ? 'YES' : 'UNCLEAR', eligibleYes: eligible, reason: eligible ? 'Explicit affirmative to the delivered proposition from a verified recipient; agent review required.' : 'No explicit scoped affirmative from a verified recipient with speech onset after completed question delivery.' };
}
export function guardReview(evidence: ConsentEvidence, selected: ConsentClass, reason: string) {
  if (!['YES', 'NO', 'UNCLEAR'].includes(selected) || !reason.trim()) throw new Error('A classification and agent review reason are required.');
  if (selected === 'YES' && !evidence.eligibleYes) throw new Error('Agent override cannot invent affirmative consent evidence.');
}
