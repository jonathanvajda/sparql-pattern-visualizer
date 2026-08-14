import SparqlJs from "sparqljs";
import { buildSparqlGraphModelFromAst } from "../docs/app/shared/sparql-utils/index.js";
import {
  projectGraphStateToCytoscapeElements,
  projectSparqlGraphModelToGraphState
} from "../docs/app/shared/cytoscape-visualization/index.js";

test("projects SPARQL graph models through the shared Cytoscape visualization contract", () => {
  const parser = new SparqlJs.Parser();
  const ast = parser.parse(`
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?p WHERE {
      ?p a foaf:Person .
      ?p foaf:name "Alice" .
    }
  `);
  const graphModel = buildSparqlGraphModelFromAst(ast);
  const graphState = projectSparqlGraphModelToGraphState(graphModel);
  const elements = projectGraphStateToCytoscapeElements(graphState, {
    hideBlankNodes: false,
    hideAxiomSupportNodes: false
  });

  expect(graphState.indexes.sparqlQueryType).toBe("SELECT");
  expect(graphState.indexes.sparqlWhereTripleCount).toBe(2);
  expect(elements.some((element) => element.group === "nodes" && element.data.kind === "variable")).toBe(true);
  expect(elements.some((element) => element.group === "nodes" && element.data.kind === "class")).toBe(true);
  expect(elements.some((element) => element.group === "edges" && element.data.kind === "datatype")).toBe(true);
});

test("keeps SPARQL property paths as read-only visualization edges", () => {
  const graphState = projectSparqlGraphModelToGraphState({
    queryType: "SELECT",
    nodes: [
      { id: "var:?s", label: "?s", kind: "variable", category: "variable" },
      { id: "var:?o", label: "?o", kind: "variable", category: "variable" }
    ],
    edges: [
      { id: "e:path", source: "var:?s", target: "var:?o", label: "[path]", category: "path" }
    ],
    whereTripleCount: 1
  });
  const edge = projectGraphStateToCytoscapeElements(graphState)
    .find((element) => element.group === "edges");

  expect(edge.data.kind).toBe("path");
  expect(graphState.quads).toHaveLength(0);
});
