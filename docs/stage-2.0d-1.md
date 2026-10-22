# Stage 2.0D-1 completion — local mocked transport foundation

**STAGE 2.0D-1 READY — PHYSICAL CALL AUTHORIZATION REQUIRED**

Engineering validation only. NOT HUMAN ACCEPTED. NOT PRODUCTION READY. No physical telephone call, live provider session, audio generation, deployment, commit, push, PR update or merge occurred. D-2 has not started.

## Candidate identity and scope

- Frozen C-3.2 baseline: `a25618abd4444e82b393d41026b62273e751336a`.
- Initial frozen tree: `a0ef907bd7d0cc1da73b6343ab5f5e5ebfb74aac`; initial checkout clean.
- D-1 branch: `codex/stage-2.0d1-twilio-foundation`.
- Local HEAD remains the frozen baseline; no new commit was created.
- Proposed commit message: `Add Stage 2.0D-1 mocked outbound telephony foundation`.
- Changed files: **81**, including new implementation, tests, fixtures, reports and retained validation logs. Exact paths/hashes are in `stage-2.0d-1-files.json`.
- Publication, PR and merge remain separately gated. No destination, real account credential or physical-call grant is stored in the candidate.

## Implementation

`src/telephony` contains provider-neutral call lifecycle, stream/ASR/output/takeover contracts, controller bridge, evaluation export and readiness checks. Twilio-specific code contains the strict message parser, status mapping, exact outbound request plan and cached playback adapter. `server/telephony` supplies official-SDK signature verification and an opt-in verified webhook/WebSocket host boundary. It does not install public routes or start a provider client.

`TwilioOutboundProvider` is deliberately sealed in D-1: physical creation always rejects. The destination-specific one-shot authorization contract requires explicit authorization, purpose, finite expiry, at most one call and no retries; configuration/mode alone cannot dial. The actual authenticated HTTP executor, public TLS deployment and live ASR port wiring are deferred to an explicitly authorized D-2 step. The request serializer and provider boundary are implemented and tested now; no claim is made that a physical call can run from this D-1 host.

The local mock drives ringing, answer, start, inbound media, cached outbound media, marks, clear, disconnect, failure and termination through the real D-1 bridge and frozen `StructuredEmailSession`. Clinic text is explicitly injected ASR, not measured telephone recognition. There is no automatic redial, general conversational model, CRM write, production persistence or full-call recording.

### Playback, ownership and audio

Original frozen WAV → verified provenance/current binding → PCM copy with unchanged gain → low-pass 24 kHz to 8 kHz → mu-law mono → 20 ms base64 frames → owned mark. Provider messages contain no WAV header. Frame ordering and local outbound sequence are retained in diagnostics; packet payloads are not transcript entries or export fields.

Submitting media, a resolved Promise or elapsed WAV duration cannot complete a question. Only the matching active mark creates `VERIFIED_TELEPHONE_MARK`, bound to call, stream, playback, phrase/version, canonical/synthesis/asset hashes and recipient revision. This is a provider buffer boundary; `physicalHearingProven=false` always remains explicit. Browser `web-audio-source-ended` is never fabricated for telephone media. A missing mark reaches a failure deadline, not a synthetic completion.

Clinic onset invalidates question ownership before clear. Interrupted playback remains interrupted even when clear returns its old marks. Wrong stream/call, prior mark, duplicate mark, sequence loss, overlapping media timestamps, stale finals and terminal-call messages cannot create a completed question or revive a call. Two concurrent mocked calls prove stream/proof/ledger isolation.

All **54** frozen source recordings remain byte-identical, with source/output clipping **0**. The existing calibrated source render has **4** peak-protection events across the full historical pack, consistent with the preserved policy; these were not removed or hidden. All **34** currently bound non-email-diagnostic assets/variants passed deterministic telephone conversion, including cached name variants. Conversion introduced **0** clipping and **0** additional peak-protection samples. The 32-unit ordinary voice inventory and 12-required/4-optional human listening structure remain intact. No derived telephone media overwrites a WAV or is committed as a new recording.

### Danish ASR, consent and email

Inbound mu-law/8 kHz is transiently decoded/interpolated into PCM16/24 kHz for the existing Danish adapter. Model/configuration are unchanged. The transport bridge retains partial/final, local .012 RMS onset, 800 ms endpoint/commit evidence, original owner/revision and duplicate suppression. Interpolation does not restore telephone bandwidth. Local VAD is not word alignment or confidence. Late finals cannot acquire a new question or recipient revision.

