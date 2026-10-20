# Stage 2.0C-3.1 — correction completion report

Status: **IMPLEMENTED / AUTOMATED AND LOCAL VALIDATION COMPLETE / NOT ACCEPTED**. Human retest by Asem is next. No merge, deployment, telephone transport or Stage 2.0D. No commit, push or PR update was performed in this pass.

Baseline: branch `codex/stage-2.0c3-human-acceptance`, HEAD `a5b70549484e560351dcb2f8e2513c26ac9b2eaf`. This is a **dirty working-tree candidate**, not a newly committed release. The previous draft PR alone does not contain it.

## 1. Authoritative evidence and exact findings

Read and parsed the complete 241,381-byte `WhatsApp Business Acceptance Data.json`. SHA-256: `c741e276f8d9fcd35232a4770fbb9ec33e3a983aed658992d12a154d2301ae0e`. It is human TEST evidence, not production consent. The findings JSON includes the complete original export and every verbatim comment, including whitespace/newlines, with no inferred approval. The companion findings Markdown has every review action, identity, playback proof, exact text and disposition.

37 review actions cover 36 distinct recordings: 27 approval actions / 26 distinct approved; 10 distinct rejected. Opening was reviewed twice with different output actions. `about-apurebase` was never reviewed. Rejections of why-calling and unsubscribe followed interrupted playback, so their missing completion proof is preserved rather than invented. Consent-question was approved with an organization-pronunciation concern; success-close was approved with an unsubscribe-method question.

Addressed rejected findings: hav pronunciation in refusal-close and stop-contact-close; framelde pronunciation in unsubscribe; interrupted/unnatural “Jeg” in why-calling; awkward “medicinske opdateringer” in explanation; vedkommende in both receptionist NAME requests; and three rejected email recordings. The previously approved fourth email and consent question also require new exact-hash review because their renderer/pronunciation representation changed.

## 2. Preservation

Before edits: all **433 tracked files** were SHA-256 baselined, plus git status/diff, branch/HEAD and evidence hash. Baseline worktree was clean. The preservation JSON includes the full before/after inventory and original status/diff. Only nine existing consent source files changed; all other original tracked files, original tests, server files and historical reports remain byte-identical. Stage 1.9.6 source/server/tests/configuration are unchanged. The entry-point addition is confined to the consent route and lazily loads C-3.1.

All original **25 C-1 static WAVs and 12 C-2 dynamic cached WAVs** remain byte-identical, including rejected/superseded bytes. All 26 distinct approved recordings remain available historically. **24 approvals remain current**; consent-question and the approved a_b+2 email are superseded only in this candidate and do not donate approval to new bytes. Original cache metadata is untouched. Exact original paths/hashes/statuses follow.

