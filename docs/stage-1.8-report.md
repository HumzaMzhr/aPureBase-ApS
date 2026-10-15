# Stage 1.8 — final local interpreter stack

14 October 2026. Implementation and controlled API validation are complete; low-lag, continuous natural speech acceptance is **not passed**. No Twilio was implemented. Credentials and seven cached Danish recordings were preserved.

## 1. Final architecture

Normal screen: REALTIME INTERPRETER, LOCAL TEST, one laptop, direction, microphone, headphones, START, STOP, status and two transcript lanes. Internal experiments and two-party pairing remain under Developer mode. The existing participant and controlled-demo routes remain available.

Primary path: isolated 24 kHz mono PCM16 input → one persistent OpenAI transcription WebSocket → item-ordered incremental source text → semantic commitment → streaming Responses translation with rolling source/target context → fidelity validation → one ElevenLabs voice WebSocket per natural source utterance → aligned FIFO PCM → target output only. React controls lifecycle and transcripts; Node holds provider keys and validates bounded messages. No source audio graph connects to a listening output.

## 2. Exact OpenAI API/model

Recognition: `wss://api.openai.com/v1/realtime?intent=transcription`, session type `transcription`, model `gpt-live-transcribe`, `delay=low`, `languages=[en|da]`, PCM16/24 kHz, `turn_detection=null`. Natural-pause commitment is application-side (450ms English / 1350ms Danish), separate from semantic boundaries. New local gateway: `/api/transcription/continuous`. Append continues while previous item finalization is pending; commit does not close the session.

Translation: `POST https://api.openai.com/v1/responses`, streamed text, `gpt-6-luna`, reasoning `none`, default service tier, validated structured result. Precision uses `gpt-5.5`; protected-name re-recognition uses `POST /v1/audio/transcriptions`, `gpt-transcribe`. These are actual API/model identities, not a claim that one native speech model does every step.

