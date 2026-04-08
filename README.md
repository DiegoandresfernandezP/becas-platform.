# 🎓 BecasInternacionales - Plataforma Integral de Becas

## Visión del Producto
Plataforma que combina una **Página Web Pública** (para atraer tráfico y mostrar oportunidades) y una **Aplicación Web Privada** (SaaS con IA para gestionar el proceso de postulación).

## Estado Actual: Fase 1 - MVP Web Pública ✅

### Características Implementadas

#### Módulo Público (La "Vitrina")
- ✅ **Catálogo Dinámico de Oportunidades**: 8 becas reales precargadas
- ✅ **Filtros Avanzados**:
  - Por nivel académico (Pregrado, Maestría, Doctorado)
  - Por área de estudio (STEM, Humanidades, etc.)
  - Por tipo de financiamiento (100%, parcial)
  - Por país de destino
- ✅ **Buscador Inteligente**: Búsqueda en tiempo real por título, institución, país, área y tags
- ✅ **Ordenamiento**: Por fecha límite (urgencia), más recientes, alfabético
- ✅ **Landing Page Informativa**:
  - Hero section con buscador principal
  - Sección "Cómo Funciona" (4 pasos)
  - Sección "Sobre Nosotros"
  - Estadísticas en tiempo real
- ✅ **Sistema de Alertas (Básico)**: Formulario de newsletter funcional (guarda en localStorage)
- ✅ **Responsive Design**: Mobile-first, funciona en móvil, tablet y desktop

### Arquitectura Técnica

```
scholarship-platform/
├── index.html          # Página principal (HTML5 semántico)
├── css/
│   └── styles.css      # Estilos personalizados (sin frameworks)
├── js/
│   └── app.js          # Lógica de la aplicación (Vanilla JS)
├── data/
│   └── becas.json      # Datos estructurados de becas
├── assets/             # Imágenes y recursos (vacío por ahora)
└── README.md           # Este archivo
```

### Tecnologías Utilizadas
- **Frontend**: HTML5, CSS3 (Variables CSS, Grid, Flexbox), JavaScript ES6+
- **Datos**: JSON estático (fácil migración futura a Firebase/Supabase)
- **Almacenamiento Local**: localStorage para newsletter y futura autenticación
- **Sin dependencias externas**: Cero bundles, carga ultrarrápida

### Características Técnicas Destacadas
- ⚡ **Rendimiento**: Carga < 2 segundos, sin librerías pesadas
- 🔒 **Seguridad**: Sanitización de inputs contra XSS, escape de HTML
- ♿ **Accesibilidad**: Labels ARIA, navegación por teclado, contrastes WCAG
- 📱 **Mobile First**: Diseño responsive desde 320px hasta 4K
- 🎯 **SEO Ready**: Meta descripciones, HTML semántico, URLs limpias

## Estructura de Datos (becas.json)

Cada beca sigue este schema rígido para facilitar migración futura:

```json
{
  "id": "beca_001",
  "titulo": "Master in AI - ETH Zurich",
  "institucion": "ETH Zurich",
  "pais": "Suiza",
  "nivel": ["Maestría"],
  "area": ["STEM", "Ingeniería", "Ciencias de la Computación"],
  "financiamiento": "100% (Tuition + Stipend)",
  "deadline": "2026-12-15",
  "url_convocatoria": "https://...",
  "requisitos_idioma": ["Inglés C1"],
  "documentos_sugeridos": ["CV", "Carta Motivación", "2 Recomendaciones"],
  "tags": ["IA", "Robotics", "Europe"],
  "descripcion": "Descripción corta..."
}
```

## Cómo Ejecutar el Proyecto

### Opción 1: Servidor HTTP Simple (Recomendado para desarrollo)
```bash
cd scholarship-platform
python3 -m http.server 8080
# Abrir http://localhost:8080 en el navegador
```

### Opción 2: Abrir directamente (algunas funciones limitadas)
```bash
# Doble click en index.html o abrir desde el navegador
# Nota: La carga del JSON puede estar bloqueada por CORS en algunos navegadores
```

### Opción 3: VS Code Live Server
```bash
# Instalar extensión "Live Server" en VS Code
# Click derecho en index.html → "Open with Live Server"
```

## Próximas Fases

### Fase 2: Autenticación y Dashboard Personal 🔜
- [ ] Registro/Login de usuarios (localStorage → Firebase)
- [ ] Dashboard personal con gráficas (Chart.js)
- [ ] Sistema para guardar becas favoritas
- [ ] Tracker de postulaciones (Kanban: Interesado → En Proceso → Enviada → Resultado)
- [ ] Checklist de documentos por beca
- [ ] Barra de progreso de aplicación

### Fase 3: Gestor de Documentos
- [ ] Upload de notas y enlaces a Drive/Dropbox
- [ ] Plantillas de cartas de motivación (copiar/pegar)
- [ ] Calendario interactivo con deadlines

### Fase 4: Integración con IA 🤖
- [ ] Campo para API Key de Anthropic/OpenAI (guardada solo en cliente)
- [ ] Generación de cartas de motivación con IA
- [ ] Revisión de CV con IA
- [ ] Simulador de entrevistas con IA
- [ ] Matching inteligente de becas según perfil

## Contribuir

### Agregar Nueva Beca
Editar `data/becas.json` siguiendo el schema establecido. Validar:
- ID único (beca_XXX)
- Deadline en formato YYYY-MM-DD
- Arrays para nivel, area, requisitos_idioma, documentos_sugeridos, tags
- URL válida en url_convocatoria

### Reportar Bugs
Crear issue en GitHub con:
- Descripción del problema
- Pasos para reproducir
- Comportamiento esperado vs real
- Navegador y dispositivo

## Roadmap

| Fase | Feature | Estado | Prioridad |
|------|---------|--------|-----------|
| 1 | Catálogo público con filtros | ✅ Completado | Alta |
| 1 | Buscador en tiempo real | ✅ Completado | Alta |
| 1 | Newsletter | ✅ Completado | Media |
| 2 | Autenticación | 📋 Pendiente | Alta |
| 2 | Dashboard personal | 📋 Pendiente | Alta |
| 2 | Tracker de aplicaciones | 📋 Pendiente | Alta |
| 3 | Gestor de documentos | 📋 Pendiente | Media |
| 3 | Calendario | 📋 Pendiente | Media |
| 4 | IA para cartas | 📋 Pendiente | Baja |
| 4 | IA para matching | 📋 Pendiente | Baja |

## Licencia

MIT License - Democratizando el acceso a educación global 🌍

---

**Desarrollado con ❤️ para estudiantes que sueñan en grande**

*¿Preguntas o sugerencias? ¡Conéctate en las redes sociales!*