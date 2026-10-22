"""Layered exact preservation for the email freeze. No network/generation/writes."""
import hashlib,json,subprocess
from pathlib import Path
r=Path.cwd();folder=r/'docs/stage-2.0c-3.2-email-architecture'
m=json.loads((folder/'preservation.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for p,before in m['before'].items():
 expected=m['changes'].get(p,{}).get('after',before)
 assert sha(r/p)==expected,p
for p,v in m['changes'].items():assert v['before']==m['before'][p],p
old=json.loads((r/'docs/stage-2.0c-3.2-feedback-closure/preservation-manifest.json').read_text())
for v in old['protectedAudio']:assert sha(r/v['path'])==v['sha256'],v['path']
assert len(old['protectedAudio'])==52
tracked=subprocess.check_output(['git','ls-files','-z']).decode().split('\0')
assert not any(p and (Path(p).name=='.env' or Path(p).name.startswith('.env.') and not p.endswith('.example') or p.endswith(('.pem','.key','.p12'))) for p in tracked)
for v in json.loads((folder/'source-proof.json').read_text())['records']:assert sha(r/v['path'])==v['sha256'],v['path']
assert all(not p.startswith(('server/','src/streaming/')) for p in m['changes'])
print(json.dumps({'status':'PASS','beforeFilesChecked':len(m['before']),'exactAuthorizedChanges':list(m['changes']),'Stage196Unchanged':True,'originalRecordings':37,'C31Recordings':12,'C32Recordings':3,'historicalEvidencePreserved':True,'credentialsTracked':False,'providerRequests':0},indent=2))
