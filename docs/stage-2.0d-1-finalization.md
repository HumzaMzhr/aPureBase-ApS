# D-1 final verification — 23 October 2026

Candidate branch: `codex/stage-2.0d1-twilio-foundation`.
Frozen C-3.2 baseline and fetched main before publication: `a25618abd4444e82b393d41026b62273e751336a`.

The initial 81-file implementation matched every non-self hash in its recorded manifest. This finalization adds this record and `STAGE-2.0D2-PREFLIGHT-PLAN.md`, for an intended **83-file** commit. No production code, test assertion, timeout, concurrency configuration, source recording or previously committed historical evidence was changed during finalization. The staged diff check additionally detected excess final blank lines in 23 new D-1 evidence logs; these were normalized to one final newline without changing any diagnostic or result text. Original copies were retained privately. `stage-2.0d-1-files.json` now describes the complete 83-file final payload; other implementation-time reports retain their original 81-file snapshot count.

## Independent automated verification

Node 25.9.0; npm 11.12.1; macOS. Serial commands ran against an isolated copy using `scripts/stage20d1-validate.ts`, with source hashes checked against the working candidate. No failed command was retried to manufacture a pass.

| Check | Result |
| --- | --- |
| D-1 focused: scenarios, signatures, protocol, conversion, ownership, interruption, concurrency, terminal state, UI | 102/102 |
| C-3.2 | 723/723 |
| C-3.1 | 139/139 |
| Prior consent | 496/496 |
| Complete suite | 1,945/1,945 on each of three independent runs; 96 test files per run |
| Replay hotspot | 2/2 on each of five runs |
| PCM hotspot | 1/1 on each of five runs |
| Lint / typecheck / standard build | PASS |
| D-1 Operations and preserved QA package build | PASS |
| Preservation / diff check | PASS |

Fresh execution of `stage20d1-evidence.ts` in the disposable copy passed email 66/66, database/model adversarial cases 18/18, consent matrix 29/29, existing scenarios 46/46 + 32/32, and mocked telephony A–R 18/18. The unsafe database/model negative control was detected. All ten required safety counters remain zero: false email accepts, ambiguous automatic selections, consent false positives, normal-path full-email readback, consent from interrupted question, completed playback after interruption, stale provider mutation after end, duplicate final transcript entries, automatic redials and provider failure reported as success.

All 54 frozen recordings remain byte-identical. All 34 production-path assets selected for mocked telephone playback pass deterministic source-to-mu-law conversion, frame ownership and zero-conversion-clipping checks. Historical calibrated source peak-protection events remain preserved; no new conversion clipping or peak-protection event is introduced. Physical hearing and telephone quality are unverified.

Preservation verifies all 996 protected baseline files, with only the eight documented integration hooks allowed. Canonical Danish, synthesis bindings, email policy, consent safeguards, branding and default Human Acceptance behavior remain preserved. The adapter uses the unchanged controller and transcript contract.

## Dependencies, protocol and hygiene

Twilio remains pinned to `6.2.0`; package and lock root declarations match. A disposable `npm ci --dry-run --ignore-scripts --no-audit --no-fund` passes. An initial offline-only metadata check could not resolve an uncached npm registry entry (`ENOTCACHED`); this was a cache limitation, not a lockfile inconsistency. The successful dry run used npm registry metadata only and did not execute package scripts or provider calls.

The official sources in `stage-2.0d-1-twilio-source-review.md` were rechecked on 23 October: outbound Calls, bidirectional Connect/Stream, base64 raw mono 8 kHz mu-law, matching marks, clear-returned marks, WSS/custom parameters and SDK signature validation using the exact URL and all form parameters. No protocol change was justified. A returned mark is provider playback evidence, not proof of physical hearing.

All proposed publication files were inspected for prohibited paths, whitespace and credential/telephone-number patterns. No private environment values, keys, real account identifiers, real telephone numbers, private review exports, generated call audio, ignored cache, screenshots or local build output are included. `.env.example` contains placeholders only. Synthetic tokens and constructed reserved test destinations are fixtures, not real contacts or credentials.

The physical executor remains sealed and throws even if supplied with a request. The local host exposes no dial or live recognition route; tests inject ASR/mock transport ports and read existing WAVs. No external provider executor was instantiated by finalization. Twilio call creation, physical calls, ElevenLabs generations, OpenAI live ASR, new audio generation and deployment are all **zero**. External reads were official documentation, npm metadata and Git/GitHub verification/publication activity only.

Existing nonfatal Vite chunk-size advice remains visible; it does not change the test/build outcome. No claim of production readiness or physical acceptance is made.

## Publication and next boundary

The final commit, tree, remote identity, new PR, check result and merged frozen SHA must be recorded by the publication step after exact-tree verification. This document does not claim those future actions have happened. Publication approval, if requested by automatic review, must precede the public push. Merge requires the intended PR head and passing latest checks; no administrative bypass is allowed.

D-2 remains a separate task. Its plan is documentation only. Before any physical call, require private provider configuration, validated public HTTPS/WSS readiness and fresh explicit authorization for Humza's private destination, supervised purpose, maximum one call, zero retries/redials and finite expiry. No D-2 execution or deployment is authorized here.

Fresh local logs: `/private/tmp/d1-validation-XWegJz/`; machine-readable command results: `results.json`; independent safety/audio output: `/private/tmp/d1-finalization-evidence.txt`. Those disposable logs are deliberately excluded from the public commit; preserved implementation-time logs remain in the original D-1 evidence directory.
