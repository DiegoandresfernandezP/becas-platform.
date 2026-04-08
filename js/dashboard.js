import { getMyApplications, updateApplicationState, toggleChecklist } from './auth.js';

let chartInstance = null;

export function loadDashboardData() {
    const apps = getMyApplications();
    
    if (apps.length === 0) {
        document.getElementById('dashboard-content').innerHTML = `
            <div style="text-align:center; padding: 3rem;">
                <h2>No tienes becas guardadas aún</h2>
                <p>Ve al catálogo público y guarda las que te interesen.</p>
                <button onclick="document.getElementById('public-view').classList.remove('hidden'); document.getElementById('dashboard-view').classList.add('hidden');" class="btn-primary" style="margin-top:1rem;">Ir al Catálogo</button>
            </div>
        `;
        return;
    }

    renderStats(apps);
    renderChart(apps);
    renderKanban(apps);
}

function renderStats(apps) {
    const total = apps.length;
    const enviados = apps.filter(a => a.estado === 'Enviada' || a.estado === 'Entrevista' || a.estado === 'Resultado').length;
    const enProceso = apps.filter(a => a.estado === 'En Proceso').length;
    const aceptadas = apps.filter(a => a.estado === 'Resultado').length; // Simplificado
    
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-proceso').innerText = enProceso;
    document.getElementById('stat-enviadas').innerText = enviados;
}

function renderChart(apps) {
    const ctx = document.getElementById('apps-chart').getContext('2d');
    
    const estados = {
        'Interesado': 0, 'En Proceso': 0, 'Enviada': 0, 'Entrevista': 0, 'Resultado': 0
    };
    
    apps.forEach(a => {
        if (estados[a.estado] !== undefined) estados[a.estado]++;
    });

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(estados),
            datasets: [{
                data: Object.values(estados),
                backgroundColor: ['#9ca3af', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981']
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function renderKanban(apps) {
    const columns = ['Interesado', 'En Proceso', 'Enviada', 'Entrevista', 'Resultado'];
    let html = '<div class="kanban-board">';
    
    columns.forEach(estado => {
        const appsInCol = apps.filter(a => a.estado === estado);
        html += `
            <div class="kanban-column">
                <div class="column-title">${estado} <span>(${appsInCol.length})</span></div>
                ${appsInCol.map(app => createKanbanCard(app)).join('')}
            </div>
        `;
    });
    
    html += '</div>';
    document.getElementById('dashboard-content').innerHTML = html;
    
    // Re-bind events para checkboxes y selects
    bindKanbanEvents();
}

function createKanbanCard(app) {
    const progressPercent = app.progreso || 0;
    return `
        <div class="kanban-item" data-id="${app.id}">
            <strong>${app.titulo}</strong>
            <div style="font-size:0.8rem; color:#666; margin: 5px 0;">Progreso: ${progressPercent}%</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${progressPercent}%"></div></div>
            
            <div style="margin-top:10px; border-top:1px solid #eee; paddingTop:5px;">
                <label class="checklist-item"><input type="checkbox" data-item="cv" ${app.checklist.cv ? 'checked' : ''}> CV</label>
                <label class="checklist-item"><input type="checkbox" data-item="carta" ${app.checklist.carta ? 'checked' : ''}> Carta</label>
                <label class="checklist-item"><input type="checkbox" data-item="recomendaciones" ${app.checklist.recomendaciones ? 'checked' : ''}> Recs</label>
                <label class="checklist-item"><input type="checkbox" data-item="idiomas" ${app.checklist.idiomas ? 'checked' : ''}> Idioma</label>
            </div>
            
            <select class="state-selector" style="margin-top:8px; font-size:0.8rem;" data-id="${app.id}">
                <option value="Interesado" ${app.estado === 'Interesado' ? 'selected' : ''}>Interesado</option>
                <option value="En Proceso" ${app.estado === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
                <option value="Enviada" ${app.estado === 'Enviada' ? 'selected' : ''}>Enviada</option>
                <option value="Entrevista" ${app.estado === 'Entrevista' ? 'selected' : ''}>Entrevista</option>
                <option value="Resultado" ${app.estado === 'Resultado' ? 'selected' : ''}>Resultado</option>
            </select>
        </div>
    `;
}

function bindKanbanEvents() {
    // Cambiar estado
    document.querySelectorAll('.state-selector').forEach(select => {
        select.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            const newEstado = e.target.value;
            updateApplicationState(id, newEstado);
        });
    });
    
    // Toggle Checklist
    document.querySelectorAll('.checklist-item input').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const id = e.target.closest('.kanban-item').getAttribute('data-id');
            const item = e.target.getAttribute('data-item');
            toggleChecklist(id, item);
        });
    });
}