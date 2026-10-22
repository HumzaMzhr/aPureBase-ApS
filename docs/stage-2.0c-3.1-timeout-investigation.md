# Stage 2.0C-3.1 — timeout investigation and harness correction

**Recommendation: READY TO COMMIT the human retest candidate. Stage C-3.1 remains NOT ACCEPTED / NOT PRODUCTION READY.** No commit, push, PR update, merge, deploy, provider request, audio generation or Stage 2.0D activity occurred in this investigation.

## Evidence preservation and runtime

The original `/tmp/c31-finalize-tests.txt` is untouched. Its exact UTF-8 content is preserved in `stage-2.0c-3.1-timeout-investigation/original-full-suite.json` (re-encoding the content reproduces every original byte); `original-full-suite.txt` is a readable view with trailing empty EOF lines removed only. SHA-256: `fdafb13be062ccf70f2dd83f838edb01f79e02c99692f31c21c8baecc1fc7a73`. All historical reports, including the original C-3.1 preservation and validation files, remain unchanged. New evidence is separate.

Original command: `npm test` → `vitest run`. Node v25.9.0, npm 11.12.1, Vitest 4.1.11. macOS/Darwin27.0.0 arm64, AppleM3, 8 available CPUs, 16GiB RAM. Initial investigation load averages were4.82/5.36/4.75; point-in-time free memory was160,382,976 bytes. Process samples after the failure included a virtualization process81.8% CPU, mediaanalysisd51.0%, and WindowServer31.5%. These samples demonstrate competing work at investigation time; they do **not** retrospectively prove OS pressure/swapping at the exact failed instant. See runtime.json/process-sample.txt.

Vitest config only sets test inclusion. Installed defaults resolve to forks, isolate=true, file parallelism=true, 7 workers (`availableParallelism()-1`), per-test wall limit5000ms, hook limit10000ms, and retries0. Neither affected file uses concurrent tests. No timeout, worker configuration, fake-clock rate or production timer was changed.

Original failures: replay(before)5286ms, replay(after)5021ms, PCM11859ms. A synchronous assertion can block the event loop beyond the nominal5-second limit before the runner can deliver its timeout. These are test-runtime durations, not latency measurements of the product.

## Root cause and confidence, independently for each failure

| Failure | Exact timing dependency and observed cost | Finding / limit |
| --- | --- | --- |
| Replay(before) | `advanceTimersByTimeAsync(218649)` executes recorded semantic events, asynchronous translations and synthetic PCM through unchanged production delivery. Profile observed14,314 renderer10ms, 2,852 voice50ms and2,186 lag100ms interval callbacks, plus one-shot timers. The installed fake-timer implementation yields through native setImmediate after each async timer, so virtual time still consumes real CPU/event-loop turns. | Existing resource-sensitive replay harness. Original timeout stack does not identify the precise awaited instruction; phase profiling puts nearly all execution in fake-clock advancement (~0.99s unloaded). Resource contention is the supported explanation, not a reproduced deterministic production defect. |
| Replay(after) | Same218.649-second virtual timeline/19,352 interval callbacks/native yields; greeting lookup is the existing local catalogue, not live translation. Profile advance ~0.97s unloaded. | Same existing wall-clock sensitivity. No reproducible C-3.1 logic or shared-state failure. Replay test and all delivery/recognition production dependencies are byte-identical to a5b7054. Exact historical scheduling contribution is inferred rather than retrospectively measured. |
| 45-second PCM | Actual local WebSocket batches and mock-provider callbacks;45 seconds means450 frames ×4800bytes, **not45 seconds of real waiting**. Profile: PCM loop17.8ms, finals available120.6ms, then generic `toEqual` of2,160,000 bytes costs2123.8ms and expands memory to ~962.5MB RSS/698.2MB heap. Native exact comparison costs5.19ms, ~95.5MB RSS/20.1MB heap. | Confirmed oversized generic-assertion CPU/allocation hotspot. This is the concrete harness defect removed. Together with7 worker files/OS load it is a credible contributor to all three failures. Original failed execution had no CPU/heap profile, so the exact share of each historical deadline cannot be claimed. |

No test waits for an actual provider. Replay uses fake timers and stub fetch/WebSocket/AudioContext, with local asynchronous report writes and cleanup. PCM uses a real loopback socket plus injected EventEmitter provider; its final waits poll in real time. Profiling separates fast transport/promise delivery from slow byte equality. Cleanup remains real socket termination/server close, and all existing cleanup assertions remain. No evidence of a stuck cleanup, abort leak or missing final was reproduced.

