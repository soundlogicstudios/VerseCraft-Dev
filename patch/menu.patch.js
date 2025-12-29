/* patch/menu.patch.js — PROOF OF LOAD
   If you do NOT see the green badge, this file is not being executed.
*/
(() => {
  const d = document;

  function addBadge() {
    // Remove old badge if any
    const old = d.getElementById("vc-patch-badge");
    if (old) old.remove();

    const badge = d.createElement("div");
    badge.id = "vc-patch-badge";
    badge.textContent = "PATCH LOADED";
    badge.style.cssText = [
      "position:fixed",
      "top:12px",
      "left:12px",
      "z-index:999999",
      "background:rgba(0,255,120,.92)",
      "color:#001b0e",
      "font:700 14px/1 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
      "padding:10px 12px",
      "border-radius:12px",
      "box-shadow:0 8px 24px rgba(0,0,0,.35)",
      "border:1px solid rgba(0,0,0,.18)",
      "pointer-events:none"
    ].join(";");

    d.body.appendChild(badge);
    console.log("[VC PATCH] menu.patch.js loaded");
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", addBadge, { once: true });
  else addBadge();
})();