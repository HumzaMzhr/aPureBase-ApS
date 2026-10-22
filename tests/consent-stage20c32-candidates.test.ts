import {readFile} from 'node:fs/promises';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {candidateCatalog,candidateIds,candidateVersionFor,candidatePlans,candidateResponse,candidates,C32CandidatePlayback,successCloseText,verifyCandidate} from '../src/consent/stage32/speech/candidates';
import {currentCatalog} from '../src/consent/corrections/assets';
import {qaResponse} from '../src/consent/corrections/retest';
import {decodeWave} from '../src/consent/approved/assets';
import type {LocalAudioContext} from '../src/consent/approved/localPlayback';
import type {PlaybackRecord} from '../src/consent/types';
import {pronunciationConcerns} from '../src/consent/stage32/hardening/review';

afterEach(()=>vi.restoreAllMocks());

describe('new C-3.2 listening candidates',()=>{
  it('pins three new hashes, the original Why Calling meaning, and approved Success Close wording',async()=>{
    expect(candidates.map(a=>a.phraseId)).toEqual([...candidateIds]);
    const plans=await candidatePlans(),catalog=candidateCatalog();
    for(const candidate of candidates){
      const old=currentCatalog().find(a=>a.phraseId===candidate.phraseId)!;
      const plan=plans.find(p=>p.canonical.phraseId===candidate.phraseId)!;
      expect(candidate.assetHash).not.toBe(old.assetHash);
      expect(candidate.replacesAudioHash).toBe(old.assetHash);
      expect(candidate.wordingVersion).toBe(candidateVersionFor(candidate.phraseId));
      expect(candidate.textHash).toBe(plan.canonical.canonicalTextHash);
      expect(candidate.spokenText).toBe(plan.synthesisText);
      expect(candidate.planHash).toBe(plan.synthesisHash);
      expect(candidate.humanReviewStatus).toBe('HUMAN_REVIEW_PENDING');
      expect(candidate.productionApproved).toBe(false);
      expect(catalog.find(a=>a.phraseId===candidate.phraseId)?.assetHash).toBe(candidate.assetHash);
      await expect(verifyCandidate(candidate,new Uint8Array(await readFile('public'+candidate.path)))).resolves.toMatchObject({clippingEvents:0});
    }
    expect(plans[0].canonical.canonicalText).toBe(currentCatalog().find(a=>a.phraseId==='why-calling')?.text);
    expect(plans[0].synthesisText).toContain('sende dig');
    expect(plans[1].canonical.canonicalText).toBe(successCloseText);
    expect(successCloseText).not.toContain('framelde');
  });

  it('rejects old bytes, substituted version, and changed spoken binding',async()=>{
    for(const candidate of candidates){
      const old=currentCatalog().find(a=>a.phraseId===candidate.phraseId)!;
      await expect(verifyCandidate(candidate,new Uint8Array(await readFile('public'+old.path)))).rejects.toThrow();
      const bytes=new Uint8Array(await readFile('public'+candidate.path));
      await expect(verifyCandidate({...candidate,assetHash:old.assetHash},bytes)).rejects.toThrow();
      await expect(verifyCandidate({...candidate,wordingVersion:old.wordingVersion},bytes)).rejects.toThrow();
      await expect(verifyCandidate({...candidate,spokenText:candidate.spokenText+' ændret'},bytes)).rejects.toThrow();
    }
  });

  it('emits actual WebAudio completion only after source ended for each exact new hash',async()=>{
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>{
      const file=await readFile('public'+url);
      return file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
    }})));
    try{
      for(const candidate of candidates){
        const decoded=decodeWave(new Uint8Array(await readFile('public'+candidate.path)));
        const source={buffer:null as unknown,onended:null as null|(()=>void),connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn()};
        const context={currentTime:1,state:'running',resume:async()=>{},close:async()=>{},
          decodeAudioData:async()=>({numberOfChannels:1,duration:decoded.duration,getChannelData:()=>decoded.samples}) as unknown as AudioBuffer,
          createBuffer:(_channels:number,frames:number,rate:number)=>({length:frames,sampleRate:rate,copyToChannel:vi.fn()}) as unknown as AudioBuffer,
          createBufferSource:()=>source as unknown as AudioBufferSourceNode,destination:{}} as unknown as LocalAudioContext;
        const player=new C32CandidatePlayback(()=>context);
        const record:PlaybackRecord={playbackId:'c32-'+candidate.phraseId,callId:'local-test',phraseId:candidate.phraseId,
          phraseVersion:candidate.wordingVersion,assetId:candidate.path,assetHash:candidate.assetHash,state:'QUEUED',queuedAt:0,
          startedAt:null,completedAt:null,interruptedAt:null,failedAt:null,completionSource:null,recipientRevision:0,answerConsumed:false};
        const events:{action:string;assetHash:string;outputProof?:string}[]=[];
        const playback=player.play(candidateResponse(candidate),record,event=>events.push(event));
        await vi.waitFor(()=>expect(source.start).toHaveBeenCalled());
        expect(events.map(e=>e.action)).toEqual(['start']);
        source.onended?.();
        await playback;
        expect(events.map(e=>e.action)).toEqual(['start','complete']);
        expect(events[1]).toMatchObject({assetHash:candidate.assetHash,outputProof:expect.stringContaining('web-audio-source-ended:'+record.playbackId+':')});
        await expect(player.play(qaResponse(currentCatalog().find(a=>a.phraseId===candidate.phraseId)!),record,()=>{})).rejects.toThrow('Exact C-3.2 version');
        await player.dispose();
      }
    }finally{vi.unstubAllGlobals();}
  });

  it('keeps poor pronunciation visible even where the human status was PASS',()=>{
    const rows=[{phraseId:'why-calling',audioHash:'a'.repeat(64),status:'PASS' as const,pronunciation:2},
      {phraseId:'success-close',audioHash:'b'.repeat(64),status:'FAIL' as const,pronunciation:2}];
    expect(pronunciationConcerns(rows as unknown as Parameters<typeof pronunciationConcerns>[0])).toEqual([
      expect.objectContaining({phraseId:'why-calling',reportedStatus:'PASS',pronunciation:2}),
      expect.objectContaining({phraseId:'success-close',reportedStatus:'FAIL',pronunciation:2})]);
  });
});
