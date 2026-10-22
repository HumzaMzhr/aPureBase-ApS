import { ConservativeDanishClassifier, normalized } from '../classifier';
import type { Classification, Transcript } from '../types';
import type { ConsentSession } from '../session';
import { approvedInventory, wordingVersion } from './assets';
import { verifiedAssets } from './assetPack';
export type OperationalSelection = { kind: 'APPROVED_PRERECORDED'; phraseId: string } | { kind: 'HUMAN_TAKEOVER'; reason: string } | { kind: 'NO_RESPONSE'; reason: string };
/** Additional complete-utterance scenario routes; never changes source words,
 * affirmative lexicon, identity, authority or a YES score. */
export class OperationalClassifier extends ConservativeDanishClassifier {
  override classify(turn: Transcript): Classification {
    const base = super.classify(turn);
    if (turn.final && /^(send mig informationen først|send mig først information|jeg modtager allerede informationen|jeg modtager allerede jeres information)$/u.test(normalized(turn.text))) return { intent: 'AMBIGUOUS', confidence: 1, basis: 'Approved scenario request only; not affirmative consent.', classifierVersion: 'da-operational-2.0c1-1' };
    return base;
  }
}
export function selectOperationalResponse(session: ConsentSession, mode: 'local' | 'mock' = 'local'): OperationalSelection {
  const snapshot = session.snapshot(), last = snapshot.turns.at(-1);
  if (snapshot.state.startsWith('END_') || snapshot.state === 'HUMAN_TAKEOVER') return { kind: 'NO_RESPONSE', reason: 'Terminal or human-owned session.' };
  if (last && (last.classification.confidence < 1 || ['UNKNOWN','QUESTION_UNKNOWN','MEDICAL_QUESTION','LEGAL_PRIVACY_QUESTION','COMPLAINT','REQUEST_HUMAN','ASR_UNCERTAIN','AUTHORITY_UNCLEAR'].includes(last.classification.intent))) return { kind: 'HUMAN_TAKEOVER', reason: 'Unsupported, sensitive, uncertain or low-confidence meaning.' };
  if (snapshot.fallbackReason) return { kind: 'HUMAN_TAKEOVER', reason: snapshot.fallbackReason };
  if (snapshot.state === 'CONSENT_YES' || snapshot.state === 'CONSENT_NO' && !snapshot.decision) return { kind: 'NO_RESPONSE', reason: 'Separate operator consent review is mandatory.' };
  if (snapshot.decision?.classification === 'NO' && snapshot.state !== 'CONSENT_NO') return { kind: 'NO_RESPONSE', reason: 'Recorded refusal stops automated consent solicitation.' };
  let id = snapshot.recommendedResponseId;
  const text = normalized(last?.transcript.text ?? '');
  if (snapshot.state === 'CONSENT_UNCLEAR' && /^(send mig informationen først|send mig først information)$/u.test(text)) id = 'send-first';
  if (snapshot.state === 'CONSENT_UNCLEAR' && /^(jeg modtager allerede informationen|jeg modtager allerede jeres information)$/u.test(text)) id = 'already-receiving';
  if (mode === 'local' && ['EMAIL_GIVEN','EMAIL_CONFIRM'].includes(snapshot.state)) return { kind: 'HUMAN_TAKEOVER', reason: 'Exact dynamic email readback has no approved speaking mechanism in C-1.' };
  const response = session.response(id);
  if (!response || !session.responses().some(r => r.id === id)) return { kind: 'NO_RESPONSE', reason: 'Current evidence/state does not authorize a response.' };
  if (response.deliveryType === 'SYSTEM_ACTION') return { kind: 'HUMAN_TAKEOVER', reason: response.scenario };
  if (response.deliveryType !== 'SPOKEN_CLIP') return { kind: 'NO_RESPONSE', reason: 'Explicit operator evidence action required.' };
  if (response.dynamicValues?.length) return { kind: 'HUMAN_TAKEOVER', reason: 'Named dynamic value has no approved speaking mechanism; preserve literal evidence.' };
  if (response.version !== wordingVersion || response.approval !== 'business-authorized' || !approvedInventory.some(p => p.id === id && p.text === response.text && p.textHash === response.audio?.textHash) || !verifiedAssets.some(a => a.phraseId === id && a.textHash === response.audio?.textHash)) return { kind: 'HUMAN_TAKEOVER', reason: 'No exact verified approved static asset.' };
  return { kind: 'APPROVED_PRERECORDED', phraseId: id! };
}
