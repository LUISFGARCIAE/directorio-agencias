function normalizarTelefonoWa(raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (d.length === 10) d = '52' + d;
    return d || '525652415593';
}
let PLATAFORMA_CONFIG = { MODO_MULTISECTOR: false, categorias: [] };
let AGENCIAS_DATA = [];
let OFERTAS_TEMPORADA = [];
let OPINIONES_DATA = [];
let FAQ_DATA = [];
let GUIAS_DATA = [];

let heroSlideIdx = 0;
let heroIntervalId = null;

let estadoFiltros = {
    categoria: 'todos',
    destino: 'todos',
    origen: 'todos',
    texto: '',
    rapido: 'todas',
    presupuesto: 'todos',
    presupuesto: 'todos'
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

function generarUrlGoogleMapsEmbed(consulta) {
    const q = encodeURIComponent(String(consulta || 'Ciudad de Mexico').trim());
    return `https://maps.google.com/maps?q=${q}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
}

function generarUrlGoogleMapsExterna(consulta) {
    const q = encodeURIComponent(String(consulta || 'Ciudad de Mexico').trim());
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
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
            FAQ_DATA = Array.isArray(dataJson.faq) ? dataJson.faq : [];
            GUIAS_DATA = Array.isArray(dataJson.guias) ? dataJson.guias : [];
        }
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

// Carrusel animado de 5 imagenes de fondo en portada
function inicializarCarruselHero() {
    const bgContainer = document.getElementById('heroBgContainer');
    const dotsContainer = document.getElementById('heroDots');
    if (!bgContainer || !dotsContainer) return;

    const imagenesDefault = [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=1600&q=80"
    ];

    const listaImgs = (PLATAFORMA_CONFIG.hero && Array.isArray(PLATAFORMA_CONFIG.hero.imagenes) && PLATAFORMA_CONFIG.hero.imagenes.length)
        ? PLATAFORMA_CONFIG.hero.imagenes
        : imagenesDefault;

    bgContainer.innerHTML = '';
    dotsContainer.innerHTML = '';

    listaImgs.forEach((url, idx) => {
        const segura = validarUrlSegura(url);
        if (!segura) return;

        const layer = document.createElement('div');
        layer.className = `hero-bg-layer ${idx === 0 ? 'active' : ''}`;
        layer.style.backgroundImage = `url('${segura}')`;
        bgContainer.appendChild(layer);

        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `hero-dot ${idx === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Fondo ${idx + 1}`);
        dot.addEventListener('click', () => cambiarSlideHero(idx));
        dotsContainer.appendChild(dot);
    });

    if (heroIntervalId) clearInterval(heroIntervalId);
    heroIntervalId = setInterval(() => {
        const total = bgContainer.children.length;
        if (total > 1) {
            cambiarSlideHero((heroSlideIdx + 1) % total);
        }
    }, 6000);
}

function cambiarSlideHero(nuevoIdx) {
    const layers = document.querySelectorAll('.hero-bg-layer');
    const dots = document.querySelectorAll('.hero-dot');
    if (!layers.length) return;

    layers.forEach((l, i) => l.classList.toggle('active', i === nuevoIdx));
    dots.forEach((d, i) => d.classList.toggle('active', i === nuevoIdx));
    heroSlideIdx = nuevoIdx;
}

function aplicarLayoutYContenidos() {
    const b2bCfg = PLATAFORMA_CONFIG.comercialB2B || {};
    const elB2BTit = document.getElementById('b2bPortadaTitulo');
    const elB2BSub = document.getElementById('b2bPortadaSubtitulo');
    const elB2BBadge = document.getElementById('b2bPortadaPrecioBadge');
    if (elB2BTit && b2bCfg.tituloB2BPortada) elB2BTit.textContent = b2bCfg.tituloB2BPortada;
    if (elB2BSub && b2bCfg.subtituloB2BPortada) elB2BSub.textContent = b2bCfg.subtituloB2BPortada;
    if (elB2BBadge && b2bCfg.planDestacadoPrecio) {
        elB2BBadge.textContent = `⭐ Plan Destacado: ${b2bCfg.planDestacadoPrecio} ${b2bCfg.planDestacadoNota || ''}`.trim();
    }
    const topBarEl = document.getElementById('promoTopBar');
    if (topBarEl && PLATAFORMA_CONFIG.topBar) {
        const tb = PLATAFORMA_CONFIG.topBar;
        topBarEl.style.display = tb.visible === false ? 'none' : 'flex';
        const tbText = document.getElementById('topBarText');
        const tbBtn = document.getElementById('topBarBtn');
        if (tbText) tbText.textContent = tb.texto || '';
        if (tbBtn) {
            tbBtn.textContent = tb.textoBoton || 'Ver más';
            tbBtn.href = tb.urlBoton || '#sec-ofertas';
        }
    }
    if (PLATAFORMA_CONFIG.hero) {
        const badge = document.getElementById('heroBadge');
        const title = document.getElementById('heroTitle');
        const subtitle = document.getElementById('heroSubtitle');
        if (badge && PLATAFORMA_CONFIG.hero.badge) badge.textContent = PLATAFORMA_CONFIG.hero.badge;
        if (title && PLATAFORMA_CONFIG.hero.titulo) title.textContent = PLATAFORMA_CONFIG.hero.titulo;
        if (subtitle && PLATAFORMA_CONFIG.hero.subtitulo) subtitle.textContent = PLATAFORMA_CONFIG.hero.subtitulo;
    }

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
                renderizarMapaLocaciones();
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

function renderizarMapaLocaciones() {
    const listEl = document.getElementById('mapsPlacesList');
    const frameEl = document.getElementById('mainGoogleMapFrame');
    const secMapa = document.getElementById('sec-mapa');
    if (!listEl || !frameEl || !secMapa) return;

    const conUbicacion = AGENCIAS_DATA.filter(a => {
        const tieneUbi = a.ubicacionMaps && a.ubicacionMaps.trim() !== '';
        const cumpleCat = !esModoMultisector() || estadoFiltros.categoria === 'todos' || a.categoria === estadoFiltros.categoria;
        return tieneUbi && cumpleCat;
    });

    if (conUbicacion.length === 0) {
        secMapa.style.display = 'none';
        return;
    }

    secMapa.style.display = 'block';
    listEl.innerHTML = '';

    conUbicacion.forEach((lugar, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `map-place-btn ${idx === 0 ? 'active' : ''}`;
        btn.innerHTML = `
            <strong>${escaparHTML(lugar.nombre)}</strong>
            <span>📍 ${escaparHTML(lugar.ubicacionMaps)} &bull; ${escaparHTML(lugar.categoriaNombre || '')}</span>
        `;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.map-place-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            frameEl.src = generarUrlGoogleMapsEmbed(lugar.ubicacionMaps);
        });
        listEl.appendChild(btn);
    });

    frameEl.src = generarUrlGoogleMapsEmbed(conUbicacion[0].ubicacionMaps);
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

        let cumplePresupuesto = true;
        if (estadoFiltros.presupuesto !== 'todos') {
            const matchSimbolos = String(agencia.rangoPrecio || '').match(/^\$+/);
            const nivelAgencia = matchSimbolos ? matchSimbolos[0] : '$$';
            cumplePresupuesto = nivelAgencia === estadoFiltros.presupuesto;
        }

        return cumpleCategoria && cumpleDestino && cumpleOrigen && cumpleTexto && cumpleRapido && cumplePresupuesto;
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
        rapido: 'todas',
    presupuesto: 'todos',
    presupuesto: 'todos'
    };
    const input = document.getElementById('searchInput');
    const selectDestino = document.getElementById('destinoSelect');
    const selectOrigen = document.getElementById('origenSelect');
    if (input) input.value = '';
    if (selectDestino) selectDestino.value = 'todos';
    if (selectOrigen) selectOrigen.value = 'todos';
    document.querySelectorAll('.pill-btn:not(.budget-pill)').forEach((btn, idx) => btn.classList.toggle('active', idx === 0));
    document.querySelectorAll('.budget-pill').forEach((btn, idx) => btn.classList.toggle('active', idx === 0));
    document.querySelectorAll('.sector-tab').forEach((btn, idx) => btn.classList.toggle('active', idx === 0));
    renderizarOfertas();
    renderizarAgencias();
    renderizarMapaLocaciones();
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
        accionesModal += `<a href="${escaparHTML(webSegura)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-action btn-primary">Sitio Web</a>`;
    }
    if (waUrl) {
        accionesModal += `<a href="${escaparHTML(waUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-action btn-whatsapp">WhatsApp</a>`;
    }
    if (agencia.ubicacionMaps) {
        const mapsExt = generarUrlGoogleMapsExterna(agencia.ubicacionMaps);
        accionesModal += `<a href="${escaparHTML(mapsExt)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-action btn-outline">📍 Google Maps</a>`;
    }

    const mapaEmbedHtml = agencia.ubicacionMaps
        ? `<div class="modal-map-box"><iframe src="${escaparHTML(generarUrlGoogleMapsEmbed(agencia.ubicacionMaps))}" loading="lazy" title="Ubicación"></iframe></div>`
        : '';

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
        ${mapaEmbedHtml}
    `;

    modal.classList.add('open');
}

function cerrarModalAgencia(event) {
    if (!event || event.target.id === 'agencyModal' || event.target.classList.contains('modal-close')) {
        document.getElementById('agencyModal').classList.remove('open');
    }
}

// Modo Edicion Visual en vivo directo en index.html (solo visible con token activo)
let modoEdicionVisualActivo = false;

function inicializarBarraEdicionVisual() {
    const token = sessionStorage.getItem('dv_gh_token');
    const urlParams = new URLSearchParams(window.location.search);
    if (!token && urlParams.get('edit') !== '1') return;

    const bar = document.createElement('div');
    bar.className = 'live-edit-bar';
    bar.innerHTML = `
        <span style="font-size:0.82rem; font-weight:700;">✏️ Administrador</span>
        <button type="button" id="btnToggleVisualEdit" class="live-edit-btn" style="background:#0284c7; color:white;">Activar Edición Visual</button>
        <button type="button" id="btnSaveVisualEdit" class="live-edit-btn" style="background:#16a34a; color:white; display:none;">🚀 Publicar Cambios</button>
        <a href="pages/admin.html" class="live-edit-btn" style="background:#334155; color:white; text-decoration:none;">Panel Completo</a>
    `;
    document.body.appendChild(bar);

    document.getElementById('btnToggleVisualEdit').addEventListener('click', () => {
        modoEdicionVisualActivo = !modoEdicionVisualActivo;
        document.body.classList.toggle('editing-active', modoEdicionVisualActivo);
        document.querySelectorAll('[data-editable="true"]').forEach(el => {
            el.contentEditable = modoEdicionVisualActivo ? 'true' : 'false';
        });
        document.getElementById('btnToggleVisualEdit').textContent = modoEdicionVisualActivo ? 'Salir de Edición' : 'Activar Edición Visual';
        document.getElementById('btnSaveVisualEdit').style.display = modoEdicionVisualActivo ? 'inline-block' : 'none';
    });

    document.getElementById('btnSaveVisualEdit').addEventListener('click', publicarEdicionVisualDirecta);
}

function moverBloqueVisual(secKey, dir) {
    const arr = PLATAFORMA_CONFIG.ordenSecciones || [];
    const idx = arr.indexOf(secKey);
    const nuevoIdx = idx + dir;
    if (idx < 0 || nuevoIdx < 0 || nuevoIdx >= arr.length) return;
    [arr[idx], arr[nuevoIdx]] = [arr[nuevoIdx], arr[idx]];
    aplicarLayoutYContenidos();
}

async function publicarEdicionVisualDirecta() {
    let token = sessionStorage.getItem('dv_gh_token');
    if (!token) {
        token = prompt('Ingresa tu Personal Access Token de GitHub para guardar los cambios en vivo:');
        if (!token) return;
        sessionStorage.setItem('dv_gh_token', token.trim());
    }

    const btn = document.getElementById('btnSaveVisualEdit');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        // Leer SHA actual de data/config.json
        const resGet = await fetch('https://api.github.com/repos/LUISFGARCIAE/directorio-agencias/contents/data/config.json', {
            headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
        });
        if (!resGet.ok) throw new Error('Token inválido o sin permisos');
        const fileData = await resGet.json();

        // Actualizar textos editados en pantalla
        PLATAFORMA_CONFIG.hero.badge = document.getElementById('heroBadge').textContent.trim();
        PLATAFORMA_CONFIG.hero.titulo = document.getElementById('heroTitle').textContent.trim();
        PLATAFORMA_CONFIG.hero.subtitulo = document.getElementById('heroSubtitle').textContent.trim();
        PLATAFORMA_CONFIG.bannerPatrocinado.titulo = document.getElementById('bannerTitle').textContent.trim();
        PLATAFORMA_CONFIG.bannerPatrocinado.descripcion = document.getElementById('bannerDesc').textContent.trim();

        const contenidoBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(PLATAFORMA_CONFIG, null, 4))));

        const resPut = await fetch('https://api.github.com/repos/LUISFGARCIAE/directorio-agencias/contents/data/config.json', {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Edición visual directa desde portada',
                content: contenidoBase64,
                sha: fileData.sha
            })
        });

        if (!resPut.ok) throw new Error('No se pudo guardar en GitHub');
        alert('✅ Cambios visuales publicados en vivo. Se reflejarán en ~40 segundos.');
    } catch (e) {
        alert('❌ Error: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Publicar Cambios';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('agencyGrid')) {
        await cargarDatosRemotos();
        inicializarApariencia();
        inicializarCarruselHero();
        aplicarLayoutYContenidos();
        inicializarModoPlataforma();
        renderizarOfertas();
        renderizarAgencias();
        renderizarMapaLocaciones();
        renderizarOpiniones();
        renderizarFAQ();
        renderizarGuias();
        inicializarBarraEdicionVisual();
        verificarDeepLinkAgencia();
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

// ==============================================================================
// FUNCIONES PRO: DEEP LINKING, COMPARTIR FICHA, COMPARADOR Y COTIZADOR PRE-WA
// ==============================================================================
let listaComparar = [];

function toggleComparar(id) {
    if (listaComparar.includes(id)) {
        listaComparar = listaComparar.filter(item => item !== id);
    } else {
        if (listaComparar.length >= 3) {
            alert('Puedes comparar hasta 3 opciones al mismo tiempo.');
            return;
        }
        listaComparar.push(id);
    }
    actualizarDockComparador();
    renderizarAgencias();
}

function limpiarComparador() {
    listaComparar = [];
    actualizarDockComparador();
    renderizarAgencias();
}

function actualizarDockComparador() {
    const dock = document.getElementById('compareDock');
    const label = document.getElementById('compareCountLabel');
    if (!dock || !label) return;

    if (listaComparar.length > 0) {
        dock.classList.add('visible');
        label.textContent = `${listaComparar.length} de 3 seleccionados`;
    } else {
        dock.classList.remove('visible');
    }
}

function abrirModalComparador() {
    if (listaComparar.length < 2) {
        alert('Selecciona al menos 2 opciones para compararlas lado a lado.');
        return;
    }

    const items = listaComparar.map(id => AGENCIAS_DATA.find(a => a.id === id)).filter(Boolean);
    const cont = document.getElementById('compareTableContainer');
    const modal = document.getElementById('compareModal');

    let headersHtml = '<th>Característica</th>';
    items.forEach(a => {
        headersHtml += `<td><strong style="font-size:1rem; color:var(--secondary);">${escaparHTML(a.nombre)}</strong><br><span style="font-size:0.75rem; color:var(--primary);">${escaparHTML(a.categoriaNombre || '')}</span></td>`;
    });

    const filas = [
        { titulo: 'Cobertura / Salidas', fn: a => escaparHTML(a.salidaDesde) },
        { titulo: 'Rango de Precio', fn: a => escaparHTML(a.rangoPrecio) },
        { titulo: 'Especialidad', fn: a => escaparHTML(a.especialidad) },
        { titulo: 'Registro RNT', fn: a => a.rnt ? `🛡️ Folio ${escaparHTML(a.rnt)}` : 'No especificado' },
        { titulo: 'Calificación', fn: a => `⭐ ${escaparHTML(a.rating)}` },
        {
            titulo: 'Contacto Directo',
            fn: a => {
                const wa = generarUrlWhatsApp(a.nombre, a.whatsappNumero);
                const web = validarUrlSegura(a.web);
                let btns = '';
                if (wa) btns += `<a href="${escaparHTML(wa)}" target="_blank" rel="noopener noreferrer" class="btn-action btn-whatsapp" style="margin-bottom:0.4rem;">WhatsApp</a>`;
                if (web) btns += `<a href="${escaparHTML(web)}" target="_blank" rel="noopener noreferrer" class="btn-action btn-primary">Sitio Web</a>`;
                return btns || '-';
            }
        }
    ];

    let bodyRows = '';
    filas.forEach(f => {
        bodyRows += `<tr><th>${f.titulo}</th>` + items.map(a => `<td>${f.fn(a)}</td>`).join('') + `</tr>`;
    });

    const conWhatsApp = items.filter(a => Boolean(a.whatsappNumero));
    let multiQuoteHtml = '';
    if (conWhatsApp.length > 0) {
        multiQuoteHtml = `
            <div class="quick-quote-box" style="margin-top: 1.25rem;">
                <div class="quick-quote-title">⚡ Cotización Múltiple (Envía los mismos datos a tus ${conWhatsApp.length} opciones)</div>
                <div class="quick-quote-grid">
                    <input type="text" id="mqFecha" placeholder="Fecha o mes deseado">
                    <input type="text" id="mqPersonas" placeholder="Personas / Invitados (Ej. 4 adultos)">
                </div>
                <input type="text" id="mqDetalle" placeholder="Comentarios (Ej. Salida desde CDMX, todo incluido...)" style="width:100%; padding:0.5rem 0.65rem; border-radius:0.45rem; border:1px solid var(--border); background:var(--bg-card); color:var(--text-main); font-size:0.82rem; margin-bottom:0.75rem;">
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                    ${conWhatsApp.map(a => `
                        <button type="button" onclick="enviarMultiCotizacion('${escaparHTML(a.id)}')" class="btn-action btn-whatsapp" style="flex:1; min-width:160px;">
                            💬 Enviar a ${escaparHTML(a.nombre)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    cont.innerHTML = `<table class="compare-table"><thead><tr>${headersHtml}</tr></thead><tbody>${bodyRows}</tbody></table>${multiQuoteHtml}`;
    modal.classList.add('open');
}

function cerrarModalComparador(event) {
    if (!event || event.target.id === 'compareModal' || event.target.classList.contains('modal-close')) {
        document.getElementById('compareModal').classList.remove('open');
    }
}

function compartirFicha(id) {
    const agencia = AGENCIAS_DATA.find(a => a.id === id);
    if (!agencia) return;

    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?agencia=${encodeURIComponent(agencia.id)}`;
    const texto = `Mira esta opción que encontré en Directorio Viajero: *${agencia.nombre}* (${agencia.salidaDesde}) 👉 ${shareUrl}`;

    if (navigator.share) {
        navigator.share({ title: agencia.nombre, text: texto, url: shareUrl }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(`✅ Enlace directo copiado al portapapeles:\n${shareUrl}\n\nYa puedes pegarlo en WhatsApp para compartirlo.`);
        });
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
    }
}

function enviarCotizacionEstructurada(id) {
    const agencia = AGENCIAS_DATA.find(a => a.id === id);
    if (!agencia || !agencia.whatsappNumero) return;

    const soloDigitos = String(agencia.whatsappNumero).replace(/\D/g, '');
    const fecha = document.getElementById('qqFecha').value || 'Por definir';
    const personas = document.getElementById('qqPersonas').value || '2 personas';
    const detalle = document.getElementById('qqDetalle').value.trim();

    const msg = `Hola *${agencia.nombre}*, los encontré en *Directorio Viajero* y me gustaría cotizar:\n` +
                `• *Fecha tentativa:* ${fecha}\n` +
                `• *Personas / Invitados:* ${personas}\n` +
                (agencia.cuponCodigo ? `• *Cupón aplicado:* ${agencia.cuponCodigo}\n` : '') +
                (detalle ? `• *Comentarios:* ${detalle}` : '');

    registrarEventoClic(agencia.nombre, 'cotizador_inteligente_wa');
    window.open(`https://wa.me/${soloDigitos}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
}

function verificarDeepLinkAgencia() {
    const params = new URLSearchParams(window.location.search);
    const idAgencia = params.get('agencia');
    if (idAgencia && AGENCIAS_DATA.some(a => a.id === idAgencia)) {
        abrirModalAgencia(idAgencia);
    }
}

function cambiarFotoModal(url, btnEl) {
    const mainImg = document.getElementById('modalMainPhoto');
    if (mainImg) mainImg.src = url;
    document.querySelectorAll('.modal-thumb-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
}

function enviarMultiCotizacion(id) {
    const agencia = AGENCIAS_DATA.find(a => a.id === id);
    if (!agencia || !agencia.whatsappNumero) return;

    const soloDigitos = String(agencia.whatsappNumero).replace(/\D/g, '');
    const fecha = document.getElementById('mqFecha').value || 'Por definir';
    const personas = document.getElementById('mqPersonas').value || 'Por definir';
    const detalle = document.getElementById('mqDetalle').value.trim();

    const msg = `Hola *${agencia.nombre}*, estoy comparando opciones en *Directorio Viajero* y me gustaría cotizar:\n` +
                `• *Fecha:* ${fecha}\n` +
                `• *Personas:* ${personas}\n` +
                (detalle ? `• *Detalles:* ${detalle}` : '');

    registrarEventoClic(agencia.nombre, 'cotizacion_multiple_comparador');
    window.open(`https://wa.me/${soloDigitos}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
}

function renderizarFAQ() {
    const cont = document.getElementById('faqListContainer');
    if (!cont || !FAQ_DATA.length) return;
    cont.innerHTML = '';

    FAQ_DATA.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = `faq-item ${idx === 0 ? 'open' : ''}`;
        div.innerHTML = `
            <button type="button" class="faq-question">
                <span>${escaparHTML(item.pregunta)}</span>
                <span>＋</span>
            </button>
            <div class="faq-answer">${escaparHTML(item.respuesta)}</div>
        `;
        div.querySelector('.faq-question').addEventListener('click', () => {
            div.classList.toggle('open');
        });
        cont.appendChild(div);
    });

    // Inyectar Schema.org FAQPage para SEO en Google
    let ldScript = document.getElementById('faqSchemaLd');
    if (!ldScript) {
        ldScript = document.createElement('script');
        ldScript.id = 'faqSchemaLd';
        ldScript.type = 'application/ld+json';
        document.head.appendChild(ldScript);
    }
    const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQ_DATA.map(f => ({
            "@type": "Question",
            "name": f.pregunta,
            "acceptedAnswer": { "@type": "Answer", "text": f.respuesta }
        }))
    };
    ldScript.textContent = JSON.stringify(schema);
}

// Asistente de Recomendacion en 3 Pasos
let wizardSeleccion = { categoria: 'todos', destino: 'todos', soloWa: false };

function abrirAsistenteRecomendacion() {
    wizardSeleccion = { categoria: esModoMultisector() ? 'todos' : 'viajes', destino: 'todos', soloWa: false };
    const modal = document.getElementById('wizardModal');
    if (esModoMultisector()) {
        mostrarPasoWizard(1);
    } else {
        mostrarPasoWizard(2);
    }
    modal.classList.add('open');
}

function cerrarModalWizard(event) {
    if (!event || event.target.id === 'wizardModal' || event.target.classList.contains('modal-close')) {
        document.getElementById('wizardModal').classList.remove('open');
    }
}

function mostrarPasoWizard(paso) {
    const body = document.getElementById('wizardBody');
    if (paso === 1) {
        body.innerHTML = `
            <span style="font-size:0.78rem; font-weight:700; color:var(--primary);">PASO 1 DE 3</span>
            <h3 style="font-size:1.3rem; color:var(--secondary); margin-top:0.25rem;">¿Qué estás planeando hoy?</h3>
            <div class="wizard-options-grid">
                <button type="button" class="wizard-opt-btn" onclick="wizardSeleccion.categoria='viajes'; mostrarPasoWizard(2);">✈️ Un Viaje o Vacaciones</button>
                <button type="button" class="wizard-opt-btn" onclick="wizardSeleccion.categoria='bodas'; mostrarPasoWizard(2);">💍 Una Boda o Evento</button>
                <button type="button" class="wizard-opt-btn" onclick="wizardSeleccion.categoria='hospedaje'; mostrarPasoWizard(2);">🏡 Renta de Quinta / Cabaña</button>
                <button type="button" class="wizard-opt-btn" onclick="wizardSeleccion.categoria='servicios'; mostrarPasoWizard(2);">📸 Fotografía o Experiencia</button>
            </div>
        `;
    } else if (paso === 2) {
        body.innerHTML = `
            <span style="font-size:0.78rem; font-weight:700; color:var(--primary);">PASO 2 DE 3</span>
            <h3 style="font-size:1.3rem; color:var(--secondary); margin-top:0.25rem;">¿Qué destino o zona prefieres?</h3>
            <div class="wizard-options-grid">
                <button type="button" class="wizard-opt-btn" onclick="wizardSeleccion.destino='cancun'; mostrarPasoWizard(3);">🏝️ Cancún y Riviera Maya</button>
                <button type="button" class="wizard-opt-btn" onclick="wizardSeleccion.destino='acapulco'; mostrarPasoWizard(3);">🌊 Acapulco / Pacífico</button>
                <button type="button" class="wizard-opt-btn" onclick="wizardSeleccion.destino='pueblos-magicos'; mostrarPasoWizard(3);">🏛️ Pueblos Mágicos / Centro</button>
                <button type="button" class="wizard-opt-btn" onclick="wizardSeleccion.destino='todos'; mostrarPasoWizard(3);">🌎 Cualquier destino en México</button>
            </div>
        `;
    } else {
        body.innerHTML = `
            <span style="font-size:0.78rem; font-weight:700; color:var(--primary);">PASO 3 DE 3</span>
            <h3 style="font-size:1.3rem; color:var(--secondary); margin-top:0.25rem;">¿Cómo prefieres cotizar?</h3>
            <div class="wizard-options-grid">
                <button type="button" class="wizard-opt-btn" onclick="aplicarResultadoWizard(true);">💬 Atención rápida por WhatsApp</button>
                <button type="button" class="wizard-opt-btn" onclick="aplicarResultadoWizard(false);">🌐 Ver todas las opciones disponibles</button>
            </div>
        `;
    }
}

function aplicarResultadoWizard(soloWa) {
    wizardSeleccion.soloWa = soloWa;
    estadoFiltros.categoria = wizardSeleccion.categoria;
    estadoFiltros.destino = wizardSeleccion.destino;
    estadoFiltros.rapido = soloWa ? 'whatsapp' : 'todas';

    const selectDestino = document.getElementById('destinoSelect');
    if (selectDestino) selectDestino.value = wizardSeleccion.destino;

    document.querySelectorAll('.sector-tab').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(wizardSeleccion.categoria === 'todos' ? 'todos' : wizardSeleccion.categoria));
    });

    cerrarModalWizard();
    renderizarOfertas();
    renderizarAgencias();
    renderizarMapaLocaciones();

    const target = document.getElementById('sec-agencias');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
}

function renderizarGuias() {
    const grid = document.getElementById('guidesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const visibles = GUIAS_DATA.filter(g => {
        if (!esModoMultisector()) return g.categoria === 'viajes';
        return estadoFiltros.categoria === 'todos' || g.categoria === estadoFiltros.categoria;
    });

    visibles.forEach(guia => {
        const card = document.createElement('article');
        card.className = 'guide-card';
        const imgSegura = validarUrlSegura(guia.imagen);

        card.innerHTML = `
            <img class="guide-img" src="${escaparHTML(imgSegura)}" alt="${escaparHTML(guia.titulo)}">
            <div class="guide-body">
                <div>
                    <div class="guide-meta">
                        <span>${escaparHTML(guia.categoriaLabel || 'Guía')}</span>
                        <span style="color: var(--text-soft);">${escaparHTML(guia.tiempoLectura || '3 min')}</span>
                    </div>
                    <h3 class="guide-title">${escaparHTML(guia.titulo)}</h3>
                    <p class="guide-excerpt">${escaparHTML(guia.resumen)}</p>
                </div>
                <button type="button" class="btn-action btn-outline btn-leer-guia">Leer Guía Completa →</button>
            </div>
        `;

        card.querySelector('.btn-leer-guia').addEventListener('click', () => abrirModalGuia(guia.id));
        grid.appendChild(card);
    });
}

function abrirModalGuia(id) {
    const guia = GUIAS_DATA.find(g => g.id === id);
    if (!guia) return;

    const modal = document.getElementById('guideModal');
    const body = document.getElementById('guideModalBody');
    const imgSegura = validarUrlSegura(guia.imagen);

    body.innerHTML = `
        <span class="category-chip">${escaparHTML(guia.categoriaLabel || 'Guía')} &bull; ${escaparHTML(guia.tiempoLectura || '')}</span>
        <h3 style="font-size: 1.4rem; color: var(--secondary); margin: 0.4rem 0 0.85rem 0; line-height: 1.3;">${escaparHTML(guia.titulo)}</h3>
        ${imgSegura ? `<img src="${escaparHTML(imgSegura)}" alt="${escaparHTML(guia.titulo)}" style="width:100%; height:210px; object-fit:cover; border-radius:0.75rem; margin-bottom:1rem;">` : ''}
        <p style="color: var(--text-main); font-size: 0.96rem; line-height: 1.7; white-space: pre-line;">${escaparHTML(guia.contenido)}</p>
        <div style="margin-top: 1.35rem; padding-top: 1rem; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <span style="font-size: 0.82rem; color: var(--text-soft);">¿Buscas especialistas verificados?</span>
            <button type="button" onclick="cerrarModalGuia(); document.getElementById('sec-agencias').scrollIntoView({behavior:'smooth'});" class="btn-action btn-primary" style="flex: 0 0 auto; padding: 0.55rem 1.15rem;">
                Ver Directorio →
            </button>
        </div>
    `;

    modal.classList.add('open');
}

function cerrarModalGuia(event) {
    if (!event || event.target.id === 'guideModal' || event.target.classList.contains('modal-close')) {
        document.getElementById('guideModal').classList.remove('open');
    }
}

function aplicarFiltroPresupuesto(nivel, botonElement) {
    estadoFiltros.presupuesto = nivel;
    document.querySelectorAll('.budget-pill').forEach(btn => btn.classList.remove('active'));
    if (botonElement) botonElement.classList.add('active');
    renderizarAgencias();
}

function copiarCupon(codigo) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(codigo).then(() => {
            alert(`✅ Código "${codigo}" copiado.\nSe incluirá automáticamente al enviar tu cotización por WhatsApp.`);
        });
    }
}

function abrirConciergeWhatsApp() {
    const b2b = PLATAFORMA_CONFIG.comercialB2B || {};
    const num = normalizarTelefonoWa(b2b.whatsappAdmin || PLATAFORMA_CONFIG.whatsappConcierge);
    const msg = 'Hola, vengo de *Directorio Viajero* y me gustaría que me recomienden opciones según lo que busco.';
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
}

// Calculadora de Presupuesto
let modoCalcActual = 'viaje';
let nivelCalcDetectado = '$$';

function abrirCalculadoraPresupuesto() {
    recalcularPresupuesto();
    document.getElementById('calcModal').classList.add('open');
}

function cerrarModalCalc(event) {
    if (!event || event.target.id === 'calcModal' || event.target.classList.contains('modal-close')) {
        document.getElementById('calcModal').classList.remove('open');
    }
}

function cambiarModoCalc(modo) {
    modoCalcActual = modo;
    document.getElementById('tabCalcViaje').classList.toggle('active', modo === 'viaje');
    document.getElementById('tabCalcBoda').classList.toggle('active', modo === 'boda');
    document.getElementById('calcFormViaje').style.display = modo === 'viaje' ? 'block' : 'none';
    document.getElementById('calcFormBoda').style.display = modo === 'boda' ? 'block' : 'none';
    recalcularPresupuesto();
}

function recalcularPresupuesto() {
    const totalEl = document.getElementById('calcTotalMonto');
    const detEl = document.getElementById('calcDetalleMonto');
    if (!totalEl || !detEl) return;

    if (modoCalcActual === 'viaje') {
        const adultos = Math.max(1, parseInt(document.getElementById('calcAdultos').value || '2', 10));
        const noches = Math.max(1, parseInt(document.getElementById('calcNoches').value || '4', 10));
        const [tarifaStr, nivel] = document.getElementById('calcNivelViaje').value.split('|');
        nivelCalcDetectado = nivel;
        const total = adultos * noches * parseInt(tarifaStr, 10);
        totalEl.textContent = `$${total.toLocaleString('es-MX')} MXN`;
        detEl.textContent = `Estimado para ${adultos} adulto(s) durante ${noches} noche(s)`;
    } else {
        const invitados = Math.max(20, parseInt(document.getElementById('calcInvitados').value || '100', 10));
        const [costoInvStr, nivel] = document.getElementById('calcNivelBoda').value.split('|');
        nivelCalcDetectado = nivel;
        const total = invitados * parseInt(costoInvStr, 10);
        totalEl.textContent = `$${total.toLocaleString('es-MX')} MXN`;
        detEl.textContent = `Estimado integral para ${invitados} invitados`;
    }
}

function filtrarPorResultadoCalc() {
    cerrarModalCalc();
    estadoFiltros.categoria = esModoMultisector() ? (modoCalcActual === 'viaje' ? 'viajes' : 'bodas') : 'viajes';
    estadoFiltros.presupuesto = nivelCalcDetectado;

    document.querySelectorAll('.budget-pill').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().startsWith(nivelCalcDetectado + ' '));
    });

    renderizarOfertas();
    renderizarAgencias();
    const target = document.getElementById('sec-agencias');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
}

function contactarVentasB2B() {
    const b2b = PLATAFORMA_CONFIG.comercialB2B || {};
    const num = normalizarTelefonoWa(b2b.whatsappAdmin || PLATAFORMA_CONFIG.whatsappConcierge);
    const msg = 'Hola, vi *Directorio Viajero* y me interesa conocer los beneficios y planes para anunciar mi negocio en la plataforma.';
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
}