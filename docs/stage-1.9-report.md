# Stage 1.9 — simultaneous interpretation

Implementation, mocked checks and nine approved paid benchmarks completed on 14 October 2026. Stage 1.9 is **not yet technically accepted**: The tested version missed <=3-second median/tail, low stable lag and zero-underrun targets. Stage 1.8 remains the user-accepted microphone baseline; historical synthetic timing results are not Stage 1.9 results.

1. **Changes made.** Both primary local directions and paired STREAMING use continuous recognition, stable incremental translation, scoped precision and the simultaneous ElevenLabs buffer profile. Pairing, roles, isolated buses, cached opening, controlled fallback and transcript retention remain. No Twilio, autonomous calling, model replacement, voice replacement or UI redesign was added. Danish output still requires configured ElevenLabs Isabella / `eleven_flash_v2_5`; failures never switch voices.
2. **Semantic commitment.** Commit only a punctuation/conjunction boundary with a stable prefix across distinct recognition updates, at least 120ms stability and subsequent-word lookahead. The wait is semantic, not a fixed 500–1500ms timer; actual lookahead depends on ASR updates. Incomplete questions, negation and consequential comma fragments wait. Greeting plus introduction is protected against isolated-word commitment. Known campaign aliases retain voice-first canonical speech. Already committed ASR revisions stop for review rather than repeat speech.
3. **Concurrency.** ASR stays active while translation, voice generation and playback run. Validated units enter the same voice context without waiting for earlier units to finish playing. While an earlier natural source turn drains, at most one next translation per direction is prefetched (two globally). History remains ordered; no unstable preview text reaches speech. Existing eight-job/200-unit/audio bounds remain; backlog is retained for controlled handling, never silently discarded.
4. **Prosody buffer.** 250ms is provisional, preserving the accepted greeting baseline. Developer mode can select 150/250/350/500ms. Short validated fragments (up to four words/32 characters) may join adjacent translated content within that window; finalization flushes it and STOP discards it. All four values have mocked coverage. Paid comparison results are below; human naturalness/continuity ratings remain pending and no optimum is claimed. The simultaneous provider schedule is 50/80/100/120 characters with one initial meaningful-clause flush, then persistent generation and end-of-turn flush. Original quality profile and voice settings remain available unchanged. Smaller provider buffers have a latency/quality tradeoff ([ElevenLabs documentation](https://elevenlabs.io/docs/eleven-api/guides/how-to/websockets/realtime-tts)); listening must validate continuity.
5. **Audio scheduling.** One owner per direction, FIFO PCM, contiguous scheduling and no crossfade/overlapping words. Initial jitter stays 100ms (selectable through 400ms). After a transport underrun, 20ms PCM resumes scheduling without imposing a second full initial buffer. Every scheduling gap is counted with duration; provider-generated silence is separately retained in audio. Playback progress advances using played PCM rather than wall time through transport gaps. STOP closes capture, recognition and voice sockets, cancels nodes/queues/timers, aborts translations/prefetch and prevents late speech.
6. **English → Danish initial lag.** At 250ms: 4.86s to first renderer playback, approximately 4.90s to first signal-detected speech. The exact short acceptance fixture was 6.32s / approximately 6.37s. Target started before source finished. These controlled synthetic results do not establish a human-microphone delay.

7. **English → Danish median/p95 trailing lag.** At 250ms: estimated median 11.77s, p95 13.04s, maximum 14.89s and source-end tail 12.48s. Failed the <=3s target. Samples exclude source pauses and post-source drain; see the raw estimates below.

8. **Danish → English initial lag.** At 250ms: 4.66s to renderer playback, approximately 4.72s to first signal-detected speech. Target started before Danish source finished. The primary English output stayed on the existing fixed ElevenLabs context; no Danish source monitoring occurred.

9. **Danish → English median/p95 trailing lag.** At 250ms: estimated median 10.08s, p95 12.03s, maximum 12.88s and tail 9.73s. Failed the <=3s target. Source is never routed to either listening output.

10. **Lag checkpoints.** At 250ms EN: 5s → 4.59s lag; 10s → 7.24s; 15s → 11.73s; 20s → 13.15s; 30s → 12.03s. DA: 5s → 4.50s; 10s → 8.51s; 15s → 10.54s; 20s → 10.19s; 30s → 10.08s. Both grow substantially during the early source and settle at an unacceptable distance. Recent-only UI growth can read STABLE or SHRINKING after an earlier increase; that is not an acceptance pass. EN source is 36.90s and DA 31.91s, so 45/60-second checkpoints do not apply. Source positions use ASR-observed timestamps and playback alignment with interpolation; no acoustic word timestamps are available ([OpenAI transcription documentation](https://developers.openai.com/api/docs/guides/realtime-transcription)). Estimates are not directly comparable to older unit-onset lag or ground-truth acoustic semantic timing.

11. **Buffer underruns.** At 250ms: EN 2 underruns, DA 4; the comparison range was 2–4 per run. The benchmark did not demonstrate zero avoidable underruns. No extra full jitter delay was added after starvation, but future text/generation arrived too late to keep playback fed. Generated/played samples, buffer depth, next boundary and duration of every scheduling gap are logged. Transport gaps cannot automatically be labeled unavoidable.

12. **Gaps/overlap.** All nine runs had zero scheduling overlaps. Transport-gap counts are in the table below; target WAVs retain both those gaps and provider-generated pauses. Human naturalness, continuity, pronunciation, audible-gap and meaning scores remain blank. A synthetic source and silent renderer do not establish human voice quality.

13. **Missing/duplicate units.** All nine runs delivered every recognized/committed source range exactly once: zero duplicate IDs, zero range discontinuities, recognized = translated = spoken source-word counts and all units spoken. Each long fixture used one voice connection/context across its semantic units. This verifies ledger delivery, not perfect acoustic ASR recognition. The final question-complement correction changes some unit boundaries and is regression-tested separately.

14. **Added-content findings.** Review found no invented consent assertion, independent sales statement or new email-address request in these nine transcripts. However, the Danish final question was split into “Do you have anything else,” plus “Should I pass it on?”, and an indirect question was sometimes repunctuated as a direct question. This is an undesirable extra question form/meaning risk; no blanket “zero added content” pass is claimed. The final correction prevents committing HAVE/HAR/ER question prefixes before the full question and holds check/hear complements until their continuation. English/Danish regression tests pass. That correction was made after the nine-run budget and has not been rebenchmarked with paid APIs. Existing invented-question/email/consent guards, negation/protected-token checks, careful retries and retained-text review remain. Heuristics and uncalibrated confidence do not prove semantic equivalence. The referenced E-Permission document was not found among available files; no new consent workflow was inferred.

15. **Remaining bottleneck.** At 250ms, median EN per-unit source onset/ASR observation → commitment was 3.10s, translation 1.62s, text sent → first aligned audio 0.80s, and first audio → playback 3.60s. DA values were 2.16s / 1.46s / 1.85s / 2.73s. These stages overlap and their medians must not be summed into end-to-end latency. Later “scheduling” includes deliberate FIFO queueing of earlier speech, not just renderer overhead; “TTS” can include provider text-buffer waiting. Early semantic/ASR and translation delay, short-clause provider buffering, consequential-sentence waits and accumulated playback explain the failure more than the 150–500ms prosody setting. Generated Danish audio lasted 1.055× source duration at 250ms (1.055–1.136× across long EN runs); generated English was 0.953× its Danish source at 250ms. Ratio excludes inserted transport gaps and cached opening. Longer Danish speech contributes but is not the sole bottleneck. No model/voice change or blind buffer enlargement was made.

16. **Automated results.** `npm test`: 338 tests across 37 files passed; paid providers mocked. `npm run lint`, `npm run typecheck`, `npm run build`: passed. Coverage includes rolling commitment, safety waits, precision isolation, both 30-second simulations, translation/playback concurrency, bounded prefetch, missing/duplicate ranges, persistent voice contexts, FIFO/no overlap, continuation after underrun, single Danish voice, added-content guards, abort/STOP cleanup and recognition/paired routing regressions. HTTP test fixtures need local loopback binding outside the restricted shell sandbox; they use no paid API. Physical two-computer revalidation remains pending.
17. **Live API results.** Exactly nine approved runs completed, no real microphone/call/Twilio. The exact English script ran once at 250ms, then long EN and DA sources ran once per 150/250/350/500ms buffer. Each source was synthetic, monolithic 180wpm speech with natural punctuation and no artificial interpretation pauses. OpenAI processed recognition/translation; ElevenLabs supplied every target PCM stream. All nine began target playback before source completion and completed delivery, with zero overlaps, but none met the lag targets. One trial per cell is insufficient to attribute API variance to prosody alone. 250ms remains provisional: best observed EN median/tail and retained accepted greeting behavior, but no statistically or subjectively proven optimum. JSON and recordings are linked below. After the batch, only safety-boundary handling and automatic tail reporting were corrected; paid timings are for the pre-correction tested version. Human quality and final-version live timing acceptance remain pending.

18. **Exact human retest.** Keep the ignored `.env` and headphones. From the project directory run `npm run dev`; if the current server is already running, use it or stop it with Ctrl+C before starting another. Open `http://localhost:5173` in Chrome. Select LOCAL TEST / REALTIME INTERPRETER and English → Danish. Choose local microphone and headphones. Enable Developer mode before START; leave cached opening OFF for clean timing, prosody 250ms and jitter 100ms. Leave complete-turn fallback OFF. Click START and allow microphone access. Speak the full supplied English script naturally, without artificial interpreter pauses, then continue with the long fixture's ordinary sentences to reach at least 30 seconds. Danish should begin while English continues; no English source monitoring is allowed. When finished, click Finish speaking and let target drain before STOP. Inspect checkpoint growth, median/p95/max trailing lag, tail, stage backlogs and underruns. After STOP optionally fill the blank listening/meaning ratings and export the session. STOP before selecting Danish → English, then repeat with the Danish clinic script; hear English only. To compare prosody, use a new session for each buffer value and the same natural speaking pace. Validate consequential refusal/permission, contact details and unknown exact identities independently. For speaker-change logging use the preserved two-party mode with two computers; leave barge-in OFF. That physical test is separate from one-laptop evaluation.

The final metadata correction also reports a naturally finalized tail without requiring Finish speaking and clears that tail when speech resumes. A mocked regression test covers it. No further paid runs beyond the nine approved runs were made. Human listening and final-version live timing acceptance remain pending; Stage 1.9 is not a latency pass.


## Nine-run measured comparison

All times are seconds; trailing values are estimates. Default remains provisional 250ms.

| Buffer | Direction | First playback | Median trailing | p95 trailing | Tail | Underruns | Overlaps |
|---|---|---:|---:|---:|---:|---:|---:|
| Short / 250 | EN → DA | 6.32 | 10.95 | 12.08 | 13.56 | 2 | 0 |
| 150 | EN → DA | 4.30 | 12.04 | 13.07 | 14.14 | 2 | 0 |
| 150 | DA → EN | 4.31 | 9.60 | 11.88 | 9.94 | 4 | 0 |
| 250 | EN → DA | 4.86 | 11.77 | 13.04 | 12.48 | 2 | 0 |
| 250 | DA → EN | 4.66 | 10.08 | 12.03 | 9.73 | 4 | 0 |
| 350 | EN → DA | 4.42 | 12.56 | 14.16 | 18.65 | 3 | 0 |
| 350 | DA → EN | 4.70 | 10.02 | 12.24 | 10.65 | 3 | 0 |
| 500 | EN → DA | 4.70 | 11.98 | 12.74 | 14.53 | 2 | 0 |
| 500 | DA → EN | 4.71 | 9.86 | 12.13 | 8.72 | 4 | 0 |

## Recorded checkpoint estimates

| Buffer / direction | 5s | 10s | 15s | 20s | 30s | Recent growth |
|---|---:|---:|---:|---:|---:|---|
| short / EN → DA | 4.96 | 7.97 | 11.75 | 11.02 | — | GROWING |
| 150 / EN → DA | 3.46 | 6.96 | 11.75 | 11.49 | 12.86 | STABLE |
| 150 / DA → EN | 4.13 | 8.53 | 10.54 | 9.96 | 10.47 | GROWING |
| 250 / EN → DA | 4.59 | 7.24 | 11.73 | 13.15 | 12.03 | STABLE |
| 250 / DA → EN | 4.50 | 8.51 | 10.54 | 10.19 | 10.08 | STABLE |
| 350 / EN → DA | 3.64 | 6.73 | 11.76 | 11.81 | 13.60 | GROWING |
| 350 / DA → EN | 4.51 | 8.42 | 10.51 | 10.57 | 10.53 | STABLE |
| 500 / EN → DA | 4.35 | 6.76 | 11.77 | 13.21 | 12.41 | STABLE |
| 500 / DA → EN | 4.54 | 8.39 | 11.14 | 9.95 | 10.37 | STABLE |

## Saved evidence and recordings

[Aggregate JSON](../benchmarks/stage19-summary.json) · [Read-only comparison page](../scripts/stage19-results.html) · [Source fixture texts](../benchmarks/stage19-audio/fixtures.json).

- short EN → DA: [full API/semantic/timing record](../benchmarks/stage17-stage19-short-en.json) · [translated audio](../benchmarks/stage17-audio/danish-stage19-short-rendered.wav)
- 150 EN → DA: [full API/semantic/timing record](../benchmarks/stage17-stage19-150-en.json) · [translated audio](../benchmarks/stage17-audio/danish-stage19-150-rendered.wav)
- 150 DA → EN: [full API/semantic/timing record](../benchmarks/stage17-stage19-150-da.json) · [translated audio](../benchmarks/stage17-audio/english-stage19-150-rendered.wav)
- 250 EN → DA: [full API/semantic/timing record](../benchmarks/stage17-stage19-250-en.json) · [translated audio](../benchmarks/stage17-audio/danish-stage19-250-rendered.wav)
- 250 DA → EN: [full API/semantic/timing record](../benchmarks/stage17-stage19-250-da.json) · [translated audio](../benchmarks/stage17-audio/english-stage19-250-rendered.wav)
- 350 EN → DA: [full API/semantic/timing record](../benchmarks/stage17-stage19-350-en.json) · [translated audio](../benchmarks/stage17-audio/danish-stage19-350-rendered.wav)
- 350 DA → EN: [full API/semantic/timing record](../benchmarks/stage17-stage19-350-da.json) · [translated audio](../benchmarks/stage17-audio/english-stage19-350-rendered.wav)
- 500 EN → DA: [full API/semantic/timing record](../benchmarks/stage17-stage19-500-en.json) · [translated audio](../benchmarks/stage17-audio/danish-stage19-500-rendered.wav)
- 500 DA → EN: [full API/semantic/timing record](../benchmarks/stage17-stage19-500-da.json) · [translated audio](../benchmarks/stage17-audio/english-stage19-500-rendered.wav)
