# Roadmap: Handoff Analytics

**Milestone:** v1.0 — Sistema de tracking + dashboard operacional
**Created:** 2026-03-05
**Core Value:** Cualquier lider de diseno puede abrir el plugin Analytics y ver en segundos que archivos han sido evaluados, quien los evaluo y su score.

---

## Milestone 1: v1.0 — Tracking + Dashboard

### Phase 1: Tracking Module en Designer Buddy

**Objetivo:** Insertar el modulo de tracking en el Designer Buddy existente. Al terminar cada evaluacion de handoff, se registra silenciosamente un evento en Excel Online via Power Automate. El disenador no percibe ningun cambio.

**Requirements cubiertos:** TRACK-01, TRACK-02, TRACK-03, TRACK-04, TRACK-05, TRACK-06, OPS-01, OPS-02

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — TrackingEvent type, tracking module, messageRouter wiring, manifest updates
- [x] 01-02-PLAN.md — RUNBOOK.md for BCP team operations

**Deliverables:**

1. `src/types/tracking.ts`
   - Tipo `TrackingEvent` con campos: `fileId`, `fileName`, `pageName`, `userName`, `overallScore`, `timestamp`

2. `src/modules/tracking/index.ts`
   - Funcion `buildPayload(report, fileKey, userName)` — construye el TrackingEvent desde el EvaluationReport
   - Funcion `fireAndForget(url, payload)` — POST fetch sin await; captura y suprime todos los errores; nunca bloquea al caller
   - Constante `TRACKING_ENDPOINT_URL = ''` — placeholder vacio; comentado con instrucciones para configurar

3. `src/messageRouter.ts` — modificacion
   - Importar `buildPayload` y `fireAndForget` del modulo tracking
   - En el case `HANDOFF_START_EVALUATION`, despues de que `evaluateCurrentPage()` resuelve, antes de `send({ type: 'HANDOFF_RESULT' })`:
     - Llamar `buildPayload(report, figma.fileKey, figma.currentUser?.name)`
     - Llamar `fireAndForget(TRACKING_ENDPOINT_URL, payload)` sin await

4. `manifest.json` — modificacion
   - Agregar `"currentuser"` al array `permissions`
   - Agregar `"enablePrivatePluginApi": true`
   - Agregar `"*.api.powerplatform.com"` a `networkAccess.allowedDomains`

5. `RUNBOOK.md` (raiz del repo o `.planning/`)
   - Instrucciones para el equipo BCP: como crear el PA Writer flow, configurar CORS en el Response action, configurar Excel con EvaluationsTable, actualizar TRACKING_ENDPOINT_URL, plan de heartbeat (ping cada 30 dias), que hacer cuando rota la URL

**Verificacion:**
- [ ] Build exitoso sin errores de TypeScript
- [ ] `manifest.json` tiene los 3 campos nuevos
- [ ] `fireAndForget` con URL vacia no lanza excepcion ni muestra error en consola de Figma
- [ ] Despues de configurar un endpoint de test (ej: requestbin), cada evaluacion de handoff genera una fila nueva en el receptor
- [ ] El payload tiene todos los campos del TrackingEvent con tipos correctos (score como integer, timestamp como ISO 8601)
- [ ] El disenador no ve ningun cambio en la UI del plugin

**Notas de implementacion:**
- `figma.currentUser` puede ser null en plugins no publicados/incognito — usar `figma.currentUser?.name ?? 'Unknown'`
- `figma.fileKey` puede ser null para archivos locales — usar `figma.fileKey ?? figma.root.name + '_local'`
- El body del fetch debe ser `JSON.stringify(payload)` como string — no se puede usar `new Headers()` en QuickJS, usar `{ 'Content-Type': 'application/json' }` como plain object

---

### Phase 2: Analytics Plugin — Handoff Analytics

**Objetivo:** Crear el plugin independiente `analytics-plugin/` que lee los datos acumulados en Excel Online via Power Automate Reader y muestra un dashboard funcional para lideres de diseno. Scaffolding con datos mock primero, wire al endpoint real al final.

**Requirements cubiertos:** DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06

**Plans:** 1/2 plans executed

Plans:
- [ ] 02-01-PLAN.md — Scaffold + data layer (manifest, package.json, vite.config.ts, types, main.ts mock toggle, UI entry wiring)
- [ ] 02-02-PLAN.md — Full React dashboard UI (SummaryBar, FilterBar, EvaluationTable, DesignerSummary, all states)

**Deliverables:**

1. `analytics-plugin/` — scaffold completo (estructura identica a Designer Buddy)
   - `manifest.json` — plugin independiente con `networkAccess`, `"currentuser"`, `"enablePrivatePluginApi"`
   - `package.json` — mismas deps que Designer Buddy (React 18, TypeScript, Vite 5)
   - `vite.config.ts` — identico al de Designer Buddy: `target: 'es2015'`, `inlinePlugin`, replacers con arrow functions
   - `src/main.ts` — sandbox: fetch al endpoint Reader, postMessage a UI
   - `src/ui/main.tsx`, `src/ui/App.tsx`, `src/ui/index.html`

2. `analytics-plugin/src/types/analytics.ts`
   - Tipo `EvaluationRow` — campos del Excel: `fileId`, `fileName`, `pageName`, `userName`, `overallScore` (string desde Excel, parsear con parseInt), `timestamp`
   - Tipo `AnalyticsReport` — array de `EvaluationRow` + metadatos
   - Tipos de mensajes UI <> sandbox

