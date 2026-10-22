# D-1 official Twilio source review

Accessed 2026-10-22. SDK: pinned `twilio@6.2.0`; existing `ws` retained. No Twilio client, call, account lookup or provider-side verification was executed.

| Official source | Implemented boundary and qualification |
| --- | --- |
| [Call resource](https://www.twilio.com/docs/voice/api/call-resource) | One explicit destination, POST Calls resource plan, inline Connect/Stream TwiML, four progress callbacks. Status callbacks are sequenced independently from stream messages. Ringing is separate from answered duration. Terminal transport completion does not mean consent success. |
| [Media Streams](https://www.twilio.com/docs/voice/media-streams) | Outbound call with one bidirectional stream, inbound track only. No inbound dialing, campaigns, redial or recording. |
| [Stream TwiML](https://www.twilio.com/docs/voice/twiml/stream) | Configured WSS endpoint; session identity/nonce are custom parameters, not URL query fields. Connect blocks following TwiML. Hangup follows Connect so stream closure cannot resume an automated speech script. |
| [WebSocket messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages) | Start validates CallSid, AccountSid, StreamSid, nonce and format. Inbound audio is base64 raw mu-law, 8 kHz, mono; provider sequence, chunk and millisecond offset are retained as metadata. Outbound bytes contain no WAV header. Media precedes a unique owned mark. Clear discards buffered output and may return its pending marks; those marks must be ignored after interruption. Local outbound sequence is an application counter, not an invented Twilio message field. |
| [Security](https://www.twilio.com/docs/usage/security) and [webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security) | Official SDK `validateRequest`; exact configured externally visible URL and every form parameter, including unknown fields and whitespace. Reject missing/invalid signature, duplicate form fields, malformed escapes, stale call and wrong call. No validation bypass. JSON callbacks are unsupported and rejected, rather than incorrectly validating them as form requests. WebSocket handshake is separately validated before binding. |
| [Media Streams firewall/security](https://www.twilio.com/docs/global-infrastructure/firewall-configurations/media-streams-configuration) | Future public TLS host must validate the signature. No public listener, tunnel, firewall or certificate configuration was installed in D-1. |
| [Official Node signature helper](https://github.com/twilio/twilio-node/blob/main/src/webhooks/webhooks.ts) | Application uses the installed helper, not a rewritten signing algorithm. Tests sign synthetic requests independently through SDK helpers and verify malformed/modified signatures. |

## Completion and timing limits

A matching mark is accepted only after this adapter submitted the corresponding media and mark, while the same playback is active. A private per-call/stream proof registry binds call, stream, playback, phrase/version, canonical and synthesis hashes, asset hash and recipient revision. A returned mark proves the defined provider output boundary; it does **not** certify that a person heard or understood the phrase. Submission, resolved send and predicted duration never complete a question. Deadline expiration fails output; it never creates a completion.

Clinic onset reaches the existing controller first, invalidating question ownership. The adapter records interruption, clears output, and discards later marks for the old playback. No cross-call mark, duplicate completion or terminal-call event can revive automation.

## Audio decisions

The source is the frozen mono PCM16 24 kHz WAV. Apply the existing calibrated gain to a copy, low-pass before 3:1 decimation, mu-law encode and send base64 media. A 160-sample/20 ms frame is our framing choice; it is not asserted to be Twilio's mandatory packet length. Final frames may be shorter. Source bytes remain authoritative and unchanged. Resampling can require explicit peak protection; its count is reported separately from clipping. Telephone bandwidth and mu-law quantization alter the derived signal, so native telephone listening remains unverified.

Inbound conversion decodes mu-law and interpolates to PCM16 24 kHz with state across packets. Interpolation does not recover lost acoustic information. Existing Danish recognition adapter/model/configuration remain unchanged. Transport onset ownership uses the same .012 RMS / 800 ms local endpoint thresholds as the microphone adapter. Provider offsets are mapped to the call clock; these are local VAD boundaries, not word alignment or provider confidence.

## Deferred physical integration

The verified host boundary accepts an HTTP upgrade URL (`https` external counterpart of the configured WSS URL). Twilio documents URL/trailing-slash caveats; SDK validation and exact configured URL are tested locally. Actual reverse proxy URL reconstruction and real signed upgrade behavior require D-2 verification. Do not add a bypass if validation fails.

D-1 includes the exact serialized outbound request plan and a sealed call-creation implementation that always rejects physical dialing. A one-shot destination/purpose/expiry/max-one/no-retry grant is separately tested. Wiring an actual authenticated HTTP executor, public TLS listener and live Danish ASR port is a separately authorized D-2 step. No credential availability or UI action overrides the D-1 seal.
