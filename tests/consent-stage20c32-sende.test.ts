import {it,expect} from 'vitest';
import {sendePlans,validateSendePlan} from '../src/consent/stage32/speech/sendePlan';
it('bounds provider-only senne respelling to the two reviewed phrases without changing canonical text',async()=>{const plans=await sendePlans();expect(plans.map(p=>p.phraseId)).toEqual(['why-calling','clarify']);for(const p of plans){await expect(validateSendePlan(p)).resolves.toBeUndefined();expect(p.canonicalText).toContain('sende');expect(p.canonicalText).not.toContain('senne');expect(p.synthesisText).toContain('senne');expect((p.synthesisText.match(/\bsenne\b/gu)??[])).toHaveLength(1);}expect(plans.reduce((n,p)=>n+p.characters,0)).toBe(178);});
it('rejects extra wording, altered recipient scope, voice or aliases',async()=>{for(const p of await sendePlans())for(const change of [{canonicalText:p.canonicalText.replace('sende','senne')},{synthesisText:p.synthesisText+' Ja'},{phraseId:'consent-question'},{voice:{...p.voice,speed:1}},{requestedRendering:{source:'relevant',rendered:'invented',scope:'GLOBAL'}}])await expect(validateSendePlan({...p,...change} as never)).rejects.toThrow();});

import {readFile} from 'node:fs/promises';
import {afterEach,vi} from 'vitest';
import {sendeAssets} from '../src/consent/stage32/speech/sende';
import {verifySendeBinding} from '../src/consent/stage32/speech/sendePlan';
import {candidates,candidateResponse,verifyCandidate} from '../src/consent/stage32/speech/candidates';
import {C32Playback,currentC32Asset,currentC32Response,c32Definition} from '../src/consent/stage32/speech/current';
import {currentAssetTable} from '../src/consent/stage32/feedback/closure';
import {decodeWave} from '../src/consent/approved/assets';
import type {LocalAudioContext} from '../src/consent/approved/localPlayback';
import type {PlaybackRecord} from '../src/consent/types';
afterEach(()=>vi.unstubAllGlobals());
it.each(sendeAssets)('selects and verifies the exact new $phraseId bytes while preserving the old recording',async a=>{
 const old=candidates.find(c=>c.phraseId===a.phraseId)!;
 await expect(verifyCandidate(old,new Uint8Array(await readFile('public'+old.path)))).resolves.toMatchObject({clippingEvents:0});
 const bytes=new Uint8Array(await readFile('public'+a.path));
 await expect(verifySendeBinding(a,bytes)).resolves.toMatchObject({clippingEvents:0});
 expect(currentC32Asset(a.phraseId)).toEqual(a);expect(c32Definition.responses.find(r=>r.id===a.phraseId)?.audio?.sha256).toBe(a.assetHash);
 expect(()=>currentC32Response(old)).toThrow();
 const row=(await currentAssetTable()).rows.find(r=>r.phraseId===a.phraseId)!;
 expect(row.historicalAssetHashes).toContain(old.assetHash);expect(row.humanRatingForCurrentHash).toEqual([]);expect(row.humanStatus).toBe('NEW_CANDIDATE_HUMAN_REVIEW_PENDING');
 for(const change of [{assetHash:old.assetHash},{spokenText:old.spokenText},{wordingVersion:old.wordingVersion},{text:a.text.replace('sende','senne')},{voice:{...a.voice,speed:1}},{productionApproved:true}])await expect(verifySendeBinding({...a,...change} as never,bytes)).rejects.toThrow();
 await expect(verifySendeBinding(a,new Uint8Array(await readFile('public'+old.path)))).rejects.toThrow();
});
it.each(sendeAssets)('plays $phraseId through the public current player and completes only on actual source end',async a=>{
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>{const file=await readFile('public'+url);return file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);}})));
 const pcm=decodeWave(new Uint8Array(await readFile('public'+a.path)));
 const source={buffer:null as unknown,onended:null as null|(()=>void),connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn()};
 const context={currentTime:1,state:'running',resume:async()=>{},close:async()=>{},decodeAudioData:async()=>({numberOfChannels:1,duration:pcm.duration,getChannelData:()=>pcm.samples}) as unknown as AudioBuffer,createBuffer:(_c:number,frames:number,rate:number)=>({length:frames,sampleRate:rate,copyToChannel:vi.fn()}) as unknown as AudioBuffer,createBufferSource:()=>source as unknown as AudioBufferSourceNode,destination:{}} as unknown as LocalAudioContext;
 const player=new C32Playback(undefined,()=>context),record={playbackId:'senne-'+a.phraseId,callId:'local-test',phraseId:a.phraseId,phraseVersion:a.wordingVersion,assetId:a.path,assetHash:a.assetHash,state:'QUEUED',queuedAt:0,startedAt:null,completedAt:null,interruptedAt:null,failedAt:null,completionSource:null,recipientRevision:0,answerConsumed:false} as PlaybackRecord;
 const events:{action:string;assetHash:string;outputProof?:string}[]=[];
 const playback=player.play(currentC32Response(a),record,e=>events.push(e));await vi.waitFor(()=>expect(source.start).toHaveBeenCalled());expect(events.map(e=>e.action)).toEqual(['start']);source.onended?.();await playback;
 expect(events.map(e=>e.action)).toEqual(['start','complete']);expect(events[1]).toMatchObject({assetHash:a.assetHash,outputProof:expect.stringContaining('web-audio-source-ended:')});
 await expect(player.play(candidateResponse(candidates.find(c=>c.phraseId===a.phraseId)!),record,()=>{})).rejects.toThrow('Historical C32');await player.dispose();
});
