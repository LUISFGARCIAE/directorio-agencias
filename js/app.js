let CONFIG_SITE = {};
let CATALOGO = { anunciantes: [], ofertas: [], guias: [], faq: [] };
let SECTOR_ACTIVO = "todos";
let SOLO_FAVORITOS = false;
let FAVORITOS = JSON.parse(localStorage.getItem("dv_favoritos") || "[]");
let COMPARADOR = [];

const FALLBACK_IMG = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80";

function escaparHTML(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function validarUrlSegura(urlRaw) {
    const limpio = String(urlRaw || "").trim();
    if (!limpio) return "";
    try {
        const parsed = new URL(limpio);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
    } catch (e) {}
    return "";
}

function normalizarTelefonoWa(raw) {
    const digitos = String(raw || "").replace(/\D/g, "");
    if (!digitos) return "";
    return digitos.length === 10 ? "52" + digitos : digitos;
}

function cambiarTemaColor(tema) {
    document.documentElement.setAttribute("data-color-theme", tema);
    localStorage.setItem("dv_color_theme", tema);
}

function toggleModoOscuro() {
    const actual = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", actual);
    localStorage.setItem("dv_dark_mode", actual);
    const btn = document.getElementById("btnDarkMode");
    if (btn) btn.textContent = actual === "dark" ? "☀️" : "🌙";
}

function obtenerFotoPrincipal(item) {
    if (Array.isArray(item.galeria) && item.galeria.length > 0) {
        const valida = validarUrlSegura(item.galeria[0]);
        if (valida) return valida;
    }
    return FALLBACK_IMG;
}

function renderizarSpotlight() {
    const cont = document.getElementById("bloqueSpotlight");
    if (!cont) return;

    const revCfg = CONFIG_SITE.revistaEditorial || {};
    if (revCfg.mostrarSpotlight === false) {
        cont.innerHTML = "";
        return;
    }
    const manual = revCfg.spotlightId ? CATALOGO.anunciantes.find(a => a.id === revCfg.spotlightId) : null;
    const destacados = CATALOGO.anunciantes.filter(a => a.destacada);
    const item = manual || destacados[0] || CATALOGO.anunciantes[0];
    if (!item || SECTOR_ACTIVO !== "todos" || SOLO_FAVORITOS || (document.getElementById("inputBusqueda")?.value.trim())) {
        cont.innerHTML = "";
        return;
    }

    const foto = obtenerFotoPrincipal(item);
    const wa = normalizarTelefonoWa(item.whatsappNumero);
    const cobros = Array.isArray(item.tiposCobro) ? item.tiposCobro : ["Transferencia SPEI", "Tarjeta"];
    const promo = item.promocion || item.cuponBeneficio || "Promoción exclusiva al mencionar Guías Vayora";

    cont.innerHTML = `
        <article class="mag-spotlight">
            <div class="mag-spotlight-media" onclick="abrirModalAgencia('${escaparHTML(item.id)}')" style="cursor:pointer;">
                <img src="${escaparHTML(foto)}" alt="${escaparHTML(item.nombre)}" loading="lazy">
                <span class="mag-spotlight-badge">⭐ PORTADA DE LA EDICIÓN</span>
            </div>
            <div class="mag-spotlight-body">
                <div>
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; margin-bottom:0.5rem;">
                        <span class="verified-badge">${escaparHTML(item.categoriaNombre || "Destacado")}</span>
                        <span style="font-size:0.8rem; color:var(--text-soft); font-weight:700;">📍 ${escaparHTML(item.salidaDesde || "México")}</span>
                    </div>
                    <h2 style="font-size:1.55rem; color:var(--secondary); margin:0 0 0.45rem;">${escaparHTML(item.nombre)}</h2>
                    <p style="font-size:0.9rem; color:var(--text-soft); line-height:1.55; margin:0 0 0.9rem;">${escaparHTML(item.descripcion)}</p>

                    <div class="mag-specs-grid" style="margin-bottom:0.8rem;">
                        <div class="mag-spec-item">
                            <span>💰 Cobro / Tarifa</span>
                            <strong>${escaparHTML(item.rangoPrecio || "Cotización directa")}</strong>
                        </div>
                        <div class="mag-spec-item">
                            <span>⏱️ Duración</span>
                            <strong>${escaparHTML(item.duracion || "Paquete flexible")}</strong>
                        </div>
                    </div>

                    <div class="mag-promo-banner" style="margin-bottom:0.75rem;">
                        <strong>🎁 Promoción:</strong> ${escaparHTML(promo)}
                    </div>

                    <div class="mag-pay-pills">
                        <span style="font-size:0.72rem; font-weight:700; color:var(--text-soft);">💳 Cobros:</span>
                        ${cobros.map(c => `<span class="mag-pay-pill">${escaparHTML(c)}</span>`).join("")}
                    </div>
                </div>

                <div style="display:flex; gap:0.65rem; flex-wrap:wrap; margin-top:0.5rem;">
                    <button type="button" class="btn-action btn-primary" style="flex:1;" onclick="abrirModalAgencia('${escaparHTML(item.id)}')">
                        📸 Ver Fotos y Ficha Completa
                    </button>
                    ${wa ? `<a href="https://wa.me/${wa}?text=${encodeURIComponent("Hola " + item.nombre + ", vi su anuncio destacado en la revista Guías Vayora y quiero más información.")}" target="_blank" rel="noopener noreferrer" class="btn-action btn-whatsapp" style="flex:1;">💬 Contactar Directo</a>` : ""}
                </div>
            </div>
        </article>
    `;
}

function renderizarAgencias(lista) {
    const grid = document.getElementById("gridAnunciantes");
    const contador = document.getElementById("contadorResultados");
    if (!grid) return;

    if (contador) {
        contador.textContent = `${lista.length} anuncio${lista.length === 1 ? "" : "s"} publicado${lista.length === 1 ? "" : "s"}`;
    }

    if (!lista.length) {
        grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:2.5rem; background:var(--bg-card); border:1px solid var(--border); border-radius:1rem;">
                <h3 style="color:var(--secondary); margin-bottom:0.4rem;">Sin anuncios en esta búsqueda</h3>
                <p style="color:var(--text-soft); font-size:0.9rem;">Prueba cambiando de categoría, lugar o limpiando el buscador.</p>
            </div>`;
        return;
    }

    // Ordenar destacados primero
    const ordenados = [...lista].sort((a, b) => (b.destacada ? 1 : 0) - (a.destacada ? 1 : 0));

    grid.innerHTML = ordenados.map(item => {
        const foto = obtenerFotoPrincipal(item);
        const totalFotos = Array.isArray(item.galeria) ? item.galeria.length : 1;
        const esFav = FAVORITOS.includes(item.id);
        const enComp = COMPARADOR.includes(item.id);
        const cobros = Array.isArray(item.tiposCobro) ? item.tiposCobro.slice(0, 3) : ["SPEI", "Tarjeta"];
        const promo = item.promocion || item.cuponBeneficio || "";
        const wa = normalizarTelefonoWa(item.whatsappNumero);

        return `
            <article class="mag-card ${item.destacada ? "featured" : ""}">
                <div class="mag-card-cover" onclick="abrirModalAgencia('${escaparHTML(item.id)}')">
                    <img src="${escaparHTML(foto)}" alt="${escaparHTML(item.nombre)}" loading="lazy">
                    <span class="mag-cat-pill">${escaparHTML(item.categoriaNombre || "Anunciante")}</span>
                    ${item.destacada ? `<span class="mag-featured-pill">⭐ Destacado</span>` : ""}
                    <span class="mag-price-overlay">${escaparHTML(item.rangoPrecio || "Cotización directa")}</span>
                    ${totalFotos > 1 ? `<span class="mag-photo-count">📷 ${totalFotos} fotos</span>` : ""}
                </div>

                <div class="mag-card-body">
                    <div class="mag-card-title-row">
                        <div>
                            <h3 class="mag-card-title">${escaparHTML(item.nombre)}</h3>
                            <div style="font-size:0.78rem; color:var(--text-soft); margin-top:0.2rem;">
                                📍 ${escaparHTML(item.salidaDesde || "México")} &bull; ⭐ ${escaparHTML(item.rating || "5.0")}
                            </div>
                        </div>
                        <button type="button" onclick="toggleFavorito('${escaparHTML(item.id)}')" title="Guardar anuncio" style="background:var(--bg-muted); border:1px solid var(--border); border-radius:9999px; width:34px; height:34px; cursor:pointer; font-size:0.95rem; flex-shrink:0;">
                            ${esFav ? "❤️" : "🤍"}
                        </button>
                    </div>

                    <p style="font-size:0.84rem; color:var(--text-main); line-height:1.45; margin:0;">
                        ${escaparHTML(item.descripcion)}
                    </p>

                    <div class="mag-specs-grid">
                        <div class="mag-spec-item">
                            <span>⏱️ Duración</span>
                            <strong>${escaparHTML(item.duracion || "Flexible")}</strong>
                        </div>
                        <div class="mag-spec-item">
                            <span>🏷️ Especialidad</span>
                            <strong>${escaparHTML((item.especialidad || "Servicio directo").slice(0, 46))}</strong>
                        </div>
                    </div>

                    ${promo ? `<div class="mag-promo-banner"><strong>🎁 Promo:</strong> ${escaparHTML(promo)}</div>` : ""}

                    <div class="mag-pay-pills">
                        <span style="font-size:0.7rem; font-weight:700; color:var(--text-soft);">💳 Acepta:</span>
                        ${cobros.map(c => `<span class="mag-pay-pill">${escaparHTML(c)}</span>`).join("")}
                    </div>

                    <div class="mag-card-actions">
                        <button type="button" class="btn-action btn-primary" style="font-size:0.82rem; padding:0.6rem;" onclick="abrirModalAgencia('${escaparHTML(item.id)}')">
                            📸 Ver Fotos y Detalles
                        </button>
                        ${wa ? `<a href="https://wa.me/${wa}?text=${encodeURIComponent("Hola " + item.nombre + ", vi tu anuncio en Guías Vayora y me interesa cotizar.")}" target="_blank" rel="noopener noreferrer" class="btn-action btn-whatsapp" style="font-size:0.82rem; padding:0.6rem;">💬 WhatsApp</a>` : `<button type="button" class="btn-action btn-outline" style="font-size:0.82rem; padding:0.6rem;" onclick="abrirModalAgencia('${escaparHTML(item.id)}')">Ver Contacto</button>`}
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:0.5rem; margin-top:0.15rem;">
                        <span style="font-size:0.72rem; color:#059669; font-weight:700;">${escaparHTML(item.etiquetaEstado || "✔ Anuncio Verificado")}</span>
                        <button type="button" onclick="toggleComparar('${escaparHTML(item.id)}')" style="background:transparent; border:none; color:${enComp ? "var(--primary)" : "var(--text-soft)"}; font-size:0.76rem; font-weight:700; cursor:pointer;">
                            ${enComp ? "✔ En comparador" : "⚖️ Comparar"}
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function filtrarDirectorio() {
    const texto = (document.getElementById("inputBusqueda")?.value || "").toLowerCase().trim();
    const salida = document.getElementById("selectSalida")?.value || "todos";
    const presupuesto = document.getElementById("selectPresupuesto")?.value || "todos";

    const filtrados = CATALOGO.anunciantes.filter(a => {
        if (SECTOR_ACTIVO !== "todos" && a.categoria !== SECTOR_ACTIVO) return false;
        if (SOLO_FAVORITOS && !FAVORITOS.includes(a.id)) return false;

        if (salida !== "todos") {
            const estados = Array.isArray(a.estadosSalida) ? a.estadosSalida : [];
            const textoLugar = (a.salidaDesde || "").toLowerCase();
            if (!estados.includes(salida) && !textoLugar.includes(salida)) return false;
        }

        if (presupuesto !== "todos") {
            const rango = String(a.rangoPrecio || "");
            const signos = (rango.match(/\$/g) || []).length;
            if (presupuesto === "$" && signos > 1 && !rango.startsWith("$ ")) return false;
            if (presupuesto === "$$" && !rango.includes("$$") && signos !== 2) return false;
            if (presupuesto === "$$$" && !rango.includes("$$$")) return false;
        }

        if (texto) {
            const blob = [
                a.nombre, a.categoriaNombre, a.descripcion, a.especialidad,
                a.salidaDesde, a.rangoPrecio, a.duracion, a.promocion,
                (a.tags || []).join(" "), (a.tiposCobro || []).join(" ")
            ].join(" ").toLowerCase();
            if (!blob.includes(texto)) return false;
        }
        return true;
    });

    renderizarSpotlight();
    renderizarAgencias(filtrados);
}

function seleccionarSector(sector, btn) {
    SECTOR_ACTIVO = sector;
    SOLO_FAVORITOS = false;
    document.querySelectorAll(".sector-tab").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    filtrarDirectorio();
}

function toggleSoloFavoritos(btn) {
    SOLO_FAVORITOS = !SOLO_FAVORITOS;
    document.querySelectorAll(".sector-tab").forEach(b => b.classList.remove("active"));
    if (SOLO_FAVORITOS && btn) {
        btn.classList.add("active");
    } else {
        SECTOR_ACTIVO = "todos";
        document.querySelector(".sector-tab")?.classList.add("active");
    }
    filtrarDirectorio();
}

function toggleFavorito(id) {
    if (FAVORITOS.includes(id)) {
        FAVORITOS = FAVORITOS.filter(x => x !== id);
    } else {
        FAVORITOS.push(id);
    }
    localStorage.setItem("dv_favoritos", JSON.stringify(FAVORITOS));
    const el = document.getElementById("countFavs");
    if (el) el.textContent = FAVORITOS.length;
    filtrarDirectorio();
}

function abrirModalAgencia(id) {
    const item = CATALOGO.anunciantes.find(a => a.id === id);
    if (!item) return;

    const fotos = (Array.isArray(item.galeria) && item.galeria.length)
        ? item.galeria.map(validarUrlSegura).filter(Boolean)
        : [FALLBACK_IMG];
    const principal = fotos[0] || FALLBACK_IMG;
    const cobros = Array.isArray(item.tiposCobro) ? item.tiposCobro : ["Transferencia SPEI", "Tarjeta", "Efectivo"];
    const amenidades = Array.isArray(item.amenidades) ? item.amenidades : [];
    const web = validarUrlSegura(item.web);
    const wa = normalizarTelefonoWa(item.whatsappNumero);
    const promo = item.promocion || item.cuponBeneficio || "";

    const html = `
        <div style="margin-bottom:0.75rem;">
            <span class="verified-badge">${escaparHTML(item.categoriaNombre || "Anunciante")}</span>
            <h2 style="font-size:1.45rem; color:var(--secondary); margin:0.35rem 0 0.2rem;">${escaparHTML(item.nombre)}</h2>
            <div style="font-size:0.84rem; color:var(--text-soft);">📍 ${escaparHTML(item.salidaDesde || "México")} &bull; ⭐ ${escaparHTML(item.rating || "5.0")} &bull; ${escaparHTML(item.etiquetaEstado || "✔ Verificado")}</div>
        </div>

        <div style="border-radius:0.85rem; overflow:hidden; margin-bottom:0.65rem; background:#0f172a;">
            <img id="fotoPrincipalModal" src="${escaparHTML(principal)}" alt="${escaparHTML(item.nombre)}" style="width:100%; height:300px; object-fit:cover; display:block;">
        </div>
        ${fotos.length > 1 ? `
            <div style="display:flex; gap:0.5rem; overflow-x:auto; margin-bottom:1rem;">
                ${fotos.map(f => `<img src="${escaparHTML(f)}" onclick="cambiarFotoModal('${escaparHTML(f)}')" style="width:82px; height:58px; object-fit:cover; border-radius:0.45rem; cursor:pointer; border:2px solid var(--border);">`).join("")}
            </div>
        ` : ""}

        <p style="font-size:0.92rem; color:var(--text-main); line-height:1.6; margin-bottom:1rem;">${escaparHTML(item.descripcion)}</p>

        <div class="mag-specs-grid" style="margin-bottom:1rem;">
            <div class="mag-spec-item"><span>💰 Cobros / Tarifas</span><strong>${escaparHTML(item.rangoPrecio || "Cotización directa")}</strong></div>
            <div class="mag-spec-item"><span>⏱️ Duración</span><strong>${escaparHTML(item.duracion || "Según paquete")}</strong></div>
            <div class="mag-spec-item"><span>📍 Lugares / Cobertura</span><strong>${escaparHTML(item.salidaDesde || "México")}</strong></div>
            <div class="mag-spec-item"><span>✨ Especialidad</span><strong>${escaparHTML(item.especialidad || "Servicio directo")}</strong></div>
        </div>

        ${promo ? `
            <div class="mag-promo-banner" style="margin-bottom:1rem; padding:0.75rem 0.9rem;">
                <strong>🎁 Promoción Vigente:</strong> ${escaparHTML(promo)}
                ${item.cuponCodigo ? `<div style="margin-top:0.4rem; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;"><span>Cupón:</span> <code style="background:var(--bg-card); padding:0.2rem 0.5rem; border-radius:0.35rem; font-weight:800;">${escaparHTML(item.cuponCodigo)}</code> <button type="button" class="btn-action btn-outline" style="padding:0.2rem 0.55rem; font-size:0.75rem;" onclick="copiarCupon('${escaparHTML(item.cuponCodigo)}')">📋 Copiar</button></div>` : ""}
            </div>
        ` : ""}

        <div style="margin-bottom:1rem;">
            <div style="font-size:0.76rem; font-weight:800; color:var(--text-soft); text-transform:uppercase; margin-bottom:0.4rem;">💳 Tipos de Cobro Aceptados</div>
            <div class="mag-pay-pills">
                ${cobros.map(c => `<span class="mag-pay-pill" style="font-size:0.78rem; padding:0.28rem 0.65rem;">✔ ${escaparHTML(c)}</span>`).join("")}
            </div>
        </div>

        ${amenidades.length ? `
            <div style="margin-bottom:1rem;">
                <div style="font-size:0.76rem; font-weight:800; color:var(--text-soft); text-transform:uppercase; margin-bottom:0.4rem;">⭐ Incluye / Amenidades</div>
                <div class="mag-pay-pills">
                    ${amenidades.map(am => `<span class="mag-pay-pill" style="font-size:0.78rem;">${escaparHTML(am)}</span>`).join("")}
                </div>
            </div>
        ` : ""}

        <div style="display:flex; gap:0.65rem; flex-wrap:wrap; margin-top:1.25rem;">
            ${wa ? `<a href="https://wa.me/${wa}?text=${encodeURIComponent("Hola " + item.nombre + ", vi su anuncio en la revista Guías Vayora" + (item.cuponCodigo ? " con el cupón " + item.cuponCodigo : "") + " y deseo cotizar.")}" target="_blank" rel="noopener noreferrer" class="btn-action btn-whatsapp" style="flex:1; padding:0.8rem;">💬 Cotizar Directo por WhatsApp</a>` : ""}
            ${web ? `<a href="${escaparHTML(web)}" target="_blank" rel="noopener noreferrer" class="btn-action btn-primary" style="flex:1; padding:0.8rem;">🌐 Visitar Sitio Web Oficial</a>` : ""}
        </div>
    `;

    document.getElementById("contenidoModalAgencia").innerHTML = html;
    document.getElementById("modalAgencia").classList.add("open");
}

function cambiarFotoModal(url) {
    const img = document.getElementById("fotoPrincipalModal");
    const segura = validarUrlSegura(url);
    if (img && segura) img.src = segura;
}

function cerrarModalAgencia(e) {
    if (!e || e.target.id === "modalAgencia" || e.target.classList.contains("modal-close")) {
        document.getElementById("modalAgencia").classList.remove("open");
    }
}

function copiarCupon(codigo) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(codigo).then(() => alert(`✅ Cupón ${codigo} copiado. Menciónalo directo al anunciante.`));
    }
}

function toggleComparar(id) {
    if (COMPARADOR.includes(id)) {
        COMPARADOR = COMPARADOR.filter(x => x !== id);
    } else {
        if (COMPARADOR.length >= 3) {
            alert("Puedes comparar hasta 3 anuncios al mismo tiempo.");
            return;
        }
        COMPARADOR.push(id);
    }
    const barra = document.getElementById("barraComparador");
    const cnt = document.getElementById("countComparar");
    if (cnt) cnt.textContent = COMPARADOR.length;
    if (barra) barra.style.display = COMPARADOR.length > 0 ? "flex" : "none";
    filtrarDirectorio();
}

function limpiarComparador() {
    COMPARADOR = [];
    const barra = document.getElementById("barraComparador");
    if (barra) barra.style.display = "none";
    filtrarDirectorio();
}

function abrirModalComparador() {
    const items = CATALOGO.anunciantes.filter(a => COMPARADOR.includes(a.id));
    if (!items.length) return;
    const filas = [
        ["Sector", a => a.categoriaNombre || ""],
        ["💰 Cobro / Tarifa", a => a.rangoPrecio || "Cotización directa"],
        ["⏱️ Duración", a => a.duracion || "Flexible"],
        ["📍 Lugar", a => a.salidaDesde || "México"],
        ["🎁 Promoción", a => a.promocion || a.cuponBeneficio || "N/A"],
        ["💳 Tipos de Cobro", a => (a.tiposCobro || []).join(", ")]
    ];

    const tabla = `
        <table style="width:100%; border-collapse:collapse; font-size:0.84rem;">
            <thead>
                <tr>
                    <th style="text-align:left; padding:0.65rem; border-bottom:2px solid var(--border);">Concepto</th>
                    ${items.map(i => `<th style="text-align:left; padding:0.65rem; border-bottom:2px solid var(--border); color:var(--primary-dark);">${escaparHTML(i.nombre)}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${filas.map(([titulo, fn]) => `
                    <tr>
                        <td style="padding:0.6rem; border-bottom:1px solid var(--border); font-weight:700;">${titulo}</td>
                        ${items.map(i => `<td style="padding:0.6rem; border-bottom:1px solid var(--border);">${escaparHTML(fn(i))}</td>`).join("")}
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
    document.getElementById("contenidoModalComparador").innerHTML = tabla;
    document.getElementById("modalComparador").classList.add("open");
}

function cerrarModalComparador(e) {
    if (!e || e.target.id === "modalComparador" || e.target.classList.contains("modal-close")) {
        document.getElementById("modalComparador").classList.remove("open");
    }
}

function renderizarOfertas() {
    const grid = document.getElementById("gridOfertas");
    if (!grid) return;
    const ofertas = Array.isArray(CATALOGO.ofertas) ? CATALOGO.ofertas : [];
    if (!ofertas.length) {
        document.getElementById("seccionOfertas").style.display = "none";
        return;
    }

    grid.innerHTML = ofertas.map(of => {
        const img = validarUrlSegura(of.imagen) || FALLBACK_IMG;
        const wa = normalizarTelefonoWa(of.whatsappNumero);
        return `
            <article class="mag-card">
                <div class="mag-card-cover" style="height:185px;">
                    <img src="${escaparHTML(img)}" alt="${escaparHTML(of.titulo)}" loading="lazy">
                    <span class="mag-featured-pill">${escaparHTML(of.etiqueta || "🔥 Oferta")}</span>
                    <span class="mag-price-overlay">${escaparHTML(of.precio || "")}</span>
                </div>
                <div class="mag-card-body">
                    <span style="font-size:0.75rem; font-weight:700; color:var(--primary-dark);">${escaparHTML(of.agencia || "")}</span>
                    <h3 class="mag-card-title">${escaparHTML(of.titulo || "")}</h3>
                    <p style="font-size:0.84rem; color:var(--text-soft); margin:0;">${escaparHTML(of.detalle || "")}</p>
                    ${wa ? `<a href="https://wa.me/${wa}?text=${encodeURIComponent("Hola, me interesa la promoción: " + (of.titulo || "") + " vista en Guías Vayora.")}" target="_blank" rel="noopener noreferrer" class="btn-action btn-whatsapp" style="margin-top:auto;">${escaparHTML(of.textoBoton || "💬 Solicitar Promoción")}</a>` : ""}
                </div>
            </article>
        `;
    }).join("");
}

function renderizarGuias() {
    const grid = document.getElementById("gridGuias");
    if (!grid) return;
    const guias = Array.isArray(CATALOGO.guias) ? CATALOGO.guias : [];
    if (!guias.length) {
        document.getElementById("seccionGuias").style.display = "none";
        return;
    }

    grid.innerHTML = guias.map((g, idx) => `
        <article class="mag-card" style="padding:1.25rem; cursor:pointer;" onclick="abrirModalGuia(${idx})">
            <span class="verified-badge" style="width:fit-content; margin-bottom:0.5rem;">${escaparHTML(g.categoria || "Guía")}</span>
            <h3 class="mag-card-title" style="margin-bottom:0.45rem;">${escaparHTML(g.titulo || "")}</h3>
            <p style="font-size:0.84rem; color:var(--text-soft); margin:0 0 0.85rem;">${escaparHTML(g.resumen || "")}</p>
            <span style="font-size:0.82rem; font-weight:700; color:var(--primary); margin-top:auto;">Leer artículo completo →</span>
        </article>
    `).join("");
}

function abrirModalGuia(idx) {
    const g = (CATALOGO.guias || [])[idx];
    if (!g) return;
    document.getElementById("contenidoModalGuia").innerHTML = `
        <span class="verified-badge">${escaparHTML(g.categoria || "Guía")}</span>
        <h2 style="font-size:1.4rem; color:var(--secondary); margin:0.5rem 0;">${escaparHTML(g.titulo || "")}</h2>
        <p style="font-size:0.92rem; color:var(--text-main); line-height:1.7; white-space:pre-line;">${escaparHTML(g.contenido || g.resumen || "")}</p>
    `;
    document.getElementById("modalGuia").classList.add("open");
}

function cerrarModalGuia(e) {
    if (!e || e.target.id === "modalGuia" || e.target.classList.contains("modal-close")) {
        document.getElementById("modalGuia").classList.remove("open");
    }
}

function renderizarFAQ() {
    const cont = document.getElementById("listaFaq");
    if (!cont) return;
    const faqs = Array.isArray(CATALOGO.faq) ? CATALOGO.faq : [];
    if (!faqs.length) {
        document.getElementById("seccionFaq").style.display = "none";
        return;
    }

    cont.innerHTML = faqs.map(f => `
        <details style="background:var(--bg-card); border:1px solid var(--border); border-radius:0.75rem; padding:0.9rem 1.1rem;">
            <summary style="font-weight:700; color:var(--secondary); cursor:pointer;">${escaparHTML(f.pregunta || "")}</summary>
            <p style="font-size:0.86rem; color:var(--text-soft); margin:0.6rem 0 0; line-height:1.55;">${escaparHTML(f.respuesta || "")}</p>
        </details>
    `).join("");
}

function abrirModalContacto(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById("modalContactoDirectorio");
    if (!modal) return;
    const b2b = CONFIG_SITE.comercialB2B || {};
    const waRaw = normalizarTelefonoWa(b2b.whatsappAdmin || CONFIG_SITE.whatsappConcierge || "525652415593");
    const mailRaw = (b2b.correoAdmin || "directorioturistico.mx@gmail.com").trim();

    document.getElementById("contactoModalWaTxt").textContent = "+" + waRaw;
    document.getElementById("contactoModalMailTxt").textContent = mailRaw;
    document.getElementById("btnContactoModalWa").href = `https://wa.me/${waRaw}?text=${encodeURIComponent("Hola, me comunico desde la pestaña Contacto de Guías Vayora.")}`;
    document.getElementById("btnContactoModalMail").href = `mailto:${encodeURIComponent(mailRaw)}?subject=${encodeURIComponent("Contacto desde Guías Vayora")}`;
    modal.classList.add("open");
}

function cerrarModalContacto(e) {
    if (!e || e.target.id === "modalContactoDirectorio" || e.target.classList.contains("modal-close")) {
        document.getElementById("modalContactoDirectorio").classList.remove("open");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const savedColor = localStorage.getItem("dv_color_theme");
    if (savedColor) document.documentElement.setAttribute("data-color-theme", savedColor);
    if (localStorage.getItem("dv_dark_mode") === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        const btn = document.getElementById("btnDarkMode");
        if (btn) btn.textContent = "☀️";
    }

    const favEl = document.getElementById("countFavs");
    if (favEl) favEl.textContent = FAVORITOS.length;

    try {
        const [resCfg, resCat] = await Promise.all([
            fetch("data/config.json?t=" + Date.now()),
            fetch("data/agencias.json?t=" + Date.now())
        ]);
        if (resCfg.ok) CONFIG_SITE = await resCfg.json();
        if (resCat.ok) CATALOGO = await resCat.json();

        if (CONFIG_SITE.topBarActivo && CONFIG_SITE.topBarTexto) {
            document.getElementById("topPromoText").textContent = CONFIG_SITE.topBarTexto;
            document.getElementById("topPromoBar").style.display = "block";
        }
        const rev = CONFIG_SITE.revistaEditorial || {};
        if (!savedColor && rev.temaDefault) {
            document.documentElement.setAttribute("data-color-theme", rev.temaDefault);
        }
        if (rev.disclaimerTexto) {
            const bar = document.getElementById("magDisclaimerBar");
            if (bar) bar.innerHTML = `📣 <strong>Plataforma Publicitaria Independiente:</strong> ${escaparHTML(rev.disclaimerTexto)}`;
        }
        if (rev.kickerTexto && document.getElementById("magKickerText")) {
            document.getElementById("magKickerText").textContent = rev.kickerTexto;
        }
        if (rev.heroTitle && document.getElementById("heroTitle")) {
            document.getElementById("heroTitle").textContent = rev.heroTitle;
        }
        if (rev.heroSubtitle && document.getElementById("heroSubtitle")) {
            document.getElementById("heroSubtitle").textContent = rev.heroSubtitle;
        }
        if (rev.mostrarOfertas === false && document.getElementById("seccionOfertas")) {
            document.getElementById("seccionOfertas").style.display = "none";
        }
        if (rev.mostrarCta === false && document.getElementById("bloqueCtaAnunciante")) {
            document.getElementById("bloqueCtaAnunciante").style.display = "none";
        }
        if (rev.mostrarGuias === false && document.getElementById("seccionGuias")) {
            document.getElementById("seccionGuias").style.display = "none";
        }
        if (rev.mostrarFaq === false && document.getElementById("seccionFaq")) {
            document.getElementById("seccionFaq").style.display = "none";
        }
    } catch (e) {
        console.error("Error cargando datos de la revista:", e);
    }

    filtrarDirectorio();
    renderizarOfertas();
    renderizarGuias();
    renderizarFAQ();

    // Abrir anuncio directo si viene parametro ?agencia=id
    const params = new URLSearchParams(window.location.search);
    const agId = params.get("agencia");
    if (agId) abrirModalAgencia(agId);
});