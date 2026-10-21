# Stage 2.0C-3.2 — Danish speech quality and structured email resolution

**HUMAN ACCEPTANCE CANDIDATE. NOT ACCEPTED. NOT PRODUCTION READY.**

This stage implements an offline pronunciation-planning layer and an opt-in structured email session adapter. It does not establish better Danish pronunciation, ASR WER, physical latency or telephone readiness. The reported `why-calling` / `sende dig` defect remains unresolved by physical evidence.

## Baseline and preservation

Branch: `codex/stage-2.0c3-human-acceptance`. Local HEAD and fetched remote HEAD both contain and equal `34285a8d6f4f94c6e8036c375b8a3244c316c176`. The starting tree was clean. No commit, push, PR update, branch creation, merge or deployment was performed.

Before implementation, all 515 tracked files were hashed and the A–N ledger was created. The complete C-3/C-3.1 historical evidence/report inventory comprises 64 files; their paths, byte counts and hashes are preserved in `stage-2.0c-3.2-historical-evidence-read.json`. No historical report or Asem feedback was edited.

All 515 historical files remain byte-identical, including Stage 1.9.6, recognition/gateway/server/configuration files, prior consent code/tests, 37 original recordings and 12 C-3.1 corrected recordings. There are no preservation exceptions. New work lives entirely in new paths. The C-3.1 verifier also passes its existing strict proof. See `stage-2.0c-3.2-preservation.json` and `scripts/verify-stage20c32.ts`.

## A–N ledger

Every requested issue is present in `stage-2.0c-3.2-issues.json`, with the original OPEN event retained and implementation/current status appended. A, C, E, L and M require human/physical retest. H is blocked on a real contact source/schema/mapping. B, D, F, G, I, J, K and N have automated evidence. Those statuses describe component evidence, not stage acceptance. Unsupported Danish dictionary phonemes remain explicitly blocked on the pinned model.

## Canonical Danish and synthesis plans

`src/consent/stage32/speech/plans.ts` separates canonical text/hash/wording version/scope/recipient role from synthesis text, segments, overrides, prosody, version/hash, voice/model/speed and exact asset association. Canonical wording stays the audit and consent authority. No deliberately misspelled Danish or transcript-specific word replacements were added.

The 42-row inventory includes 37 current cached units, four unresolved dynamic templates and the correction-question alias. Each row retains concerns for native review: weak/silent consonants, soft-d, unstressed endings, linked/function words, compound stress, aPureBase, e-mail, sundhedsperson, faglig, information, relevant and existing medical vocabulary where present. Heuristics do not assign a linguistic PASS.

There are 50 plans: 42 references plus eight bounded experiments. Existing historical rendering is used for reference association; its original generation receipt is never rewritten. Unchanged exact references may reuse their pinned bytes for fresh listening review. A changed synthesis plan cannot borrow that association, version or historical hash. New-asset binding checks require an independently supplied canonical authority, exact synthesis version/hash and pinned voice settings.

Experimental subset:

| Units | Proposed experiment | Limit / trade-off |
|---|---|---|
| why-calling | Remove the comma before `om` in synthesis text only | May change phrasing; no evidence it fixes the weak consonant in `sende dig` |
| success-close, refusal-close, stop-contact-close | Existing sentence boundaries as separate planned units | Joins/pauses may sound less natural; no concatenation/playback change enabled |
| unsubscribe | Sentence-boundary experiment | Native judgment required for reduction and final intonation |
| receptionist-target-request, two name fixtures and template | Existing sentence boundaries | Arbitrary names still need independent name evidence and listening |
| consent-question, explanation, diagnostic email readback and remaining inventory | Reference / human review; no version-only regeneration request | Criticism remains explicit; long clauses need native boundary selection before further experiments |

The mandatory registry retains Asem's approximate “sente dej” and intended “sene dej” perceptions as review metadata only. Canonical text remains `sende dig`. No proposed phonetic misspelling is sent to synthesis. Isabella `gIfqD5jrnhkFu8ENVbXC`, `eleven_flash_v2_5`, speed 0.95 and calibrated requested gain 3.5573605757216837 are unchanged.

