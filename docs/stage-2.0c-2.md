# Stage 2.0C-2 — Deterministic Dynamic Speech

Implementation and local evaluation report, 2026-10-18. **Not automatically accepted. No telephone/physical-call acceptance or deployment is claimed.**

The C-1 static pack remains the primary path. C-2 is available locally at `http://127.0.0.1:5175/consent-call?stage=2.0c2`; the existing C-1 workspace remains at `/consent-call`. An isolated loopback gateway on port 5180 supplies only declared NAME/EMAIL slots. No Stage 1 server, ASR, translation, voice configuration, buffers or models changed.

## What changed

Email speech comes only from the current guarded literal candidate. Every ASCII letter/digit and `. - _ + @` has one deterministic Danish token. Uppercase uses `stort`. There is no domain repair, inferred spelling, replacement dictionary, script matching, generic language model or sentence generation. Normalization still needs the existing independent operator review. Unsupported values take over.

Names fill only the four frozen `[NAVN]` templates. Exact original/rendered name, contact-record or retained verified-turn source, operator review, pronunciation attestation, phrase/version, recipient revision, text hash and audio hash remain bound in the review. Unsupported spelling or uncertain pronunciation takes over. A name provides no identity or authority entitlement. Authority changes invalidate prior name revisions; re-binding is explicit.

Identical rendered slots reuse a byte-verified private cache in `benchmarks/stage20c2-dynamic-cache/`. Metadata is rebound to the current evidence on every use. Gateway requests accept slot data, not arbitrary Danish response text. Cache keys include renderer/wording version and pinned voice/model/speed; a changed settings hash fails closed. Concurrent requests share generation; cancellation does not deliver stale output. All provider attempts are durably journaled before submission; no automatic paid retry occurs.

Dynamic audio uses the existing calibrated gain/peak-protection function. A successful TTS response, download, decoder result, source start or resolved Promise cannot establish delivery. Only the uncancelled running WebAudio source's ended event, with matching call/playback/text/audio/revision bindings, completes output. This is local-render proof, not evidence that a person heard a telephone call.

The existing consent guard retains exact scoped proposition, role/authority, completed playback, known strictly subsequent onset, captured playback owner, final transcript and separate operator review requirements. Rendered intermediary questions supply their exact bound text/hash to the same guard. Repeats and interruptions invalidate ownership.

Email sequence: operator approves the whole labelled sequence → existing static intro/correction prefix → exact dynamic address → existing static “Er det korrekt?” → fresh owned recipient confirmation → separate operator confirmation → approved static success close. Correction clears the old candidate and confirmation, retains audit/lineage, and requires the rebuilt sequence and new confirmation. Manual/mock readback attestations cannot qualify C-2 email confirmation.

The controller recommends an action without playing it. Consent-critical outputs still require Play/Approve. Wrong-person wording now leads to a transfer/identity-verification step in the C-2 definition; it does not itself verify the new recipient. The frozen C-1 definition remains unchanged.

## Evidence and acceptance facets

| Facet | Evidence | Limit |
|---|---|---|
| Static prerecorded audio | All 25 original WAV hashes preserved; complete existing C-1 regressions pass; reused in local browser paths | Existing business wording approval remains; no new telephone proof |
| Dynamic NAME generation | Eight generated fixtures: two synthetic contact names × four declared templates; exact text/byte/provenance verification | Synthetic fixtures are not actual customer contact data or native-speaker approval |
| Dynamic EMAIL generation | Four literal fixtures, including digits/dot/hyphen/underscore/plus; deterministic character mapping and cache verification | Audio pronunciation/comprehensibility needs human Danish listening review |
| Consent-critical completion | Exact dynamic question text/hash fed into unchanged consent guard; stale/partial/interrupted/delayed-owner tests | Local audio result is reported separately below |
| Interruption/barge-in | Pending generation and playing audio cancel; late events cannot arm consent; email revision change blocks old output | Physical microphone/telephone barge-in not tested |
| Stale evidence | Recipient/email revisions, repeat owner, first-partial owner, mismatched returned slot and normalization regressions | No inference from TTS/cache success to authorization |
| Authority | Explicit retained claim and separate operator attestation still mandatory; no-authority question delivery rejected | Software attestation is not a legal authority determination |
| Duration | All 42 eligible ordinary modeled flows fall within 30–90 seconds | Warm-cache media-duration estimates; not observed human-call duration |
| Provider usage | 12 attempts, 12 verified unique slot assets, 979 submitted text characters, zero provider failures; all later browser requests use cache | Monetary cost unavailable; raw character-cost response headers retained in manifest |
| Takeover rate | Eligible ordinary: 0/42; all corpus cases: 8/60 | Scripted deterministic scenario coverage, not field effectiveness |

