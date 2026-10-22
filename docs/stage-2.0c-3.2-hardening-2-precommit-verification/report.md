C-3.2 Hardening-2 — final independent pre-commit verification

No candidate implementation, test, configuration, recording or historical report was modified. This report and its three companions are the only new repository files created by this verification.

## Final verification table

| Check | Fresh result |
|---|---|
| C-3.2 focused | 513/513 |
| C-3.1 regression | 139/139 |
| Prior consent | 496/496 |
| Email corpus | 66/66; actual state-derived counters |
| Unsafe negative control | Detected: false auto-accepts1, ambiguous selections1; safety gate threw |
| Consent matrix | 29/29; false positives0 |
| Scenario corpus | 46/46 original +32/32 additional |
| Replay ×5 | 2/2 each |
| PCM ×5 | 1/1 each |
| Full suite run1 | 1627/1627; 9.135s |
| Full suite run2 | 1627/1627; 6.747s |
| Full suite run3 | 1627/1627; 6.849s |
| Lint | PASS |
| Typecheck | PASS |
| Build | PASS; existing chunk warning |
| C-3.2 build | PASS; outside-root outDir notice disclosed |
| Diff/whitespace | PASS; all120 untracked files checked where text |
| Preservation | C31 / C32 / current H2 PASS |
| Audio QA | 286 per-file rows;49 protected PASS;12 indefinite UNKNOWN; clipping0 |
| Secret inspection | PASS;120untracked candidate files + recursive archives; no credentials found |
| Provider/network activity | 0 provider/ASR/TTS/audio/telephone/deployment; GitHub reads + local mocks only |

## Scope, Git and integrity

