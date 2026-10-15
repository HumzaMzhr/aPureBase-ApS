import type {Language} from '../types';
import {campaignSpeechText,exactIdentityRequired} from '../config/campaignSpeech';
export interface Word {text:string;start:number;end:number}
export const words=(text:string):Word[]=>[...text.matchAll(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu)].map(m=>({text:m[0],start:m.index!,end:m.index!+m[0].length}));
const normalized=(text:string)=>text.toLocaleLowerCase().replace(/[’]/g,"'");
export function commonWords(a:Word[],b:Word[]){let n=0;while(n<Math.min(a.length,b.length)&&normalized(a[n].text)===normalized(b[n].text))n++;return n;}
export function precisionTrigger(text:string){
 text=text.replace(/[’‘]/g,"'");
 if(exactIdentityRequired(text))return 'Exact identity or name spelling';
 if(/@|snabel\s*-?\s*a|\b(?:dot|punktum|hyphen|bindestreg)\b.*\b(?:dk|com|net|org)\b|\be-?mail(?:adresse| address)\s*(?:is|er|:)|\b(?:phone|telephone) number\b|\b(?:reference number|referencenummer)|\btelefonnummer\b/i.test(text))return 'Contact details';
 if(/\d|\b(?:tomorrow|i morgen|klokken|o'clock|monday|tuesday|onsdag|torsdag|fredag|october|oktober|january|januar|after ten|ten thirty|two thirty|twenty.first)\b/i.test(text))return 'Numbers, date or time';
 if(/\b(?:consent|samtykke|authorization|fuldmagt|authori[sz]ed|not interested|ikke interesseret|nej tak|no thank you|permission|tilladelse)\b|\b(?:you may|I agree|I permit|I authorize|I consent|I approve|I refuse|I don't want|I do not want|I cannot|I can't|I need to ask|I must ask)\b|\b(?:I må|jeg accepterer|jeg giver|jeg vil ikke|jeg kan ikke|spørge lægen først)\b|on behalf of the doctor|på vegne af lægen/i.test(text))return 'Consent, refusal or authority';
 if(/\b(?:dose|dosis|dosering|diagnos\w*|treatment|behandling|patient|prescription|bivirkning\w*|side effects|symptom\w*|guarantee|garanter\w*)\b/i.test(text))return 'Medical detail';
 return '';
}
function meaningful(text:string,language:Language,shortGreetings=false){
 const remainder=text.replace(/^(?:hi|hello|hej|goddag)[,.!?]\s+/i,'');if(remainder!==text)return meaningful(remainder,language,shortGreetings);
 const clean=text.trim().replace(/[’‘]/g,"'");const w=words(clean);if(!w.length)return false;
 if(/^(?:can|could|would|will|do|does|did|is|are|have|has|had|may|what|where|when|why|how|kan|vil|skal|må|har|er|var|havde|hvad|hvor|hvornår|hvorfor|hvordan)\b/i.test(clean)&&!/[?]$/.test(clean))return false;
 if(/\b(?:because|if|unless|although|that|which|and|but|or|to|of|with|for|the|a|my|your|don't|doesn't|not|can|will|said|says|because we'd like|fordi|hvis|medmindre|selvom|at|som|og|men|eller|til|af|med|for|ikke|kan|vil|sagde|siger)\s*[,.!?;:]*$/i.test(clean))return false;
 if(/^(?:because|if|unless|although|fordi|hvis|medmindre|selvom)\b/i.test(clean))return /[.!?]$/.test(clean)&&w.length>=7;
 if(/\b(?:said|says|told|check|ask|hear|find out|sagde|siger|fortalte|høre|undersøge)\s*(?:that|at)?\s*[,;:]?$/i.test(clean))return false;
 if(/\b(?:don't|doesn't|didn't|not|never|ikke|aldrig)\b/i.test(clean))return /[.!?]$/.test(clean)&&w.length>=4;
 if(/^(?:(?:hi|hello|hej|goddag)[,.!]?[ ]*)?(?:good morning|good afternoon|good evening|godmorgen|god eftermiddag|god aften)[,.!?]$/i.test(clean))return true;
 if(w.length===1)return shortGreetings&&/^(?:hello|hi|hej|goddag)[,.!?]$/i.test(clean);
 if(language==='en')return /\b(?:am|is|are|was|were|have|has|calling|contacting|would|can|could|need|want|like|speak|help|work|send|include|does|do|will)\b/i.test(clean)||/\bmy name\b/i.test(clean)||(/\?$/.test(clean)&&w.length>=3);
 return /\b(?:er|har|ringer|taler|kontakter|kan|vil|skal|ønsker|hjælpe|sende|omfatter|arbejder|hedder|stiller|mangler|kender)\b/i.test(clean)||(/\?$/.test(clean)&&w.length>=3);
}
export class SemanticCommitter {
 cursor=0;source='';precision='';private previous:Word[]=[];private committed:Word[]=[];private seen=new Map<number,number>();private updated=0;
 constructor(readonly language:Language,private maxWords=100,private minimumStabilityMs=120,private shortGreetings=false,private spanGuard?: (text:string)=>string,private bufferGreetings=false,private isolatePrecision=false){}
 update(text:string,now:number,final=false){
  if(text.length>12000)throw new Error('Source turn exceeded the bounded transcript.');
  const tokens=words(text);this.source=text;const stable=commonWords(this.previous,tokens);this.updated++;
  if(commonWords(this.committed,tokens)<this.cursor){this.precision='ASR revised an already committed span';return{segments:[],precision:this.precision,revision:true};}
  if(!this.spanGuard)this.precision ||= precisionTrigger(text);
  const segments:{start:number;end:number;text:string;precision?:boolean}[]=[];
  if(!this.precision&&!final){
   for(let end=this.cursor+1;end<=tokens.length;end++){
    const next=tokens[end]?.start??text.length;const boundary=text.slice(tokens[end-1].end,next);const piece=text.slice(tokens[this.cursor]?.start??0,next).trim();
    const nextClause=tokens.slice(end,end+3).map(w=>w.text).join(' ');const conjunction=/^(?:(?:and|but|because) (?:I|I'm|we|we're|you|they|the company|one of|a client|our client)|(?:og|men|fordi) (?:jeg|vi|du|I|de|lægen))\b/i.test(nextClause);
    const preceding=text.slice(0,tokens[this.cursor]?.start??0).slice(-350);const listContinuation=/\b(?:include|omfatte|omfatter)\b/i.test(preceding)&&words(piece).length>=4&&/[,.!?]$/.test(piece)&&!precisionTrigger(piece);
    const risk=this.spanGuard?.(piece);
    if(this.bufferGreetings&&this.cursor===0&&/^(?:hi|hello|hej|goddag)[,.!?]$/i.test(piece))continue;
    if(!(/[.!?,;:]/.test(boundary)||conjunction)||!(meaningful(piece,this.language,this.shortGreetings)||listContinuation||risk))continue;
    this.seen.set(end,this.seen.get(end)??now);
    // A boundary alone is insufficient: require a distinct later ASR update, stable prefix and lookahead.
    if(end<=stable&&end<tokens.length&&this.updated>=2&&now-this.seen.get(end)!>=this.minimumStabilityMs){if(risk&&!this.isolatePrecision){this.precision=risk;break;}if(risk&&!/[.!?]$/.test(piece))continue;segments.push({start:this.cursor,end,text:piece,...(this.isolatePrecision?{precision:Boolean(risk)}:{})});this.cursor=end;}
   }
   if(tokens.length-this.cursor>this.maxWords)this.precision='Long clause needs complete-turn precision';
  }
  if(final&&tokens.length>this.cursor){const start=this.cursor;const remaining=text.slice(tokens[start].start).trim();if(!this.isolatePrecision)this.precision ||= this.spanGuard?.(remaining)??'';
   // A finalized tail can contain both ordinary speech and a protected sentence.
   // Keep precision local to its sentence rather than attaching it to that whole tail.
   const parts:{start:number;end:number;text:string;precision:boolean}[]=[];let from=start;
   if(this.isolatePrecision)for(let end=start+1;end<=tokens.length;end++){const next=tokens[end]?.start??text.length;if(end===tokens.length||/[.!?]/.test(text.slice(tokens[end-1].end,next))){const piece=text.slice(tokens[from].start,next).trim();parts.push({start:from,end,text:piece,precision:Boolean(this.precision||this.spanGuard?.(piece))});from=end;}}
   if(parts.some(p=>p.precision)&&parts.some(p=>!p.precision))segments.push(...parts);
   else segments.push({start,end:tokens.length,text:remaining,...(this.isolatePrecision?{precision:Boolean(this.precision||this.spanGuard?.(remaining))}:{})});this.cursor=tokens.length;}
  this.committed=tokens.slice(0,this.cursor);this.previous=tokens;
  return{segments,precision:this.precision,revision:false};
 }
 get received(){return words(this.source).length;}
 get committedText(){const tokens=words(this.source);return this.cursor?this.source.slice(0,tokens[this.cursor]?.start??this.source.length).trim():'';}
 get partialText(){const tokens=words(this.source);return tokens[this.cursor]?this.source.slice(tokens[this.cursor].start):'';}
}

export function uncertainProtectedTerm(text:string,terms:string[]){text=campaignSpeechText(text);const tokens=words(text).map(w=>w.text.toLowerCase());for(const term of terms){const expected=term.toLowerCase();if(expected.length<4||/\s/.test(expected))continue;for(let at=0;at<tokens.length;at++)for(const count of [2,3])if(tokens.slice(at,at+count).length===count&&tokens.slice(at,at+count).join('')===expected)return `ASR uncertain protected name: ${term}`;for(const candidate of tokens){if(candidate===expected||Math.abs(candidate.length-expected.length)>1)continue;const previous=Array.from({length:expected.length+1},(_,i)=>i);for(let i=1;i<=candidate.length;i++){let diagonal=previous[0];previous[0]=i;for(let j=1;j<=expected.length;j++){const old=previous[j];previous[j]=Math.min(previous[j]+1,previous[j-1]+1,diagonal+(candidate[i-1]===expected[j-1]?0:1));diagonal=old;}}if(previous[expected.length]===1)return `ASR uncertain protected name: ${term}`;}}return '';}
