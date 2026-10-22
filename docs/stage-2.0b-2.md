# Stage 2.0B-2 — wording freeze candidate and offline contracts

2026-10-18, Asia/Karachi. This stage is complete as an **offline specification/rehearsal candidate**, not a production consent system or an approved wording pack. Stage 2.0C has not begun.

## Result and boundaries

30 logical response units; **25 SPOKEN_CLIP**, **2 SYSTEM_ACTION**, **2 OPERATOR_ACTION**, **1 NO_AUDIO**. The full classification and all 25 spoken wording reviews, literal English back-translations, business risks and blocking review statuses are in [the wording review](stage-2.0b-wording-review.md). 43 existing scenario examples remain covered. There are still exactly 22 conversation states. Playback, answer-window and handoff statuses are evidence substates, not additional conversation states.

No OpenAI/ElevenLabs requests, audio generation, microphone capture, telephone calls, Twilio integration, production playback, external handoff, deployment, commit, push or PR occurred. The browser used a loopback-only **static Vite preview**, not the provider backend. Existing full-suite provider tests use mocked responses and local HTTP listeners.

All spoken units require **both native-Danish and business review**. No exact source-approved Danish text was provided. SOURCE_CLARIFICATION_REQUIRED identifies a further blocker, not an approval. No legal authority conclusion is made. The one changed spoken sentence resolves the two different consent addressees; all other spoken Danish remains unchanged.

The Stage 2.0B-1 matrix/manifest/report/validation remain historical baseline artifacts. The B-2 wording review and manifest supersede their two-question/all-units-have-audio assumptions. The old generator command delegates to the B-2 generator, preserving historical outputs.

## Canonical consent question and scope

- Phrase ID: `consent-question`
- Danish: **Må aPureBase sende faglig information via e-mail til den relevante sundhedsperson?**
- Intended English: May aPureBase send professional information by email to the healthcare professional concerned?
- Version: `2.0b2-draft-1`
- Scope ID: `apurebase-professional-information-by-email-v1`
- `critical=true`; consent-critical and authority-critical.

The scope object in `src/consent/wording.ts` specifies purpose `professional information`, action `send`, channel `email`, organization `aPureBase`, version `1`, and recipient scope **the identified target healthcare professional, directly or through an explicitly authorized intermediary**. It does not add telephone, newsletter or other channel/purpose permission. The target must be established separately; this phrase cannot invent identity.

The exact UTF-8 SHA-256 TEXT hash is recorded in the wording-review JSON, manifest and validation file. It is separate from the future audio-byte hash. A future approved asset must bind phrase ID, version, text hash and actual asset-byte SHA-256. `validateAssetBinding` rejects changed text, changed version or different bytes. There are no approved assets; every audio hash is null. The mock records a planned asset ID and null asset hash, never a fictitious physical-audio hash.

`intermediary-consent-question` remains one of the 30 logical IDs as a retired NO_AUDIO reference. It is not deliverable, requires no recording and cannot arm a window. Both eligible recipient paths select the same canonical atomic question. Native/business reviewers must approve the neutral indirect wording for direct HCPs and confirm represented-recipient scope before recording.

## All 22 states, unchanged

`ANSWERED`, `RIGHT_PERSON`, `RECEPTIONIST`, `BUSY`, `PURPOSE_REQUEST`, `EXPLANATION_REQUEST`, `CONSENT_ASK`, `CONSENT_YES`, `CONSENT_NO`, `CONSENT_UNCLEAR`, `EMAIL_REQUEST`, `EMAIL_GIVEN`, `EMAIL_CONFIRM`, `QUESTION_KNOWN`, `QUESTION_UNKNOWN`, `CALLBACK`, `HUMAN_TAKEOVER`, `END_SUCCESS`, `END_REFUSED`, `END_OTHER`, `AUTHORITY_CHECK`, `WRONG_PERSON`.

END states cannot restart. HUMAN_TAKEOVER accepts only hybrid end; the existing interpreter owns subsequent live input after the operator starts it.

## Authority policy

Policy version: `apurebase-authority-2.0b2-1`.

