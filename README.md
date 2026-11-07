# sparql-pattern-visualizer

Serve the browser app with `python -m http.server 8766 --directory docs`, then
open `http://localhost:8766/`. Use an HTTP server rather than a file URL for
JavaScript modules and browser storage access.

The query editor and diagram occupy the top row. Below them, the query library
provides live substring and typo search, ontology annotation matching, optional
suggestions, metadata cards with highlighted previews, and multi-query export.
Select a card title to render its query. Checkboxes select queries independently
for `.rq` download or a ZIP containing separate `.rq` files.

Expand Data management to import `.rq`, `.sparql`, or query-bearing JSON/JSON-LD
files, including OKEA query nodes nested in CQ Ferret graphs. Ontology imports
support Turtle, N-Triples, N-Quads, TriG, N3, JSON-LD and RDF/XML. The `.owl`
extension assumes RDF/XML. Imported ontologies can be indexed individually or
together. Resource matching uses parsed SPARQL IRIs and PREFIX/BASE resolution.

Query imports, ontology source files, and annotation indexes persist in the
IndexedDB database `OntologyWorkbenchProjects`, using ReasonLynx's version 4
project/artifact schema. The app follows `workspace.activeProjectId`, defaulting
to `project:default-workspace`. Existing same-origin project query artifacts and
materialized annotation rows are discoverable, as are legacy CQ Ferret and
Axiolotl query stores in the default workspace. Other named stores remain
read-only. Data is specific to the browser profile and origin; export files
for portable backups. Different domains or ports do not share IndexedDB.

Run `npm ci` followed by `npm test`. `npm run test:library` runs only the
dependency-free search tests. Library normalization/ranking is in
`docs/app/query-library.js`; persistent storage access is isolated in
`docs/app/query-library-store.js` using the shared project adapter.

Notifications use the same shared ui-feedback toast renderer and stylesheet as
ReasonLynx: severity styling, accessible live messages, click dismissal, and a
maximum of eight visible toasts. Library errors also remain in the inline status.
Run `npm run test:storage` for IndexedDB persistence and project-scope tests.
