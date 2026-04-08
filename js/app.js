// --- ESTADO GLOBAL ---
let scholarships = [];
let currentUser = null;
let userApplications = [];

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadScholarships();
    checkAuth();
    setupEventListeners();
});

// --- 1. CARGA DE DATOS ---
async function loadScholarships() {
    const container = document.getElementById('catalogo');
    try {
        const response = await fetch('./data/becas.json');
        if (!response.ok) throw new Error('No se pudo cargar el JSON');
        
        let allData = await response.json();
        
        // Filtrar fechas (Opcional: Si quieres mostrar solo las activas)
        const todayStr = new Date().toISOString().split('T')[0];
        scholarships = allData.filter(b => b.deadline >= todayStr);
        
        // Ordenar por defecto (más urgentes)
        scholarships.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        // Renderizar inicial
        renderScholarships(scholarships);
        updateStats();
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--danger);"></i>
                <h3>Error al cargar las becas</h3>
                <p>Verifica que el archivo data/becas.json exista y tenga formato válido.</p>
                <p style="font-size: 0.8rem; color: #666;">Detalle: ${error.message}</p>
            </div>`;
    }
}

// --- 2. CONFIGURACIÓN DE EVENTOS (FILTROS) ---
function setupEventListeners() {
    // Buscador de texto
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    // Selectores
    const filters = ['filterLevel', 'filterArea', 'filterCountry', 'filterSort'];
    filters.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', applyFilters);
        }
    });

    // Formulario Auth
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (regForm) regForm.addEventListener('submit', handleRegister);
}

// --- 3. LÓGICA DE FILTRADO ---
function applyFilters() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const levelVal = document.getElementById('filterLevel').value;
    const areaVal = document.getElementById('filterArea').value;
    const countryVal = document.getElementById('filterCountry').value;
    const sortVal = document.getElementById('filterSort').value;

    let filtered = scholarships.filter(beca => {
        // Búsqueda Texto (Título, Institución, País, Tags)
        const textMatch = 
            beca.titulo.toLowerCase().includes(searchText) ||
            beca.institucion.toLowerCase().includes(searchText) ||
            beca.pais.toLowerCase().includes(searchText) ||
            (beca.tags && beca.tags.some(t => t.toLowerCase().includes(searchText)));

        // Filtro Nivel
        const levelMatch = levelVal === 'all' || beca.nivel.includes(levelVal);

        // Filtro Área (Coincidencia parcial o exacta según tus datos)
        const areaMatch = areaVal === 'all' || 
                          beca.area.some(a => a.includes(areaVal)) || 
                          beca.area.includes(areaVal);

        // Filtro País
        const countryMatch = countryVal === 'all' || beca.pais === countryVal;

        return textMatch && levelMatch && areaMatch && countryMatch;
    });

    // Ordenamiento
    if (sortVal === 'deadline') {
        filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sortVal === 'recent') {
        // Asumiendo que tienes un ID o fecha de creación, si no, usamos el orden original inverso
        filtered.reverse(); 
    } else if (sortVal === 'alpha') {
        filtered.sort((a, b) => a.titulo.localeCompare(b.titulo));
    }

    renderScholarships(filtered);
}

// --- 4. RENDERIZADO (Lo que evita que se quede cargando) ---
function renderScholarships(data) {
    const container = document.getElementById('catalogo');
    const countDisplay = document.getElementById('count-display');
    
    if (!container) return; // Seguridad por si el DOM no está listo

    // Actualizar contador
    if (countDisplay) countDisplay.textContent = data.length;

    // Limpiar contenedor
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No se encontraron resultados</h3>
                <p>Intenta con otros términos o limpia los filtros.</p>
            </div>`;
        return;
    }

    // Crear fragmento para mejor rendimiento
    const fragment = document.createDocumentFragment();

    data.forEach(beca => {
        const isSaved = currentUser && userApplications.some(app => app.becaId === beca.id || app.id === beca.id);
        
        const card = document.createElement('div');
        card.className = 'beca-card';
        
        // Construir HTML de la tarjeta
        card.innerHTML = `
            <div class="card-body">
                <span class="tag">${beca.financiamiento}</span>
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
                    `<button class="btn ${isSaved ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="toggleSave('${beca.id}', '${beca.titulo}', '${beca.institucion}')">
                        ${isSaved ? '<i class="fas fa-check"></i> Guardada' : 'Guardar'}
                     </button>` : 
                    `<button class="btn btn-secondary btn-sm" style="background:#ccc; cursor:pointer;" onclick="toggleAuthModal()">Guardar</button>`
                }
            </div>
        `;
        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

// --- 5. FUNCIONES AUXILIARES Y AUTH ---

function updateStats() {
    const total = scholarships.length;
    const paises = new Set(scholarships.map(b => b.pais)).size;
    const unis = new Set(scholarships.map(b => b.institucion)).size;

    const elTotal = document.getElementById('stat-becas');
    const elPaises = document.getElementById('stat-paises');
    const elUnis = document.getElementById('stat-unis');

    if (elTotal) elTotal.textContent = total;
    if (elPaises) elPaises.textContent = paises;
    if (elUnis) elUnis.textContent = unis;
}

// Navegación SPA
window.navigate = (viewId) => {
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });
    
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
    
    // Cerrar menú móvil si está abierto
    document.getElementById('nav-links').classList.remove('active');
    
    if (viewId === 'dashboard-section') {
        loadDashboard();
    }
};

