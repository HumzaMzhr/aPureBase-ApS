import type { ResponseClip } from './types';

/** Completion means output actually finished, not asset submission. Future ports
 * must reuse verified cached PCM/scheduler safeguards, never realtime TTS here. */
export interface ResponsePlayback {
  play(response: ResponseClip, signal: AbortSignal): Promise<void>;
  cancel(): void;
}
export class PlaceholderPlayback implements ResponsePlayback {
  async play(): Promise<void> { throw new Error('Draft response has no approved audio asset.'); }
  cancel() { /* No audio resources are acquired in Stage 2.0A. */ }
}
export function assertPlayable(response: ResponseClip): never {
  // Deliberately closed in 2.0A: no existing demo asset or browser speech fallback.
  throw new Error(`Response ${response.id} is a draft placeholder. Production playback is disabled.`);
}

/** Future integration contract only; no implementation or production route.
 * Resolving play()/queue() or elapsed time is NEVER output completion proof. */
export interface OutputCompletionEvidence {
  playbackId: string; callId: string; phraseId: string; phraseVersion: string;
  assetId: string; assetHash: string; completedAt: number;
  completionSource: 'VERIFIED_OUTPUT_ADAPTER';
  outputProof: { kind: 'RENDERED_SAMPLE_BOUNDARY' | 'TRANSPORT_MEDIA_MARK'; id: string; clock: string };
}
export interface PrerecordedPlaybackPort {
  queue(input: { playbackId: string; callId: string; phraseId: string; phraseVersion: string; assetId: string; assetHash: string; textHash: string }, signal: AbortSignal): Promise<void>;
  onCompleted(receive: (evidence: OutputCompletionEvidence) => void): () => void;
  interrupt(playbackId: string): void;
}
