import { expect, it, vi } from 'vitest';
import { DanishTranscriptAdapter, type DanishTranscriptionPort } from '../src/consent/transcription';
import type { RecognitionEvent } from '../src/streaming/continuousTranscriptionClient';

function fixture() {
  let deliver: (event: RecognitionEvent) => void = () => {};
  const port: DanishTranscriptionPort = { open: vi.fn().mockResolvedValue(undefined), append: vi.fn(), commit: vi.fn(), close: vi.fn() };
  const factory = vi.fn(event => { deliver = event; return port; });
  const received = vi.fn(), failed = vi.fn();
  const adapter = new DanishTranscriptAdapter(received, failed, factory, () => 100);
  return { adapter, port, factory, received, failed, deliver: (e: RecognitionEvent) => deliver(e) };
}
it('does not acquire recognition until explicit start; reuses Danish continuous gateway and forwards PCM transiently', async () => {
  const f = fixture(); expect(f.factory).not.toHaveBeenCalled();
  const abort = new AbortController(); await f.adapter.start(abort.signal);
  expect(f.port.open).toHaveBeenCalledWith('da', abort.signal);
  const bytes = new Uint8Array([1, 0]); f.adapter.append(bytes); f.adapter.commit(2);
  expect(f.port.append).toHaveBeenCalledWith(bytes); expect(f.port.commit).toHaveBeenCalledWith(2);
  f.adapter.stop(); expect(f.port.close).toHaveBeenCalledOnce();
  expect(() => f.adapter.append(bytes)).toThrow('not active');
});
it('preserves partial/final text and item identity without local correction, ignores ACKs and suppresses duplicate/late finals', async () => {
  const f = fixture(); await f.adapter.start(new AbortController().signal);
  f.deliver({ type: 'partial', generation: 2, itemId: 'item-a', text: 'rå tekst' });
  f.deliver({ type: 'committed', generation: 2, itemId: 'item-a' });
  f.deliver({ type: 'final', generation: 2, itemId: 'item-a', text: 'Rå tekst.' });
  f.deliver({ type: 'final', generation: 2, itemId: 'item-a', text: 'Duplicate.' });
  expect(f.received).toHaveBeenCalledTimes(2);
  expect(f.received.mock.calls[1][0]).toEqual({ id: '2:item-a', text: 'Rå tekst.', final: true, observedAt: 100, source: 'provider', providerItemId: 'item-a' });
  f.adapter.stop(); f.deliver({ type: 'final', generation: 3, text: 'Late.' });
  expect(f.received).toHaveBeenCalledTimes(2);
});
it('stops when the consumer rejects evidence and does not silently discard the error', async () => {
  const f = fixture(); f.received.mockImplementation(() => { throw new Error('retention exhausted'); });
  await f.adapter.start(new AbortController().signal);
  f.deliver({ type: 'final', generation: 1, text: 'Tak.' });
  expect(f.port.close).toHaveBeenCalledOnce(); expect(f.failed).toHaveBeenCalledWith(expect.objectContaining({ message: 'retention exhausted' }));
});
it('stops the gateway on abort and rejects overlapping starts without creating another transport', async () => {
  const f = fixture(), abort = new AbortController();
  await f.adapter.start(abort.signal);
  await expect(f.adapter.start(abort.signal)).rejects.toThrow('already active');
  abort.abort();
  expect(f.port.close).toHaveBeenCalledOnce();
  expect(() => f.adapter.commit(1)).toThrow('not active');
  f.deliver({ type: 'final', generation: 1, text: 'Late after abort.' });
  expect(f.received).not.toHaveBeenCalled();
});
