/**
 * @file ui_toast.js
 * @description Toast notifications (DOM utilities).
 */

import { logError } from "./log.js";

/**
 * Show a toast message.
 * @param {string} message
 * @param {"success"|"error"|"info"} type
 * @param {{timeoutMs?: number}} opts
 */
export function showToast(message, type = "info", opts = {}) {
  try {
    const region = document.getElementById("svizToastRegion");
    if (!region) return;

    const toast = document.createElement("div");
    toast.className = `sviz-toast sviz-toast--${type}`;
    toast.textContent = String(message ?? "");

    region.appendChild(toast);

    const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 2600;
    window.setTimeout(() => {
      try { toast.remove(); } catch { /* noop */ }
    }, timeoutMs);
  } catch (err) {
    logError("showToast.failed", err, { message, type });
  }
}
