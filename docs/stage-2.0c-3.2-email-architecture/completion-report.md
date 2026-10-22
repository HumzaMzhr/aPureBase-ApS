# C32 email freeze completion report

**HUMAN RETEST CANDIDATE — NOT ACCEPTED — NOT PRODUCTION READY.**

Implemented in the existing working candidate. No commit, push, PR update, merge, deployment, provider/audio generation or Stage 2.0D work. The main checkout is untouched.

Normal C32 email capture and corrections now enforce concise confirmation at the controller API boundary. Existing normal acquisition already used short confirmation; this closes alternate legacy playback entry points and freezes that decision. No newly measured latency/recognition improvement is claimed.

Added generic snabela token support, fresh verified-adapter receipt requirements, advisory status and conflict review, explicit one-repeat/incomplete-address policy, immediate invalidation on recipient revision, and copy-only UI evidence/lineage contracts. Unsupported/malformed characters still require takeover. Consent wording/eligibility/authority rules, recognition settings, models, branding and audio bytes are unchanged. UI changes are limited to required/optional labels, navigation and counts; no redesign.

| Validation | Result |
|---|---|
| c32-focused | PASS — 666 tests |
| c31 | PASS — 139 tests |
| prior-consent | PASS — 496 tests |
| full | PASS — 1786 tests |
| lint | PASS |
| typecheck | PASS |
| build | PASS |
| c32-build | PASS |
| handoff-build | PASS |
| preservation-c31 | PASS |
| preservation-c32-email | PASS |
| package-hashes | PASS |
| diff/whitespace and changed-source credential scan | PASS |
| local package health / matching identity / disabled ASR gate | PASS |
| historical verifier on preserved prior tree | PASS |

56 new deterministic tests; 666 focused tests; 1,786 full-suite tests across 88 files. The existing corpus keeps all 66 cases: 66/66 policy-correct; one malicious-model case now expects null/CONFLICT, so address-selection expectations are 40 rather than 41. All 18 independent adversarial cases pass with zero false auto-accepts or ambiguous auto-selections. No skipped tests, weakened timeouts or acceptance-by-replay.

All 52 recordings (37 original + 12 C31 + 3 C32), original human exports, historical reports and original ZIP hashes remain preserved. The historical preservation script remains untouched; it is correctly specific to its historical tree. The new exact-hash layered verifier checks every one of 874 pre-task files against either its unchanged digest or its explicitly pinned email-freeze change, plus new source proof.

The builder produces 12 required normal listening items and four OPTIONAL DIAGNOSTIC EMAIL SPELLING AUDIO items. These diagnostics do not count toward normal listening completion. Current local package: `/private/tmp/c32-email-freeze/package-frozen/aPureBase-C32-Email-Architecture-Retest`. Candidate source hash: `7ddc6a19759dd00559b880497b7b3b4dd0834c3ae53ded93edb77bd282422a1d`. No ZIP was published and no package was sent to Asem. Earlier ZIPs are superseded for email/natural-call acceptance under this freeze, while unrelated exact-hash listening evidence remains subject to separate review.

Static audio: 30.511 seconds; illustrative ordinary subtotal: 45.511–66.511 seconds. Components remain separate in modeled-evidence.json. Three lookup deadlines plus optional advisory deadline total at most 1 second; network/physical delays are unknown. Counterfactual legacy readback content is 13.793–22.245 seconds longer, not a measured saving. Existing no-readback normal timing is otherwise unchanged.

Trade-offs: no-database and duplicate-record cases remain conservative operator review; invented/conflicting model candidates also require review. A plausible ASR-hallucinated @/word cannot be disproved from transcript/DB agreement alone; acousticSymbolVerified is false and fresh owned confirmation/operator review remain required. No real CRM adapter, human pronunciation/ASR accuracy result, telephone integration or physical duration validation is claimed. Full-call recording remains NOT_IMPLEMENTED / BUSINESS_DECISION_REQUIRED. Nonblocking Vite large-chunk warning remains.

The supplied instructions end mid-bullet in section 21; all complete supplied requirements were implemented without inventing a missing continuation.

## Exact changed source files

- [scripts/stage20c32-handoff/HUMAN-REVIEW-GUIDE.txt](/private/tmp/apurebase-c32-pronunciation/scripts/stage20c32-handoff/HUMAN-REVIEW-GUIDE.txt)
- [scripts/stage20c32-handoff/REVIEW-EXPORT-SCHEMA.json](/private/tmp/apurebase-c32-pronunciation/scripts/stage20c32-handoff/REVIEW-EXPORT-SCHEMA.json)
- [scripts/stage20c32-handoff/START-HERE.txt](/private/tmp/apurebase-c32-pronunciation/scripts/stage20c32-handoff/START-HERE.txt)
- [scripts/stage20c32-handoff/verify.mjs](/private/tmp/apurebase-c32-pronunciation/scripts/stage20c32-handoff/verify.mjs)
- [scripts/stage20c32-package.ts](/private/tmp/apurebase-c32-pronunciation/scripts/stage20c32-package.ts)
- [src/consent/stage32/feedback/adversarial.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/feedback/adversarial.ts)
- [src/consent/stage32/handoff/App.tsx](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/handoff/App.tsx)
- [src/consent/stage32/handoff/contract.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/handoff/contract.ts)
- [src/consent/stage32/handoff/live.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/handoff/live.ts)
- [src/consent/stage32/handoff/presentation.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/handoff/presentation.ts)
- [src/consent/stage32/Workbench.tsx](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/Workbench.tsx)
- [src/consent/stage32/duration.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/duration.ts)
- [src/consent/stage32/email/danishEmailLexicon.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/email/danishEmailLexicon.ts)
- [src/consent/stage32/email/databaseResolver.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/email/databaseResolver.ts)
- [src/consent/stage32/email/flow.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/email/flow.ts)
- [src/consent/stage32/email/types.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/email/types.ts)
- [src/consent/stage32/hardening/corpus.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/hardening/corpus.ts)
- [src/consent/stage32/hardening/resolution.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/hardening/resolution.ts)
- [src/consent/stage32/session.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/session.ts)
- [tests/consent-stage20c32-hardening.test.ts](/private/tmp/apurebase-c32-pronunciation/tests/consent-stage20c32-hardening.test.ts)
- [src/consent/stage32/email/architecture.ts](/private/tmp/apurebase-c32-pronunciation/src/consent/stage32/email/architecture.ts)
- [tests/consent-stage20c32-email-freeze.test.ts](/private/tmp/apurebase-c32-pronunciation/tests/consent-stage20c32-email-freeze.test.ts)
- [scripts/stage20c32-email-architecture-audit.ts](/private/tmp/apurebase-c32-pronunciation/scripts/stage20c32-email-architecture-audit.ts)
- [scripts/verify-stage20c32-email-freeze.py](/private/tmp/apurebase-c32-pronunciation/scripts/verify-stage20c32-email-freeze.py)

## Review artifacts

- [Architecture and trade-offs](ARCHITECTURE.md)
- [Machine-readable reachability audit](reachability.json)
- [Modeled timings, corpus and actual synthetic controller evidence](modeled-evidence.json)
- [New test matrix results](validation/matrix-test-results-frozen.json)
- [Exact validation commands/results](validation/results.json)
- [Completion data](completion-report.json)
- [Preservation pins](preservation.json)
- [Candidate source proof](source-proof.json)
