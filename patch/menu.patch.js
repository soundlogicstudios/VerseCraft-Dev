/* patch/menu.patch.js
   Final wiring:
   - Start: fully remove overlay interaction, enter game, then open story picker
   - Load: open story picker from overlay
   - Continue: enter game, then continue

   Also fixes "can't tap / blown out" by ensuring overlays stop intercepting touches.
*/

(() => {
  const d = document;
  const html = d.documentElement;
  const qs = (sel, root = d) => root.querySelector(sel);

  function setScreen(name) {
    html.dataset.vcScreen = name;
  }

  function emit(action) {
    window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action } }));
  }

  function fullyDisableOverlay() {
    const menu = qs("#vc-menu");
    if (menu) {
      // Make it impossible for the overlay to block touches
      menu.style.display = "none";
      menu.style.opacity = "0";
      menu.style.pointerEvents = "none";
    }

    const bg = qs("#vc-bg");
    if (bg) {
      // Background should never intercept touches
      bg.style.pointerEvents = "none";
    }
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

    // START: go straight into story picker (so you don't have to interact with legacy home)
    bind("start", () => {
      fullyDisableOverlay();
      setScreen("game");

      // enter game mode
      emit("start");

      // open module/story picker (this is what your menu.js does for Load Story)
      setTimeout(() => emit("load"), 150);
    });

    // LOAD STORY: open picker but keep overlay visible (optional)
    bind("load", () => {
      emit("load");
    });

    // CONTINUE: continue after entering game mode
    bind("continue", () => {
      fullyDisableOverlay();
      setScreen("game");
      emit("continue");
    });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();