// VerseCraft Menu → Engine Bridge
// Rock-solid: clicks real engine buttons by ID

(() => {
  const MAP = {
    start: "#btnTapStart",
    load: "#btnStoryPicker",
    continue: "#btnContinue"
  };

  function show(msg, color = "#22c55e") {
    const d = document.createElement("div");
    d.textContent = msg;
    d.style.cssText = `
      position:fixed;
      top:12px;
      left:50%;
      transform:translateX(-50%);
      background:${color};
      color:#000;
      padding:8px 14px;
      border-radius:10px;
      font:600 13px system-ui;
      z-index:99999;
    `;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2500);
  }

  function hideMenu() {
    document.documentElement.dataset.vcScreen = "game";
    const menu = document.getElementById("vc-menu");
    if (menu) menu.style.display = "none";
  }

  function clickEngine(action) {
    const sel = MAP[action];
    const btn = document.querySelector(sel);
    if (!btn) {
      show(`NO ENGINE TARGET: ${action}`, "#f87171");
      return;
    }
    hideMenu();
    setTimeout(() => btn.click(), 50);
  }

  // Wire menu buttons
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-vc-action]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const action = btn.dataset.vcAction;
    clickEngine(action);
  });

  show("PATCH LOADED ✓");
})();