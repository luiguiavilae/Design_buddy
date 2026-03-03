import type { Section } from '../../types/docs'

const SECTION_WIDTH  = 800
const SECTION_HEIGHT = 600
const SECTION_GAP    = 200

const DEVICE_SECTION_WIDTH  = 1440
const DEVICE_SECTION_GAP    = 200
const DEVICE_FRAME_WIDTH    = 1400
const DEVICE_FRAME_HEIGHT   = 500
const DEVICE_FRAME_PADDING  = 20
const DEVICE_FRAME_TOP      = 50
const DEVICE_FRAME_GAP      = 10
const DEVICE_SECTION_HEIGHT = DEVICE_FRAME_TOP + 3 * DEVICE_FRAME_HEIGHT + 2 * DEVICE_FRAME_GAP + 20

interface SubFrameSpec {
  name: string
  hex: string
  fillOpacity: number
  strokeOpacity: number
}

const DEVICE_SUB_FRAMES: SubFrameSpec[] = [
  { name: 'Error / Unhappy', hex: 'E30425', fillOpacity: 0.15, strokeOpacity: 0.60 },
  { name: 'Happy',           hex: '37A500', fillOpacity: 0.15, strokeOpacity: 0.60 },
  { name: 'Alternative',     hex: '3F78BF', fillOpacity: 0.15, strokeOpacity: 0.60 },
]

function hexToRgb(hex: string): RGB {
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  }
}

export function buildSections(_parent: PageNode, sections: Section[]): void {
  const sorted = [...sections].sort((a, b) => a.order - b.order)
  sorted.forEach((section, index) => {
    const node = figma.createSection()
    node.name = section.name
    node.x = index * (SECTION_WIDTH + SECTION_GAP)
    node.y = 0
    node.resizeWithoutConstraints(SECTION_WIDTH, SECTION_HEIGHT)
  })
}

export function buildDeviceSections(sections: Section[]): void {
  const sorted = [...sections].sort((a, b) => a.order - b.order)
  sorted.forEach((section, index) => {
    const sectionNode = figma.createSection()
    sectionNode.name = section.name
    sectionNode.x = index * (DEVICE_SECTION_WIDTH + DEVICE_SECTION_GAP)
    sectionNode.y = 0
    sectionNode.resizeWithoutConstraints(DEVICE_SECTION_WIDTH, DEVICE_SECTION_HEIGHT)

    DEVICE_SUB_FRAMES.forEach((spec, frameIndex) => {
      const frame = figma.createFrame()
      frame.name = spec.name
      frame.resize(DEVICE_FRAME_WIDTH, DEVICE_FRAME_HEIGHT)

      const color = hexToRgb(spec.hex)
      frame.fills = [{ type: 'SOLID', color, opacity: spec.fillOpacity }]
      frame.strokes = [{ type: 'SOLID', color, opacity: spec.strokeOpacity }]
      frame.strokeWeight = 1

      sectionNode.appendChild(frame)
      frame.x = DEVICE_FRAME_PADDING
      frame.y = DEVICE_FRAME_TOP + frameIndex * (DEVICE_FRAME_HEIGHT + DEVICE_FRAME_GAP)
    })
  })
}
