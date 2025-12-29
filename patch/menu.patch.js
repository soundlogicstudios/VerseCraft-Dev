/* patch/menu.patch.js
   Goal:
   - Force html[data-vc-screen] to be consistent
   - Cinematic menu is the only home screen
   - Suppress legacy "Tap To Start" UI whenever menu is active
   - Apply menu splash directly to #vc-bg during menu (engine untouched)
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

  function setScreen(name) {
    html.dataset.vcScreen = name;
  }

  function getScreen() {
    return html.dataset.vcScreen || "";
  }

  // Apply menu splash ONLY during menu screen
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

  // Find and suppress legacy home UI reliably (survives rerenders)
  function findLegacyHomeCandidates() {
    const candidates = [];

    // direct known ids/classes (if present)
    const known = [
      "#startScreen", "#start-screen",
      "#titleScreen", "#title-screen",
      "#homeScreen", "#home-screen",
      "#splashScreen", "#splash-screen",
      ".start-screen", ".title-screen", ".home-screen", ".splash-screen",
    ];
    known.forEach(sel => qsa(sel).forEach(el => candidates.push(el)));

    // text-based: locate "Tap To Start" elements then walk up
    const tapEls = qsa("button, a, [role='button']").filter(el => {
      const t = (el.textContent || "").trim().toLowerCase();
      return t.includes("tap to start") || t === "tap to start";
    });

    tapEls.forEach(el => {
      let node = el;
      for (let i = 0; i < 7 && node; i++) {
        if (node === d.body || node === html) break;
        const id = (node.id || "").toLowerCase();
        const cls = (node.className || "").toString().toLowerCase();
        if (
          id.includes("start") || id.includes("title") || id.includes("home") || id.includes("splash") ||
          cls.includes("start") || cls.includes("title") || cls.includes("home") || cls.includes("splash")
        ) {
          candidates.push(node);
          break;
        }
        node = node.parentElement;
      }
    });

    // de-dupe
    return Array.from(new Set(candidates)).filter(Boolean);
  }

  function suppressLegacyHome() {
    const menu = menuEl();
    if (!menu) return;

    const candidates = findLegacyHomeCandidates();

    candidates.forEach(el => {
      if (el === menu) return;
      el.dataset.vcSuppressed = "1";
      el.style.display = "none";
      el.style.visibility = "hidden";
      el.style.pointerEvents = "none";
    });

    // Also: if the engine renders legacy home as the BODY's first child container,
    // we keep it suppressed whenever screen=menu via observer below.
  }

  function unsuppressLegacyHome() {
    qsa("[data-vc-suppressed='1']").forEach(el => {
      el.style.display = "";
      el.style.visibility = "";
      el.style.pointerEvents = "";
      delete el.dataset.vcSuppressed;
    });
  }

  // Button wiring (minimal)
  function wireMenuButtons() {
    const menu = menuEl();
    if (!menu) return;

    const buttons = qsa("#vc-menu button, #vc-menu a, #vc-menu [role='button']");
    const byText = (needle) =>
      buttons.find(b => (b.textContent || "").trim().toLowerCase().includes(needle));

    const startBtn =
      qs('#vc-menu [data-vc-action="start"]') ||
      qs('#vc-menu [data-action="start"]') ||
      byText("start");

    const loadBtn =
      qs('#vc-menu [data-vc-action="load"]') ||
      qs('#vc-menu [data-action="load"]') ||
      byText("load");

    const contBtn =
      qs('#vc-menu [data-vc-action="continue"]') ||
      qs('#vc-menu [data-action="continue"]') ||
      byText("continue");

    const handler = (fn) => (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    };

    if (startBtn) {
      startBtn.addEventListener("pointerup", handler(() => {
        menu.style.display = "none";
        setScreen("game");
        clearMenuSplash();
        suppressLegacyHome(); // keep legacy suppressed
        window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "start" } }));
      }), { passive: false });

      startBtn.addEventListener("click", handler(() => {}), { passive: false });
    }

    if (loadBtn) {
      loadBtn.addEventListener("pointerup", handler(() => {
        window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "load" } }));
      }), { passive: false });
    }

    if (contBtn) {
      contBtn.addEventListener("pointerup", handler(() => {
        menu.style.display = "none";
        setScreen("game");
        clearMenuSplash();
        suppressLegacyHome();
        window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action: "continue" } }));
      }), { passive: false });
    }
  }

  function boot() {
    const menu = menuEl();
    if (!menu) return;

    // 1) Force menu mode at boot
    setScreen("menu");

    // 2) Force splash on #vc-bg while in menu
    applyMenuSplash();

    // 3) Suppress legacy home UI
    suppressLegacyHome();

    // 4) Wire cinematic menu buttons
    wireMenuButtons();

    // 5) Observe DOM: if engine re-injects legacy home while we are in menu, suppress again
    const obs = new MutationObserver(() => {
      if (getScreen() === "menu") {
        suppressLegacyHome();
      }
    });
    obs.observe(d.body, { childList: true, subtree: true });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();