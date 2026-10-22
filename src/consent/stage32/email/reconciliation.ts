import type {EmailSuggestion,ParsedEmail,Resolution} from './types';

export function validateSuggestion(raw:unknown,parsed:ParsedEmail,resolution:Resolution) {
 const fail=(reason:string)=>({raw:structuredClone(raw),accepted:false,reason});
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return fail('Malformed suggestion');
 const keys=['candidate','confidence','reason','evidenceTokenIndices','uncertainTokens'];
 if(Object.keys(raw).length!==keys.length||Object.keys(raw).some(k=>!keys.includes(k)))return fail('Unknown or missing model output fields');
 const s=raw as EmailSuggestion;
 if(typeof s.reason!=='string'||!s.reason.trim()||s.reason.length>1000||!Array.isArray(s.evidenceTokenIndices)||!Array.isArray(s.uncertainTokens))return fail('Missing bounded evidence mapping');
 if(s.candidate!==resolution.selected||!parsed.candidates.includes(s.candidate)||!resolution.databaseCandidates.some(r=>r.email===s.candidate)||s.confidence!==resolution.classification||resolution.action!=='CONFIRM')return fail('Model cannot invent, replace, select ambiguous evidence or promote confidence');
 const expected=parsed.tokens.map((_,i)=>i);
 if(JSON.stringify(s.evidenceTokenIndices)!==JSON.stringify(expected)||JSON.stringify(s.uncertainTokens)!==JSON.stringify(parsed.uncertainTokens))return fail('Incomplete or altered token mapping');
 return {raw:structuredClone(raw),accepted:true,reason:'Advisory agreement only; deterministic classification unchanged'};
}
