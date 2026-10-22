import {digits,letterNames,separators,spellingWords,naturalNumber} from './danishEmailLexicon';
import type {EmailToken,ParsedEmail} from './types';
import {emailVersion} from './types';

export function tokenizeEmail(raw:string,options:{comparisonHypotheses?:boolean}={}):ParsedEmail {
 const result:ParsedEmail={version:emailVersion,raw,tokens:[],candidates:[],operations:[],uncertainTokens:[],errors:[]};
 const fail=(reason:string)=>{result.errors.push(reason);return result;};
 if(raw.length>512 || !raw.trim())return fail('EMPTY_OR_OVERSIZED');
 if(/^\s*(send|skriv|please|email me|write)\b/iu.test(raw))return fail('UNSUPPORTED_PROSE_PREFIX');
 if(/\b(nej|forkert|retter|undskyld|sorry|wrong|instead)\b/iu.test(raw))return fail('CORRECTION_OR_NEGATION_REQUIRES_FRESH_TURN');
 const prefix=/^\s*(?:(?:min\s+(?:e-mailadresse|mailadresse|e-mail|mail)|adressen)\s+er\s+)?/iu.exec(raw)![0];
 if(prefix.trim())result.operations.push({operation:'EXPLICIT_ADDRESS_PREFIX',before:prefix,after:''});
 const words=[...raw.slice(prefix.length).matchAll(/snabel[ -]a|[A-Za-zÆØÅæøå0-9]+|[@._+-]|\S/giu)].map(m=>({raw:m[0],start:prefix.length+m.index!,end:prefix.length+m[0].length+m.index!}));
 if(words.length>128)return fail('TOKEN_LIMIT');
 // A terminal full stop is transcription punctuation only when literal address structure already exists.
 if(words.at(-1)?.raw==='.' && raw.includes('@')){const last=words.pop()!;result.operations.push({operation:'TERMINAL_ASR_PUNCTUATION',before:last.raw,after:''});}
 let i=0;
 while(i<words.length){
  const start=i,w=words[i].raw.toLowerCase();let values:string[];let kind:EmailToken['kind']='literal';
  if(w==='stort'||w==='bogstav'||w==='dobbelt'||w==='tallet'){
   let upper=false,repeat=false,number=false;
   if(words[i]?.raw.toLowerCase()==='stort'){upper=true;i++;}
   if(words[i]?.raw.toLowerCase()==='dobbelt'){repeat=true;i++;}
   if(words[i]?.raw.toLowerCase()==='bogstav')i++;
   else if(words[i]?.raw.toLowerCase()==='tallet'){number=true;i++;}
   const literal=words[i]?.raw.toLowerCase();
   const v=number?(digits[literal]??naturalNumber(literal)):literal&&(literal.length===1&&/^[a-z]$/u.test(literal)?literal:letterNames[literal]??spellingWords[literal]);
   if(!v || upper&&number)return fail('UNSUPPORTED_EXPLICIT_SPELLING');
   values=[(upper?v.toUpperCase():v).repeat(repeat?2:1)];kind=repeat?'repeat':number?'digit':'letter';
  }else if(separators[w]){values=[separators[w]];kind='separator';}
  else if(w==='en'){values=['1','n'];kind='digit';}
  else if(w==='to'){values=['2','to'];kind='digit';}
  else if(digits[w]){values=[digits[w]];kind='digit';}
  else if(options.comparisonHypotheses&&naturalNumber(w)){values=[naturalNumber(w)!,w];kind='digit';}
  else if(options.comparisonHypotheses&&/^[a-zæøå0-9]+$/u.test(w)&&/[æøå]/u.test(w)){values=[w,w.replaceAll('æ','ae').replaceAll('ø','oe').replaceAll('å','aa')];}
  else if(/^[a-z0-9]+$/u.test(w))values=[w];
  else return fail('UNSUPPORTED_TOKEN');
  const token:EmailToken={raw:raw.slice(words[start].start,words[i].end),start:words[start].start,end:words[i].end,kind,alternatives:values};
  if(values.length>1)result.uncertainTokens.push(result.tokens.length);
  if(values.length===1 && token.raw!==values[0])result.operations.push({operation:'EXPLICIT_SPOKEN_TOKEN',before:token.raw,after:values[0],tokenIndex:result.tokens.length});
  result.tokens.push(token);i++;
 }
 return result;
}
