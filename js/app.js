// --- ESTADO GLOBAL ---
let scholarships = [];
let currentUser = null;
let userApplications = [];
let currentSharedBeca = null;
// Nuevo: Lista de todos los usuarios registrados (simulada en DB local)
let allUsers = JSON.parse(localStorage.getItem('scholarship_db_users')) || [];

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadScholarships();
    checkAuth();
    setupEventListeners();
    
    // Inicializar modales si existen en el HTML (prevención de errores)
    initModalsSafety();
});

function initModalsSafety() {
    // Verifica que los modales existan antes de asignar eventos globales si fuera necesario
    if (!document.getElementById('auth-modal')) console.warn('⚠️ Falta #auth-modal en HTML');
    if (!document.getElementById('detail-modal')) console.warn('⚠️ Falta #detail-modal en HTML');
    if (!document.getElementById('letterModal')) console.warn('⚠️ Falta #letterModal en HTML');
}

// --- CARGA DE DATOS (CON BECAS CERRADAS) ---
async function loadScholarships() {
    try {
        const response = await fetch('./data/becas.json');
        if (!response.ok) throw new Error('Error al cargar JSON');
        
        let allScholarships = await response.json();
        const todayStr = new Date().toISOString().split('T')[0];

        // SEPARAR: Activas vs Cerradas
        window.activeScholarships = allScholarships.filter(b => b.deadline >= todayStr);
        window.closedScholarships = allScholarships.filter(b => b.deadline < todayStr);

        // Ordenar activas por urgencia
        window.activeScholarships.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        
        // Renderizar ambas listas
        renderAllScholarships(window.activeScholarships, window.closedScholarships);
        updateStats();
        
    } catch (error) {
        console.error('Error:', error);
        const container = document.getElementById('catalogo');
        if(container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 15px;"></i>
                    <h3>Error al cargar las becas</h3>
                    <p>Verifica tu conexión o recarga la página.</p>
                    <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 15px;">Recargar</button>
                </div>`;
        }
    }
}

// --- AUTENTICACIÓN (CORREGIDA PARA MÚLTIPLES USUARIOS) ---
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

// --- FILTROS Y BÚSQUEDA ---
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
    // Filtramos solo sobre las activas para no mezclar historial en la búsqueda principal
    // Si quieres buscar también en cerradas, cambia 'window.activeScholarships' por una combinación de ambas
    let sourceList = window.activeScholarships || []; 
    
    const term = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const type = document.getElementById('filterType')?.value || 'all';
    const level = document.getElementById('filterLevel')?.value || 'all';
    const area = document.getElementById('filterArea')?.value || 'all';
    const country = document.getElementById('filterCountry')?.value || 'all';
    const sort = document.getElementById('filterSort')?.value || 'default';

    let filtered = sourceList.filter(beca => {
        const matchText = beca.titulo.toLowerCase().includes(term) || 
                          beca.institucion.toLowerCase().includes(term) ||
                          beca.pais.toLowerCase().includes(term) ||
                          (beca.tags && beca.tags.some(t => t.toLowerCase().includes(term)));

        const becaType = beca.tipo || 'Beca'; 
        const matchType = type === 'all' || becaType === type;
        const matchLevel = level === 'all' || (beca.nivel && beca.nivel.includes(level));
        const matchArea = area === 'all' || (beca.area && (beca.area.includes(area) || beca.area.some(a => a.includes(area))));
        const matchCountry = country === 'all' || beca.pais === country || 
                             (country === 'Europa' && beca.pais.includes('Europa'));

        return matchText && matchType && matchLevel && matchArea && matchCountry;
    });

    if (sort === 'deadline') {
        filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sort === 'recent') {
        filtered = [...filtered].reverse(); 
    } else if (sort === 'alpha') {
        filtered.sort((a, b) => a.titulo.localeCompare(b.titulo));
    }

    // Al filtrar, volvemos a llamar al renderizador doble, pasando las cerradas intactas al final
    renderAllScholarships(filtered, window.closedScholarships || []);
}
// --- RENDERIZADO DOBLE (ACTIVAS + CERRADAS) ---
function renderAllScholarships(activeData, closedData) {
    const container = document.getElementById('catalogo');
    const countDisplay = document.getElementById('count-display');
    
    if (!container) return;

    container.innerHTML = '';
    
    // Contador total (activas + cerradas para referencia)
    if(countDisplay) countDisplay.textContent = activeData.length;

    // 1. RENDERIZAR ACTIVAS
    if (activeData.length === 0 && closedData.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><h3>No hay becas en la base de datos.</h3></div>`;
        return;
    }

    // Renderizar Activas
    activeData.forEach(beca => createBecaCard(beca, container, false));

    // 2. RENDERIZAR CERRADAS (Si existen)
    if (closedData.length > 0) {
        // Separador visual
        const separator = document.createElement('div');
        separator.style.gridColumn = "1 / -1";
        separator.style.margin = "40px 0 20px 0";
        separator.style.paddingTop = "20px";
        separator.style.borderTop = "2px solid #ddd";
        separator.innerHTML = `
            <h3 style="text-align:center; color:#666;">
                <i class="fas fa-history"></i> Becas Cerradas (Referencia Histórica)
            </h3>
            <p style="text-align:center; font-size:0.9rem; color:#888;">
                Úsalas para prepararte. Suelen abrirse en las mismas fechas el próximo año.
            </p>
        `;
        container.appendChild(separator);

        // Renderizar tarjetas cerradas
        closedData.forEach(beca => createBecaCard(beca, container, true));
    }
}

// Función auxiliar para crear la tarjeta (evita repetir código)
function createBecaCard(beca, container, isClosed) {
    const card = document.createElement('div');
    card.className = 'beca-card';
    
    // Estilos visuales para cerradas
    if (isClosed) {
        card.style.opacity = "0.7";
        card.style.filter = "grayscale(100%)";
        card.style.pointerEvents = "none"; // Desactivar clicks
    }

    const niveles = beca.nivel ? beca.nivel.slice(0, 2) : [];
    const deadlineColor = isClosed ? '#999' : 'var(--danger)';
    const deadlineLabel = isClosed ? 'CERRADA' : beca.deadline;
    const btnText = isClosed ? 'Convocatoria Finalizada' : 'Guardar';
    const btnClass = isClosed ? 'btn-secondary' : (currentUser && userApplications.some(a => a.id === beca.id) ? 'btn-secondary' : 'btn-primary');
    const btnAction = isClosed ? '' : `onclick="${currentUser ? `addToTracker('${beca.id}')` : 'toggleAuthModal()'}"`;
    const iconSaved = currentUser && userApplications.some(a => a.id === beca.id) ? '<i class="fas fa-check"></i> Guardado' : 'Guardar';

    card.innerHTML = `
        <div class="card-body">
            ${isClosed ? '<span class="tag" style="background:#555; color:white;">CERRADA</span>' : '<span class="tag" style="background:#e0f2fe; color:#0369a1;">'+beca.financiamiento+'</span>'}
            <h3 style="margin: 10px 0; font-size: 1.2rem;">${beca.titulo}</h3>
            <p style="color: var(--primary); font-weight: bold;">${beca.institucion}</p>
            <p style="font-size: 0.9rem; color: #666;"><i class="fas fa-map-marker-alt"></i> ${beca.pais}</p>
            
            <div class="card-tags" style="margin-top: 10px;">
                ${niveles.map(n => `<span class="tag">${n}</span>`).join('')}
            </div>
            
            <p style="margin-top: 15px; font-size: 0.85rem; color: ${deadlineColor}; font-weight: bold;">
                <i class="far fa-clock"></i> ${isClosed ? 'Fecha límite pasada' : 'Deadline: ' + beca.deadline}
            </p>
        </div>
        
        <div class="card-footer">
            <a href="${beca.url_convocatoria}" target="_blank" class="btn btn-outline btn-sm" style="${isClosed ? 'pointer-events:auto; opacity:1;' : ''}">Ver Web</a>
            ${currentUser ? 
                `<button class="btn ${btnClass} btn-sm" ${btnAction} style="${isClosed ? 'cursor:not-allowed; background:#ccc;' : ''}">
                    ${isClosed ? 'Cerrada' : iconSaved}
                 </button>` : 
                `<button class="btn btn-secondary btn-sm" onclick="toggleAuthModal()" style="${isClosed ? 'cursor:not-allowed; background:#ccc;' : ''}">Guardar</button>`
            }
        </div>
    `;
    container.appendChild(card);
}

function updateStats() {
    const elBecas = document.getElementById('stat-becas');
    const elPaises = document.getElementById('stat-paises');
    const elUnis = document.getElementById('stat-unis');

    if(elBecas) elBecas.textContent = scholarships.length;
    if(elPaises) {
        const countries = new Set(scholarships.map(s => s.pais)).size;
        elPaises.textContent = countries;
    }
    if(elUnis) {
        const unis = new Set(scholarships.map(s => s.institucion)).size;
        elUnis.textContent = unis;
    }
}

// --- TRACKER & DASHBOARD ---
function addToTracker(id) {
    if (!currentUser) return toggleAuthModal();
    
    const beca = scholarships.find(s => s.id === id);
    if (!beca) return;

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
    renderScholarships(scholarships); 
}

function loadDashboard() {
    if (!currentUser) return;
    
    const dashTotal = document.getElementById('dash-total');
    const dashDocs = document.getElementById('dash-docs');
    
    if(dashTotal) dashTotal.textContent = userApplications.length;
    
    if(dashDocs) {
        const totalDocs = userApplications.length * 4;
        const completedDocs = userApplications.reduce((acc, app) => {
            return acc + Object.values(app.documents).filter(Boolean).length;
        }, 0);
        const percent = totalDocs === 0 ? 0 : Math.round((completedDocs / totalDocs) * 100);
        dashDocs.textContent = `${percent}%`;
    }

    renderTracker();
    renderChart();
}

function renderTracker() {
    const container = document.getElementById('tracker-list');
    if (!container) return;
    
    container.innerHTML = '';

    if (userApplications.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#666; padding:20px;">No tienes becas guardadas aún.</p>';
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
            <div class="checklist-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin:10px 0;">
                ${Object.entries(app.documents).map(([key, val]) => `
                    <label style="font-size:0.8rem; cursor:pointer;">
                        <input type="checkbox" ${val ? 'checked' : ''} onchange="toggleDoc('${app.id}', '${key}')">
                        ${key.charAt(0).toUpperCase() + key.slice(1)}
                    </label>
                `).join('')}
            </div>
            <div style="margin-top:10px; display:flex; gap:5px; flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" style="flex:1;" onclick="openLetterGenerator('${app.id}')">Carta</button>
                <select onchange="updateStatus('${app.id}', this.value)" style="font-size:0.8rem; border-radius:4px; padding:4px;">
                    <option value="Interesado" ${app.status === 'Interesado' ? 'selected' : ''}>Interesado</option>
                    <option value="En Proceso" ${app.status === 'En Proceso' ? 'selected' : ''}>Proceso</option>
                    <option value="Enviada" ${app.status === 'Enviada' ? 'selected' : ''}>Enviada</option>
                    <option value="Aceptada" ${app.status === 'Aceptada' ? 'selected' : ''}>Aceptada</option>
                    <option value="Rechazada" ${app.status === 'Rechazada' ? 'selected' : ''}>Rechazada</option>
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
    const ctxCanvas = document.getElementById('statusChart');
    if (!ctxCanvas) return; // Salir si no hay canvas

    const ctx = ctxCanvas.getContext('2d');
    const counts = { 'Interesado': 0, 'En Proceso': 0, 'Enviada': 0, 'Aceptada': 0, 'Rechazada': 0 };
    
    userApplications.forEach(app => { 
        if(counts[app.status] !== undefined) counts[app.status]++; 
    });

    // Filtrar ceros para que el gráfico se vea limpio
    const labels = Object.keys(counts).filter(k => counts[k] > 0);
    const data = labels.map(k => counts[k]);

    if (window.myChart) window.myChart.destroy();
    
    // Verificar si Chart.js está cargado
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js no está cargado. Incluye el script CDN en index.html");
        return;
    }

    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#94a3b8', '#3b82f6', '#10b981', '#22c55e', '#ef4444']
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// --- MODALES Y COMPARTIR ---
window.toggleAuthModal = () => {
    const modal = document.getElementById('auth-modal');
    if(modal) modal.classList.toggle('hidden');
};

window.toggleAuthMode = () => {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const title = document.getElementById('auth-title');
    
    if (loginForm && regForm && title) {
        if (loginForm.classList.contains('hidden')) {
            loginForm.classList.remove('hidden');
            regForm.classList.add('hidden');
            title.textContent = "Iniciar Sesión";
        } else {
            loginForm.classList.add('hidden');
            regForm.classList.remove('hidden');
            title.textContent = "Crear Cuenta";
        }
    }
};

// Forms (Lógica Corregida para múltiples usuarios)
const loginFormEl = document.getElementById('loginForm');
if(loginFormEl) {
    loginFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPass').value;
        
        // Buscar usuario en la "base de datos" local
        const user = allUsers.find(u => u.email === email && u.pass === pass);
        
        if (user) {
            localStorage.setItem('scholarship_user', JSON.stringify(user));
            checkAuth();
            toggleAuthModal();
            navigate('home'); // O 'dashboard-section'
        } else {
            alert('Credenciales incorrectas o usuario no existe.');
        }
    });
}

