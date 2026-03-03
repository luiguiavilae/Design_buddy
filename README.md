# Designer Buddy
**BCP · COE Diseño Estratégico**

Plugin unificado de Figma para optimizar el proceso de diseño.

---

## Módulos

| Tab | Función | Tipo |
|-----|---------|------|
| **Docs** | Crea la estructura inicial de páginas y secciones | Determinístico |
| **Copy** | Evalúa textos del diseño (ortografía, tono, tecnicismos, etc.) | Determinístico |
| **Users** | Genera feedback de usuarios sintéticos | LLM (Claude) |
| **Handoff** | Valida los 5 criterios del framework de handoff BCP | Determinístico |

---

## Desarrollo

```bash
npm install
npm run dev      # watch mode
npm run build    # build de producción
```

### Cargar en Figma
1. Abrir Figma Desktop
2. Plugins > Development > Import plugin from manifest
3. Seleccionar `/dist/manifest.json`

---

## Estructura del proyecto

```
src/
├── main.ts                    ← Entry point del plugin (sandbox)
├── messageRouter.ts           ← Hub central de mensajes
├── modules/
│   ├── docs/                  ← Migrado de Plugin_generador_handoff
│   │   ├── pageBuilder.ts
│   │   └── sectionBuilder.ts
│   ├── handoff/               ← Migrado de Evaluador_handoff
│   │   └── evaluator/
│   │       ├── scanner.ts
│   │       ├── criterion1-naming.ts
│   │       ├── criterion2-autolayout.ts
│   │       ├── criterion3-structure.ts
│   │       ├── criterion4-screenflow.ts
│   │       ├── criterion5-sections.ts
│   │       └── index.ts
│   ├── copy/                  ← Nuevo
│   │   └── index.ts
│   └── users/                 ← Nuevo (requiere API key)
│       └── index.ts
├── types/                     ← Tipos unificados
│   ├── docs.ts
│   ├── handoff.ts
│   ├── copy.ts
│   ├── users.ts
│   └── messages.ts
└── ui/                        ← React + navegación por tabs
    ├── App.tsx
    ├── index.html
    ├── main.tsx
    └── tabs/
        ├── DocsTab.tsx
        ├── CopyTab.tsx
        ├── UsersTab.tsx
        └── HandoffTab.tsx
```

---

## Configuración del módulo Users

El módulo Users requiere una API key de Anthropic. Antes de hacer build de producción, 
reemplazar `__ANTHROPIC_API_KEY__` en `src/modules/users/index.ts` con la key real,
o configurar una variable de entorno en el proceso de build.

---

## Origen de los módulos

- `modules/docs/` → Plugin_generador_handoff (`src/plugin/`)
- `modules/handoff/evaluator/` → Evaluador_handoff (`figma-plugin/src/evaluator/`)
- `knowledge/framework_handoff.md` → Evaluador_handoff (`knowledge/`)
