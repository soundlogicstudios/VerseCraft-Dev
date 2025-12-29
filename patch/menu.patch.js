/* patch/menu.patch.js
   Uses the official runtime API exposed by app.js:
   window.VC.startNewRun()
   window.VC.openStoryPicker()
   window.VC.continueRun()
*/

(() => {
  const d = document;
  const html = d.documentElement;
  const qs = (sel, root = d) => root.querySelector(sel);

  function setScreen(name) {
    html.dataset.vcScreen = name;
  }

  function hideMenu() {
    const menu = qs("#vc-menu");
    if (menu) {
      menu.style.display = "none";
      menu.style.opacity = "0";
      menu.style.pointerEvents = "none";
    }
  }

  function showMenu() {
    const menu = qs("#vc-menu");
    if (menu) {
      menu.style.display = "";
      menu.style.opacity = "1";
      menu.style.pointerEvents = "auto";
    }
  }

  function callVC(fnName) {
    const VC = window.VC;
    if (!VC || typeof VC[fnName] !== "function") return false;
    try {
      VC[fnName]();
      return true;
    } catch (_) {
      return false;
    }
  }

  function bind(action, handler) {
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

    if (!html.dataset.vcScreen) setScreen("menu");

    bind("start", () => {
      hideMenu();
      setScreen("game");

      // Start new run (bridge will open picker after)
      if (!callVC("startNewRun")) {
        // fallback: emit event the bridge consumes
        window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "start" } }));
      }
    });

    bind("load", () => {
      // Keep menu visible if you want; I’ll hide it for a clean flow
      hideMenu();
      setScreen("game");

      if (!callVC("openStoryPicker")) {
        window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "load" } }));
      }
    });

    bind("continue", () => {
      hideMenu();
      setScreen("game");

      if (!callVC("continueRun")) {
        window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "continue" } }));
      }
    });

    // Optional: if your in-game UI has a "Main Menu" button that emits vc:menu {action:"menu"},
    // you can listen and re-show the overlay menu:
    window.addEventListener("vc:menu", (e) => {
      if (e?.detail?.action === "menu") {
        setScreen("menu");
        showMenu();
      }
    });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();