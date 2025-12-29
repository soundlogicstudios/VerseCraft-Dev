/* patch/vc-debug.overlay.js
   Temporary on-screen debug for iPhone Safari (remove after fix)
*/

(() => {
  const d = document;
  const html = d.documentElement;
  const qs = (s) => d.querySelector(s);
  const qsa = (s) => Array.from(d.querySelectorAll(s));

  function elInfo(el) {
    if (!el) return "null";
    const r = el.getBoundingClientRect();
    return `${el.tagName.toLowerCase()}#${el.id || ""}.${(el.className || "").toString().replace(/\s+/g, ".")}
screen(x:${Math.round(r.x)} y:${Math.round(r.y)} w:${Math.round(r.width)} h:${Math.round(r.height)})`;
  }

  function findTapToStart() {
    const els = qsa("button, a, [role='button']").filter((el) => {
      const t = (el.textContent || "").trim().toLowerCase();
      return t.includes("tap to start");
    });
    return els.slice(0, 3);
  }

  const panel = d.createElement("div");
  panel.style.position = "fixed";
  panel.style.left = "10px";
  panel.style.right = "10px";
  panel.style.bottom = "10px";
  panel.style.zIndex = "999999";
  panel.style.font = "12px/1.3 -apple-system, system-ui, sans-serif";
  panel.style.color = "#fff";
  panel.style.background = "rgba(0,0,0,0.72)";
  panel.style.border = "1px solid rgba(255,255,255,0.18)";
  panel.style.borderRadius = "12px";
  panel.style.padding = "10px";
  panel.style.backdropFilter = "blur(8px)";
  panel.style.webkitBackdropFilter = "blur(8px)";
  panel.style.pointerEvents = "none";
  panel.setAttribute("aria-hidden", "true");

  function render() {
    const screen = html.dataset.vcScreen || "(none)";
    const menu = qs("#vc-menu");
    const bg = qs("#vc-bg");
    const taps = findTapToStart();

    panel.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px;">VC DEBUG</div>
      <div>data-vc-screen: <b>${screen}</b></div>
      <div>#vc-menu: ${menu ? "YES" : "NO"} (${elInfo(menu)})</div>
      <div>#vc-bg: ${bg ? "YES" : "NO"} (${elInfo(bg)})</div>
      <div style="margin-top:6px;">Tap To Start matches: <b>${taps.length}</b></div>
      <div>${taps.map((el) => elInfo(el)).join("<br>") || "(none)"}</div>
    `;
  }

  function boot() {
    d.body.appendChild(panel);
    render();
    setInterval(render, 800);
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();