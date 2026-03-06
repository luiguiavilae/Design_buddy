# Project Research Summary

**Project:** Handoff Analytics — tracking de adopcion para Designer Buddy
**Domain:** Figma plugin telemetry + Power Automate + Excel Online analytics dashboard
**Researched:** 2026-03-05
**Confidence:** HIGH (stack y architecture en fuentes oficiales), MEDIUM (comportamiento PA CORS, auto-disable, FEATURES por comparables indirectos)

## Executive Summary

Handoff Analytics es un sistema de dos componentes construido sobre la infraestructura M365 existente de BCP, sin backend propio. El primer componente es un modulo de tracking minimo insertado en el Designer Buddy existente: un fire-and-forget POST al terminar cada evaluacion de handoff. El segundo es un plugin Figma independiente (analytics-plugin) que lee los datos acumulados en Excel Online via un segundo flow de Power Automate y renderiza un dashboard para lideres de diseno. No se introduce ninguna tecnologia nueva: el stack es identico al de Designer Buddy (React 18, TypeScript 5.5, Vite 5, Figma Plugin API con fetch nativo en el sandbox QuickJS).

El enfoque recomendado por la investigacion es separacion estricta de responsabilidades: Designer Buddy solo escribe (tracking POST fire-and-forget, nunca bloquea al disenador), Power Automate actua como gateway tipado que valida el schema y persiste en Excel, y analytics-plugin es un consumidor de solo lectura. Dos flows de PA con responsabilidad unica (Writer y Reader) son superiores a un flujo combinado. El dashboard en v1 debe priorizarse hacia valor inmediato para el lider: tabla de evaluaciones con filtros por disenador y fecha, contador total, color coding de scores y score promedio por persona. La tendencia temporal requiere ≥4 semanas de datos acumulados y debe diferirse a v1.x.

Los riesgos principales son operacionales, no de codigo. Power Automate no agrega CORS headers por defecto (rompe el plugin silenciosamente en el caso del tracking, visiblemente en el analytics), los flows se auto-deshabilitan tras 90 dias de inactividad si el owner no monitorea, y las URLs de PA cambian cuando se regenera o migra un flow. Los tres se previenen con configuracion en el momento del setup y documentacion de operaciones entregada al equipo BCP, no con cambios en el codigo del plugin.

---

## Key Findings

### Recommended Stack

No se introduce ninguna dependencia nueva al proyecto. El tracking module en Designer Buddy usa el `fetch()` nativo del sandbox Figma (disponible desde 2022, documentado oficialmente). El analytics-plugin duplica la estructura de Designer Buddy: mismo vite.config.ts con el patron `inlinePlugin`, mismo target ES2015 para QuickJS, mismo patron de replacer con funcion flecha para evitar el bug de `$&`. Las unicas adiciones al manifest.json de Designer Buddy son `"permissions": ["currentuser"]`, `"enablePrivatePluginApi": true`, y el dominio `*.api.powerplatform.com` en `networkAccess.allowedDomains`.

**Core technologies:**
- React 18.3 + TypeScript 5.5: ya en uso — consistencia entre ambos plugins, tipado fuerte para los payloads de PA
- Vite 5.3 + inlinePlugin: patron probado para empaquetar plugins Figma con UI React como un solo `.html` inline
- Figma Plugin API (fetch nativo): HTTP directo desde el sandbox sin iframe relay — es el patron oficial recomendado desde 2022
- `@figma/plugin-typings 1.95+`: requerido para tipos de `figma.currentUser`, `figma.fileKey`, y la API de fetch de Figma
- Power Automate (M365): unico backend permitido por constraint de coste cero y entorno BCP

**Lo que NO usar:**
- `axios` u otras librerias HTTP: peso innecesario, fetch nativo es suficiente
- `new URL()` o `new Headers()` como argumentos al fetch de Figma: no soportados en QuickJS, solo strings y plain objects
- URLs `*.logic.azure.com`: deprecadas por Microsoft, retiradas en noviembre 2025
- Librerias de charting (Recharts, Chart.js): bundle excesivo para un plugin Figma; HTML table + inline styles es suficiente

### Expected Features

