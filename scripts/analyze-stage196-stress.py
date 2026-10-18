"""Read-only live-run analysis; evidence-derived WAVs/reports written locally. No providers."""
import array,csv,hashlib,html,json,math,re,statistics,unicodedata,wave,sys,copy
from pathlib import Path
from collections import Counter,defaultdict
ROOT=Path('benchmarks/stage196-stress-50-20261017');cfg=json.loads((ROOT/'config.json').read_text());reference='';render_audio='--render-audio' in sys.argv
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
 if not keys:keys={'asr-errors.csv':['runId','profile','stage','eligibleForWER','operation','reference','observed','unit'],'recovery-events.csv':['runId','profile','at','attempt','pcmIdleMs','bufferMs','responseMs','PCMWithin2s']}.get(name,['runId'])
 with (ROOT/name).open('w') as f:
  w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v for k,v in row.items()} for row in rows)
def contains(a,b):return any(a[i:i+len(b)]==b for i in range(len(a)-len(b)+1))
runs=[];allgaps=[];recoveries=[];asr_edits=[];endpoints=[];errors=[];unitrows=[]
for folder in sorted((ROOT/'runs').iterdir()):
 if not (folder/'review.json').exists():continue
 review=json.loads((folder/'review.json').read_text());d=json.loads((folder/'diagnostics.json').read_text());s=copy.deepcopy(review['snapshot']);reference=review['sourceReference']['text']
 originalDrops={k:d.get(k,0) for k in ['droppedEvents','droppedPCMBlocks','droppedVoiceLifecycle','droppedRecognitionLifecycle']}
 evidence=[]
 for chunk in sorted((folder/'evidence').glob('*.jsonl')):evidence.extend(json.loads(line) for line in chunk.read_text().splitlines() if line)
 sequence=[e['sequence'] for e in evidence];assert sequence==list(range(1,len(sequence)+1)),str(folder)+' evidence sequence gap'
 assert len(evidence)==review['evidence']['events'],str(folder)+' evidence event count mismatch'
 fullItems={};fullPartials=defaultdict(list);fullLifecycle=[];fullBlocks={};fullTrace=[]
 for event in evidence:
  value=event['data']
  if event['kind']=='recognition.item':fullItems[value['generation']]=value
  if event['kind']=='websocket.in':
   payload=value['event']
   if payload.get('type')=='partial' and value['path']=='/api/transcription/continuous':
    history=fullPartials[payload['generation']]
    if not history or history[-1]['text']!=payload['text']:history.append(dict(at=event['at'],text=payload['text']))
   if payload.get('type')=='diagnostic' and payload.get('event','').startswith('recognition.'):
    fullLifecycle.append(dict(sequence=event['sequence'],at=event['at'],event=payload['event'],data=payload.get('data',{})))
  if event['kind']=='audio.audit':
   fullTrace.append(value)
   if value.get('type') in ['PCM_GAIN_APPLIED','VOICE_PROVENANCE_VERIFIED','PCM_BLOCK_SCHEDULED','PCM_BLOCK_PLAYBACK_STARTED','PCM_BLOCK_PLAYBACK_FINISHED','PCM_BLOCK_CANCELLED'] and value.get('streamId') is not None and value.get('pcmBlockSequence') is not None:
    key=(value['streamId'],value['pcmBlockSequence']);fullBlocks[key]={**fullBlocks.get(key,{}),**value}
 for item in fullItems.values():item['productionDroppedPartials']=item.get('droppedPartials',0);item['partials']=fullPartials[item['generation']];item['droppedPartials']=0
 if fullItems:d['recognitionAudit']={**d.get('recognitionAudit',{}),'items':list(fullItems.values())}
 if fullLifecycle:d['recognitionLifecycle']=fullLifecycle
 if fullBlocks:d['pcmBlocks']=list(fullBlocks.values())
 if fullTrace:s['audioTrace']=fullTrace
 units=s['lanes']['en']['units'];items=d.get('recognitionAudit',{}).get('items',[]);trace=s.get('audioTrace',[]);blocks=d.get('pcmBlocks',[]);runid=review['runId'];a=s.get('acoustic',{});positions=s.get('positions',{});pending=d.get('pending',{});quality=d.get('voiceQuality',{});prov=d.get('voiceProvenance',{});feed=review.get('feedTiming',[])
 fullsource=len(feed)>0 and feed[-1]['frameEnd']==review['sourceReference']['samples'];allfinal=not any(i.get('commitAt') and 'final' not in i for i in items) and any('final' in i for i in items)
 rawEligible=fullsource and allfinal
 committedEligible=rawEligible and all(not i.get('final','').strip() or i.get('semanticFinalizedAt') is not None for i in items)
 eligible=rawEligible and committedEligible
 raw=score([(str(i['generation']),i.get('final','')) for i in items if 'final' in i]);committed=score([(u['id'],u['source']) for u in units])
 for stage,sc in [('raw',raw),('committed',committed)]:
  if not (rawEligible if stage=='raw' else committedEligible):continue
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
 renderedSignalMs=0;tailSignalMs=0;tailEnd=None
 if render_audio:
  if '--reuse-rendered' in sys.argv and (folder/'rendered.wav').exists():
   with wave.open(str(folder/'rendered.wav'),'rb') as saved:rendered.frombytes(saved.readframes(saved.getnframes()))
  else:
   for b in played:
    length=b['lastSample']-b['firstSample']+1
    if b.get('cancelled') and b.get('playbackFinishedAt') is not None:length=min(length,max(0,round((b['playbackFinishedAt']-b['playbackStartedAt'])*24)))
    when=round((b['playbackStartedAt']-rendered_origin)*24);end=when+length
    if end>len(rendered):rendered.extend(array.array('h',[0])*(end-len(rendered)))
    gain=b.get('gainApplied',1)
    for j,sample in enumerate(rawpcm[b['firstSample']:b['firstSample']+length]):rendered[when+j]=max(-32768,min(32767,round(sample*gain)))
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
 # Reconstruct complete digital signal gaps independently of the bounded
 # production gap-history ring. Match its per-block20ms RMS/.005 detector.
 original_gaps=s.get('gaps',[]);signal_intervals=[]
 for block in sorted(played,key=lambda b:b['playbackStartedAt']):
  length=block['lastSample']-block['firstSample']+1
  if block.get('cancelled') and block.get('playbackFinishedAt') is not None:length=min(length,max(0,round((block['playbackFinishedAt']-block['playbackStartedAt'])*24)))
  gain=block.get('gainApplied',1)
  for offset in range(0,length,480):
   stop=min(length,offset+480);window=rawpcm[block['firstSample']+offset:block['firstSample']+stop]
   if not window or sum(value*value for value in window)/len(window)*(gain/32768)**2<.005**2:continue
   left=block['playbackStartedAt']+offset/24;right=block['playbackStartedAt']+stop/24
   if signal_intervals and left<=signal_intervals[-1]['end']+1/24:signal_intervals[-1]['end']=max(signal_intervals[-1]['end'],right)
   else:signal_intervals.append(dict(start=left,end=right,block=block['pcmBlockSequence']))
 signal_gaps=[]
 for previous,nxt in zip(signal_intervals,signal_intervals[1:]):
  if nxt['start']-previous['end']<500:continue
  start,end=previous['end'],nxt['start'];overlap=max(original_gaps,key=lambda g:max(0,min(g.get('gap_end',end),end)-max(g['gap_start'],start)),default=None)
  signal_gaps.append(dict(gap_start=start,gap_end=end,gap_duration=end-start,endedBy='audible_audio',root_cause_classification=overlap.get('root_cause_classification') if overlap else None,resumingBlockSequence=nxt['block']))
 cancel_at=max((b.get('playbackFinishedAt') or 0 for b in played),default=0)
 if signal_intervals and cancel_at-signal_intervals[-1]['end']>=500:signal_gaps.append(dict(gap_start=signal_intervals[-1]['end'],gap_end=cancel_at,gap_duration=cancel_at-signal_intervals[-1]['end'],endedBy='STOP',root_cause_classification='CENSORED_AT_OUTPUT_CANCEL'))
 s['gaps']=signal_gaps
 gaps=[]
 for index,g in enumerate(s.get('gaps',[]),1):
  start,end=g['gap_start'],g.get('gap_end');bounded=g.get('endedBy')=='audible_audio' and end is not None
  row=dict(runId=runid,profile=review['profile'],gapId=index,startAt=start,endAt=end,durationMs=g['gap_duration'],endedBy=g.get('endedBy'),bounded=bounded,exportedClassification=g.get('root_cause_classification'),gapMeasurement='complete saved provider PCM, per-block20ms post-gain RMS>=.005, renderer context timeline',resumingBlockSequence=g.get('resumingBlockSequence'))
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
   block=next((b for b in blocks if b.get('pcmBlockSequence')==g.get('resumingBlockSequence')),None) if g.get('resumingBlockSequence') is not None else (min(possible,key=lambda b:abs(b['playbackStartedAt']-end)) if possible else None)
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
     mark(partialAt,'SOURCE_SPEECH_OR_ASR_AVAILABILITY')
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
 run=dict(runId=runid,sessionId=d['sessionId'],profile=review['profile'],status=review['status'],error=review['error'],rootReason=d.get('reason'),testTransport=review.get('testTransport','direct Vite frontend'),eligibleForWER=eligible,eligibleForRawWER=rawEligible,eligibleForCommittedWER=committedEligible,fullSourceDelivered=fullsource,referenceWords=len(tokens(reference)),providerFinalItems=sum('final' in i and bool(i['final'].strip()) for i in items),questionSeparateProviderItem=any(tokens(i.get('final',''))[:4]==['is','it','okay','for'] for i in items),rawWER=raw['WER'] if rawEligible else None,rawS=raw['S'] if rawEligible else None,rawD=raw['D'] if rawEligible else None,rawI=raw['I'] if rawEligible else None,committedWER=committed['WER'] if committedEligible else None,committedS=committed['S'] if committedEligible else None,committedD=committed['D'] if committedEligible else None,committedI=committed['I'] if committedEligible else None,firstAudioMs=a.get('firstAudioLatency'),tailMs=a.get('tailLatency'),signedTailMs=a.get('rawSignedTailLatency'),leadMs=a.get('targetAudioLead'),largestGapMs=max(gapvalues,default=None),largestObservedGapMs=max((g['durationMs'] for g in gaps),default=None),largestTerminalGapMs=max((g['durationMs'] for g in gaps if g.get('endedBy')=='STOP'),default=None),terminalCensoredGaps=sum(g.get('endedBy')=='STOP' for g in gaps),medianGapMs=stats(gapvalues)['median'],p95GapMs=stats(gapvalues)['p95'],boundedGaps=len(bounded),gapsGT1s=sum(g>1000 for g in gapvalues),gapsGT2s=sum(g>2000 for g in gapvalues),unmappedGapsGT2s=sum(g['durationMs']>2000 and not g.get('phases') for g in bounded),ordinaryReadyGapsGT1s=sum(not g.get('precision',True) and (g.get('afterB_validatedSourceMs') or 0)>1000 for g in bounded),underruns=positions.get('underruns'),underrunMs=positions.get('underrunMs'),voiceConnections=positions.get('voiceConnections'),audiblePCMBlocks=prov.get('audiblePCMBlocks'),verifiedIsabellaPCMBlocks=prov.get('verifiedIsabellaPCMBlocks'),unverifiedPCMBlocks=prov.get('unverifiedPCMBlocks'),alternatePCMBlocks=prov.get('alternateVoicePCMBlocks'),outputClipping=quality.get('clippingEvents'),peakProtection=quality.get('peakProtectionEvents'),gain=quality.get('gainApplied'),minAppliedGain=min((b.get('gainApplied',1) for b in blocks),default=None),maxAppliedGain=max((b.get('gainApplied',1) for b in blocks),default=None),postGainPeak=quality.get('postGainPeak'),speed=quality.get('effectiveSpeedSetting'),received=counts[0],committed=counts[1],translated=counts[2],spoken=counts[3],pipelineEquality=equal,queueDrain=queues,renderedSignalMs=renderedSignalMs,renderedDurationMs=len(rendered)/24,rendererTimelineTailSignalEstimateMs=tailSignalMs if tailEnd is not None else None,submittedInputSeconds=sum(i['samples'] for i in items)/24000,ttsCharacters=positions.get('ttsCharacters',0),providerSamples=receivedSamples,pcmCoverageComplete=cursor==receivedSamples,pcmSequencesContiguous=seq==list(range(len(seq))),playedSamples=positions.get('playbackSamples'),recoveryAttempts=sum(r['runId']==runid for r in recoveries),secondRecoveries=sum(r['runId']==runid and r['attempt']==2 for r in recoveries),droppedDiagnosticEvents=d.get('droppedEvents',0),droppedRawPartials=sum(i.get('droppedPartials',0) for i in items),droppedRecognitionLifecycle=d.get('droppedRecognitionLifecycle',0),droppedVoiceLifecycle=d.get('droppedVoiceLifecycle',0),maxFeedLateMs=max((f['lateMs'] for f in feed),default=None),meanFeedLateMs=statistics.mean(f['lateMs'] for f in feed) if feed else None,contiguousPCM=contiguous,targetTextSubmittedExactlyOnce=targetSubmissionMatches,recoveryGuardViolations=len(controlViolations),duplicatePCMBlocks=len(duplicated_blocks),wallDurationMs=review['wallDurationMs'],checks=checks,allAutomatedChecksPass=all(checks.values()))
 run['sourceClipSpeechMs']=review['sourceReference']['speechClipDurationMs']
 run['deliveredSourceMs']=sum(f['frameEnd']-f['frameStart'] for f in feed)/24
 run['deliveredSpeechClipMs']=min(review['sourceReference']['speechClipDurationMs'],max(0,run['deliveredSourceMs']-review['sourceReference']['leadingSilenceMs']))
 run['durableEvidenceEvents']=len(evidence)
 run['durableEvidenceSequenceComplete']=True
 run['productionDroppedPartials']=sum(i.get('productionDroppedPartials',0) for i in items)
 run['originalExportDrops']=originalDrops
 run['renderedAudioGenerated']=render_audio
 run['originalExportedGapRecords']=len(original_gaps)
 run['reconstructedBoundedGaps']=sum(g['bounded'] for g in gaps)
 run['harnessStatus']=review['status']
 run['verifiedDrain']=bool(review['status']=='completed' and queues and equal and checks['sampleDrain'] and review.get('completionAudit',{}).get('complete'))
 run['completionQualification']='verified_pipeline_and_sample_drain' if run['verifiedDrain'] else ('harness_completion_rejected_final_unit_interrupted' if review['status']=='completed' else 'failed_or_operationally_interrupted')
 run['observedTailMs']=run['tailMs']
 run['tailRightCensored']=review['status']=='completed' and not run['verifiedDrain']
 if not run['verifiedDrain']:run['tailMs']=None;run['signedTailMs']=None
 if not render_audio:
  for key in ['renderedSignalMs','renderedDurationMs','rendererTimelineTailSignalEstimateMs']:run[key]=None
 runs.append(run)
 detail=dict(**run,rawProviderScore=raw if rawEligible else dict(referenceWords=len(tokens(reference)),observedFinalWords=raw['observedWords'],WER=None,S=None,D=None,I=None,reason='Incomplete source or missing finals; no full-reference WER/edit alignment is reported'),committedScore=committed if committedEligible else dict(referenceWords=len(tokens(reference)),observedCommittedWords=committed['observedWords'],WER=None,S=None,D=None,I=None,reason='Incomplete source/finalization; no full-reference WER/edit alignment is reported'),WERQualification='Raw WER requires full source and all finals. Committed WER additionally requires semantic finalization. Output failures do not censor complete ASR evidence; incomplete ASR scores remain diagnostic only.',gaps=gaps,recoveries=[r for r in recoveries if r['runId']==runid],endpointChronology=[e for e in endpoints if e['runId']==runid],duplicateBlocks=duplicated_blocks,recoveryGuardViolationsDetail=controlViolations,tailBreakdown=d.get('latencyBreakdown',{}).get('tailBreakdown'),reference=reference,rawProviderFinals=[i.get('final') for i in items if 'final' in i],committedSource=[u['source'] for u in units],target=[u.get('target') for u in units],sourceTimingQualification='Synthetic replay delivery timestamps; no OS microphone DSP, acoustic input delay or headphone output measurement.',allGapSumsVerified=True)
 (folder/'analysis.json').write_text(json.dumps(detail,indent=2,ensure_ascii=False)+'\n')
 if review['error']:errors.append(dict(runId=runid,profile=review['profile'],error=review['error'],rootReason=d.get('reason')))
