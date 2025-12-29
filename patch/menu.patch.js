/* patch/menu.patch.js (DEBUG)
   Purpose: diagnose why Start/Load/Continue result in "black screen"
   - Shows an on-screen HUD (mobile friendly)
   - Does NOT hide menu unless window.VC exists AND a call succeeded
*/

(() => {
  const d = document;
  const html = document.documentElement;
  const qs = (sel, root = d) => root.querySelector(sel);

  function setScreen(name) {
    html.dataset.vcScreen = name;
  }

  function hideMenuOverlay() {
    const menu = qs("#vc-menu");
    if (!menu) return;
    menu.style.display = "none";
    menu.style.opacity = "0";
    menu.style.pointerEvents = "none";
  }

  // --- HUD ---
  function ensureHud() {
    let hud = qs("#vc-debug-hud");
    if (hud) return hud;

    hud = d.createElement("div");
    hud.id = "vc-debug-hud";
    hud.style.cssText = [
      "position:fixed",
      "left:12px",
      "right:12px",
      "bottom:12px",
      "z-index:999999",
      "background:rgba(0,0,0,.72)",
      "color:#fff",
      "border:1px solid rgba(255,255,255,.18)",
      "border-radius:14px",
      "padding:12px 12px",
      "font:12px/1.35 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
      "backdrop-filter: blur(8px)",
      "pointer-events:none",
      "white-space:pre-wrap",
    ].join(";");

    d.body.appendChild(hud);
    return hud;
  }

  function hudText(msg) {
    const hud = ensureHud();
    hud.textContent = msg;
  }

  function snapshot() {
    const hasVC = !!(window.VC && window.VC.__installed);
    const screen = html.dataset.vcScreen || "(none)";
    const hasMenu = !!qs("#vc-menu");
    const hasBg = !!qs("#vc-bg");
    return { hasVC, screen, hasMenu, hasBg };
  }

  function showSnapshot(prefix = "VC DEBUG") {
    const s = snapshot();
    hudText(
      `${prefix}\n` +
      `window.VC installed: ${s.hasVC ? "YES" : "NO"}\n` +
      `data-vc-screen: ${s.screen}\n` +
      `#vc-menu: ${s.hasMenu ? "YES" : "NO"}\n` +
      `#vc-bg: ${s.hasBg ? "YES" : "NO"}`
    );
  }

  function callVC(fnName) {
    const VC = window.VC;
    if (!VC || typeof VC[fnName] !== "function") return { ok: false, reason: "VC missing or function not found" };
    try {
      VC[fnName]();
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: String(e && (e.message || e)) };
    }
  }

  // --- button wiring ---
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
    if (!qs("#vc-menu")) return;

    if (!html.dataset.vcScreen) setScreen("menu");
    showSnapshot("VC DEBUG (loaded)");

    bind("start", () => {
      showSnapshot("Tapped START (before)");
      const s = snapshot();

      if (!s.hasVC) {
        hudText(
          "Tapped START\n\nwindow.VC installed: NO\n\nThis means the bridge block in app.js is NOT running.\n\nFix:\n- Confirm index.html includes <script src=\"app.js\"></script>\n- Confirm app.js loads (not 404)\n- Confirm bridge block is at the very bottom of app.js\n\n(Menu will stay visible so you don’t get a black screen.)"
        );
        return;
      }

      setScreen("game");
      const res = callVC("startNewRun");
      hudText(`Tapped START\nwindow.VC.startNewRun(): ${res.ok ? "OK" : "FAILED"}${res.reason ? "\nReason: " + res.reason : ""}`);

      // Only hide menu if the call succeeded
      if (res.ok) hideMenuOverlay();
    });

    bind("load", () => {
      showSnapshot("Tapped LOAD (before)");
      const s = snapshot();

      if (!s.hasVC) {
        hudText(
          "Tapped LOAD STORY\n\nwindow.VC installed: NO\n\nBridge block in app.js is NOT running.\n(Menu stays visible.)"
        );
        return;
      }

      setScreen("game");
      const res = callVC("openStoryPicker");
      hudText(`Tapped LOAD STORY\nwindow.VC.openStoryPicker(): ${res.ok ? "OK" : "FAILED"}${res.reason ? "\nReason: " + res.reason : ""}`);

      if (res.ok) hideMenuOverlay();
    });

    bind("continue", () => {
      showSnapshot("Tapped CONTINUE (before)");
      const s = snapshot();

      if (!s.hasVC) {
        hudText(
          "Tapped CONTINUE\n\nwindow.VC installed: NO\n\nBridge block in app.js is NOT running.\n(Menu stays visible.)"
        );
        return;
      }

      setScreen("game");
      const res = callVC("continueRun");
      hudText(`Tapped CONTINUE\nwindow.VC.continueRun(): ${res.ok ? "OK" : "FAILED"}${res.reason ? "\nReason: " + res.reason : ""}`);

      if (res.ok) hideMenuOverlay();
    });

    // Update HUD shortly after load (gives app.js time to run on slow iOS reloads)
    setTimeout(() => showSnapshot("VC DEBUG (after 300ms)"), 300);
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();