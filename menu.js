/* menu.js
   VerseCraft Cinematic Menu Controller (UI-only, vanilla JS)
   - Ensures #vc-bg is visible (even if vc-menu.css is not linked yet)
   - Preloads the Home_Splash image and reports errors on-screen
   - Sets html[data-vc-screen="menu"|"game"] for CSS polish
   - Does NOT touch story navigation/engine logic
*/

(() => {
  "use strict";

  // ------------------------------------------------------------
  // CONFIG
  // ------------------------------------------------------------
  const HOME_BG_URL_BASE =
    "https://raw.githubusercontent.com/soundlogicstudios/VerseCraft-Media/main/backgrounds/ui/Home_Splash.png";

  // Add a cache-buster to avoid iOS/Safari stale caching issues.
  // This does NOT change your asset; it just forces a fresh fetch.
  const HOME_BG_URL = `${HOME_BG_URL_BASE}?v=1`;

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

  // ------------------------------------------------------------
  // Minimal safety styling for #vc-bg
  // (in case vc-menu.css wasn’t linked or is cached)
  // ------------------------------------------------------------
  function ensureBgLayerVisible() {
    const bg = document.getElementById(IDS.bg);
    if (!bg) return;

    // Only set essentials; does not fight your CSS if it exists.
    const s = bg.style;
    if (!s.position) s.position = "fixed";
    if (!s.inset) s.inset = "0";
    if (!s.backgroundSize) s.backgroundSize = "cover";
    if (!s.backgroundPosition) s.backgroundPosition = "center center";
    if (!s.backgroundRepeat) s.backgroundRepeat = "no-repeat";
    if (!s.zIndex) s.zIndex = "0";

    // If the rest of your UI has its own stacking contexts, this keeps bg behind.
    // Menu CSS uses z-index 2+ for menu/overlays; this stays at 0.
  }

  function setScreen(mode /* "menu" | "game" */) {
    document.documentElement.dataset.vcScreen = mode;
  }

  function setBg(url) {
    const bg = document.getElementById(IDS.bg);
    if (!bg) return;
    bg.style.backgroundImage = `url("${url}")`;
  }

  // ------------------------------------------------------------
  // Mobile-friendly on-screen status (no devtools needed)
  // ------------------------------------------------------------
  function setMenuStatus(text, isError) {
    const menu = document.getElementById(IDS.menu);
    if (!menu) return;

    // Try to reuse your footer version slot if it exists
    const versionEl = menu.querySelector(".vc-menu__version");
    if (versionEl) {
      versionEl.textContent = text;
      versionEl.style.opacity = "0.95";
      versionEl.style.color = isError ? "rgba(255,160,160,.95)" : "rgba(255,255,255,.70)";
      return;
    }

    // Fallback: add a tiny status line at bottom of menu
    let status = menu.querySelector("[data-vc-status]");
    if (!status) {
      status = document.createElement("div");
      status.setAttribute("data-vc-status", "1");
      status.style.marginTop = "10px";
      status.style.fontSize = "12px";
      status.style.opacity = "0.9";
      menu.appendChild(status);
    }
    status.textContent = text;
    status.style.color = isError ? "rgba(255,160,160,.95)" : "rgba(255,255,255,.70)";
  }

  // ------------------------------------------------------------
  // Preload the splash image so we KNOW it’s loadable
  // ------------------------------------------------------------
  function preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(true);
      img.onerror = () => reject(new Error("Image failed to load"));
      img.src = url;
    });
  }

  // ------------------------------------------------------------
  // Menu Control
  // ------------------------------------------------------------
  async function showMenu() {
    const menu = document.getElementById(IDS.menu);
    if (!menu) return;

    ensureBgLayerVisible();
    setScreen("menu");

    menu.hidden = false;
    menu.classList.remove("vc-hide");

    // Optional accessibility: hide gameplay from screen readers while menu is up
    const app = document.getElementById(IDS.app);
    if (app) app.setAttribute("aria-hidden", "true");

    // Load & apply splash with clear status
    setMenuStatus("Loading splash…", false);

    try {
      await preloadImage(HOME_BG_URL);
      setBg(HOME_BG_URL);
      setMenuStatus("DEV", false);
    } catch (e) {
      // If it fails, show the URL so you can spot casing/branch issues instantly
      setMenuStatus("Splash failed to load", true);
      // Also try applying anyway (sometimes preload fails but CSS fetch works)
      setBg(HOME_BG_URL);
      // Log for anyone who can open console
      console.error("[VCMenu] Splash preload failed:", e);
      console.error("[VCMenu] URL:", HOME_BG_URL);
    }
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

    // Do NOT touch story navigation / section state.
    // Your existing app.js will continue as-is.
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
    wireButtons();

    // Show menu after DOM is ready.
    // Also do a micro-delay so if app.js sets something immediately,
    // our menu splash still wins while the menu is visible.
    showMenu();
    window.setTimeout(showMenu, 0);
    window.setTimeout(showMenu, 50);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.VCMenu = { show: showMenu, hide: hideMenu };
})();