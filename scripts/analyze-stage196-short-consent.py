"""Offline only: full frozen physical exports; no provider calls or transcript repair."""
import csv, hashlib, json, re, unicodedata
from pathlib import Path
SID='594a168c-8387-45fd-913d-fd416ece53b0'
f=json.loads(Path('tests/fixtures/stage196-short-consent-physical.json').read_text())
d,s=f['diagnostics'],f['review']['snapshot']
assert d['sessionId']==f['sessionId']==SID
assert d['recognitionAudit']==s['recognition']['audit']
assert d['epoch']==s['acoustic']['epoch']
assert d['voiceProvenance']==s['voiceProvenance']
assert {u['unitId'] for u in d['units']}=={u['id'] for u in s['lanes']['en']['units']}
for diagnostic_unit in d['units']:
 assert diagnostic_unit['timing']==next(u['timing'] for u in s['lanes']['en']['units'] if u['id']==diagnostic_unit['unitId'])
for inp in f['inputs']:
 p=Path(inp['path'])
 if p.exists():
  raw=p.read_bytes();assert len(raw)==inp['bytes'] and hashlib.sha256(raw).hexdigest()==inp['sha256'];json.loads(raw)
reference=json.loads(Path('tests/fixtures/stage196-short-consent-reference.json').read_text())['text']
trace=s['audioTrace'];items=d['recognitionAudit']['items'];units=s['lanes']['en']['units']
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

raw=score([dict(id=f'provider-{i["generation"]}',text=i['final']) for i in items if i.get('final')])
committed=score([dict(id=u['id'],text=u['source']) for u in units])
assert raw['referenceWords']==67 and raw['deletions']==4 and raw['substitutions']==raw['insertions']==0
assert {k:v for k,v in raw.items() if k!='edits'}=={k:v for k,v in committed.items() if k!='edits'}
contains=lambda a,b:any(a[n:n+len(b)]==b for n in range(len(a)-len(b)+1))
evidence=[]
for u in units:
 item=next(i for i in items if i['generation']==u['turn']-1)
 send=next(e for e in trace if e['type']=='ELEVENLABS_TEXT_SENT' and u['id'] in e.get('unitIds',[]))
 available=next((p['at'] for p in item['partials'] if contains(tokens(p['text']),tokens(u['source']))),item['finalAt'])
 evidence.append(dict(unit=u,rawItem=item,firstCompleteObservedWordsAt=available,actualTextSubmission=send,pcmBlocks=[p for p in d['pcmBlocks'] if u['id'] in p.get('unitIds',[])]))
rows=[]
for index,g in enumerate(s['gaps']):
 start,end=g['gap_start'],g['gap_end'];block=d['pcmBlocks'][[1,2,3,5,8,9,10][index]]
 e=next(e for e in evidence if e['unit']['id'] in block['unitIds']);u=e['unit'];t=u['timing'];item=e['rawItem'];sent=e['actualTextSubmission']['at'];a=e['firstCompleteObservedWordsAt']
 pcm=next(x for x in trace if x['type']=='voice.pcm_received' and x['totalSamples']==block['lastSample']+1)
 verify=next((x for x in trace if x['type']=='voice.pcm_verified' and x.get('pcmBlockSequence')==block['pcmBlockSequence']),None)
 continuation=t['playback_started']<start-150
 checkpoints=[(start,'start')]
 def mark(at,classification):
  if at>checkpoints[-1][0] and at<end:checkpoints.append((at,classification))
 if continuation:mark(pcm['at'],'ELEVENLABS_STALL')
 else:
  if len(item['semanticUnitIds'])==1:
   mark(item['lastVoiceAt'],'SOURCE_NOT_YET_AVAILABLE_OR_ASR_PARTIAL_DELAY')
   mark(item['commitAt'],'LOCAL_ENDPOINT_DELAY')
  mark(a,'ASR_PARTIAL_DELAY')
  if u['stabilityReason']=='provider_final':mark(item['finalAt'],'PROVIDER_FINAL_DELAY')
  mark(t['source_stable_at'],'SEMANTIC_COMMITMENT')
  mark(t['translation_started'],'TRANSLATION_QUEUE')
  mark(t['translation_ready'],'TRANSLATION_PROVIDER')
  mark(t['translation_consumed'],'ORDERED_WAIT')
  mark(sent,'TTS_TEXT_NOT_SENT')
  mark(pcm['at'],'ELEVENLABS_WAITING_FOR_PCM')
 mark(block['scheduledAt'],'PCM_VERIFICATION_AND_SCHEDULING')
 checkpoints.append((end,'BROWSER_SCHEDULER_OR_PCM_SIGNAL_PADDING'))
 phases=[dict(classification=checkpoints[n][1],startAt=checkpoints[n-1][0],endAt=checkpoints[n][0],ms=checkpoints[n][0]-checkpoints[n-1][0]) for n in range(1,len(checkpoints))]
 for phase in phases:
  phase['classifications']={'SOURCE_NOT_YET_AVAILABLE_OR_ASR_PARTIAL_DELAY':['SOURCE_NOT_YET_AVAILABLE','ASR_PARTIAL_DELAY','OTHER/UNPROVEN'],'PCM_VERIFICATION_AND_SCHEDULING':['OTHER/UNPROVEN','BROWSER_SCHEDULER'],'BROWSER_SCHEDULER_OR_PCM_SIGNAL_PADDING':['BROWSER_SCHEDULER','OTHER/UNPROVEN']}.get(phase['classification'],[phase['classification']])
 assert abs(sum(p['ms'] for p in phases)-g['gap_duration'])<.001
 after=lambda at:max(0,end-max(start,at))
 rows.append(dict(gapId=index+1,**g,unitId=u['id'],resumingBlockSequence=block['pcmBlockSequence'],phases=phases,sourceSpeechLastVoiceAt=item['lastVoiceAt'],firstCompleteObservedWordsAt=a,localCommitAt=item['commitAt'],providerFinalAt=item['finalAt'],semanticCommitAt=t['source_stable_at'],translationStartAt=t['translation_started'],translationFirstTextAt=t['translation_first_text'],translationReadyAt=t['translation_ready'],orderedConsumptionAt=t['translation_consumed'],actualTextSentAt=sent,providerPCM=next((x for x in trace if x['type']=='voice.provider_pcm_received' and x.get('totalSamples')==block['lastSample']+1),None),clientPCM=pcm,verification=verify,scheduledAt=block['scheduledAt'],pcmPlaybackStartedAt=block['playbackStartedAt'],audibleResumeAt=end,afterA_completeObservedWordsMs=after(a),afterB_validatedCommitMs=after(t['source_stable_at']),afterC_translationReadyMs=after(t['translation_ready']),afterD_textSubmittedMs=after(sent),genuinelyUnavoidableMs=None,sourceReadinessQualification='A is first complete recorded ASR words, NOT acoustic forced alignment or proof of stability. Time before A is not all unavoidable. Retained source energy gives no per-word alignment; exact irreducible versus optimizable source/ASR waiting is unidentifiable.',modeledBeforeMs=g['gap_duration'],modeledAfterFixedArrivalsMs=g['gap_duration']))
