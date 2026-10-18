import {knownCampaignNames} from '../src/config/campaignSpeech';
/** Context and literal vocabulary hints, never an expected script or correction map. */
export const transcriptionContext={
 contextHintId:'healthcare-contact-v2',
 prompt:'Healthcare contact conversations between a caller and clinic staff. Topics may include professional healthcare information, product updates, professional events, continuing education, professional responsibilities and healthcare organisations. These are topic hints, not an expected script; transcribe what is audible. Names and brands that may occur include aPureBase, Example Pharma, Humza, Pernille and Isabella.',
 keywords:[...knownCampaignNames,'healthcare professionals','professional information','product updates','professional events','healthcare organisations','continuing education','professional communication','disease areas']
};
