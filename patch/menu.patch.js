/* patch/menu.patch.js
   Start handoff:
   - Hide cinematic menu
   - Switch to game screen
   - Dispatch vc:menu start
   - Then dispatch vc:menu load (opens module picker) after a short delay
*/

(() => {
  const d = document;
  const html = d.documentElement;
  const qs = (sel, root = d) => root.querySelector(sel);

  function setScreen(name) {
    html.dataset.vcScreen = name;
  }

  function hideMenu() {
    const menu = qs("#vc-menu");
    if (!menu) return;
    menu.style.display = "none";
    menu.style.pointerEvents = "none";
  }

  function emit(action) {
    window.dispatchEvent(new CustomEvent("vc:menu", { detail: { action } }));
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

    bind("start", () => {
      hideMenu();
      setScreen("game");

      // Step 1: enter engine home/game mode
      emit("start");

      // Step 2: open story/module picker automatically
      // (small delay lets engine render its UI first)
      setTimeout(() => emit("load"), 200);
    });

    bind("load", () => {
      // Keep menu visible if you want; or hide it — your call.
      // I’ll keep it visible so "Load Story" feels like a menu action.
      emit("load");
    });

    bind("continue", () => {
      hideMenu();
      setScreen("game");
      emit("continue");
    });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();