| Original recording | Original SHA-256 | Human decision / current carryover | Original file |
| --- | --- | --- | --- |
| opening | 247f0b55738cc440dd207d76237a78fdbaf07c473c701728e32965f6de136509 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/7374e7e34df81c8cec5f8c4fb0d15e7b48159a7f77a5892f7303ec167e9430c3.wav |
| purpose | bdd80e984b2df54688b27e5e2e92f5571d417649790b1386c491366ca2070a2a | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/e9013110ccd2dc639b7d638cd38563b65b4a5bf4a4ed41086072890e88c96e15.wav |
| consent-question | 2499be7f9d24f3ffe8f0ef698229615bf94ab368bb47e72cecbf0bf75508cca6 | HUMAN_LISTENING_APPROVED / historical or unreviewed | public/audio/consent-stage20c1/50d04c73e833ffaff11406beb5ecf32c271c9d2b4e2265c89d27cd5d2b6723d8.wav |
| email-request | 296dae9cfb01632d59c857755dcfcdba5c4abac94af58847f47ab37fa984a961 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/c76f6b07f9ee7c4fee1498fcd350d0a0ff9d62449736e163af3a4de83d1398a6.wav |
| email-readback-intro | 75a31d5e38c28352d8040ca5a77a9c6dcdc0a0498151c59547efe2e984a9b757 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/7033d48f0f96673a5bc8641da796b6e3aa3a3dae033898ac96eb83c6dd15b627.wav |
| email-confirmation-question | 0ff8196c2b656790e640a40fc3ead58af6579b9274d088d3876c52db70237f98 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/fda15e3a15daadaa533203ff8ca9f777578aa2ec75056d44298065d73948a03f.wav |
| success-close | b127cd49b4918351697c21d1a043441a40e176861ab8ec633f7677c5cab89d26 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/73d1b08bcda88782c346088d8f1675df6404378d84505c431dedcc07bc166e49.wav |
| refusal-close | 351925f2cc98204031d3ec450d68eef2038a6c5fa02dd5f1ce9defd5158d5c72 | HUMAN_LISTENING_REJECTED / historical or unreviewed | public/audio/consent-stage20c1/b5cb3098fef60f1cbd4563cf14808c3cd3085ce730c08eb01a459a2dfb1f0acd.wav |
| identity | 291a7e12e50a37bb1ff2f89127af9f5021ca697d5e2af8d4336117f3537a42e6 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/d04f62b9ad9d76d4724b0a90bb24b39aa8fe7ec97be81f24abbf357d4c2acb11.wav |
| about-apurebase | b1de20bc3b5a0b6d7ffeb10d60cdac746d096e8ed6349e48c66b5c0e9784404d | NOT_REVIEWED / historical or unreviewed | public/audio/consent-stage20c1/6ada746b87baba47d28edf1b40ce48e0a6e3cc0b9ee6f1ca3f2f5042642804b6.wav |
| explanation | 2e30daf57536ac4854c4e0aa62db8c79eb6a724464061786d5e35f0b76556142 | HUMAN_LISTENING_REJECTED / historical or unreviewed | public/audio/consent-stage20c1/4d4bd86e384a4a918b1852c49827a6e9b9122d096d83b2b9fe385124546a088a.wav |
| why-calling | ef9b9c93ab7d7f6c2f8af0a321fe87529c3ce071e4e994800fe2d80dbeafddfa | HUMAN_LISTENING_REJECTED / historical or unreviewed | public/audio/consent-stage20c1/2a1e8e2bf80cc6ef9d9eddf3d14c6683ef8e89da244ff4be0ceb65a590c06f6f.wav |
| unsubscribe | 82da76b20e70453c91ea25a21c3b21206e3aefe779e14ed7ef9c8472be239aa6 | HUMAN_LISTENING_REJECTED / historical or unreviewed | public/audio/consent-stage20c1/e95d7a401fa4856920ed7602799c144527a8065e4d32506a5f142dcd783ccf4a.wav |
| repeat-prefix | 1f5d3e769136abb40e4b9e6fb559a00df4f0bb203d0acf372bb0f9ec9c971f14 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/124f126bad7b7cfaa5cebab84b515e6ff9612e835baec291715e393622105290.wav |
| clarify | 4f7cd646ec5b46d260b2bc961e873df3dcfa4ea957baaf2691477be9a734f19d | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/2e4ca4046577fdf070b6bca20e067e3bd3538371dc5c010f51aa9b0aa75e6051.wav |
| callback | 8566a2f49da26c619ad3c65fa7f26988fdd9ffadcb88a1b44c437be7307d4006 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/855be49b2eadf2f805adbaa329758ef8952f7c1b0ac4193638356ed3b7dbdad6.wav |
| callback-close | 235242fd29cf5b9c10995850c3ead56b9675cc792a229213e47429522db832c6 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/1ad580fbd61e302a5d227d85e002cb01a09ab391a868895b33f38ab51a7cb3f4.wav |
| target-unavailable | 2af35e3ecc193adb0821adf76b52c23ed1043dde09829e0dfa818755cd3f8d58 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/43344c5931f5e4f099c9825bbddf0cdcc413fb8f3b8cd8f0dbd8c05661b78405.wav |
| send-first | 19877596aa4297bddd75529560767ed1263be9ea4f49a8bf20d332f291cd5a23 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/d80002cdbaa1e5dbdb20258f1b5e298a23bd3f95bec867d23b434a73b7de94e1.wav |
| uncertain-consent | ca9c8eb4d79560429d96f3a9e0464827bffcf1bda3d7b223df5b9d64e58f7da0 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/15a7f3253fe183406bc8142ef366ac8c1a43f45defe0095a617994ae3257146c.wav |
| already-receiving | 7057166601c2d641804a51b6f1a911c73a22b35034f099ae0d3153a59b84a1cd | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/7de595c630389b264bb01b0477fe989a0c8332eae66af4b5dd15252f8e91e7d2.wav |
| email-correction-prefix | 948e1a3f03f5ea0285a1516fa0da69ea1ff90bcaca73c416a0546c2e19c64b24 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/5967884e0df2ae2350b7274c2242c532df13838d087445924e69204cb2fd5f70.wav |
| more-explanation | 307972ad8bda36967145fce71b55a51e774fa640444d44fd8078e773a20c0ff8 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/93a08f778971d815c4fa2c354eb35ea14e07eb8377d73354ef62199b93502a8f.wav |
| stop-contact-close | 9ed1d21afe7af60c98e0987d89b579df28e27cadbde22e35515ae36ce4cf4c7e | HUMAN_LISTENING_REJECTED / historical or unreviewed | public/audio/consent-stage20c1/01044caa100080167e93c67441edb46fd399f232a008844185dd8f7c51570f25.wav |
| thank-you | 60f854b66d216da98580481abbae72b931703754db522471ce96290eb8bb38a6 | HUMAN_LISTENING_APPROVED / retained current | public/audio/consent-stage20c1/ea686b035128b54fc70ea7d357bfa40acc0a3320b101f030634db9920bcbd2a7.wav |
| email-readback-intro — anna3.test-7@clinic.dk | b556f09dddd1d9309f8dff3fc1df049c0e1bb3efbf80d961ef4e3df341301e86 | HUMAN_LISTENING_REJECTED / historical or unreviewed | benchmarks/stage20c2-dynamic-cache/094bbd3b24c4536bb36460a12a11cd6283912e82b297ec141ea83c1389ee2c76.wav |
| intermediary-consent-question — Jens Hansen | 2d43ca1559a5a7183c41ee45fa85b18e05c6bf916f39d7465d71528c4a420da5 | HUMAN_LISTENING_APPROVED / retained current | benchmarks/stage20c2-dynamic-cache/32ab04c8badee6a326b72f5ec619ec94c6d7a886b21949ae575a940c86bd7cf7.wav |
| email-readback-intro — anna@clinic.dk | dcaacb22b34ff576464a49bff4f08dc0e12557b2b4bd98f90f437f65eceed3d8 | HUMAN_LISTENING_REJECTED / historical or unreviewed | benchmarks/stage20c2-dynamic-cache/3c1097bebb48f9d3d335b0e317f82bef0127fad623ccec19b7c38130099a6b9b.wav |
| receptionist-target-request — Jens Hansen | 9d89447cd63c577a25a5442b0d954c171c82bdd7f980cfbed0891ca73cb8caf8 | HUMAN_LISTENING_REJECTED / historical or unreviewed | benchmarks/stage20c2-dynamic-cache/3fcca16ff11c3c331600ac9c5fd7d6dbd9b3c332e3fbcbf41eade5f7e05ba323.wav |
| email-readback-intro — anna2.test-7@clinic.dk | 74176d4a77da33b1096da5c62453663fc60a89a4596526ad401e56f1bf4cde11 | HUMAN_LISTENING_REJECTED / historical or unreviewed | benchmarks/stage20c2-dynamic-cache/9104fa03fc1ad8ef10a5d21bf0a33e88dbdf64ed389b0701dd59c47b4e3288cb.wav |
| receptionist-target-request — Anna Jensen | 4b2606b42d616b9bb23845a2e0eb452a12c2759c0bcb30abafe2c4f39ef7e706 | HUMAN_LISTENING_REJECTED / historical or unreviewed | benchmarks/stage20c2-dynamic-cache/a7c8e1e9879194c7fec9ac8c3073a330cb23fde60fdf93d62db37c8abc77d226.wav |
| wrong-person-close — Jens Hansen | 8059a8e716422e153f67cd5fa6b33d8a5e028416624c6faeff084b4f8b4c5667 | HUMAN_LISTENING_APPROVED / retained current | benchmarks/stage20c2-dynamic-cache/a817e97e963f5083cd4e9803c210b4430ae300de611ad38918b843908e33a29c.wav |
| email-readback-intro — a_b+2@x.dk | a2d4787ddba138fcfeff474ebc02d83001b5683291ed986c75a494bab4f02c31 | HUMAN_LISTENING_APPROVED / historical or unreviewed | benchmarks/stage20c2-dynamic-cache/ae99e612055486a9fd30f8d02b912fbc1fac796b272538e3523036e0854b2611.wav |
| authority-ask — Anna Jensen | 8001fa92ce955d8aa28c602c88ab396ef1fa189e9fd52767a48f5b5b47287deb | HUMAN_LISTENING_APPROVED / retained current | benchmarks/stage20c2-dynamic-cache/bd626ebff422aff8dffe6a83682f69a9bddc0f8d05cc93039cd0197090ea3e96.wav |
| wrong-person-close — Anna Jensen | 71c8572bfe9aa2f008ddc93605906e664a6279fc4361356210fe0d1c1c0de46a | HUMAN_LISTENING_APPROVED / retained current | benchmarks/stage20c2-dynamic-cache/dd5620b5bf17f06eb00a64c250cb1a3eee0f2874ab9e60dcbeae686667d4ef45.wav |
| intermediary-consent-question — Anna Jensen | 80d93ed36b0ca3ebaa17cc69b49f11184a3e2a0e707ee763eac14a8d9e4028c4 | HUMAN_LISTENING_APPROVED / retained current | benchmarks/stage20c2-dynamic-cache/eac711239c016d763cf4fb27f3ca80f2bdb8e6248fe6aac79944f5aeb52d632b.wav |
| authority-ask — Jens Hansen | 6f1d62ef73a355a81211be1ddbd439fddd238f4720cf28a9226561fbd490c01b | HUMAN_LISTENING_APPROVED / retained current | benchmarks/stage20c2-dynamic-cache/ec9607700680e1898f24a6f56c779d549ace09cf64aa5652cadf1a8b33afcc54.wav |

