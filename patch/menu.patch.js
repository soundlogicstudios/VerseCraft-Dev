/* patch/menu.patch.js
   VerseCraft Menu Patch (Unhide legacy home -> proxy-click -> fade menu)

   What this does:
   1) Repeatedly "un-hides" the legacy home/start UI elements the engine created
      (some builds hide them to prevent the old screen from showing)
   2) When user taps Start/Load/Continue on #vc-menu, we find the engine's matching
      button by text and click it.
   3) Only after a successful click do we fade out #vc-menu + set data-vc-screen="game".

   No app.js changes. No libraries.
*/

(() => {
  "use strict";

  const DEBUG = true;

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function norm(s) {
    return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function inMenu(el) {
    const menu = qs("#vc-menu");
    return !!(menu && el && menu.contains(el));
  }

  // ---- Debug badge ---------------------------------------------------------

  function badge(text) {
    if (!DEBUG) return;
    let el = qs("#vcPatchBadge");
    if (!el) {
      el = document.createElement("div");
      el.id = "vcPatchBadge";
      el.style.cssText =
        "position:fixed;top:12px;left:12px;z-index:999999;" +
        "background:rgba(0,255,120,.92);color:#001b0e;" +
        "font:700 14px/1 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;" +
        "padding:10px 12px;border-radius:12px;" +
        "box-shadow:0 8px 24px rgba(0,0,0,.35);" +
        "border:1px solid rgba(0,0,0,.18);" +
        "pointer-events:none;max-width:92vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
      document.documentElement.appendChild(el);
    }
    el.textContent = text;
  }

  // ---- Legacy home un-hider ------------------------------------------------
  // Your menu.js (and/or earlier patches) may suppress the old home screen
  // by setting display:none/visibility:hidden on common containers.
  // We gently undo that so the buttons exist for proxy-clicking behind #vc-menu.

  const LEGACY_ROOT_SELECTORS = [
    "#startScreen",
    "#start-screen",
    "#titleScreen",
    "#title-screen",
    "#home",
    "#homeScreen",
    "#home-screen",
    "#screen-home",
    "#vc-home",
    "#menu",          // older builds
    ".homeScreen",    // older builds
    ".startScreen",
    ".titleScreen"
  ];

  function unhideElement(el) {
    if (!el || inMenu(el)) return;
    // Only clear the obvious "hard hide" properties.
    // We do NOT force layout/positioning.
    if (el.style) {
      if (el.style.display === "none") el.style.display = "";
      if (el.style.visibility === "hidden") el.style.visibility = "";
      if (el.style.opacity === "0") el.style.opacity = "";
      if (el.hasAttribute("hidden")) el.removeAttribute("hidden");
      if (el.getAttribute("aria-hidden") === "true") el.setAttribute("aria-hidden", "false");
    }
  }

  function unhideLegacyHomeUI() {
    // Unhide common root containers
    for (const sel of LEGACY_ROOT_SELECTORS) {
      qsa(sel).forEach(unhideElement);
    }

    // Unhide any obvious legacy buttons that might have been hidden
    const candidates = qsa('button, a, [role="button"], input[type="button"], input[type="submit"]')
      .filter((el) => !inMenu(el));

    for (const el of candidates) {
      const t = norm(el.innerText || el.value || el.getAttribute("aria-label"));
      if (!t) continue;
      // Only "rescue" likely home/menu actions
      if (
        t.includes("tap to start") ||
        t === "start" ||
        t.includes("load") ||
        t.includes("continue") ||
        t.includes("resume") ||
        t.includes("new story")
      ) {
        unhideElement(el);
        // also unhide its parents a bit (sometimes the container is hidden)
        let p = el.parentElement;
        for (let i = 0; i < 4 && p; i++) {
          unhideElement(p);
          p = p.parentElement;
        }
      }
    }
  }

  // Run the unhide multiple times early, because some scripts apply hides after load
  function startLegacyRescueWindow() {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      unhideLegacyHomeUI();
      if (Date.now() - startedAt > 2500) window.clearInterval(timer);
    }, 120);
  }

  // ---- Proxy click ---------------------------------------------------------

  function findEngineActionByText(possibleLabels) {
    const needles = possibleLabels.map(norm);

    // Search all clickable things OUTSIDE menu
    const candidates = qsa(
      'button, a, [role="button"], input[type="button"], input[type="submit"]'
    ).filter((el) => !inMenu(el));

    // Try best match by text
    for (const el of candidates) {
      const t = norm(el.innerText || el.value || el.getAttribute("aria-label"));
      if (!t) continue;
      for (const n of needles) {
        if (t === n || t.includes(n)) return el;
      }
    }
    return null;
  }

  function safeClick(el) {
    if (!el) return false;

    // Make sure it isn't hard-hidden (some browsers won't click hidden elements)
    unhideElement(el);
    try { el.scrollIntoView({ block: "center", inline: "center" }); } catch (_) {}

    try {
      el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    } catch (_) {}

    try {
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    } catch (_) {}

    try {
      el.click();
      return true;
    } catch (_) {
      return false;
    }
  }

  function setScreen(screen) {
    document.documentElement.dataset.vcScreen = screen;
  }

  function hideMenuWithFade() {
    const menu = qs("#vc-menu");
    if (!menu) return;
    menu.style.transition = "opacity 220ms ease";
    menu.style.opacity = "0";
    window.setTimeout(() => {
      menu.style.display = "none";
      menu.style.pointerEvents = "none";
    }, 240);
  }

  function proxyAction(action) {
    // Before searching, try to restore legacy UI again
    unhideLegacyHomeUI();

    const map = {
      start: ["tap to start", "start", "begin", "new run", "new story"],
      load: ["load new story", "load story", "load", "pick a module", "choose a story"],
      continue: ["continue story", "continue", "resume", "last save"],
    };

    const labels = map[action] || [action];
    const target = findEngineActionByText(labels);

    if (!target) {
      badge(`PATCH LOADED — no engine target for: ${action}`);
      // Fire an event anyway (future-proof)
      window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action } }));
      return;
    }

    const ok = safeClick(target);

    if (ok) {
      badge(`PATCH LOADED — proxy ok: ${action}`);
      window.setTimeout(() => {
        setScreen("game");
        hideMenuWithFade();
      }, 140);
    } else {
      badge(`PATCH LOADED — target found but click failed: ${action}`);
    }
  }

  // ---- Bind menu buttons ---------------------------------------------------

  function bindMenuButtons() {
    badge("PATCH LOADED");
    startLegacyRescueWindow();

    const menu = qs("#vc-menu");
    if (!menu) {
      badge("PATCH LOADED — #vc-menu missing");
      return;
    }

    const btns = qsa("[data-vc-action]", menu);
    btns.forEach((btn) => {
      const action = (btn.getAttribute("data-vc-action") || "").trim().toLowerCase();
      if (!action) return;

      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        proxyAction(action);
      };

      btn.addEventListener("click", handler, { passive: false });
      btn.addEventListener("touchend", handler, { passive: false });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindMenuButtons);
  } else {
    bindMenuButtons();
  }
})();