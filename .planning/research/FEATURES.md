# Feature Research

**Domain:** Internal tool adoption analytics dashboard (Figma plugin, design team leadership)
**Researched:** 2026-03-05
**Confidence:** MEDIUM — domain is well-understood; specific Figma plugin delivery constraints (no backend, Power Automate only) reduce direct comparables.

---

## Context

The audience is design leaders at BCP, not individual designers. The dashboard lives inside a Figma plugin ("Handoff Analytics"). Data flows from Designer Buddy → Power Automate → Excel Online → Handoff Analytics plugin. No backend, no auth beyond the Power Automate URL.

The core question leaders ask: "Is the team actually using the handoff evaluator, and are scores improving over time?"

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that, if missing, make the dashboard feel broken or useless. Design leaders will open the plugin once, not see these, and stop using it.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Lista de evaluaciones recientes | El líder necesita ver qué archivos fueron evaluados; sin esto no hay dashboard | LOW | Tabla: nombre archivo, diseñador, fecha, score. Datos vienen de Power Automate GET. |
| Score visible por fila | El score es el único output del evaluador; oculto = inútil | LOW | Mostrar `overallScore` como número y/o barra visual. |
| Contador total de evaluaciones | KPI de adopción más básico: "¿cuántos usos?" | LOW | Aggregate simple sobre el array de rows. |
| Filtro por diseñador | Líderes necesitan aislar actividad por persona | LOW | Dropdown o multiselect con nombres únicos del dataset. |
| Filtro por rango de fechas | Evaluar actividad de un sprint/mes concreto | MEDIUM | Date picker o preset (última semana, último mes). Requiere parsear timestamps. |
| Estado vacío informativo | Si no hay datos (endpoint no configurado, Excel vacío), debe explicar qué hacer | LOW | Mensaje con instrucciones para configurar Power Automate. |
| Loading state | El fetch a Power Automate puede tardar 1-3s | LOW | Spinner o skeleton. Sin esto la UI parece rota en el gap. |
| Error state | El endpoint puede no estar configurado aún (URL placeholder) | LOW | Mensaje claro: "El endpoint no está configurado. Contacta al equipo." |

### Differentiators (Competitive Advantage)

Features que elevan el dashboard de "utilidad básica" a "herramienta que el líder abre cada semana."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Tendencia de score promedio en el tiempo | Responde: "¿El equipo está mejorando?" — la pregunta más valiosa para un líder | MEDIUM | Gráfico de línea simple (semana o mes vs. score promedio). Requiere agrupar por fecha en frontend. |
| Score promedio por diseñador | Identifica quién necesita más soporte sin revisión manual de archivos | LOW | Groupby en frontend sobre el dataset ya cargado. |
| Indicador de frecuencia de uso | "Diseñadores activos esta semana": indica si la herramienta está integrada al flujo o solo se usó una vez | LOW | Count de evaluaciones en los últimos 7 días. |
| Color coding de scores | Verde/amarillo/rojo hace la lista scannable en 2 segundos | LOW | Umbral sugerido: <60 rojo, 60-80 amarillo, >80 verde. |
| Ordenamiento de columnas | Líder puede ordenar por score ascendente para ver quién está más bajo | LOW | Sort en frontend sobre array. Dependiente de la lista base. |
| Exportar a CSV | Llevar datos a una reunión, compartir con otros stakeholders | MEDIUM | Serializar el dataset filtrado como CSV. Descargar via blob URL. Dentro del plugin es complejo — ver anti-features. |

### Anti-Features (Commonly Requested, Often Problematic)

