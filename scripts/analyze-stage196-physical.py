"""Offline forensic reconstruction. Reads BOTH complete matching exports.
Never imports this passage/evidence into runtime ASR or sends provider requests.
"""
import csv, hashlib, json, re, unicodedata
from pathlib import Path

SID = 'bee7b25d-60e6-49ba-b3d9-01599f5e4726'
paths = [Path('/Users/humzamazhar/Downloads/apurebase-last-session-diagnostics (9).json'), Path('/Users/humzamazhar/Downloads/stage19-local-review (5).json')]
d, review = [json.loads(p.read_text()) for p in paths]
s = review['snapshot']
assert d['sessionId'] == SID
assert d['recognitionAudit'] == s['recognition']['audit']
assert {u['unitId'] for u in d['units']} == {u['id'] for u in s['lanes']['en']['units']}
trace, audit = s['audioTrace'], d['recognitionAudit']
reference = json.loads(Path('tests/fixtures/stage195-reference.json').read_text())['text']

def tokens(text):
    text = unicodedata.normalize('NFKC', text).replace('’', "'").replace('‘', "'").lower()
    return re.findall(r"[^\W_]+(?:'[^\W_]+)*", text)

def score(rows):
    a, b = tokens(reference), [(word, row['id']) for row in rows for word in tokens(row['text'])]
    dp = [[0]*(len(b)+1) for _ in range(len(a)+1)]
    for i in range(len(a)+1): dp[i][0] = i
    for j in range(len(b)+1): dp[0][j] = j
    for i in range(1,len(a)+1):
        for j in range(1,len(b)+1): dp[i][j] = min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]!=b[j-1][0]))
    i,j = len(a),len(b)
    edits=[]
    while i or j:
        if i and j and dp[i][j] == dp[i-1][j-1]+(a[i-1]!=b[j-1][0]):
            i-=1;j-=1;edits.append(dict(operation='correct' if a[i]==b[j][0] else 'substitution',reference=a[i],observed=b[j][0],unitId=b[j][1]))
        elif i and dp[i][j] == dp[i-1][j]+1:
            i-=1;edits.append(dict(operation='deletion',reference=a[i],observed=None,unitId=(b[j] if j<len(b) else b[j-1])[1]))
        else:
            j-=1;edits.append(dict(operation='insertion',reference=None,observed=b[j][0],unitId=b[j][1]))
    edits.reverse()
    counts={key:sum(e['operation']==kind for e in edits) for key,kind in [('substitutions','substitution'),('deletions','deletion'),('insertions','insertion')]}
    return dict(referenceWords=len(a),observedWords=len(b),**counts,WER=sum(counts.values())/len(a),edits=edits)

raw_score=score([dict(id=f'provider-{a["generation"]}',text=a['final']) for a in audit['items'] if a.get('final')])
committed_score=score([dict(id=u['id'],text=u['source']) for u in s['lanes']['en']['units']])
assert (raw_score['substitutions'],raw_score['deletions'],raw_score['insertions']) == (8,4,0)
assert (committed_score['substitutions'],committed_score['deletions'],committed_score['insertions']) == (5,5,0)
units=[]
for u in s['lanes']['en']['units']:
    item=next(a for a in audit['items'] if a['generation']==u['turn']-1)
    sent=next(e for e in trace if e['type']=='ELEVENLABS_TEXT_SENT' and u['id'] in e.get('unitIds',[]))
    blocks=[p for p in d['pcmBlocks'] if u['id'] in p.get('unitIds',[])]
    voice_events=[e for e in trace if sent['at'] <= e['at'] <= u['timing']['playback_finished']]
    previous=''; revisions=[]
    for p in item['partials']:
        old,new=tokens(previous),tokens(p['text'])
        if old and new[:len(old)]!=old: revisions.append(dict(at=p['at'],before=previous,after=p['text']))
        previous=p['text']
    units.append(dict(**u,rawItem=item,providerFinal=item['final'],actualTextSubmission=sent,pcmBlocks=blocks,voiceEvents=voice_events,rawWordRevisions=revisions,providerFinalVsSemantic='identity/brand normalization' if item['final']!=u['source'] and len(item.get('semanticUnitIds',[]))==1 else 'raw final split into ordered units' if len(item.get('semanticUnitIds',[]))>1 else 'identical',WERedits=[e for e in committed_score['edits'] if e['unitId']==u['id'] and e['operation']!='correct']))