Branch: `codex/stage-2.0c3-human-acceptance`. Local HEAD, fetched remote HEAD and existing [PR#2](https://github.com/HumzaMzhr/aPureBase-ApS/pull/2) HEAD: `34285a8d6f4f94c6e8036c375b8a3244c316c176`. PR remains OPEN / DRAFT. `git diff --stat` and `git diff --name-status` are empty; no staged changes. Input tree:635files,515tracked and120untracked. Current verification adds exactly4 documentation/evidence artifacts. No commit/push/PR update/merge/deploy/new branch/Stage2D/provider/live-mic activity.

All635 pre-verification file hashes remain identical;331 source/test/config/package hashes match the exact test snapshot. Tests ran on a byte-exact copy because legacy replay tests write reports. No test timeout/concurrency setting was changed, no assertions weakened, and no retry wrapper was used. Three full suites and five hotspot measurements are independently requested runs, not recovery attempts.

C31 verifies original37+corrected12assets; C32 verifies515historicalfiles; H2 verifies actual dirty599-file pre-remediation baseline, current12authorizedchanges and recoverable original84untrackedfiles. All49protectedasset hashes match. No unexpected production/configuration drift or historical evidence change.

Historical H1 verifier applicability: its **raw status is FAIL** because its old seven-file allowlist predates authorized H2 changes to `email/databaseResolver.ts` (GAP002) and `recognition.ts` (GAP004). Both are explicit in the preserved H2 before/after manifest. All515trackedfiles, historical reports and prior tests pass H1 preservation; only those two superseded-allowlist deltas exist. The current H2 verifier passes without exceptions. The historical verifier was not edited. A temporary diagnostic initially omitted recognition.ts from its expected-delta list; that diagnostic-only expectation was corrected after inspection. Raw/reconciled outputs are retained in the log archive. This was not a candidate regression or test retry.

## Coverage inspection beyond totals

GAP001 default public policy and policy-override rejection; GAP002 exact provenance/scope/receipt/runtime objects; GAP003 observed snapshots + positive storage control + deliberately unsafe negative control; GAP004 existing recognition lifecycle and invalid-backend READY rejection; GAP005 strict bounded schema/required fields; GAP006 raw/final linkage/correction/provider absence; GAP007 changed config changes actual transition component with invariant guards; GAP008 per-file closed/indefinite WAV parsing; GAP009 four-category index, exact predecessor/replacement hashes and current-document existence; GAP010 inert journal/mock receipt tests + truthful historical UNKNOWN report. The four-category index was independently reconciled to the49verified asset hashes, not inferred from the test count.

Independent runtime probes exercised missing/object/array recordVersion, invalid/object sourceRecordId, wrong contact, excessive records, malformed email and malformed adapter response through the public session; every malformed response selected no trusted email, stored nothing and left identity/authority/consent/confirmation unchanged. Wrong recipient/revision, mismatched scope and stale lookup/model responses are covered by the focused public/session/receipt tests. Duplicate same-address records do not auto-store; distinct ambiguous/conflicting candidates remain guarded. Frozen A–J expectations remain unchanged.

Email corpus66/66: expected-address literal policy comparisons41/41;6ambiguous cases blocked. Real snapshot counters: falseEmailAutoAccepts=0, ambiguousAutomaticSelections=0. Corpus submissions stop before final recipient confirmation; positive full scenarios separately demonstrate actual local confirmed storage. Unsafe snapshot double starts with an actual ambiguous session; its unreviewed invented store makes both metrics1and the safety gate throw. Production never uses this test double.

Model timeout/malformed/invented/nonexistent/conflicting/ambiguous/stale/late revision tests use injected mocks only. Model recommendations cannot establish identity/authority/consent or bypass confirmation. Consent matrix29/29 and prior496regressions retain strict scoped final YES, verified recipient/authority, exact completed question owner and strictly-later speech onset. Stale/wrong-owner/interrupted/partial/ambiguous/maybe/okay/thanks/question/silence evidence cannot create YES. Refusal cannot restart persuasion; recipient/authority changes invalidate dependents; database/email/model evidence never manufactures consent.

Human schema negative tests reject missing/unknown IDs, incomplete finalization, wrong scalar/boolean types, invalid timing, missing/mismatched source chains and provider metadata where required. These are synthetic schema checks, not fabricated human acceptance records. Complete unlinked legacy observations remain explicitly SELF_REPORTED and cannot satisfy the linked real-diagnostic natural-call gate.

## Audio and modeled timing

All286WAVs inspected individually.49manifest-bound original/corrected recordings pass exact hashes, media format, binding, gain and clipping checks.237outsideassets are hash-keyed anonymously.12indefiniteheaders retain duration/completion UNKNOWN, never PASS; no unrecognized structural or alignment failure. Zero clipping;4unchanged peak-protection events. Full fresh technical report exactly equals the existing H2 audio-QA report; no audio files were generated/modified/copied into new reports.

Eight frozen ordinary successful models remain42.271–49.776s; transfer/intermediary45.971/50.132s; refusal25.477s; busy17.279s. Allowed pace change adds0.600s to modeled transitions while media/guards stay unchanged. Recipient speech, thinking, operator and transitions remain separate. Provider/network/telephone delay and physical elapsed time remain UNKNOWN, not zero. No padding or voice-speed change.

## Credentials, binaries and warnings

All120inputuntrackedfiles inspected, including296recursivearchive members (416text/binary scan units) and three PNG workspace screenshots. No secret/credential/.env file introduced. The only token-pattern hits are the unchanged synthetic `Bearer secret-token-123456` rejection fixture, explicitly classified non-secret. Five existing tar archives contain source/reports/logs, no newly copied private audio; all PNGs show clearly synthetic local workspaces, no credentials. Tracked `.env.example` remains unchanged. Ignored private benchmark recordings are not publishing-candidate files.

Standard Vite >500kB main-chunk warning is unchanged/previously documented (677.40kBminified). Separate build reports an outside-project outDir that is not automatically emptied; this is disclosed and no deletion override was used. No new application/compiler warning was silently ignored.

Current verification activity: ElevenLabs0, OpenAI0, audio generation0, live mic0, telephone0, deployment0. Network access was read-only GitHub fetch/PR metadata plus loopback mock sockets in tests; this is not a claim of zero network packets. Historical external-ledger provider totals remain UNKNOWN where no independent ledger exists.

## Exact files and artifacts

Exact tracked changed files: **none**. Exact input untracked inventory (120paths) and all635beforehashes are in `inventory.json`. Relative to the earlier legitimate H2 dirty baseline, its12intentional existing-file changes +9newimplementation/harnessfiles +1newtest remain as previously reviewed, unchanged by this task; the precise path lists are retained in the same inventory.

New files from this verification only:

- `docs/stage-2.0c-3.2-hardening-2-precommit-verification/report.md`
- `docs/stage-2.0c-3.2-hardening-2-precommit-verification/results.json`
- `docs/stage-2.0c-3.2-hardening-2-precommit-verification/inventory.json`
- `docs/stage-2.0c-3.2-hardening-2-precommit-verification/validation-logs.tar.gz`

Existing untracked candidate files, individually enumerated:

- `docs/STAGE-2.0C32-HARDENING-1-HUMAN-REVIEW-README.md`
- `docs/STAGE-2.0C32-HARDENING-2-HUMAN-REVIEW-README.md`
- `docs/STAGE-2.0C32-HUMAN-REVIEW-README.md`
- `docs/stage-2.0c-3.2-audit-evidence.json`
- `docs/stage-2.0c-3.2-audit-validation-logs.tar.gz`
- `docs/stage-2.0c-3.2-audit-validation.txt`
- `docs/stage-2.0c-3.2-command-compliance-audit.md`
- `docs/stage-2.0c-3.2-database-audit.md`
- `docs/stage-2.0c-3.2-duration.json`
- `docs/stage-2.0c-3.2-files.json`
- `docs/stage-2.0c-3.2-hardening-1-acceptance-impact.md`
- `docs/stage-2.0c-3.2-hardening-1-audio-qa.json`
- `docs/stage-2.0c-3.2-hardening-1-before-untracked.tar.gz`
- `docs/stage-2.0c-3.2-hardening-1-before.json`
- `docs/stage-2.0c-3.2-hardening-1-bundle-review.json`
- `docs/stage-2.0c-3.2-hardening-1-completion.md`
- `docs/stage-2.0c-3.2-hardening-1-consent-regression-matrix.json`
- `docs/stage-2.0c-3.2-hardening-1-duration-report.json`
- `docs/stage-2.0c-3.2-hardening-1-email-resolution-report.json`
- `docs/stage-2.0c-3.2-hardening-1-files.json`
- `docs/stage-2.0c-3.2-hardening-1-hygiene.json`
- `docs/stage-2.0c-3.2-hardening-1-isabella-experiment-plan.md`
- `docs/stage-2.0c-3.2-hardening-1-parser-comparison.json`
- `docs/stage-2.0c-3.2-hardening-1-preservation.json`
- `docs/stage-2.0c-3.2-hardening-1-pronunciation-registry.json`
- `docs/stage-2.0c-3.2-hardening-1-pronunciation-review.md`
- `docs/stage-2.0c-3.2-hardening-1-proposed-generation-manifest.json`
- `docs/stage-2.0c-3.2-hardening-1-provider-usage.json`
- `docs/stage-2.0c-3.2-hardening-1-scenario-results.json`
- `docs/stage-2.0c-3.2-hardening-1-source-proof-final.json`
- `docs/stage-2.0c-3.2-hardening-1-validation-logs.tar.gz`
- `docs/stage-2.0c-3.2-hardening-1-validation.json`
- `docs/stage-2.0c-3.2-hardening-1-validation.txt`
- `docs/stage-2.0c-3.2-hardening-1-workspace.png`
- `docs/stage-2.0c-3.2-hardening-2-acceptance-index.json`
- `docs/stage-2.0c-3.2-hardening-2-acceptance-index.md`
- `docs/stage-2.0c-3.2-hardening-2-audio-qa.json`
- `docs/stage-2.0c-3.2-hardening-2-before-untracked.tar.gz`
- `docs/stage-2.0c-3.2-hardening-2-before.json`
- `docs/stage-2.0c-3.2-hardening-2-completion.md`
- `docs/stage-2.0c-3.2-hardening-2-consent-regression-matrix.json`
- `docs/stage-2.0c-3.2-hardening-2-duration-report.json`
- `docs/stage-2.0c-3.2-hardening-2-email-resolution-report.json`
- `docs/stage-2.0c-3.2-hardening-2-files.json`
- `docs/stage-2.0c-3.2-hardening-2-gap-closure.json`
- `docs/stage-2.0c-3.2-hardening-2-gap-closure.md`
- `docs/stage-2.0c-3.2-hardening-2-hygiene.json`
- `docs/stage-2.0c-3.2-hardening-2-preservation.json`
- `docs/stage-2.0c-3.2-hardening-2-pronunciation-registry.json`
- `docs/stage-2.0c-3.2-hardening-2-proposed-generation-manifest.json`
- `docs/stage-2.0c-3.2-hardening-2-provider-usage.json`
- `docs/stage-2.0c-3.2-hardening-2-requirements-audit.json`
- `docs/stage-2.0c-3.2-hardening-2-requirements-audit.md`
- `docs/stage-2.0c-3.2-hardening-2-scenario-results.json`
- `docs/stage-2.0c-3.2-hardening-2-source-proof-final.json`
- `docs/stage-2.0c-3.2-hardening-2-validation-logs.tar.gz`
- `docs/stage-2.0c-3.2-hardening-2-validation.json`
- `docs/stage-2.0c-3.2-hardening-2-validation.txt`
- `docs/stage-2.0c-3.2-hardening-2-workspace.png`
- `docs/stage-2.0c-3.2-historical-evidence-read.json`
- `docs/stage-2.0c-3.2-issues.json`
- `docs/stage-2.0c-3.2-listening-matrix.csv`
- `docs/stage-2.0c-3.2-preservation.json`
- `docs/stage-2.0c-3.2-requirements-audit.json`
- `docs/stage-2.0c-3.2-requirements-audit.md`
- `docs/stage-2.0c-3.2-speech-plan.json`
- `docs/stage-2.0c-3.2-validation.json`
- `docs/stage-2.0c-3.2-validation.txt`
- `docs/stage-2.0c-3.2-workbench.png`
- `docs/stage-2.0c-3.2.md`
- `scripts/stage20c32-hardening-qa.ts`
- `scripts/stage20c32-hardening-reports.ts`
- `scripts/stage20c32-hardening-validate.ts`
- `scripts/stage20c32-hardening2-reports.ts`
- `scripts/stage20c32-hardening2-validate.ts`
- `scripts/stage20c32-report.ts`
- `scripts/verify-stage20c32-hardening.ts`
- `scripts/verify-stage20c32-hardening2.ts`
- `scripts/verify-stage20c32.ts`
- `src/consent/stage32/Workbench.tsx`
- `src/consent/stage32/diagnostics.ts`
- `src/consent/stage32/duration.ts`
- `src/consent/stage32/email/audit.ts`
- `src/consent/stage32/email/candidateResolver.ts`
- `src/consent/stage32/email/confidence.ts`
- `src/consent/stage32/email/danishEmailLexicon.ts`
- `src/consent/stage32/email/databaseResolver.ts`
- `src/consent/stage32/email/flow.ts`
- `src/consent/stage32/email/normalize.ts`
- `src/consent/stage32/email/policy.ts`
- `src/consent/stage32/email/reconciliation.ts`
- `src/consent/stage32/email/reconstruct.ts`
- `src/consent/stage32/email/tokenizer.ts`
- `src/consent/stage32/email/types.ts`
- `src/consent/stage32/hardening/EvaluationPanel.tsx`
- `src/consent/stage32/hardening/ReviewPanel.tsx`
- `src/consent/stage32/hardening/SpeechPanel.tsx`
- `src/consent/stage32/hardening/consentMatrix.ts`
- `src/consent/stage32/hardening/corpus.ts`
- `src/consent/stage32/hardening/naturalFlow.ts`
- `src/consent/stage32/hardening/outcomes.ts`
- `src/consent/stage32/hardening/parser.ts`
- `src/consent/stage32/hardening/preflight.ts`
- `src/consent/stage32/hardening/remediationScenarios.ts`
- `src/consent/stage32/hardening/requestJournal.ts`
- `src/consent/stage32/hardening/resolution.ts`
- `src/consent/stage32/hardening/review.ts`
- `src/consent/stage32/hardening/scenarios.ts`
- `src/consent/stage32/hardening/simulator.ts`
- `src/consent/stage32/hardening/speech.ts`
- `src/consent/stage32/main.tsx`
- `src/consent/stage32/recognition.ts`
- `src/consent/stage32/session.ts`
- `src/consent/stage32/speech/plans.ts`
- `src/consent/stage32/vite.config.ts`
- `stage20c32.html`
- `tests/consent-stage20c32-email.test.ts`
- `tests/consent-stage20c32-hardening.test.ts`
- `tests/consent-stage20c32-remediation.test.ts`
- `tests/consent-stage20c32-speech.test.tsx`

## Acceptance and stop point

Human Danish listening/pronunciation, five live microphone/ASR cases, acoustic email recovery,3–5representative local conversations, physical timing and relevant business policies remain pending. No synthetic result is physical acceptance evidence. No live provider/mic test or Asem test was performed. No historical audit/report was regenerated.

Next action: user reviews this verification and separately authorizes any commit/push. No publication or PR action is implied.

READY TO COMMIT — C-3.2 HUMAN RETEST CANDIDATE

C-3.2 remains NOT ACCEPTED / NOT PRODUCTION READY.
