import type {UnitResult} from '../../server/incrementalTranslation';
import {precisionTrigger} from './semantic';

/** A request to obtain permission is not an assertion that permission was granted. */
export function consequentialUncertainty(text:string){
 const clean=text.replace(/[’‘]/g,"'");
 if(/\b(?:not|never|[a-z]+n't|cannot|ikke|aldrig|ingen|nej|refuse|refusal|afviser)\b/i.test(clean))return 'Refusal or negation';
 if(/^(?:yes|no|yeah|yep|ja|nej)\s*[.!?]?$/i.test(clean.trim()))return 'Consent answer';
 if(/\b(?:I (?:agree|give|permit|authorize|authorise|consent|approve)|you may|jeg (?:accepterer|giver)|I må|on behalf of the doctor|på vegne af lægen)\b/i.test(clean))return 'Consent or authority';
 if(/\b(?:dose|dosis|dosering|diagnos\w*|treatment|behandling|patient|prescription|bivirkning\w*|side effects|symptom\w*|guarantee|garanter\w*)\b/i.test(clean))return 'Medical detail';
 const risk=precisionTrigger(clean);
 if(risk==='Consent, refusal or authority'&&/\b(?:we (?:would like|want|are calling)|vi (?:vil gerne|ringer|ønsker))\b[\s\S]*\b(?:permission|tilladelse)\b/i.test(clean)&&!/\b(?:granted|given|already|agreed|authorized|authorised|giver|givet|accepterer|samtykke|authorization|fuldmagt)\b/i.test(clean))return '';
 return risk;
}

export function uncertaintyRoute(source:string,result:UnitResult):'continue'|'context'|'precision'{
 const uncertain=result.needs_precision||result.confidence<.9||result.meaning_status==='needs_context'||Boolean(result.guardReason)||result.consequential_uncertainty;
 if(!uncertain)return 'continue';
 // Deterministic meaning guards never become ordinary low-confidence speech.
 if(result.consequential_uncertainty||consequentialUncertainty(source)||/Negation|Added consent|Added email/i.test(result.guardReason??''))return 'precision';
 if(result.meaning_status==='needs_context'||result.guardReason||!result.translation.trim())return 'context';
 return 'continue';
}
