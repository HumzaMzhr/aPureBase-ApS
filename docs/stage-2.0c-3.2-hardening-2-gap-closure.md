C-3.2 hardening 2 — engineering gap closure

NOT ACCEPTED / NOT PRODUCTION READY. Historical strict audit remains unchanged. Closure below is engineering/documentation closure only.

## GAP-001 — CLOSED

Original IMPORTANT finding: StructuredEmailSession default policy={} falls back to reconstructEmail/resolveEmail. Only simulator injects parseEmailEvidence/resolveEvidence. Repeated identical address fails default session but succeeds explicit hardened session.

Default and simulator now share the frozen policy. Public constructor rejects hidden parser overrides. No Stage 1/C31 behavior changed.

Implementation: `src/consent/stage32/email/policy.ts` — hardenedEmailPolicy:4; `src/consent/stage32/email/flow.ts` — EmailAcquisition:21; `src/consent/stage32/session.ts` — StructuredEmailSession:13.

Exact regression(s): `public/default path %s` (tests/consent-stage20c32-remediation.test.ts:24); `public constructor refuses a hidden policy override rather than falling back` (tests/consent-stage20c32-remediation.test.ts:67).

Evidence: `docs/stage-2.0c-3.2-hardening-2-email-resolution-report.json`.

Limit: Acoustic recognition remains unverified.

## GAP-002 — CLOSED

Original BLOCKING finding: boundedRecords checks truthiness only for recordVersion/sourceRecordId. Audit probe accepted object-valued metadata. Existing malformed tests cover empty/wrong contact/too many rows, not these types.

Exact bounded runtime shapes reject malformed scalar metadata, unknown fields, scope/contact mismatch and excessive rows. Future receipt adds provenance/time/revision. Host identity/authority/consent remain unchanged.

Implementation: `src/consent/stage32/email/databaseResolver.ts` — boundedRecords:10; `src/consent/stage32/email/databaseResolver.ts` — validateLookupReceipt:20.

Exact regression(s): `${field} rejects malformed scalar #%s` (tests/consent-stage20c32-remediation.test.ts:7); `malformed provenance never changes consent/authority/identity or stores an email` (tests/consent-stage20c32-remediation.test.ts:27); `equivalent valid lookup scope is independent of JSON property order` (tests/consent-stage20c32-remediation.test.ts:70).

Evidence: `docs/stage-2.0c-3.2-hardening-2-email-resolution-report.json`.

Limit: Synthetic fixtures only; no production DB integration.

## GAP-003 — CLOSED

Original IMPORTANT finding: runEmailCase hard-codes autoAccepted:false and finalStoredAddress:null. falseAutoAccepts therefore cannot become nonzero under a flow-storage regression. PARTIAL/INTERRUPTED/STALE corpus sources gate a boolean outside actual session. Eight valid local scenarios and separate ownership tests are real but do not exhaust adversarial storage outcomes.

All 66 retained corpus cases drive actual public sessions. Snapshot-derived stored value, review, confirmation and ownership determine counters. Unsafe ambiguous storage test double yields 1 false accept and 1 ambiguous selection; gate throws.

Implementation: `src/consent/stage32/hardening/outcomes.ts` — measureOutcome:6; `src/consent/stage32/hardening/outcomes.ts` — safetyMetrics:13; `src/consent/stage32/hardening/corpus.ts` — runEmailCase:79.

Exact regression(s): `TEST ONLY unsafe snapshot double makes both safety metrics nonzero and trips the gate` (tests/consent-stage20c32-remediation.test.ts:26); `positive complete local outcome is observed, not an always-empty metric` (tests/consent-stage20c32-remediation.test.ts:25); `public corpus metrics are actual observed outcomes` (tests/consent-stage20c32-remediation.test.ts:30).

Evidence: `docs/stage-2.0c-3.2-hardening-2-email-resolution-report.json`, `docs/stage-2.0c-3.2-hardening-2-scenario-results.json`.

Limit: Corpus submission cases stop before recipient confirmation; positive complete scenarios separately observe real local storage. No acoustic hallucination detector is claimed.

## GAP-004 — CLOSED

