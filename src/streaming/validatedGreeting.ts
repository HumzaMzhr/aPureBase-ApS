import type {UnitRequest,UnitResult} from '../../server/incrementalTranslation';
/** Finite whole-unit bilingual equivalences, not ASR correction or a campaign
 * script. Source must already be semantically committed. No partial match,
 * names, instructions, questions, protected terms or precision-range bypass. */
export function validatedGreeting(input:UnitRequest):UnitResult|undefined{
 if(!input.uncertaintyRouting||input.precision||input.protectedTerms.some(t=>input.text.toLowerCase().includes(t.toLowerCase())))return;
 const text=input.text.trim(),en=/^(?:(hi|hello)[,.!]?\s+)?good (morning|afternoon|evening)([,.!]?)$/i.exec(text),da=/^(?:(hej|goddag)[,.!]?\s+)?(godmorgen|god eftermiddag|god aften)([,.!]?)$/i.exec(text);
 const match=input.language==='en'?en:da;if(!match)return;
 const enParts=['morning','afternoon','evening'],daParts=['godmorgen','god eftermiddag','god aften'];
 const part=match[2].toLowerCase(),index=(input.language==='en'?enParts:daParts).indexOf(part);
 const target=input.language==='en'?daParts[index]:'good '+enParts[index];
 const translation=(match[1]?(input.language==='en'?'Hej, ':'Hi, ')+target:target[0].toUpperCase()+target.slice(1))+match[3];
 return{translation,confidence:1,needs_precision:false,meaning_status:'recoverable',consequential_uncertainty:false,model:'validated-greeting-v1'};
}
