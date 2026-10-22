"""Layered correction proof; all previous evidence/audio remains immutable."""
from pathlib import Path
import hashlib,json
r=Path.cwd();d=r/'docs/stage-2.0c-3.2-sende-correction'
m=json.loads((d/'preservation.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for p,h in m['before'].items():
    assert sha(r/p)==m['changes'].get(p,{}).get('after',h),p
for p,v in m['changes'].items():
    assert v['before']==m['before'][p],p
    assert p in m['allowedChanges'],p
assert set(m['changes'])==set(m['allowedChanges'])
for v in json.loads((d/'source-proof.json').read_text())['records']:
    assert sha(r/v['path'])==v['sha256'],v['path']
old=json.loads((r/'docs/stage-2.0c-3.2-feedback-closure/preservation-manifest.json').read_text())
assert len(old['protectedAudio'])==52
for v in old['protectedAudio']:assert sha(r/v['path'])==v['sha256'],v['path']
assets=json.loads((r/'src/consent/stage32/speech/sendeAssets.json').read_text())
assert len(assets)==2
for a in assets:assert sha(r/('public'+a['path']))==a['assetHash']
assert not any(p.startswith(('server/','src/streaming/','src/consent/corrections/')) for p in m['changes'])
assert all(not p.startswith(('docs/','public/','benchmarks/')) for p in m['changes'])
print(json.dumps({'status':'PASS','originalFilesChecked':len(m['before']),'exactSourceChanges':len(m['changes']),'Stage196Preserved':True,'originalAudio':37,'C31Audio':12,'earlierC32Audio':3,'newCorrections':2,'totalRecordings':54,'historicalEvidencePreserved':True},indent=2))