Official provider documentation lists dictionary phonemes for other model identifiers and requires a different model for non-English phonemes. The pinned `eleven_flash_v2_5` therefore does not acquire Danish phoneme/SSML support from this stage. Alias controls and request-context fields exist, but do not prove natural pronunciation. No model migration or provider request was made. Sources: [pronunciation dictionaries](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/pronunciation-dictionaries), [TTS request contract](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).

All C-3.2 listening statuses start NOT_REVIEWED. Target: all consent-critical rows reviewed and accepted, ≥95% complete inventory accepted, 100% PASS for mandatory regressions. A critical failure blocks eligibility. The current new-review acceptance score is 0/42. Historical approvals remain preserved separately; they are not fabricated as C-3.2 reviews. No audio was generated or acoustically evaluated in this stage.

## Structured email acquisition

The opt-in `StructuredEmailSession` extends the existing C-3.1 session without modifying it. Existing C-3.1 URLs retain their historical behavior. The C-3.2 adapter uses the existing exact email-request recording:

> Tak. Hvilken e-mailadresse må vi sende informationen til?

After actual completed request playback and valid reviewed consent, clinic speech enters `tokenizer → reconstruction → explicit normalization → scoped resolver → deterministic confidence gate`. There is no Danish-to-English translation, fuzzy contact search, script transcript, domain repair or invented character.

The grammar supports literal ASCII email and explicit Danish/English separator forms, letter cues/spelling words, digit cues, repeated letters, uppercase cues, hyphens, underscore and plus tags. Uncued `en` / `to` retain bounded alternatives rather than being promoted to one interpretation. Unknown prose, missing separators, unsupported characters, noise, mid-address correction or excessive ambiguity fail closed. Domain case folding and terminal ASR punctuation handling are explicit; local case, plus tags and dots are preserved. Parsed token spans, operations and all reconstructed candidates remain distinct from raw text.

The character renderer is still available as a no-playback diagnostic comparison. The C-3.2 normal `readbackEmail()` entry is blocked; the C-3.1 renderer, recordings and guards remain unchanged.

| Class | Action | Required evidence |
|---|---|---|
| EXACT_VERIFIED_MATCH | Normal concise confirmation | One exact spoken reconstruction and one exact independently scoped record |
| HIGH_CONFIDENCE_MATCH | Explicit disambiguation / recipient confirmation | Unique record explains retained token alternatives; generic yes cannot confirm inferred characters |
| AMBIGUOUS_MATCH | Clarification/operator review | Multiple plausible candidates or authoritative records |
| CONTRADICTORY_MATCH | Clarification/operator review | Spoken characters retained; stored value never overrides them |
| NO_DATABASE_MATCH | Clarification/operator review | No record or unavailable/timed-out evidence, never certainty |
| UNPARSABLE | HUMAN_TAKEOVER | Insufficient literal structure or unsupported evidence |

No class auto-saves. Exact matches may use the existing `Er det korrekt?` clip, tied to the current address attempt and recipient revision. A fresh owned final after verified source-ended completion is required. Early speech, barge-in, late callback, duplicate/replayed finals, missing output proof, stale consent or changed identity invalidate eligibility. Confirmation re-fetches records; any changed value/version/source/set invalidates the result.

High-confidence inference cannot safely use the generic exact-match question. It requires a fresh exact address/spelling turn, or operator review; candidate-specific concise audio is not generated or authorized. This deliberately sacrifices automatic completion where exact confirmation is unavailable. The adapter returns `CONFIRMED_LOCAL_CANDIDATE` only; baseline email saving, success/handoff authorization and all external writes remain disabled. Operator review records a note and cannot override consent, exactness or recipient confirmation.

## Database and model boundaries

No actual contact database/API/schema/export or verified current-call mapping was found in supplied materials. See `stage-2.0c-3.2-database-audit.md`. `ContactEmailResolver` requires independent call/contact identity evidence and caps output at three exact-scope records. The implemented fixture adapter accepts synthetic IDs and reserved `.example` values only. Real CRM integration remains blocked until a source/schema/mapping is provided.

`EmailReconciliationPort` is an injected design/mock contract only. No network implementation is installed or enabled. Input is limited to literal Danish text, deterministic tokens/candidates and at most three scoped records. A suggestion must agree with the independent deterministic selection/class and provide the complete token/uncertainty mapping. Nonexistent addresses, one-character changes, wrong candidates, class promotion, malformed payloads and attempts to resolve ambiguity by model assertion are rejected. Even an accepted advisory agreement grants no saving authority.

