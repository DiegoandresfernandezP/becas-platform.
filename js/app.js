// --- ESTADO GLOBAL ---
let currentUser = null;
let scholarships = [];
let userApplications = [];
let currentSharedBeca = null;
let myChart = null;

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
        const allScholarships = await response.json();
        
        // Filtrar y ordenar
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Separar activas y cerradas
        scholarships = allScholarships.filter(b => b.deadline >= todayStr);
        const closedScholarships = allScholarships.filter(b => b.deadline < todayStr);

        // Ordenar activas por fecha
        scholarships.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        renderScholarships(scholarships, false); // Renderizar activas
        
        // Si hay cerradas, agregar separador y renderizarlas
        if (closedScholarships.length > 0) {
            const container = document.getElementById('catalogo');
            const separator = document.createElement('div');
            separator.style.gridColumn = "1 / -1";
            separator.style.margin = "40px 0 20px";
            separator.innerHTML = `
                <h3 style="text-align:center; color:#666; border-bottom: 2px solid #eee; padding-bottom:10px;">
                    Oportunidades Cerradas (Referencia)
                </h3>
                <p style="text-align:center; font-size:0.9rem; color:#888;">Úsalas para preparar tus documentos para el próximo ciclo.</p>
            `;
            container.appendChild(separator);
            renderScholarships(closedScholarships, true);
        }

        updateStats();
    } catch (error) {
        console.error('Error cargando becas:', error);
        document.getElementById('catalogo').innerHTML = '<p>Error cargando datos. Verifica tu conexión.</p>';
    }
}

// --- AUTENTICACIÓN ---
function checkAuth() {
    const storedUser = localStorage.getItem('scholarship_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateNav(true);
    } else {
        updateNav(false);
    }
}

function updateNav(isLoggedIn) {
    const container = document.getElementById('auth-buttons');
    if (isLoggedIn) {
        container.innerHTML = `<a href="#" onclick="navigate('dashboard-section')" style="color:var(--primary)">Mi Panel</a>`;
        document.getElementById('userNameDisplay').textContent = currentUser.name;
    } else {
        container.innerHTML = `<button class="btn btn-primary btn-sm" onclick="toggleAuthModal()">Login / Registro</button>`;
    }
}

function toggleAuthModal() {
    document.getElementById('auth-modal').classList.toggle('hidden');
}

function toggleAuthMode() {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const title = document.getElementById('auth-title');
    const toggleText = document.querySelector('.auth-toggle');

    if (loginForm.classList.contains('hidden')) {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        title.textContent = "Iniciar Sesión";
        toggleText.innerHTML = '¿No tienes cuenta? <u>Regístrate</u>';
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        title.textContent = "Crear Cuenta";
        toggleText.innerHTML = '¿Ya tienes cuenta? <u>Inicia sesión</u>';
    }
}

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    const storedUser = localStorage.getItem('scholarship_user');
    
    if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.email === email && user.pass === pass) {
            currentUser = user;
            localStorage.setItem('scholarship_user', JSON.stringify(user));
            toggleAuthModal();
            checkAuth();
            navigate('dashboard-section');
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

    if (!name || !email || !pass) return alert('Completa todos los campos');

    const user = { name, email, pass };
    localStorage.setItem('scholarship_user', JSON.stringify(user));
    localStorage.setItem(`apps_${email}`, JSON.stringify([]));
    
    alert('Registro exitoso. Ahora inicia sesión.');
    toggleAuthMode();
});

function logout() {
    localStorage.removeItem('scholarship_user');
    currentUser = null;
    location.reload();
}

// --- NAVEGACIÓN ---
window.navigate = (sectionId) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    
    const target = document.getElementById(sectionId);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
    
    if (sectionId === 'dashboard-section') loadUserDashboard();
    document.getElementById('nav-links').classList.remove('active');
};

window.toggleMenu = () => {
    document.getElementById('nav-links').classList.toggle('active');
};

