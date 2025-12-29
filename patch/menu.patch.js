/* patch/menu.patch.js
   Robust menu handoff without modifying the engine.

   Your build dispatches vc:menu but the runtime isn't consuming it,
   so we also attempt:
   - known global hooks (vcContinue / VerseCraft.* / vc.*)
   - DOM-click fallbacks (buttons/links by visible text)
*/

(() => {
  const d = document;
  const html = d.documentElement;
  const qs = (sel, root = d) => root.querySelector(sel);
  const qsa = (sel, root = d) => Array.from(root.querySelectorAll(sel));

  function setScreen(name) {
    html.dataset.vcScreen = name;
  }

  function fullyDisableOverlay() {
    const menu = qs("#vc-menu");
    if (menu) {
      menu.style.display = "none";
      menu.style.opacity = "0";
      menu.style.pointerEvents = "none";
    }

    // IMPORTANT: if vc-bg stays visible, it can look like "nothing happened".
    // Also make sure it never intercepts taps.
    const bg = qs("#vc-bg");
    if (bg) {
      bg.style.pointerEvents = "none";
      // Hide it in game so the engine can own the background
      bg.style.display = (html.dataset.vcScreen === "game") ? "none" : "";
    }
  }

  // --------- helpers to call unknown engine hooks safely ----------
  function tryCall(path) {
    // path can be "vcContinue" or "VerseCraft.continue" etc.
    try {
      const parts = path.split(".");
      let obj = window;
      for (const p of parts) obj = obj?.[p];
      if (typeof obj === "function") {
        obj();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function tryCallAny(paths) {
    for (const p of paths) {
      if (tryCall(p)) return true;
    }
    return false;
  }

  // Click a visible button/link by its text (last-resort, but very effective on mobile)
  function clickByText(targetText) {
    const want = targetText.trim().toLowerCase();

    const candidates = qsa("button, a, [role='button'], input[type='button'], input[type='submit']");
    for (const el of candidates) {
      let text = "";
      if (el.tagName === "INPUT") text = (el.value || "").trim();
      else text = (el.textContent || "").trim();

      if (!text) continue;
      if (text.toLowerCase() === want) {
        el.click();
        return true;
      }
    }
    return false;
  }

  // Some UIs have "Tap To Start" not "Start"
  function clickAnyText(texts) {
    for (const t of texts) {
      if (clickByText(t)) return true;
    }
    return false;
  }

  // --------- actions ----------
  function doStart() {
    setScreen("game");
    fullyDisableOverlay();

    // 1) Try known hook patterns (safe no-ops if absent)
    const ok =
      tryCallAny([
        "vcStart",
        "vcStartGame",
        "vcNewGame",
        "vcBegin",
        "VerseCraft.start",
        "VerseCraft.newGame",
        "vc.start",
        "vc.newGame",
      ]) ||
      // 2) Try to click legacy UI if it exists underneath
      clickAnyText(["Tap To Start", "Start", "New Game"]);

    // 3) If start didn’t open anything, immediately open the story picker
    // (This matches how you want the UX to feel.)
    setTimeout(() => {
      doLoadStory();
    }, ok ? 150 : 250);
  }

  function doContinue() {
    setScreen("game");
    fullyDisableOverlay();

    const ok =
      tryCallAny([
        // This one is explicitly referenced in your menu.js screenshot
        "vcContinue",
        "VerseCraft.continue",
        "vc.continue",
        "vcContinueGame",
      ]) ||
      clickAnyText(["Continue", "Continue Story", "Resume"]);

    // If continue doesn't exist, open story picker as fallback
    if (!ok) setTimeout(doLoadStory, 200);
  }

  function doLoadStory() {
    // Don't hide overlay for load unless you want it to disappear.
    // We'll keep overlay hidden if you got here via Start/Continue.
    const ok =
      tryCallAny([
        "vcLoad",
        "vcLoadStory",
        "vcOpenStoryPicker",
        "vcOpenStories",
        "VerseCraft.load",
        "VerseCraft.loadStory",
        "VerseCraft.openStoryPicker",
        "vc.load",
        "vc.loadStory",
      ]) ||
      clickAnyText(["Load Story", "Load New Story", "Stories", "Modules"]);

    return ok;
  }

  // --------- wiring ----------
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
    bind("continue", doContinue);
    bind("load", doLoadStory);
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();