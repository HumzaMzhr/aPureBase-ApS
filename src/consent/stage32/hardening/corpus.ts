import {syntheticCall} from './simulator';
import {measureOutcome,safetyMetrics} from './outcomes';
import {parseEmailEvidence} from './parser';
import {resolveEvidence,type EvidenceLabel} from './resolution';
import type {ContactEmail,ContactScope,EmailReconciliationPort} from '../email/types';
export interface EmailCase {id:string;raw:string;known:string[];expected:string|null;label:EvidenceLabel;source:'OWNED_FINAL'|'PARTIAL'|'INTERRUPTED'|'STALE';model?:'INVALID'|'WRONG'|'TIMEOUT';db?:'ERROR'|'MALFORMED';note?:string}
const example=(id:string,raw:string,known:string[],expected:string|null,label:EvidenceLabel,extra:Partial<EmailCase>={}):EmailCase=>({id,raw,known,expected,label,source:'OWNED_FINAL',...extra});
// Freeze the complete denominator before running any resolver. No result-based exclusions.
export const emailCorpus:readonly EmailCase[]=Object.freeze([
 example('literal','anna@clinic.example',['anna@clinic.example'],'anna@clinic.example','EXACT'),
 example('spoken','anna snabel-a clinic punktum example',['anna@clinic.example'],'anna@clinic.example','VERY_STRONG'),
 example('kontakt','kontakt snabel-a clinic punktum example',['kontakt@clinic.example'],'kontakt@clinic.example','VERY_STRONG'),
 example('domain-case','Anna@CLINIC.EXAMPLE',['Anna@clinic.example'],'Anna@clinic.example','VERY_STRONG'),
 example('local-case-conflict','Anna@clinic.example',['anna@clinic.example'],null,'CONFLICT'),
 example('terminal-period','anna@clinic.example.',['anna@clinic.example'],'anna@clinic.example','VERY_STRONG'),
 example('spoken-period','anna snabel a clinic punktum example.',['anna@clinic.example'],'anna@clinic.example','VERY_STRONG'),
 example('mixed-symbols','anna dot test at clinic punktum example',['anna.test@clinic.example'],'anna.test@clinic.example','VERY_STRONG'),
 example('hyphen','anna streg test snabel-a clinic punktum example',['anna-test@clinic.example'],'anna-test@clinic.example','VERY_STRONG'),
 example('underscore','anna understreg test snabel-a clinic punktum example',['anna_test@clinic.example'],'anna_test@clinic.example','VERY_STRONG'),
 example('plus','anna plus test snabel-a clinic punktum example',['anna+test@clinic.example'],'anna+test@clinic.example','VERY_STRONG'),
 example('digits','a tallet en tallet to tallet tre snabel-a clinic punktum example',['a123@clinic.example'],'a123@clinic.example','VERY_STRONG'),
 example('natural-number-explicit','a tallet enogtyve snabel-a clinic punktum example',['a21@clinic.example'],'a21@clinic.example','VERY_STRONG'),
 example('natural-number-uncertain','a tolv snabel-a clinic punktum example',['a12@clinic.example'],'a12@clinic.example','STRONG'),
 example('letter','bogstav Anna bogstav Børge snabel-a clinic punktum example',['ab@clinic.example'],'ab@clinic.example','VERY_STRONG'),
 example('uppercase-cue','stort bogstav a nna snabel-a clinic punktum example',['Anna@clinic.example'],'Anna@clinic.example','VERY_STRONG'),
 example('repeated-character','a dobbelt n a snabel-a clinic punktum example',['anna@clinic.example'],'anna@clinic.example','VERY_STRONG'),
 example('same-twice','anna@clinic.example; anna@clinic.example',['anna@clinic.example'],'anna@clinic.example','VERY_STRONG'),
 example('different-twice','anna@clinic.example; anne@clinic.example',['anna@clinic.example','anne@clinic.example'],null,'AMBIGUOUS'),
 example('new-correction','Nej, det er anne snabel-a clinic punktum example',['anne@clinic.example'],'anne@clinic.example','VERY_STRONG'),
 example('sorry-correction','Undskyld, det er anne@clinic.example',['anne@clinic.example'],'anne@clinic.example','VERY_STRONG'),
 example('i-said-correction','Jeg sagde anne@clinic.example',['anne@clinic.example'],'anne@clinic.example','VERY_STRONG'),
 example('fragment-correction','Det er punktum com, ikke punktum dk',['anna@clinic.example'],null,'INSUFFICIENT'),
 example('midword-correction','anna nej anne snabel-a clinic punktum example',['anna@clinic.example'],null,'INSUFFICIENT'),
 example('no-match','anna@clinic.example',[],null,'INSUFFICIENT'),
 example('wrong-local','anne@clinic.example',['anna@clinic.example'],null,'CONFLICT'),
 example('wrong-domain','anna@other.example',['anna@clinic.example'],null,'CONFLICT'),
 example('ambiguous-en','en snabel-a clinic punktum example',['1@clinic.example','n@clinic.example'],null,'AMBIGUOUS'),
 example('unique-en','en snabel-a clinic punktum example',['n@clinic.example'],'n@clinic.example','STRONG'),
 example('danish-ae','lægehuset snabel-a clinic punktum example',['laegehuset@clinic.example'],'laegehuset@clinic.example','STRONG'),
 example('danish-oe','øjen snabel-a clinic punktum example',['oejen@clinic.example'],'oejen@clinic.example','STRONG'),
 example('danish-aa','åse snabel-a clinic punktum example',['aase@clinic.example'],'aase@clinic.example','STRONG'),
 example('missing-at','anna clinic punktum example',['anna@clinic.example'],null,'INSUFFICIENT'),
 example('two-at','anna@@clinic.example',['anna@clinic.example'],null,'INSUFFICIENT'),
 example('missing-dot','anna snabel-a clinic example',['anna@clinic.example'],null,'INSUFFICIENT'),
 example('incomplete-domain','info snabel-a clinic',['info@clinic.example','info@clinic.other.example'],null,'AMBIGUOUS'),
 example('unclear-local','uklart snabel-a clinic punktum example',['a@clinic.example','b@clinic.example'],null,'AMBIGUOUS'),
 example('bad-domain','anna@-clinic.example',['anna@clinic.example'],null,'INSUFFICIENT'),
 example('bad-local','a..b@clinic.example',['ab@clinic.example'],null,'INSUFFICIENT'),
 example('noise','[støj] umm',['anna@clinic.example'],null,'INSUFFICIENT'),
 example('stored-shortcut','den e-mail I allerede har',['anna@clinic.example'],null,'INSUFFICIENT',{note:'BUSINESS_DECISION_REQUIRED; no stored-address shortcut authorized'}),
 example('partial','anna@clinic.example',['anna@clinic.example'],'anna@clinic.example','EXACT',{source:'PARTIAL'}),
 example('interrupted','anna@clinic.example',['anna@clinic.example'],'anna@clinic.example','EXACT',{source:'INTERRUPTED'}),
 example('stale','anna@clinic.example',['anna@clinic.example'],'anna@clinic.example','EXACT',{source:'STALE'}),
 example('hallucinated-at-unowned','anna@clinic.example',['anna@clinic.example'],'anna@clinic.example','EXACT',{source:'STALE',note:'Text alone cannot prove an ASR symbol was acoustically spoken. Unowned evidence is blocked.'}),
 example('db-offline','anna@clinic.example',['anna@clinic.example'],null,'INSUFFICIENT',{db:'ERROR'}),
 example('db-malformed','anna@clinic.example',['anna@clinic.example'],null,'INSUFFICIENT',{db:'MALFORMED'}),
 example('model-invalid','anna@clinic.example',['anna@clinic.example'],'anna@clinic.example','EXACT',{model:'INVALID'}),
 example('model-wrong','anna@clinic.example',['anna@clinic.example'],'anna@clinic.example','EXACT',{model:'WRONG'}),
 example('model-timeout','anna@clinic.example',['anna@clinic.example'],'anna@clinic.example','EXACT',{model:'TIMEOUT'}),
 example('long-local','a'.repeat(60)+'@long-clinic.department.example',['a'.repeat(60)+'@long-clinic.department.example'],'a'.repeat(60)+'@long-clinic.department.example','EXACT'),
 example('too-long-local','a'.repeat(65)+'@clinic.example',['anna@clinic.example'],null,'INSUFFICIENT'),
 example('hyphen-domain','anna snabel-a long bindestreg clinic punktum example',['anna@long-clinic.example'],'anna@long-clinic.example','VERY_STRONG'),
 example('multiple-dots','a.b.c@sub.clinic.example',['a.b.c@sub.clinic.example'],'a.b.c@sub.clinic.example','EXACT'),
 example('digit-heavy','a1234567890@c123.example',['a1234567890@c123.example'],'a1234567890@c123.example','EXACT'),
 example('whitespace','anna @ clinic . example',['anna@clinic.example'],'anna@clinic.example','VERY_STRONG'),
 // Exact user-supplied synthetic examples; these are never fetched from actual contact systems.
 example('example-A','info snabel-a klinik punktum dk',['info@klinik.dk'],'info@klinik.dk','VERY_STRONG'),
 example('example-B','kontakt snabel-a klinik punktum dk',['kontakt@klinik.dk'],'kontakt@klinik.dk','VERY_STRONG'),
 example('example-C','info snabel-a klinik',['info@klinik.dk','info@klinik.com'],null,'AMBIGUOUS'),
 example('example-D','anna punktum jensen snabel-a hospital punktum dk',['anna.jensen@hospital.dk'],'anna.jensen@hospital.dk','VERY_STRONG'),
 example('example-E','lægehuset snabel-a domain punktum dk',['laegehuset@domain.dk'],'laegehuset@domain.dk','STRONG'),
 example('example-F','kontakt snabel-a clinic punktum dk',['info@clinic.dk'],null,'CONFLICT'),
 example('example-G','info snabel a clinic punktum de',['info@clinic.dk'],null,'CONFLICT'),
 example('example-H','uklart snabel-a clinic punktum dk',['info@clinic.dk','kontakt@clinic.dk'],null,'AMBIGUOUS'),
 example('example-I','Undskyld, det er info snabel-a klinik punktum dk',['info@klinik.dk'],'info@klinik.dk','VERY_STRONG'),
 example('example-J','info snabel-a klinik punktum dk',[],null,'INSUFFICIENT'),
]);
export const corpusContract={version:'c32h1-corpus-1',denominator:emailCorpus.length,ids:emailCorpus.map(c=>c.id),policyFrozenBeforeEvaluation:true,exclusions:[],takeoverDefinition:'Final policy after at most one recipient retry; this corpus reports first-attempt takeover separately',autoAcceptanceDefinition:'No automatic storing; eligibility for owned confirmation is separate'} as const;
export async function runEmailCase(c:EmailCase){
 const scope:ContactScope={callId:'synthetic:corpus',recipientRevision:1,contactId:'synthetic:contact',mappingEvidenceId:'synthetic:mapped',source:'SYNTHETIC_FIXTURE'};
 const rows:ContactEmail[]=c.known.map((email,i)=>({contactId:scope.contactId,email,recordVersion:'1',sourceRecordId:'synthetic:row:'+i}));
 const parsed=parseEmailEvidence(c.raw);
 const model:EmailReconciliationPort|undefined=c.model?{suggest:async()=>c.model==='TIMEOUT'?new Promise(()=>{}):c.model==='INVALID'?'not JSON':{candidate:'invented@other.example',confidence:'EXACT_VERIFIED_MATCH',reason:'malicious',evidenceTokenIndices:[],uncertainTokens:[]}}:undefined;
 const r=await resolveEvidence(parsed,scope,{resolveCandidates:async()=>{if(c.db==='ERROR')throw new Error('Mock offline');return c.db==='MALFORMED'?[{...rows[0],contactId:'wrong'}]:rows;}},model,undefined,5);
 const f=await syntheticCall('corpus-'+c.id,{resolveCandidates:async input=>{if(c.db==='ERROR')throw new Error('Mock offline');return c.db==='MALFORMED'?[{contactId:input.contactId,email:c.known[0],recordVersion:{bad:1},sourceRecordId:'synthetic:bad'}] as never:c.known.map((email,i)=>({contactId:input.contactId,email,recordVersion:'1',sourceRecordId:'synthetic:'+i}));}}, {},model);
 await f.identity();await f.session.approvePlayback('purpose');await f.question();await f.yes();await f.ask();
 if(c.source==='INTERRUPTED'){await f.speak(c.raw,{final:false,id:'mic:interrupted'});await f.ask();await f.speak(c.raw,{id:'mic:interrupted'});}
 else await f.speak(c.raw,{final:c.source!=='PARTIAL',...(c.source==='STALE'?{owner:'stale-owner'}:{})});
 const outcome=measureOutcome(f.session.structuredEmail.snapshot(),f.session.snapshot());
 const eligible=outcome.ownership.owned&&f.session.structuredEmail.snapshot().state==='CONFIRM_REQUIRED'&&['EXACT','VERY_STRONG'].includes(r.policyLabel);
 return {case:c,parsed,result:r,outcome,sessionEvidence:f.export(),eligibleForConfirmation:eligible,finalStoredAddress:outcome.finalStoredAddress,autoAccepted:outcome.autoAccepted,humanReview:r.action==='OPERATOR_REVIEW',takeover:r.action==='HUMAN_TAKEOVER',correct:r.policyLabel===c.label&&r.selected===c.expected&&(!eligible||c.source==='OWNED_FINAL')};
}
export async function runEmailCorpus(){const rows=[];for(const c of emailCorpus)rows.push(await runEmailCase(c));return {kind:'AUTOMATIC_SYNTHETIC_EVIDENCE_NOT_ASR_ACCURACY',contract:corpusContract,rows,metrics:{cases:rows.length,policyCorrect:rows.filter(r=>r.correct).length,expectedAddressCases:rows.filter(r=>r.case.expected!==null).length,addressCorrect:rows.filter(r=>r.case.expected!==null&&r.result.selected===r.case.expected).length,ambiguousCases:rows.filter(r=>r.case.label==='AMBIGUOUS').length,ambiguousBlocked:rows.filter(r=>r.case.label==='AMBIGUOUS'&&r.result.selected===null&&!r.eligibleForConfirmation).length,...safetyMetrics(rows.map(r=>({outcome:r.outcome,ambiguous:r.case.label==='AMBIGUOUS',expected:r.case.expected}))),firstAttemptTakeovers:rows.filter(r=>r.takeover).length,operatorReview:rows.filter(r=>r.humanReview).length,failedCases:rows.filter(r=>!r.correct).map(r=>r.case.id)}};}
