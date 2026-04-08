// --- ESTADO GLOBAL ---
let scholarships = [];
let closedScholarships = [];
let currentUser = null;
let userApplications = [];
let currentSharedBeca = null;
let allUsers = JSON.parse(localStorage.getItem('scholarship_db_users')) || [];

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadScholarships();
    checkAuth();
    setupEventListeners();
    initModalsSafety();
});

function initModalsSafety() {
    if (!document.getElementById('auth-modal')) console.warn('⚠️ Falta #auth-modal');
    if (!document.getElementById('detail-modal')) console.warn('⚠️ Falta #detail-modal');
}

// --- CARGA DE DATOS (CON LÓGICA DE CERRADAS) ---
async function loadScholarships() {
    try {
        const response = await fetch('./data/becas.json');
        if (!response.ok) throw new Error('Error HTTP');
        
        let allData = await response.json();
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Separar Activas vs Cerradas
        scholarships = allData.filter(b => b.deadline >= todayStr);
        closedScholarships = allData.filter(b => b.deadline < todayStr);

        // 2. Ordenar activas por urgencia
        scholarships.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        
        // 3. Renderizar todo (Activas + Separador + Cerradas)
        renderAllScholarships();
        updateStats();

    } catch (error) {
        console.error('Error cargando becas:', error);
        const container = document.getElementById('catalogo');
        if(container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger); margin-bottom: 15px;"></i>
                    <h3>Error al cargar los datos</h3>
                    <p>Revisa tu conexión o el archivo becas.json.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Recargar</button>
                </div>`;
        }
    }
}

// --- RENDERIZADO COMBINADO ---
function renderAllScholarships() {
    const container = document.getElementById('catalogo');
    const countDisplay = document.getElementById('count-display');
    
    if (!container) return;
    container.innerHTML = '';

    // Contador solo de activas (o total si prefieres)
    if(countDisplay) countDisplay.textContent = scholarships.length + closedScholarships.length;

    // 1. Renderizar ACTIVAS
    if (scholarships.length > 0) {
        scholarships.forEach(beca => createCard(beca, container, false));
    } else {
        container.innerHTML += `<div style="grid-column:1/-1; text-align:center; padding:20px; color:#666;">No hay becas activas en este momento.</div>`;
    }

    // 2. Renderizar SEPARADOR y CERRADAS (Si existen)
    if (closedScholarships.length > 0) {
        const separator = document.createElement('div');
        separator.style.gridColumn = "1 / -1";
        separator.style.margin = "40px 0 20px 0";
        separator.style.padding = "20px";
        separator.style.background = "#f1f5f9";
        separator.style.borderRadius = "8px";
        separator.style.textAlign = "center";
        separator.innerHTML = `
            <h3 style="color: #64748b; margin-bottom: 5px;"><i class="fas fa-history"></i> Convocatorias Cerradas (Referencia)</h3>
            <p style="font-size: 0.9rem; color: #94a3b8;">Úsalas para preparar tus documentos. ¡Suelen abrirse en las mismas fechas el próximo año!</p>
        `;
        container.appendChild(separator);

        closedScholarships.forEach(beca => createCard(beca, container, true));
    }
}

// Función auxiliar para crear tarjetas (Soporta modo "Cerrada")
function createCard(beca, container, isClosed) {
    const isSaved = currentUser && userApplications.some(a => a.id === beca.id);
    const card = document.createElement('div');
    card.className = 'beca-card';
    
    // Estilos visuales para cerradas
    if (isClosed) {
        card.style.opacity = "0.7";
        card.style.filter = "grayscale(80%)";
        card.style.pointerEvents = "auto"; // Permitir click para ver detalles si quieres
    }

    const niveles = beca.nivel ? beca.nivel.slice(0, 2) : [];
    const deadlineLabel = isClosed ? "CERRADA" : beca.deadline;
    const deadlineColor = isClosed ? "#94a3b8" : "var(--danger)";
    
    // Botón de guardar deshabilitado si está cerrada
    const saveButton = isClosed 
        ? `<button class="btn btn-secondary btn-sm" disabled style="cursor:not-allowed; opacity:0.6;">Cerrada</button>`
        : (currentUser 
            ? `<button class="btn ${isSaved ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="addToTracker('${beca.id}')">
                 ${isSaved ? '<i class="fas fa-check"></i> Guardado' : 'Guardar'}
               </button>`
            : `<button class="btn btn-secondary btn-sm" onclick="toggleAuthModal()">Guardar</button>`
          );

    card.innerHTML = `
        <div class="card-body">
            <span class="tag" style="background:${isClosed ? '#e2e8f0' : '#e0f2fe'}; color:${isClosed ? '#64748b' : '#0369a1'};">
                ${beca.financiamiento}
            </span>
            ${isClosed ? '<span class="tag" style="background:#ef4444; color:white;">Cerrada</span>' : ''}
            
            <h3 style="margin: 10px 0; font-size: 1.2rem;">${beca.titulo}</h3>
            <p style="color: var(--primary); font-weight: bold;">${beca.institucion}</p>
            <p style="font-size: 0.9rem; color: #666;"><i class="fas fa-map-marker-alt"></i> ${beca.pais}</p>
            
            <div class="card-tags" style="margin-top: 10px;">
                ${niveles.map(n => `<span class="tag">${n}</span>`).join('')}
            </div>
            
            <p style="margin-top: 15px; font-size: 0.85rem; color: ${deadlineColor}; font-weight: bold;">
                <i class="far fa-clock"></i> Deadline: ${deadlineLabel}
            </p>
        </div>
        
        <div class="card-footer">
            <a href="${beca.url_convocatoria}" target="_blank" class="btn btn-outline btn-sm">Ver Web</a>
            ${saveButton}
        </div>
    `;
    container.appendChild(card);
}

// --- AUTENTICACIÓN ---
function checkAuth() {
    const storedUser = localStorage.getItem('scholarship_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        userApplications = JSON.parse(localStorage.getItem(`apps_${currentUser.email}`)) || [];
        updateNav(true);
    } else {
        updateNav(false);
    }
}

function updateNav(isLoggedIn) {
    const container = document.getElementById('auth-buttons');
    const nameDisplay = document.getElementById('userNameDisplay');
    if (!container) return;

    if (isLoggedIn) {
        container.innerHTML = `
            <a href="#" onclick="navigate('dashboard-section')" style="color:var(--primary); font-weight:bold; margin-right:10px;">Mi Panel</a>
            <span style="margin-right:10px; font-size:0.9rem;">Hola, ${currentUser.name.split(' ')[0]}</span>
            <button class="btn btn-outline btn-sm" onclick="logout()">Salir</button>
        `;
        if(nameDisplay) nameDisplay.textContent = currentUser.name.split(' ')[0];
    } else {
        container.innerHTML = `<button class="btn btn-primary btn-sm" onclick="toggleAuthModal()">Login / Registro</button>`;
    }
}

function logout() {
    localStorage.removeItem('scholarship_user');
    currentUser = null;
    userApplications = [];
    location.reload();
}

// --- NAVEGACIÓN ---
window.navigate = (viewId) => {
    const sections = document.querySelectorAll('.view-section');
    const navLinks = document.getElementById('nav-links');
    
    sections.forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(viewId);
    if(target) target.classList.remove('hidden');
    
    if(navLinks) navLinks.classList.remove('active');
    
    if (viewId === 'dashboard-section') loadDashboard();
    window.scrollTo(0, 0);
};

window.toggleMenu = () => {
    const nav = document.getElementById('nav-links');
    if(nav) nav.classList.toggle('active');
};

// --- FILTROS (ACTUALIZADOS PARA BUSCAR EN AMBAS LISTAS SI ES NECESARIO) ---
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.addEventListener('input', applyFilters);
    
    const ids = ['filterLevel', 'filterType', 'filterArea', 'filterCountry', 'filterSort'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', applyFilters);
    });
}

function applyFilters() {
    const term = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const type = document.getElementById('filterType')?.value || 'all';
    const level = document.getElementById('filterLevel')?.value || 'all';
    const area = document.getElementById('filterArea')?.value || 'all';
    const country = document.getElementById('filterCountry')?.value || 'all';
    const sort = document.getElementById('filterSort')?.value || 'default';

    // Filtramos sobre la lista combinada para la búsqueda, pero mantenemos la lógica de orden
    // Para simplificar, filtramos activas y cerradas por separado y las volvemos a unir
    let filteredActive = scholarships.filter(b => matchFilters(b, term, type, level, area, country));
    let filteredClosed = closedScholarships.filter(b => matchFilters(b, term, type, level, area, country));

    if (sort === 'deadline') {
        filteredActive.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sort === 'alpha') {
        filteredActive.sort((a, b) => a.titulo.localeCompare(b.titulo));
        filteredClosed.sort((a, b) => a.titulo.localeCompare(b.titulo));
    }

    // Re-renderizar manualmente con los filtros aplicados
    const container = document.getElementById('catalogo');
    const countDisplay = document.getElementById('count-display');
    if (!container) return;
    container.innerHTML = '';
    if(countDisplay) countDisplay.textContent = filteredActive.length + filteredClosed.length;

    if (filteredActive.length > 0) {
        filteredActive.forEach(b => createCard(b, container, false));
    } else if (filteredClosed.length === 0) {
         container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;"><h3>No hay resultados</h3></div>`;
         return;
    }

    if (filteredClosed.length > 0) {
        // Re-agregar separador
        const separator = document.createElement('div');
        separator.style.gridColumn = "1 / -1";
        separator.style.margin = "40px 0 20px 0";
        separator.style.padding = "20px";
        separator.style.background = "#f1f5f9";
        separator.style.borderRadius = "8px";
        separator.style.textAlign = "center";
        separator.innerHTML = `<h4 style="color:#64748b;">Convocatorias Cerradas Coincidentes</h4>`;
        container.appendChild(separator);
        
        filteredClosed.forEach(b => createCard(b, container, true));
    }
}

