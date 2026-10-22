import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {listeningCatalog} from '../src/consent/acceptance/catalog';
import {replacements} from '../src/consent/corrections/assets';
import {decodeWave,assetVoice} from '../src/consent/approved/assets';
import {textHash} from '../src/consent/wording';
import {deliveryGain} from '../src/streaming/deliveryGain';

export async function technicalAudioQA(options:{scanOutside?:boolean}={}){
 const rows=[];const paths=new Set<string>();
 for(const a of [...listeningCatalog,...replacements]){
  const path=a.path.startsWith('/audio/')?'public'+a.path:'binding'in a?'benchmarks/stage20c2-dynamic-cache/'+a.binding!.cacheKey+'.wav':'';
  paths.add(path);const bytes=new Uint8Array(await readFile(path)),hash=createHash('sha256').update(bytes).digest('hex'),d=decodeWave(bytes),gain=deliveryGain(d.samples.slice(),true);
  let leading=0,trailing=0,silent=0;for(const s of d.samples)if(Math.abs(s)<.001)silent++;
  while(leading<d.samples.length&&Math.abs(d.samples[leading])<.001)leading++;
  while(trailing<d.samples.length&&Math.abs(d.samples[d.samples.length-1-trailing])<.001)trailing++;
  const checks={fileHash:hash===a.assetHash,textHash:await textHash(a.text)===a.textHash,sampleCount:d.samples.length===a.samples,duration:Math.abs(d.duration-a.duration)<=1/24000,format:a.sampleRate===24000&&a.mediaFormat==='wav-pcm-s16le-mono',voice:JSON.stringify(a.voice)===JSON.stringify(assetVoice),providerReceipt:!!a.provenance.providerRequestId,nonSilent:d.peak>=.001&&d.rms>=.0001,rawClipping:d.clippingEvents===0,renderedClipping:gain.clippingEvents===0,peakProtected:gain.postGainPeak<=.980001};
  rows.push({technical:inspectWave(Buffer.from(bytes)),phraseId:a.phraseId,path,hash,seconds:d.duration,sampleRate:d.sampleRate,channels:1,rawPeak:d.peak,rawRms:d.rms,rawClipping:d.clippingEvents,gain,leadingSilenceMs:leading/24,trailingSilenceMs:trailing/24,silenceFraction:silent/d.samples.length,checks,passed:Object.values(checks).every(Boolean),nativePronunciation:'UNVERIFIED',assetGroup:replacements.some(r=>r.assetHash===a.assetHash)?'C31_CORRECTED':'ORIGINAL'});
 }
 const others:ReturnType<typeof inspectWave>[]=[];
 async function walk(dir:string){for(const e of await readdir(dir,{withFileTypes:true})){if(['.git','node_modules','dist','.venv'].includes(e.name))continue;const path=dir==='.'?e.name:dir+'/'+e.name;if(e.isDirectory())await walk(path);else if(e.name.toLowerCase().endsWith('.wav')&&!paths.has(path)){
   others.push(inspectWave(await readFile(path)));
  }}}
 if(options.scanOutside!==false)await walk('.');
 const allHashes=new Map<string,number>();for(const h of [...rows.map(r=>r.hash),...others.map(r=>r.hash)])allHashes.set(h,(allHashes.get(h)??0)+1);for(const row of rows)row.technical.duplicateByteGroup=(allHashes.get(row.hash)??0)>1?row.hash:null;for(const row of others)row.duplicateByteGroup=(allHashes.get(row.hash)??0)>1?row.hash:null;
 const groups=new Map<string,number>();rows.forEach(r=>groups.set(r.hash,(groups.get(r.hash)??0)+1));
 return {kind:'AUTOMATIC_FILE_PCM_QA_NOT_NATIVE_LISTENING',approvedInventory:{count:rows.length,passed:rows.filter(r=>r.passed).length,failed:rows.filter(r=>!r.passed).map(r=>r.path),original:rows.filter(r=>r.assetGroup==='ORIGINAL').length,corrected:rows.filter(r=>r.assetGroup==='C31_CORRECTED').length,duplicateByteGroups:[...groups].filter(([,n])=>n>1),rows},outsideConsentInventory:{count:others.length,aggregateOnlyForPrivacy:false,anonymousHashKeyed:true,rows:others,filesNotCopied:true,strictClosedRiffFailures:others.filter(r=>!r.structurallyValid).length,recognizedStreamingHeaders:others.filter(r=>r.streamingHeader).length,unrecognizedStructuralFailures:others.filter(r=>!r.structurallyValid&&!r.streamingHeader).length,payloadAlignmentFailures:others.filter(r=>!r.payloadAligned).length,streamingCompletion:'UNKNOWN_FROM_INDEFINITE_HEADERS',formats:[...new Set(others.map(r=>r.format+':'+r.sampleRate+':'+r.channels))],filesWithRawClipping:others.filter(r=>(r.rawClipping??0)>0).length,allSilentFiles:others.filter(r=>r.silenceFraction===1).length,note:'Private/benchmark/source media are not newly approved consent assets; technical findings do not change their role or authorize playback.'},totalAvailableWavs:rows.length+others.length,sourceRecordingEnabled:false,newAudioGenerated:0};
}