| Recipient | Eligibility requirement |
|---|---|
| TARGET_HCP | Explicit operator verification of the target, retained reason/time; authority status NOT_APPLICABLE |
| INTERMEDIARY | Current genuine explicit final authority evidence, exact turn/text retained, plus a **separate named operator attestation** referencing that evidence and current recipient revision |
| UNKNOWN | Never consent eligible |

Stored separately: recipientType, authorityStatus, authorityEvidenceTurnId, authorityEvidenceText, authorityAttestedBy, authorityAttestedAt, authorityPolicyVersion, original nested evidence, and attestation reason/time/revision. The UI default operator label is explicitly an offline rehearsal identity, not authenticated identity. Production must supply authenticated identity and trusted clocks.

A phrase selection or classifier label cannot manufacture spoken authority evidence. An address-handling claim is not a legal determination that an intermediary may grant permission; the evidence standard and required scope still need business/source review. Changing/reverifying the recipient or invalidating authority clears the current question, decision, email and attestation. Original evidence remains in turn/event history. UNKNOWN cannot be made eligible by a YES or agent override.

## Playback completion and answer ownership

Lifecycle: `NOT_STARTED → QUEUED → PLAYING → COMPLETED`, or `INTERRUPTED` / `FAILED`. Each record has playbackId, callId, phraseId, phraseVersion, assetId, assetHash, queuedAt, startedAt, completedAt, interruptedAt, failedAt, completionSource, recipientRevision and answerConsumed. Non-applicable timestamps are explicitly null.

`MockPlaybackAdapter` has create/queue/start/complete/interrupt/fail. Session controls expose queue and each separate lifecycle operation. No timers, audio or providers are involved. `rehearseResponse` is a deterministic **test helper** explicitly executing mock queue/start/complete; the UI uses separated controls. `repeat()` queues a new playback ID and requires new start/complete actions.

Only COMPLETED of the exact canonical text/version/hash, for the current recipient revision, opens a window. QUEUED, PLAYING, INTERRUPTED, FAILED, nonspoken actions, generic clarification and a retired question cannot do so. Wrong/stale IDs, invalid transitions, duplicate completion and completion after identity change/skip/end are rejected. Replacing/repeating cancels pending playback and invalidates the former window. Each window is consumed by exactly the next final utterance, including questions, uncertainty and refusal.

A final affirmative must retain **answerPlaybackId captured at speech onset**, match the completed playback and start **strictly after** completedAt. Earlier onset, equal timestamp, unknown onset, wrong ownership or stale final is UNCLEAR. Equal timestamps fail closed because ordering is unproven. First partial evidence fixes onset/owner for that source turn; a delayed final cannot relabel itself as belonging to a new question. Partial text is retained in the evaluation log, and bounded pending-onset retention fails visibly instead of evicting evidence.

Barge-in during queued/playing output preserves the raw transcript, marks the playback interrupted and cannot establish YES. Clarification/repeat is recommended. A new full completed question and a new owned final answer are required. Partial recognition never authorizes consent.

`PrerecordedPlaybackPort` and `OutputCompletionEvidence` in `src/consent/playback.ts` describe the future boundary: exact call/playback/phrase/version/asset identity, verified adapter completion, actual output-boundary proof and declared clock. Promise resolution, submission ACK, elapsed time or guessed playback duration are not completion proof. A future phone transport must supply real completion evidence. This port has **no production implementation**; the offline mock cannot be promoted to physical proof. The existing production Play gate remains closed.

Manual UI rehearsal: verify recipient; queue/start/complete the purpose, then canonical question; click **Mark mock speech onset** when simulating a new answer, type literal words, finalize, review. Omitting onset deliberately blocks YES. To test barge-in, mark/finalize while the question is PLAYING. No artificial timer simulates audio.

## Prerecorded-first production intent

Clinic audio → ASR → deterministic classification → guarded state machine → approved unit selection → prerecorded Isabella playback. Unsupported/uncertain/sensitive interactions → HUMAN_TAKEOVER. Arbitrary live AI-generated Danish answers are not a normal automated path.

Fallback remains English operator speech → unchanged Stage 1.9.6 interpretation → Isabella Danish. Pairing/start remain manual. No existing phone media connection is claimed transferred. All Stage 1.9.6 files/configuration/voice gain/speed/buffering/recognition/translation safeguards remain unchanged in this stage.

