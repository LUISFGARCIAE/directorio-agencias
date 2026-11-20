(function () {
  "use strict";

  // 1. Defensa Anti-Clickjacking (evita incrustar el sitio en iframes maliciosos)
  if (window.top !== window.self) {
    try { window.top.location = window.self.location; } catch (e) {
      document.documentElement.innerHTML = "";
    }
  }

  // 2. Candado Anti-Cloning (solo permite dominios autorizados)
  const DOMINIOS_AUTORIZADOS = [
    "luisfgarciae.github.io",
    "guiasvayora.com",
    "www.guiasvayora.com",
    "localhost",
    "127.0.0.1"
  ];
  const hostActual = (window.location.hostname || "").toLowerCase();
  if (hostActual && DOMINIOS_AUTORIZADOS.indexOf(hostActual) === -1) {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.innerHTML = "<main style='font-family:sans-serif;padding:3rem;text-align:center'><h1>Sitio no autorizado</h1><p>Visita el portal oficial de Guías Vayora.</p></main>";
    });
    return;
  }

  // 3. Sanitizador Anti-XSS para textos y URLs
  function escapeHTML(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(url) {
    const s = String(url || "").trim();
    if (/^(https?:\/\/|mailto:|tel:)/i.test(s)) return s;
    return "#";
  }

  // 4. Lector de configuracion en vivo (reflejo instantaneo sin esperar deploy de GitHub)
  async function cargarConfigEnVivo(rutaFallback) {
    let base = {};
    try {
      const rLocal = await fetch(rutaFallback + "?t=" + Date.now(), { cache: "no-store" });
      base = await rLocal.json();
    } catch (e) {}

    const api = (base.buzonNubeUrl || "").trim();
    if (api && /^https:\/\/script\.google\.com\/macros\/s\//i.test(api)) {
      try {
        const rLive = await fetch(api + "?accion=config_publica&t=" + Date.now(), { cache: "no-store" });
        const data = await rLive.json();
        if (data && data.ok && data.config) {
          aplicarIdentidadEnDOM(data.config);
          return Object.assign({}, base, { live: data.config });
        }
      } catch (e) {}
    }
    return base;
  }

  function aplicarIdentidadEnDOM(live) {
    if (!live) return;
    document.querySelectorAll("[data-vayora-marca]").forEach(el => { el.textContent = live.marca || "Guías Vayora"; });
    document.querySelectorAll("[data-vayora-eslogan]").forEach(el => { el.textContent = live.eslogan || "El mundo tiene más por descubrir"; });
    document.querySelectorAll("[data-vayora-correo]").forEach(el => {
      const correo = live.correoContacto || "directorioturistico.mx@gmail.com";
      el.textContent = correo;
      if (el.tagName === "A") el.href = "mailto:" + correo;
    });
  }

  window.VayoraSec = Object.freeze({
    escapeHTML: escapeHTML,
    safeUrl: safeUrl,
    cargarConfigEnVivo: cargarConfigEnVivo
  });
})();