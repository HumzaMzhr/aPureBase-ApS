# Stage 1.7 — implementation and validation report

**Status: experimental implementation complete; Stage 1.7 quality acceptance has not passed.** Both real-provider fixtures produced target speech before source completion. Initial lag was 7.2–8.0 seconds, transport underruns remain, and native pronunciation/naturalness and physical two-computer listening have not been validated. Controlled remains the default. No Twilio or autonomous answering was added.

Evidence captured 13–14 October 2026. Automated checks mock providers. Live fixtures are synthetic macOS Samantha/Sara recordings streamed at real-time speed into actual OpenAI and ElevenLabs APIs. Source is never played; targets use silent Web Audio sinks. These are pipeline measurements, not human headphone acceptance.

## 1. Architecture implemented

The agent computer hosts credentials, recognition, translation and English listening. The clinic computer runs a key-free localhost participant launcher. Manual invitation/reply signaling establishes an encrypted ordered WebRTC data channel; no source media tracks are attached. Only clinic PCM enters the host ASR and only generated Danish PCM returns to clinic listening. Four text streams can display both languages independently.

Explicit buses: AGENT_INPUT_EN → HCP_OUTPUT_DA; HCP_INPUT_DA → AGENT_OUTPUT_EN. Outputless capture AudioWorklets have no source-to-speaker connection. Bus guards reject other routes. Separate target renderers own one stream each. Session identifiers reject stale source frames; shared monotonic target identities prevent cached/streaming collisions.

Paired CONTROLLED keeps full-turn commitment, original Stage 1.5 translation model routing, buffered OpenAI/Marin English and ElevenLabs HTTP PCM Danish, and alternates microphones with a 180ms post-output guard. The exact original local controller remains at `/controlled-demo` for regression/demo use. STREAMING allows source capture during translation. Cached opening and six approved fixed responses remain preloaded and human-selected; no autonomous replies.

## 2. OpenAI APIs/models used

- Realtime transcription WebSocket: gpt-live-transcribe, delay low, language hints, application-owned VAD (450ms English / 1350ms Danish). Partials are opt-in for streaming; old clients remain final-only.
- Responses streaming with strict translation schema, reasoning none, bounded source/target histories and glossary. Streaming ordinary default: gpt-6-luna; precision: gpt-5.5. API keys stay server-side.
- Full-file gpt-transcribe backup only for detected uncertain protected names, using retained source PCM, before final precision translation. No silent name replacement.
- Original controlled translation remains gpt-4.1-mini / gpt-5.5 routing. English controlled speech remains gpt-4o-mini-tts / marin.

A 24-call, eight-unit EN/DA comparison measured complete translation median/p95: gpt-6-luna 1.471/3.955s; gpt-4.1-mini 1.526/29.469s; gpt-5.5/none 2.118/5.040s. This is a small fixture comparison, not a correctness certification. A four-call gpt-6-luna fast-tier test measured 2.230/6.673s; standard tier remains selected. See [model evidence](../benchmarks/stage17-models.json) and [fast-tier evidence](../benchmarks/stage17-fast.json).

Current official transcription, Realtime translation/VAD/WebRTC, Responses and latency documentation was reviewed; references and alternatives are in [architecture decisions](stage-1.7-architecture.md). Dedicated Realtime translation emits translated audio/transcripts; an Isabella caption bridge was considered but stable source-span mapping and glossary control were not validated. No claim is made that such a bridge is impossible.

## 3. ElevenLabs streaming architecture

One persistent stream-input WebSocket per direction per source turn, fixed environment Isabella voice, eleven_flash_v2_5, mono signed PCM24k, sync alignment. Unchanged stored voice settings. Each validated target unit feeds the same connection and text context; no per-unit MP3 or reconnection. Both streaming target languages use this fixed voice. Controlled provider split remains separate.

`auto_mode=false`, character schedule [50,50,50,50], initial space, progressive text with trailing spaces. One short first completed sentence may flush once to avoid waiting for 50 characters. Intermediate fragments do not force a flush. Turn end flushes then sends empty text; output drains before completion. Failed/disconnected streams stop visibly without replay. Alignment handles cumulative timestamps and generation resets; no fabricated timestamps when alignment is absent. Pronunciation dictionaries and deprecated optimize_streaming_latency are not applied.

