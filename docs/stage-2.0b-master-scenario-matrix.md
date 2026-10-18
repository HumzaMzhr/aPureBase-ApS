# Stage 2.0B-1 master scenario matrix

Generated from `src/consent/definition.ts` and `tests/fixtures/stage20b-scenarios.ts` by `node --import tsx scripts/stage20b-specification.ts`.

**30 atomic response units; 43 deterministic scenario examples; no approved wording or generated audio.**

The count follows the scenarios, not a target number: 13 existing response IDs were inspected and retained, combined wording was split, and separate complete direct-HCP/intermediary questions preserve the addressee without fragment concatenation. Multiple scenarios reuse a single atomic unit.

## Wording provenance and approval

`SOURCE_SUPPORTED` means exact wording supported by a supplied source. No approved Danish sentence source was supplied for this stage, so zero units use this status. The user-supplied methodology summary supports process rules, not these newly authored Danish sentences.

`DRAFT_NATIVE_REVIEW_REQUIRED` marks proposed Danish phrasing. `BUSINESS_APPROVAL_REQUIRED` highlights wording whose business scope/process meaning particularly needs approval. **Every unit requires BOTH native Danish and business review**, irrespective of its primary wording-status label. Every production approval is `NOT_APPROVED`.

No wording here determines legal authority or promises completed downstream email/suppression/bounce actions. In particular, the authority scope and single-opt-in/eight-day wording require business confirmation against the original methodology/template.

## Response matrix

| Phrase ID | Category | Scenario | English meaning | Danish wording | Wording status |
|---|---|---|---|---|---|
| identify | OPENING | Identify the caller | I am calling on behalf of aPureBase. | Jeg ringer på vegne af aPureBase. | DRAFT_NATIVE_REVIEW_REQUIRED |
| greeting | OPENING | Call answered | Hello. Good day. | Hej. Goddag. | DRAFT_NATIVE_REVIEW_REQUIRED |
| ask-target | OPENING | Ask for the intended HCP | May I speak with the healthcare professional concerned? | Må jeg tale med den relevante sundhedsperson? | DRAFT_NATIVE_REVIEW_REQUIRED |
| purpose | PURPOSE | Explain the short purpose | We are calling to ask whether we may send professional information by email. | Vi ringer for at spørge, om vi må sende faglig information via e-mail. | DRAFT_NATIVE_REVIEW_REQUIRED |
| about-apurebase | PURPOSE | What is aPureBase? | aPureBase contacts healthcare professionals about professional information. | aPureBase kontakter sundhedspersoner om faglig information. | BUSINESS_APPROVAL_REQUIRED |
| explanation | INFORMATION | Professional and medical information | The information may include professional and medical material. | Informationen kan omfatte fagligt og medicinsk materiale. | DRAFT_NATIVE_REVIEW_REQUIRED |
| products-events | INFORMATION | Products, updates and professional events | It may also include product updates and invitations to professional activities. | Det kan også omfatte produktopdateringer og invitationer til faglige aktiviteter. | BUSINESS_APPROVAL_REQUIRED |
| transfer-request | INTERMEDIARY | Target available / transfer requested | Would you transfer me to the healthcare professional? | Vil du stille mig om til sundhedspersonen? | DRAFT_NATIVE_REVIEW_REQUIRED |
| target-unavailable | INTERMEDIARY | Target unavailable | When would it suit the healthcare professional for us to call again? | Hvornår vil det passe sundhedspersonen, at vi ringer igen? | DRAFT_NATIVE_REVIEW_REQUIRED |
| authority-ask | AUTHORITY | Intermediary offers to handle the request | Do you have the required authority to handle this request and provide the healthcare professional’s email address? | Har du den nødvendige bemyndigelse til at håndtere denne forespørgsel og oplyse sundhedspersonens e-mailadresse? | BUSINESS_APPROVAL_REQUIRED |
| authority-claimed | AUTHORITY | Explicit authority claim awaits operator verification | Thank you. Your authority must be confirmed before we continue. | Tak. Din bemyndigelse skal bekræftes, før vi fortsætter. | BUSINESS_APPROVAL_REQUIRED |
| authority-denied | AUTHORITY | No authority | Then I would like to speak with the healthcare professional directly. | Så vil jeg gerne tale med sundhedspersonen selv. | DRAFT_NATIVE_REVIEW_REQUIRED |
| authority-unclear | AUTHORITY | Authority remains unclear | A colleague will need to help clarify this. | En kollega skal hjælpe med at afklare dette. | DRAFT_NATIVE_REVIEW_REQUIRED |
| wrong-person-close | CLOSING | Wrong clinic or person | Thank you for clarifying. We will end the conversation. | Tak for afklaringen. Vi afslutter samtalen. | DRAFT_NATIVE_REVIEW_REQUIRED |
| consent-question | CONSENT | Direct HCP scoped consent question | May aPureBase send you professional information by email? | Må aPureBase sende dig faglig information via e-mail? | BUSINESS_APPROVAL_REQUIRED |
| intermediary-consent-question | CONSENT | Authorized intermediary scoped consent question | May aPureBase send professional information by email to the healthcare professional you are authorized to represent? | Må aPureBase sende faglig information via e-mail til den sundhedsperson, du er bemyndiget til at svare for? | BUSINESS_APPROVAL_REQUIRED |
| clarify | CLARIFICATION | Ambiguous answer / ASR uncertainty | Sorry, would you repeat your answer? | Undskyld, vil du gentage dit svar? | DRAFT_NATIVE_REVIEW_REQUIRED |
| email-request | EMAIL | Request email after reviewed YES | Which email address may we use? | Hvilken e-mailadresse må vi bruge? | DRAFT_NATIVE_REVIEW_REQUIRED |
| email-confirm | EMAIL | Prompt exact human readback | Will you confirm the email address that I read back? | Vil du bekræfte den e-mailadresse, jeg læser op? | DRAFT_NATIVE_REVIEW_REQUIRED |
| email-correction | EMAIL | Incorrect address; request correction | Would you provide the correct email address? | Vil du oplyse den korrekte e-mailadresse? | DRAFT_NATIVE_REVIEW_REQUIRED |
| email-unavailable | EMAIL | Refuses or cannot provide email | That is fine. We will end without registering an email address. | Det er i orden. Vi afslutter uden at registrere en e-mailadresse. | DRAFT_NATIVE_REVIEW_REQUIRED |
| callback | CALLBACK | Busy now / agree a callback | When would it suit you for us to call again? | Hvornår vil det passe dig, at vi ringer igen? | DRAFT_NATIVE_REVIEW_REQUIRED |
| callback-close | CLOSING | Callback close | Thank you for your time. We will call again another time. | Tak for din tid. Vi ringer igen en anden gang. | DRAFT_NATIVE_REVIEW_REQUIRED |
| unsubscribe | INFORMATION | Future opt-out question | The confirmation email explains how to decline future information. | Bekræftelsesmailen forklarer, hvordan du kan frabede dig fremtidig information. | BUSINESS_APPROVAL_REQUIRED |
| confirmation-process | INFORMATION | Downstream single-opt-in / eight-day mechanism | The confirmation email describes the opportunity to decline information within eight days. | Bekræftelsesmailen beskriver muligheden for at frabede sig information inden for otte dage. | BUSINESS_APPROVAL_REQUIRED |
| refusal-close | CLOSING | Explicit refusal or withdrawal | We respect that. Thank you for your time. Have a good day. | Det respekterer vi. Tak for din tid. Hav en god dag. | DRAFT_NATIVE_REVIEW_REQUIRED |
| success-close | CLOSING | Reviewed consent and confirmed address | Thank you for your time and your permission. Have a good day. | Tak for din tid og din tilladelse. Hav en god dag. | DRAFT_NATIVE_REVIEW_REQUIRED |
| human-takeover | EXCEPTION | Unknown, medical, privacy, complaint or requested human | I will ask a colleague to help with your question. | Jeg vil bede en kollega hjælpe med dit spørgsmål. | DRAFT_NATIVE_REVIEW_REQUIRED |
| stop-contact-close | CLOSING | Asks to stop contact | I understand that you do not want further contact. We will end the conversation. | Jeg har forstået, at du ikke ønsker mere kontakt. Vi afslutter samtalen. | BUSINESS_APPROVAL_REQUIRED |
| receptionist-close | CLOSING | Unverified intermediary cannot continue | Thank you for your help. We will contact the relevant person another time. | Tak for hjælpen. Vi kontakter den relevante person en anden gang. | DRAFT_NATIVE_REVIEW_REQUIRED |

