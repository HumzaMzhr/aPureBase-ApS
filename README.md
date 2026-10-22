# aPureBase AI Call Interpreter — Stage 1.9

The default remains **REALTIME INTERPRETER**, a one-laptop LOCAL TEST using continuous OpenAI transcription, validated incremental translation and ElevenLabs Isabella speech. Stage 1.8 is accepted from the user's microphone test: natural/acceptable Isabella, acceptable campaign pronunciation, small gaps and observed initial delay around 1–2 seconds. Stage 1.9 adds rolling simultaneous interpretation in both directions, isolated precision ranges, bounded translation prefetch during playback drain, short-fragment prosody controls and trailing-progress diagnostics. Nine approved synthetic live runs began target speech before source completion and delivered all recognized ranges, but missed the lag targets: at 250ms, first playback was 4.86s EN→DA / 4.66s DA→EN and estimated median trailing lag was 11.77s / 10.08s. A final question-boundary safety correction is regression-tested; final-version human continuity and live timing acceptance remain pending. Stage 1.9 is not a latency pass.

[Stage 1.9 implementation, verification and all 18 report items](docs/stage-1.9-report.md). The controlled harness `/scripts/stage19-benchmark.html` makes paid calls only when Run is clicked; synthetic source is delivered in real time and never played. Approval is required before agent-run paid benchmarks.

## Start on one laptop

Use Node.js ≥22.12 and Google Chrome. Connect headphones and retain the existing ignored `.env`. From this project folder run:

```bash
npm install
npm run dev
```

Open http://localhost:5173. The normal screen already selects LOCAL TEST / REALTIME INTERPRETER. Choose **English → Danish**, **Local microphone** and **Local headphones**, then click **START**. Allow microphone access when Chrome requests it. Speak English; only Danish translation plays. Pause naturally for finalization; click **STOP** to cancel. For the other direction STOP first, select **Danish → English**, then START: only English translation plays. There is no invitation requirement or source monitoring.

Optional cached Danish opening plays before English capture and is excluded from metrics. Enable Developer mode **before START** for actual models, partial/committed transcripts, per-unit timestamps, estimated current/median/p95/max trailing lag, end-of-source tail and source/ASR/TTS/playback positions. **Finish speaking** is available there for explicit finalization. If an error stops a session, review retained text and START a fresh session; nothing is replayed automatically. Stop an older server with Ctrl+C if port 5173 is already occupied.

After a local session fails or stops, Developer Mode **Export last session diagnostics** downloads `apurebase-last-session-diagnostics.json`. The last ended session survives READY, direction/path resets and browser reloads in the same browser/origin using localStorage (`apurebase.last-session-diagnostics.v1`). Starting another session leaves the archive intact until that session ends. Export before ending another session if you need to preserve a particular failure.

Diagnostics retain at most 2,000 recent metadata events, 200 unit summaries and 32 connection summaries, within 384 KiB of JSON; eviction is counted. Browser monotonic timestamps and server monotonic timestamps are labeled separately and must not be directly subtracted. Recognition states/IDs, unit stage timestamps, TTS submission lengths, first/last PCM receipt timestamps, flush/EOS/final/close and watchdog metadata are retained. Speech/transcript text, keys, headers, raw PCM and generated audio are excluded. There is no automatic upload. Browser storage must be permitted; if blocked/full, export remains available in memory but cannot survive a reload.

[Stage 1.8 architecture, measured results, limitations and all 16 report items](docs/stage-1.8-report.md). The controlled live harness `/scripts/stage18-benchmark.html` makes paid calls only when Run is clicked, uses synthetic fixtures and never opens a microphone or plays source audio.

## Run on two computers

Use Node.js ≥22.12 and Google Chrome. Each participant needs headphones and their own microphone. Stop an older local server with Ctrl+C before starting; only one process can use port 5173 on a computer.

Agent computer, with the existing ignored `.env` and cached audio:

