/* menu.js
   VerseCraft Menu Wiring (UI-only)
   - No frameworks
   - Does not change story engine logic
   - Simply hides menu and returns control to the existing UI
*/

(() => {
  "use strict";

  const menu = document.getElementById("vc-menu");
  if (!menu) return;

  const html = document.documentElement;

  const q = (sel) => menu.querySelector(sel);

  const btnStart    = q('[data-vc-action="start"]');
  const btnContinue = q('[data-vc-action="continue"]');
  const btnLoad     = q('[data-vc-action="load"]');
  const btnSettings = q('[data-vc-action="settings"]');

  function setScreen(mode) {
    html.dataset.vcScreen = mode; // "menu" or "game"
  }

  function showMenu() {
    setScreen("menu");
    menu.hidden = false;
    menu.classList.remove("vc-hide");
  }

  function hideMenu() {
    menu.classList.add("vc-hide");

    // Flip to game immediately so background/overlays shift
    setScreen("game");

    // After the fade, actually remove it
    window.setTimeout(() => {
      menu.hidden = true;
      menu.classList.remove("vc-hide");

      // Give control back to the story UI
      // If the engine shows a "Tap to Start" choice or first option,
      // we can optionally "kick" it by clicking the first visible choice.
      const firstChoice =
        document.querySelector("#app button:not([disabled])") ||
        document.querySelector("#app a") ||
        document.querySelector("button.choice") ||
        document.querySelector("a.choice");

      if (firstChoice && typeof firstChoice.click === "function") {
        // Don’t force it if you don’t want auto-start; comment this out if needed.
        // firstChoice.click();
      }
    }, 320);
  }

  // Wire actions
  if (btnStart) btnStart.addEventListener("click", hideMenu);

  // Continue stays disabled for now unless you later detect saves
  if (btnContinue) btnContinue.addEventListener("click", () => {
    if (btnContinue.disabled) return;
    hideMenu();
  });

  if (btnLoad) btnLoad.addEventListener("click", hideMenu);
  if (btnSettings) btnSettings.addEventListener("click", hideMenu);

  // Boot
  showMenu();

  // Expose for debugging / future
  window.VCMenu = { show: showMenu, hide: hideMenu };
})();