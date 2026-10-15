# Stage 1.7 acceptance and regression tests

Automated checks use mocked paid APIs: run npm test, npm run lint, npm run typecheck and npm run build. Cases cover wrong-bus rejection, outputless capture, stale sessions, partial/committed text, semantic boundaries and unsafe fragments, negation, exact source ranges, rolling context, uncertainty, precision tails, bounded backlog, PCM FIFO/alignment/jitter/odd bytes, persistent WebSocket lifecycle, cancellation, disconnection without replay, cached playback and both 20-second simulations. Paired controlled tests retain the original whole-turn translation route and original speech providers.

Browser-only graph/RTC test: /scripts/stage17-routing-check.html, Run graph and peer check. Synthetic source capture must have zero outputs and nonzero PCM; exactly one frame on each allowed bus; wrong-bus transmission rejected; no scheduled overlap. This spends no provider credits. It does not establish physical listening isolation.

Paid fictional fixture trial: /scripts/stage17-benchmark.html. Run one direction at a time, wait for COMPLETE, inspect timestamps/ranges/precision and saved JSON/WAV. Source PCM is streamed at real-time speed but never rendered. Target is scheduled to a silent sink. Generated WAV reconstructs actual scheduled silence for later human review. Do not run repeatedly without a material change.

Native two-computer procedure is in docs/stage-1.7-report.md section 19. Required headphone acceptance:

- Separate rooms or sufficient acoustic isolation. Agent hears only English; clinic only Danish. Neither hears microphone loopback or source audio through the app.
- Exact English script 15–20 seconds; natural Danish greeting, question, doctor availability and callback. Target starts before source completion; initial lag approximately 1–2 seconds when meaning is stable.
- Short turns, pauses, conjunctions, long clauses, questions and negation. Check names Humza/Pernille/aPureBase and added campaign terms. No spoken corrections, duplicated/missing units or changes in voice.
- Email, numbers, dates, refusal, consent, authorization and clinical detail must show Precision mode and wait for the complete remainder. Review spelling; no legal consent is decided automatically.
- Barge-in OFF logs an interruption without cutting words. Experimental cancellation requires separate human phoneme-safety evaluation and must preserve spoken transcript ranges.
- End call during recognition, translation, queued speech and remote output; tracks and pending audio stop. Disconnect: visible failure, reset required, no automatic replay.
- Controlled fallback and all seven exact cached WAVs work. Cached opening always precedes clinic response; cached paths are excluded from streaming metrics.

Human rates continuity/naturalness/pronunciation 1–5 and audible gaps/overlaps/missed/repeated words, plus measured lag fields, in Developer mode. Leave untested fields blank. Current tests do not pass Stage 1.7's lag/gapless/native quality acceptance; do not use successful mock tests as a quality claim.

## Subsequent latency trial regressions

Test faithful ASCII/curly contractions without false negation rejection; precision-review failure must drain previously validated speech rather than cut a word, and unused preconnections must close. An ASR revision during translation must block the stale completion. Only explicit partial-transcript trials use minimal delay. Direct trial must reject foreign origins and invalid PCM formats, relay only generated output, deduplicate event IDs, drain final audio/captions through session.closed, and ignore late audio after cancellation. Comparison must distinguish first renderer/packet from first speech signal and mark incomplete delivery; do not infer native quality from PCM energy.

## Stage 1.8 primary local regressions

Normal main screen defaults to one-laptop REALTIME INTERPRETER; engineering choices and LIVE TWO-PARTY remain under Developer mode. START both directions independently with headphones; no pairing, no source monitoring. Provider calls in automated tests are mocked. Continuous recognition must append during prior-item finalization, map final-before-ack/out-of-order item IDs, reject duplicates and keep chronological source semantics. Run 30 seconds in both languages with one socket and no reconnect PCM queue; stall beyond bounded item/socket limits must stop visibly, retain text and permit fresh START without replay. STOP during setup/finalization/output must close tracks, timers, sockets and ignore late events.

Check scoped precision: a safe greeting may commit before later consent/contact detail; unsafe remainder is held. Incomplete questions/negation and protected-name near-misses/split brands are not spoken. Precision re-recognition can correct an uncommitted name; still-uncertain names stop safely. Committed-span revision ends primary capture/output and permits restart. Current lag includes held source text and does not grow solely because an already-started unit is speaking. Translation-first-text and validated completion are distinct timestamps.

Quality voice profile must retain one fixed Isabella Flash 2.5 context across units, omit aggressive generation schedules, allow only one initial short-clause flush and drain EOS. Secrets never reach browser responses/bundle. Target PCM must only reach the direction's generated-audio bus. Cached opening remains local, optional and excluded from latency.

Approved live fixtures use `/scripts/stage18-benchmark.html`, never automatically run. Exact results and failures are in docs/stage-1.8-report.md. Silent rendering and equality of delivered source ranges do not establish natural speech, human meaning or physical output isolation. Natural human Danish clinic recording acceptance remains pending.

## Single Danish voice regressions

HCP_OUTPUT_DA must reject missing identity and OpenAI, browser SpeechSynthesis, Web Speech API, OS/system and fallback providers before scheduling. Every accepted Danish block must match the configured ElevenLabs voice ID and Flash 2.5 model; reject a provider/voice/model change even between turns. Check live WebSocket ready identity, HTTP speech headers, cached manifest identity and paired sender/receiver metadata. Legacy Danish blobs without verified provenance must not create/play an audio URL. Direct English → Danish must be blocked before microphone/output/provider opening; Danish source simulations remain silent.

A safe “Hi, my name is Humza,” should commit together. Incomplete questions/negation/uncertain names still wait for safe handling. Target greeting coalescing is bounded to 250ms; immediate next text is one message, standalone finalization is not lost/repeated, and an isolated greeting never forces bootstrap flush. ElevenLabs failure must show an error immediately, retain translated text and invoke no alternative voice. STOP clears all capture, sockets, scheduled nodes, PCM/text queues and greeting timers; late callbacks cannot resume audio. Native voice continuity remains a listening check.

## Voice-first campaign-name regressions

Ordinary Humza/Hamza and brand spacing/leading-a variants must translate without precision pauses, stopped input, replay or a second transcription call. Change these spellings after a committed introduction: canonical source ranges must remain stable and contiguous. Test known one-letter name variants, and retain raw ASR in Developer positions. Canonical translation instructions should include pronunciation guidance while keeping the same models and Isabella voice.

Do not change email usernames/domains or spoken addresses, unknown exact patient/legal identities, telephone numbers, dates or consent. Later critical fields must not undo an already committed introduction. Intentional precision waits alone must not warn “Interpreter falling behind”; a genuinely stalled downstream translation must still warn. All single-voice enforcement and STOP regressions must continue passing.
