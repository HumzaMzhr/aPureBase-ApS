# Consolidated pre-Asem closure audit after authorized Clarify generation

**READY FOR FINAL ASEM RETEST — NO KNOWN AUTOMATABLE GAPS REMAIN**

C-3.2 remains **NOT ACCEPTED / NOT PRODUCTION READY**. This is an engineering/local-validation conclusion. Native listening, live microphone behavior, physical call duration and business decisions remain open. No final Asem ZIP was created and Asem was not contacted.

The current source is uncommitted in `/private/tmp/apurebase-c32-pronunciation`, based on c647dec (the existing verifier-maintenance descendant of published Hardening-2 93bb4e8). The main checkout remains clean and unchanged. Current audit files supersede their archived pre-Clarify versions; all original human exports, historical stage reports and recordings are preserved.

## Exactly one authorized generation

Submitted exactly 82 characters once to the pinned Isabella endpoint, model `eleven_flash_v2_5`, speed 0.95:

> Selvfølgelig. Må a Pure Base sende relevant faglig information til dig via e-mail?

Canonical/audit/business text remains:

> Selvfølgelig. Må aPureBase sende relevant faglig information til dig via e-mail?

- Receipt: `EhTO84mneZ2azEN2C9fy`.
- New Clarify WAV SHA-256: `55e255476384ad077184102aedf4dcfecdeb865974e3346ab2cadefcb292f420`.
- Preserved old Clarify SHA-256: `4f7cd646ec5b46d260b2bc961e873df3dcfa4ea957baaf2691477be9a734f19d`.
- Canonical text SHA-256: `2e4ca4046577fdf070b6bca20e067e3bd3538371dc5c010f51aa9b0aa75e6051`.
- Synthesis text SHA-256: `79731682622f866b2bf9e59c5589fda254ba8c5300fe8cd81e6eb5015eb43892`.
- Plan SHA-256: `5dc18f4bae4e37f9b4fba4bac0d9de90a5806a7b1e02ae2d3af695fdc0ff9f10`.
- Phrase version: `stage-2.0c32-clarify-ab-1`; synthesis version `stage-2.0c32-plan-1:REFERENCE`.
- Current task: **1 request / 82 submitted characters / 1 success / 0 failures / 0 paid retries**. An initial local configuration precheck stopped before any request or journal creation; it did not submit a generation. The exact payload always set speed 0.95. The exclusive, fsynced request journal and completed pack prevent reuse.
- Earlier recovered C32 history: 2 requests / 220 submitted characters. Total C32: 3 requests / 302 submitted characters. Earlier C31: 12 / 1,308, separate and unchanged. Submitted characters are not conflated with provider billing headers.

The new file is complete PCM-s16le mono, 24,000Hz, 128,174 samples, 5.340583333s. RIFF/payload length and alignment, decode, hash, non-silence, peaks/RMS, leading/trailing quiet and low-energy intervals pass. Raw peak 0.173034668; calibrated gain 3.5573605757216837; rendered peak 0.615546703; raw/rendered clipping 0; peak-protection events 0. Container/sample completeness does not prove every Danish word was pronounced correctly or semantically untruncated.

Actual browser playback of the validated static build completed through real WebAudio `source-ended` for the new hash. The retained full accessibility proof shows canonical/spoken/version/hash separation, zero human observations, unrated quality fields and unchecked human attestation. No native PASS was entered. See `stage-2.0c-3.2-clarify-closure/browser-playback-proof.json`, the text proof and screenshots.

## Complete feedback reconciliation

All 26 indexed source files were read completely and their hashes verified. The authoritative C3 export contributes 37 listening actions (36 distinct recordings; Opening twice). The latest C32 export contributes five actions, all pronunciation 2/5. Six original incomplete/failing attempts and four explicitly labelled user-relayed/request items remain separate: **52 master entries / 42 real listening actions**. A separate C31 human retest export was not found; registries/reports do not manufacture new human actions. Every original comment, rating, heard hash and replacement chain remains in `stage-2.0c-3.2-asem-feedback-master.json/md`.

