import { CONFIG_BASE, jsonRes, leerEstado } from "../../_shared/sec.js";

function fusionarConfig(cfg) {
  const c = (cfg && typeof cfg === "object") ? cfg : {};
  return Object.assign({}, CONFIG_BASE, c, {
    hero: Object.assign({}, CONFIG_BASE.hero, c.hero || {}),
    topBar: Object.assign({}, CONFIG_BASE.topBar, c.topBar || {}),
    bannerPatrocinado: Object.assign({}, CONFIG_BASE.bannerPatrocinado, c.bannerPatrocinado || {}),
    comercialB2B: Object.assign({}, CONFIG_BASE.comercialB2B, c.comercialB2B || {}),
    pagosB2B: Object.assign({}, CONFIG_BASE.pagosB2B, c.pagosB2B || {}),
    buzonNubeUrl: "/api/solicitudes"
  });
}

function filtrarCatalogoPublico(cat) {
  if (Array.isArray(cat)) {
    return { anunciantes: cat.filter(a => a && a.oculta !== true && a.activa !== false), ofertas: [], guias: [], faq: [], opiniones: [] };
  }
  const obj = (cat && typeof cat === "object") ? Object.assign({}, cat) : {};
  obj.anunciantes = Array.isArray(obj.anunciantes)
    ? obj.anunciantes.filter(a => a && a.oculta !== true && a.activa !== false)
    : [];
  if (!Array.isArray(obj.ofertas)) obj.ofertas = [];
  if (!Array.isArray(obj.guias)) obj.guias = [];
  if (!Array.isArray(obj.faq)) obj.faq = [];
  if (!Array.isArray(obj.opiniones)) obj.opiniones = [];
  return obj;
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return jsonRes({ ok: false, error: "Base de datos DB no vinculada" }, 500);
    const tipo = new URL(request.url).searchParams.get("tipo") || "todo";
    const noCache = { "Cache-Control": "no-store, no-cache, must-revalidate" };

    if (tipo === "config") {
      const cfg = await leerEstado(env, "config", CONFIG_BASE);
      return jsonRes(fusionarConfig(cfg), 200, noCache);
    }

    if (tipo === "agencias") {
      const cat = await leerEstado(env, "agencias", { anunciantes: [], ofertas: [], guias: [], faq: [], opiniones: [] });
      return jsonRes(filtrarCatalogoPublico(cat), 200, noCache);
    }

    const cfg = await leerEstado(env, "config", CONFIG_BASE);
    const cat = await leerEstado(env, "agencias", { anunciantes: [], ofertas: [], guias: [], faq: [], opiniones: [] });
    return jsonRes({ ok: true, config: fusionarConfig(cfg), catalogo: filtrarCatalogoPublico(cat) }, 200, noCache);
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) }, 500);
  }
}