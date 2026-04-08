// --- ESTADO GLOBAL ---
let scholarships = [];
let currentUser = null;
let userApplications = [];
let currentSharedBeca = null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadScholarships();
    checkAuth();
    setupEventListeners();
});

// --- CARGA DE DATOS ---
async function loadScholarships() {
    try {
        const response = await fetch('./data/becas.json');
        if (!response.ok) throw new Error('Error al cargar JSON');
        
        let allScholarships = await response.json();
        
        // Filtrar becas activas (no vencidas)
        const todayStr = new Date().toISOString().split('T')[0];
        scholarships = allScholarships.filter(b => b.deadline >= todayStr);
        
        // Ordenar por defecto (más urgentes)
        scholarships.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        
        renderScholarships(scholarships);
        updateStats();
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('catalogo').innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 15px;"></i>
                <h3>Error al cargar las becas</h3>
                <p>Verifica tu conexión o recarga la página.</p>
                <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 15px;">Recargar</button>
            </div>`;
    }
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
    if (isLoggedIn) {
        container.innerHTML = `
            <a href="#" onclick="navigate('dashboard-section')" style="color:var(--primary); font-weight:bold;">Mi Panel</a>
            <button class="btn btn-outline btn-sm" onclick="logout()" style="margin-left:10px;">Salir</button>
        `;
        document.getElementById('userNameDisplay').textContent = currentUser.name.split(' ')[0];
    } else {
        container.innerHTML = `<button class="btn btn-primary btn-sm" onclick="toggleAuthModal()">Login / Registro</button>`;
    }
}

function logout() {
    localStorage.removeItem('scholarship_user');
    location.reload();
}

// --- NAVEGACIÓN ---
window.navigate = (viewId) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    document.getElementById('nav-links').classList.remove('active');
    
    if (viewId === 'dashboard-section') loadDashboard();
    window.scrollTo(0, 0);
};

window.toggleMenu = () => {
    document.getElementById('nav-links').classList.toggle('active');
};

// --- FILTROS Y BÚSQUEDA (CORREGIDO) ---
function setupEventListeners() {
    // Buscador de texto
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    
    // Selectores
    document.getElementById('filterLevel').addEventListener('change', applyFilters);
    document.getElementById('filterArea').addEventListener('change', applyFilters);
    document.getElementById('filterCountry').addEventListener('change', applyFilters);
    document.getElementById('filterSort').addEventListener('change', applyFilters);
}

function applyFilters() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const type = document.getElementById('filterType').value; // NUEVO
    const level = document.getElementById('filterLevel').value;
    const area = document.getElementById('filterArea').value;
    const country = document.getElementById('filterCountry').value;
    const sort = document.getElementById('filterSort').value;

    let filtered = scholarships.filter(beca => {
        // 1. Búsqueda de texto
        const matchText = beca.titulo.toLowerCase().includes(term) || 
                          beca.institucion.toLowerCase().includes(term) ||
                          beca.pais.toLowerCase().includes(term) ||
                          (beca.tags && beca.tags.some(t => t.toLowerCase().includes(term)));

        // 2. Filtro por TIPO (NUEVO)
        const matchType = type === 'all' || beca.tipo === type;

        // 3. Filtro por Nivel
        const matchLevel = level === 'all' || beca.nivel.includes(level);

        // 4. Filtro por Área
        const matchArea = area === 'all' || beca.area.includes(area) || 
                          (beca.area.some(a => a.includes(area)));

        // 5. Filtro por País
        const matchCountry = country === 'all' || beca.pais === country || 
                             (country === 'Europa' && beca.pais.includes('Europa'));

        return matchText && matchType && matchLevel && matchArea && matchCountry;
    });

    // Ordenamiento
    if (sort === 'deadline') {
        filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sort === 'recent') {
        filtered.reverse();
    }

    renderScholarships(filtered);
}

// --- RENDERIZADO ---
function renderScholarships(data) {
    const container = document.getElementById('catalogo');
    const countDisplay = document.getElementById('count-display');
    
    container.innerHTML = '';
    countDisplay.textContent = data.length;

    if (data.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                <h3>No se encontraron resultados</h3>
                <p>Intenta ajustar los filtros o buscar otro término.</p>
            </div>`;
        return;
    }

    data.forEach(beca => {
        const isSaved = currentUser && userApplications.some(a => a.id === beca.id);
        const card = document.createElement('div');
        card.className = 'beca-card';
        
        card.innerHTML = `
            <div class="card-body">
                <span class="tag" style="background:#e0f2fe; color:#0369a1;">${beca.financiamiento}</span>
                <h3 style="margin: 10px 0; font-size: 1.2rem;">${beca.titulo}</h3>
                <p style="color: var(--primary); font-weight: bold;">${beca.institucion}</p>
                <p style="font-size: 0.9rem; color: #666;"><i class="fas fa-map-marker-alt"></i> ${beca.pais}</p>
                
                <div class="card-tags" style="margin-top: 10px;">
                    ${beca.nivel.slice(0, 2).map(n => `<span class="tag">${n}</span>`).join('')}
                </div>
                
                <p style="margin-top: 15px; font-size: 0.85rem; color: var(--danger); font-weight: bold;">
                    <i class="far fa-clock"></i> Deadline: ${beca.deadline}
                </p>
            </div>
            
            <div class="card-footer">
                <a href="${beca.url_convocatoria}" target="_blank" class="btn btn-outline btn-sm">Ver Web</a>
                ${currentUser ? 
                    `<button class="btn ${isSaved ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="addToTracker('${beca.id}')">
                        ${isSaved ? '<i class="fas fa-check"></i> Guardado' : 'Guardar'}
                     </button>` : 
                    `<button class="btn btn-secondary btn-sm" onclick="toggleAuthModal()">Guardar</button>`
                }
            </div>
        `;
        container.appendChild(card);
    });
}

