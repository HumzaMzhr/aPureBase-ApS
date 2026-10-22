"""Read-only live-run analysis; evidence-derived WAVs/reports written locally. No providers."""
import array,csv,hashlib,html,json,math,re,statistics,unicodedata,wave
from pathlib import Path
from collections import Counter,defaultdict
ROOT=Path('benchmarks/stage196-live-batch-100-20261017');cfg=json.loads((ROOT/'config.json').read_text());reference=cfg['reference']
def tokens(text):return re.findall(r"[^\W_]+(?:'[^\W_]+)*",unicodedata.normalize('NFKC',text).replace('’',"'").replace('‘',"'").lower())
def score(rows):
 a=tokens(reference);b=[(w,i) for i,text in rows for w in tokens(text)];dp=[[0]*(len(b)+1) for _ in range(len(a)+1)]
 for i in range(len(a)+1):dp[i][0]=i
 for j in range(len(b)+1):dp[0][j]=j
 for i in range(1,len(a)+1):
  for j in range(1,len(b)+1):dp[i][j]=min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]!=b[j-1][0]))
 i,j=len(a),len(b);edits=[]
 while i or j:
  if i and j and dp[i][j]==dp[i-1][j-1]+(a[i-1]!=b[j-1][0]):
   i-=1;j-=1
   if a[i]!=b[j][0]:edits.append(dict(operation='S',reference=a[i],observed=b[j][0],unit=b[j][1]))
  elif i and dp[i][j]==dp[i-1][j]+1:i-=1;edits.append(dict(operation='D',reference=a[i],observed=None,unit=b[j][1] if j<len(b) else None))
  else:j-=1;edits.append(dict(operation='I',reference=None,observed=b[j][0],unit=b[j][1]))
 counts=Counter(e['operation'] for e in edits);return dict(referenceWords=len(a),observedWords=len(b),S=counts['S'],D=counts['D'],I=counts['I'],WER=len(edits)/len(a),edits=list(reversed(edits)))
def stats(values):
 v=sorted(x for x in values if isinstance(x,(int,float)) and math.isfinite(x))
 if not v:return dict(n=0,min=None,median=None,p95=None,max=None,mean=None)
 return dict(n=len(v),min=v[0],median=statistics.median(v),p95=v[math.ceil(.95*len(v))-1],max=v[-1],mean=statistics.mean(v))
def csv_write(name,rows):
 keys=list(dict.fromkeys(k for r in rows for k in r))
 with (ROOT/name).open('w') as f:
  w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v for k,v in row.items()} for row in rows)
