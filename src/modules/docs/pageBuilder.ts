import type { ProjectConfig } from '../../types/docs'
import { buildSections, buildDeviceSections } from './sectionBuilder'

function interpolate(text: string, projectName: string): string {
  return text.replace(/\{projectName\}/g, projectName)
}

export async function buildProject(config: ProjectConfig): Promise<void> {
  const enabledPages = config.pages
    .filter((p) => p.isEnabled)
    .sort((a, b) => a.order - b.order)

  figma.root
    .findChildren((n) => n.isPageDivider)
    .forEach((d) => d.remove())

  for (const page of enabledPages) {
    const pageName = interpolate(page.name, config.projectName)

    const resolvedSections = page.sections.map((sec) => ({
      ...sec,
      name: interpolate(sec.name, config.projectName),
    }))

    let figmaPage = figma.root.findChild((n) => n.name === pageName) as PageNode | null
    if (!figmaPage) {
      figmaPage = figma.createPage()
      figmaPage.name = pageName
    }

    await figma.setCurrentPageAsync(figmaPage)

    if (page.isDevicePage) {
      buildDeviceSections(resolvedSections)
    } else {
      buildSections(figmaPage, resolvedSections)
    }

    if (page.subPages) {
      for (const subName of page.subPages) {
        const resolvedSubName = interpolate(subName, config.projectName)
        const exists = figma.root.findChild((n) => n.name === resolvedSubName)
        if (!exists) {
          const subPage = figma.createPage()
          subPage.name = resolvedSubName
        }
      }
    }
  }

  for (const page of enabledPages) {
    if (!page.separatorBefore) continue
    const pageName = interpolate(page.name, config.projectName)
    const idx = figma.root.children.findIndex((n) => n.name === pageName)
    if (idx <= 0) continue
    const divider = figma.createPageDivider()
    figma.root.insertChild(idx, divider)
  }

  const firstPage = figma.root.findChild((n) => !n.isPageDivider) as PageNode | null
  if (firstPage) {
    await figma.setCurrentPageAsync(firstPage)
  }
}
