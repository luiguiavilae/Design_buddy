import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'

// Custom plugin to inline the UI bundle into dist/ui.html.
// Reads from the source template (stable path) to avoid depending on Vite's intermediate output path.
function inlinePlugin() {
  return {
    name: 'inline-html',
    closeBundle() {
      const template = readFileSync('src/ui/index.html', 'utf-8')
      const js = readFileSync('dist/ui.js', 'utf-8')
      const safeJs = js.replace(/<\/script>/gi, '<\\/script>')
      let css = ''
      try { css = readFileSync('dist/ui.css', 'utf-8') } catch { /* no css */ }
      const inlined = template
        // Use replacer functions to avoid $& and $1 sequences in JS/CSS being treated specially.
        .replace('<!-- INJECT_SCRIPT -->', () => `<script>${safeJs}</script>`)
        .replace('<!-- INJECT_STYLE -->', () => (css ? `<style>${css}</style>` : ''))
      writeFileSync('dist/ui.html', inlined)

      // Replace __html__ in the main bundle so figma.showUI has the UI HTML string.
      const mainPath = 'dist/main.js'
      const mainJs = readFileSync(mainPath, 'utf-8')
      // Use replacer function to avoid $& and $1 sequences in the HTML being treated specially.
      const replaced = mainJs.replace(/\b__html__\b/g, () => JSON.stringify(inlined))
      writeFileSync(mainPath, replaced)
    },
  }
}

export default defineConfig({
  plugins: [react(), inlinePlugin()],
  build: {
    target: 'es2015', // transpile ?? and other modern operators for Figma's QuickJS sandbox
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.ts'),
        ui: resolve(__dirname, 'src/ui/main.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
