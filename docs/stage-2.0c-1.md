# Stage 2.0C-1 — business-authorized static Isabella pack and local playback

2026-10-18 · Asia/Karachi. Bounded local implementation only. No telephone integration, deployment, commit, push or PR. Stage 1.9.6 is preserved.

## Required status distinctions

| Status | Result and evidence |
|---|---|
| Wording frozen by business authorization | **YES** — exact supplied operational Danish, `stage-2.0c1-approved-1`; no stylistic rewrites, no invented dynamic values. This records the user's business authorization, not an independent legal/native-language certification. |
| Generated asset verified | **YES** — 26 static phrase bindings backed by 25 unique new ElevenLabs recordings. Exact text/byte hashes, voice/model/speed, authenticated-request receipt, strict decoded PCM validity, duration and clipping checks retained. Generation success alone was insufficient. Status is `GENERATED_VERIFIED_LOCAL_ONLY`, never production-approved. |
| Offline playback verified | **YES** — all 25 unique recordings decoded and completed real local Web Audio playback. The identical “Er det korrekt?” alias shares that verified file. Source `ended` events, frame/rate/context proof, hashes and output gain/peaks are retained. Not a telephone/DAC/acoustic measurement. |
| Mocked consent flow verified | **YES** — requested A–K logical branches and L binding rejection rehearsed, with additional actual local question/refusal/clarification/barge-in checks. Success and corrected-address readback use explicit mock operator readback. Named intermediary completion is a mock template test only. |
| Physical telephone behavior verified | **NO — NOT YET VERIFIED.** No calls, phone media, live microphone, ASR provider or physical recipient tests were run. |
| Production deployment authorized | **NO — NOT AUTHORIZED.** The adapter loads only loopback-local cached asset paths. No deployment or telephone integration was started. |

The normal selector has only `APPROVED_PRERECORDED`, `HUMAN_TAKEOVER`, `NO_RESPONSE`. It has no unrestricted generative-response branch. Existing Stage 1.9.6 remains a manually started fallback.

## Exact provider usage

- **25 successful ElevenLabs generations**, **1,847 characters** in successful acknowledged requests.
- **26 attempted request payloads / 1,957 characters** including the first failed 110-character opening network attempt in the sandbox. That attempt returned `fetch failed`, with no provider completion/receipt. It was retried once using the authorized network path. Its possible billing cannot be independently inferred from the absence of a receipt.
- 26 static phrase IDs map to 25 files: `email-correction-confirm` reuses the **same exact text** and same bytes as `email-confirmation-question`; this is an explicit binding alias, not another generation or a reused Stage 1 demo.
- Four `[NAVN]` templates were never submitted. No email address, speculative name, OpenAI request, live stress test or phone call was submitted.
- Valid assets were not regenerated. The durable manifest journal is written before each attempt; the generator skips verified existing assets and has no automatic paid retry loop. Its failed-attempt retry is explicit. Do not rerun it for further generations without checking that journal.

Voice: Isabella, `gIfqD5jrnhkFu8ENVbXC`. Model: `eleven_flash_v2_5`. Requested speed: **0.95**, set in the individual generation request without changing environment/configuration. Language `da`, provider PCM 24 kHz signed 16-bit mono, wrapped in WAV. The approved generation parameters follow the [official ElevenLabs conversion API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).

The original Stage 1 generator was not run: it can also call OpenAI and write demo assets. This stage has its own tightly scoped generator. No credential was printed or included in the manifest. Request IDs and SHA-256 of nonsensitive voice settings are retained; voice provenance means configured identity and authenticated provider response plus byte binding, not biometric voice recognition.

## Frozen inventory and binding

Scope remains **`apurebase-professional-information-by-email-v1`**: professional information, send, email, identified target HCP directly or through an explicitly authorized intermediary. No extra purpose/channel, consent activation rule or eight-day timer was added.

The B-2 definition remains versioned and keeps its single canonical question. The new business-authorized C-1 definition permits **five exact consent-critical complete question forms**: direct, clarification, uncertain-consent, already-receiving, and the named intermediary template. Each is exact-text/version/hash and recipient-role bound. The named form has no static asset and cannot complete actual local playback. Direct variants cannot arm an intermediary's window. Playing any question never grants authority or affirmative consent.

