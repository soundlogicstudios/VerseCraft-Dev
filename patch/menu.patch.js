/* patch/menu.patch.js
   Robust bridge: Menu overlay -> Engine UI buttons
   - Waits for engine targets
   - DOES NOT hide menu until engine click succeeds
*/

(() => {
  // ===== Small toast helper =====
  function toast(msg, ms = 2200) {
    try {
      let el = document.getElementById("vc-patch-toast");
      if (!el) {
        el = document.createElement("div");
        el.id = "vc-patch-toast";
        el.style.position = "fixed";
        el.style.left = "12px";
        el.style.top = "12px";
        el.style.right = "12px";
        el.style.zIndex = "99999";
        el.style.padding = "12px 14px";
        el.style.borderRadius = "12px";
        el.style.fontFamily = "-apple-system, system-ui, sans-serif";
        el.style.fontSize = "14px";
        el.style.fontWeight = "700";
        el.style.color = "#0b0b0b";
        el.style.background = "#35e46b";
        el.style.boxShadow = "0 8px 30px rgba(0,0,0,0.25)";
        el.style.pointerEvents = "none";
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.opacity = "1";
      clearTimeout(el._t);
      el._t = setTimeout(() => {
        el.style.opacity = "0";
      }, ms);
    } catch (_) {}
  }

  // ===== DOM helpers =====
  const qs = (sel, root = document) => root.querySelector(sel);

  function clickEl(el) {
    if (!el) return false;
    try {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return true;
    } catch (_) {
      try {
        el.click();
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  function waitFor(findFn, { timeout = 3500, interval = 50 } = {}) {
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        const hit = findFn();
        if (hit) return resolve(hit);
        if (Date.now() - start > timeout) return resolve(null);
        setTimeout(tick, interval);
      };
      tick();
    });
  }

  // ===== Menu overlay controls =====
  function getMenuOverlay() {
    return document.getElementById("vc-menu");
  }

  function hideMenuOverlay() {
    const menu = getMenuOverlay();
    if (menu) {
      menu.style.display = "none";
      menu.style.pointerEvents = "none";
    }
    document.documentElement.dataset.vcScreen = "game";
  }

  function showMenuOverlay() {
    const menu = getMenuOverlay();
    if (menu) {
      menu.style.display = "";
      menu.style.pointerEvents = "auto";
    }
    document.documentElement.dataset.vcScreen = "menu";
  }

  // ===== Engine target finders =====
  function findTapStartBtn() {
    // Most reliable: IDs you showed in app.js
    return (
      document.getElementById("btnTapStart") ||
      qs('#btnTapStart') ||
      // fallback: any button with similar label
      Array.from(document.querySelectorAll("button")).find((b) =>
        (b.textContent || "").trim().toLowerCase().includes("tap to start")
      )
    );
  }

  function findStoryPickerBtn() {
    return (
      document.getElementById("btnStoryPicker") ||
      qs('#btnStoryPicker') ||
      Array.from(document.querySelectorAll("button")).find((b) =>
        (b.textContent || "").trim().toLowerCase().includes("load new story")
      )
    );
  }

  function findContinueBtn() {
    return (
      document.getElementById("btnContinue") ||
      qs('#btnContinue') ||
      Array.from(document.querySelectorAll("button")).find((b) =>
        (b.textContent || "").trim().toLowerCase().includes("continue story")
      )
    );
  }

  // ===== Core: trigger engine action =====
  async function triggerEngine(action) {
    // We do NOT hide the menu until we can actually click an engine target.
    // That prevents the "blank elegant background" trap.

    if (action === "start") {
      // Wait for start button; if missing, we can still try to "bring engine up" by waiting a bit.
      const btn = await waitFor(() => findTapStartBtn(), { timeout: 3500 });
      if (!btn) return { ok: false, reason: "no engine target for: start (btnTapStart not found)" };

      const ok = clickEl(btn);
      if (!ok) return { ok: false, reason: "engine start target found but could not click" };

      return { ok: true, reason: "engine start clicked" };
    }

    if (action === "continue") {
      const btn = await waitFor(() => findContinueBtn(), { timeout: 3500 });
      if (!btn) return { ok: false, reason: "no engine target for: continue (btnContinue not found)" };

      const ok = clickEl(btn);
      if (!ok) return { ok: false, reason: "engine continue target found but could not click" };

      return { ok: true, reason: "engine continue clicked" };
    }

    if (action === "load") {
      // First try story picker directly
      let picker = await waitFor(() => findStoryPickerBtn(), { timeout: 1200 });

      // If missing, click Tap To Start to get engine to render home UI/buttons
      if (!picker) {
        const tapStart = await waitFor(() => findTapStartBtn(), { timeout: 2000 });
        if (tapStart) clickEl(tapStart);
        // Now wait longer for picker
        picker = await waitFor(() => findStoryPickerBtn(), { timeout: 3500 });
      }

      if (!picker) return { ok: false, reason: "no engine target for: load (btnStoryPicker not found)" };

      const ok = clickEl(picker);
      if (!ok) return { ok: false, reason: "engine load target found but could not click" };

      return { ok: true, reason: "engine story picker clicked" };
    }

    return { ok: false, reason: `unknown action: ${action}` };
  }

  // ===== Wire your overlay buttons =====
  function wireButtons() {
    const menu = getMenuOverlay();
    if (!menu) {
      toast("PATCH LOADED (no #vc-menu)", 2500);
      return;
    }

    const buttons = menu.querySelectorAll("[data-vc-action]");
    if (!buttons.length) {
      toast("PATCH LOADED (no [data-vc-action])", 2500);
      return;
    }

    buttons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const action = btn.getAttribute("data-vc-action") || "";
        // Keep menu visible while we attempt targeting.
        toast(`PATCH: ${action}…`, 1200);

        const res = await triggerEngine(action);

        if (!res.ok) {
          // IMPORTANT: keep menu visible so you are not stuck.
          showMenuOverlay();
          toast(`PATCH LOADED — ${res.reason}`, 2800);
          return;
        }

        // Success: now hide menu and let engine UI take over.
        hideMenuOverlay();
        toast(`PATCH: ${res.reason}`, 1400);
      }, { passive: false });
    });

    toast("PATCH LOADED", 1400);
  }

  // ===== Boot =====
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireButtons);
  } else {
    wireButtons();
  }
})();