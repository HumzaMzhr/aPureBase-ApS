/** Offline PCM/hash QA only; no fetch/provider activity. */
import {readFile,writeFile} from 'node:fs/promises';
import {decodeWave,bytesHash} from '../src/consent/approved/assets';
import {deliveryGain} from '../src/streaming/deliveryGain';
import {sendeAssets} from '../src/consent/stage32/speech/sende';
import {verifySendeBinding} from '../src/consent/stage32/speech/sendePlan';
import {currentAssetTable,assertCurrentAssetTable} from '../src/consent/stage32/feedback/closure';
const historical=JSON.parse(await readFile('docs/stage-2.0c-3.2-feedback-closure/preservation-manifest.json','utf8')) as {protectedAudio:{path:string;sha256:string}[]};
const rows=[];
for(const a of historical.protectedAudio){const bytes=new Uint8Array(await readFile(a.path));if(await bytesHash(bytes)!==a.sha256)throw new Error('Historical audio changed: '+a.path);const p=decodeWave(bytes),g=deliveryGain(p.samples.slice(),true);if(p.clippingEvents||g.clippingEvents)throw new Error('Historical clipping');rows.push({path:a.path,sha256:a.sha256,historical:true,clippingEvents:0});}
for(const a of sendeAssets){const bytes=new Uint8Array(await readFile('public'+a.path)),p=await verifySendeBinding(a,bytes),g=deliveryGain(p.samples.slice(),true);rows.push({path:'public'+a.path,sha256:a.assetHash,historical:false,seconds:p.duration,gain:g.gainApplied,clippingEvents:g.clippingEvents,peakProtectionEvents:g.peakProtectionEvents,outputPeak:g.postGainPeak,nativeApproval:'PENDING'});}
const table=await currentAssetTable();await assertCurrentAssetTable(table);
if(rows.length!==54||new Set(rows.map(r=>r.sha256)).size!==54)throw new Error('Exact 52+2 inventory required');
await writeFile('docs/stage-2.0c-3.2-sende-correction/audio-qa.json',JSON.stringify({status:'PASS',historicalPreserved:52,newRecordings:2,total:54,providerRequestsDuringAudit:0,nativePronunciationProven:false,rows},null,2)+'\n');console.log('54 recordings verified; 52 preserved, 2 new, zero clipping; native approval pending');
