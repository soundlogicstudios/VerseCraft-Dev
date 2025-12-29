(() => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  function toast(msg, ms = 2200) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText =
      "position:fixed;top:14px;left:14px;right:14px;z-index:999999;" +
      "background:#19c37d;color:#000;padding:12px 14px;border-radius:12px;" +
      "font:700 14px -apple-system,system-ui,sans-serif;";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  function setScreen(mode) {
    document.documentElement.dataset.vcScreen = mode;
  }

  function engineButtons() {
    return {
      start: document.getElementById("btnTapStart"),
      load: document.getElementById("btnStoryPicker"),
      continue: document.getElementById("btnContinue"),
    };
  }

  function suppressLegacyUI() {
    Object.values(engineButtons()).forEach((b) => {
      if (!b) return;
      b.style.opacity = "0";
      b.style.pointerEvents = "none";
    });
  }

  function restoreLegacyUI() {
    Object.values(engineButtons()).forEach((b) => {
      if (!b) return;
      b.style.opacity = "";
      b.style.pointerEvents = "";
    });
  }

  function waitForEngine(timeout = 6000) {
    const start = Date.now();
    return new Promise((res) => {
      const tick = () => {
        const b = engineButtons();
        if (b.start || b.load || b.continue) return res(b);
        if (Date.now() - start > timeout) return res(b);
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  async function trigger(action) {
    const btns = await waitForEngine();
    const target =
      action === "start" ? btns.start :
      action === "load" ? btns.load :
      action === "continue" ? btns.continue :
      null;

    if (!target) {
      toast(`PATCH — no engine target for: ${action}`);
      return;
    }

    // CRITICAL FIX:
    // give control back to engine BEFORE clicking
    restoreLegacyUI();
    setScreen("game");

    target.click();
    toast(`ENGINE OK: ${action}`);
  }

  function wireMenu() {
    qsa("[data-vc-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        trigger(btn.dataset.vcAction);
      });
    });
  }

  async function boot() {
    setScreen("menu");
    suppressLegacyUI();
    wireMenu();
    toast("PATCH LOADED");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();