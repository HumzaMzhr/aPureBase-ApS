/** C32 experiment decision only; legacy C1/C2/C31 assets remain immutable. */
export const emailArchitecture=Object.freeze({version:'c32-email-architecture-1',normalConfirmation:'CONCISE_ONLY',fullEmailSpeech:false,characterSpelling:false,dynamicEmailTTS:false,repeatBudget:1,maxAttempts:2,fullCallRecording:'NOT_IMPLEMENTED_BUSINESS_DECISION_REQUIRED',productionReady:false});
export const diagnosticEmailResponses=['email-readback-intro','email-correction-prefix','email-correction-confirm'] as const;
export function normalEmailResponse(id:string){return !diagnosticEmailResponses.some(v=>v===id);}
export const normalSuccessSequence=['opening','purpose','consent-question','recipient-owned-YES','operator-consent-review','email-request','clinic-spoken-email','internal-email-resolution','email-confirmation-question','recipient-owned-email-YES','guarded-email-confirmation','success-close'] as const;
