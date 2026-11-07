import { createProjectPortfolioStores, openProjectPortfolioDatabase, DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID, ensureProjectPortfolioProject } from '../packages/indexeddb-data-management/src/project-portfolio-store.js';
import { inspectLegacyIndexedDbDatabase, readLegacyObjectStoreRows } from '../packages/indexeddb-data-management/src/legacy-migration.js';
import { extractLibraryQueries, ontologyTerms, queryResourceIris } from './query-library.js';
import { parseSparqlToAst } from './core_parse.js';

export async function libraryStores() {
  const db = await openProjectPortfolioDatabase();
  const initial = createProjectPortfolioStores(db);
  const projectId = await initial.settings.readSettingValue('workspace.activeProjectId', DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID);
  return createProjectPortfolioStores(db, { projectId });
}

export async function loadLibrary() {
  const stores = await libraryStores();
  const artifacts = await stores.artifacts.listProjectArtifacts(stores.projectId);
  const queries = [];
  for (const artifact of artifacts) {
    if (/ontology|rdf|graph/.test(artifact.artifactKind || '') && artifact.artifactKind !== 'competency-question-set') continue;
    const payload = artifact.payload instanceof Blob ? await artifact.payload.text() : artifact.payload;
    queries.push(...extractLibraryQueries(payload, artifact));
  }
  const warnings = [];
  if (stores.projectId === DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID) {
    for (const [databaseName, storeName] of [['CQDatabase', 'CQStore'], ['inferenceDB', 'savedQueries']]) {
      try {
        const legacy = await inspectLegacyIndexedDbDatabase(databaseName);
        if (legacy.exists && legacy.stores.includes(storeName)) {
          const rows = await readLegacyObjectStoreRows(databaseName, storeName);
          queries.push(...rows.flatMap((row, i) => extractLibraryQueries(row, { artifactId: `legacy:${databaseName}:${i}`, label: row.label || `${databaseName} (legacy)`, source: { application: databaseName } })));
        }
      } catch (error) { warnings.push(`${databaseName}: ${error.message}`); }
    }
  }
  const seen = new Set();
  const normalized = queries.filter(q => {
    const key = `${q.resourceId || ''}\n${q.query}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).map(q => ({ ...q, iris: queryResourceIris(q.query, parseSparqlToAst) }));
  const rows = await stores.quadRows.listQuadRows({ projectId: stores.projectId });
  return { queries: normalized, terms: [...ontologyTerms(rows), ...artifacts.filter(a => a.artifactKind === 'ontology-term-index').flatMap(a => a.payload?.terms || [])], artifacts, projectId: stores.projectId, warnings };
}

export async function importQueryFiles(files) {
  const stores = await libraryStores();
  await ensureProjectPortfolioProject(stores, { projectId: stores.projectId });
  for (const file of files) {
    const text = await file.text();
    const json = /\.json(ld)?$/i.test(file.name);
    const payload = json ? JSON.parse(text) : text;
    if (!extractLibraryQueries(payload).length) throw new Error(`${file.name}: no supported SPARQL query text found.`);
    await stores.artifacts.storeProjectArtifact({ artifactId: `artifact:query-library:${crypto.randomUUID()}`,
      projectId: stores.projectId, artifactKind: json ? 'competency-question-set' : 'sparql-query', role: 'source',
      label: file.name, mediaType: json ? 'application/ld+json' : 'application/sparql-query',
      extension: file.name.split('.').pop(), source: { origin: 'file', application: 'sparql-pattern-visualizer', fileName: file.name }
    }, payload);
  }
}

async function parseOntologyTerms(text, name) {
  const extension = name.split('.').pop().toLowerCase();
  if (['rdf', 'owl', 'xml'].includes(extension)) {
    const store = window.$rdf.graph();
    window.$rdf.parse(text, store, 'https://example.org/import/', 'application/rdf+xml');
    return ontologyTerms(store.statements);
  }
  if (['json', 'jsonld'].includes(extension)) {
    text = await window.jsonld.toRDF(JSON.parse(text), { format: 'application/n-quads' });
    return ontologyTerms(new window.N3.Parser({ format: 'N-Quads' }).parse(text));
  }
  const format = { ttl: 'Turtle', nt: 'N-Triples', nq: 'N-Quads', trig: 'TriG', n3: 'N3' }[extension];
  if (!format) throw new Error(`Unsupported ontology extension: ${extension}`);
  return ontologyTerms(new window.N3.Parser({ format }).parse(text));
}

export async function parseOntology(text, name) {
  const terms = await parseOntologyTerms(text, name);
  const stores = await libraryStores();
  await ensureProjectPortfolioProject(stores, { projectId: stores.projectId });
  const artifactId = 'artifact:ontology:' + crypto.randomUUID();
  await stores.artifacts.storeProjectArtifact({ artifactId, projectId: stores.projectId,
    label: name, artifactKind: 'ontology-rdf', role: 'source', extension: name.split('.').pop(),
    source: { origin: 'file', application: 'sparql-pattern-visualizer', fileName: name } }, text);
  await storeOntologyIndex(stores, artifactId, name, terms);
  return terms;
}

async function storeOntologyIndex(stores, sourceId, label, terms) {
  await stores.artifacts.storeProjectArtifact({ artifactId: sourceId + ':term-index', projectId: stores.projectId,
    artifactKind: 'ontology-term-index', role: 'index', label: label + ' annotation index',
    provenance: { derivedFrom: [sourceId] }, summary: { resourceCount: terms.length } }, { terms });
}

export async function indexOntologyArtifact(artifact) {
  const payload = artifact.payload;
  if (artifact.artifactKind === 'ontology-documents' && payload?.storedInObjectStore === 'documents') {
    const inspection = await inspectLegacyIndexedDbDatabase('OntoEagleDB');
    if (!inspection.exists) throw new Error('OntoEagle document database is unavailable.');
    const docs = await readLegacyObjectStoreRows('OntoEagleDB', 'documents');
    return docs.filter(doc => doc.datasetId === payload.datasetId).map(doc => ({ iri: doc.iri,
      labels: [...new Set([doc.label, ...(doc.altLabels || []), ...(Array.isArray(doc.acronyms) ? doc.acronyms : [doc.acronym])].filter(v => typeof v === 'string' && v))]
    })).filter(term => term.iri && term.labels.length);
  }
  if (Array.isArray(payload) || payload?.quads || payload?.rows) return ontologyTerms(payload.quads || payload.rows || payload);
  const text = payload instanceof Blob ? await payload.text() : typeof payload === 'string' ? payload : typeof payload?.text === 'string' ? payload.text : JSON.stringify(payload);
  const terms = await parseOntologyTerms(text, `ontology.${artifact.extension || 'jsonld'}`);
  await storeOntologyIndex(await libraryStores(), artifact.artifactId, artifact.label, terms);
  return terms;
}

/** Read an explicitly named same-origin store without changing its schema or records. */
export async function readAdditionalQueryStore(databaseName, storeName) {
  if (!databaseName || !storeName) throw new Error('Enter a database and object store name.');
  if (!indexedDB.databases) throw new Error('This browser cannot enumerate IndexedDB databases.');
  if (!(await indexedDB.databases()).some(db => db.name === databaseName)) throw new Error('Database not found.');
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onupgradeneeded = () => request.transaction.abort();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database is blocked by another connection.'));
  });
  let rows;
  try {
    if (!db.objectStoreNames.contains(storeName)) throw new Error('Object store not found.');
    rows = await new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
  const queries = [];
  for (const [i, row] of rows.entries()) {
    const payload = row instanceof Blob ? await row.text() : row?.content instanceof Blob ? { ...row, content: await row.content.text() } : row;
    queries.push(...extractLibraryQueries(payload, { artifactId: `${databaseName}:${storeName}:${i}`,
      label: row?.label || row?.fileName || row?.name || `${storeName} ${i + 1}`, source: { application: databaseName } }).map(query => ({ ...query, iris: queryResourceIris(query.query, parseSparqlToAst) })));
  }
  return queries;
}