Features que parecen obvias pero que en el contexto de este proyecto crean problemas desproporcionados.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Exportar a PDF | Líderes quieren compartir el dashboard en slides | Figma plugin API no tiene acceso a `window.print()` ni canvas-to-image en todos los contextos. Implementación frágil. | Añadir export CSV (más fiable) y dejar que el líder construya el slide manualmente. |
| Notificaciones o alertas (ej: "score bajo detectado") | Parece proactivo | Power Automate puede generar emails, pero el plugin no puede push-notify. Requeriría un segundo flow de PA fuera del scope del plugin. | Frecuencia de revisión manual del dashboard. Es un ritual que el líder adopta, no un sistema de alertas. |
| Edición de registros desde el dashboard | Corregir errores de nombre o fecha | El dashboard es de solo lectura por diseño. Permitir escritura requiere un tercer Power Automate flow, complejidad de concurrencia en Excel, y control de acceso. | Corregir directamente en Excel Online si hay un error puntual. |
| Comparación entre archivos (A/B de designs) | Parece útil para evaluar progreso de un file específico | Los datos solo tienen `fileId` pero el contexto de qué cambió entre evaluaciones del mismo file no está capturado. Induciría conclusiones falsas. | Filtrar por `fileName` y ver las evaluaciones cronológicamente. |
| Gráficos interactivos complejos (drill-down, zoom, pan) | Dashboards de BI modernos los tienen | En un plugin Figma de 380x600px el espacio es limitado. Charting libraries pesadas (Recharts, Chart.js completo) aumentan el bundle, que ya se embebe inline en `dist/ui.html`. | Gráfico de línea simple con tooltip básico. Preferir implementación lightweight o SVG manual. |
| Actualización en tiempo real (polling o WebSocket) | "Ver evaluaciones nuevas sin reabrir" | Power Automate / Excel Online tiene latencia de minutos. Polling cada N segundos es inútil y añade carga. | Botón "Refrescar" manual. El líder abre el plugin cuando lo necesita, no lo tiene abierto permanentemente. |
| Auth / login por usuario | Controlar quién ve el dashboard | El endpoint de Power Automate es una URL HTTP pública por diseño (constraint del proyecto). Auth real requiere Azure AD integration, fuera de scope. | Mantener la URL del endpoint como secreto operacional. Si se comparte, cualquiera puede leer. Documentar este tradeoff. |

---

## Feature Dependencies

```
[Lista de evaluaciones]
    └──requires──> [Fetch a Power Automate GET endpoint]
                       └──requires──> [URL del endpoint configurada (constante o settings)]

[Filtro por diseñador]
    └──requires──> [Lista de evaluaciones]

[Filtro por rango de fechas]
    └──requires──> [Lista de evaluaciones]
    └──requires──> [Timestamps parseables en los datos]

[Score promedio por diseñador]
    └──requires──> [Lista de evaluaciones]
    └──enhances──> [Filtro por diseñador]

[Tendencia de score en el tiempo]
    └──requires──> [Lista de evaluaciones]
    └──requires──> [Al menos ~4 semanas de datos para que la tendencia sea legible]

[Color coding de scores]
    └──requires──> [Score visible por fila]

[Ordenamiento de columnas]
    └──requires──> [Lista de evaluaciones]

[Export CSV]
    └──requires──> [Lista de evaluaciones]
    └──enhances──> [Filtro por diseñador] (exportar solo el subset filtrado)
    └──enhances──> [Filtro por rango de fechas]
```

### Dependency Notes

- **Lista de evaluaciones requires fetch endpoint:** Todo el dashboard depende de que el endpoint de Power Automate esté configurado. La feature de "error state" cubre el caso donde no lo está.
- **Tendencia requires datos históricos:** Esta feature no es útil en el primer mes de deploy. Tiene valor solo cuando hay ≥4 semanas de evaluaciones. Por eso es diferenciador y no table stakes — no bloquea el lanzamiento.
- **Timestamps parseables:** El payload que envía Designer Buddy debe incluir un timestamp en formato ISO 8601. Si Power Automate agrega su propia columna de timestamp, el filtro de fechas puede depender de eso en lugar del payload del plugin.

---

## MVP Definition

### Launch With (v1)

Mínimo viable para que un líder de diseño obtenga valor real en la primera sesión.

- [ ] Fetch al endpoint de Power Automate con loading + error + empty states
- [ ] Lista de evaluaciones: nombre archivo, diseñador, fecha, score
- [ ] Contador total de evaluaciones (aggregate simple)
- [ ] Color coding de scores (verde/amarillo/rojo)
- [ ] Filtro por diseñador (dropdown)
- [ ] Filtro por rango de fechas (preset: última semana / último mes / todo)
- [ ] Score promedio por diseñador (groupby en frontend)

### Add After Validation (v1.x)

Añadir cuando haya feedback del equipo de liderazgo y datos históricos suficientes.

