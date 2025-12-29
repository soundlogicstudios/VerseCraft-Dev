/* patch/menu.patch.js
   Fix: Start -> blank screen
   Cause: engine likely still requires its own "Tap To Start" / start handshake.
   Solution: on Start, hide menu + switch to game + trigger engine's start gesture.
*/

(() => {
  const d = document;
  const html = d.documentElement;

  const MENU_SPLASH =
    "https://raw.githubusercontent.com/soundlogicstudios/VerseCraft-Media/main/backgrounds/ui/Home_Splash.png";

  const qs = (sel, root = d) => root.querySelector(sel);
  const qsa = (sel, root = d) => Array.from(root.querySelectorAll(sel));

  const menuEl = () => qs("#vc-menu");
  const bgEl = () => qs("#vc-bg");
  const appEl = () => qs("#app");

  function setScreen(name) {
    html.dataset.vcScreen = name;
  }

  function applyMenuSplash() {
    const bg = bgEl();
    if (!bg) return;
    bg.style.backgroundImage = `url("${MENU_SPLASH}")`;
    bg.dataset.vcMenuSplash = "1";
    bg.style.backgroundPosition = "center center";
    bg.style.backgroundRepeat = "no-repeat";
    bg.style.backgroundSize = "cover";
  }

  function clearMenuSplash() {
    const bg = bgEl();
    if (!bg) return;
    if (bg.dataset.vcMenuSplash === "1") {
      bg.style.backgroundImage = "";
      delete bg.dataset.vcMenuSplash;
    }
  }

  // --- Engine start handshake helpers ---
  function clickIfPossible(el) {
    if (!el) return false;
    try {
      el.click();
      return true;
    } catch (_) {
      return false;
    }
  }

  function findTapToStartButton() {
    // Look for a visible button/link that contains "Tap To Start"
    const candidates = qsa("button, a, [role='button'], input[type='button'], input[type='submit']")
      .filter((el) => {
        const t = (el.textContent || el.value || "").trim().toLowerCase();
        if (!t) return false;
        if (!t.includes("tap to start")) return false;

        const r = el.getBoundingClientRect();
        // visible-ish
        return r.width > 10 && r.height > 10;
      });

    return candidates[0] || null;
  }

  function findEngineStartLikeButton() {
    // If legacy UI changed text, try common "Start/Play" buttons in engine layer
    const candidates = qsa("button, a, [role='button']").filter((el) => {
      const t = (el.textContent || "").trim().toLowerCase();
      if (!t) return false;
      return t === "start" || t.includes("start") || t.includes("begin") || t.includes("play");
    });

    // Prefer things NOT inside #vc-menu
    const menu = menuEl();
    const outside = candidates.filter((el) => !(menu && menu.contains(el)));
    return outside[0] || candidates[0] || null;
  }

  function triggerEngineStartHandshake() {
    // 1) If engine exposes a start function, use it (non-invasive)
    try {
      if (typeof window.vcStart === "function") return window.vcStart(), true;
      if (window.VerseCraft && typeof window.VerseCraft.start === "function") return window.VerseCraft.start(), true;
      if (window.vc && typeof window.vc.start === "function") return window.vc.start(), true;
    } catch (_) {}

    // 2) Click the legacy "Tap To Start" if present
    const tap = findTapToStartButton();
    if (clickIfPossible(tap)) return true;

    // 3) Fallback: click a likely engine "Start/Play" button (outside menu)
    const startLike = findEngineStartLikeButton();
    if (clickIfPossible(startLike)) return true;

    return false;
  }

  // --- Legacy home suppression (optional; do not hide engine gameplay UI) ---
  // We only suppress obvious legacy splash containers when in MENU mode.
  function suppressLegacySplashOnly() {
    const menu = menuEl();
    if (!menu) return;

    const tapBtn = findTapToStartButton();
    if (!tapBtn) return;

    // walk up a few parents to find a container to hide
    let node = tapBtn;
    for (let i = 0; i < 6 && node && node !== d.body; i++) {
      const id = (node.id || "").toLowerCase();
      const cls = (node.className || "").toString().toLowerCase();

      if (id.includes("start") || id.includes("title") || id.includes("splash") || cls.includes("start") || cls.includes("title") || cls.includes("splash")) {
        node.dataset.vcSuppressed = "1";
        node.style.display = "none";
        node.style.pointerEvents = "none";
        return;
      }
      node = node.parentElement;
    }
  }

  // --- Menu wiring ---
  function wireMenuButtons() {
    const menu = menuEl();
    if (!menu) return;

    // Prefer data-vc-action if present; else fallback by text
    const buttons = qsa("#vc-menu button, #vc-menu a, #vc-menu [role='button']");
    const byText = (needle) => buttons.find(b => (b.textContent || "").trim().toLowerCase().includes(needle));

    const startBtn = qs('#vc-menu [data-vc-action="start"]') || byText("start");
    const loadBtn  = qs('#vc-menu [data-vc-action="load"]')  || byText("load");
    const contBtn  = qs('#vc-menu [data-vc-action="continue"]') || byText("continue");

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
      // show engine layer
      const app = appEl();
      if (app) {
        app.style.display = "";
        app.style.visibility = "visible";
        app.style.opacity = "1";
        app.style.pointerEvents = "auto";
      }

      // hide menu and switch screen
      menu.style.display = "none";
      setScreen("game");
      clearMenuSplash();

      // tell engine "user started" (gesture)
      const ok = triggerEngineStartHandshake();

      // If engine hasn't injected its UI yet, retry briefly (common on mobile)
      if (!ok) {
        let tries = 0;
        const timer = setInterval(() => {
          tries++;
          const done = triggerEngineStartHandshake();
          if (done || tries >= 12) clearInterval(timer);
        }, 150);
      }
    });

    bind(loadBtn, () => {
      // For now, just let engine handle it (if it has a module picker)
      window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "load" } }));
    });

    bind(contBtn, () => {
      menu.style.display = "none";
      setScreen("game");
      clearMenuSplash();

      // Try engine continue if exposed; else fall back to engine start handshake
      try {
        if (typeof window.vcContinue === "function") return window.vcContinue();
        if (window.VerseCraft && typeof window.VerseCraft.continue === "function") return window.VerseCraft.continue();
        if (window.vc && typeof window.vc.continue === "function") return window.vc.continue();
      } catch (_) {}

      triggerEngineStartHandshake();
    });
  }

  function boot() {
    const menu = menuEl();
    if (!menu) return;

    // Menu owns initial screen
    setScreen("menu");
    applyMenuSplash();

    // suppress ONLY the legacy splash if it shows up in menu mode
    suppressLegacySplashOnly();

    // Wire menu buttons
    wireMenuButtons();

    // If engine injects legacy splash later while menu is up, suppress again
    const obs = new MutationObserver(() => {
      if ((html.dataset.vcScreen || "") === "menu") suppressLegacySplashOnly();
    });
    obs.observe(d.body, { childList: true, subtree: true });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();