function matchFilters(beca, term, type, level, area, country) {
    const becaType = beca.tipo || 'Beca';
    const matchText = beca.titulo.toLowerCase().includes(term) || 
                      beca.institucion.toLowerCase().includes(term) ||
                      beca.pais.toLowerCase().includes(term);
    const matchType = type === 'all' || becaType === type;
    const matchLevel = level === 'all' || (beca.nivel && beca.nivel.includes(level));
    const matchArea = area === 'all' || (beca.area && (beca.area.includes(area) || beca.area.some(a => a.includes(area))));
    const matchCountry = country === 'all' || beca.pais === country || (country === 'Europa' && beca.pais.includes('Europa'));
    
    return matchText && matchType && matchLevel && matchArea && matchCountry;
}

function updateStats() {
    const elBecas = document.getElementById('stat-becas');
    const elPaises = document.getElementById('stat-paises');
    const elUnis = document.getElementById('stat-unis');
    if(elBecas) elBecas.textContent = scholarships.length;
    if(elPaises) elPaises.textContent = new Set(scholarships.map(s => s.pais)).size;
    if(elUnis) elUnis.textContent = new Set(scholarships.map(s => s.institucion)).size;
}

// --- TRACKER & DASHBOARD (Mismo código funcional que tenías) ---
function addToTracker(id) {
    if (!currentUser) return toggleAuthModal();
    const beca = scholarships.find(s => s.id === id);
    if (!beca) return;
    if (userApplications.some(a => a.id === id)) { alert('Ya guardada'); return; }
    
    const newApp = { ...beca, status: 'Interesado', documents: { cv: false, carta: false, recomendaciones: false, idiomas: false }, notes: '' };
    userApplications.push(newApp);
    localStorage.setItem(`apps_${currentUser.email}`, JSON.stringify(userApplications));
    alert('¡Beca guardada!');
    renderAllScholarships(); // Refrescar para mostrar "Guardado"
}

