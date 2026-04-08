/**
 * BecasInternacionales - Aplicación Principal
 * Módulo público: Catálogo de becas con filtros y búsqueda
 */

// Estado global de la aplicación
const AppState = {
  scholarships: [],
  filteredScholarships: [],
  filters: {
    search: '',
    level: '',
    area: '',
    funding: '',
    country: '',
    sortBy: 'deadline'
  }
};

// Elementos del DOM
const DOM = {
  searchInput: null,
  filterLevel: null,
  filterArea: null,
  filterFunding: null,
  filterCountry: null,
  sortBy: null,
  cardsContainer: null,
  loadingSpinner: null,
  noResults: null,
  totalScholarships: null,
  totalCountries: null,
  totalUniversities: null,
  newsletterForm: null
};

/**
 * Inicializa la aplicación
 */
async function init() {
  console.log('🎓 Iniciando BecasInternacionales...');

  // Cache de elementos DOM
  cacheDOMElements();

  // Configurar event listeners
  setupEventListeners();

  // Cargar datos
  await loadScholarships();

  // Actualizar estadísticas
  updateStats();

  console.log('✅ Aplicación inicializada correctamente');
}

/**
 * Almacena referencias a elementos del DOM
 */
function cacheDOMElements() {
  DOM.searchInput = document.getElementById('searchInput');
  DOM.filterLevel = document.getElementById('filterLevel');
  DOM.filterArea = document.getElementById('filterArea');
  DOM.filterFunding = document.getElementById('filterFunding');
  DOM.filterCountry = document.getElementById('filterCountry');
  DOM.sortBy = document.getElementById('sortBy');
  DOM.cardsContainer = document.getElementById('cardsContainer');
  DOM.loadingSpinner = document.getElementById('loadingSpinner');
  DOM.noResults = document.getElementById('noResults');
  DOM.totalScholarships = document.getElementById('totalScholarships');
  DOM.totalCountries = document.getElementById('totalCountries');
  DOM.totalUniversities = document.getElementById('totalUniversities');
  DOM.newsletterForm = document.getElementById('newsletterForm');
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
  // Búsqueda en tiempo real
  DOM.searchInput.addEventListener('input', debounce((e) => {
    AppState.filters.search = sanitizeInput(e.target.value);
    applyFilters();
  }, 300));

  // Filtros
  DOM.filterLevel.addEventListener('change', (e) => {
    AppState.filters.level = e.target.value;
    applyFilters();
  });

  DOM.filterArea.addEventListener('change', (e) => {
    AppState.filters.area = e.target.value;
    applyFilters();
  });

  DOM.filterFunding.addEventListener('change', (e) => {
    AppState.filters.funding = e.target.value;
    applyFilters();
  });

  DOM.filterCountry.addEventListener('change', (e) => {
    AppState.filters.country = e.target.value;
    applyFilters();
  });

  DOM.sortBy.addEventListener('change', (e) => {
    AppState.filters.sortBy = e.target.value;
    applyFilters();
  });

  // Newsletter
  if (DOM.newsletterForm) {
    DOM.newsletterForm.addEventListener('submit', handleNewsletterSubmit);
  }

  // Botones de login/registro (placeholder para futura implementación)
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Funcionalidad de login próximamente disponible. ¡Pronto podrás gestionar tus postulaciones!');
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Funcionalidad de registro próximamente disponible. ¡Pronto podrás guardar tus becas favoritas!');
    });
  }
}

/**
 * Carga las becas desde el archivo JSON
 */
async function loadScholarships() {
  try {
    showLoading(true);

    const response = await fetch('data/becas.json');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    AppState.scholarships = await response.json();
    AppState.filteredScholarships = [...AppState.scholarships];

    renderCards();
    showLoading(false);

  } catch (error) {
    console.error('Error cargando becas:', error);
    showError('No se pudieron cargar las becas. Por favor recarga la página.');
    showLoading(false);
  }
}

/**
 * Aplica todos los filtros y ordenamiento
 */
