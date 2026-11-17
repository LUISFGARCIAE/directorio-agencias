let estadoFiltros = {
    destino: 'todos',
    texto: '',
    rapido: 'todas'
};

let favoritos = JSON.parse(localStorage.getItem('dv_favoritos') || '[]');

// Aplicar preferencias visuales guardadas
function inicializarApariencia() {
    const paletaGuardada = localStorage.getItem('dv_paleta') || 'caribe';
    const temaGuardado = localStorage.getItem('dv_tema') || 'light';
    document.documentElement.setAttribute('data-palette', paletaGuardada);
    document.documentElement.setAttribute('data-theme', temaGuardado);
    actualizarIconoTema(temaGuardado);
}

function cambiarPaleta(nombrePaleta) {
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
    if (favoritos.includes(id)) {
        favoritos = favoritos.filter(item => item !== id);
    } else {
        favoritos.push(id);
    }
    localStorage.setItem('dv_favoritos', JSON.stringify(favoritos));
    renderizarAgencias();
}

function generarUrlWhatsApp(agencia) {
    if (!agencia.whatsappNumero) return '';
    const texto = `Hola ${agencia.nombre}, encontré su agencia en *Directorio Viajero* y me gustaría cotizar un viaje.`;
    return `https://wa.me/${agencia.whatsappNumero}?text=${encodeURIComponent(texto)}`;
}

function renderizarAgencias() {
    const grid = document.getElementById('agencyGrid');
    const counter = document.getElementById('resultsCounter');
    if (!grid) return;

    grid.innerHTML = '';

    const ordenadas = [...AGENCIAS_DATA].sort((a, b) => (b.destacada === true) - (a.destacada === true));

    const filtradas = ordenadas.filter(agencia => {
        const cumpleDestino = estadoFiltros.destino === 'todos' || agencia.destinos.includes(estadoFiltros.destino);
        
        const q = estadoFiltros.texto.toLowerCase().trim();
        const cumpleTexto = !q || 
            agencia.nombre.toLowerCase().includes(q) ||
            agencia.descripcion.toLowerCase().includes(q) ||
            agencia.salidaDesde.toLowerCase().includes(q) ||
            agencia.tags.some(t => t.toLowerCase().includes(q));

        let cumpleRapido = true;
        if (estadoFiltros.rapido === 'destacadas') cumpleRapido = agencia.destacada === true;
        if (estadoFiltros.rapido === 'whatsapp') cumpleRapido = Boolean(agencia.whatsappNumero);
        if (estadoFiltros.rapido === 'favoritas') cumpleRapido = favoritos.includes(agencia.id);

        return cumpleDestino && cumpleTexto && cumpleRapido;
    });

    if (counter) {
        counter.textContent = `Mostrando ${filtradas.length} de ${AGENCIAS_DATA.length} agencias`;
    }

    if (filtradas.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; background: var(--bg-card); border-radius: 1rem; border: 1px solid var(--border);">
                <p style="color: var(--secondary); font-weight: 700; margin-bottom: 0.5rem;">No encontramos agencias con estos filtros</p>
                <p style="color: var(--text-soft); font-size: 0.9rem; margin-bottom: 1rem;">Prueba cambiando el destino o limpia los filtros activos.</p>
                <button onclick="reiniciarFiltros()" class="btn-action btn-primary" style="display: inline-block; width: auto; padding: 0.6rem 1.25rem;">Ver todas las agencias</button>
            </div>`;
        return;
    }

    filtradas.forEach(agencia => {
        const card = document.createElement('article');
        card.className = `agency-card ${agencia.destacada ? 'featured' : ''}`;

        const esFav = favoritos.includes(agencia.id);
        const badgeHtml = agencia.destacada ? '<span class="badge-featured">⭐ Destacada</span>' : '';
        const tagsHtml = agencia.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        const waUrl = generarUrlWhatsApp(agencia);

        let botonesHtml = '';
        if (agencia.web) {
            botonesHtml += `<a href="${agencia.web}" target="_blank" rel="noopener noreferrer" class="btn-action btn-primary">${waUrl ? 'Sitio Web' : 'Visitar Web'}</a>`;
        }
        if (waUrl) {
            botonesHtml += `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-action btn-whatsapp">${agencia.web ? 'WhatsApp' : 'Cotizar WhatsApp'}</a>`;
        }
        botonesHtml += `<button type="button" onclick="abrirModalAgencia('${agencia.id}')" class="btn-action btn-outline" title="Ver detalles">+ Info</button>`;

        card.innerHTML = `
            ${badgeHtml}
            <div>
                <div class="agency-header">
                    <div class="agency-logo" style="color: ${agencia.colorTexto}; background: ${agencia.colorFondo};">${agencia.iniciales}</div>
                    <div>
                        <h3 class="agency-title">${agencia.nombre}</h3>
                        <span class="verified-tag">${agencia.etiquetaEstado}</span>
                    </div>
                    <button type="button" onclick="toggleFavorito('${agencia.id}')" class="fav-btn ${esFav ? 'saved' : ''}" title="Guardar en favoritos">
                        ${esFav ? '❤️' : '🤍'}
                    </button>
                </div>
                <div class="agency-meta">
                    <span>📍 ${agencia.salidaDesde}</span>
                    <span>⭐ ${agencia.rating}</span>
                </div>
                <p class="agency-desc">${agencia.descripcion}</p>
                <div class="tags">${tagsHtml}</div>
            </div>
            <div class="card-actions">${botonesHtml}</div>
        `;

        grid.appendChild(card);
    });
}

