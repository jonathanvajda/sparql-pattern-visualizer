import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { libraryStores, importQueryFiles, loadLibrary, parseOntology, readAdditionalQueryStore } from '../docs/app/query-library-store.js';

const runtime = vm.createContext({ AbortSignal, AbortController, TextDecoder, TextEncoder, setTimeout, clearTimeout, queueMicrotask });
runtime.self = runtime;
for (const name of ['sparqljs.umd.js', 'n3.min.js']) vm.runInContext(readFileSync(new URL(`../docs/vendor/${name}`, import.meta.url), 'utf8'), runtime);
globalThis.window = { sparqljs: runtime.sparqljs, N3: runtime.N3 };
const query = 'PREFIX ex:<https://example.org/> SELECT * WHERE {ex:device ex:number ex:phone}';
beforeEach(() => { globalThis.indexedDB = new IDBFactory(); });

test('query imports survive a fresh store read and initialize the shared schema', async () => {
  await importQueryFiles([new File([query], 'phones.rq')]);
  const loaded = await loadLibrary();
  assert.equal(loaded.queries[0].query, query);
  assert.ok(loaded.queries[0].iris.has('https://example.org/phone'));
  assert.deepEqual((await indexedDB.databases()).map(db => db.name), ['OntologyWorkbenchProjects']);
});

test('saved ontology source and searchable annotations persist together', async () => {
  await parseOntology('@prefix ex:<https://example.org/>. @prefix rdfs:<http://www.w3.org/2000/01/rdf-schema#>. ex:phone rdfs:label "Telephone number".', 'phones.ttl');
  const loaded = await loadLibrary();
  assert.equal(loaded.queries.length, 0);
  assert.equal(loaded.terms[0].labels[0], 'Telephone number');
  assert.ok(loaded.artifacts.find(a => a.artifactKind === 'ontology-rdf').payload.includes('rdfs:label'));
});

test('active-project imports are isolated from the default workspace', async () => {
  const initial = await libraryStores();
  await initial.settings.writeSettingValue('workspace.activeProjectId', 'project:other');
  await importQueryFiles([new File([query], 'other.rq')]);
  assert.equal((await loadLibrary()).projectId, 'project:other');
  await initial.settings.writeSettingValue('workspace.activeProjectId', initial.projectId);
  assert.equal((await loadLibrary()).queries.length, 0);
});

test('failed imports report errors; missing external databases are never created', async () => {
  await assert.rejects(importQueryFiles([new File(['not a query'], 'bad.rq')]), /no supported/);
  await assert.rejects(readAdditionalQueryStore('nonexistent', 'queries'), /not found/);
  assert.equal((await indexedDB.databases()).some(db => db.name === 'nonexistent'), false);
  assert.equal((await loadLibrary()).queries.length, 0);
});
