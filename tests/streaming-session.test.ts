vi.mock('../src/streaming/continuousRecognition',()=>({ContinuousRecognitionDirection:class{feed=observed.feed;cancel=observed.cancel;}}));
import {it,expect,vi} from 'vitest';
import {StreamingHost} from '../src/streaming/host';
import type {ParticipantPeer} from '../src/streaming/peer';
const observed=vi.hoisted(()=>({feed:vi.fn(),cancel:vi.fn()}));
vi.mock('../src/streaming/recognition',()=>({RecognitionDirection:class{feed=observed.feed;cancel=observed.cancel;}}));
it('never routes old participant source frames into a newly started session',()=>{const peer={connected:false,send:vi.fn()} as unknown as ParticipantPeer;const options={microphone:'',output:'',jitterMs:100,bargeIn:false,forceControlled:false,protectedTerms:[],warningLagMs:5000,maxLagMs:15000,conversationContext:''};const first=new StreamingHost(peer,options,()=>{});const old=first.sourceGeneration;first.end();const next=new StreamingHost(peer,options,()=>{});next.running=true;const pcm=new Uint8Array(4800);next.remotePcm(old,pcm);expect(observed.feed).not.toHaveBeenCalled();next.remotePcm(next.sourceGeneration,pcm);expect(observed.feed).toHaveBeenCalledOnce();expect(next.sourceGeneration).not.toBe(old);next.end();});