- [ ] Tendencia de score promedio en el tiempo — trigger: 4+ semanas de datos acumulados
- [ ] Ordenamiento de columnas — trigger: dataset supera 20+ filas y la lista se vuelve difícil de navegar
- [ ] Indicador de frecuencia semanal — trigger: el equipo pregunta "¿quién usó la herramienta esta semana?"

### Future Consideration (v2+)

Diferir hasta que el sistema esté validado y haya caso de negocio claro.

- [ ] Export CSV — requiere investigar restricciones del plugin API para blob download; bajo valor si el equipo puede acceder a Excel Online directamente
- [ ] Botón "Refrescar" manual — útil pero no bloquea; el líder puede reabrir el plugin
- [ ] Filtro por score (ej: "solo mostrar scores < 70") — útil para coaching, pero puede derivar en vigilancia; validar con líderes antes

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Lista de evaluaciones (fetch + tabla) | HIGH | LOW | P1 |
| Loading / error / empty states | HIGH | LOW | P1 |
| Contador total de evaluaciones | HIGH | LOW | P1 |
| Color coding de scores | HIGH | LOW | P1 |
| Filtro por diseñador | HIGH | LOW | P1 |
| Filtro por rango de fechas | HIGH | MEDIUM | P1 |
| Score promedio por diseñador | HIGH | LOW | P1 |
| Tendencia de score en el tiempo | HIGH | MEDIUM | P2 |
| Ordenamiento de columnas | MEDIUM | LOW | P2 |
| Indicador de frecuencia semanal | MEDIUM | LOW | P2 |
| Export CSV | LOW | MEDIUM | P3 |
| Botón "Refrescar" manual | LOW | LOW | P3 |
| Filtro por score | MEDIUM | LOW | P3 |

**Priority key:**
- P1: Debe estar en v1 o el dashboard no tiene valor
- P2: Añadir en v1.x una vez validado
- P3: Diferir a v2+ o eliminar

---

## Competitor Feature Analysis

Comparables relevantes: herramientas de adopción de design systems (Omlet, Fig Stats) y dashboards de liderazgo internos.

| Feature | Omlet (design system analytics) | Fig Stats (plugin community analytics) | Handoff Analytics (nuestro approach) |
|---------|----------------------------------|----------------------------------------|--------------------------------------|
| Adopción por usuario | Sí, con breakdown detallado | No (métricas agregadas) | Sí (por diseñador) — v1 |
| Tendencia temporal | Sí, histórico largo | Sí, charts interactivos | Básico en v1.x |
| Filtros | Multi-dimensionales | Limitados | 2 filtros en v1 (diseñador, fecha) |
| Score / calidad | Sí (cobertura de DS) | No | Sí, overallScore del evaluador |
| Export | CSV y reportes | No | Diferido a v3 |
| Auth | Sí (plataforma SaaS) | Pública | No (URL secreta) |
| Entorno | Web app externa | Plugin Figma | Plugin Figma — constraint de tamaño |
| Costo infra | SaaS (de pago) | Gratuito | Cero (Power Automate + Excel existente) |

**Conclusión del análisis:** Omlet y Fig Stats tienen más features, pero requieren infraestructura externa o están diseñados para otros casos de uso. Nuestro approach sacrifica profundidad de analytics por cero-costo y integración nativa en el flujo BCP. Las features de v1 son suficientes para el caso de uso primario del líder de diseño.

---

## Sources

- [How design system leaders define and measure adoption — Omlet](https://omlet.dev/blog/how-leaders-measure-design-system-adoption/)
- [9 Design System Metrics That Matter — Supernova](https://www.supernova.io/blog/9-design-system-metrics-that-matter)
- [How Pinterest's design systems team measures adoption — Figma Blog](https://www.figma.com/blog/how-pinterests-design-systems-team-measures-adoption/)
- [Design System Adoption Tracker — Brevo Engineering](https://engineering.brevo.com/how-to-track-design-system-adoption/)
- [11 Analytics Dashboard Examples for SaaS — Userpilot](https://userpilot.com/blog/analytics-dashboard-examples/)
- PROJECT.md constraints: Power Automate only, no backend, Excel Online, Figma plugin sandbox

---
*Feature research for: Handoff Analytics plugin — adoption dashboard for design leadership (BCP)*
*Researched: 2026-03-05*
