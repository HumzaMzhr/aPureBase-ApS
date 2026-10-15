> Historical Stage 1.3 record. Stage 1.4 supersedes Danish voice/output buffering and opening wording; use the current root README for launch/configuration.

# aPureBase AI Call Interpreter — Stage 1.3

Rebuild of the existing Stage 1 React/TypeScript/Vite + local Node application. A fictional Example Pharma healthcare contact call begins with a locally prerecorded Danish introduction, then alternates complete clinic and agent turns. The interpreter translates only. Human agents verify wording, email spelling, consent and authority. No telephony, aPureBase API, CRM, database, accounts, email sending or Stage 2 functionality.

## Audit of the previous implementation

Inspected all frontend/backend sources, configuration, tests and documentation before rebuilding.

- `TranslationChannel` created two simultaneously active WebRTC connections to `gpt-realtime-translate`. That model is designed for continuous interpretation and can return audio before the source sentence ends. There was no output gate based on source finalization.
- Original/translated deltas were appended directly. There was no `event_id` deduplication or finalized-turn ledger. The documented deltas are append-only; elapsed timestamps are not unique event IDs. Repeated content might also come from acoustic recapture or model output. The code establishes these plausible causes; no captured runtime trace establishes one specific cause of the reported duplicates.
- Both microphone tracks remained enabled. Logical track separation did not stop a nearby speaker or headphone/loudspeaker leakage from entering either microphone.
- Latency used energy on the decoded remote track, not audible playback or a server utterance-final event, and included negative values from simultaneous translation. It was not suitable for this business flow.
- Browser behavior depended on WebRTC SDP fetch, microphone permission, autoplay and output-device selection. Safari’s reported “Load failed” cannot be assigned an exact cause without its network trace. Stage 1.3 explicitly requires desktop Google Chrome and removes browser-to-OpenAI SDP/auth entirely.

## Current official API audit and decision

Official sources reviewed 12–13 October 2026:

- [Realtime API](https://developers.openai.com/api/docs/guides/realtime)
- [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription)
- [Realtime translation](https://developers.openai.com/api/docs/guides/realtime-translation)
- [Voice activity detection](https://developers.openai.com/api/docs/guides/realtime-vad)
- [WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc)
- [File speech transcription](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Text generation / Responses](https://developers.openai.com/api/docs/guides/text)
- [GPT-5.5](https://developers.openai.com/api/docs/models/gpt-5.5)
- [Speech generation and voices](https://developers.openai.com/api/docs/guides/text-to-speech)
- [Speech request schema](https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create)

**Decision:** replace streaming interpretation with a chained, explicitly finalized pipeline. Realtime transcription with manually committed input is another valid option, but completed file requests make the no-overlap constraint and local ownership simpler to inspect. Continuous `gpt-realtime-translate` is intentionally removed. No SDK assumptions: native browser audio/HTTP and server `fetch` implement the audited request schemas.

## Architecture and models

```text
START → local Danish opening → LISTEN DANISH
  → complete recording → /api/transcribe → /api/translate → /api/speech
  → full English audio → WAIT FOR AGENT
  → local phrase OR complete English recording
  → transcription → translation → complete Danish speech → LISTEN DANISH
```

| Task | Default | Rationale |
|---|---|---|
| Completed-turn transcription | `gpt-transcribe` | Current recommended high-accuracy file transcription; explicit source hints and campaign context. |
| Complete text translation | `gpt-5.5`, reasoning `low` | Quality-focused multilingual model with a constrained interpreter prompt and protected company/email tokens. Low reasoning balances quality and turn time; measure rather than assume latency. |
| Speech generation | `gpt-4o-mini-tts` | Current dedicated speech endpoint supports pronunciation/pacing instructions and Danish. Complete MP3 output is buffered before playback. |
| Interpreter / prerecorded agent | `marin` | One of the official guide’s recommended quality voices; kept stable across the opening, bank and live interpretation. |
| Simulated clinic/HCP source | `cedar` | Another recommended quality voice, distinguishable from the interpreter. |

These are quality-oriented defaults, not a claim of universally best or native-quality Danish. Voices are optimized for English, so Danish pronunciation, pacing and names need native review. Environment overrides support A/B testing. No silent model fallback. A model change can require compatible reasoning/voice settings; older `tts-1-hd` lacks instructions and does not support `marin`/`cedar`. Current deprecation schedules must be checked before using an older model.

## Explicit state machine and audio ownership

`IDLE → OPENING_READY → PLAYING_OPENING_DANISH → LISTENING_DANISH → DANISH_SPEAKING → PROCESSING_DANISH → PLAYING_ENGLISH → WAITING_FOR_AGENT → ENGLISH_SPEAKING → PROCESSING_ENGLISH → PLAYING_DANISH → LISTENING_DANISH`.

Phrase-bank replies go directly from `WAITING_FOR_AGENT` to `PLAYING_DANISH`. A terminal error becomes `ERROR`; End Call and the demo’s thank-you become `CALL_COMPLETE`. Start from a terminal state begins a fresh call.

One controller owns the entire call; only legal transitions and one asynchronous action can run. Live microphone tracks are disabled during playback and processing. Only the selected source track is enabled during recording. Waiting for the agent keeps capture disabled until **Speak Custom Response**. Both roles may share one physical microphone because they never record together. For separate microphones, select them in Developer Mode and physically isolate participants.

One audio element handles all output. A second playback cannot start while another owns it. Abort signals terminate capture, playback, playback-tail delays and HTTP requests. Late results are checked before every state/output change. End Call revokes the audio URL, disables/stops tracks, closes audio analysis and prevents stale output. Normal playback waits 180 ms before reopening input. Headphones remain necessary; software cannot remove another person’s voice from an active microphone.

## Prerecorded assets

`src/config/phrases.ts` contains stable IDs, English references and professional Danish demo text for the supplied Humza opening and six bank phrases: Purpose of Call, Request Email, What Information?, Unsubscribe, Callback, Thank You.

`public/audio/` contains generated WAV recordings, including scenario source clips. `manifest.json` records model, voice, language, size and a content/config hash. `npm run generate:audio` generates only missing/changed clips; repeated runs reuse identical files. No call-start or phrase-bank click invokes translation/TTS for these recordings. A/B changes affect live output after server restart; regenerate recordings explicitly to apply new settings to them.

All recordings are **Pre-generated demo phrase / AI-generated audio**, not legally approved campaign material. The opening plays once per call. Missing assets fail clearly instead of synthesizing silently or claiming readiness.

## End-of-turn and live fallback

In live mode, Chrome `MediaRecorder` captures one complete WebM/Opus turn in memory. A local Web Audio analyser samples every 30 ms. Voice must exceed RMS 0.018 for at least 90 ms before being treated as speech. Silence finalizes after a configurable 650 ms default (500–3000 ms in Developer Mode). Pauses shorter than the threshold stay in one recording. No transcription or translation request is issued before finalization.

**Finish Speaking** manually finalizes either speaking microphone turn. **Require Finish Speaking** disables silence finalization entirely for pauses, dictation, email spelling or a strict human-controlled turn boundary. An energy VAD cannot know whether someone intends to continue after a long pause; increase the silence threshold or use manual mode. Never claim that 650 ms silence guarantees semantic sentence completion. Recordings exceeding three minutes or 20 MB fail instead of silently truncating/playing a partial translation.

The complete original transcript then goes through translation and full speech generation. Original text is never rewritten by email extraction or glossary substitution. Only finished turns enter one chronological, memory-only ledger, with stable IDs, speaker, language, original, translation/reference, method, timestamp and latency. No streaming fragment boxes remain.

## Glossary and email handling

`src/config/campaignGlossary.ts` includes aPureBase, Example Pharma, Humza, Pernille, HCP, healthcare professional, clinic, doctor, nurse, secretary, consent, email, professional/medical information, therapy area, professional activities, online meetings, unsubscribe and callback.

Instructions preserve questions, refusals, uncertainty and names, and forbid answering, summarizing, embellishing or inferring consent/authority. Company names and literal email addresses are replaced with stable protected tokens for translation, then restored byte-for-byte. If a token disappears, playback fails instead of accepting altered content. Original transcription still needs human review; a model may mishear spelling or translate other meaning incorrectly.

Possible email candidates are shown separately from original text. Literal addresses preserve `@`, suffixes, hyphens, periods and digits; spoken punctuation yields a tentative suggestion with “Please confirm email manually.” **Confirm Email** verifies spelling in session memory only. It does not save/send contact details or validate consent. Both scenarios clearly show **Human verification required**. No consent result field exists anywhere.

## Demo mode

Default Demo Mode requires no participant microphone. Source recordings are actually played in full before being sent through live AI transcription/translation/speech; displayed results are not substituted expected answers. At each agent turn, **Play Next Scripted Response** plays its prerecorded English source through the same complete-turn pipeline. Alternatively choose a bank phrase or speak a custom response with a microphone. Live AI requests are billable even though source participants are simulated.

1. **Pernille / callback:** greeting → why calling → type of information → request email/permission → “I need to ask the doctor first” → callback tomorrow after ten → prerecorded thank-you/end. No consent inference.
2. **HCP agreement/email:** Pernille transfers the call → HCP asks for the information → explicit simulated permission plus fictional `kontakt@example.dk` → human email review → thank-you/end. No legal consent validation.

Expected English/Danish references exist in `src/config/scenarios.ts` for human comparison only. Developer Mode reveals the silence setting, manual finalization, device selectors and raw state. The primary interface remains focused on call controls, the demo bank, one conversation and current latency.

## Latency

Every live interpretation turn has five local monotonic `performance.now()` timestamps:

- **T0:** last voiced microphone sample confirmed by the silence threshold; in manual mode, the last voiced sample observed before Finish Speaking; for simulated recordings, the source audio `ended` event.
- **T1:** full final transcript HTTP response parsed in the browser.
- **T2:** full translated text response parsed.
- **T3:** full generated MP3 body received as a browser Blob.
- **T4:** the audio element’s first `playing` event for that translated clip.

The UI shows T1−T0 (speech finalization, including VAD hangover, recorder finalization, uploads, recognition and return trip), T2−T1 (translation request/network), T3−T2 (voice generation/network), T4−T3 (playback setup/decoding), and **T4−T0 total response latency**, all in ms. Simulated source playback duration is excluded. Prerecorded phrases have no live processing latency. The meter clears when a new source turn or prerecorded reply begins and populates at playback start.

Browser `playing` measures renderer readiness, not headphone/DAC acoustic onset. Background-tab throttling and noise affect microphone T0. There is no mixed server/client clock and no sub-second claim. Never reduce latency by interpreting before source finalization.

## Security and storage

The browser calls only the local server; no OpenAI secret or client token enters frontend code. The service binds to `127.0.0.1`, validates exact local Host/Origin on POST routes, limits body/text sizes, sanitizes upstream errors, uses timeout/cancellation, and returns `Cache-Control: no-store`. Responses requests use `store:false`. Keys and other `.env.*` files remain gitignored. Do not expose this unauthenticated local technical service publicly.

Live recordings/transcripts are memory-only and discarded on reload/new call. Only fictional pre-generated demo audio is stored under `public/audio`. No microphone recording is saved on disk. OpenAI receives complete recordings/text for processing; this application's storage choices do not control service-side retention. Console logs include failure status, not keys, raw recordings or participant text. The optional live validation script logs fictional fixtures only.

## Install and run

Use Node ≥22.12 and **desktop Google Chrome**. Safari and Chrome on iOS are not supported for this technical demo.

```sh
cd "/Users/humzamazhar/Documents/ChatGPT/aPureBase ApS"
npm ci
# Keep an existing .env; if absent:
# cp .env.example .env
# Set OPENAI_API_KEY locally. Optional models/voice are listed in .env.example.
npm run generate:audio   # only needed for missing/changed recordings; reuses matching assets
npm run dev
```

Open http://localhost:5173 in Chrome. Choose a scenario and Start Demo Call. At WAITING FOR AGENT, play the next scripted response, choose a prerecorded bank reply or speak a custom response. Finish Speaking is the manual fallback. End Call cancels the entire call. For a real participant, uncheck Demo Mode before Start and use headphones; only the proper source microphone is active in each turn. Device names may become visible only after the first live permission grant; end the call, refresh devices in Developer Mode and select outputs for the next call.

For the compiled frontend, `npm run build` then `npm start`. Run only one server on port 5173. Restart the server after environment changes. Local recordings ship with the project, so generation is not required every run.

## Verification

```sh
npm test
npm run lint
npm run typecheck
npm run build
# Optional billable checks on fictional recordings/text:
node --import tsx scripts/validate-live.ts
```

Tests cover state transitions, opening once, exclusive capture/playback, no interpretation before finalization, full output buffering, phrase-bank routing, custom responses, both directions, glossary/protected tokens, refusal/callback prompt constraints, email suggestions/confirmation, finalized turn IDs, End Call cancellation/stale results, five simulated minutes and API key protection. Mock/prompt tests cannot certify translation meaning or native Danish quality; use the live script and bilingual review in TEST_SCENARIOS.md.

## Known limitations and Stage boundary

Silence is an acoustic heuristic; manual finalization is the safest way to preserve long pauses. No speaker recognition exists. Translation errors or omitted details outside the protected literal tokens remain possible. Speech quality/voice identity across languages needs native review. Separate HTTP stages favor deterministic control over minimum latency, and this demo does not support barge-in: speech during output/processing is intentionally ignored. Complete output can take several seconds or longer. Connection failures stop the call and require a new Start. This is not a phone call or a legally validated consent workflow.

The existing aPureBase design remains: local official logo, bundled Open Sans, `#c2cd23` accents, charcoal controls/footer and bordered panels. Stage 1.3 ends here. No Twilio or Stage 2.

## Implementation validation results (13 October 2026)

- 41 automated tests across four files passed, along with lint, typecheck and the production build.
- All 19 WAV assets decoded as non-silent PCM. A repeat generation run reused every asset, with no new generation requests.
- Real API fixtures completed in both directions. Danish “Jeg skal lige spørge lægen først.” transcribed exactly and translated as “I need to ask the doctor first.” The agent purpose line preserved Example Pharma, doctors and email in Danish. Additional live text checks preserved explicit refusal, tomorrow-after-ten callback, aPureBase, Humza and `anna-2.jensen@example.dk`.
- The initial WAV live output tests had high variable latency (roughly 32 s and 82 s in speech generation/transfer). Complete MP3 output reduces transferred bytes while retaining the same model/voice. MP3 samples varied from about 2.5 s to 49 s; this is not a stable latency guarantee. The tested browser clinic greeting measured 6,190 ms total and the English agent response 8,668 ms; the subsequent clinic question took 30,924 ms. The UI reports these delays honestly.
- Local service readiness, all assets, cross-origin rejection, `.env` denial and absence of the configured secret from compiled frontend content were verified.
- Visual/turn-playback checks ran in Codex's Chrome-compatible in-app browser. Native Google Chrome automation was unavailable; Safari blocking is unit-tested. Physical microphones, native-speaker Danish review and five real minutes with human participants still need manual validation. The automated five-minute check is a simulation, not human endurance evidence.

The browser callback scenario was then run from opening through both live directions, local Information and Callback bank replies, “ask the doctor first,” tomorrow-after-ten, and prerecorded Thank You → CALL_COMPLETE. The call remained active for more than seven real minutes, including agent waiting/review pauses, without restarting. This is real API/playback validation on simulated participants, not a five-minute physical-microphone conversation or native-speaker quality certification.

The second browser simulation exposed two useful quality failures: a very short physician introduction was misrecognized, and the synthetic reading of a literal email lost its at-sign in recognition. The fictional HCP introduction was expanded for context, the email was changed to explicit Danish spoken spelling, and only those two source clips were regenerated. The app also flags likely email content with a missing at-sign for manual review and never reconstructs that address automatically. These findings reinforce the need for native-speaker and email-spelling review.

The revised HCP introduction transcribed and translated correctly on retest. The spelled email still exhibited an Anna/Anne recognition difference, which the app intentionally does not repair: original text remains visible and the suggested address requires human confirmation. A parser regression found during this test was fixed so the next sentence cannot become part of a spoken email's domain. Exact email/name recognition and native Danish quality remain manual acceptance items.

For the final illustrative agreement clip, the fictional email was simplified to the clearly spoken `kontakt@example.dk` to remove the Anna/Anne name ambiguity. The earlier name-recognition failure remains a documented limitation, not a reason to auto-correct real contact details. All human spelling-confirmation safeguards stay enabled.

Final retest: the `kontakt@example.dk` agreement recording transcribed exactly, translated its permission scope and unsubscribe clause faithfully, and yielded `kontakt@example.dk` as an unconfirmed manual-review suggestion. The final suite passed 41 tests, lint, typecheck and build. Compiled page/assets, all audio assets, MIME serving, origin protection and secret-file/frontend protection also passed.

## Changed file map

| Files | Purpose |
|---|---|
| `src/main.tsx`, `src/style.css`, `index.html` | Stage 1.3 controls, conversation, email review, latency, branding and responsive layout. |
| `src/controller.ts`, `src/types.ts` | Explicit call states, finalized turns, cancellation, timing and scenario coordination. |
| `src/browserAudio.ts` | Exclusive microphone/output ownership, local VAD, recording, full-clip playback and browser detection. |
| `src/email.ts` | Email suggestions and exact protected-token restoration. |
| `src/config/campaignGlossary.ts`, `phrases.ts`, `scenarios.ts` | Campaign terms, opening/bank and two simulated calls. |
| `server/index.ts`, `server/api.ts`, `server/models.ts` | Local routing, secure transcription/translation/speech calls and model/voice settings. |
| `scripts/generate-audio.ts`, `scripts/validate-live.ts` | Idempotent prerecorded generation and optional real API checks. |
| `tests/controller.test.ts`, `browser-audio.test.ts`, `email-vad.test.ts`, `server.test.ts` | 41 automated tests. |
| `public/audio/*.wav`, `public/audio/manifest.json` | 19 fictional prerecorded assets and generation metadata. |
| `.env.example`, `package.json`, `package-lock.json`, `tsconfig.json` | A/B configuration and generation/build commands. |
| `README.md`, `TEST_SCENARIOS.md`, `call-interpreter-preview.png` | Architecture, validation, manual test procedure and UI preview. |

Removed obsolete streaming modules `src/channel.ts`, `src/events.ts`, `server/session.ts` and their three WebRTC/delta-based test files. Existing logo/font assets and the project directory were preserved.