summary=dict(status='NOT ACCEPTED — AUTOMATED LIVE EVIDENCE ONLY',batchId=cfg['batchId'],requested=cfg['maxAttempts'],recorded=len(runs),completed=sum(r['status']=='completed' for r in runs),failed=sum(r['status']!='completed' for r in runs),eligibleForWER=sum(r['eligibleForWER'] for r in runs),automatedChecksPass=sum(r['allAutomatedChecksPass'] for r in runs),metrics={k:stats(r.get(k) for r in runs) for k in ['firstAudioMs','tailMs','largestGapMs','rawWER','committedWER','underrunMs','maxFeedLateMs']},checkCounts={k:sum(r['checks'][k] for r in runs) for k in (runs[0]['checks'] if runs else [])},gapStats=stats(g['durationMs'] for g in allgaps if g['bounded'] and g['durationMs']>=500),gapsGT2s=sum(g['bounded'] and g['durationMs']>2000 for g in allgaps),recoveryCount=len(recoveries),secondRecoveryCount=sum(r['attempt']==2 for r in recoveries),recoveryResponseMs=stats(r['responseMs'] for r in recoveries),recoveryNextPCMWithin2s=sum(r['PCMWithin2s'] is True for r in recoveries),recovery2sWindowObserved=sum(r['PCMWithin2s'] is not None for r in recoveries),recoveryNoSubsequentPCM=sum(r['nextPCMAt'] is None for r in recoveries),endpointsCommitToFinalMs=stats(e['localCommitToFinalMs'] for e in endpoints),errors=errors,limitations=cfg['limitations'],profiles={})
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
 qualified=[r for r in runs if r['eligibleForRawWER' if stage=='raw' else 'eligibleForCommittedWER']];summary[stage+'WeightedWER']=dict(referenceWords=sum(r['referenceWords'] for r in qualified),S=sum(r[stage+'S'] for r in qualified),D=sum(r[stage+'D'] for r in qualified),I=sum(r[stage+'I'] for r in qualified),WER=sum(r[stage+'S']+r[stage+'D']+r[stage+'I'] for r in qualified)/sum(r['referenceWords'] for r in qualified) if qualified else None)