## 3. Candidate wording and organization pronunciation

ElevenLabs documents phoneme support only for certain models; Danish phonemes are not available for the required `eleven_flash_v2_5`. Switching to a different model is outside scope. [Provider pronunciation-dictionary documentation](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/pronunciation-dictionaries), [provider TTS guidance](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices).

Selected correctly spelled Danish alternatives avoid hav/framelde without spelling hacks. These are **candidates**, not a claim of native approval. All affected wording/bindings use `stage-2.0c31-candidate-1`.

| Phrase | Old Danish | New Danish | English back-translation |
| --- | --- | --- | --- |
| refusal-close | Det er helt i orden. Tak for din tid, og hav en god dag. | Det er helt i orden. Tak for din tid. God dag. | That is perfectly fine. Thank you for your time. Good day. |
| stop-contact-close | Det forstår jeg. Tak for din tid, og hav en god dag. | Det forstår jeg. Tak for din tid. God dag. | I understand. Thank you for your time. Good day. |
| unsubscribe | Ja. Du kan altid framelde dig igen, hvis du ikke længere ønsker at modtage informationen. | Ja. Du kan altid sige fra, hvis du ikke længere ønsker at modtage informationen. | Yes. You can always opt out if you no longer wish to receive the information. |
| explanation | Det kan blandt andet være information om sygdomsområder, produkter og medicinske opdateringer. | Det kan blandt andet være faglig information om sygdomsområder, produkter og andre relevante opdateringer. | This can include professional information about disease areas, products and other relevant updates. |
| receptionist-target-request | Jeg ringer vedrørende faglig information til [NAVN]. Kan jeg tale med vedkommende? | Jeg ringer vedrørende faglig information til [NAVN]. Kan jeg blive stillet videre? | I am calling regarding professional information for [NAME]. May I be put through? |

