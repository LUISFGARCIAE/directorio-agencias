export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname.toLowerCase();

  // Bloqueo total de descarga directa de JSONs, scripts internos y esquemas
  if (
    path === "/data" || path.startsWith("/data/") ||
    path === "/_shared" || path.startsWith("/_shared/") ||
    path.endsWith(".sql") || path.endsWith(".toml") || path.endsWith(".md") ||
    (path.startsWith("/.") && !path.startsWith("/.well-known/"))
  ) {
    return new Response("Acceso restringido", { status: 403 });
  }

  // Proteccion Anti-Cloning y CSRF para la API
  if (path.startsWith("/api/")) {
    const fetchSite = request.headers.get("Sec-Fetch-Site");
    if (fetchSite === "cross-site") {
      return new Response(JSON.stringify({ ok: false, error: "Origen externo bloqueado" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin) {
        return new Response(JSON.stringify({ ok: false, error: "Origen no autorizado" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }

  return context.next();
}