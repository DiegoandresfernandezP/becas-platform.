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

// --- CARGA DE DATOS (CON HISTORIAL INTELIGENTE) ---
async function loadScholarships() {
    try {
        const response = await fetch('./data/becas.json');
        if (!response.ok) throw new Error('Error al cargar JSON');
        
        let allScholarships = await response.json();
        const todayStr = new Date().toISOString().split('T')[0];
        
        // 1. Separar en Activas y Cerradas
        const active = allScholarships.filter(b => b.deadline >= todayStr);
        const closed = allScholarships.filter(b => b.deadline < todayStr);
        
        // 2. Ordenar activas por urgencia
        active.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        // Opcional: Ordenar cerradas por fecha reciente primero (para ver las más nuevas históricamente)
        closed.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
        
        const container = document.getElementById('catalogo');
        if (!container) return;

        container.innerHTML = ''; // Limpiar contenedor

        // 3. Renderizar ACTIVAS
        if (active.length > 0) {
            // Título de sección activa
            const headerActive = document.createElement('div');
            headerActive.className = 'section-header';
            headerActive.style.gridColumn = "1 / -1";
            headerActive.style.marginBottom = "20px";
            headerActive.innerHTML = `<h2 style="color: var(--primary);"><i class="fas fa-clock"></i> Convocatorias Abiertas (${active.length})</h2>`;
            container.appendChild(headerActive);

            renderScholarships(active, false, container); // false = no es cerrada
        } else {
            container.innerHTML += `<div style="grid-column:1/-1; text-align:center; padding:20px;">No hay becas activas en este momento.</div>`;
        }
        
        // 4. Renderizar CERRADAS (Historial)
        if (closed.length > 0) {
            const separator = document.createElement('div');
            separator.style.gridColumn = "1 / -1";
            separator.style.margin = "60px 0 30px";
            separator.style.padding = "30px";
            separator.style.background = "linear-gradient(to right, #f9fafb, #f3f4f6)";
            separator.style.borderLeft = "5px solid #9ca3af";
            separator.style.borderRadius = "8px";
            separator.innerHTML = `
                <h3 style="color: #4b5563; margin-bottom: 10px; font-size: 1.3rem;">
                    <i class="fas fa-archive"></i> Historial de Convocatorias Cerradas
                </h3>
                <p style="font-size: 0.95rem; color: #6b7280; max-width: 800px; margin: 0 auto;">
                    Estas becas ya finalizaron su ciclo actual. Úsalas como <strong>referencia</strong> para revisar los requisitos, documentos y fechas típicas, y así prepararte con anticipación para la próxima edición.
                </p>
            `;
            container.appendChild(separator);
            
            renderScholarships(closed, true, container); // true = modo cerrado
        }
        
        updateStats(active.length); // Stats basadas solo en activas
        
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
    const term = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const type = document.getElementById('filterType')?.value || 'all';
    const level = document.getElementById('filterLevel')?.value || 'all';
    const area = document.getElementById('filterArea')?.value || 'all';
    const country = document.getElementById('filterCountry')?.value || 'all';
    const sort = document.getElementById('filterSort')?.value || 'default';

    let filtered = scholarships.filter(beca => {
        const matchText = beca.titulo.toLowerCase().includes(term) || 
                          beca.institucion.toLowerCase().includes(term) ||
                          beca.pais.toLowerCase().includes(term) ||
                          (beca.tags && beca.tags.some(t => t.toLowerCase().includes(term)));

        const becaType = beca.tipo || 'Beca'; 
        const matchType = type === 'all' || becaType === type;
        const matchLevel = level === 'all' || (beca.nivel && beca.nivel.includes(level));
        const matchArea = area === 'all' || (beca.area && (beca.area.includes(area) || beca.area.some(a => a.includes(area))));
        const matchCountry = country === 'all' || beca.pais === country || 
                             (country === 'Europa' && beca.pais.includes('Europa')); // Lógica simple para Europa

        return matchText && matchType && matchLevel && matchArea && matchCountry;
    });

    if (sort === 'deadline') {
        filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sort === 'recent') {
        filtered = [...filtered].reverse(); 
    } else if (sort === 'alpha') {
        filtered.sort((a, b) => a.titulo.localeCompare(b.titulo));
    }

    renderScholarships(filtered);
}

// --- RENDERIZADO (MEJORADO PARA CERRADAS) ---
// Nota: Ahora recibe 'container' como argumento para hacer append directo
function renderScholarships(data, isClosed = false, container = null) {
    // Si no se pasa container, usamos el global (para retrocompatibilidad si se llama desde filtros)
    const targetContainer = container || document.getElementById('catalogo');
    const countDisplay = document.getElementById('count-display');
    
    // Solo actualizamos el contador global si NO es una sección de cerradas
    if (!isClosed && countDisplay) {
        countDisplay.textContent = data.length;
    }

    if (data.length === 0 && !container) {
        // Solo mostrar mensaje de "no encontrado" si estamos filtrando todo el catálogo
        targetContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                <h3>No se encontraron resultados</h3>
                <p>Intenta ajustar los filtros.</p>
            </div>`;
        return;
    }

    data.forEach(beca => {
        const isSaved = currentUser && userApplications.some(a => a.id === beca.id);
        const card = document.createElement('div');
        card.className = `beca-card ${isClosed ? 'beca-card-closed' : ''}`;
        
        // Estilos específicos si está cerrada (opacidad o borde gris)
        if (isClosed) {
            card.style.opacity = "0.85";
            card.style.borderColor = "#e5e7eb";
        }

        const niveles = beca.nivel ? beca.nivel.slice(0, 2) : [];
        
        // Lógica de botones según estado
        let actionButtonHTML = '';
        let webButtonHTML = '';

        if (isClosed) {
            // Botón Guardado DESACTIVADO
            actionButtonHTML = `<button class="btn btn-secondary btn-sm" disabled style="cursor: not-allowed; opacity: 0.6;"><i class="fas fa-lock"></i> Cerrado</button>`;
            // Botón Web (Opcional: podrías cambiar el texto a "Ver Info")
            webButtonHTML = `<a href="${beca.url_convocatoria}" target="_blank" class="btn btn-outline btn-sm" style="filter: grayscale(100%);">Ver Info</a>`;
        } else {
            // Lógica normal para activas
            if (currentUser) {
                actionButtonHTML = `<button class="btn ${isSaved ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="addToTracker('${beca.id}')">
                        ${isSaved ? '<i class="fas fa-check"></i> Guardado' : 'Guardar'}
                     </button>`;
            } else {
                actionButtonHTML = `<button class="btn btn-secondary btn-sm" onclick="toggleAuthModal()">Guardar</button>`;
            }
            webButtonHTML = `<a href="${beca.url_convocatoria}" target="_blank" class="btn btn-outline btn-sm">Ver Web</a>`;
        }

        // Etiqueta de estado en la esquina
        const statusBadge = isClosed 
            ? `<span style="position:absolute; top:10px; right:10px; background:#ef4444; color:white; padding:4px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold;">CERRADO</span>` 
            : `<span style="position:absolute; top:10px; right:10px; background:#10b981; color:white; padding:4px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold;">ABIERTO</span>`;

        card.innerHTML = `
            <div class="card-body" style="position:relative;">
                ${statusBadge}
                <span class="tag" style="background:#e0f2fe; color:#0369a1;">${beca.financiamiento}</span>
                <h3 style="margin: 10px 0; font-size: 1.2rem; ${isClosed ? 'color:#6b7280;' : ''}">${beca.titulo}</h3>
                <p style="color: var(--primary); font-weight: bold;">${beca.institucion}</p>
                <p style="font-size: 0.9rem; color: #666;"><i class="fas fa-map-marker-alt"></i> ${beca.pais}</p>
                
                <div class="card-tags" style="margin-top: 10px;">
                    ${niveles.map(n => `<span class="tag">${n}</span>`).join('')}
                </div>
                
                <p style="margin-top: 15px; font-size: 0.85rem; color: ${isClosed ? '#9ca3af' : 'var(--danger)'}; font-weight: bold;">
                    <i class="far fa-clock"></i> Deadline: ${beca.deadline}
                </p>
            </div>
            
            <div class="card-footer">
                ${webButtonHTML}
                ${actionButtonHTML}
            </div>
        `;
        targetContainer.appendChild(card);
    });
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
