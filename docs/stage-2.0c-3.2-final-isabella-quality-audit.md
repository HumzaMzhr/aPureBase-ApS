# Final C-3.2 Isabella quality audit

ENGINEERING VERIFIED / HUMAN QUALITY GATES REMAIN. No new provider request or audio generation.

All 12 required review items plus every other currently bound ordinary-call unit were inspected (32 bound units). Diagnostic email spelling remains excluded from normal calls. All 54 protected recordings are checked separately.

Isabella / eleven_flash_v2_5 / speed 0.95 / calibrated gain 3.5573605757216837 remain unchanged. Canonical Danish uses `sende`; only the two already-generated provider inputs use `senne`.

No concrete bounded technical correction requiring new paid TTS was established. Quiet regions are not a phonetic diagnosis. No speculative generation or global voice change is justified. New Why Calling and Clarify bytes still need native review. Humza’s exact-byte self-reports do not certify a new asset or substitute for Asem.

| Phrase | Version / hash | Seconds | Leading / trailing quiet ms (rendered) | Classification |
|---|---|---:|---:|---|
| opening | stage-2.0c1-approved-1 / 247f0b55738cc440dd207d76237a78fdbaf07c473c701728e32965f6de136509 | 7.198 | 10 / 218 | HUMAN_ONLY_QUALITY_GATE |
| purpose | stage-2.0c1-approved-1 / bdd80e984b2df54688b27e5e2e92f5571d417649790b1386c491366ca2070a2a | 7.477 | 60 / 227 | HUMAN_ONLY_QUALITY_GATE |
| consent-question | stage-2.0c31-candidate-1 / 055b74f018aa753f03fea5a51701cc3a91ea0150e56e311a917fd0e9f4eb67af | 3.947 | 40 / 47 | KEEP_CURRENT |
| email-request | stage-2.0c1-approved-1 / 296dae9cfb01632d59c857755dcfcdba5c4abac94af58847f47ab37fa984a961 | 3.390 | 30 / 240 | KEEP_CURRENT |
| email-confirmation-question | stage-2.0c1-approved-1 / 0ff8196c2b656790e640a40fc3ead58af6579b9274d088d3876c52db70237f98 | 0.975 | 40 / 145 | HUMAN_ONLY_QUALITY_GATE |
| success-close | stage-2.0c32-candidate-1 / e72d65aabdc5ecb1223de5311c3d0fa687588309f0191832bd328984179ad908 | 7.523 | 20 / 53 | KEEP_CURRENT |
| refusal-close | stage-2.0c31-candidate-1 / b6ba0f6cf3fab2fddd612f0261bd7b97252f721ec350daae894e4bdbed685f4a | 2.554 | 40 / 44 | KEEP_CURRENT |
| identity | stage-2.0c1-approved-1 / 291a7e12e50a37bb1ff2f89127af9f5021ca697d5e2af8d4336117f3537a42e6 | 2.786 | 0 / 36 | HUMAN_ONLY_QUALITY_GATE |
| about-apurebase | stage-2.0c1-approved-1 / b1de20bc3b5a0b6d7ffeb10d60cdac746d096e8ed6349e48c66b5c0e9784404d | 4.040 | 30 / 50 | KEEP_CURRENT |
| explanation | stage-2.0c31-candidate-1 / ea34f7943a86db20bdb8b58801c89aaf5a5483a8eeb650a96df6d2a61dd17665 | 7.477 | 30 / 47 | KEEP_CURRENT |
| why-calling | stage-2.0c32-sende-correction-1 / e42efb01c72e78f97a5c19de443e898637af5c0e55f3ec41429d206474b59faa | 5.851 | 60 / 201 | CURRENT_NEW_HUMAN_REVIEW_PENDING |
| unsubscribe | stage-2.0c31-candidate-1 / 5ce6b94bdcb51aff2d8c89550fc569dc35a2e9e43f418d3c779fc8efc2d8c483 | 4.876 | 10 / 46 | KEEP_CURRENT |
| repeat-prefix | stage-2.0c1-approved-1 / 1f5d3e769136abb40e4b9e6fb559a00df4f0bb203d0acf372bb0f9ec9c971f14 | 2.322 | 20 / 42 | HUMAN_ONLY_QUALITY_GATE |
| clarify | stage-2.0c32-sende-correction-1 / 5206820f9e531c97823a92dbbf3fcfee92c50fe6ff82e78e61846f48e9f0e06b | 5.016 | 10 / 36 | CURRENT_NEW_HUMAN_REVIEW_PENDING |
| callback | stage-2.0c1-approved-1 / 8566a2f49da26c619ad3c65fa7f26988fdd9ffadcb88a1b44c437be7307d4006 | 3.297 | 50 / 57 | HUMAN_ONLY_QUALITY_GATE |
| callback-close | stage-2.0c1-approved-1 / 235242fd29cf5b9c10995850c3ead56b9675cc792a229213e47429522db832c6 | 4.133 | 10 / 163 | HUMAN_ONLY_QUALITY_GATE |
| target-unavailable | stage-2.0c1-approved-1 / 2af35e3ecc193adb0821adf76b52c23ed1043dde09829e0dfa818755cd3f8d58 | 3.390 | 40 / 210 | HUMAN_ONLY_QUALITY_GATE |
| send-first | stage-2.0c1-approved-1 / 19877596aa4297bddd75529560767ed1263be9ea4f49a8bf20d332f291cd5a23 | 4.365 | 50 / 55 | HUMAN_ONLY_QUALITY_GATE |
| uncertain-consent | stage-2.0c1-approved-1 / ca9c8eb4d79560429d96f3a9e0464827bffcf1bda3d7b223df5b9d64e58f7da0 | 8.684 | 50 / 44 | HUMAN_ONLY_QUALITY_GATE |
| already-receiving | stage-2.0c1-approved-1 / 7057166601c2d641804a51b6f1a911c73a22b35034f099ae0d3153a59b84a1cd | 7.430 | 40 / 250 | HUMAN_ONLY_QUALITY_GATE |
| more-explanation | stage-2.0c1-approved-1 / 307972ad8bda36967145fce71b55a51e774fa640444d44fd8078e773a20c0ff8 | 9.381 | 10 / 51 | HUMAN_ONLY_QUALITY_GATE |
| stop-contact-close | stage-2.0c31-candidate-1 / 8938c63491e0cbb30b38a7d612e2f2fa6ee78776cc82c4d6d31179a88f060955 | 2.229 | 80 / 229 | KEEP_CURRENT |
| thank-you | stage-2.0c1-approved-1 / 60f854b66d216da98580481abbae72b931703754db522471ce96290eb8bb38a6 | 1.115 | 70 / 195 | HUMAN_ONLY_QUALITY_GATE |
| intermediary-consent-question | stage-2.0c1-approved-1 / 2d43ca1559a5a7183c41ee45fa85b18e05c6bf916f39d7465d71528c4a420da5 | 5.108 | 30 / 118 | HUMAN_ONLY_QUALITY_GATE |
| receptionist-target-request | stage-2.0c31-candidate-1 / fbf293862c077f414ba52043dc7f501d26283ec0f4dd3176afea20b14565ddfc | 5.016 | 60 / 46 | KEEP_CURRENT |
| receptionist-target-request | stage-2.0c31-candidate-1 / a4549b780cf7ed418c9434593913f88d105e8bdee9ca638a099addb2217cad1c | 4.876 | 10 / 56 | KEEP_CURRENT |
| wrong-person-close | stage-2.0c1-approved-1 / 8059a8e716422e153f67cd5fa6b33d8a5e028416624c6faeff084b4f8b4c5667 | 3.762 | 60 / 202 | HUMAN_ONLY_QUALITY_GATE |
| authority-ask | stage-2.0c1-approved-1 / 8001fa92ce955d8aa28c602c88ab396ef1fa189e9fd52767a48f5b5b47287deb | 4.923 | 50 / 223 | HUMAN_ONLY_QUALITY_GATE |
| wrong-person-close | stage-2.0c1-approved-1 / 71c8572bfe9aa2f008ddc93605906e664a6279fc4361356210fe0d1c1c0de46a | 3.994 | 70 / 254 | HUMAN_ONLY_QUALITY_GATE |
| intermediary-consent-question | stage-2.0c1-approved-1 / 80d93ed36b0ca3ebaa17cc69b49f11184a3e2a0e707ee763eac14a8d9e4028c4 | 5.016 | 10 / 46 | HUMAN_ONLY_QUALITY_GATE |
| authority-ask | stage-2.0c1-approved-1 / 6f1d62ef73a355a81211be1ddbd439fddd238f4720cf28a9226561fbd490c01b | 4.551 | 50 / 201 | HUMAN_ONLY_QUALITY_GATE |
| email-correction-confirm | stage-2.0c1-approved-1 / 0ff8196c2b656790e640a40fc3ead58af6579b9274d088d3876c52db70237f98 | 0.975 | 40 / 145 | HUMAN_ONLY_QUALITY_GATE |