Actual-audio browser evidence is retained in separate `stage-2.0c-2-browser-*.json` exports and summarized in `stage-2.0c-2-browser-summary.json`. The first browser attempt exposed an unbound native-fetch invocation bug. The session failed closed with reviewed YES and literal email retained; its failure export is preserved. The wrapper invocation was fixed and regression-tested before the successful reruns. The named browser setup also exposed C-1’s dynamic-unavailable recommendation still being used by the new controller. The C-2 controller now replaces only that unavailable-slot result with a currently permitted operator-approved NAME action, with explicit denial checked first. The corpus subsequently checks recommended action/phrase identity as well as end state for every explicit playback. No fabricated source-ended event is used in the browser evidence.

## Actual local browser output results

| Rehearsal | Final state | Completed outputs | Dynamic slots completed | Interrupted outputs | Local render seconds | Actual browser wall seconds |
|---|---|---:|---:|---:|---:|---:|
| Direct HCP | END_SUCCESS | 8 | 1 EMAIL | 0 | 39.845 | 119.633 |
| Corrected email | END_SUCCESS | 10 | 2 EMAIL | 0 | 56.425 | 280.051 |
| Authorized named intermediary | END_SUCCESS | 8 | 2 NAME + 1 EMAIL | 0 | 34.969 | 180.550 |
| Named consent question interruption | CONSENT_UNCLEAR; YES disabled | 1 | 0 completed; 1 NAME interrupted | 1 | 7.477 completed audio | 19.447 |

All 27 completed outputs have real local `web-audio-source-ended` proof; none contains a synthetic completion marker. The interrupted question had a real start, no completion time/proof and no eligible affirmative decision. All four distinct email fixtures were actually rendered locally. The NAME authority and intermediary-consent templates were actually rendered; receptionist/wrong-person template audio generation is verified and those flows are covered in the controller-driven corpus, but those two templates were not separately played in the browser.

The actual browser wall times above include operator/tool pauses during implementation and inspection. They **do not meet or prove the 30–90 second natural-call target**. The shorter duration estimates below are explicitly modeled; no browser time was redefined or discarded to claim physical success. The correction and intermediary browser paths begin at an explicitly operator-verified recipient rather than replaying the already-tested opening; corpus duration models include opening.

Seven browser slot requests hit verified cache entries; no additional provider generations were needed. Browser output clipping was zero, with two peak-protection events (direct email and corrected email). Requested gain remains calibrated; effective gain was reduced by the existing policy for those outputs. The current UI leaves an interrupted intermediary at an unarmed wait state for operator takeover rather than automatically retrying; this is a known bounded limitation, excluded from the ordinary-call success denominator as an explicit integrity test.

## Corpus

60 deterministic variations, all expected outcomes passed. These use simulated recipient transcripts and a synthetic output adapter, not 60 paid/live calls. Generated cache media durations supply the duration model; output completion in the corpus remains synthetic.

| Class | Cases | Outcome | Modeled seconds |
|---|---:|---|---:|
| Direct HCP | 12 | 12 success | 39.55–43.03 |
| Clarification | 8 | 8 success | 45.70–52.72 |
| Email correction | 6 | 6 success | 68.62 |
| Receptionist transfer | 6 | 6 success | 46.75–50.33 |
| Wrong then correct person | 4 | 4 success | 45.54–48.84 |
| Authorized intermediary | 6 | 6 success | 46.89–50.65 |
| Refusal | 4 | 4 refused, no takeover | 23.38 |
| Busy/callback | 4 | 4 other-close, no takeover | 16.63 |
| Sensitive/unsupported questions or explicit human request | 4 | 4 takeover | 8.20 |
| Unsupported values | 2 | 2 takeover | 7.20–24.38 |
| Provider failure | 1 | 1 takeover, YES/email retained | 27.31 |
| Authority denied | 1 | 1 takeover | 14.12 |
| Interrupted question / stale YES | 2 | Both affirmative results blocked | 16.68–24.31 |

