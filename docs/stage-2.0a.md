# Stage 2.0A design and implementation record

## Inspection before implementation

Stage 1.9.6 has two entry points: `LocalTestView` / `LocalTestSession` for local
evaluation, and `StreamingView` / `StreamingHost` / `ParticipantPeer` for paired
computers. Each owns its audio lifecycle. There is no phone-call transport to
attach to. The legacy `decision.ts` / `/api/plan` uses provider recommendations
and the old phrase bank; it cannot establish deterministic consent. The old
opening asks for an address before obtaining permission, so it must not become
the new consent script implicitly.

Reuse: `ContinuousTranscription` provides the Danish partial/final adapter;
`assertDanishVoice` provides the existing voice identity guard; `StreamingView`
is the takeover interface, retaining `StreamingHost`, recognition, precision,
translation, voice connection, gain and provenance behavior unchanged. The old
phrase text is background wording only; no old asset is relabeled as approved.

## Smallest sequence (recorded before implementation)

1. Add contracts, configurable transition graph and draft response registry.
2. Add a conservative offline classifier and independent deterministic consent
   guard. Unknowns fail closed; there is no model or dictionary correction.
3. Add a session controller, per-turn review/diagnostics and placeholder playback
   port. Playback and consent finalization require separate agent actions.
4. Add an isolated `/consent-call` rehearsal workspace and an explicit Stage
   1.9.6 takeover hook. Do not start audio, recognition or providers on mounting.
5. Add adversarial deterministic tests, then full tests/lint/typecheck/build.

## Boundaries and risks

This foundation is offline rehearsal, not a functioning telephone dialer. Text
can be entered manually or supplied by a future transcription transport adapter.
The UI must identify this source honestly. Optional English meaning is supplied
by the operator/adapter; no automatic translation request occurs. Confidence is
a rule score, not calibrated probability. Unrecognized Danish goes to human
review rather than a guessed answer. Draft wording needs business/native Danish
approval. Every audio asset is a placeholder, so production Play stays disabled.
Explicit simulated delivery is recorded as rehearsal, never acoustic evidence.
Consent review records are local evaluation artifacts, not consent-system writes.

Takeover preserves the hybrid call ID and audit in memory. It stops hybrid ports
before exposing the existing paired interpreter. Since the existing view owns
pairing/streams, seamless live transport transfer is unresolved; pairing and
start remain explicit. It must not claim an existing phone connection survived.

Source audio is not recorded by this feature. Diagnostics contain sensitive
transcript/email text in memory; export is explicit and local, with no telemetry,
browser storage or server upload. Exhausted retention limits fail visibly rather
than silently discarding consent evidence.

## Proposed transition table

All nonterminal states can receive refusal, busy, callback, a supported question,
an unsupported question, or explicit human takeover. Question/busy/receptionist
turns invalidate a pending consent question. Terminal states cannot restart.

| Current state | Evidence/action | Result |
|---|---|---|
| ANSWERED | Identification response delivered | RIGHT_PERSON |
| RIGHT_PERSON | Agent verifies recipient; purpose response delivered | CONSENT_ASK |
| Any active | Receptionist statement | RECEPTIONIST; clear recipient authority |
| Any active | Busy / callback request | BUSY / CALLBACK |
| Any active | Purpose / information / unsubscribe question | PURPOSE_REQUEST / EXPLANATION_REQUEST / QUESTION_KNOWN |
| Any active | Unsupported/complex question | QUESTION_UNKNOWN; offer takeover |
| PURPOSE_REQUEST / EXPLANATION_REQUEST / QUESTION_KNOWN | Explanation delivered | CONSENT_ASK |
| CONSENT_ASK / CONSENT_UNCLEAR | Actual consent question completes | Arm one question for next final answer |
| Armed question | Explicit affirmative, verified recipient, final transcript | CONSENT_YES candidate; agent review still required |
| Unarmed / uncertain / question / receptionist | Affirmative-looking or ambiguous answer | CONSENT_UNCLEAR (never YES) |
| Any active | Explicit refusal | CONSENT_NO; invalidate earlier YES |
| CONSENT_YES | Agent confirms eligible YES | Permit EMAIL_REQUEST |
| CONSENT_NO / CONSENT_UNCLEAR | Agent confirms NO / UNCLEAR | Refusal close / clarification recommendation |
| EMAIL_REQUEST | Literal email in final transcript, reviewed YES exists | EMAIL_GIVEN |
| EMAIL_GIVEN | Confirmation prompt delivered | EMAIL_CONFIRM |
| EMAIL_CONFIRM | Agent attests exact address readback confirmed | Mark email confirmed |
| EMAIL_CONFIRM | Success close completed, reviewed YES + confirmed email | END_SUCCESS |
| CONSENT_NO | Refusal close completed | END_REFUSED |
| BUSY / CALLBACK / RECEPTIONIST | Appropriate close completed | END_OTHER |
| Any active | Skip | Consume recommendation/question; no audio or consent |
| Any active | Repeat | New explicit approval; re-arm only a new consent question |
| Any active | HUMAN TAKEOVER | HUMAN_TAKEOVER; hybrid ports stopped |
| Any active | END CALL | END_OTHER, unless guarded success/refusal close completed |

