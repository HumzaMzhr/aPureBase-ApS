# C32 pronunciation recovery and focused retest

**Ready for Asem's focused listening retest. HUMAN_REVIEW_PENDING / NOT ACCEPTED / NOT PRODUCTION READY.**

Recovered the supplied 11-file folder without regenerating audio. The original temporary directory no longer existed; a detached local worktree was restored at `/private/tmp/apurebase-c32-pronunciation`, based on `c647dec9c6caae97b7b7e17d99283f9f402727c9`. Main branch and checkout remain untouched and clean. Recovered implementation files are byte-identical to the supplied recovery. No new production edits were made during this recovery.

## What changed from the old package

Why Calling and Success Close previously replayed historical C31 and C1 recordings. The restored review player now selects two genuinely new candidate hashes, verifies canonical/spoken/version/plan/audio/provenance bindings, and fails closed when historical bytes or versions are supplied for these slots. Original records are retained.

| Phrase | Historical audio SHA-256 | New candidate SHA-256 | Duration |
|---|---|---|---|
| Why Calling | `147ff7168b2e900239d6f6f5723de61c55c175f56d1793d25da972ad9ca609bb` | `b2d46752a12b82aedce1b19be0681e536eaaa26b382d1f3a28edfa4258cff2ff` | 5.851417 s |
| Success Close | `b127cd49b4918351697c21d1a043441a40e176861ab8ec633f7677c5cab89d26` | `e72d65aabdc5ecb1223de5311c3d0fa687588309f0191832bd328984179ad908` | 7.523250 s |

Why Calling canonical wording remains: “Jeg ringer kun for at spørge, om aPureBase må sende dig relevant faglig information via e-mail.” Its separate spoken render is “Jeg ringer kun for at spørge om a Pure Base må sende dig relevant faglig information via e-mail.” This removes the comma pause before “om”, retains “sende dig” and uses the existing brand rendering. It does not establish that native pronunciation has improved.

Success Close uses exactly the authorized wording: “Perfekt, mange tak for din tid. Du kan altid sige fra, hvis du ikke længere ønsker at modtage informationen. Hav en god dag.” It no longer uses the troublesome “framelde” phrase in the new recording. Canonical and spoken hashes are separate manifest fields even when their values match.

Both are `stage-2.0c32-candidate-1`, retain Isabella (`gIfqD5jrnhkFu8ENVbXC`), `eleven_flash_v2_5`, speed 0.95, gain 3.5573605757216837 and the existing clipping/provenance safeguards. See audio-qa.json for exact text, plan, receipt and file hashes.

## Generation accounting

The preserved generation journal records two requests on 2026-10-21, with 96 + 124 = **220 submitted characters**, two successes and zero failures/retries. Request IDs: `AHXB6wn4Lh1ytEhRQuVg` and `ihhY8XKnNt3NhwgB2KLc`. The provider character-cost response headers were `21` and `27`; these are separate from the 220 submitted-character count and are not a currency charge estimate. No authenticated provider recheck was performed.

**This recovery, validation, browser verification and packaging made zero external provider requests and generated no additional audio.** The generation script was not executed.

## Fresh validation

| Check | Result |
|---|---|
| C32 focused, including four new candidate regressions | 517/517 PASS, 5 files |
| C31 focused | 139/139 PASS, 5 files |
| Prior consent plus Stage196 short consent | 496/496 PASS, 13 files |
| Complete suite (`npm test`, unchanged default worker configuration) | 1,637/1,637 PASS, 83 files |
| Lint / TypeScript | PASS / PASS |
| Main build / separate C32 build | PASS / PASS |
| `git diff --check` | PASS |
| Existing C31 preservation verifier | PASS |
| Exact c647 baseline preservation | 638/642 byte-identical; remaining four are exact authorized recovered C32 review changes; no unexpected differences |
| Historical audio | All 37 original + 12 C31 recordings preserved byte-for-byte |
| New audio and historical technical QA | 51/51 PASS |
| Two new clips' raw and rendered clipping | 0 / 0 |
| Two new clips' peak-protection events | 0 |
| New clips' post-gain peaks | 0.484620899 / 0.714012444 |
| Real local browser | Both exact new hashes reached WebAudio source-ended |
| Mac focused package | Manifest, shell/Node syntax, static page/media byte matches, API refusal PASS |
| Recovered text/package secret-pattern scans | No credential findings; private .env and ignored recordings excluded |

