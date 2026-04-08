// --- ESTADO GLOBAL ---
let scholarships = [];
let currentUser = null;
let userApplications = [];
let isLoginMode = true;
let myChart = null;
let currentSharedBeca = null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadScholarships();
    checkAuth();
    setupEventListeners();
    navigate('home'); // Asegurar que empiece en Home
});

// --- CARGA DE DATOS ---
async function loadScholarships() {
    try {
        const response = await fetch('./data/becas.json');
        if (!response.ok) throw new Error("Error cargando JSON");
        scholarships = await response.json();
        
        // Filtrar becas vigentes (o mostrar todas si quieres ver las cerradas como referencia)
        // Para este ejemplo, mostramos todas pero podrías filtrar por fecha aquí
        renderScholarships(scholarships);
        updateStats();
    } catch (error) {
        console.error('Error cargando becas:', error);
        document.getElementById('catalogo').innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <h3>Error al cargar las becas</h3>
                <p>Verifica que el archivo data/becas.json exista y sea válido.</p>
                <p class="small-text">${error.message}</p>
            </div>`;
    }
}

// --- NAVEGACIÓN ---
window.navigate = (viewId) => {
    // Ocultar todas las secciones
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });

    // Mostrar la seleccionada
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    // Lógica específica por vista
    if (viewId === 'dashboard-section') {
        if (!currentUser) {
            toggleAuthModal(); // Si no hay usuario, pedir login
            navigate('home');
            return;
        }
        loadUserDashboard();
    }

    // Cerrar menú móvil si está abierto
    document.getElementById('nav-links').classList.remove('active');
    window.scrollTo(0, 0);
};

window.toggleMenu = () => {
    document.getElementById('nav-links').classList.toggle('active');
};

// --- AUTENTICACIÓN ---
function checkAuth() {
    const stored = localStorage.getItem('scholarship_user');
    if (stored) {
        currentUser = JSON.parse(stored);
        updateNav(true);
    } else {
        updateNav(false);
    }
}

function updateNav(isLoggedIn) {
    const container = document.getElementById('auth-buttons');
    if (isLoggedIn) {
        container.innerHTML = `
            <span style="font-size:0.9rem; margin-right:10px;">Hola, ${currentUser.name.split(' ')[0]}</span>
            <a href="#" onclick="navigate('dashboard-section')" style="color:var(--primary); font-weight:bold;">Mi Panel</a>
            <a href="#" onclick="logout()" style="margin-left:10px; color:var(--danger);"><i class="fas fa-sign-out-alt"></i></a>
        `;
        document.getElementById('userNameDisplay').textContent = currentUser.name;
    } else {
        container.innerHTML = `<button class="btn btn-primary btn-sm" onclick="toggleAuthModal()">Login / Registro</button>`;
    }
}

function toggleAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.toggle('hidden');
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const title = document.getElementById('auth-title');
    const toggleText = document.querySelector('.auth-toggle');

    if (isLoginMode) {
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

// --- RENDERIZADO DE BECAS ---
function renderScholarships(data) {
    const container = document.getElementById('catalogo');
    const countDisplay = document.getElementById('count-display');
    
    if (!container) return;

    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No se encontraron becas con esos filtros.</p>';
        if(countDisplay) countDisplay.textContent = '0';
        return;
    }

    if(countDisplay) countDisplay.textContent = data.length;

    data.forEach(beca => {
        const card = document.createElement('div');
        card.className = 'beca-card';
        
        // Determinar estado visual
        const isClosed = new Date(beca.deadline) < new Date();
        const statusBadge = isClosed 
            ? `<span style="background:#eee; color:#666; padding:4px 8px; border-radius:4px; font-size:0.8rem;">Cerrada</span>` 
            : `<span style="background:#d1fae5; color:#065f46; padding:4px 8px; border-radius:4px; font-size:0.8rem;">Abierta</span>`;

        card.innerHTML = `
            <div class="card-body">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                    <span class="tag">${beca.financiamiento}</span>
                    ${statusBadge}
                </div>
                <h3 style="margin: 10px 0; font-size:1.2rem;">${beca.titulo}</h3>
                <p style="color: var(--primary); font-weight: bold;">${beca.institucion}</p>
                <p style="font-size: 0.9rem; color: #666;"><i class="fas fa-map-marker-alt"></i> ${beca.pais}</p>
                
                <div class="card-tags" style="margin-top:10px;">
                    ${beca.nivel.slice(0, 2).map(n => `<span class="tag">${n}</span>`).join('')}
                </div>
                
                <p style="margin-top: 15px; font-size: 0.9rem;">
                    <i class="far fa-clock"></i> Deadline: <strong>${beca.deadline}</strong>
                </p>
            </div>
            <div class="card-footer">
                <a href="${beca.url_convocatoria}" target="_blank" class="btn btn-outline btn-sm">Ver Web</a>
                <button class="btn btn-primary btn-sm" onclick='openDetailModal(${JSON.stringify(beca).replace(/'/g, "&#39;")})'>
                    Ver Detalles
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateStats() {
    const total = scholarships.length;
    const countries = new Set(scholarships.map(s => s.pais)).size;
    const unis = new Set(scholarships.map(s => s.institucion)).size;

    const elTotal = document.getElementById('stat-becas');
    const elPaises = document.getElementById('stat-paises');
    const elUnis = document.getElementById('stat-unis');

    if(elTotal) elTotal.textContent = total;
    if(elPaises) elPaises.textContent = countries;
    if(elUnis) elUnis.textContent = unis;
}