Original IMPORTANT finding: preflightStatus is referenced by its unit test only. prepareC32Recognition uses old ASRPreflight; workspace has no displayed/connected new six-state preflight or capture lifecycle.

Existing recognition lifecycle feeds subclass/callback; workspace exposes actual injected inputs and underlying transport checks. Wrong backend health never becomes READY. No capture/transport is opened by construction.

Implementation: `src/consent/stage32/hardening/preflight.ts` — EvaluationPreflight:8; `src/consent/stage32/recognition.ts` — prepareC32Recognition:10; `src/consent/stage32/hardening/EvaluationPanel.tsx` — EvaluationPanel:7.

Exact regression(s): `actual recognition composition notifies READY only after injected capture and ready; stopped is no longer READY` (tests/consent-stage20c32-remediation.test.ts:46); `invalid backend health never becomes READY despite injected transport events` (tests/consent-stage20c32-remediation.test.ts:68).

Evidence: `docs/stage-2.0c-3.2-hardening-2-validation.txt`.

Limit: READY transport status is distinct from completion of five microphone/scenario gates; injected READY never verifies live ASR.

## GAP-005 — CLOSED

Original IMPORTANT finding: HumanReviewEvidence.microphone accepted PASS observation with unknown testId, absent final/materialErrors. shape rejects extra fields but does not require required fields/types. Manual form is honest/self-reported, but serialized contract can silently omit required finalization/errors.

Exact plain shapes, required fields, bounded IDs/enums, boolean and timing checks fail closed. Linked PASS requires corresponding source reviewer PASS. Legacy complete manual observation remains labeled SELF_REPORTED.

Implementation: `src/consent/stage32/hardening/review.ts` — HumanReviewEvidence:8.

Exact regression(s): `missing %s cannot serialize PASS` (tests/consent-stage20c32-remediation.test.ts:37); `${field} malformed #%s fails` (tests/consent-stage20c32-remediation.test.ts:38); `incomplete invalid PASS %j fails` (tests/consent-stage20c32-remediation.test.ts:39); `linked partial/final differences are retained, and pending reviewer decision cannot export a mic PASS` (tests/consent-stage20c32-remediation.test.ts:69).

Evidence: `docs/stage-2.0c-3.2-hardening-2-validation.txt`.

Limit: No reviewer authentication or provider authenticity is inferred.

## GAP-006 — CLOSED

Original IMPORTANT finding: ReviewPanel records manual raw/final/latency/error observations and separate manual inspector rows. No mic-result→email-inspection/correction association, source session/provider/endpoint timing or recovered-correctly field; natural-call pane is elapsed-time entry only. It does not run the complete C32 flow.

Injected actual controller or imported independently authorized diagnostics retain session/turn/revisions, raw/final, tokens, candidates, deterministic result, correction lineage, timing, errors and decision. Full controller state is inspectable. Absent provider/endpoint/latency remains null; import is unverified.

Implementation: `src/consent/stage32/hardening/review.ts` — EvidenceChain:5; `src/consent/stage32/hardening/EvaluationPanel.tsx` — EvaluationPanel:7; `src/consent/stage32/hardening/ReviewPanel.tsx` — ReviewPanel:10.

Exact regression(s): `valid observations and complete linked correction preserve unknown provider and immutable raw evidence` (tests/consent-stage20c32-remediation.test.ts:40); `missing or mismatched linked source cannot attach to microphone result` (tests/consent-stage20c32-remediation.test.ts:42); `linked provider IDs must be nonempty and resolution must be a bounded enum` (tests/consent-stage20c32-remediation.test.ts:71).

Evidence: `docs/stage-2.0c-3.2-hardening-2-scenario-results.json`.

Limit: Real microphone tests and recovered-correctly judgments remain pending. Human evidence never becomes production consent.

## GAP-007 — CLOSED

Original IMPORTANT finding: naturalFlow is an exported descriptor with no consumers; simulator hard-codes150ms and separate counters. AS follows same branch asA without reading config. GreenAS does not verify config changes preserve behavior.

Simulator consumes validated pace/thinking/speech/operator configuration; AS differs from A by configured pace. Timings separate media, recipient, transitions and operator including authority review. No padding or changed voice speed.

