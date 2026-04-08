// --- ESTADO GLOBAL ---
let currentUser = null;
let scholarships = [];
let userApplications = [];
let isLogin = true;
let myChart = null;
let currentAppId = null; // ID de la beca seleccionada para cartas

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
        scholarships = await response.json();
        renderScholarships(scholarships);
        updateStats();
    } catch (error) {
        console.error('Error cargando becas:', error);
        document.getElementById('catalogo').innerHTML = '<p>Error cargando datos. Usa un servidor local.</p>';
    }
}

// --- AUTENTICACIÓN Y MENÚ (CORREGIDO) ---
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
    const container = document.getElementById('auth-section');
    // Limpiamos y reconstruimos solo la parte dinámica
    if (isLoggedIn) {
        container.innerHTML = `
            <a href="#" onclick="navigate('dashboard-section')" style="color:var(--primary); font-weight:bold;">Mi Panel</a>
        `;
        document.getElementById('userNameDisplay').textContent = currentUser.name;
    } else {
        container.innerHTML = `
            <button class="btn btn-primary btn-sm" onclick="toggleAuthModal()">Login / Registro</button>
        `;
    }
}

function toggleAuthModal() {
    document.getElementById('auth-modal').classList.toggle('hidden');
}

function toggleAuthMode() {
    isLogin = !isLogin;
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const title = document.getElementById('auth-title');
    
    if (isLogin) {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        title.textContent = "Iniciar Sesión";
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        title.textContent = "Crear Cuenta";
    }
}

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    
    const storedUser = localStorage.getItem('scholarship_user');
    // Validación simple: si existe el usuario en LS y coincide pass
    // Nota: En registro guardamos user_${email}, aquí verificamos contra la sesión activa o recreamos
    const userData = localStorage.getItem(`user_${email}`); 
    
    if (userData) {
        const user = JSON.parse(userData);
        if (user.pass === pass) {
            loginUser(user);
        } else {
            alert('Contraseña incorrecta');
        }
    } else if (storedUser && JSON.parse(storedUser).email === email && JSON.parse(storedUser).pass === pass) {
         // Fallback para sesiones antiguas
         loginUser(JSON.parse(storedUser));
    } else {
        alert('Usuario no encontrado. Regístrate primero.');
    }
});

document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;

    if (localStorage.getItem(`user_${email}`)) {
        alert('Este email ya está registrado.');
        return;
    }

    const user = { name, email, pass };
    localStorage.setItem(`user_${email}`, JSON.stringify(user));
    localStorage.setItem(`apps_${email}`, JSON.stringify([])); // Inicializar apps
    
    alert('Registro exitoso. Iniciando sesión...');
    loginUser(user);
});

function loginUser(user) {
    currentUser = user;
    localStorage.setItem('scholarship_user', JSON.stringify(user));
    toggleAuthModal();
    updateNav(true);
    navigate('dashboard-section');
}

function logout() {
    localStorage.removeItem('scholarship_user');
    currentUser = null;
    updateNav(false);
    navigate('home');
}

// --- NAVEGACIÓN ---
window.navigate = (sectionId) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(sectionId);
    if(target) target.classList.remove('hidden');
    
    if (sectionId === 'dashboard-section' && currentUser) {
        loadUserDashboard();
    }
    document.getElementById('nav-links').classList.remove('active');
    window.scrollTo(0,0);
};

window.toggleMenu = () => {
    document.getElementById('nav-links').classList.toggle('active');
};

