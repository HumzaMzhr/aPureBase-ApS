# Stage 2.0C-3 — physical local acceptance and telephony-readiness gate

2026-10-18. **NOT ACCEPTED.** The implementation and automated gate are complete. Physical Danish listening, actual microphone/ASR accuracy, physical barge-in and natural call duration require the human operator. No telephone integration, call, deployment, commit, push or PR occurred. Stage 2.0D has not begun.

Open the ready workspace: **http://127.0.0.1:5173/consent-call?stage=2.0c3**. The unchanged backend and the cache gateway on port 5180 are running. Health reads returned HTTP 200, recognition is configured, and existing interpreter audio was present. Health is not a provider recognition test. No microphone permission prompt or ASR session was initiated autonomously.

## Results, separated by evidence level

| Evidence level | Result |
|---|---|
| AUTOMATED TESTED | **PASS — 38 C-3 tests / 2 files; 1,013 full tests / 74 files**. All 975 C-2 baseline tests remain unchanged. Lint, typecheck, build and diff-check pass. |
| LOCAL WEB AUDIO VERIFIED | **PASS, technical smoke only** — three real source-ended completions: standalone static opening, standalone cached underscore/plus email, and rehearsal opening. No synthetic completion marker. No clipping or peak protection in these three outputs. |
| PHYSICAL HUMAN LISTENING VERIFIED | **NOT_TESTED** — zero human approvals/rejections. No claim of audible Danish quality, speaker/headphone routing, consistent perceived volume or absence of acoustic distortion. |
| MICROPHONE / ASR VERIFIED | **NOT_TESTED** — actual capture/provider runs: zero. Capture, VAD ownership, endpointing, failure and delayed-final behavior are tested with injected ports only. |
| TELEPHONE VERIFIED | **NOT_TESTED** — no telephone adapter implementation, telephone media, Twilio account integration, or calls. The transport contract and cancellation/completion ledger pass automated tests only. |
| NATURAL 30–90 SECOND CALLS | **NOT_TESTED** — no ordinary successful physical rehearsal exists; median/p95/min/max are null with n=0. C-2 modeled times were not reused as C-3 acceptance evidence. |

The technical browser smoke used one explicitly labelled **manual simulation** of “Hvad koster det?” after actual opening playback. It reached HUMAN_TAKEOVER, preserved call/turn evidence, and opened the unchanged interpreter panel. That panel showed waiting-for-pairing and disabled START INTERPRETER. It explicitly stated that pairing/start require operator actions and no phone transport was transferred. The interpreter was not paired or started. This demonstrates UI/control integration, not physical live takeover.

The manual smoke retained its actual **57.898-second raw wall time**, **7.198-second Isabella media**, and unknown physical recipient duration. That interval includes tool/operator inspection time without explicit pause markers. It is not a representative business call, successful ordinary call, or physical duration pass. It remains in the artifacts rather than being discarded.

## Physical listening workspace

The Recording selector contains **37 existing recordings**: all **25 unique C-1 static WAVs**, four cached EMAIL examples and eight cached NAME examples. The identical “Er det korrekt?” alias shares the original byte/text identity, so it does not require a 26th static recording.

Independent states remain visible:

- `GENERATED_VERIFIED`: pinned text, exact WAV bytes, media validity and Isabella provenance verified.
- `LOCAL_WEB_AUDIO_COMPLETED`: uncancelled running WebAudio source emitted its actual ended event.
- `NOT_REVIEWED`, `HUMAN_LISTENING_APPROVED`, `HUMAN_LISTENING_REJECTED`: independent explicit human decisions.

REPLAY/LISTEN, APPROVE, REJECT and NOTE controls are present. Approval requires a completed bound output, a named reviewer and the explicit physical-listening attestation. Rejection requires a note. Completion, decoding, HTTP/TTS success and Promise resolution never approve audio. The agent did not click the physical-listening attestation or either human decision button.

Each review retains phrase/slot, exact Danish, available English meaning, text/audio SHA-256, voice/model/speed, requested gain, observed effective gain and peak protection, reviewer/decision/time/note, playback ID and local output proof. Review identity is exact audio/text/voice/model/speed/gain-policy bound. Local browser storage preserves reviews and transcript/timing archives; export retains the history. Storage/retention failures are visible and stop further test controls instead of evicting evidence silently.

A rejected recording is blocked from call rehearsal and the future telephone listening gate. Unreviewed audio is also blocked from future production eligibility. An isolated QA replay remains possible to inspect a rejected recording, but replay cannot undo the rejection. Replacement generation is never automatic. The note and remediation recommendation remain in the audit. Human approval is necessary listening evidence, **not** production enablement; all manifests remain production-unapproved. Future authenticated approval storage and transport authorization remain outside C-3.

