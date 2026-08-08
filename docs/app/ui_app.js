/**
 * @file ui_app.js
 * @description DOM handlers: parse → build model → render.
 */

import { DEFAULT_QUERY } from "./constants.js";
import { logEvent, logError } from "./log.js";
import { parseSparqlToAst } from "./core_parse.js";
import { buildGraphModel } from "./core_graph.js";
import { showToast } from "./ui_toast.js";

/**
 * Render the prefix legend.
 * @param {Record<string,string>} prefixes
 * @param {boolean} isEnabled
 */
function renderPrefixLegend(prefixes, isEnabled) {
  const el = document.getElementById("svizPrefixes");
  if (!el) return;

  el.innerHTML = "";
  if (!isEnabled) return;

  const entries = Object.entries(prefixes || {}).sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length === 0) {
    el.textContent = "No PREFIX declarations found.";
    return;
  }

  for (const [k, v] of entries) {
    const row = document.createElement("div");
    row.className = "sviz-prefix-item";

    const key = document.createElement("div");
    key.className = "sviz-prefix-key";
    key.textContent = k === "" ? ":" : `${k}:`;

    const val = document.createElement("div");
    val.className = "sviz-prefix-val";
    val.textContent = v;

    row.appendChild(key);
    row.appendChild(val);
    el.appendChild(row);
  }
}

/**
 * Convert GraphModel into Cytoscape elements with BEM class mapping.
 * @param {any} graphModel
 * @returns {any[]}
 */
function toCytoscapeElements(graphModel) {
  const nodes = (graphModel.nodes || []).map(n => {
    const classes = [];

    // Map Node Categories & Kinds
    if (n.category === 'class') classes.push('sviz-node--class');
    else if (n.category === 'individual') classes.push('sviz-node--individual');
    else if (n.category === 'ontology') classes.push('sviz-node--ontology');
    else if (n.category === 'bnode') classes.push('sviz-node--bnode');

    if (n.kind === 'literal') {
      classes.push('sviz-node--literal');
      if (n.category === 'datatype') classes.push('sviz-node--datatype');
      if (n.category === 'annotation') classes.push('sviz-node--annotation');
    }

    // SPARQL Variable Mapping
    if (n.kind === 'variable' || n.isVar) {
      classes.push('sviz-node--sparql-var');
    }

    // Typography Variants
    if (n.textType === 'iri') classes.push('sviz-text--iri');
    else if (n.textType === 'literal' || n.kind === 'literal') classes.push('sviz-text--literal');

    return {
      data: n,
      classes: classes.join(' ')
    };
  });

  const edges = (graphModel.edges || []).map(e => {
    const classes = [];

    // Map Edge Categories
    if (e.category === 'objectProp') classes.push('sviz-edge--object');
    else if (e.category === 'datatypeProp') classes.push('sviz-edge--datatype');
    else if (e.category === 'annotationProp') classes.push('sviz-edge--annotation');
    else if (e.category === 'dataProperty') classes.push('sviz-edge--data');

    // SPARQL Variable Edges
    if (e.isVar || e.kind === 'variable') {
      classes.push('sviz-edge--sparql-var');
    }

    return {
      data: e,
      classes: classes.join(' ')
    };
  });

  return [...nodes, ...edges];
}

/**
 * Cytoscape style rules with theme support and data attribute overrides.
 * @param {'light' | 'dark'} mode 
 * @returns {any[]}
 */
