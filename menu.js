/* menu.js — UI wiring + screen state sync (no engine rewrites)
   Fixes:
   - Forces html[data-vc-screen="menu"] on boot when #vc-menu exists
   - Shows menu splash reliably (sets #vc-bg inline ONLY during menu)
   - Hides legacy engine home UI ("Tap To Start" screen) while menu is active
   - On Start: fades menu out, sets screen=game, returns control to runtime
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

  function getScreen() {
    return html.dataset.vcScreen || "";
  }

  function getBgEl() {
    return qs("#vc-bg");
  }

  // --- Legacy home screen suppression (Tap To Start / Load New Story / Continue Story) ---
  function findLegacyHomeRoots() {
    const roots = new Set();

    // Common ids/classes seen in older builds
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
      "#splash",
      "#splashScreen",
      "#splash-screen",
      ".start-screen",
      ".title-screen",
      ".home-screen",
      ".splash-screen",
    ].forEach((sel) => {
      qsa(sel).forEach((el) => roots.add(el));
    });

    // Text-based detection: find the "Tap To Start" button/link and climb to a sensible container
    const tappables = qsa("button, a, [role='button'], .btn, .button").filter((el) => {
      const t = (el.textContent || "").trim().toLowerCase();
      return t === "tap to start" || t.includes("tap to start");
    });

    tappables.forEach((btn) => {
      let node = btn;
      for (let i = 0; i < 6 && node; i++) {
        // Stop climbing if we hit body/html
        if (node === d.body || node === html) break;

        // Prefer a container that likely represents the whole legacy screen
        const id = (node.id || "").toLowerCase();
        const cls = (node.className || "").toString().toLowerCase();

        if (
          id.includes("start") ||
          id.includes("title") ||
          id.includes("home") ||
          id.includes("splash") ||
          cls.includes("start") ||
          cls.includes("title") ||
          cls.includes("home") ||
          cls.includes("splash")
        ) {
          roots.add(node);
          break;
        }
        node = node.parentElement;
      }
    });

    return Array.from(roots);
  }

  function hideLegacyHomeUI() {
    const roots = findLegacyHomeRoots();
    roots.forEach((el) => {
      // Do not accidentally hide the new menu
      if (el && el.id === "vc-menu") return;

      el.dataset.vcSuppressed = "1";
      el.style.display = "none";
      el.style.visibility = "hidden";
      el.style.pointerEvents = "none";
    });
  }

  function showLegacyHomeUI() {
    // Only restore things we suppressed
    qsa("[data-vc-suppressed='1']").forEach((el) => {
      el.style.display = "";
      el.style.visibility = "";
      el.style.pointerEvents = "";
      delete el.dataset.vcSuppressed;
    });
  }

  // --- Menu splash background control (without touching engine loader) ---
  function applyMenuSplash() {
    const bg = getBgEl();
    if (!bg) return;

    // Only set if empty / not already set, and only for menu mode
    const existing = (bg.style.backgroundImage || "").trim();
    if (!existing || existing === "none") {
      bg.style.backgroundImage = `url("${MENU_SPLASH}")`;
      bg.dataset.vcMenuSplash = "1";
    }

    // Force sane presentation (doesn't change which image engine uses)
    bg.style.backgroundPosition = "center center";
    bg.style.backgroundRepeat = "no-repeat";
    bg.style.backgroundSize = "cover";
  }

  function clearMenuSplash() {
    const bg = getBgEl();
    if (!bg) return;

    // Only clear what we applied
    if (bg.dataset.vcMenuSplash === "1") {
      bg.style.backgroundImage = "";
      delete bg.dataset.vcMenuSplash;
    }
  }

  // --- Menu show/hide helpers ---
  function showMenu() {
    const menu = qs("#vc-menu");
    if (!menu) return;

    menu.style.display = "";
    menu.style.opacity = "1";
    menu.style.transform = "";
    menu.style.filter = "";
    menu.style.pointerEvents = "auto";
    menu.removeAttribute("aria-hidden");

    setScreen("menu");
    hideLegacyHomeUI();
    applyMenuSplash();
  }

  function hideMenuWithFade() {
    const menu = qs("#vc-menu");
    if (!menu) return;

    menu.style.willChange = "opacity, transform, filter";
    menu.style.transition = "opacity 260ms ease, transform 260ms ease, filter 260ms ease";
    menu.style.opacity = "0";
    menu.style.transform = "translate3d(0, 8px, 0) scale(0.995)";
    menu.style.filter = "blur(1px)";
    menu.style.pointerEvents = "none";

    window.setTimeout(() => {
      menu.style.display = "none";
      menu.setAttribute("aria-hidden", "true");
    }, 300);
  }

  // --- Button finders (robust on mobile) ---
  function isBtn(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "button" || tag === "a" || el.getAttribute("role") === "button";
  }

  function findMenuButton(actionNames, textNeedle) {
    for (const name of actionNames) {
      const byData =
        qs(`#vc-menu [data-vc-action="${name}"]`) ||
        qs(`#vc-menu [data-action="${name}"]`) ||
        qs(`#vc-menu [data-action-id="${name}"]`);
      if (isBtn(byData)) return byData;

      const byId =
        qs(`#vc-menu #${name}`) ||
        qs(`#vc-menu #btn-${name}`) ||
        qs(`#vc-menu #vc-${name}`);
      if (isBtn(byId)) return byId;
    }

    if (textNeedle) {
      const candidates = qsa("#vc-menu button, #vc-menu a, #vc-menu [role='button']");
      const hit = candidates.find((el) => (el.textContent || "").trim().toLowerCase().includes(textNeedle));
      if (isBtn(hit)) return hit;
    }
    return null;
  }

  function dispatchMenuAction(action) {
    window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action, at: Date.now() } }));
  }

  function startGameFromMenu() {
    // Move to game mode
    hideMenuWithFade();
    setScreen("game");
    clearMenuSplash();

    // Keep legacy home suppressed so it can't re-appear
    hideLegacyHomeUI();

    dispatchMenuAction("start");

    // Best-effort calls if your runtime already exposes them (safe no-ops otherwise)
    try {
      if (typeof window.vcStart === "function") window.vcStart();
      else if (window.VerseCraft && typeof window.VerseCraft.start === "function") window.VerseCraft.start();
      else if (window.vc && typeof window.vc.start === "function") window.vc.start();
    } catch (_) {}
  }

  function continueFromMenu() {
    hideMenuWithFade();
    setScreen("game");
    clearMenuSplash();
    hideLegacyHomeUI();

    dispatchMenuAction("continue");

    try {
      if (typeof window.vcContinue === "function") window.vcContinue();
      else if (window.VerseCraft && typeof window.VerseCraft.continue === "function") window.VerseCraft.continue();
      else if (window.vc && typeof window.vc.continue === "function") window.vc.continue();
    } catch (_) {}
  }

  function loadStoryFromMenu() {
    // Don’t fight the engine’s existing story picker — just hand off with an event.
    // Your engine can already open that screen; we just request it.
    dispatchMenuAction("load");
  }

  function openSettingsFromMenu() {
    dispatchMenuAction("settings");
  }

  function wireMenuButtons() {
    const menu = qs("#vc-menu");
    if (!menu) return;

    const btnStart = findMenuButton(["start", "Start", "play", "Play"], "start");
    const btnContinue = findMenuButton(["continue", "Continue", "resume", "Resume"], "continue");
    const btnLoad = findMenuButton(["load", "Load", "load-story", "LoadStory"], "load");
    const btnSettings = findMenuButton(["settings", "Settings", "options", "Options"], "settings");

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

    bind(btnStart, startGameFromMenu);
    bind(btnContinue, continueFromMenu);
    bind(btnLoad, loadStoryFromMenu);
    bind(btnSettings, openSettingsFromMenu);

    // Helpful hint only (won’t break anything)
    if (!btnStart) {
      console.warn(
        "[VerseCraft menu.js] Start button not found. Add data-vc-action='start' to your Start button for guaranteed wiring."
      );
    }
  }

  function boot() {
    const menu = qs("#vc-menu");

    // If the cinematic menu exists, it owns the initial boot screen.
    if (menu) {
      showMenu();
      wireMenuButtons();
      return;
    }

    // If no cinematic menu, do nothing.
  }

  // Optional: let engine or UI call this later
  window.vcShowMenu = () => {
    // If returning to menu, allow legacy home to reappear ONLY if you want it.
    // For now, we keep legacy suppressed and show the cinematic menu.
    showMenu();
  };

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();