import {normalizeEmail,validEmail} from './normalize';
import {tokenizeEmail} from './tokenizer';
import type {ParsedEmail} from './types';

export function reconstructEmail(raw:string,options:{comparisonHypotheses?:boolean}={}):ParsedEmail {
 // Literal email ASR preserves local-part case, without spoken-token case folding.
 const literal=/^\s*(?:(?:min\s+(?:e-mailadresse|mailadresse|e-mail|mail)|adressen)\s+er\s+)?([A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})(\.)?\s*$/iu.exec(raw);
 if(raw.length<=512&&literal&&validEmail(literal[1])){
  const p=tokenizeEmail(raw),n=normalizeEmail(literal[1]);
  // Token alternatives are literal, not spoken number/letter interpretations in this path.
  const start=raw.indexOf(literal[1]);
  p.tokens=[{raw:literal[1],start,end:start+literal[1].length,kind:'literal',alternatives:[literal[1]]}];
  p.operations=p.operations.filter(o=>o.operation!=='EXPLICIT_SPOKEN_TOKEN');p.operations.push(...n.operations);p.uncertainTokens=[];p.errors=[];p.candidates=[n.value];return p;
 }
 const p=tokenizeEmail(raw,options);if(p.errors.length)return p;
 let combinations=[''];
 for(const token of p.tokens){if(combinations.length*token.alternatives.length>16){p.errors.push('CANDIDATE_LIMIT');return p;}combinations=combinations.flatMap(a=>token.alternatives.map(b=>a+b));}
 for(const candidate of combinations){const n=normalizeEmail(candidate);p.operations.push({operation:'JOIN_EXPLICIT_TOKEN_SEQUENCE',before:p.tokens.map(t=>t.raw).join(' '),after:candidate},...n.operations);if(validEmail(n.value)&&!p.candidates.includes(n.value))p.candidates.push(n.value);}
 if(!p.candidates.length)p.errors.push('NO_LITERAL_ADDRESS_STRUCTURE');
 return p;
}
