import {
  CONFIG_BASE, extraerPrecioMXN, jsonRes, leerEstado,
  limpiarTexto, obtenerSesion, sanitizarProfundo
} from "../../_shared/sec.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const accion = url.searchParams.get("accion") || "";

    if (accion === "listar") {
      const sesion = await obtenerSesion(request, env);
      if (!sesion) return jsonRes({ ok: false, error: "No autorizado" }, 401);
      const solRes = await env.DB.prepare("SELECT * FROM solicitudes ORDER BY fecha DESC LIMIT 200").all();
      const lista = (solRes.results || []).map(r => {
        let extra = {};
        try { extra = JSON.parse(r.datos_json || "{}"); } catch {}
        return Object.assign(extra, {
          solicitudId: r.id, id: r.id, fecha: r.fecha, estado: r.estado, plan: r.plan,
          metodoPago: r.metodo_pago, referenciaPago: r.referencia_pago,
          monto: r.monto, negocio: r.negocio, whatsapp: r.whatsapp
        });
      });
      return jsonRes({ ok: true, solicitudes: lista });
    }

    if (accion === "crear_mp") {
      const token = String(env.MP_ACCESS_TOKEN || "").trim();
      if (!token) return jsonRes({ ok: false, error: "Falta configurar MP_ACCESS_TOKEN en Cloudflare" }, 500);

      const cfg = await leerEstado(env, "config", CONFIG_BASE);
      const tituloReq = String(url.searchParams.get("titulo") || "");
      const esDestacado = /destac/i.test(tituloReq);
      const precioOficial = esDestacado
        ? extraerPrecioMXN(cfg?.comercialB2B?.planDestacadoPrecio, 499)
        : extraerPrecioMXN(cfg?.comercialB2B?.planEstandarPrecio, 100);

      const returnUrl = `${url.origin}/pages/anunciate.html`;
      const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({
          items: [{
            title: `Guías Vayora - ${esDestacado ? "Plan Destacado" : "Plan Estándar"}`,
            quantity: 1,
            currency_id: "MXN",
            unit_price: precioOficial
          }],
          back_urls: { success: returnUrl, failure: returnUrl, pending: returnUrl },
          auto_return: "approved"
        })
      });
      const json = await resp.json().catch(() => ({}));
      if (resp.ok && json.id && json.init_point) {
        return jsonRes({ ok: true, preference_id: json.id, init_point: json.init_point });
      }
      return jsonRes({ ok: false, error: json.message || "Error al crear cobro en Mercado Pago" }, 502);
    }

    if (accion === "verificar_mp") {
      const token = String(env.MP_ACCESS_TOKEN || "").trim();
      if (!token) return jsonRes({ ok: false, approved: false, error: "Falta MP_ACCESS_TOKEN" }, 500);

      const paymentId = String(url.searchParams.get("payment_id") || "").replace(/\D/g, "");
      if (!paymentId) return jsonRes({ ok: false, approved: false, error: "payment_id inválido" }, 400);

      const existe = await env.DB.prepare("SELECT id FROM solicitudes WHERE referencia_pago = ?").bind("MP-" + paymentId).first();
      if (existe) return jsonRes({ ok: false, approved: false, error: "Este pago ya fue utilizado anteriormente" }, 409);

      const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { "Authorization": "Bearer " + token }
      });
      const pago = await resp.json().catch(() => ({}));
      const cfg = await leerEstado(env, "config", CONFIG_BASE);
      const minimo = extraerPrecioMXN(cfg?.comercialB2B?.planEstandarPrecio, 100);
      const monto = Number(pago.transaction_amount || 0);

      if (resp.ok && pago.status === "approved" && pago.currency_id === "MXN" && monto >= minimo) {
        return jsonRes({ ok: true, approved: true, payment_id: String(pago.id), status: pago.status, amount: monto });
      }
      return jsonRes({ ok: false, approved: false, status: pago.status || "no_aprobado" });
    }

    return jsonRes({ ok: true, servicio: "Guías Vayora API Activa" });
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return jsonRes({ ok: false, error: "DB no disponible" }, 500);
    const txt = await request.text();
    let raw = {};
    try { raw = JSON.parse(txt || "{}"); } catch { return jsonRes({ ok: false, error: "JSON inválido" }, 400); }

    if (raw.accion === "actualizar_estado") {
      const sesion = await obtenerSesion(request, env);
      if (!sesion) return jsonRes({ ok: false, error: "No autorizado" }, 401);
      const id = limpiarTexto(raw.solicitudId || raw.id, 60);
      const est = ["Pendiente", "Autorizada", "Rechazada"].includes(raw.estado) ? raw.estado : "Pendiente";
      await env.DB.prepare("UPDATE solicitudes SET estado = ? WHERE id = ?").bind(est, id).run();
      return jsonRes({ ok: true, solicitudId: id, estado: est });
    }

    const sol = sanitizarProfundo(raw.solicitud || raw);
    const ref = limpiarTexto(sol.referenciaPago || sol.folio || sol.terminacionTarjeta || ("SOL-" + Date.now()), 60).toUpperCase();

    const duplicado = await env.DB.prepare("SELECT id FROM solicitudes WHERE referencia_pago = ?").bind(ref).first();
    if (duplicado) {
      return jsonRes({ ok: false, error: "Este folio de pago ya fue registrado en otra solicitud" }, 409);
    }

    const id = "VAY-" + Date.now();
    const fecha = new Date().toISOString();
    const plan = limpiarTexto(sol.plan || "Plan Estándar", 40);
    const metodo = limpiarTexto(sol.metodoPago || "Mercado Pago / SPEI", 40);
    const monto = Number(sol.monto || 0);
    const negocio = limpiarTexto((sol.anunciante && sol.anunciante.nombre) || sol.nombre || "Sin nombre", 90);
    const whatsapp = limpiarTexto((sol.anunciante && sol.anunciante.whatsapp) || sol.whatsapp || "", 25);

    await env.DB.prepare(
      `INSERT INTO solicitudes (id, fecha, estado, plan, metodo_pago, referencia_pago, monto, negocio, whatsapp, datos_json)
       VALUES (?, ?, 'Pendiente', ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, fecha, plan, metodo, ref, monto, negocio, whatsapp, JSON.stringify(sol)).run();

    return jsonRes({ ok: true, solicitudId: id });
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) }, 500);
  }
}