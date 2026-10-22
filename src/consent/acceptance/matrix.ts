import { listeningCatalog } from './catalog';
import type { ListeningRegistry } from './listening';
export type FacetStatus='PASS'|'FAIL'|'NOT_TESTED'|'BLOCKED';
export const facets=['Static Danish listening','Dynamic email listening','Dynamic name listening','Volume consistency','Physical playback','Microphone input','ASR accuracy','Speech onset ownership','Question completion','Barge-in','Repeat','Stale YES','Consent guard','Email readback','Email correction','Authority','Intermediary','Human takeover','Call duration','Telephone adapter readiness'] as const;
export function acceptanceMatrix(registry:ListeningRegistry,automated:readonly string[]=[],physicalFacets:Partial<Record<typeof facets[number],{status:FacetStatus;reviewer:string;note:string;at:string}>>={},catalog:readonly typeof listeningCatalog[number][]=listeningCatalog){
 return facets.map(facet=>{const decision=physicalFacets[facet];let status:FacetStatus=decision?.status??'NOT_TESTED',basis=decision?'EXPLICIT_HUMAN_FACET_REVIEW':'NO_PHYSICAL_EVIDENCE';
  const group=facet==='Static Danish listening'?catalog.filter(a=>!('binding'in a)):facet==='Dynamic email listening'?catalog.filter(a=>'binding'in a&&a.binding.slot.kind==='EMAIL'):facet==='Dynamic name listening'?catalog.filter(a=>'binding'in a&&a.binding.slot.kind==='NAME'):undefined;
  if(group){status=group.some(a=>registry.decision(a)==='HUMAN_LISTENING_REJECTED')?'FAIL':group.every(a=>registry.futureProductionListeningEligible(a))?'PASS':'NOT_TESTED';basis='EXPLICIT_HUMAN_ASSET_REVIEWS';}
  return{facet,status,basis,automatedTested:automated.includes(facet),automatedResult:automated.includes(facet)?'PASS':'NOT_TESTED',humanReview:decision,telephoneVerified:false};
 });
}
