export const naturalFlow=Object.freeze({version:'c32h2-natural-flow-1',skipOptionalPurpose:false,skipPurposeProposal:'BUSINESS_GRAPH_DECISION_REQUIRED',mergeConsentQuestion:false,questionBoundary:'ALL_EXACT_OUTPUT_COMPLETED',fillersAdded:[] as string[],paceSeconds:.15 as number,emailRequestsMaximum:2,addressAttemptsMaximum:2,arbitraryEmailTTS:false,conciseConfirmation:'EVALUATION_ONLY_BUSINESS_DECISION_REQUIRED',productionWrites:false,thinkingSeconds:1.2 as number,shortSpeechSeconds:1 as number,emailSpeechSeconds:3.5 as number,authoritySpeechSeconds:4 as number,operatorSeconds:1.5 as number});
export type NaturalFlow=typeof naturalFlow;
export function evaluationFlow(overrides:Partial<NaturalFlow>={}):NaturalFlow{
 const value={...naturalFlow,...overrides};
 if(Object.keys(overrides).some(k=>!Object.hasOwn(naturalFlow,k)))throw new Error('Unknown flow config');
 for(const k of ['paceSeconds','thinkingSeconds','shortSpeechSeconds','emailSpeechSeconds','authoritySpeechSeconds','operatorSeconds'] as const)if(typeof value[k]!=='number'||!Number.isFinite(value[k])||value[k]<0||value[k]>(k==='paceSeconds'?1:10))throw new Error('Invalid bounded timing');
 for(const k of ['version','skipOptionalPurpose','skipPurposeProposal','mergeConsentQuestion','questionBoundary','emailRequestsMaximum','addressAttemptsMaximum','arbitraryEmailTTS','conciseConfirmation','productionWrites'] as const)if(value[k]!==naturalFlow[k])throw new Error('Safety config is invariant');
 if(!Array.isArray(value.fillersAdded)||value.fillersAdded.length)throw new Error('No automatic filler');
 return Object.freeze({...value,fillersAdded:[]});
}
