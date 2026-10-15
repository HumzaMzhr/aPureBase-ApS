Historical Stage 1.4 report. Current configuration and measurements are in ../README.md and stage-1.5-report.md.

# aPureBase AI Call Interpreter — Stage 1.4

OpenAI handles completed-turn transcription and translation. ElevenLabs generates Danish speech. OpenAI English speech remains unchanged. Twilio is future telephony and is not integrated. The existing React/TypeScript/Vite + Node project and aPureBase branding are preserved.

**Current delivery status (13 October 2026):** ElevenLabs API access is enabled and verified. The opening and six phrase-bank clips were generated successfully with the configured Isabella voice and Eleven Flash v2.5. All seven are valid, non-silent 24kHz PCM WAV assets; a repeated generator run reused every asset without another speech request. The restarted application's health check reports ElevenLabs ready and no missing audio. Two live browser English-source turns completed the existing OpenAI pipeline and began Danish ElevenLabs playback in 3642ms and 5846ms. The second measured 873ms ElevenLabs first audio, 51ms renderer startup after those bytes, and 1707ms complete generation/transfer; playback began before the complete response arrived. The sources were prerecorded simulations, not physical microphone benchmarks. Native Danish quality and the <1.5-second target remain unverified. The initial free-account library-voice restriction has been resolved.

## Architecture and audit

The Stage 1.3 audit found one explicit call controller, one audio ownership lease, complete WebM/Opus microphone capture, finalized memory-only transcript rows, complete OpenAI Responses translations, full OpenAI MP3 speech buffering, locally cached WAV phrases, and five browser timing points. Translation began only after the source turn completed. Playback disabled both input tracks; End Call aborted requests, stopped media and cleared timers. These controls are retained.

The changed Danish path is:

```text
Complete English source → OpenAI transcription → complete OpenAI Danish text
  → local POST /api/speech/stream → ElevenLabs HTTP audio stream
  → first PCM samples → incremental Web Audio playback
  → remaining samples received/played → 180ms tail guard → listen to clinic
```

Danish-to-English retains the existing complete-turn OpenAI transcription → translation → fully buffered English MP3 → audio-element playback path. No translation starts while the source speaker is speaking. Danish output can begin before its complete audio file exists, but only after the entire source and translated text are finalized. This supersedes Stage 1.3's complete-output-buffering requirement for Danish only.

`ElevenLabsVoiceProvider` implements `VoiceProvider.streamSpeech`, `generateSpeech` and `cancel`. A provider instance belongs to one operation, so cancellation cannot terminate another operation. Voice identity and model are server configuration, not conversation-engine decisions. The response text is sent to speech generation unchanged; the provider does not translate or invent answers. Protected names, literal emails and aPureBase restoration remain in the existing OpenAI text pipeline. Pronunciation of numbers, spelled email and medical terms still needs human review.

## API and documentation reviewed

The documented REST endpoint is used directly with Node's native `fetch` and `AbortSignal`, consistent with the existing backend. No ElevenLabs browser SDK or new runtime dependency is needed. The official Node SDK was reviewed, including `textToSpeech.stream`, retry and timeout behavior; the direct REST implementation avoids automatic retries and exposes stream cancellation/backpressure explicitly.