The original two microphone attempts failed before provider-ready/finals in 7.0ms and 3.1ms. Their physical cause remains unknown; offline lifecycle tests do not establish a successful live retest. The additional earlier price-question export is a manual takeover observation, with no microphone/provider finals or listening ratings. No ASR WER is invented from it.

### Every historical rating at or below 3/5

| Phrase | Heard hash | Pronunciation / naturalness / pace | Recorded decision | Current exact hash | Disposition |
|---|---|---|---|---|---|
| why-calling | 147ff7168b2e900239d6f6f5723de61c55c175f56d1793d25da972ad9ca609bb | 2/5 / 4/5 / 4/5 | PASS | b2d46752a12b82aedce1b19be0681e536eaaa26b382d1f3a28edfa4258cff2ff | REPLACED_HUMAN_REVIEW_PENDING_NO_APPROVAL_TRANSFER |
| consent-question | 055b74f018aa753f03fea5a51701cc3a91ea0150e56e311a917fd0e9f4eb67af | 2/5 / 4/5 / 4/5 | PASS | 055b74f018aa753f03fea5a51701cc3a91ea0150e56e311a917fd0e9f4eb67af | UNCHANGED_2_OF_5_HUMAN_REVIEW_REQUIRED |
| email-request | 296dae9cfb01632d59c857755dcfcdba5c4abac94af58847f47ab37fa984a961 | 2/5 / 4/5 / 4/5 | PASS | 296dae9cfb01632d59c857755dcfcdba5c4abac94af58847f47ab37fa984a961 | UNCHANGED_2_OF_5_HUMAN_REVIEW_REQUIRED |
| clarify | 4f7cd646ec5b46d260b2bc961e873df3dcfa4ea957baaf2691477be9a734f19d | 2/5 / 4/5 / 4/5 | PASS | 55e255476384ad077184102aedf4dcfecdeb865974e3346ab2cadefcb292f420 | REPLACED_HUMAN_REVIEW_PENDING_NO_APPROVAL_TRANSFER |
| success-close | b127cd49b4918351697c21d1a043441a40e176861ab8ec633f7677c5cab89d26 | 2/5 / 4/5 / 4/5 | FAIL | e72d65aabdc5ecb1223de5311c3d0fa687588309f0191832bd328984179ad908 | REPLACED_HUMAN_REVIEW_PENDING_NO_APPROVAL_TRANSFER |

Success Close's original latest comment is retained verbatim: `frameldte < it pronounced a t `. The newer authorized `sige fra` candidate has not inherited either its rejection or any other hash's approval. Why Calling retains the reported sende dig concern as a native connected-speech gate; its new file is 46.417ms longer than C31, so no reduced-silence claim is made. Clarify's former PASS and 2/5 remain attached to old bytes only.

Consent Question was re-inspected: its exact submitted input already says `Må a Pure Base sende relevant faglig information til dig via e-mail?`, using the same brand alias and scoped proposition as the new Clarify question. It has one intact interrogative sentence, no local splice, valid receipt, complete WAV, no clipping and no word-specific latest comment. No missing newer rendering convention or bounded punctuation fix was identified.

Email Request was re-inspected: exact input `Tak. Hvilken e-mailadresse må vi sende informationen til?` has an ordinary acknowledgment boundary and one question, no brand span, no local splice, valid receipt, complete WAV and no clipping. The e-mailadresse compound has no supplied word-specific diagnosis. Arbitrary punctuation, phonetic rewriting, splitting or an identical paid regeneration would be speculative. Both 2/5 concerns remain UNRESOLVED human review, not hidden engineering passes. Full measured evidence and comparison are in `feedback-closure/current-low-rating-inspection.json`.

Original Refusal Close and Stop Contact Close hav concerns have existing C31 God dag replacements; Explanation's questioned medicinske opdateringer wording has a C31 professional-information replacement; Unsubscribe uses the existing sige fra replacement; both receptionist vedkommende requests have existing name-bound C31 replacements; all four corrected email spelling fixtures remain diagnostic-only. None has an invented successful human retest. About aPureBase still lacks human listening. Purpose/More Explanation/New Success Close retain related lexical flags medicinske opdateringer / framelde / hav en god dag for native/business assessment; an occurrence alone does not prove a new human failure or justify unauthorized canonical rewriting.

### Every current asset still awaiting human review