Why-calling keeps its canonical proposition unchanged and is resynthesized as one continuous request. Consent-question also retains the exact canonical text: “Må aPureBase sende relevant faglig information til dig via e-mail?” Both use the candidate spoken alias **a Pure Base**. Legal/display/audit organization remains **aPureBase**; canonical textHash and spokenTextHash are separate. The consent scope stays `apurebase-professional-information-by-email-v1`. All unaffected approved organization-containing recordings are retained without regeneration. No claim that the alias or delivery is correct until Asem listens.

Success-close remains the exact previously approved recording. B/B2 requirements establish confirmation email/unsubscribe expectations but do not establish an implemented, approved channel/mechanism/template. **UNSUBSCRIBE_METHOD_BUSINESS_CONFIRMATION_REQUIRED** remains open. No “via e-mailen” promise was invented.

## 4. New recordings and exact bindings

Exactly six static + two NAME + four EMAIL recordings were generated into the separate `public/audio/consent-stage20c31/` directory. Full canonical/spoken text, hashes, provider receipts, settings, sample count, provenance and media verification are in the audio manifest and durable generation JSONL. New assets are GENERATED_VERIFIED_LOCAL_ONLY, businessWordingApproved=false, candidateWordingAuthorized=true, productionApproved=false, and initially NOT_REVIEWED. No paid retries.