## Guard, transition and asset metadata per unit

All delivery transitions below describe explicit **offline rehearsal completion**. No physical playback-completion boundary has been measured. Future consent playback must complete the exact standalone text/version, record a unique question instance and known completion time, and bind that instance to the current recipient/authority revision. No other response can arm consent.

### identify

| Field | Specification |
|---|---|
| Phrase ID / category | identify / OPENING |
| Scenario / intent | Identify the caller / PROMPT; GREETING |
| English meaning | I am calling on behalf of aPureBase. |
| Danish wording | Jeg ringer på vegne af aPureBase. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | ANSWERED |
| Delivery event / destination | identified / ANSWERED |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | IDENTIFY_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | identify |

### greeting

| Field | Specification |
|---|---|
| Phrase ID / category | greeting / OPENING |
| Scenario / intent | Call answered / PROMPT; GREETING |
| English meaning | Hello. Good day. |
| Danish wording | Hej. Goddag. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | ANSWERED |
| Delivery event / destination | greeted / ANSWERED |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | GREETING_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### ask-target

| Field | Specification |
|---|---|
| Phrase ID / category | ask-target / OPENING |
| Scenario / intent | Ask for the intended HCP / PROMPT; GREETING |
| English meaning | May I speak with the healthcare professional concerned? |
| Danish wording | Må jeg tale med den relevante sundhedsperson? |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | ANSWERED, RIGHT_PERSON, RECEPTIONIST |
| Delivery event / destination | target_asked / RIGHT_PERSON |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | ASK_TARGET_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### purpose

| Field | Specification |
|---|---|
| Phrase ID / category | purpose / PURPOSE |
| Scenario / intent | Explain the short purpose / PROMPT; RIGHT_PERSON, PURPOSE_REQUEST |
| English meaning | We are calling to ask whether we may send professional information by email. |
| Danish wording | Vi ringer for at spørge, om vi må sende faglig information via e-mail. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | RIGHT_PERSON, PURPOSE_REQUEST, EXPLANATION_REQUEST, QUESTION_KNOWN |
| Delivery event / destination | explained / CONSENT_ASK |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | PURPOSE_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | purpose |