- [Stream speech: endpoint, language code, formats and settings](https://elevenlabs.io/docs/api-reference/text-to-speech/stream)
- [HTTP streaming: raw audio bytes over chunked transfer](https://elevenlabs.io/docs/api-reference/streaming)
- [Latency guidance: Flash, streaming and network effects](https://elevenlabs.io/docs/eleven-api/guides/how-to/best-practices/latency-optimization)
- [Models: Danish support and Flash text-normalization limitations](https://elevenlabs.io/docs/overview/models)
- [Official Node SDK: stream, retries and timeouts](https://github.com/elevenlabs/elevenlabs-js)

Live requests use `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream?output_format=pcm_24000`, `xi-api-key` exclusively on the server, finalized `text`, configured `model_id`, and `language_code: da`. The deprecated `optimize_streaming_latency` flag is not used. The HTTP streaming endpoint fits finalized text; a text-input WebSocket would add no benefit here.

## Voice, model and configuration

The requested temporary voice is **Isabella – Warm, Calm & Cozy**, voice ID `gIfqD5jrnhkFu8ENVbXC`, with **Eleven Flash v2.5** (`eleven_flash_v2_5`). It was selected based on the user's acceptable Danish manual test and reported ~657ms model processing, with lower processing latency than Eleven v4 in their comparison. These are user-supplied observations, not results from this integration. Provider inference time excludes the preceding transcription/translation and much of the call/network path.

Keep these in `.env`, which remains gitignored:

```dotenv
OPENAI_API_KEY=your-existing-key
ELEVENLABS_API_KEY=your-existing-key
ELEVENLABS_VOICE_ID=gIfqD5jrnhkFu8ENVbXC
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
ELEVENLABS_VOICE_NAME=Isabella
```

Required ElevenLabs values are validated before Vite or the HTTP listener starts. No key value is printed. Missing settings fail clearly by variable name. Runtime authentication, billing, quota, unavailable voice/model, timeout and interrupted-stream errors are sanitized.

Optional configuration:

- `ELEVENLABS_VOICE_NAME`: display label only; change it when replacing the voice.
- `ELEVENLABS_VOICE_SETTINGS`: JSON using documented `stability`, `similarity_boost`, `style`, `speed`, `use_speaker_boost` fields. Omit for the stored/default voice settings. Overrides are validated; none were applied in the baseline.
- `ELEVENLABS_TIMEOUT_MS`: whole-request timeout, default 30000ms, allowed 1000–120000ms. Applies through stream consumption, not only response headers.

Existing OpenAI defaults remain `gpt-transcribe`, `gpt-5.5` with `low` reasoning, and `gpt-4o-mini-tts`/`marin` for English output. Existing source-simulation assets retain their OpenAI voices, including `cedar` for the fictional clinic. OpenAI intelligence was not replaced or retuned.

Future replacement with **Asem Raza's verified custom voice** requires the verified ElevenLabs voice ID, display-name change and regenerated fixed-phrase assets. No conversation-engine change is required. The fixed opening's spoken caller name is script content, separate from the synthesis voice identity; edit the phrase script if that caller name should change too.

## Format and browser streaming

Live Danish output uses mono, signed 16-bit little-endian **PCM at 24kHz** (`pcm_24000`). It avoids a compressed-codec decoding/buffering stage. Node forwards bytes as they arrive and honors HTTP backpressure. It reads the first nonempty provider chunk before sending success headers; it does not collect the full response.

Chrome consumes `response.body` incrementally. `playPcmStream` handles odd byte boundaries, converts sample values to Web Audio floats, and schedules AudioBufferSourceNodes. It begins with roughly 85ms of samples, plus a 30ms scheduling guard; it does not wait for all speech. Additional samples continue to be queued. The audio context's renderer clock determines the first playback timestamp, polled at 10ms intervals. This measures renderer playback, not physical headphone/DAC acoustic onset.

The same audio-ownership lease covers request, receiving, playback and queue draining. Both microphone tracks stay disabled until the final scheduled sound has ended. Selected Danish output uses Chrome's AudioContext `setSinkId`; a selected non-default output requires that browser capability. Existing English/cached WAV playback still uses the audio element.

Streamed PCM is about 48kB/second. Web Audio may resample to the hardware rate internally; there is no application transcoding service. The cached clips add a WAV header to this same PCM. Telephony μ-law conversion is deliberately deferred.

## Fixed phrases and caching

`npm run generate:audio` generates the Danish opening plus the six existing standard responses using ElevenLabs once. The exact requested opening is:

> Hej, du taler med Isabella. Jeg ringer på vegne af aPureBase. I fremtiden vil vi gerne sende faglig information på mail til lægerne. Kan du hjælpe mig med lægens e-mailadresse?

Each WAV asset has a manifest hash containing text, voice ID, model, output format and settings. Unchanged files are reused. Changed voice, model, settings or script invalidates the cache. Existing simulated clinic and English source recordings are reused without unnecessary regeneration.

Health validation detects missing/outdated fixed assets. Start preloads all seven fixed clips into memory using a voice/text cache version. Opening and phrase-button playback invokes neither OpenAI nor ElevenLabs. Repeated calls reuse loaded phrases; a version change clears the cache. Live speech and live recordings are not persisted locally.

**Assets verified:** all seven fixed phrases now have ElevenLabs provenance, the configured voice/model and current content hashes in the manifest. The opening is 11.66 seconds; the bank clips range from 1.90 to 10.54 seconds. WAV headers, declared lengths, sample rate and nonzero signal energy were checked. Existing clinic and English source fixtures were reused.

## Timing and UI

All displayed turn timestamps use one browser `performance.now()` clock. No subtraction mixes server and browser clocks.

| Point | Browser observation |
| --- | --- |
| T0 | End of source speech: last voiced microphone sample; simulated source audio `ended` |
| T1 | Final OpenAI transcript parsed |
| T2 | Complete OpenAI Danish translation parsed |
| T3 | Browser dispatches the local ElevenLabs streaming request |
| T4 | First nonempty ElevenLabs audio chunk reaches the browser reader |
| T5 | First scheduled PCM audio begins on the browser renderer clock |
| T6 | Browser reader observes successful completion of the audio stream |

T0 retains the prior honest speech-end measurement: transcription duration includes VAD hangover (650ms default), recorder finalization, upload and recognition. It is not reset after silence detection to hide that delay. T3 is measured at the local request boundary, so **ElevenLabs time to first audio includes the local bridge, provider and network**, not pure provider model inference time. T6 denotes receipt completion, not the last sound finishing.

Developer Mode shows transcription T1−T0, AI/translation T2−T1, time to first audio T4−T3, network/playback T5−T4, total response T5−T0 and complete-audio generation/transfer T6−T3. T4 and T5 are shown before T6 exists. The final timestamp updates the same transcript row; it does not create fragments or duplicate turns. Developer Mode retains every timing component on each live turn, so a following clinic turn cannot hide the preceding Danish first-audio measurement. English turns retain their previous five-point timing interpretation.

Normal mode shows only the total response measure. Provider/voice/model and detailed timings are in Developer Mode. Timing clears for prerecorded phrases and new turns. <1500ms total response is a target only; no integrated live result meets or validates it yet. OpenAI transcription/translation and source-finalization delays still contribute even if ElevenLabs itself is fast.

## Errors, retry and End Call

Voice errors display **“Voice generation unavailable.”** No automatic OpenAI voice fallback or unrelated response is generated. For a finalized English-to-Danish response, **Retry voice** reuses its exact finalized translation and stable transcript row. It makes a new speech request only, after reacquiring the audio context/inputs. It explicitly replays the entire response; if some audio was heard before interruption, the agent decides whether to retry. Retried total timing includes the elapsed wait since the original source ended and must not be compared as a fresh-turn benchmark.

End Call aborts the browser request, which aborts the upstream provider on connection close; stops and disconnects every queued source; cancels the reader; disables/stops microphone tracks; clears timers and retry state; and returns to **IDLE**. Late translation or playback callbacks cannot restart sound. The normal prerecorded thank-you still closes the completed scenario with CALL_COMPLETE.

## Launch and exact live test procedure

1. The configured account now has working Isabella API access. Preserve `.env` and do not post either API key in chat.
2. In the existing server terminal press **Ctrl+C**. Preserve the existing `.env`; do not overwrite it with `.env.example`.
3. From this project folder run:

```bash
npm install
npm run generate:audio
npm run dev
```

4. Open **http://localhost:5173** in Google Chrome with headphones. Turn on **Developer mode**. Confirm **ElevenLabs**, **Isabella**, **Eleven Flash v2.5**.
5. Leave Demo mode on and click **Start demo call**. Hear the requested cached Danish opening. Verify the spoken wording against the transcript. In Chrome Network, opening/phrase playback has no `/api/speech/stream`, `/api/speech` or `/api/translate` request for that prerecorded phrase; the following simulated clinic turn does invoke live OpenAI interpretation.
6. Wait for **WAITING FOR AGENT**, then click **Speak custom response**. Say: “I am calling on behalf of aPureBase. Could you tell me when the doctor is available?” Finish the complete sentence; use **Finish speaking** if needed. Alternatively play the next scripted English source to exercise the same live translation and Danish streaming pipeline without a microphone.
7. Confirm the complete Danish text appears, then listen to Isabella. A native Danish speaker should review cadence, accent, aPureBase and medical/name/email/number pronunciation. Do not mark voice quality passed based only on API success.
8. Read **ElevenLabs time to first audio** and **Total response latency** for that English-source transcript row. The current-turn meter clears when the next clinic source starts, so the row retains the measurements. Repeat with several short/long utterances; do not compare the ~657ms provider benchmark with the full response total.
9. Test **End Call** while Danish audio is streaming. Confirm immediate silence, READY/IDLE, no continuing sound, no stale transcript updates, and a usable new Start. Test interruption/quota/auth errors with mocks, not by spending live credits repeatedly.

Production build commands:

```bash
npm run build
npm start
```

Only one application server can occupy 5173. The friendly port-conflict message explains how to use or stop an existing instance. Temporary verification listeners are stopped after QA.

## Validation and changed files

`npm test` passed **73 tests across seven files**, with ElevenLabs mocked throughout. `npm run lint`, `npm run typecheck`, and `npm run build` passed. The HTTP relay tests use only an ephemeral localhost listener; no paid ElevenLabs credits are consumed in automated checks. The restricted Codex sandbox needs local-listener permission for those tests.

New coverage includes required configuration/default settings, credential separation, voice replacement/cache invalidation, first bytes before completion, backpressure-path HTTP forwarding, authentication/billing/quota/model/voice errors, empty/odd/interrupted PCM, abort/timeout, WAV wrapping, exclusive audio/microphone suppression, early playback, End Call cleanup, explicit retry, stable turn IDs, cached-phrase preloading and no premature English translation. Existing glossary/refusal/email/security and scenario checks remain.

A Chrome-compatible in-app browser check of the actual BrowserCallIO/Web Audio code using a **mock tone stream** began playback before stream completion and cancelled on End Call. The run displayed request 21ms, first bytes 23ms, renderer playback 143ms and receipt completion 1624ms relative to the harness start. These demonstrate transport behavior only; they are not live ElevenLabs or end-to-end translation benchmarks. `scripts/browser-stream-check.html` is a developer harness served only by Vite; it is not bundled in production. The built UI was checked for preserved branding and configured Developer Mode labels. Native Chrome hardware/microphone and Danish speaker acceptance remain pending. A subsequent live browser run used actual generated Isabella assets and the real OpenAI/ElevenLabs APIs; the English-source turns measured 3642ms and 5846ms total response and returned cleanly to clinic listening. Detailed second-turn measurements were transcription 3482ms, translation 1426ms, ElevenLabs first audio 873ms, renderer startup 51ms and complete generation/transfer 1707ms. Playback began 924ms after dispatch, before audio receipt completed. Another clinic-to-English turn exhibited a 25057ms transcription delay, so the unchanged OpenAI stages remain variable. The following clinic-to-English turn also completed; End Call returned the application to READY/IDLE.

| Files | Change |
| --- | --- |
| `server/voice.ts` | Provider abstraction, ElevenLabs REST streaming, configuration, safe errors, cancellation, PCM/WAV |
| `server/audioAssets.ts` | Shared fixed-phrase hashes and cache version |
| `server/api.ts`, `server/index.ts` | Danish streaming route, relay/cancellation/errors, startup validation, safe health/cache metadata |
| `src/pcmPlayback.ts`, `src/browserAudio.ts` | Incremental Web Audio, exclusive ownership, output selection, cache warmup |
| `src/controller.ts`, `src/types.ts` | Danish streaming events, T0–T6, stable-row retry, IDLE cleanup |
| `src/main.tsx`, `src/style.css`, `src/config/phrases.ts`, `src/config/campaignGlossary.ts`, `src/email.ts` | Stage 1.4 labels, retained per-turn Developer Mode timings, retry, exact opening and Isabella name preservation |
| `scripts/generate-audio.ts` | Idempotent ElevenLabs fixed-phrase generation; source asset reuse |
| `.env.example`, `.env` | Document provider configuration; added optional display label without changing existing credentials |
| `tests/voice.test.ts`, `tests/pcm-playback.test.ts`, `tests/stream-server.test.ts`, existing tests | Mocked provider/transport/playback/state/cache/security checks |
| `scripts/browser-stream-check.html`, proof PNGs | Free, explicitly mocked browser transport verification |
| `package.json`, `package-lock.json` | Version 0.4.0; no new dependencies |
| `README.md`, `TEST_SCENARIOS.md`, `docs/stage-1.3-audit.md` | Current instructions, live checks, clearly historical Stage 1.3 audit |

## Known limits

Paid library-voice API access is now verified and all required cached assets are generated. Quality is not certified by a successful API response. Flash v2.5 has number-normalization limitations; original text is preserved rather than silently rewritten. The app still waits for complete source speech and complete OpenAI translation, has no barge-in, prioritizes Chrome, and uses heuristic silence detection plus a manual fallback. No physical-call integration exists. Local call transcripts/recordings stay memory-only, but provider processing/retention follows the respective account settings; this is not a provider zero-retention claim. No Twilio, autonomous answering, CRM, auth, database, email or production consent automation was added.