rows=[]
for i,g in enumerate(s['gaps']):
    start,end=g['gap_start'],g['gap_end']
    # Prefer the PCM block whose actual playback resumes the gap. Exported next ID
    # can point at a previous still-playing unit, and cannot establish attribution.
    block=next((b for b in d['pcmBlocks'] if b['playbackStartedAt']<=end+120 and b['playbackFinishedAt']>=end and b['playbackStartedAt']>=start-150),None)
    ids=block.get('unitIds',[]) if block else []
    unit=next((u for u in units if u['id'] in ids),None)
    if not unit: unit=next(u for u in units if u['id']==g['next_expected_segment'])
    t=unit['timing'];item=unit['rawItem'];sent=unit['actualTextSubmission']['at']
    received=next((e for e in trace if e['type']=='voice.pcm_received' and e.get('totalSamples')==block['lastSample']+1),None) if block else None
    within=lambda a,b:max(0,min(end,b)-max(start,a))
    observation=t['source_end_observed'];commit=t['source_stable_at']
    # Full-unit availability is a bound, not proof that every earlier subclause
    # was untranslatable. Do not rename local waiting as unavoidable source delay.
    before_observation=within(start,observation)
    after_commit=within(commit,end)
    same_unit_resume=t['playback_started'] < start-150
    if same_unit_resume:
        first=received['at'] if received else None
        phases=[dict(stage='no verified PCM supplied while previously validated ordered text remains',ms=within(start,first)),dict(stage='client verification/processing to scheduler',ms=within(first,block['scheduledAt'])),dict(stage='scheduler/device to audible onset',ms=within(block['scheduledAt'],end))] if first else []
    else:
        phases=[]
        markers=[('source/ASR observation (inseparable without waveform alignment)',start,observation),('observation to semantic commit (includes local endpoint/provider final wait)',observation,commit),('translation queue',t['translation_queued'],t['translation_started']),('translation provider incl response transport',t['translation_started'],t['translation_ready']),('ordered result wait',t['translation_ready'],t['translation_consumed']),('validated result to actual TTS submission',t['translation_consumed'],sent),('text submission to first PCM generation/network',sent,received['at'] if received else t['first_audio_received']),('PCM verification and scheduling',received['at'] if received else t['first_audio_received'],block['scheduledAt'] if block else t['playback_started']),('scheduled PCM to actual audible onset (incl signal padding)',block['scheduledAt'] if block else t['playback_started'],end)]
        phases=[dict(stage=name,ms=within(a,b)) for name,a,b in markers]
    assert abs(sum(p['ms'] for p in phases)-g['gap_duration'])<.01,(i,phases)
    phases=[p for p in phases if p['ms']>.0001]
    row=dict(sourceSpeechEndEvidence=item.get('lastVoiceAt') if len(item.get('semanticUnitIds',[]))==1 else None, gapId=i+1,**g,attributedUnit=unit['id'],resumingPCMBlock=block,sourceObservation=observation,localCommit=item['commitAt'],providerFinal=item['finalAt'],semanticCommit=commit,translationReady=t['translation_ready'],actualTextSent=sent,providerToClientPCM=received,phases=phases,unavailableFullUnitObservationMs=before_observation,observedButNotCommittedMs=within(observation,commit),afterValidatedSourceCommitMs=after_commit,afterValidatedTargetReadyMs=within(t['translation_ready'],end),unavoidableQualification='Full-unit availability bound only. Earlier partials are all retained below except three explicitly evicted on item7. Genuine acoustic/recognition irreducibility and translation quality of a new smaller prefix cannot be measured from text metadata. Before-commit time is NOT all declared unavoidable.',modeledBeforeMs=g['gap_duration'],modeledAfterFixedRecordedProvidersMs=g['gap_duration'],modeledAfterReason='Same recorded words, validated commit times, provider results/arrivals and PCM sample durations. Endpoint fix cannot re-recognize missing waveform; recovery is a control request, not evidence of a faster response.')
    if i==4:
        # A smaller comma clause is now eligible; its new provider response is
        # unknown. Reuse full-unit service cost as an explicit counterfactual.
        commit_prefix=36639.89999997616
        assumed_service=t['translation_ready']-t['translation_started']
        assumed_tts=t['first_audio_received']-sent
        onset_overhead=end-t['first_audio_received']
        prefix_onset=commit_prefix+assumed_service+(sent-t['translation_ready'])+assumed_tts+onset_overhead
        prefix='Vi deler også medicinsk information,'
        samples=sum(b['samples'] for b in unit['pcmBlocks'])
        estimated_prefix_ms=samples/24*len(prefix+' ')/len(unit['target']+' ')
        row['conditionalEarlierCommaClause']={'recordedPrefixCommitAt':commit_prefix,'text':'We also share medical information,','assumedTranslationMs':assumed_service,'assumedTTSms':assumed_tts,'estimatedFirstPrefixAudibleAt':prefix_onset,'independentGapMs':max(0,prefix_onset-start),'possibleNewFollowingGapMs':max(0,end-(prefix_onset+estimated_prefix_ms)),'meaning':'Counterfactual only. Uses original full-unit translation and TTS service times for new smaller clauses, reuses the existing translated comma phrase, and apportions original PCM duration by target character length. No recording of the new translated chunks exists. The possible following gap must not be hidden when assessing the earlier onset.'}
    if i==12:
        row['conditionalResponsiveRecovery']={'triggerAt':114100,'assumedRecoveryToPCMms':1500,'measuredPCMToAudibleMs':end-received['at'],'conditionalGapMs':114100+1500+(end-received['at'])-start,'meaning':'Independent gap counterfactual anchored to physical previous audible end. Assumes provider responds to SECOND bounded recovery in 1500ms; unsupported by a paid/live test. Unresponsive provider keeps original 6333ms gap. First recovery may be ignored while prior generation is in flight.'}
    if i==13:
        row['conditionalTranslationRetry']={'firstAttemptCancelledAt':units[-2]['timing']['translation_started']+3000,'assumedSecondTranslationMs':3479.5,'optimisticGapMs':0,'meaning':'The validated text would be ready before this gap under a 3479.5ms second response, versus actual 13527.3ms. Zero gap additionally assumes sufficient ordered PCM is delivered before the preceding block drains; same persistent-provider stall can defeat it. No asserted whole-session prediction.'}
    rows.append(row)

