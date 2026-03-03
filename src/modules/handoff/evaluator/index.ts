import type { EvaluationReport } from '../../../types/handoff'
import { scanPage } from './scanner'
import { evaluateCriterion1 } from './criterion1-naming'
import { evaluateCriterion2 } from './criterion2-autolayout'
import { evaluateCriterion3 } from './criterion3-structure'
import { evaluateCriterion4 } from './criterion4-screenflow'
import { evaluateCriterion5 } from './criterion5-sections'

// Alto → 25% cada uno (C1, C2, C4) · Medio → 12.5% cada uno (C3, C5)
const WEIGHTS: Record<number, number> = {
  1: 0.25,
  2: 0.25,
  3: 0.125,
  4: 0.25,
  5: 0.125,
}

type ProgressCallback = (step: string, percent: number) => void

const tick = () => new Promise<void>((r) => setTimeout(r, 50))

export async function evaluateCurrentPage(
  onProgress?: ProgressCallback
): Promise<EvaluationReport> {
  onProgress?.('Escaneando la página…', 10)
  await tick()
  const scan = await scanPage(onProgress)

  onProgress?.('Analizando nomenclatura de pantallas…', 50)
  await tick()
  const c1 = evaluateCriterion1(scan)

  onProgress?.('Verificando Auto Layout vertical…', 62)
  await tick()
  const c2 = evaluateCriterion2(scan)

  onProgress?.('Revisando Cover y estructura del archivo…', 72)
  await tick()
  const c3 = evaluateCriterion3(scan)

  onProgress?.('Evaluando organización del Screenflow…', 82)
  await tick()
  const c4 = evaluateCriterion4(scan)

  onProgress?.('Comprobando secciones internas…', 90)
  await tick()
  const c5 = evaluateCriterion5(scan)

  onProgress?.('Calculando score final…', 96)
  await tick()

  const criteria = [c1, c2, c3, c4, c5]
  const overallScore = criteria.reduce(
    (acc, c) => acc + c.score * (WEIGHTS[c.id] ?? 0),
    0
  )

  return {
    pluginVersion: '1.1',
    pageName: scan.pageName,
    fileName: scan.fileName,
    evaluatedAt: new Date().toISOString(),
    totalFrames: scan.topLevelFrames.length,
    overallScore: Math.round(overallScore),
    criteria,
  }
}