| Phrase | Exact current hash | Version | Status | Role |
|---|---|---|---|---|
| consent-question | 055b74f018aa753f03fea5a51701cc3a91ea0150e56e311a917fd0e9f4eb67af | stage-2.0c31-candidate-1 | UNRESOLVED | Current cached speech |
| email-request | 296dae9cfb01632d59c857755dcfcdba5c4abac94af58847f47ab37fa984a961 | stage-2.0c1-approved-1 | UNRESOLVED | Current cached speech |
| success-close | e72d65aabdc5ecb1223de5311c3d0fa687588309f0191832bd328984179ad908 | stage-2.0c32-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Current cached speech |
| refusal-close | b6ba0f6cf3fab2fddd612f0261bd7b97252f721ec350daae894e4bdbed685f4a | stage-2.0c31-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Current cached speech |
| about-apurebase | b1de20bc3b5a0b6d7ffeb10d60cdac746d096e8ed6349e48c66b5c0e9784404d | stage-2.0c1-approved-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Current cached speech |
| explanation | ea34f7943a86db20bdb8b58801c89aaf5a5483a8eeb650a96df6d2a61dd17665 | stage-2.0c31-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Current cached speech |
| why-calling | b2d46752a12b82aedce1b19be0681e536eaaa26b382d1f3a28edfa4258cff2ff | stage-2.0c32-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Current cached speech |
| unsubscribe | 5ce6b94bdcb51aff2d8c89550fc569dc35a2e9e43f418d3c779fc8efc2d8c483 | stage-2.0c31-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Current cached speech |
| clarify | 55e255476384ad077184102aedf4dcfecdeb865974e3346ab2cadefcb292f420 | stage-2.0c32-clarify-ab-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Current cached speech |
| stop-contact-close | 8938c63491e0cbb30b38a7d612e2f2fa6ee78776cc82c4d6d31179a88f060955 | stage-2.0c31-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Current cached speech |
| email-readback-intro | 042e43febe086fdf9166e8cb90f535c51e4a1ad4fa6342c020a72da97bc2ece9 | stage-2.0c31-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Diagnostic comparison |
| email-readback-intro | 21cfdc124951706d37945c14a4acc9390d35d627ab9520a3e5c495b26fec9e53 | stage-2.0c31-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Diagnostic comparison |
| receptionist-target-request | fbf293862c077f414ba52043dc7f501d26283ec0f4dd3176afea20b14565ddfc | stage-2.0c31-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Current cached speech |
| email-readback-intro | 5bc45c32fadca206ad76af9dcd5279dc34d3fbfa82946175f3669541c4dc6445 | stage-2.0c31-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Diagnostic comparison |
| receptionist-target-request | a4549b780cf7ed418c9434593913f88d105e8bdee9ca638a099addb2217cad1c | stage-2.0c31-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Current cached speech |
| email-readback-intro | 71dded509fbc9f45e07c19131c2033b9c7f025958de979991d827993e9312a2f | stage-2.0c31-candidate-1 | NEW_CANDIDATE_HUMAN_REVIEW_PENDING | Diagnostic comparison |

The asset table contains all 38 selectable units, 37 distinct current recordings and four unbound/nonplayable templates. The intentional same-byte confirmation alias is explicit. There are **52 protected recording files: original 37 + C31 12 + C32 3**. Earlier Why Calling and Success Close bytes/receipts/plan identities are unchanged. No arbitrary name or email recording is implied by fixture availability.

## Binding and consent safeguards

The current catalog now selects three new C32 hashes only for Why Calling, Success Close and Clarify. The previous Clarify hash cannot re-enter the definition, selector, review binding or structured flow. Candidate verification pins the exact version/canonical/synthesis/plan/voice/receipt/media/hash/gain, and playback requires each asset's own version. Prior reviews are always looked up by exact bytes; the new Clarify has no human review.

Clarify is consent-critical. Its authorized exception changes version/audio only: canonical text, canArmConsent, consent-critical flag, scope, recipient roles, graph and all other semantic fields are checked against the original. Every other consent-question record stays identical. Malicious canonical/render/scope/role/version changes fail, including rehashed changes. The complete Q clarification scenario uses the new Clarify hash and still requires completed owned playback, an explicit later final affirmative, correct recipient/authority, matching revision/scope/version/text and separate operator review. Maybe, stale, during-playback, unowned or interrupted answers remain blocked. No ASR transcript dictionary, buffering, jitter, recognition config, translation model, speed or gain change was made.