Standalone QA is blocked during an active call rehearsal or while the interpreter panel is open. QA audio must not intervene in an open consent answer window. Rehearsal output never uses a fake completion marker.

## What the human must assess

For every clip and full call sequence: natural Danish Isabella voice; comprehensible static wording; exact email letters and separators; name pronunciation; natural joins; static/dynamic volume consistency; clipping, distortion and unnatural silence; suitability for a short business call. The existing examples include @, dot, hyphen, underscore, plus and digits 2/3/7. They do not physically validate every digit/letter or every future name.

**Uppercase indication is BLOCKED by a missing cached example.** No uppercase EMAIL asset exists. No request was made. The exact proposed additional slot is:

- Literal candidate: `Anna@clinic.dk`
- Exact deterministic Danish TTS input: `stort a, en, en, a, snabel-a, se, el, i, en, i, se, punktum, de, kå`
- Reason: physically assess the uppercase cue, which cannot be heard in the lowercase-only frozen examples.
- Authorization: **not provided; do not generate automatically**. This is a separately reported missing-asset item, not permission to replace an existing clip.

## Exact operator procedure

1. Open the C-3 URL above on this Mac. Use the same browser/origin throughout so the review archive remains available. If the in-app browser cannot supply microphone access, use a normal supported browser at the same URL and record the limitation; no microphone pass may be inferred from a permission checkbox.
2. Connect the actual output device. Enter the human reviewer's name. In section 01, select each of the 37 recordings, press REPLAY/LISTEN, physically listen, and assess the quality checklist. Only then tick the physical-listening attestation and APPROVE or REJECT. Enter a rejection reason. Export periodically. Do not approve sounds you did not hear or a language quality you cannot assess.
3. Complete standalone listening before starting a call rehearsal. For actual ASR/barge-in tests use **headphones** to reduce loudspeaker echo into the microphone. This is an experimental local VAD bridge; acoustic echo could otherwise interrupt Isabella herself.
4. In section 02 choose scenario A–R and Start/archive previous rehearsal. Check the headphones declaration, then explicitly press **Start microphone + Danish ASR (provider usage)** and grant actual browser/macOS microphone access. Provider usage begins here. Confirm actual capture/recognition events appear; a checkbox or a start request alone is insufficient.
5. Play/Approve opening. Then verify the target doctor or intermediary with an operator evidence reason. Names use the supplied **synthetic Anna Jensen contact fixture** for these rehearsals, not invented real contact data. Authority requires the retained explicit claim plus a separate named operator attestation. Rebind the name after a changed recipient/authority revision.
6. Continue using Play/Approve and the scenario's instructions. Speak naturally, without exaggerated pauses. For ordinary consent, wait for the complete question before answering. For M/N intentionally begin speech during output/before completion. Observe immediate INTERRUPTED, no completion/window, and no eligible YES. For safe intermediary retry, approve the new whole question and give a new answer after it ends; old/delayed YES must remain blocked.
7. After an eligible explicit final YES, independently review YES with a reason. Read back only the captured literal email candidate; review any normalization separately. The exact dynamic address and static “Er det korrekt?” must complete before a new owned recipient confirmation and operator approval can close success. Correction must clear the old readback/confirmation and rebuild from the new literal candidate. If ASR does not produce a usable literal email, retain the failure/takeover; do not repair the transcript to force a pass.
8. Mark debugging pauses explicitly **between turns with microphone/output stopped**. Raw wall time continues regardless. If recognition stops or fails, the current run takes over rather than silently reattaching source ownership to a restarted socket. Start a new archived rehearsal for a new recognition connection.
9. For takeover scenarios, verify automation stops and the audit remains. Open the existing interpreter panel if needed. It still requires its normal manual pairing/start; do not call it seamless telephone transfer. Reloading the acceptance page archives the retained current run and returns to standalone listening; do not reload mid-conversation to conceal a failure.
10. After each scenario, inspect raw transcript/VAD/onset/owner events. The offline reference field scores a retained provider final only; reference text is never sent to recognition. Record observed recognition errors. Record explicit physical facet results with reviewer and note; `NOT_TESTED` is a valid result.
11. Run **all A–R**, not just successful examples. Do not remove slow or failed attempts. Export **C-3 acceptance evidence** and provide that JSON for forensic assessment. Stop before any new TTS asset, telephone test or Stage 2.0D action.

The scenario selector prepares A direct YES/email, B NO, C why-calling, D explanation, E unclear, F repeat, G already receiving, H receptionist transfer, I wrong person, J authorized intermediary, K busy/callback, L correction, M interruption, N early speech/delayed final, O unsupported question, P privacy/legal/medical, Q human request and R ASR uncertainty. All **physical results remain NOT_TESTED** in the delivered scenario matrix.