### about-apurebase

| Field | Specification |
|---|---|
| Phrase ID / category | about-apurebase / PURPOSE |
| Scenario / intent | What is aPureBase? / PROMPT; ABOUT_APUREBASE |
| English meaning | aPureBase contacts healthcare professionals about professional information. |
| Danish wording | aPureBase kontakter sundhedspersoner om faglig information. |
| Wording status | BUSINESS_APPROVAL_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | PURPOSE_REQUEST, QUESTION_KNOWN |
| Delivery event / destination | explained / CONSENT_ASK |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | ABOUT_APUREBASE_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### explanation

| Field | Specification |
|---|---|
| Phrase ID / category | explanation / INFORMATION |
| Scenario / intent | Professional and medical information / PROMPT; EXPLANATION_REQUEST, MORE_INFORMATION |
| English meaning | The information may include professional and medical material. |
| Danish wording | Informationen kan omfatte fagligt og medicinsk materiale. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | RIGHT_PERSON, PURPOSE_REQUEST, EXPLANATION_REQUEST, QUESTION_KNOWN |
| Delivery event / destination | explained / CONSENT_ASK |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | EXPLANATION_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | explanation |

### products-events

| Field | Specification |
|---|---|
| Phrase ID / category | products-events / INFORMATION |
| Scenario / intent | Products, updates and professional events / PROMPT; PRODUCTS_EVENTS |
| English meaning | It may also include product updates and invitations to professional activities. |
| Danish wording | Det kan også omfatte produktopdateringer og invitationer til faglige aktiviteter. |
| Wording status | BUSINESS_APPROVAL_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | EXPLANATION_REQUEST, QUESTION_KNOWN |
| Delivery event / destination | explained / CONSENT_ASK |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | PRODUCTS_EVENTS_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### transfer-request

| Field | Specification |
|---|---|
| Phrase ID / category | transfer-request / INTERMEDIARY |
| Scenario / intent | Target available / transfer requested / PROMPT; TARGET_AVAILABLE |
| English meaning | Would you transfer me to the healthcare professional? |
| Danish wording | Vil du stille mig om til sundhedspersonen? |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | RECEPTIONIST, RIGHT_PERSON, AUTHORITY_CHECK |
| Delivery event / destination | transfer_requested / RIGHT_PERSON |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | TRANSFER_REQUEST_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### target-unavailable

| Field | Specification |
|---|---|
| Phrase ID / category | target-unavailable / INTERMEDIARY |
| Scenario / intent | Target unavailable / PROMPT; TARGET_UNAVAILABLE |
| English meaning | When would it suit the healthcare professional for us to call again? |
| Danish wording | Hvornår vil det passe sundhedspersonen, at vi ringer igen? |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | RECEPTIONIST, CALLBACK |
| Delivery event / destination | callback_asked / CALLBACK |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | TARGET_UNAVAILABLE_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### authority-ask

| Field | Specification |
|---|---|
| Phrase ID / category | authority-ask / AUTHORITY |
| Scenario / intent | Intermediary offers to handle the request / PROMPT; RECEPTIONIST, INTERMEDIARY_OFFER |
| English meaning | Do you have the required authority to handle this request and provide the healthcare professional’s email address? |
| Danish wording | Har du den nødvendige bemyndigelse til at håndtere denne forespørgsel og oplyse sundhedspersonens e-mailadresse? |
| Wording status | BUSINESS_APPROVAL_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | RECEPTIONIST, AUTHORITY_CHECK |
| Delivery event / destination | authority_asked / AUTHORITY_CHECK |
| Consent-critical / authority-critical | NO / YES |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | AUTHORITY_ASK_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### authority-claimed

| Field | Specification |
|---|---|
| Phrase ID / category | authority-claimed / AUTHORITY |
| Scenario / intent | Explicit authority claim awaits operator verification / PROMPT; AUTHORITY_CLAIMED |
| English meaning | Thank you. Your authority must be confirmed before we continue. |
| Danish wording | Tak. Din bemyndigelse skal bekræftes, før vi fortsætter. |
| Wording status | BUSINESS_APPROVAL_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | AUTHORITY_CHECK |
| Delivery event / destination | authority_pending / AUTHORITY_CHECK |
| Consent-critical / authority-critical | NO / YES |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | AUTHORITY_CLAIMED_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### authority-denied

| Field | Specification |
|---|---|
| Phrase ID / category | authority-denied / AUTHORITY |
| Scenario / intent | No authority / PROMPT; AUTHORITY_DENIED |
| English meaning | Then I would like to speak with the healthcare professional directly. |
| Danish wording | Så vil jeg gerne tale med sundhedspersonen selv. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | AUTHORITY_CHECK |
| Delivery event / destination | authority_declined / RECEPTIONIST |
| Consent-critical / authority-critical | NO / YES |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | AUTHORITY_DENIED_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### authority-unclear