| New recording | Old audio SHA-256 | New audio SHA-256 | Old → new media seconds |
| --- | --- | --- | --- |
| consent-question | 2499be7f9d24f3ffe8f0ef698229615bf94ab368bb47e72cecbf0bf75508cca6 | 055b74f018aa753f03fea5a51701cc3a91ea0150e56e311a917fd0e9f4eb67af | 4.318917 → 3.947375 |
| refusal-close | 351925f2cc98204031d3ec450d68eef2038a6c5fa02dd5f1ce9defd5158d5c72 | b6ba0f6cf3fab2fddd612f0261bd7b97252f721ec350daae894e4bdbed685f4a | 3.390125 → 2.554208 |
| explanation | 2e30daf57536ac4854c4e0aa62db8c79eb6a724464061786d5e35f0b76556142 | ea34f7943a86db20bdb8b58801c89aaf5a5483a8eeb650a96df6d2a61dd17665 | 5.619208 → 7.476833 |
| why-calling | ef9b9c93ab7d7f6c2f8af0a321fe87529c3ce071e4e994800fe2d80dbeafddfa | 147ff7168b2e900239d6f6f5723de61c55c175f56d1793d25da972ad9ca609bb | 6.130083 → 5.805000 |
| unsubscribe | 82da76b20e70453c91ea25a21c3b21206e3aefe779e14ed7ef9c8472be239aa6 | 5ce6b94bdcb51aff2d8c89550fc569dc35a2e9e43f418d3c779fc8efc2d8c483 | 4.922625 → 4.876208 |
| stop-contact-close | 9ed1d21afe7af60c98e0987d89b579df28e27cadbde22e35515ae36ce4cf4c7e | 8938c63491e0cbb30b38a7d612e2f2fa6ee78776cc82c4d6d31179a88f060955 | 3.018583 → 2.229125 |
| email-readback-intro — anna3.test-7@clinic.dk | b556f09dddd1d9309f8dff3fc1df049c0e1bb3efbf80d961ef4e3df341301e86 | 042e43febe086fdf9166e8cb90f535c51e4a1ad4fa6342c020a72da97bc2ece9 | 18.715292 → 18.715292 |
| email-readback-intro — anna@clinic.dk | dcaacb22b34ff576464a49bff4f08dc0e12557b2b4bd98f90f437f65eceed3d8 | 21cfdc124951706d37945c14a4acc9390d35d627ab9520a3e5c495b26fec9e53 | 8.777125 → 15.650250 |
| receptionist-target-request — Jens Hansen | 9d89447cd63c577a25a5442b0d954c171c82bdd7f980cfbed0891ca73cb8caf8 | fbf293862c077f414ba52043dc7f501d26283ec0f4dd3176afea20b14565ddfc | 5.294167 → 5.015500 |
| email-readback-intro — anna2.test-7@clinic.dk | 74176d4a77da33b1096da5c62453663fc60a89a4596526ad401e56f1bf4cde11 | 5bc45c32fadca206ad76af9dcd5279dc34d3fbfa82946175f3669541c4dc6445 | 8.962917 → 19.319000 |
| receptionist-target-request — Anna Jensen | 4b2606b42d616b9bb23845a2e0eb452a12c2759c0bcb30abafe2c4f39ef7e706 | a4549b780cf7ed418c9434593913f88d105e8bdee9ca638a099addb2217cad1c | 5.201250 → 4.876208 |
| email-readback-intro — a_b+2@x.dk | a2d4787ddba138fcfeff474ebc02d83001b5683291ed986c75a494bab4f02c31 | 71dded509fbc9f45e07c19131c2033b9c7f025958de979991d827993e9312a2f | 5.479917 → 10.866958 |

Each new file is exactly `public/audio/consent-stage20c31/<new-audio-SHA-256>.wav`. The manifest lists every complete path. Generated media is PCM s16le mono / 24 kHz, verified non-silent with authenticated provider receipt and exact SHA-256. Voice Isabella `gIfqD5jrnhkFu8ENVbXC`, model `eleven_flash_v2_5`, speed **0.95**, requested gain **3.5573605757216837** remain fixed. Source/output clipping events: **0**. Existing peak protection activates on **two** recordings: anna2 email effective gain **3.191159693928252**, a_b email **3.135081519086205**, output peak ≈0.98. Other ten use the calibrated requested gain. Protection was preserved, not disabled.