```bash
npm install
npm run dev
```

Agent: enable Developer mode, select Session mode → LIVE TWO-PARTY, then select the desired interpretation mode. Clinic computer: copy the project **without `.env`, `.git`, node_modules or benchmarks**, then:

```bash
npm install
npm run participant
```

Open http://localhost:5173/participant. The clinic launcher binds to localhost and has no provider API access. Both computers may use port 5173 independently.

1. Agent selects CONTROLLED or STREAMING INTERPRETER and creates an invitation.
2. Clinic pastes the invitation and creates a reply; agent pastes the reply and selects Connect clinic.
3. Clinic selects its microphone/headphones and clicks Enable microphone & headphones. Agent selects local devices and clicks Start interpreter.
4. The existing cached Danish opening plays only to the clinic. Clinic speaks Danish; agent hears English. Agent speaks English; clinic hears Danish. Four text streams show both languages.
5. In CONTROLLED, microphones alternate and remain disabled during target speech. In STREAMING, ordinary clauses may play while the source continues. Consequential complete sentences use precision translation while surrounding ordinary ranges continue. Incomplete consequential meaning still waits safely; click Finish speaking when finished, especially for spelling, contact details, consent, refusal, dates or medical detail.
6. End call stops capture, recognition and pending playback on both sides. Reset pairing after disconnection; no possibly spoken text is replayed automatically.

Invitation exchange is manual signaling. WebRTC encrypts ordered PCM data; source PCM goes only into recognition, never a listening output. Default STUN may not connect across restrictive networks. Configure your own TURN servers in Developer mode when required. There is no public listener, telephone connection or Twilio integration.

## Controlled fallback

The paired CONTROLLED mode retains whole-turn translation through the original Stage 1.5 model route, buffered OpenAI/Marin English speech and ElevenLabs HTTP PCM Danish speech. The exact original single-operator controller/demo remains at http://localhost:5173/controlled-demo. That local demo presents both participants on one computer; use the paired main screen for separate listening outputs. [Historical Stage 1.5 guide](docs/stage-1.5-readme.md) and [report](docs/stage-1.5-report.md) remain available.

## Configuration and evaluation

Preserve existing credentials, Isabella voice ID, stored settings and all seven cached Danish recordings. No regeneration is required. All provider keys stay on the agent server in ignored `.env`.

```dotenv
OPENAI_TRANSCRIPTION_MODE=realtime
OPENAI_LIVE_TRANSCRIBE_MODEL=gpt-live-transcribe
OPENAI_TRANSCRIBE_DELAY=low
STREAMING_TRANSLATION_MODEL=gpt-6-luna
OPENAI_CAREFUL_TRANSLATION_MODEL=gpt-5.5
STREAMING_SERVICE_TIER=default
STREAMING_TTS_SCHEDULE=50,50,50,50
```

Restart the backend after configuration changes. The older Stage 1.7 semantic experiment uses fixed Isabella / eleven_flash_v2_5 for both target languages, one connection per direction per source turn, PCM24k and alignment. The preserved Stage 1.8 quality profile uses provider-default buffering. Stage 1.9 simultaneous output uses a 50/80/100/120-character generation schedule, one initial meaningful-clause flush and a provisional 250ms short-fragment prosody buffer, selectable at 150/250/350/500ms in Developer mode; STREAMING_TTS_SCHEDULE only affects older experimental profiles. Voice/model/settings remain unchanged. Automatic preview text is never spoken. The 100ms jitter default is provisional: offline replay found underruns at every tested value through 400ms. Fast service tier was slower in the small benchmark and remains disabled.

Developer mode contains jitter settings, lag thresholds, protected terms, ICE configuration, barge-in OFF/EXPERIMENTAL, per-unit timestamps and human listening fields. Ratings remain blank until a human reviews them. Experimental barge-in cancels pending output and preserves transcript ranges; it is not certified as phoneme-safe. Default OFF only logs interruptions.

