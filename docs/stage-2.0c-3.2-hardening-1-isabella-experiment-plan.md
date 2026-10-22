# Minimal future Isabella A/B — proposed only

No new audio was generated. This is pronunciation/rendering optimization, not voice training or fine-tuning. No voice cloning or training data upload. Isabella remains gIfqD5jrnhkFu8ENVbXC, eleven_flash_v2_5, speed0.95; calibrated playback gain3.5573605757216837 and existing buffers/provenance stay unchanged.

One proposed new request, 96 characters. It is NOT authorized. Existing why-calling reference is A; B removes only the clause comma, seeking smoother connected speech. This may do nothing or worsen naturalness. Native listening decides, particularly whether the consonant in “sende” remains too strong. No phonetic misspellings are written to canonical text or production TTS. No paid generation is necessary to complete this automatic pass.

Canonical Danish (unchanged):
> Jeg ringer kun for at spørge, om aPureBase må sende dig relevant faglig information via e-mail.

Current spoken reference A:
> Jeg ringer kun for at spørge, om a Pure Base må sende dig relevant faglig information via e-mail.

Candidate B (96 characters):
> Jeg ringer kun for at spørge om a Pure Base må sende dig relevant faglig information via e-mail.

Exact hypothetical POST destination:
`https://api.elevenlabs.io/v1/text-to-speech/gIfqD5jrnhkFu8ENVbXC?output_format=pcm_24000`

```json
{"text":"Jeg ringer kun for at spørge om a Pure Base må sende dig relevant faglig information via e-mail.","model_id":"eleven_flash_v2_5","language_code":"da","voice_settings":{"speed":0.95}}
```

The proposed-generation-manifest.json contains canonical/spoken/plan hashes, existing asset hash, version, reason, request and character count. New bytes must receive a new version and exact hash; never bind a changed rendering to the old asset. Candidate is phrase/version-specific, no global d/g reduction.

Opening, consent-question, email-request, clarify and success-close reuse current exact references: zero additional candidates justified before focused listening. No dozens of variants, no new fillers, no consent-semantic rephrasing, no speed/model/settings change. Future alternatives requiring provider/model controls need separate review and authorization. The pinned Flash v2.5 Danish path does not justify injecting unsupported phonemes; see existing preserved official-capability audit. Reference documentation: https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/pronunciation-dictionaries and https://elevenlabs.io/docs/api-reference/text-to-speech/convert . No provider documentation is proof of audible quality.