def contains(a,b):return any(a[i:i+len(b)]==b for i in range(len(a)-len(b)+1))
runs=[];allgaps=[];recoveries=[];asr_edits=[];endpoints=[];errors=[];unitrows=[]
for folder in sorted((ROOT/'runs').iterdir()):
 if not (folder/'review.json').exists():continue
 review=json.loads((folder/'review.json').read_text());d=json.loads((folder/'diagnostics.json').read_text());s=review['snapshot'];units=s['lanes']['en']['units'];items=d.get('recognitionAudit',{}).get('items',[]);trace=s.get('audioTrace',[]);blocks=d.get('pcmBlocks',[]);runid=review['runId'];a=s.get('acoustic',{});positions=s.get('positions',{});pending=d.get('pending',{});quality=d.get('voiceQuality',{});prov=d.get('voiceProvenance',{});feed=review.get('feedTiming',[])
 fullsource=len(feed)>0 and feed[-1]['frameEnd']==review['sourceReference']['samples'];allfinal=not any(i.get('commitAt') and 'final' not in i for i in items) and any('final' in i for i in items)
 rawEligible=fullsource and allfinal
 committedEligible=rawEligible and all(not i.get('final','').strip() or i.get('semanticFinalizedAt') is not None for i in items)
 eligible=rawEligible and committedEligible
 raw=score([(str(i['generation']),i.get('final','')) for i in items if 'final' in i]);committed=score([(u['id'],u['source']) for u in units])
 for stage,sc in [('raw',raw),('committed',committed)]:
  for edit in sc['edits']:asr_edits.append(dict(runId=runid,profile=review['profile'],stage=stage,eligibleForWER=rawEligible if stage=='raw' else committedEligible,**edit))
 counts=[pending.get(k) for k in ['receivedWords','committedWords','translatedWords','spokenWords']];equal=None not in counts and len(set(counts))==1
 submitted=[e for e in trace if e['type']=='ELEVENLABS_TEXT_SENT'];normalize_space=lambda text:re.sub(r'\s+',' ',text).strip()
 targetSubmissionMatches=normalize_space(' '.join(e.get('text','') for e in submitted))==normalize_space(' '.join(u.get('target','') for u in units if u.get('target')))
 controlViolations=[];attemptInRange=0;previousRecovery=None;lastFlushSamples=0
 for event in trace:
  if event['type']=='ELEVENLABS_TEXT_SENT':attemptInRange=0;previousRecovery=None
  elif event['type']=='ELEVENLABS_STARVATION_FLUSH':lastFlushSamples=event.get('receivedSamples',lastFlushSamples)
  elif event['type']=='ELEVENLABS_STALL_RECOVERY':
   attemptInRange+=1;reason=[]
   if attemptInRange>2 or event.get('recoveryAttempts')!=attemptInRange:reason.append('attempt_cap_or_reset')
   if event.get('pcmIdleMs',0)<750 or event.get('bufferMs',999)>250:reason.append('idle_or_buffer_gate')
   if attemptInRange==1 and event.get('receivedSamples',0)<=lastFlushSamples:reason.append('first_requires_pcm_progress')
   if previousRecovery and event.get('receivedSamples',0)<=previousRecovery.get('receivedSamples',0) and event['at']-previousRecovery['at']<1499:reason.append('no_progress_backoff')
   if reason:controlViolations.append(dict(at=event['at'],reasons=reason))
   previousRecovery=event;lastFlushSamples=event.get('receivedSamples',lastFlushSamples)
 queues=review['status']=='completed' and all(pending.get(k,0)==0 for k in ['pendingRecognition','pendingTranslation','pendingTTS','pendingPlayback','translationActiveRequests','translationReadyUnits','audioQueueJobs']) and all(u['status']=='spoken' for u in units) and positions.get('bufferMs',0)<=5 and a.get('complete',False)
 voiceok=prov.get('audiblePCMBlocks',0)>0 and prov.get('audiblePCMBlocks')==prov.get('verifiedIsabellaPCMBlocks') and prov.get('unverifiedPCMBlocks',0)==prov.get('alternateVoicePCMBlocks',0)==0
 rawpcm=array.array('h');rawpcm.frombytes((folder/'provider-pcm.pcm').read_bytes());receivedSamples=len(rawpcm);seq=[b.get('pcmBlockSequence') for b in blocks];contiguous=True;cursor=0
 for b in blocks:
  if b.get('firstSample')!=cursor:contiguous=False
  cursor=b.get('lastSample',cursor-1)+1
 # Distinguish PCM starvation from speechless samples inside already delivered PCM.
 # Render scheduled post-gain blocks with their recorded schedule. No synthesized
 # audio is added except zero-valued intervals where scheduler had no PCM.
 played=[b for b in blocks if b.get('playbackStartedAt') is not None]
 rendered_origin=min((b['playbackStartedAt'] for b in played),default=0);rendered=array.array('h')
 for b in played:
  length=b['lastSample']-b['firstSample']+1;when=round((b['playbackStartedAt']-rendered_origin)*24);end=when+length
  if end>len(rendered):rendered.extend(array.array('h',[0])*(end-len(rendered)))
  gain=b.get('gainApplied',1)
  for j,sample in enumerate(rawpcm[b['firstSample']:b['lastSample']+1]):rendered[when+j]=max(-32768,min(32767,round(sample*gain)))
 if rendered and not (folder/'rendered.wav').exists():
  with wave.open(str(folder/'rendered.wav'),'wb') as w:w.setparams((1,2,24000,0,'NONE','not compressed'));w.writeframes(rendered.tobytes())
 renderedSignalMs=0;tailSignalMs=0
 tailStart=a.get('epoch',0)+a.get('sourceSpeechEnd',0) if a.get('sourceSpeechEnd') is not None else None
 tailEnd=a.get('epoch',0)+a.get('targetPlaybackEnd',0) if a.get('complete') and a.get('targetPlaybackEnd') is not None else None
 for offset in range(0,len(rendered),480):
  window=rendered[offset:offset+480]
  if not window:continue
  if sum(sample*sample for sample in window)/len(window)>=(.005*32768)**2:
   renderedSignalMs+=len(window)/24
   if tailStart is not None and tailEnd is not None:tailSignalMs+=max(0,min(tailEnd,rendered_origin+(offset+len(window))/24)-max(tailStart,rendered_origin+offset/24))
 duplicated_blocks=[];seen={}
 for b in blocks:
  data=rawpcm[b['firstSample']:b['lastSample']+1].tobytes()
  if len(data)<960:continue
  digest=hashlib.sha256(data).hexdigest()
  if digest in seen:duplicated_blocks.append(dict(sequence=b['pcmBlockSequence'],matchesSequence=seen[digest]))
  seen[digest]=b['pcmBlockSequence']
 gaps=[]
 for index,g in enumerate(s.get('gaps',[]),1):
  start,end=g['gap_start'],g.get('gap_end');bounded=g.get('endedBy')=='audible_audio' and end is not None
  row=dict(runId=runid,profile=review['profile'],gapId=index,startAt=start,endAt=end,durationMs=g['gap_duration'],endedBy=g.get('endedBy'),bounded=bounded,exportedClassification=g.get('root_cause_classification'))
  if bounded:
   coverage=[]
   for candidate in played:
    left=max(start,candidate['playbackStartedAt']);right=min(end,candidate['playbackStartedAt']+(candidate['lastSample']-candidate['firstSample']+1)/24)
    if right>left:coverage.append((left,right))
   union=[]
   for left,right in sorted(coverage):
    if union and left<=union[-1][1]:union[-1]=(union[-1][0],max(right,union[-1][1]))
    else:union.append((left,right))
   covered=sum(right-left for left,right in union);row.update(scheduledPCMCoverageDuringGapMs=covered,noScheduledPCMDuringGapMs=max(0,g['gap_duration']-covered),coverageQualification='Orthogonal scheduler-timeline coverage; PCM-covered quiet and upstream waiting may overlap causal phases. Do not add coverage to phase sums.')
   possible=[b for b in blocks if b.get('playbackStartedAt') is not None and b['playbackStartedAt']>=start-150 and b['playbackStartedAt']<=end+150 and (b.get('playbackFinishedAt') or b['playbackStartedAt']+b.get('samples',0)/24)>=end-150]
   block=min(possible,key=lambda b:abs(b['playbackStartedAt']-end)) if possible else None
   unit=next((u for u in units if block and u['id'] in block.get('unitIds',[])),None)
   if block and unit:
    t=unit['timing'];item=next((i for i in items if unit['id'] in i.get('semanticUnitIds',[])),{});sends=[e for e in trace if e['type']=='ELEVENLABS_TEXT_SENT' and unit['id'] in e.get('unitIds',[])];sent=sends[0]['at'] if sends else None
    pcm=next((e for e in trace if e['type']=='voice.pcm_received' and e.get('totalSamples')==block['lastSample']+1),None);partialAt=next((p['at'] for p in item.get('partials',[]) if contains(tokens(p['text']),tokens(unit['source']))),None)
    retainedPartialAt=partialAt
    # A later retained cumulative partial cannot override an earlier proven
    # semantic commitment; early raw history may have been evicted.
    if partialAt is not None and partialAt>t['source_stable_at']+.1:partialAt=None
    row.update(unitId=unit['id'],precision=unit['precision'],resumingBlock=block['pcmBlockSequence'],resumingBlockUnitIds=block.get('unitIds',[]),sharedBlockOwnership=len(block.get('unitIds',[]))>1,phaseAttributionQualification='First metadata owner of shared block; exact audible word ownership unavailable' if len(block.get('unitIds',[]))>1 else 'Single metadata owner; source word-acoustic alignment still unavailable',localCommitAt=item.get('commitAt'),providerFinalAt=item.get('finalAt'),semanticCommitAt=t.get('source_stable_at'),translationStartAt=t.get('translation_started'),translationFirstTextAt=t.get('translation_first_text'),translationReadyAt=t.get('translation_ready'),actualTextSentAt=sent,firstCompleteRawWordsAt=partialAt,firstRetainedCompleteWordsAt=retainedPartialAt,rawAvailabilityBeforeCommitUnresolved=partialAt is None,rawPartialsEvicted=item.get('droppedPartials',0),nextClientPCMAt=pcm['at'] if pcm else None,scheduledAt=block['scheduledAt'])
    row['PCMObservationAfterAudibleResumeMs']=max(0,pcm['at']-end) if pcm else None
    row['clockDisagreement']=bool(pcm and pcm['at']>end+1)
    row['clockQualification']='Client PCM observation follows measured audible resume; device-output/performance mapping disagreement. Phase is clipped at measured resume; do not interpret sub-difference phase precision or claim early audio before PCM.' if row['clockDisagreement'] else 'Browser performance milestones with mapped renderer audible timing; ordinary output-clock uncertainty remains.'
    for key,at in [('afterA_observedWordsMs',partialAt),('afterB_validatedSourceMs',t.get('source_stable_at')),('afterC_targetReadyMs',t.get('translation_ready')),('afterD_textSentMs',sent)]:row[key]=max(0,end-max(start,at)) if at is not None else None
    checkpoints=[(start,'start')]
    def mark(at,kind):
     if at is not None and min(at,end)>checkpoints[-1][0]:checkpoints.append((min(at,end),kind))
    continuation=t.get('playback_started',end)>=0 and t.get('playback_started',end)<start-150
    if pcm and continuation:mark(pcm['at'],'ELEVENLABS_STALL')
    elif pcm:
     if len(item.get('semanticUnitIds',[]))==1:mark(item.get('lastVoiceAt'),'SOURCE_OR_ASR_READINESS');mark(item.get('commitAt'),'LOCAL_ENDPOINT_DELAY')
     mark(partialAt,'ASR_PARTIAL_DELAY')
     if unit.get('stabilityReason')=='provider_final':mark(item.get('finalAt'),'PROVIDER_FINAL_DELAY')
     for key,kind in [('source_stable_at','SOURCE_READINESS_OR_COMMITMENT_UNRESOLVED' if partialAt is None else 'SEMANTIC_COMMITMENT'),('translation_started','TRANSLATION_QUEUE'),('translation_ready','TRANSLATION_PROVIDER'),('translation_consumed','ORDERED_WAIT')]:mark(t.get(key),kind)
     mark(sent,'TTS_TEXT_NOT_SENT');mark(pcm['at'],'ELEVENLABS_WAITING_FOR_PCM')
    if pcm:
     mark(block.get('scheduledAt'),'VERIFICATION_AND_SCHEDULING');checkpoints.append((end,'SCHEDULER_OR_PCM_SIGNAL_PADDING'))
     row['phases']=[dict(stage=checkpoints[j][1],startAt=checkpoints[j-1][0],endAt=checkpoints[j][0],ms=checkpoints[j][0]-checkpoints[j-1][0]) for j in range(1,len(checkpoints)) if checkpoints[j][0]>checkpoints[j-1][0]];row['phaseSumMs']=sum(p['ms'] for p in row['phases']);assert abs(row['phaseSumMs']-row['durationMs'])<.01
     dominant=max(row['phases'],key=lambda p:p['ms']);row['dominantObservedPhase']=dominant['stage']
   if not block:row['dominantObservedPhase']='WITHIN_PCM_SILENCE_OR_UNRESOLVED_BLOCK_MAPPING'
  gaps.append(row);allgaps.append(row)
 for e in [e for e in trace if e['type']=='ELEVENLABS_STALL_RECOVERY']:
  prev=max((p for p in trace if p['type']=='voice.pcm_received' and p['at']<e['at']),key=lambda p:p['at'],default=None);nxt=next((p for p in trace if p['type']=='voice.pcm_received' and p['at']>e['at']),None);flush=next((p for p in trace if p['type']=='voice.provider_flush_sent' and p.get('reason')=='provider_stall' and p['at']>e['at']),None);ack=next((p for p in trace if p['type']=='VOICE_FLUSH_CONFIRMED' and p.get('reason')=='provider_stall' and p['at']>e['at']),None)
  recovery=dict(runId=runid,profile=review['profile'],at=e['at'],attempt=e.get('recoveryAttempts'),pcmIdleMs=e.get('pcmIdleMs'),bufferMs=e.get('bufferMs'),pendingCharacters=e.get('pendingCharacters'),receivedSamples=e.get('receivedSamples'),lastPCMAt=prev['at'] if prev else None,nextPCMAt=nxt['at'] if nxt else None,responseMs=nxt['at']-e['at'] if nxt else None,gatewayFlushObservedAt=flush['at'] if flush else None,gatewayACKObservedAt=ack['at'] if ack else None,providerACK=None,PCMWithin1s=bool(nxt and nxt['at']-e['at']<=1000),PCMWithin2s=(nxt['at']-e['at']<=2000) if nxt else (False if d['endedAt']-e['at']>=2000 else None),followupMs=d['endedAt']-e['at']);recoveries.append(recovery)
 # Browser-observed diagnostics and server clock fields retained separately.
 lifecycle=d.get('recognitionLifecycle',[])
 for item in items:
  g=item['generation'];events=[e for e in lifecycle if e['data'].get('generation')==g];get=lambda name:next((e for e in events if e['event']==name),None)
  sent=get('recognition.commit_sent');ack=get('recognition.commit_acknowledged');completed=get('recognition.provider_completed');delivered=get('recognition.final_delivered')
  endpoint=dict(runId=runid,generation=g,lastVoiceAt=item.get('lastVoiceAt'),localCommitAt=item.get('commitAt'),providerFinalAt=item.get('finalAt'),semanticFinalizedAt=item.get('semanticFinalizedAt'),localCommitToFinalMs=item['finalAt']-item['commitAt'] if item.get('finalAt') and item.get('commitAt') else None,commitSentBrowserObservedAt=sent['at'] if sent else None,ackBrowserObservedAt=ack['at'] if ack else None,completedBrowserObservedAt=completed['at'] if completed else None,deliveredBrowserObservedAt=delivered['at'] if delivered else None,commitToCompleteServerMs=completed['data']['providerAt']-sent['data']['providerAt'] if sent and completed else None,ackToCompleteServerMs=completed['data']['providerAt']-ack['data']['providerAt'] if ack and completed else None,fullFinalTextFirstPartialAt=next((p['at'] for p in item.get('partials',[]) if item.get('final') and tokens(p['text'])==tokens(item['final'])),None),samples=item['samples'],gatewaySamples=item.get('gatewaySamples'),droppedPartials=item.get('droppedPartials',0),inputClippedSamples=item['clippedSamples']);endpoints.append(endpoint)
 for unit in units:
  item=next((i for i in items if unit['id'] in i.get('semanticUnitIds',[])),{})
  unitrows.append(dict(runId=runid,profile=review['profile'],unitId=unit['id'],source=unit['source'],target=unit.get('target'),status=unit['status'],precision=unit['precision'],stabilityReason=unit.get('stabilityReason'),generation=item.get('generation'),rawProviderFinal=item.get('final'),rawProviderFinalAt=item.get('finalAt'),localCommitAt=item.get('commitAt'),rawPartialHistoryDropped=item.get('droppedPartials',0),**unit.get('timing',{})))
 bounded=[g for g in gaps if g['bounded']];gapvalues=[g['durationMs'] for g in bounded if g['durationMs']>=500];checks=dict(firstAudioLE5s=a.get('firstAudioLatency') is not None and a['firstAudioLatency']<=5000,noReadyTextGapGT2s=all(g.get('afterB_validatedSourceMs') is not None and g['afterB_validatedSourceMs']<=2000 for g in bounded if g['durationMs']>2000),rawASRNoErrors=rawEligible and raw['WER']==0,committedASRNoErrors=committedEligible and committed['WER']==0,oneVoiceConnection=positions.get('voiceConnections')==1,provenance=voiceok,zeroOutputClipping=quality.get('clippingEvents')==0,zeroPeakProtection=quality.get('peakProtectionEvents')==0,pipelineEquality=equal,queueDrain=queues,targetTextSubmittedExactlyOnce=targetSubmissionMatches,recoveryControlGuards=not controlViolations,sampleDrain=review['status']=='completed' and positions.get('targetSamples')==positions.get('playbackSamples'),fullSourceDelivered=fullsource,allProviderFinals=allfinal,speedPreserved=quality.get('effectiveSpeedSetting')==.95,requestedGainPreserved=quality.get('requestedGain')==3.5573605757216837)
 run=dict(runId=runid,sessionId=d['sessionId'],profile=review['profile'],status=review['status'],error=review['error'],rootReason=d.get('reason'),testTransport=review.get('testTransport','direct Vite frontend'),eligibleForWER=eligible,eligibleForRawWER=rawEligible,eligibleForCommittedWER=committedEligible,fullSourceDelivered=fullsource,referenceWords=67,providerFinalItems=sum('final' in i and bool(i['final'].strip()) for i in items),questionSeparateProviderItem=any(tokens(i.get('final',''))[:4]==['is','it','okay','for'] for i in items),rawWER=raw['WER'] if rawEligible else None,rawS=raw['S'] if rawEligible else None,rawD=raw['D'] if rawEligible else None,rawI=raw['I'] if rawEligible else None,committedWER=committed['WER'] if committedEligible else None,committedS=committed['S'] if committedEligible else None,committedD=committed['D'] if committedEligible else None,committedI=committed['I'] if committedEligible else None,firstAudioMs=a.get('firstAudioLatency'),tailMs=a.get('tailLatency'),signedTailMs=a.get('rawSignedTailLatency'),leadMs=a.get('targetAudioLead'),largestGapMs=max(gapvalues,default=None),largestObservedGapMs=max((g['durationMs'] for g in gaps),default=None),largestTerminalGapMs=max((g['durationMs'] for g in gaps if g.get('endedBy')=='STOP'),default=None),terminalCensoredGaps=sum(g.get('endedBy')=='STOP' for g in gaps),medianGapMs=stats(gapvalues)['median'],p95GapMs=stats(gapvalues)['p95'],boundedGaps=len(bounded),gapsGT1s=sum(g>1000 for g in gapvalues),gapsGT2s=sum(g>2000 for g in gapvalues),unmappedGapsGT2s=sum(g['durationMs']>2000 and not g.get('phases') for g in bounded),ordinaryReadyGapsGT1s=sum(not g.get('precision',True) and (g.get('afterB_validatedSourceMs') or 0)>1000 for g in bounded),underruns=positions.get('underruns'),underrunMs=positions.get('underrunMs'),voiceConnections=positions.get('voiceConnections'),audiblePCMBlocks=prov.get('audiblePCMBlocks'),verifiedIsabellaPCMBlocks=prov.get('verifiedIsabellaPCMBlocks'),unverifiedPCMBlocks=prov.get('unverifiedPCMBlocks'),alternatePCMBlocks=prov.get('alternateVoicePCMBlocks'),outputClipping=quality.get('clippingEvents'),peakProtection=quality.get('peakProtectionEvents'),gain=quality.get('gainApplied'),minAppliedGain=min((b.get('gainApplied',1) for b in blocks),default=None),maxAppliedGain=max((b.get('gainApplied',1) for b in blocks),default=None),postGainPeak=quality.get('postGainPeak'),speed=quality.get('effectiveSpeedSetting'),received=counts[0],committed=counts[1],translated=counts[2],spoken=counts[3],pipelineEquality=equal,queueDrain=queues,renderedSignalMs=renderedSignalMs,renderedDurationMs=len(rendered)/24,rendererTimelineTailSignalEstimateMs=tailSignalMs if tailEnd is not None else None,submittedInputSeconds=sum(i['samples'] for i in items)/24000,ttsCharacters=positions.get('ttsCharacters',0),providerSamples=receivedSamples,pcmCoverageComplete=cursor==receivedSamples,pcmSequencesContiguous=seq==list(range(len(seq))),playedSamples=positions.get('playbackSamples'),recoveryAttempts=sum(r['runId']==runid for r in recoveries),secondRecoveries=sum(r['runId']==runid and r['attempt']==2 for r in recoveries),droppedDiagnosticEvents=d.get('droppedEvents',0),droppedRawPartials=sum(i.get('droppedPartials',0) for i in items),droppedRecognitionLifecycle=d.get('droppedRecognitionLifecycle',0),droppedVoiceLifecycle=d.get('droppedVoiceLifecycle',0),maxFeedLateMs=max((f['lateMs'] for f in feed),default=None),meanFeedLateMs=statistics.mean(f['lateMs'] for f in feed) if feed else None,contiguousPCM=contiguous,targetTextSubmittedExactlyOnce=targetSubmissionMatches,recoveryGuardViolations=len(controlViolations),duplicatePCMBlocks=len(duplicated_blocks),wallDurationMs=review['wallDurationMs'],checks=checks,allAutomatedChecksPass=all(checks.values()))
 run['harnessStatus']=review['status']
 run['verifiedDrain']=bool(review['status']=='completed' and queues and equal and checks['sampleDrain'])
 run['completionQualification']='verified_pipeline_and_sample_drain' if run['verifiedDrain'] else ('harness_completion_rejected_final_unit_interrupted' if review['status']=='completed' else 'failed_or_operationally_interrupted')
 run['observedTailMs']=run['tailMs']
 run['tailRightCensored']=review['status']=='completed' and not run['verifiedDrain']
 if not run['verifiedDrain']:run['tailMs']=None;run['signedTailMs']=None
 runs.append(run)
 detail=dict(**run,rawProviderScore=raw,committedScore=committed,WERQualification='Raw WER requires full source and all finals. Committed WER additionally requires semantic finalization. Output failures do not censor complete ASR evidence; incomplete ASR scores remain diagnostic only.',gaps=gaps,recoveries=[r for r in recoveries if r['runId']==runid],endpointChronology=[e for e in endpoints if e['runId']==runid],duplicateBlocks=duplicated_blocks,recoveryGuardViolationsDetail=controlViolations,tailBreakdown=d.get('latencyBreakdown',{}).get('tailBreakdown'),reference=reference,rawProviderFinals=[i.get('final') for i in items if 'final' in i],committedSource=[u['source'] for u in units],target=[u.get('target') for u in units],sourceTimingQualification='Synthetic replay delivery timestamps; no OS microphone DSP, acoustic input delay or headphone output measurement.',allGapSumsVerified=True)
 (folder/'analysis.json').write_text(json.dumps(detail,indent=2,ensure_ascii=False)+'\n')
 if review['error']:errors.append(dict(runId=runid,profile=review['profile'],error=review['error'],rootReason=d.get('reason')))