| Field | Specification |
|---|---|
| Phrase ID / category | authority-unclear / AUTHORITY |
| Scenario / intent | Authority remains unclear / PROMPT; AUTHORITY_UNCLEAR |
| English meaning | A colleague will need to help clarify this. |
| Danish wording | En kollega skal hjælpe med at afklare dette. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | AUTHORITY_CHECK |
| Delivery event / destination | takeover / HUMAN_TAKEOVER |
| Consent-critical / authority-critical | NO / YES |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | AUTHORITY_UNCLEAR_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### wrong-person-close

| Field | Specification |
|---|---|
| Phrase ID / category | wrong-person-close / CLOSING |
| Scenario / intent | Wrong clinic or person / PROMPT; WRONG_PERSON |
| English meaning | Thank you for clarifying. We will end the conversation. |
| Danish wording | Tak for afklaringen. Vi afslutter samtalen. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | WRONG_PERSON |
| Delivery event / destination | other_closed / END_OTHER |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / YES |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | WRONG_PERSON_CLOSE_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### consent-question

| Field | Specification |
|---|---|
| Phrase ID / category | consent-question / CONSENT |
| Scenario / intent | Direct HCP scoped consent question / PROMPT; AFFIRMATIVE, AMBIGUOUS |
| English meaning | May aPureBase send you professional information by email? |
| Danish wording | Må aPureBase sende dig faglig information via e-mail? |
| Wording status | BUSINESS_APPROVAL_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | CONSENT_ASK, CONSENT_UNCLEAR |
| Delivery event / destination | consent_question / CONSENT_ASK |
| Consent-critical / authority-critical | YES / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | YES / NO / NO |
| Eligible recipient types | TARGET_HCP |
| Consent scope | apurebase-professional-information-by-email-v1 |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | CONSENT_QUESTION_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | consent-question |

### intermediary-consent-question

| Field | Specification |
|---|---|
| Phrase ID / category | intermediary-consent-question / CONSENT |
| Scenario / intent | Authorized intermediary scoped consent question / PROMPT; AFFIRMATIVE |
| English meaning | May aPureBase send professional information by email to the healthcare professional you are authorized to represent? |
| Danish wording | Må aPureBase sende faglig information via e-mail til den sundhedsperson, du er bemyndiget til at svare for? |
| Wording status | BUSINESS_APPROVAL_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | CONSENT_ASK, CONSENT_UNCLEAR |
| Delivery event / destination | consent_question / CONSENT_ASK |
| Consent-critical / authority-critical | YES / YES |
| Requires agent approval | YES |
| Can arm consent / request email / close call | YES / NO / NO |
| Eligible recipient types | INTERMEDIARY |
| Consent scope | apurebase-professional-information-by-email-v1 |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | INTERMEDIARY_CONSENT_QUESTION_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### clarify

| Field | Specification |
|---|---|
| Phrase ID / category | clarify / CLARIFICATION |
| Scenario / intent | Ambiguous answer / ASR uncertainty / PROMPT; AMBIGUOUS, ASR_UNCERTAIN |
| English meaning | Sorry, would you repeat your answer? |
| Danish wording | Undskyld, vil du gentage dit svar? |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | CONSENT_ASK, CONSENT_UNCLEAR |
| Delivery event / destination | clarified / CONSENT_ASK |
| Consent-critical / authority-critical | YES / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | CLARIFY_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | clarify |

### email-request

| Field | Specification |
|---|---|
| Phrase ID / category | email-request / EMAIL |
| Scenario / intent | Request email after reviewed YES / PROMPT; AFFIRMATIVE, EMAIL_GIVEN |
| English meaning | Which email address may we use? |
| Danish wording | Hvilken e-mailadresse må vi bruge? |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | EMAIL_REQUEST |
| Delivery event / destination | email_requested / EMAIL_REQUEST |
| Consent-critical / authority-critical | YES / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / YES / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | EMAIL_REQUEST_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | email-request |

### email-confirm

| Field | Specification |
|---|---|
| Phrase ID / category | email-confirm / EMAIL |
| Scenario / intent | Prompt exact human readback / PROMPT; EMAIL_GIVEN, EMAIL_CONFIRMED |
| English meaning | Will you confirm the email address that I read back? |
| Danish wording | Vil du bekræfte den e-mailadresse, jeg læser op? |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | EMAIL_GIVEN |
| Delivery event / destination | email_confirmation / EMAIL_CONFIRM |
| Consent-critical / authority-critical | YES / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | EMAIL_CONFIRM_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | email-confirm |

### email-correction

| Field | Specification |
|---|---|
| Phrase ID / category | email-correction / EMAIL |
| Scenario / intent | Incorrect address; request correction / PROMPT; EMAIL_INCORRECT, EMAIL_GIVEN |
| English meaning | Would you provide the correct email address? |
| Danish wording | Vil du oplyse den korrekte e-mailadresse? |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | EMAIL_GIVEN, EMAIL_CONFIRM, EMAIL_REQUEST |
| Delivery event / destination | email_correction / EMAIL_REQUEST |
| Consent-critical / authority-critical | YES / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / YES / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | EMAIL_CORRECTION_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### email-unavailable

