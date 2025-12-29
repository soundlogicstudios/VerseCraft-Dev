/* patch/menu.patch.js
   Deterministic handoff to existing runtime via CustomEvent("vc:menu").
   Uses your confirmed event name: "vc:menu".
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

    // Ensure menu mode on first paint (CSS relies on this)
    if (!html.dataset.vcScreen) setScreen("menu");

    bind("start", () => {
      hideMenu();
      setScreen("game");
      emit("start");
    });

    bind("load", () => {
      // Some builds open a story picker while still on menu; we won't force-hide here.
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