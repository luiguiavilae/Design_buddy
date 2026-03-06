# Handoff Analytics — Sistema de tracking de adopción

## What This Is

Sistema compuesto por dos partes: (1) un módulo de tracking añadido al plugin Designer Buddy que registra silenciosamente cada evaluación de handoff completada, y (2) un plugin independiente "Handoff Analytics" que lee esos registros desde Excel Online y muestra un dashboard de adopción al equipo de liderazgo de diseño BCP.

El objetivo es tener visibilidad de cuántos diseñadores están usando el evaluador de handoff, con qué frecuencia, y qué scores están obteniendo — sin infraestructura propia y dentro del ecosistema Microsoft 365 que ya tiene el equipo BCP.

## Core Value

Cualquier líder de diseño puede abrir el plugin Analytics y ver en segundos qué archivos han sido evaluados, quién los evaluó y su score — sin necesidad de preguntar manualmente al equipo.

## Requirements

### Validated

- ✓ Designer Buddy plugin funciona con React + TypeScript + Vite — existente
- ✓ Evaluador de handoff funciona y devuelve `EvaluationReport` con `overallScore`, `fileName`, `pageName` — existente
- ✓ Figura `figma.currentUser` disponible en el sandbox — existente
- ✓ `manifest.json` tiene `networkAccess.allowedDomains` para fetch() — existente (api.groq.com)

### Active

- [ ] Designer Buddy envía evento de tracking al Power Automate después de calcular el score (fire-and-forget, silencioso ante fallos)
- [ ] El payload incluye: fileId, fileName, userName, timestamp, overallScore
- [ ] La URL del endpoint se define como constante placeholder en el código (configurar cuando PA esté listo)
- [ ] Plugin "Handoff Analytics" hace fetch a un segundo endpoint de Power Automate y muestra dashboard
- [ ] Dashboard muestra: total de archivos evaluados, lista (nombre archivo, diseñador, fecha, score)
- [ ] Dashboard tiene filtro por diseñador
- [ ] Dashboard tiene filtro por rango de fechas

### Out of Scope

- Autenticación en los endpoints de Power Automate — PA genera URLs HTTP públicas, sin auth adicional por ahora
- Backend propio, Azure, Google Cloud — restricción de arquitectura, cero costo adicional
- Configuración de Excel Online / Power Automate — eso lo hace el equipo BCP en su tenant M365
- Edición o eliminación de registros desde los plugins — solo lectura en Analytics, solo escritura en Designer Buddy
- Notificar al diseñador cuando el tracking falla — fire-and-forget silencioso

## Context

**Arquitectura de datos:**
```
Designer Buddy (modificado)
  └─ fetch() POST → Power Automate Flow 1
       └─ Escribe fila en Excel Online (OneDrive BCP)

Plugin Analytics (nuevo)
  └─ fetch() GET → Power Automate Flow 2
       └─ Lee Excel Online → devuelve JSON
            └─ Plugin renderiza dashboard
```

**Figma API relevante:**
- `figma.currentUser.name` — nombre del diseñador logueado
- `figma.fileKey` — ID único del archivo (puede ser null en archivos locales)
- `figma.root.name` — nombre del archivo
- `networkAccess.allowedDomains` en manifest.json — requiere agregar el dominio de Power Automate

**Estructura existente en Designer Buddy:**
- Tracking debe insertarse en `src/messageRouter.ts` en el case `HANDOFF_START_EVALUATION`, después de que `evaluateCurrentPage()` resuelve y antes de `send({ type: 'HANDOFF_RESULT' })`
- Plugin Analytics va en `/analytics-plugin/` como proyecto independiente con su propio `manifest.json`

**Stack del plugin Analytics:**
- Mismo stack que Designer Buddy: React + TypeScript + Vite + esbuild inline pattern
- Build autónomo, manifest.json propio, dist/ propio

## Constraints

- **Sin backend propio**: Power Automate como único middleware — sin Azure Functions, sin servidores
- **Sin costo adicional**: Todo dentro de Microsoft 365 BCP existente
- **Figma plugin API**: fetch() funciona desde el sandbox QuickJS solo para dominios en `allowedDomains`
- **Fire-and-forget**: El tracking no debe bloquear ni afectar el resultado visible de la evaluación de handoff
- **URL placeholder**: El endpoint de Power Automate se define como constante `TRACKING_ENDPOINT_URL` y se configura cuando el flujo esté creado

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tracking post-score (no pre-evaluation) | Necesitamos el score en el payload; disparar antes no lo tendría disponible | — Pending |
| Fire-and-forget silencioso | Un error de tracking no debe interrumpir el flujo del diseñador | — Pending |
| Power Automate como middleware | Cero costo adicional, dentro de M365 BCP, genera URLs HTTP públicas | — Pending |
| Plugin Analytics independiente | Separación de concerns; lo usan líderes, no todos los diseñadores | — Pending |
| URL como constante placeholder | Los flows de PA se crean después; el código debe estar listo para recibir la URL | — Pending |

---
*Last updated: 2026-03-05 after initialization*
