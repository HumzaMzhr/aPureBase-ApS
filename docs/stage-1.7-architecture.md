# Stage 1.7 architecture decisions and pre-implementation audit

The Stage 1.5 controller finalizes a whole source turn before translation and then plays ElevenLabs Danish PCM or buffered OpenAI English MP3. Its recognition gateway deliberately withholds partials and closes after one matched final item. Its PCM renderer has an 85ms startup buffer and an ownership lease covering one operation. Playback disables both microphones. Seven immutable cached WAVs are preloaded. Browser performance timestamps measure request, first text/audio and renderer startup; no acoustic timestamp is available. End Call aborts requests, input tracks and queued outputs. This controlled implementation stays available.

## Selected design

Separate participant computers, selected by the user, require separate local browser views. The agent owns provider credentials and processing. The clinic runs a key-free local participant view. A manually paired, encrypted, ordered WebRTC data channel carries clinic microphone PCM into the host recognition pipeline, and Danish target PCM back to clinic output. Source PCM is never connected to a listening bus. No public HTTP listener, Twilio or autonomous answer generation is needed. ICE/STUN supports pairing; restrictive networks may require user-configured TURN. Pairing is signaling only, not a guarantee of remote-network connectivity.

Logical buses: AGENT_INPUT_EN → EN recognition/semantic translation → HCP_OUTPUT_DA (remote); HCP_INPUT_DA → DA recognition/semantic translation → AGENT_OUTPUT_EN (local). Every binary frame carries a bus discriminator. Receivers reject direction violations. Inputs use outputless AudioWorklets; each listening bus has a separate renderer. Cached opening is decoded and sent only to HCP_OUTPUT_DA before recognition starts. Participant transcripts can show both languages independently of audio routing.

Keep gpt-live-transcribe with source-language hints, delay low, and application-owned VAD. Add explicitly enabled partial events to the existing gateway; controlled clients remain final-only. No word confidence or word timestamps are provided by this model; the app measures ASR availability and uses revision/instability heuristics instead of inventing confidence. Semantic/server VAD are unsupported by this transcription model, although conversational Realtime sessions support them.

Use bounded rolling source/target context with Responses translation. A 24-call comparison of gpt-4.1-mini, gpt-5.5/none and gpt-6-luna/none selected gpt-6-luna for streaming only. Precision uses gpt-5.5. A four-call fast-tier comparison was slower; standard tier remains selected. Paired CONTROLLED uses the original Stage 1.5 whole-turn translation route and original English/OpenAI and Danish/ElevenLabs HTTP providers; /controlled-demo keeps the original local controller. Strict structured output supplies new-unit translation and an uncalibrated review score; only fully validated units feed TTS. Partial text is display-only. Protect glossary terms and names, retain negation/questions, never answer source content.

One ElevenLabs stream-input WebSocket per direction per source turn, with fixed Isabella voice and Flash v2.5, PCM24k, sync alignment and unchanged voice settings. Text arrives as complete validated semantic units. Use character schedule [50,50,50,50] with auto_mode=false. A first completed sentence shorter than 50 characters may flush once; intermediate fragments never force flush. Turn completion flushes and closes with empty text. The short-sentence setting improved initial Danish onset in one run but did not eliminate subsequent gaps; it is provisional. No per-unit MP3, reconnection, crossfade, normalization or independent voice generation. Lost sockets fail closed; no replay of possibly spoken words.

A dedicated FIFO scheduler continuously appends PCM at exact previous-buffer end times, with a measured 100/200/300/400ms startup/jitter buffer. It records underruns separately from natural silence in provider audio. Alignment maps target character ranges to units. ASR has no word timestamps, so unit source-start attribution is a documented app observation, not precise acoustic word onset. Lag measures remain labeled accordingly.

Semantic commitment requires a meaningful clause/sentence plus stable tokens across distinct ASR updates and lookahead; punctuation alone is insufficient. Negation, dependent/reporting fragments and unsafe endings wait. High-risk contact details, explicit consent, authority, refusal, uncertain revisions and medical advice trigger Precision mode for the uncommitted remainder. Already spoken text is never "corrected" aloud. Maximum unsafe buffering escalates instead of cutting at a fixed interval. All source/translated/spoken ranges are tracked and bounded. Queue backlog holds the uncommitted remainder for full-turn precision and drains queued outputs while retaining source capture. Eight queued units plus one precision tail, 200 session units, two-minute source turns, 30 seconds of queued PCM and 185-second provider sockets bound resource growth. Actual ASR revision/errors stop for human review. Meaning is never silently dropped.

Barge-in OFF logs events without cutting output. Experimental mode cancels unsent text and queued playback for the old speaker, keeps delivered transcript/ranges, and prioritizes the new source; undelivered units stay visibly marked for review. Human quality ratings are never filled automatically.

## Alternatives reviewed

OpenAI Realtime translation has a dedicated continuous translation endpoint and browser WebRTC transport, and emits translated audio and transcripts. Its audio could be discarded and captions bridged to Isabella, but documented stable source-to-target span mapping/glossary control and that bridge were not validated. Using its audio directly would bypass fixed Isabella; generating unused audio also adds cost. The selected text pipeline exposes semantic commitment and review before voice generation. Conversational speech-to-speech could answer the source and violates interpretation-only scope. Direct provider WebRTC simplifies audio but would separate the app from the selected text commitment/TTS pipeline. Server WebSockets keep keys private and expose deterministic routing and cancellation. Browser-to-browser WebRTC serves participant separation only.

## Official documentation reviewed (13 October 2026)

- https://developers.openai.com/api/docs/guides/realtime-transcription
- https://developers.openai.com/api/docs/guides/realtime-translation
- https://developers.openai.com/api/docs/guides/realtime-vad
- https://developers.openai.com/api/docs/guides/realtime-webrtc
- https://developers.openai.com/api/docs/guides/streaming-responses
- https://developers.openai.com/api/docs/guides/latency-optimization
- https://elevenlabs.io/docs/api-reference/text-to-speech/v-1-text-to-speech-voice-id-stream-input
- https://elevenlabs.io/docs/eleven-api/guides/how-to/websockets/realtime-tts
- https://elevenlabs.io/docs/overview/models
- https://elevenlabs.io/docs/eleven-api/guides/how-to/best-practices/latency-optimization
- https://elevenlabs.io/docs/api-reference/text-to-speech/stream
- https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
- https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/setSinkId

The deprecated HTTP optimize_streaming_latency setting is not used. WebSocket buffering/auto_mode are current controls; auto_mode is reserved for full sentences, not arbitrary fragments. Pronunciation dictionaries are initialization-scoped; no unverified phoneme rewriting or dictionary is applied. Native voice naturalness and physical isolation require human listening with both participants.

## Measured outcome

The 100ms startup buffer remains provisional. Actual PCM arrival trace replay at 100/200/300/400ms yielded two underruns in each direction at all settings, zero overlap. Provider packets already exceed the tested startup thresholds, so a larger setting did not repair upstream stalls. No crossfade/DSP is applied. Native quality, interruption phoneme safety and physical two-computer isolation remain unaccepted. See the final report; the 1–2 second target was not achieved.
