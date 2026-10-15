import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { playPcmStream } from '../src/pcmPlayback';
class FakeContext {
  state = 'running'; destination = {}; buffers: Float32Array[] = []; nodes: { stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; timer?: ReturnType<typeof setTimeout> }[] = [];
  get currentTime() { return performance.now() / 1000; }
  createGain() { return { connect: vi.fn(), disconnect: vi.fn() }; }
  createBuffer(_channels: number, samples: number) { const data = new Float32Array(samples); this.buffers.push(data); return { duration: samples / 24000, getChannelData: () => data }; }
  createBufferSource() {
    const node = { buffer: undefined as { duration: number } | undefined, connect: vi.fn(), disconnect: vi.fn(), onended: null as (() => void) | null, timer: undefined as ReturnType<typeof setTimeout> | undefined,
      start: (at: number) => { node.timer = setTimeout(() => node.onended?.(), (at - this.currentTime + (node.buffer?.duration ?? 0)) * 1000); },
      stop: vi.fn(() => clearTimeout(node.timer)) };
    this.nodes.push(node); return node;
  }
}
beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
const events = () => ({ firstAudio: vi.fn(), started: vi.fn(), complete: vi.fn() });
it('starts renderer playback before the complete provider response arrives', async () => {
  let input!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({ start(c) { input = c; } }); const context = new FakeContext(); const hooks = events();
  const pending = playPcmStream(context as unknown as AudioContext, stream, new AbortController().signal, hooks);
  input.enqueue(new Uint8Array(4096)); await vi.advanceTimersByTimeAsync(50);
  expect(hooks.firstAudio).toHaveBeenCalledOnce(); expect(hooks.started).toHaveBeenCalledOnce(); expect(hooks.complete).not.toHaveBeenCalled();
  input.enqueue(new Uint8Array(4096)); input.close(); await vi.advanceTimersByTimeAsync(250); await pending;
  expect(hooks.complete).toHaveBeenCalledOnce(); expect(hooks.started).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
});
it('preserves signed PCM samples across odd network chunk boundaries', async () => {
  const context = new FakeContext(); const hooks = events();
  const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array([0, 128, 255])); c.enqueue(new Uint8Array([127, 0, 0])); c.close(); } });
  const pending = playPcmStream(context as unknown as AudioContext, stream, new AbortController().signal, hooks);
  await vi.advanceTimersByTimeAsync(80); await pending;
  expect([...context.buffers[0]]).toEqual([-1, 32767 / 32768, 0]); expect(hooks.firstAudio).toHaveBeenCalledOnce();
});
it('End Call cancels the network reader, stops every queued source and prevents stale callbacks', async () => {
  let input!: ReadableStreamDefaultController<Uint8Array>; const cancelled = vi.fn();
  const stream = new ReadableStream<Uint8Array>({ start(c) { input = c; }, cancel: cancelled });
  const context = new FakeContext(); const hooks = events(); const abort = new AbortController();
  const pending = playPcmStream(context as unknown as AudioContext, stream, abort.signal, hooks); const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  input.enqueue(new Uint8Array(48000)); await vi.advanceTimersByTimeAsync(10); abort.abort(); await rejected; await vi.advanceTimersByTimeAsync(2000);
  expect(cancelled).toHaveBeenCalledOnce(); expect(context.nodes.every(n => n.stop.mock.calls.length === 1)).toBe(true);
  expect(hooks.started).not.toHaveBeenCalled(); expect(hooks.complete).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
});
it('fails an interrupted or malformed stream and stops scheduled audio', async () => {
  let input!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({ start(c) { input = c; } }); const context = new FakeContext(); const hooks = events();
  const pending = playPcmStream(context as unknown as AudioContext, stream, new AbortController().signal, hooks); const rejected = expect(pending).rejects.toThrow('Voice generation unavailable.');
  input.enqueue(new Uint8Array(4096)); await vi.advanceTimersByTimeAsync(50); input.error(new Error('upstream failure')); await rejected;
  expect(context.nodes.every(n => n.stop.mock.calls.length > 0)).toBe(true); expect(hooks.complete).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  const malformed = playPcmStream(context as unknown as AudioContext, new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1])); c.close(); } }), new AbortController().signal, events());
  await expect(malformed).rejects.toThrow('Voice generation unavailable.');
});
