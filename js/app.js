let estadoFiltros = {
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

// Registro de eventos de conversion hacia Google Analytics (si esta configurado)
function registrarEventoClic(nombreAgencia, canal) {
    if (typeof window.gtag === 'function') {
        window.gtag('event', 'clic_agencia', {
            agencia_nombre: nombreAgencia,
            canal_contacto: canal
        });
    }
}

function inicializarApariencia() {
    const paletasValidas = ['caribe', 'coral', 'esmeralda'];
    const temasValidos = ['light', 'dark'];

    const paletaGuardada = localStorage.getItem('dv_paleta');
    const temaGuardado = localStorage.getItem('dv_tema');

    const paleta = paletasValidas.includes(paletaGuardada) ? paletaGuardada : 'caribe';
    const tema = temasValidos.includes(temaGuardado) ? temaGuardado : 'light';

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
        ? `Hola ${nombreDestino}, vi su oferta "${asuntoExtra}" en Directorio Viajero y me gustaría información.`
        : `Hola ${nombreDestino}, encontré su agencia en Directorio Viajero y me gustaría cotizar un viaje.`;
    return `https://wa.me/${soloDigitos}?text=${encodeURIComponent(texto)}`;
}

function renderizarOfertas() {
    const grid = document.getElementById('dealsGrid');
    if (!grid || typeof OFERTAS_TEMPORADA === 'undefined') return;
    grid.innerHTML = '';

    OFERTAS_TEMPORADA.forEach(oferta => {
        const card = document.createElement('article');
        card.className = 'deal-card';

        const imgSegura = validarUrlSegura(oferta.imagen);
        const waUrl = generarUrlWhatsApp(oferta.agencia, oferta.whatsappNumero, oferta.titulo);
        const webSegura = validarUrlSegura(oferta.web);
        const destinoUrl = waUrl || webSegura || 'pages/anunciate.html';
        const textoBoton = waUrl ? '💬 Cotizar Oferta por WhatsApp' : 'Ver Paquete en Sitio Oficial';

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
                <a href="${escaparHTML(destinoUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-action ${waUrl ? 'btn-whatsapp' : 'btn-primary'} deal-cta">
                    ${textoBoton}
                </a>
            </div>
        `;

        card.querySelector('.deal-cta').addEventListener('click', () => {
            registrarEventoClic(oferta.agencia, 'oferta_temporada');
        });

        grid.appendChild(card);
    });
}

function renderizarAgencias() {
    const grid = document.getElementById('agencyGrid');
    const counter = document.getElementById('resultsCounter');
    if (!grid) return;

    grid.innerHTML = '';

    const ordenadas = [...AGENCIAS_DATA].sort((a, b) => (b.destacada === true) - (a.destacada === true));

    const filtradas = ordenadas.filter(agencia => {
        const cumpleDestino = estadoFiltros.destino === 'todos' || agencia.destinos.includes(estadoFiltros.destino);
        const cumpleOrigen = estadoFiltros.origen === 'todos' || (Array.isArray(agencia.estadosSalida) && agencia.estadosSalida.includes(estadoFiltros.origen));

        const q = estadoFiltros.texto.toLowerCase().trim();
        const cumpleTexto = !q || 
            agencia.nombre.toLowerCase().includes(q) ||
            agencia.descripcion.toLowerCase().includes(q) ||
            agencia.salidaDesde.toLowerCase().includes(q) ||
            (agencia.rnt && agencia.rnt.toLowerCase().includes(q)) ||
            agencia.tags.some(t => t.toLowerCase().includes(q));

        let cumpleRapido = true;
        if (estadoFiltros.rapido === 'destacadas') cumpleRapido = agencia.destacada === true;
        if (estadoFiltros.rapido === 'whatsapp') cumpleRapido = Boolean(agencia.whatsappNumero);
        if (estadoFiltros.rapido === 'rnt') cumpleRapido = Boolean(agencia.rnt);
        if (estadoFiltros.rapido === 'favoritas') cumpleRapido = favoritos.includes(agencia.id);

        return cumpleDestino && cumpleOrigen && cumpleTexto && cumpleRapido;
    });

    if (counter) {
        counter.textContent = `Mostrando ${filtradas.length} de ${AGENCIAS_DATA.length} agencias`;
    }

    if (filtradas.length === 0) {
        const emptyBox = document.createElement('div');
        emptyBox.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 3rem 1rem; background: var(--bg-card); border-radius: 1rem; border: 1px solid var(--border);';
        emptyBox.innerHTML = `
            <p style="color: var(--secondary); font-weight: 700; margin-bottom: 0.5rem;">No encontramos agencias con esa combinación de filtros</p>
            <p style="color: var(--text-soft); font-size: 0.9rem; margin-bottom: 1rem;">Prueba seleccionando "Cualquier salida" o limpia los filtros activos.</p>
            <button type="button" onclick="reiniciarFiltros()" class="btn-action btn-primary" style="display: inline-block; width: auto; padding: 0.6rem 1.25rem;">Ver todas las agencias</button>
        `;
        grid.appendChild(emptyBox);
        return;
    }

    filtradas.forEach(agencia => {
        const card = document.createElement('article');
        card.className = `agency-card ${agencia.destacada ? 'featured' : ''}`;

        const esFav = favoritos.includes(agencia.id);
        const badgeHtml = agencia.destacada ? '<span class="badge-featured">⭐ Destacada</span>' : '';
        const rntHtml = agencia.rnt ? `<span class="rnt-badge" title="Folio Registro Nacional de Turismo: ${escaparHTML(agencia.rnt)}">🛡️ RNT</span>` : '';
        const tagsHtml = agencia.tags.map(tag => `<span class="tag">${escaparHTML(tag)}</span>`).join('');
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
    document.getElementById('agencias').scrollIntoView({ behavior: 'smooth' });
}

function seleccionarDestinoCard(destino) {
    const selectDestino = document.getElementById('destinoSelect');
    if (selectDestino) selectDestino.value = destino;
    estadoFiltros.destino = destino;
    renderizarAgencias();
    document.getElementById('agencias').scrollIntoView({ behavior: 'smooth' });
}

function aplicarFiltroRapido(tipo, botonElement) {
    estadoFiltros.rapido = tipo;
    document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
    if (botonElement) botonElement.classList.add('active');
    renderizarAgencias();
}

function reiniciarFiltros() {
    estadoFiltros = { destino: 'todos', origen: 'todos', texto: '', rapido: 'todas' };
    const input = document.getElementById('searchInput');
    const selectDestino = document.getElementById('destinoSelect');
    const selectOrigen = document.getElementById('origenSelect');
    if (input) input.value = '';
    if (selectDestino) selectDestino.value = 'todos';
    if (selectOrigen) selectOrigen.value = 'todos';
    document.querySelectorAll('.pill-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx === 0);
    });
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

    const rntDetalle = agencia.rnt ? `Folio ${escaparHTML(agencia.rnt)}` : 'En trámite / No declarado';

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
            <div><span>Salidas desde</span><strong>${escaparHTML(agencia.salidaDesde)}</strong></div>
            <div><span>Rango orientativo</span><strong>${escaparHTML(agencia.rangoPrecio)}</strong></div>
            <div><span>Registro Nacional (RNT)</span><strong>${rntDetalle}</strong></div>
            <div><span>Especialidad</span><strong>${escaparHTML(agencia.especialidad)}</strong></div>
        </div>
        <div class="tags">${agencia.tags.map(t => `<span class="tag">${escaparHTML(t)}</span>`).join('')}</div>
        <div class="card-actions">${accionesModal}</div>
        <p style="font-size: 0.75rem; color: var(--text-soft); margin-top: 1rem; text-align: center;">
            Contacto directo con la agencia sin cargos extra ni intermediarios.
        </p>
    `;

    modal.classList.add('open');
}

function cerrarModalAgencia(event) {
    if (!event || event.target.id === 'agencyModal' || event.target.classList.contains('modal-close')) {
        document.getElementById('agencyModal').classList.remove('open');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarApariencia();
    renderizarOfertas();
    renderizarAgencias();
    const input = document.getElementById('searchInput');
    if (input) {
        input.addEventListener('input', (e) => {
            estadoFiltros.texto = e.target.value.slice(0, 80);
            renderizarAgencias();
        });
    }
});