El publico objetivo es lideres de diseno en BCP, no disenadores individuales. La pregunta central que el dashboard debe responder en v1 es: "¿El equipo esta usando el evaluador y mejoran los scores?"

**Must have (table stakes) — v1:**
- Tabla de evaluaciones: nombre de archivo, disenador, fecha, overallScore — sin esto el dashboard no existe
- Loading / error / empty states: el fetch a PA puede tardar 1-15s por cold start; sin loading state la UI parece rota
- Contador total de evaluaciones: KPI de adopcion mas basico
- Color coding de scores (rojo < 60, amarillo 60-80, verde > 80): hace la tabla scannable en segundos
- Filtro por disenador (dropdown): el lider necesita aislar actividad por persona
- Filtro por rango de fechas (presets: ultima semana / ultimo mes / todo): para evaluar por sprint
- Score promedio por disenador: identifica quien necesita mas soporte sin revision manual

**Should have (diferenciadores) — v1.x:**
- Tendencia de score promedio en el tiempo — solo util con >= 4 semanas de datos acumulados
- Ordenamiento de columnas — trigger: dataset > 20 filas
- Indicador de frecuencia semanal ("disenadores activos esta semana")
- Boton "Refrescar" manual — el lider abre el plugin cuando lo necesita, no lo deja abierto

**Defer (v2+):**
- Export CSV — requiere investigar restricciones de blob download en el plugin API; bajo valor si el equipo tiene acceso directo a Excel Online
- Filtro por score — util para coaching pero puede derivar en vigilancia; validar con lideres antes de implementar
- Notificaciones / alertas — requeriria un tercer flow de PA fuera del scope del plugin

**Anti-features confirmadas a descartar:**
- Export PDF (Figma plugin no tiene window.print() ni canvas-to-image confiable)
- Auth / login por usuario (requiere Azure AD integration, fuera del constraint del proyecto)
- Actualizacion en tiempo real (PA / Excel tiene latencia de minutos; polling cada N segundos es inutil)
- Graficos interactivos complejos (espacio de 380x600px y peso de bundle hacen esto contraproducente)

### Architecture Approach

La arquitectura es un pipeline lineal de un solo sentido con dos caminos: escritura (Designer Buddy → PA Flow 1 → Excel) y lectura (Excel → PA Flow 2 → analytics-plugin). Los componentes estan desacoplados por diseno — analytics-plugin nunca habla con Designer Buddy; ambos comparten unicamente el Excel como storage. Todos los fetch ocurren desde el sandbox del plugin (main.ts / messageRouter.ts), nunca desde el iframe de la UI, lo que evita el problema del origen `null` en CORS.

**Major components:**
1. `src/modules/tracking/index.ts` (nuevo en Designer Buddy) — construye el payload TrackingEvent, ejecuta POST fire-and-forget, captura todos los errores silenciosamente; nunca bloquea al caller
2. Power Automate Flow 1 "Tracking Writer" — valida JSON schema, escribe fila en EvaluationsTable, responde 200 con CORS header
3. `handoff-tracking.xlsx` / EvaluationsTable (Excel Online en OneDrive BCP) — unica fuente de verdad; ninguna otra entidad escribe aqui
4. Power Automate Flow 2 "Analytics Reader" — lee filas con paginacion, responde JSON con CORS header; acepta parametros de filtro opcionales para evolucion futura sin cambiar el plugin
5. `analytics-plugin/` (nuevo plugin independiente) — sandbox hace fetch al Reader, pasa datos a la UI via postMessage, React renderiza el dashboard con filtros en memoria

**Payload canonico (TrackingEvent):**
```
fileId, fileName, pageName, userName, overallScore (integer), timestamp (ISO 8601)
```

**Nota critica de tipos:** Excel Online "List rows" devuelve todos los campos como strings. `overallScore` llega como string al analytics-plugin y debe pasarse por `parseInt()` antes de renderizar o ordenar.

### Critical Pitfalls

1. **CORS headers ausentes en PA Response action** — Power Automate no agrega `Access-Control-Allow-Origin: *` por defecto. El tracking falla silenciosamente; el analytics dashboard no renderiza. Prevencion: configurar la cabecera en el Response action de AMBOS flows. Nunca testear solo con Postman (ignora CORS); siempre testear con fetch() desde browser DevTools o el plugin en modo dev.

