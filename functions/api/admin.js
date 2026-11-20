import {
  CONFIG_BASE, auditar, guardarEstado, hashPassword, jsonRes,
  leerEstado, limpiarTexto, obtenerSesion, randomHex
} from "../../_shared/sec.js";

function normalizarCatalogo(cat) {
  if (Array.isArray(cat)) return { anunciantes: cat, ofertas: [], guias: [], faq: [], opiniones: [] };
  const obj = (cat && typeof cat === "object") ? Object.assign({}, cat) : {};
  if (!Array.isArray(obj.anunciantes)) obj.anunciantes = [];
  if (!Array.isArray(obj.ofertas)) obj.ofertas = [];
  if (!Array.isArray(obj.guias)) obj.guias = [];
  if (!Array.isArray(obj.faq)) obj.faq = [];
  if (!Array.isArray(obj.opiniones)) obj.opiniones = [];
  return obj;
}

export async function onRequestGet({ request, env }) {
  try {
    const sesion = await obtenerSesion(request, env);
    if (!sesion) return jsonRes({ ok: false, error: "No autorizado" }, 401);

    const config = await leerEstado(env, "config", CONFIG_BASE);
    const catalogo = normalizarCatalogo(await leerEstado(env, "agencias", {}));
    const solRes = await env.DB.prepare("SELECT * FROM solicitudes ORDER BY fecha DESC LIMIT 200").all();
    const audRes = await env.DB.prepare("SELECT * FROM auditoria ORDER BY id DESC LIMIT 100").all();
    const admRes = await env.DB.prepare("SELECT email, nombre, rol, activo, created_at FROM admins ORDER BY created_at ASC").all();

    return jsonRes({
      ok: true,
      admin: { email: sesion.email, nombre: sesion.nombre, rol: sesion.rol },
      config: Object.assign({}, CONFIG_BASE, config, { buzonNubeUrl: "/api/solicitudes" }),
      catalogo,
      agencias: catalogo.anunciantes,
      solicitudes: (solRes.results || []).map(r => {
        let extra = {};
        try { extra = JSON.parse(r.datos_json || "{}"); } catch {}
        return Object.assign(extra, {
          solicitudId: r.id, id: r.id, fecha: r.fecha, estado: r.estado, plan: r.plan,
          metodoPago: r.metodo_pago, referenciaPago: r.referencia_pago,
          monto: r.monto, negocio: r.negocio, whatsapp: r.whatsapp
        });
      }),
      auditoria: audRes.results || [],
      admins: admRes.results || []
    });
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const sesion = await obtenerSesion(request, env);
    if (!sesion) return jsonRes({ ok: false, error: "Sesión expirada o no autorizada" }, 401);

    const body = await request.json().catch(() => ({}));
    const accion = String(body.accion || "");

    if (accion === "guardar_config") {
      const actual = await leerEstado(env, "config", CONFIG_BASE);
      const entrada = (body.config && typeof body.config === "object") ? body.config : {};
      const fusionado = Object.assign({}, CONFIG_BASE, actual, entrada, {
        hero: Object.assign({}, CONFIG_BASE.hero, actual.hero || {}, entrada.hero || {}),
        topBar: Object.assign({}, CONFIG_BASE.topBar, actual.topBar || {}, entrada.topBar || {}),
        bannerPatrocinado: Object.assign({}, CONFIG_BASE.bannerPatrocinado, actual.bannerPatrocinado || {}, entrada.bannerPatrocinado || {}),
        comercialB2B: Object.assign({}, CONFIG_BASE.comercialB2B, actual.comercialB2B || {}, entrada.comercialB2B || {}),
        pagosB2B: Object.assign({}, CONFIG_BASE.pagosB2B, actual.pagosB2B || {}, entrada.pagosB2B || {}),
        buzonNubeUrl: "/api/solicitudes"
      });
      await guardarEstado(env, "config", fusionado, sesion.email);
      await auditar(env, sesion.email, "EDITAR_CONFIG", body.detalle || "Actualizó configuración en vivo");
      return jsonRes({ ok: true, config: fusionado });
    }

    if (accion === "guardar_catalogo" || accion === "guardar_agencias") {
      const rawCat = body.catalogo !== undefined ? body.catalogo : body.agencias;
      if (!rawCat || typeof rawCat !== "object") {
        return jsonRes({ ok: false, error: "Formato de catálogo inválido" }, 400);
      }
      const catNorm = normalizarCatalogo(rawCat);
      await guardarEstado(env, "agencias", catNorm, sesion.email);
      await auditar(
        env,
        sesion.email,
        "EDITAR_CATALOGO",
        body.detalle || `Anunciantes: ${catNorm.anunciantes.length} | Ofertas: ${catNorm.ofertas.length} | Guías: ${catNorm.guias.length}`
      );
      return jsonRes({ ok: true, totalAnunciantes: catNorm.anunciantes.length, catalogo: catNorm });
    }

    if (accion === "estado_solicitud") {
      const id = limpiarTexto(body.solicitudId, 60);
      const estado = ["Pendiente", "Autorizada", "Rechazada"].includes(body.estado) ? body.estado : "Pendiente";
      await env.DB.prepare("UPDATE solicitudes SET estado = ? WHERE id = ?").bind(estado, id).run();

      if (estado === "Autorizada" && body.publicarEnCatalogo) {
        const row = await env.DB.prepare("SELECT datos_json FROM solicitudes WHERE id = ?").bind(id).first();
        if (row) {
          const sol = JSON.parse(row.datos_json || "{}");
          const ag = sol.anunciante || {};
          const cat = normalizarCatalogo(await leerEstado(env, "agencias", {}));
          const nuevaAgencia = Object.assign({
            id: "ag-" + Date.now(),
            nombre: ag.nombre || sol.nombre || "Nuevo Anunciante",
            categoria: ag.categoria || "viajes",
            categoriaNombre: ag.categoriaNombre || "Viajes y Turismo",
            destacada: /destac/i.test(String(sol.plan || "")),
            activa: true
          }, ag);
          cat.anunciantes.unshift(nuevaAgencia);
          await guardarEstado(env, "agencias", cat, sesion.email);
        }
      }
      await auditar(env, sesion.email, "SOLICITUD_" + estado.toUpperCase(), `ID: ${id}`);
      return jsonRes({ ok: true, solicitudId: id, estado });
    }

    if (accion === "crear_admin") {
      if (sesion.rol !== "superadmin") return jsonRes({ ok: false, error: "Solo un superadmin puede crear usuarios" }, 403);
      const email = limpiarTexto(body.email, 120).toLowerCase();
      const nombre = limpiarTexto(body.nombre, 80);
      const rol = body.rol === "superadmin" ? "superadmin" : "editor";
      const pass = String(body.password || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || pass.length < 10) {
        return jsonRes({ ok: false, error: "Correo inválido o contraseña menor a 10 caracteres" }, 400);
      }
      const salt = randomHex(16);
      const passHash = await hashPassword(pass, salt);
      await env.DB.prepare(
        "INSERT OR REPLACE INTO admins (email, nombre, pass_hash, salt, rol, activo, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)"
      ).bind(email, nombre || email, passHash, salt, rol, new Date().toISOString()).run();
      await auditar(env, sesion.email, "CREAR_ADMIN", `${email} (${rol})`);
      return jsonRes({ ok: true });
    }

    if (accion === "toggle_admin") {
      if (sesion.rol !== "superadmin") return jsonRes({ ok: false, error: "Solo un superadmin puede modificar accesos" }, 403);
      const email = limpiarTexto(body.email, 120).toLowerCase();
      if (email === sesion.email) return jsonRes({ ok: false, error: "No puedes desactivar tu propia cuenta" }, 400);
      const activo = body.activo ? 1 : 0;
      await env.DB.prepare("UPDATE admins SET activo = ? WHERE email = ?").bind(activo, email).run();
      if (!activo) await env.DB.prepare("DELETE FROM sesiones WHERE email = ?").bind(email).run();
      await auditar(env, sesion.email, activo ? "ACTIVAR_ADMIN" : "DESACTIVAR_ADMIN", email);
      return jsonRes({ ok: true });
    }

    return jsonRes({ ok: false, error: "Acción no válida" }, 400);
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) }, 500);
  }
}