The frozen guard, classifier, authority policy, recipient checks, canonical wording, email reconstruction, scoped resolver and bounded advisory model are unchanged. YES still needs a complete owned question, strictly subsequent original onset, correct recipient/scope/revision, explicit affirmative final and separate review. There is no DB-only/model-only/email-as-consent route. Email remains clinic-spoken reconstruction → corroboration → concise confirmation. Full email readback remains unreachable in the normal path.

Five existing integration files expose optional output/data ports: `approved/localPlayback.ts`, `types.ts`, `session.ts`, `stage32/email/flow.ts`, and `stage32/operations/App.tsx`. Browser defaults remain exact; C-3.2/C-3.1/prior regressions pass. `.env.example` and package files are the other three baseline changes. The preservation report gives every before/after hash and reason. No frozen expectations or historical reports were rewritten to bless the integration.

### Transcript, export and takeover

The frozen `c32-transcript-ledger-1` remains authoritative by `callId + sequenceNumber`. Danish source, partial/final ownership and optional separate English meaning are preserved. Lifecycle, playback start/complete/interrupt, consent, email, authority, takeover and errors have distinct ledger events/references. Low-level media stays in diagnostics. Failure to obtain English meaning retains Danish source and cannot grant consent or fail an otherwise guarded Danish decision.

Evaluation export includes call/provider/stream references, wall and monotonic start/end, duration, ordered ledger, consent/email/authority/takeover references, mark evidence, errors and transport/ASR summary. It excludes destination, tokens, keys, raw audio and provider headers. Terminal exports are frozen defensive snapshots. Termination revokes pending email work; ignored late asynchronous resolution cannot alter the completed call export. This is local evaluation evidence, not production consent or production transcript storage.

Takeover stops automation and supplies recipient, authority, consent/email state, ordered transcript, last clinic utterance/Isabella action, provider/stream identity and reason to an injected interpreter interface. Stage 1.9.6 is preserved. Seamless physical telephone transfer and return to automation remain unverified/unimplemented.

## Final validation

Final locked snapshot: `/private/tmp/d1-validation-A4DdC8/tree`. Raw results, commands and timings are retained in `stage-2.0d-1-evidence/` and `stage-2.0d-1-validation.txt`. The candidate source was checked unchanged after each command.

| Gate | Final result |
| --- | --- |
| D-1 focused | **102/102**, 3 files |
| Complete suite | **1,945/1,945 ×3**, 96 files per run |
| C-3.2 focused | **723/723** |
| C-3.1 | **139/139** |
| Prior consent, including Stage 1.9.6 short-consent | **496/496** |
| Email corpus | **66/66** |
| Database/model adversarial cases | **18/18**; unsafe negative control detected |
| Expanded consent matrix | **29/29** |
| Existing scenario corpora | **46/46 + 32/32** |
| New telephony scenarios A–R | **18/18**; complete normalized expected event sequences asserted |
| Replay hotspot | **2/2 ×5** |
| 45-second PCM hotspot | **1/1 ×5** |
| Lint / typecheck / standard build | **PASS** |
| D-1 Operations + Human Acceptance build | **PASS** |
| Diff / preservation / secret and hygiene inspection | **PASS** |

D-1 coverage includes 34 per-binding deterministic conversion cases, 18 complete mocked scenarios, 31 protocol/media/request/signature/readiness cases and 19 additional adversarial/UI/termination/takeover cases. These overlap semantic concerns such as transcript and completion; they are not independent physical measurements. Frozen transcript ordering tests also pass in the C-3.2 group.

All required safety counters are **0**: false email auto-accepts, ambiguous automatic selections, consent false positives, normal-path full-email readback, consent from interrupted question, completion after interruption, stale provider mutation after end, duplicate final transcript entries, automatic redials and provider failure reported as success. `stage-2.0d-1-safety.json` records the measured model/test results and negative control.

Node **25.9.0**, npm **11.12.1**, Darwin **27.0.0 arm64**. CPU sysctl access was denied; no CPU/load claim is inferred. Vitest worker configuration and test timeouts are unchanged. Commands ran sequentially, with no pass-manufacturing retries, assertion weakening, test removals or global concurrency changes. The targeted PCM command naturally selects its one hotspot; all tests ran in every full-suite run.

### Findings resolved during development

A deterministic closed-socket regression first failed: clear transmission threw before terminal cleanup. Cancellation now records interruption and an output cleanup error while cleanup continues to FAILED. A second regression proved late email resolution could change ended evidence; termination now revokes pending work and snapshots terminal evidence. Before/after regression logs are retained. Neither fix changes frozen policy.