// --- RENDERIZADO DE BECAS ---
function renderScholarships(data) {
    const container = document.getElementById('catalogo');
    container.innerHTML = '';
    if (data.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No se encontraron becas.</p>';
        return;
    }

    data.forEach(beca => {
        const isSaved = currentUser && userApplications.some(a => a.id === beca.id);
        const card = document.createElement('div');
        card.className = 'beca-card';
        card.innerHTML = `
            <div class="card-body">
                <span class="tag">${beca.financiamiento}</span>
                <h3 style="margin: 10px 0;">${beca.titulo}</h3>
                <p style="color: var(--primary); font-weight: bold;">${beca.institucion}</p>
                <p style="font-size: 0.9rem; color: #666;"><i class="fas fa-map-marker-alt"></i> ${beca.pais}</p>
                <div class="card-tags">${beca.nivel.map(n => `<span class="tag">${n}</span>`).join('')}</div>
                <p style="margin-top: 10px; font-size: 0.9rem;"><i class="far fa-clock"></i> ${beca.deadline}</p>
            </div>
            <div class="card-footer">
                <a href="${beca.url_convocatoria}" target="_blank" class="btn btn-outline btn-sm">Ver Web</a>
                ${currentUser ? 
                    `<button class="btn ${isSaved ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="addToTracker('${beca.id}')">
                        ${isSaved ? '<i class="fas fa-check"></i> Guardado' : 'Guardar'}
                     </button>` : 
                    `<button class="btn btn-secondary btn-sm" style="background:#ccc" onclick="toggleAuthModal()">Guardar</button>`
                }
            </div>
        `;
        container.appendChild(card);
    });
}

function updateStats() {
    document.getElementById('stat-becas').textContent = scholarships.length;
    document.getElementById('stat-paises').textContent = new Set(scholarships.map(s => s.pais)).size;
    document.getElementById('stat-unis').textContent = new Set(scholarships.map(s => s.institucion)).size;
}

// --- FILTROS ---
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = scholarships.filter(b => 
            b.titulo.toLowerCase().includes(term) || b.institucion.toLowerCase().includes(term) || b.pais.toLowerCase().includes(term)
        );
        renderScholarships(filtered);
    });
    document.querySelectorAll('.filter-select').forEach(select => {
        select.addEventListener('change', applyFilters);
    });
}

function applyFilters() {
    const level = document.getElementById('filterLevel').value;
    const area = document.getElementById('filterArea').value;
    const sort = document.getElementById('filterSort').value;

    let filtered = scholarships.filter(b => {
        const matchLevel = level === 'all' || b.nivel.includes(level);
        const matchArea = area === 'all' || b.area.includes(area);
        return matchLevel && matchArea;
    });

    if (sort === 'deadline') filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    renderScholarships(filtered);
}

// --- TRACKER & DASHBOARD ---
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
    renderScholarships(scholarships); // Re-render catálogo para actualizar botones
}

