# Stage 2.0B-1 — inspection and implementation report

## Inspection recorded before implementation

Read the Stage 2.0A design/validation, all eleven consent modules, all three
consent test files, and the Stage 1.9.6 `StreamingView`, `StreamingHost` and voice
identity interfaces. The existing registry has 13 draft entries, including a
combined opening, combined explanation, a clarification that repeats the full
consent proposition, and a blanket receptionist restriction. The new workflow
requires explicit intermediary authority evidence and operator attestation.

Before editing, recorded hashes of 105 files under `src`, `server`, `public`,
the existing Git status, and the complete existing tracked diff. Preservation
checks will compare these snapshots, not assume the working tree was clean.

## Business source and assumptions

The source for this stage is the user's supplied Stage 2.0B-1 methodology summary
(attachment `4e556453-4326-4285-80c0-95461a08a289/Pasted text.txt`). No separate
methodology document was found in repository documentation. Do not attribute
new Danish sentences to an original aPureBase document.

Source-supported process requirements: approved native-language communication
template; direct HCP or appropriately authorized intermediary; record acceptance,
email address and consent date/time; downstream confirmation email with the
documented single-opt-in / eight-day opt-out mechanism; downstream bounce
monitoring/reporting. This is a supplied business workflow, not an independent
legal conclusion. Exact template, authority scope, email process wording and
opt-out timing anchor still require business validation.

Assumptions: operator HCP verification is an explicit attestation; intermediary
claims require final transcript evidence AND a separate operator attestation.
Authority claims do not prove legal authority. Every change of respondent or
authority invalidates pending consent and dependent email. Rehearsal completion
is simulated, not measured playback. No phone transport or production consent
system exists here.

## Planned bounded changes

Keep the existing 20 state names; add only `AUTHORITY_CHECK` (distinct guarded
authority condition) and `WRONG_PERSON` (explicit consent/email exclusion).
Represent email correction as an invalidated confirmation subflow rather than a
new state. Keep Stage 1.9.6 and its takeover component byte-identical. Extend only
consent contracts, registry/graph, deterministic classifier, evidence guards,
session and rehearsal UI; add matrix/manifest specifications and offline tests.

Inspect/reuse the 13 existing IDs, retaining provenance of wording changes.
Consent stays a standalone complete question, with separate direct-HCP and
intermediary wording so fragments cannot silently change its addressee. New
wording and audio remain unapproved; playback remains disabled. No external
provider, telephony, deployment, commit or PR work is included.

## Final scenario matrix and wording review

The [master scenario matrix](stage-2.0b-master-scenario-matrix.md) contains **30
atomic response units and 43 offline scenario examples**, including all requested
openings, target/intermediary cases, information, consent, email, callback,
exceptions and closing paths. Every unit includes the required metadata and a
unique planned asset ID. Table-driven tests cover every unit and scenario.

The count is a result of coverage and reuse, not a forced target. In particular,
two complete consent units are necessary to distinguish permission for the HCP
themselves from permission relating to the HCP represented by an intermediary.
Neither question is assembled from fragments. Only these two units can arm a
question; generic clarification cannot do so.

All 30 units require **native Danish AND business approval**. Their primary
wording status is either `DRAFT_NATIVE_REVIEW_REQUIRED` or
`BUSINESS_APPROVAL_REQUIRED`; no exact approved Danish source was supplied, so
zero units are labeled `SOURCE_SUPPORTED`. Business process rules above are
source-supported by the supplied summary; newly authored Danish sentences are
not attributed to an aPureBase document. See the matrix for every sentence and
its English meaning. None is production-approved.

The existing 13 IDs were reviewed rather than discarded:

| Stage 2.0A ID retained | Decision |
|---|---|
| identify | Split greeting and target-person question into separate units; identification now stands alone |
| purpose | Keep short purpose; make addressee neutral before the separate scoped question |
| explanation | Split professional/medical material from product/update/event wording |
| consent-question | Retain complete direct-HCP text; add a separately versioned intermediary question |
| clarify | Remove embedded consent proposition; clarification no longer arms consent |
| email-request | Retain wording; require current reviewed eligible YES |
| email-confirm | Explicitly prompt human exact readback; no generated dynamic address speech |
| unsubscribe | Draft wording points to the downstream confirmation mechanism; business review required |
| callback | Retain atomic callback question |
| receptionist-close | Retain a safe close for an unverified intermediary; no blanket incapacity rule |
| callback-close | Retain callback close |
| refusal-close | Retain refusal close, including withdrawal handling |
| success-close | Retain close only after current reviewed YES and confirmed address |

## Final states and transition table

