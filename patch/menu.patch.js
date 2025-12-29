(() => {
  function toast(msg, bg = "rgba(0, 200, 120, 0.92)") {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.left = "12px";
    el.style.right = "12px";
    el.style.top = "12px";
    el.style.zIndex = "999999";
    el.style.padding = "14px 16px";
    el.style.borderRadius = "14px";
    el.style.background = bg;
    el.style.color = "#000";
    el.style.fontWeight = "800";
    el.style.fontFamily = "-apple-system, system-ui, sans-serif";
    el.style.boxShadow = "0 12px 30px rgba(0,0,0,0.35)";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
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

  function clickEl(el) {
    if (!el) return false;
    try {
      el.click();
      return true;
    } catch (_) {
      return false;
    }
  }

  function findByIdAny(ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  function norm(s) {
    return String(s || "").trim().toLowerCase();
  }

  function findButtonByTextAny(texts) {
    const want = texts.map(norm);
    const btns = Array.from(document.querySelectorAll("button, [role='button'], a"));
    for (const el of btns) {
      const t = norm(el.textContent);
      if (!t) continue;
      if (want.some((w) => t.includes(w))) return el;
    }
    return null;
  }

  function dumpVisibleButtonsBrief() {
    const btns = Array.from(document.querySelectorAll("button, [role='button'], a"))
      .slice(0, 18)
      .map((el) => {
        const id = el.id ? `#${el.id}` : "";
        const t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28);
        return `${id}${id && t ? " " : ""}${t}`.trim();
      })
      .filter(Boolean);

    return btns.length ? btns.join(" | ") : "(none found)";
  }

  function tryWindowFns(action) {
    const fns = [
      // start
      ...(action === "start"
        ? ["vcStart", "vcStartGame", "vcStartGameFromMenu", "startGame", "start"]
        : []),

      // load
      ...(action === "load"
        ? ["vcLoad", "vcOpenStoryPicker", "openStoryPicker", "loadStoryPicker", "load"]
        : []),

      // continue
      ...(action === "continue"
        ? ["vcContinue", "continueGame", "continueStory", "continue"]
        : []),
    ];

    for (const name of fns) {
      const fn = window[name];
      if (typeof fn === "function") {
        try {
          fn();
          return { ok: true, how: `window.${name}()` };
        } catch (_) {}
      }
    }
    return { ok: false, how: "no window fn" };
  }

  function triggerEngine(action) {
    // 1) Try known engine button IDs (your app.js *suggests* these)
    const byId = {
      start: ["btnTapStart", "btnStart", "startBtn"],
      load: ["btnStoryPicker", "btnLoadStory", "btnLoad", "loadBtn"],
      continue: ["btnContinue", "continueBtn"],
    };

    const elById = findByIdAny(byId[action] || []);
    if (elById && clickEl(elById)) return { ok: true, how: `clicked ${elById.id}` };

    // 2) Try by button text (works even if IDs differ)
    const byText = {
      start: ["tap to start", "start"],
      load: ["load new story", "load story", "story picker"],
      continue: ["continue story", "continue"],
    };

    const elByText = findButtonByTextAny(byText[action] || []);
    if (elByText && clickEl(elByText)) return { ok: true, how: `clicked text "${(elByText.textContent || "").trim().slice(0, 24)}"` };

    // 3) Try calling engine functions if exposed
    const win = tryWindowFns(action);
    if (win.ok) return { ok: true, how: win.how };

    // 4) Nothing worked — return debug info
    return {
      ok: false,
      how: `no engine target for ${action}`,
      debug: dumpVisibleButtonsBrief(),
    };
  }

  function wireButtons() {
    const menu = document.getElementById("vc-menu");
    if (!menu) {
      toast("PATCH LOADED (no #vc-menu)", "rgba(255, 200, 0, 0.92)");
      return;
    }

    const buttons = menu.querySelectorAll("[data-vc-action]");
    if (!buttons.length) {
      toast("PATCH LOADED (no [data-vc-action])", "rgba(255, 200, 0, 0.92)");
      return;
    }

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-vc-action");
        const res = triggerEngine(action);

        if (!res.ok) {
          toast(`PATCH: ${res.how}`, "rgba(255, 200, 0, 0.92)");
          // show what the page can "see" to help us target correctly
          toast(`BTN LIST: ${res.debug}`, "rgba(255, 200, 0, 0.92)");
          return;
        }

        hideMenuOverlay();
        toast(`PATCH OK: ${res.how}`);
      });
    });

    toast("PATCH LOADED");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireButtons);
  } else {
    wireButtons();
  }

  // Optional: allow bringing menu back if you ever dispatch it later
  window.addEventListener("vc:showmenu", () => showMenuOverlay());
})();