function addToTracker(id) {
    const beca = scholarships.find(s => s.id === id);
    const apps = getUserApps();
    
    if (apps.find(a => a.id === id)) {
        // Si ya existe, la quitamos (toggle)
        if(confirm('¿Quieres eliminar esta beca de tu tracker?')) {
            const newApps = apps.filter(a => a.id !== id);
            saveUserApps(newApps);
        }
        return;
    }

    const newApp = {
        ...beca,
        status: 'Interesado',
        documents: { cv: false, carta: false, recomendaciones: false, idiomas: false },
        notes: ''
    };

    apps.push(newApp);
    saveUserApps(apps);
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
        container.innerHTML = '<div class="text-center py-10"><p>Aún no has guardado becas. Ve al catálogo.</p></div>';
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
                <div><h4>${app.titulo}</h4><p style="font-size:0.85rem; color:#666;">${app.institucion}</p></div>
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
                <button class="btn btn-primary btn-sm" style="flex:1;" onclick="openLetterModal('${app.id}')"><i class="fas fa-magic"></i> Redactar</button>
                <button class="btn btn-outline btn-sm" style="flex:1;" onclick="document.getElementById('notes-${app.id}').classList.toggle('hidden')">Notas</button>
            </div>
            <textarea id="notes-${app.id}" class="w-full mt-2 text-xs p-2 border rounded hidden bg-yellow-50" rows="2" 
                      onchange="saveNotes('${app.id}', this.value)" style="width:100%; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px;">${app.notes || ''}</textarea>
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

function saveNotes(id, notes) {
    const apps = getUserApps();
    const app = apps.find(a => a.id === id);
    if (app) { app.notes = notes; saveUserApps(apps); }
}

// --- GRÁFICA ---
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

// --- GENERADOR DE CARTAS MEJORADO (3 PLANTILLAS) ---
window.openLetterModal = (id) => {
    currentAppId = id;
    const app = userApplications.find(a => a.id === id);
    if (!app) return;
    
    // Resetear campos
    document.getElementById('custom-achievement').value = '';
    document.getElementById('letterModal').classList.remove('hidden');
    
    // Cargar plantilla por defecto (Motivación)
    loadTemplate('motivation');
};

window.loadTemplate = (type) => {
    const app = userApplications.find(a => a.id === currentAppId);
    const achievement = document.getElementById('custom-achievement').value;
    const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    let content = '';

    if (type === 'motivation') {
        content = `
${date}

Comité de Admisiones
${app.institucion}
${app.pais}

Estimados miembros del comité:

Por medio de la presente, expreso mi firme interés en aplicar al programa de ${app.nivel.join(' / ')} en ${app.titulo}. Como profesional apasionado por el área de ${app.area[0]}, considero que esta oportunidad es el paso ideal para mi desarrollo académico.

${achievement ? `Durante mi trayectoria, he logrado destacar por: ${achievement}, lo cual demuestra mi compromiso y capacidad para enfrentar los retos que su programa ofrece.` : 'Mi trayectoria académica y mis objetivos se alinean perfectamente con los valores de excelencia e innovación de su institución.'}

Estoy particularmente interesado en contribuir al campo de ${app.tags ? app.tags.join(', ') : 'ciencia y tecnología'}, área en la que he dedicado esfuerzos constantes para mejorar mis competencias. El financiamiento de tipo "${app.financiamiento}" sería fundamental para dedicarme de lleno a la investigación.

Agradezco de antemano su tiempo y consideración.

Atentamente,

${currentUser.name}
${currentUser.email}
        `;
    } else if (type === 'recommendation') {
        content = `
${date}

Estimado/a Profesor/a [Apellido del Profesor]:

Espero que este mensaje le encuentre bien. Soy ${currentUser.name}, ex-alumno de su curso de [Nombre del Curso].

Le escribo porque estoy aplicando a la beca ${app.titulo} en ${app.institucion} (${app.pais}), y necesito una carta de recomendación académica. Su clase fue fundamental para mi interés en ${app.area[0]}, y creo que usted es la persona ideal para dar fe de mi desempeño.

${achievement ? `Recientemente he logrado ${achievement}, y me gustaría mencionar este hito en mi aplicación.` : ''}

La fecha límite es el ${app.deadline}. ¿Estaría dispuesto/a a escribir una carta a mi favor? Quedo a su entera disposición para enviarle mi CV o cualquier información adicional que requiera.

Muchas gracias por su apoyo.

Atentamente,

${currentUser.name}
        `;
    } else if (type === 'email') {
        content = `
Asunto: Consulta sobre oportunidad de investigación - ${currentUser.name}

Estimado Dr./Dra. [Apellido]:

Mi nombre es ${currentUser.name} y soy estudiante/profesional en el área de ${app.area[0]}. He leído con gran interés sus publicaciones sobre [Tema específico del profesor] y me gustaría consultar si tiene disponibilidad para aceptar estudiantes de ${app.nivel[0]} en su grupo de investigación para el próximo ciclo.

Actualmente estoy postulando a la beca ${app.titulo} que financiaría mis estudios en ${app.institucion}. ${achievement ? `Cuento con experiencia previa en ${achievement}.` : ''}

Adjunto mi CV para que pueda revisar mi perfil. Agradezco mucho su tiempo y quedo atento a sus comentarios.

Saludos cordiales,

${currentUser.name}
${currentUser.email}
        `;
    }

    document.getElementById('letterContent').value = content.trim();
};

window.copyLetter = () => {
    const content = document.getElementById('letterContent');
    content.select();
    document.execCommand('copy');
    alert('Texto copiado al portapapeles. ¡Éxito con tu postulación!');
    closeLetterModal();
};

window.closeLetterModal = () => {
    document.getElementById('letterModal').classList.add('hidden');
};