2. **`figma.fileKey` retorna `undefined` sin `enablePrivatePluginApi`** — sin este flag en manifest.json, todas las filas en Excel tienen fileId vacio y el dashboard no puede distinguir archivos. Prevencion: agregar `"enablePrivatePluginApi": true` al manifest y usar `figma.fileKey ?? figma.root.name + '_no_key'` como fallback.

3. **PA flow se auto-deshabilita tras 90 dias de inactividad** — el tracking se detiene silenciosamente; los lideres ven datos congelados sin saber por que. Prevencion: asignar el flow a una cuenta de equipo (no usuario individual), configurar un heartbeat flow que ping al trigger cada 30 dias, documentar un chequeo trimestral en el runbook del equipo BCP.

4. **URL del PA trigger cambia y rompe el plugin** — si el equipo BCP regenera o migra el flow, la URL cambia y todas las llamadas fallan. El tracking es silencioso; el analytics es visible. Prevencion: las constantes `TRACKING_ENDPOINT_URL` y `ANALYTICS_READ_URL` deben estar en la parte superior de sus archivos respectivos con un comentario claro. Nunca commitear la URL real al repositorio; distribuir via canal privado.

5. **Excel sin tabla nombrada** — el conector de Excel Online requiere un objeto Table formal (no un rango). Si el archivo no tiene la tabla creada antes del primer evento, "Add a row" falla silenciosamente y no hay datos para recuperar. Prevencion: crear `handoff-tracking.xlsx` con `EvaluationsTable` (6 columnas) antes de configurar cualquier flow.

---

## Implications for Roadmap

La investigacion sugiere 3 fases con una distincion clave: las fases 1 y 2 pueden desarrollarse en paralelo parcial porque Designer Buddy (Phase 1) y analytics-plugin (Phase 2) son independientes. Sin embargo, Phase 1 debe estar live primero para que haya datos que mostrar en Phase 2.

### Phase 1: Tracking Module en Designer Buddy

**Rationale:** Es el prerequisito de todo lo demas. Sin datos en Excel, el analytics dashboard no tiene valor. Es tambien el cambio mas pequeno — 3 archivos modificados o creados, cero dependencias nuevas.
**Delivers:** Cada evaluacion de handoff se registra automaticamente en Excel Online via PA. Disenadoras no notan ningun cambio en su flujo.
**Addresses:** Prerequisito para todas las features de FEATURES.md. El tracking activa la propuesta de valor entera.
**Avoids:**
- Configurar manifest.json con `currentuser`, `enablePrivatePluginApi`, y `networkAccess` correctos desde el primer commit (Pitfall 2 y manifest CSP)
- Usar fire-and-forget puro — nunca `await` el fetch de tracking (Anti-Pattern 1 de ARCHITECTURE.md)
- Verificar CORS del PA Writer con fetch real, no Postman (Pitfall 1)
- Excel table pre-creada antes del primer evento (Pitfall 5)

**Entregables concretos:**
- `src/types/tracking.ts` — tipo TrackingEvent
- `src/modules/tracking/index.ts` — `fireAndForget()` y `buildPayload()`
- Modificacion de `src/messageRouter.ts` — insertar `fireAndForget()` post-evaluacion
- Actualizacion de `manifest.json` — 3 campos nuevos
- Runbook de operaciones para el equipo BCP (owner del PA flow, heartbeat schedule, URL rotation)

### Phase 2: Analytics Plugin (Handoff Analytics)

**Rationale:** Plugin independiente que consume los datos de Phase 1. Puede scaffoldearse con datos mock en paralelo a Phase 1, pero la integracion final requiere que el PA Reader flow este configurado por BCP.
**Delivers:** Dashboard funcional para lideres: tabla filtrable, KPIs basicos, color coding. Responde la pregunta "¿el equipo usa el evaluador y mejoran?"
**Uses:** Mismo stack React + Vite + inlinePlugin de Designer Buddy. Toda la logica de filtros es React state en memoria sobre el array ya cargado.
**Implements:** Component `EvaluationTable` + `FilterBar` + `SummaryCards` en `analytics-plugin/src/ui/`. Sandbox (`main.ts`) hace el fetch y pasa datos via postMessage.
**Avoids:**
- Mostrar timestamps ISO crudos — formatear a DD/MM/YYYY HH:mm en el componente
- Olvidar `parseInt()` en `overallScore` recibido de Excel (todos los campos llegan como string)
- Habilitar paginacion en el PA Reader flow antes del primer test real (por encima de 256 filas)
- Configurar CORS header en PA Reader Response action (Pitfall 1, vertiente analytics)

