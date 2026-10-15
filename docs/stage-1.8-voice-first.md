# Stage 1.8 — voice-first campaign interpretation

Known campaign-name orthography is no longer a reason to pause, enter precision mode or request a second transcription in the primary REALTIME INTERPRETER.

Ordinary Humza/Hamza and aPureBase/PureBase/a PureBase/a pure base map to stable campaign speech text. One-letter spelling variants of known campaign names also map to their canonical forms. This happens before semantic commitment, so a later spelling or tokenization revision of the same known name cannot invalidate an already spoken introduction or replay it. Unknown names are not generally inferred; explicit exact identity/spelling fields remain literal and use precision handling.

The translator receives canonical proper-name text plus campaign pronunciation guidance. Those names then reach the existing Isabella renderer as ordinary target text. No new voice, model, pronunciation dictionary, provider fallback or TTS configuration was introduced. This establishes text guidance and continuity, not an automatic certification of audible pronunciation.

Email contents, spoken contact fields, phone numbers, dates and consent wording remain consequential. Alias normalization excludes literal email tokens and stops at explicit contact/identity fields. A later critical field does not undo the canonicalization of an earlier ordinary introduction. Exact patient/doctor/legal/full-name requests require precision, including unknown names. Genuine changes to committed meaning still stop for review; the change does not accept arbitrary ASR revisions.

The primary recognizer no longer invokes whole-turn precision recognition just because a known campaign name differs in spelling. Exact-identity uncertainty can still use that path. Developer processing positions retain the original ASR in `recognizedSource`; normal interpretation/source display uses canonical campaign text. Raw ASR word counts and canonical interpretation word counts can differ when a split brand becomes one token.

Current lag still reports held source age. “Interpreter falling behind” warnings and backlog escalation now use downstream pending units rather than source text intentionally waiting for semantic/precision handling. A genuine translation/TTS backlog still warns; a name/identity precision wait alone does not.

Isabella's configured voice ID/model/settings, single-voice output enforcement, greeting prosody buffering, OpenAI models and Twilio boundary are unchanged.

Validation: **311 tests / 36 files passed**, plus `npm run lint`, `npm run typecheck` and `npm run build`. Regressions cover normal aliases, post-commit name/brand revisions, no spelling-only re-transcription, raw ASR retention, canonical translation/pronunciation instructions, literal/spoken emails, telephone/date/consent/exact identity precision, intentional waits without false warnings, genuine backlog warnings, and the existing Isabella-only/STOP tests. Paid APIs are mocked; no new paid or microphone test was run.

Retest: reload http://localhost:5173 in Chrome, choose LOCAL TEST / English → Danish and your microphone/headphones. Say “Hi, my name is Humza, and I'm calling on behalf of aPureBase.” Known minor ASR spelling variants should continue through translation without a spelling-only precision pause. Developer Mode shows raw ASR alongside canonical interpretation positions and verified Isabella voice events. Test contact details/consent separately; those should still use precision handling.
