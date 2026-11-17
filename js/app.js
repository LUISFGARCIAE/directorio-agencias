let estadoFiltros = {
    destino: 'todos',
    texto: '',
    rapido: 'todas' // 'todas' | 'destacadas' | 'whatsapp'
};

function generarUrlWhatsApp(agencia) {
    if (!agencia.whatsappNumero) return '';
    const texto = `Hola ${agencia.nombre}, encontré su agencia en *Directorio Viajero* y me gustaría solicitar información para un viaje.`;
    return `https://wa.me/${agencia.whatsappNumero}?text=${encodeURIComponent(texto)}`;
}

function renderizarAgencias() {
    const grid = document.getElementById('agencyGrid');
    const counter = document.getElementById('resultsCounter');
    if (!grid) return;

    grid.innerHTML = '';

    // Siempre priorizar agencias destacadas
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

        return cumpleDestino && cumpleTexto && cumpleRapido;
    });

    if (counter) {
        counter.textContent = `Mostrando ${filtradas.length} de ${AGENCIAS_DATA.length} agencias`;
    }

    if (filtradas.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; background: white; border-radius: 1rem; border: 1px solid #e2e8f0;">
                <p style="color: #475569; font-weight: 700; margin-bottom: 0.5rem;">No encontramos agencias con esos filtros</p>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1rem;">Intenta con otro destino o limpia tu búsqueda.</p>
                <button onclick="reiniciarFiltros()" class="btn-action btn-primary" style="display: inline-block; width: auto; padding: 0.6rem 1.25rem;">Mostrar todas las agencias</button>
            </div>`;
        return;
    }

    filtradas.forEach(agencia => {
        const card = document.createElement('article');
        card.className = `agency-card ${agencia.destacada ? 'featured' : ''}`;

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
        botonesHtml += `<button type="button" onclick="abrirModalAgencia('${agencia.id}')" class="btn-action btn-outline" title="Ver ficha completa">+ Info</button>`;

        card.innerHTML = `
            ${badgeHtml}
            <div>
                <div class="agency-header">
                    <div class="agency-logo" style="color: ${agencia.colorTexto}; background: ${agencia.colorFondo};">${agencia.iniciales}</div>
                    <div>
                        <h3 class="agency-title">${agencia.nombre}</h3>
                        <span class="verified-tag">${agencia.etiquetaEstado}</span>
                    </div>
                </div>
                <div class="agency-meta">
                    <span>📍 ${agencia.salidaDesde}</span>
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
        accionesModal += `<a href="${agencia.web}" target="_blank" rel="noopener noreferrer" class="btn-action btn-primary">Ir a su Sitio Web Oficial</a>`;
    }
    if (waUrl) {
        accionesModal += `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-action btn-whatsapp">Cotizar por WhatsApp</a>`;
    }

    body.innerHTML = `
        <div class="agency-header">
            <div class="agency-logo" style="color: ${agencia.colorTexto}; background: ${agencia.colorFondo};">${agencia.iniciales}</div>
            <div>
                <h3 style="font-size: 1.35rem; color: var(--secondary);">${agencia.nombre}</h3>
                <span class="verified-tag">${agencia.etiquetaEstado}</span>
            </div>
        </div>
        <p style="color: var(--text-dark); font-size: 0.95rem; margin-top: 0.75rem;">${agencia.descripcion}</p>
        <div class="modal-details-grid">
            <div><span>Salidas desde</span><strong>${agencia.salidaDesde}</strong></div>
            <div><span>Rango orientativo</span><strong>${agencia.rangoPrecio}</strong></div>
            <div style="grid-column: 1/-1;"><span>Especialidad</span><strong>${agencia.especialidad}</strong></div>
        </div>
        <div class="tags">${agencia.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
        <div class="card-actions">${accionesModal}</div>
        <p style="font-size: 0.75rem; color: #64748b; margin-top: 1rem; text-align: center;">
            Serás redirigido directamente al canal oficial de la agencia. Directorio Viajero no cobra comisiones.
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
    renderizarAgencias();
    const input = document.getElementById('searchInput');
    if (input) {
        input.addEventListener('input', (e) => {
            estadoFiltros.texto = e.target.value;
            renderizarAgencias();
        });
    }
});
