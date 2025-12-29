/* patch/menu.patch.js
   VerseCraft Menu Patch (Proxy-click engine buttons)
   - Does NOT modify app.js
   - Wires #vc-menu buttons to existing engine UI actions by finding and clicking them
   - Avoids black screens by only hiding menu AFTER a successful proxy click
*/

(() => {
  "use strict";

  const PATCH_ID = "vcPatchMenu";
  const DEBUG = true; // set false later when stable

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function normText(s) {
    return (s || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function inMenu(el) {
    const menu = qs("#vc-menu");
    return !!(menu && el && menu.contains(el));
  }

  function makeBadge(text) {
    if (!DEBUG) return;
    let el = qs(`#${PATCH_ID}`);
    if (!el) {
      el = document.createElement("div");
      el.id = PATCH_ID;
      el.style.cssText =
        "position:fixed;top:12px;left:12px;z-index:999999;" +
        "background:rgba(0,255,120,.92);color:#001b0e;" +
        "font:700 14px/1 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;" +
        "padding:10px 12px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.35);" +
        "border:1px solid rgba(0,0,0,.18);pointer-events:none";
      document.documentElement.appendChild(el);
    }
    el.textContent = text;
  }

  function setScreen(screen) {
    document.documentElement.dataset.vcScreen = screen;
  }

  function hideMenuWithFade() {
    const menu = qs("#vc-menu");
    if (!menu) return;
    // gentle fade; keep it simple and safe
    menu.style.transition = "opacity 220ms ease";
    menu.style.opacity = "0";
    window.setTimeout(() => {
      menu.style.display = "none";
      menu.style.pointerEvents = "none";
    }, 240);
  }

  // Try to find an engine button/link by text, outside the menu
  function findEngineActionByText(possibleLabels) {
    const needles = possibleLabels.map(normText);

    // Candidates likely to be clickable
    const candidates = qsa(
      'button, a, [role="button"], input[type="button"], input[type="submit"]'
    ).filter((el) => !inMenu(el));

    // Prefer visible-ish elements
    const visibleFirst = candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const avis = ar.width * ar.height;
      const bvis = br.width * br.height;
      return bvis - avis;
    });

    for (const el of visibleFirst) {
      const t = normText(el.innerText || el.value || el.getAttribute("aria-label"));
      if (!t) continue;
      for (const n of needles) {
        if (t === n || t.includes(n)) return el;
      }
    }

    // Fallback: search any element with matching text that might be clickable
    const any = qsa("body *").filter((el) => !inMenu(el));
    for (const el of any) {
      const t = normText(el.innerText);
      if (!t) continue;
      for (const n of needles) {
        if (t === n || t.includes(n)) {
          // climb to nearest clickable ancestor
          let cur = el;
          for (let i = 0; i < 6 && cur; i++) {
            if (
              cur.tagName === "BUTTON" ||
              cur.tagName === "A" ||
              cur.getAttribute("role") === "button" ||
              cur.onclick
            ) {
              if (!inMenu(cur)) return cur;
            }
            cur = cur.parentElement;
          }
        }
      }
    }

    return null;
  }

  function safeClick(el) {
    if (!el) return false;
    try {
      // Some mobile browsers respond better to pointer/mouse events
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

  function proxyAction(action) {
    // Map our menu actions to known engine labels
    // (We keep this broad so it works across your older UI variants.)
    const map = {
      start: ["tap to start", "start", "begin", "new run", "new story"],
      load: ["load new story", "load story", "load", "pick a module"],
      continue: ["continue story", "continue", "resume"],
    };

    const labels = map[action] || [action];
    const target = findEngineActionByText(labels);

    if (!target) {
      makeBadge(`PATCH LOADED — no engine target for: ${action}`);
      // still emit an event for future wiring if needed
      window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action } }));
      return;
    }

    makeBadge(`PATCH LOADED — proxy: ${action}`);
    const ok = safeClick(target);

    // Only hide menu + switch screen if the click fired
    if (ok) {
      // Give the engine a beat to render, then hide menu
      window.setTimeout(() => {
        setScreen("game");
        hideMenuWithFade();
      }, 120);
    } else {
      makeBadge(`PATCH LOADED — click failed: ${action}`);
    }
  }

  function bindMenuButtons() {
    const menu = qs("#vc-menu");
    if (!menu) {
      makeBadge("PATCH LOADED — #vc-menu not found");
      return;
    }

    // Bind explicit data-vc-action buttons
    const btns = qsa("[data-vc-action]", menu);
    btns.forEach((btn) => {
      const action = (btn.getAttribute("data-vc-action") || "").trim().toLowerCase();
      if (!action) return;

      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        proxyAction(action);
      };

      // Use both for iOS friendliness
      btn.addEventListener("click", handler, { passive: false });
      btn.addEventListener("touchend", handler, { passive: false });
    });

    makeBadge("PATCH LOADED");
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindMenuButtons);
  } else {
    bindMenuButtons();
  }
})();