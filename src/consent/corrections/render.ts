import { textHash } from '../wording';
import { renderSlot as oldRender, validateName, type SpeechSlot, type SpeechBinding } from '../dynamic/render';
import { assetVoice } from '../approved/assets';
export const correctionVersion='stage-2.0c31-candidate-1';
export const emailRendererVersion='stage-2.0c31-danish-spelling-words-1';
export const organization={displayOrganization:'aPureBase',spokenOrganization:'a Pure Base',status:'PRONUNCIATION_CANDIDATE_REQUIRES_ASEM_RETEST'} as const;
export const wordingChanges:Record<string,{text:string;english:string;reason:string}>={
 'refusal-close':{text:'Det er helt i orden. Tak for din tid. God dag.',english:'That is perfectly fine. Thank you for your time. Good day.',reason:'Avoids unsupported Danish phoneme correction of hav; preserves polite refusal close.'},
 'stop-contact-close':{text:'Det forstår jeg. Tak for din tid. God dag.',english:'I understand. Thank you for your time. Good day.',reason:'Avoids hav; no change to stop-contact handling.'},
 unsubscribe:{text:'Ja. Du kan altid sige fra, hvis du ikke længere ønsker at modtage informationen.',english:'Yes. You can always opt out if you no longer wish to receive the information.',reason:'Correct Danish alternative avoids framelde without inventing an unsubscribe channel.'},
 explanation:{text:'Det kan blandt andet være faglig information om sygdomsområder, produkter og andre relevante opdateringer.',english:'This can include professional information about disease areas, products and other relevant updates.',reason:'Professional healthcare context retained; no new purpose or consent channel.'},
 'receptionist-target-request':{text:'Jeg ringer vedrørende faglig information til [NAVN]. Kan jeg blive stillet videre?',english:'I am calling regarding professional information for [NAME]. May I be put through?',reason:'Gender-neutral transfer request; no recipient/authority inference.'},
};
// Candidate Danish spelling WORDS, not an asserted official phonetic alphabet.
// Every supported character has one explicit codeword; no language-model repair.
export const danishSpellingMap:Record<string,string>=Object.fromEntries([
 ...'abcdefghijklmnopqrstuvwxyz'.split('').map((c,i)=>[c,['Anna','Børge','Cecilie','Dora','Erik','Frederik','Georg','Hans','Ida','Jens','Knud','Ludvig','Marie','Niels','Oskar','Peter','Quintus','Rasmus','Søren','Theodor','Ulla','Viggo','William','Xenia','Yrsa','Zacharias'][i]]),
 ...'0123456789'.split('').map((c,i)=>[c,'tallet '+['nul','en','to','tre','fire','fem','seks','syv','otte','ni'][i]]),
 ['@','snabel-a'],['.','punktum'],['-','bindestreg'],['_','understregning'],['+','plus'],
]);
for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')danishSpellingMap[c]='stort bogstav '+danishSpellingMap[c.toLowerCase()];
export function emailTokens(candidate:string){
 if(!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/u.test(candidate)||candidate.length>120)throw new Error('Unsupported exact email; HUMAN_TAKEOVER required.');
 return [...candidate].map((character,index)=>({index,character,spoken:danishSpellingMap[character],part:index<candidate.indexOf('@')?'local':character==='@'?'separator':'domain'}));
}
export function renderEmail(candidate:string){const tokens=emailTokens(candidate);return {rawEmail:candidate,normalizedCandidate:candidate,tokenSequence:tokens,renderedSpokenSequence:'Jeg staver adressen med staveord. '+tokens.map(t=>t.spoken+(t.character==='@'?'. Domæne:':'')).join(', ').replace('snabel-a. Domæne:,','snabel-a. Domæne:'),rendererVersion:emailRendererVersion};}
export function spokenText(text:string){return text.replaceAll(organization.displayOrganization,organization.spokenOrganization);}
export async function correctionSlot(slot:SpeechSlot):Promise<SpeechBinding>{
 // Retain original binding/version/bytes for all unaffected NAME templates.
 if(slot.kind==='NAME'&&slot.phraseId!=='receptionist-target-request')return oldRender(slot);
 let renderedValue:string,renderedText:string,extra:Record<string,unknown>={};
 if(slot.kind==='NAME'){renderedValue=validateName(slot.name);renderedText=wordingChanges[slot.phraseId].text.replace('[NAVN]',renderedValue);}
 else {await oldRender(slot);const email=renderEmail(slot.candidate);renderedValue=email.renderedSpokenSequence;renderedText=renderedValue;extra=email;}
 const hash=await textHash(renderedText),rendererVersion=slot.kind==='EMAIL'?emailRendererVersion:correctionVersion;
 return {...extra,slot:structuredClone(slot),renderedValue,renderedText,textHash:hash,phraseVersion:correctionVersion,rendererVersion,cacheKey:await textHash(JSON.stringify({kind:slot.kind,phraseId:slot.phraseId,hash,rendererVersion,voice:assetVoice}))};
}
