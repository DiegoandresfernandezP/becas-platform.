setupEventListeners();
});

// --- CARGA DE DATOS ---
// --- CARGA DE DATOS ---
async function loadScholarships() {
try {
const response = await fetch('./data/becas.json');
let allScholarships = await response.json();

        // FILTRO AUTOMÁTICO: Eliminar becas vencidas
        const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        scholarships = allScholarships.filter(beca => {
            return beca.deadline >= today; 
        });
        const today = new Date();
        // Formatear hoy a YYYY-MM-DD para comparar
        const todayStr = today.toISOString().split('T')[0];

        // Ordenar por urgencia (las más próximas primero)
        scholarships.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        // Separar en Activas y Cerradas
        scholarships = allScholarships.filter(b => b.deadline >= todayStr);
        const closedScholarships = allScholarships.filter(b => b.deadline < todayStr);

        renderScholarships(scholarships);
        updateStats();
        // Renderizar primero las activas
        renderScholarships(scholarships, false); // false = no son cerradas

        // Mostrar mensaje si hay pocas becas activas
        if (scholarships.length === 0) {
            document.getElementById('catalogo').innerHTML = `
                <div style="text-align:center; padding: 40px;">
                    <i class="fas fa-calendar-check" style="font-size: 3rem; color: var(--primary); margin-bottom: 20px;"></i>
                    <h3>No hay becas activas en este momento</h3>
                    <p>Las convocatorias de inicio de año han cerrado. ¡Pronto se abrirán las de mitad de año!</p>
                </div>
        // Si hay cerradas, las mostramos debajo con un título
        if (closedScholarships.length > 0) {
            const container = document.getElementById('catalogo');
            const separator = document.createElement('div');
            separator.style.gridColumn = "1 / -1";
            separator.style.marginTop = "40px";
            separator.style.marginBottom = "20px";
            separator.innerHTML = `
                <h3 style="text-align:center; color:#666; border-bottom: 2px solid #eee; padding-bottom:10px;">
                    Oportunidades Cerradas (Próxima apertura: 2027)
                </h3>
                <p style="text-align:center; font-size:0.9rem; color:#888;">Úsalas como referencia para preparar tus documentos.</p>
           `;
            container.appendChild(separator);
            
            renderScholarships(closedScholarships, true); // true = son cerradas
}

        updateStats();
} catch (error) {
console.error('Error cargando becas:', error);
document.getElementById('catalogo').innerHTML = '<p>Error cargando datos.</p>';
}
}

// --- AUTENTICACIÓN Y MENÚ (CORREGIDO) ---
function checkAuth() {
const storedUser = localStorage.getItem('scholarship_user');
@@ -172,35 +178,56 @@ window.toggleMenu = () => {
};

// --- RENDERIZADO DE BECAS ---
function renderScholarships(data) {
function renderScholarships(data, isClosed = false) {
const container = document.getElementById('catalogo');
    container.innerHTML = '';
    if (data.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No se encontraron becas.</p>';
    // No borramos todo el contenedor si ya hay separador, pero para simplificar 
    // en esta versión, asumimos que llamamos a esta función en bloques separados
    // o limpiamos solo si es la primera llamada. 
    // NOTA: La lógica de arriba ya maneja la appendición, aquí solo cambiamos el estilo de la card.

    if (data.length === 0 && !isClosed) {
        // Solo mostrar mensaje si no hay activas Y no estamos renderizando las cerradas
        if(container.children.length === 0) {
             container.innerHTML = '<p class="text-center col-span-full">No hay becas activas en este momento.</p>';
        }
return;
}

data.forEach(beca => {
        const isSaved = currentUser && userApplications.some(a => a.id === beca.id);
const card = document.createElement('div');
card.className = 'beca-card';
        
        // Si es cerrada, añadimos clase especial o estilo inline
        if (isClosed) {
            card.style.opacity = "0.7";
            card.style.filter = "grayscale(80%)";
            card.style.pointerEvents = "none"; // Desactivar clicks
        }

        const deadlineClass = isClosed ? 'background:#ccc; color:#555;' : 'background:#fee2e2; color:#ef4444;';
        const deadlineText = isClosed ? 'CERRADA' : `<i class="far fa-clock"></i> ${beca.deadline}`;
        const btnText = isClosed ? 'Cerrada' : (currentUser ? 'Guardar' : 'Guardar');
        const btnAction = isClosed ? '' : `onclick="${currentUser ? `addToTracker('${beca.id}')` : 'toggleAuthModal()'}"`;
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
                <p style="margin-top: 10px; font-size: 0.9rem;"><i class="far fa-clock"></i> ${beca.deadline}</p>
                <div class="card-tags">
                    ${beca.nivel.map(n => `<span class="tag">${n}</span>`).join('')}
                </div>
                <p style="margin-top: 10px; font-size: 0.9rem; font-weight:bold; ${deadlineClass} padding:5px; border-radius:4px; display:inline-block;">
                    ${deadlineText}
                </p>
           </div>
           <div class="card-footer">
               <a href="${beca.url_convocatoria}" target="_blank" class="btn btn-outline btn-sm">Ver Web</a>
                ${currentUser ? 
                    `<button class="btn ${isSaved ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="addToTracker('${beca.id}')">
                        ${isSaved ? '<i class="fas fa-check"></i> Guardado' : 'Guardar'}
                     </button>` : 
                    `<button class="btn btn-secondary btn-sm" style="background:#ccc" onclick="toggleAuthModal()">Guardar</button>`
                }
                <button class="btn ${btnClass} btn-sm" style="${btnStyle}" ${btnAction}>${btnText}</button>
           </div>
       `;
container.appendChild(card);