## 5. Deterministic email redesign and trade-offs

New renderer: `stage-2.0c31-danish-spelling-words-1`. It uses explicit candidate Danish spelling words with one-to-one character/index/part audit, separator and domain cues. This is not asserted to be an official phonetic alphabet. It covers 67 distinct characters, including case; there is no LLM, repair, expected sentence, domain inference or silent mutation. The original email validation/normalization-review requirement still runs before rendering. Unsupported characters/structure and unknown cache entries fail closed.

| Character | Spoken token |
| --- | --- |
| 0 | tallet nul |
| 1 | tallet en |
| 2 | tallet to |
| 3 | tallet tre |
| 4 | tallet fire |
| 5 | tallet fem |
| 6 | tallet seks |
| 7 | tallet syv |
| 8 | tallet otte |
| 9 | tallet ni |
| a | Anna |
| b | Børge |
| c | Cecilie |
| d | Dora |
| e | Erik |
| f | Frederik |
| g | Georg |
| h | Hans |
| i | Ida |
| j | Jens |
| k | Knud |
| l | Ludvig |
| m | Marie |
| n | Niels |
| o | Oskar |
| p | Peter |
| q | Quintus |
| r | Rasmus |
| s | Søren |
| t | Theodor |
| u | Ulla |
| v | Viggo |
| w | William |
| x | Xenia |
| y | Yrsa |
| z | Zacharias |
| @ | snabel-a |
| . | punktum |
| - | bindestreg |
| _ | understregning |
| + | plus |
| A | stort bogstav Anna |
| B | stort bogstav Børge |
| C | stort bogstav Cecilie |
| D | stort bogstav Dora |
| E | stort bogstav Erik |
| F | stort bogstav Frederik |
| G | stort bogstav Georg |
| H | stort bogstav Hans |
| I | stort bogstav Ida |
| J | stort bogstav Jens |
| K | stort bogstav Knud |
| L | stort bogstav Ludvig |
| M | stort bogstav Marie |
| N | stort bogstav Niels |
| O | stort bogstav Oskar |
| P | stort bogstav Peter |
| Q | stort bogstav Quintus |
| R | stort bogstav Rasmus |
| S | stort bogstav Søren |
| T | stort bogstav Theodor |
| U | stort bogstav Ulla |
| V | stort bogstav Viggo |
| W | stort bogstav William |
| X | stort bogstav Xenia |
| Y | stort bogstav Yrsa |
| Z | stort bogstav Zacharias |

Each binding exports rawEmail, normalizedCandidate, renderedSpokenSequence, tokenSequence, rendererVersion, canonical textHash, assetHash and sourceTurnId/recipientRevision through slot + playback events. The given candidate is unchanged by rendering; raw ASR remains separately preserved in session email evidence, with explicit review for any existing normalization. A correction invalidates previous readback/confirmation; a new revision/owned final is mandatory. All four email fixtures require fresh listening review. Uppercase/all-map behavior is tested deterministically but no uppercase fixture was physically recorded or listened to in this authorized pack.

| Email | Old WAV seconds | New WAV seconds | Change seconds |
| --- | --- | --- | --- |
| anna3.test-7@clinic.dk | 18.715 | 18.715 | 0.000 |
| anna@clinic.dk | 8.777 | 15.650 | 6.873 |
| anna2.test-7@clinic.dk | 8.963 | 19.319 | 10.356 |
| a_b+2@x.dk | 5.480 | 10.867 | 5.387 |

These are decoded file durations, not physical call timings. Codewords improve token distinctness by design but may sound formal/slow; email durations are 10.867–19.319 seconds. Explanation also grows from 5.619 to 7.477 seconds. No naturalness, recognition accuracy or 30–90-second ordinary-call improvement is claimed from media length or mocks. Asem must evaluate comprehension and wall-clock impact.

## 6. ASR diagnosis: known stage, unproven historical cause