**Features v1 incluidas:**
Lista de evaluaciones, loading/error/empty states, contador total, color coding, filtro por disenador, filtro por fechas (presets), score promedio por disenador.

### Phase 3: Mejoras Post-Validacion (v1.x)

**Rationale:** Solo implementar cuando haya feedback real de los lideres y suficientes datos historicos. La tendencia temporal en particular necesita >= 4 semanas de datos para ser legible.
**Delivers:** Profundidad de analisis adicional para equipos que ya adoptaron el sistema base.
**Addresses:** Features diferenciadores de FEATURES.md que no bloquean el lanzamiento.

**Features candidatas (priorizar segun feedback):**
- Tendencia de score promedio en el tiempo (grafico de linea simple SVG o HTML)
- Ordenamiento de columnas
- Indicador de frecuencia semanal
- Boton "Refrescar" manual
- Configurabilidad de la URL del endpoint en la UI (evita redistribucion del plugin por rotacion de URL)

### Phase Ordering Rationale

- Phase 1 primero porque toda la propuesta de valor depende de que haya datos en Excel. Sin tracking, el analytics plugin es un cascarron vacio.
- Phase 2 puede scaffoldearse con datos hardcodeados en paralelo a Phase 1, pero la integracion real tiene dependencia en (a) el PA Reader flow creado por BCP y (b) datos reales del tracker.
- Phase 3 diferida intencionalmente: evita construir features sobre datos insuficientes (tendencia temporal sin historial), y permite validar que el sistema basico es util antes de invertir en features secundarias.
- El orden respeta el build order recomendado en ARCHITECTURE.md: tipo → modulo → router → manifest → scaffold analytics → UI con mock → wire a endpoint real.

### Research Flags

Fases que NO requieren investigacion adicional durante planning (patrones bien documentados):
- **Phase 1:** El tracking module es un patron fire-and-forget estandar. La API de Figma y los requisitos del manifest estan documentados con alta confianza. Los pasos son deterministas.
- **Phase 2 (UI):** El patron de build y el diseno de componentes React es estandar en el contexto de Designer Buddy.

Fases que PUEDEN necesitar investigacion adicional durante planning:
- **Phase 2 (integracion PA):** La configuracion exacta del PA Reader flow (paginacion, schema, Response action) depende de la version del conector en el tenant de BCP. Hay variaciones entre tenants M365 con distintos planes de licencia. Verificar durante setup.
- **Phase 3 (tendencia temporal):** Si se elige SVG manual para el grafico de linea, investigar las limitaciones del espacio disponible en el plugin (380x600px) y el comportamiento de SVG inline en el iframe de Figma antes de implementar.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Toda la tecnologia es la misma que ya funciona en Designer Buddy. Los requisitos de manifest (currentuser, enablePrivatePluginApi, networkAccess) verificados en docs oficiales de Figma. |
| Features | MEDIUM | Dominio bien entendido, pero los comparables (Omlet, Fig Stats) son herramientas distintas. Las features de v1 son conservadoras y de bajo riesgo. La tendencia temporal (v1.x) asume disponibilidad de datos historicos. |
| Architecture | HIGH | Pipeline lineal con dos flows independientes, verificado contra documentacion oficial de Figma Plugin API, Microsoft Excel Online connector y Power Automate. Anti-patterns documentados con fundamento tecnico. |
| Pitfalls | MEDIUM | Los pitfalls criticos (CORS, fileKey, auto-disable, URL change) estan respaldados por multiples fuentes. La especificidad del comportamiento de CORS en el sandbox de Figma vs. el iframe esta documentada oficialmente, pero el comportamiento exacto de PA en el tenant BCP puede variar. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **URL exacta del PA environment de BCP:** Las URLs de los flows incluyen el numero de region y entorno (`prod-NNN.REGION`). El manifest.json necesita el dominio exacto o el wildcard `*.api.powerplatform.com` confirmado como aceptado por Figma. Resolver durante Phase 1 setup con el equipo BCP.
- **Plan M365 del tenant BCP:** El limite de 90 dias para auto-disable aplica a planes M365 sin licencia standalone de PA. Si BCP tiene licencia PA standalone, el comportamiento puede diferir. Confirmar con IT antes de Phase 1 handoff.
- **Restricciones de blob download en el plugin API de Figma:** Export CSV (diferido a v2+) requiere investigacion especifica si se decide implementar. La API del plugin tiene limitaciones para descargar archivos desde el iframe.
- **Comportamiento de paginacion en el tenant BCP:** El limite de 256 filas es el default documentado, pero activar paginacion requiere acceso al PA flow. Coordinar con el equipo BCP antes de Phase 2 integration test.

