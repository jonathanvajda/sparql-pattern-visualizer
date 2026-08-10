import {
  compactSparqlAstIriForDisplay,
  createSparqlAstTermKey,
  formatSparqlAstTermLabel
} from "../docs/app/shared/sparql-utils/index.js";

test("compactIri prefers prefix match", () => {
  const prefixes = { foaf: "http://xmlns.com/foaf/0.1/" };
  expect(compactSparqlAstIriForDisplay("http://xmlns.com/foaf/0.1/name", prefixes)).toBe("foaf:name");
});

test("termKey stable for variable", () => {
  expect(createSparqlAstTermKey({ termType: "Variable", value: "x" })).toBe("var:?x");
});

test("termLabel for literal with lang", () => {
  const prefixes = {};
  const lit = {
    termType: "Literal",
    value: "York",
    language: "en",
    datatype: { termType: "NamedNode", value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString" }
  };
  expect(formatSparqlAstTermLabel(lit, prefixes)).toContain('"York"@en');
});