summary=dict(status='NOT ACCEPTED — AUTOMATED LIVE EVIDENCE ONLY',batchId=cfg['batchId'],requested=100,recorded=len(runs),completed=sum(r['status']=='completed' for r in runs),failed=sum(r['status']!='completed' for r in runs),eligibleForWER=sum(r['eligibleForWER'] for r in runs),automatedChecksPass=sum(r['allAutomatedChecksPass'] for r in runs),metrics={k:stats(r.get(k) for r in runs) for k in ['firstAudioMs','tailMs','largestGapMs','rawWER','committedWER','underrunMs','maxFeedLateMs']},checkCounts={k:sum(r['checks'][k] for r in runs) for k in (runs[0]['checks'] if runs else [])},gapStats=stats(g['durationMs'] for g in allgaps if g['bounded'] and g['durationMs']>=500),gapsGT2s=sum(g['bounded'] and g['durationMs']>2000 for g in allgaps),recoveryCount=len(recoveries),secondRecoveryCount=sum(r['attempt']==2 for r in recoveries),recoveryResponseMs=stats(r['responseMs'] for r in recoveries),recoveryNextPCMWithin2s=sum(r['PCMWithin2s'] is True for r in recoveries),recovery2sWindowObserved=sum(r['PCMWithin2s'] is not None for r in recoveries),recoveryNoSubsequentPCM=sum(r['nextPCMAt'] is None for r in recoveries),endpointsCommitToFinalMs=stats(e['localCommitToFinalMs'] for e in endpoints),errors=errors,limitations=cfg['limitations'],profiles={})
summary['terminalCensoredGapStats']=stats(g['durationMs'] for g in allgaps if g.get('endedBy')=='STOP')
summary['unboundedGapEndings']=dict(Counter(g.get('endedBy') or 'open' for g in allgaps if not g['bounded']))
summary['usageEvidence']=dict(submittedInputSeconds=sum(r['submittedInputSeconds'] for r in runs),ttsCharacters=sum(r['ttsCharacters'] for r in runs),voiceConnections=sum(r['voiceConnections'] or 0 for r in runs),providerPCMSamples=sum(r['providerSamples'] for r in runs),actualProviderBillingCost=None)
summary['voiceEvidence']=dict(audiblePCMBlocks=sum(r['audiblePCMBlocks'] or 0 for r in runs),verifiedIsabellaPCMBlocks=sum(r['verifiedIsabellaPCMBlocks'] or 0 for r in runs),unverifiedPCMBlocks=sum(r['unverifiedPCMBlocks'] or 0 for r in runs),alternatePCMBlocks=sum(r['alternatePCMBlocks'] or 0 for r in runs),outputClipping=sum(r['outputClipping'] or 0 for r in runs),peakProtection=sum(r['peakProtection'] or 0 for r in runs))
summary['failureRootReasons']=dict(Counter(error['rootReason'] for error in errors))
summary['recognitionSegmentation']=dict(providerFinalItemCounts=dict(Counter(r['providerFinalItems'] for r in runs if r['fullSourceDelivered'])),separateQuestionItems=sum(r['questionSeparateProviderItem'] for r in runs))
summary['harnessCompletedMetrics']={k:stats(r.get(k) for r in runs if r['status']=='completed') for k in ['firstAudioMs','tailMs','largestGapMs','rawWER','committedWER','underrunMs','maxFeedLateMs']}
summary['verifiedDrained']=sum(r['verifiedDrain'] for r in runs)
summary['harnessCompletionRejected']=sum(r['status']=='completed' and not r['verifiedDrain'] for r in runs)
summary['harnessCompletionRejectedRunIds']=[r['runId'] for r in runs if r['status']=='completed' and not r['verifiedDrain']]
summary['completedMetrics']={k:stats(r.get(k) for r in runs if r['verifiedDrain']) for k in ['firstAudioMs','tailMs','largestGapMs','rawWER','committedWER','underrunMs','maxFeedLateMs']}
summary['completedCheckCounts']={k:sum(r['checks'][k] for r in runs if r['status']=='completed') for k in runs[0]['checks']}
summary['verifiedFirstAudioLE5s']=sum(r['verifiedDrain'] and r['checks']['firstAudioLE5s'] for r in runs)
summary['firstPostGreetingGapMs']=stats(next((g['durationMs'] for g in allgaps if g['runId']==r['runId'] and g['bounded']),None) for r in runs if r['verifiedDrain'])
summary['firstPostGreetingGapsGT2s']=sum(next((g['durationMs'] for g in allgaps if g['runId']==r['runId'] and g['bounded']),0)>2000 for r in runs if r['verifiedDrain'])
summary['recognitionUnits']=len(unitrows)
summary['clockDisagreementGaps']=sum(g.get('clockDisagreement',False) for g in allgaps)
summary['gapsGT1s']=sum(g['bounded'] and g['durationMs']>1000 for g in allgaps)
summary['longGapDominantPhases']=dict(Counter(g.get('dominantObservedPhase','unresolved') for g in allgaps if g['bounded'] and g['durationMs']>2000))
summary['longGapAfterValidatedSourceGT2s']=sum(g['bounded'] and g['durationMs']>2000 and (g.get('afterB_validatedSourceMs') or 0)>2000 for g in allgaps)
summary['underrunCount']=sum(r['underruns'] or 0 for r in runs)
summary['tailBreakdownVerifiedStats']={key:stats(json.loads((ROOT/'runs'/r['runId']/'diagnostics.json').read_text()).get('latencyBreakdown',{}).get('tailBreakdown',{}).get(key) for r in runs if r['verifiedDrain']) for key in ['sourceEndToFinalCommit','translationQueue','finalTranslation','orderedWait','ttsWait','ttsGeneration','finalPlayback','totalTail']}
summary['transportGroups']={name:dict(attempts=sum(r['testTransport']==name for r in runs),completed=sum(r['testTransport']==name and r['status']=='completed' for r in runs)) for name in set(r['testTransport'] for r in runs)}
summary['translationAttempts']=sum(sum(e['event']=='translation.attempt_started' for e in json.loads((ROOT/'runs'/r['runId']/'diagnostics.json').read_text()).get('translationLifecycle',[])) for r in runs)
summary['productionFingerprintMatches']=all(hashlib.sha256(Path(name).read_bytes()).hexdigest()==digest for name,digest in cfg['productionFingerprints'].items())
for profile in cfg['sources']:
 rr=[r for r in runs if r['profile']==profile['id']];summary['profiles'][profile['id']]=dict(n=len(rr),completed=sum(r['status']=='completed' for r in rr),metrics={k:stats(r.get(k) for r in rr) for k in ['firstAudioMs','tailMs','largestGapMs','rawWER','committedWER']})