## Complete fresh validation

| Check | Result |
|---|---|
| C32 focused | **564/564**, six files PASS |
| C31 regressions | **139/139** PASS |
| Prior consent + Stage196 short-consent | **496/496** PASS |
| Full suite | **1,684/1,684**, 84 files, **three complete runs PASS** |
| Replay hotspot | 2/2 each, five runs PASS |
| 45-second PCM hotspot | Target 1/1 each, five runs PASS |
| Original email corpus | 66/66 PASS |
| Additional DB/LLM public-controller boundaries | 18/18 PASS |
| Consent matrix | 29/29 PASS |
| Scenario corpora | 46 base + 32 remediation PASS |
| Current selection / rendering / lifecycle | Included in focused/full tests; PASS |
| Audio QA | 52/52 valid decoded files; raw/rendered clipping zero |
| Standard build / C32 build | PASS / PASS |
| Lint / typecheck | PASS / PASS |
| Whitespace / secrets / credential-file inspection | PASS / PASS / PASS |
| C31 preservation / exact C32 closure preservation | PASS / PASS |
| Actual Clarify local WebAudio completion | PASS; real source-ended; no human approval entered |

The added regression explains the count increase from 563/1,683 to 564/1,684. No assertion was weakened, no test removed/skipped, no timeout increased and no failure retry was used to manufacture a pass. Targeted hotspot commands intentionally select their requested cases; complete full runs have no skipped tests. Commands, raw output, durations and frozen-source hashes are retained under `stage-2.0c-3.2-clarify-closure/`. Counts overlap; do not sum them.

Observed **falseEmailAutoAccepts=0; ambiguousAutomaticSelections=0; consentFalsePositives=0**. The deliberate unsafe negative control produces one false auto-accept and one ambiguous selection, is detected by the safety gate, and is never applied to the real controller. Database/model advice cannot create consent or silently store an email. Structured email correction revokes prior confirmation; contact/recipient changes invalidate stale dependencies. Production storage/CRM/downstream handoff remain disabled.

## Audio quality and timing limits

All 52 files retain valid media/hash/provenance checks. Four historical files still use existing peak protection; all three new C32 candidates have zero protection events. Global gain/voice/speed were preserved. No silence trimming, new normalization, permanent buffering or voice-settings change was introduced. Low-energy runs are measured with 20ms raw-RMS frames and can include quiet consonants; they are not proven perceived gaps or word alignment. Native soft-d, stress, connected speech, intonation and naturalness remain human judgments.

Ordinary modeled paths remain 30–90s when adding measured prerecorded media to explicitly synthetic speech/thinking/operator/transition assumptions. Live provider/network/physical delay remains UNKNOWN and no latency/recognition improvement is physically claimed. The clarification case uses the measured new Clarify duration. No minimum duration is imposed on refusal/busy/wrong-person/takeover exits.

| Ordinary case | Prerecorded s | Recipient speech assumption s | Thinking s | Transitions s | Operator s | Modeled subtotal s | Live/provider/physical |
|---|---|---|---|---|---|---|---|
| A | 30.511 | 5.500 | 3.600 | 0.900 | 4.500 | 45.011 | UNKNOWN |
| B | 30.511 | 5.500 | 3.600 | 0.900 | 4.500 | 45.011 | UNKNOWN |
| E | 31.486 | 9.000 | 4.800 | 1.050 | 4.500 | 50.836 | UNKNOWN |
| F | 30.511 | 5.500 | 3.600 | 0.900 | 4.500 | 45.011 | UNKNOWN |
| Q | 35.852 | 6.500 | 4.800 | 1.050 | 4.500 | 52.702 | UNKNOWN |
| AP | 30.511 | 5.500 | 3.600 | 0.900 | 4.500 | 45.011 | UNKNOWN |
| AS | 30.511 | 5.500 | 3.600 | 1.500 | 4.500 | 45.611 | UNKNOWN |
| AT | 31.486 | 9.000 | 4.800 | 1.050 | 4.500 | 50.836 | UNKNOWN |