## Recognition and barge-in implementation

C-3 reuses **unchanged** `IsolatedMicrophone`, PCM worklet, `DanishTranscriptAdapter`, continuous-transcription client and server gateway. It adds its own `PhysicalRecognition` bridge without changing Stage 1.9.6 files or recognition configuration. The C-3 workspace must use port 5173 because the existing gateway's origin/host protections are unchanged.

Actual microphone PCM remains transient: mono PCM16/24 kHz, existing 100 ms worklet frames, no source WAV/MediaRecorder/permanent audio storage. Capture settings/frame clocks and source partial/final history are retained as metadata/text. C-3-only local VAD uses RMS ≥0.012 and an 800 ms observed-silence endpoint. These are explicit local test boundaries, not provider acoustic alignment or calibrated confidence. Provider confidence is reported **null/unavailable**, distinct from the deterministic classifier's rule score.

At the first voiced frame the bridge captures call ID, stable turn/generation ID, recipient revision, local microphone onset and the current playback owner, and immediately delivers an empty partial to the existing session. This cancels queued/preparing/playing output before final text arrives. Source-end/commit is recorded separately. Provider partial/final retains that generation's original onset/owner even after a repeat; no local correction or name/email hint is sent to recognition. Late/duplicate source finals remain bounded/deduplicated. Missing onset fails closed.

The frozen consent guard is byte-identical: verified current recipient/authority, exact scoped text/hash/version, actual completed output, known strictly subsequent onset, matching first-onset playback owner, final narrow affirmative, no invalidation and separate operator review. Partials, silence, okay/thanks/maybe/questions and early/delayed/wrong-owner YES cannot bypass it.

The C-3 retry selector fixes the C-2 interrupted-intermediary stall: current explicit authority, no fallback reason, a conservative final affirmative/ambiguous rule result and an allowed named question permit **operator approval of a fresh complete question**. The interrupted question stays ineligible. Insufficient/invalidated authority or unsupported/uncertain meaning recommends HUMAN_TAKEOVER. Repeat-request wording is a narrow deterministic route only; it does not broaden affirmative consent.

## Duration reporting

`stage-2.0c-3-duration-report.json` has separate median/p95/min/max/n statistics for ordinary successful rehearsals, microphone-only ordinary successes, every requested category and terminal outcome. Every attempt remains listed. Refusal, busy/callback, takeover, interrupted, correction and intermediary are separate; slow successes remain in the ordinary-success cohort.

Media duration uses actual completed Isabella media frames and observed start/cancel bounds for partial interrupted output, plus actual microphone local-VAD speech intervals. Component sums and observed interval union remain distinct during overlap. Manual/mixed input has **null physical recipient/media total**, not an invented speaking duration. Wall time is start of actual opening output → terminal state. Missing opening yields null wall time and a visible missing-opening count. Explicit debug pauses are separately identified; they are never subtracted from raw target-assessment statistics. A secondary raw-minus-explicit-pauses field is labelled diagnostic only.

Current physical ordinary-success n=0, so all four statistics are null. The synthetic automated duration regression deliberately retains a 150-second slow success in p95/max; it is a test fixture, not a physical result. No padding, speed change or C-2 modeled duration substitution occurred.

## Telephone adapter readiness — contract only

`TelephoneMediaAdapter` defines callConnected, incomingAudio, speechStarted/Ended, transcriptPartial/Final, queueOutput, outputStarted/Completed/Interrupted/Failed, hangup and transferToHuman. Bindings retain call/stream/playback/phrase/version/text+audio hashes, recipient revision, epoch and clock. Queue Promise resolution is submission only. Only a real transport render-boundary event with exact binding, known playing state, unique provider event/mark, aligned clock and uncleared disposition can complete output. Duplicate, late-after-cancel, wrong revision/hash/epoch, failure, and HTTP/TTS/ACK substitutes fail closed. The local listening eligibility gate blocks unreviewed/rejected bytes. No transport instance exists or is started.