The official [Realtime transcription guide](https://developers.openai.com/api/docs/guides/realtime-transcription) documents incremental deltas, item-correlated completion and 24 kHz input. It does not provide word acoustic timestamps or recognition confidence for this model. Recognition hints include campaign terms and explicit expected name spellings, without inserting unspoken names.

The dedicated [Realtime translation API](https://developers.openai.com/api/docs/guides/realtime-translation) **does provide translated transcript deltas**. Its experimental path is retained. Application semantic commitment, source/target fidelity validation and precise word alignment are not supplied by those deltas; previous direct trials changed protected names. Its native OpenAI audio is labeled accordingly and is never presented as Isabella. Choosing the guarded ASR + Responses path prioritizes meaning; these trials do not establish a globally fastest architecture.

## 3. Exact ElevenLabs API/model

Server-authenticated `wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input`, model `eleven_flash_v2_5`, `output_format=pcm_24000`, `language_code=da|en`, `sync_alignment=true`, `auto_mode=false`, inactivity timeout 180 seconds. Browser gateway `/api/voice/live?language=da|en&profile=quality`. Keys remain server-side.

The current [ElevenLabs WebSocket guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/websockets/realtime-tts) recommends Flash 2.5 for latency and explains buffering/flush tradeoffs. The [stream-input API reference](https://elevenlabs.io/docs/api-reference/text-to-speech/v-1-text-to-speech-voice-id-stream-input) documents alignment, PCM and inactivity settings. Primary buffering uses provider defaults; older aggressive schedules remain opt-in experiments.

## 4. Isabella configuration

Existing environment configuration retained: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID=gIfqD5jrnhkFu8ENVbXC`, `ELEVENLABS_MODEL_ID=eleven_flash_v2_5`, configured voice settings unchanged. A read-only live voice metadata lookup verified **Isabella - Warm, Calm & Cozy**, category `professional`. Primary Danish and English outputs use this voice with their respective language code. The retained controlled English fallback uses OpenAI `gpt-4o-mini-tts` / `marin`, with accurate Developer labels.

## 5. Translated-text handoff

Source previews are visible but never spoken. A later ASR update must confirm a meaningful clause boundary and stable prefix; finalization can commit the remaining tail. Translation previews remain PARTIAL. Only validated complete semantic-unit translations become COMMITTED and go to ElevenLabs. Rolling source/target context preserves sentence relationships; protected strings, questions, negation, refusals and precision terminology are checked. No autonomous answer/consent decision is invoked.

## 6. Continuous TTS

One fixed-voice context is reused across semantic units of each natural source utterance. Text and punctuation are appended progressively; one initial short validated clause may flush to bootstrap output. Subsequent units are not independently flushed or made into MP3 files. End-of-utterance flush/EOS drains the context before the next utterance context. This is persistent across units, **not one socket for the entire conversation**. Provider buffering and generation pauses still caused measured underruns; continuous voice quality is pending listening review.

## 7. Audio isolation

Logical buses remain `AGENT_INPUT_EN`, `AGENT_OUTPUT_EN`, `HCP_INPUT_DA`, `HCP_OUTPUT_DA`. The microphone worklet has zero outputs. English input enters recognition only; generated Danish PCM enters HCP_OUTPUT_DA. Danish input enters recognition only; generated English PCM enters AGENT_OUTPUT_EN. Output interfaces accept validated target speech, never a source-monitoring method. Headphones are required to prevent acoustic feedback. Silent live rendering validates software scheduling, not physical headphones or OS routing.

## 8. Root causes of observed failures

The legacy recognition adapter finalized/closed its upstream connection per source turn and paused queue consumption while awaiting final text/reopening recognition. Continued capture could fill its three-second PCM queue; raising that limit would hide the stall. Its single-item gateway rejected PCM after commit and assumed a narrower finalization lifecycle. Generic “Live transcription unavailable” hid the cause; exact historical provider-side causes cannot be reconstructed without old sanitized event codes.

Lag also continued growing while an already-started unit was correctly speaking, falsely escalating backlog. Finally, tiny per-phrase buffering can sacrifice prosody and expose gaps between translation arrivals. The first new live English trial exposed an additional real recognition failure: “Humza” became “Hamza” despite keyword hints, including the precision pass.

## 9. Fixes

The primary path now consumes PCM continuously through a persistent socket and correlates commits, partials and finals by generation/item ID. Out-of-order completion and duplicates cannot mix turns. Only bounded source backups/text await ordered processing; there is no reconnect PCM queue. Four item slots, byte/text/session limits, socket backpressure and finalization deadlines stop visibly before silent loss. Setup, disconnect, quota, microphone/audio errors and uncertain names stop capture/output, retain text, permit fresh START and never automatically replay.

Current lag freezes a started unit's observed onset lag and includes ASR-observed uncommitted/precision text waiting in the primary path. It no longer increases simply because speech is still playing. Committed ASR revisions notify the local session to stop safely. Protected-name hints were strengthened in realtime and precision recognition; the English retry preserved Humza/aPureBase without hardcoded transcript correction. An uncertain name still fails closed. Quality buffering replaces aggressive experimental schedules in the primary TTS profile.

## 10. English → Danish live results

User-approved exact acceptance text, synthetic macOS Samantha input, 21.43 seconds of audio, delivered in approximately 22 seconds of realtime frames. The initial attempt stopped safely on unresolved Humza/Hamza ambiguity; its result is retained in `benchmarks/stage18-en-name-review.json`. An earlier empty synthetic-file setup failure made no provider calls; fixture generation now rejects empty output.

After the hint fix, source text, Danish committed text and Isabella audio all began before source completion. First PCM: **3.874s**; first aligned renderer playback: **3.884s**; approximate first non-silent signal: **3.906s**. All **51/51** recognized source words were translated and marked spoken across eight unique contiguous units. Humza and aPureBase remained present exactly in source/target text. No scheduled overlap. **Two transport underruns**. Delivery counters and visible text are functional evidence, not a human meaning/pronunciation certification.

Raw result: `benchmarks/stage17-stage18-en.json`. Target recording: `benchmarks/stage17-audio/danish-stage18-rendered.wav`.

## 11. Danish → English live results

User-approved synthetic macOS Sara clinic text, **17.29s**, not a natural human recording. Source and English target text/audio began before completion. First PCM: **3.230s**; first aligned playback: **3.249s**; approximate first non-silent signal: **3.342s**. All **53/53** recognized source words translated/spoken across eight unique contiguous units. Questions and the doctor's unavailability remained in English text; Pernille was preserved. No scheduled overlap. **Three transport underruns**. Only target English was rendered.

Raw result: `benchmarks/stage17-stage18-da.json`. Target recording: `benchmarks/stage17-audio/english-stage18-rendered.wav`. This trial preceded the English name-hint improvement; both use the same persistent recognition/quality voice architecture.

## 12. Current median/p95 lag

| Direction | First playback | Median unit lag | p95 unit lag | Units | Current after drain |
|---|---:|---:|---:|---:|---:|
| English → Danish | 3.884s | 11.345s | 12.189s | 8 | 0s |
| Danish → English | 3.249s | 7.898s | 9.812s | 8 | 0s |

These are small controlled samples, not production percentile guarantees. First source onset is observed microphone/fixture energy. Later source-unit positions are when ASR words were first observed, since acoustic word timestamps are unavailable; lag is approximate for later units. Current lag includes held source text; completed unit percentiles use source_start → playback_started. First PCM is not necessarily audible speech. Signal estimates use 20ms windows/RMS threshold 0.005; physical headphone onset is unmeasured.

Developer timestamps map exactly to `source_audio_start`, `source_unit_stable`, `translation_first_text`, `translation_committed`, `elevenlabs_text_sent`, `elevenlabs_first_audio`, `playback_start`. Derived fields show stability, OpenAI completion, TTS first-audio and scheduling delays. Source samples, observed ASR words, translated source words, TTS characters and received/played target samples are separate positions.

## 13. Known quality limitations

The 2–3 second natural interpretation target is **not met across the utterance**. Provider-default buffering improves the intended quality tradeoff but still yields startup/generation gaps and cumulative lag. A short greeting starting early is not evidence that later content stays near that lag. There is no automatic naturalness score. Naturalness, continuity, pronunciation and complete meaning require a fluent Danish/English listener; fields remain blank. A natural 15–20 second Danish clinic recording, physical headphone routing and sustained real microphone speech remain unvalidated. ASR can still confuse names or revise committed text; the system stops rather than inventing a correction.

## 14. Tests

AUTOMATED: all paid APIs mocked. Required commands: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. Coverage includes persistent lifecycle, append during pending finals, out-of-order item ownership, duplicates, bounded pressure, both local directions, source isolation, voice identity/profile, key isolation, semantic/contact/negation/consent guards, 30-second continuous speech, fresh restart/no replay and STOP/late events. **247 tests / 34 files passed**; lint, typecheck and production build passed.

LIVE API: functional delivery **passed for both controlled directions after the English fix**; latency/underrun acceptance **failed**. No real microphone or call audio was submitted. HUMAN AUDIO QUALITY: **pending**. No Twilio or external call was made.

## 15. Exact one-laptop procedure

1. Connect headphones. In the project folder run `npm run dev` with the existing `.env`; stop an older server with Ctrl+C if port 5173 is occupied.
2. Open **http://localhost:5173 in Google Chrome**. Normal view is already LOCAL TEST / REALTIME INTERPRETER; no invitation needed.
3. Choose **English → Danish**, your **Local microphone** and **Local headphones**. If headphones are missing, select them as the system output and refresh devices.
4. Leave the cached Danish opening off for a pure streaming test. Enable Developer mode before START if measuring latency.
5. Click **START**, allow microphone access, then speak the English acceptance text above. English appears under AGENT — ENGLISH; Danish under CLINIC HEARS — DANISH. Only Danish translation should play. Pause naturally to finalize; Developer **Finish speaking** can explicitly commit.
6. Let target speech finish, inspect first playback/current/median/p95 and units, then **STOP**. STOP cancels immediately; it is not a “finish and drain” command.
7. STOP before switching to **Danish → English**, then START. Speak Danish; original Danish is visible and only English speech plays. On an error review retained text and START fresh; do not assume interrupted content was delivered.

## 16. Remaining work before Twilio

Listen to both target recordings and score continuity, naturalness, names, meaning, pauses, repetition and omissions. Validate a consenting natural Danish clinic sample, actual Chrome microphone/headphones, short/long turns, contact details/refusal/consent and extended-session failures. Tune semantic/translation arrival and TTS buffering using that evidence; current unit lag and underruns need improvement. Verify physical two-computer acceptance separately. Only then consider a supervised telephony trial, adapting the new `AudioInputSource` and `TranslatedAudioOutput` interfaces to call I/O. No telephony adapter was implemented in this stage.
