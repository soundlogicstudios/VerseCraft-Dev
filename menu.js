HOME_BG_URL:
  "https://raw.githubusercontent.com/soundlogicstudios/VerseCraft-Media/main/backgrounds/ui/Home_Splash./* menu.js
   VerseCraft Cinematic Menu Controller (UI-only, vanilla JS)

   Works with your current structure:
   - #vc-bg exists
   - #vc-menu exists
   - #app exists (game UI root)
   - app.js is deferred

   Responsibilities:
   - Force "menu mode" on first load (for cinematic CSS)
   - Set #vc-bg to the HOME splash image when menu is visible
   - Hide menu on Start/Continue/Load/Settings tap
   - Switch to "game mode" visuals after menu closes
   - Avoid touching story navigation / engine logic
*/

(() => {
  "use strict";

  const HOME_BG_URL =
    "https://raw.githubusercontent.com/soundlogicstudios/VerseCraft-Media/main/backgrounds/ui/Home_Splash.png";

  const IDS = {
    bg: "vc-bg",
    menu: "vc-menu",
    app: "app",
  };

  const SELECTORS = {
    start:    '#vc-menu [data-vc-action="start"]',
    cont:     '#vc-menu [data-vc-action="continue"]',
    load:     '#vc-menu [data-vc-action="load"]',
    settings: '#vc-menu [data-vc-action="settings"]',
  };

  const $ = (sel) => document.querySelector(sel);

  function setScreen(mode /* "menu" | "game" */) {
    document.documentElement.dataset.vcScreen = mode;
  }

  function setBg(url) {
    const bg = document.getElementById(IDS.bg);
    if (!bg) return;
    bg.style.backgroundImage = `url("${url}")`;
  }

  function showMenu() {
    const menu = document.getElementById(IDS.menu);
    if (!menu) return;

    setScreen("menu");
    setBg(HOME_BG_URL);

    menu.hidden = false;
    menu.classList.remove("vc-hide");

    // Optional accessibility: hide app content from screen readers while in menu
    const app = document.getElementById(IDS.app);
    if (app) app.setAttribute("aria-hidden", "true");
  }

  function hideMenu() {
    const menu = document.getElementById(IDS.menu);
    if (!menu) return;

    // Fade out using the CSS helper class (vc-menu.css supports this)
    menu.classList.add("vc-hide");

    window.setTimeout(() => {
      menu.hidden = true;
      menu.classList.remove("vc-hide");
    }, 320);

    setScreen("game");

    const app = document.getElementById(IDS.app);
    if (app) app.removeAttribute("aria-hidden");

    // IMPORTANT:
    // We do NOT change story state here.
    // If your app.js immediately renders a section and sets a background,
    // it will naturally overwrite the menu splash once gameplay begins.
  }

  function wireButtons() {
    const startBtn = $(SELECTORS.start);
    const contBtn  = $(SELECTORS.cont);
    const loadBtn  = $(SELECTORS.load);
    const setBtn   = $(SELECTORS.settings);

    if (startBtn) startBtn.addEventListener("click", hideMenu);
    if (contBtn)  contBtn.addEventListener("click", hideMenu);
    if (loadBtn)  loadBtn.addEventListener("click", hideMenu);
    if (setBtn)   setBtn.addEventListener("click", hideMenu);
  }

  function init() {
    // If app.js sets a background on load, it might briefly flash before our splash.
    // This micro-delay ensures our menu splash wins on first paint without fighting your engine.
    showMenu();
    wireButtons();

    // If you see a flash of a story background before the splash, uncomment this:
    // window.setTimeout(() => setBg(HOME_BG_URL), 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose minimal hooks if you want them later (optional)
  window.VCMenu = { show: showMenu, hide: hideMenu };
})();