For Stage 2.0D, Twilio bidirectional Media Streams supplies media/mark/clear. A returned mark can mean buffered audio finished **or was cleared**; a cancelled/cleared mark must never arm consent. Its outbound media format is raw headerless μ-law/8 kHz, requiring separately verified conversion from the retained 24 kHz originals. Preserve the originals and explicitly validate telephone quality and timing. These protocol facts are from [Twilio's official WebSocket message documentation](https://www.twilio.com/docs/voice/media-streams/websocket-messages).

A future transport must provide authenticated call/stream/event identities, unique epoch-scoped markers, cancellation/clear bookkeeping, ordered sample boundaries, timestamp/clock uncertainty, backpressure/failure handling, privacy-safe ingress/egress and explicit transfer confirmation. Never infer output-start time from a submission ACK when transport evidence is absent. Even a valid render marker is not proof of human comprehension or physical endpoint acoustics; Stage 2.0D needs its own physical telephone verification. Actual telephone verification is NOT_TESTED, while **contract readiness is automated PASS**. No Twilio SDK/account/configuration or telephone endpoint was added.

## Automated coverage and remaining limits

38 focused tests cover review-state separation, completed/uncancelled proof, rejection/production gates, cache-only miss/new uppercase exact text, cached metadata pinning, alias identity, durable review binding, intermediary retry/no-authority, stale repeated/delayed owner, partial YES then final NO, incomplete/wrong owner/wrong recipient revision, mid-call authority invalidation, changed email, immediate onset interruption and late completion, ASR failure/permission failure, raw source timing, takeover preservation, media/wall/pause statistics, slow-call retention, word scoring and telephone completion/clear/duplicate/failure contracts. Two view tests confirm lazy mount does not acquire microphone, AudioContext or providers, all 18 cases are present and human actions remain explicit.

Full **1,013 tests / 74 files pass**, preserving all 975 existing tests. Lint/typecheck/build/diff-check pass. Build retains the existing nonfatal >500 kB JS chunk warning. This is not a physical latency claim.

Source/local storage reviews are local self-attestations, not authenticated production consent or legal authority. Real environmental VAD sensitivity, echo, endpoint segmentation, Danish ASR literal-email behavior, pronunciation, joins, perceived volume and natural call time are still unknown. Browser/OS microphone denial/disconnection must be retained as a failure/blocker. A recognition restart takes over rather than guessing continuity. No automatic review or acceptance promotion occurs.

## Provider usage / preservation / exact changes

**C-3 new requests: TTS 0, ASR 0, telephone 0; new provider cost 0.** The historical dynamic journal stayed at 12 TTS attempts/12 verified assets. All 25 C-1 and 12 C-2 WAVs were read/verified, not regenerated or rewritten. No provider stress tests occurred. Future human-started ASR is billable and remains untested.

The baseline is the actual dirty C-2 working tree, not Git HEAD. Before editing, **377 existing files** were fingerprinted, including source/server/public/tests, scripts, historical reports and root configuration. **375 remain byte-identical**. All Stage 1.9.6 source/backend, shared recognition/gain/voice/configuration, all 25 C-1 WAVs and every C-1/C-2 historical report/evidence remain unchanged. No old test was edited. Unexpected modifications: zero. Exact before/after hashes and every added file are in `stage-2.0c-3-preservation.json`.

Changed existing files (exactly two):

- `src/consent/ConsentWorkspace.tsx` — explicit C-3 route only; C-1/C-2 routing retained.
- `server/consentDynamic.ts` — cache-only flag/endpoint; the existing C-2 prepare path retains its default behavior.

Added implementation files:

- `src/consent/acceptance/Workspace.tsx`
- `src/consent/acceptance/acceptance.css`
- `src/consent/acceptance/catalog.ts`
- `src/consent/acceptance/listening.ts`
- `src/consent/acceptance/cachedPlayback.ts`
- `src/consent/acceptance/recognition.ts`
- `src/consent/acceptance/rehearsal.ts`
- `src/consent/acceptance/scenarios.ts`
- `src/consent/acceptance/store.ts`
- `src/consent/acceptance/timing.ts`
- `src/consent/acceptance/matrix.ts`
- `src/consent/acceptance/telephony.ts`

Added tests/tooling: `tests/consent-stage20c3.test.ts`, `tests/consent-stage20c3-view.test.tsx`, `scripts/stage20c3-report.ts`. The report tool reads local exports and files only; it cannot capture audio, call a provider or generate an asset.

Deliverables: this report, `stage-2.0c-3-validation.txt`, `stage-2.0c-3-acceptance.json`, `stage-2.0c-3-physical-rehearsal.json`, `stage-2.0c-3-duration-report.json`, `stage-2.0c-3-preservation.json`, and one material workspace screenshot. The physical-rehearsal artifact contains the local technical/manual smoke separately from the empty physical-results list.

**Next required action:** a human Danish/audio reviewer must perform the 37 listening reviews and A–R actual microphone/headphone rehearsals using the procedure above, then export the evidence. The uppercase example needs separate generation authorization before its physical review. C-3 remains **NOT ACCEPTED**; do not begin Stage 2.0D automatically.
