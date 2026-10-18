import type { PlaybackRecord, ResponseClip } from '../types';
import { deliveryGain } from '../../streaming/deliveryGain';
import { verifiedAssets } from './assetPack';
import { verifyAsset, type VerifiedAsset } from './assets';
export interface LocalPlaybackEvent {
  action: 'start' | 'complete' | 'interrupt' | 'fail'; playbackId: string; callId: string;
  phraseId: string; phraseVersion: string; textHash: string; assetHash: string;
  recipientRevision: number; outputProof?: string; error?: string;
  gain?: { gainApplied: number; clippingEvents: number; peakProtectionEvents: number; postGainPeak: number };
}
export interface LocalPlaybackPort { play(response: ResponseClip, record: PlaybackRecord, emit: (event: LocalPlaybackEvent) => void): Promise<void>; cancel(): void; }
export interface LocalAudioContext {
  currentTime: number; state: string; resume(): Promise<void>; close(): Promise<void>;
  decodeAudioData(bytes: ArrayBuffer): Promise<AudioBuffer>;
  createBuffer(channels: number, frames: number, rate: number): AudioBuffer;
  createBufferSource(): AudioBufferSourceNode; destination: AudioNode;
}
/** Lazy, local cached media only. No microphone, TTS, ASR or generation calls.
 * Successful completion is emitted only by the non-cancelled source's ended event,
 * never by the returned Promise or a duration timer. This is a local-render proof,
 * not proof of physical telephone or headset acoustics. */
export class LocalPrerecordedPlayback implements LocalPlaybackPort {
  private context?: LocalAudioContext;
  private pending?: { abort: AbortController; cancel: () => void };
  constructor(private assets: readonly VerifiedAsset[] = verifiedAssets,
    private load: (path: string, signal: AbortSignal) => Promise<ArrayBuffer> = async (path, signal) => {
      if (!['localhost','127.0.0.1','[::1]'].includes(location.hostname) || !/^\/audio\/consent-stage20c1\/[a-f0-9]{64}\.wav$/u.test(path)) throw new Error('Only local approved assets may be loaded.');
      const response = await fetch(path, { signal, cache: 'no-store' }); if (!response.ok) throw new Error('Local asset unavailable.'); return response.arrayBuffer();
    }, private makeContext: () => LocalAudioContext = () => new AudioContext()) {}
  async play(response: ResponseClip, record: PlaybackRecord, emit: (event: LocalPlaybackEvent) => void) {
    this.cancel();
    const asset = this.assets.find(a => a.phraseId === response.id);
    if (!asset || response.dynamicValues?.length || response.text !== asset.text || response.version !== asset.wordingVersion || response.audio?.textHash !== asset.textHash || response.approval !== 'business-authorized') throw new Error('No bound static asset: HUMAN_TAKEOVER required.');
    const abort = new AbortController(); let cancelled = false, settled = false;
    let source: AudioBufferSourceNode | undefined, resolveEnd = () => {};
    const base = { playbackId: record.playbackId, callId: record.callId, phraseId: response.id, phraseVersion: response.version, textHash: asset.textHash, assetHash: asset.assetHash, recipientRevision: record.recipientRevision };
    const cancel = () => { if (settled) return; cancelled = true; settled = true; abort.abort(); if (source) { try { source.stop(); } catch { /* Already ended. */ } source.disconnect(); } emit({ ...base, action: 'interrupt' }); resolveEnd(); };
    const job = { abort, cancel }; this.pending = job;
    try {
      const bytes = await this.load(asset.path, abort.signal); if (cancelled) return;
      await verifyAsset(asset, new Uint8Array(bytes)); if (cancelled) return;
      this.context ??= this.makeContext(); await this.context.resume();
      if (this.context.state !== 'running') throw new Error('Audio output is not running.');
      const decoded = await this.context.decodeAudioData(bytes.slice(0)); if (cancelled) return;
      if (decoded.numberOfChannels !== 1 || Math.abs(decoded.duration - asset.duration) > .002) throw new Error('Browser decoding differs from verified media.');
      const samples = decoded.getChannelData(0).slice(), gain = deliveryGain(samples, true);
      if (gain.clippingEvents) throw new Error('Output PCM clipping rejected.');
      const output = this.context.createBuffer(1, samples.length, decoded.sampleRate); output.copyToChannel(samples, 0);
      source = this.context.createBufferSource(); source.buffer = output; source.connect(this.context.destination);
      const done = new Promise<void>(resolve => { resolveEnd = resolve; });
      source.onended = () => {
        if (cancelled || settled) return;
        settled = true; source?.disconnect();
        if (this.context?.state !== 'running') emit({ ...base, action: 'fail', error: 'Output context stopped before completion proof.' });
        else emit({ ...base, action: 'complete', outputProof: `web-audio-source-ended:${record.playbackId}:frames=${output.length}:rate=${output.sampleRate}:context=${this.context.currentTime}`, gain });
        resolveEnd();
      };
      source.start(); emit({ ...base, action: 'start', gain });
      await done; // Resolves after the event; it is NOT the completion signal.
    } catch (error) {
      if (!cancelled && !settled) { settled = true; source?.disconnect(); emit({ ...base, action: 'fail', error: error instanceof Error ? error.message : 'Playback failed.' }); }
      if (!cancelled) throw error;
    } finally { if (this.pending === job) this.pending = undefined; }
  }
  cancel() { this.pending?.cancel(); this.pending = undefined; }
  async dispose() { this.cancel(); await this.context?.close(); this.context = undefined; }
}
