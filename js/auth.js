// auth.js - Manejo de Registro y Login (LocalStorage)

const AUTH_KEY = 'scholarship_users';
const SESSION_KEY = 'scholarship_current_user';

export function initAuth() {
    checkSession();
    
    // Event Listeners para botones del header
    document.getElementById('btn-login-nav')?.addEventListener('click', () => openModal('login'));
    document.getElementById('btn-register-nav')?.addEventListener('click', () => openModal('register'));
    document.getElementById('btn-logout-nav')?.addEventListener('click', logout);
    
    // Forms
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    
    // Toggle forms
    document.getElementById('to-register')?.addEventListener('click', () => switchModal('register'));
    document.getElementById('to-login')?.addEventListener('click', () => switchModal('login'));
}

function getUsers() {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || '[]');
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}

function checkSession() {
    const user = getCurrentUser();
    const navLinks = document.getElementById('nav-links');
    const btnLogout = document.getElementById('btn-logout-nav');
    
    if (user) {
        // Usuario logueado
        if(navLinks) {
            navLinks.innerHTML = `
                <span style="margin-right:10px; font-weight:bold;">Hola, ${user.name}</span>
                <button id="btn-dashboard-nav" class="btn-primary">Mi Dashboard</button>
                <button id="btn-logout-nav" class="btn-logout" style="display:inline-block; background:#ef4444; color:white;">Salir</button>
            `;
            // Re-asignar listener al nuevo botón de dashboard
            document.getElementById('btn-dashboard-nav').addEventListener('click', () => {
                document.getElementById('public-view').classList.add('hidden');
                document.getElementById('dashboard-view').classList.remove('hidden');
                loadDashboardData();
            });
        }
    } else {
        // Visitante
        if(navLinks) {
            navLinks.innerHTML = `
                <button id="btn-login-nav" class="btn-outline">Ingresar</button>
                <button id="btn-register-nav" class="btn-primary">Registrarse</button>
            `;
            // Re-inicializar listeners
            setTimeout(initAuth, 0); 
        }
    }
}

function openModal(type) {
    const modal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    
    modal.classList.remove('hidden');
    if (type === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

function switchModal(type) {
    openModal(type);
}

function closeModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

// Cerrar modal al hacer clic fuera
document.getElementById('auth-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') closeModal();
});
document.querySelector('.close-modal')?.addEventListener('click', closeModal);

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    
    const users = getUsers();
    if (users.find(u => u.email === email)) {
        alert('Este email ya está registrado.');
        return;
    }
    
    const newUser = { name, email, password, applications: [] };
    users.push(newUser);
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));
    
    // Auto login
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    alert('¡Registro exitoso!');
    closeModal();
    checkSession();
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('log-email').value;
    const password = document.getElementById('log-pass').value;
    
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        alert('¡Bienvenido de nuevo!');
        closeModal();
        checkSession();
        // Ir al dashboard automáticamente
        document.getElementById('public-view').classList.add('hidden');
        document.getElementById('dashboard-view').classList.remove('hidden');
        loadDashboardData();
    } else {
        alert('Email o contraseña incorrectos.');
    }
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    alert('Sesión cerrada.');
    location.reload();
}

export function saveApplication(becaId, becaTitulo) {
    const user = getCurrentUser();
    if (!user) {
        openModal('login');
        return false;
    }
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === user.email);
    
    // Verificar si ya la guardó
    if (users[userIndex].applications.find(a => a.id === becaId)) {
        alert('Ya guardaste esta beca en tu tracker.');
        return false;
    }
    
    // Nueva aplicación
    const newApp = {
        id: becaId,
        titulo: becaTitulo,
        estado: 'Interesado', // Interesado, En Proceso, Enviada, Entrevista, Resultado
        progreso: 0,
        checklist: {
            cv: false,
            carta: false,
            recomendaciones: false,
            idiomas: false
        },
        fechaGuardado: new Date().toISOString()
    };
    
    users[userIndex].applications.push(newApp);
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));
    localStorage.setItem(SESSION_KEY, JSON.stringify(users[userIndex])); // Actualizar sesión
    
    alert('Beca guardada en tu Dashboard.');
    return true;
}

export function getMyApplications() {
    const user = getCurrentUser();
    return user ? user.applications : [];
}

export function updateApplicationState(id, newEstado) {
    const user = getCurrentUser();
    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === user.email);
    const appIndex = users[userIndex].applications.findIndex(a => a.id === id);
    
    if (appIndex !== -1) {
        users[userIndex].applications[appIndex].estado = newEstado;
        localStorage.setItem(AUTH_KEY, JSON.stringify(users));
        localStorage.setItem(SESSION_KEY, JSON.stringify(users[userIndex]));
        loadDashboardData(); // Recargar vista
    }
}

export function toggleChecklist(id, item) {
    const user = getCurrentUser();
    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === user.email);
    const appIndex = users[userIndex].applications.findIndex(a => a.id === id);
    
    if (appIndex !== -1) {
        const app = users[userIndex].applications[appIndex];
        app.checklist[item] = !app.checklist[item];
        
        // Calcular progreso
        const total = Object.keys(app.checklist).length;
        const completed = Object.values(app.checklist).filter(v => v).length;
        app.progreso = Math.round((completed / total) * 100);
        
        localStorage.setItem(AUTH_KEY, JSON.stringify(users));
        localStorage.setItem(SESSION_KEY, JSON.stringify(users[userIndex]));
        loadDashboardData();
    }
}