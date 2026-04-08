// --- ESTADO GLOBAL ---
let currentUser = null;
let scholarships = [];
let userApplications = [];
let isLogin = true;
let myChart = null;
let currentSharedBeca = null;
const BASE_URL = window.location.href.split('#')[0];

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
        if (!response.ok) throw new Error("Error HTTP");
        scholarships = await response.json();
        
        // Filtrar solo las activas o recientes (lógica simple de fecha)
        const today = new Date().toISOString().split('T')[0];
        // Mostramos las que tienen deadline futuro O las que son "rolling" / sin fecha específica
        // Para este ejemplo, mostramos todas pero podrías filtrar aquí si quisieras ocultar las vencidas
        
        renderScholarships(scholarships);
        updateStats();
        populateCountryFilter(); // Llenar el filtro de países dinámicamente
    } catch (error) {
        console.error('Error cargando becas:', error);
        document.getElementById('catalogo').innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Error cargando datos. Verifica tu conexión o el archivo JSON.</p>';
    }
}

// --- ESTADÍSTICAS Y FILTROS ---
function updateStats() {
    document.getElementById('stat-becas').textContent = scholarships.length;
    const countries = new Set(scholarships.map(s => s.pais)).size;
    document.getElementById('stat-paises').textContent = countries;
    document.getElementById('stat-unis').textContent = new Set(scholarships.map(s => s.institucion)).size;
}

function populateCountryFilter() {
    const select = document.getElementById('filterCountry');
    const countries = [...new Set(scholarships.map(s => s.pais))].sort();
    
    // Mantener la opción "Todos"
    select.innerHTML = '<option value="all">Todos los Países</option>';
    
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        select.appendChild(option);
    });
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
        container.innerHTML = `<a href="#" onclick="navigate('dashboard-section')" style="color:var(--primary); font-weight:bold;">Mi Panel</a>`;
        if(currentUser) document.getElementById('userNameDisplay').textContent = currentUser.name;
    } else {
        container.innerHTML = `<button class="btn btn-primary btn-sm" onclick="toggleAuthModal()">Login / Registro</button>`;
    }
}

function toggleAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.toggle('hidden');
}

function toggleAuthMode() {
    isLogin = !isLogin;
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const title = document.getElementById('auth-title');
    const toggleText = document.querySelector('.auth-toggle');

    if (isLogin) {
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

    if (!name || !email || !pass) {
        alert('Completa todos los campos');
        return;
    }

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
    // Ocultar todas las secciones
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    
    // Mostrar la seleccionada
    const target = document.getElementById(sectionId);
    if(target) target.classList.remove('hidden');
    
    if (sectionId === 'dashboard-section') {
        loadUserDashboard();
    }
    
    // Cerrar menú móvil si está abierto
    document.getElementById('nav-links').classList.remove('active');
    window.scrollTo(0,0);
};

window.toggleMenu = () => {
    document.getElementById('nav-links').classList.toggle('active');
};

// --- RENDERIZADO DE BECAS ---
function renderScholarships(data) {
    const container = document.getElementById('catalogo');
    const countDisplay = document.getElementById('count-display');
    
    if (!container) return;

    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 40px;">No se encontraron becas con esos filtros.</p>';
        countDisplay.textContent = '0';
        return;
    }

    countDisplay.textContent = data.length;

    data.forEach(beca => {
        const card = document.createElement('div');
        card.className = 'beca-card'; // Asegúrate que tu CSS tenga .beca-card
        
        // Determinar estado visual
        const isExpired = new Date(beca.deadline) < new Date();
        const statusBadge = isExpired 
            ? '<span style="background:#ccc; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem;">Cerrada</span>' 
            : '<span style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem;">Abierta</span>';

        card.innerHTML = `
            <div class="card-body">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                    <span class="tag">${beca.financiamiento}</span>
                    ${statusBadge}
                </div>
                <h3 style="margin: 10px 0; font-size:1.2rem;">${beca.titulo}</h3>
                <p style="color: var(--primary); font-weight: bold;">${beca.institucion}</p>
                <p style="font-size: 0.9rem; color: #666;"><i class="fas fa-map-marker-alt"></i> ${beca.pais}</p>
                <div class="card-tags" style="margin: 10px 0;">
                    ${beca.nivel.slice(0,2).map(n => `<span class="tag">${n}</span>`).join('')}
                </div>
                <p style="margin-top: 10px; font-size: 0.85rem;"><i class="far fa-clock"></i> Deadline: ${beca.deadline}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-outline btn-sm" onclick='openDetailModal(${JSON.stringify(beca).replace(/'/g, "&#39;")})'>Ver Detalles</button>
                ${currentUser ? 
                    `<button class="btn btn-primary btn-sm" onclick="addToTracker('${beca.id}')">Guardar</button>` : 
                    `<button class="btn btn-secondary btn-sm" style="background:#ccc; cursor:not-allowed;" onclick="toggleAuthModal()">Guardar</button>`
                }
            </div>
        `;
        container.appendChild(card);
    });
}