Classification: **A (transient/runtime contention) plus an existing test-harness timing/allocation weakness (D in the harness, not a demonstrated Stage1 production weakness)**. B is present as file-level resource competition, but there is no evidence of cross-file global/env/mock leakage. C was not found: affected imports and production code are unchanged, and the same unmodified candidate passes all1,114 tests before any correction. This is not proof that any imaginable regression is impossible; it is the conclusion supported by the observed runs and profiles.

## Initial unmodified isolation: three repetitions of each, no timeout changes

Each command selected one exact test via `--testNamePattern`; sequential invocations avoided adding artificial contention. Full exact argv, load, exit status and Vitest per-test duration are in pre-runs.json. The after case retains its existing dependency on the deterministic before-report generated by the preceding before runs; the test pair was not rewritten to hide that dependency.

| Unmodified isolated case | Run1ms | Run2ms | Run3ms | Result |
| --- | --- | --- | --- | --- |
| Replay(before) | 978.919 | 976.887 | 989.148 | 3/3 PASS |
| Replay(after) | 982.450 | 989.135 | 982.147 | 3/3 PASS |
| 45-second PCM | 2516.981 | 2624.509 | 2594.903 | 3/3 PASS |

The three affected tests were then selected together in three separate invocations, using the same default configuration:

| Unmodified combined sample | Before ms | After ms | PCM ms | Result |
| --- | --- | --- | --- | --- |
| pre-combined-1 | 1338.977 | 1233.187 | 2773.562 | 3/3 PASS |
| pre-combined-2 | 1312.940 | 1327.919 | 2877.683 | 3/3 PASS |
| pre-combined-3 | 1525.224 | 1206.890 | 2918.887 | 3/3 PASS |

The failures are **not deterministic**: all18 selected pre-fix observations passed (9 isolated +9 combined). These are investigation samples, not Vitest retries. No failed attempt was discarded.

## Safe baseline comparison and C-3.1 influence

Baseline `a5b70549484e560351dcb2f8e2513c26ac9b2eaf` was materialized with `git archive` under `/tmp/c31-timeout-baseline-a5b7054`. It has no copied .env, no reset/checkout of the user's work, and shares the already installed node_modules without installing or contacting providers. Full baseline result: **1,013/1,013 PASS**, including replay(before)1359.083ms, replay(after)1638.872ms, PCM3866.026ms. The baseline did not reproduce the failure at the sampled load; therefore no claim is made that baseline failures were observed.

Before changing the harness, current C-3.1 also passed **1,114/1,114** (replay945.904/1213.271ms, PCM3160.364ms). This passing control is retained, not described as a code fix. It supports flakiness and establishes that a green rerun alone would not diagnose the original failure.

Inspected the entire existing C-3.1 source diff and the two test imports. `stage195-replay`, `continuous-transcription-gateway`, streaming engine/localOutput/voiceClient/scheduler, incremental translation, server continuous/live transcription, package/lock and Vitest config all matched the original a5b7054 hashes before correction. No affected import reaches consent corrections/Workspace or server/consentRetest. C-3.1's diagnostics/preflight attaches the unchanged gateway only to its own explicitly constructed local server; it does not patch the gateway or start a server/provider on module import. Its test uses injected loopback providers and closes its server in finally. Fork/file isolation keeps its env and mocked globals outside the original gateway/replay test workers.

Additional C-3.1 test/transformation work can consume CPU/memory alongside unrelated files, but related filenames alone are not causal evidence. No production change is justified. The original timeout was not a6-second ElevenLabs gap, recognition stall, ASR schema problem or physical latency regression.

## Smallest correction and exact changed implementation files

1. **`tests/continuous-transcription-gateway.test.ts`**: replace generic deep equality of the concatenated2.16MB PCM buffers with `Buffer.equals` and an explicit `received.byteLength ===45*24000*2` assertion. Still verifies450 frames, every received byte in exact order, all15 generation/text finals, no gateway errors and no premature upstream termination. No hashing/sampling, relaxed expectation, skip, removal, retry or timeout increase. The replay file, all callbacks/timers/streams and production code remain untouched.
2. **`scripts/verify-stage20c31.ts`**: allow a separately recorded, strictly bounded preservation extension for exactly this test file and the verifier itself. The extension checks the original preservation file's SHA plus each original pinned/new hash, rejects other paths/duplicates and still verifies all historical/candidate production/media hashes. This is necessary because an intentional test-only correction changes the prior pinned gateway-test hash. It does not rewrite the historical proof or silently exclude the test.