function updateStats() {
    document.getElementById('stat-becas').textContent = scholarships.length;
    const countries = new Set(scholarships.map(s => s.pais)).size;
    document.getElementById('stat-paises').textContent = countries;
    const unis = new Set(scholarships.map(s => s.institucion)).size;
    document.getElementById('stat-unis').textContent = unis;
}

// --- TRACKER & DASHBOARD ---
function addToTracker(id) {
    if (!currentUser) return toggleAuthModal();
    
    const beca = scholarships.find(s => s.id === id);
    if (userApplications.some(a => a.id === id)) {
        alert('Esta beca ya está en tu tracker.');
        return;
    }

    const newApp = {
        ...beca,
        status: 'Interesado',
        documents: { cv: false, carta: false, recomendaciones: false, idiomas: false },
        notes: ''
    };

    userApplications.push(newApp);
    localStorage.setItem(`apps_${currentUser.email}`, JSON.stringify(userApplications));
    alert('¡Beca guardada en tu tracker!');
    renderScholarships(scholarships); // Actualizar botones
}

function loadDashboard() {
    if (!currentUser) return;
    
    document.getElementById('dash-total').textContent = userApplications.length;
    
    // Calcular % documentos
    const totalDocs = userApplications.length * 4;
    const completedDocs = userApplications.reduce((acc, app) => {
        return acc + Object.values(app.documents).filter(Boolean).length;
    }, 0);
    const percent = totalDocs === 0 ? 0 : Math.round((completedDocs / totalDocs) * 100);
    document.getElementById('dash-docs').textContent = `${percent}%`;

    renderTracker();
    renderChart();
}

function renderTracker() {
    const container = document.getElementById('tracker-list');
    container.innerHTML = '';

    if (userApplications.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#666;">No tienes becas guardadas aún.</p>';
        return;
    }

    userApplications.forEach(app => {
        const done = Object.values(app.documents).filter(Boolean).length;
        const percent = (done / 4) * 100;
        
        const item = document.createElement('div');
        item.className = 'tracker-item';
        item.innerHTML = `
            <h4>${app.titulo}</h4>
            <p style="font-size:0.85rem; color:#666;">${app.institucion}</p>
            <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
            <div class="checklist-grid">
                ${Object.entries(app.documents).map(([key, val]) => `
                    <label style="font-size:0.8rem;">
                        <input type="checkbox" ${val ? 'checked' : ''} onchange="toggleDoc('${app.id}', '${key}')">
                        ${key.charAt(0).toUpperCase() + key.slice(1)}
                    </label>
                `).join('')}
            </div>
            <div style="margin-top:10px; display:flex; gap:5px;">
                <button class="btn btn-outline btn-sm" style="flex:1;" onclick="openLetterGenerator('${app.id}')">Carta</button>
                <select onchange="updateStatus('${app.id}', this.value)" style="font-size:0.8rem; border-radius:4px;">
                    <option value="Interesado" ${app.status === 'Interesado' ? 'selected' : ''}>Interesado</option>
                    <option value="En Proceso" ${app.status === 'En Proceso' ? 'selected' : ''}>Proceso</option>
                    <option value="Enviada" ${app.status === 'Enviada' ? 'selected' : ''}>Enviada</option>
                </select>
            </div>
        `;
        container.appendChild(item);
    });
}