function ejecutarBusqueda() {
    const input = document.getElementById('searchInput');
    const select = document.getElementById('destinoSelect');
    estadoFiltros.texto = input ? input.value : '';
    estadoFiltros.destino = select ? select.value : 'todos';
    renderizarAgencias();
    document.getElementById('agencias').scrollIntoView({ behavior: 'smooth' });
}

function seleccionarDestinoCard(destino) {
    const select = document.getElementById('destinoSelect');
    if (select) select.value = destino;
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
    estadoFiltros = { destino: 'todos', texto: '', rapido: 'todas' };
    const input = document.getElementById('searchInput');
    const select = document.getElementById('destinoSelect');
    if (input) input.value = '';
    if (select) select.value = 'todos';
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
    const waUrl = generarUrlWhatsApp(agencia);

    let accionesModal = '';
    if (agencia.web) {
        accionesModal += `<a href="${agencia.web}" target="_blank" rel="noopener noreferrer" class="btn-action btn-primary">Ir al Sitio Web Oficial</a>`;
    }
    if (waUrl) {
        accionesModal += `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-action btn-whatsapp">Cotizar por WhatsApp</a>`;
    }

    body.innerHTML = `
        <div class="agency-header">
            <div class="agency-logo" style="color: ${agencia.colorTexto}; background: ${agencia.colorFondo};">${agencia.iniciales}</div>
            <div>
                <h3 style="font-size: 1.35rem; color: var(--secondary);">${agencia.nombre}</h3>
                <span class="verified-tag">${agencia.etiquetaEstado} • ⭐ ${agencia.rating}</span>
            </div>
        </div>
        <p style="color: var(--text-main); font-size: 0.95rem; margin-top: 0.75rem;">${agencia.descripcion}</p>
        <div class="modal-details-grid">
            <div><span>Salidas desde</span><strong>${agencia.salidaDesde}</strong></div>
            <div><span>Rango orientativo</span><strong>${agencia.rangoPrecio}</strong></div>
            <div style="grid-column: 1/-1;"><span>Especialidad</span><strong>${agencia.especialidad}</strong></div>
        </div>
        <div class="tags">${agencia.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
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
    renderizarAgencias();
    const input = document.getElementById('searchInput');
    if (input) {
        input.addEventListener('input', (e) => {
            estadoFiltros.texto = e.target.value;
            renderizarAgencias();
        });
    }
});