| Field | Specification |
|---|---|
| Phrase ID / category | email-unavailable / EMAIL |
| Scenario / intent | Refuses or cannot provide email / PROMPT; EMAIL_REFUSED, EMAIL_UNAVAILABLE |
| English meaning | That is fine. We will end without registering an email address. |
| Danish wording | Det er i orden. Vi afslutter uden at registrere en e-mailadresse. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | EMAIL_REQUEST |
| Delivery event / destination | other_closed / END_OTHER |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / YES |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | EMAIL_UNAVAILABLE_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### callback

| Field | Specification |
|---|---|
| Phrase ID / category | callback / CALLBACK |
| Scenario / intent | Busy now / agree a callback / PROMPT; BUSY, CALLBACK |
| English meaning | When would it suit you for us to call again? |
| Danish wording | Hvornår vil det passe dig, at vi ringer igen? |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | BUSY, CALLBACK |
| Delivery event / destination | callback_asked / CALLBACK |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | CALLBACK_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | callback |

### callback-close

| Field | Specification |
|---|---|
| Phrase ID / category | callback-close / CLOSING |
| Scenario / intent | Callback close / PROMPT; TARGET_UNAVAILABLE, CALLBACK |
| English meaning | Thank you for your time. We will call again another time. |
| Danish wording | Tak for din tid. Vi ringer igen en anden gang. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | CALLBACK |
| Delivery event / destination | other_closed / END_OTHER |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / YES |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | CALLBACK_CLOSE_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | callback-close |

### unsubscribe

| Field | Specification |
|---|---|
| Phrase ID / category | unsubscribe / INFORMATION |
| Scenario / intent | Future opt-out question / PROMPT; QUESTION_KNOWN |
| English meaning | The confirmation email explains how to decline future information. |
| Danish wording | Bekræftelsesmailen forklarer, hvordan du kan frabede dig fremtidig information. |
| Wording status | BUSINESS_APPROVAL_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | QUESTION_KNOWN |
| Delivery event / destination | explained / CONSENT_ASK |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | UNSUBSCRIBE_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | unsubscribe |

### confirmation-process

| Field | Specification |
|---|---|
| Phrase ID / category | confirmation-process / INFORMATION |
| Scenario / intent | Downstream single-opt-in / eight-day mechanism / PROMPT; CONFIRMATION_PROCESS |
| English meaning | The confirmation email describes the opportunity to decline information within eight days. |
| Danish wording | Bekræftelsesmailen beskriver muligheden for at frabede sig information inden for otte dage. |
| Wording status | BUSINESS_APPROVAL_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | QUESTION_KNOWN |
| Delivery event / destination | explained / CONSENT_ASK |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | CONFIRMATION_PROCESS_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### refusal-close

| Field | Specification |
|---|---|
| Phrase ID / category | refusal-close / CLOSING |
| Scenario / intent | Explicit refusal or withdrawal / PROMPT; REFUSAL, WITHDRAWAL |
| English meaning | We respect that. Thank you for your time. Have a good day. |
| Danish wording | Det respekterer vi. Tak for din tid. Hav en god dag. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | CONSENT_NO |
| Delivery event / destination | refusal_closed / END_REFUSED |
| Consent-critical / authority-critical | YES / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / YES |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | REFUSAL_CLOSE_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | refusal-close |

### success-close

| Field | Specification |
|---|---|
| Phrase ID / category | success-close / CLOSING |
| Scenario / intent | Reviewed consent and confirmed address / PROMPT; EMAIL_CONFIRMED |
| English meaning | Thank you for your time and your permission. Have a good day. |
| Danish wording | Tak for din tid og din tilladelse. Hav en god dag. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | EMAIL_CONFIRM |
| Delivery event / destination | success_closed / END_SUCCESS |
| Consent-critical / authority-critical | YES / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / YES |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | SUCCESS_CLOSE_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | success-close |

### human-takeover

| Field | Specification |
|---|---|
| Phrase ID / category | human-takeover / EXCEPTION |
| Scenario / intent | Unknown, medical, privacy, complaint or requested human / PROMPT; AUTHORITY_UNCLEAR, QUESTION_UNKNOWN, MEDICAL_QUESTION, LEGAL_PRIVACY_QUESTION, COMPLAINT, REQUEST_HUMAN, ASR_UNCERTAIN, UNKNOWN |
| English meaning | I will ask a colleague to help with your question. |
| Danish wording | Jeg vil bede en kollega hjælpe med dit spørgsmål. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | QUESTION_UNKNOWN, AUTHORITY_CHECK, CONSENT_UNCLEAR |
| Delivery event / destination | takeover / HUMAN_TAKEOVER |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / NO |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | HUMAN_TAKEOVER_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### stop-contact-close

| Field | Specification |
|---|---|
| Phrase ID / category | stop-contact-close / CLOSING |
| Scenario / intent | Asks to stop contact / PROMPT; STOP_CONTACT |
| English meaning | I understand that you do not want further contact. We will end the conversation. |
| Danish wording | Jeg har forstået, at du ikke ønsker mere kontakt. Vi afslutter samtalen. |
| Wording status | BUSINESS_APPROVAL_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | CONSENT_NO |
| Delivery event / destination | stop_closed / END_REFUSED |
| Consent-critical / authority-critical | YES / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / YES |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | STOP_CONTACT_CLOSE_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | New atomic unit |

### receptionist-close

