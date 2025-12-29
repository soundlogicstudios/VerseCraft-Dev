/* patch/menu.patch.js
   Purpose:
   - Menu owns boot (screen=menu + splash)
   - On Start: hide menu, set screen=game, and START the engine (fix black screen)
   - Does not rewrite engine; only calls into it if functions exist or clicks its start UI.

   Works with index.html scripts:
     js/engine.js
     js/state.js
     js/ui.js
*/

(() => {
  const d = document;
  const html = d.documentElement;

  const MENU_SPLASH =
    "https://raw.githubusercontent.com/soundlogicstudios/VerseCraft-Media/main/backgrounds/ui/Home_Splash.png";

  const qs = (sel, root = d) => root.querySelector(sel);
  const qsa = (sel, root = d) => Array.from(root.querySelectorAll(sel));

  function setScreen(name) {
    html.dataset.vcScreen = name;
  }

  function menuEl() { return qs("#vc-menu"); }
  function bgEl() { return qs("#vc-bg"); }

  function applyMenuSplash() {
    const bg = bgEl();
    if (!bg) return;
    bg.style.backgroundImage = `url("${MENU_SPLASH}")`;
    bg.style.backgroundPosition = "center center";
    bg.style.backgroundRepeat = "no-repeat";
    bg.style.backgroundSize = "cover";
    bg.dataset.vcMenuSplash = "1";
  }

  function clearMenuSplash() {
    const bg = bgEl();
    if (!bg) return;
    if (bg.dataset.vcMenuSplash === "1") {
      bg.style.backgroundImage = "";
      delete bg.dataset.vcMenuSplash;
    }
  }

  // ---------- ENGINE HANDOFF (fix black screen) ----------

  function safeCall(fn, label) {
    try {
      if (typeof fn === "function") {
        fn();
        return true;
      }
    } catch (e) {
      console.warn("[menu.patch] call failed:", label, e);
    }
    return false;
  }

  function tryKnownEngineEntrypoints() {
    // Try a handful of very common vanilla engine entry points.
    // We do not assume any one exists; we only call if present.
    const candidates = [
      ["window.VerseCraft.start", () => window.VerseCraft?.start?.()],
      ["window.VerseCraft.begin", () => window.VerseCraft?.begin?.()],
      ["window.Engine.start", () => window.Engine?.start?.()],
      ["window.Engine.begin", () => window.Engine?.begin?.()],
      ["window.engineStart", () => window.engineStart?.()],
      ["window.startEngine", () => window.startEngine?.()],
      ["window.startGame", () => window.startGame?.()],
      ["window.beginGame", () => window.beginGame?.()],
      ["window.initGame", () => window.initGame?.()],
      ["window.initEngine", () => window.initEngine?.()],
      ["window.vcStart", () => window.vcStart?.()],
      ["window.vcBegin", () => window.vcBegin?.()],
      ["window.UI.start", () => window.UI?.start?.()],
      ["window.uiStart", () => window.uiStart?.()],
    ];

    for (const [label, getter] of candidates) {
      const ok = safeCall(getter, label);
      if (ok) return true;
    }
    return false;
  }

  function findTapToStartButton() {
    // Look for a visible button or link containing "tap to start"
    const els = qsa("button, a, [role='button'], input[type='button'], input[type='submit']")
      .filter((el) => {
        const t = (el.textContent || el.value || "").trim().toLowerCase();
        if (!t) return false;
        if (!t.includes("tap to start")) return false;
        const r = el.getBoundingClientRect();
        return r.width > 12 && r.height > 12;
      });

    return els[0] || null;
  }

  function findAnyEngineStartButton() {
    // If text differs, grab the first visible "Start/Begin/Play" outside the menu
    const menu = menuEl();
    const els = qsa("button, a, [role='button']").filter((el) => {
      if (menu && menu.contains(el)) return false;
      const t = (el.textContent || "").trim().toLowerCase();
      if (!t) return false;
      return t === "start" || t.includes("start") || t.includes("begin") || t.includes("play");
    });

    // Must be visible-ish
    const vis = els.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 12 && r.height > 12;
    });

    return vis[0] || null;
  }

  function click(el) {
    try { el?.click(); return !!el; } catch { return false; }
  }

  function startEngineHandshakeWithRetries() {
    // 1) Try direct entrypoints immediately
    if (tryKnownEngineEntrypoints()) return;

    // 2) Otherwise, click engine's start UI when it exists (it may render AFTER we hide menu)
    let tries = 0;
    const maxTries = 25; // ~4 seconds at 160ms
    const interval = 160;

    const timer = setInterval(() => {
      tries++;

      // Prefer exact "Tap To Start"
      const tap = findTapToStartButton();
      if (click(tap)) {
        clearInterval(timer);
        return;
      }

      // Fall back to any start-like button outside menu
      const anyStart = findAnyEngineStartButton();
      if (click(anyStart)) {
        clearInterval(timer);
        return;
      }

      // As engine globals may appear a moment later, re-try entrypoints
      if (tryKnownEngineEntrypoints()) {
        clearInterval(timer);
        return;
      }

      if (tries >= maxTries) {
        clearInterval(timer);
        console.warn("[menu.patch] Could not find engine start entrypoint or start button.");
      }
    }, interval);
  }

  // ---------- MENU WIRING ----------
  function wireMenuButtons() {
    const menu = menuEl();
    if (!menu) return;

    const buttons = qsa("#vc-menu button, #vc-menu a, #vc-menu [role='button']");
    const byText = (needle) =>
      buttons.find((b) => (b.textContent || "").trim().toLowerCase().includes(needle));

    const startBtn =
      qs('#vc-menu [data-vc-action="start"]') ||
      qs('#vc-menu [data-action="start"]') ||
      byText("start");

    const loadBtn =
      qs('#vc-menu [data-vc-action="load"]') ||
      qs('#vc-menu [data-action="load"]') ||
      byText("load");

    const contBtn =
      qs('#vc-menu [data-vc-action="continue"]') ||
      qs('#vc-menu [data-action="continue"]') ||
      byText("continue");

    const bind = (btn, fn) => {
      if (!btn) return;
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        fn();
      };
      btn.addEventListener("pointerup", handler, { passive: false });
      btn.addEventListener("click", handler, { passive: false });
    };

    bind(startBtn, () => {
      // Switch to game mode
      menu.style.display = "none";
      setScreen("game");
      clearMenuSplash();

      // Let engine know user started (non-breaking event)
      window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "start" } }));

      // Start the engine (fix blank black)
      startEngineHandshakeWithRetries();
    });

    bind(loadBtn, () => {
      // Non-breaking request; your engine can listen if desired
      window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "load" } }));
      // If your engine already has a module picker button, we’ll wire it later once we know its selector.
    });

    bind(contBtn, () => {
      menu.style.display = "none";
      setScreen("game");
      clearMenuSplash();

      window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "continue" } }));

      // Best effort continue hooks
      const ok =
        safeCall(() => window.vcContinue?.(), "window.vcContinue") ||
        safeCall(() => window.VerseCraft?.continue?.(), "window.VerseCraft.continue") ||
        safeCall(() => window.Engine?.continue?.(), "window.Engine.continue");

      if (!ok) startEngineHandshakeWithRetries();
    });
  }

  function boot() {
    const menu = menuEl();
    if (!menu) return;

    // Menu owns boot screen
    setScreen("menu");
    applyMenuSplash();

    wireMenuButtons();
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();