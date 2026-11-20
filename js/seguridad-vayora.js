(function () {
  "use strict";

  // 1. Defensa Anti-Clickjacking
  if (window.top !== window.self) {
    try { window.top.location = window.self.location; } catch (e) {
      document.documentElement.innerHTML = "";
    }
  }

  // 2. Candado Anti-Cloning (autoriza solo dominios propios y previews de guias-vayora)
  const host = (window.location.hostname || "").toLowerCase();
  const permitido =
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "luisfgarciae.github.io" ||
    host === "guias-vayora.pages.dev" ||
    host.endsWith(".guias-vayora.pages.dev") ||
    host === "guiasvayora.com" ||
    host === "www.guiasvayora.com";

  if (!permitido) {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.innerHTML = "<main style='font-family:sans-serif;padding:3rem;text-align:center'><h1>Sitio no autorizado</h1><p>Visita el portal oficial de Guías Vayora.</p></main>";
    });
    return;
  }

  // 3. Enrutador transparente: en Cloudflare Pages redirige data/*.json a /api/public en tiempo real
  const usaBackendLive = host && host !== "luisfgarciae.github.io";
  if (usaBackendLive && typeof window.fetch === "function") {
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        const urlStr = typeof input === "string" ? input : (input && input.url ? input.url : "");
        if (/(^|\/)data\/config\.json(\?|$)/i.test(urlStr)) {
          return fetchOriginal("/api/public?tipo=config&t=" + Date.now(), Object.assign({ cache: "no-store" }, init));
        }
        if (/(^|\/)data\/agencias\.json(\?|$)/i.test(urlStr)) {
          return fetchOriginal("/api/public?tipo=agencias&t=" + Date.now(), Object.assign({ cache: "no-store" }, init));
        }
      } catch (e) {}
      return fetchOriginal(input, init);
    };
  }

  // 4. Sanitizadores Anti-XSS
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
    return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(s) ? s : "#";
  }

  window.VayoraSec = Object.freeze({ escapeHTML, safeUrl });
})();