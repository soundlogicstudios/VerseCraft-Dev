/* patch/menu.patch.js
   Bridges the new overlay menu buttons to the engine by clicking the engine's
   own legacy buttons that are rendered by app.js.

   Targets (from app.js):
   - Start:    #btnTapStart
   - Load:     #btnStoryPicker
   - Continue: #btnContinue
*/

(function () {
  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function toast(msg) {
    try {
      let el = qs("#vc-toast");
      if (!el) {
        el = document.createElement("div");
        el.id = "vc-toast";
        el.style.position = "fixed";
        el.style.left = "12px";
        el.style.right = "12px";
        el.style.top = "12px";
        el.style.zIndex = "99999";
        el.style.padding = "12px 14px";
        el.style.borderRadius = "14px";
        el.style.background = "rgba(0,0,0,.75)";
        el.style.color = "#fff";
        el.style.fontFamily = "-apple-system,system-ui,sans-serif";
        el.style.fontSize = "14px";
        el.style.backdropFilter = "blur(10px)";
        el.style.webkitBackdropFilter = "blur(10px)";
        el.style.pointerEvents = "none";
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.opacity = "1";
      clearTimeout(el._t);
      el._t = setTimeout(() => (el.style.opacity = "0"), 1600);
    } catch (_) {}
  }

  function hideMenuOverlay() {
    const menu = qs("#vc-menu");
    if (menu) {
      menu.style.display = "none";
      menu.style.pointerEvents = "none";
    }
    document.documentElement.dataset.vcScreen = "game";
  }

  function clickIfExists(selector) {
    const el = qs(selector);
    if (el && typeof el.click === "function") {
      el.click();
      return true;
    }
    return false;
  }

  function triggerEngine(action) {
    // IMPORTANT: We do NOT guess window functions.
    // We directly click the engine's own buttons (most stable).

    if (action === "start") {
      if (clickIfExists("#btnTapStart")) return { ok: true, target: "#btnTapStart" };
      // fallback common ids (just in case)
      if (clickIfExists("#btnStart")) return { ok: true, target: "#btnStart" };
      return { ok: false, reason: "Missing engine start button (#btnTapStart)" };
    }

    if (action === "load") {
      if (clickIfExists("#btnStoryPicker")) return { ok: true, target: "#btnStoryPicker" };
      if (clickIfExists("#btnLoadStory")) return { ok: true, target: "#btnLoadStory" };
      return { ok: false, reason: "Missing engine load button (#btnStoryPicker)" };
    }

    if (action === "continue") {
      if (clickIfExists("#btnContinue")) return { ok: true, target: "#btnContinue" };
      return { ok: false, reason: "Missing engine continue button (#btnContinue)" };
    }

    return { ok: false, reason: `Unknown action: ${action}` };
  }

  function wireMenu() {
    // Attach once
    const menu = qs("#vc-menu");
    if (!menu) {
      toast("PATCH LOADED (no #vc-menu found)");
      return;
    }

    const buttons = menu.querySelectorAll("[data-vc-action]");
    if (!buttons.length) {
      toast("PATCH LOADED (no [data-vc-action] buttons)");
      return;
    }

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-vc-action");

        const res = triggerEngine(action);

        if (!res.ok) {
          toast(`PATCH: ${res.reason}`);
          return;
        }

        toast(`PATCH: sent ${action} → ${res.target}`);

        // Hide overlay after we successfully hit the engine control
        hideMenuOverlay();
      });
    });

    toast("PATCH LOADED");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireMenu);
  } else {
    wireMenu();
  }
})();