/* menu.js (Proof + Lock version)
   VerseCraft Cinematic Menu Controller (UI-only)

   Fixes two common issues:
   1) menu.js not actually running (adds visible "MENU.JS OK" status)
   2) app.js overwriting #vc-bg on load (locks splash while menu is visible)
*/

(() => {
  "use strict";

  // ---- Your confirmed working raw URL (with cache-buster) ----
  const HOME_BG_URL =
    "https://raw.githubusercontent.com/soundlogicstudios/VerseCraft-Media/main/backgrounds/ui/Home_Splash.png?v=2";

  const IDS = {
    bg: "vc-bg",
    menu: "vc-menu",
    app: "app",
  };

  const BTN = {
    start:    '#vc-menu [data-vc-action="start"]',
    cont:     '#vc-menu [data-vc-action="continue"]',
    load:     '#vc-menu [data-vc-action="load"]',
    settings: '#vc-menu [data-vc-action="settings"]',
  };

  const $ = (sel) => document.querySelector(sel);

  function setScreen(mode /* "menu" | "game" */) {
    document.documentElement.dataset.vcScreen = mode;
  }

  function ensureBgLayer() {
    const bg = document.getElementById(IDS.bg);
    if (!bg) return null;

    // Force #vc-bg to be a real fullscreen layer even if other CSS conflicts
    const s = bg.style;
    s.position = "fixed";
    s.inset = "0";
    s.width = "100vw";
    s.height = "100vh";
    s.zIndex = "0";
    s.backgroundSize = "cover";
    s.backgroundPosition = "center center";
    s.backgroundRepeat = "no-repeat";

    return bg;
  }

  function setBg(url) {
    const bg = ensureBgLayer();
    if (!bg) return;
    bg.style.backgroundImage = `url("${url}")`;
  }

  function setFooterStatus(text) {
    const menu = document.getElementById(IDS.menu);
    if (!menu) return;

    const ver = menu.querySelector(".vc-menu__version");
    if (ver) {
      ver.textContent = text;
      ver.style.opacity = "0.95";
      return;
    }
  }

  function preload(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(true);
      img.onerror = () => reject(new Error("Splash failed to load"));
      img.src = url;
    });
  }

  // Re-apply the splash for a short window so app.js can’t overwrite it during init.
  function lockSplashForMenu(ms = 2000) {
    const menu = document.getElementById(IDS.menu);
    if (!menu || menu.hidden) return;

    const start = Date.now();
    const tick = () => {
      const stillVisible = !menu.hidden && !menu.classList.contains("vc-hide");
      if (!stillVisible) return;

      setBg(HOME_BG_URL);

      if (Date.now() - start < ms) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  async function showMenu() {
    const menu = document.getElementById(IDS.menu);
    if (!menu) return;

    setScreen("menu");
    menu.hidden = false;
    menu.classList.remove("vc-hide");

    // Optional: hide gameplay from screen readers while in menu
    const app = document.getElementById(IDS.app);
    if (app) app.setAttribute("aria-hidden", "true");

    // Visible proof menu.js is running
    setFooterStatus("MENU.JS OK");

    // Load splash and apply
    try {
      setFooterStatus("Loading splash…");
      await preload(HOME_BG_URL);
      setBg(HOME_BG_URL);
      setFooterStatus("DEV");
    } catch (e) {
      console.error("[VCMenu] Splash error:", e);
      console.error("[VCMenu] URL:", HOME_BG_URL);
      setFooterStatus("SPLASH FAIL");
      // still attempt apply
      setBg(HOME_BG_URL);
    }

    // Lock it briefly so app.js can’t stomp it while menu is visible
    lockSplashForMenu(2200);
  }

  function hideMenu() {
    const menu = document.getElementById(IDS.menu);
    if (!menu) return;

    menu.classList.add("vc-hide");

    window.setTimeout(() => {
      menu.hidden = true;
      menu.classList.remove("vc-hide");
    }, 320);

    setScreen("game");

    const app = document.getElementById(IDS.app);
    if (app) app.removeAttribute("aria-hidden");
  }

  function wireButtons() {
    const startBtn = $(BTN.start);
    const contBtn  = $(BTN.cont);
    const loadBtn  = $(BTN.load);
    const setBtn   = $(BTN.settings);

    if (startBtn) startBtn.addEventListener("click", hideMenu);
    if (contBtn)  contBtn.addEventListener("click", hideMenu);
    if (loadBtn)  loadBtn.addEventListener("click", hideMenu);
    if (setBtn)   setBtn.addEventListener("click", hideMenu);
  }

  function init() {
    wireButtons();

    // Run after DOM is parsed. Defer scripts guarantee this, but we keep it safe.
    showMenu();

    // Extra passes in case app.js sets background right after load
    setTimeout(showMenu, 0);
    setTimeout(() => setBg(HOME_BG_URL), 50);
    setTimeout(() => setBg(HOME_BG_URL), 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.VCMenu = { show: showMenu, hide: hideMenu };
})();