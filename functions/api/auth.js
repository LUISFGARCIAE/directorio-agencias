import {
  auditar, hashPassword, jsonRes, limpiarTexto,
  obtenerSesion, randomHex, sha256Hex, timingSafeEqual
} from "../../_shared/sec.js";

function construirCookie(valor, maxAgeSeg, esHttps) {
  const sec = esHttps ? "; Secure" : "";
  return `vayora_sid=${encodeURIComponent(valor)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeg}${sec}`;
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return jsonRes({ ok: false, error: "Falta vincular la base de datos D1 (DB)" }, 500);
    const cnt = await env.DB.prepare("SELECT COUNT(*) AS total FROM admins").first();
    const requiereSetup = !cnt || Number(cnt.total) === 0;
    const sesion = await obtenerSesion(request, env);
    return jsonRes({
      ok: true,
      requiereSetup,
      autenticado: Boolean(sesion),
      admin: sesion ? { email: sesion.email, nombre: sesion.nombre, rol: sesion.rol } : null
    });
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return jsonRes({ ok: false, error: "Falta vincular DB" }, 500);
    const body = await request.json().catch(() => ({}));
    const accion = String(body.accion || "");
    const esHttps = new URL(request.url).protocol === "https:";

    // Alta unica del primer superadministrador usando SETUP_KEY (bloqueado permanentemente despues)
    if (accion === "setup_inicial") {
      const cnt = await env.DB.prepare("SELECT COUNT(*) AS total FROM admins").first();
      if (cnt && Number(cnt.total) > 0) {
        return jsonRes({ ok: false, error: "La configuración inicial ya fue completada" }, 403);
      }
      const setupKeyEnv = String(env.SETUP_KEY || "");
      if (!setupKeyEnv || !timingSafeEqual(body.setupKey, setupKeyEnv)) {
        return jsonRes({ ok: false, error: "Clave SETUP_KEY inválida" }, 403);
      }
      const email = limpiarTexto(body.email, 120).toLowerCase();
      const nombre = limpiarTexto(body.nombre || "Superadmin", 80);
      const pass = String(body.password || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || pass.length < 10) {
        return jsonRes({ ok: false, error: "Usa un correo válido y contraseña de al menos 10 caracteres" }, 400);
      }
      const salt = randomHex(16);
      const passHash = await hashPassword(pass, salt);
      await env.DB.prepare(
        "INSERT INTO admins (email, nombre, pass_hash, salt, rol, activo, created_at) VALUES (?, ?, ?, ?, 'superadmin', 1, ?)"
      ).bind(email, nombre, passHash, salt, new Date().toISOString()).run();
      await auditar(env, email, "SETUP_SUPERADMIN", "Cuenta inicial creada");
      return jsonRes({ ok: true, mensaje: "Superadministrador creado. Ahora inicia sesión." });
    }

    if (accion === "login") {
      const email = limpiarTexto(body.email, 120).toLowerCase();
      const pass = String(body.password || "");
      const admin = await env.DB.prepare(
        "SELECT email, nombre, pass_hash, salt, rol, activo FROM admins WHERE email = ?"
      ).bind(email).first();

      if (!admin || admin.activo !== 1) {
        await auditar(env, email || "anonimo", "LOGIN_FALLIDO", "Usuario inexistente o inactivo");
        return jsonRes({ ok: false, error: "Credenciales inválidas" }, 401);
      }
      const calcHash = await hashPassword(pass, admin.salt);
      if (!timingSafeEqual(calcHash, admin.pass_hash)) {
        await auditar(env, email, "LOGIN_FALLIDO", "Contraseña incorrecta");
        return jsonRes({ ok: false, error: "Credenciales inválidas" }, 401);
      }

      // Limpiar sesiones vencidas y crear nueva sesion segura de 8 horas
      await env.DB.prepare("DELETE FROM sesiones WHERE expires_at < ?").bind(Date.now()).run();
      const sid = randomHex(32);
      const sidHash = await sha256Hex(sid);
      const exp = Date.now() + 8 * 60 * 60 * 1000;
      await env.DB.prepare(
        "INSERT INTO sesiones (token_hash, email, rol, expires_at) VALUES (?, ?, ?, ?)"
      ).bind(sidHash, admin.email, admin.rol, exp).run();

      await auditar(env, admin.email, "LOGIN_OK", "Rol: " + admin.rol);
      return jsonRes(
        { ok: true, admin: { email: admin.email, nombre: admin.nombre, rol: admin.rol } },
        200,
        { "Set-Cookie": construirCookie(sid, 28800, esHttps) }
      );
    }

    if (accion === "logout") {
      const sesion = await obtenerSesion(request, env);
      if (sesion) {
        await env.DB.prepare("DELETE FROM sesiones WHERE token_hash = ?").bind(sesion.tokenHash).run();
        await auditar(env, sesion.email, "LOGOUT", "Sesión cerrada");
      }
      return jsonRes({ ok: true }, 200, { "Set-Cookie": construirCookie("", 0, esHttps) });
    }

    return jsonRes({ ok: false, error: "Acción no reconocida" }, 400);
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) }, 500);
  }
}