---

## Sources

### Primary (HIGH confidence)

- [Figma Plugin Making Network Requests](https://developers.figma.com/docs/plugins/making-network-requests/) — fetch() en sandbox, null-origin en iframe, networkAccess por CSP
- [Figma Plugin global fetch() API Reference](https://developers.figma.com/docs/plugins/api/properties/global-fetch/) — limitaciones del fetch de Figma: solo string URL, plain object headers, string/Uint8Array body
- [Figma Plugin Manifest Reference](https://developers.figma.com/docs/plugins/manifest/) — networkAccess, permissions, enablePrivatePluginApi
- [Figma Plugin How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/) — sandbox vs. UI iframe
- [Excel Online (Business) Connector reference — Microsoft Learn](https://learn.microsoft.com/en-us/connectors/excelonlinebusiness/) — limitaciones del conector: 256 filas, 25MB, 100 calls/60s, tabla nombrada requerida
- [Limits of automated, scheduled, and instant flows — Microsoft Learn](https://learn.microsoft.com/en-us/power-automate/limits-and-config) — politica de auto-disable, limites de throughput
- [CORS y null origin — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin) — comportamiento del navegador con null origin

### Secondary (MEDIUM confidence)

- [Power Automate HTTP Trigger Reference — Manuel T. Gomes](https://manueltgomes.com/reference/power-automate-trigger-reference/when-an-http-request-is-received-trigger/) — setup del trigger POST, schema JSON, Response action
- [PA URL Migration a api.powerplatform.com — John Liu .NET](https://johnliu.net/blog/2025/9/about-the-old-trigger-url-will-stop-working-on-november-30-2025) — deprecacion de logic.azure.com, deadline noviembre 2025
- [Power Automate flow auto-disables after 90 days — Marks Group](https://www.marksgroup.net/blog/microsoft-flow-flows-automatically-turn-off/) — politica de inactividad confirmada por multiples fuentes de comunidad
- [Power Automate: Reading more than 256 rows — Ellis Karim](https://elliskarim.com/2025/04/19/power-automate-how-to-read-more-than-256-rows-from-an-excel-table/) — paginacion en el action "List rows"
- [Figma Forum: figma.fileKey undefined](https://forum.figma.com/archive-21/figma-filekey-undefined-in-private-plugin-20209) — enablePrivatePluginApi requerido confirmado por comunidad
- [Figma Forum: fetch null origin](https://forum.figma.com/ask-the-community-7/fetch-requests-made-from-our-plugin-to-our-api-are-setting-the-origin-header-to-null-7354) — null origin especifico del iframe, no del sandbox

### Referencias de dominio (features/adoption)

- [How design system leaders measure adoption — Omlet](https://omlet.dev/blog/how-leaders-measure-design-system-adoption/)
- [9 Design System Metrics That Matter — Supernova](https://www.supernova.io/blog/9-design-system-metrics-that-matter)
- [How Pinterest's design systems team measures adoption — Figma Blog](https://www.figma.com/blog/how-pinterests-design-systems-team-measures-adoption/)

---
*Research completed: 2026-03-05*
*Ready for roadmap: yes*
