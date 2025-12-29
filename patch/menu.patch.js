/* patch/menu.patch.js
   Bridge the overlay menu to the existing engine WITHOUT needing window globals.
   We do this by clicking the legacy buttons that app.js creates:
   - #btnTapStart
   - #btnStoryPicker
   - #btnContinue
*/
(() => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  function toast(msg) {
    try {
      const el = document.createElement("div");
      el.textContent = msg;
      el.style.cssText =
        "position:fixed;top:14px;left:14px;right:14px;z-index:999999;" +
        "background:#19c37d;color:#000;padding:12px 14px;border-radius:12px;" +
        "font:700 14px -apple-system,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2400);
    } catch (_) {}
  }

  function setScreen(mode) {
    document.documentElement.dataset.vcScreen = mode;
  }

  // Hide the legacy home UI so it can't fight your overlay.
  // We hide likely containers and also hide the known legacy buttons.
  function hideLegacyHomeUI() {
    const ids = ["btnTapStart", "btnStoryPicker", "btnContinue"];
    ids.forEach((id) => {
      const b = document.getElementById(id);
      if (b) b.style.display = "none";
    });

    // Hide common legacy containers if present
    const legacyRoots = [
      "#startScreen",
      "#start-screen",
      "#titleScreen",
      "#title-screen",
      "#home",
      "#homeScreen",
      "#home-screen",
      "#screen-home",
      "#vc-home",
    ];
    legacyRoots.forEach((sel) => {
      const el = qs(sel);
      if (el) el.style.display = "none";
    });

    // If legacy menu is built inside an unnamed wrapper, we can also hide any
    // element that contains the exact "Tap To Start" button text.
    const tapBtn = qsa("button").find((b) =>
      (b.textContent || "").trim().toLowerCase().includes("tap to start")
    );
    if (tapBtn && tapBtn.parentElement) {
      // Hide that parent wrapper if it looks like a menu block.
      tapBtn.parentElement.style.display = "none";
    }
  }

  // Try to trigger engine action.
  // Priority 1: Click legacy buttons by ID (most reliable with your current app.js)
  // Priority 2: Dispatch CustomEvent("vc:menu") for menu.js listeners
  // Priority 3: Try any known global hooks if they exist
  function triggerEngine(action) {
    // legacy button click path
    const legacyMap = {
      start: "btnTapStart",
      load: "btnStoryPicker",
      continue: "btnContinue",
      settings: null,
    };

    const legacyId = legacyMap[action];
    if (legacyId) {
      const btn = document.getElementById(legacyId);
      if (btn && typeof btn.click === "function") {
        btn.click();
        return { ok: true, via: `click:${legacyId}` };
      }
    }

    // menu.js event path
    try {
      window.dispatchEvent(
        new CustomEvent("vc:menu", { detail: { action } })
      );
    } catch (_) {}

    // optional globals (only if they exist)
    try {
      if (action === "start" && typeof window.vcStart === "function") {
        window.vcStart();
        return { ok: true, via: "window.vcStart()" };
      }
      if (action === "load" && typeof window.vcLoad === "function") {
        window.vcLoad();
        return { ok: true, via: "window.vcLoad()" };
      }
      if (action === "continue" && typeof window.vcContinue === "function") {
        window.vcContinue();
        return { ok: true, via: "window.vcContinue()" };
      }
    } catch (_) {}

    return { ok: false, via: "none" };
  }

  // Wire overlay buttons: anything with data-vc-action
  function wireOverlayButtons() {
    const buttons = qsa('[data-vc-action]');
    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const action = (btn.getAttribute("data-vc-action") || "").trim();

        // Switch screen intent
        if (action === "start" || action === "continue" || action === "load") {
          setScreen("game");
          // We hide legacy home so it can't render over/under things
          hideLegacyHomeUI();
        }

        const r = triggerEngine(action);
        if (!r.ok) {
          toast(`PATCH LOADED — no engine target for: ${action}`);
        } else {
          toast(`ENGINE OK: ${action} (${r.via})`);
        }
      }, { passive: false });
    });
  }

  function ensureMenuVisible() {
    // If your overlay exists, force it visible
    const menu = qs("#vc-menu");
    if (menu) {
      menu.style.display = "block";
      menu.style.pointerEvents = "auto";
    }
  }

  function boot() {
    // Start on menu unless your engine already moved you
    if (!document.documentElement.dataset.vcScreen) {
      setScreen("menu");
    }

    ensureMenuVisible();
    wireOverlayButtons();

    // Light suppression of legacy UI right away
    hideLegacyHomeUI();

    toast("PATCH LOADED");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();