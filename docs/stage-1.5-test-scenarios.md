# Stage 1.5 current acceptance checks

Detailed results: [optimization report](docs/stage-1.5-report.md). Automated suite: 101 mocked tests / 14 files.

- Ten original and ten completed optimized synthetic English turns: greeting, information question, doctor unavailable, callback, refusal, doctor first, long receptionist question, spelled email, numbers/date/time, unexpected medical question.
- Eight original Danish fixtures: full wording, names, uncertainty, callback, transfer and complete permission/email/unsubscribe statement.
- Source audio completes before translation; final validated translation completes before voice generation.
- 350/450/550/650ms pause audit; English 450ms and Danish 1350ms defaults; manual Finish speaking for long pauses/spelling.
- Exact structured cached suggestions require explicit approval and play existing WAV without translation/ElevenLabs requests.
- End Call during capture, transcription finalization, translation or streamed playback cancels late output and returns to READY.
- Developer mode shows all eight latency differences and missing/inapplicable stages as —.
- Native Danish speech and physical microphones/headphones remain human acceptance work; synthetic API success does not establish pronunciation accuracy.

The Stage 1.4 checklist below is retained as historical context.

# Stage 1.4 manual acceptance

The configured account now has verified Isabella API access. All seven ElevenLabs fixed-phrase assets were generated and a repeated generator run reused them. The app health check reports no missing audio. Preserve `.env` and restart the server to load Stage 1.4. Native Danish voice-quality review and physical microphone latency acceptance still require human testing.

## Prerecorded opening and phrase bank

Start Chrome with headphones and Demo mode enabled. Confirm Developer Mode shows ElevenLabs / Isabella / Eleven Flash v2.5. Start and verify the opening says “Hej, du taler med Isabella. Jeg ringer på vegne af aPureBase…” exactly as shown in the phrase script. At WAITING FOR AGENT select each of the six bank responses over separate calls/turns. Confirm there is no live AI request for the bank phrase itself and it starts immediately from memory. The simulated clinic response following a phrase is a separate live OpenAI translation request. Rerun the asset generator and verify it reuses all unchanged files.

Change only a voice display label: playback identity should not change. Change the actual configured voice ID/model/settings or phrase text: health must report outdated recordings until generation succeeds. Restore the intended configuration and regenerate before the native-voice test.

## English → Danish custom response

After the opening and first simulated clinic greeting, choose Speak custom response. Say one full English sentence mentioning aPureBase. Pause briefly mid-sentence below the VAD threshold and continue. Translation and speech must not begin until the source is finalized. Once the final Danish text exists, streamed audio should start before complete generation where the provider delivers progressively. Confirm the English source and whole Danish translation appear once in the conversation.

Use Finish speaking to preserve longer deliberate pauses. Test names, “aPureBase”, numbers/dates, professional medical terms, email spelling, refusal and callback wording. A native Danish reviewer must judge voice identity, accent, cadence and pronunciation independently of text correctness. Record failures for review; never infer consent from silence, callback, receptionist uncertainty or address extraction.

## Danish → English regression

Turn Demo mode off with consenting local test participants and correctly selected input/output devices. The clinic speaks a whole Danish sentence; inputs remain exclusive. Its complete English translation plays through the existing OpenAI path. No ElevenLabs request is made for English speech. Repeat several alternating turns. The app has no real phone-call connection yet.

## Latency

For each live English-source row collect transcription, AI/translation, ElevenLabs first audio, network/playback, total response and complete-generation/transfer timings in ms. Detailed timings are in Developer Mode; historical turn rows retain all timing components in Developer Mode after the current meter clears. Use the same text across repeated runs and report spread, not only the fastest trial.

First-audio timing includes the local bridge and network. Complete-generation time is a different metric. T0 remains the end of speech and includes the silence-finalization gap in the transcription measure. Renderer playback is not a measured acoustic headphone onset. The <1500ms total target and reported 657ms manual provider result are not validated integrated results.

## Cancellation, errors and retry

End Call during generation before first bytes, during streaming playback, during OpenAI translation and during microphone recording. Confirm silence, closed inputs, cancelled requests, cleared retry/queued audio, READY/IDLE and a fresh working Start. No late source or playback event may update the terminated call. The prerecorded thank-you may show CALL COMPLETE after a normally completed scenario.

Use mocked automated tests for auth/payment/quota/model/voice failures, timeout, stream corruption/interruption and PCM queue cleanup. A real failure must show “Voice generation unavailable.” without an unrelated fallback voice/answer. Retry voice explicitly replays the exact full translated response, reuses the same transcript row and does not repeat transcription/translation. If the listener heard a partial response, decide manually before replaying.

## Existing scenarios and five-minute session

The callback scenario preserves “Jeg skal lige spørge lægen først” as uncertainty and ends with a callback, not consent. The HCP scenario presents the simulated explicit statement and kontakt@example.dk only for human verification; it does not perform legal consent validation. The new opening is aPureBase/Isabella; remaining fictional Example Pharma scenario references intentionally remain simulation fixtures.

Run at least five real minutes with native Danish and English participants, including pauses, manual finish, cached responses and custom speech. Automated five-minute tests are simulations and cannot replace this acceptance.

## Automated / browser checks

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. All ElevenLabs tests mock the provider; no paid credits are spent. HTTP streaming tests bind only localhost. A development-only free browser harness is at http://localhost:5173/scripts/browser-stream-check.html. It plays a quiet test tone through the actual incremental BrowserCallIO/Web Audio path, labels its provider as mocked, and verifies early playback/cancellation. Its results must not be reported as Isabella quality or live translation latency.

Live verification recorded two real OpenAI/ElevenLabs English-source turns at 3642ms and 5846ms total response. The second measured 873ms first audio, 51ms playback startup and 1707ms complete generation/transfer, confirming playback before receipt completion. These used prerecorded English sources and do not certify microphone performance, native Danish quality or the <1500ms target.
