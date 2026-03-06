# Requirements: Handoff Analytics

**Defined:** 2026-03-05
**Core Value:** Lideres de diseno de BCP pueden ver cuanto se usa el evaluador de handoff y si los scores mejoran con el tiempo.

---

## v1 Requirements

### Tracking Module (Designer Buddy)

- [ ] **TRACK-01**: Al terminar una evaluacion de handoff, se registra automaticamente un evento con fileId, fileName, pageName, userName, overallScore y timestamp
- [ ] **TRACK-02**: El tracking no bloquea ni retrasa el flujo del disenador (fire-and-forget puro)
- [ ] **TRACK-03**: Si el tracking falla (red, CORS, endpoint no configurado), el plugin sigue funcionando sin errores visibles al usuario
- [ ] **TRACK-04**: El payload incluye `figma.currentUser.name` como userName (requiere permiso `currentuser` en manifest)
- [ ] **TRACK-05**: El payload incluye `figma.fileKey` como fileId (requiere `enablePrivatePluginApi` en manifest)
- [ ] **TRACK-06**: El manifest.json tiene `networkAccess.allowedDomains` con el dominio del endpoint de Power Automate

### Analytics Plugin — Data Layer

- [ ] **DATA-01**: El plugin recupera la lista de evaluaciones desde el endpoint de Power Automate Reader
- [ ] **DATA-02**: El plugin muestra un loading state durante el fetch (que puede tardar 1-15s por cold start)
- [ ] **DATA-03**: Si el endpoint no esta configurado o falla, el plugin muestra un error state informativo con instrucciones
- [ ] **DATA-04**: Si no hay evaluaciones, el plugin muestra un empty state explicativo
- [ ] **DATA-05**: El campo `overallScore` se parsea como entero (`parseInt`) antes de renderizar — Excel Online devuelve strings

### Analytics Plugin — Dashboard UI

- [ ] **DASH-01**: El lider puede ver una tabla de evaluaciones con: nombre de archivo, diseñador, fecha formateada (DD/MM/YYYY HH:mm), score
- [ ] **DASH-02**: Cada score se muestra con color coding: rojo (<60), amarillo (60-80), verde (>80)
- [ ] **DASH-03**: El dashboard muestra el contador total de evaluaciones
- [ ] **DASH-04**: El lider puede filtrar la lista por diseñador mediante un dropdown
- [ ] **DASH-05**: El lider puede filtrar la lista por rango de fechas con presets: ultima semana / ultimo mes / todo
- [ ] **DASH-06**: El dashboard muestra el score promedio por diseñador (agrupacion en frontend)

### Setup y Operaciones

- [ ] **OPS-01**: Existe un runbook de operaciones documentado para el equipo BCP (owner del flow, heartbeat cada 30 dias, rotacion de URL)
- [ ] **OPS-02**: Las constantes `TRACKING_ENDPOINT_URL` y `ANALYTICS_READ_URL` estan en la parte superior de sus archivos con comentario claro; no estan hardcodeadas en el repo publico

---

## v2 Requirements

### Mejoras Post-Validacion

- **V2-01**: Tendencia de score promedio en el tiempo (grafico de linea simple) — requiere >= 4 semanas de datos acumulados
- **V2-02**: Ordenamiento de columnas en la tabla — trigger: dataset supera 20 filas
- **V2-03**: Indicador de frecuencia semanal ("disenadores activos esta semana")
- **V2-04**: Boton "Refrescar" manual sin reabrir el plugin
- **V2-05**: Configurabilidad de URL del endpoint desde la UI (evita redistribucion del plugin por rotacion de URL)

### Diferido a v3+

- **V3-01**: Export CSV — requiere investigar restricciones de blob download en el plugin API de Figma
- **V3-02**: Filtro por score (ej: "solo scores < 70") — validar con lideres que no derive en vigilancia antes de implementar

---

## Out of Scope

| Feature | Razon |
|---------|-------|
| Export PDF | Figma plugin no tiene acceso a `window.print()` ni canvas-to-image confiable |
| Notificaciones / alertas | Requeriria un tercer flow de PA y un sistema push fuera del scope del plugin |
| Edicion de registros desde el dashboard | Escritura requiere un tercer flow, control de concurrencia en Excel, control de acceso |
| Auth / login por usuario | Requiere Azure AD integration; el endpoint PA es una URL publica por constraint del proyecto |
| Actualizacion en tiempo real | PA / Excel tiene latencia de minutos; el polling es inutil y añade carga |
| Graficos interactivos complejos | Espacio de 380x600px y peso del bundle hacen esto contraproducente |
| Comparacion A/B entre archivos | Los datos no capturan contexto de cambios entre evaluaciones del mismo file; induciria conclusiones falsas |
| Charting libraries (Recharts, Chart.js) | Bundle excesivo para un plugin Figma; SVG manual o HTML table son suficientes |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TRACK-01 | Phase 1 | Pending |
| TRACK-02 | Phase 1 | Pending |
| TRACK-03 | Phase 1 | Pending |
| TRACK-04 | Phase 1 | Pending |
| TRACK-05 | Phase 1 | Pending |
| TRACK-06 | Phase 1 | Pending |
| OPS-01 | Phase 1 | Pending |
| OPS-02 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 2 | Pending |
| DASH-03 | Phase 2 | Pending |
| DASH-04 | Phase 2 | Pending |
| DASH-05 | Phase 2 | Pending |
| DASH-06 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapeados a fases: 19
- Sin mapear: 0 ✓

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-05 — initial definition from research*