Implementation: `src/consent/stage32/hardening/naturalFlow.ts` — evaluationFlow:3; `src/consent/stage32/hardening/simulator.ts` — syntheticCall:8; `src/consent/stage32/hardening/scenarios.ts` — runScenario:11.

Exact regression(s): `changed pace changes transition component exactly, not media/speech or guards` (tests/consent-stage20c32-remediation.test.ts:49); `invalid config %j fails closed` (tests/consent-stage20c32-remediation.test.ts:50); `barge-in and stale output remain interrupted under changed pacing` (tests/consent-stage20c32-remediation.test.ts:51).

Evidence: `docs/stage-2.0c-3.2-hardening-2-duration-report.json`, `docs/stage-2.0c-3.2-hardening-2-scenario-results.json`.

Limit: Physical/network delay is unknown, not zero; subjective naturalness is pending.

## GAP-008 — CLOSED

Original IMPORTANT finding: 49 consent assets have detailed matrix; other237 only aggregate format/alignment/raw clipping/all-silent stats. Their durations, individual silence bounds, duplicate-byte groups and unexpectedly-short/truncated assessment are absent.12 streaming headers stay UNKNOWN.

All 286 available WAVs have individual technical rows: 49 manifest-bound assets and 237 anonymous hash-keyed rows. Twelve indefinite headers explicitly have UNKNOWN duration/completion. File bytes are never copied into reports.

Implementation: `scripts/stage20c32-hardening-qa.ts` — inspectWave:18; `scripts/stage20c32-hardening-qa.ts` — technicalAudioQA:9.

Exact regression(s): `GAP-008 per-file QA contract covers closed and indefinite containers; full inventory runs outside Vitest workers` (tests/consent-stage20c32-remediation.test.ts:65).

Evidence: `docs/stage-2.0c-3.2-hardening-2-audio-qa.json`.

Limit: Technical shape/silence/peak heuristics cannot establish native pronunciation or intended semantic completeness.

## GAP-009 — CLOSED

Original DOCUMENTATION_ONLY finding: Hardening impact matrix explains unchanged/retest components but does not enumerate SUPERSEDED predecessor→current evidence or use all four required categories. Old unsuffixed guide/inventory remain historical and need explicit current-index linkage.

Exactly four categories: STILL_VALID 24, RETEST_REQUIRED 13, SUPERSEDED 12 with predecessor/replacement hashes, NOT_YET_TESTED 4 groups. Current guide is prominent; historical guides/audits remain immutable.

Implementation: `scripts/stage20c32-hardening2-reports.ts` — minimumDelta:27; `src/consent/stage32/Workbench.tsx` — HISTORICAL:14.

Exact regression(s): Direct four-category/hash/version/content and current-workspace inspection; report generator and preservation checks. No artificial test count..

Evidence: `docs/stage-2.0c-3.2-hardening-2-acceptance-index.json`.

Limit: Minimum next human delta is prepared only; no request to Asem was sent.

## GAP-010 — CLOSED

Original IMPORTANT finding: Reports assert0 but no complete provider/network usage ledger or external billing/request inventory is available. Code and audit fixtures support zero for this audit; they cannot prove absence of all historical calls. No unexpected provider activity was observed.

Current run is zero, repository declarations remain repository evidence, historical external totals remain UNKNOWN. Future metadata/hash-only journal bounds provider/endpoint/model/voice/characters/result/retry/cost and records before/after explicit mock work. No transport installed.

Implementation: `src/consent/stage32/hardening/requestJournal.ts` — RequestJournal:4; `src/consent/stage32/hardening/requestJournal.ts` — journalRequest:10.

Exact regression(s): `is empty/inert; retains only receipt metadata and unknown external history` (tests/consent-stage20c32-remediation.test.ts:55); `future explicitly invoked mock transport is journaled before/after; zero real transport is installed` (tests/consent-stage20c32-remediation.test.ts:63).

Evidence: `docs/stage-2.0c-3.2-hardening-2-provider-usage.json`.

Limit: No historical external ledger exists; UNKNOWN is not changed to zero. Original instruction is qualified by remediation section 12.