function getCytoscapeStyles(mode = 'light') {
  const isDark = mode === 'dark';

  const palette = {
    class: { main: '#FFE600', accent: '#C8B600', shadow: isDark ? '#3A3400' : '#E6DC80' },
    objectProperty: { main: '#2B70C9', accent: '#1D4B88', shadow: isDark ? '#0D2340' : '#B8D2F5' },
    datatypeProperty: { main: '#2DA84E', accent: '#1E7034', shadow: isDark ? '#0D381A' : '#B8E6C4' },
    annotationProperty: { main: '#F28500', accent: '#B36200', shadow: isDark ? '#593100' : '#FCDCA8' },
    dataProperty: { main: '#E53935', accent: '#A12725', shadow: isDark ? '#521413' : '#F8B8B6' },
    individual: { main: '#8E24AA', accent: '#5C1770', shadow: isDark ? '#310C3B' : '#DCB8E6' },
    ontology: { main: '#E91E63', accent: '#A01443', shadow: isDark ? '#4A091F' : '#F8B8CE' },
    bnode: { main: '#8C9BA5', accent: '#5B666E', shadow: isDark ? '#2E3338' : '#D0D7DC' },

    sparqlVarNode: { main: '#8E24AA', accent: '#FFE600' },
    sparqlVarRel: { main: '#2DA84E', accent: '#2B70C9' },
    sparqlVarLit: { main: '#F28500', accent: '#2DA84E' },

    text: isDark ? '#E2E8F0' : '#1A202C',
    textMuted: isDark ? '#A0AEC0' : '#4A5568',
    bg: isDark ? '#000011' : '#DFEFFF',
    nodeShadowColor: isDark ? '#000000' : '#88A4C8'
  };

  return [
    // --- Base Nodes ---
    {
      selector: 'node',
      style: {
        'shape': 'ellipse',
        'width': 42,
        'height': 42,
        'background-color': palette.bnode.main,
        'border-width': 2,
        'border-color': palette.bnode.accent,
        'border-opacity': 0.9,
        'shadow-color': palette.nodeShadowColor,
        'shadow-offset-x': 3,
        'shadow-offset-y': 3,
        'shadow-opacity': 0.4,
        'shadow-blur': 4,
        'label': 'data(label)',
        'color': palette.text,
        'font-family': 'sans-serif',
        'font-size': '16px', // 1rem
        'font-weight': 660,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 6,
        'text-wrap': 'wrap',
        'text-max-width': '120px'
      }
    },

    // --- Literals ---
    {
      selector: 'node.sviz-node--literal, node[kind = "literal"]',
      style: {
        'shape': 'rectangle',
        'width': 'label',
        'height': 'label',
        'padding': 8,
        'border-radius': 4,
        'font-family': 'sans-serif',
        'font-size': '12px', // 0.75rem
        'font-weight': 400,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-margin-y': 0
      }
    },
    {
      selector: 'node.sviz-node--literal.sviz-node--datatype',
      style: {
        'background-color': palette.datatypeProperty.main,
        'border-color': palette.datatypeProperty.accent,
        'color': '#FFFFFF'
      }
    },
    {
      selector: 'node.sviz-node--literal.sviz-node--annotation',
      style: {
        'background-color': palette.annotationProperty.main,
        'border-color': palette.annotationProperty.accent,
        'color': '#FFFFFF'
      }
    },

    // --- OWL Types (Class Selectors & Attribute Selectors) ---
    {
      selector: 'node.sviz-node--class, node[category = "class"]',
      style: {
        'background-color': palette.class.main,
        'border-color': palette.class.accent,
        'shadow-color': palette.class.shadow
      }
    },
    {
      selector: 'node.sviz-node--individual, node[category = "individual"]',
      style: {
        'background-color': palette.individual.main,
        'border-color': palette.individual.accent,
        'shadow-color': palette.individual.shadow
      }
    },
    {
      selector: 'node.sviz-node--ontology, node[category = "ontology"]',
      style: {
        'background-color': palette.ontology.main,
        'border-color': palette.ontology.accent,
        'shadow-color': palette.ontology.shadow
      }
    },
    {
      selector: 'node.sviz-node--bnode, node[category = "bnode"]',
      style: {
        'background-color': palette.bnode.main,
        'border-color': palette.bnode.accent,
        'shadow-color': palette.bnode.shadow
      }
    },

    // --- Typography Rules ---
    {
      selector: '.sviz-text--iri',
      style: {
        'font-family': 'Consolas, Monaco, "Courier New", monospace',
        'font-size': '12px',
        'font-weight': 400,
        'color': palette.textMuted
      }
    },
    {
      selector: '.sviz-text--literal',
      style: {
        'font-family': 'sans-serif',
        'font-size': '12px',
        'font-weight': 400
      }
    },

    // --- Edges ---
    {
      selector: 'edge',
      style: {
        'curve-style': 'bezier',
        'width': 2,
        'line-color': palette.objectProperty.main,
        'target-arrow-color': palette.objectProperty.main,
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.1,
        'target-distance-from-node': 4,
        'source-distance-from-node': 2,
        'label': 'data(label)',
        'color': palette.text,
        'font-family': 'sans-serif',
        'font-size': '12px',
        'font-weight': 400,
        'text-rotation': 'autorotate',
        'text-margin-y': -8,
        'text-background-opacity': 0.8,
        'text-background-color': palette.bg,
        'text-background-padding': 2,
        'text-background-shape': 'roundrectangle'
      }
    },
    {
      selector: 'edge.sviz-edge--datatype, edge[category = "datatypeProp"]',
      style: {
        'line-color': palette.datatypeProperty.main,
        'target-arrow-color': palette.datatypeProperty.main
      }
    },
    {
      selector: 'edge.sviz-edge--annotation, edge[category = "annotationProp"]',
      style: {
        'line-color': palette.annotationProperty.main,
        'target-arrow-color': palette.annotationProperty.main
      }
    },
    {
      selector: 'edge.sviz-edge--data, edge[category = "dataProperty"]',
      style: {
        'line-color': palette.dataProperty.main,
        'target-arrow-color': palette.dataProperty.main
      }
    },

    // --- SPARQL Variable Rules ---
    {
      selector: 'node.sviz-node--sparql-var, node[kind = "variable"]',
      style: {
        'background-color': palette.sparqlVarNode.main,
        'border-color': palette.sparqlVarNode.accent,
        'border-width': 3,
        'font-style': 'italic',
        'color': palette.text
      }
    },
    {
      selector: 'edge.sviz-edge--sparql-var',
      style: {
        'line-color': palette.sparqlVarRel.main,
        'target-arrow-color': palette.sparqlVarRel.accent,
        'width': 3,
        'font-style': 'italic',
        'line-style': 'dashed'
      }
    },

    // --- SELECT Highlights ---
    {
      selector: 'node[?isSelectedVar]',
      style: {
        'border-width': 4,
        'border-color': '#FFE600',
        'shadow-color': '#FFE600',
        'shadow-blur': 10,
        'shadow-opacity': 0.8
      }
    }
  ];
}