| Field | Specification |
|---|---|
| Phrase ID / category | receptionist-close / CLOSING |
| Scenario / intent | Unverified intermediary cannot continue / PROMPT; RECEPTIONIST, AUTHORITY_DENIED |
| English meaning | Thank you for your help. We will contact the relevant person another time. |
| Danish wording | Tak for hjælpen. Vi kontakter den relevante person en anden gang. |
| Wording status | DRAFT_NATIVE_REVIEW_REQUIRED |
| Required wording reviews | NATIVE_DANISH, BUSINESS |
| Allowed source states | RECEPTIONIST, AUTHORITY_CHECK |
| Delivery event / destination | other_closed / END_OTHER |
| Consent-critical / authority-critical | NO / NO |
| Requires agent approval | YES |
| Can arm consent / request email / close call | NO / NO / YES |
| Eligible recipient types | Context guards still apply; no authority or consent is established by phrase selection. |
| Consent scope | Does not arm a question |
| Fallback behavior | Do not invent an answer; recommend HUMAN_TAKEOVER if evidence or approved wording is insufficient. |
| Planned audio asset ID | RECEPTIONIST_CLOSE_V1 |
| Audio status / hash | NOT_GENERATED / null |
| Provider / voice / model | ElevenLabs / Isabella / eleven_flash_v2_5 |
| Wording version / audio version | 2.0b1-draft-1 / 1 |
| Production approval | NOT_APPROVED |
| Stage 2.0A migration link | receptionist-close |

## Master scenario coverage and offline classification examples

These are test examples, not a transcript to be forced into recognition. Recognition is never corrected to fit them. Context-free AFFIRMATIVE, EMAIL_GIVEN or AUTHORITY_CLAIMED classification never establishes consent, an address or verified authority by itself.

| Scenario | Final Danish example | Intent | Response unit(s) | Required guarded handling |
|---|---|---|---|---|
| greeting | Hej. | GREETING | greeting, identify, ask-target | Atomic opening; no consent or identity verification. |
| right-person | Det er mig. | RIGHT_PERSON | purpose | Operator must verify the target HCP separately. |
| receptionist | Det er receptionen. | RECEPTIONIST | authority-ask, receptionist-close | INTERMEDIARY / UNVERIFIED; never infer authority. |
| target-available | Lægen er ledig. | TARGET_AVAILABLE | transfer-request | Request transfer; verify the new respondent. |
| target-unavailable | Lægen er ikke til stede. | TARGET_UNAVAILABLE | target-unavailable, callback-close | Callback path; no email capture. |
| intermediary-offer | Jeg kan hjælpe med det. | INTERMEDIARY_OFFER | authority-ask | Offer alone is not an authority claim. |
| secretary-handles-email | Jeg håndterer hans e-mail. | INTERMEDIARY_OFFER | authority-ask | Handling email is not verified authority. |
| authority-claim | Jeg har fuldmagt til at oplyse lægens e-mailadresse. | AUTHORITY_CLAIMED | authority-claimed | CLAIMED only; operator confirmation and scope check required. |
| authority-scope-claim | Jeg har bemyndigelse til at håndtere denne forespørgsel og oplyse lægens e-mailadresse. | AUTHORITY_CLAIMED | authority-claimed | Retain exact final evidence; no legal determination. |
| authority-denied | Jeg har ikke fuldmagt. | AUTHORITY_DENIED | authority-denied, receptionist-close | DENIED; invalidate dependent evidence. |
| authority-unclear | Jeg ved ikke om jeg har fuldmagt. | AUTHORITY_UNCLEAR | authority-unclear, human-takeover | Fail closed; recommend human assistance. |
| wrong-clinic | Du har ringet til den forkerte klinik. | WRONG_PERSON | wrong-person-close | Invalidate identity/authority/consent/email; no email path. |
| wrong-person | Det er den forkerte person. | WRONG_PERSON | wrong-person-close | No consent or email from this branch. |
| about | Hvad er aPureBase? | ABOUT_APUREBASE | about-apurebase | Only the business-reviewed atomic description may be used later. |
| why-call | Hvorfor ringer I? | PURPOSE_REQUEST | purpose | Short purpose; consent question still separately required. |
| what-information | Hvilken information? | EXPLANATION_REQUEST | explanation | Professional/medical information description, no medical advice. |
| products-events | Er det produktopdateringer og arrangementer? | PRODUCTS_EVENTS | products-events | Business approval of scope required before audio. |
| direct-yes | Ja, det må I gerne. | AFFIRMATIVE | consent-question, email-request | Candidate only after a completed relevant question, eligible HCP and onset check; then explicit agent review. |
| intermediary-yes | Ja tak. | AFFIRMATIVE | intermediary-consent-question, email-request | Requires AGENT_CONFIRMED authority and retained evidence in the current recipient revision. |
| explicit-no | Nej tak. | REFUSAL | refusal-close | Invalidate YES/email, record review, refuse close. |
| ambiguous-okay | Okay. | AMBIGUOUS | clarify, consent-question | UNCLEAR; clarification does not arm consent. Deliver a fresh complete question. |
| ambiguous-maybe | Måske. | AMBIGUOUS | clarify | UNCLEAR, never infer acceptance. |
| more-information | Jeg vil gerne vide mere før jeg beslutter mig. | MORE_INFORMATION | explanation | Answer only supported scope, then fresh consent question. |
| changed-mind | Jeg har ombestemt mig. | WITHDRAWAL | refusal-close | Invalidate prior YES and email immediately. |
| withdrawal | Jeg trækker min tilladelse tilbage. | WITHDRAWAL | refusal-close | Withdrawal at any active point invalidates dependent evidence. |
| literal-email | anna@example.dk | EMAIL_GIVEN | email-request, email-confirm | Capture only downstream of reviewed eligible YES; address alone is not consent. |
| email-confirmation | Ja, adressen er korrekt. | EMAIL_CONFIRMED | email-confirm, success-close | Not consent; exact readback and operator confirmation still required. |
| email-incorrect | Adressen er forkert. | EMAIL_INCORRECT | email-correction | Clear old candidate/readback/confirmation; await a new final address. |
| corrected-email | anna.corrected@example.dk | EMAIL_GIVEN | email-correction, email-confirm | New source turn and correction lineage; fresh readback and confirmation required. |
| email-refused | Jeg vil ikke oplyse min e-mailadresse. | EMAIL_REFUSED | email-unavailable | No success; close without an address or operator takeover. |
| email-unavailable | Jeg kan ikke oplyse e-mailadressen. | EMAIL_UNAVAILABLE | email-unavailable | Never infer a missing address/domain. |
| busy | Jeg har travlt. | BUSY | callback | Invalidate pending question; offer callback. |
| callback | Ring senere. | CALLBACK | callback, callback-close | No success outcome; schedule details stay operator-reviewed. |
| known-optout | Kan jeg afmelde mig? | QUESTION_KNOWN | unsubscribe | Draft source-scope answer; no consent inferred from a question. |
| confirmation-process | Hvordan virker bekræftelsesmailen? | CONFIRMATION_PROCESS | confirmation-process | Single-opt-in/eight-day process requires business wording approval; no email is sent here. |
| unknown-question | Hvad koster det præcist? | QUESTION_UNKNOWN | human-takeover | Recommend HUMAN_TAKEOVER, never generate an answer. |
| medical-question | Kan du give medicinsk rådgivning? | MEDICAL_QUESTION | human-takeover | Recommend HUMAN_TAKEOVER. |
| privacy-question | Hvordan behandler I mine persondata? | LEGAL_PRIVACY_QUESTION | human-takeover | No invented legal/privacy wording. |
| complaint | Jeg vil klage. | COMPLAINT | human-takeover | Recommend HUMAN_TAKEOVER. |
| stop-contact | Kontakt mig ikke igen. | STOP_CONTACT | stop-contact-close | Invalidate consent/email; retain local stop request. No downstream suppression is claimed. |
| human-request | Jeg vil tale med et menneske. | REQUEST_HUMAN | human-takeover | Recommend the unchanged Stage 1.9.6 interface. |
| asr-uncertain | Jeg kunne ikke høre dig. | ASR_UNCERTAIN | clarify, human-takeover | Clarify once; repeated misunderstanding recommends takeover. |
| unexpected | Den grønne stol danser. | UNKNOWN | human-takeover | Fail closed; no sentence repair. |

