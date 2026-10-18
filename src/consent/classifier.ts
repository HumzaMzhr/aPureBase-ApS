import { intents, type Classification, type Transcript } from './types';
import { explicitAuthorityClaim } from './authority';
import { emailCandidate } from './email';

export const normalized = (text: string) => text.toLocaleLowerCase('da').trim().replace(/[.!]+$/u, '').replace(/\s+/gu, ' ');
// Deliberately complete utterance matches: modifiers, questions and extra clauses
// are never stripped to manufacture an affirmative. This is not ASR correction.
export function explicitAffirmative(text: string) {
  return /^(ja|ja,? tak|ja,? det må i gerne|ja,? det må aPureBase gerne|ja,? jeg giver tilladelse)$/iu.test(normalized(text));
}
export function explicitRefusal(text: string) {
  return /^(nej|nej,? tak|nej,? det må i ikke|jeg ønsker ikke (flere )?(e-?mails|information)|send (mig )?ikke (flere )?(e-?mails|information)|jeg trækker min tilladelse tilbage|jeg har ombestemt mig|kontakt mig ikke igen|jeg vil ikke kontaktes igen|jeg ønsker ikke flere henvendelser)$/iu.test(normalized(text));
}
export function literalEmail(text: string): string | undefined {
  return emailCandidate(text)?.normalizedCandidate;
}
export interface IntentClassifier { classify(turn: Transcript): Classification }
export class ConservativeDanishClassifier implements IntentClassifier {
  classify(turn: Transcript): Classification {
    const text = normalized(turn.text);
    let intent: Classification['intent'] = 'UNKNOWN';
    if (!turn.final) return { intent, confidence: 0, basis: 'Partial recognition is not decision evidence.', classifierVersion: 'da-rules-2.0a-1' };
    if (/^(kontakt mig ikke igen|jeg vil ikke kontaktes igen|jeg ønsker ikke flere henvendelser)$/u.test(text)) intent = 'STOP_CONTACT';
    else if (/^(jeg trækker min tilladelse tilbage|jeg har ombestemt mig)$/u.test(text)) intent = 'WITHDRAWAL';
    else if (!text) intent = 'AMBIGUOUS';
    else if (explicitRefusal(text)) intent = 'REFUSAL';
    else if (explicitAuthorityClaim(turn.text)) intent = 'AUTHORITY_CLAIMED';
    else if (/^(jeg har (ikke|ingen) (fuldmagt|bemyndigelse)|jeg må ikke oplyse lægens e-mailadresse)$/u.test(text)) intent = 'AUTHORITY_DENIED';
    else if (/^(jeg ved ikke,? om jeg har (fuldmagt|bemyndigelse)|min bemyndigelse er uklar)$/u.test(text)) intent = 'AUTHORITY_UNCLEAR';
    else if (/^(jeg kan hjælpe med det|jeg håndterer hans e-mail|jeg håndterer lægens e-mail|jeg kan klare det)$/u.test(text)) intent = 'INTERMEDIARY_OFFER';
    else if (/^(du har ringet til den forkerte klinik|det er den forkerte person|forkert nummer)$/u.test(text)) intent = 'WRONG_PERSON';
    else if (/^(lægen er ledig|lægen er her)$/u.test(text)) intent = 'TARGET_AVAILABLE';
    else if (/^(lægen er ikke til stede|lægen er ikke her)$/u.test(text)) intent = 'TARGET_UNAVAILABLE';
    else if (/^(adressen er forkert|e-mailadressen er forkert)$/u.test(text)) intent = 'EMAIL_INCORRECT';
    else if (/^(ja,? adressen er korrekt|e-mailadressen er korrekt)$/u.test(text)) intent = 'EMAIL_CONFIRMED';
    else if (/^(jeg vil ikke oplyse min e-mailadresse)$/u.test(text)) intent = 'EMAIL_REFUSED';
    else if (/^(jeg kan ikke oplyse e-mailadressen|jeg kender ikke e-mailadressen)$/u.test(text)) intent = 'EMAIL_UNAVAILABLE';
    else if (/^(jeg vil klage|det her er en klage)$/u.test(text)) intent = 'COMPLAINT';
    else if (/^(jeg vil tale med et menneske|jeg vil tale med en kollega)$/u.test(text)) intent = 'REQUEST_HUMAN';
    else if (/^(jeg kunne ikke høre dig|jeg forstod ikke spørgsmålet)$/u.test(text)) intent = 'ASR_UNCERTAIN';
    else if (/^(jeg er (i )?receptionen|det er receptionen|jeg er receptionist|jeg kan ikke svare på (lægens|hans|hendes) vegne)$/iu.test(text)) intent = 'RECEPTIONIST';
    else if (/^(jeg vil gerne vide mere,? før jeg beslutter mig)$/u.test(text)) intent = 'MORE_INFORMATION';
    else if (text.includes('?')) intent = /^(hvem ringer|hvad drejer det sig om|hvorfor ringer i)\?$/iu.test(text) ? 'PURPOSE_REQUEST' : /^(hvad er apurebase)\?$/u.test(text) ? 'ABOUT_APUREBASE' : /^(hvilken information|hvad er det for information)\?$/iu.test(text) ? 'EXPLANATION_REQUEST' : /^(er det produktopdateringer og arrangementer)\?$/u.test(text) ? 'PRODUCTS_EVENTS' : /^(hvordan virker bekræftelsesmailen)\?$/u.test(text) ? 'CONFIRMATION_PROCESS' : /^(kan jeg afmelde mig|kan jeg framelde mig)\?$/iu.test(text) ? 'QUESTION_KNOWN' : /(?:dosis|behandling|medicinsk rådgivning)/u.test(text) ? 'MEDICAL_QUESTION' : /(?:privatliv|gdpr|lovligt|persondata)/u.test(text) ? 'LEGAL_PRIVACY_QUESTION' : 'QUESTION_UNKNOWN';
    else if (explicitAffirmative(text)) intent = 'AFFIRMATIVE';
    else if (/^(måske|muligvis|tak|mange tak|okay|ok|send (mig )?(flere oplysninger|mere information)|det ved jeg ikke)$/iu.test(text)) intent = 'AMBIGUOUS';
    else if (literalEmail(turn.text)) intent = 'EMAIL_GIVEN';
    else if (/^(hej|goddag|godmorgen|god morgen)$/iu.test(text)) intent = 'GREETING';
    else if (/^(det er mig|ja det er mig|du taler med den rette person)$/iu.test(text)) intent = 'RIGHT_PERSON';
    else if (/^(jeg har travlt|jeg har ikke tid|det passer dårligt)$/iu.test(text)) intent = 'BUSY';
    else if (/^(ring (venligst )?(igen|senere|i morgen)|kan i ringe senere)$/iu.test(text)) intent = 'CALLBACK';
    return { intent, confidence: intent === 'UNKNOWN' || intent === 'QUESTION_UNKNOWN' ? 0 : 1, basis: intent === 'UNKNOWN' ? 'Unsupported utterance; human review required.' : 'Conservative complete-utterance rule; score is not a probability or authority determination.', classifierVersion: 'da-rules-2.0b1-1' };
  }
}
export function validateClassification(value: Classification): Classification {
  if (!value || !intents.includes(value.intent) || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1 || typeof value.basis !== 'string' || typeof value.classifierVersion !== 'string') throw new Error('Invalid classifier result.');
  return { ...value };
}