recoveries=[]
for r in [x for x in trace if x['type']=='ELEVENLABS_STALL_RECOVERY']:
 before=max((x for x in trace if x['type']=='voice.pcm_received' and x['at']<r['at']),key=lambda x:x['at'])
 after=next(x for x in trace if x['type']=='voice.pcm_received' and x['at']>r['at'])
 flush=next(x for x in trace if x['type']=='voice.provider_flush_sent' and x['at']>r['at'])
 ack=next(x for x in trace if x['type']=='VOICE_FLUSH_CONFIRMED' and x['at']>r['at'])
 current=d['pcmBlocks'][next(n for n,p in enumerate(d['pcmBlocks']) if p['lastSample']+1==before['totalSamples'])]
 recoveries.append(dict(request=r,lastPCM=before,gatewayFlush=flush,gatewayAck=ack,providerAck=None,nextPCM=after,responseLatencyMs=after['at']-r['at'],playbackAlreadyStarved=r['at']>current['playbackFinishedAt'],timeBeforePCMDrainsMs=current['playbackFinishedAt']-r['at'],shortenedStarvation='Not identifiable: no counterfactual response. Both requests failed to restore timely PCM.',guard='Both client and gateway require new PCM progress before every recovery; first no-response attempt suppresses second despite cap=2.',duplication='Text submissions once; unique contiguous PCM ranges. Semantic/acoustic repetition cannot be excluded without waveform/full character alignment.'))