// --- RENDERIZADO ---
function renderScholarships(data, isClosed) {
    const container = document.getElementById('catalogo');
    
    data.forEach(beca => {
        const card = document.createElement('div');
        card.className = 'beca-card';
        
        if (isClosed) {
            card.style.opacity = "0.7";
            card.style.filter = "grayscale(80%)";
        }

        const deadlineStyle = isClosed ? 'background:#ccc; color:#555;' : 'background:#fee2e2; color:#ef4444;';
        const deadlineText = isClosed ? 'CERRADA' : beca.deadline;
        const btnAction = isClosed ? '' : `onclick="${currentUser ? `addToTracker('${beca.id}')` : 'toggleAuthModal()'}"`;
        const btnText = isClosed ? 'Cerrada' : (currentUser ? 'Guardar' : 'Guardar');
        const btnClass = isClosed ? 'btn-secondary' : 'btn-primary';
        const btnStyle = isClosed ? 'background:#ccc; cursor:not-allowed;' : '';

        card.innerHTML = `
            <div class="card-body">
                <span class="tag">${beca.financiamiento}</span>
                ${isClosed ? '<span class="tag" style="background:#555; color:white;">Cerrada</span>' : ''}
                <h3 style="margin: 10px 0;">${beca.titulo}</h3>
                <p style="color: var(--primary); font-weight: bold;">${beca.institucion}</p>
                <p style="font-size: 0.9rem; color: #666;"><i class="fas fa-map-marker-alt"></i> ${beca.pais}</p>
                <div class="card-tags">${beca.nivel.map(n => `<span class="tag">${n}</span>`).join('')}</div>
                <p style="margin-top: 10px; font-size: 0.9rem; font-weight:bold; ${deadlineStyle} padding:5px; border-radius:4px; display:inline-block;">
                    ${deadlineText}
                </p>
            </div>
            <div class="card-footer">
                <a href="${beca.url_convocatoria}" target="_blank" class="btn btn-outline btn-sm">Ver Web</a>
                <button class="btn ${btnClass} btn-sm" style="${btnStyle}" ${btnAction}>${btnText}</button>
            </div>
        `;
        container.appendChild(card);
    });
    
    // Actualizar contador
    if (!isClosed) {
        document.getElementById('count-display').textContent = data.length;
    }
}

function updateStats() {
    document.getElementById('stat-becas').textContent = scholarships.length;
    const countries = new Set(scholarships.map(s => s.pais)).size;
    document.getElementById('stat-paises').textContent = countries;
    document.getElementById('stat-unis').textContent = new Set(scholarships.map(s => s.institucion)).size;
}

// --- FILTROS Y BÚSQUEDA ---
function setupEventListeners() {
    // Buscador de texto
    document.getElementById('searchInput').addEventListener('input', applyFilters);

    // Escuchar cambios en los 4 selectores
    ['filterLevel', 'filterArea', 'filterCountry', 'filterSort'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });

    // Forms Auth (mantener los tuyos)
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        // ... tu lógica de login ...
    });
    
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        // ... tu lógica de registro ...
    });
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const levelVal = document.getElementById('filterLevel').value;
    const areaVal = document.getElementById('filterArea').value;
    const countryVal = document.getElementById('filterCountry').value;
    const sortVal = document.getElementById('filterSort').value;

    // 1. Filtrar
    let filtered = scholarships.filter(beca => {
        // Búsqueda por texto (título, institución, país)
        const matchText = beca.titulo.toLowerCase().includes(searchTerm) || 
                          beca.institucion.toLowerCase().includes(searchTerm) ||
                          beca.pais.toLowerCase().includes(searchTerm);
        
        // Filtro Nivel
        const matchLevel = levelVal === 'all' || beca.nivel.includes(levelVal);
        
        // Filtro Área (busca coincidencia parcial en el array de áreas)
        const matchArea = areaVal === 'all' || beca.area.some(a => a.includes(areaVal));
        
        // Filtro País (coincidencia exacta)
        const matchCountry = countryVal === 'all' || beca.pais === countryVal;

        return matchText && matchLevel && matchArea && matchCountry;
    });

    // 2. Ordenar
    if (sortVal === 'deadline') {
        filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sortVal === 'recent') {
        // Asumiendo que ID mayor es más reciente, o podrías usar fecha de creación si la tuvieras
        filtered.sort((a, b) => b.id.localeCompare(a.id)); 
    } else if (sortVal === 'alpha') {
        filtered.sort((a, b) => a.titulo.localeCompare(b.titulo));
    }

    // 3. Renderizar y actualizar contador
    renderScholarships(filtered);
    
    const countDisplay = document.getElementById('count-display');
    if (countDisplay) {
        countDisplay.textContent = filtered.length;
    }
}

// --- TRACKER Y DASHBOARD ---
function getUserApps() {
    if (!currentUser) return [];
    const data = localStorage.getItem(`apps_${currentUser.email}`);
    return data ? JSON.parse(data) : [];
}

function saveUserApps(apps) {
    if (!currentUser) return;
    localStorage.setItem(`apps_${currentUser.email}`, JSON.stringify(apps));
    userApplications = apps;
    loadUserDashboard();
}

function addToTracker(id) {
    const beca = scholarships.find(s => s.id === id);
    const apps = getUserApps();
    
    if (apps.find(a => a.id === id)) return alert('Ya guardaste esta beca');

    const newApp = {
        ...beca,
        status: 'Interesado',
        documents: { cv: false, carta: false, recomendaciones: false, idiomas: false },
        notes: ''
    };

    apps.push(newApp);
    saveUserApps(apps);
    alert('Beca guardada. Ve a "Mi Panel" para gestionarla.');
    navigate('dashboard-section');
}