function applyFilters() {
  let filtered = [...AppState.scholarships];

  // Filtro por búsqueda
  if (AppState.filters.search) {
    const searchTerm = AppState.filters.search.toLowerCase();
    filtered = filtered.filter(beca =>
      beca.titulo.toLowerCase().includes(searchTerm) ||
      beca.institucion.toLowerCase().includes(searchTerm) ||
      beca.pais.toLowerCase().includes(searchTerm) ||
      beca.area.some(a => a.toLowerCase().includes(searchTerm)) ||
      beca.tags.some(t => t.toLowerCase().includes(searchTerm)) ||
      beca.descripcion.toLowerCase().includes(searchTerm)
    );
  }

  // Filtro por nivel
  if (AppState.filters.level) {
    filtered = filtered.filter(beca =>
      beca.nivel.includes(AppState.filters.level)
    );
  }

  // Filtro por área
  if (AppState.filters.area) {
    filtered = filtered.filter(beca =>
      beca.area.some(a => a.includes(AppState.filters.area))
    );
  }

  // Filtro por financiamiento
  if (AppState.filters.funding) {
    if (AppState.filters.funding === '100%') {
      filtered = filtered.filter(beca =>
        beca.financiamiento.includes('100%')
      );
    } else if (AppState.filters.funding === 'Parcial') {
      filtered = filtered.filter(beca =>
        !beca.financiamiento.includes('100%')
      );
    }
  }

  // Filtro por país
  if (AppState.filters.country) {
    filtered = filtered.filter(beca =>
      beca.pais.includes(AppState.filters.country)
    );
  }

  // Ordenamiento
  filtered = sortScholarships(filtered, AppState.filters.sortBy);

  AppState.filteredScholarships = filtered;
  renderCards();
}

/**
 * Ordena las becas según el criterio seleccionado
 */
function sortScholarships(scholarships, sortBy) {
  const sorted = [...scholarships];

  switch (sortBy) {
    case 'deadline':
      sorted.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      break;
    case 'dateAdded':
      // Como no tenemos fecha de agregado, usamos el ID como proxy
      sorted.sort((a, b) => b.id.localeCompare(a.id));
      break;
    case 'alphabetical':
      sorted.sort((a, b) => a.titulo.localeCompare(b.titulo));
      break;
  }

  return sorted;
}

/**
 * Renderiza las tarjetas de becas
 */
function renderCards() {
  const scholarships = AppState.filteredScholarships;

  if (scholarships.length === 0) {
    DOM.cardsContainer.innerHTML = '';
    DOM.noResults.classList.remove('hidden');
    return;
  }

  DOM.noResults.classList.add('hidden');

  const cardsHTML = scholarships.map(beca => createCardHTML(beca)).join('');
  DOM.cardsContainer.innerHTML = cardsHTML;

  // Agregar event listeners a los botones "Más Información"
  document.querySelectorAll('.btn-info').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const becaId = e.target.dataset.id;
      showBecaDetails(becaId);
    });
  });

  // Agregar event listeners a los botones "Guardar"
  document.querySelectorAll('.btn-save').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const becaId = e.target.dataset.id;
      saveBeca(becaId);
    });
  });
}

/**
 * Crea el HTML para una tarjeta de beca
 */
function createCardHTML(beca) {
  const deadlineDate = new Date(beca.deadline);
  const daysUntilDeadline = Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));
  const deadlineText = daysUntilDeadline > 0
    ? `${daysUntilDeadline} días restantes`
    : '¡Vencida!';

  const nivelBadge = beca.nivel[0];
  const countryBadge = beca.pais.split(' ')[0]; // Primer palabra del país

  return `
    <article class="card">
      <div class="card-header">
        <h3 class="card-title">${escapeHTML(beca.titulo)}</h3>
        <p class="card-institution">${escapeHTML(beca.institucion)}</p>
      </div>
      <div class="card-body">
        <div class="card-info">
          <span class="badge badge-level">${nivelBadge}</span>
          <span class="badge badge-country">${countryBadge}</span>
          <span class="badge badge-funding">${beca.financiamiento.split('(')[0].trim()}</span>
        </div>
        <p class="card-description">${escapeHTML(beca.descripcion)}</p>
        <div style="margin-bottom: 1rem;">
          <strong style="font-size: 0.75rem; color: var(--text-secondary);">ÁREAS:</strong>
          <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem;">
            ${beca.area.slice(0, 3).map(area =>
              `<span style="font-size: 0.7rem; background: #f3f4f6; padding: 0.125rem 0.5rem; border-radius: 0.25rem;">${escapeHTML(area)}</span>`
            ).join('')}
          </div>
        </div>
        <div class="card-meta">
          <span class="deadline">⏰ ${deadlineText}</span>
          <span>📅 ${formatDate(beca.deadline)}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn btn-outline btn-info" data-id="${beca.id}">Ver Detalles</button>
        <button class="btn btn-primary btn-save" data-id="${beca.id}">💾 Guardar</button>
      </div>
    </article>
  `;
}