Agent overrides cannot create YES without the same transcript, recipient and
delivered-question evidence. Selecting another clip is never a consent decision.

## Planned modules

`src/consent`: types, definition/registry, classifier, consent guard, state machine,
session controller/diagnostics, playback port, transcription adapter, takeover
hook/component and operator workspace/style. Add one route in `src/main.tsx`.
Keep server and all `src/streaming` files unchanged. Tests live under `tests`.

## Stage 2.0B entry conditions

Approve Danish wording and consent scope first; generate/version Isabella clips
only after approval, with content hashes and verified provenance through existing
playback safeguards. Integrate the actual call transport/ASR and endpoint ownership,
email readback and audited storage policies. Test cancellation, barge-in, prompt
completion and seamless takeover with mocked transports before any separately
authorized provider/physical trials. No Stage 2.0 production-readiness claim.

## Implemented foundation and operator entry point

Open `/consent-call` on the existing development server, or use the static preview
at `http://127.0.0.1:5175/consent-call` while it is running. The normal `/`,
`/participant` and `/controlled-demo` entry points retain their existing behavior.

The module flow is `Transcript -> IntentClassifier -> ConsentGuard -> configured
transition graph -> response recommendation -> explicit agent action -> local
diagnostics`. A separate playback port is closed for every draft placeholder.
Rehearsal actions contain `audible: false`; they never call the playback port.
No synthetic timings or consent reviews are represented as physical evidence.

There are 13 draft response entries. They contain Danish and English wording,
fixed Isabella/Flash 2.5 identity, version, consent criticality/scope, required
agent approval, placeholder asset, delivery event and next-state metadata.
No asset is generated, fetched, played or borrowed from the old demo phrase bank.
There is no automatic intent API, translation API, TTS or ASR session on this route.

The transcript adapter forwards provider partials and finals unchanged through
the existing `ContinuousTranscription` gateway only when explicitly started by a
future transport owner. It ignores commit acknowledgements as decision evidence,
suppresses duplicate/late finals, stops on abort/error and retains no PCM. The
current workspace uses clearly labeled manual text. Optional English meaning
is operator-supplied; automatic English interpretation is not yet connected.

## Final state table

Events in the common policy can interrupt any active state: explicit refusal,
receptionist, busy/callback, purpose/explanation/known/unknown questions and
operator takeover/end. A classifier result alone never verifies recipient
authority. `END_*` states cannot restart; `HUMAN_TAKEOVER` permits only hybrid end.

| State | Normal action/evidence | Destination / guard |
|---|---|---|
| ANSWERED | Identification delivery | RIGHT_PERSON |
| RIGHT_PERSON | Purpose/explanation delivery | CONSENT_ASK; agent verification is separately required |
| RECEPTIONIST | Receptionist close | END_OTHER; no recipient consent |
| BUSY | Callback question | CALLBACK |
| PURPOSE_REQUEST | Purpose delivery | CONSENT_ASK |
| EXPLANATION_REQUEST | Explanation delivery | CONSENT_ASK |
| CONSENT_ASK | Full scoped question delivery | CONSENT_ASK; arms exactly one final answer |
| CONSENT_YES | Agent reviews eligible YES | EMAIL_REQUEST; candidate YES alone is not finalized |
| CONSENT_NO | Agent reviews NO, refusal close delivered | END_REFUSED |
| CONSENT_UNCLEAR | Clarification/full question delivered | CONSENT_ASK; no inferred consent |
| EMAIL_REQUEST | Email request delivery / literal address offered | EMAIL_REQUEST / EMAIL_GIVEN, with reviewed YES |
| EMAIL_GIVEN | Email confirmation prompt | EMAIL_CONFIRM |
| EMAIL_CONFIRM | Exact address readback attested, success close | END_SUCCESS, only with reviewed YES and confirmed email |
| QUESTION_KNOWN | Approved-scope draft answer | CONSENT_ASK; a fresh consent question must still be delivered |
| QUESTION_UNKNOWN | Human review / explicit takeover | HUMAN_TAKEOVER; no invented answer |
| CALLBACK | Callback close | END_OTHER |
| HUMAN_TAKEOVER | Explicit paired interpreter actions | Existing Stage 1.9.6 path; hybrid input stopped, audit/call ID retained |
| END_SUCCESS | None | Terminal |
| END_REFUSED | None | Terminal |
| END_OTHER | None | Terminal |

The implemented consent guard also requires known answer speech onset at/after
question completion. Unknown onset or speech overlapping question delivery stays
UNCLEAR. The current provider adapter does not invent onset timing; connecting
the call transport and endpoint evidence is a Stage 2.0B prerequisite.

