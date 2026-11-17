let PLATAFORMA_CONFIG = { MODO_MULTISECTOR: false, categorias: [] };
let AGENCIAS_DATA = [];
let OFERTAS_TEMPORADA = [];
let OPINIONES_DATA = [];

let estadoFiltros = {
    categoria: 'todos',
    destino: 'todos',
    origen: 'todos',
    texto: '',
    rapido: 'todas'
};

let favoritos = [];
try {
    const guardados = JSON.parse(localStorage.getItem('dv_favoritos') || '[]');
    if (Array.isArray(guardados)) {
        favoritos = guardados.filter(item => typeof item === 'string');
    }
} catch (e) {
    favoritos = [];
}

function esModoMultisector() {
    return PLATAFORMA_CONFIG && PLATAFORMA_CONFIG.MODO_MULTISECTOR === true;
}

function escaparHTML(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

function validarUrlSegura(url) {
    if (!url || typeof url !== 'string') return '';
    const limpia = url.trim();
    if (limpia.startsWith('pages/')) return limpia;
    try {
        const parsed = new URL(limpia);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
            return parsed.href;
        }
    } catch (e) {
        return '';
    }
    return '';
}

function registrarEventoClic(nombreAnunciante, canal) {
    if (typeof window.gtag === 'function') {
        window.gtag('event', 'clic_anunciante', {
            anunciante_nombre: nombreAnunciante,
            canal_contacto: canal
        });
    }
}

function inicializarApariencia() {
    const paletasValidas = ['caribe', 'coral', 'esmeralda'];
    const temasValidos = ['light', 'dark'];

    const defaultPaleta = (PLATAFORMA_CONFIG.apariencia && PLATAFORMA_CONFIG.apariencia.paletaDefault) || 'caribe';
    const defaultTema = (PLATAFORMA_CONFIG.apariencia && PLATAFORMA_CONFIG.apariencia.temaDefault) || 'light';

    const paletaGuardada = localStorage.getItem('dv_paleta');
    const temaGuardado = localStorage.getItem('dv_tema');

    const paleta = paletasValidas.includes(paletaGuardada) ? paletaGuardada : defaultPaleta;
    const tema = temasValidos.includes(temaGuardado) ? temaGuardado : defaultTema;

    document.documentElement.setAttribute('data-palette', paleta);
    document.documentElement.setAttribute('data-theme', tema);
    actualizarIconoTema(tema);
}

function cambiarPaleta(nombrePaleta) {
    const permitidas = ['caribe', 'coral', 'esmeralda'];
    if (!permitidas.includes(nombrePaleta)) return;
    document.documentElement.setAttribute('data-palette', nombrePaleta);
    localStorage.setItem('dv_paleta', nombrePaleta);
}

function alternarModoOscuro() {
    const actual = document.documentElement.getAttribute('data-theme');
    const nuevo = actual === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    localStorage.setItem('dv_tema', nuevo);
    actualizarIconoTema(nuevo);
}

function actualizarIconoTema(tema) {
    const btn = document.getElementById('darkToggleBtn');
    if (btn) btn.textContent = tema === 'dark' ? '☀️' : '🌙';
}