Eligible ordinary denominator is the 42 direct, clarification, correction, transfer and authorized-intermediary calls, fixed before evaluating their outcome. All 42 completed: 100%, above the requested 80% target **for this corpus only**. Refusal/busy are successful short non-consent outcomes; sensitive/unsupported/provider/integrity cases are separately enumerated. Their safeguards were not weakened to improve the ordinary-call metric.

Durations sum complete prerecorded/dynamic media plus 400 ms onset + 600 ms response/transition per recipient turn. No additional operator deliberation, transfer delay or cold-cache provider/network delay is included. Whole corpus flows include opening. Longer addresses may exceed the target; no padding, playback acceleration, ASR changes or metric redefinition was introduced. Correction readback fixture durations differ materially (8.963 vs 18.715 seconds); do not assume constant TTS duration from text length.

## Usage, gain and privacy

Twelve new assets contain zero raw/output clipping. Two fixtures trigger the unchanged peak-protection policy. Requested gain remains 3.5573605757216837; peak protection may reduce effective gain for those recordings. Zero clipping must not be presented as zero peak protection. Provider/model/speed remain Isabella / `eleven_flash_v2_5` / 0.95. No C-1 regeneration, OpenAI request, recognition session, phone call or stress test was performed.

`stage-2.0c-2-audio-manifest.json` retains each fixture's rendered text, exact slot provenance, hashes, settings hash, provider request receipt, media duration and gain checks. The private cache holds potentially personal values in actual use and is ignored by Git. The committed-document candidates in this working tree contain labelled synthetic fixtures only. The gateway is loopback-only and accepts browser generation requests only from the listed local development origins. No downstream email is sent and no legal/production consent record is created.

Provider character-cost header values are retained without treating them as dollars. No billing endpoint was queried; exact monetary cost is unknown. Future identical valid cache hits incur no new provider request. A cache corruption/settings mismatch fails closed rather than silently regenerating a previously paid asset.

## Validation and preservation

30 focused C-2 tests, plus 60 corpus variations. Full suite: **975 tests / 72 files passed**. Lint, typecheck, build and Git diff-check pass. The build retains the pre-existing warning about a JavaScript chunk larger than 500 kB. The initial sandbox-only full-suite attempt could not open local test sockets; the rerun with loopback permission passed, with mocked providers.

Before editing, hashes of 235 existing source/server/public/test files and the pre-existing Git diff/status were captured. **233/235 remain byte-identical.** The only changed existing files are `src/consent/session.ts` (optional bounded dynamic ports/completion binding) and `src/consent/ConsentWorkspace.tsx` (explicit C-2 workspace route wrapper). All Stage 1 files, configuration, C-1 approval inventory, C-1 static decoder/player, compiled C-1 manifest and all 25 WAV files are unchanged. Preservation details are in `stage-2.0c-2-preservation.json`.

Exact implementation files:

- Modified: `src/consent/session.ts`, `src/consent/ConsentWorkspace.tsx`.
- Added: `src/consent/dynamic/render.ts`, `port.ts`, `playback.ts`, `controller.ts`, `Workspace.tsx`; `server/consentDynamic.ts`.
- Added tests/tooling: `tests/consent-stage20c2.test.ts`; `scripts/stage20c2-corpus.ts`, `stage20c2-generate.ts`, `stage20c2-report.ts`.
- Added reports: this file; C-2 audio manifest, corpus, duration report, preservation, validation and browser evidence exports/screenshots.

Run the isolated gateway with `node --import tsx server/consentDynamic.ts`; it starts no provider session. The generator script is a **paid cache-population tool**, not part of the routine validation suite. Do not rerun it as an ordinary test.

## Remaining verification / trade-offs

Human Danish listening review must confirm all letter names, separators, uppercase cues and the two synthetic-name pronunciations before approving real contact values. Character-by-character readback is precise but slower and can sound less natural. Whole-slot TTS preserves deterministic input and caching, but byte/provenance verification does not prove linguistic fidelity of a generated waveform. Synthetic contact attestations exercise a software contract; they do not authorize real customer identities or pronunciations.

The local browser runs use manual transcript/onset markers and real WebAudio output. They do not measure ASR quality, microphone onset accuracy, telephone audibility, telephony interruption behavior, real transfer delays, real operator deliberation, or physical end-to-end latency. Physical call verification and explicit stage acceptance remain pending. No commit, PR, deployment, telephone integration or downstream handoff write was performed.
