# aPureBase AI Call Interpreter — Stage 1.5

Incremental English/Danish recognition runs while the source speaks. Translation starts after the complete turn commits; speech starts after the full translation validates. Danish output uses the existing Isabella / Eleven Flash v2.5 PCM stream. The opening and six cached recordings remain unchanged.

## Run

Preserve your existing `.env`. Stop any previous server with Ctrl+C, then:

```bash
npm run dev
```

Open http://localhost:5173 in Google Chrome with headphones. One server can use port 5173. Existing dependencies are installed; for a fresh checkout run `npm install` first. The existing recordings are ready and do not need regeneration.

Developer mode displays eight measured latency components per turn. English silence defaults to 450ms; Danish uses 1350ms to protect pauses in the test recordings. Use **Finish speaking** or enable manual finalization when spelling details or pausing for longer. Thresholds are provisional fixture-tested settings, not native-speaker acceptance.

Live mode requires microphone permission. **Start demo call** uses prerecorded sources through live recognition and interpretation. In **WAITING FOR AGENT**, speak English, select a fixed phrase, or request **Suggest approved response**. An exact cached suggestion appears for your review; **Approve & play cached suggestion** plays its preloaded WAV without a translation or ElevenLabs request. Other/high-risk suggestions require human review. No consent is recorded automatically.

## Configuration

All credentials remain server-only in the ignored `.env`. Existing ElevenLabs credentials, voice ID, model, settings and cached assets are preserved. Current non-secret settings:

```dotenv
OPENAI_TRANSCRIPTION_MODE=realtime
OPENAI_LIVE_TRANSCRIBE_MODEL=gpt-live-transcribe
OPENAI_TRANSCRIBE_DELAY=low
OPENAI_TRANSCRIBE_MODEL=gpt-transcribe
OPENAI_TRANSLATION_MODEL=gpt-4.1-mini
OPENAI_CAREFUL_TRANSLATION_MODEL=gpt-5.5
OPENAI_TRANSLATION_REASONING=none
AGENT_SILENCE_MS=450
CLINIC_SILENCE_MS=1350
```

Routine interpretation uses the measured faster model. Spelled email, numbers/dates/time, permission/medical questions and longer utterances use the stronger model after the faster model failed an email-quality comparison. Set `OPENAI_TRANSCRIPTION_MODE=file` to use the previous complete-file recognition architecture; failures never silently retranscribe or switch voices. Restart the backend after configuration changes.

## Evidence and limits

[Stage 1.5 report](docs/stage-1.5-report.md) contains the original/optimized per-stage median and p95, ten custom turns, model comparison, Danish recognition, cached-path results and semantic-unit experiment. Median custom latency improved from 6.42s to 4.83s; p95 from 29.79s to 9.86s. The <2s target is not met. These are synthetic controlled recordings, not physical microphone, native Danish or telephone acceptance tests.

[Historical Stage 1.4 audit](docs/stage-1.4-audit.md) documents the unchanged voice/cache transport. Existing branding, exclusive audio ownership, source-turn completion, End Call cancellation and explicit voice retry remain. No Twilio or autonomous calling is integrated.

## Checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Automated providers are mocked and spend no API credits. Production launch: `npm run build`, then `npm start`. Developer-only benchmark HTML is served by Vite and excluded from production. `benchmarks/` contains fictional controlled fixtures/results, never live human call recordings. Live transcripts remain memory-only locally; provider processing follows account settings.
