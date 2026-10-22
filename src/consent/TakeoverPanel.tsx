import { StreamingView } from '../streaming/View';
import type { TakeoverContext } from './session';

/** The original view owns its transport and starts only on operator actions.
 * Unmounting it invokes the existing end/cancel/peer.close cleanup. */
export function TakeoverPanel({ context }: { context: TakeoverContext }) {
  return <section aria-label="Stage 1.9.6 human takeover">
    <h2>Human takeover · Stage 1.9.6 realtime interpreter</h2>
    <p>Hybrid call {context.callId} · {context.reason}</p>
    <p>The hybrid audit is retained. Pairing and interpreter start require your actions. An existing phone transport has not been transferred.</p>
    <StreamingView role="agent" developer={false}/>
  </section>;
}
