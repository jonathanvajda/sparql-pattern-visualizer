/**
 * @file constants.js
 * @description Shared constants and defaults.
 */

import {
  COMMON_NAMESPACE_IRIS,
  namespacePrefixMapFromRegistry
} from "./shared/namespace-registry/namespace-registry.js";

export const debuggerConsoleLogEnabled = true;

const NS = COMMON_NAMESPACE_IRIS;
const PREFIXES = namespacePrefixMapFromRegistry();

export const DEFAULT_QUERY = `PREFIX rdf: <${PREFIXES.rdf}>
PREFIX foaf: <${PREFIXES.foaf}>
PREFIX skos: <${PREFIXES.skos}>

SELECT ?p ?name WHERE {
  ?p a foaf:Person .
  ?p foaf:name ?name .
  OPTIONAL { ?p skos:definition ?def . }
  FILTER(isLiteral(?name))
}
`;

/**
 * Known “annotation-ish” predicates that commonly point to literals.
 * (MVP heuristic; can be made configurable.)
 */
export const KNOWN_ANNOTATION_PREDICATE_IRIS = new Set([
  NS.rdfs.label,
  NS.rdfs.comment,
  NS.dcterms.title,
  NS.dc.title,
  NS.skos.prefLabel,
  NS.skos.altLabel,
  NS.skos.definition
]);