Nonquestion explanations (`why-calling`, `send-first`, `repeat-prefix`, etc.) never arm consent, even if they discuss permission. `already-receiving` never assumes existing permission; it still needs a new owned final YES and separate review.

| Phrase ID | Exact Danish | Consent-critical | Static asset / dynamic |
|---|---|---|---|
| opening | Hej, det er Isabella fra aPureBase. Jeg ringer ganske kort vedrørende faglig information til sundhedspersoner. | false | STATIC |
| purpose | Vi sender relevant faglig information om blandt andet sygdomsområder, produkter og medicinske opdateringer. | false | STATIC |
| consent-question | Må aPureBase sende relevant faglig information til dig via e-mail? | true | STATIC |
| email-request | Tak. Hvilken e-mailadresse må vi sende informationen til? | false | STATIC |
| email-readback-intro | Jeg gentager lige e-mailadressen for at være sikker. | false | STATIC |
| email-confirmation-question | Er det korrekt? | false | STATIC |
| success-close | Perfekt, mange tak for din tid. Du kan altid framelde dig igen. Hav en god dag. | false | STATIC |
| refusal-close | Det er helt i orden. Tak for din tid, og hav en god dag. | false | STATIC |
| receptionist-target-request | Jeg ringer vedrørende faglig information til [NAVN]. Kan jeg tale med vedkommende? | false | DYNAMIC NAME — no recording |
| authority-ask | Må jeg lige bekræfte, at du er bemyndiget til at håndtere dette på vegne af [NAVN]? | false | DYNAMIC NAME — no recording |
| intermediary-consent-question | Tak. Må aPureBase sende relevant faglig information via e-mail til [NAVN]? | true | DYNAMIC NAME — no recording |
| identity | Jeg hedder Isabella og ringer fra aPureBase. | false | STATIC |
| about-apurebase | aPureBase formidler relevant faglig information til sundhedspersoner. | false | STATIC |
| explanation | Det kan blandt andet være information om sygdomsområder, produkter og medicinske opdateringer. | false | STATIC |
| why-calling | Jeg ringer kun for at spørge, om aPureBase må sende dig relevant faglig information via e-mail. | false | STATIC |
| unsubscribe | Ja. Du kan altid framelde dig igen, hvis du ikke længere ønsker at modtage informationen. | false | STATIC |
| repeat-prefix | Selvfølgelig. Jeg gentager lige spørgsmålet. | false | STATIC |
| clarify | Selvfølgelig. Må aPureBase sende relevant faglig information til dig via e-mail? | true | STATIC |
| callback | Det forstår jeg. Hvornår vil det passe bedre, at vi ringer igen? | false | STATIC |
| callback-close | Selvfølgelig. Vi ringer igen på et senere tidspunkt. Tak for din tid. | false | STATIC |
| wrong-person-close | Beklager. Kan du hjælpe mig med at komme i kontakt med [NAVN]? | false | DYNAMIC NAME — no recording |
| target-unavailable | Det er helt i orden. Hvornår vil det være bedst at ringe igen? | false | STATIC |
| send-first | Vi skal først have din tilladelse, før vi sender informationen via e-mail. | false | STATIC |
| uncertain-consent | Det er helt i orden. Jeg skal bare have et tydeligt ja eller nej. Må aPureBase sende relevant faglig information til dig via e-mail? | true | STATIC |
| already-receiving | Tak. Jeg skal stadig bekræfte din tilladelse. Må aPureBase fortsat sende relevant faglig information til dig via e-mail? | true | STATIC |
| email-correction-prefix | Tak. Jeg retter den. Jeg gentager den nye e-mailadresse. | false | STATIC |
| email-correction-confirm | Er det korrekt? | false | STATIC |
| more-explanation | aPureBase sender faglig information, som kan være relevant for dit arbejde som sundhedsperson. Det er frivilligt, og du kan altid framelde dig igen. | false | STATIC |
| stop-contact-close | Det forstår jeg. Tak for din tid, og hav en god dag. | false | STATIC |
| thank-you | Perfekt, tak. | false | STATIC |

[The audio manifest](stage-2.0c-1-audio-manifest.json) contains every static phrase ID, wording version, exact Danish, UTF-8 text SHA-256, WAV-byte SHA-256, path, voice/model/speed, timestamp, duration, sample count/format, receipt and media/provenance verification. `inventory.ts` also pins hashes for the four unrecorded templates. `assetPack.ts` embeds the independently checked asset bindings in the local bundle, so changing a served WAV or manifest metadata cannot silently replace the compiled expected bytes.