// --- FILTROS ---
function setupEventListeners() {
    // Buscador
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => applyFilters());
    }

    // Selects de filtros
    ['filterLevel', 'filterArea', 'filterCountry', 'filterSort'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', () => applyFilters());
    });
}

function applyFilters() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const level = document.getElementById('filterLevel').value;
    const area = document.getElementById('filterArea').value;
    const country = document.getElementById('filterCountry').value;
    const sort = document.getElementById('filterSort').value;

    let filtered = scholarships.filter(b => {
        const matchTerm = b.titulo.toLowerCase().includes(term) || 
                          b.institucion.toLowerCase().includes(term) ||
                          b.pais.toLowerCase().includes(term);
        const matchLevel = level === 'all' || b.nivel.includes(level);
        const matchArea = area === 'all' || b.area.includes(area);
        const matchCountry = country === 'all' || b.pais === country;
        
        return matchTerm && matchLevel && matchArea && matchCountry;
    });

    if (sort === 'deadline') {
        filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sort === 'recent') {
        filtered.reverse();
    }

    renderScholarships(filtered);
}

// --- MODAL DE DETALLE Y COMPARTIR ---
window.openDetailModal = (beca) => {
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');
    
    currentSharedBeca = beca;
    updateMetaTags(beca);

    const isClosed = new Date(beca.deadline) < new Date();
    const btnText = isClosed ? "Convocatoria Cerrada" : "Ir a la Convocatoria";
    const btnClass = isClosed ? "btn-secondary" : "btn-primary";
    const btnDisabled = isClosed ? "disabled style='opacity:0.6; cursor:not-allowed;'" : "";

    content.innerHTML = `
        <h2 style="color: var(--primary); margin-bottom:10px;">${beca.titulo}</h2>
        <h3 style="color: #555; margin-bottom: 20px;">${beca.institucion} 📍 ${beca.pais}</h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; background:#f8fafc; padding:15px; border-radius:8px;">
            <div><strong>Deadline:</strong> <span style="color: ${isClosed ? 'var(--danger)' : 'var(--success)'}">${beca.deadline}</span></div>
            <div><strong>Nivel:</strong> ${beca.nivel.join(', ')}</div>
            <div><strong>Financiamiento:</strong> ${beca.financiamiento}</div>
            <div><strong>Área:</strong> ${beca.area.join(', ')}</div>
        </div>

        <div style="margin-bottom: 25px;">
            <h4>Documentos Sugeridos:</h4>
            <ul style="margin-left: 20px; margin-top: 5px; line-height:1.6;">
                ${beca.documentos_sugeridos.map(d => `<li>${d}</li>`).join('')}
            </ul>
        </div>

        <a href="${beca.url_convocatoria}" target="_blank" class="btn ${btnClass}" style="display: block; text-align: center; width:100%;" ${btnDisabled}>
            ${btnText} <i class="fas fa-external-link-alt"></i>
        </a>
        
        ${currentUser && !isClosed ? 
            `<button class="btn btn-outline" style="display: block; width: 100%; margin-top: 10px;" onclick="addToTracker('${beca.id}'); closeDetailModal();">
                💾 Guardar en mi Tracker
            </button>` : ''
        }
    `;

    modal.classList.remove('hidden');
};

window.closeDetailModal = () => {
    document.getElementById('detail-modal').classList.add('hidden');
    resetMetaTags();
};

// Funciones de Compartir
function updateMetaTags(beca) {
    const title = `${beca.titulo} | ScholarHub`;
    const desc = `Beca en ${beca.pais}. Deadline: ${beca.deadline}.`;
    
    document.title = title;
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", desc);
}

function resetMetaTags() {
    document.title = "ScholarHub - Tu Portal de Becas";
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", "ScholarHub - Encuentra tu Beca Ideal");
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", "Más de 100 oportunidades...");
    currentSharedBeca = null;
}