These test groups overlap; their counts should not be added together. No tests were skipped, assertions weakened, timeouts changed or retries used. Tests ran in a separate exact 649-file snapshot because older replay tests write historical report filenames. Candidate historical reports were not rewritten. Source snapshot hashes match the recovered candidate. Raw commands, durations and outputs are included in results.json and adjacent logs. Runtime: Node v25.9.0, npm 11.12.1, Darwin 27.0.0 arm64.

Existing C32 baseline verifiers are unchanged. Their no-dirty-files / historical-stage scopes do not certify this new four-file review delta; the new exact c647 preservation proof covers it instead. No broad exception or historical verifier modification was introduced. Every Stage196/server/streaming file and every pre-existing test/report remains byte-identical.

The WebAudio unit test uses a mocked context. Its green result is not the real-browser proof: the separate browser state captures show actual AudioContext completion for each hash. No human ratings, attestations or observations were entered during verification. This is local rendering evidence, not physical acoustics, native Danish quality, ASR, natural-call latency or telephone acceptance.

## Asem's existing review

The authoritative input remains unchanged at `/Users/humzamazhar/Downloads/APureBase C32 Human Review.json`; SHA-256 `03f0ce346ab57af201c29b1f743da63ffcc8a807d3a46d68fb8e303b4672e05f`.

All five reviewed phrases have pronunciation **2/5**. Why Calling, Consent Question, Email Request and Clarify were labelled PASS; Success Close was FAIL with the comment “frameldte < it pronounced a t ”. Those four PASS labels do not resolve the pronunciation concerns. Opening has no review in that export. There are no microphone, email or natural-call observations. Prior data is not relabelled or transferred to the new hashes. The export remains NOT_ACCEPTED.

The review UI retains poor-pronunciation concerns in its export and requires pronunciation >=4, as well as PASS, for its listening readiness indicator. This engineering gate does not grant business approval or overall acceptance. The three unchanged low-rated phrases remain unresolved.

## Exact restored implementation files

Modified existing files (four):

- `src/consent/stage32/Workbench.tsx`: identify current two-candidate retest and review navigation.
- `src/consent/stage32/hardening/ReviewPanel.tsx`: select new hashes, use the verified player and expose low-score concerns/readiness.
- `src/consent/stage32/hardening/SpeechPanel.tsx`: show current candidate vs historical bindings explicitly.
- `src/consent/stage32/hardening/review.ts`: export poor-pronunciation concerns without overriding human statuses.

Added recovered files (seven):

- `src/consent/stage32/speech/candidates.ts`
- `src/consent/stage32/speech/candidatePack.json`
- `tests/consent-stage20c32-candidates.test.ts`
- `scripts/stage20c32-generate-candidates.ts` (preserved, not executed)
- `docs/stage-2.0c-3.2-generation.jsonl`
- `public/audio/consent-stage20c32/b2d46752a12b82aedce1b19be0681e536eaaa26b382d1f3a28edfa4258cff2ff.wav`
- `public/audio/consent-stage20c32/e72d65aabdc5ecb1223de5311c3d0fa687588309f0191832bd328984179ad908.wav`

This new report folder contains only fresh recovery/validation evidence. Handoff files are separate and do not alter application production logic.

## Focused Mac handoff and remaining work

Use the new `aPureBase-C32-New-Pronunciation-Candidate1.zip`, not the old 93bb4e8 package, for these two clips. Unzip, read START-HERE.txt and run Start.command. Node >=22.12 is required; this prebuilt offline bundle needs no npm installation or API key. It verifies package files, serves only local cached files on 127.0.0.1:5187 and rejects API/WebSocket access. The preserved C31 link is unavailable in this narrowly scoped static launcher; this is not the full microphone/ASR handoff.

Asem should select each of the two new hashes, play fully, independently set ratings/comments, record the observation and export JSON before refreshing. Existing UI rating fields can retain values when changing phrases: explicitly choose fresh values for each clip. Failed or uncertain pronunciation must be reported honestly. The full focused procedure and exact hashes are in START-HERE.txt.

The two assets are ready to be heard again. Native pronunciation remains unverified. Other low-score phrases, missing Opening evidence, microphone/provider ASR, natural-call timing, business wording decisions and telephone/CRM integration remain outstanding. Historical duration metrics are not new physical measurements.

No commit, push, PR update, merge, deployment, Stage2D or telephone test occurred. No message was sent to Asem. Stop here for human review.
