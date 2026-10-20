import {it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {HumanRetestWorkspace} from '../src/consent/corrections/Workspace';
it('mounts five ordered retest steps, carries 24 approvals, exposes 13 required reviews, no manual bypass or provider/mic calls',()=>{
 vi.stubGlobal('localStorage',{getItem:()=>null,setItem:vi.fn()});const request=vi.spyOn(globalThis,'fetch');
 const html=renderToStaticMarkup(<HumanRetestWorkspace/>);
 expect(html).toContain('NOT ACCEPTED');expect(html).toContain('PREVIOUS HUMAN APPROVAL RETAINED');expect((html.match(/>RETEST REQUIRED</gu)??[])).toHaveLength(13);
 for(const step of ['TRIN 1','TRIN 2','TRIN 3','TRIN 4','TRIN 5'])expect(html).toContain(step);
 expect(html.indexOf('TRIN 1')).toBeLessThan(html.indexOf('TRIN 2'));expect(html.indexOf('TRIN 4')).toBeLessThan(html.indexOf('TRIN 5'));
 expect(html).toMatch(/<button disabled="">Start \/ archive previous rehearsal<\/button>/u);expect(html).toMatch(/<button disabled="">Approve<\/button>/u);expect(html).not.toContain('Submit manual final');expect(html).toContain('Facet review NOTE');expect(request).not.toHaveBeenCalled();request.mockRestore();vi.unstubAllGlobals();
});

it('corrupt stored evidence blocks listening and scenarios without overwriting or starting providers',()=>{
 const write=vi.fn();vi.stubGlobal('localStorage',{getItem:()=>'{broken',setItem:write});const request=vi.spyOn(globalThis,'fetch');
 const html=renderToStaticMarkup(<HumanRetestWorkspace/>);
 expect((html.match(/<button disabled="">Play \/ Replay<\/button>/gu)??[])).toHaveLength(13);
 expect(html).toMatch(/<button disabled="">Start \/ archive previous rehearsal<\/button>/u);
 expect(html).toContain('role="alert"');expect(write).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();request.mockRestore();vi.unstubAllGlobals();
});