Any changed text/version/audio bytes, wrong voice/model/speed, invalid provenance, truncation, invalid format, silence, duration mismatch or clipped source PCM is rejected. Future business text/version changes require renewed asset binding and verification; they do not inherit old approval.

## Preserved state and consent safeguards

Exactly 22 states remain:

`ANSWERED`, `RIGHT_PERSON`, `RECEPTIONIST`, `BUSY`, `PURPOSE_REQUEST`, `EXPLANATION_REQUEST`, `CONSENT_ASK`, `CONSENT_YES`, `CONSENT_NO`, `CONSENT_UNCLEAR`, `EMAIL_REQUEST`, `EMAIL_GIVEN`, `EMAIL_CONFIRM`, `QUESTION_KNOWN`, `QUESTION_UNKNOWN`, `CALLBACK`, `HUMAN_TAKEOVER`, `END_SUCCESS`, `END_REFUSED`, `END_OTHER`, `AUTHORITY_CHECK`, `WRONG_PERSON`.

HCP identity verification remains mandatory. Intermediaries require the original current explicit authority evidence and a separately named operator attestation referencing it; selecting/playing the authority clip does not satisfy either. UNKNOWN is never eligible. Recipient/authority changes invalidate dependent evidence. Refusal is never an invitation to persuasion; reviewed NO closes through the refusal branch and blocks new automated question solicitation. Uncertain ASR, unsupported/low-confidence meaning, legal/privacy/medical/product-clinical questions, complaints and requests for a human route to takeover.

The original deterministic consent conditions remain: final source text, narrow complete-utterance affirmative lexicon, exact current scoped question, matching recipient revision and role, COMPLETED playback, known onset **strictly later** than completion, matching onset-captured playback ownership, one finalized utterance per window, then separate operator review. No ambiguous YES inference, transcript correction or script matching was introduced. The guard's expected question is supplied only from the validated frozen definition; its default B-2 behavior still passes all previous tests.

## Actual local playback boundary

`LocalPrerecordedPlayback` is lazy. Mount/constructor does not load a media file, start AudioContext, acquire microphone/ASR or make a provider request. Explicit local play fetches only `/audio/consent-stage20c1/<text-hash>.wav` on loopback, verifies bytes and frozen metadata, decodes the actual WAV in the browser, and renders a **copy** through the unchanged calibrated gain helper. Original receipt-bound bytes are preserved.

Lifecycle: NOT_STARTED → QUEUED → PLAYING → COMPLETED, or INTERRUPTED/FAILED. Records retain call/playback/phrase/version/textHash/assetHash/recipient revision, all lifecycle timestamps, mode, completionSource, output proof and gain diagnostics. COMPLETED comes only from the noncancelled Web Audio buffer source's `ended` event while its context is running. File load, decoding, insertion, start, elapsed duration, and returned Promise resolution cannot arm the window. The Promise waits for events and is not the evidence signal.

The session independently checks the compiled expected asset hash, exact current phrase/version/text hash and recipient revision. A completion proof must own the same playback ID. Stale or duplicate callbacks cannot create another window. Mock controls are rejected for real local records. Cancel during fetch/decode/output, skip, repeat, changed identity or speech onset stops/invalidate output; a later `ended` callback from `stop()` cannot masquerade as successful completion.

The golden sequence can play opening → purpose → direct question after identity verification. It **stops at the question and waits**, without appending the YES follow-up or any other sentence. The follow-up is selected only after incoming final evidence and explicit operator review. Barge-in onset is captured before final transcript arrival and immediately interrupts output. The delayed final retains its first onset's playback owner.

Web Audio `ended` is a browser rendering/media boundary, not proof of physical loudspeaker/DAC/phone output. No estimated-delay timer hides that limitation. Future phone media requires its own real output completion proof and clock alignment. No new buffers/jitter policy were introduced.

## Dynamic values and honest automation limits