## Interruption behavior for every state

BLOCKED means a defined rejected hybrid action. Terminal states never restart. During HUMAN_TAKEOVER the existing interpreter owns input; the hybrid accepts only its end action. All other active states use the same conservative interruption policy. Runtime identity, consent and email guards apply in addition to graph transitions.

| State | REFUSAL | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | takeover | end |
|---|---|---|---|---|---|---|---|
| ANSWERED | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| RIGHT_PERSON | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| RECEPTIONIST | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| BUSY | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| PURPOSE_REQUEST | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| EXPLANATION_REQUEST | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| CONSENT_ASK | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| CONSENT_YES | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| CONSENT_NO | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| CONSENT_UNCLEAR | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| EMAIL_REQUEST | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| EMAIL_GIVEN | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| EMAIL_CONFIRM | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| QUESTION_KNOWN | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| QUESTION_UNKNOWN | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| CALLBACK | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| HUMAN_TAKEOVER | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | END_OTHER |
| END_SUCCESS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| END_REFUSED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| END_OTHER | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| AUTHORITY_CHECK | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |
| WRONG_PERSON | CONSENT_NO | BUSY | CALLBACK | QUESTION_KNOWN | QUESTION_UNKNOWN | HUMAN_TAKEOVER | END_OTHER |

## Complete configured event table

