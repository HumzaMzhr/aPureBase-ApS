import {terminal,type CallLifecycle} from './types';
const transitions:Record<CallLifecycle,CallLifecycle[]>={NOT_STARTED:['CREATING','FAILED'],CREATING:['RINGING','ANSWERED','ENDING','FAILED'],RINGING:['ANSWERED','ENDING','FAILED'],ANSWERED:['MEDIA_CONNECTING','ENDING','FAILED'],MEDIA_CONNECTING:['ACTIVE','ENDING','FAILED'],ACTIVE:['TAKEOVER','ENDING','FAILED'],TAKEOVER:['ENDING','FAILED'],ENDING:['ENDED','FAILED'],ENDED:[],FAILED:[]};
export class CallState {
 private value:CallLifecycle='NOT_STARTED';
 get state(){return this.value;}
 move(next:CallLifecycle){if(next===this.value)return false;if(terminal(this.value))return false;if(!transitions[this.value].includes(next))throw new Error(`Invalid call transition ${this.value} -> ${next}`);this.value=next;return true;}
}