async function cargarDatosRemotos() {
    const cacheBuster = '?v=' + Date.now();
    try {
        const [resConfig, resAgencias] = await Promise.all([
            fetch('data/config.json' + cacheBuster),
            fetch('data/agencias.json' + cacheBuster)
        ]);

        if (resConfig.ok) {
            PLATAFORMA_CONFIG = await resConfig.json();
        }
        if (resAgencias.ok) {
            const dataJson = await resAgencias.json();
            AGENCIAS_DATA = Array.isArray(dataJson.anunciantes) ? dataJson.anunciantes : [];
            OFERTAS_TEMPORADA = Array.isArray(dataJson.ofertas) ? dataJson.ofertas : [];
            OPINIONES_DATA = Array.isArray(dataJson.opiniones) ? dataJson.opiniones : [];
        }
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

function aplicarLayoutYContenidos() {
    // 1. Textos del Hero
    if (PLATAFORMA_CONFIG.hero) {
        const badge = document.getElementById('heroBadge');
        const title = document.getElementById('heroTitle');
        const subtitle = document.getElementById('heroSubtitle');
        if (badge && PLATAFORMA_CONFIG.hero.badge) badge.textContent = PLATAFORMA_CONFIG.hero.badge;
        if (title && PLATAFORMA_CONFIG.hero.titulo) title.textContent = PLATAFORMA_CONFIG.hero.titulo;
        if (subtitle && PLATAFORMA_CONFIG.hero.subtitulo) subtitle.textContent = PLATAFORMA_CONFIG.hero.subtitulo;
    }

    // 2. Banner patrocinado
    const bannerEl = document.getElementById('sec-banner');
    if (bannerEl && PLATAFORMA_CONFIG.bannerPatrocinado) {
        const bp = PLATAFORMA_CONFIG.bannerPatrocinado;
        bannerEl.style.display = bp.visible === false ? 'none' : 'flex';
        const bTitle = document.getElementById('bannerTitle');
        const bDesc = document.getElementById('bannerDesc');
        const bBtn = document.getElementById('bannerBtn');
        if (bTitle) bTitle.textContent = bp.titulo || '';
        if (bDesc) bDesc.textContent = bp.descripcion || '';
        if (bBtn) {
            bBtn.textContent = bp.textoBoton || 'Ver más';
            const urlSegura = validarUrlSegura(bp.urlBoton);
            if (urlSegura) bBtn.href = urlSegura;
        }
    }

    // 3. Reordenar secciones dentro de <main>
    const mainCont = document.getElementById('mainContainer');
    if (mainCont && Array.isArray(PLATAFORMA_CONFIG.ordenSecciones)) {
        PLATAFORMA_CONFIG.ordenSecciones.forEach(secKey => {
            const el = document.getElementById('sec-' + secKey);
            if (el) mainCont.appendChild(el);
        });
    }
}

function inicializarModoPlataforma() {
    const barraSectores = document.getElementById('sectorTabsBar');
    const sectionTitle = document.getElementById('directorySectionTitle');

    if (!esModoMultisector()) {
        if (barraSectores) barraSectores.style.display = 'none';
        estadoFiltros.categoria = 'viajes';
        if (sectionTitle) sectionTitle.textContent = 'Agencias Anunciantes';
        return;
    }

    if (sectionTitle) {
        sectionTitle.textContent = 'Directorio de Anunciantes';
    }

    if (barraSectores && Array.isArray(PLATAFORMA_CONFIG.categorias)) {
        barraSectores.style.display = 'flex';
        barraSectores.innerHTML = '';

        PLATAFORMA_CONFIG.categorias.forEach(cat => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `sector-tab ${estadoFiltros.categoria === cat.id ? 'active' : ''}`;
            btn.textContent = cat.label;
            btn.addEventListener('click', () => {
                estadoFiltros.categoria = cat.id;
                document.querySelectorAll('.sector-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderizarOfertas();
                renderizarAgencias();
                const target = document.getElementById('sec-agencias');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
            barraSectores.appendChild(btn);
        });
    }
}

function toggleFavorito(id) {
    if (typeof id !== 'string') return;
    if (favoritos.includes(id)) {
        favoritos = favoritos.filter(item => item !== id);
    } else {
        favoritos.push(id);
    }
    localStorage.setItem('dv_favoritos', JSON.stringify(favoritos));
    renderizarAgencias();
}

function generarUrlWhatsApp(nombreDestino, numero, asuntoExtra = '') {
    if (!numero) return '';
    const soloDigitos = String(numero).replace(/\D/g, '');
    if (soloDigitos.length < 10 || soloDigitos.length > 15) return '';
    const texto = asuntoExtra
        ? `Hola ${nombreDestino}, vi su anuncio "${asuntoExtra}" en Directorio Viajero y me gustaría información.`
        : `Hola ${nombreDestino}, encontré su perfil en Directorio Viajero y me gustaría solicitar una cotización.`;
    return `https://wa.me/${soloDigitos}?text=${encodeURIComponent(texto)}`;
}

function renderizarOfertas() {
    const grid = document.getElementById('dealsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const ofertasFiltradas = OFERTAS_TEMPORADA.filter(oferta => {
        if (!esModoMultisector()) return oferta.categoria === 'viajes';
        return estadoFiltros.categoria === 'todos' || oferta.categoria === estadoFiltros.categoria;
    });

    ofertasFiltradas.forEach(oferta => {
        const card = document.createElement('article');
        card.className = 'deal-card';

        const imgSegura = validarUrlSegura(oferta.imagen);
        const waUrl = generarUrlWhatsApp(oferta.agencia, oferta.whatsappNumero, oferta.titulo);
        const esEnlaceInterno = oferta.web && oferta.web.startsWith('pages/');
        const webSegura = esEnlaceInterno ? oferta.web : validarUrlSegura(oferta.web);
        const destinoUrl = waUrl || webSegura || 'pages/anunciate.html';
        const textoBoton = oferta.textoBoton || (waUrl ? '💬 Cotizar por WhatsApp' : 'Ver Detalles');
        const targetAttr = esEnlaceInterno ? '' : 'target="_blank" rel="noopener noreferrer nofollow"';
        const claseBoton = oferta.esReferenciaReal ? 'btn-primary' : 'btn-whatsapp';

        card.innerHTML = `
            <div class="deal-img-wrap">
                <img src="${escaparHTML(imgSegura)}" alt="${escaparHTML(oferta.titulo)}">
                <span class="deal-promo-badge">${escaparHTML(oferta.etiqueta)}</span>
                <span class="deal-price-tag">${escaparHTML(oferta.precio)}</span>
            </div>
            <div class="deal-body">
                <div>
                    <div class="deal-agency-name">${escaparHTML(oferta.agencia)}</div>
                    <h3 class="deal-title">${escaparHTML(oferta.titulo)}</h3>
                    <p class="deal-info">${escaparHTML(oferta.detalle)}</p>
                </div>
                <a href="${escaparHTML(destinoUrl)}" ${targetAttr} class="btn-action ${claseBoton} deal-cta">
                    ${escaparHTML(textoBoton)}
                </a>
            </div>
        `;

        card.querySelector('.deal-cta').addEventListener('click', () => {
            registrarEventoClic(oferta.agencia, 'oferta_destacada');
        });

        grid.appendChild(card);
    });
}

function renderizarOpiniones() {
    const grid = document.getElementById('reviewsGrid');
    if (!grid || !OPINIONES_DATA.length) return;
    grid.innerHTML = '';

    OPINIONES_DATA.forEach(op => {
        const card = document.createElement('article');
        card.className = 'review-card';
        card.innerHTML = `
            <div class="review-stars">★★★★★</div>
            <p class="review-text">"${escaparHTML(op.texto)}"</p>
            <div class="review-author">
                <div class="author-avatar">${escaparHTML(op.iniciales)}</div>
                <div class="author-info">
                    <strong>${escaparHTML(op.nombre)}</strong>
                    <span>${escaparHTML(op.detalle)}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderizarAgencias() {
    const grid = document.getElementById('agencyGrid');
    const counter = document.getElementById('resultsCounter');
    if (!grid) return;

    grid.innerHTML = '';

    const baseUniverso = esModoMultisector()
        ? AGENCIAS_DATA
        : AGENCIAS_DATA.filter(a => a.categoria === 'viajes');

    const ordenadas = [...baseUniverso].sort((a, b) => (b.destacada === true) - (a.destacada === true));

    const filtradas = ordenadas.filter(agencia => {
        const cumpleCategoria = !esModoMultisector() || estadoFiltros.categoria === 'todos' || agencia.categoria === estadoFiltros.categoria;
        const cumpleDestino = estadoFiltros.destino === 'todos' || (Array.isArray(agencia.destinos) && agencia.destinos.includes(estadoFiltros.destino));
        const cumpleOrigen = estadoFiltros.origen === 'todos' || (Array.isArray(agencia.estadosSalida) && agencia.estadosSalida.includes(estadoFiltros.origen));

        const q = estadoFiltros.texto.toLowerCase().trim();
        const cumpleTexto = !q || 
            agencia.nombre.toLowerCase().includes(q) ||
            agencia.descripcion.toLowerCase().includes(q) ||
            agencia.salidaDesde.toLowerCase().includes(q) ||
            (agencia.categoriaNombre && agencia.categoriaNombre.toLowerCase().includes(q)) ||
            (Array.isArray(agencia.tags) && agencia.tags.some(t => t.toLowerCase().includes(q)));

        let cumpleRapido = true;
        if (estadoFiltros.rapido === 'destacadas') cumpleRapido = agencia.destacada === true;
        if (estadoFiltros.rapido === 'whatsapp') cumpleRapido = Boolean(agencia.whatsappNumero);
        if (estadoFiltros.rapido === 'rnt') cumpleRapido = Boolean(agencia.rnt);
        if (estadoFiltros.rapido === 'favoritas') cumpleRapido = favoritos.includes(agencia.id);

        return cumpleCategoria && cumpleDestino && cumpleOrigen && cumpleTexto && cumpleRapido;
    });

    if (counter) {
        counter.textContent = `Mostrando ${filtradas.length} de ${baseUniverso.length} anunciantes`;
    }

    if (filtradas.length === 0) {
        const emptyBox = document.createElement('div');
        emptyBox.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 3rem 1rem; background: var(--bg-card); border-radius: 1rem; border: 1px solid var(--border);';
        emptyBox.innerHTML = `
            <p style="color: var(--secondary); font-weight: 700; margin-bottom: 0.5rem;">No encontramos resultados con esa combinación de filtros</p>
            <p style="color: var(--text-soft); font-size: 0.9rem; margin-bottom: 1rem;">Prueba cambiando el giro, destino o limpia los filtros activos.</p>
            <button type="button" onclick="reiniciarFiltros()" class="btn-action btn-primary" style="display: inline-block; width: auto; padding: 0.6rem 1.25rem;">Mostrar todos</button>
        `;
        grid.appendChild(emptyBox);
        return;
    }

    filtradas.forEach(agencia => {
        const card = document.createElement('article');
        card.className = `agency-card ${agencia.destacada ? 'featured' : ''}`;

        const esFav = favoritos.includes(agencia.id);
        const badgeHtml = agencia.destacada ? '<span class="badge-featured">⭐ Destacada</span>' : '';
        const rntHtml = agencia.rnt ? `<span class="rnt-badge" title="Folio RNT: ${escaparHTML(agencia.rnt)}">🛡️ RNT</span>` : '';
        const catChipHtml = (esModoMultisector() && agencia.categoriaNombre)
            ? `<span class="category-chip">${escaparHTML(agencia.categoriaNombre)}</span>`
            : '';
        const tagsHtml = (agencia.tags || []).map(tag => `<span class="tag">${escaparHTML(tag)}</span>`).join('');
        const webSegura = validarUrlSegura(agencia.web);
        const waUrl = generarUrlWhatsApp(agencia.nombre, agencia.whatsappNumero);

        let botonesHtml = '';
        if (webSegura) {
            botonesHtml += `<a href="${escaparHTML(webSegura)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-action btn-primary link-web">${waUrl ? 'Sitio Web' : 'Visitar Web'}</a>`;
        }
        if (waUrl) {
            botonesHtml += `<a href="${escaparHTML(waUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-action btn-whatsapp link-wa">${webSegura ? 'WhatsApp' : 'Cotizar WhatsApp'}</a>`;
        }
        botonesHtml += `<button type="button" class="btn-action btn-outline btn-detalle" title="Ver detalles">+ Info</button>`;

        card.innerHTML = `
            ${badgeHtml}
            <div>
                ${catChipHtml}
                <div class="agency-header">
                    <div class="agency-logo" style="color: ${escaparHTML(agencia.colorTexto)}; background: ${escaparHTML(agencia.colorFondo)};">${escaparHTML(agencia.iniciales)}</div>
                    <div>
                        <h3 class="agency-title">${escaparHTML(agencia.nombre)}</h3>
                        <div>
                            <span class="verified-tag">${escaparHTML(agencia.etiquetaEstado)}</span>
                            ${rntHtml}
                        </div>
                    </div>
                    <button type="button" class="fav-btn ${esFav ? 'saved' : ''}" title="Guardar en favoritos">
                        ${esFav ? '❤️' : '🤍'}
                    </button>
                </div>
                <div class="agency-meta">
                    <span>📍 ${escaparHTML(agencia.salidaDesde)}</span>
                    <span>⭐ ${escaparHTML(agencia.rating)}</span>
                </div>
                <p class="agency-desc">${escaparHTML(agencia.descripcion)}</p>
                <div class="tags">${tagsHtml}</div>
            </div>
            <div class="card-actions">${botonesHtml}</div>
        `;

        card.querySelector('.fav-btn').addEventListener('click', () => toggleFavorito(agencia.id));
        card.querySelector('.btn-detalle').addEventListener('click', () => abrirModalAgencia(agencia.id));
        const btnWeb = card.querySelector('.link-web');
        if (btnWeb) btnWeb.addEventListener('click', () => registrarEventoClic(agencia.nombre, 'sitio_web'));
        const btnWa = card.querySelector('.link-wa');
        if (btnWa) btnWa.addEventListener('click', () => registrarEventoClic(agencia.nombre, 'whatsapp'));

        grid.appendChild(card);
    });
}

function ejecutarBusqueda() {
    const input = document.getElementById('searchInput');
    const selectDestino = document.getElementById('destinoSelect');
    const selectOrigen = document.getElementById('origenSelect');

    estadoFiltros.texto = input ? input.value.slice(0, 80) : '';
    estadoFiltros.destino = selectDestino ? selectDestino.value : 'todos';
    estadoFiltros.origen = selectOrigen ? selectOrigen.value : 'todos';

    renderizarAgencias();
    const target = document.getElementById('sec-agencias');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
}

function seleccionarDestinoCard(destino) {
    const selectDestino = document.getElementById('destinoSelect');
    if (selectDestino) selectDestino.value = destino;
    estadoFiltros.destino = destino;
    renderizarAgencias();
    const target = document.getElementById('sec-agencias');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
}

function aplicarFiltroRapido(tipo, botonElement) {
    estadoFiltros.rapido = tipo;
    document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
    if (botonElement) botonElement.classList.add('active');
    renderizarAgencias();
}

function reiniciarFiltros() {
    estadoFiltros = {
        categoria: esModoMultisector() ? 'todos' : 'viajes',
        destino: 'todos',
        origen: 'todos',
        texto: '',
        rapido: 'todas'
    };
    const input = document.getElementById('searchInput');
    const selectDestino = document.getElementById('destinoSelect');
    const selectOrigen = document.getElementById('origenSelect');
    if (input) input.value = '';
    if (selectDestino) selectDestino.value = 'todos';
    if (selectOrigen) selectOrigen.value = 'todos';
    document.querySelectorAll('.pill-btn').forEach((btn, idx) => btn.classList.toggle('active', idx === 0));
    document.querySelectorAll('.sector-tab').forEach((btn, idx) => btn.classList.toggle('active', idx === 0));
    renderizarOfertas();
    renderizarAgencias();
}

function abrirModalAgencia(id) {
    const agencia = AGENCIAS_DATA.find(a => a.id === id);
    if (!agencia) return;

    const modal = document.getElementById('agencyModal');
    const body = document.getElementById('modalBody');
    const webSegura = validarUrlSegura(agencia.web);
    const waUrl = generarUrlWhatsApp(agencia.nombre, agencia.whatsappNumero);

    let accionesModal = '';
    if (webSegura) {
        accionesModal += `<a href="${escaparHTML(webSegura)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-action btn-primary">Ir al Sitio Web Oficial</a>`;
    }
    if (waUrl) {
        accionesModal += `<a href="${escaparHTML(waUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-action btn-whatsapp">Cotizar por WhatsApp</a>`;
    }

    body.innerHTML = `
        <div class="agency-header">
            <div class="agency-logo" style="color: ${escaparHTML(agencia.colorTexto)}; background: ${escaparHTML(agencia.colorFondo)};">${escaparHTML(agencia.iniciales)}</div>
            <div>
                <h3 style="font-size: 1.35rem; color: var(--secondary);">${escaparHTML(agencia.nombre)}</h3>
                <span class="verified-tag">${escaparHTML(agencia.etiquetaEstado)} &bull; ⭐ ${escaparHTML(agencia.rating)}</span>
            </div>
        </div>
        <p style="color: var(--text-main); font-size: 0.95rem; margin-top: 0.75rem;">${escaparHTML(agencia.descripcion)}</p>
        <div class="modal-details-grid">
            <div><span>Cobertura / Salida</span><strong>${escaparHTML(agencia.salidaDesde)}</strong></div>
            <div><span>Rango orientativo</span><strong>${escaparHTML(agencia.rangoPrecio)}</strong></div>
            <div style="grid-column: 1/-1;"><span>Especialidad</span><strong>${escaparHTML(agencia.especialidad)}</strong></div>
        </div>
        <div class="tags">${(agencia.tags || []).map(t => `<span class="tag">${escaparHTML(t)}</span>`).join('')}</div>
        <div class="card-actions">${accionesModal}</div>
        <p style="font-size: 0.75rem; color: var(--text-soft); margin-top: 1rem; text-align: center;">
            Contacto directo con el anunciante sin cargos extra ni intermediarios.
        </p>
    `;

    modal.classList.add('open');
}

function cerrarModalAgencia(event) {
    if (!event || event.target.id === 'agencyModal' || event.target.classList.contains('modal-close')) {
        document.getElementById('agencyModal').classList.remove('open');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('agencyGrid')) {
        await cargarDatosRemotos();
        inicializarApariencia();
        aplicarLayoutYContenidos();
        inicializarModoPlataforma();
        renderizarOfertas();
        renderizarAgencias();
        renderizarOpiniones();
    } else {
        inicializarApariencia();
    }
    const input = document.getElementById('searchInput');
    if (input) {
        input.addEventListener('input', (e) => {
            estadoFiltros.texto = e.target.value.slice(0, 80);
            renderizarAgencias();
        });
    }
});