window.shareWhatsApp = () => {
    if (!currentSharedBeca) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(currentSharedBeca.titulo + ': ' + currentSharedBeca.url_convocatoria)}`;
    window.open(url, '_blank');
};

window.shareTwitter = () => {
    if (!currentSharedBeca) return;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(currentSharedBeca.titulo)}&url=${encodeURIComponent(currentSharedBeca.url_convocatoria)}`;
    window.open(url, '_blank');
};

window.shareLinkedIn = () => {
    if (!currentSharedBeca) return;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentSharedBeca.url_convocatoria)}`;
    window.open(url, '_blank');
};

window.copyLink = () => {
    if (!currentSharedBeca) return;
    navigator.clipboard.writeText(currentSharedBeca.url_convocatoria).then(() => {
        alert("Enlace copiado al portapapeles");
    });
};

// --- TRACKER Y DASHBOARD (Lógica existente simplificada) ---
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

window.addToTracker = (id) => {
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
    alert('Beca guardada en tu panel.');
    navigate('dashboard-section');
};

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
    if (!container) return;
    container.innerHTML = '';

    if (apps.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#888;">Aún no has guardado becas.</p>';
        return;
    }

    apps.forEach(app => {
        const done = Object.values(app.documents).filter(v => v).length;
        const progress = (done / 4) * 100;

        const item = document.createElement('div');
        item.className = 'tracker-item';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <h4>${app.titulo}</h4>
                <select onchange="updateStatus('${app.id}', this.value)" style="padding:4px; border-radius:4px; font-size:0.8rem;">
                    <option value="Interesado" ${app.status==='Interesado'?'selected':''}>Interesado</option>
                    <option value="En Proceso" ${app.status==='En Proceso'?'selected':''}>En Proceso</option>
                    <option value="Enviada" ${app.status==='Enviada'?'selected':''}>Enviada</option>
                    <option value="Resultado" ${app.status==='Resultado'?'selected':''}>Resultado</option>
                </select>
            </div>
            <p style="font-size:0.85rem; color:#666;">${app.institucion}</p>
            <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
            <div class="checklist-grid">
                <label><input type="checkbox" ${app.documents.cv?'checked':''} onchange="toggleDoc('${app.id}','cv')"> CV</label>
                <label><input type="checkbox" ${app.documents.carta?'checked':''} onchange="toggleDoc('${app.id}','carta')"> Carta</label>
                <label><input type="checkbox" ${app.documents.recomendaciones?'checked':''} onchange="toggleDoc('${app.id}','recomendaciones')"> Recs</label>
                <label><input type="checkbox" ${app.documents.idiomas?'checked':''} onchange="toggleDoc('${app.id}','idiomas')"> Idioma</label>
            </div>
            <button class="btn btn-sm btn-outline" style="width:100%; margin-top:10px;" onclick="openLetterGenerator('${app.id}')">✨ Generar Carta</button>
        `;
        container.appendChild(item);
    });
    
    const totalProgress = apps.reduce((acc, app) => acc + Object.values(app.documents).filter(v=>v).length, 0);
    const globalPercent = Math.round((totalProgress / (apps.length * 4)) * 100) || 0;
    document.getElementById('dash-docs').textContent = globalPercent + '%';
}

function updateStatus(id, status) {
    const apps = getUserApps();
    const app = apps.find(a => a.id === id);
    if(app) { app.status = status; saveUserApps(apps); }
}

function toggleDoc(id, doc) {
    const apps = getUserApps();
    const app = apps.find(a => a.id === id);
    if(app) { app.documents[doc] = !app.documents[doc]; saveUserApps(apps); }
}

function renderChart(apps) {
    const ctx = document.getElementById('statusChart');
    if(!ctx) return;
    
    const counts = { 'Interesado': 0, 'En Proceso': 0, 'Enviada': 0, 'Resultado': 0 };
    apps.forEach(a => { if(counts[a.status] !== undefined) counts[a.status]++; });

    if(myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{ data: Object.values(counts), backgroundColor: ['#9CA3AF', '#3B82F6', '#10B981', '#8B5CF6'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// Generador de cartas (igual que antes)
window.openLetterGenerator = (id) => {
    const app = userApplications.find(a => a.id === id);
    if(!app) return;
    // ... (lógica de generación de carta) ...
    alert("Funcionalidad de carta disponible (usa la versión anterior del código para el texto completo)");
    document.getElementById('letterModal').classList.remove('hidden');
};
window.closeLetterModal = () => document.getElementById('letterModal').classList.add('hidden');
window.copyLetter = () => {
    const txt = document.getElementById('letterContent');
    txt.select(); document.execCommand('copy');
    alert("Copiado");
    closeLetterModal();
};
