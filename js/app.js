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

// --- CARGA DE DATOS ---
async function loadScholarships() {
try {
@@ -44,7 +56,7 @@
}
}

// --- AUTENTICACIÓN ---
// --- AUTENTICACIÓN (CORREGIDA PARA MÚLTIPLES USUARIOS) ---
function checkAuth() {
const storedUser = localStorage.getItem('scholarship_user');
if (storedUser) {
@@ -58,14 +70,16 @@

function updateNav(isLoggedIn) {
const container = document.getElementById('auth-buttons');
    if(!container) return;
    const nameDisplay = document.getElementById('userNameDisplay');
    
    if (!container) return;

if (isLoggedIn) {
container.innerHTML = `
            <a href="#" onclick="navigate('dashboard-section')" style="color:var(--primary); font-weight:bold;">Mi Panel</a>
            <button class="btn btn-outline btn-sm" onclick="logout()" style="margin-left:10px;">Salir</button>
            <a href="#" onclick="navigate('dashboard-section')" style="color:var(--primary); font-weight:bold; margin-right:10px;">Mi Panel</a>
            <span style="margin-right:10px; font-size:0.9rem;">Hola, ${currentUser.name.split(' ')[0]}</span>
            <button class="btn btn-outline btn-sm" onclick="logout()">Salir</button>
       `;
        const nameDisplay = document.getElementById('userNameDisplay');
if(nameDisplay) nameDisplay.textContent = currentUser.name.split(' ')[0];
} else {
container.innerHTML = `<button class="btn btn-primary btn-sm" onclick="toggleAuthModal()">Login / Registro</button>`;
@@ -74,28 +88,29 @@

function logout() {
localStorage.removeItem('scholarship_user');
    currentUser = null;
    userApplications = [];
location.reload();
}

// --- NAVEGACIÓN ---
window.navigate = (viewId) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const sections = document.querySelectorAll('.view-section');
    const navLinks = document.getElementById('nav-links');
    
    sections.forEach(el => el.classList.add('hidden'));
const target = document.getElementById(viewId);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active'); // Asegurar clase active
    }
    if(target) target.classList.remove('hidden');

    const navLinks = document.getElementById('nav-links');
if(navLinks) navLinks.classList.remove('active');

if (viewId === 'dashboard-section') loadDashboard();
window.scrollTo(0, 0);
};

window.toggleMenu = () => {
    const navLinks = document.getElementById('nav-links');
    if(navLinks) navLinks.classList.toggle('active');
    const nav = document.getElementById('nav-links');
    if(nav) nav.classList.toggle('active');
};

// --- FILTROS Y BÚSQUEDA ---
@@ -104,32 +119,19 @@
if(searchInput) searchInput.addEventListener('input', applyFilters);

const ids = ['filterLevel', 'filterType', 'filterArea', 'filterCountry', 'filterSort'];
    
ids.forEach(id => {
const el = document.getElementById(id);
        if(el) {
            el.addEventListener('change', applyFilters);
        }
        if(el) el.addEventListener('change', applyFilters);
});
}

function applyFilters() {
    const term = (document.getElementById('searchInput').value || '').toLowerCase();
    
    const typeEl = document.getElementById('filterType');
    const type = typeEl ? typeEl.value : 'all';
    
    const levelEl = document.getElementById('filterLevel');
    const level = levelEl ? levelEl.value : 'all';
    
    const areaEl = document.getElementById('filterArea');
    const area = areaEl ? areaEl.value : 'all';
    
    const countryEl = document.getElementById('filterCountry');
    const country = countryEl ? countryEl.value : 'all';
    
    const sortEl = document.getElementById('filterSort');
    const sort = sortEl ? sortEl.value : 'default';
    const term = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const type = document.getElementById('filterType')?.value || 'all';
    const level = document.getElementById('filterLevel')?.value || 'all';
    const area = document.getElementById('filterArea')?.value || 'all';
    const country = document.getElementById('filterCountry')?.value || 'all';
    const sort = document.getElementById('filterSort')?.value || 'default';

let filtered = scholarships.filter(beca => {
const matchText = beca.titulo.toLowerCase().includes(term) || 
@@ -139,13 +141,10 @@

const becaType = beca.tipo || 'Beca'; 
const matchType = type === 'all' || becaType === type;

const matchLevel = level === 'all' || (beca.nivel && beca.nivel.includes(level));

const matchArea = area === 'all' || (beca.area && (beca.area.includes(area) || beca.area.some(a => a.includes(area))));

const matchCountry = country === 'all' || beca.pais === country || 
                             (country === 'Europa' && beca.pais.includes('Europa'));
                             (country === 'Europa' && beca.pais.includes('Europa')); // Lógica simple para Europa

return matchText && matchType && matchLevel && matchArea && matchCountry;
});
@@ -176,7 +175,7 @@
           <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
               <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
               <h3>No se encontraron resultados</h3>
                <p>Intenta ajustar los filtros o buscar otro término.</p>
                <p>Intenta ajustar los filtros.</p>
           </div>`;
return;
}
@@ -186,6 +185,9 @@
const card = document.createElement('div');
card.className = 'beca-card';

        // Protección si nivel es undefined
        const niveles = beca.nivel ? beca.nivel.slice(0, 2) : [];

card.innerHTML = `
           <div class="card-body">
               <span class="tag" style="background:#e0f2fe; color:#0369a1;">${beca.financiamiento}</span>
@@ -194,7 +196,7 @@
               <p style="font-size: 0.9rem; color: #666;"><i class="fas fa-map-marker-alt"></i> ${beca.pais}</p>
               
               <div class="card-tags" style="margin-top: 10px;">
                    ${beca.nivel.slice(0, 2).map(n => `<span class="tag">${n}</span>`).join('')}
                    ${niveles.map(n => `<span class="tag">${n}</span>`).join('')}
               </div>
               
               <p style="margin-top: 15px; font-size: 0.85rem; color: var(--danger); font-weight: bold;">
@@ -217,18 +219,18 @@
}

function updateStats() {
    const statBecas = document.getElementById('stat-becas');
    const statPaises = document.getElementById('stat-paises');
    const statUnis = document.getElementById('stat-unis');
    const elBecas = document.getElementById('stat-becas');
    const elPaises = document.getElementById('stat-paises');
    const elUnis = document.getElementById('stat-unis');

    if(statBecas) statBecas.textContent = scholarships.length;
    if(statPaises) {
    if(elBecas) elBecas.textContent = scholarships.length;
    if(elPaises) {
const countries = new Set(scholarships.map(s => s.pais)).size;
        statPaises.textContent = countries;
        elPaises.textContent = countries;
}
    if(statUnis) {
    if(elUnis) {
const unis = new Set(scholarships.map(s => s.institucion)).size;
        statUnis.textContent = unis;
        elUnis.textContent = unis;
}
}

@@ -254,7 +256,7 @@
userApplications.push(newApp);
localStorage.setItem(`apps_${currentUser.email}`, JSON.stringify(userApplications));
alert('¡Beca guardada en tu tracker!');
    renderScholarships(scholarships);
    renderScholarships(scholarships); 
}

function loadDashboard() {
@@ -265,26 +267,27 @@

if(dashTotal) dashTotal.textContent = userApplications.length;

    const totalDocs = userApplications.length * 4;
    const completedDocs = userApplications.reduce((acc, app) => {
        return acc + Object.values(app.documents).filter(Boolean).length;
    }, 0);
    const percent = totalDocs === 0 ? 0 : Math.round((completedDocs / totalDocs) * 100);
    
    if(dashDocs) dashDocs.textContent = `${percent}%`;
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
    if(!container) return;
    if (!container) return;

container.innerHTML = '';

if (userApplications.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#666;">No tienes becas guardadas aún.</p>';
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#666; padding:20px;">No tienes becas guardadas aún.</p>';
return;
}

@@ -298,20 +301,22 @@
           <h4>${app.titulo}</h4>
           <p style="font-size:0.85rem; color:#666;">${app.institucion}</p>
           <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
            <div class="checklist-grid">
            <div class="checklist-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin:10px 0;">
               ${Object.entries(app.documents).map(([key, val]) => `
                    <label style="font-size:0.8rem;">
                    <label style="font-size:0.8rem; cursor:pointer;">
                       <input type="checkbox" ${val ? 'checked' : ''} onchange="toggleDoc('${app.id}', '${key}')">
                       ${key.charAt(0).toUpperCase() + key.slice(1)}
                   </label>
               `).join('')}
           </div>
            <div style="margin-top:10px; display:flex; gap:5px;">
            <div style="margin-top:10px; display:flex; gap:5px; flex-wrap:wrap;">
               <button class="btn btn-outline btn-sm" style="flex:1;" onclick="openLetterGenerator('${app.id}')">Carta</button>
                <select onchange="updateStatus('${app.id}', this.value)" style="font-size:0.8rem; border-radius:4px;">
                <select onchange="updateStatus('${app.id}', this.value)" style="font-size:0.8rem; border-radius:4px; padding:4px;">
                   <option value="Interesado" ${app.status === 'Interesado' ? 'selected' : ''}>Interesado</option>
                   <option value="En Proceso" ${app.status === 'En Proceso' ? 'selected' : ''}>Proceso</option>
                   <option value="Enviada" ${app.status === 'Enviada' ? 'selected' : ''}>Enviada</option>
                    <option value="Aceptada" ${app.status === 'Aceptada' ? 'selected' : ''}>Aceptada</option>
                    <option value="Rechazada" ${app.status === 'Rechazada' ? 'selected' : ''}>Rechazada</option>
               </select>
           </div>
       `;
@@ -337,22 +342,35 @@
}

function renderChart() {
    const ctx = document.getElementById('statusChart');
    if(!ctx) return;
    const ctxCanvas = document.getElementById('statusChart');
    if (!ctxCanvas) return; // Salir si no hay canvas

    const ctx = ctxCanvas.getContext('2d');
    const counts = { 'Interesado': 0, 'En Proceso': 0, 'Enviada': 0, 'Aceptada': 0, 'Rechazada': 0 };

    const context = ctx.getContext('2d');
    const counts = { 'Interesado': 0, 'En Proceso': 0, 'Enviada': 0 };
    userApplications.forEach(app => { if(counts[app.status] !== undefined) counts[app.status]++; });
    userApplications.forEach(app => { 
        if(counts[app.status] !== undefined) counts[app.status]++; 
    });

    // Filtrar ceros para que el gráfico se vea limpio
    const labels = Object.keys(counts).filter(k => counts[k] > 0);
    const data = labels.map(k => counts[k]);

if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(context, {
    // Verificar si Chart.js está cargado
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js no está cargado. Incluye el script CDN en index.html");
        return;
    }

    window.myChart = new Chart(ctx, {
type: 'doughnut',
data: {
            labels: Object.keys(counts),
            labels: labels,
datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#94a3b8', '#3b82f6', '#10b981']
                data: data,
                backgroundColor: ['#94a3b8', '#3b82f6', '#10b981', '#22c55e', '#ef4444']
}]
},
options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
@@ -383,25 +401,24 @@
}
};

// Forms (Lógica Corregida para múltiples usuarios)
const loginFormEl = document.getElementById('loginForm');
if(loginFormEl) {
loginFormEl.addEventListener('submit', (e) => {
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
        // Buscar usuario en la "base de datos" local
        const user = allUsers.find(u => u.email === email && u.pass === pass);
        
        if (user) {
            localStorage.setItem('scholarship_user', JSON.stringify(user));
            checkAuth();
            toggleAuthModal();
            navigate('home'); // O 'dashboard-section'
} else {
            alert('Usuario no encontrado. Regístrate primero.');
            alert('Credenciales incorrectas o usuario no existe.');
}
});
}
@@ -414,32 +431,40 @@
const email = document.getElementById('regEmail').value;
const pass = document.getElementById('regPass').value;

        const user = { name, email, pass };
        localStorage.setItem('scholarship_user', JSON.stringify(user));
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

    if(content && modal) {
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
    }
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
@@ -458,38 +483,41 @@
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

Mi motivación principal es... [Completa aquí]
Mi motivación principal es... [Completa aquí detallando tu experiencia y por qué este programa es ideal para ti].

Atentamente,
${currentUser.name}`;

    const titleEl = document.getElementById('letterTitle');
    const contentEl = document.getElementById('letterContent');
    const modal = document.getElementById('letterModal');

    if(titleEl) titleEl.textContent = `Carta: ${app.titulo}`;
    if(contentEl) contentEl.value = letter;
    if(modal) modal.classList.remove('hidden');
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
