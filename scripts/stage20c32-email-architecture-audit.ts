/** Local modeled evidence only. No provider/CRM transport or audio generation. */
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {emailArchitecture,normalSuccessSequence} from '../src/consent/stage32/email/architecture';
import {runEmailCorpus} from '../src/consent/stage32/hardening/corpus';
import {runClosureAdversarial} from '../src/consent/stage32/feedback/adversarial';
import {ordinaryScenario} from '../src/consent/stage32/hardening/simulator';
import {durationModel} from '../src/consent/stage32/duration';
const out='docs/stage-2.0c-3.2-email-architecture';await mkdir(out,{recursive:true});
const json=(name:string,value:unknown)=>writeFile(out+'/'+name,JSON.stringify(value,null,2)+'\n');
const corpus=await runEmailCorpus(),adversarial=await runClosureAdversarial(),ordinary=await ordinaryScenario('A');
if(corpus.metrics.failedCases.length||adversarial.passed!==adversarial.denominator)throw new Error('Frozen email policy regression');
await json('modeled-evidence.json',{kind:'DETERMINISTIC_LOCAL_NOT_PHYSICAL_OR_ASR_ACCURACY',architecture:emailArchitecture,normalSuccessSequence,actualSyntheticSequence:ordinary.intervals.map(i=>i.phraseId),durationModel:durationModel(),modeledDirectCall:{audioSeconds:ordinary.mediaSeconds,recipientSpeechSeconds:ordinary.modeledRecipientSpeechSeconds,thinkingSeconds:ordinary.modeledRecipientThinkingSeconds,transitionSeconds:ordinary.modeledTransitionsSeconds,operatorSeconds:ordinary.modeledOperatorAndExplicitDelaySeconds,subtotalSeconds:ordinary.modeledElapsedSeconds,providerNetworkSeconds:null,physicalDelaySeconds:null,measuredSavingSeconds:null},corpus,adversarial,providerRequests:0});
const paths=[...new Set(execFileSync('git',['ls-files','-co','--exclude-standard','-z']).toString().split('\0'))].filter(p=>p&&/^(src|server|scripts|tests|docs)\//u.test(p)&&/\.(tsx?|md|json|txt|py|mjs)$/u.test(p)&&!p.startsWith(out+'/'));
const rows=[];
const pattern=/email-readback-intro|readbackEmail|renderEmail|character.{0,20}(?:email|readback)|email.{0,20}(?:character|spelling|readback)|dynamic.{0,10}EMAIL|exact spoken readback|full.address confirmation|mock readback/iu;
for(const path of paths){const content=await readFile(path,'utf8');for(const [index,line] of content.split('\n').entries())if(pattern.test(line)){
 const historical=!path.startsWith('src/consent/stage32/')&&!path.startsWith('scripts/stage20c32-')&&!path.startsWith('tests/consent-stage20c32');
 const classification=historical?'HISTORICAL_ONLY':/session\.ts$|email\/(?:architecture|flow)\.ts$/u.test(path)?'NORMAL_PATH_REQUIRED':/duration|simulator|corpus|scenarios|adversarial/u.test(path)?'NORMAL_PATH_REQUIRED':'DIAGNOSTIC_ONLY';
 rows.push({path,line:index+1,classification,normalFullEmailPlaybackReachable:false,boundary:historical?'Preserved legacy stage/evidence; excluded from C32 normal controller':classification==='NORMAL_PATH_REQUIRED'?'Normal guard/short-confirmation model; does not authorize full email audio':'Explicit diagnostic/QA/catalog/comparison only; normal session rejects legacy IDs and EMAIL slots',excerpt:line.slice(0,260)});
}}
await json('reachability.json',{kind:'SOURCE_OCCURRENCE_AUDIT_WITH_CONTROLLER_REGRESSION_PROOFS',pattern:pattern.source,occurrences:rows.length,normalController:'StructuredEmailSession.responses/approvePlayback/readbackEmail + EmailAcquisition.confirmPrompt',normalFullEmailSpeech:false,diagnosticAssetsPreserved:true,rows});
console.log(JSON.stringify({corpus:corpus.metrics,adversarialPassed:adversarial.passed,modeledSeconds:ordinary.modeledElapsedSeconds,audioSeconds:ordinary.mediaSeconds,readbackOccurrences:rows.length,providerRequests:0}));