## Consent and email safeguards

- Complete utterance matching accepts a narrow set of explicit Danish
  affirmatives, with ordinary punctuation. It does not rewrite ASR words.
- Partials, silence, thanks, okay, maybe, general interest, unclear requests for
  details, questions and delegated/receptionist statements cannot grant YES.
- The completed question must have the same consent scope. An intervening final
  answer consumes it; an unrelated later YES cannot reuse it.
- Agent review requires a reason and the latest unskipped, unreviewed final turn.
  YES overrides must pass the independent evidence guard. NO/UNCLEAR overrides
  are recorded separately from the original recommendation.
- Recipient changes and subsequent explicit refusals invalidate earlier YES and
  captured email. No consent is written to an external system.
- Email capture accepts only a literal address in an allowed state after reviewed
  YES. Spelled email conversion is deliberately unsupported. Exact readback
  confirmation is a separate agent action; no address is invented or corrected.
- Skipping consumes the pending question and recommendation. Repeat is an
  explicit, state-checked rehearsal action and can re-arm a new question; it does
  not replay source speech.
- Ending the workspace cannot invent success from received/translated/spoken
  counts. Only guarded success/refusal closing delivery produces those outcomes.

## Exact files added or modified for this request

Only `src/main.tsx` was modified among pre-existing source files (one import and
one route). The following files were added:

| File | Responsibility |
|---|---|
| `src/consent/types.ts` | State, transcript, classification, registry, review and diagnostic contracts |
| `src/consent/definition.ts` | Configurable graph and 13 draft Danish/English response entries |
| `src/consent/classifier.ts` | Conservative offline Danish classifier; no model calls or ASR repair |
| `src/consent/consentGuard.ts` | Independent deterministic consent eligibility and review guard |
| `src/consent/stateMachine.ts` | Transition lookup and terminal-state handling |
| `src/consent/playback.ts` | Placeholder playback contract and production playback block |
| `src/consent/session.ts` | Agent actions, email checks, bounded turn/event diagnostics and export |
| `src/consent/transcription.ts` | Existing continuous Danish recognition adapter; no audio storage |
| `src/consent/TakeoverPanel.tsx` | Existing Stage 1.9.6 paired interpreter reuse |
| `src/consent/ConsentWorkspace.tsx` | Three-panel operator rehearsal workspace |
| `src/consent/consent.css` | Scoped desktop/responsive workspace styling |
| `tests/consent-foundation.test.ts` | Graph, adversarial consent, email, override, retention and port tests |
| `tests/consent-transcription.test.ts` | Mocked gateway lifecycle, unchanged text, duplicate and abort tests |
| `tests/consent-view.test.tsx` | UI/escaping/manual-start and zero-provider construction checks |
| `docs/stage-2.0a.md` | Pre-implementation inspection/design and final report (this file) |
| `docs/stage-2.0a-validation.txt` | Verification results and preservation audit |
| `docs/stage-2.0a-workspace.jpg` | Browser-verified workspace screenshot |

SHA-256 comparison of all 94 pre-existing files under `src`, `server` and `public`
found only `src/main.tsx` changed. Existing Stage 1.9.6 streaming files, server
files, public audio/worklet assets and configuration modules are byte-identical
to the start of this request. Earlier uncommitted work was retained.

The unchanged takeover path continues to own its recognition/endpointing,
semantic commitment, translation models, one persistent voice context, Isabella,
Flash 2.5, speed 0.95, calibrated gain, buffers, precision and provenance rules.
No claim is made that previously failing sustained-stream behavior was fixed.

## Verification and remaining work

Focused deterministic tests: **58 passed in 3 files**. Complete existing plus new
suite: **687 passed in 68 files**. Lint, standalone typecheck, production build
(which repeats typecheck), and diff/whitespace checks passed. Automated gateway
tests use local mock transports only. No OpenAI or ElevenLabs requests were made.

Browser checks on the built static preview verified the full recipient -> scoped
question -> pending YES -> explicit agent review -> literal email -> exact readback
-> guarded END_SUCCESS flow. They also verified the takeover view opens READY,
with pairing/start still manual. The final workspace screenshot was visually
checked after isolating its styling from existing global definition-list styles.

Unresolved: business/native Danish wording approval; actual phone/call transport;
speech-onset/endpoint ownership; approved asset generation, hash-bound provenance
and scheduler integration; live transcript/optional English meaning wiring;
native Danish intent coverage and calibration; authenticated consent records and
retention policy; physical playback, interruption and seamless transfer validation.
Rule coverage is intentionally narrow and unknowns require human review.

Stage 2.0B should begin with approval of the 13 response texts and the exact
permission scope. Then add the verified, versioned prerecorded-asset manifest and
playback adapter, followed by mocked call-transport/ASR integration and endpoint
tests. Provider audio generation and physical testing require separate explicit
authorization. No commit, PR, deploy or live/provider test was performed here.