for stage in ['raw','committed']:
 qualified=[r for r in runs if r['eligibleForRawWER' if stage=='raw' else 'eligibleForCommittedWER']];summary[stage+'WeightedWER']=dict(referenceWords=67*len(qualified),S=sum(r[stage+'S'] for r in qualified),D=sum(r[stage+'D'] for r in qualified),I=sum(r[stage+'I'] for r in qualified),WER=sum(r[stage+'WER'] for r in qualified)/len(qualified) if qualified else None)
(ROOT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n');csv_write('runs.csv',runs);csv_write('all-gaps.csv',allgaps);csv_write('recovery-events.csv',recoveries);csv_write('asr-errors.csv',asr_edits);csv_write('endpoint-chronology.csv',endpoints);csv_write('recognition-units.csv',unitrows)
print(json.dumps({k:summary[k] for k in ['recorded','completed','failed','eligibleForWER','automatedChecksPass','recoveryCount','secondRecoveryCount']},indent=2))
# Report remains provisional until all 100 attempts have evidence. No production
# decision or physically proven improvement can be inferred from this batch.
lines=[]
def line(text=''):lines.append(text)
def fmt(value,scale=1):return 'unavailable' if value is None else f'{value*scale:.3f}'
line('STAGE 1.9.6: NOT ACCEPTED — AUTOMATED LIVE TEST REPORT')
line('Batch '+cfg['batchId']);line(f"Requested 100 attempts; recorded {len(runs)}; harness-marked completed {summary['completed']}; verified drained {summary['verifiedDrained']}; rejected harness completion {summary['harnessCompletionRejected']}; failed/interrupted {summary['failed']}; WER-eligible {summary['eligibleForWER']}.")
line('Verified-drain-run medians: first audio '+fmt(summary['completedMetrics']['firstAudioMs']['median'])+'ms; tail '+fmt(summary['completedMetrics']['tailMs']['median'])+'ms; largest gap '+fmt(summary['completedMetrics']['largestGapMs']['median'])+'ms. Raw/committed eligible WER '+fmt(summary['rawWeightedWER']['WER'],100)+'% / '+fmt(summary['committedWeightedWER']['WER'],100)+'%. Second recovery controls observed '+str(summary['secondRecoveryCount'])+'.')
line('PROVISIONAL: batch incomplete.' if len(runs)<100 else '100 authorized attempts recorded. No additional attempts launched.')
line('Live OpenAI recognition/translation and ElevenLabs output; real-time synthetic English source; silent real-time browser renderer. No physical microphone, OS microphone DSP, headphone listening, natural human speech or external acoustic loopback. Physical acceptance remains pending regardless of automated outcome.')
line('\nMETHOD AND AUTHORIZATION')
line('User authorized up to 100 live/provider tests. Exactly one active test at a time; maxAttempts=100 enforced by collector. New independent recognition/voice connections between runs are normal; one persistent voice connection is required within each run. Internal production translation retries and precision recognition remain enabled unchanged. No reference text was added to provider ASR prompts/context/hints or source repair.')
line('Scope: English->Danish short consent only. This does not cover sustained166-word human speech, Danish->English, interruptions, room noise or arbitrary call content.')
line('Five offline macOS source profiles, rotated in order: Samantha 150/180/210 wpm, Daniel180 and Karen180; twenty planned attempts/profile. Each speaks the same 67-word short consent reference, with natural synthesized punctuation. Fixed 500ms leading and 2000ms trailing PCM silence frame test boundaries, not artificially spaced sentences. Repeated synthetic fixtures do not represent 100 independent callers or broad language coverage.')
line('Source PCM is injected at the existing LocalTestSession microphone dependency boundary in 100ms realtime packets. Capture timing, frames and dispatch lateness are retained. Production recognition/semantic/translation/voice/renderer implementations are used unchanged. The silent audio sink preserves renderer scheduling, speed, calibrated gain and signal measurement, but no physical headphone emission occurs.')
line('After setup/translation availability failures around attempts019–024, new attempts were operationally paused, local health and non-billable provider connectivity were checked, and the test collector gained a 60s cooldown after three consecutive infrastructure failures. Failed attempts remain in the100 limit. Attempt025 was stopped by the assistant during this operational pause; its raw harness error says User stopped batch, which is not a claim that the user canceled the request. OpenAI models returned200; ElevenLabs user metadata returned missing_permissions with its restricted key, which does not diagnose TTS authorization. No credential permission or production configuration was changed.')
line('Attempts 001/002 used the direct Vite development frontend; recognition and development-server connections dropped and the page reset. Backend PID remained unchanged. Their failed artifacts are retained, not silently retried/replaced. Subsequent attempts use an isolated localhost evidence proxy with explicit WebSocket close logging and no injected Vite HMR page. This adds a local transport hop; its overhead and synthetic input prevent strict physical before/after claims. The evidence supports an environment/development-transport problem in the first two; exact internal cause remains unproven.')
line('Source generation preflight rejected empty sandbox-generated WAV files before any provider call. Valid source audio was generated locally using installed voices; no paid source-TTS calls were required. Source hashes and production fingerprints are in config.json.')
line('\nFROZEN SETTINGS')
line(json.dumps(cfg['settings'],indent=2,ensure_ascii=False))
line('Recognition/transcription parameters, translation models, precision/consent logic, greeting behavior, provenance safeguards and playback buffers are unchanged. No production edit, commit, PR or deployment was performed for this batch.')
line('\nEXACT SOURCE REFERENCE (67 words)');line(reference)
line('\nSOURCE PROFILES')
for source in cfg['sources']:line(f"{source['id']}: {source['voice']}, {source['rate']}wpm, {source['durationMs']/1000:.3f}s including framing silence, SHA256 {source['sha256']}")
line('\nLIVE RESULTS — DESCRIPTIVE, NOT PHYSICAL ACCEPTANCE')
line('Nearest-rank p95; median is ordinary sample median. First/tail statistics use available values; failed run first-audio values remain visible. Null tails are excluded and their counts are reported. Complete-run and profile tables allow separate inspection. Raw recognition accuracy requires full source and all provider finals; committed accuracy additionally requires semantic finalization. TTS/translation failures do not discard otherwise complete ASR evidence.')
line('metric | n | minimum | median | p95 | maximum | mean')
for key,value in summary['metrics'].items():line(key+' | '+str(value['n'])+' | '+' | '.join(fmt(value[k],100 if 'WER' in key else 1) for k in ['min','median','p95','max','mean'])+(' (%)' if 'WER' in key else ' (ms)'))
line('Verified-drain-run-only statistics:')
for key,value in summary['completedMetrics'].items():line(key+' | '+str(value['n'])+' | '+' | '.join(fmt(value[k],100 if 'WER' in key else 1) for k in ['min','median','p95','max','mean'])+(' (%)' if 'WER' in key else ' (ms)'))
line('Failure root reasons from diagnostics (separate from surface exceptions): '+json.dumps(summary['failureRootReasons']))
line('Transport groups: '+json.dumps(summary['transportGroups'])+'; recorded translation attempts='+str(summary['translationAttempts'])+'. This is request evidence, not a provider billing statement; actual costs are unavailable.')
line('Production fingerprints match: '+str(summary['productionFingerprintMatches']))
line('Completion audit: '+str(summary['verifiedDrained'])+' verified pipeline/sample drains; '+str(summary['harnessCompletionRejected'])+' harness-marked completions rejected: '+','.join(summary['harnessCompletionRejectedRunIds'])+'. Each rejected run ended 67 received /67 committed /67 translated /55 spoken; its final12-word question unit was interrupted at cleanup. All received samples had rendered and the acoustic complete/engine idle/buffer criteria had become true, but the unit was not credited as spoken. No proof of all final words acoustically spoken is possible from these counters; this is not counted as successful pipeline completion. The harness failed to require equality/all unit states before stopping. Production engine.idle checks worker and queue activity, not every unit completion callback; localSession.end then marks the remaining unit interrupted. This is a harness stopping-condition/production completion-accounting mismatch, not proof that only55 words were audible. No reruns or production changes were made. Affected exported tail values are retained as observedTailMs; primary tailMs is null/censored for them.')
line('The9 explicitly failed/interrupted attempts plus7 rejected completions leave84 verified drains out of100. Original status/error fields and progress ledger remain unchanged; verifiedDrain/completionQualification supply the forensic classification. First-audio and bounded-gap observations from all runs remain retained, with denominators explicit.')
line('Early greeting release: first following bounded-gap statistics among verified drains (ms): '+json.dumps(summary['firstPostGreetingGapMs'])+'; gaps >2s: '+str(summary['firstPostGreetingGapsGT2s'])+'/'+str(summary['verifiedDrained'])+'. Early first audio therefore coexists with a following starvation/wait gap. This batch has no matched candidate without comma-prefix release, so it cannot establish that the release caused or reduced that following gap.')
line('Long-gap dominant observed phases: '+json.dumps(summary['longGapDominantPhases'])+'; gaps with >2000ms after validated source commitment: '+str(summary['longGapAfterValidatedSourceGT2s'])+'. Total bounded gaps >1s: '+str(summary['gapsGT1s'])+'; renderer underrun events: '+str(summary['underrunCount'])+'.')
line('Verified-drain tail phase statistics (ms; stages may overlap earlier work; medians are not additive): '+json.dumps(summary['tailBreakdownVerifiedStats']))
line('Renderer underruns and detected audible gaps are distinct measurements; neither is substituted for the other. Tail is source signal end -> final target signal end; target lead and raw signed tail remain separate.')
line('\nBY PROFILE: completed/attempted; medians first audio / tail / largest gap (ms); raw/committed WER (%)')
for name,profile in summary['profiles'].items():
 metrics=profile['metrics'];line(f"{name}: {profile['completed']}/{profile['n']} | "+' / '.join(fmt(metrics[k]['median'],100 if 'WER' in k else 1) for k in ['firstAudioMs','tailMs','largestGapMs','rawWER','committedWER']))
line('\nCHECK COUNTS (number of recorded attempts satisfying each check)')
for key,value in summary['checkCounts'].items():line(f'{key}: {value}/{len(runs)}')
line('allAutomatedChecksPass is deliberately strict and is not an acceptance declaration; it also requires zero ASR errors for this synthetic script. No-ready-text-gap >2s check requires every retained >2s gap to have known attribution and <=2000ms after validated source commitment; unknown attribution fails that check. Unknown/missing phase attribution cannot establish an unconditional continuity pass; inspect all-gaps.csv and per-run analysis.')
line('\nRAW-PROVIDER AND COMMITTED ASR')
for stage in ['raw','committed']:
 value=summary[stage+'WeightedWER'];line(stage+': '+json.dumps(value))
line('Scoring: global word Levenshtein, NFKC/case/apostrophe/punctuation normalization only; no campaign/brand correction in scoring. Separate S/D/I are in runs.csv and asr-errors.csv. Incomplete source or missing finals censor raw WER; incomplete semantic finalization censors committed WER; their per-run diagnostic scores are retained but not presented as recognition accuracy. Local protected-name precision re-recognition is existing production behavior; raw-provider and committed scores remain separate.')
line('Calling/on/behalf and the first missing information position are assessed by full edit alignment, not by counting later occurrences of information. Every available raw partial/final and committed semantic unit is retained in diagnostics/review; dropped partial/event counts are explicit. Synthetic WER cannot demonstrate that the previous human speaker deletions were fixed.')
line('\nCONTINUITY AND PHASE ATTRIBUTION')
line(f"Retained bounded gaps >=500ms: {summary['gapStats']['n']}; >2s: {summary['gapsGT2s']}; gap duration statistics: "+json.dumps(summary['gapStats']))
line('Every retained gap appears in all-gaps.csv and its run analysis.json. For mapped transitions: previous audible end -> source/partial/local endpoint -> provider final -> semantic commitment -> translation -> ordered consumption -> actual TTS submission -> client PCM -> verification/scheduling -> audible resume. Durations are clipped to each gap and sum back to its measured duration. Earlier stages can overlap preceding output. A complete raw partial is not a stability guarantee; without word-acoustic alignment, exact irreducibly unavoidable source time remains unknown.')
line('Terminal/censored quiet intervals are not discarded: '+json.dumps(summary['terminalCensoredGapStats'])+'; non-bounded endings '+json.dumps(summary['unboundedGapEndings'])+'. A STOP-ended gap is a lower bound until cancellation, not a successfully completed transition or a zero tail. Complete rows remain in all-gaps.csv.')
line('Continuation gaps with validated submitted text and no new PCM are classified as provider-path stalls. Server providerAt clock is preserved separately; browser/server absolute timestamps are never subtracted. This distinguishes generation/transport waiting from browser scheduling without guessing provider internals. Unmatched gaps are labeled within-PCM silence or unresolved block mapping, not automatically assigned to ElevenLabs or ASR.')
line('renderedSignalMs measures >=.005 RMS/20ms positive-energy windows in reconstructed post-gain output; it is not forced-aligned spoken-word duration. rendererTimelineTailSignalEstimateMs intersects those windows with the reported tail on the scheduler timeline, which can differ slightly from the output-timestamp mapping. It is an approximate digital signal-duration diagnostic, not a replacement tail or an exact unavoidable-speech estimate.')
line('A PCM block can span multiple semantic units. Shared-block ownership is flagged explicitly; the primary phase chain follows its first retained metadata owner and is not an acoustic forced alignment. The original diagnostics preserve all possible unit owners. Phase attribution cannot identify a specific spoken word inside a shared block without character alignment or human review.')
line('Clock-disagreement gaps: '+str(summary['clockDisagreementGaps'])+'. Client PCM observations can follow measured audible resume because output/performance clock mapping disagrees. Each row preserves PCMObservationAfterAudibleResumeMs and flags clockDisagreement. Critical waiting phases are clipped at the measured end, not mislabeled as renderer padding; exact final delivery/verification subphases cannot be resolved in those intervals. Scheduler coverage remains independently inspectable.')
line('Scheduled-PCM coverage is also measured for every bounded gap. PCM-covered quiet is distinguished from intervals with no scheduled PCM. These are orthogonal to source/translation/provider critical-path phases and must not be added to those sums. No-scheduled-PCM alone does not prove provider starvation if validated source/target was not yet ready.')
line('For >=2s gaps, afterA/B/C/D columns give time after complete observed words, validated source commitment, target readiness and actual text submission. A may be unavailable if early raw partials were evicted; a later cumulative partial is never used to claim the words were unavailable after proven semantic commitment. firstRetainedCompleteWordsAt is preserved separately; missing data is not reconstructed from screenshots or reference words.')
line('\nRESIDUAL RECOVERY')
line(f"Observed controls: {summary['recoveryCount']}; second attempts: {summary['secondRecoveryCount']}; next PCM within 2s: {summary['recoveryNextPCMWithin2s']}; response latency statistics: "+json.dumps(summary['recoveryResponseMs']))
line('Observed2s response windows: '+str(summary['recovery2sWindowObserved'])+'; no subsequent PCM before run end: '+str(summary['recoveryNoSubsequentPCM'])+'. Short follow-up is right-censored, not counted as an infinite provider delay.')
line('recovery-events.csv records last PCM, idle, buffer, outstanding characters, attempt, gateway flush/ACK observations and next PCM for each recovery. A gateway ACK confirms local forwarding, not an ElevenLabs acknowledgment. Next PCM after a recovery is correlation; another text/flush may intervene. No causal counterfactual proves that recovery shortened a gap. The absence of a second recovery can mean no applicable no-response stall occurred; it does not prove the new branch unnecessary.')
line('\nFINALIZATION / ENDPOINT DIAGNOSTICS')
line('endpoint-chronology.csv separates local commit, gateway-send browser observation, upstream ACK, upstream completed observation and final delivery, including same-server-clock commit->complete timing. Provider complete and ACK can arrive in either order, but production still withholds final delivery until ACK. Raw complete-final partial availability is retained where present. Commit->final latency statistics: '+json.dumps(summary['endpointsCommitToFinalMs']))
line('Recovery-control guard checks verify first-attempt PCM progress, >=750ms idle, <=250ms queued PCM, max two per submitted range, new-text reset and >=1500ms second backoff when no PCM progressed. Timestamp tolerance is1ms. targetTextSubmittedExactlyOnce compares the entire ordered target-unit text to the actual submissions with whitespace normalization only; it does not transcribe or correct audio.')
line('Observed segmentation: '+json.dumps(summary['recognitionSegmentation'])+'. The natural synthetic sentence pauses often keep the full script in one provider item; the physical short baseline had six nonempty finals and a separate generation5 question. The same words with different segmentation are not a matched reproduction of that late-final failure.')
for endpoint in sorted([e for e in endpoints if e['localCommitToFinalMs'] is not None],key=lambda e:e['localCommitToFinalMs'],reverse=True)[:5]:line('Longest final wait: '+json.dumps(endpoint))
line('No endpoint or consent rule was loosened during the batch. The full permission+action+information+email proposition is required; no speculative prefix is introduced. Review-required/failed sessions remain failures, not successful empty queue drains.')
line('\nOFFLINE CONSENT/OPT-OUT TEXT REVIEW')
review_path=ROOT/'consent-text-review.json'
if review_path.exists():
 text_review=json.loads(review_path.read_text());line(str(text_review['uniquePairs'])+' unique source/target pairs across '+str(text_review['occurrences'])+' completed-run unit occurrences were inspected by the assistant. The observed permission statements/questions preserve permission+send+information+email; opt-out wording preserves the option to stop receiving information. No invented affirmative consent reply appeared in these variants. Full strings/counts are in consent-text-review.json. This is limited offline text review, not human Danish listening, pronunciation, legal or clinical validation.')
line('\nVOICE, SAMPLE ORDER AND DUPLICATION LIMITS')
line('Aggregate signal-bearing rendered block/voice evidence: '+json.dumps(summary['voiceEvidence']))
line('Usage evidence, not a billing statement: '+json.dumps(summary['usageEvidence']))
line('Per-run voice connection counts, verified/alternate/unverified audible blocks, exact sample counts, contiguous block ranges, gain, speed, clipping and peak protection are in runs.csv. Only verified drained runs can pass queue/sample drain; zero queues after cancellation are not counted as success. Unique contiguous sample ranges and text ledger ownership establish application-level order, not absence of acoustically repeated words inside fresh provider PCM.')
line('Requested gain remains 3.5573605757216837. Existing peak protection may reduce effective block gain when native provider PCM is louder; minAppliedGain/maxAppliedGain and peakProtection expose that. No gain configuration is adjusted between tests.')
line('Original verified provider PCM is saved as provider-pcm.pcm. rendered.wav reconstructs post-gain scheduled playback from retained first/last sample ranges, per-block gain and playback starts, with zeros only where no PCM was scheduled. For failed/canceled sessions a final partially played block may be represented at full nominal length: use original diagnostics to locate cancellation; reconstructed WAV is not a physical recording. Exact repeated provider-block hashes are flagged for review; this does not establish semantic duplicates or naturalness. Human Danish listening and full translation review remain pending; no extra paid output transcription was performed.')
line('\nEVERY ATTEMPT')
line('run | profile | completion audit | first ms | tail ms | largest gap ms | raw WER% | committed WER% | received/committed/translated/spoken | recoveries | error')
for r in runs:line(' | '.join([r['runId'],r['profile'],r['completionQualification'],fmt(r['firstAudioMs']),fmt(r['tailMs']),fmt(r['largestGapMs']),fmt(r['rawWER'],100),fmt(r['committedWER'],100),'/'.join(str(r[k]) for k in ['received','committed','translated','spoken']),str(r['recoveryAttempts']),str(r['error'] or '')+(' [diagnostic root: '+str(r['rootReason'])+']' if r['error'] else '')]))
line('\nALL >=2 SECOND GAPS')
for g in allgaps:
 if not g['bounded'] or g['durationMs']<2000:continue
 line(f"run {g['runId']} gap {g['gapId']}: {g['startAt']:.3f}->{g['endAt']:.3f} = {g['durationMs']:.3f}ms; unit={g.get('unitId','unmapped')}; dominant={g.get('dominantObservedPhase','unmapped')}; after A/B/C/D="+'/'.join(fmt(g.get(k)) for k in ['afterA_observedWordsMs','afterB_validatedSourceMs','afterC_targetReadyMs','afterD_textSentMs']))
 for p in g.get('phases',[]):line(f"  {p['stage']} {p['ms']:.3f}ms ({p['startAt']:.3f}->{p['endAt']:.3f})")
line('\nNON-BOUNDED >=2s QUIET INTERVALS (not treated as successful resumed transitions)')
for gap in allgaps:
 if not gap['bounded'] and gap['durationMs']>=2000:line(json.dumps(gap,ensure_ascii=False))
line('\nBEFORE/AFTER INTERPRETATION')
line('Previous physical short-consent session (separate from the earlier authoritative long bee7b25d session): 594a168c-8387-45fd-913d-fd416ece53b0: first audio 5186.624ms, largest gap 7751.667ms, median retained gap 4019.333ms, p95 7751.667ms, gaps >1s 7, >2s 6, renderer underruns7 / 28180.833ms, raw/committed WER5.970149% each (0S/4D/0I of67), tail16348.057ms, one connection,16/16 Isabella, clipping0, pipeline63/63/63/63. Those physical metrics remain unchanged historical evidence. This batch changes input speaker/rate and uses silent replay; no strict physical-after comparison or recognition improvement claim is supported.')
line('The physical baseline source-end also included a later20ms energy pulse in an otherwise empty item. Synthetic sources have deterministic trailing silence. Source-end-to-target-end uses the same detector, but those source boundaries are not acoustically matched.')
line('The earlier 7.907s semantic-readiness and6.333s PCM-starvation failures, and newer7.752s/5.044s stalls, cannot be declared physically eliminated by these tests. Per-run live evidence shows whether similar stall/recovery behavior occurred with the synthetic sources; complete physical retest is still required.')
line('\nFILES AND REPRODUCIBILITY')
line('config.json: source metadata, exact text, immutable production fingerprints/settings and run limits. progress.json: attempt ledger. runs.csv: one row per recorded attempt. all-gaps.csv, recovery-events.csv, endpoint-chronology.csv, recognition-units.csv and asr-errors.csv: full audit tables. Each runs/NNN/: start.json, diagnostics.json, review.json, source-end.json when reached, provider-pcm.pcm, reconstructed rendered.wav and analysis.json. collector.log records test transport close observations. summary.json and report.html provide aggregate views. manifest.json lists hashes.')
validation_path=ROOT/'validation.json'
if validation_path.exists():line('Final offline validation: '+json.dumps(json.loads(validation_path.read_text()),ensure_ascii=False))
line('Harness files only: scripts/stage196-batch-prepare.py, scripts/stage196-batch-collector.mjs, scripts/stage196-batch.html, scripts/analyze-stage196-batch.py. Production fingerprints must match config.json at each new claim and at final audit. No change to production code is authorized or made here.')
line('\nUNPROVEN / REQUIRED PHYSICAL FOLLOW-UP')
line('Priorities for a separately authorized next pass: require all semantic units spoken and word equality in the automated stopping condition; investigate the completion-accounting mismatch without assuming PCM silence means final-word completion; reduce ordinary translation latency where committed source exists; investigate provider-path stalls independently of source readiness; retest human speech with matching segmentation and physical audio capture. These are findings/recommendations only; no correction or new test is performed after this batch.')
line('Human microphone/headphone first audio, actual room/device timing, background noise/DSP behavior, untrained accents, natural speech diversity, Danish pronunciation/naturalness/consent meaning, acoustic duplicates and repeatability of long prior stalls remain unproven. Reference vocabulary alone does not validate arbitrary calls. No configuration tuning is done based on interim results. Stage 1.9.6 remains NOT ACCEPTED.')
(ROOT/'report.txt').write_text('\n'.join(lines)+'\n')
# Standalone local HTML: sortable run table and small SVG timing charts. No CDN.
def chart(key,label,threshold=None):
 values=[(int(r['runId']),r.get(key)) for r in runs if isinstance(r.get(key),(int,float))];maximum=max([v for _,v in values]+([threshold] if threshold else [1]))*1.1
 points=''.join(f'<circle cx="{35+i*8.5:.1f}" cy="{165-v/maximum*140:.1f}" r="3"><title>Run {i}: {v:.3f}</title></circle>' for i,v in values)
 target='' if threshold is None else f'<path d="M35 {165-threshold/maximum*140:.1f}H900" stroke="#ce6a46" stroke-dasharray="4 4"/>'
 return f'<section><h2>{html.escape(label)}</h2><svg viewBox="0 0 930 195" role="img" aria-label="{html.escape(label)} by run"><path d="M35 15V165H900" fill="none" stroke="#9eaeb0"/>{target}<g fill="#176568">{points}</g><text x="40" y="190">Run 1 → 100</text><text x="40" y="15">{maximum:.0f}</text></svg></section>'
rows_html=''.join('<tr><td><a href="runs/'+r['runId']+'/analysis.json">'+r['runId']+'</a></td>'+''.join('<td>'+html.escape(str(x))+'</td>' for x in [r['profile'],r['completionQualification'],fmt(r['firstAudioMs']),fmt(r['tailMs']),fmt(r['largestGapMs']),fmt(r['rawWER'],100),fmt(r['committedWER'],100),r['recoveryAttempts'],r['error'] or ''])+'</tr>' for r in runs)
page='''<!doctype html><html lang="en"><meta charset="utf-8"><title>Stage 1.9.6 — 100 live test report</title><style>body{font:15px system-ui;background:#f1f5f4;color:#153b3d;max-width:1300px;margin:30px auto;padding:0 20px}h1{font-size:30px}.notice{background:#fff1df;padding:18px;border-left:5px solid #c9683c}section,table{background:white;padding:16px;margin:18px 0}svg{width:100%;max-height:240px}td,th{padding:9px;text-align:left;border-bottom:1px solid #ddd}table{border-collapse:collapse;width:100%;font-size:13px}th{cursor:pointer}a{color:#176568}.kpis{display:flex;gap:18px;flex-wrap:wrap}.kpis strong{display:block;font-size:30px}</style><h1>Stage 1.9.6 · Automated live verification</h1>'''
page+=f'<p class="notice"><b>NOT ACCEPTED — physical verification remains pending.</b><br>{len(runs)}/100 attempts recorded; {summary["completed"]} harness completions; {summary["verifiedDrained"]} verified drains; {summary["harnessCompletionRejected"]} rejected completions; {summary["failed"]} failed/interrupted. Live providers, synthetic English input and silent real-time rendering. No physical before/after claim.</p>'
page+='<div class="kpis">'+''.join('<section><span>'+html.escape(label)+'</span><strong>'+html.escape(value)+'</strong></section>' for label,value in [('Verified drains',str(summary['verifiedDrained'])+'/'+str(len(runs))),('Median first audio · verified drains',fmt(summary['completedMetrics']['firstAudioMs']['median'])+' ms'),('Median tail · verified drains',fmt(summary['completedMetrics']['tailMs']['median'])+' ms'),('Raw WER',fmt(summary['rawWeightedWER']['WER'],100)+'%'),('Committed WER',fmt(summary['committedWeightedWER']['WER'],100)+'%')])+'</div>'
page+='<p><a href="report.txt">Full forensic report</a> · <a href="runs.csv">All runs CSV</a> · <a href="all-gaps.csv">Every gap CSV</a> · <a href="summary.json">Summary JSON</a></p>'
page+='<section><h2>Outcome and limits</h2><p><b>84/100 verified drains; 7 rejected harness completions; 9 failed/interrupted.</b> The seven rejected runs had 67/67/67/55 counters and a final question unit interrupted at cleanup. Their observed tails are censored in the verified statistics. All raw exports remain unchanged.</p><p>Five repeated synthetic voices read one 67-word passage. This does not establish physical microphone/headphone acceptance, human WER improvement, naturalness or elimination of the previous long-session failures.</p></section>'
page+='<section><h2>Verified-drain timing · n='+str(summary['verifiedDrained'])+'</h2><table><tr><th>Metric</th><th>Median</th><th>p95</th><th>Maximum</th></tr>'+''.join('<tr><td>'+label+'</td>'+''.join('<td>'+fmt(summary['completedMetrics'][key][stat]/1000)+' s</td>' for stat in ['median','p95','max'])+'</tr>' for key,label in [('firstAudioMs','First audio'),('largestGapMs','Largest bounded gap per run'),('tailMs','Source end → target signal end')])+'</table><p>All-run observations and failures remain visible below; first audio is available in95 attempts. Tail requires verified final completion.</p></section>'
page+='<section><h2>Continuity remains below target</h2><p>'+str(summary['gapsGT2s'])+' bounded gaps exceeded2 seconds; '+str(summary['longGapAfterValidatedSourceGT2s'])+' still exceeded2 seconds after validated source commitment. Dominant observed phases: '+html.escape(json.dumps(summary['longGapDominantPhases']))+'.</p><p>11 residual controls, including4 second attempts. New PCM followed within2 seconds once; 9 controls had an observable2-second window. Causality is unproven. Gateway ACKs are not provider-generation ACKs.</p></section>'
page+='<section><h2>Recognition and voice safeguards</h2><p>Raw and committed WER:20 substitutions /0 deletions /0 insertions across6231 reference words in93 eligible runs:0.321%. Substitutions were “by” → “via”. The earlier human deletions were not reproduced by this input.</p><p>1626/1626 signal-bearing rendered blocks had verified Isabella provenance; zero alternate/unverified blocks and zero output clipping. Existing peak protection activated28 times. One voice connection in each of91 harness completions; fixed speed0.95 and requested gain3.5573605757216837.</p></section>'
page+='<p><a href="recovery-events.csv">Recovery controls</a> · <a href="endpoint-chronology.csv">Endpoint chronology</a> · <a href="asr-errors.csv">ASR edits</a> · <a href="consent-text-review.json">Consent text review</a> · <a href="validation.json">Offline validation</a> · <a href="manifest.json">Evidence hashes</a></p>'
page+=chart('firstAudioMs','First audio (ms)',5000)+chart('largestGapMs','Largest retained bounded gap (ms)',2000)+chart('tailMs','Source end → target signal end (ms)')
page+='<h2>All recorded attempts</h2><p>Click a column heading to sort.</p><table id="runs"><thead><tr>'+''.join('<th>'+h+'</th>' for h in ['Run','Profile','Completion audit','First ms','Tail ms','Gap ms','Raw WER%','Committed WER%','Recovery','Error'])+'</tr></thead><tbody>'+rows_html+'</tbody></table>'
page+='''<script>document.querySelectorAll('th').forEach((h,i)=>h.onclick=()=>{const body=document.querySelector('tbody');const rows=[...body.rows];rows.sort((a,b)=>a.cells[i].textContent.localeCompare(b.cells[i].textContent,undefined,{numeric:true}));rows.forEach(r=>body.append(r));});</script></html>'''
(ROOT/'report.html').write_text(page)