// --- FILTROS ---
function setupEventListeners() {
    // Buscador
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    
    // Selects
    ['filterLevel', 'filterArea', 'filterCountry', 'filterSort'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', applyFilters);
    });

    // Forms Auth
    // (Ya definidos arriba en los submits)
}

function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const level = document.getElementById('filterLevel').value;
    const area = document.getElementById('filterArea').value;
    const country = document.getElementById('filterCountry').value;
    const sort = document.getElementById('filterSort').value;

    let filtered = scholarships.filter(b => {
        const matchSearch = b.titulo.toLowerCase().includes(search) || 
                            b.institucion.toLowerCase().includes(search) ||
                            b.pais.toLowerCase().includes(search);
        const matchLevel = level === 'all' || b.nivel.includes(level);
        const matchArea = area === 'all' || b.area.includes(area);
        const matchCountry = country === 'all' || b.pais === country;
        
        return matchSearch && matchLevel && matchArea && matchCountry;
    });

    // Ordenamiento
    if (sort === 'deadline') {
        filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sort === 'recent') {
        // Simulado
        filtered.reverse(); 
    }

    renderScholarships(filtered);
}

// --- DETALLE Y COMPARTIR ---
window.openDetailModal = (beca) => {
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');
    
    updateMetaTags(beca);
    currentSharedBeca = beca;

    const isExpired = new Date(beca.deadline) < new Date();

    content.innerHTML = `
        <h2 style="color: var(--primary); margin-bottom:10px;">${beca.titulo}</h2>
        <h3 style="margin-bottom: 15px; color:#555;">${beca.institucion} 📍 ${beca.pais}</h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; background:#f8fafc; padding:15px; border-radius:8px;">
            <div><strong>Deadline:</strong> <span style="color: ${isExpired ? 'red' : 'green'};">${beca.deadline}</span></div>
            <div><strong>Nivel:</strong> ${beca.nivel.join(', ')}</div>
            <div><strong>Financiamiento:</strong> ${beca.financiamiento}</div>
            <div><strong>Área:</strong> ${beca.area.join(', ')}</div>
        </div>

        <div style="margin-bottom: 20px;">
            <h4>Documentos Sugeridos:</h4>
            <ul style="margin-left: 20px; margin-top: 5px; line-height:1.6;">
                ${beca.documentos_sugeridos.map(d => `<li>${d}</li>`).join('')}
            </ul>
        </div>

        <a href="${beca.url_convocatoria}" target="_blank" class="btn btn-primary" style="display: block; text-align: center; text-decoration:none;">
            Ir a la Convocatoria Oficial <i class="fas fa-external-link-alt"></i>
        </a>
        
        ${currentUser && !isExpired ? 
            `<button class="btn btn-secondary" style="display: block; width: 100%; text-align: center; margin-top: 10px;" onclick="addToTracker('${beca.id}'); closeDetailModal();">
                💾 Guardar en mi Tracker
            </button>` : ''
        }
        ${isExpired ? '<p style="color:red; text-align:center; margin-top:10px; font-size:0.9rem;">⚠️ Esta convocatoria ya cerró. Se muestra como referencia para el próximo ciclo.</p>' : ''}
    `;

    modal.classList.remove('hidden');
};

