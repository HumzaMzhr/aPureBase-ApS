import type {ContactEmail,ParsedEmail,Resolution} from './types';

export function classifyEmail(parsed:ParsedEmail,records:ContactEmail[],databaseStatus:Resolution['databaseStatus']='OK'):Resolution {
 const ranked=parsed.candidates.map(candidate=>{const matches=records.filter(r=>r.email===candidate);return {candidate,matches,score:matches.length?1 as const:0 as const,reason:matches.length?'Exact characters; scoped record agrees':'No exact scoped record'};});
 const base={ranked,databaseCandidates:structuredClone(records),databaseStatus,selected:null,selectionSource:null};
 if(parsed.errors.length||!parsed.candidates.length)return{...base,classification:'UNPARSABLE',action:'HUMAN_TAKEOVER',reason:parsed.errors.join(',')};
 if(databaseStatus!=='OK')return{...base,classification:'NO_DATABASE_MATCH',action:'OPERATOR_REVIEW',reason:'Database evidence unavailable; no inferred certainty'};
 const matching=ranked.filter(r=>r.matches.length);
 if(!records.length)return{...base,classification:'NO_DATABASE_MATCH',action:'OPERATOR_REVIEW',reason:'No independently bound contact record'};
 if(!matching.length)return{...base,classification:'CONTRADICTORY_MATCH',action:'OPERATOR_REVIEW',reason:'Spoken characters disagree with stored addresses; speech retained'};
 // Even duplicate source records are unresolved provenance, not a unique authoritative value.
 if(matching.length>1||matching[0].matches.length>1)return{...base,classification:'AMBIGUOUS_MATCH',action:'OPERATOR_REVIEW',reason:'Multiple plausible candidates or records'};
 const uncertain=parsed.uncertainTokens.length>0||parsed.candidates.length>1;
 return {...base,classification:uncertain?'HIGH_CONFIDENCE_MATCH':'EXACT_VERIFIED_MATCH',action:'CONFIRM',selected:matching[0].candidate,selectionSource:uncertain?'BOUNDED_RECONCILIATION':'DETERMINISTIC_EXACT',reason:uncertain?'One bounded record explains explicit token alternatives; recipient must disambiguate':'Literal reconstruction equals independently scoped contact record; recipient confirmation still required'};
}
