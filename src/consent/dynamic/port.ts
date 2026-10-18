import type { ResponseClip, ConsentSnapshot } from '../types';
import type { DynamicAsset, SpeechSlot } from './render';
export interface DynamicSpeechPort { prepare(slot: SpeechSlot, signal: AbortSignal): Promise<DynamicAsset>; register(asset: DynamicAsset, response: ResponseClip): void; }
export function currentSlot(slot: SpeechSlot, snapshot: ConsentSnapshot) {
  if (slot.kind === 'NAME') return slot.name.recipientRevision === snapshot.recipientRevision;
  return slot.recipientRevision === snapshot.recipientRevision && snapshot.email?.sourceTurnId === slot.sourceTurnId && snapshot.email.normalizedCandidate === slot.candidate && (!snapshot.email.normalizationChanged || !!snapshot.email.normalizationReviewedAt);
}
