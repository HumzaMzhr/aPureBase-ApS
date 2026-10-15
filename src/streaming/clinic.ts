import {ParticipantPeer} from './peer';
import {ContinuousPcmScheduler,type PlaybackHooks} from './scheduler';
import {IsolatedMicrophone} from './input';
import {DanishVoiceLock,type VoiceIdentity} from './voiceIdentity';
export class ClinicAudio {
 private voiceLock=new DanishVoiceLock();private voice?:VoiceIdentity;private context?:AudioContext;private mic=new IsolatedMicrophone();private scheduler?:ContinuousPcmScheduler;private turn?:number;private sessionId=0;private enabled=false;ready=false;
 constructor(private peer:ParticipantPeer,private failed:(error:Error)=>void){}
 async prepare(microphone:string,output:string){const context=new AudioContext({sampleRate:24000});this.context=context;await context.resume();const sink=context as AudioContext&{setSinkId?:(id:string)=>Promise<void>};if(output&&!sink.setSinkId)throw new Error('Output selection requires Chrome.');if(sink.setSinkId)await sink.setSinkId(output);await this.mic.prepare(microphone,bytes=>{if(this.enabled)this.peer.sendPcm('HCP_INPUT_DA',this.sessionId,bytes);},this.failed);this.ready=true;this.peer.send({type:'ready',ready:true});}
 private hooks():PlaybackHooks{const send=(event:string,id:string,at:number)=>this.peer.send({type:'playback',turn:this.turn,event,id,at});return{progress:(id,fraction,at)=>this.peer.send({type:'playback_progress',turn:this.turn,id,fraction,at,remainingMs:this.scheduler?.queuedMs}),firstAudio:(id,at)=>send('firstAudio',id,at),scheduled:(id,at)=>send('scheduled',id,at),started:(id,at)=>send('started',id,at),finished:(id,at)=>send('finished',id,at),underrun:ms=>this.peer.send({type:'underrun',ms,turn:this.turn})};}
 message(data:Record<string,unknown>){try{if(data.type==='audio_open'){if(!this.context||!this.ready)throw new Error('Enable clinic headphones first.');if(this.scheduler)throw new Error('Danish output already has an owner.');if(typeof data.turn!=='number'||![100,200,300,400].includes(Number(data.jitterMs)))throw new Error('Invalid stream configuration.');this.voice=this.voiceLock.accept(data.voice);this.turn=data.turn;this.scheduler=new ContinuousPcmScheduler(this.context,'clinic','HCP_OUTPUT_DA',Number(data.jitterMs),this.hooks(),undefined,this.voice);}
 if(data.type==='audio_mark'){if(data.turn!==this.turn||typeof data.id!=='string')return;this.scheduler?.mark(data.id,Number(data.start),Number(data.end),data.complete===true);}
 if(data.type==='audio_end'&&data.turn===this.turn){const scheduler=this.scheduler;const turn=this.turn;void scheduler?.finish().then(()=>{if(this.scheduler===scheduler){this.scheduler=undefined;this.turn=undefined;}if(this.peer.connected)this.peer.send({type:'audio_drained',turn});}).catch(this.failed);}
 if(data.type==='audio_cancel'&&data.turn===this.turn){this.scheduler?.cancel();this.scheduler=undefined;this.turn=undefined;}
 if(data.type==='input_enabled'){if(typeof data.sessionId!=='number')throw new Error('Missing source session identity.');this.sessionId=data.sessionId;this.enabled=data.enabled===true;this.mic.enable(this.enabled);}
 if(data.type==='checkpoint')void this.finish();
 if(data.type==='session_end'){this.cancel();if(this.peer.connected)this.peer.send({type:'ready',ready:false});}
 }catch(error){this.failed(error instanceof Error?error:new Error('Clinic audio failed.'));}}
 pcm(turn:number,bytes:Uint8Array){if(turn!==this.turn||!this.scheduler)return;this.scheduler.push(bytes,this.voice);}
 async finish(){await this.mic.checkpoint();this.peer.send({type:'checkpointed'});this.peer.send({type:'finish_source',sessionId:this.sessionId});}
 cancel(){this.enabled=false;this.ready=false;this.mic.cancel();this.scheduler?.cancel();this.scheduler=undefined;void this.context?.close();this.context=undefined;}
}