function loadDashboard() {
    if (!currentUser) return;
    const dashTotal = document.getElementById('dash-total');
    const dashDocs = document.getElementById('dash-docs');
    if(dashTotal) dashTotal.textContent = userApplications.length;
    if(dashDocs) {
        const total = userApplications.length * 4;
        const done = userApplications.reduce((acc, app) => acc + Object.values(app.documents).filter(Boolean).length, 0);
        dashDocs.textContent = total === 0 ? "0%" : `${Math.round((done/total)*100)}%`;
    }
    renderTracker();
    renderChart();
}

function renderTracker() {
    const container = document.getElementById('tracker-list');
    if(!container) return;
    container.innerHTML = '';
    if(userApplications.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:20px;">Sin becas guardadas.</p>';
        return;
    }
    userApplications.forEach(app => {
        const done = Object.values(app.documents).filter(Boolean).length;
        const item = document.createElement('div');
        item.className = 'tracker-item';
        item.innerHTML = `
            <h4>${app.titulo}</h4>
            <p style="font-size:0.85rem; color:#666;">${app.institucion}</p>
            <div class="progress-bar"><div class="progress-fill" style="width:${(done/4)*100}%"></div></div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin:10px 0; font-size:0.8rem;">
                ${Object.entries(app.documents).map(([k,v]) => `<label><input type="checkbox" ${v?'checked':''} onchange="toggleDoc('${app.id}','${k}')"> ${k.toUpperCase()}</label>`).join('')}
            </div>
            <div style="display:flex; gap:5px; margin-top:10px;">
                <button class="btn btn-outline btn-sm" style="flex:1" onclick="openLetterGenerator('${app.id}')">Carta</button>
                <select onchange="updateStatus('${app.id}', this.value)" style="font-size:0.8rem;">
                    <option value="Interesado" ${app.status==='Interesado'?'selected':''}>Interesado</option>
                    <option value="En Proceso" ${app.status==='En Proceso'?'selected':''}>Proceso</option>
                    <option value="Enviada" ${app.status==='Enviada'?'selected':''}>Enviada</option>
                    <option value="Aceptada" ${app.status==='Aceptada'?'selected':''}>Aceptada</option>
                </select>
            </div>
        `;
        container.appendChild(item);
    });
}

