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
 * Convert GraphModel into Cytoscape elements.
 * @param {any} graphModel
 * @returns {any[]}
 */
function toCytoscapeElements(graphModel) {
  const nodes = (graphModel.nodes || []).map(n => ({ data: n }));
  const edges = (graphModel.edges || []).map(e => ({ data: e }));
  return [...nodes, ...edges];
}

/**
 * Cytoscape style rules (MVP).
 * @returns {any[]}
 */
function getCytoscapeStyles() {
  return [
    {
      selector: "node",
      style: {
        "label": "data(label)",
        "text-wrap": "wrap",
        "text-max-width": 140,
        "font-size": 10,
        "border-width": 1,
        "border-color": "#999",
        "background-color": "#eee",
        "shape": "ellipse"
      }
    },
    { selector: 'node[category = "class"]', style: { "background-color": "#ffeaa7", "shape": "ellipse" } },
    { selector: 'node[category = "individual"]', style: { "background-color": "#d6b3ff", "shape": "diamond" } },
    { selector: 'node[kind = "literal"]', style: { "background-color": "#dff9fb", "shape": "round-rectangle" } },
    { selector: 'node[kind = "variable"]', style: { "background-color": "#f1f2f6", "shape": "round-rectangle" } },

    // SELECT highlight
    { selector: 'node[isSelectedVar]', style: { "border-width": 4, "border-color": "#f1c40f" } },

    {
      selector: "edge",
      style: {
        "label": "data(label)",
        "font-size": 9,
        "text-rotation": "autorotate",
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "line-color": "#888",
        "target-arrow-color": "#888",
        "width": 2
      }
    },
    { selector: 'edge[category = "objectProp"]', style: { "line-color": "#3498db", "target-arrow-color": "#3498db" } },
    { selector: 'edge[category = "datatypeProp"]', style: { "line-color": "#2ecc71", "target-arrow-color": "#2ecc71" } },
    { selector: 'edge[category = "annotationProp"]', style: { "line-color": "#e67e22", "target-arrow-color": "#e67e22" } },
    { selector: 'edge[category = "rdfType"]', style: { "line-color": "#7f8c8d", "target-arrow-color": "#7f8c8d" } }
  ];
}

/**
 * Render the Cytoscape diagram.
 * @param {any} graphModel
 */
function renderDiagram(graphModel) {
  const container = document.getElementById("svizDiagram");
  if (!container) return;

  if (!window.cytoscape) {
    showToast("Cytoscape not found. Did you load vendor/cytoscape.min.js?", "error");
    return;
  }

  // Rebuild from scratch (simple, deterministic downstream DOM)
  container.innerHTML = "";

  const cy = window.cytoscape({
    container,
    elements: toCytoscapeElements(graphModel),
    style: getCytoscapeStyles(),
    layout: { name: "cose", animate: false },
    wheelSensitivity: 0.2
  });

  // Fit but keep padding
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