The resolver has a bounded 250 ms default deadline, cancellation and no retry. Late results cannot update a changed/corrected attempt. Database errors/timeouts remain review, not model-assisted certainty.

## Evidence, consent and ASR

Email audit storage is private and append-only; exported objects are copies. It retains raw partial/final transcripts, provider IDs, source-turn IDs, onset ownership, first-boundary recipient revision, parsed spans, candidates, normalization operations, record snapshots, scores/reasons, advisory outputs/rejection reasons, selection source, operator note, recipient confirmation and correction lineage. Raw evidence is never replaced with normalized text.

Email resolution cannot create consent or infer recipient identity/authority. It rechecks the current verified recipient and authority policy, exact scoped question, completed verified local output, subsequent owned explicit provider final, separate agent review and unchanged revision. Manual, missing, refused and stale consent evidence do not qualify. Withdrawal/human/identity controls are forwarded unchanged to the original consent engine.

The C-3.1 recognition gateway, endpointing, models and preflight are byte-identical. The inert optional `prepareC32Recognition` bridge connects the unchanged microphone/VAD adapter to the old preflight and new diagnostics; constructing it does not open a provider session. Source onset/endpoint/commit/final diagnostics explicitly report unavailable provider confidence and word alignment. Local VAD is not proof of acoustic word alignment or boundary accuracy.

Source PCM remains transient. Whole-call recording is not enabled. A future recording authorization interface is defined but unused; it does not install a recorder. New diagnostics reject binary PCM. No live microphone/provider verification or ASR WER improvement is claimed.

## Duration model

The ordinary target-HCP exact-match path includes opening, purpose, consent question, email request, concise confirmation and success-close content: **27.7710417 s static audio**, **0 s dynamic email audio**. This is content accounting, not a currently authorized downstream-success transition or a physical measurement.

| Component | Seconds | Evidence |
|---|---:|---|
| Existing static audio | 27.771 | Manifest content durations |
| Dynamic email spelling | 0 | Omitted in proposed normal exact-match path |
| Recipient responses | 12–25 | Assumption |
| Transitions | 1–4 | Assumption |
| Operator review | 2–6 | Assumption |
| Resolver processing budget | 0–0.25 | Local deadline assumption, not measured CRM latency |
| Provider/network | Unknown | No live ASR/CRM evidence |
| Unknown/unmodeled | Not included | Barge-in, output gaps, arbitrary names, overlap, new speech variants |
| Subtotal excluding unknowns | **42.771–63.021** | Offline model only |

Compared with the four C-3.1 character fixtures, removing their prefix plus dynamic readback removes **13.793–22.245 s of modeled audio content**. That is not a measured call-time saving. High-confidence/operator paths are not assigned a fabricated bound. New synthesis durations and concatenation quality remain unknown. The 30–90 s target, preferred 30–60 s range and existing short refusal/busy exits remain intact; nothing is padded to a minimum duration.

## Validation and remaining review

See `stage-2.0c-3.2-validation.json` and its complete command log for final results. The C-3.2 suite covers the 45 requested adversarial cases plus pronunciation identity, historical-reference reuse, output proof, cancellation, diagnostics, privacy and inert-provider construction. Prior tests, timeout limits, worker configuration, assertions and retries were not changed.

The independent offline workbench at `/stage20c32.html` was opened and its synthetic exact-match result checked. It displays CONFIRM, consentEvidence=false and saving disabled. It has no microphone/provider/audio-generation controls. That browser check establishes UI wiring only, not ASR, audio pronunciation or consent acceptance.

Pending: Asem/native Danish listening for all required units and `sende dig`, explicit authorization for any new audio, high-confidence clarification UX, five ASR smoke tests/live email accuracy, a real bounded contact adapter/schema, physical end-to-end evidence and measured call timing. Telephone integration, deployment and Stage 2.0D have not started.

No provider requests, paid generations, extra audio, source recordings, credentials or private contacts were introduced. This work remains uncommitted and unpushed for review.

Exact added paths are listed in `stage-2.0c-3.2-files.json`. There are zero modifications or deletions of historical tracked files.
