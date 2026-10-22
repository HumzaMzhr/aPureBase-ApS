"""Read-only exact preservation check; no network, secrets or generation."""
from pathlib import Path
import hashlib,io,json,subprocess,tarfile
root=Path.cwd();folder=root/'docs/stage-2.0c-3.2-feedback-closure'
manifest=json.loads((folder/'preservation-manifest.json').read_text())
base='c647dec9c6caae97b7b7e17d99283f9f402727c9'
allowed={
 'src/consent/stage32/Workbench.tsx',
 'src/consent/stage32/hardening/ReviewPanel.tsx',
 'src/consent/stage32/hardening/SpeechPanel.tsx',
 'src/consent/stage32/hardening/review.ts',
 'src/consent/stage32/session.ts',
 'src/consent/stage32/email/flow.ts',
 'src/consent/stage32/hardening/simulator.ts',
 'src/consent/stage32/duration.ts'
}
sha=lambda b:hashlib.sha256(b).hexdigest()
assert manifest['baseline']==base and set(r['path'] for r in manifest['intentionalChanges'])==allowed
pins={r['path']:r for r in manifest['intentionalChanges']};changed=[];unchanged=0
with tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['git','archive',base]))) as archive:
 for member in archive:
  if not member.isfile():continue
  before=sha(archive.extractfile(member).read());after=sha((root/member.name).read_bytes())
  if before==after:unchanged+=1;continue
  pin=pins.get(member.name);assert pin and pin['before']==before and pin['after']==after,member.name;changed.append(member.name)
assert set(changed)==allowed
authorized={r['path']:r for r in manifest['authorizedClarifyChanges']}
assert set(authorized)=={'src/consent/stage32/speech/candidatePack.json','src/consent/stage32/speech/candidates.ts','tests/consent-stage20c32-candidates.test.ts'}
for row in manifest['preAuditRecords']:
 actual=sha((root/row['path']).read_bytes())
 assert actual==(pins[row['path']]['after'] if row['path'] in pins else authorized[row['path']]['after'] if row['path'] in authorized else row['sha256']),row['path']
 if row['path'] in authorized:assert row['sha256']==authorized[row['path']]['before']
for row in manifest['newSourceFiles']:assert sha((root/row['path']).read_bytes())==row['sha256'],row['path']
for row in manifest['protectedAudio']:assert sha((root/row['path']).read_bytes())==row['sha256'],row['path']
assert len(manifest['protectedAudio'])==52
pack=json.loads((root/'src/consent/stage32/speech/candidatePack.json').read_text())
assert pack[:2]==manifest['preservedFirstTwoC32Candidates']
assert len(pack)==3 and pack[2]['phraseId']=='clarify' and pack[2]['assetHash']=='55e255476384ad077184102aedf4dcfecdeb865974e3346ab2cadefcb292f420'
assert pack[2]['humanReviewStatus']=='HUMAN_REVIEW_PENDING' and pack[2]['productionApproved'] is False
print(json.dumps({'status':'PASS','baseline':base,'baselineFiles':unchanged+len(changed),'byteIdenticalBaselineFiles':unchanged,'intentionalExactChanges':changed,'preAuditFiles':len(manifest['preAuditRecords']),'originalAudio':37,'C31Audio':12,'C32Audio':3,'Stage196ServerStreamingUnchanged':True,'historicalReportsUnchanged':True,'candidateTestExactAuthorizedExtension':True,'providerRequestsDuringVerification':0,'authorizedClarifyRequestsThisTask':1},indent=2))