Exactly **22 states**: ANSWERED, RIGHT_PERSON, RECEPTIONIST, BUSY,
PURPOSE_REQUEST, EXPLANATION_REQUEST, CONSENT_ASK, CONSENT_YES, CONSENT_NO,
CONSENT_UNCLEAR, EMAIL_REQUEST, EMAIL_GIVEN, EMAIL_CONFIRM, QUESTION_KNOWN,
QUESTION_UNKNOWN, CALLBACK, HUMAN_TAKEOVER, END_SUCCESS, END_REFUSED, END_OTHER,
AUTHORITY_CHECK, WRONG_PERSON.

`AUTHORITY_CHECK` represents a materially different eligibility gate, and
`WRONG_PERSON` invalidates all person-dependent evidence. Email correction does
not need another conversation state: its subflow is represented by email status
(`CORRECTION_REQUIRED`), discarded prior confirmation, correction lineage and
fresh readback/confirmation requirements.

| Current state | Normal event/action | Destination and guard |
|---|---|---|
| ANSWERED | Greeting / caller identification / ask target | ANSWERED / ANSWERED / RIGHT_PERSON; no identity verification inferred |
| RIGHT_PERSON | Agent verifies HCP or confirms intermediary authority, then purpose | CONSENT_ASK; eligibility remains a separate guard |
| RECEPTIONIST | Authority question / transfer request / safe close | AUTHORITY_CHECK / RIGHT_PERSON / END_OTHER; transfer does not verify the new person |
| AUTHORITY_CHECK | Claim / denial / uncertainty | Remain AUTHORITY_CHECK; status and evidence recorded separately |
| AUTHORITY_CHECK | Operator confirms valid current claim | RIGHT_PERSON with AGENT_CONFIRMED authority; no consent yet |
| AUTHORITY_CHECK | Unclear authority / human assistance | HUMAN_TAKEOVER after explicit operator action |
| WRONG_PERSON | Wrong-person close | END_OTHER; recipient becomes UNKNOWN, dependent evidence invalid |
| BUSY | Callback question | CALLBACK; pending question consumed |
| CALLBACK | Callback close | END_OTHER |
| PURPOSE_REQUEST | Purpose or supported aPureBase description | CONSENT_ASK; no question armed |
| EXPLANATION_REQUEST | Supported information response | CONSENT_ASK; no question armed |
| QUESTION_KNOWN | Supported opt-out/process response | CONSENT_ASK; fresh complete consent question still required |
| QUESTION_UNKNOWN | Recommend human assistance / operator takeover | HUMAN_TAKEOVER only on explicit action; no generated answer |
| CONSENT_ASK | Exact appropriate complete question delivered in rehearsal | CONSENT_ASK; unique question instance armed |
| CONSENT_ASK / CONSENT_UNCLEAR | Eligible explicit final YES after known completion and onset | CONSENT_YES candidate only |
| CONSENT_YES | Explicit operator YES review | EMAIL_REQUEST with current recipient revision and consent timestamp |
| CONSENT_NO | Operator NO review and refusal close | END_REFUSED |
| CONSENT_UNCLEAR | Generic clarification | CONSENT_ASK, still unarmed; fresh complete consent question required |
| EMAIL_REQUEST | Literal email after reviewed eligible YES | EMAIL_GIVEN; capture raw text/candidate/source lineage |
| EMAIL_GIVEN | Static readback prompt | EMAIL_CONFIRM; operator must read back exact address |
| EMAIL_GIVEN / EMAIL_CONFIRM | Incorrect address / correction request | EMAIL_REQUEST, correction required; old readback and confirmation discarded |
| EMAIL_REQUEST | Corrected final address | EMAIL_GIVEN with new source turn; no inherited confirmation |
| EMAIL_REQUEST | Address refused/unavailable, safe close | END_OTHER; no inferred address or success |
| EMAIL_CONFIRM | Exact reviewed readback and recipient confirmation attested, then success close | END_SUCCESS; all evidence must still be eligible/current |
| Any active | Explicit refusal / withdrawal / stop-contact | CONSENT_NO immediately; prior YES and email invalidated |
| Any active | Busy / callback / supported question / unsupported question | BUSY / CALLBACK / QUESTION_KNOWN / QUESTION_UNKNOWN; pending question consumed |
| Any active | HUMAN TAKEOVER / END CALL | HUMAN_TAKEOVER / END_OTHER; hybrid ports stopped |
| HUMAN_TAKEOVER | Hybrid END CALL | END_OTHER; input otherwise belongs to existing interpreter |
| END_SUCCESS / END_REFUSED / END_OTHER | Any event | Blocked; terminal states cannot restart |

The master matrix also contains the generated interruption table for **every
state** and the complete configured state/event table. Unsupported transitions
are explicitly rejected. Runtime evidence guards are additional requirements;
reaching a graph state alone never establishes authority or consent.

## Recipient and authority evidence model