The authoritative export includes four initial A rehearsals with no microphone/provider finals and two microphone-ready B attempts. Actual getUserMedia/capture succeeded (48 kHz input, 24 kHz target). Transport failed **7.0 ms** and **3.1 ms** after setup began, before provider ready/recognition.started, before any provider event/final. Both failed closed to HUMAN_TAKEOVER.

**Exact historical root cause: NOT PROVEN.** The export does not retain backend health, requested URL/origin, local HTTP upgrade status, server log or credential-presence evidence. Missing backend/key, wrong launcher/URL or a local host/origin rejection are plausible. No timeout fired. It does not prove an upstream model/schema/auth fault, nor a recognition-quality defect.

Inspected the unchanged Stage 1.9.6 Danish continuous gateway, C-3 client adapter, env/model configuration and current official [OpenAI realtime-transcription documentation](https://developers.openai.com/api/docs/guides/realtime-transcription). The gateway uses server-side authorization, transcription session, 24 kHz PCM, languages=['da'], existing local turn commits/endpointing, no manual transcript correction. No ephemeral token rewrite, model switch, consent vocabulary or threshold changes were made.

Local deterministic regression reproduces **HTTP403 with missing OPENAI_API_KEY**, zero upstream connections; a loopback mock then proves ready → commit ACK → literal provider final through the **same unchanged gateway**. This narrows a reproducible wiring/configuration failure class; it does not identify the historical condition or verify real provider access.

## 7. C-3.1 wiring, preflight and human workspace

New single loopback launcher `server/consentRetest.ts` serves frontend, pinned original/new media and the existing recognition gateway on 127.0.0.1:5173. No extra media server and no ElevenLabs key required for this path. Health reports a unique C-3.1 marker/configured boolean without secrets/provider requests. It now retains safe local origin/host/key-presence flags, provider HTTP upgrade status, network code and session readiness/error stage for future diagnosis. Existing Stage 1 providers are exposed only for explicitly/manual-start fallback; nothing opens a provider at launch, health or page mount.

Preflight shows separate microphone, backend, provider/session authorization, realtime transport and final-smoke states. Key presence is not authorization. Capture must be actual getUserMedia; readiness must come from the provider; finals must be nonempty literal provider text with a current microphone turn/onset. Manual/unowned text cannot pass. The tester supplies an explicit named assessment of the literal final. Five bounded utterance examples are selectable without sending them as ASR hints. A fresh page must establish its own gate; prior preflight history remains exportable.

Retest route: **http://127.0.0.1:5173/consent-call?stage=2.0c31**. Order: (1) ASR, (2) six replacement static + original unreviewed about-apurebase, (3) four email, (4) two NAME, (5) A–R. Current unchanged24 approvals are retained. New13 reviews never inherit old approval; historical rejected bytes cannot be approved or restored as approved. Approve requires completion + named physical self-attestation; Reject requires note. Evidence-storage failure blocks further wrapper listening/review/mic/scenario actions and stops preflight; export remains available.

A–R stays locked until at least one genuine microphone/provider final is reviewed PASS and all current listening gates pass. All five smokes, required physical facets, actual-mic A–R and a genuinely timed success are required for eligibility for human acceptance review. **The application still always exports NOT_ACCEPTED**; eligibility is not acceptance.

Current binding/ordering/provenance/onset/completion/consent/authority/revision/email/takeover checks remain. Exact candidate definition is pinned; altered text, roles, scope or assets fail validation. No manual transcript controls appear on C-3.1. Source PCM remains transient. Facet review controls are visible; replacement status is computed from the current catalog, not historical rejected identities.

## 8. Validation and evidence boundaries

See validation.txt for commands and complete output. Final results: focused **139/139** tests in5 files; full **1,114/1,114** tests in77 files; lint/typecheck/build/diff-check PASS. The earlier unchanged full-suite run passed1,113 tests before the added storage-corruption regression. One initial concurrent full run had two5-second timeouts in legacy stage195 replay and continuous gateway tests (1111passed/2failed); rerunning alone passed with no timeout/test changes. No existing tests were weakened. Build retains the >500 kB chunk warning; the new correction workspace is lazily split (~190 kB).

New regressions cover baseline approvals/comments/rejections, exact candidate/version/scope/hash, all67 characters, unsupported/cachemiss handling, unchanged raw email, current slot/source/revision, stale confirmation, barge-in/late callback, partialYES→finalNO, old/delayed owner rejection, missing/failing preflight/manual bypass, missing/rejected listening/facets/scenarios, fail-closed takeover, no page-mount requests and corrupted evidence storage. Existing C-3/Stage1 tests continue to run.

Local browser QA plays all12 new cached recordings through actual WebAudio, retaining source-ended proof and gain metadata in `stage-2.0c-3.1-local-playback.json`. This proves technical output lifecycle on this browser only. At the browser’s actual 48 kHz decoded output, peak protection fired on one completed clip (a_b email, effective gain 3.3953079261124777); anna2 did not require protection after browser decoding. This differs from the two raw 24 kHz generation-verification activations reported above; the saved WebAudio gain evidence is authoritative for this local playback, and both have zero clipping. Agent did not mark physical listening approved, start mic, run live ASR or create production consent. A–R remains disabled. New human reviews=0; physical ASR=NOT_TESTED; pronunciation/naturalness=NOT_TESTED; telephone=NOT_TESTED.

## 9. Provider usage

User explicitly authorized the exact12-payload generation plan after automatic review required payload confirmation. Requests **12**; submitted spoken-text characters **1,308**; successful **12**; failed **0**; retries **0**. Intended text/hash/settings journaled before each request and verified cache checked. Successful receipt and exact media verified afterward. No OpenAI, telephone or stress-test requests by agent. No automatic generation/retry in human retest.

## 10. Exact changed files

Existing modified files (nine):

- src/consent/ConsentWorkspace.tsx
- src/consent/acceptance/Workspace.tsx
- src/consent/acceptance/listening.ts
- src/consent/acceptance/matrix.ts
- src/consent/acceptance/rehearsal.ts
- src/consent/acceptance/store.ts
- src/consent/approved/assets.ts
- src/consent/approved/localPlayback.ts
- src/consent/session.ts

New implementation/tests:

- server/consentRetest.ts
- server/consentRetestFallback.ts
- src/consent/corrections/Workspace.tsx
- src/consent/corrections/assets.ts
- src/consent/corrections/assetPack.json
- src/consent/corrections/humanBaseline.json
- src/consent/corrections/preflight.ts
- src/consent/corrections/render.ts
- src/consent/corrections/retest.ts
- scripts/stage20c31-generate.ts
- scripts/verify-stage20c31.ts
- tests/consent-stage20c31.test.ts
- tests/consent-stage20c31-gateway.test.ts
- tests/consent-stage20c31-view.test.tsx

New evidence/docs: this report; human-findings.md/json; audio-manifest.json; generation.jsonl; preservation.json; validation.txt; local-playback.json; workspace.jpg; health.json; STAGE-2.0C31-HUMAN-RETEST-README.md. All are prefixed stage-2.0c-3.1 except the named retest README. Full candidate file inventory/hashes are in preservation.json. Twelve exact new WAV paths are listed by the audio manifest/table above. No historical report changed.

## 11. Remaining human/business gates

Asem must review13 current identities (sixstatic+about, fourEMAIL, twoNAME), including the consent-critical organization alias. Complete the five genuine Danish microphone smokes; assess literal ASR accuracy, omissions and latency. Run all A–R with actual microphone, record all successful/slow/failed attempts, explicitly assess all facets, source onset/ownership, interruptions, stale YES, email correction, intermediary/authority and takeover, and return an actual ordinary successful-call duration. No agent or mock result satisfies this.

Business must confirm the actual unsubscribe mechanism before promising it. All uppercase spelling and other unknown NAME/email values remain physically unverified/cache-bounded. Telephone transport, real call handoff, live sustained recognition and production enablement remain unverified and disabled.

## 12. Handoff and stop state

Follow `STAGE-2.0C31-HUMAN-RETEST-README.md` (Danish). Local server is available via the single launcher; no provider starts itself. Actual UI health on this machine reports stage2.0c31/gateway/configured=true, model gpt-live-transcribe, language da, sample rate24kHz and no provider diagnostics/session. The sanitized response is retained in health.json; it is not an authorization or recognition PASS. Run `node --import tsx scripts/verify-stage20c31.ts` to verify the handoff before testing. Do not use the oldC3 frozen verifier for this new dirty candidate. Preserve test exports via a secure agreed channel; do not publish credentials/transcripts accidentally.

**C-3.1 is still NOT ACCEPTED.** Stop after implementation/local validation. Human retest and review are next; no merge, deploy, telephone integration or Stage2D follows automatically.
