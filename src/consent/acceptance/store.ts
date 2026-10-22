import { ListeningRegistry } from './listening';
import type { PhysicalRehearsal } from './rehearsal';
import type { FacetStatus, facets } from './matrix';
export type RehearsalExport=ReturnType<PhysicalRehearsal['export']>;
export const acceptanceStorageKey='apurebase.stage20c3.acceptance.v1';
export class AcceptanceStore {
 registry:ListeningRegistry;history:RehearsalExport[]=[];facetReviews:Partial<Record<typeof facets[number],{status:FacetStatus;reviewer:string;note:string;at:string}>>={};scores:{callId:string;turnId:string;reference:string;hypothesis:string;reviewer:string;at:string}[]=[];restoreError?:string;
 constructor(private storage?:Pick<Storage,'getItem'|'setItem'>,registry=new ListeningRegistry()){this.registry=registry;try{const raw=storage?.getItem(acceptanceStorageKey);if(raw){const data=JSON.parse(raw);if(data.version!=='stage20c3-local-1'||!Array.isArray(data.history)||data.history.length>60||!Array.isArray(data.scores))throw new Error('Invalid acceptance archive');this.registry.restore(data.listening);this.history=data.history;this.facetReviews=data.facetReviews??{};this.scores=data.scores;if(data.current)this.history.push(data.current);}}catch(e){this.restoreError=e instanceof Error?e.message:'Stored archive unavailable';}}
 save(current?:RehearsalExport){if(this.history.length>60)throw new Error('Archive full; export before another rehearsal.');this.storage?.setItem(acceptanceStorageKey,JSON.stringify(this.export(current)));}
 export(current?:RehearsalExport){return structuredClone({version:'stage20c3-local-1',listening:this.registry.export(),history:this.history,current,facetReviews:this.facetReviews,scores:this.scores,sourceAudioStored:false,telephoneVerified:false,productionEnabled:false});}
}