## Preservation and exact files

The read-only preservation verifier pins the 642-file c647 baseline: 634 byte-identical files and the eight previously audited exact C32 changes. All Stage1.9.6/server/streaming files and historical reports remain unchanged. Its 674-file pre-audit inventory now permits three explicit before/after Clarify extensions: candidates.ts, candidatePack.json and the candidate regression test. The pack's first two candidate objects are checked for exact equality. All previous 51 audio files are byte-identical; only the new authorized Clarify WAV is added. Existing verifiers were not weakened.

The pre-Clarify complete 737-file checkpoint was archived before changes at `/private/tmp/c32-clarify-closure/before-clarify.tar.gz`, SHA-256 `b1116d5c4f39079f01ff04b15a6e7ec2ad87b1792d3fd38f7e9d4267a883e632`. Historical validation logs remain in feedback-closure/ and pronunciation-retest/; fresh logs have their own clarify-closure/ directory. Only explicitly current audit/master/asset/QA/usage/preservation reports were regenerated.

Source/test/tool files changed in this authorization (full hashes and before hashes are in the JSON):

- `scripts/stage20c32-feedback-audit.ts`
- `scripts/stage20c32-generate-clarify.ts`
- `scripts/verify-stage20c32-feedback-closure.py`
- `src/consent/stage32/Workbench.tsx`
- `src/consent/stage32/feedback/closure.ts`
- `src/consent/stage32/feedback/sources.json`
- `src/consent/stage32/hardening/ReviewPanel.tsx`
- `src/consent/stage32/hardening/SpeechPanel.tsx`
- `src/consent/stage32/speech/candidatePack.json`
- `src/consent/stage32/speech/candidates.ts`
- `src/consent/stage32/speech/current.ts`
- `tests/consent-stage20c32-candidates.test.ts`
- `tests/consent-stage20c32-feedback-closure.test.ts`

The generation script makes the authorized single exact-payload request with a durable exclusive journal; candidate/current binding code adds the narrow Clarify version and preserves question meaning; tests cover new ownership/no approval carryover/old-hash rejection; feedback/audit tooling records the consumed authorization and complete source/low-rating/media evidence; UI copy identifies three pending candidates; preservation pins the exact extension. No other production policy was rewritten.

## Remaining LIVE_MIC_REQUIRED gates

- Five Danish microphone smoke tests: ordinary / yes / no / email / correction.
- Actual backend/provider authorization, permission and transport readiness; original 7.0/3.1ms pre-ready failures have no proven physical cause.
- Provider-final versus partial accuracy, missing/changed words and real speech/commit boundary crossing.
- Email acoustic symbol evidence, correction ownership and independently mapped real contact provenance.
- Representative full natural calls, including clarification/refusal/receptionist; actual source-to-audio delays and complete call durations.

Native listening remains required for every pending exact asset listed above, including sende dig, brand rendering, e-mail compounds, weak consonants and naturalness. Historical human PASS with 2/5 is not clearance. The absence of a concrete automatable fix is not a native approval.

## Remaining BUSINESS_DECISION_REQUIRED gates

- eight-day mechanism.
- eight-day starting event.
- consent effectiveness timing.
- suppression timing.
- system of record.
- retention.
- recording authorization.
- full-call recording.
- unsubscribe mechanism.
- stored-email shortcut.
- production concise confirmation.
- intermediary authority standard.

Production concise confirmation versus exact spoken readback remains undecided. An opt-out sentence does not establish an implemented unsubscribe channel. Real contact integration/retention/authority/suppression and downstream consent consequences remain unverified.

## Stop state

No known bounded automatable gap remains after the authorized Clarify change and complete validation. Native/physical/business gates remain open and are not reclassified as automation failures or acceptances. No additional TTS, Why Calling/Success Close regeneration, OpenAI request, live ASR, telephone call, Asem contact, final ZIP, commit, push, PR update, merge, deployment or Stage2.0D work occurred. The only paid activity in this task was the single authorized Clarify request.

## Every observation disposition