The four named phrase templates explicitly retain `[NAVN]` and `dynamicValues: ['NAME']`. There is no generated speculative name, pronunciation, concatenated static name fragment or invented recipient identifier. Source transcripts remain literal. No target name was provided in these rehearsals; a missing name remains unresolved. Email raw transcript, literal candidate, optional explicit normalization review, readback, recipient confirmation, previous-candidate audit and correction lineage remain preserved by the existing workflow.

**There is currently no approved dynamic name/email speaking mechanism.** The actual local selector routes those steps to HUMAN_TAKEOVER. In particular:

- A/J can reach END_SUCCESS only in **mock readback rehearsals**. The real local automated path accepts the reviewed YES and literal address, then hands over for exact email readback. It is not a complete autonomous successful call.
- E remains ineligible without authority. F's positive ownership/authority test uses the unrecorded named template in **mock mode only**. Actual named intermediary playback is blocked before any file/provider request and recommends takeover.
- D's named receptionist/transfer portion and H's named wrong-person request also remain dynamic; no named speech was produced.

The local adapter additionally blocks actual success/confirmation playback that would rely on a mock-only dynamic email readback. Independent asset QA may play these static recordings without creating any consent window; that does not establish a successful call.

ASR's existing Danish adapter is retained and can feed transcript evidence, but no ASR provider/microphone session was authorized or run here. Browser input was literal manual transcript evidence with simulated speech-onset markers. Automatic approved-response selection after final input is implemented; identity, authority and consent review are still operator-controlled. No physical ASR accuracy or telephone call-time claim is made.

## Durations: decoded media plus explicit assumptions

Static durations come from the actual verified decoded recordings. Recipient response seconds and 0.05-second transition allowances are **model assumptions**, not measurements. Dynamic values, transfer waits and human conversation remain null/unresolved. No telephone latency is fabricated. A known subtotal is not a complete call duration.

| Path | Static speaking seconds | Assumed recipient response seconds | Assumed transitions seconds | Known subtotal seconds | Complete modeled total |
|---|---:|---:|---:|---:|---|
| A: Straight direct HCP YES + email | 31.068 | 12.000 | 0.350 | 43.418 | UNRESOLVED — dynamic/human portion |
| B: Direct HCP NO | 22.384 | 5.000 | 0.200 | 27.584 | 27.584 s |
| C: One clarification then YES | 36.223 | 15.000 | 0.400 | 51.623 | UNRESOLVED — dynamic/human portion |
| D: Receptionist to doctor to YES | 31.068 | 15.000 | 0.350 | 46.418 | UNRESOLVED — dynamic/human portion |
| E: Authorized intermediary YES | 26.749 | 13.000 | 0.300 | 40.049 | UNRESOLVED — dynamic/human portion |
| F: Busy/callback | 14.629 | 6.000 | 0.150 | 20.779 | 20.779 s |
| G: Human takeover trigger | 7.198 | 3.000 | 0.050 | 10.248 | UNRESOLVED — dynamic/human portion |

The A known subtotal (43.42 s) and C known subtotal (51.62 s) are consistent with the requested ordinary targets before unresolved dynamic speech. They do **not** prove 30–60-second successful automation. No known static/assumed subtotal exceeds 90 seconds; unresolved totals cannot be certified below 90. Short refusal/busy paths were not lengthened to reach 30 seconds. See [the complete duration report](stage-2.0c-1-duration-report.json).

## Browser results

| Scenario | Result |
|---|---|
| A direct YES/email/success | Mock end-to-end PASS. Actual opening/purpose/question completed, stopped and waited; later manual YES became a candidate with VERIFIED_OUTPUT_ADAPTER proof. Actual email step correctly reached HUMAN_TAKEOVER. |
| B refusal | Mock PASS; actual completed local question → manual NO/review → actual refusal close → END_REFUSED. |
| C playing question + speech | Mock PASS; actual local playback was interrupted at simulated source onset; final YES remained UNCLEAR. No completion/window was fabricated. |
| D MAYBE → fresh question → YES | Mock PASS; actual complete clarification asset → new owned manual YES candidate with verified local completion proof. |
| E receptionist/no authority | PASS — YES disabled/ineligible; no email capture. |
| F authority + intermediary question | Mock authority/ownership PASS; actual named speech BLOCKED and HUMAN_TAKEOVER recommended because its dynamic asset does not exist. Not claimed as actual completed intermediary audio. |
| G unsupported/legal/privacy/medical | PASS — HUMAN_TAKEOVER; existing interpreter remains manual-start fallback. No generated persuasive answer. |
| H wrong person | PASS — identity/consent ineligible; named response requires HUMAN_TAKEOVER. |
| I busy/callback | Mock PASS → END_OTHER; no consent. |
| J corrected email/readback | Mock PASS with new exact candidate/readback/confirmation; original address remains in audit. Actual dynamic readback remains a takeover step. |
| K stale/delayed YES | PASS — original onset owner cannot attach to repeat's new playback/window. |
| L altered text/version/bytes | PASS on actual local bytes; all three variants rejected without modifying originals. |