`recipientType`: TARGET_HCP, INTERMEDIARY, UNKNOWN.
`authorityStatus`: NOT_APPLICABLE, UNVERIFIED, CLAIMED, AGENT_CONFIRMED, DENIED.
Unknown authority is UNVERIFIED plus an explicit uncertainty intent/evidence and
takeover recommendation, rather than an invented sixth authority status.

A target HCP needs an explicit operator verification reason. Classification of
“Det er mig” changes conversational state only; it does not verify identity.
Receptionist classification identifies a possible intermediary role but grants
no authority. “Yes”, “I can do that”, secretary status and handling email cannot
establish authority. A narrow complete final authority claim records:

```
authorityEvidence: {
  transcriptTurnId, transcriptText, classifiedIntent, recordedAt,
  recipientRevision
}
authorityAttestation: {
  evidenceTurnId, reason, recordedAt, recipientRevision
}
```

Eligibility requires INTERMEDIARY + AGENT_CONFIRMED + an actual retained final
claim + a separate reasoned operator attestation linked to it. The independent
guard rechecks the claim, intent and current revision. The classifier cannot set
AGENT_CONFIRMED. An override, phrase selection, confidence score, partial, stale
claim or a copied/mutated UI snapshot cannot manufacture evidence. The operator
attestation records a human decision; the software does not determine legal
authority. Its business scope must be approved against the original methodology.

Recipient/authority changes increment the revision, clear pending questions,
reviewed YES and email, and invalidate earlier attestation. Invalidated evidence
is retained in the audit log and earlier turn records, not silently rewritten.

## Consent evidence model

The independent guard requires an eligible recipient, exact scoped question
text/version, unique question instance, known finite completion time, matching
recipient revision/type, final explicit affirmative without conflicting text,
speech onset at/after question completion, immediate question relevance, and
separate operator review. A final intervening response consumes the question.
Generic clarification, translation, email provision and general okay never arm
it. Silent/unknown onset or overlapping speech stays UNCLEAR.

Question evidence retains response ID/version, exact text, scope, instance ID,
completion time, delivery kind and recipient revision/type. Review retains
source turn ID, review reason, override status and consent date/time. A new
explicit refusal or withdrawal invalidates any reviewed YES and dependent email.
Stop-contact requests are logged locally, block renewed consent in the same
rehearsal, and explicitly report downstream action as incomplete.

Rehearsal completion is `delivery: rehearsed`, never audible evidence. There is
no production question-completion boundary yet. The existing provider adapter
does not supply/invent speech onset, so real consent eligibility remains blocked
without future transport/endpoint evidence.

## Email evidence and correction model

Capture is downstream of current reviewed eligible consent. Store separately:
`rawTranscript`, `normalizedCandidate`, `readbackValue`, `confirmed`,
`confirmedAt`, `sourceTurnId`, recipient revision, consent turn and correction
lineage. `value` and `turnId` remain compatibility aliases; they are not silently
corrected values.

Extraction may identify a literal address after an optional “my email is” label;
it does not infer spelling, lowercase, repair a domain or convert spoken spelling.
The only proposed normalization is removal of terminal transcript punctuation.
That character change is flagged and requires an explicit reasoned operator
review before readback/confirmation. Unsupported spelling goes to human review.

Incorrect/replaced addresses discard old readback, confirmation and confirmedAt.
Fresh address evidence, exact readback and confirmation are required. A detected
email-confirmation intent alone does not mark correctness. The UI exposes
readback and confirmation as separate actions. The Stage 2.0A atomic confirmation
API remains compatible when its boolean explicitly attests both actions; it is
still subject to exact-match, revision and normalization guards.

## Human takeover policy

Unknown/complex/medical/legal/privacy questions, complaint, requested human,
uncertain authority, unsupported email and repeated misunderstanding recommend
human assistance. No arbitrary answer is generated. The operator must explicitly
take over (or rehearse that response). The unchanged `TakeoverPanel` then uses
the original `StreamingView` / `StreamingHost` and preserves the hybrid call ID
and audit. Hybrid ports stop first. Pairing and interpreter start remain manual.
Preservation of a future telephone media stream is **not proven or claimed**.

## Planned asset manifest

`docs/stage-2.0b-planned-audio-manifest.json` contains 30 unique asset IDs with
wording version/text, NOT_APPROVED production status and audio metadata:
NOT_GENERATED, ElevenLabs, Isabella, eleven_flash_v2_5, version 1, sha256 null.
No recording is borrowed, fetched, generated or played. Production Play remains
blocked. The offline generator imports only registry contracts and scenario
fixtures; it initializes no provider, audio or server session.

## Exact files changed/added in this stage

Modified existing consent files only:

- `src/consent/types.ts`
- `src/consent/definition.ts`
- `src/consent/classifier.ts`
- `src/consent/consentGuard.ts`
- `src/consent/session.ts`
- `src/consent/ConsentWorkspace.tsx`
- `src/consent/consent.css`

Added:

- `src/consent/authority.ts`
- `src/consent/email.ts`
- `tests/consent-stage20b.test.tsx`
- `tests/fixtures/stage20b-scenarios.ts`
- `scripts/stage20b-specification.ts`
- `docs/stage-2.0b.md`
- `docs/stage-2.0b-master-scenario-matrix.md`
- `docs/stage-2.0b-planned-audio-manifest.json`
- `docs/stage-2.0b-validation.txt`
- `docs/stage-2.0b-preservation.json`
- `docs/stage-2.0b-browser-rehearsal.json`
- `docs/stage-2.0b-flow-a.jpg`
- `docs/stage-2.0b-flow-c.jpg`
- `docs/stage-2.0b-flow-e.jpg`
- `docs/stage-2.0b-workspace.jpg`

No existing tests were deleted or modified. The original Stage 2.0A report,
validation and screenshot remain historical artifacts. Its blanket receptionist
restriction and 13-unit registry are superseded by this report and matrix.

## Validation results and preservation

Focused suite: **199 tests passed in 4 files** (141 new tests plus all 58 original
consent tests). Complete suite: **828 tests passed in 69 files**. Lint, standalone
typecheck, build and diff/whitespace checks passed. Build emitted a non-fatal
510.42 kB minified / 152.32 kB gzip chunk-size warning; it was not suppressed.
Future route bundling can be reviewed separately; no unrelated refactor was made.

Browser rehearsal on the built static preview completed all requested flows:

| Flow | Observed result |
|---|---|
| A: HCP → purpose → question → YES → review → email → readback → confirmation → success | END_SUCCESS only after the explicit review and confirmed exact readback |
| B: receptionist without authority attempts YES/email | No consent, no captured email; safely ended END_OTHER |
| C: intermediary claim → still blocked → agent attestation → scoped question → candidate → review → email flow | Claim alone had no consent/email responses; attested branch completed guarded success |
| D: question → okay → clarification → later YES | Stayed UNCLEAR with no decision; only a fresh complete question produced a new candidate |
| E: unsupported medical question → takeover | Existing interpreter opened READY; same call/audit ID; explicit no-telephone-transfer statement; no pairing or start |

DOM observations and screenshots are saved in the listed browser artifacts.
These are offline workflow checks, not physical speech/latency/recognition tests.
No microphone, phone or provider session was initiated by this work.

SHA-256 verification of 105 pre-existing source/server/public files found only
the seven listed consent files changed. The 98 others are byte-identical. No
Stage 1.9.6 file, server/provider file, existing public audio/worklet asset,
translation/voice/config module, takeover component, transcription adapter,
playback block or route file changed. The preservation JSON retains before/after
hashes and prior/current tracked-diff hashes, respecting the pre-existing dirty
working tree. Existing Stage 1.9.6 behavior and known limitations remain intact.

Development issues were resolved rather than hidden: an existing compatibility
test caught moving the first registry entry away from `identify`; the stable
ordering was restored without modifying that test. A new correction test was
adjusted to distinguish an omitted optional readback field from an explicitly
undefined field. The `tsx` CLI hit a sandbox IPC permission error; running the
offline generator with `node --import tsx` succeeded. Final checks all pass.

## Unresolved issues and Stage 2.0B-2 entry conditions

Business/native approval is still needed for all 30 Danish units and English
meanings, especially scope of intermediary authority, both complete consent
questions, aPureBase description, product/event scope, confirmation/opt-out
wording and the eight-day timing anchor. Obtain the original communication
template/methodology for exact wording review; no legal validity is asserted.

Unresolved production matters: target/represented-HCP identity binding; authentic
authority verification policy; consent-system ownership and retention; consent
date/time/clock trust; confirmation-email sender/template/opt-out scheduling;
suppression and bounce integration; actual call media and endpoint timing;
approved asset provenance, cancellation and readback delivery; native-language
coverage beyond the conservative rules; physical verification and seamless
takeover. Draft workflow success is not proof that downstream systems acted.

Recommended exact Stage 2.0B-2 scope: approve and freeze the 30-unit wording/scope
matrix first, define the reviewed intermediary evidence/attestation policy and
downstream handoff schema, then add deterministic **mocked** completion-boundary,
interruption, correction and takeover contracts for the approved planned assets.
Only after separate explicit authorization should a later stage generate verified
Isabella assets or run provider/physical trials. Do not add Twilio, real calls,
production playback or autonomous consent as part of that bounded next step.

Stage 2.0B-1 stops here: no audio generation, OpenAI/ElevenLabs calls, telephone
transport, deployment, commit, push or PR. The system is not production-ready.
