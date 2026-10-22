import {reconstructEmail} from '../email/reconstruct';
import type {ParsedEmail} from '../email/types';
export interface EmailEvidence extends ParsedEmail {correctionPrefix?:string;repetitions?:ParsedEmail[];comparisonOnly:boolean}
/** Explicit complete-address corrections/repetitions only. Fragments never rewrite old text. */
export function parseEmailEvidence(raw:string):EmailEvidence {
 const prefix=/^\s*(?:nej[, ]+det er\s+|undskyld[, ]+(?:det er\s+)?|jeg sagde\s+|det er\s+)/iu.exec(raw)?.[0]??'';
 const body=raw.slice(prefix.length),parts=body.split(/\s*(?:;|,?\s+jeg gentager\s+|\s+og igen\s+|\s+igen\s+)\s*/iu);
 if(parts.length===2&&parts.every(Boolean)){
  const parsed=parts.map(p=>parseEmailEvidence(p)),same=parsed.every(p=>p.candidates.length===1&&!p.errors.length)&&parsed[0].candidates[0]===parsed[1].candidates[0];
  return {...parsed[0],raw,repetitions:parsed,errors:same?[]:['CONFLICTING_OR_INCOMPLETE_REPETITIONS'],candidates:same?[...parsed[0].candidates]:[...new Set(parsed.flatMap(p=>p.candidates))],operations:[{operation:same?'IDENTICAL_REPETITIONS':'CONFLICTING_REPETITIONS',before:raw,after:same?parsed[0].candidates[0]:'NO_SELECTION'}],comparisonOnly:!same};
 }
 const suffix=/[.!]$/u.test(body)&&/\b(punktum|dot)\b/iu.test(body)?body.slice(-1):'';
 const p=reconstructEmail(suffix?body.slice(0,-1):body,{comparisonHypotheses:true});
 return {...p,raw,tokens:p.tokens.map(t=>({...t,start:t.start+prefix.length,end:t.end+prefix.length})),operations:[...(prefix?[{operation:'EXPLICIT_COMPLETE_ADDRESS_CORRECTION',before:prefix,after:''}]:[]),...p.operations,...(suffix?[{operation:'ASR_TERMINAL_PUNCTUATION',before:suffix,after:''}]:[])],correctionPrefix:prefix||undefined,comparisonOnly:p.uncertainTokens.length>0};
}