All 25 unique recordings also completed actual local asset QA: **zero clipping, zero peak-protection events**, unchanged requested/effective calibrated gain **3.5573605757216837**, maximum observed post-gain PCM peak **0.9076247811**. Browser decoding resampled to the output context's 48 kHz; exact duration and source bytes were checked first. No subjective native-pronunciation or physical acoustic quality certification is claimed. The 25 recordings contain 114.149 s of unique static speech total; this was one bounded local pack verification, not a provider stress test or an intended call length.

Detailed evidence: [browser rehearsal](stage-2.0c-1-browser-rehearsal.json), [local media QA](stage-2.0c-1-local-playback-qa.json), mock success and actual question screenshots. All these are local evidence; physical telephone behavior remains unverified.

## Validation and preservation

- **316 focused tests in 6 files**, including all 223 previous cases plus 93 C-1 cases.
- **945 full-suite tests in 71 files pass.** Existing provider interactions in tests are mocked; loopback HTTP access was needed by the old server tests.
- lint, typecheck, build, git diff --check pass. New/untracked text files also receive explicit whitespace checks.
- Build retains Vite's nonfatal >500 kB chunk warning; final byte sizes are in the validation log. No performance or deployment claim follows from build success.
- **202 existing source/server/public/test files hashed before editing. 181 protected files unchanged.** All Stage 1.9.6 source/backend files, public baseline assets, interpreter configurations, `src/main.tsx`, and non-consent tests remain byte-identical. No .env, model, gain, speed, jitter or buffer configuration was edited.
- Only six existing consent implementation files changed; no previous test was weakened or removed. The entire pre-existing dirty non-consent tracked patch remains unchanged. Exact hashes/new-file paths: [preservation audit](stage-2.0c-1-preservation.json).

## Exact code and asset changes

Modified existing consent files:

- `src/consent/definition.ts`
- `src/consent/consentGuard.ts`
- `src/consent/types.ts`
- `src/consent/ConsentWorkspace.tsx`
- `src/consent/session.ts`
- `src/consent/handoff.ts`

Added implementation, tests and offline generation tooling:

- `scripts/stage20c1-finalize.ts`
- `scripts/stage20c1-generate.ts`
- `src/consent/approved/AssetPanel.tsx`
- `src/consent/approved/assetPack.ts`
- `src/consent/approved/assets.ts`
- `src/consent/approved/definition.ts`
- `src/consent/approved/inventory.ts`
- `src/consent/approved/localPlayback.ts`
- `src/consent/approved/selector.ts`
- `tests/consent-stage20c1.test.ts`

Added **25 WAV files** under `public/audio/consent-stage20c1/`, named by exact UTF-8 text hash; every exact path is enumerated in the audio manifest and preservation audit. No existing Stage 1 recording was overwritten. Added the six required `docs/stage-2.0c-1*` deliverables plus local playback QA and screenshot evidence; the preservation audit enumerates the final exact file list. `dist/` is an ignored local build output, not a deployment.

## Remaining work and stop

No telephone transport, Twilio media adapter, carrier completion marks, physical duplex/onset clock validation, actual clinic ASR test, production routing, authenticated consent storage, CRM/email sender, bounce reporting, suppression service or automated activation exists in C-1. The prior single-opt-in/eight-day effective-consent timing questions remain unresolved; none was inferred from these approved response phrases.

Next work requires explicit authorization and a safe dynamic-value speaking/readback design, followed by physical local/telephone verification of completion, source onset, interruption, acoustic behavior, authority identity and call duration. Real named intermediary/email speech cannot be declared complete from mocks. Keep the interpreter fallback, audited literal values and precision/consent review safeguards. **Do not automatically begin telephone integration, extra TTS generation or deployment.**