## 4. Semantic chunking algorithm

Stable token prefix across distinct ASR updates plus an independently meaningful clause/sentence, safe conjunction boundary or finalization. Punctuation alone cannot commit. Dependent/reporting fragments, unsafe endings and incomplete negation wait for context. Contextual list continuations can follow a committed list introduction. No fixed time slices or arbitrary N-word speech chunks.

Each unit carries source word start/end, target character range and nine timestamps. Already committed ASR revisions stop for review without speaking a correction. High-risk or overly large unstable tails escalate to whole-turn precision. Known-name near matches (e.g. Hamza/Humza) trigger review/backup recognition instead of being silently rewritten.

## 5. Audio scheduling strategy

Single-owner FIFO Web Audio PCM scheduler. Following buffers start exactly at the previous scheduled end while audio is available. A startup/underrun prebuffer absorbs small jitter; odd-byte boundaries preserve whole samples. Provider alignment maps target spans to global PCM samples and reports first/scheduled/started/finished times. No speech crossfade, normalization or overlapping generated words. Provider natural pauses remain inside PCM; transport underruns are counted separately.

## 6. Jitter buffer selected

**100ms provisional**, not certified gapless. Offline replay of actual provider arrival times/sizes through the production scheduler tested 100/200/300/400ms without additional provider calls:

| Startup buffer | EN→DA underruns | DA→EN underruns | Scheduled overlap |
|---|---:|---:|---:|
| 100ms | 2 | 2 | 0 |
| 200ms | 2 | 2 | 0 |
| 300ms | 2 | 2 | 0 |
| 400ms | 2 | 2 | 0 |

The first EN packet held about 499ms PCM; DA about 1,184ms. All exceeded every tested threshold, so larger startup thresholds did not change this replay. No tested value satisfied stable gapless acceptance. Total replay underrun: 2.365s EN / 11.080s DA. Replay and actual renderer polling differ slightly; use actual run gaps below for those runs. [Replay evidence](../benchmarks/stage17-jitter.json).

## 7. English → Danish results

Exact requested English script, Samantha at rate220, 19.614s source. Eight semantic units, 61 received/translated/spoken source words by range accounting. Initial renderer lag **7.998s**; first target began before source completion. Continuous mean/median/p95/max **9.864/10.035/12.606/12.606s**. Two transport underruns of **1.471s and 0.903s**; zero scheduled overlaps. Alignment coverage complete. This run used a 200ms buffer before the provisional UI default changed to 100ms; offline replay did not change its gap count across buffer values.

[Final measured English run](../benchmarks/stage17-final-en.json) · [Danish target WAV for native review](../benchmarks/stage17-audio/danish-final-rendered.wav).

## 8. Danish → English results

Sara rate180, 17.293s source: greeting/Pernille, question about professional information, doctor unavailable and callback. Four delivered units; 53 source words received/translated/spoken by range accounting. Initial lag **7.165s**; target began before source completion. Continuous mean/median/p95/max **12.446/12.925/16.767/16.767s**. Two underruns **4.917s and 6.115s**; zero scheduled overlaps, full alignment coverage. Translation uncertainty safely merged the remaining unspoken content into a complete precision tail, translated by gpt-5.5. First three units returned actual model gpt-6-luna, tier default. This run used 100ms jitter and the short-first-sentence flush.

[Final measured Danish run](../benchmarks/stage17-final-da.json) · [English target WAV for review](../benchmarks/stage17-audio/english-final-rendered.wav).

## 9. Initial lag median/p95

Two final direction trials: median **7.581s**, nearest-rank p95 **7.998s**. Each direction has only one final trial; these numbers are descriptive, not an SLA. Initial source onset is first observed source RMS. Renderer onset does not include measured acoustic/device latency. Target 1–2 seconds **not met**.

## 10. Continuous lag median/p95

Across 12 delivered units: median **10.150s**, p95/max **16.767s**. Direction summaries are above. Later unit source_start is the app's ASR text availability, because this ASR supplies no acoustic word timestamps. Precision merging changes the cohort; do not interpret this statistic as exact per-word ear-to-ear latency. Developer export labels this limitation.

Every unit captures source_start, source_stable_at, translation_started, translation_ready, tts_text_sent, first_audio_received, playback_scheduled, playback_started, playback_finished. Derived ASR stability / translation / TTS first audio / scheduling / source-to-target lag and session median/p95/max are exported.