first=units[0];tail=d['latencyBreakdown']['tailBreakdown']
boundaries=[dict(generation=a['generation'],itemStartedAt=a['startedAt'],firstVoiceAt=a.get('firstVoiceAt'),speechBeganBeforeItemBoundaryMs=max(0,a['startedAt']-a.get('firstVoiceAt',a['startedAt']))) for a in audit['items']]
output=dict(sessionId=SID,inputs=[dict(path=str(p),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in paths],allInputJSONRead=True,matchingRawAuditVerified=True,coverage=dict(droppedEvents=d['droppedEvents'],retainedEvents=len(d['events']),reviewTrace=len(trace),retainedGaps=len(rows),recognitionItems=len(audit['items']),providerFinals=sum('final' in a for a in audit['items']),semanticUnits=len(units),droppedPartials=sum(a['droppedPartials'] for a in audit['items']),sourceWaveformRetained=False,outputWaveformRetained=False),firstAudio=d['latencyBreakdown']['firstAudioBreakdown'],firstGreetingRawEvidence=first['rawItem'],firstAudioAfterFixedRecordedProvidersMs=s['acoustic']['firstAudioLatency'],firstGreetingDecision='Only one complete greeting partial at18237.2; incomplete prior Hi,good at18186.8. No earlier whole-greeting stable witness proves a safe168ms gain. Keep precision/stability unchanged; target <=5s unproven.',tail=tail,tailAfterFixedRecordedProvidersMs=tail['totalTail'],tailDetail=dict(sourceLastVoice=units[-1]['rawItem']['lastVoiceAt'],localCommit=units[-1]['rawItem']['commitAt'],providerFinal=units[-1]['rawItem']['finalAt'],semanticCommit=units[-1]['timing']['source_stable_at'],finalTranslationReady=units[-1]['timing']['translation_ready'],orderedRelease=units[-1]['timing']['translation_consumed'],actualTextSent=units[-1]['actualTextSubmission']['at'],firstFinalPCM=units[-1]['timing']['first_audio_received'],finalUnitPlaybackStart=units[-1]['timing']['playback_started'],lastTargetAudible=tail['targetAudioEndAt'],remainingPlaybackIncludesPriorUnitAndFinalUtterance=True,precedingTranslationMs=units[-2]['timing']['translation_ready']-units[-2]['timing']['translation_started']),ASR=dict(referenceWords=166,method='Global Levenshtein, NFKC/case/apostrophe/punctuation normalization only, no name/brand/script corrections in scoring. Raw includes every nonempty provider final; no spurious post-passage final in this session. Tie placement of boundary deletions is ambiguous.',rawBefore=raw_score,committedBefore=committed_score,rawAfterFixedReplay=raw_score,committedAfterFixedReplay=committed_score,afterNewRecognition='Unavailable: no source waveform for offline re-recognition, and live tests forbidden.',capture=d['captureSettings'],boundaryEvidence=boundaries,providerOrigin='All lexically wrong words in the examples occur in earliest applicable raw partials and raw finals. No retained partial ever contains the missing words; none were deleted by semantic commitment. Endpoint race may reduce provider context but cannot be proven sole recognition cause without source waveform.'),voice=dict(quality=d['voiceQuality'],provenance=d['voiceProvenance'],positions=s['positions'],pending=d['pending']),units=units,recognitionItems=audit['items'],gaps=rows,limits=['All retained gaps >=500ms enumerated; gaps with no expected content may not be opened by GapTimeline. No claim that absence from list proves continuous physical speech.','No source waveform or per-word acoustic forced alignment: genuine unavoidable versus optimizable subclause time is bounded, not exactly identifiable.','One persistent connection preserves identity/order, not a throughput guarantee. Recovery can request remaining buffered text but cannot guarantee provider service.','Provider PCM idle spans computed inside one server clock, browser phases inside browser clock. Server absolute clock is never subtracted from browser absolute clock.','Stage196 is a candidate correction pass; physical acceptance remains failed/unproven.'])
Path('benchmarks').mkdir(exist_ok=True)
Path('benchmarks/stage196-physical-audit.json').write_text(json.dumps(output,indent=2)+'\n')
Path('benchmarks/stage196-asr-score.json').write_text(json.dumps(output['ASR'],indent=2)+'\n')
with Path('benchmarks/stage196-all-retained-gaps.csv').open('w') as f:
    cols=['gapId','gap_start','gap_end','gap_duration','attributedUnit','unavailableFullUnitObservationMs','observedButNotCommittedMs','afterValidatedSourceCommitMs','afterValidatedTargetReadyMs','modeledBeforeMs','modeledAfterFixedRecordedProvidersMs']
    writer=csv.DictWriter(f,fieldnames=cols);writer.writeheader();writer.writerows({k:r[k] for k in cols} for r in rows)
print(json.dumps(dict(sessionId=SID,coverage=output['coverage'],rawWER={k:v for k,v in raw_score.items() if k!='edits'},committedWER={k:v for k,v in committed_score.items() if k!='edits'},gapsAtLeast2s=[{k:r[k] for k in ['gapId','gap_duration','attributedUnit','unavailableFullUnitObservationMs','observedButNotCommittedMs','afterValidatedSourceCommitMs','afterValidatedTargetReadyMs']} for r in rows if r['gap_duration']>=2000]),indent=2))
