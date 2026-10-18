"""Prepare offline speech sources and freeze production; never calls providers."""
from pathlib import Path
import hashlib,json,subprocess,wave,datetime
root=Path.cwd();batch='stage196-live-batch-100-20261017';folder=root/'benchmarks'/batch
folder.mkdir(exist_ok=True);(folder/'sources').mkdir(exist_ok=True);(folder/'runs').mkdir(exist_ok=True)
assert not list((folder/'runs').iterdir()),'Never overwrite a batch with started runs'
reference=json.loads((root/'tests/fixtures/stage196-short-consent-reference.json').read_text())['text']
profiles=[('samantha150','Samantha',150),('samantha180','Samantha',180),('samantha210','Samantha',210),('daniel180','Daniel',180),('karen180','Karen',180)]
sources=[]
for name,voice,rate in profiles:
 raw=folder/'sources'/(name+'-speech.wav');out=folder/'sources'/(name+'.wav')
 subprocess.run(['/usr/bin/say','-v',voice,'-r',str(rate),'--file-format=WAVE','--data-format=LEI16@24000','-o',str(raw),reference],check=True,capture_output=True)
 with wave.open(str(raw),'rb') as w:
  assert (w.getnchannels(),w.getsampwidth(),w.getframerate())==(1,2,24000);pcm=w.readframes(w.getnframes())
 assert len(pcm)>24000*2*10,'Source synthesis produced no usable speech; no provider run permitted'
 with wave.open(str(out),'wb') as w:
  w.setparams((1,2,24000,0,'NONE','not compressed'));w.writeframes(bytes(24000)+pcm+bytes(96000)) # 500ms lead + 2000ms trailing PCM silence
 sources.append(dict(id=name,voice=voice,rate=rate,text=reference,referenceWords=67,file=name+'.wav',sha256=hashlib.sha256(out.read_bytes()).hexdigest(),samples=(len(pcm)+120000)//2,durationMs=(len(pcm)+120000)/48,provenance='offline macOS synthetic speech; exact reference remains test data only',leadingSilenceMs=500,trailingSilenceMs=2000))
fingerprints={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for foldername in ['src','server','public'] for p in (root/foldername).rglob('*') if p.is_file()}
for name in ['package.json','package-lock.json','.env','.env.local']:
 p=root/name
 if p.exists():fingerprints[name]=hashlib.sha256(p.read_bytes()).hexdigest()
config=dict(batchId=batch,createdAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),maxAttempts=100,concurrency=1,sources=sources,reference=reference,settings=dict(source='en',target='da',path='realtime',prosodyMs=250,jitterMs=100,cachedOpening=False,forceControlled=False,protectedTerms=[],speed=.95,gain=3.5573605757216837,voice='Isabella',model='eleven_flash_v2_5',conversationContext='aPureBase healthcare contact demonstration. Interpret speakers only; never invent replies.'),productionFingerprints=fingerprints,limitations=['Live APIs; synthetic source replay; silent real-time renderer; not physical microphone/headphone acceptance.','Five fixtures repeat one 67-word script: limited linguistic and speaker coverage; repeated runs are not independent natural calls.','No script text supplied as ASR hints or repair. No production code or configuration changes.','One persistent voice connection per run. New connections between separate runs are expected.'],runTimeoutMs=170000,consecutiveInfrastructureFailureLimit=3)
(folder/'config.json').write_text(json.dumps(config,indent=2)+'\n')
print(json.dumps(dict(batchId=batch,maxAttempts=100,profiles=[dict(id=s['id'],seconds=s['durationMs']/1000) for s in sources]),indent=2))