source_end=d['latencyBreakdown']['tailBreakdown']['sourceSpeechEndAt'];target_end=d['latencyBreakdown']['tailBreakdown']['targetAudioEndAt']
tail_silent=sum(max(0,min(target_end,g['gap_end'])-max(source_end,g['gap_start'])) for g in s['gaps'])
word_misses=[dict(generation=gen,missing=phrase,everInThatItemPartial=any(contains(tokens(p['text']),tokens(phrase)) for p in items[gen]['partials']),providerFinal=items[gen]['final'],localDeletion=False) for gen,phrase in [(0,'calling on behalf'),(1,'information')]]
boundaries=[dict(generation=i['generation'],startAt=i['startedAt'],firstVoiceAt=i.get('firstVoiceAt'),lastVoiceAt=i.get('lastVoiceAt'),commitAt=i.get('commitAt'),observedThrough=i.get('observedThrough'),appendedSamples=i['appendedSamples'],gatewaySamples=i.get('gatewaySamples'),gapFromPreviousCommitMs=i.get('firstVoiceAt',i['startedAt'])-items[n-1]['commitAt'] if n and 'commitAt' in items[n-1] else None,clippedSamples=i['clippedSamples']) for n,i in enumerate(items)]
gap_values=sorted(g['gap_duration'] for g in s['gaps'])
# Nearest-rank p95 is documented; seven retained gaps are not a population estimate.
metrics=dict(medianGapMs=gap_values[len(gap_values)//2],p95GapMs=gap_values[-1],gapQuantileMethod='median and nearest-rank p95 of seven retained bounded gaps >=500ms',gapsOver1s=sum(v>1000 for v in gap_values),gapsOver2s=sum(v>2000 for v in gap_values),firstAudioMs=s['acoustic']['firstAudioLatency'],tailMs=s['acoustic']['tailLatency'],largestGapMs=max(g['gap_duration'] for g in s['gaps']),retainedGaps=len(rows),voiceProvenance=d['voiceProvenance'],voiceQuality=d['voiceQuality'],pending=d['pending'],positions=s['positions'])
output=dict(status='NOT ACCEPTED',sessionId=SID,inputs=f['inputs'],allInputJSONRead=True,matchingRawAuditVerified=True,reviewSessionBinding='Review schema has no sessionId. Binding verified by identical raw ASR audit, epoch, semantic unit IDs, provenance and exact unit timings; no independent session ID claim.',coverage=dict(droppedEvents=d['droppedEvents'],retainedEvents=len(d['events']),droppedVoiceLifecycle=d.get('droppedVoiceLifecycle'),voiceLifecycleEvents=len(d.get('voiceLifecycle',[])),reviewAudioTraceEvents=len(trace),droppedRawItems=d['recognitionAudit']['droppedItems'],droppedRawPartials=sum(i['droppedPartials'] for i in items),sourceWaveformRetained=False,outputWaveformRetained=False),metrics=metrics,captureSettings=d.get('captureSettings'),reference=reference,providerFinals=[i.get('final') for i in items if 'final' in i],committedTranscript=[u['source'] for u in units],ASR=dict(rawBefore=raw,committedBefore=committed,rawAfterFixedReplay=raw,committedAfterFixedReplay=committed,omissions=word_misses,normalization='NFKC, case, apostrophes and punctuation only; global Levenshtein; offline reference never passed to production'),units=evidence,gaps=rows,voiceChronology=[e for e in trace if e['type'] in ['ELEVENLABS_TEXT_SENT','ELEVENLABS_STALL_RECOVERY','ELEVENLABS_STARVATION_FLUSH','voice.provider_flush_sent','VOICE_FLUSH_CONFIRMED','voice.provider_pcm_received','voice.pcm_received']],recoveries=recoveries,recognitionAudit=d['recognitionAudit'],boundaries=boundaries,finalQuestion=dict(item=items[5],localCommitToFinalMs=items[5]['finalAt']-items[5]['commitAt'],completeQuestionAt=65170.6,completeQuestionToFinalMs=items[5]['finalAt']-65170.6,commitSentAt=None,providerAckAt=None,commitTransmissionEvidence='gatewaySamples=115200 comes from gateway commit_sent. Exact send/ACK timestamps evicted. Delivery requires ACK; ACK exists by final delivery. Cannot assign full wait to provider computation.',olderItemBlocking=False,explanation='Provider continues incremental incomplete text for most of 11.5875s; complete question appears 312.3ms before final. No retained evidence that a complete stable consent question was locally blocked for eleven seconds.'),tail=dict(exported=d['latencyBreakdown']['tailBreakdown'],lastQuestionVoiceAt=items[5]['lastVoiceAt'],emptyItemEnergyPulse=dict(firstVoiceAt=items[6]['firstVoiceAt'],lastVoiceAt=items[6]['lastVoiceAt'],voicedSamples=items[6]['voicedSamples']),questionVoiceEndToTargetEndMs=target_end-items[5]['lastVoiceAt'],finalQuestionFirstAudibleMappedAt=s['acoustic']['epoch']+s['acoustic']['units'][-1]['playbackStartAt'],firstFinalPCMToQuestionAudibleMs=s['acoustic']['epoch']+s['acoustic']['units'][-1]['playbackStartAt']-units[-1]['timing']['first_audio_received'],questionAudibleSpanToSessionSignalEndMs=target_end-(s['acoustic']['epoch']+s['acoustic']['units'][-1]['playbackStartAt']),retainedAudibleSilentMs=tail_silent,elapsedMinusRetainedGapsMs=target_end-source_end-tail_silent,qualification='Primary physical tail preserved. Empty item 20ms pulse extends acoustic source end; cannot label pulse definitively without waveform. Remaining elapsed time is not exact spoken duration. Provider final waiting overlaps ongoing output and silence; do not add them twice.'),deterministic=dict(beforeRecoveryRequestsMs=[48950,58250],afterRecoveryRequestsMs=[48950,50450,58250,59750],timingToleranceMs=2,perRangeControlCap=2,noResponseSecondBackoffMs=1500,physicalAfterAvailable=False,fixedRecordedProviderGapsUnchanged=True,rawAndCommittedWERUnchanged=True,redBeforeProduction=dict(failed=4,passed=43),greenFocused=dict(passed=52),greenFull=dict(files=64,passed=627)),limits=['Browser phase durations sum only browser timestamps. Server providerAt is a separate clock; never subtract it from browserAt.','No retained ASR ACK/send milestones: exact attribution of final question provider processing versus delivery/ACK delay unknown.','All seven retained bounded >=500ms gaps reconstructed. Signal detector bounds are not proof of absence of unretained quiet regions.','Physical after correction unavailable. Fixed provider-arrival replay retains all gaps, WER and tail; controller changes alone cannot prove responsiveness.','A single persistent ElevenLabs connection ensures identity/order, not throughput. Gateway flush acknowledgement only confirms local upstream send, not provider acknowledgement.','No reference-word repair, consent split, model/voice/gain/speed/config change or permanent playback buffering.'])
Path('benchmarks').mkdir(exist_ok=True)
Path('benchmarks/stage196-short-consent-audit.json').write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n')
Path('benchmarks/stage196-short-consent-asr-score.json').write_text(json.dumps(output['ASR'],indent=2,ensure_ascii=False)+'\n')
with Path('benchmarks/stage196-short-consent-gaps.csv').open('w') as f:
 cols=['gapId','gap_start','gap_end','gap_duration','unitId','firstCompleteObservedWordsAt','localCommitAt','providerFinalAt','semanticCommitAt','translationFirstTextAt','translationReadyAt','actualTextSentAt','afterA_completeObservedWordsMs','afterB_validatedCommitMs','afterC_translationReadyMs','afterD_textSubmittedMs','modeledBeforeMs','modeledAfterFixedArrivalsMs','phases']
 writer=csv.DictWriter(f,fieldnames=cols);writer.writeheader();writer.writerows({k:json.dumps(r[k]) if k=='phases' else r[k] for k in cols} for r in rows)
print(json.dumps(dict(sessionId=SID,status='NOT ACCEPTED',rawWER=raw['WER'],committedWER=committed['WER'],gaps=[dict(id=r['gapId'],ms=r['gap_duration'],phaseSum=sum(p['ms'] for p in r['phases'])) for r in rows]),indent=2))
# Human report uses only the audit above and explicitly labeled offline checks.
lines=[]
def say(text=''):lines.append(text)
ms=lambda x:f'{x:.3f}' if isinstance(x,(float,int)) else 'unknown'
say('STAGE 1.9.6 STATUS: NOT ACCEPTED')
say('Short-consent physical forensic investigation and bounded correction pass')
say('Authoritative physical session: '+SID)
say('Physical AFTER this correction: NOT RUN. No physical improvement claimed.')
say('Frozen physical metrics: largest gap 7751.667ms; median 4019.333ms; p95 7751.667ms (nearest-rank over 7 retained gaps >=500ms); gaps >1s:7, >2s:6; first audio 5186.624ms; tail 16348.057ms. Raw/committed WER each 5.970149%; connections1, provenance16/16, output clipping0; pipeline63/63/63/63, not 67 intended words.')
say()
say('EVIDENCE FREEZE AND LIMITS')
for i in output['inputs']:say(f"{i['path']}\n  bytes={i['bytes']}; SHA-256={i['sha256']}")
say('Both entire JSON documents parsed, frozen together in tests/fixtures/stage196-short-consent-physical.json (read-only). Reference is a separate offline fixture. No reference is imported into runtime ASR.')
say(output['reviewSessionBinding'])
say('Matching evidence: identical raw recognition audit, acoustic epoch 14210.100000023842, eight semantic unit IDs/timings and provenance. Review has empty human ratings; no human assertion of no replay is supplied.')
say('2577 diagnostic events evicted; 448 retained. Separate voice lifecycle: 67 entries, 0 dropped. Review audio trace: 225 entries. Seven microphone items (six nonempty finals plus empty uncommitted item), eight semantic units, sixteen PCM blocks; raw item/partial drops=0. Full raw partial histories, units and voice chronology are included in the machine audit.')
say('Exact ASR commit transmission/ACK/provider-completed observation times for generation 5 were evicted. GatewaySamples proves commit_sent occurred, but cannot recover its time. Neither microphone nor output waveform, nor full output character alignment is retained. Exact word-acoustic readiness, speech duplication and actual remaining word duration cannot be recovered from text/counters alone.')
say('All browser gap phases use browser performance timestamps. Provider server-performance.now values are preserved separately and never subtracted from browser timestamps. GapTimeline signal bounds and mapped acoustic first/tail have different observation paths; do not substitute unit completion for last audible output.')
say()
say('EXACT INTENDED TRANSCRIPT (67 normalized words)')
say(reference)
say('\nEXACT PROVIDER FINALS (six; whitespace within strings preserved)')
for item in items:
 if 'final' in item:say(f"generation {item['generation']}: "+json.dumps(item['final'],ensure_ascii=False))
say('\nEXACT COMMITTED SOURCE (eight ordered units)')
for u in units:say(u['id']+': '+json.dumps(u['source'],ensure_ascii=False))
say('\nWER: global word Levenshtein after NFKC/case/apostrophe/punctuation normalization only. No transcript correction, brand substitution or script alignment in production.')
say('Raw provider finals: 63/67 words; S=0 D=4 I=0; WER=5.970149%. Committed: 63/67, S=0 D=4 I=0; WER=5.970149%. Fixed-arrival AFTER replay: identical scores. New recognition AFTER: unavailable.')
say('Deleted: calling / on / behalf in generation 0; information in generation 1. None appears in any retained partial of its corresponding item. The word information does occur correctly in later items; those occurrences do not repair the earlier omission. Semantic units retain the provider omissions; local stabilization does not delete these words.')
say('Translation already rendered generation 1 as “Vi leverer faglig information til sundhedspersoner”. That target wording is not evidence of correct source ASR or a local source correction. It is unchanged in this pass.')
say('Input capture: 24kHz PCM, 48kHz device; device channelCount=1, worklet reports two channels and existing code selects channel zero. EC/NS/AGC enabled, unchanged. Zero tracked frame gaps, overlaps or unclocked packets; committed gateway sample counts exactly equal appended samples. Six clipped INPUT samples in generation 0; zero in generation 1. Input clipping/DSP/provider context could affect quality but their causal role in the deletions is unproven without waveform. No evidence of local packet discard; this is not proof that every provider-side internal stage was lossless.')
say('\nENDPOINT AND PROVIDER FINAL CHRONOLOGY (absolute browser ms)')
say('gen | started | firstVoice | lastVoice | local commit | observedThrough | provider final | semantic final | samples | input clipped')
for item in items:say(' | '.join(str(v) for v in [item['generation'],ms(item['startedAt']),ms(item.get('firstVoiceAt')),ms(item.get('lastVoiceAt')),ms(item.get('commitAt')),ms(item.get('observedThrough')),ms(item.get('finalAt')),ms(item.get('semanticFinalizedAt')),item['samples'],item['clippedSamples']]))
say('For every committed item, observed audio quiet exceeds 750ms and next-item first voice follows the prior commit. No retained evidence of speech crossing an endpoint/commit boundary. The two missing phrases are internal to continuous items, not at an item split. PCM-based endpointing behaves as designed here; the previous race is not reproduced in this physical run.')
say('\nEVERY RECOGNITION UNIT / TRANSITION (absolute browser ms)')
for e in evidence:
 u=e['unit'];t=u['timing'];say(f"{u['id']}: source={json.dumps(u['source'],ensure_ascii=False)}; target={json.dumps(u['target'],ensure_ascii=False)}; precision={u['precision']}; stability={u['stabilityReason']}; model={u['model']}")
 say(f"  observed words={ms(e['firstCompleteObservedWordsAt'])}; semantic={ms(t['source_stable_at'])}; translation queued/start/first/ready/consumed="+'/'.join(ms(t.get(k)) for k in ['translation_queued','translation_started','translation_first_text','translation_ready','translation_consumed']))
 say(f"  actual TTS send={ms(e['actualTextSubmission']['at'])}; first PCM callback={ms(t['first_audio_received'])}; unit scheduled/start/end="+'/'.join(ms(t.get(k)) for k in ['playback_scheduled','playback_started','playback_finished'])+f"; blocks={[b['pcmBlockSequence'] for b in e['pcmBlocks']]}")
say('\nALL SEVEN RETAINED BOUNDED GAPS: PHYSICAL BEFORE / FIXED-ARRIVAL MODELED AFTER')
say('No provider latency is changed by assertion. All AFTER times below deliberately hold the physical provider arrivals fixed. They are not new physical measurements.')
say('gap | start->end ms | before ms | after ms | A after complete observed words | B after validated commit | C after translation ready | D after actual text submission')
for r in rows:say(f"{r['gapId']} | {ms(r['gap_start'])}->{ms(r['gap_end'])} | {ms(r['gap_duration'])} | {ms(r['modeledAfterFixedArrivalsMs'])} | "+' | '.join(ms(r[k]) for k in ['afterA_completeObservedWordsMs','afterB_validatedCommitMs','afterC_translationReadyMs','afterD_textSubmittedMs']))
say('A uses first complete retained raw words, which may still lack repeated stable evidence. It bounds opportunity, not acoustic inevitability. Exact genuinely unavoidable source time is unknown for every gap because per-word acoustic alignment is unavailable. Do not classify all pre-commit time as unavoidable. Gaps 6 and 7 have zero waiting for new source text: the full consent proposition was already available, validated, translated and submitted before silence.')
for r in rows:
 say(f"\nGap {r['gapId']} / {r['unitId']}, resuming PCM block {r['resumingBlockSequence']}, duration {ms(r['gap_duration'])}ms")
 for p in r['phases']:say(f"  {ms(p['startAt'])}->{ms(p['endAt'])}: {p['classification']} = {ms(p['ms'])}ms")
 say('  Sum = '+ms(sum(p['ms'] for p in r['phases']))+'ms; difference from physical = '+ms(sum(p['ms'] for p in r['phases'])-r['gap_duration'])+'ms.')
 say('  Full chain: lastVoice '+ms(r['sourceSpeechLastVoiceAt'])+'; complete raw words '+ms(r['firstCompleteObservedWordsAt'])+'; local endpoint '+ms(r['localCommitAt'])+'; provider final '+ms(r['providerFinalAt'])+'; semantic '+ms(r['semanticCommitAt'])+'; TL start/first/ready '+ '/'.join(ms(r[k]) for k in ['translationStartAt','translationFirstTextAt','translationReadyAt'])+'; ordered '+ms(r['orderedConsumptionAt'])+'; TTS '+ms(r['actualTextSentAt'])+'; client PCM '+ms(r['clientPCM']['at'])+'; scheduled '+ms(r['scheduledAt'])+'; PCM start '+ms(r['pcmPlaybackStartedAt'])+'; audible '+ms(r['audibleResumeAt'])+'.')
 say('  Microphone endpoint/final may be later than an early stable semantic prefix; it is a contextual milestone and not an added dependency for already committed prefixes. Other phases overlap preceding output and are clipped to this gap, never added twice.')
say('\nDIRECT CAUSES OF THE THREE PRIORITY FAILURES')
say('5.717167s: source speech continues for 859.133ms after prior audible output ends; endpoint observation costs 759.5ms; final source words reach browser 41.6ms after local commit; provider-final wait from full partial 804.6ms; semantic 0.4ms; precision translation 1497.8ms; ordered release 0.8ms; actual submitted text to first PCM 1678ms; verification/scheduling 7.9ms; signal onset 67.433ms. The entire gap cannot be labeled ElevenLabs or semantic delay. 3.251933s remain after validated source commitment, 1.753333s after actual target submission.')
say('7.751667s: 7730.633ms with no new PCM, then 5.1ms receive/verification/schedule and 15.933ms to audible onset. All source/translation/send work was complete. Provider/server-clock PCM idle is 8807.317ms. This is a PCM-supply stall, not browser multi-second scheduling or upstream recognition.')
say('5.044167s: 5029.133ms with no new PCM, then 14.5ms receive/verification/schedule and 0.533ms to signal onset. All consent target text was already submitted; provider/server-clock PCM idle is 6564.505ms. Additional unsubscribe target text was also pending. Renderer had no PCM to play; this is not proof of a six-second block of encoded silent samples. No waveform supports that stronger claim.')
say('\nEVERY RECOVERY / FLUSH / ACK / PCM EVENT')
say('Browser receivedAt | event | metadata (providerAt, if present, remains in its labeled separate clock)')
for e in output['voiceChronology']:say(f"{ms(e['at'])} | {e['type']} | "+json.dumps({k:v for k,v in e.items() if k not in ['at','type','text']},ensure_ascii=False,sort_keys=True))
for n,r in enumerate(recoveries,1):
 q=r['request'];say(f"\nRecovery {n}: last client PCM {ms(r['lastPCM']['at'])}; request {ms(q['at'])}; idle={ms(q['pcmIdleMs'])}; queued buffer={ms(q['bufferMs'])}ms; pending={q['pendingCharacters']}chars; attempt={q['recoveryAttempts']}; request precedes PCM drain by {ms(r['timeBeforePCMDrainsMs'])}ms.")
 say(f"  Gateway flush observed at {ms(r['gatewayFlush']['at'])}; gateway ACK observed {ms(r['gatewayAck']['at'])}; next client PCM {ms(r['nextPCM']['at'])}; response latency {ms(r['responseLatencyMs'])}ms. Provider continued generating afterward.")
say('WHY RECOVERY FAILED: the controls fired before PCM drained (248.333ms and 214.5ms), so a trigger solely after starvation is not the explanation. Both controls reached the gateway; gateway wrote a control-space flush. Neither restored PCM within the remaining lead. Client AND gateway then required new PCM bytes to permit another recovery, so the nominal two-attempt allowance stayed at attempt 1 for each range. The next distinct submitted text resets the per-range allowance; that is why both retained recovery events say attempt 1.')
say('Proven mechanism: B (guard suppresses a no-response reflush) plus observable provider-path PCM starvation. A alone does not explain it; C (two are insufficient) is untested. D/E/F (provider ignores/reorders control-space flush, persistent-context generation behavior, or long-unit monopolization) remain hypotheses, not established causes. G (browser scheduler) does not account for either multi-second gap. A local VOICE_FLUSH_CONFIRMED is gateway-send confirmation, not an ElevenLabs acknowledgment or generation guarantee.')
say('A new unsubscribe submission at 56575.1ms precedes the next PCM at 56924.8ms by 349.7ms. Correlation cannot prove which flush/text message resumed generation. Whether either original recovery shortened starvation cannot be measured without its missing counterfactual.')
say('No duplicate text submissions: eight ordered target submissions, each once. PCM sequences 0..15 and sample ranges 0..546787 are contiguous, with one request ID. These prove no application-level text resubmission or PCM envelope replay. They cannot rule out words acoustically repeated inside newly generated PCM; no output waveform/full character alignment or human rating exists.')
say('\nGENERATION 5: FINAL CONSENT QUESTION')
say('firstVoice 49595.3; lastVoice 53135.3; local endpoint/commit 53895.4 (760.1ms after voice). 115200 appended samples exactly match gateway commit_sent metadata. Existing code forwards commit synchronously on command receipt, after append and capacity checks, without waiting for another item. Exact physical forwarding time is evicted: prompt transmission is plausible from code, not proven to the millisecond by this export.')
say('Provider-delivered final 65482.9; local wait 11587.5ms; engine semantic finalized 65484.5, unit committed 65483.2. Protocol requires input_audio_buffer.committed ACK before final delivery, so ACK occurred by delivery; its actual time, and the upstream completed-event time before gateway delivery, are unknown. Cannot truthfully assign all 11.6s to provider computation rather than ACK/network/delivery.')
say('Other item blocking: no. Generation 4 final already arrived at 52056ms, before generation 5 commit. Generation 6 has no text/final and follows generation 5; it cannot cause front-item ordering delay. The final question is syntactically unfinished in the retained stream for most of the wait: information arrives 59240.8; by 65096.7; email 65168.8; question mark 65170.6. Complete question to provider final is only 312.3ms.')
say('Current stable closed-phrase release handles complete declarative/greeting evidence and does not release this question early. Even an ideal immediate full-question commit cannot recover the preceding 11s: email did not yet exist in the recorded partials. Complete consent requires permission + send + information + email; do not infer email from the offline script. The question itself is currently classified ordinary, while the explicit permission statement is precision. No precision-classification or semantic-release change was made in this pass. The faithful recorded target question is unchanged.')
say('Every generation 5 raw partial, at absolute browser ms:')
for p in items[5]['partials']:say('  '+ms(p['at'])+' '+json.dumps(p['text'],ensure_ascii=False))
say('\nLONG PRECISION CONSENT PROPOSITION')
say('Source and target are retained above. The target has 88 characters and is submitted once at 46440.5ms. PCM blocks 8/9/10 contain 113696 samples = 4737.333ms at 24kHz, but span 48134.5->65655.667ms at the renderer; 12783.833ms have no PCM coverage. Retained signal gaps within this proposition sum to 12795.833ms; the small difference is signal padding/clock observation, not missing speech invented by the analyzer.')
say('The complete proposition reaches raw partials only when email arrives at 44136.9ms. Earlier text “We would like your permission” omits action/object/channel and is unsafe to speak alone. There is no independently complete earlier consent clause to split in this sentence. Arbitrary TTS fragmentation after full validation might change provider behavior, but this run does not prove the long unit caused starvation or that fragmentation fixes it. No speculative split, text replay, connection churn or new buffer was introduced.')
say('\nFIRST AUDIO')
for k,v in d['latencyBreakdown']['firstAudioBreakdown'].items():say(f'  {k} = {ms(v)}ms')
say('PCM verification CPU is already within PCM-to-playback; it is not an additional serial first-audio segment.')
say('5186.624333ms physically misses <=5000ms. “Hi, good morning” first complete words at 20633.4ms, punctuation arrives at 21628.6, distinct lookahead My at 21640.3 and commit at 21640.4. The 1006.9ms observation-to-commit interval includes waiting for stable complete evidence, not proven idle work. Existing 250ms greeting prosody hold contributes ~253.2ms from translation ready to actual send; altering it would affect validated greeting quality and is outside this minimal proven correction. No first-audio improvement claimed.')
say('\nPHYSICAL TAIL (metric preserved)')
for k,v in output['tail']['exported'].items():say('  '+k+' = '+ms(v)+('ms' if isinstance(v,(int,float)) else ''))
say('The non-overlapping exported stages sum to 16348.057333ms. Source-end 57093.566667 -> final unit commit 65483.2 = 8389.633ms; translation queue 0.1; translation 1634.5; ordered 0.8; TTS wait 0.2; first final PCM generation/arrival 443.3; remaining queued/output span 5879.524ms. The last span is not all generation latency or all silence.')
say(f"  Final-question first PCM callback {ms(units[-1]['timing']['first_audio_received'])}; first mapped question audible {ms(output['tail']['finalQuestionFirstAudibleMappedAt'])}; PCM-to-question-onset {ms(output['tail']['firstFinalPCMToQuestionAudibleMs'])}ms; question-onset-to-last-session-signal {ms(output['tail']['questionAudibleSpanToSessionSignalEndMs'])}ms. These are spans, not a forced alignment of individual Danish words.")
say(f"Within the reported tail, retained >=500ms silence totals {ms(tail_silent)}ms (gap 7). Other elapsed time is {ms(target_end-source_end-tail_silent)}ms, primarily continuing consent/unsubscribe/question output and smaller pauses. Exact non-silent word duration versus encoded silence requires output waveform; do not call all other time unavoidable speech. The provider-final wait overlaps output and gap 7 and cannot be added to them as independent serial latency.")
say(f"The source-end detector includes a later 20ms energy pulse in empty generation 6: voice 57075->57095ms, 480 voiced samples, no recognition text and no VAD item activation. It extends acoustic source-end beyond final question VAD lastVoice by {ms(source_end-items[5]['lastVoiceAt'])}ms. Last-question-VAD-end to actual target end is {ms(target_end-items[5]['lastVoiceAt'])}ms. This alternate boundary is reported alongside, NOT substituted for the physical 16348.057333ms metric. Without waveform the pulse cannot be definitively labeled noise or user speech.")
say('\nMINIMAL PRODUCTION CORRECTIONS AND TRADE-OFFS')
say('src/streaming/voiceClient.ts + server/continuousVoice.ts: first residual recovery still requires real PCM progress and >=750ms idle; allow one second control-only flush after >=1500ms without additional PCM, capped at two per submitted text range. Client still requires <=250ms queued PCM and positive outstanding target characters. New text resets attempts, end/cancel/failure stops recovery, same connection and exact original speech text remain. Existing progress-based second attempts remain permitted. No speech resubmission, EOS/reconnect or PCM holding.')
say('This closes a physically demonstrated controller blind spot; it does NOT establish that ElevenLabs will answer a second control-space flush promptly. 1500ms is a bounded backoff design choice, not a measured optimal provider timeout. Extra empty-control generation requests may change provider chunking/latency; pronunciation, duplicated words, effectiveness and billing behavior need physical verification. Cap limits storms but can still leave unresolved starvation if both attempts receive no response.')
say('server/continuousTranscription.ts: add metadata-only timestamps for upstream commit ACK and provider completed event separately from final delivery, preserving ACK-before-delivery/item ownership. src/streaming/sessionDiagnostics.ts: bounded 256-entry recognition lifecycle, explicit eviction count and 384KiB total budget; retain gateway flush confirmations in voice lifecycle. These changes address missing evidence, not WER or recognition speed. Raw speech and credentials remain excluded from metadata.')
say('Unchanged: Isabella, ElevenLabs eleven_flash_v2_5, speed 0.95, gain 3.5573605757216837, calibrated headroom, one persistent context, sample/ordering/provenance guards, source text, translation/consent wording, greeting behavior, endpoint threshold/timeout/DSP, semantic precision and translation retry rules. No campaign-specific correction. Source-tail measurement unchanged.')
say('\nDETERMINISTIC BEFORE / AFTER (NOT PHYSICAL ACCEPTANCE)')
say('Before production edits: focused regressions 4 FAILED / 43 passed across 3 files; red log saved. Failures: client suppresses no-response second control (2 vs 4 expected across two ranges), gateway suppresses second no-progress control, no durable recognition lifecycle, missing separate provider-completed/ACK milestones. Three measured priority gap reconstructions and literal omission/endpoint/drain assertions already pass because they preserve physical facts, not acceptance thresholds.')
say('Frozen pre-change ContinuousVoice retained at tests/fixtures/stage196-before-short-voiceClient.ts. At fixed physical event times: pre-change recovery controls approx [48950,58250]ms; candidate [48950,50450,58250,59750]ms (50ms demand timer and sub-ms fake timer rounding). Added controls occur while PCM has made no progress; all original target text still submitted once. Mock audio callbacks stay 4->4 with 223652 distinct samples and no replay. The reduced witness groups retained sample counts; original provider character spans/waveform are not available and are not claimed to be reproduced.')
say('Gateway regression: a premature second reflush at +1499ms remains blocked; +1500ms now reaches the mocked provider; third blocked at cap. Existing immediate no-PCM first-recovery guard remains. ACK regression intentionally supplies completed before ACK and verifies final is withheld until ACK; this synthetic ordering is a diagnostic safety test, not an assertion about the physical final-question cause.')
say('All seven fixed-arrival gap durations, raw/committed WER, first audio and tail stay unchanged; physical AFTER absent. There is no regression asserting that invented PCM arrives in <=2s. The actual physical continuity criteria remain failed.')
for name in ['before-regressions','after-regressions','full-tests','lint','typecheck','build','diff-check']:
 path=Path(f'benchmarks/stage196-short-consent-{name}.log')
 if path.exists():
  log=path.read_text();summary=[l.strip() for l in log.splitlines() if 'Test Files' in l or re.match(r'\s*Tests\s',l) or 'error TS' in l or '✖' in l or 'built in' in l]
  say(name+': '+('; '.join(summary) if summary else ('no errors recorded' if 'error' not in log.lower() else 'inspect log')))
say('\nEXACT PASS-ONLY CHANGE MANIFEST')
say('Compare against /tmp/apurebase-stage196-short-before/manifest.json, not Git HEAD (which contains extensive older uncommitted Stage work). See stage196-short-consent-change-manifest.json and stage196-short-consent-working-pass.patch for exact paths/hashes/diff. Four production files changed; no configuration change. Tests added: stage196-short-consent.test.ts; modified: streaming-voice.test.ts and continuous-transcription-gateway.test.ts; before-client + two immutable evidence/reference fixtures added. Offline analyzer generates audit, gap CSV, ASR score and this report.')
say('\nPHYSICAL SAFEGUARDS OBSERVED')
say('One voice connection; 16/16 verified Isabella PCM blocks, no alternate/unverified blocks; 0.95 speed; exact calibrated gain 3.5573605757216837; post-gain peak 0.8451554179191589; zero OUTPUT clipping/peak-protection events. Received=committed=translated=spoken=63; all recognition/translation/TTS/playback/ready/job queues drain to zero; carry/buffer=0; target/playback samples=546788/546788. This is 63 recognized words of the 67-word reference, not proof that the intended 67 words were captured. Seven renderer underruns total 28180.833333ms; underrun duration differs from audible gap sum and should not be conflated.')
say('\nUNRESOLVED / NEXT PHYSICAL VERIFICATION')
say('Physical first audio still exceeds 5s; ordinary ready transitions still exceed 1s; all six >2s retained gaps remain unproven improved. WER stays 5.970149% with four provider-origin deletions. The ~11.6s final wait is not safely fixable from the missing upstream timing and late partial stream. Provider control-space response, internal persistent-context scheduling and long-unit causality remain unknown. Safe semantic-question release could address only a few hundred ms in this recording, not its eleven missing seconds, and was not changed.')
say('A future authorized physical test must verify second control response/next PCM timing, no duplicated/replayed spoken words, no replacement gap after early releases, first audio, raw/committed WER, tail with energy-pulse evidence, exact provenance/settings, capture/sample integrity and queue drain. Export BOTH diagnostics and review. No physical/live/provider test was performed in this correction pass.')
say('Backend clean restart REQUIRED before any next physical test (server files changed); frontend refresh/reload REQUIRED to load the matching client and diagnostics. Neither restart nor next physical test was initiated in this pass. No commit, PR, deployment or provider request. Stage remains NOT ACCEPTED.')
say('\nPrimary protocol references consulted (read-only web documentation, no provider requests):')
say('https://developers.openai.com/api/docs/guides/realtime-transcription')
say('https://elevenlabs.io/docs/eleven-api/guides/how-to/websockets/realtime-tts')
say('These describe manual commit/item correlation and flush behavior; they do not prove provider internal causality for this session.')
Path('benchmarks/stage196-short-consent-forensic-report.txt').write_text('\n'.join(lines)+'\n')
