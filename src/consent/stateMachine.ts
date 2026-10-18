import type { ConversationDefinition, State } from './types';

export function isTerminal(state: State) { return state.startsWith('END_'); }
export function transition(definition: ConversationDefinition, state: State, event: string): State {
  const next = definition.transitions[state][event];
  if (!next) throw new Error(`Event ${event} is not allowed in ${state}.`);
  return next;
}
