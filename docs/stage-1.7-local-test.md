# Stage 1.7 local evaluation

LOCAL TEST uses one computer and no invitation, clinic reply, participant service or peer connection. LIVE TWO-PARTY is still the default; its host, clinic, peer, pairing view and source/output routing have not changed. No Twilio integration is included.

## Start English → Danish on one laptop

1. Connect headphones. In macOS Sound settings, make them the output device if using the app's default output.
2. In Terminal:
   ```bash
   cd "/Users/humzamazhar/Documents/ChatGPT/aPureBase ApS"
   npm run dev
   ```
   If the server is already running on port 5173, use it; do not start a second copy.
3. Open **http://localhost:5173** in Google Chrome and refresh an old page.
4. Select **Session mode → LOCAL TEST**. This selects **STREAMING INTERPRETER** automatically. Leave **Translation path → Semantic streaming · Stage 1.7** selected.
5. Select **Direction → English → Danish**, **Local microphone**, and **Local headphones**. Refresh local devices after connecting headphones. If labels are initially blank, they become available after granting microphone access on Start; STOP, refresh devices, select the named devices and start again if necessary.
6. Enable **Developer mode** for timing, voice/model details and semantic/chunk events. Leave **Use controlled complete-turn fallback** unchecked for the standard streaming test.
7. Leave **Play cached Danish opening before listening** unchecked for a clean translation timing test. It remains available as an optional prerecorded opening; it runs before microphone input is enabled and is excluded from latency.
8. Click **START LOCAL TEST**, allow microphone access, and wait for **LISTENING**.
9. Speak English, for example: “Hello. I am calling the clinic. Could you help me with a question?” Read the English source text and Danish target text. Only generated Danish audio should be heard; your English microphone must never be played back.
10. For names, numbers, refusals or consent wording, the existing precision handling can wait for a complete turn. Pause or press **Finish speaking** when requested. **STOP** immediately stops microphone capture and pending translated output; it is not a finalization button.
11. Read **Time to first translated audio**, **Current interpreter lag**, **Median lag**, and **p95 lag** in Developer mode. Judge voice quality by listening through the headphones. Automated tests do not rate naturalness.

For Danish → English, STOP, change Direction, then start again and speak Danish. Only English target audio is played. The Danish cached opening is disabled in this direction.

## Paths and measurements

- **Semantic streaming:** existing IsolatedMicrophone → RecognitionDirection / live transcription → StreamingInterpreter / SemanticCommitter → validated incremental translation → ContinuousVoice / AlignmentLedger → ContinuousPcmScheduler. Same standard recognition profile, English 450ms / Danish 1350ms silence windows, bounded context, precision gates and protected terms. One local target bus replaces the remote/local listening destination, without changing the two-party host.
- **Controlled fallback:** the original whole-turn translator and target provider split (Danish ElevenLabs HTTP PCM, English buffered OpenAI speech). After target playback, the same local source microphone resumes. A local-only request header asks the existing translation route to report its selected model; ordinary two-party requests and responses stay identical.
- **Direct speech-to-speech (experimental):** reuses the existing development-only RealtimeTranslationTrial and gateway. Local PCM goes to the provider; only generated target PCM reaches the local target renderer. Native OpenAI voice, no selectable Isabella voice and no application semantic/precision gate. **Finish speaking & drain** completes the direct trial and stops it; Start begins a new trial. The gateway's two-minute session limit still applies. `npm start` does not expose this experimental gateway; its local selector is disabled there.

First translated PCM and first renderer playback are measured from the first detected source speech on the same laptop clock. Renderer playback may start with provider silence and is not acoustic headphone onset. Cached opening never contributes to either measurement. Median/p95 summarize source-to-target playback lag for played semantic units; later unit source positions are ASR-observed, not acoustic word timestamps. Current lag tracks pending committed units, not uncommitted source speech. No clock synchronization or remote network hop is involved in local measurements.

Direct captions do not supply trustworthy source-word to target-audio alignment. Its current/median/p95 semantic lag fields show **—** with an explanation; generated audio queue duration is shown separately. No numeric continuous-lag claim is inferred from caption elapsed time.

## Validation

Automated offline tests exercise both directions with the actual default local microphone, recognition, semantic interpreter, translator API adapter, alignment ledger and PCM renderer, replacing only provider responses and browser audio hardware. They verify selected input/output devices, an outputless microphone graph, target-only playback, precision handling, controlled fallback, cached-opening exclusion, direct generated-only playback, timing, STOP during permission/setup/translation/output, late callbacks and resource cleanup. UI tests retain both paired participant views and verify local controls/Developer fields.

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Provider responses in these tests are mocked. Physical headphones/microphone listening and human speech acceptance remain manual checks; this mode makes those checks possible on one laptop and does not certify a 1–2 second delay.