## Email and downstream handoff

Email remains: literal capture → operator review **if any characters change** → exact readback → recipient confirmation → confirmed email. No inferred domain, spelling invention or silent normalization. Changed addresses clear confirmation/readback, retain the previous candidate in audit events and link correction lineage. They do not require a new consent unless another event independently invalidates it. Classification of “the address is correct” alone cannot confirm it.

`ConsentHandoffCandidate` is an interface-only projection in `types.ts` / `handoff.ts`:

| Field | Evidence |
|---|---|
| auditVersion, evaluationOnly | `2.0b2-1`, true |
| callId, recipientType, recipientEvidence | Available identity verification evidence; no invented recipient identifier; authority policy/evidence/attestation included where applicable |
| consentScopeId | Exact canonical scope |
| consentQuestionPhraseId, consentQuestionVersion, consentQuestionTextHash | Exact bound question |
| playbackId, playbackCompletedAt, completionSource | Retained completed question record; MOCK_ADAPTER explicitly identifies rehearsal |
| answerTurnId, answerTranscript, answerClassification | Original final words, eligible YES |
| agentReviewedAt, consentDateTime | Separate agent review monotonic time and recorded ISO time; not authenticated production timestamps |
| email.rawTranscript, normalizedCandidate, confirmed, confirmedAt | Exact reviewed/read-back confirmed address, with normalization/correction/source/consent/revision lineage also retained |

Only END_SUCCESS with current eligible recipient, reviewed YES, completed bound question and confirmed exact email can prepare a candidate. Statuses: **PENDING_HANDOFF**, **HANDED_OFF**, **HANDOFF_FAILED**. Only explicit mock result controls exist. Candidate and underlying call evidence are retained unchanged when a mock handoff fails; attempts/status are separate. Snapshot/export projections are copies. Retry of a failed mock is possible; a mock acknowledged result is terminal for handoff attempts. No CRM/database/email provider or external write exists. HANDED_OFF is an offline mock result, not a real delivery/activation claim.

## Confirmation email / single opt-in / eight-day mechanism

These are descriptions of supplied project requirements, not legal advice or independent confirmation of legal validity. Sources: the supplied Stage 2.0B-2 requirements and Stage 2.0B-1 report sections on downstream obligations; exact original methodology/template remains unavailable for approval.

| Status | Known requirement or unresolved decision |
|---|---|
| SOURCE_SUPPORTED | Reviewed consent + confirmed email should be recorded with consent date/time; a downstream confirmation email, single-opt-in process, eight-day opt-out mechanism and downstream bounce/reporting behavior are required in the supplied project summary. |
| BUSINESS_DECISION_REQUIRED | **It is not established whether consent is immediately effective, conditionally effective, or finalized only after eight days.** No one of these is selected. The period’s start event (call, handoff, send, delivery or other), day counting/timezone and expiry effect are unknown. |
| BUSINESS_DECISION_REQUIRED | Approved sender/template, exact scope, opt-out language/action, authority evidence standard, bounce categories/consequences, reporting owner/recipient, suppression timing, effective system of record and retention policy require original-source/business confirmation. Do not infer double opt-in or a second affirmative requirement from “confirmation”. |
| IMPLEMENTATION_UNRESOLVED | No confirmation sending, delivery tracking, bounce monitoring, reporting, scheduling, eight-day timer, suppression integration or automatic consent activation exists. No unconfirmed legal/business behavior has been encoded. |

The `confirmation-process`, `unsubscribe`, scope/product/event, authority and future-contact/closing wording risks are explicitly flagged in the wording review. All 25 spoken units need native/business approval, not just the high-risk rows.

## Validation and preservation

