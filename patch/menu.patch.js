(() => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  function toast(msg, ms = 2400) {
    try {
      const el = document.createElement("div");
      el.textContent = msg;
      el.style.cssText =
        "position:fixed;top:14px;left:14px;right:14px;z-index:999999;" +
        "background:#19c37d;color:#000;padding:12px 14px;border-radius:12px;" +
        "font:700 14px -apple-system,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), ms);
    } catch (_) {}
  }

  function setScreen(mode) {
    document.documentElement.dataset.vcScreen = mode;
  }

  // Try to locate the engine buttons reliably, even if app.js changes structure.
  function findEngineTargets() {
    const byId = (id) => document.getElementById(id);

    const tapStart = byId("btnTapStart");
    const storyPicker = byId("btnStoryPicker");
    const cont = byId("btnContinue");

    // Fallback: find by text if IDs ever change
    const buttons = qsa("button");
    const byText = (needle) =>
      buttons.find((b) => (b.textContent || "").trim().toLowerCase() === needle);

    return {
      start: tapStart || byText("tap to start"),
      load: storyPicker || byText("load new story"),
      continue: cont || byText("continue story"),
    };
  }

  // Wait until app.js has actually created the targets
  function waitForEngineTargets(timeoutMs = 6000) {
    const start = Date.now();

    return new Promise((resolve) => {
      const tick = () => {
        const t = findEngineTargets();
        const ok = !!(t.start || t.load || t.continue);

        if (ok) return resolve(t);
        if (Date.now() - start > timeoutMs) return resolve(t);

        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  // Hide legacy UI without deleting it (we still need to click it)
  function suppressLegacyUI() {
    // Hide known engine buttons if visible
    ["btnTapStart", "btnStoryPicker", "btnContinue"].forEach((id) => {
      const b = document.getElementById(id);
      if (b) b.style.opacity = "0";
      if (b) b.style.pointerEvents = "none";
    });

    // Hide common legacy roots (safe)
    [
      "#startScreen",
      "#start-screen",
      "#titleScreen",
      "#title-screen",
      "#home",
      "#homeScreen",
      "#home-screen",
      "#screen-home",
      "#vc-home",
    ].forEach((sel) => {
      const el = qs(sel);
      if (el) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      }
    });
  }

  async function trigger(action) {
    // Make sure app.js has had time to build its DOM
    const targets = await waitForEngineTargets(6000);

    const btn =
      action === "start" ? targets.start :
      action === "load" ? targets.load :
      action === "continue" ? targets.continue :
      null;

    if (btn && typeof btn.click === "function") {
      btn.click();
      return { ok: true, via: "engine-button" };
    }

    // Try menu.js event hook (if present)
    try {
      window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action } }));
      // We can’t confirm it worked, but it’s worth firing.
    } catch (_) {}

    return { ok: false, via: "none" };
  }

  function wireOverlay() {
    qsa("[data-vc-action]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const action = (btn.getAttribute("data-vc-action") || "").trim();

        // If user is leaving menu, switch state
        if (action === "start" || action === "load" || action === "continue") {
          setScreen("game");
        }

        // Keep legacy UI suppressed so it doesn’t fight layout
        suppressLegacyUI();

        const r = await trigger(action);
        if (r.ok) toast(`ENGINE OK: ${action}`);
        else toast(`PATCH LOADED — no engine target for: ${action}`);
      }, { passive: false });
    });
  }

  async function boot() {
    if (!document.documentElement.dataset.vcScreen) setScreen("menu");

    wireOverlay();

    // Show proof patch is running
    toast("PATCH LOADED");

    // After engine builds, suppress legacy UI (so your cinematic menu stays clean)
    await waitForEngineTargets(6000);
    suppressLegacyUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();