## Signal limits and listening work

The JSON contains canonical/synthesis text, hashes, provenance receipts, format, gain, raw/rendered peaks/RMS, edge samples, quiet intervals, punctuation/clause counts, exact-byte feedback and replacement lineage per unit. Closed-container checks do not prove consonants were not truncated. Frame RMS below 0.005 is a reproducible quiet threshold; pauses may be appropriate. Relative RMS at joins does not measure perceived loudness or cadence. No realism percentage is reported.

Check connected `sende dig`, the organization alias, weak/soft-d contexts, `hav`, historical `framelde` (current close says `sige fra`), `medicinske opdateringer`, receptionist wording, `e-mailadresse`, and current Why Calling/Clarify/Success Close. Historical wording/ratings remain evidence and were not rewritten. These concerns require native exact-byte listening where signal evidence cannot decide.

## Transition audit

Successful direct, clarification, refusal and receptionist/transfer sequences run through the existing guarded session simulator. Rows record exact selected hashes, modeled output gaps and relative rendered RMS. IMMEDIATE, SHORT_NATURAL_PAUSE, WAIT_FOR_RECIPIENT and PROCESSING_WAIT are descriptive contracts; no pause or buffer was added. Recipient/approval/resolution waiting remains attributed separately from output. These are synthetic clock results, not physical silence/ASR/telephone measurements. A–G requested transitions are represented across these sequences. Physical concatenation, perceived rhythm, and native pronunciation remain unverified.
