import {
  CONFIG_BASE, auditar, guardarEstado, hashPassword, jsonRes,
  leerEstado, limpiarTexto, obtenerSesion, randomHex
} from "../../_shared/sec.js";

export async function onRequestGet({ request, env }) {
  try {
    const sesion = await obtenerSesion(request, env);
    if (!sesion) return jsonRes({ ok: false, error: "No autorizado" }, 401);

    const config = await leerEstado(env, "config", CONFIG_BASE);
    const agencias = await leerEstado(env, "agencias", []);
    const solRes = await env.DB.prepare("SELECT * FROM solicitudes ORDER BY fecha DESC LIMIT 200").all();
    const audRes = await env.DB.prepare("SELECT * FROM auditoria ORDER BY id DESC LIMIT 100").all();
    const admRes = await env.DB.prepare("SELECT email, nombre, rol, activo, created_at FROM admins ORDER BY created_at ASC").all();

    return jsonRes({
      ok: true,
      admin: { email: sesion.email, nombre: sesion.nombre, rol: sesion.rol },
      config: Object.assign({}, CONFIG_BASE, config),
      agencias: Array.isArray(agencias) ? agencias : [],
      solicitudes: (solRes.results || []).map(r => {
        let extra = {};
        try { extra = JSON.parse(r.datos_json || "{}"); } catch {}
        return Object.assign(extra, {
          solicitudId: r.id, fecha: r.fecha, estado: r.estado, plan: r.plan,
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
      const fusionado = Object.assign({}, CONFIG_BASE, actual, body.config || {}, { buzonNubeUrl: "/api/solicitudes" });
      await guardarEstado(env, "config", fusionado, sesion.email);
      await auditar(env, sesion.email, "EDITAR_CONFIG", "Actualizó configuración en vivo");
      return jsonRes({ ok: true, config: fusionado });
    }

    if (accion === "guardar_agencias") {
      if (!Array.isArray(body.agencias)) return jsonRes({ ok: false, error: "Formato de agencias inválido" }, 400);
      await guardarEstado(env, "agencias", body.agencias, sesion.email);
      await auditar(env, sesion.email, "EDITAR_AGENCIAS", `Total en catálogo: ${body.agencias.length}`);
      return jsonRes({ ok: true, total: body.agencias.length });
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
          const lista = await leerEstado(env, "agencias", []);
          const nuevaAgencia = Object.assign({
            id: "ag-" + Date.now(),
            nombre: ag.nombre || sol.nombre || "Nuevo Anunciante",
            categoria: ag.categoria || "viajes",
            categoriaNombre: ag.categoriaNombre || "Viajes y Turismo",
            ciudad: ag.ciudad || "México",
            descripcion: ag.descripcion || "",
            whatsapp: ag.whatsapp || sol.whatsapp || "",
            web: ag.web || "",
            destinos: ag.destinos || [],
            destacada: /destac/i.test(String(sol.plan || "")),
            verificada: true,
            activa: true
          }, ag);
          lista.unshift(nuevaAgencia);
          await guardarEstado(env, "agencias", lista, sesion.email);
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