window.closeDetailModal = () => {
    document.getElementById('detail-modal').classList.add('hidden');
    resetMetaTags();
};

// Funciones SEO
function updateMetaTags(beca) {
    const title = `${beca.titulo} en ${beca.pais} | ScholarHub`;
    const desc = `Beca ${beca.financiamiento} en ${beca.institucion}. Deadline: ${beca.deadline}.`;

    document.title = title;
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", desc);
    document.querySelector('meta[property="twitter:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="twitter:description"]')?.setAttribute("content", desc);
}

function resetMetaTags() {
    document.title = "ScholarHub - Tu Portal de Becas Internacionales";
    const defaultDesc = "Más de 100 oportunidades de estudio en el extranjero.";
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", "ScholarHub");
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", defaultDesc);
    document.querySelector('meta[property="twitter:title"]')?.setAttribute("content", "ScholarHub");
    document.querySelector('meta[property="twitter:description"]')?.setAttribute("content", defaultDesc);
}

// Funciones Compartir
window.shareWhatsApp = () => {
    if (!currentSharedBeca) return;
    const text = `¡Mira esta beca! ${currentSharedBeca.titulo} en ${currentSharedBeca.pais}. Deadline: ${currentSharedBeca.deadline}.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + BASE_URL)}`, '_blank');
};

window.shareTwitter = () => {
    if (!currentSharedBeca) return;
    const text = `Oportunidad: ${currentSharedBeca.titulo} en ${currentSharedBeca.institucion}.`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(BASE_URL)}`, '_blank');
};

window.shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(BASE_URL)}`, '_blank');
};

window.copyLink = () => {
    navigator.clipboard.writeText(BASE_URL).then(() => alert("Enlace copiado al portapapeles"));
};

// --- TRACKER (Manteniendo tu lógica anterior adaptada) ---
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
    alert('Beca guardada. Ve a "Mi Panel" para gestionarla.');
    navigate('dashboard-section');
};

function loadUserDashboard() {
    if (!currentUser) return;
    const apps = getUserApps();
    userApplications = apps;
    
    document.getElementById('dash-total').textContent = apps.length;
    
    // Renderizado simple del tracker (puedes mejorar esto con tu código anterior)
    const container = document.getElementById('tracker-list');
    container.innerHTML = '';
    
    if(apps.length === 0) {
        container.innerHTML = '<p>No has guardado becas aún.</p>';
        return;
    }

    apps.forEach(app => {
        const item = document.createElement('div');
        item.className = 'tracker-item'; // Asegúrate de tener estilo para esto
        item.style.background = '#f8fafc';
        item.style.padding = '15px';
        item.style.marginBottom = '10px';
        item.style.borderRadius = '6px';
        item.style.borderLeft = '4px solid var(--primary)';
        
        item.innerHTML = `
            <h4>${app.titulo}</h4>
            <p style="font-size:0.9rem; color:#666;">${app.institucion}</p>
            <select onchange="updateStatus('${app.id}', this.value)" style="margin-top:5px; padding:5px;">
                <option value="Interesado" ${app.status === 'Interesado' ? 'selected' : ''}>Interesado</option>
                <option value="En Proceso" ${app.status === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
                <option value="Enviada" ${app.status === 'Enviada' ? 'selected' : ''}>Enviada</option>
            </select>
        `;
        container.appendChild(item);
    });
    
    // Gráfica simple (opcional, requiere Chart.js cargado)
    // renderChart(apps); 
}

function updateStatus(id, newStatus) {
    const apps = getUserApps();
    const app = apps.find(a => a.id === id);
    if (app) {
        app.status = newStatus;
        saveUserApps(apps);
    }
}

// Generador de cartas (mantén tu lógica anterior aquí si la tienes)
window.openLetterGenerator = (id) => { /* ... tu código ... */ };
window.copyLetter = () => { /* ... tu código ... */ };
window.closeLetterModal = () => {
    document.getElementById('letterModal').classList.add('hidden');
};