## 11. Audible gap count

**Unrated.** Silent renderers measured two transport underruns in each final direction. Generated WAVs include their scheduled silence for human listening. Natural pauses and perception of stitching require a native listener; transport gap count is not an invented audible-gap score. Gapless acceptance has not passed.

## 12. Overlap count

Zero scheduled overlaps in both final provider runs, deterministic replay and the real-browser graph/peer check. Human audible overlap field remains blank; physical acoustic verification is outstanding.

## 13. Repetition/missing-word findings

Both final runs cover every source word range exactly once and align all target characters; no duplicate/missing semantic unit found by the ledger. This does not certify audible phonemes. Human missed/repeated word fields are blank. Earlier initial alignment accounting incorrectly double-added cumulative PCM offsets; that diagnostic run is preserved, and final measurements use corrected cumulative/reset handling.

## 14. Translation quality issues

Final EN transcript preserved Humza and aPureBase; final DA preserved Pernille, the availability negation and both questions. Earlier faster English source rate250 was recognized as Hamza. A near-match precision safeguard and full-file recognition backup now hold such uncertain names; the final natural-rate fixture recognized Humza directly.

English→Danish “lægemiddelklienter” is literal rather than preferred “kunde i medicinalbranchen”; the glossary instruction was tightened after that run and has not been certified by another native live trial. Danish→English “busy with a conversation” is faithful but literal. No human natural-phrasing score is claimed. Translation self-confidence is uncalibrated; lexical negation/question guards cannot prove semantic correctness. Proper names and clinical details still need human review.

## 15. Voice naturalness findings

**Unrated.** The same Isabella identity/model/settings/context is retained across units and recordings are ready for review. No voice cloning or new voice was introduced. Persistent context and unchanged PCM avoid per-file stitching, but measured upstream gaps prevent a continuity claim. Native Danish pronunciation, prosody, volume consistency and first-sentence flush quality need headphone evaluation. All human 1–5 fields remain empty.

## 16. Precision-mode behavior

Contact details, digits/numbers, dates/time, explicit consent/refusal, authorization, sensitive medical content, unstable/revised recognition, uncertain names, translation uncertainty or lag/backlog trigger Precision mode. Uncommitted remainder waits for Finish speaking/full final ASR; stronger translation validates before output. Already spoken spans stay immutable. Final DA demonstrated uncertainty escalation without duplicate delivery. No consent/authority decision or medical answer is generated.

Backlog holds an uncommitted precision tail while previously queued output drains; no silent summarization/drop. Limits: eight queued units plus one final tail, 200 session units, two-minute source turn, 20MB source backup, 30s queued target PCM, 1MB peer transport backlog, 185s provider stream. Actual failures require review/reset, not replay. Conservative barge-in OFF logs only. EXPERIMENTAL cancels pending audio/text and preserves spoken ranges; abrupt cancellation is not certified phoneme-safe and must be evaluated separately.

## 17. Test results

**161 tests across 25 files**, including the original controlled regressions: routing/no loopback, worklet, partial/final gating, semantic stability/negation, unique source/target ranges, rolling context, precision and backpressure, FIFO/jitter/no overlap, cumulative/reset alignment, persistent ElevenLabs lifecycle, no replay on failure, cancellation/End Call, cached session identity, two 20-second simulations and original controlled translation/speech paths. All automated providers mocked. Lint, typecheck and production build passed.

Actual browser graph check: six nonzero PCM packets from a worklet with zero outputs; encrypted local peers connected; one frame per permitted direction; foreign bus rejected; zero overlap; clock uncertainty 2.7ms. Actual main/participant views also paired successfully. The separate key-free clinic launcher also served the participant application (HTTP200), rendered its clinic view, and returned HTTP403 on provider routes. No microphone was enabled in those UI checks. [Graph evidence](../benchmarks/stage17-routing-browser.json) · [Pairing evidence](../benchmarks/stage17-pairing-browser.json) · [Clinic launcher evidence](../benchmarks/stage17-participant-launcher.json). These tests ran on one Mac and cannot prove physical two-computer isolation or remote NAT traversal.

## 18. Remaining bottlenecks

