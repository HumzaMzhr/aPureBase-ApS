/** Finite, non-consequential greetings only; never infer a completed introduction,
 * name, permission or other sentence from an unfinished ASR prefix. */
export function completeGreeting(text:string){
 return /^(?:(?:hi|hello)[,.!]?\s+)?good (?:morning|afternoon|evening)[,.!]?$|^(?:(?:hej|goddag)[,.!]?\s+)?(?:godmorgen|god eftermiddag|god aften)[,.!]?$/i.test(text.trim());
}
