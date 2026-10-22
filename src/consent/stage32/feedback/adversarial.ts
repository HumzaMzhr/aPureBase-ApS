import {syntheticCall} from '../hardening/simulator';
import {measureOutcome,safetyMetrics,assertSafeMetrics,type AcquisitionSnapshot} from '../hardening/outcomes';
import type {ContactEmailResolver,EmailReconciliationPort} from '../email/types';

const safeRecord=(contactId:string,email='anna@clinic.example')=>({contactId,email,sourceRecordId:'synthetic:record',recordVersion:'1'});
export const closureAdversarialIds=['db-wrong-contact','db-duplicate-exact','db-many-distinct-exact-speech','db-extra-field','db-object-version','db-array-source','db-untrimmed','db-oversized','model-invents','model-changes-character','model-malformed','model-wrong-token-map','model-unknown-field','model-throws','model-timeout','stale-database-recipient-revision','correction-after-confirmation','positive-completed-local'] as const;
export async function closureAdversarialCase(id:typeof closureAdversarialIds[number]){
 const db:ContactEmailResolver={resolveCandidates:async s=>{
  const record=safeRecord(s.contactId);
  const variants:Record<string,unknown>={
   'db-wrong-contact':[{...record,contactId:'wrong-recipient'}],
   'db-duplicate-exact':[record,{...record,sourceRecordId:'synthetic:second'}],
   'db-many-distinct-exact-speech':[record,safeRecord(s.contactId,'anne@clinic.example')],
   'db-extra-field':[{...record,unexpected:true}],
   'db-object-version':[{...record,recordVersion:{nested:1}}],
   'db-array-source':[{...record,sourceRecordId:[]}],
   'db-untrimmed':[{...record,email:' anna@clinic.example'}],
   'db-oversized':Array(4).fill(record)
  };
  return (variants[id]??[record]) as Awaited<ReturnType<ContactEmailResolver['resolveCandidates']>>;
 }};
 const model:EmailReconciliationPort|undefined=id.startsWith('model-')?{suggest:async input=>{
  const base={candidate:'anna@clinic.example',confidence:'EXACT_VERIFIED_MATCH',reason:'SYNTHETIC ADVISORY',evidenceTokenIndices:input.tokens.map((_,i)=>i),uncertainTokens:[]};
  if(id==='model-invents')return {...base,candidate:'invented@other.example'};
  if(id==='model-changes-character')return {...base,candidate:'anne@clinic.example'};
  if(id==='model-malformed')return 'not a structured response';
  if(id==='model-wrong-token-map')return {...base,evidenceTokenIndices:[999]};
  if(id==='model-unknown-field')return {...base,store:true};
  if(id==='model-throws')throw new Error('SYNTHETIC model offline');
  return new Promise(()=>{});
 }}:undefined;
 let release:((rows:Awaited<ReturnType<ContactEmailResolver['resolveCandidates']>>)=>void)|undefined;
 const f=await syntheticCall('closure:'+id,id==='stale-database-recipient-revision'?{resolveCandidates:()=>new Promise(r=>{release=r;})}:db,{},model);
 await f.identity();await f.session.approvePlayback('purpose');await f.question();await f.yes();await f.ask();
 const consentBefore=f.session.snapshot().decision;
 if(id==='stale-database-recipient-revision'){
  const pending=f.speak('anna@clinic.example');for(let i=0;i<20&&!release;i++)await Promise.resolve();if(!release)throw new Error('Test failed to reach pending database lookup');await f.identity();release([safeRecord(f.scope.contactId)]);await pending;
 }else{
  await f.speak('anna@clinic.example');
  if(id==='correction-after-confirmation'){await f.session.structuredEmail.confirmPrompt();await f.speak('Ja');await f.speak('Undskyld, det er anne snabel-a clinic punktum example');}
  if(id==='positive-completed-local')await f.complete();
 }
 const flow=f.session.structuredEmail.snapshot(),host=f.session.snapshot(),outcome=measureOutcome(flow,host);
 const ambiguous=id==='db-duplicate-exact',negativeDb=id.startsWith('db-')&&id!=='db-many-distinct-exact-speech';
 const checks={noAutomaticAccept:!outcome.autoAccepted,noProductionEmailWrite:host.email===undefined,ambiguityNeverSelected:!ambiguous||outcome.candidate===null,malformedOrWrongScopeNeverSelected:!negativeDb||outcome.candidate===null,modelNeverOwnsSelection:!id.startsWith('model-')||flow.attempt?.resolution.suggestion?.accepted===false&&(['model-invents','model-changes-character'].includes(id)?flow.attempt.resolution.selected===null&&flow.attempt.resolution.action==='OPERATOR_REVIEW'&&flow.attempt.resolution.selectionSource===null:flow.attempt.resolution.selectionSource==='DETERMINISTIC_EXACT'),staleResultCannotApply:id!=='stale-database-recipient-revision'||!flow.attempt&&!host.decision,correctionRevokesConfirmation:id!=='correction-after-confirmation'||!flow.confirmation&&!flow.storedEmail,positiveReallyStoredLocally:id!=='positive-completed-local'||outcome.finalStoredAddress==='anna@clinic.example'&&flow.storedEmail?.productionConsent===false,consentUnchangedByEmail:id==='stale-database-recipient-revision'||JSON.stringify(consentBefore)===JSON.stringify(host.decision)};
 return {id,passed:Object.values(checks).every(Boolean),checks,outcome,ambiguous,expected:id==='positive-completed-local'?'anna@clinic.example':null,sourceEvidence:f.export()};
}
export async function runClosureAdversarial(){
 const rows=[];for(const id of closureAdversarialIds)rows.push(await closureAdversarialCase(id));
 const metrics=safetyMetrics(rows);assertSafeMetrics(metrics);
 const f=await syntheticCall('negative-control',{resolveCandidates:async s=>['n@clinic.example','1@clinic.example'].map(email=>safeRecord(s.contactId,email))});
 await f.identity();await f.session.approvePlayback('purpose');await f.question();await f.yes();await f.ask();await f.speak('en snabel-a clinic punktum example');
 const safe=f.session.structuredEmail.snapshot();
 const unsafe={...safe,state:'END_SUCCESS',storedEmail:{kind:'LOCAL_EVALUATION_CONFIRMED_EMAIL',email:'n@clinic.example',recipientRevision:1,consentTurnId:'invented',sourceTurnId:'unowned',confirmationTurnId:'none',candidateRevision:0,storedAt:0,reviewer:'',reviewReason:'',productionConsent:false}} as AcquisitionSnapshot;
 const negativeMetrics=safetyMetrics([{outcome:measureOutcome(unsafe,f.session.snapshot()),ambiguous:true,expected:null}]);let detected=false;try{assertSafeMetrics(negativeMetrics);}catch{detected=true;}
 if(!detected||negativeMetrics.falseAutoAccepts!==1||negativeMetrics.ambiguousAutoSelections!==1)throw new Error('Unsafe negative-control detection failed');
 return {kind:'ACTUAL_CONTROLLER_STATES_WITH_SYNTHETIC_PORTS_NOT_ASR_OR_PRODUCTION_ACCEPTANCE',rows,denominator:rows.length,passed:rows.filter(r=>r.passed).length,metrics:{falseEmailAutoAccepts:metrics.falseAutoAccepts,ambiguousAutomaticSelections:metrics.ambiguousAutoSelections},negativeControl:{kind:'TEST_ONLY_UNSAFE_SNAPSHOT_NEVER_APPLIED_TO_REAL_CONTROLLER',metrics:negativeMetrics,detected,realControllerStoredEmail:f.session.structuredEmail.snapshot().storedEmail??null},providerRequests:0};
}
