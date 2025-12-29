/* patch/menu.patch.js
   Fixes: black screen after Start/Load/Continue

   Cause: menu.js suppresses legacy home UI (hideLegacyHomeUI),
   so when the overlay hides you can end up with nothing visible.

   Solution:
   - Before handoff, explicitly UNHIDE legacy home roots
   - Then call window.VC API (or fallback to clicking in-engine buttons by text)
*/

(() => {
  const d = document;
  const html = d.documentElement;

  const qs = (sel, root = d) => root.querySelector(sel);
  const qsa = (sel, root = d) => Array.from(root.querySelectorAll(sel));

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

  function unhideLegacyHomeUI() {
    // These selectors are taken from the legacy list you showed inside menu.js
    const selectors = [
      "#startScreen",
      "#start-screen",
      "#titleScreen",
      "#title-screen",
      "#home",
      "#homeScreen",
      "#home-screen",
      "#screen-home",
      "#vc-home",
    ];

    for (const sel of selectors) {
      const el = qs(sel);
      if (!el) continue;
      el.style.display = "";
      el.style.visibility = "";
      el.style.opacity = "";
      el.hidden = false;
      el.removeAttribute("aria-hidden");
    }
  }

  function clickByExactText(text) {
    const want = String(text).trim().toLowerCase();
    const candidates = qsa("button, a, [role='button'], input[type='button'], input[type='submit']");
    for (const el of candidates) {
      const t =
        el.tagName === "INPUT"
          ? (el.value || "").trim()
          : (el.textContent || "").trim();
      if (!t) continue;
      if (t.trim().toLowerCase() === want) {
        el.click();
        return true;
      }
    }
    return false;
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

  function openPickerFallback() {
    // Try common labels your engine has used in earlier screenshots
    return (
      clickByExactText("Load Story") ||
      clickByExactText("Load New Story") ||
      clickByExactText("Stories") ||
      clickByExactText("Modules")
    );
  }

  function doStart() {
    // Make sure engine home/picker is not suppressed
    unhideLegacyHomeUI();

    // Enter game screen (CSS wise), then start
    setScreen("game");
    hideMenuOverlay();

    // Prefer the stable bridge API
    if (callVC("startNewRun")) return;

    // Fallback: ask engine to show picker
    if (callVC("openStoryPicker")) return;

    // Last resort: click the in-engine picker button if it exists
    setTimeout(openPickerFallback, 150);
  }

  function doLoad() {
    unhideLegacyHomeUI();
    setScreen("game");
    hideMenuOverlay();

    if (callVC("openStoryPicker")) return;

    setTimeout(openPickerFallback, 150);
  }

  function doContinue() {
    unhideLegacyHomeUI();
    setScreen("game");
    hideMenuOverlay();

    if (callVC("continueRun")) return;

    // If continue isn’t available, open picker
    setTimeout(() => {
      if (!callVC("openStoryPicker")) openPickerFallback();
    }, 150);
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

    bind("start", doStart);
    bind("load", doLoad);
    bind("continue", doContinue);
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();