import { ContinuousTranscription, type RecognitionEvent } from '../streaming/continuousTranscriptionClient';
import type { Transcript } from './types';

export interface DanishTranscriptionPort {
  open(language: 'da', signal: AbortSignal): Promise<void>;
  append(bytes: Uint8Array): void;
  commit(generation: number): void;
  close(): void;
}
type Factory = (event: (event: RecognitionEvent) => void, error: (error: Error) => void) => DanishTranscriptionPort;
/** Reuses the existing Danish gateway. Not started/wired to a microphone by the
 * rehearsal UI. PCM is forwarded transiently, never retained by this adapter. */
export class DanishTranscriptAdapter {
  private port?: DanishTranscriptionPort;
  private delivered = new Set<string>();
  private active = false;
  private signal?: AbortSignal;
  private aborted = () => this.stop();
  constructor(private receive: (turn: Transcript) => void, private failed: (error: Error) => void,
    private factory: Factory = (event, error) => new ContinuousTranscription(event, error),
    private now = () => performance.now()) {}
  async start(signal: AbortSignal) {
    if (this.active || signal.aborted) throw new Error('Transcription is already active or aborted.');
    this.active = true;
    this.signal = signal;
    signal.addEventListener('abort', this.aborted, { once: true });
    this.delivered.clear();
    const port = this.factory(event => {
      if (!this.active || signal.aborted || event.type === 'committed') return;
      const id = `${event.generation}:${event.itemId ?? 'generation'}`;
      if (this.delivered.has(id)) return;
      if (event.type === 'final') this.delivered.add(id);
      try { this.receive({ id, text: event.text ?? '', final: event.type === 'final', source: 'provider', observedAt: this.now(), providerItemId: event.itemId }); }
      catch (error) { this.stop(); this.failed(error instanceof Error ? error : new Error('Transcript consumer failed.')); }
    }, error => { if (this.active) { this.stop(); this.failed(error); } });
    this.port = port;
    try { await port.open('da', signal); } catch (error) { this.stop(); throw error; }
  }
  append(bytes: Uint8Array) { if (!this.active) throw new Error('Transcription is not active.'); this.port!.append(bytes); }
  commit(generation: number) { if (!this.active) throw new Error('Transcription is not active.'); this.port!.commit(generation); }
  stop() { this.active = false; this.signal?.removeEventListener('abort', this.aborted); this.signal = undefined; this.port?.close(); this.port = undefined; }
}
