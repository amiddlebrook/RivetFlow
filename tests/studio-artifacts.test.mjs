import test from 'node:test';
import assert from 'node:assert/strict';
import {runbookFor} from '../public/studio.js';
import {downloadArtifact} from '../public/studio-export.js';
test('studio supports explicit domain-specific artifact export',()=>{assert.equal(typeof runbookFor,'function');assert.equal(typeof downloadArtifact,'function');});
test('domain report derives truthful, bounded artifacts from selected records',()=>{  const w={id:'wf',name:'approval',steps:[{name:'Review',kind:'approval'}]};const doc=runbookFor(w,{id:'r',status:'waiting_approval',cursor:0},[{run_id:'r',step_index:0,status:'pending'}]);assert.equal(doc.stages[0].state,'awaiting-human');assert.equal(doc.execution.id,'r'); });