function toggleDoc(id, docKey) {
    const app = userApplications.find(a => a.id === id);
    if (app) {
        app.documents[docKey] = !app.documents[docKey];
        localStorage.setItem(`apps_${currentUser.email}`, JSON.stringify(userApplications));
        loadDashboard();
    }
}

function updateStatus(id, newStatus) {
    const app = userApplications.find(a => a.id === id);
    if (app) {
        app.status = newStatus;
        localStorage.setItem(`apps_${currentUser.email}`, JSON.stringify(userApplications));
    }
}

function renderChart() {
    const ctx = document.getElementById('statusChart').getContext('2d');
    const counts = { 'Interesado': 0, 'En Proceso': 0, 'Enviada': 0 };
    userApplications.forEach(app => { if(counts[app.status] !== undefined) counts[app.status]++; });

    if (window.myChart) window.myChart.destroy();
    
    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#94a3b8', '#3b82f6', '#10b981']
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// --- MODALES Y COMPARTIR ---
window.toggleAuthModal = () => {
    document.getElementById('auth-modal').classList.toggle('hidden');
};

window.toggleAuthMode = () => {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const title = document.getElementById('auth-title');
    
    if (loginForm.classList.contains('hidden')) {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        title.textContent = "Iniciar Sesión";
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        title.textContent = "Crear Cuenta";
    }
};

// Forms
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    const stored = localStorage.getItem('scholarship_user');
    
    if (stored) {
        const user = JSON.parse(stored);
        if (user.email === email && user.pass === pass) {
            checkAuth();
            toggleAuthModal();
            navigate('home');
        } else {
            alert('Credenciales incorrectas');
        }
    } else {
        alert('Usuario no encontrado. Regístrate primero.');
    }
});

document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    
    const user = { name, email, pass };
    localStorage.setItem('scholarship_user', JSON.stringify(user));
    localStorage.setItem(`apps_${email}`, JSON.stringify([]));
    
    alert('Registro exitoso. Ahora inicia sesión.');
    toggleAuthMode();
});

// Detalle y Compartir
window.openDetailModal = (beca) => {
    currentSharedBeca = beca;
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');
    
    content.innerHTML = `
        <h2 style="color:var(--primary);">${beca.titulo}</h2>
        <h3>${beca.institucion} 📍 ${beca.pais}</h3>
        <p><strong>Deadline:</strong> ${beca.deadline}</p>
        <p><strong>Nivel:</strong> ${beca.nivel.join(', ')}</p>
        <p><strong>Área:</strong> ${beca.area.join(', ')}</p>
        <p><strong>Financiamiento:</strong> ${beca.financiamiento}</p>
        <a href="${beca.url_convocatoria}" target="_blank" class="btn btn-primary" style="display:block; text-align:center; margin-top:20px;">Ir a la Convocatoria</a>
    `;
    modal.classList.remove('hidden');
};

window.closeDetailModal = () => {
    document.getElementById('detail-modal').classList.add('hidden');
};

window.shareWhatsApp = () => {
    if (!currentSharedBeca) return;
    const text = `Mira esta beca: ${currentSharedBeca.titulo} en ${currentSharedBeca.pais}. Deadline: ${currentSharedBeca.deadline}.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + window.location.href)}`, '_blank');
};

window.copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Enlace copiado al portapapeles');
};

// Generador de Cartas
window.openLetterGenerator = (id) => {
    const app = userApplications.find(a => a.id === id);
    if (!app) return;
    
    const letter = `Estimado Comité de Admisiones,

Por medio de la presente expreso mi interés en el programa ${app.titulo} en ${app.institucion}.

Mi motivación principal es... [Completa aquí]

Atentamente,
${currentUser.name}`;

    document.getElementById('letterTitle').textContent = `Carta: ${app.titulo}`;
    document.getElementById('letterContent').value = letter;
    document.getElementById('letterModal').classList.remove('hidden');
};

window.closeLetterModal = () => {
    document.getElementById('letterModal').classList.add('hidden');
};

window.copyLetter = () => {
    const txt = document.getElementById('letterContent');
    txt.select();
    document.execCommand('copy');
    alert('Carta copiada');
};
