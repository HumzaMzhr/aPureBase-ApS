import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LocalTestView} from '../src/streaming/LocalTestView';
import {StreamingView} from '../src/streaming/View';
it('renders a local test with both directions and no invitation controls',()=>{
 const html=renderToStaticMarkup(<LocalTestView developer={false}/>);
 expect(html).not.toContain('Export last session diagnostics');
 expect(html).toContain('English → Danish');expect(html).toContain('Danish → English');expect(html).toContain('REALTIME INTERPRETER');expect(html).toContain('>START<');expect(html).toContain('STOP');expect(html).toContain('Source transcript');expect(html).toContain('Translated transcript');
 expect(html).not.toContain('Translation path');expect(html).not.toContain('Direct speech-to-speech');expect(html).not.toContain('Use controlled complete-turn fallback');expect(html).toContain('COMMITTED');expect(html).toContain('PARTIAL');
 expect(html).not.toContain('ACTUAL FIRST-AUDIO LATENCY');expect(html).not.toContain('ESTIMATED SEMANTIC BACKLOG');expect(html).not.toContain('Create invitation');expect(html).not.toContain('Clinic reply');expect(html).not.toContain('Connect clinic');
});
it('renders every required developer metric and semantic/chunk events',()=>{
 const html=renderToStaticMarkup(<LocalTestView developer/>);
 expect(html).toContain('Export last session diagnostics');expect(html).toContain('Nothing is uploaded');
 for(const label of ['ACTUAL FIRST-AUDIO LATENCY','ACTUAL END-TAIL LATENCY','TARGET AUDIO LEAD','TRAILING TAIL = max(0, target audio end − source speech end)','SOURCE SPEECH ENDED AT','TARGET AUDIO ENDED AT','ESTIMATED SEMANTIC BACKLOG','Estimated semantic backlog · median','Estimated semantic backlog · p95','Latest semantic-unit timing','Semantic / chunk events','Translation path','TRANSLATION ENGINE','VOICE ENGINE','VOICE:','MODEL:','Processing positions'])expect(html).toContain(label);
});
it('preserves the paired agent and clinic controls',()=>{
 const agent=renderToStaticMarkup(<StreamingView role="agent" developer={false}/>),clinic=renderToStaticMarkup(<StreamingView role="clinic" developer={false}/>);
 expect(agent).toContain('Create invitation');expect(agent).toContain('Connect clinic');expect(agent).toContain('Start interpreter');expect(agent).not.toContain('START LOCAL TEST');
 expect(clinic).toContain('Create clinic reply');expect(clinic).toContain('Enable microphone &amp; headphones');expect(clinic).not.toContain('START LOCAL TEST');
});