[Stage 1.7 report](docs/stage-1.7-report.md) supplies the requested 19 findings, timings and exact live procedure. [Architecture decisions](docs/stage-1.7-architecture.md) and [test scenarios](TEST_SCENARIOS.md) describe bounds and acceptance checks. Generated target WAVs under benchmarks/stage17-audio are available for native listening; no naturalness score is inferred from a silent renderer.

## Checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Automated provider calls are mocked. Production agent launch: npm run build, then npm start. Developer benchmark HTML and artifact saving are excluded from production. Benchmarks contain fictional synthetic sources and explicit paid-provider trials; ordinary human call transcripts are memory-only locally. Provider processing follows account settings. Interpretation never invents replies or determines consent.

## Latency comparison added 14 October

The two requested latency approaches were tried. Direct speech-to-speech started its renderer near 1.1–1.3s, but signal analysis estimates actual first speech near 2.9–3.7s in the final trials. Name fidelity, provider silence and gaps remain unresolved. The faster Isabella profile was not reliably faster; one follow-up failed voice setup and delivered an incomplete tail. These historical trial results precede the Stage 1.8 default local path.

Open http://localhost:5173/scripts/latency-comparison.html for measured comparisons and target recordings. The opt-in fast Isabella fixture harness is /scripts/stage17-benchmark.html?profile=fast; direct benchmark is /scripts/direct-translation-benchmark.html. Each Run button makes paid provider calls using fictional fixtures; pages do not start calls automatically. Direct audio has no application precision gate and is not enabled for participant calls.

[Latency trial report](docs/stage-1.7-latency-trials.md) documents all results, failed cases, measurement corrections and tested precision/cancellation fixes. No Twilio or external call was made. Native listening and supervised phone tests are still required before readiness claims.

## Historical Stage 1.7 local experiment

To inspect the retained older experiment, run `npm run dev`, open http://localhost:5173 in Chrome with headphones connected, enable Developer mode, then select **Session mode → LOCAL TEST** (selects STREAMING INTERPRETER), **Direction → English → Danish**, and your **Local microphone / Local headphones**. Leave **Semantic streaming · Stage 1.7** selected and click **START**. Speak English: the source/target transcripts update and only Danish target speech plays. Use **Finish speaking** for complete-turn precision handling and **STOP** to cancel. STOP before changing to Danish → English. No pairing or participant computer is required.

Developer mode shows source/target text, first translated PCM/playback, current/median/p95 semantic lag, units/chunk events, path and voice/model. The optional cached Danish opening runs before microphone capture and is excluded from timing. Direct speech-to-speech is an explicit development-only experimental choice with native OpenAI voice and unavailable semantic lag, not the default. Controlled fallback remains available. LIVE TWO-PARTY and its existing pairing workflow remain available; no Twilio was added.

[Detailed local test instructions and measurement limits](docs/stage-1.7-local-test.md).

## Single Danish voice enforcement

English → Danish output is locked to configured ElevenLabs Isabella across streaming, controlled and cached speech. OpenAI Danish direct audio and old audible Danish source simulations are disabled. The primary greeting/introduction is grouped semantically, with a bounded 250ms target greeting buffer and no isolated greeting force-flush. ElevenLabs failure shows an error and retains text; it never switches voices. Developer chunk events record verified first-PCM provider/voice/model. [Source audit, exact changes and retest procedure](docs/stage-1.8-single-voice-fix.md).

## Voice-first campaign names

Known spoken-name variants such as Humza/Hamza and aPureBase/PureBase/a PureBase continue without spelling-only precision pauses or extra transcription calls. Canonical campaign speech text and pronunciation guidance reach the existing Isabella pipeline; raw ASR remains available in Developer processing positions. Emails, phone numbers, dates, consent and explicit exact-identity fields retain precision handling. Intentional source/precision waits do not generate false backlog warnings. [Policy, tests and retest instructions](docs/stage-1.8-voice-first.md).
