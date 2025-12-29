(() => {
  function toast(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.left = "12px";
    el.style.right = "12px";
    el.style.top = "12px";
    el.style.zIndex = "999999";
    el.style.padding = "14px 16px";
    el.style.borderRadius = "14px";
    el.style.background = "rgba(0, 200, 120, 0.92)";
    el.style.color = "#000";
    el.style.fontWeight = "800";
    el.style.fontFamily = "-apple-system, system-ui, sans-serif";
    el.style.boxShadow = "0 12px 30px rgba(0,0,0,0.35)";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function hideMenuOverlay() {
    const menu = document.getElementById("vc-menu");
    if (menu) {
      menu.style.display = "none";
      menu.style.pointerEvents = "none";
    }
    document.documentElement.dataset.vcScreen = "game";
  }

  function showMenuOverlay() {
    const menu = document.getElementById("vc-menu");
    if (menu) {
      menu.style.display = "";
      menu.style.pointerEvents = "auto";
    }
    document.documentElement.dataset.vcScreen = "menu";
  }

  function clickLegacyButton(id) {
    const el = document.getElementById(id);
    if (!el) return { ok: false, reason: `Missing engine button #${id}` };

    // In case it’s hidden behind overlays, clicking still triggers delegated handlers.
    try {
      el.click();
      return { ok: true, reason: `Clicked #${id}` };
    } catch (e) {
      return { ok: false, reason: `Click failed for #${id}` };
    }
  }

  function triggerEngine(action) {
    // Map menu actions → engine’s real buttons
    if (action === "start") return clickLegacyButton("btnTapStart");
    if (action === "load") return clickLegacyButton("btnStoryPicker");
    if (action === "continue") return clickLegacyButton("btnContinue");
    return { ok: false, reason: `Unknown action: ${action}` };
  }

  function wireButtons() {
    const menu = document.getElementById("vc-menu");
    if (!menu) {
      toast("PATCH LOADED (no #vc-menu)");
      return;
    }

    const buttons = menu.querySelectorAll("[data-vc-action]");
    if (!buttons.length) {
      toast('PATCH LOADED (no [data-vc-action])');
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

        // Only hide menu if we successfully triggered engine behavior
        hideMenuOverlay();
        toast(`PATCH: ${res.reason}`);
      });
    });

    toast("PATCH LOADED");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireButtons);
  } else {
    wireButtons();
  }

  // Optional: allow engine to bring menu back by setting html data-vc-screen="menu"
  window.addEventListener("vc:showmenu", () => showMenuOverlay());
})();