const registerFormEl = document.getElementById('registerForm');
if(registerFormEl) {
    registerFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPass').value;
        
        // Verificar si ya existe
        if (allUsers.some(u => u.email === email)) {
            alert('Este correo ya está registrado.');
            return;
        }

        const newUser = { name, email, pass };
        allUsers.push(newUser);
        localStorage.setItem('scholarship_db_users', JSON.stringify(allUsers));
        localStorage.setItem(`apps_${email}`, JSON.stringify([]));
        
        alert('Registro exitoso. Ahora inicia sesión.');
        toggleAuthMode();
    });
}

// Detalle y Compartir
window.openDetailModal = (beca) => {
    currentSharedBeca = beca;
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');
    
    if (!modal || !content) return;

    content.innerHTML = `
        <h2 style="color:var(--primary);">${beca.titulo}</h2>
        <h3>${beca.institucion} 📍 ${beca.pais}</h3>
        <p><strong>Deadline:</strong> ${beca.deadline}</p>
        <p><strong>Nivel:</strong> ${beca.nivel ? beca.nivel.join(', ') : 'N/A'}</p>
        <p><strong>Área:</strong> ${beca.area ? beca.area.join(', ') : 'N/A'}</p>
        <p><strong>Financiamiento:</strong> ${beca.financiamiento}</p>
        <a href="${beca.url_convocatoria}" target="_blank" class="btn btn-primary" style="display:block; text-align:center; margin-top:20px;">Ir a la Convocatoria</a>
    `;
    modal.classList.remove('hidden');
};

window.closeDetailModal = () => {
    const modal = document.getElementById('detail-modal');
    if(modal) modal.classList.add('hidden');
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
    
    const letterModal = document.getElementById('letterModal');
    const letterTitle = document.getElementById('letterTitle');
    const letterContent = document.getElementById('letterContent');

    if(!letterModal || !letterTitle || !letterContent) return;
    
    const letter = `Estimado Comité de Admisiones,

Por medio de la presente expreso mi interés en el programa ${app.titulo} en ${app.institucion}.

Mi motivación principal es... [Completa aquí detallando tu experiencia y por qué este programa es ideal para ti].

Atentamente,
${currentUser.name}`;

    letterTitle.textContent = `Carta: ${app.titulo}`;
    letterContent.value = letter;
    letterModal.classList.remove('hidden');
};

window.closeLetterModal = () => {
    const modal = document.getElementById('letterModal');
    if(modal) modal.classList.add('hidden');
};

window.copyLetter = () => {
    const txt = document.getElementById('letterContent');
    if(txt) {
        txt.select();
        document.execCommand('copy');
        alert('Carta copiada');
    }
};
