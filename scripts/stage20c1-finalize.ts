/** Offline only: reverify existing bytes, pin the pack, estimate path durations. */
import { readFile, writeFile } from 'node:fs/promises';
import { approvedInventory, verifyAsset, type AssetManifest } from '../src/consent/approved/assets';
const manifest: AssetManifest = JSON.parse(await readFile('docs/stage-2.0c-1-audio-manifest.json','utf8'));
for (const asset of manifest.assets) await verifyAsset(asset, new Uint8Array(await readFile('public' + asset.path)));
if (manifest.assets.length !== approvedInventory.filter(p => !p.dynamicValues.length).length) throw new Error('Incomplete pack.');
await writeFile('src/consent/approved/assetPack.ts', `// Generated offline after exact text/byte/media/provenance verification. No keys.\nimport type { VerifiedAsset } from './assets';\nexport const verifiedAssets: VerifiedAsset[] = ${JSON.stringify(manifest.assets,null,2)};\n`);
const plans = [
  { id:'A', scenario:'Straight direct HCP YES + email', ids:['opening','purpose','consent-question','email-request','email-readback-intro','email-confirmation-question','success-close'], dynamic:['Exact email address pronunciation/readback'], responses:[2,3,5,2] },
  { id:'B', scenario:'Direct HCP NO', ids:['opening','purpose','consent-question','refusal-close'], dynamic:[], responses:[2,3] },
  { id:'C', scenario:'One clarification then YES', ids:['opening','purpose','consent-question','clarify','email-request','email-readback-intro','email-confirmation-question','success-close'], dynamic:['Exact email address pronunciation/readback'], responses:[2,3,3,5,2] },
  { id:'D', scenario:'Receptionist to doctor to YES', ids:['opening','purpose','consent-question','email-request','email-readback-intro','email-confirmation-question','success-close'], dynamic:['Named target request','Transfer/wait duration','Exact email readback'], responses:[3,2,3,5,2] },
  { id:'E', scenario:'Authorized intermediary YES', ids:['opening','purpose','email-request','email-readback-intro','email-confirmation-question','success-close'], dynamic:['Named authority question','Named intermediary consent question','Exact email readback'], responses:[3,3,5,2] },
  { id:'F', scenario:'Busy/callback', ids:['opening','callback','callback-close'], dynamic:[], responses:[2,4] },
  { id:'G', scenario:'Human takeover trigger', ids:['opening'], dynamic:['Human conversation duration'], responses:[3] },
];
const report = { version:manifest.version, physicalTelephoneLatencyMeasured:false, assumptions:{ recipientResponseSeconds:'Explicit scenario assumptions only, not measurements', systemTransitionSecondsPerBoundary:.05, dynamicDuration:'null, unresolved; no invented pronunciation or telephone delay', ordinaryTargetSeconds:[30,60], clarificationUpperTargetSeconds:90 }, scenarios:plans.map(p=>{
  const staticSeconds=p.ids.reduce((sum,id)=>sum+manifest.assets.find(a=>a.phraseId===id)!.duration,0), recipientSeconds=p.responses.reduce((a,b)=>a+b,0), transitionSeconds=p.ids.length*.05, knownSubtotal=staticSeconds+recipientSeconds+transitionSeconds;
  return {...p, staticPrerecordedSpeakingSeconds:staticSeconds, dynamicValueSeconds:p.dynamic.length?null:0, recipientResponseSeconds:recipientSeconds, systemTransitionSeconds:transitionSeconds, modeledKnownSubtotalSeconds:knownSubtotal, modeledTotalSeconds:p.dynamic.length?null:knownSubtotal, over90Seconds:knownSubtotal>90?'KNOWN_SUBTOTAL_EXCEEDS_90':p.dynamic.length?'UNRESOLVED_TOTAL':'NO', automationComplete:p.dynamic.length===0, limitation:p.dynamic.length?'Static subtotal only; real local flow routes unresolved dynamic values to HUMAN_TAKEOVER. Success is not a fully automated measured call.':'Local projection only; no physical phone latency included.'};
})};
await writeFile('docs/stage-2.0c-1-duration-report.json',JSON.stringify(report,null,2)+'\n');
console.info(JSON.stringify({ staticIds:manifest.assets.length, uniqueAssets:new Set(manifest.assets.map(a=>a.assetHash)).size, successfulGenerations:manifest.generations.filter(g=>g.status==='VERIFIED').length, successfulCharacters:manifest.generations.filter(g=>g.status==='VERIFIED').reduce((s,g)=>s+g.characters,0), failedAttempts:manifest.generations.filter(g=>g.status==='FAILED'), scenarios:report.scenarios.map(p=>({id:p.id,static:p.staticPrerecordedSpeakingSeconds,total:p.modeledTotalSeconds,knownSubtotal:p.modeledKnownSubtotalSeconds})) },null,2));
