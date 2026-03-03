import { registerMessageRouter } from './messageRouter'

console.log('[Designer Buddy] main loaded', new Date().toISOString())

try {
  figma.showUI(__html__, {
    width: 420,
    height: 680,
    title: 'Designer Buddy',
    themeColors: true,
  })

  registerMessageRouter()
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  console.error('[Designer Buddy] Error de inicio:', err)
  figma.closePlugin('Error al iniciar: ' + msg)
}