New `harness-preservation.json` lists both exact before/after hashes. `original-verifier.txt` retains the previous verifier source. No historical report/audio/manifest was edited. The nine production-consent changes from the earlier C-3.1 implementation are unchanged; this investigation adds **no production-code change**.

The profile comparison was performed in a separate disposable baseline copy with phase/callback counters only. The old assertion measured2123.795ms; the equivalent native assertion measured5.194ms. RSS/heap figures are point-in-time process observations rather than a peak-memory profiler. No profiling instrumentation was added to the actual tests or application.

## Post-correction isolation and combined repetitions

| Corrected isolated case | Run1ms | Run2ms | Run3ms | Result |
| --- | --- | --- | --- | --- |
| Replay(before), unchanged | 933.975 | 917.338 | 924.416 | 3/3 PASS |
| Replay(after), unchanged | 912.824 | 915.856 | 939.051 | 3/3 PASS |
| 45-second PCM, native equality | 187.184 | 188.777 | 188.510 | 3/3 PASS |

| Corrected combined sample | Before ms | After ms | PCM ms | Result |
| --- | --- | --- | --- | --- |
| post-combined-1 | 920.873 | 956.415 | 185.194 | 3/3 PASS |
| post-combined-2 | 937.498 | 960.269 | 183.612 | 3/3 PASS |
| post-combined-3 | 931.769 | 1110.860 | 184.886 | 3/3 PASS |

All18 post-fix selected observations passed with the **same default5-second deadline and7-worker policy**. The corrected isolated PCM case drops from2.52–2.62s to0.187–0.189s. Replay logic/assertions remain unchanged.

## Final revalidation

Three complete-suite samples were planned before execution, run serially, with retries0. A failure would have stopped that validation sequence. All passed; no failed result was retried or suppressed.

| Full-suite sample | Result | Command wall ms | Before ms | After ms | PCM ms |
| --- | --- | --- | --- | --- | --- |
| final-full-1 | 1114/1114 PASS | 8813.253 | 1032.490 | 1139.550 | 190.009 |
| final-full-2 | 1114/1114 PASS | 6130.574 | 990.593 | 1099.572 | 173.927 |
| final-full-3 | 1114/1114 PASS | 6281.257 | 967.689 | 1078.877 | 173.035 |

- Focused C-3/C-3.1: **139/139 PASS** in5 files.
- Full suite: **1,114/1,114 PASS** in77 files, three complete samples.
- Lint: PASS. Typecheck: PASS. Build: PASS, unchanged >500kB chunk warning. Build output chunks match the previous application candidate.
- `git diff --check`: PASS for the current work. Separate new-text whitespace audit: PASS. Historical warnings/artifacts were not rewritten.
- Preservation verifier: PASS with the explicit two-file harness extension. All433 baseline entries and44 original candidate entries remain checked; all except the one intentional legacy test/two-file candidate overlay retain their previous exact hashes.
- Stage1.9.6 **production implementation** unchanged. Original replay test unchanged; gateway test changed only in its byte assertion. All37 original WAVs and12 C-3.1 WAVs unchanged; generation journal unchanged at12 historical requests/1308 characters/12 success/0 failure/0 retry.
- New provider requests/audio generation: **0**. Source PCM is not saved. No credentials/.env introduced; no new recording files added. No PR/GitHub write, commit, push, merge, deploy or Stage2D.

Full validation output is in the new timeout-validation.txt and per-run evidence directory; readable text views normalize empty EOF lines only. The original failure content is preserved exactly in the JSON container. Exact added evidence paths/hashes are indexed separately; historical C-3/C-3.1 reports are untouched.

## Recommendation and remaining boundaries

**READY TO COMMIT the bounded C-3.1 HUMAN RETEST CANDIDATE**, when the user next authorizes finalization. Do not claim that the original OS scheduling state was captured or that arbitrary overloaded machines can never exceed a wall-clock limit. The measured resource hotspot is corrected, the original assertions remain strong, and all required current checks pass without changing timer/worker budgets.

C-3.1 remains **NOT ACCEPTED / NOT PRODUCTION READY**. Danish listening, five real-microphone ASR smokes and physicalA–R remain pending. Test-runtime improvement is not evidence of physical recognition, pronunciation or call-latency improvement. This investigation stops without committing or publishing.
