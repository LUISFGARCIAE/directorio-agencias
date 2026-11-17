function renderizarAgencias(destinoFiltro = 'todos') {
    const grid = document.getElementById('agencyGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const ordenadas = [...AGENCIAS_DATA].sort((a, b) => (b.destacada === true) - (a.destacada === true));

    const filtradas = ordenadas.filter(agencia => 
        destinoFiltro === 'todos' || agencia.destinos.includes(destinoFiltro)
    );

    if (filtradas.length === 0) {
        grid.innerHTML = '<p style="color: #64748b; grid-column: 1/-1; text-align: center; padding: 2rem;">No hay agencias registradas para este destino aún.</p>';
        return;
    }

    filtradas.forEach(agencia => {
        const card = document.createElement('article');
        card.className = `agency-card ${agencia.destacada ? 'featured' : ''}`;

        const badgeHtml = agencia.destacada ? '<span class="badge-featured">⭐ Destacada</span>' : '';
        const tagsHtml = agencia.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

        let botonesHtml = '';
        if (agencia.web) {
            botonesHtml += `<a href="${agencia.web}" target="_blank" rel="noopener noreferrer" class="btn-action btn-primary">${agencia.whatsapp ? 'Sitio Web' : 'Visitar Sitio Web'}</a>`;
        }
        if (agencia.whatsapp) {
            botonesHtml += `<a href="${agencia.whatsapp}" target="_blank" rel="noopener noreferrer" class="btn-action btn-whatsapp">${agencia.web ? 'WhatsApp' : 'Cotizar por WhatsApp'}</a>`;
        }

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
                <p class="agency-desc">${agencia.descripcion}</p>
                <div class="tags">${tagsHtml}</div>
            </div>
            <div class="card-actions">${botonesHtml}</div>
        `;

        grid.appendChild(card);
    });
}

function filtrarPorSelect() {
    const select = document.getElementById('destinoSelect');
    const valor = select.value;
    const texto = select.options[select.selectedIndex].text;
    filtrarAgencias(valor, texto);
}

function filtrarAgencias(destino, nombreDestino) {
    const statusBox = document.getElementById('filterStatus');
    const statusText = document.getElementById('filterText');
    const select = document.getElementById('destinoSelect');

    select.value = destino;
    renderizarAgencias(destino);

    if (destino === 'todos') {
        statusBox.style.display = 'none';
    } else {
        statusBox.style.display = 'inline-flex';
        statusText.textContent = 'Mostrando agencias para: ' + nombreDestino;
        document.getElementById('agencias').scrollIntoView({ behavior: 'smooth' });
    }
}

document.addEventListener('DOMContentLoaded', () => renderizarAgencias('todos'));
