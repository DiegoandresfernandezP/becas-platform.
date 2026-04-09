# 🚀 ScholarHub - Plan de Desarrollo y Hoja de Ruta

## 🎯 Objetivo Principal
Crear la plataforma líder en Latinoamérica para descubrir, gestionar y postular a becas internacionales, internships y programas de verano, con actualización automática y herramientas de productividad integradas.

## ✅ Estado Actual (v1.0 - Funcional)
- [x] Catálogo de becas con filtros (Nivel, Área, País, Tipo).
- [x] Visualización de becas activas y cerradas (históricas).
- [x] Sistema de autenticación local (Login/Registro).
- [x] Dashboard de usuario con Tracker de postulaciones.
- [x] Generador básico de cartas de motivación.
- [x] Botones para compartir en redes sociales.
- [x] Script de auto-actualización vía GitHub Actions (RSS).
- [x] Diseño responsivo y moderno.

## 🛠️ Tareas Pendientes (Backlog)

### 🔥 Prioridad Alta (Crítico para Usuarios)
1. **Exportar Tracker a PDF**: Permitir descargar un reporte con el estado de las becas guardadas, checklist de documentos y la carta generada.
2. **Mejora en Datos Históricos**: Asegurar que las becas cerradas muestren claramente "Próxima apertura estimada" basándose en ciclos anteriores.
3. **Validación de Formularios**: Mejorar los mensajes de error en Login/Registro y validación de emails duplicados.
4. **Optimización de Búsqueda**: Implementar búsqueda difusa (fuzzy search) para encontrar resultados aunque haya errores ortográficos leves.

### 🌟 Prioridad Media (Experiencia de Usuario)
5. **Notificaciones de Deadlines**: Avisar al usuario (vía email simulado o alerta en dashboard) cuando falten 7 días para el cierre de una beca guardada.
6. **Comparador de Becas**: Permitir seleccionar 2-3 becas y comparar sus requisitos lado a lado.
7. **Perfil de Usuario Avanzado**: Permitir editar datos personales, subir CV (simulado en texto/base64) y definir áreas de interés predeterminadas.
8. **Modo Oscuro**: Implementar un toggle para cambiar entre tema claro y oscuro.

### 🤖 Prioridad Baja (Automatización y Escala)
9. **Refinar el Scraper**: Mejorar el script de Python para detectar más fuentes específicas (ej. universidades top 50 individuales) y limpiar mejor los títulos duplicados.
10. **SEO Avanzado**: Generar meta-etiquetas dinámicas reales para cada beca individual (requiere renderizado del lado del servidor o pre-build).
11. **Estadísticas Públicas**: Una página de "Impacto" mostrando cuántos usuarios han aplicado (simulado) o cuántas becas se han listado.

## 📂 Estructura del Proyecto
- `/data/becas.json`: Base de datos principal (auto-actualizable).
- `/scripts/update_becas.py`: Script de automatización.
- `/js/app.js`: Lógica del frontend (filtros, auth, tracker).
- `/css/styles.css`: Estilos y diseño.
- `/index.html`: Punto de entrada único (SPA).

## 🗓️ Próximos Pasos Inmediatos
1. Implementar la exportación a PDF del Tracker.
2. Revisar y limpiar duplicados en `becas.json`.
3. Añadir contador de "Días restantes" en las tarjetas de becas activas.
