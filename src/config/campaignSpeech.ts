/** Explicit campaign aliases for spoken interpretation, not a general identity/spelling corrector. */
export const knownCampaignNames=['Humza','aPureBase','Example Pharma','Pernille','Isabella'] as const;
const identityPattern=/\b(?:exact (?:name|identity|spelling)|full name|legal name|correct spelling|patient(?:'s|’s)? name|doctor(?:'s|’s)? name|identify the (?:patient|doctor)|name (?:for|on) (?:the )?(?:record|register|form)|spell (?:your|their|the|my|his|her) (?:full )?name|fulde navn|juridiske navn|præcise navn|patientens navn|lægens navn|stav(?:e|es)? (?:dit|mit|hendes|hans|navnet))\b/i;
export function exactIdentityRequired(text:string){return identityPattern.test(text);}
const aliases=[
 {pattern:/(?<![\p{L}\p{N}._%+@-])(?:humza|hamza)(?![\p{L}\p{N}_%+@-]|\.[\p{L}\p{N}])/giu,name:'Humza'},
 {pattern:/(?<![\p{L}\p{N}._%+@-])(?:a\s*|)pure\s*base(?![\p{L}\p{N}_%+@-]|\.[\p{L}\p{N}])/giu,name:'aPureBase'}
];
function oneSpellingEdit(a:string,b:string){
 if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;
 while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}
 return edits+(a.length-i)+(b.length-j)<=1;
}
function knownSpokenToken(token:string){
 const lower=token.toLowerCase();for(const name of [...knownCampaignNames,'PureBase']){
  if(name.includes(' '))continue;if(oneSpellingEdit(lower,name.toLowerCase()))return name==='PureBase'?'aPureBase':name;
 }return token;
}
const contactFieldPattern=/\b(?:e-?mail(?:adresse| address)|phone number|telephone number|telefonnummer|snabel\s*-?\s*a|(?:at|dot|punktum)(?=[\s\S]{0,120}\b(?:dk|com|net|org)\b))\b/i;
export function campaignSpeechText(text:string){
 // Normalize only the ordinary prefix. A later critical field must not undo an
 // already committed introduction, or change an email's spoken/literal spelling.
 const identity=identityPattern.exec(text),contact=contactFieldPattern.exec(text);
 let end=Math.min(identity?.index??text.length,contact?.index??text.length);
 if(contact&&end===contact.index&&/^(?:snabel|at|dot|punktum)/i.test(contact[0])){
  const addressPart=text.slice(0,end).match(/[\p{L}\p{N}._%+@-]+\s*$/u);if(addressPart)end-=addressPart[0].length;
 }
 let prefix=text.slice(0,end);for(const alias of aliases)prefix=prefix.replace(alias.pattern,alias.name);
 prefix=prefix.replace(/(?<![\p{L}\p{N}._%+@-])[\p{L}]{4,}(?![\p{L}\p{N}_%+@-]|\.[\p{L}\p{N}])/gu,knownSpokenToken);
 return prefix+text.slice(end);
}
export const campaignPronunciationGuidance=`Voice-first campaign interpretation: normal spoken Humza/Hamza refer to campaign name Humza; aPureBase/PureBase/a PureBase/a pure base refer to campaign brand aPureBase. Keep these as proper names, using canonical spoken text rather than translating the brand into descriptive words. Preserve their source-language pronunciation; aPureBase is the brand phrase "a Pure Base". Never require precision solely for these known ASR spelling variants. Do not invent unknown names or pronunciation. For explicit exact identity/spelling fields, preserve the literal supplied name and use precision review when uncertain. Preserve emails, phone numbers, dates, consent, negation and questions exactly in meaning.`;
