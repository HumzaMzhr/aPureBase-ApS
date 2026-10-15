# Stage 1.8 — single Danish voice fix

14 October 2026. OpenAI model configuration, Isabella ID/model/settings, VAD/jitter settings and Twilio boundary are unchanged. No Twilio implementation or general latency tuning was added.

## Source audit and finding

The primary short greeting followed this exact code path:

`SemanticCommitter` → `StreamingInterpreter` → `LocalOutput.open` → `ContinuousVoice.send` → `/api/voice/live?language=da&profile=quality` → ElevenLabs fixed-voice `stream-input` → HCP_OUTPUT_DA.

The primary committer allowed a one-word greeting. The voice client flagged it as an initial clause/sentence, and the gateway immediately forced generation with `flush:true`. This separated “Hej” from the introduction and deprived that first generation of surrounding text. All primary PCM on that path was fetched from ElevenLabs; the audit found no browser SpeechSynthesis, Web Speech TTS, OS/system TTS or generic fallback implementation. A one-word flush is a confirmed code behavior; its effect on perceived voice/naturalness requires listening. There is no captured trace/recording of the user's particular microphone run, so its heard provider cannot be retrospectively proven.

Two separate paths could actually play OpenAI Danish: the opt-in direct translation experiment and the old controlled-demo's audible Danish source fixtures. The former is now disabled for English-source/Danish-target operation at UI, session constructor, client and server gateway. The latter is silent source input for recognition. Historical direct-Danish playback in the comparison page is disabled. Neither path remains eligible for HCP_OUTPUT_DA.

## Output audit

| Path | Permitted Danish source | Enforcement |
|---|---|---|
| Primary / retained semantic streaming | ElevenLabsVoiceProvider fixed-voice WebSocket | Server voice identity on ready; client validates before binary audio; renderer checks configured ID/model |
| Controlled local / paired translation | ElevenLabsVoiceProvider HTTP PCM | Server response headers identify provider/voice/model; client and renderer validate before playback |
| Cached opening / fixed phrase bank | Existing seven Isabella recordings | Health validates manifest provider, configured voice/model and cache hash; playback checks cached identity |
| Paired clinic listening | Same voice as agent's validated stream | audio_open identity, sender/receiver PCM guards, clinic renderer, session voice lock |
| Legacy buffered Danish playback | Verified cached/provider-produced blob only | Blob provenance is required before creating an audio URL or calling play |
| Direct OpenAI Danish output | Disabled | Client/session refuse before capture/provider opening; server returns 403 before paid connection |
| Browser / system / preview / generic fallback | Disabled / absent | Untagged or non-ElevenLabs PCM/blob is rejected before Danish output scheduling |

`VoiceIdentity` is public server-origin metadata, not a secret or a waveform-based speaker classifier. The software checks producer identity and configured voice selection. It does not claim to prove perceived voice quality from PCM, nor to control audio produced outside this application.

## Fix

The primary semantic path combines an opening greeting with the immediately continuing safe introduction. It cannot hide incomplete questions, negation or uncertain names behind the greeting. A genuine standalone greeting remains available at source finalization.

The Danish voice client has a **250ms maximum** coalescing window for a lone translated greeting. An immediately following validated phrase is sent with it in one message on the same fixed-voice connection. Finalization sends a held greeting without waiting out the window; STOP discards the held text and cancels its timer. The server refuses forced early flush for an isolated Hej/Goddag/Hallo even if an older client requests it. This is a greeting/prosody change, not general latency optimization.

HCP_OUTPUT_DA requires ElevenLabs identity and locks to the configured voice ID/model. Another voice, provider, model or untagged PCM is rejected before any AudioBufferSource is scheduled. The same checks cover controlled speech and cached audio; peer signaling carries identity without altering the existing PCM frame format. Verified first-PCM voice identity appears in Developer Mode's Semantic / chunk events.

ElevenLabs failure stops capture/output immediately, preserves existing translated text, shows an error and allows a fresh START. There is no fallback synthesis or replay. STOP closes recognition/voice sockets, microphone tracks and audio contexts, clears interpreter/PCM/greeting queues, stops scheduled nodes and ignores late audio.

## Validation

`npm test`: **270 tests / 35 files passed**. Tests cover all six requested behaviors: ElevenLabs-only HCP output, rejection of OpenAI/browser/system/fallback identities, no fallback after failure with translated text retained, greeting coalescing and bounded timeout, one configured provider/voice across session PCM, and STOP cleanup including held greetings. Paid providers are mocked.

`npm run lint`, `npm run typecheck`, `npm run build`: passed.

A real browser test with silent synthetic PCM passed the zero-output microphone graph, local ordered WebRTC exchange with voice metadata, source-bus rejection and no scheduled overlap. No microphone or new paid API calls were used for this fix. Physical headphone quality remains a human check. Prior Stage 1.8 latency measurements are historical and were not re-measured for this patch.

## Retest

The updated server is running at http://localhost:5173. Reload Chrome, select LOCAL TEST / English → Danish, select microphone/headphones, leave cached opening off and enable Developer mode before START. Say “Hi, my name is Humza, and I'm calling on behalf of aPureBase.” The greeting/introduction should be committed together when safe and use Isabella throughout. Check `verified voice` events: provider `ElevenLabs`, voice ID `gIfqD5jrnhkFu8ENVbXC`, model `eleven_flash_v2_5`. If speech fails, the translated text should remain visible with an error; there should be no replacement voice. STOP before changing settings or restarting.