function toggleDoc(id, key) {
    const app = userApplications.find(a => a.id === id);
    if(app) { app.documents[key] = !app.documents[key]; localStorage.setItem(`apps_${currentUser.email}`, JSON.stringify(userApplications)); loadDashboard(); }
}
function updateStatus(id, status) {
    const app = userApplications.find(a => a.id === id);
    if(app) { app.status = status; localStorage.setItem(`apps_${currentUser.email}`, JSON.stringify(userApplications)); }
}

function renderChart() {
    const ctx = document.getElementById('statusChart');
    if(!ctx || typeof Chart === 'undefined') return;
    const counts = { 'Interesado':0, 'En Proceso':0, 'Enviada':0, 'Aceptada':0 };
    userApplications.forEach(a => { if(counts[a.status]!==undefined) counts[a.status]++; });
    if(window.myChart) window.myChart.destroy();
    const labels = Object.keys(counts).filter(k=>counts[k]>0);
    window.myChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: labels.map(k=>counts[k]), backgroundColor: ['#94a3b8','#3b82f6','#10b981','#22c55e'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// --- MODALES ---
window.toggleAuthModal = () => { const m = document.getElementById('auth-modal'); if(m) m.classList.toggle('hidden'); };
window.toggleAuthMode = () => {
    const l = document.getElementById('loginForm'), r = document.getElementById('registerForm'), t = document.getElementById('auth-title');
    if(l&&r&&t) {
        if(l.classList.contains('hidden')) { l.classList.remove('hidden'); r.classList.add('hidden'); t.textContent="Iniciar Sesión"; }
        else { l.classList.add('hidden'); r.classList.remove('hidden'); t.textContent="Crear Cuenta"; }
    }
};

const loginFormEl = document.getElementById('loginForm');
if(loginFormEl) loginFormEl.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    const user = allUsers.find(u => u.email === email && u.pass === pass);
    if(user) { localStorage.setItem('scholarship_user', JSON.stringify(user)); checkAuth(); toggleAuthModal(); navigate('home'); }
    else alert('Credenciales incorrectas');
});

const regFormEl = document.getElementById('registerForm');
if(regFormEl) regFormEl.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    if(allUsers.some(u => u.email === email)) { alert('Email ya registrado'); return; }
    const newUser = {name, email, pass};
    allUsers.push(newUser);
    localStorage.setItem('scholarship_db_users', JSON.stringify(allUsers));
    localStorage.setItem(`apps_${email}`, JSON.stringify([]));
    alert('Registro exitoso. Inicia sesión.');
    toggleAuthMode();
});

window.openDetailModal = (beca) => {
    currentSharedBeca = beca;
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');
    if(!modal||!content) return;
    content.innerHTML = `<h2 style="color:var(--primary)">${beca.titulo}</h2><h3>${beca.institucion} 📍 ${beca.pais}</h3><p><strong>Deadline:</strong> ${beca.deadline}</p><p><strong>Nivel:</strong> ${beca.nivel?.join(', ')||'N/A'}</p><a href="${beca.url_convocatoria}" target="_blank" class="btn btn-primary" style="display:block;text-align:center;margin-top:20px;">Ir a la Web</a>`;
    modal.classList.remove('hidden');
};
window.closeDetailModal = () => { const m = document.getElementById('detail-modal'); if(m) m.classList.add('hidden'); };
window.shareWhatsApp = () => { if(!currentSharedBeca) return; window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(currentSharedBeca.titulo + ': ' + window.location.href)}`); };
window.copyLink = () => { navigator.clipboard.writeText(window.location.href); alert('Copiado'); };

window.openLetterGenerator = (id) => {
    const app = userApplications.find(a => a.id === id);
    if(!app) return;
    const modal = document.getElementById('letterModal');
    const title = document.getElementById('letterTitle');
    const txt = document.getElementById('letterContent');
    if(modal&&title&&txt) {
        title.textContent = `Carta: ${app.titulo}`;
        txt.value = `Estimado Comité,\n\nExpreso mi interés en ${app.titulo} en ${app.institucion}.\n\n[Motivación]\n\nAtentamente,\n${currentUser.name}`;
        modal.classList.remove('hidden');
    }
};
window.closeLetterModal = () => { const m = document.getElementById('letterModal'); if(m) m.classList.add('hidden'); };
window.copyLetter = () => { const t = document.getElementById('letterContent'); if(t){ t.select(); document.execCommand('copy'); alert('Copiado'); } };
