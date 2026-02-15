import { buildGraphModel } from "../docs/app/core_graph.js";
import SparqlJs from "sparqljs";

test("buildGraphModel extracts WHERE triples and SELECT vars", () => {
  const parser = new SparqlJs.Parser();
  const ast = parser.parse(`
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?p WHERE { ?p a foaf:Person . ?p foaf:name "Alice" . }
  `);

  const gm = buildGraphModel(ast);
  expect(gm.whereTripleCount).toBe(2);
  expect(gm.nodes.some(n => n.id === "var:?p" && n.isSelectedVar)).toBe(true);
  expect(gm.edges.length).toBe(2);
});