window.toggleMenu = () => {
    document.getElementById('nav-links').classList.toggle('active');
};

// Auth Simple
function checkAuth() {
    const stored = localStorage.getItem('scholarship_user');
    if (stored) {
        currentUser = JSON.parse(stored);
        userApplications = JSON.parse(localStorage.getItem(`apps_${currentUser.email}`) || '[]');
        updateNavAuth(true);
    } else {
        updateNavAuth(false);
    }
}

function updateNavAuth(isLoggedIn) {
    const container = document.getElementById('auth-buttons');
    if (!container) return;

    if (isLoggedIn) {
        container.innerHTML = `
            <span style="font-size:0.9rem; margin-right:10px;">Hola, ${currentUser.name.split(' ')[0]}</span>
            <a href="#" onclick="navigate('dashboard-section')" style="font-weight:bold;">Panel</a>
            <a href="#" onclick="logout()" style="color:var(--danger); margin-left:10px;">Salir</a>
        `;
    } else {
        container.innerHTML = `<button class="btn btn-primary btn-sm" onclick="toggleAuthModal()">Login / Registro</button>`;
    }
}

window.toggleAuthModal = () => {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.toggle('hidden');
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

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    
    // Simulación simple: busca en localStorage
    const storedUser = localStorage.getItem('scholarship_user');
    if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.email === email && user.pass === pass) {
            currentUser = user;
            userApplications = JSON.parse(localStorage.getItem(`apps_${user.email}`) || '[]');
            toggleAuthModal();
            checkAuth();
            navigate('dashboard-section');
            alert('¡Bienvenido de nuevo!');
        } else {
            alert('Credenciales incorrectas');
        }
    } else {
        alert('Usuario no encontrado. Regístrate primero.');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;

    if (!name || !email || !pass) return alert('Completa todos los campos');

    const newUser = { name, email, pass };
    localStorage.setItem('scholarship_user', JSON.stringify(newUser));
    localStorage.setItem(`apps_${email}`, '[]');
    
    alert('Registro exitoso. Ahora inicia sesión.');
    toggleAuthMode();
}

window.logout = () => {
    localStorage.removeItem('scholarship_user');
    currentUser = null;
    userApplications = [];
    location.reload();
};

// Guardar en Tracker
window.toggleSave = (id, titulo, institucion) => {
    if (!currentUser) return;

    const exists = userApplications.find(app => app.becaId === id);
    if (exists) {
        if(confirm('¿Quieres eliminar esta beca de tu tracker?')) {
            userApplications = userApplications.filter(app => app.becaId !== id);
            saveApps();
            renderScholarships(scholarships); // Re-render para actualizar botón
        }
    } else {
        const newApp = {
            becaId: id,
            titulo,
            institucion,
            estado: 'Interesado',
            checklist: []
        };
        userApplications.push(newApp);
        saveApps();
        renderScholarships(scholarships);
        alert('Beca guardada en tu Panel');
    }
};

function saveApps() {
    if (currentUser) {
        localStorage.setItem(`apps_${currentUser.email}`, JSON.stringify(userApplications));
        loadDashboard();
    }
}

function loadDashboard() {
    if (!currentUser) return;
    // Aquí iría la lógica para renderizar el dashboard (gráficas, lista, etc.)
    // Por brevedad, solo actualizamos contadores básicos si existen
    const total = userApplications.length;
    const elTotal = document.getElementById('dash-total');
    if (elTotal) elTotal.textContent = total;
    
    const list = document.getElementById('tracker-list');
    if (list) {
        if (total === 0) {
            list.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#666;">No tienes becas guardadas aún.</p>';
        } else {
            list.innerHTML = userApplications.map(app => `
                <div class="tracker-item">
                    <h4>${app.titulo}</h4>
                    <p>${app.institucion}</p>
                    <span class="tag">${app.estado}</span>
                </div>
            `).join('');
        }
    }
}

// Modales de detalle y cartas (Funciones vacías para evitar errores si se llaman)
window.closeDetailModal = () => {
    const m = document.getElementById('detail-modal');
    if(m) m.classList.add('hidden');
};
window.closeLetterModal = () => {
    const m = document.getElementById('letterModal');
    if(m) m.classList.add('hidden');
};
window.shareWhatsApp = () => alert('Función de compartir disponible en la vista de detalle.');
window.shareTwitter = () => alert('Función de compartir disponible en la vista de detalle.');
window.shareLinkedIn = () => alert('Función de compartir disponible en la vista de detalle.');
window.copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Enlace copiado');
};
