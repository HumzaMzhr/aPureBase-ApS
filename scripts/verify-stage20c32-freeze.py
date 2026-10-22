"""Current freeze layer: protects earlier evidence and exact intended source/audio."""
from pathlib import Path
import json,hashlib
r=Path.cwd();m=json.loads((r/'docs/stage-2.0c-3.2-final-freeze-preservation.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for p,h in m['before'].items():assert sha(r/p)==m['changes'].get(p,{}).get('after',h),p
for p,v in m['changes'].items():
    assert v['before']==m['before'][p],p
    assert p in m['allowedChanges'],p
assert set(m['allowedChanges'])==set(m['changes'])
for p in m['changes']:assert not p.startswith(('server/','src/streaming/','src/consent/corrections/','public/','benchmarks/')),p
for a in m['recordings']:assert sha(r/a['path'])==a['sha256'],a['path']
assert len(m['recordings'])==54
for a in m['brandAssets']:assert sha(r/a['path'])==a['sha256'],a['path']
for a in json.loads((r/'docs/stage-2.0c-3.2-final-freeze-evidence/source-proof.json').read_text())['records']:assert sha(r/a['path'])==a['sha256'],a['path']
print(json.dumps({'status':'PASS','filesBeforeFreeze':len(m['before']),'intentionalFreezeChanges':m['allowedChanges'],'protectedRecordings':54,'Stage196Preserved':True,'consentEmailEnginePreserved':True,'historicalReportsPreserved':True,'officialBrandAssetsPreserved':True},indent=2))
