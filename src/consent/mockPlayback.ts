import type { PlaybackRecord, ResponseClip } from './types';

/** Pure deterministic adapter. No clock/timer/audio/transport/provider is acquired. */
export class MockPlaybackAdapter {
  create(callId: string, playbackId: string, phrase: ResponseClip, recipientRevision: number): PlaybackRecord {
    if (phrase.deliveryType !== 'SPOKEN_CLIP' || !phrase.audio) throw new Error('Only spoken units have mock playback.');
    return { callId, playbackId, phraseId: phrase.id, phraseVersion: phrase.version,
      assetId: phrase.audio.assetId, assetHash: null, state: 'NOT_STARTED', queuedAt: null, startedAt: null,
      completedAt: null, interruptedAt: null, failedAt: null, completionSource: null, recipientRevision, answerConsumed: false };
  }
  queue(record: PlaybackRecord, at: number) { this.change(record, ['NOT_STARTED'], 'QUEUED', at); record.queuedAt = at; }
  start(record: PlaybackRecord, at: number) { this.change(record, ['QUEUED'], 'PLAYING', at); record.startedAt = at; }
  complete(record: PlaybackRecord, at: number) { this.change(record, ['PLAYING'], 'COMPLETED', at); record.completedAt = at; record.completionSource = 'MOCK_ADAPTER'; }
  interrupt(record: PlaybackRecord, at: number) { this.change(record, ['NOT_STARTED', 'QUEUED', 'PLAYING'], 'INTERRUPTED', at); record.interruptedAt = at; }
  fail(record: PlaybackRecord, at: number) { this.change(record, ['NOT_STARTED', 'QUEUED', 'PLAYING'], 'FAILED', at); record.failedAt = at; }
  private change(record: PlaybackRecord, allowed: PlaybackRecord['state'][], next: PlaybackRecord['state'], at: number) {
    if (!Number.isFinite(at) || at < 0 || at < (record.startedAt ?? record.queuedAt ?? 0) || !allowed.includes(record.state)) throw new Error('Invalid or duplicate playback lifecycle event.');
    record.state = next;
  }
}