3. `analytics-plugin/src/main.ts`
   - Constante `ANALYTICS_READ_URL = ''` — placeholder, comentado
   - Funcion `fetchEvaluations()` — fetch GET al Reader endpoint; parsea JSON; valida que el array exista
   - postMessage a UI: loading | result | error

4. `analytics-plugin/src/ui/` — componentes
   - `SummaryBar` — contador total de evaluaciones + score promedio global
   - `FilterBar` — dropdown de diseñador + selector de rango de fechas (presets: ultima semana / ultimo mes / todo)
   - `EvaluationTable` — tabla de evaluaciones con color coding (rojo/amarillo/verde por score); timestamps formateados a DD/MM/YYYY HH:mm
   - `DesignerSummary` — score promedio por diseñador (groupby en frontend)
   - Estados: loading (spinner), error (mensaje + instrucciones), empty (que hacer si no hay datos)

5. Todo el filtrado y agrupacion en React state en memoria (no se vuelve a hacer fetch al cambiar filtros)

**Verificacion:**
- [ ] Build de `analytics-plugin/` exitoso e independiente (sin depender de src/ de Designer Buddy)
- [ ] Con datos mock hardcodeados: la tabla renderiza, los filtros funcionan, el color coding es correcto
- [ ] `overallScore` llega como string desde Excel y se parsea a integer correctamente (test con mock de strings)
- [ ] Loading state visible durante el fetch (simular con delay en mock)
- [ ] Error state visible cuando el endpoint no esta configurado (URL vacia → catch → error state)
- [ ] Empty state visible cuando el array de evaluaciones esta vacio
- [ ] Filtro por diseñador reduce la lista correctamente
- [ ] Filtro por fecha: "ultima semana" y "ultimo mes" filtran correctamente
- [ ] Score promedio por diseñador calcula correcto cuando hay multiples evaluaciones del mismo usuario
- [ ] Con endpoint real configurado por BCP: los datos reales aparecen en el dashboard

**Notas de implementacion:**
- El fetch va en `main.ts` (sandbox), no en el iframe React — evita el problema de null-origin CORS
- PA Reader devuelve los campos como strings — `parseInt(row.overallScore)` obligatorio antes de ordenar o comparar
- Timestamps en ISO 8601 (ej: "2026-03-05T14:30:00Z") — formatear con `new Date(ts).toLocaleString('es-PE')` o manualmente
- Mantener el patron de `inlinePlugin` con replacers de arrow function — misma regla que Designer Buddy para el bug de `$&`

---

### Phase 3: Mejoras Post-Validacion

**Objetivo:** Anadir features de profundidad una vez que el equipo de liderazgo haya validado que el sistema basico es util y haya acumulado suficientes datos historicos (>= 4 semanas).

**Requirements cubiertos:** V2-01 a V2-05

**Trigger para iniciar esta fase:**
- Al menos 4 semanas de datos acumulados en Excel
- Feedback de lideres de diseno confirma que el dashboard basico es util y hay demanda de mas profundidad

**Deliverables candidatos (priorizar segun feedback real):**

1. Tendencia de score promedio en el tiempo
   - Grafico de linea simple con SVG manual (sin charting library)
   - Agrupar evaluaciones por semana/mes; calcular promedio por bucket
   - Solo si hay >= 4 semanas de datos; mostrar mensaje educativo si no alcanza aun

2. Ordenamiento de columnas en la tabla
   - Click en cabecera de columna → sort ascendente/descendente
   - Estado de sort en React state (columna activa + direccion)
   - Trigger: dataset supera 20 filas en produccion

3. Indicador de frecuencia semanal
   - Count de evaluaciones en los ultimos 7 dias vs. semana anterior
   - "N disenadores activos esta semana"

4. Boton "Refrescar" manual
   - Re-trigger del fetch sin cerrar y reabrir el plugin
   - Reset al loading state → nuevo fetch → nuevo resultado

5. URL configurable desde la UI
   - Campo de input para pegar la URL del Reader endpoint sin redistribuir el plugin
   - Persistir en `figma.clientStorage` con clave `analyticsReadUrl`

**Verificacion:**
- [ ] (Por definir durante planning de la fase, basado en features priorizadas)

---

## Phase Status

| Phase | Name | Requirements | Status | Plans |
|-------|------|--------------|--------|-------|
| 1 | Tracking Module en Designer Buddy | TRACK-01..06, OPS-01..02 | Complete | 2/2 complete |
| 2 | 1/2 | In Progress|  | 0/2 |
| 3 | Mejoras Post-Validacion | V2-01..05 | Pending | 0/? |

**Progress:** ██░░░░░░░░ ~20% (Phase 1 complete — Phase 2 planned, 2 plans ready)

---

## Build Order Rationale

- **Phase 1 primero**: Todo el sistema depende de que haya datos en Excel. Sin tracking, el analytics plugin es un cascarron vacio.
- **Phase 2 puede empezar con mock en paralelo**: El scaffold y la UI del analytics plugin no necesitan datos reales. La integracion final con el endpoint real tiene dependencia en (a) que el PA Reader flow este configurado por BCP y (b) que haya datos del tracker de Phase 1.
- **Phase 3 diferida intencionalmente**: La tendencia temporal requiere >= 4 semanas de datos historicos para ser legible. Las otras features de v1.x solo tienen valor cuando el dataset es suficientemente grande. Evita sobreinvertir antes de validar que el sistema basico es util.

---
*Roadmap created: 2026-03-05*
*Phase 1 planned: 2026-03-06 — 2 plans created*
*Phase 2 planned: 2026-03-06 — 2 plans created*
