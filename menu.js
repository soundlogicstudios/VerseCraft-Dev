/* menu.js
   VerseCraft Cinematic Menu Controller (UI-only)

   Key change:
   - Uses a dedicated menu-only background layer (#vc-bg-menu)
     so app.js can keep controlling #vc-bg without overwriting the menu splash.
*/

(() => {
  "use strict";

  // Confirmed working asset URL
  const HOME_BG_URL =
    "https://raw.githubusercontent.com/soundlogicstudios/VerseCraft-Media/main/backgrounds/ui/Home_Splash.png?v=3";

  const IDS = {
    bgEngine: "vc-bg",        // existing engine background layer
    bgMenu: "vc-bg-menu",     // new menu-only background layer (created by this file)
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

  function setFooterStatus(text) {
    const menu = document.getElementById(IDS.menu);
    if (!menu) return;
    const ver = menu.querySelector(".vc-menu__version");
    if (ver) ver.textContent = text;
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

  // Create a dedicated menu background layer that the engine never touches
  function ensureMenuBgLayer() {
    let el = document.getElementById(IDS.bgMenu);
    if (el) return el;

    el = document.createElement("div");
    el.id = IDS.bgMenu;

    // Fullscreen, behind menu, above engine bg
    const s = el.style;
    s.position = "fixed";
    s.inset = "0";
    s.width = "100vw";
    s.height = "100vh";
    s.zIndex = "1"; // engine bg is usually 0, menu panel is 2+
    s.pointerEvents = "none";

    // Background presentation
    s.backgroundSize = "cover";
    s.backgroundPosition = "center center";
    s.backgroundRepeat = "no-repeat";

    // Cinematic treatment (match your vc-menu.css vibe)
    // If you want it sharper, reduce blur or increase brightness.
    s.transform = "scale(1.06)";
    s.filter = "blur(10px) brightness(0.62)";
    s.transition = "opacity 320ms ease, filter 320ms ease, transform 320ms ease";
    s.opacity = "0";

    // Insert right after the engine background layer if it exists,
    // otherwise put it at top of <body>.
    const engineBg = document.getElementById(IDS.bgEngine);
    if (engineBg && engineBg.parentNode) {
      engineBg.parentNode.insertBefore(el, engineBg.nextSibling);
    } else {
      document.body.insertBefore(el, document.body.firstChild);
    }

    return el;
  }

  function setMenuBg(url) {
    const el = ensureMenuBgLayer();
    el.style.backgroundImage = `url("${url}")`;
  }

  function showMenuBg() {
    const el = ensureMenuBgLayer();
    el.style.opacity = "1";
  }

  function hideMenuBg() {
    const el = document.getElementById(IDS.bgMenu);
    if (!el) return;
    el.style.opacity = "0";
  }

  async function showMenu() {
    const menu = document.getElementById(IDS.menu);
    if (!menu) return;

    setScreen("menu");
    menu.hidden = false;
    menu.classList.remove("vc-hide");

    const app = document.getElementById(IDS.app);
    if (app) app.setAttribute("aria-hidden", "true");

    setFooterStatus("Loading splash…");

    try {
      await preload(HOME_BG_URL);
      setMenuBg(HOME_BG_URL);
      showMenuBg();
      setFooterStatus("DEV");
    } catch (e) {
      console.error("[VCMenu] Splash error:", e);
      console.error("[VCMenu] URL:", HOME_BG_URL);
      // Still attempt to set it (sometimes preload fails but fetch succeeds)
      setMenuBg(HOME_BG_URL);
      showMenuBg();
      setFooterStatus("SPLASH FAIL");
    }
  }

  function hideMenu() {
    const menu = document.getElementById(IDS.menu);
    if (!menu) return;

    menu.classList.add("vc-hide");
    hideMenuBg();

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
    showMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.VCMenu = { show: showMenu, hide: hideMenu };
})();