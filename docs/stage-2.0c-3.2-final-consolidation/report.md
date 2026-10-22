# Final C-3.2 consolidation — validated human retest candidate

**NOT ACCEPTED / NOT PRODUCTION READY.** The user authorized publication and merge for human testing, not production acceptance or deployment.

The candidate consolidates the source-based aPureBase UI, frozen clinic-spoken email architecture, three existing C32 pronunciation assets and Hardening-2 safeguards. Final consolidation adds the missing visible optional model-advice stage, explicit REQUIRED HUMAN REVIEW / OPTIONAL DIAGNOSTIC REVIEW labels, and a repository-only launcher. Baseline package.json, README, .gitignore, Stage 1.9.6, consent wording/eligibility/authority and historical recordings/reports remain unchanged.

## Fresh exact-source validation

| Check | Result |
|---|---|
| C32 focused (11 files) | 668/668 PASS |
| C31 regression | 139/139 PASS |
| Prior consent | 496/496 PASS |
| Full suite, three independent runs | 1,788/1,788 PASS each |
| Replay hotspot, five independent runs | 2/2 PASS each |
| PCM hotspot, five independent runs | 1/1 PASS each |
| Email corpus | 66/66 PASS |
| DB/model cases | 18/18 PASS |
| Consent matrix | 29/29 PASS |
| Scenario corpus | 46/46 + 32/32 PASS |
| Original/current audio QA | 52/52 PASS |
| Lint / typecheck / standard build / C32 build / Human UI build | PASS |
| C31 preservation / current layered preservation / whitespace | PASS |
| Credential and file inventory inspection | PASS |

Preserved raw text exports have exact-path whitespace exemptions in .gitattributes; historical-whitespace.json records their unchanged hashes and diagnostics. Source/new-report checks remain enabled; new result logs have trailing blank output lines normalized. No assertions/timeouts/concurrency settings were weakened; no rerun-on-failure wrapper was used. Three full runs and five hotspot runs are independent requested repetitions, not retries. Commands, elapsed time and logs are in validation/. The nonfatal Vite >500 kB warning remains.

False email auto-accepts = 0; ambiguous automatic selections = 0; consent false positives = 0. The deliberately unsafe test-only result produces counters 1/1 and the safety gate rejects it. Full-email readback reachable in C32 normal calls = **0**. Machine-readable proof is reachability.json, backed by normal sequence and API bypass regressions.

## Assets and review

All 52 protected recordings are byte-identical (37 originals + 12 C31 + 3 C32). Current bindings remain:

- Why Calling: b2d46752a12b82aedce1b19be0681e536eaaa26b382d1f3a28edfa4258cff2ff
- Success Close: e72d65aabdc5ecb1223de5311c3d0fa687588309f0191832bd328984179ad908
- Clarify: 55e255476384ad077184102aedf4dcfecdeb865974e3346ab2cadefcb292f420

Native approval remains pending; old ratings do not approve new bytes. Technical QA has zero raw/rendered clipping; existing peak protection is retained and reported separately. Twelve normal-call listening items are required; four spelling diagnostics are optional and excluded from normal counts. No complete address is spoken in normal capture/correction. The UI displays seven separate evidence stages; it does not authorize TTS from displayed text. Real CRM/LLM transport is not installed; local synthetic corroboration stays explicitly labeled. A plausible provider hallucination cannot be disproved by text parsing alone.

All five screens were navigated without starting capture or entering human ratings; screenshots are in screens/. Source-based lime #C2CD23, white #FFFFFF, grey #5F5F5F, dark text #333333, focus #626A12, original wordmark and molecular imagery are retained. Contrast/semantic presentation regressions pass. Screens were captured before the final terminal-stop footer wording clarification; final SSR and build checks include that clarification.

## Run from Git

Follow [Asem's current Git retest guide](../STAGE-2.0C32-ASEM-GIT-RETEST.md). After pulling main:

```bash
npm ci
node --import tsx scripts/stage20c32-run.ts
```

Open http://127.0.0.1:5173/. Node 25.9.0 is the validated runtime. The launcher rebuilds ignored dist/c32-human-retest from repository sources, verifies cached hashes, uses installed Node and serves only loopback. No ZIP/runtime download/ElevenLabs key is needed. Stop with Ctrl+C. Authorized live ASR keys are configured privately outside Git with `bash scripts/stage20c32-handoff/Configure-ASR.command`; only manual Start arms ASR. Agent verification used ASR-disabled mode.

## Remaining gates

Danish human listening, live microphone/ASR and email correction, physical natural calls, actual timing and returned-evidence review remain pending. Business gates: eight-day mechanism/start event, consent effectiveness, suppression, system of record, retention, recording authorization, unsubscribe mechanism, stored-email shortcut and intermediary authority. C32 concise confirmation is frozen for this experiment. Full-call recording is NOT_IMPLEMENTED / BUSINESS_DECISION_REQUIRED. There is no production CRM/telephone integration or deployment.

No external provider requests, new audio, live ASR, telephone calls, ZIP creation, deployment or Stage 2.0D work occurred during consolidation. Historical screenshots, source references and validation logs contain archival path metadata; no private temporary build directories, ignored private recordings, credentials or ZIP artifacts are committed.

The pre-merge and merge SHAs are recorded in the final response and PR rather than self-referentially in this pre-commit report. Current source proof and preservation layers remain valid after HEAD advances because they pin content and immutable ancestry, not an obsolete equality check.
