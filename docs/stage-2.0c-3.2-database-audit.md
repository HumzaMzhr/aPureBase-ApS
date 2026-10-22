# C-3.2 contact source audit

Status: **No real contact integration found. Real database adapter BLOCKED.**

The baseline is `34285a8d6f4f94c6e8036c375b8a3244c316c176`. The initial recursive workspace inventory excluded Git internals, dependencies, build output, virtual environments and credential files. It inspected available database/export/schema/contact/CRM filenames and tabular/document extensions. Its 21 matching paths were synthetic audio/benchmark timing/ASR material, not an HCP contact source. Repository source, fixtures, schemas, APIs and historical C-3/C-3.1 reports were also inspected. The earlier B-2 handoff documentation explicitly leaves downstream CRM/contact integration unimplemented.

There is no supplied production schema, HCP/clinic table, verified recipient identifier, phone→contact mapping, clinic→HCP mapping, target-email export or CRM endpoint that can safely establish current-call identity. Synthetic `contact-data` name fixtures in the existing acceptance catalog do not establish an actual database or a verified mapping. Absence here is a finding about the supplied local materials, not proof that aPureBase has no database elsewhere.

The new `ContactEmailResolver` contract requires `callId`, `recipientRevision`, `contactId`, `mappingEvidenceId` and an independently established source. Its output is capped at three exact-scope records containing `contactId`, `email`, `recordVersion` and `sourceRecordId`. No email-derived identity, phone guessing, fuzzy/global search or whole-database LLM exposure is implemented. Invalid, oversized, cross-contact and unavailable results fail to review.

The only supplied implementation is `FixtureContactEmailResolver`. It accepts `synthetic:` IDs and reserved `.example` addresses. Real values cannot be loaded into that adapter. A real adapter will require a separately supplied schema and independently verified current-call mapping. `VERIFIED_CONTACT_ADAPTER` is an interface option, not a claim that an implementation exists.

Normalization preserves local-part case, plus tags, dots, hyphens and underscores. Domain case folding is explicit and audited. Spoken spelling cues and token joins are recorded independently. A missing separator or unsupported character is never filled in from the database.

Contact records are fetched again after an owned affirmative confirmation. A changed version, source, value or record set invalidates the result; the system does not silently carry forward an earlier record. Resolver deadline is 250 ms by default, aborts on cancellation and does not retry. Advisory model work has a separate bounded deadline and never promotes the deterministic class.

No private contact values were copied into the new tests or reports. Existing historical synthetic fixtures and evidence remain unchanged.
