import type { RecipientEvidence } from './types';

export const authorityPolicyVersion = 'apurebase-authority-2.0b2-1';

/** A linguistic claim is evidence to review, never proof of legal authority. */
export function explicitAuthorityClaim(text: string) {
  const value = text.toLocaleLowerCase('da').trim().replace(/[.!]+$/u, '').replace(/\s+/gu, ' ');
  return /^(jeg har (fuldmagt|bemyndigelse) til at oplyse (lægens|sundhedspersonens) e-mailadresse|jeg har bemyndigelse til at håndtere denne forespørgsel og oplyse lægens e-mailadresse)$/u.test(value);
}
export function eligibleRecipient(value: RecipientEvidence) {
  if (value.authorityPolicyVersion !== authorityPolicyVersion) return false;
  if (value.recipientType === 'TARGET_HCP') return value.targetVerified && value.authorityStatus === 'NOT_APPLICABLE' && !!value.identityAttestation?.reason.trim();
  const evidence = value.authorityEvidence, attestation = value.authorityAttestation;
  return value.recipientType === 'INTERMEDIARY' && value.authorityStatus === 'AGENT_CONFIRMED' &&
    !!evidence && evidence.classifiedIntent === 'AUTHORITY_CLAIMED' && explicitAuthorityClaim(evidence.transcriptText) &&
    evidence.recipientRevision === value.recipientRevision && !!attestation?.reason.trim() && !!attestation.attestedBy.trim() && value.authorityAttestedBy === attestation.attestedBy && value.authorityAttestedAt === attestation.recordedAt && value.authorityEvidenceTurnId === evidence.transcriptTurnId && value.authorityEvidenceText === evidence.transcriptText &&
    attestation.evidenceTurnId === evidence.transcriptTurnId && attestation.recipientRevision === value.recipientRevision;
}
