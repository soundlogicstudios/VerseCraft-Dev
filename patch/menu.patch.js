/* patch/menu.patch.js
   Goal: Wire cinematic menu buttons to the EXISTING menu.js logic.
   Key: menu.js already defines startGameFromMenu() (confirmed by your screenshot).
   We call that instead of guessing engine entry points.

   Assumptions:
   - menu.js is loaded on the page (before or after app.js; either is fine as long as it loads).
   - #vc-menu exists in DOM at boot.
*/

(() => {
  const d = document;
  const html = d.documentElement;

  const MENU_SPLASH =
    "https://raw.githubusercontent.com/soundlogicstudios/VerseCraft-Media/main/backgrounds/ui/Home_Splash.png";

  const qs = (sel, root = d) => root.querySelector(sel);

  function setScreen(name) {
    html.dataset.vcScreen = name;
  }

  function applyMenuSplash() {
    const bg = qs("#vc-bg");
    if (!bg) return;
    bg.style.backgroundImage = `url("${MENU_SPLASH}")`;
    bg.style.backgroundPosition = "center center";
    bg.style.backgroundRepeat = "no-repeat";
    bg.style.backgroundSize = "cover";
    bg.dataset.vcMenuSplash = "1";
  }

  function hideMenuInstant() {
    const menu = qs("#vc-menu");
    if (!menu) return;
    menu.style.display = "none";
    menu.style.pointerEvents = "none";
  }

  function callExistingStart() {
    // ✅ Best case: your real function exists (from menu.js)
    if (typeof window.startGameFromMenu === "function") {
      window.startGameFromMenu();
      return true;
    }

    // Next: some builds expose a generic dispatcher (your screenshot shows dispatchMenuAction)
    if (typeof window.dispatchMenuAction === "function") {
      window.dispatchMenuAction("start");
      return true;
    }

    // Fallback: emit an event (harmless if nothing listens)
    window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "start" } }));
    return false;
  }

  function bindButton(action, handler) {
    const btn =
      qs(`#vc-menu [data-vc-action="${action}"]`) ||
      qs(`#vc-menu [data-action="${action}"]`);

    if (!btn) return;

    const onTap = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handler();
    };

    btn.addEventListener("pointerup", onTap, { passive: false });
    btn.addEventListener("click", onTap, { passive: false });
  }

  function boot() {
    const menu = qs("#vc-menu");
    if (!menu) return;

    // Ensure menu mode at first paint
    setScreen("menu");
    applyMenuSplash();

    // START
    bindButton("start", () => {
      // Let your existing menu.js own the transition if it exists
      const ok = callExistingStart();

      // If it didn't exist, do the minimum reasonable handoff
      if (!ok) {
        hideMenuInstant();
        setScreen("game");
        // engine may be waiting; but at least menu is gone
      }
    });

    // LOAD (optional wiring; safe noop if your build doesn't support it)
    bindButton("load", () => {
      if (typeof window.dispatchMenuAction === "function") {
        window.dispatchMenuAction("load");
      } else {
        window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "load" } }));
      }
    });

    // CONTINUE (optional wiring; safe noop if not supported)
    bindButton("continue", () => {
      if (typeof window.dispatchMenuAction === "function") {
        window.dispatchMenuAction("continue");
      } else if (typeof window.continueGameFromMenu === "function") {
        window.continueGameFromMenu();
      } else {
        window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "continue" } }));
      }
    });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();