/* patch/menu.patch.js
   Fix: Start hides menu but game doesn't start.
   Cause: startGameFromMenu() in menu.js is likely NOT global (not on window).
   Solution: Dispatch the SAME CustomEvent your menu/engine already uses.
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

  // IMPORTANT: this is the cross-scope bridge
  // We dispatch a menu action event that existing code can listen for.
  function emitMenuAction(action) {
    // Try a few likely event names (we don't know the exact string from your screenshot)
    // One of these will match what your menu.js / app.js expects.
    const names = [
      "vc:menu",
      "vc-menu",
      "vc_menu",
      "VerseCraftMenu",
      "versecraft:menu"
    ];

    let fired = false;
    for (const name of names) {
      try {
        window.dispatchEvent(new CustomEvent(name, { detail: { action } }));
        fired = true;
      } catch (_) {}
    }
    return fired;
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

    setScreen("menu");
    applyMenuSplash();

    bind("start", () => {
      hideMenuInstant();
      setScreen("game");

      // Tell existing runtime to start (event bridge)
      emitMenuAction("start");
    });

    bind("load", () => {
      emitMenuAction("load");
    });

    bind("continue", () => {
      hideMenuInstant();
      setScreen("game");
      emitMenuAction("continue");
    });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();