Partial ASR availability/stability, safe clause completion, serial validated translation and provider character buffering accumulate before first speech. TTS/network stalls and target duration create later gaps/backlog. In final DA, uncertainty correctly postponed a larger tail and increased delay. A 100–400ms renderer buffer cannot hide multi-second upstream stalls. Small model benchmarks and synthetic speech cannot establish production correctness or native quality. Remote-network TURN behavior, separate physical microphones/headphones, short human turns, pauses and experimental interruption safety require acceptance testing.

All seven cached manifest/configuration hashes and byte sizes still validate, and scanning the production build for the actual provider key values found zero leaks. [Release evidence](../benchmarks/stage17-release-check.json).

No latency optimization was made by speaking unstable content, clipping words, overlapping speech, silently altering names or loosening precision checks. Stage 1.7 should remain experimental until its lag and native continuity criteria pass.

## 19. Exact live test procedure

1. Use two computers with Node≥22.12, Chrome, independent microphones and headphones. Keep them acoustically isolated. On the agent, preserve `.env` and cached WAVs; run npm install then npm run dev. Open http://localhost:5173. On clinic, copy project excluding `.env`, `.git`, node_modules and benchmarks; npm install then npm run participant; open http://localhost:5173/participant.
2. Choose STREAMING INTERPRETER before starting. Agent Create invitation → clinic paste and Create clinic reply → agent paste reply and Connect clinic. Verify Computers paired. If connection fails across networks, set your own ICE/TURN JSON in Developer mode and Reset pairing; never automatically replay prior audio.
3. Clinic chooses microphone/headphones and Enable microphone & headphones; agent selects its devices. Developer mode: 100ms provisional jitter, barge-in OFF, add campaign names/medical terms, start with warning5s/max15s. Start interpreter. Verify the unchanged cached opening is heard only by clinic; agent hears no Danish or own loopback.
4. After opening, clinic delivers the Danish fixture naturally over 15–20 seconds: “Hej, du taler med Pernille. Tak fordi du ringer til klinikken. Hvilken slags faglig information vil I gerne sende? Lægen er optaget med en samtale og kan ikke komme til telefonen lige nu. Du kan ringe igen senere, så kan jeg hjælpe dig med at finde det rigtige tidspunkt. Har du flere spørgsmål?” Agent must hear only English before source completion.
5. Agent delivers the exact English script naturally over 15–20 seconds: “Hello, my name is Humza, and I'm calling on behalf of aPureBase. We're contacting healthcare professionals because one of our pharmaceutical clients would like to send relevant professional information by email. The information may include medical material, information about products and therapy areas, and invitations to professional activities or online meetings. I just need to ask you a few short questions.” Clinic must hear only Danish before source completion. Click Finish speaking for any held precision tail.
6. Repeat short greeting/question/negation, natural pauses and a long dependent clause; verify no premature reversed meaning. Test spelling fictional email/phone/date, refusal, permission/authority and sensitive medical text: Precision mode must hold the remainder and require complete-turn review. Check Humza, Pernille, aPureBase and configured terms, with no spoken correction.
7. During queued target speech, opposite speaker interrupts: OFF logs without cutting. Test EXPERIMENTAL only as a separate evaluation; inspect retained spoken and interrupted ranges and listen for clipped phonemes. Restore OFF.
8. Enter human continuity/naturalness/pronunciation 1–5 and audible gap/overlap/missed/repeated counts, initial/average/max lag, notes. Leave unreviewed fields blank. Export session & evaluation. Compare 100/200/300/400 on the same recordings only when needed; select a stable minimum only after actual listening passes.
9. End call during capture, translation and remote playback; confirm both microphones/tracks/outputs stop. Reset pairing after failure. Repeat CONTROLLED full-turn fallback and all cached responses; cached playback must be Danish-only and excluded from streaming timing. The original single-computer regression demo remains /controlled-demo.

Stop at Stage 1.7. Physical/native acceptance remains pending; the measured delay and underruns already prevent a success declaration.

## 14 October latency addendum

[Separate latency trial report](stage-1.7-latency-trials.md) records the subsequent opt-in faster-Isabella and direct speech-to-speech comparisons, including failed delivery, provider leading silence and source-onset measurement corrections. The original results above remain historical evidence. Current automated validation is 181 tests across 27 files; defaults and fixed cached voice assets remain. Reliable 1–2 second/native acceptance still has not passed.
