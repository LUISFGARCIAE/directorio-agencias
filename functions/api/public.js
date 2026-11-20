import { CONFIG_BASE, jsonRes, leerEstado } from "../../_shared/sec.js";

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return jsonRes({ ok: false, error: "Base de datos DB no vinculada" }, 500);
    const tipo = new URL(request.url).searchParams.get("tipo") || "todo";

    if (tipo === "config") {
      const cfg = await leerEstado(env, "config", CONFIG_BASE);
      const publica = Object.assign({}, CONFIG_BASE, cfg, { buzonNubeUrl: "/api/solicitudes" });
      return jsonRes(publica, 200, { "Cache-Control": "public, max-age=5" });
    }

    if (tipo === "agencias") {
      const lista = await leerEstado(env, "agencias", []);
      const activas = Array.isArray(lista) ? lista.filter(a => a && a.oculta !== true && a.activa !== false) : [];
      return jsonRes(activas, 200, { "Cache-Control": "public, max-age=5" });
    }

    const cfg = await leerEstado(env, "config", CONFIG_BASE);
    const lista = await leerEstado(env, "agencias", []);
    return jsonRes({
      ok: true,
      config: Object.assign({}, CONFIG_BASE, cfg, { buzonNubeUrl: "/api/solicitudes" }),
      agencias: Array.isArray(lista) ? lista.filter(a => a && a.oculta !== true && a.activa !== false) : []
    });
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) }, 500);
  }
}