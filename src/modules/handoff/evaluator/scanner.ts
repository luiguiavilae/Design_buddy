import type {
  CoverPageData,
  FrameScanData,
  ScanResult,
  SectionScanData,
} from '../../../types/handoff'

const COVER_PAGE_RE = /cover|portada|nomenclatura/i

/**
 * Returns true when a page is used purely as a visual separator
 * (its name contains no letter or digit — e.g. "───────", "---", "· · ·").
 * Separator pages carry no design content and must be excluded from all
 * evaluation logic.
 */
function isSeparatorPage(page: PageNode): boolean {
  return /^[^a-zA-Z0-9\u00C0-\u024F]+$/.test(page.name.trim())
}

// ── Cover page (separate page) ────────────────────────────────────────────────

async function findCoverPage(): Promise<CoverPageData | null> {
  for (const page of figma.root.children) {
    if (page.id === figma.currentPage.id) continue
    if (isSeparatorPage(page)) continue
    if (!COVER_PAGE_RE.test(page.name)) continue

    await page.loadAsync()

    // Accept FRAME, COMPONENT, INSTANCE or COMPONENT_SET as the cover container
    // (BCP's cover/file from the design system is typically an INSTANCE)
    const CONTAINER_TYPES = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'])
    const coverContainer = page.children.find((n) => CONTAINER_TYPES.has(n.type))

    const root = coverContainer ?? page

    // Collect text from the container, or fall back to the full page
    const textContents = (root as FrameNode)
      .findAllWithCriteria({ types: ['TEXT'] })
      .map((n) => (n as TextNode).characters.toLowerCase())

    // Collect instance names for team-group validation
    const instanceNames = (root as FrameNode)
      .findAllWithCriteria({ types: ['INSTANCE'] })
      .map((n) => n.name.toLowerCase())

    return {
      pageName: page.name,
      frameId: coverContainer?.id ?? page.id,
      frameName: coverContainer?.name ?? page.name,
      textContents,
      instanceNames,
    }
  }
  return null
}

// ── Main scanner ──────────────────────────────────────────────────────────────

type ProgressCallback = (step: string, percent: number) => void

/**
 * Yields to the macrotask queue so the sandbox can flush the postMessage
 * to the UI iframe and the browser can paint before the next heavy step.
 * Using setTimeout (macrotask) is essential — await on an already-resolved
 * Promise only yields to the microtask queue and the UI never gets to paint.
 */
const tick = () => new Promise<void>((r) => setTimeout(r, 20))

export async function scanPage(onProgress?: ProgressCallback): Promise<ScanResult> {
  const page = figma.currentPage

  // ── Step 1: top-level node pass ─────────────────────────────────────────────
  // Collect direct FRAME children of the page AND FRAME children of top-level
  // SECTIONs (designers often organise screens inside sections).

  const topLevelNames: string[] = []
  const topLevelFrames: FrameScanData[] = []

  /** Extract C1/C2 data from a single screen-level frame. */
  function collectFrameData(frame: FrameNode): FrameScanData {
    return {
      id: frame.id,
      name: frame.name,
      layoutMode: frame.layoutMode,
    }
  }

  /**
   * Recursively enter sections at any depth and collect FRAME nodes.
   * Stops at FRAME boundaries (doesn't recurse into frame children).
   * Handles structures like:
   *   Page → Section (parent) → Section (child swimlane) → Frame (screen)
   */
  function collectFramesInSection(section: SectionNode): void {
    for (const child of section.children) {
      if (child.type === 'FRAME') {
        topLevelFrames.push(collectFrameData(child as FrameNode))
      } else if (child.type === 'SECTION') {
        collectFramesInSection(child as SectionNode)
      }
    }
  }

  for (const node of page.children) {
    topLevelNames.push(node.name)

    if (node.type === 'FRAME') {
      topLevelFrames.push(collectFrameData(node as FrameNode))
    } else if (node.type === 'SECTION') {
      collectFramesInSection(node as SectionNode)
    }
  }

  // ── Step 2: collect sections + connectors via findAllWithCriteria (faster)

  onProgress?.('Analizando secciones y conexiones…', 15)
  await tick()

  const sectionNodes = page.findAllWithCriteria({ types: ['SECTION'] }) as SectionNode[]
  const sections: SectionScanData[] = sectionNodes.map((n) => ({ id: n.id, name: n.name }))
  const connectorCount = page.findAllWithCriteria({ types: ['CONNECTOR'] }).length

  // ── Step 3: cover page (async, different Figma page)

  onProgress?.('Buscando página de portada…', 20)
  await tick()
  const coverPageData = await findCoverPage()

  // ── Step 4: all-pages names for C5 ──────────────────────────────────────
  // Collect page names from every non-separator page (no loadAsync needed —
  // page.name is always available). Section names come from the current page
  // only (already collected in Step 2), avoiding expensive full-tree traversals
  // on every other page in the file.

  const pages = figma.root.children
  const contentPages = pages.filter((p) => !isSeparatorPage(p))

  onProgress?.('Analizando estructura de páginas…', 30)
  await tick()

  const allPagesNames: string[] = contentPages.map((p) => p.name)
  sections.forEach((s) => allPagesNames.push(s.name))

  return {
    fileName: figma.root.name,
    pageName: page.name,
    pageId: page.id,
    topLevelFrames,
    topLevelNames,
    sections,
    connectorCount,
    coverPageData,
    allPagesNames,
    pageCount: contentPages.length,
  }
}