| ID | Phrase | Classification | Heard hash | Replacement hash | Retained problem |
|---|---|---|---|---|---|
| C-3:listening:0 | opening | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 247f0b55738cc440dd207d76237a78fdbaf07c473c701728e32965f6de136509 | — | — |
| C-3:listening:1 | opening | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 247f0b55738cc440dd207d76237a78fdbaf07c473c701728e32965f6de136509 | — | — |
| C-3:listening:2 | purpose | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | bdd80e984b2df54688b27e5e2e92f5571d417649790b1386c491366ca2070a2a | — | — |
| C-3:listening:3 | consent-question | HUMAN_REVIEW_REQUIRED | 2499be7f9d24f3ffe8f0ef698229615bf94ab368bb47e72cecbf0bf75508cca6 | 055b74f018aa753f03fea5a51701cc3a91ea0150e56e311a917fd0e9f4eb67af | aPureBase sounds strange -  |
| C-3:listening:4 | email-request | HUMAN_REVIEW_REQUIRED | 296dae9cfb01632d59c857755dcfcdba5c4abac94af58847f47ab37fa984a961 | — | — |
| C-3:listening:5 | email-readback-intro | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 75a31d5e38c28352d8040ca5a77a9c6dcdc0a0498151c59547efe2e984a9b757 | — | — |
| C-3:listening:6 | success-close | BUSINESS_DECISION_REQUIRED | b127cd49b4918351697c21d1a043441a40e176861ab8ec633f7677c5cab89d26 | e72d65aabdc5ecb1223de5311c3d0fa687588309f0191832bd328984179ad908 | Perfekt, mange tak for din tid. Du kan altid framelde dig igen. Hav en god dag. <- doesnt explain how you can unsubsribe again |
| C-3:listening:7 | email-confirmation-question | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 0ff8196c2b656790e640a40fc3ead58af6579b9274d088d3876c52db70237f98 | — | — |
| C-3:listening:8 | refusal-close | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | 351925f2cc98204031d3ec450d68eef2038a6c5fa02dd5f1ce9defd5158d5c72 | b6ba0f6cf3fab2fddd612f0261bd7b97252f721ec350daae894e4bdbed685f4a |  hav <- sounds strange in danish the V would be silent  |
| C-3:listening:9 | identity | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 291a7e12e50a37bb1ff2f89127af9f5021ca697d5e2af8d4336117f3537a42e6 | — | — |
| C-3:listening:10 | explanation | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | 2e30daf57536ac4854c4e0aa62db8c79eb6a724464061786d5e35f0b76556142 | ea34f7943a86db20bdb8b58801c89aaf5a5483a8eeb650a96df6d2a61dd17665 | sygdomsområder, produkter og medicinske opdateringer. <. not correct danish I think (medicinske opdateringer) |
| C-3:listening:11 | why-calling | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | ef9b9c93ab7d7f6c2f8af0a321fe87529c3ce071e4e994800fe2d80dbeafddfa | b2d46752a12b82aedce1b19be0681e536eaaa26b382d1f3a28edfa4258cff2ff | it stops after jeg - and starts again . not fluent |
| C-3:listening:12 | unsubscribe | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | 82da76b20e70453c91ea25a21c3b21206e3aefe779e14ed7ef9c8472be239aa6 | 5ce6b94bdcb51aff2d8c89550fc569dc35a2e9e43f418d3c779fc8efc2d8c483 | framelde <- the D her is silent in danish  |
| C-3:listening:13 | repeat-prefix | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 1f5d3e769136abb40e4b9e6fb559a00df4f0bb203d0acf372bb0f9ec9c971f14 | — | — |
| C-3:listening:14 | clarify | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | 4f7cd646ec5b46d260b2bc961e873df3dcfa4ea957baaf2691477be9a734f19d | 55e255476384ad077184102aedf4dcfecdeb865974e3346ab2cadefcb292f420 | — |
| C-3:listening:15 | callback | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 8566a2f49da26c619ad3c65fa7f26988fdd9ffadcb88a1b44c437be7307d4006 | — | — |
| C-3:listening:16 | callback-close | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 235242fd29cf5b9c10995850c3ead56b9675cc792a229213e47429522db832c6 | — | — |
| C-3:listening:17 | target-unavailable | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 2af35e3ecc193adb0821adf76b52c23ed1043dde09829e0dfa818755cd3f8d58 | — | — |
| C-3:listening:18 | send-first | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 19877596aa4297bddd75529560767ed1263be9ea4f49a8bf20d332f291cd5a23 | — | — |
| C-3:listening:19 | uncertain-consent | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | ca9c8eb4d79560429d96f3a9e0464827bffcf1bda3d7b223df5b9d64e58f7da0 | — | — |
| C-3:listening:20 | already-receiving | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 7057166601c2d641804a51b6f1a911c73a22b35034f099ae0d3153a59b84a1cd | — | — |
| C-3:listening:21 | email-correction-prefix | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 948e1a3f03f5ea0285a1516fa0da69ea1ff90bcaca73c416a0546c2e19c64b24 | — | — |
| C-3:listening:22 | more-explanation | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 307972ad8bda36967145fce71b55a51e774fa640444d44fd8078e773a20c0ff8 | — | — |
| C-3:listening:23 | stop-contact-close | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | 9ed1d21afe7af60c98e0987d89b579df28e27cadbde22e35515ae36ce4cf4c7e | 8938c63491e0cbb30b38a7d612e2f2fa6ee78776cc82c4d6d31179a88f060955 | hav V is silent in danish  |
| C-3:listening:24 | thank-you | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 60f854b66d216da98580481abbae72b931703754db522471ce96290eb8bb38a6 | — | — |
| C-3:listening:25 | email-readback-intro | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | b556f09dddd1d9309f8dff3fc1df049c0e1bb3efbf80d961ef4e3df341301e86 | 042e43febe086fdf9166e8cb90f535c51e4a1ad4fa6342c020a72da97bc2ece9 | N she says EN but the danish pronunciation is ÆN or AEN |
| C-3:listening:26 | intermediary-consent-question | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 2d43ca1559a5a7183c41ee45fa85b18e05c6bf916f39d7465d71528c4a420da5 | — | — |
| C-3:listening:27 | email-readback-intro | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | dcaacb22b34ff576464a49bff4f08dc0e12557b2b4bd98f90f437f65eceed3d8 | 21cfdc124951706d37945c14a4acc9390d35d627ab9520a3e5c495b26fec9e53 | totally fucked |
| C-3:listening:28 | receptionist-target-request | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | 9d89447cd63c577a25a5442b0d954c171c82bdd7f980cfbed0891ca73cb8caf8 | fbf293862c077f414ba52043dc7f501d26283ec0f4dd3176afea20b14565ddfc | Jeg ringer vedrørende faglig information til Jens Hansen. Kan jeg tale med vedkommende? < insted og vedkommende in danish it would be  - Kan jeg komme til at tale med ham? |
| C-3:listening:29 | email-readback-intro | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | 74176d4a77da33b1096da5c62453663fc60a89a4596526ad401e56f1bf4cde11 | 5bc45c32fadca206ad76af9dcd5279dc34d3fbfa82946175f3669541c4dc6445 | no  |
| C-3:listening:30 | receptionist-target-request | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | 4b2606b42d616b9bb23845a2e0eb452a12c2759c0bcb30abafe2c4f39ef7e706 | a4549b780cf7ed418c9434593913f88d105e8bdee9ca638a099addb2217cad1c | Jeg ringer vedrørende faglig information til Anna Jensen. Kan jeg tale med vedkommende? <- same as earlier<br/><br/> |
| C-3:listening:31 | wrong-person-close | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 8059a8e716422e153f67cd5fa6b33d8a5e028416624c6faeff084b4f8b4c5667 | — | — |
| C-3:listening:32 | email-readback-intro | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | a2d4787ddba138fcfeff474ebc02d83001b5683291ed986c75a494bab4f02c31 | 71dded509fbc9f45e07c19131c2033b9c7f025958de979991d827993e9312a2f | — |
| C-3:listening:33 | authority-ask | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 8001fa92ce955d8aa28c602c88ab396ef1fa189e9fd52767a48f5b5b47287deb | — | — |
| C-3:listening:34 | wrong-person-close | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 71c8572bfe9aa2f008ddc93605906e664a6279fc4361356210fe0d1c1c0de46a | — | — |
| C-3:listening:35 | intermediary-consent-question | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 80d93ed36b0ca3ebaa17cc69b49f11184a3e2a0e707ee763eac14a8d9e4028c4 | — | — |
| C-3:listening:36 | authority-ask | NO_CHANGE_REQUIRED_EXACT_UNCHANGED_HUMAN_EVIDENCE | 6f1d62ef73a355a81211be1ddbd439fddd238f4720cf28a9226561fbd490c01b | — | — |
| C-3.2:listening:0 | why-calling | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | 147ff7168b2e900239d6f6f5723de61c55c175f56d1793d25da972ad9ca609bb | b2d46752a12b82aedce1b19be0681e536eaaa26b382d1f3a28edfa4258cff2ff | Weak human quality rating; exact phoneme unspecified unless separately reported |
| C-3.2:listening:1 | consent-question | HUMAN_REVIEW_REQUIRED | 055b74f018aa753f03fea5a51701cc3a91ea0150e56e311a917fd0e9f4eb67af | — | Weak human quality rating; exact phoneme unspecified unless separately reported |
| C-3.2:listening:2 | email-request | HUMAN_REVIEW_REQUIRED | 296dae9cfb01632d59c857755dcfcdba5c4abac94af58847f47ab37fa984a961 | — | Weak human quality rating; exact phoneme unspecified unless separately reported |
| C-3.2:listening:3 | clarify | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | 4f7cd646ec5b46d260b2bc961e873df3dcfa4ea957baaf2691477be9a734f19d | 55e255476384ad077184102aedf4dcfecdeb865974e3346ab2cadefcb292f420 | Weak human quality rating; exact phoneme unspecified unless separately reported |
| C-3.2:listening:4 | success-close | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | b127cd49b4918351697c21d1a043441a40e176861ab8ec633f7677c5cab89d26 | e72d65aabdc5ecb1223de5311c3d0fa687588309f0191832bd328984179ad908 | Weak human quality rating; exact phoneme unspecified unless separately reported |
| C-3:attempt:0 | — | AUTOMATED_CHECKS_PASS_PHYSICAL_NOT_INFERRED | — | — | Incomplete ordinary attempt; no source finals or completed successful call. Opening evidence absent: true |
| C-3:attempt:1 | — | AUTOMATED_CHECKS_PASS_PHYSICAL_NOT_INFERRED | — | — | Incomplete ordinary attempt; no source finals or completed successful call. Opening evidence absent: true |
| C-3:attempt:2 | — | AUTOMATED_CHECKS_PASS_PHYSICAL_NOT_INFERRED | — | — | Incomplete ordinary attempt; no source finals or completed successful call. Opening evidence absent: true |
| C-3:attempt:3 | — | AUTOMATED_CHECKS_PASS_PHYSICAL_NOT_INFERRED | — | — | Incomplete ordinary attempt; no source finals or completed successful call. Opening evidence absent: true |
| C-3:attempt:4 | — | LIVE_MIC_REQUIRED | — | — | Microphone ready; transport failed before ready/final in 7 ms. Exact cause unproven. |
| C-3:attempt:5 | — | LIVE_MIC_REQUIRED | — | — | Microphone ready; transport failed before ready/final in 3.1 ms. Exact cause unproven. |
| relayed:sende-dig | why-calling | NEW_AUDIO_HUMAN_REVIEW_REQUIRED | 147ff7168b2e900239d6f6f5723de61c55c175f56d1793d25da972ad9ca609bb | b2d46752a12b82aedce1b19be0681e536eaaa26b382d1f3a28edfa4258cff2ff | Connected-speech consonant, not canonical spelling |
| relayed:naturalness | — | AUTOMATED_CHECKS_PASS_PHYSICAL_NOT_INFERRED | — | — | Qualitative impression; 90% is a user description, not a measured realism score |
| request:email-architecture | email-readback-intro | AUTOMATED_CHECKS_PASS_PHYSICAL_NOT_INFERRED | — | — | Clinic-spoken email should be primary, character-by-character TTS diagnostic only |
| request:call-duration | — | LIVE_MIC_REQUIRED | — | — | Ordinary successful call target 30–90 seconds; do not pad unwilling-recipient exits |