| State | Event → destination (before evidence guards) |
|---|---|
| ANSWERED | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; identified → ANSWERED; greeted → ANSWERED; target_asked → RIGHT_PERSON |
| RIGHT_PERSON | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; target_asked → RIGHT_PERSON; explained → CONSENT_ASK; transfer_requested → RIGHT_PERSON |
| RECEPTIONIST | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; target_asked → RIGHT_PERSON; transfer_requested → RIGHT_PERSON; callback_asked → CALLBACK; authority_asked → AUTHORITY_CHECK; other_closed → END_OTHER |
| BUSY | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; callback_asked → CALLBACK |
| PURPOSE_REQUEST | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; explained → CONSENT_ASK |
| EXPLANATION_REQUEST | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; explained → CONSENT_ASK |
| CONSENT_ASK | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; consent_question → CONSENT_ASK; clarified → CONSENT_ASK; candidate_yes → CONSENT_YES |
| CONSENT_YES | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; reviewed_yes → EMAIL_REQUEST |
| CONSENT_NO | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; refusal_closed → END_REFUSED; stop_closed → END_REFUSED |
| CONSENT_UNCLEAR | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; consent_question → CONSENT_ASK; clarified → CONSENT_ASK; candidate_yes → CONSENT_YES |
| EMAIL_REQUEST | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → EMAIL_GIVEN; EMAIL_INCORRECT → EMAIL_REQUEST; EMAIL_CONFIRMED → EMAIL_REQUEST; EMAIL_REFUSED → EMAIL_REQUEST; EMAIL_UNAVAILABLE → EMAIL_REQUEST; takeover → HUMAN_TAKEOVER; end → END_OTHER; email_requested → EMAIL_REQUEST; email_correction → EMAIL_REQUEST; other_closed → END_OTHER |
| EMAIL_GIVEN | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → EMAIL_GIVEN; EMAIL_INCORRECT → EMAIL_REQUEST; EMAIL_CONFIRMED → EMAIL_GIVEN; EMAIL_REFUSED → EMAIL_REQUEST; EMAIL_UNAVAILABLE → EMAIL_REQUEST; takeover → HUMAN_TAKEOVER; end → END_OTHER; email_confirmation → EMAIL_CONFIRM; email_correction → EMAIL_REQUEST |
| EMAIL_CONFIRM | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → EMAIL_GIVEN; EMAIL_INCORRECT → EMAIL_REQUEST; EMAIL_CONFIRMED → EMAIL_CONFIRM; EMAIL_REFUSED → EMAIL_REQUEST; EMAIL_UNAVAILABLE → EMAIL_REQUEST; takeover → HUMAN_TAKEOVER; end → END_OTHER; email_correction → EMAIL_REQUEST; success_closed → END_SUCCESS |
| QUESTION_KNOWN | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; explained → CONSENT_ASK |
| QUESTION_UNKNOWN | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER |
| CALLBACK | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; callback_asked → CALLBACK; other_closed → END_OTHER |
| HUMAN_TAKEOVER | end → END_OTHER |
| END_SUCCESS | All events blocked; terminal |
| END_REFUSED | All events blocked; terminal |
| END_OTHER | All events blocked; terminal |
| AUTHORITY_CHECK | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; transfer_requested → RIGHT_PERSON; authority_asked → AUTHORITY_CHECK; authority_pending → AUTHORITY_CHECK; authority_declined → RECEPTIONIST; other_closed → END_OTHER; authority_confirmed → RIGHT_PERSON |
| WRONG_PERSON | GREETING → ANSWERED; RIGHT_PERSON → RIGHT_PERSON; RECEPTIONIST → RECEPTIONIST; TARGET_AVAILABLE → RECEPTIONIST; TARGET_UNAVAILABLE → CALLBACK; INTERMEDIARY_OFFER → AUTHORITY_CHECK; AUTHORITY_CLAIMED → AUTHORITY_CHECK; AUTHORITY_DENIED → AUTHORITY_CHECK; AUTHORITY_UNCLEAR → AUTHORITY_CHECK; WRONG_PERSON → WRONG_PERSON; BUSY → BUSY; CALLBACK → CALLBACK; PURPOSE_REQUEST → PURPOSE_REQUEST; ABOUT_APUREBASE → PURPOSE_REQUEST; EXPLANATION_REQUEST → EXPLANATION_REQUEST; PRODUCTS_EVENTS → EXPLANATION_REQUEST; MORE_INFORMATION → EXPLANATION_REQUEST; REFUSAL → CONSENT_NO; WITHDRAWAL → CONSENT_NO; STOP_CONTACT → CONSENT_NO; AMBIGUOUS → CONSENT_UNCLEAR; AFFIRMATIVE → CONSENT_UNCLEAR; ASR_UNCERTAIN → CONSENT_UNCLEAR; QUESTION_KNOWN → QUESTION_KNOWN; CONFIRMATION_PROCESS → QUESTION_KNOWN; QUESTION_UNKNOWN → QUESTION_UNKNOWN; UNKNOWN → QUESTION_UNKNOWN; MEDICAL_QUESTION → QUESTION_UNKNOWN; LEGAL_PRIVACY_QUESTION → QUESTION_UNKNOWN; COMPLAINT → QUESTION_UNKNOWN; REQUEST_HUMAN → QUESTION_UNKNOWN; EMAIL_GIVEN → CONSENT_UNCLEAR; EMAIL_INCORRECT → QUESTION_UNKNOWN; EMAIL_CONFIRMED → CONSENT_UNCLEAR; EMAIL_REFUSED → QUESTION_UNKNOWN; EMAIL_UNAVAILABLE → QUESTION_UNKNOWN; takeover → HUMAN_TAKEOVER; end → END_OTHER; other_closed → END_OTHER |

## Downstream handoff specification (not implemented)

After reviewed eligible consent and confirmed email, a future integration must record acceptance, raw email/evidence lineage and consent date/time, generate the approved confirmation email with the documented single-opt-in/eight-day opt-out mechanism, and perform downstream bounce monitoring/reporting. Exact timing anchor, sender, scope, suppression handling, system of record and authenticated audit retention are unresolved. No confirmation email is generated or sent by this stage.