/**
 * Muestra los detalles de una beca (placeholder)
 */
function showBecaDetails(becaId) {
  const beca = AppState.scholarships.find(b => b.id === becaId);

  if (!beca) return;

  const details = `
    📚 ${beca.titulo}

    🏛️ Institución: ${beca.institucion}
    🌍 País: ${beca.pais}
    📊 Nivel: ${beca.nivel.join(', ')}
    💰 Financiamiento: ${beca.financiamiento}
    📅 Deadline: ${formatDate(beca.deadline)}

    📋 Documentos sugeridos:
    ${beca.documentos_sugeridos.map(doc => `• ${doc}`).join('\n')}

    🔗 Más información: ${beca.url_convocatoria}
  `;

  alert(details);

  // En el futuro, esto abrirá un modal o página de detalles
}

/**
 * Guarda una beca (placeholder para funcionalidad futura)
 */
function saveBeca(becaId) {
  // Verificar si el usuario está registrado (placeholder)
  const user = localStorage.getItem('user');

  if (!user) {
    alert('Para guardar becas necesitas registrarte. ¡La funcionalidad de usuario estará disponible pronto!');
    return;
  }

  // Lógica de guardado (se implementará en la fase de autenticación)
  console.log('Guardando beca:', becaId);
}

/**
 * Maneja el envío del formulario de newsletter
 */
function handleNewsletterSubmit(e) {
  e.preventDefault();

  const emailInput = e.target.querySelector('input[type="email"]');
  const email = emailInput.value;

  // Validación básica
  if (!isValidEmail(email)) {
    alert('Por favor ingresa un correo electrónico válido');
    return;
  }

  // Guardar en localStorage (simulación)
  const subscribers = JSON.parse(localStorage.getItem('newsletterSubscribers') || '[]');

  if (!subscribers.includes(email)) {
    subscribers.push(email);
    localStorage.setItem('newsletterSubscribers', JSON.stringify(subscribers));

    alert('¡Gracias por suscribirte! Pronto recibirás las mejores oportunidades en tu correo.');
    emailInput.value = '';
  } else {
    alert('Este correo ya está suscrito a nuestro newsletter.');
  }
}

/**
 * Actualiza las estadísticas en la página
 */
function updateStats() {
  const totalScholarships = AppState.scholarships.length;
  const countries = new Set(AppState.scholarships.map(b => b.pais));
  const universities = new Set(AppState.scholarships.map(b => b.institucion));

  animateNumber(DOM.totalScholarships, totalScholarships);
  animateNumber(DOM.totalCountries, countries.size);
  animateNumber(DOM.totalUniversities, universities.size);
}

/**
 * Anima un número desde 0 hasta el valor final
 */
function animateNumber(element, target) {
  const duration = 1000;
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current);
    }
  }, 16);
}

/**
 * Muestra u oculta el spinner de carga
 */
function showLoading(show) {
  if (show) {
    DOM.loadingSpinner.classList.remove('hidden');
    DOM.cardsContainer.classList.add('hidden');
  } else {
    DOM.loadingSpinner.classList.add('hidden');
    DOM.cardsContainer.classList.remove('hidden');
  }
}

/**
 * Muestra un mensaje de error
 */
function showError(message) {
  DOM.cardsContainer.innerHTML = `
    <div class="no-results">
      <h3>⚠️ Error</h3>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

/**
 * Sanitiza input para prevenir XSS
 */
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Valida un email
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Formatea una fecha
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('es-ES', options);
}

/**
 * Función de debounce para optimizar la búsqueda
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