function loadUserDashboard() {
    if (!currentUser) return;
    const apps = getUserApps();
    userApplications = apps;
    
    document.getElementById('dash-total').textContent = apps.length;
    renderTracker(apps);
    renderChart(apps);
}

function renderTracker(apps) {
    const container = document.getElementById('tracker-list');
    container.innerHTML = '';

    if (apps.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#888;">No has guardado becas aún.</p>';
        return;
    }

    apps.forEach(app => {
        const totalDocs = 4;
        const doneDocs = Object.values(app.documents).filter(v => v).length;
        const progress = (doneDocs / totalDocs) * 100;

        const item = document.createElement('div');
        item.className = 'tracker-item';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <div>
                    <h4>${app.titulo}</h4>
                    <p style="font-size:0.85rem; color:#666;">${app.institucion}</p>
                </div>
                <select onchange="updateStatus('${app.id}', this.value)" style="padding:5px; border-radius:4px;">
                    <option value="Interesado" ${app.status === 'Interesado' ? 'selected' : ''}>Interesado</option>
                    <option value="En Proceso" ${app.status === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
                    <option value="Enviada" ${app.status === 'Enviada' ? 'selected' : ''}>Enviada</option>
                    <option value="Resultado" ${app.status === 'Resultado' ? 'selected' : ''}>Resultado</option>
                </select>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
            <p style="font-size:0.8rem; text-align:right;">${Math.round(progress)}% Completado</p>
            <div class="checklist-grid">
                <label><input type="checkbox" ${app.documents.cv ? 'checked' : ''} onchange="toggleDoc('${app.id}', 'cv')"> CV</label>
                <label><input type="checkbox" ${app.documents.carta ? 'checked' : ''} onchange="toggleDoc('${app.id}', 'carta')"> Carta</label>
                <label><input type="checkbox" ${app.documents.recomendaciones ? 'checked' : ''} onchange="toggleDoc('${app.id}', 'recomendaciones')"> Recs</label>
                <label><input type="checkbox" ${app.documents.idiomas ? 'checked' : ''} onchange="toggleDoc('${app.id}', 'idiomas')"> Idioma</label>
            </div>
            <div style="display:flex; gap: 5px; margin-top: 10px;">
                <button class="btn btn-outline btn-sm" style="flex:1;" onclick="openLetterGenerator('${app.id}')">✨ Generar Carta</button>
            </div>
        `;
        container.appendChild(item);
    });
    
    const totalProgress = apps.reduce((acc, app) => acc + Object.values(app.documents).filter(v => v).length, 0);
    document.getElementById('dash-docs').textContent = Math.round((totalProgress / (apps.length * 4)) * 100) + '%';
}

function updateStatus(id, newStatus) {
    const apps = getUserApps();
    const app = apps.find(a => a.id === id);
    if (app) { app.status = newStatus; saveUserApps(apps); }
}

function toggleDoc(id, docType) {
    const apps = getUserApps();
    const app = apps.find(a => a.id === id);
    if (app) { app.documents[docType] = !app.documents[docType]; saveUserApps(apps); }
}

function renderChart(apps) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    const counts = { 'Interesado': 0, 'En Proceso': 0, 'Enviada': 0, 'Resultado': 0 };
    apps.forEach(app => { if(counts[app.status] !== undefined) counts[app.status]++; });

    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{ data: Object.values(counts), backgroundColor: ['#9CA3AF', '#3B82F6', '#10B981', '#8B5CF6'], borderWidth: 0 }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// --- COMPARTIR Y CARTAS ---
function openDetailModal(beca) {
    // Implementación básica si se requiere click en tarjeta
    currentSharedBeca = beca;
}

function shareWhatsApp() {
    if (!currentSharedBeca) return alert('Selecciona una beca primero');
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent('Mira esta beca: ' + currentSharedBeca.titulo + ' ' + window.location.href)}`;
    window.open(url, '_blank');
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    alert('Enlace copiado');
}

function closeDetailModal() { document.getElementById('detail-modal').classList.add('hidden'); }
function closeLetterModal() { document.getElementById('letterModal').classList.add('hidden'); }

function openLetterGenerator(id) {
    const app = userApplications.find(a => a.id === id);
    if (!app) return;
    const template = `Estimados,\n\nPostulo a ${app.titulo} en ${app.institucion}...\n\nAtentamente,\n${currentUser.name}`;
    document.getElementById('letterContent').value = template;
    document.getElementById('letterModal').classList.remove('hidden');
}

function copyLetter() {
    const content = document.getElementById('letterContent');
    content.select();
    document.execCommand('copy');
    alert('Carta copiada');
    closeLetterModal();
}
