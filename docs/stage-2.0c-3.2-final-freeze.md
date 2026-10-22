# C-3.2 final production-baseline freeze

**ENGINEERING VERIFIED — HUMAN REVIEW PENDING — NOT PRODUCTION READY.**

This candidate consolidates the exact existing two `senne` recordings, the current short email confirmation architecture, the official aPureBase Operations UI and an observational transcript contract. It does not add telephone transport, production persistence or new provider generation. Conditional Git publication/merge is the remaining release step; final Git identities are recorded in the PR and completion report after verification.

## Verified candidate

- C32 focused: **723/723**, 15 files.
- C31: **139/139**. Prior consent including Stage 1.9.6: **496/496**.
- Full suite: **1,843/1,843 × 3**, 93 files per run.
- Replay hotspot: **2/2 × 5**. PCM hotspot: **1/1 × 5**.
- Email: **66/66**, falseEmailAutoAccepts=0, ambiguousAutomaticSelections=0.
- Database/model boundaries: **18/18**, unsafe negative control detected.
- Consent matrix: **29/29**, consentFalsePositives=0.
- Scenarios: **46/46 + 32/32** remediation.
- Normal-call full-email readback reachability: **0**.
- Current cached bindings: **38**, 37 unique current recordings, 12 required listening / 4 optional diagnostics.
- Protected recording inventory: **54/54**, exact hashes and technical QA; all previous 52 preserved, two already-generated corrections recovered. Zero clipping. No new audio generated during the freeze task.
- Lint/typecheck/standard build/repository Operations+QA build/package binding verification/preservation/whitespace/secret inspection: PASS. Existing Vite large-chunk warnings remain documented.

Full outputs and exact commands are in `stage-2.0c-3.2-final-freeze-validation.txt`; structured results, safety corpora and UI checks are in `stage-2.0c-3.2-final-freeze-evidence/`. No retries, timeout increases, weakened assertions or global concurrency changes were used. Final validation ran sequentially in a complete isolated candidate snapshot to preserve historical generated reports.

## Exact voice bindings

| Phrase | Current SHA-256 |
|---|---|
| Why Calling | `e42efb01c72e78f97a5c19de443e898637af5c0e55f3ec41429d206474b59faa` |
| Clarify | `5206820f9e531c97823a92dbbf3fcfee92c50fe6ff82e78e61846f48e9f0e06b` |
| Success Close | `e72d65aabdc5ecb1223de5311c3d0fa687588309f0191832bd328984179ad908` |

Isabella, eleven_flash_v2_5, speed 0.95 and gain 3.5573605757216837 remain unchanged. Displayed/canonical/audit Danish still uses `sende`. Only the two exact synthesis payloads use `senne`; tests prevent binding/meaning grafts and ASR/email contamination. New hashes remain NEW RECORDING / HUMAN_REVIEW_PENDING. Old scores cannot approve them.

The all-production-path quality audit covers **32** bound ordinary units: KEEP_CURRENT=10, CURRENT_NEW_HUMAN_REVIEW_PENDING=2, HUMAN_ONLY_QUALITY_GATE=20. No concrete bounded automatable improvement requiring more paid TTS was established. Full text/provenance, exact-byte feedback, signal metrics and replacement lineage are in `stage-2.0c-3.2-final-isabella-quality-audit.json` and its Markdown companion. No realism percentage or native naturalness certification is inferred from signal analysis. Transition timings are modeled and clearly separated from unmeasured physical pauses; no fixed pause/buffer was added.

## Operations and QA

Default `/` and `/operations`: restrained official aPureBase Operations shell with Dashboard, Calls, Active Call, Transcripts, Contacts / Resolution, Review, Diagnostics and read-only Settings. Metrics and real call transport show NOT CONNECTED. Future call/takeover controls are disabled. The local transcript example is explicit opt-in, synthetic and in memory. No background provider call, real CRM record or production statistic is fabricated.

`/qa`: preserved Human Acceptance workspace with all five steps, 12 required listening items, four optional email diagnostics, existing microphone/email/call tests and results/export gates. The operator shell does not replace or bypass QA. The current Git retest guide now points directly to `/qa`.

Browser checks cover built routing, desktop overflow at 1365 CSS pixels, skip-link keyboard focus, disabled controls, separate Danish/derived English, status-versus-speech display, and explicit degraded-state preview. Responsive breakpoint/grid/focus/structural accessibility regressions pass. This is not exhaustive physical device or screen-reader certification. Screenshots remain local-only, excluded from Git.

## Transcript and boundaries

Schema `c32-transcript-ledger-1` orders by **callId + sequenceNumber**, never wall-clock alone. It preserves partials/finals, late-final original turn ownership, distinct Danish source and derived English, playback start/completion/interruption, consent/email/authority/takeover/errors/lifecycle and evidence references. Duplicate finals are suppressed; conflicting rewrites/stale partials/forged sequence/invalid exports fail closed. An interrupted output cannot be marked completed. Defensive copies prevent callers mutating retained entries. Playback terminal states are displayed once as status, not repeated speech.

The ledger is **observational**. It cannot grant consent, select an email, change a source final, or write downstream decisions. Existing validated consent and email engines remain unchanged. Future transcript storage and takeover ports are interfaces only. No production/browser transcript persistence, CRM/cloud write or full-call recording was installed. Retention and return-to-automation policy remain business decisions. See `STAGE-2.0C32-OPERATIONS-AND-TRANSCRIPT.md`.

## Preservation and publication

The freeze manifest layers the 968-file pre-freeze local snapshot (including the exact prior pronunciation candidate) with only four intentional existing-file changes: repository packaging source-proof selection, local route handling, application entry routing/title and current QA guide. The earlier six synthesis-correction integration changes remain separately documented and protected. New Operations/ledger/tests/evidence are added. All Stage 1.9.6/server/streaming code, consent/email baseline, historical reports, human evidence, original wordmark/molecular assets and all 54 WAVs are preserved. No private human-review export, `.env`, credentials, ignored recordings, build output, caches or temporary screenshots enter the commit.

Create `codex/stage-2.0c32-final-freeze` from updated main, verify reconciliation, commit once, push without force, create a new PR, require passing checks and an identical validated tree, then merge only under the user's conditional authorization. Historical merged PR #2 is not reused. Any publication-approval block requires exact payload authorization; do not bypass it.

## Remaining gates

**HUMAN REVIEW PENDING:** new native exact-byte pronunciation approval, unresolved quality concerns, five live ASR smoke tests, captured email/correction tests, physical natural-call scenarios/timing, and review of returned evidence. The submitted offline review identifies Humza; it does not impersonate Asem or transfer ratings to new hashes.

**BUSINESS DECISION PENDING:** eight-day mechanism/starting event, effectiveness/suppression timing, system of record, retention/recording policy, unsubscribe mechanism, stored-email shortcut and intermediary authority standard. The full frozen list is retained in the JSON report.

**STAGE 2.0D / TELEPHONY NOT IMPLEMENTED:** Twilio SDK=0, API calls=0, Media Streams=0, telephone calls=0. No deployment. No production transcript persistence. Freeze completion authorizes a later separate Stage 2.0D design instruction only; it does not start that work. Once merged, record `STAGE_2_0C32_FROZEN_BASELINE_SHA` in the completion report and use that exact main commit for future work. Future C32 changes require an explicit regression reason, preserved baseline identity and fresh validation.
