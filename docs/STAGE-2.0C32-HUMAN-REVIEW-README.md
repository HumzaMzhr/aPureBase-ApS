# Stage 2.0C-3.2 review guide

**HUMAN ACCEPTANCE CANDIDATE — NOT ACCEPTED — NOT PRODUCTION READY.**

No new audio or live ASR test is authorized or performed by this implementation. Do not merge, deploy, telephone-test or start Stage 2.0D from this guide.

## Offline review now

1. Read `stage-2.0c-3.2.md`, the A–N ledger, database audit and preservation proof.
2. Run `node --import tsx scripts/verify-stage20c32.ts`. All 515 historical files and all 49 recordings must match.
3. With the existing local Vite development server, open `/stage20c32.html`. This separate entry is a synthetic text inspector; it has no microphone, provider, audio-generation or save control. The existing `/consent-call?stage=2.0c31` remains the preserved C-3.1 workspace, including its historical email-readback behavior.
4. Inspect `stage-2.0c-3.2-listening-matrix.csv` and `stage-2.0c-3.2-speech-plan.json`. There are 42 inventory rows: 37 cached units, four dynamic templates and the correction-question alias. There are 50 reference/experimental plans. These are not 50 generation requests.
5. Review the new opt-in `StructuredEmailSession` adapter and its deterministic tests. It requires a verified local output port and independent contact mapping. On email-request completion it routes raw Danish transcripts into the structured acquisition controller; it never writes normalized text back over the consent transcript or enables the legacy email save/handoff path.

## Native Danish listening, after separate authorization

Keep Isabella, `eleven_flash_v2_5`, speed 0.95 and requested calibrated gain 3.5573605757216837. Retain the current gain protection and all original recordings. Do not re-label historical recordings as newly synthesized plans. Changed synthesis requires a fresh plan/version/asset binding and explicit generation authorization; unchanged existing audio can be evaluated as historical audio without generating it again.

The mandatory regression is `why-calling` / **sende dig**. Canonical wording remains:

> Jeg ringer kun for at spørge, om aPureBase må sende dig relevant faglig information via e-mail.

Asem's approximate “sente dej” versus intended “sene dej” perceptions are listening metadata only. They are never production spelling or canonical replacements. The comma-removal candidate may affect phrasing; it is not established as a consonant fix. A native listener must assess weak consonants, connected speech, soft-d, reduction, stress, pauses, intonation, rhythm and tempo. Unsupported Danish phonemes on the pinned model are blocked, not simulated with invented SSML.

The eight bounded experimental variants concern why-calling, refusal/stop closes, unsubscribe, success-close and the two receptionist name fixtures plus the receptionist template. Sentence-boundary variants may worsen joins and remain ungenerated. Other criticized units retain explicit human-review requirements rather than a version-only regeneration request. Long single-sentence units need native assessment before choosing additional atomic clause boundaries. A segmented consent question could not open its answer window until every segment had actually completed; no such playback change is enabled here.

For each exact audio/plan/canonical binding record reviewer, date, heard-exact-asset attestation, note and one of:

`NOT_REVIEWED`, `PASS`, `PASS_WITH_NOTE`, `FAIL_PRONUNCIATION`, `FAIL_PROSODY`, `FAIL_NATURALNESS`, `REGENERATE`, `HUMAN_TAKEOVER_ONLY`.

Acceptance targets: 100% of consent-critical inventory reviewed and accepted, ≥95% complete inventory accepted, and **PASS** for every mandatory regression. A failed critical unit blocks eligibility. Template review alone cannot approve arbitrary new HCP names. Current C-3.2 acceptance score is **0/42**, because no C-3.2 listening evidence has been returned; historical approvals are not erased or silently promoted into new evidence.

## Email/ASR physical verification, after separate authorization

Retain the C-3.1 health/capture/provider-ready/owned-final/human-reviewed preflight requirements and five smoke utterances. The optional `prepareC32Recognition` bridge preserves the existing Danish gateway and 800 ms local VAD endpoint, and forwards lifecycle metadata to both the old preflight and new email diagnostics. Constructing the bridge does not start it. Do not invoke its microphone/provider `start()` during offline review.

Use synthetic independently scoped records only until a real CRM schema/mapping is supplied. Test exact speech, ambiguous spelling, contradictory/wrong-domain speech, correction, interruption, duplicate/stale finals, identity revision changes and record-version changes. Preserve raw partials, finals, onset ownership, endpoints, parsed spans, candidates, normalizations, record snapshots, advisory output, selection, review and correction lineage.

After valid reviewed consent, the clinic hears the existing email-request clip and speaks its address. An exact unique match can receive the existing concise “Er det korrekt?” question. Only a fresh owned final after verified question completion can confirm the local candidate. High-confidence inference cannot use this generic question to confirm unspoken characters: require fresh exact spelling/clarification or operator review. There is no authorized new concise candidate-specific audio. Operator review cannot invent recipient evidence or save an address.

No source PCM or whole-call recording is retained. No downstream save/handoff is enabled. Return physical observations and exports through the agreed private review channel; do not publish real contacts or recordings by default. Measure actual call duration separately from the offline model. Do not claim improved pronunciation, WER, latency or telephone readiness from synthetic tests.
