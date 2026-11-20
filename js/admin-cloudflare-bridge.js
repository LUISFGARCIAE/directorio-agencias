(function () {
  "use strict";

  const PROPIETARIO = "directorioturistico.mx@gmail.com";
  const esc = (s) => (window.VayoraSec ? window.VayoraSec.escapeHTML(s) : String(s || ""));
  let CF_STATE = { admin: null, admins: [], auditoria: [], solicitudes: [] };

  async function cfApi(url, opts = {}) {
    const res = await fetch(url, Object.assign({ credentials: "same-origin", cache: "no-store" }, opts));
    return res.json();
  }

  function inyectarEstilosPuente() {
    const st = document.createElement("style");
    st.textContent = `
      #cfLoginOverlay {
        position: fixed; inset: 0; z-index: 99999; background: rgba(10, 15, 28, 0.96);
        backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 1rem;
      }
      #cfLoginCard {
        width: 100%; max-width: 430px; background: #1e293b; color: #f8fafc;
        border: 1px solid #334155; border-radius: 1rem; padding: 1.6rem; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        font-family: system-ui, -apple-system, sans-serif;
      }
      #cfLoginCard label { display: block; font-size: 0.82rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.35rem; }
      #cfLoginCard input {
        width: 100%; padding: 0.7rem 0.85rem; border-radius: 0.6rem; border: 1px solid #334155;
        background: #0b1220; color: #f8fafc; font-size: 16px; margin-bottom: 0.85rem; box-sizing: border-box;
      }
      #cfLoginCard button {
        width: 100%; padding: 0.78rem; border: none; border-radius: 0.65rem; background: #0ea5e9;
        color: #082f49; font-weight: 800; font-size: 0.95rem; cursor: pointer;
      }
      #cfWelcomeBar {
        max-width: 1200px; margin: 0.85rem auto; padding: 0.95rem 1.2rem; border-radius: 0.9rem;
        background: linear-gradient(90deg, rgba(14,165,233,0.16), rgba(16,185,129,0.10));
        border: 1px solid rgba(14,165,233,0.45); display: flex; flex-wrap: wrap;
        align-items: center; justify-content: space-between; gap: 0.75rem;
      }
      #cfModalSeg {
        position: fixed; inset: 0; z-index: 99998; background: rgba(2, 6, 23, 0.82);
        display: none; align-items: center; justify-content: center; padding: 1rem;
      }
      #cfModalSegBox {
        width: 100%; max-width: 1120px; max-height: 90vh; overflow-y: auto;
        background: #0f172a; color: #f8fafc; border: 1px solid #334155; border-radius: 1rem; padding: 1.25rem;
      }
      .cf-seg-grid { display: grid; grid-template-columns: 1.25fr 1fr; gap: 1.2rem; }
      @media (max-width: 820px) { .cf-seg-grid { grid-template-columns: 1fr; } }
      .cf-btn {
        padding: 0.45rem 0.75rem; border-radius: 0.5rem; border: 1px solid #334155;
        background: #1e293b; color: #f8fafc; font-weight: 700; font-size: 0.78rem; cursor: pointer;
      }
      .cf-btn:hover { filter: brightness(1.12); }
      .cf-btn-ok { background: #10b981; color: #052e16; border-color: #10b981; }
      .cf-btn-red { background: #ef4444; color: #fff; border-color: #ef4444; }
      .cf-btn-amber { background: #f59e0b; color: #1c1917; border-color: #f59e0b; }
      .cf-btn-blue { background: #0ea5e9; color: #082f49; border-color: #0ea5e9; }
      .cf-btn-ghost-red { background: rgba(239,68,68,0.14); color: #fca5a5; border-color: rgba(239,68,68,0.5); }
      .cf-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
      .cf-pill {
        display: inline-block; padding: 0.15rem 0.45rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700;
      }
      .cf-pill-super { background: rgba(245,158,11,0.2); color: #fcd34d; border: 1px solid rgba(245,158,11,0.45); }
      .cf-pill-editor { background: rgba(56,189,248,0.16); color: #7dd3fc; border: 1px solid rgba(56,189,248,0.35); }
      .cf-tbl { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-top: 0.6rem; }
      .cf-tbl th, .cf-tbl td { text-align: left; padding: 0.55rem 0.45rem; border-bottom: 1px solid #334155; vertical-align: middle; }
    `;
    document.head.appendChild(st);
  }

  function ocultarControlesGithubObsoletos() {
    const ghInput = document.getElementById("githubTokenInput");
    if (ghInput) {
      const card = ghInput.closest("section.admin-card");
      if (card) card.style.display = "none";
    }
    const cfgBuzon = document.getElementById("cfgBuzonNubeUrl");
    if (cfgBuzon) {
      cfgBuzon.value = location.origin + "/api/solicitudes";
      cfgBuzon.readOnly = true;
      cfgBuzon.title = "Conectado automáticamente a Cloudflare D1";
    }
    const stPub = document.getElementById("statusPublicacion");
    if (stPub) {
      stPub.textContent = "⚡ Conectado en tiempo real a Cloudflare D1: al pulsar Publicar, los cambios se reflejan al instante.";
      stPub.style.color = "#7dd3fc";
    }
  }

  function crearUIAccesoYSeguridad() {
    const ov = document.createElement("div");
    ov.id = "cfLoginOverlay";
    ov.innerHTML = `
      <div id="cfLoginCard">
        <h2 style="margin:0 0 0.35rem; font-size:1.3rem;">🔑 Guías Vayora — Panel Maestro</h2>
        <p style="margin:0 0 1.1rem; font-size:0.84rem; color:#94a3b8;">Acceso multi-administrador protegido en Cloudflare D1 (sin tokens de GitHub).</p>
        <form id="cfFormLogin">
          <label>Correo o Usuario</label>
          <input type="text" id="cfLgnEmail" placeholder="Ej. directorioturistico.mx o karim" autocomplete="username" required>
          <label>Contraseña</label>
          <input type="password" id="cfLgnPass" autocomplete="current-password" required>
          <div id="cfLgnErr" style="color:#fca5a5; font-size:0.82rem; margin-bottom:0.7rem; display:none;"></div>
          <button type="submit" id="cfBtnEntrar">Entrar al Panel Maestro</button>
        </form>
      </div>
    `;
    document.body.appendChild(ov);

    const mod = document.createElement("div");
    mod.id = "cfModalSeg";
    mod.innerHTML = `
      <div id="cfModalSegBox">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="margin:0;">👥 Administradores y Bitácora de Auditoría</h3>
          <button type="button" class="cf-btn cf-btn-red" id="cfCerrarModalSeg">✖ Cerrar</button>
        </div>
        <div class="cf-seg-grid">
          <div>
            <h4 style="margin-top:0;">Usuarios con Acceso</h4>
            <form id="cfFormNuevoAdmin" style="display:none; background:#1e293b; padding:0.85rem; border-radius:0.65rem; margin-bottom:0.8rem;">
              <input id="cfAdmNom" placeholder="Nombre completo" required style="width:100%;margin-bottom:0.45rem;padding:0.5rem;border-radius:0.4rem;border:1px solid #334155;background:#0b1220;color:#fff;box-sizing:border-box;">
              <input id="cfAdmEmail" type="email" placeholder="correo@guiasvayora.com" required style="width:100%;margin-bottom:0.45rem;padding:0.5rem;border-radius:0.4rem;border:1px solid #334155;background:#0b1220;color:#fff;box-sizing:border-box;">
              <select id="cfAdmRol" style="width:100%;margin-bottom:0.45rem;padding:0.5rem;border-radius:0.4rem;border:1px solid #334155;background:#0b1220;color:#fff;">
                <option value="editor">Editor (Admin)</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <input id="cfAdmPass" type="password" minlength="10" placeholder="Contraseña (mín. 10 caracteres)" required style="width:100%;margin-bottom:0.55rem;padding:0.5rem;border-radius:0.4rem;border:1px solid #334155;background:#0b1220;color:#fff;box-sizing:border-box;">
              <button type="submit" class="cf-btn cf-btn-ok">➕ Crear / Actualizar Contraseña</button>
            </form>
            <table class="cf-tbl">
              <thead><tr><th>Usuario / Rol</th><th>Acciones y Privilegios</th></tr></thead>
              <tbody id="cfTbodyAdmins"></tbody>
            </table>
          </div>
          <div>
            <h4 style="margin-top:0;">📜 Bitácora de Cambios (Últimos 100)</h4>
            <div style="max-height:480px; overflow-y:auto;">
              <table class="cf-tbl"><thead><tr><th>Fecha</th><th>Admin</th><th>Acción</th></tr></thead><tbody id="cfTbodyAud"></tbody></table>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(mod);

    document.getElementById("cfCerrarModalSeg").onclick = () => { mod.style.display = "none"; };

    document.getElementById("cfFormLogin").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errBox = document.getElementById("cfLgnErr");
      errBox.style.display = "none";
      const btn = document.getElementById("cfBtnEntrar");
      btn.disabled = true; btn.textContent = "Verificando...";
      try {
        const res = await cfApi("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "login",
            email: document.getElementById("cfLgnEmail").value.trim(),
            password: document.getElementById("cfLgnPass").value
          })
        });
        if (!res.ok) throw new Error(res.error || "Credenciales inválidas");
        await hidratarDesdeCloudflare();
      } catch (err) {
        errBox.textContent = "⛔ " + err.message;
        errBox.style.display = "block";
      } finally {
        btn.disabled = false; btn.textContent = "Entrar al Panel Maestro";
      }
    });

    document.getElementById("cfFormNuevoAdmin").addEventListener("submit", async (e) => {
      e.preventDefault();
      const res = await cfApi("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "crear_admin",
          nombre: document.getElementById("cfAdmNom").value.trim(),
          email: document.getElementById("cfAdmEmail").value.trim(),
          rol: document.getElementById("cfAdmRol").value,
          password: document.getElementById("cfAdmPass").value
        })
      });
      if (res.ok) { e.target.reset(); await hidratarDesdeCloudflare(); renderModalSeguridad(); alert("✅ Administrador guardado."); }
      else alert("⛔ " + (res.error || "Error"));
    });
  }

  function mostrarBarraBienvenida(admin) {
    let bar = document.getElementById("cfWelcomeBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "cfWelcomeBar";
      const main = document.querySelector("main.admin-wrap");
      if (main) main.insertBefore(bar, main.firstChild);
      else document.body.insertBefore(bar, document.body.firstChild);
    }
    const rolTxt = admin.rol === "superadmin" ? "⭐ SUPERADMIN" : "✏️ EDITOR";
    bar.innerHTML = `
      <div>
        <strong style="font-size:1.05rem;">👋 Bienvenido, ${esc(admin.nombre)}</strong>
        <div style="font-size:0.8rem; opacity:0.85;">${esc(admin.email)} • ${rolTxt} • Guardado instantáneo en Cloudflare D1</div>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
        <button type="button" class="cf-btn" id="cfBtnAbrirSeg">👥 Admins y Auditoría</button>
        <button type="button" class="cf-btn cf-btn-red" id="cfBtnLogout">🚪 Cerrar Sesión</button>
      </div>
    `;
    document.getElementById("cfBtnAbrirSeg").onclick = () => {
      renderModalSeguridad();
      document.getElementById("cfModalSeg").style.display = "flex";
    };
    document.getElementById("cfBtnLogout").onclick = async () => {
      await cfApi("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "logout" }) });
      location.reload();
    };
  }

  function renderModalSeguridad() {
    const esSuper = CF_STATE.admin && CF_STATE.admin.rol === "superadmin";
    document.getElementById("cfFormNuevoAdmin").style.display = esSuper ? "block" : "none";

    document.getElementById("cfTbodyAdmins").innerHTML = (CF_STATE.admins || []).map(a => {
      const emailEsc = esc(a.email);
      const esPropio = a.email === CF_STATE.admin.email;
      const esOwner = a.email === PROPIETARIO;
      const pillRol = a.rol === "superadmin"
        ? `<span class="cf-pill cf-pill-super">⭐ superadmin</span>`
        : `<span class="cf-pill cf-pill-editor">✏️ editor</span>`;
      const estadoTxt = a.activo ? "🟢 Activo" : "🔴 Inactivo";

      let accionesHtml = `<span style="color:#94a3b8; font-size:0.78rem;">${estadoTxt}${esOwner ? " • 🔒 Principal" : ""}</span>`;
      if (esSuper && !esPropio && !esOwner) {
        const sigRol = a.rol === "superadmin" ? "editor" : "superadmin";
        const btnRolTxt = a.rol === "superadmin" ? "✏️ Pasar a Editor" : "⭐ Hacer Superadmin";
        const btnRolCls = a.rol === "superadmin" ? "cf-btn-blue" : "cf-btn-amber";
        accionesHtml = `
          <div class="cf-actions">
            <button type="button" class="cf-btn ${btnRolCls}" onclick="window._cfCambiarRol('${emailEsc}','${sigRol}')">${btnRolTxt}</button>
            <button type="button" class="cf-btn ${a.activo ? "cf-btn-red" : "cf-btn-ok"}" onclick="window._cfToggleAdmin('${emailEsc}',${a.activo ? "false" : "true"})">${a.activo ? "Desactivar" : "Activar"}</button>
            <button type="button" class="cf-btn cf-btn-ghost-red" title="Eliminar usuario permanentemente" onclick="window._cfEliminarAdmin('${emailEsc}')">🗑️ Eliminar</button>
          </div>
        `;
      }

      return `
        <tr>
          <td>
            <strong>${esc(a.nombre)}</strong> ${pillRol}<br>
            <small style="color:#94a3b8;">${emailEsc} • ${estadoTxt}</small>
          </td>
          <td>${accionesHtml}</td>
        </tr>
      `;
    }).join("");

    document.getElementById("cfTbodyAud").innerHTML = (CF_STATE.auditoria || []).map(l => `
      <tr>
        <td><small style="color:#94a3b8;">${esc((l.fecha || "").slice(0, 19).replace("T", " "))}</small></td>
        <td>${esc(l.admin_email)}</td>
        <td><strong>${esc(l.accion)}</strong><br><small style="color:#94a3b8;">${esc(l.detalle)}</small></td>
      </tr>
    `).join("");
  }

  window._cfToggleAdmin = async (email, activo) => {
    const res = await cfApi("/api/admin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "toggle_admin", email, activo })
    });
    if (res.ok) { await hidratarDesdeCloudflare(); renderModalSeguridad(); }
    else alert("⛔ " + (res.error || "Error"));
  };

  window._cfCambiarRol = async (email, rol) => {
    const etiqueta = rol === "superadmin" ? "SUPERADMIN (acceso total a usuarios)" : "EDITOR (solo gestión de contenido)";
    if (!confirm(`¿Cambiar los privilegios de ${email} a ${etiqueta}?`)) return;
    const res = await cfApi("/api/admin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "cambiar_rol", email, rol })
    });
    if (res.ok) { await hidratarDesdeCloudflare(); renderModalSeguridad(); }
    else alert("⛔ " + (res.error || "Error"));
  };

  window._cfEliminarAdmin = async (email) => {
    if (!confirm(`⚠️ ¿Eliminar permanentemente al usuario ${email}?\n\nSe cerrará su sesión de inmediato y ya no podrá entrar al panel.`)) return;
    const res = await cfApi("/api/admin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "eliminar_admin", email })
    });
    if (res.ok) { await hidratarDesdeCloudflare(); renderModalSeguridad(); }
    else alert("⛔ " + (res.error || "Error"));
  };

  // === REEMPLAZO COMPLETO DEL MOTOR GITHUB/GAS POR CLOUDFLARE D1 ===
  window.guardarArchivoGithub = async function (path, obj, mensaje) {
    const esConfig = /config\.json/i.test(String(path || ""));
    if (esConfig && obj && typeof obj === "object") {
      obj.buzonNubeUrl = location.origin + "/api/solicitudes";
    }
    const payload = esConfig
      ? { accion: "guardar_config", config: obj, detalle: mensaje || "Edición de configuración" }
      : { accion: "guardar_catalogo", catalogo: obj, detalle: mensaje || "Edición de catálogo" };
    const res = await cfApi("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(res.error || "No se pudo guardar en Cloudflare D1");
    return res;
  };

  window.leerArchivoGithub = async function (path) {
    const data = await cfApi("/api/admin");
    if (!data.ok) throw new Error(data.error || "Sesión expirada");
    return { sha: "d1-live", json: /config\.json/i.test(String(path || "")) ? data.config : data.catalogo };
  };

  window.conectarEditorGithub = async function () {
    await hidratarDesdeCloudflare();
  };

  window.sincronizarSolicitudesNube = async function (mostrarEstado) {
    try {
      const data = await cfApi("/api/solicitudes?accion=listar");
      if (data && data.ok && Array.isArray(data.solicitudes)) {
        solicitudesNubeCache = data.solicitudes.filter(s => s.estado === "Pendiente");
      }
    } catch (e) {}
    if (typeof renderizarSolicitudesPendientes === "function") renderizarSolicitudesPendientes();
    if (mostrarEstado) {
      const st = document.getElementById("statusPublicacion");
      if (st) st.textContent = `🔄 Bandeja sincronizada (${solicitudesNubeCache.length} solicitudes pendientes en D1).`;
    }
  };

  window.actualizarEstadoSolicitudNube = async function (solicitudId, nuevoEstado) {
    if (!solicitudId) return;
    await cfApi("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "estado_solicitud", solicitudId, estado: nuevoEstado })
    });
  };

  const _origPublicar = window.publicarTodoEnVivo;
  window.publicarTodoEnVivo = async function () {
    editorConectado = true;
    githubToken = "CLOUDFLARE_D1_SESSION";
    if (typeof aplicarCambiosRevistaLocal === "function") aplicarCambiosRevistaLocal(true);
    if (typeof guardarComercialLocal === "function") guardarComercialLocal(true);
    if (configActual && typeof configActual === "object") {
      configActual.buzonNubeUrl = location.origin + "/api/solicitudes";
    }
    if (typeof _origPublicar === "function") {
      await _origPublicar.apply(this, arguments);
      const st = document.getElementById("statusPublicacion");
      if (st && !/Error|❌/i.test(st.textContent)) {
        st.textContent = "✅ ¡Publicado al instante en Guías Vayora (Cloudflare D1)! Recarga la portada o Anúnciate para verlo.";
        st.style.color = "#4ade80";
      }
      const fresh = await cfApi("/api/admin").catch(() => null);
      if (fresh && fresh.ok) { CF_STATE.auditoria = fresh.auditoria || []; CF_STATE.admins = fresh.admins || []; }
    }
  };

  async function hidratarDesdeCloudflare() {
    const data = await cfApi("/api/admin");
    if (!data.ok) {
      document.getElementById("cfLoginOverlay").style.display = "flex";
      return;
    }
    CF_STATE = data;
    document.getElementById("cfLoginOverlay").style.display = "none";

    githubToken = "CLOUDFLARE_D1_SESSION";
    buzonAdminKey = "CLOUDFLARE_D1_SESSION";
    editorConectado = true;

    if (data.config && typeof data.config === "object") configActual = data.config;
    if (data.catalogo && typeof data.catalogo === "object") catalogoActual = data.catalogo;
    if (Array.isArray(data.solicitudes)) {
      solicitudesNubeCache = data.solicitudes.filter(s => s.estado === "Pendiente");
    }

    mostrarBarraBienvenida(data.admin);
    ocultarControlesGithubObsoletos();

    if (typeof hidratarTodoElPanel === "function") hidratarTodoElPanel();
  }

  async function arrancarPuente() {
    inyectarEstilosPuente();
    ocultarControlesGithubObsoletos();
    crearUIAccesoYSeguridad();

    try {
      const auth = await cfApi("/api/auth");
      if (auth.ok && auth.autenticado) {
        await hidratarDesdeCloudflare();
      } else {
        document.getElementById("cfLoginOverlay").style.display = "flex";
      }
    } catch (e) {
      document.getElementById("cfLoginOverlay").style.display = "flex";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancarPuente);
  else arrancarPuente();
})();