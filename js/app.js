// --- ESTADO GLOBAL ---
let scholarships = [];
let allScholarshipsRaw = []; // Guardamos TODAS las becas (activas y cerradas)
let currentUser = null;
let userApplications = [];
let currentSharedBeca = null;
let allUsers = JSON.parse(localStorage.getItem('scholarship_db_users')) || [];

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Iniciando ScholarHub...");
    loadScholarships();
    checkAuth();
    setupEventListeners();
});

// --- CARGA DE DATOS (FORZADA) ---
async function loadScholarships() {
    const container = document.getElementById('catalogo');
    try {
        console.log("📡 Cargando becas.json...");
        const response = await fetch('./data/becas.json');
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("El archivo JSON está vacío o no es un array.");
        }

        allScholarshipsRaw = data; // Guardamos todo
        console.log(`✅ ${data.length} becas cargadas correctamente.`);

        // Separamos activas y cerradas basándonos en la fecha de HOY
        const todayStr = new Date().toISOString().split('T')[0];
        
        scholarships = allScholarshipsRaw.filter(b => {
            // Si no tiene deadline, asumimos que está activa
            if (!b.deadline) return true;
            return b.deadline >= todayStr;
        });

        const closedScholarships = allScholarshipsRaw.filter(b => {
            if (!b.deadline) return false;
            return b.deadline < todayStr;
        });

        console.log(`📊 Activas: ${scholarships.length}, Cerradas: ${closedScholarships.length}`);

        // Renderizamos primero las activas
        renderScholarships(scholarships, false);

        // Si hay cerradas, añadimos un separador y las renderizamos debajo
        if (closedScholarships.length > 0) {
            const separator = document.createElement('div');
            separator.style.gridColumn = "1 / -1";
            separator.style.marginTop = "40px";
            separator.style.marginBottom = "20px";
            separator.innerHTML = `
                <h3 style="text-align:center; color:#666; border-bottom: 2px solid #eee; padding-bottom:10px;">
                    🕰️ Convocatorias Cerradas (Referencia Histórica)
                </h3>
                <p style="text-align:center; font-size:0.9rem; color:#888;">Úsalas para preparar tus documentos para el próximo ciclo.</p>
            `;
            container.appendChild(separator);
            renderScholarships(closedScholarships, true); // true = son cerradas
        }

        updateStats();

    } catch (error) {
        console.error('❌ Error crítico:', error);
        if(container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: #fee2e2; border-radius: 8px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 15px;"></i>
                    <h3>Error al cargar las becas</h3>
                    <p style="color: #666; margin-bottom: 10px;">${error.message}</p>
                    <p>Verifica que el archivo <code>data/becas.json</code> exista y tenga formato válido.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Recargar</button>
                </div>`;
        }
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
    console.log(`Navegando a: ${viewId}`);
    const sections = document.querySelectorAll('.view-section');
    const navLinks = document.getElementById('nav-links');
    
    sections.forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });
    
    const target = document.getElementById(viewId);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active'); // Aseguramos que tenga active
    } else {
        console.error(`No se encontró la sección: ${viewId}`);
    }
    
    if(navLinks) navLinks.classList.remove('active');
    
    if (viewId === 'dashboard-section') loadDashboard();
    window.scrollTo(0, 0);
};

window.toggleMenu = () => {
    const nav = document.getElementById('nav-links');
    if(nav) nav.classList.toggle('active');
};

// --- FILTROS ---
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
    // Obtenemos valores seguros
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : 'all';
    };

    const term = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const type = getVal('filterType');
    const level = getVal('filterLevel');
    const area = getVal('filterArea');
    const country = getVal('filterCountry');
    const sort = getVal('filterSort');

    // Filtramos sobre TODAS las becas (activas y cerradas) para que el buscador funcione en histórico
    let filtered = allScholarshipsRaw.filter(beca => {
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

    // Ordenamiento
    if (sort === 'deadline') {
        filtered.sort((a, b) => new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31'));
    } else if (sort === 'recent') {
        filtered = [...filtered].reverse(); 
    } else if (sort === 'alpha') {
        filtered.sort((a, b) => a.titulo.localeCompare(b.titulo));
    }

    // Limpiamos el contenedor antes de volver a renderizar todo junto o separado?
    // Para simplificar filtros globales, renderizamos todo junto si hay búsqueda, 
    // sino mantenemos la lógica de separación.
    
    const container = document.getElementById('catalogo');
    container.innerHTML = ''; // Limpiar
    
    // Si hay término de búsqueda, mostramos todo mezclado
    if (term !== '' || type !== 'all' || level !== 'all' || area !== 'all' || country !== 'all') {
         renderScholarships(filtered, false); // Renderizamos resultado único
    } else {
        // Si no hay filtros, restauramos vista dividida (Activas | Cerradas)
        const todayStr = new Date().toISOString().split('T')[0];
        const active = filtered.filter(b => !b.deadline || b.deadline >= todayStr);
        const closed = filtered.filter(b => b.deadline && b.deadline < todayStr);

        renderScholarships(active, false);
        
        if (closed.length > 0) {
            const separator = document.createElement('div');
            separator.style.gridColumn = "1 / -1";
            separator.style.marginTop = "40px";
            separator.style.marginBottom = "20px";
            separator.innerHTML = `<h3 style="text-align:center; color:#666;">Convocatorias Cerradas</h3>`;
            container.appendChild(separator);
            renderScholarships(closed, true);
        }
    }
    
    // Actualizar contador
    const countDisplay = document.getElementById('count-display');
    if(countDisplay) countDisplay.textContent = filtered.length;
}

// --- RENDERIZADO MEJORADO ---
function renderScholarships(data, isClosedList = false) {
    const container = document.getElementById('catalogo');
    if (!container) return;

    if (data.length === 0 && !isClosedList) {
        // Solo mostramos mensaje si no hay nada y no es la lista de cerradas
        if(container.children.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                    <h3>No se encontraron resultados</h3>
                    <p>Intenta ajustar los filtros.</p>
                </div>`;
        }
        return;
    }

    data.forEach(beca => {
        const isSaved = currentUser && userApplications.some(a => a.id === beca.id);
        const card = document.createElement('div');
        card.className = 'beca-card';
        
        // Estilos para cerradas
        if (isClosedList) {
            card.style.opacity = "0.7";
            card.style.filter = "grayscale(80%)";
            card.style.pointerEvents = "none"; // Desactivar clicks en toda la tarjeta
        }

        const niveles = beca.nivel ? beca.nivel.slice(0, 2) : [];
        const deadlineStatus = isClosedList ? "CERRADA" : beca.deadline;
        const deadlineColor = isClosedList ? "#666" : "var(--danger)";

        card.innerHTML = `
            <div class="card-body">
                <span class="tag" style="background:#e0f2fe; color:#0369a1;">${beca.financiamiento}</span>
                ${isClosedList ? '<span class="tag" style="background:#555; color:white; margin-left:5px;">Cerrada</span>' : ''}
                <h3 style="margin: 10px 0; font-size: 1.2rem;">${beca.titulo}</h3>
                <p style="color: var(--primary); font-weight: bold;">${beca.institucion}</p>
                <p style="font-size: 0.9rem; color: #666;"><i class="fas fa-map-marker-alt"></i> ${beca.pais}</p>
                
                <div class="card-tags" style="margin-top: 10px;">
                    ${niveles.map(n => `<span class="tag">${n}</span>`).join('')}
                </div>
                
                <p style="margin-top: 15px; font-size: 0.85rem; color: ${deadlineColor}; font-weight: bold;">
                    <i class="far fa-clock"></i> ${isClosedList ? 'Convocatoria Finalizada' : 'Deadline: ' + beca.deadline}
                </p>
            </div>
            
            <div class="card-footer">
                <a href="${beca.url_convocatoria}" target="_blank" class="btn btn-outline btn-sm" ${isClosedList ? 'style="pointer-events:auto;"' : ''}>Ver Web</a>
                ${!isClosedList ? (
                    currentUser ? 
                    `<button class="btn ${isSaved ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="addToTracker('${beca.id}')">
                        ${isSaved ? '<i class="fas fa-check"></i> Guardado' : 'Guardar'}
                     </button>` : 
                    `<button class="btn btn-secondary btn-sm" onclick="toggleAuthModal()">Guardar</button>`
                ) : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

function updateStats() {
    const elBecas = document.getElementById('stat-becas');
    const elPaises = document.getElementById('stat-paises');
    const elUnis = document.getElementById('stat-unis');

    if(elBecas) elBecas.textContent = scholarships.length;
    if(elPaises) {
        const countries = new Set(allScholarshipsRaw.map(s => s.pais)).size;
        elPaises.textContent = countries;
    }
    if(elUnis) {
        const unis = new Set(allScholarshipsRaw.map(s => s.institucion)).size;
        elUnis.textContent = unis;
    }
}

// --- TRACKER & DASHBOARD ---
function addToTracker(id) {
    if (!currentUser) return toggleAuthModal();
    const beca = allScholarshipsRaw.find(s => s.id === id);
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
    // Recargar vista actual para actualizar botón
    applyFilters(); 
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
    if (!ctxCanvas) return;

    const ctx = ctxCanvas.getContext('2d');
    const counts = { 'Interesado': 0, 'En Proceso': 0, 'Enviada': 0, 'Aceptada': 0, 'Rechazada': 0 };
    
    userApplications.forEach(app => { 
        if(counts[app.status] !== undefined) counts[app.status]++; 
    });

    const labels = Object.keys(counts).filter(k => counts[k] > 0);
    const data = labels.map(k => counts[k]);

    if (window.myChart) window.myChart.destroy();
    
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js no está cargado.");
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

const loginFormEl = document.getElementById('loginForm');
if(loginFormEl) {
    loginFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPass').value;
        const user = allUsers.find(u => u.email === email && u.pass === pass);
        
        if (user) {
            localStorage.setItem('scholarship_user', JSON.stringify(user));
            checkAuth();
            toggleAuthModal();
            navigate('home');
        } else {
            alert('Credenciales incorrectas.');
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

window.openLetterGenerator = (id) => {
    const app = userApplications.find(a => a.id === id);
    if (!app) return;
    const letterModal = document.getElementById('letterModal');
    const letterTitle = document.getElementById('letterTitle');
    const letterContent = document.getElementById('letterContent');
    if(!letterModal || !letterTitle || !letterContent) return;
    
    const letter = `Estimado Comité de Admisiones,\n\nPor medio de la presente expreso mi interés en el programa ${app.titulo} en ${app.institucion}.\n\nMi motivación principal es...\n\nAtentamente,\n${currentUser.name}`;
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