/**
 * Render the Cytoscape diagram.
 * @param {any} graphModel
 * @param {'light' | 'dark'} [mode]
 */
function renderDiagram(graphModel, mode) {
  const container = document.getElementById("svizDiagram");
  if (!container) return;

  if (!window.cytoscape) {
    if (typeof showToast === "function") {
      showToast("Cytoscape not found. Did you load app/shared/vendor/cytoscape.min.js?", "error");
    }
    return;
  }

  // Register extension if loaded as a module or global script
  if (typeof cytoscapeFcose !== "undefined" && window.cytoscape) {
    window.cytoscape.use(cytoscapeFcose);
  }

  // Detect theme dynamically if not provided directly
  const themeMode = mode || (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  // Clear container
  container.innerHTML = "";

  const cy = window.cytoscape({
    container,
    elements: toCytoscapeElements(graphModel),
    style: getCytoscapeStyles(themeMode),
    layout: { name: "fcose",
      animate: false ,
    // Spacing & Repulsion Controls
    nodeRepulsion: function( node ){ return 16000; }, // Default is ~4096; higher = nodes push far apart
    idealEdgeLength: function( edge ){ return 128; },  // Default is ~32; expands distance between connected nodes
    edgeElasticity: function( edge ){ return 12; },     // Softer springs allow nodes to spread
    gravity: 0.2,                                      // Lower gravity prevents clustering toward the center
    padding: 50                                        // Extra canvas padding around the graph bounds
    },
    wheelSensitivity: 0.2
  });

  // Fit view with padding
  cy.fit(undefined, 24);
}

/**
 * Update UI metadata fields.
 * @param {any} graphModel
 */
function updateMeta(graphModel) {
  const qt = document.getElementById("svizQueryType");
  const tc = document.getElementById("svizTripleCount");
  if (qt) qt.textContent = String(graphModel.queryType ?? "—");
  if (tc) tc.textContent = String(graphModel.whereTripleCount ?? 0);
}

/**
 * Handle a full render request from UI inputs.
 */
function handleRenderRequest() {
  const queryEl = document.getElementById("svizQuery");
  const showPrefixesEl = document.getElementById("svizShowPrefixes");

  const queryText = queryEl ? queryEl.value : "";
  const showPrefixes = !!showPrefixesEl?.checked;

  try {
    logEvent("render.start", { showPrefixes });

    const ast = parseSparqlToAst(queryText);
    const graphModel = buildGraphModel(ast);

    renderDiagram(graphModel);
    renderPrefixLegend(graphModel.prefixes, showPrefixes);
    updateMeta(graphModel);

    showToast("Diagram updated.", "success");
    logEvent("render.success", { nodes: graphModel.nodes.length, edges: graphModel.edges.length });
  } catch (err) {
    logError("render.failed", err, {});
    showToast(`Parse/render failed: ${err?.message ?? err}`, "error", { timeoutMs: 4500 });
  }
}

/**
 * Reset UI to defaults.
 */
function handleReset() {
  const queryEl = document.getElementById("svizQuery");
  if (queryEl) queryEl.value = DEFAULT_QUERY;
  handleRenderRequest();
}

/**
 * Initialize the app.
 */
function init() {
  const queryEl = document.getElementById("svizQuery");
  const renderBtn = document.getElementById("svizRenderBtn");
  const resetBtn = document.getElementById("svizResetBtn");

  if (queryEl) queryEl.value = DEFAULT_QUERY;

  if (renderBtn) renderBtn.addEventListener("click", () => handleRenderRequest());
  if (resetBtn) resetBtn.addEventListener("click", () => handleReset());

  // Initial render
  handleRenderRequest();
}

window.addEventListener("DOMContentLoaded", () => init());
