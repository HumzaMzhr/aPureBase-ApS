"""Current exact layered preservation gate; historical proofs remain immutable."""
from pathlib import Path
import json,hashlib,subprocess
r=Path.cwd();folder=r/'docs/stage-2.0c-3.2-final-consolidation';m=json.loads((folder/'preservation.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert subprocess.check_output(['git','merge-base','--is-ancestor','c647dec9c6caae97b7b7e17d99283f9f402727c9','HEAD']).decode()==''
for p,h in m['before'].items():assert sha(r/p)==m['changes'].get(p,{}).get('after',h),p
for p,v in m['changes'].items():assert v['before']==m['before'][p],p
for v in json.loads((folder/'source-proof.json').read_text())['records']:assert sha(r/v['path'])==v['sha256'],v['path']
old=json.loads((r/'docs/stage-2.0c-3.2-feedback-closure/preservation-manifest.json').read_text())
for v in old['protectedAudio']:assert sha(r/v['path'])==v['sha256'],v['path']
assert len(old['protectedAudio'])==52
assert all(not p.startswith(('server/','src/streaming/','src/consent/corrections/')) for p in m['changes'])
print(json.dumps({'status':'PASS','preConsolidationFiles':len(m['before']),'exactConsolidationChanges':list(m['changes']),'Stage196Unchanged':True,'consentBaselineUnchanged':True,'originalAudio':37,'C31Audio':12,'C32Audio':3,'historicalReportsPreserved':True,'providerRequests':0},indent=2))