- Focused: **223 passing tests, 5 files** = 199 baseline cases retained with specification-related expectation updates + 24 B-2 cases.
- Full: **852 passing tests, 70 files** (828 baseline + 24).
- lint, typecheck, build, git diff --check: pass.
- Build warning: 522.22 kB minified / 155.44 kB gzip main JS chunk exceeds Vite’s 500 kB warning threshold; nonfatal, no production performance claim.
- Browser rehearsals A–F pass on the static offline preview. A completed HCP question → reviewed YES → exact email → confirmation → END_SUCCESS; B playing+YES → UNCLEAR/interrupted; C interrupted+YES blocked → repeat with new playback ID/completion/new YES → candidate; D claim blocked → separate named attestation → canonical question completed → candidate; E unknown question → existing manual fallback; F successful evidence → HANDOFF_FAILED, YES/confirmed email/success retained. Detailed DOM results: `stage-2.0b-2-browser-rehearsal.json`; screenshots: flow-a/b/d/e/f and workspace.
- Browser harness corrections were inspection-only: native option disabled attribute was used where isEnabled() did not reflect an option’s disabled state; the interpreter button rendered uppercase. Neither required product-code changes or changed acceptance outcomes.
- **198 baseline source/server/public/test files hashed before edits; 181 protected files unchanged.** Zero unexpected changes to tracked non-consent patch content relative to the pre-existing dirty tree. `src/main.tsx`, all server files, public assets, interpreter code and non-consent tests remain byte-identical to the start of this stage. Full per-file SHA-256 before/after evidence: `stage-2.0b-2-preservation.json`.
- Existing uncommitted Stage 1.9.6/Stage 2.0A/B-1 work was preserved; git HEAD is not being used as a false clean baseline.

Old-test updates are bounded: all-unit audio assumptions now reflect deliveryType/25 assets; the two consent questions become one; intermediary expectations use the canonical question; repeat now explicitly starts/completes the new mock; source fixtures bind playback ownership at onset; configured registry test keeps planned text binding consistent. No safety regression was removed. Unknown/ambiguous/authority/email/terminal/fallback protections still pass.

## Exact files changed in this stage

Modified existing files:

- `src/consent/authority.ts`
- `src/consent/definition.ts`
- `src/consent/consentGuard.ts`
- `src/consent/types.ts`
- `src/consent/ConsentWorkspace.tsx`
- `src/consent/session.ts`
- `src/consent/playback.ts`
- `tests/consent-stage20b.test.tsx`
- `tests/consent-foundation.test.ts`
- `scripts/stage20b-specification.ts`

Added code/tests/generator:

- `src/consent/wording.ts`
- `src/consent/mockPlayback.ts`
- `src/consent/handoff.ts`
- `tests/consent-stage20b2.test.tsx`
- `scripts/stage20b2-specification.ts`

Added review/validation/evidence artifacts:

- `docs/stage-2.0b-2.md`
- `docs/stage-2.0b-2-validation.txt`
- `docs/stage-2.0b-wording-review.md`
- `docs/stage-2.0b-2-planned-audio-manifest.json`
- `docs/stage-2.0b-2-preservation.json`
- `docs/stage-2.0b-2-browser-rehearsal.json`
- `docs/stage-2.0b-2-flow-a.jpg`
- `docs/stage-2.0b-2-flow-b.jpg`
- `docs/stage-2.0b-2-flow-d.jpg`
- `docs/stage-2.0b-2-flow-e.jpg`
- `docs/stage-2.0b-2-flow-f.jpg`
- `docs/stage-2.0b-2-workspace.jpg`

`dist/` is an ignored local build output, not a source modification or deployment. CUA JSON/screenshot artifacts contain only dummy rehearsal text and evaluation IDs. There is no flow-C screenshot; its complete observed DOM result is in the browser JSON.

## Stage 2.0C recommendation and entry conditions

Do not start automatically. First obtain native-Danish/business approvals (including original methodology/template, canonical recipient scope, authority standard and exact eight-day/effect rule). Freeze approved text/version/hash. Then authorize a narrowly controlled prerecorded-asset pilot: generate only approved Isabella units, validate decoded media/provenance/voice/speed/gain/clipping and text+asset bindings; implement a real output-completion adapter with source-onset clock alignment, cancellation/repeat/barge-in ownership, and retained evidence. Physically verify actual completion boundaries and audible behavior before consent eligibility can rely on them. Keep live interpretation as fallback. CRM/email/telephone integration and consent activation remain separate explicitly authorized work.