/** Pure per-file analysis; unknown header completion never becomes a claimed duration. */
export function inspectWave(b:Buffer){
   const wave=b.length>=44&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WAVE';let offset=12,rate:number|null=null,channels:number|null=null,bits=0,format=0,dataStart=0,dataLength=0,valid=wave&&b.readUInt32LE(4)+8===b.length;
   while(wave&&offset+8<=b.length){const id=b.toString('ascii',offset,offset+4),n=b.readUInt32LE(offset+4),start=offset+8;if(start+n>b.length){valid=false;break;}if(id==='fmt '&&n>=16){format=b.readUInt16LE(start);channels=b.readUInt16LE(start+2);rate=b.readUInt32LE(start+4);bits=b.readUInt16LE(start+14);}if(id==='data'){dataStart=start;dataLength=n;}offset=start+n+n%2;}
   const streamingHeader=wave&&b.length>=44&&b.readUInt32LE(4)===0xffffffff&&b.toString('ascii',36,40)==='data'&&b.readUInt32LE(40)===0xffffffff;if(streamingHeader){dataStart=44;dataLength=b.length-44;}let clipped:number|null=null,silent:number|null=null;if((valid||streamingHeader)&&format===1&&bits===16&&dataLength%2===0){clipped=0;silent=0;for(let i=dataStart;i<dataStart+dataLength;i+=2){const v=b.readInt16LE(i);if(v===32767||v===-32768)clipped++;if(Math.abs(v)<33)silent++;}silent/=Math.max(1,dataLength/2);}
   let peak:number|null=null,leading:number|null=null,trailing:number|null=null;
   if(clipped!==null){peak=0;leading=0;trailing=0;for(let i=dataStart;i<dataStart+dataLength;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)/32768));while(leading<dataLength/2&&Math.abs(b.readInt16LE(dataStart+leading*2))<33)leading++;while(trailing<dataLength/2&&Math.abs(b.readInt16LE(dataStart+dataLength-2-trailing*2))<33)trailing++;}
   const payloadSeconds=rate&&channels&&bits?dataLength/(rate*channels*bits/8):null;
   return {hash:createHash('sha256').update(b).digest('hex'),bitDepth:bits,headerCompleteness:streamingHeader?'INDEFINITE_COMPLETION_UNKNOWN':valid?'COMPLETE':'INVALID',durationSeconds:valid&&!streamingHeader?payloadSeconds:null,durationStatus:streamingHeader?'UNKNOWN':valid?'DERIVED_CLOSED_CONTAINER':'UNKNOWN',payloadDurationSeconds:payloadSeconds,rawPeak:peak,allSilent:silent===null?null:silent===1,leadingSilenceMs:leading!==null&&rate&&channels?leading/rate/channels*1000:null,trailingSilenceMs:trailing!==null&&rate&&channels?trailing/rate/channels*1000:null,unexpectedlyShort:payloadSeconds===null?null:payloadSeconds<.05,truncated:streamingHeader?null:!valid,duplicateByteGroup:null as string|null,format:format===1?'PCM':format===3?'FLOAT':'OTHER',sampleRate:rate,channels,bytes:b.length,structurallyValid:valid&&dataLength>0,streamingHeader,payloadAligned:dataLength>0&&dataLength%2===0,rawClipping:clipped,silenceFraction:silent};
}