An earlier isolated build attempted to hash the snapshot's `node_modules` symlink as a file. The D-1 builder/verifier now explicitly excludes dependency/build directories from source records. Earlier green test sweeps were not substituted for the final corrected-tree validation above. The final complete sweep passed every gate.

The D-1 combined Operations/QA bundle emits Vite's non-fatal >500 kB chunk advisory (approximately 730 kB uncompressed / 185 kB gzip). It is recorded rather than suppressed. Build exits successfully. No telephony latency or perceived speech quality is inferred from bundle or mock timing.

## Operations and readiness

The existing branded Operations shell accepts an optional mocked transport binding: Dashboard, Calls, Active Call, transcript, review/diagnostics and presence-only settings. Actual in-memory mocked sessions are listed; there is no invented live volume or production metric. The final browser check verified cached opening conversion/mark, clean end, disabled post-end conversation controls, and no consent from that opening-only session. The separate QA route retains its original source and 12/4 listening inventory, five mic checks and eight email cases. No review scores, microphone capture or provider sessions were submitted during UI verification.

Local preview: `http://127.0.0.1:5174/`; QA: `/qa`. D-1's loopback server has no dial route and no live ASR gateway. Presence-only health shows Twilio/FROM/callback/media/ASR **MISSING**, physical mode **false**, physical dialing **false**, provider requests **0**, physical calls **0**. `stage-2.0d-1-preflight.json` reports **LOCAL_MOCK_READY**, configuration **NOT_CONFIGURED**, no destination and no provider verification. Missing configuration is an expected physical gate, not a passed provider preflight.

Reproduce locally:

```sh
node --import tsx scripts/stage20d1-evidence.ts
node --import tsx scripts/verify-stage20d1.ts
node --import tsx scripts/stage20d1-validate.ts
node --import tsx scripts/stage20d1-package.ts
node --import tsx scripts/stage20d1-serve.ts
```

Do not execute `--write-fixture` merely to bless a failing sequence; fixtures are retained expected behavior, not a retry mechanism. The existing frozen C-3.2 host/profile is separate. New D-1 source hashes isolate QA review progress from old candidate identities.

## Dependencies and preservation

One new direct dependency: pinned **twilio@6.2.0**, used server-side for officially recommended validation helpers. It adds 49 locked package entries including itself. No existing dependency version changed; `debug` and `ms` only change development/runtime metadata because the SDK uses them. `ws` was already available. The full closure and reasons are in `stage-2.0d-1-dependencies.json`.

Of 996 original tracked files, **988** are unchanged and **8** explicitly documented integration/configuration/dependency files changed. Stage 1.9.6/server streaming, guard/authority/resolution/classifier policy, all historical reports and intentionally tracked evidence, canonical/synthesis bindings, branding and the QA source are preserved. All 54 source hashes match. The D-1 preservation layer documents the new ports instead of rewriting the C-3.2 frozen proof. Private ignored data, .env/credentials, Downloads exports, screenshots, build output and temporary files are excluded from the candidate.

## Remaining gates and next authorization

No actual telephony setup, public TLS callback/upgrade, authenticated provider executor, telephone ASR quality, phone audibility, interruption cancellation latency, mark behavior through a real proxy, physical call duration or seamless takeover has been proven. English meaning currently has an optional derived-data boundary, with no live translation provider installed. The mock's injected text and fast simulated clock cannot establish WER or 30–90 second physical acceptance. For reference only, modeled direct success A is approximately **33.334 s**, clarification C **39.191 s**, intermediary F **35.336 s**, correction K **40.222 s**, and busy D **15.770 s**. They omit real human/network delays and do not pad short outcomes.

C-3.2 native listening/new-byte approval, live microphone/ASR, human returned-evidence review and existing business/legal/retention/system-of-record gates remain pending. No production retention, CRM writes or telephone recording was added.

The next separate D-2 authorization must privately supply **Humza's own exact number**, explicit purpose **supervised end-to-end telephone validation**, **one initial call maximum**, **zero automatic redials/retries**, and a finite one-shot expiry. It must also authorize the required real-provider wiring/configuration separately; provider-side checks are external activity. Do not put the number or grant in Git. The first-call plan is prepared in `stage-2.0d-1-first-physical-call-plan.md` and was **not executed**.

Publication/merge authorization remains separate. This task stops locally with an uncommitted, validated candidate. No push, PR, merge, deployment or D-2 physical test was performed.
