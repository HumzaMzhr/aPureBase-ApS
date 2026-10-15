export interface StreamEvents { firstAudio(): void; started(): void; complete(): void }
/** Incremental mono S16LE playback. Chunk boundaries may split a 16-bit sample. */
export async function playPcmStream(context: AudioContext, stream: ReadableStream<Uint8Array>, signal: AbortSignal, events: StreamEvents, sampleRate = 24000) {
  signal.throwIfAborted();
  const reader = stream.getReader(); const sources = new Set<AudioBufferSourceNode>();
  const gain = context.createGain(); gain.connect(context.destination);
  let carry = new Uint8Array(0); let received = false; let inputDone = false; let nextStart = context.currentTime;
  let firstStart: number | undefined; let announced = false; let settled = false; let poll: ReturnType<typeof setInterval> | undefined;
  let receivedBytes = 0;
  const MIN_SAMPLES = 2048; // ~85ms: modest startup buffering, never the complete response.
  try { await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      signal.removeEventListener('abort', aborted); clearInterval(poll); gain.disconnect();
      for (const source of sources) { source.onended = null; try { source.stop(); } catch { /* already ended */ } source.disconnect(); }
      sources.clear(); carry = new Uint8Array(0);
      void reader.cancel().catch(() => {});
    };
    const fail = (error: Error) => { if (settled) return; settled = true; cleanup(); reject(error); };
    const aborted = () => fail(new DOMException('Call ended', 'AbortError'));
    const announce = () => {
      if (!announced && firstStart !== undefined && context.currentTime >= firstStart) { announced = true; events.started(); }
    };
    const finish = () => {
      if (settled || !inputDone || sources.size) return;
      announce();
      if (!announced) return fail(new Error('Voice generation unavailable.'));
      settled = true; cleanup(); resolve();
    };
    const enqueue = (final = false) => {
      const samples = Math.floor(carry.length / 2);
      if (!samples || (!final && samples < MIN_SAMPLES)) return;
      const buffer = context.createBuffer(1, samples, sampleRate); const floats = buffer.getChannelData(0);
      const view = new DataView(carry.buffer, carry.byteOffset, samples * 2);
      for (let i = 0; i < samples; i++) floats[i] = view.getInt16(i * 2, true) / 32768;
      carry = carry.slice(samples * 2);
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(gain);
      const start = Math.max(nextStart, context.currentTime + .03); nextStart = start + samples / sampleRate;
      firstStart ??= start; sources.add(source);
      source.onended = () => { source.disconnect(); sources.delete(source); finish(); };
      source.start(start);
    };
    signal.addEventListener('abort', aborted, { once: true });
    poll = setInterval(() => { if (!settled) { if (context.state !== 'running') fail(new Error('Voice generation unavailable.')); else announce(); } }, 10);
    void (async () => {
      try {
        for (;;) {
          signal.throwIfAborted(); const { done, value } = await reader.read(); signal.throwIfAborted();
          if (settled) return;
          if (done) {
            if (!received || receivedBytes < 2 || receivedBytes % 2) throw new Error('Voice generation unavailable.');
            events.complete(); enqueue(true); inputDone = true; finish(); return;
          }
          if (!value.byteLength) continue;
          receivedBytes += value.byteLength;
          // Bound queued audio without discarding any text or sound silently.
          if (receivedBytes > 20 * 1024 * 1024 || nextStart - context.currentTime > 180) throw new Error('Voice generation unavailable.');
          if (!received) { received = true; events.firstAudio(); }
          const bytes = new Uint8Array(carry.length + value.byteLength); bytes.set(carry); bytes.set(value, carry.length); carry = bytes;
          enqueue();
        }
      } catch { fail(signal.aborted ? new DOMException('Call ended', 'AbortError') : new Error('Voice generation unavailable.')); }
    })();
    if (signal.aborted) aborted();
  }); } finally { reader.releaseLock(); }
}
