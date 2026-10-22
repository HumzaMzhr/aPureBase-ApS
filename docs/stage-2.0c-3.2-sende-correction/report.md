# C32 bounded sende pronunciation correction

HUMAN RETEST CANDIDATE — NOT ACCEPTED / NOT PRODUCTION READY.

The submitted `aPureBase-C32-Asem-Human-Retest.json` identifies the reviewer as **Humza**. Its SHA-256 is `d3a2804f8c9b47a0dceb33657d1eed62b80ae74084109a709fd4e7c81ca71084`. The private original remains in Downloads, unchanged and outside Git. Eleven of the twelve required clips passed; Why Calling failed pronunciation (2/5). The request was to render “senne” for “sende” in Why Calling and Clarify (the latter passed with a correction comment). This is not Asem approval, and no rating transfers to new bytes.

## Changes

Only the synthesis inputs for these two exact phrases replace one word, `sende` → `senne`. Displayed/canonical Danish, channel, permission, recipient and scope remain unchanged. The existing `a Pure Base` synthesis alias and punctuation remain. The new plan is separate from the historical general synthesis validator; there is no global replacement dictionary, ASR correction, email rule or invented recognition text.

| Phrase | New audio SHA-256 | Previous audio SHA-256 | Seconds | Submitted characters |
|---|---|---|---:|---:|
| Why Calling | `e42efb01c72e78f97a5c19de443e898637af5c0e55f3ec41429d206474b59faa` | `b2d46752a12b82aedce1b19be0681e536eaaa26b382d1f3a28edfa4258cff2ff` | 5.851417 | 96 |
| Clarify | `5206820f9e531c97823a92dbbf3fcfee92c50fe6ff82e78e61846f48e9f0e06b` | `55e255476384ad077184102aedf4dcfecdeb865974e3346ab2cadefcb292f420` | 5.015500 | 82 |

Two ElevenLabs requests succeeded, with zero failures/retries. Exactly **178 source characters were submitted**, not a claim about charged billing units. The response `character-cost` headers were 21 and 18; receipts are retained in `requests.jsonl`. No OpenAI or recognition request was made. The exclusive durable generation journal prevents repeating this batch; the asset pack is installed only after both verified generations succeed.

Isabella, `eleven_flash_v2_5`, speed 0.95 and local gain **3.5573605757216837** remain fixed. Both new clips have zero raw/output clipping and zero peak-protection events. Peak after calibrated gain: Why Calling 0.60881585; Clarify 0.47083351. PCM checks do not prove native pronunciation, naturalness or intelligibility.

Current catalog, call definition, cached playback and packaged WAV hashes select the new versions. Playback rejects historical bindings for these phrases. The local source-ended completion proof is retained. Cancellation covers the new player and existing players under one owner. Both new hashes are HUMAN_REVIEW_PENDING and productionApproved=false. Consent arming still requires the unchanged canonical question and owned playback completion/answer safeguards.

## Validation

- C32 focused: **674/674**, 12 files (668 existing + six new tests).
- Full suite: **1,794/1,794**, 90 files, in the exact source snapshot, with no concurrent build work.
- The first full attempt while builds ran concurrently had 1,792 pass / two replay failures: the unchanged before replay timed out at 5,067 ms; the dependent after case lacked its before artifact. Both original outputs are retained. Isolation then passed both in 2.36 s total; the sequential full suite passed in 7.59 s. This matches the previously documented replay resource sensitivity; it is not evidence of a physical latency change. No retries setting, test timeout, assertion or Stage 1 production code changed.
- Lint, typecheck, production build, repository handoff build, package binding verifier, C31 preservation and whitespace checks: PASS. Existing Vite bundle-size warnings remain.
- Offline audio QA: **54/54** hashes/PCM checked. All previous **52 recordings (37 + 12 + 3)** remain byte-identical; two corrections were added. All historical reports/proofs remain unchanged.
- Layered preservation: 952 pre-correction files checked; exactly six existing source/test/packaging files changed. Stage 1.9.6, server/streaming, C31 logic and original audio preserved. New source proof covers the updated exact candidate; historical consolidation proof remains immutable and describes its earlier tree.
- No credential patterns introduced; no tracked private `.env` added. No commit, push, PR operation, merge, deployment or Stage 2.0D work performed.

See `validation.json` for complete logs, `audio-qa.json`, `generation-plan.json`, `preservation.json` and `source-proof.json` for exact evidence. Re-run current preservation with `python3 scripts/verify-stage20c32-sende.py`; offline audio QA with `node --import tsx scripts/stage20c32-sende-audit.ts`. Do not re-run the paid generation script.

## Listening next

The local repository app was rebuilt and restarted. Candidate source identity is `7a08ae4fffa9fad1bc64103de388d7f75824760b98daa93d5bb31b1a3ba35e77`, with uncommitted=true. Health reports zero provider requests on health and configured=false for ASR; cached listening works without a provider key. No microphone/recognition session was started.

Refresh `http://127.0.0.1:5173/`. Use the same origin to preserve prior local storage. A new candidate identity keeps old reviews separate instead of copying ratings to new bytes. Listen to **Why Calling** and **Clarify**, both marked NEW RECORDING. Written Danish still shows `sende`. Rate the exact new recordings honestly and export the review even if either remains wrong. The existing required-listening gates have not been bypassed. The six new regression tests use injected WebAudio completion; they are engineering evidence, not human listening or physical acceptance.

The bounded respelling may still sound wrong. Native listening must determine whether the reported consonant problem is improved or replaced with a different pronunciation defect. All prior acceptance/business/live-ASR/CRM/telephony gates remain pending.