(ROOT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n');csv_write('runs.csv',runs);csv_write('all-gaps.csv',allgaps);csv_write('recovery-events.csv',recoveries);csv_write('asr-errors.csv',asr_edits);csv_write('endpoint-chronology.csv',endpoints);csv_write('recognition-units.csv',unitrows)
print(json.dumps({k:summary[k] for k in ['recorded','completed','failed','eligibleForWER','automatedChecksPass','recoveryCount','secondRecoveryCount']},indent=2))

# Additional sustained-stream metrics use the independent evidence stream.
queue_rows=[]
for run in runs:
 folder=ROOT/'runs'/run['runId'];review=json.loads((folder/'review.json').read_text())
 timeline=[json.loads(line) for file in sorted((folder/'evidence').glob('*.jsonl')) for line in file.read_text().splitlines() if line]
 snapshots=[e for e in timeline if e['kind']=='pipeline.snapshot']
 buffer_values=[(e['at'],e['data'].get('positions',{}).get('bufferMs',0)) for e in snapshots]
 run['maxSampledBufferMs']=max((v for _,v in buffer_values),default=None)
 run['maxSampledOutstandingPCMms']=max(((e['data'].get('positions',{}).get('targetSamples',0)-e['data'].get('positions',{}).get('playbackSamples',0))/24 for e in snapshots),default=None)
 run['sampledBufferGT15sCount']=sum(v>15000 for _,v in buffer_values)
 run['sampledBufferGT30sCount']=sum(v>30000 for _,v in buffer_values)
 run['fullDurationSourceDelivered']=run['fullSourceDelivered'] and 120000<=run['sourceClipSpeechMs']<=160000
 audits=[e['data'] for e in timeline if e['kind']=='audio.audit'];failure=next((e for e in audits if e.get('type')=='voice.failed'),None)
 prior=[e for e in audits if failure and e.get('at',0)<=failure['at']]
 provenance_ok_before_failure=any(e.get('type')=='PCM_PROVENANCE_ACCEPTED' and failure['at']-e.get('at',0)<50 for e in prior) if failure else False
 measurements=[e['data'] for e in timeline if e['kind']=='audio.measurement']
 last_scheduled=next((e for e in reversed(measurements) if e.get('type')=='block_scheduled'),None);cancel=next((e for e in measurements if e.get('type')=='cancelled'),None)
 queued_at_cancel=None
 if last_scheduled and cancel and last_scheduled.get('clock',{}).get('contextTime') is not None and cancel.get('clock',{}).get('contextTime') is not None:
  end_context=last_scheduled['clock']['contextTime']+(last_scheduled['endAt']-last_scheduled['clock']['performanceTime'])/1000
  queued_at_cancel=max(0,(end_context-cancel['clock']['contextTime'])*1000)
 run['mappedQueuedPCMAtCancellationMs']=queued_at_cancel
 run['rendererQueueLimitSupported']=bool(run['error'] and 'voice unavailable or identity rejected' in run['error'] and provenance_ok_before_failure and max(run['maxSampledBufferMs'] or 0,queued_at_cancel or 0)>=30020)
 run['failureQualification']='renderer_queue_limit_supported_by_preceding_verified_PCM_and_backlog' if run['rendererQueueLimitSupported'] else ('completion_accounting_stall' if run['error'] and 'Completion accounting stalled' in run['error'] else run['rootReason'])
 run['voiceFailureAt']=failure.get('at') if failure else None
 run['sourceDeliveredPercent']=100*run['deliveredSourceMs']/review['sourceReference']['durationMs']
 run['queuedPCMAtCleanupMs']=(review['preCleanupSnapshot'].get('positions',{}).get('targetSamples',0)-review['preCleanupSnapshot'].get('positions',{}).get('playbackSamples',0))/24 if review.get('preCleanupSnapshot') else None
 run['protocolOutcome']='verified_full_source_and_drain' if run['verifiedDrain'] and run['fullDurationSourceDelivered'] else 'failed_or_incomplete'
 for e in snapshots:queue_rows.append(dict(runId=run['runId'],at=e['at'],state=e['data'].get('state'),**e['data'].get('positions',{})))
 detail=json.loads((folder/'analysis.json').read_text());detail.update(run);(folder/'analysis.json').write_text(json.dumps(detail,indent=2,ensure_ascii=False)+'\n')
summary['attemptsWithAtLeast120sDelivered']=sum(r['deliveredSpeechClipMs']>=120000 for r in runs)
summary['deliveredSpeechClipMs']=stats(r['deliveredSpeechClipMs'] for r in runs)
summary['attemptWallDurationMs']=stats(r['wallDurationMs'] for r in runs)
summary['fullDurationSourcesDelivered']=sum(r['fullDurationSourceDelivered'] for r in runs)
summary['failureQualifications']=dict(Counter(r['failureQualification'] for r in runs if r['error']))
summary['mappedQueuedPCMAtCancellationMs']=stats(r['mappedQueuedPCMAtCancellationMs'] for r in runs)
summary['maxSampledBufferMs']=stats(r['maxSampledBufferMs'] for r in runs)
summary['maximumQueuedPCMAtCleanupMs']=stats(r['queuedPCMAtCleanupMs'] for r in runs)
summary['durationAndDelivery']={name:dict(attempts=sum(r['profile']==name for r in runs),sourceMs=next(s['speechClipDurationMs'] for s in cfg['sources'] if s['id']==name),fullSources=sum(r['profile']==name and r['fullSourceDelivered'] for r in runs),verifiedDrains=sum(r['profile']==name and r['verifiedDrain'] for r in runs),deliveredSpeechClipMs=stats(r['deliveredSpeechClipMs'] for r in runs if r['profile']==name),mappedQueuedPCMAtCancellationMs=stats(r['mappedQueuedPCMAtCancellationMs'] for r in runs if r['profile']==name)) for name in [s['id'] for s in cfg['sources']]}
summary['durableEvidenceEvents']=sum(r['durableEvidenceEvents'] for r in runs)
summary['durableEvidenceSequenceComplete']=all(r['durableEvidenceSequenceComplete'] for r in runs)
summary['onlyMetadataAnalysis']=not render_audio
summary['primaryGapMethod']='complete saved PCM, per-block20ms post-gain RMS>=.005 on recorded renderer timeline; original bounded gap-history ring is secondary only'
(ROOT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n');csv_write('runs.csv',runs);csv_write('buffer-timeline.csv',queue_rows)

def fmt(value,scale=1):return 'unavailable' if value is None else f'{value*scale:.3f}'
lines=[]
def line(value=''):lines.append(value)
line('STAGE 1.9.6 — SUSTAINED LIVE STRESS / REGRESSION REPORT')
line('NOT ACCEPTED. Automated live evidence only; no physical microphone/headphone acceptance.')
line(f"Recorded {len(runs)}/{cfg['maxAttempts']} authorized attempts. Harness completed {summary['completed']}; verified pipeline/sample drains {summary['verifiedDrained']}; failed/interrupted {summary['failed']}. Full120–160s source recordings delivered {summary['fullDurationSourcesDelivered']}.")
line('FINAL: all authorized attempts recorded; no extra attempts.' if len(runs)==cfg['maxAttempts'] else 'PROVISIONAL: batch is still running. No final success claim.')
line('\nMETHOD / SCOPE')
line('Same frozen production candidate as the previous100-attempt short batch. No production code, environment/configuration, voice, speed, gain, recognition models, translation models, precision/consent rules, provenance guards or playback buffers changed. Backend was no longer listening at preflight and was restarted unchanged before the first provider attempt. Five new offline synthetic source recordings are injected in100ms real-time packets through the existing microphone dependency boundary. Real OpenAI recognition/translation and ElevenLabs generation; native AudioContext silent sink. No physical microphone DSP, headphones or external acoustic recording. No paid output-transcription calls. One persistent voice connection required within each test; connections between tests are separate by design.')
line('User authorized50 additional tests. A60second test-harness cooldown follows3 consecutive generic availability-class errors; the generic voice message also triggers this for queue-limit failures. A cooldown is not proof of provider unavailability. Collector enforces max50 and serial execution. Failures count as attempts and are never replaced by unreported retries. Internal existing production retries remain enabled. Exactly120–160seconds is the planned source-recording span including natural sentence pauses, excluding500ms lead and2000ms trailing silence. A pipeline failure can stop an attempt before the full recording is delivered; full-duration and delivered-duration columns expose this. The old166-word human passage was not used as input or hints. All new references are offline source/scoring data only.')
line('Five different passages of406–410words cover sustained clauses, numerical corrections, explicit consent scope, negation and sentence boundaries. They use three installed macOS voices, not50 independent human callers. There is no added noise, acoustic echo, barge-in or simulated network outage. Natural synthetic pauses are retained; no production endpointing parameter is changed. Source audio quality and linguistic coverage limit generalization.')
line('The test harness was corrected before this batch: success additionally requires every unit spoken, received=committed=translated=spoken>0, sample equality, no pending finals/workers/queues/buffers and acoustic completion. Ten seconds of stationary unspoken units after PCM drain is a failed completion-accounting test, not a successful drain. This changes test stopping behavior only.15 deterministic stopping-rule regressions cover the previous67/67/67/55 premature-stop failure and incomplete states.')
line('Independent evidence streams preserve websocket partials/finals, provider commit ACK/completed diagnostics, direct audio audit events, unit milestone changes and1second pipeline snapshots to append-only numbered JSONL chunks. Sequence continuity and exported event counts are asserted. Production exports retain their original dropped counters; analysis reconstructs an augmented view from the separate observer without rewriting originals. Observer overhead is part of this test environment; feed lateness is reported. Browser and server clocks are kept distinct; server absolute timestamps are not subtracted from browser absolute timestamps.')
line('\nFROZEN SETTINGS');line(json.dumps(cfg['settings'],indent=2,ensure_ascii=False))
line('Production/config hashes unchanged: '+str(summary['productionFingerprintMatches']))
line('\nSOURCES — exact references below; hashes in config.json')
for source in cfg['sources']:
 line(f"{source['id']} | {source['voice']} at{source['rate']}wpm | {source['referenceWords']}words | speech-clip span {source['speechClipDurationMs']/1000:.3f}s | total source {source['durationMs']/1000:.3f}s | SHA256 {source['sha256']}")
 line(source['text']);line()
line('\nAGGREGATE RESULTS — explicit denominators')
line('All available observations, including failed attempts:')
for key,value in summary['metrics'].items():line(key+' | n='+str(value['n'])+' | min/median/p95/max/mean: '+' / '.join(fmt(value[k],100 if 'WER' in key else 1) for k in ['min','median','p95','max','mean']))
line('Verified-drain runs only; incomplete tails are censored:')
for key,value in summary['completedMetrics'].items():line(key+' | n='+str(value['n'])+' | median/p95/max: '+' / '.join(fmt(value[k],100 if 'WER' in key else 1) for k in ['median','p95','max']))
line('Timing units are milliseconds; WER values in the tables are percentages. Nearest-rank p95; ordinary sample median. No zero-tail substitutions for failed runs. Raw signed tail and lead remain separate. First audio and bounded gaps remain available on a failed attempt when observed.')
line('At least120s of speech-recording span delivered, excluding framing silence, before failure or completion: '+str(summary['attemptsWithAtLeast120sDelivered'])+'/'+str(len(runs))+'. This does not imply full-reference delivery or successful drain.')
line('Actual delivered speech-recording span (ms, excluding framing): '+json.dumps(summary['deliveredSpeechClipMs']))
line('Attempt wall duration including setup/cleanup (ms): '+json.dumps(summary['attemptWallDurationMs']))
line('By source: '+json.dumps(summary['durationAndDelivery']))
line('Failure diagnostic roots: '+json.dumps(summary['failureRootReasons']))
line('Forensic failure qualifications: '+json.dumps(summary['failureQualifications']))
line('Sampled peak buffer statistics: '+json.dumps(summary['maxSampledBufferMs']))
line('Mapped remaining scheduled PCM at cancellation (ms): '+json.dumps(summary['mappedQueuedPCMAtCancellationMs'])+'. This uses block end context time reconstructed from the same output timestamp mapping and the cancellation context time; it is a renderer timeline observation, not a physical latency measurement.')
line('A generic voice-unavailable-or-identity-rejected message is not proof of an alternate voice. Renderer queue-limit support requires preceding PCM provenance acceptance and sampled or context-clock-mapped backlog above30seconds (20ms inference margin). The unchanged scheduler rejects new PCM when queuedMs>30000 or carry would exceed2MiB; observed carry and block sizes distinguish those conditions where retained. This is evidence-based attribution/inference because the client catch hides the underlying exception text. Cases lacking those observations remain unresolved. No guard is relaxed and no larger permanent buffer is introduced.')
line('\nASR — RAW FINALS AND COMMITTED SOURCE')
line('Raw weighted WER: '+json.dumps(summary['rawWeightedWER']))
line('Committed weighted WER: '+json.dumps(summary['committedWeightedWER']))
line('Global Levenshtein with NFKC, case, apostrophe and punctuation normalization only. No script matching, brand corrections or replacement dictionary. Literal number words versus digits, and spelling variants, can count as edits even when meaning is unchanged; exact edits are retained in asr-errors.csv. Full WER requires full source delivery and every committed provider item final; committed WER additionally requires semantic finalization. Incomplete ASR scores and edit alignments are withheld; the observed text and counts remain available. The undelivered reference tail is not mislabeled as deletions. Raw histories are the gateway-emitted provider partial/final texts; this is not internal provider-token evidence. Full reference words were never supplied to ASR as hints.')
line('Provider segmentation: '+json.dumps(summary['recognitionSegmentation']))
line('Local commit→final waits: '+json.dumps(summary['endpointsCommitToFinalMs']))
for stage in ['raw','committed']:
 edits=Counter((e['operation'],str(e['reference']),str(e['observed'])) for e in asr_edits if e['stage']==stage and e['eligibleForWER'])
 line(stage+' most frequent eligible edits: '+json.dumps([dict(operation=k[0],reference=k[1],observed=k[2],count=n) for k,n in edits.most_common(25)],ensure_ascii=False))
line('\nCONTINUITY / COMPLETE PHASE ATTRIBUTION')
line(f"Bounded gaps >=500ms: {summary['gapStats']['n']}; >1s: {summary['gapsGT1s']}; >2s: {summary['gapsGT2s']}; >2s after validated source commitment: {summary['longGapAfterValidatedSourceGT2s']}.")
line('Primary gap method: '+summary['primaryGapMethod']+'. Four final production snapshots hit the200record gap-history ring, which had evicted early gaps. Raw PCM plus full block metadata reconstruct the complete signal timeline independently; the original exports are unchanged. Post-gain RMS is calculated from saved PCM and recorded gain; float quantization can shift a near-threshold window, and device/output clock mapping remains qualified. No word alignment or physical listening is implied.')
line('Gap statistics (ms): '+json.dumps(summary['gapStats']))
line('Dominant observed phases for >2s: '+json.dumps(summary['longGapDominantPhases']))
line('Every reconstructed inter-signal gap>=500ms is in all-gaps.csv; every mapped phase chain sums to its measured gap. afterA/B/C/D measure time after observed complete raw words, validated semantic commitment, translated target readiness and actual text submission. A complete raw partial alone is not a stability guarantee. Word-acoustic alignment is unavailable, so exact unavoidable source wait cannot be invented; unmapped/ambiguous/shared ownership is flagged. Scheduled-PCM coverage independently distinguishes PCM-supplied quiet from empty scheduled intervals; it must not be added to causal phase sums. A provider-path wait includes generation/transport until client PCM, not a claim about hidden provider computation.')
line('SOURCE_SPEECH_OR_ASR_AVAILABILITY means waiting until the complete unit words are observed. It can include source speech still being spoken, ASR availability and the chosen semantic-unit granularity. It is not an isolated provider-ASR delay measurement; exact acoustic word alignment is unavailable.')
line('Clock-disagreement gaps: '+str(summary['clockDisagreementGaps'])+'. Device-output timestamp mapping may put a client PCM observation after measured audible resume. Those rows retain the discrepancy and clip critical phases at measured resume; exact final subphases remain uncertain. Failed terminal quiet intervals are right-censored, not successful transitions. Largest terminal/censored statistics: '+json.dumps(summary['terminalCensoredGapStats']))
line('First following gap after early greeting: '+json.dumps(summary['firstPostGreetingGapMs'])+'; >2s count='+str(summary['firstPostGreetingGapsGT2s'])+'. No matched run without comma-prefix release exists, so causality is not established.')
line('\nRESIDUAL RECOVERY / DUPLICATION')
line(f"Controls {summary['recoveryCount']}; second attempts {summary['secondRecoveryCount']}; subsequent PCM within2s {summary['recoveryNextPCMWithin2s']}/{summary['recovery2sWindowObserved']} observed response windows; no subsequent PCM {summary['recoveryNoSubsequentPCM']}.")
line('Response latency (ms): '+json.dumps(summary['recoveryResponseMs']))
line('Recovery guard audit: first requires actual PCM progress, idle>=750ms and buffer<=250ms; second without new progress waits>=1500ms; max2/range; new text resets attempts.1ms observation tolerance. Gateway flush ACK is not an ElevenLabs generation ACK. Next PCM correlation does not prove recovery caused it. Target-text ledger equality and unique PCM sample ranges audit application replay; no acoustic output transcript or human listening proves absence of repeated spoken words inside fresh PCM.')
line('\nVOICE / QUEUE DRAIN / TAIL')
line('Provenance, clipping and peak protection totals: '+json.dumps(summary['voiceEvidence']))
line('Check counts across all recorded attempts: '+json.dumps(summary['checkCounts']))
line('Only measured voice-enabled runs can establish voice settings/provenance. Requested gain remains3.5573605757216837; existing protection may lower effective per-block gain. All speed, connection, sample-order and queue evidence is in runs.csv. A zero queue after cleanup is not proof of successful drain. The stricter completion audit is retained in review.json. Its preCleanupSnapshot is before the harness end call; on automatic production failure, production may already have performed its own cleanup. The independent continuous timeline supplies true pre-failure observations in those cases.')
line('Verified-run tail stage statistics (ms; stages may overlap prior playback and separate medians are not additive): '+json.dumps(summary['tailBreakdownVerifiedStats']))
line('Tail remains actual detected source end→detected target signal end when verified. Rendered WAVs, when generated, reconstruct scheduled post-gain PCM and contain zero samples where none was scheduled. Canceled partial blocks are truncated at the recorded cancellation playback-finish time when available; they are not physical recordings or proof of final-word completion. Source/target signal thresholds do not identify exact spoken words.')
line('Usage evidence, not a billing statement: '+json.dumps(summary['usageEvidence']))
line('\nEVERY ATTEMPT')
line('run | source | result | delivered ms / planned speech ms | first ms | complete tail ms | largest gap ms | raw/committed WER% | received/committed/translated/spoken | sampled peak buffer ms | error')
for r in runs:line(' | '.join([r['runId'],r['profile'],r['protocolOutcome'],fmt(r['deliveredSpeechClipMs'])+'/'+fmt(r['sourceClipSpeechMs']),fmt(r['firstAudioMs']),fmt(r['tailMs']),fmt(r['largestGapMs']),fmt(r['rawWER'],100)+'/'+fmt(r['committedWER'],100),'/'.join(str(r[k]) for k in ['received','committed','translated','spoken']),fmt(r['maxSampledBufferMs']),r['error'] or '']))
line('\nEVERY BOUNDED GAP >=2s')
for gap in allgaps:
 if not gap['bounded'] or gap['durationMs']<2000:continue
 line(f"run {gap['runId']} gap {gap['gapId']}: {gap['durationMs']:.3f}ms; unit={gap.get('unitId','unmapped')}; afterA/B/C/D="+'/'.join(fmt(gap.get(k)) for k in ['afterA_observedWordsMs','afterB_validatedSourceMs','afterC_targetReadyMs','afterD_textSentMs']))
 for phase in gap.get('phases',[]):line(f"  {phase['stage']}: {phase['ms']:.3f}ms ({phase['startAt']:.3f}→{phase['endAt']:.3f})")
line('\nNON-BOUNDED QUIET >=2s')
for gap in allgaps:
 if not gap['bounded'] and gap['durationMs']>=2000:line(json.dumps(gap,ensure_ascii=False))
line('\nCOMPARISON LIMITS / PHYSICAL ACCEPTANCE')
line('Previous short automated batch:100 attempts,84 verified drains,7 rejected harness completions,9 explicitly failed/interrupted; verified median/p95 first3511.300/4109.233ms, largest gap per run2979.667/4219.333ms, tail12434.367/13868.700ms; raw/committed WER0.321% on6231 eligible words. Candidate is unchanged but corpus/duration and completion harness differ. This is a workload comparison, not evidence of code improvement/regression or a matched physical-before/after test. Earlier physical bee7b25d7.907s semantic-readiness and6.333s PCM-starvation failures cannot be declared eliminated by this batch.')
line('Physical human speech, background noise, microphone/DSP/headphones, acoustic duplicates, Danish pronunciation/naturalness and full translation meaning remain unverified. No acceptance declaration follows automated results. No script-specific production recognition correction, larger buffers, commit, PR or deployment.')
line('\nPRIORITIES FOR A SEPARATELY AUTHORIZED CORRECTION PASS')
line('Investigate bounded pacing/backpressure between translated-text readiness, persistent TTS text submission and queued playback while preserving ordering, consent precision, the30second guard and current voice settings. Expose renderer queue-limit failures with a distinct diagnostic cause so they are not confused with identity or provider availability. Obtain full-reference ASR accuracy evidence only from runs that deliver the complete source and retain provider finals; a separately scoped ASR evaluation could isolate recognition if the output failure prevents this. These are recommendations only. No production correction or extra provider test is performed after observing results.')
validation=ROOT/'validation.json'
if validation.exists():line('\nOFFLINE VALIDATION\n'+validation.read_text())
line('\nARTIFACTS')
line('config.json freezes exact source text/hashes/settings and production fingerprints. progress.json preserves every attempt. runs/NNN contains matching original diagnostics/review exports, before-cleanup audit, source-end snapshot when reached, provider PCM and numbered durable evidence/*.jsonl. analysis.json is derived and never replaces originals. runs.csv, all-gaps.csv, asr-errors.csv, endpoint-chronology.csv, recognition-units.csv, recovery-events.csv and buffer-timeline.csv are complete audit tables. manifest.json hashes artifacts; original production bounded-export losses and independent sequence checks remain explicit. Test tooling only is under scripts/stage196-stress* and scripts/analyze-stage196-stress.py.')
(ROOT/'report.txt').write_text('\n'.join(lines)+'\n')

def timing_chart(key,label,threshold=None):
 values=[(int(r['runId']),r.get(key)) for r in runs if isinstance(r.get(key),(int,float))];maximum=max([v for _,v in values]+([threshold] if threshold else [1]))*1.1
 points=''.join(f'<circle cx="{25+i*17:.1f}" cy="{170-v/maximum*140:.1f}" r="3"><title>Run{i}: {v:.3f}ms</title></circle>' for i,v in values)
 target='' if threshold is None else f'<path d="M25 {170-threshold/maximum*140:.1f}H900" stroke="#b95533" stroke-dasharray="4 4"/>'
 return f'<section><h2>{html.escape(label)}</h2><svg viewBox="0 0 930 195"><path d="M25 20V170H900" fill="none" stroke="#9aa"/>{target}<g fill="#176568">{points}</g><text x="25" y="190">Run1 →50 · max scale {maximum:.0f}ms</text></svg></section>'
page='''<!doctype html><html lang="en"><meta charset="utf-8"><title>Stage1.9.6 ·50 sustained stress tests</title><style>body{font:15px system-ui;background:#f1f5f4;color:#173b3c;max-width:1300px;margin:28px auto;padding:0 20px}h1{font-size:30px}.notice{background:#fff0de;border-left:5px solid #bb6239;padding:18px}section{background:white;padding:18px;margin:18px 0}.kpis{display:flex;gap:18px;flex-wrap:wrap}.kpis strong{display:block;font-size:29px}table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:10px;text-align:left;border-bottom:1px solid #ddd}th{cursor:pointer}a{color:#176568}svg{width:100%;max-height:240px}</style><h1>Stage1.9.6 · Sustained live stress tests</h1>'''
page+=f'<p class="notice"><b>NOT ACCEPTED · '+('FINAL' if len(runs)==50 else 'PROVISIONAL')+f'</b><br>{len(runs)}/50 attempts recorded; {summary["verifiedDrained"]} verified drains; {summary["failed"]} failed/interrupted. Live providers, synthetic128–147second speech, silent renderer. Physical acceptance remains pending.</p>'
page+='<div class="kpis">'+''.join('<section>'+html.escape(label)+'<strong>'+html.escape(value)+'</strong></section>' for label,value in [('Verified drains',str(summary['verifiedDrained'])+'/'+str(len(runs))),('Full source delivered',str(summary['fullDurationSourcesDelivered'])),('Median first audio',fmt(summary['metrics']['firstAudioMs']['median'])+'ms'),('Raw WER','N/A' if summary['rawWeightedWER']['WER'] is None else fmt(summary['rawWeightedWER']['WER'],100)+'%'),('Committed WER','N/A' if summary['committedWeightedWER']['WER'] is None else fmt(summary['committedWeightedWER']['WER'],100)+'%')])+'</div>'
page+='<p>'+ ' · '.join('<a href="'+name+'">'+label+'</a>' for name,label in [('report.txt','Full forensic report'),('runs.csv','All attempts'),('all-gaps.csv','Every gap'),('recognition-units.csv','Every committed unit'),('endpoint-chronology.csv','ASR endpoint chronology'),('recovery-events.csv','Recovery controls'),('buffer-timeline.csv','Buffer timeline'),('asr-errors.csv','WER edits'),('summary.json','Summary'),('manifest.json','Evidence hashes')])+'</p>'
page+='<section><h2>What this tests</h2><p>Five novel406–410word passages cover sustained clauses, corrections/numbers, consent, negation and sentence boundaries. Three offline voices; ten planned attempts per passage. Production settings and safeguards are unchanged. Strict pre-cleanup word/unit/sample drain is required; cleanup zeros cannot create a pass.</p><p>Independent numbered evidence chunks retain raw ASR gateway partials/finals, audio audit events and pipeline snapshots throughout each run. Provider keys and the reference corpus are never supplied as recognition hints.</p></section>'
page+='<section><h2>Continuity and failure evidence</h2><p>'+str(summary['gapsGT2s'])+' gaps exceeded2seconds; '+str(summary['longGapAfterValidatedSourceGT2s'])+' exceeded2seconds after validated source commitment. Dominant phases: '+html.escape(json.dumps(summary['longGapDominantPhases']))+'.</p><p>Failure qualifications: '+html.escape(json.dumps(summary['failureQualifications']))+'. Queue-limit attribution is an evidence-based inference; the generic client error hides its underlying exception. The30second guard remains intact.</p><p>'+str(summary['recoveryCount'])+' recovery controls; '+str(summary['secondRecoveryCount'])+' second attempts; '+str(summary['recoveryNextPCMWithin2s'])+'/'+str(summary['recovery2sWindowObserved'])+' observable responses within2seconds. Follow-up does not prove causation.</p></section>'
page+='<section><h2>Voice and accuracy</h2><p>'+html.escape(json.dumps(summary['voiceEvidence']))+'</p><p>Raw S/D/I: '+str(summary['rawWeightedWER']['S'])+'/'+str(summary['rawWeightedWER']['D'])+'/'+str(summary['rawWeightedWER']['I'])+' across'+str(summary['rawWeightedWER']['referenceWords'])+' eligible reference words. Numerical formats and spelling variants are counted literally; exact edits remain inspectable. Incomplete ASR is excluded from accuracy denominators, not scored as0%WER.</p></section>'
if summary['eligibleForWER']==0:page=page.replace('Raw S/D/I: 0/0/0 across0 eligible reference words.','Full-reference WER and S/D/I: not scored; no eligible complete source/finalization.')
if summary['recoveryCount']==0:page=page.replace('0 recovery controls; 0 second attempts; 0/0 observable responses within2seconds. Follow-up does not prove causation.','Residual recovery did not fire in this batch; no response-rate estimate is available.')
page+='<section><h2>Measurement limits</h2><p>Planned speech recordings span128–147seconds. Failures ended input early: actual delivered speech spans75.1–135.7seconds. Gap counts are reconstructed from the complete saved PCM using20ms post-gain RMS windows at0.005. Some final production gap histories evicted early records. These are digital renderer measurements; physical headphone acceptance remains pending.</p></section>'
page+=timing_chart('firstAudioMs','First target signal latency',5000)+timing_chart('largestGapMs','Largest bounded gap per run',2000)+timing_chart('maxSampledBufferMs','Sampled peak playback buffer',30000)+timing_chart('tailMs','Verified source end → target end tail')
page+='<section><h2>All recorded attempts</h2><p>Click a heading to sort. Click run number for the complete analysis.</p><table><thead><tr>'+''.join('<th>'+x+'</th>' for x in ['Run','Source','Result','Delivered s','First ms','Tail ms','Gap ms','Peak buffer ms','Raw WER%','Committed WER%','Error'])+'</tr></thead><tbody>'
for r in runs:page+='<tr><td><a href="runs/'+r['runId']+'/analysis.json">'+r['runId']+'</a></td>'+''.join('<td>'+html.escape(str(value))+'</td>' for value in [r['profile'],r['protocolOutcome'],fmt(r['deliveredSpeechClipMs']/1000),fmt(r['firstAudioMs']),fmt(r['tailMs']),fmt(r['largestGapMs']),fmt(r['maxSampledBufferMs']),fmt(r['rawWER'],100),fmt(r['committedWER'],100),r['error'] or ''])+'</tr>'
page+='''</tbody></table></section><script>document.querySelectorAll('th').forEach((h,i)=>h.onclick=()=>{const body=document.querySelector('tbody');[...body.rows].sort((a,b)=>a.cells[i].textContent.localeCompare(b.cells[i].textContent,undefined,{numeric:true})).forEach(r=>body.append(r));});</script></html>'''
page=page.replace('Stage1.9.6','Stage 1.9.6').replace('synthetic128','synthetic 128').replace('novel406','novel 406')
(ROOT/'report.html').write_text(page)
