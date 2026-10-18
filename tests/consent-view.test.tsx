import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsentWorkspace } from '../src/consent/ConsentWorkspace';
import { ConsentSession } from '../src/consent/session';
import { TakeoverPanel } from '../src/consent/TakeoverPanel';

it('renders three operator panels, explicit review controls and disabled production Play without acquiring audio/providers', () => {
  const network = vi.fn(() => { throw new Error('Unexpected provider request'); });
  vi.stubGlobal('fetch', network); vi.stubGlobal('WebSocket', network); vi.stubGlobal('AudioContext', network);
  try {
    const html = renderToStaticMarkup(<ConsentWorkspace/>);
    for (const label of ['Danish transcript', 'Conversation guidance', 'Agent controls', 'English meaning', 'Detected intent', 'YES', 'NO', 'UNCLEAR', 'HUMAN TAKEOVER', 'END CALL', 'REPEAT', 'SKIP', 'OFFLINE REHEARSAL', 'not connected', 'Export local review']) expect(html.toLowerCase()).toContain(label.toLowerCase());
    expect(html).toMatch(/<button[^>]*disabled[^>]*>PLAY RECOMMENDED RESPONSE<\/button>/);
    expect(network).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
it('renders uncertain text and meaning escaped, never as executable markup', () => {
  const session = new ConsentSession('view-test', { now: () => 1 });
  session.receive({ id: '1', text: '<img onerror=evil()>', english: '<script>attack</script>', final: true, observedAt: 1, source: 'manual-rehearsal' });
  const html = renderToStaticMarkup(<ConsentWorkspace initialSession={session}/>);
  expect(html).toContain('&lt;img'); expect(html).not.toContain('<script>attack');
  expect(html).toContain('QUESTION_UNKNOWN');
});
it('reuses the existing paired interpreter in takeover with manual start and honest transport boundary', () => {
  const html = renderToStaticMarkup(<TakeoverPanel context={{ callId: 'shared-call-id', reason: 'Complex question' }}/>);
  expect(html).toContain('shared-call-id'); expect(html).toContain('not been transferred');
  expect(html).toContain('Create invitation'); expect(html).toContain('Start interpreter');
  expect(html).not.toContain('Finalize local rehearsal review');
});
