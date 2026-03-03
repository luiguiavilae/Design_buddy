import type { UIMessage, PluginMessage } from './types/messages'
import { buildProject } from './modules/docs/pageBuilder'
import { evaluateCurrentPage } from './modules/handoff/evaluator/index'
import { evaluateCopy } from './modules/copy/index'
import { getUsersContext, requestUsersFeedback } from './modules/users/index'

function send(msg: PluginMessage): void {
  figma.ui.postMessage(msg)
}

export function registerMessageRouter(): void {
  // ── Load all pages once at startup (required for dynamic-page mode) ─────────
  figma.loadAllPagesAsync().catch(() => {})

  figma.ui.onmessage = async (raw: unknown) => {
    const msg = raw as UIMessage

    switch (msg.type) {

      // ══ DOCS ════════════════════════════════════════════════════════════════

      case 'DOCS_GET_FILE_INFO': {
        send({ type: 'DOCS_FILE_INFO', payload: { fileName: figma.root.name } })
        break
      }

      case 'DOCS_BUILD_PROJECT': {
        try {
          await buildProject(msg.payload)
          send({ type: 'DOCS_BUILD_SUCCESS' })
        } catch (err) {
          send({
            type: 'DOCS_BUILD_ERROR',
            payload: { message: err instanceof Error ? err.message : String(err) },
          })
        }
        break
      }

      // ══ HANDOFF ═════════════════════════════════════════════════════════════

      case 'HANDOFF_START_EVALUATION': {
        try {
          const report = await evaluateCurrentPage((step, percent) => {
            send({ type: 'HANDOFF_PROGRESS', step, percent })
          })
          send({ type: 'HANDOFF_RESULT', report })
        } catch (err) {
          send({
            type: 'HANDOFF_ERROR',
            error: err instanceof Error ? err.message : 'Error desconocido',
          })
        }
        break
      }

      case 'HANDOFF_NAVIGATE_TO_NODE': {
        try {
          const node = await figma.getNodeByIdAsync(msg.nodeId)
          if (!node) break

          if (node.type === 'PAGE') {
            const page = node as PageNode
            if (page.id !== figma.currentPage.id) {
              await page.loadAsync()
              figma.currentPage = page
            }
            figma.viewport.scrollAndZoomIntoView([...page.children] as SceneNode[])
          } else {
            let ancestor: BaseNode | null = node
            while (ancestor && ancestor.type !== 'PAGE') ancestor = ancestor.parent
            if (ancestor?.type === 'PAGE') {
              const page = ancestor as PageNode
              if (page.id !== figma.currentPage.id) {
                await page.loadAsync()
                figma.currentPage = page
              }
            }
            figma.viewport.scrollAndZoomIntoView([node as SceneNode])
          }
        } catch (_) {}
        break
      }

      // ══ COPY ════════════════════════════════════════════════════════════════

      case 'COPY_START_EVALUATION': {
        try {
          const report = await evaluateCopy((step, percent) => {
            send({ type: 'COPY_PROGRESS', step, percent })
          })
          send({ type: 'COPY_RESULT', report })
        } catch (err) {
          send({
            type: 'COPY_ERROR',
            error: err instanceof Error ? err.message : 'Error desconocido',
          })
        }
        break
      }

      // ══ USERS ═══════════════════════════════════════════════════════════════

      case 'USERS_GET_CONTEXT': {
        try {
          const context = getUsersContext()
          send({ type: 'USERS_CONTEXT', payload: context })
        } catch (err) {
          send({
            type: 'USERS_ERROR',
            error: err instanceof Error ? err.message : 'Error desconocido',
          })
        }
        break
      }

      case 'USERS_REQUEST_FEEDBACK': {
        try {
          const report = await requestUsersFeedback(msg.payload, (step, percent) => {
            send({ type: 'USERS_PROGRESS', step, percent })
          })
          send({ type: 'USERS_RESULT', report })
        } catch (err) {
          send({
            type: 'USERS_ERROR',
            error: err instanceof Error ? err.message : 'Error desconocido',
          })
        }
        break
      }

      // ══ GENERAL ═════════════════════════════════════════════════════════════

      case 'CLOSE': {
        figma.closePlugin()
        break
      }

      default:
        console.warn('[Designer Buddy] Mensaje no reconocido:', msg)
    }
  }
}
